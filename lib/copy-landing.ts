/*
 * Chữ của landing page ("/" khi chưa đăng nhập). Viết theo skill .claude/skills/nexora-content
 * (voices/marketing.md + formats/landing-section.md), đã soát anti-slop.md và brand-facts.md.
 * Landing được nói "AI" (trang nói với người mua); trong app thì không.
 */

// TODO(team): thay bằng email liên hệ của team khi có; chưa có thì nút đối tác dẫn về /dang-ky
export const LIEN_HE_DOI_TAC: string | null = null;

export const LANDING = {
  brand: { ten: "NEXORA", phu: "COMPLIANCE NAVIGATOR", tenDayDu: "Nexora Compliance Navigator" },
  nav: {
    items: [
      { href: "#san-pham", label: "Sản phẩm" },
      { href: "#cach-hoat-dong", label: "Cách hoạt động" },
      { href: "#chay-thu", label: "Chạy thử" },
      { href: "#goi-dich-vu", label: "Gói dịch vụ" },
      { href: "#doi-tac", label: "Đối tác" },
    ],
    dangNhap: "Đăng nhập",
    dangKy: "Đăng ký doanh nghiệp",
    dangKyNgan: "Đăng ký",
    moMenu: "Mở menu",
    boQua: "Bỏ qua phần giới thiệu",
  },
  // Bản rút gọn (~1.600 ký tự): mỗi phần 1 tiêu đề + tối đa 1–2 câu; ý phụ thành nhãn ngắn kèm icon
  hero: {
    tieuDe: "Văn bản pháp luật mới ảnh hưởng gì đến riêng doanh nghiệp bạn, và ai phải làm gì?",
    // Phần "Vấn đề" gộp vào đây thành 1 câu dẫn
    dan: "Ở công ty nhỏ, kế toán vừa làm sổ sách vừa tự đoán luật nào liên quan.",
    phu: "Khai hồ sơ một lần, xem ngay nghĩa vụ và phòng ban phải làm.",
    nutChinh: "Quét miễn phí",
    nutPhu: "Xem cách hoạt động",
    vanBan: "Đã kiểm duyệt: 108/2025/QH15 · 77/2025/TT-BTC",
    anh: "Trang Tổng quan của một công ty công nghệ: 18 nghĩa vụ đang áp dụng, 18 chờ xác nhận",
    // Nửa phải phần đầu: trạng thái cuối của màn đối chiếu, dựng bằng HTML (to, đọc được) thay ảnh dashboard nhỏ.
    // TODO(01/11, sau khi khoá dữ liệu): cập nhật số + tên phòng + thẻ mẫu theo doanh nghiệp mẫu cuối cùng.
    minhHoa: {
      nhan: "Kết quả đối chiếu",
      congTy: "Công ty chứng khoán mẫu",
      tong: 25,
      donVi: "nghĩa vụ áp dụng",
      phong: [
        { ten: "Phòng Kế toán", so: 10 },
        { ten: "Ban Giám đốc", so: 9 },
        { ten: "Phòng Kinh doanh", so: 6 },
      ],
      the: { nhan: "Ví dụ một nghĩa vụ", ten: "Lập hoá đơn đầy đủ khi bán hàng", nguon: "Điều 8, khoản 4 · Luật Quản lý thuế", giaoCho: "Ban Giám đốc" },
      moTa: "Kết quả đối chiếu của một công ty chứng khoán mẫu: 25 nghĩa vụ áp dụng, chia cho Phòng Kế toán 10, Ban Giám đốc 9, Phòng Kinh doanh 6",
    },
  },
  sanPham: {
    tieuDe: "Khai hồ sơ một lần, nhận đúng nghĩa vụ của công ty bạn",
    nhan: ["Vì sao áp dụng", "Việc cần làm kèm điều khoản", "Giao đúng phòng"],
    anh: "Một nghĩa vụ đang mở: vì sao áp dụng cho công ty, việc cần làm và căn cứ Điều 8, khoản 4 Luật Quản lý thuế",
  },
  cachHoatDong: {
    tieuDe: "Năm bước, có người kiểm duyệt ở giữa",
    buoc: [
      { ten: "Nạp văn bản", mo: "Văn bản mới, như Luật Quản lý thuế 108/2025/QH15, được đưa vào thư viện." },
      { ten: "AI bóc tách", mo: "Tách từng nghĩa vụ, điều kiện, thời hạn, kèm trích dẫn nguyên văn." },
      { ten: "Người duyệt", mo: "Chuyên viên pháp lý kiểm duyệt từng mục trước khi dùng." },
      { ten: "Đối chiếu", mo: "Quy tắc cố định so điều kiện của nghĩa vụ với hồ sơ doanh nghiệp." },
      { ten: "Giao việc", mo: "Người phụ trách tuân thủ xác nhận, việc chuyển tới phòng ban." },
    ],
    buocNhan: 2, // "Người duyệt" — chỉ số trong mảng buoc
    nhanManh: {
      tieuDe: "AI không bao giờ tự quyết.",
      than: "AI đọc văn bản, bóc tách nghĩa vụ và gợi ý việc cần làm. Nghĩa vụ nào áp dụng cho bạn do quy tắc cố định và con người quyết định.",
    },
  },
  bangChung: {
    nhan: "Kết quả chạy thử",
    tieuDe: "Cùng ngành, cùng kết quả.",
    than: "18 nghĩa vụ chung từ Luật Quản lý thuế; 7 nghĩa vụ riêng chỉ ngành chứng khoán nhận.",
    the: [
      { so: 25, mo: "nghĩa vụ · công ty chứng khoán" },
      { so: 18, mo: "nghĩa vụ · công ty công nghệ" },
      { so: 18, mo: "nghĩa vụ · phòng khám nha khoa" },
    ],
    ghiChu: "Doanh nghiệp mẫu, kiểm ngày 21/10/2026.",
    anh: "Trang Cập nhật khách hàng: các công ty chứng khoán 25 nghĩa vụ, công ty công nghệ và phòng khám nha khoa 18",
  },
  goi: {
    tieuDe: "Quét miễn phí, trả phí để theo dõi liên tục",
    mienPhi: { ten: "Quét miễn phí", y: ["Danh sách nghĩa vụ", "Lý do áp dụng"], nut: "Quét miễn phí" },
    traPhi: { ten: "Theo dõi liên tục", y: ["Thông báo văn bản mới", "Phân công phòng ban"], nut: "Bắt đầu miễn phí" },
  },
  oLai: {
    tieuDe: "Hồ sơ khai một lần, dùng cho mọi văn bản về sau",
    nhan: ["Thư viện dày dần", "Không phải khai lại", "Xem thông báo mỗi tuần"],
    anh: "Trang Thông báo: các nghĩa vụ mới từ Luật Quản lý thuế đang chờ xác nhận",
  },
  doiTac: {
    nhan: "Chương trình đối tác",
    tieuDe: "Dành cho đại lý thuế và công ty dịch vụ kế toán.",
    nut: "Đăng ký làm đối tác",
  },
  cuoi: {
    tieuDe: "Quét miễn phí, biết ngay doanh nghiệp bạn có bao nhiêu nghĩa vụ.",
    nut: "Quét miễn phí",
  },
  chan: {
    ten: "Nexora Compliance Navigator",
    team: "Team THE TANK",
    dangNhap: "Đăng nhập",
    dangKy: "Đăng ký",
  },
} as const;
