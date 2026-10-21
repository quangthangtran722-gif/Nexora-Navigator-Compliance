"use client";

import { useEffect, useRef } from "react";

import { LogoLockup } from "@/components/nexora/landing/logo-lockup";
import { LANDING } from "@/lib/copy-landing";

/*
 * Chuyển động mở đầu landing — tổng 2,0s cho cụm logo, rồi nội dung phần đầu hiện dần (0,4s) = 2,4s.
 * CSS/SVG + Web Animations API (element.animate), KHÔNG thêm thư viện chuyển động.
 *  0–0,3s   nền khối nổi bật phủ kín; logo mark 96px ở giữa hiện dần (scale 0,96 → 1)
 *  0,3–1,1s khung vuông vàng ánh kim tự vẽ quanh logo (SVG stroke-dashoffset)
 *  1,1–1,5s logo thu nhỏ, chữ "NEXORA / COMPLIANCE NAVIGATOR" hiện ra; khung giãn ôm cả cụm
 *  1,5–2,0s khung mờ đi; cả cụm trượt về ĐÚNG vị trí logo trên thanh menu (không biến mất); lớp phủ mờ dần
 * Bấm chuột / nhấn phím bất kỳ → nhảy ngay tới trạng thái cuối. Ai quyết định có chạy hay không: LandingPage
 * (1 lần mỗi phiên qua sessionStorage, bỏ qua hẳn khi prefers-reduced-motion).
 */

export const INTRO_KEY = "nexora-landing-intro"; // sessionStorage: chỉ chạy 1 lần mỗi phiên
const TONG_MS = 2000;
const EASE = "cubic-bezier(0.2, 0.8, 0.2, 1)";
const MARK = 32; // logo mark trên menu (px)
const FRAME = 144; // cạnh khung vuông quanh logo 96px

export function LandingIntro({
  target,
  onDone,
}: {
  target: HTMLElement | null;
  onDone: () => void;
}) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const cumRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<SVGSVGElement>(null);
  const doneRef = useRef(onDone);

  useEffect(() => {
    doneRef.current = onDone;
  }, [onDone]);

  useEffect(() => {
    const overlay = overlayRef.current;
    const cum = cumRef.current;
    const frame = frameRef.current;
    if (!overlay || !cum || !frame || !target) return;
    try {
      window.sessionStorage.setItem(INTRO_KEY, "1");
    } catch {
      /* bị chặn → có thể chạy lại ở lần sau, không sao */
    }

    // Cụm logo đặt sẵn đúng chỗ logo trên menu; mọi trạng thái trước đó là transform tính từ chỗ này
    const r = target.getBoundingClientRect();
    Object.assign(cum.style, {
      left: `${r.left}px`,
      top: `${r.top}px`,
      width: `${r.width}px`,
      height: `${r.height}px`,
    });
    const cx = window.innerWidth / 2;
    const cy = window.innerHeight / 2;
    // transform-origin 0 0: điểm q trong cụm (toạ độ cục bộ) tới điểm Q trên màn hình với tỉ lệ s
    const dat = (q: { x: number; y: number }, s: number) =>
      `translate(${cx - r.left - s * q.x}px, ${cy - r.top - s * q.y}px) scale(${s})`;
    const tamMark = { x: MARK / 2, y: r.height / 2 };
    const tamCum = { x: r.width / 2, y: r.height / 2 };
    const S1 = 1.6; // cỡ cụm khi chữ đã hiện, trước khi trượt về menu

    const text = cum.querySelector<HTMLElement>("[data-logo-text]");
    const anims: Animation[] = [
      cum.animate(
        [
          { offset: 0, transform: dat(tamMark, 3 * 0.96), opacity: 0 },
          {
            offset: 0.15,
            transform: dat(tamMark, 3),
            opacity: 1,
            easing: EASE,
          },
          {
            offset: 0.55,
            transform: dat(tamMark, 3),
            opacity: 1,
            easing: EASE,
          },
          {
            offset: 0.75,
            transform: dat(tamCum, S1),
            opacity: 1,
            easing: EASE,
          },
          { offset: 1, transform: "translate(0px, 0px) scale(1)", opacity: 1 },
        ],
        { duration: TONG_MS, fill: "forwards" },
      ),
      ...(text
        ? [
            text.animate(
              [
                { offset: 0, opacity: 0 },
                { offset: 0.55, opacity: 0 },
                { offset: 0.75, opacity: 1 },
                { offset: 1, opacity: 1 },
              ],
              { duration: TONG_MS, fill: "forwards" },
            ),
          ]
        : []),
      // Khung: vẽ nét (stroke-dashoffset trên rect), giãn ôm cả cụm, rồi mờ đi khi cụm trượt về menu
      frame.querySelector("rect")!.animate(
        [
          { offset: 0, strokeDashoffset: 1 },
          { offset: 0.15, strokeDashoffset: 1 },
          { offset: 0.55, strokeDashoffset: 0 },
          { offset: 1, strokeDashoffset: 0 },
        ],
        { duration: TONG_MS, fill: "forwards" },
      ),
      frame.animate(
        [
          {
            offset: 0,
            transform: "translate(-50%, -50%) scale(1, 1)",
            opacity: 1,
          },
          {
            offset: 0.55,
            transform: "translate(-50%, -50%) scale(1, 1)",
            opacity: 1,
            easing: EASE,
          },
          {
            offset: 0.75,
            transform: `translate(-50%, -50%) scale(${(r.width * S1 + 48) / FRAME}, ${(r.height * S1 + 48) / FRAME})`,
            opacity: 1,
          },
          {
            offset: 0.95,
            transform: `translate(-50%, -50%) scale(${(r.width * S1 + 48) / FRAME}, ${(r.height * S1 + 48) / FRAME})`,
            opacity: 0,
          },
          { offset: 1, opacity: 0 },
        ],
        { duration: TONG_MS, fill: "forwards" },
      ),
      // Lớp phủ: giữ kín tới 1,5s rồi mờ dần — phần đầu trang cùng nền nên không bị giật
      overlay.animate(
        [
          { offset: 0, opacity: 1 },
          { offset: 0.75, opacity: 1, easing: "ease-out" }, // easing theo từng đoạn — đặt ở options sẽ bẻ cả dòng thời gian
          { offset: 1, opacity: 0 },
        ],
        { duration: TONG_MS, fill: "forwards" },
      ),
    ];

    let xong = false;
    const ketThuc = () => {
      if (xong) return;
      xong = true;
      anims.forEach((a) => a.cancel());
      window.removeEventListener("keydown", ketThuc);
      window.removeEventListener("pointerdown", ketThuc);
      doneRef.current();
    };
    anims[0].finished.then(ketThuc).catch(() => undefined);
    window.addEventListener("keydown", ketThuc);
    window.addEventListener("pointerdown", ketThuc);
    return () => {
      window.removeEventListener("keydown", ketThuc);
      window.removeEventListener("pointerdown", ketThuc);
      anims.forEach((a) => a.cancel());
    };
  }, [target]);

  // Cụm logo nằm NGOÀI lớp phủ: lớp phủ mờ dần nhưng cụm vẫn rõ tới khi đáp đúng chỗ logo trên menu
  return (
    <>
      <div
        ref={overlayRef}
        className="fixed inset-0 z-50 cursor-pointer bg-group-solid"
        role="presentation"
      >
        <span className="sr-only">{LANDING.nav.boQua}</span>
        {/* Khung vuông vàng ánh kim: rect pathLength=1 để vẽ bằng stroke-dashoffset; nét không giãn theo scale */}
        <svg
          ref={frameRef}
          width={FRAME}
          height={FRAME}
          viewBox={`0 0 ${FRAME} ${FRAME}`}
          className="pointer-events-none fixed top-1/2 left-1/2 overflow-visible"
          style={{
            transform: "translate(-50%, -50%)",
            transformOrigin: "center",
          }}
          aria-hidden
        >
          <defs>
            {/* Cùng các điểm màu của --gold-metal (palette v4) — SVG không đọc được gradient CSS */}
            <linearGradient id="intro-gold" x1="0" y1="0" x2="1" y2="0.3">
              <stop offset="0" stopColor="#A8843F" />
              <stop offset="0.35" stopColor="#D9BE7E" />
              <stop offset="0.5" stopColor="#F1E4C0" />
              <stop offset="0.68" stopColor="#CFAE68" />
              <stop offset="1" stopColor="#B08C45" />
            </linearGradient>
          </defs>
          <rect
            x="1"
            y="1"
            width={FRAME - 2}
            height={FRAME - 2}
            fill="none"
            stroke="url(#intro-gold)"
            strokeWidth="2"
            pathLength={1}
            strokeDasharray="1"
            strokeDashoffset="1"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      </div>
      <div
        ref={cumRef}
        className="pointer-events-none fixed z-[51] origin-top-left opacity-0"
        aria-hidden
      >
        <LogoLockup className="h-full" />
      </div>
    </>
  );
}
