"use client";

import { useEffect, useState } from "react";

/*
 * Số đếm tăng dần từ 0 tới `to` (ease-out), chạy 1 lần khi `start` = true. Dùng cho con số chính
 * (Tổng quan, kết quả đối chiếu, mục Chạy thử ở landing). prefers-reduced-motion → hiện ngay số cuối.
 */
export function useCountUp(to: number, { duration = 900, start = true }: { duration?: number; start?: boolean } = {}) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!start) return;
    // Giảm chuyển động / số 0 → khung hình đầu tiên đã là số cuối (setState trong callback rAF, không gọi thẳng trong effect)
    const ngay = to <= 0 || window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0;
    const t0 = performance.now();
    const tick = (t: number) => {
      const p = ngay ? 1 : Math.min(1, (t - t0) / duration);
      setN(Math.round(to * (1 - (1 - p) ** 3))); // ease-out cubic: nhanh lúc đầu, dừng êm ở số cuối
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [to, duration, start]);
  return n;
}

// Bọc sẵn cho JSX: <CountUp to={18} />
export function CountUp({ to, duration, start }: { to: number; duration?: number; start?: boolean }) {
  return useCountUp(to, { duration, start });
}
