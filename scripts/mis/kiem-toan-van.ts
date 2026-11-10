// T1 — bước kiểm trước khi nạp toàn văn Luật 108 (PLAN §1.4). CHỈ ĐỌC: đọc file .txt và 9 chunk cũ trên project MIS
// (REST, khóa service đọc từ .env.mis.local, không in). Không ghi gì.
// Bốn bước: (1) số hiệu 108/2025/QH15, ban hành 10/12/2025; (2) Điều 1–53 liên tục, mỗi điều một lần; (3) Điều 52 k3
// đúng câu bãi bỏ Luật 38/2019; (4) 9 điều cũ khớp từng chữ với 9 chunk đã nạp (H2).
// Bước 4 so hai mức: nguyên văn tuyệt đối, và sau chuẩn hóa hình thức (bỏ ký hiệu markdown *, \, khoảng trắng, dòng trống).
// Dùng: node scripts/mis/kiem-toan-van.ts research/van-ban/luat-108-2025-QH15.txt
// Thoát mã 0 nếu cả 4 bước đạt ở mức chuẩn hóa; 2 nếu có lệch.
import { readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { parseVanBan } from "../../lib/parse-van-ban.ts";

const tep = process.argv[2] ?? "research/van-ban/luat-108-2025-QH15.txt";
const raw = readFileSync(tep, "utf8");
const ketQua: { buoc: string; dat: boolean; chi_tiet: string }[] = [];
const ghi = (buoc: string, dat: boolean, chi_tiet: string) => ketQua.push({ buoc, dat, chi_tiet });

// (1) số hiệu, ngày ban hành
const pv = parseVanBan(raw, tep);
const coSoHieu = /^Luật số:\s*108\/2025\/QH15\s*$/mu.test(raw);
ghi("1. Số hiệu, ngày ban hành", coSoHieu && pv.so_hieu === "108/2025/QH15" && pv.ngay_ban_hanh === "2025-12-10",
  `so_hieu=${pv.so_hieu} ngay_ban_hanh=${pv.ngay_ban_hanh} ten=${pv.ten_van_ban} ngay_hieu_luc(parser)=${pv.ngay_hieu_luc}`);

// (2) Điều 1–53 liên tục; đếm cả Chương
const dongDieu = [...raw.matchAll(/^Điều\s+(\d+)[a-zđ]?\s*[.:]/gmu)].map((m) => Number(m[1]));
const chuong = [...raw.matchAll(/^Chương\s+([IVXLC]+)\s*$/gmu)].map((m) => m[1]);
const lienTuc = dongDieu.length === 53 && dongDieu.every((n, i) => n === i + 1);
ghi("2. 53 điều liên tục", lienTuc,
  `${dongDieu.length} dòng "Điều N." (đầu ${dongDieu[0]}, cuối ${dongDieu.at(-1)}); ${chuong.length} chương (${chuong.join(", ")}); parser ra ${pv.chunks.length} chunk`);

// (3) Điều 52 k3
const cauK3 = "3. Luật Quản lý thuế số 38/2019/QH14 đã được sửa đổi, bổ sung một số điều theo Luật số 56/2024/QH15 (sau đây gọi là Luật Quản lý thuế số 38/2019/QH14) hết hiệu lực thi hành kể từ ngày Luật này có hiệu lực thi hành";
const d52 = pv.chunks.find((c) => c.dieu_khoan_range === "Điều 52");
ghi("3. Điều 52 khoản 3", !!d52 && d52.noi_dung.includes(cauK3), d52 ? "có câu bãi bỏ Luật 38/2019 từ ngày Luật này có hiệu lực" : "không tìm thấy chunk Điều 52");

// (4) 9 điều cũ
const env = Object.fromEntries(readFileSync(".env.mis.local", "utf8").split(/\r?\n/).map((l) => l.match(/^([A-Z_]+)=(.*)$/))
  .filter((m): m is RegExpMatchArray => !!m).map((m) => [m[1], m[2].trim().replace(/^"|"$/g, "")]));
if (!env.MIS_SUPABASE_URL?.includes("sttopelrdxvyszfvvcrn")) throw new Error("MIS_SUPABASE_URL không phải project MIS — dừng");
const require = createRequire(import.meta.url);
const { createClient } = require("@supabase/supabase-js");
const db = createClient(env.MIS_SUPABASE_URL, env.MIS_SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const { data: vb, error: e1 } = await db.from("van_ban").select("id").eq("so_hieu", "108/2025/QH15").single();
if (e1) throw new Error(e1.message);
const { data: cu, error: e2 } = await db.from("van_ban_chunks").select("thu_tu, dieu_khoan_range, noi_dung").eq("van_ban_id", vb.id).order("thu_tu");
if (e2) throw new Error(e2.message);

const chuan = (s: string) => s.normalize("NFC").replace(/\\(.)/g, "$1").replace(/[*]/g, "").replace(/[“”]/g, '"').replace(/\s+/g, " ").trim();
const tu = (s: string) => chuan(s).split(" ");
function lechDau(a: string, b: string) {
  let i = 0;
  while (i < a.length && a[i] === b[i]) i++;
  return i;
}
const chiTiet4: string[] = [];
const bang: Record<string, unknown>[] = [];
let dat4 = cu.length === 9;
for (const c of cu as { thu_tu: number; dieu_khoan_range: string; noi_dung: string }[]) {
  const moi = pv.chunks.find((x) => x.dieu_khoan_range === c.dieu_khoan_range);
  if (!moi) { dat4 = false; chiTiet4.push(`${c.dieu_khoan_range}: file không có chunk cùng phạm vi`); continue; }
  const nguyenVan = moi.noi_dung === c.noi_dung;
  const a = chuan(c.noi_dung), b = chuan(moi.noi_dung);
  const khopChuan = a === b;
  const dong: Record<string, unknown> = { dieu: c.dieu_khoan_range, nguyen_van: nguyenVan, sau_chuan_hoa: khopChuan, ky_tu_cu: c.noi_dung.length, ky_tu_file: moi.noi_dung.length };
  if (!khopChuan) {
    dat4 = false;
    const i = lechDau(a, b);
    const wa = new Set(tu(c.noi_dung)), wb = new Set(tu(moi.noi_dung));
    dong.lech_tai = i;
    dong.chunk_cu = a.slice(Math.max(0, i - 80), i + 160);
    dong.file = b.slice(Math.max(0, i - 80), i + 160);
    dong.tu_chi_co_o_cu = [...wa].filter((w) => !wb.has(w)).slice(0, 40);
    dong.tu_chi_co_o_file = [...wb].filter((w) => !wa.has(w)).slice(0, 40);
  }
  bang.push(dong);
  chiTiet4.push(`${c.dieu_khoan_range}: nguyên văn ${nguyenVan ? "khớp" : "khác"}, sau chuẩn hóa ${khopChuan ? "khớp" : "LỆCH"}`);
}
ghi("4. 9 điều cũ khớp chunk đã nạp", dat4, chiTiet4.join("; "));

for (const k of ketQua) console.log(`${k.dat ? "ĐẠT " : "LỆCH"} ${k.buoc} — ${k.chi_tiet}`);
for (const d of bang.filter((d) => !d.sau_chuan_hoa)) console.log(JSON.stringify(d, null, 1));
writeFileSync("research/van-ban/KIEM_TRA.json", JSON.stringify({ tep, ngay_kiem: new Date().toISOString(), ket_qua: ketQua, chi_tiet_9_dieu: bang }, null, 1) + "\n");
process.exit(ketQua.every((k) => k.dat) ? 0 : 2);
