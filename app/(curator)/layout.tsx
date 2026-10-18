import { AppShell } from "@/components/nexora/app-shell";
import { RequireRole } from "@/components/nexora/require-role";

// Layout chung cho mọi trang của vai trò này (route group — không thêm đoạn URL).
// RequireRole chỉ ẩn/hiện theo app_metadata.nexora_role; quyền dữ liệu do RLS ở DB.
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <AppShell role="curator">
      <RequireRole role="curator">{children}</RequireRole>
    </AppShell>
  );
}
