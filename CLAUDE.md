# CLAUDE.md — HTTT xác định nghĩa vụ tuân thủ cho SME (đồ án MIS, UEH)

> Áp dụng từ 09/11/2026 trên nhánh `mis/rebuild`. Nguồn đúng duy nhất: `docs/mis/HE_THONG_DA_CHOT.md`
> (ghi "§n" bên dưới là số mục trong file đó). Hiện trạng code + DB trước can thiệp: `docs/mis/UNDERSTANDING.md`,
> `research/baseline/SUMMARY.md`. Kế hoạch thi công: `docs/mis/PLAN.md`.
> Bản SpawnX cũ (cards/tasks, extractCard.ts, rewriteTask.ts) đã chết: `docs/archive/CLAUDE.spawnx.md`, tag `spawnx-final`.
> Có xung đột giữa file này và HE_THONG_DA_CHOT.md → theo HE_THONG_DA_CHOT.md và báo lại. Bản trong repo là bản chuẩn
> duy nhất (v1.1, 09/11); thay đổi thiết kế ghi ở "Nhật ký thay đổi thiết kế" cuối file đó.

## 1. Bài toán và ranh giới L3 (§1)

Với mỗi cặp *doanh nghiệp × quy định trong thư viện*, trả **một** trong ba kết luận:
**áp dụng** · **không áp dụng** · **cần bổ sung thông tin** — kèm điều khoản căn cứ, các trường hồ sơ và giá trị
đã dùng, lý do (nếu cần bổ sung), phòng ban nhận việc, thời hạn (nếu văn bản quy định).
`sap_ap_dung` là biến thể của "áp dụng" khi ngày hiệu lực sau ngày đánh giá (§8).

Hệ thống **không**: tính số thuế · hướng dẫn cách thực hiện nghĩa vụ hay đề xuất phương án (kể cả tối ưu thuế) ·
nộp hồ sơ thay · tự xác định dữ kiện cần phán đoán pháp lý (T4) · tự phát hiện văn bản mới.
Không viết chữ nào trong giao diện, prompt hay nội dung việc mang tính tư vấn hoặc đề xuất hành động.

## 2. Phạm vi văn bản (§2)

| Văn bản | Vai trò |
|---|---|
| Luật Doanh nghiệp 59/2020/QH14, sửa đổi 03/2022/QH15, 76/2025/QH15 | Điều kiện theo loại hình; nghĩa vụ đăng ký, thông báo thay đổi có thời hạn |
| Luật Thuế TNDN 67/2025/QH15 + các luật sửa đổi (có 09/2026/QH16) | Ngưỡng doanh thu, loại trừ, ưu đãi |
| Luật Quản lý thuế 108/2025/QH15 (hiệu lực 01/7/2026) | Thủ tục khai, nộp, thời hạn. **Nạp toàn văn** |
| NĐ 252/2026/NĐ-CP, TT 90/2026/TT-BTC | **Chưa quyết có nạp.** Không nạp → nghĩa vụ 108 dẫn chiếu sang đó là C5, `thu_vien_chua_du` |
| TT 77/2025/TT-BTC, Luật 109/2025/QH15 | **Chỉ là dữ liệu trước can thiệp.** Không nạp sang CSDL mới, không viết logic riêng |

- Văn bản nạp **phải là bản hợp nhất** (§2.3). S2 làm thủ công: ghi khoản nào bị sửa, bởi văn bản nào, từ ngày nào.
- LDN, TNDN: không nạp toàn văn, 25–40 quy định chọn theo §2.2. Quy định C0 chỉ giữ vài mục làm đối chứng.
- Luật 108 trên CSDL mới: 9 điều cũ nạp lại **đúng đề xuất cũ của LLM** ở `cho_duyet` (không chạy lại extract); các điều còn lại trích xuất mới.

## 3. Hai vòng S1–S10 và file code (§4, §5)

Đánh số theo sườn báo cáo và `nexora-pipeline-cai-tien.html`. **Không** dùng sơ đồ tiếng Anh ngày 06/11.

**Vòng 1 — xây thư viện (một lần cho mỗi văn bản), S1–S8**

| # | Giai đoạn | Code / nơi làm |
|---|---|---|
| S1 | Thu nhận, chuẩn hóa | `lib/van-ban-parse.ts`, màn `app/(curator)/nhap-van-ban` |
| S2 | Hợp nhất sửa đổi, xác định hiệu lực | Chuyên viên (thủ công); `van_ban.ngay_hieu_luc`, `van_ban_thay_the` |
| S3 | Parse Chương / Điều / Khoản / Điểm | `lib/parse-van-ban.ts` (hiện chỉ tách theo "Điều N.") |
| S4 | Giải dẫn chiếu nội bộ / ngoại bộ | Cạnh `tham_chieu`, `target_ref_text` (chưa giải) |
| S5 | Trích khung deontic — **LLM chỉ đề xuất** | `lib/pipeline/extractEntities.ts` (+ `.prompt.ts`, `.schema.ts`), `POST /api/pipeline/extract` |
| S6 | Gán mã điều kiện C0–C7 | MVP: chuyên viên gán (chưa có cột — xem PLAN.md) |
| S7 | Kiểm trích dẫn nguyên văn, schema, vai; định tuyến; người duyệt | `lib/pipeline/grounding.ts`; RPC `approve_entity` / `approve_chunk`; `components/nexora/draft-review.tsx`, `dieu-kien-editor.tsx` |
| S8 | Thư viện nghĩa vụ đã duyệt | `entities` (`hanh_vi` = nghĩa vụ) + `entity_relationships` của `van_ban` `active` |

**Vòng 2 — đối chiếu từng doanh nghiệp, S9–S10, không dùng LLM**

| # | Giai đoạn | Code / nơi làm |
|---|---|---|
| S9 | Phân giải khả áp dụng | `lib/pipeline/ruleEngine.ts` (thuần) + `lib/pipeline/filterDomain.ts` (đọc DB, ghi `diagnostics`); `phanBoDiagnostic.ts`, `quetNguoc.ts`; API `pipeline/filter`, `pipeline/rescan`, `onboard` |
| S10 | Giải trình, nhật ký | `lib/pipeline/runs.ts` → `pipeline_runs`; `diagnostics.filter_run_id`; `approvals` |
| sau S10 | Soạn nội dung việc (LLM), người đầu mối duyệt, giao phòng ban, hỏi bổ sung | `lib/pipeline/generateDiagnostic.ts`, RPC `approve_diagnostic`, `notifications`, `components/nexora/hoi-bo-sung.tsx`, màn `hop-thu` |

Mọi điểm kích hoạt Vòng 2 (onboard, rescan, filter 1 nghĩa vụ) đi qua **một** hàm `filterDomain` (test `tests/doiXung.test.ts`).

## 4. Định tuyến sau S6: không mục nào bỏ qua duyệt (§4 điểm 2–3)

Mã điều kiện chỉ quyết định **loại thao tác duyệt**, không quyết định có duyệt hay không:

| Mã | Thao tác của chuyên viên trước khi vào S8 |
|---|---|
| C0 | Xác nhận phạm vi chung (`pham_vi = chung`) |
| C1–C3 | Viết điều kiện máy đọc `{thuoc_tinh, toan_tu, gia_tri}` |
| C4–C7 | Gắn cờ không hình thức hóa; ghi văn bản được dẫn chiếu (C4/C5); C7 ghi tường minh thì đổi mã (có vết) |

**Không** làm theo quy tắc "C0–C2 tự vào thư viện" trong `nexora-pipeline-cai-tien.html`.

## 5. Quy tắc S9 (§8)

Đầu vào: 1 nghĩa vụ đã duyệt, 1 hồ sơ, **ngày đánh giá**. Thứ tự:

1. Văn bản không thuộc lĩnh vực DN theo dõi → không áp dụng (`ngoai_linh_vuc`).
2. Đã hết hiệu lực tại ngày đánh giá (ngày hết hiệu lực, bị thay thế) → không áp dụng.
3. Gom chủ thể + điều kiện nối với nghĩa vụ (cạnh `dieu_kien` vào, `ap_dung_cho` ra). Phân loại từng cái:
   - C0 **đã xác nhận** `pham_vi = chung` → không thêm điều kiện;
   - C1–C3 có điều kiện máy đọc → đúng / sai / trống;
   - C4–C7 gắn cờ không hình thức hóa → chưa xác định;
   - chưa phân loại, chưa xác nhận → chưa xác định.
4. Nối AND. **Một điều kiện sai thắng điều kiện thiếu** → không áp dụng.
5. Còn điều kiện chưa xác định hoặc trường trống → **cần bổ sung**, kèm lý do.
6. Ngoại lệ **chỉ xét khi điều kiện gốc thỏa**. Hai loại:
   - **bác bỏ** (`ngoai_le_bac_bo`): điều kiện ngoại lệ thỏa → không áp dụng, không có gì thay;
   - **thay thế** (`ngoai_le_thay_the`): điều kiện ngoại lệ thỏa → nghĩa vụ gốc không áp dụng, **phải xét tiếp** nghĩa vụ thay thế;
   - cạnh ngoại lệ có cờ **`chi_mot_phan`** (loại trừ một loại thu nhập, vd TNDN Đ18 k3): **không** bác bỏ gốc, gốc xét
     tiếp; nghĩa vụ ngoại lệ (X3) có kết luận riêng cho phần đó;
   - xét hết ngoại lệ: bác bỏ / thay thế đã thỏa thắng ngoại lệ chưa xác định; còn chưa xác định → cần bổ sung; không → áp dụng.
7. Còn lại → áp dụng (`sap_ap_dung` nếu ngày hiệu lực sau ngày đánh giá).

Mỗi cặp DN × nghĩa vụ **một** kết luận; không chia theo phần thu nhập. Thời hạn (P0): nguyên văn trong luật + ngày sự kiện
DN đã khai — **không tự tính ngày hạn** (P1).

**`dieu_kien_may_doc = null` KHÔNG có nghĩa là áp dụng cho mọi doanh nghiệp.** Chỉ áp dụng cho mọi DN khi chuyên
viên đã xác nhận `pham_vi = chung`. Dữ liệu cũ có `pham_vi` null = chưa xác nhận. Không được `continue` bỏ qua một
điều kiện chưa mã hóa (lỗi cũ ở `ruleEngine.ts` `ghepDieuKien` và `filterDomain.ts` `.not("dieu_kien_may_doc","is",null)`).

Ba lý do của "cần bổ sung":

| `ly_do` | Khi nào | Ai xử lý |
|---|---|---|
| `thu_vien_chua_du` | C4/C5 mà văn bản đích chưa nạp; chủ thể chưa xác nhận phạm vi; C7 chưa ghi tường minh | Chuyên viên (Vòng 1) |
| `ho_so_thieu` | Trường hồ sơ của điều kiện C1–C3 trống hoặc "không chắc" | Người đầu mối |
| `can_chuyen_mon` | C6; dữ kiện T4 | Người đầu mối → chuyên gia ngoài hệ |

Kết luận "cần bổ sung" **luôn tạo bản ghi và gửi người đầu mối**, không phụ thuộc phòng ban (§6.2). "Áp dụng" mà DN
không có phòng khớp và không có Ban giám đốc → dòng **chưa gắn phòng**, người đầu mối chọn khi duyệt. Không thêm mã phòng
ban ngoài 8 mã `slug_phong_ban` (vd "Hành chính" → `van_hanh`).
S10 ghi bản ghi mới, không sửa kết luận cũ; lưu ngày đánh giá, phiên bản thư viện, bản chụp giá trị hồ sơ đã dùng (§12 thay đổi 6).

Bộ test hồi quy chính của S9: ba doanh nghiệp A, B, C ở §10 (kết quả mong đợi §10.4).

## 6. Bộ mã C0–C7 và hồ sơ T0–T3 (§9)

| Mã | Nghĩa | Máy kết luận? | Kết luận S9 |
|---|---|---|---|
| C0 | Áp dụng mọi đối tượng của văn bản | Có, sau khi xác nhận `pham_vi = chung` | Áp dụng |
| C1 | Ngưỡng định lượng (doanh thu ≤ 3 tỷ) | Có (T1) | Đúng/sai; trống → `ho_so_thieu` |
| C2 | Phân loại dứt khoát (loại hình, phương pháp nộp thuế) | Có (T0, T2) | Như C1 |
| C3 | Theo sự kiện (thay đổi + ngày) | Có (T3) | Như C1; hạn tính từ ngày sự kiện |
| C4 | Dẫn chiếu ra văn bản khác | Không, đến khi văn bản đích được nạp | `thu_vien_chua_du` |
| C5 | Giao văn bản dưới luật quy định | Không, đến khi nghị định được nạp | `thu_vien_chua_du` |
| C6 | Thuật ngữ định tính | Không | `can_chuyen_mon` |
| C7 | Điều kiện ngầm từ phạm vi chương/mục | Không (đọc riêng câu) | `thu_vien_chua_du`; ghi tường minh → C2 |

Bộ mã là **bản nháp v1** — không cứng hóa danh sách mã thành enum không mở rộng được.

Hồ sơ (§9.2) — nguyên tắc: (1) chỉ hỏi trường có quy định C1–C3 **đã duyệt** dùng (form sinh từ thư viện, không danh
sách cứng); (2) hỏi dữ kiện, không hỏi kết luận pháp lý; (3) không hỏi T4; (4) hỏi **khoảng** cắt tại ngưỡng trong thư
viện, không hỏi số; (5) sự kiện hỏi có/không (+ ngày), không hỏi chi tiết; (6) mỗi câu hiện điều khoản cần nó; (7) mọi
trường điều kiện có "Không chắc" và "Không muốn trả lời" → cả hai null → `ho_so_thieu`, lý do để trống lưu riêng.

| Phần | Trường |
|---|---|
| 1 — khi đăng ký | Loại hình (T0); niêm yết (chỉ CTCP, chỉ nếu LDN Đ31 k1 được chọn); chi nhánh / VPĐD / địa điểm KD (ứng viên); phương pháp nộp thuế TNDN; kỳ tính thuế TNDN; khai thuế tháng / quý (ứng viên); phòng ban + người đầu mối |
| 2 — chỉ qua hỏi bổ sung khi S9 cần | Doanh thu kỳ trước: ≤3 tỷ / >3–50 tỷ / >50 tỷ / chưa có kỳ trước; nhóm thu nhập TNDN Đ18 k3 a/b/c (chỉ khi ≤50 tỷ; điểm d là C5); đổi ngành nghề / thông tin đăng ký + ngày; đổi cổ đông NĐT nước ngoài + ngày (chỉ CTCP); chuyển nhượng vốn / dự án (ứng viên) |
| Không hỏi (T4) | Quan hệ liên kết (TNDN Đ18 k4), chủ sở hữu hưởng lợi → `can_chuyen_mon`. Bỏ `co_giao_dich_lien_ket`, bỏ VSIC |

Trường "ứng viên" chỉ chốt sau khi nạp toàn văn Luật 108 và gán mã.

## 7. Ranh giới không được vi phạm

- **LLM không bao giờ ghi thẳng vào thư viện.** Mọi entity và cạnh LLM đề xuất ở `cho_duyet`; chỉ sang `da_duyet`
  qua `approve_*` với một người dùng thật (`auth.uid()`). Không viết code, script, seed hay migration nào đi vòng qua
  bước này — kể cả "cho tiện demo", kể cả bật cờ `nexora.seed`. Nạp lại dữ liệu sang DB mới cũng chỉ nạp ở `cho_duyet`.
- **S9 (`ruleEngine.ts` + `filterDomain.ts`) là code thuần, không gọi LLM.** `pipeline_runs` của bước filter có
  `model = null` (CSDL ép bằng CHECK `pipeline_runs_rule_engine_khong_ai`).
- **LLM ở `generateDiagnostic` chỉ nêu**: nghĩa vụ, điều khoản căn cứ, thời hạn, phòng ban nhận. Không đề xuất cách
  làm, không lời khuyên pháp lý. Người đầu mối duyệt trước khi giao.
- **Hồ sơ chỉ thu T0–T3.** Không thêm câu hỏi T4.
- **Phân quyền ở tầng DB bằng RLS** (+ GRANT theo cột, trigger). Không kiểm quyền ở tầng ứng dụng thay cho RLS.
- Mọi lượt chạy (extract, filter, generate) ghi `pipeline_runs`.

## 8. Lịch (§2.4, §14.1)

| Mốc | Ngày |
|---|---|
| Migration thay đổi 1–5 (§12) | 12/11 |
| Sửa định tuyến "cần bổ sung"; form T0–T3 | 13/11 |
| Sửa S9 (chưa xác nhận ≠ áp dụng, ngoại lệ, ngày đánh giá, hết hiệu lực) | 14/11 |
| **Điểm cắt**: chưa có số đo sau can thiệp → dừng code, viết báo cáo bằng số trước can thiệp | **15/11** |
| Nháp chữ 18/11 · **code freeze** | **19/11** |
| Turnitin 20/11 · **nộp LMS** | **21/11** |

## 9. Quy ước code

- Giao diện tiếng Việt (chữ đặt ở `lib/copy.ts`, skill `nexora-content`).
- TypeScript strict. DB `snake_case`; TS `camelCase`.
- Mọi lệnh gọi LLM qua Vercel AI SDK + Zod schema (Groq `openai/gpt-oss-120b`). Không `fetch` tay, không parse JSON từ text tự do.
- Migration mới đánh số từ `007_…`, idempotent, có ghi chú cách xử lý dữ liệu cũ. Test: `npm test` (`node --test tests/*.test.ts`).
- Next.js 16 khác dữ liệu huấn luyện — đọc `AGENTS.md` và `node_modules/next/dist/docs/` trước khi viết code Next.
- Không thêm thư viện/dịch vụ ngoài stack hiện có (Next.js, Supabase, Groq, Vercel) nếu không thật cần.

## 10. Môi trường

- `.env.local` hiện trỏ Supabase **production** (chung bản demo SpawnX). Đã chốt dùng **project Supabase mới** cho MIS;
  Production (`main`) giữ project cũ + cron keep-alive. Không chạy migration/ghi dữ liệu lên project cũ.
- Không push lên GitHub khi chưa hỏi chủ repo. Push nhánh = Vercel tạo preview deployment.

## 11. Không làm

- Landing page; chỉnh giao diện ngoài phần P0 cần.
- §14.3: tự phát hiện văn bản mới · hợp nhất tự động · giải dẫn chiếu ngoại bộ trên toàn bộ văn bản · lịch hạn và
  nhắc việc tự động · ghi nhận bằng chứng hoàn thành nghĩa vụ.
- Tài liệu lỗi thời (có dòng "LỖI THỜI" ở đầu): `supabase/schema.sql`, `supabase/seed*.sql`, `docs/api-contract.md`,
  `docs/CONTRACT.md`, `docs/BUILD_PROCESS.md`, `docs/TODO-frontend.md` — không làm theo.
