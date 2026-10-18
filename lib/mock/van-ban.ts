import type { VanBan, VanBanChunk } from "@/lib/types";

/*
 * MOCK DATA — kho văn bản + chunk (CONTRACT §3.9).
 * Số hiệu dạng "MAU-xx" và nội dung là VĂN BẢN MẪU tự viết, không phải văn bản pháp luật thật.
 */

const T = "2026-10-10T08:00:00Z";

function vb(id: string, ten: string, so_hieu: string, loai: VanBan["loai_van_ban"], hieu_luc: string, domains: string[], trang_thai: VanBan["trang_thai"] = "active"): VanBan {
  return {
    id,
    ten_van_ban: ten,
    so_hieu,
    loai_van_ban: loai,
    co_quan_ban_hanh: "Cơ quan ban hành (mẫu)",
    ngay_ban_hanh: null,
    ngay_hieu_luc: hieu_luc,
    domains,
    trang_thai,
    nguoi_tao_id: "u-curator",
    created_at: T,
    updated_at: T,
  };
}

export const mockVanBan: VanBan[] = [
  vb("vb-01", "Văn bản mẫu A — hoá đơn, chứng từ", "MAU-01/2025", "nghi_dinh", "2025-06-01", ["thue"]),
  vb("vb-02", "Văn bản mẫu B — thuế giá trị gia tăng", "MAU-02/2024", "luat", "2025-07-01", ["thue"]),
  vb("vb-03", "Văn bản mẫu C — quản lý thuế", "MAU-03/2019", "luat", "2025-01-01", ["thue"]),
  vb("vb-04", "Văn bản mẫu D — kế toán", "MAU-04/2015", "luat", "2025-01-01", ["ke_toan"]),
  // Văn bản mới nạp, đang trích xuất/duyệt → khách hàng chưa thấy (draft)
  vb("vb-05", "Văn bản mẫu E — sửa đổi quy định hoá đơn điện tử", "MAU-05/2026", "thong_tu", "2026-12-01", ["thue"], "draft"),
];

function chunk(id: string, van_ban_id: string, thu_tu: number, range: string, trang_thai: VanBanChunk["trang_thai"], noi_dung: string): VanBanChunk {
  return { id, van_ban_id, thu_tu, tieu_de: null, dieu_khoan_range: range, noi_dung, trang_thai, created_at: T, updated_at: T };
}

export const mockChunks: VanBanChunk[] = [
  chunk("ch-01", "vb-01", 1, "Điều 8–9", "hoan_tat", "Điều 8. … (văn bản mẫu) Người bán hàng qua sàn giao dịch thương mại điện tử phải lập hoá đơn điện tử …"),
  chunk("ch-02", "vb-01", 2, "Điều 24", "hoan_tat", "Điều 24. … (văn bản mẫu) Phạt tiền đối với hành vi lập hoá đơn không đúng thời điểm …"),
  chunk("ch-07", "vb-01", 3, "Điều 11", "hoan_tat", "Điều 11. … (văn bản mẫu) Doanh nghiệp bán lẻ trực tiếp tại cửa hàng sử dụng hoá đơn khởi tạo từ máy tính tiền …"),
  chunk("ch-03", "vb-02", 1, "Điều 14", "hoan_tat", "Điều 14. … (văn bản mẫu) Hàng hoá mua vào phải có chứng từ thanh toán không dùng tiền mặt …"),
  chunk("ch-04", "vb-02", 2, "Điều 9", "hoan_tat", "Điều 9. … (văn bản mẫu) Mức thuế suất 10% áp dụng đối với …"),
  chunk("ch-05", "vb-03", 1, "Điều 9, Điều 44", "hoan_tat", "Điều 9. … (văn bản mẫu) khai thuế theo quý … Điều 44. … thời hạn nộp hồ sơ khai thuế …"),
  chunk("ch-06", "vb-04", 1, "Điều 18, Điều 41", "hoan_tat", "Điều 18. … Điều 41. … (văn bản mẫu) lưu trữ tài liệu kế toán dạng điện tử …"),
  chunk("ch-08", "vb-04", 2, "Điều 42", "loi", "Điều 42. … (văn bản mẫu) thời hạn lưu trữ tài liệu kế toán …"),
  chunk("ch-09", "vb-05", 1, "Điều 5", "da_trich_xuat", "Điều 5. … (văn bản mẫu) Người bán gửi dữ liệu hoá đơn không có mã cho cơ quan thuế chậm nhất cuối ngày …"),
  chunk("ch-10", "vb-05", 2, "Điều 6", "da_trich_xuat", "Điều 6. … (văn bản mẫu) Doanh nghiệp có doanh thu năm từ 3 tỷ đồng trở lên đăng ký sử dụng hoá đơn có mã …"),
];
