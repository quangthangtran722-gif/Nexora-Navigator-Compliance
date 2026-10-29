"use client";

import { ArrowRight, CheckSquare } from "lucide-react";

import { LANDING } from "@/lib/copy-landing";
import { useCountUp } from "@/lib/use-count-up";

/*
 * Nửa phải phần đầu landing: trạng thái cuối của màn đối chiếu — số nghĩa vụ áp dụng + làn từng phòng ban + một thẻ
 * nghĩa vụ đã được giao. Dựng bằng HTML (không phải ảnh chụp) để đọc rõ ở mọi bề rộng và theo đúng giao diện sáng/tối.
 * start = chuyển động mở đầu đã xong → số đếm lên, thanh mọc lần lượt (tắt khi giảm chuyển động). Số ở lib/copy-landing.ts.
 */
export function HeroMinhHoa({ start }: { start: boolean }) {
  const M = LANDING.hero.minhHoa;
  const n = useCountUp(M.tong, { start, duration: 1100 });
  const max = Math.max(...M.phong.map((p) => p.so));

  return (
    <figure className="border border-gold-edge/50 bg-card text-card-foreground shadow-[0_24px_48px_-24px_rgb(0_0_0/0.45)]" aria-label={M.moTa}>
      <div className="flex items-baseline justify-between gap-3 border-b px-5 py-3">
        <span className="eyebrow">{M.nhan}</span>
        <span className="truncate text-xs text-muted-foreground">{M.congTy}</span>
      </div>

      <div className="space-y-5 px-5 py-5">
        <p className="flex items-baseline gap-3">
          <span className="text-[56px] leading-none font-extrabold tabular-nums" aria-hidden>
            {n}
          </span>
          <span className="text-sm text-muted-foreground">{M.donVi}</span>
        </p>

        {/* Làn phòng ban: thanh vàng dài theo số nghĩa vụ / phòng nhiều nhất */}
        <ul className="space-y-3">
          {M.phong.map((p, i) => (
            <li key={p.ten} className="space-y-1.5">
              <div className="flex items-baseline justify-between gap-3 text-sm">
                <span className="font-medium">{p.ten}</span>
                <span className="font-bold tabular-nums">{p.so}</span>
              </div>
              <div className="h-2 bg-muted">
                {start && (
                  <div
                    className="h-full animate-grow-x bg-gold-metal-flat"
                    style={{ width: `${(p.so / max) * 100}%`, "--d": `${300 + i * 80}ms` } as React.CSSProperties}
                  />
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* Một thẻ nghĩa vụ → phòng ban */}
      <div className="space-y-2 border-t bg-accent px-5 py-4">
        <p className="text-xs font-medium text-muted-foreground">{M.the.nhan}</p>
        <div className="flex items-start gap-2.5">
          <CheckSquare className="mt-0.5 size-4 shrink-0 text-gold-text" aria-hidden />
          <div className="min-w-0 space-y-0.5">
            <p className="text-[15px] leading-snug font-semibold">{M.the.ten}</p>
            <p className="text-xs text-muted-foreground">{M.the.nguon}</p>
          </div>
        </div>
        <p className="flex items-center gap-1.5 pl-6.5 text-xs font-medium text-gold-text">
          <ArrowRight className="size-3.5" aria-hidden /> {M.the.giaoCho}
        </p>
      </div>
    </figure>
  );
}
