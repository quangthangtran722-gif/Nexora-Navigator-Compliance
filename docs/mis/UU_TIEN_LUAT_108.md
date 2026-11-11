# Thứ tự ưu tiên trích xuất và duyệt — Luật Quản lý thuế 108/2025/QH15

> Lập 09/11/2026 theo quyết định Q-B (HE_THONG_DA_CHOT.md §2.2, nhật ký thay đổi #11).
> **Trạng thái: ĐỀ XUẤT (11/11) — chờ chủ repo + nhóm duyệt (N0), chưa `chot`.** Claude xếp cả 53 điều theo §3, căn cứ
> nguyên văn ở `research/van-ban/KHAO_SAT_DIEU.json` (script `scripts/mis/khao-sat-dieu.ts`). Sau khi duyệt: đổi `trang_thai`
> thành `chot`, commit **trước khi** chạy trích xuất (X1). Script X1 đọc khối JSON cuối file và từ chối chạy nếu trạng thái
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

Số điều toàn văn: **53 điều, 9 chương** (`research/van-ban/luat-108-2025-QH15.txt`, kiểm 10/11 — `research/van-ban/KIEM_TRA.json`).
Luật 108 là luật **thay thế** Luật Quản lý thuế 38/2019/QH14 (Điều 52 k3), không phải luật sửa đổi; 38/2019 hết hiệu lực từ 01/7/2026.

**Mốc hiệu lực riêng (Điều 52 k2):** Điều 13 và việc dùng hóa đơn điện tử của hộ kinh doanh, cá nhân kinh doanh ở Điều 26 có
hiệu lực từ **01/01/2026**; phần còn lại từ 01/7/2026. Khi duyệt entity của hai phần này, chuyên viên ghi
`ngay_co_hieu_luc = 2026-01-01` (cột có sẵn). Phần còn lại để trống = theo `van_ban.ngay_hieu_luc`.

### 5.1 Cách đọc tiêu chí khi xếp (đề xuất — N0 duyệt cùng danh sách)

- **TC2** chỉ tính khi **nội dung nghĩa vụ của người nộp thuế** phụ thuộc văn bản khác (dẫn chiếu, loại trừ, thay thế, giao
  Chính phủ / Bộ Tài chính quy định chi tiết chính nghĩa vụ đó → C5). Câu giao văn bản dưới luật quy định thủ tục **nội bộ của
  cơ quan thuế** không tính — nếu tính, gần như điều nào cũng thỏa TC2 và tiêu chí mất tác dụng phân loại.
- **TC3** theo 8 mã `slug_phong_ban`: thỏa khi điều giao việc cho phòng khác `ke_toan` — `nhan_su` (khấu trừ thuế người lao
  động), `ban_giam_doc` (giải thể, phá sản, xuất cảnh của người đại diện), `kinh_doanh` (lập hóa đơn khi bán hàng),
  `phap_che` (xử phạt, khiếu nại), `van_hanh` (hàng hóa xuất nhập khẩu, hải quan — không có mã riêng).
- **Bậc 4** gồm cả điều mà **người mang nghĩa vụ không phải doanh nghiệp**: cơ quan quản lý thuế, cơ quan nhà nước khác, tổ
  chức tín dụng, tổ chức dịch vụ làm thủ tục về thuế. Đây là cách đọc mở rộng câu "nhiệm vụ / quyền hạn của cơ quan quản lý
  thuế" ở §3 — **cần N0 xác nhận**; nếu không đồng ý, các điều đánh dấu ⁽ᵐ⁾ dưới đây xét lại theo TC1–TC3.
- Dấu hiệu từ khóa trong `KHAO_SAT_DIEU.json` chỉ để gom câu nguyên văn cho người đọc; bậc do người xếp, không do script.

### 5.2 Danh sách đề xuất (53 điều)

Cột "Entity ước" = số ký tự của điều × 6,25 entity / 1.000 ký tự (tỉ lệ đo trên 9 điều cũ: 70 entity / 11.193 ký tự). Số thật
có sau X1 (12/11), trước khi người duyệt bắt đầu.

| Thứ tự | Điều | Tên điều | Bậc | TC1 | TC2 | TC3 | Entity ước | Căn cứ nguyên văn (rút gọn) |
|---|---|---|---|---|---|---|---|---|
| 1 | 2 | Đối tượng áp dụng | 0 | ✓ | ✓ | — | 7 (thật: có sẵn) | Lát cắt (i). "Tổ chức, hộ gia đình, hộ kinh doanh, cá nhân…" — nhiều loại người nộp thuế |
| 2 | 3 | Phân nhóm người nộp thuế | 0 | ✓ | — | — | có sẵn | Lát cắt (i). Phân nhóm theo quy mô / loại |
| 3 | 8 | Các hành vi bị nghiêm cấm | 0 | — | — | — | có sẵn | Lát cắt (i). Cấm áp dụng như nhau cho mọi người nộp thuế |
| 4 | 10 | Đăng ký thuế | 0 | ✓ | ✓ | — | có sẵn | Lát cắt (i). Đăng ký thuế cùng đăng ký doanh nghiệp (LDN) |
| 5 | 11 | Mã số thuế | 0 | ✓ | ✓ | — | có sẵn | Lát cắt (i) |
| 6 | 27 | Chứng từ điện tử | 0 | — | ✓ | ✓ nhan_su | có sẵn | Lát cắt (i). Chứng từ khấu trừ thuế người lao động |
| 7 | 48 | Trường hợp bị cưỡng chế | 0 | ✓ | — | — | có sẵn | Lát cắt (i) |
| 8 | 52 | Điều khoản thi hành | 0 | ✓ | ✓ | — | có sẵn | Lát cắt (i). k2: Điều 13, 26 hiệu lực 01/01/2026; k3 bãi bỏ Luật 38/2019 |
| 9 | 53 | Điều khoản chuyển tiếp | 0 | — | ✓ | — | có sẵn | Lát cắt (i). k1, k3 dẫn chiếu Luật 38/2019 |
| 10 | 12 | Khai thuế; tính thuế; khấu trừ thuế | 1 | ✓ | ✓ | ✓ nhan_su | 38 | "Tổ chức, cá nhân thuộc trường hợp khấu trừ, nộp thay … phải thực hiện khấu trừ thuế"; "trường hợp bất khả kháng … được gia hạn" |
| 11 | 13 | Khai thuế … đối với hộ kinh doanh, cá nhân kinh doanh | 1 | ✓ | ✓ | — | 21 | "Trường hợp hộ kinh doanh, cá nhân kinh doanh tự xác định có mức doanh thu hằng năm…". Hiệu lực 01/01/2026 (Đ52 k2). Chỉ áp dụng hộ / cá nhân kinh doanh — DN dạng công ty: không áp dụng |
| 12 | 14 | Nộp thuế; gia hạn nộp thuế | 1 | ✓ | ✓ | ✓ van_hanh | 38 | "Đối với hàng hóa xuất khẩu, nhập khẩu … thời hạn nộp thuế thực hiện theo quy định của Luật Thuế xuất khẩu, thuế nhập khẩu" |
| 13 | 16 | Xử lý việc chậm nộp tiền thuế | 1 | ✓ | ✓ | — | 22 | "Người nộp thuế chậm nộp tiền thuế … so với thời hạn nộp, thời hạn gia hạn nộp quy định tại Điều 14" |
| 14 | 17 | Hoàn thành nghĩa vụ nộp thuế | 1 | ✓ | ✓ | ✓ ban_giam_doc | 50 | "trong trường hợp doanh nghiệp … giải thể được thực hiện theo quy định của pháp luật về doanh nghiệp"; "phải hoàn thành nghĩa vụ nộp thuế trước khi xuất cảnh" |
| 15 | 18 | Hoàn thuế | 1 | ✓ | ✓ | — | 17 | Các trường hợp được hoàn theo pháp luật về thuế |
| 16 | 19 | Miễn, giảm, không thu thuế | 1 | ✓ | ✓ | — | 15 | Trường hợp miễn, giảm theo pháp luật về thuế |
| 17 | 20 | Khoanh tiền thuế nợ | 1 | ✓ | ✓ | — | 15 | Trường hợp khoanh (giải thể, phá sản…) |
| 18 | 21 | Xóa tiền thuế nợ | 1 | ✓ | ✓ | — | 13 | Trường hợp xóa nợ |
| 19 | 25 | Ấn định thuế hàng hóa xuất khẩu, nhập khẩu | 1 | ✓ | ✓ | ✓ van_hanh | 15 | Chỉ DN có hàng hóa xuất nhập khẩu |
| 20 | 26 | Hóa đơn điện tử | 1 | ✓ | ✓ | ✓ kinh_doanh | 27 | "Tổ chức, hộ kinh doanh, cá nhân kinh doanh phải lập hóa đơn điện tử khi bán hàng hóa, cung cấp dịch vụ". Phần hộ / cá nhân kinh doanh hiệu lực 01/01/2026 |
| 21 | 37 | Quyền và nghĩa vụ của người nộp thuế | 1 | ✓ | ✓ | ✓ nhan_su | 46 | "được ủy quyền khai thay, nộp thuế thay theo quy định của pháp luật về thuế, quản lý thuế, hải quan"; "yêu cầu tổ chức khấu trừ cấp chứng từ khấu trừ" |
| 22 | 44 | Nguyên tắc xử phạt vi phạm hành chính về quản lý thuế | 1 | ✓ | ✓ | ✓ phap_che | 27 | "Phạt 10% … đối với hành vi quy định tại điểm a khoản 3 Điều 45"; "khai bổ sung trong thời hạn 60 ngày kể từ ngày thông quan" |
| 23 | 45 | Hành vi vi phạm trong lĩnh vực quản lý thuế | 1 | ✓ | ✓ | ✓ phap_che | 26 | "khai sai căn cứ tính thuế … sử dụng hóa đơn, chứng từ không hợp pháp" |
| 24 | 15 | Xử lý tiền thuế nộp thừa | 2 | ✓ | — | — | 13 | "Người nộp thuế có số tiền … nộp thừa được bù trừ". Dẫn chiếu Điều 18 là nội bộ, không tính TC2 |
| 25 | 22 | Kiểm tra thuế | 2 | ✓ | — | — | 54 | "hồ sơ thuộc diện kiểm tra sau hoàn thuế … trong thời hạn 05 năm"; giao dịch liên kết. **N0 xem:** chủ yếu là thủ tục của cơ quan thuế — có thể bậc 4 ⁽ᵐ⁾ |
| 26 | 24 | Ấn định thuế | 2 | ✓ | — | — | 13 | "Các trường hợp ấn định thuế: … Không xuất trình sổ kế toán, hóa đơn, chứng từ…" — hệ quả của vi phạm |
| 27 | 31 | Nguyên tắc thực hiện MAP, APA | 2 | ✓ | — | — | 10 | "doanh nghiệp có giao dịch liên kết" — dữ kiện T4, kết luận sẽ là `can_chuyen_mon` |
| — | 1, 4, 5, 6, 9 | Phạm vi; giải thích từ ngữ; nội dung, nguyên tắc quản lý thuế; xây dựng lực lượng | 4 | | | | — | Không đặt nghĩa vụ riêng. Đ4 là đích dẫn chiếu (S4) |
| — | 7 ⁽ᵐ⁾, 23 ⁽ᵐ⁾, 28–30, 32–36, 38, 39, 41–43, 47, 49 ⁽ᵐ⁾, 50 | Bảo mật thông tin; biện pháp khi có dấu hiệu trốn thuế; quốc tế; quản lý rủi ro, tuân thủ, hệ thống thông tin; nhiệm vụ cơ quan; khiếu nại, khởi kiện; thẩm quyền; biện pháp cưỡng chế | 4 | | | | — | Người mang nghĩa vụ là cơ quan quản lý thuế / cơ quan nhà nước. Đ41, 43 là **quyền** của người nộp thuế, không phải nghĩa vụ |
| — | 40 ⁽ᵐ⁾, 46 ⁽ᵐ⁾, 51 ⁽ᵐ⁾ | Tổ chức, cá nhân khác; tổ chức tín dụng; bổ sung Luật Kế toán (dịch vụ làm thủ tục thuế) | 4 | | | | — | Người mang nghĩa vụ là bên thứ ba (ngân hàng, người bảo lãnh, tổ chức dịch vụ thuế). Đ40 điểm e ("cung cấp thông tin … theo yêu cầu") áp dụng chung, không phân hóa |

Tổng: bậc 0 — 9 điều; bậc 1 — 14; bậc 2 — 4; bậc 3 — 0; bậc 4 — 26 (trong đó 6 điều ⁽ᵐ⁾ thuộc cách đọc mở rộng ở §5.1; Đ22 ở bậc 2 cũng có thể chuyển bậc 4).

### 5.3 Đường cắt MVP

Giờ duyệt cộng dồn theo thứ tự trên, định mức tạm 2,5 phút / entity (đo lại sáng 13/11):

| Duyệt đến | Entity mới (ước, cộng dồn) | Giờ công (cộng dồn, ngoài 2,9 giờ của bậc 0) |
|---|---|---|
| Đ14 (thứ tự 12) | 97 | 4,0 |
| Đ17 (thứ tự 14) | 169 | 7,0 |
| Đ19 (thứ tự 16) | 201 | 8,4 |
| Đ21 (thứ tự 18) | 229 | 9,5 |
| Đ26 (thứ tự 20) | 271 | 11,3 |
| Đ37 (thứ tự 21) | 317 | 13,2 |
| Hết bậc 1 — Đ45 (thứ tự 23) | 370 | 15,4 |
| Hết bậc 2 — Đ31 (thứ tự 27) | 460 | 19,2 |

**Đề xuất đường cắt: hết thứ tự 16 (Đ19) — khoảng 8,4 giờ công cho điều mới**, tức 7 điều mới + 9 điều bậc 0 = 16/53 điều
được duyệt. Phạm vi tuyên bố: cả 53 điều (nạp toàn văn, S1–S3); phạm vi thực hiện trong MVP: 16 điều đầu danh sách. Số chốt
tại mốc 11:00 ngày 13/11 theo định mức đo được (§6.1), không đổi thứ tự.

**Chênh lệch lớn so với ước lượng trước (14,3 giờ cho 44 điều):** con số cũ giả định mỗi điều mới 7,8 entity như 9 điều cũ.
Đo độ dài thật: 9 điều cũ trung bình ~1.240 ký tự / điều; các điều mới bậc 1–2 trung bình ~3.900 ký tự (Đ17 8.054, Đ22 8.564,
Đ37 7.352). Hết bậc 1 cần ~15 giờ công, không phải ~6. Với đường cắt tại Đ19, **Đ26 (hóa đơn điện tử) và Đ37 (quyền và nghĩa
vụ người nộp thuế) nằm ngoài MVP** — xem §5.4.

### 5.4 Câu hỏi cho chủ repo trước khi chốt: tiêu chí phụ trong bậc

§3 quy định trong cùng bậc xếp theo số điều tăng dần, không có tiêu chí phụ. Hệ quả: Đ13 (chỉ hộ / cá nhân kinh doanh), Đ20,
Đ21 (khoanh, xóa nợ — quyết định của cơ quan thuế theo hồ sơ) đứng trước Đ26, Đ37 chỉ vì số điều nhỏ hơn.

- **Phương án A — giữ §3 nguyên văn** (bảng trên). Ưu: quy tắc đã khóa từ 09/11, không có chỗ cho lựa chọn sau khi đã thấy
  văn bản. Nhược: hai điều sát nhất với nghĩa vụ hằng ngày của SME nằm ngoài đường cắt.
- **Phương án B — thêm một tiêu chí phụ cố định trong bậc 1:** điều đặt **nghĩa vụ trực tiếp cho người nộp thuế là tổ chức**
  xếp trước điều chỉ áp dụng cho hộ / cá nhân kinh doanh hoặc chỉ là quyết định của cơ quan thuế theo đề nghị. Thứ tự bậc 1
  thành: 12, 14, 16, 17, 25, 26, 37, 44, 45 | 13, 18, 19, 20, 21. Cắt ở ~8 giờ công → hết Đ26 (190 entity, 7,9 giờ).
  Ưu: khớp yêu cầu "xếp theo mức độ quan trọng với SME". Nhược: đổi quy tắc §3 sau khi đã đọc văn bản — phải ghi vào nhật ký
  thay đổi thiết kế, kèm lý do, và tiêu chí phụ phải là thuộc tính của văn bản (ai mang nghĩa vụ), không phải độ dễ duyệt.

Claude nghiêng về **B**, vì tiêu chí phụ là thuộc tính đọc được từ câu chữ (chủ thể của nghĩa vụ), không liên quan độ dễ hay số
entity. Quyết định thuộc về chủ repo và nhóm.

## 6. Ước lượng giờ duyệt của người

Số liệu nền (bản chụp 09/11, `research/baseline/`): 9 điều cũ → 70 entity, tức **7,8 entity / điều** (3,4 hành vi / điều).
Lượt duyệt cũ (đo từ `approvals`, 20/10/2026): 70 entity trong 18 phút, một người, không ghi chú. Theo cách đo ở
HE_THONG_DA_CHOT §14.4 (bỏ 14 lần duyệt cùng thời điểm do duyệt cả chunk, bỏ khoảng > 10 phút): 55 khoảng, trung vị 8,6 giây,
p90 51 giây. Đây là số đo trước, ghi lại để so sánh. Không dùng làm định mức vì quy trình mới có thêm
bước (chọn mã C0–C7, xác nhận phạm vi hoặc viết điều kiện máy đọc hoặc gắn cờ) mà lượt cũ không có. Tỉ lệ tất định câm 72%
(§13.1) có nguyên nhân đã truy tới dòng code (§13.2: chủ thể không điều kiện bị bỏ qua → áp dụng mọi doanh nghiệp); chưa có
bằng chứng tốc độ duyệt là nguyên nhân.

Định mức **tạm** để lập kế hoạch: **2,5 phút / entity** (đọc trích dẫn, chọn mã, xác nhận phạm vi hoặc viết điều kiện hoặc
gắn cờ, gán phòng ban). Cạnh LLM duyệt cùng entity nguồn, không tính thêm. Cạnh ngoại lệ thêm tay: 5 phút / cạnh (tạo) + duyệt
bởi người khác.

**Đo lại sáng 13/11 (Q-E):** khi duyệt lại 9 điều cũ, bấm giờ 20 entity đầu (ghi giờ bắt đầu, giờ kết thúc từng entity, người
duyệt). Đối chiếu với số đo tự động từ `approvals` (PLAN.md, việc NĐ). Lấy trung vị bấm giờ làm định mức mới → tính lại bảng
dưới và PLAN.md §4.1 → chủ repo quyết định Luật 108 duyệt tới bậc nào trước 14/11. Ghi kết quả vào §6.1.

| Phần | Số điều | Entity ước | Giờ duyệt |
|---|---|---|---|
| Bậc 0 (9 điều cũ, có sẵn đề xuất) | 9 | 70 (đếm thật) | 2,9 |
| Bậc 1 (đề xuất 11/11) | 14 | ~370 (ước theo độ dài) | ~15,4 |
| Bậc 2 | 4 | ~90 | ~3,8 |
| Bậc 4 (không trích xuất) | 26 | — | 0 |

Giờ duyệt = (số điều bậc 0–3) × 7,8 × định mức. Tính lại khi bảng §5 chốt và khi có số đo 13/11; cập nhật PLAN.md §4.1.

### 6.1 Số đo 13/11 và quyết định bậc

| Mục | Giá trị |
|---|---|
| Số entity bấm giờ | (điền 13/11) |
| Trung vị / p90 bấm giờ (phút / entity) | |
| Trung vị / p90 từ `approvals` cùng lượt | |
| Định mức mới | |
| Giờ công còn lại đến hết 14/11 | |
| Duyệt tới bậc / tới điều | (chủ repo quyết) |

## 7. Nhật ký sửa sau khi khóa

(trống)

## 8. Khối máy đọc cho X1

```json
{
  "van_ban": "108/2025/QH15",
  "trang_thai": "de_xuat",
  "so_dieu_toan_van": 53,
  "phuong_an": "A (§3 nguyên văn) — chờ chủ repo chọn A/B ở §5.4",
  "thu_tu": [
    {
      "dieu": 2,
      "bac": 0
    },
    {
      "dieu": 3,
      "bac": 0
    },
    {
      "dieu": 8,
      "bac": 0
    },
    {
      "dieu": 10,
      "bac": 0
    },
    {
      "dieu": 11,
      "bac": 0
    },
    {
      "dieu": 27,
      "bac": 0
    },
    {
      "dieu": 48,
      "bac": 0
    },
    {
      "dieu": 52,
      "bac": 0
    },
    {
      "dieu": 53,
      "bac": 0
    },
    {
      "dieu": 12,
      "bac": 1
    },
    {
      "dieu": 13,
      "bac": 1
    },
    {
      "dieu": 14,
      "bac": 1
    },
    {
      "dieu": 16,
      "bac": 1
    },
    {
      "dieu": 17,
      "bac": 1
    },
    {
      "dieu": 18,
      "bac": 1
    },
    {
      "dieu": 19,
      "bac": 1
    },
    {
      "dieu": 20,
      "bac": 1
    },
    {
      "dieu": 21,
      "bac": 1
    },
    {
      "dieu": 25,
      "bac": 1
    },
    {
      "dieu": 26,
      "bac": 1
    },
    {
      "dieu": 37,
      "bac": 1
    },
    {
      "dieu": 44,
      "bac": 1
    },
    {
      "dieu": 45,
      "bac": 1
    },
    {
      "dieu": 15,
      "bac": 2
    },
    {
      "dieu": 22,
      "bac": 2
    },
    {
      "dieu": 24,
      "bac": 2
    },
    {
      "dieu": 31,
      "bac": 2
    },
    {
      "dieu": 1,
      "bac": 4
    },
    {
      "dieu": 4,
      "bac": 4
    },
    {
      "dieu": 5,
      "bac": 4
    },
    {
      "dieu": 6,
      "bac": 4
    },
    {
      "dieu": 7,
      "bac": 4
    },
    {
      "dieu": 9,
      "bac": 4
    },
    {
      "dieu": 23,
      "bac": 4
    },
    {
      "dieu": 28,
      "bac": 4
    },
    {
      "dieu": 29,
      "bac": 4
    },
    {
      "dieu": 30,
      "bac": 4
    },
    {
      "dieu": 32,
      "bac": 4
    },
    {
      "dieu": 33,
      "bac": 4
    },
    {
      "dieu": 34,
      "bac": 4
    },
    {
      "dieu": 35,
      "bac": 4
    },
    {
      "dieu": 36,
      "bac": 4
    },
    {
      "dieu": 38,
      "bac": 4
    },
    {
      "dieu": 39,
      "bac": 4
    },
    {
      "dieu": 40,
      "bac": 4
    },
    {
      "dieu": 41,
      "bac": 4
    },
    {
      "dieu": 42,
      "bac": 4
    },
    {
      "dieu": 43,
      "bac": 4
    },
    {
      "dieu": 46,
      "bac": 4
    },
    {
      "dieu": 47,
      "bac": 4
    },
    {
      "dieu": 49,
      "bac": 4
    },
    {
      "dieu": 50,
      "bac": 4
    },
    {
      "dieu": 51,
      "bac": 4
    }
  ]
}
```
