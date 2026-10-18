"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Compass, LogIn } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { HOME_BY_ROLE, useAuth } from "@/lib/auth/auth-provider";

export function HomeGate() {
  const { loading, session, role } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && session && role) router.replace(HOME_BY_ROLE[role]);
  }, [loading, session, role, router]);

  if (loading || (session && role)) return <Skeleton className="h-32 w-full" />;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-primary">
        <Compass className="size-5" aria-hidden />
        <span className="text-sm font-semibold">Nexora Compliance Navigator</span>
      </div>
      <h1 className="text-3xl font-bold tracking-tight">Theo dõi nghĩa vụ thuế &amp; kế toán liên tục</h1>
      <p className="text-muted-foreground">
        {session ? "Tài khoản chưa được gán vai trò — liên hệ quản trị Nexora." : "Đăng nhập bằng tài khoản curator hoặc người đầu mối tuân thủ để bắt đầu."}
      </p>
      {!session && (
        <Link href="/login" className={buttonVariants({ size: "lg" })}>
          <LogIn /> Đăng nhập
        </Link>
      )}
    </div>
  );
}
