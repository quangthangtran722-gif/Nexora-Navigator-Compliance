// Tách file văn bản luật (.txt / .md) thành dữ liệu điền sẵn cho form "Nhập văn bản luật".
// Thuần client, KHÔNG gọi AI, không gọi API: chỉ regex trên chữ. Parse không ra trường nào thì để trống —
// curator tự điền, không chặn luồng. Chunk luôn bắt đầu bằng "Điều N." ở đầu dòng (backend cần để tách điều).
import type { LoaiVanBan } from "./types";

export type ParsedChunk = { tieu_de: string; dieu_khoan_range: string; noi_dung: string };
export type ParsedVanBan = {
  so_hieu: string;
  ten_van_ban: string;
  loai_van_ban: LoaiVanBan | "";
  co_quan_ban_hanh: string;
  ngay_ban_hanh: string; // yyyy-mm-dd hoặc ""
  ngay_hieu_luc: string; // yyyy-mm-dd hoặc ""
  chunks: ParsedChunk[];
};

const MIN_DIEU = 100; // Điều ngắn hơn → gộp với Điều kế tiếp
const MAX_CHUNK = 6000; // = giới hạn chunkSchema (lib/schemas.ts)

// "**Điều 3.**", "### Điều 3.", "Điều 3:" ở đầu dòng (đã bỏ ký hiệu markdown)
const DIEU_RE = /^Điều\s+(\d+)[a-zđ]?\s*[.:]/u;

const LOAI_THEO_TU_KHOA: [RegExp, LoaiVanBan][] = [
  [/^NGHỊ ĐỊNH$/u, "nghi_dinh"],
  [/^THÔNG TƯ(?: LIÊN TỊCH)?$/u, "thong_tu"],
  [/^NGHỊ QUYẾT$/u, "nghi_quyet"],
  [/^QUYẾT ĐỊNH$/u, "quyet_dinh"],
  [/^HƯỚNG DẪN$/u, "huong_dan"],
  [/^LUẬT$/u, "luat"],
  [/^CÔNG VĂN$/u, "khac"],
];
const LOAI_CHU: Record<LoaiVanBan, string> = {
  luat: "Luật", nghi_dinh: "Nghị định", thong_tu: "Thông tư", nghi_quyet: "Nghị quyết", quyet_dinh: "Quyết định", huong_dan: "Hướng dẫn", khac: "Công văn",
};

// Bỏ định dạng markdown của 1 dòng: #, **, __, >, gạch đầu bảng; bảng "| A | B |" tách thành nhiều ô
function cleanLines(text: string): string[] {
  return text
    .replace(/\r\n?/g, "\n")
    // Word: ngắt dòng mềm (Shift+Enter) xuất thành \x0b; khoảng trắng không ngắt \xa0
    .replace(/\x0b/g, "\n")
    .replace(/\xa0/g, " ")
    // Markdown xuất từ Word/Pandoc escape ký tự: "**Điều 1\. …**", "1\.", "\-", "\_", "\*" → bỏ "\" (trừ "\|" giữ để không tách nhầm ô bảng)
    .replace(/\\([\\.*_[\]()#+\-!>`{}~])/g, "$1")
    .split("\n")
    .flatMap((l) => (/(?<!\\)\|/.test(l) ? l.split(/(?<!\\)\|/) : [l]))
    .map((l) =>
      l
        .replace(/\\\|/g, "|")
        .replace(/^\s*(#{1,6}\s+|>\s*)/, "")
        .replace(/\*\*|__/g, "")
        .replace(/^\s*[-:]{3,}\s*$/, "") // dòng kẻ của bảng markdown
        .trimEnd(),
    );
}

const toIso = (d: string, m: string, y: string) => {
  const dd = Number(d), mm = Number(m), yy = Number(y);
  if (!(dd >= 1 && dd <= 31 && mm >= 1 && mm <= 12 && yy >= 1945)) return "";
  return `${yy}-${String(mm).padStart(2, "0")}-${String(dd).padStart(2, "0")}`;
};
// "ngày 30 tháng 7 năm 2025" hoặc "30/7/2025"
function findDate(s: string): string {
  const a = s.match(/ngày\s+(\d{1,2})\s+tháng\s+(\d{1,2})\s+năm\s+(\d{4})/iu);
  if (a) return toIso(a[1], a[2], a[3]);
  const b = s.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  return b ? toIso(b[1], b[2], b[3]) : "";
}

// "BỘ TÀI CHÍNH" → "Bộ Tài chính" (viết hoa chữ đầu + chữ đầu tên riêng sau "Bộ")
function tenCoQuan(s: string): string {
  const lower = s.toLocaleLowerCase("vi").replace(/\s+/g, " ").trim();
  const cap = (w: string) => w.charAt(0).toLocaleUpperCase("vi") + w.slice(1);
  const words = lower.split(" ");
  return words.map((w, i) => (i === 0 || (i === 1 && words[0] === "bộ") ? cap(w) : w)).join(" ");
}

// "QUẢN LÝ THUẾ" → "Quản lý thuế"
function vietHoaChuDau(s: string): string {
  const lower = s.toLocaleLowerCase("vi").replace(/\s+/g, " ").trim();
  return lower.charAt(0).toLocaleUpperCase("vi") + lower.slice(1);
}

export function parseVanBan(raw: string, fileName = ""): ParsedVanBan {
  const lines = cleanLines(raw);
  const firstDieu = lines.findIndex((l) => DIEU_RE.test(l.trim()));
  const header = (firstDieu === -1 ? lines : lines.slice(0, firstDieu)).map((l) => l.trim()).filter(Boolean);
  const headerText = header.join("\n");

  // Số hiệu: ưu tiên NỘI DUNG — "Số: 77/2025/TT-BTC" hoặc "Luật số: 108/2025/QH15" (không phân biệt hoa thường).
  // Chỉ khi nội dung không có mới thử tên file "77-2025-TT-BTC.md"; phần ký hiệu chỉ nhận chữ IN HOA
  // để hậu tố như "-demo", "-ban-sua" trong tên file không lọt vào số hiệu.
  let so_hieu = headerText.match(/(?:^|[\s|])(?:Luật\s+)?số\s*[:：]\s*([0-9]+\/[0-9]{4}\/[A-Za-zĐđ0-9]+(?:-[A-Za-zĐđ0-9]+)*)/imu)?.[1] ?? "";
  if (!so_hieu) {
    const f = fileName.replace(/\.[^.]+$/, "").match(/(\d+)[-_ ](\d{4})[-_ ]([A-ZĐ][A-ZĐ0-9]*(?:-[A-ZĐ][A-ZĐ0-9]*)*)/u);
    if (f) so_hieu = `${f[1]}/${f[2]}/${f[3]}`;
  }

  // Loại + tên: dòng in hoa "THÔNG TƯ", tên = các dòng ngay sau cho tới dòng "Căn cứ…".
  // Luật thường ghi tên cùng dòng: "LUẬT QUẢN LÝ THUẾ" → loại luat, tên "Luật Quản lý thuế".
  let loai_van_ban: LoaiVanBan | "" = "";
  let ten_van_ban = "";
  const laTenLuat = (l: string) => /^LUẬT\s+\S/u.test(l) && l === l.toLocaleUpperCase("vi");
  const iLoai = header.findIndex((l) => laTenLuat(l) || LOAI_THEO_TU_KHOA.some(([re]) => re.test(l)));
  if (iLoai !== -1 && laTenLuat(header[iLoai])) {
    loai_van_ban = "luat";
    ten_van_ban = `Luật ${vietHoaChuDau(header[iLoai].replace(/^LUẬT\s+/u, ""))}`;
  } else if (iLoai !== -1) {
    loai_van_ban = LOAI_THEO_TU_KHOA.find(([re]) => re.test(header[iLoai]))![1];
    const tenLines: string[] = [];
    for (const l of header.slice(iLoai + 1)) {
      // \b của JS không hiểu chữ có dấu → dùng (\s|$) làm ranh giới từ
      if (/^(Căn cứ|Theo đề nghị|Xét đề nghị|Chương|Mục)(\s|$)/u.test(l) || tenLines.length >= 3) break;
      tenLines.push(l);
    }
    let ten = tenLines.join(" ").replace(/\s+/g, " ").trim();
    if (ten === ten.toLocaleUpperCase("vi")) ten = ten.toLocaleLowerCase("vi"); // tên viết IN HOA toàn bộ
    // Tên luật viết hoa chữ đầu ("Luật Quản lý thuế"); văn bản khác viết thường ("Thông tư quy định…")
    if (ten) ten_van_ban = `${LOAI_CHU[loai_van_ban]} ${loai_van_ban === "luat" ? vietHoaChuDau(ten) : ten.charAt(0).toLocaleLowerCase("vi") + ten.slice(1)}`;
  }

  // Cơ quan ban hành: dòng in hoa đầu văn bản bắt đầu bằng tên cơ quan
  const coQuan = header.find((l) => /^(BỘ|NGÂN HÀNG|CHÍNH PHỦ|QUỐC HỘI|ỦY BAN|UỶ BAN|TỔNG CỤC|THỦ TƯỚNG)(\s|$)/u.test(l) && l === l.toLocaleUpperCase("vi"));
  const co_quan_ban_hanh = coQuan ? tenCoQuan(coQuan) : "";

  // Ngày ban hành: "Hà Nội, ngày … tháng … năm …" ở phần đầu
  const ngay_ban_hanh = findDate(header.find((l) => /ngày\s+\d{1,2}\s+tháng/iu.test(l)) ?? "");

  // Ngày hiệu lực: "có hiệu lực (thi hành) (kể) từ ngày …" (thường ở Điều cuối); "kể từ ngày ký" = ngày ban hành
  const body = lines.join("\n");
  const hl = body.match(/có hiệu lực(?:\s+thi hành)?(?:\s+kể)?\s+từ\s+ngày\s+([^\n.;]{0,40})/iu);
  let ngay_hieu_luc = "";
  if (hl) ngay_hieu_luc = /^ký/iu.test(hl[1].trim()) ? ngay_ban_hanh : findDate(`ngày ${hl[1]}`);

  return { so_hieu, ten_van_ban, loai_van_ban, co_quan_ban_hanh, ngay_ban_hanh, ngay_hieu_luc, chunks: firstDieu === -1 ? [] : tachChunks(lines.slice(firstDieu)) };
}

type Dieu = { so: number; tieu_de: string; text: string };

// Tách theo "Điều N.", gộp Điều ngắn với Điều kế tiếp, không để chunk vượt MAX_CHUNK
function tachChunks(lines: string[]): ParsedChunk[] {
  const dieus: Dieu[] = [];
  for (const raw of lines) {
    const l = raw.trim();
    const m = l.match(DIEU_RE);
    if (m) {
      dieus.push({ so: Number(m[1]), tieu_de: l.slice(m[0].length).trim(), text: l });
    } else if (dieus.length) {
      const d = dieus[dieus.length - 1];
      // Dòng tiêu đề nằm ở dòng sau "Điều N." (một số file tách xuống dòng)
      if (!d.tieu_de && l) d.tieu_de = l;
      d.text += `\n${l}`;
    }
  }
  for (const d of dieus) d.text = d.text.replace(/\n{3,}/g, "\n\n").trim();

  // Điều dài hơn MAX_CHUNK: chia theo đoạn, phần sau ghi "Điều N. (tiếp theo)" để backend vẫn nhận ra điều
  const parts: Dieu[] = dieus.flatMap((d) => {
    if (d.text.length <= MAX_CHUNK) return [d];
    const out: Dieu[] = [];
    let cur = "";
    for (const p of d.text.split("\n")) {
      if (cur && cur.length + p.length + 1 > MAX_CHUNK - 40) {
        out.push({ ...d, text: cur });
        cur = `Điều ${d.so}. (tiếp theo)\n${p}`;
      } else cur = cur ? `${cur}\n${p}` : p;
    }
    if (cur) out.push({ ...d, text: cur });
    return out;
  });

  // Gộp: Điều ngắn (< MIN_DIEU) nối vào chunk kế tiếp; chunk đang gom còn ngắn cũng nhận thêm Điều sau
  const groups: Dieu[][] = [];
  let cur: Dieu[] = [];
  const len = (g: Dieu[]) => g.reduce((n, d) => n + d.text.length + 2, 0);
  for (const d of parts) {
    if (cur.length && len(cur) + d.text.length > MAX_CHUNK) {
      groups.push(cur);
      cur = [];
    }
    cur.push(d);
    if (d.text.length >= MIN_DIEU) {
      groups.push(cur);
      cur = [];
    }
  }
  // Điều ngắn còn lại ở cuối → gộp vào chunk trước (nếu còn chỗ)
  if (cur.length) {
    const last = groups[groups.length - 1];
    if (last && len(last) + len(cur) <= MAX_CHUNK) last.push(...cur);
    else groups.push(cur);
  }

  return groups.map((g) => {
    const first = g[0].so, last = g[g.length - 1].so;
    const titles = [...new Set(g.map((d) => d.tieu_de).filter(Boolean))];
    return {
      dieu_khoan_range: first === last ? `Điều ${first}` : `Điều ${first}–${last}`,
      tieu_de: titles.join(" · ").slice(0, 200),
      noi_dung: g.map((d) => d.text).join("\n\n"),
    };
  });
}
