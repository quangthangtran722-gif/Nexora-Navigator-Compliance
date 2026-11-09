# Số liệu trước can thiệp (baseline)

> Sinh tự động bởi `scripts/research/snapshot-baseline.mjs` — **chỉ đọc**, không ghi DB.
> Đối chiếu với §13.1 `docs/mis/HE_THONG_DA_CHOT.md`. Dữ liệu thô: `research/baseline/raw/` (không commit).

| | |
|---|---|
| Ngày chụp | 2026-11-09T03:58:38.856Z (giờ VN: 10:58:38 9/11/26) |
| Ngày đánh giá S9 tính lại | 2026-11-09 |
| Commit | `9c62ff2` (nhánh `mis/rebuild`) |
| Supabase project | `qalexzctwbezrbhasuvp` |
| Số dòng đã đọc | van_ban 3 · chunks 18 · entities 108 · relationships 75 · customers 10 · departments 28 · diagnostics 203 · approvals 92 · pipeline_runs 138 · thuoc_tinh_ho_so 20 |

## 1. Văn bản và nghĩa vụ đã duyệt

| Văn bản | Trạng thái | Chunk | Nghĩa vụ (hanh_vi da_duyet) |
|---|---|---|---|
| 77/2025/TT-BTC | active | 5 | 7 |
| 108/2025/QH15 | active | 9 | 18 |
| 109/2025/QH15 | draft | 4 | 1 |

Nghĩa vụ đã duyệt thuộc văn bản `active`: **25**.

## 2. Luật 108: kết quả duyệt

Chunk: 9 (Điều 52; Điều 27; Điều 3; Điều 48; Điều 8; Điều 2; Điều 10; Điều 11; Điều 53)

| loai_entity | da_duyet | tu_choi | cho_duyet |
|---|---|---|---|
| hanh_vi | 18 | 13 | 0 |
| chu_the | 23 | 5 | 0 |
| doi_tuong | 1 | 1 | 0 |
| thoi_han | 3 | 1 | 0 |
| dieu_kien | 0 | 5 | 0 |

Entity có lịch sử approvals không khớp trạng thái hiện tại: **2**
- `0f725e21…4149` 108/2025/QH15 hanh_vi: hiện `tu_choi`, approvals da_duyet@2026-10-20T11:31:37.937619+00:00
- `ef98e4ad…654c` 108/2025/QH15 hanh_vi: hiện `tu_choi`, approvals da_duyet@2026-10-20T11:33:24.825846+00:00

Entity đã xử lý (không còn `cho_duyet`) mà không có dòng approvals nào: **0**

## 3. Điều kiện máy đọc

Tổng entity có `dieu_kien_may_doc`: **5** (đã duyệt: 5)

| Văn bản | loai_entity | ten_entity | Duyệt | dieu_kien_may_doc |
|---|---|---|---|---|
| 77/2025/TT-BTC | chu_the | Công ty chứng khoán | da_duyet | `{"gia_tri":"chung_khoan","toan_tu":"eq","thuoc_tinh":"nganh"}` |
| 77/2025/TT-BTC | chu_the | các cơ quan, tổ chức, cá nhân | da_duyet | `{"gia_tri":"chung_khoan","toan_tu":"eq","thuoc_tinh":"nganh"}` |
| 77/2025/TT-BTC | chu_the | Các tổ chức, cá nhân khác | da_duyet | `{"gia_tri":"chung_khoan","toan_tu":"eq","thuoc_tinh":"nganh"}` |
| 77/2025/TT-BTC | chu_the | Cơ quan quản lý thuế | da_duyet | `{"gia_tri":"chung_khoan","toan_tu":"eq","thuoc_tinh":"nganh"}` |
| 77/2025/TT-BTC | chu_the | Người nộp thuế | da_duyet | `{"gia_tri":"chung_khoan","toan_tu":"eq","thuoc_tinh":"nganh"}` |

Theo nội dung: `{"gia_tri":"chung_khoan","toan_tu":"eq","thuoc_tinh":"nganh"} | da_duyet` × 5

Chủ thể được xác nhận "chủ thể chung" qua `approve_entity` (tiền tố `[Chủ thể chung` trong approvals.ghi_chu): **0**.
Chủ thể đã duyệt, `dieu_kien_may_doc = null`, nối với nghĩa vụ active: **5**.

## 4. Δ — số tập nghĩa vụ "áp dụng" phân biệt (áp dụng + sắp áp dụng)

### 4a. Theo kết quả đã lưu (lượt `filter_domain` quét toàn bộ, hoàn tất gần nhất của mỗi DN)

DN có lượt quét: 10/10. **Δ = 4**

| Tập | Số nghĩa vụ áp dụng | Số DN | DN |
|---|---|---|---|
| Tập 1 | 18 | 4 | `a0000000…0002` nganh=y_te, domains=["thue"]<br>`a0000000…0001` nganh=cong_nghe_thong_tin, domains=["thue","ke_toan"]<br>`adadd658…066f` nganh=ban_le, domains=["thue","ke_toan","chung_khoan"]<br>`1cb6d25e…f07a` nganh=cong_nghe_thong_tin, domains=["thue","ke_toan"] |
| Tập 2 | 25 | 3 | `72f1368e…055e` nganh=chung_khoan, domains=["thue","ke_toan"]<br>`789fe490…5dcc` nganh=chung_khoan, domains=["thue","ke_toan","chung_khoan"]<br>`7a0209e9…4837` nganh=chung_khoan, domains=["thue","ke_toan","chung_khoan"] |
| Tập 3 | 19 | 2 | `359f001d…56d9` nganh=cong_nghe_thong_tin, domains=["thue","ke_toan"]<br>`6137ba33…cc45` nganh=null, domains=["thue"] |
| Tập 4 | 26 | 1 | `a0000000…0003` nganh=chung_khoan, domains=["thue","ke_toan","chung_khoan"] |

Kết quả lượt gần nhất theo trạng thái: ap_dung 211 · khong_ap_dung 35 · chua_du_thong_tin 7

### 4b. Tính lại hôm nay bằng `ruleEngine.ts` trên dữ liệu hiện tại

**Δ = 2**

| Tập | Số nghĩa vụ áp dụng | Số DN | DN |
|---|---|---|---|
| Tập 1 | 18 | 6 | `1cb6d25e…f07a` nganh=cong_nghe_thong_tin, domains=["thue","ke_toan"]<br>`359f001d…56d9` nganh=cong_nghe_thong_tin, domains=["thue","ke_toan"]<br>`6137ba33…cc45` nganh=null, domains=["thue"]<br>`a0000000…0001` nganh=cong_nghe_thong_tin, domains=["thue","ke_toan"]<br>`a0000000…0002` nganh=y_te, domains=["thue"]<br>`adadd658…066f` nganh=ban_le, domains=["thue","ke_toan","chung_khoan"] |
| Tập 2 | 25 | 4 | `72f1368e…055e` nganh=chung_khoan, domains=["thue","ke_toan"]<br>`789fe490…5dcc` nganh=chung_khoan, domains=["thue","ke_toan","chung_khoan"]<br>`7a0209e9…4837` nganh=chung_khoan, domains=["thue","ke_toan","chung_khoan"]<br>`a0000000…0003` nganh=chung_khoan, domains=["thue","ke_toan","chung_khoan"] |

Theo trạng thái (10 DN × 25 nghĩa vụ = 250 cặp): khong_ap_dung 35 · ap_dung 208 · chua_du_thong_tin 7

## 5. Bảng `diagnostics`

Theo `trang_thai_ap_dung`: **ap_dung 177** · **khong_ap_dung 26** (tổng 203; thuộc nghĩa vụ active: 194)

| trang_thai_ap_dung / trang_thai_duyet | Số dòng |
|---|---|
| ap_dung / cho_duyet | 173 |
| ap_dung / da_duyet | 4 |
| khong_ap_dung / cho_duyet | 26 |

"Cần bổ sung" engine đã tính ở lượt gần nhất nhưng **không** thành dòng diagnostic: **7**
- `6137ba33…cc45` nganh=null, domains=["thue"]: 7 — ghi chú: Không có phòng ban khớp và không có Ban Giám đốc → không tạo diagnostic

Mọi lượt `filter_domain` (kể cả lượt cũ, lượt 1 entity) có kết quả `chua_du_thong_tin`: 28 kết quả, trong đó 7 không gắn diagnostic nào.

Tỉ lệ cần bổ sung (đã lưu, lượt gần nhất): 7/253 = 2.8% cặp; trong bảng `diagnostics`: 0/203.

## 6. Tỉ lệ tất định câm

Định nghĩa (§14.4): nghĩa vụ được kết luận áp dụng / không áp dụng mà không có điều kiện đã xác nhận / tổng số nghĩa vụ.
Cách đếm ở đây: nghĩa vụ active **không** có điều kiện máy đọc hiệu lực nào **và không** nối với chủ thể đã xác nhận "chung".

**18 / 25 = 72.0%**

| Văn bản | Tất định câm | Nghĩa vụ active |
|---|---|---|
| 77/2025/TT-BTC | 0 | 7 |
| 108/2025/QH15 | 18 | 18 |

## 7. Hồ sơ doanh nghiệp

- Từ điển `thuoc_tinh_ho_so`: **20** mã; trong đó 2 mã lấy từ cột (`nganh`, `quy_mo`) nên form không hỏi lại → form hỏi **18** thuộc tính.
- Trường cố định: 5 (`ten_cong_ty`, `ma_so_thue`, `nganh`, `quy_mo`, `domains`).
- S9 thật sự dùng: `domains` (quy tắc 1) + `nganh` → **2**.
- Thuộc tính T4 còn trong từ điển: `co_giao_dich_lien_ket`.
- Doanh nghiệp: 10; phòng ban: 28.

| DN | Số key thuoc_tinh | Key null (không chắc) | Phòng ban (slug) |
|---|---|---|---|
| `1cb6d25e…f07a` nganh=cong_nghe_thong_tin, domains=["thue","ke_toan"] | 17 | 1 | nhan_su, ban_giam_doc, kinh_doanh, ke_toan |
| `359f001d…56d9` nganh=cong_nghe_thong_tin, domains=["thue","ke_toan"] | 13 | 13 | nhan_su, ke_toan |
| `6137ba33…cc45` nganh=null, domains=["thue"] | 0 | 0 | ke_toan |
| `72f1368e…055e` nganh=chung_khoan, domains=["thue","ke_toan"] | 17 | 17 | ban_giam_doc, kinh_doanh, ke_toan |
| `789fe490…5dcc` nganh=chung_khoan, domains=["thue","ke_toan","chung_khoan"] | 12 | 2 | ke_toan, ban_giam_doc, kinh_doanh |
| `7a0209e9…4837` nganh=chung_khoan, domains=["thue","ke_toan","chung_khoan"] | 10 | 0 | kinh_doanh, ke_toan, ban_giam_doc |
| `a0000000…0001` nganh=cong_nghe_thong_tin, domains=["thue","ke_toan"] | 17 | 0 | ke_toan, nhan_su, kinh_doanh, ban_giam_doc |
| `a0000000…0002` nganh=y_te, domains=["thue"] | 10 | 1 | van_hanh, ke_toan, ban_giam_doc |
| `a0000000…0003` nganh=chung_khoan, domains=["thue","ke_toan","chung_khoan"] | 7 | 0 | phap_che, kinh_doanh, ke_toan, ban_giam_doc |
| `adadd658…066f` nganh=ban_le, domains=["thue","ke_toan","chung_khoan"] | 18 | 4 | nhan_su |

## 8. Đối chiếu với §13.1 (HE_THONG_DA_CHOT.md, số ngày 08/11)

| Mục §13.1 | Ghi ở §13.1 | Đo lần này | Khớp? |
|---|---|---|---|
| Văn bản đang chạy | 108/2025/QH15 (9 chunk), 77/2025/TT-BTC | 77/2025/TT-BTC (5 chunk), 108/2025/QH15 (9 chunk) | ✅ |
| Nghĩa vụ đã duyệt (văn bản active) | 25 (18 Luật 108, 7 TT 77) | 25 (18 Luật 108, 7 TT 77) | ✅ |
| Luật 108: hành vi duyệt / từ chối | 18 / 13 | 18 / 13 | ✅ |
| Luật 108: chủ thể duyệt / từ chối | 23 / 5 | 23 / 5 | ✅ |
| Luật 108: điều kiện | 5, đều từ chối | 5, từ chối 5 | ✅ |
| Điều kiện máy đọc | 5, tất cả {nganh = chung_khoan}, 5 chủ thể TT 77 | 5 (đã duyệt 5); tất cả nganh = chung_khoan trên chủ thể TT 77 | ✅ |
| Δ | 2 (18 / 25) | tính lại: 2 (18 / 25); theo lượt đã lưu: 4 (18 / 19 / 25 / 26) | **LỆCH** |
| Bảng diagnostics | 177 áp dụng · 26 không áp dụng · 0 cần bổ sung | 177 · 26 · 0 | ✅ |
| "Cần bổ sung" tính nhưng không lưu | 7 (hồ sơ nganh = null) | 7 | ✅ |
| Tất định câm | 18 / 25 = 72% | 18 / 25 = 72.0% | ✅ |
| Hồ sơ: thuộc tính thu | 20 thuộc tính + 5 trường cố định | từ điển 20 mã (form hỏi 18) + 5 trường cố định | ✅ |
| Hồ sơ: S9 dùng | 2 (domains, nganh) | 2 (domains, nganh) | ✅ |

Ghi chú khi lệch hoặc khi số đo cần đọc kèm điều kiện:
- Δ theo lượt đã lưu = 4 vì lượt quét toàn bộ gần nhất của 3 DN chạy khi văn bản khác còn active (xem `raw/filter_ket_qua_da_luu.json`). Tính lại trên thư viện hiện tại ra Δ = 2. Số §13.1 khớp với cách tính lại, không khớp với kết quả đã lưu.
- Văn bản không active vẫn có nghĩa vụ đã duyệt: 109/2025/QH15 [draft] 1 nghĩa vụ. §13.1 không nhắc.
- Từ điển 20 mã đã gồm `nganh`, `quy_mo` (trùng với trường cố định). Số trường phân biệt thu qua form = 18 + 5 = 23, không phải 20 + 5 = 25.
- Bảng diagnostics có 9 dòng gắn nghĩa vụ không còn thuộc văn bản active (đếm chung trong 203).
- Chủ thể xác nhận "chung" qua 005: 0. Chủ thể đã duyệt, không điều kiện, nối với nghĩa vụ active: 5 (trong 23 chủ thể Luật 108 đã duyệt, phần lớn không có cạnh `ap_dung_cho` nào tới nghĩa vụ).
- Doanh nghiệp trong DB: 10 (gồm hồ sơ demo/test).
- Không đo được bằng script này: "43/43 test pass" (chạy `npm test` riêng) và "chất lượng đề xuất LLM 56% / 10% / 34%" (86 thẻ giai đoạn trước, bảng `cards` đã bị 002 xóa).
