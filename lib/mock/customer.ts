import type { Customer, Department } from "@/lib/types";

// MOCK DATA — hồ sơ demo Minh Phát theo TEAM_BRIEF 17/10. Email là domain .example (không có thật).

export const mockCustomer: Customer = {
  id: "c-minh-phat",
  ten_cong_ty: "Công ty TNHH Thương mại Minh Phát",
  nganh: "Thương mại điện tử — bán qua Shopee, TikTok Shop",
  quy_mo: "30 nhân viên · doanh thu ~15 tỷ đồng/năm",
  domains: ["thue", "ke_toan"],
  created_at: "2026-10-10T09:00:00Z",
};

export const mockDepartments: Department[] = [
  {
    id: "d-ke-toan",
    customer_id: "c-minh-phat",
    ten_phong_ban: "Kế toán",
    email_head: "ketoan@minhphat.example",
    created_at: "2026-10-10T09:00:00Z",
  },
  {
    id: "d-kinh-doanh",
    customer_id: "c-minh-phat",
    ten_phong_ban: "Kinh doanh",
    email_head: "kinhdoanh@minhphat.example",
    created_at: "2026-10-10T09:00:00Z",
  },
  {
    id: "d-kho-van",
    customer_id: "c-minh-phat",
    ten_phong_ban: "Kho vận",
    email_head: "khovan@minhphat.example",
    created_at: "2026-10-10T09:00:00Z",
  },
  {
    id: "d-ban-gd",
    customer_id: "c-minh-phat",
    ten_phong_ban: "Ban Giám đốc",
    email_head: "giamdoc@minhphat.example",
    created_at: "2026-10-10T09:00:00Z",
  },
];
