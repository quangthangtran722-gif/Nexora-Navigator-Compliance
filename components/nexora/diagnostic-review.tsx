"use client";

import { useEffect, useState } from "react";
import { Send, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ErrorBlock, LoadingBlock } from "@/components/nexora/data-state";
import { DiagnosticBody } from "@/components/nexora/diagnostic-body";
import { EmptyGroupLine, GroupHeader } from "@/components/nexora/group-header";
import { HoiBoSungCard } from "@/components/nexora/hoi-bo-sung";
import { ItemActions, ItemList, ItemMeta, ItemRow } from "@/components/nexora/item-row";
import { ApDungBadge, DuyetBadge } from "@/components/nexora/status-badges";
import { TabBar } from "@/components/nexora/tab-bar";
import { TRANG_THAI_AP_DUNG_LABEL } from "@/lib/labels";
import { useAuth } from "@/lib/auth/auth-provider";
import { combine, useErrorHandler } from "@/lib/data/errors";
import { getChunks, getCustomer, getDepartments, getDiagnostics, getEntities, getEntityGraph, getThuocTinhHoSo, getVanBanList } from "@/lib/data/queries";
import { useQuery } from "@/lib/data/use-query";
import { generateAll, PipelineError, toAppError } from "@/lib/data/pipeline";
import { rpc } from "@/lib/data/rpc";
import type { Department, Diagnostic, Entity, EntityGraphRow, TrangThaiApDung } from "@/lib/types";

/*
 * Người đầu mối duyệt diagnostic (CONTRACT §3.6) — MẪU GỐC của palette v3 mục 9. 4 trạng thái áp dụng:
 *  chua_du_thong_tin → khối "Cần bổ sung thông tin" (hỏi bổ sung) ở đầu trang
 *  ap_dung / sap_ap_dung, chưa có nội dung → chờ AI viết
 *  ap_dung / sap_ap_dung, có nội dung → duyệt qua RPC approve_diagnostic (có thể đổi phòng nhận)
 *  khong_ap_dung → mục cũ hết áp dụng sau khi quét lại: gạch đi, chỉ hiện khi lọc "Không áp dụng"
 * Bố cục: TabBar phòng ban + lọc trạng thái; GroupHeader mỗi phòng; ItemRow thu gọn, chỉ mở 1 dòng.
 */

// Thứ tự trong mỗi phòng: việc cần làm trước
const RANK: Record<TrangThaiApDung, number> = { ap_dung: 0, sap_ap_dung: 1, chua_du_thong_tin: 2, khong_ap_dung: 3 };
const STATUSES: TrangThaiApDung[] = ["ap_dung", "sap_ap_dung", "chua_du_thong_tin", "khong_ap_dung"];
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
  const [flash, setFlash] = useState<string | null>(null);
  const [tab, setTab] = useState<string>(ALL);
  const [loc, setLoc] = useState<string>(ALL); // lọc trạng thái áp dụng
  // Mặc định thu gọn tất cả; đi từ Hộp thư (#diag-<id>) thì mở sẵn đúng mục đó
  const [openId, setOpenId] = useState<string | null>(() =>
    typeof window !== "undefined" && window.location.hash.startsWith("#diag-") ? window.location.hash.slice("#diag-".length) : null,
  );
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
  // Dữ liệu tải xong mới có phần tử để cuộn tới
  useEffect(() => {
    if (!res.loading && openId && window.location.hash === `#diag-${openId}`) document.getElementById(`diag-${openId}`)?.scrollIntoView({ block: "start" });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- chỉ cuộn 1 lần khi vừa tải xong
  }, [res.loading]);
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

  // Mục hết áp dụng chỉ hiện khi lọc đúng trạng thái "Không áp dụng"
  const hopLoc = (d: Diagnostic) => (loc === ALL ? d.trang_thai_ap_dung !== "khong_ap_dung" : d.trang_thai_ap_dung === loc);
  const itemsOf = (dept: Department) =>
    diagnostics.filter((d) => d.department_id === dept.id && hopLoc(d)).sort((a, b) => RANK[a.trang_thai_ap_dung] - RANK[b.trang_thai_ap_dung]);
  const shown = tab === ALL ? departments : departments.filter((d) => d.id === tab);
  const coChecklist = shown.filter((d) => itemsOf(d).length > 0);
  const khongChecklist = shown.filter((d) => itemsOf(d).length === 0);
  const tong = demDuyet(diagnostics);

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

      <TabBar
        label="Phòng ban"
        value={tab}
        onValueChange={setTab}
        items={[
          { value: ALL, label: "Tất cả", count: tong.cho, countTone: "action" },
          ...departments.map((dept) => ({
            value: dept.id,
            label: dept.ten_phong_ban,
            count: demDuyet(diagnostics.filter((d) => d.department_id === dept.id)).cho,
            countTone: "action" as const,
          })),
        ]}
      >
        {/* Lọc trạng thái + bộ đếm duyệt */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <TabBar
            label="Lọc theo trạng thái áp dụng"
            value={loc}
            onValueChange={setLoc}
            className="min-w-0 flex-1"
            items={[
              { value: ALL, label: "Tất cả" },
              ...STATUSES.map((s) => ({
                value: s,
                label: TRANG_THAI_AP_DUNG_LABEL[s],
                count: diagnostics.filter((d) => d.trang_thai_ap_dung === s).length,
                countTone: "neutral" as const,
              })),
            ]}
          />
          <p className="text-xs font-medium text-muted-foreground tabular-nums">
            {tong.cho} chờ duyệt · {tong.da} đã duyệt
          </p>
        </div>

        {coChecklist.map((dept) => {
          const items = itemsOf(dept);
          const dem = demDuyet(items);
          return (
            <section key={dept.id} id={dept.id} className="scroll-mt-20" aria-labelledby={`dept-${dept.id}`}>
              <GroupHeader
                id={`dept-${dept.id}`}
                title={dept.ten_phong_ban}
                subtitle={dept.email_head}
                counts={[
                  { label: "chờ duyệt", n: dem.cho, tone: "action" },
                  { label: "đã duyệt", n: dem.da },
                ]}
              />
              <ItemList className="border-t-0">
                {items.map((d) => {
                  const entity = entities.find((e) => e.id === d.entity_id);
                  return (
                    <DiagnosticRow
                      key={d.id}
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
                  );
                })}
              </ItemList>
            </section>
          );
        })}

        {/* Phòng chưa có checklist: 1 dòng xám, không có dải đầu */}
        {khongChecklist.length > 0 && (
          <div className="space-y-1">
            {khongChecklist.map((dept) => (
              <EmptyGroupLine key={dept.id} title={dept.ten_phong_ban} text={loc === ALL ? "chưa có checklist" : "không có mục khớp bộ lọc"} />
            ))}
          </div>
        )}
      </TabBar>
    </div>
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
    <ItemRow
      id={`diag-${d.id}`}
      title={entity?.ten_entity ?? "Nghĩa vụ"}
      muted={hetApDung}
      open={open}
      onToggle={onToggle}
      right={
        <>
          <ApDungBadge status={d.trang_thai_ap_dung} />
          <DuyetBadge status={d.trang_thai_duyet} />
        </>
      }
    >
      {entity && (
        <ItemMeta>
          {entity.dieu_khoan}
          {tenVanBan && ` — ${tenVanBan}`}
        </ItemMeta>
      )}
      {chuaDu ? (
        <p className="text-sm text-status-chua-du-tt">
          Đang chờ trả lời câu hỏi bổ sung —{" "}
          <a href="#hoi-bo-sung" className="text-gold-text underline-offset-4 hover:underline">
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
        <ItemActions>
          <Button size="sm" disabled={busy} onClick={askAi}>
            <Sparkles /> Yêu cầu AI viết checklist
          </Button>
        </ItemActions>
      )}

      {canApprove && !forbidden && (
        <ItemActions>
          <div className="mr-auto w-full space-y-1.5 sm:w-56">
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
          <Input value={ghiChu} onChange={(e) => setGhiChu(e.target.value)} placeholder="Ghi chú (không bắt buộc)" className="w-full sm:w-auto sm:flex-1" aria-label="Ghi chú duyệt" />
          {/* Phụ trước, chính sát phải. Chỉ 1 dòng mở → chỉ 1 nút ánh kim trên màn */}
          <Button size="sm" variant="outline" disabled={busy} onClick={() => decide("tu_choi")}>
            Từ chối
          </Button>
          <Button size="sm" disabled={busy} onClick={() => decide("da_duyet")}>
            <Send /> Duyệt &amp; giao
          </Button>
        </ItemActions>
      )}
    </ItemRow>
  );
}
