"use client";

import { usePathname } from "next/navigation";

import { SidebarTrigger } from "@/components/ui/sidebar";
import { navByRole, type Role } from "@/lib/navigation";

/*
 * Top bar (palette v3 mục 9.1): nền espresso, tên trang 16px/600, vạch 2px ánh kim ngay dưới.
 * Tên trang lấy từ menu của vai trò theo pathname — thêm trang mới chỉ cần thêm vào lib/navigation.ts.
 */
export function TopBar({ role }: { role: Role }) {
  const pathname = usePathname();
  const title = navByRole[role].items.find((i) => pathname === i.href || pathname.startsWith(`${i.href}/`))?.title ?? "Nexora";
  return (
    <div className="sticky top-0 z-30 shrink-0">
      <header className="flex h-14 items-center gap-3 bg-topbar px-4 text-topbar-foreground">
        <SidebarTrigger className="-ml-1 text-topbar-foreground hover:bg-white/10 hover:text-topbar-foreground [&_svg]:size-[18px]" />
        <p className="truncate text-base font-semibold">{title}</p>
      </header>
      <div className="h-0.5 bg-gold-metal-flat" aria-hidden />
    </div>
  );
}
