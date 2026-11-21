// Đo khâu duyệt thư viện — hàm thuần + đọc dữ liệu. CHỈ ĐỌC: bản chụp trước can thiệp (research/baseline/raw) hoặc DB MIS.
// Không bao giờ đọc prod; không ghi DB. Dùng bởi nhip-duyet.mjs (NĐ) và so-sanh-de-xuat.mjs (Điều 8 + thời gian duyệt).
import { readFileSync, existsSync } from "node:fs";
import { spawnSync } from "node:child_process";

export const VAN_BAN = "108/2025/QH15";
export const FILE_DE_XUAT = "research/sau/de-xuat-goc-108.json";

// ---------------------------------------------------------------- NĐ: thời gian duyệt mỗi entity
// Quy tắc (HE_THONG_DA_CHOT §14.4, PLAN.md NĐ): theo từng người duyệt, sắp các dòng approvals của ENTITY (bỏ dòng duyệt cạnh,
// duyệt diagnostic) theo thời điểm; khoảng = thời điểm dòng này − dòng liền trước của cùng người, gán cho entity của dòng này.
// Bỏ khoảng = 0 (nhiều dòng cùng thời điểm = duyệt cả chunk) và khoảng > 10 phút (nghỉ). Trung vị, p90: hạng gần nhất.
// Kiểm: bản chụp 20/10 → 55 khoảng, trung vị 8,6 giây, p90 51 giây (tests/doDuyet.test.ts).
export const NGHI_GIAY = 600;

export function khoangDuyet(approvals) {
  const theoNguoi = new Map();
  for (const a of approvals) {
    if (!a.entity_id) continue;
    if (!theoNguoi.has(a.nguoi_duyet_id)) theoNguoi.set(a.nguoi_duyet_id, []);
    theoNguoi.get(a.nguoi_duyet_id).push(a);
  }
  const khoang = [];
  let boCungLuc = 0, boNghi = 0;
  for (const [nguoi, ds] of theoNguoi) {
    ds.sort((x, y) => Date.parse(x.created_at) - Date.parse(y.created_at));
    for (let i = 1; i < ds.length; i++) {
      const giay = (Date.parse(ds[i].created_at) - Date.parse(ds[i - 1].created_at)) / 1000;
      if (giay === 0) { boCungLuc++; continue; }
      if (giay > NGHI_GIAY) { boNghi++; continue; }
      khoang.push({ entity_id: ds[i].entity_id, nguoi, giay, quyet_dinh: ds[i].quyet_dinh, luc: ds[i].created_at });
    }
  }
  return { khoang, boCungLuc, boNghi, soDong: [...theoNguoi.values()].reduce((n, d) => n + d.length, 0) };
}

export function phanVi(xs, p) {
  const s = [...xs].sort((a, b) => a - b);
  return s.length ? s[Math.max(0, Math.ceil(p * s.length) - 1)] : null;
}

export function thongKe(xs) {
  return { n: xs.length, trung_vi: phanVi(xs, 0.5), p90: phanVi(xs, 0.9) };
}

// Mann–Whitney U hai phía, xấp xỉ chuẩn có hiệu chỉnh hạng trùng và hiệu chỉnh liên tục. Chỉ chạy khi mỗi nhóm ≥ 5.
export const MW_TOI_THIEU = 5;
export function mannWhitney(a, b) {
  if (a.length < MW_TOI_THIEU || b.length < MW_TOI_THIEU) return null;
  const all = [...a.map((v) => ({ v, g: 0 })), ...b.map((v) => ({ v, g: 1 }))].sort((x, y) => x.v - y.v);
  const N = all.length;
  let tie = 0;
  for (let i = 0; i < N; ) {
    let j = i;
    while (j + 1 < N && all[j + 1].v === all[i].v) j++;
    const r = (i + j + 2) / 2;
    for (let k = i; k <= j; k++) all[k].r = r;
    const t = j - i + 1;
    tie += t ** 3 - t;
    i = j + 1;
  }
  const n1 = a.length, n2 = b.length;
  const R1 = all.filter((x) => x.g === 0).reduce((s, x) => s + x.r, 0);
  const U = R1 - (n1 * (n1 + 1)) / 2;
  const mu = (n1 * n2) / 2;
  const sd = Math.sqrt(((n1 * n2) / 12) * (N + 1 - tie / (N * (N - 1))));
  const z = sd === 0 ? 0 : (Math.abs(U - mu) - 0.5) / sd;
  return { U, z: Math.max(0, z), p: Math.min(1, 2 * (1 - phi(Math.max(0, z)))) };
}
// Fisher chính xác hai phía cho bảng 2×2 [[a, b], [c, d]]
export function fisher(a, b, c, d) {
  const lf = (n) => { let s = 0; for (let i = 2; i <= n; i++) s += Math.log(i); return s; };
  const r1 = a + b, r2 = c + d, c1 = a + c, n = r1 + r2;
  const p = (x) => Math.exp(lf(r1) + lf(r2) + lf(c1) + lf(n - c1) - lf(n) - lf(x) - lf(r1 - x) - lf(c1 - x) - lf(r2 - c1 + x));
  const p0 = p(a);
  let s = 0;
  for (let x = Math.max(0, c1 - r2); x <= Math.min(r1, c1); x++) { const px = p(x); if (px <= p0 * (1 + 1e-9)) s += px; }
  return Math.min(1, s);
}
// Cohen's kappa cho bảng 2×2 [[a, b], [c, d]] (hàng = lượt 1, cột = lượt 2), khoảng tin cậy 95% theo sai số chuẩn tiệm cận
// Fleiss, Cohen & Everitt (1969). Dùng để đo độ khớp quyết định duyệt / từ chối giữa hai lượt trên cùng đề xuất.
export function cohenKappa(a, b, c, d) {
  const n = a + b + c + d;
  const p = [[a / n, b / n], [c / n, d / n]];
  const r = [p[0][0] + p[0][1], p[1][0] + p[1][1]], q = [p[0][0] + p[1][0], p[0][1] + p[1][1]];
  const po = p[0][0] + p[1][1], pe = r[0] * q[0] + r[1] * q[1];
  const kappa = (po - pe) / (1 - pe);
  let s = 0;
  for (let i = 0; i < 2; i++) s += p[i][i] * (1 - (r[i] + q[i]) * (1 - kappa)) ** 2;
  for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) if (i !== j) s += (1 - kappa) ** 2 * p[i][j] * (q[i] + r[j]) ** 2;
  s -= (kappa - pe * (1 - kappa)) ** 2;
  const se = Math.sqrt(s / (n * (1 - pe) ** 2));
  return { n, po, pe, kappa, se, ci95: [kappa - 1.96 * se, kappa + 1.96 * se] };
}

// Thao tác người duyệt phải làm trên màn mới trước khi bấm, suy từ entity đã duyệt (cột DB, không đoán):
// có mã điều kiện C0–C7 → gan_ma (chọn mã, phạm vi, có thể viết điều kiện máy đọc); chỉ có phạm vi → chon_pham_vi; còn lại không
// trường bắt buộc. Màn cũ không có các trường này → "duyet".
export function thaoTac(quyetDinh, e, coTruong) {
  if (quyetDinh !== "da_duyet") return "tu_choi";
  if (!coTruong) return "duyet";
  if (e?.ma_dieu_kien) return "duyet_gan_ma";
  if (e?.pham_vi) return "duyet_chon_pham_vi";
  return "duyet_khong_truong";
}

function phi(z) {
  // Abramowitz–Stegun 7.1.26
  const t = 1 / (1 + 0.3275911 * (z / Math.SQRT2));
  const erf = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-(z * z) / 2);
  return 0.5 * (1 + erf);
}

// ---------------------------------------------------------------- So đề xuất gốc của LLM với bản đã duyệt
// Ba lớp theo yêu cầu: y_nguyen / sua_nho (không đổi nghĩa) / doi_nghia (viết lại làm đổi nghĩa). Máy chỉ quyết các trường
// hợp có quy tắc tường minh; phần còn lại là "can_nguoi" — người gán nhãn trong file nhãn, ghi ai / ngày.
//   y_nguyen : ten_entity, mo_ta, loai_entity giống hệt sau khi chuẩn hóa khoảng trắng, hoa thường, dấu câu cuối
//   sua_nho  : chỉ khác dấu câu
//   doi_nghia: đổi loai_entity, hoặc ĐẢO PHỦ ĐỊNH ở ten_entity / mo_ta (một bên có "không / chưa / cấm / nghiêm cấm",
//              bên kia không) — đúng kiểu sửa ở Điều 8 trước can thiệp ("Cản trở…" → "Không cản trở…")
//   can_nguoi: mọi trường hợp khác (đổi chữ mà không đảo phủ định) — máy không phân biệt được sửa nhỏ với đổi nghĩa
export const TRUONG_SO = ["ten_entity", "mo_ta", "loai_entity"];
const chuan = (s) => (s ?? "").normalize("NFC").toLowerCase().replace(/\s+/g, " ").trim().replace(/[.;:,]+$/u, "");
const boDauCau = (s) => chuan(s).replace(/\p{P}/gu, " ").replace(/\s+/g, " ").trim();
const PHU_DINH = /(^|\s)(không|chưa|cấm|nghiêm cấm)(?=\s|$)/u;

export function phanLoai(goc, hien) {
  const khac = TRUONG_SO.filter((k) => chuan(goc[k]) !== chuan(hien[k]));
  if (!khac.length) return { lop: "y_nguyen", khac, ly_do: null };
  if (khac.includes("loai_entity")) return { lop: "doi_nghia", khac, ly_do: "doi_loai_entity" };
  if (TRUONG_SO.every((k) => boDauCau(goc[k]) === boDauCau(hien[k]))) return { lop: "sua_nho", khac, ly_do: "chi_dau_cau" };
  for (const k of ["ten_entity", "mo_ta"])
    if (PHU_DINH.test(chuan(goc[k])) !== PHU_DINH.test(chuan(hien[k]))) return { lop: "doi_nghia", khac, ly_do: `dao_phu_dinh_${k}` };
  return { lop: "can_nguoi", khac, ly_do: null };
}

// ---------------------------------------------------------------- Điều kiện rỗng nghĩa (PHAM_VI_VA_PHUONG_PHAP §2.6)
// Điều kiện máy đọc "rỗng nghĩa": trường có tập giá trị ĐÓNG và điều kiện đúng với MỌI giá trị trong tập → không phân biệt
// được hồ sơ nào với hồ sơ nào. Tập đóng: boolean {true,false}; text có lua_chon. Trường số, text không có lua_chon (vd nganh),
// text_array (có thể chọn rỗng) → không xét, trả false. tt = dòng thuoc_tinh_ho_so {kieu, lua_chon}.
export function rongNghia(dk, tt) {
  if (!dk || !tt) return false;
  const tap = tt.kieu === "boolean" ? [true, false]
    : tt.kieu === "text" && Array.isArray(tt.lua_chon) && tt.lua_chon.length ? tt.lua_chon : null;
  if (!tap) return false;
  const g = dk.gia_tri;
  const dung = (v) => {
    switch (dk.toan_tu) {
      case "eq": return v === g;
      case "neq": return v !== g;
      case "in": return Array.isArray(g) && g.includes(v);
      case "not_in": return Array.isArray(g) && !g.includes(v);
      default: return false;
    }
  };
  return tap.every(dung);
}

// Mã nhóm đầu ghi chú từ chối (quy ước người duyệt chốt 17/11 — quy ước gõ tay, hệ không ép)
export const MA_NHOM_TU_CHOI = ["NN-CT", "NN-NV", "GQ", "DV", "TX"];
// Đọc ngược DB 17/11: người duyệt gõ câu chuẩn KHÔNG kèm tiền tố [mã]. Nhận nhóm theo đầu câu chuẩn đã gõ thật.
export const DAU_CAU_CHUAN = [
  ["Chủ thể là cơ quan nhà nước hoặc công chức", "NN-CT"],
  ["Nghĩa vụ do cơ quan nhà nước hoặc công chức mang", "NN-NV"],
  ["Điều khoản giao Chính phủ hoặc Bộ trưởng", "GQ"],
  ["Entity điều kiện không còn nghĩa vụ nguồn", "DV"],
  ["Lỗi trích xuất", "TX"],
];
export const coTienToMa = (ghiChu) => /^\[[A-Z-]+\]/.test((ghiChu ?? "").trim());
export function maNhom(ghiChu) {
  if (!ghiChu || !ghiChu.trim()) return "(không ghi)";
  const s = ghiChu.trim();
  const m = s.match(/^\[([A-Z-]+)\]/);
  if (m) return MA_NHOM_TU_CHOI.includes(m[1]) ? m[1] : "(không theo mã)";
  const c = DAU_CAU_CHUAN.find(([dau]) => s.startsWith(dau));
  return c ? c[1] : "(không theo mã)";
}

// ---------------------------------------------------------------- Độ phủ của từ điển hồ sơ cố định (nhật ký thiết kế #19)
// Đếm entity đã gán C6 vì "cần trường không có trong từ điển" — cột entities.truong_ngoai_tu_dien (migration 010, người duyệt
// ghi tên trường cần). Cột chưa có → trả null (chưa đo), không đoán từ ghi chú tự do. Đếm theo văn bản.
export function demC6NgoaiTuDien(ents, coCot) {
  if (!coCot) return null;
  const theoVb = {};
  for (const e of ents) {
    if (e.trang_thai_duyet !== "da_duyet" || e.ma_dieu_kien !== "C6") continue;
    const v = (theoVb[e.van_ban ?? "(không rõ)"] ??= { c6: 0, ngoai_tu_dien: 0, truong: {} });
    v.c6++;
    const t = (e.truong_ngoai_tu_dien ?? "").trim();
    if (t) { v.ngoai_tu_dien++; v.truong[t] = (v.truong[t] ?? 0) + 1; }
  }
  return theoVb;
}

// ---------------------------------------------------------------- Đọc dữ liệu
const docJson = (p) => JSON.parse(readFileSync(p, "utf8"));

// Bản chụp trước can thiệp (prod 09/11, research/baseline/raw) — chỉ 70 entity Luật 108 có trong đề xuất gốc
export function docTruoc(idEntity) {
  const raw = (f) => docJson(`research/baseline/raw/${f}.json`);
  const entities = raw("entities").filter((e) => idEntity.has(e.id));
  const approvals = raw("approvals").filter((a) => a.entity_id && idEntity.has(a.entity_id));
  return { entities, approvals };
}

function urlMis() {
  let url = process.env.MIS_DB_URL;
  if (!url && existsSync(".env.mis.local")) {
    const m = readFileSync(".env.mis.local", "utf8").match(/^MIS_DB_URL=(.*)$/m);
    url = m?.[1].trim().replace(/^"|"$/g, "");
  }
  if (!url) throw new Error("Thiếu MIS_DB_URL (biến môi trường hoặc .env.mis.local)");
  const u = new URL(url);
  if (!(u.hostname + u.username).includes("sttopelrdxvyszfvvcrn") || url.includes("qalexz"))
    throw new Error("MIS_DB_URL không phải project MIS — dừng (script đo không bao giờ đọc prod)");
  return url;
}

export function truyVanMis(sql) {
  const url = urlMis();
  const r = spawnSync("psql", [url, "-X", "-A", "-t", "-v", "ON_ERROR_STOP=1", "-c", sql], {
    encoding: "utf8", maxBuffer: 64 * 1024 * 1024, env: { ...process.env, PGCONNECT_TIMEOUT: "20", PGCLIENTENCODING: "UTF8" },
  });
  if (r.status !== 0) throw new Error("psql lỗi: " + (r.stderr || "").split(/\r?\n/).filter((l) => !l.includes(url)).join(" ").slice(0, 400));
  return JSON.parse(r.stdout.trim() || "null");
}

// Sau can thiệp: DB MIS, chỉ đọc
export function docSau(idEntity) {
  const d = truyVanMis(`select json_build_object(
    'entities', (select coalesce(json_agg(json_build_object('id', id, 'so_dieu', so_dieu, 'ten_entity', ten_entity, 'mo_ta', mo_ta,
       'loai_entity', loai_entity, 'trang_thai_duyet', trang_thai_duyet, 'ma_dieu_kien', ma_dieu_kien, 'pham_vi', pham_vi,
       'khong_hinh_thuc_hoa', khong_hinh_thuc_hoa, 'van_ban_dan_chieu', van_ban_dan_chieu)), '[]') from entities),
    'approvals', (select coalesce(json_agg(json_build_object('entity_id', entity_id, 'relationship_id', relationship_id,
       'nguoi_duyet_id', nguoi_duyet_id, 'quyet_dinh', quyet_dinh, 'created_at', created_at)), '[]') from approvals))`);
  return {
    entities: d.entities.filter((e) => idEntity.has(e.id)),
    approvals: d.approvals.filter((a) => a.entity_id && idEntity.has(a.entity_id)),
  };
}

// Đề xuất gốc của LLM (bất biến: pipeline_runs.output của lượt extract 20/10, chép sang MIS ở H2). Chụp một lần ra file để bên
// "trước" chạy được không cần DB; bên "sau" đối chiếu lại file với DB mỗi lần chạy.
export function deXuatTuMis() {
  const rows = truyVanMis(`select coalesce(json_agg(json_build_object('id', e.id, 'so_dieu', e.so_dieu, 'pipeline_run_id', e.pipeline_run_id,
      'ma_tam', e.ma_tam, 'goc', x.value) order by e.so_dieu, e.ma_tam), '[]')
    from entities e join pipeline_runs r on r.id = e.pipeline_run_id
    cross join lateral jsonb_array_elements(r.output->'entities') x
    where x.value->>'ma_tam' = e.ma_tam`);
  return rows.map((r) => ({
    id: r.id, so_dieu: r.so_dieu, pipeline_run_id: r.pipeline_run_id, ma_tam: r.ma_tam,
    ten_entity: r.goc.ten_entity, mo_ta: r.goc.mo_ta ?? null, loai_entity: r.goc.loai_entity,
  }));
}

export function docDeXuat() {
  if (!existsSync(FILE_DE_XUAT)) throw new Error(`Thiếu ${FILE_DE_XUAT} — chạy: node scripts/research/so-sanh-de-xuat.mjs --chup-de-xuat`);
  return docJson(FILE_DE_XUAT).entities;
}

export function docNhan(nguon) {
  const p = `research/sau/nhan-nguoi-${nguon}.json`;
  return existsSync(p) ? docJson(p) : {};
}
