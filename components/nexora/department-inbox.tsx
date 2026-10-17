"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Check, Inbox, Mail, UserCheck } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DiagnosticBody } from "@/components/nexora/diagnostic-body";
import { AnhHuongBadge, ApDungBadge, DuyetBadge } from "@/components/nexora/status-badges";
import { formatDateTime } from "@/lib/labels";
import type { Department, Diagnostic, Entity, Notification } from "@/lib/types";
import { cn } from "@/lib/utils";

type Props = {
  departments: Department[];
  notifications: Notification[]; // mới nhất trước
  diagnostics: Diagnostic[];
  entities: Entity[];
};

const DAU_MOI = "dau-moi"; // tab của người đầu mối (department_id = null)

/*
 * 2 giai đoạn thông báo:
 *  - Tab "Người đầu mối": giai_doan = cho_duyet → dẫn sang màn Duyệt diagnostic
 *  - Tab mỗi phòng ban:   giai_doan = da_giao  → hiện luôn nội dung diagnostic đã duyệt
 * "Đánh dấu đã đọc" chỉ đổi trên giao diện, chưa lưu.
 */
export function DepartmentInbox({ departments, notifications, diagnostics, entities }: Props) {
  const [read, setRead] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(notifications.map((n) => [n.id, n.da_doc])),
  );
  const markRead = (id: string) => setRead((r) => ({ ...r, [id]: true }));

  const forTab = (tab: string) =>
    notifications.filter((n) =>
      tab === DAU_MOI
        ? n.giai_doan === "cho_duyet" && n.department_id === null
        : n.giai_doan === "da_giao" && n.department_id === tab,
    );
  const unread = (tab: string) => forTab(tab).filter((n) => !read[n.id]).length;

  const tabs = [
    { id: DAU_MOI, label: "Người đầu mối", Icon: UserCheck },
    ...departments.map((d) => ({ id: d.id, label: d.ten_phong_ban, Icon: Inbox })),
  ];

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

      {/* Giai đoạn 1 — người đầu mối */}
      <TabsContent value={DAU_MOI} className="mt-4 space-y-2">
        <p className="text-sm text-muted-foreground">
          Diagnostic mới cần người đầu mối duyệt trước khi gửi xuống phòng ban.
        </p>
        {forTab(DAU_MOI).map((n) => (
          <div
            key={n.id}
            className={cn(
              "flex flex-col gap-2 rounded-lg border p-3 sm:flex-row sm:items-center",
              !read[n.id] && "border-primary/40 bg-accent/50",
            )}
          >
            <div className="flex-1 space-y-0.5">
              <p className={cn("text-sm", !read[n.id] && "font-medium")}>
                {!read[n.id] && <span className="mr-1.5 inline-block size-2 rounded-full bg-primary" aria-label="Chưa đọc" />}
                {n.tieu_de}
              </p>
              <p className="text-xs text-muted-foreground tabular-nums">{formatDateTime(n.created_at)}</p>
            </div>
            {(() => {
              const d = diagnostics.find((x) => x.id === n.diagnostic_id);
              // Diagnostic đã được xử lý → chỉ hiện trạng thái, không mời duyệt lại
              if (d && d.trang_thai_duyet !== "cho_duyet") return <DuyetBadge status={d.trang_thai_duyet} />;
              return (
                <Link
                  href={`/duyet-diagnostic#${d?.department_id ?? ""}`}
                  onClick={() => markRead(n.id)}
                  className={buttonVariants({ variant: "outline", size: "sm" })}
                >
                  Mở để duyệt <ArrowRight />
                </Link>
              );
            })()}
          </div>
        ))}
        {forTab(DAU_MOI).length === 0 && <EmptyInbox />}
      </TabsContent>

      {/* Giai đoạn 2 — từng phòng ban */}
      {departments.map((dept) => {
        const items = forTab(dept.id);
        return (
          <TabsContent key={dept.id} value={dept.id} className="mt-4 space-y-3">
            <p className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
              <Mail className="size-3.5" aria-hidden /> Gửi tới {dept.email_head}
            </p>
            {items.map((n) => {
              const d = diagnostics.find((x) => x.id === n.diagnostic_id);
              const entity = entities.find((e) => e.id === d?.entity_id);
              return (
                <Card key={n.id} className={cn(!read[n.id] && "ring-2 ring-primary/30")}>
                  <CardHeader>
                    <CardTitle>{entity?.ten_entity ?? n.tieu_de}</CardTitle>
                    <CardDescription className="flex flex-wrap items-center gap-2">
                      {d && <ApDungBadge status={d.trang_thai_ap_dung} />}
                      {d && <AnhHuongBadge level={d.muc_anh_huong} />}
                      <span className="tabular-nums">Nhận lúc {formatDateTime(n.created_at)}</span>
                    </CardDescription>
                    <CardAction>
                      {read[n.id] ? (
                        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                          <Check className="size-3.5" aria-hidden /> Đã đọc
                        </span>
                      ) : (
                        <Button size="sm" variant="outline" onClick={() => markRead(n.id)}>
                          Đánh dấu đã đọc
                        </Button>
                      )}
                    </CardAction>
                  </CardHeader>
                  {d && (
                    <CardContent>
                      <DiagnosticBody diagnostic={d} />
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
