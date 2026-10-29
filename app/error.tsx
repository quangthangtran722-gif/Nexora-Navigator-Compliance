"use client";

import { useEffect } from "react";
import Link from "next/link";
import { RotateCcw, TriangleAlert } from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import { COPY, LOI_TRANG } from "@/lib/copy";

// Ranh giới lỗi App Router: lỗi khi vẽ trang hiện màn có thương hiệu thay cho màn lỗi mặc định của Next
export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("[Nexora] Lỗi khi hiển thị trang", error);
  }, [error]);

  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <div className="w-full max-w-md space-y-4 border border-t-2 border-t-gold-edge bg-card p-6" role="alert">
        <p className="eyebrow">Nexora</p>
        <div className="space-y-1.5">
          <h1 className="flex items-center gap-2 text-lg font-bold">
            <TriangleAlert className="size-5 text-attention" aria-hidden /> {LOI_TRANG.title}
          </h1>
          <p className="text-sm text-muted-foreground">{LOI_TRANG.body}</p>
        </div>
        <div className="flex flex-wrap justify-end gap-2 border-t pt-4">
          <Link href="/" className={buttonVariants({ variant: "outline" })}>
            {LOI_TRANG.veTrangChu}
          </Link>
          <Button onClick={reset}>
            <RotateCcw /> {COPY.action.retry}
          </Button>
        </div>
      </div>
    </main>
  );
}
