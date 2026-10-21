-- =====================================================================
-- 005 — duyệt chu_the bắt buộc chọn rõ phạm vi + approve_chunk bỏ qua entity thiếu điều kiện.
-- Chạy SAU 004_loai_van_ban.sql. Idempotent.
--
-- Lỗi gốc (19/10): "Duyệt tất cả còn lại" duyệt chu_the "Công ty chứng khoán" không có dieu_kien_may_doc
-- → mọi hanh_vi nối tới nó áp dụng cho MỌI doanh nghiệp, không ai thấy.
--   - dieu_kien / nguong: vẫn bắt buộc dieu_kien_may_doc (như 002).
--   - chu_the: hoặc có dieu_kien_may_doc, hoặc curator xác nhận rõ "chủ thể chung — áp dụng mọi doanh nghiệp"
--     (p_ap_dung_moi_doanh_nghiep = true, ghi vào approvals). Chủ thể chung có thật (vd "Người nộp thuế"
--     của Luật Quản lý thuế) nên không chặn cứng — chỉ không cho duyệt mà không nghĩ tới.
--   - approve_chunk: bỏ qua (để cho_duyet) mọi entity cần điều kiện mà chưa có, thay vì báo lỗi cả chunk
--     hoặc duyệt luôn. Curator xử lý riêng từng cái.
-- =====================================================================

drop function if exists public.approve_entity(uuid, public.trang_thai_duyet, text);

create or replace function public.approve_entity(
  p_entity_id                uuid,
  p_quyet_dinh               public.trang_thai_duyet,
  p_ghi_chu                  text default null,
  p_ap_dung_moi_doanh_nghiep boolean default false
)
returns public.entities
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_entity public.entities;
  v_ghi_chu text := p_ghi_chu;
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
  if p_quyet_dinh = 'da_duyet' and exists (
       select 1 from public.entities
        where id = p_entity_id and loai_entity in ('dieu_kien', 'nguong') and dieu_kien_may_doc is null) then
    raise exception 'Entity điều kiện/ngưỡng phải có dieu_kien_may_doc trước khi duyệt' using errcode = 'PT400';
  end if;
  if p_quyet_dinh = 'da_duyet' and exists (
       select 1 from public.entities
        where id = p_entity_id and loai_entity = 'chu_the' and dieu_kien_may_doc is null) then
    if not p_ap_dung_moi_doanh_nghiep then
      raise exception 'Chủ thể chưa có dieu_kien_may_doc: điền điều kiện, hoặc xác nhận đây là chủ thể chung áp dụng mọi doanh nghiệp'
        using errcode = 'PT400';
    end if;
    v_ghi_chu := '[Chủ thể chung — áp dụng mọi doanh nghiệp] ' || coalesce(p_ghi_chu, '');
  end if;

  perform set_config('nexora.duyet_boi_nguoi', 'on', true);

  -- WHERE trang_thai_duyet = 'cho_duyet' = khóa concurrent (xem đầu 002)
  update public.entities
     set trang_thai_duyet = p_quyet_dinh,
         curator_id       = auth.uid(),
         ghi_chu_curator  = coalesce(v_ghi_chu, ghi_chu_curator)
   where id = p_entity_id
     and trang_thai_duyet = 'cho_duyet'
  returning * into v_entity;

  perform set_config('nexora.duyet_boi_nguoi', 'off', true);

  if v_entity.id is null then
    if exists (select 1 from public.entities where id = p_entity_id) then
      raise exception 'Entity không còn ở trạng thái cho_duyet' using errcode = 'PT409';
    end if;
    raise exception 'Không tìm thấy entity' using errcode = 'PT404';
  end if;

  insert into public.approvals (entity_id, nguoi_duyet_id, quyet_dinh, ghi_chu)
  values (v_entity.id, auth.uid(), p_quyet_dinh, v_ghi_chu);

  perform public.cap_nhat_trang_thai_chunk(v_entity.chunk_id);
  return v_entity;
end;
$$;

revoke all on function public.approve_entity(uuid, public.trang_thai_duyet, text, boolean) from public, anon;
grant execute on function public.approve_entity(uuid, public.trang_thai_duyet, text, boolean) to authenticated;


-- Duyệt hàng loạt: chỉ duyệt entity KHÔNG cần điều kiện hoặc đã có điều kiện. Trả về số entity đã duyệt;
-- entity bị bỏ qua vẫn cho_duyet (đếm ở ner_extraction_summary.so_can_dieu_kien).
create or replace function public.approve_chunk(
  p_chunk_id uuid,
  p_ghi_chu  text default null
)
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
    update public.entities
       set trang_thai_duyet = 'da_duyet',
           curator_id       = auth.uid()
     where chunk_id = p_chunk_id
       and trang_thai_duyet = 'cho_duyet'
       and not (loai_entity in ('dieu_kien', 'nguong', 'chu_the') and dieu_kien_may_doc is null)
    returning id
  ), log as (
    insert into public.approvals (entity_id, nguoi_duyet_id, quyet_dinh, ghi_chu)
    select id, auth.uid(), 'da_duyet', p_ghi_chu from duyet
    returning 1
  )
  select count(*) into v_count from log;

  perform set_config('nexora.duyet_boi_nguoi', 'off', true);
  perform public.cap_nhat_trang_thai_chunk(p_chunk_id);
  return v_count;
end;
$$;


-- Thêm cột cuối (create or replace view chỉ cho thêm cột ở cuối): số entity cho_duyet mà
-- "Duyệt tất cả" sẽ bỏ qua — dieu_kien/nguong/chu_the chưa có dieu_kien_may_doc.
create or replace view public.ner_extraction_summary with (security_invoker = true) as
select
  c.id          as chunk_id,
  c.van_ban_id,
  v.so_hieu,
  c.thu_tu,
  c.dieu_khoan_range,
  c.trang_thai  as trang_thai_chunk,
  count(e.id)                                                as so_entity,
  count(e.id) filter (where e.trang_thai_duyet = 'cho_duyet') as so_cho_duyet,
  count(e.id) filter (where e.trang_thai_duyet = 'da_duyet')  as so_da_duyet,
  count(e.id) filter (where e.trang_thai_duyet = 'tu_choi')   as so_tu_choi,
  count(e.id) filter (where e.trang_thai_duyet = 'cho_duyet' and e.loai_entity in ('dieu_kien', 'nguong')
                        and e.dieu_kien_may_doc is null)      as so_dieu_kien_chua_may_doc,
  coalesce((select jsonb_object_agg(x.loai_entity, x.n)
              from (select loai_entity, count(*) n from public.entities where chunk_id = c.id group by loai_entity) x),
           '{}'::jsonb)                                       as theo_loai,
  (select count(*) from public.entity_relationships r where r.chunk_id = c.id)                               as so_relationship,
  (select count(*) from public.entity_relationships r where r.chunk_id = c.id and r.target_entity_id is null) as so_pending_link,
  count(e.id) filter (where e.trang_thai_duyet = 'cho_duyet' and e.loai_entity in ('dieu_kien', 'nguong', 'chu_the')
                        and e.dieu_kien_may_doc is null)      as so_can_dieu_kien
from public.van_ban_chunks c
join public.van_ban v on v.id = c.van_ban_id
left join public.entities e on e.chunk_id = c.id
group by c.id, v.so_hieu;


-- quy_mo là cột customers.quy_mo — đăng ký vào từ điển để curator viết được điều kiện
-- {"thuoc_tinh":"quy_mo",...}; rule engine đọc giá trị từ cột (lib/pipeline/ruleEngine.ts), giống nganh.
insert into public.thuoc_tinh_ho_so (ma, cau_hoi, kieu, domain, lua_chon, don_vi, mo_ta) values
  ('quy_mo', 'Quy mô doanh nghiệp?', 'text', null, array['nho', 'vua', 'lon'], null,
   'Giá trị lấy từ cột customers.quy_mo — rule engine tự đọc, form onboarding hỏi ở field Quy mô riêng nên không render lại câu này.')
on conflict (ma) do nothing;
