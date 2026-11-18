# So đề xuất gốc LLM ↔ bản đã duyệt — màn duyệt mới U1a (MIS)

Chạy: 2026-11-18T02:43:33.616Z. 70 entity Luật 108, 9 điều cũ. Quy tắc phân loại: `scripts/research/do-duyet-lib.mjs` (phanLoai).

| Lớp | Số entity |
|---|---|
| y_nguyen | 34 |
| sua_nho | 0 |
| doi_nghia | 0 |
| chua_gan_nhan | 0 |
| tu_choi | 36 |
| chua_duyet | 0 |



## Theo điều

| Điều | y_nguyen | sua_nho | doi_nghia | chua_gan_nhan | tu_choi | chua_duyet |
|---|---|---|---|---|---|---|
| 2 | 2 | 0 | 0 | 0 | 3 | 0 |
| 3 | 1 | 0 | 0 | 0 | 2 | 0 |
| 8 | 9 | 0 | 0 | 0 | 4 | 0 |
| 10 | 9 | 0 | 0 | 0 | 3 | 0 |
| 11 | 2 | 0 | 0 | 0 | 3 | 0 |
| 27 | 6 | 0 | 0 | 0 | 5 | 0 |
| 48 | 2 | 0 | 0 | 0 | 11 | 0 |
| 52 | 3 | 0 | 0 | 0 | 5 | 0 |

## Entity bị sửa

| Điều | Lớp | Lý do máy | Gốc (LLM) | Sau duyệt |
|---|---|---|---|---|

## Thời gian duyệt (giây / entity, khoảng của lần quyết định cuối)

| Nhóm | n | Trung vị | p90 |
|---|---|---|---|
| Không sửa (y_nguyen) | 32 | 20.4 | 262.6 |
| Bị sửa (sua_nho + doi_nghia + chua_gan_nhan) | 0 | — | — |
| — trong đó đổi nghĩa | 0 | — | — |
| Từ chối | 34 | 19.4 | 50.0 |

Entity đã xử lý nhưng không có khoảng đo (duyệt cả chunk, quyết định đầu phiên, hoặc khoảng > 10 phút): 4.

Kiểm định: không kiểm định — mỗi nhóm cần ≥ 5 khoảng đo được (khong_sua 32, bi_sua 0). **Kết luận: chỉ mô tả.**
Tiêu chí cố định trước: p < 0,05 hai phía → 'có khác biệt'; ngược lại → 'không có khác biệt'. Không suy diễn nhân quả trong cả hai trường hợp.
