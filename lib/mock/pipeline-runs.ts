import type { PipelineRun } from "@/lib/types";

/*
 * MOCK DATA — nhật ký pipeline_runs.
 * extract_entities: mỗi lần chạy = 1 chunk (khớp entity.pipeline_run_id trong entities.ts).
 * filter_domain: rule engine thuần code → model = null.
 * input/output là ví dụ rút gọn, không phải log thật.
 */

const MODEL = "openai/gpt-oss-120b";

function extract(n: number, at: string, entities: number, rels: number, ms: number): PipelineRun {
  return {
    id: `pr-0${n}`,
    buoc: "extract_entities",
    customer_id: null,
    chunk_id: `ch-0${n}`,
    entity_id: null,
    input: { chunk_id: `ch-0${n}`, so_ky_tu: 600 + n * 37 },
    output: { so_entity: entities, so_relationship: rels, trang_thai_duyet: "cho_duyet" },
    model: MODEL,
    thanh_cong: true,
    loi: null,
    thoi_gian_ms: ms,
    created_at: at,
  };
}

function diagnostic(n: number, entityId: string, at: string, count: number, ms: number): PipelineRun {
  return {
    id: `pr-g0${n}`,
    buoc: "generate_diagnostic",
    customer_id: "c-minh-phat",
    chunk_id: null,
    entity_id: entityId,
    input: { customer_id: "c-minh-phat", entity_id: entityId },
    output: { so_diagnostic: count, trang_thai_duyet: "cho_duyet" },
    model: MODEL,
    thanh_cong: true,
    loi: null,
    thoi_gian_ms: ms,
    created_at: at,
  };
}

export const mockPipelineRuns: PipelineRun[] = [
  extract(1, "2026-10-15T08:02:11Z", 3, 3, 4210),
  extract(2, "2026-10-15T08:02:19Z", 1, 1, 2870),
  extract(3, "2026-10-15T08:05:40Z", 2, 1, 3540),
  extract(4, "2026-10-15T08:05:47Z", 1, 0, 2310),
  extract(5, "2026-10-15T08:09:03Z", 2, 1, 3120),
  extract(6, "2026-10-15T08:12:30Z", 2, 2, 3890),
  extract(7, "2026-10-15T08:12:36Z", 1, 0, 2050),
  {
    // Ví dụ lỗi: output AI không qua được Zod schema → không tạo entity nào
    id: "pr-08",
    buoc: "extract_entities",
    customer_id: null,
    chunk_id: "ch-08",
    entity_id: null,
    input: { chunk_id: "ch-08", so_ky_tu: 912 },
    output: null,
    model: MODEL,
    thanh_cong: false,
    loi: "Output không khớp Zod schema: entities[2].dieu_khoan bị thiếu",
    thoi_gian_ms: 5120,
    created_at: "2026-10-15T08:12:44Z",
  },
  {
    id: "pr-f01",
    buoc: "filter_domain",
    customer_id: "c-minh-phat",
    chunk_id: null,
    entity_id: null,
    input: { customer_id: "c-minh-phat", domains: ["thue", "ke_toan"] },
    output: { ap_dung: 5, sap_ap_dung: 2, khong_ap_dung: 1, chua_du_thong_tin: 1 },
    model: null,
    thanh_cong: true,
    loi: null,
    thoi_gian_ms: 14,
    created_at: "2026-10-16T02:00:05Z",
  },
  diagnostic(1, "e-01", "2026-10-16T02:00:09Z", 2, 3310),
  diagnostic(2, "e-05", "2026-10-16T02:00:14Z", 3, 3980),
  diagnostic(3, "e-08", "2026-10-16T02:00:18Z", 1, 2640),
  diagnostic(4, "e-10", "2026-10-16T02:00:23Z", 2, 3050),
  diagnostic(5, "e-12", "2026-10-16T02:00:26Z", 1, 1980),
];
