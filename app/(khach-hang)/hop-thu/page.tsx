import type { Metadata } from "next";
import { PageHeader, PagePlaceholder } from "@/components/nexora/page-header";

export const metadata: Metadata = { title: "Hộp thư phòng ban" };

export default function Page() {
  return (
    <>
      <PageHeader title="Hộp thư phòng ban" description="Diagnostic đã được giao cho từng phòng ban (chính trước, phụ sau)." />
      <PagePlaceholder />
    </>
  );
}
