import { AppShell } from "@/components/nexora/app-shell";
import { RequireRole } from "@/components/nexora/require-role";

// Layout chung cho mọi trang của vai trò này (route group — không thêm đoạn URL).
// RequireRole bọc NGOÀI AppShell: sai vai trò thì chuyển về trang chính của vai trò đang có, không vẽ menu/badge
// của vai trò này. Chỉ ẩn/hiện theo app_metadata.nexora_role; quyền dữ liệu do RLS ở DB.
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <RequireRole role="curator">
      <AppShell role="curator">{children}</AppShell>
    </RequireRole>
  );
}
