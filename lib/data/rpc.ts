"use client";

import { fromPostgrest, ok, type Result } from "@/lib/data/errors";
import { getSupabase } from "@/lib/supabase/client";
import type { Diagnostic, Entity, EntityRelationship } from "@/lib/types";

/*
 * 4 RPC duyệt — CONTRACT §5 (+ approve_relationship, 008), cửa DUY NHẤT đổi trang_thai_duyet.
 * Gọi supabase.rpc với session người dùng (không service role). Chữ ký giữ nguyên như bản mock.
 */

export type RpcFunctions = {
  approve_entity: {
    // 007: bỏ p_ap_dung_moi_doanh_nghiep. Hàm KIỂM pham_vi / mã / cờ (entity_du_dieu_kien_duyet), không tự suy.
    // 008: cạnh LLM chưa bị sửa có nguồn là entity chuyển trạng thái theo.
    args: { p_entity_id: string; p_quyet_dinh: "da_duyet" | "tu_choi"; p_ghi_chu?: string };
    returns: Entity;
  };
  approve_relationship: {
    // 008: cạnh do người thêm / đã sửa. Người duyệt ≠ người tạo, ≠ người sửa cuối (DB trả PT403).
    args: { p_relationship_id: string; p_quyet_dinh: "da_duyet" | "tu_choi"; p_ghi_chu?: string };
    returns: EntityRelationship;
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
