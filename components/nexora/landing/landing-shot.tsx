import Image from "next/image";

import { cn } from "@/lib/utils";

/*
 * Ảnh chụp app trên landing: khung phẳng (viền 1px, vạch kim loại 2px trên đầu, góc vuông, không bóng đổ).
 * Ảnh gốc 1283×553 có email demo ở góc trái dưới (y ≈ 437) và biểu tượng tiện ích trình duyệt ở góc phải dưới
 * (y ≈ 505) → cắt bằng CSS, KHÔNG tạo file mới: khung tỉ lệ cố định + object-fit: cover + object-position: top,
 * chiều cao khung dừng trước y ≈ 430 nên mất cả hai mà vẫn giữ phần nội dung chính.
 */

// Tỉ lệ khung theo từng ảnh (rộng / cao phần giữ lại, tính trên ảnh gốc 1283px)
export const SHOT = {
  "tong-quan": 1283 / 428, // giữ tới hết hàng thẻ số (y ≈ 410)
  "xac-nhan-nghia-vu": 1283 / 428, // giữ tới hết "Việc cần làm" (y ≈ 400)
  "thong-bao": 1283 / 428,
  "cap-nhat-khach-hang": 1283 / 405, // giữ tới hết bảng 5 doanh nghiệp (y ≈ 395)
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
