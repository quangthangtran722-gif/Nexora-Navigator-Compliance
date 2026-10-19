-- =====================================================================
-- 004 — loại văn bản: thêm 'huong_dan' + gán loại đúng cho văn bản demo.
-- Chạy SAU 003_nganh.sql. Idempotent.
--
-- Cột van_ban.loai_van_ban ĐÃ CÓ từ 002 (enum public.loai_van_ban, NOT NULL):
--   luat, nghi_dinh, thong_tu, nghi_quyet, quyet_dinh, khac — frontend đang dùng cả 6.
-- Nên ở đây KHÔNG thêm cột mới / CHECK text (sẽ trùng cột và bỏ mất nghi_quyet/khac → breaking),
-- chỉ mở rộng enum. Thêm giá trị enum không ảnh hưởng row cũ.
-- =====================================================================

alter type public.loai_van_ban add value if not exists 'huong_dan' after 'quyet_dinh';

update public.van_ban set loai_van_ban = 'nghi_dinh'
where so_hieu = 'DEMO-01/2026' and loai_van_ban <> 'nghi_dinh';

comment on column public.van_ban.loai_van_ban is
  'Loại văn bản: luat, nghi_dinh, thong_tu, nghi_quyet, quyet_dinh, huong_dan, khac (docs/CONTRACT.md §3.11).';
