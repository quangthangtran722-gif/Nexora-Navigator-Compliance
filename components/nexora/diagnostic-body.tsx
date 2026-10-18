import { CheckSquare, Hourglass } from "lucide-react";

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { LoaiEntityBadge } from "@/components/nexora/status-badges";
import type { Entity, EntityGraphRow } from "@/lib/types";

/*
 * Nội dung 1 diagnostic: checklist + căn cứ đi kèm. Dùng chung cho Duyệt diagnostic và Hộp thư.
 * Ngữ cảnh (thời hạn, chế tài, mức thuế, trích dẫn gốc) lấy qua entity_id → entities + entity_graph
 * (cạnh có target_id = entity_id) — CONTRACT §3.6.
 * Quy ước UI (chờ backend xác nhận): mỗi dòng ("\n") của noi_dung_diagnostic = 1 đầu mục check.
 */

type Props = {
  noiDung: string | null;
  entity: Entity | undefined; // entity hanh_vi gốc
  soHieu?: string; // số hiệu văn bản chứa entity
  context: EntityGraphRow[]; // cạnh trỏ vào entity (target_id = entity_id), nguồn đã duyệt
  entities: Entity[]; // để lấy noi_dung_goc của đầu nguồn
};

export function DiagnosticBody({ noiDung, entity, soHieu, context, entities }: Props) {
  const checklist = noiDung?.split("\n").filter(Boolean) ?? [];

  return (
    <div className="space-y-3">
      {noiDung === null ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Hourglass className="size-4" aria-hidden /> AI chưa viết checklist cho mục này.
        </p>
      ) : (
        <ul className="space-y-1.5 text-sm">
          {checklist.map((line) => (
            <li key={line} className="flex gap-2">
              <CheckSquare className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
              <span>{line}</span>
            </li>
          ))}
        </ul>
      )}

      {entity && (
        <Accordion>
          <AccordionItem value="ctx">
            <AccordionTrigger className="text-sm">Căn cứ pháp lý ({context.length + 1})</AccordionTrigger>
            <AccordionContent>
              <ul className="space-y-3">
                <li className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2 text-sm font-medium">
                    <LoaiEntityBadge loai={entity.loai_entity} /> {entity.ten_entity}
                    <span className="font-normal text-muted-foreground">
                      {soHieu} · {entity.dieu_khoan}
                    </span>
                  </div>
                  <blockquote className="border-l-2 border-primary/30 pl-3 text-sm text-muted-foreground">{entity.noi_dung_goc}</blockquote>
                </li>
                {context.map((g) => {
                  const src = entities.find((e) => e.id === g.source_id);
                  return (
                    <li key={g.relationship_id} className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2 text-sm font-medium">
                        <LoaiEntityBadge loai={g.source_loai} /> {g.source_ten}
                        {src && <span className="font-normal text-muted-foreground">{src.dieu_khoan}</span>}
                      </div>
                      <blockquote className="border-l-2 border-primary/30 pl-3 text-sm text-muted-foreground">{src?.noi_dung_goc ?? g.can_cu}</blockquote>
                    </li>
                  );
                })}
              </ul>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      )}
    </div>
  );
}
