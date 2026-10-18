import type { Metadata } from "next";

import { DraftReview } from "@/components/nexora/draft-review";
import { PageHeader } from "@/components/nexora/page-header";

export const metadata: Metadata = { title: "Duyệt bản nháp" };

export default function Page() {
  return (
    <>
      <PageHeader
        title="Duyệt bản nháp"
        description="So câu luật gốc với kết quả AI trích xuất theo từng chunk; điền điều kiện máy đọc cho điều kiện/ngưỡng, rồi duyệt hoặc từ chối."
      />
      <DraftReview />
    </>
  );
}
