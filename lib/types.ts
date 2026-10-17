/*
 * Type cho UI — BẢN NHÁP, chưa phải schema thật đã chốt.
 * Backend sẽ cập nhật file này cho khớp schema v3 khi mentor duyệt; UI import từ đây,
 * nên chỉ cần sửa 1 chỗ.
 *
 * Entity / EntityRelationship / Diagnostic: chép đúng field shape backend gửi (17/10).
 * Customer / Department: CHƯA có trong bản nháp — tạm lấy theo TEAM_BRIEF 17/10.
 */

export type TrangThaiDuyet = "cho_duyet" | "da_duyet" | "tu_choi";

export type Domain = "thue" | "ke_toan";

export type LoaiEntity =
  | "chu_the"
  | "doi_tuong"
  | "hanh_vi"
  | "che_tai"
  | "dieu_kien"
  | "muc_thue"
  | "thoi_han"
  | "mien_giam"
  | "nguong";

export type LoaiRelationship =
  | "bao_ham"
  | "tham_chieu"
  | "thay_the"
  | "dieu_kien"
  | "che_tai_cua"
  | "ap_dung_cho";

export type TrangThaiApDung = "ap_dung" | "sap_ap_dung" | "khong_ap_dung" | "chua_du_thong_tin";

export type MucAnhHuong = "primary" | "secondary";

export type Entity = {
  id: string;
  chunk_id: string;
  pipeline_run_id: string;
  ten_entity: string;
  loai_entity: LoaiEntity;
  mo_ta: string;
  dieu_khoan: string; // vd "Điều 8"
  noi_dung_goc: string; // trích nguyên văn
  domain: Domain;
  primary_departments: string[];
  secondary_departments: string[];
  ngay_co_hieu_luc: string | null;
  trang_thai_duyet: TrangThaiDuyet;
  curator_id: string | null;
  ghi_chu_curator: string | null;
};

export type EntityRelationship = {
  id: string;
  chunk_id: string;
  pipeline_run_id: string;
  source_entity_id: string;
  target_entity_id: string | null; // null = chờ nối cross-chunk/cross-law → hiện target_ref_text
  target_ref_text: string | null;
  loai_relationship: LoaiRelationship;
  mo_ta: string;
  trang_thai_duyet: TrangThaiDuyet;
};

export type ContextEntity = {
  id: string;
  loai_entity: string;
  ten_entity: string;
  noi_dung_goc: string;
};

// Unique key: (customer_id, entity_id, department_id)
export type Diagnostic = {
  id: string;
  customer_id: string;
  entity_id: string; // chỉ trỏ entity loại hanh_vi
  department_id: string;
  muc_anh_huong: MucAnhHuong;
  trang_thai_ap_dung: TrangThaiApDung;
  noi_dung_diagnostic: string;
  trang_thai_duyet: TrangThaiDuyet;
  nguoi_duyet_id: string | null;
  context_entities?: ContextEntity[]; // thời hạn / chế tài / mức thuế đi kèm
};

/* ---------- Chưa có trong bản nháp — tạm theo TEAM_BRIEF ---------- */

export type Customer = {
  id: string;
  ten_cong_ty: string;
  nganh: string;
  quy_mo: number; // số lượng nhân viên
  domains: Domain[];
  created_at: string;
};

export type Department = {
  id: string;
  customer_id: string;
  ten_phong_ban: string; // tên hiển thị, người dùng tự đặt
  ma_phong_ban: string; // mã chuẩn để route diagnostic — xem lib/department-codes.ts
  email_head: string;
  created_at: string;
};

// Phân quyền giữ nguyên: app_metadata.nexora_role = "curator" | "customer" (+ customer_id)
export type NexoraRole = "curator" | "customer";
