"use client";

import { ArrowRight, CalendarDays, Link2Off, RotateCcw } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AnhHuongBadge, DuyetBadge, LoaiEntityBadge } from "@/components/nexora/status-badges";
import { useLocalDecisions } from "@/components/nexora/use-local-decisions";
import { deptLabel, domainLabel, formatDate, relationshipLabel } from "@/lib/labels";
import type { Entity, EntityRelationship, TrangThaiDuyet } from "@/lib/types";

type Props = {
  pendingEntities: Entity[];
  pendingRelationships: EntityRelationship[];
  allEntities: Entity[]; // để tra tên entity ở 2 đầu cạnh
  allRelationships: EntityRelationship[]; // để hiện cạnh trong thẻ entity
};

export function DraftReview({ pendingEntities, pendingRelationships, allEntities, allRelationships }: Props) {
  const entityName = (id: string) => allEntities.find((e) => e.id === id)?.ten_entity ?? id;

  const { decisions, setDecision } = useLocalDecisions(
    Object.fromEntries(
      [...pendingEntities, ...pendingRelationships].map((x) => [x.id, x.trang_thai_duyet] as const),
    ),
  );

  const remainingEntities = pendingEntities.filter((e) => decisions[e.id] === "cho_duyet").length;
  const remainingRels = pendingRelationships.filter((r) => decisions[r.id] === "cho_duyet").length;

  return (
    <Tabs defaultValue="entity">
      <TabsList>
        <TabsTrigger value="entity">
          Entity <Badge variant="secondary">{remainingEntities}</Badge>
        </TabsTrigger>
        <TabsTrigger value="relationship">
          Quan hệ <Badge variant="secondary">{remainingRels}</Badge>
        </TabsTrigger>
      </TabsList>

      {/* ---------- Tab Entity ---------- */}
      <TabsContent value="entity" className="mt-4 grid gap-4 xl:grid-cols-2">
        {pendingEntities.map((e) => {
          const edges = allRelationships.filter((r) => r.source_entity_id === e.id || r.target_entity_id === e.id);
          return (
            <Card key={e.id}>
              <CardHeader>
                <CardTitle className="text-base">{e.ten_entity}</CardTitle>
                <CardDescription className="flex flex-wrap items-center gap-2">
                  <LoaiEntityBadge loai={e.loai_entity} />
                  <span>{domainLabel[e.domain]}</span>
                  <span aria-hidden>·</span>
                  <span>{e.dieu_khoan}</span>
                </CardDescription>
                <CardAction>
                  <DuyetBadge status={decisions[e.id]} />
                </CardAction>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Câu gốc đặt trước, nổi bật — curator so với phần AI tóm tắt bên dưới */}
                <figure className="space-y-1">
                  <figcaption className="text-xs font-medium text-muted-foreground">
                    Trích nguyên văn · {e.dieu_khoan}
                  </figcaption>
                  <blockquote className="border-l-4 border-primary/40 bg-muted/50 px-3 py-2 text-sm">
                    {e.noi_dung_goc}
                  </blockquote>
                </figure>

                <p className="text-sm">
                  <span className="text-muted-foreground">AI mô tả: </span>
                  {e.mo_ta}
                </p>

                <dl className="grid gap-2 text-sm sm:grid-cols-[auto_1fr] sm:gap-x-4">
                  <dt className="text-muted-foreground">Phòng ban</dt>
                  <dd className="flex flex-wrap gap-x-3 gap-y-1">
                    {e.primary_departments.map((d) => (
                      <span key={d} className="inline-flex items-center gap-1.5">
                        {deptLabel(d)} <AnhHuongBadge level="primary" />
                      </span>
                    ))}
                    {e.secondary_departments.map((d) => (
                      <span key={d} className="inline-flex items-center gap-1.5">
                        {deptLabel(d)} <AnhHuongBadge level="secondary" />
                      </span>
                    ))}
                  </dd>
                  <dt className="text-muted-foreground">Hiệu lực</dt>
                  <dd className="inline-flex items-center gap-1.5">
                    <CalendarDays className="size-3.5 text-muted-foreground" aria-hidden />
                    {formatDate(e.ngay_co_hieu_luc)}
                  </dd>
                </dl>

                {edges.length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-xs font-medium text-muted-foreground">Quan hệ ({edges.length})</p>
                    <ul className="space-y-1.5">
                      {edges.map((r) => (
                        <li key={r.id}>
                          <EdgeLine rel={r} entityName={entityName} currentId={e.id} />
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>

              <CardFooter className="gap-2">
                <DecisionButtons status={decisions[e.id]} onDecide={(s) => setDecision(e.id, s)} />
              </CardFooter>
            </Card>
          );
        })}
      </TabsContent>

      {/* ---------- Tab Quan hệ ---------- */}
      <TabsContent value="relationship" className="mt-4 space-y-3">
        {pendingRelationships.map((r) => (
          <Card key={r.id} size="sm">
            <CardHeader>
              <CardTitle>
                <EdgeLine rel={r} entityName={entityName} />
              </CardTitle>
              <CardDescription>{r.mo_ta}</CardDescription>
              <CardAction>
                <DuyetBadge status={decisions[r.id]} />
              </CardAction>
            </CardHeader>
            <CardFooter className="gap-2">
              <DecisionButtons status={decisions[r.id]} onDecide={(s) => setDecision(r.id, s)} />
            </CardFooter>
          </Card>
        ))}
      </TabsContent>
    </Tabs>
  );
}

/* Một cạnh: [nguồn] —nhãn→ [đích]. Đích null → hiện target_ref_text + nhãn "Chờ nối". */
function EdgeLine({
  rel,
  entityName,
  currentId,
}: {
  rel: EntityRelationship;
  entityName: (id: string) => string;
  currentId?: string;
}) {
  const node = (id: string) => (
    <span className={id === currentId ? "font-semibold" : "font-medium"}>{entityName(id)}</span>
  );

  return (
    <span className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-sm">
      {node(rel.source_entity_id)}
      <span className="inline-flex items-center gap-1 text-muted-foreground">
        {relationshipLabel[rel.loai_relationship]}
        <ArrowRight className="size-3.5" aria-hidden />
      </span>
      {rel.target_entity_id ? (
        node(rel.target_entity_id)
      ) : (
        <>
          <span className="italic text-muted-foreground">{rel.target_ref_text}</span>
          <Badge variant="outline" className="border-dashed text-status-sap-ap-dung">
            <Link2Off aria-hidden /> Chờ nối
          </Badge>
        </>
      )}
    </span>
  );
}

function DecisionButtons({
  status,
  onDecide,
}: {
  status: TrangThaiDuyet;
  onDecide: (s: TrangThaiDuyet) => void;
}) {
  if (status !== "cho_duyet") {
    return (
      <Button variant="ghost" size="sm" onClick={() => onDecide("cho_duyet")}>
        <RotateCcw /> Hoàn tác
      </Button>
    );
  }
  return (
    <>
      <Button size="sm" onClick={() => onDecide("da_duyet")}>
        Duyệt
      </Button>
      <Button size="sm" variant="destructive" onClick={() => onDecide("tu_choi")}>
        Từ chối
      </Button>
    </>
  );
}
