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

// Mã lỗi theo CONTRACT §6 — route có thể không gửi `code`, khi đó suy từ HTTP status
export function pipelineErrorCode(e: PipelineError) {
  return e.code ?? ({ 400: "PT400", 401: "PT401", 403: "PT403", 404: "PT404", 409: "PT409" } as Record<number, string>)[e.status] ?? String(e.status);
}

export async function postPipeline<P extends keyof PipelineRoutes>(path: P, body: PipelineRoutes[P]["body"]): Promise<PipelineRoutes[P]["res"]> {
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
    // Route chưa được backend triển khai → 404 không có body JSON
    const msg = err.error ?? (res.status === 404 ? `Route ${path} chưa có trên máy chủ (backend đang xây dựng).` : `Lỗi ${res.status}`);
    throw new PipelineError(res.status, msg, err.code);
  }
  return json as PipelineRoutes[P]["res"];
}
