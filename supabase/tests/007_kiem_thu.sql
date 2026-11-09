-- Kiểm thử migration 007 — chạy trong MỘT transaction và ROLLBACK ở cuối: không để lại dòng nào trên DB.
-- Dùng: psql "$MIS_DB_URL" -X -v ON_ERROR_STOP=1 -f supabase/tests/007_kiem_thu.sql
-- Mỗi ca in "OK <số> <mô tả>"; ca sai → RAISE EXCEPTION → psql dừng, transaction bị hủy.
-- Fixture riêng (văn bản, chunk, entity, người dùng giả trong auth.users) — không chạm dữ liệu Luật 108 đã nạp.
-- Gọi hàm duyệt bằng vai `authenticated` + JWT giả lập, đúng đường của ứng dụng (RLS, GRANT theo cột, security definer).

\set ON_ERROR_STOP 1
set client_min_messages = notice;
\pset tuples_only on
\pset format unaligned
begin;

-- ------------------------------------------------------------------ fixture (vai postgres)
insert into auth.users (id, email) values
  ('00000000-0000-4000-8000-0000000000c1', 'kiem-thu-curator@example.invalid'),
  ('00000000-0000-4000-8000-0000000000c2', 'kiem-thu-khach@example.invalid');

insert into public.van_ban (id, ten_van_ban, so_hieu, loai_van_ban, ngay_hieu_luc, domains)
values ('00000000-0000-4000-8000-00000000a001', 'Văn bản kiểm thử 007', 'KT-007', 'luat', '2026-01-01', '{thue}');
insert into public.van_ban_chunks (id, van_ban_id, thu_tu, noi_dung, trang_thai) values
  ('00000000-0000-4000-8000-00000000b001', '00000000-0000-4000-8000-00000000a001', 1, 'Điều 1. Kiểm thử.', 'da_trich_xuat'),
  ('00000000-0000-4000-8000-00000000b002', '00000000-0000-4000-8000-00000000a001', 2, 'Điều 2. Kiểm thử.', 'da_trich_xuat');
insert into public.pipeline_runs (id, pipeline_name, chunk_id, trang_thai, input, model, prompt_version)
values ('00000000-0000-4000-8000-00000000c001', 'extract_entities', '00000000-0000-4000-8000-00000000b001', 'cho_xu_ly',
        '{}', 'kiem-thu', 'kiem-thu');

-- e1 hanh_vi, e2 chu_the, e3 dieu_kien, e4 nguong (chunk 1); e5 chu_the đủ trường, e6 chu_the thiếu mã (chunk 2)
insert into public.entities (id, chunk_id, pipeline_run_id, ma_tam, ten_entity, loai_entity, mo_ta, so_dieu, dieu_khoan, noi_dung_goc, domain)
select ('00000000-0000-4000-8000-0000000000e' || n)::uuid,
       case when n <= 4 then '00000000-0000-4000-8000-00000000b001' else '00000000-0000-4000-8000-00000000b002' end::uuid,
       '00000000-0000-4000-8000-00000000c001', 'e' || n, 'Entity ' || n, l::public.loai_entity, 'mô tả', 1, 'k1', 'Kiểm thử.', 'thue'
  from (values (1, 'hanh_vi'), (2, 'chu_the'), (3, 'dieu_kien'), (4, 'nguong'), (5, 'chu_the'), (6, 'chu_the')) v(n, l);
update public.entities set ma_dieu_kien = 'C0', pham_vi = 'chung' where id = '00000000-0000-4000-8000-0000000000e5';

insert into public.entity_relationships (chunk_id, pipeline_run_id, source_entity_id, target_entity_id, loai_relationship, can_cu) values
  ('00000000-0000-4000-8000-00000000b001', '00000000-0000-4000-8000-00000000c001',
   '00000000-0000-4000-8000-0000000000e3', '00000000-0000-4000-8000-0000000000e1', 'dieu_kien', 'Kiểm thử.'),
  ('00000000-0000-4000-8000-00000000b001', '00000000-0000-4000-8000-00000000c001',
   '00000000-0000-4000-8000-0000000000e1', '00000000-0000-4000-8000-0000000000e2', 'ap_dung_cho', 'Kiểm thử.');

-- Điều kiện máy đọc hợp lệ: lấy một thuộc tính kiểu number bất kỳ trong từ điển
create temp table kt_dk on commit drop as
  select jsonb_build_object('thuoc_tinh', ma, 'toan_tu', 'lte', 'gia_tri', 3000000000) dk
    from public.thuoc_tinh_ho_so where kieu = 'number' order by ma limit 1;
grant select on kt_dk to authenticated;
do $$ begin
  if not exists (select 1 from kt_dk) then raise exception 'Fixture: không có thuộc tính number trong thuoc_tinh_ho_so'; end if;
end $$;

-- Hàm tiện: chạy câu lệnh, mong đợi SQLSTATE cho trước
create or replace function pg_temp.mong_loi(p_sql text, p_state text, p_ca text) returns void language plpgsql as $$
begin
  execute p_sql;
  raise exception 'SAI % — không có lỗi, mong đợi %', p_ca, p_state;
exception when others then
  if sqlstate <> p_state then raise exception 'SAI % — lỗi % (%), mong đợi %', p_ca, sqlstate, sqlerrm, p_state; end if;
  raise notice 'OK %', p_ca;
end $$;
create or replace function pg_temp.dung(p_dk boolean, p_ca text) returns void language plpgsql as $$
begin
  if not coalesce(p_dk, false) then raise exception 'SAI %', p_ca; end if;
  raise notice 'OK %', p_ca;
end $$;
grant execute on function pg_temp.mong_loi(text, text, text), pg_temp.dung(boolean, text) to authenticated;

-- ------------------------------------------------------------------ cấu trúc (vai postgres)
select pg_temp.dung((select count(*) = 8 from public.bo_ma_dieu_kien), '01 bộ mã có 8 mã C0–C7');
select pg_temp.dung((select array_agg(ma order by ma) from public.bo_ma_dieu_kien where nhom = 'khong_hinh_thuc_hoa')
                    = '{C4,C5,C6,C7}', '02 C4–C7 thuộc nhóm không hình thức hóa');
select pg_temp.dung((select ly_do_mac_dinh from public.bo_ma_dieu_kien where ma = 'C6') = 'can_chuyen_mon', '03 C6 → can_chuyen_mon');
select pg_temp.dung(to_regprocedure('public.approve_entity(uuid, public.trang_thai_duyet, text, boolean)') is null,
                    '04 approve_entity bản 4 tham số đã bỏ');
select pg_temp.mong_loi($q$update public.entities set khong_hinh_thuc_hoa = true, dieu_kien_may_doc = (select dk from kt_dk)
                          where id = '00000000-0000-4000-8000-0000000000e3'$q$, '23514', '05 cờ + máy đọc cùng lúc bị CHECK chặn');

-- ------------------------------------------------------------------ vai khách hàng (không phải curator)
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-4000-8000-0000000000c2","role":"authenticated","app_metadata":{"customer_id":"a0000000-0000-0000-0000-000000000001"}}', true);

select pg_temp.mong_loi($q$select public.approve_entity('00000000-0000-4000-8000-0000000000e5', 'da_duyet')$q$, 'PT403',
                        '06 khách hàng không duyệt được');
select pg_temp.dung((select count(*) = 0 from public.entity_relationships where chunk_id = '00000000-0000-4000-8000-00000000b001'),
                    '07 khách hàng không thấy cạnh của nghĩa vụ chưa duyệt (RLS cũ giữ nguyên)');
select pg_temp.dung((select count(*) = 0 from public.canh_dieu_kien_nghia_vu where hanh_vi_id = '00000000-0000-4000-8000-0000000000e1'),
                    '08 view chưa có dòng khi nghĩa vụ chưa duyệt');

-- ------------------------------------------------------------------ vai curator
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-4000-8000-0000000000c1","role":"authenticated","app_metadata":{"nexora_role":"curator"}}', true);

select pg_temp.mong_loi($q$select public.approve_entity('00000000-0000-4000-8000-0000000000e1', 'da_duyet')$q$, 'PT400',
                        '09 nghĩa vụ chưa xác nhận phạm vi → không duyệt được');
update public.entities set pham_vi = 'co_dieu_kien' where id = '00000000-0000-4000-8000-0000000000e1';
select pg_temp.dung((select (public.approve_entity('00000000-0000-4000-8000-0000000000e1', 'da_duyet')).trang_thai_duyet = 'da_duyet'),
                    '10 nghĩa vụ có phạm vi → duyệt được');

select pg_temp.mong_loi($q$select public.approve_entity('00000000-0000-4000-8000-0000000000e2', 'da_duyet')$q$, 'PT400',
                        '11 chủ thể chưa gán mã → không duyệt được');
update public.entities set ma_dieu_kien = 'C0' where id = '00000000-0000-4000-8000-0000000000e2';
select pg_temp.mong_loi($q$select public.approve_entity('00000000-0000-4000-8000-0000000000e2', 'da_duyet')$q$, 'PT400',
                        '12 C0 nhưng chưa xác nhận pham_vi = chung → không duyệt được (không tự suy ra)');

-- View: khách hàng và curator thấy cùng tập cạnh, kể cả điều kiện CHƯA duyệt
select pg_temp.dung((select count(*) = 2 from public.canh_dieu_kien_nghia_vu where hanh_vi_id = '00000000-0000-4000-8000-0000000000e1'),
                    '13 curator: view có 2 cạnh (điều kiện + chủ thể)');
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-4000-8000-0000000000c2","role":"authenticated","app_metadata":{"customer_id":"a0000000-0000-0000-0000-000000000001"}}', true);
select pg_temp.dung((select count(*) = 2 and bool_and(entity_trang_thai_duyet = 'cho_duyet')
                       from public.canh_dieu_kien_nghia_vu where hanh_vi_id = '00000000-0000-4000-8000-0000000000e1'),
                    '14 khách hàng: view có cùng 2 cạnh, thấy được điều kiện chưa duyệt (chỉ id + trạng thái)');
select pg_temp.dung((select count(*) = 0 from public.entities where id = '00000000-0000-4000-8000-0000000000e3'),
                    '15 khách hàng vẫn không đọc được nội dung điều kiện chưa duyệt');
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-4000-8000-0000000000c1","role":"authenticated","app_metadata":{"nexora_role":"curator"}}', true);

update public.entities set pham_vi = 'chung' where id = '00000000-0000-4000-8000-0000000000e2';
select pg_temp.dung((select (public.approve_entity('00000000-0000-4000-8000-0000000000e2', 'da_duyet')).pham_vi = 'chung'),
                    '16 C0 + pham_vi chung → duyệt được');
select pg_temp.dung((select chi_tiet ->> 'ma_dieu_kien' = 'C0' and chi_tiet ->> 'pham_vi' = 'chung'
                       from public.approvals where entity_id = '00000000-0000-4000-8000-0000000000e2'),
                    '17 approvals.chi_tiet ghi bản chụp mã + phạm vi');
select pg_temp.mong_loi($q$update public.entities set pham_vi = 'co_dieu_kien' where id = '00000000-0000-4000-8000-0000000000e2'$q$,
                        'PT409', '18 sửa phạm vi sau khi duyệt bị khóa');

-- e3 dieu_kien: C0 không dùng cho điều kiện; C1 cần máy đọc
update public.entities set ma_dieu_kien = 'C0', pham_vi = 'chung' where id = '00000000-0000-4000-8000-0000000000e3';
select pg_temp.mong_loi($q$select public.approve_entity('00000000-0000-4000-8000-0000000000e3', 'da_duyet')$q$, 'PT400',
                        '19 C0 cho điều kiện → không duyệt được');
update public.entities set ma_dieu_kien = 'C1', pham_vi = 'co_dieu_kien' where id = '00000000-0000-4000-8000-0000000000e3';
select pg_temp.mong_loi($q$select public.approve_entity('00000000-0000-4000-8000-0000000000e3', 'da_duyet')$q$, 'PT400',
                        '20 C1 chưa có điều kiện máy đọc → không duyệt được');
update public.entities set dieu_kien_may_doc = (select dk from kt_dk) where id = '00000000-0000-4000-8000-0000000000e3';
select pg_temp.dung((select (public.approve_entity('00000000-0000-4000-8000-0000000000e3', 'da_duyet')).trang_thai_duyet = 'da_duyet'),
                    '21 C1 + điều kiện máy đọc → duyệt được');

-- e4 nguong: C5 không hình thức hóa — trước 007 CHECK chặn ngưỡng không máy đọc vào thư viện
update public.entities set ma_dieu_kien = 'C5', pham_vi = 'co_dieu_kien', khong_hinh_thuc_hoa = true
 where id = '00000000-0000-4000-8000-0000000000e4';
select pg_temp.mong_loi($q$select public.approve_entity('00000000-0000-4000-8000-0000000000e4', 'da_duyet')$q$, 'PT400',
                        '22 C5 chưa ghi văn bản dẫn chiếu → không duyệt được');
update public.entities set van_ban_dan_chieu = 'NĐ 252/2026/NĐ-CP' where id = '00000000-0000-4000-8000-0000000000e4';
select pg_temp.dung((select (public.approve_entity('00000000-0000-4000-8000-0000000000e4', 'da_duyet')).khong_hinh_thuc_hoa),
                    '23 C5 + cờ + văn bản dẫn chiếu → ngưỡng không máy đọc vào được thư viện (CHECK đã nới)');

-- approve_chunk: e5 đủ trường được duyệt, e6 thiếu mã ở lại cho_duyet
select pg_temp.dung((select public.approve_chunk('00000000-0000-4000-8000-00000000b002') = 1), '24 approve_chunk chỉ duyệt 1 entity đủ trường');
select pg_temp.dung((select trang_thai_duyet = 'cho_duyet' from public.entities where id = '00000000-0000-4000-8000-0000000000e6'),
                    '25 entity thiếu mã ở lại cho_duyet');
select pg_temp.dung((select trang_thai = 'da_trich_xuat' from public.van_ban_chunks where id = '00000000-0000-4000-8000-00000000b002'),
                    '26 chunk còn entity chờ duyệt → chưa hoan_tat');

-- Từ chối không cần đủ trường
select pg_temp.dung((select (public.approve_entity('00000000-0000-4000-8000-0000000000e6', 'tu_choi')).trang_thai_duyet = 'tu_choi'),
                    '27 từ chối không đòi đủ trường');
select pg_temp.dung((select trang_thai = 'hoan_tat' from public.van_ban_chunks where id = '00000000-0000-4000-8000-00000000b002'),
                    '28 hết entity chờ duyệt → chunk hoan_tat');

-- Ghi thẳng trạng thái duyệt vẫn bị chặn (guard cũ)
select pg_temp.mong_loi($q$update public.entities set trang_thai_duyet = 'da_duyet' where id = '00000000-0000-4000-8000-0000000000e6'$q$,
                        '42501', '29 không GRANT update trang_thai_duyet');

-- ------------------------------------------------------------------ vai anon
select set_config('request.jwt.claims', '{"role":"anon"}', true);
reset role;
set local role anon;
select pg_temp.mong_loi($q$select count(*) from public.canh_dieu_kien_nghia_vu$q$, '42501', '30 anon không đọc được view');
select pg_temp.mong_loi($q$select count(*) from public.bo_ma_dieu_kien$q$, '42501', '31 anon không đọc được bộ mã');
reset role;

rollback;
\echo 'Xong: mọi ca qua, đã rollback.'
