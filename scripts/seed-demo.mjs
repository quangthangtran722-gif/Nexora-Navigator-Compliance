// Seed dữ liệu demo cho schema v3 (supabase/migrations/002_ner_graph.sql).
// Chạy: node --env-file=.env.local scripts/seed-demo.mjs
//
// Dùng service role (bỏ qua RLS) — chỉ để nạp dữ liệu tham chiếu, KHÔNG tạo entity/diagnostic:
// entity phải đi qua /api/pipeline/extract + curator duyệt, không seed thẳng.
// Chạy lại an toàn:
//   - thuoc_tinh_ho_so: ghi đè theo file này (file là nguồn sự thật của từ điển).
//   - customers / departments: chỉ thêm row còn thiếu, không ghi đè
//     (tránh reset câu trả lời onboarding frontend đã sửa).

import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error("Thiếu NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY trong .env.local");
  process.exit(1);
}
const db = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

// ---------------------------------------------------------------------
// 1. Từ điển thuộc tính hồ sơ — form onboarding + câu hỏi "hỏi bổ sung" render từ đây.
//    kieu boolean → UI Có / Không / Chưa chắc (Chưa chắc = ghi null).
//    domain null = hỏi mọi khách hàng; có domain = chỉ hỏi khách hàng đăng ký lĩnh vực đó.
// ---------------------------------------------------------------------
const THUOC_TINH_HO_SO = [
  // Chung
  {
    ma: "nganh",
    cau_hoi: "Đơn vị hoạt động trong ngành nào?",
    kieu: "text",
    domain: null,
    lua_chon: null,
    don_vi: null,
    mo_ta:
      "Giá trị lấy từ cột customers.nganh (mã trong bảng nganh) — rule engine tự đọc, form onboarding hỏi ở field Ngành riêng nên không render lại câu này.",
  },
  {
    ma: "loai_hinh_kinh_doanh",
    cau_hoi: "Đơn vị của bạn thuộc loại hình nào?",
    kieu: "text",
    domain: null,
    lua_chon: ["doanh_nghiep", "ho_kinh_doanh", "ca_nhan_kinh_doanh"],
    don_vi: null,
    mo_ta: "Nhãn hiển thị: doanh_nghiep = Doanh nghiệp; ho_kinh_doanh = Hộ kinh doanh; ca_nhan_kinh_doanh = Cá nhân kinh doanh.",
  },
  {
    ma: "so_lao_dong",
    cau_hoi: "Đơn vị hiện có bao nhiêu người lao động?",
    kieu: "number",
    domain: null,
    lua_chon: null,
    don_vi: "người",
    mo_ta: "Tính cả lao động thời vụ tại thời điểm khai.",
  },
  {
    ma: "kenh_ban_hang",
    cau_hoi: "Đơn vị bán hàng / cung cấp dịch vụ qua những kênh nào?",
    kieu: "text_array",
    domain: null,
    lua_chon: ["cua_hang", "website_rieng", "san_thuong_mai_dien_tu", "mang_xa_hoi", "ban_buon_dai_ly"],
    don_vi: null,
    mo_ta:
      "Chọn nhiều. Nhãn: cua_hang = Cửa hàng/văn phòng; website_rieng = Website/app riêng; " +
      "san_thuong_mai_dien_tu = Sàn TMĐT (Shopee, Lazada, TikTok Shop...); mang_xa_hoi = Mạng xã hội; ban_buon_dai_ly = Bán buôn/đại lý.",
  },

  // Thuế
  {
    ma: "doanh_thu_nam",
    cau_hoi: "Doanh thu năm gần nhất của đơn vị khoảng bao nhiêu?",
    kieu: "number",
    domain: "thue",
    lua_chon: null,
    don_vi: "đồng",
    mo_ta: "Dùng cho các ngưỡng miễn thuế / phương pháp tính thuế theo doanh thu.",
  },
  {
    ma: "ban_hang_qua_san_tmdt",
    cau_hoi: "Đơn vị có bán hàng trên nền tảng thương mại điện tử (Shopee, Lazada, TikTok Shop...) không?",
    kieu: "boolean",
    domain: "thue",
    lua_chon: null,
    don_vi: null,
    mo_ta: null,
  },
  {
    ma: "co_tra_luong",
    cau_hoi: "Đơn vị có trả tiền lương, tiền công cho người lao động không?",
    kieu: "boolean",
    domain: "thue",
    lua_chon: null,
    don_vi: null,
    mo_ta: "Có → đơn vị là tổ chức trả thu nhập, phát sinh nghĩa vụ khấu trừ thuế thu nhập cá nhân.",
  },
  {
    ma: "co_lao_dong_hop_dong_duoi_3_thang",
    cau_hoi: "Đơn vị có ký hợp đồng lao động thời hạn dưới 3 tháng (thời vụ, thử việc...) không?",
    kieu: "boolean",
    domain: "thue",
    lua_chon: null,
    don_vi: null,
    mo_ta: null,
  },
  {
    ma: "ky_khai_thue_gtgt",
    cau_hoi: "Đơn vị đang khai thuế giá trị gia tăng theo tháng hay theo quý?",
    kieu: "text",
    domain: "thue",
    lua_chon: ["thang", "quy"],
    don_vi: null,
    mo_ta: "Nhãn: thang = Theo tháng; quy = Theo quý.",
  },
  {
    ma: "phuong_phap_tinh_thue_gtgt",
    cau_hoi: "Đơn vị tính thuế giá trị gia tăng theo phương pháp nào?",
    kieu: "text",
    domain: "thue",
    lua_chon: ["khau_tru", "truc_tiep"],
    don_vi: null,
    mo_ta: "Nhãn: khau_tru = Phương pháp khấu trừ; truc_tiep = Phương pháp trực tiếp.",
  },
  {
    ma: "co_giao_dich_lien_ket",
    cau_hoi: "Đơn vị có giao dịch với công ty mẹ, công ty con hoặc bên có quan hệ liên kết không?",
    kieu: "boolean",
    domain: "thue",
    lua_chon: null,
    don_vi: null,
    mo_ta: null,
  },
  {
    ma: "co_xuat_nhap_khau",
    cau_hoi: "Đơn vị có hoạt động xuất khẩu hoặc nhập khẩu hàng hóa, dịch vụ không?",
    kieu: "boolean",
    domain: "thue",
    lua_chon: null,
    don_vi: null,
    mo_ta: null,
  },
  {
    ma: "co_thue_nop_thua",
    cau_hoi: "Đơn vị có khoản thuế đã nộp lớn hơn số thuế phải nộp không?",
    kieu: "boolean",
    domain: "thue",
    lua_chon: null,
    don_vi: null,
    mo_ta: "Liên quan nghĩa vụ / quyền hoàn thuế.",
  },
  {
    ma: "co_san_tmdt",
    cau_hoi: "Đơn vị có quản lý / vận hành sàn thương mại điện tử có chức năng đặt hàng và thanh toán không?",
    kieu: "boolean",
    domain: "thue",
    lua_chon: null,
    don_vi: null,
    mo_ta: "Khác ban_hang_qua_san_tmdt (người bán trên sàn): đây là đơn vị VẬN HÀNH sàn — diện khấu trừ, nộp thay thuế cho người bán.",
  },
  {
    ma: "doanh_thu_tap_doan",
    cau_hoi: "Doanh thu hợp nhất hằng năm của tập đoàn đa quốc gia mà đơn vị là thành viên là bao nhiêu?",
    kieu: "number",
    domain: "thue",
    lua_chon: null,
    don_vi: "EUR",
    mo_ta: "Ghi 0 nếu đơn vị không thuộc tập đoàn đa quốc gia. Dùng cho ngưỡng thuế tối thiểu toàn cầu (750 triệu EUR).",
  },

  // Chứng khoán
  {
    ma: "co_giay_phep_kinh_doanh_chung_khoan",
    cau_hoi: "Đơn vị đã được Ủy ban Chứng khoán Nhà nước cấp giấy phép kinh doanh chứng khoán chưa?",
    kieu: "boolean",
    domain: "chung_khoan",
    lua_chon: null,
    don_vi: null,
    mo_ta: null,
  },

  // Kế toán
  {
    ma: "su_dung_hoa_don_dien_tu",
    cau_hoi: "Đơn vị đã sử dụng hóa đơn điện tử chưa?",
    kieu: "boolean",
    domain: "ke_toan",
    lua_chon: null,
    don_vi: null,
    mo_ta: null,
  },
  {
    ma: "che_do_ke_toan",
    cau_hoi: "Đơn vị áp dụng chế độ kế toán nào?",
    kieu: "text",
    domain: "ke_toan",
    lua_chon: ["doanh_nghiep_nho_va_vua", "doanh_nghiep_chung", "ho_kinh_doanh"],
    don_vi: null,
    mo_ta: "Nhãn: doanh_nghiep_nho_va_vua = Chế độ cho DN nhỏ và vừa; doanh_nghiep_chung = Chế độ DN chung; ho_kinh_doanh = Chế độ cho hộ kinh doanh.",
  },
  {
    ma: "co_ke_toan_truong",
    cau_hoi: "Đơn vị đã bổ nhiệm kế toán trưởng hoặc người phụ trách kế toán chưa?",
    kieu: "boolean",
    domain: "ke_toan",
    lua_chon: null,
    don_vi: null,
    mo_ta: null,
  },
];

// ---------------------------------------------------------------------
// 2. Văn bản pháp luật: KHÔNG seed. Văn bản mẫu tự viết DEMO-01/2026 + TT-DEMO-01/2026 đã bỏ (số hiệu giả
//    lộ ra trong checklist) — xem git history. Văn bản thật curator tải lên qua UI.
// ---------------------------------------------------------------------

// ---------------------------------------------------------------------
// 3. Khách hàng demo (CLAUDE.md mục 12) — giữ customer_id cũ để frontend không phải đổi.
//    ...0001 trước là "ABC Logistics", đã đổi thành Nexora Technology (công ty phần mềm) — xem doiAbcSangNexora().
//    Smile Care CỐ Ý để co_lao_dong_hop_dong_duoi_3_thang = null ("Chưa chắc") và thiếu doanh_thu_nam
//    → demo được trạng thái chua_du_thong_tin + hỏi bổ sung.
// ---------------------------------------------------------------------
const NEXORA_ID = "a0000000-0000-4000-8000-000000000001";
const SMILE_ID = "a0000000-0000-4000-8000-000000000002";
// Thiên Phú (ngành chứng khoán) — để demo điều kiện nganh eq "chung_khoan": chỉ khớp DN này, Nexora Tech/Smile Care → khong_ap_dung.
// Không seed văn bản cho DN này: curator tải Thông tư lên live khi demo.
const THIENPHU_ID = "a0000000-0000-4000-8000-000000000003";

// Ngành mới chưa có trong 003_nganh.sql — thêm để Tổng quan hiện tên tiếng Việt
const NGANH_MOI = [{ ma: "chung_khoan", ten_hien_thi: "Chứng khoán" }];

const NEXORA_THUOC_TINH = {
  loai_hinh_kinh_doanh: "doanh_nghiep",
  so_lao_dong: 35,
  kenh_ban_hang: ["website_rieng"],
  doanh_thu_nam: 8000000000,
  ban_hang_qua_san_tmdt: false,
  co_san_tmdt: false,
  doanh_thu_tap_doan: 0,
  co_tra_luong: true,
  co_lao_dong_hop_dong_duoi_3_thang: true,
  ky_khai_thue_gtgt: "quy",
  phuong_phap_tinh_thue_gtgt: "khau_tru",
  co_giao_dich_lien_ket: false,
  co_xuat_nhap_khau: true, // xuất khẩu dịch vụ phần mềm
  su_dung_hoa_don_dien_tu: true,
  che_do_ke_toan: "doanh_nghiep_nho_va_vua",
  co_ke_toan_truong: true,
};

const CUSTOMERS = [
  {
    // Công ty phần mềm quy mô nhỏ: MST 0312345678 (giả), địa chỉ Tòa nhà Bitexco, Q.1, TP.HCM — customers chưa có cột.
    // Luật Quản lý thuế 108/2025/QH15 nhóm B (hộ kinh doanh / vận hành sàn TMĐT / tập đoàn đa quốc gia)
    // phải ra khong_ap_dung → loai_hinh_kinh_doanh, co_san_tmdt, doanh_thu_tap_doan ghi rõ giá trị (không để trống).
    id: NEXORA_ID,
    ten_cong_ty: "Công ty TNHH Nexora Technology",
    nganh: "cong_nghe_thong_tin",
    quy_mo: "nho",
    domains: ["thue", "ke_toan"],
    thuoc_tinh: NEXORA_THUOC_TINH,
  },
  {
    id: SMILE_ID,
    ten_cong_ty: "Phòng khám Nha khoa Smile Care",
    nganh: "y_te",
    quy_mo: "nho",
    domains: ["thue"],
    thuoc_tinh: {
      loai_hinh_kinh_doanh: "doanh_nghiep",
      so_lao_dong: 25,
      kenh_ban_hang: ["cua_hang", "mang_xa_hoi"],
      ban_hang_qua_san_tmdt: false,
      co_tra_luong: true,
      co_lao_dong_hop_dong_duoi_3_thang: null,
      ky_khai_thue_gtgt: "quy",
      co_san_tmdt: false,
      doanh_thu_tap_doan: 0,
    },
  },
  {
    // MST 0301234569 (giả), địa chỉ 72 Nguyễn Huệ, Q.1, TP.HCM — customers chưa có cột cho các thông tin này;
    // dịch vụ: môi giới, tự doanh, tư vấn đầu tư chứng khoán.
    id: THIENPHU_ID,
    ten_cong_ty: "Công ty CP Chứng khoán Thiên Phú",
    nganh: "chung_khoan",
    quy_mo: "vua",
    domains: ["thue", "ke_toan", "chung_khoan"],
    thuoc_tinh: {
      loai_hinh_kinh_doanh: "doanh_nghiep",
      so_lao_dong: 50,
      doanh_thu_nam: 12000000000,
      co_tra_luong: true,
      co_giay_phep_kinh_doanh_chung_khoan: true,
      co_san_tmdt: false,
      doanh_thu_tap_doan: 0,
    },
  },
];

const DEPARTMENTS = [
  { customer_id: NEXORA_ID, ten_phong_ban: "Ban Giám đốc", slug_phong_ban: "ban_giam_doc", email_head: "giamdoc@nexoratech.demo" },
  { customer_id: NEXORA_ID, ten_phong_ban: "Phòng Kế toán", slug_phong_ban: "ke_toan", email_head: "ketoan@nexoratech.demo" },
  { customer_id: NEXORA_ID, ten_phong_ban: "Phòng Nhân sự", slug_phong_ban: "nhan_su", email_head: "nhansu@nexoratech.demo" },
  { customer_id: NEXORA_ID, ten_phong_ban: "Phòng Kinh doanh", slug_phong_ban: "kinh_doanh", email_head: "kinhdoanh@nexoratech.demo" },
  { customer_id: SMILE_ID, ten_phong_ban: "Ban Giám đốc", slug_phong_ban: "ban_giam_doc", email_head: "bacsi.truong@smilecare.example" },
  { customer_id: SMILE_ID, ten_phong_ban: "Kế toán - Bảo hiểm", slug_phong_ban: "ke_toan", email_head: "ketoan@smilecare.example" },
  { customer_id: SMILE_ID, ten_phong_ban: "Lễ tân", slug_phong_ban: "van_hanh", email_head: "letan@smilecare.example" },
  { customer_id: THIENPHU_ID, ten_phong_ban: "Ban Giám đốc", slug_phong_ban: "ban_giam_doc", email_head: "giamdoc@thienphu.example" },
  { customer_id: THIENPHU_ID, ten_phong_ban: "Phòng Kế toán", slug_phong_ban: "ke_toan", email_head: "ketoan@thienphu.example" },
  { customer_id: THIENPHU_ID, ten_phong_ban: "Khối Môi giới", slug_phong_ban: "kinh_doanh", email_head: "moigioi@thienphu.example" },
  { customer_id: THIENPHU_ID, ten_phong_ban: "Phòng Pháp chế - Kiểm soát nội bộ", slug_phong_ban: "phap_che", email_head: "phapche@thienphu.example" },
];

// ---------------------------------------------------------------------

async function step(label, promise) {
  const { data, error } = await promise;
  if (error) {
    console.error(`✗ ${label}: ${error.message}${error.code ? ` (${error.code})` : ""}`);
    process.exit(1);
  }
  console.log(`✓ ${label}${Array.isArray(data) ? `: ${data.length} row mới/cập nhật` : ""}`);
  return data;
}

await step("thuoc_tinh_ho_so", db.from("thuoc_tinh_ho_so").upsert(THUOC_TINH_HO_SO, { onConflict: "ma" }).select("ma"));

// ABC Logistics → Nexora Technology (chạy 1 lần): seed thường không ghi đè customers/departments đã có,
// nên đổi tại chỗ — chỉ khi row còn tên cũ, chạy lại không đè câu trả lời frontend sửa sau này.
// Phòng Vận hành đổi thành Phòng Kinh doanh (giữ id → diagnostic đang gắn không mất).
// Phòng Marketing cũ KHÔNG xóa ở đây (xóa là cascade diagnostics) — xóa tay nếu cần.
async function doiAbcSangNexora() {
  const renamed = await step(
    "đổi ABC Logistics → Nexora Technology",
    db
      .from("customers")
      .update({ ten_cong_ty: "Công ty TNHH Nexora Technology", nganh: "cong_nghe_thong_tin", domains: ["thue", "ke_toan"], thuoc_tinh: NEXORA_THUOC_TINH })
      .eq("id", NEXORA_ID)
      .eq("ten_cong_ty", "Công ty TNHH ABC Logistics")
      .select("id"),
  );
  if (!renamed.length) return;
  await step(
    "Phòng Vận hành → Phòng Kinh doanh",
    db.from("departments").update({ ten_phong_ban: "Phòng Kinh doanh", slug_phong_ban: "kinh_doanh" })
      .eq("customer_id", NEXORA_ID).eq("ten_phong_ban", "Phòng Vận hành").select("id"),
  );
  for (const d of DEPARTMENTS.filter((x) => x.customer_id === NEXORA_ID)) {
    await step(
      `email ${d.ten_phong_ban}`,
      db.from("departments").update({ email_head: d.email_head })
        .eq("customer_id", NEXORA_ID).eq("ten_phong_ban", d.ten_phong_ban).select("id"),
    );
  }
}
await doiAbcSangNexora();

// Thuộc tính thêm vào từ điển sau khi khách hàng đã seed → điền cho khách hàng cũ, CHỈ key còn thiếu
// (không đè câu trả lời đã có). Không áp dụng cho DN nào → để rule engine ra khong_ap_dung thay vì chua_du_thong_tin.
const THUOC_TINH_BO_SUNG = { co_san_tmdt: false, doanh_thu_tap_doan: 0 };
for (const id of [SMILE_ID, THIENPHU_ID]) {
  const row = await step(`đọc thuoc_tinh ${id}`, db.from("customers").select("thuoc_tinh").eq("id", id).maybeSingle());
  if (!row) continue;
  const thieu = Object.fromEntries(Object.entries(THUOC_TINH_BO_SUNG).filter(([k]) => !(k in row.thuoc_tinh)));
  if (!Object.keys(thieu).length) continue;
  await step(
    `bổ sung ${Object.keys(thieu).join(", ")} cho ${id}`,
    db.from("customers").update({ thuoc_tinh: { ...row.thuoc_tinh, ...thieu } }).eq("id", id).select("id"),
  );
}

await step("nganh", db.from("nganh").upsert(NGANH_MOI, { onConflict: "ma", ignoreDuplicates: true }).select("ma"));
await step("customers", db.from("customers").upsert(CUSTOMERS, { onConflict: "id", ignoreDuplicates: true }).select("id"));
await step(
  "departments",
  db.from("departments").upsert(DEPARTMENTS, { onConflict: "customer_id,ten_phong_ban", ignoreDuplicates: true }).select("id"),
);
