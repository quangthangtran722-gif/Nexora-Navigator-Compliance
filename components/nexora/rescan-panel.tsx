"use client";

import { useState } from "react";
import Link from "next/link";
import { RefreshCw, Sparkles } from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ErrorBlock, LoadingBlock } from "@/components/nexora/data-state";
import { ModelCell } from "@/components/nexora/pipeline-log";
import { ApDungBadge, RunBadge } from "@/components/nexora/status-badges";
import { domainLabel, formatDateTime } from "@/lib/labels";
import { combine, useErrorHandler } from "@/lib/data/errors";
import { generateAll, PipelineError, postPipeline, toAppError, type FilterKetQua } from "@/lib/data/pipeline";
import { getAllDiagnostics, getCustomers, getPipelineRuns, getRunsByIds } from "@/lib/data/queries";
import { useQuery } from "@/lib/data/use-query";
import type { PipelineRun, TrangThaiApDung } from "@/lib/types";

/*
 * Nút "Quét lại khách hàng hiện có" (CLAUDE.md mục 8) = POST /api/pipeline/rescan body {} → { run_ids }
 * (CONTRACT §7): chạy rule engine (KHÔNG AI) cho từng khách hàng, mỗi khách hàng 1 run filter_domain.
 * Kết quả đọc lại từ pipeline_runs theo run_ids.
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
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [response, setResponse] = useState<{ run_ids: string[] } | null>(null);
  const [runs, setRuns] = useState<PipelineRun[]>([]);
  const [generating, setGenerating] = useState<{ customerId: string; written: number } | null>(null);
  const [generated, setGenerated] = useState<Record<string, number>>({}); // số checklist AI đã viết theo khách hàng (phiên này)
  const handleError = useErrorHandler();
  const toMessage = (e: unknown, fallback: string) => (e instanceof PipelineError ? handleError(toAppError(e)) : null) ?? fallback;

  const res = useQuery(() => combine({ customers: getCustomers(), allRuns: getPipelineRuns(), diagnostics: getAllDiagnostics() }), []);
  if (res.loading) return <LoadingBlock />;
  if (res.error) return <ErrorBlock error={res.error} onRetry={res.reload} />;
  const { customers, allRuns, diagnostics } = res.data!;
  const lastFilter = (cid: string) => allRuns.find((r) => r.pipeline_name === "filter_domain" && r.customer_id === cid);

  async function rescan() {
    setBusy(true);
    setError(null);
    try {
      const out = await postPipeline("/api/pipeline/rescan", {});
      setResponse(out);
      // Đọc lại các run vừa tạo + diagnostics mới từ DB
      const r = await getRunsByIds(out.run_ids);
      if (r.error) setError(handleError(r.error));
      else setRuns(r.data);
      res.reload();
    } catch (e) {
      setError(toMessage(e, "Quét lại thất bại."));
    }
    setBusy(false);
  }

  // filter (rescan) KHÔNG tự gọi generate → checklist áp dụng mới cần AI viết nội dung.
  // generate xử lý tối đa 6 mục/lần → generateAll gọi lại tới khi so_diagnostic = 0.
  async function generate(customerId: string) {
    setGenerating({ customerId, written: 0 });
    try {
      const out = await generateAll({ customer_id: customerId }, (_round, written) => setGenerating({ customerId, written }));
      setGenerated((g) => ({ ...g, [customerId]: out.so_diagnostic }));
    } catch (e) {
      setError(toMessage(e, "AI chưa viết được checklist."));
    }
    setGenerating(null);
    res.reload();
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Quét lại {customers.length} khách hàng</CardTitle>
          <CardDescription>
            Chạy rule engine thuần code (không gọi AI) cho mọi khách hàng với kho entity đã duyệt hiện tại. Dùng sau khi duyệt văn bản mới vào kho.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-xl border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Khách hàng</TableHead>
                  <TableHead>Lĩnh vực</TableHead>
                  <TableHead>Lần lọc gần nhất</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customers.map((c) => {
                  const last = lastFilter(c.id);
                  return (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium whitespace-normal">{c.ten_cong_ty}</TableCell>
                      <TableCell>{c.domains.map(domainLabel).join(", ") || "—"}</TableCell>
                      <TableCell className="tabular-nums">{last ? formatDateTime(last.started_at ?? last.created_at) : "Chưa chạy"}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          <Button onClick={rescan} disabled={busy}>
            <RefreshCw className={busy ? "animate-spin" : undefined} /> {busy ? "Đang quét…" : "Quét lại khách hàng hiện có"}
          </Button>
          {error && (
            <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">
              {error}
            </p>
          )}
        </CardContent>
      </Card>

      {response && (
        <Card>
          <CardHeader>
            <CardTitle>Kết quả quét lại</CardTitle>
            <CardDescription>
              API trả về <code className="text-xs">{`{ run_ids: [${response.run_ids.length} run] }`}</code> — mỗi khách hàng 1 lần chạy rule engine.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-xl border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Khách hàng</TableHead>
                    <TableHead>Run</TableHead>
                    {STATUSES.map((s) => (
                      <TableHead key={s} className="text-right">
                        <ApDungBadge status={s} />
                      </TableHead>
                    ))}
                    <TableHead>Checklist</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {runs.map((r) => {
                    // Chi tiết từng hành vi (kể cả khong_ap_dung) nằm trong pipeline_runs.output.ket_qua (CONTRACT §7)
                    const ketQua = (r.output as { ket_qua?: FilterTrace[] } | null)?.ket_qua ?? [];
                    const n = (s: TrangThaiApDung) => ketQua.filter((k) => k.trang_thai_ap_dung === s).length;
                    const khongPhong = ketQua.filter((k) => k.trang_thai_ap_dung !== "khong_ap_dung" && k.diagnostic_ids.length === 0).length;
                    const choAi = diagnostics.filter(
                      (d) => d.customer_id === r.customer_id && (d.trang_thai_ap_dung === "ap_dung" || d.trang_thai_ap_dung === "sap_ap_dung") && d.noi_dung_diagnostic === null,
                    ).length;
                    return (
                      <TableRow key={r.id}>
                        <TableCell className="font-medium whitespace-normal">
                          {customers.find((c) => c.id === r.customer_id)?.ten_cong_ty}
                          {khongPhong > 0 && <span className="block text-xs font-normal text-status-ap-dung">{khongPhong} nghĩa vụ chưa có phòng nhận — nhắc khách hàng thêm phòng ban</span>}
                          {ketQua.length > 0 && <LyDoList ketQua={ketQua} />}
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <code className="text-xs">{r.id}</code>
                            <RunBadge status={r.trang_thai} />
                          </div>
                        </TableCell>
                        {ketQua.length === 0 ? (
                          // ket_qua [] = chưa có entity hanh_vi nào được duyệt — hợp lệ, không phải lỗi
                          <TableCell colSpan={STATUSES.length} className="text-center text-sm text-muted-foreground">
                            Chưa có entity được duyệt
                          </TableCell>
                        ) : (
                          STATUSES.map((s) => (
                            <TableCell key={s} className="text-right tabular-nums">
                              {n(s)}
                            </TableCell>
                          ))
                        )}
                        <TableCell>
                          {choAi > 0 ? (
                            <Button size="xs" variant="outline" disabled={generating !== null} onClick={() => generate(r.customer_id!)}>
                              <Sparkles />{" "}
                              {generating?.customerId === r.customer_id ? `AI đang viết… (đã xong ${generating.written})` : `AI viết ${choAi} checklist`}
                            </Button>
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              {generated[r.customer_id!] !== undefined ? `AI đã viết ${generated[r.customer_id!]} checklist` : ketQua.length === 0 ? "—" : "Đủ nội dung"}
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <ModelCell model={null} />
              <Link href="/nhat-ky" className={buttonVariants({ variant: "outline", size: "sm" })}>
                Xem trong nhật ký pipeline
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      <details className="rounded-xl border p-4 text-sm">
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

// "Vì sao áp dụng / không áp dụng" — đọc từ pipeline_runs.output (rule engine ở backend ghi lại)
function LyDoList({ ketQua }: { ketQua: FilterTrace[] }) {
  return (
    <details className="mt-1 text-xs font-normal">
      <summary className="cursor-pointer text-muted-foreground">Vì sao ({ketQua.length} nghĩa vụ)</summary>
      <ul className="mt-2 space-y-2">
        {ketQua.map((k) => (
          <li key={k.entity_id} className="space-y-0.5">
            <span className="flex flex-wrap items-center gap-1.5">
              <ApDungBadge status={k.trang_thai_ap_dung} />
              <span className="font-medium">{k.ten_entity ?? k.entity_id}</span>
              {k.so_hieu && <span className="text-muted-foreground">· {k.so_hieu}</span>}
            </span>
            {k.ly_do && <span className="block text-muted-foreground">Lý do: {LY_DO_LABEL[k.ly_do] ?? k.ly_do}</span>}
            {(k.dieu_kien ?? []).map((dk, i) => (
              <span key={i} className="block text-muted-foreground">
                {dk.ket_qua === true ? "✓" : dk.ket_qua === false ? "✗" : "?"} {dk.ten_entity} — <code>{dk.dieu_kien_may_doc.thuoc_tinh}</code> ={" "}
                {dk.gia_tri_khach_hang === undefined || dk.gia_tri_khach_hang === null ? "chưa khai" : JSON.stringify(dk.gia_tri_khach_hang)}
              </span>
            ))}
          </li>
        ))}
      </ul>
    </details>
  );
}
