"use client";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { ShieldCheck, Monitor, Lock, Trash2, X, AlertTriangle, RotateCcw } from "lucide-react";
import { AppSwitcherDropdown, APP_SHORT_NAME, type AppItem } from "@/components/layout/AppSwitcherDropdown";
import { KormoPathLogo } from "@/components/brand/KormoPathLogo";
import { UserNavBadge } from "@/components/auth/UserNavBadge";

function formatMmSs(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s < 10 ? "0" : ""}${s}`;
}

/**
 * Shared header for the ecosystem apps. Each app keeps its own colour and icon; the
 * KormoPath link, app switcher, privacy note and UDC Shared Terminal Mode are the same everywhere.
 */
export function AppHeader({
  appId,
  href,
  name,
  taglineBn,
  taglineEn,
  icon,
  accent,
  privacyNote = "ডেটা শুধু এই ডিভাইসে",
  right,
}: {
  appId: AppItem["id"];
  href: string;
  name: string;
  taglineBn: string;
  /** English line for non-Bangla readers (shown first). */
  taglineEn?: string;
  icon: ReactNode;
  accent: string; // tailwind gradient classes for the icon tile, e.g. "from-rose-500 to-rose-700"
  privacyNote?: string | null;
  right?: ReactNode;
}) {
  // ---- Union Digital Centre (UDC) / Shared PC Privacy Mode ----
  const [udcActive, setUdcActive] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(900); // 15 minutes
  const [showUdcMenu, setShowUdcMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const active = sessionStorage.getItem("kormopath:udc_mode") === "1";
      if (active) setUdcActive(true);
    } catch {}
  }, []);

  const wipeAndExit = useCallback(() => {
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && (k.startsWith("kormopath:") || k.startsWith("kp-"))) {
          keysToRemove.push(k);
        }
      }
      keysToRemove.forEach((k) => localStorage.removeItem(k));
      sessionStorage.clear();
    } catch {}
    window.location.href = "/?udc_wiped=1";
  }, []);

  const toggleUdc = useCallback(() => {
    if (udcActive) {
      setUdcActive(false);
      setShowUdcMenu(false);
      try {
        sessionStorage.removeItem("kormopath:udc_mode");
      } catch {}
    } else {
      setUdcActive(true);
      setSecondsLeft(900);
      setShowUdcMenu(false);
      try {
        sessionStorage.setItem("kormopath:udc_mode", "1");
      } catch {}
    }
  }, [udcActive]);

  // Escape or a click outside closes the shared-PC menu; focus goes back to its button.
  useEffect(() => {
    if (!showUdcMenu) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setShowUdcMenu(false);
      menuRef.current?.querySelector<HTMLButtonElement>("button")?.focus();
    };
    const onDown = (e: MouseEvent) => { if (menuRef.current && !menuRef.current.contains(e.target as Node)) setShowUdcMenu(false); };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onDown);
    return () => { document.removeEventListener("keydown", onKey); document.removeEventListener("mousedown", onDown); };
  }, [showUdcMenu]);

  const resetTimer = useCallback(() => {
    setSecondsLeft(900);
  }, []);

  // Activity listeners to reset countdown on mouse/touch/key events
  useEffect(() => {
    if (!udcActive) return;

    let throttleTimer = 0;
    const handleActivity = () => {
      const now = Date.now();
      if (now - throttleTimer > 2000) {
        throttleTimer = now;
        setSecondsLeft(900);
      }
    };

    window.addEventListener("mousemove", handleActivity, { passive: true });
    window.addEventListener("keydown", handleActivity, { passive: true });
    window.addEventListener("touchstart", handleActivity, { passive: true });
    window.addEventListener("scroll", handleActivity, { passive: true });

    const interval = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          clearInterval(interval);
          wipeAndExit();
          return 0;
        }
        return s - 1;
      });
    }, 1000);

    return () => {
      window.removeEventListener("mousemove", handleActivity);
      window.removeEventListener("keydown", handleActivity);
      window.removeEventListener("touchstart", handleActivity);
      window.removeEventListener("scroll", handleActivity);
      clearInterval(interval);
    };
  }, [udcActive, wipeAndExit]);

  // Close UDC menu when clicking outside
  useEffect(() => {
    if (!showUdcMenu) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowUdcMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showUdcMenu]);

  // The apps open in Bangla: an English product name ("Shohoj Budget") is shown as its Bangla short name, and the
  // English name moves into the tooltip. A page that already passes a Bangla name keeps it.
  const shownName = /^[\x00-\x7F]+$/.test(name) && APP_SHORT_NAME[appId] && appId !== "kormopath" ? APP_SHORT_NAME[appId].bn : name;

  return (
    <>
      {/* Imminent Inactivity Warning Toast (< 60s) */}
      {udcActive && secondsLeft <= 60 && (
        <div
          role="alert"
          aria-live="assertive"
          className="fixed top-2 left-1/2 z-50 -translate-x-1/2 w-11/12 max-w-md rounded-xl border-2 border-red-500 bg-red-50 px-4 py-3 shadow-xl text-red-900"
        >
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="h-5 w-5 shrink-0 text-red-600 mt-0.5 animate-bounce" />
            <div className="flex-1 text-xs">
              <p className="font-bold text-red-950">
                অসক্রিয়তার সতর্কতা: {secondsLeft} সেকেন্ডে ডেটা মুছে যাবে!
              </p>
              <p className="mt-0.5 text-red-800">
                শেয়ার্ড পিসির নিরাপত্তা রক্ষায় এই সেশনটি স্বয়ংক্রিয়ভাবে বন্ধ করা হবে।
              </p>
              <div className="mt-2.5 flex items-center gap-2">
                <button
                  type="button"
                  onClick={resetTimer}
                  className="rounded-lg bg-red-700 px-3 py-1 font-semibold text-white shadow-xs hover:bg-red-800"
                >
                  আমি কাজ করছি (১৫ মিনিট)
                </button>
                <button
                  type="button"
                  onClick={wipeAndExit}
                  className="rounded-lg border border-red-300 bg-white px-2.5 py-1 font-medium text-red-700 hover:bg-red-100"
                >
                  এখনই মুছুন
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <header className="kp-nav-wrap print:hidden">
        <a
          href="#main"
          className="skip-link sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-lg focus:bg-slate-900 focus:text-white focus:px-3 focus:py-2 focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
        >
          মূল অংশে যান
        </a>
        <div className="kp-nav mx-auto flex max-w-7xl items-center justify-between gap-3 px-2.5 py-2 sm:px-3">
          <div className="kp-app-brand flex min-w-0 items-center gap-2.5 sm:gap-3">
            <Link href={href} prefetch={true} className="flex min-w-0 items-center gap-2.5 group">
              <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] bg-gradient-to-br ${accent} text-white shadow-[inset_0_1px_0_rgba(255,255,255,.35),0_4px_12px_-2px_rgba(60,36,18,.35)] ring-1 ring-white/30 transition-transform duration-200 group-hover:scale-105`} aria-hidden>
                {icon}
              </span>
              <span className="min-w-0">
                <span className="kp-app-name block truncate font-display text-[18px] font-bold leading-tight tracking-tight text-slate-900 sm:text-[20px]">{shownName}</span>
                <span className="kp-app-tagline mt-0.5 block truncate text-[11.5px] font-medium leading-none text-slate-600">{taglineBn}</span>
              </span>
            </Link>
            {/* Desktop Logo Link */}
            <Link
              href="/"
              prefetch={true}
              className="hidden shrink-0 items-center gap-1.5 rounded-xl border border-line bg-white/80 px-2.5 py-1 text-[12px] font-semibold text-slate-700 transition-all hover:border-emerald-600 hover:bg-emerald-50/50 hover:text-emerald-900 lg:flex"
              title="KormoPath Home"
            >
              <span className="text-slate-400 font-bold group-hover:text-emerald-700">←</span>
              <KormoPathLogo theme="light" variant="compact" size="sm" />
            </Link>
            {/* Mobile Logo Link */}
            <Link
              href="/"
              prefetch={true}
              className="flex min-h-11 min-w-11 shrink-0 items-center justify-center gap-1 rounded-xl border border-line bg-white/80 px-2 py-1 text-[12px] font-semibold text-slate-700 transition-all hover:border-emerald-600 hover:bg-emerald-50/50 hover:text-emerald-900 lg:hidden"
              title="KormoPath Home"
              aria-label="KormoPath Home"
            >
              <span className="text-slate-400 font-bold">←</span>
              <KormoPathLogo theme="light" variant="mark" size="sm" />
            </Link>
          </div>
          <div className="kp-app-actions flex shrink-0 items-center gap-2 sm:gap-3">
            {/* UDC / Shared Terminal Privacy Mode Toggle */}
            <div className="relative" ref={menuRef}>
              {udcActive ? (
                <button
                  type="button"
                  onClick={() => setShowUdcMenu(!showUdcMenu)}
                  aria-expanded={showUdcMenu}
                  aria-haspopup="dialog"
                  className="inline-flex h-8 items-center gap-1.5 rounded-full border border-amber-300 bg-amber-50/90 px-2.5 text-[11.5px] font-semibold text-amber-900 shadow-xs hover:bg-amber-100 transition-colors"
                  title="শেয়ার্ড পিসি মোড সক্রিয় (১৫ মিনিট অসক্রিয়তায় ডেটা মুছবে)"
                >
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="font-mono">{formatMmSs(secondsLeft)}</span>
                  <span className="hidden sm:inline">ইউডিসি মোড</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={toggleUdc}
                  className="hidden md:inline-flex h-8 items-center gap-1.5 rounded-full border border-slate-200 bg-white/70 px-2.5 text-[11.5px] font-medium text-slate-700 hover:border-amber-400 hover:bg-amber-50/50 transition-colors"
                  title="ইউনিয়ন ডিজিটাল সেন্টার বা শেয়ার্ড পিসি মোড চালু করুন"
                >
                  <Monitor size={12} className="text-slate-500" />
                  <span>শেয়ার্ড পিসি</span>
                </button>
              )}

              {/* UDC Controls Dropdown */}
              {showUdcMenu && (
                <div className="absolute right-0 mt-1.5 w-64 rounded-xl border border-amber-200 bg-white p-3 shadow-xl z-50 text-left">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <span className="text-[12px] font-bold text-slate-900 flex items-center gap-1.5">
                      <Lock size={13} className="text-amber-600" /> UDC শেয়ার্ড পিসি মোড
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowUdcMenu(false)}
                      aria-label="বন্ধ করুন"
                      className="grid h-11 w-11 place-items-center rounded-lg text-slate-400 hover:text-slate-600"
                    >
                      <X size={14} />
                    </button>
                  </div>
                  <p className="mt-2 text-[11px] text-slate-600 leading-relaxed">
                    ১৫ মিনিট কোনো কিবোর্ড বা মাউস নড়াচড়া না হলে আপনার ডেটা ও সেশন স্বয়ংক্রিয়ভাবে মুছে যাবে।
                  </p>
                  <div className="mt-3 flex flex-col gap-1.5 text-[11px]">
                    <button
                      type="button"
                      onClick={resetTimer}
                      className="flex items-center gap-2 rounded-lg border border-slate-200 px-2.5 py-1.5 font-medium text-slate-700 hover:bg-slate-50"
                    >
                      <RotateCcw size={12} className="text-slate-500" />
                      সময় ১৫ মিনিটে রিসেট করুন
                    </button>
                    <button
                      type="button"
                      onClick={wipeAndExit}
                      className="flex items-center gap-2 rounded-lg bg-red-600 px-2.5 py-1.5 font-semibold text-white hover:bg-red-700"
                    >
                      <Trash2 size={12} />
                      এখনই সব মুছুন ও প্রস্থান
                    </button>
                    <button
                      type="button"
                      onClick={toggleUdc}
                      className="mt-1 text-center text-[10.5px] text-slate-500 hover:underline"
                    >
                      শেয়ার্ড মোড বন্ধ করুন
                    </button>
                  </div>
                </div>
              )}
            </div>

            {privacyNote && (
              <Link
                href="/settings"
                prefetch={true}
                className="kp-chip hidden !h-8 !rounded-full !text-[12px] font-semibold text-emerald-800 md:inline-flex"
                title="আপনার ডেটা কোথায় থাকে দেখুন"
              >
                <ShieldCheck size={13} aria-hidden /> {privacyNote}
              </Link>
            )}
            {right}
            <UserNavBadge lang="bn" />
            <AppSwitcherDropdown currentAppId={appId} lang="bn" variant="light" genericLabel />
          </div>
        </div>
      </header>
    </>
  );
}

const CONF_STYLE: Record<string, string> = {
  official: "border-emerald-300 bg-emerald-50 text-emerald-800",
  reported: "border-sky-300 bg-sky-50 text-sky-800",
  indicative: "border-amber-300 bg-amber-50 text-amber-900",
  estimate: "border-amber-300 bg-amber-50 text-amber-900",
  example: "border-slate-300 bg-slate-100 text-slate-700",
  unverified: "border-red-300 bg-red-50 text-red-800",
  user: "border-violet-300 bg-violet-50 text-violet-800",
};
const CONF_LABEL: Record<string, string> = {
  official: "অফিসিয়াল উৎস",
  reported: "রিপোর্টেড",
  indicative: "আনুমানিক পরিসর",
  estimate: "অনুমান",
  example: "উদাহরণ — বাস্তব তথ্য নয়",
  unverified: "যাচাই করা হয়নি",
  user: "আপনার দেওয়া তথ্য",
};

/** Small label that says where a number came from, how sure we are, and when it was checked. */
export function SourceTag({
  confidence,
  label,
  url,
  checked,
}: {
  confidence: keyof typeof CONF_STYLE;
  label?: string;
  url?: string;
  checked?: string;
}) {
  const body = (
    <>
      <strong className="font-bold">{CONF_LABEL[confidence]}</strong>
      {label ? <span> · {label}</span> : null}
      {checked ? <span> · যাচাই {checked}</span> : null}
    </>
  );
  const cls = `inline-flex flex-wrap items-center gap-x-1 rounded-md border px-1.5 py-0.5 text-[12px] leading-snug ${CONF_STYLE[confidence]}`;
  return url ? (
    <a href={url} target="_blank" rel="noopener noreferrer" className={`${cls} min-h-[32px] hover:underline`}>
      {body} <span aria-hidden="true">↗</span><span className="sr-only"> (নতুন ট্যাবে খোলে)</span>
    </a>
  ) : (
    <span className={cls}>{body}</span>
  );
}
