"use client";
import Link from "next/link";
import type { ReactNode } from "react";
import { ShieldCheck } from "lucide-react";
import { AppSwitcherDropdown, type AppItem } from "@/components/AppSwitcherDropdown";
import { KormoPathLogo } from "@/components/KormoPathLogo";

/**
 * Shared header for the ecosystem apps. Each app keeps its own colour and icon; the
 * KormoPath link, app switcher and privacy note are the same everywhere.
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
  return (
    <header className="kp-nav-wrap print:hidden">
      <a
        href="#main"
        className="skip-link sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-lg focus:bg-slate-900 focus:text-white focus:px-3 focus:py-2 focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
      >
        মূল অংশে যান
      </a>
      <div className="kp-nav mx-auto flex max-w-7xl items-center justify-between gap-3 px-2.5 py-2 sm:px-3">
        <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
          <Link href={href} className="flex min-w-0 items-center gap-2.5">
            <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] bg-gradient-to-br ${accent} text-white shadow-[inset_0_1px_0_rgba(255,255,255,.3),0_6px_14px_-6px_rgba(60,36,18,.55)]`} aria-hidden>
              {icon}
            </span>
            <span className="min-w-0">
              <span className="block truncate font-display text-[18px] font-semibold leading-tight tracking-tight text-slate-900 sm:text-[20px]">{name}</span>
              <span className="mt-0.5 block truncate text-[11px] font-medium leading-none text-slate-600">{taglineEn ? `${taglineEn} · ${taglineBn}` : taglineBn}</span>
            </span>
          </Link>
          {/* Desktop Logo Link */}
          <Link
            href="/"
            className="hidden shrink-0 items-center gap-1.5 rounded-xl border border-line bg-white/70 px-2.5 py-1 text-[12px] font-medium text-slate-700 transition-colors hover:border-amber-500 lg:flex"
            title="KormoPath Home"
          >
            <span className="text-slate-500 font-bold">←</span>
            <KormoPathLogo theme="light" variant="compact" size="sm" />
          </Link>
          {/* Mobile Logo Link */}
          <Link
            href="/"
            className="flex shrink-0 items-center gap-1 rounded-xl border border-line bg-white/70 px-2 py-1 text-[12px] font-medium text-slate-700 transition-colors hover:border-amber-500 lg:hidden"
            title="KormoPath Home"
            aria-label="KormoPath Home"
          >
            <span className="text-slate-500 font-bold">←</span>
            <KormoPathLogo theme="light" variant="mark" size="sm" />
          </Link>
        </div>
        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          {privacyNote && (
            <Link
              href="/settings"
              className="kp-chip hidden !h-8 !rounded-full !text-[12px] font-semibold text-emerald-800 md:inline-flex"
              title="আপনার ডেটা কোথায় থাকে দেখুন"
            >
              <ShieldCheck size={13} aria-hidden /> {privacyNote}
            </Link>
          )}
          {right}
          <AppSwitcherDropdown currentAppId={appId} lang="bn" variant="light" />
        </div>
      </div>
    </header>
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
  const cls = `inline-flex flex-wrap items-center gap-x-1 rounded-md border px-1.5 py-0.5 text-[10.5px] leading-snug ${CONF_STYLE[confidence]}`;
  return url ? (
    <a href={url} target="_blank" rel="noopener noreferrer" className={`${cls} hover:underline`}>
      {body} ↗
    </a>
  ) : (
    <span className={cls}>{body}</span>
  );
}
