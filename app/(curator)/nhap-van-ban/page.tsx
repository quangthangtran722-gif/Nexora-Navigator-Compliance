import type { Metadata } from "next";
import { PageHeader, PagePlaceholder } from "@/components/nexora/page-header";

export const metadata: Metadata = { title: "Nhập văn bản luật" };

export default function Page() {
  return (
    <>
      <PageHeader title="Nhập văn bản luật" description="Dán điều luật để AI trích xuất entity và relationship (bản nháp chờ duyệt)." />
      <PagePlaceholder />
    </>
  );
}
