/*
 * Nhãn tiếng Việt cho enum — CHÉP NGUYÊN các bảng *_LABEL ở docs/CONTRACT.md §2.
 * Chỉ dùng hiển thị UI, không gửi lên DB. Nhãn phòng ban: PHONG_BAN_LABEL (lib/department-codes.ts).
 */

import { PHONG_BAN_LABEL, type SlugPhongBan } from "@/lib/department-codes";
import type {
  LoaiEntity,
  LoaiRelationship,
  LoaiVanBan,
  PipelineName,
  QuyMo,
  TrangThaiApDung,
  TrangThaiChunk,
  TrangThaiDuyet,
  TrangThaiVanBan,
} from "@/lib/types";

export const TRANG_THAI_DUYET_LABEL: Record<TrangThaiDuyet, string> = {
  cho_duyet: "Chờ duyệt", da_duyet: "Đã duyệt", tu_choi: "Từ chối",
};

export const TRANG_THAI_AP_DUNG_LABEL: Record<TrangThaiApDung, string> = {
  ap_dung: "Áp dụng", sap_ap_dung: "Sắp áp dụng", khong_ap_dung: "Không áp dụng", chua_du_thong_tin: "Chưa đủ thông tin",
};

export const LOAI_ENTITY_LABEL: Record<LoaiEntity, string> = {
  chu_the: "Chủ thể", doi_tuong: "Đối tượng", hanh_vi: "Hành vi", che_tai: "Chế tài", dieu_kien: "Điều kiện",
  muc_thue: "Mức thuế", thoi_han: "Thời hạn", mien_giam: "Miễn giảm", nguong: "Ngưỡng",
};

export const LOAI_RELATIONSHIP_LABEL: Record<LoaiRelationship, string> = {
  bao_ham: "Bao hàm", tham_chieu: "Tham chiếu", thay_the: "Thay thế",
  dieu_kien: "Là điều kiện của", che_tai_cua: "Là chế tài của", ap_dung_cho: "Áp dụng cho",
};

export const LOAI_VAN_BAN_LABEL: Record<LoaiVanBan, string> = {
  luat: "Luật", nghi_dinh: "Nghị định", thong_tu: "Thông tư", nghi_quyet: "Nghị quyết", quyet_dinh: "Quyết định", huong_dan: "Hướng dẫn", khac: "Khác",
};

export const TRANG_THAI_VAN_BAN_LABEL: Record<TrangThaiVanBan, string> = {
  draft: "Bản nháp", active: "Đang hiệu lực", replaced: "Đã bị thay thế",
};

export const TRANG_THAI_CHUNK_LABEL: Record<TrangThaiChunk, string> = {
  cho_xu_ly: "Chờ xử lý", dang_xu_ly: "Đang trích xuất", da_trich_xuat: "Chờ curator duyệt", hoan_tat: "Hoàn tất", loi: "Lỗi",
};

export const QUY_MO_LABEL: Record<QuyMo, string> = { nho: "Nhỏ", vua: "Vừa", lon: "Lớn" };

export const PIPELINE_NAME_LABEL: Record<PipelineName, string> = {
  extract_entities: "AI trích xuất entity", filter_domain: "Rule engine lọc áp dụng (không AI)", generate_diagnostic: "AI viết checklist",
};

/* ---------- Bổ sung phía UI (không có trong CONTRACT) ---------- */

// domain là text slug tự do (CONTRACT §2). Nhãn cho các giá trị đang dùng; slug lạ hiển thị nguyên văn.
export const KNOWN_DOMAINS = ["thue", "ke_toan", "chung_khoan"] as const;
const DOMAIN_LABEL: Record<string, string> = { thue: "Thuế", ke_toan: "Kế toán", chung_khoan: "Chứng khoán" };
export function domainLabel(slug: string) {
  return DOMAIN_LABEL[slug] ?? slug;
}

export function deptLabel(slug: SlugPhongBan) {
  return PHONG_BAN_LABEL[slug];
}

export function formatDate(iso: string | null) {
  if (!iso) return "Chưa xác định";
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${y}`;
}

// Ngày giờ theo giờ Việt Nam, dạng "dd/MM/yyyy HH:mm" (hoặc kèm giây cho nhật ký).
// Cố định timezone + tự ghép chuỗi để server và client render giống hệt nhau.
export function formatDateTime(iso: string, withSeconds = false) {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Ho_Chi_Minh",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(new Date(iso))
      .map((part) => [part.type, part.value]),
  );
  const time = withSeconds ? `${p.hour}:${p.minute}:${p.second}` : `${p.hour}:${p.minute}`;
  return `${p.day}/${p.month}/${p.year} ${time}`;
}

// Bỏ dấu tiếng Việt → slug a-z/_ (ràng buộc DB cho domain/nganh)
export function toSlug(text: string) {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/[0-9]/g, "")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
}
