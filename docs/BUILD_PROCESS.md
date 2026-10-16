# Quy trình build Nexora Compliance Navigator — thứ tự 10 bước

> File này là **lộ trình thi công** cho MVP Vòng 3 (deadline 24/10). Nó bổ sung cho `CLAUDE.md`:
> - `CLAUDE.md` = *hệ thống này LÀ gì* (kiến trúc, schema, ranh giới an toàn).
> - `BUILD_PROCESS.md` (file này) = *build theo THỨ TỰ nào* để không trả giá ở bước sau.
>
> Nguyên tắc gốc: đừng vẽ UI trước khi chốt dữ liệu; đừng gắn backend ở phút chót. Với 8 ngày và 2 người code
> song song (vibe-code bằng Claude Code/Codex), thứ tự sai = merge xong gãy, sát deadline mới phát hiện.

---

## PHẦN 1 — 10 BƯỚC THEO THỨ TỰ

### Bước 0 — Discovery (đã xong ở Vòng 2, chốt lại 1 lần cho cả team)
- **Ai dùng:** SME Việt Nam (20–50 nhân viên) không có bộ phận pháp chế riêng — người đầu mối tuân thủ thường là kế toán trưởng hoặc chủ doanh nghiệp kiêm nhiệm.
- **Trước khi có Nexora họ làm gì:** không biết nghị định mới có áp dụng cho mình không → hoặc bỏ mặc tới khi bị phạt, hoặc thuê luật sư tư vấn theo vụ (đắt, chậm, không liên tục).
- **Thắng cách cũ ở đâu:** tự động phát hiện khi có nghĩa vụ mới áp dụng cho đúng công ty đó, dịch điều luật thành việc cụ thể giao đúng phòng ban, theo dõi liên tục — thay vì tra cứu một lần rồi thôi.

> Chốt: nếu một tính năng không phục vụ 3 câu trên thì đẩy sang mục "Sau này", không build trong 8 ngày.

### Bước 1 — Requirements → cắt MVP (đã chốt, xem `CLAUDE.md` mục 13)
Build thật trong Vòng 3:
- Trích xuất thẻ từ luật (AI) · Duyệt thẻ vào kho (curator) · Rule engine 4 trạng thái · Viết lại task (AI) · Duyệt task (người đầu mối) · Thông báo in-app.

Hoãn sang "Sau này" (chỉ nêu khi trình bày, **không code**):
- Thông báo email (build nếu dư giờ) · Xác minh bằng chứng hoàn thành · Nhắc hạn/escalation · Cron/event job thật (MVP dùng nút "Quét lại" bấm tay).

> Quy tắc: đụng tới thứ gì trong danh sách hoãn → dừng, hỏi lại team, đừng để nó ăn mất thời gian của 6 hạng mục bắt buộc.

### Bước 2 — Data modeling TRƯỚC khi vẽ UI (bước khóa chung, làm cùng nhau)
Đây là bước 2 người **bắt buộc ngồi chung**, vì nó là hợp đồng giữa 2 track. Phần lớn đã có trong `CLAUDE.md` mục 4 + 10. Việc cần làm cụ thể:
- Viết migration SQL cho cả 7 bảng: `cards`, `customers`, `customer_profiles`, `tasks`, `approvals`, `pipeline_runs`, `notifications`.
- **Chốt format `dieu_kien_ap_dung` (jsonb)** — đây là thứ dễ làm lệch nhất. Track B viết rule engine đọc đúng format này; sai là ráp vào gãy. Ví dụ thống nhất:

```json
// cards.dieu_kien_ap_dung — rule engine so khớp field này với customer_profiles
{
  "chuyen_du_lieu_ra_nuoc_ngoai": true,
  "xu_ly_du_lieu_nhay_cam": true,
  "nganh": ["y_te", "tai_chinh"]   // null hoặc bỏ = áp dụng mọi ngành
}
```

- **Câu hỏi concurrent bắt buộc trả lời:** 2 curator cùng duyệt 1 thẻ trong 1 giây → ai thắng? (giải: khóa theo `trang_thai_duyet`, chỉ cho chuyển trạng thái nếu đang là "Chờ duyệt"). Ghi câu trả lời vào comment trong file migration.

> Đã làm bước này một phần ở các tin trước. Khi Claude Code viết migration, bám đúng tên field snake_case trong `CLAUDE.md`, không tự đổi tên.

### Bước 3 — Kiến trúc: đã chốt có chủ đích (viết lại 1 đoạn vào README)
- **Backend:** cần DB thật, không dùng Sheets — vì có RLS tách dữ liệu từng khách hàng, nhiều bản ghi, nhiều người ghi (curator duyệt thẻ, khách hàng sửa profile). → Supabase Postgres.
- **Auth:** cần user thật (curator, người đầu mối mỗi khách hàng) → Supabase Auth, không ẩn danh. Phân quyền ở **tầng DB bằng RLS**, không tự check quyền ở application.
- **AI:** Groq `openai/gpt-oss-120b`, luôn qua Vercel AI SDK + Zod, không fetch tay.
- **Hosting:** Vercel Hobby. Toàn bộ free tier, chi phí demo = $0.

### Bước 4 — Thiết kế API contract TRƯỚC khi build UI (tạo file `docs/api-contract.md`)
Viết rõ mỗi endpoint nhận gì / trả gì trước khi viết component gọi nó. Lợi ích lớn nhất cho team 2 người: **cả 2 track build UI bằng mock data theo đúng contract, không ai phải chờ ai xong backend.** Khung tối thiểu:

```
# Track A — kho thẻ
POST /api/pipeline/extract
  body: { van_ban_luat: string }
  → 200 { cards: [{ noi_dung_goc, dieu_khoan, cum_phap_ly, dieu_kien_ap_dung, ... }] }  // draft, trang_thai_duyet = "Chờ duyệt"

POST /api/cards/:id/approve
  → 200 { id, trang_thai_duyet: "Đã duyệt" }
  → 409 nếu thẻ không còn ở trạng thái "Chờ duyệt" (case concurrent, hay bị quên)

# Track B — khách hàng
POST /api/customers/:id/onboard
  body: { nhom_A, nhom_B, nhom_C, nhom_D }   // 4 nhóm câu hỏi, CLAUDE.md mục 6
  → 200 { profile_id }

POST /api/pipeline/filter
  body: { customer_id }
  → 200 { ket_qua: [{ card_id, trang_thai: "Áp dụng"|"Sắp áp dụng"|"Không áp dụng"|"Chưa đủ thông tin" }] }

POST /api/tasks/:id/approve
  → 200 { id, trang_thai_duyet: "Đã duyệt" }   // kích hoạt thông báo xuống phòng ban
```

> Mỗi lần gọi `/api/pipeline/*` đều ghi `pipeline_runs` (input, output, model, timestamp) — bắt buộc, dùng để demo minh bạch.

### Bước 5 — Wireframe → Design system → Hi-fi (bước khóa chung thứ 2, trước khi tách track)
Trước khi 2 người tách ra code UI riêng, dựng chung **1 bộ giao diện nền tảng** để demo không nhìn như 2 app ghép lại:
- Bảng màu + font cố định (sản phẩm B2B compliance → tông nghiêm túc, tin cậy; tránh màu quá nổi).
- Cài **shadcn/ui** 1 lần (chạy trên Tailwind v4 đã có) — cả 2 người import từ đó ra, không ai tự vẽ lại nút/bảng.
- Component dùng chung bắt buộc: **badge 4 trạng thái** (Áp dụng / Sắp áp dụng / Không áp dụng / Chưa đủ thông tin) — cả 2 track đều hiển thị trạng thái này ở nhiều nơi, phải thống nhất 1 chỗ.

> Bước này diễn ra **sau** bước 2–4, không phải đầu tiên. Người mạnh UI/UX đứng ra chốt bộ nền tảng này.

### Bước 6 — Build: backend/data layer song song, KHÔNG để sau cùng
- Chạy migration + **seed 5–10 thẻ mẫu** thẳng vào bảng `cards` (trạng thái "Đã duyệt", viết tay `dieu_kien_ap_dung`) **ngay sau bước 2**.
- Nhờ seed đó, Track B code rule engine được song song mà không cần đợi Track A xong pipeline trích xuất thật.
- UI chỉ đổi từ mock data → API thật, **không đổi cấu trúc** (vì đã theo contract bước 4).

### Bước 7 — Test critical path trước khi ship (không cần test suite đầy đủ)
Test tay 2 luồng end-to-end mỗi lần đổi code lớn, dùng đúng 2 bộ demo trong `CLAUDE.md` mục 12:
1. **ABC Logistics** (thuê server nước ngoài, chạy ads) → ra nghĩa vụ chuyển dữ liệu ra nước ngoài + xác nhận đồng ý quảng cáo → giao Marketing/Vận hành.
2. **Smile Care** (dữ liệu sức khỏe, chia sẻ với bảo hiểm) → ra nghĩa vụ thỏa thuận chia sẻ dữ liệu → giao Kế toán/Bảo hiểm.

Luồng critical phải chạy thông: nhập luật → trích xuất → duyệt thẻ → onboard khách → rule engine → viết lại task → duyệt task → thông báo.

### Bước 8 — Deploy có kỷ luật
- Mỗi PR → Vercel tự tạo 1 bản **preview** riêng để xem thử, không ảnh hưởng bản chính.
- `main` = production, nối Vercel. **Không code thẳng, không sửa trực tiếp trên `main`.**
- Nhớ gắn biến môi trường (Supabase URL/key, Groq key) trong phần Environment Variables của Vercel — `.env.local` chỉ có ở máy, Vercel không đọc được file đó.

### Bước 9 — Sau khi ship: đo & lặp (ưu tiên thấp trong 8 ngày)
- Với MVP thi đấu, không cần Vercel Analytics ngay. "Analytics" của Nexora chính là bảng **`pipeline_runs`** — dùng nó để trình mentor: mỗi lần AI/rule engine chạy đều có log input–output, chứng minh hệ thống minh bạch, không phải hộp đen.
- Sau Vòng 3 mới tính tới analytics thật + các hạng mục đã hoãn ở bước 1.

---

## PHẦN 2 — AI AGENT LÀM GÌ Ở MỖI BƯỚC

> Đây là dự án vibe-code: 2 người điều khiển Claude Code/Codex. Dưới đây là cách giao việc cho agent ở từng bước để không bị "code nhanh nhưng sai hướng".

| Bước | Giao cho Claude Code | Người tự quyết, KHÔNG để agent tự chọn |
|---|---|---|
| 2 Data model | Viết migration SQL từ schema đã chốt | Format `dieu_kien_ap_dung`, cách xử lý concurrent |
| 4 API contract | Sinh khung route theo contract | Nội dung contract (nhận gì/trả gì) |
| 5 Design system | Cài shadcn, dựng component từ mô tả | Bảng màu, bố cục, trải nghiệm |
| 6 Build | Viết `extractCard.ts`, `filterApplicability.ts`, `rewriteTask.ts` | Ranh giới an toàn: AI KHÔNG tự duyệt, rule engine KHÔNG gọi AI (CLAUDE.md mục 3) |
| 7 Test | Viết critical-path checklist, chạy thử | Đọc kết quả, xác nhận đúng nghiệp vụ pháp lý |

**Ba ranh giới agent không được tự ý vượt** (đã ghi trong `CLAUDE.md`, nhắc lại vì vibe-code dễ trôi):
1. `filterApplicability.ts` là rule engine **thuần code**, không có bước AI nào chen vào.
2. Mọi output AI chỉ là **draft chờ người duyệt**, không tự chuyển "Chờ duyệt" → "Đã duyệt".
3. Mọi lần chạy pipeline đều ghi `pipeline_runs`.

Khi review PR của nhau, 3 điều trên là thứ phải soi kỹ nhất — đặc biệt **RLS policy**: sai 1 dòng là lộ dữ liệu khách hàng này sang khách hàng khác.

---

## PHẦN 3 — ÁP DỤNG NGAY (thứ tự 8 ngày)

1. **Ngày 1 (chung):** Bước 2 + 4 — chốt schema, viết migration 7 bảng, chốt `api-contract.md`, seed thẻ mẫu.
2. **Ngày 1–2 (chung):** Bước 5 — cài shadcn, chốt bảng màu + badge 4 trạng thái.
3. **Ngày 2 → tách track:**
   - Track A (kho thẻ): `extractCard.ts` + UI nhập luật + UI duyệt thẻ + kho thẻ.
   - Track B (khách hàng): form onboarding + `filterApplicability.ts` + `rewriteTask.ts` + UI duyệt task + hỏi bổ sung.
4. **Ngày 6–7 (chung):** ráp 2 track ở 2 chỗ nối — nút "Quét lại khách hàng hiện có" + chạy end-to-end 2 bộ demo (Bước 7).
5. **Ngày 7–8:** polish UI, chuẩn bị kịch bản demo, dựng `pipeline_runs` thành phần trình bày minh bạch.

> Rủi ro lớn nhất cần tránh: để Bước 2 (data modeling) bị nhảy cóc để "vẽ UI đẹp trước". Với Nexora, dữ liệu là xương sống —
> UI đẹp mà schema sai thì cả 2 track ráp vào gãy, và đó là lúc sát deadline 24/10.
