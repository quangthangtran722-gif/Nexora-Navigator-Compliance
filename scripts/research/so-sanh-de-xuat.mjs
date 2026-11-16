// So đề xuất gốc của LLM với bản đã duyệt — 70 entity Luật 108 (9 điều cũ), kèm đối chiếu thời gian duyệt nhóm bị sửa /
// không sửa. CHỈ ĐỌC. Không suy diễn nhân quả: script chỉ đếm và so; tiêu chí "có khác biệt" cố định trước khi có số liệu sau.
//
// Dùng:
//   node scripts/research/so-sanh-de-xuat.mjs --chup-de-xuat     chụp đề xuất gốc từ MIS ra research/sau/de-xuat-goc-108.json (một lần)
//   node scripts/research/so-sanh-de-xuat.mjs --nguon truoc      bản chụp prod 09/11 (màn duyệt cũ, lượt 20/10)
//   node scripts/research/so-sanh-de-xuat.mjs --nguon sau        DB MIS (màn duyệt mới U1a)
// Nhãn người cho các entity máy không tự phân loại được: research/sau/nhan-nguoi-<nguon>.json
//   { "<entity_id>": { "nhan": "sua_nho" | "doi_nghia", "nguoi": "…", "ngay": "YYYY-MM-DD", "ghi_chu": "…" } }
// Ghi research/sau/so-sanh-de-xuat-<nguon>.json + .md.
import { mkdirSync, writeFileSync } from "node:fs";
import {
  phanLoai, khoangDuyet, thongKe, mannWhitney, MW_TOI_THIEU, docTruoc, docSau, docDeXuat, deXuatTuMis, docNhan, FILE_DE_XUAT, TRUONG_SO,
} from "./do-duyet-lib.mjs";

mkdirSync("research/sau", { recursive: true });

if (process.argv.includes("--chup-de-xuat")) {
  const ds = deXuatTuMis();
  writeFileSync(FILE_DE_XUAT, JSON.stringify({
    nguon: "MIS pipeline_runs.output (extract_entities, 20/10/2026, chép từ prod ở H2) — bất biến",
    chup_luc: new Date().toISOString(), so_entity: ds.length, entities: ds,
  }, null, 1));
  console.log(`Đã chụp ${ds.length} đề xuất gốc → ${FILE_DE_XUAT}`);
  process.exit(0);
}

const nguon = process.argv[process.argv.indexOf("--nguon") + 1];
if (!["truoc", "sau"].includes(nguon)) { console.error("Dùng: --nguon truoc|sau  hoặc  --chup-de-xuat"); process.exit(1); }

const deXuat = docDeXuat();
const ids = new Set(deXuat.map((e) => e.id));
if (nguon === "sau") {
  // Đề xuất gốc trong file phải khớp DB (pipeline_runs.output không đổi)
  const db = new Map(deXuatTuMis().map((e) => [e.id, e]));
  const lech = deXuat.filter((e) => TRUONG_SO.some((k) => (db.get(e.id)?.[k] ?? null) !== (e[k] ?? null)));
  if (lech.length || db.size !== deXuat.length) { console.error(`Đề xuất gốc trong file lệch DB (${lech.length} entity) — dừng`); process.exit(1); }
}
const { entities, approvals } = nguon === "truoc" ? docTruoc(ids) : docSau(ids);
const hien = new Map(entities.map((e) => [e.id, e]));
const nhanNguoi = docNhan(nguon);

// Thời gian duyệt gán cho entity: khoảng của dòng quyết định CUỐI của entity đó (nếu khoảng đó không bị loại)
const { khoang } = khoangDuyet(approvals);
const cuoi = new Map();
for (const a of approvals) if (!cuoi.has(a.entity_id) || Date.parse(a.created_at) >= Date.parse(cuoi.get(a.entity_id).created_at)) cuoi.set(a.entity_id, a);
const giayCua = new Map();
for (const k of khoang) if (cuoi.get(k.entity_id)?.created_at === k.luc) giayCua.set(k.entity_id, k.giay);

const dong = deXuat.map((g) => {
  const h = hien.get(g.id);
  const tt = h?.trang_thai_duyet ?? "khong_co";
  let lop, may = null, ly_do = null, khac = [];
  if (tt === "cho_duyet" || tt === "khong_co") lop = "chua_duyet";
  else if (tt === "tu_choi") lop = "tu_choi";
  else {
    ({ lop: may, ly_do, khac } = phanLoai(g, h));
    const nn = nhanNguoi[g.id]?.nhan;
    lop = may === "y_nguyen" ? "y_nguyen" : nn ?? (may === "can_nguoi" ? "chua_gan_nhan" : may);
  }
  return {
    id: g.id, so_dieu: g.so_dieu, loai_goc: g.loai_entity, lop, may, ly_do_may: ly_do, nhan_nguoi: nhanNguoi[g.id] ?? null,
    truong_khac: khac, goc: { ten_entity: g.ten_entity, loai_entity: g.loai_entity, mo_ta: g.mo_ta },
    hien: h && khac.length ? Object.fromEntries(khac.map((k) => [k, h[k]])) : null,
    giay_duyet: giayCua.get(g.id) ?? null,
  };
});

const dem = (pred) => dong.filter(pred).length;
const LOP = ["y_nguyen", "sua_nho", "doi_nghia", "chua_gan_nhan", "tu_choi", "chua_duyet"];
const tong = Object.fromEntries(LOP.map((l) => [l, dem((d) => d.lop === l)]));
const theoDieu = {};
for (const d of dong) { theoDieu[d.so_dieu] ??= Object.fromEntries(LOP.map((l) => [l, 0])); theoDieu[d.so_dieu][d.lop]++; }
const lechMayNguoi = dong.filter((d) => d.nhan_nguoi && d.may !== "can_nguoi" && d.nhan_nguoi.nhan !== d.may).map((d) => d.id);

// Thời gian duyệt: nhóm KHÔNG SỬA (y_nguyen) vs BỊ SỬA (sua_nho + doi_nghia + chua_gan_nhan); thêm riêng doi_nghia, tu_choi
const giay = (pred) => dong.filter((d) => pred(d) && d.giay_duyet != null).map((d) => d.giay_duyet);
const BI_SUA = ["sua_nho", "doi_nghia", "chua_gan_nhan"];
const g0 = giay((d) => d.lop === "y_nguyen"), g1 = giay((d) => BI_SUA.includes(d.lop));
const mw = mannWhitney(g0, g1);
const thoiGian = {
  khong_sua: thongKe(g0), bi_sua: thongKe(g1),
  doi_nghia: thongKe(giay((d) => d.lop === "doi_nghia")), tu_choi: thongKe(giay((d) => d.lop === "tu_choi")),
  so_entity_da_xu_ly_khong_co_khoang: dong.filter((d) => !["chua_duyet"].includes(d.lop) && d.giay_duyet == null).length,
  kiem_dinh: mw
    ? { phep: "Mann–Whitney U hai phía (khong_sua vs bi_sua)", ...mw, ket_luan: mw.p < 0.05 ? "có khác biệt (p < 0,05)" : "không có khác biệt (p ≥ 0,05)" }
    : { phep: "không kiểm định", ly_do: `mỗi nhóm cần ≥ ${MW_TOI_THIEU} khoảng đo được (khong_sua ${g0.length}, bi_sua ${g1.length})`, ket_luan: "chỉ mô tả" },
  tieu_chi_co_dinh_truoc: "p < 0,05 hai phía → 'có khác biệt'; ngược lại → 'không có khác biệt'. Không suy diễn nhân quả trong cả hai trường hợp.",
};

const out = { nguon, chay_luc: new Date().toISOString(), so_entity: dong.length, tong, theo_dieu: theoDieu, lech_may_nguoi: lechMayNguoi, thoi_gian: thoiGian, dong };
writeFileSync(`research/sau/so-sanh-de-xuat-${nguon}.json`, JSON.stringify(out, null, 1));

// Bản đọc
const f = (s) => (s.n ? `${s.n} | ${s.trung_vi.toFixed(1)} | ${s.p90.toFixed(1)}` : "0 | — | —");
const md = [
  `# So đề xuất gốc LLM ↔ bản đã duyệt — ${nguon === "truoc" ? "màn duyệt cũ (prod, lượt 20/10/2026)" : "màn duyệt mới U1a (MIS)"}`,
  "", `Chạy: ${out.chay_luc}. ${dong.length} entity Luật 108, 9 điều cũ. Quy tắc phân loại: \`scripts/research/do-duyet-lib.mjs\` (phanLoai).`, "",
  "| Lớp | Số entity |", "|---|---|", ...LOP.map((l) => `| ${l} | ${tong[l]} |`), "",
  tong.chua_gan_nhan ? `**Còn ${tong.chua_gan_nhan} entity bị sửa chưa có nhãn người** (máy không tự phân biệt sửa nhỏ / đổi nghĩa) — ghi vào \`research/sau/nhan-nguoi-${nguon}.json\` rồi chạy lại.\n` : "",
  lechMayNguoi.length ? `Nhãn người khác nhãn máy ở ${lechMayNguoi.length} entity: ${lechMayNguoi.join(", ")}\n` : "",
  "## Theo điều", "", `| Điều | ${LOP.join(" | ")} |`, `|---|${LOP.map(() => "---").join("|")}|`,
  ...Object.entries(theoDieu).sort((a, b) => a[0] - b[0]).map(([k, v]) => `| ${k} | ${LOP.map((l) => v[l]).join(" | ")} |`), "",
  "## Entity bị sửa", "", "| Điều | Lớp | Lý do máy | Gốc (LLM) | Sau duyệt |", "|---|---|---|---|---|",
  ...dong.filter((d) => d.truong_khac.length).map((d) => `| ${d.so_dieu} | ${d.lop} | ${d.ly_do_may ?? "—"} | ${d.truong_khac.map((k) => `${k}: ${d.goc[k] ?? "∅"}`).join("<br>")} | ${d.truong_khac.map((k) => `${k}: ${d.hien[k] ?? "∅"}`).join("<br>")} |`), "",
  "## Thời gian duyệt (giây / entity, khoảng của lần quyết định cuối)", "", "| Nhóm | n | Trung vị | p90 |", "|---|---|---|---|",
  `| Không sửa (y_nguyen) | ${f(thoiGian.khong_sua)} |`, `| Bị sửa (sua_nho + doi_nghia + chua_gan_nhan) | ${f(thoiGian.bi_sua)} |`,
  `| — trong đó đổi nghĩa | ${f(thoiGian.doi_nghia)} |`, `| Từ chối | ${f(thoiGian.tu_choi)} |`, "",
  `Entity đã xử lý nhưng không có khoảng đo (duyệt cả chunk, quyết định đầu phiên, hoặc khoảng > 10 phút): ${thoiGian.so_entity_da_xu_ly_khong_co_khoang}.`, "",
  `Kiểm định: ${thoiGian.kiem_dinh.phep}${mw ? ` — U = ${mw.U}, z = ${mw.z.toFixed(2)}, p = ${mw.p.toFixed(3)}` : ` — ${thoiGian.kiem_dinh.ly_do}`}. **Kết luận: ${thoiGian.kiem_dinh.ket_luan}.**`,
  `Tiêu chí cố định trước: ${thoiGian.tieu_chi_co_dinh_truoc}`, "",
].join("\n");
writeFileSync(`research/sau/so-sanh-de-xuat-${nguon}.md`, md);
console.log(md.split("## Theo điều")[0]);
console.log(`Thời gian: không sửa ${f(thoiGian.khong_sua)} · bị sửa ${f(thoiGian.bi_sua)} · ${thoiGian.kiem_dinh.ket_luan}`);
console.log(`→ research/sau/so-sanh-de-xuat-${nguon}.{json,md}`);
