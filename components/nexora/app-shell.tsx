import { Separator } from "@/components/ui/separator";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/nexora/app-sidebar";
import { navByRole, type Role } from "@/lib/navigation";

// Khung chung cho mọi trang trong app: sidebar trái + vùng làm việc bên phải
export function AppShell({ role, children }: { role: Role; children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <AppSidebar role={role} />
      {/* min-w-0: nội dung rộng (bảng, tab bar) cuộn trong vùng của nó, không đẩy cả trang cuộn ngang */}
      <SidebarInset className="min-w-0">
        <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <span className="text-sm text-muted-foreground">
            Đang xem với vai trò:{" "}
            <span className="font-medium text-foreground">{navByRole[role].label}</span>
          </span>
        </header>
        <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
