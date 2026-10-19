import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

/*
 * Thẻ KPI (palette v3 mục 9.8). featured = thẻ đầu /tong-quan (ánh kim, chữ #2A2112) — chỉ 1 thẻ/màn.
 * Góc phải: ô icon vuông 32px nền tint. Số 28px/700 tabular-nums; attention = số cần chú ý (đỏ #B42318).
 */
export function KpiCard({
  label,
  value,
  icon: Icon,
  featured,
  attention,
  hint,
}: {
  label: string;
  value: React.ReactNode;
  icon: LucideIcon;
  featured?: boolean;
  attention?: boolean;
  hint?: React.ReactNode;
}) {
  return (
    <div className={cn("flex items-start justify-between gap-3 p-4", featured ? "bg-gold-metal" : "border bg-card")}>
      <div className="min-w-0 space-y-1">
        <p className={cn("text-xs font-medium", featured ? "text-[#2A2112]/80" : "text-muted-foreground")}>{label}</p>
        <p className={cn("text-[28px] leading-none font-bold tabular-nums", attention && !featured && "text-duyet-cho")}>{value}</p>
        {hint && <p className={cn("text-xs", featured ? "text-[#2A2112]/80" : "text-muted-foreground")}>{hint}</p>}
      </div>
      <span
        className={cn(
          "flex size-8 shrink-0 items-center justify-center",
          featured ? "bg-white/35 text-[#2A2112]" : attention ? "bg-brand-red-bg text-duyet-cho" : "bg-accent text-gold-text",
        )}
        aria-hidden
      >
        <Icon className="size-4" />
      </span>
    </div>
  );
}
