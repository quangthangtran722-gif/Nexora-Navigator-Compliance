-- 008a_thu_hep_quyen.sql — thu hẹp nốt bề mặt quyền còn thừa sau 008 (chủ repo chốt 11/11).
-- Bối cảnh: research/quyen/RA_SOAT_QUYEN.md §4. Áp sau 008, trên project MIS. KHÔNG áp lên prod. Idempotent.
-- Kiểm: supabase/tests/quyen_kiem_thu.sql (quét toàn bộ, không phụ thuộc quy ước "mỗi migration tự REVOKE").
--
--   (a) Ba view security_invoker (entity_graph, ner_extraction_summary, van_ban_replacement_chain): chỉ còn SELECT.
--       Ứng dụng chỉ đọc qua view; ghi qua view vẫn bị RLS bảng gốc chặn, nhưng quyền ghi không có lý do tồn tại.
--   (b) van_ban_thay_the: gỡ UPDATE. Bảng không có policy UPDATE nên RLS đang chặn mọi UPDATE; để quyền nằm sẵn thì
--       ai thêm policy UPDATE sau này là mở ngay.
--   (c) anon (chưa đăng nhập): gỡ MỌI quyền trên bảng / view / sequence / hàm của schema public, và gỡ khỏi quyền mặc
--       định của vai postgres. anon không đọc được bảng nào, nên không có đường thực thi nào cần EXECUTE (12 hàm sao từ
--       prod: 10 hàm trigger — không gọi trực tiếp được, is_curator, current_customer_id, dieu_kien_may_doc_hop_le).
--       Giữ USAGE trên schema (PostgREST cần để trả lỗi quyền đúng chuẩn).
--   (d) Quyền mặc định do supabase_admin sở hữu (cấp ALL cho anon trên bảng / hàm tạo bởi vai đó trong public) KHÔNG sửa
--       được bằng vai postgres — trần do nền tảng đặt. Phần này do test quét bắt, không do migration.

begin;

-- (a)
revoke insert, update, delete on public.entity_graph, public.ner_extraction_summary, public.van_ban_replacement_chain
  from anon, authenticated;

-- (b)
revoke update on public.van_ban_thay_the from anon, authenticated;

-- (c)
revoke all on all tables in schema public from anon;
revoke all on all sequences in schema public from anon;
revoke all on all functions in schema public from anon;
alter default privileges for role postgres in schema public revoke all on tables from anon;
alter default privileges for role postgres in schema public revoke all on sequences from anon;
alter default privileges for role postgres in schema public revoke all on functions from anon;

-- Hàm mặc định cấp EXECUTE cho PUBLIC (mọi vai, gồm anon) — gỡ quyền riêng của anon là chưa đủ.
-- Giữ nguyên quyền của authenticated / service_role: cấp tường minh trên đúng các hàm đang mở cho PUBLIC, rồi thu PUBLIC.
-- (RLS gọi is_curator / current_customer_id bằng quyền của người gọi → authenticated phải giữ EXECUTE.)
do $$
declare r record;
begin
  for r in select p.oid::regprocedure as f
             from pg_proc p join pg_namespace n on n.oid = p.pronamespace
            where n.nspname = 'public' and has_function_privilege('public', p.oid, 'EXECUTE') loop
    execute format('grant execute on function %s to authenticated, service_role', r.f);
    execute format('revoke execute on function %s from public', r.f);
  end loop;
end $$;
-- Hàm vai postgres tạo sau này không còn tự cấp cho PUBLIC (mặc định toàn cục — Postgres không cho thu PUBLIC theo schema).
-- Migration tạo hàm phải GRANT tường minh cho authenticated (007, 008 đã làm).
alter default privileges for role postgres revoke execute on functions from public;

commit;
