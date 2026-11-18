"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  GraduationCap,
  Percent,
  Wallet,
  Sprout,
  Mic,
  Pill,
  Sparkles,
  ShieldCheck,
  Download,
  Globe,
  Terminal,
  ArrowRight,
  X,
  Scale,
  Compass,
  Briefcase,
  Tractor,
} from "lucide-react";
import { exportProfileJson } from "@/lib/profile";
import { playClick, playSuccessChime } from "@/lib/sound";
import { storageKey, usePersistentState } from "@/lib/clientStore";

interface CommandItem {
  id: string;
  title: string;
  titleBn: string;
  category: "Navigation" | "Action" | "Tools";
  icon: React.ReactNode;
  shortcut?: string;
  onSelect: () => void;
}

function sanitizeRecentSearches(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null;
  return value
    .filter((entry): entry is string => typeof entry === "string")
    .map((entry) => entry.trim().slice(0, 60))
    .filter(Boolean)
    .slice(0, 5);
}

export function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [recentSearches, setRecentSearches] = usePersistentState<string[]>(
    storageKey("platform", "recentSearches"),
    [],
    sanitizeRecentSearches,
  );
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  const commands: CommandItem[] = [
    {
      id: "tools",
      title: "Browse all tools",
      titleBn: "সব টুল দেখুন",
      category: "Navigation",
      icon: <Sparkles size={16} className="text-emerald-700" />,
      onSelect: () => router.push("/#apps-showcase"),
    },
    {
      id: "faq",
      title: "Questions and answers",
      titleBn: "প্রশ্নোত্তর",
      category: "Navigation",
      icon: <ArrowRight size={16} className="text-emerald-700" />,
      onSelect: () => router.push("/#faq"),
    },
    {
      id: "judges",
      title: "Guides — Judge tour",
      titleBn: "নির্দেশিকা — বিচারক গাইড",
      category: "Navigation",
      icon: <Globe size={16} className="text-emerald-700" />,
      onSelect: () => router.push("/judges"),
    },
    {
      id: "workspace",
      title: "KormoPath Core OS & 4-Stage Workspace",
      titleBn: "কর্মপথ কোর ওএস ও ৪-ধাপ ওয়ার্কস্পেস",
      category: "Navigation",
      icon: <Terminal size={16} className="text-orange-500" />,
      shortcut: "G W",
      onSelect: () => router.push("/workspace"),
    },
    {
      id: "admitbuddy",
      title: "AdmitBuddy — University Admission Matcher",
      titleBn: "এডমিট-বাডি — বিশ্ববিদ্যালয় ভর্তি ও এসওপি",
      category: "Navigation",
      icon: <GraduationCap size={16} className="text-indigo-600" />,
      shortcut: "G A",
      onSelect: () => router.push("/admitbuddy"),
    },
    {
      id: "chuktiguard",
      title: "ChuktiGuard — B2B Invoicing & Clause 4 Outage Shield",
      titleBn: "চুক্তিগার্ড — বি২বি ইনভয়েস ও ইন্টারনেট ব্ল্যাকআউট শিল্ড",
      category: "Navigation",
      icon: <ShieldCheck size={16} className="text-indigo-600" />,
      shortcut: "G C",
      onSelect: () => router.push("/chuktiguard"),
    },
    {
      id: "feeguard",
      title: "FeeGuard BD — 20% Marketplace Fee Saver",
      titleBn: "ফি-গার্ড বিডি — ২০% মার্কেটপ্লেস ফি অডিট",
      category: "Navigation",
      icon: <Percent size={16} className="text-teal-600" />,
      shortcut: "G F",
      onSelect: () => router.push("/feeguard"),
    },
    {
      id: "shohoj",
      title: "Shohoj Budget — Bangla Voice Expense Tracker",
      titleBn: "সহজ বাজেট — ভয়েস ও বিকাশ ট্র্যাকার",
      category: "Navigation",
      icon: <Wallet size={16} className="text-amber-600" />,
      shortcut: "G S",
      onSelect: () => router.push("/shohoj-budget"),
    },
    {
      id: "haatbazar",
      title: "HaatBazar AI — 64 District Mandi Intelligence",
      titleBn: "হাটবাজার এআই — ৬৪ জেলা পাইকারি দর ও কৃষি চক্র",
      category: "Navigation",
      icon: <Sprout size={16} className="text-emerald-600" />,
      shortcut: "G H",
      onSelect: () => router.push("/haatbazar"),
    },
    {
      id: "krishi",
      title: "MaathSathi — what to plant, water today, crop doctor, Ropon Radar",
      titleBn: "মাঠসাথী — কী লাগাব, আজ সেচ, ফসলের ডাক্তার, রোপণ রাডার",
      category: "Navigation",
      icon: <Sprout size={16} className="text-lime-700" />,
      onSelect: () => { window.location.href = "/krishi/field#/farmer"; },
    },
    {
      id: "path",
      title: "My Path — Jobs, Scholarships & Action Plan",
      titleBn: "আমার পথ — চাকরি, বৃত্তি ও সুযোগ বোর্ড",
      category: "Navigation",
      icon: <Compass size={16} className="text-sky-600" />,
      shortcut: "G O",
      onSelect: () => router.push("/opportunities"),
    },
    {
      id: "krishi-book",
      title: "MaathSathi farm book — tasks, livestock, costs",
      titleBn: "খামারের খাতা — কাজের তালিকা, পশুপাখি, খরচ",
      category: "Navigation",
      icon: <Sprout size={16} className="text-emerald-700" />,
      onSelect: () => router.push("/krishi"),
    },
    {
      id: "legal",
      title: "Legal Aid — free legal help, application draft, mediation",
      titleBn: "আইনি সহায়তা — বিনামূল্যে আইনি সাহায্য, আবেদনের খসড়া, মীমাংসা",
      category: "Navigation",
      icon: <Scale size={16} className="text-indigo-700" />,
      shortcut: "G L",
      onSelect: () => router.push("/legal"),
    },
    {
      id: "rokkha",
      title: "Rokkha — scam check, cooling-off pause, disaster readiness",
      titleBn: "রক্ষা — প্রতারণা যাচাই, টাকা পাঠানোর আগে বিরতি, দুর্যোগ প্রস্তুতি",
      category: "Navigation",
      icon: <ShieldCheck size={16} className="text-amber-700" />,
      shortcut: "G R",
      onSelect: () => router.push("/rokkha"),
    },
    {
      id: "probaho",
      title: "Probaho Coach — Viva & Interview Practice",
      titleBn: "প্রবাহ কোচ — রিয়েল-টাইম স্পিকিং ও ভাইভা রাডার",
      category: "Navigation",
      icon: <Mic size={16} className="text-blue-600" />,
      shortcut: "G P",
      onSelect: () => router.push("/probaho"),
    },
    {
      id: "mediscan",
      title: "MediScan BD — Prescription Reader & Safety Flags",
      titleBn: "মেডিস্ক্যান বিডি — প্রেসক্রিপশন ও জেনেরিক সাশ্রয়",
      category: "Navigation",
      icon: <Pill size={16} className="text-rose-600" />,
      shortcut: "G M",
      onSelect: () => router.push("/mediscan"),
    },
    {
      id: "verify",
      title: "Verify Skill Passport Token (/verify)",
      titleBn: "স্কিল পাসপোর্ট যাচাইকরণ পেজ",
      category: "Tools",
      icon: <ShieldCheck size={16} className="text-emerald-600" />,
      onSelect: () => router.push("/verify"),
    },
    {
      id: "export-profile",
      title: "Export Unified Multi-Track Profile (JSON)",
      titleBn: "সমন্বিত প্রোফাইল এক্সপোর্ট করুন (জেসন)",
      category: "Action",
      icon: <Download size={16} className="text-indigo-600" />,
      shortcut: "E P",
      onSelect: () => {
        const json = exportProfileJson();
        const blob = new Blob([json], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `kormopath-unified-profile-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
        playSuccessChime();
      },
    },
  ];

  // Filter commands by search query
  const filtered = commands.filter((c) =>
    c.title.toLowerCase().includes(query.toLowerCase()) ||
    c.titleBn.toLowerCase().includes(query.toLowerCase()) ||
    c.category.toLowerCase().includes(query.toLowerCase())
  );
  const suggestions = ["Workspace", "Payout fees", "Health", "Farm tools"];

  const selectCommand = (item: CommandItem) => {
    const search = query.trim();
    if (search) {
      setRecentSearches((previous) => [search, ...previous.filter((entry) => entry.toLowerCase() !== search.toLowerCase())].slice(0, 5));
    }
    playClick();
    item.onSelect();
    setIsOpen(false);
  };

  // Global Keyboard listener for Cmd+K / Ctrl+K
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsOpen((prev) => !prev);
        playClick();
      } else if (e.key === "Escape") {
        setIsOpen(false);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const handleKeyDownInList = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, filtered.length));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filtered.length) % Math.max(1, filtered.length));
    } else if (e.key === "Enter" && filtered[selectedIndex]) {
      e.preventDefault();
      selectCommand(filtered[selectedIndex]);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-ink/40 p-4 pt-16 sm:pt-24 backdrop-blur-md animate-in fade-in duration-150"
      onClick={() => setIsOpen(false)}
      role="dialog"
      aria-label="Command Palette"
      aria-modal="true"
    >
      <div
        className="w-full max-w-xl overflow-hidden rounded-2xl border border-white/80 bg-paper/95 text-ink shadow-2xl ring-1 ring-white/70 backdrop-blur-2xl"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDownInList}
      >
        {/* Search Input Bar */}
        <div className="flex items-center gap-3 border-b border-line px-4 py-3.5">
          <Search size={18} className="text-muted shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder="Search tools, guides, workspace…"
            className="w-full bg-transparent text-[15px] text-ink placeholder-muted outline-none"
            aria-label="Search commands"
            autoComplete="off"
          />
          <button
            onClick={() => setIsOpen(false)}
            className="rounded-lg p-1 text-muted hover:bg-white/70 hover:text-ink transition-colors"
            aria-label="Close Command Palette"
          >
            <X size={16} />
          </button>
        </div>

        {!query && (
          <div className="border-b border-line px-4 py-3">
            {recentSearches.length > 0 && (
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <span className="mr-1 text-[11px] font-semibold text-muted">Recent</span>
                {recentSearches.map((search) => (
                  <button
                    key={search}
                    type="button"
                    onClick={() => setQuery(search)}
                    className="rounded-full border border-line bg-white/70 px-2.5 py-1 text-[12px] text-ink transition-colors hover:border-kept/40 hover:bg-kept-soft"
                  >
                    {search}
                  </button>
                ))}
              </div>
            )}
            <div className="flex flex-wrap items-center gap-2">
              <span className="mr-1 text-[11px] font-semibold text-muted">Suggestions</span>
              {suggestions.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => setQuery(suggestion)}
                  className="rounded-full border border-line bg-white/70 px-2.5 py-1 text-[12px] text-ink transition-colors hover:border-kept/40 hover:bg-kept-soft"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Results List */}
        <div className="max-h-80 overflow-y-auto p-2 space-y-1" role="listbox" aria-label="Search results">
          {filtered.length === 0 ? (
            <div className="py-8 text-center text-[13px] text-muted">
              No matching commands found for &quot;{query}&quot;.
            </div>
          ) : (
            filtered.map((item, idx) => {
              const isSelected = idx === selectedIndex;
              return (
                <button
                  key={item.id}
                  onClick={() => selectCommand(item)}
                  className={`w-full flex items-center justify-between rounded-xl px-3.5 py-2.5 text-left transition-all ${
                    isSelected
                      ? "bg-kept-soft text-kept font-semibold shadow-xs"
                      : "text-ink hover:bg-white/70"
                  }`}
                  role="option"
                  aria-selected={isSelected}
                >
                  <div className="flex items-center gap-3 truncate">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/80 shrink-0">
                      {item.icon}
                    </span>
                    <div className="truncate">
                      <span className="block text-[14px] leading-tight truncate">
                        {item.title}
                      </span>
                      <span className="block text-[11px] text-muted leading-tight truncate mt-0.5">
                        {item.titleBn}
                      </span>
                    </div>
                  </div>

                  {item.shortcut && (
                    <kbd className="hidden sm:inline-block rounded bg-white/80 px-2 py-0.5 text-[10px] font-mono text-muted border border-line">
                      {item.shortcut}
                    </kbd>
                  )}
                </button>
              );
            })
          )}
        </div>

        {/* Footer shortcuts helper */}
        <div className="flex items-center justify-between border-t border-line bg-white/50 px-4 py-2 text-[11px] text-muted">
          <span>
            Use <kbd className="rounded bg-white/80 px-1 py-0.5 text-ink">↑</kbd> <kbd className="rounded bg-white/80 px-1 py-0.5 text-ink">↓</kbd> to navigate, <kbd className="rounded bg-white/80 px-1 py-0.5 text-ink">↵</kbd> to select
          </span>
          <span>
            <kbd className="rounded bg-white/80 px-1 py-0.5 text-ink">ESC</kbd> to close
          </span>
        </div>
      </div>
    </div>
  );
}
