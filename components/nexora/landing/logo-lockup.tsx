import Image from "next/image";

import { LANDING } from "@/lib/copy-landing";
import { cn } from "@/lib/utils";

/*
 * Logo trên nền khối nổi bật (espresso / ánh vàng): logo mark 32px + "NEXORA / COMPLIANCE NAVIGATOR" hai dòng.
 * Dùng chung cho thanh menu và chuyển động mở đầu — cùng markup để cụm logo đáp đúng vị trí trên menu.
 */
export function LogoLockup({ className, textClassName }: { className?: string; textClassName?: string }) {
  return (
    <span className={cn("flex items-center gap-2.5", className)}>
      <Image src="/logo-mark-v2.png" alt="" width={32} height={32} priority className="size-8 shrink-0" data-logo-mark />
      <span className={cn("leading-[1.15] whitespace-nowrap", textClassName)} data-logo-text>
        <span className="block text-[15px] font-bold tracking-[0.06em] text-group-edge">{LANDING.brand.ten}</span>
        <span className="block text-[10.5px] font-semibold tracking-[0.08em] text-group-sub">{LANDING.brand.phu}</span>
      </span>
    </span>
  );
}
