import Link from "next/link";
import { ArrowRight, Compass } from "lucide-react";

import { AnhHuongBadge, ApDungBadge, DuyetBadge } from "@/components/nexora/status-badges";
import { curatorNav, khachHangNav } from "@/lib/navigation";

// Trang chọn vai trò — tạm thời thay cho đăng nhập (chưa wiring Supabase Auth)
export default function Home() {
  const roles = [curatorNav, khachHangNav];

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center gap-10 px-4 py-16 sm:px-6">
      <header className="space-y-3">
        <div className="flex items-center gap-2 text-primary">
          <Compass className="size-5" aria-hidden />
          <span className="text-sm font-semibold">Nexora Compliance Navigator</span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight">Chọn vai trò để xem giao diện</h1>
        <p className="text-muted-foreground">
          Bản dựng khung giao diện. Chưa có đăng nhập và dữ liệu thật.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
        {roles.map((nav) => (
          <Link
            key={nav.role}
            href={nav.items[0].href}
            className="group rounded-xl border bg-card p-5 transition-colors hover:border-primary/50 hover:bg-accent"
          >
            <div className="flex items-center justify-between">
              <span className="text-lg font-semibold">{nav.label}</span>
              <ArrowRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
            </div>
            <p className="mt-1 text-sm text-muted-foreground">{nav.description}</p>
          </Link>
        ))}
      </div>

      <section className="space-y-3 rounded-xl border bg-card p-5">
        <h2 className="text-sm font-semibold">Badge trạng thái dùng chung</h2>
        <div className="flex flex-wrap gap-2">
          <ApDungBadge status="ap_dung" />
          <ApDungBadge status="sap_ap_dung" />
          <ApDungBadge status="khong_ap_dung" />
        </div>
        <div className="flex flex-wrap gap-2">
          <DuyetBadge status="cho_duyet" />
          <DuyetBadge status="da_duyet" />
          <DuyetBadge status="tu_choi" />
        </div>
        <div className="flex flex-wrap gap-2">
          <AnhHuongBadge level="primary" />
          <AnhHuongBadge level="secondary" />
        </div>
      </section>
    </main>
  );
}
