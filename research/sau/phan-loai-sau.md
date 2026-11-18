# Lượt sau — điều kiện rỗng nghĩa, từ chối theo mã nhóm, Điều 8

Chạy: 2026-11-18T02:43:35.233Z. 70 entity; đã duyệt 34; từ chối 36; còn chờ 0.


## Điều kiện rỗng nghĩa (PHAM_VI_VA_PHUONG_PHAP §2.6)

- Entity phải gán mã (chủ thể / điều kiện / ngưỡng): 33
- Đã duyệt, có điều kiện máy đọc (C1–C3): 5
- Trong đó rỗng nghĩa: **5**

| Điều khoản | Entity | Mã | Điều kiện | Rỗng nghĩa |
|---|---|---|---|---|
| Điều 8, khoản 1 | người nộp thuế | C2 | `{"gia_tri":["doanh_nghiep","ho_kinh_doanh","ca_nhan_kinh_doanh"],"toan_tu":"in","thuoc_tinh":"loai_hinh_kinh_doanh"}` | có |
| Điều 10, khoản 2 | Doanh nghiệp, hợp tác xã, liên hiệp hợp tác xã, tổ hợp tác, đơn vị phụ thuộc, tổ chức khác, hộ kinh doanh, cá nhân kinh doanh | C2 | `{"gia_tri":["doanh_nghiep","ho_kinh_doanh","ca_nhan_kinh_doanh"],"toan_tu":"in","thuoc_tinh":"loai_hinh_kinh_doanh"}` | có |
| Điều 11, khoản 1 | cá nhân, hộ gia đình, hộ kinh doanh, cá nhân kinh doanh | C2 | `{"gia_tri":["doanh_nghiep","ho_kinh_doanh","ca_nhan_kinh_doanh"],"toan_tu":"in","thuoc_tinh":"loai_hinh_kinh_doanh"}` | có |
| Điều 11, khoản 2 | doanh nghiệp, hợp tác xã, liên hiệp hợp tác xã, tổ hợp tác, đơn vị phụ thuộc, tổ chức khác | C2 | `{"gia_tri":["doanh_nghiep","ca_nhan_kinh_doanh","ho_kinh_doanh"],"toan_tu":"in","thuoc_tinh":"loai_hinh_kinh_doanh"}` | có |
| Điều 48, khoản 1 | Người nộp thuế | C2 | `{"gia_tri":["doanh_nghiep","ho_kinh_doanh","ca_nhan_kinh_doanh"],"toan_tu":"in","thuoc_tinh":"loai_hinh_kinh_doanh"}` | có |

## Từ chối theo mã nhóm (quy ước gõ tay đầu ghi chú, hệ không ép)

| Mã | Số | Theo loại entity |
|---|---|---|
| NN-CT | 16 | chu_the 16 |
| NN-NV | 9 | hanh_vi 9 |
| GQ | 4 | hanh_vi 4 |
| DV | 5 | dieu_kien 5 |
| TX | 2 | chu_the 2 |
| (không theo mã) | 0 |  |
| (không ghi) | 0 |  |

Nhóm đếm theo bảng ngoại lệ `NGOAI_LE_MA` khi có (ghi chú đã khóa, không sửa được); nhóm ghi thật ở dưới.

Độ tin cậy quy ước gõ tay: 36 từ chối; có tiền tố [mã] 0; sai nhóm 2; không ghi chú 2.

| Điều khoản | Entity | Nhóm ghi | Nhóm đúng | Loại sai | Nguồn |
|---|---|---|---|---|---|
| Điều 3, khoản 1 | Thực hiện phân nhóm người nộp thuế | NN-CT | NN-NV | sai_nhom | người duyệt tự báo 17/11 (Đ3 Thực hiện phân nhóm người nộp thuế) |
| Điều 8, khoản 1 | Lợi dụng chức vụ, quyền hạn để tiết lộ thông tin | NN-CT | NN-NV | sai_nhom | người duyệt tự báo 17/11 (Đ8 k1 Lợi dụng chức vụ…) |
| Điều 52, khoản 1 | Luật này | (không ghi) | TX | khong_ghi | kế hoạch người duyệt chốt 17/11 (Đ52 k1 Luật này) |
| Điều 52, khoản 4 | áp dụng toàn bộ các hình thức giao dịch điện tử | (không ghi) | GQ | khong_ghi | kế hoạch người duyệt chốt 17/11 (Đ52 k4 áp dụng toàn bộ…) |

## Điều 8 — lượt sau (13 entity)

| Điều khoản | Loại | Entity | Quyết định | Mã nhóm | Ghi chú |
|---|---|---|---|---|---|
| Điều 8, khoản 1 | chu_the | người nộp thuế | da_duyet |  |  |
| Điều 8, khoản 1 | hanh_vi | Chiếm đoạt hoặc sử dụng trái phép tiền thuế | da_duyet |  |  |
| Điều 8, khoản 1 | chu_the | công chức quản lý thuế | tu_choi | NN-CT | Chủ thể là cơ quan nhà nước hoặc công chức, không thuộc nhóm đối tượng hệ thống phục vụ. Không trường hồ sơ nào biểu đạt được chủ thể này. |
| Điều 8, khoản 1 | hanh_vi | Lợi dụng chức vụ, quyền hạn để tiết lộ thông tin | tu_choi | NN-NV | Chủ thể là cơ quan nhà nước hoặc công chức, không thuộc nhóm đối tượng hệ thống phục vụ. Không trường hồ sơ nào biểu đạt được chủ thể này. |
| Điều 8, khoản 1 | hanh_vi | Làm sai lệch kết quả kiểm tra | tu_choi | NN-NV | Nghĩa vụ do cơ quan nhà nước hoặc công chức mang, không phải nghĩa vụ của doanh nghiệp. Nếu duyệt, với bước đối chiếu hiện tại nghĩa vụ này sẽ áp dụng cho mọi doanh nghiệp. |
| Điều 8, khoản 1 | hanh_vi | Gây phiền hà, sách nhiễu | tu_choi | NN-NV | Nghĩa vụ do cơ quan nhà nước hoặc công chức mang, không phải nghĩa vụ của doanh nghiệp. Nếu duyệt, với bước đối chiếu hiện tại nghĩa vụ này sẽ áp dụng cho mọi doanh nghiệp. |
| Điều 8, khoản 2 | hanh_vi | Cố tình không kê khai hoặc kê khai không đầy đủ | da_duyet |  |  |
| Điều 8, khoản 2 | hanh_vi | Cản trở công chức quản lý thuế thi hành công vụ | da_duyet |  |  |
| Điều 8, khoản 2 | hanh_vi | Chống đối, trì hoãn, không cung cấp thông tin | da_duyet |  |  |
| Điều 8, khoản 3 | hanh_vi | Sử dụng mã số thuế của người khác trái quy định | da_duyet |  |  |
| Điều 8, khoản 4 | hanh_vi | Bán hàng không lập hóa đơn và sử dụng hóa đơn giả | da_duyet |  |  |
| Điều 8, khoản 5 | hanh_vi | Phát tán thông tin sai lệch | da_duyet |  |  |
| Điều 8, khoản 5 | hanh_vi | Truy cập trái phép và phá hủy hệ thống thông tin | da_duyet |  |  |
