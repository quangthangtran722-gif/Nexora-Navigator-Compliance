# So sánh schema `public`: prod SpawnX ↔ project MIS (H1)

Sinh bởi `scripts/mis/so-sanh-schema.mjs` lúc 2026-11-09T12:30:25.748Z. Chỉ đọc trên cả hai DB.
Nguồn: project cũ `qalexzctwbezrbhasuvp` (prod SpawnX) và project mới `sttopelrdxvyszfvvcrn` (MIS), sau khi áp
`supabase/migrations/000_baseline_prod.sql`. Cách làm: `docs/mis/PLAN.md` §1.2.

**Kết quả: không có chênh lệch** (không tính hai dòng "tham khảo").

| Loại | prod | MIS | chỉ ở prod | chỉ ở MIS | khác giá trị |
|---|---:|---:|---:|---:|---:|
| Bảng / view / index / sequence (loại, RLS, tùy chọn) | 61 | 61 | 0 | 0 | 0 |
| Cột (kiểu, default, not null, thứ tự) | 167 | 167 | 0 | 0 | 0 |
| Ràng buộc (PK, FK, CHECK, UNIQUE) | 78 | 78 | 0 | 0 | 0 |
| Chỉ mục | 45 | 45 | 0 | 0 | 0 |
| Hàm (chữ ký, kết quả, security definer, md5 định nghĩa) | 18 | 18 | 0 | 0 | 0 |
| Trigger | 15 | 15 | 0 | 0 | 0 |
| RLS policy (biểu thức) | 37 | 37 | 0 | 0 | 0 |
| Enum (giá trị theo thứ tự) | 14 | 14 | 0 | 0 | 0 |
| View (md5 định nghĩa) | 3 | 3 | 0 | 0 | 0 |
| GRANT trên bảng / view | 48 | 48 | 0 | 0 | 0 |
| GRANT theo cột | 29 | 29 | 0 | 0 | 0 |
| GRANT trên hàm | 73 | 73 | 0 | 0 | 0 |
| Quyền trên schema public | 6 | 6 | 0 | 0 | 0 |
| Quyền mặc định (ALTER DEFAULT PRIVILEGES) trong public | 24 | 24 | 0 | 0 | 0 |
| COMMENT (md5) | 16 | 16 | 0 | 0 | 0 |
| Chủ sở hữu (tham khảo) | 16 | 16 | 0 | 0 | 0 | tham khảo
| Extension toàn DB (ngoài phạm vi dump — tham khảo) | 5 | 5 | 0 | 0 | 0 | tham khảo


## Phạm vi so sánh

- So: mọi đối tượng trong schema `public` — bảng, cột, ràng buộc, chỉ mục, hàm (theo md5 của `pg_get_functiondef`),
  trigger, RLS policy, enum, view, GRANT bảng / cột / hàm / schema, quyền mặc định, COMMENT.
- Bỏ qua người cấp quyền (`grantor`): khác nhau giữa hai project là bình thường.
- **Không** so: schema `auth`, `storage` và cấu hình Auth (Site URL, redirect, xác nhận email) — không nằm trong dump,
  chỉnh tay ở bảng điều khiển (PLAN.md §1.1 bước 6). Đã kiểm: bản dump không có trigger nào trên `auth.users`.
- Bỏ khỏi bản dump trước khi áp (ghi ở đầu `000_baseline_prod.sql`): `\restrict`/`\unrestrict`, `CREATE SCHEMA public`,
  `COMMENT ON SCHEMA public`, 12 dòng `ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_admin"`.

## Ghi chú H1 (09/11/2026)

1. **Lần áp đầu lệch 31 dòng, đều là GRANT, phía MIS rộng hơn prod**: `anon` có ALL trên 16 bảng / view,
   `authenticated` có thêm UPDATE / DELETE trên 12 bảng, `anon` / `authenticated` có EXECUTE trên `approve_chunk`,
   `cap_nhat_trang_thai_chunk`. Nguyên nhân: project Supabase mới có `ALTER DEFAULT PRIVILEGES` cấp ALL cho `anon`,
   `authenticated` khi tạo bảng / hàm; prod đã REVOKE bớt bằng migration 002–006, nhưng `pg_dump` chỉ sinh GRANT so với
   quyền của chủ sở hữu, không sinh REVOKE cho quyền mặc định. Sửa: `000_baseline_prod.sql` có khối
   `REVOKE ALL ON ALL TABLES / SEQUENCES / FUNCTIONS IN SCHEMA public FROM anon, authenticated` ngay trước phần ACL của
   dump; dựng lại project MIS từ đầu bằng file đã sửa → 0 chênh lệch (bảng trên).
2. **Hệ quả cho migration 007 trở đi**: quyền mặc định ở hai project vẫn cấp ALL cho `anon`, `authenticated` trên bảng /
   hàm mới. Mỗi bảng / hàm / view mới phải REVOKE rồi GRANT đúng quyền cần — RLS chặn dòng, nhưng không thay được GRANT.
3. **Quan sát trên prod (không sửa trong H1 — schema MIS phải bằng prod để làm mốc):** `authenticated` có `TRUNCATE`,
   `TRIGGER`, `REFERENCES`, `MAINTAIN` trên mọi bảng, kể cả `approvals`, `pipeline_runs`. `TRUNCATE` không đi qua RLS và
   không kích hoạt trigger theo dòng (`khoa_pipeline_run`). Qua PostgREST không gọi được `TRUNCATE`, nên trên ứng dụng hiện
   tại không khai thác được; chỉ là lỗ hổng nếu vai `authenticated` có đường SQL trực tiếp.
