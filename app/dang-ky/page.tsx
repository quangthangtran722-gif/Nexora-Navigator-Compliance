import type { Metadata } from "next";

import { SignupForm } from "@/components/nexora/signup-form";
import { COPY } from "@/lib/copy";

export const metadata: Metadata = { title: COPY.page.dangKy.title };

export default function Page() {
  return (
    <main className="flex flex-1 items-center justify-center bg-background px-4 py-12">
      <SignupForm />
    </main>
  );
}
