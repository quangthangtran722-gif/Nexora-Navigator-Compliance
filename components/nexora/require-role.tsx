"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ShieldOff } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { HOME_BY_ROLE, useAuth, type Role } from "@/lib/auth/auth-provider";

/*
 * Chặn ở tầng giao diện: chưa đăng nhập → /login; sai vai trò → thông báo, không render màn.
 * Đây chỉ là ẩn/hiện — dữ liệu vẫn được RLS bảo vệ ở DB dù có vào được trang.
 */
export function RequireRole({ role, children }: { role: Role; children: React.ReactNode }) {
  const { loading, session, role: current } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !session) router.replace(`/login?next=${encodeURIComponent(pathname)}`);
  }, [loading, session, router, pathname]);

  if (loading || !session) {
    return (
      <div className="space-y-3" aria-busy="true">
        <Skeleton className="h-8 w-1/3" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (current !== role) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed p-10 text-center">
        <ShieldOff className="size-6 text-muted-foreground" aria-hidden />
        <p className="font-medium">Tài khoản này không có quyền xem trang này</p>
        <p className="max-w-sm text-sm text-muted-foreground">
          {current ? "Trang dành cho vai trò khác." : "Tài khoản chưa được gán vai trò (curator / khách hàng) — liên hệ quản trị Nexora."}
        </p>
        {current && (
          <Link href={HOME_BY_ROLE[current]} className={buttonVariants({ variant: "outline" })}>
            Về trang của tôi
          </Link>
        )}
      </div>
    );
  }

  return <>{children}</>;
}
