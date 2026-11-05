"use client";
import Link from "next/link";
import type { ReactNode } from "react";
import { ShieldCheck } from "lucide-react";
import { AppSwitcherDropdown, type AppItem } from "@/components/AppSwitcherDropdown";

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
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur-md print:hidden">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded-lg focus:bg-white focus:px-3 focus:py-2 focus:shadow">
        মূল অংশে যান
      </a>
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <Link href={href} className="flex min-w-0 items-center gap-2.5">
            <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${accent} text-white shadow-md`} aria-hidden>
              {icon}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-[18px] font-extrabold leading-tight tracking-tight text-slate-900 sm:text-[20px]">{name}</span>
              <span className="block truncate text-[11px] font-semibold leading-none text-slate-500">{taglineEn ? `${taglineEn} · ${taglineBn}` : taglineBn}</span>
            </span>
          </Link>
          <Link
            href="/"
            className="hidden items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-[12px] font-medium text-slate-600 transition-colors hover:border-slate-400 lg:flex"
          >
            <img src="/kormopath-logo.jpg" alt="" className="h-4 w-auto rounded" />
            <span>← KormoPath</span>
          </Link>
        </div>
        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          {privacyNote && (
            <Link
              href="/settings"
              className="hidden items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-600 hover:border-slate-400 md:inline-flex"
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
      {label ? <span className="opacity-90"> · {label}</span> : null}
      {checked ? <span className="opacity-75"> · যাচাই {checked}</span> : null}
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
