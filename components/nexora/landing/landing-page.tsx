"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Archive,
  BellRing,
  Briefcase,
  Building2,
  Calculator,
  Check,
  CircleHelp,
  Library,
  ListChecks,
  Menu,
  ShieldCheck,
  UserRound,
} from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import { Sheet, SheetClose, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { INTRO_KEY, LandingIntro } from "@/components/nexora/landing/landing-intro";
import { LandingShot } from "@/components/nexora/landing/landing-shot";
import { LogoLockup } from "@/components/nexora/landing/logo-lockup";
import { LANDING, LIEN_HE_DOI_TAC } from "@/lib/copy-landing";
import { cn } from "@/lib/utils";

/*
 * Landing page — "/" khi chưa đăng nhập (HomeGate). Bố cục theo template SaaS đã duyệt, phần nhìn theo palette v4:
 * khối nổi bật = bg-group-solid (sáng: espresso đặc; tối: nền ánh vàng + viền vàng + chữ sâm panh, mục 3.3),
 * nút chính bg-gold-metal (variant mặc định), góc vuông, không sóng / bo tròn / kính mờ / bóng đổ.
 * Chữ ở lib/copy-landing.ts (skill nexora-content).
 */

const L = LANDING;
const KHUNG = "mx-auto w-full max-w-[1200px] px-4 sm:px-6 lg:px-8";
const NUT_PHU_TOI = "border-group-edge/60 bg-transparent text-group-title hover:bg-white/5 hover:text-group-title";

type Intro = "playing" | "entering" | "static";

// Chạy mở đầu? Không khi đã chạy trong phiên này hoặc máy bật giảm chuyển động. Chỉ ĐỌC ở đây —
// LandingIntro ghi cờ lúc bắt đầu chạy. sessionStorage có thể bị chặn → coi như chưa chạy.
function nenChayIntro(): boolean {
  if (typeof window === "undefined") return false;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return false;
  try {
    return !window.sessionStorage.getItem(INTRO_KEY);
  } catch {
    return true;
  }
}

// Hiện dần khi cuộn tới: gắn data-shown cho [data-reveal] khi vào khung nhìn, chỉ 1 lần
function useReveal(root: React.RefObject<HTMLElement | null>) {
  useEffect(() => {
    const els = root.current?.querySelectorAll<HTMLElement>("[data-reveal]");
    if (!els?.length) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          e.target.setAttribute("data-shown", "");
          io.unobserve(e.target);
        }
      },
      { rootMargin: "0px 0px -10% 0px", threshold: 0.12 },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [root]);
}

// Độ trễ hiện dần lần lượt (ms)
const tre = (ms: number) => ({ "--d": `${ms}ms` }) as React.CSSProperties;

export function LandingPage() {
  const rootRef = useRef<HTMLDivElement>(null);
  const [logoEl, setLogoEl] = useState<HTMLAnchorElement | null>(null);
  const [intro, setIntro] = useState<Intro>(() => (nenChayIntro() ? "playing" : "static"));
  const [cuon, setCuon] = useState(false);
  useReveal(rootRef);

  // Thanh menu: khi đã cuộn khỏi đầu trang thì hiện vạch kim loại dưới chân
  useEffect(() => {
    const onScroll = () => setCuon(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const xongIntro = useCallback(() => setIntro("entering"), []);
  const lienHe = LIEN_HE_DOI_TAC ? `mailto:${LIEN_HE_DOI_TAC}` : "/dang-ky"; // TODO(team): email đối tác

  return (
    <div ref={rootRef} className="landing flex min-h-svh flex-1 flex-col bg-background text-foreground" data-intro={intro}>
      {intro === "playing" && <LandingIntro target={logoEl} onDone={xongIntro} />}

      {/* 1. Thanh menu */}
      <header className="sticky top-0 z-40 bg-group-solid">
        <div className={cn(KHUNG, "flex h-16 items-center justify-between gap-4")}>
          <Link
            ref={setLogoEl}
            href="/"
            aria-label={L.brand.tenDayDu}
            className={cn("outline-none focus-visible:ring-3 focus-visible:ring-ring/50", intro === "playing" && "invisible")}
          >
            <LogoLockup />
          </Link>
          {/* Menu ngang cần ~950px (logo + 5 mục + 2 nút) → chỉ hiện từ 1280px; nhỏ hơn dùng ngăn kéo */}
          <nav aria-label="Các phần của trang" className="hidden items-center gap-6 xl:flex">
            {L.nav.items.map((i) => (
              <a key={i.href} href={i.href} className="text-sm whitespace-nowrap text-group-sub transition-colors hover:text-group-title">
                {i.label}
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <Link href="/login" className="hidden px-2 text-sm font-medium whitespace-nowrap text-group-title hover:underline sm:inline-flex">
              {L.nav.dangNhap}
            </Link>
            <Link href="/dang-ky" className={buttonVariants({ size: "lg" })}>
              <span className="hidden sm:inline">{L.nav.dangKy}</span>
              <span className="sm:hidden">{L.nav.dangKyNgan}</span>
            </Link>
            <Sheet>
              <SheetTrigger render={<Button variant="ghost" size="icon-lg" className="text-group-title hover:bg-white/5 hover:text-group-title xl:hidden" aria-label={L.nav.moMenu} />}>
                <Menu />
              </SheetTrigger>
              <SheetContent side="right" className="gap-0 p-0">
                <SheetTitle className="border-b px-5 py-4 text-base">{L.brand.tenDayDu}</SheetTitle>
                <nav aria-label="Các phần của trang" className="flex flex-col py-2">
                  {/* Bấm mục → cuộn tới phần đó và đóng ngăn kéo */}
                  {L.nav.items.map((i) => (
                    <SheetClose key={i.href} render={<a href={i.href} />} className="px-5 py-3 text-left text-sm hover:bg-accent">
                      {i.label}
                    </SheetClose>
                  ))}
                  <Link href="/login" className="border-t px-5 py-3 text-sm font-medium hover:bg-accent">
                    {L.nav.dangNhap}
                  </Link>
                </nav>
              </SheetContent>
            </Sheet>
          </div>
        </div>
        <div className={cn("h-0.5 bg-gold-metal-flat transition-opacity duration-200", cuon ? "opacity-100" : "opacity-0")} aria-hidden />
      </header>

      <main className="flex-1">
        {/* 2. Phần đầu — nền khối nổi bật, ảnh lấn xuống phần sau */}
        <section className="border-b border-group-border bg-group-solid" aria-labelledby="hero-title">
          <div className={cn(KHUNG, "pt-10 sm:pt-14 lg:pt-20")}>
            <div className="max-w-3xl space-y-5">
              <h1 id="hero-title" data-hero style={tre(0)} className="text-[28px] leading-tight font-bold text-balance text-group-title sm:text-4xl lg:text-[44px]">
                {L.hero.tieuDe}
              </h1>
              <p data-hero style={tre(60)} className="max-w-2xl text-base text-group-sub sm:text-lg">
                {L.hero.phu}
              </p>
              <div data-hero style={tre(120)} className="flex flex-wrap gap-3 pt-1">
                <Link href="/dang-ky" className={cn(buttonVariants({ size: "lg" }), "h-11 px-5 text-[15px]")}>
                  {L.hero.nutChinh} <ArrowRight />
                </Link>
                <a href="#cach-hoat-dong" className={cn(buttonVariants({ variant: "outline", size: "lg" }), "h-11 px-5 text-[15px]", NUT_PHU_TOI)}>
                  {L.hero.nutPhu}
                </a>
              </div>
              <p data-hero style={tre(120)} className="flex items-start gap-2 text-xs text-group-sub">
                <ShieldCheck className="mt-px size-4 shrink-0 text-group-edge" aria-hidden />
                {L.hero.vanBan}
              </p>
            </div>
            <div data-hero style={tre(180)} className="relative z-10 mt-10 -mb-16 sm:-mb-20 lg:mt-14 lg:-mb-24">
              <LandingShot name="tong-quan" alt={L.hero.anh} priority sizes="(min-width: 1200px) 1136px, 100vw" />
            </div>
          </div>
        </section>

        {/* 3. Vấn đề */}
        <section className="pt-28 pb-16 sm:pt-32 lg:pt-40 lg:pb-24" aria-labelledby="van-de-title">
          <div className={cn(KHUNG, "grid items-center gap-10 lg:grid-cols-12")}>
            <div className="space-y-4 lg:col-span-6" data-reveal>
              <Nhan>{L.vanDe.nhan}</Nhan>
              <h2 id="van-de-title" className="text-2xl font-bold text-balance sm:text-3xl">
                {L.vanDe.tieuDe}
              </h2>
              <div className="space-y-2 text-base text-muted-foreground">
                {L.vanDe.than.map((c) => (
                  <p key={c}>{c}</p>
                ))}
              </div>
            </div>
            <ul className="grid grid-cols-4 gap-2 sm:gap-3 lg:col-span-6" aria-label="Bốn người trong công ty">
              {L.vanDe.nguoi.map((n, i) => {
                const Icon = [UserRound, Briefcase, Briefcase, Calculator][i];
                const keToan = "ghiChu" in n;
                return (
                  <li
                    key={i}
                    data-reveal
                    style={tre(i * 60)}
                    className={cn(
                      "flex flex-col items-center justify-center gap-1.5 border bg-card px-1 py-4 text-center sm:aspect-square sm:gap-2 sm:p-3",
                      keToan && "border-2 border-primary bg-accent",
                    )}
                  >
                    <Icon className={cn("size-5 sm:size-6", keToan ? "text-gold-text" : "text-muted-foreground")} aria-hidden />
                    <span className="text-xs font-medium sm:text-sm">{n.ten}</span>
                    {keToan && <span className="text-[11px] leading-tight text-gold-text sm:text-xs">{n.ghiChu}</span>}
                  </li>
                );
              })}
            </ul>
          </div>
        </section>

        {/* 4. Sản phẩm làm gì — chữ trái, ảnh phải */}
        <section id="san-pham" className="scroll-mt-20 border-y bg-card py-16 lg:py-24" aria-labelledby="san-pham-title">
          <div className={cn(KHUNG, "grid items-center gap-10 lg:grid-cols-12")}>
            <div className="space-y-5 lg:col-span-5" data-reveal>
              <Nhan>{L.sanPham.nhan}</Nhan>
              <h2 id="san-pham-title" className="text-2xl font-bold text-balance sm:text-3xl">
                {L.sanPham.tieuDe}
              </h2>
              <p className="text-base text-muted-foreground">{L.sanPham.than}</p>
              <ul className="space-y-4">
                {L.sanPham.y.map((y, i) => (
                  <Y key={y.ten} icon={[CircleHelp, ListChecks, Building2][i]} ten={y.ten} mo={y.mo} />
                ))}
              </ul>
            </div>
            <div className="lg:col-span-7" data-reveal style={tre(80)}>
              <LandingShot name="xac-nhan-nghia-vu" alt={L.sanPham.anh} />
            </div>
          </div>
        </section>

        {/* 5. Cách hoạt động — 5 bước nối bằng đường 1px, bước Người duyệt viền vàng */}
        <section id="cach-hoat-dong" className="scroll-mt-20 py-16 lg:py-24" aria-labelledby="cach-title">
          <div className={cn(KHUNG, "space-y-10")}>
            <div className="max-w-2xl space-y-4" data-reveal>
              <Nhan>{L.cachHoatDong.nhan}</Nhan>
              <h2 id="cach-title" className="text-2xl font-bold text-balance sm:text-3xl">
                {L.cachHoatDong.tieuDe}
              </h2>
            </div>
            <ol className="grid gap-px border bg-border lg:grid-cols-5">
              {L.cachHoatDong.buoc.map((b, i) => {
                const nhan = i === L.cachHoatDong.buocNhan;
                return (
                  <li key={b.ten} data-reveal style={tre(i * 60)} className={cn("space-y-2 bg-card p-5", nhan && "bg-accent ring-2 ring-primary ring-inset")}>
                    <span className="block text-sm font-semibold text-gold-text tabular-nums">{String(i + 1).padStart(2, "0")}</span>
                    <span className="block font-semibold">{b.ten}</span>
                    <span className="block text-sm text-muted-foreground">{b.mo}</span>
                  </li>
                );
              })}
            </ol>
            <blockquote className="max-w-3xl border-l-[3px] border-primary bg-card px-5 py-4" data-reveal>
              <p className="font-semibold">{L.cachHoatDong.nhanManh.tieuDe}</p>
              <p className="mt-1 text-muted-foreground">{L.cachHoatDong.nhanManh.than}</p>
            </blockquote>
          </div>
        </section>

        {/* 6. Bằng chứng — ảnh trái + 3 thẻ số nổi đè mép dưới phải ảnh, chữ phải */}
        <section id="bang-chung" className="scroll-mt-20 border-y bg-card py-16 lg:py-24" aria-labelledby="bang-chung-title">
          <div className={cn(KHUNG, "grid items-center gap-10 lg:grid-cols-12")}>
            {/* Thẻ số chỉ đè ~20px lên mép dưới ảnh (không che cột "Nghĩa vụ" trong bảng) */}
            <div className="relative lg:col-span-7 lg:pb-16" data-reveal>
              <LandingShot name="cap-nhat-khach-hang" alt={L.bangChung.anh} />
              <ul className="mt-3 grid grid-cols-3 gap-2 sm:gap-3 lg:absolute lg:right-6 lg:bottom-0 lg:mt-0 lg:w-[80%]">
                {L.bangChung.the.map((t, i) => (
                  <li
                    key={t.mo}
                    data-reveal
                    style={tre(200 + i * 80)}
                    className={cn("p-3 sm:p-4", i === 0 ? "bg-gold-metal text-primary-foreground" : "border bg-card", i === 1 && "lg:translate-y-3", i === 2 && "lg:translate-y-6")}
                  >
                    <span className="block text-2xl leading-none font-bold tabular-nums sm:text-[32px]">{t.so}</span>
                    <span className={cn("mt-1.5 block text-xs", i === 0 ? "text-primary-foreground/80" : "text-muted-foreground")}>{t.mo}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="space-y-4 lg:col-span-5" data-reveal style={tre(80)}>
              <Nhan>{L.bangChung.nhan}</Nhan>
              <h2 id="bang-chung-title" className="text-2xl font-bold text-balance sm:text-3xl">
                {L.bangChung.tieuDe}
              </h2>
              <div className="space-y-2 text-base text-muted-foreground">
                {L.bangChung.than.map((c) => (
                  <p key={c}>{c}</p>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">{L.bangChung.ghiChu}</p>
            </div>
          </div>
        </section>

        {/* 7. Gói dịch vụ */}
        <section id="goi-dich-vu" className="scroll-mt-20 py-16 lg:py-24" aria-labelledby="goi-title">
          <div className={cn(KHUNG, "space-y-10")}>
            <div className="max-w-2xl space-y-4" data-reveal>
              <Nhan>{L.goi.nhan}</Nhan>
              <h2 id="goi-title" className="text-2xl font-bold text-balance sm:text-3xl">
                {L.goi.tieuDe}
              </h2>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {[L.goi.mienPhi, L.goi.traPhi].map((g, i) => (
                <div key={g.ten} data-reveal style={tre(i * 80)} className="relative flex flex-col border bg-card p-6">
                  {i === 0 && <div className="absolute inset-x-0 top-0 h-0.5 bg-gold-metal-flat" aria-hidden />}
                  <h3 className="text-lg font-semibold">{g.ten}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{g.mo}</p>
                  <ul className="mt-5 flex-1 space-y-3">
                    {g.y.map((y) => (
                      <li key={y} className="flex gap-2.5 text-sm">
                        <Check className="mt-0.5 size-4 shrink-0 text-gold-text" aria-hidden />
                        {y}
                      </li>
                    ))}
                  </ul>
                  <Link href="/dang-ky" className={cn(buttonVariants({ variant: i === 0 ? "default" : "outline", size: "lg" }), "mt-6 h-11 w-full text-[15px]")}>
                    {g.nut}
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 8. Vì sao khách ở lại — ảnh trái, 3 lý do phải */}
        <section className="border-y bg-card py-16 lg:py-24" aria-labelledby="o-lai-title">
          <div className={cn(KHUNG, "grid items-center gap-10 lg:grid-cols-12")}>
            <div className="order-2 lg:order-1 lg:col-span-7" data-reveal>
              <LandingShot name="thong-bao" alt={L.oLai.anh} />
            </div>
            <div className="order-1 space-y-5 lg:order-2 lg:col-span-5" data-reveal style={tre(80)}>
              <Nhan>{L.oLai.nhan}</Nhan>
              <h2 id="o-lai-title" className="text-2xl font-bold text-balance sm:text-3xl">
                {L.oLai.tieuDe}
              </h2>
              <ul className="space-y-4">
                {L.oLai.y.map((y, i) => (
                  <Y key={y.ten} icon={[Library, Archive, BellRing][i]} ten={y.ten} mo={y.mo} />
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* 9. Chương trình đối tác — khối nổi bật */}
        <section id="doi-tac" className="scroll-mt-20 py-16 lg:py-24" aria-labelledby="doi-tac-title">
          <div className={KHUNG}>
            <div className="relative border border-group-border bg-group-solid p-6 sm:p-10" data-reveal>
              <div className="absolute inset-x-0 top-0 h-0.5 bg-gold-metal-flat" aria-hidden />
              <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                <div className="max-w-2xl space-y-3">
                  <p className="text-sm font-semibold text-group-edge">{L.doiTac.nhan}</p>
                  <h2 id="doi-tac-title" className="text-2xl font-bold text-balance text-group-title sm:text-3xl">
                    {L.doiTac.tieuDe}
                  </h2>
                  <p className="text-base text-group-sub">{L.doiTac.than}</p>
                </div>
                <a href={lienHe} className={cn(buttonVariants({ size: "lg" }), "h-11 shrink-0 px-5 text-[15px]")}>
                  {L.doiTac.nut}
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* 10. Kêu gọi cuối trang */}
        <section className="border-t bg-card py-16 lg:py-20" aria-labelledby="cuoi-title">
          <div className={cn(KHUNG, "flex flex-col items-start gap-6 lg:flex-row lg:items-center lg:justify-between")} data-reveal>
            <h2 id="cuoi-title" className="max-w-2xl text-2xl font-bold text-balance sm:text-3xl">
              {L.cuoi.tieuDe}
            </h2>
            <Link href="/dang-ky" className={cn(buttonVariants({ size: "lg" }), "h-11 shrink-0 px-5 text-[15px]")}>
              {L.cuoi.nut} <ArrowRight />
            </Link>
          </div>
        </section>
      </main>

      {/* 11. Chân trang */}
      <footer className="border-t bg-background">
        <div className={cn(KHUNG, "flex flex-col gap-4 py-8 text-sm sm:flex-row sm:items-center sm:justify-between")}>
          <p className="text-muted-foreground">{L.chan.banQuyen}</p>
          <nav aria-label="Tài khoản" className="flex gap-5">
            <Link href="/login" className="hover:underline">
              {L.chan.dangNhap}
            </Link>
            <Link href="/dang-ky" className="font-medium text-gold-text hover:underline">
              {L.chan.dangKy}
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}

// Nhãn nhỏ trên tiêu đề phần
function Nhan({ children }: { children: React.ReactNode }) {
  return <p className="text-sm font-semibold text-gold-text">{children}</p>;
}

// 1 ý: icon Lucide trong ô vuông nền accent (như thẻ KPI) + tên + 1 câu
function Y({ icon: Icon, ten, mo }: { icon: React.ComponentType<{ className?: string }>; ten: string; mo: string }) {
  return (
    <li className="flex gap-3">
      <span className="flex size-9 shrink-0 items-center justify-center bg-accent" aria-hidden>
        <Icon className="size-[18px] text-gold-text" />
      </span>
      <span>
        <span className="block font-semibold">{ten}</span>
        <span className="block text-sm text-muted-foreground">{mo}</span>
      </span>
    </li>
  );
}
