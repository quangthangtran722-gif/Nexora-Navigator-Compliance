import type { Metadata } from "next";
import { PageHeader, PagePlaceholder } from "@/components/nexora/page-header";

export const metadata: Metadata = { title: "Duyệt diagnostic" };

export default function Page() {
  return (
    <>
      <PageHeader title="Duyệt diagnostic" description="Xem các đầu mục cần kiểm tra trước khi gửi xuống phòng ban." />
      <PagePlaceholder />
    </>
  );
}
