# Phát hiện: bản vá tay bỏ sót, test quét tự động bắt được — quyền gọi hàm của `anon`

> Một mục riêng trong báo cáo (chủ repo yêu cầu 16/11). Chi tiết kỹ thuật đầy đủ: `research/quyen/RA_SOAT_QUYEN.md` §5.
> Dấu vết: commit `e7c37d3` (11/11/2026 12:00) — migration `supabase/migrations/008a_thu_hep_quyen.sql`, test
> `supabase/tests/quyen_kiem_thu.sql`, lệnh `npm run test:db` (`scripts/mis/chay-test-db.mjs`). Trước đó: commit `8f1c8c8`
> (10/11, M8) gỡ bằng tay bốn quyền TRUNCATE / REFERENCES / TRIGGER / MAINTAIN của vai đăng nhập.

## 1. Chuyện gì xảy ra

Mục tiêu của 008a: vai `anon` (người chưa đăng nhập) không còn quyền nào trong schema `public`. Cách làm đầu tiên là cách
người viết migration vẫn làm, và cũng là cách của M8 một ngày trước đó: liệt kê quyền rồi `REVOKE … FROM anon`.

| Bước | Ai / cái gì làm | `anon` gọi được bao nhiêu hàm |
|---|---|---|
| Trước 008a | — | **12** |
| Chạy test quét **trước** khi áp 008a | Test (Q2: `has_function_privilege('anon', …)` trên mọi hàm của `public`) | Fail — 12 |
| Áp 008a bản 1: gỡ quyền riêng của `anon` | Bản vá tay (Claude viết, chủ repo duyệt hướng) | **11** — test vẫn fail |
| Áp 008a bản 2: cấp tường minh cho `authenticated`, `service_role` trên đúng các hàm đang mở cho PUBLIC, rồi thu PUBLIC; thu luôn mặc định EXECUTE-cho-PUBLIC của hàm tạo sau | Sửa sau khi đọc lỗi của test | **0** — Q1–Q6 qua |

Nguyên nhân bản 1 hụt: Postgres mặc định cấp EXECUTE trên mọi hàm mới cho **PUBLIC** — một vai giả mà mọi vai, kể cả `anon`, đều
là thành viên. `REVOKE … FROM anon` chỉ gỡ được quyền cấp **riêng** cho `anon` (1 hàm); 11 hàm còn lại `anon` gọi được qua PUBLIC.
Danh sách GRANT của từng hàm không ghi tên `anon` ở đâu cả — đọc danh sách thì tưởng đã sạch.

Test bắt được vì nó **hỏi hành vi chứ không đọc cấu hình**: với từng hàm, "vai `anon` có gọi được không"
(`has_function_privilege`), bất kể quyền đến từ đâu. Cùng lần chạy, bộ test 007 cũng bắt một hệ quả phụ của bản 2: hai ca của
chính bộ test gọi hàm hỗ trợ bằng vai `anon` (trước đây gọi được nhờ PUBLIC) — đã cấp riêng trong file test, không đụng sản phẩm.

## 2. Vì sao đây là luận điểm của bài, diễn ra ngay trong quá trình làm

Luận điểm của đồ án: ràng buộc phụ thuộc vào kỷ luật của người làm (nhớ gỡ quyền, nhớ duyệt kỹ, nhớ không viết lại văn bản) sẽ
bỏ sót; ràng buộc được **cưỡng chế và kiểm tra tự động** thì bắt được. Ở đây cả hai cách được thử trên cùng một việc, cách nhau
vài phút, có số:

- Kỷ luật thủ công: người viết biết phải gỡ quyền `anon`, đã viết lệnh gỡ, và tin là xong — bỏ sót 11/12 hàm (92%).
- Kiểm tra tự động: bắt được ngay ở lần chạy đầu, chỉ ra đúng số hàm còn hở, và từ nay chạy lại sau mỗi migration
  (`npm run test:db`; Q6 còn tạo thật một bảng / hàm mới trong transaction để đo quyền mặc định).
- Quy ước cũ "migration 007–010 phải REVOKE quyền thừa cho mỗi bảng / hàm / view mới" (PLAN.md §1.2, ghi từ H1 ngày 09/11)
  được **thay** bằng test, không giữ song song: quy ước là đúng loại ràng buộc vừa thất bại.

Cùng họ với phát hiện TRUNCATE / TRIGGER ở M8 (`RA_SOAT_QUYEN.md` §1–3): một quyền mà không ai cố ý cấp, nằm trong cấu hình
mặc định, không hiện ra khi đọc mã của chính dự án.

## 3. Giới hạn — không nói quá

- **Một trường hợp.** Không phải tỉ lệ bỏ sót của kỷ luật thủ công nói chung; là một ví dụ có số và có dấu vết, minh họa cơ chế.
- **Bản 1 không có commit riêng.** Bản 1 được áp lên DB MIS rồi sửa trong cùng phiên; commit `e7c37d3` chứa bản 2, test, và mô
  tả bản 1 + kết quả từng lần chạy (`RA_SOAT_QUYEN.md` §5). Dấu vết của bước trung gian là bản ghi bằng chữ trong cùng commit,
  không phải một commit có thể checkout.
- **Người bỏ sót là trợ lý lập trình (Claude) viết migration**, chủ repo duyệt hướng. Không suy ra điều gì về chuyên viên pháp
  lý hay người duyệt thư viện.
- **Test chỉ bắt khi có người chạy nó.** Không có CI chạy `npm run test:db` tự động; test phát hiện, không ngăn ở thời điểm tạo
  đối tượng. Phần quyền mặc định do `supabase_admin` sở hữu thì không sửa được, chỉ phát hiện được (phát hiện 3, trần của quản
  trị tầng CSDL do nền tảng đặt — `RA_SOAT_QUYEN.md` §5).
