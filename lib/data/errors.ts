"use client";

import { useCallback } from "react";
import { usePathname, useRouter } from "next/navigation";

/*
 * Lỗi chuẩn hoá cho mọi lệnh đọc/ghi/RPC/route — mã theo CONTRACT §6.
 * Mọi hàm trong lib/data trả { data, error } với error dạng AppError (giống supabase-js).
 */

export type AppError = { code: string; message: string; status?: number };
export type Result<T> = { data: T; error: null } | { data: null; error: AppError };

export const ok = <T>(data: T): Result<T> => ({ data, error: null });
export const fail = (code: string, message: string, status?: number): Result<never> => ({ data: null, error: { code, message, status } });

// PostgrestError { code, message, details, hint } → AppError
export function fromPostgrest(e: { code?: string; message: string } | null, status?: number): AppError | null {
  if (!e) return null;
  return { code: e.code ?? (status ? String(status) : "UNKNOWN"), message: e.message, status };
}

// Gộp nhiều Result thành 1 (dùng khi 1 màn cần đọc nhiều bảng cùng lúc)
export async function combine<T extends Record<string, Promise<Result<unknown>>>>(
  parts: T,
): Promise<Result<{ [K in keyof T]: T[K] extends Promise<Result<infer U>> ? U : never }>> {
  const keys = Object.keys(parts) as (keyof T)[];
  const results = await Promise.all(keys.map((k) => parts[k]));
  const out = {} as { [K in keyof T]: T[K] extends Promise<Result<infer U>> ? U : never };
  for (let i = 0; i < keys.length; i++) {
    const r = results[i];
    if (r.error) return { data: null, error: r.error };
    (out as Record<keyof T, unknown>)[keys[i]] = r.data;
  }
  return ok(out);
}

/*
 * Map mã lỗi CONTRACT §6–7 ra hành vi UI. Trả về câu hiển thị (null = không có lỗi).
 *  PT400 → hiện message tiếng Việt từ DB · PT401 → về trang đăng nhập · PT403 → ẩn nút
 *  PT404 → không tìm thấy · PT409 → tải lại bản ghi · 42501 / 23514 → lỗi lập trình, ghi log
 *  AI_RATE_LIMIT (429) → Groq hết quota, thử lại sau · AI_ERROR (502) → lỗi AI
 */
// Câu hiển thị cho từng mã (thuần, không side effect)
export function describeError(err: AppError): string {
  switch (err.code) {
    case "PT400":
    case "23505":
      return err.message;
    case "PT401":
      return "Phiên đăng nhập đã hết hạn — đang chuyển sang trang đăng nhập.";
    case "PT403":
      return "Tài khoản của bạn không có quyền thực hiện thao tác này.";
    case "PT404":
      return "Không tìm thấy bản ghi (có thể đã bị thay đổi hoặc không thuộc quyền xem của bạn).";
    case "PT409":
      // Route/DB gửi lý do cụ thể (vd "Chunk đã có 11 entity, không trích xuất lại") — ưu tiên hiện lý do đó
      return err.message ? `${err.message} — đã tải lại dữ liệu mới nhất.` : "Bản ghi đã được xử lý trước đó — đã tải lại dữ liệu mới nhất.";
    case "AI_RATE_LIMIT":
      return "AI đang tạm hết lượt (giới hạn 8K token/phút). Đợi khoảng 1 phút rồi thử lại.";
    case "AI_ERROR":
      return `Gọi AI thất bại — thử lại sau. ${err.message ? `(${err.message})` : ""}`.trim();
    case "42501":
    case "23514":
      return "Lỗi hệ thống (đã ghi log để sửa).";
    default:
      return err.message || "Đã có lỗi xảy ra.";
  }
}

export function useErrorHandler() {
  const router = useRouter();
  const pathname = usePathname();

  return useCallback(
    (err: AppError | null, opts: { onReload?: () => void; onForbidden?: () => void } = {}): string | null => {
      if (!err) return null;
      if (err.code === "PT401") router.replace(`/login?next=${encodeURIComponent(pathname)}`);
      if (err.code === "PT403") opts.onForbidden?.();
      if (err.code === "PT409") opts.onReload?.();
      // Lỗi lập trình (RLS/GRANT chặn, vi phạm CHECK) — không nên xảy ra, cần sửa code
      if (err.code === "42501" || err.code === "23514") console.error("[Nexora] Lỗi lập trình", err);
      return describeError(err);
    },
    [router, pathname],
  );
}
