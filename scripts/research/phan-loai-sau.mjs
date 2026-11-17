// Lượt sau (MIS, U1a) — CHỈ ĐỌC. Ba phép đếm không có ở lượt trước:
//   1. Điều kiện máy đọc rỗng nghĩa (PHAM_VI_VA_PHUONG_PHAP §2.6) — quy tắc ở do-duyet-lib.mjs rongNghia.
//   2. Từ chối theo mã nhóm đầu ghi chú ([NN-CT] [NN-NV] [GQ] [DV] [TX], quy ước 17/11).
//   3. Bảng 13 entity Điều 8 lượt sau, cho khung research/bao-cao/DOI_XUNG_DIEU_8.md.
// KHÔNG đọc dữ liệu lượt trước (điều kiện làm mù: không so từ chối từng entity giữa hai lượt cho tới khi duyệt xong).
// Dùng: node scripts/research/phan-loai-sau.mjs → research/sau/phan-loai-sau.{json,md}
import { mkdirSync, writeFileSync } from "node:fs";
import { truyVanMis, docDeXuat, rongNghia, maNhom, coTienToMa, MA_NHOM_TU_CHOI } from "./do-duyet-lib.mjs";

// Ngoại lệ mã nhóm: ghi chú trong approvals không sửa được (entity đã xử lý bị khóa). Đếm theo nhóm ĐÚNG ở đây, giữ nhóm
// đã ghi ở cột nhom_ghi. Chỉ thêm dòng khi người duyệt nêu nhóm đúng; không suy ra nhóm thay người duyệt.
const NGOAI_LE_MA = {
  "0504d6e0-c01b-4363-a940-87cf24e0058c": { nhom: "NN-NV", loai_sai: "sai_nhom", nguon: "người duyệt tự báo 17/11 (Đ3 Thực hiện phân nhóm người nộp thuế)" },
  "48a3d876-f2a4-46f5-99bf-6d203ccb1edd": { nhom: "NN-NV", loai_sai: "sai_nhom", nguon: "người duyệt tự báo 17/11 (Đ8 k1 Lợi dụng chức vụ…)" },
  "9ebbe638-073f-4054-8851-b54cf29b88ae": { nhom: "TX", loai_sai: "khong_ghi", nguon: "kế hoạch người duyệt chốt 17/11 (Đ52 k1 Luật này)" },
  "36b915f0-f4fc-42d1-ae03-a3ce520465a5": { nhom: "GQ", loai_sai: "khong_ghi", nguon: "kế hoạch người duyệt chốt 17/11 (Đ52 k4 áp dụng toàn bộ…)" },
};

const ids = new Set(docDeXuat().map((e) => e.id));
const d = truyVanMis(`select json_build_object(
  'e', (select coalesce(json_agg(json_build_object('id', id, 'so_dieu', so_dieu, 'dieu_khoan', dieu_khoan, 'ten_entity', ten_entity,
     'loai_entity', loai_entity, 'trang_thai_duyet', trang_thai_duyet, 'ma_dieu_kien', ma_dieu_kien, 'pham_vi', pham_vi,
     'dieu_kien_may_doc', dieu_kien_may_doc)), '[]') from entities),
  'tt', (select coalesce(json_agg(json_build_object('ma', ma, 'kieu', kieu, 'lua_chon', lua_chon)), '[]') from thuoc_tinh_ho_so),
  'a', (select coalesce(json_agg(json_build_object('entity_id', entity_id, 'quyet_dinh', quyet_dinh, 'ghi_chu', ghi_chu,
     'created_at', created_at)), '[]') from approvals where entity_id is not null))`);

const ents = d.e.filter((e) => ids.has(e.id)).sort((a, b) => a.so_dieu - b.so_dieu || a.dieu_khoan.localeCompare(b.dieu_khoan, "vi"));
const tt = new Map(d.tt.map((t) => [t.ma, t]));
// Quyết định cuối của mỗi entity (dòng approvals mới nhất)
const cuoi = new Map();
for (const a of d.a) if (ids.has(a.entity_id) && (!cuoi.has(a.entity_id) || Date.parse(a.created_at) >= Date.parse(cuoi.get(a.entity_id).created_at))) cuoi.set(a.entity_id, a);

const CAN_MA = ["chu_the", "dieu_kien", "nguong"];
const conCho = ents.filter((e) => e.trang_thai_duyet === "cho_duyet").length;

// 1. Rỗng nghĩa
const coDk = ents.filter((e) => e.trang_thai_duyet === "da_duyet" && e.dieu_kien_may_doc);
const dsDk = coDk.map((e) => ({ so_dieu: e.so_dieu, dieu_khoan: e.dieu_khoan, ten_entity: e.ten_entity, ma: e.ma_dieu_kien,
  dieu_kien: e.dieu_kien_may_doc, rong_nghia: rongNghia(e.dieu_kien_may_doc, tt.get(e.dieu_kien_may_doc.thuoc_tinh)) }));
const rong = {
  can_gan_ma: ents.filter((e) => CAN_MA.includes(e.loai_entity)).length,
  da_duyet_co_dieu_kien_may_doc: dsDk.length,
  rong_nghia: dsDk.filter((x) => x.rong_nghia).length,
  danh_sach: dsDk,
};

// 2. Từ chối theo mã nhóm
const tuChoi = ents.filter((e) => e.trang_thai_duyet === "tu_choi").map((e) => {
  const ghi_chu = cuoi.get(e.id)?.ghi_chu ?? null, nhom_ghi = maNhom(ghi_chu), nl = NGOAI_LE_MA[e.id];
  return { ...e, ghi_chu, nhom_ghi, nhom: nl?.nhom ?? nhom_ghi, ngoai_le: nl ?? null };
});
const ngoaiLe = tuChoi.filter((x) => x.ngoai_le);
const doTinCay = { tu_choi: tuChoi.length, co_tien_to_ma: tuChoi.filter((x) => coTienToMa(x.ghi_chu)).length,
  sai_nhom: ngoaiLe.filter((x) => x.ngoai_le.loai_sai === "sai_nhom").length, khong_ghi: tuChoi.filter((x) => x.nhom_ghi === "(không ghi)").length };
const NHOM = [...MA_NHOM_TU_CHOI, "(không theo mã)", "(không ghi)"];
const theoNhom = Object.fromEntries(NHOM.map((n) => [n, tuChoi.filter((x) => x.nhom === n).length]));
const theoNhomLoai = Object.fromEntries(NHOM.map((n) => [n, tuChoi.filter((x) => x.nhom === n).reduce((m, x) => ((m[x.loai_entity] = (m[x.loai_entity] ?? 0) + 1), m), {})]));

// 3. Điều 8
const dieu8 = ents.filter((e) => e.so_dieu === 8).map((e) => ({ dieu_khoan: e.dieu_khoan, loai_entity: e.loai_entity, ten_entity: e.ten_entity,
  trang_thai_duyet: e.trang_thai_duyet, nhom: e.trang_thai_duyet === "tu_choi" ? (NGOAI_LE_MA[e.id]?.nhom ?? maNhom(cuoi.get(e.id)?.ghi_chu)) : null,
  ghi_chu: cuoi.get(e.id)?.ghi_chu ?? null }));

const out = { chay_luc: new Date().toISOString(), so_entity: ents.length, con_cho_duyet: conCho,
  dem: { da_duyet: ents.filter((e) => e.trang_thai_duyet === "da_duyet").length, tu_choi: tuChoi.length },
  rong_nghia: rong, tu_choi_theo_nhom: theoNhom, tu_choi_theo_nhom_loai: theoNhomLoai, do_tin_cay_ma: doTinCay,
  ngoai_le_ma: ngoaiLe.map((x) => ({ dieu_khoan: x.dieu_khoan, ten_entity: x.ten_entity, nhom_ghi: x.nhom_ghi, nhom_dung: x.nhom, ...x.ngoai_le })),
  dieu_8: dieu8 };
mkdirSync("research/sau", { recursive: true });
writeFileSync("research/sau/phan-loai-sau.json", JSON.stringify(out, null, 1));

const md = [
  "# Lượt sau — điều kiện rỗng nghĩa, từ chối theo mã nhóm, Điều 8", "",
  `Chạy: ${out.chay_luc}. ${ents.length} entity; đã duyệt ${out.dem.da_duyet}; từ chối ${out.dem.tu_choi}; còn chờ ${conCho}.`,
  conCho ? `\n**CHƯA XONG LƯỢT DUYỆT:** còn ${conCho} entity chờ — số dưới đây chưa cuối cùng.\n` : "", "",
  "## Điều kiện rỗng nghĩa (PHAM_VI_VA_PHUONG_PHAP §2.6)", "",
  `- Entity phải gán mã (chủ thể / điều kiện / ngưỡng): ${rong.can_gan_ma}`,
  `- Đã duyệt, có điều kiện máy đọc (C1–C3): ${rong.da_duyet_co_dieu_kien_may_doc}`,
  `- Trong đó rỗng nghĩa: **${rong.rong_nghia}**`, "",
  "| Điều khoản | Entity | Mã | Điều kiện | Rỗng nghĩa |", "|---|---|---|---|---|",
  ...dsDk.map((x) => `| ${x.dieu_khoan} | ${x.ten_entity} | ${x.ma ?? ""} | \`${JSON.stringify(x.dieu_kien)}\` | ${x.rong_nghia ? "có" : "không"} |`), "",
  "## Từ chối theo mã nhóm (quy ước gõ tay đầu ghi chú, hệ không ép)", "",
  "| Mã | Số | Theo loại entity |", "|---|---|---|",
  ...NHOM.map((n) => `| ${n} | ${theoNhom[n]} | ${Object.entries(theoNhomLoai[n]).map(([k, v]) => `${k} ${v}`).join(", ")} |`), "",
  "Nhóm đếm theo bảng ngoại lệ `NGOAI_LE_MA` khi có (ghi chú đã khóa, không sửa được); nhóm ghi thật ở dưới.", "",
  `Độ tin cậy quy ước gõ tay: ${doTinCay.tu_choi} từ chối; có tiền tố [mã] ${doTinCay.co_tien_to_ma}; sai nhóm ${doTinCay.sai_nhom}; không ghi chú ${doTinCay.khong_ghi}.`, "",
  "| Điều khoản | Entity | Nhóm ghi | Nhóm đúng | Loại sai | Nguồn |", "|---|---|---|---|---|---|",
  ...out.ngoai_le_ma.map((x) => `| ${x.dieu_khoan} | ${x.ten_entity} | ${x.nhom_ghi} | ${x.nhom_dung} | ${x.loai_sai} | ${x.nguon} |`), "",
  "## Điều 8 — lượt sau (13 entity)", "",
  "| Điều khoản | Loại | Entity | Quyết định | Mã nhóm | Ghi chú |", "|---|---|---|---|---|---|",
  ...dieu8.map((x) => `| ${x.dieu_khoan} | ${x.loai_entity} | ${x.ten_entity} | ${x.trang_thai_duyet} | ${x.nhom ?? ""} | ${(x.ghi_chu ?? "").replace(/\|/g, "/")} |`), "",
].join("\n");
writeFileSync("research/sau/phan-loai-sau.md", md);
console.log(md);
