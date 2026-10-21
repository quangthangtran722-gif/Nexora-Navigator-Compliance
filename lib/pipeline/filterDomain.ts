// Bước rule engine — đọc graph đã duyệt + hồ sơ khách hàng, gọi ruleEngine.ts (code thuần, KHÔNG AI),
// rồi tạo/cập nhật diagnostics. Log vào pipeline_runs với model/prompt_version = null.

import type { SupabaseClient } from "@supabase/supabase-js";
import { ApiError, fromDb } from "@/lib/api/http";
import {
  evaluateEntity,
  ghepDieuKien,
  thuocTinhRuleEngine,
  todayInVietnam,
  type DanhGia,
  type DieuKien,
  type EntityDieuKien,
  type ThuocTinhKhachHang,
  type TrangThaiApDung,
} from "./ruleEngine";
import { phanBoDiagnostic } from "./phanBoDiagnostic";
import { failRun, finishRun, startRun } from "./runs";

export type FilterKetQua = {
  entity_id: string;
  trang_thai_ap_dung: TrangThaiApDung;
  thuoc_tinh_thieu: string[];
  diagnostic_ids: string[];
};

export type FilterResult = { run_id: string; ket_qua: FilterKetQua[] };

type HanhViRow = {
  id: string;
  ten_entity: string;
  domain: string;
  primary_departments: string[];
  ngay_co_hieu_luc: string | null;
  chunk: { van_ban: { so_hieu: string; ngay_hieu_luc: string; trang_thai: string } };
};

type DiagnosticRow = {
  id: string;
  entity_id: string;
  department_id: string;
  trang_thai_ap_dung: TrangThaiApDung;
  thuoc_tinh_thieu: string[];
  trang_thai_duyet: string;
};

export async function filterDomain(
  supabase: SupabaseClient,
  customerId: string,
  options: { entityId?: string; parentRunId?: string | null } = {},
): Promise<FilterResult> {
  const { data: customer, error } = await supabase
    .from("customers")
    .select("id, nganh, quy_mo, domains, thuoc_tinh")
    .eq("id", customerId)
    .maybeSingle<{ id: string; nganh: string | null; quy_mo: string | null; domains: string[]; thuoc_tinh: ThuocTinhKhachHang }>();
  if (error) throw fromDb(error);
  if (!customer) throw new ApiError(404, "Không tìm thấy khách hàng", "PT404");

  const homNay = todayInVietnam();
  const thuocTinh = thuocTinhRuleEngine(customer);
  const runId = await startRun(
    supabase,
    { pipeline_name: "filter_domain", customer_id: customerId, parent_run_id: options.parentRunId ?? null },
    {
      customer_id: customerId,
      entity_id: options.entityId ?? null,
      hom_nay: homNay,
      customer_domains: customer.domains,
      thuoc_tinh: thuocTinh,
    },
  );

  const trace: Record<string, unknown>[] = [];
  try {
    const hanhVi = await loadHanhVi(supabase, options.entityId);
    const dieuKienTheoHanhVi = await loadDieuKien(supabase, hanhVi.map((h) => h.id));
    const departments = await loadDepartments(supabase, customerId);
    const existing = await loadDiagnostics(supabase, customerId, options.entityId ? [options.entityId] : null);

    const ketQua: FilterKetQua[] = [];
    for (const h of hanhVi) {
      const danhGia = evaluateEntity({
        domain: h.domain,
        customerDomains: customer.domains,
        thuocTinh,
        dieuKien: dieuKienTheoHanhVi.get(h.id) ?? [],
        ngayHieuLuc: h.ngay_co_hieu_luc ?? h.chunk.van_ban.ngay_hieu_luc,
        homNay,
      });
      const { ids, ghiChu } = await syncDiagnostics(supabase, {
        customerId,
        runId,
        hanhVi: h,
        danhGia,
        departments,
        existing: existing.filter((d) => d.entity_id === h.id),
      });
      ketQua.push({
        entity_id: h.id,
        trang_thai_ap_dung: danhGia.trang_thai_ap_dung,
        thuoc_tinh_thieu: danhGia.thuoc_tinh_thieu,
        diagnostic_ids: ids,
      });
      trace.push({ entity_id: h.id, ten_entity: h.ten_entity, so_hieu: h.chunk.van_ban.so_hieu, ...danhGia, diagnostic_ids: ids, ghi_chu: ghiChu });
    }

    // Quét toàn bộ: diagnostic của entity không còn là hanh_vi đã duyệt thuộc văn bản active (văn bản bị gỡ /
    // hết hiệu lực) mà còn cho_duyet → khong_ap_dung, không để task mồ côi treo trên hộp thư.
    const moCoi = options.entityId ? [] : await donMoCoi(supabase, runId, existing, new Set(hanhVi.map((h) => h.id)));

    await finishRun(supabase, runId, { ket_qua: trace, diagnostic_mo_coi: moCoi });
    return { run_id: runId, ket_qua: ketQua };
  } catch (err) {
    await failRun(supabase, runId, err, { ket_qua: trace });
    throw err;
  }
}

// hanh_vi đã duyệt (RLS: khách hàng chỉ thấy da_duyet) thuộc văn bản đang hiệu lực
async function loadHanhVi(supabase: SupabaseClient, entityId?: string): Promise<HanhViRow[]> {
  let query = supabase
    .from("entities")
    .select(
      "id, ten_entity, domain, primary_departments, ngay_co_hieu_luc, " +
        "chunk:chunk_id!inner (van_ban:van_ban_id!inner (so_hieu, ngay_hieu_luc, trang_thai))",
    )
    .eq("loai_entity", "hanh_vi")
    .eq("trang_thai_duyet", "da_duyet")
    .eq("chunk.van_ban.trang_thai", "active");
  if (entityId) query = query.eq("id", entityId);

  const { data, error } = await query.returns<HanhViRow[]>();
  if (error) throw fromDb(error);
  if (entityId && !data.length) {
    throw new ApiError(404, "Không tìm thấy entity hanh_vi đã duyệt thuộc văn bản đang hiệu lực", "PT404");
  }
  return data;
}

// Quy tắc 2 (ghép điều kiện ở ruleEngine.ghepDieuKien): đọc cạnh dieu_kien → hanh_vi và hanh_vi ap_dung_cho → chu_the,
// rồi entity điều kiện đã duyệt.
async function loadDieuKien(supabase: SupabaseClient, hanhViIds: string[]): Promise<Map<string, DieuKien[]>> {
  if (!hanhViIds.length) return new Map();

  const [incoming, outgoing] = await Promise.all([
    supabase
      .from("entity_relationships")
      .select("source_entity_id, target_entity_id")
      .eq("loai_relationship", "dieu_kien")
      .in("target_entity_id", hanhViIds),
    supabase
      .from("entity_relationships")
      .select("source_entity_id, target_entity_id")
      .eq("loai_relationship", "ap_dung_cho")
      .in("source_entity_id", hanhViIds)
      .not("target_entity_id", "is", null),
  ]);
  if (incoming.error) throw fromDb(incoming.error);
  if (outgoing.error) throw fromDb(outgoing.error);

  const canh = [
    ...incoming.data.map((r) => ({ hanhViId: r.target_entity_id as string, entityId: r.source_entity_id as string })),
    ...outgoing.data.map((r) => ({ hanhViId: r.source_entity_id as string, entityId: r.target_entity_id as string })),
  ];
  const condIds = [...new Set(canh.map((c) => c.entityId))];
  if (!condIds.length) return new Map();

  const { data: conds, error } = await supabase
    .from("entities")
    .select("id, ten_entity, dieu_kien_may_doc")
    .in("id", condIds)
    .eq("trang_thai_duyet", "da_duyet")
    .in("loai_entity", ["dieu_kien", "nguong", "chu_the"])
    .not("dieu_kien_may_doc", "is", null)
    .returns<EntityDieuKien[]>();
  if (error) throw fromDb(error);
  return ghepDieuKien(canh, conds);
}

async function loadDepartments(supabase: SupabaseClient, customerId: string) {
  const { data, error } = await supabase
    .from("departments")
    .select("id, slug_phong_ban")
    .eq("customer_id", customerId)
    .order("created_at");
  if (error) throw fromDb(error);
  return data as { id: string; slug_phong_ban: string }[];
}

// entityIds = null → mọi diagnostic của khách hàng
async function loadDiagnostics(supabase: SupabaseClient, customerId: string, entityIds: string[] | null): Promise<DiagnosticRow[]> {
  let query = supabase
    .from("diagnostics")
    .select("id, entity_id, department_id, trang_thai_ap_dung, thuoc_tinh_thieu, trang_thai_duyet")
    .eq("customer_id", customerId);
  if (entityIds) query = query.in("entity_id", entityIds);
  const { data, error } = await query;
  if (error) throw fromDb(error);
  return data as DiagnosticRow[];
}

async function datKhongApDung(supabase: SupabaseClient, runId: string, ids: string[]): Promise<void> {
  if (!ids.length) return;
  const { error } = await supabase
    .from("diagnostics")
    .update({ trang_thai_ap_dung: "khong_ap_dung", thuoc_tinh_thieu: [], filter_run_id: runId })
    .in("id", ids)
    .eq("trang_thai_duyet", "cho_duyet");
  if (error) throw fromDb(error);
}

async function donMoCoi(supabase: SupabaseClient, runId: string, existing: DiagnosticRow[], hanhViIds: Set<string>) {
  const moCoi = existing.filter(
    (d) => !hanhViIds.has(d.entity_id) && d.trang_thai_duyet === "cho_duyet" && d.trang_thai_ap_dung !== "khong_ap_dung",
  );
  await datKhongApDung(supabase, runId, moCoi.map((d) => d.id));
  return moCoi.map((d) => ({ diagnostic_id: d.id, entity_id: d.entity_id, ly_do: "entity_khong_con_hieu_luc" }));
}

// Quy tắc 5 + vòng đời diagnostic (CONTRACT.md §3.6):
//   - khong_ap_dung: không tạo mới; row cũ còn cho_duyet → đổi sang khong_ap_dung (giữ lịch sử).
//   - còn lại: 1 row / phòng có slug ∈ primary_departments (không có → ban_giam_doc; không có nốt → không tạo).
//     Row cũ của phòng không còn khớp: chuyển sang phòng đích còn thiếu, thừa → khong_ap_dung (phanBoDiagnostic.ts).
//   - row đã duyệt/từ chối bị DB khóa → giữ nguyên, chỉ báo lại id.
async function syncDiagnostics(
  supabase: SupabaseClient,
  ctx: {
    customerId: string;
    runId: string;
    hanhVi: HanhViRow;
    danhGia: DanhGia;
    departments: { id: string; slug_phong_ban: string }[];
    existing: DiagnosticRow[];
  },
): Promise<{ ids: string[]; ghiChu: string | null }> {
  const { danhGia, existing } = ctx;
  const ids = new Set<string>();
  let ghiChu: string | null = null;

  const capNhat = async (d: DiagnosticRow, departmentId = d.department_id) => {
    ids.add(d.id);
    if (d.trang_thai_duyet !== "cho_duyet") return;
    const { error } = await supabase
      .from("diagnostics")
      .update({
        trang_thai_ap_dung: danhGia.trang_thai_ap_dung,
        thuoc_tinh_thieu: danhGia.thuoc_tinh_thieu,
        filter_run_id: ctx.runId,
        ...(departmentId !== d.department_id ? { department_id: departmentId } : {}),
      })
      .eq("id", d.id)
      .eq("trang_thai_duyet", "cho_duyet");
    if (error) throw fromDb(error);
  };

  if (danhGia.trang_thai_ap_dung === "khong_ap_dung") {
    for (const d of existing) await capNhat(d);
    return { ids: [...ids], ghiChu };
  }

  let targets = ctx.departments.filter((d) => ctx.hanhVi.primary_departments.includes(d.slug_phong_ban));
  if (!targets.length) {
    targets = ctx.departments.filter((d) => d.slug_phong_ban === "ban_giam_doc");
    ghiChu = targets.length
      ? "Không có phòng ban khớp primary_departments → giao Ban Giám đốc"
      : "Không có phòng ban khớp và không có Ban Giám đốc → không tạo diagnostic";
  }

  const keHoach = phanBoDiagnostic(existing, targets.map((t) => t.id));
  for (const { id, department_id } of keHoach.capNhat) await capNhat(existing.find((d) => d.id === id)!, department_id);
  // Dòng cũ thừa (phòng không còn nhận việc) → khong_ap_dung; dòng đã khóa giữ nguyên, chỉ báo id
  await datKhongApDung(supabase, ctx.runId, keHoach.thua);
  for (const d of existing) if (!keHoach.capNhat.some((c) => c.id === d.id) && !keHoach.thua.includes(d.id)) ids.add(d.id);

  const moi = keHoach.taoMoi.map((departmentId) => ({
    customer_id: ctx.customerId,
    entity_id: ctx.hanhVi.id,
    department_id: departmentId,
    trang_thai_ap_dung: danhGia.trang_thai_ap_dung,
    thuoc_tinh_thieu: danhGia.thuoc_tinh_thieu,
    filter_run_id: ctx.runId,
  }));
  if (moi.length) {
    const { data, error } = await supabase.from("diagnostics").insert(moi).select("id");
    if (error) throw fromDb(error);
    for (const row of data) ids.add(row.id as string);
  }
  return { ids: [...ids], ghiChu };
}
