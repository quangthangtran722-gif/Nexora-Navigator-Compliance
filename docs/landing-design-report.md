# Báo cáo thiết kế landing page Nexora

Cập nhật: 21/10/2026 · Nhánh `feat/redesign-palette` · Trang `/` khi chưa đăng nhập (đã đăng nhập thì tự vào app).

Tài liệu gốc: `nexora-palette-v4.md` (màu, font, góc, icon), `nexora-wording-v1.md` và skill `.claude/skills/nexora-content` (câu chữ). Code: `components/nexora/landing/`, chữ ở `lib/copy-landing.ts`.

---

## 1. Các mục trên trang (theo thứ tự)

| # | Mục | Làm gì |
|---|---|---|
| 1 | **Thanh menu** | Logo + 5 mục (Sản phẩm · Cách hoạt động · Chạy thử · Gói dịch vụ · Đối tác), "Đăng nhập", nút "Đăng ký doanh nghiệp". Dính trên cùng khi cuộn. Dưới 1280px, 5 mục gom vào nút mở ngăn kéo. |
| 2 | **Phần đầu** | Nền espresso + ánh vàng rất mờ góc trên phải. Câu hỏi chính ("Văn bản pháp luật mới ảnh hưởng gì đến riêng doanh nghiệp bạn, và ai phải làm gì?"), 1 câu dẫn về tình huống công ty nhỏ, nút "Quét miễn phí" và "Xem cách hoạt động", dòng văn bản đã kiểm duyệt, ảnh trang Tổng quan. |
| 3 | **Sản phẩm** | Tiêu đề "Khai hồ sơ một lần, nhận đúng nghĩa vụ của công ty bạn", 3 nhãn có icon, ảnh trang Xác nhận nghĩa vụ. |
| 4 | **Cách hoạt động** | 5 bước (Nạp văn bản → AI bóc tách → Người duyệt → Đối chiếu → Giao việc), bước "Người duyệt" viền vàng; khối nhấn mạnh "AI không bao giờ tự quyết." |
| 5 | **Chạy thử** | Nhãn "Kết quả chạy thử", tiêu đề "Cùng ngành, cùng kết quả.", câu dẫn 18/7. Bên dưới là **một hàng chia đôi** (từ 1280px): nửa trái là khối số (thẻ 25 to ~55% bề ngang, hai thẻ 18 xếp dọc bên phải, tổng cao bằng thẻ 25), nửa phải là ảnh bảng Cập nhật khách hàng; khối số và ảnh cao bằng nhau, căn trên. Dưới 1280px: khối số trên (thẻ 25 trên cùng, hai thẻ 18 cạnh nhau), ảnh dưới. |
| 6 | **Gói dịch vụ** | Hai thẻ: Quét miễn phí (nút chính) và Theo dõi liên tục (nút viền). Không ghi giá. |
| 7 | **Dùng lâu dài** | Tiêu đề + 3 nhãn ngắn, ảnh trang Thông báo. |
| 8 | **Chương trình đối tác** | 1 câu cho đại lý thuế / công ty dịch vụ kế toán + nút "Đăng ký làm đối tác". |
| 9 | **Kêu gọi cuối trang** | "Quét miễn phí, biết ngay doanh nghiệp bạn có bao nhiêu nghĩa vụ." + nút. |
| 10 | **Chân trang** | Nexora Compliance Navigator · Team THE TANK, link Đăng nhập, Đăng ký (email liên hệ hiện khi team cung cấp). |

Mọi nút "Quét miễn phí", "Đăng ký", "Bắt đầu miễn phí" dẫn tới `/dang-ky`.

---

## 2. Hệ thống style cố định

### Màu

Tất cả lấy qua biến (token), không viết mã màu thẳng trong trang — trừ chữ trên thẻ 25 (`#2A2112`, theo yêu cầu, trùng giá trị `--primary-foreground`) và các điểm màu của khung vàng trong chuyển động mở đầu (SVG không đọc được gradient CSS, chép đúng điểm màu của `--gold-metal`).

| Biến | Bản sáng | Bản tối | Dùng ở | Nguồn |
|---|---|---|---|---|
| `--background` | `#F6F7F9` | `#111010` | Nền trang | palette v4 |
| `--card` | `#FFFFFF` | `#1A1918` | Nền mục xen kẽ, thẻ | palette v4 |
| `--foreground` | `#101828` | `#F2EEE8` | Chữ chính | palette v4 |
| `--muted-foreground` | `#667085` | `#A39A90` | Chữ phụ | palette v4 |
| `--border` | `#EAECF0` | `#2B2926` | Viền 1px | palette v4 |
| `--accent` | `#FAF7F0` | `#2A2620` | Ô icon, bước "Người duyệt" | palette v4 |
| `--primary` | `#C6A462` | `#D2B679` | Viền vàng (bước nhấn, khối AI) | palette v4 |
| `--gold-text` | `#6E5730` | `#E9DCBA` | Nhãn nhỏ, icon, link | palette v4 |
| `--gold-metal` | gradient `#A8843F → #D9BE7E → #F1E4C0 → #CFAE68 → #B08C45` | gradient `#9C7A3A → … → #A8843F` | Nút chính, thẻ 25, vạch 2px | palette v4 |
| `--topbar` / `--topbar-foreground` | `#2A1D14` / `#FFF5E6` | `#151413` / `#E9DCBA` | Thanh menu | palette v4 |
| `--group-bg` | `#2A1D14` (espresso đặc) | `rgb(210 182 121 / 0.10)` (ánh vàng) | Phần đầu, khối Đối tác, nền chuyển động mở đầu | palette v4 mục 3.3 |
| `--hero-glow` (chỉ phần đầu) | `rgb(207 174 104 / 0.12)` | `rgb(207 174 104 / 0.08)` | Lớp `radial-gradient(ellipse at 85% 0%, --hero-glow, transparent 60%)` phủ lên nền phần đầu | **thêm riêng cho landing** — ngoại lệ có chủ đích (mục 5) |
| `--group-border` | trong suốt | `rgb(210 182 121 / 0.35)` | Viền khối nổi bật bản tối | palette v4 |
| `--group-edge` | `#CFAE68` | `#D2B679` | Chữ "NEXORA", icon trên nền tối | palette v4 |
| `--group-title` / `--group-sub` | `#FFF5E6` / `#BFA88E` | `#E9DCBA` / `#B8A98C` | Chữ chính / phụ trên khối nổi bật | palette v4 |

**Thêm riêng (không có trong palette v4):**
- `.landing-hero` (CSS, chỉ phần đầu): nền `--background` + `--group-bg` như `bg-group-solid`, thêm đúng một lớp radial-gradient vàng rất mờ ở góc trên bên phải. Không noise/grain, không áp cho mục khác. Tương phản đo được trên nền này: tiêu đề 12,2–15,2:1, câu dẫn 5,8–8,2:1 (cả sáng và tối, đạt chuẩn 4,5:1).
- `bg-group-solid` (tiện ích CSS): nền `--background` + lớp `--group-bg` phía trên. Bản tối `--group-bg` trong suốt nên cần nền đặc phía dưới để không lộ nội dung.
- `--status-khong-ap-dung-bar` (`#A39A90`): màu mảng "Không áp dụng" trên biểu đồ Tổng quan (dùng trong app, ảnh chụp có hiện).

### Font, cỡ chữ, độ đậm

Một họ duy nhất **Lexend** (có chữ tiếng Việt) — palette v4 mục 5. Landing thêm độ đậm **800** (palette chỉ nạp 400–700).

| Cấp | Cỡ (điện thoại → màn rộng) | Độ đậm |
|---|---|---|
| Tiêu đề trang (h1) | 28px → 36px → 44px | 800 |
| Tiêu đề mục (h2) | 24px → 30px | 700 |
| Số thẻ 25 | 64px → 72px | 800 |
| Số thẻ 18 | 40px → 44px | 700 |
| Nhãn dưới số thẻ | 16px | 500 (thẻ 25) / 400 |
| Câu dẫn phần đầu | 16px → 18px | 400 |
| Thân bài, mô tả bước | 14–16px | 400 |
| Tên bước, nhãn có icon | 16px | 600 |
| Nhãn nhỏ đầu mục ("Kết quả chạy thử", "Chương trình đối tác") | 14px | 600 |
| Ghi chú (ngày kiểm số liệu, văn bản đã kiểm duyệt) | 12px | 400 |

### Khoảng cách, khung, góc

- Mọi mục cách trên/dưới **64px** (điện thoại) / **96px** (màn rộng) — thêm riêng cho landing.
- Khung nội dung rộng tối đa **1200px**, lề 16 / 24 / 32px.
- **Góc vuông** hoàn toàn (`--radius: 0`, palette v4). Không bóng đổ, không bo tròn, không sóng, không kính mờ.
- Ảnh chụp app: khung phẳng viền 1px + vạch vàng 2px trên đầu; cắt bằng CSS (tỉ lệ cố định, `object-fit: cover`, `object-position: top`) để che email tài khoản ở chân sidebar. Tỉ lệ: Tổng quan / Xác nhận / Thông báo 1440:760, Cập nhật khách hàng 1440:700 (đứng cạnh khối số ở mục Chạy thử).

### Icon

Lucide (palette v4), nét mảnh, 16–20px; trong các ý liệt kê đặt trong ô vuông 36px nền `--accent`, icon màu `--gold-text` (cùng kiểu ô icon của thẻ KPI trong app).

### Nút

| Loại | Kiểu | Ở đâu |
|---|---|---|
| Nút chính | nền `bg-gold-metal`, viền `--gold-metal-border`, chữ `#2A2112`, hover sáng hơn 5% | **Một nút mỗi mục**: menu "Đăng ký doanh nghiệp", phần đầu "Quét miễn phí", gói miễn phí, Đối tác, kêu gọi cuối trang |
| Nút viền | nền trong suốt, viền 1px | "Xem cách hoạt động" (viền vàng nhạt trên nền tối), "Bắt đầu miễn phí" ở gói trả phí |
| Link chữ | chữ thường / `--gold-text`, gạch chân khi trỏ | "Đăng nhập", chân trang |

---

## 3. Component

**Tái sử dụng từ app:** `Button` / `buttonVariants` (nút chính = biến thể mặc định), `Sheet` (ngăn kéo menu điện thoại — thêm tuỳ chọn `overlayClassName` để tắt làm mờ nền, các trang app không đổi), `next/image`, icon Lucide, token màu trong `app/globals.css`, ảnh `public/logo-mark-v2.png`.

**Chỉ landing có** (`components/nexora/landing/`):
- `landing-page.tsx` — toàn bộ trang + hiệu ứng hiện dần khi cuộn.
- `landing-intro.tsx` — chuyển động mở đầu.
- `landing-shot.tsx` — khung ảnh chụp app có cắt bằng CSS.
- `logo-lockup.tsx` — logo mark + "NEXORA / COMPLIANCE NAVIGATOR" trên nền tối (dùng chung cho menu và chuyển động mở đầu để logo đáp đúng chỗ).

---

## 4. Chuyển động

| Hiệu ứng | Thời gian | Chạy khi nào | Khi máy bật giảm chuyển động |
|---|---|---|---|
| **Mở đầu**: logo ~160px hiện giữa nền tối → khung vàng tự vẽ quanh logo → logo thu nhỏ, chữ "NEXORA / COMPLIANCE NAVIGATOR" hiện → cả cụm trượt về đúng chỗ logo trên menu, nền mờ dần | 3,5 giây | Lần đầu mở trang trong phiên (nhớ bằng `sessionStorage`). Bấm chuột hoặc nhấn phím để bỏ qua. Có chốt an toàn: sau 5,5 giây trang vẫn hiện dù có lỗi | Không chạy, hiện ngay trang hoàn chỉnh |
| **Phần đầu hiện dần**: tiêu đề → câu dẫn → nút → dòng văn bản → ảnh, mỗi phần trượt lên 20px và rõ dần | 700ms, cách nhau 100ms (~1 giây tổng) | Ngay sau chuyển động mở đầu | Hiện ngay, không trượt |
| **Hiện dần khi cuộn**: mỗi khối rõ dần + trượt lên 16px; các phần tử con lần lượt (60–80ms) | 400ms | Khi khối vào khung nhìn, **chỉ 1 lần** | Hiện ngay, không trượt |
| **Vạch vàng dưới menu** | 200ms | Khi đã cuộn khỏi đầu trang | Như bình thường (chỉ đổi độ mờ) |

Không có chuyển động lặp vô hạn, không parallax, không thư viện chuyển động (chỉ CSS/SVG và Web Animations API của trình duyệt).

**Đã kiểm ở chế độ chuyển động bình thường** (Playwright, `reducedMotion: 'no-preference'`, 21/10/2026): chuyển động mở đầu chạy và tự kết thúc sau 4,5 giây (lớp phủ đã gỡ); 21/21 khối dưới màn hình đầu ở trạng thái ẩn trước khi cuộn, cuộn tới mục Chạy thử thì 5/5 khối của mục hiện ra. Không tràn ngang ở 1440px và 390px. → **Chạy đúng.**

---

## 5. Góp ý đã nhận

| Góp ý | Kết quả | Lý do |
|---|---|---|
| Thêm gradient cho nền phần đầu | **Đã làm, ở mức nhẹ** | Theo góp ý team, ngoại lệ có chủ đích so với palette v4: giữ nền espresso `#2A1D14`, phủ **một** lớp `radial-gradient(ellipse at 85% 0%, rgb(207 174 104 / 0.12), transparent 60%)` (bản tối độ mờ 0.08). Chỉ phần đầu; không noise/grain; chữ và nút giữ đủ tương phản (mục 2). |
| Dùng font serif cho tiêu đề | **Không làm** | Palette v4: một họ Lexend duy nhất, đồng bộ với app. |
| Giảm thân bài xuống độ đậm 300 | **Không làm** | Lexend 300 làm dấu tiếng Việt mảnh, khó đọc; giữ 400. |
| Menu dùng backdrop-blur (kính mờ) | **Không làm** | Palette v4 không dùng kính mờ; menu nền `bg-topbar` đặc. Ngăn kéo menu cũng đã tắt làm mờ nền. |
| Khoảng cách cố định giữa các mục (96 / 64px) | Đã làm | |
| Menu dính trên cùng, nền đặc, vạch vàng khi cuộn | Đã làm | |
| Ảnh chụp app cao hơn, vẫn che email, không lightbox | Đã làm | Chụp lại bằng Playwright 1440×900 @2x, khung cắt mới |
| Mỗi mục một nút vàng; gói trả phí nút viền | Đã làm | |
| h1 độ đậm 800, thân bài giữ 400 | Đã làm | |
| Gộp "Kinh doanh ×2" | Không cần | Khối 4 ô người đã bỏ khi rút gọn landing (phần "Vấn đề" gộp vào phần đầu) |
| Chân trang tối giản, không link chính sách | Đã làm | |
| Kiểm tra hiệu ứng cuộn ở chế độ chuyển động bình thường | Đã làm | Chạy đúng (mục 4) |
| Mục "Bằng chứng" → "Chạy thử", thẻ số xếp hàng riêng | Đã làm | |
| Mục Chạy thử quá to → một hàng chia đôi (khối số trái, ảnh phải), thu nhỏ thẻ | Đã làm | Chia đôi từ 1280px; ở 1024–1279px ảnh quá hẹp nên xếp dọc như điện thoại |

---

## 6. Việc còn tồn

- **Email liên hệ của team**: chưa có → nút "Đăng ký làm đối tác" tạm dẫn `/dang-ky`, chân trang chưa hiện email (`LIEN_HE_DOI_TAC` trong `lib/copy-landing.ts`).
- **Tên cuộc thi** ở chân trang: chưa có tên chính xác nên chưa ghi.
- **Ảnh Cập nhật khách hàng** đang có 6 dòng, gồm "The Tank" (tài khoản tạo khi thử luồng đăng ký). Nếu muốn ảnh chỉ có doanh nghiệp mẫu thì xoá doanh nghiệp này ở DB rồi chụp lại (script chụp để ngoài repo, chạy lại được).
- **Gói trả phí** ghi "Thông báo văn bản mới" thay cho "cảnh báo hằng tuần" (chưa có cảnh báo định kỳ) — chờ team chốt.
- **Độ dài chữ**: landing hiện ~1.830 ký tự (mục tiêu ~1.600). Phần dư nằm ở câu mô tả 5 bước, đang giữ nguyên theo yêu cầu.
- **Chữ viết thẳng trong component app** (12 file) chưa chuyển vào `lib/copy.ts` — xem `docs/TODO-frontend.md`.
- Ảnh chụp app chỉ có bản **sáng**; landing bản tối vẫn hiện ảnh chụp sáng (chủ ý, để ảnh đọc rõ).
