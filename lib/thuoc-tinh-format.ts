import type { DieuKienMayDoc, ThuocTinhHoSo, ThuocTinhKhachHang } from "@/lib/types";

// Hiển thị giá trị thuộc tính / điều kiện máy đọc cho người đọc (tiếng Việt).
// Giá trị lua_chon hiển thị NGUYÊN VĂN như trong thuoc_tinh_ho_so.lua_chon (không map nhãn ở frontend).

export type GiaTriThuocTinh = ThuocTinhKhachHang[string];

export function formatGiaTri(tt: ThuocTinhHoSo | undefined, v: GiaTriThuocTinh | undefined): string {
  if (v === undefined) return "Chưa trả lời";
  if (v === null) return "Chưa chắc";
  if (typeof v === "boolean") return v ? "Có" : "Không";
  if (typeof v === "number") return `${v.toLocaleString("vi-VN")}${tt?.don_vi ? ` ${tt.don_vi}` : ""}`;
  if (Array.isArray(v)) return v.length ? v.join(", ") : "Không có";
  return v;
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
