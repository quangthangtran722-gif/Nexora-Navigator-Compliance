/*
 * 8 mã phòng ban chuẩn (slug_phong_ban) — CHÉP NGUYÊN từ docs/CONTRACT.md §1.
 * Khớp PHONG_BAN trong lib/pipeline/extractEntities.schema.ts (backend) và enum slug_phong_ban trong DB.
 */

export const PHONG_BAN = ["ban_giam_doc", "ke_toan", "nhan_su", "kinh_doanh", "marketing", "cong_nghe", "van_hanh", "phap_che"] as const;
export type SlugPhongBan = (typeof PHONG_BAN)[number];
export const PHONG_BAN_LABEL: Record<SlugPhongBan, string> = {
  ban_giam_doc: "Ban Giám đốc",
  ke_toan: "Kế toán",
  nhan_su: "Nhân sự",
  kinh_doanh: "Kinh doanh",
  marketing: "Marketing",
  cong_nghe: "Công nghệ thông tin",
  van_hanh: "Vận hành",
  phap_che: "Pháp chế",
};
