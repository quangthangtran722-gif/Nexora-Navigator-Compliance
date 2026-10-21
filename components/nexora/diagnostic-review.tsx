"use client";

import { useEffect, useState } from "react";
import { ListChecks, Send } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ErrorBlock, LoadingBlock } from "@/components/nexora/data-state";
import { DiagnosticBody } from "@/components/nexora/diagnostic-body";
import { EmptyGroupLine, GroupHeader } from "@/components/nexora/group-header";
import { HoiBoSungCard } from "@/components/nexora/hoi-bo-sung";
import { ItemActions, ItemList, ItemMeta, ItemRow } from "@/components/nexora/item-row";
import { ApDungBadge, DuyetBadge } from "@/components/nexora/status-badges";
import { TabBar } from "@/components/nexora/tab-bar";
import { ViSaoApDung } from "@/components/nexora/vi-sao-ap-dung";
import { COPY, XAC_NHAN } from "@/lib/copy";
import { TRANG_THAI_AP_DUNG_LABEL } from "@/lib/labels";
import { useAuth } from "@/lib/auth/auth-provider";
import { combine, useErrorHandler } from "@/lib/data/errors";
import {
  getChunks,
  getCustomer,
  getDepartments,
  getDiagnostics,
  getEntities,
  getEntityGraph,
  getLyDoDoiChieu,
  getThuocTinhHoSo,
  getVanBanList,
  type LyDoDoiChieu,
} from "@/lib/data/queries";
import { useQuery } from "@/lib/data/use-query";
import { generateAll, PipelineError, toAppError } from "@/lib/data/pipeline";
import { rpc } from "@/lib/data/rpc";
import type { Department, Diagnostic, Entity, EntityGraphRow, ThuocTinhHoSo, TrangThaiApDung } from "@/lib/types";

/*
 * Xác nhận nghĩa vụ (URL /duyet-diagnostic giữ nguyên) — người phụ trách tuân thủ xác nhận nghĩa vụ (CONTRACT §3.6).
 *  chua_du_thong_tin → khối "Cần bổ sung thông tin" ở đầu trang
 *  ap_dung / sap_ap_dung, chưa có việc cần làm → "Tạo việc cần làm"
 *  ap_dung / sap_ap_dung, có việc cần làm → xác nhận qua RPC approve_diagnostic (có thể đổi phòng nhận)
 *  khong_ap_dung → mục hết hiệu lực sau lần cập nhật: gạch đi, chỉ hiện khi lọc "Không áp dụng"
 * Link vào trang: #<id phòng ban> chọn sẵn tab phòng ban; #diag-<id> mở sẵn đúng nghĩa vụ.
 */

// Thứ tự trong mỗi phòng: việc cần làm trước
const RANK: Record<TrangThaiApDung, number> = { ap_dung: 0, sap_ap_dung: 1, chua_du_thong_tin: 2, khong_ap_dung: 3 };
const STATUSES: TrangThaiApDung[] = ["ap_dung", "sap_ap_dung", "chua_du_thong_tin", "khong_ap_dung"];
const ALL = "tat-ca";
const LOC_ITEMS = [{ value: ALL, label: XAC_NHAN.locTatCa }, ...STATUSES.map((s) => ({ value: s, label: TRANG_THAI_AP_DUNG_LABEL[s] }))];

// Đếm chờ xác nhận / đã giao việc / không liên quan (bỏ mục đã hết hiệu lực)
const demDuyet = (ds: Diagnostic[]) => {
  const conHieuLuc = ds.filter((d) => d.trang_thai_ap_dung !== "khong_ap_dung");
  return {
    cho: conHieuLuc.filter((d) => d.trang_thai_duyet === "cho_duyet").length,
    da: conHieuLuc.filter((d) => d.trang_thai_duyet === "da_duyet").length,
    tuChoi: conHieuLuc.filter((d) => d.trang_thai_duyet === "tu_choi").length,
  };
};

const hashNow = () => (typeof window !== "undefined" ? window.location.hash.slice(1) : "");

export function DiagnosticReview() {
  const { customerId } = useAuth(); // RequireRole đảm bảo đã là doanh nghiệp có customer_id
  const [flash, setFlash] = useState<string | null>(null);
  // #<id phòng ban> (từ bảng "Theo phòng ban" ở Tổng quan) → chọn sẵn tab đó
  const [tab, setTab] = useState<string>(() => (hashNow() && !hashNow().startsWith("diag-") ? hashNow() : ALL));
  const [loc, setLoc] = useState<string>(ALL); // lọc trạng thái áp dụng
  // Mặc định thu gọn tất cả; đi từ Thông báo / Tổng quan (#diag-<id>) thì mở sẵn đúng mục đó
  const [openId, setOpenId] = useState<string | null>(() => (hashNow().startsWith("diag-") ? hashNow().slice("diag-".length) : null));
  // Đọc lại từ DB sau mỗi thao tác (xác nhận, trả lời câu hỏi bổ sung → /filter → /generate)
  const res = useQuery(
    () =>
      combine({
        customer: getCustomer(customerId!),
        departments: getDepartments(customerId!),
        diagnostics: getDiagnostics(customerId!),
        entities: getEntities(),
        graph: getEntityGraph(),
        dict: getThuocTinhHoSo(),
        chunks: getChunks(),
        vanBan: getVanBanList(),
        lyDo: getLyDoDoiChieu(customerId!),
      }),
    [customerId],
  );
  const refresh = res.reload;
  // Dữ liệu tải xong mới có phần tử để cuộn tới
  useEffect(() => {
    if (!res.loading && openId && window.location.hash === `#diag-${openId}`) document.getElementById(`diag-${openId}`)?.scrollIntoView({ block: "start" });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- chỉ cuộn 1 lần khi vừa tải xong
  }, [res.loading]);
  if (res.loading) return <LoadingBlock />;
  if (res.error) return <ErrorBlock error={res.error} onRetry={refresh} />;
  const { customer, departments, diagnostics, entities, graph, dict, chunks, vanBan, lyDo } = res.data!;

  const vanBanOf = (e?: Entity) => vanBan.find((v) => v.id === chunks.find((c) => c.id === e?.chunk_id)?.van_ban_id);
  const contextOf = (entityId: string) => graph.filter((g) => g.target_id === entityId && g.source_trang_thai_duyet === "da_duyet");

  // Cần bổ sung thông tin: gộp theo nghĩa vụ (nhiều phòng ban cùng 1 câu hỏi)
  const thieuTheoEntity = new Map<string, string[]>();
  for (const d of diagnostics.filter((x) => x.trang_thai_ap_dung === "chua_du_thong_tin")) {
    thieuTheoEntity.set(d.entity_id, [...new Set([...(thieuTheoEntity.get(d.entity_id) ?? []), ...d.thuoc_tinh_thieu])]);
  }

  // Tab trên link không còn tồn tại (phòng ban đã đổi) → về "Tất cả"
  const tabHienTai = tab === ALL || departments.some((d) => d.id === tab) ? tab : ALL;
  // Mục hết hiệu lực chỉ hiện khi lọc đúng trạng thái "Không áp dụng"
  const hopLoc = (d: Diagnostic) => (loc === ALL ? d.trang_thai_ap_dung !== "khong_ap_dung" : d.trang_thai_ap_dung === loc);
  const itemsOf = (dept: Department) =>
    diagnostics.filter((d) => d.department_id === dept.id && hopLoc(d)).sort((a, b) => RANK[a.trang_thai_ap_dung] - RANK[b.trang_thai_ap_dung]);
  const shown = tabHienTai === ALL ? departments : departments.filter((d) => d.id === tabHienTai);
  const coNghiaVu = shown.filter((d) => itemsOf(d).length > 0);
  const khongNghiaVu = shown.filter((d) => itemsOf(d).length === 0);
  const tong = demDuyet(diagnostics);
  const chuaCoGi = diagnostics.filter((d) => d.trang_thai_ap_dung !== "khong_ap_dung").length === 0;

  return (
    <div className="space-y-6">
      {flash && (
        <p className="border bg-accent px-3 py-2 text-sm" role="status">
          {flash}
        </p>
      )}

      {thieuTheoEntity.size > 0 && (
        <section id="hoi-bo-sung" className="scroll-mt-20 space-y-3">
          <h2 className="text-base font-semibold">{XAC_NHAN.canBoSung(thieuTheoEntity.size)}</h2>
          {[...thieuTheoEntity].map(([entityId, thieu]) => {
            const entity = entities.find((e) => e.id === entityId);
            return !entity ? null : (
              <HoiBoSungCard
                key={entityId}
                customer={customer}
                entity={entity}
                thuocTinhThieu={thieu}
                dict={dict}
                onDone={({ entityTen, status, error }) => {
                  setFlash(error ? `${entityTen}: ${error}` : status ? XAC_NHAN.ketQuaMoi(entityTen, TRANG_THAI_AP_DUNG_LABEL[status]) : XAC_NHAN.daLuuTraLoi(entityTen));
                  refresh();
                }}
              />
            );
          })}
        </section>
      )}

      {chuaCoGi ? (
        <p className="border bg-card px-4 py-8 text-center text-sm text-muted-foreground">{COPY.state.noObligations}</p>
      ) : (
        <TabBar
          label="Phòng ban"
          value={tabHienTai}
          onValueChange={setTab}
          items={[
            { value: ALL, label: "Tất cả", count: tong.cho, countTone: "action" },
            ...departments.map((dept) => ({
              value: dept.id,
              label: dept.ten_phong_ban,
              count: demDuyet(diagnostics.filter((d) => d.department_id === dept.id)).cho,
              countTone: "action" as const,
            })),
          ]}
        >
          {/* Dòng đếm (trái) + lọc trạng thái áp dụng (phải) */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs font-medium text-muted-foreground tabular-nums">{XAC_NHAN.dem(tong.cho, tong.da, tong.tuChoi)}</p>
            <Select items={LOC_ITEMS} value={loc} onValueChange={(v) => setLoc((v as string | null) ?? ALL)}>
              <SelectTrigger size="sm" className="w-56" aria-label="Lọc theo trạng thái">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LOC_ITEMS.map((i) => (
                  <SelectItem key={i.value} value={i.value}>
                    {i.label}
                    {i.value !== ALL && ` (${diagnostics.filter((d) => d.trang_thai_ap_dung === i.value).length})`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {coNghiaVu.map((dept) => {
            const items = itemsOf(dept);
            const dem = demDuyet(items);
            return (
              <section key={dept.id} id={dept.id} className="scroll-mt-20" aria-labelledby={`dept-${dept.id}`}>
                <GroupHeader
                  id={`dept-${dept.id}`}
                  title={dept.ten_phong_ban}
                  subtitle={dept.email_head}
                  counts={[
                    { label: COPY.status.xacNhan.cho_duyet.toLowerCase(), n: dem.cho, tone: "action" },
                    { label: COPY.status.xacNhan.da_duyet.toLowerCase(), n: dem.da },
                  ]}
                />
                <ItemList className="border-t-0">
                  {items.map((d) => {
                    const entity = entities.find((e) => e.id === d.entity_id);
                    const vb = vanBanOf(entity);
                    return (
                      <DiagnosticRow
                        key={d.id}
                        diagnostic={d}
                        entity={entity}
                        tenVanBan={vb?.ten_van_ban}
                        ngayHieuLucVanBan={vb?.ngay_hieu_luc}
                        lyDo={lyDo[d.entity_id]}
                        dict={dict}
                        context={contextOf(d.entity_id)}
                        entities={entities}
                        departments={departments}
                        open={openId === d.id}
                        onToggle={() => setOpenId((cur) => (cur === d.id ? null : d.id))}
                        onChanged={refresh}
                      />
                    );
                  })}
                </ItemList>
              </section>
            );
          })}

          {/* Phòng chưa có nghĩa vụ: 1 dòng xám, không có dải đầu */}
          {khongNghiaVu.length > 0 && (
            <div className="space-y-1">
              {khongNghiaVu.map((dept) => (
                <EmptyGroupLine key={dept.id} title={dept.ten_phong_ban} text={loc === ALL ? XAC_NHAN.phongRong : XAC_NHAN.khongKhopLoc} />
              ))}
            </div>
          )}
        </TabBar>
      )}
    </div>
  );
}

function DiagnosticRow({
  diagnostic: d,
  entity,
  tenVanBan,
  ngayHieuLucVanBan,
  lyDo,
  dict,
  context,
  entities,
  departments,
  open,
  onToggle,
  onChanged,
}: {
  diagnostic: Diagnostic;
  entity: Entity | undefined;
  tenVanBan?: string;
  ngayHieuLucVanBan?: string | null;
  lyDo?: LyDoDoiChieu;
  dict: ThuocTinhHoSo[];
  context: EntityGraphRow[];
  entities: Entity[];
  departments: Department[];
  open: boolean;
  onToggle: () => void;
  onChanged: () => void;
}) {
  const [deptId, setDeptId] = useState(d.department_id);
  const [ghiChu, setGhiChu] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [forbidden, setForbidden] = useState(false);
  const [hoiKhongLienQuan, setHoiKhongLienQuan] = useState(false);
  const handleError = useErrorHandler();

  const hetHieuLuc = d.trang_thai_ap_dung === "khong_ap_dung";
  const chuaDu = d.trang_thai_ap_dung === "chua_du_thong_tin";
  const chuaCoViec = !chuaDu && !hetHieuLuc && d.noi_dung_diagnostic === null;
  // Chỉ xác nhận được khi đang áp dụng / sắp có hiệu lực, đã có việc cần làm, còn chờ xác nhận (CONTRACT §3.6)
  const coTheXacNhan = d.trang_thai_duyet === "cho_duyet" && !chuaDu && !hetHieuLuc && d.noi_dung_diagnostic !== null;

  async function decide(quyet_dinh: "da_duyet" | "tu_choi") {
    setBusy(true);
    const { error } = await rpc("approve_diagnostic", {
      p_diagnostic_id: d.id,
      p_quyet_dinh: quyet_dinh,
      p_department_id: deptId !== d.department_id ? deptId : undefined,
      p_ghi_chu: ghiChu.trim() || undefined,
    });
    setBusy(false);
    setError(handleError(error, { onReload: onChanged, onForbidden: () => setForbidden(true) }));
    if (!error) {
      setHoiKhongLienQuan(false);
      onChanged();
    }
  }

  async function taoViec() {
    setBusy(true);
    try {
      await generateAll({ customer_id: d.customer_id, diagnostic_ids: [d.id] });
      setError(null);
    } catch (e) {
      setError(e instanceof PipelineError ? handleError(toAppError(e), { onForbidden: () => setForbidden(true) }) : COPY.state.saveError);
    }
    setBusy(false);
    onChanged();
  }

  return (
    <ItemRow
      id={`diag-${d.id}`}
      title={entity?.ten_entity ?? COPY.page.xacNhan.title}
      hint={hetHieuLuc ? COPY.term.hetHieuLuc : undefined}
      muted={hetHieuLuc}
      open={open}
      onToggle={onToggle}
      // Thu gọn: chỉ 1 badge (trạng thái xác nhận); trạng thái áp dụng nằm ở dòng meta khi mở
      right={<DuyetBadge status={d.trang_thai_duyet} />}
    >
      <ItemMeta>
        <ApDungBadge status={d.trang_thai_ap_dung} />
        {entity && (
          <span>
            {entity.dieu_khoan}
            {tenVanBan && ` — ${tenVanBan}`}
          </span>
        )}
      </ItemMeta>

      {!chuaDu && <ViSaoApDung lyDo={lyDo} entity={entity} ngayHieuLucVanBan={ngayHieuLucVanBan} dict={dict} />}

      {chuaDu ? (
        <p className="text-sm text-status-chua-du-tt">
          {XAC_NHAN.choTraLoi}{" "}
          <a href="#hoi-bo-sung" className="text-gold-text underline-offset-4 hover:underline">
            {XAC_NHAN.choTraLoiLink}
          </a>
        </p>
      ) : (
        <DiagnosticBody noiDung={d.noi_dung_diagnostic} entity={entity} nguon={tenVanBan} context={context} entities={entities} />
      )}
      {hetHieuLuc && <p className="text-xs text-muted-foreground">{XAC_NHAN.hetHieuLuc}</p>}
      {d.ghi_chu_duyet && <p className="text-xs text-muted-foreground">{XAC_NHAN.ghiChuDaXacNhan(d.ghi_chu_duyet)}</p>}
      {error && (
        <p className="bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      {chuaCoViec && !forbidden && (
        <ItemActions>
          <Button size="sm" disabled={busy} onClick={taoViec}>
            <ListChecks /> {COPY.action.taoViec}
          </Button>
        </ItemActions>
      )}

      {coTheXacNhan && !forbidden && (
        <>
          {/* Dòng nhắc duy nhất về nội dung tạo tự động — ngay trên hàng nút xác nhận (wording mục 1) */}
          <p className="text-xs text-muted-foreground">{COPY.autoContentNotice}</p>
          <ItemActions className="mt-0">
            <div className="mr-auto w-full space-y-1.5 sm:w-56">
              <Label className="text-xs">{XAC_NHAN.giaoCho}</Label>
              <Select
                items={departments.map((x) => ({ value: x.id, label: x.ten_phong_ban }))}
                value={deptId}
                onValueChange={(v) => setDeptId((v as string | null) ?? d.department_id)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {departments.map((x) => (
                    <SelectItem key={x.id} value={x.id}>
                      {x.ten_phong_ban}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Input value={ghiChu} onChange={(e) => setGhiChu(e.target.value)} placeholder={XAC_NHAN.ghiChu} className="w-full sm:w-auto sm:flex-1" aria-label={XAC_NHAN.ghiChu} />
            {/* Phụ trước, chính sát phải. Chỉ 1 dòng mở → chỉ 1 nút ánh kim trên màn */}
            <Button size="sm" variant="outline" disabled={busy} onClick={() => setHoiKhongLienQuan(true)}>
              {COPY.action.khongLienQuan}
            </Button>
            <Button size="sm" disabled={busy} onClick={() => decide("da_duyet")}>
              <Send /> {COPY.action.xacNhanGiao}
            </Button>
          </ItemActions>

          {/* Hộp xác nhận "Không liên quan" (wording mục 3.3) */}
          <Dialog open={hoiKhongLienQuan} onOpenChange={(o) => !busy && setHoiKhongLienQuan(o)}>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>{XAC_NHAN.dialog.title}</DialogTitle>
                <DialogDescription>{XAC_NHAN.dialog.body}</DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <DialogClose render={<Button variant="outline" disabled={busy} />}>{COPY.action.cancel}</DialogClose>
                <Button variant="destructive" disabled={busy} onClick={() => decide("tu_choi")}>
                  {XAC_NHAN.dialog.confirm}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </>
      )}
    </ItemRow>
  );
}
