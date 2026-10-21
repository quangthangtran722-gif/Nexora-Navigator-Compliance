"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CircleHelp, ClipboardCheck, Clock, ShieldAlert } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ErrorBlock, LoadingBlock } from "@/components/nexora/data-state";
import { GroupHeader } from "@/components/nexora/group-header";
import { ItemList, ItemRow } from "@/components/nexora/item-row";
import { KpiCard } from "@/components/nexora/kpi-card";
import { SoLieu } from "@/components/nexora/so-lieu";
import { ApDungBadge, DuyetBadge } from "@/components/nexora/status-badges";
import { COPY, TONG_QUAN } from "@/lib/copy";
import { domainLabel, formatDate, QUY_MO_LABEL, TRANG_THAI_AP_DUNG_LABEL } from "@/lib/labels";
import { useAuth } from "@/lib/auth/auth-provider";
import { combine } from "@/lib/data/errors";
import { getCustomer, getDepartments, getDiagnostics, getEntities, getNganh, getThuocTinhHoSo } from "@/lib/data/queries";
import { useQuery } from "@/lib/data/use-query";
import { formatGiaTri } from "@/lib/thuoc-tinh-format";
import type { Diagnostic, TrangThaiApDung } from "@/lib/types";
import { THUOC_TINH_TU_COT } from "@/lib/pipeline/ruleEngine";
import { cn } from "@/lib/utils";

/*
 * Tổng quan doanh nghiệp — đọc dữ liệu thật của tài khoản đang đăng nhập (RLS chỉ trả công ty này).
 * Bố cục (palette v4 mục 9.10): GroupHeader thông tin DN · 4 KpiCard · biểu đồ trạng thái · bảng phòng ban
 * (bấm hàng → Xác nhận nghĩa vụ, chọn sẵn tab phòng ban) · Mới trong 7 ngày qua · Mới cập nhật. Chữ: lib/copy.ts.
 */

const AP_DUNG_ORDER: TrangThaiApDung[] = ["ap_dung", "sap_ap_dung", "chua_du_thong_tin", "khong_ap_dung"];
// Biểu đồ dùng đúng màu trạng thái (v4 mục 4), không dùng --chart-*
const BAR_COLOR: Record<TrangThaiApDung, string> = {
  ap_dung: "bg-status-ap-dung-bar", // đỏ rượu vang nhạt: mảng lớn không dùng đỏ đậm
  sap_ap_dung: "bg-status-sap-ap-dung",
  chua_du_thong_tin: "bg-status-chua-du-tt",
  khong_ap_dung: "bg-status-khong-ap-dung",
};
const BAY_NGAY = 7 * 24 * 60 * 60 * 1000;

export function CustomerOverview() {
  const router = useRouter();
  // Mốc "7 ngày qua" lấy 1 lần khi mở trang (render phải thuần, không gọi Date.now() mỗi lần vẽ)
  const [bayGio] = useState(() => Date.now());
  const { customerId } = useAuth(); // RequireRole đảm bảo đã là doanh nghiệp có customer_id
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
  // Tên ngành tiếng Việt từ bảng nganh; mã không có trong bảng thì không hiện mã (wording: không lộ mã nội bộ)
  const tenNganh = (customer.nganh && nganh.find((n) => n.ma === customer.nganh)?.ten_hien_thi) || TONG_QUAN.chuaKhai;
  // nganh, quy_mo là cột riêng của customers → không lặp lại trong danh sách thuộc tính hồ sơ
  const dict = res.data!.dict.filter((t) => !THUOC_TINH_TU_COT.includes(t.ma) && (t.domain === null || customer.domains.includes(t.domain)));
  const tenNghiaVu = (d: Diagnostic) => entities.find((e) => e.id === d.entity_id)?.ten_entity ?? COPY.page.xacNhan.title;

  const count = (items: Diagnostic[], pred: (d: Diagnostic) => boolean) => items.filter(pred).length;
  const nTrangThai = (s: TrangThaiApDung) => count(diagnostics, (d) => d.trang_thai_ap_dung === s);
  // Cùng cách đếm với bảng "Theo phòng ban" và trang Xác nhận nghĩa vụ (kể cả nghĩa vụ chưa có việc cần làm)
  const choXacNhan = count(diagnostics, (d) => d.trang_thai_duyet === "cho_duyet" && d.trang_thai_ap_dung !== "khong_ap_dung");
  const daGiao = count(diagnostics, (d) => d.trang_thai_duyet === "da_duyet");
  const canBoSung = nTrangThai("chua_du_thong_tin");
  // Mức hoàn thiện hồ sơ: thông tin đã trả lời rõ (khác "Chưa chắc" / chưa trả lời) trên tổng của lĩnh vực đang theo dõi
  const daDien = dict.filter((t) => customer.thuoc_tinh[t.ma] !== undefined && customer.thuoc_tinh[t.ma] !== null).length;
  const hoanThien = dict.length ? Math.round((daDien / dict.length) * 100) : 0;
  // Mới trong 7 ngày qua: theo diagnostics.created_at (ngày nghĩa vụ được xác định cho công ty)
  const moc = bayGio - BAY_NGAY;
  const moi7Ngay = diagnostics
    .filter((d) => d.trang_thai_ap_dung !== "khong_ap_dung" && new Date(d.created_at).getTime() >= moc)
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
  const moiCapNhat = [...diagnostics].sort((a, b) => b.updated_at.localeCompare(a.updated_at)).slice(0, 5);
  const K = TONG_QUAN.kpi;

  return (
    <>
      {/* Thông tin doanh nghiệp: dải đầu nhóm duy nhất của màn */}
      <section aria-labelledby="dn-title">
        <GroupHeader
          id="dn-title"
          title={customer.ten_cong_ty}
          subtitle={TONG_QUAN.dongPhu(
            tenNganh,
            customer.quy_mo ? QUY_MO_LABEL[customer.quy_mo].toLowerCase() : TONG_QUAN.chuaKhai,
            departments.length,
            customer.domains.map(domainLabel).join(", ") || TONG_QUAN.chuaKhai,
          )}
        />
        <details className="border-x border-b bg-card px-4 py-3 text-sm">
          <summary className="cursor-pointer text-muted-foreground">{TONG_QUAN.xemHoSo(daDien, dict.length)}</summary>
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

      {canBoSung > 0 && (
        <p className="flex flex-wrap items-center justify-between gap-2 border bg-card px-4 py-3 text-sm">
          <span>{TONG_QUAN.canBoSung(canBoSung)}</span>
          <Link href="/duyet-diagnostic#hoi-bo-sung" className={buttonVariants({ variant: "outline", size: "sm" })}>
            {COPY.action.traLoi}
          </Link>
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard featured label={K.apDung} value={nTrangThai("ap_dung")} icon={ShieldAlert} hint={K.apDungPhu(choXacNhan, daGiao)} />
        <KpiCard label={K.sap} value={nTrangThai("sap_ap_dung")} icon={Clock} />
        <KpiCard label={K.canBoSung} value={canBoSung} icon={CircleHelp} attention={canBoSung > 0} hint={canBoSung > 0 ? K.canBoSungPhu : undefined} />
        <KpiCard label={K.hoSo} value={`${hoanThien}%`} icon={ClipboardCheck} hint={K.hoSoPhu(daDien, dict.length)} />
      </div>

      {/* Phân bổ nghĩa vụ theo trạng thái — 1 thanh xếp chồng + chú giải có số */}
      <section className="space-y-3 border bg-card p-4" aria-labelledby="phan-bo">
        <h2 id="phan-bo" className="text-base font-semibold">
          {TONG_QUAN.bieuDo}
        </h2>
        {diagnostics.length === 0 ? (
          <p className="text-sm text-muted-foreground">{TONG_QUAN.bieuDoRong}</p>
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
          {TONG_QUAN.theoPhong}
        </h2>
        <div className="border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{TONG_QUAN.cot.phong}</TableHead>
                <TableHead className="text-right">{TONG_QUAN.cot.apDung}</TableHead>
                <TableHead className="text-right">{TONG_QUAN.cot.sap}</TableHead>
                <TableHead className="text-right">{TONG_QUAN.cot.canBoSung}</TableHead>
                <TableHead className="text-right">{TONG_QUAN.cot.cho}</TableHead>
                <TableHead className="text-right">{TONG_QUAN.cot.da}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {departments.map((dept) => {
                const items = diagnostics.filter((d) => d.department_id === dept.id);
                const n = (s: TrangThaiApDung) => count(items, (d) => d.trang_thai_ap_dung === s);
                const cho = count(items, (d) => d.trang_thai_duyet === "cho_duyet" && d.trang_thai_ap_dung !== "khong_ap_dung");
                // Bấm cả hàng → Xác nhận nghĩa vụ, chọn sẵn tab phòng ban (link ở tên vẫn dùng được bằng bàn phím)
                const href = `/duyet-diagnostic#${dept.id}`;
                return (
                  <TableRow key={dept.id} className="cursor-pointer" onClick={() => router.push(href)}>
                    <TableCell>
                      <Link href={href} onClick={(e) => e.stopPropagation()} className="font-medium hover:text-gold-text hover:underline">
                        {dept.ten_phong_ban}
                      </Link>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      <SoLieu n={n("ap_dung")} />
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      <SoLieu n={n("sap_ap_dung")} />
                    </TableCell>
                    <TableCell className={cn("text-right tabular-nums", n("chua_du_thong_tin") > 0 && "font-semibold text-status-ap-dung")}>
                      <SoLieu n={n("chua_du_thong_tin")} />
                    </TableCell>
                    <TableCell className={cn("text-right tabular-nums", cho > 0 && "font-semibold text-status-ap-dung")}>
                      <SoLieu n={cho} />
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      <SoLieu n={count(items, (d) => d.trang_thai_duyet === "da_duyet")} />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </section>

      {/* Mới trong 7 ngày qua (buổi mentoring) — kèm ngày */}
      <section className="space-y-3" aria-labelledby="moi-7-ngay">
        <h2 id="moi-7-ngay" className="text-base font-semibold">
          {TONG_QUAN.moi7Ngay}
        </h2>
        {moi7Ngay.length === 0 ? (
          <p className="border bg-card px-4 py-3 text-sm text-muted-foreground">{TONG_QUAN.moi7NgayRong}</p>
        ) : (
          <ItemList>
            {moi7Ngay.map((d) => (
              <ItemRow
                key={d.id}
                title={tenNghiaVu(d)}
                href={`/duyet-diagnostic#diag-${d.id}`}
                right={
                  <>
                    <span className="text-xs text-muted-foreground tabular-nums">{formatDate(d.created_at)}</span>
                    <DuyetBadge status={d.trang_thai_duyet} />
                  </>
                }
              />
            ))}
          </ItemList>
        )}
      </section>

      <section className="space-y-3" aria-labelledby="moi-cap-nhat">
        <div className="flex items-baseline justify-between gap-2">
          <h2 id="moi-cap-nhat" className="text-base font-semibold">
            {TONG_QUAN.moiCapNhat}
          </h2>
          <Link href="/duyet-diagnostic" className={buttonVariants({ variant: "link", size: "sm" })}>
            {COPY.action.viewAll}
          </Link>
        </div>
        {moiCapNhat.length === 0 ? (
          <p className="border bg-card px-4 py-3 text-sm text-muted-foreground">{COPY.state.noObligations}</p>
        ) : (
          <ItemList>
            {moiCapNhat.map((d) => (
              <ItemRow
                key={d.id}
                title={tenNghiaVu(d)}
                hint={d.trang_thai_ap_dung === "khong_ap_dung" ? COPY.term.hetHieuLuc : undefined}
                muted={d.trang_thai_ap_dung === "khong_ap_dung"}
                href={`/duyet-diagnostic#diag-${d.id}`}
                // Như dòng thu gọn ở Xác nhận nghĩa vụ: chỉ 1 badge (trạng thái xác nhận)
                right={<DuyetBadge status={d.trang_thai_duyet} />}
              />
            ))}
          </ItemList>
        )}
      </section>
    </>
  );
}
