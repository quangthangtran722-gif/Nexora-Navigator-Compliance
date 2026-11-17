# Khung phân tích trước / sau — hai màn duyệt, cùng 70 đề xuất LLM

> Viết 16/11/2026, **trước** lượt duyệt trên màn mới. Commit chứa file này là mốc thời gian cho các tiêu chí và dự đoán dưới
> đây (đăng ký trước, không chính thức). Không sửa §3–§5 sau khi lượt duyệt bắt đầu; muốn sửa thì thêm dòng ở §8 kèm ngày và lý do.

## 1. Câu hỏi

Can thiệp thiết kế ở màn duyệt (U1a) có làm người duyệt **chậm lại** và **bớt viết lại văn bản** không?

Trả lời bằng mô tả có / không có khác biệt giữa hai lượt duyệt. Không trả lời "vì sao".

## 2. Thiết kế

- **Đầu vào giống hệt:** cả hai lượt duyệt đúng 70 entity mà LLM đề xuất cho 9 điều Luật 108 ngày 20/10/2026 (`extract-v2`).
  Đề xuất gốc chụp bất biến ở `research/sau/de-xuat-goc-108.json`, đối chiếu lại với `pipeline_runs.output` mỗi lần đo.
  Đây là kiểm soát mạnh nhất của thiết kế: khác biệt không đến từ đầu vào.
- **Trước:** màn duyệt cũ, prod, lượt 20/10/2026, một người (bản chụp `research/baseline/raw`, 09/11).
- **Sau:** màn U1a, CSDL MIS, lượt 16–17/11/2026, một người, sổ tay mã v1.
- Can thiệp là **một gói**, không tách được từng phần:

| Màn U1a (sau) | Màn cũ (trước, theo `000_baseline_prod.sql` `approve_entity`) |
|---|---|
| Nghĩa vụ (`hanh_vi`) phải xác nhận phạm vi (chung / có điều kiện) mới duyệt được | Không yêu cầu gì với `hanh_vi` |
| Chủ thể / điều kiện / ngưỡng phải gán mã C0–C7 | Không có mã |
| Chủ thể áp dụng mọi doanh nghiệp: chọn C0 **và** tick xác nhận phạm vi chung riêng (`patchKhiDoiMa` không tự xác nhận) | Chủ thể không có điều kiện: tick "áp dụng mọi doanh nghiệp" — có từ 21/10 (commit `64339d5`), **sau** lượt duyệt 20/10 |
| C1–C3: phải viết điều kiện máy đọc | Điều kiện / ngưỡng: phải có điều kiện máy đọc (đã có ở màn cũ) |
| C4–C7: gắn cờ không hình thức hóa thay cho điều kiện máy đọc; C4/C5 phải ghi văn bản được dẫn chiếu | Không có lối này: điều kiện không viết thành máy đọc được thì chỉ còn từ chối |
| "Duyệt tất cả" bỏ qua entity chưa đủ trường, hiện số bị bỏ qua | "Duyệt tất cả" có; không có trường bắt buộc mới để bỏ qua |

Mọi chặn ở cột trái nằm ở CSDL (`entity_du_dieu_kien_duyet`, migration 007; `approve_entity` trả lỗi, `approve_chunk` bỏ qua);
nút Duyệt trên màn hình bị khóa theo cùng quy tắc (`lib/entity-rules.ts`). Đã kiểm cột phải: lượt duyệt cũ diễn ra 20/10
18:25–18:43 (giờ VN); bước "chủ thể phải chọn phạm vi" (migration 005 + màn hình) vào commit `64339d5` lúc 21/10 10:21 —
sau lượt duyệt; không dòng `approvals` nào của lượt đó mang ghi chú "Chủ thể chung".

- **Cái không đổi giữa hai màn — phải nói rõ:** **không màn nào có ô sửa tên / mô tả entity.** Ở lượt trước, 9 tên entity bị
  đổi (7 ở Điều 8) dù màn duyệt 20/10 không có ô sửa và không lượt trích xuất nào sinh ra các tên đó (đã kiểm 17 lượt
  `pipeline_runs`) — tức là tên được sửa **trực tiếp trong bảng**, ngoài màn duyệt, trước khi bấm Duyệt. Đường đó vẫn mở trên MIS:
  vai chuyên viên có quyền UPDATE cột `ten_entity`, `mo_ta`, `loai_entity` khi entity còn chờ duyệt, và việc sửa không để vết
  (`research/phat-hien/CAN_THIEP_KHONG_VET.md`). Hệ quả cho phép đo: chỉ số "viết lại" (M2, M3) đo **kết quả** — văn bản đã
  duyệt có khác đề xuất gốc không — bất kể sửa bằng đường nào; nó **không** đo tác dụng của một ô sửa trên màn hình, vì màn nào
  cũng không có ô đó.

## 3. Chỉ số

Script: `npm run do:sau` (= `nhip-duyet.mjs` + `so-sanh-de-xuat.mjs` trên MIS + `so-truoc-sau.mjs`), kết quả ở `research/sau/`.
Lượt trước: `npm run do:truoc` (đã chạy, số ở §4). Test tái lập số trước: `tests/doDuyet.test.ts`.

| # | Chỉ số | Cách tính | Kiểm định, tiêu chí cố định trước |
|---|---|---|---|
| M1 | Thời gian duyệt mỗi entity | Khoảng giữa hai dòng `approvals` entity liên tiếp của cùng người; bỏ khoảng = 0 (duyệt cả chunk) và > 10 phút; trung vị, p90 (hạng gần nhất); theo loại entity; lượt sau thêm theo mã C0–C7 | Mann–Whitney U hai phía, lượt trước vs sau; p < 0,05 → "có khác biệt", kèm chiều (trung vị cao / thấp hơn); ngược lại "không có khác biệt" |
| M2 | Tỉ lệ viết lại | Trên entity đã duyệt: y nguyên / sửa nhỏ không đổi nghĩa / viết lại đổi nghĩa. Máy quyết: y nguyên (giống sau chuẩn hóa khoảng trắng, hoa thường, dấu câu cuối), sửa nhỏ (chỉ khác dấu câu), đổi nghĩa (đổi loại entity, hoặc đảo phủ định "không / chưa / cấm / nghiêm cấm"). Còn lại người gán nhãn (`research/sau/nhan-nguoi-<lượt>.json`, ghi ai, ngày) | Fisher chính xác hai phía trên bảng 2×2 (bị sửa / không) và (đổi nghĩa / còn lại); p < 0,05 → "có khác biệt". Không kiểm định khi còn entity chưa có nhãn |
| M3 | 13 entity Điều 8 | Từng entity: lớp ở lượt trước, lớp ở lượt sau, tên sau duyệt | Không kiểm định; bảng mô tả |
| M4 | Thời gian nhóm bị sửa vs không sửa, trong từng lượt | Khoảng của lần quyết định cuối của mỗi entity | Mann–Whitney như M1; chỉ chạy khi mỗi nhóm ≥ 5 khoảng |
| M5 | Đi đường tắt | Tỉ lệ dòng duyệt cùng thời điểm (duyệt cả chunk) / tổng dòng duyệt entity | Không kiểm định |
| M6 | Trường mới được điền | Phân bố C0–C7; số chủ thể xác nhận chung | Chỉ lượt sau |

Tỉ lệ từ chối (trên 70) báo kèm M2 — một entity bị từ chối không còn được tính vào "đã duyệt".

## 4. Số trước can thiệp (đã đo, 16/11)

`research/sau/nhip-duyet-truoc.json`, `research/sau/so-sanh-de-xuat-truoc.{json,md}`:

| Chỉ số | Lượt trước (20/10/2026) |
|---|---|
| M1 | 55 khoảng; trung vị 8,6 giây; p90 50,6 giây (≈ 51 giây như HE_THONG §14.4). Theo loại: hành vi trung vị 7,8 giây (n = 28); chủ thể 15,8 giây (n = 17) |
| M2 | 70 entity: 45 đã duyệt, 25 từ chối. Trong 45 đã duyệt: 36 y nguyên, 7 đổi nghĩa (máy quyết: đảo phủ định), 2 **chưa có nhãn người** (Đ10: rút gọn tên đăng ký thuế; Đ27: bỏ "đáp ứng điều kiện kỹ thuật") |
| M3 | Điều 8 (13 entity): 7 hành vi bị nghiêm cấm thành câu nghĩa vụ / câu "không …" (đổi nghĩa), 6 từ chối, 0 y nguyên |
| M4 | Không sửa: n = 22, trung vị 6,4 giây; bị sửa: n = 8, trung vị 5,5 giây; Mann–Whitney p = 0,41 → **không có khác biệt**. 15 entity đã xử lý không có khoảng đo (duyệt cả chunk / đầu phiên) |
| M5 | 14 / 69 khoảng bằng 0 (duyệt cả chunk) |

Cần làm trước khi so: hai entity chưa có nhãn của lượt trước phải được gán nhãn (sua_nho / doi_nghia) bởi người, ghi vào
`research/sau/nhan-nguoi-truoc.json` — **trước** khi thấy số lượt sau.

## 5. Dự đoán — nhóm điền trước khi duyệt, giữ nguyên dù kết quả khác (HE_THONG §14.4)

| Chỉ số | Dự đoán (điền trước 16/11, trước entity đầu tiên) | Người điền |
|---|---|---|
| M1 trung vị lượt sau | 60 giây | Trần Quang Thắng, 17/11 |
| M2 tỉ lệ đổi nghĩa lượt sau | 0% | Trần Quang Thắng, 17/11 |
| M3 7 hành vi Điều 8 | Giữ nguyên cả 7 tên gốc ở dạng hành vi bị cấm, không có cái nào bị viết thành nghĩa vụ | Trần Quang Thắng, 17/11 |
| M5 tỉ lệ duyệt cả chunk | 0% | Trần Quang Thắng, 17/11 |

Ngày điền thật: 17/11/2026 (không phải "trước 16/11" như tiêu đề cột). Lúc ghi (17/11, 10:51 giờ VN) bảng `approvals` trên MIS
có 0 dòng — dự đoán có trước entity đầu tiên của lượt sau.

Ghi chú của người điền — quyết định cách đọc kết quả:

- **M2 và M3 dự đoán bằng 0 KHÔNG phải vì kỳ vọng người duyệt cẩn thận hơn**, mà vì màn U1a không có ô sửa tên — muốn sửa
  phải đi vòng qua API. Khi phân tích, **không được** diễn giải kết quả 0 thành "can thiệp làm giảm việc viết lại".
- **M5 bằng 0 là cam kết quy trình** (không bấm "Duyệt tất cả"), không phải dự đoán hành vi. Khác 0 nghĩa là quy trình bị
  phá, phải ghi rõ trong báo cáo.

## 6. Điều kiện để số lượt sau dùng được

- **Duyệt từng entity, không bấm "Duyệt tất cả".** Dòng duyệt cả chunk có cùng thời điểm và bị loại khỏi M1, M4.
- Một người duyệt cho 70 entity; nghỉ quá 10 phút thì khoảng đó tự bị loại — không cần bấm giờ tay.
- Nếu có sửa tên / mô tả (bằng bất kỳ đường nào), cứ sửa như khi làm thật; M2 bắt được ở kết quả.
- Chạy `npm run do:sau` khi `con_cho_duyet` = 0.

## 7. Giới hạn — ghi nguyên văn vào báo cáo

1. **Cỡ mẫu nhỏ:** 70 entity, 55 khoảng đo ở lượt trước; Điều 8 chỉ 13 entity. Không đủ để phát hiện khác biệt nhỏ; "không có
   khác biệt" nghĩa là dữ liệu này không cho thấy khác biệt, không phải chứng minh hai lượt như nhau.
2. **Một người duyệt mỗi lượt;** nếu cùng một người duyệt cả hai lượt thì có hiệu ứng học (đã thấy 70 entity này) và người
   duyệt **biết giả thuyết** (đã đọc phát hiện Điều 8) — cả hai đẩy theo hướng "chậm hơn, ít viết lại hơn".
3. **Không ngẫu nhiên hóa, không làm mù:** thứ tự duyệt, thời điểm, áp lực thời gian (lượt trước: chuẩn bị demo; lượt sau:
   trước hạn nộp) khác nhau và không kiểm soát.
4. **Can thiệp là một gói** (§2): có khác biệt cũng không quy được cho phần nào của màn hình.
5. **Khoảng giữa hai lần bấm ≠ thời gian đọc một entity:** gồm cả chuyển sang entity tiếp, sửa trước khi duyệt; entity đầu
   phiên và entity duyệt cả chunk không có số.
6. **Đường sửa ngoài màn hình vẫn mở và không để vết** (§2): M2 bắt kết quả nhưng không biết sửa lúc nào, bởi ai, mất bao lâu.
7. **Nhãn "đổi nghĩa" ngoài quy tắc máy do người trong nhóm gán** — không có người gán thứ hai, không có kappa.
8. **Sổ tay mã v1** (PHAM_VI_VA_PHUONG_PHAP.md §2.1): M6 là phân bố của một người dùng v1.

Không viết "màn mới làm người duyệt cẩn thận hơn" hay "can thiệp giảm việc viết lại" dù kết quả có khác biệt. Viết: "lượt duyệt
trên màn mới có trung vị … so với …; khác biệt có / không có ý nghĩa thống kê theo tiêu chí đặt trước; thiết kế không cho phép
quy nguyên nhân".

## 8. Nhật ký sửa khung sau khi bắt đầu duyệt

- **17/11, trước entity đầu tiên — người duyệt được báo về dòng "căn cứ" của cạnh.** Khi mở màn duyệt, người duyệt hỏi dòng
  in nghiêng trong ngoặc kép ở phần "Liên kết" là trích nguyên văn hay câu ghép máy. Trợ lý trả lời bằng số kiểm trên DB:
  21/44 cạnh có câu "căn cứ" không có trong văn bản, gồm cả 5 cạnh điều kiện ở Điều 48 đảo nghĩa
  (`research/phat-hien/CAN_THIEP_KHONG_VET.md` §4). Không đổi chỉ số, tiêu chí hay màn hình. Hệ quả: người duyệt đọc cạnh
  khác với cách màn hình mời đọc; thời gian (M1) của các entity có cạnh có thể dài hơn vì phải đối chiếu tay. Ghi vào giới hạn.
- **17/11, giữa lượt (sau 6 entity Điều 10) — quy tắc từ chối và mã nhóm.** Người duyệt chốt từ chối 33 entity theo nhóm:
  17 chủ thể là cơ quan nhà nước / công chức, 2 điều khoản giao quyền, 9 nghĩa vụ do nhà nước mang, 5 entity điều kiện Điều
  48; thêm Đ52 k1 "Luật này" và Đ52 k4 "áp dụng toàn bộ các hình thức giao dịch điện tử"; Đ2 k4 duyệt với C6. Lý do từ chối
  mở đầu bằng mã `[NN-CT]` `[NN-NV]` `[GQ]` `[DV]` `[TX]`. Đây là quyết định của người duyệt, không đổi chỉ số hay kiểm
  định ở §3. Nhưng nó làm tỉ lệ từ chối và mẫu số của M2 (entity đã duyệt) phụ thuộc vào một quy tắc chốt giữa lượt, và
  quy tắc này không có ở lượt trước. Báo cáo phải nêu điều đó khi so tỉ lệ từ chối.
- **17/11 — thêm hai phép đếm mô tả, không kiểm định:** điều kiện rỗng nghĩa (`PHAM_VI_VA_PHUONG_PHAP.md` §2.6) và từ chối
  theo mã nhóm, cả hai chỉ ở lượt sau (`scripts/research/phan-loai-sau.mjs`, trong `do:sau`). Khung đối xứng Điều 8:
  `research/bao-cao/DOI_XUNG_DIEU_8.md`.
- **17/11, sau lượt duyệt — thêm bảng so từ chối từng entity giữa hai lượt** (mô tả, không kiểm định) vào
  `so-truoc-sau.mjs`, chỉ chạy khi lượt sau duyệt xong. Kết quả ở §9.

## 9. Kết quả (lượt sau duyệt xong 17/11/2026, `npm run do:sau`, `research/sau/TRUOC_SAU.md`)

Lượt sau: 70/70 entity đã xử lý (34 duyệt, 36 từ chối, 0 chờ), 70 dòng duyệt entity, 66 khoảng đo (bỏ 0 khoảng cùng thời
điểm, 3 khoảng > 10 phút).

### 9.1 Đối chiếu dự đoán §5 — giữ nguyên dự đoán, ghi đúng sai

| Chỉ số | Dự đoán | Thực tế | Đúng / sai |
|---|---|---|---|
| M1 trung vị lượt sau | 60 giây | **19,8 giây** (p90 117,9 giây) | **SAI** — thấp hơn dự đoán 40 giây, khoảng 1/3 mức dự đoán |
| M2 tỉ lệ đổi nghĩa lượt sau | 0% | 0/34 (0%) | Đúng |
| M3 7 hành vi Điều 8 | Giữ nguyên cả 7 | 7/7 duyệt y nguyên | Đúng |
| M5 tỉ lệ duyệt cả chunk | 0% | 0/70 (0%) | Đúng — cam kết quy trình được giữ |

M2 và M3 đúng **không** được đọc thành "can thiệp làm giảm việc viết lại" (ghi chú của người điền, §5): màn nào cũng không có
ô sửa tên, và người duyệt lượt sau biết giả thuyết.

### 9.2 Chỉ số

| # | Lượt trước | Lượt sau | Kiểm định đặt trước |
|---|---|---|---|
| M1 | n = 55; trung vị 8,6 giây; p90 50,6 giây | n = 66; trung vị 19,8 giây; p90 117,9 giây | Mann–Whitney U = 1032, p < 0,001 → **có khác biệt**, trung vị lượt sau cao hơn |
| M1 theo loại | hành vi 7,8 giây (n = 28); chủ thể 15,8 giây (n = 17) | hành vi 21,3 giây (n = 29); chủ thể 19,8 giây (n = 26) | — |
| M2 bị sửa (mọi mức) | 9/45 (20,0%) | 0/34 (0%) | Fisher p = 0,009 → **có khác biệt** |
| M2 đổi nghĩa | 8/45 (17,8%) | 0/34 (0%) | Fisher p = 0,009 → **có khác biệt** |
| Từ chối (trên 70) | 25/70 (35,7%) | 36/70 (51,4%) | Không kiểm định (không có trong §3) |
| M3 Điều 8 | 7 đổi nghĩa, 6 từ chối, 0 y nguyên | 0 đổi nghĩa, 4 từ chối, 9 y nguyên | Mô tả |
| M4 trong lượt | Không sửa n = 22, 6,4 giây; bị sửa n = 8, 5,5 giây; p = 0,41 → **không có khác biệt** | Bị sửa n = 0 → **không kiểm định được** | Chỉ chạy khi mỗi nhóm ≥ 5 |
| M5 | 14/70 (20,0%) | 0/70 (0%) | Mô tả |
| M6 | — | Chủ thể đã duyệt: C0 1, C2 5, C6 4; 1 chủ thể xác nhận chung. Nghĩa vụ: phạm vi chung 10, có điều kiện 8 | Mô tả |

### 9.3 Từ chối từng entity giữa hai lượt (mô tả, sau khi bỏ điều kiện làm mù)

| | Sau: duyệt | Sau: từ chối |
|---|---|---|
| **Trước: duyệt** | 29 | 16 |
| **Trước: từ chối** | 5 | 20 |

- 16 entity trước duyệt → sau từ chối: 12 chủ thể là cơ quan nhà nước / công chức (`NN-CT`), Đ11 k3 và Đ52 k1 "Luật này"
  (`TX`), 2 nghĩa vụ Đ27 (`GQ`: k5 đúng kế hoạch, k2a nhầm).
- 5 entity trước từ chối → sau duyệt: Đ3 "Người nộp thuế trong quản lý thuế", Đ8 "người nộp thuế", Đ8 "Chiếm đoạt hoặc sử
  dụng trái phép tiền thuế", Đ48 "Nộp dần tiền thuế nợ", Đ52 "trước ngày 01 tháng 01 năm 2027".
- Từ chối có ghi chú: trước 0/23 dòng từ chối (thêm 2 entity ở trạng thái từ chối không có dòng từ chối nào,
  `CAN_THIEP_KHONG_VET.md` §2); sau 34/36.
- Tỉ lệ từ chối lượt sau phụ thuộc quy tắc từ chối chốt giữa lượt (§8), quy tắc mà lượt trước không có. Không so hai tỉ lệ từ
  chối như so cùng một phép đo.

### 9.4 Giới hạn riêng của số lượt sau (thêm vào §7)

- **M1 lượt sau gồm cả thời gian hỏi trợ lý giữa lượt** (cách gán mã, điều kiện máy đọc, đọc ngược DB) khi khoảng nghỉ dưới
  10 phút. 3 khoảng trên 10 phút đã bị bỏ. M1 vì vậy không phải thời gian đọc một entity.
- Quy tắc từ chối và mã nhóm chốt giữa lượt (§8); người duyệt đã được báo về 21/44 cạnh không nguyên văn trước entity đầu tiên.
- 5 lần từ chối có sai sót (4 sai / thiếu mã, 1 nhầm entity), không hoàn tác được (`CAN_THIEP_KHONG_VET.md` §6).

Câu được phép viết: "Lượt duyệt trên màn mới có trung vị 19,8 giây mỗi entity so với 8,6 giây ở lượt trước; khác biệt có ý
nghĩa thống kê theo tiêu chí đặt trước (p < 0,001). Lượt sau không viết lại tên entity nào (0/34) so với 9/45 ở lượt trước (p =
0,009). Thiết kế không cho phép quy nguyên nhân; dự đoán M1 (60 giây) sai."
