// Ghi pipeline_runs cho MỌI lần chạy (CLAUDE.md mục 3.5). Run tạo ở dang_xu_ly, kết thúc bằng
// hoan_tat (kèm output) hoặc loi (kèm error_log); sau đó DB khóa row (trigger khoa_pipeline_run).

import type { SupabaseClient } from "@supabase/supabase-js";
import { ApiError, fromDb } from "@/lib/api/http";

export const GROQ_MODEL = "openai/gpt-oss-120b";

type StartRun =
  | { pipeline_name: "extract_entities"; chunk_id: string; model: string; prompt_version: string }
  | { pipeline_name: "filter_domain"; customer_id: string; parent_run_id?: string | null }
  | { pipeline_name: "generate_diagnostic"; customer_id: string; model: string; prompt_version: string; parent_run_id?: string | null };

export async function startRun(supabase: SupabaseClient, run: StartRun, input: unknown): Promise<string> {
  const { data, error } = await supabase
    .from("pipeline_runs")
    .insert({ ...run, input, trang_thai: "dang_xu_ly", started_at: new Date().toISOString() })
    .select("id")
    .single();
  if (error) throw fromDb(error);
  return data.id as string;
}

export async function finishRun(supabase: SupabaseClient, runId: string, output: unknown): Promise<void> {
  const { error } = await supabase
    .from("pipeline_runs")
    .update({ trang_thai: "hoan_tat", output, completed_at: new Date().toISOString() })
    .eq("id", runId);
  if (error) throw fromDb(error);
}

// Không ném lỗi: được gọi trong nhánh catch, lỗi gốc mới là thứ cần trả về cho client
export async function failRun(supabase: SupabaseClient, runId: string, err: unknown, output?: unknown): Promise<void> {
  const message = err instanceof Error ? err.message : String(err);
  const { error } = await supabase
    .from("pipeline_runs")
    .update({
      trang_thai: "loi",
      error_log: message,
      output: output ?? null,
      completed_at: new Date().toISOString(),
    })
    .eq("id", runId);
  if (error) console.error(`Không ghi được lỗi cho pipeline run ${runId}:`, error.message);
}

// Lỗi gọi Groq (quota 8K token/phút, timeout...) → 429 / 502 để frontend báo "thử lại sau"
export function aiError(err: unknown): unknown {
  if (err instanceof ApiError) return err;
  const statusCode = (err as { statusCode?: number }).statusCode;
  const message = err instanceof Error ? err.message : String(err);
  if (/Request too large/i.test(message)) {
    return new ApiError(413, "Chunk quá dài so với giới hạn Groq free tier (8K token/request) — tách chunk theo khoản rồi chạy lại", "AI_TOO_LARGE");
  }
  if (statusCode === 429 || /rate limit|tokens per minute/i.test(message)) {
    return new ApiError(429, "Groq hết quota tạm thời (8K token/phút) — đợi khoảng 1 phút rồi chạy lại", "AI_RATE_LIMIT");
  }
  return new ApiError(502, `Gọi AI thất bại: ${message}`, "AI_ERROR");
}
