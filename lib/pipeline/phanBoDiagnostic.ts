// Quy tắc 5 — phân diagnostic của 1 hanh_vi cho các phòng đích, tính trên các dòng đã có. Code thuần, không gọi DB.
// Mỗi phòng đích đúng 1 dòng. Dòng cũ của phòng không còn là đích (khách hàng đổi phòng ban, hoặc lần trước
// rơi về Ban Giám đốc vì chưa có phòng khớp) mà còn cho_duyet:
//   - được CHUYỂN sang phòng đích còn thiếu dòng (giữ id + lịch sử) thay vì tạo dòng mới;
//   - còn thừa → khong_ap_dung, để không thành 2 task trùng cho cùng 1 hanh_vi.
// Dòng đã duyệt / từ chối bị DB khóa → để nguyên.

export type DongDiagnostic = { id: string; department_id: string; trang_thai_duyet: string };

export type KeHoachPhanBo = {
  capNhat: { id: string; department_id: string }[]; // giữ phòng hoặc chuyển phòng
  taoMoi: string[]; // department_id cần tạo dòng mới
  thua: string[]; // id dòng cũ không còn phòng nhận
};

export function phanBoDiagnostic(existing: readonly DongDiagnostic[], phongDich: readonly string[]): KeHoachPhanBo {
  const keHoach: KeHoachPhanBo = { capNhat: [], taoMoi: [], thua: [] };
  const conTrong = existing.filter((d) => !phongDich.includes(d.department_id) && d.trang_thai_duyet === "cho_duyet");

  for (const dept of phongDich) {
    const coSan = existing.find((d) => d.department_id === dept);
    const chuyen = coSan ? undefined : conTrong.shift();
    if (coSan) keHoach.capNhat.push({ id: coSan.id, department_id: dept });
    else if (chuyen) keHoach.capNhat.push({ id: chuyen.id, department_id: dept });
    else keHoach.taoMoi.push(dept);
  }
  keHoach.thua = conTrong.map((d) => d.id);
  return keHoach;
}
