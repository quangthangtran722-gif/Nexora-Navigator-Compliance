-- 000_baseline_prod.sql — schema public của project Supabase cũ (prod SpawnX, ref qalexzctwbezrbhasuvp)
-- Dump ngày 2026-11-09 bằng pg_dump 17.11 (server 17.11), chỉ đọc:
--   pg_dump "$PROD_DB_URL" --schema-only --schema=public --no-owner --quote-all-identifiers
-- Dùng THAY CHO supabase/schema.sql + 002–006 khi dựng DB mới (project MIS). Không áp lại lên prod.
-- Áp: psql "$MIS_DB_URL" -v ON_ERROR_STOP=1 -f supabase/migrations/000_baseline_prod.sql
-- Không có dữ liệu. Các dòng đã bỏ so với bản dump gốc (docs/mis/PLAN.md §1.2):
--   - \restrict / \unrestrict (pg_dump ≥ 17.6, chỉ psql 17 hiểu): 2 dòng
--   - CREATE SCHEMA public (đã có sẵn trên project Supabase): 1 dòng
--   - COMMENT ON SCHEMA public (cần quyền owner; giữ mặc định): 1 dòng
--   - ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin (postgres không có quyền; project mới đã có sẵn): 12 dòng
-- Thêm tay: khối REVOKE trước phần ACL (gỡ quyền mặc định Supabase của DB mới; xem chú thích tại chỗ).
-- Migration tiếp theo đánh số từ 007. Bảng / hàm mới phải tự REVOKE quyền thừa của anon, authenticated.

--
-- PostgreSQL database dump
--


-- Dumped from database version 17.11
-- Dumped by pg_dump version 17.11

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--



--
-- Name: SCHEMA "public"; Type: COMMENT; Schema: -; Owner: -
--



--
-- Name: giai_doan_thong_bao; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE "public"."giai_doan_thong_bao" AS ENUM (
    'cho_duyet',
    'hoi_bo_sung',
    'da_giao'
);


--
-- Name: kieu_thuoc_tinh; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE "public"."kieu_thuoc_tinh" AS ENUM (
    'boolean',
    'number',
    'text',
    'text_array'
);


--
-- Name: loai_entity; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE "public"."loai_entity" AS ENUM (
    'chu_the',
    'doi_tuong',
    'hanh_vi',
    'che_tai',
    'dieu_kien',
    'muc_thue',
    'thoi_han',
    'mien_giam',
    'nguong'
);


--
-- Name: loai_relationship; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE "public"."loai_relationship" AS ENUM (
    'bao_ham',
    'tham_chieu',
    'thay_the',
    'dieu_kien',
    'che_tai_cua',
    'ap_dung_cho'
);


--
-- Name: loai_van_ban; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE "public"."loai_van_ban" AS ENUM (
    'luat',
    'nghi_dinh',
    'thong_tu',
    'nghi_quyet',
    'quyet_dinh',
    'huong_dan',
    'khac'
);


--
-- Name: pham_vi_thay_the; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE "public"."pham_vi_thay_the" AS ENUM (
    'toan_bo',
    'mot_phan'
);


--
-- Name: pipeline_name; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE "public"."pipeline_name" AS ENUM (
    'extract_entities',
    'filter_domain',
    'generate_diagnostic'
);


--
-- Name: quy_mo; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE "public"."quy_mo" AS ENUM (
    'nho',
    'vua',
    'lon'
);


--
-- Name: slug_phong_ban; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE "public"."slug_phong_ban" AS ENUM (
    'ban_giam_doc',
    'ke_toan',
    'nhan_su',
    'kinh_doanh',
    'marketing',
    'cong_nghe',
    'van_hanh',
    'phap_che'
);


--
-- Name: trang_thai_ap_dung; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE "public"."trang_thai_ap_dung" AS ENUM (
    'ap_dung',
    'sap_ap_dung',
    'khong_ap_dung',
    'chua_du_thong_tin'
);


--
-- Name: trang_thai_chunk; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE "public"."trang_thai_chunk" AS ENUM (
    'cho_xu_ly',
    'dang_xu_ly',
    'da_trich_xuat',
    'hoan_tat',
    'loi'
);


--
-- Name: trang_thai_duyet; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE "public"."trang_thai_duyet" AS ENUM (
    'cho_duyet',
    'da_duyet',
    'tu_choi'
);


--
-- Name: trang_thai_run; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE "public"."trang_thai_run" AS ENUM (
    'cho_xu_ly',
    'dang_xu_ly',
    'hoan_tat',
    'loi'
);


--
-- Name: trang_thai_van_ban; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE "public"."trang_thai_van_ban" AS ENUM (
    'draft',
    'active',
    'replaced'
);


--
-- Name: approve_chunk("uuid", "text"); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."approve_chunk"("p_chunk_id" "uuid", "p_ghi_chu" "text" DEFAULT NULL::"text") RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
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


SET default_tablespace = '';

SET default_table_access_method = "heap";

--
-- Name: diagnostics; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."diagnostics" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "customer_id" "uuid" NOT NULL,
    "entity_id" "uuid" NOT NULL,
    "department_id" "uuid" NOT NULL,
    "trang_thai_ap_dung" "public"."trang_thai_ap_dung" NOT NULL,
    "thuoc_tinh_thieu" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "noi_dung_diagnostic" "text",
    "filter_run_id" "uuid" NOT NULL,
    "generate_run_id" "uuid",
    "trang_thai_duyet" "public"."trang_thai_duyet" DEFAULT 'cho_duyet'::"public"."trang_thai_duyet" NOT NULL,
    "nguoi_duyet_id" "uuid",
    "ghi_chu_duyet" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "diagnostics_duyet_khi_ap_dung" CHECK ((("trang_thai_duyet" <> 'da_duyet'::"public"."trang_thai_duyet") OR (("trang_thai_ap_dung" = ANY (ARRAY['ap_dung'::"public"."trang_thai_ap_dung", 'sap_ap_dung'::"public"."trang_thai_ap_dung"])) AND ("noi_dung_diagnostic" IS NOT NULL)))),
    CONSTRAINT "diagnostics_generate_co_run" CHECK ((("noi_dung_diagnostic" IS NULL) OR ("generate_run_id" IS NOT NULL))),
    CONSTRAINT "diagnostics_thieu_khi_chua_du" CHECK ((("trang_thai_ap_dung" = 'chua_du_thong_tin'::"public"."trang_thai_ap_dung") = ("cardinality"("thuoc_tinh_thieu") > 0)))
);


--
-- Name: TABLE "diagnostics"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE "public"."diagnostics" IS 'Checklist per hanh_vi × phòng ban. Draft (AI) → người đầu mối duyệt → giao phòng ban.';


--
-- Name: approve_diagnostic("uuid", "public"."trang_thai_duyet", "uuid", "text"); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."approve_diagnostic"("p_diagnostic_id" "uuid", "p_quyet_dinh" "public"."trang_thai_duyet", "p_department_id" "uuid" DEFAULT NULL::"uuid", "p_ghi_chu" "text" DEFAULT NULL::"text") RETURNS "public"."diagnostics"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
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


--
-- Name: entities; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."entities" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "chunk_id" "uuid" NOT NULL,
    "pipeline_run_id" "uuid" NOT NULL,
    "ma_tam" "text" NOT NULL,
    "ten_entity" "text" NOT NULL,
    "loai_entity" "public"."loai_entity" NOT NULL,
    "mo_ta" "text" NOT NULL,
    "so_dieu" integer NOT NULL,
    "dieu_khoan" "text" NOT NULL,
    "noi_dung_goc" "text" NOT NULL,
    "domain" "text" NOT NULL,
    "primary_departments" "public"."slug_phong_ban"[] DEFAULT '{}'::"public"."slug_phong_ban"[] NOT NULL,
    "secondary_departments" "public"."slug_phong_ban"[] DEFAULT '{}'::"public"."slug_phong_ban"[] NOT NULL,
    "ngay_co_hieu_luc" "date",
    "dieu_kien_may_doc" "jsonb",
    "trang_thai_duyet" "public"."trang_thai_duyet" DEFAULT 'cho_duyet'::"public"."trang_thai_duyet" NOT NULL,
    "curator_id" "uuid",
    "ghi_chu_curator" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "entities_dieu_kien_dung_loai" CHECK ((("dieu_kien_may_doc" IS NULL) OR ("loai_entity" = ANY (ARRAY['dieu_kien'::"public"."loai_entity", 'nguong'::"public"."loai_entity", 'chu_the'::"public"."loai_entity"])))),
    CONSTRAINT "entities_dieu_kien_duyet_phai_may_doc" CHECK ((("trang_thai_duyet" <> 'da_duyet'::"public"."trang_thai_duyet") OR ("loai_entity" <> ALL (ARRAY['dieu_kien'::"public"."loai_entity", 'nguong'::"public"."loai_entity"])) OR ("dieu_kien_may_doc" IS NOT NULL))),
    CONSTRAINT "entities_phong_ban_dung_loai" CHECK ((("loai_entity" = ANY (ARRAY['hanh_vi'::"public"."loai_entity", 'thoi_han'::"public"."loai_entity", 'che_tai'::"public"."loai_entity", 'mien_giam'::"public"."loai_entity"])) OR (("cardinality"("primary_departments") = 0) AND ("cardinality"("secondary_departments") = 0))))
);


--
-- Name: TABLE "entities"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE "public"."entities" IS 'Node graph. AI chỉ tạo draft cho_duyet; duyệt qua approve_entity()/approve_chunk(). Rule engine chỉ đọc entity da_duyet của van_ban active.';


--
-- Name: COLUMN "entities"."dieu_kien_may_doc"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN "public"."entities"."dieu_kien_may_doc" IS 'Điều kiện máy đọc cho rule engine (KHÔNG gọi AI). {"thuoc_tinh": <thuoc_tinh_ho_so.ma>, "toan_tu": ..., "gia_tri": ...}. toan_tu theo kieu thuộc tính: boolean → eq|neq; number → eq|neq|gt|gte|lt|lte|in|not_in; text → eq|neq|in|not_in; text_array → contains|contains_any. in/not_in/contains_any: gia_tri là mảng.';


--
-- Name: approve_entity("uuid", "public"."trang_thai_duyet", "text", boolean); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."approve_entity"("p_entity_id" "uuid", "p_quyet_dinh" "public"."trang_thai_duyet", "p_ghi_chu" "text" DEFAULT NULL::"text", "p_ap_dung_moi_doanh_nghiep" boolean DEFAULT false) RETURNS "public"."entities"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
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


--
-- Name: cap_nhat_trang_thai_chunk("uuid"); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."cap_nhat_trang_thai_chunk"("p_chunk_id" "uuid") RETURNS "void"
    LANGUAGE "sql"
    SET "search_path" TO ''
    AS $$
  update public.van_ban_chunks
     set trang_thai = 'hoan_tat'
   where id = p_chunk_id
     and trang_thai = 'da_trich_xuat'
     and not exists (select 1 from public.entities where chunk_id = p_chunk_id and trang_thai_duyet = 'cho_duyet');
$$;


--
-- Name: current_customer_id(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."current_customer_id"() RETURNS "uuid"
    LANGUAGE "sql" STABLE
    SET "search_path" TO ''
    AS $$
  select nullif(auth.jwt() -> 'app_metadata' ->> 'customer_id', '')::uuid
$$;


--
-- Name: dieu_kien_may_doc_hop_le("jsonb"); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."dieu_kien_may_doc_hop_le"("p" "jsonb") RETURNS "text"
    LANGUAGE "plpgsql" STABLE
    SET "search_path" TO ''
    AS $$
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


--
-- Name: guard_trang_thai_duyet(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."guard_trang_thai_duyet"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
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


--
-- Name: is_curator(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."is_curator"() RETURNS boolean
    LANGUAGE "sql" STABLE
    SET "search_path" TO ''
    AS $$
  select coalesce(auth.jwt() -> 'app_metadata' ->> 'nexora_role' = 'curator', false)
$$;


--
-- Name: khoa_diagnostic(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."khoa_diagnostic"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
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


--
-- Name: khoa_entity(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."khoa_entity"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
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


--
-- Name: khoa_pipeline_run(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."khoa_pipeline_run"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
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


--
-- Name: khoa_relationship(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."khoa_relationship"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
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


--
-- Name: kiem_tra_diagnostic(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."kiem_tra_diagnostic"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
begin
  if not exists (select 1 from public.entities
                  where id = new.entity_id and loai_entity = 'hanh_vi' and trang_thai_duyet = 'da_duyet') then
    raise exception 'Diagnostic chỉ tạo từ entity hanh_vi đã duyệt' using errcode = 'PT400';
  end if;
  return new;
end;
$$;


--
-- Name: kiem_tra_entity(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."kiem_tra_entity"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
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


--
-- Name: kiem_tra_thuoc_tinh_khach_hang(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."kiem_tra_thuoc_tinh_khach_hang"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
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


--
-- Name: onboard_customer("text", "text", "text", "public"."quy_mo", "text"[], "jsonb", "jsonb"); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."onboard_customer"("p_ten_cong_ty" "text", "p_ma_so_thue" "text", "p_nganh" "text", "p_quy_mo" "public"."quy_mo", "p_domains" "text"[], "p_thuoc_tinh" "jsonb", "p_phong_ban" "jsonb") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
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


--
-- Name: set_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
begin
  new.updated_at := now();
  return new;
end;
$$;


--
-- Name: thong_bao_diagnostic(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."thong_bao_diagnostic"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
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


--
-- Name: approvals; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."approvals" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "entity_id" "uuid",
    "diagnostic_id" "uuid",
    "customer_id" "uuid",
    "nguoi_duyet_id" "uuid" NOT NULL,
    "quyet_dinh" "public"."trang_thai_duyet" NOT NULL,
    "ghi_chu" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "approvals_diagnostic_co_customer" CHECK ((("diagnostic_id" IS NULL) OR ("customer_id" IS NOT NULL))),
    CONSTRAINT "approvals_dung_mot_doi_tuong" CHECK ((((("entity_id" IS NOT NULL))::integer + (("diagnostic_id" IS NOT NULL))::integer) = 1)),
    CONSTRAINT "approvals_quyet_dinh_hop_le" CHECK (("quyet_dinh" <> 'cho_duyet'::"public"."trang_thai_duyet"))
);


--
-- Name: TABLE "approvals"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE "public"."approvals" IS 'Audit log hành động duyệt của con người (curator duyệt entity, đầu mối duyệt diagnostic).';


--
-- Name: customers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."customers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "ten_cong_ty" "text" NOT NULL,
    "nganh" "text",
    "quy_mo" "public"."quy_mo",
    "domains" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "thuoc_tinh" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "ma_so_thue" "text",
    CONSTRAINT "customers_domain_slug" CHECK (("array_to_string"("domains", ','::"text") ~ '^([a-z_]+(,[a-z_]+)*)?$'::"text")),
    CONSTRAINT "customers_ma_so_thue_format" CHECK (("ma_so_thue" ~ '^[0-9]{10}(-[0-9]{3})?$'::"text")),
    CONSTRAINT "customers_thuoc_tinh_object" CHECK (("jsonb_typeof"("thuoc_tinh") = 'object'::"text"))
);


--
-- Name: TABLE "customers"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE "public"."customers" IS 'Doanh nghiệp khách hàng. domains = lĩnh vực đăng ký theo dõi; thuoc_tinh = câu trả lời onboarding/hỏi bổ sung.';


--
-- Name: COLUMN "customers"."ma_so_thue"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN "public"."customers"."ma_so_thue" IS 'Mã số thuế — 1 doanh nghiệp chỉ đăng ký 1 lần (unique).';


--
-- Name: departments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."departments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "customer_id" "uuid" NOT NULL,
    "ten_phong_ban" "text" NOT NULL,
    "slug_phong_ban" "public"."slug_phong_ban" NOT NULL,
    "email_head" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


--
-- Name: TABLE "departments"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE "public"."departments" IS 'Phòng ban của khách hàng. Nhiều phòng có thể chung 1 slug; diagnostic giao tới mọi phòng có slug khớp.';


--
-- Name: entity_relationships; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."entity_relationships" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "chunk_id" "uuid" NOT NULL,
    "pipeline_run_id" "uuid",
    "source_entity_id" "uuid" NOT NULL,
    "target_entity_id" "uuid",
    "target_ref_text" "text",
    "loai_relationship" "public"."loai_relationship" NOT NULL,
    "can_cu" "text" NOT NULL,
    "nguoi_tao_id" "uuid" DEFAULT "auth"."uid"(),
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "rel_co_dich" CHECK ((("target_entity_id" IS NOT NULL) OR ("target_ref_text" IS NOT NULL))),
    CONSTRAINT "rel_khong_tu_tro" CHECK (("source_entity_id" IS DISTINCT FROM "target_entity_id"))
);


--
-- Name: TABLE "entity_relationships"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE "public"."entity_relationships" IS 'Cạnh source → target. Rule engine chỉ dùng cạnh mà cả 2 đầu da_duyet. Nối pending link = curator cập nhật target_entity_id.';


--
-- Name: van_ban_chunks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."van_ban_chunks" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "van_ban_id" "uuid" NOT NULL,
    "thu_tu" integer NOT NULL,
    "tieu_de" "text",
    "dieu_khoan_range" "text",
    "noi_dung" "text" NOT NULL,
    "trang_thai" "public"."trang_thai_chunk" DEFAULT 'cho_xu_ly'::"public"."trang_thai_chunk" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "van_ban_chunks_thu_tu_duong" CHECK (("thu_tu" > 0))
);


--
-- Name: TABLE "van_ban_chunks"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE "public"."van_ban_chunks" IS 'cho_xu_ly → dang_xu_ly → da_trich_xuat (AI xong, chờ curator) → hoan_tat (hết entity cho_duyet) | loi.';


--
-- Name: entity_graph; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW "public"."entity_graph" WITH ("security_invoker"='true') AS
 SELECT "r"."id" AS "relationship_id",
    "r"."loai_relationship",
    "r"."chunk_id",
    "c"."van_ban_id",
    "s"."id" AS "source_id",
    "s"."ten_entity" AS "source_ten",
    "s"."loai_entity" AS "source_loai",
    "s"."trang_thai_duyet" AS "source_trang_thai_duyet",
    "t"."id" AS "target_id",
    "t"."ten_entity" AS "target_ten",
    "t"."loai_entity" AS "target_loai",
    "t"."trang_thai_duyet" AS "target_trang_thai_duyet",
    "r"."target_ref_text",
    ("r"."target_entity_id" IS NULL) AS "is_pending",
    "r"."can_cu"
   FROM ((("public"."entity_relationships" "r"
     JOIN "public"."van_ban_chunks" "c" ON (("c"."id" = "r"."chunk_id")))
     JOIN "public"."entities" "s" ON (("s"."id" = "r"."source_entity_id")))
     LEFT JOIN "public"."entities" "t" ON (("t"."id" = "r"."target_entity_id")));


--
-- Name: ner_extraction_summary; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW "public"."ner_extraction_summary" AS
SELECT
    NULL::"uuid" AS "chunk_id",
    NULL::"uuid" AS "van_ban_id",
    NULL::"text" AS "so_hieu",
    NULL::integer AS "thu_tu",
    NULL::"text" AS "dieu_khoan_range",
    NULL::"public"."trang_thai_chunk" AS "trang_thai_chunk",
    NULL::bigint AS "so_entity",
    NULL::bigint AS "so_cho_duyet",
    NULL::bigint AS "so_da_duyet",
    NULL::bigint AS "so_tu_choi",
    NULL::bigint AS "so_dieu_kien_chua_may_doc",
    NULL::"jsonb" AS "theo_loai",
    NULL::bigint AS "so_relationship",
    NULL::bigint AS "so_pending_link",
    NULL::bigint AS "so_can_dieu_kien";


--
-- Name: nganh; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."nganh" (
    "ma" "text" NOT NULL,
    "ten_hien_thi" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "nganh_ma_slug" CHECK (("ma" ~ '^[a-z][a-z_]*$'::"text"))
);


--
-- Name: TABLE "nganh"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE "public"."nganh" IS 'Tra cứu ngành: ma = customers.nganh, ten_hien_thi = nhãn tiếng Việt. Không FK — mã lạ thì hiện mã gốc.';


--
-- Name: notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."notifications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "customer_id" "uuid" NOT NULL,
    "diagnostic_id" "uuid" NOT NULL,
    "department_id" "uuid",
    "giai_doan" "public"."giai_doan_thong_bao" NOT NULL,
    "tieu_de" "text" NOT NULL,
    "noi_dung" "text",
    "da_doc" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "notifications_phong_ban_theo_giai_doan" CHECK ((("giai_doan" = 'da_giao'::"public"."giai_doan_thong_bao") = ("department_id" IS NOT NULL)))
);


--
-- Name: TABLE "notifications"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE "public"."notifications" IS 'Chỉ trigger/function tạo; client chỉ đánh dấu da_doc.';


--
-- Name: pipeline_runs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."pipeline_runs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "pipeline_name" "public"."pipeline_name" NOT NULL,
    "chunk_id" "uuid",
    "customer_id" "uuid",
    "parent_run_id" "uuid",
    "trang_thai" "public"."trang_thai_run" DEFAULT 'cho_xu_ly'::"public"."trang_thai_run" NOT NULL,
    "input" "jsonb" NOT NULL,
    "output" "jsonb",
    "model" "text",
    "prompt_version" "text",
    "error_log" "text",
    "nguoi_chay_id" "uuid" DEFAULT "auth"."uid"(),
    "started_at" timestamp with time zone,
    "completed_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "pipeline_runs_extract_theo_chunk" CHECK ((("pipeline_name" <> 'extract_entities'::"public"."pipeline_name") OR (("chunk_id" IS NOT NULL) AND ("customer_id" IS NULL)))),
    CONSTRAINT "pipeline_runs_khach_hang_co_customer" CHECK ((("pipeline_name" = 'extract_entities'::"public"."pipeline_name") OR ("customer_id" IS NOT NULL))),
    CONSTRAINT "pipeline_runs_loi_co_log" CHECK ((("trang_thai" <> 'loi'::"public"."trang_thai_run") OR ("error_log" IS NOT NULL))),
    CONSTRAINT "pipeline_runs_rule_engine_khong_ai" CHECK ((("pipeline_name" = 'filter_domain'::"public"."pipeline_name") = (("model" IS NULL) AND ("prompt_version" IS NULL)))),
    CONSTRAINT "pipeline_runs_xong_co_output" CHECK ((("trang_thai" <> 'hoan_tat'::"public"."trang_thai_run") OR (("output" IS NOT NULL) AND ("completed_at" IS NOT NULL))))
);


--
-- Name: TABLE "pipeline_runs"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE "public"."pipeline_runs" IS 'Log minh bạch mọi lần chạy extract/filter/generate: input, output, model, prompt_version, thời điểm. Đã hoan_tat/loi thì không sửa được nữa.';


--
-- Name: thuoc_tinh_ho_so; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."thuoc_tinh_ho_so" (
    "ma" "text" NOT NULL,
    "cau_hoi" "text" NOT NULL,
    "kieu" "public"."kieu_thuoc_tinh" NOT NULL,
    "domain" "text",
    "lua_chon" "text"[],
    "don_vi" "text",
    "mo_ta" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "thuoc_tinh_lua_chon_hop_kieu" CHECK ((("lua_chon" IS NULL) OR ("kieu" = ANY (ARRAY['text'::"public"."kieu_thuoc_tinh", 'text_array'::"public"."kieu_thuoc_tinh"])))),
    CONSTRAINT "thuoc_tinh_ma_slug" CHECK (("ma" ~ '^[a-z][a-z0-9_]*$'::"text"))
);


--
-- Name: TABLE "thuoc_tinh_ho_so"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE "public"."thuoc_tinh_ho_so" IS 'Từ điển thuộc tính onboarding. Thêm lĩnh vực luật mới = thêm row, không sửa form/pipeline.';


--
-- Name: van_ban; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."van_ban" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "ten_van_ban" "text" NOT NULL,
    "so_hieu" "text" NOT NULL,
    "loai_van_ban" "public"."loai_van_ban" NOT NULL,
    "co_quan_ban_hanh" "text",
    "ngay_ban_hanh" "date",
    "ngay_hieu_luc" "date" NOT NULL,
    "domains" "text"[] NOT NULL,
    "trang_thai" "public"."trang_thai_van_ban" DEFAULT 'draft'::"public"."trang_thai_van_ban" NOT NULL,
    "nguoi_tao_id" "uuid" DEFAULT "auth"."uid"(),
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "van_ban_co_domain" CHECK (("cardinality"("domains") >= 1)),
    CONSTRAINT "van_ban_domain_slug" CHECK (("array_to_string"("domains", ','::"text") ~ '^[a-z_]+(,[a-z_]+)*$'::"text"))
);


--
-- Name: TABLE "van_ban"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE "public"."van_ban" IS 'Văn bản pháp luật. Rule engine chỉ đọc entity của văn bản trang_thai = active. ngay_hieu_luc là ngày hiệu lực mặc định cho mọi entity (entity.ngay_co_hieu_luc ghi đè nếu có).';


--
-- Name: COLUMN "van_ban"."loai_van_ban"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN "public"."van_ban"."loai_van_ban" IS 'Loại văn bản: luat, nghi_dinh, thong_tu, nghi_quyet, quyet_dinh, huong_dan, khac (docs/CONTRACT.md §3.11).';


--
-- Name: van_ban_thay_the; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."van_ban_thay_the" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "van_ban_moi_id" "uuid" NOT NULL,
    "van_ban_cu_id" "uuid" NOT NULL,
    "pham_vi" "public"."pham_vi_thay_the" NOT NULL,
    "dieu_khoan" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "van_ban_thay_the_khac_nhau" CHECK (("van_ban_moi_id" <> "van_ban_cu_id")),
    CONSTRAINT "van_ban_thay_the_mot_phan_co_dieu" CHECK ((("pham_vi" = 'toan_bo'::"public"."pham_vi_thay_the") OR ("dieu_khoan" IS NOT NULL)))
);


--
-- Name: TABLE "van_ban_thay_the"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE "public"."van_ban_thay_the" IS 'Văn bản mới thay văn bản cũ (toàn bộ hoặc một phần). Thay toàn bộ → curator chuyển văn bản cũ sang replaced.';


--
-- Name: van_ban_replacement_chain; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW "public"."van_ban_replacement_chain" WITH ("security_invoker"='true') AS
 WITH RECURSIVE "chain" AS (
         SELECT "t"."van_ban_cu_id" AS "van_ban_goc_id",
            "t"."van_ban_moi_id" AS "van_ban_id",
            "t"."pham_vi",
            "t"."dieu_khoan",
            1 AS "do_sau",
            ARRAY["t"."van_ban_cu_id", "t"."van_ban_moi_id"] AS "duong_di"
           FROM "public"."van_ban_thay_the" "t"
        UNION ALL
         SELECT "ch_1"."van_ban_goc_id",
            "t"."van_ban_moi_id",
            "t"."pham_vi",
            "t"."dieu_khoan",
            ("ch_1"."do_sau" + 1),
            ("ch_1"."duong_di" || "t"."van_ban_moi_id")
           FROM ("chain" "ch_1"
             JOIN "public"."van_ban_thay_the" "t" ON (("t"."van_ban_cu_id" = "ch_1"."van_ban_id")))
          WHERE (NOT ("t"."van_ban_moi_id" = ANY ("ch_1"."duong_di")))
        )
 SELECT "ch"."van_ban_goc_id",
    "g"."so_hieu" AS "so_hieu_goc",
    "ch"."van_ban_id",
    "v"."so_hieu",
    "ch"."pham_vi",
    "ch"."dieu_khoan",
    "ch"."do_sau",
    "ch"."duong_di"
   FROM (("chain" "ch"
     JOIN "public"."van_ban" "g" ON (("g"."id" = "ch"."van_ban_goc_id")))
     JOIN "public"."van_ban" "v" ON (("v"."id" = "ch"."van_ban_id")));


--
-- Name: approvals approvals_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."approvals"
    ADD CONSTRAINT "approvals_pkey" PRIMARY KEY ("id");


--
-- Name: customers customers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."customers"
    ADD CONSTRAINT "customers_pkey" PRIMARY KEY ("id");


--
-- Name: departments departments_id_customer; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."departments"
    ADD CONSTRAINT "departments_id_customer" UNIQUE ("id", "customer_id");


--
-- Name: departments departments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."departments"
    ADD CONSTRAINT "departments_pkey" PRIMARY KEY ("id");


--
-- Name: departments departments_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."departments"
    ADD CONSTRAINT "departments_unique" UNIQUE ("customer_id", "ten_phong_ban");


--
-- Name: diagnostics diagnostics_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."diagnostics"
    ADD CONSTRAINT "diagnostics_pkey" PRIMARY KEY ("id");


--
-- Name: diagnostics diagnostics_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."diagnostics"
    ADD CONSTRAINT "diagnostics_unique" UNIQUE ("customer_id", "entity_id", "department_id");


--
-- Name: entities entities_ma_tam_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."entities"
    ADD CONSTRAINT "entities_ma_tam_unique" UNIQUE ("pipeline_run_id", "ma_tam");


--
-- Name: entities entities_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."entities"
    ADD CONSTRAINT "entities_pkey" PRIMARY KEY ("id");


--
-- Name: entity_relationships entity_relationships_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."entity_relationships"
    ADD CONSTRAINT "entity_relationships_pkey" PRIMARY KEY ("id");


--
-- Name: nganh nganh_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."nganh"
    ADD CONSTRAINT "nganh_pkey" PRIMARY KEY ("ma");


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_pkey" PRIMARY KEY ("id");


--
-- Name: pipeline_runs pipeline_runs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."pipeline_runs"
    ADD CONSTRAINT "pipeline_runs_pkey" PRIMARY KEY ("id");


--
-- Name: thuoc_tinh_ho_so thuoc_tinh_ho_so_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."thuoc_tinh_ho_so"
    ADD CONSTRAINT "thuoc_tinh_ho_so_pkey" PRIMARY KEY ("ma");


--
-- Name: van_ban_chunks van_ban_chunks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."van_ban_chunks"
    ADD CONSTRAINT "van_ban_chunks_pkey" PRIMARY KEY ("id");


--
-- Name: van_ban_chunks van_ban_chunks_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."van_ban_chunks"
    ADD CONSTRAINT "van_ban_chunks_unique" UNIQUE ("van_ban_id", "thu_tu");


--
-- Name: van_ban van_ban_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."van_ban"
    ADD CONSTRAINT "van_ban_pkey" PRIMARY KEY ("id");


--
-- Name: van_ban van_ban_so_hieu_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."van_ban"
    ADD CONSTRAINT "van_ban_so_hieu_key" UNIQUE ("so_hieu");


--
-- Name: van_ban_thay_the van_ban_thay_the_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."van_ban_thay_the"
    ADD CONSTRAINT "van_ban_thay_the_pkey" PRIMARY KEY ("id");


--
-- Name: van_ban_thay_the van_ban_thay_the_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."van_ban_thay_the"
    ADD CONSTRAINT "van_ban_thay_the_unique" UNIQUE NULLS NOT DISTINCT ("van_ban_moi_id", "van_ban_cu_id", "dieu_khoan");


--
-- Name: approvals_customer_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "approvals_customer_idx" ON "public"."approvals" USING "btree" ("customer_id");


--
-- Name: approvals_diagnostic_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "approvals_diagnostic_idx" ON "public"."approvals" USING "btree" ("diagnostic_id");


--
-- Name: approvals_entity_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "approvals_entity_idx" ON "public"."approvals" USING "btree" ("entity_id");


--
-- Name: customers_ma_so_thue_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "customers_ma_so_thue_key" ON "public"."customers" USING "btree" ("ma_so_thue") WHERE ("ma_so_thue" IS NOT NULL);


--
-- Name: departments_customer_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "departments_customer_idx" ON "public"."departments" USING "btree" ("customer_id", "slug_phong_ban");


--
-- Name: diagnostics_customer_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "diagnostics_customer_idx" ON "public"."diagnostics" USING "btree" ("customer_id", "trang_thai_duyet", "trang_thai_ap_dung");


--
-- Name: diagnostics_department_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "diagnostics_department_idx" ON "public"."diagnostics" USING "btree" ("department_id");


--
-- Name: diagnostics_entity_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "diagnostics_entity_idx" ON "public"."diagnostics" USING "btree" ("entity_id");


--
-- Name: entities_chunk_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "entities_chunk_idx" ON "public"."entities" USING "btree" ("chunk_id");


--
-- Name: entities_domain_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "entities_domain_idx" ON "public"."entities" USING "btree" ("domain") WHERE ("trang_thai_duyet" = 'da_duyet'::"public"."trang_thai_duyet");


--
-- Name: entities_duyet_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "entities_duyet_idx" ON "public"."entities" USING "btree" ("trang_thai_duyet", "loai_entity");


--
-- Name: entities_run_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "entities_run_idx" ON "public"."entities" USING "btree" ("pipeline_run_id");


--
-- Name: notifications_customer_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "notifications_customer_idx" ON "public"."notifications" USING "btree" ("customer_id", "da_doc", "created_at" DESC);


--
-- Name: notifications_department_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "notifications_department_idx" ON "public"."notifications" USING "btree" ("department_id");


--
-- Name: pipeline_runs_chunk_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "pipeline_runs_chunk_idx" ON "public"."pipeline_runs" USING "btree" ("chunk_id", "created_at" DESC);


--
-- Name: pipeline_runs_customer_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "pipeline_runs_customer_idx" ON "public"."pipeline_runs" USING "btree" ("customer_id", "created_at" DESC);


--
-- Name: pipeline_runs_name_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "pipeline_runs_name_idx" ON "public"."pipeline_runs" USING "btree" ("pipeline_name", "created_at" DESC);


--
-- Name: pipeline_runs_parent_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "pipeline_runs_parent_idx" ON "public"."pipeline_runs" USING "btree" ("parent_run_id");


--
-- Name: rel_chunk_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "rel_chunk_idx" ON "public"."entity_relationships" USING "btree" ("chunk_id");


--
-- Name: rel_pending_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "rel_pending_idx" ON "public"."entity_relationships" USING "btree" ("chunk_id") WHERE ("target_entity_id" IS NULL);


--
-- Name: rel_source_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "rel_source_idx" ON "public"."entity_relationships" USING "btree" ("source_entity_id");


--
-- Name: rel_target_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "rel_target_idx" ON "public"."entity_relationships" USING "btree" ("target_entity_id");


--
-- Name: rel_unique_edge; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "rel_unique_edge" ON "public"."entity_relationships" USING "btree" ("source_entity_id", "target_entity_id", "loai_relationship") WHERE ("target_entity_id" IS NOT NULL);


--
-- Name: van_ban_chunks_van_ban_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "van_ban_chunks_van_ban_idx" ON "public"."van_ban_chunks" USING "btree" ("van_ban_id", "thu_tu");


--
-- Name: van_ban_thay_the_cu_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "van_ban_thay_the_cu_idx" ON "public"."van_ban_thay_the" USING "btree" ("van_ban_cu_id");


--
-- Name: ner_extraction_summary _RETURN; Type: RULE; Schema: public; Owner: -
--

CREATE OR REPLACE VIEW "public"."ner_extraction_summary" WITH ("security_invoker"='true') AS
 SELECT "c"."id" AS "chunk_id",
    "c"."van_ban_id",
    "v"."so_hieu",
    "c"."thu_tu",
    "c"."dieu_khoan_range",
    "c"."trang_thai" AS "trang_thai_chunk",
    "count"("e"."id") AS "so_entity",
    "count"("e"."id") FILTER (WHERE ("e"."trang_thai_duyet" = 'cho_duyet'::"public"."trang_thai_duyet")) AS "so_cho_duyet",
    "count"("e"."id") FILTER (WHERE ("e"."trang_thai_duyet" = 'da_duyet'::"public"."trang_thai_duyet")) AS "so_da_duyet",
    "count"("e"."id") FILTER (WHERE ("e"."trang_thai_duyet" = 'tu_choi'::"public"."trang_thai_duyet")) AS "so_tu_choi",
    "count"("e"."id") FILTER (WHERE (("e"."trang_thai_duyet" = 'cho_duyet'::"public"."trang_thai_duyet") AND ("e"."loai_entity" = ANY (ARRAY['dieu_kien'::"public"."loai_entity", 'nguong'::"public"."loai_entity"])) AND ("e"."dieu_kien_may_doc" IS NULL))) AS "so_dieu_kien_chua_may_doc",
    COALESCE(( SELECT "jsonb_object_agg"("x"."loai_entity", "x"."n") AS "jsonb_object_agg"
           FROM ( SELECT "entities"."loai_entity",
                    "count"(*) AS "n"
                   FROM "public"."entities"
                  WHERE ("entities"."chunk_id" = "c"."id")
                  GROUP BY "entities"."loai_entity") "x"), '{}'::"jsonb") AS "theo_loai",
    ( SELECT "count"(*) AS "count"
           FROM "public"."entity_relationships" "r"
          WHERE ("r"."chunk_id" = "c"."id")) AS "so_relationship",
    ( SELECT "count"(*) AS "count"
           FROM "public"."entity_relationships" "r"
          WHERE (("r"."chunk_id" = "c"."id") AND ("r"."target_entity_id" IS NULL))) AS "so_pending_link",
    "count"("e"."id") FILTER (WHERE (("e"."trang_thai_duyet" = 'cho_duyet'::"public"."trang_thai_duyet") AND ("e"."loai_entity" = ANY (ARRAY['dieu_kien'::"public"."loai_entity", 'nguong'::"public"."loai_entity", 'chu_the'::"public"."loai_entity"])) AND ("e"."dieu_kien_may_doc" IS NULL))) AS "so_can_dieu_kien"
   FROM (("public"."van_ban_chunks" "c"
     JOIN "public"."van_ban" "v" ON (("v"."id" = "c"."van_ban_id")))
     LEFT JOIN "public"."entities" "e" ON (("e"."chunk_id" = "c"."id")))
  GROUP BY "c"."id", "v"."so_hieu";


--
-- Name: customers customers_kiem_tra_thuoc_tinh; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER "customers_kiem_tra_thuoc_tinh" BEFORE INSERT OR UPDATE OF "thuoc_tinh" ON "public"."customers" FOR EACH ROW EXECUTE FUNCTION "public"."kiem_tra_thuoc_tinh_khach_hang"();


--
-- Name: customers customers_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER "customers_updated_at" BEFORE UPDATE ON "public"."customers" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();


--
-- Name: diagnostics diagnostics_guard_trang_thai_duyet; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER "diagnostics_guard_trang_thai_duyet" BEFORE INSERT OR UPDATE ON "public"."diagnostics" FOR EACH ROW EXECUTE FUNCTION "public"."guard_trang_thai_duyet"();


--
-- Name: diagnostics diagnostics_khoa_noi_dung; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER "diagnostics_khoa_noi_dung" BEFORE UPDATE ON "public"."diagnostics" FOR EACH ROW EXECUTE FUNCTION "public"."khoa_diagnostic"();


--
-- Name: diagnostics diagnostics_kiem_tra; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER "diagnostics_kiem_tra" BEFORE INSERT OR UPDATE OF "entity_id" ON "public"."diagnostics" FOR EACH ROW EXECUTE FUNCTION "public"."kiem_tra_diagnostic"();


--
-- Name: diagnostics diagnostics_thong_bao; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER "diagnostics_thong_bao" AFTER INSERT OR UPDATE OF "trang_thai_ap_dung", "thuoc_tinh_thieu", "noi_dung_diagnostic" ON "public"."diagnostics" FOR EACH ROW EXECUTE FUNCTION "public"."thong_bao_diagnostic"();


--
-- Name: diagnostics diagnostics_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER "diagnostics_updated_at" BEFORE UPDATE ON "public"."diagnostics" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();


--
-- Name: entities entities_guard_trang_thai_duyet; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER "entities_guard_trang_thai_duyet" BEFORE INSERT OR UPDATE ON "public"."entities" FOR EACH ROW EXECUTE FUNCTION "public"."guard_trang_thai_duyet"();


--
-- Name: entities entities_khoa_noi_dung; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER "entities_khoa_noi_dung" BEFORE UPDATE ON "public"."entities" FOR EACH ROW EXECUTE FUNCTION "public"."khoa_entity"();


--
-- Name: entities entities_kiem_tra; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER "entities_kiem_tra" BEFORE INSERT OR UPDATE OF "domain", "chunk_id", "dieu_kien_may_doc" ON "public"."entities" FOR EACH ROW EXECUTE FUNCTION "public"."kiem_tra_entity"();


--
-- Name: entities entities_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER "entities_updated_at" BEFORE UPDATE ON "public"."entities" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();


--
-- Name: pipeline_runs pipeline_runs_khoa; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER "pipeline_runs_khoa" BEFORE UPDATE ON "public"."pipeline_runs" FOR EACH ROW EXECUTE FUNCTION "public"."khoa_pipeline_run"();


--
-- Name: entity_relationships rel_khoa; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER "rel_khoa" BEFORE DELETE OR UPDATE ON "public"."entity_relationships" FOR EACH ROW EXECUTE FUNCTION "public"."khoa_relationship"();


--
-- Name: van_ban_chunks van_ban_chunks_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER "van_ban_chunks_updated_at" BEFORE UPDATE ON "public"."van_ban_chunks" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();


--
-- Name: van_ban van_ban_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER "van_ban_updated_at" BEFORE UPDATE ON "public"."van_ban" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();


--
-- Name: approvals approvals_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."approvals"
    ADD CONSTRAINT "approvals_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE CASCADE;


--
-- Name: approvals approvals_diagnostic_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."approvals"
    ADD CONSTRAINT "approvals_diagnostic_id_fkey" FOREIGN KEY ("diagnostic_id") REFERENCES "public"."diagnostics"("id") ON DELETE CASCADE;


--
-- Name: approvals approvals_entity_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."approvals"
    ADD CONSTRAINT "approvals_entity_id_fkey" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE CASCADE;


--
-- Name: approvals approvals_nguoi_duyet_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."approvals"
    ADD CONSTRAINT "approvals_nguoi_duyet_id_fkey" FOREIGN KEY ("nguoi_duyet_id") REFERENCES "auth"."users"("id");


--
-- Name: departments departments_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."departments"
    ADD CONSTRAINT "departments_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE CASCADE;


--
-- Name: diagnostics diagnostics_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."diagnostics"
    ADD CONSTRAINT "diagnostics_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE CASCADE;


--
-- Name: diagnostics diagnostics_department_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."diagnostics"
    ADD CONSTRAINT "diagnostics_department_fk" FOREIGN KEY ("department_id", "customer_id") REFERENCES "public"."departments"("id", "customer_id") ON DELETE CASCADE;


--
-- Name: diagnostics diagnostics_entity_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."diagnostics"
    ADD CONSTRAINT "diagnostics_entity_id_fkey" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE RESTRICT;


--
-- Name: diagnostics diagnostics_filter_run_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."diagnostics"
    ADD CONSTRAINT "diagnostics_filter_run_id_fkey" FOREIGN KEY ("filter_run_id") REFERENCES "public"."pipeline_runs"("id") ON DELETE RESTRICT;


--
-- Name: diagnostics diagnostics_generate_run_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."diagnostics"
    ADD CONSTRAINT "diagnostics_generate_run_id_fkey" FOREIGN KEY ("generate_run_id") REFERENCES "public"."pipeline_runs"("id") ON DELETE RESTRICT;


--
-- Name: diagnostics diagnostics_nguoi_duyet_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."diagnostics"
    ADD CONSTRAINT "diagnostics_nguoi_duyet_id_fkey" FOREIGN KEY ("nguoi_duyet_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;


--
-- Name: entities entities_chunk_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."entities"
    ADD CONSTRAINT "entities_chunk_id_fkey" FOREIGN KEY ("chunk_id") REFERENCES "public"."van_ban_chunks"("id") ON DELETE RESTRICT;


--
-- Name: entities entities_curator_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."entities"
    ADD CONSTRAINT "entities_curator_id_fkey" FOREIGN KEY ("curator_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;


--
-- Name: entities entities_pipeline_run_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."entities"
    ADD CONSTRAINT "entities_pipeline_run_id_fkey" FOREIGN KEY ("pipeline_run_id") REFERENCES "public"."pipeline_runs"("id") ON DELETE RESTRICT;


--
-- Name: entity_relationships entity_relationships_chunk_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."entity_relationships"
    ADD CONSTRAINT "entity_relationships_chunk_id_fkey" FOREIGN KEY ("chunk_id") REFERENCES "public"."van_ban_chunks"("id") ON DELETE RESTRICT;


--
-- Name: entity_relationships entity_relationships_nguoi_tao_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."entity_relationships"
    ADD CONSTRAINT "entity_relationships_nguoi_tao_id_fkey" FOREIGN KEY ("nguoi_tao_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;


--
-- Name: entity_relationships entity_relationships_pipeline_run_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."entity_relationships"
    ADD CONSTRAINT "entity_relationships_pipeline_run_id_fkey" FOREIGN KEY ("pipeline_run_id") REFERENCES "public"."pipeline_runs"("id") ON DELETE RESTRICT;


--
-- Name: entity_relationships entity_relationships_source_entity_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."entity_relationships"
    ADD CONSTRAINT "entity_relationships_source_entity_id_fkey" FOREIGN KEY ("source_entity_id") REFERENCES "public"."entities"("id") ON DELETE CASCADE;


--
-- Name: entity_relationships entity_relationships_target_entity_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."entity_relationships"
    ADD CONSTRAINT "entity_relationships_target_entity_id_fkey" FOREIGN KEY ("target_entity_id") REFERENCES "public"."entities"("id") ON DELETE CASCADE;


--
-- Name: notifications notifications_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE CASCADE;


--
-- Name: notifications notifications_department_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE CASCADE;


--
-- Name: notifications notifications_diagnostic_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_diagnostic_id_fkey" FOREIGN KEY ("diagnostic_id") REFERENCES "public"."diagnostics"("id") ON DELETE CASCADE;


--
-- Name: pipeline_runs pipeline_runs_chunk_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."pipeline_runs"
    ADD CONSTRAINT "pipeline_runs_chunk_id_fkey" FOREIGN KEY ("chunk_id") REFERENCES "public"."van_ban_chunks"("id") ON DELETE SET NULL;


--
-- Name: pipeline_runs pipeline_runs_customer_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."pipeline_runs"
    ADD CONSTRAINT "pipeline_runs_customer_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE CASCADE;


--
-- Name: pipeline_runs pipeline_runs_nguoi_chay_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."pipeline_runs"
    ADD CONSTRAINT "pipeline_runs_nguoi_chay_id_fkey" FOREIGN KEY ("nguoi_chay_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;


--
-- Name: pipeline_runs pipeline_runs_parent_run_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."pipeline_runs"
    ADD CONSTRAINT "pipeline_runs_parent_run_id_fkey" FOREIGN KEY ("parent_run_id") REFERENCES "public"."pipeline_runs"("id") ON DELETE SET NULL;


--
-- Name: van_ban_chunks van_ban_chunks_van_ban_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."van_ban_chunks"
    ADD CONSTRAINT "van_ban_chunks_van_ban_id_fkey" FOREIGN KEY ("van_ban_id") REFERENCES "public"."van_ban"("id") ON DELETE CASCADE;


--
-- Name: van_ban van_ban_nguoi_tao_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."van_ban"
    ADD CONSTRAINT "van_ban_nguoi_tao_id_fkey" FOREIGN KEY ("nguoi_tao_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;


--
-- Name: van_ban_thay_the van_ban_thay_the_van_ban_cu_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."van_ban_thay_the"
    ADD CONSTRAINT "van_ban_thay_the_van_ban_cu_id_fkey" FOREIGN KEY ("van_ban_cu_id") REFERENCES "public"."van_ban"("id") ON DELETE CASCADE;


--
-- Name: van_ban_thay_the van_ban_thay_the_van_ban_moi_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."van_ban_thay_the"
    ADD CONSTRAINT "van_ban_thay_the_van_ban_moi_id_fkey" FOREIGN KEY ("van_ban_moi_id") REFERENCES "public"."van_ban"("id") ON DELETE CASCADE;


--
-- Name: approvals; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."approvals" ENABLE ROW LEVEL SECURITY;

--
-- Name: approvals approvals_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "approvals_select" ON "public"."approvals" FOR SELECT TO "authenticated" USING ((("customer_id" = ( SELECT "public"."current_customer_id"() AS "current_customer_id")) OR ( SELECT "public"."is_curator"() AS "is_curator")));


--
-- Name: van_ban_chunks chunks_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "chunks_insert" ON "public"."van_ban_chunks" FOR INSERT TO "authenticated" WITH CHECK (( SELECT "public"."is_curator"() AS "is_curator"));


--
-- Name: van_ban_chunks chunks_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "chunks_select" ON "public"."van_ban_chunks" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."van_ban" "v"
  WHERE ("v"."id" = "van_ban_chunks"."van_ban_id"))));


--
-- Name: van_ban_chunks chunks_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "chunks_update" ON "public"."van_ban_chunks" FOR UPDATE TO "authenticated" USING (( SELECT "public"."is_curator"() AS "is_curator")) WITH CHECK (( SELECT "public"."is_curator"() AS "is_curator"));


--
-- Name: customers; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."customers" ENABLE ROW LEVEL SECURITY;

--
-- Name: customers customers_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "customers_insert" ON "public"."customers" FOR INSERT TO "authenticated" WITH CHECK (( SELECT "public"."is_curator"() AS "is_curator"));


--
-- Name: customers customers_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "customers_select" ON "public"."customers" FOR SELECT TO "authenticated" USING ((("id" = ( SELECT "public"."current_customer_id"() AS "current_customer_id")) OR ( SELECT "public"."is_curator"() AS "is_curator")));


--
-- Name: customers customers_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "customers_update" ON "public"."customers" FOR UPDATE TO "authenticated" USING ((("id" = ( SELECT "public"."current_customer_id"() AS "current_customer_id")) OR ( SELECT "public"."is_curator"() AS "is_curator"))) WITH CHECK ((("id" = ( SELECT "public"."current_customer_id"() AS "current_customer_id")) OR ( SELECT "public"."is_curator"() AS "is_curator")));


--
-- Name: departments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."departments" ENABLE ROW LEVEL SECURITY;

--
-- Name: departments departments_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "departments_insert" ON "public"."departments" FOR INSERT TO "authenticated" WITH CHECK (("customer_id" = ( SELECT "public"."current_customer_id"() AS "current_customer_id")));


--
-- Name: departments departments_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "departments_select" ON "public"."departments" FOR SELECT TO "authenticated" USING ((("customer_id" = ( SELECT "public"."current_customer_id"() AS "current_customer_id")) OR ( SELECT "public"."is_curator"() AS "is_curator")));


--
-- Name: departments departments_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "departments_update" ON "public"."departments" FOR UPDATE TO "authenticated" USING (("customer_id" = ( SELECT "public"."current_customer_id"() AS "current_customer_id"))) WITH CHECK (("customer_id" = ( SELECT "public"."current_customer_id"() AS "current_customer_id")));


--
-- Name: diagnostics; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."diagnostics" ENABLE ROW LEVEL SECURITY;

--
-- Name: diagnostics diagnostics_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "diagnostics_insert" ON "public"."diagnostics" FOR INSERT TO "authenticated" WITH CHECK ((("customer_id" = ( SELECT "public"."current_customer_id"() AS "current_customer_id")) OR ( SELECT "public"."is_curator"() AS "is_curator")));


--
-- Name: diagnostics diagnostics_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "diagnostics_select" ON "public"."diagnostics" FOR SELECT TO "authenticated" USING ((("customer_id" = ( SELECT "public"."current_customer_id"() AS "current_customer_id")) OR ( SELECT "public"."is_curator"() AS "is_curator")));


--
-- Name: diagnostics diagnostics_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "diagnostics_update" ON "public"."diagnostics" FOR UPDATE TO "authenticated" USING ((("customer_id" = ( SELECT "public"."current_customer_id"() AS "current_customer_id")) OR ( SELECT "public"."is_curator"() AS "is_curator"))) WITH CHECK ((("customer_id" = ( SELECT "public"."current_customer_id"() AS "current_customer_id")) OR ( SELECT "public"."is_curator"() AS "is_curator")));


--
-- Name: entities; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."entities" ENABLE ROW LEVEL SECURITY;

--
-- Name: entities entities_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "entities_insert" ON "public"."entities" FOR INSERT TO "authenticated" WITH CHECK (( SELECT "public"."is_curator"() AS "is_curator"));


--
-- Name: entities entities_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "entities_select" ON "public"."entities" FOR SELECT TO "authenticated" USING ((("trang_thai_duyet" = 'da_duyet'::"public"."trang_thai_duyet") OR ( SELECT "public"."is_curator"() AS "is_curator")));


--
-- Name: entities entities_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "entities_update" ON "public"."entities" FOR UPDATE TO "authenticated" USING (( SELECT "public"."is_curator"() AS "is_curator")) WITH CHECK (( SELECT "public"."is_curator"() AS "is_curator"));


--
-- Name: entity_relationships; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."entity_relationships" ENABLE ROW LEVEL SECURITY;

--
-- Name: nganh; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."nganh" ENABLE ROW LEVEL SECURITY;

--
-- Name: nganh nganh_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "nganh_insert" ON "public"."nganh" FOR INSERT TO "authenticated" WITH CHECK (( SELECT "public"."is_curator"() AS "is_curator"));


--
-- Name: nganh nganh_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "nganh_select" ON "public"."nganh" FOR SELECT TO "authenticated" USING (true);


--
-- Name: nganh nganh_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "nganh_update" ON "public"."nganh" FOR UPDATE TO "authenticated" USING (( SELECT "public"."is_curator"() AS "is_curator")) WITH CHECK (( SELECT "public"."is_curator"() AS "is_curator"));


--
-- Name: notifications; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."notifications" ENABLE ROW LEVEL SECURITY;

--
-- Name: notifications notifications_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "notifications_select" ON "public"."notifications" FOR SELECT TO "authenticated" USING (("customer_id" = ( SELECT "public"."current_customer_id"() AS "current_customer_id")));


--
-- Name: notifications notifications_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "notifications_update" ON "public"."notifications" FOR UPDATE TO "authenticated" USING (("customer_id" = ( SELECT "public"."current_customer_id"() AS "current_customer_id"))) WITH CHECK (("customer_id" = ( SELECT "public"."current_customer_id"() AS "current_customer_id")));


--
-- Name: pipeline_runs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."pipeline_runs" ENABLE ROW LEVEL SECURITY;

--
-- Name: pipeline_runs pipeline_runs_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "pipeline_runs_insert" ON "public"."pipeline_runs" FOR INSERT TO "authenticated" WITH CHECK ((("nguoi_chay_id" = ( SELECT "auth"."uid"() AS "uid")) AND (( SELECT "public"."is_curator"() AS "is_curator") OR (("customer_id" = ( SELECT "public"."current_customer_id"() AS "current_customer_id")) AND ("pipeline_name" <> 'extract_entities'::"public"."pipeline_name")))));


--
-- Name: pipeline_runs pipeline_runs_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "pipeline_runs_select" ON "public"."pipeline_runs" FOR SELECT TO "authenticated" USING ((("customer_id" = ( SELECT "public"."current_customer_id"() AS "current_customer_id")) OR ( SELECT "public"."is_curator"() AS "is_curator")));


--
-- Name: pipeline_runs pipeline_runs_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "pipeline_runs_update" ON "public"."pipeline_runs" FOR UPDATE TO "authenticated" USING (("nguoi_chay_id" = ( SELECT "auth"."uid"() AS "uid"))) WITH CHECK (("nguoi_chay_id" = ( SELECT "auth"."uid"() AS "uid")));


--
-- Name: entity_relationships rel_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "rel_delete" ON "public"."entity_relationships" FOR DELETE TO "authenticated" USING (( SELECT "public"."is_curator"() AS "is_curator"));


--
-- Name: entity_relationships rel_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "rel_insert" ON "public"."entity_relationships" FOR INSERT TO "authenticated" WITH CHECK (( SELECT "public"."is_curator"() AS "is_curator"));


--
-- Name: entity_relationships rel_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "rel_select" ON "public"."entity_relationships" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."entities" "e"
  WHERE ("e"."id" = "entity_relationships"."source_entity_id"))));


--
-- Name: entity_relationships rel_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "rel_update" ON "public"."entity_relationships" FOR UPDATE TO "authenticated" USING (( SELECT "public"."is_curator"() AS "is_curator")) WITH CHECK (( SELECT "public"."is_curator"() AS "is_curator"));


--
-- Name: thuoc_tinh_ho_so; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."thuoc_tinh_ho_so" ENABLE ROW LEVEL SECURITY;

--
-- Name: thuoc_tinh_ho_so thuoc_tinh_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "thuoc_tinh_insert" ON "public"."thuoc_tinh_ho_so" FOR INSERT TO "authenticated" WITH CHECK (( SELECT "public"."is_curator"() AS "is_curator"));


--
-- Name: thuoc_tinh_ho_so thuoc_tinh_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "thuoc_tinh_select" ON "public"."thuoc_tinh_ho_so" FOR SELECT TO "authenticated" USING (true);


--
-- Name: thuoc_tinh_ho_so thuoc_tinh_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "thuoc_tinh_update" ON "public"."thuoc_tinh_ho_so" FOR UPDATE TO "authenticated" USING (( SELECT "public"."is_curator"() AS "is_curator")) WITH CHECK (( SELECT "public"."is_curator"() AS "is_curator"));


--
-- Name: van_ban; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."van_ban" ENABLE ROW LEVEL SECURITY;

--
-- Name: van_ban_chunks; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."van_ban_chunks" ENABLE ROW LEVEL SECURITY;

--
-- Name: van_ban van_ban_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "van_ban_insert" ON "public"."van_ban" FOR INSERT TO "authenticated" WITH CHECK (( SELECT "public"."is_curator"() AS "is_curator"));


--
-- Name: van_ban van_ban_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "van_ban_select" ON "public"."van_ban" FOR SELECT TO "authenticated" USING ((("trang_thai" <> 'draft'::"public"."trang_thai_van_ban") OR ( SELECT "public"."is_curator"() AS "is_curator")));


--
-- Name: van_ban_thay_the; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."van_ban_thay_the" ENABLE ROW LEVEL SECURITY;

--
-- Name: van_ban_thay_the van_ban_thay_the_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "van_ban_thay_the_delete" ON "public"."van_ban_thay_the" FOR DELETE TO "authenticated" USING (( SELECT "public"."is_curator"() AS "is_curator"));


--
-- Name: van_ban_thay_the van_ban_thay_the_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "van_ban_thay_the_insert" ON "public"."van_ban_thay_the" FOR INSERT TO "authenticated" WITH CHECK (( SELECT "public"."is_curator"() AS "is_curator"));


--
-- Name: van_ban_thay_the van_ban_thay_the_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "van_ban_thay_the_select" ON "public"."van_ban_thay_the" FOR SELECT TO "authenticated" USING (true);


--
-- Name: van_ban van_ban_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "van_ban_update" ON "public"."van_ban" FOR UPDATE TO "authenticated" USING (( SELECT "public"."is_curator"() AS "is_curator")) WITH CHECK (( SELECT "public"."is_curator"() AS "is_curator"));


--
-- Thêm tay (H1): gỡ quyền mặc định của project Supabase mới. Mỗi bảng / hàm tạo ở trên đã tự nhận ALL / EXECUTE cho
-- anon, authenticated qua ALTER DEFAULT PRIVILEGES; prod đã REVOKE bớt bằng migration 002–006 nhưng pg_dump không ghi
-- REVOKE đó. Gỡ hết ở đây, các GRANT ngay dưới (từ dump) cấp lại đúng quyền của prod. Kiểm: scripts/mis/so-sanh-schema.mjs.
--

REVOKE ALL ON ALL TABLES IN SCHEMA "public" FROM "anon", "authenticated";
REVOKE ALL ON ALL SEQUENCES IN SCHEMA "public" FROM "anon", "authenticated";
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA "public" FROM "anon", "authenticated";


--
-- Name: SCHEMA "public"; Type: ACL; Schema: -; Owner: -
--

GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";


--
-- Name: FUNCTION "approve_chunk"("p_chunk_id" "uuid", "p_ghi_chu" "text"); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION "public"."approve_chunk"("p_chunk_id" "uuid", "p_ghi_chu" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."approve_chunk"("p_chunk_id" "uuid", "p_ghi_chu" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."approve_chunk"("p_chunk_id" "uuid", "p_ghi_chu" "text") TO "service_role";


--
-- Name: TABLE "diagnostics"; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."diagnostics" TO "authenticated";
GRANT ALL ON TABLE "public"."diagnostics" TO "service_role";


--
-- Name: COLUMN "diagnostics"."department_id"; Type: ACL; Schema: public; Owner: -
--

GRANT UPDATE("department_id") ON TABLE "public"."diagnostics" TO "authenticated";


--
-- Name: COLUMN "diagnostics"."trang_thai_ap_dung"; Type: ACL; Schema: public; Owner: -
--

GRANT UPDATE("trang_thai_ap_dung") ON TABLE "public"."diagnostics" TO "authenticated";


--
-- Name: COLUMN "diagnostics"."thuoc_tinh_thieu"; Type: ACL; Schema: public; Owner: -
--

GRANT UPDATE("thuoc_tinh_thieu") ON TABLE "public"."diagnostics" TO "authenticated";


--
-- Name: COLUMN "diagnostics"."noi_dung_diagnostic"; Type: ACL; Schema: public; Owner: -
--

GRANT UPDATE("noi_dung_diagnostic") ON TABLE "public"."diagnostics" TO "authenticated";


--
-- Name: COLUMN "diagnostics"."filter_run_id"; Type: ACL; Schema: public; Owner: -
--

GRANT UPDATE("filter_run_id") ON TABLE "public"."diagnostics" TO "authenticated";


--
-- Name: COLUMN "diagnostics"."generate_run_id"; Type: ACL; Schema: public; Owner: -
--

GRANT UPDATE("generate_run_id") ON TABLE "public"."diagnostics" TO "authenticated";


--
-- Name: FUNCTION "approve_diagnostic"("p_diagnostic_id" "uuid", "p_quyet_dinh" "public"."trang_thai_duyet", "p_department_id" "uuid", "p_ghi_chu" "text"); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION "public"."approve_diagnostic"("p_diagnostic_id" "uuid", "p_quyet_dinh" "public"."trang_thai_duyet", "p_department_id" "uuid", "p_ghi_chu" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."approve_diagnostic"("p_diagnostic_id" "uuid", "p_quyet_dinh" "public"."trang_thai_duyet", "p_department_id" "uuid", "p_ghi_chu" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."approve_diagnostic"("p_diagnostic_id" "uuid", "p_quyet_dinh" "public"."trang_thai_duyet", "p_department_id" "uuid", "p_ghi_chu" "text") TO "service_role";


--
-- Name: TABLE "entities"; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."entities" TO "authenticated";
GRANT ALL ON TABLE "public"."entities" TO "service_role";


--
-- Name: COLUMN "entities"."ten_entity"; Type: ACL; Schema: public; Owner: -
--

GRANT UPDATE("ten_entity") ON TABLE "public"."entities" TO "authenticated";


--
-- Name: COLUMN "entities"."loai_entity"; Type: ACL; Schema: public; Owner: -
--

GRANT UPDATE("loai_entity") ON TABLE "public"."entities" TO "authenticated";


--
-- Name: COLUMN "entities"."mo_ta"; Type: ACL; Schema: public; Owner: -
--

GRANT UPDATE("mo_ta") ON TABLE "public"."entities" TO "authenticated";


--
-- Name: COLUMN "entities"."domain"; Type: ACL; Schema: public; Owner: -
--

GRANT UPDATE("domain") ON TABLE "public"."entities" TO "authenticated";


--
-- Name: COLUMN "entities"."primary_departments"; Type: ACL; Schema: public; Owner: -
--

GRANT UPDATE("primary_departments") ON TABLE "public"."entities" TO "authenticated";


--
-- Name: COLUMN "entities"."secondary_departments"; Type: ACL; Schema: public; Owner: -
--

GRANT UPDATE("secondary_departments") ON TABLE "public"."entities" TO "authenticated";


--
-- Name: COLUMN "entities"."ngay_co_hieu_luc"; Type: ACL; Schema: public; Owner: -
--

GRANT UPDATE("ngay_co_hieu_luc") ON TABLE "public"."entities" TO "authenticated";


--
-- Name: COLUMN "entities"."dieu_kien_may_doc"; Type: ACL; Schema: public; Owner: -
--

GRANT UPDATE("dieu_kien_may_doc") ON TABLE "public"."entities" TO "authenticated";


--
-- Name: COLUMN "entities"."ghi_chu_curator"; Type: ACL; Schema: public; Owner: -
--

GRANT UPDATE("ghi_chu_curator") ON TABLE "public"."entities" TO "authenticated";


--
-- Name: FUNCTION "approve_entity"("p_entity_id" "uuid", "p_quyet_dinh" "public"."trang_thai_duyet", "p_ghi_chu" "text", "p_ap_dung_moi_doanh_nghiep" boolean); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION "public"."approve_entity"("p_entity_id" "uuid", "p_quyet_dinh" "public"."trang_thai_duyet", "p_ghi_chu" "text", "p_ap_dung_moi_doanh_nghiep" boolean) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."approve_entity"("p_entity_id" "uuid", "p_quyet_dinh" "public"."trang_thai_duyet", "p_ghi_chu" "text", "p_ap_dung_moi_doanh_nghiep" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."approve_entity"("p_entity_id" "uuid", "p_quyet_dinh" "public"."trang_thai_duyet", "p_ghi_chu" "text", "p_ap_dung_moi_doanh_nghiep" boolean) TO "service_role";


--
-- Name: FUNCTION "cap_nhat_trang_thai_chunk"("p_chunk_id" "uuid"); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION "public"."cap_nhat_trang_thai_chunk"("p_chunk_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."cap_nhat_trang_thai_chunk"("p_chunk_id" "uuid") TO "service_role";


--
-- Name: FUNCTION "current_customer_id"(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION "public"."current_customer_id"() TO "anon";
GRANT ALL ON FUNCTION "public"."current_customer_id"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."current_customer_id"() TO "service_role";


--
-- Name: FUNCTION "dieu_kien_may_doc_hop_le"("p" "jsonb"); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION "public"."dieu_kien_may_doc_hop_le"("p" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."dieu_kien_may_doc_hop_le"("p" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."dieu_kien_may_doc_hop_le"("p" "jsonb") TO "service_role";


--
-- Name: FUNCTION "guard_trang_thai_duyet"(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION "public"."guard_trang_thai_duyet"() TO "anon";
GRANT ALL ON FUNCTION "public"."guard_trang_thai_duyet"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."guard_trang_thai_duyet"() TO "service_role";


--
-- Name: FUNCTION "is_curator"(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION "public"."is_curator"() TO "anon";
GRANT ALL ON FUNCTION "public"."is_curator"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_curator"() TO "service_role";


--
-- Name: FUNCTION "khoa_diagnostic"(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION "public"."khoa_diagnostic"() TO "anon";
GRANT ALL ON FUNCTION "public"."khoa_diagnostic"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."khoa_diagnostic"() TO "service_role";


--
-- Name: FUNCTION "khoa_entity"(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION "public"."khoa_entity"() TO "anon";
GRANT ALL ON FUNCTION "public"."khoa_entity"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."khoa_entity"() TO "service_role";


--
-- Name: FUNCTION "khoa_pipeline_run"(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION "public"."khoa_pipeline_run"() TO "anon";
GRANT ALL ON FUNCTION "public"."khoa_pipeline_run"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."khoa_pipeline_run"() TO "service_role";


--
-- Name: FUNCTION "khoa_relationship"(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION "public"."khoa_relationship"() TO "anon";
GRANT ALL ON FUNCTION "public"."khoa_relationship"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."khoa_relationship"() TO "service_role";


--
-- Name: FUNCTION "kiem_tra_diagnostic"(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION "public"."kiem_tra_diagnostic"() TO "anon";
GRANT ALL ON FUNCTION "public"."kiem_tra_diagnostic"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."kiem_tra_diagnostic"() TO "service_role";


--
-- Name: FUNCTION "kiem_tra_entity"(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION "public"."kiem_tra_entity"() TO "anon";
GRANT ALL ON FUNCTION "public"."kiem_tra_entity"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."kiem_tra_entity"() TO "service_role";


--
-- Name: FUNCTION "kiem_tra_thuoc_tinh_khach_hang"(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION "public"."kiem_tra_thuoc_tinh_khach_hang"() TO "anon";
GRANT ALL ON FUNCTION "public"."kiem_tra_thuoc_tinh_khach_hang"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."kiem_tra_thuoc_tinh_khach_hang"() TO "service_role";


--
-- Name: FUNCTION "onboard_customer"("p_ten_cong_ty" "text", "p_ma_so_thue" "text", "p_nganh" "text", "p_quy_mo" "public"."quy_mo", "p_domains" "text"[], "p_thuoc_tinh" "jsonb", "p_phong_ban" "jsonb"); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION "public"."onboard_customer"("p_ten_cong_ty" "text", "p_ma_so_thue" "text", "p_nganh" "text", "p_quy_mo" "public"."quy_mo", "p_domains" "text"[], "p_thuoc_tinh" "jsonb", "p_phong_ban" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."onboard_customer"("p_ten_cong_ty" "text", "p_ma_so_thue" "text", "p_nganh" "text", "p_quy_mo" "public"."quy_mo", "p_domains" "text"[], "p_thuoc_tinh" "jsonb", "p_phong_ban" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."onboard_customer"("p_ten_cong_ty" "text", "p_ma_so_thue" "text", "p_nganh" "text", "p_quy_mo" "public"."quy_mo", "p_domains" "text"[], "p_thuoc_tinh" "jsonb", "p_phong_ban" "jsonb") TO "service_role";


--
-- Name: FUNCTION "set_updated_at"(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "service_role";


--
-- Name: FUNCTION "thong_bao_diagnostic"(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION "public"."thong_bao_diagnostic"() TO "anon";
GRANT ALL ON FUNCTION "public"."thong_bao_diagnostic"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."thong_bao_diagnostic"() TO "service_role";


--
-- Name: TABLE "approvals"; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."approvals" TO "authenticated";
GRANT ALL ON TABLE "public"."approvals" TO "service_role";


--
-- Name: TABLE "customers"; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."customers" TO "authenticated";
GRANT ALL ON TABLE "public"."customers" TO "service_role";


--
-- Name: COLUMN "customers"."ten_cong_ty"; Type: ACL; Schema: public; Owner: -
--

GRANT UPDATE("ten_cong_ty") ON TABLE "public"."customers" TO "authenticated";


--
-- Name: COLUMN "customers"."nganh"; Type: ACL; Schema: public; Owner: -
--

GRANT UPDATE("nganh") ON TABLE "public"."customers" TO "authenticated";


--
-- Name: COLUMN "customers"."quy_mo"; Type: ACL; Schema: public; Owner: -
--

GRANT UPDATE("quy_mo") ON TABLE "public"."customers" TO "authenticated";


--
-- Name: COLUMN "customers"."domains"; Type: ACL; Schema: public; Owner: -
--

GRANT UPDATE("domains") ON TABLE "public"."customers" TO "authenticated";


--
-- Name: COLUMN "customers"."thuoc_tinh"; Type: ACL; Schema: public; Owner: -
--

GRANT UPDATE("thuoc_tinh") ON TABLE "public"."customers" TO "authenticated";


--
-- Name: TABLE "departments"; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "public"."departments" TO "authenticated";
GRANT ALL ON TABLE "public"."departments" TO "service_role";


--
-- Name: TABLE "entity_relationships"; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."entity_relationships" TO "authenticated";
GRANT ALL ON TABLE "public"."entity_relationships" TO "service_role";


--
-- Name: COLUMN "entity_relationships"."target_entity_id"; Type: ACL; Schema: public; Owner: -
--

GRANT UPDATE("target_entity_id") ON TABLE "public"."entity_relationships" TO "authenticated";


--
-- Name: COLUMN "entity_relationships"."target_ref_text"; Type: ACL; Schema: public; Owner: -
--

GRANT UPDATE("target_ref_text") ON TABLE "public"."entity_relationships" TO "authenticated";


--
-- Name: COLUMN "entity_relationships"."can_cu"; Type: ACL; Schema: public; Owner: -
--

GRANT UPDATE("can_cu") ON TABLE "public"."entity_relationships" TO "authenticated";


--
-- Name: TABLE "van_ban_chunks"; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "public"."van_ban_chunks" TO "authenticated";
GRANT ALL ON TABLE "public"."van_ban_chunks" TO "service_role";


--
-- Name: TABLE "entity_graph"; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE "public"."entity_graph" TO "authenticated";
GRANT ALL ON TABLE "public"."entity_graph" TO "service_role";


--
-- Name: TABLE "ner_extraction_summary"; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE "public"."ner_extraction_summary" TO "authenticated";
GRANT ALL ON TABLE "public"."ner_extraction_summary" TO "service_role";


--
-- Name: TABLE "nganh"; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "public"."nganh" TO "authenticated";
GRANT ALL ON TABLE "public"."nganh" TO "service_role";


--
-- Name: TABLE "notifications"; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."notifications" TO "authenticated";
GRANT ALL ON TABLE "public"."notifications" TO "service_role";


--
-- Name: COLUMN "notifications"."da_doc"; Type: ACL; Schema: public; Owner: -
--

GRANT UPDATE("da_doc") ON TABLE "public"."notifications" TO "authenticated";


--
-- Name: TABLE "pipeline_runs"; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."pipeline_runs" TO "authenticated";
GRANT ALL ON TABLE "public"."pipeline_runs" TO "service_role";


--
-- Name: COLUMN "pipeline_runs"."trang_thai"; Type: ACL; Schema: public; Owner: -
--

GRANT UPDATE("trang_thai") ON TABLE "public"."pipeline_runs" TO "authenticated";


--
-- Name: COLUMN "pipeline_runs"."output"; Type: ACL; Schema: public; Owner: -
--

GRANT UPDATE("output") ON TABLE "public"."pipeline_runs" TO "authenticated";


--
-- Name: COLUMN "pipeline_runs"."error_log"; Type: ACL; Schema: public; Owner: -
--

GRANT UPDATE("error_log") ON TABLE "public"."pipeline_runs" TO "authenticated";


--
-- Name: COLUMN "pipeline_runs"."started_at"; Type: ACL; Schema: public; Owner: -
--

GRANT UPDATE("started_at") ON TABLE "public"."pipeline_runs" TO "authenticated";


--
-- Name: COLUMN "pipeline_runs"."completed_at"; Type: ACL; Schema: public; Owner: -
--

GRANT UPDATE("completed_at") ON TABLE "public"."pipeline_runs" TO "authenticated";


--
-- Name: TABLE "thuoc_tinh_ho_so"; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "public"."thuoc_tinh_ho_so" TO "authenticated";
GRANT ALL ON TABLE "public"."thuoc_tinh_ho_so" TO "service_role";


--
-- Name: TABLE "van_ban"; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "public"."van_ban" TO "authenticated";
GRANT ALL ON TABLE "public"."van_ban" TO "service_role";


--
-- Name: TABLE "van_ban_thay_the"; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE "public"."van_ban_thay_the" TO "authenticated";
GRANT ALL ON TABLE "public"."van_ban_thay_the" TO "service_role";


--
-- Name: TABLE "van_ban_replacement_chain"; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE "public"."van_ban_replacement_chain" TO "authenticated";
GRANT ALL ON TABLE "public"."van_ban_replacement_chain" TO "service_role";


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: -
--

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: -
--



--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: public; Owner: -
--

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: public; Owner: -
--



--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: -
--

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: -
--



--
-- PostgreSQL database dump complete
--


