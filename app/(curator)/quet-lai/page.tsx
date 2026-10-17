import type { Metadata } from "next";
import { PageHeader, PagePlaceholder } from "@/components/nexora/page-header";

export const metadata: Metadata = { title: "Quét lại khách hàng" };

export default function Page() {
  return (
    <>
      <PageHeader title="Quét lại khách hàng" description="Chạy lại rule engine cho các khách hàng hiện có khi kho có entity mới." />
      <PagePlaceholder />
    </>
  );
}
