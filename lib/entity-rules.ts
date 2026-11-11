import type { BoMaDieuKien, Entity } from "@/lib/types";

// Bản sao phía giao diện của hàm SQL `entity_du_dieu_kien_duyet` (migration 007). Chỉ dùng để khóa nút Duyệt, đếm số mục
// "Duyệt tất cả" sẽ bỏ qua và hiện lý do — DB vẫn là nơi chặn thật (approve_entity trả PT400, approve_chunk bỏ qua).
// Sửa quy tắc ở đây thì phải sửa cùng hàm SQL (tests/entityRules.test.ts giữ hai bên khớp nhau theo từng ca).
// Trả null nếu đủ trường để duyệt; ngược lại trả lý do (câu giống hàm SQL).
export function lyDoChuaDuDuyet(
  e: Pick<Entity, "loai_entity" | "pham_vi" | "ma_dieu_kien" | "dieu_kien_may_doc" | "khong_hinh_thuc_hoa" | "van_ban_dan_chieu">,
  boMa: BoMaDieuKien[],
): string | null {
  if (e.loai_entity === "hanh_vi") {
    return e.pham_vi === null ? "Nghĩa vụ chưa xác nhận phạm vi (chung / có điều kiện)" : null;
  }
  if (e.loai_entity !== "chu_the" && e.loai_entity !== "dieu_kien" && e.loai_entity !== "nguong") return null;

  if (e.ma_dieu_kien === null) return "Chưa gán mã điều kiện C0–C7";
  const ma = boMa.find((m) => m.ma === e.ma_dieu_kien);
  if (!ma) return "Chưa gán mã điều kiện C0–C7";

  if (ma.nhom === "chung") {
    if (e.loai_entity !== "chu_the") return `Mã ${ma.ma} (áp dụng mọi đối tượng) chỉ dùng cho chủ thể, không cho ${e.loai_entity}`;
    if (e.pham_vi !== "chung" || e.dieu_kien_may_doc !== null || e.khong_hinh_thuc_hoa)
      return `Mã ${ma.ma}: phạm vi phải là "chung", không có điều kiện máy đọc, không gắn cờ không hình thức hóa`;
    return null;
  }
  if (ma.nhom === "may_doc") {
    if (e.pham_vi !== "co_dieu_kien" || e.dieu_kien_may_doc === null || e.khong_hinh_thuc_hoa)
      return `Mã ${ma.ma}: phạm vi phải là "có điều kiện" và có điều kiện máy đọc`;
    return null;
  }
  if (e.pham_vi !== "co_dieu_kien" || !e.khong_hinh_thuc_hoa || e.dieu_kien_may_doc !== null)
    return `Mã ${ma.ma}: phạm vi phải là "có điều kiện", gắn cờ không hình thức hóa, không có điều kiện máy đọc`;
  if (ma.can_van_ban_dan_chieu && !(e.van_ban_dan_chieu ?? "").trim()) return `Mã ${ma.ma}: phải ghi văn bản được dẫn chiếu`;
  return null;
}

// Loại entity cần chọn mã điều kiện trước khi duyệt
export const CAN_MA_DIEU_KIEN = ["chu_the", "dieu_kien", "nguong"] as const;

// Khi chuyên viên ĐỔI MÃ: các trường phải đổi theo để không vi phạm CHECK của DB (cờ và điều kiện máy đọc loại trừ nhau).
// Không tự xác nhận phạm vi chung: chọn mã nhóm "chung" để pham_vi = null, chuyên viên tick xác nhận riêng (quyết định M7 (a)).
// Chọn mã nhóm khác ghi pham_vi = co_dieu_kien — chọn mã có điều kiện chính là khẳng định "có điều kiện".
export function patchKhiDoiMa(ma: BoMaDieuKien, e: Pick<Entity, "dieu_kien_may_doc">) {
  return {
    ma_dieu_kien: ma.ma,
    pham_vi: ma.nhom === "chung" ? null : ("co_dieu_kien" as const),
    khong_hinh_thuc_hoa: false,
    van_ban_dan_chieu: null,
    dieu_kien_may_doc: ma.nhom === "may_doc" ? e.dieu_kien_may_doc : null,
  };
}
