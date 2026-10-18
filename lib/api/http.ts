// Helper chung cho route /api/pipeline/* — shape lỗi theo docs/CONTRACT.md §6–7: { error, code? }.

import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly code?: string,
  ) {
    super(message);
  }
}

// SQLSTATE → HTTP, khớp bảng mã lỗi CONTRACT.md §6
const STATUS_BY_CODE: Record<string, number> = {
  PT400: 400,
  PT401: 401,
  PT403: 403,
  PT404: 404,
  PT409: 409,
  "42501": 403,
  "23505": 409,
  "23514": 400,
};

type PostgrestLikeError = { code?: string; message: string };

// Lỗi từ supabase-js → ApiError giữ nguyên code để frontend xử lý như khi gọi PostgREST trực tiếp
export function fromDb(error: PostgrestLikeError): ApiError {
  const code = error.code ?? undefined;
  return new ApiError(code ? (STATUS_BY_CODE[code] ?? 500) : 500, error.message, code);
}

export function errorResponse(err: unknown): Response {
  if (err instanceof ApiError) {
    return Response.json({ error: err.message, ...(err.code ? { code: err.code } : {}) }, { status: err.status });
  }
  console.error(err);
  return Response.json({ error: "Lỗi máy chủ" }, { status: 500 });
}

export async function readJson(request: Request): Promise<Record<string, unknown>> {
  try {
    const body: unknown = await request.json();
    if (body !== null && typeof body === "object" && !Array.isArray(body)) return body as Record<string, unknown>;
  } catch {
    // rơi xuống lỗi bên dưới
  }
  throw new ApiError(400, "Body phải là JSON object", "PT400");
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function requireUuid(value: unknown, field: string): string {
  if (typeof value !== "string" || !UUID.test(value)) {
    throw new ApiError(400, `${field} phải là uuid`, "PT400");
  }
  return value;
}

export function optionalUuidArray(value: unknown, field: string): string[] | undefined {
  if (value === undefined) return undefined;
  if (!Array.isArray(value)) throw new ApiError(400, `${field} phải là mảng uuid`, "PT400");
  return value.map((v, i) => requireUuid(v, `${field}[${i}]`));
}

export type NexoraRole = "curator" | "customer";

export type Caller = {
  supabase: SupabaseClient;
  user: User;
  role: NexoraRole | null;
  customerId: string | null;
};

// Client mang JWT của người gọi → mọi truy vấn chịu RLS như khi frontend gọi thẳng Supabase.
// Route KHÔNG dùng service role: quyền tách ở tầng DB (CLAUDE.md mục 10), và function duyệt
// từ chối service role nên route không có cách nào tự duyệt.
export async function getCaller(request: Request): Promise<Caller> {
  const header = request.headers.get("authorization") ?? "";
  const token = header.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) throw new ApiError(401, "Thiếu header Authorization: Bearer <access_token>", "PT401");

  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) throw new ApiError(401, "Phiên đăng nhập không hợp lệ hoặc đã hết hạn", "PT401");

  const meta = data.user.app_metadata ?? {};
  const role = meta.nexora_role === "curator" || meta.nexora_role === "customer" ? meta.nexora_role : null;
  const customerId = typeof meta.customer_id === "string" ? meta.customer_id : null;
  return { supabase, user: data.user, role, customerId };
}

export function requireCurator(caller: Caller): void {
  if (caller.role !== "curator") throw new ApiError(403, "Chỉ curator được chạy bước này", "PT403");
}

// Khách hàng chỉ chạy cho chính mình; curator chạy cho mọi khách hàng (nút "Quét lại")
export function requireCustomerAccess(caller: Caller, customerId: string): void {
  if (caller.role === "curator") return;
  if (caller.role === "customer" && caller.customerId === customerId) return;
  throw new ApiError(403, "Không có quyền với khách hàng này", "PT403");
}
