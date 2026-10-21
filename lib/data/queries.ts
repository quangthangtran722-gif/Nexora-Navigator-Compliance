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
  Nganh,
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
// §3.10: chỉ cần mã + tên để tra nhãn ngành
export const getNganh = () => rows<Pick<Nganh, "ma" | "ten_hien_thi">>(db().from("nganh").select("ma, ten_hien_thi"));

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
      so_can_dieu_kien: n(s.so_can_dieu_kien ?? s.so_dieu_kien_chua_may_doc), // DB chưa chạy 005 → chỉ có cột cũ
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

/* ---------- Lý do đối chiếu ("Vì sao áp dụng cho công ty bạn") ---------- */
// Mỗi lần lọc ghi ket_qua (lý do + điều kiện đã xét) vào pipeline_runs.output (CONTRACT §7).
// RLS pipeline_runs_select: tài khoản doanh nghiệp đọc được lần chạy của chính công ty mình.
export type LyDoDoiChieu = {
  entity_id: string;
  trang_thai_ap_dung: string;
  ly_do?: string; // ngoai_linh_vuc | dieu_kien_khong_thoa | thieu_thong_tin | chua_den_ngay_hieu_luc | da_hieu_luc
  ngay_hieu_luc?: string | null;
  dieu_kien?: { ten_entity: string; dieu_kien_may_doc: { thuoc_tinh: string }; gia_tri_khach_hang?: unknown; ket_qua: boolean | null }[];
};

// Lấy lý do MỚI NHẤT cho từng nghĩa vụ (lần lọc riêng 1 mục cũng tính) — map entity_id → lý do
export async function getLyDoDoiChieu(customerId: string): Promise<Result<Record<string, LyDoDoiChieu>>> {
  const { data, error, status } = await db()
    .from("pipeline_runs")
    .select("output, created_at")
    .eq("customer_id", customerId)
    .eq("pipeline_name", "filter_domain")
    .eq("trang_thai", "hoan_tat")
    .order("created_at", { ascending: false })
    .limit(30);
  if (error) return { data: null, error: fromPostgrest(error, status)! };
  const map: Record<string, LyDoDoiChieu> = {};
  for (const run of data ?? []) {
    const ketQua = ((run.output as { ket_qua?: LyDoDoiChieu[] } | null)?.ket_qua ?? []) as LyDoDoiChieu[];
    for (const k of ketQua) if (!map[k.entity_id]) map[k.entity_id] = k; // run mới nhất đứng trước
  }
  return ok(map);
}
