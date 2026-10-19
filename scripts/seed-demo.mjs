// Seed dữ liệu demo cho schema v3 (supabase/migrations/002_ner_graph.sql).
// Chạy: node --env-file=.env.local scripts/seed-demo.mjs
//
// Dùng service role (bỏ qua RLS) — chỉ để nạp dữ liệu tham chiếu, KHÔNG tạo entity/diagnostic:
// entity phải đi qua /api/pipeline/extract + curator duyệt, không seed thẳng.
// Chạy lại an toàn:
//   - thuoc_tinh_ho_so: ghi đè theo file này (file là nguồn sự thật của từ điển).
//   - van_ban / chunks / customers / departments: chỉ thêm row còn thiếu, không ghi đè
//     (tránh reset trạng thái chunk đã trích xuất hoặc câu trả lời onboarding frontend đã sửa).

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
// 2. Văn bản MẪU để test extract — TỰ VIẾT, KHÔNG PHẢI LUẬT THẬT (ghi rõ ở tên văn bản).
//    Chunk 1–2 là 2 chunk đã dùng verify prompt v2.
// ---------------------------------------------------------------------
const VAN_BAN_MAU = {
  ten_van_ban: "Văn bản mẫu về thuế đối với kinh doanh trực tuyến và tiền lương (dữ liệu demo — không phải văn bản pháp luật thật)",
  so_hieu: "DEMO-01/2026",
  loai_van_ban: "nghi_dinh", // migration 004 cập nhật row đã có (seed không ghi đè van_ban)
  co_quan_ban_hanh: "Nexora (dữ liệu demo)",
  ngay_ban_hanh: "2026-06-01",
  ngay_hieu_luc: "2026-07-01",
  domains: ["thue", "ke_toan"],
  trang_thai: "active",
};

const CHUNKS_MAU = [
  {
    thu_tu: 1,
    tieu_de: "Nghĩa vụ của người bán hàng trực tuyến",
    dieu_khoan_range: "Điều 1–3",
    noi_dung: `Điều 1. Phạm vi điều chỉnh
Văn bản mẫu này quy định về việc khai và nộp một loại thuế giả định đối với hoạt động kinh doanh trực tuyến.

Điều 2. Nghĩa vụ của người bán hàng trực tuyến
1. Người bán hàng trên nền tảng thương mại điện tử có các nghĩa vụ sau đây:
a) Đăng ký mã số thuế trước khi bắt đầu hoạt động kinh doanh;
b) Khai thuế theo quý và nộp hồ sơ khai thuế chậm nhất là ngày cuối cùng của tháng đầu tiên của quý tiếp theo;
c) Lưu trữ hóa đơn, chứng từ liên quan trong thời hạn 10 năm.
2. Việc xác định doanh thu tính thuế thực hiện theo quy định tại Điều 15 của Văn bản mẫu này.
3. Người bán hàng vi phạm thời hạn nộp hồ sơ khai thuế bị xử phạt theo quy định của pháp luật về quản lý thuế.

Điều 3. Miễn thuế
Người bán hàng có doanh thu năm từ 200 triệu đồng trở xuống được miễn thuế theo Văn bản mẫu này nhưng vẫn phải thực hiện nghĩa vụ quy định tại điểm a khoản 1 Điều 2.`,
  },
  {
    thu_tu: 2,
    tieu_de: "Khấu trừ thuế đối với tiền lương; hoàn thuế",
    dieu_khoan_range: "Điều 7–8",
    noi_dung: `Điều 7. Khấu trừ thuế đối với thu nhập từ tiền lương
1. Tổ chức trả thu nhập có trách nhiệm khấu trừ thuế trước khi trả thu nhập cho người lao động có thu nhập từ tiền lương, tiền công.
2. Trường hợp người lao động ký hợp đồng lao động có thời hạn dưới 03 tháng, tổ chức trả thu nhập khấu trừ thuế theo mức 10% trên thu nhập trả cho người lao động.
3. Tổ chức trả thu nhập phải cấp chứng từ khấu trừ thuế cho người lao động khi có yêu cầu.
4. Chậm nhất ngày thứ 20 của tháng tiếp theo, tổ chức trả thu nhập phải nộp số thuế đã khấu trừ vào ngân sách nhà nước.

Điều 8. Hoàn thuế
Người nộp thuế có số thuế đã nộp lớn hơn số thuế phải nộp được hoàn thuế. Hồ sơ, thủ tục hoàn thuế thực hiện theo quy định tại Điều 40 của Văn bản mẫu này. Chính phủ quy định chi tiết Điều này.`,
  },
];

// 2b. Thông tư MẪU hướng dẫn DEMO-01/2026 — test cross-reference giữa 2 văn bản.
//     Cố ý lặp lại chủ thể / hành vi của DEMO-01 và dẫn chiếu "Điều X Nghị định mẫu DEMO-01/2026"
//     → extract sinh entity trùng tên + cạnh tham_chieu pending (target_ref_text) để curator nối
//     sang entity của DEMO-01. Để draft: curator kích hoạt sau khi duyệt.
const VAN_BAN_TT = {
  ten_van_ban: "Thông tư mẫu hướng dẫn thi hành Nghị định mẫu DEMO-01/2026 (dữ liệu demo — không phải văn bản pháp luật thật)",
  so_hieu: "TT-DEMO-01/2026",
  loai_van_ban: "thong_tu",
  co_quan_ban_hanh: "Nexora (dữ liệu demo)",
  ngay_ban_hanh: "2026-07-15",
  ngay_hieu_luc: "2026-09-01",
  domains: ["thue", "ke_toan"],
  trang_thai: "draft",
};

const CHUNKS_TT = [
  {
    thu_tu: 1,
    tieu_de: "Hướng dẫn khai thuế theo quý và khấu trừ thuế tiền lương",
    dieu_khoan_range: "Điều 1–2",
    noi_dung: `Điều 1. Hướng dẫn khai thuế theo quý đối với người bán hàng trực tuyến
1. Người bán hàng trên nền tảng thương mại điện tử thực hiện khai thuế theo quý quy định tại điểm b khoản 1 Điều 2 Nghị định mẫu DEMO-01/2026 bằng phương thức điện tử qua cổng thông tin của cơ quan thuế.
2. Trường hợp người bán hàng có doanh thu năm từ 200 triệu đồng trở xuống theo quy định tại Điều 3 Nghị định mẫu DEMO-01/2026 thì không phải nộp hồ sơ khai thuế theo quý nhưng phải thông báo doanh thu cho cơ quan thuế chậm nhất là ngày 31 tháng 01 của năm tiếp theo.

Điều 2. Hướng dẫn khấu trừ thuế đối với thu nhập từ tiền lương
1. Tổ chức trả thu nhập thực hiện khấu trừ thuế theo quy định tại Điều 7 Nghị định mẫu DEMO-01/2026 phải lập bảng kê thu nhập và số thuế đã khấu trừ của từng người lao động theo tháng.
2. Kế toán của tổ chức trả thu nhập phải lưu trữ bảng kê quy định tại khoản 1 Điều này cùng với chứng từ khấu trừ thuế trong thời hạn 10 năm.`,
  },
];

// ---------------------------------------------------------------------
// 3. 2 khách hàng demo (CLAUDE.md mục 12) — giữ customer_id cũ để frontend không phải đổi.
//    Smile Care CỐ Ý để co_lao_dong_hop_dong_duoi_3_thang = null ("Chưa chắc") và thiếu doanh_thu_nam
//    → demo được trạng thái chua_du_thong_tin + hỏi bổ sung.
// ---------------------------------------------------------------------
const ABC_ID = "a0000000-0000-4000-8000-000000000001";
const SMILE_ID = "a0000000-0000-4000-8000-000000000002";
// Thiên Phú (ngành chứng khoán) — để demo điều kiện nganh eq "chung_khoan": chỉ khớp DN này, ABC/Smile Care → khong_ap_dung.
// Không seed văn bản cho DN này: curator tải Thông tư lên live khi demo.
const THIENPHU_ID = "a0000000-0000-4000-8000-000000000003";

// Ngành mới chưa có trong 003_nganh.sql — thêm để Tổng quan hiện tên tiếng Việt
const NGANH_MOI = [{ ma: "chung_khoan", ten_hien_thi: "Chứng khoán" }];

const CUSTOMERS = [
  {
    id: ABC_ID,
    ten_cong_ty: "Công ty TNHH ABC Logistics",
    nganh: "van_tai_logistics",
    quy_mo: "nho",
    domains: ["thue", "ke_toan"],
    thuoc_tinh: {
      loai_hinh_kinh_doanh: "doanh_nghiep",
      so_lao_dong: 45,
      kenh_ban_hang: ["website_rieng", "ban_buon_dai_ly"],
      doanh_thu_nam: 12000000000,
      ban_hang_qua_san_tmdt: false,
      co_tra_luong: true,
      co_lao_dong_hop_dong_duoi_3_thang: true,
      ky_khai_thue_gtgt: "quy",
      phuong_phap_tinh_thue_gtgt: "khau_tru",
      co_giao_dich_lien_ket: false,
      co_xuat_nhap_khau: true,
      su_dung_hoa_don_dien_tu: true,
      che_do_ke_toan: "doanh_nghiep_nho_va_vua",
      co_ke_toan_truong: true,
    },
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
    },
  },
];

const DEPARTMENTS = [
  { customer_id: ABC_ID, ten_phong_ban: "Ban Giám đốc", slug_phong_ban: "ban_giam_doc", email_head: "giamdoc@abc-logistics.example" },
  { customer_id: ABC_ID, ten_phong_ban: "Phòng Kế toán", slug_phong_ban: "ke_toan", email_head: "ketoan@abc-logistics.example" },
  { customer_id: ABC_ID, ten_phong_ban: "Phòng Nhân sự", slug_phong_ban: "nhan_su", email_head: "nhansu@abc-logistics.example" },
  { customer_id: ABC_ID, ten_phong_ban: "Phòng Vận hành", slug_phong_ban: "van_hanh", email_head: "vanhanh@abc-logistics.example" },
  { customer_id: ABC_ID, ten_phong_ban: "Phòng Marketing", slug_phong_ban: "marketing", email_head: "marketing@abc-logistics.example" },
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

const vanBanIds = {};
for (const [vb, chunks] of [
  [VAN_BAN_MAU, CHUNKS_MAU],
  [VAN_BAN_TT, CHUNKS_TT],
]) {
  await step(`van_ban ${vb.so_hieu}`, db.from("van_ban").upsert(vb, { onConflict: "so_hieu", ignoreDuplicates: true }).select("id"));
  const row = await step(`đọc van_ban ${vb.so_hieu}`, db.from("van_ban").select("id").eq("so_hieu", vb.so_hieu).single());
  vanBanIds[vb.so_hieu] = row.id;
  await step(
    `van_ban_chunks ${vb.so_hieu}`,
    db
      .from("van_ban_chunks")
      .upsert(
        chunks.map((c) => ({ ...c, van_ban_id: row.id })),
        { onConflict: "van_ban_id,thu_tu", ignoreDuplicates: true },
      )
      .select("id"),
  );
}

await step("nganh", db.from("nganh").upsert(NGANH_MOI, { onConflict: "ma", ignoreDuplicates: true }).select("ma"));
await step("customers", db.from("customers").upsert(CUSTOMERS, { onConflict: "id", ignoreDuplicates: true }).select("id"));
await step(
  "departments",
  db.from("departments").upsert(DEPARTMENTS, { onConflict: "customer_id,ten_phong_ban", ignoreDuplicates: true }).select("id"),
);

console.log("\nChunk mẫu (dùng chunk_id này gọi POST /api/pipeline/extract):");
for (const [soHieu, id] of Object.entries(vanBanIds)) {
  const chunks = await step(
    `đọc chunks ${soHieu}`,
    db.from("van_ban_chunks").select("id, thu_tu, dieu_khoan_range, trang_thai").eq("van_ban_id", id).order("thu_tu"),
  );
  for (const c of chunks) console.log(`  ${soHieu} #${c.thu_tu} ${c.dieu_khoan_range}  ${c.id}  [${c.trang_thai}]`);
}
