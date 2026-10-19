"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

/*
 * Tab / bộ lọc (palette v3 mục 9.3). Nền trắng, viền dưới; tab chọn chữ đậm + gạch chân 3px ánh kim.
 * Số đếm: "action" = có việc cần làm (nền #FDF2F1 chữ #B42318), "neutral" = nền muted.
 * Khi tab là bộ lọc, luôn đặt mục "Tất cả" đầu tiên (caller truyền vào items).
 */

export type TabItem = {
  value: string;
  label: string;
  count?: number; // ẩn khi 0 / undefined
  countTone?: "action" | "neutral";
};

export function TabBar({
  value,
  onValueChange,
  items,
  label,
  extra,
  children,
  className,
}: {
  value: string;
  onValueChange: (v: string) => void;
  items: TabItem[];
  label: string; // aria-label của tablist
  extra?: React.ReactNode; // nút phụ bên phải thanh tab
  children?: React.ReactNode; // nội dung của tab đang chọn
  className?: string;
}) {
  return (
    <Tabs value={value} onValueChange={(v) => onValueChange(v as string)} className={cn("gap-4", className)}>
      <div className="flex flex-wrap items-end justify-between gap-x-3 border-b bg-card">
        {/* Cuộn ngang khi hẹp, ẩn thanh cuộn (vẫn dùng được phím mũi tên trong tablist) */}
        <div className="-mb-px min-w-0 flex-1 overflow-x-auto [scrollbar-width:none]">
          <TabsList variant="line" aria-label={label} className="h-auto w-max gap-0 p-0">
            {items.map((t) => (
              <TabsTrigger
                key={t.value}
                value={t.value}
                aria-label={t.count ? `${t.label}, ${t.count}` : t.label}
                className={cn(
                  "h-11 flex-none gap-2 rounded-none border-0 px-4 text-[13px] font-normal text-muted-foreground",
                  "data-active:font-semibold data-active:text-foreground",
                  "group-data-horizontal/tabs:after:bottom-0 group-data-horizontal/tabs:after:h-[3px] after:bg-gold-metal-flat",
                )}
              >
                {t.label}
                {!!t.count && (
                  <span
                    className={cn(
                      "px-1.5 py-px text-xs font-semibold tabular-nums",
                      t.countTone === "action" ? "bg-duyet-cho-bg text-duyet-cho" : "bg-muted text-muted-foreground",
                    )}
                  >
                    {t.count}
                  </span>
                )}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>
        {extra && <div className="mb-1.5 flex items-center gap-2">{extra}</div>}
      </div>
      {children !== undefined && (
        <TabsContent value={value} className="space-y-6">
          {children}
        </TabsContent>
      )}
    </Tabs>
  );
}
