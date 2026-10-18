import { ArrowRight, Link2Off } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { LOAI_RELATIONSHIP_LABEL } from "@/lib/labels";
import type { EntityGraphRow } from "@/lib/types";

/*
 * 1 cạnh trong view entity_graph: [nguồn] —loại→ [đích].
 * Đích null (is_pending) → hiện target_ref_text + nhãn "Chờ nối". can_cu = đoạn nguyên văn thể hiện quan hệ.
 */
export function EdgeLine({ row, currentId, showCanCu = false }: { row: EntityGraphRow; currentId?: string; showCanCu?: boolean }) {
  const node = (id: string, ten: string) => <span className={id === currentId ? "font-semibold" : "font-medium"}>{ten}</span>;
  // Nhãn đứng giữa câu → viết thường chữ đầu
  const label = LOAI_RELATIONSHIP_LABEL[row.loai_relationship];
  const midLabel = label.charAt(0).toLowerCase() + label.slice(1);

  return (
    <span className="block space-y-0.5">
      <span className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-sm">
        {node(row.source_id, row.source_ten)}
        <span className="inline-flex items-center gap-1 text-muted-foreground">
          {midLabel}
          <ArrowRight className="size-3.5" aria-hidden />
        </span>
        {row.target_id && row.target_ten ? (
          node(row.target_id, row.target_ten)
        ) : (
          <>
            <span className="italic text-muted-foreground">{row.target_ref_text}</span>
            <Badge variant="outline" className="border-dashed text-status-sap-ap-dung">
              <Link2Off aria-hidden /> Chờ nối
            </Badge>
          </>
        )}
      </span>
      {showCanCu && <span className="block border-l-2 pl-2 text-xs text-muted-foreground italic">“{row.can_cu}”</span>}
    </span>
  );
}
