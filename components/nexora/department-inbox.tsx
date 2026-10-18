"use client";

import Link from "next/link";
import { ArrowRight, Check, Inbox, Mail, MessageCircleQuestion, UserCheck } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ErrorBlock, LoadingBlock } from "@/components/nexora/data-state";
import { DiagnosticBody } from "@/components/nexora/diagnostic-body";
import { ApDungBadge, DuyetBadge } from "@/components/nexora/status-badges";
import { formatDateTime } from "@/lib/labels";
import { useAuth } from "@/lib/auth/auth-provider";
import { combine } from "@/lib/data/errors";
import { markNotificationRead } from "@/lib/data/mutations";
import { getChunks, getDepartments, getDiagnostics, getEntities, getEntityGraph, getNotifications, getThuocTinhHoSo, getVanBanList } from "@/lib/data/queries";
import { useQuery } from "@/lib/data/use-query";
import type { Notification } from "@/lib/types";
import { cn } from "@/lib/utils";

/*
 * Hộp thư — 3 giai đoạn thông báo (CONTRACT §3.8):
 *  Tab "Người đầu mối": hoi_bo_sung (trả lời câu hỏi) + cho_duyet (duyệt checklist) — department_id = null
 *  Tab từng phòng ban:  da_giao — nội dung checklist đã duyệt
 * Client chỉ được update({ da_doc: true }).
 */

const DAU_MOI = "dau-moi";

export function DepartmentInbox() {
  const { customerId } = useAuth(); // RequireRole đảm bảo đã là customer có customer_id
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

  const forTab = (tab: string) => notifications.filter((n) => (tab === DAU_MOI ? n.department_id === null : n.giai_doan === "da_giao" && n.department_id === tab));
  const unread = (tab: string) => forTab(tab).filter((n) => !n.da_doc).length;

  async function markRead(n: Notification) {
    if (n.da_doc) return;
    await markNotificationRead(n.id);
    refresh();
  }

  const tabs = [{ id: DAU_MOI, label: "Người đầu mối", Icon: UserCheck }, ...departments.map((d) => ({ id: d.id, label: d.ten_phong_ban, Icon: Inbox }))];

  return (
    <Tabs defaultValue={DAU_MOI}>
      {/* Màn hẹp: 1 hàng, cuộn ngang thay vì xuống dòng */}
      <div className="-mx-1 overflow-x-auto px-1 pb-1">
        <TabsList className="w-max">
          {tabs.map(({ id, label, Icon }) => (
            <TabsTrigger key={id} value={id}>
              <Icon aria-hidden /> {label}
              {unread(id) > 0 && <Badge className="ml-0.5">{unread(id)}</Badge>}
            </TabsTrigger>
          ))}
        </TabsList>
      </div>

      {/* Người đầu mối: hỏi bổ sung + chờ duyệt */}
      <TabsContent value={DAU_MOI} className="mt-4 space-y-2">
        <p className="text-sm text-muted-foreground">Câu hỏi bổ sung và checklist mới cần người đầu mối xử lý trước khi giao phòng ban.</p>
        {forTab(DAU_MOI).map((n) => {
          const d = diagnostics.find((x) => x.id === n.diagnostic_id);
          const hoiBoSung = n.giai_doan === "hoi_bo_sung";
          // noi_dung của hoi_bo_sung = danh sách mã thuộc tính thiếu → hiện câu hỏi
          const cauHoi = hoiBoSung && n.noi_dung ? n.noi_dung.split(",").map((ma) => dict.find((t) => t.ma === ma.trim())?.cau_hoi ?? ma.trim()) : [];
          const daXuLy = hoiBoSung ? d?.trang_thai_ap_dung !== "chua_du_thong_tin" : d?.trang_thai_duyet !== "cho_duyet";
          return (
            <div key={n.id} className={cn("flex flex-col gap-2 rounded-lg border p-3 sm:flex-row sm:items-center", !n.da_doc && "border-primary/40 bg-accent/50")}>
              <div className="flex-1 space-y-0.5">
                <p className={cn("flex items-center gap-1.5 text-sm", !n.da_doc && "font-medium")}>
                  {!n.da_doc && <span className="inline-block size-2 shrink-0 rounded-full bg-primary" aria-label="Chưa đọc" />}
                  {hoiBoSung && <MessageCircleQuestion className="size-4 shrink-0 text-status-chua-du-tt" aria-hidden />}
                  {n.tieu_de}
                </p>
                {cauHoi.length > 0 && <p className="text-xs text-muted-foreground">Câu hỏi: {cauHoi.join(" · ")}</p>}
                <p className="text-xs text-muted-foreground tabular-nums">{formatDateTime(n.created_at)}</p>
              </div>
              {d && daXuLy ? (
                hoiBoSung ? <ApDungBadge status={d.trang_thai_ap_dung} /> : <DuyetBadge status={d.trang_thai_duyet} />
              ) : (
                <Link
                  href={hoiBoSung ? "/duyet-diagnostic#hoi-bo-sung" : `/duyet-diagnostic#${d?.department_id ?? ""}`}
                  onClick={() => markRead(n)}
                  className={buttonVariants({ variant: "outline", size: "sm" })}
                >
                  {hoiBoSung ? "Trả lời" : "Mở để duyệt"} <ArrowRight />
                </Link>
              )}
            </div>
          );
        })}
        {forTab(DAU_MOI).length === 0 && <EmptyInbox />}
      </TabsContent>

      {/* Từng phòng ban: đã giao */}
      {departments.map((dept) => {
        const items = forTab(dept.id);
        return (
          <TabsContent key={dept.id} value={dept.id} className="mt-4 space-y-3">
            {dept.email_head && (
              <p className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                <Mail className="size-3.5" aria-hidden /> Gửi tới {dept.email_head}
              </p>
            )}
            {items.map((n) => {
              const d = diagnostics.find((x) => x.id === n.diagnostic_id);
              const entity = entities.find((e) => e.id === d?.entity_id);
              const soHieu = vanBan.find((v) => v.id === chunks.find((c) => c.id === entity?.chunk_id)?.van_ban_id)?.so_hieu;
              return (
                <Card key={n.id} className={cn(!n.da_doc && "ring-2 ring-primary/30", d?.trang_thai_ap_dung === "khong_ap_dung" && "opacity-60")}>
                  <CardHeader>
                    <CardTitle className={cn(d?.trang_thai_ap_dung === "khong_ap_dung" && "line-through")}>{entity?.ten_entity ?? n.tieu_de}</CardTitle>
                    <CardDescription className="flex flex-wrap items-center gap-2">
                      {d && <ApDungBadge status={d.trang_thai_ap_dung} />}
                      <span className="tabular-nums">Nhận lúc {formatDateTime(n.created_at)}</span>
                    </CardDescription>
                    <CardAction>
                      {n.da_doc ? (
                        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                          <Check className="size-3.5" aria-hidden /> Đã đọc
                        </span>
                      ) : (
                        <Button size="sm" variant="outline" onClick={() => markRead(n)}>
                          Đánh dấu đã đọc
                        </Button>
                      )}
                    </CardAction>
                  </CardHeader>
                  {d && (
                    <CardContent>
                      <DiagnosticBody
                        noiDung={d.noi_dung_diagnostic}
                        entity={entity}
                        soHieu={soHieu}
                        context={graph.filter((g) => g.target_id === d.entity_id && g.source_trang_thai_duyet === "da_duyet")}
                        entities={entities}
                      />
                    </CardContent>
                  )}
                </Card>
              );
            })}
            {items.length === 0 && <EmptyInbox />}
          </TabsContent>
        );
      })}
    </Tabs>
  );
}

function EmptyInbox() {
  return (
    <div className="flex flex-col items-center gap-1 rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
      <Inbox className="size-5" aria-hidden />
      Chưa có thông báo nào.
    </div>
  );
}
