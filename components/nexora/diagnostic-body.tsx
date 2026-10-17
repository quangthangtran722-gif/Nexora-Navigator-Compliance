import { CheckSquare } from "lucide-react";

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { LoaiEntityBadge } from "@/components/nexora/status-badges";
import type { Diagnostic } from "@/lib/types";

/*
 * Nội dung 1 diagnostic: checklist + căn cứ đi kèm.
 * Dùng chung cho màn Duyệt diagnostic (người đầu mối) và Hộp thư phòng ban.
 * Quy ước: mỗi dòng của noi_dung_diagnostic ("\n") = 1 đầu mục check.
 */
export function DiagnosticBody({ diagnostic }: { diagnostic: Diagnostic }) {
  const checklist = diagnostic.noi_dung_diagnostic.split("\n").filter(Boolean);
  const ctx = diagnostic.context_entities ?? [];

  return (
    <div className="space-y-3">
      <ul className="space-y-1.5 text-sm">
        {checklist.map((line) => (
          <li key={line} className="flex gap-2">
            <CheckSquare className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
            <span>{line}</span>
          </li>
        ))}
      </ul>

      {/* Thời hạn / chế tài / mức thuế đi kèm — mở rộng, không phải đầu mục riêng */}
      {ctx.length > 0 && (
        <Accordion>
          <AccordionItem value="ctx">
            <AccordionTrigger className="text-sm">Căn cứ đi kèm ({ctx.length})</AccordionTrigger>
            <AccordionContent>
              <ul className="space-y-3">
                {ctx.map((c) => (
                  <li key={c.id} className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2 text-sm font-medium">
                      <LoaiEntityBadge loai={c.loai_entity} />
                      {c.ten_entity}
                    </div>
                    <blockquote className="border-l-2 border-primary/30 pl-3 text-sm text-muted-foreground">
                      {c.noi_dung_goc}
                    </blockquote>
                  </li>
                ))}
              </ul>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      )}
    </div>
  );
}
