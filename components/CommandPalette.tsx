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
} from "lucide-react";
import { exportProfileJson } from "@/lib/profile";
import { playClick, playSuccessChime } from "@/lib/sound";

interface CommandItem {
  id: string;
  title: string;
  titleBn: string;
  category: "Navigation" | "Action" | "Tools";
  icon: React.ReactNode;
  shortcut?: string;
  onSelect: () => void;
}

export function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  const commands: CommandItem[] = [
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
      playClick();
      filtered[selectedIndex].onSelect();
      setIsOpen(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-slate-900/60 p-4 pt-16 sm:pt-24 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={() => setIsOpen(false)}
      role="dialog"
      aria-label="Command Palette"
      aria-modal="true"
    >
      <div
        className="w-full max-w-xl overflow-hidden rounded-2xl border border-slate-700/80 bg-[#070d1e] text-white shadow-2xl ring-1 ring-white/10"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDownInList}
      >
        {/* Search Input Bar */}
        <div className="flex items-center gap-3 border-b border-slate-800 px-4 py-3.5">
          <Search size={18} className="text-slate-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder="Type a command, tool or search track... (e.g. AdmitBuddy, HaatBazar)"
            className="w-full bg-transparent text-[15px] text-white placeholder-slate-500 outline-none"
            aria-label="Search commands"
          />
          <button
            onClick={() => setIsOpen(false)}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
            aria-label="Close Command Palette"
          >
            <X size={16} />
          </button>
        </div>

        {/* Results List */}
        <div className="max-h-80 overflow-y-auto p-2 space-y-1">
          {filtered.length === 0 ? (
            <div className="py-8 text-center text-[13px] text-slate-500">
              No matching commands found for &quot;{query}&quot;.
            </div>
          ) : (
            filtered.map((item, idx) => {
              const isSelected = idx === selectedIndex;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    playClick();
                    item.onSelect();
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center justify-between rounded-xl px-3.5 py-2.5 text-left transition-all ${
                    isSelected
                      ? "bg-orange-600/90 text-white font-semibold shadow-xs"
                      : "text-slate-300 hover:bg-slate-800/60"
                  }`}
                  role="option"
                  aria-selected={isSelected}
                >
                  <div className="flex items-center gap-3 truncate">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-800/80 shrink-0">
                      {item.icon}
                    </span>
                    <div className="truncate">
                      <span className="block text-[14px] leading-tight truncate">
                        {item.title}
                      </span>
                      <span className="block text-[11px] text-slate-400 leading-tight truncate mt-0.5">
                        {item.titleBn}
                      </span>
                    </div>
                  </div>

                  {item.shortcut && (
                    <kbd className="hidden sm:inline-block rounded bg-slate-800 px-2 py-0.5 text-[10px] font-mono text-slate-400 border border-slate-700">
                      {item.shortcut}
                    </kbd>
                  )}
                </button>
              );
            })
          )}
        </div>

        {/* Footer shortcuts helper */}
        <div className="flex items-center justify-between border-t border-slate-800/80 bg-slate-900/50 px-4 py-2 text-[11px] text-slate-400">
          <span>
            Use <kbd className="rounded bg-slate-800 px-1 py-0.5 text-slate-300">↑</kbd> <kbd className="rounded bg-slate-800 px-1 py-0.5 text-slate-300">↓</kbd> to navigate, <kbd className="rounded bg-slate-800 px-1 py-0.5 text-slate-300">↵</kbd> to select
          </span>
          <span>
            <kbd className="rounded bg-slate-800 px-1 py-0.5 text-slate-300">ESC</kbd> to close
          </span>
        </div>
      </div>
    </div>
  );
}
