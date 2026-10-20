"use client";

import { usePathname } from "next/navigation";

import { SidebarTrigger } from "@/components/ui/sidebar";
import { navByRole, type Role } from "@/lib/navigation";

/*
 * Top bar (palette v3 mục 9.1): nền espresso, breadcrumb "Vai trò › Tên trang" 13px, vạch 2px ánh kim ngay dưới.
 * Tên trang lấy từ menu của vai trò theo pathname — thêm trang mới chỉ cần thêm vào lib/navigation.ts.
 */
export function TopBar({ role }: { role: Role }) {
  const pathname = usePathname();
  const title = navByRole[role].items.find((i) => pathname === i.href || pathname.startsWith(`${i.href}/`))?.title ?? "Nexora";
  return (
    <div className="sticky top-0 z-30 shrink-0">
      <header className="flex h-14 items-center gap-3 bg-topbar px-4 text-topbar-foreground">
        <SidebarTrigger className="-ml-1 text-topbar-foreground hover:bg-topbar-foreground/10 hover:text-topbar-foreground [&_svg]:size-[18px]" />
        {/* Breadcrumb nhỏ (team chốt 20/10): tiêu đề lớn + mô tả nằm trong nội dung trang */}
        <nav aria-label="Vị trí hiện tại" className="min-w-0 truncate text-[13px]">
          <span className="text-topbar-muted">{navByRole[role].label}</span>
          <span className="mx-1.5 text-topbar-muted" aria-hidden>
            ›
          </span>
          <span className="font-medium text-topbar-foreground" aria-current="page">
            {title}
          </span>
        </nav>
      </header>
      <div className="h-0.5 bg-gold-metal-flat" aria-hidden />
    </div>
  );
}
