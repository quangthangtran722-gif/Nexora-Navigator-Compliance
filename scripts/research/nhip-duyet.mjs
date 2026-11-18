// NĐ — thời gian duyệt mỗi entity, tự động từ `approvals` (HE_THONG_DA_CHOT §14.4). CHỈ ĐỌC.
// Dùng: node scripts/research/nhip-duyet.mjs --nguon truoc|sau
//   truoc: bản chụp prod 09/11 (research/baseline/raw) — lượt duyệt màn cũ 20/10/2026
//   sau  : DB MIS (MIS_DB_URL hoặc .env.mis.local) — lượt duyệt màn mới (U1a)
// Ghi research/sau/nhip-duyet-<nguon>.json, in tóm tắt. Quy tắc đo: do-duyet-lib.mjs khoangDuyet.
import { mkdirSync, writeFileSync } from "node:fs";
import { khoangDuyet, thongKe, thaoTac, docTruoc, docSau, docDeXuat, NGHI_GIAY } from "./do-duyet-lib.mjs";

const nguon = process.argv[process.argv.indexOf("--nguon") + 1];
if (!["truoc", "sau"].includes(nguon)) { console.error("Dùng: --nguon truoc|sau"); process.exit(1); }

const deXuat = docDeXuat();
const ids = new Set(deXuat.map((e) => e.id));
const { entities, approvals } = nguon === "truoc" ? docTruoc(ids) : docSau(ids);
const ent = new Map(entities.map((e) => [e.id, e]));
const { khoang, boCungLuc, boNghi, soDong } = khoangDuyet(approvals);
// Không ghi id tài khoản ra file: đổi thành bí danh theo thứ tự xuất hiện
const biDanh = new Map();
for (const k of khoang) if (!biDanh.has(k.nguoi)) biDanh.set(k.nguoi, `nguoi_${biDanh.size + 1}`);
for (const k of khoang) k.nguoi = biDanh.get(k.nguoi);
// Thao tác trước khi bấm (thêm 18/11, sau khi có số — tách mô tả, không kiểm định): xem do-duyet-lib.mjs thaoTac
for (const k of khoang) k.thao_tac = thaoTac(k.quyet_dinh, ent.get(k.entity_id), nguon === "sau");

const nhom = (khoa) => {
  const m = {};
  for (const k of khoang) (m[khoa(k) ?? "(trống)"] ??= []).push(k.giay);
  return Object.fromEntries(Object.entries(m).sort().map(([k, v]) => [k, thongKe(v)]));
};
const chuaXuLy = entities.filter((e) => e.trang_thai_duyet === "cho_duyet").length;
const out = {
  nguon, chay_luc: new Date().toISOString(), van_ban: "108/2025/QH15",
  quy_tac: `khoảng giữa hai dòng approvals entity liên tiếp của cùng người; bỏ khoảng = 0 (duyệt cả chunk), bỏ khoảng > ${NGHI_GIAY} giây; hạng gần nhất`,
  so_entity: entities.length, con_cho_duyet: chuaXuLy, so_dong_approvals_entity: soDong,
  bo_cung_thoi_diem: boCungLuc, bo_qua_10_phut: boNghi,
  tong: thongKe(khoang.map((k) => k.giay)),
  theo_nguoi: nhom((k) => k.nguoi),
  theo_quyet_dinh: nhom((k) => k.quyet_dinh),
  theo_thao_tac: nhom((k) => k.thao_tac),
  theo_loai_entity: nhom((k) => ent.get(k.entity_id)?.loai_entity),
  theo_ma_dieu_kien: nguon === "sau" ? nhom((k) => ent.get(k.entity_id)?.ma_dieu_kien) : "không có (màn cũ chưa có mã C0–C7)",
  theo_dieu: nhom((k) => String(ent.get(k.entity_id)?.so_dieu)),
  khoang,
};
mkdirSync("research/sau", { recursive: true });
writeFileSync(`research/sau/nhip-duyet-${nguon}.json`, JSON.stringify(out, null, 1));

const f = (s) => (s.n ? `n=${s.n}, trung vị ${s.trung_vi.toFixed(1)} giây, p90 ${s.p90.toFixed(1)} giây` : "n=0");
console.log(`NĐ — ${nguon}: ${entities.length} entity, còn chờ duyệt ${chuaXuLy}; ${soDong} dòng duyệt entity`);
console.log(`  bỏ ${boCungLuc} khoảng cùng thời điểm (duyệt cả chunk), ${boNghi} khoảng > 10 phút`);
console.log(`  tổng: ${f(out.tong)}`);
for (const [k, v] of Object.entries(out.theo_loai_entity)) console.log(`  ${k}: ${f(v)}`);
if (nguon === "sau") for (const [k, v] of Object.entries(out.theo_ma_dieu_kien)) console.log(`  mã ${k}: ${f(v)}`);
if (chuaXuLy) console.log(`  CHÚ Ý: còn ${chuaXuLy} entity chờ duyệt — số đo chưa đủ`);
console.log(`→ research/sau/nhip-duyet-${nguon}.json`);
