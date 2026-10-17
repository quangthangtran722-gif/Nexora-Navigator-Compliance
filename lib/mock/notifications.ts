import type { Notification } from "@/lib/types";

/*
 * MOCK DATA — thông báo 2 giai đoạn:
 *  cho_duyet: báo người đầu mối (department_id = null) khi có diagnostic mới chờ duyệt
 *  da_giao:   báo phòng ban sau khi người đầu mối duyệt — phòng ảnh hưởng chính trước, phụ sau
 */

const base = { customer_id: "c-minh-phat", noi_dung: null } as const;

export const mockNotifications: Notification[] = [
  // --- Giai đoạn 1: người đầu mối ---
  { ...base, id: "n-01", diagnostic_id: "dg-01", giai_doan: "cho_duyet", department_id: null, tieu_de: "Diagnostic mới chờ duyệt — Lập hoá đơn điện tử (Kế toán)", da_doc: false, created_at: "2026-10-16T02:00:10Z" },
  { ...base, id: "n-02", diagnostic_id: "dg-02", giai_doan: "cho_duyet", department_id: null, tieu_de: "Diagnostic mới chờ duyệt — Lập hoá đơn điện tử (Kinh doanh)", da_doc: false, created_at: "2026-10-16T02:00:10Z" },
  { ...base, id: "n-03", diagnostic_id: "dg-03", giai_doan: "cho_duyet", department_id: null, tieu_de: "Diagnostic mới chờ duyệt — Thanh toán không dùng tiền mặt (Kế toán)", da_doc: true, created_at: "2026-10-16T02:00:15Z" },
  { ...base, id: "n-04", diagnostic_id: "dg-05", giai_doan: "cho_duyet", department_id: null, tieu_de: "Cần bổ sung thông tin — Thanh toán không dùng tiền mặt (Kho vận)", da_doc: false, created_at: "2026-10-16T02:00:15Z" },
  { ...base, id: "n-05", diagnostic_id: "dg-07", giai_doan: "cho_duyet", department_id: null, tieu_de: "Diagnostic mới chờ duyệt — Lưu trữ chứng từ điện tử (Kế toán)", da_doc: false, created_at: "2026-10-16T02:00:24Z" },

  // --- Giai đoạn 2: phòng ban (sau khi người đầu mối duyệt) ---
  { ...base, id: "n-11", diagnostic_id: "dg-06", giai_doan: "da_giao", department_id: "d-ke-toan", tieu_de: "Việc cần kiểm tra mới — Khai thuế GTGT theo quý", da_doc: true, created_at: "2026-10-12T03:15:00Z" },
  { ...base, id: "n-12", diagnostic_id: "dg-03", giai_doan: "da_giao", department_id: "d-ke-toan", tieu_de: "Việc cần kiểm tra mới — Thanh toán không dùng tiền mặt", da_doc: false, created_at: "2026-10-16T09:30:00Z" },
  // Phòng phụ được báo sau phòng chính của cùng entity (e-05)
  { ...base, id: "n-13", diagnostic_id: "dg-04", giai_doan: "da_giao", department_id: "d-ban-gd", tieu_de: "Việc cần kiểm tra mới — Thanh toán không dùng tiền mặt", da_doc: false, created_at: "2026-10-16T09:45:00Z" },
];
