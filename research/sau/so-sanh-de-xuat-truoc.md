# So đề xuất gốc LLM ↔ bản đã duyệt — màn duyệt cũ (prod, lượt 20/10/2026)

Chạy: 2026-11-18T02:43:26.809Z. 70 entity Luật 108, 9 điều cũ. Quy tắc phân loại: `scripts/research/do-duyet-lib.mjs` (phanLoai).

| Lớp | Số entity |
|---|---|
| y_nguyen | 36 |
| sua_nho | 1 |
| doi_nghia | 8 |
| chua_gan_nhan | 0 |
| tu_choi | 25 |
| chua_duyet | 0 |



## Theo điều

| Điều | y_nguyen | sua_nho | doi_nghia | chua_gan_nhan | tu_choi | chua_duyet |
|---|---|---|---|---|---|---|
| 2 | 5 | 0 | 0 | 0 | 0 | 0 |
| 3 | 0 | 0 | 0 | 0 | 3 | 0 |
| 8 | 0 | 0 | 7 | 0 | 6 | 0 |
| 10 | 10 | 1 | 0 | 0 | 1 | 0 |
| 11 | 5 | 0 | 0 | 0 | 0 | 0 |
| 27 | 10 | 0 | 1 | 0 | 0 | 0 |
| 48 | 3 | 0 | 0 | 0 | 10 | 0 |
| 52 | 3 | 0 | 0 | 0 | 5 | 0 |

## Entity bị sửa

| Điều | Lớp | Lý do máy | Gốc (LLM) | Sau duyệt |
|---|---|---|---|---|
| 8 | doi_nghia | dao_phu_dinh_ten_entity | ten_entity: Chống đối, trì hoãn, không cung cấp thông tin | ten_entity: Cung cấp thông tin đầy đủ, đúng hạn cho cơ quan thuế |
| 8 | doi_nghia | dao_phu_dinh_ten_entity | ten_entity: Sử dụng mã số thuế của người khác trái quy định | ten_entity: Không sử dụng mã số thuế của người khác |
| 8 | doi_nghia | dao_phu_dinh_ten_entity | ten_entity: Bán hàng không lập hóa đơn và sử dụng hóa đơn giả | ten_entity: Lập hóa đơn đầy đủ khi bán hàng |
| 8 | doi_nghia | dao_phu_dinh_ten_entity | ten_entity: Truy cập trái phép và phá hủy hệ thống thông tin | ten_entity: Không truy cập trái phép hệ thống thông tin thuế |
| 8 | doi_nghia | dao_phu_dinh_ten_entity | ten_entity: Phát tán thông tin sai lệch | ten_entity: Không phát tán thông tin thuế sai lệch |
| 8 | doi_nghia | dao_phu_dinh_ten_entity | ten_entity: Cố tình không kê khai hoặc kê khai không đầy đủ | ten_entity: Kê khai thuế đầy đủ, trung thực |
| 8 | doi_nghia | dao_phu_dinh_ten_entity | ten_entity: Cản trở công chức quản lý thuế thi hành công vụ | ten_entity: Không cản trở công chức thuế thi hành công vụ |
| 10 | sua_nho | — | ten_entity: Thực hiện đăng ký thuế cùng với việc đăng ký doanh nghiệp, đăng ký hợp tác xã, đăng ký liên hiệp hợp tác xã, đăng ký tổ hợp tác, đăng ký hộ kinh doanh, đăng ký hoạt động, kinh doanh theo cơ chế một cửa liên thông | ten_entity: Đăng ký thuế theo cơ chế một cửa liên thông |
| 27 | doi_nghia | — | ten_entity: Đáp ứng điều kiện kỹ thuật, bảo đảm an toàn, bảo mật dữ liệu | ten_entity: Bảo đảm an toàn, bảo mật dữ liệu điện tử |

## Thời gian duyệt (giây / entity, khoảng của lần quyết định cuối)

| Nhóm | n | Trung vị | p90 |
|---|---|---|---|
| Không sửa (y_nguyen) | 22 | 6.4 | 46.3 |
| Bị sửa (sua_nho + doi_nghia + chua_gan_nhan) | 8 | 5.5 | 34.4 |
| — trong đó đổi nghĩa | 7 | 8.0 | 34.4 |
| Từ chối | 25 | 10.2 | 66.9 |

Entity đã xử lý nhưng không có khoảng đo (duyệt cả chunk, quyết định đầu phiên, hoặc khoảng > 10 phút): 15.

Kiểm định: Mann–Whitney U hai phía (khong_sua vs bi_sua) — U = 106, z = 0.82, p = 0.412. **Kết luận: không có khác biệt (p ≥ 0,05).**
Tiêu chí cố định trước: p < 0,05 hai phía → 'có khác biệt'; ngược lại → 'không có khác biệt'. Không suy diễn nhân quả trong cả hai trường hợp.
