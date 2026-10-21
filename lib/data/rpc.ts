"use client";

import { fromPostgrest, ok, type Result } from "@/lib/data/errors";
import { getSupabase } from "@/lib/supabase/client";
import type { Diagnostic, Entity } from "@/lib/types";

/*
 * 3 RPC duyệt — CONTRACT §5, cửa DUY NHẤT đổi trang_thai_duyet.
 * Gọi supabase.rpc với session người dùng (không service role). Chữ ký giữ nguyên như bản mock.
 */

export type RpcFunctions = {
  approve_entity: {
    // p_ap_dung_moi_doanh_nghiep: bắt buộc true khi duyệt chu_the chưa có dieu_kien_may_doc (migration 005)
    args: { p_entity_id: string; p_quyet_dinh: "da_duyet" | "tu_choi"; p_ghi_chu?: string; p_ap_dung_moi_doanh_nghiep?: boolean };
    returns: Entity;
  };
  approve_chunk: {
    args: { p_chunk_id: string; p_ghi_chu?: string };
    returns: number; // số entity vừa duyệt
  };
  approve_diagnostic: {
    args: { p_diagnostic_id: string; p_quyet_dinh: "da_duyet" | "tu_choi"; p_department_id?: string; p_ghi_chu?: string };
    returns: Diagnostic;
  };
};

export async function rpc<K extends keyof RpcFunctions>(fn: K, args: RpcFunctions[K]["args"]): Promise<Result<RpcFunctions[K]["returns"]>> {
  // Bỏ tham số tuỳ chọn undefined để Postgres dùng giá trị mặc định
  const params = Object.fromEntries(Object.entries(args).filter(([, v]) => v !== undefined));
  const { data, error, status } = await getSupabase().rpc(fn, params);
  if (error) return { data: null, error: fromPostgrest(error, status)! };
  return ok(data as RpcFunctions[K]["returns"]);
}
