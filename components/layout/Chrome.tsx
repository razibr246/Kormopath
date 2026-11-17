"use client";
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AppSwitcherDropdown } from "@/components/layout/AppSwitcherDropdown";
import { KormoPathLogo } from "@/components/brand/KormoPathLogo";
import { FX_FALLBACK } from "@/lib/data";
import { ArrowUpRight, FlaskConical, LayoutGrid, Languages, Menu, Search, ShieldCheck, X } from "lucide-react";

const NAV = [
  { href: "/workspace", bn: "ওয়ার্কস্পেস", en: "Workspace" },
  { href: "/#apps-showcase", bn: "সব টুল", en: "Tools" },
  { href: "/opportunities", bn: "আমার পথ", en: "My Path" },
  { href: "/judges", bn: "বিচারক গাইড", en: "Judge tour" },
  { href: "/#faq", bn: "প্রশ্নোত্তর", en: "FAQ" },
] as const;

function openPalette() {
  if (typeof window !== "undefined") window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true }));
}

/** Floating frosted navigation pill used on the home page, Workspace and passport pages. */
export function Navbar(props?: {
  lang?: "en" | "bn";
  setLang?: (l: "en" | "bn") => void;
  usdBdt?: number;
  fxLive?: boolean;
  onOpenEcosystem?: () => void;
  isEcosystemOpen?: boolean;
}) {
  const { lang = "bn", setLang, usdBdt = FX_FALLBACK.usdBdt, fxLive = false, onOpenEcosystem, isEcosystemOpen = false } = props ?? {};
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  const bn = lang === "bn";
  const isActive = (href: string) => !href.includes("#") && pathname?.startsWith(href);

  return (
    <header className="kp-nav-wrap">
      <div className="kp-nav mx-auto flex h-[62px] max-w-7xl items-center justify-between gap-3 px-2.5 sm:pl-3">
        <div className="flex min-w-0 items-center gap-4">
          <Link href="/" className="flex shrink-0 items-center rounded-2xl px-1 py-1">
            <span className="hidden sm:inline-flex"><KormoPathLogo theme="light" variant="full" size="sm" /></span>
            <span className="sm:hidden"><KormoPathLogo theme="light" variant="mark" size="sm" /></span>
          </Link>
          <nav aria-label="Main" className="kp-nav-links hidden lg:flex">
            {NAV.map((item) => (
              <Link key={item.href} href={item.href} aria-current={isActive(item.href) ? "page" : undefined} className="kp-nav-link">
                {bn ? item.bn : item.en}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          <div
            className="kp-chip hidden md:inline-flex font-mono"
            title={fxLive ? (bn ? "সর্বশেষ পাওয়া USD/BDT বাজার রেট" : "Latest available USD/BDT market rate") : (bn ? "রেফারেন্স রেট; লাইভ রেট পাওয়া যায়নি" : "Reference rate; live rate unavailable")}
          >
            <span className={`h-2 w-2 rounded-full ${fxLive ? "bg-emerald-500" : "bg-amber-500"}`} aria-hidden="true" />
            <span className="font-sans text-[11px] text-slate-500">$1 =</span>
            <span className="font-bold text-slate-900">৳{usdBdt.toFixed(1)}</span>
            <span className="text-[9px] font-semibold uppercase tracking-wider text-slate-500">{fxLive ? "Live" : "Ref"}</span>
          </div>

          <button type="button" onClick={openPalette} className="kp-icon-btn hidden sm:inline-flex" aria-label={bn ? "খুঁজুন (⌘K)" : "Search (⌘K)"} title={bn ? "খুঁজুন · ⌘K" : "Search · ⌘K"}>
            <Search size={16} />
          </button>

          {setLang && (
            <button
              type="button"
              onClick={() => setLang(bn ? "en" : "bn")}
              className="kp-chip font-semibold"
              title={lang === "bn" ? "View in English" : "বাংলায় দেখুন"}
            >
              <Languages size={14} className="text-emerald-700" aria-hidden="true" />
              <span>{bn ? "EN" : "বাংলা"}</span>
              <span className="sr-only">{bn ? " · View in English" : " · বাংলায় দেখুন"}</span>
            </button>
          )}

          {onOpenEcosystem ? (
            <button
              type="button"
              onClick={onOpenEcosystem}
              aria-expanded={isEcosystemOpen}
              className={`kp-chip hidden font-semibold sm:inline-flex ${isEcosystemOpen ? "kp-chip-on" : ""}`}
              aria-label={bn ? "সব অ্যাপ খুলুন" : "Open all apps"}
            >
              <LayoutGrid size={14} className="text-orange-600" />
              <span>{bn ? "সব অ্যাপ" : "All apps"}</span>
            </button>
          ) : null}
          <span className={onOpenEcosystem ? "sm:hidden" : ""}>
            <AppSwitcherDropdown lang={lang} variant="light" />
          </span>

          <Link href="/workspace" className="kp-btn-primary hidden xl:inline-flex">
            <span>{bn ? "শুরু করুন" : "Get started"}</span>
            <ArrowUpRight size={15} />
          </Link>

          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="kp-icon-btn lg:hidden"
            aria-label={mobileMenuOpen ? (bn ? "মেনু বন্ধ করুন" : "Close menu") : (bn ? "মেনু খুলুন" : "Open menu")}
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="kp-nav-drawer mx-auto mt-2 max-w-7xl p-3 lg:hidden">
          <nav className="grid gap-1 text-[15px] font-semibold" aria-label={bn ? "মোবাইল মেনু" : "Mobile menu"}>
            {NAV.map((item) => (
              <Link key={item.href} href={item.href} onClick={() => setMobileMenuOpen(false)} className="flex items-center justify-between rounded-xl px-3 py-2.5 text-slate-800 hover:bg-orange-50">
                <span>{bn ? item.bn : item.en}</span>
                <ArrowUpRight size={14} className="text-slate-400" />
              </Link>
            ))}
          </nav>
          <div className="mt-2 flex items-center justify-between border-t border-line pt-3">
            <span className="flex items-center gap-1.5 font-mono text-[12px] text-slate-600">
              <span className={`h-2 w-2 rounded-full ${fxLive ? "bg-emerald-500" : "bg-amber-500"}`} />$1 = ৳{usdBdt.toFixed(1)}
            </span>
            <Link href="/workspace" onClick={() => setMobileMenuOpen(false)} className="kp-btn-primary">
              {bn ? "শুরু করুন" : "Get started"} <ArrowUpRight size={14} />
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}

const FOOTER_GROUPS = [
  {
    bn: "আয়", en: "Earn",
    links: [
      ["/workspace", "ওয়ার্কস্পেস: সিভি থেকে পেমেন্ট"], ["/chuktiguard", "চুক্তিগার্ড: চুক্তি ও ইনভয়েস"], ["/feeguard", "ফি-গার্ড: পেআউট ফি তুলনা"], ["/probaho", "প্রবাহ কোচ: ভাইভা অনুশীলন"], ["/opportunities", "আমার পথ: সুযোগ ও পরিকল্পনা"],
    ],
  },
  {
    bn: "জীবন", en: "Life",
    links: [["/admitbuddy", "অ্যাডমিট বাডি: ভর্তি পরিকল্পনা"], ["/shohoj-budget", "সহজ বাজেট: সংসারের হিসাব"], ["/mediscan", "মেডিস্ক্যান: প্রেসক্রিপশন বোঝা"], ["/rokkha", "রক্ষা: প্রতারণা ও দুর্যোগে সুরক্ষা"]],
  },
  {
    bn: "কৃষি", en: "Farm",
    links: [["/krishi", "মাঠসাথী: জমি, কাজ ও পশুপাখি"], ["/krishi/field#/farmer", "স্যাটেলাইট মাঠ ও রোপণ রাডার"], ["/haatbazar", "হাটবাজার: হিসাব ও আবহাওয়া"]],
  },
] as const;

export function Footer() {
  return (
    <footer className="kp-footer mt-24 pb-24 sm:pb-12">
      <div className="mx-auto max-w-7xl px-4 pt-14 sm:px-6">
        <div className="grid gap-10 border-b border-line pb-10 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div className="space-y-4">
            <Link href="/" className="inline-block">
              <KormoPathLogo theme="light" variant="full" size="md" />
            </Link>
            <p className="max-w-sm text-[14px] leading-relaxed text-slate-600">
              বাংলাদেশের কাজ, পড়াশোনা, সংসার ও কৃষির জন্য ব্যবহারিক টুল। কোনো অ্যাকাউন্ট লাগে না; আপনার তথ্য আপনার ডিভাইসেই থাকে, আর প্রতিটি সংখ্যার পাশে উৎস দেখানো হয়।
            </p>
            <Link href="/settings" className="kp-chip font-semibold">
              <ShieldCheck size={14} className="text-emerald-700" /> ডেটা ও প্রাইভেসি
            </Link>
            <Link href="/trust" className="kp-chip font-semibold">
              <FlaskConical size={14} className="text-emerald-700" /> পরিমাপ করা ফল · Measured results
            </Link>
          </div>
          {FOOTER_GROUPS.map((group) => (
            <div key={group.en}>
              <h3 className="kp-eyebrow mb-3">{group.bn} · {group.en}</h3>
              <ul className="space-y-2 text-[14px]">
                {group.links.map(([href, label]) => (
                  <li key={href}>
                    <Link href={href} className="text-slate-700 underline-offset-4 hover:text-emerald-800 hover:underline">{label}</Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="flex flex-col gap-2 pt-6 text-[13px] text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} KormoPath · কর্মপথ. ঢাকা ও খুলনা, বাংলাদেশে তৈরি।</p>
          <p>শুধু তথ্যের জন্য; আইনি, কর বা চিকিৎসা পরামর্শ নয়।</p>
        </div>
      </div>
    </footer>
  );
}
