// Client service role — CHỈ dùng ở /api/onboard để quét ngược cho doanh nghiệp VỪA tạo khi người gọi là tài khoản
// mới đăng ký: JWT của họ được cấp trước lúc onboard_customer gắn app_metadata.customer_id, nên dưới RLS họ chưa
// thấy chính doanh nghiệp mình cho tới khi refresh session. Quét = rule engine thuần (filterDomain) với
// customer_id cố định; filterDomain tự lọc da_duyet + văn bản active nên kết quả giống hệt khi chạy dưới RLS.
// Không duyệt được gì: approve_* từ chối service role (auth.uid() null).

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export function adminClient(): SupabaseClient | null {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) return null;
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
