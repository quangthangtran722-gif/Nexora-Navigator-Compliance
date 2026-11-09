# PLAN.md — Kế hoạch thi công P0 đến code freeze 19/11/2026

> Lập 09/11/2026 trên nhánh `mis/rebuild` (từ `spawnx-final` = `9c62ff2`). Cập nhật cùng ngày theo quyết định Q1–Q6 và hai
> thay đổi thiết kế (HE_THONG_DA_CHOT.md v1.1, "Nhật ký thay đổi thiết kế"). **Chưa sửa code.** Chờ duyệt.
> Nguồn: `docs/mis/HE_THONG_DA_CHOT.md` (ghi §n), `docs/mis/UNDERSTANDING.md`, `research/baseline/SUMMARY.md`.
> Phạm vi: việc P0 có code ở §14.1 (việc 4–9) và thay đổi 1–7 ở §12, cộng hạ tầng đã chốt (project Supabase mới).

---

## 0. Tổng quan, giờ và lịch

### 0.1 Danh sách việc

| Mã | Việc | §14.1 / §12 | Phụ thuộc | Giờ | Cần cho đo (D9)? |
|---|---|---|---|---|---|
| H0 | Việc tay của chủ repo (§1.1) | — | — | (người) | có |
| H1 | `000_baseline_prod.sql`, áp lên project mới, so sánh hai DB | — | H0 | 2 | có |
| H2 | Nạp lại đề xuất cũ của Luật 108 (9 điều) + hồ sơ demo, ở `cho_duyet` | — | H1 | 3 | có |
| T1 | Nạp toàn văn Luật 108: thêm chunk các điều còn lại vào cùng văn bản; đối chiếu 9 chunk cũ với toàn văn | 2 · thay đổi 1 | H2, N1′ | 3 | có |
| X1 | Trích xuất hàng loạt chunk Luật 108 (script chạy bằng phiên chuyên viên, có giãn nhịp theo quota Groq) | 2 | T1 | 2 | có |
| M7 | Migration 007 — `pham_vi`, bộ mã C0–C7, cờ không hình thức hóa, hàm duyệt mới, view cạnh điều kiện | 4 · §12 #1, #2 | H1 | 4 | có |
| M8 | Migration 008 — cạnh ngoại lệ bác bỏ / thay thế + cờ `chi_mot_phan`, `ngay_het_hieu_luc` | 4 · §12 #3, #4 | M7 | 2 | có |
| M9 | Migration 009 — `diagnostics.ly_do`, dòng chưa gắn phòng ban, `ngay_danh_gia` | 4 · §12 #5, #6 | H1 | 2 | có |
| HS0 | Migration 010 — từ điển hồ sơ hai phần, điều kiện hiện câu hỏi, kiểu ngày, lý do để trống | 7 · §12 #7 | H1 | 3 | có |
| U1 | Màn chuyên viên: gán mã, xác nhận phạm vi, gắn cờ, cạnh ngoại lệ (+ cờ một phần) | 8 · §4 | M7, M8 | 6 | có |
| S9 | Viết lại S9 + bộ hồi quy A/B/C | 5 | M7, M8, M9 | 9 | có |
| L10 | S10: ngày đánh giá, phiên bản thư viện, bản chụp hồ sơ | §12 #6 | M9, S9 | 2 | có |
| D9 | Script đo trước / sau (hai lát cắt, hai thời điểm, tỉ lệ từ chối theo câu) | 9 | S9, HS0, H2 | 5 | — |
| R1 | Định tuyến: "cần bổ sung" và "áp dụng không có phòng" → dòng chưa gắn phòng; UI hiện lý do | 6 · §12 #5 | M9 | 4 | logic: có; UI: không |
| HS1 | Form đăng ký — phần 1 | 7 | HS0 | 4 | không (D9 đọc hồ sơ JSON) |
| HS2 | Hỏi bổ sung — phần 2 (gom theo trường, các kiểu câu, hai lý do để trống, chạy lại S9 cho nghĩa vụ dùng trường) | 7 | HS0, S9, R1 | 6 | không |
| G1 | Prompt `generate-v2`: bỏ "các bước", chỉ nêu nghĩa vụ / căn cứ / thời hạn / phòng ban | Ranh giới | — | 2 | không |
| | **Tổng** | | | **59 giờ** | |

### 0.2 Vượt lịch — báo và đề xuất

**59 giờ vượt sức chứa 10–15/11.** Sáu ngày × ~8 giờ = ~48 giờ, và ngày 15/11 phải dành cho đo (điểm cắt §14.1). Thiếu ~11 giờ.
Ngoài giờ code còn khối duyệt của người: Luật 108 toàn văn (số điều chưa đếm; luật cũ 38/2019 có 152 điều) cộng
25–40 quy định LDN + TNDN đều phải qua duyệt trước 14/11.

Đề xuất, theo thứ tự ưu tiên:

1. **Tách theo "cần cho đo".** D9 tính lại offline trên hồ sơ JSON, không đi qua giao diện. Các việc chỉ là giao diện —
   HS1, HS2, phần UI của R1, G1 (tổng ~14 giờ) — chuyển sang **16–18/11**, trước code freeze 19/11. Việc 7 của §14.1
   (hạn 13/11) lùi theo. Lịch 10–15/11 còn ~45 giờ, vừa sức chứa nhưng không có dư.
2. **Cắt giảm (−7 giờ), giữ đúng thiết kế:**
   - X1: chạy bằng script, không làm nút trên giao diện (đã tính 2 giờ).
   - L10: chỉ ghi `ngay_danh_gia` + mã băm thư viện vào `pipeline_runs.input`; không thêm màn xem (−1,5).
   - U1: cạnh ngoại lệ thêm bằng script **chỉ tạo cạnh**, chuyên viên chạy, không làm giao diện (−2). Script không đổi trạng thái duyệt.
   - HS2: mở rộng `hoi-bo-sung.tsx` tại chỗ (kiểu câu + hai lý do + chạy lại theo trường), không dựng màn gom câu riêng (−2).
   - R1 UI: chỉ thêm chữ lý do vào các khối có sẵn, còn 0,5 giờ (−1).
   - G1: bỏ bộ lọc từ khóa bằng code, chỉ sửa prompt + schema (−0,5).
3. **Giới hạn khối duyệt Luật 108 (việc của người, không phải code):** nạp toàn văn ở S1–S3 (mọi điều thành chunk, S4 có
   chỗ để nối). Trích xuất và duyệt theo thứ tự ưu tiên: 9 điều cũ → các điều được dẫn chiếu từ quy định LDN/TNDN đã chọn →
   các điều về khai, nộp, thời hạn → còn lại. Điều chưa duyệt đến hết 14/11 nằm ngoài thư viện đo; báo cáo ghi số điều đã
   nạp / đã trích xuất / đã duyệt. **Cần quyết** (§7, Q-A).

Sau 1 + 2: tổng còn 52 giờ — 10–15/11: 42 giờ code (dư ~6 giờ cho sửa lỗi); 16–18/11: 10 giờ giao diện.

### 0.3 Lịch theo ngày (sau đề xuất 1 + 2)

| Ngày | Code | Người (không code) |
|---|---|---|
| 09–10/11 | H0 xong → H1 (2), H2 (3), T1 (3) | N1 bản hợp nhất LDN, TNDN; N1′ file toàn văn Luật 108 |
| 11/11 | M7 (4), M8 (2), M9 (2) | N2 chọn quy định LDN + TNDN; bắt đầu N3 trên 20–30 quy định đầu |
| 12/11 | HS0 (3), U1 (4), X1 (2) | Nạp LDN + TNDN qua màn nhập văn bản, chạy trích xuất |
| 13/11 | S9 (8) — bộ hồi quy A/B/C | N3 kappa; N4 duyệt lại Luật 108 (9 điều cũ trước) |
| 14/11 | S9 (1), R1 logic (2,5), L10 (0,5); sửa lỗi | N5 điều kiện máy đọc, cạnh ngoại lệ; N6 hồ sơ; N7 dự đoán |
| **15/11** | **D9 (5)** — chạy đo | Điểm cắt: không có số sau → viết báo cáo bằng số trước |
| 16–18/11 | HS1 (4), HS2 (4), R1 UI (0,5), G1 (1,5) | Viết báo cáo; N8 chuyên gia kiểm |
| 19/11 | Code freeze | |

Đường găng: H0 → H1 → M7 → U1 → N4/N5 (duyệt) → D9. S9 chạy song song với U1 (test dùng fixture).
Nếu 13/11 tối S9 chưa xanh bộ A/B/C: dừng mọi việc khác, dồn cho S9; D9 chỉ chạy lát cắt (i).

---

## 1. Hạ tầng project MIS (H0–H2, T1, X1)

### 1.1 H0 — việc chủ repo làm tay (làm theo thứ tự, không đoán)

1. **Đếm project đang chạy:** supabase.com/dashboard → từng Organization → Projects. Đếm project **không** ở trạng thái
   *Paused*. Free tier: tối đa 2 project active. **Đã đủ 2 → dừng, báo lại.**
2. **Tạo project** `nexora-mis`, region giống project cũ (Settings → General của `qalexz…`), đặt Database password, lưu lại.
3. **Lấy thông tin** (Project Settings → API Keys; Connect → Session pooler, cổng 5432), ghi vào `.env.mis.local` ở gốc repo
   (đã gitignore theo mẫu `.env*.local`). **Không dán vào chat.**
   ```
   MIS_SUPABASE_URL=
   MIS_SUPABASE_ANON_KEY=
   MIS_SUPABASE_SERVICE_ROLE_KEY=
   MIS_DB_URL=postgresql://postgres.<ref>:<password>@<host>:5432/postgres
   PROD_DB_URL=postgresql://postgres.qalexz…:<password>@<host>:5432/postgres
   ```
   `PROD_DB_URL` chỉ dùng cho `pg_dump --schema-only` (đọc). Không có mật khẩu DB của project cũ → báo tôi trước khi reset.
4. **Cài PostgreSQL client tools** (phiên bản ≥ Postgres của project — Settings → Infrastructure):
   `winget install PostgreSQL.PostgreSQL.17`. Kiểm tra `pg_dump --version`.
5. **Vercel** (project `nexora-navigator-compliance` → Settings → Environment Variables):
   - Báo tôi **phạm vi** (Production / Preview / Development, có gắn branch không) của `NEXT_PUBLIC_SUPABASE_URL`,
     `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `GROQ_API_KEY` — chỉ phạm vi, không giá trị.
   - Thêm 3 biến Supabase của project mới: Environment = **Preview**, *Git Branch* = `mis/rebuild`.
   - Không sửa biến Production. Cron `/api/keep-alive` chỉ chạy trên Production → project cũ vẫn được giữ thức.
6. **Auth của project mới:** Authentication → URL Configuration: thêm `http://localhost:3000` và mẫu URL preview Vercel của
   nhánh. Đối chiếu Sign In / Providers với project cũ (xác nhận email, độ dài mật khẩu).
7. **File toàn văn Luật 108/2025/QH15** (N1′): `.md` hoặc `.txt`, ghi nguồn tải. Đặt ở `research/van-ban/` (không commit nếu
   nguồn không cho phép phân phối lại).
8. Báo tôi đã xong. Push nhánh lần đầu chỉ sau khi bạn đồng ý (push = Vercel build preview).

Sau H0: `.env.local` đổi sang project mới (tôi làm, sau khi bạn đồng ý); bản prod giữ ở `.env.prod.local` cho script chỉ đọc.

### 1.2 H1 — `supabase/migrations/000_baseline_prod.sql`

- `pg_dump "$PROD_DB_URL" --schema-only --schema=public --no-owner --quote-all-identifiers` (giữ GRANT/REVOKE, RLS policy;
  bỏ OWNER). Đầu file: ngày dump, project nguồn, phiên bản `pg_dump`, "thay cho schema.sql + 002–006 khi dựng DB mới".
- Rà tay trước khi áp: `CREATE SCHEMA public`, `COMMENT ON SCHEMA`, extension đã có sẵn → bỏ hoặc `if not exists`.
- Áp: `psql "$MIS_DB_URL" -v ON_ERROR_STOP=1 -f 000_baseline_prod.sql`.
- So sánh: `scripts/mis/so-sanh-schema.mjs` chạy cùng bộ truy vấn `pg_catalog` trên hai DB (bảng, cột, kiểu, default,
  nullable; constraint; index; function + chữ ký + `prosecdef`; trigger; policy + biểu thức; enum; view; grant theo cột)
  → `research/schema-diff/BAO_CAO.md`. Mong đợi: không chênh lệch. Có chênh lệch thì báo, không tự sửa.

### 1.3 H2 — nạp lại đề xuất cũ của Luật 108: `scripts/mis/nap-lai-thu-vien.mjs`

Theo Q4: **chỉ Luật 108** (9 điều). Đọc prod (chỉ `select`), ghi project mới. Số liệu từ bản chụp 09/11: 9 chunk,
17 lượt extract (8 lượt sinh ra entity hiện có), 70 entity, 44 cạnh (đều do LLM đề xuất, không có cạnh tạo tay).

| Bảng | Cách nạp |
|---|---|
| `thuoc_tinh_ho_so`, `nganh` | Chép nguyên (để hồ sơ demo cũ hợp lệ; HS0 thêm trường mới) |
| `van_ban` (chỉ 108/2025/QH15) | Chép, **`trang_thai = 'draft'`**, `nguoi_tao_id = null`. Kích hoạt là thao tác của chuyên viên |
| `van_ban_chunks` (9 chunk) | Chép nguyên văn, `trang_thai = 'da_trich_xuat'` |
| `pipeline_runs` extract của 9 chunk (17 lượt) | Chép nguyên văn (id, input, output, model, prompt_version, thời điểm); `nguoi_chay_id = null`. Là nhật ký gốc của LLM |
| `entities` (70) | Dựng lại **từ `pipeline_runs.output.entities`**, giữ `id = output.entity_ids[ma_tam]`. Không truyền `trang_thai_duyet` → `cho_duyet`. `dieu_kien_may_doc`, `curator_id`, `ghi_chu_curator` = null. Tên lấy từ đề xuất gốc của LLM (chuyên viên từng sửa tên một số entity ở prod) |
| `entity_relationships` (44) | Dựng từ `output.relationships` (`ma_tam` → id) |
| `customers`, `departments` | Chép hồ sơ demo, giữ id (tài khoản demo trỏ `customer_id` `a0000000-…`) |
| TT 77, Luật 109, `diagnostics`, `approvals`, `notifications`, lượt filter/generate | **Không** nạp — dữ liệu trước can thiệp đã chụp ở `research/baseline/` |

Kiểm tra cuối: 0 entity khác `cho_duyet`; 70 entity, 44 cạnh, 9 chunk; ghi `research/reload/manifest.json` (id, số dòng,
chênh lệch tên đề xuất gốc ↔ prod) — được commit. Script in tên project đích ở dòng đầu và **từ chối chạy nếu đích là
`qalexz…`**. Không bật `nexora.seed`; không gọi `approve_*`.

### 1.4 T1 — nạp toàn văn Luật 108: `scripts/mis/nap-toan-van.mjs`

- Màn `nhap-van-ban` tạo văn bản mới, mà `so_hieu` là unique → không dùng được cho văn bản đã có. Script đọc file toàn văn,
  tách chunk bằng `lib/parse-van-ban.ts` (cùng quy tắc S3 như giao diện), **bỏ các chunk chứa Điều 2, 3, 8, 10, 11, 27, 48,
  52, 53** (đã có từ H2), chèn phần còn lại vào cùng `van_ban` với `thu_tu` tiếp theo, `trang_thai = 'cho_xu_ly'`.
- Đối chiếu nguyên văn 9 chunk cũ với 9 điều trong toàn văn (nguồn file cũ chưa xác định — UNDERSTANDING §7.3; test parser có
  ca "tên file -demo"). Lệch → báo, **không** thay chunk cũ (entity cũ trích dẫn đúng chunk cũ; thay chunk làm hỏng
  grounding và so sánh trước / sau). Ghi lệch vào báo cáo như một giới hạn.
- Ghi số điều, số chunk vào manifest.

### 1.5 X1 — trích xuất hàng loạt: `scripts/mis/trich-xuat-hang-loat.mjs`

- Đăng nhập bằng tài khoản **chuyên viên thật** (mật khẩu đọc từ `.env.demo.local`), gọi `POST /api/pipeline/extract` lần lượt
  cho từng chunk `cho_xu_ly` theo thứ tự ưu tiên (đề xuất 3 ở §0.2), giãn nhịp theo `groqLimit.ts` (8K token/phút),
  dừng khi gặp lỗi quota. Đi qua đúng route, đúng `extractEntities.ts`, đúng log `pipeline_runs`; entity ra `cho_duyet`.
- Không đổi prompt `extract-v4`. Báo cáo ghi: 9 điều cũ có đề xuất từ v2/v3/v4, các điều mới từ v4.

---

## 2. Migration 007–010

Quy ước: idempotent, đầu file ghi cách xử lý dữ liệu cũ. Áp lên **project mới** sau `000`. Giá trị enum mới tách file riêng
nếu cần dùng ngay trong cùng migration.

### M7 — `007_pham_vi_ma_dieu_kien.sql` (§12 #1, #2)

- Bảng tra `bo_ma_dieu_kien(ma text pk, ten, nhom check in ('chung','may_doc','khong_hinh_thuc_hoa'), ly_do_mac_dinh check in
  ('thu_vien_chua_du','can_chuyen_mon') null, mo_ta)`. Nạp C0 `chung`; C1–C3 `may_doc`; C4, C5, C7 `khong_hinh_thuc_hoa` +
  `thu_vien_chua_du`; C6 `khong_hinh_thuc_hoa` + `can_chuyen_mon`. Bảng thay vì enum: bộ mã là bản nháp v1 (§9.1), có thể
  thêm mã; S9 rẽ nhánh theo `nhom`, không theo tên mã.
- `entities` thêm: `pham_vi text check in ('chung','co_dieu_kien')` (null = **chưa xác nhận**); `ma_dieu_kien text references
  bo_ma_dieu_kien`; `khong_hinh_thuc_hoa boolean not null default false`; `van_ban_dan_chieu text` (số hiệu văn bản đích C4/C5).
- `approvals.chi_tiet jsonb` — bản chụp `{pham_vi, ma_dieu_kien, dieu_kien_may_doc, khong_hinh_thuc_hoa}` lúc duyệt (ghi vết C7 → C2).
- Nới CHECK `entities_dieu_kien_duyet_phai_may_doc` (đang chặn duyệt `dieu_kien`/`nguong` không máy đọc → C4–C7 không vào được
  thư viện): đã duyệt ⇒ `dieu_kien_may_doc is not null or khong_hinh_thuc_hoa`.
- `approve_entity(p_entity_id, p_quyet_dinh, p_ghi_chu)` viết lại, bỏ `p_ap_dung_moi_doanh_nghiep`. Khi `da_duyet`:
  `chu_the`/`dieu_kien`/`nguong` bắt buộc `ma_dieu_kien`; nhóm `chung` ⇒ `pham_vi='chung'`, không máy đọc; `may_doc` ⇒
  `pham_vi='co_dieu_kien'` + máy đọc; `khong_hinh_thuc_hoa` ⇒ cờ bật (+ `van_ban_dan_chieu` với C4/C5). `hanh_vi` bắt buộc
  `pham_vi`. Vẫn `auth.uid()` + `is_curator()`, cờ `nexora.duyet_boi_nguoi`, ghi `approvals.chi_tiet`.
- `approve_chunk`: bỏ qua (để `cho_duyet`) mọi entity chưa đủ trường trên.
- `khoa_entity` + `GRANT update(...)`: 4 cột mới sửa được khi `cho_duyet`, khóa sau khi xử lý.
- View `canh_dieu_kien_nghia_vu` (**security definer có chủ đích**, chỉ trả id + trạng thái, không nội dung):
  `(hanh_vi_id, entity_id, loai_canh, entity_trang_thai_duyet)` cho mọi cạnh `dieu_kien` vào / `ap_dung_cho` ra / `ngoai_le_*`
  vào của `hanh_vi` đã duyệt. Lý do: RLS 002 cho khách hàng chỉ thấy entity `da_duyet` và cạnh có nguồn nhìn thấy được → điều
  kiện chưa duyệt biến mất với khách hàng nhưng hiện với chuyên viên → khi "chưa xác nhận ≠ áp dụng", cùng nghĩa vụ ra kết
  quả khác nhau theo người bấm quét. View giữ S9 tất định; RLS của nội dung giữ nguyên.
- **Dữ liệu cũ:** entity đã duyệt có `pham_vi` null = chưa xác nhận (S9 trả `thu_vien_chua_du`). Trên project mới mọi entity
  ở `cho_duyet` (H2) nên không có dòng cũ; quy tắc vẫn ghi trong migration để dùng được cho prod.

### M8 — `008_ngoai_le_hieu_luc.sql` (§12 #3, #4)

- `loai_relationship` thêm `ngoai_le_bac_bo`, `ngoai_le_thay_the`. **source = ngoại lệ, target = nghĩa vụ bị ngoại lệ**
  (X3 → N2 bác bỏ; N2 → N1 thay thế; K4 → N2 bác bỏ). Source là `hanh_vi` hoặc `dieu_kien`/`nguong`/`chu_the`; điều kiện của
  ngoại lệ = kết luận của chính source.
- `entity_relationships.chi_mot_phan boolean not null default false` (Q1). CHECK: chỉ được `true` với hai loại cạnh ngoại lệ.
- `grounding.ts` `DAU_CANH`: thêm cặp loại hợp lệ cho 2 loại cạnh mới. LLM **không** đề xuất 2 loại này trong P0
  (`extractEntities.schema.ts` giữ nguyên); chuyên viên thêm ở S7 (`pipeline_run_id` null, RLS `rel_insert` = curator).
- `entities.ngay_het_hieu_luc date` (check `>= ngay_co_hieu_luc`). S2 thủ công: chuyên viên điền cho khoản bị bãi bỏ / thay
  thế một phần. `van_ban_thay_the` loại `mot_phan` chỉ có `dieu_khoan` dạng chữ, không nối được tới entity bằng code (§5 #6).
- Dữ liệu cũ: `ngay_het_hieu_luc` null = còn hiệu lực.

### M9 — `009_diagnostics_ly_do.sql` (§12 #5, #6; Q3)

- Enum `ly_do_can_bo_sung ('thu_vien_chua_du','ho_so_thieu','can_chuyen_mon')`; `diagnostics.ly_do ly_do_can_bo_sung[] not null
  default '{}'`; CHECK `(trang_thai_ap_dung = 'chua_du_thong_tin') = (cardinality(ly_do) > 0)`.
- Thay CHECK `diagnostics_thieu_khi_chua_du` bằng: `cardinality(thuoc_tinh_thieu) > 0 ⇒ 'ho_so_thieu' = any(ly_do)`.
- `diagnostics.department_id` bỏ `not null` (FK ghép `MATCH SIMPLE` bỏ qua khi null); UNIQUE `(customer_id, entity_id,
  department_id)` tạo lại `nulls not distinct`.
- `approve_diagnostic`: `da_duyet` bắt buộc `coalesce(p_department_id, department_id) is not null` — người đầu mối chọn
  phòng cho dòng chưa gắn phòng (tham số `p_department_id` đã có).
- `diagnostics.ngay_danh_gia date` (dòng cũ: lấy `pipeline_runs.input.hom_nay` của `filter_run_id`).
- Trigger `thong_bao_diagnostic`: nội dung `hoi_bo_sung` ghi lý do (+ trường thiếu nếu có).

### HS0 — `010_ho_so_hai_phan.sql` (việc 7, §9.2, §12 #7)

- `kieu_thuoc_tinh` thêm `date`. `kiem_tra_thuoc_tinh_khach_hang` + `dieu_kien_may_doc_hop_le` nhận `date`
  (`eq/gt/gte/lt/lte`, chuỗi `YYYY-MM-DD`).
- `thuoc_tinh_ho_so` thêm:
  - `phan smallint check in (1, 2)` — 1 = hỏi khi đăng ký, 2 = chỉ hỏi qua hỏi bổ sung; null = không hỏi (dòng cũ, T4);
  - `tang text check in ('T0','T1','T2','T3')`;
  - `hien_khi jsonb` — điều kiện hiện câu hỏi, **cùng định dạng `dieu_kien_may_doc`** (kiểm bằng `dieu_kien_may_doc_hop_le`),
    ví dụ niêm yết: `{"thuoc_tinh":"loai_hinh","toan_tu":"eq","gia_tri":"cong_ty_co_phan"}`; nhóm thu nhập Đ18 k3:
    `{"thuoc_tinh":"doanh_thu_ky_truoc","toan_tu":"in","gia_tri":["den_3_ty","tren_3_den_50_ty"]}`;
  - `ma_ngay text references thuoc_tinh_ho_so(ma)` — trường ngày đi kèm câu sự kiện (hiện cùng nhau).
- Khoảng doanh thu: `kieu = text`, `lua_chon = {den_3_ty, tren_3_den_50_ty, tren_50_ty, chua_co_ky_truoc}`; điều kiện dùng
  `in`. Nhóm thu nhập Đ18 k3: `text_array`, `lua_chon = {diem_a, diem_b, diem_c, khong_co}`, điều kiện `contains`.
- `customers.thuoc_tinh_trong jsonb not null default '{}'` — `{ma: 'khong_chac' | 'khong_muon_tra_loi'}`. Trigger: key có
  trong `thuoc_tinh_trong` ⇒ `thuoc_tinh[ma]` là null; giá trị chỉ là hai chuỗi trên. Thêm vào `GRANT update` của customers.
- Hàm `cau_hoi_ho_so(p_phan smallint)` (security invoker): trả trường của phần đó **mà ít nhất một điều kiện C1–C3 đã duyệt
  của văn bản `active` dùng tới**, kèm danh sách căn cứ (`dieu_khoan`, `so_hieu`) và `hien_khi`. Nguyên tắc 1 và 6 của §9.2
  nằm ở đây, form không giữ danh sách cứng. Việc lọc `hien_khi` theo câu trả lời hiện tại làm ở TS bằng `evaluateCondition`
  (cùng hàm của S9).
- Nạp từ điển phần 1, phần 2 theo §9.2 qua `scripts/seed-demo.mjs` (nguồn sự thật của từ điển). Trường "ứng viên" nạp sẵn
  nhưng không hiện cho tới khi có quy định C1–C3 đã duyệt dùng chúng. Không có VSIC. `co_giao_dich_lien_ket`: `phan` null,
  `mo_ta` "T4 — không hỏi".
- **Dữ liệu cũ:** 18 thuộc tính cũ giữ trong từ điển với `phan` null → không hỏi nữa; key cũ trong `customers.thuoc_tinh` vẫn
  hợp lệ (không xóa).

---

## 3. Việc code theo file

### S9 — `lib/pipeline/ruleEngine.ts`, `lib/pipeline/filterDomain.ts` (việc 5)

**`ruleEngine.ts` (thuần):**
- `DieuKien` → `DieuKienPhanLoai = { entity_id, ten_entity, nhom: 'chung'|'may_doc'|'khong_hinh_thuc_hoa'|'chua_xac_nhan',
  dieu_kien_may_doc?, ly_do_neu_chua_xac_dinh?, van_ban_dan_chieu? }`.
- `ghepDieuKien`: **bỏ `if (!e?.dieu_kien_may_doc) continue;`** (dòng 126). Mọi entity nối tới vào danh sách và được phân loại:
  `pham_vi='chung'` → `chung`; có máy đọc → `may_doc`; cờ → `khong_hinh_thuc_hoa`; còn lại (chưa duyệt, `pham_vi` null, không
  mã) → `chua_xac_nhan` (`thu_vien_chua_du`). Entity `tu_choi` → bỏ qua.
- `danhGiaNghiaVu({ nghiaVu: {domain, ngayHieuLuc, ngayHetHieuLuc, phamVi}, dieuKien, thuocTinh, customerDomains, ngayDanhGia })`
  theo §8: lĩnh vực → hết hiệu lực → AND (sai thắng thiếu) → chưa xác định (gom `ly_do[]`, `thuoc_tinh_thieu[]`) → áp dụng /
  sắp áp dụng. Không có điều kiện nào: chỉ áp dụng khi `phamVi='chung'`, ngược lại `thu_vien_chua_du`.
- Ngoại lệ ở `quetKhachHang`: kết luận gốc mọi nghĩa vụ → giải ngoại lệ theo thứ tự phụ thuộc (sắp xếp tô-pô; vòng → mọi nghĩa
  vụ trong vòng `thu_vien_chua_du`). Chỉ xét khi gốc = áp dụng. Với mỗi cạnh ngoại lệ: **có `chi_mot_phan` → bỏ qua đối với
  nghĩa vụ gốc** (nghĩa vụ ngoại lệ tự có kết luận riêng); bác bỏ thỏa → không áp dụng; thay thế thỏa → không áp dụng, ghi
  nghĩa vụ thay; chưa xác định → đánh dấu. Hết ngoại lệ: có đánh dấu → cần bổ sung (`ly_do` của ngoại lệ, `phu_thuoc` = id);
  không → áp dụng (§8 thứ tự xét).
- Thời hạn (Q5): `DanhGia.thoi_han = { nguyen_van, ngay_su_kien? }` — nguyên văn từ entity `thoi_han` nối với nghĩa vụ; ngày sự
  kiện lấy từ trường `ma_ngay` đi kèm điều kiện C3 đã thỏa. **Không tính ngày hạn.**
- `homNay` → `ngayDanhGia`, mặc định `todayInVietnam()`, truyền được từ API (cho đo và hồi quy).
- `DanhGia` thêm `ly_do: LyDoCanBoSung[]`, `ly_do_khong_ap_dung`, `ngoai_le: {entity_id, loai, chi_mot_phan, ket_qua}[]`,
  `phu_thuoc: string[]`, `thoi_han`.

**`filterDomain.ts`:**
- `loadDieuKien` (dòng 167–203): đọc cạnh từ view `canh_dieu_kien_nghia_vu`; **bỏ `.not("dieu_kien_may_doc", "is", null)`
  (dòng 199)**; chọn thêm `pham_vi, ma_dieu_kien, khong_hinh_thuc_hoa, van_ban_dan_chieu` + nhóm mã. Tách hàm thuần
  `dungDieuKien(canhRows, entityRows, boMa)` để test.
- `loadNgoaiLe`: cạnh `ngoai_le_*` có target ∈ tập đang quét; quét một phần (`entityIds`) → nạp thêm bao đóng phụ thuộc để kết
  quả một phần = kết quả khi quét toàn bộ (giữ đối xứng).
- `options.entityId` → `options.entityIds: string[]` (HS2 chạy lại cho mọi nghĩa vụ dùng một trường).
- `loadHanhVi`: chọn thêm `pham_vi`, `ngay_het_hieu_luc`.

**Test mới — `tests/ruleEngine.test.ts`, `tests/s9.test.ts`:**

| # | Test | Lỗi đã truy ra / quyết định |
|---|---|---|
| 1 | `ghepDieuKien`: chủ thể đã duyệt, `dieu_kien_may_doc` null, `pham_vi` null → có trong danh sách, nhóm `chua_xac_nhan`; nghĩa vụ ra `chua_du_thong_tin`, `ly_do = ['thu_vien_chua_du']`, **không** `ap_dung` | `ruleEngine.ts:126` `continue` → 0 điều kiện → áp dụng |
| 2 | Như 1 nhưng `pham_vi='chung'` → `ap_dung` | §8 quyết định chốt |
| 3 | Nghĩa vụ không cạnh nào: `pham_vi` null → `thu_vien_chua_du`; `'chung'` → `ap_dung` | comment `ruleEngine.ts:117` |
| 4 | `dungDieuKien` nhận dòng có `dieu_kien_may_doc` null → không bị lọc | `filterDomain.ts:199` |
| 5 | Cùng dữ liệu, dựng theo góc nhìn chuyên viên và khách hàng → cùng kết quả | RLS ẩn entity chưa duyệt |
| 6 | Một điều kiện sai + một chưa xác định → `khong_ap_dung` | §8 |
| 7 | C6 / T4 → `can_chuyen_mon`; C4 có `van_ban_dan_chieu` → `thu_vien_chua_du`; trường null → `ho_so_thieu` (cả "không chắc" lẫn "không muốn trả lời") | ba lý do; §9.2 nguyên tắc 7 |
| 8 | Ngoại lệ chỉ xét khi gốc thỏa; bác bỏ; thay thế; **một phần không bác bỏ gốc**; bác bỏ thỏa thắng ngoại lệ chưa xác định; vòng | §8 |
| 9 | `ngayHetHieuLuc < ngayDanhGia` → `khong_ap_dung`; đổi `ngayDanhGia` đổi kết quả | §12 #4 |
| 10 | Khoảng doanh thu với `in`; kiểu `date` | §9.2 nguyên tắc 4 |
| 11 | `thoi_han` trả nguyên văn + ngày sự kiện, không có ngày hạn | Q5 |

Viết lại test cũ mã hóa lỗi: `tests/ruleEngine.test.ts:105` ("chủ thể chung / hanh_vi không cạnh → áp dụng mọi DN") và `:112`
("chủ thể chưa duyệt → không thêm điều kiện") theo #1–#3. `tests/doiXung.test.ts` chạy với fixture mới (có ngoại lệ, có
quét theo `entityIds`) — đối xứng phải còn đúng.

**Bộ hồi quy chính — `tests/fixtures/baDoanhNghiep.ts` + `tests/hoiQuyBaDN.test.ts`:** thư viện §10.2 (L1, L2, L3, T1, N1,
N2, N3, X3, K4), hồ sơ A/B/C §10.1 (khoảng doanh thu, nhóm thu nhập Đ18 k3), ngày đánh giá 08/11/2026. So từng ô:

| | A | B | C |
|---|---|---|---|
| L1 (C0) | áp dụng → `ban_giam_doc` | áp dụng → `van_hanh` | áp dụng → `ban_giam_doc` |
| L2 (C3) | không áp dụng | áp dụng → `van_hanh`; thời hạn nguyên văn + ngày sự kiện 05/11/2026 | không áp dụng |
| L3 (C2+C3) | áp dụng → `ban_giam_doc`; nguyên văn + 03/11/2026 | không áp dụng | không áp dụng |
| T1 (C3) | không áp dụng | áp dụng → `ke_toan` | không áp dụng |
| N2 15% | cần bổ sung, `can_chuyen_mon` (K4) | không áp dụng | không áp dụng |
| N3 17% | không áp dụng | cần bổ sung, `can_chuyen_mon` (X3 một phần không bác bỏ; K4 chưa xác định) | không áp dụng |
| X3 | không áp dụng | áp dụng → `ke_toan` | không áp dụng (không hỏi nhóm thu nhập vì doanh thu > 50 tỷ; điều kiện gốc của X3 đọc doanh thu trước) |
| N1 20% | cần bổ sung, phụ thuộc N2 | cần bổ sung, phụ thuộc N3 | áp dụng → `ke_toan` |

Ô X3 × C cần chuyên viên viết điều kiện X3 gồm cả "doanh thu ≤ 50 tỷ" (đúng phạm vi Đ18 k3: chỉ có ý nghĩa với 15%, 17%);
nếu không, X3 × C ra `ho_so_thieu` vì câu nhóm thu nhập không được hỏi. Ghi vào sổ tay mã (N3).

### R1 — dòng chưa gắn phòng ban (việc 6, Q3) — `filterDomain.ts` `syncDiagnostics` (dòng 250–314), `phanBoDiagnostic.ts`

- Tách hàm thuần `keHoachDiagnostic(danhGia, primaryDepartments, departments, existing)`.
- `chua_du_thong_tin`: chưa có dòng → **1 dòng `department_id = null`** (người đầu mối nhận qua trigger `hoi_bo_sung`); đã có
  dòng `cho_duyet` → cập nhật như hiện tại. Bỏ nhánh "không tạo diagnostic".
- `ap_dung`/`sap_ap_dung`: phòng khớp `primary_departments` → như cũ; không khớp → Ban giám đốc; không có Ban giám đốc →
  **1 dòng `department_id = null`**, người đầu mối chọn phòng khi duyệt.
- Dòng phòng null chuyển sang áp dụng ở lượt sau và đã có phòng khớp → gán phòng đích đầu tiên, phòng còn lại tạo mới.
- `generateDiagnostic`: dòng phòng null → "Phòng ban nhận việc: người đầu mối chọn khi duyệt".
- UI tối thiểu (16–18/11): `diagnostic-review.tsx` (chọn phòng khi duyệt dòng null — đã có ô đổi phòng), `customer-overview.tsx`,
  `hoi-bo-sung.tsx` hiện **lý do** (`lib/copy.ts`); chỉ `ho_so_thieu` có ô trả lời.
- Test `tests/dinhTuyen.test.ts`: (a) DN chỉ có Kế toán, nghĩa vụ `primary = [kinh_doanh]`, `chua_du_thong_tin` → 1 dòng phòng
  null (tái hiện hồ sơ `6137ba33…` của baseline: 7 kết quả bị rơi); (b) `ap_dung`, không phòng khớp, không Ban giám đốc → 1 dòng
  phòng null; (c) có phòng khớp → giữ hành vi cũ; (d) dòng phòng null → áp dụng → được gán phòng; (e) `approve_diagnostic` từ
  chối duyệt dòng phòng null khi không truyền `p_department_id` (kiểm ở migration test thủ công / smoke script).

### HS1 — form đăng ký, phần 1 (việc 7) — `lib/schemas.ts`, `lib/onboard.ts`, `components/nexora/onboarding-form.tsx`, `thuoc-tinh-field.tsx`

- Bước 3 render từ `cau_hoi_ho_so(1)`: chỉ trường có quy định đã duyệt dùng; mỗi câu hiện căn cứ; lọc `hien_khi` theo câu trả
  lời hiện tại (niêm yết chỉ hiện khi loại hình = công ty cổ phần).
- `thuoc-tinh-field.tsx`: thêm hai lựa chọn "Không chắc" và "Không muốn trả lời" cho mọi trường (ghi null +
  `thuoc_tinh_trong[ma]`); kiểu `date`; trường ngày đi kèm câu sự kiện.
- `lib/schemas.ts:18`: `nganh` thành `nullable()`; ẩn khỏi form (không thuộc §9.2, chỉ TT 77 dùng). `lib/onboard.ts:63` đã nhận
  null → hai đường thống nhất. `kiemTraOnboard` nhận `thuoc_tinh_trong`.
- Bỏ lọc câu hỏi theo `domain` cho trường §9.2 (dùng chung ba luật).
- Test `tests/onboard.test.ts`: `onboardingStep1` nhận `nganh: null`; `thuoc_tinh_trong` hợp lệ / sai (key có giá trị khác null,
  giá trị lạ); gửi `co_giao_dich_lien_ket` → từ chối; lọc `hien_khi` (CTCP thấy niêm yết, TNHH không thấy).

### HS2 — hỏi bổ sung, phần 2 (việc 7) — `components/nexora/hoi-bo-sung.tsx`, `app/api/pipeline/filter/route.ts`, `lib/data/pipeline.ts`

- Câu hỏi lấy từ `thuoc_tinh_thieu` của các dòng `ho_so_thieu`, **gom theo trường** (một câu doanh thu cho cả N1, N2, N3), lọc
  `hien_khi`, hiện căn cứ. Kiểu câu: khoảng (chọn 1), chọn nhiều (Đ18 k3), có/không + ngày, cộng hai lựa chọn để trống.
- Trả lời → ghi `customers.thuoc_tinh` / `thuoc_tinh_trong` → `POST /api/pipeline/filter` với `entity_ids` = mọi nghĩa vụ có
  điều kiện dùng trường đó (§11: chạy lại cho nghĩa vụ liên quan, không chạy lại toàn bộ).
- Câu hỏi phụ thuộc (nhóm thu nhập chỉ khi doanh thu ≤ 50 tỷ) hiện ngay sau khi câu trước được trả lời, cùng phiên.
- Test: chọn trường → đúng tập `entity_ids`; "Không muốn trả lời" → null + lý do lưu, S9 vẫn `ho_so_thieu`; trả lời khoảng
  doanh thu → N1/N2/N3 đổi đúng theo bộ A/B/C.

### U1 — màn chuyên viên — `draft-review.tsx`, `dieu-kien-editor.tsx`, `lib/data/rpc.ts`, `lib/entity-rules.ts`

- `chu_the`/`dieu_kien`/`nguong`: chọn mã (từ `bo_ma_dieu_kien`); theo nhóm hiện đúng một thao tác: xác nhận phạm vi chung /
  viết điều kiện máy đọc (thêm toán tử cho kiểu `date`, khoảng) / gắn cờ + số hiệu văn bản dẫn chiếu. `hanh_vi`: chọn `pham_vi`.
- Nút duyệt khóa khi thiếu trường (DB vẫn là nơi chặn thật). `lib/data/rpc.ts`: chữ ký `approve_entity` mới.
- Cạnh ngoại lệ (theo đề xuất cắt §0.2): `scripts/mis/them-canh-ngoai-le.mjs` — chuyên viên chạy bằng phiên đăng nhập của mình,
  đầu vào là file JSON `{source, target, loai, chi_mot_phan, can_cu}`; chỉ INSERT cạnh, không đổi trạng thái duyệt; RLS
  `rel_insert` kiểm vai trò.

### G1 — `generateDiagnostic.prompt.ts` → `generate-v2` (ranh giới)

`generate-v1` bắt LLM viết `cac_buoc` ("1–5 bước cụ thể") và `luu_y` — hướng dẫn cách làm, trái §6.2. Sửa: schema chỉ còn
`tieu_de` (nêu nghĩa vụ) và `thoi_han` (chép nguyên văn); căn cứ, phòng ban, ngày hiệu lực, ngày sự kiện do code ghép
(`formatDiagnostic`). Giữ `numbersNotInSource`. Nội dung cũ đã duyệt không đổi.

### L10 — S10 (§12 #6) — `filterDomain.ts`, `lib/pipeline/runs.ts`

- `pipeline_runs.input` thêm `ngay_danh_gia`, `thu_vien: { phien_ban, so_nghia_vu }` (`phien_ban` = sha256 danh sách
  (id, `updated_at`) entity + cạnh đã duyệt đã đọc). Bản chụp hồ sơ đã có (`input.thuoc_tinh`); thêm `input.thuoc_tinh_trong`.
- `diagnostics.ngay_danh_gia` ghi mỗi lần cập nhật. Không đổi `diagnostics` thành append-only (§5 #5).

### D9 — đo trước / sau (việc 9) — `scripts/research/do-truoc-sau.mjs`

- Đầu vào: thư viện (đọc DB, chỉ đọc); hồ sơ `research/ho-so/*.json` — hồ sơ SME thật + bộ tổng hợp phủ mọi khoảng doanh thu,
  mọi loại hình, sự kiện có / không / không chắc / không muốn trả lời. Mỗi hồ sơ có hai trạng thái: **sau đăng ký** (chỉ phần 1)
  và **sau hỏi bổ sung** (thêm phần 2). `ngay_danh_gia` cố định.
- Chạy **hai engine trên cùng đầu vào**: engine cũ (bản sao `ruleEngine.ts` tại `spawnx-final` ở `scripts/research/engine-v0/`,
  chỉ để đo) và engine mới. Tính offline, không ghi `diagnostics`.
- Xuất `research/sau/SUMMARY.md` theo bảng §14.4: Δ; tỉ lệ cần bổ sung (hai thời điểm, ba lý do); tỉ lệ tất định câm; D(S);
  phân bố C0–C7; tỉ lệ từ chối theo câu (từ hồ sơ SME thật).
- Hai lát cắt: (i) **Luật 108, 9 điều cũ, cùng bộ đề xuất LLM** (H2), engine cũ vs mới → tác động của quy tắc + duyệt;
  (ii) thư viện đầy đủ → kết quả cuối.

---

## 4. Việc không phải code (giao người trong nhóm)

| # | Việc | §14.1 | Đầu ra | Hạn | Cần trước |
|---|---|---|---|---|---|
| N1 | Bản hợp nhất LDN (59/2020 + 03/2022 + 76/2025) và TNDN (67/2025 + các luật sửa đổi, có 09/2026); bảng khoản bị sửa / văn bản sửa / ngày hiệu lực | 1 | File `.md` + bảng sửa đổi | 10/11 | — |
| N1′ | File toàn văn Luật 108/2025/QH15, ghi nguồn | 2 | `research/van-ban/` | 10/11 | — |
| N2 | Chọn 25–40 quy định LDN + TNDN theo §2.2 (ghi tiêu chí); quyết LDN Đ31 k1 có trong tập không (quyết luôn câu "niêm yết") | 2 | Danh sách quy định | 11/11 | N1 |
| N3 | Hai người gán mã C0–C7 **độc lập** 20–30 quy định (cột: id, trích dẫn, mã người 1, mã người 2, ghi chú); Cohen's kappa; sửa sổ tay mã (gồm quy ước C4 chỉ gắn khi dẫn chiếu là điều kiện; điều kiện X3 gồm ngưỡng 50 tỷ); gán toàn bộ | 3 | Bảng gán mã, kappa, sổ tay mã v2 | 13/11 | N2 |
| N4 | Duyệt lại Luật 108 trên project mới: 9 điều cũ trước (23 chủ thể → xác nhận `pham_vi = chung` hoặc gắn điều kiện/mã; 5 điều kiện từng bị từ chối nay duyệt được với cờ C4–C7), rồi các điều mới theo thứ tự ưu tiên §0.2 | 8 | Thư viện 108 đã duyệt có mã | 13–14/11 | H2, T1, X1, M7, U1 |
| N5 | Điều kiện máy đọc C1–C3, `primary_departments`, cạnh ngoại lệ (Đ10 k1–k3, Đ18 k3 có cờ một phần, Đ18 k4); chốt trường "ứng viên" | 2–3, 7 | Thư viện đã duyệt; danh sách trường hồ sơ chốt | 14/11 | M8, U1, N3 |
| N6 | Hồ sơ SME thật (có đồng ý; hồ sơ thật → gitignore) + bộ tổng hợp, mỗi hồ sơ hai trạng thái | 9 | `research/ho-so/*.json` | 14/11 | N5 (danh sách trường) |
| N7 | Điền cột "Dự đoán sau" §14.4 **trước** khi đo | 9 | Bảng dự đoán có ngày | 14/11 | — |
| N8 | Chuyên gia ngoài nhóm kiểm tính đúng pháp lý mẫu kết luận | — | Biên bản | 16/11 | D9 |
| N9 | Quyết có nạp NĐ 252/2026/NĐ-CP và TT 90/2026/TT-BTC không (câu hỏi mở §2.1) | 2 | Quyết định | 11/11 | — |

---

## 5. Chỗ thiết kế khó hoặc lệch code — còn mở

Các mục đã chốt ngày 09/11 (Q1–Q6, số liệu §13.1) xem "Nhật ký thay đổi thiết kế" của HE_THONG_DA_CHOT.md. Còn lại:

| # | Chỗ | Vấn đề | Đề xuất |
|---|---|---|---|
| 1 | §2.2 Luật 108 toàn văn | Khối duyệt lớn (số điều chưa đếm), quota Groq ~1.000 request/ngày và 8K token/phút | §0.2 đề xuất 3 (Q-A) |
| 2 | §9.2 phần 2 | Ngay sau đăng ký, mọi quy định dùng trường phần 2 ra "cần bổ sung" — đúng thiết kế, nhưng màn Tổng quan sẽ đầy câu hỏi | Gom theo trường (HS2); D9 đo hai thời điểm |
| 3 | §9.2 "chưa có kỳ trước" | Kết luận với DN mới thành lập phụ thuộc văn bản hướng dẫn | Chuyên viên viết điều kiện theo văn bản; chưa nạp → C5 |
| 4 | §10.4 X3 × C | Câu nhóm thu nhập không hỏi khi doanh thu > 50 tỷ → X3 cần có ngưỡng 50 tỷ trong điều kiện, nếu không ra `ho_so_thieu` | Quy ước trong sổ tay mã (N3) |
| 5 | §1 "không sửa kết luận cũ", §12 #6 | `diagnostics` cập nhật tại chỗ | `pipeline_runs.output` (append-only, DB khóa) là nhật ký kết luận bất biến; `diagnostics` là trạng thái hiện hành. Ghi rõ trong báo cáo |
| 6 | §12 #4 "S9 đọc `van_ban_thay_the`" | `dieu_khoan` dạng chữ, không nối được tới entity | S2 thủ công điền `ngay_het_hieu_luc`; S9 đọc thay thế toàn bộ qua `van_ban.trang_thai` |
| 7 | §8 C4–C7; RLS | CHECK cũ chặn duyệt C4–C7; RLS làm S9 phụ thuộc người gọi | Đã đưa vào M7 |
| 8 | §6.2 bước 5 | Prompt `generate-v1` hướng dẫn cách làm | G1 |
| 9 | §14.1 việc 7 hạn 13/11 | Phần giao diện hồ sơ không cần cho đo | Đề xuất lùi sang 16–18/11 (§0.2) |
| 10 | T1 — 9 chunk cũ | Nguồn file cũ chưa xác định; có thể lệch toàn văn | Đối chiếu, báo lệch, giữ chunk cũ (§1.4) |
| 11 | §6.1 bước 9, §13.3 | Kích hoạt / hủy kích hoạt văn bản không ghi `approvals` | P1 (§14.2) |

---

## 6. Rủi ro

- **Quota Groq:** trích xuất toàn văn Luật 108 + LDN + TNDN + generate. X1 giãn nhịp, dừng khi chạm quota, chạy tiếp ngày sau.
  Nếu Preview dùng chung `GROQ_API_KEY` với Production thì chung quota.
- **Project mới bị pause** sau 7 ngày không hoạt động — sau 21/11 nhớ unpause trước khi chấm / demo.
- **Hai DB song song:** script ghi in tên project ở dòng đầu, từ chối chạy nếu đích là `qalexz…`.
- **Bản chụp trước can thiệp** chỉ có ở `research/baseline/raw/` trên một máy (gitignore). Chép thêm một bản vào ổ nhóm.

---

## 7. Câu hỏi cần quyết

- **Q-A** Đồng ý lùi HS1, HS2, UI của R1, G1 sang 16–18/11 (việc 7 §14.1 lùi khỏi 13/11) và các cắt giảm ở §0.2 mục 2?
- **Q-B** Luật 108: nạp toàn văn ở S1–S3 nhưng trích xuất + duyệt theo thứ tự ưu tiên, điều chưa duyệt đến 14/11 nằm ngoài
  thư viện đo — đồng ý?
- **Q-C** NĐ 252/2026/NĐ-CP, TT 90/2026/TT-BTC: có nạp không (N9, hạn 11/11)?
