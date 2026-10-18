import type { Metadata } from "next";

import { DepartmentInbox } from "@/components/nexora/department-inbox";
import { MockNotice, PageHeader } from "@/components/nexora/page-header";

export const metadata: Metadata = { title: "Hộp thư phòng ban" };

export default function Page() {
  return (
    <>
      <PageHeader
        title="Hộp thư phòng ban"
        description="Người đầu mối nhận câu hỏi bổ sung và checklist chờ duyệt; sau khi duyệt, phòng ban nhận việc được thông báo."
      />
      <MockNotice />
      <DepartmentInbox />
    </>
  );
}
