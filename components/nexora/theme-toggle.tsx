"use client";

import { useSyncExternalStore } from "react";
import { useTheme } from "next-themes";
import { Monitor, Moon, Sun } from "lucide-react";

import { DropdownMenu, DropdownMenuContent, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { SidebarMenuButton } from "@/components/ui/sidebar";
import { COPY } from "@/lib/copy";

/*
 * Nút chuyển giao diện (palette v4 mục 3.4) — trong sidebar, ngay trên "Đăng xuất".
 * 3 lựa chọn: Sáng (Sun) · Tối (Moon) · Theo máy (Monitor). Sidebar thu gọn thì chỉ còn icon (nhãn mờ dần như menu).
 */
const OPTIONS = [
  { value: "light", label: COPY.shell.themeLight, Icon: Sun },
  { value: "dark", label: COPY.shell.themeDark, Icon: Moon },
  { value: "system", label: COPY.shell.themeSystem, Icon: Monitor },
] as const;

// Lựa chọn theme chỉ biết được ở client → render "Sáng" ở server, tránh lệch hydration
const useMounted = () => useSyncExternalStore(() => () => {}, () => true, () => false);

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const mounted = useMounted();
  const current = OPTIONS.find((o) => o.value === (mounted ? theme : "light")) ?? OPTIONS[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<SidebarMenuButton tooltip={`${COPY.shell.theme}: ${current.label}`} />}>
        <current.Icon />
        <span className="whitespace-nowrap transition-opacity duration-150 group-data-[collapsible=icon]:opacity-0">{COPY.shell.theme}: {current.label}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent side="top" align="start" className="w-44">
        <DropdownMenuRadioGroup value={mounted ? theme : "light"} onValueChange={(v) => setTheme(v as string)}>
          {OPTIONS.map(({ value, label, Icon }) => (
            <DropdownMenuRadioItem key={value} value={value}>
              <Icon /> {label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
