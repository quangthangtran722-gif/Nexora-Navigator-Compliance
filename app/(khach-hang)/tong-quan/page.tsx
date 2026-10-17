import type { Metadata } from "next";
import Link from "next/link";
import { Building2, Mail } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MockNotice, PageHeader } from "@/components/nexora/page-header";
import { ApDungBadge, DuyetBadge, type ApDungStatus } from "@/components/nexora/status-badges";
import { domainLabel } from "@/lib/labels";
import { getCustomer, getDepartments, getDiagnostics } from "@/lib/mock";
import type { Diagnostic } from "@/lib/types";

export const metadata: Metadata = { title: "Tổng quan" };

const AP_DUNG_ORDER: ApDungStatus[] = ["ap_dung", "sap_ap_dung", "chua_du_thong_tin", "khong_ap_dung"];

function countBy<T extends string>(items: Diagnostic[], pick: (d: Diagnostic) => T, value: T) {
  return items.filter((d) => pick(d) === value).length;
}

export default function Page() {
  const customer = getCustomer();
  const departments = getDepartments(customer.id);
  const diagnostics = getDiagnostics(customer.id);
  const choDuyet = countBy(diagnostics, (d) => d.trang_thai_duyet, "cho_duyet");

  return (
    <>
      <PageHeader title="Tổng quan" description="Tình trạng tuân thủ của doanh nghiệp theo các lĩnh vực đang theo dõi." />
      <MockNotice />

      {/* Thông tin công ty */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Building2 className="size-5 text-primary" aria-hidden />
            {customer.ten_cong_ty}
          </CardTitle>
          <CardDescription>
            {customer.nganh} · {customer.quy_mo.toLocaleString("vi-VN")} nhân viên
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-muted-foreground">Lĩnh vực theo dõi:</span>
          {customer.domains.map((d) => (
            <Badge key={d} variant="secondary">
              {domainLabel[d]}
            </Badge>
          ))}
        </CardContent>
      </Card>

      {/* Số diagnostic theo trạng thái áp dụng + số chờ duyệt */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {AP_DUNG_ORDER.map((s) => (
          <Card key={s} size="sm">
            <CardHeader>
              <CardDescription>
                <ApDungBadge status={s} />
              </CardDescription>
              <CardTitle className="text-3xl font-semibold tabular-nums">
                {countBy(diagnostics, (d) => d.trang_thai_ap_dung, s)}
              </CardTitle>
            </CardHeader>
          </Card>
        ))}
        <Card size="sm" className="ring-1 ring-duyet-cho/30">
          <CardHeader>
            <CardDescription>
              <DuyetBadge status="cho_duyet" />
            </CardDescription>
            <CardTitle className="text-3xl font-semibold tabular-nums">{choDuyet}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Theo phòng ban */}
      <Card>
        <CardHeader>
          <CardTitle>Theo phòng ban</CardTitle>
          <CardDescription>Số diagnostic mỗi phòng nhận, chia theo mức ảnh hưởng và trạng thái.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Phòng ban</TableHead>
                <TableHead className="text-right">Ảnh hưởng chính</TableHead>
                <TableHead className="text-right">Ảnh hưởng phụ</TableHead>
                <TableHead className="text-right">Áp dụng</TableHead>
                <TableHead className="text-right">Sắp áp dụng</TableHead>
                <TableHead className="text-right">Chưa đủ thông tin</TableHead>
                <TableHead className="text-right">Chờ duyệt</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {departments.map((dept) => {
                const items = diagnostics.filter((d) => d.department_id === dept.id);
                const n = (pick: (d: Diagnostic) => string, v: string) => items.filter((d) => pick(d) === v).length;
                return (
                  <TableRow key={dept.id}>
                    <TableCell>
                      <Link href={`/duyet-diagnostic#${dept.id}`} className="font-medium hover:underline">
                        {dept.ten_phong_ban}
                      </Link>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Mail className="size-3" aria-hidden />
                        {dept.email_head}
                      </div>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{n((d) => d.muc_anh_huong, "primary")}</TableCell>
                    <TableCell className="text-right tabular-nums">{n((d) => d.muc_anh_huong, "secondary")}</TableCell>
                    <TableCell className="text-right tabular-nums">{n((d) => d.trang_thai_ap_dung, "ap_dung")}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {n((d) => d.trang_thai_ap_dung, "sap_ap_dung")}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {n((d) => d.trang_thai_ap_dung, "chua_du_thong_tin")}
                    </TableCell>
                    <TableCell className="text-right font-medium tabular-nums">
                      {n((d) => d.trang_thai_duyet, "cho_duyet")}
                    </TableCell>
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
