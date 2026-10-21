"use client";

import { useCallback } from "react";
import { usePathname, useRouter } from "next/navigation";

import { COPY } from "@/lib/copy";

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
 * Wording mục 5: KHÔNG BAO GIỜ hiện lỗi gốc của hệ thống (tiếng Anh, mã lỗi, câu kỹ thuật từ DB/route) —
 * chỉ hiện câu chuẩn trong lib/copy.ts, chi tiết ghi vào console.
 *  PT401 → về trang đăng nhập · PT403 → ẩn nút · PT409 → tải lại bản ghi · 42501 / 23514 → lỗi lập trình
 *  AI_RATE_LIMIT (429) / AI_ERROR (502) → hệ thống bận, thử lại sau
 */
// Câu hiển thị cho từng mã (thuần, không side effect)
export function describeError(err: AppError): string {
  const S = COPY.state;
  switch (err.code) {
    case "PT401":
      return S.sessionExpired;
    case "PT403":
      return S.forbidden;
    case "PT404":
      return S.notFound;
    case "PT409":
      return S.conflict;
    case "AI_RATE_LIMIT":
    case "AI_ERROR":
      return S.busy;
    default:
      return S.saveError;
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
      // Mọi lỗi khác: giữ chi tiết gốc ở console cho dev, giao diện chỉ hiện câu chuẩn
      else console.warn("[Nexora] Lỗi thao tác", err);
      return describeError(err);
    },
    [router, pathname],
  );
}
