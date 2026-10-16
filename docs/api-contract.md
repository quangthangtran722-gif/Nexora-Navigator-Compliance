# API contract — Nexora Compliance Navigator

> Bước 4 trong `docs/BUILD_PROCESS.md`. Hợp đồng giữa 2 track: cả 2 build UI bằng mock data
> theo đúng file này, sau đó chỉ đổi mock → API thật, **không đổi cấu trúc**.
> Đổi contract = báo người kia trước, sửa file này trong cùng PR.
>
> Schema DB: `supabase/schema.sql`. Thẻ mẫu: `supabase/seed.sql`.

---

## 1. Quy ước chung

- **Auth:** mọi endpoint yêu cầu đăng nhập Supabase Auth (cookie session). API route tạo Supabase client **bằng JWT của người dùng**, không dùng service role, để RLS tự tách quyền (CLAUDE.md mục 10). Route không tự check quyền ở tầng application.
- **Vai trò** đọc từ `app_metadata` trong JWT: `nexora_role: "curator"` hoặc `nexora_role: "customer"` + `customer_id`.
- **Tên field** trong request/response = tên cột DB (`snake_case`). Riêng 4 nhóm onboarding viết `nhom_a … nhom_d` (chữ thường, khớp cột DB) thay cho `nhom_A … nhom_D` trong khung BUILD_PROCESS.md.
- **Ngày:** `date` = `"YYYY-MM-DD"`, `timestamp` = ISO 8601 (`"2026-10-16T09:00:00Z"`).
- **Lỗi** luôn có dạng:

```json
{ "error": { "code": "CONFLICT", "message": "Thẻ không còn ở trạng thái \"Chờ duyệt\"" } }
```

| HTTP | `code` | Khi nào |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Body sai Zod schema, thiếu `phong_ban` khi duyệt task… |
| 401 | `UNAUTHENTICATED` | Chưa đăng nhập |
| 403 | `FORBIDDEN` | Sai vai trò (vd customer gọi endpoint curator) |
| 404 | `NOT_FOUND` | Không tồn tại **hoặc** thuộc khách hàng khác (không phân biệt, để không lộ dữ liệu) |
| 409 | `CONFLICT` | Đã duyệt/từ chối rồi, task trùng, sửa thẻ/task đã xử lý |
| 502 | `AI_ERROR` | Groq lỗi / output không qua được Zod schema (vẫn ghi `pipeline_runs` với `thanh_cong: false`) |

DB raise lỗi dạng `PTxxx` → supabase-js trả `error.code = "PT409"` … → route map sang HTTP tương ứng trong bảng trên.

- **Mọi lần gọi `/api/pipeline/*` đều ghi 1 dòng `pipeline_runs`** và trả về `pipeline_run_id`. Bước `filter` ghi `model: null` (rule engine không gọi AI, DB có constraint ép điều này).

---

## 2. Kiểu dữ liệu dùng chung

```ts
type TrangThaiDuyet   = "Chờ duyệt" | "Đã duyệt" | "Từ chối";
type TrangThaiHieuLuc = "Sắp áp dụng" | "Đang áp dụng" | "Hết hiệu lực";
type TrangThaiApDung  = "Áp dụng" | "Sắp áp dụng" | "Không áp dụng" | "Chưa đủ thông tin";

// Giá trị điều kiện: boolean = profile phải bằng đúng; string[] = profile phải nằm trong danh sách; null = không ràng buộc
type DieuKienApDung = Record<string, boolean | string[] | null>;

type Card = {
  id: string;
  noi_dung_goc: string;
  dieu_khoan: string;
  cum_phap_ly: string;
  dieu_kien_ap_dung: DieuKienApDung;
  noi_dung_viet_lai: string | null;
  ngay_co_hieu_luc: string | null;          // bắt buộc có khi "Đã duyệt"
  trang_thai_hieu_luc: TrangThaiHieuLuc;
  thay_the_boi: string | null;
  trang_thai_duyet: TrangThaiDuyet;
  curator_id: string | null;
  created_at: string;
};

type PhongBan = { ma: string; ten: string; nguoi_dau_moi: string; email?: string };

type CustomerProfile = {
  id: string;
  customer_id: string;
  nhom_a: Record<string, unknown>;          // ten_cong_ty, nganh, quy_mo_nhan_su
  nhom_b: Record<string, boolean | string[] | null>;  // dữ liệu xử lý — gatekeeper
  nhom_c: Record<string, unknown>;          // vi_tri_server, dich_vu_cloud, doi_tac_truy_cap
  nhom_d: { phong_ban: PhongBan[] };
  updated_at: string;
};

type Task = {
  id: string;
  card_id: string;
  customer_id: string;
  trang_thai_ap_dung: "Áp dụng" | "Sắp áp dụng";
  noi_dung_task: string;
  phong_ban: string | null;                 // = PhongBan.ma, bắt buộc khi duyệt
  trang_thai_duyet: TrangThaiDuyet;
  nguoi_duyet_id: string | null;
  created_at: string;
  updated_at: string;
};

type KetQuaApDung = {
  card_id: string;
  dieu_khoan: string;
  trang_thai: TrangThaiApDung;
  thieu_thong_tin: string[];   // key profile còn thiếu/null → sinh câu hỏi bổ sung (chỉ có khi "Chưa đủ thông tin")
  khong_khop: string[];        // key profile có giá trị nhưng trượt điều kiện (chỉ có khi "Không áp dụng")
};

type Notification = {
  id: string;
  customer_id: string;
  task_id: string | null;
  giai_doan: "cho_duyet" | "da_giao";
  phong_ban: string | null;   // null = gửi người đầu mối tuân thủ
  tieu_de: string;
  noi_dung: string | null;
  da_doc: boolean;
  created_at: string;
};
```

---

## 3. Quy tắc rule engine — `filterApplicability.ts` (thuần code, KHÔNG gọi AI)

Đây là format `dieu_kien_ap_dung` cả 2 track phải bám. **Team cần xác nhận trước khi Track B code.**

1. Gộp phẳng `nhom_a + nhom_b + nhom_c` của profile thành 1 object. Tên key **không trùng** giữa các nhóm. `nhom_d` không dùng để lọc.
2. Chỉ xét thẻ `trang_thai_duyet = "Đã duyệt"` và `trang_thai_hieu_luc <> "Hết hiệu lực"`.
3. Với từng key trong `dieu_kien_ap_dung` (nối bằng **AND**):
   - Giá trị điều kiện là `null` → bỏ qua key đó.
   - Profile thiếu key hoặc giá trị `null` (= trả lời "Chưa chắc") → đưa key vào `thieu_thong_tin`.
   - Điều kiện `boolean` → profile phải `===` giá trị đó, không thì đưa key vào `khong_khop`.
   - Điều kiện `string[]` → giá trị profile (string) phải nằm trong mảng; nếu giá trị profile là mảng thì chỉ cần giao nhau khác rỗng. Không thỏa → `khong_khop`.
4. Kết luận theo thứ tự ưu tiên:
   1. `khong_khop` khác rỗng → **"Không áp dụng"**. Một điều kiện đã trượt chắc chắn thì không cần hỏi thêm.
   2. `thieu_thong_tin` khác rỗng → **"Chưa đủ thông tin"**.
   3. `ngay_co_hieu_luc <= hôm nay` → **"Áp dụng"**, ngược lại → **"Sắp áp dụng"**.
5. `dieu_kien_ap_dung = {}` → áp dụng cho mọi khách hàng (chỉ còn xét ngày).

---

## 4. Endpoint

### Track A — kho thẻ (curator)

#### `POST /api/pipeline/extract` — AI trích xuất thẻ draft
Chỉ curator gọi được.
```
body: { van_ban_luat: string, ten_van_ban?: string }
→ 200 {
    pipeline_run_id: string,
    cards: Card[]              // đã insert vào DB, tất cả trang_thai_duyet = "Chờ duyệt", curator_id = null
  }
→ 502 AI_ERROR
```

#### `GET /api/cards` — danh sách thẻ
```
query: ?trang_thai_duyet=Chờ duyệt&cum_phap_ly=bao_ve_du_lieu_ca_nhan   (đều optional)
→ 200 { cards: Card[] }      // customer chỉ nhận thẻ "Đã duyệt" (RLS)
```

#### `GET /api/cards/:id`
```
→ 200 { card: Card }
→ 404
```

#### `PATCH /api/cards/:id` — curator sửa draft trước khi duyệt
```
body: Partial<Pick<Card, "noi_dung_goc" | "dieu_khoan" | "cum_phap_ly" | "dieu_kien_ap_dung"
                        | "noi_dung_viet_lai" | "ngay_co_hieu_luc" | "trang_thai_hieu_luc">>
→ 200 { card: Card }
→ 409 nếu thẻ đã "Đã duyệt"/"Từ chối" (nội dung bị khóa — sửa luật = tạo thẻ mới + thay_the_boi)
```

#### `POST /api/cards/:id/approve` — curator duyệt thẻ
Gọi `rpc("approve_card", { p_card_id, p_quyet_dinh: "Đã duyệt", p_ghi_chu })`.
```
body: { ghi_chu?: string }
→ 200 { id, trang_thai_duyet: "Đã duyệt", curator_id }
→ 409 nếu thẻ không còn ở trạng thái "Chờ duyệt" (2 curator duyệt cùng lúc → người sau nhận 409)
```

#### `POST /api/cards/:id/reject` — curator từ chối thẻ
```
body: { ghi_chu: string }    // bắt buộc nêu lý do
→ 200 { id, trang_thai_duyet: "Từ chối", curator_id }
→ 409 như trên
```

#### `POST /api/rescan` — nút "Quét lại khách hàng hiện có" (CLAUDE.md mục 8, trigger 1)
Chỉ curator. Điểm nối 2 track: chạy **đúng logic** của `filter` + `rewrite` cho từng khách hàng, không viết phiên bản riêng.
```
body: { card_ids?: string[] }   // bỏ trống = quét toàn bộ thẻ "Đã duyệt"
→ 200 {
    ket_qua: [{
      customer_id: string,
      ten_cong_ty: string,
      pipeline_run_id: string,          // run filter của khách hàng đó
      tasks_moi: number,                // số task draft mới tạo (bỏ qua card đã có task)
      chua_du_thong_tin: number         // số thẻ cần hỏi bổ sung
    }]
  }
```

### Track B — khách hàng

#### `POST /api/customers/:id/onboard` — lưu hồ sơ onboarding (tạo mới hoặc sửa)
Upsert theo `customer_id`. Sửa profile = trigger 2 (mục 8): UI gọi tiếp `POST /api/pipeline/filter` ngay sau khi lưu.
```
body: {
  nhom_a: { ten_cong_ty: string, nganh: string, quy_mo_nhan_su: number },
  nhom_b: Record<string, boolean | string[] | null>,
  nhom_c: Record<string, unknown>,
  nhom_d: { phong_ban: PhongBan[] }
}
→ 200 { profile_id: string }
→ 400 VALIDATION_ERROR
```

#### `GET /api/customers/:id/profile`
```
→ 200 { profile: CustomerProfile | null }    // null = chưa onboard
```

#### `POST /api/pipeline/filter` — rule engine (KHÔNG gọi AI)
```
body: { customer_id: string, card_ids?: string[] }   // card_ids = chỉ chạy lại các thẻ này (dùng cho hỏi bổ sung)
→ 200 {
    pipeline_run_id: string,     // model = null
    ket_qua: KetQuaApDung[]
  }
```

#### `POST /api/customers/:id/answers` — trả lời câu hỏi bổ sung (CLAUDE.md mục 7)
Ghi câu trả lời vào đúng nhóm của profile (server tra nhóm theo tên key), rồi chạy lại rule engine **chỉ cho thẻ đó**.
```
body: {
  card_id: string,
  tra_loi: Record<string, boolean | null>   // Có = true, Không = false, Chưa chắc = null
}
→ 200 {
    pipeline_run_id: string,
    ket_qua: KetQuaApDung        // kết quả mới của riêng card_id
  }
```

#### `POST /api/pipeline/rewrite` — AI viết lại thẻ thành task draft
Chỉ cho thẻ có kết quả "Áp dụng"/"Sắp áp dụng". Server tự chạy lại rule engine để xác nhận trước khi gọi AI, không tin kết quả do client gửi lên.
```
body: { customer_id: string, card_id: string }
→ 200 {
    pipeline_run_id: string,
    task: Task                   // trang_thai_duyet = "Chờ duyệt"; DB tự tạo notification giai_doan "cho_duyet"
  }
→ 409 nếu đã có task cho (customer_id, card_id), hoặc thẻ không ở trạng thái áp dụng
→ 502 AI_ERROR
```

#### `GET /api/tasks`
```
query: ?customer_id=...&trang_thai_duyet=Chờ duyệt   (optional)
→ 200 { tasks: (Task & { card: Pick<Card, "dieu_khoan" | "noi_dung_goc"> })[] }
```

#### `PATCH /api/tasks/:id` — đầu mối chỉnh draft trước khi duyệt
```
body: { noi_dung_task?: string, phong_ban?: string }
→ 200 { task: Task }
→ 409 nếu task đã "Đã duyệt"/"Từ chối"
```

#### `POST /api/tasks/:id/approve` — người đầu mối duyệt task
Gọi `rpc("approve_task", { p_task_id, p_quyet_dinh: "Đã duyệt", p_phong_ban, p_ghi_chu })`. Curator **không** duyệt được task.
```
body: { phong_ban: string, ghi_chu?: string }   // phong_ban = PhongBan.ma trong nhom_d
→ 200 { id, trang_thai_duyet: "Đã duyệt", phong_ban }   // DB tự tạo notification giai_doan "da_giao" cho phòng ban
→ 400 nếu phong_ban trống hoặc không có trong nhom_d
→ 409 nếu task không còn ở trạng thái "Chờ duyệt"
```

#### `POST /api/tasks/:id/reject`
```
body: { ghi_chu: string }
→ 200 { id, trang_thai_duyet: "Từ chối" }
→ 409 như trên
```

#### `GET /api/notifications`
```
query: ?chua_doc=true&phong_ban=marketing   (optional)
→ 200 { notifications: Notification[], so_chua_doc: number }
```

#### `POST /api/notifications/:id/read`
```
→ 200 { id, da_doc: true }
```

### Dùng chung — minh bạch

#### `GET /api/pipeline-runs` — log cho màn hình audit/demo
```
query: ?buoc=filter&customer_id=...&limit=50   (optional; customer chỉ thấy run của mình)
→ 200 { runs: [{ id, buoc, customer_id, card_id, input, output, model, thanh_cong, loi, thoi_gian_ms, created_at }] }
```

---

## 5. Mock data — 2 hồ sơ demo (CLAUDE.md mục 12)

Dùng cho mock UI + test rule engine với 5 thẻ trong `supabase/seed.sql`. Đã seed sẵn vào DB bằng `supabase/seed_customers.sql` (ABC = `a0000000-0000-4000-8000-000000000001`, Smile Care = `a0000000-0000-4000-8000-000000000002`).

```json
{
  "abc_logistics": {
    "nhom_a": { "ten_cong_ty": "Công ty TNHH ABC Logistics", "nganh": "logistics", "quy_mo_nhan_su": 45 },
    "nhom_b": {
      "xu_ly_du_lieu_ca_nhan": true,
      "xu_ly_du_lieu_nhay_cam": false,
      "su_dung_du_lieu_cho_quang_cao": true,
      "chuyen_du_lieu_ra_nuoc_ngoai": true,
      "chia_se_voi_ben_thu_ba": false,
      "loai_du_lieu_dac_biet": []
    },
    "nhom_c": { "vi_tri_server": "nuoc_ngoai", "dich_vu_cloud": ["aws_singapore"], "doi_tac_truy_cap": [] },
    "nhom_d": { "phong_ban": [
      { "ma": "marketing", "ten": "Marketing", "nguoi_dau_moi": "Trưởng phòng Marketing", "email": "marketing@abc-logistics.example" },
      { "ma": "van_hanh", "ten": "Vận hành", "nguoi_dau_moi": "Trưởng phòng Vận hành", "email": "vanhanh@abc-logistics.example" }
    ] }
  },
  "smile_care": {
    "nhom_a": { "ten_cong_ty": "Phòng khám Nha khoa Smile Care", "nganh": "y_te", "quy_mo_nhan_su": 25 },
    "nhom_b": {
      "xu_ly_du_lieu_ca_nhan": true,
      "xu_ly_du_lieu_nhay_cam": true,
      "chuyen_du_lieu_ra_nuoc_ngoai": false,
      "chia_se_voi_ben_thu_ba": true,
      "loai_du_lieu_dac_biet": ["suc_khoe"]
    },
    "nhom_c": { "vi_tri_server": "trong_nuoc", "dich_vu_cloud": [], "doi_tac_truy_cap": ["cong_ty_bao_hiem"] },
    "nhom_d": { "phong_ban": [
      { "ma": "ke_toan", "ten": "Kế toán", "nguoi_dau_moi": "Kế toán trưởng", "email": "ketoan@smilecare.example" },
      { "ma": "bao_hiem", "ten": "Bảo hiểm", "nguoi_dau_moi": "Phụ trách bảo hiểm", "email": "baohiem@smilecare.example" }
    ] }
  }
}
```

Smile Care cố ý **không có** key `su_dung_du_lieu_cho_quang_cao` → thẻ 02 ra "Chưa đủ thông tin" → test luồng hỏi bổ sung.

Kết quả mong đợi (ngày 16/10/2026):

| Thẻ | ABC Logistics | Smile Care |
|---|---|---|
| 01 Chuyển dữ liệu ra nước ngoài | Áp dụng | Không áp dụng |
| 02 Quảng cáo nhắm mục tiêu | Áp dụng | Chưa đủ thông tin (`thieu_thong_tin: ["su_dung_du_lieu_cho_quang_cao"]`) |
| 03 Dữ liệu nhạy cảm (y tế/tài chính/bảo hiểm) | Không áp dụng (`khong_khop` gồm `xu_ly_du_lieu_nhay_cam`, `nganh` — thứ tự không đảm bảo, so sánh như tập hợp) | Áp dụng |
| 04 Chia sẻ bên thứ ba / DPA | Không áp dụng | Áp dụng |
| 05 Đánh giá tác động (hiệu lực 01/01/2027) | Sắp áp dụng | Sắp áp dụng |
