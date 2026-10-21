# Định dạng: thông báo lỗi, trạng thái tải

## Độ dài tối đa

| Loại | Tối đa |
| :-- | :-- |
| Lỗi tại ô nhập | 1 câu, ~10 chữ |
| Lỗi chung của form / trang | 2 câu |
| Trạng thái đang tải | 1 cụm, kết thúc bằng "…" |
| Nút khôi phục | 1–3 chữ ("Thử lại", "Đăng nhập lại") |

## Cấu trúc câu

1. **Chuyện gì xảy ra**, bằng lời người dùng — không mã lỗi, không tiếng Anh, không "Error", không "PT403".
2. **Làm gì tiếp** — thử lại, sửa ô nào, liên hệ ai.
3. Lỗi tại ô: nói **cần nhập thế nào**, không chỉ "Không hợp lệ". "Mã số thuế gồm 10 số, chi nhánh thêm -3 số".
4. Không đổ lỗi cho người dùng ("Bạn đã nhập sai"), không xin lỗi dài dòng.
5. Chi tiết kỹ thuật ghi vào console, không hiện ra màn hình.

## Câu chuẩn đang dùng (lib/copy.ts → COPY.state)

- Hết phiên: "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại."
- Tải lỗi: câu chung + nút "Thử lại".

## Ví dụ chuẩn

> Chưa lưu được hồ sơ. Kiểm tra kết nối mạng rồi bấm "Thử lại".
> [Thử lại]
