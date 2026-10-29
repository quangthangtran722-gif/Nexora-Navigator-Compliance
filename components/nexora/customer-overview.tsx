"use client";

import { useState } from "react";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { ErrorBlock, LoadingBlock } from "@/components/nexora/data-state";
import { GroupHeader } from "@/components/nexora/group-header";
import { ItemList, ItemRow } from "@/components/nexora/item-row";
import { DuyetBadge } from "@/components/nexora/status-badges";
import { COPY, TONG_QUAN } from "@/lib/copy";
import { domainLabel, formatDate, QUY_MO_LABEL, TRANG_THAI_AP_DUNG_LABEL } from "@/lib/labels";
import { useAuth } from "@/lib/auth/auth-provider";
import { combine } from "@/lib/data/errors";
import { getCustomer, getDepartments, getDiagnostics, getEntities, getNganh, getThuocTinhHoSo } from "@/lib/data/queries";
import { useQuery } from "@/lib/data/use-query";
import { CountUp } from "@/lib/use-count-up";
import { formatGiaTri } from "@/lib/thuoc-tinh-format";
import type { Diagnostic, TrangThaiApDung } from "@/lib/types";
import { THUOC_TINH_TU_COT } from "@/lib/pipeline/ruleEngine";
import { cn } from "@/lib/utils";

/*
 * Tổng quan doanh nghiệp — đọc dữ liệu thật của tài khoản đang đăng nhập (RLS chỉ trả công ty này).
 * Bố cục (nâng cấp trước Chung kết): GroupHeader thông tin DN (+ vòng hoàn thiện hồ sơ) · con số chính trên nền espresso
 * cạnh phân bổ trạng thái · danh sách phòng ban có thanh (bấm → Xác nhận nghĩa vụ, chọn sẵn tab) · Mới trong 7 ngày | Mới cập nhật.
 * Mỗi khối mở bằng nhãn eyebrow vàng. Chữ: lib/copy.ts.
 */

const AP_DUNG_ORDER: TrangThaiApDung[] = ["ap_dung", "sap_ap_dung", "chua_du_thong_tin", "khong_ap_dung"];
// Biểu đồ dùng màu thanh riêng của từng trạng thái (--status-*-bar), không dùng --chart-*
const BAR_COLOR: Record<TrangThaiApDung, string> = {
  ap_dung: "bg-status-ap-dung-bar", // espresso (tối: kem) — con số chính, không dùng đỏ
  sap_ap_dung: "bg-status-sap-ap-dung-bar", // vàng
  chua_du_thong_tin: "bg-status-chua-du-tt",
  khong_ap_dung: "bg-status-khong-ap-dung-bar", // xám ấm, không dùng xám xanh của badge bản sáng
};
const BAY_NGAY = 7 * 24 * 60 * 60 * 1000;

export function CustomerOverview() {
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
  if (res.loading) return <LoadingBlock kieu="tongQuan" />;
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
  const apDung = nTrangThai("ap_dung");
  // Phòng nhiều nghĩa vụ nhất (không tính Không áp dụng) — mốc 100% cho thanh từng phòng
  const maxPhong = Math.max(1, ...departments.map((p) => count(diagnostics, (d) => d.department_id === p.id && d.trang_thai_ap_dung !== "khong_ap_dung")));

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
        {/* Mức hoàn thiện hồ sơ: vòng nhỏ cạnh link xem hồ sơ — nhẹ, không thành thẻ số riêng */}
        <details className="border-x border-b bg-card px-4 py-3 text-sm">
          <summary className="flex cursor-pointer items-center gap-2.5 text-muted-foreground transition-colors hover:text-gold-text">
            <VongHoanThien pct={hoanThien} label={K.hoSo} />
            {TONG_QUAN.xemHoSo(daDien, dict.length)}
          </summary>
          <dl className="mt-3 grid max-w-4xl gap-x-6 gap-y-1.5 sm:grid-cols-[1fr_auto]">
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
        <p className="flex flex-wrap items-center justify-between gap-2 border border-l-[3px] border-l-attention bg-card px-4 py-3 text-sm">
          <span>{TONG_QUAN.canBoSung(canBoSung)}</span>
          <Link href="/duyet-diagnostic#hoi-bo-sung" className={buttonVariants({ variant: "outline", size: "sm" })}>
            {COPY.action.traLoi}
          </Link>
        </p>
      )}

      {/* Con số chính trên bề mặt espresso (trái) + phân bổ theo trạng thái (phải).
          Sắp hiệu lực / cần bổ sung chỉ là 1 dòng nhỏ dưới số chính, không chiếm thẻ riêng khi = 0 */}
      <section className="grid gap-px border bg-border lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]" aria-labelledby="so-chinh">
        <div className="flex flex-col justify-between gap-6 bg-group-solid p-5 sm:p-6">
          <h2 id="so-chinh" className="eyebrow text-group-edge!">
            {K.apDung}
          </h2>
          <div className="space-y-2">
            <p className="text-[56px] leading-none font-extrabold text-group-title tabular-nums sm:text-[64px]">
              <CountUp to={apDung} />
            </p>
            <p className="text-sm text-group-sub tabular-nums">{K.apDungPhu(choXacNhan, daGiao)}</p>
          </div>
          <p className="text-xs text-group-sub tabular-nums">
            {nTrangThai("sap_ap_dung")} {TONG_QUAN.phu.sap} · {canBoSung} {TONG_QUAN.phu.canBoSung}
          </p>
        </div>
        <div className="space-y-5 bg-card p-5 sm:p-6">
          <h2 id="phan-bo" className="eyebrow">
            {TONG_QUAN.bieuDo}
          </h2>
          {diagnostics.length === 0 ? (
            <p className="text-sm text-muted-foreground">{TONG_QUAN.bieuDoRong}</p>
          ) : (
            <>
              <div className="flex h-3 w-full animate-grow-x gap-px bg-border" role="img" aria-label={AP_DUNG_ORDER.map((s) => `${TRANG_THAI_AP_DUNG_LABEL[s]}: ${nTrangThai(s)}`).join(", ")}>
                {AP_DUNG_ORDER.filter((s) => nTrangThai(s) > 0).map((s) => (
                  <div key={s} className={BAR_COLOR[s]} style={{ width: `${(nTrangThai(s) / diagnostics.length) * 100}%` }} />
                ))}
              </div>
              <ul className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4">
                {AP_DUNG_ORDER.map((s) => (
                  <li key={s} className={cn("space-y-1.5", nTrangThai(s) === 0 && "opacity-50")}>
                    <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <span className={cn("size-2 shrink-0", BAR_COLOR[s])} aria-hidden />
                      {TRANG_THAI_AP_DUNG_LABEL[s]}
                    </span>
                    <span className="block text-2xl leading-none font-bold tabular-nums">{nTrangThai(s)}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </section>

      {/* Theo phòng ban: danh sách có thanh nhỏ thay bảng 6 cột (bảng cũ cuộn ngang ở màn hẹp).
          Bấm dòng → Xác nhận nghĩa vụ, chọn sẵn tab phòng ban */}
      <section className="space-y-3" aria-labelledby="theo-phong">
        <h2 id="theo-phong" className="eyebrow">
          {TONG_QUAN.theoPhong}
        </h2>
        <ul className="border bg-card [&>li+li]:border-t">
          {departments.map((dept, i) => {
            const items = diagnostics.filter((d) => d.department_id === dept.id);
            const n = (s: TrangThaiApDung) => count(items, (d) => d.trang_thai_ap_dung === s);
            const cho = count(items, (d) => d.trang_thai_duyet === "cho_duyet" && d.trang_thai_ap_dung !== "khong_ap_dung");
            const da = count(items, (d) => d.trang_thai_duyet === "da_duyet");
            const tong = n("ap_dung") + n("sap_ap_dung") + n("chua_du_thong_tin");
            return (
              <li key={dept.id} className="animate-rise" style={{ "--d": `${i * 60}ms` } as React.CSSProperties}>
                <Link
                  href={`/duyet-diagnostic#${dept.id}`}
                  className="grid gap-x-6 gap-y-2 px-4 py-3 transition-[background-color,box-shadow] outline-none hover:bg-accent hover:shadow-[inset_2px_0_0_var(--gold-edge)] focus-visible:ring-3 focus-visible:ring-ring/50 sm:grid-cols-[minmax(8rem,13rem)_minmax(0,1fr)_auto] sm:items-center"
                >
                  <span className="font-medium">{dept.ten_phong_ban}</span>
                  {/* Thanh dài theo số nghĩa vụ của phòng so với phòng nhiều nhất */}
                  <span className="flex h-2 bg-muted" aria-hidden>
                    {tong > 0 && (
                      <span className="flex h-full animate-grow-x gap-px" style={{ width: `${(tong / maxPhong) * 100}%`, "--d": `${i * 60 + 120}ms` } as React.CSSProperties}>
                        {(["ap_dung", "sap_ap_dung", "chua_du_thong_tin"] as const)
                          .filter((s) => n(s) > 0)
                          .map((s) => (
                            <span key={s} className={BAR_COLOR[s]} style={{ width: `${(n(s) / tong) * 100}%` }} />
                          ))}
                      </span>
                    )}
                  </span>
                  <span className="flex flex-wrap gap-x-3 text-xs text-muted-foreground tabular-nums sm:justify-end">
                    <span>
                      <b className="text-sm font-bold text-foreground">{n("ap_dung") + n("sap_ap_dung")}</b> {TONG_QUAN.dem.apDung}
                    </span>
                    <span className={cn(cho > 0 && "font-semibold text-attention")}>
                      {cho} {TONG_QUAN.dem.cho}
                    </span>
                    <span>
                      {da} {TONG_QUAN.dem.da}
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      {/* Hai danh sách ngắn đặt cạnh nhau ở màn rộng — bớt chiều dài trang */}
      <div className="grid gap-8 xl:grid-cols-2">
        <section className="space-y-3" aria-labelledby="moi-7-ngay">
          <h2 id="moi-7-ngay" className="eyebrow min-h-7">
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
          <div className="flex min-h-7 items-center justify-between gap-2">
            <h2 id="moi-cap-nhat" className="eyebrow">
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
      </div>
    </>
  );
}

// Vòng mức hoàn thiện hồ sơ (24px): rãnh border, phần đã điền vàng. Số đã có trong chữ bên cạnh
function VongHoanThien({ pct, label }: { pct: number; label: string }) {
  const C = 2 * Math.PI * 9;
  return (
    <svg viewBox="0 0 24 24" className="size-6 shrink-0 -rotate-90" role="img" aria-label={`${label}: ${pct}%`}>
      <circle cx="12" cy="12" r="9" fill="none" strokeWidth="3" className="stroke-border" />
      <circle cx="12" cy="12" r="9" fill="none" strokeWidth="3" className="stroke-primary" strokeDasharray={`${(pct / 100) * C} ${C}`} />
    </svg>
  );
}
