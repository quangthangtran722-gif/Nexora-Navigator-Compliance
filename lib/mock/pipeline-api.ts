import { runRuleEngine } from "@/lib/mock/rule-engine";
import { db, newId, nowIso, todayVN } from "@/lib/mock/store";
import type { Diagnostic, Json, Notification, PipelineRun, TrangThaiApDung } from "@/lib/types";

/*
 * Mock 4 route /api/pipeline/* — CONTRACT.md §7. Backend đang build route thật.
 * Mọi route ghi 1 row pipeline_runs và trả run_id. Response đúng SHAPE contract;
 * lỗi ném PipelineError { status, error, code } như body { error, code? } của route thật.
 * Nối API thật: thay thân `postPipeline` bằng fetch(path, { method: "POST", body }) — UI giữ nguyên.
 *
 * Giới hạn của mock: extract KHÔNG gọi AI — số entity trả về là số giả lập.
 * filter/rescan chạy rule engine giả lập (lib/mock/rule-engine.ts) nên kết quả nhất quán với dữ liệu mẫu.
 */

export type FilterKetQua = { entity_id: string; trang_thai_ap_dung: TrangThaiApDung; thuoc_tinh_thieu: string[]; diagnostic_ids: string[] };

export type PipelineRoutes = {
  "/api/pipeline/extract": {
    body: { chunk_id: string };
    res: { run_id: string; so_entity: number; so_relationship: number; so_bi_loai: number; so_canh_bao: number };
  };
  "/api/pipeline/filter": {
    body: { customer_id: string; entity_id?: string };
    res: { run_id: string; ket_qua: FilterKetQua[] };
  };
  "/api/pipeline/generate": {
    body: { customer_id: string; diagnostic_ids?: string[] };
    res: { run_id: string; so_diagnostic: number };
  };
  "/api/pipeline/rescan": {
    body: Record<string, never>;
    res: { run_ids: string[] };
  };
};

export class PipelineError extends Error {
  constructor(
    public status: number,
    public error: string,
    public code?: string,
  ) {
    super(error);
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const MODEL = "openai/gpt-oss-120b";

function newRun(p: Pick<PipelineRun, "pipeline_name" | "chunk_id" | "customer_id" | "parent_run_id" | "input">): PipelineRun {
  const t = nowIso();
  const ai = p.pipeline_name !== "filter_domain";
  const run: PipelineRun = {
    ...p,
    id: newId("pr"),
    trang_thai: "dang_xu_ly",
    output: null,
    model: ai ? MODEL : null, // null ⇔ filter_domain
    prompt_version: ai ? (p.pipeline_name === "extract_entities" ? "extract-v2" : "diagnostic-v1") : null,
    error_log: null,
    nguoi_chay_id: "u-curator",
    started_at: t,
    completed_at: null,
    created_at: t,
  };
  db.pipelineRuns.push(run);
  return run;
}

function finish(run: PipelineRun, output: Json) {
  Object.assign(run, { trang_thai: "hoan_tat", output, completed_at: nowIso() });
}

/* ---------- extract ---------- */

async function extract({ chunk_id }: { chunk_id: string }) {
  const chunk = db.chunks.find((c) => c.id === chunk_id);
  if (!chunk) throw new PipelineError(404, "Không tìm thấy chunk.", "PT404");
  const run = newRun({ pipeline_name: "extract_entities", chunk_id, customer_id: null, parent_run_id: null, input: { chunk_id } });
  chunk.trang_thai = "dang_xu_ly";
  await sleep(1200); // route thật ~10s / chunk
  // Số liệu GIẢ LẬP theo độ dài văn bản — mock không gọi AI, không tạo entity
  const so_entity = Math.max(1, Math.min(6, Math.round(chunk.noi_dung.length / 120)));
  const res = { run_id: run.id, so_entity, so_relationship: Math.max(0, so_entity - 1), so_bi_loai: 0, so_canh_bao: chunk.noi_dung.includes("Điều") ? 0 : 1 };
  finish(run, { mo_phong: true, entities: so_entity, relationships: res.so_relationship, rejected: [], warnings: [] });
  chunk.trang_thai = "da_trich_xuat";
  return res;
}

/* ---------- filter (rule engine, KHÔNG AI) ---------- */

function filterSync(customer_id: string, entity_id?: string, parent_run_id: string | null = null) {
  const customer = db.customers.find((c) => c.id === customer_id);
  if (!customer) throw new PipelineError(404, "Không tìm thấy khách hàng.", "PT404");
  const run = newRun({ pipeline_name: "filter_domain", chunk_id: null, customer_id, parent_run_id, input: entity_id ? { customer_id, entity_id } : { customer_id } });

  const results = runRuleEngine(
    {
      customer,
      departments: db.departments.filter((d) => d.customer_id === customer_id),
      entities: db.entities,
      relationships: db.relationships,
      vanBan: db.vanBan,
      chunks: db.chunks,
      today: todayVN(),
    },
    entity_id,
  );

  const ket_qua: FilterKetQua[] = results.map((r) => {
    const existing = db.diagnostics.filter((d) => d.customer_id === customer_id && d.entity_id === r.entity_id);
    // khong_ap_dung: không tạo mới; chỉ cập nhật các diagnostic cũ (UI gạch đi)
    const targets = r.trang_thai_ap_dung === "khong_ap_dung" ? existing.map((d) => d.department_id) : r.department_ids;
    const ids = targets.map((department_id) => {
      let d = existing.find((x) => x.department_id === department_id);
      const before = d?.trang_thai_ap_dung;
      const t = nowIso();
      if (!d) {
        d = {
          id: newId("dg"), customer_id, entity_id: r.entity_id, department_id,
          trang_thai_ap_dung: r.trang_thai_ap_dung, thuoc_tinh_thieu: r.thuoc_tinh_thieu, noi_dung_diagnostic: null,
          filter_run_id: run.id, generate_run_id: null, trang_thai_duyet: "cho_duyet", nguoi_duyet_id: null, ghi_chu_duyet: null,
          created_at: t, updated_at: t,
        } satisfies Diagnostic;
        db.diagnostics.push(d);
      } else {
        Object.assign(d, { trang_thai_ap_dung: r.trang_thai_ap_dung, thuoc_tinh_thieu: r.thuoc_tinh_thieu, filter_run_id: run.id, updated_at: t });
      }
      // Trigger DB: chuyển sang chua_du_thong_tin → thông báo hỏi bổ sung cho người đầu mối
      if (r.trang_thai_ap_dung === "chua_du_thong_tin" && before !== "chua_du_thong_tin") {
        const entity = db.entities.find((e) => e.id === r.entity_id);
        db.notifications.push({
          id: newId("n"), customer_id, diagnostic_id: d.id, department_id: null, giai_doan: "hoi_bo_sung",
          tieu_de: `Cần bổ sung thông tin — ${entity?.ten_entity ?? r.entity_id}`, noi_dung: r.thuoc_tinh_thieu.join(", "),
          da_doc: false, created_at: t,
        } satisfies Notification);
      }
      return d.id;
    });
    return { entity_id: r.entity_id, trang_thai_ap_dung: r.trang_thai_ap_dung, thuoc_tinh_thieu: r.thuoc_tinh_thieu, diagnostic_ids: ids };
  });

  finish(run, { ket_qua } as unknown as Json);
  return { run_id: run.id, ket_qua };
}

/* ---------- generate (AI viết checklist) ---------- */

async function generate({ customer_id, diagnostic_ids }: { customer_id: string; diagnostic_ids?: string[] }) {
  if (!db.customers.some((c) => c.id === customer_id)) throw new PipelineError(404, "Không tìm thấy khách hàng.", "PT404");
  const todo = db.diagnostics.filter(
    (d) =>
      d.customer_id === customer_id &&
      (!diagnostic_ids || diagnostic_ids.includes(d.id)) &&
      (d.trang_thai_ap_dung === "ap_dung" || d.trang_thai_ap_dung === "sap_ap_dung") &&
      !d.noi_dung_diagnostic,
  );
  const run = newRun({ pipeline_name: "generate_diagnostic", chunk_id: null, customer_id, parent_run_id: null, input: { customer_id, diagnostic_ids: todo.map((d) => d.id) } });
  await sleep(900);
  for (const d of todo) {
    const entity = db.entities.find((e) => e.id === d.entity_id);
    // Nội dung GIẢ LẬP (mock không gọi AI) — dựng từ mô tả entity
    d.noi_dung_diagnostic = [`(Mô phỏng) Rà soát việc thực hiện: ${entity?.ten_entity ?? d.entity_id}`, `(Mô phỏng) Đối chiếu với yêu cầu: ${entity?.mo_ta ?? ""}`].join("\n");
    d.generate_run_id = run.id;
    d.updated_at = nowIso();
    db.notifications.push({
      id: newId("n"), customer_id, diagnostic_id: d.id, department_id: null, giai_doan: "cho_duyet",
      tieu_de: `Checklist mới chờ duyệt — ${entity?.ten_entity ?? d.entity_id}`, noi_dung: null, da_doc: false, created_at: nowIso(),
    });
  }
  finish(run, { so_diagnostic: todo.length });
  return { run_id: run.id, so_diagnostic: todo.length };
}

/* ---------- rescan = filter cho từng customer ---------- */

async function rescan() {
  await sleep(600);
  const run_ids = db.customers.map((c) => filterSync(c.id).run_id);
  return { run_ids };
}

export async function postPipeline<P extends keyof PipelineRoutes>(path: P, body: PipelineRoutes[P]["body"]): Promise<PipelineRoutes[P]["res"]> {
  switch (path) {
    case "/api/pipeline/extract":
      return (await extract(body as PipelineRoutes["/api/pipeline/extract"]["body"])) as PipelineRoutes[P]["res"];
    case "/api/pipeline/filter": {
      await sleep(300);
      const b = body as PipelineRoutes["/api/pipeline/filter"]["body"];
      return filterSync(b.customer_id, b.entity_id) as PipelineRoutes[P]["res"];
    }
    case "/api/pipeline/generate":
      return (await generate(body as PipelineRoutes["/api/pipeline/generate"]["body"])) as PipelineRoutes[P]["res"];
    case "/api/pipeline/rescan":
      return (await rescan()) as PipelineRoutes[P]["res"];
  }
  throw new PipelineError(404, "Route không tồn tại.");
}

// Đọc lại run vừa tạo (UI /quet-lai, /nhat-ky) — thật: supabase.from("pipeline_runs").select().in("id", ids)
export function getRunsByIds(ids: string[]) {
  return db.pipelineRuns.filter((r) => ids.includes(r.id)).map((r) => structuredClone(r));
}
