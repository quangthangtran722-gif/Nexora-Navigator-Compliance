-- =====================================================================
-- 003 — bảng tra cứu ngành: customers.nganh (mã slug) → tên hiển thị tiếng Việt.
-- Chạy SAU 002_ner_graph.sql. Idempotent: chạy lại không lỗi, chỉ cập nhật tên hiển thị.
--
-- customers.nganh KHÔNG đặt FK sang bảng này: form onboarding cho nhập tự do rồi đổi sang slug,
-- nên có thể có mã chưa nằm trong bảng → frontend hiện mã gốc làm fallback (docs/CONTRACT.md §3.10).
-- =====================================================================

create table if not exists public.nganh (
  ma           text primary key,
  ten_hien_thi text not null,
  created_at   timestamptz not null default now(),

  constraint nganh_ma_slug check (ma ~ '^[a-z][a-z_]*$')
);
comment on table public.nganh is
  'Tra cứu ngành: ma = customers.nganh, ten_hien_thi = nhãn tiếng Việt. Không FK — mã lạ thì hiện mã gốc.';

alter table public.nganh enable row level security;

-- Đọc chung (mọi user đăng nhập), curator ghi — giống thuoc_tinh_ho_so
drop policy if exists nganh_select on public.nganh;
drop policy if exists nganh_insert on public.nganh;
drop policy if exists nganh_update on public.nganh;
create policy nganh_select on public.nganh for select to authenticated using (true);
create policy nganh_insert on public.nganh for insert to authenticated
  with check ((select public.is_curator()));
create policy nganh_update on public.nganh for update to authenticated
  using ((select public.is_curator())) with check ((select public.is_curator()));

revoke all on public.nganh from anon;
revoke delete on public.nganh from authenticated;
grant select, insert, update on public.nganh to authenticated;

insert into public.nganh (ma, ten_hien_thi) values
  ('van_tai_logistics',      'Vận tải & Logistics'),
  ('y_te',                   'Y tế'),
  ('duoc_pham',              'Dược phẩm'),
  ('thuong_mai_dien_tu',     'Thương mại điện tử'),
  ('ban_le',                 'Bán lẻ'),
  ('ban_buon',               'Bán buôn'),
  ('san_xuat',               'Sản xuất'),
  ('noi_that',               'Nội thất'),
  ('xay_dung',               'Xây dựng'),
  ('bat_dong_san',           'Bất động sản'),
  ('tai_chinh',              'Tài chính'),
  ('ngan_hang',              'Ngân hàng'),
  ('bao_hiem',               'Bảo hiểm'),
  ('cong_nghe_thong_tin',    'Công nghệ thông tin'),
  ('giao_duc',               'Giáo dục & Đào tạo'),
  ('an_uong',                'Nhà hàng & Ăn uống'),
  ('du_lich_khach_san',      'Du lịch & Khách sạn'),
  ('quang_cao_truyen_thong', 'Quảng cáo & Truyền thông'),
  ('nong_nghiep',            'Nông nghiệp'),
  ('dich_vu_chuyen_mon',     'Dịch vụ chuyên môn (tư vấn, kế toán, pháp lý)')
on conflict (ma) do update set ten_hien_thi = excluded.ten_hien_thi;
