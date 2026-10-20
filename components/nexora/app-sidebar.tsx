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
 * Sidebar (palette v3 mục 8 + brief mục 4): nền trắng; logo Nexora trên cùng, thu gọn còn biểu tượng cân;
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
      <SidebarHeader className="border-b border-sidebar-border">
        <Link href="/" aria-label="Nexora Compliance Navigator — về trang chủ" className="flex items-center justify-center px-1 py-2 outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
          {/* Mở: logo đầy đủ (ảnh 900×360) · thu gọn: chỉ biểu tượng cân (ảnh vuông) */}
          <Image src="/logo-nexora.png" alt="Nexora Compliance Navigator" width={200} height={80} priority className="h-auto w-[200px] group-data-[collapsible=icon]:hidden" />
          <Image src="/logo-mark.png" alt="Nexora" width={32} height={32} className="hidden size-8 group-data-[collapsible=icon]:block" />
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
                    <span>{item.title}</span>
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
            <div className="flex items-center gap-2 p-1 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-0" title={email ?? undefined}>
              <Avatar className="rounded-none after:rounded-none">
                <AvatarFallback className="rounded-none bg-accent text-xs font-semibold text-gold-text">{initials(email)}</AvatarFallback>
              </Avatar>
              <span className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
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
              <span>Đăng xuất</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
