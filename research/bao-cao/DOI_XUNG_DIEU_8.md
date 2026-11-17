# Đối xứng Điều 8 — cùng đề xuất máy, hai cách người duyệt xử lý

> Khung dựng 17/11/2026, trong lúc lượt duyệt mới đang chạy, **trước** khi người duyệt tới Điều 8. Số điền sau khi duyệt
> xong. Đây là phân tích **mô tả**, không thêm chỉ số hay kiểm định nào vào `KHUNG_TRUOC_SAU.md` §3 (ghi ở §8 của khung đó).
> Điều kiện làm mù: không đặt cạnh nhau quyết định từng entity của hai lượt cho tới khi `con_cho_duyet` = 0.

## 1. Vì sao Điều 8

Điều 8 ("Các hành vi bị nghiêm cấm trong quản lý thuế") là nơi xuất phát phát hiện của bài
(`research/phat-hien/CAN_THIEP_KHONG_VET.md` §2). Ở lượt trước, 7 tên entity Điều 8 bị đổi từ hành vi bị cấm sang câu nghĩa
vụ, sửa thẳng trong bảng, không để vết.

## 2. Cái giống nhau và cái khác nhau — nói chính xác

| | Lượt trước (20/10, màn cũ, prod) | Lượt sau (17/11, U1a, MIS) |
|---|---|---|
| Đầu vào máy | 13 entity Điều 8 do LLM đề xuất (`extract-v2`, 20/10) | **Giống hệt** (cùng 13 đề xuất, cùng các cạnh) |
| Lỗi trong đề xuất | Cạnh "áp dụng cho" gán vai; Điều 8 không nêu người làm cho từng câu, LLM tự gán | **Giống hệt** — lỗi vai đã có từ lượt trước vì đầu vào giống nhau |
| Người duyệt làm gì với văn bản | Sửa tên trong bảng: cấm → nghĩa vụ (7 entity), ngoài màn duyệt, không vết | _điền sau_ |
| Nút Từ chối | **Có** (hàm `approve_entity` cũ nhận `p_ghi_chu`) | Có, cùng tham số ghi chú |
| Lý do từ chối | Ô ghi chú tự do | Ô ghi chú tự do + **quy ước** mã nhóm `[NN-CT]` `[NN-NV]` `[GQ]` `[DV]` `[TX]` (chốt 17/11) |
| Vai của cạnh | Không có quy tắc | Người duyệt tự đọc nguyên văn, tự quyết vai (quyết định 17/11); lý do ghi ở §4 |

Phải nói rõ ba điều để câu chuyện không bị kể quá:

1. **Lỗi máy là cùng một lỗi, ở cả hai lượt.** Lượt trước không "sạch hơn": đề xuất vai sai đã nằm đó, nhưng người duyệt
   lượt trước phản ứng bằng cách viết lại tên (một phép diễn giải), không phải bằng xử lý vai.
2. **Cơ chế Từ chối có ở cả hai lượt.** Cái mới ở lượt sau không phải nút Từ chối, mà là (a) quy ước mã nhóm cho lý do —
   một quy ước gõ tay, hệ **không ép** — và (b) quyết định của người duyệt không sửa tên.
3. **Người duyệt lượt sau biết giả thuyết** và đã được báo về các cạnh không nguyên văn trước khi tới Điều 8
   (`KHUNG_TRUOC_SAU.md` §7 mục 2, §8). Khác biệt nếu có không quy được cho màn hình.

## 3. Bảng điền sau khi duyệt xong

Nguồn lượt sau: `research/sau/phan-loai-sau.md` (mục Điều 8). Nguồn lượt trước: `research/sau/so-sanh-de-xuat-truoc.md`. Chỉ
ghép hai cột sau khi `con_cho_duyet` = 0.

| Điều khoản | Entity (đề xuất gốc) | Lượt trước: lớp (y nguyên / đổi nghĩa / từ chối) | Lượt sau: quyết định | Lượt sau: mã nhóm | Lượt sau: lý do vai |
|---|---|---|---|---|---|
| _13 dòng — điền sau_ | | | | | |

Tổng hợp điền sau:

| | Lượt trước | Lượt sau |
|---|---|---|
| Tên bị viết lại (đổi nghĩa) | | |
| Từ chối | | |
| Từ chối có lý do ghi | | |
| Từ chối có lý do theo mã nhóm | — (chưa có quy ước) | |
| Duyệt y nguyên | | |

## 4. Quyết định vai của người duyệt ở Điều 8 (ghi khi người duyệt quyết, kèm lý do)

Người duyệt tự đọc nguyên văn và tự quyết; không dùng cách đọc của trợ lý (trợ lý đã nêu một cách đọc ngày 17/11 và tự
khai là suy đoán). Bốn cạnh văn bản không nêu người làm (Đ8 k1 "Chiếm đoạt…", Đ8 k5 ×2, Đ27 k2a) ghi cùng ở đây.

| Entity | Cạnh LLM | Quyết định của người duyệt | Lý do |
|---|---|---|---|
| _điền khi người duyệt quyết_ | | | |

## 5. Câu được phép viết trong báo cáo

"Với cùng 13 đề xuất của LLM cho Điều 8, lượt duyệt trước viết lại [n] tên ngoài màn duyệt, không để vết; lượt duyệt sau
[mô tả]. Cả hai lượt đều có nút Từ chối kèm ghi chú; lượt sau thêm quy ước mã nhóm cho lý do. Người duyệt lượt sau biết
giả thuyết. Thiết kế không cho phép quy nguyên nhân."

Không viết: "màn mới khiến người duyệt từ chối thay vì sửa", "cơ chế mới ngăn diễn giải".
