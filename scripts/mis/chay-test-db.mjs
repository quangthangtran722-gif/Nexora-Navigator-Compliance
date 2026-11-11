// npm run test:db — chạy MỌI file supabase/tests/*.sql trên project MIS (không bao giờ prod), mỗi file một psql.
// Mỗi file tự mở transaction và ROLLBACK ở cuối: không để lại dòng nào. Chạy sau MỖI migration — gồm test quét quyền
// (quyen_kiem_thu.sql) thay cho quy ước "mỗi migration tự REVOKE".
// Chuỗi kết nối: biến môi trường MIS_DB_URL, nếu không có thì đọc .env.mis.local. Không in URL / mật khẩu.
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { spawnSync } from "node:child_process";

let url = process.env.MIS_DB_URL;
if (!url && existsSync(".env.mis.local")) {
  const env = Object.fromEntries(
    readFileSync(".env.mis.local", "utf8").split(/\r?\n/).map((l) => l.match(/^([A-Z_]+)=(.*)$/)).filter(Boolean)
      .map((m) => [m[1], m[2].trim().replace(/^"|"$/g, "")]),
  );
  url = env.MIS_DB_URL;
}
if (!url) { console.error("Thiếu MIS_DB_URL"); process.exit(1); }
const u = new URL(url);
if (!(u.hostname + u.username).includes("sttopelrdxvyszfvvcrn") || url.includes("qalexz")) {
  console.error("MIS_DB_URL không phải project MIS — dừng (test DB không bao giờ chạy trên prod)");
  process.exit(1);
}

const files = readdirSync("supabase/tests").filter((f) => f.endsWith(".sql")).sort();
let hong = 0;
for (const f of files) {
  const r = spawnSync("psql", [url, "-X", "-q", "-v", "ON_ERROR_STOP=1", "-f", `supabase/tests/${f}`], {
    encoding: "utf8",
    env: { ...process.env, PGCONNECT_TIMEOUT: "15", PGCLIENTENCODING: "UTF8" },
  });
  const out = `${r.stdout}\n${r.stderr}`.replaceAll(u.password, "***");
  const ok = (out.match(/NOTICE:\s+OK /g) ?? []).length;
  const sai = out.split(/\r?\n/).filter((l) => /SAI |ERROR:/.test(l)).map((l) => l.replace(/^psql:[^ ]+ /, ""));
  if (r.status === 0) console.log(`✔ ${f} — ${ok} ca`);
  else {
    hong++;
    console.log(`✖ ${f} — ${ok} ca qua trước khi dừng`);
    for (const l of sai.length ? sai : out.split(/\r?\n/).filter(Boolean).slice(-3)) console.log(`    ${l}`);
  }
}
process.exit(hong ? 1 : 0);
