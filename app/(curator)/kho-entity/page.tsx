import type { Metadata } from "next";

import { EntityLibrary } from "@/components/nexora/entity-library";
import { PageHeader } from "@/components/nexora/page-header";
import { COPY } from "@/lib/copy";

// Chữ trang lấy từ lib/copy.ts (nexora-wording-v1). URL giữ nguyên, chỉ đổi chữ hiển thị.
const P = COPY.page.thuVien;

export const metadata: Metadata = { title: P.title };

export default function Page() {
  return (
    <>
      <PageHeader title={P.title} description={P.description} />
      <EntityLibrary />
    </>
  );
}
