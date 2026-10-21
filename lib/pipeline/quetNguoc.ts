// Chiều ngược (BE-8): doanh nghiệp mới → quét toàn bộ văn bản active. Chỉ là filterDomain (cùng hàm với nút
// "Quét lại" chiều thuận) + gom kết quả theo shape /api/onboard. Không gọi AI; nội dung checklist vẫn do
// /api/pipeline/generate viết sau, thành draft chờ người đầu mối duyệt.

import type { SupabaseClient } from "@supabase/supabase-js";
import { ApiError, fromDb } from "@/lib/api/http";
import { tongHopKetQua, type KetQuaQuet, type OnboardResponse } from "@/lib/onboard";
import { filterDomain } from "./filterDomain";
import type { TrangThaiApDung } from "./ruleEngine";

export type KetQuaOnboard = OnboardResponse & { run_id: string };

export async function quetNguoc(supabase: SupabaseClient, customerId: string, nguoiKichHoat?: string): Promise<KetQuaOnboard> {
  const { run_id, ket_qua } = await filterDomain(supabase, customerId, { kichHoat: "onboard", nguoiKichHoat });
  return { ...(await tongHop(supabase, customerId, ket_qua)), run_id };
}

// GET /api/onboard/[id] — đọc lại lần quét toàn bộ gần nhất từ pipeline_runs (không chạy lại)
export async function docKetQuaQuet(
  supabase: SupabaseClient,
  customerId: string,
): Promise<KetQuaOnboard | { khach_hang_id: string; trang_thai: "dang_quet" | "chua_quet" }> {
  const { data: run, error } = await supabase
    .from("pipeline_runs")
    .select("id, trang_thai, output, error_log")
    .eq("pipeline_name", "filter_domain")
    .eq("customer_id", customerId)
    .is("input->>entity_id", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<{ id: string; trang_thai: string; output: { ket_qua?: TraceMuc[] } | null; error_log: string | null }>();
  if (error) throw fromDb(error);
  if (!run) return { khach_hang_id: customerId, trang_thai: "chua_quet" };
  if (run.trang_thai === "dang_xu_ly" || run.trang_thai === "cho_xu_ly") return { khach_hang_id: customerId, trang_thai: "dang_quet" };
  if (run.trang_thai === "loi") throw new ApiError(500, `Lần quét gần nhất lỗi: ${run.error_log ?? "không rõ"}`, "SCAN_ERROR");

  const ketQua: KetQuaQuet[] = (run.output?.ket_qua ?? []).map((t) => ({
    entity_id: t.entity_id,
    trang_thai_ap_dung: t.trang_thai_ap_dung,
    thuoc_tinh_thieu: t.thuoc_tinh_thieu ?? [],
    diagnostic_ids: t.diagnostic_ids ?? [],
    ten_entity: t.ten_entity,
    dieu_khoan: t.dieu_khoan ?? "",
    van_ban: { so_hieu: t.so_hieu, ten_van_ban: t.ten_van_ban ?? t.so_hieu },
  }));
  return { ...(await tongHop(supabase, customerId, ketQua)), run_id: run.id };
}

type TraceMuc = {
  entity_id: string;
  ten_entity: string;
  dieu_khoan?: string;
  so_hieu: string;
  ten_van_ban?: string;
  trang_thai_ap_dung: TrangThaiApDung;
  thuoc_tinh_thieu?: string[];
  diagnostic_ids?: string[];
};

async function tongHop(supabase: SupabaseClient, customerId: string, ketQua: KetQuaQuet[]): Promise<OnboardResponse> {
  const [diagnostics, departments] = await Promise.all([
    supabase.from("diagnostics").select("id, department_id").eq("customer_id", customerId),
    supabase.from("departments").select("id, ten_phong_ban").eq("customer_id", customerId).order("created_at"),
  ]);
  if (diagnostics.error) throw fromDb(diagnostics.error);
  if (departments.error) throw fromDb(departments.error);
  return tongHopKetQua(
    customerId,
    ketQua,
    diagnostics.data as { id: string; department_id: string }[],
    departments.data as { id: string; ten_phong_ban: string }[],
  );
}
