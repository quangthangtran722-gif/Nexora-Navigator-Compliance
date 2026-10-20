"use client";

import { useEffect, useRef, useState } from "react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

/*
 * Tab / bộ lọc (palette v3 mục 9.3). Nền trắng, viền dưới; tab chọn chữ đậm + gạch chân 3px ánh kim.
 * Số đếm: "action" = có việc cần làm (nền brand-red-bg, chữ status-ap-dung — v4 mục 9.3), "neutral" = nền muted.
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
  // Tab tràn chiều ngang → cuộn ngang + lớp mờ dần ở mép phải báo còn tab bị khuất (duyệt đợt 2)
  const scrollRef = useRef<HTMLDivElement>(null);
  const [conTabBenPhai, setConTabBenPhai] = useState(false);
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const update = () => setConTabBenPhai(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
    const ro = new ResizeObserver(update); // gọi ngay khi bắt đầu quan sát + mỗi lần đổi kích thước
    ro.observe(el);
    el.addEventListener("scroll", update, { passive: true });
    return () => {
      ro.disconnect();
      el.removeEventListener("scroll", update);
    };
  }, []);

  return (
    <Tabs value={value} onValueChange={(v) => onValueChange(v as string)} className={cn("gap-4", className)}>
      <div className="flex flex-wrap items-end justify-between gap-x-3 border-b bg-card">
        {/* Cuộn ngang khi hẹp (chuột, chạm, phím mũi tên trong tablist), ẩn thanh cuộn; lớp mờ ở mép phải khi còn tab */}
        <div className="relative -mb-px min-w-0 flex-1">
          <div ref={scrollRef} className="overflow-x-auto [scrollbar-width:none]">
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
                      t.countTone === "action" ? "bg-brand-red-bg text-status-ap-dung" : "bg-muted text-muted-foreground",
                    )}
                  >
                    {t.count}
                  </span>
                )}
              </TabsTrigger>
            ))}
          </TabsList>
          </div>
          {conTabBenPhai && <div className="pointer-events-none absolute inset-y-0 right-0 w-12 bg-linear-to-l from-card to-transparent" aria-hidden />}
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
