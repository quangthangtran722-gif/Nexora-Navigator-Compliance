// Test rule engine (code thuần) + chốt chặn số liệu của generate. Chạy: npm test
import assert from "node:assert/strict";
import { test } from "node:test";

import { numbersNotInSource } from "../lib/pipeline/generateDiagnostic.prompt.ts";
import { evaluateCondition, evaluateEntity, thuocTinhRuleEngine, todayInVietnam, type DieuKienMayDoc } from "../lib/pipeline/ruleEngine.ts";

const dk = (thuoc_tinh: string, toan_tu: DieuKienMayDoc["toan_tu"], gia_tri: DieuKienMayDoc["gia_tri"]) => ({
  entity_id: thuoc_tinh,
  ten_entity: thuoc_tinh,
  dieu_kien_may_doc: { thuoc_tinh, toan_tu, gia_tri },
});
const base = { domain: "thue", customerDomains: ["thue"], ngayHieuLuc: "2026-07-01", homNay: "2026-10-18" };

test("quy tắc 1: ngoài lĩnh vực → khong_ap_dung", () => {
  assert.equal(evaluateEntity({ ...base, customerDomains: ["ke_toan"], thuocTinh: {}, dieuKien: [] }).trang_thai_ap_dung, "khong_ap_dung");
});

test("quy tắc 4: ngày hiệu lực", () => {
  assert.equal(evaluateEntity({ ...base, thuocTinh: {}, dieuKien: [] }).trang_thai_ap_dung, "ap_dung");
  assert.equal(evaluateEntity({ ...base, ngayHieuLuc: "2027-01-01", thuocTinh: {}, dieuKien: [] }).trang_thai_ap_dung, "sap_ap_dung");
  assert.equal(evaluateEntity({ ...base, ngayHieuLuc: "2026-10-18", thuocTinh: {}, dieuKien: [] }).trang_thai_ap_dung, "ap_dung");
});

test("quy tắc 3: thiếu / sai / đúng", () => {
  const conds = [dk("a", "eq", true), dk("b", "gte", 5)];
  const thieu = evaluateEntity({ ...base, thuocTinh: { a: null }, dieuKien: conds });
  assert.equal(thieu.trang_thai_ap_dung, "chua_du_thong_tin");
  assert.deepEqual(thieu.thuoc_tinh_thieu, ["a", "b"]);
  assert.equal(evaluateEntity({ ...base, thuocTinh: { b: 1 }, dieuKien: conds }).trang_thai_ap_dung, "khong_ap_dung");
  assert.equal(evaluateEntity({ ...base, thuocTinh: { a: true, b: 9 }, dieuKien: conds }).trang_thai_ap_dung, "ap_dung");
});

test("toán tử", () => {
  const c = (toan_tu: DieuKienMayDoc["toan_tu"], gia_tri: DieuKienMayDoc["gia_tri"]) => ({ thuoc_tinh: "x", toan_tu, gia_tri });
  assert.equal(evaluateCondition(c("lte", 200000000), 200000000), true);
  assert.equal(evaluateCondition(c("in", ["quy", "thang"]), "quy"), true);
  assert.equal(evaluateCondition(c("not_in", [1, 2]), 3), true);
  assert.equal(evaluateCondition(c("contains", "san_thuong_mai_dien_tu"), ["cua_hang"]), false);
  assert.equal(evaluateCondition(c("contains_any", ["a", "b"]), ["b"]), true);
  assert.equal(evaluateCondition(c("neq", false), true), true);
  assert.equal(evaluateCondition(c("eq", true), false), false);
  assert.equal(evaluateCondition(c("eq", true), null), null);
});

test("ngày theo giờ Việt Nam", () => {
  assert.equal(todayInVietnam(new Date("2026-10-18T18:30:00Z")), "2026-10-19");
});

test("generate: bắt con số không có trong văn bản", () => {
  const item = { ma: "n1", tieu_de: "Nộp thuế đã khấu trừ", cac_buoc: ["Nộp trước ngày 20", "Khấu trừ 10% với HĐ dưới 3 tháng"], thoi_han: null, luu_y: null };
  const nguon = "Chậm nhất ngày thứ 20 ... mức 10% ... dưới 03 tháng";
  assert.deepEqual(numbersNotInSource(item, nguon), []);
  assert.deepEqual(numbersNotInSource({ ...item, luu_y: "Phạt 5 triệu" }, nguon), ["5"]);
});

test("nganh lấy từ cột customers.nganh → điều kiện nganh eq chung_khoan phân biệt được doanh nghiệp", () => {
  const dieuKien = [dk("nganh", "eq", "chung_khoan")];
  const danhGia = (nganh: string | null) =>
    evaluateEntity({
      domain: "thue",
      customerDomains: ["thue"],
      thuocTinh: thuocTinhRuleEngine({ nganh, thuoc_tinh: { so_lao_dong: 50 } }),
      dieuKien,
      ngayHieuLuc: "2026-01-01",
      homNay: "2026-10-19",
    }).trang_thai_ap_dung;
  assert.equal(danhGia("chung_khoan"), "ap_dung");
  assert.equal(danhGia("van_tai_logistics"), "khong_ap_dung");
  assert.equal(danhGia(null), "chua_du_thong_tin");
});
