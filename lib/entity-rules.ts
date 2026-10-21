import type { Entity } from "@/lib/types";

// dieu_kien / nguong bắt buộc có dieu_kien_may_doc khi duyệt (CONTRACT §3.4).
// Chỉ dùng để khoá nút trên UI — DB vẫn là nơi chặn thật (approve_entity / approve_chunk trả PT400).
export function thieuDieuKienMayDoc(e: Entity) {
  return (e.loai_entity === "dieu_kien" || e.loai_entity === "nguong") && !e.dieu_kien_may_doc;
}

// chu_the chưa có điều kiện: được duyệt nhưng curator phải xác nhận rõ "chủ thể chung — áp dụng mọi doanh nghiệp"
// (mọi hanh_vi nối tới nó sẽ áp dụng cho mọi DN). approve_chunk bỏ qua các entity này (migration 005).
export function chuTheChuaDieuKien(e: Entity) {
  return e.loai_entity === "chu_the" && !e.dieu_kien_may_doc;
}
