// Phép đo khâu duyệt (NĐ + so đề xuất gốc ↔ bản đã duyệt) phải tái lập đúng số trước can thiệp đã công bố, trên bản chụp
// research/baseline/raw — không cần DB. Chạy: npm test
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { test } from "node:test";

import { khoangDuyet, thongKe, phanLoai, mannWhitney, fisher, docTruoc, docDeXuat } from "../scripts/research/do-duyet-lib.mjs";

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
