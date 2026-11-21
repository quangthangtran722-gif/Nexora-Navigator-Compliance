// Phân luồng duyệt — chạy ngay sau X1, TRƯỚC khi ai mở màn duyệt (nhật ký thiết kế #22). CHỈ ĐỊNH TUYẾN, không quyết thay:
// người vẫn bấm Duyệt / Từ chối. Luồng A = mục nhiều khả năng BỊ TỪ CHỐI, nhận dạng theo mẫu, tài khoản cơ học làm được;
// mọi thao tác ghi vào thư viện (duyệt) thuộc luồng B (người có chuyên môn) vì duyệt kéo theo cạnh LLM và khóa vĩnh viễn.
// Không chắc → B. `quy_tac` lưu để đo, KHÔNG hiện trên màn duyệt (hiện ra là gợi ý sẵn mã nhóm).
// Thứ tự cố định (luật khớp đầu tiên thắng): A5 → B cứng (B1–B10) → A1–A4 → mặc định B. Lượt hai (A6) chạy sau khi luồng B
// quyết xong nghĩa vụ. Bộ lọc đóng băng theo phiên bản trước mỗi lần chạy trên văn bản mới — không chỉnh sau khi thấy kết quả.
import { normalizeForMatch } from "./grounding.ts";

export const PHAN_LUONG_VERSION = "phan-luong-v1";

export type Luong = "A" | "B";
export type EntityPhanLuong = {
  ten_entity: string;
  loai_entity: string;
  noi_dung_goc: string | null;
  ten_dieu: string | null; // tên Điều chứa entity (van_ban_chunks.tieu_de)
};
export type KetQuaPhanLuong = { luong: Luong; quy_tac: string };

// Chủ thể nhà nước — dài trước ngắn (để khớp cụm dài nhất). Cả hai kiểu bỏ dấu "ủy" / "uỷ".
export const NHA_NUOC = [
  "thủ trưởng cơ quan quản lý thuế", "cơ quan quản lý nhà nước", "cơ quan nhà nước có thẩm quyền", "cơ quan đăng ký kinh doanh",
  "cơ quan quản lý thuế", "công chức quản lý thuế", "bộ trưởng bộ tài chính", "cơ quan có thẩm quyền", "kho bạc nhà nước",
  "cơ quan nhà nước", "ủy ban nhân dân", "uỷ ban nhân dân", "cơ quan thuế", "công chức thuế", "bộ tài chính", "chính phủ",
  "thủ tướng chính phủ", "bộ trưởng", "thủ trưởng", "công chức", "kho bạc",
].map((s) => normalizeForMatch(s)).sort((a, b) => b.length - a.length);

const BEN_KHAC = /(người nộp thuế|doanh nghiệp|tổ chức|cá nhân|hộ kinh doanh|hộ gia đình|hợp tác xã|người khai|người)/u;
const TEN_CHUNG = new Set(["luật này", "điều này", "khoản này", "văn bản này", "nghị định này", "thông tư này"]);

// Ranh giới từ cho tiếng Việt (\b của JS chỉ hiểu ASCII)
const W = (s: string) => new RegExp(`(^|[^\\p{L}\\p{N}])(${s})(?=$|[^\\p{L}\\p{N}])`, "u");
const NN_RE = NHA_NUOC.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");

const B_CUNG: [string, (g: string, ten: string, e: EntityPhanLuong, dieu: string) => boolean][] = [
  ["B9-loai", (_g, _t, e) => ["dieu_kien", "nguong", "thoi_han", "doi_tuong"].includes(e.loai_entity)],
  ["B1-so-tien", (g) => /\d[\d.,]*\s*(%|tỷ|triệu|nghìn|đồng)/u.test(g) || W("phần trăm").test(g)],
  ["B2-dieu-kien", (g) => W("trường hợp|nếu|khi|trừ|ngoại trừ|không áp dụng").test(g)],
  ["B3-dan-chieu", (g) => /điều \d+/u.test(g) || /(^|[^\p{L}])(bộ luật|luật|nghị định|thông tư|pháp luật)(?! này)(?=$|[^\p{L}])/u.test(g)],
  ["B4-c5", (g) => new RegExp(`(do|theo quy định của|theo hướng dẫn của|mức do)\\s+(${NN_RE})`, "u").test(g)],
  ["B5-cam", (g, _t, _e, dieu) => W("nghiêm cấm|không được|cấm").test(g) || W("nghiêm cấm|bị cấm").test(dieu)],
  ["B6-hon-hop", (_g, ten) => new RegExp(NN_RE, "u").test(ten) && BEN_KHAC.test(ten.replace(new RegExp(NN_RE, "gu"), " "))],
  ["B7-dinh-nghia", (g) => W("là").test(g)],
  ["B8-khong-nguyen-van", (g, ten) => !g.includes(ten)],
  ["B10-su-kien", (g) => W("kể từ ngày|thay đổi|chấm dứt").test(g) || /ngày \d+ tháng \d+/u.test(g)],
];

// Cụm NN đứng đầu câu hoặc đầu một vế (sau ; : . xuống dòng), bỏ ký hiệu liệt kê "a)", "1."
const dauVe = (g: string) => g.split(/[;:.\n]/u).map((v) => v.trim().replace(/^([a-zđ]\)|\d+[.)])\s*/u, ""));
const moDauNN = (v: string) => NHA_NUOC.find((t) => v.startsWith(t));

export function phanLuong(e: EntityPhanLuong): KetQuaPhanLuong {
  const g = normalizeForMatch(e.noi_dung_goc ?? "");
  const ten = normalizeForMatch(e.ten_entity ?? "");
  const dieu = normalizeForMatch(e.ten_dieu ?? "");
  // A5 — tên là tự tham chiếu chung chung: lỗi trích xuất nhận ra bằng mắt (xét trước B: lỗi nằm ở chính tên)
  if (TEN_CHUNG.has(ten)) return { luong: "A", quy_tac: "A5-ten-chung" };
  for (const [ma, f] of B_CUNG) if (f(g, ten, e, dieu)) return { luong: "B", quy_tac: ma };
  const ve = dauVe(g);
  // A1 — chủ thể mà cả tên là cơ quan / người nhà nước, đứng ở vị trí chủ ngữ
  if (e.loai_entity === "chu_the" && NHA_NUOC.includes(ten) && ve.some((v) => v.startsWith(ten)))
    return { luong: "A", quy_tac: "A1-chu-the-nn" };
  // A2 — câu giao quyền: NN mở đầu + quy định (chi tiết) / hướng dẫn
  if (ve.some((v) => { const t = moDauNN(v); return !!t && /^\s*(quy định|hướng dẫn)/u.test(v.slice(t.length)); }))
    return { luong: "A", quy_tac: "A2-giao-quyen" };
  // A3 — nghĩa vụ mà NN là người làm
  if (e.loai_entity === "hanh_vi" && ve.some((v) => { const t = moDauNN(v); return !!t && /^\s*(có trách nhiệm|phải|thực hiện|có nhiệm vụ)/u.test(v.slice(t.length)); }))
    return { luong: "A", quy_tac: "A3-nghia-vu-nn" };
  // A4 — nghĩa vụ trong Điều "Trách nhiệm / Nhiệm vụ, quyền hạn của <NN>"
  if (e.loai_entity === "hanh_vi" && new RegExp(`^(trách nhiệm|nhiệm vụ, quyền hạn|nhiệm vụ|quyền hạn)( và [^ ]+)? của (${NN_RE})`, "u").test(dieu))
    return { luong: "A", quy_tac: "A4-dieu-trach-nhiem-nn" };
  return { luong: "B", quy_tac: e.loai_entity === "chu_the" ? "B-mac-dinh-chu-the" : "C-khong-chac" };
}

// Lượt hai (A6) — sau khi luồng B quyết xong nghĩa vụ: entity điều kiện có ít nhất một cạnh `dieu_kien` và MỌI nghĩa vụ đích
// đã bị từ chối → A (ứng viên nhóm DV). Chỉ xét entity còn chờ duyệt.
export function phanLuongLuotHai(
  dieuKien: { id: string; loai_entity: string; trang_thai_duyet: string }[],
  canh: { source_entity_id: string; target_entity_id: string | null; loai_relationship: string }[],
  trangThai: Map<string, string>,
): Map<string, KetQuaPhanLuong> {
  const out = new Map<string, KetQuaPhanLuong>();
  for (const e of dieuKien) {
    if (e.loai_entity !== "dieu_kien" || e.trang_thai_duyet !== "cho_duyet") continue;
    const dich = canh.filter((c) => c.source_entity_id === e.id && c.loai_relationship === "dieu_kien" && c.target_entity_id);
    if (dich.length && dich.every((c) => trangThai.get(c.target_entity_id as string) === "tu_choi"))
      out.set(e.id, { luong: "A", quy_tac: "A6-dieu-kien-mat-nguon" });
  }
  return out;
}
