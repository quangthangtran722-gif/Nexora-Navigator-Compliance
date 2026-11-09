-- 007_pham_vi_ma_dieu_kien.sql — phạm vi đã xác nhận, bộ mã điều kiện C0–C7, cờ không hình thức hóa (M7)
-- Thiết kế: docs/mis/HE_THONG_DA_CHOT.md §12 thay đổi #1, #2; §8; §9.1. Kế hoạch: docs/mis/PLAN.md §2 M7.
-- Áp sau 000_baseline_prod.sql, trên project MIS. Idempotent: chạy lại không đổi kết quả.
--
-- Nội dung:
--   1. Bảng tra `bo_ma_dieu_kien` (bản nháp v1 — bảng, không enum, để thêm mã được). S9 rẽ nhánh theo `nhom`,
--      không theo tên mã. Thêm cột `can_van_ban_dan_chieu` (C4, C5) — PLAN không ghi, thêm để hàm duyệt không
--      phải viết cứng tên mã.
--   2. `entities`: `pham_vi` (null = CHƯA XÁC NHẬN), `ma_dieu_kien`, `khong_hinh_thuc_hoa`, `van_ban_dan_chieu`.
--   3. `approvals.chi_tiet`: bản chụp các trường trên lúc duyệt (ghi vết khi C7 được ghi tường minh → C2).
--   4. Nới CHECK `entities_dieu_kien_duyet_phai_may_doc`: điều kiện / ngưỡng đã duyệt phải máy đọc HOẶC gắn cờ không
--      hình thức hóa (trước đây C4–C7 không vào được thư viện).
--   5. `entity_du_dieu_kien_duyet(entities)` — một nơi duy nhất kiểm "đủ trường để duyệt", dùng cho cả
--      `approve_entity` (báo lỗi) và `approve_chunk` (bỏ qua entity chưa đủ, để `cho_duyet`).
--   6. `approve_entity(p_entity_id, p_quyet_dinh, p_ghi_chu)` — bỏ `p_ap_dung_moi_doanh_nghiep` (DROP bản 4 tham số).
--      Hàm KIỂM tính nhất quán, không tự suy ra `pham_vi` / cờ từ mã: chọn C0 là chuyên viên tự xác nhận phạm vi chung.
--   7. `khoa_entity` + GRANT UPDATE theo cột: 4 cột mới sửa được khi `cho_duyet`, khóa sau khi xử lý.
--   8. View `canh_dieu_kien_nghia_vu` — SECURITY DEFINER CÓ CHỦ ĐÍCH (xem chú thích tại view). Ở migration này chỉ có
--      cạnh `dieu_kien` vào / `ap_dung_cho` ra; 008 dựng lại view, thêm cạnh `ngoai_le_*` và trạng thái duyệt của cạnh.
--
-- Dữ liệu cũ:
--   - Entity đã duyệt trước migration này có `pham_vi` null = CHƯA XÁC NHẬN phạm vi. S9 (sau sửa 14/11) trả
--     `cần bổ sung` / `thu_vien_chua_du` cho nghĩa vụ phụ thuộc chúng, KHÔNG coi là áp dụng mọi doanh nghiệp.
--     Không tự điền `pham_vi` cho dữ liệu cũ — xác nhận phạm vi là thao tác của chuyên viên.
--   - Trên project MIS mọi entity đang `cho_duyet` (nạp lại ở H2) nên không có dòng cũ đã duyệt; quy tắc trên vẫn ghi để
--     dùng được nếu áp lên DB có dữ liệu đã duyệt.
--   - Chủ thể đã duyệt bằng `p_ap_dung_moi_doanh_nghiep` (ghi chú "[Chủ thể chung — áp dụng mọi doanh nghiệp]") cũng
--     KHÔNG được tự chuyển thành `pham_vi = 'chung'`: chưa gán mã, chưa đi qua hàm duyệt mới.

begin;

-- ---------------------------------------------------------------- 1. bảng tra bộ mã

create table if not exists public.bo_ma_dieu_kien (
  ma                     text primary key check (ma ~ '^C[0-9]+$'),
  ten                    text not null,
  nhom                   text not null check (nhom in ('chung', 'may_doc', 'khong_hinh_thuc_hoa')),
  ly_do_mac_dinh         text check (ly_do_mac_dinh in ('thu_vien_chua_du', 'can_chuyen_mon')),
  can_van_ban_dan_chieu  boolean not null default false,
  mo_ta                  text not null,
  constraint bo_ma_ly_do_theo_nhom check ((nhom = 'khong_hinh_thuc_hoa') = (ly_do_mac_dinh is not null)),
  constraint bo_ma_dan_chieu_theo_nhom check (not can_van_ban_dan_chieu or nhom = 'khong_hinh_thuc_hoa')
);
comment on table public.bo_ma_dieu_kien is
  'Bộ mã điều kiện C0–C7, bản nháp v1 (HE_THONG_DA_CHOT §9.1). S9 rẽ nhánh theo nhom, không theo tên mã.';

insert into public.bo_ma_dieu_kien (ma, ten, nhom, ly_do_mac_dinh, can_van_ban_dan_chieu, mo_ta) values
  ('C0', 'Áp dụng mọi đối tượng của văn bản', 'chung', null, false,
   'Chuyên viên xác nhận pham_vi = chung. Không thêm điều kiện.'),
  ('C1', 'Ngưỡng định lượng', 'may_doc', null, false,
   'Ví dụ doanh thu ≤ 3 tỷ. Viết điều kiện máy đọc trên trường hồ sơ T1.'),
  ('C2', 'Phân loại dứt khoát', 'may_doc', null, false,
   'Ví dụ loại hình, phương pháp nộp thuế. Điều kiện máy đọc trên trường T0 / T2.'),
  ('C3', 'Theo sự kiện', 'may_doc', null, false,
   'Thay đổi + ngày. Điều kiện máy đọc trên trường T3; hạn tính từ ngày sự kiện.'),
  ('C4', 'Dẫn chiếu ra văn bản khác', 'khong_hinh_thuc_hoa', 'thu_vien_chua_du', true,
   'Không kết luận được đến khi văn bản đích được nạp. Ghi số hiệu văn bản đích.'),
  ('C5', 'Giao văn bản dưới luật quy định', 'khong_hinh_thuc_hoa', 'thu_vien_chua_du', true,
   'Không kết luận được đến khi nghị định / thông tư được nạp. Ghi số hiệu văn bản (nếu biết).'),
  ('C6', 'Thuật ngữ định tính', 'khong_hinh_thuc_hoa', 'can_chuyen_mon', false,
   'Cần phán đoán chuyên môn; hệ không kết luận.'),
  ('C7', 'Điều kiện ngầm từ phạm vi chương / mục', 'khong_hinh_thuc_hoa', 'thu_vien_chua_du', false,
   'Đọc riêng câu không thấy điều kiện. Ghi tường minh được thì đổi sang C2 (có vết trong approvals.chi_tiet).')
on conflict (ma) do update
  set ten = excluded.ten, nhom = excluded.nhom, ly_do_mac_dinh = excluded.ly_do_mac_dinh,
      can_van_ban_dan_chieu = excluded.can_van_ban_dan_chieu, mo_ta = excluded.mo_ta;

alter table public.bo_ma_dieu_kien enable row level security;
drop policy if exists bo_ma_select on public.bo_ma_dieu_kien;
create policy bo_ma_select on public.bo_ma_dieu_kien for select to authenticated using (true);
-- Quyền mặc định của project cấp ALL cho anon / authenticated khi tạo bảng → gỡ, chỉ cấp đúng quyền cần
revoke all on table public.bo_ma_dieu_kien from anon, authenticated;
grant select on table public.bo_ma_dieu_kien to authenticated;
grant all on table public.bo_ma_dieu_kien to service_role;

-- ---------------------------------------------------------------- 2. cột mới của entities

alter table public.entities
  add column if not exists pham_vi             text,
  add column if not exists ma_dieu_kien        text,
  add column if not exists khong_hinh_thuc_hoa boolean not null default false,
  add column if not exists van_ban_dan_chieu   text;

alter table public.entities drop constraint if exists entities_pham_vi_hop_le;
alter table public.entities add constraint entities_pham_vi_hop_le
  check (pham_vi is null or pham_vi in ('chung', 'co_dieu_kien'));

alter table public.entities drop constraint if exists entities_ma_dieu_kien_fkey;
alter table public.entities add constraint entities_ma_dieu_kien_fkey
  foreign key (ma_dieu_kien) references public.bo_ma_dieu_kien (ma) on update cascade on delete restrict;

-- Cờ không hình thức hóa và điều kiện máy đọc loại trừ nhau ở mọi thời điểm
alter table public.entities drop constraint if exists entities_khong_vua_may_doc_vua_co;
alter table public.entities add constraint entities_khong_vua_may_doc_vua_co
  check (not (khong_hinh_thuc_hoa and dieu_kien_may_doc is not null));

comment on column public.entities.pham_vi is
  'null = CHƯA XÁC NHẬN (không phải "áp dụng mọi doanh nghiệp"). chung = chuyên viên xác nhận C0; co_dieu_kien = có điều kiện.';
comment on column public.entities.khong_hinh_thuc_hoa is
  'Điều kiện C4–C7: không viết được điều kiện máy đọc. S9 coi là chưa xác định.';
comment on column public.entities.van_ban_dan_chieu is 'Số hiệu văn bản đích của dẫn chiếu (C4 / C5).';

create index if not exists entities_ma_dieu_kien_idx on public.entities (ma_dieu_kien) where ma_dieu_kien is not null;

-- ---------------------------------------------------------------- 3. approvals.chi_tiet

alter table public.approvals add column if not exists chi_tiet jsonb;
comment on column public.approvals.chi_tiet is
  'Bản chụp lúc duyệt entity: {pham_vi, ma_dieu_kien, dieu_kien_may_doc, khong_hinh_thuc_hoa, van_ban_dan_chieu, loai_entity}.';

-- ---------------------------------------------------------------- 4. nới CHECK cũ

alter table public.entities drop constraint if exists entities_dieu_kien_duyet_phai_may_doc;
alter table public.entities add constraint entities_dieu_kien_duyet_phai_may_doc
  check (trang_thai_duyet <> 'da_duyet'
         or loai_entity not in ('dieu_kien', 'nguong')
         or dieu_kien_may_doc is not null
         or khong_hinh_thuc_hoa);

-- ---------------------------------------------------------------- 5. kiểm "đủ trường để duyệt"

-- Trả null nếu entity đủ trường để chuyển sang da_duyet; ngược lại trả lý do (tiếng Việt, hiện được cho chuyên viên).
create or replace function public.entity_du_dieu_kien_duyet(e public.entities)
returns text
language plpgsql
stable
set search_path = ''
as $$
declare
  v_ma public.bo_ma_dieu_kien;
begin
  if e.loai_entity = 'hanh_vi' then
    if e.pham_vi is null then
      return 'Nghĩa vụ chưa xác nhận phạm vi (chung / có điều kiện)';
    end if;
    return null;
  end if;

  if e.loai_entity not in ('chu_the', 'dieu_kien', 'nguong') then
    return null;
  end if;

  if e.ma_dieu_kien is null then
    return 'Chưa gán mã điều kiện C0–C7';
  end if;
  select * into v_ma from public.bo_ma_dieu_kien where ma = e.ma_dieu_kien;

  if v_ma.nhom = 'chung' then
    if e.loai_entity <> 'chu_the' then
      return format('Mã %s (áp dụng mọi đối tượng) chỉ dùng cho chủ thể, không cho %s', v_ma.ma, e.loai_entity);
    end if;
    if e.pham_vi is distinct from 'chung' or e.dieu_kien_may_doc is not null or e.khong_hinh_thuc_hoa then
      return format('Mã %s: phạm vi phải là "chung", không có điều kiện máy đọc, không gắn cờ không hình thức hóa', v_ma.ma);
    end if;
    return null;
  end if;

  if v_ma.nhom = 'may_doc' then
    if e.pham_vi is distinct from 'co_dieu_kien' or e.dieu_kien_may_doc is null or e.khong_hinh_thuc_hoa then
      return format('Mã %s: phạm vi phải là "có điều kiện" và có điều kiện máy đọc', v_ma.ma);
    end if;
    return null;
  end if;

  -- khong_hinh_thuc_hoa
  if e.pham_vi is distinct from 'co_dieu_kien' or not e.khong_hinh_thuc_hoa or e.dieu_kien_may_doc is not null then
    return format('Mã %s: phạm vi phải là "có điều kiện", gắn cờ không hình thức hóa, không có điều kiện máy đọc', v_ma.ma);
  end if;
  if v_ma.can_van_ban_dan_chieu and nullif(btrim(e.van_ban_dan_chieu), '') is null then
    return format('Mã %s: phải ghi văn bản được dẫn chiếu', v_ma.ma);
  end if;
  return null;
end;
$$;
revoke all on function public.entity_du_dieu_kien_duyet(public.entities) from public, anon;
grant execute on function public.entity_du_dieu_kien_duyet(public.entities) to authenticated, service_role;

-- ---------------------------------------------------------------- 6. hàm duyệt

drop function if exists public.approve_entity(uuid, public.trang_thai_duyet, text, boolean);

create or replace function public.approve_entity(
  p_entity_id   uuid,
  p_quyet_dinh  public.trang_thai_duyet,
  p_ghi_chu     text default null
) returns public.entities
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_entity public.entities;
  v_ly_do  text;
begin
  if auth.uid() is null then
    raise exception 'Cần curator đăng nhập để duyệt entity' using errcode = 'PT401';
  end if;
  if not public.is_curator() then
    raise exception 'Chỉ curator được duyệt entity' using errcode = 'PT403';
  end if;
  if p_quyet_dinh = 'cho_duyet' then
    raise exception 'Quyết định phải là da_duyet hoặc tu_choi' using errcode = 'PT400';
  end if;

  -- Khóa dòng trước khi kiểm, để kiểm và cập nhật nhìn cùng một bản
  select * into v_entity from public.entities where id = p_entity_id for update;
  if v_entity.id is null then
    raise exception 'Không tìm thấy entity' using errcode = 'PT404';
  end if;
  if v_entity.trang_thai_duyet <> 'cho_duyet' then
    raise exception 'Entity không còn ở trạng thái cho_duyet' using errcode = 'PT409';
  end if;

  if p_quyet_dinh = 'da_duyet' then
    v_ly_do := public.entity_du_dieu_kien_duyet(v_entity);
    if v_ly_do is not null then
      raise exception '%', v_ly_do using errcode = 'PT400';
    end if;
  end if;

  perform set_config('nexora.duyet_boi_nguoi', 'on', true);
  update public.entities
     set trang_thai_duyet = p_quyet_dinh,
         curator_id       = auth.uid(),
         ghi_chu_curator  = coalesce(p_ghi_chu, ghi_chu_curator)
   where id = p_entity_id
     and trang_thai_duyet = 'cho_duyet'
  returning * into v_entity;
  perform set_config('nexora.duyet_boi_nguoi', 'off', true);

  insert into public.approvals (entity_id, nguoi_duyet_id, quyet_dinh, ghi_chu, chi_tiet)
  values (v_entity.id, auth.uid(), p_quyet_dinh, p_ghi_chu,
          jsonb_build_object(
            'loai_entity', v_entity.loai_entity, 'pham_vi', v_entity.pham_vi, 'ma_dieu_kien', v_entity.ma_dieu_kien,
            'dieu_kien_may_doc', v_entity.dieu_kien_may_doc, 'khong_hinh_thuc_hoa', v_entity.khong_hinh_thuc_hoa,
            'van_ban_dan_chieu', v_entity.van_ban_dan_chieu));

  perform public.cap_nhat_trang_thai_chunk(v_entity.chunk_id);
  return v_entity;
end;
$$;
revoke all on function public.approve_entity(uuid, public.trang_thai_duyet, text) from public, anon;
grant execute on function public.approve_entity(uuid, public.trang_thai_duyet, text) to authenticated, service_role;

-- Duyệt cả chunk: chỉ entity đủ trường; entity chưa đủ ở lại cho_duyet để chuyên viên xử lý từng cái
create or replace function public.approve_chunk(p_chunk_id uuid, p_ghi_chu text default null)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer;
begin
  if auth.uid() is null then
    raise exception 'Cần curator đăng nhập để duyệt' using errcode = 'PT401';
  end if;
  if not public.is_curator() then
    raise exception 'Chỉ curator được duyệt entity' using errcode = 'PT403';
  end if;
  if not exists (select 1 from public.van_ban_chunks where id = p_chunk_id) then
    raise exception 'Không tìm thấy chunk' using errcode = 'PT404';
  end if;

  perform set_config('nexora.duyet_boi_nguoi', 'on', true);
  with duyet as (
    update public.entities e
       set trang_thai_duyet = 'da_duyet',
           curator_id       = auth.uid()
     where e.chunk_id = p_chunk_id
       and e.trang_thai_duyet = 'cho_duyet'
       and public.entity_du_dieu_kien_duyet(e) is null
    returning e.*
  ), log as (
    insert into public.approvals (entity_id, nguoi_duyet_id, quyet_dinh, ghi_chu, chi_tiet)
    select d.id, auth.uid(), 'da_duyet', p_ghi_chu,
           jsonb_build_object(
             'loai_entity', d.loai_entity, 'pham_vi', d.pham_vi, 'ma_dieu_kien', d.ma_dieu_kien,
             'dieu_kien_may_doc', d.dieu_kien_may_doc, 'khong_hinh_thuc_hoa', d.khong_hinh_thuc_hoa,
             'van_ban_dan_chieu', d.van_ban_dan_chieu)
      from duyet d
    returning 1
  )
  select count(*) into v_count from log;
  perform set_config('nexora.duyet_boi_nguoi', 'off', true);

  perform public.cap_nhat_trang_thai_chunk(p_chunk_id);
  return v_count;
end;
$$;
revoke all on function public.approve_chunk(uuid, text) from public, anon;
grant execute on function public.approve_chunk(uuid, text) to authenticated, service_role;

-- ---------------------------------------------------------------- 7. khóa sau khi xử lý + quyền sửa theo cột

create or replace function public.khoa_entity()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (new.chunk_id, new.pipeline_run_id, new.ma_tam, new.noi_dung_goc, new.so_dieu, new.dieu_khoan)
     is distinct from
     (old.chunk_id, old.pipeline_run_id, old.ma_tam, old.noi_dung_goc, old.so_dieu, old.dieu_khoan) then
    raise exception 'Không được sửa trích dẫn gốc / nguồn gốc của entity' using errcode = 'PT403';
  end if;
  if old.trang_thai_duyet <> 'cho_duyet' and (
       new.ten_entity, new.loai_entity, new.mo_ta, new.domain, new.primary_departments,
       new.secondary_departments, new.ngay_co_hieu_luc, new.dieu_kien_may_doc, new.curator_id,
       new.pham_vi, new.ma_dieu_kien, new.khong_hinh_thuc_hoa, new.van_ban_dan_chieu
     ) is distinct from (
       old.ten_entity, old.loai_entity, old.mo_ta, old.domain, old.primary_departments,
       old.secondary_departments, old.ngay_co_hieu_luc, old.dieu_kien_may_doc, old.curator_id,
       old.pham_vi, old.ma_dieu_kien, old.khong_hinh_thuc_hoa, old.van_ban_dan_chieu
     ) then
    raise exception 'Entity đã xử lý, không sửa nội dung' using errcode = 'PT409';
  end if;
  return new;
end;
$$;

grant update (pham_vi, ma_dieu_kien, khong_hinh_thuc_hoa, van_ban_dan_chieu) on table public.entities to authenticated;

-- ---------------------------------------------------------------- 8. view cạnh điều kiện cho S9

-- SECURITY DEFINER CÓ CHỦ ĐÍCH (security_invoker = false). RLS của entities cho khách hàng chỉ thấy entity da_duyet,
-- và rel_select chỉ trả cạnh có nguồn nhìn thấy được → điều kiện CHƯA DUYỆT biến mất với khách hàng nhưng hiện với
-- chuyên viên. Khi "chưa xác nhận ≠ áp dụng", cùng một nghĩa vụ sẽ ra kết luận khác nhau tùy ai bấm quét.
-- View này trả cho mọi người dùng đăng nhập cùng một tập cạnh, CHỈ id + loại cạnh + trạng thái duyệt — không có tên,
-- mô tả, trích dẫn. Nội dung entity vẫn đi qua RLS như cũ.
-- Hướng cạnh theo filterDomain.ts: `dieu_kien`: điều kiện → nghĩa vụ; `ap_dung_cho`: nghĩa vụ → chủ thể.
create or replace view public.canh_dieu_kien_nghia_vu
with (security_invoker = false) as
  select r.target_entity_id   as hanh_vi_id,
         r.source_entity_id   as entity_id,
         r.loai_relationship  as loai_canh,
         e.trang_thai_duyet   as entity_trang_thai_duyet
    from public.entity_relationships r
    join public.entities hv on hv.id = r.target_entity_id
    join public.entities e  on e.id = r.source_entity_id
   where r.loai_relationship = 'dieu_kien'
     and hv.loai_entity = 'hanh_vi' and hv.trang_thai_duyet = 'da_duyet'
  union all
  select r.source_entity_id, r.target_entity_id, r.loai_relationship, e.trang_thai_duyet
    from public.entity_relationships r
    join public.entities hv on hv.id = r.source_entity_id
    join public.entities e  on e.id = r.target_entity_id
   where r.loai_relationship = 'ap_dung_cho'
     and hv.loai_entity = 'hanh_vi' and hv.trang_thai_duyet = 'da_duyet';

comment on view public.canh_dieu_kien_nghia_vu is
  'SECURITY DEFINER có chủ đích: S9 thấy cùng tập cạnh điều kiện bất kể ai gọi. Chỉ id + trạng thái, không nội dung. 007; 008 thêm ngoại lệ.';

revoke all on table public.canh_dieu_kien_nghia_vu from anon, authenticated;
grant select on table public.canh_dieu_kien_nghia_vu to authenticated, service_role;

commit;
