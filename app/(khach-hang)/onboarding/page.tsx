import type { Metadata } from "next";

import { OnboardingForm } from "@/components/nexora/onboarding-form";
import { MockNotice, PageHeader } from "@/components/nexora/page-header";

export const metadata: Metadata = { title: "Onboarding" };

export default function Page() {
  return (
    <>
      <PageHeader
        title="Onboarding"
        description="4 bước: thông tin công ty, lĩnh vực theo dõi, hồ sơ doanh nghiệp, phòng ban."
      />
      <MockNotice />
      <OnboardingForm />
    </>
  );
}
