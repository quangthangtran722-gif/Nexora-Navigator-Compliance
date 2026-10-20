"use client";

import { useState, useSyncExternalStore } from "react";

import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/nexora/app-sidebar";
import { TopBar } from "@/components/nexora/top-bar";
import type { Role } from "@/lib/navigation";

// Brief mục 4: ≥ 1024px sidebar mở; 768–1024px tự thu gọn thành dải icon; < 768px là ngăn kéo (sẵn có của shadcn)
const WIDE = "(min-width: 1024px)";
const subscribe = (cb: () => void) => {
  const mq = window.matchMedia(WIDE);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
};

// Khung chung cho mọi trang trong app: sidebar trái + top bar espresso + vùng làm việc bên phải
export function AppShell({ role, children }: { role: Role; children: React.ReactNode }) {
  const wide = useSyncExternalStore(subscribe, () => window.matchMedia(WIDE).matches, () => true);
  // Người dùng bấm thu gọn / mở thì giữ lựa chọn đó cho tới khi màn hình đổi qua mốc 1024px
  const [override, setOverride] = useState<{ wide: boolean; open: boolean } | null>(null);
  const open = override && override.wide === wide ? override.open : wide;

  return (
    <SidebarProvider open={open} onOpenChange={(o) => setOverride({ wide, open: o })}>
      <AppSidebar role={role} />
      {/* min-w-0: nội dung rộng (bảng, tab bar) cuộn trong vùng của nó, không đẩy cả trang cuộn ngang */}
      <SidebarInset className="min-w-0">
        <TopBar role={role} />
        <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
