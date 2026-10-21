/*
 * CHỮ HIỂN THỊ TRÊN GIAO DIỆN — một chỗ duy nhất (nexora-wording-v1.md).
 * Đổi chữ ở đây là đổi cả app. Không viết thuật ngữ nội bộ (diagnostic, entity, chunk, pipeline, rule engine, AI)
 * ra giao diện; ngoại lệ duy nhất: mục "Chi tiết kỹ thuật" ở Lịch sử xử lý.
 * Chữ đến từ dữ liệu (tên văn bản, tên nghĩa vụ, email…) KHÔNG sửa ở giao diện (wording mục 6).
 */

export const COPY = {
  brand: "Nexora",

  /* ---------- Vai trò & khung chung (mục 3.1, 4) ---------- */
  role: {
    customerBadge: "Phụ trách tuân thủ",
    curatorBadge: "Chuyên viên pháp lý",
    curatorCrumb: "Quản trị", // breadcrumb phía Nexora: "Quản trị › Tên trang"
  },
  shell: {
    theme: "Giao diện",
    themeLight: "Sáng",
    themeDark: "Tối",
    themeSystem: "Theo máy",
    signOut: "Đăng xuất",
    home: "Nexora Compliance Navigator — về trang chủ",
    toggleSidebar: "Thu gọn / mở thanh bên",
  },

  /* ---------- Tên trang + mô tả (mục 3, 4). title cũng là tên menu ---------- */
  page: {
    tongQuan: { title: "Tổng quan", description: "Tình hình tuân thủ của công ty theo các lĩnh vực bạn đang theo dõi." },
    xacNhan: {
      title: "Xác nhận nghĩa vụ",
      description: "Xem các nghĩa vụ có thể áp dụng cho công ty. Xác nhận nghĩa vụ nào thật sự liên quan để giao cho phòng ban phụ trách.",
    },
    thongBao: { title: "Thông báo", description: "Nghĩa vụ mới cần bạn xác nhận và những thông tin cần bổ sung." },
    hoSo: {
      title: "Hồ sơ doanh nghiệp", // menu + tiêu đề khi đã hoàn tất
      titleSetup: "Thiết lập hồ sơ doanh nghiệp", // tiêu đề khi chưa hoàn tất
      description: "Thông tin càng đầy đủ, Nexora càng xác định chính xác nghĩa vụ áp dụng cho công ty bạn.",
    },
    nhapVanBan: { title: "Nhập văn bản", description: "Thêm văn bản pháp luật mới vào thư viện dùng chung cho mọi khách hàng." },
    kiemDuyet: { title: "Kiểm duyệt văn bản", description: "Đối chiếu nội dung trích xuất với văn bản gốc trước khi đưa vào thư viện." },
    thuVien: { title: "Thư viện pháp lý", description: "Các mục đã kiểm duyệt, dùng để xác định nghĩa vụ cho khách hàng." },
    capNhat: { title: "Cập nhật khách hàng", description: "Đối chiếu lại hồ sơ khách hàng sau khi thư viện có văn bản mới." },
    lichSu: { title: "Lịch sử xử lý", description: "Các lần trích xuất và cập nhật đã chạy." },
    login: { title: "Đăng nhập" },
    dangKy: { title: "Đăng ký doanh nghiệp" },
  },

  /* ---------- Trạng thái (bảng thuật ngữ mục 2) ---------- */
  status: {
    apDung: { ap_dung: "Đang áp dụng", sap_ap_dung: "Sắp có hiệu lực", chua_du_thong_tin: "Cần bổ sung thông tin", khong_ap_dung: "Không áp dụng" },
    // Phía doanh nghiệp: xác nhận nghĩa vụ
    xacNhan: { cho_duyet: "Chờ xác nhận", da_duyet: "Đã giao việc", tu_choi: "Không liên quan" },
    // Phía chuyên viên: kiểm duyệt mục trích xuất
    kiemDuyet: { cho_duyet: "Chờ duyệt", da_duyet: "Đã duyệt", tu_choi: "Từ chối" },
    phan: { cho_xu_ly: "Chờ xử lý", dang_xu_ly: "Đang trích xuất", da_trich_xuat: "Chờ kiểm duyệt", hoan_tat: "Hoàn tất", loi: "Lỗi" },
    lanChay: { cho_xu_ly: "Chờ xử lý", dang_xu_ly: "Đang chạy", hoan_tat: "Hoàn tất", loi: "Lỗi" },
    buocXuLy: { extract_entities: "Trích xuất văn bản", filter_domain: "Đối chiếu hồ sơ", generate_diagnostic: "Tạo việc cần làm" },
    vanBan: { draft: "Bản nháp", active: "Đang hiệu lực", replaced: "Đã bị thay thế" },
  },

  /* ---------- Thuật ngữ dùng lại ---------- */
  term: {
    nghiaVu: "nghĩa vụ",
    viecCanLam: "Việc cần làm",
    canCu: "Căn cứ pháp lý",
    viSao: "Vì sao áp dụng cho công ty bạn",
    mucTrichXuat: "mục",
    phan: "Phần", // "Phần 1 · Điều 1–3"
    dieuKien: "Điều kiện áp dụng",
    tomTat: "Tóm tắt",
    trichNguyenVan: "Trích nguyên văn",
    hetHieuLuc: "Đã hết hiệu lực",
    lienKet: "Liên kết", // quan hệ giữa các mục trích xuất (vd chế tài của, áp dụng cho)
    chuaCoLienKet: "Chưa có liên kết nào.",
    ketQuaTrichXuat: (soMuc: number, soLienKet: number, soCanhBao: number) => `${soMuc} mục trích xuất · ${soLienKet} liên kết · ${soCanhBao} cảnh báo`,
  },

  /* ---------- Nút dùng chung ---------- */
  action: {
    retry: "Thử lại",
    cancel: "Huỷ",
    back: "Quay lại",
    next: "Tiếp tục",
    viewAll: "Xem tất cả",
    xacNhanGiao: "Xác nhận & giao việc",
    khongLienQuan: "Không liên quan",
    taoViec: "Tạo việc cần làm",
    capNhatTatCa: "Cập nhật tất cả",
    capNhatKhach: "Cập nhật khách hàng này",
    xemLichSu: "Xem lịch sử xử lý",
    hoanTatHoSo: "Hoàn tất & kiểm tra nghĩa vụ",
    xemXacNhan: "Xem và xác nhận nghĩa vụ",
    traLoi: "Trả lời",
    luu: "Lưu thông tin",
  },

  /* ---------- Dòng nhắc nội dung tạo tự động (mục 1 — chỉ dòng này) ---------- */
  autoContentNotice: "Nội dung gợi ý được tạo tự động. Vui lòng kiểm tra trước khi xác nhận.",

  /* ---------- Trạng thái rỗng / đang tải / lỗi (mục 5) ---------- */
  state: {
    noObligations: "Chưa có nghĩa vụ nào cần xác nhận. Nexora sẽ thông báo khi có văn bản mới ảnh hưởng tới công ty bạn.",
    noNotifications: "Bạn đã xem hết thông báo.",
    loading: "Đang tải…",
    matching: "Đang đối chiếu hồ sơ…",
    loadError: "Không tải được dữ liệu. Vui lòng thử lại.",
    saveError: "Chưa lưu được thay đổi. Vui lòng thử lại.",
    sessionExpired: "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.",
    forbidden: "Tài khoản của bạn không có quyền thực hiện thao tác này.",
    conflict: "Mục này vừa được cập nhật ở nơi khác. Đã tải lại dữ liệu mới nhất.",
    busy: "Hệ thống đang bận. Vui lòng thử lại sau khoảng 1 phút.",
    notFound: "Không tìm thấy dữ liệu này. Có thể nó đã được thay đổi.",
    noAccessPage: "Tài khoản này không mở được trang này.",
  },
} as const;

/* ---------- Trang Xác nhận nghĩa vụ (mục 3.3) ---------- */
export const XAC_NHAN = {
  dem: (cho: number, da: number, tuChoi: number) => `${cho} chờ xác nhận · ${da} đã giao việc · ${tuChoi} không liên quan`,
  locTatCa: "Mọi trạng thái",
  giaoCho: "Giao cho",
  ghiChu: "Ghi chú cho phòng ban (không bắt buộc)",
  phongRong: "chưa có nghĩa vụ nào",
  khongKhopLoc: "không có nghĩa vụ khớp bộ lọc",
  canBoSung: (n: number) => `Cần bổ sung thông tin (${n})`,
  choTraLoi: "Đang chờ bạn bổ sung thông tin ở đầu trang.",
  choTraLoiLink: "Trả lời ngay",
  chuaCoViec: "Nexora đang chuẩn bị việc cần làm cho nghĩa vụ này.",
  hetHieuLuc: "Sau lần cập nhật gần nhất, nghĩa vụ này không còn áp dụng cho công ty.",
  ghiChuDaXacNhan: (s: string) => `Ghi chú khi xác nhận: ${s}`,
  dialog: {
    title: "Đánh dấu không liên quan?",
    body: "Nghĩa vụ này sẽ không được giao cho phòng ban nào. Bạn có thể khôi phục sau.",
    confirm: "Đánh dấu không liên quan",
  },
  ketQuaMoi: (ten: string, trangThai: string) => `${ten}: kết quả mới — ${trangThai}.`,
  daLuuTraLoi: (ten: string) => `${ten}: đã lưu câu trả lời.`,
} as const;

/* ---------- Thông báo (mục 3.4) ---------- */
export const THONG_BAO = {
  loc: { all: "Tất cả", unread: "Chưa đọc", read: "Đã đọc" },
  nhom: {
    cho_duyet: { title: "Cần xác nhận", subtitle: "Nghĩa vụ mới cần bạn xác nhận trước khi giao phòng ban", empty: "không có nghĩa vụ nào" },
    hoi_bo_sung: { title: "Cần bổ sung thông tin", subtitle: "Nexora cần thêm thông tin hồ sơ để xác định nghĩa vụ", empty: "không có yêu cầu nào" },
    da_giao: { title: "Đã giao việc", subtitle: "Nghĩa vụ đã xác nhận và giao xuống phòng ban", empty: "chưa giao việc nào" },
  },
  khongKhopLoc: "không có thông báo khớp bộ lọc",
  chuaDoc: "chưa đọc",
  thongBao: "thông báo",
  cauHoi: (s: string) => `Câu hỏi: ${s}`,
  giaoCho: (phong: string) => `Giao cho ${phong}`,
} as const;

/* ---------- Tổng quan (mục 3.2) ---------- */
export const TONG_QUAN = {
  xemHoSo: (da: number, tong: number) => `Xem hồ sơ doanh nghiệp (${da}/${tong} thông tin)`,
  dongPhu: (nganh: string, quyMo: string, soPhong: number, linhVuc: string) => `${nganh} · Quy mô ${quyMo} · ${soPhong} phòng ban · Theo dõi: ${linhVuc}`,
  chuaKhai: "chưa khai",
  canBoSung: (n: number) => `Có ${n} nghĩa vụ cần bổ sung thông tin để xác định.`,
  kpi: {
    apDung: "Nghĩa vụ đang áp dụng",
    apDungPhu: (cho: number, da: number) => `${cho} chờ xác nhận · ${da} đã giao việc`,
    sap: "Sắp có hiệu lực",
    canBoSung: "Cần bổ sung thông tin",
    canBoSungPhu: "Cần phản hồi",
    hoSo: "Mức hoàn thiện hồ sơ",
    hoSoPhu: (da: number, tong: number) => `${da}/${tong} thông tin đã điền`,
  },
  bieuDo: "Phân bổ nghĩa vụ theo trạng thái",
  bieuDoRong: "Chưa có nghĩa vụ nào được xác định cho công ty.",
  theoPhong: "Theo phòng ban",
  cot: { phong: "Phòng ban", apDung: "Đang áp dụng", sap: "Sắp có hiệu lực", canBoSung: "Cần bổ sung", cho: "Chờ xác nhận", da: "Đã giao việc" },
  moi7Ngay: "Mới trong 7 ngày qua",
  moi7NgayRong: "Không có nghĩa vụ mới trong 7 ngày qua.",
  moiCapNhat: "Mới cập nhật",
} as const;

/* ---------- Hồ sơ doanh nghiệp (mục 3.5) ---------- */
export const HO_SO = {
  buoc: ["Thông tin công ty", "Lĩnh vực theo dõi", "Đặc điểm hoạt động", "Phòng ban & người phụ trách"] as const,
  buocSo: (i: number, tong: number, ten: string) => `Bước ${i}/${tong} — ${ten}`,
  tenCongTy: "Tên công ty",
  tenCongTyPh: "Tên đầy đủ theo giấy chứng nhận đăng ký doanh nghiệp",
  nganh: "Ngành kinh doanh",
  nganhPh: "Chọn ngành",
  nganhHint: "Không bắt buộc",
  quyMo: "Quy mô doanh nghiệp",
  chuaChon: "Chưa chọn",
  linhVucHoi: "Công ty cần theo dõi quy định thuộc lĩnh vực nào?",
  dacDiemMoTa: "Trả lời để Nexora xác định nghĩa vụ áp dụng cho công ty. Chưa có số liệu thì chọn \"Chưa chắc\" — Nexora sẽ hỏi lại khi cần.",
  dacDiemRong: "Chọn ít nhất một lĩnh vực ở bước trước.",
  phongMoTa: "Đặt tên phòng ban theo cách công ty đang gọi; chọn loại phòng ban để Nexora giao việc đúng nơi.",
  tenPhong: "Tên phòng ban",
  loaiPhong: "Loại phòng ban",
  emailPhong: "Email trưởng phòng",
  khongBatBuoc: "Không bắt buộc",
  themPhong: "Thêm phòng ban",
  xoaPhong: (i: number) => `Xoá phòng ban ${i}`,
  dangLuu: "Đang lưu…",
  // Đăng ký doanh nghiệp mới (tài khoản chưa gắn công ty)
  mst: "Mã số thuế",
  mstHint: "Không bắt buộc · 10 số, chi nhánh thêm -3 số",
  loaiPhongTuNhan: "Tự nhận diện theo tên phòng",
  phongMoTaDangKy: "Đặt tên phòng ban theo cách công ty đang gọi. Nexora tự nhận diện loại phòng từ tên; nếu không nhận ra, bạn chọn giúp loại phòng ban.",
  loi: {
    chung: "Một số thông tin chưa hợp lệ — xem các ô được đánh dấu.",
    tenCongTy: "Nhập tên công ty",
    mstSai: "Mã số thuế gồm 10 số, chi nhánh thêm -3 số (vd 0312345678-001)",
    mstDaDangKy: "Mã số thuế này đã được đăng ký. Nếu đây là công ty của bạn, hãy liên hệ Nexora để được cấp quyền.",
    linhVuc: "Chọn ít nhất 1 lĩnh vực",
    thuocTinh: "Câu trả lời chưa hợp lệ — vui lòng chọn lại.",
    tenPhong: "Nhập tên phòng ban",
    tenPhongTrung: "Tên phòng ban bị trùng",
    loaiPhong: "Nexora chưa nhận ra loại phòng này — hãy chọn loại phòng ban.",
    email: "Email không hợp lệ",
    phongBan: "Thêm ít nhất 1 phòng ban",
    khac: "Thông tin chưa hợp lệ",
  },
  ketQua: {
    title: "Hồ sơ đã sẵn sàng",
    body: (soVanBan: number, soNghiaVu: number) =>
      `Nexora đã đối chiếu hồ sơ của bạn với ${soVanBan} văn bản đang có hiệu lực và tìm thấy ${soNghiaVu} nghĩa vụ có thể áp dụng.`,
    chuaCoVanBan: "Thư viện chưa có văn bản đang có hiệu lực để đối chiếu. Hồ sơ đã được lưu — Nexora sẽ thông báo khi có văn bản mới ảnh hưởng tới công ty bạn.",
    chuaDoiChieu: "Hồ sơ đã được lưu nhưng chưa đối chiếu xong. Bạn thử đối chiếu lại sau ít phút.",
    doiChieuLai: "Đối chiếu lại",
    thieuPhong: (n: number) => `${n} nghĩa vụ chưa có phòng ban nhận — nên thêm phòng ban phù hợp hoặc Ban Giám đốc.`,
    thongKe: "Kết quả đối chiếu",
    phanBo: "Phân bổ theo phòng ban",
    phanBoPhu: "Mọi phòng ban trong hồ sơ, kể cả phòng chưa có nghĩa vụ",
    soViec: (n: number) => `${n} nghĩa vụ`,
    khongCoViec: "Chưa có nghĩa vụ",
    dieu: (so: number) => `Điều ${so}`,
    canBoSungMoTa: (n: number) => `${n} nghĩa vụ cần thêm thông tin để Nexora kết luận có áp dụng cho công ty bạn hay không.`,
    canTraLoi: "Cần trả lời:",
    traLoiNgay: "Trả lời ngay",
    suaHoSo: "Sửa hồ sơ",
  },
} as const;

/* ---------- Đăng nhập / đăng ký (brief mục 5.10) ---------- */
export const AUTH = {
  tagline: "Biết kịp văn bản pháp luật mới ảnh hưởng tới doanh nghiệp bạn",
  email: "Email",
  matKhau: "Mật khẩu",
  login: {
    title: "Đăng nhập",
    moTa: "Dùng tài khoản Nexora của bạn.",
    nut: "Đăng nhập",
    dangGui: "Đang đăng nhập…",
    sai: "Email hoặc mật khẩu không đúng.",
    loi: "Chưa đăng nhập được. Vui lòng thử lại.",
    chuaCoTk: "Doanh nghiệp chưa dùng Nexora?",
    linkDangKy: "Đăng ký doanh nghiệp",
  },
  dangKy: {
    title: "Đăng ký doanh nghiệp",
    moTa: "Tạo tài khoản cho người phụ trách tuân thủ. Bước sau bạn thiết lập hồ sơ doanh nghiệp.",
    nhapLai: "Nhập lại mật khẩu",
    matKhauHint: "Ít nhất 8 ký tự",
    nut: "Tạo tài khoản",
    dangGui: "Đang tạo tài khoản…",
    daCoTk: "Đã có tài khoản?",
    linkDangNhap: "Đăng nhập",
    loi: {
      email: "Email không hợp lệ",
      matKhauNgan: "Mật khẩu cần ít nhất 8 ký tự",
      khongKhop: "Hai mật khẩu chưa khớp",
      daTonTai: "Email này đã có tài khoản. Hãy đăng nhập.",
      dongDangKy: "Nexora chưa mở đăng ký tự do. Vui lòng liên hệ Nexora để được cấp tài khoản.",
      matKhauYeu: "Mật khẩu chưa đủ mạnh — dùng ít nhất 8 ký tự, có cả chữ và số.",
      chung: "Chưa tạo được tài khoản. Vui lòng thử lại.",
    },
    xacNhanEmail: {
      title: "Kiểm tra hộp thư của bạn",
      body: (email: string) => `Nexora đã gửi email xác nhận tới ${email}. Mở email và bấm liên kết xác nhận, sau đó đăng nhập để thiết lập hồ sơ doanh nghiệp.`,
    },
  },
  dangDoiChieu: {
    title: "Đang đối chiếu hồ sơ…",
    body: "Nexora đang so hồ sơ của bạn với các văn bản đang có hiệu lực. Việc này có thể mất tới 1 phút — vui lòng không đóng trang.",
  },
} as const;
