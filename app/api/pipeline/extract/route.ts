// POST /api/pipeline/extract — curator chạy AI trích xuất 1 chunk (docs/CONTRACT.md §7)
import { errorResponse, getCaller, readJson, requireCurator, requireUuid } from "@/lib/api/http";
import { extractEntities } from "@/lib/pipeline/extractEntities";

// Groq ~10s / chunk; để dư cho lúc Groq chậm
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const caller = await getCaller(request);
    requireCurator(caller);
    const body = await readJson(request);
    const chunkId = requireUuid(body.chunk_id, "chunk_id");
    return Response.json(await extractEntities(caller.supabase, chunkId));
  } catch (err) {
    return errorResponse(err);
  }
}
