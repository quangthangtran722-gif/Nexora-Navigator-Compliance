// Chụp số liệu TRƯỚC CAN THIỆP (đồ án MIS) — CHỈ ĐỌC, không ghi DB.
// Chạy: node --env-file=.env.local scripts/research/snapshot-baseline.mjs
//
// Xuất:
//   research/baseline/SUMMARY.md       — các số ở §13.1 docs/mis/HE_THONG_DA_CHOT.md (được commit)
//   research/baseline/raw/*.json       — dữ liệu thô (gitignore: có dữ liệu doanh nghiệp)
//
// Chỉ dùng .select() của supabase-js (HTTP GET tới PostgREST). Service role để thấy mọi dòng (bỏ qua RLS),
// nhưng không gọi insert/update/delete/rpc nào.
//
// S9 được tính lại offline bằng CHÍNH lib/pipeline/ruleEngine.ts (code thuần), nạp dữ liệu giống
// lib/pipeline/filterDomain.ts (loadHanhVi + loadDieuKien), để đối chiếu với kết quả đã lưu trong
// pipeline_runs / diagnostics.

import { createClient } from "@supabase/supabase-js";
import { execSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { ghepDieuKien, quetKhachHang, thuocTinhRuleEngine, todayInVietnam } from "../../lib/pipeline/ruleEngine.ts";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error("Thiếu NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY trong .env.local");
  process.exit(1);
}
const db = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const OUT = join(ROOT, "research", "baseline");
const RAW = join(OUT, "raw");
mkdirSync(RAW, { recursive: true });

// --------------------------------------------------------------------- đọc

// PostgREST trả tối đa 1000 dòng / request → phân trang theo range
async function all(table, columns, orderBy = "id") {
  const rows = [];
  const PAGE = 1000;
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await db.from(table).select(columns).order(orderBy).range(from, from + PAGE - 1);
    if (error) throw new Error(`${table}: ${error.message}`);
    rows.push(...data);
    if (data.length < PAGE) return rows;
  }
}

const [vanBan, chunks, entities, rels, customers, departments, diagnostics, approvals, thuocTinhHoSo, nganh, runs] =
  await Promise.all([
    all("van_ban", "*"),
    all("van_ban_chunks", "id, van_ban_id, thu_tu, tieu_de, dieu_khoan_range, trang_thai, created_at"),
    all("entities", "*"),
    all("entity_relationships", "*"),
    all("customers", "*"),
    all("departments", "*"),
    all("diagnostics", "*"),
    all("approvals", "*"),
    all("thuoc_tinh_ho_so", "*", "ma"),
    all("nganh", "*", "ma"),
    // input/output nặng → chỉ lấy để tính, raw ghi bản rút gọn
    all("pipeline_runs", "id, pipeline_name, chunk_id, customer_id, parent_run_id, trang_thai, model, prompt_version, error_log, nguoi_chay_id, started_at, completed_at, created_at, input, output"),
  ]);

// --------------------------------------------------------------------- tra cứu

const vanBanById = new Map(vanBan.map((v) => [v.id, v]));
const chunkById = new Map(chunks.map((c) => [c.id, c]));
const entityById = new Map(entities.map((e) => [e.id, e]));
const vanBanOfEntity = (e) => vanBanById.get(chunkById.get(e.chunk_id)?.van_ban_id);
const soHieu = (e) => vanBanOfEntity(e)?.so_hieu ?? "?";
const is108 = (s) => /108\/2025/.test(s);
const is77 = (s) => /77\/2025/.test(s);

const count = (arr, keyFn) => {
  const m = {};
  for (const x of arr) {
    const k = keyFn(x);
    m[k] = (m[k] ?? 0) + 1;
  }
  return m;
};

// --------------------------------------------------------------------- 1. văn bản, nghĩa vụ

const activeVanBan = vanBan.filter((v) => v.trang_thai === "active");
const chunksPerVanBan = count(chunks, (c) => c.van_ban_id);

const hanhViDaDuyet = entities.filter((e) => e.loai_entity === "hanh_vi" && e.trang_thai_duyet === "da_duyet");
const hanhViActive = hanhViDaDuyet.filter((e) => vanBanOfEntity(e)?.trang_thai === "active");
const nghiaVuTheoVanBan = count(hanhViDaDuyet, (e) => `${soHieu(e)} [${vanBanOfEntity(e)?.trang_thai}]`);

// Luật 108: loại entity × trạng thái duyệt
const e108 = entities.filter((e) => is108(soHieu(e)));
const duyet108 = {};
for (const e of e108) {
  duyet108[e.loai_entity] ??= { da_duyet: 0, tu_choi: 0, cho_duyet: 0 };
  duyet108[e.loai_entity][e.trang_thai_duyet]++;
}
const chunks108 = chunks.filter((c) => is108(vanBanById.get(c.van_ban_id)?.so_hieu ?? ""));

// bất thường: approvals da_duyet mới nhất nhưng entity hiện ở trạng thái khác
const approvalsByEntity = new Map();
for (const a of approvals.filter((a) => a.entity_id)) {
  const list = approvalsByEntity.get(a.entity_id) ?? [];
  list.push(a);
  approvalsByEntity.set(a.entity_id, list);
}
const lechDuyet = [];
for (const [entityId, list] of approvalsByEntity) {
  const e = entityById.get(entityId);
  if (!e) continue;
  const quyetDinh = new Set(list.map((a) => a.quyet_dinh));
  if (!quyetDinh.has(e.trang_thai_duyet) || quyetDinh.size > 1) {
    lechDuyet.push({
      entity_id: entityId,
      so_hieu: soHieu(e),
      loai_entity: e.loai_entity,
      trang_thai_hien_tai: e.trang_thai_duyet,
      approvals: list.map((a) => ({ quyet_dinh: a.quyet_dinh, created_at: a.created_at })),
    });
  }
}
// entity đã xử lý mà không có dòng approvals nào
const xuLyKhongApproval = entities.filter((e) => e.trang_thai_duyet !== "cho_duyet" && !approvalsByEntity.has(e.id));

// --------------------------------------------------------------------- 2. điều kiện máy đọc

const coMayDoc = entities.filter((e) => e.dieu_kien_may_doc != null);
const mayDocTheoNoiDung = count(coMayDoc, (e) => `${JSON.stringify(e.dieu_kien_may_doc)} | ${e.trang_thai_duyet}`);
const mayDocChiTiet = coMayDoc.map((e) => ({
  so_hieu: soHieu(e),
  loai_entity: e.loai_entity,
  ten_entity: e.ten_entity,
  trang_thai_duyet: e.trang_thai_duyet,
  dieu_kien_may_doc: e.dieu_kien_may_doc,
}));

// chủ thể được xác nhận "chung" qua approve_entity (005) — chỉ là tiền tố trong approvals.ghi_chu
const CHU_THE_CHUNG = "[Chủ thể chung";
const chuTheChungIds = new Set(
  approvals.filter((a) => a.entity_id && (a.ghi_chu ?? "").startsWith(CHU_THE_CHUNG)).map((a) => a.entity_id),
);

// --------------------------------------------------------------------- 3. S9 tính lại (giống filterDomain.ts)

const hanhViIds = new Set(hanhViActive.map((h) => h.id));
// loadDieuKien: cạnh dieu_kien → hanh_vi; hanh_vi ap_dung_cho → chu_the (target not null)
const canh = [
  ...rels
    .filter((r) => r.loai_relationship === "dieu_kien" && hanhViIds.has(r.target_entity_id))
    .map((r) => ({ hanhViId: r.target_entity_id, entityId: r.source_entity_id })),
  ...rels
    .filter((r) => r.loai_relationship === "ap_dung_cho" && hanhViIds.has(r.source_entity_id) && r.target_entity_id)
    .map((r) => ({ hanhViId: r.source_entity_id, entityId: r.target_entity_id })),
];
// filterDomain.ts:193-200 — chỉ entity da_duyet, loại điều kiện, dieu_kien_may_doc NOT NULL
const conds = entities.filter(
  (e) =>
    canh.some((c) => c.entityId === e.id) &&
    e.trang_thai_duyet === "da_duyet" &&
    ["dieu_kien", "nguong", "chu_the"].includes(e.loai_entity) &&
    e.dieu_kien_may_doc != null,
);
const dieuKienTheoHanhVi = ghepDieuKien(canh, conds);

// entity điều kiện nối với nghĩa vụ (mọi trạng thái) — để đếm "không có điều kiện đã xác nhận"
const noiVoiHanhVi = new Map(); // hanhViId → entity[] (đã duyệt, loại điều kiện)
for (const c of canh) {
  const e = entityById.get(c.entityId);
  if (!e || e.trang_thai_duyet !== "da_duyet" || !["dieu_kien", "nguong", "chu_the"].includes(e.loai_entity)) continue;
  const list = noiVoiHanhVi.get(c.hanhViId) ?? [];
  if (!list.some((x) => x.id === e.id)) list.push(e);
  noiVoiHanhVi.set(c.hanhViId, list);
}

const homNay = todayInVietnam();
const ketQuaTinhLai = []; // {customer_id, entity_id, trang_thai}
for (const c of customers) {
  const danhGia = quetKhachHang({
    hanhVi: hanhViActive.map((h) => ({
      id: h.id,
      domain: h.domain,
      ngayHieuLuc: h.ngay_co_hieu_luc ?? vanBanOfEntity(h).ngay_hieu_luc,
    })),
    dieuKienTheoHanhVi,
    customerDomains: c.domains,
    thuocTinh: thuocTinhRuleEngine(c),
    homNay,
  });
  for (const [entityId, d] of danhGia) {
    ketQuaTinhLai.push({ customer_id: c.id, entity_id: entityId, trang_thai: d.trang_thai_ap_dung, ly_do: d.ly_do, thuoc_tinh_thieu: d.thuoc_tinh_thieu });
  }
}

const AP_DUNG = new Set(["ap_dung", "sap_ap_dung"]);
function tapApDung(rows) {
  const byCustomer = new Map();
  for (const r of rows) {
    if (!byCustomer.has(r.customer_id)) byCustomer.set(r.customer_id, []);
    if (AP_DUNG.has(r.trang_thai)) byCustomer.get(r.customer_id).push(r.entity_id);
  }
  const groups = new Map(); // key tập → [customer_id]
  for (const [cid, ids] of byCustomer) {
    const key = [...ids].sort().join(",");
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(cid);
  }
  return { byCustomer, groups };
}

// Δ theo kết quả đã lưu: lượt filter_domain QUÉT TOÀN BỘ (input.entity_id null) hoàn tất gần nhất của mỗi DN
const filterRuns = runs.filter((r) => r.pipeline_name === "filter_domain");
const latestFull = new Map();
for (const r of filterRuns) {
  if (r.trang_thai !== "hoan_tat" || r.input?.entity_id) continue;
  const prev = latestFull.get(r.customer_id);
  if (!prev || r.created_at > prev.created_at) latestFull.set(r.customer_id, r);
}
const ketQuaDaLuu = [];
for (const [cid, r] of latestFull) {
  for (const k of r.output?.ket_qua ?? []) {
    ketQuaDaLuu.push({
      customer_id: cid,
      entity_id: k.entity_id,
      trang_thai: k.trang_thai_ap_dung,
      diagnostic_ids: k.diagnostic_ids ?? [],
      ghi_chu: k.ghi_chu ?? null,
      run_id: r.id,
      run_created_at: r.created_at,
    });
  }
}

const deltaLuu = tapApDung(ketQuaDaLuu);
const deltaTinhLai = tapApDung(ketQuaTinhLai);

// "cần bổ sung" engine đã tính nhưng không lưu thành diagnostic
const chuaDuKhongLuu = ketQuaDaLuu.filter((k) => k.trang_thai === "chua_du_thong_tin" && k.diagnostic_ids.length === 0);
const chuaDuMoiLuot = filterRuns.flatMap((r) =>
  (r.output?.ket_qua ?? [])
    .filter((k) => k.trang_thai_ap_dung === "chua_du_thong_tin")
    .map((k) => ({ run_id: r.id, customer_id: r.customer_id, entity_id: k.entity_id, diagnostic_ids: k.diagnostic_ids ?? [], ghi_chu: k.ghi_chu ?? null })),
);

// --------------------------------------------------------------------- 4. tất định câm

// Nghĩa vụ (hanh_vi đã duyệt, văn bản active) được kết luận áp dụng / không áp dụng mà KHÔNG có điều kiện đã xác nhận:
//   - không có điều kiện máy đọc nào (sau ghepDieuKien), VÀ
//   - không nối tới chủ thể nào được xác nhận "chung" qua approve_entity (005).
// (Một nghĩa vụ nối tới chủ thể chung đã xác nhận là C0 có căn cứ — không tính là câm.)
const tatDinhCam = hanhViActive.filter((h) => {
  const coMay = (dieuKienTheoHanhVi.get(h.id) ?? []).length > 0;
  const coChung = (noiVoiHanhVi.get(h.id) ?? []).some((e) => e.loai_entity === "chu_the" && chuTheChungIds.has(e.id));
  return !coMay && !coChung;
});
const tatDinhCamTheoVanBan = count(tatDinhCam, soHieu);
const nghiaVuActiveTheoVanBan = count(hanhViActive, soHieu);
const chuTheNullNoiVoiNghiaVu = new Set(
  [...noiVoiHanhVi.values()].flat().filter((e) => e.loai_entity === "chu_the" && e.dieu_kien_may_doc == null).map((e) => e.id),
);

// --------------------------------------------------------------------- 5. hồ sơ

const COT_CO_DINH = ["ten_cong_ty", "ma_so_thue", "nganh", "quy_mo", "domains"];
// mã từ điển mà form không render lại (lấy từ cột) — xem mo_ta trong seed-demo.mjs / 005
const maTuCot = thuocTinhHoSo.filter((t) => /lấy từ cột customers\./.test(t.mo_ta ?? "")).map((t) => t.ma);
const thuocTinhFormHoi = thuocTinhHoSo.filter((t) => !maTuCot.includes(t.ma)).map((t) => t.ma);
// S9 thật sự dùng = domains (quy tắc 1) + thuộc tính xuất hiện trong điều kiện có hiệu lực của nghĩa vụ active
const thuocTinhS9 = [...new Set([...dieuKienTheoHanhVi.values()].flat().map((d) => d.dieu_kien_may_doc.thuoc_tinh))].sort();
const T4 = ["co_giao_dich_lien_ket"];
const t4TrongTuDien = thuocTinhHoSo.filter((t) => T4.includes(t.ma)).map((t) => t.ma);

// --------------------------------------------------------------------- 6. diagnostics

const diagTheoTrangThai = count(diagnostics, (d) => d.trang_thai_ap_dung);
const diagTheoTrangThaiDuyet = count(diagnostics, (d) => `${d.trang_thai_ap_dung} / ${d.trang_thai_duyet}`);
const diagActive = diagnostics.filter((d) => hanhViIds.has(d.entity_id));

// --------------------------------------------------------------------- ghi raw

const writeJson = (name, data) => writeFileSync(join(RAW, name), JSON.stringify(data, null, 2) + "\n");
writeJson("van_ban.json", vanBan);
writeJson("van_ban_chunks.json", chunks);
writeJson("entities.json", entities);
writeJson("entity_relationships.json", rels);
writeJson("diagnostics.json", diagnostics);
writeJson("approvals.json", approvals);
writeJson("customers.json", customers);
writeJson("departments.json", departments);
writeJson("thuoc_tinh_ho_so.json", thuocTinhHoSo);
writeJson("nganh.json", nganh);
writeJson(
  "pipeline_runs.json",
  runs.map(({ input, output, ...r }) => ({
    ...r,
    input_keys: input ? Object.keys(input) : null,
    output_keys: output ? Object.keys(output) : null,
    so_ket_qua: Array.isArray(output?.ket_qua) ? output.ket_qua.length : null,
  })),
);
writeJson("filter_ket_qua_da_luu.json", ketQuaDaLuu);
writeJson("filter_ket_qua_tinh_lai.json", ketQuaTinhLai);
writeJson("chua_du_thong_tin_moi_luot.json", chuaDuMoiLuot);
writeJson("lech_duyet.json", lechDuyet);

// --------------------------------------------------------------------- SUMMARY.md

const git = (cmd) => {
  try {
    return execSync(`git ${cmd}`, { cwd: ROOT, encoding: "utf8" }).trim();
  } catch {
    return "?";
  }
};
const now = new Date();
const host = new URL(url).hostname.split(".")[0];
const pct = (a, b) => (b ? `${((100 * a) / b).toFixed(1)}%` : "—");
// 3 DN demo có id a0000000-…-000N → lấy cả đầu và đuôi để không trùng
const shortId = (id) => `${id.slice(0, 8)}…${id.slice(-4)}`;
const custLabel = (id) => {
  const c = customers.find((x) => x.id === id);
  return c ? `\`${shortId(id)}\` nganh=${c.nganh ?? "null"}, domains=${JSON.stringify(c.domains)}` : `\`${shortId(id)}\``;
};
const table = (header, rows) =>
  [`| ${header.join(" | ")} |`, `|${header.map(() => "---").join("|")}|`, ...rows.map((r) => `| ${r.join(" | ")} |`)].join("\n");
const deltaRows = (d) =>
  [...d.groups.entries()]
    .sort((a, b) => b[1].length - a[1].length)
    .map(([key, cids], i) => [`Tập ${i + 1}`, key ? key.split(",").length : 0, cids.length, cids.map(custLabel).join("<br>")]);

// --------------------------------------------------------------------- so với §13.1 (giá trị ghi tay từ tài liệu)

const nv108 = hanhViActive.filter((e) => is108(soHieu(e))).length;
const nv77 = hanhViActive.filter((e) => is77(soHieu(e))).length;
const d108 = (loai, tt) => duyet108[loai]?.[tt] ?? 0;
const mayDocDaDuyet = coMayDoc.filter((e) => e.trang_thai_duyet === "da_duyet");
const mayDocDeuChungKhoan77 = mayDocDaDuyet.every(
  (e) => e.loai_entity === "chu_the" && is77(soHieu(e)) && JSON.stringify(e.dieu_kien_may_doc) === JSON.stringify({ gia_tri: "chung_khoan", toan_tu: "eq", thuoc_tinh: "nganh" }),
);
const deltaSizes = (d) => [...d.groups.keys()].map((k) => (k ? k.split(",").length : 0)).sort((a, b) => a - b);
const sizesStr = (d) => deltaSizes(d).join(" / ");

const soSanh = [
  ["Văn bản đang chạy", "108/2025/QH15 (9 chunk), 77/2025/TT-BTC", `${activeVanBan.map((v) => `${v.so_hieu} (${chunksPerVanBan[v.id] ?? 0} chunk)`).join(", ")}`,
    activeVanBan.length === 2 && activeVanBan.some((v) => is108(v.so_hieu)) && activeVanBan.some((v) => is77(v.so_hieu)) && chunks108.length === 9],
  ["Nghĩa vụ đã duyệt (văn bản active)", "25 (18 Luật 108, 7 TT 77)", `${hanhViActive.length} (${nv108} Luật 108, ${nv77} TT 77)`, hanhViActive.length === 25 && nv108 === 18 && nv77 === 7],
  ["Luật 108: hành vi duyệt / từ chối", "18 / 13", `${d108("hanh_vi", "da_duyet")} / ${d108("hanh_vi", "tu_choi")}`, d108("hanh_vi", "da_duyet") === 18 && d108("hanh_vi", "tu_choi") === 13],
  ["Luật 108: chủ thể duyệt / từ chối", "23 / 5", `${d108("chu_the", "da_duyet")} / ${d108("chu_the", "tu_choi")}`, d108("chu_the", "da_duyet") === 23 && d108("chu_the", "tu_choi") === 5],
  ["Luật 108: điều kiện", "5, đều từ chối", `${Object.values(duyet108.dieu_kien ?? {}).reduce((a, b) => a + b, 0)}, từ chối ${d108("dieu_kien", "tu_choi")}`, d108("dieu_kien", "tu_choi") === 5 && d108("dieu_kien", "da_duyet") === 0],
  ["Điều kiện máy đọc", "5, tất cả {nganh = chung_khoan}, 5 chủ thể TT 77", `${coMayDoc.length} (đã duyệt ${mayDocDaDuyet.length}); ${mayDocDeuChungKhoan77 ? "tất cả nganh = chung_khoan trên chủ thể TT 77" : "có điều kiện khác"}`, coMayDoc.length === 5 && mayDocDeuChungKhoan77],
  ["Δ", "2 (18 / 25)", `tính lại: ${deltaTinhLai.groups.size} (${sizesStr(deltaTinhLai)}); theo lượt đã lưu: ${deltaLuu.groups.size} (${sizesStr(deltaLuu)})`, deltaTinhLai.groups.size === 2 && deltaLuu.groups.size === 2],
  ["Bảng diagnostics", "177 áp dụng · 26 không áp dụng · 0 cần bổ sung", `${diagTheoTrangThai.ap_dung ?? 0} · ${diagTheoTrangThai.khong_ap_dung ?? 0} · ${diagTheoTrangThai.chua_du_thong_tin ?? 0}${diagTheoTrangThai.sap_ap_dung ? ` · sắp áp dụng ${diagTheoTrangThai.sap_ap_dung}` : ""}`,
    diagTheoTrangThai.ap_dung === 177 && diagTheoTrangThai.khong_ap_dung === 26 && !diagTheoTrangThai.chua_du_thong_tin && !diagTheoTrangThai.sap_ap_dung],
  ["\"Cần bổ sung\" tính nhưng không lưu", "7 (hồ sơ nganh = null)", `${chuaDuKhongLuu.length}`, chuaDuKhongLuu.length === 7],
  ["Tất định câm", "18 / 25 = 72%", `${tatDinhCam.length} / ${hanhViActive.length} = ${pct(tatDinhCam.length, hanhViActive.length)}`, tatDinhCam.length === 18 && hanhViActive.length === 25],
  ["Hồ sơ: thuộc tính thu", "20 thuộc tính + 5 trường cố định", `từ điển ${thuocTinhHoSo.length} mã (form hỏi ${thuocTinhFormHoi.length}) + ${COT_CO_DINH.length} trường cố định`, thuocTinhHoSo.length === 20],
  ["Hồ sơ: S9 dùng", "2 (domains, nganh)", `${1 + thuocTinhS9.length} (domains${thuocTinhS9.map((m) => `, ${m}`).join("")})`, thuocTinhS9.length === 1 && thuocTinhS9[0] === "nganh"],
];

const ghiChuSoSanh = [
  `Δ theo lượt đã lưu = ${deltaLuu.groups.size} vì lượt quét toàn bộ gần nhất của ${[...deltaLuu.byCustomer.keys()].filter((cid) => {
    const a = new Set(deltaLuu.byCustomer.get(cid));
    const b = new Set(deltaTinhLai.byCustomer.get(cid) ?? []);
    return a.size !== b.size || [...a].some((x) => !b.has(x));
  }).length} DN chạy khi văn bản khác còn active (xem \`raw/filter_ket_qua_da_luu.json\`). Tính lại trên thư viện hiện tại ra Δ = ${deltaTinhLai.groups.size}. Số §13.1 khớp với cách tính lại, không khớp với kết quả đã lưu.`,
  `Văn bản không active vẫn có nghĩa vụ đã duyệt: ${vanBan.filter((v) => v.trang_thai !== "active").map((v) => `${v.so_hieu} [${v.trang_thai}] ${hanhViDaDuyet.filter((e) => vanBanOfEntity(e)?.id === v.id).length} nghĩa vụ`).join("; ") || "không có"}. §13.1 không nhắc.`,
  `Từ điển ${thuocTinhHoSo.length} mã đã gồm \`nganh\`, \`quy_mo\` (trùng với trường cố định). Số trường phân biệt thu qua form = ${thuocTinhFormHoi.length} + ${COT_CO_DINH.length} = ${thuocTinhFormHoi.length + COT_CO_DINH.length}, không phải 20 + 5 = 25.`,
  `Bảng diagnostics có ${diagnostics.length - diagActive.length} dòng gắn nghĩa vụ không còn thuộc văn bản active (đếm chung trong ${diagnostics.length}).`,
  `Chủ thể xác nhận "chung" qua 005: ${chuTheChungIds.size}. Chủ thể đã duyệt, không điều kiện, nối với nghĩa vụ active: ${chuTheNullNoiVoiNghiaVu.size} (trong 23 chủ thể Luật 108 đã duyệt, phần lớn không có cạnh \`ap_dung_cho\` nào tới nghĩa vụ).`,
  `Doanh nghiệp trong DB: ${customers.length} (gồm hồ sơ demo/test).`,
  "Không đo được bằng script này: \"43/43 test pass\" (chạy `npm test` riêng) và \"chất lượng đề xuất LLM 56% / 10% / 34%\" (86 thẻ giai đoạn trước, bảng `cards` đã bị 002 xóa).",
];

const totalPairs = ketQuaDaLuu.length;
const pairsChuaDu = ketQuaDaLuu.filter((k) => k.trang_thai === "chua_du_thong_tin").length;
const tinhLaiTheoTrangThai = count(ketQuaTinhLai, (k) => k.trang_thai);
const luuTheoTrangThai = count(ketQuaDaLuu, (k) => k.trang_thai);

const md = `# Số liệu trước can thiệp (baseline)

> Sinh tự động bởi \`scripts/research/snapshot-baseline.mjs\` — **chỉ đọc**, không ghi DB.
> Đối chiếu với §13.1 \`docs/mis/HE_THONG_DA_CHOT.md\`. Dữ liệu thô: \`research/baseline/raw/\` (không commit).

| | |
|---|---|
| Ngày chụp | ${now.toISOString()} (giờ VN: ${new Intl.DateTimeFormat("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", dateStyle: "short", timeStyle: "medium" }).format(now)}) |
| Ngày đánh giá S9 tính lại | ${homNay} |
| Commit | \`${git("rev-parse --short HEAD")}\` (nhánh \`${git("branch --show-current")}\`) |
| Supabase project | \`${host}\` |
| Số dòng đã đọc | van_ban ${vanBan.length} · chunks ${chunks.length} · entities ${entities.length} · relationships ${rels.length} · customers ${customers.length} · departments ${departments.length} · diagnostics ${diagnostics.length} · approvals ${approvals.length} · pipeline_runs ${runs.length} · thuoc_tinh_ho_so ${thuocTinhHoSo.length} |

## 1. Văn bản và nghĩa vụ đã duyệt

${table(
  ["Văn bản", "Trạng thái", "Chunk", "Nghĩa vụ (hanh_vi da_duyet)"],
  vanBan.map((v) => [v.so_hieu, v.trang_thai, chunksPerVanBan[v.id] ?? 0, hanhViDaDuyet.filter((e) => vanBanOfEntity(e)?.id === v.id).length]),
)}

Nghĩa vụ đã duyệt thuộc văn bản \`active\`: **${hanhViActive.length}**.

## 2. Luật 108: kết quả duyệt

Chunk: ${chunks108.length} (${chunks108.map((c) => c.dieu_khoan_range ?? c.tieu_de ?? c.thu_tu).join("; ")})

${table(
  ["loai_entity", "da_duyet", "tu_choi", "cho_duyet"],
  Object.entries(duyet108).map(([k, v]) => [k, v.da_duyet, v.tu_choi, v.cho_duyet]),
)}

Entity có lịch sử approvals không khớp trạng thái hiện tại: **${lechDuyet.length}**
${lechDuyet.map((x) => `- \`${shortId(x.entity_id)}\` ${x.so_hieu} ${x.loai_entity}: hiện \`${x.trang_thai_hien_tai}\`, approvals ${x.approvals.map((a) => `${a.quyet_dinh}@${a.created_at}`).join(", ")}`).join("\n")}

Entity đã xử lý (không còn \`cho_duyet\`) mà không có dòng approvals nào: **${xuLyKhongApproval.length}**${xuLyKhongApproval.length ? ` (${Object.entries(count(xuLyKhongApproval, (e) => `${soHieu(e)} ${e.loai_entity} ${e.trang_thai_duyet}`)).map(([k, n]) => `${k}: ${n}`).join("; ")})` : ""}

## 3. Điều kiện máy đọc

Tổng entity có \`dieu_kien_may_doc\`: **${coMayDoc.length}** (đã duyệt: ${coMayDoc.filter((e) => e.trang_thai_duyet === "da_duyet").length})

${table(
  ["Văn bản", "loai_entity", "ten_entity", "Duyệt", "dieu_kien_may_doc"],
  mayDocChiTiet.map((x) => [x.so_hieu, x.loai_entity, x.ten_entity, x.trang_thai_duyet, `\`${JSON.stringify(x.dieu_kien_may_doc)}\``]),
)}

Theo nội dung: ${Object.entries(mayDocTheoNoiDung).map(([k, n]) => `\`${k}\` × ${n}`).join("; ")}

Chủ thể được xác nhận "chủ thể chung" qua \`approve_entity\` (tiền tố \`${CHU_THE_CHUNG}\` trong approvals.ghi_chu): **${chuTheChungIds.size}**.
Chủ thể đã duyệt, \`dieu_kien_may_doc = null\`, nối với nghĩa vụ active: **${chuTheNullNoiVoiNghiaVu.size}**.

## 4. Δ — số tập nghĩa vụ "áp dụng" phân biệt (áp dụng + sắp áp dụng)

### 4a. Theo kết quả đã lưu (lượt \`filter_domain\` quét toàn bộ, hoàn tất gần nhất của mỗi DN)

DN có lượt quét: ${latestFull.size}/${customers.length}. **Δ = ${deltaLuu.groups.size}**

${table(["Tập", "Số nghĩa vụ áp dụng", "Số DN", "DN"], deltaRows(deltaLuu))}

Kết quả lượt gần nhất theo trạng thái: ${Object.entries(luuTheoTrangThai).map(([k, n]) => `${k} ${n}`).join(" · ")}

### 4b. Tính lại hôm nay bằng \`ruleEngine.ts\` trên dữ liệu hiện tại

**Δ = ${deltaTinhLai.groups.size}**

${table(["Tập", "Số nghĩa vụ áp dụng", "Số DN", "DN"], deltaRows(deltaTinhLai))}

Theo trạng thái (${customers.length} DN × ${hanhViActive.length} nghĩa vụ = ${ketQuaTinhLai.length} cặp): ${Object.entries(tinhLaiTheoTrangThai).map(([k, n]) => `${k} ${n}`).join(" · ")}

## 5. Bảng \`diagnostics\`

Theo \`trang_thai_ap_dung\`: ${Object.entries(diagTheoTrangThai).map(([k, n]) => `**${k} ${n}**`).join(" · ")} (tổng ${diagnostics.length}; thuộc nghĩa vụ active: ${diagActive.length})

${table(["trang_thai_ap_dung / trang_thai_duyet", "Số dòng"], Object.entries(diagTheoTrangThaiDuyet).sort())}

"Cần bổ sung" engine đã tính ở lượt gần nhất nhưng **không** thành dòng diagnostic: **${chuaDuKhongLuu.length}**
${Object.entries(count(chuaDuKhongLuu, (k) => k.customer_id)).map(([cid, n]) => `- ${custLabel(cid)}: ${n} — ghi chú: ${[...new Set(chuaDuKhongLuu.filter((k) => k.customer_id === cid).map((k) => k.ghi_chu))].join("; ")}`).join("\n")}

Mọi lượt \`filter_domain\` (kể cả lượt cũ, lượt 1 entity) có kết quả \`chua_du_thong_tin\`: ${chuaDuMoiLuot.length} kết quả, trong đó ${chuaDuMoiLuot.filter((k) => !k.diagnostic_ids.length).length} không gắn diagnostic nào.

Tỉ lệ cần bổ sung (đã lưu, lượt gần nhất): ${pairsChuaDu}/${totalPairs} = ${pct(pairsChuaDu, totalPairs)} cặp; trong bảng \`diagnostics\`: ${diagTheoTrangThai.chua_du_thong_tin ?? 0}/${diagnostics.length}.

## 6. Tỉ lệ tất định câm

Định nghĩa (§14.4): nghĩa vụ được kết luận áp dụng / không áp dụng mà không có điều kiện đã xác nhận / tổng số nghĩa vụ.
Cách đếm ở đây: nghĩa vụ active **không** có điều kiện máy đọc hiệu lực nào **và không** nối với chủ thể đã xác nhận "chung".

**${tatDinhCam.length} / ${hanhViActive.length} = ${pct(tatDinhCam.length, hanhViActive.length)}**

${table(
  ["Văn bản", "Tất định câm", "Nghĩa vụ active"],
  Object.entries(nghiaVuActiveTheoVanBan).map(([k, n]) => [k, tatDinhCamTheoVanBan[k] ?? 0, n]),
)}

## 7. Hồ sơ doanh nghiệp

- Từ điển \`thuoc_tinh_ho_so\`: **${thuocTinhHoSo.length}** mã; trong đó ${maTuCot.length} mã lấy từ cột (${maTuCot.map((m) => `\`${m}\``).join(", ")}) nên form không hỏi lại → form hỏi **${thuocTinhFormHoi.length}** thuộc tính.
- Trường cố định: ${COT_CO_DINH.length} (${COT_CO_DINH.map((m) => `\`${m}\``).join(", ")}).
- S9 thật sự dùng: \`domains\` (quy tắc 1) + ${thuocTinhS9.length ? thuocTinhS9.map((m) => `\`${m}\``).join(", ") : "không thuộc tính nào"} → **${1 + thuocTinhS9.length}**.
- Thuộc tính T4 còn trong từ điển: ${t4TrongTuDien.length ? t4TrongTuDien.map((m) => `\`${m}\``).join(", ") : "không"}.
- Doanh nghiệp: ${customers.length}; phòng ban: ${departments.length}.

${table(["DN", "Số key thuoc_tinh", "Key null (không chắc)", "Phòng ban (slug)"], customers.map((c) => [
  custLabel(c.id),
  Object.keys(c.thuoc_tinh ?? {}).length,
  Object.values(c.thuoc_tinh ?? {}).filter((v) => v === null).length,
  departments.filter((d) => d.customer_id === c.id).map((d) => d.slug_phong_ban).join(", "),
]))}

## 8. Đối chiếu với §13.1 (HE_THONG_DA_CHOT.md, số ngày 08/11)

${table(["Mục §13.1", "Ghi ở §13.1", "Đo lần này", "Khớp?"], soSanh.map((r) => [r[0], r[1], r[2], r[3] ? "✅" : "**LỆCH**"]))}

Ghi chú khi lệch hoặc khi số đo cần đọc kèm điều kiện:
${ghiChuSoSanh.map((g) => `- ${g}`).join("\n")}
`;

writeFileSync(join(OUT, "SUMMARY.md"), md);

// in nhanh ra console
console.log(
  JSON.stringify(
    {
      homNay,
      active: activeVanBan.map((v) => v.so_hieu),
      nghiaVuTheoVanBan,
      nghiaVuActive: hanhViActive.length,
      duyet108,
      chunks108: chunks108.length,
      lechDuyet: lechDuyet.length,
      xuLyKhongApproval: xuLyKhongApproval.length,
      mayDoc: mayDocTheoNoiDung,
      chuTheChung: chuTheChungIds.size,
      deltaLuu: deltaLuu.groups.size,
      deltaLuuSizes: [...deltaLuu.groups.entries()].map(([k, v]) => [k ? k.split(",").length : 0, v.length]),
      deltaTinhLai: deltaTinhLai.groups.size,
      deltaTinhLaiSizes: [...deltaTinhLai.groups.entries()].map(([k, v]) => [k ? k.split(",").length : 0, v.length]),
      diagTheoTrangThai,
      chuaDuKhongLuu: chuaDuKhongLuu.length,
      tatDinhCam: `${tatDinhCam.length}/${hanhViActive.length}`,
      thuocTinhHoSo: thuocTinhHoSo.length,
      thuocTinhFormHoi: thuocTinhFormHoi.length,
      thuocTinhS9,
      customers: customers.length,
    },
    null,
    2,
  ),
);
