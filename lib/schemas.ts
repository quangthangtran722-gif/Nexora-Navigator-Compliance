import { z } from "zod";
import { PHONG_BAN } from "@/lib/department-codes";
import type { ChunkInput, OnboardingInput, VanBanInput } from "@/lib/data/mutations";

/*
 * Schema Zod cho 2 form — bám type CONTRACT.md §3 (lib/types.ts).
 * Có kiểm tra lúc compile: output của schema phải gán được cho input của lệnh ghi (lib/data/mutations.ts).
 */

// domain / domains / nganh là text slug: chỉ a-z và "_" (CONTRACT §2)
const slug = z.string().regex(/^[a-z_]+$/, "Chỉ dùng chữ thường không dấu và dấu _");

/* ---------- Onboarding khách hàng (4 bước) ---------- */

export const onboardingStep1 = z.object({
  ten_cong_ty: z.string().trim().min(2, "Nhập tên công ty"),
  nganh: slug.nullable(), // null = chưa khai
  quy_mo: z.enum(["nho", "vua", "lon"]).nullable(),
});

export const onboardingStep2 = z.object({
  domains: z.array(slug).min(1, "Chọn ít nhất 1 lĩnh vực"),
});

// Bước 3 — câu trả lời hồ sơ: kiểm tra chi tiết (đúng kiểu, trong lua_chon) ở validateThuocTinh, giống DB (PT400)
export const onboardingStep3 = z.object({
  thuoc_tinh: z.record(z.string(), z.union([z.boolean(), z.number(), z.string(), z.array(z.string()), z.null()])),
});

export const departmentInput = z.object({
  ten_phong_ban: z.string().trim().min(2, "Nhập tên phòng ban"), // tên riêng của doanh nghiệp
  slug_phong_ban: z.enum(PHONG_BAN, "Chọn mã phòng ban chuẩn"), // 1 trong 8 mã — để route diagnostic
  email_head: z.union([z.email("Email không hợp lệ"), z.literal("").transform(() => null)]).nullable(),
});

export const onboardingStep4 = z.object({
  departments: z
    .array(departmentInput)
    .min(1, "Thêm ít nhất 1 phòng ban")
    .refine(
      (ds) => new Set(ds.map((d) => d.ten_phong_ban.trim().toLowerCase())).size === ds.length,
      "Tên phòng ban bị trùng (UNIQUE trong 1 doanh nghiệp)",
    ),
});

export const onboardingSchema = onboardingStep1.extend(onboardingStep2.shape).extend(onboardingStep3.shape).extend(onboardingStep4.shape);
export type OnboardingPayload = z.infer<typeof onboardingSchema>;
const _onboardingCheck = (p: OnboardingPayload): OnboardingInput => p;
void _onboardingCheck;

/* ---------- Curator nhập văn bản: van_ban + van_ban_chunks (CONTRACT §3.9) ---------- */

export const vanBanSchema = z.object({
  ten_van_ban: z.string().trim().min(5, "Nhập tên văn bản"),
  so_hieu: z.string().trim().min(3, "Nhập số hiệu, vd 109/2025/QH15"),
  loai_van_ban: z.enum(["luat", "nghi_dinh", "thong_tu", "nghi_quyet", "quyet_dinh", "khac"], "Chọn loại văn bản"),
  co_quan_ban_hanh: z.string().trim().nullable(),
  ngay_ban_hanh: z.string().nullable(),
  ngay_hieu_luc: z.string().min(1, "Nhập ngày hiệu lực — mặc định cho mọi entity của văn bản"),
  domains: z.array(slug).min(1, "Chọn ít nhất 1 lĩnh vực"),
});

// Mỗi chunk 1–2 điều (giới hạn quota Groq) — 1 lần gọi /api/pipeline/extract
export const chunkSchema = z.object({
  tieu_de: z.string().trim().nullable(),
  dieu_khoan_range: z.string().trim().nullable(),
  noi_dung: z.string().trim().min(50, "Dán nguyên văn 1–2 điều (tối thiểu 50 ký tự)").max(6000, "Chunk quá dài — tách thành nhiều chunk (1–2 điều/chunk)"),
});

export const nhapVanBanSchema = z.object({
  van_ban: vanBanSchema,
  chunks: z.array(chunkSchema).min(1, "Thêm ít nhất 1 chunk"),
});
export type NhapVanBanPayload = z.infer<typeof nhapVanBanSchema>;
const _vbCheck = (p: NhapVanBanPayload): { van_ban: VanBanInput; chunks: ChunkInput[] } => p;
void _vbCheck;

/* ---------- Tiện ích: issues Zod → { "departments.0.email_head": "…" } ---------- */

export function toFieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".");
    if (!(key in out)) out[key] = issue.message;
  }
  return out;
}
