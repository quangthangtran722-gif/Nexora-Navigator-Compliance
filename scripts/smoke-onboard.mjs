// Smoke test POST /api/onboard trên link sống (BE-F). Cần 1 tài khoản CHƯA gắn customer_id (không phải curator —
// curator quét bằng JWT của chính mình nên không kiểm được service role key). Tài khoản sẽ bị gắn với doanh nghiệp thử.
// Chạy:
//   SMOKE_BASE_URL=https://<domain>.vercel.app node --env-file=.env.local --env-file=.env.demo.local scripts/smoke-onboard.mjs
// .env.demo.local cần DEMO_ONBOARD_EMAIL / DEMO_ONBOARD_PASSWORD. Mong đợi: 201 + tong_nghia_vu = 18 (ngành CNTT).
// Script không gọi AI, không duyệt gì.

import { createClient } from "@supabase/supabase-js";

const BASE = process.env.SMOKE_BASE_URL ?? "http://localhost:3000";

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
  auth: { persistSession: false },
});
const { data, error } = await supabase.auth.signInWithPassword({
  email: process.env.DEMO_ONBOARD_EMAIL,
  password: process.env.DEMO_ONBOARD_PASSWORD,
});
if (error) throw new Error(`Đăng nhập lỗi: ${error.message}`);
console.log(`✓ đăng nhập: app_metadata=${JSON.stringify(data.user.app_metadata)}`);
if (data.user.app_metadata?.customer_id || data.user.app_metadata?.nexora_role === "curator") {
  throw new Error("Tài khoản đã gắn doanh nghiệp hoặc là curator — dùng tài khoản mới chưa gắn customer_id");
}

// Mã số thuế đổi theo thời điểm chạy để không đụng 409 unique
const mst = String(Date.now()).slice(-10);
const body = {
  ten_cong_ty: `Công ty TNHH Smoke Test ${mst.slice(-4)}`,
  ma_so_thue: mst,
  nganh: "cong_nghe_thong_tin",
  quy_mo: "nho",
  domains: ["thue", "ke_toan"],
  thuoc_tinh: {
    loai_hinh_kinh_doanh: "cong_ty_tnhh",
    so_lao_dong: 35,
    doanh_thu_nam: 8000000000,
    co_tra_luong: true,
    co_san_tmdt: false,
    co_xuat_nhap_khau: false,
  },
  phong_ban: [
    { ten_phong_ban: "Ban Giám đốc", email_head: "gd@smoketest.vn" },
    { ten_phong_ban: "Phòng Kế toán", email_head: "ketoan@smoketest.vn" },
  ],
};

const t0 = Date.now();
const res = await fetch(`${BASE}/api/onboard`, {
  method: "POST",
  headers: { "Content-Type": "application/json", Authorization: `Bearer ${data.session.access_token}` },
  body: JSON.stringify(body),
});
const json = await res.json();
console.log(`POST ${BASE}/api/onboard → ${res.status} (${Date.now() - t0}ms)`);
if (res.status !== 201) {
  console.log(JSON.stringify(json, null, 2));
  console.log(json.trang_thai === "can_lam_moi_phien" ? "✗ Server thiếu SUPABASE_SERVICE_ROLE_KEY" : "✗ Không phải 201");
  process.exit(1);
}
console.log(`✓ khach_hang_id=${json.khach_hang_id} run_id=${json.run_id}`);
console.log(`  tong_nghia_vu=${json.tong_nghia_vu} thong_ke=${JSON.stringify(json.thong_ke)}`);
console.log(`  theo_phong_ban=${JSON.stringify(json.theo_phong_ban)}`);
