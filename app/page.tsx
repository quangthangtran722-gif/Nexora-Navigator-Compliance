import { HomeGate } from "@/components/nexora/home-gate";

// Trang gốc: đã đăng nhập → chuyển tới trang đầu của vai trò; chưa → mời đăng nhập
export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center px-4 py-16 sm:px-6">
      <HomeGate />
    </main>
  );
}
