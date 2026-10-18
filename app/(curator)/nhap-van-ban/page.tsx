import type { Metadata } from "next";

import { LawInputForm } from "@/components/nexora/law-input-form";
import { PageHeader } from "@/components/nexora/page-header";

export const metadata: Metadata = { title: "Nhập văn bản luật" };

export default function Page() {
  return (
    <>
      <PageHeader
        title="Nhập văn bản luật"
        description="Lưu văn bản và chia nội dung thành các chunk (1–2 điều) để AI trích xuất entity và quan hệ. Kết quả là bản nháp chờ curator duyệt."
      />
      <LawInputForm />
    </>
  );
}
