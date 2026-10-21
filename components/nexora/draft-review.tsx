"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { CheckCheck, Pencil, TriangleAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { ErrorBlock, LoadingBlock } from "@/components/nexora/data-state";
import { DieuKienEditor } from "@/components/nexora/dieu-kien-editor";
import { EdgeLine } from "@/components/nexora/edge-line";
import { GroupHeader } from "@/components/nexora/group-header";
import { InsetBlock } from "@/components/nexora/inset-block";
import { ItemActions, ItemList, ItemMeta, ItemRow } from "@/components/nexora/item-row";
import { ProgressBar } from "@/components/nexora/progress";
import { AnhHuongBadge, DuyetBadge, LoaiEntityBadge, VanBanBadge } from "@/components/nexora/status-badges";
import { TabBar } from "@/components/nexora/tab-bar";
import { deptLabel, domainLabel, formatDate } from "@/lib/labels";
import { COPY } from "@/lib/copy";
import { combine, useErrorHandler } from "@/lib/data/errors";
import { updateEntity } from "@/lib/data/mutations";
import { getChunks, getEntities, getEntityGraph, getNerExtractionSummary, getThuocTinhHoSo, getVanBanList } from "@/lib/data/queries";
import { rpc } from "@/lib/data/rpc";
import { useQuery } from "@/lib/data/use-query";
import { chuTheChuaDieuKien, thieuDieuKienMayDoc } from "@/lib/entity-rules";
import { formatDieuKien } from "@/lib/thuoc-tinh-format";
import type { DieuKienMayDoc, Entity, EntityGraphRow, NerExtractionSummary, ThuocTinhHoSo } from "@/lib/types";
import { cn } from "@/lib/utils";

/*
 * Curator duyệt bản nháp theo chunk (view ner_extraction_summary).
 * Duyệt dùng đúng 2 RPC của CONTRACT §5: approve_entity (từng entity), approve_chunk (cả chunk).
 * dieu_kien / nguong phải có dieu_kien_may_doc trước khi duyệt — curator điền bằng DieuKienEditor.
 * Bố cục (palette v3 mục 9.10): TabBar chọn chunk · trái: GroupHeader văn bản + chunk, văn bản gốc (InsetBlock tô đoạn
 * được trích) · phải: ProgressBar + ItemRow entity thu gọn, chỉ mở 1 entity; mở entity nào thì tô đoạn trích của nó.
 */

const CO_DIEU_KIEN = ["dieu_kien", "nguong", "chu_the"];

// So khớp đoạn trích với đoạn văn gốc: bỏ khoảng trắng thừa, lấy 40 ký tự đầu của câu trích
const norm = (s: string) => s.replace(/\s+/g, " ").trim();

export function DraftReview() {
  const q = useQuery(
    () =>
      combine({
        summaries: getNerExtractionSummary(),
        chunks: getChunks(),
        vanBan: getVanBanList(),
        entities: getEntities(),
        graph: getEntityGraph(),
        dict: getThuocTinhHoSo(),
      }),
    [],
  );
  const refresh = q.reload;
  // Chunk vừa duyệt xong trong phiên vẫn giữ hiển thị (để thấy kết quả "Hoàn tất")
  const [touchedChunkIds, setTouched] = useState<string[]>([]);
  const [chunkTab, setChunkTab] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const touch = (chunkId: string) => {
    setTouched((t) => (t.includes(chunkId) ? t : [...t, chunkId]));
    refresh();
  };

  if (q.loading) return <LoadingBlock />;
  if (q.error) return <ErrorBlock error={q.error} onRetry={refresh} />;
  const { chunks, vanBan, entities, graph, dict } = q.data!;
  const summaries = q.data!.summaries.filter((s) => s.trang_thai_chunk === "da_trich_xuat" || touchedChunkIds.includes(s.chunk_id));

  if (summaries.length === 0) {
    return <p className="border bg-card px-4 py-10 text-center text-sm text-muted-foreground">Không có phần văn bản nào đang chờ kiểm duyệt.</p>;
  }

  const current = summaries.find((s) => s.chunk_id === chunkTab) ?? summaries[0];
  const chunk = chunks.find((c) => c.id === current.chunk_id);
  const vb = vanBan.find((v) => v.id === current.van_ban_id);
  const items = entities.filter((e) => e.chunk_id === current.chunk_id);
  const opened = items.find((e) => e.id === openId);
  // Tính trên MỌI chunk của văn bản (kể cả chunk đã duyệt xong, không còn trong danh sách tab)
  const conChoDuyetCuaVanBan = q.data!.summaries.filter((s) => s.van_ban_id === current.van_ban_id).reduce((n, s) => n + s.so_cho_duyet, 0);

  return (
    <TabBar
      label="Chọn phần văn bản"
      value={current.chunk_id}
      onValueChange={(v) => {
        setChunkTab(v);
        setOpenId(null);
      }}
      items={summaries.map((s) => ({
        value: s.chunk_id,
        label: `${vanBan.find((v) => v.id === s.van_ban_id)?.so_hieu ?? ""} · ${COPY.term.phan} ${s.thu_tu}${s.dieu_khoan_range ? ` · ${s.dieu_khoan_range}` : ""}`,
        count: s.so_cho_duyet,
        countTone: "action",
      }))}
    >
      {chunk && vb && (
        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
          {/* Trái: văn bản gốc của chunk */}
          <section className="lg:sticky lg:top-20" aria-labelledby="chunk-title">
            <GroupHeader
              id="chunk-title"
              title={`${COPY.term.phan} ${current.thu_tu}${current.dieu_khoan_range ? ` · ${current.dieu_khoan_range}` : ""}`}
              subtitle={`${vb.ten_van_ban} · hiệu lực ${formatDate(vb.ngay_hieu_luc)}`}
              counts={[
                { label: "chờ duyệt", n: current.so_cho_duyet, tone: "action" },
                { label: "đã duyệt", n: current.so_da_duyet },
              ]}
            >
              <VanBanBadge status={vb.trang_thai} />
            </GroupHeader>
            <ChunkText noiDung={chunk.noi_dung} highlight={opened?.noi_dung_goc} />
          </section>

          {/* Phải: entity của chunk */}
          <section className="space-y-4" aria-label="Mục trích xuất">
            <ChunkActions summary={current} onApproved={() => touch(current.chunk_id)} />
            {/* Duyệt hết entity của cả văn bản mà văn bản còn Bản nháp → nhắc kích hoạt (rule engine chỉ đọc văn bản active) */}
            {vb.trang_thai === "draft" && conChoDuyetCuaVanBan === 0 && (
              <p className="flex flex-wrap items-center gap-x-2 border-l-[3px] border-gold-edge bg-accent px-3 py-2.5 text-sm" role="status">
                Đã duyệt hết các mục của văn bản này nhưng văn bản vẫn là Bản nháp nên chưa dùng để xác định nghĩa vụ.
                <Link href="/nhap-van-ban#cho-kich-hoat" className="font-medium text-gold-text underline-offset-4 hover:underline">
                  Sang trang Nhập văn bản để kích hoạt
                </Link>
              </p>
            )}
            <ItemList>
              {items.map((e) => (
                <EntityRow
                  key={e.id}
                  entity={e}
                  edges={graph.filter((g) => g.source_id === e.id || g.target_id === e.id)}
                  dict={dict}
                  ngayHieuLucVanBan={vb.ngay_hieu_luc}
                  open={openId === e.id}
                  onToggle={() => setOpenId((cur) => (cur === e.id ? null : e.id))}
                  onChanged={() => touch(e.chunk_id)}
                />
              ))}
            </ItemList>
          </section>
        </div>
      )}
    </TabBar>
  );
}

/* ---------- Văn bản gốc: mỗi đoạn 1 khối, đoạn chứa câu trích của entity đang mở được tô (InsetBlock) ---------- */

function ChunkText({ noiDung, highlight }: { noiDung: string; highlight?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const key = highlight ? norm(highlight).slice(0, 40) : "";
  const paras = noiDung.split(/\n+/).filter((p) => p.trim());

  // Mở entity khác → cuộn đoạn được tô vào khung nhìn (chỉ trong cột trái)
  useEffect(() => {
    ref.current?.querySelector("[data-hl='true']")?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [key]);

  return (
    <div ref={ref} className="max-h-[70vh] space-y-2 overflow-y-auto border-x border-b bg-card p-4 text-sm leading-relaxed">
      {paras.map((p, i) => {
        const hl = !!key && norm(p).includes(key);
        return hl ? (
          <InsetBlock key={i} as="p" data-hl="true">
            {p}
          </InsetBlock>
        ) : (
          <p key={i} className="px-3">
            {p}
          </p>
        );
      })}
    </div>
  );
}

/* ---------- Tiến độ duyệt + approve_chunk ---------- */

function ChunkActions({ summary: s, onApproved }: { summary: NerExtractionSummary; onApproved: () => void }) {
  const [busy, setBusy] = useState(false);
  const handleError = useErrorHandler();
  const [forbidden, setForbidden] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const daXuLy = s.so_da_duyet + s.so_tu_choi;
  // Duyệt tất cả bỏ qua entity cần điều kiện mà chưa có (dieu_kien/nguong/chu_the) — curator xử lý riêng từng cái
  const boQua = s.so_can_dieu_kien;

  async function approveChunk() {
    setBusy(true);
    const { data, error } = await rpc("approve_chunk", { p_chunk_id: s.chunk_id });
    setBusy(false);
    setMsg(error ? { ok: false, text: handleError(error, { onReload: onApproved, onForbidden: () => setForbidden(true) })! } : { ok: true, text: `Đã duyệt ${data} mục.${boQua ? ` Bỏ qua ${boQua} mục cần điều kiện áp dụng — duyệt riêng từng mục.` : ""}` });
    onApproved();
  }

  return (
    <div className="space-y-3 border bg-card p-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <ProgressBar
          className="min-w-48 flex-1"
          label={`Đã kiểm duyệt ${s.so_da_duyet}/${s.so_entity} mục${s.so_tu_choi ? ` · ${s.so_tu_choi} từ chối` : ""}`}
          value={daXuLy}
          max={s.so_entity}
        />
        {!forbidden && (
          <Button onClick={approveChunk} disabled={busy || s.so_cho_duyet - boQua <= 0}>
            <CheckCheck /> Duyệt tất cả mục còn lại ({s.so_cho_duyet - boQua})
          </Button>
        )}
      </div>
      {boQua > 0 && (
        <p className="flex items-center gap-1.5 text-xs text-status-ap-dung">
          <TriangleAlert className="size-3.5" aria-hidden /> {boQua} mục chủ thể/điều kiện/ngưỡng chưa có điều kiện áp dụng — &quot;Duyệt tất cả&quot; sẽ bỏ qua; điền điều kiện (hoặc xác nhận chủ thể chung) rồi duyệt riêng.
        </p>
      )}
      {msg && (
        <p className={msg.ok ? "text-xs text-duyet-da" : "text-xs text-destructive"} role="status">
          {msg.text}
        </p>
      )}
    </div>
  );
}

/* ---------- 1 entity bản nháp ---------- */

function EntityRow({
  entity: e,
  edges,
  dict,
  ngayHieuLucVanBan,
  open,
  onToggle,
  onChanged,
}: {
  entity: Entity;
  edges: EntityGraphRow[];
  dict: ThuocTinhHoSo[];
  ngayHieuLucVanBan: string;
  open: boolean;
  onToggle: () => void;
  onChanged: () => void;
}) {
  const [editingDk, setEditingDk] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [ghiChu, setGhiChu] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [forbidden, setForbidden] = useState(false);
  const handleError = useErrorHandler();

  const locked = e.trang_thai_duyet !== "cho_duyet";
  const missingDk = thieuDieuKienMayDoc(e);
  const chuTheChung = chuTheChuaDieuKien(e);
  const [xacNhanChung, setXacNhanChung] = useState(false);

  async function decide(quyet_dinh: "da_duyet" | "tu_choi") {
    setBusy(true);
    const { error } = await rpc("approve_entity", {
      p_entity_id: e.id,
      p_quyet_dinh: quyet_dinh,
      p_ghi_chu: ghiChu.trim() || undefined,
      p_ap_dung_moi_doanh_nghiep: quyet_dinh === "da_duyet" && chuTheChung ? true : undefined,
    });
    setBusy(false);
    setError(handleError(error, { onReload: onChanged, onForbidden: () => setForbidden(true) }));
    if (!error) setRejecting(false);
    onChanged();
  }

  async function saveDk(dk: DieuKienMayDoc) {
    setBusy(true);
    const { error } = await updateEntity(e.id, { dieu_kien_may_doc: dk });
    setBusy(false);
    setError(handleError(error, { onReload: onChanged, onForbidden: () => setForbidden(true) }));
    if (!error) setEditingDk(false);
    onChanged();
  }

  return (
    <ItemRow
      title={e.ten_entity}
      hint={!locked ? (missingDk ? "Cần điền điều kiện áp dụng trước khi duyệt." : chuTheChung ? "Chưa có điều kiện áp dụng — cần xác nhận áp dụng cho mọi doanh nghiệp." : undefined) : undefined}
      open={open}
      onToggle={onToggle}
      // Thu gọn: chỉ 1 badge (trạng thái duyệt); loại entity nằm ở dòng meta khi mở
      right={<DuyetBadge context="kiem-duyet" status={e.trang_thai_duyet} />}
    >
      <ItemMeta>
        <LoaiEntityBadge loai={e.loai_entity} />
        <span>{domainLabel(e.domain)}</span>
        <span aria-hidden>·</span>
        <span>{e.dieu_khoan}</span>
        <span aria-hidden>·</span>
        <span>Hiệu lực {e.ngay_co_hieu_luc ? formatDate(e.ngay_co_hieu_luc) : `${formatDate(ngayHieuLucVanBan)} (theo văn bản)`}</span>
      </ItemMeta>

      {/* Câu gốc trước — curator so với phần AI mô tả; cùng đoạn được tô bên văn bản gốc */}
      <figure className="space-y-1">
        <figcaption className="text-xs font-medium text-muted-foreground">{COPY.term.trichNguyenVan}</figcaption>
        <InsetBlock as="blockquote">{e.noi_dung_goc}</InsetBlock>
      </figure>
      <p className="text-sm">
        <span className="text-muted-foreground">{COPY.term.tomTat}: </span>
        {e.mo_ta}
      </p>

      {(e.primary_departments.length > 0 || e.secondary_departments.length > 0) && (
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
          <span className="text-muted-foreground">Phòng ban:</span>
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
        </p>
      )}

      {/* Điều kiện máy đọc — chỉ dieu_kien / nguong / chu_the */}
      {CO_DIEU_KIEN.includes(e.loai_entity) && (
        <div className="space-y-2 border p-3">
          <div>
            <p className="text-xs font-medium text-muted-foreground">
              {COPY.term.dieuKien} {e.loai_entity === "chu_the" ? "(điền, hoặc xác nhận áp dụng chung)" : "(bắt buộc khi duyệt)"}
            </p>
            <p className="text-xs text-muted-foreground">Dùng để xác định khách hàng nào phải tuân thủ mục này.</p>
          </div>
          {editingDk ? (
            <DieuKienEditor dict={dict} value={e.dieu_kien_may_doc} onSave={saveDk} onCancel={() => setEditingDk(false)} saving={busy} />
          ) : e.dieu_kien_may_doc ? (
            <p className="text-sm">{formatDieuKien(e.dieu_kien_may_doc, dict)}</p>
          ) : (
            <p className={cn("text-sm", missingDk ? "text-destructive" : chuTheChung ? "text-status-ap-dung" : "text-muted-foreground")}>
              {missingDk
                ? "Cần điền điều kiện áp dụng trước khi duyệt."
                : chuTheChung
                  ? "Chưa có — mọi nghĩa vụ gắn với chủ thể này sẽ áp dụng cho MỌI doanh nghiệp."
                  : "Chưa có."}
            </p>
          )}
        </div>
      )}

      {edges.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground">{COPY.term.lienKet} ({edges.length})</p>
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
        <p className="bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      {!locked && !forbidden && !editingDk && (
        <ItemActions>
          {rejecting ? (
            <>
              <Input value={ghiChu} onChange={(ev) => setGhiChu(ev.target.value)} placeholder="Lý do từ chối (không bắt buộc)" className="mr-auto w-full sm:w-auto sm:flex-1" aria-label="Lý do từ chối" />
              <Button size="sm" variant="outline" disabled={busy} onClick={() => setRejecting(false)}>
                Huỷ
              </Button>
              <Button size="sm" variant="destructive" disabled={busy} onClick={() => decide("tu_choi")}>
                Xác nhận từ chối
              </Button>
            </>
          ) : (
            <>
              {CO_DIEU_KIEN.includes(e.loai_entity) && (
                <Button size="sm" variant="outline" className="mr-auto" onClick={() => setEditingDk(true)}>
                  <Pencil /> {e.dieu_kien_may_doc ? "Sửa điều kiện" : "Điền điều kiện"}
                </Button>
              )}
              <Button size="sm" variant="outline" disabled={busy} onClick={() => setRejecting(true)}>
                Từ chối
              </Button>
              {chuTheChung && (
                <label className="flex w-full items-center gap-2 text-sm">
                  <Checkbox checked={xacNhanChung} onCheckedChange={(v) => setXacNhanChung(v === true)} />
                  Chủ thể chung — áp dụng cho mọi doanh nghiệp (không cần điều kiện)
                </label>
              )}
              <Button size="sm" disabled={busy || missingDk || (chuTheChung && !xacNhanChung)} onClick={() => decide("da_duyet")}>
                Duyệt
              </Button>
            </>
          )}
        </ItemActions>
      )}
      {locked && e.ghi_chu_curator && <p className="text-xs text-muted-foreground">Ghi chú: {e.ghi_chu_curator}</p>}
    </ItemRow>
  );
}
