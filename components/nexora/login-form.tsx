"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { LogIn } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/nexora/form-field";
import { HOME_BY_ROLE, useAuth } from "@/lib/auth/auth-provider";
import { AUTH, COPY } from "@/lib/copy";
import { getSupabase } from "@/lib/supabase/client";

// Đăng nhập email + mật khẩu (Supabase Auth). Tài khoản + vai trò do quản trị Nexora tạo.
export function LoginForm() {
  const router = useRouter();
  const next = useSearchParams().get("next");
  const { session, role, loading } = useAuth();
  const [email, setEmail] = useState("");
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
      setError(err.message === "Invalid login credentials" ? "Email hoặc mật khẩu không đúng." : "Chưa đăng nhập được. Vui lòng thử lại.");
    }
  }

  return (
    <form onSubmit={submit} className="w-full max-w-sm">
      <Card>
        <CardHeader>
          {/* Logo đã cắt sát (public/logo-nexora.png, 900×360) */}
          <Image src="/logo-nexora.png" alt="Nexora Compliance Navigator" width={900} height={360} priority sizes="240px" className="mx-auto h-auto w-60" />
          <p className="text-center text-sm text-muted-foreground">Theo dõi liên tục nghĩa vụ thuế &amp; kế toán cho doanh nghiệp</p>
          <CardTitle className="pt-4 text-xl font-bold">{COPY.page.login.title}</CardTitle>
          <CardDescription>Dùng tài khoản Nexora đã cấp cho bạn.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <FormField id="email" label="Email">
            <Input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </FormField>
          <FormField id="password" label="Mật khẩu">
            <Input id="password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </FormField>
          {error && (
            <p className="bg-brand-red-bg px-3 py-2 text-sm text-destructive" role="alert">
              {error}
            </p>
          )}
          {session && !role && !loading && (
            <p className="text-sm text-status-ap-dung" role="status">
              Tài khoản chưa được cấp quyền sử dụng. Vui lòng liên hệ Nexora.
            </p>
          )}
        </CardContent>
        <CardFooter className="flex-col gap-3">
          <Button type="submit" className="w-full" disabled={busy}>
            <LogIn /> {busy ? "Đang đăng nhập…" : "Đăng nhập"}
          </Button>
          <p className="text-sm">
            <span className="text-muted-foreground">{AUTH.login.chuaCoTk} </span>
            <Link href="/dang-ky" className="font-medium text-gold-text underline-offset-4 hover:underline">
              {AUTH.login.linkDangKy}
            </Link>
          </p>
        </CardFooter>
      </Card>
    </form>
  );
}
