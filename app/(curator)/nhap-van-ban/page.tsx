import type { Metadata } from "next";

import { DraftVanBanList } from "@/components/nexora/draft-van-ban-list";
import { LawInputForm } from "@/components/nexora/law-input-form";
import { PageHeader } from "@/components/nexora/page-header";
import { COPY } from "@/lib/copy";

// Chữ trang lấy từ lib/copy.ts (nexora-wording-v1). URL giữ nguyên, chỉ đổi chữ hiển thị.
const P = COPY.page.nhapVanBan;

export const metadata: Metadata = { title: P.title };

export default function Page() {
  return (
    <>
      <PageHeader title={P.title} description={P.description} />
      <DraftVanBanList />
      <LawInputForm />
    </>
  );
}
