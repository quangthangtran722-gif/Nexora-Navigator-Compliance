// H1 (docs/mis/PLAN.md §1.2) — so sánh schema `public` giữa project cũ (prod SpawnX) và project MIS.
// CHỈ ĐỌC trên cả hai DB: mỗi truy vấn chạy trong `begin read only`.
// Đọc PROD_DB_URL, MIS_DB_URL từ .env.mis.local; cần `psql` trong PATH.
// Không in chuỗi kết nối, không in stderr gốc của psql (có thể chứa mảnh mật khẩu).
// Ghi: research/schema-diff/BAO_CAO.md. Thoát mã 2 nếu có chênh lệch.
//
// Dùng: node scripts/mis/so-sanh-schema.mjs

import { readFileSync, writeFileSync, mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";

const env = Object.fromEntries(
  readFileSync(".env.mis.local", "utf8")
    .split(/\r?\n/)
    .map((l) => l.match(/^([A-Z_]+)=(.*)$/))
    .filter(Boolean)
    .map((m) => [m[1], m[2].trim().replace(/^"|"$/g, "")]),
);

// Mỗi dòng: loai | khoa | gia_tri. So theo (loai, khoa).
const SQL = String.raw`
with
ns as (select oid from pg_namespace where nspname = 'public'),
rel as (
  select c.oid, c.relname, c.relkind, c.relowner, c.relacl, c.relrowsecurity, c.relforcerowsecurity, c.reloptions
  from pg_class c where c.relnamespace in (select oid from ns)
),
dong as (
  -- bảng / view / sequence / index: loại đối tượng, RLS, tùy chọn
  select 'quan_he' loai, relname khoa,
         concat_ws(' ', 'kind=' || relkind::text, 'rls=' || relrowsecurity, 'force_rls=' || relforcerowsecurity,
                   'opts=' || coalesce(array_to_string(reloptions, ','), '')) gia_tri
  from rel
  union all
  select 'chu_so_huu', relname, pg_get_userbyid(relowner) from rel where relkind in ('r','v','m','S')
  union all
  -- cột: kiểu, default, not null, generated, identity
  select 'cot', r.relname || '.' || a.attname,
         concat_ws(' | ', format_type(a.atttypid, a.atttypmod),
                   'default=' || coalesce(pg_get_expr(d.adbin, d.adrelid), ''),
                   'notnull=' || a.attnotnull, 'gen=' || a.attgenerated::text, 'ident=' || a.attidentity::text, 'so_thu_tu=' || a.attnum)
  from rel r join pg_attribute a on a.attrelid = r.oid
  left join pg_attrdef d on d.adrelid = a.attrelid and d.adnum = a.attnum
  where r.relkind in ('r','v','m','p') and a.attnum > 0 and not a.attisdropped
  union all
  select 'rang_buoc', r.relname || '.' || co.conname, co.contype::text || ' ' || pg_get_constraintdef(co.oid)
  from pg_constraint co join rel r on r.oid = co.conrelid
  union all
  select 'chi_muc', i.relname, pg_get_indexdef(i.oid)
  from rel i where i.relkind = 'i'
  union all
  select 'ham', p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')',
         concat_ws(' | ', 'tra_ve=' || pg_get_function_result(p.oid), 'security_definer=' || p.prosecdef,
                   'volatile=' || p.provolatile::text, 'config=' || coalesce(array_to_string(p.proconfig, ','), ''),
                   'md5_dinh_nghia=' || md5(pg_get_functiondef(p.oid)))
  from pg_proc p where p.pronamespace in (select oid from ns)
  union all
  select 'trigger', r.relname || '.' || t.tgname, t.tgenabled::text || ' ' || pg_get_triggerdef(t.oid)
  from pg_trigger t join rel r on r.oid = t.tgrelid where not t.tgisinternal
  union all
  select 'policy', pol.tablename || '.' || pol.policyname,
         concat_ws(' | ', pol.permissive, pol.cmd, array_to_string(pol.roles, ','),
                   'using=' || coalesce(pol.qual, ''), 'check=' || coalesce(pol.with_check, ''))
  from pg_policies pol where pol.schemaname = 'public'
  union all
  select 'enum', t.typname, string_agg(e.enumlabel, ',' order by e.enumsortorder)
  from pg_type t join pg_enum e on e.enumtypid = t.oid
  where t.typnamespace in (select oid from ns) group by t.typname
  union all
  select 'view', relname, md5(pg_get_viewdef(oid)) from rel where relkind in ('v','m')
  union all
  -- quyền trên bảng / view / sequence (bỏ grantor: khác nhau giữa hai project là bình thường)
  select 'quyen_bang', r.relname || ' → ' || case when x.grantee = 0 then 'PUBLIC' else pg_get_userbyid(x.grantee) end,
         string_agg(x.privilege_type || case when x.is_grantable then '*' else '' end, ',' order by x.privilege_type)
  from rel r, aclexplode(coalesce(r.relacl, acldefault((case when r.relkind = 'S' then 's' else 'r' end)::"char", r.relowner))) x
  where r.relkind in ('r','v','m','S','p')
  group by r.relname, x.grantee
  union all
  select 'quyen_cot', r.relname || '.' || a.attname || ' → ' || case when x.grantee = 0 then 'PUBLIC' else pg_get_userbyid(x.grantee) end,
         string_agg(x.privilege_type, ',' order by x.privilege_type)
  from rel r join pg_attribute a on a.attrelid = r.oid and a.attacl is not null, aclexplode(a.attacl) x
  group by r.relname, a.attname, x.grantee
  union all
  select 'quyen_ham', p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ') → '
           || case when x.grantee = 0 then 'PUBLIC' else pg_get_userbyid(x.grantee) end,
         string_agg(x.privilege_type, ',' order by x.privilege_type)
  from pg_proc p, aclexplode(coalesce(p.proacl, acldefault('f'::"char", p.proowner))) x
  where p.pronamespace in (select oid from ns)
  group by p.oid, p.proname, x.grantee
  union all
  select 'quyen_schema', 'public → ' || case when x.grantee = 0 then 'PUBLIC' else pg_get_userbyid(x.grantee) end,
         string_agg(x.privilege_type, ',' order by x.privilege_type)
  from pg_namespace n, aclexplode(n.nspacl) x where n.nspname = 'public' group by x.grantee
  union all
  select 'quyen_mac_dinh', pg_get_userbyid(d.defaclrole) || ' / ' || d.defaclobjtype::text || ' → '
           || case when x.grantee = 0 then 'PUBLIC' else pg_get_userbyid(x.grantee) end,
         string_agg(x.privilege_type, ',' order by x.privilege_type)
  from pg_default_acl d, aclexplode(d.defaclacl) x
  where d.defaclnamespace in (select oid from ns)
  group by d.defaclrole, d.defaclobjtype, x.grantee
  union all
  select 'chu_thich', coalesce(c.relname, '') || coalesce('.' || a.attname, ''), md5(ds.description)
  from pg_description ds join pg_class c on c.oid = ds.objoid and ds.classoid = 'pg_class'::regclass
  left join pg_attribute a on a.attrelid = c.oid and a.attnum = ds.objsubid and ds.objsubid > 0
  where c.relnamespace in (select oid from ns)
  union all
  -- ngoài schema public: chỉ để tham khảo, không tính là chênh lệch của bản dump
  select 'ngoai_extension', extname, extversion from pg_extension
)
select coalesce(json_agg(json_build_object('loai', loai, 'khoa', khoa, 'gia_tri', gia_tri)), '[]') from dong;
`;

const thuMucTam = mkdtempSync(join(tmpdir(), "so-sanh-schema-"));
const fileSql = join(thuMucTam, "catalog.sql");
writeFileSync(fileSql, "begin read only;\n" + SQL + "\ncommit;\n");

function doc(ten) {
  const url = env[ten];
  if (!url) throw new Error(`${ten} trống trong .env.mis.local`);
  // SQL qua file (không qua -c): trên Windows tham số dòng lệnh bị đổi sang codepage ANSI, hỏng ký tự ngoài ASCII.
  const r = spawnSync("psql", [url, "-X", "-A", "-t", "-q", "-v", "ON_ERROR_STOP=1", "-f", fileSql], {
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
    env: { ...process.env, PGCONNECT_TIMEOUT: "15", PGCLIENTENCODING: "UTF8" },
  });
  if (r.status !== 0) {
    const e = r.stderr || "";
    const loai = /password authentication failed/i.test(e) ? "sai mật khẩu / user"
      : /could not translate host name/i.test(e) ? "không phân giải được host"
      : /syntax error|ERROR:/.test(e) ? "lỗi SQL: " + (e.match(/ERROR:.*$/m)?.[0] ?? "")
      : "loại khác";
    throw new Error(`${ten}: psql thoát ${r.status} — ${loai}`);
  }
  const json = r.stdout.split(/\r?\n/).find((l) => l.startsWith("["));
  return JSON.parse(json);
}

const truocMat = new Date().toISOString();
const prod = doc("PROD_DB_URL");
const mis = doc("MIS_DB_URL");
rmSync(thuMucTam, { recursive: true, force: true });

const nhom = (rows) => {
  const m = new Map();
  for (const r of rows) {
    if (!m.has(r.loai)) m.set(r.loai, new Map());
    m.get(r.loai).set(r.khoa, r.gia_tri);
  }
  return m;
};
const P = nhom(prod);
const M = nhom(mis);
const loaiThuTu = [
  "quan_he", "cot", "rang_buoc", "chi_muc", "ham", "trigger", "policy", "enum", "view",
  "quyen_bang", "quyen_cot", "quyen_ham", "quyen_schema", "quyen_mac_dinh", "chu_thich", "chu_so_huu", "ngoai_extension",
];
const tenLoai = {
  quan_he: "Bảng / view / index / sequence (loại, RLS, tùy chọn)",
  cot: "Cột (kiểu, default, not null, thứ tự)",
  rang_buoc: "Ràng buộc (PK, FK, CHECK, UNIQUE)",
  chi_muc: "Chỉ mục",
  ham: "Hàm (chữ ký, kết quả, security definer, md5 định nghĩa)",
  trigger: "Trigger",
  policy: "RLS policy (biểu thức)",
  enum: "Enum (giá trị theo thứ tự)",
  view: "View (md5 định nghĩa)",
  quyen_bang: "GRANT trên bảng / view",
  quyen_cot: "GRANT theo cột",
  quyen_ham: "GRANT trên hàm",
  quyen_schema: "Quyền trên schema public",
  quyen_mac_dinh: "Quyền mặc định (ALTER DEFAULT PRIVILEGES) trong public",
  chu_thich: "COMMENT (md5)",
  chu_so_huu: "Chủ sở hữu (tham khảo)",
  ngoai_extension: "Extension toàn DB (ngoài phạm vi dump — tham khảo)",
};
const thamKhao = new Set(["chu_so_huu", "ngoai_extension"]);

const bang = [];
const chiTiet = [];
let tongChenh = 0;
for (const loai of loaiThuTu) {
  const p = P.get(loai) ?? new Map();
  const m = M.get(loai) ?? new Map();
  const chiProd = [...p.keys()].filter((k) => !m.has(k)).sort();
  const chiMis = [...m.keys()].filter((k) => !p.has(k)).sort();
  const khac = [...p.keys()].filter((k) => m.has(k) && m.get(k) !== p.get(k)).sort();
  const n = chiProd.length + chiMis.length + khac.length;
  if (!thamKhao.has(loai)) tongChenh += n;
  bang.push(`| ${tenLoai[loai]} | ${p.size} | ${m.size} | ${chiProd.length} | ${chiMis.length} | ${khac.length} |${thamKhao.has(loai) ? " tham khảo" : ""}`);
  if (n) {
    chiTiet.push(`### ${tenLoai[loai]}\n`);
    for (const k of chiProd) chiTiet.push(`- chỉ ở prod: \`${k}\` = \`${p.get(k)}\``);
    for (const k of chiMis) chiTiet.push(`- chỉ ở MIS: \`${k}\` = \`${m.get(k)}\``);
    for (const k of khac) chiTiet.push(`- khác: \`${k}\`\n  - prod: \`${p.get(k)}\`\n  - MIS: \`${m.get(k)}\``);
    chiTiet.push("");
  }
}

const md = `# So sánh schema \`public\`: prod SpawnX ↔ project MIS (H1)

Sinh bởi \`scripts/mis/so-sanh-schema.mjs\` lúc ${truocMat}. Chỉ đọc trên cả hai DB.
Nguồn: project cũ \`qalexzctwbezrbhasuvp\` (prod SpawnX) và project mới \`sttopelrdxvyszfvvcrn\` (MIS), sau khi áp
\`supabase/migrations/000_baseline_prod.sql\`. Cách làm: \`docs/mis/PLAN.md\` §1.2.

**Kết quả: ${tongChenh === 0 ? "không có chênh lệch" : `${tongChenh} chênh lệch`}** (không tính hai dòng "tham khảo").

| Loại | prod | MIS | chỉ ở prod | chỉ ở MIS | khác giá trị |
|---|---:|---:|---:|---:|---:|
${bang.join("\n")}

${chiTiet.length ? "## Chi tiết chênh lệch\n\n" + chiTiet.join("\n") : ""}
## Phạm vi so sánh

- So: mọi đối tượng trong schema \`public\` — bảng, cột, ràng buộc, chỉ mục, hàm (theo md5 của \`pg_get_functiondef\`),
  trigger, RLS policy, enum, view, GRANT bảng / cột / hàm / schema, quyền mặc định, COMMENT.
- Bỏ qua người cấp quyền (\`grantor\`): khác nhau giữa hai project là bình thường.
- **Không** so: schema \`auth\`, \`storage\` và cấu hình Auth (Site URL, redirect, xác nhận email) — không nằm trong dump,
  chỉnh tay ở bảng điều khiển (PLAN.md §1.1 bước 6). Đã kiểm: bản dump không có trigger nào trên \`auth.users\`.
- Bỏ khỏi bản dump trước khi áp (ghi ở đầu \`000_baseline_prod.sql\`): \`\\restrict\`/\`\\unrestrict\`, \`CREATE SCHEMA public\`,
  \`COMMENT ON SCHEMA public\`, 12 dòng \`ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_admin"\`.

## Ghi chú H1 (09/11/2026)

1. **Lần áp đầu lệch 31 dòng, đều là GRANT, phía MIS rộng hơn prod**: \`anon\` có ALL trên 16 bảng / view,
   \`authenticated\` có thêm UPDATE / DELETE trên 12 bảng, \`anon\` / \`authenticated\` có EXECUTE trên \`approve_chunk\`,
   \`cap_nhat_trang_thai_chunk\`. Nguyên nhân: project Supabase mới có \`ALTER DEFAULT PRIVILEGES\` cấp ALL cho \`anon\`,
   \`authenticated\` khi tạo bảng / hàm; prod đã REVOKE bớt bằng migration 002–006, nhưng \`pg_dump\` chỉ sinh GRANT so với
   quyền của chủ sở hữu, không sinh REVOKE cho quyền mặc định. Sửa: \`000_baseline_prod.sql\` có khối
   \`REVOKE ALL ON ALL TABLES / SEQUENCES / FUNCTIONS IN SCHEMA public FROM anon, authenticated\` ngay trước phần ACL của
   dump; dựng lại project MIS từ đầu bằng file đã sửa → 0 chênh lệch (bảng trên).
2. **Hệ quả cho migration 007 trở đi**: quyền mặc định ở hai project vẫn cấp ALL cho \`anon\`, \`authenticated\` trên bảng /
   hàm mới. Mỗi bảng / hàm / view mới phải REVOKE rồi GRANT đúng quyền cần — RLS chặn dòng, nhưng không thay được GRANT.
3. **Quan sát trên prod (không sửa trong H1 — schema MIS phải bằng prod để làm mốc):** \`authenticated\` có \`TRUNCATE\`,
   \`TRIGGER\`, \`REFERENCES\`, \`MAINTAIN\` trên mọi bảng, kể cả \`approvals\`, \`pipeline_runs\`. \`TRUNCATE\` không đi qua RLS và
   không kích hoạt trigger theo dòng (\`khoa_pipeline_run\`). Qua PostgREST không gọi được \`TRUNCATE\`, nên trên ứng dụng hiện
   tại không khai thác được; chỉ là lỗ hổng nếu vai \`authenticated\` có đường SQL trực tiếp.
`;
mkdirSync("research/schema-diff", { recursive: true });
writeFileSync("research/schema-diff/BAO_CAO.md", md);
console.log(`prod ${prod.length} dòng catalog, MIS ${mis.length}; chênh lệch: ${tongChenh}`);
console.log(bang.join("\n"));
process.exit(tongChenh === 0 ? 0 : 2);
