"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { LogIn } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AuthCard } from "@/components/nexora/auth-card";
import { FormField } from "@/components/nexora/form-field";
import { HOME_BY_ROLE, useAuth } from "@/lib/auth/auth-provider";
import { AUTH } from "@/lib/copy";
import { getSupabase } from "@/lib/supabase/client";

/*
 * Đăng nhập email + mật khẩu (Supabase Auth) — brief mục 5.10, palette v4 mục 9: thẻ vuông giữa nền background,
 * logo đầy đủ ~240px + câu giới thiệu, nút "Đăng nhập" bg-gold-metal (variant mặc định). Bản tối dùng token card/border.
 * Tài khoản chưa gắn doanh nghiệp (vừa đăng ký) → /onboarding để thiết lập hồ sơ.
 */
const L = AUTH.login;

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next");
  const { session, role, loading } = useAuth();
  const [email, setEmail] = useState(() => params.get("email") ?? ""); // từ link "Đăng nhập bằng email này" ở trang đăng ký
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Đã có session → chuyển về trang được yêu cầu hoặc trang đầu của vai trò
  useEffect(() => {
    if (!loading && session) router.replace(next && next.startsWith("/") ? next : role ? HOME_BY_ROLE[role] : "/onboarding"); // chưa gắn doanh nghiệp → đăng ký
  }, [loading, session, role, next, router]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error: err } = await getSupabase().auth.signInWithPassword({ email: email.trim(), password });
    setBusy(false);
    if (err) {
      // Không hiện lỗi gốc (tiếng Anh) — wording mục 5; chi tiết ở console
      console.warn("[Nexora] Đăng nhập thất bại", err);
      setError(err.message === "Invalid login credentials" ? L.sai : L.loi);
    }
  }

  return (
    <AuthCard
      title={L.title}
      description={L.moTa}
      footer={
        <>
          <span className="text-muted-foreground">{L.chuaCoTk} </span>
          <Link href="/dang-ky" className="font-medium whitespace-nowrap text-gold-text underline-offset-4 hover:underline">
            {L.linkDangKy}
          </Link>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-4">
        <FormField id="email" label={AUTH.email}>
          <Input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </FormField>
        <FormField id="password" label={AUTH.matKhau}>
          <Input id="password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </FormField>
        {error && (
          <p className="bg-brand-red-bg px-3 py-2 text-sm text-destructive" role="alert">
            {error}
          </p>
        )}
        {/* Nút chính: bg-gold-metal (variant mặc định của Button) */}
        <Button type="submit" size="lg" className="w-full" disabled={busy}>
          <LogIn /> {busy ? L.dangGui : L.nut}
        </Button>
      </form>
    </AuthCard>
  );
}
