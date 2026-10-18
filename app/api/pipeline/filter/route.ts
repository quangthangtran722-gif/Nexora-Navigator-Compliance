// POST /api/pipeline/filter — rule engine (KHÔNG AI) cho 1 khách hàng (docs/CONTRACT.md §7)
import { errorResponse, getCaller, readJson, requireCustomerAccess, requireUuid } from "@/lib/api/http";
import { filterDomain } from "@/lib/pipeline/filterDomain";

export async function POST(request: Request) {
  try {
    const caller = await getCaller(request);
    const body = await readJson(request);
    const customerId = requireUuid(body.customer_id, "customer_id");
    const entityId = body.entity_id === undefined ? undefined : requireUuid(body.entity_id, "entity_id");
    requireCustomerAccess(caller, customerId);
    return Response.json(await filterDomain(caller.supabase, customerId, { entityId }));
  } catch (err) {
    return errorResponse(err);
  }
}
