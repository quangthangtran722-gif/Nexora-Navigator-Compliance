import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/nexora/app-sidebar";
import { TopBar } from "@/components/nexora/top-bar";
import type { Role } from "@/lib/navigation";

// Khung chung cho mọi trang trong app: sidebar trái + top bar espresso + vùng làm việc bên phải
export function AppShell({ role, children }: { role: Role; children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <AppSidebar role={role} />
      {/* min-w-0: nội dung rộng (bảng, tab bar) cuộn trong vùng của nó, không đẩy cả trang cuộn ngang */}
      <SidebarInset className="min-w-0">
        <TopBar role={role} />
        <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
