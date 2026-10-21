"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

import { Skeleton } from "@/components/ui/skeleton";
import { HOME_BY_ROLE, useAuth, type Role } from "@/lib/auth/auth-provider";

/*
 * Chặn ở tầng giao diện — bọc NGOÀI AppShell để khung (menu, badge vai trò) chỉ vẽ khi đúng vai trò:
 *  - chưa đăng nhập → /login?next=…
 *  - đăng nhập nhưng là vai trò khác (chuyên viên mở trang doanh nghiệp và ngược lại) → về thẳng trang chính
 *    của vai trò đang có, không hiện menu / badge của vai trò kia
 *  - chưa gắn doanh nghiệp (vừa đăng ký) → chỉ được ở /onboarding để thiết lập hồ sơ
 * Đây chỉ là ẩn/hiện — dữ liệu vẫn được RLS bảo vệ ở DB dù có vào được trang.
 */
export function RequireRole({ role, children }: { role: Role; children: React.ReactNode }) {
  const { loading, session, role: current } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  // Đích chuyển hướng khi không được ở trang này; null = được ở lại
  let dich: string | null = null;
  if (!loading) {
    if (!session) dich = `/login?next=${encodeURIComponent(pathname)}`;
    else if (current === null) dich = role === "customer" && pathname === "/onboarding" ? null : "/onboarding";
    else if (current !== role) dich = HOME_BY_ROLE[current];
  }

  useEffect(() => {
    if (dich) router.replace(dich);
  }, [dich, router]);

  if (loading || dich) {
    // Chưa biết vai trò / đang chuyển trang: không vẽ khung của vai trò nào
    return (
      <div className="flex min-h-svh flex-1 items-center justify-center bg-background p-6" aria-busy="true">
        <div className="w-full max-w-md space-y-3">
          <Skeleton className="h-8 w-1/2" />
          <Skeleton className="h-24 w-full" />
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
