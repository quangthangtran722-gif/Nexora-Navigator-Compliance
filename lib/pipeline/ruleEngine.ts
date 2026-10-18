// Rule engine — CODE THUẦN, KHÔNG gọi AI (CLAUDE.md mục 3.2). Không import gì ngoài type.
// So dieu_kien_may_doc (curator điền) với customers.thuoc_tinh, ra 1 trong 4 trạng thái.
// Quy tắc 1–4 ở docs/CONTRACT.md §7 "Quy tắc rule engine"; quy tắc 5 (route phòng ban) ở filterDomain.ts.

export type TrangThaiApDung = "ap_dung" | "sap_ap_dung" | "khong_ap_dung" | "chua_du_thong_tin";

export type GiaTriThuocTinh = boolean | number | string | string[] | null;
export type ThuocTinhKhachHang = Record<string, GiaTriThuocTinh>;

export type DieuKienMayDoc = {
  thuoc_tinh: string;
  toan_tu: "eq" | "neq" | "gt" | "gte" | "lt" | "lte" | "in" | "not_in" | "contains" | "contains_any";
  gia_tri: boolean | number | string | number[] | string[];
};

export type DieuKien = { entity_id: string; ten_entity: string; dieu_kien_may_doc: DieuKienMayDoc };

// true = thỏa, false = không thỏa, null = khách hàng chưa trả lời (thiếu key / null / "Chưa chắc")
export type KetQuaDieuKien = DieuKien & { gia_tri_khach_hang: GiaTriThuocTinh | undefined; ket_qua: boolean | null };

export type DanhGia = {
  trang_thai_ap_dung: TrangThaiApDung;
  thuoc_tinh_thieu: string[];
  ly_do: "ngoai_linh_vuc" | "dieu_kien_khong_thoa" | "thieu_thong_tin" | "chua_den_ngay_hieu_luc" | "da_hieu_luc";
  ngay_hieu_luc: string;
  dieu_kien: KetQuaDieuKien[];
};

export function evaluateCondition(dk: DieuKienMayDoc, value: GiaTriThuocTinh | undefined): boolean | null {
  if (value === undefined || value === null) return null;
  const { toan_tu: op, gia_tri: target } = dk;

  switch (op) {
    case "eq":
      return value === target;
    case "neq":
      return value !== target;
    case "gt":
    case "gte":
    case "lt":
    case "lte": {
      if (typeof value !== "number" || typeof target !== "number") return null;
      if (op === "gt") return value > target;
      if (op === "gte") return value >= target;
      if (op === "lt") return value < target;
      return value <= target;
    }
    case "in":
    case "not_in": {
      if (!Array.isArray(target) || Array.isArray(value)) return null;
      const found = (target as (number | string)[]).includes(value as number | string);
      return op === "in" ? found : !found;
    }
    case "contains":
      return Array.isArray(value) ? value.includes(target as string) : null;
    case "contains_any":
      return Array.isArray(value) && Array.isArray(target)
        ? (target as string[]).some((t) => value.includes(t))
        : null;
  }
}

export function evaluateEntity(input: {
  domain: string;
  customerDomains: readonly string[];
  thuocTinh: ThuocTinhKhachHang;
  dieuKien: readonly DieuKien[];
  ngayHieuLuc: string; // entity.ngay_co_hieu_luc ?? van_ban.ngay_hieu_luc, "YYYY-MM-DD"
  homNay: string; // "YYYY-MM-DD" theo giờ Việt Nam
}): DanhGia {
  const base = { ngay_hieu_luc: input.ngayHieuLuc, thuoc_tinh_thieu: [] as string[] };

  // Quy tắc 1
  if (!input.customerDomains.includes(input.domain)) {
    return { ...base, trang_thai_ap_dung: "khong_ap_dung", ly_do: "ngoai_linh_vuc", dieu_kien: [] };
  }

  // Quy tắc 2–3: AND mọi điều kiện; "sai" thắng "thiếu"
  const dieuKien = input.dieuKien.map((dk) => {
    const value = input.thuocTinh[dk.dieu_kien_may_doc.thuoc_tinh];
    return { ...dk, gia_tri_khach_hang: value, ket_qua: evaluateCondition(dk.dieu_kien_may_doc, value) };
  });
  if (dieuKien.some((d) => d.ket_qua === false)) {
    return { ...base, trang_thai_ap_dung: "khong_ap_dung", ly_do: "dieu_kien_khong_thoa", dieu_kien: dieuKien };
  }
  const thieu = [...new Set(dieuKien.filter((d) => d.ket_qua === null).map((d) => d.dieu_kien_may_doc.thuoc_tinh))];
  if (thieu.length) {
    return { ...base, trang_thai_ap_dung: "chua_du_thong_tin", thuoc_tinh_thieu: thieu, ly_do: "thieu_thong_tin", dieu_kien: dieuKien };
  }

  // Quy tắc 4 — so chuỗi YYYY-MM-DD = so ngày
  return input.ngayHieuLuc > input.homNay
    ? { ...base, trang_thai_ap_dung: "sap_ap_dung", ly_do: "chua_den_ngay_hieu_luc", dieu_kien: dieuKien }
    : { ...base, trang_thai_ap_dung: "ap_dung", ly_do: "da_hieu_luc", dieu_kien: dieuKien };
}

export function todayInVietnam(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh" }).format(now);
}
