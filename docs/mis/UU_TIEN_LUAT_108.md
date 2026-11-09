# Thứ tự ưu tiên trích xuất và duyệt — Luật Quản lý thuế 108/2025/QH15

> Lập 09/11/2026 theo quyết định Q-B (HE_THONG_DA_CHOT.md §2.2, nhật ký thay đổi #11).
> **Trạng thái: NHÁP — mới có quy tắc xếp và bậc 0.** Phần còn lại điền khi có file toàn văn (việc N1′), rồi commit với
> trạng thái `chot` **trước khi** chạy trích xuất (X1). Script X1 đọc khối JSON cuối file và từ chối chạy nếu trạng thái
> chưa là `chot` hoặc có điều trong toàn văn không có mặt trong danh sách.

## 1. Mục đích

Luật 108 nạp toàn văn (S1–S3) nhưng không kịp trích xuất và duyệt hết trước 14/11. Thứ tự dưới đây quyết định điều nào vào
thư viện đo. Thứ tự được **cố định trước** để phần được đo không bị chọn theo độ dễ duyệt — nếu chọn theo độ dễ, thư viện
lệch về điều C0, và các chỉ số Δ, D(S), tỉ lệ cần bổ sung bị thiên lệch theo hướng có lợi cho kết luận.

## 2. Tiêu chí (HE_THONG_DA_CHOT.md §2.2)

| Mã | Tiêu chí | Ghi gì làm căn cứ |
|---|---|---|
| TC1 | Có điều kiện theo loại hình, ngưỡng hoặc sự kiện, làm kết luận khác nhau giữa các doanh nghiệp | Cụm từ nguyên văn nêu điều kiện (vd "trường hợp…", "người nộp thuế có…", ngưỡng, thời điểm phát sinh) |
| TC2 | Có liên kết với quy định ở văn bản khác: dẫn chiếu, loại trừ, thay thế — gồm dẫn chiếu sang NĐ 252/2026, TT 90/2026 (không nạp → C5) và sang quy định LDN / TNDN đã chọn (N2) | Cụm dẫn chiếu nguyên văn + văn bản đích |
| TC3 | Giao cho phòng ban khác với các quy định còn lại (khác `ke_toan`) | Phòng ban gợi ý + lý do |

## 3. Quy tắc xếp bậc (cố định)

| Bậc | Điều kiện vào bậc | Lý do của bậc |
|---|---|---|
| 0 | 9 điều đã có đề xuất LLM cũ: Đ2, 3, 8, 10, 11, 27, 48, 52, 53 | Lát cắt đo (i): so engine cũ / mới trên **cùng bộ đề xuất** (PLAN.md D9). Vào bậc 0 vì thiết kế đo, không vì tiêu chí §2.2 hay độ dễ |
| 1 | Thỏa TC1 **và** ít nhất một trong TC2, TC3 | Phân hóa doanh nghiệp + nối sang văn bản / phòng ban khác: đóng góp nhiều nhất cho Δ, D(S), ba lý do "cần bổ sung" |
| 2 | Chỉ thỏa TC1 | Phân hóa doanh nghiệp |
| 3 | Không thỏa TC1; thỏa TC2 hoặc TC3 | Liên kết văn bản hoặc phân việc, nhưng áp dụng như nhau cho mọi doanh nghiệp |
| 4 | Không thỏa tiêu chí nào (phạm vi, giải thích từ ngữ, nguyên tắc, nhiệm vụ / quyền hạn của cơ quan quản lý thuế, tổ chức bộ máy) | Nạp chunk (S1–S3) để S4 có đích dẫn chiếu; **không trích xuất trong MVP**. Báo cáo ghi số điều bậc 4 |

- Trong cùng bậc: số điều tăng dần. Không có tiêu chí phụ nào khác.
- Một điều ghép nhiều khoản: xét theo khoản thỏa nhiều tiêu chí nhất.
- Bậc 0 vẫn ghi TC1–TC3 (để báo cáo biết 9 điều cũ thuộc loại nào), nhưng thứ tự không đổi theo đó.

## 4. Ai xếp, khi nào khóa

1. Khi có file toàn văn: Claude đọc từng điều, điền bảng §5 với **trích dẫn nguyên văn** làm căn cứ cho mỗi tiêu chí thỏa.
2. Một thành viên nhóm (không phải người sẽ duyệt nhiều nhất) kiểm từng dòng; dòng bất đồng ghi cả hai ý, chọn theo căn cứ
   nguyên văn, không theo độ dễ.
3. Đổi `trang_thai` thành `chot`, commit. **Từ commit đó thứ tự cố định.**
4. Sửa sau khi khóa chỉ khi căn cứ của một dòng sai (trích dẫn không có trong điều, hoặc hiểu sai câu). Mỗi lần sửa thêm một
   dòng vào §7 (ngày, điều, bậc cũ → mới, lý do, người sửa). "Điều này khó duyệt" / "điều này nhiều entity" **không** phải lý do hợp lệ.
5. Thứ tự TC2 phụ thuộc danh sách quy định LDN / TNDN đã chọn (N2, hạn 11/11): xếp sau khi N2 xong.

## 5. Danh sách

Số điều toàn văn: **chưa đếm** (chờ file). Dấu hiệu: Điều 52 là "Điều khoản thi hành", Điều 53 là "Điều khoản chuyển tiếp"
→ luật có khoảng 53 điều. Chốt khi có file.

| Thứ tự | Điều | Tên điều (từ chunk cũ) | Bậc | TC1 | TC2 | TC3 | Căn cứ / lý do |
|---|---|---|---|---|---|---|---|
| 1 | 2 | Đối tượng áp dụng | 0 | chờ xét | chờ xét | chờ xét | Lát cắt (i); 23 chủ thể cần xác nhận phạm vi (việc N4) |
| 2 | 3 | Phân nhóm người nộp thuế trong quản lý thuế | 0 | chờ xét | chờ xét | chờ xét | Lát cắt (i) |
| 3 | 8 | Các hành vi bị nghiêm cấm trong quản lý thuế | 0 | chờ xét | chờ xét | chờ xét | Lát cắt (i) |
| 4 | 10 | Đăng ký thuế | 0 | chờ xét | chờ xét | chờ xét | Lát cắt (i) |
| 5 | 11 | Mã số thuế | 0 | chờ xét | chờ xét | chờ xét | Lát cắt (i) |
| 6 | 27 | Chứng từ điện tử | 0 | chờ xét | chờ xét | chờ xét | Lát cắt (i) |
| 7 | 48 | Trường hợp bị cưỡng chế thi hành quyết định hành chính về quản lý thuế | 0 | chờ xét | chờ xét | chờ xét | Lát cắt (i) |
| 8 | 52 | Điều khoản thi hành | 0 | chờ xét | chờ xét | chờ xét | Lát cắt (i) |
| 9 | 53 | Điều khoản chuyển tiếp | 0 | chờ xét | chờ xét | chờ xét | Lát cắt (i) |
| 10… | | (điền khi có toàn văn, theo §3) | | | | | |

## 6. Ước lượng giờ duyệt của người

Số liệu nền (bản chụp 09/11, `research/baseline/`): 9 điều cũ → 70 entity, tức **7,8 entity / điều** (3,4 hành vi / điều).
Lượt duyệt cũ: 70 entity trong 18 phút, trung vị 6 giây / entity, một người, không ghi chú — đó là nhịp đã sinh ra 72% tất
định câm (§13.1), **không** dùng làm định mức.

Định mức dùng để lập kế hoạch: **2,5 phút / entity** (đọc trích dẫn, chọn mã C0–C7, xác nhận phạm vi hoặc viết điều kiện
máy đọc hoặc gắn cờ, gán phòng ban). Cạnh LLM duyệt cùng entity nguồn, không tính thêm. Cạnh ngoại lệ thêm tay: 5 phút / cạnh.

| Phần | Số điều | Entity ước | Giờ duyệt |
|---|---|---|---|
| Bậc 0 (9 điều cũ, có sẵn đề xuất) | 9 | 70 (đếm thật) | 2,9 |
| Các điều còn lại nếu luật có 53 điều | 44 | ~343 | ~14,3 |
| Trong đó bậc 4 (không trích xuất) | chưa biết | — | 0 |

Giờ duyệt thật = (số điều bậc 0–3) × 7,8 × 2,5 phút. Tính lại khi bảng §5 chốt; cập nhật PLAN.md §4.1.

## 7. Nhật ký sửa sau khi khóa

(trống)

## 8. Khối máy đọc cho X1

```json
{
  "van_ban": "108/2025/QH15",
  "trang_thai": "nhap",
  "so_dieu_toan_van": null,
  "thu_tu": [
    { "dieu": 2, "bac": 0 },
    { "dieu": 3, "bac": 0 },
    { "dieu": 8, "bac": 0 },
    { "dieu": 10, "bac": 0 },
    { "dieu": 11, "bac": 0 },
    { "dieu": 27, "bac": 0 },
    { "dieu": 48, "bac": 0 },
    { "dieu": 52, "bac": 0 },
    { "dieu": 53, "bac": 0 }
  ]
}
```
