# Trước / sau — cùng 70 đề xuất LLM, hai màn duyệt

Chạy: 2026-11-17T08:35:30.670Z. Khung: `research/bao-cao/KHUNG_TRUOC_SAU.md`.

Mọi kết luận dưới đây chỉ mô tả có / không có khác biệt giữa hai lượt; không suy ra nguyên nhân (xem giới hạn trong khung).

## M1 — Thời gian duyệt mỗi entity

- Trước: n=55, trung vị 8.6 giây, p90 50.6 giây
- Sau: n=66, trung vị 19.8 giây, p90 117.9 giây
- Mann–Whitney U hai phía: U = 1032, p = 0.000 → **có khác biệt (p < 0,05)** — trung vị lượt sau cao hơn

## M2 — Viết lại đề xuất khi duyệt (trên entity đã duyệt)

| | Trước | Sau |
|---|---|---|
| Đã duyệt | 45 | 34 |
| Bị sửa (mọi mức) | 9/45 (20.0%) | 0/34 (0.0%) |
| — viết lại đổi nghĩa | 8/45 (17.8%) | 0/34 (0.0%) |
| Từ chối (trên 70) | 25/70 (35.7%) | 36/70 (51.4%) |

- Fisher chính xác hai phía, bị sửa / không sửa: p = 0.009 → **có khác biệt (p < 0,05)**
- Fisher chính xác hai phía, đổi nghĩa / còn lại: p = 0.009 → **có khác biệt (p < 0,05)**

## M3 — 13 entity Điều 8 (hành vi bị nghiêm cấm)

| Đề xuất LLM | Trước | Sau | Sau duyệt (nếu sửa) |
|---|---|---|---|
| người nộp thuế | tu_choi | y_nguyen |  |
| Chống đối, trì hoãn, không cung cấp thông tin | doi_nghia | y_nguyen |  |
| Sử dụng mã số thuế của người khác trái quy định | doi_nghia | y_nguyen |  |
| Bán hàng không lập hóa đơn và sử dụng hóa đơn giả | doi_nghia | y_nguyen |  |
| Truy cập trái phép và phá hủy hệ thống thông tin | doi_nghia | y_nguyen |  |
| Phát tán thông tin sai lệch | doi_nghia | y_nguyen |  |
| công chức quản lý thuế | tu_choi | tu_choi |  |
| Lợi dụng chức vụ, quyền hạn để tiết lộ thông tin | tu_choi | tu_choi |  |
| Làm sai lệch kết quả kiểm tra | tu_choi | tu_choi |  |
| Gây phiền hà, sách nhiễu | tu_choi | tu_choi |  |
| Chiếm đoạt hoặc sử dụng trái phép tiền thuế | tu_choi | y_nguyen |  |
| Cố tình không kê khai hoặc kê khai không đầy đủ | doi_nghia | y_nguyen |  |
| Cản trở công chức quản lý thuế thi hành công vụ | doi_nghia | y_nguyen |  |

## Từ chối — từng entity giữa hai lượt (mô tả, không kiểm định)

| | Sau: duyệt | Sau: từ chối |
|---|---|---|
| **Trước: duyệt** | 29 | 16 |
| **Trước: từ chối** | 5 | 20 |

- Từ chối có ghi chú: trước 0/23 dòng từ chối (thêm 2 entity ở trạng thái từ chối mà không có dòng từ chối nào: Đ8 "Gây phiền hà, sách nhiễu", Đ10 "Quy định chi tiết khoản 1 và khoản 3 Điều này"); sau 34/36.
- Quy tắc từ chối lượt sau (nhóm mã) chốt giữa lượt, không có ở lượt trước (KHUNG §8).

### Trước duyệt → sau từ chối (16)

| Điều | Loại | Đề xuất LLM | Mã nhóm sau |
|---|---|---|---|
| Đ2 | chu_the | Cơ quan quản lý thuế | NN-CT |
| Đ2 | chu_the | Công chức quản lý thuế | NN-CT |
| Đ2 | chu_the | Chính phủ | NN-CT |
| Đ10 | chu_the | Bộ trưởng Bộ Tài chính | NN-CT |
| Đ10 | chu_the | Cơ quan thuế | NN-CT |
| Đ11 | chu_the | cơ quan thuế | TX |
| Đ11 | chu_the | Bộ trưởng Bộ Tài chính | NN-CT |
| Đ11 | chu_the | Chính phủ | NN-CT |
| Đ27 | chu_the | Bộ trưởng Bộ Tài chính | NN-CT |
| Đ27 | hanh_vi | Đăng ký sử dụng chứng từ điện tử | GQ |
| Đ27 | chu_the | Cơ quan quản lý thuế | NN-CT |
| Đ27 | hanh_vi | Đăng ký, quản lý, sử dụng chứng từ điện tử | GQ |
| Đ27 | chu_the | Chính phủ | NN-CT |
| Đ48 | chu_the | Cơ quan thuế | NN-CT |
| Đ48 | chu_the | Thủ trưởng cơ quan quản lý thuế | NN-CT |
| Đ52 | chu_the | Luật này | TX |

### Trước từ chối → sau duyệt (5)

| Điều | Loại | Đề xuất LLM | |
|---|---|---|---|
| Đ3 | doi_tuong | Người nộp thuế trong quản lý thuế |  |
| Đ8 | chu_the | người nộp thuế |  |
| Đ8 | hanh_vi | Chiếm đoạt hoặc sử dụng trái phép tiền thuế |  |
| Đ48 | hanh_vi | Nộp dần tiền thuế nợ |  |
| Đ52 | thoi_han | trước ngày 01 tháng 01 năm 2027 |  |

## M4 — Trong từng lượt: thời gian nhóm bị sửa vs không sửa

- truoc: không sửa n=22, trung vị 6.4 giây, p90 46.3 giây; bị sửa n=8, trung vị 5.5 giây, p90 34.4 giây → không có khác biệt (p ≥ 0,05)
- sau: không sửa n=32, trung vị 20.4 giây, p90 262.6 giây; bị sửa n=0 → chỉ mô tả

## M5 — Khoảng bị bỏ vì cùng thời điểm (duyệt cả chunk)

- Trước: 14/70 (20.0%) · Sau: 0/70 (0.0%)

## M6 — Phân bố mã C0–C7 (lượt sau; màn cũ không có mã)

- (trống): n=57, trung vị 19.4 giây, p90 92.8 giây
- C0: n=1, trung vị 77.3 giây, p90 77.3 giây
- C2: n=5, trung vị 42.0 giây, p90 528.1 giây
- C6: n=3, trung vị 19.8 giây, p90 262.6 giây