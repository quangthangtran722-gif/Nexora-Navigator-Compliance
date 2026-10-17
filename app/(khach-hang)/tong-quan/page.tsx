import type { Metadata } from "next";
import { PageHeader, PagePlaceholder } from "@/components/nexora/page-header";

export const metadata: Metadata = { title: "Tổng quan" };

export default function Page() {
  return (
    <>
      <PageHeader title="Tổng quan" description="Các quy định áp dụng cho doanh nghiệp, theo 3 trạng thái." />
      <PagePlaceholder />
    </>
  );
}
