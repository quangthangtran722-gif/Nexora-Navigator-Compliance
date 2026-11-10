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

**Còn thừa, chưa gỡ (chờ chủ repo quyết):**
1. Ba view `security_invoker` có INSERT / UPDATE / DELETE. Ghi qua view vẫn bị RLS bảng gốc chặn, ứng dụng chỉ đọc — thu về
   SELECT không ảnh hưởng gì.
2. `van_ban_thay_the` có quyền UPDATE nhưng không có policy UPDATE → RLS đã chặn mọi UPDATE; gỡ quyền cho khớp.
3. Quyền mặc định vẫn cấp SELECT / INSERT / UPDATE / DELETE cho `anon`, `authenticated` trên bảng tạo sau này (gốc của 31
   quyền lệch ở H1). Hiện chặn bằng quy ước "mỗi migration tự REVOKE" (007, 008 đã làm). Có thể gỡ hẳn ở quyền mặc định.
4. Quyền mặc định do `supabase_admin` sở hữu không sửa được bằng vai `postgres`.

## 5. Cấp vai trò duyệt

Vai trò chuyên viên (`app_metadata.nexora_role = "curator"`) **do người cấp qua bảng điều khiển quản trị Supabase**, không bao
giờ do pipeline, script hay AI. Lý do: ai cấp được vai trò curator thì tự cấp cho mình được, và có curator là duyệt được — cấp
vai trò nằm phía trên duyệt trong chuỗi quyền. `app_metadata` chỉ khóa quản trị ghi được; người dùng không tự sửa được (khác
`user_metadata`). Nếu hai tài khoản chuyên viên cùng do một người nắm, nguyên tắc người duyệt ≠ người tạo (ép ở CSDL theo tài
khoản) không bảo đảm được hai **người** — giới hạn của nhóm nhỏ, ghi rõ trong báo cáo.
