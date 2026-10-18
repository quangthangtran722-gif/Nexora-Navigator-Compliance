import type { Metadata } from "next";

import { CustomerOverview } from "@/components/nexora/customer-overview";
import { MockNotice, PageHeader } from "@/components/nexora/page-header";

export const metadata: Metadata = { title: "Tổng quan" };

export default function Page() {
  return (
    <>
      <PageHeader title="Tổng quan" description="Tình trạng tuân thủ của doanh nghiệp theo các lĩnh vực đang theo dõi." />
      <MockNotice />
      <CustomerOverview />
    </>
  );
}
