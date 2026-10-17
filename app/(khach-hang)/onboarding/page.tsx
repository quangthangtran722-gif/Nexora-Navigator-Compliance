import type { Metadata } from "next";

import { OnboardingForm } from "@/components/nexora/onboarding-form";
import { MockNotice, PageHeader } from "@/components/nexora/page-header";

export const metadata: Metadata = { title: "Onboarding" };

export default function Page() {
  return (
    <>
      <PageHeader
        title="Onboarding"
        description="3 bước: thông tin công ty, lĩnh vực theo dõi, phòng ban và email trưởng phòng."
      />
      <MockNotice />
      <OnboardingForm />
    </>
  );
}
