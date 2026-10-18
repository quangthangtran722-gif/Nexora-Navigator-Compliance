"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/*
 * Browser client — dùng SESSION NGƯỜI DÙNG (anon key + JWT đăng nhập). RLS ở DB lo phân quyền.
 * TUYỆT ĐỐI không dùng service role ở frontend (CONTRACT §5: sẽ bị 401).
 * Chưa sinh type từ DB → các hàm trong lib/data ép kiểu kết quả về type của lib/types.ts (khớp CONTRACT).
 */

let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (client) return client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error("Thiếu NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY — xem .env.local.example");
  }
  client = createClient(url, anonKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
  });
  return client;
}
