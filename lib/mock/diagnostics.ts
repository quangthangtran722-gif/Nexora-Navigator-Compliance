import type { ContextEntity, Diagnostic } from "@/lib/types";
import { mockEntities } from "@/lib/mock/entities";

/*
 * MOCK DATA — diagnostic cho Minh Phát.
 * Quy ước UI (tự quyết, chờ backend xác nhận): noi_dung_diagnostic là các đầu mục check,
 * mỗi dòng (ngăn bằng "\n") hiển thị thành 1 ô checklist.
 */

// Lấy context entity từ kho mock để nội dung khớp nhau
function ctx(...ids: string[]): ContextEntity[] {
  return ids.map((id) => {
    const e = mockEntities.find((x) => x.id === id)!;
    return { id: e.id, loai_entity: e.loai_entity, ten_entity: e.ten_entity, noi_dung_goc: e.noi_dung_goc };
  });
}

const base = { customer_id: "c-minh-phat", nguoi_duyet_id: null } as const;

export const mockDiagnostics: Diagnostic[] = [
  {
    ...base,
    id: "dg-01",
    entity_id: "e-01",
    department_id: "d-ke-toan",
    muc_anh_huong: "primary",
    trang_thai_ap_dung: "ap_dung",
    noi_dung_diagnostic: [
      "Kiểm tra mọi đơn hàng hoàn tất trên Shopee/TikTok Shop đều đã có hoá đơn điện tử tương ứng",
      "Đối chiếu số đơn hoàn tất trong báo cáo sàn với số hoá đơn đã phát hành theo từng ngày",
      "Rà soát các đơn người mua không lấy hoá đơn — vẫn phải lập hoá đơn",
      "Xác nhận phần mềm hoá đơn có kết nối hoặc quy trình xuất hoá đơn hàng loạt từ dữ liệu sàn",
    ].join("\n"),
    trang_thai_duyet: "cho_duyet",
    context_entities: ctx("e-02", "e-03"),
  },
  {
    ...base,
    id: "dg-02",
    entity_id: "e-01",
    department_id: "d-kinh-doanh",
    muc_anh_huong: "secondary",
    trang_thai_ap_dung: "ap_dung",
    noi_dung_diagnostic: [
      "Kiểm tra quy trình chuyển dữ liệu đơn hàng từ sàn sang phòng Kế toán có đủ thông tin để lập hoá đơn",
      "Rà soát đơn có khuyến mãi/voucher sàn — giá trên hoá đơn có khớp giá thực thu không",
    ].join("\n"),
    trang_thai_duyet: "cho_duyet",
    context_entities: ctx("e-02"),
  },
  {
    ...base,
    id: "dg-03",
    entity_id: "e-05",
    department_id: "d-ke-toan",
    muc_anh_huong: "primary",
    trang_thai_ap_dung: "ap_dung",
    noi_dung_diagnostic: [
      "Lọc các hoá đơn mua vào từ ngưỡng quy định trở lên trong kỳ",
      "Kiểm tra mỗi hoá đơn đó đã có chứng từ thanh toán qua ngân hàng chưa",
      "Đánh dấu khoản thuế GTGT đầu vào có rủi ro không được khấu trừ",
    ].join("\n"),
    trang_thai_duyet: "cho_duyet",
    context_entities: ctx("e-06", "e-07"),
  },
  {
    ...base,
    id: "dg-04",
    entity_id: "e-05",
    department_id: "d-ban-gd",
    muc_anh_huong: "secondary",
    trang_thai_ap_dung: "ap_dung",
    noi_dung_diagnostic: [
      "Kiểm tra quy định nội bộ về hạn mức thanh toán tiền mặt cho nhà cung cấp",
      "Xác nhận người được uỷ quyền duyệt chi qua ngân hàng",
    ].join("\n"),
    trang_thai_duyet: "da_duyet",
    context_entities: ctx("e-06"),
  },
  {
    ...base,
    id: "dg-05",
    entity_id: "e-05",
    department_id: "d-kho-van",
    muc_anh_huong: "secondary",
    trang_thai_ap_dung: "chua_du_thong_tin",
    noi_dung_diagnostic: [
      "Cần xác nhận: phòng Kho vận có trực tiếp thanh toán cho nhà cung cấp/đơn vị vận chuyển không?",
    ].join("\n"),
    trang_thai_duyet: "cho_duyet",
  },
  {
    ...base,
    id: "dg-06",
    entity_id: "e-08",
    department_id: "d-ke-toan",
    muc_anh_huong: "primary",
    trang_thai_ap_dung: "ap_dung",
    noi_dung_diagnostic: [
      "Xác nhận doanh thu năm trước thuộc diện khai thuế GTGT theo quý",
      "Kiểm tra lịch nộp hồ sơ khai thuế quý đã được đặt nhắc hạn",
    ].join("\n"),
    trang_thai_duyet: "da_duyet",
    context_entities: ctx("e-09"),
  },
  {
    ...base,
    id: "dg-07",
    entity_id: "e-10",
    department_id: "d-ke-toan",
    muc_anh_huong: "primary",
    trang_thai_ap_dung: "sap_ap_dung",
    noi_dung_diagnostic: [
      "Rà soát nơi đang lưu chứng từ điện tử (máy cá nhân, email, ổ chung…)",
      "Kiểm tra khả năng tra cứu lại chứng từ theo số hoá đơn và kỳ kế toán",
    ].join("\n"),
    trang_thai_duyet: "cho_duyet",
  },
  {
    ...base,
    id: "dg-08",
    entity_id: "e-10",
    department_id: "d-kho-van",
    muc_anh_huong: "secondary",
    trang_thai_ap_dung: "sap_ap_dung",
    noi_dung_diagnostic: ["Kiểm tra phiếu xuất kho điện tử có được lưu kèm mã đơn hàng sàn không"].join("\n"),
    trang_thai_duyet: "cho_duyet",
  },
  {
    ...base,
    id: "dg-09",
    entity_id: "e-12",
    department_id: "d-kinh-doanh",
    muc_anh_huong: "primary",
    trang_thai_ap_dung: "khong_ap_dung",
    noi_dung_diagnostic: ["Không áp dụng: công ty không có điểm bán lẻ trực tiếp tại cửa hàng"].join("\n"),
    trang_thai_duyet: "da_duyet",
  },
];
