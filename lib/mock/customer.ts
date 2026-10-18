import type { Customer, Department } from "@/lib/types";

/*
 * MOCK DATA — khách hàng + phòng ban (CONTRACT §3.1, §3.3). Email dùng domain .example (không có thật).
 * Minh Phát là hồ sơ demo chính; 2 công ty còn lại để màn "Quét lại khách hàng" có nhiều khách hàng.
 */

const T = "2026-10-10T09:00:00Z";

export const mockCustomers: Customer[] = [
  {
    id: "c-minh-phat",
    ten_cong_ty: "Công ty TNHH Thương mại Minh Phát",
    nganh: "thuong_mai_dien_tu",
    quy_mo: "nho",
    domains: ["thue", "ke_toan"],
    thuoc_tinh: {
      kenh_ban_hang: ["shopee", "tiktok_shop"],
      doanh_thu_nam: 15_000_000_000,
      gia_tri_mua_vao_lon_nhat: null, // "Chưa chắc" → e-05 rơi vào chua_du_thong_tin → hỏi bổ sung
      loai_hoa_don: "co_ma",
      dung_phan_mem_ke_toan: true,
      luu_chung_tu_dien_tu: false,
    },
    created_at: T,
    updated_at: T,
  },
  {
    id: "c-an-khang",
    ten_cong_ty: "Công ty CP Dược phẩm An Khang (mẫu)",
    nganh: "duoc_pham",
    quy_mo: "vua",
    domains: ["thue"],
    thuoc_tinh: { kenh_ban_hang: ["cua_hang", "website_rieng"], doanh_thu_nam: 80_000_000_000, gia_tri_mua_vao_lon_nhat: 120_000_000 },
    created_at: T,
    updated_at: T,
  },
  {
    id: "c-hoa-sen",
    ten_cong_ty: "Công ty TNHH Nội thất Hoa Sen (mẫu)",
    nganh: "noi_that",
    quy_mo: "nho",
    domains: ["ke_toan"],
    thuoc_tinh: {},
    created_at: T,
    updated_at: T,
  },
];

function dept(id: string, customer_id: string, ten: string, slug: Department["slug_phong_ban"], email: string | null): Department {
  return { id, customer_id, ten_phong_ban: ten, slug_phong_ban: slug, email_head: email, created_at: T };
}

export const mockDepartments: Department[] = [
  dept("d-ke-toan", "c-minh-phat", "Kế toán", "ke_toan", "ketoan@minhphat.example"),
  dept("d-kinh-doanh", "c-minh-phat", "Kinh doanh", "kinh_doanh", "kinhdoanh@minhphat.example"),
  dept("d-kho-van", "c-minh-phat", "Kho vận", "van_hanh", "khovan@minhphat.example"),
  dept("d-ban-gd", "c-minh-phat", "Ban Giám đốc", "ban_giam_doc", "giamdoc@minhphat.example"),
  dept("d-ak-ke-toan", "c-an-khang", "Phòng Tài chính – Kế toán", "ke_toan", "taichinh@ankhang.example"),
  dept("d-ak-ban-le", "c-an-khang", "Khối Bán lẻ", "kinh_doanh", "banle@ankhang.example"),
  dept("d-ak-ban-gd", "c-an-khang", "Ban Giám đốc", "ban_giam_doc", null),
  dept("d-hs-tai-chinh", "c-hoa-sen", "Phòng Tài chính", "ke_toan", null),
];
