// GET  /api/onboard/{id} — kết quả lần quét toàn bộ gần nhất (202 khi đang quét / chưa quét). Không chạy lại.
// POST /api/onboard/{id} — quét ngược lại toàn bộ văn bản active cho doanh nghiệp này (sau "loi_quet",
//                          "can_lam_moi_phien", hoặc khi muốn tự kiểm tra). Cùng hàm với nút "Quét lại".
// Cả 2 chạy dưới RLS của người gọi: tài khoản vừa onboard phải refresh session trước.
import { errorResponse, getCaller, requireCustomerAccess, requireUuid } from "@/lib/api/http";
import { docKetQuaQuet, quetNguoc } from "@/lib/pipeline/quetNguoc";

export const maxDuration = 60;

type Ctx = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Ctx) {
  try {
    const caller = await getCaller(request);
    const id = requireUuid((await params).id, "id");
    requireCustomerAccess(caller, id);
    const ketQua = await docKetQuaQuet(caller.supabase, id);
    return Response.json(ketQua, { status: "trang_thai" in ketQua ? 202 : 200 });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function POST(request: Request, { params }: Ctx) {
  try {
    const caller = await getCaller(request);
    const id = requireUuid((await params).id, "id");
    requireCustomerAccess(caller, id);
    return Response.json(await quetNguoc(caller.supabase, id, caller.user.id));
  } catch (err) {
    return errorResponse(err);
  }
}
