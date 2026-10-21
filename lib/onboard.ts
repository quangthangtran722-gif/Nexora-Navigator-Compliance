// POST /api/onboard (BE-7) — phần code thuần: kiểm tra body, đoán mã phòng ban, tổng hợp kết quả quét.
// Không gọi DB, không gọi AI → test được (tests/onboard.test.ts). Route: app/api/onboard/route.ts.

// Import runtime dùng đường dẫn tương đối + đuôi .ts để `node --test` chạy thẳng không cần bundler
import { PHONG_BAN, type SlugPhongBan } from "./department-codes.ts";
import type { FilterKetQuaDayDu } from "@/lib/pipeline/filterDomain";
import { THUOC_TINH_TU_COT, type GiaTriThuocTinh, type TrangThaiApDung } from "./pipeline/ruleEngine.ts";

export type DinhNghiaThuocTinh = { ma: string; kieu: "boolean" | "number" | "text" | "text_array"; lua_chon: string[] | null };

export type OnboardPayload = {
  ten_cong_ty: string;
  ma_so_thue: string | null;
  nganh: string | null;
  quy_mo: "nho" | "vua" | "lon" | null;
  domains: string[];
  thuoc_tinh: Record<string, GiaTriThuocTinh>;
  phong_ban: { ten_phong_ban: string; slug_phong_ban: SlugPhongBan; email_head: string | null }[];
};

export type LoiTruong = { truong: string; loi: string };

// Tên phòng tự đặt → 1 trong 8 mã chuẩn để route diagnostic. Thứ tự quan trọng: "Tài chính - Kế toán" → ke_toan,
// "Hành chính - Nhân sự" → nhan_su. Không đoán được → frontend gửi kèm slug_phong_ban.
const TU_KHOA_PHONG_BAN: [RegExp, SlugPhongBan][] = [
  [/giám đốc|ban lãnh đạo|ban điều hành|hội đồng quản trị|tổng giám đốc/u, "ban_giam_doc"],
  [/pháp chế|pháp lý|tuân thủ/u, "phap_che"],
  [/kế toán|tài chính|thuế/u, "ke_toan"],
  [/nhân sự|tuyển dụng|tổ chức cán bộ/u, "nhan_su"],
  [/marketing|tiếp thị|truyền thông/u, "marketing"],
  [/kinh doanh|bán hàng|sales|thương mại/u, "kinh_doanh"],
  [/công nghệ|(?:^|[\s-])it(?=[\s-]|$)|kỹ thuật|phần mềm/u, "cong_nghe"],
  [/vận hành|sản xuất|kho|logistics|chuỗi cung ứng/u, "van_hanh"],
];

export function doanSlugPhongBan(ten: string): SlugPhongBan | null {
  const t = ten.normalize("NFC").toLocaleLowerCase("vi");
  return TU_KHOA_PHONG_BAN.find(([re]) => re.test(t))?.[1] ?? null;
}

const SLUG = /^[a-z][a-z_]*$/;
const MA_SO_THUE = /^\d{10}(-\d{3})?$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const QUY_MO = ["nho", "vua", "lon"] as const;

const chuoi = (v: unknown) => (typeof v === "string" ? v.trim() : "");

// Kiểm tra giống trigger kiem_tra_thuoc_tinh_khach_hang + các ràng buộc cột, gom TẤT CẢ lỗi một lần để form báo đủ
export function kiemTraOnboard(
  body: Record<string, unknown>,
  dict: readonly DinhNghiaThuocTinh[],
): { payload: OnboardPayload; loi: [] } | { payload: null; loi: LoiTruong[] } {
  const loi: LoiTruong[] = [];
  const them = (truong: string, msg: string) => loi.push({ truong, loi: msg });

  const tenCongTy = chuoi(body.ten_cong_ty);
  if (!tenCongTy) them("ten_cong_ty", "Bắt buộc");
  else if (tenCongTy.length > 200) them("ten_cong_ty", "Tối đa 200 ký tự");

  const maSoThue = body.ma_so_thue == null || body.ma_so_thue === "" ? null : chuoi(body.ma_so_thue);
  if (maSoThue !== null && !MA_SO_THUE.test(maSoThue)) them("ma_so_thue", "Mã số thuế gồm 10 số, hoặc 10 số + \"-\" + 3 số (chi nhánh)");

  const nganh = body.nganh == null || body.nganh === "" ? null : chuoi(body.nganh);
  if (nganh !== null && !SLUG.test(nganh)) them("nganh", "Mã ngành dạng slug, vd cong_nghe_thong_tin");

  const quyMo = body.quy_mo ?? null;
  if (quyMo !== null && !QUY_MO.includes(quyMo as (typeof QUY_MO)[number])) them("quy_mo", "Chỉ nhận nho | vua | lon");

  const domains = Array.isArray(body.domains) ? body.domains : null;
  if (!domains || !domains.length) them("domains", "Chọn ít nhất 1 lĩnh vực theo dõi");
  else domains.forEach((d, i) => typeof d === "string" && SLUG.test(d) || them(`domains[${i}]`, "Mã lĩnh vực dạng slug, vd thue"));

  const thuocTinh: Record<string, GiaTriThuocTinh> = {};
  const tt = body.thuoc_tinh ?? {};
  if (typeof tt !== "object" || tt === null || Array.isArray(tt)) them("thuoc_tinh", "Phải là object {ma: giá trị}");
  else {
    for (const [ma, v] of Object.entries(tt)) {
      const truong = `thuoc_tinh.${ma}`;
      if (THUOC_TINH_TU_COT.includes(ma)) {
        them(truong, `Gửi ở field "${ma}" riêng, không gửi trong thuoc_tinh`);
        continue;
      }
      const def = dict.find((d) => d.ma === ma);
      if (!def) {
        them(truong, "Thuộc tính chưa có trong danh mục thuoc_tinh_ho_so");
        continue;
      }
      if (v !== null && !hopKieu(def, v)) {
        them(truong, def.lua_chon ? `Kiểu ${def.kieu}, giá trị thuộc: ${def.lua_chon.join(", ")}` : `Phải là kiểu ${def.kieu}`);
        continue;
      }
      thuocTinh[ma] = v as GiaTriThuocTinh; // null = "Chưa chắc"
    }
  }

  const phongBan: OnboardPayload["phong_ban"] = [];
  const pb = Array.isArray(body.phong_ban) ? body.phong_ban : null;
  if (!pb || !pb.length) them("phong_ban", "Cần ít nhất 1 phòng ban");
  else {
    pb.forEach((p: unknown, i) => {
      const o = (typeof p === "object" && p !== null ? p : {}) as Record<string, unknown>;
      const ten = chuoi(o.ten_phong_ban);
      if (!ten) return them(`phong_ban[${i}].ten_phong_ban`, "Bắt buộc");
      if (phongBan.some((x) => x.ten_phong_ban.toLocaleLowerCase("vi") === ten.toLocaleLowerCase("vi"))) {
        return them(`phong_ban[${i}].ten_phong_ban`, "Trùng tên phòng ban");
      }
      const slugGui = o.slug_phong_ban == null || o.slug_phong_ban === "" ? null : o.slug_phong_ban;
      if (slugGui !== null && !PHONG_BAN.includes(slugGui as SlugPhongBan)) {
        return them(`phong_ban[${i}].slug_phong_ban`, `Chỉ nhận: ${PHONG_BAN.join(", ")}`);
      }
      const slug = (slugGui as SlugPhongBan | null) ?? doanSlugPhongBan(ten);
      if (!slug) return them(`phong_ban[${i}].slug_phong_ban`, `Không đoán được mã phòng ban từ "${ten}" — gửi kèm slug_phong_ban (${PHONG_BAN.join(", ")})`);
      const email = o.email_head == null || o.email_head === "" ? null : chuoi(o.email_head);
      if (email !== null && !EMAIL.test(email)) return them(`phong_ban[${i}].email_head`, "Email không hợp lệ");
      phongBan.push({ ten_phong_ban: ten, slug_phong_ban: slug, email_head: email });
    });
  }

  if (loi.length) return { payload: null, loi };
  return {
    payload: {
      ten_cong_ty: tenCongTy,
      ma_so_thue: maSoThue,
      nganh,
      quy_mo: quyMo as OnboardPayload["quy_mo"],
      domains: domains as string[],
      thuoc_tinh: thuocTinh,
      phong_ban: phongBan,
    },
    loi: [],
  };
}

function hopKieu(def: DinhNghiaThuocTinh, v: unknown): boolean {
  const trongLuaChon = (s: string) => !def.lua_chon || def.lua_chon.includes(s);
  switch (def.kieu) {
    case "boolean":
      return typeof v === "boolean";
    case "number":
      return typeof v === "number" && Number.isFinite(v);
    case "text":
      return typeof v === "string" && trongLuaChon(v);
    case "text_array":
      return Array.isArray(v) && v.every((x) => typeof x === "string" && trongLuaChon(x));
  }
}

// ---------------------------------------------------------------------------------------------------------------
// Response — shape đã chốt với frontend (prompt BE-7)

export type OnboardKetQuaMuc = {
  entity_id: string;
  ten_entity: string;
  trang_thai_ap_dung: TrangThaiApDung;
  ten_phong_ban: string | null; // null = không áp dụng / chưa đủ thông tin → không giao phòng nào
  thuoc_tinh_thieu: string[];
  van_ban: { so_hieu: string; ten_van_ban: string; so_dieu: number | null };
};

export type OnboardResponse = {
  khach_hang_id: string;
  tong_nghia_vu: number;
  thong_ke: Record<TrangThaiApDung, number>;
  theo_phong_ban: { ten_phong_ban: string; so_nghia_vu: number }[];
  ket_qua: OnboardKetQuaMuc[];
};

export type KetQuaQuet = FilterKetQuaDayDu;

const THU_TU: Record<TrangThaiApDung, number> = { ap_dung: 0, sap_ap_dung: 1, chua_du_thong_tin: 2, khong_ap_dung: 3 };

export function soDieu(dieuKhoan: string): number | null {
  const m = /Điều\s+(\d+)/u.exec(dieuKhoan.normalize("NFC"));
  return m ? Number(m[1]) : null;
}

// thong_ke / tong_nghia_vu đếm theo NGHĨA VỤ (entity hanh_vi); theo_phong_ban đếm diagnostic giao cho từng phòng
// (1 nghĩa vụ có thể giao nhiều phòng). Mọi phòng đều có mặt, kể cả 0 — form hiện đủ cơ cấu đã khai.
export function tongHopKetQua(
  khachHangId: string,
  ketQua: readonly KetQuaQuet[],
  diagnostics: readonly { id: string; department_id: string }[],
  departments: readonly { id: string; ten_phong_ban: string }[],
): OnboardResponse {
  const thongKe: Record<TrangThaiApDung, number> = { ap_dung: 0, sap_ap_dung: 0, khong_ap_dung: 0, chua_du_thong_tin: 0 };
  const demPhong = new Map(departments.map((d) => [d.id, 0]));
  const tenPhong = new Map(departments.map((d) => [d.id, d.ten_phong_ban]));
  const phongCuaDiagnostic = new Map(diagnostics.map((d) => [d.id, d.department_id]));
  const muc: OnboardKetQuaMuc[] = [];

  for (const k of ketQua) {
    thongKe[k.trang_thai_ap_dung] += 1;
    const base = {
      entity_id: k.entity_id,
      ten_entity: k.ten_entity,
      trang_thai_ap_dung: k.trang_thai_ap_dung,
      thuoc_tinh_thieu: k.thuoc_tinh_thieu,
      van_ban: { ...k.van_ban, so_dieu: soDieu(k.dieu_khoan) },
    };
    const giao = k.trang_thai_ap_dung === "ap_dung" || k.trang_thai_ap_dung === "sap_ap_dung";
    const phong = giao ? [...new Set(k.diagnostic_ids.map((id) => phongCuaDiagnostic.get(id)).filter((x) => x !== undefined))] : [];
    if (!phong.length) muc.push({ ...base, ten_phong_ban: null });
    for (const deptId of phong) {
      demPhong.set(deptId, (demPhong.get(deptId) ?? 0) + 1);
      muc.push({ ...base, ten_phong_ban: tenPhong.get(deptId) ?? null });
    }
  }

  muc.sort(
    (a, b) =>
      THU_TU[a.trang_thai_ap_dung] - THU_TU[b.trang_thai_ap_dung] ||
      a.van_ban.so_hieu.localeCompare(b.van_ban.so_hieu) ||
      (a.van_ban.so_dieu ?? 1e9) - (b.van_ban.so_dieu ?? 1e9),
  );
  return {
    khach_hang_id: khachHangId,
    tong_nghia_vu: thongKe.ap_dung + thongKe.sap_ap_dung,
    thong_ke: thongKe,
    theo_phong_ban: departments
      .map((d) => ({ ten_phong_ban: d.ten_phong_ban, so_nghia_vu: demPhong.get(d.id) ?? 0 }))
      .sort((a, b) => b.so_nghia_vu - a.so_nghia_vu),
    ket_qua: muc,
  };
}
