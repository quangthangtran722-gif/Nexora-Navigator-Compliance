import { thieuDieuKienMayDoc } from "@/lib/mock/rpc";
import { db } from "@/lib/mock/store";
import type { EntityGraphRow, NerExtractionSummary } from "@/lib/types";

/*
 * Lớp ĐỌC mock — UI chỉ gọi các hàm này, không đọc thẳng mảng mock.
 * Mỗi hàm ứng với 1 truy vấn Supabase (ghi chú bên cạnh); nối thật chỉ cần thay thân hàm.
 * Ghi dữ liệu: lib/mock/rpc.ts (3 RPC duyệt), lib/mock/tables.ts, lib/mock/pipeline-api.ts.
 */

// Vai trò giả: người đang xem với vai trò khách hàng là đầu mối của Minh Phát (chưa nối auth thật)
export const CURRENT_CUSTOMER_ID = "c-minh-phat";

const clone = <T>(x: T): T => structuredClone(x);

/* ---------- Kho luật ---------- */

export const getVanBanList = () => clone(db.vanBan); // from("van_ban").select()
export const getChunks = () => clone(db.chunks); // from("van_ban_chunks").select()
export const getEntities = () => clone(db.entities); // from("entities").select()
export const getRelationships = () => clone(db.relationships); // from("entity_relationships").select()
export const getThuocTinhHoSo = () => clone(db.thuocTinhHoSo); // from("thuoc_tinh_ho_so").select()

// view entity_graph — mỗi row = 1 cạnh đã join tên 2 đầu
export function getEntityGraph(): EntityGraphRow[] {
  return db.relationships.map((r) => {
    const s = db.entities.find((e) => e.id === r.source_entity_id)!;
    const t = r.target_entity_id ? db.entities.find((e) => e.id === r.target_entity_id) ?? null : null;
    const chunk = db.chunks.find((c) => c.id === r.chunk_id);
    return {
      relationship_id: r.id,
      loai_relationship: r.loai_relationship,
      chunk_id: r.chunk_id,
      van_ban_id: chunk?.van_ban_id ?? "",
      source_id: s.id,
      source_ten: s.ten_entity,
      source_loai: s.loai_entity,
      source_trang_thai_duyet: s.trang_thai_duyet,
      target_id: t?.id ?? null,
      target_ten: t?.ten_entity ?? null,
      target_loai: t?.loai_entity ?? null,
      target_trang_thai_duyet: t?.trang_thai_duyet ?? null,
      target_ref_text: r.target_ref_text,
      is_pending: r.target_entity_id === null,
      can_cu: r.can_cu,
    };
  });
}

// view ner_extraction_summary — 1 row / chunk
export function getNerExtractionSummary(): NerExtractionSummary[] {
  return db.chunks.map((c) => {
    const ents = db.entities.filter((e) => e.chunk_id === c.id);
    const rels = db.relationships.filter((r) => r.chunk_id === c.id);
    const theo_loai: NerExtractionSummary["theo_loai"] = {};
    for (const e of ents) theo_loai[e.loai_entity] = (theo_loai[e.loai_entity] ?? 0) + 1;
    return {
      chunk_id: c.id,
      van_ban_id: c.van_ban_id,
      so_hieu: db.vanBan.find((v) => v.id === c.van_ban_id)?.so_hieu ?? "",
      thu_tu: c.thu_tu,
      dieu_khoan_range: c.dieu_khoan_range,
      trang_thai_chunk: c.trang_thai,
      so_entity: ents.length,
      so_cho_duyet: ents.filter((e) => e.trang_thai_duyet === "cho_duyet").length,
      so_da_duyet: ents.filter((e) => e.trang_thai_duyet === "da_duyet").length,
      so_tu_choi: ents.filter((e) => e.trang_thai_duyet === "tu_choi").length,
      so_dieu_kien_chua_may_doc: ents.filter((e) => e.trang_thai_duyet === "cho_duyet" && thieuDieuKienMayDoc(e)).length,
      theo_loai,
      so_relationship: rels.length,
      so_pending_link: rels.filter((r) => r.target_entity_id === null).length,
    };
  });
}

/* ---------- Khách hàng ---------- */

export const getCustomers = () => clone(db.customers); // from("customers").select() — curator thấy tất cả
export const getCustomer = (id: string) => clone(db.customers.find((c) => c.id === id)!); // RLS: khách hàng chỉ thấy của mình
export const getDepartments = (customerId: string) => clone(db.departments.filter((d) => d.customer_id === customerId));
export const getAllDepartments = () => clone(db.departments);
export const getDiagnostics = (customerId: string) => clone(db.diagnostics.filter((d) => d.customer_id === customerId));

// Mới nhất trước
export const getNotifications = (customerId: string) =>
  clone(db.notifications.filter((n) => n.customer_id === customerId).sort((a, b) => b.created_at.localeCompare(a.created_at)));

export const getPipelineRuns = () => clone([...db.pipelineRuns].sort((a, b) => b.created_at.localeCompare(a.created_at)));
