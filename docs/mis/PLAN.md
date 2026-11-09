# PLAN.md — Kế hoạch thi công P0 đến code freeze 19/11/2026

> Lập 09/11/2026 trên nhánh `mis/rebuild` (từ `spawnx-final` = `9c62ff2`). **Chưa sửa code.** Chờ duyệt.
> Nguồn: `docs/mis/HE_THONG_DA_CHOT.md` (ghi §n), `docs/mis/UNDERSTANDING.md`, `research/baseline/SUMMARY.md`.
> Phạm vi: việc P0 có code ở §14.1 (việc 4–9) và thay đổi 1–6 ở §12, cộng phần hạ tầng đã chốt ngày 09/11
> (project Supabase mới, phương án (a) có 4 điều chỉnh).

---

## 0. Tổng quan và lịch

| Mã | Việc | §14.1 / §12 | Phụ thuộc | Giờ | Ngày |
|---|---|---|---|---|---|
| H0 | Việc tay của chủ repo: đếm project, tạo project, lấy key, cài `pg_dump`, cấu hình Vercel (§1.1) | — | — | (người) | 09–10/11 |
| H1 | `000_baseline_prod.sql` (schema-only dump prod), áp lên project mới, so sánh hai DB | — | H0 | 2 | 10/11 |
| H2 | Script nạp lại thư viện + hồ sơ sang project mới, entity ở `cho_duyet` | — | H1 | 4 | 10/11 |
| M7 | Migration 007 — `pham_vi`, bộ mã C0–C7, cờ không hình thức hóa, hàm duyệt mới, view cạnh điều kiện | 4 · §12 #1, #2 | H1 | 4 | 11/11 |
| M8 | Migration 008 — cạnh ngoại lệ bác bỏ / thay thế, `ngay_het_hieu_luc` | 4 · §12 #3, #4 | M7 | 2 | 11/11 |
| M9 | Migration 009 — `diagnostics.ly_do`, phòng ban nullable, `ngay_danh_gia` | 4 · §12 #5, #6 | H1 | 2 | 11/11 |
| M10 | Migration 010 — từ điển hồ sơ T0–T3 (`tang`, kiểu `date`), bỏ T4 | 7 | H1 | 2 | 12/11 |
| U1 | Màn chuyên viên: gán mã, xác nhận phạm vi, gắn cờ, thêm cạnh ngoại lệ | 8 (công cụ) · §4 định tuyến | M7, M8 | 5 | 12/11 |
| G1 | `generateDiagnostic` prompt `generate-v2`: bỏ "các bước", chỉ nêu nghĩa vụ / căn cứ / thời hạn / phòng ban | Ranh giới | — | 2 | 12/11 |
| R1 | Định tuyến: "cần bổ sung" luôn tạo dòng, gửi người đầu mối | 6 · §12 #5 | M9 | 4 | 13/11 |
| F1 | Form hồ sơ T0–T3, "không chắc" cho mọi trường dùng trong điều kiện | 7 | M10 | 5 | 13/11 |
| S9 | Viết lại S9 + bộ test hồi quy A/B/C | 5 | M7, M8, M9 | 8 | 13–14/11 |
| L10 | S10: ngày đánh giá, phiên bản thư viện, bản chụp hồ sơ | §12 #6 | M9, S9 | 2 | 14/11 |
| D9 | Script đo trước / sau | 9 | S9, H2 | 4 | 15/11 |
| | **Tổng code** | | | **~46 giờ** | |

**Điểm cắt 15/11 (§14.1):** chưa có số đo sau can thiệp → dừng code, viết báo cáo bằng số trước can thiệp.
Nếu 13/11 tối S9 chưa xanh bộ test A/B/C → cắt theo thứ tự: L10 (giữ phần ghi `ngay_danh_gia`), F1 phần giao diện
(giữ schema), U1 phần cạnh ngoại lệ (chuyên viên thêm cạnh bằng màn sẵn có hoặc script **chỉ tạo cạnh**, không đổi duyệt).

Đường găng: H0 → H1 → M7 → U1 → (nhóm duyệt lại + gán mã, việc không code) → D9. S9 chạy song song với U1 vì
test dùng fixture, không cần dữ liệu thật.

---

## 1. Hạ tầng project MIS (H0–H2)

### 1.1 H0 — việc chủ repo làm tay (không tự đoán, làm theo thứ tự)

1. **Đếm project đang chạy.** supabase.com/dashboard → từng Organization → Projects. Đếm project **không** ở trạng
   thái *Paused*. Free tier: tối đa 2 project active. **Nếu đã đủ 2 → dừng, báo lại** (không tạo project).
2. **Tạo project:** New project → tên `nexora-mis` → region **giống project cũ** (xem Settings → General của project
   `qalexz…`) → đặt Database password, lưu vào trình quản lý mật khẩu. Plan: Free.
3. **Lấy thông tin** (Project Settings → API Keys và Connect → Session pooler, cổng 5432), ghi vào file mới
   `.env.mis.local` ở gốc repo (đã nằm trong `.gitignore` theo mẫu `.env*.local`). **Không dán vào chat.**
   ```
   MIS_SUPABASE_URL=
   MIS_SUPABASE_ANON_KEY=
   MIS_SUPABASE_SERVICE_ROLE_KEY=
   MIS_DB_URL=postgresql://postgres.<ref>:<password>@<host>:5432/postgres
   PROD_DB_URL=postgresql://postgres.qalexz…:<password>@<host>:5432/postgres
   ```
   `PROD_DB_URL` chỉ dùng cho `pg_dump --schema-only` (đọc). Nếu không có mật khẩu DB của project cũ: Settings →
   Database → Reset database password **sẽ làm hỏng kết nối nào đang dùng mật khẩu cũ** — app không dùng (app đi
   qua API key), nhưng hỏi lại nếu không chắc.
4. **Cài PostgreSQL client tools** (cần `pg_dump`/`psql` ≥ phiên bản Postgres của project — xem Settings →
   Infrastructure). Windows: `winget install PostgreSQL.PostgreSQL.17` (hoặc bộ cài EDB, chỉ chọn *Command Line Tools*).
   Kiểm tra: `pg_dump --version`.
5. **Vercel** (vercel.com → project `nexora-navigator-compliance` → Settings → Environment Variables):
   - Ghi lại cho tôi **phạm vi** (Production / Preview / Development, có gắn branch không) của 4 biến hiện có:
     `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `GROQ_API_KEY` — chỉ phạm vi, không giá trị.
   - Thêm 3 biến Supabase mới: Environment = **Preview**, ô *Git Branch* = `mis/rebuild`, giá trị từ project mới.
     Biến gắn branch được ưu tiên hơn biến Preview chung cho đúng nhánh đó.
   - **Không** sửa biến Production. Cron `/api/keep-alive` chỉ chạy trên Production → project cũ vẫn được giữ thức.
   - `GROQ_API_KEY` dùng chung được (quota chung ~1.000 request/ngày — xem rủi ro §6).
6. **Supabase Auth của project mới:** Authentication → URL Configuration: Site URL và Redirect URLs thêm
   `http://localhost:3000` và mẫu URL preview Vercel của nhánh. Đối chiếu Sign In / Providers với project cũ
   (xác nhận email bật/tắt, độ dài mật khẩu) để màn đăng ký chạy giống.
7. Báo tôi đã xong 1–6. Tôi chưa push gì; push nhánh lần đầu chỉ sau khi bạn đồng ý (push = Vercel build preview).

Sau H0: `.env.local` đổi sang project mới (tôi làm, sau khi bạn đồng ý), bản prod cũ giữ ở `.env.prod.local` để
`snapshot-baseline.mjs` vẫn đọc được số trước can thiệp.

### 1.2 H1 — `supabase/migrations/000_baseline_prod.sql`

- `pg_dump "$PROD_DB_URL" --schema-only --schema=public --no-owner --quote-all-identifiers > 000_baseline_prod.sql`
  (giữ GRANT/REVOKE và RLS policy; bỏ OWNER vì role khác project). Đầu file ghi: ngày dump, project nguồn, phiên bản
  `pg_dump`, "thay cho schema.sql + 002–006 khi dựng DB mới".
- Rà tay trước khi áp: lệnh `CREATE SCHEMA public` / `COMMENT ON SCHEMA` / extension có sẵn ở project mới → bỏ hoặc
  thêm `if not exists`. Không chứa dữ liệu (dữ liệu tham chiếu của 003 `nganh`, 005 `quy_mo` nạp ở H2).
- Áp: `psql "$MIS_DB_URL" -v ON_ERROR_STOP=1 -f 000_baseline_prod.sql`.
- So sánh: script `scripts/mis/so-sanh-schema.mjs` chạy cùng một bộ truy vấn `pg_catalog` trên hai DB (bảng + cột
  + kiểu + default + nullable; constraint; index; function + chữ ký + `prosecdef`; trigger; policy + biểu thức;
  enum + giá trị; view; grant theo cột) → `research/schema-diff/BAO_CAO.md`. Chênh lệch mong đợi: không có.
  Mọi chênh lệch đều báo, không tự sửa.

### 1.3 H2 — nạp lại dữ liệu: `scripts/mis/nap-lai-thu-vien.mjs`

Đọc prod bằng service key cũ (chỉ `select`), ghi project mới bằng service key mới. Thứ tự và quy tắc:

| Bảng | Cách nạp |
|---|---|
| `thuoc_tinh_ho_so`, `nganh` | Chép nguyên |
| `van_ban` | Chép, **`trang_thai = 'draft'`**, `nguoi_tao_id = null`. Kích hoạt là thao tác của chuyên viên |
| `van_ban_thay_the` | Chép nguyên |
| `van_ban_chunks` | Chép (`noi_dung` nguyên văn), `trang_thai = 'da_trich_xuat'` |
| `pipeline_runs` (`extract_entities`) | Chép nguyên văn cả 38 lượt (id, input, output, model, prompt_version, thời điểm); `nguoi_chay_id = null`. Đây là nhật ký gốc của LLM, không phải lượt mới |
| `entities` | Dựng lại **từ `pipeline_runs.output.entities`** (đề xuất LLM đã qua grounding), giữ `id = output.entity_ids[ma_tam]`, đúng 108 entity đang có ở prod. Không truyền `trang_thai_duyet` → `cho_duyet`. `dieu_kien_may_doc`, `curator_id`, `ghi_chu_curator` = null. 9 entity bị chuyên viên đổi tên ở prod lấy lại tên gốc của LLM |
| `entity_relationships` | Dựng từ `output.relationships` (`source`/`target` là `ma_tam` → id). Cạnh chuyên viên tạo tay ở prod (`pipeline_run_id` null) **không** nạp; ghi số lượng vào manifest |
| `customers`, `departments` | Chép, giữ id (tài khoản demo trỏ `customer_id` cố định `a0000000-…`) |
| `diagnostics`, `approvals`, `notifications`, `pipeline_runs` filter/generate | **Không** nạp — là kết quả trước can thiệp, đã chụp ở `research/baseline/` |

- Kiểm tra cuối script: 0 entity khác `cho_duyet`; số entity = 108; số cạnh, số chunk khớp prod (in chênh lệch).
- Ghi `research/reload/manifest.json` (id, số dòng, chênh lệch đề xuất gốc ↔ bản prod) — được commit (không có dữ liệu DN).
- Tài khoản: `create-demo-users.mjs` chạy với env của project mới. Duyệt lại thư viện bằng tài khoản chuyên viên thật.
- Không bật `nexora.seed`, không gọi `approve_*` bằng service role (DB cũng chặn: `auth.uid()` null).

---

## 2. Migration 007–010

Quy ước: idempotent (`if not exists`, `do $$ … $$`), ghi ở đầu file cách xử lý dữ liệu cũ. Áp lên **project mới**
sau `000`. Enum mới thêm giá trị trong file riêng nếu cần dùng ngay trong cùng migration (giới hạn Postgres).

### M7 — `007_pham_vi_ma_dieu_kien.sql` (§12 #1, #2)

- Bảng tra `bo_ma_dieu_kien(ma text pk, ten text, nhom text check in ('chung','may_doc','khong_hinh_thuc_hoa'),
  ly_do_mac_dinh text check in ('thu_vien_chua_du','can_chuyen_mon') null, mo_ta text)`. Nạp C0 (`chung`), C1–C3
  (`may_doc`), C4, C5, C7 (`khong_hinh_thuc_hoa`, `thu_vien_chua_du`), C6 (`khong_hinh_thuc_hoa`, `can_chuyen_mon`).
  Lý do bảng thay vì enum: bộ mã là bản nháp v1, có thể thêm mã (§9.1) — S9 rẽ nhánh theo `nhom`, không theo tên mã.
- `entities` thêm:
  - `pham_vi text check in ('chung','co_dieu_kien')` — null = **chưa xác nhận**;
  - `ma_dieu_kien text references bo_ma_dieu_kien(ma)`;
  - `khong_hinh_thuc_hoa boolean not null default false`;
  - `van_ban_dan_chieu text` (số hiệu văn bản đích của C4/C5).
- `approvals` thêm `chi_tiet jsonb` — bản chụp `{pham_vi, ma_dieu_kien, dieu_kien_may_doc, khong_hinh_thuc_hoa}` lúc duyệt
  (ghi vết khi C7 đổi thành C2).
- Sửa ràng buộc cũ: `entities_dieu_kien_duyet_phai_may_doc` đang chặn duyệt `dieu_kien`/`nguong` thiếu bản máy đọc → C4–C7
  không duyệt được. Thay bằng: đã duyệt ⇒ `dieu_kien_may_doc is not null or khong_hinh_thuc_hoa`.
- `approve_entity(p_entity_id, p_quyet_dinh, p_ghi_chu)` viết lại (bỏ `p_ap_dung_moi_doanh_nghiep`; phạm vi nằm ở cột):
  khi `da_duyet` và loại ∈ {`chu_the`,`dieu_kien`,`nguong`}: bắt buộc có `ma_dieu_kien`; nhóm `chung` ⇒ `pham_vi='chung'`,
  không máy đọc; nhóm `may_doc` ⇒ `pham_vi='co_dieu_kien'` + máy đọc; nhóm `khong_hinh_thuc_hoa` ⇒ cờ bật
  (+ `van_ban_dan_chieu` với C4/C5). `hanh_vi`: bắt buộc `pham_vi` (để nghĩa vụ không cạnh nào cũng phải có xác nhận).
  Vẫn yêu cầu `auth.uid()` + `is_curator()`, vẫn bật cờ `nexora.duyet_boi_nguoi`, ghi `approvals.chi_tiet`.
- `approve_chunk`: bỏ qua (để `cho_duyet`) mọi entity chưa đủ các trường trên, như 005.
- `khoa_entity` + `GRANT update(...)`: thêm 4 cột mới vào danh sách sửa được khi `cho_duyet`, khóa sau khi xử lý.
- View `canh_dieu_kien_nghia_vu` (**security definer có chủ đích**, chỉ trả id + trạng thái, không nội dung):
  `(hanh_vi_id, entity_id, loai_canh, entity_trang_thai_duyet)` cho mọi cạnh `dieu_kien` vào / `ap_dung_cho` ra của
  `hanh_vi` đã duyệt. Lý do: khách hàng chỉ thấy entity `da_duyet` và chỉ thấy cạnh có nguồn nhìn thấy được (RLS 002),
  nên một điều kiện chưa duyệt **biến mất** với khách hàng nhưng hiện với chuyên viên → khi "chưa xác nhận ≠ áp dụng",
  cùng một nghĩa vụ sẽ ra kết quả khác nhau theo người bấm quét. View giữ S9 tất định, RLS của nội dung vẫn nguyên.
- **Dữ liệu cũ:** entity đã duyệt có `pham_vi` null = chưa xác nhận (S9 trả `thu_vien_chua_du`). Trên project mới mọi
  entity đều `cho_duyet` (H2) nên không có dòng cũ; quy tắc vẫn ghi vào migration để áp được cho prod nếu cần.

### M8 — `008_ngoai_le_hieu_luc.sql` (§12 #3, #4)

- `loai_relationship` thêm `ngoai_le_bac_bo`, `ngoai_le_thay_the`. Chiều cạnh: **source = ngoại lệ, target = nghĩa vụ bị
  ngoại lệ** (X3 → N2 bác bỏ; N2 → N1 thay thế). Source là `hanh_vi` (nghĩa vụ khác) hoặc `dieu_kien`/`nguong`/`chu_the`
  (vd Đ18 k4 là một điều kiện C6). Điều kiện của ngoại lệ = kết luận của chính source.
- `entity_relationships.chi_mot_phan boolean not null default false` — **chờ quyết định Q1** (ngoại lệ chỉ áp cho một
  phần thu nhập).
- `grounding.ts` `DAU_CANH`: thêm cặp loại hợp lệ cho 2 loại cạnh mới. LLM **không** đề xuất 2 loại này trong P0
  (`extractEntities.schema.ts` giữ nguyên) — chuyên viên thêm tay ở S7 (`pipeline_run_id` null, RLS `rel_insert` = curator).
- `entities.ngay_het_hieu_luc date`, check `>= ngay_co_hieu_luc`. S2 thủ công: chuyên viên điền cho khoản bị bãi bỏ
  / thay thế một phần. `van_ban_thay_the` loại `toan_bo` đã thể hiện qua `van_ban.trang_thai = replaced`; loại `mot_phan`
  chỉ có `dieu_khoan` dạng chữ, không nối được tới entity bằng code → dùng `ngay_het_hieu_luc` thay (xem §5 #10).
- Dữ liệu cũ: `ngay_het_hieu_luc` null = chưa biết ngày hết hiệu lực = còn hiệu lực.

### M9 — `009_diagnostics_ly_do.sql` (§12 #5, #6)

- Enum `ly_do_can_bo_sung ('thu_vien_chua_du','ho_so_thieu','can_chuyen_mon')`; `diagnostics.ly_do ly_do_can_bo_sung[]
  not null default '{}'`. CHECK: `(trang_thai_ap_dung = 'chua_du_thong_tin') = (cardinality(ly_do) > 0)`.
- Thay CHECK `diagnostics_thieu_khi_chua_du` (bắt `thuoc_tinh_thieu` khác rỗng ⇔ cần bổ sung — sai với hai lý do không
  phải hồ sơ) bằng: `cardinality(thuoc_tinh_thieu) > 0 ⇒ 'ho_so_thieu' = any(ly_do)`.
- `diagnostics.department_id` bỏ `not null` (FK ghép `MATCH SIMPLE` tự bỏ qua khi null). UNIQUE
  `(customer_id, entity_id, department_id)` tạo lại `nulls not distinct`.
- `approve_diagnostic`: khi `da_duyet` bắt buộc `coalesce(p_department_id, department_id) is not null` — người đầu mối
  chọn phòng ban cho dòng chưa có phòng (hàm đã có tham số `p_department_id`).
- `diagnostics.ngay_danh_gia date` (dữ liệu cũ: lấy `pipeline_runs.input.hom_nay` của `filter_run_id`; dòng mới: S9 ghi).
- Trigger `thong_bao_diagnostic`: nội dung `hoi_bo_sung` ghi lý do (+ trường thiếu nếu có) thay vì chỉ danh sách trường.

### M10 — `010_ho_so_t0_t3.sql` (việc 7)

- `kieu_thuoc_tinh` thêm `date` (ngày của sự kiện T3); hàm kiểm `kiem_tra_thuoc_tinh_khach_hang` + `dieu_kien_may_doc_hop_le`
  nhận kiểu `date` (toán tử `eq/gt/gte/lt/lte`, so chuỗi `YYYY-MM-DD`).
- `thuoc_tinh_ho_so.tang text check in ('T0','T1','T2','T3')` — form chỉ render dòng có `tang`. Dòng cũ: `tang` null →
  không hỏi nữa, câu trả lời cũ trong `customers.thuoc_tinh` vẫn hợp lệ (không xóa key).
- Nạp từ điển T0–T3 theo §9.2 (chỉ các trường có quy định C1–C3 dùng — xem Q6), qua `scripts/seed-demo.mjs` (file đó là
  nguồn sự thật của từ điển). `co_giao_dich_lien_ket` (T4): `tang` null + ghi `mo_ta` "T4 — không hỏi".

---

## 3. Việc code theo file

### S9 — `lib/pipeline/ruleEngine.ts`, `lib/pipeline/filterDomain.ts` (việc 5)

**`ruleEngine.ts` (thuần, không import gì ngoài type):**
- `DieuKien` → `DieuKienPhanLoai = { entity_id, ten_entity, nhom: 'chung'|'may_doc'|'khong_hinh_thuc_hoa'|'chua_xac_nhan',
  dieu_kien_may_doc?, ly_do_neu_chua_xac_dinh?, van_ban_dan_chieu? }`.
- `ghepDieuKien`: **bỏ `if (!e?.dieu_kien_may_doc) continue;`** (dòng 126). Mọi entity nối tới đều vào danh sách; phân loại:
  `pham_vi='chung'` → `chung` (không thêm điều kiện); có máy đọc → `may_doc`; cờ không hình thức hóa → `khong_hinh_thuc_hoa`;
  còn lại (chưa duyệt, `pham_vi` null, không mã) → `chua_xac_nhan` (`thu_vien_chua_du`). Entity `tu_choi` → bỏ qua.
- `evaluateEntity` → `danhGiaNghiaVu({ nghiaVu: {domain, ngayHieuLuc, ngayHetHieuLuc, phamVi}, dieuKien, thuocTinh,
  customerDomains, ngayDanhGia })`: thứ tự §8 — lĩnh vực → hết hiệu lực → AND (sai thắng thiếu) → chưa xác định
  (gom `ly_do[]`, `thuoc_tinh_thieu[]`) → áp dụng / sắp áp dụng. Nghĩa vụ không có điều kiện nào: chỉ áp dụng khi
  `phamVi = 'chung'`, ngược lại `thu_vien_chua_du`.
- Ngoại lệ ở `quetKhachHang`: tính kết luận gốc mọi nghĩa vụ, rồi giải ngoại lệ theo thứ tự phụ thuộc (sắp xếp tô-pô;
  có vòng → mọi nghĩa vụ trong vòng `thu_vien_chua_du`). Chỉ xét khi gốc = áp dụng: bác bỏ thỏa → không áp dụng
  (`ly_do_khong_ap_dung = 'ngoai_le_bac_bo'`); thay thế thỏa → không áp dụng gốc, ghi nghĩa vụ thay; chưa xác định →
  cần bổ sung (`ly_do` của ngoại lệ); không thỏa → giữ áp dụng.
- `homNay` đổi tên `ngayDanhGia`, mặc định `todayInVietnam()`, truyền được từ API (cho đo và hồi quy).
- `DanhGia` thêm `ly_do: LyDoCanBoSung[]`, `ly_do_khong_ap_dung`, `ngoai_le: {entity_id, loai, ket_qua}[]`.

**`filterDomain.ts`:**
- `loadDieuKien` (dòng 167–203): đọc cạnh từ view `canh_dieu_kien_nghia_vu` thay vì 2 truy vấn bảng; **bỏ
  `.not("dieu_kien_may_doc", "is", null)` (dòng 199)**; chọn thêm `pham_vi, ma_dieu_kien, khong_hinh_thuc_hoa,
  van_ban_dan_chieu` và nhóm mã. Tách phần dựng dữ liệu thành hàm thuần `dungDieuKien(canhRows, entityRows, boMa)` để test.
- `loadNgoaiLe`: cạnh `ngoai_le_*` có target ∈ tập nghĩa vụ đang quét; khi quét 1 nghĩa vụ (`entityId`), nạp thêm
  nghĩa vụ là source của ngoại lệ (đóng bao phụ thuộc) để kết quả 1 nghĩa vụ = kết quả khi quét toàn bộ (giữ đối xứng).
- `loadHanhVi`: chọn thêm `pham_vi`, `ngay_het_hieu_luc`.

**Test mới — `tests/ruleEngine.test.ts`, `tests/s9.test.ts`:**

| # | Test | Lỗi đã truy ra |
|---|---|---|
| 1 | `ghepDieuKien`: chủ thể đã duyệt, `dieu_kien_may_doc` null, `pham_vi` null → có trong danh sách, nhóm `chua_xac_nhan`; nghĩa vụ ra `chua_du_thong_tin`, `ly_do = ['thu_vien_chua_du']` (không phải `ap_dung`) | `ruleEngine.ts:126` `continue` → 0 điều kiện → áp dụng |
| 2 | Như 1 nhưng `pham_vi = 'chung'` → `ap_dung` | quyết định chốt 08/11 |
| 3 | Nghĩa vụ không có cạnh nào, `pham_vi` null → `thu_vien_chua_du`; `pham_vi='chung'` → `ap_dung` | comment `ruleEngine.ts:117` |
| 4 | `dungDieuKien` nhận dòng có `dieu_kien_may_doc` null → không bị lọc | `filterDomain.ts:199` |
| 5 | Cùng dữ liệu, dựng theo góc nhìn chuyên viên và khách hàng (view trả trạng thái target) → cùng kết quả | RLS ẩn entity chưa duyệt |
| 6 | Một điều kiện sai + một chưa xác định → `khong_ap_dung` | §8 thứ tự |
| 7 | C6 / T4 → `can_chuyen_mon`; C4 có `van_ban_dan_chieu` → `thu_vien_chua_du`; trường hồ sơ null → `ho_so_thieu` | ba lý do |
| 8 | Ngoại lệ chỉ xét khi gốc thỏa; bác bỏ; thay thế; ngoại lệ chưa xác định; vòng ngoại lệ | §8 |
| 9 | `ngayHetHieuLuc < ngayDanhGia` → `khong_ap_dung`; đổi `ngayDanhGia` đổi kết quả | §12 #4 |

Sửa test cũ mã hóa lỗi: `tests/ruleEngine.test.ts:105` ("chủ thể chung / hanh_vi không cạnh → áp dụng mọi DN") và
`:112` ("chủ thể chưa duyệt → không thêm điều kiện") — viết lại theo #1–#3. `tests/doiXung.test.ts` giữ và chạy với
fixture mới (có ngoại lệ) — đối xứng phải còn đúng.

**Bộ hồi quy chính — `tests/fixtures/baDoanhNghiep.ts` + `tests/hoiQuyBaDN.test.ts`:**
thư viện §10.2 (L1, L2, L3, T1, N1, N2, N3, X3 + điều kiện Đ18 k4 mã C6), hồ sơ A/B/C §10.1, ngày đánh giá 08/11/2026,
so từng ô bảng §10.4 (kết luận + `ly_do`; phòng ban khi đã chốt Q2/Q3). Các ô phụ thuộc Q1 (B × N3, B × N1) và Q5
(hạn cụ thể) đánh dấu riêng, chốt xong mới khóa.

| | A | B | C |
|---|---|---|---|
| L1 (C0) | áp dụng | áp dụng | áp dụng |
| L2 (C3) | không áp dụng | áp dụng | không áp dụng |
| L3 (C2+C3) | áp dụng | không áp dụng | không áp dụng |
| T1 (C3) | không áp dụng | áp dụng | không áp dụng |
| N2 15% | cần bổ sung `can_chuyen_mon` | không áp dụng | không áp dụng |
| N3 17% | không áp dụng | **Q1**: cần bổ sung `can_chuyen_mon` (phần thu nhập còn lại) hoặc không áp dụng (bác bỏ toàn phần) | không áp dụng |
| X3 | không áp dụng | áp dụng | không áp dụng |
| N1 20% | cần bổ sung (phụ thuộc N2) | **Q1**: cần bổ sung (phụ thuộc N3) | áp dụng |

### R1 — định tuyến "cần bổ sung" (việc 6) — `filterDomain.ts` `syncDiagnostics` (dòng 250–314), `phanBoDiagnostic.ts`

- Tách quyết định định tuyến thành hàm thuần `keHoachDiagnostic(danhGia, primaryDepartments, departments, existing)`.
- `chua_du_thong_tin`: chưa có dòng nào → tạo **1 dòng, `department_id = null`** (người đầu mối nhận qua trigger
  `hoi_bo_sung`); đã có dòng (đang cho_duyet) → cập nhật như hiện tại. Không còn nhánh "không tạo diagnostic".
- `ap_dung`/`sap_ap_dung` không có phòng khớp và không có Ban giám đốc → **Q3**: tạo dòng `department_id = null`, người
  đầu mối chọn phòng khi duyệt (đề xuất), thay vì bỏ rơi như hiện tại.
- Dòng phòng null chuyển sang áp dụng ở lượt quét sau → gán phòng đích đầu tiên, phòng còn lại tạo mới.
- UI tối thiểu: `diagnostic-review.tsx`, `hoi-bo-sung.tsx`, `customer-overview.tsx`, `onboarding-form.tsx` (khối kết quả)
  hiển thị dòng không phòng ban và **lý do**; `hoi-bo-sung.tsx` chỉ hiện câu hỏi khi `ly_do` có `ho_so_thieu`, hai lý do
  còn lại hiện chữ giải thích (`lib/copy.ts`), không có nút trả lời.
- Test (`tests/dinhTuyen.test.ts`): (a) DN chỉ có Kế toán, nghĩa vụ `primary = [kinh_doanh]`, kết luận `chua_du_thong_tin`
  → 1 dòng phòng null (tái hiện đúng hồ sơ `6137ba33…` của baseline: 7 kết quả bị rơi); (b) có phòng khớp → giữ hành vi
  cũ; (c) dòng phòng null → áp dụng → được gán phòng.

### F1 — form hồ sơ (việc 7) — `lib/schemas.ts`, `lib/onboard.ts`, `components/nexora/onboarding-form.tsx`, `thuoc-tinh-field.tsx`

- `lib/schemas.ts:18`: `nganh` thành `nullable()` (lựa chọn "Chưa chắc" = null). `nganh` không thuộc T0–T3 và chỉ TT 77
  dùng — giữ cột, không bắt buộc. `lib/onboard.ts:63` đã nhận null → hai đường thống nhất.
- Bước 3 render theo `tang` (T0 → T3), bỏ lọc theo `domain` cho các trường T0–T3 (chúng dùng chung ba luật).
- `thuoc-tinh-field.tsx`: kiểu `date`; cặp "sự kiện có/không/không chắc + ngày" hiển thị cùng nhau.
- Test (`tests/onboard.test.ts`): `onboardingStep1` nhận `nganh: null`; mọi trường `tang` ∈ T0–T3 nhận null; gửi
  `co_giao_dich_lien_ket` → bị từ chối (không còn trong danh sách được hỏi); hồ sơ không trả lời doanh thu → N2/N3 ra
  `ho_so_thieu` (nối với bộ A/B/C).

### U1 — màn chuyên viên (công cụ cho việc 8 và gán mã) — `draft-review.tsx`, `dieu-kien-editor.tsx`, `lib/data/rpc.ts`, `lib/entity-rules.ts`

- Với `chu_the`/`dieu_kien`/`nguong`: chọn mã (từ `bo_ma_dieu_kien`); theo nhóm hiện đúng một thao tác: xác nhận phạm vi
  chung / viết điều kiện máy đọc / gắn cờ + nhập số hiệu văn bản dẫn chiếu. `hanh_vi`: chọn `pham_vi`.
- Thêm cạnh ngoại lệ: chọn nghĩa vụ đích, loại (bác bỏ / thay thế), `can_cu` trích nguyên văn.
- Nút duyệt khóa khi thiếu trường (DB vẫn là nơi chặn thật).
- `lib/data/rpc.ts`: chữ ký `approve_entity` mới.

### G1 — `generateDiagnostic.prompt.ts` → `generate-v2` (ranh giới)

Prompt hiện tại (`generate-v1`) yêu cầu LLM viết `cac_buoc` "1–5 bước cụ thể" và `luu_y` — tức là hướng dẫn cách làm,
trái §6.2 và ranh giới. Sửa: schema chỉ còn `tieu_de` (nêu nghĩa vụ, không động từ mệnh lệnh kiểu hướng dẫn) và
`thoi_han`; căn cứ + phòng ban + ngày do code ghép (như `formatDiagnostic` đang làm). Thêm chốt chặn bằng code: loại
bản viết có từ khóa đề xuất ("nên", "cần chuẩn bị", "bước", "khuyến nghị"…) → giữ `noi_dung_diagnostic` null, ghi lý do
vào `pipeline_runs.output`. Test: `numbersNotInSource` giữ nguyên + test bộ lọc từ khóa. Nội dung cũ đã duyệt không đổi.

### L10 — S10 (§12 #6) — `filterDomain.ts`, `lib/pipeline/runs.ts`

- `pipeline_runs.input` thêm `ngay_danh_gia`, `thu_vien: { phien_ban, so_nghia_vu }` với `phien_ban` = sha256 của danh
  sách (id, `updated_at`) các entity + cạnh đã duyệt đã đọc. Bản chụp giá trị hồ sơ đã có (`input.thuoc_tinh`).
- `diagnostics.ngay_danh_gia` ghi mỗi lần cập nhật. `output.ket_qua` đã chứa điều kiện + giá trị đã dùng.
- Không đổi bảng `diagnostics` thành append-only (xem §5 #5).

### D9 — đo trước / sau (việc 9) — `scripts/research/do-truoc-sau.mjs`

- Đầu vào: thư viện (đọc DB, chỉ đọc), tập hồ sơ (`research/ho-so/*.json`: hồ sơ SME thật + bộ tổng hợp phủ các ngưỡng
  T1 = 2,5 / 3 / 3,0001 / 20 / 50 / 65 tỷ, mọi loại hình, sự kiện có/không/không chắc), `ngay_danh_gia` cố định.
- Chạy **hai engine trên cùng đầu vào**: engine cũ (bản sao `ruleEngine.ts` tại `spawnx-final` đặt ở
  `scripts/research/engine-v0/`, chỉ dùng để đo) và engine mới. Tính lại hồ sơ offline — không ghi `diagnostics`.
- Xuất `research/sau/SUMMARY.md`: Δ, tỉ lệ cần bổ sung (chia theo 3 lý do), tỉ lệ tất định câm, D(S), phân bố C0–C7 —
  đúng bảng §14.4, đặt cạnh cột "Dự đoán sau" nhóm đã điền trước.
- Hai lát cắt: (i) **chỉ Luật 108, cùng bộ đề xuất LLM** (H2), cũ vs mới → tách tác động của quy tắc + duyệt;
  (ii) thư viện ba luật → kết quả cuối.

---

## 4. Việc không phải code (giao người trong nhóm)

| # | Việc | §14.1 | Đầu ra | Hạn | Cần trước |
|---|---|---|---|---|---|
| N1 | Lấy bản hợp nhất LDN (59/2020 + 03/2022 + 76/2025) và TNDN (67/2025 + các luật sửa đổi, có 09/2026); bảng: khoản bị sửa / văn bản sửa / ngày hiệu lực | 1 | File `.md` từng luật + bảng sửa đổi | 10/11 | — |
| N2 | Chọn 25–40 quy định theo §2.2 (ghi tiêu chí thỏa cho từng quy định); nạp qua màn `nhap-van-ban`, chạy trích xuất | 2 | Danh sách quy định + van_ban `draft` trên project mới | 12/11 | N1, H2 |
| N3 | Hai người gán mã C0–C7 **độc lập** 20–30 quy định (bảng tính: id quy định, trích dẫn, mã người 1, mã người 2, ghi chú); tính Cohen's kappa; sửa sổ tay mã; gán toàn bộ | 3 | Bảng gán mã, kappa, sổ tay mã v2 | 13/11 | N2 |
| N4 | Duyệt lại Luật 108 trên project mới: 23 chủ thể → xác nhận `pham_vi = chung` hoặc gắn điều kiện/mã; xem lại 5 điều kiện từng bị từ chối (giờ duyệt được với cờ C4–C7); 13 hành vi từng bị từ chối | 8 | Thư viện 108 đã duyệt có mã | 13/11 | H2, M7, U1 |
| N5 | Viết điều kiện máy đọc C1–C3; gán `primary_departments`; thêm cạnh ngoại lệ (Đ10 k1–k3, Đ18 k3, k4) | 2–3 | Thư viện ba luật đã duyệt | 14/11 | M8, U1, N3 |
| N6 | Hồ sơ SME thật (có đồng ý) + bộ hồ sơ tổng hợp phủ ngưỡng | 9 | `research/ho-so/*.json` (hồ sơ thật → gitignore) | 14/11 | F1 (danh sách trường) |
| N7 | Điền cột "Dự đoán sau" §14.4 **trước** khi chạy đo | 9 | Bảng dự đoán có ngày | 14/11 | — |
| N8 | Chuyên gia ngoài nhóm kiểm tính đúng pháp lý mẫu kết luận | — | Biên bản | 16/11 | D9 |

---

## 5. Chỗ HE_THONG_DA_CHOT.md mâu thuẫn với code thật hoặc khó kịp hạn

| # | Chỗ | Vấn đề | Đề xuất |
|---|---|---|---|
| 1 | §10.4 B × N3, B × N1 | Kết quả "cần bổ sung cho phần thu nhập không phải trò chơi" / "áp dụng cho phần thu nhập trò chơi" cần khái niệm **phần thu nhập**. §8 lại nói ngoại lệ bác bỏ thỏa → không áp dụng (cả nghĩa vụ). Hai mục mâu thuẫn; engine không có đơn vị "phần thu nhập" | **Q1.** (a) Thêm `chi_mot_phan` trên cạnh ngoại lệ: ngoại lệ một phần không hủy gốc, gốc tiếp tục xét (ra đúng §10.4), X3 tự áp dụng; hoặc (b) theo đúng §8, sửa §10.4 (N3 của B = không áp dụng) |
| 2 | §10.4 hạn "13/11", "15/11" | Tính hạn cụ thể từ ngày sự kiện cần điều kiện thời hạn máy đọc — không có trong §12 và §14.1 | **Q5.** P0 chỉ trả thời hạn dạng chữ (entity `thoi_han`); hạn cụ thể vào P1 / Chương XIII |
| 3 | §10.1, §10.4 "Hành chính" | Không có trong 8 mã `slug_phong_ban` | **Q2.** Thêm `hanh_chinh` vào enum (M10) hoặc ánh xạ sang `van_hanh` |
| 4 | §10.4 L1 cho B ("Hành chính vì không có Ban giám đốc") | Định tuyến hiện chỉ dự phòng Ban giám đốc (§6.2 ghi đúng hiện trạng) | **Q3.** Chuyên viên gán `primary_departments = [ban_giam_doc, hanh_chinh]` (giao mọi phòng khớp — DN mẫu không có cả hai); không khớp gì → dòng phòng null, người đầu mối chọn |
| 5 | §1 "không sửa kết luận cũ", §12 #6 | `diagnostics` được cập nhật tại chỗ (UNIQUE theo DN × nghĩa vụ × phòng; UI, duyệt, thông báo dựa vào đó) | `pipeline_runs.output` (append-only, DB khóa sau khi xong) là nhật ký kết luận bất biến; `diagnostics` là trạng thái hiện hành. Ghi rõ trong báo cáo |
| 6 | §8 C4–C7 "gắn cờ, chưa xác định" | CHECK `entities_dieu_kien_duyet_phai_may_doc` và `approve_entity` chặn duyệt `dieu_kien`/`nguong` không có máy đọc → C4–C7 không vào được thư viện | Nới trong M7 (máy đọc **hoặc** cờ không hình thức hóa) |
| 7 | §8 "chưa xác nhận → cần bổ sung" | RLS ẩn entity chưa duyệt với khách hàng → kết quả S9 khác nhau theo người bấm quét | View `canh_dieu_kien_nghia_vu` trong M7 + test #5 |
| 8 | §6.2 bước 5 "LLM chỉ nêu…" | Prompt `generate-v1` bắt LLM viết 1–5 bước làm + lưu ý — đang vượt ranh giới; §14.1 không liệt kê | G1 (P0 vì là ranh giới) |
| 9 | §10.2 T1 "C3; thủ tục theo Luật 108 (C4)" nhưng §10.4 T1 = áp dụng | Theo §8, gắn C4 lên điều kiện sẽ ra cần bổ sung | Sổ tay mã: C4 chỉ gắn khi dẫn chiếu **là điều kiện áp dụng**; dẫn chiếu về thủ tục là cạnh `tham_chieu`, không phải điều kiện |
| 10 | §2.3, §5 S2 "ngày hết hiệu lực từng khoản", §12 #4 "S9 đọc `van_ban_thay_the`" | `van_ban_thay_the.dieu_khoan` là chữ tự do, không nối được tới entity bằng code | S2 thủ công điền `entities.ngay_het_hieu_luc`; S9 chỉ đọc bảng thay thế qua `van_ban.trang_thai` |
| 11 | §9.2 VSIC, niêm yết | Theo chính nguyên tắc §9.2, trường chỉ có khi một quy định C1–C3 dùng. VSIC: LDN Đ8 k1 là C4, TNDN Đ18 k3 đã có cờ T3 riêng → không quy định C1–C3 nào trong §10 dùng. VSIC tìm theo mô tả là việc giao diện lớn | **Q6.** Bỏ VSIC và "niêm yết" khỏi P0 trừ khi N2 chọn quy định C1–C3 cần chúng |
| 12 | §13.1 | Số đo 09/11 (`research/baseline/SUMMARY.md`): Δ tính lại = 2 khớp, nhưng Δ theo lượt đã lưu = 4 (3 DN quét lần cuối khi Luật 109/2025/QH15 còn active; nay `draft`, vẫn có 1 nghĩa vụ đã duyệt). "20 thuộc tính + 5 trường" thực tế là 18 + 5 = 23 trường phân biệt (`nganh`, `quy_mo` tính hai lần) | Sửa §13.1 khi viết Chương IX; ghi rõ Δ = 2 là tính lại trên thư viện 09/11 |
| 13 | §14.1 việc 3 (13/11) sau việc 2 (12/11) | Gán mã hai người + kappa + gán toàn bộ trong 1 ngày sau khi mới chọn xong quy định | Bắt đầu N3 trên 20–30 quy định đầu tiên ngay khi N2 có danh sách (chưa cần nạp xong) |
| 14 | §2.3 "ưu tiên bản hợp nhất chính thức" | Văn bản hợp nhất chính thức cho LDN sửa đổi 2025 và TNDN sửa đổi 2026 có thể chưa ban hành | N1 ghi rõ nguồn; nếu tự hợp nhất thì nêu ở Chương XIII |
| 15 | §6.1 bước 9, §13.3 | Kích hoạt văn bản là UPDATE trực tiếp, không ghi `approvals` | Để P1 (§14.2) như tài liệu; trên project mới vẫn ghi nhận là giới hạn |

---

## 6. Rủi ro

- **Quota Groq** (~1.000 request/ngày; nếu Preview dùng chung `GROQ_API_KEY` với Production thì chung quota): N2 nạp 25–40 quy định + generate. Không chạy lại
  extract cho Luật 108 (H2 dùng đề xuất cũ) nên tiết kiệm được 9 chunk.
- **Project mới bị pause** nếu 7 ngày không hoạt động — trong 10–21/11 có hoạt động hằng ngày; sau 21/11 cần nhớ unpause
  trước khi chấm/demo.
- **Hai DB song song:** `.env.local` sau H0 trỏ project mới; mọi script ghi đều in tên project ở dòng đầu và từ chối
  chạy nếu host trùng `qalexz…` (trừ script chỉ đọc).
- **Bản chụp trước can thiệp** chỉ có ở `research/baseline/raw/` trên một máy (gitignore). Đề nghị chép thêm một bản vào
  ổ của nhóm.

---

## 7. Câu hỏi cần quyết

- **Q1** Ngoại lệ một phần (B × N3, B × N1): thêm `chi_mot_phan` để ra đúng §10.4, hay theo §8 và sửa §10.4?
- **Q2** "Hành chính": thêm mã `hanh_chinh` hay ánh xạ `van_hanh`?
- **Q3** Nghĩa vụ áp dụng mà DN không có phòng khớp và không có Ban giám đốc: tạo dòng phòng null cho người đầu mối chọn?
- **Q4** H2 nạp lại cả TT 77 và Luật 109 (để `draft`, ngoài thư viện) hay chỉ Luật 108?
- **Q5** Hạn cụ thể theo ngày sự kiện: để P1?
- **Q6** Bỏ VSIC và "niêm yết" khỏi form P0?
