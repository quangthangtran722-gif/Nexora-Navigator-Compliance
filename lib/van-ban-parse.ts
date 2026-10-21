import type { LoaiVanBan } from "@/lib/types";

// Đọc số hiệu / tên / loại văn bản từ PHẦN ĐẦU nội dung (quốc hiệu, "Luật số: ...", "LUẬT QUẢN LÝ THUẾ"),
// chỉ fallback sang tên file khi nội dung không có. Tên file kiểu "Luat-...-108-2025-QH15-demo.md" từng làm
// so_hieu thành "108/2025/QH15-DEMO" và lọt vào checklist. Code thuần — form tải văn bản gọi để điền sẵn,
// curator vẫn sửa được trước khi lưu.

export type VanBanHeader = { so_hieu: string | null; ten_van_ban: string | null; loai_van_ban: LoaiVanBan | null };

const LOAI: [RegExp, LoaiVanBan, string][] = [
  [/^LUẬT(?=\s|$)/u, "luat", "Luật"],
  [/^NGHỊ ĐỊNH(?=\s|$)/u, "nghi_dinh", "Nghị định"],
  [/^THÔNG TƯ(?=\s|$)/u, "thong_tu", "Thông tư"],
  [/^NGHỊ QUYẾT(?=\s|$)/u, "nghi_quyet", "Nghị quyết"],
  [/^QUYẾT ĐỊNH(?=\s|$)/u, "quyet_dinh", "Quyết định"],
];

// "108/2025/QH15", "77/2025/TT-BTC", "181/2025/NĐ-CP"
const SO_HIEU = /(\d+\/\d{4}\/[A-ZĐ0-9]+(?:-[A-ZĐ0-9]+)*)/u;
const DONG_SO_HIEU = new RegExp(String.raw`^[\s*_]*(?:Luật|Nghị định|Thông tư|Nghị quyết|Quyết định)?\s*[Ss]ố\s*:?\s*` + SO_HIEU.source, "mu");

const sachDong = (l: string) => l.replace(/[*_#\\]/g, "").replace(/\s+/g, " ").trim();
const viHoaDau = (s: string) => s.charAt(0).toLocaleUpperCase("vi") + s.slice(1);

export function parseVanBanHeader(noiDung: string, tenFile?: string): VanBanHeader {
  const text = noiDung.normalize("NFC");
  // Chỉ xét phần trước "Điều 1." / "Chương I" đầu tiên — tránh bắt số hiệu văn bản được dẫn chiếu trong thân
  const cat = text.search(/^\s*(?:\*\*)?(?:Điều\s+\d+|Chương\s+[IVXLC\d]+)\b/mu);
  const dau = (cat > 0 ? text.slice(0, cat) : text).slice(0, 3000);

  const soHieu = DONG_SO_HIEU.exec(dau)?.[1] ?? null;

  let ten: string | null = null;
  let loai: LoaiVanBan | null = null;
  const dong = dau.split(/\r?\n/).map(sachDong).filter(Boolean);
  for (let i = 0; i < dong.length; i++) {
    const hit = LOAI.find(([re]) => re.test(dong[i]));
    if (!hit) continue;
    const [re, ma, nhan] = hit;
    loai = ma;
    // "LUẬT QUẢN LÝ THUẾ" → "Luật Quản lý thuế"; "THÔNG TƯ" + dòng sau "Quy định chi tiết..." → "Thông tư quy định chi tiết..."
    const conLai = dong[i].replace(re, "").trim();
    if (conLai) ten = `${nhan} ${viHoaDau(conLai.toLocaleLowerCase("vi"))}`;
    else if (dong[i + 1] && !DONG_SO_HIEU.test(dong[i + 1])) ten = `${nhan} ${dong[i + 1].charAt(0).toLocaleLowerCase("vi")}${dong[i + 1].slice(1)}`;
    break;
  }

  // Fallback tên file: chỉ lấy đoạn đúng dạng số hiệu (chữ IN HOA) — "-demo", "-ban-sua" bị bỏ
  const tuFile = tenFile ? SO_HIEU.exec(tenFile.replace(/\.[^.]+$/, "").replace(/^(.*?)(\d+)-(\d{4})-/, "$1$2/$3/"))?.[1] ?? null : null;

  return { so_hieu: soHieu ?? tuFile, ten_van_ban: ten, loai_van_ban: loai };
}
