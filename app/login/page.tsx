import type { Metadata } from "next";
import { Suspense } from "react";

import { LoginForm } from "@/components/nexora/login-form";

export const metadata: Metadata = { title: "Đăng nhập" };

export default function Page() {
  return (
    <main className="flex flex-1 items-center justify-center bg-background px-4 py-12">
      {/* useSearchParams cần Suspense khi prerender (cacheComponents) */}
      <Suspense>
        <LoginForm />
      </Suspense>
    </main>
  );
}
