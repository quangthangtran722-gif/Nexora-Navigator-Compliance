import type { ThuocTinhHoSo } from "@/lib/types";

/*
 * MOCK DATA — từ điển câu hỏi onboarding / hỏi bổ sung (bảng thuoc_tinh_ho_so, CONTRACT §3.2).
 * UI render câu hỏi TỪ danh sách này, không hard-code trong form.
 */

const T = "2026-10-10T08:00:00Z";

export const mockThuocTinhHoSo: ThuocTinhHoSo[] = [
  {
    ma: "kenh_ban_hang",
    cau_hoi: "Doanh nghiệp đang bán hàng qua những kênh nào?",
    kieu: "text_array",
    domain: null,
    lua_chon: ["shopee", "tiktok_shop", "lazada", "website_rieng", "cua_hang"],
    don_vi: null,
    mo_ta: "Chọn tất cả kênh đang dùng.",
    created_at: T,
  },
  {
    ma: "doanh_thu_nam",
    cau_hoi: "Doanh thu năm trước liền kề là bao nhiêu?",
    kieu: "number",
    domain: "thue",
    lua_chon: null,
    don_vi: "đồng",
    mo_ta: "Dùng để xác định nghĩa vụ khai thuế theo tháng hay theo quý.",
    created_at: T,
  },
  {
    ma: "gia_tri_mua_vao_lon_nhat",
    cau_hoi: "Một lần mua hàng hoá, dịch vụ đầu vào lớn nhất thường có giá trị bao nhiêu?",
    kieu: "number",
    domain: "thue",
    lua_chon: null,
    don_vi: "đồng",
    mo_ta: "Tính cả thuế GTGT. Dùng để xác định nghĩa vụ thanh toán không dùng tiền mặt.",
    created_at: T,
  },
  {
    ma: "loai_hoa_don",
    cau_hoi: "Doanh nghiệp đang dùng loại hoá đơn điện tử nào?",
    kieu: "text",
    domain: "thue",
    lua_chon: ["co_ma", "khong_ma"],
    don_vi: null,
    mo_ta: null,
    created_at: T,
  },
  {
    ma: "dung_phan_mem_ke_toan",
    cau_hoi: "Doanh nghiệp có dùng phần mềm kế toán không?",
    kieu: "boolean",
    domain: "ke_toan",
    lua_chon: null,
    don_vi: null,
    mo_ta: null,
    created_at: T,
  },
  {
    ma: "luu_chung_tu_dien_tu",
    cau_hoi: "Chứng từ kế toán có đang được lưu trữ dạng điện tử không?",
    kieu: "boolean",
    domain: "ke_toan",
    lua_chon: null,
    don_vi: null,
    mo_ta: null,
    created_at: T,
  },
];

/*
 * Nhãn hiển thị cho giá trị lua_chon — CONTRACT không nói lua_chon là slug hay chữ hiển thị.
 * Mock đang dùng slug + bảng nhãn này; giá trị lạ hiển thị nguyên văn. (Cần backend xác nhận.)
 */
export const LUA_CHON_LABEL: Record<string, string> = {
  shopee: "Shopee",
  tiktok_shop: "TikTok Shop",
  lazada: "Lazada",
  website_rieng: "Website riêng",
  cua_hang: "Cửa hàng trực tiếp",
  co_ma: "Hoá đơn có mã của cơ quan thuế",
  khong_ma: "Hoá đơn không có mã",
};
