import { ArrowRight, Link2Off } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { relationshipLabel } from "@/lib/labels";
import type { EntityRelationship } from "@/lib/types";

/* Một cạnh: [nguồn] —nhãn→ [đích]. Đích null → hiện target_ref_text + nhãn "Chờ nối". */
export function EdgeLine({
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
