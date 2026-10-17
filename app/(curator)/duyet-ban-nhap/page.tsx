import type { Metadata } from "next";

import { DraftReview } from "@/components/nexora/draft-review";
import { MockNotice, PageHeader } from "@/components/nexora/page-header";
import { getPendingEntities, getPendingRelationships, mockEntities, mockRelationships } from "@/lib/mock";

export const metadata: Metadata = { title: "Duyệt bản nháp" };

export default function Page() {
  return (
    <>
      <PageHeader
        title="Duyệt bản nháp"
        description="So câu luật gốc với kết quả AI trích xuất, rồi duyệt hoặc từ chối từng entity và quan hệ."
      />
      <MockNotice />
      <DraftReview
        pendingEntities={getPendingEntities()}
        pendingRelationships={getPendingRelationships()}
        allEntities={mockEntities}
        allRelationships={mockRelationships}
      />
    </>
  );
}
