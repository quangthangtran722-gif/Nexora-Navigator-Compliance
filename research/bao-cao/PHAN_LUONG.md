# Phân luồng duyệt — luồng cơ học (A) và luồng chuyên môn (B)

> Chốt 21/11/2026 (nhật ký thiết kế #22). Đặc tả, cách đo và giới hạn ở §1–§4 được ghi và commit **trước** khi chạy đối
> chiếu trên Luật 108; §5 điền sau khi chạy. Code: `lib/pipeline/phanLuong.ts` (`phan-luong-v1`), test
> `tests/phanLuong.test.ts`, đối chiếu `scripts/research/kiem-phan-luong.mjs`.

## 1. Nguyên tắc

- Phân luồng **chỉ định tuyến**, không quyết thay. Người vẫn bấm Duyệt / Từ chối, tự đọc nguyên văn, tự chọn nhóm từ chối.
  Màn duyệt không hiện luật nào đã khớp (hiện ra là gợi ý sẵn mã nhóm).
- **Luồng A chỉ chứa mục nhiều khả năng bị từ chối.** Mọi thao tác ghi vào thư viện do người có chuyên môn bấm. Lý do là
  **bán kính ảnh hưởng**, không phải độ khó: duyệt một entity kéo theo các cạnh LLM của nó và khóa vĩnh viễn (migration
  008, `CAN_THIEP_KHONG_VET.md` §5); từ chối kéo theo từ chối cạnh. Vì vậy thời hạn, đối tượng sang B.
- Không chắc → B. Nhầm sang B chỉ tốn công; nhầm sang A có thể mất một nghĩa vụ.
- Luồng là **quyền ở DB** (RLS + kiểm trong `approve_entity`, migration 010): tài khoản cơ học chỉ thao tác mục ở A, chỉ
  chuyển A → B, không bao giờ B → A. Mỗi lần chuyển ghi vết (ai, lúc nào). DB đếm số lần chặn thao tác sai luồng.
- **Van an toàn** cho người làm luồng A — ba câu có / không, không cần biết luật: (1) tên entity nằm nguyên chữ trong câu?
  (2) cơ quan nhà nước là mấy chữ đầu câu, là bên làm việc đó? (3) câu không có số tiền, "trường hợp / nếu / khi / trừ", hay
  tên một bên khác? Một câu "không" → chuyển sang B, không đoán.

## 2. Bộ lọc `phan-luong-v1` (luật khớp đầu tiên thắng)

1. **A5** tên là tự tham chiếu chung chung ("Luật này", "Điều này", …) → A (ứng viên TX).
2. **B cứng**, khớp một luật là B: B9 loại `dieu_kien` / `nguong` / `thoi_han` / `doi_tuong`; B1 số tiền, %; B2 "trường hợp /
   nếu / khi / trừ / ngoại trừ / không áp dụng"; B3 dẫn chiếu ("Điều n", luật / nghị định / thông tư / pháp luật, trừ "… này");
   B4 "do / theo quy định của / theo hướng dẫn của / mức do" + cơ quan nhà nước (C5, **không** phải giao quyền); B5 "nghiêm cấm /
   không được / cấm" trong câu, hoặc tên Điều có "nghiêm cấm / bị cấm"; B6 tên vừa có bên nhà nước vừa có bên khác; B7 câu định
   nghĩa "… là …"; B8 tên không có nguyên văn trong câu; B10 "kể từ ngày / thay đổi / chấm dứt", ngày tháng.
3. **A1** chủ thể mà **cả tên** là cơ quan / người nhà nước, đứng đầu câu hoặc đầu vế (ứng viên NN-CT).
4. **A2** câu mở đầu bằng cơ quan nhà nước + "quy định / hướng dẫn" (ứng viên GQ).
5. **A3** nghĩa vụ, câu mở đầu bằng cơ quan nhà nước + "có trách nhiệm / phải / thực hiện / có nhiệm vụ" (ứng viên NN-NV).
6. **A4** nghĩa vụ trong Điều "Trách nhiệm / Nhiệm vụ, quyền hạn của <cơ quan nhà nước>" (ứng viên NN-NV).
7. Còn lại → B (`B-mac-dinh-chu-the` hoặc `C-khong-chac`).
8. **Lượt hai A6**, sau khi luồng B quyết xong nghĩa vụ: điều kiện còn chờ duyệt mà mọi nghĩa vụ đích (cạnh `dieu_kien`) đã
   bị từ chối → A (ứng viên DV).

Danh sách cơ quan nhà nước ở `NHA_NUOC` trong code.

## 3. Cách đo trên Luật 108 (chốt trước khi chạy)

- **Đáp án:** quyết định cuối ngày 17/11 trên 70 entity, nhóm từ chối theo `research/sau/phan-loai-sau.json` (đã áp bảng
  ngoại lệ `NGOAI_LE_MA`).
- **"Phải ở A"** khi bị từ chối theo nhóm NN-CT, NN-NV, GQ, DV; hoặc nhóm TX mà tên là tự tham chiếu chung chung. **Trừ Đ27
  k2a** (từ chối nhầm, ngoài kế hoạch): tính "phải ở B". Mọi mục khác "phải ở B" (gồm Đ11 k3, TX cần đọc mới biết).
- Đầu vào của bộ lọc: đề xuất gốc của LLM (lượt sau không sửa tên nào, 0/34) + nguyên văn + tên Điều.
- Báo bảng 2×2 (luồng bộ lọc × đáp án) cho lượt một, và sau lượt hai (A6 dùng quyết định cuối của nghĩa vụ).
- **Chỉ số chính: số mục đưa nhầm sang A** (đáp án B, bộ lọc A). Mong muốn: 0. Chỉ số phụ: số mục đưa nhầm sang B, tỉ lệ
  luồng A trên 70, tỉ lệ khớp chung.

## 4. Giới hạn — ghi nguyên văn vào báo cáo

- **Đo trên Luật 108 là đo trong mẫu:** bộ từ khóa và thứ tự luật được dựng sau khi đã thấy đáp án của chính 70 entity này.
  Kết quả sẽ đẹp hơn thực tế.
- **"Đúng" nghĩa là khớp với quyết định của MỘT người**, quyết định đó có 5 sai sót (4 sai / thiếu mã, 1 nhầm entity) và κ =
  0,40 với lượt duyệt trước (`KHUNG_TRUOC_SAU.md` §9.1). Không phải "đúng luật".
- **Phép đo thật là TNDN:** đóng băng `phan-luong-v1` trước khi chạy X1 cho TNDN; sau khi duyệt xong, đếm số lần van chuyển
  A → B và số mục đưa nhầm sang A (mục ở A mà người có chuyên môn, xem lại, thấy lẽ ra phải ở B). Không chỉnh bộ lọc giữa
  chừng; muốn chỉnh thì ra `phan-luong-v2` và chỉ dùng cho văn bản sau.
- **Tỉ lệ "quyết định không đòi hỏi phán đoán pháp lý"** chỉ đo được sau khi duyệt: số mục quyết ở A mà không bị van chuyển
  sang B, trên tổng số mục. Trước khi duyệt, tỉ lệ luồng A chỉ là dự báo của bộ lọc.
- Nhóm "cơ học" NN-CT chỉ thành cơ học **sau khi có quy tắc #18**: đó là chỗ hai lượt duyệt Luật 108 lệch nhau nhiều nhất
  (12/21 lần đảo), và lượt cũ đã **duyệt** chính các chủ thể nhà nước này (`KHUNG_TRUOC_SAU.md` §9.1). Phần không cần chuyên môn
  tồn tại vì người có chuyên môn đã viết quy tắc trước.

## 5. Kết quả trên Luật 108 (trong mẫu)

Chạy 21/11/2026 (`research/sau/phan-luong-108.md`, chi tiết từng mục nhầm sang B). Đáp án "phải ở A": 34/70.

| | Đáp án A | Đáp án B | Cộng |
|---|---|---|---|
| **Bộ lọc A** — lượt một / sau lượt hai | 15 / 20 | **0 / 0** | 15 / 20 |
| **Bộ lọc B** — lượt một / sau lượt hai | 19 / 14 | 36 / 36 | 55 / 50 |

- **Nhầm sang A: 0** ở cả hai lượt. Đ11 k3 (TX cần đọc) và Đ27 k2a (từ chối nhầm) đều ở B.
- Luồng A: 15/70 (21,4%) lượt một; **20/70 (28,6%)** sau lượt hai (thêm 5 điều kiện mất nguồn, nhóm DV). Cả 20 đều bị từ
  chối ngày 17/11 theo nhóm cơ học. Khớp chung 56/70 (80,0%).
- Nhầm sang B: 14/34 mục "phải ở A". Nguyên nhân là B cứng xét trước A, đúng thiết kế an toàn: câu Điều 8 khoản 1 có "cấm"
  (B5), câu có "trường hợp / khi" (B2), câu dẫn chiếu Điều khác (B3), "do Bộ trưởng…" (B4), tên LLM không nằm nguyên chữ
  trong câu (B8). Giá của 0 mục nhầm sang A là bỏ sót 41% (14/34) phần cơ học.
- **Trần của cách định tuyến theo mẫu trên Luật 108:** 34/70 (48,6%) quyết định thuộc nhóm cơ học xét sau khi đã có đáp án;
  bộ lọc bắt được 20 trong số đó. **Đây không phải tỉ lệ "quyết định không đòi hỏi phán đoán pháp lý"** (§4: chỉ đo được sau
  một lượt duyệt thật có van).
- Thêm một giới hạn: khi viết bộ lọc, trợ lý đã đọc lại nguyên văn các entity Điều 11 (để kiểm ví dụ Đ11 k3 chủ repo nêu). Bộ
  lọc vì vậy không chỉ dựng sau khi biết đáp án mà còn sau khi xem một phần dữ liệu. Không chỉnh `phan-luong-v1` sau lần chạy
  này; phiên bản này là bản đóng băng dùng cho TNDN.

Câu được phép viết: "Trên 70 entity Luật 108 (đo trong mẫu, đáp án là quyết định của một người duyệt), bộ lọc định tuyến đưa
20 mục (28,6%) sang luồng cơ học, không mục nào lẽ ra cần chuyên môn; nó bỏ sót 14/34 mục mà nhóm từ chối xét sau là cơ học. Độ
chính xác ngoài mẫu đo trên TNDN."
