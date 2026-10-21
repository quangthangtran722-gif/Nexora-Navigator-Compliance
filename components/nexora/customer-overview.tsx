"use client";

import Link from "next/link";
import { Building2, Mail, MessageCircleQuestion } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ErrorBlock, LoadingBlock } from "@/components/nexora/data-state";
import { ApDungBadge, DuyetBadge } from "@/components/nexora/status-badges";
import { deptLabel, domainLabel, QUY_MO_LABEL } from "@/lib/labels";
import { useAuth } from "@/lib/auth/auth-provider";
import { combine } from "@/lib/data/errors";
import { getCustomer, getDepartments, getDiagnostics, getNganh, getThuocTinhHoSo } from "@/lib/data/queries";
import { useQuery } from "@/lib/data/use-query";
import { formatGiaTri } from "@/lib/thuoc-tinh-format";
import type { Diagnostic, TrangThaiApDung } from "@/lib/types";
import { THUOC_TINH_TU_COT } from "@/lib/pipeline/ruleEngine";

/*
 * Tổng quan doanh nghiệp (vai trò khách hàng) — đọc dữ liệu thật của khách hàng đang đăng nhập.
 * customer_id lấy từ app_metadata của session; RLS chỉ trả dữ liệu của chính khách hàng này.
 */

const AP_DUNG_ORDER: TrangThaiApDung[] = ["ap_dung", "sap_ap_dung", "chua_du_thong_tin", "khong_ap_dung"];

export function CustomerOverview() {
  const { customerId } = useAuth(); // RequireRole đảm bảo đã là customer có customer_id
  const res = useQuery(
    () =>
      combine({
        customer: getCustomer(customerId!),
        departments: getDepartments(customerId!),
        diagnostics: getDiagnostics(customerId!),
        dict: getThuocTinhHoSo(),
        nganh: getNganh(),
      }),
    [customerId],
  );
  if (res.loading) return <LoadingBlock />;
  if (res.error) return <ErrorBlock error={res.error} onRetry={res.reload} />;
  const { customer, departments, diagnostics, nganh } = res.data!;
  // Mã không có trong bảng nganh (onboarding nhập tự do) → hiện nguyên mã (CONTRACT §3.10)
  const tenNganh = customer.nganh ? (nganh.find((n) => n.ma === customer.nganh)?.ten_hien_thi ?? customer.nganh) : "chưa khai";
  const dict = res.data!.dict.filter((t) => !THUOC_TINH_TU_COT.includes(t.ma) && (t.domain === null || customer.domains.includes(t.domain)));

  const count = (items: Diagnostic[], pred: (d: Diagnostic) => boolean) => items.filter(pred).length;
  const choDuyet = count(diagnostics, (d) => d.trang_thai_duyet === "cho_duyet" && d.noi_dung_diagnostic !== null && d.trang_thai_ap_dung !== "khong_ap_dung");
  const choAi = count(diagnostics, (d) => (d.trang_thai_ap_dung === "ap_dung" || d.trang_thai_ap_dung === "sap_ap_dung") && d.noi_dung_diagnostic === null);
  const chuaDu = count(diagnostics, (d) => d.trang_thai_ap_dung === "chua_du_thong_tin");

  return (
    <>
      {chuaDu > 0 && (
        <div className="flex flex-col gap-2 rounded-xl border border-status-chua-du-tt/30 bg-status-chua-du-tt-bg p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="flex items-center gap-2 text-sm text-status-chua-du-tt">
            <MessageCircleQuestion className="size-4" aria-hidden /> Có {chuaDu} mục chưa đủ thông tin để xác định — cần trả lời câu hỏi bổ sung.
          </p>
          <Link href="/duyet-diagnostic#hoi-bo-sung" className={buttonVariants({ size: "sm" })}>
            Trả lời ngay
          </Link>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Building2 className="size-5 text-primary" aria-hidden />
            {customer.ten_cong_ty}
          </CardTitle>
          <CardDescription>
            Ngành: {tenNganh} · Quy mô: {customer.quy_mo ? QUY_MO_LABEL[customer.quy_mo] : "chưa khai"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-muted-foreground">Lĩnh vực theo dõi:</span>
            {customer.domains.map((d) => (
              <Badge key={d} variant="secondary">
                {domainLabel(d)}
              </Badge>
            ))}
          </div>
          <details>
            <summary className="cursor-pointer text-muted-foreground">Hồ sơ đã khai ({dict.length} câu)</summary>
            <dl className="mt-2 grid gap-x-4 gap-y-1.5 sm:grid-cols-[1fr_auto]">
              {dict.map((t) => (
                <div key={t.ma} className="contents">
                  <dt className="text-muted-foreground">{t.cau_hoi}</dt>
                  <dd className="font-medium">{formatGiaTri(t, customer.thuoc_tinh[t.ma])}</dd>
                </div>
              ))}
            </dl>
          </details>
        </CardContent>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {AP_DUNG_ORDER.map((s) => (
          <Card key={s} size="sm">
            <CardHeader>
              <CardDescription>
                <ApDungBadge status={s} />
              </CardDescription>
              <CardTitle className="text-3xl font-semibold tabular-nums">{count(diagnostics, (d) => d.trang_thai_ap_dung === s)}</CardTitle>
            </CardHeader>
          </Card>
        ))}
        <Card size="sm" className="ring-1 ring-duyet-cho/30">
          <CardHeader>
            <CardDescription>
              <DuyetBadge status="cho_duyet" />
            </CardDescription>
            <CardTitle className="text-3xl font-semibold tabular-nums">{choDuyet}</CardTitle>
            {choAi > 0 && <p className="text-xs text-muted-foreground">+ {choAi} chờ AI viết checklist</p>}
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Theo phòng ban</CardTitle>
          <CardDescription>Số checklist mỗi phòng nhận, theo trạng thái áp dụng và duyệt.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Phòng ban</TableHead>
                <TableHead className="text-right">Áp dụng</TableHead>
                <TableHead className="text-right">Sắp áp dụng</TableHead>
                <TableHead className="text-right">Chưa đủ thông tin</TableHead>
                <TableHead className="text-right">Hết áp dụng</TableHead>
                <TableHead className="text-right">Chờ duyệt</TableHead>
                <TableHead className="text-right">Đã giao</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {departments.map((dept) => {
                const items = diagnostics.filter((d) => d.department_id === dept.id);
                const n = (s: TrangThaiApDung) => count(items, (d) => d.trang_thai_ap_dung === s);
                return (
                  <TableRow key={dept.id}>
                    <TableCell>
                      <Link href={`/duyet-diagnostic#${dept.id}`} className="font-medium hover:underline">
                        {dept.ten_phong_ban}
                      </Link>
                      <div className="text-xs text-muted-foreground">{deptLabel(dept.slug_phong_ban)}</div>
                      {dept.email_head && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Mail className="size-3" aria-hidden />
                          {dept.email_head}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{n("ap_dung")}</TableCell>
                    <TableCell className="text-right tabular-nums">{n("sap_ap_dung")}</TableCell>
                    <TableCell className="text-right tabular-nums">{n("chua_du_thong_tin")}</TableCell>
                    <TableCell className="text-right text-muted-foreground tabular-nums">{n("khong_ap_dung")}</TableCell>
                    <TableCell className="text-right font-medium tabular-nums">
                      {count(items, (d) => d.trang_thai_duyet === "cho_duyet" && d.trang_thai_ap_dung !== "khong_ap_dung")}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{count(items, (d) => d.trang_thai_duyet === "da_duyet")}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
}
