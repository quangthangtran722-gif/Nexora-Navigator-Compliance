// Quy tắc "đủ trường để duyệt" phía giao diện phải khớp hàm SQL entity_du_dieu_kien_duyet (007). Chạy: npm test
// Các ca dưới đây cùng ý với supabase/tests/007_kiem_thu.sql (C0 / C1 / C5, hanh_vi chưa xác nhận phạm vi).
import assert from "node:assert/strict";
import { test } from "node:test";

import { lyDoChuaDuDuyet, patchKhiDoiMa } from "../lib/entity-rules.ts";
import type { BoMaDieuKien } from "../lib/types.ts";

const ma = (m: string, nhom: BoMaDieuKien["nhom"], danChieu = false): BoMaDieuKien => ({
  ma: m, ten: m, nhom, ly_do_mac_dinh: nhom === "khong_hinh_thuc_hoa" ? "thu_vien_chua_du" : null, can_van_ban_dan_chieu: danChieu, mo_ta: "",
});
const BO_MA = [ma("C0", "chung"), ma("C1", "may_doc"), ma("C5", "khong_hinh_thuc_hoa", true), ma("C6", "khong_hinh_thuc_hoa")];
const DK = { thuoc_tinh: "doanh_thu", toan_tu: "lte" as const, gia_tri: 3_000_000_000 };
const trong = { pham_vi: null, ma_dieu_kien: null, dieu_kien_may_doc: null, khong_hinh_thuc_hoa: false, van_ban_dan_chieu: null };

test("hanh_vi: phải xác nhận phạm vi; xác nhận rồi thì đủ", () => {
  assert.match(lyDoChuaDuDuyet({ ...trong, loai_entity: "hanh_vi" }, BO_MA)!, /chưa xác nhận phạm vi/);
  assert.equal(lyDoChuaDuDuyet({ ...trong, loai_entity: "hanh_vi", pham_vi: "chung" }, BO_MA), null);
});

test("loại không cần mã (thoi_han, doi_tuong) luôn đủ", () => {
  assert.equal(lyDoChuaDuDuyet({ ...trong, loai_entity: "thoi_han" }, BO_MA), null);
  assert.equal(lyDoChuaDuDuyet({ ...trong, loai_entity: "doi_tuong" }, BO_MA), null);
});

test("chu_the / dieu_kien / nguong chưa có mã → thiếu", () => {
  for (const loai of ["chu_the", "dieu_kien", "nguong"] as const) assert.match(lyDoChuaDuDuyet({ ...trong, loai_entity: loai }, BO_MA)!, /Chưa gán mã/);
});

test("C0: chỉ chủ thể, phải tự xác nhận pham_vi = chung", () => {
  assert.match(lyDoChuaDuDuyet({ ...trong, loai_entity: "chu_the", ma_dieu_kien: "C0" }, BO_MA)!, /phạm vi phải là "chung"/);
  assert.equal(lyDoChuaDuDuyet({ ...trong, loai_entity: "chu_the", ma_dieu_kien: "C0", pham_vi: "chung" }, BO_MA), null);
  assert.match(lyDoChuaDuDuyet({ ...trong, loai_entity: "dieu_kien", ma_dieu_kien: "C0", pham_vi: "chung" }, BO_MA)!, /chỉ dùng cho chủ thể/);
});

test("C1: phải có điều kiện máy đọc và phạm vi có điều kiện", () => {
  assert.match(lyDoChuaDuDuyet({ ...trong, loai_entity: "dieu_kien", ma_dieu_kien: "C1", pham_vi: "co_dieu_kien" }, BO_MA)!, /điều kiện máy đọc/);
  assert.equal(lyDoChuaDuDuyet({ ...trong, loai_entity: "dieu_kien", ma_dieu_kien: "C1", pham_vi: "co_dieu_kien", dieu_kien_may_doc: DK }, BO_MA), null);
});

test("C5: cờ không hình thức hóa + văn bản dẫn chiếu; C6 không cần văn bản", () => {
  const c5 = { ...trong, loai_entity: "dieu_kien" as const, ma_dieu_kien: "C5", pham_vi: "co_dieu_kien" as const, khong_hinh_thuc_hoa: true };
  assert.match(lyDoChuaDuDuyet(c5, BO_MA)!, /văn bản được dẫn chiếu/);
  assert.match(lyDoChuaDuDuyet({ ...c5, van_ban_dan_chieu: "   " }, BO_MA)!, /văn bản được dẫn chiếu/);
  assert.equal(lyDoChuaDuDuyet({ ...c5, van_ban_dan_chieu: "252/2026/NĐ-CP" }, BO_MA), null);
  assert.equal(lyDoChuaDuDuyet({ ...c5, ma_dieu_kien: "C6" }, BO_MA), null);
  assert.match(lyDoChuaDuDuyet({ ...c5, ma_dieu_kien: "C6", khong_hinh_thuc_hoa: false }, BO_MA)!, /gắn cờ/);
});

test("đổi mã: không tự xác nhận phạm vi chung; bỏ điều kiện máy đọc khi mã không phải nhóm máy đọc", () => {
  assert.deepEqual(patchKhiDoiMa(BO_MA[0], { dieu_kien_may_doc: DK }), {
    ma_dieu_kien: "C0", pham_vi: null, khong_hinh_thuc_hoa: false, van_ban_dan_chieu: null, dieu_kien_may_doc: null,
  });
  assert.equal(patchKhiDoiMa(BO_MA[1], { dieu_kien_may_doc: DK }).dieu_kien_may_doc, DK);
  assert.equal(patchKhiDoiMa(BO_MA[2], { dieu_kien_may_doc: DK }).pham_vi, "co_dieu_kien");
});
