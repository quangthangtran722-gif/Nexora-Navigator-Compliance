// Test phần code thuần của POST /api/onboard: kiểm tra body, đoán mã phòng ban, gom kết quả. Chạy: npm test
import assert from "node:assert/strict";
import { test } from "node:test";

import { doanSlugPhongBan, kiemTraOnboard, soDieu, tongHopKetQua, type DinhNghiaThuocTinh } from "../lib/onboard.ts";

const DICT: DinhNghiaThuocTinh[] = [
  { ma: "loai_hinh_kinh_doanh", kieu: "text", lua_chon: ["cong_ty_tnhh", "cong_ty_co_phan", "ho_kinh_doanh"] },
  { ma: "so_lao_dong", kieu: "number", lua_chon: null },
  { ma: "doanh_thu_nam", kieu: "number", lua_chon: null },
  { ma: "co_tra_luong", kieu: "boolean", lua_chon: null },
  { ma: "co_san_tmdt", kieu: "boolean", lua_chon: null },
  { ma: "co_xuat_nhap_khau", kieu: "boolean", lua_chon: null },
  { ma: "nganh", kieu: "text", lua_chon: null },
];

// Đúng ví dụ request trong contract BE-7
const BODY = {
  ten_cong_ty: "Công ty TNHH Minh Phát",
  ma_so_thue: "0312345678",
  nganh: "cong_nghe_thong_tin",
  quy_mo: "nho",
  domains: ["thue", "ke_toan"],
  thuoc_tinh: {
    loai_hinh_kinh_doanh: "cong_ty_tnhh",
    so_lao_dong: 35,
    doanh_thu_nam: 8000000000,
    co_tra_luong: true,
    co_san_tmdt: false,
    co_xuat_nhap_khau: false,
  },
  phong_ban: [
    { ten_phong_ban: "Ban Giám đốc", email_head: "gd@minhphat.vn" },
    { ten_phong_ban: "Phòng Kế toán", email_head: "ketoan@minhphat.vn" },
  ],
};

test("body mẫu của contract hợp lệ, slug phòng ban tự đoán từ tên", () => {
  const kt = kiemTraOnboard(BODY, DICT);
  assert.deepEqual(kt.loi, []);
  assert.deepEqual(kt.payload!.phong_ban.map((p) => p.slug_phong_ban), ["ban_giam_doc", "ke_toan"]);
  assert.equal(kt.payload!.thuoc_tinh.doanh_thu_nam, 8000000000);
});

test("gom đủ lỗi từng trường: khóa lạ, sai kiểu, ngoài lựa chọn, nganh gửi nhầm vào thuoc_tinh, phòng trùng", () => {
  const kt = kiemTraOnboard(
    {
      ...BODY,
      ma_so_thue: "12345",
      thuoc_tinh: { khoa_la: 1, so_lao_dong: "35", loai_hinh_kinh_doanh: "doanh_nghiep_tu_nhan", nganh: "it", co_san_tmdt: null },
      phong_ban: [{ ten_phong_ban: "Phòng Kế toán" }, { ten_phong_ban: "phòng kế toán" }, { ten_phong_ban: "Phòng Đối ngoại" }],
    },
    DICT,
  );
  assert.equal(kt.payload, null);
  assert.deepEqual(kt.loi.map((l) => l.truong), [
    "ma_so_thue",
    "thuoc_tinh.khoa_la",
    "thuoc_tinh.so_lao_dong",
    "thuoc_tinh.loai_hinh_kinh_doanh",
    "thuoc_tinh.nganh",
    "phong_ban[1].ten_phong_ban",
    "phong_ban[2].slug_phong_ban",
  ]);
});

test("null = Chưa chắc được chấp nhận; slug gửi kèm thắng slug đoán", () => {
  const kt = kiemTraOnboard({ ...BODY, thuoc_tinh: { co_san_tmdt: null }, phong_ban: [{ ten_phong_ban: "Phòng Đối ngoại", slug_phong_ban: "phap_che" }] }, DICT);
  assert.deepEqual(kt.loi, []);
  assert.equal(kt.payload!.thuoc_tinh.co_san_tmdt, null);
  assert.equal(kt.payload!.phong_ban[0].slug_phong_ban, "phap_che");
});

test("đoán mã phòng ban", () => {
  assert.equal(doanSlugPhongBan("Phòng Tài chính - Kế toán"), "ke_toan");
  assert.equal(doanSlugPhongBan("Hành chính - Nhân sự"), "nhan_su");
  assert.equal(doanSlugPhongBan("Phòng IT"), "cong_nghe");
  assert.equal(doanSlugPhongBan("Phòng Kinh doanh"), "kinh_doanh");
  assert.equal(doanSlugPhongBan("Tổng Giám đốc"), "ban_giam_doc");
  assert.equal(doanSlugPhongBan("Phòng Đầu tư"), null);
});

test("soDieu đọc số điều từ dieu_khoan", () => {
  assert.equal(soDieu("Điều 10, khoản 2"), 10);
  assert.equal(soDieu("Khoản 3 Điều 41"), 41);
  assert.equal(soDieu("Phụ lục"), null);
});

test("tổng hợp: thong_ke theo nghĩa vụ, theo_phong_ban theo diagnostic, đủ mọi phòng", () => {
  const vb = { so_hieu: "108/2025/QH15", ten_van_ban: "Luật Quản lý thuế" };
  const r = tongHopKetQua(
    "kh1",
    [
      { entity_id: "e1", ten_entity: "Đăng ký thuế", dieu_khoan: "Điều 10", van_ban: vb, trang_thai_ap_dung: "ap_dung", thuoc_tinh_thieu: [], diagnostic_ids: ["d1"] },
      { entity_id: "e2", ten_entity: "Khai thuế", dieu_khoan: "Điều 12", van_ban: vb, trang_thai_ap_dung: "ap_dung", thuoc_tinh_thieu: [], diagnostic_ids: ["d2", "d3"] },
      { entity_id: "e3", ten_entity: "Khai thuế sàn", dieu_khoan: "Điều 30", van_ban: vb, trang_thai_ap_dung: "khong_ap_dung", thuoc_tinh_thieu: [], diagnostic_ids: [] },
      { entity_id: "e4", ten_entity: "Hoàn thuế", dieu_khoan: "Điều 5", van_ban: vb, trang_thai_ap_dung: "chua_du_thong_tin", thuoc_tinh_thieu: ["co_xuat_nhap_khau"], diagnostic_ids: ["d4"] },
    ],
    [
      { id: "d1", department_id: "kt" },
      { id: "d2", department_id: "kt" },
      { id: "d3", department_id: "gd" },
      { id: "d4", department_id: "kt" },
    ],
    [
      { id: "gd", ten_phong_ban: "Ban Giám đốc" },
      { id: "kt", ten_phong_ban: "Phòng Kế toán" },
      { id: "ns", ten_phong_ban: "Phòng Nhân sự" },
    ],
  );
  assert.equal(r.tong_nghia_vu, 2);
  assert.deepEqual(r.thong_ke, { ap_dung: 2, sap_ap_dung: 0, khong_ap_dung: 1, chua_du_thong_tin: 1 });
  assert.deepEqual(r.theo_phong_ban, [
    { ten_phong_ban: "Phòng Kế toán", so_nghia_vu: 2 },
    { ten_phong_ban: "Ban Giám đốc", so_nghia_vu: 1 },
    { ten_phong_ban: "Phòng Nhân sự", so_nghia_vu: 0 },
  ]);
  // e2 giao 2 phòng → 2 dòng; chưa đủ thông tin / không áp dụng → không gắn phòng
  assert.deepEqual(r.ket_qua.map((k) => [k.entity_id, k.ten_phong_ban]), [
    ["e1", "Phòng Kế toán"],
    ["e2", "Phòng Kế toán"],
    ["e2", "Ban Giám đốc"],
    ["e4", null],
    ["e3", null],
  ]);
  assert.deepEqual(r.ket_qua[0].van_ban, { ...vb, so_dieu: 10 });
});
