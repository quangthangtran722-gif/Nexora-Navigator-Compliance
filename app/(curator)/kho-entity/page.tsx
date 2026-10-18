import type { Metadata } from "next";

import { EntityLibrary } from "@/components/nexora/entity-library";
import { MockNotice, PageHeader } from "@/components/nexora/page-header";

export const metadata: Metadata = { title: "Kho entity" };

export default function Page() {
  return (
    <>
      <PageHeader
        title="Kho entity"
        description="Entity và quan hệ đã được curator duyệt — dùng chung để đối chiếu cho mọi khách hàng."
      />
      <MockNotice />
      <EntityLibrary />
    </>
  );
}
