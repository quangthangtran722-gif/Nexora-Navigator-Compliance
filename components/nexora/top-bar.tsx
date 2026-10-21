"use client";

import { usePathname } from "next/navigation";

import { SidebarTrigger } from "@/components/ui/sidebar";
import { useAuth } from "@/lib/auth/auth-provider";
import { COPY } from "@/lib/copy";
import { ok } from "@/lib/data/errors";
import { getCustomer } from "@/lib/data/queries";
import { useQuery } from "@/lib/data/use-query";
import { navByRole, type Role } from "@/lib/navigation";

/*
 * Top bar (palette v4 mục 9.1): nền espresso, breadcrumb 13px, vạch 2px ánh kim ngay dưới.
 * Breadcrumb (wording mục 3.1, 4): doanh nghiệp "[Tên công ty] › [Tên trang]"; chuyên viên "Quản trị › [Tên trang]".
 * Tên trang lấy từ menu của vai trò theo pathname — thêm trang mới chỉ cần thêm vào lib/navigation.ts.
 */
export function TopBar({ role }: { role: Role }) {
  const pathname = usePathname();
  const nav = navByRole[role];
  const title = nav.items.find((i) => pathname === i.href || pathname.startsWith(`${i.href}/`))?.title ?? COPY.brand;
  const { customerId } = useAuth();
  // Tên công ty của tài khoản doanh nghiệp (RLS chỉ trả công ty của chính tài khoản)
  const laDoanhNghiep = role === "khach-hang" && !!customerId;
  const cty = useQuery(() => (laDoanhNghiep ? getCustomer(customerId!) : Promise.resolve(ok(null))), [laDoanhNghiep ? customerId : null]);
  const dau = role === "khach-hang" ? cty.data?.ten_cong_ty : nav.crumb;

  return (
    <div className="sticky top-0 z-30 shrink-0">
      <header className="flex h-14 items-center gap-3 bg-topbar px-4 text-topbar-foreground">
        <SidebarTrigger aria-label={COPY.shell.toggleSidebar} className="-ml-1 text-topbar-foreground hover:bg-topbar-foreground/10 hover:text-topbar-foreground [&_svg]:size-[18px]" />
        <nav aria-label="Vị trí hiện tại" className="min-w-0 truncate text-[13px]">
          {dau && (
            <>
              <span className="text-topbar-muted">{dau}</span>
              <span className="mx-1.5 text-topbar-muted" aria-hidden>
                ›
              </span>
            </>
          )}
          <span className="font-medium text-topbar-foreground" aria-current="page">
            {title}
          </span>
        </nav>
      </header>
      <div className="h-0.5 bg-gold-metal-flat" aria-hidden />
    </div>
  );
}
