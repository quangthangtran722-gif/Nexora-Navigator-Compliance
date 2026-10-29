"use client";

import { useEffect, useState } from "react";

/*
 * Số đếm tăng dần từ 0 tới `to` (ease-out), chạy 1 lần khi `start` = true. Dùng cho con số chính
 * (Tổng quan, kết quả đối chiếu, mục Chạy thử ở landing). prefers-reduced-motion → hiện ngay số cuối.
 * Luôn dừng ở đúng `to`: tab bị ẩn / cửa sổ bị che thì trình duyệt ngừng gọi requestAnimationFrame — số sẽ kẹt ở
 * khung đang dở (29/10: màn đối chiếu kẹt 20 trong khi kết quả thật 25). Nên có thêm hẹn giờ chốt số cuối và
 * nhảy thẳng tới số cuối khi tab ẩn.
 */
export function useCountUp(to: number, { duration = 900, start = true }: { duration?: number; start?: boolean } = {}) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!start) return;
    // Giảm chuyển động / số 0 / tab đang ẩn → khung hình đầu tiên đã là số cuối (setState trong callback, không gọi thẳng trong effect)
    const ngay = to <= 0 || document.hidden || window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0;
    const t0 = performance.now();
    const chot = () => {
      cancelAnimationFrame(raf);
      setN(to);
    };
    const tick = (t: number) => {
      const p = ngay ? 1 : Math.min(1, (t - t0) / duration);
      setN(Math.round(to * (1 - (1 - p) ** 3))); // ease-out cubic: nhanh lúc đầu, dừng êm ở số cuối
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    // setTimeout vẫn chạy khi rAF bị dừng (tab ẩn chỉ bị giãn tối đa ~1 giây)
    const hen = window.setTimeout(chot, duration + 100);
    const anTab = () => document.hidden && chot();
    document.addEventListener("visibilitychange", anTab);
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(hen);
      document.removeEventListener("visibilitychange", anTab);
    };
  }, [to, duration, start]);
  return n;
}

// Bọc sẵn cho JSX: <CountUp to={18} />
export function CountUp({ to, duration, start }: { to: number; duration?: number; start?: boolean }) {
  return useCountUp(to, { duration, start });
}
