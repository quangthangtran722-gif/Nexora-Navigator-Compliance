# Nexora Compliance Navigator — CLAUDE.md

> File này nằm ở root repo để Claude Code tự đọc mỗi khi mở project. Mục đích: nắm toàn bộ bối cảnh, kiến trúc và ranh giới an toàn của hệ thống trước khi viết bất kỳ dòng code nào — không phải hướng dẫn cài đặt, mà là bộ nhớ dự án.

## 1. Bối cảnh

- Sản phẩm: **Nexora Compliance Navigator** — dự thi SpawnX 2026 (TechX Club, UEH), team **THE TANK**, bài toán 02 (Chấp hành luật).
- Vấn đề giải quyết: SME Việt Nam không có bộ phận pháp chế riêng, luật thay đổi liên tục và một nghị định có thể ảnh hưởng chéo nhiều phòng ban (Marketing, IT, Kế toán...) mà không ai trong công ty biết để xử lý.
- Nexora là **subscription SaaS theo dõi liên tục**, không phải tool tra cứu luật theo yêu cầu (search-on-demand). Đây là khác biệt quan trọng nhất so với các sản phẩm "tra luật bằng AI" thông thường — giá trị nằm ở việc tự động phát hiện khi có nghĩa vụ mới áp dụng cho khách hàng, không phải ở việc trả lời câu hỏi.
- Deadline MVP Vòng 3: **24/10/2026**. Giai đoạn hiện tại: setup hạ tầng, bắt đầu build.

## 2. Tech stack (toàn bộ free tier — demo chi phí $0)

| Layer | Công nghệ | Ghi chú |
|---|---|---|
| Frontend + API | Next.js (App Router, TypeScript) | deploy trên **Vercel Hobby** |
| Database + Auth | **Supabase** (Postgres, Auth, Row Level Security) | free tier **tự pause sau 7 ngày không hoạt động** — phải unpause thủ công trước demo nếu để project nghỉ lâu |
| AI inference | **Groq**, model `openai/gpt-oss-120b` | free tier, không cần thẻ, ~1,000 request/ngày |
| AI SDK | **Vercel AI SDK** + Zod schema | ép AI trả JSON có cấu trúc, không parse text tự do |
| Email (optional) | Resend | free tier 3,000 email/tháng — build nếu kịp thời gian, không kịp thì mô phỏng |

## 3. Nguyên tắc an toàn cốt lõi — KHÔNG được vi phạm khi code

**AI không bao giờ tự diễn giải luật hoặc tự quyết định nghĩa vụ nào áp dụng cho ai.** Đây là ranh giới quan trọng nhất của toàn hệ thống, phải giữ xuyên suốt mọi phần code:

1. AI (Groq) chỉ được giao đúng 2 việc:
   - **Trích xuất** (`extractCard.ts`): đọc văn bản luật, tách ra câu nghĩa vụ + trích dẫn điều khoản → tạo **draft** thẻ.
   - **Viết lại** (`rewriteTask.ts`): diễn đạt lại nội dung cho dễ hiểu, **giữ nguyên phạm vi pháp lý**, không thêm/bớt/suy diễn ý mới.
2. Bước quyết định "nghĩa vụ này có áp dụng cho khách hàng X không" (`filterApplicability.ts`) là **rule engine thuần code — KHÔNG gọi AI, không có bước AI nào chen vào giữa**. So khớp điều kiện (`dieu_kien_ap_dung` trong thẻ) với hồ sơ khách hàng (`customer_profiles`) bằng logic if/else hoặc so khớp JSON thuần.
3. Mọi output của AI chỉ là **draft chờ duyệt**, không có hiệu lực tự động:
   - Thẻ mới → phải được **curator duyệt** mới vào kho `cards` dùng chung.
   - Task viết lại → phải được **người đầu mối tuân thủ của khách hàng duyệt** mới giao xuống phòng ban.
4. Không viết bất kỳ đoạn code nào cho phép hệ thống tự động chuyển trạng thái "Chờ duyệt" → "Đã duyệt" mà bỏ qua hành động xác nhận của con người (dù là để tiện demo).
5. Mọi lần chạy AI hoặc rule engine đều phải ghi log vào bảng `pipeline_runs` (input, output, model, timestamp) — đây là yếu tố minh bạch dùng để trình bày với mentor, không phải tính năng phụ.

## 4. Đơn vị trung tâm: "thẻ nghĩa vụ" (obligation card)

Mỗi nghĩa vụ pháp lý cụ thể được chuẩn hóa thành một **thẻ**, lưu trong kho dùng chung — tái sử dụng cho mọi khách hàng, không tạo lại riêng từng công ty.

### Schema bảng `cards`

| field | kiểu | ghi chú |
|---|---|---|
| id | uuid | PK |
| noi_dung_goc | text | câu luật gốc, trích dẫn nguyên văn |
| dieu_khoan | text | vd: `"NĐ 356/2025, Điều 11"` |
| cum_phap_ly | text | tag cụm pháp lý, vd `"bao_ve_du_lieu_ca_nhan"` — để mở rộng cụm luật mới mà không phải sửa pipeline |
| dieu_kien_ap_dung | jsonb | điều kiện mà rule engine dùng để so khớp với `customer_profiles` |
| noi_dung_viet_lai | text | bản AI viết lại, dễ hiểu, dùng để hiển thị cho khách hàng |
| ngay_co_hieu_luc | date | |
| trang_thai_hieu_luc | enum | `"Sắp áp dụng"` / `"Đang áp dụng"` / `"Hết hiệu lực"` |
| thay_the_boi | uuid, nullable | FK trỏ tới thẻ mới nếu điều luật này bị thay thế |
| trang_thai_duyet | enum | `"Chờ duyệt"` / `"Đã duyệt"` / `"Từ chối"` |
| curator_id | uuid | ai duyệt thẻ này |
| created_at | timestamp | |

## 5. Kiến trúc 2 nửa

**Nửa 1 — xây kho thẻ (chạy một lần, dùng chung cho mọi khách hàng):**

```
Văn bản luật → AI trích xuất (draft) → Curator duyệt → vào kho `cards`
```

**Nửa 2 — chạy riêng cho từng khách hàng:**

```
Onboarding khách hàng → Rule engine lọc thẻ áp dụng (so khớp dieu_kien_ap_dung ↔ customer_profiles)
  → AI viết lại thành task → Người đầu mối duyệt → Giao xuống phòng ban
```

### Rule engine — 4 trạng thái output (không phải 3)

- **Áp dụng** — điều kiện khớp đầy đủ, đã đến `ngay_co_hieu_luc`.
- **Sắp áp dụng** — điều kiện khớp nhưng `ngay_co_hieu_luc` ở tương lai.
- **Không áp dụng** — điều kiện không khớp hồ sơ khách hàng.
- **Chưa đủ thông tin** — thiếu dữ liệu onboarding để xác định chắc chắn → kích hoạt cơ chế "hỏi bổ sung" (mục 7).

## 6. Onboarding — 4 nhóm câu hỏi (bảng `customer_profiles`)

- **A. Định danh & liên hệ** — tên công ty, ngành, quy mô.
- **B. Đặc điểm dữ liệu xử lý** (nhóm cốt lõi, gatekeeper) — có xử lý dữ liệu nhạy cảm không, mục đích sử dụng, có chuyển dữ liệu ra nước ngoài không, có chia sẻ với bên thứ ba không, loại dữ liệu đặc biệt.
- **C. Hạ tầng & bên thứ ba** — server đặt ở đâu, dùng dịch vụ cloud nào, đối tác nào có quyền truy cập dữ liệu.
- **D. Cơ cấu tổ chức** — danh sách phòng ban + người đầu mối từng phòng (dùng để route task ở bước giao việc).

**Nguyên tắc thiết kế quan trọng**: bộ câu hỏi là **tập thuộc tính tái sử dụng được**, tổ chức theo `cum_phap_ly` — thêm một cụm luật mới (vd thuế, lao động) không cần build lại form onboarding, chỉ cần thêm field mới vào nhóm tương ứng.

## 7. Cơ chế "hỏi bổ sung"

Khi rule engine trả về `"Chưa đủ thông tin"` cho một thẻ, hệ thống tạo câu hỏi cụ thể gắn với thẻ đó và hiển thị cho khách hàng (dạng Có / Không / Chưa chắc). Trả lời xong → rule engine chạy lại **ngay** cho riêng thẻ đó (không chạy lại toàn bộ). Đây cũng là cơ chế dùng khi khách hàng đã onboard xong nhưng có thẻ mới cần thêm dữ liệu — không bắt onboard lại từ đầu.

## 8. Theo dõi liên tục — 2 trigger tự động quét lại

Vì Nexora là SaaS theo dõi liên tục, có 2 trigger:

1. **Thẻ mới/sửa được duyệt vào kho chung** → quét lại rule engine cho TẤT CẢ khách hàng hiện có.
2. **Khách hàng tự sửa profile** → quét lại riêng khách hàng đó.

**MVP 8 ngày**: mô phỏng trigger (1) bằng nút bấm tay **"Quét lại khách hàng hiện có"** thay vì cron/event job thật. Logic xử lý y hệt bản thật, chỉ khác cách kích hoạt — không viết 2 phiên bản logic khác nhau.

## 9. Thông báo — 2 giai đoạn

1. Người đầu mối tuân thủ được thông báo trước (có task chờ duyệt).
2. Sau khi người đầu mối duyệt → phòng ban liên quan được thông báo (có task mới được giao).

Build bảng `notifications` (in-app) **thật**. Gửi email qua Resend nếu kịp thời gian; nếu không kịp, chỉ trình bày bằng lời khi demo, không fake UI.

## 10. Schema DB tổng quan (Supabase/Postgres)

- `cards` — kho thẻ nghĩa vụ dùng chung (chi tiết ở mục 4).
- `customers` — thông tin công ty khách hàng.
- `customer_profiles` — câu trả lời onboarding (4 nhóm A–D, mục 6).
- `tasks` — task đã viết lại, gắn 1 card + 1 customer, có `trang_thai_duyet`.
- `approvals` — log ai duyệt gì, lúc nào (cả curator duyệt card và người đầu mối duyệt task).
- `pipeline_runs` — log MỌI lần chạy pipeline (input, output, model dùng, timestamp) — bắt buộc, dùng để audit/demo minh bạch.
- `notifications` — thông báo in-app.

**Row Level Security**: mỗi khách hàng chỉ truy cập được data của chính mình (`customer_id` match) — tách quyền ở **tầng database** (Supabase RLS policy), không tự code kiểm tra quyền ở tầng application.

## 11. Cấu trúc code pipeline

```
/lib/pipeline/
  extractCard.ts          # gọi AI (Groq) — trích xuất thẻ từ văn bản luật
  filterApplicability.ts  # KHÔNG gọi AI — rule engine thuần, so khớp điều kiện
  rewriteTask.ts          # gọi AI (Groq) — viết lại nội dung dễ hiểu
/app/api/pipeline/[step]/route.ts   # expose 3 bước trên qua API route
```

Mọi lần chạy (dù là bước AI hay bước rule engine) đều ghi vào `pipeline_runs`.

## 12. 2 bộ hồ sơ demo (dùng để test + trình bày)

1. **Công ty TNHH ABC Logistics** (45 nhân viên) — thuê server nước ngoài, chạy ads nhắm mục tiêu → nghĩa vụ liên quan: chuyển dữ liệu ra nước ngoài, xác nhận đồng ý quảng cáo → giao phòng Marketing/Vận hành.
2. **Phòng khám Nha khoa Smile Care** (25 nhân viên) — xử lý dữ liệu sức khỏe, chia sẻ dữ liệu với bên bảo hiểm → nghĩa vụ liên quan: thỏa thuận chia sẻ dữ liệu (DPA) → giao phòng Kế toán/Bảo hiểm.

Cả hai dùng **chung một pipeline**, chỉ khác câu trả lời onboarding — mục đích là chứng minh hệ thống tổng quát hóa được, không hard-code riêng theo ngành.

## 13. Phạm vi MVP Vòng 3 — build thật vs mô phỏng

| Thành phần | Trạng thái MVP |
|---|---|
| Trích xuất thẻ từ luật (AI) | Build thật |
| Duyệt thẻ vào kho (curator) | Build thật |
| Lọc theo điều kiện (rule engine, 4 trạng thái) | Build thật |
| Viết lại task (AI) | Build thật |
| Duyệt task (người đầu mối) | Build thật |
| Quét lại khi có thẻ mới | Mô phỏng — nút bấm tay (mục 8) |
| Thông báo in-app | Build thật |
| Thông báo email | Build thật nếu kịp, không thì mô phỏng bằng lời |
| Xác minh bằng chứng hoàn thành task | Mô phỏng — chỉ có nút đính kèm file, chưa kiểm tra nội dung |
| Nhắc hạn / escalation khi quá hạn | Chưa build — chỉ nêu trong roadmap khi trình bày |

## 14. Quy ước code

- Ngôn ngữ giao diện: **Tiếng Việt** (toàn bộ copy, nhãn, thông báo).
- TypeScript **strict mode**.
- Tên field trong DB: `snake_case` (chuẩn Postgres/Supabase).
- Tên biến/hàm trong TS: `camelCase`.
- Mọi lệnh gọi AI đều đi qua **Vercel AI SDK + Zod schema** để ép output có cấu trúc — không gọi Groq API trực tiếp bằng `fetch` tay, không parse JSON từ text tự do.
- Không thêm thư viện/service ngoài danh sách ở mục 2 trừ khi thực sự cần và vẫn giữ được chi phí $0 cho demo.

## 15. Quy trình build

Thứ tự thi công 10 bước xem docs/BUILD_PROCESS.md — đọc khi cần biết build gì trước, đặc biệt ở bước data modeling và API contract.
