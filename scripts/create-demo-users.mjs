// Tạo / cập nhật tài khoản demo trên Supabase Auth với app_metadata.nexora_role (docs/CONTRACT.md §4).
// Chạy SAU scripts/seed-demo.mjs (cần 2 customer demo):
//   node --env-file=.env.local scripts/create-demo-users.mjs            # tạo mới, user đã có thì chỉ cập nhật app_metadata
//   node --env-file=.env.local scripts/create-demo-users.mjs --reset    # đặt lại mật khẩu cho cả 3 tài khoản
//
// Mật khẩu sinh ngẫu nhiên, ghi vào .env.demo.local (đã gitignore) — script KHÔNG in mật khẩu ra màn hình.
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
  {
    key: "ABC",
    email: "daumoi@abc-logistics.test",
    app_metadata: { nexora_role: "customer", customer_id: "a0000000-0000-4000-8000-000000000001" },
  },
  {
    key: "SMILE",
    email: "daumoi@smilecare.test",
    app_metadata: { nexora_role: "customer", customer_id: "a0000000-0000-4000-8000-000000000002" },
  },
];

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
  .in("id", USERS.flatMap((u) => (u.app_metadata.customer_id ? [u.app_metadata.customer_id] : [])));
if (customerError || customers.length !== 2) {
  console.error("Chưa có 2 customer demo — chạy scripts/seed-demo.mjs trước.", customerError?.message ?? "");
  process.exit(1);
}

const { data: list, error: listError } = await admin.auth.admin.listUsers({ perPage: 1000 });
if (listError) {
  console.error(`Không đọc được danh sách user: ${listError.message}`);
  process.exit(1);
}

const out = { ...saved };
for (const u of USERS) {
  const existing = list.users.find((x) => x.email === u.email);
  const needPassword = !existing || reset || !saved[`DEMO_${u.key}_PASSWORD`];
  const password = needPassword ? randomBytes(12).toString("base64url") : undefined;

  const { error } = existing
    ? await admin.auth.admin.updateUserById(existing.id, { app_metadata: u.app_metadata, ...(password ? { password } : {}) })
    : await admin.auth.admin.createUser({ email: u.email, password, email_confirm: true, app_metadata: u.app_metadata });
  if (error) {
    console.error(`✗ ${u.email}: ${error.message}`);
    process.exit(1);
  }

  out[`DEMO_${u.key}_EMAIL`] = u.email;
  if (password) out[`DEMO_${u.key}_PASSWORD`] = password;
  console.log(
    `✓ ${existing ? "cập nhật" : "tạo mới"} ${u.email}  app_metadata=${JSON.stringify(u.app_metadata)}` +
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
