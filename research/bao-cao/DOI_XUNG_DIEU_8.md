# Đối xứng Điều 8 — cùng đề xuất máy, hai cách người duyệt xử lý

> Khung dựng 17/11/2026, trong lúc lượt duyệt mới đang chạy, **trước** khi người duyệt tới Điều 8. Số điền 17/11 sau khi
> lượt sau duyệt xong (`con_cho_duyet` = 0). Đây là phân tích **mô tả**, không thêm chỉ số hay kiểm định nào vào
> `KHUNG_TRUOC_SAU.md` §3 (ghi ở §8 của khung đó). Nguồn số: `research/sau/TRUOC_SAU.md` (M3), `research/sau/phan-loai-sau.md`.

## 1. Vì sao Điều 8

Điều 8 ("Các hành vi bị nghiêm cấm trong quản lý thuế") là nơi xuất phát phát hiện của bài
(`research/phat-hien/CAN_THIEP_KHONG_VET.md` §2). Ở lượt trước, 7 tên entity Điều 8 bị đổi từ hành vi bị cấm sang câu nghĩa
vụ, sửa thẳng trong bảng, không để vết.

## 2. Cái giống nhau và cái khác nhau — nói chính xác

| | Lượt trước (20/10, màn cũ, prod) | Lượt sau (17/11, U1a, MIS) |
|---|---|---|
| Đầu vào máy | 13 entity Điều 8 do LLM đề xuất (`extract-v2`, 20/10) | **Giống hệt** (cùng 13 đề xuất, cùng các cạnh) |
| Lỗi trong đề xuất | Cạnh "áp dụng cho" gán vai; Điều 8 không nêu người làm cho từng câu, LLM tự gán | **Giống hệt** — lỗi vai đã có từ lượt trước vì đầu vào giống nhau |
| Người duyệt làm gì với văn bản | Sửa tên trong bảng: cấm → nghĩa vụ (7 entity), ngoài màn duyệt, không vết; từ chối 6 | Không sửa tên nào: duyệt y nguyên 9, từ chối 4 |
| Nút Từ chối | **Có** (hàm `approve_entity` cũ nhận `p_ghi_chu`) | Có, cùng tham số ghi chú |
| Lý do từ chối được ghi | **0** dòng từ chối có ghi chú (cả 70 entity: 0/23 dòng; thêm 2 entity ở trạng thái từ chối không có dòng từ chối nào) | 34/36 lần từ chối có ghi chú; quy ước mã nhóm `[NN-CT]` `[NN-NV]` `[GQ]` `[DV]` `[TX]` (chốt 17/11) |
| Vai của cạnh | Không có quy tắc | Người duyệt tự đọc nguyên văn, tự quyết vai (quyết định 17/11); lý do ghi ở §4 |

Phải nói rõ ba điều để câu chuyện không bị kể quá:

1. **Lỗi máy là cùng một lỗi, ở cả hai lượt.** Lượt trước không "sạch hơn": đề xuất vai sai đã nằm đó, nhưng người duyệt
   lượt trước phản ứng bằng cách viết lại tên (một phép diễn giải), không phải bằng xử lý vai.
2. **Cơ chế Từ chối kèm ghi chú có ở cả hai lượt; lượt trước không dùng ô ghi chú lần nào.** Cái mới ở lượt sau không phải
   nút Từ chối, mà là (a) việc ghi lý do, theo một quy ước mã nhóm gõ tay — hệ **không ép** (0/36 ghi chú có tiền tố mã đúng
   dạng, `CAN_THIEP_KHONG_VET.md` §6) — và (b) quyết định của người duyệt không sửa tên.
3. **Người duyệt lượt sau biết giả thuyết** và đã được báo về các cạnh không nguyên văn trước khi tới Điều 8
   (`KHUNG_TRUOC_SAU.md` §7 mục 2, §8). Khác biệt không quy được cho màn hình.

## 3. Bảng hai lượt (điền 17/11, sau khi lượt sau duyệt xong)

| Điều khoản | Entity (đề xuất gốc) | Lượt trước | Lượt sau | Mã nhóm sau | Cạnh "áp dụng cho" (đi theo entity) → đích |
|---|---|---|---|---|---|
| k1 | người nộp thuế (chủ thể) | từ chối | duyệt, C2 (rỗng nghĩa) | | — |
| k1 | công chức quản lý thuế (chủ thể) | từ chối | từ chối | NN-CT | — |
| k1 | Chiếm đoạt hoặc sử dụng trái phép tiền thuế | từ chối | duyệt, phạm vi chung | | → công chức quản lý thuế (đích bị từ chối) |
| k1 | Lợi dụng chức vụ, quyền hạn để tiết lộ thông tin | từ chối | từ chối | NN-NV (ghi câu NN-CT) | |
| k1 | Làm sai lệch kết quả kiểm tra | từ chối | từ chối | NN-NV | |
| k1 | Gây phiền hà, sách nhiễu | từ chối (không có dòng từ chối; dòng duyệt duy nhất là `da_duyet`) | từ chối | NN-NV | |
| k2 | Cố tình không kê khai hoặc kê khai không đầy đủ | đổi nghĩa → "Kê khai thuế đầy đủ, trung thực" | duyệt y nguyên, chung | | → người nộp thuế |
| k2 | Cản trở công chức quản lý thuế thi hành công vụ | đổi nghĩa → "Không cản trở công chức thuế thi hành công vụ" | duyệt y nguyên, chung | | → công chức quản lý thuế (đích bị từ chối) |
| k2 | Chống đối, trì hoãn, không cung cấp thông tin | đổi nghĩa → "Cung cấp thông tin đầy đủ, đúng hạn cho cơ quan thuế" | duyệt y nguyên, chung | | → công chức quản lý thuế (đích bị từ chối) |
| k3 | Sử dụng mã số thuế của người khác trái quy định | đổi nghĩa → "Không sử dụng mã số thuế của người khác" | duyệt y nguyên, chung | | → người nộp thuế |
| k4 | Bán hàng không lập hóa đơn và sử dụng hóa đơn giả | đổi nghĩa → "Lập hóa đơn đầy đủ khi bán hàng" | duyệt y nguyên, chung | | → người nộp thuế |
| k5 | Truy cập trái phép và phá hủy hệ thống thông tin | đổi nghĩa → "Không truy cập trái phép hệ thống thông tin thuế" | duyệt y nguyên, chung | | → công chức quản lý thuế (đích bị từ chối) |
| k5 | Phát tán thông tin sai lệch | đổi nghĩa → "Không phát tán thông tin thuế sai lệch" | duyệt y nguyên, chung | | → công chức quản lý thuế (đích bị từ chối) |

| | Lượt trước | Lượt sau |
|---|---|---|
| Tên bị viết lại (đổi nghĩa) | 7 | 0 |
| Từ chối | 6 | 4 |
| Từ chối có lý do ghi | 0/6 | 4/4 |
| Từ chối có lý do đúng nhóm mã | — (chưa có quy ước) | 3/4 (1 sai nhóm); 0/4 có tiền tố `[mã]` |
| Duyệt y nguyên | 0 | 9 |

**Cạnh đi theo entity — hệ quả trong thư viện lượt sau.** 5 nghĩa vụ Điều 8 đã duyệt (Chiếm đoạt, Cản trở, Chống đối, Truy cập,
Phát tán) có cạnh "áp dụng cho" **đã duyệt** trỏ vào chủ thể "công chức quản lý thuế" **đã bị từ chối** (migration 008: cạnh
LLM duyệt cùng entity nguồn; từ chối entity đích không đụng tới cạnh). Cùng lúc, 5 nghĩa vụ này mang phạm vi `chung` do người
duyệt xác nhận. Thư viện vì vậy chứa hai thông tin trái nhau về cùng một nghĩa vụ, và màn duyệt không có đường sửa cạnh
(`CAN_THIEP_KHONG_VET.md` §5).

## 4. Quyết định vai của người duyệt ở Điều 8 (ghi khi người duyệt quyết, kèm lý do)

Người duyệt tự đọc nguyên văn và tự quyết; không dùng cách đọc của trợ lý (trợ lý đã nêu một cách đọc ngày 17/11 và tự
khai là suy đoán). Bốn cạnh văn bản không nêu người làm (Đ8 k1 "Chiếm đoạt…", Đ8 k5 ×2, Đ27 k2a) ghi cùng ở đây.

| Entity | Cạnh LLM | Quyết định của người duyệt | Lý do |
|---|---|---|---|
| Đ8 k1 "Chiếm đoạt hoặc sử dụng trái phép tiền thuế" | áp dụng cho → công chức quản lý thuế | **Duyệt**, phạm vi chung (17/11) | **Ca có hai cách đọc.** Theo mạch văn khoản 1, chữ "lợi dụng" nối tiếp "lợi dụng chức vụ, quyền hạn" ở câu trước, tức sai phạm của công chức; đọc tách câu thì ai cũng có thể chiếm đoạt tiền thuế. Trợ lý nghiêng về từ chối; người duyệt quyết duyệt. **Đây là quyết định của người duyệt trong một ca nhập nhằng, không phải sơ suất.** Ghi kèm: cạnh LLM trỏ "công chức" được duyệt theo entity, tức thư viện vẫn mang cách đọc người duyệt không chọn (§3) |
| Đ8 k5 "Truy cập trái phép và phá hủy hệ thống thông tin" | → công chức quản lý thuế | Duyệt, phạm vi chung (DB) | Phép thử người duyệt dùng cho cả Điều 8: "một công ty có thể làm việc này không?". Việc này doanh nghiệp làm được, không đòi chức vụ hay quyền hạn trong cơ quan thuế, nên là điều cấm áp dụng cho doanh nghiệp. Phạm vi chung vì văn bản không kèm điều kiện nào (người duyệt nêu 18/11) |
| Đ8 k5 "Phát tán thông tin sai lệch" | → công chức quản lý thuế | Duyệt, phạm vi chung (DB) | Cùng phép thử và cùng lý do như dòng trên |
| Đ27 k2a "Đăng ký, quản lý, sử dụng chứng từ điện tử" | → Cơ quan quản lý thuế | Từ chối — **nhầm**, ngoài kế hoạch (ghi câu GQ; entity trong kế hoạch là Đ27 k5) | Người duyệt xác nhận là nhầm. Không hoàn tác được (`CAN_THIEP_KHONG_VET.md` §6) |

**Hệ quả đã biết của quyết định ở "Chiếm đoạt" — ghi thật, không phải lỗi.** Sau quyết định duyệt, thư viện chứa **đồng
thời** hai thông tin về cùng một nghĩa vụ: phạm vi `chung` (người duyệt xác nhận, tức áp dụng cho mọi doanh nghiệp) và một
cạnh **đã duyệt** "áp dụng cho → công chức quản lý thuế" (cạnh LLM, duyệt theo entity nguồn; đích đã bị từ chối). Tức thư viện
mang cả cách đọc người duyệt **đã không chọn**. Không có đường sửa trên bản dựng hiện tại: cạnh đã khóa, U1a không sửa cạnh
(`CAN_THIEP_KHONG_VET.md` §5). Đây là hệ quả đã biết khi quyết định, không phải sơ suất. Cùng tình trạng có ở 4 nghĩa vụ Điều 8
khác (Cản trở, Chống đối, Truy cập, Phát tán), nhưng ở 4 nghĩa vụ đó không có cách đọc thứ hai được cân nhắc.

## 5. Câu được phép viết trong báo cáo

"Với cùng 13 đề xuất của LLM cho Điều 8, lượt duyệt trước viết lại 7 tên ngoài màn duyệt, không để vết, và từ chối 6 không ghi
lý do; lượt duyệt sau không viết lại tên nào, duyệt y nguyên 9 và từ chối 4 có ghi lý do. Cả hai lượt đều có nút Từ chối kèm
ghi chú; lượt trước không dùng ô ghi chú, lượt sau thêm quy ước mã nhóm cho lý do. Người duyệt lượt sau biết giả thuyết. Thiết
kế không cho phép quy nguyên nhân."

Không viết: "màn mới khiến người duyệt từ chối thay vì sửa", "cơ chế mới ngăn diễn giải".

## 6. Vì sao lượt trước viết lại — cách đọc khớp dữ liệu hơn (viết lại 18/11)

> Đây là **lập luận**, không phải số đo. Không phỏng vấn người duyệt lượt trước. Mỗi vế dưới đây ghi bằng chứng khớp và
> không khớp. Bản 17/11 của mục này giải thích bằng "mô hình nghĩa vụ = việc cần làm không chứa nổi hành vi bị cấm"; giả
> thuyết đó **bị dữ liệu bác một phần** và đã bỏ (lý do ở vế 1).

**Vế 1 — động cơ không phải "biến thành việc giao được".** Nếu người duyệt lượt trước viết lại để có việc giao phòng ban,
cả 7 tên phải thành câu khẳng định làm được. Dữ liệu: 3/7 thành việc làm được ("Kê khai thuế đầy đủ, trung thực", "Cung cấp
thông tin đầy đủ, đúng hạn cho cơ quan thuế", "Lập hóa đơn đầy đủ khi bán hàng"); 4/7 thành câu "Không …", vẫn là điều cấm,
không giao như việc được. **Không khớp ở 4/7** → bỏ giả thuyết này.

**Vế 2 — động cơ là "làm thành thứ liên quan tới khách hàng".** Khách hàng ở đây là doanh nghiệp, tức người nộp thuế.
- *Khớp:* cả 7/7 tên viết lại đều thành câu nói với người nộp thuế (phải làm / không được làm), kể cả 4 câu "Không …".
- *Khớp:* ranh giới giữ / bỏ của lượt trước trùng ranh giới khoản. 6/6 từ chối đều ở **khoản 1** (gồm "Gây phiền hà", từ chối
  ngoài nhật ký, `CAN_THIEP_KHONG_VET.md` §0), khoản mà phần lớn hành vi gắn với chức vụ, quyền hạn của công chức quản lý thuế. 7/7 viết lại đều ở **khoản 2–5**, những hành vi doanh nghiệp làm được. Tức những gì không dính tới khách
  hàng thì bỏ; những gì dính tới thì giữ và nói lại với khách hàng.
- *Không khớp:* 1/6 từ chối là chủ thể "người nộp thuế" (khoản 1). Theo vế 2 thì đây là thứ liên quan nhất tới khách hàng,
  nhưng lượt trước vẫn bỏ. Dữ liệu không cho biết vì sao.
- *Không kiểm được:* vì sao phải đổi cả câu chữ (sang dạng chỉ thị) thay vì giữ nguyên văn hành vi bị cấm. Vế 2 giải thích
  việc chọn giữ cái gì; nó không bắt buộc phải viết lại.

**Vế 3 — lượt sau cùng một áp lực, khác công cụ: từ chối thay vì viết lại.** Lượt sau cũng lọc entity về phía doanh nghiệp,
nhưng bằng **từ chối**.
- *Khớp:* 25/36 lần từ chối là chủ thể hoặc nghĩa vụ của cơ quan nhà nước (NN-CT 16, NN-NV 9; `phan-loai-sau.md`). Ở Điều 8,
  4/4 từ chối đều ở khoản 1, cùng ranh giới khoản với lượt trước. 0 tên bị viết lại.
- *Khác lượt trước ở hai ca:* "Chiếm đoạt" và chủ thể "người nộp thuế" (đều khoản 1) được duyệt, vì phép thử của lượt sau là
  "một công ty có thể làm việc này không?" (§4), hẹp hơn "thuộc khoản nào".
- *Hạn chế của vế này:* người duyệt lượt sau biết giả thuyết và có quy tắc từ chối viết sẵn (`KHUNG_TRUOC_SAU.md` §8). Việc
  hai lượt cùng lọc về phía doanh nghiệp vì vậy không chứng minh hai lượt chịu cùng một áp lực. Nó chỉ không mâu thuẫn với điều
  đó.

**Hệ quả còn lại sau cả hai cách.** Lượt sau giữ nguyên văn, nên 9 entity Điều 8 đã duyệt, trong đó 8 hành vi bị cấm, vào thư
viện ở dạng `hanh_vi`, phạm vi `chung`. Bước đối chiếu sẽ ra "áp dụng" cho mọi doanh nghiệp, và bước soạn việc sẽ trình bày
chúng như những nghĩa vụ khác. Lược đồ không có trường nào phân biệt điều cấm với điều buộc (đã kiểm migration và schema trích
xuất 17/11). Câu hỏi "doanh nghiệp có liên quan không" đã được trả lời ở bước duyệt. Câu hỏi "trình bày một điều cấm thế nào"
thì chưa có chỗ nào trả lời.

**Đề xuất (ngoài phạm vi MVP, chỉ nêu).** Sửa ở **tầng trình bày**, không sửa văn bản: hiển thị "hành vi bị cấm áp dụng cho
doanh nghiệp" tách khỏi việc cần làm. Điều kiện cần: entity mang thuộc tính cấm / buộc. Tên entity giữ nguyên văn.
