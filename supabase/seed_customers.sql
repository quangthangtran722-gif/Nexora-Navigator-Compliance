-- =====================================================================
-- Nexora Compliance Navigator — seed_customers.sql
--
-- 2 khách hàng demo (CLAUDE.md mục 12) + hồ sơ onboarding. Chạy SAU schema.sql + seed.sql.
-- Giá trị profile = mock trong docs/api-contract.md mục 5 — sửa ở đây thì sửa cả bên đó.
--
-- customer_id CỐ ĐỊNH — gán vào app_metadata của user demo (bằng service role):
--   Công ty TNHH ABC Logistics      a0000000-0000-4000-8000-000000000001
--     → { "nexora_role": "customer", "customer_id": "a0000000-0000-4000-8000-000000000001" }
--   Phòng khám Nha khoa Smile Care  a0000000-0000-4000-8000-000000000002
--     → { "nexora_role": "customer", "customer_id": "a0000000-0000-4000-8000-000000000002" }
-- profile id (ít khi cần): b0000000-0000-4000-8000-00000000000{1,2}
--
-- Kết quả rule engine mong đợi với 5 thẻ trong seed.sql (ngày 16/10/2026):
--
--   Thẻ | ABC Logistics                     | Smile Care
--   ----+-----------------------------------+-----------------------------------------
--    01 | Áp dụng                           | Không áp dụng (chuyen_du_lieu_ra_nuoc_ngoai = false)
--    02 | Áp dụng                           | Chưa đủ thông tin (CỐ Ý thiếu su_dung_du_lieu_cho_quang_cao)
--    03 | Không áp dụng (nhay_cam + nganh)  | Áp dụng
--    04 | Không áp dụng (chia_se = false)   | Áp dụng
--    05 | Sắp áp dụng                       | Sắp áp dụng
--
-- Lưu ý: ABC phải có chia_se_voi_ben_thu_ba = false (KHÔNG được bỏ key) — bỏ key thì thẻ 04
-- ra "Chưa đủ thông tin" chứ không phải "Không áp dụng".
--
-- Email dùng tên miền .example (RFC 2606) — không gửi được, không trùng địa chỉ thật.
-- Bảng customers/customer_profiles không có trigger chặn; chạy trong SQL Editor (quyền
-- postgres) nên không bị RLS.
-- =====================================================================

begin;

insert into public.customers (id, ten_cong_ty) values
  ('a0000000-0000-4000-8000-000000000001', 'Công ty TNHH ABC Logistics'),
  ('a0000000-0000-4000-8000-000000000002', 'Phòng khám Nha khoa Smile Care')
on conflict (id) do nothing;

insert into public.customer_profiles (id, customer_id, nhom_a, nhom_b, nhom_c, nhom_d) values
  -- ABC Logistics: thuê server nước ngoài, chạy ads nhắm mục tiêu → giao Marketing / Vận hành
  ('b0000000-0000-4000-8000-000000000001',
   'a0000000-0000-4000-8000-000000000001',
   '{
      "ten_cong_ty": "Công ty TNHH ABC Logistics",
      "nganh": "logistics",
      "quy_mo_nhan_su": 45
    }',
   '{
      "xu_ly_du_lieu_ca_nhan": true,
      "xu_ly_du_lieu_nhay_cam": false,
      "su_dung_du_lieu_cho_quang_cao": true,
      "chuyen_du_lieu_ra_nuoc_ngoai": true,
      "chia_se_voi_ben_thu_ba": false,
      "loai_du_lieu_dac_biet": []
    }',
   '{
      "vi_tri_server": "nuoc_ngoai",
      "dich_vu_cloud": ["aws_singapore"],
      "doi_tac_truy_cap": []
    }',
   '{
      "phong_ban": [
        { "ma": "marketing", "ten": "Marketing", "nguoi_dau_moi": "Trưởng phòng Marketing", "email": "marketing@abc-logistics.example" },
        { "ma": "van_hanh",  "ten": "Vận hành",  "nguoi_dau_moi": "Trưởng phòng Vận hành",  "email": "vanhanh@abc-logistics.example" }
      ]
    }'),

  -- Smile Care: dữ liệu sức khỏe, chia sẻ với bên bảo hiểm → giao Kế toán / Bảo hiểm
  -- CỐ Ý không có key su_dung_du_lieu_cho_quang_cao → thẻ 02 "Chưa đủ thông tin" → test hỏi bổ sung
  ('b0000000-0000-4000-8000-000000000002',
   'a0000000-0000-4000-8000-000000000002',
   '{
      "ten_cong_ty": "Phòng khám Nha khoa Smile Care",
      "nganh": "y_te",
      "quy_mo_nhan_su": 25
    }',
   '{
      "xu_ly_du_lieu_ca_nhan": true,
      "xu_ly_du_lieu_nhay_cam": true,
      "chuyen_du_lieu_ra_nuoc_ngoai": false,
      "chia_se_voi_ben_thu_ba": true,
      "loai_du_lieu_dac_biet": ["suc_khoe"]
    }',
   '{
      "vi_tri_server": "trong_nuoc",
      "dich_vu_cloud": [],
      "doi_tac_truy_cap": ["cong_ty_bao_hiem"]
    }',
   '{
      "phong_ban": [
        { "ma": "ke_toan",  "ten": "Kế toán",  "nguoi_dau_moi": "Kế toán trưởng",     "email": "ketoan@smilecare.example" },
        { "ma": "bao_hiem", "ten": "Bảo hiểm", "nguoi_dau_moi": "Phụ trách bảo hiểm", "email": "baohiem@smilecare.example" }
      ]
    }')
on conflict (customer_id) do nothing;

commit;
