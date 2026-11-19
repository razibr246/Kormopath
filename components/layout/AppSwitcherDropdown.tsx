"use client";

import { useState, useRef, useEffect, useLayoutEffect } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import {
  Check,
  ChevronDown,
  GraduationCap,
  Briefcase,
  ScrollText,
  Percent,
  Wallet,
  Pill,
  Tractor,
  Sprout,
  ShieldCheck,
  Scale,
  Mic,
  Compass,
  Terminal,
  Search,
} from "lucide-react";
import { storageKey, usePersistentState } from "@/lib/clientStore";

const BN_DIGITS = "০১২৩৪৫৬৭৮৯";
/** Bengali digits for the app count, so it reads the same as the home page's count. */
const toBn = (n: number) => String(n).replace(/\d/g, (d) => BN_DIGITS[Number(d)]);

export interface AppItem {
  id: "kormopath" | "path" | "feeguard" | "chuktiguard" | "admitbuddy" | "mediscan" | "shohoj" | "haatbazar" | "krishi" | "rokkha" | "legal" | "probaho";
  stageNum: "০১" | "০২" | "০৩" | "০৪" | "০৫" | "০৬" | "০৭";
  stageNameBn: string;
  stageNameEn: string;
  nameEn: string;
  nameBn: string;
  categoryEn: string;
  categoryBn: string;
  href: string;
  badge?: string;
  icon: typeof GraduationCap;
}

/** Short names for the header and the switcher pill (Bangla first; the full names stay in APPS_LIST). */
export const APP_SHORT_NAME: Record<AppItem["id"], { bn: string; en: string }> = {
  kormopath: { bn: "কর্মপথ", en: "KormoPath" }, path: { bn: "আমার পথ", en: "My Path" }, admitbuddy: { bn: "অ্যাডমিট বাডি", en: "AdmitBuddy" },
  chuktiguard: { bn: "চুক্তিগার্ড", en: "ChuktiGuard" }, feeguard: { bn: "ফি-গার্ড", en: "FeeGuard" }, shohoj: { bn: "সহজ বাজেট", en: "Shohoj" },
  mediscan: { bn: "মেডিস্ক্যান", en: "MediScan" }, krishi: { bn: "মাঠসাথী", en: "MaathSathi" }, haatbazar: { bn: "হাটবাজার", en: "HaatBazar" },
  rokkha: { bn: "রক্ষা", en: "Rokkha" }, legal: { bn: "আইনি সহায়তা", en: "Legal Aid" }, probaho: { bn: "প্রবাহ কোচ", en: "Probaho" },
};

export const APPS_LIST: AppItem[] = [
  // 01 Study
  {
    id: "admitbuddy",
    stageNum: "০১",
    stageNameBn: "পড়া ও ভর্তি",
    stageNameEn: "Study & Admission",
    nameEn: "AdmitBuddy",
    nameBn: "অ্যাডমিট বাডি",
    categoryEn: "Education Track",
    categoryBn: "ভর্তি ও প্রস্তুতি",
    href: "/admitbuddy",
    badge: "০১ পড়া",
    icon: GraduationCap,
  },
  // 02 Skills & Work
  {
    id: "kormopath",
    stageNum: "০২",
    stageNameBn: "দক্ষতা ও কাজ",
    stageNameEn: "Skills & Work",
    nameEn: "KormoPath Core OS",
    nameBn: "কর্মপথ কোর ওএস (ওয়ার্কস্পেস)",
    categoryEn: "Career & FinOps",
    categoryBn: "স্কিল পাসপোর্ট ও ভাইভা",
    href: "/workspace",
    badge: "০২ দক্ষতা",
    icon: Terminal,
  },
  {
    id: "path",
    stageNum: "০২",
    stageNameBn: "দক্ষতা ও কাজ",
    stageNameEn: "Skills & Work",
    nameEn: "My Path Board",
    nameBn: "আমার পথ · সুযোগ বোর্ড",
    categoryEn: "Opportunities & Action Plan",
    categoryBn: "চাকরি ও স্কলারশিপ",
    href: "/opportunities",
    badge: "সুযোগ",
    icon: Compass,
  },
  // 03 Earn
  {
    id: "chuktiguard",
    stageNum: "০৩",
    stageNameBn: "আয় ও চুক্তি",
    stageNameEn: "Earn & Contracts",
    nameEn: "ChuktiGuard",
    nameBn: "চুক্তিগার্ড",
    categoryEn: "B2B Contracts & Invoicing",
    categoryBn: "বি২বি চুক্তি ও ইনভয়েস",
    href: "/chuktiguard",
    badge: "০৩ আয়",
    icon: ScrollText,
  },
  {
    id: "feeguard",
    stageNum: "০৩",
    stageNameBn: "আয় ও চুক্তি",
    stageNameEn: "Earn & Contracts",
    nameEn: "FeeGuard BD",
    nameBn: "ফি-গার্ড বিডি",
    categoryEn: "FinOps & Freedom",
    categoryBn: "পেআউট ফি ও প্রণোদনা",
    href: "/feeguard",
    badge: "ফি সেভার",
    icon: Percent,
  },
  // 04 Home & Money
  {
    id: "shohoj",
    stageNum: "০৪",
    stageNameBn: "সংসার ও টাকা",
    stageNameEn: "Home & Money",
    nameEn: "Shohoj Budget",
    nameBn: "সহজ বাজেট",
    categoryEn: "Finance & Lifestyle",
    categoryBn: "সংসারের হিসাব ও ফর্দ",
    href: "/shohoj-budget",
    badge: "০৪ সংসার",
    icon: Wallet,
  },
  // 05 Health
  {
    id: "mediscan",
    stageNum: "০৫",
    stageNameBn: "স্বাস্থ্য",
    stageNameEn: "Health",
    nameEn: "MediScan BD",
    nameBn: "মেডিস্ক্যান বিডি",
    categoryEn: "Health & Services",
    categoryBn: "হাসপাতাল, ডাক্তার ও ওষুধ",
    href: "/mediscan",
    badge: "০৫ স্বাস্থ্য",
    icon: Pill,
  },
  // 06 Field
  {
    id: "krishi",
    stageNum: "০৬",
    stageNameBn: "মাঠ ও কৃষি",
    stageNameEn: "Field & Crops",
    nameEn: "MaathSathi",
    nameBn: "মাঠসাথী",
    categoryEn: "Agriculture & Field",
    categoryBn: "স্যাটেলাইট জমি ও খামার",
    href: "/krishi/field#/farmer",
    badge: "০৬ মাঠ",
    icon: Tractor,
  },
  {
    id: "haatbazar",
    stageNum: "০৬",
    stageNameBn: "মাঠ ও কৃষি",
    stageNameEn: "Field & Crops",
    nameEn: "HaatBazar AI",
    nameBn: "হাটবাজার এআই",
    categoryEn: "Agriculture & Mandi",
    categoryBn: "৬৪ জেলা আড়ত ও হাটদর",
    href: "/haatbazar",
    badge: "আড়ত দর",
    icon: Sprout,
  },
  // 07 Protect
  {
    id: "rokkha",
    stageNum: "০৭",
    stageNameBn: "সুরক্ষা",
    stageNameEn: "Protect",
    nameEn: "Rokkha",
    nameBn: "রক্ষা",
    categoryEn: "Scam & Disaster Safety",
    categoryBn: "প্রতারণা ও দুর্যোগ প্রস্তুতি",
    href: "/rokkha",
    badge: "০৭ সুরক্ষা",
    icon: ShieldCheck,
  },
  {
    id: "legal",
    stageNum: "০৭",
    stageNameBn: "সুরক্ষা",
    stageNameEn: "Protect",
    nameEn: "Legal Aid",
    nameBn: "আইনি সহায়তা",
    categoryEn: "Free Legal Aid",
    categoryBn: "বিনামূল্যে আইনি পরামর্শ",
    href: "/legal",
    badge: "আইন",
    icon: Scale,
  },
  {
    id: "probaho",
    stageNum: "০৭",
    stageNameBn: "সুরক্ষা",
    stageNameEn: "Protect",
    nameEn: "Probaho Coach",
    nameBn: "প্রবাহ কোচ",
    categoryEn: "Productivity & Viva",
    categoryBn: "ভাইভা ও কথা বলার অনুশীলন",
    href: "/probaho",
    badge: "ভাইভা",
    icon: Mic,
  },
];

function sanitizeRecentApps(value: unknown): AppItem["id"][] | null {
  if (!Array.isArray(value)) return null;
  return value
    .filter((id): id is AppItem["id"] => APPS_LIST.some((app) => app.id === id))
    .slice(0, 4);
}

export function AppSwitcherDropdown({
  currentAppId,
  lang = "bn",
  onSelectApp,
  variant = "dark",
  genericLabel = false,
}: {
  variant?: "dark" | "light";
  /** On app pages the header title already names the app, so the pill just says "অ্যাপ" / "Apps". */
  genericLabel?: boolean;
  currentAppId?: "kormopath" | "path" | "feeguard" | "chuktiguard" | "admitbuddy" | "mediscan" | "shohoj" | "haatbazar" | "krishi" | "rokkha" | "legal" | "probaho";
  lang?: "en" | "bn";
  onSelectApp?: (appId: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  // Keep the panel inside the screen with a 16px margin on both sides, wherever the trigger sits in the header.
  const [panelBox, setPanelBox] = useState<{ left: number; width: number } | null>(null);
  useLayoutEffect(() => {
    if (!isOpen) return;
    const place = () => {
      const t = triggerRef.current;
      if (!t) return;
      const r = t.getBoundingClientRect();
      const vw = document.documentElement.clientWidth;
      const width = Math.min(336, vw - 32);
      const leftInViewport = Math.min(Math.max(r.right - width, 16), vw - 16 - width);
      setPanelBox({ left: leftInViewport - r.left, width });
    };
    place();
    window.addEventListener("resize", place);
    return () => window.removeEventListener("resize", place);
  }, [isOpen]);
  const searchRef = useRef<HTMLInputElement>(null);
  const [recentApps, setRecentApps] = usePersistentState<AppItem["id"][]>(
    storageKey("platform", "recentApps"),
    [],
    sanitizeRecentApps,
  );
  const router = useRouter();
  const pathname = usePathname();

  const detectedId: AppItem["id"] =
    pathname?.startsWith("/opportunities")
      ? "path"
      : pathname?.startsWith("/chuktiguard")
      ? "chuktiguard"
      : pathname?.startsWith("/feeguard")
      ? "feeguard"
      : pathname?.startsWith("/admitbuddy")
      ? "admitbuddy"
      : pathname?.startsWith("/mediscan")
      ? "mediscan"
      : pathname?.startsWith("/shohoj-budget")
      ? "shohoj"
      : pathname?.startsWith("/haatbazar")
      ? "haatbazar"
      : pathname?.startsWith("/krishi")
      ? "krishi"
      : pathname?.startsWith("/rokkha")
      ? "rokkha"
      : pathname?.startsWith("/legal")
      ? "legal"
      : pathname?.startsWith("/probaho")
      ? "probaho"
      : "kormopath";

  const activeId = currentAppId || detectedId;
  const currentApp = APPS_LIST.find((a) => a.id === activeId) || APPS_LIST[0];
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const filteredApps = APPS_LIST.filter((app) =>
    [app.nameEn, app.nameBn, app.categoryEn, app.categoryBn, app.stageNameEn, app.stageNameBn]
      .some((value) => value.toLocaleLowerCase().includes(normalizedQuery))
  );
  const recentItems = recentApps
    .map((id) => APPS_LIST.find((app) => app.id === id))
    .filter((app): app is AppItem => Boolean(app));

  useEffect(() => {
    if (isOpen) {
      searchRef.current?.focus();
      // Prefetch companion app routes for instant 0ms switching
      APPS_LIST.forEach((app) => {
        if (app.href.startsWith("/") && !app.href.includes("#")) {
          router.prefetch(app.href);
        }
      });
    } else {
      setQuery("");
    }
  }, [isOpen, router]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && dropdownRef.current?.querySelector('[role="dialog"]')) {
        setIsOpen(false);
        triggerRef.current?.focus(); // focus returns to the button that opened the menu
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const handleSelect = (app: AppItem) => {
    setIsOpen(false);
    setRecentApps((previous) => [app.id, ...previous.filter((id) => id !== app.id)].slice(0, 4));
    if (onSelectApp) {
      onSelectApp(app.id);
    }
    if (app.href.startsWith("/")) {
      router.push(app.href);
    }
  };

  const isLight = variant === "light";

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      {/* Trigger Button with badge and chevron */}
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`group flex items-center gap-2 rounded-xl border px-3 py-1.5 text-left shadow-xs transition-all ${
          isLight
            ? "border-white/80 bg-white/45 backdrop-blur-xl hover:border-emerald-500/50 hover:bg-white/75 text-slate-900"
            : "border-white/15 bg-white/5 hover:border-amber-400 hover:bg-white/10 text-white"
        }`}
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <span className="hidden h-2 w-2 rounded-full bg-emerald-600 sm:flex" aria-hidden="true" />
        <div className="text-left">
          <span className={`kp-switcher-label block text-[12px] font-bold leading-tight ${isLight ? "text-slate-900" : "text-white"}`}>
            {genericLabel ? (lang === "bn" ? "অ্যাপ" : "Apps") : lang === "bn" ? APP_SHORT_NAME[currentApp.id].bn : APP_SHORT_NAME[currentApp.id].en}
          </span>
          <span className={`hidden text-[10px] leading-none sm:block ${isLight ? "text-slate-500" : "text-amber-300/80"}`}>
            {lang === "bn" ? currentApp.stageNameBn : currentApp.stageNameEn}
          </span>
          <span className="sr-only">{lang === "bn" ? `${currentApp.nameBn} · অ্যাপ বদলান` : `${currentApp.nameEn} · switch app`}</span>
        </div>
        <ChevronDown
          size={16}
          className={`text-slate-400 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          style={panelBox ? { left: panelBox.left, right: "auto", width: panelBox.width } : undefined}
          className={`absolute right-0 mt-2 w-84 max-w-[calc(100vw-32px)] max-h-[85vh] overflow-y-auto origin-top-right rounded-2xl border p-2.5 shadow-2xl z-50 animate-in fade-in-50 zoom-in-95 duration-150 ${
            isLight
              ? "border-white/80 bg-paper/95 text-slate-900 backdrop-blur-2xl"
              : "border-white/15 bg-[#0b1329] text-white backdrop-blur-xl"
          }`}
          role="dialog"
          aria-label={lang === "bn" ? "অ্যাপ লঞ্চার" : "App launcher"}
        >
          {/* Header Label */}
          <div className="flex items-center justify-between px-2.5 pt-1.5 pb-2 border-b border-line">
            <span className={`text-[12px] font-bold tracking-wide uppercase ${isLight ? "text-slate-500" : "text-slate-400"}`}>
              {lang === "bn" ? "সব অ্যাপ" : "All apps"}
            </span>
            <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
              {lang === "bn" ? `${toBn(APPS_LIST.length)}টি অ্যাপ` : `${APPS_LIST.length} apps`}
            </span>
          </div>

          <label className={`relative mt-2 block ${isLight ? "text-slate-500" : "text-slate-400"}`}>
            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2" aria-hidden="true" />
            <input
              ref={searchRef}
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={lang === "bn" ? "অ্যাপ খুঁজুন" : "Search apps"}
              aria-label={lang === "bn" ? "অ্যাপ খুঁজুন" : "Search apps"}
              className={`h-10 w-full rounded-xl border pl-9 pr-3 text-[13px] outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 ${
                isLight ? "border-line bg-white/75 text-slate-900 placeholder:text-slate-400" : "border-white/10 bg-white/5 text-white placeholder:text-slate-500"
              }`}
            />
          </label>

          {!normalizedQuery && recentItems.length > 0 && (
            <div className="mt-3" aria-label={lang === "bn" ? "সাম্প্রতিক অ্যাপ" : "Recently opened apps"}>
              <p className={`mb-1.5 px-1 text-[10px] font-bold uppercase tracking-wide ${isLight ? "text-slate-500" : "text-slate-400"}`}>
                {lang === "bn" ? "সম্প্রতি খোলা" : "Recently opened"}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {recentItems.map((app) => {
                  const Icon = app.icon;
                  return (
                    <button
                      key={app.id}
                      type="button"
                      onPointerEnter={() => {
                        if (app.href.startsWith("/") && !app.href.includes("#")) router.prefetch(app.href);
                      }}
                      onTouchStart={() => {
                        if (app.href.startsWith("/") && !app.href.includes("#")) router.prefetch(app.href);
                      }}
                      onClick={() => handleSelect(app)}
                      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-[11px] font-semibold transition-colors ${
                        isLight ? "border-line bg-white/75 text-slate-700 hover:border-emerald-500/50 hover:bg-emerald-50" : "border-white/10 bg-white/5 text-slate-200 hover:bg-white/10"
                      }`}
                    >
                      <Icon size={13} aria-hidden="true" />
                      {lang === "bn" ? app.nameBn : app.nameEn}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* App list */}
          <div className="mt-2 space-y-1" role="menu" aria-label={lang === "bn" ? "সব অ্যাপ" : "All apps"}>
            {filteredApps.length === 0 && (
              <p className={`px-3 py-6 text-center text-[13px] ${isLight ? "text-slate-500" : "text-slate-400"}`}>
                {lang === "bn" ? "কোনো অ্যাপ মেলেনি" : "No apps found"}
              </p>
            )}
            {filteredApps.map((app, index) => {
              const isSelected = app.id === activeId;
              const displayName = lang === "bn" ? app.nameBn : app.nameEn;
              const displayCategory = lang === "bn" ? app.categoryBn : app.categoryEn;
              const Icon = app.icon;
              const startsCategory = index === 0 || filteredApps[index - 1].stageNum !== app.stageNum;

              return (
                <div key={app.id}>
                  {startsCategory && (
                    <p className={`px-3 pb-1 pt-2 text-[10px] font-bold uppercase tracking-wide ${isLight ? "text-slate-500" : "text-slate-400"}`} role="presentation">
                      {lang === "bn" ? app.stageNameBn : app.stageNameEn}
                    </p>
                  )}
                  <button
                    type="button"
                    onPointerEnter={() => {
                      if (app.href.startsWith("/") && !app.href.includes("#")) router.prefetch(app.href);
                    }}
                    onTouchStart={() => {
                      if (app.href.startsWith("/") && !app.href.includes("#")) router.prefetch(app.href);
                    }}
                    onClick={() => handleSelect(app)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left text-[13.5px] transition-all ${
                      isSelected
                        ? "bg-emerald-700 text-white font-bold shadow-xs"
                        : isLight
                        ? "text-slate-800 hover:bg-slate-100 hover:text-slate-950"
                        : "text-slate-200 hover:bg-white/10 hover:text-white"
                    }`}
                    role="menuitem"
                  >
                    <span
                      className={`grid h-7 w-7 place-items-center rounded-lg text-[11px] font-bold shrink-0 ${
                        isSelected
                          ? "bg-white/20 text-white"
                          : isLight
                          ? "bg-slate-100 text-slate-700"
                          : "bg-white/10 text-emerald-400"
                      }`}
                    >
                      <Icon size={15} />
                    </span>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="truncate leading-tight font-semibold">{displayName}</span>
                      </div>
                      <span className={`block text-[11px] leading-none truncate mt-0.5 ${isSelected ? "text-white/80" : "text-slate-500"}`}>
                        {displayCategory}
                      </span>
                    </div>

                    {isSelected && (
                      <span className="flex items-center justify-center shrink-0">
                        <Check size={16} className="stroke-[2.5] text-white" />
                      </span>
                    )}
                  </button>
                </div>
              );
            })}
          </div>

          {/* Bottom helper footnote */}
          <div className={`mt-2.5 pt-2 border-t px-2.5 py-1 text-[11px] flex items-center justify-between ${isLight ? "border-slate-100 text-slate-500" : "border-white/10 text-slate-400"}`}>
            <Link
              href="/settings"
              onClick={() => setIsOpen(false)}
              className="text-emerald-700 hover:underline font-semibold"
            >
              {lang === "bn" ? "প্রাইভেসি ও ব্যাকআপ" : "Privacy & Backup"}
            </Link>
            <Link
              href="/"
              onClick={() => setIsOpen(false)}
              className="hover:underline font-medium"
            >
              {lang === "bn" ? "হোম পেজ" : "Home"}
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
