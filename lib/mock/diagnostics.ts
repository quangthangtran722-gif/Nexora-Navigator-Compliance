import type { Diagnostic } from "@/lib/types";

/*
 * MOCK DATA — diagnostic của Minh Phát (CONTRACT §3.6), khớp kết quả rule engine (lib/mock/rule-engine.ts)
 * với thuoc_tinh hiện tại của Minh Phát. 1 row = 1 entity hanh_vi × 1 phòng ban (slug ∈ primary_departments).
 *
 * Quy ước UI (chờ backend xác nhận): noi_dung_diagnostic là các đầu mục check, mỗi dòng ("\n") = 1 ô checklist.
 */

const T = "2026-10-16T02:00:20Z";

function dg(p: Partial<Diagnostic> & Pick<Diagnostic, "id" | "entity_id" | "department_id" | "trang_thai_ap_dung">): Diagnostic {
  return {
    customer_id: "c-minh-phat",
    thuoc_tinh_thieu: [],
    noi_dung_diagnostic: null,
    filter_run_id: "pr-f01",
    generate_run_id: null,
    trang_thai_duyet: "cho_duyet",
    nguoi_duyet_id: null,
    ghi_chu_duyet: null,
    created_at: T,
    updated_at: T,
    ...p,
  };
}

export const mockDiagnostics: Diagnostic[] = [
  // e-01 Lập HĐĐT qua sàn — primary [ke_toan, kinh_doanh] → 2 bản
  dg({
    id: "dg-01", entity_id: "e-01", department_id: "d-ke-toan", trang_thai_ap_dung: "ap_dung", generate_run_id: "pr-g01",
    noi_dung_diagnostic: [
      "Kiểm tra mọi đơn hàng hoàn tất trên Shopee/TikTok Shop đều đã có hoá đơn điện tử tương ứng",
      "Đối chiếu số đơn hoàn tất trong báo cáo sàn với số hoá đơn đã phát hành theo từng ngày",
      "Rà soát các đơn người mua không lấy hoá đơn — vẫn phải lập hoá đơn",
    ].join("\n"),
  }),
  dg({
    id: "dg-02", entity_id: "e-01", department_id: "d-kinh-doanh", trang_thai_ap_dung: "ap_dung", generate_run_id: "pr-g01",
    noi_dung_diagnostic: [
      "Kiểm tra quy trình chuyển dữ liệu đơn hàng từ sàn sang phòng Kế toán có đủ thông tin để lập hoá đơn",
      "Rà soát đơn có khuyến mãi/voucher sàn — giá trên hoá đơn có khớp giá thực thu không",
    ].join("\n"),
  }),
  // e-05 — ngưỡng e-06 cần gia_tri_mua_vao_lon_nhat, Minh Phát đang "Chưa chắc" (null) → hỏi bổ sung
  dg({
    id: "dg-03", entity_id: "e-05", department_id: "d-ke-toan", trang_thai_ap_dung: "chua_du_thong_tin",
    thuoc_tinh_thieu: ["gia_tri_mua_vao_lon_nhat"],
  }),
  // e-08 Khai thuế theo quý — đã được người đầu mối duyệt và giao Kế toán
  dg({
    id: "dg-04", entity_id: "e-08", department_id: "d-ke-toan", trang_thai_ap_dung: "ap_dung", generate_run_id: "pr-g01",
    trang_thai_duyet: "da_duyet", nguoi_duyet_id: "u-dau-moi",
    noi_dung_diagnostic: [
      "Xác nhận doanh thu năm trước thuộc diện khai thuế GTGT theo quý",
      "Đặt nhắc hạn nộp hồ sơ khai thuế cho từng quý",
    ].join("\n"),
  }),
  // e-10 Lưu trữ chứng từ điện tử — hiệu lực 01/01/2027 → sắp áp dụng; primary [ke_toan, van_hanh]
  dg({
    id: "dg-05", entity_id: "e-10", department_id: "d-ke-toan", trang_thai_ap_dung: "sap_ap_dung", generate_run_id: "pr-g01",
    noi_dung_diagnostic: [
      "Rà soát nơi đang lưu chứng từ điện tử (máy cá nhân, email, ổ chung…)",
      "Kiểm tra khả năng tra cứu lại chứng từ theo số hoá đơn và kỳ kế toán",
    ].join("\n"),
  }),
  dg({ id: "dg-06", entity_id: "e-10", department_id: "d-kho-van", trang_thai_ap_dung: "sap_ap_dung" }), // chờ AI viết nội dung
  // e-12 Máy tính tiền — trước đây áp dụng, sau khi Minh Phát bỏ cửa hàng trực tiếp thì hết áp dụng
  dg({
    id: "dg-07", entity_id: "e-12", department_id: "d-kinh-doanh", trang_thai_ap_dung: "khong_ap_dung", generate_run_id: "pr-g00",
    trang_thai_duyet: "da_duyet", nguoi_duyet_id: "u-dau-moi", created_at: "2026-09-01T02:00:00Z",
    noi_dung_diagnostic: "Kiểm tra máy tính tiền tại cửa hàng đã kết nối hoá đơn điện tử",
  }),
];
