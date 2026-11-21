// Phân luồng duyệt (nhật ký #22): kiểm CƠ CHẾ từng luật trên câu dựng tay. Độ chính xác trên dữ liệu thật đo riêng ở
// scripts/research/kiem-phan-luong.mjs (Luật 108: trong mẫu; TNDN: ngoài mẫu).
import assert from "node:assert/strict";
import { test } from "node:test";
import { phanLuong, phanLuongLuotHai } from "../lib/pipeline/phanLuong.ts";

const e = (ten_entity: string, loai_entity: string, noi_dung_goc: string, ten_dieu = "Đăng ký thuế") =>
  ({ ten_entity, loai_entity, noi_dung_goc, ten_dieu });

test("A1: chủ thể là cơ quan nhà nước ở vị trí chủ ngữ → A", () => {
  assert.deepEqual(phanLuong(e("Chính phủ", "chu_the", "Chính phủ quy định chi tiết khoản 5 Điều này.")), { luong: "A", quy_tac: "A1-chu-the-nn" });
});

test("cơ quan nhà nước ở vị trí tác nhân bị động (do …) hoặc câu định nghĩa → B (ca Đ11 k3)", () => {
  const r = phanLuong(e("cơ quan thuế", "chu_the", "Mã số thuế của người nộp thuế là mã số do cơ quan thuế cấp để sử dụng."));
  assert.equal(r.luong, "B");
});

test("A2: câu giao quyền, NN mở đầu → A; 'do Chính phủ quy định' trong nghĩa vụ → B (C5, không phải GQ)", () => {
  assert.equal(phanLuong(e("Quy định chi tiết khoản 1 và khoản 3 Điều này", "hanh_vi",
    "Bộ trưởng Bộ Tài chính quy định chi tiết khoản 1 và khoản 3 Điều này.")).quy_tac, "A2-giao-quyen");
  const r = phanLuong(e("Miễn thuế thu nhập doanh nghiệp", "hanh_vi",
    "Doanh nghiệp có tổng doanh thu năm từ mức do Chính phủ quy định trở xuống được miễn thuế thu nhập doanh nghiệp."));
  assert.equal(r.luong, "B");
});

test("A3: nghĩa vụ mà cơ quan nhà nước là người làm → A; nghĩa vụ của người nộp thuế nhắc cơ quan thuế làm bên nhận → B", () => {
  assert.equal(phanLuong(e("Cấp mã số thuế", "hanh_vi", "Cơ quan thuế có trách nhiệm cấp mã số thuế cho người nộp thuế.")).quy_tac, "A3-nghia-vu-nn");
  assert.equal(phanLuong(e("Nộp hồ sơ đăng ký thuế", "hanh_vi", "Người nộp thuế nộp hồ sơ đăng ký thuế cho cơ quan thuế.")).luong, "B");
});

test("A4: nghĩa vụ trong Điều 'Trách nhiệm của cơ quan quản lý thuế' → A", () => {
  assert.equal(phanLuong(e("Công khai các thủ tục về thuế", "hanh_vi", "Công khai các thủ tục về thuế.", "Trách nhiệm của cơ quan quản lý thuế")).quy_tac,
    "A4-dieu-trach-nhiem-nn");
});

test("A5: tên tự tham chiếu chung chung → A, xét trước B", () => {
  assert.equal(phanLuong(e("Luật này", "chu_the", "Luật này có hiệu lực thi hành từ ngày 01 tháng 7 năm 2026.")).quy_tac, "A5-ten-chung");
});

test("B cứng thắng A: thời hạn, đối tượng, điều kiện → B; chủ thể hỗn hợp → B; câu cấm → B; tên không có trong câu → B", () => {
  assert.equal(phanLuong(e("trong thời hạn 10 ngày", "thoi_han", "Cơ quan thuế phải trả lời trong thời hạn 10 ngày.")).quy_tac, "B9-loai");
  assert.equal(phanLuong(e("doi tuong", "doi_tuong", "x")).quy_tac, "B9-loai");
  assert.equal(phanLuong(e("người nộp thuế và cơ quan thuế", "chu_the", "Người nộp thuế và cơ quan thuế thực hiện giao dịch điện tử.")).quy_tac, "B6-hon-hop");
  assert.equal(phanLuong(e("Cản trở công chức", "hanh_vi", "Cản trở công chức thi hành công vụ.", "Các hành vi bị nghiêm cấm trong quản lý thuế")).quy_tac, "B5-cam");
  assert.equal(phanLuong(e("Chính phủ", "chu_the", "Bộ trưởng quy định chi tiết.")).quy_tac, "B8-khong-nguyen-van");
  assert.equal(phanLuong(e("Bộ trưởng", "chu_the", "Trường hợp cần thiết, Bộ trưởng quy định mức thu.")).luong, "B");
});

test("không khớp rõ → B, ghi C-khong-chac (nghĩa vụ) hoặc B-mac-dinh-chu-the", () => {
  assert.equal(phanLuong(e("Lưu giữ tài liệu", "hanh_vi", "Doanh nghiệp lưu giữ tài liệu tại trụ sở chính.")).quy_tac, "C-khong-chac");
  assert.equal(phanLuong(e("doanh nghiệp", "chu_the", "Doanh nghiệp lưu giữ tài liệu tại trụ sở chính.")).quy_tac, "B-mac-dinh-chu-the");
});

test("lượt hai A6: điều kiện chờ duyệt mà mọi nghĩa vụ đích đã bị từ chối → A; còn một đích chưa từ chối → không đổi", () => {
  const dk = [{ id: "d1", loai_entity: "dieu_kien", trang_thai_duyet: "cho_duyet" }, { id: "d2", loai_entity: "dieu_kien", trang_thai_duyet: "cho_duyet" }];
  const canh = [
    { source_entity_id: "d1", target_entity_id: "h1", loai_relationship: "dieu_kien" },
    { source_entity_id: "d2", target_entity_id: "h1", loai_relationship: "dieu_kien" },
    { source_entity_id: "d2", target_entity_id: "h2", loai_relationship: "dieu_kien" },
  ];
  const r = phanLuongLuotHai(dk, canh, new Map([["h1", "tu_choi"], ["h2", "da_duyet"]]));
  assert.deepEqual([...r.keys()], ["d1"]);
});
