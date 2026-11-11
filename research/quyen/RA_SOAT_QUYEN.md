# Rà soát bề mặt quyền của vai đăng nhập (project MIS)

> Ghi 10/11/2026. Phát hiện ở H1 (09/11), vá ở migration `008_ngoai_le_hieu_luc.sql` (M8), kiểm chứng ở
> `supabase/tests/008_kiem_thu.sql`. Chỉ áp trên project MIS; **prod giữ nguyên** làm mốc trước can thiệp.

## 1. Phát hiện

1. **Dựng lại môi trường từ bản dump âm thầm lỏng quyền hơn bản gốc (H1).** `pg_dump` không ghi lại các lệnh REVOKE đã chạy
   trên prod. Project Supabase mới tự cấp ALL cho `anon`, `authenticated` trên mọi bảng / hàm mới (quyền mặc định của schema
   `public`). Áp `000_baseline_prod.sql` lần đầu ra **31 quyền lệch**, phía MIS rộng hơn prod — trong đó `anon` (chưa đăng
   nhập) có toàn quyền trên 16 bảng / view. Đã thêm khối REVOKE vào `000`, dựng lại, so sánh 15 nhóm đối tượng: 0 chênh lệch
   (`research/schema-diff/BAO_CAO.md`). Lưu ý về khả năng tái lập: ai dựng lại hệ từ bản dump mà không so quyền sẽ có một CSDL
   chạy được, qua test chức năng, nhưng mở cho người chưa đăng nhập.
2. **Vai đăng nhập (`authenticated`) có bốn quyền ứng dụng không dùng, trên mọi bảng, kể cả `approvals`, `pipeline_runs`**
   (có trên prod; MIS sao y):
   - `TRUNCATE` — xóa sạch bảng, không đi qua RLS, không kích hoạt trigger theo dòng. Xóa được toàn bộ nhật ký duyệt `approvals`.
   - `TRIGGER` — gắn trigger lên bảng. Ai gắn được trigger lên `entities` thì chen được vào quanh `guard_trang_thai_duyet`,
     tức đánh vào chính cơ chế bảo đảm "chỉ người thật duyệt, qua hàm duyệt".
   - `REFERENCES`, `MAINTAIN` — tạo khóa ngoại trỏ vào bảng; VACUUM / ANALYZE / LOCK / REINDEX. Rủi ro thấp hơn, không dùng.

   Hiện chưa khai thác được qua ứng dụng (PostgREST không chạy TRUNCATE / CREATE TRIGGER). Nhưng luận điểm trung tâm của hệ là
   "quản trị cưỡng chế ở tầng CSDL, mọi lần duyệt đều có vết" — một quyền xóa sạch nhật ký duyệt nằm sẵn trên vai đăng nhập mâu
   thuẫn trực tiếp với luận điểm đó, bất kể hôm nay có đường gọi hay chưa.

## 2. Vá (M8)

- Gỡ `TRUNCATE`, `TRIGGER`, `REFERENCES`, `MAINTAIN` của `anon`, `authenticated` trên mọi bảng / view schema `public`.
- Gỡ bốn quyền này khỏi **quyền mặc định** (`alter default privileges for role postgres in schema public`) để bảng tạo sau
  không tự nhận lại.
- Trước khi gỡ đã rà `scripts/`, `tests/`, `lib/`, `app/`, `supabase/tests/`: không chỗ nào dùng bốn quyền này.
- Không đổi `service_role` (khóa quản trị, vốn bỏ qua RLS, chỉ nằm phía máy chủ) và `postgres`.

## 3. Kiểm chứng lại

`supabase/tests/008_kiem_thu.sql` (một transaction, ROLLBACK cuối file):

| Ca | Nội dung | Kết quả |
|---|---|---|
| 09b-1, 09b-2 | Cấp lại tạm `TRIGGER`, `TRUNCATE` như prod → vai đăng nhập **gắn được** trigger lên `entities`, **xóa sạch được** `approvals` | Lỗ hổng trước khi vá là có thật |
| 02 | Không bảng / view nào của `public` còn bốn quyền cho `anon`, `authenticated` | Đạt |
| 04 | Bảng tạo sau migration không tự nhận bốn quyền | Đạt |
| 08, 09 | Sau vá: `truncate approvals` và `create trigger … on entities` bị từ chối (42501) | Đạt |
| 10 | Vai đăng nhập không có quyền CREATE trong schema `public` | Đạt |
| 03 | `service_role`, `postgres` giữ nguyên | Đạt |

RLS và trigger hiện có vẫn chạy đúng sau khi gỡ: bộ test 007 (31 ca) và 008 (47 ca chức năng) qua; `npm test` 43/43.

## 4. Bề mặt quyền còn lại sau M8 (đọc từ MIS, 10/11)

`anon` không còn quyền nào trên bảng / view nào. `authenticated`:

| Đối tượng | RLS | Quyền bảng | UPDATE theo cột | Policy |
|---|---|---|---|---|
| approvals | bật | SELECT | — | S |
| bo_ma_dieu_kien | bật | SELECT | — | S |
| customers | bật | INSERT, SELECT | ten_cong_ty, nganh, quy_mo, domains, thuoc_tinh | I, S, U |
| departments | bật | INSERT, SELECT, UPDATE | — | I, S, U |
| diagnostics | bật | INSERT, SELECT | department_id, trang_thai_ap_dung, thuoc_tinh_thieu, noi_dung_diagnostic, filter_run_id, generate_run_id | I, S, U |
| entities | bật | INSERT, SELECT | 14 cột nội dung (không có `trang_thai_duyet`, `curator_id`) | I, S, U |
| entity_relationships | bật | DELETE, INSERT, SELECT | target_entity_id, target_ref_text, can_cu (không có `trang_thai_duyet`) | D, I, S, U |
| nganh, thuoc_tinh_ho_so, van_ban, van_ban_chunks | bật | INSERT, SELECT, UPDATE | — | I, S, U |
| notifications | bật | SELECT | da_doc | S, U |
| pipeline_runs | bật | INSERT, SELECT | trang_thai, output, error_log, started_at, completed_at | I, S, U |
| van_ban_thay_the | bật | DELETE, INSERT, SELECT, **UPDATE** | — | D, I, S (**không có policy U**) |
| canh_dieu_kien_nghia_vu (view, definer có chủ đích) | — | SELECT | — | — |
| entity_graph, ner_extraction_summary, van_ban_replacement_chain (view, invoker) | — | SELECT, **INSERT, UPDATE, DELETE** | — | theo RLS bảng gốc |

Cột trạng thái duyệt (`entities.trang_thai_duyet`, `entity_relationships.trang_thai_duyet`) không có quyền UPDATE cho vai
đăng nhập; chỉ đổi được qua các hàm `approve_*` (security definer) + trigger `guard_trang_thai_duyet`.

Bốn chỗ còn thừa sau M8 (chủ repo chốt 11/11) — xử lý ở `008a_thu_hep_quyen.sql`, mục 5 dưới đây.

## 5. Vòng hai (008a, 11/11): thu nốt phần thừa, thay quy ước bằng test quét

| # | Chỗ thừa | Xử lý |
|---|---|---|
| a | Ba view `security_invoker` có INSERT / UPDATE / DELETE | Thu về SELECT |
| b | `van_ban_thay_the` có UPDATE nhưng không có policy UPDATE (RLS đang chặn; thêm policy ẩu là mở ngay) | Gỡ UPDATE |
| c | `anon` còn EXECUTE trên 12 hàm; quyền mặc định của vai `postgres` cấp ALL cho `anon` trên bảng / sequence / hàm tạo sau | Gỡ mọi quyền của `anon` trong `public` + gỡ khỏi quyền mặc định. Hàm: Postgres cấp EXECUTE cho **PUBLIC** (mọi vai) theo mặc định, nên gỡ riêng `anon` không đủ — cấp tường minh cho `authenticated` / `service_role` trên đúng các hàm đang mở cho PUBLIC (giữ nguyên quyền của hai vai này), rồi thu PUBLIC, và thu mặc định EXECUTE-cho-PUBLIC của hàm vai `postgres` tạo sau |
| c′ | Quy ước "mỗi migration tự REVOKE" phụ thuộc trí nhớ | Thay bằng **test quét** `supabase/tests/quyen_kiem_thu.sql`, chạy bằng `npm run test:db` sau mỗi migration: quét MỌI bảng / view / sequence / hàm, fail nếu `anon` có quyền ngoài danh sách cho phép (rỗng), `authenticated` còn 4 quyền đã gỡ, bảng chưa bật RLS, view cho ghi, hoặc đối tượng vai `postgres` tạo mới tự cấp cho `anon` (tạo thật trong transaction rồi đo) |
| d | Quyền mặc định do `supabase_admin` sở hữu | **Không gỡ được** — xem phát hiện 3 |

**Phát hiện → vá → kiểm chứng:** chạy test quét TRƯỚC khi áp 008a → fail ở Q2 (`anon` gọi được 12 hàm). Áp lần 1 (chỉ gỡ quyền
riêng của `anon`) → vẫn fail, 11 hàm — vì quyền đến từ PUBLIC, không phải cấp riêng; đây là lý do test quét bằng hành vi
(`has_function_privilege`) chứ không đọc danh sách GRANT. Áp bản sửa → Q1–Q6 qua. Sau đó: `anon` không còn quyền nào trong
`public`; mọi RPC ứng dụng gọi (`approve_*`, `onboard_customer`) vẫn gọi được bằng `authenticated`; bộ test 007 (31) và 008 (49)
qua. Một lỗi phát sinh và đã xử lý: hai ca của test 007 chạy bằng vai `anon` gọi hàm hỗ trợ của chính bộ test — trước đây gọi
được nhờ PUBLIC; đã cấp riêng cho hàm hỗ trợ trong file test (không đụng sản phẩm).

**Phát hiện 3 — trần của quản trị tầng CSDL do nền tảng đặt.** Supabase cài sẵn quyền mặc định do vai nội bộ
`supabase_admin` sở hữu: mọi bảng, sequence, hàm mà vai này tạo trong `public` tự cấp toàn quyền cho `anon` và `authenticated`
(`arwdDxtm` / `rwU` / `X`). Vai `postgres` — vai cao nhất mà chủ project được dùng — không sửa được quyền mặc định của vai khác.
Nghĩa là: thiết kế "cưỡng chế ở tầng CSDL" của đồ án chỉ chạm tới phần CSDL mà nền tảng cho phép chủ project quản trị; phần
còn lại thuộc về nhà cung cấp. Đồ án không tạo đối tượng nào bằng `supabase_admin`, nên hiện không có đối tượng nào bị ảnh hưởng
(Q1 / Q2 qua). Cách bù được: phát hiện thay vì ngăn — test quét bắt mọi đối tượng có quyền của `anon`, bất kể vai nào tạo; test
còn in trạng thái quyền mặc định của `supabase_admin` (Q7) để thấy nếu nền tảng đổi. Giới hạn của cách bù: test chỉ bắt được khi
có người chạy nó; nó không chặn ở thời điểm tạo đối tượng.

## 6. Cấp vai trò duyệt

Vai trò chuyên viên (`app_metadata.nexora_role = "curator"`) **do người cấp qua bảng điều khiển quản trị Supabase**, không bao
giờ do pipeline, script hay AI. Lý do: ai cấp được vai trò curator thì tự cấp cho mình được, và có curator là duyệt được — cấp
vai trò nằm phía trên duyệt trong chuỗi quyền. `app_metadata` chỉ khóa quản trị ghi được; người dùng không tự sửa được (khác
`user_metadata`). Nếu hai tài khoản chuyên viên cùng do một người nắm, nguyên tắc người duyệt ≠ người tạo (ép ở CSDL theo tài
khoản) không bảo đảm được hai **người** — giới hạn của nhóm nhỏ, ghi rõ trong báo cáo.

**Kiểm 11/11 (chỉ đọc):** hai tài khoản chuyên viên trên MIS do chủ repo tạo và gắn vai trò trong Dashboard. Kiểm chéo: vai trò
nằm ở `raw_app_meta_data` (không ở `raw_user_meta_data`), `nexora_role = curator`, email đã xác nhận, không có `customer_id`;
chạy `is_curator()` trong vai `authenticated` với JWT dựng từ đúng `raw_app_meta_data` đang lưu → `true` cho cả hai,
`auth.uid()` khớp, `current_customer_id()` null. Lần gắn đầu chưa có tác dụng (`app_metadata` thiếu `nexora_role`) — phát
hiện nhờ kiểm chéo, chủ repo chạy lại.
