import type { DieuKienMayDoc, Entity, EntityRelationship, LoaiEntity, SlugPhongBan, TrangThaiDuyet } from "@/lib/types";

/*
 * MOCK DATA — entity + quan hệ (CONTRACT §3.4, §3.5).
 * noi_dung_goc / can_cu là CÂU MẪU tự viết, không phải trích dẫn văn bản pháp luật thật.
 *
 * Chunk ↔ lần chạy extract: ch-0N ↔ pr-0N (ch-09 ↔ pr-09, ch-10 ↔ pr-10).
 * e-01…e-14: đã duyệt (trong kho). e-20…e-25: bản nháp của văn bản mẫu E, chờ curator duyệt.
 */

const T = "2026-10-15T08:30:00Z";

type Seed = {
  id: string;
  chunk: number;
  ma_tam: string;
  ten: string;
  loai: LoaiEntity;
  mo_ta: string;
  so_dieu: number;
  dieu_khoan: string;
  goc: string;
  domain: string;
  primary?: SlugPhongBan[];
  secondary?: SlugPhongBan[];
  hieu_luc?: string | null;
  dk?: DieuKienMayDoc | null;
  duyet: TrangThaiDuyet;
};

function entity(s: Seed): Entity {
  const ch = String(s.chunk).padStart(2, "0");
  return {
    id: s.id,
    chunk_id: `ch-${ch}`,
    pipeline_run_id: `pr-${ch}`,
    ma_tam: s.ma_tam,
    ten_entity: s.ten,
    loai_entity: s.loai,
    mo_ta: s.mo_ta,
    so_dieu: s.so_dieu,
    dieu_khoan: s.dieu_khoan,
    noi_dung_goc: s.goc,
    domain: s.domain,
    primary_departments: s.primary ?? [],
    secondary_departments: s.secondary ?? [],
    ngay_co_hieu_luc: s.hieu_luc ?? null,
    dieu_kien_may_doc: s.dk ?? null,
    trang_thai_duyet: s.duyet,
    curator_id: s.duyet === "cho_duyet" ? null : "u-curator",
    ghi_chu_curator: null,
    created_at: T,
    updated_at: T,
  };
}

export const mockEntities: Entity[] = [
  /* ---------- Văn bản mẫu A (vb-01) ---------- */
  entity({
    id: "e-01", chunk: 1, ma_tam: "e1", loai: "hanh_vi", domain: "thue", duyet: "da_duyet",
    ten: "Lập hoá đơn điện tử khi bán hàng qua sàn TMĐT",
    mo_ta: "Người bán phải lập hoá đơn điện tử cho đơn hàng bán qua sàn, kể cả khi người mua không yêu cầu.",
    so_dieu: 8, dieu_khoan: "Điều 8, khoản 1",
    goc: "Người bán hàng hoá thông qua sàn giao dịch thương mại điện tử phải lập hoá đơn điện tử giao cho người mua.",
    primary: ["ke_toan", "kinh_doanh"], secondary: ["ban_giam_doc"],
  }),
  entity({
    id: "e-02", chunk: 1, ma_tam: "e2", loai: "thoi_han", domain: "thue", duyet: "da_duyet",
    ten: "Thời điểm lập hoá đơn bán hàng",
    mo_ta: "Hoá đơn lập tại thời điểm chuyển giao quyền sở hữu hàng hoá, không phụ thuộc đã thu tiền hay chưa.",
    so_dieu: 9, dieu_khoan: "Điều 9, khoản 1",
    goc: "Thời điểm lập hoá đơn đối với bán hàng hoá là thời điểm chuyển giao quyền sở hữu hàng hoá cho người mua.",
    primary: ["ke_toan"],
  }),
  entity({
    id: "e-04", chunk: 1, ma_tam: "e3", loai: "chu_the", domain: "thue", duyet: "da_duyet",
    ten: "Doanh nghiệp bán hàng qua sàn TMĐT",
    mo_ta: "Tổ chức bán hàng hoá thông qua sàn giao dịch thương mại điện tử.",
    so_dieu: 8, dieu_khoan: "Điều 8, khoản 1",
    goc: "Người bán hàng hoá thông qua sàn giao dịch thương mại điện tử.",
    dk: { thuoc_tinh: "kenh_ban_hang", toan_tu: "contains_any", gia_tri: ["shopee", "tiktok_shop", "lazada"] },
  }),
  entity({
    id: "e-03", chunk: 2, ma_tam: "e1", loai: "che_tai", domain: "thue", duyet: "da_duyet",
    ten: "Phạt tiền khi lập hoá đơn không đúng thời điểm",
    mo_ta: "Mức phạt khi hoá đơn được lập muộn hơn thời điểm quy định.",
    so_dieu: 24, dieu_khoan: "Điều 24, khoản 2",
    goc: "Phạt tiền đối với hành vi lập hoá đơn không đúng thời điểm theo quy định.",
    primary: ["ke_toan"], secondary: ["ban_giam_doc"],
  }),
  entity({
    id: "e-12", chunk: 7, ma_tam: "e1", loai: "hanh_vi", domain: "thue", duyet: "da_duyet",
    ten: "Sử dụng hoá đơn khởi tạo từ máy tính tiền tại điểm bán lẻ",
    mo_ta: "Áp dụng cho cơ sở bán lẻ trực tiếp đến người tiêu dùng tại cửa hàng.",
    so_dieu: 11, dieu_khoan: "Điều 11, khoản 1",
    goc: "Doanh nghiệp bán lẻ trực tiếp đến người tiêu dùng tại cửa hàng sử dụng hoá đơn điện tử khởi tạo từ máy tính tiền.",
    primary: ["kinh_doanh"],
  }),
  entity({
    id: "e-14", chunk: 7, ma_tam: "e2", loai: "chu_the", domain: "thue", duyet: "da_duyet",
    ten: "Doanh nghiệp bán lẻ trực tiếp tại cửa hàng",
    mo_ta: "Cơ sở bán lẻ có điểm bán trực tiếp cho người tiêu dùng.",
    so_dieu: 11, dieu_khoan: "Điều 11, khoản 1",
    goc: "Doanh nghiệp bán lẻ trực tiếp đến người tiêu dùng tại cửa hàng.",
    dk: { thuoc_tinh: "kenh_ban_hang", toan_tu: "contains", gia_tri: "cua_hang" },
  }),

  /* ---------- Văn bản mẫu B (vb-02) ---------- */
  entity({
    id: "e-05", chunk: 3, ma_tam: "e1", loai: "hanh_vi", domain: "thue", duyet: "da_duyet",
    ten: "Thanh toán không dùng tiền mặt để được khấu trừ thuế GTGT đầu vào",
    mo_ta: "Hàng hoá mua vào từ ngưỡng quy định trở lên phải thanh toán qua ngân hàng mới được khấu trừ thuế GTGT đầu vào.",
    so_dieu: 14, dieu_khoan: "Điều 14, khoản 1",
    goc: "Hàng hoá, dịch vụ mua vào phải có chứng từ thanh toán không dùng tiền mặt, trừ trường hợp giá trị mỗi lần mua dưới ngưỡng quy định.",
    primary: ["ke_toan"], secondary: ["ban_giam_doc"],
  }),
  entity({
    id: "e-06", chunk: 3, ma_tam: "e2", loai: "nguong", domain: "thue", duyet: "da_duyet",
    ten: "Ngưỡng giá trị phải thanh toán không dùng tiền mặt",
    mo_ta: "Giá trị mỗi lần mua từ mức này trở lên phải có chứng từ thanh toán không dùng tiền mặt.",
    so_dieu: 14, dieu_khoan: "Điều 14, khoản 1",
    goc: "Giá trị hàng hoá, dịch vụ mua vào mỗi lần từ 5 triệu đồng trở lên (giá đã có thuế GTGT).",
    dk: { thuoc_tinh: "gia_tri_mua_vao_lon_nhat", toan_tu: "gte", gia_tri: 5_000_000 },
  }),
  entity({
    id: "e-07", chunk: 4, ma_tam: "e1", loai: "muc_thue", domain: "thue", duyet: "da_duyet",
    ten: "Thuế suất GTGT 10% cho hàng hoá thông thường",
    mo_ta: "Mức thuế suất áp dụng cho phần lớn hàng hoá bán lẻ.",
    so_dieu: 9, dieu_khoan: "Điều 9, khoản 3",
    goc: "Mức thuế suất 10% áp dụng đối với hàng hoá, dịch vụ không thuộc đối tượng áp dụng mức thuế suất 0% và 5%.",
  }),

  /* ---------- Văn bản mẫu C (vb-03) ---------- */
  entity({
    id: "e-08", chunk: 5, ma_tam: "e1", loai: "hanh_vi", domain: "thue", duyet: "da_duyet",
    ten: "Khai thuế GTGT theo quý",
    mo_ta: "Doanh nghiệp có doanh thu năm trước dưới ngưỡng được khai thuế GTGT theo quý thay vì theo tháng.",
    so_dieu: 9, dieu_khoan: "Điều 9, khoản 2",
    goc: "Người nộp thuế đáp ứng điều kiện về doanh thu được khai thuế giá trị gia tăng theo quý.",
    primary: ["ke_toan"], secondary: ["ban_giam_doc"],
  }),
  entity({
    id: "e-13", chunk: 5, ma_tam: "e2", loai: "nguong", domain: "thue", duyet: "da_duyet",
    ten: "Doanh thu năm trước từ 50 tỷ đồng trở xuống",
    mo_ta: "Ngưỡng doanh thu để được khai thuế GTGT theo quý.",
    so_dieu: 9, dieu_khoan: "Điều 9, khoản 2",
    goc: "Tổng doanh thu bán hàng hoá và cung cấp dịch vụ của năm trước liền kề từ 50 tỷ đồng trở xuống.",
    dk: { thuoc_tinh: "doanh_thu_nam", toan_tu: "lte", gia_tri: 50_000_000_000 },
  }),
  entity({
    id: "e-09", chunk: 5, ma_tam: "e3", loai: "thoi_han", domain: "thue", duyet: "da_duyet",
    ten: "Hạn nộp hồ sơ khai thuế theo quý",
    mo_ta: "Chậm nhất ngày cuối cùng của tháng đầu tiên của quý tiếp theo.",
    so_dieu: 44, dieu_khoan: "Điều 44, khoản 1",
    goc: "Chậm nhất là ngày cuối cùng của tháng đầu của quý tiếp theo quý phát sinh nghĩa vụ thuế.",
    primary: ["ke_toan"],
  }),

  /* ---------- Văn bản mẫu D (vb-04) ---------- */
  entity({
    id: "e-10", chunk: 6, ma_tam: "e1", loai: "hanh_vi", domain: "ke_toan", duyet: "da_duyet",
    ten: "Lưu trữ chứng từ kế toán điện tử",
    mo_ta: "Chứng từ kế toán điện tử phải được lưu trữ đủ thời hạn và tra cứu được khi cơ quan thuế yêu cầu.",
    so_dieu: 41, dieu_khoan: "Điều 41, khoản 1",
    goc: "Tài liệu kế toán dưới dạng điện tử phải được lưu trữ bảo đảm tính toàn vẹn, an toàn và có thể tra cứu được.",
    primary: ["ke_toan", "van_hanh"], hieu_luc: "2027-01-01",
  }),

  /* ---------- Văn bản mẫu E (vb-05, draft) — chờ curator duyệt ---------- */
  entity({
    id: "e-20", chunk: 9, ma_tam: "e1", loai: "hanh_vi", domain: "thue", duyet: "cho_duyet",
    ten: "Gửi dữ liệu hoá đơn không có mã cho cơ quan thuế",
    mo_ta: "Người bán dùng hoá đơn không có mã phải chuyển dữ liệu hoá đơn cho cơ quan thuế.",
    so_dieu: 5, dieu_khoan: "Điều 5, khoản 1",
    goc: "Người bán sử dụng hoá đơn điện tử không có mã chuyển dữ liệu hoá đơn đến cơ quan thuế.",
    primary: ["ke_toan"], secondary: ["cong_nghe"],
  }),
  entity({
    id: "e-21", chunk: 9, ma_tam: "e2", loai: "thoi_han", domain: "thue", duyet: "cho_duyet",
    ten: "Chậm nhất cuối ngày lập hoá đơn",
    mo_ta: "Dữ liệu hoá đơn phải được gửi trong ngày lập.",
    so_dieu: 5, dieu_khoan: "Điều 5, khoản 2",
    goc: "Chậm nhất là cuối ngày lập hoá đơn.",
    primary: ["ke_toan"],
  }),
  entity({
    id: "e-22", chunk: 9, ma_tam: "e3", loai: "dieu_kien", domain: "thue", duyet: "cho_duyet",
    ten: "Đang sử dụng hoá đơn không có mã",
    mo_ta: "Chỉ áp dụng với người bán dùng hoá đơn điện tử không có mã của cơ quan thuế.",
    so_dieu: 5, dieu_khoan: "Điều 5, khoản 1",
    goc: "Người bán sử dụng hoá đơn điện tử không có mã.",
    dk: null, // AI không sinh — curator phải điền trước khi duyệt
  }),
  entity({
    id: "e-23", chunk: 10, ma_tam: "e1", loai: "che_tai", domain: "thue", duyet: "cho_duyet",
    ten: "Phạt chậm chuyển dữ liệu hoá đơn",
    mo_ta: "Mức phạt khi chuyển dữ liệu hoá đơn quá thời hạn.",
    so_dieu: 6, dieu_khoan: "Điều 6, khoản 3",
    goc: "Phạt tiền đối với hành vi chuyển dữ liệu hoá đơn điện tử quá thời hạn quy định.",
    primary: ["ke_toan"], secondary: ["ban_giam_doc"],
  }),
  entity({
    id: "e-24", chunk: 10, ma_tam: "e2", loai: "nguong", domain: "thue", duyet: "cho_duyet",
    ten: "Doanh thu năm từ 3 tỷ đồng trở lên",
    mo_ta: "Ngưỡng doanh thu bắt buộc đăng ký hoá đơn có mã.",
    so_dieu: 6, dieu_khoan: "Điều 6, khoản 1",
    goc: "Doanh nghiệp có doanh thu năm từ 3 tỷ đồng trở lên.",
    dk: { thuoc_tinh: "doanh_thu_nam", toan_tu: "gte", gia_tri: 3_000_000_000 },
  }),
  entity({
    id: "e-25", chunk: 10, ma_tam: "e3", loai: "hanh_vi", domain: "thue", duyet: "cho_duyet",
    ten: "Đăng ký sử dụng hoá đơn có mã của cơ quan thuế",
    mo_ta: "Doanh nghiệp đạt ngưỡng doanh thu phải chuyển sang hoá đơn có mã.",
    so_dieu: 6, dieu_khoan: "Điều 6, khoản 1",
    goc: "Doanh nghiệp thuộc trường hợp quy định tại khoản này đăng ký sử dụng hoá đơn điện tử có mã của cơ quan thuế.",
    primary: ["ke_toan"], secondary: ["ban_giam_doc"],
  }),
];

function rel(
  id: string,
  chunk: number,
  source: string,
  loai: EntityRelationship["loai_relationship"],
  target: string | null,
  can_cu: string,
  ref: string | null = null,
): EntityRelationship {
  const ch = String(chunk).padStart(2, "0");
  return {
    id,
    chunk_id: `ch-${ch}`,
    pipeline_run_id: `pr-${ch}`,
    source_entity_id: source,
    target_entity_id: target,
    target_ref_text: ref,
    loai_relationship: loai,
    can_cu,
    nguoi_tao_id: null,
    created_at: T,
  };
}

// Hướng cạnh: source → target (vd thoi_han —ap_dung_cho→ hanh_vi, dieu_kien —dieu_kien→ hanh_vi)
export const mockRelationships: EntityRelationship[] = [
  rel("r-01", 1, "e-02", "ap_dung_cho", "e-01", "Thời điểm lập hoá đơn đối với bán hàng hoá là …"),
  rel("r-02", 2, "e-03", "che_tai_cua", "e-01", "Phạt tiền đối với hành vi lập hoá đơn không đúng thời điểm …"),
  rel("r-03", 1, "e-01", "ap_dung_cho", "e-04", "Người bán hàng hoá thông qua sàn … phải lập hoá đơn"),
  rel("r-04", 1, "e-01", "tham_chieu", null, "… theo định dạng quy định tại Điều 12 văn bản hướng dẫn", "Điều 12 văn bản hướng dẫn về định dạng hoá đơn"),
  rel("r-05", 3, "e-06", "dieu_kien", "e-05", "… trừ trường hợp giá trị mỗi lần mua dưới 5 triệu đồng"),
  rel("r-06", 4, "e-07", "ap_dung_cho", "e-05", "Mức thuế suất 10% áp dụng đối với hàng hoá …"),
  rel("r-07", 5, "e-13", "dieu_kien", "e-08", "… doanh thu năm trước liền kề từ 50 tỷ đồng trở xuống được khai theo quý"),
  rel("r-08", 5, "e-09", "ap_dung_cho", "e-08", "Chậm nhất là ngày cuối cùng của tháng đầu của quý tiếp theo …"),
  rel("r-09", 6, "e-10", "tham_chieu", null, "… thời hạn lưu trữ theo quy định tại Điều 42", "Điều 42 (chunk khác của cùng văn bản)"),
  rel("r-10", 7, "e-12", "ap_dung_cho", "e-14", "Doanh nghiệp bán lẻ trực tiếp … sử dụng hoá đơn khởi tạo từ máy tính tiền"),
  // Văn bản mẫu E — bản nháp
  rel("r-20", 9, "e-21", "ap_dung_cho", "e-20", "… chậm nhất là cuối ngày lập hoá đơn"),
  rel("r-21", 9, "e-22", "dieu_kien", "e-20", "Người bán sử dụng hoá đơn điện tử không có mã …"),
  rel("r-22", 10, "e-23", "che_tai_cua", "e-20", "Phạt tiền đối với hành vi chuyển dữ liệu hoá đơn quá thời hạn …"),
  rel("r-23", 10, "e-24", "dieu_kien", "e-25", "Doanh nghiệp có doanh thu năm từ 3 tỷ đồng trở lên …"),
  rel("r-24", 10, "e-25", "tham_chieu", null, "… theo hướng dẫn của Bộ Tài chính", "Thông tư hướng dẫn (chưa có trong kho)"),
];
