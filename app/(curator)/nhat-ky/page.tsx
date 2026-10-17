import type { Metadata } from "next";

import { MockNotice, PageHeader } from "@/components/nexora/page-header";
import { PipelineLog } from "@/components/nexora/pipeline-log";
import { getPipelineRuns, mockCustomer, mockEntities } from "@/lib/mock";

export const metadata: Metadata = { title: "Nhật ký pipeline" };

export default function Page() {
  return (
    <>
      <PageHeader
        title="Nhật ký pipeline"
        description="Mọi lần chạy AI và rule engine đều được ghi lại: đầu vào, đầu ra, bộ xử lý, thời gian. Bấm vào 1 dòng để xem chi tiết."
      />
      <MockNotice />
      <PipelineLog runs={getPipelineRuns()} entities={mockEntities} customers={[mockCustomer]} />
    </>
  );
}
