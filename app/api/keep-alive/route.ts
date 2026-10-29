// GET /api/keep-alive — Vercel Cron gọi mỗi ngày (vercel.json) để Supabase free tier không tự pause sau 7 ngày
// không hoạt động (CLAUDE.md mục 2). 1 truy vấn đọc nhẹ, không ghi gì, không trả dữ liệu.
// Có CRON_SECRET trên Vercel thì Vercel Cron tự gửi "Authorization: Bearer <CRON_SECRET>" → chỉ nhận đúng header đó.
import { adminClient } from "@/lib/api/admin";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ error: "Không có quyền", code: "PT401" }, { status: 401 });
  }
  const supabase = adminClient();
  if (!supabase) return Response.json({ error: "Thiếu SUPABASE_SERVICE_ROLE_KEY" }, { status: 500 });

  const t0 = Date.now();
  const { error } = await supabase.from("van_ban").select("id", { count: "exact", head: true });
  if (error) return Response.json({ ok: false, error: error.message }, { status: 503 });
  return Response.json({ ok: true, ms: Date.now() - t0, at: new Date().toISOString() });
}
