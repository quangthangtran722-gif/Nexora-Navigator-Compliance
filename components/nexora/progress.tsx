import { cn } from "@/lib/utils";

/*
 * Thanh tiến độ & stepper (palette v3 mục 9.9).
 *  ProgressBar: rãnh #EAECF0 cao 6px, phần đã chạy ánh kim, nhãn 12px bên trên.
 *  Stepper: mỗi bước 1 thanh 4px; bước đã qua + hiện tại ánh kim, bước sau #EAECF0; tên bước hiện tại 600.
 */

export function ProgressBar({ label, value, max, className }: { label: React.ReactNode; value: number; max: number; className?: string }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div className={cn("space-y-1.5", className)}>
      <p className="text-xs font-medium text-muted-foreground tabular-nums">{label}</p>
      <div className="h-1.5 bg-border" role="progressbar" aria-valuemin={0} aria-valuemax={max} aria-valuenow={value}>
        <div className="h-full bg-gold-metal-flat transition-[width]" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function Stepper({ steps, current }: { steps: readonly string[]; current: number }) {
  return (
    <ol className="flex gap-2" aria-label="Các bước">
      {steps.map((label, i) => (
        <li key={label} className="flex-1 space-y-1.5" aria-current={i === current ? "step" : undefined}>
          <div className={cn("h-1", i <= current ? "bg-gold-metal-flat" : "bg-border")} />
          <p className={cn("hidden text-xs sm:block", i === current ? "font-semibold text-foreground" : "text-muted-foreground")}>
            {i + 1}. {label}
          </p>
        </li>
      ))}
    </ol>
  );
}
