import type { Json, PipelineRun } from "@/lib/types";

/*
 * MOCK DATA — nhật ký pipeline_runs (CONTRACT §3.7).
 * extract_entities: 1 lần chạy = 1 chunk (ch-0N ↔ pr-0N). filter_domain: model = null, prompt_version = null.
 * input/output là ví dụ rút gọn, không phải log thật.
 */

const MODEL = "openai/gpt-oss-120b";

function at(iso: string, plusMs: number) {
  return new Date(new Date(iso).getTime() + plusMs).toISOString();
}

function extract(n: number, startedAt: string, durationMs: number, maTam: string[], soQuanHe: number, warnings: string[] = []): PipelineRun {
  const ch = String(n).padStart(2, "0");
  return {
    id: `pr-${ch}`,
    pipeline_name: "extract_entities",
    chunk_id: `ch-${ch}`,
    customer_id: null,
    parent_run_id: null,
    trang_thai: "hoan_tat",
    input: { chunk_id: `ch-${ch}` },
    // Rút gọn từ GroundingResult: { entities, relationships, rejected, warnings, soEntityTheoDieu }
    output: { entities: maTam, relationships: soQuanHe, rejected: [], warnings, soEntityTheoDieu: {} } as Json,
    model: MODEL,
    prompt_version: "extract-v2",
    error_log: null,
    nguoi_chay_id: "u-curator",
    started_at: startedAt,
    completed_at: at(startedAt, durationMs),
    created_at: startedAt,
  };
}

export const mockPipelineRuns: PipelineRun[] = [
  extract(1, "2026-10-15T08:02:11Z", 4210, ["e1", "e2", "e3"], 3),
  extract(2, "2026-10-15T08:02:30Z", 2870, ["e1"], 1),
  extract(3, "2026-10-15T08:05:40Z", 3540, ["e1", "e2"], 1),
  extract(4, "2026-10-15T08:05:58Z", 2310, ["e1"], 1),
  extract(5, "2026-10-15T08:09:03Z", 3120, ["e1", "e2", "e3"], 2),
  extract(6, "2026-10-15T08:12:30Z", 3890, ["e1"], 1),
  extract(7, "2026-10-15T08:12:48Z", 2050, ["e1", "e2"], 1),
  {
    // Ví dụ lỗi: output AI không qua được grounding/Zod → chunk ở trạng thái "loi"
    id: "pr-08",
    pipeline_name: "extract_entities",
    chunk_id: "ch-08",
    customer_id: null,
    parent_run_id: null,
    trang_thai: "loi",
    input: { chunk_id: "ch-08" },
    output: null,
    model: MODEL,
    prompt_version: "extract-v2",
    error_log: "Output không khớp Zod schema: entities[2].dieu_khoan bị thiếu",
    nguoi_chay_id: "u-curator",
    started_at: "2026-10-15T08:13:05Z",
    completed_at: null,
    created_at: "2026-10-15T08:13:05Z",
  },
  extract(9, "2026-10-17T03:10:00Z", 4630, ["e1", "e2", "e3"], 2, ["Cạnh e1 → 'Thông tư hướng dẫn' chưa nối được, để pending"]),
  extract(10, "2026-10-17T03:10:20Z", 3980, ["e1", "e2", "e3"], 3),
  {
    id: "pr-f01",
    pipeline_name: "filter_domain",
    chunk_id: null,
    customer_id: "c-minh-phat",
    parent_run_id: null,
    trang_thai: "hoan_tat",
    input: { customer_id: "c-minh-phat" },
    output: {
      ket_qua: [
        { entity_id: "e-01", trang_thai_ap_dung: "ap_dung", thuoc_tinh_thieu: [], diagnostic_ids: ["dg-01", "dg-02"] },
        { entity_id: "e-05", trang_thai_ap_dung: "chua_du_thong_tin", thuoc_tinh_thieu: ["gia_tri_mua_vao_lon_nhat"], diagnostic_ids: ["dg-03"] },
        { entity_id: "e-08", trang_thai_ap_dung: "ap_dung", thuoc_tinh_thieu: [], diagnostic_ids: ["dg-04"] },
        { entity_id: "e-10", trang_thai_ap_dung: "sap_ap_dung", thuoc_tinh_thieu: [], diagnostic_ids: ["dg-05", "dg-06"] },
        { entity_id: "e-12", trang_thai_ap_dung: "khong_ap_dung", thuoc_tinh_thieu: [], diagnostic_ids: ["dg-07"] },
      ],
    },
    model: null,
    prompt_version: null,
    error_log: null,
    nguoi_chay_id: "u-curator",
    started_at: "2026-10-16T02:00:05Z",
    completed_at: "2026-10-16T02:00:05.014Z",
    created_at: "2026-10-16T02:00:05Z",
  },
  {
    id: "pr-g01",
    pipeline_name: "generate_diagnostic",
    chunk_id: null,
    customer_id: "c-minh-phat",
    parent_run_id: "pr-f01",
    trang_thai: "hoan_tat",
    input: { customer_id: "c-minh-phat", diagnostic_ids: ["dg-01", "dg-02", "dg-04", "dg-05"] },
    output: { so_diagnostic: 4 },
    model: MODEL,
    prompt_version: "diagnostic-v1",
    error_log: null,
    nguoi_chay_id: "u-curator",
    started_at: "2026-10-16T02:00:09Z",
    completed_at: "2026-10-16T02:00:21Z",
    created_at: "2026-10-16T02:00:09Z",
  },
];
