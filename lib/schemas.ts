import { z } from "zod";
import type { Customer, Department, Domain } from "@/lib/types";

/*
 * Schema Zod cho 2 form — BẢN NHÁP, chưa có API thật.
 * Payload bám theo type trong lib/types.ts; khi backend chốt API contract chỉ cần sửa file này.
 */

const DOMAINS = ["thue", "ke_toan"] as const satisfies readonly Domain[];

/* ---------- Onboarding khách hàng (3 bước) ---------- */

// Bước 1 — thông tin công ty (= Customer bỏ id/domains/created_at)
export const onboardingStep1 = z.object({
  ten_cong_ty: z.string().trim().min(2, "Nhập tên công ty"),
  nganh: z.string().trim().min(2, "Nhập ngành kinh doanh"),
  quy_mo: z.string().min(1, "Chọn quy mô"),
});

// Bước 2 — lĩnh vực pháp lý cần theo dõi
export const onboardingStep2 = z.object({
  domains: z.array(z.enum(DOMAINS)).min(1, "Chọn ít nhất 1 lĩnh vực"),
});

// Bước 3 — phòng ban + email trưởng phòng (= Department bỏ id/customer_id/created_at)
export const departmentInput = z.object({
  ten_phong_ban: z.string().trim().min(2, "Nhập tên phòng ban"),
  email_head: z.email("Email không hợp lệ"),
});

export const onboardingStep3 = z.object({
  departments: z
    .array(departmentInput)
    .min(1, "Thêm ít nhất 1 phòng ban")
    .refine(
      (ds) => new Set(ds.map((d) => d.ten_phong_ban.trim().toLowerCase())).size === ds.length,
      "Tên phòng ban bị trùng",
    ),
});

export const onboardingSchema = onboardingStep1.extend(onboardingStep2.shape).extend(onboardingStep3.shape);

export type OnboardingPayload = z.infer<typeof onboardingSchema>;

// Kiểm tra lúc compile: payload phải khớp các field tương ứng của Customer / Department
type _CustomerFields = Pick<Customer, "ten_cong_ty" | "nganh" | "quy_mo" | "domains">;
type _DeptFields = Pick<Department, "ten_phong_ban" | "email_head">;
const _shapeCheck = (p: OnboardingPayload): _CustomerFields & { departments: _DeptFields[] } => p;
void _shapeCheck;

/* ---------- Nhập văn bản luật (curator) ---------- */

// Request trích xuất — CHƯA có trong draft v3, tự định nghĩa theo TEAM_BRIEF (POST /api/pipeline/extract)
export const LOAI_VAN_BAN = ["luat", "nghi_dinh", "thong_tu", "quyet_dinh", "khac"] as const;

export const extractRequestSchema = z.object({
  ten_van_ban: z.string().trim().min(5, "Nhập tên văn bản"),
  so_hieu: z.string().trim().min(3, "Nhập số hiệu, vd 70/2025/NĐ-CP"),
  loai_van_ban: z.enum(LOAI_VAN_BAN, "Chọn loại văn bản"),
  domain: z.enum(DOMAINS, "Chọn lĩnh vực"),
  ngay_co_hieu_luc: z.string().nullable(), // "YYYY-MM-DD" hoặc null nếu chưa rõ
  noi_dung: z.string().trim().min(50, "Dán ít nhất 1 điều luật đầy đủ (tối thiểu 50 ký tự)"),
});

export type ExtractRequest = z.infer<typeof extractRequestSchema>;

/* ---------- Tiện ích: issues Zod → { "departments.0.email_head": "…" } ---------- */

export function toFieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".");
    if (!(key in out)) out[key] = issue.message;
  }
  return out;
}
