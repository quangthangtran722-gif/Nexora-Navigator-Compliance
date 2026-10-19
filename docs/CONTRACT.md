# CONTRACT.md — Hợp đồng dữ liệu backend ↔ frontend (schema v3, chính thức)

> Nguồn sự thật: `supabase/migrations/002_ner_graph.sql` (đã chạy trên Supabase thật ngày 18/10/2026).
> File này thay phần kiểu dữ liệu của `docs/api-contract.md` (bản đó viết cho mô hình `cards/tasks` cũ, đã bỏ).
> Đổi bất kỳ cột/enum nào → phải sửa migration mới + file này trong cùng 1 PR.

**Quy ước chung**

- Tên field = tên cột Postgres (`snake_case`), frontend dùng nguyên, không đổi sang camelCase.
- `uuid` / `date` / `timestamptz` → `string` trong TS. `date` dạng `"YYYY-MM-DD"`, `timestamptz` dạng ISO 8601.
- `T | null` = cột nullable. Không có field `optional` (`?`) — mọi cột luôn có mặt khi `select('*')`.
- Enum lưu bằng **slug ASCII**. Nhãn tiếng Việt để hiển thị nằm ở các bảng `*_LABEL` dưới đây — chỉ dùng cho UI, không gửi lên DB.

---

## 1. 8 mã phòng ban chuẩn (`slug_phong_ban`)

Khớp `PHONG_BAN` trong `lib/pipeline/extractEntities.schema.ts` và enum `slug_phong_ban` trong DB.

| slug | Tên hiển thị |
|---|---|
| `ban_giam_doc` | Ban Giám đốc |
| `ke_toan` | Kế toán |
| `nhan_su` | Nhân sự |
| `kinh_doanh` | Kinh doanh |
| `marketing` | Marketing |
| `cong_nghe` | Công nghệ thông tin |
| `van_hanh` | Vận hành |
| `phap_che` | Pháp chế |

```ts
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
```

---

## 2. Enum

```ts
export type TrangThaiDuyet = "cho_duyet" | "da_duyet" | "tu_choi";
export const TRANG_THAI_DUYET_LABEL: Record<TrangThaiDuyet, string> = {
  cho_duyet: "Chờ duyệt", da_duyet: "Đã duyệt", tu_choi: "Từ chối",
};

// 4 trạng thái rule engine — badge dùng chung cho cả 2 track (BUILD_PROCESS bước 5)
export type TrangThaiApDung = "ap_dung" | "sap_ap_dung" | "khong_ap_dung" | "chua_du_thong_tin";
export const TRANG_THAI_AP_DUNG_LABEL: Record<TrangThaiApDung, string> = {
  ap_dung: "Áp dụng", sap_ap_dung: "Sắp áp dụng", khong_ap_dung: "Không áp dụng", chua_du_thong_tin: "Chưa đủ thông tin",
};

export type LoaiEntity =
  | "chu_the" | "doi_tuong" | "hanh_vi" | "che_tai" | "dieu_kien"
  | "muc_thue" | "thoi_han" | "mien_giam" | "nguong";
export const LOAI_ENTITY_LABEL: Record<LoaiEntity, string> = {
  chu_the: "Chủ thể", doi_tuong: "Đối tượng", hanh_vi: "Hành vi", che_tai: "Chế tài", dieu_kien: "Điều kiện",
  muc_thue: "Mức thuế", thoi_han: "Thời hạn", mien_giam: "Miễn giảm", nguong: "Ngưỡng",
};

export type LoaiRelationship = "bao_ham" | "tham_chieu" | "thay_the" | "dieu_kien" | "che_tai_cua" | "ap_dung_cho";
export const LOAI_RELATIONSHIP_LABEL: Record<LoaiRelationship, string> = {
  bao_ham: "Bao hàm", tham_chieu: "Tham chiếu", thay_the: "Thay thế",
  dieu_kien: "Là điều kiện của", che_tai_cua: "Là chế tài của", ap_dung_cho: "Áp dụng cho",
};

// §3.11 — huong_dan thêm ở migration 004
export type LoaiVanBan = "luat" | "nghi_dinh" | "thong_tu" | "nghi_quyet" | "quyet_dinh" | "huong_dan" | "khac";
export const LOAI_VAN_BAN_LABEL: Record<LoaiVanBan, string> = {
  luat: "Luật", nghi_dinh: "Nghị định", thong_tu: "Thông tư", nghi_quyet: "Nghị quyết", quyet_dinh: "Quyết định",
  huong_dan: "Hướng dẫn", khac: "Khác",
};

export type TrangThaiVanBan = "draft" | "active" | "replaced";
export const TRANG_THAI_VAN_BAN_LABEL: Record<TrangThaiVanBan, string> = {
  draft: "Bản nháp", active: "Đang hiệu lực", replaced: "Đã bị thay thế",
};

export type PhamViThayThe = "toan_bo" | "mot_phan";

export type TrangThaiChunk = "cho_xu_ly" | "dang_xu_ly" | "da_trich_xuat" | "hoan_tat" | "loi";
export const TRANG_THAI_CHUNK_LABEL: Record<TrangThaiChunk, string> = {
  cho_xu_ly: "Chờ xử lý", dang_xu_ly: "Đang trích xuất", da_trich_xuat: "Chờ curator duyệt", hoan_tat: "Hoàn tất", loi: "Lỗi",
};

export type QuyMo = "nho" | "vua" | "lon";
export const QUY_MO_LABEL: Record<QuyMo, string> = { nho: "Nhỏ", vua: "Vừa", lon: "Lớn" };

export type KieuThuocTinh = "boolean" | "number" | "text" | "text_array";

export type PipelineName = "extract_entities" | "filter_domain" | "generate_diagnostic";
export const PIPELINE_NAME_LABEL: Record<PipelineName, string> = {
  extract_entities: "AI trích xuất entity", filter_domain: "Rule engine lọc áp dụng (không AI)", generate_diagnostic: "AI viết checklist",
};

export type TrangThaiRun = "cho_xu_ly" | "dang_xu_ly" | "hoan_tat" | "loi";

export type GiaiDoanThongBao = "cho_duyet" | "hoi_bo_sung" | "da_giao";
```

`domain` / `domains` là **text slug** (không phải enum) để thêm lĩnh vực luật mới không cần migration. Giá trị đang dùng: `thue`, `ke_toan`. Ràng buộc DB: chỉ `a-z` và `_`.

---

## 3. Type chính thức

### 3.1 Customer — bảng `customers`

```ts
export type Customer = {
  id: string;
  ten_cong_ty: string;
  nganh: string | null;          // slug tự do, vd "thuong_mai_dien_tu" — tên hiển thị tra bảng `nganh` (§3.10)
  quy_mo: QuyMo | null;
  domains: string[];             // lĩnh vực đăng ký theo dõi; [] = chưa chọn
  thuoc_tinh: ThuocTinhKhachHang; // câu trả lời onboarding + hỏi bổ sung
  created_at: string;
  updated_at: string;
};

// key = thuoc_tinh_ho_so.ma. Thiếu key HOẶC null = "Chưa chắc" → rule engine trả chua_du_thong_tin.
export type ThuocTinhKhachHang = Record<string, boolean | number | string | string[] | null>;
```

DB kiểm tra khi ghi `thuoc_tinh` (lỗi `PT400`): key phải có trong `thuoc_tinh_ho_so`, giá trị đúng `kieu`, và nằm trong `lua_chon` nếu có.

### 3.2 ThuocTinhHoSo — bảng `thuoc_tinh_ho_so` (từ điển câu hỏi onboarding)

Frontend render form onboarding và câu hỏi "hỏi bổ sung" **từ bảng này**, không hard-code câu hỏi.

```ts
export type ThuocTinhHoSo = {
  ma: string;               // PK, slug
  cau_hoi: string;          // câu hỏi hiển thị
  kieu: KieuThuocTinh;      // boolean → Có/Không/Chưa chắc; number → ô số; text → chọn 1; text_array → chọn nhiều
  domain: string | null;    // null = dùng chung mọi lĩnh vực
  lua_chon: string[] | null; // chỉ cho text/text_array; null = nhập tự do
  don_vi: string | null;    // vd "đồng" cho number
  mo_ta: string | null;
  created_at: string;
};
```

"Chưa chắc" = ghi `null` vào key đó (không xóa key).

### 3.3 Department — bảng `departments`

```ts
export type Department = {
  id: string;
  customer_id: string;
  ten_phong_ban: string;          // tên riêng của doanh nghiệp, UNIQUE trong 1 customer
  slug_phong_ban: SlugPhongBan;   // map về 8 mã chuẩn để route diagnostic
  email_head: string | null;
  created_at: string;
};
```

Nhiều phòng có thể chung 1 slug (vd 2 nhóm kinh doanh) → diagnostic giao tới mỗi phòng một bản.

### 3.4 Entity — bảng `entities`

```ts
export type Entity = {
  id: string;
  chunk_id: string;
  pipeline_run_id: string;
  ma_tam: string;                       // id tạm AI đặt (e1, e2...) — chỉ để đối chiếu log
  ten_entity: string;
  loai_entity: LoaiEntity;
  mo_ta: string;
  so_dieu: number;
  dieu_khoan: string;                   // vd "Điều 7, khoản 2"
  noi_dung_goc: string;                 // trích NGUYÊN VĂN, đã qua grounding — không sửa được
  domain: string;                       // ∈ van_ban.domains
  primary_departments: SlugPhongBan[];  // chỉ hanh_vi/thoi_han/che_tai/mien_giam có; loại khác luôn []
  secondary_departments: SlugPhongBan[];
  ngay_co_hieu_luc: string | null;      // null = theo van_ban.ngay_hieu_luc
  dieu_kien_may_doc: DieuKienMayDoc | null; // chỉ dieu_kien/nguong/chu_the; bắt buộc khi duyệt dieu_kien/nguong
  trang_thai_duyet: TrangThaiDuyet;
  curator_id: string | null;
  ghi_chu_curator: string | null;
  created_at: string;
  updated_at: string;
};

// Điều kiện máy đọc — rule engine (code thuần, KHÔNG AI) so với customers.thuoc_tinh.
// AI không sinh field này; curator điền trên màn duyệt.
export type DieuKienMayDoc =
  | { thuoc_tinh: string; toan_tu: "eq" | "neq"; gia_tri: boolean }                          // kieu boolean
  | { thuoc_tinh: string; toan_tu: "eq" | "neq" | "gt" | "gte" | "lt" | "lte"; gia_tri: number } // kieu number
  | { thuoc_tinh: string; toan_tu: "in" | "not_in"; gia_tri: number[] }                      // kieu number
  | { thuoc_tinh: string; toan_tu: "eq" | "neq"; gia_tri: string }                           // kieu text
  | { thuoc_tinh: string; toan_tu: "in" | "not_in"; gia_tri: string[] }                      // kieu text
  | { thuoc_tinh: string; toan_tu: "contains"; gia_tri: string }                             // kieu text_array
  | { thuoc_tinh: string; toan_tu: "contains_any"; gia_tri: string[] };                      // kieu text_array
```

Ví dụ: ngưỡng "doanh thu năm từ 200 triệu đồng trở xuống" → `{ "thuoc_tinh": "doanh_thu_nam", "toan_tu": "lte", "gia_tri": 200000000 }`.

**Curator được sửa khi còn `cho_duyet`:** `ten_entity, loai_entity, mo_ta, domain, primary_departments, secondary_departments, ngay_co_hieu_luc, dieu_kien_may_doc, ghi_chu_curator`. Sau khi duyệt/từ chối → khóa (`PT409`). `noi_dung_goc, so_dieu, dieu_khoan` không bao giờ sửa được.

**Khách hàng chỉ thấy entity `da_duyet`** (RLS).

### 3.5 EntityRelationship — bảng `entity_relationships`

```ts
export type EntityRelationship = {
  id: string;
  chunk_id: string;
  pipeline_run_id: string | null;   // null = curator tạo tay
  source_entity_id: string;
  target_entity_id: string | null;  // null = pending link (đích ngoài chunk / ngoài luật)
  target_ref_text: string | null;   // cụm dẫn chiếu nguyên văn khi target null
  loai_relationship: LoaiRelationship;
  can_cu: string;                   // đoạn nguyên văn thể hiện quan hệ
  nguoi_tao_id: string | null;
  created_at: string;
};
```

Luôn có ít nhất 1 trong `target_entity_id` / `target_ref_text`. Hướng cạnh: **source → target** (vd `thoi_han —ap_dung_cho→ hanh_vi`, `dieu_kien —dieu_kien→ hanh_vi`, `che_tai —che_tai_cua→ hanh_vi`). Curator nối pending link = cập nhật `target_entity_id` (được phép cả sau khi entity nguồn đã duyệt).

Loại 2 đầu cạnh được chuẩn hóa khi trích xuất (`lib/pipeline/grounding.ts`): `ap_dung_cho` hanh_vi|muc_thue|thoi_han|mien_giam → chu_the|doi_tuong|hanh_vi; `dieu_kien` dieu_kien|nguong → hanh_vi|muc_thue|mien_giam; `che_tai_cua` che_tai → hanh_vi. AI sinh ngược chiều → code tự đảo lại (cảnh báo `dao_chieu_canh` trong `pipeline_runs.output`); sai loại cả 2 chiều → bị loại (`sai_loai_dau_canh`). Curator tạo cạnh tay cũng phải theo đúng chiều này vì rule engine đọc điều kiện theo chiều cạnh.

View đọc tiện cho UI graph — `entity_graph` (mỗi row = 1 cạnh đã join tên 2 đầu):

```ts
export type EntityGraphRow = {
  relationship_id: string;
  loai_relationship: LoaiRelationship;
  chunk_id: string;
  van_ban_id: string;
  source_id: string; source_ten: string; source_loai: LoaiEntity; source_trang_thai_duyet: TrangThaiDuyet;
  target_id: string | null; target_ten: string | null; target_loai: LoaiEntity | null; target_trang_thai_duyet: TrangThaiDuyet | null;
  target_ref_text: string | null;
  is_pending: boolean;
  can_cu: string;
};
```

### 3.6 Diagnostic — bảng `diagnostics`

1 row = 1 entity `hanh_vi` × 1 phòng ban (slug ∈ `primary_departments` của entity) × 1 khách hàng. UNIQUE `(customer_id, entity_id, department_id)`.

```ts
export type Diagnostic = {
  id: string;
  customer_id: string;
  entity_id: string;                    // luôn là hanh_vi đã duyệt
  department_id: string;
  trang_thai_ap_dung: TrangThaiApDung;
  thuoc_tinh_thieu: string[];           // ma thuộc tính cần hỏi bổ sung; ≠ [] khi và chỉ khi chua_du_thong_tin
  noi_dung_diagnostic: string | null;   // AI viết; null = chưa generate
  filter_run_id: string;                // lần rule engine gần nhất
  generate_run_id: string | null;       // lần AI viết nội dung
  trang_thai_duyet: TrangThaiDuyet;
  nguoi_duyet_id: string | null;
  ghi_chu_duyet: string | null;
  created_at: string;
  updated_at: string;
};
```

Ngữ cảnh hiển thị kèm (thời hạn, chế tài, mức thuế, trích dẫn gốc) lấy qua `entity_id` → `entities` + `entity_graph` (cạnh có `target_id = entity_id`).

Vòng đời:

| trang_thai_ap_dung | noi_dung_diagnostic | Ai làm gì |
|---|---|---|
| `chua_du_thong_tin` | null | UI hiện câu hỏi (`thuoc_tinh_thieu` → `thuoc_tinh_ho_so.cau_hoi`). Trả lời → ghi `customers.thuoc_tinh` → gọi lại filter cho riêng entity đó |
| `ap_dung` / `sap_ap_dung` | null | chờ AI generate |
| `ap_dung` / `sap_ap_dung` | có | người đầu mối duyệt qua `approve_diagnostic` |
| `khong_ap_dung` | bất kỳ | chỉ xuất hiện khi quét lại làm 1 mục cũ hết áp dụng; UI ẩn hoặc gạch đi |

Chỉ duyệt được (`da_duyet`) khi `ap_dung`/`sap_ap_dung` và đã có nội dung. Sau khi duyệt/từ chối → khóa.

### 3.7 PipelineRun — bảng `pipeline_runs`

```ts
export type PipelineRun = {
  id: string;
  pipeline_name: PipelineName;
  chunk_id: string | null;        // bắt buộc với extract_entities
  customer_id: string | null;     // null với extract_entities; bắt buộc với 2 bước còn lại
  parent_run_id: string | null;   // vd generate ← filter đã kích hoạt nó
  trang_thai: TrangThaiRun;
  input: Json;
  output: Json | null;            // bắt buộc khi hoan_tat
  model: string | null;           // null ⇔ filter_domain (rule engine không AI); 2 bước AI luôn có, vd "openai/gpt-oss-120b"
  prompt_version: string | null;  // null ⇔ filter_domain; vd "extract-v2"
  error_log: string | null;       // bắt buộc khi loi
  nguoi_chay_id: string | null;
  started_at: string | null;
  completed_at: string | null;    // bắt buộc khi hoan_tat
  created_at: string;
};
export type Json = string | number | boolean | null | Json[] | { [k: string]: Json };
```

`output` của `extract_entities` chứa kết quả grounding: `{ entities, relationships, rejected, warnings, soEntityTheoDieu }` (xem `GroundingResult` trong `lib/pipeline/grounding.ts`) — dùng cho màn "minh bạch" khi demo. Đã `hoan_tat`/`loi` thì không sửa được.

### 3.8 Notification — bảng `notifications`

```ts
export type Notification = {
  id: string;
  customer_id: string;
  diagnostic_id: string;
  department_id: string | null;   // khác null ⇔ giai_doan = "da_giao"
  giai_doan: GiaiDoanThongBao;
  tieu_de: string;
  noi_dung: string | null;
  da_doc: boolean;
  created_at: string;
};
```

| giai_doan | Tạo khi | Người nhận |
|---|---|---|
| `hoi_bo_sung` | diagnostic chuyển sang `chua_du_thong_tin` (`noi_dung` = danh sách mã thuộc tính thiếu) | người đầu mối |
| `cho_duyet` | AI vừa điền `noi_dung_diagnostic` | người đầu mối |
| `da_giao` | người đầu mối duyệt diagnostic | phòng ban `department_id` |

Chỉ trigger/function tạo notification. Client chỉ được `update({ da_doc: true })`.

### 3.9 Kho luật (curator)

```ts
export type VanBan = {
  id: string;
  ten_van_ban: string;
  so_hieu: string;              // UNIQUE, vd "109/2025/QH15"
  loai_van_ban: LoaiVanBan;
  co_quan_ban_hanh: string | null;
  ngay_ban_hanh: string | null;
  ngay_hieu_luc: string;        // ngày hiệu lực mặc định cho mọi entity
  domains: string[];            // ≥ 1
  trang_thai: TrangThaiVanBan;  // khách hàng không thấy draft
  nguoi_tao_id: string | null;
  created_at: string;
  updated_at: string;
};

export type VanBanThayThe = {
  id: string;
  van_ban_moi_id: string;
  van_ban_cu_id: string;
  pham_vi: PhamViThayThe;
  dieu_khoan: string | null;    // bắt buộc khi mot_phan
  created_at: string;
};

export type VanBanChunk = {
  id: string;
  van_ban_id: string;
  thu_tu: number;               // UNIQUE trong 1 văn bản, ≥ 1
  tieu_de: string | null;
  dieu_khoan_range: string | null; // vd "Điều 7–8"
  noi_dung: string;             // 1–2 điều (giới hạn quota Groq)
  trang_thai: TrangThaiChunk;
  created_at: string;
  updated_at: string;
};

export type Approval = {
  id: string;
  entity_id: string | null;      // đúng 1 trong 2: entity_id | diagnostic_id
  diagnostic_id: string | null;
  customer_id: string | null;    // null khi duyệt entity
  nguoi_duyet_id: string;
  quyet_dinh: "da_duyet" | "tu_choi";
  ghi_chu: string | null;
  created_at: string;
};
```

View cho màn curator:

```ts
// ner_extraction_summary — 1 row / chunk
export type NerExtractionSummary = {
  chunk_id: string; van_ban_id: string; so_hieu: string; thu_tu: number;
  dieu_khoan_range: string | null; trang_thai_chunk: TrangThaiChunk;
  so_entity: number; so_cho_duyet: number; so_da_duyet: number; so_tu_choi: number;
  so_dieu_kien_chua_may_doc: number;          // > 0 thì approve_chunk sẽ bị từ chối
  theo_loai: Partial<Record<LoaiEntity, number>>;
  so_relationship: number; so_pending_link: number;
};

// van_ban_replacement_chain — chuỗi thay thế đệ quy
export type VanBanReplacementChain = {
  van_ban_goc_id: string; so_hieu_goc: string;
  van_ban_id: string; so_hieu: string;
  pham_vi: PhamViThayThe; dieu_khoan: string | null;
  do_sau: number; duong_di: string[];
};
```

> Lưu ý PostgREST: cột `count(*)` trong view trả về **bigint** → supabase-js có thể nhận `number` hoặc `string` tùy client config. Hiện tại số lượng nhỏ nên là `number`.

### 3.10 Nganh — bảng `nganh` (tra cứu tên ngành)

```ts
export type Nganh = {
  ma: string;            // PK, slug = customers.nganh, vd "van_tai_logistics"
  ten_hien_thi: string;  // nhãn tiếng Việt, vd "Vận tải & Logistics"
  created_at: string;
};
```

Đọc: `supabase.from("nganh").select("ma, ten_hien_thi")` (mọi user đăng nhập; curator thêm/sửa). `customers.nganh` **không có FK** sang bảng này (onboarding cho nhập tự do) → mã không có trong bảng thì hiện nguyên mã làm fallback. Form onboarding có thể dùng bảng này làm danh sách gợi ý.

### 3.11 Loại văn bản — cột `van_ban.loai_van_ban`

Enum Postgres `public.loai_van_ban`, **bắt buộc** khi tạo văn bản (không có default). Chỉ để phân loại/hiển thị — rule engine và pipeline **không** đổi hành vi theo loại.

| Giá trị | Nhãn | Mô tả |
|---|---|---|
| `luat` | Luật | Do Quốc hội ban hành; quy định khung, thường cần nghị định/thông tư hướng dẫn mới áp dụng chi tiết được. |
| `nghi_dinh` | Nghị định | Do Chính phủ ban hành; quy định chi tiết thi hành luật. |
| `thong_tu` | Thông tư | Do Bộ trưởng/Thủ trưởng cơ quan ngang bộ ban hành; hướng dẫn thi hành nghị định/luật, thường nêu thủ tục, biểu mẫu, thời hạn cụ thể. |
| `nghi_quyet` | Nghị quyết | Của Quốc hội, Ủy ban Thường vụ Quốc hội, Chính phủ hoặc HĐND; quyết định chủ trương hoặc quy định có hiệu lực áp dụng. |
| `quyet_dinh` | Quyết định | Của Thủ tướng, Bộ trưởng hoặc UBND; thường áp dụng cho trường hợp/phạm vi cụ thể. |
| `huong_dan` | Hướng dẫn | Công văn/văn bản hướng dẫn nghiệp vụ của cơ quan nhà nước (vd công văn của Tổng cục Thuế) — không phải văn bản quy phạm pháp luật nhưng doanh nghiệp vẫn cần theo. |
| `khac` | Khác | Loại chưa có ở trên, hoặc dữ liệu demo. |

Dữ liệu demo: `DEMO-01/2026` = `nghi_dinh` (active), `TT-DEMO-01/2026` = `thong_tu` (draft) — thông tư mẫu hướng dẫn DEMO-01, dẫn chiếu "Điều X Nghị định mẫu DEMO-01/2026" để test cross-reference: extract ra cạnh `tham_chieu` pending (`target_ref_text`), curator nối sang entity của DEMO-01 bằng cách cập nhật `target_entity_id` (đích được phép thuộc văn bản khác).

---

## 4. Vai trò & quyền (RLS ở DB — frontend không tự kiểm quyền)

Vai trò đọc từ `user.app_metadata` (chỉ service role gán được):

```ts
type AppMetadata = { nexora_role: "curator" } | { nexora_role: "customer"; customer_id: string };
```

| Bảng | Khách hàng (đầu mối) | Curator |
|---|---|---|
| `van_ban`, `van_ban_chunks` | đọc (trừ draft) | đọc/tạo/sửa |
| `thuoc_tinh_ho_so`, `van_ban_thay_the` | đọc | đọc/tạo/sửa |
| `entities`, `entity_relationships` | đọc phần `da_duyet` | đọc/tạo/sửa draft |
| `customers` | đọc/sửa của mình | đọc/tạo/sửa tất cả |
| `departments` | đọc/tạo/sửa của mình | đọc |
| `diagnostics` | đọc/tạo/sửa draft của mình | đọc/tạo/sửa draft (nút "Quét lại") |
| `pipeline_runs` | đọc của mình | đọc tất cả |
| `approvals` | đọc của mình | đọc tất cả |
| `notifications` | đọc + `da_doc` của mình | — |

Không ai DELETE được dữ liệu (trừ curator xóa cạnh/thay thế khi entity nguồn còn draft). Không có đường nào đổi `trang_thai_duyet` ngoài 3 function dưới.

---

## 5. Function duyệt (RPC) — cửa duy nhất đổi `trang_thai_duyet`

Gọi bằng supabase-js với session người dùng (không dùng service role — sẽ bị `401`).

```ts
// Curator duyệt 1 entity
supabase.rpc("approve_entity", { p_entity_id: string, p_quyet_dinh: "da_duyet" | "tu_choi", p_ghi_chu?: string }) // → Entity

// Curator duyệt TẤT CẢ entity còn cho_duyet trong 1 chunk (từ chối lẻ trước, rồi duyệt phần còn lại)
supabase.rpc("approve_chunk", { p_chunk_id: string, p_ghi_chu?: string }) // → number (số entity vừa duyệt)

// Người đầu mối duyệt 1 diagnostic; p_department_id để đổi phòng nhận việc
supabase.rpc("approve_diagnostic", { p_diagnostic_id: string, p_quyet_dinh: "da_duyet" | "tu_choi", p_department_id?: string, p_ghi_chu?: string }) // → Diagnostic
```

Chunk tự chuyển `hoan_tat` khi không còn entity `cho_duyet`.

---

## 6. Mã lỗi (HTTP status từ PostgREST)

| Code | HTTP | Nghĩa | UI nên |
|---|---|---|---|
| `PT400` | 400 | dữ liệu sai nghiệp vụ (thiếu `dieu_kien_may_doc`, thuộc tính sai kiểu, phòng ban không thuộc DN...) | hiện `message` (tiếng Việt) |
| `PT401` | 401 | chưa đăng nhập | về trang login |
| `PT403` | 403 | sai vai trò (khách hàng duyệt entity, curator duyệt diagnostic...) | ẩn nút |
| `PT404` | 404 | không tìm thấy (hoặc của khách hàng khác) | |
| `PT409` | 409 | đã có người duyệt trước / bản ghi đã khóa | reload bản ghi |
| `42501` | 401/403 | RLS/GRANT chặn | lỗi lập trình — không nên xảy ra |
| `23505` | 409 | trùng UNIQUE | |
| `23514` | 400 | vi phạm CHECK | lỗi lập trình |

---

## 7. API pipeline (Next.js route — backend đang build, frontend dùng mock theo đúng shape này)

Mọi route ghi 1 row `pipeline_runs` và trả `run_id`. Gọi kèm session người dùng.

```ts
// Curator — AI trích xuất 1 chunk (chậm ~10s, quota 8K token/phút → gọi tuần tự)
POST /api/pipeline/extract   body { chunk_id: string }
  → 200 { run_id: string; so_entity: number; so_relationship: number; so_bi_loai: number; so_canh_bao: number }

// Rule engine (KHÔNG AI). entity_id có = chỉ chạy lại cho 1 entity (sau khi trả lời hỏi bổ sung)
POST /api/pipeline/filter    body { customer_id: string; entity_id?: string }
  → 200 { run_id: string; ket_qua: { entity_id: string; trang_thai_ap_dung: TrangThaiApDung; thuoc_tinh_thieu: string[]; diagnostic_ids: string[] }[] }

// AI viết nội dung cho các diagnostic ap_dung/sap_ap_dung chưa có nội dung
POST /api/pipeline/generate  body { customer_id: string; diagnostic_ids?: string[] }
  → 200 { run_id: string; so_diagnostic: number }

// Curator — nút "Quét lại khách hàng hiện có" (CLAUDE.md mục 8) = filter cho từng customer
POST /api/pipeline/rescan    body {}
  → 200 { run_ids: string[] }
```

Lỗi: `{ error: string; code?: string }` với status như mục 6.

**Ghi chú triển khai** (bổ sung 18/10/2026; shape request/response ở trên giữ nguyên):

- **Xác thực:** gửi header `Authorization: Bearer <session.access_token>`. Lấy token qua `(await supabase.auth.getSession()).data.session.access_token`. Thiếu token hoặc token hết hạn → `401 PT401`. Route chạy bằng chính JWT người gọi nên RLS áp dụng y như khi gọi Supabase trực tiếp; route không dùng service role.
- **Quyền:**
  - `extract`, `rescan`: chỉ curator (`403 PT403`).
  - `filter`, `generate`: curator, hoặc khách hàng có `customer_id` trùng với `customer_id` trong body.
- **Mã lỗi riêng của route:**

  | Status | code | Khi nào |
  |---|---|---|
  | `429` | `AI_RATE_LIMIT` | Groq hết quota 8K token/phút → đợi khoảng 1 phút rồi gọi lại |
  | `502` | `AI_ERROR` | Groq lỗi khác |
  | `409` | `PT409` | `extract` gọi vào chunk đang chạy hoặc đã có entity. Chỉ chunk `cho_xu_ly`/`loi` chưa có entity mới trích xuất được |

- **Trạng thái chunk:** sau `extract`, chunk chuyển `da_trich_xuat`. Nếu không có entity nào qua grounding, chunk chuyển thẳng `hoan_tat`. Lỗi thì chunk chuyển `loi`.
- **`filter` → `ket_qua`:** gồm mọi hanh_vi đã duyệt thuộc văn bản `active`, kể cả mục `khong_ap_dung` (lúc đó `diagnostic_ids` có thể là `[]`). Chi tiết từng điều kiện đã đánh giá (thuộc tính, toán tử, giá trị khách hàng, đúng/sai/thiếu) nằm trong `pipeline_runs.output.ket_qua` của `run_id`, dùng cho màn "vì sao áp dụng".
- **`generate`:**
  - Mỗi lần gọi xử lý tối đa 6 diagnostic (giới hạn quota). Còn dư thì gọi lại cho tới khi `so_diagnostic = 0`.
  - Code loại mọi bản AI viết có con số không có trong văn bản gốc; mục bị loại giữ `noi_dung_diagnostic = null`, lý do ghi ở `pipeline_runs.output.chi_tiet`.
  - Dòng "Căn cứ: …" do code ghép từ DB, không lấy từ AI.
- **Thứ tự gọi:** `filter` không tự gọi `generate`. Frontend gọi `generate` sau `filter` khi có `ap_dung`/`sap_ap_dung`.

### Quy tắc rule engine (để frontend giải thích được kết quả)

Với mỗi entity `hanh_vi` đã duyệt, thuộc văn bản `active`:

1. `entity.domain ∉ customer.domains` → `khong_ap_dung` (không tạo diagnostic).
2. Điều kiện = mọi entity `dieu_kien`/`nguong` đã duyệt có cạnh `dieu_kien → hanh_vi`, cộng `chu_the` đã duyệt có cạnh `hanh_vi → ap_dung_cho → chu_the` và có `dieu_kien_may_doc`. Các điều kiện nối bằng AND.
3. Có điều kiện sai → `khong_ap_dung`. Không sai nhưng thiếu dữ liệu (key thiếu/null) → `chua_du_thong_tin` + `thuoc_tinh_thieu`. Tất cả đúng (hoặc không có điều kiện) → bước 4.
4. Ngày hiệu lực = `entity.ngay_co_hieu_luc ?? van_ban.ngay_hieu_luc`; > hôm nay → `sap_ap_dung`, ngược lại `ap_dung`.

   _Thuộc tính rule engine thấy_ = `customers.thuoc_tinh` + key ảo `nganh` lấy từ cột `customers.nganh` (`thuocTinhRuleEngine`). Curator viết được `{ "thuoc_tinh": "nganh", "toan_tu": "eq", "gia_tri": "chung_khoan" }` (từ điển có row `nganh`); form onboarding / Tổng quan **không** render row `nganh` vì đã có field Ngành riêng.
5. Tạo/cập nhật 1 diagnostic cho mỗi `department` có `slug_phong_ban ∈ entity.primary_departments`. Doanh nghiệp không có phòng nào khớp → giao phòng `ban_giam_doc`; không có cả phòng đó → không tạo, `diagnostic_ids: []` (UI nhắc khách hàng thêm phòng ban).
