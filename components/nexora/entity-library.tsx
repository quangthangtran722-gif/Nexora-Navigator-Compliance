"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CalendarDays, Pencil, Search } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ErrorBlock, LoadingBlock } from "@/components/nexora/data-state";
import { DieuKienEditor } from "@/components/nexora/dieu-kien-editor";
import { EdgeLine } from "@/components/nexora/edge-line";
import { AnhHuongBadge, LoaiEntityBadge } from "@/components/nexora/status-badges";
import { deptLabel, domainLabel, formatDate, KNOWN_DOMAINS, LOAI_ENTITY_LABEL } from "@/lib/labels";
import { combine, useErrorHandler } from "@/lib/data/errors";
import { updateEntity } from "@/lib/data/mutations";
import { getChunks, getEntities, getEntityGraph, getThuocTinhHoSo, getVanBanList } from "@/lib/data/queries";
import { useQuery } from "@/lib/data/use-query";
import { formatDieuKien } from "@/lib/thuoc-tinh-format";
import type { DieuKienMayDoc, LoaiEntity } from "@/lib/types";
import { cn } from "@/lib/utils";

/*
 * Kho entity — chỉ entity đã duyệt (khách hàng cũng chỉ thấy phần da_duyet, CONTRACT §3.4).
 * Quan hệ lấy từ view entity_graph: cạnh có nguồn đã duyệt.
 */

const ALL = "all";
// Loại entity mang được dieu_kien_may_doc (DB check constraint)
const LOAI_CO_DIEU_KIEN: LoaiEntity[] = ["dieu_kien", "nguong", "chu_the"];

const LOAI_ITEMS = [
  { value: ALL, label: "Tất cả loại" },
  ...(Object.keys(LOAI_ENTITY_LABEL) as LoaiEntity[]).map((v) => ({ value: v, label: LOAI_ENTITY_LABEL[v] })),
];

export function EntityLibrary() {
  const [query, setQuery] = useState("");
  const [domain, setDomain] = useState<string>(ALL);
  const [loai, setLoai] = useState<string>(ALL);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingDk, setEditingDk] = useState(false);
  const [dkBusy, setDkBusy] = useState(false);
  const [dkMsg, setDkMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const handleError = useErrorHandler();

  const res = useQuery(
    () => combine({ entities: getEntities(), graph: getEntityGraph(), vanBan: getVanBanList(), chunks: getChunks(), dict: getThuocTinhHoSo() }),
    [],
  );
  const entities = useMemo(() => (res.data?.entities ?? []).filter((e) => e.trang_thai_duyet === "da_duyet"), [res.data]);
  const graph = (res.data?.graph ?? []).filter((g) => g.source_trang_thai_duyet === "da_duyet");
  const { vanBan = [], chunks = [], dict = [] } = res.data ?? {};
  const vanBanOf = (chunkId: string) => vanBan.find((v) => v.id === chunks.find((c) => c.id === chunkId)?.van_ban_id);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return entities.filter(
      (e) =>
        (domain === ALL || e.domain === domain) &&
        (loai === ALL || e.loai_entity === loai) &&
        (!q || [e.ten_entity, e.noi_dung_goc, e.dieu_khoan, e.mo_ta].some((s) => s.toLowerCase().includes(q))),
    );
  }, [entities, query, domain, loai]);

  if (res.loading) return <LoadingBlock />;
  if (res.error) return <ErrorBlock error={res.error} onRetry={res.reload} />;

  const selected = entities.find((e) => e.id === selectedId) ?? null;
  const edges = selected ? graph.filter((g) => g.source_id === selected.id || g.target_id === selected.id) : [];
  const selectedVb = selected ? vanBanOf(selected.chunk_id) : undefined;

  // Entity đã duyệt vẫn sửa được dieu_kien_may_doc (RLS: curator). Không đổi trạng thái duyệt.
  async function saveDk(dk: DieuKienMayDoc) {
    if (!selected) return;
    setDkBusy(true);
    const { error } = await updateEntity(selected.id, { dieu_kien_may_doc: dk });
    setDkBusy(false);
    if (error) return setDkMsg({ ok: false, text: handleError(error) ?? error.message });
    setEditingDk(false);
    setDkMsg({ ok: true, text: "Đã lưu. Chạy \"Quét lại khách hàng\" để áp điều kiện mới cho khách hàng hiện có." });
    res.reload();
  }

  return (
    <div className="space-y-4">
      {/* Bộ lọc */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative sm:max-w-xs sm:flex-1">
          <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Tìm theo tên, điều khoản, nội dung…" className="pl-8" aria-label="Tìm entity" />
        </div>
        <div className="flex gap-1 rounded-lg bg-muted p-1" role="group" aria-label="Lọc theo lĩnh vực">
          {[ALL, ...KNOWN_DOMAINS].map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDomain(d)}
              aria-pressed={domain === d}
              className={cn("rounded-md px-3 py-1 text-sm transition-colors", domain === d ? "bg-background font-medium shadow-sm" : "text-muted-foreground hover:text-foreground")}
            >
              {d === ALL ? "Tất cả" : domainLabel(d)}
            </button>
          ))}
        </div>
        <Select items={LOAI_ITEMS} value={loai} onValueChange={(v) => setLoai((v as string | null) ?? ALL)}>
          <SelectTrigger className="w-full sm:w-44" aria-label="Lọc theo loại entity">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {LOAI_ITEMS.map((l) => (
              <SelectItem key={l.value} value={l.value}>
                {l.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-sm text-muted-foreground sm:ml-auto">
          {filtered.length}/{entities.length} entity
        </span>
      </div>

      {/* Bảng */}
      <div className="rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Entity</TableHead>
              <TableHead>Loại</TableHead>
              <TableHead>Văn bản · điều khoản</TableHead>
              <TableHead>Lĩnh vực</TableHead>
              <TableHead>Hiệu lực</TableHead>
              <TableHead>Phòng ban chính</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((e) => {
              const vb = vanBanOf(e.chunk_id);
              return (
                <TableRow key={e.id} className="cursor-pointer" onClick={() => setSelectedId(e.id)}>
                  <TableCell className="max-w-xs">
                    <button
                      type="button"
                      className="text-left font-medium whitespace-normal hover:underline"
                      onClick={(ev) => {
                        ev.stopPropagation();
                        setSelectedId(e.id);
                      }}
                    >
                      {e.ten_entity}
                    </button>
                  </TableCell>
                  <TableCell>
                    <LoaiEntityBadge loai={e.loai_entity} />
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {vb?.so_hieu} · {e.dieu_khoan}
                  </TableCell>
                  <TableCell>{domainLabel(e.domain)}</TableCell>
                  <TableCell className="tabular-nums">{formatDate(e.ngay_co_hieu_luc ?? vb?.ngay_hieu_luc ?? null)}</TableCell>
                  <TableCell>{e.primary_departments.map(deptLabel).join(", ") || "—"}</TableCell>
                </TableRow>
              );
            })}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                  Không có entity nào khớp bộ lọc.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Chi tiết entity */}
      <Sheet open={!!selected} onOpenChange={(open) => { if (!open) { setSelectedId(null); setEditingDk(false); setDkMsg(null); } }}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle>{selected.ten_entity}</SheetTitle>
                <SheetDescription className="flex flex-wrap items-center gap-2">
                  <LoaiEntityBadge loai={selected.loai_entity} />
                  <span>{domainLabel(selected.domain)}</span>
                  <span aria-hidden>·</span>
                  <span>
                    {selectedVb?.so_hieu} · {selected.dieu_khoan}
                  </span>
                </SheetDescription>
              </SheetHeader>
              <div className="space-y-5 px-4 pb-6 text-sm">
                <figure className="space-y-1">
                  <figcaption className="text-xs font-medium text-muted-foreground">Trích nguyên văn · {selected.dieu_khoan}</figcaption>
                  <blockquote className="border-l-4 border-primary/40 bg-muted/50 px-3 py-2">{selected.noi_dung_goc}</blockquote>
                </figure>
                <p>
                  <span className="text-muted-foreground">Mô tả: </span>
                  {selected.mo_ta}
                </p>
                <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2">
                  <dt className="text-muted-foreground">Hiệu lực</dt>
                  <dd className="inline-flex items-center gap-1.5">
                    <CalendarDays className="size-3.5 text-muted-foreground" aria-hidden />
                    {selected.ngay_co_hieu_luc ? formatDate(selected.ngay_co_hieu_luc) : `${formatDate(selectedVb?.ngay_hieu_luc ?? null)} (theo văn bản)`}
                  </dd>
                  {(selected.primary_departments.length > 0 || selected.secondary_departments.length > 0) && (
                    <>
                      <dt className="text-muted-foreground">Phòng ban</dt>
                      <dd className="flex flex-wrap gap-x-3 gap-y-1">
                        {selected.primary_departments.map((d) => (
                          <span key={d} className="inline-flex items-center gap-1.5">
                            {deptLabel(d)} <AnhHuongBadge level="primary" />
                          </span>
                        ))}
                        {selected.secondary_departments.map((d) => (
                          <span key={d} className="inline-flex items-center gap-1.5">
                            {deptLabel(d)} <AnhHuongBadge level="secondary" />
                          </span>
                        ))}
                      </dd>
                    </>
                  )}
                  {(selected.dieu_kien_may_doc || LOAI_CO_DIEU_KIEN.includes(selected.loai_entity)) && (
                    <>
                      <dt className="text-muted-foreground">Điều kiện máy đọc</dt>
                      <dd className="space-y-2">
                        {editingDk ? (
                          <DieuKienEditor dict={dict} value={selected.dieu_kien_may_doc} onSave={saveDk} onCancel={() => setEditingDk(false)} saving={dkBusy} />
                        ) : (
                          <span className="flex flex-wrap items-center gap-2">
                            {selected.dieu_kien_may_doc ? (
                              formatDieuKien(selected.dieu_kien_may_doc, dict)
                            ) : (
                              <span className="text-muted-foreground">Chưa có — rule engine bỏ qua entity này khi đối chiếu</span>
                            )}
                            <Button size="xs" variant="outline" onClick={() => { setDkMsg(null); setEditingDk(true); }}>
                              <Pencil /> {selected.dieu_kien_may_doc ? "Sửa" : "Điền"}
                            </Button>
                          </span>
                        )}
                        {dkMsg && (
                          <p className={cn("text-xs", dkMsg.ok ? "text-muted-foreground" : "text-destructive")} role="status">
                            {dkMsg.text}{" "}
                            {dkMsg.ok && (
                              <Link href="/quet-lai" className="underline">
                                Mở Quét lại
                              </Link>
                            )}
                          </p>
                        )}
                      </dd>
                    </>
                  )}
                  <dt className="text-muted-foreground">Lần trích xuất</dt>
                  <dd>
                    <code className="text-xs">{selected.pipeline_run_id}</code> · <code className="text-xs">{selected.chunk_id}</code> ·{" "}
                    <code className="text-xs">{selected.ma_tam}</code>
                  </dd>
                  {selected.ghi_chu_curator && (
                    <>
                      <dt className="text-muted-foreground">Ghi chú curator</dt>
                      <dd>{selected.ghi_chu_curator}</dd>
                    </>
                  )}
                </dl>
                <div className="space-y-2">
                  <p className="font-medium">
                    Quan hệ <Badge variant="secondary">{edges.length}</Badge>
                  </p>
                  {edges.length === 0 ? (
                    <p className="text-muted-foreground">Chưa có quan hệ nào.</p>
                  ) : (
                    <ul className="space-y-2">
                      {edges.map((g) => (
                        <li key={g.relationship_id}>
                          <EdgeLine row={g} currentId={selected.id} showCanCu />
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
