"use client";

import { getSupabase } from "@/lib/supabase/client";
import type { TrangThaiApDung } from "@/lib/types";

/*
 * 4 route pipeline — CONTRACT §7. Gọi fetch tới Next.js route của backend, kèm session người dùng
 * (Authorization: Bearer <access_token>). Route ghi 1 row pipeline_runs và trả run_id.
 * Lỗi: body { error, code? } + HTTP status (§6) → ném PipelineError.
 * Lọc áp dụng (rule engine) chạy Ở BACKEND (/filter) — frontend không tự tính trạng thái áp dụng.
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

// Mã lỗi theo CONTRACT §6–7 — route có thể không gửi `code`, khi đó suy từ HTTP status.
// Riêng route pipeline: 429 AI_RATE_LIMIT (Groq hết quota) · 502 AI_ERROR (Groq lỗi) · 409 PT409 (chunk đang chạy / đã có entity)
export function pipelineErrorCode(e: PipelineError) {
  return (
    e.code ??
    ({ 400: "PT400", 401: "PT401", 403: "PT403", 404: "PT404", 409: "PT409", 429: "AI_RATE_LIMIT", 502: "AI_ERROR" } as Record<number, string>)[e.status] ??
    String(e.status)
  );
}

// PipelineError → AppError để dùng chung bộ map lỗi (useErrorHandler / describeError)
export const toAppError = (e: PipelineError) => ({ code: pipelineErrorCode(e), message: e.error, status: e.status });

export async function postPipeline<P extends keyof PipelineRoutes>(path: P, body: PipelineRoutes[P]["body"]): Promise<PipelineRoutes[P]["res"]> {
  // JWT của người dùng (KHÔNG phải service role key). getSession tự làm mới token sắp hết hạn.
  const { data } = await getSupabase().auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new PipelineError(401, "Chưa đăng nhập.", "PT401");

  let res: Response;
  try {
    res = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    });
  } catch {
    throw new PipelineError(0, "Không kết nối được tới máy chủ.");
  }

  const json = await res.json().catch(() => null);
  if (!res.ok) {
    const err = (json ?? {}) as { error?: string; code?: string };
    throw new PipelineError(res.status, err.error ?? `Lỗi ${res.status}`, err.code);
  }
  return json as PipelineRoutes[P]["res"];
}

/* ---------- Luồng ghép (CONTRACT §7 — ghi chú triển khai) ---------- */

const GENERATE_MAX_ROUNDS = 10; // chặn vòng lặp vô hạn nếu route trả sai

// generate xử lý tối đa 6 diagnostic/lần → gọi lại tới khi so_diagnostic = 0.
// so_diagnostic = số mục AI viết thành công; mục bị code loại vẫn null nên vòng lặp luôn dừng.
export async function generateAll(
  body: PipelineRoutes["/api/pipeline/generate"]["body"],
  onRound?: (round: number, written: number) => void,
): Promise<{ so_diagnostic: number; run_ids: string[] }> {
  let total = 0;
  const run_ids: string[] = [];
  for (let round = 1; round <= GENERATE_MAX_ROUNDS; round++) {
    const res = await postPipeline("/api/pipeline/generate", body);
    run_ids.push(res.run_id);
    total += res.so_diagnostic;
    onRound?.(round, total);
    if (res.so_diagnostic === 0) break;
  }
  return { so_diagnostic: total, run_ids };
}

// filter KHÔNG tự gọi generate → frontend gọi generate khi có mục ap_dung / sap_ap_dung.
// ket_qua = [] khi chưa có entity hanh_vi nào được duyệt — trạng thái hợp lệ, không phải lỗi.
export async function filterThenGenerate(body: PipelineRoutes["/api/pipeline/filter"]["body"]) {
  const filter = await postPipeline("/api/pipeline/filter", body);
  const canViet = filter.ket_qua.filter((k) => k.trang_thai_ap_dung === "ap_dung" || k.trang_thai_ap_dung === "sap_ap_dung");
  const diagnostic_ids = canViet.flatMap((k) => k.diagnostic_ids);
  // Chỉ viết cho các diagnostic vừa lọc (khi lọc riêng 1 entity), hoặc mọi mục chờ của khách hàng (khi lọc toàn bộ)
  const generate =
    diagnostic_ids.length > 0
      ? await generateAll({ customer_id: body.customer_id, ...(body.entity_id ? { diagnostic_ids } : {}) })
      : { so_diagnostic: 0, run_ids: [] };
  return { filter, generate };
}
