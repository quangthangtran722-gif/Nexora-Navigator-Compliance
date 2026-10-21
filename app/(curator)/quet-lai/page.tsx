import type { Metadata } from "next";

import { PageHeader } from "@/components/nexora/page-header";
import { RescanPanel } from "@/components/nexora/rescan-panel";
import { COPY } from "@/lib/copy";

// Chữ trang lấy từ lib/copy.ts (nexora-wording-v1). URL giữ nguyên, chỉ đổi chữ hiển thị.
const P = COPY.page.capNhat;

export const metadata: Metadata = { title: P.title };

export default function Page() {
  return (
    <>
      <PageHeader title={P.title} description={P.description} />
      <RescanPanel />
    </>
  );
}
