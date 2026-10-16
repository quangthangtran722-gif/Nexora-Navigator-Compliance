-- =====================================================================
-- Nexora Compliance Navigator — schema.sql (Bước 2: Data modeling)
--
-- Chạy 1 lần trên project Supabase mới (SQL Editor → paste → Run).
-- Nguồn: CLAUDE.md mục 3, 4, 10. Tên field giữ đúng snake_case trong CLAUDE.md.
--
-- ---------------------------------------------------------------------
-- MÔ HÌNH PHÂN QUYỀN (đọc trước khi sửa RLS)
-- ---------------------------------------------------------------------
-- Không thêm bảng user riêng. Vai trò + tenant nằm trong app_metadata của
-- auth.users — chỉ service role sửa được, người dùng KHÔNG tự sửa được:
--   { "nexora_role": "curator" }                           → curator Nexora
--   { "nexora_role": "customer", "customer_id": "<uuid>" } → người đầu mối của 1 khách hàng
-- Đổi app_metadata xong phải đăng nhập lại (refresh token) thì JWT mới có claim mới.
--
-- ---------------------------------------------------------------------
-- CONCURRENT: 2 curator cùng duyệt 1 thẻ trong 1 giây → ai thắng?
-- ---------------------------------------------------------------------
-- Người có UPDATE chạm vào row TRƯỚC thắng; người sau nhận 409.
-- approve_card()/approve_task() chạy:
--     UPDATE ... SET trang_thai_duyet = ... WHERE id = $1 AND trang_thai_duyet = 'Chờ duyệt'
-- Ở mức READ COMMITTED, UPDATE thứ 2 phải chờ row lock của UPDATE thứ 1. Khi thứ 1
-- commit, Postgres đánh giá lại WHERE trên bản row mới → trang_thai_duyet đã khác
-- 'Chờ duyệt' → 0 row → function raise PT409 → PostgREST/API trả HTTP 409.
-- Kết quả: chỉ đúng 1 lần chuyển trạng thái, chỉ đúng 1 dòng approvals được ghi.
-- Chốt chặn thứ 2: trigger guard_trang_thai_duyet chặn mọi UPDATE đổi trạng thái
-- khi trạng thái cũ không còn là 'Chờ duyệt' (kể cả UPDATE viết tay ngoài function).
--
-- ---------------------------------------------------------------------
-- MÃ LỖI: dùng SQLSTATE dạng PTxxx → PostgREST tự trả đúng HTTP status xxx.
-- ---------------------------------------------------------------------
--
-- Reset toàn bộ (XÓA HẾT DỮ LIỆU) — chỉ bỏ comment khi thật sự cần chạy lại từ đầu:
-- drop table if exists public.notifications, public.pipeline_runs, public.approvals,
--   public.tasks, public.customer_profiles, public.cards, public.customers cascade;
-- drop function if exists public.approve_card, public.approve_task, public.guard_trang_thai_duyet,
--   public.khoa_card_da_xu_ly, public.khoa_task_da_xu_ly, public.thong_bao_task_moi,
--   public.set_updated_at, public.current_customer_id, public.is_curator cascade;
-- drop type if exists public.trang_thai_duyet, public.trang_thai_hieu_luc,
--   public.trang_thai_ap_dung, public.buoc_pipeline cascade;
-- =====================================================================


-- =====================================================================
-- 1. ENUM
-- =====================================================================

create type public.trang_thai_duyet as enum ('Chờ duyệt', 'Đã duyệt', 'Từ chối');
create type public.trang_thai_hieu_luc as enum ('Sắp áp dụng', 'Đang áp dụng', 'Hết hiệu lực');
-- 4 trạng thái output của rule engine (CLAUDE.md mục 5)
create type public.trang_thai_ap_dung as enum ('Áp dụng', 'Sắp áp dụng', 'Không áp dụng', 'Chưa đủ thông tin');
create type public.buoc_pipeline as enum ('extract', 'filter', 'rewrite');


-- =====================================================================
-- 2. HELPER đọc JWT (dùng trong RLS + function duyệt)
-- =====================================================================

create or replace function public.current_customer_id()
returns uuid
language sql stable
set search_path = ''
as $$
  select nullif(auth.jwt() -> 'app_metadata' ->> 'customer_id', '')::uuid
$$;

create or replace function public.is_curator()
returns boolean
language sql stable
set search_path = ''
as $$
  select coalesce(auth.jwt() -> 'app_metadata' ->> 'nexora_role' = 'curator', false)
$$;


-- =====================================================================
-- 3. BẢNG
-- =====================================================================

-- customers — công ty khách hàng (tenant). Mọi dữ liệu riêng của khách hàng
-- đều trỏ về đây qua customer_id; RLS tách quyền theo cột này.
create table public.customers (
  id          uuid primary key default gen_random_uuid(),
  ten_cong_ty text not null,
  created_at  timestamptz not null default now()
);
comment on table public.customers is
  'Công ty khách hàng (tenant). RLS: mỗi khách hàng chỉ thấy row của chính mình.';


-- cards — kho thẻ nghĩa vụ dùng chung cho MỌI khách hàng (CLAUDE.md mục 4).
-- AI chỉ tạo draft 'Chờ duyệt'; chỉ approve_card() (curator là người thật) mới chuyển trạng thái.
create table public.cards (
  id                  uuid primary key default gen_random_uuid(),
  noi_dung_goc        text not null,
  dieu_khoan          text not null,
  cum_phap_ly         text not null,
  dieu_kien_ap_dung   jsonb not null default '{}'::jsonb,
  noi_dung_viet_lai   text,
  ngay_co_hieu_luc    date,
  trang_thai_hieu_luc public.trang_thai_hieu_luc not null,
  thay_the_boi        uuid references public.cards (id) on delete set null,
  trang_thai_duyet    public.trang_thai_duyet not null default 'Chờ duyệt',
  curator_id          uuid references auth.users (id) on delete set null,
  created_at          timestamptz not null default now(),

  constraint cards_dieu_kien_la_object check (jsonb_typeof(dieu_kien_ap_dung) = 'object'),
  -- rule engine cần ngày hiệu lực để phân biệt 'Áp dụng' / 'Sắp áp dụng'
  constraint cards_da_duyet_co_ngay_hieu_luc check (trang_thai_duyet <> 'Đã duyệt' or ngay_co_hieu_luc is not null),
  constraint cards_khong_tu_thay_the check (thay_the_boi is distinct from id)
);
comment on table public.cards is
  'Kho thẻ nghĩa vụ dùng chung. Draft từ AI (extractCard) → curator duyệt qua approve_card() → rule engine mới đọc.';
comment on column public.cards.dieu_kien_ap_dung is
  'Điều kiện rule engine (filterApplicability.ts, KHÔNG gọi AI) so khớp với customer_profiles. '
  'Object phẳng, mỗi key = tên thuộc tính trong nhom_a/nhom_b/nhom_c. '
  'boolean → profile phải bằng đúng giá trị; mảng string → giá trị profile phải nằm trong mảng; '
  'null/bỏ key → không ràng buộc; {} → áp dụng mọi khách hàng. Các key nối bằng AND. '
  'Ví dụ: {"chuyen_du_lieu_ra_nuoc_ngoai": true, "nganh": ["y_te", "tai_chinh"]}. Chi tiết: docs/api-contract.md.';
comment on column public.cards.thay_the_boi is
  'Trỏ tới thẻ mới khi điều luật này bị thay thế. Thẻ đã duyệt không sửa nội dung — tạo thẻ mới rồi trỏ vào đây.';


-- customer_profiles — câu trả lời onboarding, 4 nhóm A–D (CLAUDE.md mục 6).
-- Mỗi nhóm là jsonb để thêm cụm luật mới chỉ cần thêm key, không phải migrate lại.
create table public.customer_profiles (
  id          uuid primary key default gen_random_uuid(),
  customer_id uuid not null unique references public.customers (id) on delete cascade,
  nhom_a      jsonb not null default '{}'::jsonb,  -- A. Định danh: ten_cong_ty, nganh, quy_mo_nhan_su
  nhom_b      jsonb not null default '{}'::jsonb,  -- B. Dữ liệu xử lý (gatekeeper): xu_ly_du_lieu_nhay_cam, chuyen_du_lieu_ra_nuoc_ngoai, ...
  nhom_c      jsonb not null default '{}'::jsonb,  -- C. Hạ tầng & bên thứ ba: vi_tri_server, dich_vu_cloud, ...
  nhom_d      jsonb not null default '{}'::jsonb,  -- D. Cơ cấu tổ chức: {"phong_ban": [{"ma", "ten", "nguoi_dau_moi", "email"}]}
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),

  constraint profiles_nhom_la_object check (
    jsonb_typeof(nhom_a) = 'object' and jsonb_typeof(nhom_b) = 'object'
    and jsonb_typeof(nhom_c) = 'object' and jsonb_typeof(nhom_d) = 'object'
  )
);
comment on table public.customer_profiles is
  'Hồ sơ onboarding 1-1 với customers. Rule engine gộp phẳng nhom_a + nhom_b + nhom_c để so khớp; '
  'nhom_d chỉ dùng route task xuống phòng ban. Key thiếu hoặc null (= "Chưa chắc") → "Chưa đủ thông tin".';


-- tasks — nghĩa vụ đã viết lại cho 1 khách hàng (1 card + 1 customer).
-- AI (rewriteTask) tạo draft 'Chờ duyệt'; chỉ người đầu mối của khách hàng duyệt qua approve_task().
create table public.tasks (
  id                 uuid primary key default gen_random_uuid(),
  card_id            uuid not null references public.cards (id) on delete restrict,
  customer_id        uuid not null references public.customers (id) on delete cascade,
  trang_thai_ap_dung public.trang_thai_ap_dung not null,
  noi_dung_task      text not null,
  phong_ban          text,  -- = nhom_d.phong_ban[].ma; bắt buộc khi duyệt
  trang_thai_duyet   public.trang_thai_duyet not null default 'Chờ duyệt',
  nguoi_duyet_id     uuid references auth.users (id) on delete set null,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),

  -- quét lại nhiều lần / 2 lần quét chạy song song không tạo task trùng → dùng ON CONFLICT DO NOTHING
  constraint tasks_mot_task_moi_card unique (customer_id, card_id),
  constraint tasks_chi_tao_khi_ap_dung check (trang_thai_ap_dung in ('Áp dụng', 'Sắp áp dụng')),
  constraint tasks_da_duyet_co_phong_ban check (trang_thai_duyet <> 'Đã duyệt' or phong_ban is not null)
);
comment on table public.tasks is
  'Task viết lại từ 1 card cho 1 customer. Draft AI → người đầu mối duyệt (approve_task) → giao phòng ban.';


-- approvals — log ai duyệt gì, lúc nào (cả curator duyệt card và đầu mối duyệt task).
-- Chỉ approve_card()/approve_task() được ghi; client không insert/sửa/xóa trực tiếp.
create table public.approvals (
  id             uuid primary key default gen_random_uuid(),
  card_id        uuid references public.cards (id),
  task_id        uuid references public.tasks (id) on delete cascade,
  customer_id    uuid references public.customers (id) on delete cascade,  -- null khi duyệt card (kho chung)
  nguoi_duyet_id uuid not null references auth.users (id),
  quyet_dinh     public.trang_thai_duyet not null,
  ghi_chu        text,
  created_at     timestamptz not null default now(),

  constraint approvals_dung_mot_doi_tuong check ((card_id is not null)::int + (task_id is not null)::int = 1),
  constraint approvals_task_co_customer check (task_id is null or customer_id is not null),
  constraint approvals_quyet_dinh_hop_le check (quyet_dinh <> 'Chờ duyệt')
);
comment on table public.approvals is
  'Audit log hành động duyệt của con người. Append-only, chỉ ghi qua approve_card()/approve_task().';


-- pipeline_runs — log MỌI lần chạy pipeline (CLAUDE.md mục 3.5). Append-only.
-- Constraint pipeline_runs_rule_engine_khong_ai: bước filter KHÔNG được có model
-- (rule engine thuần code), bước extract/rewrite BẮT BUỘC ghi model AI đã dùng.
create table public.pipeline_runs (
  id            uuid primary key default gen_random_uuid(),
  buoc          public.buoc_pipeline not null,
  customer_id   uuid references public.customers (id) on delete cascade,  -- null với extract (kho chung)
  card_id       uuid references public.cards (id) on delete set null,
  input         jsonb not null,
  output        jsonb,
  model         text,
  thanh_cong    boolean not null default true,
  loi           text,
  thoi_gian_ms  integer,
  nguoi_chay_id uuid default auth.uid() references auth.users (id) on delete set null,
  created_at    timestamptz not null default now(),

  constraint pipeline_runs_rule_engine_khong_ai check ((buoc = 'filter') = (model is null)),
  constraint pipeline_runs_extract_khong_customer check (buoc <> 'extract' or customer_id is null),
  constraint pipeline_runs_loi_khi_that_bai check (thanh_cong or loi is not null)
);
comment on table public.pipeline_runs is
  'Log minh bạch mọi lần chạy extract/filter/rewrite: input, output, model, thời điểm. Dùng audit + demo mentor.';


-- notifications — thông báo in-app, 2 giai đoạn (CLAUDE.md mục 9):
--   cho_duyet: báo người đầu mối có task chờ duyệt (phong_ban = null)
--   da_giao:   báo phòng ban có task mới sau khi đầu mối duyệt (phong_ban = mã phòng)
-- Chỉ hệ thống (trigger/function) tạo; client chỉ được đánh dấu đã đọc.
create table public.notifications (
  id          uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers (id) on delete cascade,
  task_id     uuid references public.tasks (id) on delete cascade,
  giai_doan   text not null,
  phong_ban   text,
  tieu_de     text not null,
  noi_dung    text,
  da_doc      boolean not null default false,
  created_at  timestamptz not null default now(),

  constraint notifications_giai_doan_hop_le check (giai_doan in ('cho_duyet', 'da_giao')),
  constraint notifications_phong_ban_theo_giai_doan check ((giai_doan = 'da_giao') = (phong_ban is not null))
);
comment on table public.notifications is
  'Thông báo in-app 2 giai đoạn: cho_duyet (đầu mối) → da_giao (phòng ban).';


-- Postgres không tự index foreign key
create index cards_trang_thai_duyet_idx on public.cards (trang_thai_duyet);
create index cards_cum_phap_ly_idx on public.cards (cum_phap_ly);
create index tasks_customer_id_idx on public.tasks (customer_id, trang_thai_duyet);
create index tasks_card_id_idx on public.tasks (card_id);
create index approvals_card_id_idx on public.approvals (card_id);
create index approvals_task_id_idx on public.approvals (task_id);
create index approvals_customer_id_idx on public.approvals (customer_id);
create index pipeline_runs_customer_id_idx on public.pipeline_runs (customer_id, created_at desc);
create index pipeline_runs_buoc_idx on public.pipeline_runs (buoc, created_at desc);
create index notifications_customer_id_idx on public.notifications (customer_id, da_doc, created_at desc);


-- =====================================================================
-- 4. TRIGGER
-- =====================================================================

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger customer_profiles_updated_at before update on public.customer_profiles
  for each row execute function public.set_updated_at();
create trigger tasks_updated_at before update on public.tasks
  for each row execute function public.set_updated_at();


-- Ranh giới an toàn CLAUDE.md mục 3.3–3.4, ép ở tầng DB cho cả cards và tasks:
--   - INSERT: bản ghi mới luôn là 'Chờ duyệt' (output AI chỉ là draft).
--   - UPDATE: chỉ đổi trạng thái khi đang 'Chờ duyệt', và chỉ qua approve_card()/approve_task()
--     (function bật cờ nexora.duyet_boi_nguoi trong transaction của chính nó; mỗi request
--     PostgREST là 1 transaction riêng nên client không tự bật cờ được).
--   - Ngoại lệ duy nhất: seed.sql bật cờ nexora.seed để chèn thẻ mẫu 'Đã duyệt'.
create or replace function public.guard_trang_thai_duyet()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if coalesce(current_setting('nexora.seed', true), '') = 'on' then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if new.trang_thai_duyet <> 'Chờ duyệt' then
      raise exception 'Bản ghi mới phải ở trạng thái "Chờ duyệt" — output AI chỉ là draft chờ người duyệt'
        using errcode = 'PT403';
    end if;
    return new;
  end if;

  if new.trang_thai_duyet is distinct from old.trang_thai_duyet then
    if old.trang_thai_duyet <> 'Chờ duyệt' then
      raise exception 'Đã được xử lý trước đó (%), không thể đổi trạng thái', old.trang_thai_duyet
        using errcode = 'PT409';
    end if;
    if coalesce(current_setting('nexora.duyet_boi_nguoi', true), '') <> 'on' then
      raise exception 'Chỉ được đổi trang_thai_duyet qua approve_card() / approve_task()'
        using errcode = 'PT403';
    end if;
  end if;
  return new;
end;
$$;

create trigger cards_guard_trang_thai_duyet before insert or update on public.cards
  for each row execute function public.guard_trang_thai_duyet();
create trigger tasks_guard_trang_thai_duyet before insert or update on public.tasks
  for each row execute function public.guard_trang_thai_duyet();


-- Thẻ đã duyệt/từ chối thì khóa nội dung: sửa luật = tạo thẻ mới + trỏ thay_the_boi,
-- để thẻ mới cũng phải qua curator duyệt. Chỉ còn được cập nhật trang_thai_hieu_luc, thay_the_boi.
create or replace function public.khoa_card_da_xu_ly()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.trang_thai_duyet <> 'Chờ duyệt' and (
       new.noi_dung_goc, new.dieu_khoan, new.cum_phap_ly, new.dieu_kien_ap_dung,
       new.noi_dung_viet_lai, new.ngay_co_hieu_luc, new.curator_id
     ) is distinct from (
       old.noi_dung_goc, old.dieu_khoan, old.cum_phap_ly, old.dieu_kien_ap_dung,
       old.noi_dung_viet_lai, old.ngay_co_hieu_luc, old.curator_id
     ) then
    raise exception 'Thẻ đã xử lý, không sửa nội dung — tạo thẻ mới và trỏ thay_the_boi'
      using errcode = 'PT409';
  end if;
  return new;
end;
$$;

create trigger cards_khoa_noi_dung before update on public.cards
  for each row execute function public.khoa_card_da_xu_ly();


-- Task đã duyệt/từ chối thì khóa nội dung; card_id/customer_id không bao giờ được đổi.
create or replace function public.khoa_task_da_xu_ly()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (new.card_id, new.customer_id) is distinct from (old.card_id, old.customer_id) then
    raise exception 'Không được đổi card_id/customer_id của task' using errcode = 'PT403';
  end if;
  if old.trang_thai_duyet <> 'Chờ duyệt' and (
       new.noi_dung_task, new.phong_ban, new.trang_thai_ap_dung, new.nguoi_duyet_id
     ) is distinct from (
       old.noi_dung_task, old.phong_ban, old.trang_thai_ap_dung, old.nguoi_duyet_id
     ) then
    raise exception 'Task đã xử lý, không sửa nội dung' using errcode = 'PT409';
  end if;
  return new;
end;
$$;

create trigger tasks_khoa_noi_dung before update on public.tasks
  for each row execute function public.khoa_task_da_xu_ly();


-- Thông báo giai đoạn 1: task mới → báo người đầu mối (CLAUDE.md mục 9).
-- security definer vì client không có quyền insert notifications.
create or replace function public.thong_bao_task_moi()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.notifications (customer_id, task_id, giai_doan, tieu_de, noi_dung)
  values (new.customer_id, new.id, 'cho_duyet', 'Có nghĩa vụ mới chờ bạn duyệt', left(new.noi_dung_task, 200));
  return null;
end;
$$;

create trigger tasks_thong_bao_moi after insert on public.tasks
  for each row execute function public.thong_bao_task_moi();


-- =====================================================================
-- 5. FUNCTION DUYỆT — cửa DUY NHẤT để đổi trang_thai_duyet
-- Gọi từ API route bằng client mang JWT của người dùng: supabase.rpc('approve_card', ...).
-- Bắt buộc auth.uid() là người thật đang đăng nhập — service role (không có user) bị từ chối,
-- nên không có đường nào để hệ thống tự duyệt (CLAUDE.md mục 3.4).
-- =====================================================================

create or replace function public.approve_card(
  p_card_id    uuid,
  p_quyet_dinh public.trang_thai_duyet,
  p_ghi_chu    text default null
)
returns public.cards
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_card public.cards;
begin
  if auth.uid() is null then
    raise exception 'Cần curator đăng nhập để duyệt thẻ' using errcode = 'PT401';
  end if;
  if not public.is_curator() then
    raise exception 'Chỉ curator được duyệt thẻ' using errcode = 'PT403';
  end if;
  if p_quyet_dinh = 'Chờ duyệt' then
    raise exception 'Quyết định phải là "Đã duyệt" hoặc "Từ chối"' using errcode = 'PT400';
  end if;

  perform set_config('nexora.duyet_boi_nguoi', 'on', true);

  -- WHERE trang_thai_duyet = 'Chờ duyệt' = khóa concurrent (xem đầu file)
  update public.cards
     set trang_thai_duyet = p_quyet_dinh,
         curator_id       = auth.uid()
   where id = p_card_id
     and trang_thai_duyet = 'Chờ duyệt'
  returning * into v_card;

  if not found then
    perform set_config('nexora.duyet_boi_nguoi', 'off', true);
    if exists (select 1 from public.cards where id = p_card_id) then
      raise exception 'Thẻ không còn ở trạng thái "Chờ duyệt"' using errcode = 'PT409';
    end if;
    raise exception 'Không tìm thấy thẻ' using errcode = 'PT404';
  end if;

  perform set_config('nexora.duyet_boi_nguoi', 'off', true);

  insert into public.approvals (card_id, nguoi_duyet_id, quyet_dinh, ghi_chu)
  values (v_card.id, auth.uid(), p_quyet_dinh, p_ghi_chu);

  return v_card;
end;
$$;


create or replace function public.approve_task(
  p_task_id    uuid,
  p_quyet_dinh public.trang_thai_duyet,
  p_phong_ban  text default null,
  p_ghi_chu    text default null
)
returns public.tasks
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_customer_id uuid := public.current_customer_id();
  v_task        public.tasks;
begin
  if auth.uid() is null then
    raise exception 'Cần người đầu mối đăng nhập để duyệt task' using errcode = 'PT401';
  end if;
  -- curator không có customer_id → không duyệt được task của khách hàng
  if v_customer_id is null then
    raise exception 'Chỉ người đầu mối của khách hàng được duyệt task' using errcode = 'PT403';
  end if;
  if p_quyet_dinh = 'Chờ duyệt' then
    raise exception 'Quyết định phải là "Đã duyệt" hoặc "Từ chối"' using errcode = 'PT400';
  end if;
  -- không phân biệt "không tồn tại" và "của khách hàng khác" để không lộ dữ liệu
  if not exists (select 1 from public.tasks where id = p_task_id and customer_id = v_customer_id) then
    raise exception 'Không tìm thấy task' using errcode = 'PT404';
  end if;
  if p_quyet_dinh = 'Đã duyệt' and not exists (
       select 1
         from public.customer_profiles cp,
              jsonb_array_elements(coalesce(cp.nhom_d -> 'phong_ban', '[]'::jsonb)) pb
        where cp.customer_id = v_customer_id
          and pb ->> 'ma' = p_phong_ban
     ) then
    raise exception 'Phải chọn phòng ban có trong hồ sơ (nhóm D) khi duyệt task' using errcode = 'PT400';
  end if;

  perform set_config('nexora.duyet_boi_nguoi', 'on', true);

  -- WHERE trang_thai_duyet = 'Chờ duyệt' = khóa concurrent; customer_id = tách tenant
  update public.tasks
     set trang_thai_duyet = p_quyet_dinh,
         nguoi_duyet_id   = auth.uid(),
         phong_ban        = coalesce(p_phong_ban, phong_ban)
   where id = p_task_id
     and customer_id = v_customer_id
     and trang_thai_duyet = 'Chờ duyệt'
  returning * into v_task;

  if not found then
    perform set_config('nexora.duyet_boi_nguoi', 'off', true);
    raise exception 'Task không còn ở trạng thái "Chờ duyệt"' using errcode = 'PT409';
  end if;

  perform set_config('nexora.duyet_boi_nguoi', 'off', true);

  insert into public.approvals (task_id, customer_id, nguoi_duyet_id, quyet_dinh, ghi_chu)
  values (v_task.id, v_task.customer_id, auth.uid(), p_quyet_dinh, p_ghi_chu);

  -- Thông báo giai đoạn 2: đầu mối duyệt xong → báo phòng ban
  if p_quyet_dinh = 'Đã duyệt' then
    insert into public.notifications (customer_id, task_id, giai_doan, phong_ban, tieu_de, noi_dung)
    values (v_task.customer_id, v_task.id, 'da_giao', v_task.phong_ban,
            'Phòng ban có nghĩa vụ mới được giao', left(v_task.noi_dung_task, 200));
  end if;

  return v_task;
end;
$$;


-- =====================================================================
-- 6. ROW LEVEL SECURITY
-- Mỗi khách hàng chỉ thấy data có customer_id = customer_id trong JWT.
-- Curator: quản lý kho thẻ + đọc hồ sơ/task mọi khách hàng để chạy "Quét lại khách
-- hàng hiện có" (CLAUDE.md mục 8), nhưng KHÔNG duyệt được task (approve_task chặn).
-- Không có policy = bị chặn. Không bảng nào có policy DELETE.
-- =====================================================================

alter table public.customers         enable row level security;
alter table public.cards             enable row level security;
alter table public.customer_profiles enable row level security;
alter table public.tasks             enable row level security;
alter table public.approvals         enable row level security;
alter table public.pipeline_runs     enable row level security;
alter table public.notifications     enable row level security;

-- customers
create policy customers_select on public.customers for select to authenticated
  using (id = (select public.current_customer_id()) or (select public.is_curator()));
create policy customers_insert on public.customers for insert to authenticated
  with check ((select public.is_curator()));
create policy customers_update on public.customers for update to authenticated
  using (id = (select public.current_customer_id()) or (select public.is_curator()))
  with check (id = (select public.current_customer_id()) or (select public.is_curator()));

-- cards: khách hàng chỉ đọc thẻ đã duyệt; curator đọc/tạo/sửa tất cả
create policy cards_select on public.cards for select to authenticated
  using (trang_thai_duyet = 'Đã duyệt' or (select public.is_curator()));
create policy cards_insert on public.cards for insert to authenticated
  with check ((select public.is_curator()));
create policy cards_update on public.cards for update to authenticated
  using ((select public.is_curator()))
  with check ((select public.is_curator()));

-- customer_profiles: khách hàng tự quản lý hồ sơ của mình; curator chỉ đọc (để quét lại)
create policy profiles_select on public.customer_profiles for select to authenticated
  using (customer_id = (select public.current_customer_id()) or (select public.is_curator()));
create policy profiles_insert on public.customer_profiles for insert to authenticated
  with check (customer_id = (select public.current_customer_id()));
create policy profiles_update on public.customer_profiles for update to authenticated
  using (customer_id = (select public.current_customer_id()))
  with check (customer_id = (select public.current_customer_id()));

-- tasks: khách hàng đọc/tạo/sửa draft của mình; curator đọc + tạo draft khi quét lại
create policy tasks_select on public.tasks for select to authenticated
  using (customer_id = (select public.current_customer_id()) or (select public.is_curator()));
create policy tasks_insert on public.tasks for insert to authenticated
  with check (customer_id = (select public.current_customer_id()) or (select public.is_curator()));
create policy tasks_update on public.tasks for update to authenticated
  using (customer_id = (select public.current_customer_id()))
  with check (customer_id = (select public.current_customer_id()));

-- approvals: chỉ đọc; ghi qua approve_card()/approve_task()
create policy approvals_select on public.approvals for select to authenticated
  using (customer_id = (select public.current_customer_id()) or (select public.is_curator()));

-- pipeline_runs: append-only; khách hàng chỉ log filter/rewrite của chính mình
create policy pipeline_runs_select on public.pipeline_runs for select to authenticated
  using (customer_id = (select public.current_customer_id()) or (select public.is_curator()));
create policy pipeline_runs_insert on public.pipeline_runs for insert to authenticated
  with check (
    nguoi_chay_id = (select auth.uid())
    and (
      (select public.is_curator())
      or (customer_id = (select public.current_customer_id()) and buoc <> 'extract')
    )
  );

-- notifications: chỉ đọc + đánh dấu đã đọc; tạo bởi trigger/function
create policy notifications_select on public.notifications for select to authenticated
  using (customer_id = (select public.current_customer_id()));
create policy notifications_update on public.notifications for update to authenticated
  using (customer_id = (select public.current_customer_id()))
  with check (customer_id = (select public.current_customer_id()));


-- =====================================================================
-- 7. GRANT — lớp bảo vệ thứ 2 bên cạnh RLS (giới hạn theo cột)
-- Function security definer chạy bằng quyền owner nên không bị ảnh hưởng.
-- =====================================================================

revoke all on public.customers, public.cards, public.customer_profiles, public.tasks,
  public.approvals, public.pipeline_runs, public.notifications from anon;

-- trang_thai_duyet / curator_id / nguoi_duyet_id chỉ đổi được qua function duyệt
revoke update on public.cards from authenticated;
grant update (noi_dung_goc, dieu_khoan, cum_phap_ly, dieu_kien_ap_dung, noi_dung_viet_lai,
              ngay_co_hieu_luc, trang_thai_hieu_luc, thay_the_boi)
  on public.cards to authenticated;

revoke update on public.tasks from authenticated;
grant update (noi_dung_task, phong_ban) on public.tasks to authenticated;

revoke update on public.notifications from authenticated;
grant update (da_doc) on public.notifications to authenticated;

revoke insert, update, delete on public.approvals from authenticated;
revoke insert on public.notifications from authenticated;
revoke update, delete on public.pipeline_runs from authenticated;
revoke delete on public.customers, public.cards, public.customer_profiles, public.tasks,
  public.notifications from authenticated;

revoke all on function public.approve_card(uuid, public.trang_thai_duyet, text) from public, anon;
revoke all on function public.approve_task(uuid, public.trang_thai_duyet, text, text) from public, anon;
grant execute on function public.approve_card(uuid, public.trang_thai_duyet, text) to authenticated;
grant execute on function public.approve_task(uuid, public.trang_thai_duyet, text, text) to authenticated;
