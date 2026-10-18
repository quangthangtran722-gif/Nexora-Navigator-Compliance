"use client";

import { useState } from "react";
import { Bot, Cog } from "lucide-react";

import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ErrorBlock, LoadingBlock } from "@/components/nexora/data-state";
import { RunBadge } from "@/components/nexora/status-badges";
import { formatDateTime, PIPELINE_NAME_LABEL } from "@/lib/labels";
import { combine } from "@/lib/data/errors";
import { getChunks, getCustomers, getPipelineRuns, getVanBanList } from "@/lib/data/queries";
import { useQuery } from "@/lib/data/use-query";
import type { Json, PipelineName, PipelineRun } from "@/lib/types";

/*
 * Nhật ký pipeline_runs (CONTRACT §3.7) — màn "minh bạch" khi trình bày với mentor.
 * model = null ⇔ filter_domain (rule engine thuần code, không gọi AI).
 */

const ALL = "all";
const NAMES: PipelineName[] = ["extract_entities", "filter_domain", "generate_diagnostic"];

export function PipelineLog() {
  const [name, setName] = useState<PipelineName | typeof ALL>(ALL);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const res = useQuery(() => combine({ runs: getPipelineRuns(), customers: getCustomers(), chunks: getChunks(), vanBan: getVanBanList() }), []);
  if (res.loading) return <LoadingBlock />;
  if (res.error) return <ErrorBlock error={res.error} onRetry={res.reload} />;
  const { runs, customers, chunks, vanBan } = res.data!;

  const shown = name === ALL ? runs : runs.filter((r) => r.pipeline_name === name);
  const selected = runs.find((r) => r.id === selectedId) ?? null;

  const customerName = (id: string | null) => customers.find((c) => c.id === id)?.ten_cong_ty ?? id ?? "—";
  function chunkLabel(id: string | null) {
    const c = chunks.find((x) => x.id === id);
    if (!c) return id ?? "—";
    return `${vanBan.find((v) => v.id === c.van_ban_id)?.so_hieu ?? ""} · chunk ${c.thu_tu}`;
  }
  // "Chạy cho": chunk (extract) · công ty (filter / generate)
  const target = (r: PipelineRun) => (r.pipeline_name === "extract_entities" ? chunkLabel(r.chunk_id) : customerName(r.customer_id));

  const aiRuns = runs.filter((r) => r.model !== null).length;
  const failed = runs.filter((r) => r.trang_thai === "loi").length;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Tổng số lần chạy" value={runs.length} />
        <Stat label="Gọi AI / Rule engine thuần code" value={`${aiRuns} / ${runs.length - aiRuns}`} />
        <Stat label="Lần chạy lỗi" value={failed} />
      </div>

      <Tabs value={name} onValueChange={(v) => setName(v as PipelineName | typeof ALL)}>
        {/* Màn hẹp: 1 hàng, cuộn ngang thay vì xuống dòng */}
        <div className="-mx-1 overflow-x-auto px-1 pb-1">
          <TabsList className="w-max">
            <TabsTrigger value={ALL}>Tất cả</TabsTrigger>
            {NAMES.map((n) => (
              <TabsTrigger key={n} value={n}>
                {PIPELINE_NAME_LABEL[n]}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>
      </Tabs>

      <div className="rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Bắt đầu</TableHead>
              <TableHead>Bước</TableHead>
              <TableHead>Chạy cho</TableHead>
              <TableHead>Bộ xử lý</TableHead>
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
                    className="text-left hover:underline"
                    onClick={(ev) => {
                      ev.stopPropagation();
                      setSelectedId(r.id);
                    }}
                  >
                    {formatDateTime(r.started_at ?? r.created_at, true)}
                  </button>
                </TableCell>
                <TableCell className="whitespace-normal">{PIPELINE_NAME_LABEL[r.pipeline_name]}</TableCell>
                <TableCell className="max-w-56 whitespace-normal">{target(r)}</TableCell>
                <TableCell>
                  <ModelCell model={r.model} />
                </TableCell>
                <TableCell>
                  <RunBadge status={r.trang_thai} />
                </TableCell>
                <TableCell className="text-right tabular-nums">{duration(r)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Chi tiết 1 lần chạy */}
      <Sheet open={!!selected} onOpenChange={(open) => !open && setSelectedId(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle>{PIPELINE_NAME_LABEL[selected.pipeline_name]}</SheetTitle>
                <SheetDescription>
                  <code>{selected.id}</code> · {formatDateTime(selected.started_at ?? selected.created_at, true)} · {duration(selected)}
                </SheetDescription>
              </SheetHeader>
              <div className="space-y-4 px-4 pb-6 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <RunBadge status={selected.trang_thai} />
                  <ModelCell model={selected.model} />
                </div>
                <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5">
                  <dt className="text-muted-foreground">Chạy cho</dt>
                  <dd>{target(selected)}</dd>
                  <dt className="text-muted-foreground">Prompt</dt>
                  <dd>{selected.prompt_version ? <code className="text-xs">{selected.prompt_version}</code> : "— (không dùng AI)"}</dd>
                  {selected.parent_run_id && (
                    <>
                      <dt className="text-muted-foreground">Kích hoạt bởi</dt>
                      <dd>
                        <button type="button" className="hover:underline" onClick={() => setSelectedId(selected.parent_run_id)}>
                          <code className="text-xs">{selected.parent_run_id}</code>
                        </button>
                      </dd>
                    </>
                  )}
                </dl>
                {selected.error_log && <p className="rounded-lg bg-destructive/10 px-3 py-2 text-destructive">{selected.error_log}</p>}
                <JsonBlock label="Input" value={selected.input} />
                <JsonBlock label="Output" value={selected.output} />
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <Card size="sm">
      <CardHeader>
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-3xl font-semibold tabular-nums">{value}</CardTitle>
      </CardHeader>
    </Card>
  );
}

// model = null ⇔ filter_domain — điểm cần thấy rõ khi trình bày minh bạch
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
      <pre className="overflow-x-auto rounded-lg bg-muted/60 p-3 font-mono text-xs leading-relaxed">{value === null ? "null" : JSON.stringify(value, null, 2)}</pre>
    </div>
  );
}

// Thời gian chạy = completed_at − started_at
export function duration(r: PipelineRun) {
  if (!r.started_at || !r.completed_at) return r.trang_thai === "loi" ? "—" : "…";
  const ms = new Date(r.completed_at).getTime() - new Date(r.started_at).getTime();
  return ms < 1000 ? `${ms} ms` : `${(ms / 1000).toLocaleString("vi-VN", { maximumFractionDigits: 1 })} s`;
}
