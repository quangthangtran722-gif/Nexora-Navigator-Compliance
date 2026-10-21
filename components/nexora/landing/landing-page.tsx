"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Archive,
  BellRing,
  Building2,
  Check,
  CircleHelp,
  Library,
  ListChecks,
  Menu,
  ShieldCheck,
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
// Khoảng cách trên/dưới MỌI mục: một giá trị cố định — 64px điện thoại, 96px màn rộng
const MUC = "py-16 lg:py-24";
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
      {/* position: sticky; top: 0 — nền bg-topbar đặc, KHÔNG backdrop-blur; vạch vàng 2px dưới khi đã cuộn */}
      <header className="sticky top-0 z-40 bg-topbar">
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
              <SheetContent side="right" className="gap-0 p-0" overlayClassName="supports-backdrop-filter:backdrop-blur-none">
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
        {/* 2. Phần đầu — nền khối nổi bật + 1 lớp radial-gradient vàng rất mờ góc trên phải (ngoại lệ có chủ đích, chỉ phần đầu);
            ảnh nằm trọn trong phần đầu để mọi mục cùng một khoảng cách */}
        <section className="landing-hero border-b border-group-border" aria-labelledby="hero-title">
          <div className={cn(KHUNG, MUC)}>
            <div className="max-w-3xl space-y-5">
              <h1 id="hero-title" data-hero style={tre(0)} className="text-[28px] leading-tight font-extrabold text-balance text-group-title sm:text-4xl lg:text-[44px]">
                {L.hero.tieuDe}
              </h1>
              {/* Phần "Vấn đề" gộp vào đây thành 1 câu dẫn */}
              <p data-hero style={tre(100)} className="max-w-2xl text-base text-group-sub sm:text-lg">
                {L.hero.dan} <span className="text-group-title">{L.hero.phu}</span>
              </p>
              <div data-hero style={tre(200)} className="flex flex-wrap gap-3 pt-1">
                <Link href="/dang-ky" className={cn(buttonVariants({ size: "lg" }), "h-11 px-5 text-[15px]")}>
                  {L.hero.nutChinh} <ArrowRight />
                </Link>
                <a href="#cach-hoat-dong" className={cn(buttonVariants({ variant: "outline", size: "lg" }), "h-11 px-5 text-[15px]", NUT_PHU_TOI)}>
                  {L.hero.nutPhu}
                </a>
              </div>
              <p data-hero style={tre(250)} className="flex items-start gap-2 text-xs text-group-sub">
                <ShieldCheck className="mt-px size-4 shrink-0 text-group-edge" aria-hidden />
                {L.hero.vanBan}
              </p>
            </div>
            <div data-hero style={tre(320)} className="mt-10 lg:mt-14">
              <LandingShot name="tong-quan" alt={L.hero.anh} priority sizes="(min-width: 1200px) 1136px, 100vw" />
            </div>
          </div>
        </section>

        {/* 4. Sản phẩm làm gì — chữ trái, ảnh phải */}
        <section id="san-pham" className={cn("scroll-mt-20 border-b bg-card", MUC)} aria-labelledby="san-pham-title">
          <div className={cn(KHUNG, "grid items-center gap-10 lg:grid-cols-12")}>
            <div className="space-y-5 lg:col-span-5" data-reveal>
              <h2 id="san-pham-title" className="text-2xl font-bold text-balance sm:text-3xl">
                {L.sanPham.tieuDe}
              </h2>
              <ul className="space-y-3">
                {L.sanPham.nhan.map((ten, i) => (
                  <Y key={ten} icon={[CircleHelp, ListChecks, Building2][i]} ten={ten} />
                ))}
              </ul>
            </div>
            <div className="lg:col-span-7" data-reveal style={tre(80)}>
              <LandingShot name="xac-nhan-nghia-vu" alt={L.sanPham.anh} />
            </div>
          </div>
        </section>

        {/* 5. Cách hoạt động — 5 bước nối bằng đường 1px, bước Người duyệt viền vàng */}
        <section id="cach-hoat-dong" className={cn("scroll-mt-20", MUC)} aria-labelledby="cach-title">
          <div className={cn(KHUNG, "space-y-10")}>
            <div className="max-w-2xl space-y-4" data-reveal>
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

        {/* 6. Chạy thử — tiêu đề + câu dẫn → MỘT hàng chia đôi: khối số (trái) | ảnh Cập nhật khách hàng (phải), căn trên.
            Dưới 1280px: khối số trên (thẻ 25 trên cùng, hai thẻ 18 cạnh nhau), ảnh dưới. */}
        <section id="chay-thu" className={cn("scroll-mt-20 border-y bg-card", MUC)} aria-labelledby="chay-thu-title">
          <div className={cn(KHUNG, "space-y-8 lg:space-y-10")}>
            <div className="max-w-2xl space-y-3" data-reveal>
              <p className="text-sm font-semibold text-gold-text">{L.bangChung.nhan}</p>
              <h2 id="chay-thu-title" className="text-2xl font-bold text-balance sm:text-3xl">
                {L.bangChung.tieuDe}
              </h2>
              <p className="text-base text-muted-foreground">{L.bangChung.than}</p>
              <p className="text-xs text-muted-foreground">{L.bangChung.ghiChu}</p>
            </div>
            {/* Chia đôi từ 1280px (dưới đó ảnh quá hẹp, khối số và ảnh lệch chiều cao) — nhỏ hơn thì xếp dọc */}
            <div className="grid items-stretch gap-6 xl:grid-cols-2">
              {/* Khối số: thẻ 25 (~55% bề ngang, bg-gold-metal, số 72px/800) bên trái; hai thẻ 18 (số 44px/700) xếp dọc bên phải,
                  tổng cao bằng thẻ 25. Cả khối cao bằng ảnh bên cạnh (hàng lưới kéo giãn), số căn đáy thẻ. */}
              <ul className="grid grid-cols-2 gap-3 xl:grid-cols-[11fr_9fr] xl:grid-rows-2" aria-label={L.bangChung.tieuDe}>
                {L.bangChung.the.map((t, i) =>
                  i === 0 ? (
                    <li key={t.mo} data-reveal className="col-span-2 flex flex-col justify-end bg-gold-metal p-5 text-[#2A2112] sm:p-6 xl:col-span-1 xl:row-span-2">
                      <span className="block text-[64px] leading-none font-extrabold tabular-nums sm:text-[72px]">{t.so}</span>
                      <span className="mt-2 block text-base font-medium">{t.mo}</span>
                    </li>
                  ) : (
                    <li key={t.mo} data-reveal style={tre(i * 80)} className="flex flex-col justify-end border bg-card px-4 py-3">
                      <span className="block text-[40px] leading-none font-bold tabular-nums sm:text-[44px]">{t.so}</span>
                      <span className="mt-1.5 block text-base text-muted-foreground">{t.mo}</span>
                    </li>
                  ),
                )}
              </ul>
              <div className="self-start" data-reveal style={tre(120)}>
                <LandingShot name="cap-nhat-khach-hang" alt={L.bangChung.anh} sizes="(min-width: 1280px) 568px, 100vw" />
              </div>
            </div>
          </div>
        </section>

        {/* 7. Gói dịch vụ */}
        <section id="goi-dich-vu" className={cn("scroll-mt-20", MUC)} aria-labelledby="goi-title">
          <div className={cn(KHUNG, "space-y-10")}>
            <div className="max-w-2xl space-y-4" data-reveal>
              <h2 id="goi-title" className="text-2xl font-bold text-balance sm:text-3xl">
                {L.goi.tieuDe}
              </h2>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {[L.goi.mienPhi, L.goi.traPhi].map((g, i) => (
                <div key={g.ten} data-reveal style={tre(i * 80)} className="relative flex flex-col border bg-card p-6">
                  {i === 0 && <div className="absolute inset-x-0 top-0 h-0.5 bg-gold-metal-flat" aria-hidden />}
                  <h3 className="text-lg font-semibold">{g.ten}</h3>
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
        <section className={cn("border-y bg-card", MUC)} aria-labelledby="o-lai-title">
          <div className={cn(KHUNG, "grid items-center gap-10 lg:grid-cols-12")}>
            <div className="order-2 lg:order-1 lg:col-span-7" data-reveal>
              <LandingShot name="thong-bao" alt={L.oLai.anh} />
            </div>
            <div className="order-1 space-y-5 lg:order-2 lg:col-span-5" data-reveal style={tre(80)}>
              <h2 id="o-lai-title" className="text-2xl font-bold text-balance sm:text-3xl">
                {L.oLai.tieuDe}
              </h2>
              <ul className="space-y-3">
                {L.oLai.nhan.map((ten, i) => (
                  <Y key={ten} icon={[Library, Archive, BellRing][i]} ten={ten} />
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* 9. Chương trình đối tác — khối nổi bật */}
        <section id="doi-tac" className={cn("scroll-mt-20", MUC)} aria-labelledby="doi-tac-title">
          <div className={KHUNG}>
            <div className="relative border border-group-border bg-group-solid p-6 sm:p-10" data-reveal>
              <div className="absolute inset-x-0 top-0 h-0.5 bg-gold-metal-flat" aria-hidden />
              <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                <div className="max-w-2xl space-y-3">
                  <p className="text-sm font-semibold text-group-edge">{L.doiTac.nhan}</p>
                  <h2 id="doi-tac-title" className="text-2xl font-bold text-balance text-group-title sm:text-3xl">
                    {L.doiTac.tieuDe}
                  </h2>
                </div>
                <a href={lienHe} className={cn(buttonVariants({ size: "lg" }), "h-11 shrink-0 px-5 text-[15px]")}>
                  {L.doiTac.nut}
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* 10. Kêu gọi cuối trang */}
        <section className={cn("border-t bg-card", MUC)} aria-labelledby="cuoi-title">
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

      {/* 11. Chân trang — tối giản; email liên hệ chỉ hiện khi team đã có (TODO trong lib/copy-landing.ts) */}
      <footer className="border-t bg-background">
        <div className={cn(KHUNG, "flex flex-col gap-4 py-8 text-sm sm:flex-row sm:items-center sm:justify-between")}>
          <p className="text-muted-foreground">
            <span className="font-medium text-foreground">{L.chan.ten}</span> · {L.chan.team}
          </p>
          <nav aria-label="Tài khoản và liên hệ" className="flex flex-wrap gap-x-5 gap-y-2">
            <Link href="/login" className="hover:underline">
              {L.chan.dangNhap}
            </Link>
            <Link href="/dang-ky" className="font-medium text-gold-text hover:underline">
              {L.chan.dangKy}
            </Link>
            {LIEN_HE_DOI_TAC && (
              <a href={`mailto:${LIEN_HE_DOI_TAC}`} className="hover:underline">
                {LIEN_HE_DOI_TAC}
              </a>
            )}
          </nav>
        </div>
      </footer>
    </div>
  );
}


// 1 ý: icon Lucide trong ô vuông nền accent (như thẻ KPI) + tên + 1 câu
function Y({ icon: Icon, ten, mo }: { icon: React.ComponentType<{ className?: string }>; ten: string; mo?: string }) {
  return (
    <li className={cn("flex gap-3", !mo && "items-center")}>
      <span className="flex size-9 shrink-0 items-center justify-center bg-accent" aria-hidden>
        <Icon className="size-[18px] text-gold-text" />
      </span>
      <span>
        <span className="block font-semibold">{ten}</span>
        {mo && <span className="block text-sm text-muted-foreground">{mo}</span>}
      </span>
    </li>
  );
}
