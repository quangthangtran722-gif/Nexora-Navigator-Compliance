"use client";

import Link from "next/link";
import { CircleHelp, ClipboardCheck, Clock, ShieldAlert } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ErrorBlock, LoadingBlock } from "@/components/nexora/data-state";
import { GroupHeader } from "@/components/nexora/group-header";
import { ItemList, ItemRow } from "@/components/nexora/item-row";
import { KpiCard } from "@/components/nexora/kpi-card";
import { ApDungBadge, DuyetBadge } from "@/components/nexora/status-badges";
import { domainLabel, QUY_MO_LABEL, TRANG_THAI_AP_DUNG_LABEL } from "@/lib/labels";
import { useAuth } from "@/lib/auth/auth-provider";
import { combine } from "@/lib/data/errors";
import { getCustomer, getDepartments, getDiagnostics, getEntities, getNganh, getThuocTinhHoSo } from "@/lib/data/queries";
import { useQuery } from "@/lib/data/use-query";
import { formatGiaTri } from "@/lib/thuoc-tinh-format";
import type { Diagnostic, TrangThaiApDung } from "@/lib/types";
import { cn } from "@/lib/utils";

/*
 * Tổng quan doanh nghiệp (vai trò khách hàng) — đọc dữ liệu thật của khách hàng đang đăng nhập.
 * customer_id lấy từ app_metadata của session; RLS chỉ trả dữ liệu của chính khách hàng này.
 * Bố cục (palette v3 mục 9.10): GroupHeader thông tin DN · 4 KpiCard · biểu đồ trạng thái · bảng phòng ban · 5 ItemRow gần nhất.
 */

const AP_DUNG_ORDER: TrangThaiApDung[] = ["ap_dung", "sap_ap_dung", "chua_du_thong_tin", "khong_ap_dung"];
// Biểu đồ dùng đúng màu trạng thái (v3 mục 4), không dùng --chart-*
const BAR_COLOR: Record<TrangThaiApDung, string> = {
  ap_dung: "bg-[#E57373]", // red-400 (team chốt 20/10): mảng lớn không dùng đỏ đậm
  sap_ap_dung: "bg-status-sap-ap-dung",
  chua_du_thong_tin: "bg-status-chua-du-tt",
  khong_ap_dung: "bg-status-khong-ap-dung",
};

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
        entities: getEntities(),
      }),
    [customerId],
  );
  if (res.loading) return <LoadingBlock />;
  if (res.error) return <ErrorBlock error={res.error} onRetry={res.reload} />;
  const { customer, departments, diagnostics, nganh, entities } = res.data!;
  // Mã không có trong bảng nganh (onboarding nhập tự do) → hiện nguyên mã (CONTRACT §3.10)
  const tenNganh = customer.nganh ? (nganh.find((n) => n.ma === customer.nganh)?.ten_hien_thi ?? customer.nganh) : "chưa khai";
  const dict = res.data!.dict.filter((t) => t.domain === null || customer.domains.includes(t.domain));

  const count = (items: Diagnostic[], pred: (d: Diagnostic) => boolean) => items.filter(pred).length;
  const nTrangThai = (s: TrangThaiApDung) => count(diagnostics, (d) => d.trang_thai_ap_dung === s);
  const choDuyet = count(diagnostics, (d) => d.trang_thai_duyet === "cho_duyet" && d.noi_dung_diagnostic !== null && d.trang_thai_ap_dung !== "khong_ap_dung");
  const daGiao = count(diagnostics, (d) => d.trang_thai_duyet === "da_duyet");
  const chuaDu = nTrangThai("chua_du_thong_tin");
  // Mức hoàn thiện hồ sơ: câu đã trả lời rõ (khác "Chưa chắc" / chưa trả lời) trên tổng câu của lĩnh vực đang theo dõi
  const daTraLoi = dict.filter((t) => customer.thuoc_tinh[t.ma] !== undefined && customer.thuoc_tinh[t.ma] !== null).length;
  const hoanThien = dict.length ? Math.round((daTraLoi / dict.length) * 100) : 0;
  const ganNhat = [...diagnostics].sort((a, b) => b.updated_at.localeCompare(a.updated_at)).slice(0, 5);

  return (
    <>
      {/* Thông tin doanh nghiệp: dải đầu nhóm duy nhất của màn */}
      <section aria-labelledby="dn-title">
        <GroupHeader
          id="dn-title"
          title={customer.ten_cong_ty}
          subtitle={`${tenNganh} · Quy mô ${customer.quy_mo ? QUY_MO_LABEL[customer.quy_mo].toLowerCase() : "chưa khai"} · ${departments.length} phòng ban · Theo dõi: ${customer.domains.map(domainLabel).join(", ") || "chưa chọn"}`}
        />
        <details className="border-x border-b bg-card px-4 py-3 text-sm">
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
      </section>

      {chuaDu > 0 && (
        <p className="flex flex-wrap items-center justify-between gap-2 border bg-card px-4 py-3 text-sm">
          <span>
            Có <span className="font-semibold text-duyet-cho tabular-nums">{chuaDu}</span> mục chưa đủ thông tin để xác định — cần trả lời câu hỏi bổ sung.
          </span>
          <Link href="/duyet-diagnostic#hoi-bo-sung" className={buttonVariants({ variant: "outline", size: "sm" })}>
            Trả lời ngay
          </Link>
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard featured label="Nghĩa vụ áp dụng" value={nTrangThai("ap_dung")} icon={ShieldAlert} hint={`${choDuyet} chờ duyệt · ${daGiao} đã giao`} />
        <KpiCard label="Sắp áp dụng" value={nTrangThai("sap_ap_dung")} icon={Clock} />
        <KpiCard label="Chưa đủ thông tin" value={chuaDu} icon={CircleHelp} attention={chuaDu > 0} hint={chuaDu > 0 ? "Cần phản hồi" : undefined} />
        <KpiCard label="Mức hoàn thiện hồ sơ" value={`${hoanThien}%`} icon={ClipboardCheck} hint={`${daTraLoi}/${dict.length} câu đã trả lời`} />
      </div>

      {/* Phân bổ nghĩa vụ theo trạng thái — 1 thanh xếp chồng + chú giải có số */}
      <section className="space-y-3 border bg-card p-4" aria-labelledby="phan-bo">
        <h2 id="phan-bo" className="text-base font-semibold">
          Phân bổ nghĩa vụ theo trạng thái
        </h2>
        {diagnostics.length === 0 ? (
          <p className="text-sm text-muted-foreground">Chưa có nghĩa vụ nào được đối chiếu cho doanh nghiệp.</p>
        ) : (
          <>
            <div className="flex h-2 w-full gap-px bg-border" role="img" aria-label={AP_DUNG_ORDER.map((s) => `${TRANG_THAI_AP_DUNG_LABEL[s]}: ${nTrangThai(s)}`).join(", ")}>
              {AP_DUNG_ORDER.filter((s) => nTrangThai(s) > 0).map((s) => (
                <div key={s} className={BAR_COLOR[s]} style={{ width: `${(nTrangThai(s) / diagnostics.length) * 100}%` }} />
              ))}
            </div>
            <ul className="flex flex-wrap gap-x-6 gap-y-2">
              {AP_DUNG_ORDER.map((s) => (
                <li key={s} className="flex items-center gap-2 text-sm">
                  <ApDungBadge status={s} />
                  <span className="font-semibold tabular-nums">{nTrangThai(s)}</span>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      <section className="space-y-3" aria-labelledby="theo-phong">
        <h2 id="theo-phong" className="text-base font-semibold">
          Theo phòng ban
        </h2>
        <div className="border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Phòng ban</TableHead>
                <TableHead className="text-right">Áp dụng</TableHead>
                <TableHead className="text-right">Sắp áp dụng</TableHead>
                <TableHead className="text-right">Chưa đủ thông tin</TableHead>
                <TableHead className="text-right">Chờ duyệt</TableHead>
                <TableHead className="text-right">Đã giao</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {departments.map((dept) => {
                const items = diagnostics.filter((d) => d.department_id === dept.id);
                const n = (s: TrangThaiApDung) => count(items, (d) => d.trang_thai_ap_dung === s);
                const cho = count(items, (d) => d.trang_thai_duyet === "cho_duyet" && d.trang_thai_ap_dung !== "khong_ap_dung");
                return (
                  <TableRow key={dept.id}>
                    <TableCell>
                      <Link href={`/duyet-diagnostic#${dept.id}`} className="font-medium hover:text-gold-text hover:underline">
                        {dept.ten_phong_ban}
                      </Link>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{n("ap_dung")}</TableCell>
                    <TableCell className="text-right tabular-nums">{n("sap_ap_dung")}</TableCell>
                    <TableCell className={cn("text-right tabular-nums", n("chua_du_thong_tin") > 0 && "font-semibold text-duyet-cho")}>{n("chua_du_thong_tin")}</TableCell>
                    <TableCell className={cn("text-right tabular-nums", cho > 0 && "font-semibold text-duyet-cho")}>{cho}</TableCell>
                    <TableCell className="text-right tabular-nums">{count(items, (d) => d.trang_thai_duyet === "da_duyet")}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </section>

      <section className="space-y-3" aria-labelledby="gan-nhat">
        <div className="flex items-baseline justify-between gap-2">
          <h2 id="gan-nhat" className="text-base font-semibold">
            Cập nhật gần nhất
          </h2>
          <Link href="/duyet-diagnostic" className={buttonVariants({ variant: "link", size: "sm" })}>
            Xem tất cả
          </Link>
        </div>
        {ganNhat.length === 0 ? (
          <p className="border bg-card px-4 py-3 text-sm text-muted-foreground">Chưa có nghĩa vụ nào.</p>
        ) : (
          <ItemList>
            {ganNhat.map((d) => (
              <ItemRow
                key={d.id}
                title={entities.find((e) => e.id === d.entity_id)?.ten_entity ?? "Nghĩa vụ"}
                muted={d.trang_thai_ap_dung === "khong_ap_dung"}
                href={`/duyet-diagnostic#diag-${d.id}`}
                right={
                  <>
                    <ApDungBadge status={d.trang_thai_ap_dung} />
                    <DuyetBadge status={d.trang_thai_duyet} />
                  </>
                }
              />
            ))}
          </ItemList>
        )}
      </section>
    </>
  );
}
