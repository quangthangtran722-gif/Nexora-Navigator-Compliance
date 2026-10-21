import { z } from "zod";

// Taxonomy NER — khớp enum trong DB (schema v3). Đổi ở đây thì đổi cả migration.
export const LOAI_ENTITY = [
  "chu_the",
  "doi_tuong",
  "hanh_vi",
  "che_tai",
  "dieu_kien",
  "muc_thue",
  "thoi_han",
  "mien_giam",
  "nguong",
] as const;

export const LOAI_RELATIONSHIP = [
  "bao_ham",
  "tham_chieu",
  "thay_the",
  "dieu_kien",
  "che_tai_cua",
  "ap_dung_cho",
] as const;

// Slug phòng ban chuẩn — departments.slug_phong_ban của khách hàng phải map về 1 trong các slug này.
export const PHONG_BAN = [
  "ban_giam_doc",
  "ke_toan",
  "nhan_su",
  "kinh_doanh",
  "marketing",
  "cong_nghe",
  "van_hanh",
  "phap_che",
] as const;

export type LoaiEntity = (typeof LOAI_ENTITY)[number];
export type LoaiRelationship = (typeof LOAI_RELATIONSHIP)[number];
export type PhongBan = (typeof PHONG_BAN)[number];

// Groq strict JSON schema: mọi field đều required → field không bắt buộc dùng .nullable(), không dùng .optional().
// domains truyền vào theo van_ban.domains để model chỉ chọn được lĩnh vực của văn bản đang xử lý.
export function buildExtractSchema(domains: readonly [string, ...string[]]) {
  const entity = z.object({
    ma_tam: z.string().describe("ID tạm duy nhất trong chunk: e1, e2, e3..."),
    loai_entity: z.enum(LOAI_ENTITY),
    ten_entity: z.string().describe("Tên ngắn gọn; hanh_vi bắt đầu bằng động từ"),
    mo_ta: z.string().describe("1 câu mô tả, không thêm ý ngoài văn bản"),
    so_dieu: z.number().int().describe("Số điều chứa noi_dung_goc, phải có trong chunk"),
    dieu_khoan: z.string().describe('Vị trí chi tiết, vd "Điều 5, khoản 2, điểm a"'),
    noi_dung_goc: z.string().describe("Chép NGUYÊN VĂN, liên tục từ điều so_dieu"),
    domain: z.enum(domains),
    primary_departments: z.array(z.enum(PHONG_BAN)),
    secondary_departments: z.array(z.enum(PHONG_BAN)),
    ngay_co_hieu_luc: z
      .string()
      .nullable()
      .describe("YYYY-MM-DD chỉ khi điều khoản ghi rõ ngày áp dụng riêng, ngược lại null"),
  });

  const relationship = z.object({
    loai_relationship: z.enum(LOAI_RELATIONSHIP),
    source: z.string().describe("ma_tam của entity nguồn"),
    target: z.string().nullable().describe("ma_tam của entity đích trong chunk; null nếu đích nằm ngoài chunk"),
    target_ref_text: z
      .string()
      .nullable()
      .describe('Cụm dẫn chiếu chép nguyên văn khi target = null, vd "theo quy định tại Điều 12"'),
    can_cu: z.string().describe("Đoạn chép nguyên văn thể hiện quan hệ này"),
  });

  const dieuBoQua = z.object({
    so_dieu: z.number().int(),
    ly_do: z.string().describe("Vì sao điều này không có entity (vd chỉ giải thích từ ngữ)"),
  });

  return z.object({
    entities: z.array(entity),
    relationships: z.array(relationship),
    dieu_bo_qua: z.array(dieuBoQua),
  });
}

// Văn bản chỉ 1 lĩnh vực → bỏ field domain khỏi schema (code tự gán). Enum 1 giá trị không cho model chọn gì,
// nhưng model vẫn hay bỏ sót field → Groq trả 400 "missing properties: 'domain'" (TT 77/2025 chunk Điều 4).
export function buildExtractSchemaMotLinhVuc(domain: string) {
  const full = buildExtractSchema([domain]);
  return full.extend({ entities: z.array(full.shape.entities.element.omit({ domain: true })) });
}

export type ExtractOutput = z.infer<ReturnType<typeof buildExtractSchema>>;
export type ExtractedEntity = ExtractOutput["entities"][number];
export type ExtractedRelationship = ExtractOutput["relationships"][number];
