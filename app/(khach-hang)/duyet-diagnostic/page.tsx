import type { Metadata } from "next";

import { DiagnosticReview } from "@/components/nexora/diagnostic-review";
import { PageHeader } from "@/components/nexora/page-header";

export const metadata: Metadata = { title: "Duyệt diagnostic" };

export default function Page() {
  return (
    <>
      <PageHeader
        title="Duyệt diagnostic"
        description="Trả lời câu hỏi bổ sung, xem checklist từng phòng ban, rồi duyệt để giao việc. Mục đã hết áp dụng được gạch đi."
      />
      <DiagnosticReview />
    </>
  );
}
