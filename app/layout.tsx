import type { Metadata } from "next";
import { Lexend, Geist_Mono } from "next/font/google";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/nexora/theme-provider";
import { AuthProvider } from "@/lib/auth/auth-provider";
import "./globals.css";

// Font chính (palette v2 mục 5): Lexend, một họ duy nhất, có subset vietnamese để hiển thị đủ dấu
const lexend = Lexend({
  variable: "--font-sans",
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700", "800"], // 800: h1 landing, số thẻ 25
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Nexora Compliance Navigator",
    template: "%s · Nexora",
  },
  description:
    "Biết văn bản pháp luật mới nào ảnh hưởng tới doanh nghiệp bạn, và phòng nào phải làm gì.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="vi"
      suppressHydrationWarning
      className={`${lexend.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <ThemeProvider>
          <AuthProvider>
            <TooltipProvider>{children}</TooltipProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
