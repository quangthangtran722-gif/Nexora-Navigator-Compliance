import type { Metadata } from "next";
import { PageHeader, PagePlaceholder } from "@/components/nexora/page-header";

export const metadata: Metadata = { title: "Kho entity" };

export default function Page() {
  return (
    <>
      <PageHeader title="Kho entity" description="Toàn bộ entity và relationship đã được duyệt, dùng chung cho mọi khách hàng." />
      <PagePlaceholder />
    </>
  );
}
