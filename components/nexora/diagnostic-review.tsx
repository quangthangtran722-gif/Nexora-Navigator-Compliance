"use client";

import { useState } from "react";
import { ChevronDown, Send, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ErrorBlock, LoadingBlock } from "@/components/nexora/data-state";
import { DiagnosticBody } from "@/components/nexora/diagnostic-body";
import { HoiBoSungCard } from "@/components/nexora/hoi-bo-sung";
import { ApDungBadge, DuyetBadge } from "@/components/nexora/status-badges";
import { TRANG_THAI_AP_DUNG_LABEL } from "@/lib/labels";
import { useAuth } from "@/lib/auth/auth-provider";
import { combine, useErrorHandler } from "@/lib/data/errors";
import { getChunks, getCustomer, getDepartments, getDiagnostics, getEntities, getEntityGraph, getThuocTinhHoSo, getVanBanList } from "@/lib/data/queries";
import { useQuery } from "@/lib/data/use-query";
import { generateAll, PipelineError, toAppError } from "@/lib/data/pipeline";
import { rpc } from "@/lib/data/rpc";
import type { Department, Diagnostic, Entity, EntityGraphRow, TrangThaiApDung } from "@/lib/types";
import { cn } from "@/lib/utils";

/*
 * Người đầu mối duyệt diagnostic (CONTRACT §3.6). 4 trạng thái áp dụng:
 *  chua_du_thong_tin → khối "Cần bổ sung thông tin" (hỏi bổ sung) ở đầu trang
 *  ap_dung / sap_ap_dung, chưa có nội dung → chờ AI viết
 *  ap_dung / sap_ap_dung, có nội dung → duyệt qua RPC approve_diagnostic (có thể đổi phòng nhận)
 *  khong_ap_dung → mục cũ hết áp dụng sau khi quét lại: gạch đi, mặc định ẩn
 * Bố cục: tab theo phòng ban (+ "Tất cả"); mỗi checklist là 1 dòng thu gọn, chỉ mở 1 dòng tại một thời điểm.
 */

// Thứ tự trong mỗi phòng: việc cần làm trước
const RANK: Record<TrangThaiApDung, number> = { ap_dung: 0, sap_ap_dung: 1, chua_du_thong_tin: 2, khong_ap_dung: 3 };
const ALL = "tat-ca";

// Đếm chờ duyệt / đã duyệt của 1 nhóm diagnostic (bỏ mục đã hết áp dụng)
const demDuyet = (ds: Diagnostic[]) => {
  const conHieuLuc = ds.filter((d) => d.trang_thai_ap_dung !== "khong_ap_dung");
  return {
    cho: conHieuLuc.filter((d) => d.trang_thai_duyet === "cho_duyet").length,
    da: conHieuLuc.filter((d) => d.trang_thai_duyet === "da_duyet").length,
  };
};

export function DiagnosticReview() {
  const { customerId } = useAuth(); // RequireRole đảm bảo đã là customer có customer_id
  const [showHetApDung, setShowHetApDung] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);
  const [tab, setTab] = useState<string>(ALL);
  const [openId, setOpenId] = useState<string | null>(null); // mặc định thu gọn tất cả
  // Đọc lại từ DB sau mỗi thao tác (duyệt, trả lời hỏi bổ sung → /filter → /generate)
  const res = useQuery(
    () =>
      combine({
        customer: getCustomer(customerId!),
        departments: getDepartments(customerId!),
        diagnostics: getDiagnostics(customerId!),
        entities: getEntities(),
        graph: getEntityGraph(),
        dict: getThuocTinhHoSo(),
        chunks: getChunks(),
        vanBan: getVanBanList(),
      }),
    [customerId],
  );
  const refresh = res.reload;
  if (res.loading) return <LoadingBlock />;
  if (res.error) return <ErrorBlock error={res.error} onRetry={refresh} />;
  const { customer, departments, diagnostics, entities, graph, dict, chunks, vanBan } = res.data!;

  // Tên văn bản dễ đọc thay cho số hiệu kỹ thuật
  const tenVanBanOf = (e?: Entity) => vanBan.find((v) => v.id === chunks.find((c) => c.id === e?.chunk_id)?.van_ban_id)?.ten_van_ban;
  const contextOf = (entityId: string) => graph.filter((g) => g.target_id === entityId && g.source_trang_thai_duyet === "da_duyet");

  // Hỏi bổ sung: gộp theo entity (nhiều phòng ban cùng 1 câu hỏi)
  const thieuTheoEntity = new Map<string, string[]>();
  for (const d of diagnostics.filter((x) => x.trang_thai_ap_dung === "chua_du_thong_tin")) {
    thieuTheoEntity.set(d.entity_id, [...new Set([...(thieuTheoEntity.get(d.entity_id) ?? []), ...d.thuoc_tinh_thieu])]);
  }
  const soHetApDung = diagnostics.filter((d) => d.trang_thai_ap_dung === "khong_ap_dung").length;

  const itemsOf = (dept: Department) =>
    diagnostics
      .filter((d) => d.department_id === dept.id && (showHetApDung || d.trang_thai_ap_dung !== "khong_ap_dung"))
      .sort((a, b) => RANK[a.trang_thai_ap_dung] - RANK[b.trang_thai_ap_dung]);
  const shown = tab === ALL ? departments : departments.filter((d) => d.id === tab);
  const coChecklist = shown.filter((d) => itemsOf(d).length > 0);
  const khongChecklist = shown.filter((d) => itemsOf(d).length === 0);

  return (
    <div className="space-y-6">
      {flash && (
        <p className="border bg-accent px-3 py-2 text-sm" role="status">
          {flash}
        </p>
      )}

      {thieuTheoEntity.size > 0 && (
        <section id="hoi-bo-sung" className="scroll-mt-20 space-y-3">
          <h2 className="text-base font-semibold">Cần bổ sung thông tin ({thieuTheoEntity.size})</h2>
          {[...thieuTheoEntity].map(([entityId, thieu]) => {
            const entity = entities.find((e) => e.id === entityId);
            return !entity ? null : (
              <HoiBoSungCard
                key={entityId}
                customer={customer}
                entity={entity}
                thuocTinhThieu={thieu}
                dict={dict}
                onDone={({ entityTen, status, error }) => {
                  // status null = filter trả ket_qua [] (chưa có entity được duyệt) — trạng thái hợp lệ, không phải lỗi
                  setFlash(
                    error
                      ? `${entityTen}: ${error}`
                      : status
                        ? `${entityTen}: kết quả mới — ${TRANG_THAI_AP_DUNG_LABEL[status]}.`
                        : `${entityTen}: chưa có entity được duyệt để đối chiếu — đã lưu câu trả lời.`,
                  );
                  refresh();
                }}
              />
            );
          })}
        </section>
      )}

      <Tabs value={tab} onValueChange={(v) => setTab(v as string)} className="gap-4">
        <div className="flex flex-wrap items-end justify-between gap-x-3 border-b bg-card">
          {/* Tab bar phòng ban — cuộn ngang khi hẹp thay vì xuống dòng */}
          <div className="-mb-px min-w-0 flex-1 overflow-x-auto [scrollbar-width:none]">
            <TabsList variant="line" className="h-auto w-max gap-0 p-0">
              <DeptTab value={ALL} label="Tất cả" cho={demDuyet(diagnostics).cho} />
              {departments.map((dept) => (
                <DeptTab key={dept.id} value={dept.id} label={dept.ten_phong_ban} cho={demDuyet(diagnostics.filter((d) => d.department_id === dept.id)).cho} />
              ))}
            </TabsList>
          </div>
          {soHetApDung > 0 && (
            <Button variant="ghost" size="sm" className="mb-1.5" onClick={() => setShowHetApDung((s) => !s)}>
              {showHetApDung ? "Ẩn" : "Hiện"} {soHetApDung} mục đã hết áp dụng
            </Button>
          )}
        </div>

        <TabsContent value={tab} className="space-y-6">
          {coChecklist.map((dept) => {
            const items = itemsOf(dept);
            const dem = demDuyet(items);
            return (
              <section key={dept.id} id={dept.id} className="scroll-mt-20" aria-labelledby={`dept-${dept.id}`}>
                {/* Dải đầu phòng ban: mảng đậm duy nhất của màn */}
                <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-l-4 border-gold-edge bg-topbar px-4 py-3">
                  <div className="min-w-0">
                    <h2 id={`dept-${dept.id}`} className="text-base font-bold text-topbar-foreground">
                      {dept.ten_phong_ban}
                    </h2>
                    {dept.email_head && <p className="truncate text-xs text-topbar-muted">{dept.email_head}</p>}
                  </div>
                  <p className="text-sm text-topbar-foreground tabular-nums">
                    {dem.cho} chờ duyệt <span className="text-topbar-muted">·</span> {dem.da} đã duyệt
                  </p>
                </div>
                <ul className="border-x border-b bg-card">
                  {items.map((d) => {
                    const entity = entities.find((e) => e.id === d.entity_id);
                    return (
                      <li key={d.id} className="border-t first:border-t-0">
                        <DiagnosticRow
                          diagnostic={d}
                          entity={entity}
                          tenVanBan={tenVanBanOf(entity)}
                          context={contextOf(d.entity_id)}
                          entities={entities}
                          departments={departments}
                          open={openId === d.id}
                          onToggle={() => setOpenId((cur) => (cur === d.id ? null : d.id))}
                          onChanged={refresh}
                        />
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })}

          {/* Phòng chưa có checklist: 1 dòng xám, không có dải đầu */}
          {khongChecklist.length > 0 && (
            <ul className="space-y-1 text-xs text-muted-foreground">
              {khongChecklist.map((dept) => (
                <li key={dept.id}>
                  <span className="font-medium">{dept.ten_phong_ban}</span> — chưa có checklist
                </li>
              ))}
            </ul>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function DeptTab({ value, label, cho }: { value: string; label: string; cho: number }) {
  return (
    <TabsTrigger
      value={value}
      aria-label={cho > 0 ? `${label}, ${cho} chờ duyệt` : label}
      className={cn(
        "h-11 flex-none gap-2 rounded-none border-0 px-4 text-sm font-medium text-muted-foreground",
        "data-active:font-bold data-active:text-foreground",
        // Gạch chân 3px ánh kim cho tab đang chọn
        "group-data-horizontal/tabs:after:bottom-0 group-data-horizontal/tabs:after:h-[3px] after:bg-(image:--gold-metal)",
      )}
    >
      {label}
      {cho > 0 && <span className="bg-duyet-cho-bg px-1.5 py-px text-xs font-semibold text-duyet-cho tabular-nums">{cho}</span>}
    </TabsTrigger>
  );
}

function DiagnosticRow({
  diagnostic: d,
  entity,
  tenVanBan,
  context,
  entities,
  departments,
  open,
  onToggle,
  onChanged,
}: {
  diagnostic: Diagnostic;
  entity: Entity | undefined;
  tenVanBan?: string;
  context: EntityGraphRow[];
  entities: Entity[];
  departments: Department[];
  open: boolean;
  onToggle: () => void;
  onChanged: () => void;
}) {
  const [deptId, setDeptId] = useState(d.department_id);
  const [ghiChu, setGhiChu] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [forbidden, setForbidden] = useState(false);
  const handleError = useErrorHandler();

  const hetApDung = d.trang_thai_ap_dung === "khong_ap_dung";
  const chuaDu = d.trang_thai_ap_dung === "chua_du_thong_tin";
  const choAi = !chuaDu && !hetApDung && d.noi_dung_diagnostic === null;
  // Chỉ duyệt được khi ap_dung/sap_ap_dung, đã có nội dung, còn cho_duyet (CONTRACT §3.6)
  const canApprove = d.trang_thai_duyet === "cho_duyet" && !chuaDu && !hetApDung && d.noi_dung_diagnostic !== null;
  const panelId = `diag-${d.id}`;

  async function decide(quyet_dinh: "da_duyet" | "tu_choi") {
    setBusy(true);
    const { error } = await rpc("approve_diagnostic", {
      p_diagnostic_id: d.id,
      p_quyet_dinh: quyet_dinh,
      p_department_id: deptId !== d.department_id ? deptId : undefined,
      p_ghi_chu: ghiChu.trim() || undefined,
    });
    setBusy(false);
    setError(handleError(error, { onReload: onChanged, onForbidden: () => setForbidden(true) }));
    if (!error) onChanged();
  }

  async function askAi() {
    setBusy(true);
    try {
      await generateAll({ customer_id: d.customer_id, diagnostic_ids: [d.id] });
      setError(null);
    } catch (e) {
      setError(
        e instanceof PipelineError
          ? handleError(toAppError(e), { onForbidden: () => setForbidden(true) })
          : "AI chưa viết được checklist.",
      );
    }
    setBusy(false);
    onChanged();
  }

  return (
    <div className={cn(hetApDung && "opacity-60", open && "bg-card")}>
      {/* Dòng thu gọn: tên + trạng thái; bấm để mở */}
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-controls={panelId}
        className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors outline-none hover:bg-accent focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <span className={cn("min-w-0 flex-1 text-sm font-semibold", hetApDung && "line-through")}>{entity?.ten_entity ?? "Nghĩa vụ"}</span>
        <ApDungBadge status={d.trang_thai_ap_dung} />
        <DuyetBadge status={d.trang_thai_duyet} />
        <ChevronDown className={cn("size-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")} strokeWidth={1.75} aria-hidden />
      </button>

      {open && (
        <div id={panelId} className="space-y-3 px-4 pb-4">
          {entity && (
            <p className="text-xs font-medium text-muted-foreground">
              {entity.dieu_khoan}
              {tenVanBan && ` — ${tenVanBan}`}
            </p>
          )}
          {chuaDu ? (
            <p className="text-sm text-status-chua-du-tt">
              Đang chờ trả lời câu hỏi bổ sung —{" "}
              <a href="#hoi-bo-sung" className="underline">
                trả lời ở đầu trang
              </a>
              .
            </p>
          ) : (
            <DiagnosticBody noiDung={d.noi_dung_diagnostic} entity={entity} nguon={tenVanBan} context={context} entities={entities} />
          )}
          {hetApDung && <p className="text-xs text-muted-foreground">Sau lần quét lại gần nhất, nghĩa vụ này không còn áp dụng cho doanh nghiệp.</p>}
          {d.ghi_chu_duyet && <p className="text-xs text-muted-foreground">Ghi chú duyệt: {d.ghi_chu_duyet}</p>}
          {error && (
            <p className="bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">
              {error}
            </p>
          )}

          {choAi && !forbidden && (
            <Button size="sm" variant="outline" disabled={busy} onClick={askAi}>
              <Sparkles strokeWidth={1.75} /> Yêu cầu AI viết checklist
            </Button>
          )}

          {canApprove && !forbidden && (
            <div className="flex flex-col gap-3 border-t pt-3 sm:flex-row sm:items-end">
              <div className="space-y-1.5 sm:w-56">
                <Label className="text-xs">Giao cho phòng</Label>
                <Select
                  items={departments.map((x) => ({ value: x.id, label: x.ten_phong_ban }))}
                  value={deptId}
                  onValueChange={(v) => setDeptId((v as string | null) ?? d.department_id)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map((x) => (
                      <SelectItem key={x.id} value={x.id}>
                        {x.ten_phong_ban}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Input value={ghiChu} onChange={(e) => setGhiChu(e.target.value)} placeholder="Ghi chú (không bắt buộc)" className="sm:flex-1" aria-label="Ghi chú duyệt" />
              <div className="flex gap-2">
                {/* Chỉ 1 dòng mở tại một thời điểm → chỉ 1 nút ánh kim trên màn */}
                <Button size="sm" variant="metal" disabled={busy} onClick={() => decide("da_duyet")}>
                  <Send strokeWidth={1.75} /> Duyệt &amp; giao
                </Button>
                <Button size="sm" variant="outline" className="text-duyet-tu-choi" disabled={busy} onClick={() => decide("tu_choi")}>
                  Từ chối
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
