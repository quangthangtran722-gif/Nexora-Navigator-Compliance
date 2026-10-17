import type { Metadata } from "next";
import { PageHeader, PagePlaceholder } from "@/components/nexora/page-header";

export const metadata: Metadata = { title: "Nhật ký pipeline" };

export default function Page() {
  return (
    <>
      <PageHeader title="Nhật ký pipeline" description="Log mọi lần chạy AI và rule engine (pipeline_runs) để minh bạch." />
      <PagePlaceholder />
    </>
  );
}
