-- =====================================================================
-- Nexora Compliance Navigator — seed.sql
--
-- 5 thẻ mẫu 'Đã duyệt' (cụm bao_ve_du_lieu_ca_nhan) để Track B test rule engine
-- ngay, không chờ pipeline trích xuất AI (BUILD_PROCESS.md Bước 6). Chạy SAU schema.sql.
--
-- ⚠ DỮ LIỆU TEST, KHÔNG PHẢI VĂN BẢN LUẬT:
--   noi_dung_goc là câu diễn đạt lại theo tinh thần quy định BVDLCN, KHÔNG phải trích
--   dẫn nguyên văn; dieu_khoan chưa đối chiếu số điều. Mọi thẻ đều gắn nhãn [MẪU].
--   Trước demo phải thay bằng thẻ thật đi qua extract → curator duyệt.
--
-- curator_id = null: thẻ seed không qua approve_card() nên không có người duyệt và
-- không có dòng approvals — đó chính là dấu hiệu nhận biết thẻ seed.
-- Cờ nexora.seed là ngoại lệ DUY NHẤT của trigger guard_trang_thai_duyet, chỉ dùng ở file này.
--
-- Kết quả rule engine mong đợi với 2 hồ sơ demo (mock trong docs/api-contract.md mục 5),
-- tính tại ngày 16/10/2026:
--
--   Thẻ | ABC Logistics        | Smile Care
--   ----+----------------------+----------------------
--    01 | Áp dụng              | Không áp dụng
--    02 | Áp dụng              | Chưa đủ thông tin   (chưa trả lời câu quảng cáo → hỏi bổ sung)
--    03 | Không áp dụng (ngành)| Áp dụng
--    04 | Không áp dụng        | Áp dụng
--    05 | Sắp áp dụng          | Sắp áp dụng
-- =====================================================================

begin;

select set_config('nexora.seed', 'on', true);

insert into public.cards
  (id, noi_dung_goc, dieu_khoan, cum_phap_ly, dieu_kien_ap_dung, noi_dung_viet_lai,
   ngay_co_hieu_luc, trang_thai_hieu_luc, thay_the_boi, trang_thai_duyet, curator_id)
values
  -- 01. Chuyển dữ liệu ra nước ngoài → ABC Logistics (thuê server nước ngoài)
  ('c0000000-0000-4000-8000-000000000001',
   '[MẪU] Bên chuyển dữ liệu cá nhân ra nước ngoài phải lập hồ sơ đánh giá tác động chuyển dữ liệu cá nhân ra nước ngoài, lưu giữ hồ sơ và gửi cơ quan chuyên trách bảo vệ dữ liệu cá nhân trong thời hạn quy định kể từ khi bắt đầu chuyển dữ liệu.',
   '[MẪU-01] Luật BVDLCN 2025 — Chuyển dữ liệu cá nhân ra nước ngoài (chưa đối chiếu số điều)',
   'bao_ve_du_lieu_ca_nhan',
   '{"chuyen_du_lieu_ra_nuoc_ngoai": true}',
   'Nếu công ty lưu hoặc gửi dữ liệu cá nhân (khách hàng, nhân viên) lên máy chủ đặt ở nước ngoài, công ty phải lập hồ sơ đánh giá tác động của việc chuyển dữ liệu này và nộp cho cơ quan chức năng.',
   '2026-01-01', 'Đang áp dụng', null, 'Đã duyệt', null),

  -- 02. Quảng cáo nhắm mục tiêu → ABC Logistics (chạy ads)
  ('c0000000-0000-4000-8000-000000000002',
   '[MẪU] Việc sử dụng dữ liệu cá nhân để quảng cáo, nhắm mục tiêu quảng cáo chỉ được thực hiện khi có sự đồng ý của chủ thể dữ liệu; chủ thể dữ liệu có quyền từ chối nhận thông tin quảng cáo bất kỳ lúc nào.',
   '[MẪU-02] Luật BVDLCN 2025 — Xử lý dữ liệu cá nhân trong hoạt động quảng cáo (chưa đối chiếu số điều)',
   'bao_ve_du_lieu_ca_nhan',
   '{"su_dung_du_lieu_cho_quang_cao": true}',
   'Trước khi dùng dữ liệu khách hàng để chạy quảng cáo nhắm mục tiêu, công ty phải có xác nhận đồng ý của khách hàng, và phải cho khách hàng cách từ chối nhận quảng cáo.',
   '2026-01-01', 'Đang áp dụng', null, 'Đã duyệt', null),

  -- 03. Dữ liệu nhạy cảm, giới hạn ngành → Smile Care (dữ liệu sức khỏe); ABC trượt điều kiện ngành
  ('c0000000-0000-4000-8000-000000000003',
   '[MẪU] Khi xử lý dữ liệu cá nhân nhạy cảm, bên kiểm soát dữ liệu phải thông báo cho chủ thể dữ liệu biết dữ liệu được xử lý là dữ liệu nhạy cảm và áp dụng các biện pháp bảo vệ tăng cường phù hợp.',
   '[MẪU-03] Luật BVDLCN 2025 — Xử lý dữ liệu cá nhân nhạy cảm (chưa đối chiếu số điều)',
   'bao_ve_du_lieu_ca_nhan',
   '{"xu_ly_du_lieu_nhay_cam": true, "nganh": ["y_te", "tai_chinh", "bao_hiem"]}',
   'Nếu công ty thu thập dữ liệu nhạy cảm (ví dụ hồ sơ sức khỏe, thông tin tài chính), phải báo rõ cho người đó biết đây là dữ liệu nhạy cảm và áp dụng biện pháp bảo vệ chặt hơn dữ liệu thông thường.',
   '2026-01-01', 'Đang áp dụng', null, 'Đã duyệt', null),

  -- 04. Chia sẻ với bên thứ ba → Smile Care (chia sẻ với bên bảo hiểm) → thỏa thuận DPA
  ('c0000000-0000-4000-8000-000000000004',
   '[MẪU] Khi chia sẻ dữ liệu cá nhân cho bên thứ ba hoặc thuê bên thứ ba xử lý dữ liệu cá nhân, các bên phải có hợp đồng hoặc thỏa thuận bằng văn bản quy định rõ phạm vi, mục đích, thời hạn xử lý và trách nhiệm bảo vệ dữ liệu của mỗi bên.',
   '[MẪU-04] Luật BVDLCN 2025 — Chia sẻ, thuê xử lý dữ liệu cá nhân (chưa đối chiếu số điều)',
   'bao_ve_du_lieu_ca_nhan',
   '{"chia_se_voi_ben_thu_ba": true}',
   'Nếu công ty gửi dữ liệu cá nhân cho đối tác (ví dụ công ty bảo hiểm), hai bên phải ký thỏa thuận chia sẻ/xử lý dữ liệu (DPA) ghi rõ dùng dữ liệu vào việc gì, trong bao lâu và ai chịu trách nhiệm bảo vệ.',
   '2026-01-01', 'Đang áp dụng', null, 'Đã duyệt', null),

  -- 05. Hiệu lực tương lai → test trạng thái 'Sắp áp dụng' cho cả 2 hồ sơ
  ('c0000000-0000-4000-8000-000000000005',
   '[MẪU] Tổ chức xử lý dữ liệu cá nhân phải lập, lưu giữ hồ sơ đánh giá tác động xử lý dữ liệu cá nhân và cập nhật hồ sơ khi có thay đổi về mục đích, loại dữ liệu hoặc bên tham gia xử lý.',
   '[MẪU-05] Quy định giả định có hiệu lực 01/01/2027 — Đánh giá tác động xử lý dữ liệu cá nhân (chỉ để test)',
   'bao_ve_du_lieu_ca_nhan',
   '{"xu_ly_du_lieu_ca_nhan": true}',
   'Từ 01/01/2027, công ty có xử lý dữ liệu cá nhân phải lập hồ sơ đánh giá tác động việc xử lý dữ liệu và cập nhật hồ sơ mỗi khi thay đổi cách dùng dữ liệu.',
   '2027-01-01', 'Sắp áp dụng', null, 'Đã duyệt', null)
on conflict (id) do nothing;

commit;
