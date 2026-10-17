"use client";

import { Mail, RotateCcw, Send } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { DiagnosticBody } from "@/components/nexora/diagnostic-body";
import { AnhHuongBadge, ApDungBadge, DuyetBadge } from "@/components/nexora/status-badges";
import { useLocalDecisions } from "@/components/nexora/use-local-decisions";
import { cn } from "@/lib/utils";
import type { Department, Diagnostic, Entity, TrangThaiApDung } from "@/lib/types";

type Props = {
  departments: Department[];
  diagnostics: Diagnostic[];
  entities: Entity[]; // tra tên + điều khoản của entity hanh_vi gốc
};

// Thứ tự hiển thị trong mỗi phòng: chính trước phụ, rồi theo mức cấp bách
const AP_DUNG_RANK: Record<TrangThaiApDung, number> = {
  ap_dung: 0,
  chua_du_thong_tin: 1,
  sap_ap_dung: 2,
  khong_ap_dung: 3,
};

export function DiagnosticReview({ departments, diagnostics, entities }: Props) {
  const { decisions, setDecision } = useLocalDecisions(
    Object.fromEntries(diagnostics.map((d) => [d.id, d.trang_thai_duyet] as const)),
  );

  return (
    <div className="space-y-8">
      {/* Nhảy nhanh tới phòng ban */}
      <nav className="flex flex-wrap gap-2" aria-label="Phòng ban">
        {departments.map((dept) => {
          const pending = diagnostics.filter((d) => d.department_id === dept.id && decisions[d.id] === "cho_duyet");
          return (
            <a
              key={dept.id}
              href={`#${dept.id}`}
              className="rounded-full border px-3 py-1 text-sm transition-colors hover:bg-accent"
            >
              {dept.ten_phong_ban}
              {pending.length > 0 && <span className="ml-1.5 font-semibold text-duyet-cho">{pending.length}</span>}
            </a>
          );
        })}
      </nav>

      {departments.map((dept) => {
        const items = diagnostics
          .filter((d) => d.department_id === dept.id)
          .sort(
            (a, b) =>
              Number(a.muc_anh_huong === "secondary") - Number(b.muc_anh_huong === "secondary") ||
              AP_DUNG_RANK[a.trang_thai_ap_dung] - AP_DUNG_RANK[b.trang_thai_ap_dung],
          );

        return (
          <section key={dept.id} id={dept.id} className="scroll-mt-20 space-y-3">
            <div className="flex flex-wrap items-baseline justify-between gap-2 border-b pb-2">
              <h2 className="text-lg font-semibold">{dept.ten_phong_ban}</h2>
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                <Mail className="size-3" aria-hidden /> {dept.email_head}
              </span>
            </div>

            {items.length === 0 && <p className="text-sm text-muted-foreground">Chưa có diagnostic cho phòng này.</p>}

            {items.map((d) => {
              const entity = entities.find((e) => e.id === d.entity_id);
              const muted = d.trang_thai_ap_dung === "khong_ap_dung";

              return (
                <Card key={d.id} className={cn(muted && "opacity-70")}>
                  <CardHeader>
                    <CardTitle>{entity?.ten_entity ?? d.entity_id}</CardTitle>
                    <CardDescription className="flex flex-wrap items-center gap-2">
                      <ApDungBadge status={d.trang_thai_ap_dung} />
                      <AnhHuongBadge level={d.muc_anh_huong} />
                      {entity && <span>{entity.dieu_khoan}</span>}
                    </CardDescription>
                    <CardAction>
                      <DuyetBadge status={decisions[d.id]} />
                    </CardAction>
                  </CardHeader>

                  <CardContent className="space-y-3">
                    <DiagnosticBody diagnostic={d} />
                  </CardContent>

                  <CardFooter className="gap-2">
                    {decisions[d.id] === "cho_duyet" ? (
                      <>
                        <Button size="sm" onClick={() => setDecision(d.id, "da_duyet")}>
                          <Send /> Duyệt &amp; gửi {dept.ten_phong_ban}
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => setDecision(d.id, "tu_choi")}>
                          Từ chối
                        </Button>
                      </>
                    ) : (
                      <Button size="sm" variant="ghost" onClick={() => setDecision(d.id, "cho_duyet")}>
                        <RotateCcw /> Hoàn tác
                      </Button>
                    )}
                  </CardFooter>
                </Card>
              );
            })}
          </section>
        );
      })}
    </div>
  );
}
