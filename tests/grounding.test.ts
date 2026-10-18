// Test chốt chặn grounding — chuẩn hóa chiều cạnh trước khi vào DB. Chạy: npm test
import assert from "node:assert/strict";
import { test } from "node:test";

import type { ExtractOutput, ExtractedRelationship, LoaiEntity } from "../lib/pipeline/extractEntities.schema.ts";
import { splitArticles, validateExtraction } from "../lib/pipeline/grounding.ts";

const articles = splitArticles(
  "Điều 1. Nghĩa vụ\nTrường hợp doanh thu trên 1 tỷ đồng thì người nộp thuế phải khai thuế theo quý. " +
    "Hành vi khai sai bị phạt tiền theo quy định.",
);

const entity = (ma_tam: string, loai_entity: LoaiEntity, noi_dung_goc: string) => ({
  ma_tam,
  loai_entity,
  ten_entity: ma_tam,
  mo_ta: ma_tam,
  so_dieu: 1,
  dieu_khoan: "Điều 1",
  noi_dung_goc,
  domain: "thue",
  primary_departments: [],
  secondary_departments: [],
  ngay_co_hieu_luc: null,
});

const ENTITIES = [
  entity("hv", "hanh_vi", "phải khai thuế theo quý"),
  entity("ct", "chu_the", "người nộp thuế"),
  entity("dk", "dieu_kien", "Trường hợp doanh thu trên 1 tỷ đồng"),
  entity("ng", "nguong", "doanh thu trên 1 tỷ đồng"),
  entity("tai", "che_tai", "bị phạt tiền theo quy định"),
];

const rel = (loai_relationship: ExtractedRelationship["loai_relationship"], source: string, target: string | null) => ({
  loai_relationship,
  source,
  target,
  target_ref_text: target === null ? "theo quy định" : null,
  can_cu: "người nộp thuế phải khai thuế theo quý",
});

const run = (relationships: ExtractedRelationship[]) =>
  validateExtraction(articles, { entities: ENTITIES, relationships, dieu_bo_qua: [] } as ExtractOutput);

const edges = (r: ReturnType<typeof run>) => r.relationships.map((x) => `${x.loai_relationship}:${x.source}->${x.target}`);

test("cạnh đúng chiều giữ nguyên, không cảnh báo", () => {
  const r = run([rel("ap_dung_cho", "hv", "ct"), rel("dieu_kien", "dk", "hv"), rel("che_tai_cua", "tai", "hv")]);
  assert.deepEqual(edges(r), ["ap_dung_cho:hv->ct", "dieu_kien:dk->hv", "che_tai_cua:tai->hv"]);
  assert.equal(r.warnings.filter((w) => w.ly_do === "dao_chieu_canh").length, 0);
});

test("cạnh ngược chiều được đảo lại + cảnh báo dao_chieu_canh", () => {
  const r = run([rel("ap_dung_cho", "ct", "hv"), rel("dieu_kien", "hv", "ng"), rel("che_tai_cua", "hv", "tai")]);
  assert.deepEqual(edges(r), ["ap_dung_cho:hv->ct", "dieu_kien:ng->hv", "che_tai_cua:tai->hv"]);
  assert.deepEqual(
    r.warnings.filter((w) => w.ly_do === "dao_chieu_canh").map((w) => w.ma_tam),
    ["r1", "r2", "r3"],
  );
  // hanh_vi đã có chủ thể sau khi đảo → không còn cảnh báo thiếu chủ thể
  assert.ok(!r.warnings.some((w) => w.ly_do === "hanh_vi_thieu_chu_the"));
});

test("cạnh ngược trùng với cạnh đúng → gộp làm 1", () => {
  const r = run([rel("ap_dung_cho", "hv", "ct"), rel("ap_dung_cho", "ct", "hv")]);
  assert.deepEqual(edges(r), ["ap_dung_cho:hv->ct"]);
});

test("sai loại ở cả 2 chiều → loại", () => {
  const r = run([rel("dieu_kien", "ct", "tai")]);
  assert.deepEqual(edges(r), []);
  assert.equal(r.rejected.find((x) => x.muc === "relationship")?.ly_do, "sai_loai_dau_canh");
});

test("hanh_vi → hanh_vi (hợp lệ cả 2 chiều) và cạnh không định chiều giữ nguyên", () => {
  const ents = [...ENTITIES, entity("hv2", "hanh_vi", "khai thuế theo quý")];
  const r = validateExtraction(articles, {
    entities: ents,
    relationships: [rel("ap_dung_cho", "hv2", "hv"), rel("bao_ham", "ct", "hv")],
    dieu_bo_qua: [],
  } as ExtractOutput);
  assert.deepEqual(edges(r), ["ap_dung_cho:hv2->hv", "bao_ham:ct->hv"]);
});

test("cạnh pending (target ngoài chunk) sai loại source → giữ + cảnh báo", () => {
  const r = run([rel("dieu_kien", "hv", null)]);
  assert.equal(r.relationships.length, 1);
  assert.ok(r.warnings.some((w) => w.ly_do === "source_sai_loai_canh_pending"));
});
