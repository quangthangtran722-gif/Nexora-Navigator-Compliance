// H2 (docs/mis/PLAN.md §1.3) — nạp lại đề xuất cũ của LLM cho Luật 108/2025/QH15 sang project MIS, ở `cho_duyet`.
//
// Đọc prod (chỉ .select() qua PostgREST), ghi project MIS bằng psql trong MỘT transaction:
// lỗi bất kỳ / kiểm tra cuối sai → rollback, DB đích không đổi.
//
// Ranh giới (CLAUDE.md §7):
// - Entity, cạnh dựng lại TỪ `pipeline_runs.output` (đề xuất gốc của LLM), không từ bản đã sửa / đã duyệt ở prod.
// - Không ghi `trang_thai_duyet` → DB đặt `cho_duyet` (trigger guard_trang_thai_duyet chặn mọi giá trị khác).
// - Không bật `nexora.seed`, không gọi `approve_*`. `curator_id`, `dieu_kien_may_doc`, `ghi_chu_curator` = null.
// - `nguoi_chay_id`, `nguoi_tao_id` = null (tài khoản prod không tồn tại trên project mới).
// - Hồ sơ: chỉ 3 hồ sơ của tài khoản demo (`a0000000-…`). Hồ sơ người dùng thật không chép (đã chụp ở research/baseline/).
//
// Dùng:
//   node scripts/mis/nap-lai-thu-vien.mjs          # chạy thử: đọc prod, in số liệu, không ghi
//   node scripts/mis/nap-lai-thu-vien.mjs --ghi    # ghi vào project MIS
// Đọc .env.mis.local: PROD_SUPABASE_URL, PROD_SUPABASE_SERVICE_ROLE_KEY (đọc), MIS_DB_URL (ghi).
// Ghi research/reload/manifest.json (được commit: chỉ id, số dòng, tên entity — không có hồ sơ người dùng thật).

import { createClient } from "@supabase/supabase-js";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const SO_HIEU = "108/2025/QH15";
const PROD_REF = "qalexzctwbezrbhasuvp";
const MONG_DOI = { chunk: 9, run: 17, entity: 70, canh: 44 }; // bản chụp 09/11 (PLAN.md §1.3)
const GHI = process.argv.includes("--ghi");

const env = Object.fromEntries(
  readFileSync(".env.mis.local", "utf8")
    .split(/\r?\n/)
    .map((l) => l.match(/^([A-Z_]+)=(.*)$/))
    .filter(Boolean)
    .map((m) => [m[1], m[2].trim().replace(/^"|"$/g, "")]),
);
for (const k of ["PROD_SUPABASE_URL", "PROD_SUPABASE_SERVICE_ROLE_KEY", "MIS_DB_URL"]) {
  if (!env[k]) throw new Error(`${k} trống trong .env.mis.local`);
}
if (!env.PROD_SUPABASE_URL.includes(PROD_REF)) throw new Error("PROD_SUPABASE_URL không phải project prod — dừng");
const misUrl = new URL(env.MIS_DB_URL);
const misRef = (misUrl.hostname + " " + misUrl.username).match(/(?:db\.|postgres\.)([a-z0-9]{20})/)?.[1];
if (!misRef) throw new Error("Không đọc được ref project đích từ MIS_DB_URL — dừng");
if (misRef === PROD_REF || env.MIS_DB_URL.includes(PROD_REF)) throw new Error(`Đích là project prod ${PROD_REF} — TỪ CHỐI`);
console.log(`Đích: project ${misRef}${GHI ? "" : " (chạy thử, không ghi)"}`);

// ------------------------------------------------------------------ đọc prod (chỉ select)

const prod = createClient(env.PROD_SUPABASE_URL, env.PROD_SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const q = async (p, ten) => {
  const { data, error } = await p;
  if (error) throw new Error(`${ten}: ${error.message}`);
  return data;
};

const [vanBan] = await q(prod.from("van_ban").select("*").eq("so_hieu", SO_HIEU), "van_ban");
if (!vanBan) throw new Error(`Không thấy ${SO_HIEU} trên prod`);
const chunks = await q(prod.from("van_ban_chunks").select("*").eq("van_ban_id", vanBan.id).order("thu_tu"), "van_ban_chunks");
const chunkIds = chunks.map((c) => c.id);
const runs = await q(
  prod.from("pipeline_runs").select("*").in("chunk_id", chunkIds).eq("pipeline_name", "extract_entities").order("created_at"),
  "pipeline_runs",
);
const entProd = await q(prod.from("entities").select("*").in("chunk_id", chunkIds), "entities");
const relProd = await q(prod.from("entity_relationships").select("*").in("chunk_id", chunkIds), "entity_relationships");
const thuocTinh = await q(prod.from("thuoc_tinh_ho_so").select("*").order("ma"), "thuoc_tinh_ho_so");
const nganh = await q(prod.from("nganh").select("*").order("ma"), "nganh");
const customers = await q(prod.from("customers").select("*").like("ten_cong_ty", "%").order("id"), "customers");
const demo = customers.filter((c) => c.id.startsWith("a0000000-"));
const departments = demo.length
  ? await q(prod.from("departments").select("*").in("customer_id", demo.map((c) => c.id)).order("id"), "departments")
  : [];

// ------------------------------------------------------------------ dựng lại từ đề xuất gốc

const entities = [];
const canh = [];
const canhGhiChu = [];
for (const run of runs) {
  const out = run.output;
  if (!out?.entities?.length) continue;
  const idTheoMaTam = out.entity_ids ?? {};
  for (const e of out.entities) {
    const id = idTheoMaTam[e.ma_tam];
    if (!id) throw new Error(`run ${run.id}: ma_tam ${e.ma_tam} không có trong output.entity_ids`);
    const p = entProd.find((x) => x.id === id);
    entities.push({
      id,
      chunk_id: run.chunk_id,
      pipeline_run_id: run.id,
      ma_tam: e.ma_tam,
      ten_entity: e.ten_entity,
      loai_entity: e.loai_entity,
      mo_ta: e.mo_ta,
      so_dieu: e.so_dieu,
      dieu_khoan: e.dieu_khoan,
      noi_dung_goc: e.noi_dung_goc,
      domain: e.domain,
      primary_departments: e.primary_departments ?? [],
      secondary_departments: e.secondary_departments ?? [],
      ngay_co_hieu_luc: e.ngay_co_hieu_luc ?? null,
      created_at: p?.created_at ?? run.completed_at,
    });
  }
  for (const r of out.relationships ?? []) {
    const source = idTheoMaTam[r.source];
    const target = r.target === null ? null : idTheoMaTam[r.target];
    if (!source || (r.target !== null && !target)) throw new Error(`run ${run.id}: cạnh ${r.source}→${r.target} không giải được ma_tam`);
    const row = {
      chunk_id: run.chunk_id,
      pipeline_run_id: run.id,
      source_entity_id: source,
      target_entity_id: target,
      target_ref_text: target === null ? r.target_ref_text : null,
      loai_relationship: r.loai_relationship,
      can_cu: r.can_cu,
    };
    // Giữ id cạnh của prod nếu khớp đúng 1 cạnh (để đối chiếu trước / sau); không khớp → id mới
    const khop = relProd.filter(
      (x) =>
        x.pipeline_run_id === run.id && x.source_entity_id === source && x.target_entity_id === target &&
        x.loai_relationship === r.loai_relationship && x.can_cu === r.can_cu &&
        (x.target_ref_text ?? null) === (row.target_ref_text ?? null),
    );
    if (khop.length === 1) {
      row.id = khop[0].id;
      row.created_at = khop[0].created_at;
    } else {
      canhGhiChu.push({ run: run.id, source: r.source, target: r.target, so_canh_prod_khop: khop.length });
    }
    canh.push(row);
  }
}
if (new Set(canh.filter((c) => c.id).map((c) => c.id)).size !== canh.filter((c) => c.id).length) {
  throw new Error("Hai cạnh dựng lại cùng khớp một cạnh prod — dừng");
}

// Trạng thái chunk theo đúng quy tắc của extractEntities.ts: có entity chờ duyệt → da_trich_xuat; không entity nào → hoan_tat
const coEntity = new Set(entities.map((e) => e.chunk_id));
const chunkRows = chunks.map((c) => ({
  id: c.id,
  van_ban_id: c.van_ban_id,
  thu_tu: c.thu_tu,
  tieu_de: c.tieu_de,
  dieu_khoan_range: c.dieu_khoan_range,
  noi_dung: c.noi_dung,
  trang_thai: coEntity.has(c.id) ? "da_trich_xuat" : "hoan_tat",
  created_at: c.created_at,
}));
const runRows = runs.map((r) => ({ ...r, nguoi_chay_id: null }));
const vanBanRow = {
  id: vanBan.id,
  ten_van_ban: vanBan.ten_van_ban,
  so_hieu: vanBan.so_hieu,
  loai_van_ban: vanBan.loai_van_ban,
  co_quan_ban_hanh: vanBan.co_quan_ban_hanh,
  ngay_ban_hanh: vanBan.ngay_ban_hanh,
  ngay_hieu_luc: vanBan.ngay_hieu_luc,
  domains: vanBan.domains,
  trang_thai: "draft",
  nguoi_tao_id: null,
  created_at: vanBan.created_at,
};
const customerRows = demo.map(({ updated_at, ...c }) => c);

// Chênh lệch đề xuất gốc ↔ bản đang có ở prod (do chuyên viên sửa trước khi duyệt)
const TRUONG_SUA = ["ten_entity", "loai_entity", "mo_ta", "domain", "primary_departments", "secondary_departments", "ngay_co_hieu_luc"];
const chenhLech = [];
for (const e of entities) {
  const p = entProd.find((x) => x.id === e.id);
  if (!p) {
    chenhLech.push({ id: e.id, ghi_chu: "không có ở prod" });
    continue;
  }
  const truong = TRUONG_SUA.filter((k) => JSON.stringify(p[k] ?? null) !== JSON.stringify(e[k] ?? null));
  if (truong.length) chenhLech.push({ id: e.id, so_dieu: e.so_dieu, truong: Object.fromEntries(truong.map((k) => [k, { de_xuat_goc: e[k], prod: p[k] }])) });
}
const prodKhongCoTrongOutput = entProd.filter((p) => !entities.some((e) => e.id === p.id)).map((p) => p.id);

const so = { chunk: chunkRows.length, run: runRows.length, entity: entities.length, canh: canh.length };
console.log("Số dòng:", so, "| thuoc_tinh_ho_so", thuocTinh.length, "| nganh", nganh.length,
  "| customers demo", customerRows.length, "/", customers.length, "| departments", departments.length);
console.log("Chunk hoan_tat (không entity):", chunkRows.filter((c) => c.trang_thai === "hoan_tat").map((c) => c.dieu_khoan_range).join(", ") || "không");
console.log("prompt_version:", [...new Set(runRows.map((r) => r.prompt_version))].join(", "),
  "| entity sửa ở prod:", chenhLech.length, "| entity prod không có trong output:", prodKhongCoTrongOutput.length,
  "| cạnh không khớp id prod:", canhGhiChu.length);
for (const [k, v] of Object.entries(MONG_DOI)) {
  if (so[k] !== v) throw new Error(`${k}: ${so[k]} khác mong đợi ${v} — dừng, kiểm lại prod`);
}
if (prodKhongCoTrongOutput.length) throw new Error("Có entity ở prod không truy được về output của LLM — dừng");

const manifest = {
  tao_luc: new Date().toISOString(),
  nguon: { project: PROD_REF, van_ban: { id: vanBan.id, so_hieu: SO_HIEU, trang_thai_prod: vanBan.trang_thai } },
  dich: { project: misRef, van_ban_trang_thai: "draft", entity_trang_thai_duyet: "cho_duyet" },
  so_dong: { ...so, thuoc_tinh_ho_so: thuocTinh.length, nganh: nganh.length, customers: customerRows.length, departments: departments.length },
  prompt_version: [...new Set(runRows.map((r) => r.prompt_version))],
  chunk: chunkRows.map((c) => ({ id: c.id, thu_tu: c.thu_tu, dieu: c.dieu_khoan_range, trang_thai: c.trang_thai })),
  run: runRows.map((r) => ({ id: r.id, chunk_id: r.chunk_id, trang_thai: r.trang_thai, prompt_version: r.prompt_version })),
  entity: entities.map((e) => ({ id: e.id, so_dieu: e.so_dieu, dieu_khoan: e.dieu_khoan, loai: e.loai_entity, ten_de_xuat_goc: e.ten_entity })),
  canh_khong_khop_id_prod: canhGhiChu,
  sua_o_prod_so_voi_de_xuat_goc: chenhLech,
  customers: customerRows.map((c) => ({ id: c.id, ten_cong_ty: c.ten_cong_ty })),
  customers_khong_chep: customers.length - customerRows.length,
};

if (!GHI) {
  console.log("Chạy thử xong. Thêm --ghi để ghi vào project", misRef);
  process.exit(0);
}

// ------------------------------------------------------------------ ghi MIS: một transaction

const tag = "$nap_" + Math.random().toString(36).slice(2, 10) + "$";
const j = (rows) => {
  const s = JSON.stringify(rows);
  if (s.includes(tag)) throw new Error("dữ liệu chứa thẻ dollar-quote");
  return tag + s + tag;
};
const chen = (bang, cot, rows) =>
  rows.length
    ? `insert into public.${bang} (${cot.join(", ")})\n  select ${cot.join(", ")} from jsonb_populate_recordset(null::public.${bang}, ${j(rows)}::jsonb);\n`
    : "";
const sql = `
set client_encoding = 'UTF8';
-- Đích phải trống: không nạp chồng
do $$ begin
  if exists (select 1 from public.van_ban) or exists (select 1 from public.entities) or exists (select 1 from public.customers)
     or exists (select 1 from public.thuoc_tinh_ho_so) or exists (select 1 from public.nganh) then
    raise exception 'project đích đã có dữ liệu — dừng';
  end if;
  if coalesce(current_setting('nexora.seed', true), '') = 'on' then raise exception 'nexora.seed đang bật — dừng'; end if;
end $$;
${chen("thuoc_tinh_ho_so", Object.keys(thuocTinh[0]), thuocTinh)}
${chen("nganh", Object.keys(nganh[0]), nganh)}
${chen("customers", ["id", "ten_cong_ty", "nganh", "quy_mo", "domains", "thuoc_tinh", "ma_so_thue", "created_at"], customerRows)}
${chen("departments", ["id", "customer_id", "ten_phong_ban", "slug_phong_ban", "email_head", "created_at"], departments)}
${chen("van_ban", Object.keys(vanBanRow), [vanBanRow])}
${chen("van_ban_chunks", Object.keys(chunkRows[0]), chunkRows)}
${chen("pipeline_runs", ["id", "pipeline_name", "chunk_id", "customer_id", "parent_run_id", "trang_thai", "input", "output", "model",
  "prompt_version", "error_log", "nguoi_chay_id", "started_at", "completed_at", "created_at"], runRows)}
${chen("entities", Object.keys(entities[0]), entities)}
${chen("entity_relationships", ["chunk_id", "pipeline_run_id", "source_entity_id", "target_entity_id", "target_ref_text",
  "loai_relationship", "can_cu"], canh.filter((c) => !c.id))}
${chen("entity_relationships", ["id", "chunk_id", "pipeline_run_id", "source_entity_id", "target_entity_id", "target_ref_text",
  "loai_relationship", "can_cu", "created_at"], canh.filter((c) => c.id))}
-- Kiểm tra cuối, trong cùng transaction
do $$ declare n int; begin
  select count(*) into n from public.entities where trang_thai_duyet <> 'cho_duyet' or curator_id is not null or dieu_kien_may_doc is not null;
  if n > 0 then raise exception '% entity không ở trạng thái đề xuất', n; end if;
  select count(*) into n from public.entities; if n <> ${so.entity} then raise exception 'entities = %', n; end if;
  select count(*) into n from public.entity_relationships; if n <> ${so.canh} then raise exception 'cạnh = %', n; end if;
  select count(*) into n from public.entity_relationships where nguoi_tao_id is not null or pipeline_run_id is null;
  if n > 0 then raise exception '% cạnh có người tạo / không có lượt chạy', n; end if;
  select count(*) into n from public.van_ban_chunks; if n <> ${so.chunk} then raise exception 'chunk = %', n; end if;
  select count(*) into n from public.pipeline_runs where nguoi_chay_id is null; if n <> ${so.run} then raise exception 'run = %', n; end if;
  select count(*) into n from public.van_ban where trang_thai <> 'draft'; if n > 0 then raise exception 'van_ban không ở draft'; end if;
  select count(*) into n from public.approvals; if n > 0 then raise exception 'approvals không trống'; end if;
end $$;
`;
const thuMuc = mkdtempSync(join(tmpdir(), "nap-lai-"));
const file = join(thuMuc, "nap.sql");
writeFileSync(file, sql);
const r = spawnSync("psql", [env.MIS_DB_URL, "-X", "-q", "-v", "ON_ERROR_STOP=1", "--single-transaction", "-f", file], {
  encoding: "utf8",
  env: { ...process.env, PGCONNECT_TIMEOUT: "15", PGCLIENTENCODING: "UTF8" },
});
rmSync(thuMuc, { recursive: true, force: true });
if (r.status !== 0) {
  const e = r.stderr || "";
  const loi = e.match(/ERROR:.*$/m)?.[0] ?? (/password authentication failed/i.test(e) ? "sai mật khẩu / user" : "loại khác");
  console.log(`psql thoát ${r.status} — ${loi}. Đã rollback, project đích không đổi.`);
  process.exit(1);
}
mkdirSync("research/reload", { recursive: true });
writeFileSync("research/reload/manifest.json", JSON.stringify(manifest, null, 2) + "\n");
console.log("Đã ghi vào project", misRef, "→ research/reload/manifest.json");
