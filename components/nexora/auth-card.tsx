import Image from "next/image";

import { AUTH } from "@/lib/copy";

/*
 * Khung chung trang Đăng nhập / Đăng ký (brief mục 5.10, palette v4 mục 9): nền background, thẻ vuông (radius 0)
 * ở giữa, logo đầy đủ ~240px + câu giới thiệu, rồi tiêu đề + form. Bản tối: thẻ nền card, viền vàng mảnh trên cùng.
 */
export function AuthCard({ title, description, children, footer }: { title: string; description?: string; children: React.ReactNode; footer?: React.ReactNode }) {
  return (
    <div className="w-full max-w-[400px]">
      <div className="border border-border bg-card text-card-foreground shadow-sm">
        {/* Vạch kim loại mảnh trên đầu thẻ — cùng ngôn ngữ với vạch dưới top bar */}
        <div className="h-0.5 bg-gold-metal-flat" aria-hidden />
        <div className="space-y-6 px-6 pt-8 pb-6 sm:px-8">
          <div className="space-y-3 text-center">
            {/* Logo đầy đủ đã cắt sát (public/logo-nexora.png, 900×360) */}
            <Image src="/logo-nexora.png" alt="Nexora Compliance Navigator" width={900} height={360} priority sizes="240px" className="mx-auto h-auto w-60" />
            <p className="mx-auto max-w-[30ch] text-sm text-muted-foreground">{AUTH.tagline}</p>
          </div>
          <div className="space-y-1 border-t border-border pt-6">
            <h1 className="text-xl font-semibold">{title}</h1>
            {description && <p className="text-sm text-muted-foreground">{description}</p>}
          </div>
          {children}
        </div>
        {footer && <div className="border-t border-border bg-muted/40 px-6 py-4 text-center text-sm sm:px-8">{footer}</div>}
      </div>
    </div>
  );
}
