"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Compass, LogOut } from "lucide-react";

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

export function AppSidebar({ role }: { role: Role }) {
  const pathname = usePathname();
  const nav = navByRole[role];
  const router = useRouter();
  const { email, signOut } = useAuth();

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" render={<Link href="/" />}>
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                <Compass className="size-4" />
              </div>
              <div className="grid flex-1 text-left leading-tight">
                <span className="truncate font-semibold">Nexora</span>
                <span className="truncate text-xs text-muted-foreground">Compliance Navigator</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
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

      {/* Tài khoản đăng nhập (Supabase Auth) + đăng xuất */}
      <SidebarFooter>
        <SidebarMenu>
          {email && (
            <SidebarMenuItem>
              <span className="block truncate px-2 text-xs text-muted-foreground group-data-[collapsible=icon]:hidden" title={email}>
                {email}
              </span>
            </SidebarMenuItem>
          )}
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
