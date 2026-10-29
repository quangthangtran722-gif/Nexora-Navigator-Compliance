"use client";

import { useEffect, useRef, useState } from "react";
import { FileText } from "lucide-react";

import { HO_SO } from "@/lib/copy";
import { getVanBanList } from "@/lib/data/queries";
import { useQuery } from "@/lib/data/use-query";
import type { OnboardKetQua } from "@/lib/data/onboard";
import { CountUp } from "@/lib/use-count-up";
import { cn } from "@/lib/utils";

/*
 * Màn "đang đối chiếu" sau khi gửi hồ sơ (thay spinner 15–20 giây). Kể đúng việc engine làm:
 *  trái  = văn bản đang có hiệu lực (đọc từ bảng van_ban), giữa = bộ lọc (điều kiện ↔ hồ sơ), phải = làn từng phòng ban.
 *  Trong lúc chờ: điều khoản (ô vuông nhỏ) chảy qua bộ lọc — ô xám rơi xuống (không áp dụng), ô vàng vào làn phòng ban.
 *  Phần chảy chỉ là minh hoạ lúc chờ; khi có kết quả thật (kq) thì ngừng, bộ đếm đếm tới tong_nghia_vu và thanh
 *  từng làn mọc tới so_nghia_vu thật, rồi gọi onFinish để hiện màn kết quả.
 * Chỉ animate transform/opacity. prefers-reduced-motion: không có ô chảy, có kết quả là chuyển màn ngay.
 */

const GIU_KET_QUA_MS = 1900; // thời gian giữ màn sau khi có kết quả (đủ cho bộ đếm + thanh mọc)

export function DoiChieuTrucQuan({
  hoSo,
  phongBan,
  kq,
  onFinish,
}: {
  hoSo: string[]; // chip hồ sơ: ngành, quy mô, lĩnh vực, số câu trả lời
  phongBan: string[];
  kq: OnboardKetQua | null; // null = đang chờ
  onFinish: () => void;
}) {
  const vb = useQuery(() => getVanBanList(), []);
  const vanBan = (vb.data ?? []).filter((v) => v.trang_thai === "active").slice(0, 4);
  const rootRef = useRef<HTMLDivElement>(null);
  const srcRef = useRef<HTMLDivElement>(null);
  const gateRef = useRef<HTMLDivElement>(null);
  const layerRef = useRef<HTMLDivElement>(null);
  const [giam] = useState(() => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  const coKq = !!kq;

  // Ô điều khoản chảy qua bộ lọc — chỉ khi đang chờ
  useEffect(() => {
    if (giam || coKq) return;
    const root = rootRef.current, layer = layerRef.current, src = srcRef.current, gate = gateRef.current;
    if (!root || !layer || !src || !gate) return;
    const tha = () => {
      const r = root.getBoundingClientRect(), s = src.getBoundingClientRect(), g = gate.getBoundingClientRect();
      const lanes = [...root.querySelectorAll("[data-lane]")].map((e) => e.getBoundingClientRect());
      const x0 = s.right - r.left - 8, y0 = s.top - r.top + 8 + Math.random() * (s.height - 16);
      const gx = g.left - r.left + g.width / 2 - 4, gy = g.top - r.top + g.height * (0.15 + Math.random() * 0.7);
      const vao = lanes.length > 0 && Math.random() < 0.5; // minh hoạ: khoảng nửa số điều khoản áp dụng
      const o = document.createElement("span");
      o.className = cn("pointer-events-none absolute top-0 left-0 size-2", vao ? "bg-primary" : "bg-status-khong-ap-dung-bar");
      layer.appendChild(o);
      const t = (x: number, y: number) => `translate(${x}px, ${y}px)`;
      let frames: Keyframe[];
      if (vao) {
        const l = lanes[Math.floor(Math.random() * lanes.length)];
        const x2 = l.left - r.left + 2, y2 = l.top - r.top + l.height / 2 - 4;
        frames = [
          { transform: t(x0, y0), opacity: 0, offset: 0 },
          { opacity: 1, offset: 0.12 },
          { transform: t(gx, gy), offset: 0.5 },
          { transform: t(x2, y2), opacity: 1, offset: 0.88 },
          { transform: t(x2 + 16, y2), opacity: 0, offset: 1 },
        ];
      } else {
        frames = [
          { transform: t(x0, y0), opacity: 0, offset: 0 },
          { opacity: 1, offset: 0.12 },
          { transform: t(gx, gy), opacity: 1, offset: 0.55 },
          { transform: t(gx + 10, gy + 44), opacity: 0, offset: 1 },
        ];
      }
      o.animate(frames, { duration: 1500, easing: "cubic-bezier(0.4, 0, 0.2, 1)" }).onfinish = () => o.remove();
    };
    const id = window.setInterval(tha, 240);
    return () => {
      window.clearInterval(id);
      layer.replaceChildren();
    };
  }, [giam, coKq]);

  // Có kết quả → giữ màn cho bộ đếm và thanh chạy xong rồi chuyển
  useEffect(() => {
    if (!kq) return;
    const id = window.setTimeout(onFinish, giam ? 0 : GIU_KET_QUA_MS);
    return () => window.clearTimeout(id);
  }, [kq, giam, onFinish]);

  const soPhong = (ten: string) => kq?.theo_phong_ban.find((p) => p.ten_phong_ban === ten)?.so_nghia_vu ?? 0;
  const maxPhong = Math.max(1, ...phongBan.map(soPhong));
  const D = HO_SO.doiChieu;

  return (
    <div className="max-w-3xl border bg-card" aria-busy={!kq} role="status" aria-live="polite">
      <div className="space-y-2 border-b px-5 py-4 sm:px-6">
        <p className="eyebrow">{kq ? D.xong : D.dang}</p>
        <p className="max-w-[60ch] text-sm text-muted-foreground">{D.moTa}</p>
      </div>

      <div ref={rootRef} className="relative grid grid-cols-[minmax(0,1fr)_2.5rem_minmax(0,1fr)] gap-x-3 px-4 py-6 sm:grid-cols-[minmax(0,1fr)_4rem_minmax(0,1fr)] sm:gap-x-6 sm:px-6">
        {/* Trái: văn bản + hồ sơ */}
        <div className="space-y-4">
          <div ref={srcRef} className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground">{D.vanBan}</p>
            {(vanBan.length ? vanBan.map((v) => v.so_hieu) : D.vanBanMacDinh).map((so, i) => (
              <div key={so} className="flex items-center gap-2 border bg-background px-2.5 py-1.5 text-xs font-medium tabular-nums animate-rise" style={{ "--d": `${i * 70}ms` } as React.CSSProperties}>
                <FileText className="size-3.5 shrink-0 text-gold-text" aria-hidden />
                <span className="truncate">{so}</span>
              </div>
            ))}
          </div>
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground">{D.hoSo}</p>
            <div className="flex flex-wrap gap-1">
              {hoSo.map((c) => (
                <span key={c} className="bg-accent px-2 py-0.5 text-xs text-accent-foreground">
                  {c}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Giữa: bộ lọc — vạch vàng dọc, nhãn đứng */}
        <div ref={gateRef} className="relative flex justify-center" aria-hidden>
          <span className="w-px bg-gold-edge" />
          <span className="absolute top-1/2 -translate-y-1/2 bg-card py-2 text-[10px] font-semibold tracking-[0.12em] text-gold-text uppercase [writing-mode:vertical-rl]">
            {D.boLoc}
          </span>
        </div>

        {/* Phải: làn từng phòng ban */}
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground">{D.phongBan}</p>
          {phongBan.map((ten, i) => (
            <div key={ten} data-lane className="space-y-1 border-l-2 border-gold-edge bg-background px-2.5 py-1.5">
              <div className="flex items-baseline justify-between gap-2 text-xs">
                <span className="truncate font-medium">{ten}</span>
                {kq && <span className="font-bold tabular-nums"><CountUp to={soPhong(ten)} duration={800} /></span>}
              </div>
              <div className="h-1 bg-muted">
                {kq && soPhong(ten) > 0 && (
                  <div className="h-full animate-grow-x bg-gold-metal-flat" style={{ width: `${(soPhong(ten) / maxPhong) * 100}%`, "--d": `${i * 70}ms` } as React.CSSProperties} />
                )}
              </div>
            </div>
          ))}
        </div>

        <div ref={layerRef} className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden />
      </div>

      {/* Bộ đếm: chỉ hiện số khi có kết quả thật */}
      <div className="flex items-baseline gap-3 border-t bg-group-solid px-5 py-4 sm:px-6">
        <span className={cn("text-[40px] leading-none font-extrabold text-group-title tabular-nums", !kq && "opacity-40")}>
          {kq ? <CountUp to={kq.tong_nghia_vu} duration={1100} /> : "··"}
        </span>
        <span className="text-sm text-group-sub">{D.dem}</span>
      </div>
    </div>
  );
}
