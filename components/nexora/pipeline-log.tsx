"use client";

import { useState } from "react";
import { Bot, Cog, TriangleAlert } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { buocLabel, formatDateTime } from "@/lib/labels";
import type { BuocPipeline, Customer, Entity, PipelineRun } from "@/lib/types";

type Props = {
  runs: PipelineRun[];
  entities: Entity[];
  customers: Customer[];
};

const ALL = "all";
const BUOC: BuocPipeline[] = ["extract_entities", "filter_domain", "generate_diagnostic"];

export function PipelineLog({ runs, entities, customers }: Props) {
  const [buoc, setBuoc] = useState<BuocPipeline | typeof ALL>(ALL);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const shown = buoc === ALL ? runs : runs.filter((r) => r.buoc === buoc);
  const selected = runs.find((r) => r.id === selectedId) ?? null;

  const customerName = (id: string | null) => customers.find((c) => c.id === id)?.ten_cong_ty ?? id;
  const entityName = (id: string | null) => entities.find((e) => e.id === id)?.ten_entity ?? id;

  // Mô tả "chạy cho cái gì": chunk (extract) · công ty (filter) · công ty + entity (diagnostic)
  function target(r: PipelineRun) {
    if (r.buoc === "extract_entities") return <code className="text-xs">{r.chunk_id}</code>;
    if (r.buoc === "filter_domain") return customerName(r.customer_id);
    return (
      <span>
        {entityName(r.entity_id)}
        <span className="block text-xs text-muted-foreground">{customerName(r.customer_id)}</span>
      </span>
    );
  }

  const aiRuns = runs.filter((r) => r.model !== null).length;
  const failed = runs.filter((r) => !r.thanh_cong).length;

  return (
    <div className="space-y-4">
      {/* Tóm tắt minh bạch */}
      <div className="grid gap-3 sm:grid-cols-3">
        <Card size="sm">
          <CardHeader>
            <CardDescription>Tổng số lần chạy</CardDescription>
            <CardTitle className="text-3xl font-semibold tabular-nums">{runs.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card size="sm">
          <CardHeader>
            <CardDescription>Gọi AI / Rule engine thuần code</CardDescription>
            <CardTitle className="text-3xl font-semibold tabular-nums">
              {aiRuns} <span className="text-muted-foreground">/</span> {runs.length - aiRuns}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card size="sm">
          <CardHeader>
            <CardDescription>Lần chạy lỗi</CardDescription>
            <CardTitle className="text-3xl font-semibold tabular-nums">{failed}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Tabs value={buoc} onValueChange={(v) => setBuoc(v as BuocPipeline | typeof ALL)}>
        <TabsList className="flex-wrap">
          <TabsTrigger value={ALL}>Tất cả</TabsTrigger>
          {BUOC.map((b) => (
            <TabsTrigger key={b} value={b}>
              {buocLabel[b]}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <div className="rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Thời điểm</TableHead>
              <TableHead>Bước</TableHead>
              <TableHead>Chạy cho</TableHead>
              <TableHead>Bộ xử lý</TableHead>
              <TableHead>Kết quả</TableHead>
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
                    {formatDateTime(r.created_at)}
                  </button>
                </TableCell>
                <TableCell>{buocLabel[r.buoc]}</TableCell>
                <TableCell className="max-w-56 whitespace-normal">{target(r)}</TableCell>
                <TableCell>
                  <ModelCell model={r.model} />
                </TableCell>
                <TableCell>
                  {r.thanh_cong ? (
                    <Badge variant="secondary">Thành công</Badge>
                  ) : (
                    <Badge variant="destructive">
                      <TriangleAlert aria-hidden /> Lỗi
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="text-right tabular-nums">{formatMs(r.thoi_gian_ms)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Chi tiết 1 lần chạy: input / output */}
      <Sheet open={!!selected} onOpenChange={(open) => !open && setSelectedId(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle>{buocLabel[selected.buoc]}</SheetTitle>
                <SheetDescription>
                  <code>{selected.id}</code> · {formatDateTime(selected.created_at)} · {formatMs(selected.thoi_gian_ms)}
                </SheetDescription>
              </SheetHeader>
              <div className="space-y-4 px-4 pb-6 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <ModelCell model={selected.model} />
                  {!selected.thanh_cong && <Badge variant="destructive">Lỗi</Badge>}
                </div>
                {selected.loi && (
                  <p className="rounded-lg bg-destructive/10 px-3 py-2 text-destructive">{selected.loi}</p>
                )}
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

// model = null nghĩa là rule engine thuần code — điểm cần thấy rõ khi trình bày minh bạch
function ModelCell({ model }: { model: string | null }) {
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

function JsonBlock({ label, value }: { label: string; value: unknown }) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <pre className="overflow-x-auto rounded-lg bg-muted/60 p-3 font-mono text-xs leading-relaxed">
        {value === null ? "null" : JSON.stringify(value, null, 2)}
      </pre>
    </div>
  );
}

function formatMs(ms: number) {
  return ms < 1000 ? `${ms} ms` : `${(ms / 1000).toLocaleString("vi-VN", { maximumFractionDigits: 1 })} s`;
}
