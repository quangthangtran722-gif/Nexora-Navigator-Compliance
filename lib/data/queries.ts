"use client";

import { fail, fromPostgrest, ok, type Result } from "@/lib/data/errors";
import { getSupabase } from "@/lib/supabase/client";
import type {
  Customer,
  Department,
  Diagnostic,
  Entity,
  EntityGraphRow,
  EntityRelationship,
  NerExtractionSummary,
  Notification,
  PipelineRun,
  ThuocTinhHoSo,
  VanBan,
  VanBanChunk,
  VanBanReplacementChain,
} from "@/lib/types";

/*
 * ĐỌC dữ liệu thật — supabase.from(<bảng | view>).select("*") với session người dùng.
 * RLS ở DB quyết định thấy gì (vd khách hàng chỉ thấy entity da_duyet, dữ liệu của mình) — frontend không tự lọc quyền.
 * Mọi hàm trả { data, error } (AppError mã CONTRACT §6).
 */

type Query = PromiseLike<{ data: unknown; error: { code?: string; message: string } | null; status?: number }>;

async function rows<T>(q: Query): Promise<Result<T[]>> {
  const { data, error, status } = await q;
  if (error) return { data: null, error: fromPostgrest(error, status)! };
  return ok((data ?? []) as T[]);
}

async function one<T>(q: Query, notFound: string): Promise<Result<T>> {
  const { data, error, status } = await q;
  if (error) return { data: null, error: fromPostgrest(error, status)! };
  if (!data) return fail("PT404", notFound, 404);
  return ok(data as T);
}

const db = () => getSupabase();

/* ---------- Kho luật ---------- */

export const getVanBanList = () => rows<VanBan>(db().from("van_ban").select("*").order("created_at", { ascending: false }));
export const getChunks = () => rows<VanBanChunk>(db().from("van_ban_chunks").select("*").order("thu_tu"));
export const getEntities = () => rows<Entity>(db().from("entities").select("*"));
export const getRelationships = () => rows<EntityRelationship>(db().from("entity_relationships").select("*"));
export const getThuocTinhHoSo = () => rows<ThuocTinhHoSo>(db().from("thuoc_tinh_ho_so").select("*").order("ma"));

// View entity_graph — mỗi row = 1 cạnh đã join tên 2 đầu (CONTRACT §3.5)
export const getEntityGraph = () => rows<EntityGraphRow>(db().from("entity_graph").select("*"));

// View ner_extraction_summary — 1 row / chunk. count(*) là bigint → có thể về dạng string, ép sang number.
export async function getNerExtractionSummary(): Promise<Result<NerExtractionSummary[]>> {
  const r = await rows<NerExtractionSummary>(db().from("ner_extraction_summary").select("*").order("thu_tu"));
  if (r.error) return r;
  const n = (v: unknown) => Number(v ?? 0);
  return ok(
    r.data.map((s) => ({
      ...s,
      thu_tu: n(s.thu_tu),
      so_entity: n(s.so_entity),
      so_cho_duyet: n(s.so_cho_duyet),
      so_da_duyet: n(s.so_da_duyet),
      so_tu_choi: n(s.so_tu_choi),
      so_dieu_kien_chua_may_doc: n(s.so_dieu_kien_chua_may_doc),
      so_relationship: n(s.so_relationship),
      so_pending_link: n(s.so_pending_link),
    })),
  );
}

// View van_ban_replacement_chain — chuỗi thay thế đệ quy (chưa có màn dùng; để sẵn theo CONTRACT §3.9)
export const getReplacementChain = () => rows<VanBanReplacementChain>(db().from("van_ban_replacement_chain").select("*"));

/* ---------- Khách hàng ---------- */

export const getCustomers = () => rows<Customer>(db().from("customers").select("*").order("ten_cong_ty"));
export const getCustomer = (id: string) => one<Customer>(db().from("customers").select("*").eq("id", id).maybeSingle(), "Không tìm thấy khách hàng.");
export const getDepartments = (customerId: string) =>
  rows<Department>(db().from("departments").select("*").eq("customer_id", customerId).order("created_at"));
export const getDiagnostics = (customerId: string) => rows<Diagnostic>(db().from("diagnostics").select("*").eq("customer_id", customerId));
// Curator đọc diagnostic của mọi khách hàng (CONTRACT §4) — dùng ở màn Quét lại
export const getAllDiagnostics = () => rows<Diagnostic>(db().from("diagnostics").select("*"));
export const getNotifications = (customerId: string) =>
  rows<Notification>(db().from("notifications").select("*").eq("customer_id", customerId).order("created_at", { ascending: false }));

/* ---------- Pipeline ---------- */

export const getPipelineRuns = () => rows<PipelineRun>(db().from("pipeline_runs").select("*").order("created_at", { ascending: false }).limit(500));
export const getRunsByIds = (ids: string[]) => rows<PipelineRun>(db().from("pipeline_runs").select("*").in("id", ids));
