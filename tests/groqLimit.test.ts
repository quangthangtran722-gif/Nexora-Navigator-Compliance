// Test hạ trần output khi Groq từ chối "Request too large". Chạy: npm test
import assert from "node:assert/strict";
import { test } from "node:test";

import { maxOutputTokensSauTuChoi } from "../lib/pipeline/groqLimit.ts";

const tuChoi = (requested: number) =>
  new Error(`Request too large for model \`openai/gpt-oss-120b\` ... (TPM): Limit 8000, Requested ${requested}, please reduce`);

test("hạ trần đúng phần vượt + biên 100", () => {
  assert.equal(maxOutputTokensSauTuChoi(tuChoi(8553), 4600), 3947);
});

test("lỗi khác (rate limit, mạng) → không gọi lại", () => {
  assert.equal(maxOutputTokensSauTuChoi(new Error("Rate limit reached ... tokens per minute"), 4600), null);
  assert.equal(maxOutputTokensSauTuChoi("fetch failed", 4600), null);
});

test("vượt quá nhiều (còn dưới 1.500 token output) → null, phải tách chunk", () => {
  assert.equal(maxOutputTokensSauTuChoi(tuChoi(11500), 4600), null);
});
