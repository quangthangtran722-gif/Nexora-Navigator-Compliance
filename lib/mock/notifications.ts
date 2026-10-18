import type { Notification } from "@/lib/types";

/*
 * MOCK DATA — thông báo 3 giai đoạn (CONTRACT §3.8):
 *  hoi_bo_sung: diagnostic chuyển sang chua_du_thong_tin → người đầu mối (noi_dung = mã thuộc tính thiếu)
 *  cho_duyet:   AI vừa điền noi_dung_diagnostic → người đầu mối
 *  da_giao:     người đầu mối đã duyệt → phòng ban department_id
 * department_id khác null ⇔ giai_doan = "da_giao".
 */

const base = { customer_id: "c-minh-phat" } as const;

export const mockNotifications: Notification[] = [
  { ...base, id: "n-01", diagnostic_id: "dg-03", giai_doan: "hoi_bo_sung", department_id: null, tieu_de: "Cần bổ sung thông tin — Thanh toán không dùng tiền mặt", noi_dung: "gia_tri_mua_vao_lon_nhat", da_doc: false, created_at: "2026-10-16T02:00:12Z" },
  { ...base, id: "n-02", diagnostic_id: "dg-01", giai_doan: "cho_duyet", department_id: null, tieu_de: "Checklist mới chờ duyệt — Lập hoá đơn điện tử (Kế toán)", noi_dung: null, da_doc: false, created_at: "2026-10-16T02:00:25Z" },
  { ...base, id: "n-03", diagnostic_id: "dg-02", giai_doan: "cho_duyet", department_id: null, tieu_de: "Checklist mới chờ duyệt — Lập hoá đơn điện tử (Kinh doanh)", noi_dung: null, da_doc: false, created_at: "2026-10-16T02:00:25Z" },
  { ...base, id: "n-04", diagnostic_id: "dg-05", giai_doan: "cho_duyet", department_id: null, tieu_de: "Checklist mới chờ duyệt — Lưu trữ chứng từ điện tử (Kế toán)", noi_dung: null, da_doc: false, created_at: "2026-10-16T02:00:26Z" },
  { ...base, id: "n-05", diagnostic_id: "dg-04", giai_doan: "cho_duyet", department_id: null, tieu_de: "Checklist mới chờ duyệt — Khai thuế GTGT theo quý (Kế toán)", noi_dung: null, da_doc: true, created_at: "2026-10-16T02:00:25Z" },
  { ...base, id: "n-06", diagnostic_id: "dg-04", giai_doan: "da_giao", department_id: "d-ke-toan", tieu_de: "Việc cần kiểm tra mới — Khai thuế GTGT theo quý", noi_dung: null, da_doc: false, created_at: "2026-10-16T09:30:00Z" },
  { ...base, id: "n-07", diagnostic_id: "dg-07", giai_doan: "da_giao", department_id: "d-kinh-doanh", tieu_de: "Việc cần kiểm tra mới — Hoá đơn máy tính tiền", noi_dung: null, da_doc: true, created_at: "2026-09-02T03:00:00Z" },
];
