"use client";

import { useMemo, useState } from "react";
import { CalendarDays, Search } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EdgeLine } from "@/components/nexora/edge-line";
import { AnhHuongBadge, LoaiEntityBadge } from "@/components/nexora/status-badges";
import { deptLabel, domainLabel, formatDate } from "@/lib/labels";
import type { Domain, Entity, EntityRelationship, LoaiEntity } from "@/lib/types";
import { cn } from "@/lib/utils";

type Props = {
  entities: Entity[]; // chỉ entity đã duyệt
  relationships: EntityRelationship[]; // chỉ quan hệ đã duyệt
  allEntities: Entity[]; // tra tên entity ở đầu kia của cạnh
};

const ALL = "all";

const LOAI_ITEMS: { value: LoaiEntity | typeof ALL; label: string }[] = [
  { value: ALL, label: "Tất cả loại" },
  { value: "hanh_vi", label: "Hành vi" },
  { value: "chu_the", label: "Chủ thể" },
  { value: "doi_tuong", label: "Đối tượng" },
  { value: "che_tai", label: "Chế tài" },
  { value: "dieu_kien", label: "Điều kiện" },
  { value: "muc_thue", label: "Mức thuế" },
  { value: "thoi_han", label: "Thời hạn" },
  { value: "mien_giam", label: "Miễn giảm" },
  { value: "nguong", label: "Ngưỡng" },
];

export function EntityLibrary({ entities, relationships, allEntities }: Props) {
  const [query, setQuery] = useState("");
  const [domain, setDomain] = useState<Domain | typeof ALL>(ALL);
  const [loai, setLoai] = useState<string>(ALL);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const entityName = (id: string) => allEntities.find((e) => e.id === id)?.ten_entity ?? id;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return entities.filter(
      (e) =>
        (domain === ALL || e.domain === domain) &&
        (loai === ALL || e.loai_entity === loai) &&
        (!q || [e.ten_entity, e.noi_dung_goc, e.dieu_khoan, e.mo_ta].some((s) => s.toLowerCase().includes(q))),
    );
  }, [entities, query, domain, loai]);

  const selected = entities.find((e) => e.id === selectedId) ?? null;
  const edges = selected
    ? relationships.filter((r) => r.source_entity_id === selected.id || r.target_entity_id === selected.id)
    : [];

  return (
    <div className="space-y-4">
      {/* Bộ lọc */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative sm:max-w-xs sm:flex-1">
          <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Tìm theo tên, điều khoản, nội dung…"
            className="pl-8"
            aria-label="Tìm entity"
          />
        </div>

        <div className="flex gap-1 rounded-lg bg-muted p-1" role="group" aria-label="Lọc theo lĩnh vực">
          {([ALL, "thue", "ke_toan"] as const).map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDomain(d)}
              aria-pressed={domain === d}
              className={cn(
                "rounded-md px-3 py-1 text-sm transition-colors",
                domain === d ? "bg-background font-medium shadow-sm" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {d === ALL ? "Tất cả" : domainLabel[d]}
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
              <TableHead>Lĩnh vực</TableHead>
              <TableHead>Điều khoản</TableHead>
              <TableHead>Hiệu lực</TableHead>
              <TableHead>Phòng ban chính</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((e) => (
              <TableRow key={e.id} className="cursor-pointer" onClick={() => setSelectedId(e.id)}>
                <TableCell className="max-w-xs">
                  {/* Nút thật để mở chi tiết bằng bàn phím */}
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
                <TableCell>{domainLabel[e.domain]}</TableCell>
                <TableCell className="text-muted-foreground">{e.dieu_khoan}</TableCell>
                <TableCell className="tabular-nums">{formatDate(e.ngay_co_hieu_luc)}</TableCell>
                <TableCell>{e.primary_departments.map(deptLabel).join(", ") || "—"}</TableCell>
              </TableRow>
            ))}
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
      <Sheet open={!!selected} onOpenChange={(open) => !open && setSelectedId(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle>{selected.ten_entity}</SheetTitle>
                <SheetDescription className="flex flex-wrap items-center gap-2">
                  <LoaiEntityBadge loai={selected.loai_entity} />
                  <span>{domainLabel[selected.domain]}</span>
                  <span aria-hidden>·</span>
                  <span>{selected.dieu_khoan}</span>
                </SheetDescription>
              </SheetHeader>

              <div className="space-y-5 px-4 pb-6 text-sm">
                <figure className="space-y-1">
                  <figcaption className="text-xs font-medium text-muted-foreground">
                    Trích nguyên văn · {selected.dieu_khoan}
                  </figcaption>
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
                    {formatDate(selected.ngay_co_hieu_luc)}
                  </dd>
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
                  <dt className="text-muted-foreground">Lần trích xuất</dt>
                  <dd>
                    <code className="text-xs">{selected.pipeline_run_id}</code> ·{" "}
                    <code className="text-xs">{selected.chunk_id}</code>
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
                    Quan hệ đã duyệt <Badge variant="secondary">{edges.length}</Badge>
                  </p>
                  {edges.length === 0 ? (
                    <p className="text-muted-foreground">Chưa có quan hệ nào được duyệt cho entity này.</p>
                  ) : (
                    <ul className="space-y-1.5">
                      {edges.map((r) => (
                        <li key={r.id}>
                          <EdgeLine rel={r} entityName={entityName} currentId={selected.id} />
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
