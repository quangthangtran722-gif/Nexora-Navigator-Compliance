/*
 * Type dữ liệu — CHÉP NGUYÊN từ docs/CONTRACT.md (schema v3, migration 002_ner_graph.sql, 18/10/2026).
 * CONTRACT.md là nguồn sự thật duy nhất: đổi cột/enum ở đó → sửa file này cho khớp.
 * Nhãn tiếng Việt (*_LABEL) nằm ở lib/labels.ts; 8 mã phòng ban ở lib/department-codes.ts.
 */

import type { SlugPhongBan } from "@/lib/department-codes";

export type { SlugPhongBan };

/* ---------- §2 Enum ---------- */

export type TrangThaiDuyet = "cho_duyet" | "da_duyet" | "tu_choi";

// 4 trạng thái rule engine
export type TrangThaiApDung = "ap_dung" | "sap_ap_dung" | "khong_ap_dung" | "chua_du_thong_tin";

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

export type LoaiRelationship = "bao_ham" | "tham_chieu" | "thay_the" | "dieu_kien" | "che_tai_cua" | "ap_dung_cho";

export type LoaiVanBan = "luat" | "nghi_dinh" | "thong_tu" | "nghi_quyet" | "quyet_dinh" | "huong_dan" | "khac";

export type TrangThaiVanBan = "draft" | "active" | "replaced";

export type PhamViThayThe = "toan_bo" | "mot_phan";

export type TrangThaiChunk = "cho_xu_ly" | "dang_xu_ly" | "da_trich_xuat" | "hoan_tat" | "loi";

export type QuyMo = "nho" | "vua" | "lon";

export type KieuThuocTinh = "boolean" | "number" | "text" | "text_array";

export type PipelineName = "extract_entities" | "filter_domain" | "generate_diagnostic";

export type TrangThaiRun = "cho_xu_ly" | "dang_xu_ly" | "hoan_tat" | "loi";

export type GiaiDoanThongBao = "cho_duyet" | "hoi_bo_sung" | "da_giao";

// domain / domains là text slug (không phải enum) — chỉ a-z và "_". Giá trị đang dùng: thue, ke_toan.

export type Json = string | number | boolean | null | Json[] | { [k: string]: Json };

/* ---------- §3.1 Customer ---------- */

export type Customer = {
  id: string;
  ten_cong_ty: string;
  ma_so_thue?: string | null; // migration 006; optional để không vỡ mock/seed cũ
  nganh: string | null; // slug tự do, vd "thuong_mai_dien_tu"
  quy_mo: QuyMo | null;
  domains: string[]; // lĩnh vực đăng ký theo dõi; [] = chưa chọn
  thuoc_tinh: ThuocTinhKhachHang; // câu trả lời onboarding + hỏi bổ sung
  created_at: string;
  updated_at: string;
};

// key = thuoc_tinh_ho_so.ma. Thiếu key HOẶC null = "Chưa chắc" → rule engine trả chua_du_thong_tin.
export type ThuocTinhKhachHang = Record<string, boolean | number | string | string[] | null>;

/* ---------- §3.2 ThuocTinhHoSo — từ điển câu hỏi onboarding / hỏi bổ sung ---------- */

export type ThuocTinhHoSo = {
  ma: string; // PK, slug
  cau_hoi: string;
  kieu: KieuThuocTinh; // boolean → Có/Không/Chưa chắc; number → ô số; text → chọn 1; text_array → chọn nhiều
  domain: string | null; // null = dùng chung mọi lĩnh vực
  lua_chon: string[] | null; // chỉ cho text/text_array; null = nhập tự do
  don_vi: string | null;
  mo_ta: string | null;
  created_at: string;
};

/* ---------- §3.3 Department ---------- */

export type Department = {
  id: string;
  customer_id: string;
  ten_phong_ban: string; // tên riêng của doanh nghiệp, UNIQUE trong 1 customer
  slug_phong_ban: SlugPhongBan; // map về 8 mã chuẩn để route diagnostic
  email_head: string | null;
  created_at: string;
};

/* ---------- §3.4 Entity ---------- */

export type Entity = {
  id: string;
  chunk_id: string;
  pipeline_run_id: string;
  ma_tam: string; // id tạm AI đặt (e1, e2...) — chỉ để đối chiếu log
  ten_entity: string;
  loai_entity: LoaiEntity;
  mo_ta: string;
  so_dieu: number;
  dieu_khoan: string; // vd "Điều 7, khoản 2"
  noi_dung_goc: string; // trích NGUYÊN VĂN, đã qua grounding — không sửa được
  domain: string; // ∈ van_ban.domains
  primary_departments: SlugPhongBan[]; // chỉ hanh_vi/thoi_han/che_tai/mien_giam có; loại khác luôn []
  secondary_departments: SlugPhongBan[];
  ngay_co_hieu_luc: string | null; // null = theo van_ban.ngay_hieu_luc
  dieu_kien_may_doc: DieuKienMayDoc | null; // chỉ dieu_kien/nguong/chu_the; bắt buộc khi duyệt dieu_kien/nguong
  trang_thai_duyet: TrangThaiDuyet;
  curator_id: string | null;
  ghi_chu_curator: string | null;
  created_at: string;
  updated_at: string;
};

// Điều kiện máy đọc — rule engine (code thuần, KHÔNG AI) so với customers.thuoc_tinh. Curator điền trên màn duyệt.
export type DieuKienMayDoc =
  | { thuoc_tinh: string; toan_tu: "eq" | "neq"; gia_tri: boolean } // kieu boolean
  | { thuoc_tinh: string; toan_tu: "eq" | "neq" | "gt" | "gte" | "lt" | "lte"; gia_tri: number } // kieu number
  | { thuoc_tinh: string; toan_tu: "in" | "not_in"; gia_tri: number[] } // kieu number
  | { thuoc_tinh: string; toan_tu: "eq" | "neq"; gia_tri: string } // kieu text
  | { thuoc_tinh: string; toan_tu: "in" | "not_in"; gia_tri: string[] } // kieu text
  | { thuoc_tinh: string; toan_tu: "contains"; gia_tri: string } // kieu text_array
  | { thuoc_tinh: string; toan_tu: "contains_any"; gia_tri: string[] }; // kieu text_array

/* ---------- §3.5 EntityRelationship + view entity_graph ---------- */

export type EntityRelationship = {
  id: string;
  chunk_id: string;
  pipeline_run_id: string | null; // null = curator tạo tay
  source_entity_id: string;
  target_entity_id: string | null; // null = pending link (đích ngoài chunk / ngoài luật)
  target_ref_text: string | null; // cụm dẫn chiếu nguyên văn khi target null
  loai_relationship: LoaiRelationship;
  can_cu: string; // đoạn nguyên văn thể hiện quan hệ
  nguoi_tao_id: string | null;
  created_at: string;
};

export type EntityGraphRow = {
  relationship_id: string;
  loai_relationship: LoaiRelationship;
  chunk_id: string;
  van_ban_id: string;
  source_id: string;
  source_ten: string;
  source_loai: LoaiEntity;
  source_trang_thai_duyet: TrangThaiDuyet;
  target_id: string | null;
  target_ten: string | null;
  target_loai: LoaiEntity | null;
  target_trang_thai_duyet: TrangThaiDuyet | null;
  target_ref_text: string | null;
  is_pending: boolean;
  can_cu: string;
};

/* ---------- §3.6 Diagnostic — 1 entity hanh_vi × 1 phòng ban × 1 khách hàng ---------- */

export type Diagnostic = {
  id: string;
  customer_id: string;
  entity_id: string; // luôn là hanh_vi đã duyệt
  department_id: string;
  trang_thai_ap_dung: TrangThaiApDung;
  thuoc_tinh_thieu: string[]; // ma thuộc tính cần hỏi bổ sung; ≠ [] khi và chỉ khi chua_du_thong_tin
  noi_dung_diagnostic: string | null; // AI viết; null = chưa generate
  filter_run_id: string;
  generate_run_id: string | null;
  trang_thai_duyet: TrangThaiDuyet;
  nguoi_duyet_id: string | null;
  ghi_chu_duyet: string | null;
  created_at: string;
  updated_at: string;
};

/* ---------- §3.7 PipelineRun ---------- */

export type PipelineRun = {
  id: string;
  pipeline_name: PipelineName;
  chunk_id: string | null; // bắt buộc với extract_entities
  customer_id: string | null; // null với extract_entities; bắt buộc với 2 bước còn lại
  parent_run_id: string | null; // vd generate ← filter đã kích hoạt nó
  trang_thai: TrangThaiRun;
  input: Json;
  output: Json | null; // bắt buộc khi hoan_tat
  model: string | null; // null ⇔ filter_domain
  prompt_version: string | null; // null ⇔ filter_domain
  error_log: string | null; // bắt buộc khi loi
  nguoi_chay_id: string | null;
  started_at: string | null;
  completed_at: string | null; // bắt buộc khi hoan_tat
  created_at: string;
};

/* ---------- §3.8 Notification ---------- */

export type Notification = {
  id: string;
  customer_id: string;
  diagnostic_id: string;
  department_id: string | null; // khác null ⇔ giai_doan = "da_giao"
  giai_doan: GiaiDoanThongBao;
  tieu_de: string;
  noi_dung: string | null;
  da_doc: boolean;
  created_at: string;
};

/* ---------- §3.9 Kho luật (curator) ---------- */

export type VanBan = {
  id: string;
  ten_van_ban: string;
  so_hieu: string; // UNIQUE, vd "109/2025/QH15"
  loai_van_ban: LoaiVanBan;
  co_quan_ban_hanh: string | null;
  ngay_ban_hanh: string | null;
  ngay_hieu_luc: string; // ngày hiệu lực mặc định cho mọi entity
  domains: string[]; // ≥ 1
  trang_thai: TrangThaiVanBan; // khách hàng không thấy draft
  nguoi_tao_id: string | null;
  created_at: string;
  updated_at: string;
};

export type VanBanThayThe = {
  id: string;
  van_ban_moi_id: string;
  van_ban_cu_id: string;
  pham_vi: PhamViThayThe;
  dieu_khoan: string | null; // bắt buộc khi mot_phan
  created_at: string;
};

export type VanBanChunk = {
  id: string;
  van_ban_id: string;
  thu_tu: number; // UNIQUE trong 1 văn bản, ≥ 1
  tieu_de: string | null;
  dieu_khoan_range: string | null; // vd "Điều 7–8"
  noi_dung: string; // 1–2 điều (giới hạn quota Groq)
  trang_thai: TrangThaiChunk;
  created_at: string;
  updated_at: string;
};

export type Approval = {
  id: string;
  entity_id: string | null; // đúng 1 trong 2: entity_id | diagnostic_id
  diagnostic_id: string | null;
  customer_id: string | null; // null khi duyệt entity
  nguoi_duyet_id: string;
  quyet_dinh: "da_duyet" | "tu_choi";
  ghi_chu: string | null;
  created_at: string;
};

// View ner_extraction_summary — 1 row / chunk
export type NerExtractionSummary = {
  chunk_id: string;
  van_ban_id: string;
  so_hieu: string;
  thu_tu: number;
  dieu_khoan_range: string | null;
  trang_thai_chunk: TrangThaiChunk;
  so_entity: number;
  so_cho_duyet: number;
  so_da_duyet: number;
  so_tu_choi: number;
  so_dieu_kien_chua_may_doc: number; // dieu_kien/nguong cho_duyet chưa có dieu_kien_may_doc
  so_can_dieu_kien: number; // dieu_kien/nguong/chu_the cho_duyet chưa có dieu_kien_may_doc — approve_chunk bỏ qua (migration 005)
  theo_loai: Partial<Record<LoaiEntity, number>>;
  so_relationship: number;
  so_pending_link: number;
};

// View van_ban_replacement_chain — chuỗi thay thế đệ quy
export type VanBanReplacementChain = {
  van_ban_goc_id: string;
  so_hieu_goc: string;
  van_ban_id: string;
  so_hieu: string;
  pham_vi: PhamViThayThe;
  dieu_khoan: string | null;
  do_sau: number;
  duong_di: string[];
};

/* ---------- §3.10 Nganh — tra cứu tên ngành (customers.nganh không có FK) ---------- */

export type Nganh = {
  ma: string; // PK, slug = customers.nganh, vd "van_tai_logistics"
  ten_hien_thi: string; // nhãn tiếng Việt, vd "Vận tải & Logistics"
  created_at: string;
};

/* ---------- §4 Vai trò (app_metadata) — chưa nối auth thật ---------- */

export type AppMetadata = { nexora_role: "curator" } | { nexora_role: "customer"; customer_id: string };
