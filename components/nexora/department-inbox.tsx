"use client";

import { useState } from "react";

import { ErrorBlock, LoadingBlock } from "@/components/nexora/data-state";
import { DiagnosticBody } from "@/components/nexora/diagnostic-body";
import { EmptyGroupLine, GroupHeader } from "@/components/nexora/group-header";
import { ItemList, ItemMeta, ItemRow } from "@/components/nexora/item-row";
import { ApDungBadge } from "@/components/nexora/status-badges";
import { TabBar } from "@/components/nexora/tab-bar";
import { formatDateTime } from "@/lib/labels";
import { useAuth } from "@/lib/auth/auth-provider";
import { COPY, THONG_BAO } from "@/lib/copy";
import { combine } from "@/lib/data/errors";
import { markNotificationRead } from "@/lib/data/mutations";
import { getChunks, getDepartments, getDiagnostics, getEntities, getEntityGraph, getNotifications, getThuocTinhHoSo, getVanBanList } from "@/lib/data/queries";
import { useQuery } from "@/lib/data/use-query";
import type { GiaiDoanThongBao, Notification } from "@/lib/types";

/*
 * Thông báo (URL /hop-thu giữ nguyên) — 3 giai đoạn (CONTRACT §3.8), gom theo giai đoạn; chữ ở lib/copy.ts:
 *  Cần xác nhận (cho_duyet) · Cần bổ sung thông tin (hoi_bo_sung) → xử lý ở Xác nhận nghĩa vụ (mở đúng mục)
 *  Đã giao việc (da_giao) → phòng ban nhận nghĩa vụ đã xác nhận, mở tại chỗ để đọc
 * Client chỉ được update({ da_doc: true }).
 */

const ALL = "tat-ca";
const GROUPS: GiaiDoanThongBao[] = ["cho_duyet", "hoi_bo_sung", "da_giao"];

export function DepartmentInbox() {
  const { customerId } = useAuth(); // RequireRole đảm bảo đã là customer có customer_id
  const [loc, setLoc] = useState<string>(ALL); // tat-ca | chua-doc | da-doc
  const [openId, setOpenId] = useState<string | null>(null);
  const res = useQuery(
    () =>
      combine({
        departments: getDepartments(customerId!),
        notifications: getNotifications(customerId!),
        diagnostics: getDiagnostics(customerId!),
        entities: getEntities(),
        graph: getEntityGraph(),
        dict: getThuocTinhHoSo(),
        chunks: getChunks(),
        vanBan: getVanBanList(),
      }),
    [customerId],
  );
  const refresh = res.reload;
  if (res.loading) return <LoadingBlock />;
  if (res.error) return <ErrorBlock error={res.error} onRetry={refresh} />;
  const { departments, notifications, diagnostics, entities, graph, dict, chunks, vanBan } = res.data!;

  // Thông báo "chờ duyệt" / "hỏi bổ sung" là việc cần làm: khi diagnostic đã được xử lý (duyệt / từ chối / đã trả lời)
  // thì thông báo đó hết hiệu lực → ẩn khỏi nhóm (mục đã duyệt có thông báo "Đã giao" riêng). Trước đây mục "Đã duyệt"
  // vẫn nằm trong nhóm "Chờ duyệt" vì nhóm chỉ lọc theo notifications.giai_doan, không xét trạng thái hiện tại của diagnostic.
  // Thêm: nghĩa vụ không còn (hoặc đã thành "Không áp dụng" — vd dòng trùng phòng ban được backend gỡ khi phân lại
  // phòng) thì thông báo cần xác nhận / cần bổ sung cũng hết việc — cùng cách đếm với trang Xác nhận nghĩa vụ.
  const daXuLy = (n: Notification) => {
    const d = diagnostics.find((x) => x.id === n.diagnostic_id);
    if (n.giai_doan === "da_giao") return false;
    if (!d || d.trang_thai_ap_dung === "khong_ap_dung") return true;
    if (n.giai_doan === "cho_duyet") return d.trang_thai_duyet !== "cho_duyet";
    if (n.giai_doan === "hoi_bo_sung") return d.trang_thai_ap_dung !== "chua_du_thong_tin";
    return false;
  };
  const conHieuLuc = notifications.filter((n) => !daXuLy(n));
  const soChuaDoc = conHieuLuc.filter((n) => !n.da_doc).length;
  const tenVanBanOf = (n: Notification) => {
    const entity = entities.find((e) => e.id === diagnostics.find((x) => x.id === n.diagnostic_id)?.entity_id);
    return vanBan.find((v) => v.id === chunks.find((c) => c.id === entity?.chunk_id)?.van_ban_id)?.ten_van_ban;
  };
  const hopLoc = (n: Notification) => loc === ALL || (loc === "chua-doc" ? !n.da_doc : n.da_doc);

  async function markRead(n: Notification) {
    if (n.da_doc) return;
    await markNotificationRead(n.id);
    refresh();
  }

  return (
    <TabBar
      label="Lọc thông báo"
      value={loc}
      onValueChange={setLoc}
      items={[
        { value: ALL, label: THONG_BAO.loc.all, count: conHieuLuc.length, countTone: "neutral" },
        { value: "chua-doc", label: THONG_BAO.loc.unread, count: soChuaDoc, countTone: "action" },
        { value: "da-doc", label: THONG_BAO.loc.read },
      ]}
    >
      {conHieuLuc.length === 0 && <p className="border bg-card px-4 py-8 text-center text-sm text-muted-foreground">{COPY.state.noNotifications}</p>}
      {conHieuLuc.length > 0 &&
        GROUPS.map((giaiDoan) => {
        const g = { giaiDoan, ...THONG_BAO.nhom[giaiDoan] };
        const items = conHieuLuc.filter((n) => n.giai_doan === g.giaiDoan && hopLoc(n));
        if (items.length === 0) return <EmptyGroupLine key={g.giaiDoan} title={g.title} text={loc === ALL ? g.empty : THONG_BAO.khongKhopLoc} />;
        const chuaDoc = items.filter((n) => !n.da_doc).length;
        // Mọi mục cùng 1 văn bản → đưa tên văn bản lên dòng phụ của dải đầu nhóm, không lặp ở từng dòng
        const vbs = [...new Set(items.map(tenVanBanOf))];
        const vbChung = vbs.length === 1 ? vbs[0] : undefined;
        return (
          <section key={g.giaiDoan} aria-labelledby={`gd-${g.giaiDoan}`}>
            <GroupHeader
              id={`gd-${g.giaiDoan}`}
              title={g.title}
              subtitle={vbChung ?? g.subtitle}
              counts={[
                ...(chuaDoc > 0 ? [{ label: THONG_BAO.chuaDoc, n: chuaDoc, tone: "action" as const }] : []),
                { label: THONG_BAO.thongBao, n: items.length },
              ]}
            />
            <ItemList className="border-t-0">
              {items.map((n) => {
                const d = diagnostics.find((x) => x.id === n.diagnostic_id);
                const entity = entities.find((e) => e.id === d?.entity_id);
                const tenVanBan = tenVanBanOf(n);
                const dept = departments.find((x) => x.id === n.department_id);
                const title = entity?.ten_entity ?? n.tieu_de;
                // Không lặp badge trùng tên nhóm; chỉ hiện trạng thái áp dụng khi khác thường
                const right = (
                  <>
                    {d && g.giaiDoan === "da_giao" && d.trang_thai_ap_dung !== "ap_dung" && <ApDungBadge status={d.trang_thai_ap_dung} />}
                    <span className="text-xs text-muted-foreground tabular-nums">{formatDateTime(n.created_at)}</span>
                  </>
                );

                // Cần xác nhận / cần bổ sung: dẫn sang Xác nhận nghĩa vụ, mở đúng mục đó
                if (g.giaiDoan !== "da_giao") {
                  return (
                    <ItemRow
                      key={n.id}
                      title={title}
                      unread={!n.da_doc}
                      right={right}
                      hint={
                        g.giaiDoan === "hoi_bo_sung" && n.noi_dung
                          ? THONG_BAO.cauHoi(n.noi_dung.split(",").map((ma) => dict.find((t) => t.ma === ma.trim())?.cau_hoi).filter(Boolean).join(" · "))
                          : vbChung
                            ? undefined
                            : tenVanBan
                      }
                      href={g.giaiDoan === "hoi_bo_sung" ? "/duyet-diagnostic#hoi-bo-sung" : `/duyet-diagnostic#diag-${n.diagnostic_id}`}
                      onNavigate={() => markRead(n)}
                    />
                  );
                }

                // Đã giao việc: mở tại chỗ để phòng ban đọc việc cần làm; mở = đã đọc
                return (
                  <ItemRow
                    key={n.id}
                    title={title}
                    unread={!n.da_doc}
                    muted={d?.trang_thai_ap_dung === "khong_ap_dung"}
                    right={right}
                    prominent
                    open={openId === n.id}
                    onToggle={() => {
                      setOpenId((cur) => (cur === n.id ? null : n.id));
                      markRead(n);
                    }}
                  >
                    <ItemMeta>
                      {d && <ApDungBadge status={d.trang_thai_ap_dung} />}
                      {dept && <span>{THONG_BAO.giaoCho(dept.ten_phong_ban)}{dept.email_head ? ` (${dept.email_head})` : ""}</span>}
                      {entity && (
                        <span>
                          {entity.dieu_khoan}
                          {tenVanBan && ` — ${tenVanBan}`}
                        </span>
                      )}
                    </ItemMeta>
                    {d && (
                      <DiagnosticBody
                        noiDung={d.noi_dung_diagnostic}
                        entity={entity}
                        nguon={tenVanBan}
                        context={graph.filter((x) => x.target_id === d.entity_id && x.source_trang_thai_duyet === "da_duyet")}
                        entities={entities}
                        prominent
                      />
                    )}
                  </ItemRow>
                );
              })}
            </ItemList>
          </section>
        );
      })}
    </TabBar>
  );
}
