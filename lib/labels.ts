import type { BuocPipeline, Domain, LoaiRelationship } from "@/lib/types";

// Nhãn tiếng Việt cho các mã enum hiển thị dạng chữ (không phải badge trạng thái)

export const domainLabel: Record<Domain, string> = {
  thue: "Thuế",
  ke_toan: "Kế toán",
};

// Đọc theo chiều source → target, vd "Thời điểm lập hoá đơn — là điều kiện của → Lập hoá đơn"
export const relationshipLabel: Record<LoaiRelationship, string> = {
  bao_ham: "bao hàm",
  tham_chieu: "tham chiếu",
  thay_the: "thay thế",
  dieu_kien: "là điều kiện của",
  che_tai_cua: "là chế tài của",
  ap_dung_cho: "áp dụng cho",
};

/*
 * primary_departments / secondary_departments trong draft là string[] mã phòng ban.
 * Tạm giả định mã cố định dưới đây (chưa có trong draft — cần backend xác nhận).
 */
export const departmentCodeLabel: Record<string, string> = {
  ke_toan: "Kế toán",
  kinh_doanh: "Kinh doanh",
  kho_van: "Kho vận",
  ban_giam_doc: "Ban Giám đốc",
};

export function deptLabel(code: string) {
  return departmentCodeLabel[code] ?? code;
}

export function formatDate(iso: string | null) {
  if (!iso) return "Chưa xác định";
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${y}`;
}

export const buocLabel: Record<BuocPipeline, string> = {
  extract_entities: "Trích xuất entity",
  filter_domain: "Lọc theo lĩnh vực",
  generate_diagnostic: "Viết diagnostic",
};

// Hiển thị ngày giờ theo giờ Việt Nam, cố định timezone để server/client render giống nhau
export function formatDateTime(iso: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}
