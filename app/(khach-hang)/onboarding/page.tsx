import type { Metadata } from "next";

import { OnboardingForm } from "@/components/nexora/onboarding-form";
import { COPY } from "@/lib/copy";

// Tiêu đề "Thiết lập hồ sơ doanh nghiệp" / "Hồ sơ doanh nghiệp" do OnboardingForm chọn theo trạng thái hồ sơ
export const metadata: Metadata = { title: COPY.page.hoSo.title };

export default function Page() {
  return <OnboardingForm />;
}
