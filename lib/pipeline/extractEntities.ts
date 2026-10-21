// Bước AI #1 — trích xuất entity + relationship từ 1 chunk văn bản luật.
// Output AI chỉ là DRAFT cho_duyet (DB cũng chặn insert trạng thái khác); curator duyệt qua approve_entity/approve_chunk.

import { createGroq } from "@ai-sdk/groq";
import { generateText, Output } from "ai";
import type { SupabaseClient } from "@supabase/supabase-js";
import { ApiError, fromDb } from "@/lib/api/http";
import { buildExtractSchema, buildExtractSchemaMotLinhVuc, type ExtractOutput } from "./extractEntities.schema";
import { buildExtractUserPrompt, EXTRACT_PROMPT_VERSION, EXTRACT_SYSTEM_PROMPT } from "./extractEntities.prompt";
import { splitArticles, validateExtraction, type GroundingResult } from "./grounding";
import { maxOutputTokensSauTuChoi } from "./groqLimit";
import { aiError, failRun, finishRun, GROQ_MODEL, startRun } from "./runs";

// Output 1 chunk 2 điều ~4.300 token; mặc định 3.072 làm cắt mất phần relationships
const MAX_OUTPUT_TOKENS = 4600;
export type ExtractResult = {
  run_id: string;
  so_entity: number;
  so_relationship: number;
  so_bi_loai: number;
  so_canh_bao: number;
};

type ChunkRow = {
  id: string;
  thu_tu: number;
  tieu_de: string | null;
  noi_dung: string;
  trang_thai: string;
  van_ban: { ten_van_ban: string; so_hieu: string; domains: string[] };
};

export async function extractEntities(supabase: SupabaseClient, chunkId: string): Promise<ExtractResult> {
  const { data: chunk, error } = await supabase
    .from("van_ban_chunks")
    .select("id, thu_tu, tieu_de, noi_dung, trang_thai, van_ban:van_ban_id (ten_van_ban, so_hieu, domains)")
    .eq("id", chunkId)
    .maybeSingle<ChunkRow>();
  if (error) throw fromDb(error);
  if (!chunk) throw new ApiError(404, "Không tìm thấy chunk", "PT404");

  const articles = splitArticles(chunk.noi_dung);
  if (articles.length === 0) {
    throw new ApiError(400, 'Chunk không có tiêu đề "Điều N." nào ở đầu dòng nên không tách được điều', "PT400");
  }
  const [firstDomain, ...restDomains] = chunk.van_ban.domains;

  // Trích lại chunk đã có entity sẽ tạo bản trùng (entity không xóa được) → chỉ cho chunk chưa có entity
  const { count, error: countError } = await supabase
    .from("entities")
    .select("id", { count: "exact", head: true })
    .eq("chunk_id", chunkId);
  if (countError) throw fromDb(countError);
  if (count) throw new ApiError(409, `Chunk đã có ${count} entity, không trích xuất lại`, "PT409");

  // Giữ chỗ chunk: WHERE theo trạng thái = chống 2 curator bấm cùng lúc
  const { data: claimed, error: claimError } = await supabase
    .from("van_ban_chunks")
    .update({ trang_thai: "dang_xu_ly" })
    .eq("id", chunkId)
    .in("trang_thai", ["cho_xu_ly", "loi"])
    .select("id");
  if (claimError) throw fromDb(claimError);
  if (!claimed.length) {
    throw new ApiError(409, `Chunk đang ở trạng thái ${chunk.trang_thai}, không trích xuất được`, "PT409");
  }

  const userPrompt = buildExtractUserPrompt({
    tenVanBan: chunk.van_ban.ten_van_ban,
    soHieu: chunk.van_ban.so_hieu,
    domains: chunk.van_ban.domains,
    thuTu: chunk.thu_tu,
    tieuDe: chunk.tieu_de,
    articles,
  });

  let runId: string;
  try {
    runId = await startRun(
      supabase,
      { pipeline_name: "extract_entities", chunk_id: chunkId, model: GROQ_MODEL, prompt_version: EXTRACT_PROMPT_VERSION },
      { chunk_id: chunkId, so_dieu: articles.map((a) => a.soDieu), domains: chunk.van_ban.domains, user_prompt: userPrompt },
    );
  } catch (err) {
    await setChunkStatus(supabase, chunkId, "loi");
    throw err;
  }

  let grounding: GroundingResult | undefined;
  try {
    const groq = createGroq({ apiKey: process.env.GROQ_API_KEY });
    const schema = restDomains.length ? buildExtractSchema([firstDomain, ...restDomains]) : buildExtractSchemaMotLinhVuc(firstDomain);
    const goi = (maxOutputTokens: number) =>
      generateText({
        model: groq(GROQ_MODEL),
        system: EXTRACT_SYSTEM_PROMPT,
        prompt: userPrompt,
        output: Output.object({ schema }),
        temperature: 0,
        maxOutputTokens,
        providerOptions: { groq: { structuredOutputs: true, strictJsonSchema: true, reasoningEffort: "low" } },
      });
    // Groq báo "Request too large" → hạ trần output theo số Groq báo, tối đa 2 lần (số báo không tuyến tính)
    let maxOutputTokens = MAX_OUTPUT_TOKENS;
    let result: Awaited<ReturnType<typeof goi>> | undefined;
    for (let lan = 0; !result; lan++) {
      try {
        result = await goi(maxOutputTokens);
      } catch (err) {
        const next = lan < 2 ? maxOutputTokensSauTuChoi(err, maxOutputTokens) : null;
        if (next === null) throw err;
        maxOutputTokens = next;
      }
    }
    const { output: raw, usage, finishReason } = result;

    // 1 lĩnh vực → schema không có domain, gán ở đây
    const output: ExtractOutput = {
      ...raw,
      entities: raw.entities.map((e) => ({ domain: firstDomain, ...e })),
    };

    // Grounding = chốt chặn bằng code: chỉ entity có trích dẫn nguyên văn trong đúng điều mới vào DB
    grounding = validateExtraction(articles, output);
    const idByMaTam = await insertGraph(supabase, chunkId, runId, grounding);

    await finishRun(supabase, runId, {
      ...grounding,
      dieu_bo_qua: output.dieu_bo_qua,
      entity_ids: Object.fromEntries(idByMaTam),
      finish_reason: finishReason,
      max_output_tokens: maxOutputTokens,
      usage: { input_tokens: usage.inputTokens ?? null, output_tokens: usage.outputTokens ?? null },
    });
    // Không còn gì để duyệt (mọi điều đều bị bỏ qua / bị loại) → chunk xong luôn
    await setChunkStatus(supabase, chunkId, grounding.entities.length ? "da_trich_xuat" : "hoan_tat");
  } catch (err) {
    await failRun(supabase, runId, err, grounding);
    await setChunkStatus(supabase, chunkId, "loi");
    throw aiError(err);
  }

  return {
    run_id: runId,
    so_entity: grounding.entities.length,
    so_relationship: grounding.relationships.length,
    so_bi_loai: grounding.rejected.length,
    so_canh_bao: grounding.warnings.length,
  };
}

async function insertGraph(
  supabase: SupabaseClient,
  chunkId: string,
  runId: string,
  grounding: GroundingResult,
): Promise<Map<string, string>> {
  const idByMaTam = new Map<string, string>();
  if (!grounding.entities.length) return idByMaTam;

  // 1 lệnh insert = 1 transaction: hoặc vào hết, hoặc không entity nào
  const { data: inserted, error } = await supabase
    .from("entities")
    .insert(
      grounding.entities.map((e) => ({
        chunk_id: chunkId,
        pipeline_run_id: runId,
        ma_tam: e.ma_tam,
        ten_entity: e.ten_entity,
        loai_entity: e.loai_entity,
        mo_ta: e.mo_ta,
        so_dieu: e.so_dieu,
        dieu_khoan: e.dieu_khoan,
        noi_dung_goc: e.noi_dung_goc,
        domain: e.domain,
        primary_departments: e.primary_departments,
        secondary_departments: e.secondary_departments,
        ngay_co_hieu_luc: e.ngay_co_hieu_luc,
      })),
    )
    .select("id, ma_tam");
  if (error) throw fromDb(error);
  for (const row of inserted) idByMaTam.set(row.ma_tam as string, row.id as string);

  if (grounding.relationships.length) {
    const { error: relError } = await supabase.from("entity_relationships").insert(
      grounding.relationships.map((r) => ({
        chunk_id: chunkId,
        pipeline_run_id: runId,
        source_entity_id: idByMaTam.get(r.source),
        target_entity_id: r.target === null ? null : idByMaTam.get(r.target),
        target_ref_text: r.target === null ? r.target_ref_text : null,
        loai_relationship: r.loai_relationship,
        can_cu: r.can_cu,
      })),
    );
    if (relError) {
      throw new ApiError(
        fromDb(relError).status,
        `Đã lưu ${inserted.length} entity nhưng lưu relationship lỗi: ${relError.message}`,
        relError.code,
      );
    }
  }
  return idByMaTam;
}

async function setChunkStatus(supabase: SupabaseClient, chunkId: string, trangThai: string): Promise<void> {
  const { error } = await supabase.from("van_ban_chunks").update({ trang_thai: trangThai }).eq("id", chunkId);
  if (error) console.error(`Không cập nhật được trạng thái chunk ${chunkId}:`, error.message);
}
