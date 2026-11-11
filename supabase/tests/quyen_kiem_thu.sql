-- Test QUÉT bề mặt quyền của schema public — thay cho quy ước "mỗi migration tự REVOKE" (chủ repo chốt 11/11).
-- Quét MỌI bảng / view / sequence / hàm hiện có, không cần biết migration nào tạo ra chúng. Fail nếu:
--   Q1  anon có bất kỳ quyền nào trên bảng / view / sequence ngoài danh sách cho phép (hiện rỗng);
--   Q2  anon có EXECUTE trên hàm ngoài danh sách cho phép (hiện rỗng);
--   Q3  authenticated còn TRUNCATE / TRIGGER / REFERENCES / MAINTAIN ở bất kỳ đâu;
--   Q4  bảng nào trong public chưa bật RLS (bảng mới mặc định cấp quyền cho authenticated → không có RLS là mở);
--   Q5  view nào cho authenticated quyền ghi (INSERT / UPDATE / DELETE);
--   Q6  quyền mặc định của vai postgres trong public còn cấp gì cho anon.
-- Q7 chỉ BÁO (không fail): quyền mặc định do supabase_admin sở hữu vẫn cấp cho anon — trần do nền tảng đặt, vai postgres
-- không sửa được; bảng / hàm tạo bởi vai đó sẽ bị Q1 / Q2 bắt.
-- Chạy sau MỖI migration: npm run test:db (scripts/mis/chay-test-db.mjs). Chỉ đọc + một bảng tạm trong transaction, ROLLBACK.

\set ON_ERROR_STOP 1
set client_min_messages = notice;
\pset tuples_only on
\pset format unaligned
begin;

-- Danh sách cho phép: thêm dòng ở đây (kèm lý do trong chú thích) nếu thật sự cần mở cho anon. Hiện rỗng.
create temp table cho_phep_anon (doi_tuong text, quyen text) on commit drop;

create or replace function pg_temp.dung(p_dk boolean, p_ca text, p_chi_tiet text default null) returns void language plpgsql as $$
begin
  if not coalesce(p_dk, false) then raise exception 'SAI % — %', p_ca, coalesce(p_chi_tiet, ''); end if;
  raise notice 'OK %', p_ca;
end $$;

-- Q1
with vi_pham as (
  select c.relname || ':' || q.quyen as x
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
    cross join (values ('SELECT'), ('INSERT'), ('UPDATE'), ('DELETE'), ('TRUNCATE'), ('REFERENCES'), ('TRIGGER'), ('MAINTAIN')) q(quyen)
   where n.nspname = 'public' and c.relkind in ('r', 'p', 'v', 'm', 'f')
     and has_table_privilege('anon', c.oid, q.quyen)
     and not exists (select 1 from cho_phep_anon a where a.doi_tuong = c.relname and a.quyen = q.quyen)
  union all
  select c.relname || ':' || q.quyen
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
    cross join (values ('USAGE'), ('SELECT'), ('UPDATE')) q(quyen)
   where n.nspname = 'public' and c.relkind = 'S' and has_sequence_privilege('anon', c.oid, q.quyen)
     and not exists (select 1 from cho_phep_anon a where a.doi_tuong = c.relname and a.quyen = q.quyen)
)
select pg_temp.dung((select count(*) = 0 from vi_pham), 'Q1 anon không có quyền trên bảng / view / sequence nào',
                    (select string_agg(x, ', ') from vi_pham));

-- Q2
with vi_pham as (
  select p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')' as x
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and has_function_privilege('anon', p.oid, 'EXECUTE')
     and not exists (select 1 from cho_phep_anon a where a.doi_tuong = p.proname and a.quyen = 'EXECUTE')
)
select pg_temp.dung((select count(*) = 0 from vi_pham), 'Q2 anon không gọi được hàm nào của public',
                    (select string_agg(x, ', ') from vi_pham));

-- Q3
with vi_pham as (
  select c.relname || ':' || q.quyen as x
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
    cross join (values ('TRUNCATE'), ('REFERENCES'), ('TRIGGER'), ('MAINTAIN')) q(quyen)
   where n.nspname = 'public' and c.relkind in ('r', 'p', 'v', 'm', 'f') and has_table_privilege('authenticated', c.oid, q.quyen)
)
select pg_temp.dung((select count(*) = 0 from vi_pham), 'Q3 authenticated không có TRUNCATE / TRIGGER / REFERENCES / MAINTAIN',
                    (select string_agg(x, ', ') from vi_pham));

-- Q4
with vi_pham as (
  select c.relname as x from pg_class c join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public' and c.relkind in ('r', 'p') and not c.relrowsecurity
)
select pg_temp.dung((select count(*) = 0 from vi_pham), 'Q4 mọi bảng của public đã bật RLS', (select string_agg(x, ', ') from vi_pham));

-- Q5
with vi_pham as (
  select c.relname || ':' || q.quyen as x
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
    cross join (values ('INSERT'), ('UPDATE'), ('DELETE')) q(quyen)
   where n.nspname = 'public' and c.relkind in ('v', 'm') and has_table_privilege('authenticated', c.oid, q.quyen)
)
select pg_temp.dung((select count(*) = 0 from vi_pham), 'Q5 không view nào cho authenticated quyền ghi', (select string_agg(x, ', ') from vi_pham));

-- Q6: quyền mặc định của postgres — kiểm bằng hành vi: tạo bảng / hàm / sequence thật (bị rollback) rồi đo quyền của anon
create table public.kt_quyen_tam (x int);
create sequence public.kt_quyen_tam_seq;
create function public.kt_quyen_tam_fn() returns int language sql as 'select 1';
select pg_temp.dung(not has_table_privilege('anon', 'public.kt_quyen_tam', 'SELECT')
                    and not has_table_privilege('anon', 'public.kt_quyen_tam', 'INSERT')
                    and not has_sequence_privilege('anon', 'public.kt_quyen_tam_seq', 'USAGE')
                    and not has_function_privilege('anon', 'public.kt_quyen_tam_fn()', 'EXECUTE'),
                    'Q6 bảng / sequence / hàm vai postgres tạo sau này không tự cấp gì cho anon');
drop function public.kt_quyen_tam_fn();
drop sequence public.kt_quyen_tam_seq;
drop table public.kt_quyen_tam;

-- Q7 (chỉ báo): trần của nền tảng
do $$ declare r record; begin
  for r in select d.defaclobjtype::text as loai, d.defaclacl::text as acl
             from pg_default_acl d join pg_namespace n on n.oid = d.defaclnamespace
            where n.nspname = 'public' and pg_get_userbyid(d.defaclrole) = 'supabase_admin' and d.defaclacl::text like '%anon=%' loop
    raise notice 'BÁO Q7 quyền mặc định của supabase_admin (loại %) vẫn cấp cho anon: % — vai postgres không sửa được; Q1/Q2 bắt nếu có đối tượng như vậy', r.loai, r.acl;
  end loop;
end $$;

rollback;
