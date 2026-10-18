import { db, newId, nowIso } from "@/lib/mock/store";
import type { Approval, Diagnostic, Entity, Notification } from "@/lib/types";

/*
 * Mock 3 RPC duyệt — CONTRACT.md §5. Cửa DUY NHẤT đổi trang_thai_duyet.
 * Chữ ký + kết quả bám supabase-js: rpc(tên, tham số) → Promise<{ data, error }>.
 * Nối API thật: thay `rpc` bằng `supabase.rpc` (session người dùng, KHÔNG service role) — UI giữ nguyên.
 */

export type RpcError = { code: "PT400" | "PT401" | "PT403" | "PT404" | "PT409" | "23505"; message: string };
export type RpcResult<T> = { data: T; error: null } | { data: null; error: RpcError };

export type RpcFunctions = {
  approve_entity: {
    args: { p_entity_id: string; p_quyet_dinh: "da_duyet" | "tu_choi"; p_ghi_chu?: string };
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

const fail = (code: RpcError["code"], message: string) => ({ data: null, error: { code, message } }) as const;
const ok = <T>(data: T) => ({ data, error: null }) as const;
const delay = () => new Promise((r) => setTimeout(r, 250));

// dieu_kien / nguong bắt buộc có dieu_kien_may_doc khi duyệt (CONTRACT §3.4)
export function thieuDieuKienMayDoc(e: Entity) {
  return (e.loai_entity === "dieu_kien" || e.loai_entity === "nguong") && !e.dieu_kien_may_doc;
}

function recordApproval(p: Omit<Approval, "id" | "created_at" | "nguoi_duyet_id">, nguoiDuyet: string) {
  db.approvals.push({ ...p, id: newId("ap"), nguoi_duyet_id: nguoiDuyet, created_at: nowIso() });
}

// Chunk tự chuyển hoan_tat khi không còn entity cho_duyet
function syncChunkStatus(chunkId: string) {
  const chunk = db.chunks.find((c) => c.id === chunkId);
  if (chunk && !db.entities.some((e) => e.chunk_id === chunkId && e.trang_thai_duyet === "cho_duyet")) {
    chunk.trang_thai = "hoan_tat";
    chunk.updated_at = nowIso();
  }
}

const handlers: { [K in keyof RpcFunctions]: (args: RpcFunctions[K]["args"]) => RpcResult<RpcFunctions[K]["returns"]> } = {
  approve_entity({ p_entity_id, p_quyet_dinh, p_ghi_chu }) {
    const e = db.entities.find((x) => x.id === p_entity_id);
    if (!e) return fail("PT404", "Không tìm thấy entity.");
    if (e.trang_thai_duyet !== "cho_duyet") return fail("PT409", "Entity đã được duyệt hoặc từ chối trước đó.");
    if (p_quyet_dinh === "da_duyet" && thieuDieuKienMayDoc(e))
      return fail("PT400", `"${e.ten_entity}" là ${e.loai_entity === "nguong" ? "ngưỡng" : "điều kiện"} — cần điền điều kiện máy đọc trước khi duyệt.`);
    Object.assign(e, { trang_thai_duyet: p_quyet_dinh, curator_id: "u-curator", updated_at: nowIso() });
    if (p_ghi_chu) e.ghi_chu_curator = p_ghi_chu;
    recordApproval({ entity_id: e.id, diagnostic_id: null, customer_id: null, quyet_dinh: p_quyet_dinh, ghi_chu: p_ghi_chu ?? null }, "u-curator");
    syncChunkStatus(e.chunk_id);
    return ok(structuredClone(e));
  },

  approve_chunk({ p_chunk_id, p_ghi_chu }) {
    if (!db.chunks.some((c) => c.id === p_chunk_id)) return fail("PT404", "Không tìm thấy chunk.");
    const pending = db.entities.filter((e) => e.chunk_id === p_chunk_id && e.trang_thai_duyet === "cho_duyet");
    const missing = pending.filter(thieuDieuKienMayDoc);
    if (missing.length > 0)
      return fail("PT400", `Còn ${missing.length} điều kiện/ngưỡng chưa có điều kiện máy đọc: ${missing.map((e) => e.ten_entity).join("; ")}.`);
    for (const e of pending) {
      Object.assign(e, { trang_thai_duyet: "da_duyet", curator_id: "u-curator", updated_at: nowIso() });
      recordApproval({ entity_id: e.id, diagnostic_id: null, customer_id: null, quyet_dinh: "da_duyet", ghi_chu: p_ghi_chu ?? null }, "u-curator");
    }
    syncChunkStatus(p_chunk_id);
    return ok(pending.length);
  },

  approve_diagnostic({ p_diagnostic_id, p_quyet_dinh, p_department_id, p_ghi_chu }) {
    const d = db.diagnostics.find((x) => x.id === p_diagnostic_id);
    if (!d) return fail("PT404", "Không tìm thấy diagnostic.");
    if (d.trang_thai_duyet !== "cho_duyet") return fail("PT409", "Diagnostic đã được xử lý trước đó.");
    if (p_quyet_dinh === "da_duyet") {
      if (d.trang_thai_ap_dung !== "ap_dung" && d.trang_thai_ap_dung !== "sap_ap_dung")
        return fail("PT400", "Chỉ duyệt được mục đang Áp dụng hoặc Sắp áp dụng.");
      if (!d.noi_dung_diagnostic) return fail("PT400", "Checklist chưa được AI viết xong.");
    }
    if (p_department_id && p_department_id !== d.department_id) {
      const dept = db.departments.find((x) => x.id === p_department_id);
      if (!dept || dept.customer_id !== d.customer_id) return fail("PT400", "Phòng ban không thuộc doanh nghiệp.");
      if (db.diagnostics.some((x) => x.id !== d.id && x.customer_id === d.customer_id && x.entity_id === d.entity_id && x.department_id === p_department_id))
        return fail("23505", "Phòng ban này đã có checklist cho cùng nghĩa vụ.");
      d.department_id = p_department_id;
    }
    Object.assign(d, { trang_thai_duyet: p_quyet_dinh, nguoi_duyet_id: "u-dau-moi", ghi_chu_duyet: p_ghi_chu ?? null, updated_at: nowIso() });
    recordApproval({ entity_id: null, diagnostic_id: d.id, customer_id: d.customer_id, quyet_dinh: p_quyet_dinh, ghi_chu: p_ghi_chu ?? null }, "u-dau-moi");

    // Trigger DB: duyệt → thông báo da_giao cho phòng ban nhận việc
    if (p_quyet_dinh === "da_duyet") {
      const entity = db.entities.find((e) => e.id === d.entity_id);
      const n: Notification = {
        id: newId("n"),
        customer_id: d.customer_id,
        diagnostic_id: d.id,
        department_id: d.department_id,
        giai_doan: "da_giao",
        tieu_de: `Việc cần kiểm tra mới — ${entity?.ten_entity ?? d.entity_id}`,
        noi_dung: null,
        da_doc: false,
        created_at: nowIso(),
      };
      db.notifications.push(n);
    }
    return ok(structuredClone(d));
  },
};

export async function rpc<K extends keyof RpcFunctions>(fn: K, args: RpcFunctions[K]["args"]): Promise<RpcResult<RpcFunctions[K]["returns"]>> {
  await delay();
  return handlers[fn](args);
}
