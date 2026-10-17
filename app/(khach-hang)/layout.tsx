import { AppShell } from "@/components/nexora/app-shell";

// Layout chung cho mọi trang của vai trò này (route group — không thêm đoạn URL)
export default function Layout({ children }: { children: React.ReactNode }) {
  return <AppShell role="khach-hang">{children}</AppShell>;
}
