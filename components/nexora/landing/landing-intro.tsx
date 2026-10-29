"use client";

import { useEffect, useRef } from "react";

import { LogoLockup } from "@/components/nexora/landing/logo-lockup";
import { LANDING } from "@/lib/copy-landing";

/*
 * Chuyển động mở đầu landing — 3,5s cho cụm logo, rồi nội dung phần đầu hiện dần (~0,9s).
 * CSS/SVG + Web Animations API (element.animate), KHÔNG thêm thư viện chuyển động.
 * Các đoạn gối lên nhau và dùng đường cong ease-in-out để chuyển động liền mạch, không dừng-giật:
 *  0–0,6s     nền khối nổi bật phủ kín; logo mark ~160px ở giữa hiện dần (phóng nhẹ 0,9 → 1)
 *  0,4–1,7s   khung vuông vàng ánh kim tự vẽ quanh logo (SVG stroke-dashoffset); logo "thở" rất nhẹ
 *  1,7–2,4s   logo thu nhỏ, khung giãn ôm cả cụm; 2,3–2,75s chữ "NEXORA / COMPLIANCE NAVIGATOR" hiện ra
 *  2,6–3,5s   khung mờ đi; cả cụm trượt về ĐÚNG vị trí logo trên thanh menu (không biến mất); lớp phủ mờ dần
 * Bấm chuột / nhấn phím bất kỳ → nhảy ngay tới trạng thái cuối. Ai quyết định có chạy hay không: LandingPage
 * (1 lần mỗi phiên qua sessionStorage, bỏ qua hẳn khi prefers-reduced-motion).
 */

export const INTRO_KEY = "nexora-landing-intro"; // sessionStorage: chỉ chạy 1 lần mỗi phiên
const TONG_MS = 3500;
const RA = "cubic-bezier(0.16, 1, 0.3, 1)"; // expo-out: hiện ra, dừng êm
const VAO_RA = "cubic-bezier(0.65, 0, 0.35, 1)"; // ease-in-out: đổi trạng thái giữa chừng
const BAY = "cubic-bezier(0.76, 0, 0.24, 1)"; // ease-in-out mạnh hơn: trượt về menu
const MARK = 32; // logo mark trên menu (px)
const FRAME = 232; // cạnh khung vuông quanh logo ~160px
const t = (ms: number) => ms / TONG_MS; // mốc thời gian → offset keyframe

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
    const vw = window.innerWidth;
    const cx = vw / 2;
    const cy = window.innerHeight / 2;
    // transform-origin 0 0: điểm q trong cụm (toạ độ cục bộ) tới điểm Q trên màn hình với tỉ lệ s
    const dat = (q: { x: number; y: number }, s: number) =>
      `translate(${cx - r.left - s * q.x}px, ${cy - r.top - s * q.y}px) scale(${s})`;
    const tamMark = { x: MARK / 2, y: r.height / 2 };
    const tamCum = { x: r.width / 2, y: r.height / 2 };
    // Logo ~160px ở giữa; điện thoại thì không quá 40% bề ngang. Cụm có chữ + lề khung 56px phải vừa màn hình (chừa 16px mỗi bên).
    const S0 = Math.min(5, (vw * 0.4) / MARK);
    const S1 = Math.min(2.4, (vw - 56 - 32) / r.width);
    const khung = FRAME * (S0 / 5); // khung co theo logo trên màn nhỏ
    const sx = (r.width * S1 + 56) / khung;
    const sy = (r.height * S1 + 56) / khung;
    frame.style.width = `${khung}px`;
    frame.style.height = `${khung}px`;

    const text = cum.querySelector<HTMLElement>("[data-logo-text]");
    const anims: Animation[] = [
      cum.animate(
        [
          { offset: 0, transform: dat(tamMark, S0 * 0.9), opacity: 0, easing: RA },
          { offset: t(600), transform: dat(tamMark, S0), opacity: 1, easing: "ease-in-out" },
          { offset: t(1700), transform: dat(tamMark, S0 * 1.03), opacity: 1, easing: VAO_RA },
          { offset: t(2400), transform: dat(tamCum, S1), opacity: 1, easing: "linear" },
          { offset: t(2600), transform: dat(tamCum, S1 * 1.01), opacity: 1, easing: BAY },
          { offset: 1, transform: "translate(0px, 0px) scale(1)", opacity: 1 },
        ],
        { duration: TONG_MS, fill: "forwards" },
      ),
      ...(text
        ? [
            text.animate(
              [
                { offset: 0, opacity: 0, transform: "translateX(-6px)" },
                // Chữ hiện khi cụm đã gần đúng cỡ (cuối đoạn thu nhỏ) — hiện sớm hơn thì chữ còn to, tràn mép màn hình
                { offset: t(2300), opacity: 0, transform: "translateX(-6px)", easing: RA },
                { offset: t(2750), opacity: 1, transform: "translateX(0)" },
                { offset: 1, opacity: 1, transform: "translateX(0)" },
              ],
              { duration: TONG_MS, fill: "forwards" },
            ),
          ]
        : []),
      // Khung: vẽ nét (stroke-dashoffset trên rect), giãn ôm cả cụm, rồi mờ đi khi cụm trượt về menu
      frame.querySelector("rect")!.animate(
        [
          { offset: 0, strokeDashoffset: 1 },
          { offset: t(400), strokeDashoffset: 1, easing: VAO_RA },
          { offset: t(1700), strokeDashoffset: 0 },
          { offset: 1, strokeDashoffset: 0 },
        ],
        { duration: TONG_MS, fill: "forwards" },
      ),
      frame.animate(
        [
          { offset: 0, transform: "translate(-50%, -50%) scale(1, 1)", opacity: 1 },
          { offset: t(1700), transform: "translate(-50%, -50%) scale(1, 1)", opacity: 1, easing: VAO_RA },
          { offset: t(2400), transform: `translate(-50%, -50%) scale(${sx}, ${sy})`, opacity: 1 },
          { offset: t(2600), transform: `translate(-50%, -50%) scale(${sx}, ${sy})`, opacity: 1, easing: "ease-out" },
          { offset: t(3000), transform: `translate(-50%, -50%) scale(${sx * 1.04}, ${sy * 1.04})`, opacity: 0 },
          { offset: 1, opacity: 0 },
        ],
        { duration: TONG_MS, fill: "forwards" },
      ),
      // Lớp phủ: giữ kín tới 2,7s rồi mờ dần cùng lúc cụm trượt về menu — phần đầu trang cùng nền nên không giật
      overlay.animate(
        [
          { offset: 0, opacity: 1 },
          { offset: t(2700), opacity: 1, easing: "ease-in-out" }, // easing theo từng đoạn — đặt ở options sẽ bẻ cả dòng thời gian
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
      window.clearTimeout(chot);
      window.removeEventListener("keydown", ketThuc);
      window.removeEventListener("pointerdown", ketThuc);
      doneRef.current();
    };
    anims[0].finished.then(ketThuc).catch(() => undefined);
    // Chốt an toàn: animation không báo xong (trình duyệt lạ, tab bị treo khung hình) → vẫn hiện trang sau 3,5s + 2s
    const chot = window.setTimeout(ketThuc, TONG_MS + 2000);
    window.addEventListener("keydown", ketThuc);
    window.addEventListener("pointerdown", ketThuc);
    return () => {
      window.clearTimeout(chot);
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
          preserveAspectRatio="none"
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
        <LogoLockup className="h-full" nguyenBan />
      </div>
    </>
  );
}
