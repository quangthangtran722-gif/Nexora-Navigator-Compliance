-- =====================================================================
-- Nexora Compliance Navigator — 002_ner_graph.sql (schema v3: NER + Knowledge Graph)
--
-- Chạy SAU schema.sql (001). Thay mô hình "thẻ nghĩa vụ" (cards/tasks/customer_profiles)
-- bằng van_ban → van_ban_chunks → entities + entity_relationships → diagnostics.
-- DROP toàn bộ bảng của 001: lúc viết migration này các bảng đó chỉ chứa dữ liệu seed.
-- Hợp đồng cho frontend (type, enum, quy tắc): docs/CONTRACT.md — sửa file này thì sửa cả CONTRACT.md.
--
-- ---------------------------------------------------------------------
-- 3 QUYẾT ĐỊNH ĐIỀU CHỈNH SO VỚI v3 GỐC
-- ---------------------------------------------------------------------
-- A. "Áp dụng hay không" do RULE ENGINE THUẦN CODE quyết (CLAUDE.md mục 3.2), không chỉ so domain:
--    entity dieu_kien / nguong (và chu_the nếu cần) mang dieu_kien_may_doc
--    {thuoc_tinh, toan_tu, gia_tri}; AI không sinh cột này — curator điền khi duyệt.
--    Rule engine so với customers.thuoc_tinh → 4 trạng thái, thiếu dữ liệu → "hỏi bổ sung".
-- B. Diagnostic chỉ sinh từ entity hanh_vi, chỉ giao phòng ban primary.
--    thoi_han / che_tai / muc_thue / mien_giam đi kèm làm ngữ cảnh qua cạnh của graph.
--    UNIQUE (customer_id, entity_id, department_id) — quét lại không đẻ bản trùng.
-- C. Schema không gắn cứng lĩnh vực: domains là text[] (thue, ke_toan, ...).
--
-- ---------------------------------------------------------------------
-- MÔ HÌNH PHÂN QUYỀN (giữ nguyên từ 001)
-- ---------------------------------------------------------------------
-- Vai trò + tenant nằm trong app_metadata của auth.users (chỉ service role sửa được):
--   { "nexora_role": "curator" }                           → curator Nexora
--   { "nexora_role": "customer", "customer_id": "<uuid>" } → người đầu mối của 1 khách hàng
--
-- ---------------------------------------------------------------------
-- CONCURRENT: 2 người cùng duyệt 1 bản ghi → người UPDATE chạm row trước thắng, người sau 409.
-- ---------------------------------------------------------------------
-- approve_*() chạy UPDATE ... WHERE id = $1 AND trang_thai_duyet = 'cho_duyet'. Ở READ COMMITTED,
-- UPDATE thứ 2 chờ row lock; khi thứ 1 commit, WHERE được đánh giá lại → 0 row → PT409.
-- Chốt chặn thứ 2: trigger guard_trang_thai_duyet chặn mọi đổi trạng thái ngoài function duyệt.
--
-- MÃ LỖI: SQLSTATE dạng PTxxx → PostgREST trả đúng HTTP status xxx.
-- =====================================================================

begin;

-- =====================================================================
-- 0. GỠ MÔ HÌNH CŨ (001)
-- =====================================================================

drop table if exists public.notifications, public.pipeline_runs, public.approvals,
  public.tasks, public.customer_profiles, public.cards, public.customers cascade;
drop function if exists public.approve_card(uuid, public.trang_thai_duyet, text);
drop function if exists public.approve_task(uuid, public.trang_thai_duyet, text, text);
drop function if exists public.guard_trang_thai_duyet, public.khoa_card_da_xu_ly,
  public.khoa_task_da_xu_ly, public.thong_bao_task_moi cascade;
drop type if exists public.trang_thai_duyet, public.trang_thai_hieu_luc,
  public.trang_thai_ap_dung, public.buoc_pipeline cascade;
-- Giữ lại: current_customer_id(), is_curator(), set_updated_at() — tạo lại bằng create or replace.


-- =====================================================================
-- 1. ENUM — giá trị là slug ASCII; nhãn tiếng Việt hiển thị nằm ở docs/CONTRACT.md
-- =====================================================================

create type public.loai_van_ban as enum ('luat', 'nghi_dinh', 'thong_tu', 'nghi_quyet', 'quyet_dinh', 'khac');
create type public.trang_thai_van_ban as enum ('draft', 'active', 'replaced');
create type public.pham_vi_thay_the as enum ('toan_bo', 'mot_phan');
create type public.trang_thai_chunk as enum ('cho_xu_ly', 'dang_xu_ly', 'da_trich_xuat', 'hoan_tat', 'loi');
-- khớp LOAI_ENTITY / LOAI_RELATIONSHIP / PHONG_BAN trong lib/pipeline/extractEntities.schema.ts
create type public.loai_entity as enum (
  'chu_the', 'doi_tuong', 'hanh_vi', 'che_tai', 'dieu_kien', 'muc_thue', 'thoi_han', 'mien_giam', 'nguong');
create type public.loai_relationship as enum (
  'bao_ham', 'tham_chieu', 'thay_the', 'dieu_kien', 'che_tai_cua', 'ap_dung_cho');
create type public.slug_phong_ban as enum (
  'ban_giam_doc', 'ke_toan', 'nhan_su', 'kinh_doanh', 'marketing', 'cong_nghe', 'van_hanh', 'phap_che');
create type public.trang_thai_duyet as enum ('cho_duyet', 'da_duyet', 'tu_choi');
-- 4 trạng thái output của rule engine (CLAUDE.md mục 5)
create type public.trang_thai_ap_dung as enum ('ap_dung', 'sap_ap_dung', 'khong_ap_dung', 'chua_du_thong_tin');
create type public.quy_mo as enum ('nho', 'vua', 'lon');
create type public.kieu_thuoc_tinh as enum ('boolean', 'number', 'text', 'text_array');
create type public.pipeline_name as enum ('extract_entities', 'filter_domain', 'generate_diagnostic');
create type public.trang_thai_run as enum ('cho_xu_ly', 'dang_xu_ly', 'hoan_tat', 'loi');
create type public.giai_doan_thong_bao as enum ('cho_duyet', 'hoi_bo_sung', 'da_giao');


-- =====================================================================
-- 2. HELPER
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


-- =====================================================================
-- 3. BẢNG — KHO LUẬT DÙNG CHUNG (nửa 1)
-- =====================================================================

-- van_ban — registry metadata văn bản pháp luật.
create table public.van_ban (
  id               uuid primary key default gen_random_uuid(),
  ten_van_ban      text not null,
  so_hieu          text not null unique,
  loai_van_ban     public.loai_van_ban not null,
  co_quan_ban_hanh text,
  ngay_ban_hanh    date,
  ngay_hieu_luc    date not null,
  domains          text[] not null,
  trang_thai       public.trang_thai_van_ban not null default 'draft',
  nguoi_tao_id     uuid default auth.uid() references auth.users (id) on delete set null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),

  constraint van_ban_co_domain check (cardinality(domains) >= 1),
  constraint van_ban_domain_slug check (array_to_string(domains, ',') ~ '^[a-z_]+(,[a-z_]+)*$')
);
comment on table public.van_ban is
  'Văn bản pháp luật. Rule engine chỉ đọc entity của văn bản trang_thai = active. '
  'ngay_hieu_luc là ngày hiệu lực mặc định cho mọi entity (entity.ngay_co_hieu_luc ghi đè nếu có).';


-- van_ban_thay_the — quan hệ thay thế N-N (lỗ hổng #3: 1 luật mới thay nhiều luật cũ, hoặc chỉ thay vài điều).
create table public.van_ban_thay_the (
  id             uuid primary key default gen_random_uuid(),
  van_ban_moi_id uuid not null references public.van_ban (id) on delete cascade,
  van_ban_cu_id  uuid not null references public.van_ban (id) on delete cascade,
  pham_vi        public.pham_vi_thay_the not null,
  dieu_khoan     text,  -- điều/khoản bị thay khi pham_vi = mot_phan, vd "Điều 5, Điều 7"
  created_at     timestamptz not null default now(),

  constraint van_ban_thay_the_khac_nhau check (van_ban_moi_id <> van_ban_cu_id),
  constraint van_ban_thay_the_mot_phan_co_dieu check (pham_vi = 'toan_bo' or dieu_khoan is not null),
  constraint van_ban_thay_the_unique unique nulls not distinct (van_ban_moi_id, van_ban_cu_id, dieu_khoan)
);
comment on table public.van_ban_thay_the is
  'Văn bản mới thay văn bản cũ (toàn bộ hoặc một phần). Thay toàn bộ → curator chuyển văn bản cũ sang replaced.';


-- van_ban_chunks — đoạn văn bản cho AI xử lý. Giới hạn quota Groq (8K token/phút) → 1–2 điều/chunk.
create table public.van_ban_chunks (
  id               uuid primary key default gen_random_uuid(),
  van_ban_id       uuid not null references public.van_ban (id) on delete cascade,
  thu_tu           integer not null,
  tieu_de          text,
  dieu_khoan_range text,  -- vd "Điều 7–8"
  noi_dung         text not null,
  trang_thai       public.trang_thai_chunk not null default 'cho_xu_ly',
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),

  constraint van_ban_chunks_thu_tu_duong check (thu_tu > 0),
  constraint van_ban_chunks_unique unique (van_ban_id, thu_tu)
);
comment on table public.van_ban_chunks is
  'cho_xu_ly → dang_xu_ly → da_trich_xuat (AI xong, chờ curator) → hoan_tat (hết entity cho_duyet) | loi.';


-- thuoc_tinh_ho_so — từ điển thuộc tính hồ sơ khách hàng (CLAUDE.md mục 6: tập thuộc tính tái sử dụng).
-- dieu_kien_may_doc.thuoc_tinh và key của customers.thuoc_tinh phải là ma trong bảng này.
-- cau_hoi dùng cho cả form onboarding lẫn cơ chế "hỏi bổ sung" (mục 7).
create table public.thuoc_tinh_ho_so (
  ma         text primary key,
  cau_hoi    text not null,
  kieu       public.kieu_thuoc_tinh not null,
  domain     text,            -- null = dùng chung mọi lĩnh vực
  lua_chon   text[],          -- giá trị hợp lệ cho kieu text / text_array; null = tự do
  don_vi     text,            -- vd "đồng", "người" cho kieu number
  mo_ta      text,
  created_at timestamptz not null default now(),

  constraint thuoc_tinh_ma_slug check (ma ~ '^[a-z][a-z0-9_]*$'),
  constraint thuoc_tinh_lua_chon_hop_kieu check (lua_chon is null or kieu in ('text', 'text_array'))
);
comment on table public.thuoc_tinh_ho_so is
  'Từ điển thuộc tính onboarding. Thêm lĩnh vực luật mới = thêm row, không sửa form/pipeline.';


-- pipeline_runs — audit log MỌI lần chạy pipeline (CLAUDE.md mục 3.5).
-- filter_domain là rule engine thuần code → model/prompt_version BẮT BUỘC null; 2 bước AI bắt buộc có.
create table public.pipeline_runs (
  id             uuid primary key default gen_random_uuid(),
  pipeline_name  public.pipeline_name not null,
  chunk_id       uuid references public.van_ban_chunks (id) on delete set null,
  customer_id    uuid,  -- FK thêm sau khi tạo customers
  parent_run_id  uuid references public.pipeline_runs (id) on delete set null,
  trang_thai     public.trang_thai_run not null default 'cho_xu_ly',
  input          jsonb not null,
  output         jsonb,
  model          text,
  prompt_version text,
  error_log      text,
  nguoi_chay_id  uuid default auth.uid() references auth.users (id) on delete set null,
  started_at     timestamptz,
  completed_at   timestamptz,
  created_at     timestamptz not null default now(),

  constraint pipeline_runs_rule_engine_khong_ai check (
    (pipeline_name = 'filter_domain') = (model is null and prompt_version is null)),
  constraint pipeline_runs_extract_theo_chunk check (
    pipeline_name <> 'extract_entities' or (chunk_id is not null and customer_id is null)),
  constraint pipeline_runs_khach_hang_co_customer check (
    pipeline_name = 'extract_entities' or customer_id is not null),
  constraint pipeline_runs_loi_co_log check (trang_thai <> 'loi' or error_log is not null),
  constraint pipeline_runs_xong_co_output check (
    trang_thai <> 'hoan_tat' or (output is not null and completed_at is not null))
);
comment on table public.pipeline_runs is
  'Log minh bạch mọi lần chạy extract/filter/generate: input, output, model, prompt_version, thời điểm. '
  'Đã hoan_tat/loi thì không sửa được nữa.';


-- entities — node của knowledge graph, output NER (draft AI → curator duyệt).
create table public.entities (
  id                    uuid primary key default gen_random_uuid(),
  chunk_id              uuid not null references public.van_ban_chunks (id) on delete restrict,
  pipeline_run_id       uuid not null references public.pipeline_runs (id) on delete restrict,
  ma_tam                text not null,  -- id tạm AI đặt trong chunk (e1, e2...), để đối chiếu pipeline_runs.output
  ten_entity            text not null,
  loai_entity           public.loai_entity not null,
  mo_ta                 text not null,
  so_dieu               integer not null,
  dieu_khoan            text not null,
  noi_dung_goc          text not null,  -- trích nguyên văn, đã qua grounding.ts
  domain                text not null,
  primary_departments   public.slug_phong_ban[] not null default '{}',
  secondary_departments public.slug_phong_ban[] not null default '{}',
  ngay_co_hieu_luc      date,           -- null = theo van_ban.ngay_hieu_luc
  dieu_kien_may_doc     jsonb,          -- quyết định A; curator điền, AI không sinh
  trang_thai_duyet      public.trang_thai_duyet not null default 'cho_duyet',
  curator_id            uuid references auth.users (id) on delete set null,
  ghi_chu_curator       text,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),

  constraint entities_ma_tam_unique unique (pipeline_run_id, ma_tam),
  constraint entities_phong_ban_dung_loai check (
    loai_entity in ('hanh_vi', 'thoi_han', 'che_tai', 'mien_giam')
    or (cardinality(primary_departments) = 0 and cardinality(secondary_departments) = 0)),
  constraint entities_dieu_kien_dung_loai check (
    dieu_kien_may_doc is null or loai_entity in ('dieu_kien', 'nguong', 'chu_the')),
  -- rule engine không đọc được điều kiện viết bằng chữ → không cho duyệt dieu_kien/nguong thiếu bản máy đọc
  constraint entities_dieu_kien_duyet_phai_may_doc check (
    trang_thai_duyet <> 'da_duyet' or loai_entity not in ('dieu_kien', 'nguong') or dieu_kien_may_doc is not null)
);
comment on table public.entities is
  'Node graph. AI chỉ tạo draft cho_duyet; duyệt qua approve_entity()/approve_chunk(). '
  'Rule engine chỉ đọc entity da_duyet của van_ban active.';
comment on column public.entities.dieu_kien_may_doc is
  'Điều kiện máy đọc cho rule engine (KHÔNG gọi AI). {"thuoc_tinh": <thuoc_tinh_ho_so.ma>, "toan_tu": ..., "gia_tri": ...}. '
  'toan_tu theo kieu thuộc tính: boolean → eq|neq; number → eq|neq|gt|gte|lt|lte|in|not_in; '
  'text → eq|neq|in|not_in; text_array → contains|contains_any. in/not_in/contains_any: gia_tri là mảng.';


-- entity_relationships — cạnh của graph. target null + target_ref_text = pending link (ngoài chunk/ngoài luật).
create table public.entity_relationships (
  id                uuid primary key default gen_random_uuid(),
  chunk_id          uuid not null references public.van_ban_chunks (id) on delete restrict,
  pipeline_run_id   uuid references public.pipeline_runs (id) on delete restrict,  -- null = curator tạo tay
  source_entity_id  uuid not null references public.entities (id) on delete cascade,
  target_entity_id  uuid references public.entities (id) on delete cascade,
  target_ref_text   text,
  loai_relationship public.loai_relationship not null,
  can_cu            text not null,  -- đoạn chép nguyên văn thể hiện quan hệ
  nguoi_tao_id      uuid default auth.uid() references auth.users (id) on delete set null,
  created_at        timestamptz not null default now(),

  constraint rel_co_dich check (target_entity_id is not null or target_ref_text is not null),
  constraint rel_khong_tu_tro check (source_entity_id is distinct from target_entity_id)
);
create unique index rel_unique_edge on public.entity_relationships (source_entity_id, target_entity_id, loai_relationship)
  where target_entity_id is not null;
comment on table public.entity_relationships is
  'Cạnh source → target. Rule engine chỉ dùng cạnh mà cả 2 đầu da_duyet. '
  'Nối pending link = curator cập nhật target_entity_id.';


-- =====================================================================
-- 4. BẢNG — KHÁCH HÀNG (nửa 2)
-- =====================================================================

-- customers — doanh nghiệp (tenant). RLS tách quyền theo id/customer_id.
create table public.customers (
  id          uuid primary key default gen_random_uuid(),
  ten_cong_ty text not null,
  nganh       text,
  quy_mo      public.quy_mo,
  domains     text[] not null default '{}',
  thuoc_tinh  jsonb not null default '{}'::jsonb,  -- {ma: giá trị}; thiếu key / null = "Chưa chắc"
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),

  constraint customers_thuoc_tinh_object check (jsonb_typeof(thuoc_tinh) = 'object'),
  constraint customers_domain_slug check (array_to_string(domains, ',') ~ '^([a-z_]+(,[a-z_]+)*)?$')
);
comment on table public.customers is
  'Doanh nghiệp khách hàng. domains = lĩnh vực đăng ký theo dõi; thuoc_tinh = câu trả lời onboarding/hỏi bổ sung.';

alter table public.pipeline_runs
  add constraint pipeline_runs_customer_fk foreign key (customer_id) references public.customers (id) on delete cascade;


-- departments — phòng ban của doanh nghiệp; slug map về 8 mã chuẩn để route diagnostic.
create table public.departments (
  id             uuid primary key default gen_random_uuid(),
  customer_id    uuid not null references public.customers (id) on delete cascade,
  ten_phong_ban  text not null,
  slug_phong_ban public.slug_phong_ban not null,
  email_head     text,
  created_at     timestamptz not null default now(),

  constraint departments_unique unique (customer_id, ten_phong_ban),
  constraint departments_id_customer unique (id, customer_id)  -- cho FK ghép từ diagnostics
);
comment on table public.departments is
  'Phòng ban của khách hàng. Nhiều phòng có thể chung 1 slug; diagnostic giao tới mọi phòng có slug khớp.';


-- diagnostics — checklist tuân thủ: 1 row = 1 entity hanh_vi × 1 phòng ban primary của 1 khách hàng.
-- filter_domain (code) tạo/cập nhật trang_thai_ap_dung; generate_diagnostic (AI) điền noi_dung_diagnostic;
-- người đầu mối duyệt qua approve_diagnostic(). Rule engine không tạo row cho khong_ap_dung lần đầu;
-- row đã có mà quét lại thành khong_ap_dung thì giữ row, đổi trạng thái (để còn lịch sử).
create table public.diagnostics (
  id                  uuid primary key default gen_random_uuid(),
  customer_id         uuid not null references public.customers (id) on delete cascade,
  entity_id           uuid not null references public.entities (id) on delete restrict,
  department_id       uuid not null,
  trang_thai_ap_dung  public.trang_thai_ap_dung not null,
  thuoc_tinh_thieu    text[] not null default '{}',  -- ma thuộc tính cần hỏi bổ sung
  noi_dung_diagnostic text,                          -- AI viết; null = chưa generate
  filter_run_id       uuid not null references public.pipeline_runs (id) on delete restrict,
  generate_run_id     uuid references public.pipeline_runs (id) on delete restrict,
  trang_thai_duyet    public.trang_thai_duyet not null default 'cho_duyet',
  nguoi_duyet_id      uuid references auth.users (id) on delete set null,
  ghi_chu_duyet       text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),

  constraint diagnostics_department_fk foreign key (department_id, customer_id)
    references public.departments (id, customer_id) on delete cascade,
  constraint diagnostics_unique unique (customer_id, entity_id, department_id),
  constraint diagnostics_thieu_khi_chua_du check (
    (trang_thai_ap_dung = 'chua_du_thong_tin') = (cardinality(thuoc_tinh_thieu) > 0)),
  constraint diagnostics_generate_co_run check (noi_dung_diagnostic is null or generate_run_id is not null),
  constraint diagnostics_duyet_khi_ap_dung check (
    trang_thai_duyet <> 'da_duyet'
    or (trang_thai_ap_dung in ('ap_dung', 'sap_ap_dung') and noi_dung_diagnostic is not null))
);
comment on table public.diagnostics is
  'Checklist per hanh_vi × phòng ban. Draft (AI) → người đầu mối duyệt → giao phòng ban.';


-- approvals — log ai duyệt gì, lúc nào. Append-only, chỉ ghi qua function duyệt.
create table public.approvals (
  id             uuid primary key default gen_random_uuid(),
  entity_id      uuid references public.entities (id) on delete cascade,
  diagnostic_id  uuid references public.diagnostics (id) on delete cascade,
  customer_id    uuid references public.customers (id) on delete cascade,  -- null khi duyệt entity (kho chung)
  nguoi_duyet_id uuid not null references auth.users (id),
  quyet_dinh     public.trang_thai_duyet not null,
  ghi_chu        text,
  created_at     timestamptz not null default now(),

  constraint approvals_dung_mot_doi_tuong check ((entity_id is not null)::int + (diagnostic_id is not null)::int = 1),
  constraint approvals_diagnostic_co_customer check (diagnostic_id is null or customer_id is not null),
  constraint approvals_quyet_dinh_hop_le check (quyet_dinh <> 'cho_duyet')
);
comment on table public.approvals is 'Audit log hành động duyệt của con người (curator duyệt entity, đầu mối duyệt diagnostic).';


-- notifications — in-app. cho_duyet / hoi_bo_sung: báo người đầu mối; da_giao: báo phòng ban (department_id).
create table public.notifications (
  id            uuid primary key default gen_random_uuid(),
  customer_id   uuid not null references public.customers (id) on delete cascade,
  diagnostic_id uuid not null references public.diagnostics (id) on delete cascade,
  department_id uuid references public.departments (id) on delete cascade,
  giai_doan     public.giai_doan_thong_bao not null,
  tieu_de       text not null,
  noi_dung      text,
  da_doc        boolean not null default false,
  created_at    timestamptz not null default now(),

  constraint notifications_phong_ban_theo_giai_doan check ((giai_doan = 'da_giao') = (department_id is not null))
);
comment on table public.notifications is 'Chỉ trigger/function tạo; client chỉ đánh dấu da_doc.';


-- Postgres không tự index foreign key
create index van_ban_chunks_van_ban_idx on public.van_ban_chunks (van_ban_id, thu_tu);
create index van_ban_thay_the_cu_idx on public.van_ban_thay_the (van_ban_cu_id);
create index entities_chunk_idx on public.entities (chunk_id);
create index entities_run_idx on public.entities (pipeline_run_id);
create index entities_duyet_idx on public.entities (trang_thai_duyet, loai_entity);
create index entities_domain_idx on public.entities (domain) where trang_thai_duyet = 'da_duyet';
create index rel_chunk_idx on public.entity_relationships (chunk_id);
create index rel_source_idx on public.entity_relationships (source_entity_id);
create index rel_target_idx on public.entity_relationships (target_entity_id);
create index rel_pending_idx on public.entity_relationships (chunk_id) where target_entity_id is null;
create index departments_customer_idx on public.departments (customer_id, slug_phong_ban);
create index diagnostics_customer_idx on public.diagnostics (customer_id, trang_thai_duyet, trang_thai_ap_dung);
create index diagnostics_entity_idx on public.diagnostics (entity_id);
create index diagnostics_department_idx on public.diagnostics (department_id);
create index approvals_entity_idx on public.approvals (entity_id);
create index approvals_diagnostic_idx on public.approvals (diagnostic_id);
create index approvals_customer_idx on public.approvals (customer_id);
create index pipeline_runs_customer_idx on public.pipeline_runs (customer_id, created_at desc);
create index pipeline_runs_chunk_idx on public.pipeline_runs (chunk_id, created_at desc);
create index pipeline_runs_name_idx on public.pipeline_runs (pipeline_name, created_at desc);
create index pipeline_runs_parent_idx on public.pipeline_runs (parent_run_id);
create index notifications_customer_idx on public.notifications (customer_id, da_doc, created_at desc);
create index notifications_department_idx on public.notifications (department_id);


-- =====================================================================
-- 5. KIỂM TRA DỮ LIỆU (trigger)
-- =====================================================================

create trigger van_ban_updated_at before update on public.van_ban
  for each row execute function public.set_updated_at();
create trigger van_ban_chunks_updated_at before update on public.van_ban_chunks
  for each row execute function public.set_updated_at();
create trigger entities_updated_at before update on public.entities
  for each row execute function public.set_updated_at();
create trigger customers_updated_at before update on public.customers
  for each row execute function public.set_updated_at();
create trigger diagnostics_updated_at before update on public.diagnostics
  for each row execute function public.set_updated_at();


-- dieu_kien_may_doc hợp lệ: thuộc tính có trong từ điển, toán tử và kiểu giá trị khớp kiểu thuộc tính.
create or replace function public.dieu_kien_may_doc_hop_le(p jsonb)
returns text  -- null = hợp lệ, ngược lại là lý do
language plpgsql stable
set search_path = ''
as $$
declare
  v_kieu public.kieu_thuoc_tinh;
  v_op   text := p ->> 'toan_tu';
  v_val  jsonb := p -> 'gia_tri';
  v_elem text;
begin
  if jsonb_typeof(p) <> 'object' or not (p ?& array['thuoc_tinh', 'toan_tu', 'gia_tri'])
     or (select count(*) from jsonb_object_keys(p)) <> 3 then
    return 'phải là object đúng 3 key thuoc_tinh, toan_tu, gia_tri';
  end if;
  select kieu into v_kieu from public.thuoc_tinh_ho_so where ma = p ->> 'thuoc_tinh';
  if not found then
    return format('thuộc tính "%s" chưa có trong thuoc_tinh_ho_so', p ->> 'thuoc_tinh');
  end if;
  v_elem := case v_kieu when 'number' then 'number' when 'boolean' then 'boolean' else 'string' end;

  if v_kieu = 'boolean' and v_op in ('eq', 'neq') and jsonb_typeof(v_val) = 'boolean' then return null; end if;
  if v_kieu = 'number' and v_op in ('eq', 'neq', 'gt', 'gte', 'lt', 'lte') and jsonb_typeof(v_val) = 'number' then return null; end if;
  if v_kieu = 'text' and v_op in ('eq', 'neq') and jsonb_typeof(v_val) = 'string' then return null; end if;
  if v_kieu = 'text_array' and v_op = 'contains' and jsonb_typeof(v_val) = 'string' then return null; end if;
  if ((v_kieu in ('number', 'text') and v_op in ('in', 'not_in')) or (v_kieu = 'text_array' and v_op = 'contains_any'))
     and jsonb_typeof(v_val) = 'array' and jsonb_array_length(v_val) > 0
     and not exists (select 1 from jsonb_array_elements(v_val) x where jsonb_typeof(x) <> v_elem) then
    return null;
  end if;
  return format('toán tử "%s" / giá trị %s không hợp với kiểu %s', v_op, v_val, v_kieu);
end;
$$;


-- customers.thuoc_tinh: mọi key phải có trong từ điển, giá trị đúng kiểu (null = "Chưa chắc").
create or replace function public.kiem_tra_thuoc_tinh_khach_hang()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_key  text;
  v_val  jsonb;
  v_def  public.thuoc_tinh_ho_so;
  v_ok   boolean;
begin
  for v_key, v_val in select key, value from jsonb_each(new.thuoc_tinh) loop
    select * into v_def from public.thuoc_tinh_ho_so where ma = v_key;
    if not found then
      raise exception 'Thuộc tính "%" chưa có trong thuoc_tinh_ho_so', v_key using errcode = 'PT400';
    end if;
    continue when jsonb_typeof(v_val) = 'null';
    v_ok := case v_def.kieu
      when 'boolean' then jsonb_typeof(v_val) = 'boolean'
      when 'number'  then jsonb_typeof(v_val) = 'number'
      when 'text'    then jsonb_typeof(v_val) = 'string'
                          and (v_def.lua_chon is null or (v_val #>> '{}') = any (v_def.lua_chon))
      when 'text_array' then jsonb_typeof(v_val) = 'array'
                          and not exists (
                            select 1 from jsonb_array_elements(v_val) x
                             where jsonb_typeof(x) <> 'string'
                                or (v_def.lua_chon is not null and not (x #>> '{}') = any (v_def.lua_chon)))
    end;
    if not v_ok then
      raise exception 'Giá trị % không hợp lệ cho thuộc tính "%" (kiểu %)', v_val, v_key, v_def.kieu using errcode = 'PT400';
    end if;
  end loop;
  return new;
end;
$$;

create trigger customers_kiem_tra_thuoc_tinh before insert or update of thuoc_tinh on public.customers
  for each row execute function public.kiem_tra_thuoc_tinh_khach_hang();


-- entities: domain thuộc van_ban.domains; dieu_kien_may_doc hợp lệ.
create or replace function public.kiem_tra_entity()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_ly_do text;
begin
  if not exists (
       select 1 from public.van_ban_chunks c join public.van_ban v on v.id = c.van_ban_id
        where c.id = new.chunk_id and new.domain = any (v.domains)) then
    raise exception 'domain "%" không thuộc lĩnh vực của văn bản', new.domain using errcode = 'PT400';
  end if;
  if new.dieu_kien_may_doc is not null then
    v_ly_do := public.dieu_kien_may_doc_hop_le(new.dieu_kien_may_doc);
    if v_ly_do is not null then
      raise exception 'dieu_kien_may_doc không hợp lệ: %', v_ly_do using errcode = 'PT400';
    end if;
  end if;
  return new;
end;
$$;

create trigger entities_kiem_tra before insert or update of domain, chunk_id, dieu_kien_may_doc on public.entities
  for each row execute function public.kiem_tra_entity();


-- diagnostics: entity phải là hanh_vi đã duyệt (quyết định B).
create or replace function public.kiem_tra_diagnostic()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not exists (select 1 from public.entities
                  where id = new.entity_id and loai_entity = 'hanh_vi' and trang_thai_duyet = 'da_duyet') then
    raise exception 'Diagnostic chỉ tạo từ entity hanh_vi đã duyệt' using errcode = 'PT400';
  end if;
  return new;
end;
$$;

create trigger diagnostics_kiem_tra before insert or update of entity_id on public.diagnostics
  for each row execute function public.kiem_tra_diagnostic();


-- =====================================================================
-- 6. TRIGGER RANH GIỚI AN TOÀN (CLAUDE.md mục 3.3–3.4)
-- =====================================================================

-- INSERT luôn là cho_duyet; đổi trạng thái chỉ khi đang cho_duyet và chỉ qua function duyệt
-- (function bật cờ nexora.duyet_boi_nguoi trong transaction của nó; client không tự bật được
-- vì mỗi request PostgREST là 1 transaction riêng). Ngoại lệ: seed bật cờ nexora.seed.
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
    if new.trang_thai_duyet <> 'cho_duyet' then
      raise exception 'Bản ghi mới phải ở trạng thái cho_duyet — output AI chỉ là draft chờ người duyệt'
        using errcode = 'PT403';
    end if;
    return new;
  end if;

  if new.trang_thai_duyet is distinct from old.trang_thai_duyet then
    if old.trang_thai_duyet <> 'cho_duyet' then
      raise exception 'Đã được xử lý trước đó (%), không thể đổi trạng thái', old.trang_thai_duyet
        using errcode = 'PT409';
    end if;
    if coalesce(current_setting('nexora.duyet_boi_nguoi', true), '') <> 'on' then
      raise exception 'Chỉ được đổi trang_thai_duyet qua function duyệt' using errcode = 'PT403';
    end if;
  end if;
  return new;
end;
$$;

create trigger entities_guard_trang_thai_duyet before insert or update on public.entities
  for each row execute function public.guard_trang_thai_duyet();
create trigger diagnostics_guard_trang_thai_duyet before insert or update on public.diagnostics
  for each row execute function public.guard_trang_thai_duyet();


-- Entity đã xử lý → khóa nội dung (sửa luật = văn bản/chunk mới, entity mới, lại qua curator).
-- Trích dẫn gốc (noi_dung_goc, so_dieu, dieu_khoan) và nguồn gốc không bao giờ đổi — đã qua grounding.
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
       new.secondary_departments, new.ngay_co_hieu_luc, new.dieu_kien_may_doc, new.curator_id
     ) is distinct from (
       old.ten_entity, old.loai_entity, old.mo_ta, old.domain, old.primary_departments,
       old.secondary_departments, old.ngay_co_hieu_luc, old.dieu_kien_may_doc, old.curator_id
     ) then
    raise exception 'Entity đã xử lý, không sửa nội dung' using errcode = 'PT409';
  end if;
  return new;
end;
$$;

create trigger entities_khoa_noi_dung before update on public.entities
  for each row execute function public.khoa_entity();


-- Cạnh: chỉ sửa/xóa khi entity nguồn còn cho_duyet; ngoại lệ duy nhất là nối pending link
-- (target_entity_id null → có giá trị).
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
    if v_src_status <> 'cho_duyet' then
      raise exception 'Không xóa cạnh của entity đã xử lý' using errcode = 'PT409';
    end if;
    return old;
  end if;
  if (new.source_entity_id, new.chunk_id, new.pipeline_run_id, new.loai_relationship)
     is distinct from (old.source_entity_id, old.chunk_id, old.pipeline_run_id, old.loai_relationship) then
    raise exception 'Chỉ được sửa target / can_cu của cạnh' using errcode = 'PT403';
  end if;
  if v_src_status <> 'cho_duyet' and not (old.target_entity_id is null and new.target_entity_id is not null) then
    raise exception 'Cạnh của entity đã xử lý chỉ được nối pending link' using errcode = 'PT409';
  end if;
  return new;
end;
$$;

create trigger rel_khoa before update or delete on public.entity_relationships
  for each row execute function public.khoa_relationship();


-- Diagnostic đã xử lý → khóa; customer/entity không bao giờ đổi.
create or replace function public.khoa_diagnostic()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (new.customer_id, new.entity_id) is distinct from (old.customer_id, old.entity_id) then
    raise exception 'Không được đổi customer_id/entity_id của diagnostic' using errcode = 'PT403';
  end if;
  if old.trang_thai_duyet <> 'cho_duyet' and (
       new.trang_thai_ap_dung, new.thuoc_tinh_thieu, new.noi_dung_diagnostic, new.department_id,
       new.filter_run_id, new.generate_run_id, new.nguoi_duyet_id
     ) is distinct from (
       old.trang_thai_ap_dung, old.thuoc_tinh_thieu, old.noi_dung_diagnostic, old.department_id,
       old.filter_run_id, old.generate_run_id, old.nguoi_duyet_id
     ) then
    raise exception 'Diagnostic đã xử lý, không sửa nội dung' using errcode = 'PT409';
  end if;
  return new;
end;
$$;

create trigger diagnostics_khoa_noi_dung before update on public.diagnostics
  for each row execute function public.khoa_diagnostic();


-- pipeline_runs: append-only về nội dung; chỉ được cập nhật tiến trình cho tới khi hoan_tat/loi.
create or replace function public.khoa_pipeline_run()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.trang_thai in ('hoan_tat', 'loi') then
    raise exception 'Pipeline run đã kết thúc, không sửa được' using errcode = 'PT409';
  end if;
  if (new.pipeline_name, new.chunk_id, new.customer_id, new.parent_run_id, new.input, new.model,
      new.prompt_version, new.nguoi_chay_id, new.created_at)
     is distinct from
     (old.pipeline_name, old.chunk_id, old.customer_id, old.parent_run_id, old.input, old.model,
      old.prompt_version, old.nguoi_chay_id, old.created_at) then
    raise exception 'Chỉ được cập nhật trang_thai/output/error_log/started_at/completed_at' using errcode = 'PT403';
  end if;
  return new;
end;
$$;

create trigger pipeline_runs_khoa before update on public.pipeline_runs
  for each row execute function public.khoa_pipeline_run();


-- Thông báo giai đoạn 1 (CLAUDE.md mục 9) — security definer vì client không insert notifications.
--   hoi_bo_sung: diagnostic chuyển sang chua_du_thong_tin → hỏi người đầu mối (mục 7)
--   cho_duyet:   AI vừa viết xong noi_dung_diagnostic → có mục chờ đầu mối duyệt
create or replace function public.thong_bao_diagnostic()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.trang_thai_duyet <> 'cho_duyet' then
    return null;
  end if;
  if new.trang_thai_ap_dung = 'chua_du_thong_tin'
     and (tg_op = 'INSERT' or old.trang_thai_ap_dung <> 'chua_du_thong_tin'
          or old.thuoc_tinh_thieu is distinct from new.thuoc_tinh_thieu) then
    insert into public.notifications (customer_id, diagnostic_id, giai_doan, tieu_de, noi_dung)
    values (new.customer_id, new.id, 'hoi_bo_sung', 'Cần bổ sung thông tin để xác định nghĩa vụ',
            array_to_string(new.thuoc_tinh_thieu, ', '));
  end if;
  if new.noi_dung_diagnostic is not null and (tg_op = 'INSERT' or old.noi_dung_diagnostic is null) then
    insert into public.notifications (customer_id, diagnostic_id, giai_doan, tieu_de, noi_dung)
    values (new.customer_id, new.id, 'cho_duyet', 'Có nghĩa vụ mới chờ bạn duyệt', left(new.noi_dung_diagnostic, 200));
  end if;
  return null;
end;
$$;

create trigger diagnostics_thong_bao after insert or update of trang_thai_ap_dung, thuoc_tinh_thieu, noi_dung_diagnostic
  on public.diagnostics for each row execute function public.thong_bao_diagnostic();


-- =====================================================================
-- 7. FUNCTION DUYỆT — cửa DUY NHẤT để đổi trang_thai_duyet
-- Gọi bằng client mang JWT người dùng: supabase.rpc('approve_entity', {...}).
-- auth.uid() bắt buộc là người thật → service role (không có user) bị từ chối,
-- nên không có đường nào để hệ thống tự duyệt (CLAUDE.md mục 3.4).
-- =====================================================================

-- chunk hết entity cho_duyet → hoan_tat
create or replace function public.cap_nhat_trang_thai_chunk(p_chunk_id uuid)
returns void
language sql
set search_path = ''
as $$
  update public.van_ban_chunks
     set trang_thai = 'hoan_tat'
   where id = p_chunk_id
     and trang_thai = 'da_trich_xuat'
     and not exists (select 1 from public.entities where chunk_id = p_chunk_id and trang_thai_duyet = 'cho_duyet');
$$;


create or replace function public.approve_entity(
  p_entity_id  uuid,
  p_quyet_dinh public.trang_thai_duyet,
  p_ghi_chu    text default null
)
returns public.entities
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_entity public.entities;
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

  perform set_config('nexora.duyet_boi_nguoi', 'on', true);

  -- WHERE trang_thai_duyet = 'cho_duyet' = khóa concurrent (xem đầu file)
  update public.entities
     set trang_thai_duyet = p_quyet_dinh,
         curator_id       = auth.uid(),
         ghi_chu_curator  = coalesce(p_ghi_chu, ghi_chu_curator)
   where id = p_entity_id
     and trang_thai_duyet = 'cho_duyet'
  returning * into v_entity;

  perform set_config('nexora.duyet_boi_nguoi', 'off', true);

  -- không dùng FOUND: perform phía trên đã ghi đè nó
  if v_entity.id is null then
    if exists (select 1 from public.entities where id = p_entity_id) then
      raise exception 'Entity không còn ở trạng thái cho_duyet' using errcode = 'PT409';
    end if;
    raise exception 'Không tìm thấy entity' using errcode = 'PT404';
  end if;

  insert into public.approvals (entity_id, nguoi_duyet_id, quyet_dinh, ghi_chu)
  values (v_entity.id, auth.uid(), p_quyet_dinh, p_ghi_chu);

  perform public.cap_nhat_trang_thai_chunk(v_entity.chunk_id);
  return v_entity;
end;
$$;


-- Duyệt hàng loạt mọi entity cho_duyet còn lại trong 1 chunk (75–130 entity/luật, duyệt từng cái không kịp).
-- Vẫn là thao tác của curator; mỗi entity vẫn có 1 dòng approvals riêng. Trả về số entity đã duyệt.
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
  v_thieu text;
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

  select string_agg(ma_tam || ' (' || ten_entity || ')', ', ' order by ma_tam) into v_thieu
    from public.entities
   where chunk_id = p_chunk_id and trang_thai_duyet = 'cho_duyet'
     and loai_entity in ('dieu_kien', 'nguong') and dieu_kien_may_doc is null;
  if v_thieu is not null then
    raise exception 'Còn entity điều kiện/ngưỡng chưa có dieu_kien_may_doc: %', v_thieu using errcode = 'PT400';
  end if;

  perform set_config('nexora.duyet_boi_nguoi', 'on', true);

  with duyet as (
    update public.entities
       set trang_thai_duyet = 'da_duyet',
           curator_id       = auth.uid()
     where chunk_id = p_chunk_id
       and trang_thai_duyet = 'cho_duyet'
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


create or replace function public.approve_diagnostic(
  p_diagnostic_id uuid,
  p_quyet_dinh    public.trang_thai_duyet,
  p_department_id uuid default null,  -- đổi phòng nhận việc khi duyệt (tùy chọn)
  p_ghi_chu       text default null
)
returns public.diagnostics
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_customer_id uuid := public.current_customer_id();
  v_diag        public.diagnostics;
begin
  if auth.uid() is null then
    raise exception 'Cần người đầu mối đăng nhập để duyệt' using errcode = 'PT401';
  end if;
  -- curator không có customer_id → không duyệt được diagnostic của khách hàng
  if v_customer_id is null then
    raise exception 'Chỉ người đầu mối của khách hàng được duyệt' using errcode = 'PT403';
  end if;
  if p_quyet_dinh = 'cho_duyet' then
    raise exception 'Quyết định phải là da_duyet hoặc tu_choi' using errcode = 'PT400';
  end if;
  -- không phân biệt "không tồn tại" và "của khách hàng khác" để không lộ dữ liệu
  select * into v_diag from public.diagnostics where id = p_diagnostic_id and customer_id = v_customer_id;
  if not found then
    raise exception 'Không tìm thấy diagnostic' using errcode = 'PT404';
  end if;
  if p_quyet_dinh = 'da_duyet' and (
       v_diag.trang_thai_ap_dung not in ('ap_dung', 'sap_ap_dung') or v_diag.noi_dung_diagnostic is null) then
    raise exception 'Chỉ duyệt được mục ap_dung/sap_ap_dung đã có nội dung' using errcode = 'PT400';
  end if;
  if p_department_id is not null and not exists (
       select 1 from public.departments where id = p_department_id and customer_id = v_customer_id) then
    raise exception 'Phòng ban không thuộc doanh nghiệp' using errcode = 'PT400';
  end if;

  perform set_config('nexora.duyet_boi_nguoi', 'on', true);

  update public.diagnostics
     set trang_thai_duyet = p_quyet_dinh,
         nguoi_duyet_id   = auth.uid(),
         ghi_chu_duyet    = p_ghi_chu,
         department_id    = coalesce(p_department_id, department_id)
   where id = p_diagnostic_id
     and customer_id = v_customer_id
     and trang_thai_duyet = 'cho_duyet'
  returning * into v_diag;

  perform set_config('nexora.duyet_boi_nguoi', 'off', true);

  -- không dùng FOUND: perform phía trên đã ghi đè nó
  if v_diag.id is null then
    raise exception 'Diagnostic không còn ở trạng thái cho_duyet' using errcode = 'PT409';
  end if;

  insert into public.approvals (diagnostic_id, customer_id, nguoi_duyet_id, quyet_dinh, ghi_chu)
  values (v_diag.id, v_diag.customer_id, auth.uid(), p_quyet_dinh, p_ghi_chu);

  -- Thông báo giai đoạn 2: đầu mối duyệt → báo phòng ban
  if p_quyet_dinh = 'da_duyet' then
    insert into public.notifications (customer_id, diagnostic_id, department_id, giai_doan, tieu_de, noi_dung)
    values (v_diag.customer_id, v_diag.id, v_diag.department_id, 'da_giao',
            'Phòng ban có nghĩa vụ mới được giao', left(v_diag.noi_dung_diagnostic, 200));
  end if;

  return v_diag;
end;
$$;


-- =====================================================================
-- 8. VIEW (security_invoker → RLS của bảng gốc vẫn áp dụng cho người gọi)
-- =====================================================================

-- entity_graph — mỗi row = 1 cạnh đã flatten, kèm tên/loại 2 đầu. target_* null = pending link.
create view public.entity_graph with (security_invoker = true) as
select
  r.id                  as relationship_id,
  r.loai_relationship,
  r.chunk_id,
  c.van_ban_id,
  s.id                  as source_id,
  s.ten_entity          as source_ten,
  s.loai_entity         as source_loai,
  s.trang_thai_duyet    as source_trang_thai_duyet,
  t.id                  as target_id,
  t.ten_entity          as target_ten,
  t.loai_entity         as target_loai,
  t.trang_thai_duyet    as target_trang_thai_duyet,
  r.target_ref_text,
  (r.target_entity_id is null) as is_pending,
  r.can_cu
from public.entity_relationships r
join public.van_ban_chunks c on c.id = r.chunk_id
join public.entities s on s.id = r.source_entity_id
left join public.entities t on t.id = r.target_entity_id;


-- ner_extraction_summary — thống kê theo chunk cho màn curator.
create view public.ner_extraction_summary with (security_invoker = true) as
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
  (select count(*) from public.entity_relationships r where r.chunk_id = c.id and r.target_entity_id is null) as so_pending_link
from public.van_ban_chunks c
join public.van_ban v on v.id = c.van_ban_id
left join public.entities e on e.chunk_id = c.id
group by c.id, v.so_hieu;


-- van_ban_replacement_chain — chuỗi thay thế đệ quy: từ mỗi văn bản đi tới mọi văn bản mới hơn thay nó.
create view public.van_ban_replacement_chain with (security_invoker = true) as
with recursive chain as (
  select t.van_ban_cu_id as van_ban_goc_id, t.van_ban_moi_id as van_ban_id, t.pham_vi, t.dieu_khoan,
         1 as do_sau, array[t.van_ban_cu_id, t.van_ban_moi_id] as duong_di
    from public.van_ban_thay_the t
  union all
  select ch.van_ban_goc_id, t.van_ban_moi_id, t.pham_vi, t.dieu_khoan,
         ch.do_sau + 1, ch.duong_di || t.van_ban_moi_id
    from chain ch
    join public.van_ban_thay_the t on t.van_ban_cu_id = ch.van_ban_id
   where not t.van_ban_moi_id = any (ch.duong_di)  -- chống vòng
)
select ch.van_ban_goc_id, g.so_hieu as so_hieu_goc, ch.van_ban_id, v.so_hieu, ch.pham_vi, ch.dieu_khoan,
       ch.do_sau, ch.duong_di
  from chain ch
  join public.van_ban g on g.id = ch.van_ban_goc_id
  join public.van_ban v on v.id = ch.van_ban_id;


-- =====================================================================
-- 9. ROW LEVEL SECURITY
-- Kho luật (van_ban, chunks, entities, relationships, thuoc_tinh_ho_so): mọi user đăng nhập đọc
-- được phần đã duyệt; curator quản lý. Dữ liệu khách hàng: chỉ customer_id trong JWT.
-- Curator đọc + chạy filter/generate cho mọi khách hàng (nút "Quét lại", CLAUDE.md mục 8)
-- nhưng KHÔNG duyệt được diagnostic. Không có policy = bị chặn.
-- =====================================================================

alter table public.van_ban              enable row level security;
alter table public.van_ban_thay_the     enable row level security;
alter table public.van_ban_chunks       enable row level security;
alter table public.thuoc_tinh_ho_so     enable row level security;
alter table public.pipeline_runs        enable row level security;
alter table public.entities             enable row level security;
alter table public.entity_relationships enable row level security;
alter table public.customers            enable row level security;
alter table public.departments          enable row level security;
alter table public.diagnostics          enable row level security;
alter table public.approvals            enable row level security;
alter table public.notifications        enable row level security;

-- van_ban / van_ban_thay_the / van_ban_chunks / thuoc_tinh_ho_so: đọc chung, curator ghi
create policy van_ban_select on public.van_ban for select to authenticated
  using (trang_thai <> 'draft' or (select public.is_curator()));
create policy van_ban_insert on public.van_ban for insert to authenticated
  with check ((select public.is_curator()));
create policy van_ban_update on public.van_ban for update to authenticated
  using ((select public.is_curator())) with check ((select public.is_curator()));

create policy van_ban_thay_the_select on public.van_ban_thay_the for select to authenticated using (true);
create policy van_ban_thay_the_insert on public.van_ban_thay_the for insert to authenticated
  with check ((select public.is_curator()));
create policy van_ban_thay_the_delete on public.van_ban_thay_the for delete to authenticated
  using ((select public.is_curator()));

create policy chunks_select on public.van_ban_chunks for select to authenticated
  using (exists (select 1 from public.van_ban v where v.id = van_ban_id));  -- theo quyền đọc van_ban
create policy chunks_insert on public.van_ban_chunks for insert to authenticated
  with check ((select public.is_curator()));
create policy chunks_update on public.van_ban_chunks for update to authenticated
  using ((select public.is_curator())) with check ((select public.is_curator()));

create policy thuoc_tinh_select on public.thuoc_tinh_ho_so for select to authenticated using (true);
create policy thuoc_tinh_insert on public.thuoc_tinh_ho_so for insert to authenticated
  with check ((select public.is_curator()));
create policy thuoc_tinh_update on public.thuoc_tinh_ho_so for update to authenticated
  using ((select public.is_curator())) with check ((select public.is_curator()));

-- entities: khách hàng chỉ thấy entity đã duyệt; curator thấy/tạo/sửa draft
create policy entities_select on public.entities for select to authenticated
  using (trang_thai_duyet = 'da_duyet' or (select public.is_curator()));
create policy entities_insert on public.entities for insert to authenticated
  with check ((select public.is_curator()));
create policy entities_update on public.entities for update to authenticated
  using ((select public.is_curator())) with check ((select public.is_curator()));

-- entity_relationships: thấy cạnh khi thấy entity nguồn (RLS của entities áp vào subquery)
create policy rel_select on public.entity_relationships for select to authenticated
  using (exists (select 1 from public.entities e where e.id = source_entity_id));
create policy rel_insert on public.entity_relationships for insert to authenticated
  with check ((select public.is_curator()));
create policy rel_update on public.entity_relationships for update to authenticated
  using ((select public.is_curator())) with check ((select public.is_curator()));
create policy rel_delete on public.entity_relationships for delete to authenticated
  using ((select public.is_curator()));

-- pipeline_runs: khách hàng chỉ log filter/generate của chính mình; extract chỉ curator
create policy pipeline_runs_select on public.pipeline_runs for select to authenticated
  using (customer_id = (select public.current_customer_id()) or (select public.is_curator()));
create policy pipeline_runs_insert on public.pipeline_runs for insert to authenticated
  with check (
    nguoi_chay_id = (select auth.uid())
    and ((select public.is_curator())
         or (customer_id = (select public.current_customer_id()) and pipeline_name <> 'extract_entities')));
create policy pipeline_runs_update on public.pipeline_runs for update to authenticated
  using (nguoi_chay_id = (select auth.uid()))
  with check (nguoi_chay_id = (select auth.uid()));

-- customers
create policy customers_select on public.customers for select to authenticated
  using (id = (select public.current_customer_id()) or (select public.is_curator()));
create policy customers_insert on public.customers for insert to authenticated
  with check ((select public.is_curator()));
create policy customers_update on public.customers for update to authenticated
  using (id = (select public.current_customer_id()) or (select public.is_curator()))
  with check (id = (select public.current_customer_id()) or (select public.is_curator()));

-- departments: khách hàng tự quản lý; curator chỉ đọc
create policy departments_select on public.departments for select to authenticated
  using (customer_id = (select public.current_customer_id()) or (select public.is_curator()));
create policy departments_insert on public.departments for insert to authenticated
  with check (customer_id = (select public.current_customer_id()));
create policy departments_update on public.departments for update to authenticated
  using (customer_id = (select public.current_customer_id()))
  with check (customer_id = (select public.current_customer_id()));

-- diagnostics: khách hàng + curator (quét lại) tạo/cập nhật draft; duyệt chỉ qua approve_diagnostic
create policy diagnostics_select on public.diagnostics for select to authenticated
  using (customer_id = (select public.current_customer_id()) or (select public.is_curator()));
create policy diagnostics_insert on public.diagnostics for insert to authenticated
  with check (customer_id = (select public.current_customer_id()) or (select public.is_curator()));
create policy diagnostics_update on public.diagnostics for update to authenticated
  using (customer_id = (select public.current_customer_id()) or (select public.is_curator()))
  with check (customer_id = (select public.current_customer_id()) or (select public.is_curator()));

-- approvals: chỉ đọc
create policy approvals_select on public.approvals for select to authenticated
  using (customer_id = (select public.current_customer_id()) or (select public.is_curator()));

-- notifications: chỉ đọc + đánh dấu đã đọc
create policy notifications_select on public.notifications for select to authenticated
  using (customer_id = (select public.current_customer_id()));
create policy notifications_update on public.notifications for update to authenticated
  using (customer_id = (select public.current_customer_id()))
  with check (customer_id = (select public.current_customer_id()));


-- =====================================================================
-- 10. GRANT — lớp bảo vệ thứ 2 (giới hạn theo cột). Function security definer không bị ảnh hưởng.
-- =====================================================================

revoke all on public.van_ban, public.van_ban_thay_the, public.van_ban_chunks, public.thuoc_tinh_ho_so,
  public.pipeline_runs, public.entities, public.entity_relationships, public.customers, public.departments,
  public.diagnostics, public.approvals, public.notifications,
  public.entity_graph, public.ner_extraction_summary, public.van_ban_replacement_chain from anon;

-- trang_thai_duyet / curator_id / nguoi_duyet_id chỉ đổi qua function duyệt
revoke update on public.entities from authenticated;
grant update (ten_entity, loai_entity, mo_ta, domain, primary_departments, secondary_departments,
              ngay_co_hieu_luc, dieu_kien_may_doc, ghi_chu_curator)
  on public.entities to authenticated;

revoke update on public.entity_relationships from authenticated;
grant update (target_entity_id, target_ref_text, can_cu) on public.entity_relationships to authenticated;

revoke update on public.diagnostics from authenticated;
grant update (trang_thai_ap_dung, thuoc_tinh_thieu, noi_dung_diagnostic, department_id, filter_run_id, generate_run_id)
  on public.diagnostics to authenticated;

revoke update on public.pipeline_runs from authenticated;
grant update (trang_thai, output, error_log, started_at, completed_at) on public.pipeline_runs to authenticated;

revoke update on public.notifications from authenticated;
grant update (da_doc) on public.notifications to authenticated;

revoke update on public.customers from authenticated;
grant update (ten_cong_ty, nganh, quy_mo, domains, thuoc_tinh) on public.customers to authenticated;

revoke insert, update, delete on public.approvals from authenticated;
revoke insert, delete on public.notifications from authenticated;
revoke delete on public.van_ban, public.van_ban_chunks, public.thuoc_tinh_ho_so, public.pipeline_runs,
  public.entities, public.customers, public.departments, public.diagnostics from authenticated;

revoke all on function public.approve_entity(uuid, public.trang_thai_duyet, text) from public, anon;
revoke all on function public.approve_chunk(uuid, text) from public, anon;
revoke all on function public.approve_diagnostic(uuid, public.trang_thai_duyet, uuid, text) from public, anon;
revoke all on function public.cap_nhat_trang_thai_chunk(uuid) from public, anon, authenticated;
grant execute on function public.approve_entity(uuid, public.trang_thai_duyet, text) to authenticated;
grant execute on function public.approve_chunk(uuid, text) to authenticated;
grant execute on function public.approve_diagnostic(uuid, public.trang_thai_duyet, uuid, text) to authenticated;

commit;
