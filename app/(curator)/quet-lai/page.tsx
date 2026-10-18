import type { Metadata } from "next";

import { PageHeader } from "@/components/nexora/page-header";
import { RescanPanel } from "@/components/nexora/rescan-panel";

export const metadata: Metadata = { title: "Quét lại khách hàng" };

export default function Page() {
  return (
    <>
      <PageHeader
        title="Quét lại khách hàng"
        description="Chạy lại rule engine cho mọi khách hàng hiện có khi kho có entity mới được duyệt."
      />
      <RescanPanel />
    </>
  );
}
