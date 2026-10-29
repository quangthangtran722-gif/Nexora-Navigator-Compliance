// POST /api/pipeline/rescan — nút "Quét lại khách hàng hiện có" (CLAUDE.md mục 8, docs/CONTRACT.md §7).
// Cùng logic với /filter, chỉ khác cách kích hoạt: chạy filter cho từng khách hàng.
import { errorResponse, fromDb, getCaller, requireCurator } from "@/lib/api/http";
import { filterDomain } from "@/lib/pipeline/filterDomain";

// Mỗi khách hàng ~7–18 giây (đo 20–28/10), chạy tuần tự → 60 giây chỉ đủ ~4 khách hàng. 300 = trần Hobby (Fluid Compute)
export const maxDuration = 300;

export async function POST(request: Request) {
  try {
    const caller = await getCaller(request);
    requireCurator(caller);

    const { data: customers, error } = await caller.supabase.from("customers").select("id").order("created_at");
    if (error) throw fromDb(error);

    // Tuần tự: mỗi khách hàng 1 pipeline_run riêng, lỗi giữa chừng vẫn còn log các run trước
    const runIds: string[] = [];
    for (const c of customers) runIds.push((await filterDomain(caller.supabase, c.id as string, { kichHoat: "rescan" })).run_id);
    return Response.json({ run_ids: runIds });
  } catch (err) {
    return errorResponse(err);
  }
}
