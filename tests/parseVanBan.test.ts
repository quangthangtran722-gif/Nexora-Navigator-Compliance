// Test bộ tách file văn bản luật cho form "Nhập văn bản luật" (lib/parse-van-ban.ts). Chạy: npm test
import assert from "node:assert/strict";
import { test } from "node:test";

import { splitArticles } from "../lib/pipeline/grounding.ts";
import { parseVanBan } from "../lib/parse-van-ban.ts";

// Mẫu cấu trúc giống TT 77/2025 bản .md: header dạng bảng, 5 Điều (Điều 1, 2, 5 ngắn)
const dai = "Nội dung khoản dài để đủ ngữ cảnh cho AI trích xuất. ".repeat(6);
const MD = `| BỘ TÀI CHÍNH | **CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM** |
| --- | --- |
| Số: 77/2025/TT-BTC | Hà Nội, ngày 30 tháng 7 năm 2025 |

## THÔNG TƯ

**Quy định chi tiết về dịch vụ kinh doanh chứng khoán**

Căn cứ Luật Chứng khoán ngày 26 tháng 11 năm 2019;

**Điều 1. Phạm vi điều chỉnh**

Thông tư này quy định chi tiết.

**Điều 2. Đối tượng áp dụng**

Công ty chứng khoán.

**Điều 3. Các dịch vụ kinh doanh chứng khoán**

1. ${dai}
2. ${dai}

**Điều 4. Trách nhiệm của công ty chứng khoán**

${dai}

**Điều 5. Hiệu lực thi hành**

Thông tư này có hiệu lực thi hành kể từ ngày 15 tháng 9 năm 2025.
`;

test("điền metadata từ header", () => {
  const p = parseVanBan(MD, "tt-77.md");
  assert.equal(p.so_hieu, "77/2025/TT-BTC");
  assert.equal(p.loai_van_ban, "thong_tu");
  assert.equal(p.ten_van_ban, "Thông tư quy định chi tiết về dịch vụ kinh doanh chứng khoán");
  assert.equal(p.co_quan_ban_hanh, "Bộ Tài chính");
  assert.equal(p.ngay_ban_hanh, "2025-07-30");
  assert.equal(p.ngay_hieu_luc, "2025-09-15");
});

test("tách chunk theo Điều, gộp Điều ngắn (1+2+3, 4+5)", () => {
  const { chunks } = parseVanBan(MD);
  assert.deepEqual(
    chunks.map((c) => c.dieu_khoan_range),
    ["Điều 1–3", "Điều 4–5"],
  );
  // Backend tách điều được: mỗi chunk có đúng các "Điều N." ở đầu dòng
  assert.deepEqual(splitArticles(chunks[0].noi_dung).map((a) => a.soDieu), [1, 2, 3]);
  assert.deepEqual(splitArticles(chunks[1].noi_dung).map((a) => a.soDieu), [4, 5]);
  assert.ok(!chunks[0].noi_dung.includes("**"), "bỏ ký hiệu markdown");
  assert.match(chunks[0].tieu_de, /^Phạm vi điều chỉnh/);
});

test("parse không ra thì để trống, không lỗi", () => {
  const p = parseVanBan("Văn bản không có cấu trúc gì cả.");
  assert.equal(p.so_hieu, "");
  assert.equal(p.loai_van_ban, "");
  assert.deepEqual(p.chunks, []);
});

test("số hiệu lấy từ tên file khi header không có", () => {
  assert.equal(parseVanBan("Điều 1. Phạm vi\n" + dai, "77-2025-TT-BTC.txt").so_hieu, "77/2025/TT-BTC");
});

test("Điều quá dài được chia, phần sau vẫn bắt đầu bằng Điều N.", () => {
  const rat_dai = Array.from({ length: 200 }, (_, i) => `${i + 1}. ${"Nội dung rất dài của khoản này. ".repeat(2)}`).join("\n");
  const { chunks } = parseVanBan(`Điều 7. Quy định dài\n${rat_dai}`);
  assert.ok(chunks.length > 1);
  for (const c of chunks) {
    assert.ok(c.noi_dung.length <= 6000);
    assert.match(c.noi_dung, /^Điều 7\./);
  }
});
