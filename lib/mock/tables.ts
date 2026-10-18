import type { RpcError, RpcResult } from "@/lib/mock/rpc";
import { db, newId, nowIso } from "@/lib/mock/store";
import type { Customer, Department, Entity, Notification, ThuocTinhKhachHang, VanBan, VanBanChunk } from "@/lib/types";

/*
 * Mock các lệnh ghi bảng trực tiếp (không phải RPC) mà UI cần — tương đương
 * supabase.from(...).insert/update(...).select().single() với session người dùng (RLS lo phân quyền).
 * Trả về { data, error } giống supabase-js; lỗi theo mã CONTRACT §6.
 */

const fail = (code: RpcError["code"], message: string) => ({ data: null, error: { code, message } }) as const;
const ok = <T>(data: T) => ({ data, error: null }) as const;
const delay = (ms = 200) => new Promise((r) => setTimeout(r, ms));

/* ---------- Curator sửa entity bản nháp (CONTRACT §3.4) ---------- */

// Chỉ các cột này được sửa khi còn cho_duyet; noi_dung_goc / so_dieu / dieu_khoan không bao giờ sửa được
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

export async function updateEntity(id: string, patch: EntityPatch): Promise<RpcResult<Entity>> {
  await delay();
  const e = db.entities.find((x) => x.id === id);
  if (!e) return fail("PT404", "Không tìm thấy entity.");
  if (e.trang_thai_duyet !== "cho_duyet") return fail("PT409", "Entity đã duyệt/từ chối — không sửa được nữa.");
  if (patch.dieu_kien_may_doc) {
    const tt = db.thuocTinhHoSo.find((t) => t.ma === patch.dieu_kien_may_doc!.thuoc_tinh);
    if (!tt) return fail("PT400", "Thuộc tính trong điều kiện máy đọc không có trong từ điển hồ sơ.");
  }
  Object.assign(e, patch, { updated_at: nowIso() });
  return ok(structuredClone(e));
}

/* ---------- Khách hàng ghi câu trả lời hồ sơ (onboarding + hỏi bổ sung) — CONTRACT §3.1 ---------- */

// DB kiểm tra khi ghi thuoc_tinh: key có trong từ điển, đúng kiểu, nằm trong lua_chon (lỗi PT400). null = "Chưa chắc".
export function validateThuocTinh(patch: ThuocTinhKhachHang): string | null {
  for (const [ma, v] of Object.entries(patch)) {
    const tt = db.thuocTinhHoSo.find((t) => t.ma === ma);
    if (!tt) return `Thuộc tính "${ma}" không có trong từ điển hồ sơ.`;
    if (v === null) continue;
    const okType =
      (tt.kieu === "boolean" && typeof v === "boolean") ||
      (tt.kieu === "number" && typeof v === "number" && Number.isFinite(v)) ||
      (tt.kieu === "text" && typeof v === "string") ||
      (tt.kieu === "text_array" && Array.isArray(v));
    if (!okType) return `"${tt.cau_hoi}" sai kiểu dữ liệu.`;
    if (tt.lua_chon) {
      const values = Array.isArray(v) ? v : [v];
      if (values.some((x) => !tt.lua_chon!.includes(String(x)))) return `"${tt.cau_hoi}" có giá trị ngoài danh sách lựa chọn.`;
    }
  }
  return null;
}

export async function updateCustomerThuocTinh(customerId: string, patch: ThuocTinhKhachHang): Promise<RpcResult<Customer>> {
  await delay();
  const c = db.customers.find((x) => x.id === customerId);
  if (!c) return fail("PT404", "Không tìm thấy khách hàng.");
  const err = validateThuocTinh(patch);
  if (err) return fail("PT400", err);
  c.thuoc_tinh = { ...c.thuoc_tinh, ...patch };
  c.updated_at = nowIso();
  return ok(structuredClone(c));
}

/* ---------- Onboarding: cập nhật customer + tạo phòng ban ---------- */

export type OnboardingInput = Pick<Customer, "ten_cong_ty" | "nganh" | "quy_mo" | "domains" | "thuoc_tinh"> & {
  departments: Pick<Department, "ten_phong_ban" | "slug_phong_ban" | "email_head">[];
};

export async function saveOnboarding(customerId: string, input: OnboardingInput): Promise<RpcResult<{ customer: Customer; departments: Department[] }>> {
  await delay(400);
  const err = validateThuocTinh(input.thuoc_tinh);
  if (err) return fail("PT400", err);
  const names = input.departments.map((d) => d.ten_phong_ban.trim().toLowerCase());
  if (new Set(names).size !== names.length) return fail("23505", "Tên phòng ban bị trùng trong cùng doanh nghiệp.");
  const t = nowIso();
  let c = db.customers.find((x) => x.id === customerId);
  if (!c) {
    c = { id: customerId, created_at: t, updated_at: t, ...input, thuoc_tinh: {} } as Customer;
    db.customers.push(c);
  }
  Object.assign(c, { ten_cong_ty: input.ten_cong_ty, nganh: input.nganh, quy_mo: input.quy_mo, domains: input.domains, thuoc_tinh: input.thuoc_tinh, updated_at: t });
  const departments = input.departments.map((d) => ({ ...d, id: newId("d"), customer_id: customerId, created_at: t }));
  db.departments = [...db.departments.filter((d) => d.customer_id !== customerId), ...departments];
  return ok({ customer: structuredClone(c), departments: structuredClone(departments) });
}

/* ---------- Thông báo: client chỉ được update({ da_doc: true }) — CONTRACT §3.8 ---------- */

export async function markNotificationRead(id: string): Promise<RpcResult<Notification>> {
  await delay(80);
  const n = db.notifications.find((x) => x.id === id);
  if (!n) return fail("PT404", "Không tìm thấy thông báo.");
  n.da_doc = true;
  return ok(structuredClone(n));
}

/* ---------- Curator tạo văn bản (draft) + các chunk ---------- */

export type VanBanInput = Pick<VanBan, "ten_van_ban" | "so_hieu" | "loai_van_ban" | "co_quan_ban_hanh" | "ngay_ban_hanh" | "ngay_hieu_luc" | "domains">;
export type ChunkInput = Pick<VanBanChunk, "tieu_de" | "dieu_khoan_range" | "noi_dung">;

export async function createVanBanWithChunks(vb: VanBanInput, chunks: ChunkInput[]): Promise<RpcResult<{ van_ban: VanBan; chunks: VanBanChunk[] }>> {
  await delay(300);
  if (db.vanBan.some((v) => v.so_hieu.trim().toLowerCase() === vb.so_hieu.trim().toLowerCase()))
    return fail("23505", `Số hiệu "${vb.so_hieu}" đã có trong kho.`);
  const t = nowIso();
  const van_ban: VanBan = { ...vb, id: newId("vb"), trang_thai: "draft", nguoi_tao_id: "u-curator", created_at: t, updated_at: t };
  const created: VanBanChunk[] = chunks.map((c, i) => ({ ...c, id: newId("ch"), van_ban_id: van_ban.id, thu_tu: i + 1, trang_thai: "cho_xu_ly", created_at: t, updated_at: t }));
  db.vanBan.push(van_ban);
  db.chunks.push(...created);
  return ok({ van_ban: structuredClone(van_ban), chunks: structuredClone(created) });
}
