"use client";

import { fail, fromPostgrest, ok, type Result } from "@/lib/data/errors";
import { getSupabase } from "@/lib/supabase/client";
import type { Customer, Department, Entity, Notification, ThuocTinhKhachHang, VanBan, VanBanChunk } from "@/lib/types";

/*
 * GHI bảng trực tiếp (không phải RPC) — supabase.from(...).insert/update/upsert với session người dùng.
 * Chữ ký + kết quả { data, error } giữ nguyên như bản mock trước đây để call site không đổi.
 * Kiểm tra nghiệp vụ (thuoc_tinh đúng kiểu, entity đã khoá, trùng tên…) do DB làm và trả mã CONTRACT §6.
 * Không có lệnh DELETE nào — CONTRACT §4: không ai xoá được dữ liệu.
 */

const db = () => getSupabase();

/* ---------- Curator sửa entity bản nháp (CONTRACT §3.4) ---------- */

// Chỉ các cột này được sửa khi còn cho_duyet (đã duyệt/từ chối → PT409); noi_dung_goc / so_dieu / dieu_khoan không bao giờ sửa được
export type EntityPatch = Partial<
  Pick<
    Entity,
    | "ten_entity"
    | "loai_entity"
    | "mo_ta"
    | "domain"
    | "primary_departments"
    | "secondary_departments"
    | "ngay_co_hieu_luc"
    | "dieu_kien_may_doc"
    | "ghi_chu_curator"
  >
>;

export async function updateEntity(id: string, patch: EntityPatch): Promise<Result<Entity>> {
  const { data, error, status } = await db().from("entities").update(patch).eq("id", id).select("*").maybeSingle();
  if (error) return { data: null, error: fromPostgrest(error, status)! };
  if (!data) return fail("PT404", "Không tìm thấy entity.", 404);
  return ok(data as Entity);
}

/* ---------- Khách hàng ghi câu trả lời hồ sơ (onboarding + hỏi bổ sung) — CONTRACT §3.1 ---------- */

// Gộp vào thuoc_tinh hiện có (jsonb ghi đè cả cột). null = "Chưa chắc" — vẫn ghi key. DB kiểm tra kiểu/lua_chon (PT400).
export async function updateCustomerThuocTinh(customerId: string, patch: ThuocTinhKhachHang): Promise<Result<Customer>> {
  const cur = await db().from("customers").select("thuoc_tinh").eq("id", customerId).maybeSingle();
  if (cur.error) return { data: null, error: fromPostgrest(cur.error, cur.status)! };
  if (!cur.data) return fail("PT404", "Không tìm thấy khách hàng.", 404);
  const thuoc_tinh = { ...((cur.data as Pick<Customer, "thuoc_tinh">).thuoc_tinh ?? {}), ...patch };
  const { data, error, status } = await db().from("customers").update({ thuoc_tinh }).eq("id", customerId).select("*").maybeSingle();
  if (error) return { data: null, error: fromPostgrest(error, status)! };
  if (!data) return fail("PT404", "Không tìm thấy khách hàng.", 404);
  return ok(data as Customer);
}

/* ---------- Onboarding: cập nhật customer + phòng ban ---------- */

export type OnboardingInput = Pick<Customer, "ten_cong_ty" | "nganh" | "quy_mo" | "domains" | "thuoc_tinh"> & {
  departments: Pick<Department, "ten_phong_ban" | "slug_phong_ban" | "email_head">[];
};

// Phòng ban: upsert theo (customer_id, ten_phong_ban) — tên UNIQUE trong 1 customer; không xoá phòng cũ (không có DELETE)
export async function saveOnboarding(customerId: string, input: OnboardingInput): Promise<Result<{ customer: Customer; departments: Department[] }>> {
  const { departments, ...customerFields } = input;
  const c = await db().from("customers").update(customerFields).eq("id", customerId).select("*").maybeSingle();
  if (c.error) return { data: null, error: fromPostgrest(c.error, c.status)! };
  if (!c.data) return fail("PT404", "Không tìm thấy hồ sơ khách hàng của tài khoản này.", 404);

  const d = await db()
    .from("departments")
    .upsert(departments.map((x) => ({ ...x, customer_id: customerId })), { onConflict: "customer_id,ten_phong_ban" })
    .select("*");
  if (d.error) return { data: null, error: fromPostgrest(d.error, d.status)! };
  return ok({ customer: c.data as Customer, departments: (d.data ?? []) as Department[] });
}

/* ---------- Thông báo: client chỉ được update({ da_doc: true }) — CONTRACT §3.8 ---------- */

export async function markNotificationRead(id: string): Promise<Result<Notification>> {
  const { data, error, status } = await db().from("notifications").update({ da_doc: true }).eq("id", id).select("*").maybeSingle();
  if (error) return { data: null, error: fromPostgrest(error, status)! };
  if (!data) return fail("PT404", "Không tìm thấy thông báo.", 404);
  return ok(data as Notification);
}

/* ---------- Curator tạo văn bản (draft) + các chunk ---------- */

export type VanBanInput = Pick<VanBan, "ten_van_ban" | "so_hieu" | "loai_van_ban" | "co_quan_ban_hanh" | "ngay_ban_hanh" | "ngay_hieu_luc" | "domains">;
export type ChunkInput = Pick<VanBanChunk, "tieu_de" | "dieu_khoan_range" | "noi_dung">;

export async function createVanBanWithChunks(vb: VanBanInput, chunks: ChunkInput[]): Promise<Result<{ van_ban: VanBan; chunks: VanBanChunk[] }>> {
  const v = await db().from("van_ban").insert({ ...vb, trang_thai: "draft" }).select("*").single();
  if (v.error) return { data: null, error: fromPostgrest(v.error, v.status)! };
  const van_ban = v.data as VanBan;

  const c = await db()
    .from("van_ban_chunks")
    .insert(chunks.map((x, i) => ({ ...x, van_ban_id: van_ban.id, thu_tu: i + 1, trang_thai: "cho_xu_ly" })))
    .select("*")
    .order("thu_tu");
  // Không xoá được van_ban vừa tạo nếu chunk lỗi (không có DELETE) → báo lỗi, văn bản draft vẫn còn để thêm chunk lại
  if (c.error) return { data: null, error: fromPostgrest(c.error, c.status)! };
  return ok({ van_ban, chunks: (c.data ?? []) as VanBanChunk[] });
}

/* ---------- Kích hoạt văn bản (draft → active) ---------- */
// Rule engine chỉ đọc entity của văn bản active (CONTRACT §7). Curator bấm tay — không tự kích hoạt.
// RLS van_ban_update: chỉ curator. Chỉ đổi văn bản đang draft để không ghi đè trạng thái replaced.
export async function activateVanBan(id: string): Promise<Result<VanBan>> {
  const { data, error, status } = await db().from("van_ban").update({ trang_thai: "active" }).eq("id", id).eq("trang_thai", "draft").select("*").maybeSingle();
  if (error) return { data: null, error: fromPostgrest(error, status)! };
  if (!data) return fail("PT409", "Văn bản không còn ở trạng thái Bản nháp — đã được kích hoạt trước đó.", 409);
  return ok(data as VanBan);
}
