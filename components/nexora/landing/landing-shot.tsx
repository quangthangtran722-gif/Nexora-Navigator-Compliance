import Image from "next/image";

import { cn } from "@/lib/utils";

/*
 * Ảnh chụp app trên landing: khung phẳng (viền 1px, vạch kim loại 2px trên đầu, góc vuông, không bóng đổ).
 * Ảnh gốc chụp bằng Playwright 1440×900 @2x (2880×1800). Email tài khoản ở chân sidebar (góc trái dưới, y ≈ 770
 * trên 900) → cắt bằng CSS, KHÔNG tạo file mới: khung tỉ lệ cố định + object-fit: cover + object-position: top,
 * chiều cao khung dừng trước y ≈ 765 nên mất email mà vẫn hiện nhiều nội dung theo chiều dọc hơn bản cũ (3:1).
 */

// Tỉ lệ khung theo từng ảnh (rộng / cao phần giữ lại, tính theo px CSS trên khung 1440×900)
export const SHOT = {
  "tong-quan": 1440 / 760, // tới hết hàng "Phòng Nhân sự" của bảng Theo phòng ban
  "xac-nhan-nghia-vu": 1440 / 760, // nghĩa vụ đang mở + Việc cần làm + hàng nút xác nhận
  "thong-bao": 1440 / 760,
  "cap-nhat-khach-hang": 1440 / 500, // trọn bảng khách hàng + "Xem lịch sử xử lý"
} as const;

export function LandingShot({
  name,
  alt,
  priority,
  sizes = "(min-width: 1024px) 680px, 100vw",
  className,
}: {
  name: keyof typeof SHOT;
  alt: string;
  priority?: boolean;
  sizes?: string;
  className?: string;
}) {
  return (
    <figure className={cn("relative overflow-hidden border border-border bg-card", className)} style={{ aspectRatio: SHOT[name] }}>
      <Image src={`/landing/${name}.jpg`} alt={alt} fill priority={priority} sizes={sizes} className="object-cover object-top" />
      <div className="absolute inset-x-0 top-0 h-0.5 bg-gold-metal-flat" aria-hidden />
    </figure>
  );
}
