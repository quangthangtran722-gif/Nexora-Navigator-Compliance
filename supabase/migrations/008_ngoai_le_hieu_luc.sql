-- 008_ngoai_le_hieu_luc.sql — cạnh ngoại lệ, ngày hết hiệu lực, trạng thái duyệt của cạnh, người duyệt ≠ người tạo,
-- thu hẹp quyền của vai đăng nhập (M8).
-- Thiết kế: docs/mis/HE_THONG_DA_CHOT.md §12 thay đổi #3, #4; nhật ký #12, #14. Kế hoạch: docs/mis/PLAN.md §2 M8.
-- Áp sau 007, trên project MIS. KHÔNG áp lên prod. Idempotent: chạy lại không đổi kết quả.
-- Chạy bằng `psql -f` KHÔNG kèm --single-transaction: phần 0 (thêm giá trị enum) phải commit trước phần còn lại.
--
-- Nội dung:
--   0. `loai_relationship` thêm `ngoai_le_bac_bo`, `ngoai_le_thay_the`. Hướng: source = ngoại lệ, target = nghĩa vụ bị
--      ngoại lệ. Trong file này so sánh qua `::text` để không phải dùng giá trị enum mới trong cùng transaction.
--   1. Thu hẹp quyền: gỡ TRUNCATE, TRIGGER, REFERENCES, MAINTAIN của `anon`, `authenticated` trên mọi bảng / view schema
--      public, và gỡ khỏi quyền mặc định cho bảng tạo sau này. Ứng dụng không dùng quyền nào trong bốn quyền này (đã rà
--      scripts/, tests/, lib/, app/, supabase/tests/ ngày 10/11). Lý do: TRUNCATE xóa sạch bảng (kể cả `approvals`) không
--      qua RLS, không kích hoạt trigger theo dòng; TRIGGER cho phép gắn trigger lên bảng — đường lách
--      `guard_trang_thai_duyet`. `service_role` giữ nguyên (khóa quản trị, vốn bỏ qua RLS).
--   2. `entity_relationships`: `chi_mot_phan` (chỉ cạnh ngoại lệ), `trang_thai_duyet` (mặc định `cho_duyet`),
--      `nguoi_duyet_id`, `nguoi_sua_cuoi_id`. CHECK: cạnh ngoại lệ chỉ do người thêm (`pipeline_run_id` null), phải có đích.
--   3. Trigger cạnh:
--      - `guard_trang_thai_duyet` (dùng lại hàm 002): INSERT phải `cho_duyet`; đổi trạng thái chỉ qua hàm duyệt.
--      - `rel_truoc_khi_them`: ép `nguoi_tao_id := auth.uid()` (client không ghi đè được); cạnh gắn `pipeline_run_id`
--        do vai đăng nhập thêm phải thuộc đúng lượt trích xuất ĐANG CHẠY của chính người đó, cùng chunk, cùng lượt với
--        entity nguồn — không gắn được cạnh tay vào một lượt LLM để "đi kèm" khi duyệt entity, né bước hai người.
--      - `khoa_relationship` viết lại: khóa theo trạng thái của CHÍNH cạnh; người sửa nội dung cạnh chờ duyệt được ghi
--        vào `nguoi_sua_cuoi_id`; cạnh do người thêm chỉ người tạo được rút (xóa) khi còn chờ duyệt.
--   4. `entities.ngay_het_hieu_luc` (S2 thủ công) + CHECK, quyền sửa theo cột, khóa sau khi duyệt.
--   5. `approvals.relationship_id`; CHECK đúng một trong ba đối tượng.
--   6. Hàm duyệt:
--      - `approve_entity` / `approve_chunk`: cạnh LLM CHƯA BỊ NGƯỜI SỬA có nguồn là entity được xử lý chuyển theo, mỗi
--        cạnh một dòng `approvals` cùng người duyệt. Cạnh do người thêm hoặc người đã sửa KHÔNG chuyển theo.
--      - `approve_relationship`: cho cạnh do người thêm / đã sửa. Người duyệt ≠ người tạo và ≠ người sửa cuối (PT403);
--        không xác định được người tạo → từ chối (PT403). Áp cho cả duyệt lẫn từ chối. Hai đầu cạnh phải đã xử lý.
--   7. View `canh_dieu_kien_nghia_vu` dựng lại: thêm cạnh `ngoai_le_*` vào nghĩa vụ, `canh_id`,
--      `canh_trang_thai_duyet`, `chi_mot_phan`. S9: cạnh `da_duyet` → dùng; `cho_duyet` → chưa xác nhận; `tu_choi` → bỏ.
--
-- Dữ liệu cũ:
--   - Cạnh hiện có nhận `trang_thai_duyet = cho_duyet` (mặc định). Trên MIS mọi entity đang `cho_duyet` (H2) nên nhất
--     quán: cạnh LLM sẽ được duyệt khi chuyên viên duyệt entity nguồn.
--   - Nếu áp lên DB đã có entity duyệt (prod): cạnh của entity đã duyệt sẽ kẹt ở `cho_duyet`. KHÔNG sửa bằng SQL;
--     chỉ được xử lý bằng một lần chạy ghi `approvals` của người thật. Ngoài phạm vi MVP.
--   - `ngay_het_hieu_luc` null = còn hiệu lực.

-- ---------------------------------------------------------------- 0. giá trị enum mới (tự commit)

alter type public.loai_relationship add value if not exists 'ngoai_le_bac_bo';
alter type public.loai_relationship add value if not exists 'ngoai_le_thay_the';

begin;

-- ---------------------------------------------------------------- 1. thu hẹp quyền của vai đăng nhập

revoke truncate, references, trigger, maintain on all tables in schema public from anon, authenticated;
alter default privileges for role postgres in schema public
  revoke truncate, references, trigger, maintain on tables from anon, authenticated;

-- ---------------------------------------------------------------- 2. cột mới của entity_relationships

alter table public.entity_relationships
  add column if not exists chi_mot_phan       boolean not null default false,
  add column if not exists trang_thai_duyet   public.trang_thai_duyet not null default 'cho_duyet',
  add column if not exists nguoi_duyet_id     uuid,
  add column if not exists nguoi_sua_cuoi_id  uuid;

alter table public.entity_relationships drop constraint if exists rel_chi_mot_phan_chi_ngoai_le;
alter table public.entity_relationships add constraint rel_chi_mot_phan_chi_ngoai_le
  check (not chi_mot_phan or loai_relationship::text in ('ngoai_le_bac_bo', 'ngoai_le_thay_the'));

alter table public.entity_relationships drop constraint if exists rel_ngoai_le_do_nguoi_them;
alter table public.entity_relationships add constraint rel_ngoai_le_do_nguoi_them
  check (loai_relationship::text not in ('ngoai_le_bac_bo', 'ngoai_le_thay_the') or pipeline_run_id is null);

alter table public.entity_relationships drop constraint if exists rel_ngoai_le_co_dich;
alter table public.entity_relationships add constraint rel_ngoai_le_co_dich
  check (loai_relationship::text not in ('ngoai_le_bac_bo', 'ngoai_le_thay_the') or target_entity_id is not null);

alter table public.entity_relationships drop constraint if exists rel_da_xu_ly_co_nguoi_duyet;
alter table public.entity_relationships add constraint rel_da_xu_ly_co_nguoi_duyet
  check (trang_thai_duyet = 'cho_duyet' or nguoi_duyet_id is not null);

comment on column public.entity_relationships.chi_mot_phan is
  'Cạnh ngoại lệ chỉ loại trừ một phần (vd TNDN Đ18 k3): KHÔNG bác bỏ nghĩa vụ gốc; nghĩa vụ ngoại lệ có kết luận riêng.';
comment on column public.entity_relationships.trang_thai_duyet is
  'cho_duyet khi tạo. Cạnh LLM chưa bị sửa: duyệt cùng entity nguồn. Cạnh người thêm / đã sửa: approve_relationship.';
comment on column public.entity_relationships.nguoi_sua_cuoi_id is
  'Người cuối cùng sửa nội dung cạnh khi còn cho_duyet (trigger ghi). Không được tự duyệt cạnh mình đã sửa.';

create index if not exists rel_cho_duyet_idx on public.entity_relationships (source_entity_id)
  where trang_thai_duyet = 'cho_duyet';

-- ---------------------------------------------------------------- 3. trigger của cạnh

drop trigger if exists rel_guard_trang_thai_duyet on public.entity_relationships;
create trigger rel_guard_trang_thai_duyet
  before insert or update on public.entity_relationships
  for each row execute function public.guard_trang_thai_duyet();

create or replace function public.rel_truoc_khi_them()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_run public.pipeline_runs;
begin
  -- Người tạo luôn là người đang đăng nhập; client không ghi đè được. Script chạy bằng khóa quản trị → null.
  new.nguoi_tao_id      := auth.uid();
  new.nguoi_duyet_id    := null;
  new.nguoi_sua_cuoi_id := null;

  -- Chỉ kiểm với vai của người dùng (PostgREST). Khóa quản trị / migration là đường tin cậy.
  if current_user in ('authenticated', 'anon') and new.pipeline_run_id is not null then
    select * into v_run from public.pipeline_runs where id = new.pipeline_run_id;
    if v_run.id is null
       or v_run.pipeline_name <> 'extract_entities'
       or v_run.trang_thai <> 'dang_xu_ly'
       or v_run.chunk_id is distinct from new.chunk_id
       or v_run.nguoi_chay_id is distinct from auth.uid()
       or not exists (select 1 from public.entities e
                       where e.id = new.source_entity_id and e.pipeline_run_id = new.pipeline_run_id) then
      raise exception 'Cạnh gắn lượt trích xuất chỉ được tạo trong chính lượt đó (đang chạy, cùng chunk, cùng người chạy)'
        using errcode = 'PT403';
    end if;
  end if;
  return new;
end;
$$;
revoke all on function public.rel_truoc_khi_them() from public, anon, authenticated;

drop trigger if exists rel_truoc_khi_them on public.entity_relationships;
create trigger rel_truoc_khi_them
  before insert on public.entity_relationships
  for each row execute function public.rel_truoc_khi_them();

create or replace function public.khoa_relationship()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_src_status public.trang_thai_duyet;
begin
  select trang_thai_duyet into v_src_status from public.entities where id = old.source_entity_id;

  if tg_op = 'DELETE' then
    if old.trang_thai_duyet <> 'cho_duyet' then
      raise exception 'Cạnh đã xử lý, không xóa được' using errcode = 'PT409';
    end if;
    if old.pipeline_run_id is not null and v_src_status <> 'cho_duyet' then
      raise exception 'Không xóa cạnh của entity đã xử lý' using errcode = 'PT409';
    end if;
    -- Cạnh do người thêm: chỉ người tạo được rút. Người khác muốn bỏ thì TỪ CHỐI (có vết trong approvals).
    if old.pipeline_run_id is null and current_user in ('authenticated', 'anon')
       and old.nguoi_tao_id is distinct from auth.uid() then
      raise exception 'Chỉ người tạo được rút cạnh đang chờ duyệt; người khác dùng Từ chối' using errcode = 'PT403';
    end if;
    return old;
  end if;

  if (new.source_entity_id, new.chunk_id, new.pipeline_run_id, new.loai_relationship, new.chi_mot_phan,
      new.nguoi_tao_id, new.created_at)
     is distinct from
     (old.source_entity_id, old.chunk_id, old.pipeline_run_id, old.loai_relationship, old.chi_mot_phan,
      old.nguoi_tao_id, old.created_at) then
    raise exception 'Chỉ được sửa target / can_cu của cạnh' using errcode = 'PT403';
  end if;

  if (new.target_entity_id, new.target_ref_text, new.can_cu)
     is not distinct from (old.target_entity_id, old.target_ref_text, old.can_cu) then
    return new;  -- không đổi nội dung (vd hàm duyệt đổi trạng thái)
  end if;

  if old.trang_thai_duyet <> 'cho_duyet' then
    -- Cạnh đã xử lý chỉ được nối pending link của cạnh tham chiếu (không dùng trong S9)
    if not (old.loai_relationship = 'tham_chieu' and old.target_entity_id is null and new.target_entity_id is not null
            and new.can_cu is not distinct from old.can_cu) then
      raise exception 'Cạnh đã xử lý, không sửa nội dung' using errcode = 'PT409';
    end if;
    return new;
  end if;

  -- Cạnh chờ duyệt bị người sửa: ghi người sửa cuối; cạnh LLM bị sửa không còn được duyệt kèm entity
  if current_user in ('authenticated', 'anon') then
    new.nguoi_sua_cuoi_id := auth.uid();
  end if;
  return new;
end;
$$;
revoke all on function public.khoa_relationship() from public, anon, authenticated;

-- ---------------------------------------------------------------- 4. ngày hết hiệu lực

alter table public.entities add column if not exists ngay_het_hieu_luc date;
alter table public.entities drop constraint if exists entities_het_hieu_luc_sau_co_hieu_luc;
alter table public.entities add constraint entities_het_hieu_luc_sau_co_hieu_luc
  check (ngay_het_hieu_luc is null or ngay_co_hieu_luc is null or ngay_het_hieu_luc >= ngay_co_hieu_luc);
comment on column public.entities.ngay_het_hieu_luc is
  'S2 thủ công: ngày khoản bị bãi bỏ / thay thế. null = còn hiệu lực. S9 bước 2: hết hiệu lực tại ngày đánh giá → không áp dụng.';

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
       new.pham_vi, new.ma_dieu_kien, new.khong_hinh_thuc_hoa, new.van_ban_dan_chieu, new.ngay_het_hieu_luc
     ) is distinct from (
       old.ten_entity, old.loai_entity, old.mo_ta, old.domain, old.primary_departments,
       old.secondary_departments, old.ngay_co_hieu_luc, old.dieu_kien_may_doc, old.curator_id,
       old.pham_vi, old.ma_dieu_kien, old.khong_hinh_thuc_hoa, old.van_ban_dan_chieu, old.ngay_het_hieu_luc
     ) then
    raise exception 'Entity đã xử lý, không sửa nội dung' using errcode = 'PT409';
  end if;
  return new;
end;
$$;

grant update (ngay_het_hieu_luc) on table public.entities to authenticated;

-- ---------------------------------------------------------------- 5. approvals cho cạnh

alter table public.approvals add column if not exists relationship_id uuid;
alter table public.approvals drop constraint if exists approvals_relationship_id_fkey;
alter table public.approvals add constraint approvals_relationship_id_fkey
  foreign key (relationship_id) references public.entity_relationships (id);
alter table public.approvals drop constraint if exists approvals_dung_mot_doi_tuong;
alter table public.approvals add constraint approvals_dung_mot_doi_tuong
  check ((entity_id is not null)::integer + (diagnostic_id is not null)::integer + (relationship_id is not null)::integer = 1);
create index if not exists approvals_relationship_id_idx on public.approvals (relationship_id) where relationship_id is not null;
comment on column public.approvals.chi_tiet is
  'Bản chụp lúc duyệt. Entity: {loai_entity, pham_vi, ma_dieu_kien, dieu_kien_may_doc, khong_hinh_thuc_hoa, van_ban_dan_chieu, '
  'ngay_co_hieu_luc, ngay_het_hieu_luc}. Cạnh: {loai, source, target, chi_mot_phan, can_cu, nguoi_tao_id, nguoi_sua_cuoi_id, theo_entity}.';

-- ---------------------------------------------------------------- 6. hàm duyệt

-- Nội bộ: chuyển cạnh LLM chưa bị sửa của một entity theo quyết định của entity. Chỉ gọi từ hàm duyệt (security definer).
create or replace function public.duyet_canh_theo_entity(p_entity_id uuid, p_quyet_dinh public.trang_thai_duyet, p_ghi_chu text)
returns integer
language plpgsql
set search_path = ''
as $$
declare
  v_count integer;
begin
  with doi as (
    update public.entity_relationships r
       set trang_thai_duyet = p_quyet_dinh,
           nguoi_duyet_id   = auth.uid()
     where r.source_entity_id = p_entity_id
       and r.trang_thai_duyet = 'cho_duyet'
       and r.pipeline_run_id is not null
       and r.nguoi_sua_cuoi_id is null
    returning r.*
  ), log as (
    insert into public.approvals (relationship_id, nguoi_duyet_id, quyet_dinh, ghi_chu, chi_tiet)
    select d.id, auth.uid(), p_quyet_dinh, p_ghi_chu,
           jsonb_build_object('loai', d.loai_relationship, 'source', d.source_entity_id, 'target', d.target_entity_id,
                              'can_cu', d.can_cu, 'theo_entity', p_entity_id)
      from doi d
    returning 1
  )
  select count(*) into v_count from log;
  return v_count;
end;
$$;
revoke all on function public.duyet_canh_theo_entity(uuid, public.trang_thai_duyet, text) from public, anon, authenticated;

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

  insert into public.approvals (entity_id, nguoi_duyet_id, quyet_dinh, ghi_chu, chi_tiet)
  values (v_entity.id, auth.uid(), p_quyet_dinh, p_ghi_chu,
          jsonb_build_object(
            'loai_entity', v_entity.loai_entity, 'pham_vi', v_entity.pham_vi, 'ma_dieu_kien', v_entity.ma_dieu_kien,
            'dieu_kien_may_doc', v_entity.dieu_kien_may_doc, 'khong_hinh_thuc_hoa', v_entity.khong_hinh_thuc_hoa,
            'van_ban_dan_chieu', v_entity.van_ban_dan_chieu,
            'ngay_co_hieu_luc', v_entity.ngay_co_hieu_luc, 'ngay_het_hieu_luc', v_entity.ngay_het_hieu_luc));

  perform public.duyet_canh_theo_entity(v_entity.id, p_quyet_dinh, p_ghi_chu);
  perform set_config('nexora.duyet_boi_nguoi', 'off', true);

  perform public.cap_nhat_trang_thai_chunk(v_entity.chunk_id);
  return v_entity;
end;
$$;
revoke all on function public.approve_entity(uuid, public.trang_thai_duyet, text) from public, anon;
grant execute on function public.approve_entity(uuid, public.trang_thai_duyet, text) to authenticated, service_role;

create or replace function public.approve_chunk(p_chunk_id uuid, p_ghi_chu text default null)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_ids uuid[];
  v_id  uuid;
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
             'van_ban_dan_chieu', d.van_ban_dan_chieu,
             'ngay_co_hieu_luc', d.ngay_co_hieu_luc, 'ngay_het_hieu_luc', d.ngay_het_hieu_luc)
      from duyet d
    returning entity_id
  )
  select coalesce(array_agg(entity_id), '{}') into v_ids from log;

  foreach v_id in array v_ids loop
    perform public.duyet_canh_theo_entity(v_id, 'da_duyet', p_ghi_chu);
  end loop;
  perform set_config('nexora.duyet_boi_nguoi', 'off', true);

  perform public.cap_nhat_trang_thai_chunk(p_chunk_id);
  return coalesce(array_length(v_ids, 1), 0);
end;
$$;
revoke all on function public.approve_chunk(uuid, text) from public, anon;
grant execute on function public.approve_chunk(uuid, text) to authenticated, service_role;

-- Duyệt / từ chối cạnh do người thêm hoặc đã bị người sửa. Bốn mắt: người duyệt ≠ người tạo, ≠ người sửa cuối.
create or replace function public.approve_relationship(
  p_relationship_id  uuid,
  p_quyet_dinh       public.trang_thai_duyet,
  p_ghi_chu          text default null
) returns public.entity_relationships
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_rel     public.entity_relationships;
  v_src     public.trang_thai_duyet;
  v_dst     public.trang_thai_duyet;
begin
  if auth.uid() is null then
    raise exception 'Cần curator đăng nhập để duyệt cạnh' using errcode = 'PT401';
  end if;
  if not public.is_curator() then
    raise exception 'Chỉ curator được duyệt cạnh' using errcode = 'PT403';
  end if;
  if p_quyet_dinh = 'cho_duyet' then
    raise exception 'Quyết định phải là da_duyet hoặc tu_choi' using errcode = 'PT400';
  end if;

  select * into v_rel from public.entity_relationships where id = p_relationship_id for update;
  if v_rel.id is null then
    raise exception 'Không tìm thấy cạnh' using errcode = 'PT404';
  end if;
  if v_rel.trang_thai_duyet <> 'cho_duyet' then
    raise exception 'Cạnh không còn ở trạng thái cho_duyet' using errcode = 'PT409';
  end if;
  if v_rel.pipeline_run_id is not null and v_rel.nguoi_sua_cuoi_id is null then
    raise exception 'Cạnh do LLM đề xuất được duyệt cùng entity nguồn, không duyệt riêng' using errcode = 'PT400';
  end if;

  -- Bốn mắt (ép ở CSDL, áp cho cả duyệt lẫn từ chối)
  if v_rel.pipeline_run_id is null and v_rel.nguoi_tao_id is null then
    raise exception 'Không xác định được người tạo cạnh — không duyệt được' using errcode = 'PT403';
  end if;
  if v_rel.pipeline_run_id is null and v_rel.nguoi_tao_id = auth.uid() then
    raise exception 'Người tạo cạnh không được tự duyệt; cần chuyên viên khác' using errcode = 'PT403';
  end if;
  if v_rel.nguoi_sua_cuoi_id = auth.uid() then
    raise exception 'Người sửa cạnh không được tự duyệt; cần chuyên viên khác' using errcode = 'PT403';
  end if;

  -- Hai đầu cạnh phải đã xử lý; đầu bị từ chối thì chỉ được từ chối cạnh
  select trang_thai_duyet into v_src from public.entities where id = v_rel.source_entity_id;
  select trang_thai_duyet into v_dst from public.entities where id = v_rel.target_entity_id;
  if v_src = 'cho_duyet' or v_dst = 'cho_duyet' then
    raise exception 'Duyệt hai đầu cạnh trước khi duyệt cạnh' using errcode = 'PT409';
  end if;
  if p_quyet_dinh = 'da_duyet' and (v_src = 'tu_choi' or v_dst = 'tu_choi') then
    raise exception 'Một đầu cạnh đã bị từ chối — chỉ được từ chối cạnh' using errcode = 'PT400';
  end if;

  perform set_config('nexora.duyet_boi_nguoi', 'on', true);
  update public.entity_relationships
     set trang_thai_duyet = p_quyet_dinh,
         nguoi_duyet_id   = auth.uid()
   where id = p_relationship_id
     and trang_thai_duyet = 'cho_duyet'
  returning * into v_rel;
  perform set_config('nexora.duyet_boi_nguoi', 'off', true);

  insert into public.approvals (relationship_id, nguoi_duyet_id, quyet_dinh, ghi_chu, chi_tiet)
  values (v_rel.id, auth.uid(), p_quyet_dinh, p_ghi_chu,
          jsonb_build_object('loai', v_rel.loai_relationship, 'source', v_rel.source_entity_id,
                             'target', v_rel.target_entity_id, 'chi_mot_phan', v_rel.chi_mot_phan, 'can_cu', v_rel.can_cu,
                             'nguoi_tao_id', v_rel.nguoi_tao_id, 'nguoi_sua_cuoi_id', v_rel.nguoi_sua_cuoi_id));
  return v_rel;
end;
$$;
revoke all on function public.approve_relationship(uuid, public.trang_thai_duyet, text) from public, anon;
grant execute on function public.approve_relationship(uuid, public.trang_thai_duyet, text) to authenticated, service_role;

-- ---------------------------------------------------------------- 7. view cạnh cho S9

-- SECURITY DEFINER CÓ CHỦ ĐÍCH — lý do xem 007. Chỉ id + loại + trạng thái + cờ, không nội dung.
-- `dieu_kien`: điều kiện → nghĩa vụ; `ap_dung_cho`: nghĩa vụ → chủ thể; `ngoai_le_*`: ngoại lệ → nghĩa vụ.
drop view if exists public.canh_dieu_kien_nghia_vu;
create view public.canh_dieu_kien_nghia_vu
with (security_invoker = false) as
  select r.target_entity_id   as hanh_vi_id,
         r.source_entity_id   as entity_id,
         r.loai_relationship  as loai_canh,
         e.trang_thai_duyet   as entity_trang_thai_duyet,
         r.id                 as canh_id,
         r.trang_thai_duyet   as canh_trang_thai_duyet,
         r.chi_mot_phan
    from public.entity_relationships r
    join public.entities hv on hv.id = r.target_entity_id
    join public.entities e  on e.id = r.source_entity_id
   where r.loai_relationship::text in ('dieu_kien', 'ngoai_le_bac_bo', 'ngoai_le_thay_the')
     and hv.loai_entity = 'hanh_vi' and hv.trang_thai_duyet = 'da_duyet'
  union all
  select r.source_entity_id, r.target_entity_id, r.loai_relationship, e.trang_thai_duyet,
         r.id, r.trang_thai_duyet, r.chi_mot_phan
    from public.entity_relationships r
    join public.entities hv on hv.id = r.source_entity_id
    join public.entities e  on e.id = r.target_entity_id
   where r.loai_relationship = 'ap_dung_cho'
     and hv.loai_entity = 'hanh_vi' and hv.trang_thai_duyet = 'da_duyet';

comment on view public.canh_dieu_kien_nghia_vu is
  'SECURITY DEFINER có chủ đích: S9 thấy cùng tập cạnh bất kể ai gọi. Chỉ id + trạng thái + cờ, không nội dung. 007, dựng lại ở 008.';

revoke all on table public.canh_dieu_kien_nghia_vu from anon, authenticated;
grant select on table public.canh_dieu_kien_nghia_vu to authenticated, service_role;

commit;
