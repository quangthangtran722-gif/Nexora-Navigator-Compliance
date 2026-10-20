"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogOut } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import { useAuth } from "@/lib/auth/auth-provider";
import { navByRole, type Role } from "@/lib/navigation";

/*
 * Sidebar (palette v3 mục 8 + brief mục 4): nền trắng; logo mark + tên gõ chữ trên cùng, thu gọn còn logo mark;
 * mục đang chọn nền accent + chữ accent-foreground + viền trái 3px gold-500; dưới cùng avatar vuông + tài khoản + badge vai trò.
 */

// Chữ viết tắt cho avatar: 2 ký tự đầu phần trước @ của email
const initials = (email: string | null) => (email ? email.split("@")[0].replace(/[^a-zA-Z0-9]/g, "").slice(0, 2).toUpperCase() : "?");

export function AppSidebar({ role }: { role: Role }) {
  const pathname = usePathname();
  const nav = navByRole[role];
  const router = useRouter();
  const { email, signOut } = useAuth();

  return (
    <Sidebar collapsible="icon">
      {/* Khối logo cao đúng 56px = top bar. Logo mark 28px + tên gõ bằng chữ (không dùng ảnh logo đầy đủ ở đây).
          Thu gọn: padding ngang 16px → 10px để mark 28px nằm giữa dải 48px; khối chữ mờ dần, không bật/tắt bằng hidden. */}
      <SidebarHeader className="h-14 shrink-0 justify-center gap-0 border-b border-sidebar-border px-4 py-0 transition-[padding] duration-200 ease-[cubic-bezier(0.2,0.8,0.2,1)] group-data-[collapsible=icon]:px-[10px]">
        <Link href="/" aria-label="Nexora Compliance Navigator — về trang chủ" className="flex items-center gap-2.5 overflow-hidden outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
          <Image src="/logo-mark.png" alt="" width={28} height={28} priority className="size-7 shrink-0" />
          <span className="leading-[1.15] whitespace-nowrap transition-opacity duration-150 group-data-[collapsible=icon]:opacity-0">
            <span className="block text-[15px] font-bold tracking-[0.06em] text-gold-text">NEXORA</span>
            <span className="block text-[10.5px] font-semibold tracking-[0.08em] text-[#8F713C]">COMPLIANCE NAVIGATOR</span>
          </span>
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>{nav.label}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {nav.items.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    isActive={pathname === item.href || pathname.startsWith(`${item.href}/`)}
                    tooltip={item.title}
                    render={<Link href={item.href} />}
                    // Mục đang chọn: viền trái 3px gold-500 (giảm padding trái 3px để chữ không lệch)
                    className="data-active:border-l-[3px] data-active:border-primary data-active:pl-[5px]"
                  >
                    <item.icon />
                    {/* Nhãn mờ dần khi thu gọn (nút đã overflow-hidden) */}
                    <span className="whitespace-nowrap transition-opacity duration-150 group-data-[collapsible=icon]:opacity-0">{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* Tài khoản đăng nhập (Supabase Auth): avatar vuông + email + badge vai trò, rồi Đăng xuất */}
      <SidebarFooter className="border-t border-sidebar-border">
        <SidebarMenu>
          <SidebarMenuItem>
            <div className="flex items-center gap-2 overflow-hidden p-1 transition-[padding] duration-200 ease-[cubic-bezier(0.2,0.8,0.2,1)] group-data-[collapsible=icon]:p-0" title={email ?? undefined}>
              <Avatar className="rounded-none after:rounded-none">
                <AvatarFallback className="rounded-none bg-accent text-xs font-semibold text-gold-text">{initials(email)}</AvatarFallback>
              </Avatar>
              <span className="min-w-0 flex-1 whitespace-nowrap transition-opacity duration-150 group-data-[collapsible=icon]:opacity-0">
                <span className="block truncate text-xs font-medium text-sidebar-foreground">{email}</span>
                <span className="mt-0.5 inline-block bg-accent px-1.5 py-px text-[11px] font-medium text-accent-foreground">{nav.label}</span>
              </span>
            </div>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              tooltip="Đăng xuất"
              onClick={async () => {
                await signOut();
                router.replace("/login");
              }}
            >
              <LogOut />
              <span className="whitespace-nowrap transition-opacity duration-150 group-data-[collapsible=icon]:opacity-0">Đăng xuất</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
