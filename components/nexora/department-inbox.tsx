"use client";

import { useState } from "react";

import { ErrorBlock, LoadingBlock } from "@/components/nexora/data-state";
import { DiagnosticBody } from "@/components/nexora/diagnostic-body";
import { EmptyGroupLine, GroupHeader } from "@/components/nexora/group-header";
import { ItemList, ItemMeta, ItemRow } from "@/components/nexora/item-row";
import { ApDungBadge, DuyetBadge } from "@/components/nexora/status-badges";
import { TabBar } from "@/components/nexora/tab-bar";
import { formatDateTime } from "@/lib/labels";
import { useAuth } from "@/lib/auth/auth-provider";
import { combine } from "@/lib/data/errors";
import { markNotificationRead } from "@/lib/data/mutations";
import { getChunks, getDepartments, getDiagnostics, getEntities, getEntityGraph, getNotifications, getThuocTinhHoSo, getVanBanList } from "@/lib/data/queries";
import { useQuery } from "@/lib/data/use-query";
import type { GiaiDoanThongBao, Notification } from "@/lib/types";

/*
 * Hộp thư — 3 giai đoạn thông báo (CONTRACT §3.8), gom theo giai đoạn (palette v3 mục 9.10):
 *  Chờ duyệt (cho_duyet) · Hỏi bổ sung (hoi_bo_sung) → người đầu mối xử lý ở /duyet-diagnostic (mở đúng mục)
 *  Đã giao (da_giao) → phòng ban nhận checklist đã duyệt, mở tại chỗ để đọc
 * Client chỉ được update({ da_doc: true }).
 */

const ALL = "tat-ca";
const GROUPS: { giaiDoan: GiaiDoanThongBao; title: string; subtitle: string; empty: string }[] = [
  { giaiDoan: "cho_duyet", title: "Chờ duyệt", subtitle: "Checklist mới cần người đầu mối duyệt trước khi giao phòng ban", empty: "chưa có checklist chờ duyệt" },
  { giaiDoan: "hoi_bo_sung", title: "Hỏi bổ sung", subtitle: "Hệ thống cần thêm thông tin hồ sơ để xác định nghĩa vụ", empty: "chưa có câu hỏi" },
  { giaiDoan: "da_giao", title: "Đã giao", subtitle: "Checklist đã duyệt, đã giao xuống phòng ban", empty: "chưa giao checklist nào" },
];

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

  const soChuaDoc = notifications.filter((n) => !n.da_doc).length;
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
        { value: ALL, label: "Tất cả", count: notifications.length, countTone: "neutral" },
        { value: "chua-doc", label: "Chưa đọc", count: soChuaDoc, countTone: "action" },
        { value: "da-doc", label: "Đã đọc" },
      ]}
    >
      {GROUPS.map((g) => {
        const items = notifications.filter((n) => n.giai_doan === g.giaiDoan && hopLoc(n));
        if (items.length === 0) return <EmptyGroupLine key={g.giaiDoan} title={g.title} text={loc === ALL ? g.empty : "không có thông báo khớp bộ lọc"} />;
        const chuaDoc = items.filter((n) => !n.da_doc).length;
        return (
          <section key={g.giaiDoan} aria-labelledby={`gd-${g.giaiDoan}`}>
            <GroupHeader
              id={`gd-${g.giaiDoan}`}
              title={g.title}
              subtitle={g.subtitle}
              counts={[
                ...(chuaDoc > 0 ? [{ label: "chưa đọc", n: chuaDoc, tone: "action" as const }] : []),
                { label: "thông báo", n: items.length },
              ]}
            />
            <ItemList className="border-t-0">
              {items.map((n) => {
                const d = diagnostics.find((x) => x.id === n.diagnostic_id);
                const entity = entities.find((e) => e.id === d?.entity_id);
                const tenVanBan = vanBan.find((v) => v.id === chunks.find((c) => c.id === entity?.chunk_id)?.van_ban_id)?.ten_van_ban;
                const dept = departments.find((x) => x.id === n.department_id);
                const title = entity?.ten_entity ?? n.tieu_de;
                const right = (
                  <>
                    {d && (g.giaiDoan === "hoi_bo_sung" ? <ApDungBadge status={d.trang_thai_ap_dung} /> : <DuyetBadge status={d.trang_thai_duyet} />)}
                    <span className="text-xs text-muted-foreground tabular-nums">{formatDateTime(n.created_at)}</span>
                  </>
                );

                // Chờ duyệt / hỏi bổ sung: dẫn sang /duyet-diagnostic, mở đúng mục đó
                if (g.giaiDoan !== "da_giao") {
                  return (
                    <ItemRow
                      key={n.id}
                      title={title}
                      unread={!n.da_doc}
                      right={right}
                      hint={
                        g.giaiDoan === "hoi_bo_sung" && n.noi_dung
                          ? `Câu hỏi: ${n.noi_dung.split(",").map((ma) => dict.find((t) => t.ma === ma.trim())?.cau_hoi ?? ma.trim()).join(" · ")}`
                          : tenVanBan
                      }
                      href={g.giaiDoan === "hoi_bo_sung" ? "/duyet-diagnostic#hoi-bo-sung" : `/duyet-diagnostic#diag-${n.diagnostic_id}`}
                      onNavigate={() => markRead(n)}
                    />
                  );
                }

                // Đã giao: mở tại chỗ để phòng ban đọc checklist; mở = đã đọc
                return (
                  <ItemRow
                    key={n.id}
                    title={title}
                    unread={!n.da_doc}
                    muted={d?.trang_thai_ap_dung === "khong_ap_dung"}
                    right={right}
                    open={openId === n.id}
                    onToggle={() => {
                      setOpenId((cur) => (cur === n.id ? null : n.id));
                      markRead(n);
                    }}
                  >
                    <ItemMeta>
                      {d && <ApDungBadge status={d.trang_thai_ap_dung} />}
                      {dept && <span>Giao cho {dept.ten_phong_ban}{dept.email_head ? ` (${dept.email_head})` : ""}</span>}
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
