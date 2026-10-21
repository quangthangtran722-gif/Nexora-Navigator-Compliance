"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown, History, ListChecks, RefreshCw } from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ErrorBlock, LoadingBlock } from "@/components/nexora/data-state";
import { ItemList, ItemRow } from "@/components/nexora/item-row";
import { SoLieu } from "@/components/nexora/so-lieu";
import { ApDungBadge, RunBadge } from "@/components/nexora/status-badges";
import { COPY } from "@/lib/copy";
import { formatDateTime, TRANG_THAI_AP_DUNG_LABEL } from "@/lib/labels";
import { combine, useErrorHandler } from "@/lib/data/errors";
import { generateAll, PipelineError, postPipeline, toAppError, type FilterKetQua } from "@/lib/data/pipeline";
import { getAllDiagnostics, getCustomers, getNganh, getPipelineRuns, getThuocTinhHoSo } from "@/lib/data/queries";
import { formatGiaTri, type GiaTriThuocTinh } from "@/lib/thuoc-tinh-format";
import { useQuery } from "@/lib/data/use-query";
import type { TrangThaiApDung } from "@/lib/types";

/*
 * Nút "Quét lại khách hàng hiện có" (CLAUDE.md mục 8) = POST /api/pipeline/rescan body {} → { run_ids }
 * (CONTRACT §7): chạy rule engine (KHÔNG AI) cho từng khách hàng, mỗi khách hàng 1 run filter_domain.
 * "Quét lại" từng hàng = POST /api/pipeline/filter cho riêng khách hàng đó — cùng logic rule engine.
 * Kết quả đọc lại từ pipeline_runs (lần filter_domain mới nhất của mỗi khách hàng). Không hiện run_id/UUID.
 * Palette v3 mục 9.10 + team chốt 20/10: mỗi hàng 1 nút phụ "Thao tác" (menu), chỉ "Quét lại tất cả" là nút chính.
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
  thieu_thong_tin: "hồ sơ còn thiếu thông tin",
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

  const res = useQuery(
    () => combine({ customers: getCustomers(), allRuns: getPipelineRuns(), diagnostics: getAllDiagnostics(), nganh: getNganh(), dict: getThuocTinhHoSo() }),
    [],
  );
  if (res.loading) return <LoadingBlock />;
  if (res.error) return <ErrorBlock error={res.error} onRetry={res.reload} />;
  const { customers, allRuns, diagnostics, nganh, dict } = res.data!;
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
      setDone(`Đã cập nhật ${out.run_ids.length} khách hàng.`);
    } catch (e) {
      setError(toMessage(e, COPY.state.saveError));
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
      setError(toMessage(e, COPY.state.saveError));
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
      setDone(`Đã tạo việc cần làm cho ${out.so_diagnostic} nghĩa vụ — chờ người phụ trách tuân thủ của khách hàng xác nhận.`);
    } catch (e) {
      setError(toMessage(e, COPY.state.saveError));
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
            <p className="text-sm text-muted-foreground">Đối chiếu hồ sơ từng khách hàng với các mục đã kiểm duyệt trong thư viện.</p>
          </div>
          <Button onClick={rescanAll} disabled={running}>
            <RefreshCw className={busyAll ? "animate-spin" : undefined} /> {busyAll ? COPY.state.matching : COPY.action.capNhatTatCa}
          </Button>
        </div>

        {/* Tiến độ khi pipeline đang chạy (route không báo từng bước → thanh chạy không xác định) */}
        {running && (
          <div className="space-y-1.5" role="status">
            <p className="text-xs font-medium text-muted-foreground tabular-nums">
              {generating
                ? `Đang tạo việc cần làm… đã xong ${generating.written}`
                : busyAll
                  ? `${COPY.state.matching} (${customers.length} khách hàng)`
                  : `${COPY.state.matching} ${customers.find((c) => c.id === busyId)?.ten_cong_ty ?? ""}`}
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
                <TableHead>Lần cập nhật gần nhất</TableHead>
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
                        <span className="text-ink-faint">–</span>
                      ) : ketQua.length === 0 ? (
                        <span className="text-xs text-muted-foreground">Chưa có mục để đối chiếu</span>
                      ) : (
                        <>
                          <span className="font-semibold">
                            <SoLieu n={apDung} />
                          </span>
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
                        <span className="text-xs text-muted-foreground">Chưa cập nhật</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {/* Mỗi hàng đúng 1 nút (team chốt 20/10): mọi thao tác của khách hàng gom vào menu "Thao tác" */}
                      <DropdownMenu>
                        <DropdownMenuTrigger render={<Button size="sm" variant="outline" disabled={running} />}>
                          {busyId === c.id || generating?.customerId === c.id ? <RefreshCw className="animate-spin" /> : null}
                          Thao tác <ChevronDown />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56">
                          <DropdownMenuItem onClick={() => rescanOne(c.id)}>
                            <RefreshCw /> {COPY.action.capNhatKhach}
                          </DropdownMenuItem>
                          <DropdownMenuItem disabled={choAi === 0} onClick={() => generate(c.id)}>
                            <ListChecks /> {choAi > 0 ? `${COPY.action.taoViec} (${choAi})` : "Không có nghĩa vụ cần tạo việc"}
                          </DropdownMenuItem>
                          <DropdownMenuItem render={<Link href="/nhat-ky" />}>
                            <History /> {COPY.action.xemLichSu}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                      {generating?.customerId === c.id && <p className="mt-1 text-xs text-muted-foreground tabular-nums">Đã tạo {generating.written}</p>}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <Link href="/nhat-ky" className={buttonVariants({ variant: "link", size: "sm" })}>
            {COPY.action.xemLichSu}
          </Link>
        </div>
      </section>

      {/* Kết quả đối chiếu theo khách hàng — đọc từ pipeline_runs.output (backend ghi lại lý do từng mục) */}
      <section className="space-y-3" aria-labelledby="vi-sao">
        <h2 id="vi-sao" className="text-base font-semibold">
          Kết quả đối chiếu theo khách hàng
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
                    : "Chưa đối chiếu"
                }
                open={openId === c.id}
                onToggle={() => setOpenId((cur) => (cur === c.id ? null : c.id))}
              >
                {ketQua.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Thư viện chưa có mục đã kiểm duyệt để đối chiếu.</p>
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
                            {dk.ket_qua === true ? "Đạt" : dk.ket_qua === false ? "Không đạt" : "Thiếu thông tin"}: {dk.ten_entity} — hồ sơ khai{" "}
                            {/* Hiện nhãn tiếng Việt ("Có", "Website/app riêng"…), không lộ mã / true-false */}
                            {dk.gia_tri_khach_hang === undefined || dk.gia_tri_khach_hang === null
                              ? "chưa có"
                              : formatGiaTri(dict.find((t) => t.ma === dk.dieu_kien_may_doc.thuoc_tinh), dk.gia_tri_khach_hang as GiaTriThuocTinh)}
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
        <summary className="cursor-pointer font-medium">Cách xác định nghĩa vụ áp dụng</summary>
        <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-muted-foreground">
          <li>Chỉ xét các nghĩa vụ đã kiểm duyệt, thuộc văn bản đang hiệu lực. Nghĩa vụ ngoài lĩnh vực khách hàng theo dõi → Không áp dụng.</li>
          <li>Điều kiện của nghĩa vụ = các điều kiện, ngưỡng và đối tượng áp dụng đã kiểm duyệt (có điều kiện áp dụng). Khách hàng phải đáp ứng tất cả.</li>
          <li>Có điều kiện không đáp ứng → Không áp dụng. Hồ sơ còn thiếu thông tin → Cần bổ sung thông tin.</li>
          <li>Đáp ứng đủ điều kiện: chưa tới ngày hiệu lực → Sắp có hiệu lực, ngược lại → Đang áp dụng.</li>
          <li>Nghĩa vụ giao cho phòng ban phụ trách chính; khách hàng không có phòng đó → Ban Giám đốc; không có cả Ban Giám đốc → chưa giao.</li>
        </ol>
      </details>
    </div>
  );
}
