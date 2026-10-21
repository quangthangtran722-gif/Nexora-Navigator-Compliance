"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { RotateCcw, TriangleAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { COPY } from "@/lib/copy";
import { type AppError } from "@/lib/data/errors";

// Trạng thái đang tải / lỗi tải dùng chung cho các màn đọc dữ liệu thật

export function LoadingBlock() {
  return (
    <div className="space-y-3" aria-busy="true" aria-label={COPY.state.loading}>
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-28 w-full" />
      <Skeleton className="h-28 w-full" />
    </div>
  );
}

export function ErrorBlock({ error, onRetry }: { error: AppError; onRetry: () => void }) {
  const router = useRouter();
  const pathname = usePathname();

  // PT401 → về đăng nhập; 42501/23514 là lỗi lập trình → ghi log
  useEffect(() => {
    if (error.code === "PT401") router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    if (error.code === "42501" || error.code === "23514") console.error("[Nexora] Lỗi lập trình khi đọc dữ liệu", error);
    else console.warn("[Nexora] Lỗi khi đọc dữ liệu", error);
  }, [error, router, pathname]);

  return (
    <div className="flex flex-col items-center gap-3 border bg-card p-8 text-center" role="alert">
      <TriangleAlert className="size-5 text-destructive" aria-hidden />
      {/* Lỗi đọc dữ liệu: câu chung (wording mục 5); hết phiên thì báo hết phiên */}
      <p className="text-sm">{error.code === "PT401" ? COPY.state.sessionExpired : COPY.state.loadError}</p>
      <Button variant="outline" size="sm" onClick={onRetry}>
        <RotateCcw /> {COPY.action.retry}
      </Button>
    </div>
  );
}
