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

// Thuộc tính rule engine thấy = customers.thuoc_tinh + các CỘT nganh, quy_mo của customers (nguồn sự thật — form
// onboarding có field riêng, ghi vào cột). Cột thắng JSONB: bản sao cũ trong thuoc_tinh (nếu có) không làm lệch kết quả.
// → curator viết được {"thuoc_tinh":"nganh","toan_tu":"eq","gia_tri":"chung_khoan"} hay {"thuoc_tinh":"quy_mo",...}.
export const THUOC_TINH_TU_COT: readonly string[] = ["nganh", "quy_mo"];

export function thuocTinhRuleEngine(customer: {
  nganh: string | null;
  quy_mo?: string | null;
  thuoc_tinh: ThuocTinhKhachHang;
}): ThuocTinhKhachHang {
  return {
    ...customer.thuoc_tinh,
    nganh: customer.nganh ?? customer.thuoc_tinh.nganh ?? null,
    quy_mo: customer.quy_mo ?? customer.thuoc_tinh.quy_mo ?? null,
  };
}

// Quy tắc 2 — điều kiện của 1 hanh_vi = entity điều kiện nối với nó bằng cạnh (cả 2 đầu đã duyệt):
//   dieu_kien | nguong —dieu_kien→ hanh_vi,   và   hanh_vi —ap_dung_cho→ chu_the  (hanh_vi KẾ THỪA điều kiện của chủ thể).
// Entity nối tới mà không có dieu_kien_may_doc (chủ thể chung) không thêm điều kiện nào.
// hanh_vi không có cạnh nào tới entity mang điều kiện → [] → áp dụng MỌI doanh nghiệp đăng ký lĩnh vực đó.
export type CanhDieuKien = { hanhViId: string; entityId: string };
export type EntityDieuKien = { id: string; ten_entity: string; dieu_kien_may_doc: DieuKienMayDoc | null };

export function ghepDieuKien(canh: readonly CanhDieuKien[], entities: readonly EntityDieuKien[]): Map<string, DieuKien[]> {
  const byId = new Map(entities.map((e) => [e.id, e]));
  const result = new Map<string, DieuKien[]>();
  for (const { hanhViId, entityId } of canh) {
    const e = byId.get(entityId);
    if (!e?.dieu_kien_may_doc) continue;
    const list = result.get(hanhViId) ?? [];
    if (list.some((d) => d.entity_id === entityId)) continue;
    list.push({ entity_id: entityId, ten_entity: e.ten_entity, dieu_kien_may_doc: e.dieu_kien_may_doc });
    result.set(hanhViId, list);
  }
  return result;
}

// Lõi quét DUY NHẤT — mọi điểm kích hoạt đều đi qua đây (filterDomain.ts):
//   chiều thuận  — văn bản mới được duyệt → nút "Quét lại khách hàng hiện có" (/api/pipeline/rescan), từng khách hàng;
//   chiều ngược  — doanh nghiệp mới onboard (/api/onboard) → toàn bộ văn bản active cho 1 khách hàng;
//   hỏi bổ sung — 1 entity (/api/pipeline/filter với entity_id).
// Kết quả của 1 hanh_vi chỉ phụ thuộc chính nó + điều kiện nối với nó + hồ sơ, không phụ thuộc tập đang quét
// → 2 chiều ra cùng một tập (tests/doiXung.test.ts).
export type HanhViQuet = { id: string; domain: string; ngayHieuLuc: string };

export function quetKhachHang(input: {
  hanhVi: readonly HanhViQuet[];
  dieuKienTheoHanhVi: ReadonlyMap<string, readonly DieuKien[]>;
  customerDomains: readonly string[];
  thuocTinh: ThuocTinhKhachHang;
  homNay: string;
}): Map<string, DanhGia> {
  return new Map(
    input.hanhVi.map((h) => [
      h.id,
      evaluateEntity({
        domain: h.domain,
        customerDomains: input.customerDomains,
        thuocTinh: input.thuocTinh,
        dieuKien: input.dieuKienTheoHanhVi.get(h.id) ?? [],
        ngayHieuLuc: h.ngayHieuLuc,
        homNay: input.homNay,
      }),
    ]),
  );
}

export function todayInVietnam(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh" }).format(now);
}
