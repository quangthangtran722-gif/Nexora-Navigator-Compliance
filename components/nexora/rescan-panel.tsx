"use client";

import { useState } from "react";
import Link from "next/link";
import { RefreshCw, Sparkles } from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ErrorBlock, LoadingBlock } from "@/components/nexora/data-state";
import { ItemList, ItemRow } from "@/components/nexora/item-row";
import { ModelCell } from "@/components/nexora/pipeline-log";
import { ApDungBadge, RunBadge } from "@/components/nexora/status-badges";
import { formatDateTime, TRANG_THAI_AP_DUNG_LABEL } from "@/lib/labels";
import { combine, useErrorHandler } from "@/lib/data/errors";
import { generateAll, PipelineError, postPipeline, toAppError, type FilterKetQua } from "@/lib/data/pipeline";
import { getAllDiagnostics, getCustomers, getNganh, getPipelineRuns } from "@/lib/data/queries";
import { useQuery } from "@/lib/data/use-query";
import type { TrangThaiApDung } from "@/lib/types";

/*
 * Nút "Quét lại khách hàng hiện có" (CLAUDE.md mục 8) = POST /api/pipeline/rescan body {} → { run_ids }
 * (CONTRACT §7): chạy rule engine (KHÔNG AI) cho từng khách hàng, mỗi khách hàng 1 run filter_domain.
 * "Quét lại" từng hàng = POST /api/pipeline/filter cho riêng khách hàng đó — cùng logic rule engine.
 * Kết quả đọc lại từ pipeline_runs (lần filter_domain mới nhất của mỗi khách hàng). Không hiện run_id/UUID.
 * Palette v3 mục 9.10: nút từng hàng là nút phụ (outline), chỉ "Quét lại tất cả" là nút chính.
 */

const STATUSES: TrangThaiApDung[] = ["ap_dung", "sap_ap_dung", "chua_du_thong_tin", "khong_ap_dung"];

// 1 mục trong pipeline_runs.output.ket_qua của filter_domain (CONTRACT §7 — ghi chú triển khai)
type FilterTrace = FilterKetQua & {
  ten_entity?: string;
  so_hieu?: string;
  ly_do?: string;
  dieu_kien?: { ten_entity: string; dieu_kien_may_doc: { thuoc_tinh: string }; gia_tri_khach_hang?: unknown; ket_qua: boolean | null }[];
};

const LY_DO_LABEL: Record<string, string> = {
  ngoai_linh_vuc: "ngoài lĩnh vực khách hàng theo dõi",
  dieu_kien_khong_thoa: "có điều kiện không thoả",
  thieu_thong_tin: "hồ sơ còn thiếu dữ liệu",
  chua_den_ngay_hieu_luc: "chưa tới ngày hiệu lực",
  da_hieu_luc: "đã có hiệu lực, đủ điều kiện",
};

export function RescanPanel() {
  const [busyAll, setBusyAll] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null); // khách hàng đang quét riêng
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [generating, setGenerating] = useState<{ customerId: string; written: number } | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const handleError = useErrorHandler();
  const toMessage = (e: unknown, fallback: string) => (e instanceof PipelineError ? handleError(toAppError(e)) : null) ?? fallback;

  const res = useQuery(() => combine({ customers: getCustomers(), allRuns: getPipelineRuns(), diagnostics: getAllDiagnostics(), nganh: getNganh() }), []);
  if (res.loading) return <LoadingBlock />;
  if (res.error) return <ErrorBlock error={res.error} onRetry={res.reload} />;
  const { customers, allRuns, diagnostics, nganh } = res.data!;
  const lastFilter = (cid: string) => allRuns.find((r) => r.pipeline_name === "filter_domain" && r.customer_id === cid);
  const ketQuaOf = (cid: string) => ((lastFilter(cid)?.output as { ket_qua?: FilterTrace[] } | null)?.ket_qua ?? []) as FilterTrace[];
  const tenNganh = (ma: string | null) => (ma ? (nganh.find((n) => n.ma === ma)?.ten_hien_thi ?? ma) : "—");
  const running = busyAll || busyId !== null || generating !== null;

  async function rescanAll() {
    setBusyAll(true);
    setError(null);
    setDone(null);
    try {
      const out = await postPipeline("/api/pipeline/rescan", {});
      setDone(`Đã quét lại ${out.run_ids.length} khách hàng bằng rule engine.`);
    } catch (e) {
      setError(toMessage(e, "Quét lại thất bại."));
    }
    setBusyAll(false);
    res.reload();
  }

  async function rescanOne(customerId: string) {
    setBusyId(customerId);
    setError(null);
    setDone(null);
    try {
      await postPipeline("/api/pipeline/filter", { customer_id: customerId });
    } catch (e) {
      setError(toMessage(e, "Quét lại thất bại."));
    }
    setBusyId(null);
    res.reload();
  }

  // filter (rescan) KHÔNG tự gọi generate → checklist áp dụng mới cần AI viết nội dung.
  // generate xử lý tối đa 6 mục/lần → generateAll gọi lại tới khi so_diagnostic = 0.
  async function generate(customerId: string) {
    setGenerating({ customerId, written: 0 });
    setError(null);
    try {
      const out = await generateAll({ customer_id: customerId }, (_round, written) => setGenerating({ customerId, written }));
      setDone(`AI đã viết ${out.so_diagnostic} checklist — chờ người đầu mối của khách hàng duyệt.`);
    } catch (e) {
      setError(toMessage(e, "AI chưa viết được checklist."));
    }
    setGenerating(null);
    res.reload();
  }

  return (
    <div className="space-y-6">
      <section className="space-y-3" aria-labelledby="ds-kh">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="space-y-0.5">
            <h2 id="ds-kh" className="text-base font-semibold">
              {customers.length} khách hàng
            </h2>
            <p className="text-sm text-muted-foreground">Rule engine thuần code (không gọi AI) đối chiếu hồ sơ với kho entity đã duyệt. Dùng sau khi duyệt văn bản mới vào kho.</p>
          </div>
          <Button onClick={rescanAll} disabled={running}>
            <RefreshCw className={busyAll ? "animate-spin" : undefined} /> {busyAll ? "Đang quét…" : "Quét lại tất cả"}
          </Button>
        </div>

        {/* Tiến độ khi pipeline đang chạy (route không báo từng bước → thanh chạy không xác định) */}
        {running && (
          <div className="space-y-1.5" role="status">
            <p className="text-xs font-medium text-muted-foreground tabular-nums">
              {generating
                ? `AI đang viết checklist… đã xong ${generating.written}`
                : busyAll
                  ? `Đang quét ${customers.length} khách hàng…`
                  : `Đang quét ${customers.find((c) => c.id === busyId)?.ten_cong_ty ?? ""}…`}
            </p>
            <div className="h-1.5 overflow-hidden bg-border">
              <div className="h-full w-1/3 animate-pulse bg-gold-metal-flat" />
            </div>
          </div>
        )}
        {error && (
          <p className="bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">
            {error}
          </p>
        )}
        {done && !running && (
          <p className="text-sm text-duyet-da" role="status">
            {done}
          </p>
        )}

        <div className="border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Khách hàng</TableHead>
                <TableHead>Ngành</TableHead>
                <TableHead className="text-right">Nghĩa vụ</TableHead>
                <TableHead>Lần lọc gần nhất</TableHead>
                <TableHead className="text-right">Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {customers.map((c) => {
                const last = lastFilter(c.id);
                const ketQua = ketQuaOf(c.id);
                const apDung = ketQua.filter((k) => k.trang_thai_ap_dung === "ap_dung" || k.trang_thai_ap_dung === "sap_ap_dung").length;
                const choAi = diagnostics.filter(
                  (d) => d.customer_id === c.id && (d.trang_thai_ap_dung === "ap_dung" || d.trang_thai_ap_dung === "sap_ap_dung") && d.noi_dung_diagnostic === null,
                ).length;
                return (
                  <TableRow key={c.id}>
                    <TableCell className="min-w-44 font-medium whitespace-normal">{c.ten_cong_ty}</TableCell>
                    <TableCell className="min-w-28 whitespace-normal text-muted-foreground">{tenNganh(c.nganh)}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {!last ? (
                        "—"
                      ) : ketQua.length === 0 ? (
                        <span className="text-xs text-muted-foreground">Chưa có entity được duyệt</span>
                      ) : (
                        <>
                          <span className="font-semibold">{apDung}</span>
                          <span className="text-muted-foreground">/{ketQua.length} áp dụng</span>
                        </>
                      )}
                    </TableCell>
                    <TableCell>
                      {last ? (
                        <span className="flex flex-wrap items-center gap-2">
                          <RunBadge status={last.trang_thai} />
                          <span className="text-xs text-muted-foreground tabular-nums">{formatDateTime(last.started_at ?? last.created_at)}</span>
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">Chưa chạy</span>
                      )}
                    </TableCell>
                    <TableCell className="whitespace-normal">
                      <span className="flex flex-wrap justify-end gap-2">
                        {choAi > 0 && (
                          <Button size="sm" variant="outline" disabled={running} onClick={() => generate(c.id)}>
                            <Sparkles /> {generating?.customerId === c.id ? `Đang viết… (${generating.written})` : `AI viết ${choAi} checklist`}
                          </Button>
                        )}
                        <Button size="sm" variant="outline" disabled={running} onClick={() => rescanOne(c.id)}>
                          <RefreshCw className={busyId === c.id ? "animate-spin" : undefined} /> Quét lại
                        </Button>
                      </span>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <ModelCell model={null} />
          <Link href="/nhat-ky" className={buttonVariants({ variant: "link", size: "sm" })}>
            Xem trong nhật ký pipeline
          </Link>
        </div>
      </section>

      {/* Vì sao áp dụng / không áp dụng — đọc từ pipeline_runs.output (rule engine ở backend ghi lại) */}
      <section className="space-y-3" aria-labelledby="vi-sao">
        <h2 id="vi-sao" className="text-base font-semibold">
          Vì sao áp dụng / không áp dụng
        </h2>
        <ItemList>
          {customers.map((c) => {
            const ketQua = ketQuaOf(c.id);
            return (
              <ItemRow
                key={c.id}
                title={c.ten_cong_ty}
                hint={
                  ketQua.length
                    ? STATUSES.map((s) => `${ketQua.filter((k) => k.trang_thai_ap_dung === s).length} ${TRANG_THAI_AP_DUNG_LABEL[s].toLowerCase()}`).join(" · ")
                    : "Chưa có kết quả lọc"
                }
                open={openId === c.id}
                onToggle={() => setOpenId((cur) => (cur === c.id ? null : c.id))}
              >
                {ketQua.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Chưa có entity được duyệt để đối chiếu.</p>
                ) : (
                  <ul className="grid gap-3 sm:grid-cols-2">
                    {ketQua.map((k) => (
                      <li key={k.entity_id} className="space-y-0.5 text-xs">
                        <span className="flex flex-wrap items-center gap-1.5">
                          <ApDungBadge status={k.trang_thai_ap_dung} />
                          <span className="font-medium">{k.ten_entity ?? "Nghĩa vụ"}</span>
                        </span>
                        {k.ly_do && <span className="block text-muted-foreground">Lý do: {LY_DO_LABEL[k.ly_do] ?? k.ly_do}</span>}
                        {(k.dieu_kien ?? []).map((dk, i) => (
                          <span key={i} className="block text-muted-foreground">
                            {dk.ket_qua === true ? "Đạt" : dk.ket_qua === false ? "Không đạt" : "Thiếu dữ liệu"}: {dk.ten_entity} — hồ sơ khai{" "}
                            {dk.gia_tri_khach_hang === undefined || dk.gia_tri_khach_hang === null ? "chưa có" : String(dk.gia_tri_khach_hang)}
                          </span>
                        ))}
                      </li>
                    ))}
                  </ul>
                )}
              </ItemRow>
            );
          })}
        </ItemList>
      </section>

      <details className="border bg-card p-4 text-sm">
        <summary className="cursor-pointer font-medium">Rule engine quyết định thế nào?</summary>
        <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-muted-foreground">
          <li>Chỉ xét entity <em>hành vi</em> đã duyệt, thuộc văn bản đang hiệu lực. Lĩnh vực không nằm trong lĩnh vực khách hàng theo dõi → Không áp dụng.</li>
          <li>Điều kiện = các điều kiện/ngưỡng đã duyệt nối vào hành vi, cộng chủ thể đã duyệt mà hành vi áp dụng cho (có điều kiện máy đọc). Tất cả nối bằng VÀ.</li>
          <li>Có điều kiện sai → Không áp dụng. Không sai nhưng hồ sơ thiếu dữ liệu → Chưa đủ thông tin (hỏi bổ sung).</li>
          <li>Đủ điều kiện: ngày hiệu lực (của entity, hoặc của văn bản) sau hôm nay → Sắp áp dụng, ngược lại → Áp dụng.</li>
          <li>Giao checklist cho phòng có mã thuộc phòng ban chính của entity; không có → Ban Giám đốc; không có cả Ban Giám đốc → không tạo.</li>
        </ol>
      </details>
    </div>
  );
}
