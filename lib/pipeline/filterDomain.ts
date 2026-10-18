// Bước rule engine — đọc graph đã duyệt + hồ sơ khách hàng, gọi ruleEngine.ts (code thuần, KHÔNG AI),
// rồi tạo/cập nhật diagnostics. Log vào pipeline_runs với model/prompt_version = null.

import type { SupabaseClient } from "@supabase/supabase-js";
import { ApiError, fromDb } from "@/lib/api/http";
import {
  evaluateEntity,
  todayInVietnam,
  type DanhGia,
  type DieuKien,
  type DieuKienMayDoc,
  type ThuocTinhKhachHang,
  type TrangThaiApDung,
} from "./ruleEngine";
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
    .select("id, domains, thuoc_tinh")
    .eq("id", customerId)
    .maybeSingle<{ id: string; domains: string[]; thuoc_tinh: ThuocTinhKhachHang }>();
  if (error) throw fromDb(error);
  if (!customer) throw new ApiError(404, "Không tìm thấy khách hàng", "PT404");

  const homNay = todayInVietnam();
  const runId = await startRun(
    supabase,
    { pipeline_name: "filter_domain", customer_id: customerId, parent_run_id: options.parentRunId ?? null },
    {
      customer_id: customerId,
      entity_id: options.entityId ?? null,
      hom_nay: homNay,
      customer_domains: customer.domains,
      thuoc_tinh: customer.thuoc_tinh,
    },
  );

  const trace: Record<string, unknown>[] = [];
  try {
    const hanhVi = await loadHanhVi(supabase, options.entityId);
    const dieuKienTheoHanhVi = await loadDieuKien(supabase, hanhVi.map((h) => h.id));
    const departments = await loadDepartments(supabase, customerId);
    const existing = await loadDiagnostics(supabase, customerId, hanhVi.map((h) => h.id));

    const ketQua: FilterKetQua[] = [];
    for (const h of hanhVi) {
      const danhGia = evaluateEntity({
        domain: h.domain,
        customerDomains: customer.domains,
        thuocTinh: customer.thuoc_tinh,
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

    await finishRun(supabase, runId, { ket_qua: trace });
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

// Quy tắc 2: dieu_kien/nguong —dieu_kien→ hanh_vi, và hanh_vi —ap_dung_cho→ chu_the có dieu_kien_may_doc.
// Chỉ dùng cạnh mà cả 2 đầu đã duyệt.
async function loadDieuKien(supabase: SupabaseClient, hanhViIds: string[]): Promise<Map<string, DieuKien[]>> {
  const result = new Map<string, DieuKien[]>();
  if (!hanhViIds.length) return result;

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

  // [hanh_vi, entity điều kiện]
  const pairs: [string, string][] = [
    ...incoming.data.map((r) => [r.target_entity_id as string, r.source_entity_id as string] as [string, string]),
    ...outgoing.data.map((r) => [r.source_entity_id as string, r.target_entity_id as string] as [string, string]),
  ];
  const condIds = [...new Set(pairs.map(([, c]) => c))];
  if (!condIds.length) return result;

  const { data: conds, error } = await supabase
    .from("entities")
    .select("id, ten_entity, loai_entity, dieu_kien_may_doc")
    .in("id", condIds)
    .eq("trang_thai_duyet", "da_duyet")
    .in("loai_entity", ["dieu_kien", "nguong", "chu_the"])
    .not("dieu_kien_may_doc", "is", null);
  if (error) throw fromDb(error);
  const byId = new Map(conds.map((c) => [c.id as string, c]));

  for (const [hanhViId, condId] of pairs) {
    const c = byId.get(condId);
    if (!c) continue;
    const list = result.get(hanhViId) ?? [];
    if (list.some((d) => d.entity_id === condId)) continue;
    list.push({ entity_id: condId, ten_entity: c.ten_entity as string, dieu_kien_may_doc: c.dieu_kien_may_doc as DieuKienMayDoc });
    result.set(hanhViId, list);
  }
  return result;
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

async function loadDiagnostics(supabase: SupabaseClient, customerId: string, entityIds: string[]): Promise<DiagnosticRow[]> {
  if (!entityIds.length) return [];
  const { data, error } = await supabase
    .from("diagnostics")
    .select("id, entity_id, department_id, trang_thai_ap_dung, thuoc_tinh_thieu, trang_thai_duyet")
    .eq("customer_id", customerId)
    .in("entity_id", entityIds);
  if (error) throw fromDb(error);
  return data as DiagnosticRow[];
}

// Quy tắc 5 + vòng đời diagnostic (CONTRACT.md §3.6):
//   - khong_ap_dung: không tạo mới; row cũ còn cho_duyet → đổi sang khong_ap_dung (giữ lịch sử).
//   - còn lại: 1 row / phòng có slug ∈ primary_departments (không có → ban_giam_doc; không có nốt → không tạo).
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

  const capNhat = async (d: DiagnosticRow) => {
    ids.add(d.id);
    if (d.trang_thai_duyet !== "cho_duyet") return;
    const { error } = await supabase
      .from("diagnostics")
      .update({
        trang_thai_ap_dung: danhGia.trang_thai_ap_dung,
        thuoc_tinh_thieu: danhGia.thuoc_tinh_thieu,
        filter_run_id: ctx.runId,
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

  const moi = [];
  for (const dept of targets) {
    const d = existing.find((x) => x.department_id === dept.id);
    if (d) await capNhat(d);
    else
      moi.push({
        customer_id: ctx.customerId,
        entity_id: ctx.hanhVi.id,
        department_id: dept.id,
        trang_thai_ap_dung: danhGia.trang_thai_ap_dung,
        thuoc_tinh_thieu: danhGia.thuoc_tinh_thieu,
        filter_run_id: ctx.runId,
      });
  }
  // Row cũ của phòng không còn khớp (khách hàng đổi slug phòng) vẫn được cập nhật trạng thái
  for (const d of existing) if (!targets.some((t) => t.id === d.department_id)) await capNhat(d);

  if (moi.length) {
    const { data, error } = await supabase.from("diagnostics").insert(moi).select("id");
    if (error) throw fromDb(error);
    for (const row of data) ids.add(row.id as string);
  }
  return { ids: [...ids], ghiChu };
}
