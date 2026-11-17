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

## 5. Cạnh sai phát hiện sau khi duyệt: không có đường hợp lệ nào để sửa (ca thật 17/11, Điều 10 khoản 3)

**Ca:** nghĩa vụ "Thực hiện đăng ký thuế trực tiếp với cơ quan thuế" (Luật 108 Điều 10 khoản 3) được duyệt lúc 11:10:04
ngày 17/11. Cạnh "áp dụng cho" của nó trỏ tới chủ thể "Cơ quan thuế" và được duyệt cùng lúc. Nguyên văn khoản 3: "Các
trường hợp khác không thuộc quy định tại khoản 2 Điều này thực hiện đăng ký thuế trực tiếp với cơ quan thuế". Người mang
nghĩa vụ là "các trường hợp khác"; cơ quan thuế là bên **nhận**. Cạnh đảo vai. Người duyệt nhận ra sau khi đã bấm.

**Ba sự thật ghép lại (đã kiểm trong code và migration):**

1. **Duyệt nghĩa vụ là duyệt luôn cạnh của nó, không hỏi riêng.** `approve_entity` chuyển mọi cạnh LLM chưa bị sửa có nguồn
   là entity đó theo cùng quyết định, mỗi cạnh một dòng `approvals` (migration 008, mục 6). Màn duyệt có hiện cạnh, nhưng
   không có nút nào cho riêng cạnh.
2. **U1a không tạo được entity, không thêm và không sửa được cạnh.** Lớp ghi dữ liệu của màn duyệt chỉ có `updateEntity`
   cho các trường của entity đang chờ (`lib/data/mutations.ts`). Chủ thể đúng ("các trường hợp khác không thuộc khoản 2")
   không có trong 70 entity, nên cũng không có gì để nối lại.
3. **Không có hàm hoàn tác.** Entity đã xử lý bị khóa (`approve_entity` trả PT409 "Entity không còn ở trạng thái
   cho_duyet"; migration 007). Cạnh đã xử lý bị khóa theo trạng thái của chính nó: không sửa (PT409 "Cạnh đã xử lý, không
   sửa nội dung"), không xóa (PT409 "Cạnh đã xử lý, không xóa được"; migration 008, `khoa_relationship`).

**Hệ quả:** khi chuyên viên phát hiện cạnh sai **sau** khi duyệt, không còn đường hợp lệ nào để sửa. Lựa chọn duy nhất còn
lại là sửa thẳng CSDL bằng quyền quản trị, bỏ qua RLS, trigger và hàm duyệt. Đó đúng là kiểu can thiệp không để vết mà §2
phê phán ở lượt trước. Các khóa được dựng để bảo vệ vết duyệt cũng chặn luôn việc sửa sai có vết.

**Tác động lên kết luận:** bước đối chiếu đang chạy (bản tháng 10, S9 chưa sửa) bỏ qua cạnh trỏ tới entity chưa duyệt hoặc
bị từ chối. Nghĩa vụ không còn điều kiện nào thì ra **áp dụng cho mọi doanh nghiệp** theo dõi lĩnh vực đó. Nghĩa vụ khoản 3
vì vậy sẽ áp dụng cho mọi doanh nghiệp, kể cả doanh nghiệp đã đăng ký theo cơ chế một cửa liên thông ở khoản 2. Theo S9
thiết kế, nó ra "cần bổ sung" (`thu_vien_chua_du`, vì phạm vi "có điều kiện" mà không có điều kiện nào).

**Chưa làm và không làm trong MVP:** không sửa ca này bằng quyền quản trị. Ca được giữ nguyên làm bằng chứng. Hướng xử lý
(chỉ nêu): "mở lại" một quyết định duyệt bằng một hàm riêng, có lý do, ghi dòng `approvals` mới, và cần người thứ hai
duyệt lại; hoặc tách quyết định cạnh khỏi quyết định entity trên màn duyệt.

## 6. Lý do từ chối theo quy ước gõ tay: sai sót đo được (lượt duyệt 17/11, đọc ngược DB giữa lượt)

**Bối cảnh.** Giữa lượt duyệt, người duyệt chốt kế hoạch 35 lần từ chối, mỗi lần một mã nhóm lý do (`[NN-CT]` `[NN-NV]`
`[GQ]` `[DV]` `[TX]`, `research/bao-cao/KHUNG_TRUOC_SAU.md` §8). Mã là **quy ước gõ tay vào ô ghi chú tự do**: hệ không có
trường mã, không kiểm, không bắt buộc ghi chú. Ngược lại, hệ **ép cứng** một điều: entity đã xử lý bị khóa, ghi chú không sửa
được, quyết định không hoàn tác (`approve_entity` báo PT409 "Entity không còn ở trạng thái cho_duyet").

**Đọc ngược DB** (chỉ đọc, 17/11, khi đã bấm 33/35 lần từ chối theo kế hoạch; `approvals` dòng mới nhất mỗi entity):

| Sai sót | Số | Ca |
|---|---|---|
| Ghi sai nhóm | 2 | Đ3 "Thực hiện phân nhóm người nộp thuế", Đ8 k1 "Lợi dụng chức vụ, quyền hạn để tiết lộ thông tin": ghi câu của `NN-CT`, đúng là `NN-NV` (người duyệt tự phát hiện) |
| Từ chối không ghi chú | 2 | Đ52 k1 "Luật này" (kế hoạch `TX`), Đ52 k4 "áp dụng toàn bộ các hình thức giao dịch điện tử" (kế hoạch `GQ`) |
| Từ chối nhầm entity | 1 | Đ27 k2a "Đăng ký, quản lý, sử dụng chứng từ điện tử" bị từ chối với câu `GQ`; entity trong kế hoạch là Đ27 k5 "Đăng ký sử dụng chứng từ điện tử" (vẫn chờ duyệt). Nguyên văn k2a là câu tuân thủ ("…phải tuân thủ quy định của pháp luật về giao dịch điện tử…"), không phải điều khoản giao quyền. Hai cạnh của k2a đi theo entity nguồn, cùng bị từ chối và khóa |
| Ghi đúng dạng quy ước (tiền tố `[mã]` đầu ghi chú) | **0/33** | Người duyệt gõ phần câu, bỏ tiền tố. Câu gõ nhất quán (5 câu cố định), nên nhóm vẫn đọc lại được theo đầu câu — quy tắc đọc này do trợ lý thêm **sau khi** thấy dữ liệu (`do-duyet-lib.mjs` `DAU_CAU_CHUAN`) |

**Tỉ lệ sai mã nhóm: 4/33** lần từ chối đã bấm (2 sai nhóm + 2 không ghi), chưa tính ca nhầm entity (mã không bắt được loại
sai đó). Mẫu số cập nhật khi bấm đủ kế hoạch (còn Đ48 k7, Đ48 k8, Đ27 k5). Đếm theo nhóm đúng nhờ bảng ngoại lệ
`NGOAI_LE_MA` trong `scripts/research/phan-loai-sau.mjs`; nhóm ghi thật vẫn giữ ở cột riêng. Bảng chỉ nhận nhóm đúng do người
duyệt nêu (tự báo hoặc kế hoạch đã chốt), không suy thay.

**Vì sao đây là phát hiện, không phải chuyện vặt.** Cùng một lượt có hai loại ràng buộc: cái hệ ép (khóa sau xử lý) giữ
nguyên được mọi sai sót; cái người tự giữ (mã lý do) để lọt 4/33 và không có lần nào đúng dạng đã quy ước. Kết hợp lại: sai
sót vào được nhưng không sửa được, chỉ còn cách ghi ngoài hệ (bảng ngoại lệ trong script). Đây là cùng họ với §2–§5: thông tin
người duyệt cần ghi lại nằm ngoài cái hệ ghi vết.

**Giới hạn.** n nhỏ, một người duyệt, một buổi. Người duyệt biết giả thuyết. Không suy ra tỉ lệ sai cho người khác hay lượt
khác. Hệ không ghi lúc nào người duyệt nhận được bộ câu chuẩn, nên không tách được ca "không ghi" là quên hay bấm trước khi có
quy ước.

**Hướng xử lý (ngoài MVP, chỉ nêu).** Lý do từ chối thành trường bắt buộc chọn từ một bảng mã mở rộng được (không phải enum
cứng), ghi chú tự do đi kèm; màn duyệt hiện lại tên + nguyên văn entity trong hộp xác nhận từ chối.

## 7. Chung một họ vấn đề

§2 và §3 là thao tác của người làm đổi nội dung thư viện mà vết duyệt chỉ ghi kết quả, không ghi phép biến đổi: sửa tên entity
(diễn giải) và bỏ / giữ cạnh (cấu trúc). §4 là phía máy: câu suy luận được trình bày như trích dẫn, và cảnh báo hệ đã có không
đến tay người duyệt. §6 là phía quy ước người làm tự giữ: hệ không ép lý do, nhưng khóa luôn lý do sai. Hướng xử lý cho §4 (ngoài MVP trừ khi chủ repo chốt khác): hiện dòng căn cứ là trích dẫn chỉ khi khớp
nguyên văn; không khớp thì bỏ ngoặc kép, ghi nhãn "câu do AI ghép, không có trong văn bản". Hướng xử lý (ngoài MVP, chỉ nêu): ghi bản chụp trước / sau mỗi lần sửa nội dung khi còn
chờ duyệt; xóa cạnh LLM thành "từ chối cạnh" có vết; gắn cờ "diễn giải" khi tên entity không còn là trích nguyên văn.
