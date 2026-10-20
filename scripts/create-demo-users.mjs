// Tạo / cập nhật tài khoản demo trên Supabase Auth với app_metadata.nexora_role (docs/CONTRACT.md §4).
// Chạy SAU scripts/seed-demo.mjs (cần 3 customer demo):
//   node --env-file=.env.local scripts/create-demo-users.mjs            # tạo mới, user đã có thì chỉ cập nhật app_metadata
//   node --env-file=.env.local scripts/create-demo-users.mjs --reset    # đặt lại mật khẩu (ngẫu nhiên) cho mọi tài khoản
//
// Mật khẩu sinh ngẫu nhiên, ghi vào .env.demo.local (đã gitignore) — script KHÔNG in mật khẩu ra màn hình.
// Muốn mật khẩu cố định cho 1 tài khoản: ghi sẵn DEMO_<KEY>_PASSWORD=... vào .env.demo.local trước khi chạy
// (user mới tạo bằng mật khẩu đó; user đã có thì giữ nguyên mật khẩu hiện tại).
// app_metadata chỉ service role ghi được → user không tự đổi vai trò được.

import { randomBytes } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";

import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error("Thiếu NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY trong .env.local");
  process.exit(1);
}
const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
const reset = process.argv.includes("--reset");
const CREDENTIALS_FILE = ".env.demo.local";

// Tên miền .test (RFC 2606) — không gửi được email, không trùng địa chỉ thật
const USERS = [
  { key: "CURATOR", email: "curator@nexora-demo.test", app_metadata: { nexora_role: "curator" } },
  // Trước là ABC Logistics (key ABC, daumoi@abc-logistics.test) — user cũ được đổi email tại chỗ, giữ mật khẩu.
  {
    key: "NEXORA",
    email: "daumoi@nexoratech.test",
    email_cu: "daumoi@abc-logistics.test",
    key_cu: "ABC",
    app_metadata: { nexora_role: "customer", customer_id: "a0000000-0000-4000-8000-000000000001" },
  },
  {
    key: "SMILE",
    email: "daumoi@smilecare.test",
    app_metadata: { nexora_role: "customer", customer_id: "a0000000-0000-4000-8000-000000000002" },
  },
  // Thiên Phú (ngành chứng khoán) — email theo yêu cầu demo; email_confirm=true nên không gửi mail nào.
  // Curator là vai trò toàn hệ thống (duyệt kho luật chung), không gắn customer_id.
  { key: "CURATOR_THIENPHU", email: "curator_thienphu@demo.nexora.vn", app_metadata: { nexora_role: "curator" } },
  {
    key: "THIENPHU",
    email: "thienphu@demo.nexora.vn",
    app_metadata: { nexora_role: "customer", customer_id: "a0000000-0000-4000-8000-000000000003" },
  },
];
const CUSTOMER_IDS = USERS.flatMap((u) => (u.app_metadata.customer_id ? [u.app_metadata.customer_id] : []));

const saved = existsSync(CREDENTIALS_FILE)
  ? Object.fromEntries(
      readFileSync(CREDENTIALS_FILE, "utf8")
        .split(/\r?\n/)
        .filter((l) => l.includes("=") && !l.startsWith("#"))
        .map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1)]),
    )
  : {};

const { data: customers, error: customerError } = await admin
  .from("customers")
  .select("id")
  .in("id", CUSTOMER_IDS);
if (customerError || customers.length !== CUSTOMER_IDS.length) {
  console.error(`Chưa đủ ${CUSTOMER_IDS.length} customer demo — chạy scripts/seed-demo.mjs trước.`, customerError?.message ?? "");
  process.exit(1);
}

const { data: list, error: listError } = await admin.auth.admin.listUsers({ perPage: 1000 });
if (listError) {
  console.error(`Không đọc được danh sách user: ${listError.message}`);
  process.exit(1);
}

const out = { ...saved };
for (const u of USERS) {
  const existing = list.users.find((x) => x.email === u.email) ?? list.users.find((x) => u.email_cu && x.email === u.email_cu);
  const doiEmail = existing && existing.email !== u.email;
  const savedPassword = saved[`DEMO_${u.key}_PASSWORD`] ?? (u.key_cu ? saved[`DEMO_${u.key_cu}_PASSWORD`] : undefined);
  // reset / chưa có mật khẩu lưu → sinh mới; user mới + có mật khẩu lưu sẵn → tạo bằng mật khẩu đó
  const password =
    reset || !savedPassword ? randomBytes(12).toString("base64url") : existing ? undefined : savedPassword;

  const { error } = existing
    ? await admin.auth.admin.updateUserById(existing.id, {
        app_metadata: u.app_metadata,
        ...(doiEmail ? { email: u.email, email_confirm: true } : {}),
        ...(password ? { password } : {}),
      })
    : await admin.auth.admin.createUser({ email: u.email, password, email_confirm: true, app_metadata: u.app_metadata });
  if (error) {
    console.error(`✗ ${u.email}: ${error.message}`);
    process.exit(1);
  }

  out[`DEMO_${u.key}_EMAIL`] = u.email;
  if (password) out[`DEMO_${u.key}_PASSWORD`] = password;
  else if (savedPassword) out[`DEMO_${u.key}_PASSWORD`] = savedPassword;
  if (u.key_cu) {
    delete out[`DEMO_${u.key_cu}_EMAIL`];
    delete out[`DEMO_${u.key_cu}_PASSWORD`];
  }
  console.log(
    `✓ ${existing ? "cập nhật" : "tạo mới"} ${doiEmail ? `${existing.email} → ` : ""}${u.email}  app_metadata=${JSON.stringify(u.app_metadata)}` +
      (password ? "  (mật khẩu mới)" : ""),
  );
}

writeFileSync(
  CREDENTIALS_FILE,
  "# Tài khoản demo Nexora — sinh bởi scripts/create-demo-users.mjs. KHÔNG commit.\n" +
    Object.entries(out)
      .map(([k, v]) => `${k}=${v}`)
      .join("\n") +
    "\n",
);
console.log(`\nEmail + mật khẩu đã ghi vào ${CREDENTIALS_FILE} (gitignore). Gửi frontend qua kênh riêng, không dán vào repo/chat nhóm công khai.`);
