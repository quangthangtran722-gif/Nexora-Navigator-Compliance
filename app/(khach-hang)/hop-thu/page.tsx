import type { Metadata } from "next";

import { DepartmentInbox } from "@/components/nexora/department-inbox";
import { MockNotice, PageHeader } from "@/components/nexora/page-header";
import { getCustomer, getDepartments, getDiagnostics, getNotifications, mockEntities } from "@/lib/mock";

export const metadata: Metadata = { title: "Hộp thư phòng ban" };

export default function Page() {
  const customer = getCustomer();

  return (
    <>
      <PageHeader
        title="Hộp thư phòng ban"
        description="Người đầu mối nhận diagnostic chờ duyệt trước; sau khi duyệt, phòng ảnh hưởng chính được báo trước, phòng phụ sau."
      />
      <MockNotice />
      <DepartmentInbox
        departments={getDepartments(customer.id)}
        notifications={getNotifications(customer.id)}
        diagnostics={getDiagnostics(customer.id)}
        entities={mockEntities}
      />
    </>
  );
}
