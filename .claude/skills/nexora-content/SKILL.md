---
name: nexora-content
description: "Viết và sửa mọi chữ tiếng Việt của Nexora: chữ trong app, landing page, thông báo, email, thông báo lỗi. Dùng cho mọi việc viết hoặc duyệt câu chữ."
---

# Nexora — chữ tiếng Việt

Luôn đọc `references/brand-facts.md` và `references/anti-slop.md` trước.

## Định tuyến

| Đang viết gì | Đọc thêm |
| :-- | :-- |
| Chữ trong app (nhãn, nút, tiêu đề trang, mô tả, trạng thái rỗng) | `voices/ui.md` + `references/glossary.md` + `formats/ui-microcopy.md` |
| Landing page, trang giới thiệu, bài đăng | `voices/marketing.md` + `formats/landing-section.md` |
| Thông báo trong app, email thông báo | `formats/notification.md` (+ `voices/ui.md`) |
| Thông báo lỗi, trạng thái tải / lỗi | `formats/error-state.md` (+ `voices/ui.md`) |

Ví dụ câu sáo và câu tốt: `samples/good-bad.md`.

## Quy trình

1. Đọc `brand-facts.md`: chỉ nói điều có trong đó. Nhận định không có ở đó → bỏ, hoặc nói mềm lại ("có thể", "nhiều").
2. Đọc giọng (`voices/`) và định dạng (`formats/`) theo bảng trên.
3. Viết nháp. Mỗi câu phải có ít nhất một chi tiết cụ thể: văn bản, con số, phòng ban, hoặc việc người dùng làm.
4. Soát theo `anti-slop.md`: cụm cấm, cấu trúc cấm, dấu chấm than, emoji.
5. Trong app: dùng đúng tên trong `glossary.md`; chữ đặt ở `lib/copy.ts`, không viết thẳng trong component.

## Khi duyệt chữ có sẵn

Chỉ báo câu thật sự có vấn đề. Mỗi dòng ghi: vị trí (file + khoá/dòng) · câu hiện tại · vấn đề (quy tắc nào) · câu đề xuất. Không tự sửa khi chưa được duyệt.
