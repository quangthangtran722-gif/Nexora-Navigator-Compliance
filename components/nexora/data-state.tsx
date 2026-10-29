"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { RotateCcw, TriangleAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { COPY } from "@/lib/copy";
import { cn } from "@/lib/utils";
import { type AppError } from "@/lib/data/errors";

// Trạng thái đang tải / lỗi tải dùng chung cho các màn đọc dữ liệu thật

// Skeleton khớp bố cục từng màn (không spinner): tongQuan = Tổng quan, danhSach = tab + nhóm + các dòng (Xác nhận nghĩa vụ,
// Thông báo), form = câu hỏi hồ sơ. Không truyền → khối chung như cũ (trang curator giữ nguyên).
type KieuTai = "tongQuan" | "danhSach" | "form";

// Độ dài dòng tiêu đề giả — lệch nhau cho giống chữ thật
const DAI = ["w-3/5", "w-2/5", "w-1/2", "w-3/4", "w-1/3", "w-2/3"];

function DongGia({ i }: { i: number }) {
  return (
    <div className="flex h-11 items-center gap-3 px-4">
      <Skeleton className="size-3.5 shrink-0" />
      <Skeleton className={cn("h-3.5", DAI[i % DAI.length])} />
      <Skeleton className="ml-auto h-5 w-24 shrink-0" />
    </div>
  );
}

export function LoadingBlock({ kieu }: { kieu?: KieuTai }) {
  const nhan = { "aria-busy": true, "aria-label": COPY.state.loading } as const;
  if (kieu === "tongQuan")
    return (
      <div className="space-y-6" {...nhan}>
        <div className="border bg-card">
          <Skeleton className="h-16 w-full bg-group/30" />
          <div className="flex items-center gap-2.5 px-4 py-3">
            <Skeleton className="size-6" />
            <Skeleton className="h-3.5 w-56" />
          </div>
        </div>
        <div className="grid gap-px border bg-border lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
          <div className="space-y-6 bg-card p-6">
            <Skeleton className="h-3 w-40" />
            <Skeleton className="h-14 w-24" />
            <Skeleton className="h-3.5 w-48" />
          </div>
          <div className="space-y-5 bg-card p-6">
            <Skeleton className="h-3 w-52" />
            <Skeleton className="h-3 w-full" />
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-6 w-8" />
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="space-y-3">
          <Skeleton className="h-3 w-32" />
          <div className="border bg-card [&>div+div]:border-t">
            {[0, 1, 2].map((i) => (
              <div key={i} className="grid gap-x-6 gap-y-2 px-4 py-3.5 sm:grid-cols-[minmax(8rem,13rem)_minmax(0,1fr)_auto] sm:items-center">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-2 w-full" />
                <Skeleton className="h-3 w-48" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  if (kieu === "danhSach")
    return (
      <div className="space-y-4" {...nhan}>
        <div className="flex gap-6 border-b pb-2.5">
          {[16, 24, 20].map((w) => (
            <Skeleton key={w} className="h-4" style={{ width: `${w * 4}px` }} />
          ))}
        </div>
        {[6, 4].map((n, g) => (
          <div key={g}>
            <Skeleton className="h-14 w-full bg-group/30" />
            <div className="border border-t-0 bg-card [&>div+div]:border-t">
              {Array.from({ length: n }, (_, i) => (
                <DongGia key={i} i={i + g} />
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  if (kieu === "form")
    return (
      <div className="space-y-5" {...nhan}>
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="space-y-2">
            <Skeleton className={cn("h-3.5", DAI[i])} />
            <Skeleton className="h-9 w-full sm:w-80" />
          </div>
        ))}
      </div>
    );
  return (
    <div className="space-y-3" {...nhan}>
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
