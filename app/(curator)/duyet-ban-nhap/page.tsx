import type { Metadata } from "next";
import { PageHeader, PagePlaceholder } from "@/components/nexora/page-header";

export const metadata: Metadata = { title: "Duyệt bản nháp" };

export default function Page() {
  return (
    <>
      <PageHeader title="Duyệt bản nháp" description="So câu luật gốc với kết quả AI trích xuất, rồi duyệt, sửa hoặc từ chối." />
      <PagePlaceholder />
    </>
  );
}
