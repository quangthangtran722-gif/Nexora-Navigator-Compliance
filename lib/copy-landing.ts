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
      { href: "#bang-chung", label: "Bằng chứng" },
      { href: "#goi-dich-vu", label: "Gói dịch vụ" },
      { href: "#doi-tac", label: "Đối tác" },
    ],
    dangNhap: "Đăng nhập",
    dangKy: "Đăng ký doanh nghiệp",
    dangKyNgan: "Đăng ký",
    moMenu: "Mở menu",
    boQua: "Bỏ qua phần giới thiệu",
  },
  hero: {
    tieuDe: "Văn bản pháp luật mới ảnh hưởng gì đến riêng doanh nghiệp bạn, và ai phải làm gì?",
    phu: "Khai hồ sơ một lần. Nexora đối chiếu với các văn bản đã kiểm duyệt và trả về nghĩa vụ của riêng công ty bạn, kèm lý do và phòng ban cần làm.",
    nutChinh: "Quét miễn phí",
    nutPhu: "Xem cách hoạt động",
    vanBan: "Đã kiểm duyệt: Luật Quản lý thuế 108/2025/QH15 · Thông tư 77/2025/TT-BTC",
    anh: "Trang Tổng quan của một công ty công nghệ: 18 nghĩa vụ đang áp dụng, 18 chờ xác nhận",
  },
  vanDe: {
    nhan: "Vấn đề",
    tieuDe: "Công ty bốn người, không ai làm pháp chế",
    than: [
      "Một giám đốc, hai nhân viên kinh doanh và một kế toán.",
      "Người kế toán vừa làm sổ sách vừa tự đoán văn bản nào liên quan đến công ty.",
      "Nhiều doanh nghiệp nhỏ chỉ biết mình làm sai khi đã bị thanh tra.",
    ],
    nguoi: [
      { ten: "Giám đốc" },
      { ten: "Kinh doanh" },
      { ten: "Kinh doanh" },
      { ten: "Kế toán", ghiChu: "kiêm đoán luật" },
    ],
  },
  sanPham: {
    nhan: "Nexora làm gì",
    tieuDe: "Khai hồ sơ một lần, nhận đúng nghĩa vụ của công ty bạn",
    than: "Bạn khai ngành, quy mô và các phòng ban. Nexora so hồ sơ với từng nghĩa vụ đã kiểm duyệt và trả về danh sách của riêng công ty.",
    y: [
      { ten: "Vì sao áp dụng", mo: "Chỉ rõ thông tin nào trong hồ sơ khớp với văn bản." },
      { ten: "Việc cần làm", mo: "Từng bước cụ thể, kèm số hiệu và điều khoản căn cứ." },
      { ten: "Giao đúng phòng", mo: "Sau khi bạn xác nhận, việc chuyển tới phòng ban phải thực hiện." },
    ],
    anh: "Một nghĩa vụ đang mở: vì sao áp dụng cho công ty, việc cần làm và căn cứ Điều 8, khoản 4 Luật Quản lý thuế",
  },
  cachHoatDong: {
    nhan: "Cách hoạt động",
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
    nhan: "Chạy thử",
    tieuDe: "Cùng ngành, cùng kết quả.",
    than: [
      "18 nghĩa vụ chung từ Luật Quản lý thuế; 7 nghĩa vụ riêng chỉ ngành chứng khoán nhận.",
      "Kết quả chạy trên 5 doanh nghiệp mẫu, với Luật Quản lý thuế 108/2025/QH15 và Thông tư 77/2025/TT-BTC.",
    ],
    the: [
      { so: 25, mo: "nghĩa vụ · công ty chứng khoán" },
      { so: 18, mo: "nghĩa vụ · công ty công nghệ" },
      { so: 18, mo: "nghĩa vụ · phòng khám nha khoa" },
    ],
    ghiChu: "Doanh nghiệp mẫu do nhóm tạo để kiểm thử. Số liệu kiểm ngày 21/10/2026.",
    anh: "Trang Cập nhật khách hàng: 5 doanh nghiệp mẫu, công ty chứng khoán 25 nghĩa vụ, các doanh nghiệp còn lại 18",
  },
  goi: {
    nhan: "Gói dịch vụ",
    tieuDe: "Quét miễn phí, trả phí khi cần theo dõi liên tục",
    mienPhi: {
      ten: "Quét miễn phí",
      mo: "Biết ngay công ty có bao nhiêu nghĩa vụ đang áp dụng.",
      y: ["Khai hồ sơ doanh nghiệp", "Xem danh sách nghĩa vụ đang áp dụng", "Xem lý do từng nghĩa vụ áp dụng"],
      nut: "Quét miễn phí",
    },
    traPhi: {
      ten: "Theo dõi liên tục",
      mo: "Dành cho công ty cần giao việc tới từng phòng ban.",
      y: ["Thông báo khi có văn bản mới ảnh hưởng tới công ty", "Việc cần làm chi tiết cho từng nghĩa vụ", "Phân công nghĩa vụ cho từng phòng ban"],
      nut: "Bắt đầu miễn phí",
    },
  },
  oLai: {
    nhan: "Dùng lâu dài",
    tieuDe: "Hồ sơ khai một lần, dùng cho mọi văn bản về sau",
    y: [
      { ten: "Thư viện dày dần", mo: "Mỗi văn bản mới được kiểm duyệt sẽ được đối chiếu lại với hồ sơ của bạn." },
      { ten: "Không phải làm lại", mo: "Hồ sơ, lịch sử xác nhận và phân công phòng ban được giữ trong tài khoản." },
      { ten: "Một việc mỗi tuần", mo: "Kế toán mở mục Thông báo để xem tuần này có nghĩa vụ mới nào." },
    ],
    anh: "Trang Thông báo: các nghĩa vụ mới từ Luật Quản lý thuế đang chờ xác nhận",
  },
  doiTac: {
    nhan: "Chương trình đối tác",
    tieuDe: "Dành cho đại lý thuế và công ty dịch vụ kế toán",
    than: "Một đại lý thường phục vụ 50–200 doanh nghiệp nhỏ, mỗi khách một bộ nghĩa vụ riêng. Đăng ký làm đối tác để Nexora liên hệ khi mở chương trình.",
    nut: "Đăng ký làm đối tác",
  },
  cuoi: {
    tieuDe: "Quét miễn phí, biết ngay doanh nghiệp bạn có bao nhiêu nghĩa vụ.",
    nut: "Quét miễn phí",
  },
  chan: {
    banQuyen: "© 2026 Nexora Compliance Navigator · Team THE TANK",
    dangNhap: "Đăng nhập",
    dangKy: "Đăng ký doanh nghiệp",
  },
} as const;
