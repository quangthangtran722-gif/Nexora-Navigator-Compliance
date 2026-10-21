-- =====================================================================
-- 006 — doanh nghiệp tự đăng ký (BE-7, POST /api/onboard).
-- Chạy SAU 005_duyet_chu_the.sql. Idempotent.
--
-- Trước đây customers chỉ có từ seed: policy customers_insert chỉ cho curator, departments_insert chỉ cho
-- khách hàng ĐÃ gắn customer_id → tài khoản mới đăng ký không có đường nào tạo hồ sơ.
-- onboard_customer tạo customers + departments trong 1 transaction và (với tài khoản mới) gắn
-- app_metadata.customer_id để từ phiên đăng nhập sau RLS tách quyền như mọi khách hàng khác.
--   - curator: tạo hộ doanh nghiệp, không gắn tài khoản.
--   - tài khoản đã gắn doanh nghiệp: PT409 — sửa hồ sơ ở trang Onboarding, không tạo doanh nghiệp thứ 2.
-- Kiểm tra thuoc_tinh vẫn do trigger kiem_tra_thuoc_tinh_khach_hang (API kiểm tra trước để báo lỗi rõ hơn).
-- =====================================================================

alter table public.customers add column if not exists ma_so_thue text;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'customers_ma_so_thue_format') then
    -- 10 số (doanh nghiệp) hoặc 10 số + "-" + 3 số (chi nhánh)
    alter table public.customers
      add constraint customers_ma_so_thue_format check (ma_so_thue ~ '^[0-9]{10}(-[0-9]{3})?$');
  end if;
end $$;

create unique index if not exists customers_ma_so_thue_key on public.customers (ma_so_thue) where ma_so_thue is not null;
comment on column public.customers.ma_so_thue is 'Mã số thuế — 1 doanh nghiệp chỉ đăng ký 1 lần (unique).';


create or replace function public.onboard_customer(
  p_ten_cong_ty text,
  p_ma_so_thue  text,
  p_nganh       text,
  p_quy_mo      public.quy_mo,
  p_domains     text[],
  p_thuoc_tinh  jsonb,
  p_phong_ban   jsonb   -- [{ten_phong_ban, slug_phong_ban, email_head}]
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_curator boolean := public.is_curator();
  v_id      uuid;
begin
  if auth.uid() is null then
    raise exception 'Cần đăng nhập để đăng ký doanh nghiệp' using errcode = 'PT401';
  end if;
  -- Kiểm tra cả auth.users: JWT có thể cũ hơn lần gắn customer_id gần nhất
  if not v_curator and (public.current_customer_id() is not null or exists (
       select 1 from auth.users where id = auth.uid() and raw_app_meta_data ? 'customer_id')) then
    raise exception 'Tài khoản đã gắn với một doanh nghiệp — sửa hồ sơ ở trang Onboarding' using errcode = 'PT409';
  end if;
  if coalesce(jsonb_array_length(p_phong_ban), 0) = 0 then
    raise exception 'Cần ít nhất 1 phòng ban' using errcode = 'PT400';
  end if;

  insert into public.customers (ten_cong_ty, ma_so_thue, nganh, quy_mo, domains, thuoc_tinh)
  values (p_ten_cong_ty, p_ma_so_thue, p_nganh, p_quy_mo, coalesce(p_domains, '{}'), coalesce(p_thuoc_tinh, '{}'::jsonb))
  returning id into v_id;

  insert into public.departments (customer_id, ten_phong_ban, slug_phong_ban, email_head)
  select v_id, x.ten_phong_ban, x.slug_phong_ban, nullif(x.email_head, '')
    from jsonb_to_recordset(p_phong_ban) as x(ten_phong_ban text, slug_phong_ban public.slug_phong_ban, email_head text);

  if not v_curator then
    update auth.users
       set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb)
                               || jsonb_build_object('nexora_role', 'customer', 'customer_id', v_id)
     where id = auth.uid();
  end if;
  return v_id;
end;
$$;

revoke all on function public.onboard_customer(text, text, text, public.quy_mo, text[], jsonb, jsonb) from public, anon;
grant execute on function public.onboard_customer(text, text, text, public.quy_mo, text[], jsonb, jsonb) to authenticated;
