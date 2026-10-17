import type { Metadata } from "next";
import { PageHeader, PagePlaceholder } from "@/components/nexora/page-header";

export const metadata: Metadata = { title: "Onboarding" };

export default function Page() {
  return (
    <>
      <PageHeader title="Onboarding" description="3 bước: tên công ty, lĩnh vực theo dõi, phòng ban và email trưởng phòng." />
      <PagePlaceholder />
    </>
  );
}
