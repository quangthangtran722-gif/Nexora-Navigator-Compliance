"use client";

import Link from "next/link";
import { ChevronDown, ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";

/*
 * Danh sách mục (palette v3 mục 9.5) — mẫu gốc: /duyet-diagnostic.
 *  Thu gọn: chevron + tên + badge bên phải, cao ~44px, phân cách bằng viền dưới.
 *  Mở ra: tiêu đề 15px/600, ItemMeta, nội dung, ItemActions (phụ trái, chính sát phải).
 *  Chỉ mở 1 mục tại một thời điểm — trang giữ openId và truyền open/onToggle.
 *  Mục chỉ dẫn sang trang khác (không mở tại chỗ) dùng href.
 */

export function ItemList({ children, className }: { children: React.ReactNode; className?: string }) {
  return <ul className={cn("border bg-card [&>li+li]:border-t", className)}>{children}</ul>;
}

type Common = {
  title: React.ReactNode;
  hint?: React.ReactNode; // dòng phụ nhỏ dưới tên (khi thu gọn)
  right?: React.ReactNode; // badge trạng thái
  unread?: boolean; // chấm đỏ vuông (hộp thư)
  muted?: boolean; // mục hết hiệu lực: mờ + gạch
  prominent?: boolean; // màn phía doanh nghiệp: tiêu đề khi mở 17px/700, các phần cách nhau 24px (curator giữ 15px/600)
  className?: string;
};

export function ItemRow({
  title,
  hint,
  right,
  unread,
  muted,
  prominent,
  className,
  open,
  onToggle,
  href,
  onNavigate,
  children,
  id,
}: Common & {
  open?: boolean;
  onToggle?: () => void;
  href?: string;
  onNavigate?: () => void;
  children?: React.ReactNode;
  id?: string;
}) {
  const panelId = id ? `${id}-panel` : undefined;
  const head = (
    <>
      {href ? (
        <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
      ) : (
        <ChevronDown className={cn("size-4 shrink-0 text-muted-foreground transition-transform", !open && "-rotate-90")} aria-hidden />
      )}
      {unread && <span className="size-2 shrink-0 bg-brand-red" aria-label="Chưa đọc" />}
      <span className="min-w-40 flex-1 basis-40">
        {/* Hộp thư (unread được truyền): chưa đọc 600, đã đọc 400 — phân biệt bằng độ đậm + chấm đỏ 8px */}
        <span className={cn("block", open ? (prominent ? "text-[17px] leading-snug font-bold" : "text-[15px] font-semibold") : unread === undefined ? "text-sm font-medium" : unread ? "text-sm font-semibold" : "text-sm font-normal", muted && "line-through")}>
          {title}
        </span>
        {hint && !open && <span className="block truncate text-xs text-muted-foreground">{hint}</span>}
      </span>
      {right && <span className="ml-auto flex shrink-0 flex-wrap items-center justify-end gap-1.5">{right}</span>}
    </>
  );
  // flex-wrap: cột hẹp thì badge xuống dòng dưới tên thay vì bóp tên
  const rowClass = "flex min-h-11 w-full flex-wrap items-center gap-x-3 gap-y-1.5 px-4 py-2.5 text-left transition-colors outline-none hover:bg-accent focus-visible:ring-3 focus-visible:ring-ring/50";

  return (
    <li id={id} className={cn("scroll-mt-20", muted && "opacity-60", className)}>
      {href ? (
        <Link href={href} onClick={onNavigate} className={rowClass}>
          {head}
        </Link>
      ) : (
        <button type="button" onClick={onToggle} aria-expanded={!!open} aria-controls={panelId} className={rowClass}>
          {head}
        </button>
      )}
      {open && children && (
        <div id={panelId} className={cn("px-4 pb-4 pl-11", prominent ? "space-y-6 pt-1 pb-5" : "space-y-3")}>
          {children}
        </div>
      )}
    </li>
  );
}

// Dòng meta khi mở: badge + nguồn luật dễ đọc
export function ItemMeta({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-muted-foreground">{children}</div>;
}

// Hàng hành động: đặt nút phụ trước, nút chính sau cùng (sát phải)
export function ItemActions({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("flex flex-wrap items-end justify-end gap-2 border-t pt-4", className)}>{children}</div>;
}
