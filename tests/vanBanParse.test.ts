// Test đọc số hiệu / tên văn bản từ nội dung, không phải tên file. Chạy: npm test
import assert from "node:assert/strict";
import { test } from "node:test";

import { parseVanBanHeader } from "../lib/van-ban-parse.ts";

const LUAT_108 = `QUỐC HỘI
Luật số: 108/2025/QH15

LUẬT QUẢN LÝ THUẾ

Hà Nội, ngày 10 tháng 12 năm 2025

Căn cứ Hiến pháp ... theo Nghị quyết số 203/2025/QH15;

Điều 2. Đối tượng áp dụng
1. ... Luật Quản lý thuế số 38/2019/QH14 ...`;

test("Luật 108: lấy từ nội dung, bỏ qua tên file có hậu tố -demo", () => {
  assert.deepEqual(parseVanBanHeader(LUAT_108, "Luat-Quan-ly-thue-108-2025-QH15-demo.md"), {
    so_hieu: "108/2025/QH15",
    ten_van_ban: "Luật Quản lý thuế",
    loai_van_ban: "luat",
  });
});

test("Thông tư: tên ở dòng sau, số hiệu có gạch nối", () => {
  const tt = `**BỘ TÀI CHÍNH**\nSố: 77/2025/TT-BTC\n\nTHÔNG TƯ\nQuy định chi tiết các dịch vụ kinh doanh chứng khoán\n\nĐiều 1. Phạm vi`;
  assert.deepEqual(parseVanBanHeader(tt), {
    so_hieu: "77/2025/TT-BTC",
    ten_van_ban: "Thông tư quy định chi tiết các dịch vụ kinh doanh chứng khoán",
    loai_van_ban: "thong_tu",
  });
});

test("nội dung không có số hiệu → fallback tên file, chỉ phần đúng dạng số hiệu", () => {
  assert.equal(parseVanBanHeader("Điều 1. Phạm vi", "Luat-Quan-ly-thue-108-2025-QH15-demo.md").so_hieu, "108/2025/QH15");
  assert.equal(parseVanBanHeader("Điều 1. Phạm vi", "thong-tu-77-2025-TT-BTC.md").so_hieu, "77/2025/TT-BTC");
  assert.equal(parseVanBanHeader("Điều 1. Phạm vi", "ghi-chu.md").so_hieu, null);
});

test("số hiệu được dẫn chiếu trong thân văn bản không bị bắt nhầm", () => {
  assert.equal(parseVanBanHeader("LUẬT X\n\nĐiều 1. Theo Luật số 38/2019/QH14 ...").so_hieu, null);
});
