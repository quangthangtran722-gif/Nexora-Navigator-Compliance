"use client";

import { useState } from "react";
import { Activity, Bot, Cog, FileText, TriangleAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ErrorBlock, LoadingBlock } from "@/components/nexora/data-state";
import { KpiCard } from "@/components/nexora/kpi-card";
import { RUN_LABEL, RunBadge } from "@/components/nexora/status-badges";
import { TabBar } from "@/components/nexora/tab-bar";
import { COPY } from "@/lib/copy";
import { formatDateTime, PIPELINE_NAME_LABEL } from "@/lib/labels";
import { combine } from "@/lib/data/errors";
import { getChunks, getCustomers, getPipelineRuns, getVanBanList } from "@/lib/data/queries";
import { useQuery } from "@/lib/data/use-query";
import type { Json, PipelineName, PipelineRun, TrangThaiRun } from "@/lib/types";

/*
 * Nhật ký pipeline_runs (CONTRACT §3.7) — màn "minh bạch" khi trình bày với mentor.
 * model = null ⇔ filter_domain (rule engine thuần code, không gọi AI).
 * Palette v3 mục 9.10: TabBar lọc trạng thái lần chạy; bảng; chi tiết + lỗi trong ngăn bên phải.
 * ID, bộ xử lý và JSON thô chỉ nằm trong mục "Chi tiết kỹ thuật" (thu gọn mặc định) — chỗ DUY NHẤT được hiện mã kỹ thuật (wording mục 4).
 */

const ALL = "all";
const NAMES: PipelineName[] = ["extract_entities", "filter_domain", "generate_diagnostic"];
const RUN_STATUSES: TrangThaiRun[] = ["hoan_tat", "loi", "dang_xu_ly", "cho_xu_ly"];
const NAME_ITEMS = [{ value: ALL, label: "Mọi loại xử lý" }, ...NAMES.map((n) => ({ value: n, label: PIPELINE_NAME_LABEL[n] }))];

export function PipelineLog() {
  const [name, setName] = useState<string>(ALL);
  const [status, setStatus] = useState<string>(ALL);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const res = useQuery(() => combine({ runs: getPipelineRuns(), customers: getCustomers(), chunks: getChunks(), vanBan: getVanBanList() }), []);
  if (res.loading) return <LoadingBlock />;
  if (res.error) return <ErrorBlock error={res.error} onRetry={res.reload} />;
  const { runs, customers, chunks, vanBan } = res.data!;

  const byName = name === ALL ? runs : runs.filter((r) => r.pipeline_name === name);
  const shown = status === ALL ? byName : byName.filter((r) => r.trang_thai === status);
  const selected = runs.find((r) => r.id === selectedId) ?? null;

  const customerName = (id: string | null) => customers.find((c) => c.id === id)?.ten_cong_ty ?? "—";
  function chunkLabel(id: string | null) {
    const c = chunks.find((x) => x.id === id);
    if (!c) return "—";
    return `${vanBan.find((v) => v.id === c.van_ban_id)?.so_hieu ?? ""} · ${COPY.term.phan} ${c.thu_tu}`;
  }
  // "Đối tượng": phần văn bản (trích xuất) · khách hàng (đối chiếu / tạo việc cần làm)
  const target = (r: PipelineRun) => (r.pipeline_name === "extract_entities" ? chunkLabel(r.chunk_id) : customerName(r.customer_id));

  const trichXuat = runs.filter((r) => r.pipeline_name === "extract_entities").length;
  const failed = runs.filter((r) => r.trang_thai === "loi").length;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <KpiCard label="Tổng số lần xử lý" value={runs.length} icon={Activity} />
        <KpiCard label="Lần trích xuất văn bản" value={trichXuat} icon={FileText} />
        <KpiCard label="Lần xử lý lỗi" value={failed} icon={TriangleAlert} attention={failed > 0} />
      </div>

      <TabBar
        label="Lọc theo trạng thái"
        value={status}
        onValueChange={setStatus}
        items={[
          { value: ALL, label: "Tất cả", count: byName.length, countTone: "neutral" },
          ...RUN_STATUSES.map((s) => ({
            value: s,
            label: RUN_LABEL[s],
            count: byName.filter((r) => r.trang_thai === s).length,
            countTone: s === "loi" ? ("action" as const) : ("neutral" as const),
          })),
        ]}
        extra={
          <Select items={NAME_ITEMS} value={name} onValueChange={(v) => setName((v as string | null) ?? ALL)}>
            <SelectTrigger size="sm" className="w-48" aria-label="Lọc theo loại xử lý">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {NAME_ITEMS.map((n) => (
                <SelectItem key={n.value} value={n.value}>
                  {n.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
      >
        <div className="border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Bắt đầu</TableHead>
                <TableHead>Loại xử lý</TableHead>
                <TableHead>Đối tượng</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead className="text-right">Thời gian</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {shown.map((r) => (
                <TableRow key={r.id} className="cursor-pointer" onClick={() => setSelectedId(r.id)}>
                  <TableCell className="tabular-nums">
                    <button
                      type="button"
                      className="text-left hover:text-gold-text hover:underline"
                      onClick={(ev) => {
                        ev.stopPropagation();
                        setSelectedId(r.id);
                      }}
                    >
                      {formatDateTime(r.started_at ?? r.created_at, true)}
                    </button>
                  </TableCell>
                  <TableCell className="min-w-36 whitespace-normal">{PIPELINE_NAME_LABEL[r.pipeline_name]}</TableCell>
                  <TableCell className="min-w-44 whitespace-normal">{target(r)}</TableCell>
                  <TableCell>
                    <RunBadge status={r.trang_thai} />
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{duration(r)}</TableCell>
                </TableRow>
              ))}
              {shown.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                    Không có lần xử lý nào khớp bộ lọc.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </TabBar>

      {/* Chi tiết 1 lần chạy */}
      <Sheet open={!!selected} onOpenChange={(open) => !open && setSelectedId(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle>{PIPELINE_NAME_LABEL[selected.pipeline_name]}</SheetTitle>
                <SheetDescription>
                  {formatDateTime(selected.started_at ?? selected.created_at, true)} · {duration(selected)}
                </SheetDescription>
              </SheetHeader>
              <div className="space-y-4 px-4 pb-6 text-sm">
                <RunBadge status={selected.trang_thai} />
                <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5">
                  <dt className="text-muted-foreground">Đối tượng</dt>
                  <dd>{target(selected)}</dd>
                  {selected.parent_run_id && (
                    <>
                      <dt className="text-muted-foreground">Bắt nguồn từ</dt>
                      <dd>
                        <Button variant="link" size="sm" className="h-auto p-0" onClick={() => setSelectedId(selected.parent_run_id)}>
                          Xem lần xử lý trước đó
                        </Button>
                      </dd>
                    </>
                  )}
                </dl>
                {selected.error_log && (
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground">Chi tiết lỗi</p>
                    <p className="border-l-[3px] border-destructive bg-brand-red-bg px-3 py-2.5 text-destructive">{selected.error_log}</p>
                  </div>
                )}
                {/* Minh bạch cho mentor: input/output đầy đủ, nhưng thu gọn để không lộ JSON thô mặc định */}
                <details className="border">
                  <summary className="cursor-pointer px-3 py-2 text-xs font-medium text-muted-foreground">Chi tiết kỹ thuật</summary>
                  <div className="space-y-3 border-t p-3">
                    <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-xs">
                      <dt className="text-muted-foreground">Mã lần chạy</dt>
                      <dd>
                        <code>{selected.id}</code>
                      </dd>
                      <dt className="text-muted-foreground">Bộ xử lý</dt>
                      <dd>
                        <ModelCell model={selected.model} />
                      </dd>
                      <dt className="text-muted-foreground">Prompt</dt>
                      <dd>{selected.prompt_version ?? "—"}</dd>
                    </dl>
                    <JsonBlock label="Input" value={selected.input} />
                    <JsonBlock label="Output" value={selected.output} />
                  </div>
                </details>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

// model = null ⇔ filter_domain. Chỉ hiện trong "Chi tiết kỹ thuật" (ngoại lệ duy nhất được nói tên kỹ thuật)
export function ModelCell({ model }: { model: string | null }) {
  return model ? (
    <span className="inline-flex items-center gap-1.5">
      <Bot className="size-3.5 text-muted-foreground" aria-hidden />
      <code className="text-xs">{model}</code>
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 font-medium text-duyet-da">
      <Cog className="size-3.5" aria-hidden /> Rule engine — không dùng AI
    </span>
  );
}

function JsonBlock({ label, value }: { label: string; value: Json | null }) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <pre className="overflow-x-auto bg-muted p-3 font-mono text-xs leading-relaxed">{value === null ? "null" : JSON.stringify(value, null, 2)}</pre>
    </div>
  );
}

// Thời gian chạy = completed_at − started_at
export function duration(r: PipelineRun) {
  if (!r.started_at || !r.completed_at) return r.trang_thai === "loi" ? "—" : "…";
  const ms = new Date(r.completed_at).getTime() - new Date(r.started_at).getTime();
  return ms < 1000 ? `${ms} ms` : `${(ms / 1000).toLocaleString("vi-VN", { maximumFractionDigits: 1 })} s`;
}
