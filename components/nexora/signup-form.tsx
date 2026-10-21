"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MailCheck, UserPlus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AuthCard } from "@/components/nexora/auth-card";
import { FormField } from "@/components/nexora/form-field";
import { useAuth } from "@/lib/auth/auth-provider";
import { AUTH } from "@/lib/copy";
import { getSupabase } from "@/lib/supabase/client";

/*
 * Đăng ký doanh nghiệp — bước 1: tạo tài khoản (Supabase Auth signUp, anon key; KHÔNG service role).
 * Tài khoản mới chưa có vai trò → sau khi có phiên, chuyển tới /onboarding để "Thiết lập hồ sơ doanh nghiệp"
 * (POST /api/onboard gắn tài khoản với doanh nghiệp — CONTRACT §8).
 * Dự án bật xác nhận email → signUp không trả session: hiện "Kiểm tra hộp thư", người dùng xác nhận rồi đăng nhập.
 */

const D = AUTH.dangKy;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function SignupForm() {
  const router = useRouter();
  const { session, role, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [matKhau, setMatKhau] = useState("");
  const [nhapLai, setNhapLai] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [choXacNhan, setChoXacNhan] = useState<string | null>(null);
  const [daTonTai, setDaTonTai] = useState(false); // email đã có tài khoản → hiện link Đăng nhập ngay trong lỗi

  // Đã có phiên: chưa gắn doanh nghiệp → thiết lập hồ sơ; đã có vai trò → trang chính (đăng nhập form login lo)
  useEffect(() => {
    if (!loading && session) router.replace(role ? "/" : "/onboarding");
  }, [loading, session, role, router]);

  function kiemTra() {
    const e: Record<string, string> = {};
    if (!EMAIL_RE.test(email.trim())) e.email = D.loi.email;
    if (matKhau.length < 8) e.matKhau = D.loi.matKhauNgan;
    if (nhapLai !== matKhau) e.nhapLai = D.loi.khongKhop;
    return e;
  }

  async function submit(ev: React.FormEvent) {
    ev.preventDefault();
    const e = kiemTra();
    setErrors(e);
    setDaTonTai(false);
    if (Object.keys(e).length) return;
    setBusy(true);
    const { data, error } = await getSupabase().auth.signUp({
      email: email.trim(),
      password: matKhau,
      // Liên kết trong email xác nhận đưa thẳng về bước thiết lập hồ sơ
      options: { emailRedirectTo: `${window.location.origin}/onboarding` },
    });
    setBusy(false);
    if (error) {
      // Không hiện lỗi gốc (tiếng Anh) — wording mục 5; chi tiết ở console
      console.warn("[Nexora] Đăng ký thất bại", error);
      const m = error.message.toLowerCase();
      if (/already|registered|exists/.test(m)) {
        setDaTonTai(true);
        return setErrors({ _form: D.loi.daTonTai });
      }
      const loi = /signups? not allowed|disabled/.test(m)
          ? D.loi.dongDangKy
          : /password/.test(m)
            ? D.loi.matKhauYeu
            : D.loi.chung;
      return setErrors({ _form: loi });
    }
    // Supabase không báo lỗi khi email đã tồn tại (chống dò email) mà trả user không có identity
    if (data.user && data.user.identities?.length === 0) {
      setDaTonTai(true);
      return setErrors({ _form: D.loi.daTonTai });
    }
    // Đã tắt xác nhận email ở Supabase → có phiên ngay: vào thẳng bước thiết lập hồ sơ (tài khoản mới chưa có customer_id)
    if (data.session) return router.replace("/onboarding");
    // Dự phòng khi dự án bật lại xác nhận email — không chặn luồng chính
    setChoXacNhan(email.trim());
  }

  if (choXacNhan) {
    return (
      <AuthCard
        title={D.xacNhanEmail.title}
        footer={
          <Link href="/login" className="font-medium text-gold-text underline-offset-4 hover:underline">
            {AUTH.login.title}
          </Link>
        }
      >
        <p className="flex gap-3 text-sm">
          <MailCheck className="mt-0.5 size-5 shrink-0 text-gold-text" aria-hidden />
          <span>{D.xacNhanEmail.body(choXacNhan)}</span>
        </p>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title={D.title}
      description={D.moTa}
      footer={
        <>
          <span className="text-muted-foreground">{D.daCoTk} </span>
          <Link href="/login" className="font-medium text-gold-text underline-offset-4 hover:underline">
            {D.linkDangNhap}
          </Link>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-4" noValidate>
        <FormField id="email" label={AUTH.email} error={errors.email}>
          <Input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} aria-invalid={!!errors.email} required />
        </FormField>
        <FormField id="mat-khau" label={AUTH.matKhau} hint={D.matKhauHint} error={errors.matKhau}>
          <Input id="mat-khau" type="password" autoComplete="new-password" value={matKhau} onChange={(e) => setMatKhau(e.target.value)} aria-invalid={!!errors.matKhau} required />
        </FormField>
        <FormField id="nhap-lai" label={D.nhapLai} error={errors.nhapLai}>
          <Input id="nhap-lai" type="password" autoComplete="new-password" value={nhapLai} onChange={(e) => setNhapLai(e.target.value)} aria-invalid={!!errors.nhapLai} required />
        </FormField>
        {errors._form && (
          <p className="bg-brand-red-bg px-3 py-2 text-sm text-destructive" role="alert">
            {errors._form}{" "}
            {daTonTai && (
              <Link href={`/login?email=${encodeURIComponent(email.trim())}`} className="font-medium underline underline-offset-4">
                {D.loi.daTonTaiLink}
              </Link>
            )}
          </p>
        )}
        <Button type="submit" size="lg" className="w-full" disabled={busy}>
          <UserPlus /> {busy ? D.dangGui : D.nut}
        </Button>
      </form>
    </AuthCard>
  );
}
