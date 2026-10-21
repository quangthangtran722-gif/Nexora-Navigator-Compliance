// Phép thử đối xứng (BE-8, mentor 19/10): "văn bản + profile ra 15 thì profile + văn bản cũng phải ra 15".
// Chiều thuận = từng văn bản được duyệt → quét các doanh nghiệp đang có; chiều ngược = doanh nghiệp mới → quét
// toàn bộ văn bản. Cả 2 đi qua cùng ghepDieuKien + quetKhachHang như filterDomain.ts; test này dựng đúng cách
// filterDomain nạp dữ liệu cho từng chiều (cạnh chỉ lấy theo tập hanh_vi đang quét) rồi so TẬP entity, không chỉ số lượng.
// Chạy: npm test
import assert from "node:assert/strict";
import { test } from "node:test";

import {
  ghepDieuKien,
  quetKhachHang,
  thuocTinhRuleEngine,
  type CanhDieuKien,
  type DanhGia,
  type EntityDieuKien,
  type HanhViQuet,
  type ThuocTinhKhachHang,
} from "../lib/pipeline/ruleEngine.ts";

const HOM_NAY = "2026-10-21";

// 2 văn bản; điều kiện có cạnh cắt ngang văn bản (d_vb1 dùng cho hanh_vi của VB2) và chủ thể dùng chung
const VAN_BAN: Record<string, HanhViQuet[]> = {
  "108/2025/QH15": [
    { id: "dang_ky_thue", domain: "thue", ngayHieuLuc: "2026-07-01" }, // không điều kiện → mọi DN thuế
    { id: "khai_thue_tmdt", domain: "thue", ngayHieuLuc: "2026-07-01" }, // dieu_kien co_san_tmdt
    { id: "khai_thue_lon", domain: "thue", ngayHieuLuc: "2026-07-01" }, // nguong doanh_thu_nam
    { id: "lap_bctc", domain: "ke_toan", ngayHieuLuc: "2026-07-01" }, // lĩnh vực khác
  ],
  "77/2025/TT-BTC": [
    { id: "bao_cao_ck", domain: "thue", ngayHieuLuc: "2026-01-01" }, // kế thừa từ chủ thể "Công ty chứng khoán"
    { id: "khai_bo_sung", domain: "thue", ngayHieuLuc: "2026-01-01" }, // dùng ngưỡng nằm ở VB 108
    { id: "quy_dinh_moi", domain: "thue", ngayHieuLuc: "2027-01-01" }, // sắp áp dụng
    { id: "nguoi_nop_thue", domain: "thue", ngayHieuLuc: "2026-01-01" }, // chủ thể chung, không điều kiện
  ],
};

const CANH: CanhDieuKien[] = [
  { hanhViId: "khai_thue_tmdt", entityId: "dk_tmdt" },
  { hanhViId: "khai_thue_lon", entityId: "ng_doanh_thu" },
  { hanhViId: "bao_cao_ck", entityId: "ct_cong_ty_ck" },
  { hanhViId: "khai_bo_sung", entityId: "ng_doanh_thu" },
  { hanhViId: "nguoi_nop_thue", entityId: "ct_nguoi_nop_thue" },
];

const ENTITY_DIEU_KIEN: EntityDieuKien[] = [
  { id: "dk_tmdt", ten_entity: "Có sàn TMĐT", dieu_kien_may_doc: { thuoc_tinh: "co_san_tmdt", toan_tu: "eq", gia_tri: true } },
  { id: "ng_doanh_thu", ten_entity: "Doanh thu trên 3 tỷ", dieu_kien_may_doc: { thuoc_tinh: "doanh_thu_nam", toan_tu: "gt", gia_tri: 3_000_000_000 } },
  { id: "ct_cong_ty_ck", ten_entity: "Công ty chứng khoán", dieu_kien_may_doc: { thuoc_tinh: "nganh", toan_tu: "eq", gia_tri: "chung_khoan" } },
  { id: "ct_nguoi_nop_thue", ten_entity: "Người nộp thuế", dieu_kien_may_doc: null },
];

type KhachHang = { id: string; nganh: string | null; quy_mo: string | null; domains: string[]; thuoc_tinh: ThuocTinhKhachHang };

const KHACH_HANG: KhachHang[] = [
  { id: "nexora", nganh: "cong_nghe_thong_tin", quy_mo: "nho", domains: ["thue", "ke_toan"], thuoc_tinh: { co_san_tmdt: false, doanh_thu_nam: 8_000_000_000 } },
  { id: "thien_phu", nganh: "chung_khoan", quy_mo: "vua", domains: ["thue"], thuoc_tinh: { co_san_tmdt: false, doanh_thu_nam: 120_000_000_000 } },
  { id: "smile", nganh: "y_te", quy_mo: "nho", domains: ["thue"], thuoc_tinh: { doanh_thu_nam: 2_000_000_000 } }, // thiếu co_san_tmdt
];

// Giống filterDomain.loadDieuKien: chỉ nạp cạnh có đầu hanh_vi nằm trong tập đang quét
function quet(kh: KhachHang, hanhVi: HanhViQuet[]): Map<string, DanhGia> {
  const ids = new Set(hanhVi.map((h) => h.id));
  return quetKhachHang({
    hanhVi,
    dieuKienTheoHanhVi: ghepDieuKien(CANH.filter((c) => ids.has(c.hanhViId)), ENTITY_DIEU_KIEN),
    customerDomains: kh.domains,
    thuocTinh: thuocTinhRuleEngine(kh),
    homNay: HOM_NAY,
  });
}

// Chiều thuận: văn bản lần lượt được duyệt, mỗi lần quét MỌI doanh nghiệp đang có
function chieuThuan(): Map<string, Map<string, string>> {
  const ketQua = new Map(KHACH_HANG.map((kh) => [kh.id, new Map<string, string>()]));
  for (const hanhVi of Object.values(VAN_BAN)) {
    for (const kh of KHACH_HANG) {
      for (const [id, dg] of quet(kh, hanhVi)) ketQua.get(kh.id)!.set(id, dg.trang_thai_ap_dung);
    }
  }
  return ketQua;
}

// Chiều ngược: kho đã đủ văn bản, từng doanh nghiệp onboard → quét toàn bộ 1 lần
function chieuNguoc(): Map<string, Map<string, string>> {
  const tatCa = Object.values(VAN_BAN).flat();
  return new Map(KHACH_HANG.map((kh) => [kh.id, new Map([...quet(kh, tatCa)].map(([id, dg]) => [id, dg.trang_thai_ap_dung]))]));
}

const tapTheoTrangThai = (m: Map<string, string>, tt: string) => [...m].filter(([, v]) => v === tt).map(([k]) => k).sort();

test("đối xứng: tập entity ap_dung của 2 chiều giống hệt nhau cho từng doanh nghiệp", () => {
  const thuan = chieuThuan();
  const nguoc = chieuNguoc();
  for (const kh of KHACH_HANG) {
    assert.deepEqual(tapTheoTrangThai(nguoc.get(kh.id)!, "ap_dung"), tapTheoTrangThai(thuan.get(kh.id)!, "ap_dung"), kh.id);
  }
});

test("đối xứng: cả 4 trạng thái của từng entity đều khớp, không chỉ ap_dung", () => {
  const thuan = chieuThuan();
  const nguoc = chieuNguoc();
  for (const kh of KHACH_HANG) {
    assert.deepEqual(Object.fromEntries([...nguoc.get(kh.id)!].sort()), Object.fromEntries([...thuan.get(kh.id)!].sort()), kh.id);
  }
});

test("fixture không tầm thường: mỗi doanh nghiệp ra tập khác nhau, đủ các nhánh", () => {
  const nguoc = chieuNguoc();
  assert.deepEqual(tapTheoTrangThai(nguoc.get("nexora")!, "ap_dung"), ["dang_ky_thue", "khai_bo_sung", "khai_thue_lon", "lap_bctc", "nguoi_nop_thue"]);
  assert.deepEqual(tapTheoTrangThai(nguoc.get("thien_phu")!, "ap_dung"), ["bao_cao_ck", "dang_ky_thue", "khai_bo_sung", "khai_thue_lon", "nguoi_nop_thue"]);
  assert.deepEqual(tapTheoTrangThai(nguoc.get("smile")!, "ap_dung"), ["dang_ky_thue", "nguoi_nop_thue"]);
  assert.deepEqual(tapTheoTrangThai(nguoc.get("smile")!, "chua_du_thong_tin"), ["khai_thue_tmdt"]);
  assert.deepEqual(tapTheoTrangThai(nguoc.get("nexora")!, "sap_ap_dung"), ["quy_dinh_moi"]);
});

test("thứ tự duyệt văn bản không đổi kết quả chiều thuận", () => {
  const daoNguoc = new Map(KHACH_HANG.map((kh) => [kh.id, new Map<string, string>()]));
  for (const hanhVi of Object.values(VAN_BAN).reverse()) {
    for (const kh of KHACH_HANG) for (const [id, dg] of quet(kh, hanhVi)) daoNguoc.get(kh.id)!.set(id, dg.trang_thai_ap_dung);
  }
  const thuan = chieuThuan();
  for (const kh of KHACH_HANG) assert.deepEqual(Object.fromEntries([...daoNguoc.get(kh.id)!].sort()), Object.fromEntries([...thuan.get(kh.id)!].sort()));
});
