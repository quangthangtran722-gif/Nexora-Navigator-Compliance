# Dữ kiện về Nexora — chỉ điều đã đúng

Nguồn: `CLAUDE.md`, `docs/CONTRACT.md`, `scripts/seed-demo.mjs`, trang Cập nhật khách hàng trong app. Không suy diễn thêm. Thiếu dữ kiện thì hỏi team, không tự điền.

## Nexora làm gì, cho ai

- Nexora Compliance Navigator theo dõi văn bản pháp luật mới và cho doanh nghiệp biết **văn bản nào áp dụng cho chính mình, phòng nào phải làm gì**.
- Khách hàng: doanh nghiệp nhỏ và vừa ở Việt Nam **không có bộ phận pháp chế riêng**. Người dùng phía doanh nghiệp thường là kế toán hoặc giám đốc.
- Là phần mềm theo dõi liên tục (thuê bao), không phải công cụ tra cứu luật theo câu hỏi.
- Doanh nghiệp khai **hồ sơ doanh nghiệp một lần** (ngành, loại hình, quy mô, lĩnh vực theo dõi, đặc điểm hoạt động, phòng ban). Hệ thống đối chiếu hồ sơ với các mục đã kiểm duyệt và trả về danh sách nghĩa vụ, mỗi nghĩa vụ có: lý do áp dụng, việc cần làm, căn cứ pháp lý (số hiệu + điều), phòng ban nhận.
- Có văn bản mới được kiểm duyệt → cập nhật lại cho mọi doanh nghiệp. Doanh nghiệp sửa hồ sơ → cập nhật lại cho doanh nghiệp đó.

## Hai vai trò

- **Chuyên viên pháp lý** (phía Nexora): nhập văn bản, kiểm duyệt từng mục trích xuất, cập nhật khách hàng.
- **Người phụ trách tuân thủ** (phía doanh nghiệp): xác nhận nghĩa vụ, giao việc cho phòng ban, trả lời khi cần bổ sung thông tin.

## Vai trò của AI (chỉ nói đúng như sau)

- AI đọc văn bản, bóc tách nghĩa vụ kèm trích dẫn nguyên văn, và viết gợi ý việc cần làm.
- Mọi thứ AI tạo ra là bản nháp: chuyên viên pháp lý kiểm duyệt mục trích xuất; người phụ trách tuân thủ xác nhận nghĩa vụ trước khi giao việc.
- Nghĩa vụ nào áp dụng cho doanh nghiệp nào do **quy tắc cố định** quyết định (so điều kiện với hồ sơ), không do AI.
- Trong app không nói "AI" (xem `voices/ui.md`). Trên landing được nói, đúng các ý trên.

## Văn bản đã có trong thư viện

- Luật Quản lý thuế, số hiệu **108/2025/QH15** (hiệu lực 01/07/2026).
- Thông tư **77/2025/TT-BTC** (dịch vụ kinh doanh chứng khoán).

## Số liệu đã kiểm (ngày kiểm: 21/10/2026, trang Cập nhật khách hàng)

- Chạy trên **5 doanh nghiệp mẫu** (2 công ty chứng khoán, 2 công ty công nghệ thông tin, 1 phòng khám nha khoa).
- Công ty chứng khoán: **25 nghĩa vụ** đang áp dụng.
- Công ty công nghệ, phòng khám nha khoa: **18 nghĩa vụ** mỗi bên.
- 18 nghĩa vụ chung đến từ Luật Quản lý thuế; 7 nghĩa vụ riêng chỉ ngành chứng khoán nhận (từ Thông tư 77/2025/TT-BTC).
- Đây là doanh nghiệp mẫu do team tạo, không phải khách hàng thật. Không gọi là "khách hàng" hay "doanh nghiệp đang dùng".

## CHƯA làm — không được hứa

- Tư vấn pháp luật, chịu trách nhiệm pháp lý thay doanh nghiệp. Nexora là phần mềm, người phụ trách tuân thủ của doanh nghiệp vẫn là người quyết định.
- Một tài khoản quản lý nhiều doanh nghiệp (hiện 1 tài khoản = 1 doanh nghiệp).
- Bảng giá (chưa có giá; chỉ nói được: quét miễn phí, theo dõi liên tục là gói trả phí).
- Tích hợp phần mềm kế toán.
- Lĩnh vực ngoài Thuế, Kế toán, Chứng khoán (lao động, dữ liệu cá nhân… chưa có văn bản).
- Email thông báo tự động (thông báo hiện là trong app).
- Kiểm tra nội dung bằng chứng hoàn thành việc; nhắc hạn, báo quá hạn.
