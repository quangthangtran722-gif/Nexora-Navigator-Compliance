// Bước AI #2 — viết nội dung checklist cho diagnostic ap_dung/sap_ap_dung chưa có nội dung.
// AI chỉ diễn đạt lại, không quyết định áp dụng (đã do ruleEngine.ts quyết). Kết quả vẫn là draft
// cho_duyet; người đầu mối duyệt qua approve_diagnostic. Trigger DB tạo notification cho_duyet.

import { createGroq } from "@ai-sdk/groq";
import { generateText, Output } from "ai";
import type { SupabaseClient } from "@supabase/supabase-js";
import { fromDb } from "@/lib/api/http";
import {
  buildGenerateUserPrompt,
  formatDiagnostic,
  GENERATE_PROMPT_VERSION,
  GENERATE_SYSTEM_PROMPT,
  generateSchema,
  numbersNotInSource,
  type NghiaVuInput,
} from "./generateDiagnostic.prompt";
import { aiError, failRun, finishRun, GROQ_MODEL, startRun } from "./runs";

export const LOAI_ENTITY_LABEL: Record<string, string> = {
  doi_tuong: "Đối tượng",
  che_tai: "Chế tài",
  dieu_kien: "Điều kiện",
  muc_thue: "Mức thuế",
  thoi_han: "Thời hạn",
  mien_giam: "Miễn giảm",
  nguong: "Ngưỡng",
};

// Quota Groq 8K token/phút: 3 diagnostic/lần gọi AI, tối đa 2 lần gọi/request.
// Còn dư → frontend gọi lại tới khi so_diagnostic = 0.
const BATCH_SIZE = 3;
const MAX_PER_REQUEST = 6;

type DiagnosticRow = {
  id: string;
  entity_id: string;
  department: { ten_phong_ban: string };
  entity: {
    ten_entity: string;
    noi_dung_goc: string;
    dieu_khoan: string;
    ngay_co_hieu_luc: string | null;
    chunk: { van_ban: { so_hieu: string; ten_van_ban: string; ngay_hieu_luc: string } };
  };
};

type Neighbor = { id: string; loai_entity: string; ten_entity: string; noi_dung_goc: string };

export async function generateDiagnostic(
  supabase: SupabaseClient,
  customerId: string,
  options: { diagnosticIds?: string[]; parentRunId?: string | null } = {},
): Promise<{ run_id: string; so_diagnostic: number }> {
  let query = supabase
    .from("diagnostics")
    .select(
      "id, entity_id, department:departments!diagnostics_department_fk (ten_phong_ban), " +
        "entity:entities!diagnostics_entity_id_fkey (ten_entity, noi_dung_goc, dieu_khoan, ngay_co_hieu_luc, " +
        "chunk:chunk_id (van_ban:van_ban_id (so_hieu, ten_van_ban, ngay_hieu_luc)))",
    )
    .eq("customer_id", customerId)
    .eq("trang_thai_duyet", "cho_duyet")
    .in("trang_thai_ap_dung", ["ap_dung", "sap_ap_dung"])
    .is("noi_dung_diagnostic", null)
    .order("created_at");
  if (options.diagnosticIds) query = query.in("id", options.diagnosticIds);
  const { data: all, error } = await query.returns<DiagnosticRow[]>();
  if (error) throw fromDb(error);

  const pending = all.slice(0, MAX_PER_REQUEST);
  const runId = await startRun(
    supabase,
    {
      pipeline_name: "generate_diagnostic",
      customer_id: customerId,
      model: GROQ_MODEL,
      prompt_version: GENERATE_PROMPT_VERSION,
      parent_run_id: options.parentRunId ?? null,
    },
    { customer_id: customerId, diagnostic_ids: pending.map((d) => d.id), con_lai: all.length - pending.length },
  );

  const log: Record<string, unknown>[] = [];
  let soDiagnostic = 0;
  try {
    const neighbors = await loadNeighbors(supabase, [...new Set(pending.map((d) => d.entity_id))]);
    const groq = createGroq({ apiKey: process.env.GROQ_API_KEY });

    for (let i = 0; i < pending.length; i += BATCH_SIZE) {
      const batch = pending.slice(i, i + BATCH_SIZE);
      const inputs = batch.map((d, j): NghiaVuInput => {
        const vb = d.entity.chunk.van_ban;
        return {
          ma: `n${j + 1}`,
          phong_ban: d.department.ten_phong_ban,
          van_ban: `${vb.ten_van_ban} (${vb.so_hieu})`,
          dieu_khoan: d.entity.dieu_khoan,
          ten_hanh_vi: d.entity.ten_entity,
          noi_dung_goc: d.entity.noi_dung_goc,
          ngay_hieu_luc: d.entity.ngay_co_hieu_luc ?? vb.ngay_hieu_luc,
          lien_quan: (neighbors.get(d.entity_id) ?? []).map((n) => ({
            loai: LOAI_ENTITY_LABEL[n.loai_entity] ?? n.loai_entity,
            ten: n.ten_entity,
            noi_dung_goc: n.noi_dung_goc,
          })),
        };
      });

      const prompt = buildGenerateUserPrompt(inputs);
      const { output, usage } = await generateText({
        model: groq(GROQ_MODEL),
        system: GENERATE_SYSTEM_PROMPT,
        prompt,
        output: Output.object({ schema: generateSchema }),
        temperature: 0,
        maxOutputTokens: 3000,
        providerOptions: { groq: { structuredOutputs: true, strictJsonSchema: true, reasoningEffort: "low" } },
      });

      for (const [j, d] of batch.entries()) {
        const input = inputs[j];
        const item = output.items.find((x) => x.ma === input.ma);
        const entry: Record<string, unknown> = { diagnostic_id: d.id, prompt_ma: input.ma, ai: item ?? null };
        log.push(entry);
        if (!item) {
          entry.bi_loai = "ai_khong_tra_muc_nay";
          continue;
        }
        const lech = numbersNotInSource(item, buildGenerateUserPrompt([input]));
        if (lech.length) {
          entry.bi_loai = `so_lieu_khong_co_trong_van_ban: ${lech.join(", ")}`;
          continue;
        }

        const noiDung = formatDiagnostic(item, `${input.dieu_khoan}, ${d.entity.chunk.van_ban.so_hieu}`, input.ngay_hieu_luc);
        const { data: updated, error: updateError } = await supabase
          .from("diagnostics")
          .update({ noi_dung_diagnostic: noiDung, generate_run_id: runId })
          .eq("id", d.id)
          .eq("trang_thai_duyet", "cho_duyet")
          .is("noi_dung_diagnostic", null)
          .select("id");
        if (updateError) throw fromDb(updateError);
        if (updated.length) soDiagnostic += 1;
        else entry.bi_loai = "diagnostic_da_thay_doi_trong_luc_chay";
      }
      log.push({ batch: i / BATCH_SIZE + 1, usage: { input_tokens: usage.inputTokens ?? null, output_tokens: usage.outputTokens ?? null } });
    }

    await finishRun(supabase, runId, { so_diagnostic: soDiagnostic, con_lai: all.length - pending.length, chi_tiet: log });
  } catch (err) {
    await failRun(supabase, runId, err, { so_diagnostic: soDiagnostic, chi_tiet: log });
    throw aiError(err);
  }
  return { run_id: runId, so_diagnostic: soDiagnostic };
}

// Entity đã duyệt nối với hanh_vi theo cả 2 chiều (model đôi khi đặt ngược chiều cạnh), bỏ chu_the
async function loadNeighbors(supabase: SupabaseClient, hanhViIds: string[]): Promise<Map<string, Neighbor[]>> {
  const result = new Map<string, Neighbor[]>();
  if (!hanhViIds.length) return result;

  const [incoming, outgoing] = await Promise.all([
    supabase.from("entity_relationships").select("source_entity_id, target_entity_id").in("target_entity_id", hanhViIds),
    supabase
      .from("entity_relationships")
      .select("source_entity_id, target_entity_id")
      .in("source_entity_id", hanhViIds)
      .not("target_entity_id", "is", null),
  ]);
  if (incoming.error) throw fromDb(incoming.error);
  if (outgoing.error) throw fromDb(outgoing.error);

  const pairs: [string, string][] = [
    ...incoming.data.map((r) => [r.target_entity_id as string, r.source_entity_id as string] as [string, string]),
    ...outgoing.data.map((r) => [r.source_entity_id as string, r.target_entity_id as string] as [string, string]),
  ];
  const ids = [...new Set(pairs.map(([, n]) => n))];
  if (!ids.length) return result;

  const { data, error } = await supabase
    .from("entities")
    .select("id, loai_entity, ten_entity, noi_dung_goc")
    .in("id", ids)
    .eq("trang_thai_duyet", "da_duyet")
    .neq("loai_entity", "chu_the");
  if (error) throw fromDb(error);
  const byId = new Map((data as Neighbor[]).map((n) => [n.id, n]));

  for (const [hanhViId, nId] of pairs) {
    const n = byId.get(nId);
    if (!n || hanhViIds.includes(nId)) continue;
    const list = result.get(hanhViId) ?? [];
    if (!list.some((x) => x.id === nId)) list.push(n);
    result.set(hanhViId, list);
  }
  return result;
}
