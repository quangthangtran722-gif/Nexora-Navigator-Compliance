# Phát hiện: khâu người làm có những đường can thiệp mà hệ thống không ghi vết

> Một mục duy nhất trong báo cáo (chủ repo chốt 11/11) — gộp phát hiện Điều 8 và giới hạn của cạnh LLM. Số đo Điều 8 do
> script so sánh 70 entity (lịch 16/11) điền vào §2; đến lúc đó §2 chỉ ghi những gì đã kiểm.

## 1. Luận điểm bị thử

Nguyên tắc lõi: "AI không tự diễn giải luật" — LLM chỉ đề xuất, người duyệt bảo đảm trung thực với văn bản, và mọi lần duyệt
có vết trong `approvals`. Hai quan sát dưới đây cho thấy chính khâu người làm có những thao tác làm đổi nội dung thư viện mà vết
duyệt không phản ánh — khâu human-in-the-loop dựng ra để giữ độ trung thực lại là chỗ độ trung thực có thể trôi mà không ai thấy.

## 2. Người diễn giải lại văn bản khi duyệt (Điều 8, dữ liệu trước can thiệp)

- Đã kiểm (H2, `research/reload/manifest.json`): 9 tên entity trên prod khác đề xuất gốc của LLM; 7 ở Điều 8 — hành vi bị
  nghiêm cấm được đổi thành nghĩa vụ (vd "Cố tình không kê khai…" → "Kê khai thuế đầy đủ, trung thực"). Đây là diễn giải, không
  phải trích nguyên văn.
- Hệ cũ không chặn, cũng không ghi đó là diễn giải: `approvals` chỉ có quyết định cuối, không có bản trước / sau khi sửa tên.
- **Đường sửa nằm ngoài màn duyệt (kiểm 16/11):** màn duyệt chạy ngày 20/10 không có ô sửa tên entity, `approve_entity` cũ không
  nhận tên mới, và không lượt trích xuất nào trong 17 lượt `pipeline_runs` sinh ra các tên đã sửa. Các tên được sửa trực tiếp
  trong bảng `entities` (vai đăng nhập có quyền UPDATE cột `ten_entity`) trước khi bấm Duyệt; `updated_at` bị ghi đè lúc duyệt
  nên không biết sửa lúc nào, bởi ai. Phát hiện này vì vậy là về **khâu duyệt nói chung** (người có quyền ghi thư viện), không
  riêng về màn hình duyệt.
- Số đo trước can thiệp (16/11, `research/sau/so-sanh-de-xuat-truoc.md`, script `scripts/research/so-sanh-de-xuat.mjs`): 70
  entity → 25 từ chối, 45 đã duyệt: 36 y nguyên, 7 viết lại đổi nghĩa (cả 7 ở Điều 8, máy quyết theo quy tắc đảo phủ định), 2
  chưa có nhãn người (Đ10, Đ27). Thời gian duyệt nhóm bị sửa (n = 8, trung vị 5,5 giây) và không sửa (n = 22, trung vị 6,4
  giây): Mann–Whitney p = 0,41 → **không có khác biệt**. Không suy diễn nhân quả.
- Số đo sau: cùng script trên lượt duyệt màn mới (`npm run do:sau`); khung so sánh ở `research/bao-cao/KHUNG_TRUOC_SAU.md`.

## 3. Cạnh LLM sai được duyệt theo entity nguồn; xóa cạnh không để lại vết (hệ mới, sau M8)

- Từ 008, cạnh LLM chưa bị sửa chuyển trạng thái theo entity nguồn (để người duyệt không phải duyệt từng cạnh). Màn duyệt
  (U1a) không có ô sửa cạnh. Một cạnh LLM **sai** (nối nhầm chủ thể, nhầm điều kiện) vì vậy được duyệt cùng entity đúng.
- Cách duy nhất để bỏ cạnh sai trước khi duyệt là **xóa** khi entity nguồn còn chờ — việc xóa không tạo dòng `approvals`; chỉ
  truy lại được bằng cách so `pipeline_runs.output` (đề xuất gốc) với bảng cạnh.
- Dữ liệu cũ: 0/44 cạnh Luật 108 bị người sửa, 0 cạnh do người thêm (kiểm 11/11) — chưa xảy ra lần nào, nhưng hệ không có gì
  ngăn hay ghi nhận nếu xảy ra.
- Cạnh do người THÊM thì có vết đủ (người tạo ép ở DB, người duyệt khác người tạo, chỉ người tạo được rút, người khác phải Từ
  chối) — giới hạn ở đây chỉ thuộc về cạnh do LLM đề xuất.

## 4. Màn duyệt trình bày câu do LLM ghép như trích dẫn nguyên văn (kiểm 17/11, trước lượt duyệt mới)

Người duyệt phát hiện khi mở màn U1a: mỗi cạnh ở phần "Liên kết" có một dòng in nghiêng **trong ngoặc kép**
(`components/nexora/edge-line.tsx`, trường `can_cu`), dạng "[tên entity A] áp dụng cho [tên entity B]"; khoản 2 Điều 10
không có câu nào như vậy.

- **Nguồn của dòng đó:** `can_cu` do LLM sinh; prompt và schema yêu cầu "đoạn chép nguyên văn thể hiện quan hệ"
  (`extractEntities.prompt.ts`, `.schema.ts`). Màn hình hiện nó như trích dẫn: ngoặc kép, in nghiêng, gạch lề trái.
- **Đo trên MIS (17/11, chỉ đọc, chuẩn hóa như `grounding.ts` `normalizeForMatch`):** 44 cạnh của 9 điều; **21/44 có
  `can_cu` không nằm trong văn bản của chunk**. Phần lớn là câu ghép theo khuôn "[nguồn] áp dụng cho [đích]" hoặc
  "[nguồn] là điều kiện để [đích]". Cả 9 cạnh có nguồn ở Điều 10 thuộc nhóm này.
- **Hệ đã biết mà không cho người duyệt thấy:** lúc trích xuất, `grounding.ts` gắn cảnh báo `can_cu_khong_nguyen_van` cho
  đúng 21 cạnh này (9 + 11 + 1 trong `pipeline_runs.output.warnings` của ba lượt). Chỉ là cảnh báo, không chặn; không màn
  nào đọc `warnings`.
- **Trường hợp nặng nhất — Điều 48 đảo nghĩa:** Điều 48 khoản 1–5 liệt kê các trường hợp **bị** cưỡng chế. Năm cạnh
  `dieu_kien` nối các trường hợp đó vào nghĩa vụ "Không thực hiện biện pháp cưỡng chế thuế", với câu ghép "… là điều kiện để
  không thực hiện biện pháp cưỡng chế thuế". Câu đặt trong ngoặc kép nói ngược nguyên văn.
- **Vì sao chạm tới thư viện:** từ 008, cạnh LLM chưa bị sửa được duyệt / từ chối **cùng entity nguồn**. Duyệt entity điều
  kiện ở Điều 48 là duyệt luôn cạnh đảo nghĩa. Không có thao tác "từ chối riêng cạnh này" cho cạnh LLM: chỉ có từ chối cả
  entity nguồn, xóa cạnh (không vết, §3), hoặc sửa cạnh (có vết `nguoi_sua_cuoi_id`, sau đó cần người thứ hai duyệt qua
  `approve_relationship`).
- **Cùng họ với Điều 8:** nội dung phái sinh (suy luận của LLM) được trình bày như nội dung trích. Ở Điều 8 người sửa tên mà
  không để vết; ở đây máy dựng câu và màn hình gắn cho nó hình thức của trích dẫn.
- Giới hạn: phép kiểm là so khớp chuỗi sau chuẩn hóa. Một `can_cu` khớp nguyên văn vẫn có thể chọn sai đoạn; một `can_cu`
  không khớp có thể chỉ khác vài chữ. Tính đúng / sai của từng cạnh do người duyệt quyết, không do phép kiểm này.

## 5. Chung một họ vấn đề

§2 và §3 là thao tác của người làm đổi nội dung thư viện mà vết duyệt chỉ ghi kết quả, không ghi phép biến đổi: sửa tên entity
(diễn giải) và bỏ / giữ cạnh (cấu trúc). §4 là phía máy: câu suy luận được trình bày như trích dẫn, và cảnh báo hệ đã có không
đến tay người duyệt. Hướng xử lý cho §4 (ngoài MVP trừ khi chủ repo chốt khác): hiện dòng căn cứ là trích dẫn chỉ khi khớp
nguyên văn; không khớp thì bỏ ngoặc kép, ghi nhãn "câu do AI ghép, không có trong văn bản". Hướng xử lý (ngoài MVP, chỉ nêu): ghi bản chụp trước / sau mỗi lần sửa nội dung khi còn
chờ duyệt; xóa cạnh LLM thành "từ chối cạnh" có vết; gắn cờ "diễn giải" khi tên entity không còn là trích nguyên văn.
