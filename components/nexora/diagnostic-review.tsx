"use client";

import { useState } from "react";
import { Mail, Send, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ErrorBlock, LoadingBlock } from "@/components/nexora/data-state";
import { DiagnosticBody } from "@/components/nexora/diagnostic-body";
import { HoiBoSungCard } from "@/components/nexora/hoi-bo-sung";
import { ApDungBadge, DuyetBadge } from "@/components/nexora/status-badges";
import { deptLabel, TRANG_THAI_AP_DUNG_LABEL } from "@/lib/labels";
import { useAuth } from "@/lib/auth/auth-provider";
import { combine, useErrorHandler } from "@/lib/data/errors";
import { getChunks, getCustomer, getDepartments, getDiagnostics, getEntities, getEntityGraph, getThuocTinhHoSo, getVanBanList } from "@/lib/data/queries";
import { useQuery } from "@/lib/data/use-query";
import { PipelineError, pipelineErrorCode, postPipeline } from "@/lib/data/pipeline";
import { rpc } from "@/lib/data/rpc";
import type { Department, Diagnostic, Entity, EntityGraphRow, TrangThaiApDung } from "@/lib/types";
import { cn } from "@/lib/utils";

/*
 * Người đầu mối duyệt diagnostic (CONTRACT §3.6). 4 trạng thái áp dụng:
 *  chua_du_thong_tin → khối "Cần bổ sung thông tin" (hỏi bổ sung) ở đầu trang
 *  ap_dung / sap_ap_dung, chưa có nội dung → chờ AI viết
 *  ap_dung / sap_ap_dung, có nội dung → duyệt qua RPC approve_diagnostic (có thể đổi phòng nhận)
 *  khong_ap_dung → mục cũ hết áp dụng sau khi quét lại: gạch đi, mặc định ẩn
 */

// Thứ tự trong mỗi phòng: việc cần làm trước
const RANK: Record<TrangThaiApDung, number> = { ap_dung: 0, sap_ap_dung: 1, chua_du_thong_tin: 2, khong_ap_dung: 3 };

export function DiagnosticReview() {
  const { customerId } = useAuth(); // RequireRole đảm bảo đã là customer có customer_id
  const [showHetApDung, setShowHetApDung] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);
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

  const soHieuOf = (e?: Entity) => vanBan.find((v) => v.id === chunks.find((c) => c.id === e?.chunk_id)?.van_ban_id)?.so_hieu;
  const contextOf = (entityId: string) => graph.filter((g) => g.target_id === entityId && g.source_trang_thai_duyet === "da_duyet");

  // Hỏi bổ sung: gộp theo entity (nhiều phòng ban cùng 1 câu hỏi)
  const thieuTheoEntity = new Map<string, string[]>();
  for (const d of diagnostics.filter((x) => x.trang_thai_ap_dung === "chua_du_thong_tin")) {
    thieuTheoEntity.set(d.entity_id, [...new Set([...(thieuTheoEntity.get(d.entity_id) ?? []), ...d.thuoc_tinh_thieu])]);
  }
  const soHetApDung = diagnostics.filter((d) => d.trang_thai_ap_dung === "khong_ap_dung").length;

  return (
    <div className="space-y-8">
      {flash && (
        <p className="rounded-lg border bg-accent px-3 py-2 text-sm" role="status">
          {flash}
        </p>
      )}

      {thieuTheoEntity.size > 0 && (
        <section id="hoi-bo-sung" className="scroll-mt-20 space-y-3">
          <h2 className="text-lg font-semibold">Cần bổ sung thông tin ({thieuTheoEntity.size})</h2>
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
                  setFlash(error ? `${entityTen}: ${error}` : `${entityTen}: kết quả mới — ${status ? TRANG_THAI_AP_DUNG_LABEL[status] : "không đổi"}.`);
                  refresh();
                }}
              />
            );
          })}
        </section>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Nhảy nhanh tới phòng ban */}
        <nav className="flex flex-wrap gap-2" aria-label="Phòng ban">
          {departments.map((dept) => {
            const pending = diagnostics.filter((d) => d.department_id === dept.id && d.trang_thai_duyet === "cho_duyet" && d.trang_thai_ap_dung !== "khong_ap_dung");
            return (
              <a key={dept.id} href={`#${dept.id}`} className="rounded-full border px-3 py-1 text-sm transition-colors hover:bg-accent">
                {dept.ten_phong_ban}
                {pending.length > 0 && <span className="ml-1.5 font-semibold text-duyet-cho">{pending.length}</span>}
              </a>
            );
          })}
        </nav>
        {soHetApDung > 0 && (
          <Button variant="ghost" size="sm" onClick={() => setShowHetApDung((s) => !s)}>
            {showHetApDung ? "Ẩn" : "Hiện"} {soHetApDung} mục đã hết áp dụng
          </Button>
        )}
      </div>

      {departments.map((dept) => {
        const items = diagnostics
          .filter((d) => d.department_id === dept.id && (showHetApDung || d.trang_thai_ap_dung !== "khong_ap_dung"))
          .sort((a, b) => RANK[a.trang_thai_ap_dung] - RANK[b.trang_thai_ap_dung]);
        return (
          <section key={dept.id} id={dept.id} className="scroll-mt-20 space-y-3">
            <div className="flex flex-wrap items-baseline justify-between gap-2 border-b pb-2">
              <h2 className="text-lg font-semibold">
                {dept.ten_phong_ban} <span className="text-sm font-normal text-muted-foreground">· {deptLabel(dept.slug_phong_ban)}</span>
              </h2>
              {dept.email_head && (
                <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                  <Mail className="size-3" aria-hidden /> {dept.email_head}
                </span>
              )}
            </div>
            {items.length === 0 && <p className="text-sm text-muted-foreground">Chưa có checklist cho phòng này.</p>}
            {items.map((d) => {
              const entity = entities.find((e) => e.id === d.entity_id);
              return (
                <DiagnosticCard
                  key={d.id}
                  diagnostic={d}
                  entity={entity}
                  soHieu={soHieuOf(entity)}
                  context={contextOf(d.entity_id)}
                  entities={entities}
                  departments={departments}
                  onChanged={refresh}
                />
              );
            })}
          </section>
        );
      })}
    </div>
  );
}

function DiagnosticCard({
  diagnostic: d,
  entity,
  soHieu,
  context,
  entities,
  departments,
  onChanged,
}: {
  diagnostic: Diagnostic;
  entity: Entity | undefined;
  soHieu?: string;
  context: EntityGraphRow[];
  entities: Entity[];
  departments: Department[];
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
      await postPipeline("/api/pipeline/generate", { customer_id: d.customer_id, diagnostic_ids: [d.id] });
      setError(null);
    } catch (e) {
      setError(
        e instanceof PipelineError
          ? handleError({ code: pipelineErrorCode(e), message: e.error, status: e.status }, { onForbidden: () => setForbidden(true) })
          : "AI chưa viết được checklist.",
      );
    }
    setBusy(false);
    onChanged();
  }

  return (
    <Card className={cn(hetApDung && "opacity-60")}>
      <CardHeader>
        <CardTitle className={cn(hetApDung && "line-through")}>{entity?.ten_entity ?? d.entity_id}</CardTitle>
        <CardDescription className="flex flex-wrap items-center gap-2">
          <ApDungBadge status={d.trang_thai_ap_dung} />
          {entity && (
            <span>
              {soHieu} · {entity.dieu_khoan}
            </span>
          )}
        </CardDescription>
        <CardAction>
          <DuyetBadge status={d.trang_thai_duyet} />
        </CardAction>
      </CardHeader>

      <CardContent className="space-y-3">
        {chuaDu ? (
          <p className="text-sm text-status-chua-du-tt">
            Đang chờ trả lời câu hỏi bổ sung —{" "}
            <a href="#hoi-bo-sung" className="underline">
              trả lời ở đầu trang
            </a>
            .
          </p>
        ) : (
          <DiagnosticBody noiDung={d.noi_dung_diagnostic} entity={entity} soHieu={soHieu} context={context} entities={entities} />
        )}
        {hetApDung && <p className="text-xs text-muted-foreground">Sau lần quét lại gần nhất, nghĩa vụ này không còn áp dụng cho doanh nghiệp.</p>}
        {d.ghi_chu_duyet && <p className="text-xs text-muted-foreground">Ghi chú duyệt: {d.ghi_chu_duyet}</p>}
        {error && (
          <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">
            {error}
          </p>
        )}
      </CardContent>

      {choAi && !forbidden && (
        <CardFooter>
          <Button size="sm" variant="outline" disabled={busy} onClick={askAi}>
            <Sparkles /> Yêu cầu AI viết checklist
          </Button>
        </CardFooter>
      )}

      {canApprove && !forbidden && (
        <CardFooter className="flex-col items-stretch gap-3 sm:flex-row sm:items-end">
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
            <Button size="sm" disabled={busy} onClick={() => decide("da_duyet")}>
              <Send /> Duyệt &amp; giao
            </Button>
            <Button size="sm" variant="destructive" disabled={busy} onClick={() => decide("tu_choi")}>
              Từ chối
            </Button>
          </div>
        </CardFooter>
      )}
    </Card>
  );
}
