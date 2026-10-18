"use client";

import { useState } from "react";
import { CalendarDays, CheckCheck, FileText, Pencil, TriangleAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { DieuKienEditor } from "@/components/nexora/dieu-kien-editor";
import { EdgeLine } from "@/components/nexora/edge-line";
import { AnhHuongBadge, ChunkBadge, DuyetBadge, LoaiEntityBadge } from "@/components/nexora/status-badges";
import { deptLabel, domainLabel, formatDate } from "@/lib/labels";
import { getChunks, getEntities, getEntityGraph, getNerExtractionSummary, getThuocTinhHoSo, getVanBanList } from "@/lib/mock";
import { rpc, thieuDieuKienMayDoc } from "@/lib/mock/rpc";
import { updateEntity } from "@/lib/mock/tables";
import { formatDieuKien } from "@/lib/thuoc-tinh-format";
import type { DieuKienMayDoc, Entity, EntityGraphRow, NerExtractionSummary, ThuocTinhHoSo } from "@/lib/types";

/*
 * Curator duyệt bản nháp theo chunk (view ner_extraction_summary).
 * Duyệt dùng đúng 2 RPC của CONTRACT §5: approve_entity (từng entity), approve_chunk (cả chunk).
 * dieu_kien / nguong phải có dieu_kien_may_doc trước khi duyệt — curator điền bằng DieuKienEditor.
 */

const CO_DIEU_KIEN = ["dieu_kien", "nguong", "chu_the"];

export function DraftReview() {
  const [, setVersion] = useState(0);
  const refresh = () => setVersion((v) => v + 1);

  // Chunk đang chờ duyệt lúc mở màn — giữ hiển thị cả khi đã duyệt xong trong phiên
  const [shownChunkIds] = useState(() => getNerExtractionSummary().filter((s) => s.trang_thai_chunk === "da_trich_xuat").map((s) => s.chunk_id));

  const summaries = getNerExtractionSummary().filter((s) => shownChunkIds.includes(s.chunk_id));
  const chunks = getChunks();
  const vanBan = getVanBanList();
  const entities = getEntities();
  const graph = getEntityGraph();
  const dict = getThuocTinhHoSo();

  if (summaries.length === 0) {
    return <p className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">Không có chunk nào đang chờ duyệt.</p>;
  }

  return (
    <div className="space-y-8">
      {summaries.map((s) => {
        const chunk = chunks.find((c) => c.id === s.chunk_id)!;
        const vb = vanBan.find((v) => v.id === s.van_ban_id)!;
        const items = entities.filter((e) => e.chunk_id === s.chunk_id);
        return (
          <section key={s.chunk_id} className="space-y-3">
            <ChunkHeader
              title={`${vb.so_hieu} · Chunk ${s.thu_tu}${s.dieu_khoan_range ? ` · ${s.dieu_khoan_range}` : ""}`}
              subtitle={vb.ten_van_ban}
              noiDung={chunk.noi_dung}
              summary={s}
              onApproved={refresh}
            />
            <div className="grid gap-4 xl:grid-cols-2">
              {items.map((e) => (
                <EntityReviewCard
                  key={e.id}
                  entity={e}
                  edges={graph.filter((g) => g.source_id === e.id || g.target_id === e.id)}
                  dict={dict}
                  ngayHieuLucVanBan={vb.ngay_hieu_luc}
                  onChanged={refresh}
                />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

/* ---------- Đầu mỗi chunk: thống kê + approve_chunk ---------- */

function ChunkHeader({
  title,
  subtitle,
  noiDung,
  summary: s,
  onApproved,
}: {
  title: string;
  subtitle: string;
  noiDung: string;
  summary: NerExtractionSummary;
  onApproved: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const blocked = s.so_dieu_kien_chua_may_doc > 0;

  async function approveChunk() {
    setBusy(true);
    const { data, error } = await rpc("approve_chunk", { p_chunk_id: s.chunk_id });
    setBusy(false);
    setMsg(error ? { ok: false, text: error.message } : { ok: true, text: `Đã duyệt ${data} entity.` });
    onApproved();
  }

  return (
    <div className="space-y-2 rounded-xl border bg-muted/30 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-0.5">
          <h2 className="flex flex-wrap items-center gap-2 font-semibold">
            {title} <ChunkBadge status={s.trang_thai_chunk} />
          </h2>
          <p className="text-sm text-muted-foreground">{subtitle}</p>
          <p className="text-xs text-muted-foreground tabular-nums">
            {s.so_entity} entity · {s.so_cho_duyet} chờ duyệt · {s.so_da_duyet} đã duyệt · {s.so_tu_choi} từ chối · {s.so_relationship} quan hệ
            {s.so_pending_link > 0 && ` (${s.so_pending_link} chờ nối)`}
          </p>
        </div>
        <Button onClick={approveChunk} disabled={busy || blocked || s.so_cho_duyet === 0}>
          <CheckCheck /> Duyệt tất cả còn lại ({s.so_cho_duyet})
        </Button>
      </div>
      {blocked && (
        <p className="flex items-center gap-1.5 text-xs text-status-ap-dung">
          <TriangleAlert className="size-3.5" aria-hidden /> Còn {s.so_dieu_kien_chua_may_doc} điều kiện/ngưỡng chưa có điều kiện máy đọc — điền xong mới duyệt cả chunk được.
        </p>
      )}
      {msg && (
        <p className={msg.ok ? "text-xs text-duyet-da" : "text-xs text-destructive"} role="status">
          {msg.text}
        </p>
      )}
      <details className="text-sm">
        <summary className="inline-flex cursor-pointer items-center gap-1.5 text-muted-foreground">
          <FileText className="size-3.5" aria-hidden /> Xem văn bản gốc của chunk
        </summary>
        <p className="mt-2 rounded-lg border bg-background p-3 whitespace-pre-wrap">{noiDung}</p>
      </details>
    </div>
  );
}

/* ---------- 1 entity bản nháp ---------- */

function EntityReviewCard({
  entity: e,
  edges,
  dict,
  ngayHieuLucVanBan,
  onChanged,
}: {
  entity: Entity;
  edges: EntityGraphRow[];
  dict: ThuocTinhHoSo[];
  ngayHieuLucVanBan: string;
  onChanged: () => void;
}) {
  const [editingDk, setEditingDk] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [ghiChu, setGhiChu] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const locked = e.trang_thai_duyet !== "cho_duyet";
  const missingDk = thieuDieuKienMayDoc(e);

  async function decide(quyet_dinh: "da_duyet" | "tu_choi") {
    setBusy(true);
    const { error } = await rpc("approve_entity", { p_entity_id: e.id, p_quyet_dinh: quyet_dinh, p_ghi_chu: ghiChu.trim() || undefined });
    setBusy(false);
    setError(error?.message ?? null);
    if (!error) setRejecting(false);
    onChanged();
  }

  async function saveDk(dk: DieuKienMayDoc) {
    setBusy(true);
    const { error } = await updateEntity(e.id, { dieu_kien_may_doc: dk });
    setBusy(false);
    setError(error?.message ?? null);
    if (!error) setEditingDk(false);
    onChanged();
  }

  return (
    <Card className={missingDk && !locked ? "ring-2 ring-status-ap-dung/40" : undefined}>
      <CardHeader>
        <CardTitle className="text-base">{e.ten_entity}</CardTitle>
        <CardDescription className="flex flex-wrap items-center gap-2">
          <LoaiEntityBadge loai={e.loai_entity} />
          <span>{domainLabel(e.domain)}</span>
          <span aria-hidden>·</span>
          <span>{e.dieu_khoan}</span>
          <code className="text-xs">{e.ma_tam}</code>
        </CardDescription>
        <CardAction>
          <DuyetBadge status={e.trang_thai_duyet} />
        </CardAction>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Câu gốc trước, nổi bật — curator so với phần AI mô tả */}
        <figure className="space-y-1">
          <figcaption className="text-xs font-medium text-muted-foreground">Trích nguyên văn · {e.dieu_khoan} (không sửa được)</figcaption>
          <blockquote className="border-l-4 border-primary/40 bg-muted/50 px-3 py-2 text-sm">{e.noi_dung_goc}</blockquote>
        </figure>
        <p className="text-sm">
          <span className="text-muted-foreground">AI mô tả: </span>
          {e.mo_ta}
        </p>

        <dl className="grid gap-2 text-sm sm:grid-cols-[auto_1fr] sm:gap-x-4">
          {(e.primary_departments.length > 0 || e.secondary_departments.length > 0) && (
            <>
              <dt className="text-muted-foreground">Phòng ban</dt>
              <dd className="flex flex-wrap gap-x-3 gap-y-1">
                {e.primary_departments.map((d) => (
                  <span key={d} className="inline-flex items-center gap-1.5">
                    {deptLabel(d)} <AnhHuongBadge level="primary" />
                  </span>
                ))}
                {e.secondary_departments.map((d) => (
                  <span key={d} className="inline-flex items-center gap-1.5">
                    {deptLabel(d)} <AnhHuongBadge level="secondary" />
                  </span>
                ))}
              </dd>
            </>
          )}
          <dt className="text-muted-foreground">Hiệu lực</dt>
          <dd className="inline-flex items-center gap-1.5">
            <CalendarDays className="size-3.5 text-muted-foreground" aria-hidden />
            {e.ngay_co_hieu_luc ? formatDate(e.ngay_co_hieu_luc) : `${formatDate(ngayHieuLucVanBan)} (theo văn bản)`}
          </dd>
        </dl>

        {/* Điều kiện máy đọc — chỉ dieu_kien / nguong / chu_the */}
        {CO_DIEU_KIEN.includes(e.loai_entity) && (
          <div className="space-y-2 rounded-lg border p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-medium text-muted-foreground">
                Điều kiện máy đọc {e.loai_entity === "chu_the" ? "(không bắt buộc)" : "(bắt buộc khi duyệt)"}
              </p>
              {!locked && !editingDk && (
                <Button size="xs" variant="outline" onClick={() => setEditingDk(true)}>
                  <Pencil /> {e.dieu_kien_may_doc ? "Sửa" : "Điền"}
                </Button>
              )}
            </div>
            {editingDk ? (
              <DieuKienEditor dict={dict} value={e.dieu_kien_may_doc} onSave={saveDk} onCancel={() => setEditingDk(false)} saving={busy} />
            ) : e.dieu_kien_may_doc ? (
              <p className="text-sm">
                {formatDieuKien(e.dieu_kien_may_doc, dict)}
                <code className="mt-1 block text-xs break-all text-muted-foreground">{JSON.stringify(e.dieu_kien_may_doc)}</code>
              </p>
            ) : (
              <p className={missingDk ? "text-sm text-status-ap-dung" : "text-sm text-muted-foreground"}>
                {missingDk ? "Chưa có — cần điền trước khi duyệt." : "Chưa có."}
              </p>
            )}
          </div>
        )}

        {edges.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground">Quan hệ ({edges.length})</p>
            <ul className="space-y-2">
              {edges.map((g) => (
                <li key={g.relationship_id}>
                  <EdgeLine row={g} currentId={e.id} showCanCu />
                </li>
              ))}
            </ul>
          </div>
        )}

        {error && (
          <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">
            {error}
          </p>
        )}

        {!locked && (
          <div className="flex flex-wrap items-center gap-2 border-t pt-3">
            {rejecting ? (
              <>
                <Input value={ghiChu} onChange={(ev) => setGhiChu(ev.target.value)} placeholder="Lý do từ chối (không bắt buộc)" className="h-8 flex-1 sm:max-w-xs" aria-label="Lý do từ chối" />
                <Button size="sm" variant="destructive" disabled={busy} onClick={() => decide("tu_choi")}>
                  Xác nhận từ chối
                </Button>
                <Button size="sm" variant="ghost" disabled={busy} onClick={() => setRejecting(false)}>
                  Huỷ
                </Button>
              </>
            ) : (
              <>
                <Button size="sm" disabled={busy || missingDk} onClick={() => decide("da_duyet")}>
                  Duyệt
                </Button>
                <Button size="sm" variant="destructive" disabled={busy} onClick={() => setRejecting(true)}>
                  Từ chối
                </Button>
              </>
            )}
          </div>
        )}
        {locked && e.ghi_chu_curator && <p className="text-xs text-muted-foreground">Ghi chú: {e.ghi_chu_curator}</p>}
      </CardContent>
    </Card>
  );
}
