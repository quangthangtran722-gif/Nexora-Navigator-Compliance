// Khảo sát toàn văn Luật 108 cho bản đề xuất thứ tự ưu tiên (UU_TIEN_LUAT_108.md §5). CHỈ ĐỌC file, không gọi DB / LLM.
// Mỗi điều: tên, số khoản, số ký tự, ước số entity, và các CÂU NGUYÊN VĂN khớp dấu hiệu của TC1 / TC2 / TC3 / nghĩa vụ của
// người nộp thuế. Dấu hiệu chỉ để GOM câu cho người đọc — bậc do người xếp theo §3, không do script.
// Dùng: node scripts/mis/khao-sat-dieu.ts > research/van-ban/KHAO_SAT_DIEU.json
import { readFileSync } from "node:fs";

const raw = readFileSync("research/van-ban/luat-108-2025-QH15.txt", "utf8");
const lines = raw.split("\n");
type Dieu = { so: number; ten: string; chuong: string; text: string };
const dieus: Dieu[] = [];
let chuong = "";
for (let i = 0; i < lines.length; i++) {
  const l = lines[i].trim();
  const c = l.match(/^Chương\s+([IVXLC]+)$/u);
  if (c) { chuong = `${c[1]}. ${(lines[i + 2] ?? "").trim()}`; continue; }
  const m = l.match(/^Điều\s+(\d+)\.\s*(.*)$/u);
  if (m) { dieus.push({ so: Number(m[1]), ten: m[2].trim(), chuong, text: "" }); continue; }
  if (dieus.length && l) dieus[dieus.length - 1].text += l + "\n";
}

const DAU_HIEU: Record<string, RegExp> = {
  tc1: /(trường hợp|nếu|khi |doanh thu|ngưỡng|hộ kinh doanh|cá nhân kinh doanh|doanh nghiệp siêu nhỏ|doanh nghiệp nhỏ|thay đổi|chấm dứt|giải thể|phá sản|tạm ngừng|chia, tách|sáp nhập|chuyển đổi loại hình|xuất khẩu|nhập khẩu|giao dịch liên kết|thương mại điện tử|nhóm)/iu,
  tc2: /(Chính phủ quy định|Bộ trưởng Bộ Tài chính quy định|theo quy định của pháp luật về|theo quy định của Luật|Luật số|Nghị định|tại Điều \d+|khoản \d+ Điều \d+ của Luật)/u,
  tc3: /(hóa đơn|chứng từ|ngân hàng|tổ chức tín dụng|hải quan|lao động|người lao động|thu nhập cá nhân|khấu trừ|đăng ký kinh doanh|đăng ký doanh nghiệp|xuất cảnh|tài khoản)/iu,
  nghia_vu: /(người nộp thuế (phải|có trách nhiệm|có nghĩa vụ|thực hiện)|chậm nhất|trong thời hạn|thời hạn nộp|thời hạn khai|phải (khai|nộp|đăng ký|thông báo|cung cấp|lập|sử dụng))/u,
};

const cau = (t: string) => t.split(/(?<=[.;:])\s+|\n/).map((s) => s.trim()).filter((s) => s.length > 15);
// Định mức entity: 9 điều cũ = 70 entity → entity / 1.000 ký tự (tính trên 9 điều cũ)
const CU = [2, 3, 8, 10, 11, 27, 48, 52, 53];
const kyTuCu = dieus.filter((d) => CU.includes(d.so)).reduce((n, d) => n + d.text.length, 0);
const entityMoiNghin = (70 / kyTuCu) * 1000;

const out = dieus.map((d) => {
  const cs = cau(d.text);
  const khop = Object.fromEntries(Object.entries(DAU_HIEU).map(([k, re]) => [k, cs.filter((s) => re.test(s)).slice(0, 4).map((s) => s.slice(0, 220))]));
  return {
    dieu: d.so, ten: d.ten, chuong: d.chuong, ky_tu: d.text.length,
    so_khoan: (d.text.match(/^\d+\.\s/gmu) ?? []).length,
    entity_uoc: Math.max(1, Math.round((d.text.length / 1000) * entityMoiNghin)),
    co_san: CU.includes(d.so),
    ...khop,
  };
});
console.log(JSON.stringify({ entity_moi_1000_ky_tu: Number(entityMoiNghin.toFixed(2)), ky_tu_9_dieu_cu: kyTuCu, dieu: out }, null, 1));
