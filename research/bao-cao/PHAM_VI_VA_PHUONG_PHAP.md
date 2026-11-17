# Phạm vi, phương pháp, và phần ngoài phạm vi MVP

> Mục cho báo cáo, chốt 16/11/2026 theo quyết định của chủ repo (phương án 1 của điểm cắt HE_THONG_DA_CHOT §14.1: dừng code
> tính năng, duyệt kỹ bậc 0, viết báo cáo). Nguồn đúng về thiết kế vẫn là `docs/mis/HE_THONG_DA_CHOT.md`.

## 1. Phạm vi — ba tầng, không gộp

| Tầng | Nội dung | Ghi chú |
|---|---|---|
| **Phạm vi tuyên bố** | 3 bộ luật: Luật Doanh nghiệp 59/2020/QH14 (sửa đổi 03/2022/QH15, 76/2025/QH15); Luật Thuế TNDN 67/2025/QH15 (và các luật sửa đổi); Luật Quản lý thuế 108/2025/QH15 | Thiết kế (bộ mã C0–C7, hồ sơ T0–T3, quy tắc S9, ngoại lệ) viết cho cả ba |
| **Phạm vi đã nạp** | 1 văn bản: Luật Quản lý thuế 108/2025/QH15 | Trên CSDL MIS: 9 chunk (9 điều cũ). Toàn văn 53 điều có ở `research/van-ban/` và đã kiểm (`KIEM_TRA.json`) nhưng **chưa nạp** thành chunk (T1 ngoài phạm vi, §3) |
| **Phạm vi đã duyệt** | 9/53 điều của văn bản đó | 70 entity, nằm ở 8 điều; Điều 53 không có entity nào (LLM không đề xuất). Trạng thái tại 16/11: 0/70 đã duyệt — tầng này chỉ đúng sau lượt duyệt 16–17/11 |

Không viết "hệ thống xác định nghĩa vụ theo 3 bộ luật" ở bất cứ đâu mà không kèm hai tầng sau; không viết "đã nạp toàn văn".

## 2. Phương pháp — các quyết định ảnh hưởng tái lập

### 2.1 Sổ tay mã: duyệt bằng v1 (quyết định 16/11)

- Toàn bộ 70 entity duyệt bằng **bộ mã C0–C7 bản v1** — đúng bản đang có trong `bo_ma_dieu_kien` trên CSDL (8 mã) và bản mà màn
  duyệt U1a dựng theo. Bản v2 (sau gán mã độc lập hai người, kappa — việc N3) không có trước 21/11.
- Quy tắc trước đó "không duyệt bằng v1, chờ v2" được chủ repo gỡ. Lý do: quy tắc đó sinh ra để tránh dataset **bị chia đôi**
  (một phần duyệt theo v1, một phần theo v2) — entity đã duyệt thì khóa, và mẻ đo thời gian sẽ nhiễm nếu trộn hai sổ tay. Khi
  v2 không có trước hạn, duyệt toàn bộ bằng v1 cho dataset **nhất quán hoàn toàn**; mục đích của quy tắc đạt được theo hướng còn lại.
- Hệ quả phải nêu: chưa có độ tin cậy liên người gán mã (kappa) cho bộ mã; phân bố C0–C7 báo cáo là phân bố của một người duyệt
  dùng v1.

### 2.2 Thứ tự ưu tiên Luật 108

- Cố định trước khi trích xuất, không theo độ dễ duyệt: `docs/mis/UU_TIEN_LUAT_108.md` (chốt 16/11).
- Tiêu chí phụ trong bậc (phương án B, nhật ký thay đổi thiết kế #17): điều có câu đặt "phải / có trách nhiệm / có nghĩa vụ"
  lên người nộp thuế không giới hạn là cá nhân / hộ, hoặc lên tổ chức là người nộp thuế theo Đ2 k1, xếp trước. Câu tiêu chí viết
  trước khi xếp lại, áp máy móc; kết quả lệch 4 điều so với danh sách xếp bằng mắt (ghi ở §5.4 của tài liệu đó).
- Cách đọc **TC2** (để tái lập): TC2 chỉ tính khi **chính nội dung nghĩa vụ của người nộp thuế** phụ thuộc văn bản khác (dẫn
  chiếu, loại trừ, thay thế, giao Chính phủ / Bộ Tài chính quy định chi tiết chính nghĩa vụ đó). Câu giao văn bản dưới luật quy
  định thủ tục nội bộ của cơ quan thuế **không** tính. Lý do: luật giao Chính phủ / Bộ Tài chính quy định chi tiết là đặc điểm
  cấu trúc gần như điều nào cũng có — nếu tính, TC2 khớp gần hết và mất tác dụng phân loại.
- Bậc 4 gồm cả điều mà người mang nghĩa vụ không phải doanh nghiệp (cơ quan nhà nước, tổ chức tín dụng, tổ chức dịch vụ thuế) —
  chủ repo chấp nhận 16/11.
- Với đường cắt MVP ở bậc 0, thứ tự bậc 1–2 không được dùng để trích xuất; chỉ là thứ tự công bố cho phần làm tiếp.

### 2.3 Người duyệt và cạnh ngoại lệ

- 70 entity: một người duyệt.
- ~8 cạnh ngoại lệ (Đ10 k1–k3, TNDN Đ18 k3/k4…): CSDL ép người duyệt cạnh **khác** người tạo cạnh (migration 008,
  `approve_relationship`). Có người thứ hai (30–40 phút) thì làm; không có thì **bỏ nhánh cạnh ngoại lệ** và ghi: nhánh "ngoại lệ
  đã duyệt" của S9 chưa được thử trên dữ liệu thật. (Chủ repo báo kết quả trong 16/11 — điền vào đây.)
- Vai trò chuyên viên do người cấp tay trong Supabase Dashboard, không qua pipeline (`research/quyen/RA_SOAT_QUYEN.md` §6).

### 2.4 Đo

Thời gian duyệt mỗi entity, so đề xuất gốc ↔ bản đã duyệt, so hai lượt: `research/bao-cao/KHUNG_TRUOC_SAU.md`.

### 2.5 Lược đồ hồ sơ dùng trong lượt duyệt: bộ cũ 18–20/10, không phải T0–T3

Form hồ sơ T0–T3 theo thiết kế (HE_THONG_DA_CHOT §9.2) nằm trong nhóm việc đã hủy (phương án 1, 16/11). Vì vậy bảng
`thuoc_tinh_ho_so` trên MIS vẫn là bộ 20 trường tạo ngày 18–20/10/2026. **Mọi điều kiện máy đọc viết trong lượt duyệt
17/11 đều gắn với lược đồ cũ này.** Khi có lược đồ T0–T3, các điều kiện phải được viết lại; chúng không tự chuyển sang.

### 2.6 Quan sát phương pháp: điều kiện đúng về pháp lý nhưng không mang thông tin

Trường loại hình (`loai_hinh_kinh_doanh`) chỉ có 3 giá trị: `doanh_nghiep`, `ho_kinh_doanh`, `ca_nhan_kinh_doanh`. Danh sách
chủ thể của luật mịn hơn: Luật 108 Điều 10 khoản 2 kể 8 loại (doanh nghiệp, hợp tác xã, liên hiệp hợp tác xã, tổ hợp tác,
đơn vị phụ thuộc, tổ chức khác, hộ kinh doanh, cá nhân kinh doanh). Năm loại không có giá trị tương ứng nên bị bỏ ra khỏi
điều kiện. Ba loại còn lại phủ **toàn bộ** tập giá trị của trường.

Hệ quả, với chủ thể Điều 10 khoản 2 (người duyệt chốt 17/11: C2, `loai_hinh_kinh_doanh` thuộc cả 3 giá trị): điều kiện
đúng về mặt pháp lý, nhưng đúng với **mọi** hồ sơ hợp lệ, nên **không phân biệt được doanh nghiệp nào với doanh nghiệp
nào**. Đây không phải lỗi của người duyệt. Nó là khoảng cách giữa vốn từ của luật (8 loại hình) và vốn từ của mô hình dữ
liệu (3 giá trị). Người duyệt giữ C2 thay vì C0 vì C0 nghĩa là "mọi đối tượng của văn bản", mà đối tượng của Luật 108
rộng hơn danh sách ở khoản 2.

Cách đếm (máy, sau lượt duyệt): một điều kiện máy đọc là **rỗng nghĩa** khi trường có tập giá trị đóng (`lua_chon`) và
điều kiện đúng với mọi giá trị trong tập — `in` chứa đủ mọi giá trị, `not_in` không chứa giá trị nào, hoặc `eq` / `neq`
trên trường boolean mà cả hai giá trị đều thỏa (không xảy ra với một điều kiện đơn). Báo: số điều kiện rỗng nghĩa / số
entity đã gán C1–C3 / 33 entity phải gán mã.

Số đo: _điền sau lượt duyệt_. Ca đã biết đến 17/11 trưa: chủ thể Điều 10 khoản 2, đang được duyệt.

## 3. Ngoài phạm vi MVP — đã thiết kế, chưa triển khai

Phần thiết kế vẫn là kết quả của đồ án; mỗi dòng ghi tài liệu thiết kế còn giữ. Lý do chung: điểm cắt §14.1 (15/11) đến hạn khi
chưa có số đo sau can thiệp; chủ repo chọn dừng code tính năng để thời gian còn lại dành cho duyệt kỹ bậc 0 (16/11). Duyệt vội
để kịp hạn sẽ tạo thêm đúng loại dữ liệu bài đang phê phán.

| Việc | Thiết kế ở đâu | Trạng thái / lý do riêng |
|---|---|---|
| T1 — nạp toàn văn Luật 108 thành chunk | PLAN.md §1.4; `UU_TIEN_LUAT_108.md` | Toàn văn đã có và đã kiểm 4 điều kiện; chưa nạp. Không cần cho bậc 0 |
| X1 — trích xuất hàng loạt theo thứ tự cố định | PLAN.md §1.5; `UU_TIEN_LUAT_108.md` §8 (khối JSON đã `chot`) | Cần T1; đường cắt ở bậc 0 |
| S9 — viết lại phân giải khả áp dụng (chưa xác nhận ≠ áp dụng, hai loại ngoại lệ, `chi_mot_phan`, ngày đánh giá, hết hiệu lực) | HE_THONG §8; PLAN.md §3 S9 | S9 là phần **tiêu thụ** thư viện; các phát hiện của bài là về phần **quản trị** thư viện và không cần S9. Lỗi của S9 cũ (72% tất định câm) đã truy tới dòng code (HE_THONG §13.2) |
| R1 — dòng "chưa gắn phòng", định tuyến "cần bổ sung" | HE_THONG §6.2, §8; PLAN.md §3 R1 | Phụ thuộc S9 |
| M9 — `diagnostics.ly_do`, `ngay_danh_gia` | PLAN.md §2 M9 | Phụ thuộc S9 |
| HS0, HS1, HS2 — hồ sơ hai phần, form sinh từ thư viện, hỏi bổ sung | HE_THONG §9.2; PLAN.md §2 HS0, §3 HS1–HS2 | Form chỉ hỏi trường mà quy định C1–C3 **đã duyệt** dùng — chưa có thư viện đã duyệt thì chưa có trường |
| U1b — danh sách cạnh chờ duyệt trên màn chuyên viên; script tạo cạnh ngoại lệ | PLAN.md §3 U1; HE_THONG §12 #3 | Phần CSDL (trạng thái duyệt của cạnh, `approve_relationship`, người duyệt ≠ người tạo) đã xong và đã kiểm thử ở 008 (49 ca) |
| NĐ — phần code mới trong ứng dụng | PLAN.md §3 NĐ | Phép đo vẫn có, dưới dạng script nghiên cứu chỉ đọc (`scripts/research/nhip-duyet.mjs`), không phải tính năng |
| Bộ hồ sơ fixture A–I cho S9 | A, B, C: HE_THONG §10 (kết quả mong đợi §10.4). D–I: §3.1 dưới đây | Không có S9 thì fixture không chạy được |
| Kiểm 6 điều ⁽ᵐ⁾ (nghĩa vụ bên thứ ba kéo theo nghĩa vụ doanh nghiệp); quyết định Điều 22 | `UU_TIEN_LUAT_108.md` §5.1 | Bậc 1–4 không trích xuất trong MVP |
| Nhãn `phu_thuoc_van_ban_chua_nap` trên entity (biến TC2 thành nhãn đếm được) | Đề xuất của chủ repo 16/11 | Hướng làm tiếp: cho con số cụ thể về chỗ giới hạn MVP cắn mạnh nhất |
| Câu chữ hiển thị cho nghĩa vụ cần sự kiện mà form không hỏi (vd giải thể, Điều 17) | Chủ repo 16/11: giữ nguyên tắc "form chỉ hỏi trường quy định đã duyệt dùng tới", không thêm trạng thái; chỉ sửa câu hiển thị cho người đọc hiểu là hệ không theo dõi sự kiện đó, không phải họ chưa trả lời | Chưa đếm. Số ca phụ thuộc vào thư viện bậc 0 sau khi duyệt (entity nào được gán C3 với một sự kiện mà phần 2 của hồ sơ không hỏi); bậc 0 có thể có ca như vậy (vd Điều 48 — các trường hợp bị cưỡng chế — xoay quanh sự kiện nợ quá hạn). Đếm được từ `ma_dieu_kien` sau 17/11 nếu cần |
| Văn bản LDN + TNDN (25–40 quy định chọn lọc, N1–N2, N4′) | HE_THONG §2.2 | Chưa nạp — phạm vi đã nạp chỉ là Luật 108 (§1) |
| Gán mã độc lập hai người, kappa, sổ tay mã v2 (N3) | HE_THONG §14.1 #3; PLAN.md §4 N3 | Không có trước 21/11 — xem §2.1 |

### 3.1 Thiết kế bộ hồ sơ fixture D–I (đề xuất 16/11, chưa viết file)

Bổ sung cho A, B, C (HE_THONG §10) ở các chỗ A/B/C chưa chạm; mỗi dòng nhắm một quy tắc S9 cụ thể.

| Hồ sơ | Đặc điểm | Quy tắc bị thử |
|---|---|---|
| D — cố tình thiếu thông tin | TNHH 1TV; doanh thu "Không chắc"; nhóm thu nhập TNDN Đ18 k3 "Không muốn trả lời"; chỉ có phòng Kế toán | "Cần bổ sung" lý do `ho_so_thieu`, lý do để trống lưu riêng; "áp dụng" không có phòng khớp → dòng chưa gắn phòng |
| E — doanh nghiệp mới | CTCP chưa niêm yết; doanh thu "chưa có kỳ trước"; đổi cổ đông NĐT nước ngoài "Không chắc" | Điều kiện C2 thỏa nhưng C3 thiếu → cần bổ sung; cách thư viện xử lý "chưa có kỳ trước" |
| F — điều kiện sai thắng điều kiện thiếu | TNHH 2TV+; doanh thu > 50 tỷ; nhóm thu nhập "Không chắc" | Quy tắc 4 của S9: một điều kiện sai → không áp dụng, không ra "cần bổ sung". **Nhắm một lỗi đã truy ra ở MVP cũ** |
| G — không phòng nào khớp | DNTN; chỉ có phòng Kinh doanh; đổi ngành nghề ngày 06/11/2026 | Mọi "áp dụng" thành dòng chưa gắn phòng; kèm ngày sự kiện. **Nhắm một lỗi đã truy ra ở MVP cũ** |
| H — đánh giá trước ngày hiệu lực | Như A, ngày đánh giá 15/06/2026 | Nghĩa vụ Luật 108 ra `sap_ap_dung`; nghĩa vụ LDN không đổi |
| I — cạnh ngoại lệ đang chờ duyệt | Như B, nhưng cạnh ngoại lệ X3 ở `cho_duyet` | S9 coi cạnh chưa duyệt là chưa xác nhận → "cần bổ sung", lý do `thu_vien_chua_du`. Quy tắc dựng ở M8 mà chưa ca nào thử thẳng |

Kết quả mong đợi từng ô chỉ viết được khi có thư viện đã duyệt và S9 mới.
