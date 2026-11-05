"use client";
import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { Check, ChevronDown, Sparkles } from "lucide-react";

export interface AppItem {
  id: "kormopath" | "path" | "feeguard" | "chuktiguard" | "admitbuddy" | "mediscan" | "shohoj" | "haatbazar" | "probaho";
  nameEn: string;
  nameBn: string;
  categoryEn: string;
  categoryBn: string;
  href: string;
  badge?: string;
}

export const APPS_LIST: AppItem[] = [
  {
    id: "path",
    nameEn: "My Path Board",
    nameBn: "আমার পথ · সুযোগ বোর্ড",
    categoryEn: "Opportunities & Action Plan",
    categoryBn: "সুযোগ ও পরবর্তী পদক্ষেপ",
    href: "/opportunities",
    badge: "New",
  },
  {
    id: "kormopath",
    nameEn: "KormoPath Core OS",
    nameBn: "কর্মপথ কোর ওএস (ফ্ল্যাগশিপ)",
    categoryEn: "Career & FinOps",
    categoryBn: "ক্যারিয়ার ও ফিনঅপস",
    href: "/",
    badge: "Core OS",
  },
  {
    id: "chuktiguard",
    nameEn: "ChuktiGuard",
    nameBn: "চুক্তিগার্ড (বি২বি ইনভয়েস ও চুক্তি)",
    categoryEn: "B2B Contracts & Invoicing",
    categoryBn: "বি২বি ইনভয়েস ও ব্ল্যাকআউট শিল্ড",
    href: "/chuktiguard",
    badge: "Track 6",
  },
  {
    id: "feeguard",
    nameEn: "FeeGuard BD",
    nameBn: "ফি-গার্ড বিডি (মার্কেটপ্লেস ফি)",
    categoryEn: "FinOps & Freedom",
    categoryBn: "মার্কেটপ্লেস ও ২০% ফি সেভার",
    href: "/feeguard",
    badge: "20% Saver",
  },
  {
    id: "admitbuddy",
    nameEn: "AdmitBuddy",
    nameBn: "এডমিট-বাডি (বিশ্ববিদ্যালয়)",
    categoryEn: "Education Track",
    categoryBn: "শিক্ষা ট্র্যাক",
    href: "/admitbuddy",
    badge: "Track 1",
  },
  {
    id: "mediscan",
    nameEn: "MediScan BD",
    nameBn: "মেডিস্ক্যান বিডি (প্রেসক্রিপশন)",
    categoryEn: "Health & Services",
    categoryBn: "স্বাস্থ্য ও প্রেসক্রিপশন",
    href: "/mediscan",
    badge: "Track 2",
  },
  {
    id: "shohoj",
    nameEn: "Shohoj Budget",
    nameBn: "সহজ বাজেট (ভয়েস ট্র্যাকার)",
    categoryEn: "Finance & Lifestyle",
    categoryBn: "ভয়েস ও বিকাশ ফাইন্যান্স",
    href: "/shohoj-budget",
    badge: "Track 3",
  },
  {
    id: "haatbazar",
    nameEn: "HaatBazar AI",
    nameBn: "হাটবাজার এআই (৬৪ জেলা দর)",
    categoryEn: "Agriculture & Mandi",
    categoryBn: "কৃষি ও পাইকারি দর",
    href: "/haatbazar",
    badge: "Track 4",
  },
  {
    id: "probaho",
    nameEn: "Probaho Coach",
    nameBn: "প্রবাহ স্পিকিং কোচ (ভাইভা)",
    categoryEn: "Productivity & Viva",
    categoryBn: "ভাইভা স্পিকিং কোচ",
    href: "/probaho",
    badge: "Track 5",
  },
];

export function AppSwitcherDropdown({
  currentAppId,
  lang = "bn",
  onSelectApp,
  variant = "dark",
}: {
  variant?: "dark" | "light";
  currentAppId?: "kormopath" | "path" | "feeguard" | "chuktiguard" | "admitbuddy" | "mediscan" | "shohoj" | "haatbazar" | "probaho";
  lang?: "en" | "bn";
  onSelectApp?: (appId: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const pathname = usePathname();

  // Determine active app based on pathname if not explicitly passed
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
      : pathname?.startsWith("/probaho")
      ? "probaho"
      : "kormopath";

  const activeId = currentAppId || detectedId;

  const currentApp = APPS_LIST.find((a) => a.id === activeId) || APPS_LIST[0];

  // Close on outside click or Escape key
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
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
    if (onSelectApp) {
      onSelectApp(app.id);
    }
    if (app.href.startsWith("/")) {
      router.push(app.href);
    }
  };

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      {/* Trigger Button with chevron matching user reference */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`group flex items-center gap-2 rounded-xl border px-3 py-1.5 text-left shadow-xs transition-all ${
          variant === "light"
            ? "border-slate-200 bg-white hover:bg-slate-50 text-slate-900"
            : "border-white/15 bg-white/5 hover:bg-white/10 text-white"
        }`}
        aria-expanded={isOpen}
        aria-haspopup="true"
        aria-label={lang === "bn" ? "কর্মপথ অ্যাপ পরিবর্তন করুন" : "Switch KormoPath app"}
      >
        <span className="flex h-2 w-2 rounded-full bg-orange-400 animate-pulse" />
        <div className="text-left">
          <span className={`block text-[12px] font-bold leading-tight ${variant === "light" ? "text-slate-900" : "text-white"}`}>
            {lang === "bn" ? currentApp.nameBn.split(" ")[0] : currentApp.nameEn.split(" ")[0]}
          </span>
          <span className={`block text-[10px] leading-none ${variant === "light" ? "text-slate-500" : "text-amber-300/80"}`}>
            {lang === "bn" ? `${APPS_LIST.length}টি অ্যাপ` : `${APPS_LIST.length} apps`}
          </span>
        </div>
        <ChevronDown
          size={16}
          className={`text-slate-400 transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {/* Dropdown Menu matching the exact user image aesthetic */}
      {isOpen && (
        <div
          className="absolute right-0 mt-2 w-80 origin-top-right rounded-2xl border border-white/15 bg-[#070d1e] p-2.5 shadow-2xl backdrop-blur-xl z-50 animate-in fade-in-50 zoom-in-95 duration-150"
          role="menu"
          aria-orientation="vertical"
        >
          {/* Header Label */}
          <div className="px-3 pt-1.5 pb-2 text-[13px] font-semibold text-slate-400 tracking-wide">
            {lang === "bn" ? `অ্যাপ নির্বাচন (${APPS_LIST.length}টি)` : `Select application (${APPS_LIST.length})`}
          </div>

          {/* App list */}
          <div className="space-y-1">
            {APPS_LIST.map((app) => {
              const isSelected = app.id === activeId;
              const displayName = lang === "bn" ? app.nameBn : app.nameEn;

              return (
                <button
                  key={app.id}
                  onClick={() => handleSelect(app)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left text-[14px] font-medium transition-all ${
                    isSelected
                      ? "bg-[#007aff] text-white font-bold shadow-md"
                      : "text-white hover:bg-white/10 hover:text-white"
                  }`}
                  role="menuitem"
                >
                  {/* Left Checkmark matching user screenshot */}
                  <span className="w-5 flex items-center justify-center shrink-0">
                    {isSelected ? (
                      <Check size={18} className="stroke-[3] text-white" />
                    ) : (
                      <span className="w-5" />
                    )}
                  </span>

                  {/* App Name */}
                  <span className="flex-1 truncate leading-tight">
                    {displayName}
                  </span>

                  {/* Badge if available */}
                  {app.badge && (
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider shrink-0 ${
                        isSelected
                          ? "bg-white/20 text-white"
                          : "bg-white/10 text-emerald-300"
                      }`}
                    >
                      {app.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Bottom helper footnote */}
          <div className="mt-2 pt-2 border-t border-white/10 px-3 py-1 text-[11px] text-[#8fa89b] flex items-center justify-between">
            <Link href="/settings" onClick={() => setIsOpen(false)} className="text-emerald-300 hover:underline font-semibold">
              {lang === "bn" ? "ডেটা ও প্রাইভেসি সেটিংস" : "Data & privacy settings"}
            </Link>
            <span>{lang === "bn" ? "প্রতিটি অ্যাপ আলাদাভাবে চলে" : "Each app runs independently"}</span>
          </div>
        </div>
      )}
    </div>
  );
}

