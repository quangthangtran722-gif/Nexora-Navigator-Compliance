"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";

// Palette v4 mục 3.4: next-themes gắn class="dark" lên <html>; mặc định sáng, có "Theo máy"
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
      {children}
    </NextThemesProvider>
  );
}
