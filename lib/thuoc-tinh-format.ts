import type { DieuKienMayDoc, ThuocTinhHoSo, ThuocTinhKhachHang } from "@/lib/types";

// Hiển thị giá trị thuộc tính / điều kiện áp dụng cho người đọc (tiếng Việt).
// Mã lựa chọn (lua_chon) không hiện ra giao diện (wording v1): nhãn đọc từ mo_ta của chính câu hỏi khi mo_ta có dạng
// "Nhãn: mã_1 = Tên 1; mã_2 = Tên 2." (dữ liệu backend seed) — frontend không tự đặt nhãn. Không có nhãn thì hiện mã.

export type GiaTriThuocTinh = ThuocTinhKhachHang[string];

// Bảng nhãn có thể đứng sau một câu mô tả: "Chọn nhiều. Nhãn: ..." hoặc "Nhãn hiển thị: ..."
const NHAN_RE = /Nhãn(?: hiển thị)?\s*:/i;
// Mã nội bộ dạng snake_case (vd ban_hang_qua_san_tmdt) — mô tả có mã là ghi chú cho người nhập liệu, không hiện cho khách
const MA_NOI_BO_RE = /[a-z0-9]+_[a-z0-9_]+/;

// Phần mô tả hiển thị cho người trả lời: bỏ bảng nhãn, bỏ ghi chú có mã nội bộ. Không còn gì → null.
export function moTaHienThi(tt: ThuocTinhHoSo): string | null {
  const m = tt.mo_ta?.split(NHAN_RE)[0].trim();
  if (!m || MA_NOI_BO_RE.test(m)) return null;
  return m;
}

export function nhanLuaChon(tt: ThuocTinhHoSo | undefined): Record<string, string> {
  if (!tt?.mo_ta || !NHAN_RE.test(tt.mo_ta)) return {};
  return Object.fromEntries(
    tt.mo_ta
      .split(NHAN_RE)[1]
      .split(";")
      .map((p) => p.trim().replace(/\.$/, "").split("=").map((s) => s.trim()))
      .filter((kv) => kv.length === 2 && kv[0] && kv[1]),
  );
}

// Không có nhãn → dự phòng dễ đọc từ mã (cua_hang → "Cua hang") thay vì lộ mã gạch dưới
const nhanDuPhong = (ma: string) => {
  const s = ma.replace(/_/g, " ");
  return s.charAt(0).toUpperCase() + s.slice(1);
};
export const tenLuaChon = (tt: ThuocTinhHoSo | undefined, ma: string) => nhanLuaChon(tt)[ma] ?? (tt?.lua_chon?.includes(ma) ? nhanDuPhong(ma) : ma);

export function formatGiaTri(tt: ThuocTinhHoSo | undefined, v: GiaTriThuocTinh | undefined): string {
  if (v === undefined) return "Chưa trả lời";
  if (v === null) return "Chưa chắc";
  if (typeof v === "boolean") return v ? "Có" : "Không";
  if (typeof v === "number") return `${v.toLocaleString("vi-VN")}${tt?.don_vi ? ` ${tt.don_vi}` : ""}`;
  if (Array.isArray(v)) return v.length ? v.map((x) => tenLuaChon(tt, String(x))).join(", ") : "Không có";
  return tenLuaChon(tt, v);
}

export const TOAN_TU_LABEL: Record<DieuKienMayDoc["toan_tu"], string> = {
  eq: "=",
  neq: "≠",
  gt: ">",
  gte: "≥",
  lt: "<",
  lte: "≤",
  in: "thuộc",
  not_in: "không thuộc",
  contains: "có chứa",
  contains_any: "có ít nhất 1 trong",
};

// Toán tử hợp lệ theo kiểu thuộc tính (CONTRACT §3.4)
export const TOAN_TU_THEO_KIEU: Record<ThuocTinhHoSo["kieu"], DieuKienMayDoc["toan_tu"][]> = {
  boolean: ["eq", "neq"],
  number: ["eq", "neq", "gt", "gte", "lt", "lte", "in", "not_in"],
  text: ["eq", "neq", "in", "not_in"],
  text_array: ["contains", "contains_any"],
};

export function formatDieuKien(dk: DieuKienMayDoc, dict: ThuocTinhHoSo[]): string {
  const tt = dict.find((t) => t.ma === dk.thuoc_tinh);
  const ten = tt?.cau_hoi.replace(/\?$/, "") ?? dk.thuoc_tinh;
  const gt = Array.isArray(dk.gia_tri)
    ? dk.gia_tri.map((x) => (typeof x === "number" ? x.toLocaleString("vi-VN") : x)).join(", ")
    : formatGiaTri(tt, dk.gia_tri);
  return `${ten} ${TOAN_TU_LABEL[dk.toan_tu]} ${gt}`;
}
