// POST /api/pipeline/generate — AI viết nội dung diagnostic (docs/CONTRACT.md §7)
import { errorResponse, getCaller, optionalUuidArray, readJson, requireCustomerAccess, requireUuid } from "@/lib/api/http";
import { generateDiagnostic } from "@/lib/pipeline/generateDiagnostic";

export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const caller = await getCaller(request);
    const body = await readJson(request);
    const customerId = requireUuid(body.customer_id, "customer_id");
    const diagnosticIds = optionalUuidArray(body.diagnostic_ids, "diagnostic_ids");
    requireCustomerAccess(caller, customerId);
    return Response.json(await generateDiagnostic(caller.supabase, customerId, { diagnosticIds }));
  } catch (err) {
    return errorResponse(err);
  }
}
