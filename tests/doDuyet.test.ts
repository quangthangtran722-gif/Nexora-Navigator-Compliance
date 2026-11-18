// Phép đo khâu duyệt (NĐ + so đề xuất gốc ↔ bản đã duyệt) phải tái lập đúng số trước can thiệp đã công bố, trên bản chụp
// research/baseline/raw — không cần DB. Chạy: npm test
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { test } from "node:test";

import { khoangDuyet, thongKe, phanLoai, mannWhitney, fisher, cohenKappa, thaoTac, docTruoc, docDeXuat, rongNghia, maNhom, coTienToMa } from "../scripts/research/do-duyet-lib.mjs";

// Bản chụp prod (research/baseline/raw) không commit (.gitignore) — máy không có bản chụp thì bỏ qua các ca cần nó
const coBanChup = existsSync("research/baseline/raw/approvals.json");
const canBanChup = { skip: coBanChup ? false : "không có research/baseline/raw (bản chụp không commit)" };
const deXuat = docDeXuat();
const ids = new Set(deXuat.map((e: { id: string }) => e.id));
const { entities, approvals } = coBanChup ? docTruoc(ids) : { entities: [], approvals: [] };

test("đề xuất gốc: đủ 70 entity Luật 108", () => {
  assert.equal(deXuat.length, 70);
});

test("bản chụp: đủ 70 entity", canBanChup, () => {
  assert.equal(entities.length, 70);
});

test("NĐ trên bản chụp 20/10 ra đúng số HE_THONG_DA_CHOT §14.4: 55 khoảng, trung vị 8,6 giây, p90 51 giây", canBanChup, () => {
  const { khoang, boCungLuc, boNghi } = khoangDuyet(approvals);
  const s = thongKe(khoang.map((k: { giay: number }) => k.giay));
  assert.equal(s.n, 55);
  assert.equal(boCungLuc, 14);
  assert.equal(boNghi, 0);
  assert.equal(s.trung_vi.toFixed(1), "8.6");
  assert.equal(Math.round(s.p90), 51);
});

test("so đề xuất gốc ↔ prod: 9 entity bị sửa (H2), 7 ở Điều 8 đảo phủ định → đổi nghĩa", canBanChup, () => {
  const goc = new Map(deXuat.map((e: { id: string }) => [e.id, e]));
  const lop = entities
    .filter((e: { trang_thai_duyet: string }) => e.trang_thai_duyet === "da_duyet")
    .map((e: { id: string; so_dieu: number }) => ({ so_dieu: e.so_dieu, ...phanLoai(goc.get(e.id), e) }));
  const biSua = lop.filter((x: { lop: string }) => x.lop !== "y_nguyen");
  assert.equal(biSua.length, 9);
  const doiNghia = biSua.filter((x: { lop: string }) => x.lop === "doi_nghia");
  assert.equal(doiNghia.length, 7);
  assert.ok(doiNghia.every((x: { so_dieu: number; ly_do: string }) => x.so_dieu === 8 && x.ly_do.startsWith("dao_phu_dinh")));
});

test("phanLoai: quy tắc máy", () => {
  const g = { ten_entity: "Cản trở công chức thi hành công vụ", mo_ta: "x", loai_entity: "hanh_vi" };
  assert.equal(phanLoai(g, { ...g }).lop, "y_nguyen");
  assert.equal(phanLoai(g, { ...g, ten_entity: "  cản trở công chức thi hành công vụ. " }).lop, "y_nguyen");
  assert.equal(phanLoai(g, { ...g, ten_entity: "Cản trở công chức, thi hành công vụ" }).lop, "sua_nho");
  assert.equal(phanLoai(g, { ...g, ten_entity: "Không cản trở công chức thi hành công vụ" }).lop, "doi_nghia");
  assert.equal(phanLoai(g, { ...g, loai_entity: "dieu_kien" }).lop, "doi_nghia");
  assert.equal(phanLoai(g, { ...g, ten_entity: "Cản trở cán bộ thuế thi hành công vụ" }).lop, "can_nguoi");
});

test("Mann–Whitney: không chạy khi nhóm < 5; hai nhóm tách hẳn → p nhỏ", () => {
  assert.equal(mannWhitney([1, 2, 3, 4], [5, 6, 7, 8, 9]), null);
  const r = mannWhitney([1, 2, 3, 4, 5, 6, 7, 8], [20, 21, 22, 23, 24, 25, 26, 27]);
  assert.ok(r && r.p < 0.01 && r.U === 0);
  const s = mannWhitney([1, 2, 3, 4, 5], [1, 2, 3, 4, 5]);
  assert.ok(s && s.p > 0.9);
});

test("Fisher chính xác hai phía: ví dụ nếm trà của Fisher [[3,1],[1,3]] → p ≈ 0,486", () => {
  assert.equal(fisher(3, 1, 1, 3).toFixed(3), "0.486");
  assert.equal(fisher(5, 0, 0, 5).toFixed(4), "0.0079");
});

test("rongNghia: điều kiện đúng với mọi giá trị của tập đóng (PHAM_VI_VA_PHUONG_PHAP §2.6)", () => {
  const loaiHinh = { kieu: "text", lua_chon: ["doanh_nghiep", "ho_kinh_doanh", "ca_nhan_kinh_doanh"] };
  const ca3 = { thuoc_tinh: "loai_hinh_kinh_doanh", toan_tu: "in", gia_tri: ["doanh_nghiep", "ho_kinh_doanh", "ca_nhan_kinh_doanh"] };
  assert.equal(rongNghia(ca3, loaiHinh), true); // chủ thể Đ10 k2 (17/11)
  assert.equal(rongNghia({ ...ca3, gia_tri: ["doanh_nghiep"] }, loaiHinh), false);
  assert.equal(rongNghia({ ...ca3, toan_tu: "not_in", gia_tri: [] }, loaiHinh), true);
  assert.equal(rongNghia({ thuoc_tinh: "co_tra_luong", toan_tu: "eq", gia_tri: true }, { kieu: "boolean", lua_chon: null }), false);
  // tập mở: số, text không lua_chon, text_array → không xét
  assert.equal(rongNghia({ thuoc_tinh: "doanh_thu_nam", toan_tu: "gte", gia_tri: 0 }, { kieu: "number", lua_chon: null }), false);
  assert.equal(rongNghia({ thuoc_tinh: "nganh", toan_tu: "neq", gia_tri: "x" }, { kieu: "text", lua_chon: null }), false);
  assert.equal(rongNghia(ca3, undefined), false);
});

test("maNhom: mã nhóm đầu ghi chú từ chối", () => {
  assert.equal(maNhom("[NN-CT] Chủ thể là cơ quan nhà nước"), "NN-CT");
  assert.equal(maNhom("  [DV] Cạnh đảo vai"), "DV");
  assert.equal(maNhom("[XYZ] khác"), "(không theo mã)");
  // câu chuẩn gõ không tiền tố (dạng thật trong DB 17/11) → nhận theo đầu câu
  assert.equal(maNhom("Chủ thể là cơ quan nhà nước hoặc công chức, không thuộc nhóm đối tượng hệ thống phục vụ."), "NN-CT");
  assert.equal(maNhom("Nghĩa vụ do cơ quan nhà nước hoặc công chức mang, không phải nghĩa vụ của doanh nghiệp."), "NN-NV");
  assert.equal(maNhom("Entity điều kiện không còn nghĩa vụ nguồn hợp lệ"), "DV");
  assert.equal(maNhom("Điều khoản giao Chính phủ hoặc Bộ trưởng ban hành văn bản hướng dẫn"), "GQ");
  assert.equal(maNhom("Lỗi trích xuất: đối tượng được trích không phải chủ thể"), "TX");
  assert.equal(maNhom("Chủ thể là cơ quan nhà nước"), "(không theo mã)");
  assert.equal(coTienToMa("[GQ] x"), true);
  assert.equal(coTienToMa("Lỗi trích xuất: x"), false);
  assert.equal(maNhom(null), "(không ghi)");
  assert.equal(maNhom("   "), "(không ghi)");
});

test("Cohen's kappa 2×2: ví dụ tính tay và bảng chéo hai lượt duyệt", () => {
  // [[20,5],[10,15]]: p_o = 0,7; p_e = 0,5 → kappa = 0,4
  assert.equal(cohenKappa(20, 5, 10, 15).kappa.toFixed(3), "0.400");
  // Hai lượt duyệt 70 đề xuất (17/11): 29 / 16 / 5 / 20 → kappa 0,405; CI 95% 0,20–0,61
  const k = cohenKappa(29, 16, 5, 20);
  assert.equal(k.kappa.toFixed(3), "0.405");
  assert.equal(k.ci95.map((x: number) => x.toFixed(2)).join("–"), "0.20–0.61");
  // Khớp hoàn toàn → kappa = 1
  assert.equal(cohenKappa(10, 0, 0, 10).kappa, 1);
});

test("thaoTac: phân thao tác duyệt từ cột entity, màn cũ không có trường", () => {
  assert.equal(thaoTac("tu_choi", { ma_dieu_kien: "C2" }, true), "tu_choi");
  assert.equal(thaoTac("da_duyet", { ma_dieu_kien: "C6", pham_vi: "co_dieu_kien" }, true), "duyet_gan_ma");
  assert.equal(thaoTac("da_duyet", { ma_dieu_kien: null, pham_vi: "chung" }, true), "duyet_chon_pham_vi");
  assert.equal(thaoTac("da_duyet", { ma_dieu_kien: null, pham_vi: null }, true), "duyet_khong_truong");
  assert.equal(thaoTac("da_duyet", { ma_dieu_kien: null, pham_vi: null }, false), "duyet");
});
