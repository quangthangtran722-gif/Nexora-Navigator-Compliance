import type { Metadata } from "next";

import { DiagnosticReview } from "@/components/nexora/diagnostic-review";
import { MockNotice, PageHeader } from "@/components/nexora/page-header";
import { getCustomer, getDepartments, getDiagnostics, mockEntities } from "@/lib/mock";

export const metadata: Metadata = { title: "Duyệt diagnostic" };

export default function Page() {
  const customer = getCustomer();

  return (
    <>
      <PageHeader
        title="Duyệt diagnostic"
        description="Xem các đầu mục cần kiểm tra của từng phòng ban trước khi gửi xuống. Phòng ảnh hưởng chính được thông báo trước."
      />
      <MockNotice />
      <DiagnosticReview
        departments={getDepartments(customer.id)}
        diagnostics={getDiagnostics(customer.id)}
        entities={mockEntities}
      />
    </>
  );
}
