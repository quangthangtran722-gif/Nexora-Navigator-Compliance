-- Kiểm thử migration 008 — chạy trong MỘT transaction và ROLLBACK ở cuối: không để lại dòng nào trên DB.
-- Dùng: psql "$MIS_DB_URL" -X -v ON_ERROR_STOP=1 -f supabase/tests/008_kiem_thu.sql
-- Mỗi ca in "OK <số> <mô tả>"; ca sai → RAISE EXCEPTION → psql dừng, transaction bị hủy.
-- Người dùng giả: A (curator, chạy trích xuất), B (curator thứ hai), K (khách hàng). Gọi bằng vai `authenticated` + JWT
-- giả lập — đúng đường của ứng dụng (RLS, GRANT theo cột, trigger, security definer).

\set ON_ERROR_STOP 1
set client_min_messages = notice;
\pset tuples_only on
\pset format unaligned
begin;

-- ------------------------------------------------------------------ fixture (vai postgres)
insert into auth.users (id, email) values
  ('00000000-0000-4000-8000-0000000000a1', 'kiem-thu-curator-a@example.invalid'),
  ('00000000-0000-4000-8000-0000000000b1', 'kiem-thu-curator-b@example.invalid'),
  ('00000000-0000-4000-8000-0000000000c2', 'kiem-thu-khach@example.invalid');

insert into public.van_ban (id, ten_van_ban, so_hieu, loai_van_ban, ngay_hieu_luc, domains)
values ('00000000-0000-4000-8000-00000000a008', 'Văn bản kiểm thử 008', 'KT-008', 'luat', '2026-07-01', '{thue}');
insert into public.van_ban_chunks (id, van_ban_id, thu_tu, noi_dung, trang_thai) values
  ('00000000-0000-4000-8000-00000000b801', '00000000-0000-4000-8000-00000000a008', 1, 'Điều 1. Kiểm thử.', 'da_trich_xuat'),
  ('00000000-0000-4000-8000-00000000b802', '00000000-0000-4000-8000-00000000a008', 2, 'Điều 2. Kiểm thử.', 'da_trich_xuat');
-- c801: lượt trích xuất ĐANG CHẠY của A; c802: lượt đã xong
insert into public.pipeline_runs (id, pipeline_name, chunk_id, trang_thai, input, model, prompt_version, nguoi_chay_id, started_at)
values ('00000000-0000-4000-8000-00000000c801', 'extract_entities', '00000000-0000-4000-8000-00000000b801', 'dang_xu_ly',
        '{}', 'kiem-thu', 'kiem-thu', '00000000-0000-4000-8000-0000000000a1', now());
insert into public.pipeline_runs (id, pipeline_name, chunk_id, trang_thai, input, output, model, prompt_version, completed_at)
values ('00000000-0000-4000-8000-00000000c802', 'extract_entities', '00000000-0000-4000-8000-00000000b802', 'hoan_tat',
        '{}', '{}', 'kiem-thu', 'kiem-thu', now());

-- e801 nghĩa vụ N; e802 chủ thể; e803 điều kiện; e804 chủ thể (đích cạnh bị sửa); e805 nghĩa vụ sẽ bị từ chối;
-- e807 nghĩa vụ ngoại lệ X (chunk 1, lượt c801); e808 chủ thể ở chunk 2 (lượt c802)
insert into public.entities (id, chunk_id, pipeline_run_id, ma_tam, ten_entity, loai_entity, mo_ta, so_dieu, dieu_khoan, noi_dung_goc, domain, ngay_co_hieu_luc)
select ('00000000-0000-4000-8000-00000000e' || n)::uuid,
       case when n = 808 then '00000000-0000-4000-8000-00000000b802' else '00000000-0000-4000-8000-00000000b801' end::uuid,
       case when n = 808 then '00000000-0000-4000-8000-00000000c802' else '00000000-0000-4000-8000-00000000c801' end::uuid,
       'e' || n, 'Entity ' || n, l::public.loai_entity, 'mô tả', 1, 'k1', 'Kiểm thử.', 'thue', '2026-07-01'
  from (values (801, 'hanh_vi'), (802, 'chu_the'), (803, 'dieu_kien'), (804, 'chu_the'), (805, 'hanh_vi'),
               (807, 'hanh_vi'), (808, 'chu_the')) v(n, l);

-- Cạnh LLM (tạo bằng đường tin cậy, như H2 / insertGraph)
insert into public.entity_relationships (id, chunk_id, pipeline_run_id, source_entity_id, target_entity_id, target_ref_text, loai_relationship, can_cu) values
  ('00000000-0000-4000-8000-00000000d801', '00000000-0000-4000-8000-00000000b801', '00000000-0000-4000-8000-00000000c801',
   '00000000-0000-4000-8000-00000000e803', '00000000-0000-4000-8000-00000000e801', null, 'dieu_kien', 'Kiểm thử.'),
  ('00000000-0000-4000-8000-00000000d802', '00000000-0000-4000-8000-00000000b801', '00000000-0000-4000-8000-00000000c801',
   '00000000-0000-4000-8000-00000000e801', '00000000-0000-4000-8000-00000000e802', null, 'ap_dung_cho', 'Kiểm thử.'),
  ('00000000-0000-4000-8000-00000000d803', '00000000-0000-4000-8000-00000000b801', '00000000-0000-4000-8000-00000000c801',
   '00000000-0000-4000-8000-00000000e801', '00000000-0000-4000-8000-00000000e804', null, 'ap_dung_cho', 'Kiểm thử.'),
  ('00000000-0000-4000-8000-00000000d805', '00000000-0000-4000-8000-00000000b801', '00000000-0000-4000-8000-00000000c801',
   '00000000-0000-4000-8000-00000000e805', '00000000-0000-4000-8000-00000000e802', null, 'ap_dung_cho', 'Kiểm thử.'),
  ('00000000-0000-4000-8000-00000000d808', '00000000-0000-4000-8000-00000000b802', '00000000-0000-4000-8000-00000000c802',
   '00000000-0000-4000-8000-00000000e808', null, 'Điều 99 Luật khác', 'tham_chieu', 'Kiểm thử.');

-- Đủ trường để duyệt (chuyên viên điền trước khi duyệt — ở đây điền bằng vai postgres cho gọn)
update public.entities set pham_vi = 'co_dieu_kien' where id in ('00000000-0000-4000-8000-00000000e801', '00000000-0000-4000-8000-00000000e807');
update public.entities set ma_dieu_kien = 'C0', pham_vi = 'chung'
 where id in ('00000000-0000-4000-8000-00000000e802', '00000000-0000-4000-8000-00000000e804', '00000000-0000-4000-8000-00000000e808');
update public.entities set ma_dieu_kien = 'C5', pham_vi = 'co_dieu_kien', khong_hinh_thuc_hoa = true, van_ban_dan_chieu = 'KT-NĐ'
 where id = '00000000-0000-4000-8000-00000000e803';

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
-- Đổi người dùng giả lập
create or replace function pg_temp.la(p_ai text) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', case p_ai
    when 'A' then '{"sub":"00000000-0000-4000-8000-0000000000a1","role":"authenticated","app_metadata":{"nexora_role":"curator"}}'
    when 'B' then '{"sub":"00000000-0000-4000-8000-0000000000b1","role":"authenticated","app_metadata":{"nexora_role":"curator"}}'
    else '{"sub":"00000000-0000-4000-8000-0000000000c2","role":"authenticated","app_metadata":{"customer_id":"a0000000-0000-0000-0000-000000000001"}}'
  end, true);
end $$;
grant execute on function pg_temp.mong_loi(text, text, text), pg_temp.dung(boolean, text), pg_temp.la(text) to authenticated;

-- ------------------------------------------------------------------ quyền (vai postgres)
select pg_temp.dung((select count(*) = 2 from pg_enum where enumtypid = 'public.loai_relationship'::regtype
                      and enumlabel in ('ngoai_le_bac_bo', 'ngoai_le_thay_the')), '01 có 2 loại cạnh ngoại lệ');
select pg_temp.dung((select count(*) = 0
                       from pg_class c join pg_namespace n on n.oid = c.relnamespace
                       cross join (values ('anon'), ('authenticated')) r(vai)
                       cross join (values ('TRUNCATE'), ('TRIGGER'), ('REFERENCES'), ('MAINTAIN')) q(quyen)
                      where n.nspname = 'public' and c.relkind in ('r', 'v', 'm', 'p', 'f')
                        and has_table_privilege(r.vai, c.oid, q.quyen)),
                    '02 anon / authenticated không còn TRUNCATE, TRIGGER, REFERENCES, MAINTAIN trên bảng / view nào');
select pg_temp.dung((select bool_and(has_table_privilege(vai, 'public.approvals', 'TRUNCATE'))
                       from (values ('service_role'), ('postgres')) r(vai)), '03 service_role / postgres giữ nguyên quyền');
create table public.kt_008_tam (x int);  -- bị rollback cùng transaction
select pg_temp.dung(not has_table_privilege('authenticated', 'public.kt_008_tam', 'TRUNCATE')
                    and not has_table_privilege('authenticated', 'public.kt_008_tam', 'TRIGGER')
                    and not has_table_privilege('anon', 'public.kt_008_tam', 'REFERENCES')
                    and not has_table_privilege('anon', 'public.kt_008_tam', 'MAINTAIN'),
                    '04 bảng tạo sau này không tự nhận 4 quyền đã gỡ (quyền mặc định)');
drop table public.kt_008_tam;
select pg_temp.dung((select count(*) = 7 from information_schema.columns
                      where table_schema = 'public' and table_name = 'canh_dieu_kien_nghia_vu'), '05 view có 7 cột');
select pg_temp.mong_loi($q$insert into public.approvals (entity_id, relationship_id, nguoi_duyet_id, quyet_dinh)
                          values ('00000000-0000-4000-8000-00000000e801', '00000000-0000-4000-8000-00000000d801',
                                  '00000000-0000-4000-8000-0000000000a1', 'da_duyet')$q$, '23514', '06 approvals đúng một đối tượng');
select pg_temp.dung((select bool_and(trang_thai_duyet = 'cho_duyet') from public.entity_relationships), '07 mọi cạnh hiện có ở cho_duyet');

-- ------------------------------------------------------------------ 09b. lỗ hổng TRƯỚC khi vá là có thật
-- Cấp lại tạm TRIGGER + TRUNCATE như trên prod, chứng minh vai đăng nhập lách được, rồi gỡ. Mỗi lệnh chạy trong
-- subtransaction và bị hủy ngay (pg_temp.chay_duoc), cả khối bị ROLLBACK ở cuối file.
create or replace function pg_temp.chay_duoc(p_sql text, p_ca text) returns void language plpgsql as $$
begin
  begin
    execute p_sql;
    raise exception using errcode = 'KT001', message = 'huy';
  exception when sqlstate 'KT001' then
    raise notice 'OK %', p_ca;
  end;
end $$;
grant execute on function pg_temp.chay_duoc(text, text) to authenticated;
grant trigger on public.entities to authenticated;
grant truncate on public.approvals to authenticated;
set local role authenticated;
select pg_temp.la('A');
select pg_temp.chay_duoc($q$create trigger kt_lach before update on public.entities
                          for each row execute function public.set_updated_at()$q$, '09b-1 (trước vá) có TRIGGER → gắn được trigger lên entities');
select pg_temp.chay_duoc('truncate public.approvals', '09b-2 (trước vá) có TRUNCATE → xóa sạch được approvals');
reset role;
revoke trigger on public.entities from authenticated;
revoke truncate on public.approvals from authenticated;

-- ------------------------------------------------------------------ vai đăng nhập: bề mặt quyền đã gỡ
set local role authenticated;
select pg_temp.la('A');
select pg_temp.mong_loi('truncate public.approvals', '42501', '08 curator không TRUNCATE được approvals');
select pg_temp.mong_loi($q$create trigger kt_lach before update on public.entities
                          for each row execute function public.set_updated_at()$q$, '42501', '09 curator không gắn được trigger lên entities');
select pg_temp.dung(not has_schema_privilege('authenticated', 'public', 'CREATE'),
                    '10 vai đăng nhập không tạo được bảng / hàm trong schema public');

-- ------------------------------------------------------------------ tạo cạnh
select pg_temp.mong_loi($q$insert into public.entity_relationships (chunk_id, source_entity_id, target_entity_id, loai_relationship, can_cu, trang_thai_duyet)
                          values ('00000000-0000-4000-8000-00000000b801', '00000000-0000-4000-8000-00000000e807',
                                  '00000000-0000-4000-8000-00000000e801', 'ngoai_le_bac_bo', 'Kiểm thử.', 'da_duyet')$q$,
                        'PT403', '11 không tạo cạnh ở da_duyet');
select pg_temp.mong_loi($q$insert into public.entity_relationships (chunk_id, pipeline_run_id, source_entity_id, target_entity_id, loai_relationship, can_cu)
                          values ('00000000-0000-4000-8000-00000000b801', '00000000-0000-4000-8000-00000000c801', '00000000-0000-4000-8000-00000000e807',
                                  '00000000-0000-4000-8000-00000000e801', 'ngoai_le_bac_bo', 'Kiểm thử.')$q$,
                        '23514', '12 cạnh ngoại lệ không gắn lượt LLM được');
select pg_temp.mong_loi($q$insert into public.entity_relationships (chunk_id, source_entity_id, target_entity_id, loai_relationship, can_cu, chi_mot_phan)
                          values ('00000000-0000-4000-8000-00000000b801', '00000000-0000-4000-8000-00000000e803',
                                  '00000000-0000-4000-8000-00000000e801', 'dieu_kien', 'Kiểm thử.', true)$q$,
                        '23514', '13 chi_mot_phan chỉ cho cạnh ngoại lệ');
select pg_temp.mong_loi($q$insert into public.entity_relationships (chunk_id, pipeline_run_id, source_entity_id, target_entity_id, loai_relationship, can_cu)
                          values ('00000000-0000-4000-8000-00000000b802', '00000000-0000-4000-8000-00000000c802', '00000000-0000-4000-8000-00000000e808',
                                  '00000000-0000-4000-8000-00000000e801', 'dieu_kien', 'Kiểm thử.')$q$,
                        'PT403', '14 không gắn cạnh tay vào lượt LLM đã xong');
select pg_temp.la('B');
select pg_temp.mong_loi($q$insert into public.entity_relationships (chunk_id, pipeline_run_id, source_entity_id, target_entity_id, loai_relationship, can_cu)
                          values ('00000000-0000-4000-8000-00000000b801', '00000000-0000-4000-8000-00000000c801', '00000000-0000-4000-8000-00000000e803',
                                  '00000000-0000-4000-8000-00000000e801', 'dieu_kien', 'Kiểm thử.')$q$,
                        'PT403', '15 không gắn cạnh vào lượt LLM đang chạy của người khác');

-- A thêm cạnh ngoại lệ X → N, cố ghi người tạo là B
select pg_temp.la('A');
insert into public.entity_relationships (id, chunk_id, source_entity_id, target_entity_id, loai_relationship, can_cu, nguoi_tao_id)
values ('00000000-0000-4000-8000-00000000d807', '00000000-0000-4000-8000-00000000b801', '00000000-0000-4000-8000-00000000e807',
        '00000000-0000-4000-8000-00000000e801', 'ngoai_le_bac_bo', 'Kiểm thử ngoại lệ.', '00000000-0000-4000-8000-0000000000b1');
select pg_temp.dung((select nguoi_tao_id = '00000000-0000-4000-8000-0000000000a1' and trang_thai_duyet = 'cho_duyet'
                       from public.entity_relationships where id = '00000000-0000-4000-8000-00000000d807'),
                    '16 nguoi_tao_id bị ép = người đăng nhập (không giả mạo được), cạnh ở cho_duyet');
select pg_temp.mong_loi($q$update public.entity_relationships set trang_thai_duyet = 'da_duyet'
                          where id = '00000000-0000-4000-8000-00000000d807'$q$, '42501', '17 không UPDATE thẳng trạng thái cạnh');

-- B sửa cạnh LLM d803 (N → e804) khi còn chờ duyệt
select pg_temp.la('B');
update public.entity_relationships set can_cu = 'Kiểm thử — B sửa.' where id = '00000000-0000-4000-8000-00000000d803';
select pg_temp.dung((select nguoi_sua_cuoi_id = '00000000-0000-4000-8000-0000000000b1'
                       from public.entity_relationships where id = '00000000-0000-4000-8000-00000000d803'), '18 sửa cạnh chờ duyệt → ghi người sửa cuối');

-- ------------------------------------------------------------------ approve_relationship: chặn
select pg_temp.la('K');
select pg_temp.mong_loi($q$select public.approve_relationship('00000000-0000-4000-8000-00000000d807', 'da_duyet')$q$, 'PT403', '19 khách hàng không duyệt được cạnh');
select pg_temp.la('A');
select pg_temp.mong_loi($q$select public.approve_relationship('00000000-0000-4000-8000-00000000d801', 'da_duyet')$q$, 'PT400', '20 cạnh LLM chưa sửa không duyệt riêng');
select pg_temp.mong_loi($q$select public.approve_relationship('00000000-0000-4000-8000-00000000d807', 'da_duyet')$q$, 'PT403', '21 người tạo không tự duyệt cạnh của mình');
select pg_temp.mong_loi($q$select public.approve_relationship('00000000-0000-4000-8000-00000000d807', 'tu_choi')$q$, 'PT403', '22 người tạo cũng không tự từ chối');
select pg_temp.la('B');
select pg_temp.mong_loi($q$select public.approve_relationship('00000000-0000-4000-8000-00000000d807', 'da_duyet')$q$, 'PT409', '23 hai đầu chưa duyệt → chưa duyệt cạnh được');

-- ------------------------------------------------------------------ duyệt entity kéo theo cạnh LLM
select pg_temp.la('A');
select (public.approve_entity('00000000-0000-4000-8000-00000000e803', 'da_duyet')).id is not null;
select pg_temp.dung((select trang_thai_duyet = 'da_duyet' and nguoi_duyet_id = '00000000-0000-4000-8000-0000000000a1'
                       from public.entity_relationships where id = '00000000-0000-4000-8000-00000000d801'),
                    '24 duyệt entity nguồn → cạnh LLM của nó da_duyet, cùng người duyệt');
select pg_temp.dung((select count(*) = 1 from public.approvals
                      where relationship_id = '00000000-0000-4000-8000-00000000d801'
                        and chi_tiet ->> 'theo_entity' = '00000000-0000-4000-8000-00000000e803'), '25 mỗi cạnh kéo theo có một dòng approvals');
select (public.approve_entity('00000000-0000-4000-8000-00000000e801', 'da_duyet')).id is not null;
select pg_temp.dung((select trang_thai_duyet from public.entity_relationships where id = '00000000-0000-4000-8000-00000000d802') = 'da_duyet'
                    and (select trang_thai_duyet from public.entity_relationships where id = '00000000-0000-4000-8000-00000000d803') = 'cho_duyet',
                    '26 cạnh LLM đã bị người sửa KHÔNG đi theo entity');
select pg_temp.dung((select trang_thai_duyet from public.entity_relationships where id = '00000000-0000-4000-8000-00000000d807') = 'cho_duyet',
                    '27 cạnh ngoại lệ người thêm KHÔNG đi theo entity');
select (public.approve_entity('00000000-0000-4000-8000-00000000e802', 'da_duyet')).id is not null;
select (public.approve_entity('00000000-0000-4000-8000-00000000e804', 'da_duyet')).id is not null;
select (public.approve_entity('00000000-0000-4000-8000-00000000e807', 'da_duyet')).id is not null;

-- Cạnh bị sửa: B (người sửa) không duyệt được; A duyệt được
select pg_temp.la('B');
select pg_temp.mong_loi($q$select public.approve_relationship('00000000-0000-4000-8000-00000000d803', 'da_duyet')$q$, 'PT403', '28 người sửa cạnh không tự duyệt');
select pg_temp.la('A');
select pg_temp.dung((select (public.approve_relationship('00000000-0000-4000-8000-00000000d803', 'da_duyet')).trang_thai_duyet = 'da_duyet'),
                    '29 người khác người sửa duyệt được cạnh đã sửa');

-- Cạnh ngoại lệ: B (khác người tạo A) duyệt
select pg_temp.la('B');
select pg_temp.dung((select (public.approve_relationship('00000000-0000-4000-8000-00000000d807', 'da_duyet', 'Đối chiếu nguyên văn.')).trang_thai_duyet = 'da_duyet'),
                    '30 chuyên viên khác người tạo duyệt cạnh ngoại lệ');
select pg_temp.dung((select count(*) = 1 from public.approvals
                      where relationship_id = '00000000-0000-4000-8000-00000000d807'
                        and nguoi_duyet_id = '00000000-0000-4000-8000-0000000000b1'
                        and chi_tiet ->> 'nguoi_tao_id' = '00000000-0000-4000-8000-0000000000a1'), '31 approvals ghi người duyệt B, người tạo A');
select pg_temp.mong_loi($q$select public.approve_relationship('00000000-0000-4000-8000-00000000d807', 'tu_choi')$q$, 'PT409', '32 cạnh đã xử lý không xử lý lại');
select pg_temp.mong_loi($q$update public.entity_relationships set can_cu = 'sửa sau duyệt' where id = '00000000-0000-4000-8000-00000000d807'$q$,
                        'PT409', '33 cạnh đã duyệt không sửa được');
select pg_temp.mong_loi($q$delete from public.entity_relationships where id = '00000000-0000-4000-8000-00000000d807'$q$,
                        'PT409', '34 cạnh đã duyệt không xóa được');

-- ------------------------------------------------------------------ rút / từ chối
select pg_temp.la('A');
insert into public.entity_relationships (id, chunk_id, source_entity_id, target_entity_id, loai_relationship, can_cu)
values ('00000000-0000-4000-8000-00000000d809', '00000000-0000-4000-8000-00000000b801', '00000000-0000-4000-8000-00000000e807',
        '00000000-0000-4000-8000-00000000e801', 'ngoai_le_thay_the', 'Kiểm thử rút.');
select pg_temp.la('B');
select pg_temp.mong_loi($q$delete from public.entity_relationships where id = '00000000-0000-4000-8000-00000000d809'$q$,
                        'PT403', '35 người khác không xóa lặng lẽ cạnh chờ duyệt (phải Từ chối)');
select pg_temp.la('A');
delete from public.entity_relationships where id = '00000000-0000-4000-8000-00000000d809';
select pg_temp.dung(not exists (select 1 from public.entity_relationships where id = '00000000-0000-4000-8000-00000000d809'),
                    '36 người tạo rút được cạnh chờ duyệt của mình');

select (public.approve_entity('00000000-0000-4000-8000-00000000e805', 'tu_choi')).id is not null;
select pg_temp.dung((select trang_thai_duyet from public.entity_relationships where id = '00000000-0000-4000-8000-00000000d805') = 'tu_choi',
                    '37 từ chối entity → cạnh LLM của nó tu_choi');
insert into public.entity_relationships (id, chunk_id, source_entity_id, target_entity_id, loai_relationship, can_cu)
values ('00000000-0000-4000-8000-00000000d810', '00000000-0000-4000-8000-00000000b801', '00000000-0000-4000-8000-00000000e805',
        '00000000-0000-4000-8000-00000000e801', 'ngoai_le_bac_bo', 'Kiểm thử đầu bị từ chối.');
select pg_temp.la('B');
select pg_temp.mong_loi($q$select public.approve_relationship('00000000-0000-4000-8000-00000000d810', 'da_duyet')$q$, 'PT400', '38 một đầu bị từ chối → không duyệt cạnh');
select pg_temp.dung((select (public.approve_relationship('00000000-0000-4000-8000-00000000d810', 'tu_choi')).trang_thai_duyet = 'tu_choi'),
                    '39 một đầu bị từ chối → từ chối cạnh được');

-- ------------------------------------------------------------------ approve_chunk kéo theo cạnh
select pg_temp.dung(public.approve_chunk('00000000-0000-4000-8000-00000000b802') = 1, '40 approve_chunk duyệt entity đủ trường');
select pg_temp.dung((select trang_thai_duyet from public.entity_relationships where id = '00000000-0000-4000-8000-00000000d808') = 'da_duyet'
                    and exists (select 1 from public.approvals where relationship_id = '00000000-0000-4000-8000-00000000d808'),
                    '41 approve_chunk kéo theo cạnh LLM + approvals');

-- ------------------------------------------------------------------ ngày hết hiệu lực
select pg_temp.mong_loi($q$update public.entities set ngay_het_hieu_luc = '2026-01-01' where id = '00000000-0000-4000-8000-00000000e805'$q$,
                        'PT409', '42 entity đã xử lý không sửa ngày hết hiệu lực');
reset role;
insert into public.entities (id, chunk_id, pipeline_run_id, ma_tam, ten_entity, loai_entity, mo_ta, so_dieu, dieu_khoan, noi_dung_goc, domain, ngay_co_hieu_luc)
values ('00000000-0000-4000-8000-00000000e806', '00000000-0000-4000-8000-00000000b801', '00000000-0000-4000-8000-00000000c801',
        'e806', 'Entity 806', 'hanh_vi', 'mô tả', 1, 'k1', 'Kiểm thử.', 'thue', '2026-07-01');
set local role authenticated;
select pg_temp.la('A');
select pg_temp.mong_loi($q$update public.entities set ngay_het_hieu_luc = '2026-01-01' where id = '00000000-0000-4000-8000-00000000e806'$q$,
                        '23514', '43 hết hiệu lực trước ngày có hiệu lực bị CHECK chặn');
update public.entities set ngay_het_hieu_luc = '2027-01-01' where id = '00000000-0000-4000-8000-00000000e806';
select pg_temp.dung((select ngay_het_hieu_luc = '2027-01-01' from public.entities where id = '00000000-0000-4000-8000-00000000e806'),
                    '44 chuyên viên ghi được ngày hết hiệu lực khi entity còn chờ duyệt');

-- ------------------------------------------------------------------ view cho S9: cùng kết quả cho khách hàng và chuyên viên
create temp table kt_view_cv on commit drop as
  select hanh_vi_id, entity_id, loai_canh::text, entity_trang_thai_duyet::text, canh_id, canh_trang_thai_duyet::text, chi_mot_phan
    from public.canh_dieu_kien_nghia_vu where hanh_vi_id = '00000000-0000-4000-8000-00000000e801';
select pg_temp.dung((select count(*) = 5 from kt_view_cv), '45 view: N có 5 cạnh (điều kiện, 2 chủ thể, 2 ngoại lệ — một đã từ chối)');
select pg_temp.dung(exists (select 1 from kt_view_cv where loai_canh = 'ngoai_le_bac_bo' and entity_id = '00000000-0000-4000-8000-00000000e807'
                              and canh_trang_thai_duyet = 'da_duyet' and not chi_mot_phan),
                    '46 view: cạnh ngoại lệ vào nghĩa vụ, hướng X → N, có trạng thái cạnh');
select pg_temp.la('K');
select pg_temp.dung((select count(*) = 0 from (
                      (select hanh_vi_id, entity_id, loai_canh::text, entity_trang_thai_duyet::text, canh_id, canh_trang_thai_duyet::text, chi_mot_phan
                         from public.canh_dieu_kien_nghia_vu where hanh_vi_id = '00000000-0000-4000-8000-00000000e801'
                       except select * from kt_view_cv)
                      union all
                      (select * from kt_view_cv
                       except select hanh_vi_id, entity_id, loai_canh::text, entity_trang_thai_duyet::text, canh_id, canh_trang_thai_duyet::text, chi_mot_phan
                         from public.canh_dieu_kien_nghia_vu where hanh_vi_id = '00000000-0000-4000-8000-00000000e801')) d),
                    '47 view: khách hàng thấy đúng tập cạnh như chuyên viên');

reset role;
rollback;
