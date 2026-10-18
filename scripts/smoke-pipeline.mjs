// Smoke test 4 route /api/pipeline/* bằng tài khoản demo (scripts/create-demo-users.mjs).
// Cần `npm run dev` đang chạy. Chạy:
//   node --env-file=.env.local --env-file=.env.demo.local scripts/smoke-pipeline.mjs [chunk_id]
// Có chunk_id → curator trích xuất chunk đó (gọi Groq thật, ~10s, tốn quota).
// Script KHÔNG duyệt gì: duyệt entity/diagnostic là việc của người trên UI (CLAUDE.md mục 3.4).

import { createClient } from "@supabase/supabase-js";

const BASE = process.env.SMOKE_BASE_URL ?? "http://localhost:3000";
const chunkId = process.argv[2];

async function login(key) {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    auth: { persistSession: false },
  });
  const { data, error } = await supabase.auth.signInWithPassword({
    email: process.env[`DEMO_${key}_EMAIL`],
    password: process.env[`DEMO_${key}_PASSWORD`],
  });
  if (error) throw new Error(`Đăng nhập ${key} lỗi: ${error.message}`);
  console.log(`✓ đăng nhập ${key}: app_metadata=${JSON.stringify(data.user.app_metadata)}`);
  return { token: data.session.access_token, meta: data.user.app_metadata };
}

async function call(label, token, path, body) {
  const t0 = Date.now();
  const res = await fetch(`${BASE}/api/pipeline/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  console.log(`${label} → ${res.status} (${Date.now() - t0}ms) ${JSON.stringify(json)}`);
  return { status: res.status, json };
}

const curator = await login("CURATOR");
const abc = await login("ABC");

console.log("\n--- quyền ---");
await call("ABC gọi extract (mong 403)", abc.token, "extract", { chunk_id: "00000000-0000-4000-8000-000000000000" });
await call("ABC gọi filter cho Smile (mong 403)", abc.token, "filter", { customer_id: "a0000000-0000-4000-8000-000000000002" });
await call("ABC gọi rescan (mong 403)", abc.token, "rescan", {});

if (chunkId) {
  console.log("\n--- extract ---");
  await call("curator extract", curator.token, "extract", { chunk_id: chunkId });
  await call("curator extract lại (mong 409)", curator.token, "extract", { chunk_id: chunkId });
}

console.log("\n--- filter / generate / rescan ---");
await call("ABC filter", abc.token, "filter", { customer_id: abc.meta.customer_id });
await call("ABC generate", abc.token, "generate", { customer_id: abc.meta.customer_id });
await call("curator rescan", curator.token, "rescan", {});
