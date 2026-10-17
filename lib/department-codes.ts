/*
 * Mã phòng ban chuẩn — dùng để nối phòng ban của khách hàng với
 * primary_departments / secondary_departments của entity khi route diagnostic.
 *
 * TODO: danh sách thật đang chờ backend gửi. KHÔNG tự đặt thêm mã ở đây —
 * tạm chỉ có 1 giá trị placeholder để form chạy được.
 */
export const DEPARTMENT_CODES = [{ value: "chua_xac_dinh", label: "Chưa xác định (chờ danh sách mã từ backend)" }] as const;

export type DepartmentCode = (typeof DEPARTMENT_CODES)[number]["value"];

export const DEPARTMENT_CODE_VALUES = DEPARTMENT_CODES.map((c) => c.value) as [DepartmentCode, ...DepartmentCode[]];
