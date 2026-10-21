"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { LandingPage } from "@/components/nexora/landing/landing-page";
import { HOME_BY_ROLE, useAuth } from "@/lib/auth/auth-provider";

/*
 * Trang "/": đã đăng nhập → chuyển vào app (trang đầu của vai trò; chưa gắn doanh nghiệp → thiết lập hồ sơ);
 * chưa đăng nhập → landing page. Trong lúc đọc phiên: nền khối nổi bật trống (cùng nền phần đầu landing, không nháy).
 */
export function HomeGate() {
  const { loading, session, role } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && session) router.replace(role ? HOME_BY_ROLE[role] : "/onboarding");
  }, [loading, session, role, router]);

  if (loading || session) return <div className="min-h-svh flex-1 bg-group-solid" aria-busy="true" />;
  return <LandingPage />;
}
