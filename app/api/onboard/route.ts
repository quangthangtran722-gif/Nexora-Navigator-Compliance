// POST /api/onboard — doanh nghiệp tự đăng ký (BE-7, docs/CONTRACT.md §8).
// 1. Kiểm tra body theo danh mục thuoc_tinh_ho_so (lỗi theo từng trường, trước khi trigger DB ném lỗi chung chung)
// 2. onboard_customer (migration 006): customers + departments trong 1 transaction, gắn tài khoản mới với doanh nghiệp
// 3. Quét ngược ngay toàn bộ văn bản active (rule engine, KHÔNG AI) → trả kết quả trong cùng response.
//    Quá NGUONG_MS thì trả 202 + khach_hang_id, quét chạy tiếp; frontend hỏi GET /api/onboard/{id}.
import { after } from "next/server";
import { adminClient } from "@/lib/api/admin";
import { ApiError, errorResponse, fromDb, getCaller, readJson } from "@/lib/api/http";
import { kiemTraOnboard, type DinhNghiaThuocTinh } from "@/lib/onboard";
import { quetNguoc } from "@/lib/pipeline/quetNguoc";

export const maxDuration = 60;
const NGUONG_MS = 8000;

export async function POST(request: Request) {
  try {
    const caller = await getCaller(request);
    const body = await readJson(request);

    const { data: dict, error: dictError } = await caller.supabase.from("thuoc_tinh_ho_so").select("ma, kieu, lua_chon");
    if (dictError) throw fromDb(dictError);
    const kt = kiemTraOnboard(body, dict as DinhNghiaThuocTinh[]);
    if (!kt.payload) throw new ApiError(400, "Hồ sơ doanh nghiệp chưa hợp lệ", "PT400", kt.loi);
    const p = kt.payload;

    const { data: khachHangId, error } = await caller.supabase.rpc("onboard_customer", {
      p_ten_cong_ty: p.ten_cong_ty,
      p_ma_so_thue: p.ma_so_thue,
      p_nganh: p.nganh,
      p_quy_mo: p.quy_mo,
      p_domains: p.domains,
      p_thuoc_tinh: p.thuoc_tinh,
      p_phong_ban: p.phong_ban,
    });
    if (error) {
      if (error.code === "23505" && /ma_so_thue/.test(error.message)) {
        throw new ApiError(409, "Mã số thuế này đã được đăng ký", "23505", [{ truong: "ma_so_thue", loi: "Đã được đăng ký" }]);
      }
      throw fromDb(error);
    }
    const id = khachHangId as string;

    // Curator: JWT thấy mọi khách hàng. Tài khoản mới: JWT chưa có customer_id → quét bằng service role (lib/api/admin.ts)
    const client = caller.role === "curator" ? caller.supabase : adminClient();
    if (!client) {
      return Response.json(
        { khach_hang_id: id, trang_thai: "can_lam_moi_phien", huong_dan: "Gọi supabase.auth.refreshSession() rồi POST /api/onboard/{id} để quét" },
        { status: 202 },
      );
    }

    const quet = quetNguoc(client, id, caller.user.id);
    const ketQua = await Promise.race([quet, new Promise<null>((r) => setTimeout(() => r(null), NGUONG_MS))]).catch((err: unknown) => {
      // Doanh nghiệp đã tạo xong — không trả lỗi cho cả request, báo để frontend quét lại
      console.error(err);
      return { khach_hang_id: id, trang_thai: "loi_quet" as const, error: err instanceof Error ? err.message : String(err) };
    });
    if (ketQua === null) {
      after(() => quet.catch((err: unknown) => console.error("Quét ngược chạy nền lỗi:", err)));
      return Response.json({ khach_hang_id: id, trang_thai: "dang_quet" }, { status: 202 });
    }
    return Response.json(ketQua, { status: "trang_thai" in ketQua ? 202 : 201 });
  } catch (err) {
    return errorResponse(err);
  }
}
