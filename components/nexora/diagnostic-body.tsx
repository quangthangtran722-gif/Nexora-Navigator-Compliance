import { CheckSquare, Hourglass } from "lucide-react";

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { InsetBlock } from "@/components/nexora/inset-block";
import { COPY, XAC_NHAN } from "@/lib/copy";
import type { Entity, EntityGraphRow } from "@/lib/types";
import { cn } from "@/lib/utils";

/*
 * Nội dung 1 nghĩa vụ phía doanh nghiệp: "Việc cần làm" + "Căn cứ pháp lý (N)". Dùng chung cho Xác nhận nghĩa vụ và Thông báo.
 * Căn cứ (thời hạn, chế tài, mức thuế, trích dẫn gốc) lấy qua entity_id → entities + entity_graph
 * (cạnh có target_id = entity_id) — CONTRACT §3.6. Mỗi dòng ("\n") của noi_dung_diagnostic = 1 việc cần làm.
 * Không hiện loại mục trích xuất (Hành vi, Chế tài…) — đó là thuật ngữ nội bộ.
 * Thứ tự đọc: ngôn ngữ dễ hiểu trước (việc cần làm), luật gốc sau (căn cứ, thu gọn mặc định — mở thì trượt xuống).
 */

type Props = {
  noiDung: string | null;
  entity: Entity | undefined; // nghĩa vụ gốc
  nguon?: string; // tên văn bản chứa nghĩa vụ (không hiện số hiệu kỹ thuật)
  context: EntityGraphRow[]; // cạnh trỏ vào nghĩa vụ (target_id = entity_id), nguồn đã duyệt
  entities: Entity[]; // để lấy trích nguyên văn của đầu nguồn
  prominent?: boolean; // phân cấp rõ: nhãn eyebrow, thân 15px, các phần cách 24px
};

// Nhánh ngang nối vạch dọc với từng trích dẫn (chỉ khi prominent)
const NHANH = "relative before:absolute before:top-2.5 before:-left-4 before:h-px before:w-3 before:bg-gold-edge/70";

// So sánh bỏ dấu câu / hoa thường — để bỏ việc cần làm lặp y nguyên tên nghĩa vụ
const chuan = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();

export function DiagnosticBody({ noiDung, entity, nguon, context, entities, prominent }: Props) {
  // Bỏ số thứ tự đầu dòng ("1. ") — đã có ô tick
  const tatCa = noiDung?.split("\n").map((l) => l.replace(/^\s*\d+[.)]\s+/, "").trim()).filter(Boolean) ?? [];
  // Cắt lặp: bỏ dòng trùng tên nghĩa vụ (tiêu đề đã nói) và dòng "Căn cứ: …" (điều khoản đã ở dòng meta + mục Căn cứ pháp lý),
  // trừ khi lọc xong không còn dòng nào
  const loc = tatCa.filter((l) => !/^căn cứ\s*:/i.test(l) && (!entity || chuan(l) !== chuan(entity.ten_entity)));
  const viecCanLam = loc.length ? loc : tatCa;
  const nhan = prominent ? "eyebrow" : "text-xs font-semibold text-muted-foreground";

  return (
    <div className={prominent ? "space-y-6" : "space-y-3"}>
      <section className={cn(prominent ? "max-w-[70ch] space-y-3" : "space-y-1.5")} aria-label={COPY.term.viecCanLam}>
        <h3 className={nhan}>{COPY.term.viecCanLam}</h3>
        {noiDung === null ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Hourglass className="size-4" aria-hidden /> {XAC_NHAN.chuaCoViec}
          </p>
        ) : (
          <InsetBlock as="ul" className={prominent ? "space-y-2 px-4 py-3 text-[15px]" : "space-y-1.5"}>
            {viecCanLam.map((line) => (
              <li key={line} className="flex gap-2.5">
                <CheckSquare className={cn("size-4 shrink-0 text-gold-text", prominent ? "mt-1" : "mt-0.5")} aria-hidden />
                <span>{line}</span>
              </li>
            ))}
          </InsetBlock>
        )}
      </section>

      {entity && (
        <Accordion className={cn(prominent && "max-w-[70ch]")}>
          <AccordionItem value="ctx">
            <AccordionTrigger className={prominent ? "eyebrow items-center py-1 hover:no-underline" : "text-sm"}>
              {COPY.term.canCu} ({context.length + 1})
            </AccordionTrigger>
            <AccordionContent>
              <ul className={cn("space-y-4", prominent && "ml-2 max-w-[70ch] border-l border-gold-edge/70 pt-2 pl-4")}>
                <li className={cn("space-y-1.5", prominent && NHANH)}>
                  <div className="flex flex-wrap items-center gap-2 text-sm font-medium">
                    {entity.ten_entity}
                    <span className="font-normal text-muted-foreground">
                      {entity.dieu_khoan}
                      {nguon && ` — ${nguon}`}
                    </span>
                  </div>
                  <InsetBlock as="blockquote" className="text-muted-foreground">
                    {entity.noi_dung_goc}
                  </InsetBlock>
                </li>
                {context.map((g) => {
                  const src = entities.find((e) => e.id === g.source_id);
                  return (
                    <li key={g.relationship_id} className={cn("space-y-1.5", prominent && NHANH)}>
                      <div className="flex flex-wrap items-center gap-2 text-sm font-medium">
                        {g.source_ten}
                        {src && <span className="font-normal text-muted-foreground">{src.dieu_khoan}</span>}
                      </div>
                      <InsetBlock as="blockquote" className="text-muted-foreground">
                        {src?.noi_dung_goc ?? g.can_cu}
                      </InsetBlock>
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
