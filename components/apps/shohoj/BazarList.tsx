"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Check,
  ExternalLink,
  Plus,
  ShoppingBasket,
  Trash2,
  TrendingDown,
  TrendingUp,
  Share2,
  Mic,
  MicOff,
  Store,
  BookOpen,
  Cpu,
  Apple,
  Sparkles,
  Search,
  Copy,
  AlertCircle,
  CheckCircle2,
  Smartphone,
  Layers,
  Printer,
  Download,
  X,
  ShoppingBag,
} from "lucide-react";
import { SourceTag } from "@/components/layout/AppHeader";
import { usePersistentState, storageKey, todayLocal, downloadText } from "@/lib/clientStore";
import {
  BAZAR_UNITS,
  EMPTY_BAZAR,
  MAX_ITEMS,
  QUICK_ITEMS,
  STORE_PLATFORMS,
  POPULAR_STORE_ITEMS,
  PRESET_BASKETS,
  formatBazarMemo,
  storeSearchUrl,
  finishTrip,
  priceStats,
  sanitizeBazar,
  tripTotal,
  parseBazarVoiceText,
  formatBazarShareText,
  whatsappBazarHref,
  smsBazarHref,
  detectBazarCategory,
  type BazarItem,
  type BazarState,
  type BazarUnit,
  type StorePlatform,
  type BazarCategory,
  type CatalogItem,
  type ParsedVoiceItem,
  type PresetBasket,
} from "@/lib/bazar";

const BN = "০১২৩৪৫৬৭৮৯";
const bnNum = (v: number | string) => String(v).replace(/\d/g, (d) => BN[Number(d)]);
const toAscii = (s: string) => s.replace(/[০-৯]/g, (d) => String(BN.indexOf(d)));
const taka = (poisha: number, bn: boolean) => {
  const t = (poisha / 100).toLocaleString("en-IN", { maximumFractionDigits: 2 });
  return `৳${bn ? bnNum(t) : t}`;
};
const newId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

const BASE_LABEL = {
  kg: { bn: "কেজি", en: "kg" },
  litre: { bn: "লিটার", en: "litre" },
  piece: { bn: "পিস", en: "piece" },
} as const;

// TCB's official commodity price list
const TCB_URL = "https://tcb.gov.bd/pages/static-pages/6922dcfb933eb65569e13083";

const CATEGORY_TABS: Array<{ id: "all" | BazarCategory; labelBn: string; labelEn: string; icon: typeof Store }> = [
  { id: "all", labelBn: "সব পণ্য", labelEn: "All Items", icon: Layers },
  { id: "grocery", labelBn: "চালডাল ও মুদি", labelEn: "Groceries (Chaldal)", icon: Store },
  { id: "produce", labelBn: "তাজা কাঁচাবাজার", labelEn: "Fresh Produce", icon: Apple },
  { id: "books_stationery", labelBn: "রকমারি বই ও স্টাডি", labelEn: "Rokomari Books & Study", icon: BookOpen },
  { id: "gadgets_home", labelBn: "দারাজ গ্যাজেট ও হোম", labelEn: "Daraz Gadgets & Home", icon: Cpu },
];

/**
 * Enhanced Bazar list and live multi-store shopping assistant.
 * Seamless live search integration for Daraz, Rokomari, Chaldal, Shwapno, and TCB benchmark.
 * Deterministic, privacy-first, zero made-up prices: all stored prices are user-entered poisha.
 */
export function BazarList({
  onAddExpense,
}: {
  onAddExpense?: (e: { amountPoisha: number; note: string; date: string }) => void;
}) {
  const [lang, setLang] = useState<"bn" | "en">("bn");
  const bn = lang === "bn";
  const T = (b: string, e: string) => (bn ? b : e);

  const [state, setState] = usePersistentState<BazarState>(storageKey("shohoj", "bazar"), EMPTY_BAZAR, sanitizeBazar);
  const [today, setToday] = useState("");
  useEffect(() => {
    setToday(todayLocal());
  }, []);

  // Form input state
  const [name, setName] = useState("");
  const [qty, setQty] = useState("1");
  const [unit, setUnit] = useState<BazarUnit>("kg");
  const [priceDraft, setPriceDraft] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState("");

  // Target Budget Planner
  const [targetBudgetInput, setTargetBudgetInput] = useState("");
  const targetBudgetPoisha = useMemo(() => {
    const v = Number(toAscii(targetBudgetInput).replace(/[,\s৳]/g, ""));
    return Number.isFinite(v) && v > 0 ? Math.round(v * 100) : 0;
  }, [targetBudgetInput]);

  // Market Mode (large touch-friendly view for when at the physical store)
  const [marketMode, setMarketMode] = useState(false);

  // Store Catalog Explorer
  const [showCatalog, setShowCatalog] = useState(false);
  const [catalogCategory, setCatalogCategory] = useState<"all" | BazarCategory>("all");
  const [catalogSearch, setCatalogSearch] = useState("");

  // Voice / Batch Input Assistant
  const [showVoiceAssistant, setShowVoiceAssistant] = useState(false);
  const [voiceText, setVoiceText] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [voiceError, setVoiceError] = useState("");

  // Share Dialog State
  const [showShareModal, setShowShareModal] = useState(false);

  // Live Store Search Modal
  const [liveSearchQuery, setLiveSearchQuery] = useState("");
  const [liveSearching, setLiveSearching] = useState(false);
  const [liveSearchResult, setLiveSearchResult] = useState<{
    query: string;
    answer: string;
    sources: Array<{ title: string; url: string }>;
  } | null>(null);
  const [liveSearchError, setLiveSearchError] = useState("");
  const [showLiveSearchModal, setShowLiveSearchModal] = useState(false);

  // Preset Baskets Drawer
  const [showPresetDrawer, setShowPresetDrawer] = useState(false);

  // Printable Memo Modal
  const [showMemoModal, setShowMemoModal] = useState(false);

  const flash = (m: string) => {
    setMsg(m);
    window.setTimeout(() => setMsg(""), 3500);
  };

  const add = (n: string, q: number, u: BazarUnit, cat?: BazarCategory) => {
    const clean = n.normalize("NFC").trim().slice(0, 60);
    if (!clean || !(q > 0)) return;
    const detected = cat || detectBazarCategory(clean);
    setState((s) =>
      s.items.length >= MAX_ITEMS
        ? s
        : {
            ...s,
            items: [
              ...s.items,
              {
                id: newId(),
                name: clean,
                qty: q,
                unit: u,
                checked: false,
                pricePoisha: null,
                category: detected,
              },
            ],
          }
    );
  };

  const update = (id: string, patch: Partial<BazarItem>) =>
    setState((s) => ({ ...s, items: s.items.map((i) => (i.id === id ? { ...i, ...patch } : i)) }));

  const remove = (id: string) =>
    setState((s) => ({ ...s, items: s.items.filter((i) => i.id !== id) }));

  const setPrice = (id: string, raw: string) => {
    setPriceDraft((d) => ({ ...d, [id]: raw }));
    const v = Number(toAscii(raw).replace(/[,\s৳]/g, ""));
    update(id, {
      pricePoisha: raw.trim() && Number.isFinite(v) && v >= 0 && v <= 1_000_000 ? Math.round(v * 100) : null,
    });
  };

  // Web Speech API Voice Recognition (Bangla first, fallback gracefully)
  const toggleSpeechRecognition = () => {
    if (typeof window === "undefined") return;
    const SpeechRecognition =
      (window as unknown as { SpeechRecognition?: any }).SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition?: any }).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setVoiceError(
        T(
          "আপনার ব্রাউজারে ভয়েস সাপোর্ট নেই। নিচের বক্সে বাংলায় বা ইংরেজিতে ফর্দ লিখুন।",
          "Voice recognition not supported in this browser. Please type your list in the box below."
        )
      );
      return;
    }

    if (isListening) {
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = "bn-BD";
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setIsListening(true);
        setVoiceError("");
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setVoiceText((prev) => (prev ? `${prev}, ${transcript}` : transcript));
        setIsListening(false);
      };

      recognition.onerror = (e: any) => {
        setIsListening(false);
        setVoiceError(
          T("ভয়েস রেকর্ড ব্যর্থ হয়েছে। মাইক্রোফোন পারমিশন চেক করুন বা লিখে ইনপুট দিন।", "Voice recognition error. Check mic permission or type below.")
        );
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
    } catch {
      setIsListening(false);
      setVoiceError(T("মাইক্রোফোন চালু করা যায়নি।", "Could not start microphone."));
    }
  };

  // Parsed Voice / Batch Preview Items
  const parsedBatchItems = useMemo(() => {
    return parseBazarVoiceText(voiceText);
  }, [voiceText]);

  // Confirm and Add Batch Items
  const confirmBatchAdd = () => {
    if (parsedBatchItems.length === 0) return;
    let addedCount = 0;
    parsedBatchItems.forEach((item) => {
      add(item.name, item.qty, item.unit, item.category);
      addedCount++;
    });
    setVoiceText("");
    setShowVoiceAssistant(false);
    flash(
      T(
        `${bnNum(addedCount)}টি পণ্য সফলভাবে ফর্দে যোগ হয়েছে!`,
        `Successfully added ${addedCount} items to the bazar list!`
      )
    );
  };

  const total = tripTotal(state.items);
  const ready = state.items.filter((i) => i.checked && i.pricePoisha !== null).length;
  const waiting = state.items.filter((i) => i.checked && i.pricePoisha === null).length;
  const stats = useMemo(() => (today ? priceStats(state.history, today) : []), [state.history, today]);

  const finish = () => {
    if (!today || !ready) return;
    const r = finishTrip(state, today);
    setState(r.state);
    setPriceDraft({});
    onAddExpense?.({ amountPoisha: r.totalPoisha, note: r.note, date: today });
    flash(
      onAddExpense
        ? T(
            `${bnNum(r.count)}টি জিনিসের ${taka(r.totalPoisha, true)} খরচ হিসাবে নিশ্চিত করতে পাঠানো হলো।`,
            `${r.count} items, ${taka(r.totalPoisha, false)}, sent to the ledger to confirm.`
          )
        : T("দাম সংরক্ষিত হয়েছে।", "Prices saved.")
    );
  };

  // Filtered Catalog Items
  const filteredCatalog = useMemo(() => {
    return POPULAR_STORE_ITEMS.filter((item) => {
      const matchCat = catalogCategory === "all" || item.category === catalogCategory;
      const matchQuery =
        !catalogSearch.trim() ||
        item.nameBn.toLowerCase().includes(catalogSearch.toLowerCase()) ||
        item.nameEn.toLowerCase().includes(catalogSearch.toLowerCase());
      return matchCat && matchQuery;
    });
  }, [catalogCategory, catalogSearch]);

  const shareText = useMemo(() => {
    return formatBazarShareText(state.items, today, bn);
  }, [state.items, today, bn]);

  const copyShareText = () => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(shareText);
      flash(T("ফর্দ ক্লিপবোর্ডে কপি হয়েছে!", "Bazar list copied to clipboard!"));
    }
  };

  const executeLiveSearch = async (query: string) => {
    const q = query.trim();
    if (q.length < 2) return;
    setLiveSearchQuery(q);
    setShowLiveSearchModal(true);
    setLiveSearching(true);
    setLiveSearchError("");
    setLiveSearchResult(null);

    try {
      const res = await fetch("/api/product-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: q }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setLiveSearchError(data.error || T("পণ্যের লাইভ দাম পাওয়া যায়নি। নিচের স্টোর লিংকে সরাসরি দেখুন।", "Could not fetch live price. Check direct store links below."));
      } else {
        setLiveSearchResult({
          query: q,
          answer: data.answer || "",
          sources: Array.isArray(data.sources) ? data.sources : [],
        });
      }
    } catch {
      setLiveSearchError(T("ইন্টারনেট সংযোগ যাচাই করুন।", "Network error. Please check connection."));
    } finally {
      setLiveSearching(false);
    }
  };

  const addPresetBasket = (basket: PresetBasket) => {
    let added = 0;
    basket.items.forEach((item) => {
      add(bn ? item.nameBn : item.nameEn, item.qty, item.unit, item.category);
      added++;
    });
    setShowPresetDrawer(false);
    flash(
      T(
        `'${bn ? basket.nameBn : basket.nameEn}'-এর ${bnNum(added)}টি পণ্য ফর্দে যোগ হয়েছে!`,
        `Added ${added} items from '${basket.nameEn}' to your list!`
      )
    );
  };

  const memoText = useMemo(() => {
    return formatBazarMemo(state.items, today, targetBudgetPoisha, bn);
  }, [state.items, today, targetBudgetPoisha, bn]);

  const copyMemoText = () => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(memoText);
      flash(T("মেমো কপি হয়েছে!", "Memo copied!"));
    }
  };

  return (
    <section
      aria-labelledby="bazar-h"
      data-testid="bazar-list"
      className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-xs"
    >
      {/* Header & Main Bar */}
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 id="bazar-h" className="flex items-center gap-2 text-[17px] font-bold text-slate-900">
              <span className="grid h-7 w-7 place-items-center rounded-lg bg-emerald-100 text-emerald-800">
                <ShoppingBasket size={18} aria-hidden />
              </span>
              {T("বাজারের তালিকা ও লাইভ স্টোর শপিং", "Bazar List & Live Store Shopping")}
            </h2>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[12px] font-bold text-emerald-800 border border-emerald-200">
              <Sparkles size={11} aria-hidden /> Daraz · Rokomari · Chaldal
            </span>
          </div>
          <p className="mt-1 text-[13px] leading-relaxed text-slate-600">
            {T(
              "কী কিনবেন সহজে লিখে বা মুখে বলে রাখুন। দারাজ, রকমারি, চালডাল ও স্বপ্নের বর্তমান দর সরাসরি যাচাই করে কেনার পর নিজের দেওয়া আসল দাম লিখে খরচ ট্র্যাকিং করুন।",
              "Plan what to buy via voice or text. Check live prices on Daraz, Rokomari, Chaldal, and Shwapno, tick what you bought, and track your actual household expenses."
            )}
          </p>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => setMarketMode(!marketMode)}
            className={`inline-flex min-h-[34px] items-center gap-1.5 rounded-full px-3 text-[12px] font-bold transition-colors ${
              marketMode
                ? "bg-emerald-700 text-white shadow-xs"
                : "border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
            } min-h-[44px] min-w-[44px]`}
            title={T("বাজারে থাকা অবস্থায় সহজ বড় ইন্টারফেস", "Big touch targets for use at market")}
          >
            <Smartphone size={14} aria-hidden />
            {T(marketMode ? "স্বাভাবিক ভিউ" : "বাজার মোড", marketMode ? "Normal View" : "Market Mode")}
          </button>

          <button
            type="button"
            onClick={() => setShowMemoModal(true)}
            className="inline-flex min-h-[34px] items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 text-[12px] font-bold text-slate-700 hover:bg-slate-100 min-h-[44px] min-w-[44px]"
            title={T("বাজারের মেমো স্লিপ দেখুন ও প্রিন্ট করুন", "View and print bazar memo slip")}
          >
            <Printer size={13} aria-hidden />
            {T("মেমো", "Memo")}
          </button>

          <button
            type="button"
            onClick={() => setShowShareModal(true)}
            className="inline-flex min-h-[34px] items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 text-[12px] font-bold text-slate-700 hover:bg-slate-100 min-h-[44px] min-w-[44px]"
            title={T("হোয়াটসঅ্যাপ বা এসএমএসে ফর্দ পাঠান", "Share bazar list via WhatsApp/SMS")}
          >
            <Share2 size={13} aria-hidden />
            {T("শেয়ার", "Share")}
          </button>

          <button
            type="button"
            onClick={() => setLang(bn ? "en" : "bn")}
            className="kp-chip !h-11 !rounded-full !text-[12px] font-semibold !min-w-[44px]"
            aria-label={bn ? "Switch to English" : "বাংলায় দেখুন"}
          >
            {bn ? "EN" : "বাং"}
          </button>
        </div>
      </div>

      {/* Target Budget Planner & Status Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 rounded-xl border border-slate-200 bg-slate-50/70 p-3 text-[13px]">
        <div className="flex items-center justify-between sm:justify-start gap-2">
          <span className="font-semibold text-slate-600">{T("বাজারের বাজেট লক্ষ্য:", "Trip Budget:")}</span>
          <div className="relative flex items-center">
            <span className="absolute left-2 text-[12px] font-bold text-slate-500">৳</span>
            <input
              type="text"
              inputMode="numeric"
              aria-label={T("বাজারের বাজেট (টাকা)", "Shopping budget (taka)")}
              placeholder={T("বাজেট লিখুন", "e.g. 1500")}
              value={targetBudgetInput}
              onChange={(e) => setTargetBudgetInput(e.target.value)}
              className="w-28 rounded-lg border border-slate-300 bg-white py-1 pl-5 pr-2 text-[13px] font-semibold text-slate-800 outline-none focus:border-emerald-600 min-h-[44px]"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-600">{T("কেনাকাটা হয়েছে:", "Total Bought:")}</span>
          <span className="font-mono text-[15px] font-bold text-emerald-800" data-testid="bazar-total">
            {taka(total, bn)}
          </span>
          {targetBudgetPoisha > 0 && (
            <span
              className={`text-[12px] font-bold px-1.5 py-0.5 rounded ${
                total > targetBudgetPoisha
                  ? "bg-red-100 text-red-700"
                  : "bg-emerald-100 text-emerald-800"
              }`}
            >
              {total > targetBudgetPoisha
                ? T(`+${taka(total - targetBudgetPoisha, bn)} বেশি`, `+${taka(total - targetBudgetPoisha, false)} over`)
                : T(`${taka(targetBudgetPoisha - total, bn)} বাকি`, `${taka(targetBudgetPoisha - total, false)} left`)}
            </span>
          )}
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-2 text-slate-600">
          <span>
            {T(
              `মোট ${bnNum(state.items.length)}টি পণ্যের মধ্যে ${bnNum(state.items.filter((i) => i.checked).length)}টি কেনা শেষ`,
              `${state.items.filter((i) => i.checked).length} of ${state.items.length} items checked`
            )}
          </span>
          {waiting > 0 && (
            <span className="inline-flex items-center gap-1 rounded bg-amber-100 px-1.5 py-0.5 text-[12px] font-bold text-amber-900">
              <AlertCircle size={11} aria-hidden />
              {T(`${bnNum(waiting)}টির দাম বাকি`, `${waiting} need price`)}
            </span>
          )}
        </div>
      </div>

      {/* Feature Action Bar (Voice / Presets / Catalog / Live Store Search) */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => {
            setShowVoiceAssistant(!showVoiceAssistant);
            setShowCatalog(false);
            setShowPresetDrawer(false);
          }}
          className={`inline-flex min-h-[38px] items-center gap-1.5 rounded-xl px-3.5 text-[13px] font-bold transition-colors ${
            showVoiceAssistant
              ? "bg-slate-900 text-white"
              : "border border-emerald-300 bg-emerald-50 text-emerald-900 hover:bg-emerald-100"
          } min-h-[44px] min-w-[44px]`}
        >
          <Mic size={15} className={isListening ? "animate-pulse text-red-500" : ""} aria-hidden />
          {T("ভয়েস বা দ্রুত ফর্দ ইনপুট", "Voice / Fast Batch Add")}
        </button>

        <button
          type="button"
          onClick={() => {
            setShowPresetDrawer(!showPresetDrawer);
            setShowVoiceAssistant(false);
            setShowCatalog(false);
          }}
          className={`inline-flex min-h-[38px] items-center gap-1.5 rounded-xl px-3.5 text-[13px] font-bold transition-colors ${
            showPresetDrawer
              ? "bg-slate-900 text-white"
              : "border border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100"
          } min-h-[44px] min-w-[44px]`}
        >
          <ShoppingBag size={15} aria-hidden />
          {T("🧺 রেডিমেড ফর্দ", "Ready Baskets")}
        </button>

        <button
          type="button"
          onClick={() => {
            setShowCatalog(!showCatalog);
            setShowVoiceAssistant(false);
            setShowPresetDrawer(false);
          }}
          className={`inline-flex min-h-[38px] items-center gap-1.5 rounded-xl px-3.5 text-[13px] font-bold transition-colors ${
            showCatalog
              ? "bg-slate-900 text-white"
              : "border border-sky-300 bg-sky-50 text-sky-900 hover:bg-sky-100"
          } min-h-[44px] min-w-[44px]`}
        >
          <Store size={15} aria-hidden />
          {T("জনপ্রিয় স্টোর ক্যাটালগ", "Store Catalog Browser")}
        </button>

        <button
          type="button"
          onClick={() => {
            setLiveSearchQuery("");
            setLiveSearchResult(null);
            setLiveSearchError("");
            setShowLiveSearchModal(true);
          }}
          className="inline-flex min-h-[38px] items-center gap-1.5 rounded-xl border border-purple-300 bg-purple-50 px-3.5 text-[13px] font-bold text-purple-900 hover:bg-purple-100 transition-colors min-h-[44px] min-w-[44px]"
        >
          <Sparkles size={15} className="text-purple-600" aria-hidden />
          {T("🔍 লাইভ পণ্যের দর খুঁজুন", "Live Price Finder")}
        </button>
      </div>

      {/* Smart Voice & Fast Batch Input Drawer */}
      {showVoiceAssistant && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-4 space-y-3 transition-all">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="grid h-7 w-7 place-items-center rounded-full bg-emerald-200 text-emerald-900 font-bold">
                <Mic size={15} aria-hidden />
              </span>
              <div>
                <h4 className="text-[14px] font-bold text-emerald-950">
                  {T("ভয়েসে বলুন বা একবারে পুরো ফর্দ পেস্ট করুন", "Voice Input or Paste Multiple Items")}
                </h4>
                <p className="text-[12px] text-emerald-800">
                  {T(
                    "যেমন: '২ কেজি আলু, ১ লিটার সয়াবিন তেল, casio calculator আর ১ ডজন ডিম'",
                    "e.g. '2 kg potato, 1 litre soybean oil, casio calculator, 1 dozen eggs'"
                  )}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={toggleSpeechRecognition}
              className={`inline-flex min-h-[38px] items-center gap-1.5 rounded-xl px-3.5 text-[13px] font-bold transition-all ${
                isListening
                  ? "bg-red-600 text-white animate-pulse"
                  : "bg-emerald-700 text-white hover:bg-emerald-800"
              } min-h-[44px] min-w-[44px]`}
            >
              {isListening ? <MicOff size={15} aria-hidden /> : <Mic size={15} aria-hidden />}
              {isListening ? T("শুনছি... (থামতে চাপুন)", "Listening... (Tap to stop)") : T("মাইকে বলুন", "Speak in Bangla")}
            </button>
          </div>

          <textarea
            rows={2}
            value={voiceText}
            onChange={(e) => setVoiceText(e.target.value)}
            placeholder={T(
              "এখানে ফর্দ টাইপ করুন বা পেস্ট করুন... (কমা বা 'আর' দিয়ে আলাদা করুন)",
              "Type or paste items here (separated by commas or 'and')..."
            )}
            className="w-full rounded-xl border border-emerald-300 bg-white p-3 text-[14px] text-slate-800 outline-none focus:border-emerald-600 min-h-[44px]"
          />

          {voiceError && <p className="text-[12px] font-semibold text-red-600">{voiceError}</p>}

          {/* Confirm Before Save Preview (Strictly respects AGENTS.md rule) */}
          {parsedBatchItems.length > 0 && (
            <div className="space-y-2 rounded-xl border border-emerald-300 bg-white p-3">
              <div className="flex items-center justify-between">
                <span className="text-[12.5px] font-bold text-slate-700">
                  {T("শনাক্তকৃত পণ্যের প্রিভিউ (যাচাই করে যোগ করুন):", "Detected Items Preview (Review before adding):")}
                </span>
                <span className="text-[12px] font-semibold text-emerald-800">
                  {bnNum(parsedBatchItems.length)} {T("টি পণ্য", "items")}
                </span>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {parsedBatchItems.map((p, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-[12px] text-slate-800"
                  >
                    <span className="font-bold text-slate-900">{p.name}</span>
                    <span className="font-mono text-emerald-800 font-semibold">
                      {bn ? bnNum(p.qty) : p.qty} {p.unit}
                    </span>
                    <span className="text-[12px] text-slate-500 uppercase">({p.category})</span>
                  </span>
                ))}
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={confirmBatchAdd}
                  className="inline-flex min-h-[38px] items-center gap-1.5 rounded-xl bg-emerald-700 px-4 text-[13px] font-bold text-white hover:bg-emerald-800 min-h-[44px] min-w-[44px]"
                >
                  <CheckCircle2 size={15} aria-hidden />
                  {T("নিশ্চিত করে ফর্দে যোগ করুন", "Confirm & Add to List")}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Popular Store Catalog Explorer (Daraz / Rokomari / Chaldal / Shwapno) */}
      {showCatalog && (
        <div className="rounded-xl border border-sky-200 bg-sky-50/30 p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h4 className="flex items-center gap-1.5 text-[14px] font-bold text-sky-950">
                <Store size={16} aria-hidden />
                {T("জনপ্রিয় পণ্য ক্যাটালগ থেকে ১-ক্লিকে যোগ", "1-Click Add from Popular Store Catalog")}
              </h4>
              <p className="text-[12px] text-sky-800">
                {T(
                  "চালডাল ও স্বপ্নের মুদি সামগ্রী, রকমারির বই-খাতা এবং দারাজের ইলেকট্রনিক্স এক ক্লিকে ফর্দে যোগ করুন।",
                  "Browse staples, fresh produce, Rokomari books/calculators, and Daraz electronics with 1-click add."
                )}
              </p>
            </div>
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-2.5 text-slate-500" aria-hidden />
              <input
                type="text"
                placeholder={T("পণ্য খুঁজুন...", "Filter catalog...")}
                value={catalogSearch}
                onChange={(e) => setCatalogSearch(e.target.value)}
                className="w-48 rounded-xl border border-slate-200 bg-white py-1.5 pl-8 pr-3 text-[13px] text-slate-800 outline-none focus:border-sky-600 min-h-[44px]"
              />
            </div>
          </div>

          {/* Category Tabs */}
          <div className="flex flex-wrap gap-1 border-b border-sky-100 pb-2">
            {CATEGORY_TABS.map((tab) => {
              const TabIcon = tab.icon;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setCatalogCategory(tab.id)}
                  className={`inline-flex min-h-[32px] items-center gap-1.5 rounded-lg px-2.5 text-[12px] font-semibold transition-colors ${
                    catalogCategory === tab.id
                      ? "bg-sky-800 text-white"
                      : "bg-white text-slate-700 hover:bg-sky-100 border border-slate-200"
                  } min-h-[44px] min-w-[44px]`}
                >
                  <TabIcon size={13} aria-hidden />
                  {bn ? tab.labelBn : tab.labelEn}
                </button>
              );
            })}
          </div>

          {/* Catalog Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 max-h-72 overflow-y-auto pr-1">
            {filteredCatalog.map((item) => {
              const storeMeta = STORE_PLATFORMS[item.primaryStore];
              return (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white p-2.5 hover:border-sky-300 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-bold text-slate-900">{bn ? item.nameBn : item.nameEn}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="font-mono text-[12px] text-slate-500">
                        {bn ? bnNum(item.defaultQty) : item.defaultQty} {item.unit}
                      </span>
                      <span
                        className={`rounded px-1.5 py-0.2 text-[12px] font-bold uppercase tracking-wider ${
                          item.primaryStore === "rokomari"
                            ? "bg-emerald-100 text-emerald-800"
                            : item.primaryStore === "daraz"
                            ? "bg-sky-100 text-sky-800"
                            : item.primaryStore === "chaldal"
                            ? "bg-rose-100 text-rose-800"
                            : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {storeMeta.labelBn}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <a
                      href={storeSearchUrl(item.primaryStore, bn ? item.nameBn : item.nameEn)}
                      target="_blank"
                      rel="noopener noreferrer"
                      title={T(`${storeMeta.name}-এ লাইভ দাম দেখুন`, `View live price on ${storeMeta.name}`)}
                      className="grid h-11 w-11 place-items-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                    >
                      <ExternalLink size={13} aria-hidden />
                    </a>
                    <button
                      type="button"
                      onClick={() => add(bn ? item.nameBn : item.nameEn, item.defaultQty, item.unit, item.category)}
                      className="inline-flex h-11 items-center gap-1 rounded-lg bg-emerald-700 px-2.5 text-[12px] font-bold text-white hover:bg-emerald-800 min-w-[44px]"
                    >
                      <Plus size={13} aria-hidden />
                      {T("ফর্দে নিন", "Add")}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Preset Ready Baskets Drawer */}
      {showPresetDrawer && (
        <div className="rounded-xl border border-amber-300 bg-amber-50/40 p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h4 className="flex items-center gap-1.5 text-[14px] font-bold text-amber-950">
                <ShoppingBag size={16} aria-hidden />
                {T("বাস্তবধর্মী রেডিমেড ফর্দ (১-ক্লিকে যোগ)", "Preset Ready Baskets (1-Click Add)")}
              </h4>
              <p className="text-[12px] text-amber-800">
                {T(
                  "পরিবারের মাসিক মুদি, তাজা কাঁচাবাজার, রকমারির বই-খাতা বা দারাজের হোম গ্যাজেটের প্যাকেজ এক ক্লিকে নিজের ফর্দে নিয়ে নিন।",
                  "One-click add full shopping baskets for monthly groceries, fresh bazar, Rokomari study kits, or Daraz tech accessories."
                )}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowPresetDrawer(false)}
              className="text-[12px] font-bold text-amber-900 hover:underline min-h-[44px] min-w-[44px]"
            >
              {T("বন্ধ করুন ✕", "Close ✕")}
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {PRESET_BASKETS.map((basket) => (
              <div
                key={basket.id}
                className="rounded-xl border border-amber-200 bg-white p-3.5 space-y-2.5 shadow-2xs hover:border-amber-400 transition-all"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h5 className="text-[13.5px] font-bold text-slate-900">
                      {bn ? basket.nameBn : basket.nameEn}
                    </h5>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="rounded bg-amber-100 px-1.5 py-0.2 text-[12px] font-bold text-amber-800">
                        {bn ? basket.tagBn : basket.tagEn}
                      </span>
                      <span className="text-[12px] text-slate-500 font-medium">
                        {bn ? `${bnNum(basket.items.length)}টি পণ্য` : `${basket.items.length} items`}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => addPresetBasket(basket)}
                    className="inline-flex h-11 items-center gap-1 rounded-lg bg-emerald-700 px-3 text-[12px] font-bold text-white hover:bg-emerald-800 shrink-0 min-w-[44px]"
                  >
                    <Plus size={13} aria-hidden />
                    {T("সব যোগ", "Add All")}
                  </button>
                </div>

                <div className="flex flex-wrap gap-1">
                  {basket.items.map((item, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1 rounded-md bg-slate-50 border border-slate-200 px-2 py-0.5 text-[12px] text-slate-700"
                    >
                      <span className="font-semibold text-slate-800">{bn ? item.nameBn : item.nameEn}</span>
                      <span className="font-mono text-emerald-800 font-bold">
                        {bn ? bnNum(item.qty) : item.qty} {item.unit}
                      </span>
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Add Chips */}
      <div className="flex flex-wrap gap-1.5" aria-label={T("দ্রুত যোগ", "Quick add")}>
        {QUICK_ITEMS.map((q) => (
          <button
            key={q.bn}
            type="button"
            data-testid="bazar-chip"
            onClick={() => add(bn ? q.bn : q.en, 1, q.unit)}
            className="inline-flex min-h-[36px] items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-3 text-[12.5px] font-semibold text-slate-800 hover:border-emerald-400 hover:bg-emerald-50 transition-colors min-h-[44px] min-w-[44px]"
          >
            <Plus size={12} aria-hidden /> {bn ? q.bn : q.en}
          </button>
        ))}
      </div>

      {/* Manual Add Line Form */}
      <form
        className="flex flex-wrap items-end gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          const q = Number(toAscii(qty));
          add(name, q, unit);
          setName("");
          setQty("1");
        }}
      >
        <label className="min-w-[12rem] flex-1 text-[12px] font-semibold text-slate-600">
          {T("পণ্য বা জিনিসের নাম", "Item Name")}
          <input
            id="bazar-name"
            value={name}
            maxLength={60}
            onChange={(e) => setName(e.target.value)}
            placeholder={T("যেমন: মিনিকেট চাল বা Casio ক্যালকুলেটর", "e.g. Miniket Rice or Casio Calculator")}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-[14px] font-normal outline-none focus:border-emerald-600 min-h-[44px]"
          />
        </label>
        <label className="w-20 text-[12px] font-semibold text-slate-600">
          {T("পরিমাণ", "Qty")}
          <input
            id="bazar-qty"
            inputMode="decimal"
            value={qty}
            onChange={(e) => setQty(e.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-[14px] font-normal outline-none focus:border-emerald-600 min-h-[44px]"
          />
        </label>
        <label className="text-[12px] font-semibold text-slate-600">
          {T("একক", "Unit")}
          <select
            id="bazar-unit"
            value={unit}
            onChange={(e) => setUnit(e.target.value as BazarUnit)}
            className="mt-1 block rounded-xl border border-slate-200 bg-white px-2 py-2 text-[14px] font-normal min-h-[44px]"
          >
            {BAZAR_UNITS.map((u) => (
              <option key={u.id} value={u.id}>
                {bn ? u.bn : u.en}
              </option>
            ))}
          </select>
        </label>
        <button
          type="submit"
          data-testid="bazar-add"
          className="inline-flex min-h-[42px] items-center gap-1 rounded-xl bg-slate-900 px-4 text-[14px] font-bold text-white disabled:opacity-50 min-h-[44px] min-w-[44px]"
          disabled={!name.trim()}
        >
          <Plus size={16} aria-hidden /> {T("যোগ", "Add")}
        </button>
      </form>

      {/* Active Items List */}
      {state.items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 p-6 text-center">
          <ShoppingBasket size={32} className="mx-auto text-slate-300 mb-2" aria-hidden />
          <p className="text-[14px] font-semibold text-slate-700">
            {T("বাজারের তালিকা এখনও খালি।", "Your bazar list is empty.")}
          </p>
          <p className="mt-1 text-[12.5px] text-slate-500">
            {T(
              "উপরের চিপ চাপুন, ভয়েসে বলুন বা স্টোর ক্যাটালগ থেকে সহজে যোগ করুন।",
              "Tap quick chips above, use the voice assistant, or pick from the store catalog."
            )}
          </p>
        </div>
      ) : (
        <ul className="space-y-2.5" data-testid="bazar-items">
          {state.items.map((i) => {
            const unitLabel = BAZAR_UNITS.find((u) => u.id === i.unit)!;
            const categoryMeta = CATEGORY_TABS.find((c) => c.id === i.category);

            return (
              <li
                key={i.id}
                data-item={i.name}
                className={`flex flex-wrap items-center justify-between gap-2.5 rounded-xl border p-3 transition-all ${
                  i.checked
                    ? "border-emerald-300 bg-emerald-50/50 shadow-xs"
                    : "border-slate-200 bg-white hover:border-slate-300"
                } ${marketMode ? "py-4 text-[16px]" : ""}`}
              >
                {/* Checkbox and item info */}
                <label className="flex min-h-[40px] min-w-0 flex-1 cursor-pointer items-center gap-3 min-h-[44px]">
                  <input
                    type="checkbox"
                    checked={i.checked}
                    onChange={(e) => update(i.id, { checked: e.target.checked })}
                    className={`rounded accent-emerald-700 cursor-pointer ${marketMode ? "h-6 w-6" : "h-5 w-5"}`}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`font-bold ${
                          i.checked ? "text-slate-500 line-through decoration-emerald-600/70" : "text-slate-900"
                        } ${marketMode ? "text-[16px]" : "text-[14.5px]"}`}
                      >
                        {i.name}
                      </span>
                      {categoryMeta && (
                        <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[12px] font-semibold text-slate-600 uppercase">
                          {bn ? categoryMeta.labelBn : categoryMeta.labelEn}
                        </span>
                      )}
                    </div>
                    <span className="font-mono text-[12px] text-slate-500">
                      {bn ? bnNum(i.qty) : i.qty} {bn ? unitLabel.bn : unitLabel.en}
                    </span>
                  </div>
                </label>

                {/* Price input when checked */}
                {i.checked && (
                  <label className="flex items-center gap-1.5 rounded-lg border border-emerald-300 bg-white px-2.5 py-1.5 text-[12.5px] font-bold text-slate-700">
                    {T("দাম ৳", "Paid ৳")}
                    <input
                      inputMode="decimal"
                      data-testid="bazar-price"
                      aria-label={T(`${i.name}-এর আসল দাম`, `Price paid for ${i.name}`)}
                      value={priceDraft[i.id] ?? (i.pricePoisha !== null ? String(i.pricePoisha / 100) : "")}
                      onChange={(e) => setPrice(i.id, e.target.value)}
                      placeholder="0.00"
                      className={`w-24 rounded border px-2 py-1 text-[14px] font-semibold outline-none focus:border-emerald-600 ${
                        i.pricePoisha === null ? "border-amber-400 bg-amber-50" : "border-slate-200"
                      } min-h-[44px]`}
                    />
                  </label>
                )}

                {/* Live Store Check Buttons */}
                <div className="flex flex-wrap items-center gap-1">
                  {/* AI Live Price Finder */}
                  <button
                    type="button"
                    onClick={() => executeLiveSearch(i.name)}
                    aria-label={T(`AI দিয়ে ${i.name}-এর লাইভ দাম খুঁজুন`, `Search live prices for ${i.name}`)}
                    className="inline-flex min-h-8 items-center gap-1 rounded-lg border border-purple-200 bg-purple-50 px-2 text-[12px] font-bold text-purple-800 transition-colors hover:border-purple-400 hover:bg-purple-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-600 min-h-[44px] min-w-[44px]"
                    title={T("দারাজ ও রকমারি সহ ওয়েবে লাইভ দর খুঁজুন", "Find live prices on Daraz/Rokomari via AI")}
                  >
                    <Sparkles size={11} className="text-purple-600" aria-hidden />
                    {T("লাইভ দর", "Live Price")}
                  </button>

                  {/* Daraz */}
                  <a
                    href={storeSearchUrl("daraz", i.name)}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={T(`দারাজে ${i.name} খুঁজুন`, `Search Daraz for ${i.name}`)}
                    className="inline-flex min-h-8 items-center gap-1 rounded-lg border border-sky-200 bg-sky-50 px-2 text-[12px] font-bold text-sky-800 transition-colors hover:border-sky-400 hover:bg-sky-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-600 min-h-[44px] min-w-[44px]"
                  >
                    Daraz <ExternalLink size={10} aria-hidden />
                  </a>

                  {/* Rokomari */}
                  <a
                    href={storeSearchUrl("rokomari", i.name)}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={T(`রকমারিতে ${i.name} খুঁজুন`, `Search Rokomari for ${i.name}`)}
                    className="inline-flex min-h-8 items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2 text-[12px] font-bold text-emerald-800 transition-colors hover:border-emerald-400 hover:bg-emerald-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 min-h-[44px] min-w-[44px]"
                  >
                    Rokomari <ExternalLink size={10} aria-hidden />
                  </a>

                  {/* Chaldal */}
                  <a
                    href={storeSearchUrl("chaldal", i.name)}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={T(`চালডালে ${i.name} খুঁজুন`, `Search Chaldal for ${i.name}`)}
                    className="inline-flex min-h-8 items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2 text-[12px] font-bold text-rose-800 transition-colors hover:border-rose-400 hover:bg-rose-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-600 min-h-[44px] min-w-[44px]"
                  >
                    Chaldal <ExternalLink size={10} aria-hidden />
                  </a>

                  {/* Shwapno */}
                  <a
                    href={storeSearchUrl("shwapno", i.name)}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={T(`স্বপ্নে ${i.name} খুঁজুন`, `Search Shwapno for ${i.name}`)}
                    className="inline-flex min-h-8 items-center gap-1 rounded-lg border border-amber-200 bg-amber-50 px-2 text-[12px] font-bold text-amber-800 transition-colors hover:border-amber-400 hover:bg-amber-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600 min-h-[44px] min-w-[44px]"
                  >
                    Shwapno <ExternalLink size={10} aria-hidden />
                  </a>
                </div>

                <button
                  type="button"
                  onClick={() => remove(i.id)}
                  aria-label={T(`${i.name} মুছুন`, `Remove ${i.name}`)}
                  className="grid h-11 w-11 place-items-center rounded-lg text-slate-500 hover:bg-red-50 hover:text-red-700"
                >
                  <Trash2 size={15} aria-hidden />
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {/* Trip Complete and Add to Expense Ledger */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-slate-50 p-4 border border-slate-200">
        <div className="text-[14px] text-slate-700">
          <span className="font-semibold">{T("এই বাজারে মোট খরচ", "This Trip Total")}: </span>
          <span className="font-mono text-[17px] font-bold text-slate-900" data-testid="bazar-total">
            {taka(total, bn)}
          </span>
          {waiting > 0 && (
            <span className="ml-2 text-[12.5px] font-semibold text-amber-800">
              ({T(`${bnNum(waiting)}টির দাম বাকি`, `${waiting} still need a price`)})
            </span>
          )}
        </div>
        <button
          type="button"
          data-testid="bazar-finish"
          onClick={finish}
          disabled={!ready || !today}
          className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-emerald-700 px-5 text-[14px] font-bold text-white shadow-xs hover:bg-emerald-800 disabled:opacity-50 transition-colors min-w-[44px]"
        >
          <Check size={16} aria-hidden />
          {T("বাজার শেষ — খরচ খাতায় নিন", "Finish Trip — Add to Ledger")}
        </button>
      </div>

      {msg && (
        <div role="status" className="rounded-lg bg-emerald-50 border border-emerald-200 p-2.5 text-[13px] font-semibold text-emerald-900 flex items-center gap-2">
          <CheckCircle2 size={16} className="text-emerald-700" aria-hidden />
          {msg}
        </div>
      )}

      {/* Share Modal / Dialog */}
      {showShareModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="flex items-center gap-2 text-[16px] font-bold text-slate-900">
                <Share2 size={18} className="text-emerald-700" aria-hidden />
                {T("বাজারের ফর্দ শেয়ার করুন", "Share Bazar List")}
              </h3>
              <button
                type="button"
                onClick={() => setShowShareModal(false)}
                className="rounded-lg p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-700 min-h-[44px] min-w-[44px]"
              >
                ✕
              </button>
            </div>

            <pre className="max-h-60 overflow-y-auto rounded-xl bg-slate-50 p-3 font-mono text-[12px] text-slate-800 whitespace-pre-wrap border border-slate-200">
              {shareText}
            </pre>

            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={copyShareText}
                className="inline-flex min-h-[40px] items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 text-[12.5px] font-bold text-slate-800 hover:bg-slate-100 min-h-[44px] min-w-[44px]"
              >
                <Copy size={14} aria-hidden />
                {T("কপি করুন", "Copy")}
              </button>

              <a
                href={whatsappBazarHref(shareText)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-[40px] items-center justify-center gap-1.5 rounded-xl bg-emerald-600 text-[12.5px] font-bold text-white hover:bg-emerald-700 min-h-[44px] min-w-[44px]"
              >
                WhatsApp
              </a>

              <a
                href={smsBazarHref(shareText)}
                className="inline-flex min-h-[40px] items-center justify-center gap-1.5 rounded-xl bg-sky-700 text-[12.5px] font-bold text-white hover:bg-sky-800 min-h-[44px] min-w-[44px]"
              >
                SMS
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Live Store Search & Price Compare Modal (Daraz, Rokomari, Chaldal, Shwapno, TCB) */}
      {showLiveSearchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg space-y-4 rounded-2xl bg-white p-5 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="grid h-8 w-8 place-items-center rounded-lg bg-purple-100 text-purple-800">
                  <Sparkles size={18} aria-hidden />
                </span>
                <div>
                  <h3 className="text-[16px] font-bold text-slate-900">
                    {T("লাইভ পণ্যের দর ও স্টোর তুলনা", "Live Price Finder & Store Compare")}
                  </h3>
                  <p className="text-[12px] text-slate-500">
                    Daraz · Rokomari · Chaldal · Shwapno · TCB
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowLiveSearchModal(false)}
                className="rounded-lg p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-700 min-h-[44px] min-w-[44px]"
              >
                <X size={18} aria-hidden />
              </button>
            </div>

            {/* Search Input Bar */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                executeLiveSearch(liveSearchQuery);
              }}
              className="flex gap-2"
            >
              <input
                type="text"
                value={liveSearchQuery}
                maxLength={120}
                onChange={(e) => setLiveSearchQuery(e.target.value)}
                placeholder={T("যেমন: মিনিকেট চাল, Casio ক্যালকুলেটর, সয়াবিন তেল...", "e.g. Miniket Rice, Casio fx-991EX...")}
                className="flex-1 rounded-xl border border-slate-300 px-3.5 py-2 text-[14px] text-slate-900 outline-none focus:border-purple-600 focus:ring-1 focus:ring-purple-600 min-h-[44px]"
              />
              <button
                type="submit"
                disabled={liveSearching || liveSearchQuery.trim().length < 2}
                className="inline-flex min-h-[42px] items-center gap-1.5 rounded-xl bg-purple-700 px-4 text-[13px] font-bold text-white hover:bg-purple-800 disabled:opacity-50 transition-colors min-h-[44px] min-w-[44px]"
              >
                <Search size={15} aria-hidden />
                {liveSearching ? T("খোঁজা হচ্ছে...", "Searching...") : T("খুঁজুন", "Search")}
              </button>
            </form>

            {/* Direct Instant Search Links */}
            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 space-y-2">
              <span className="text-[12px] font-semibold text-slate-600">
                {T("স্টোরে সরাসরি বর্তমান অফার দেখুন:", "Direct Store Catalogs:")}
              </span>
              <div className="flex flex-wrap gap-1.5">
                <a
                  href={storeSearchUrl("daraz", liveSearchQuery || "gadget")}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 rounded-lg border border-sky-300 bg-white px-2.5 py-1 text-[12px] font-bold text-sky-800 hover:bg-sky-50 min-h-[44px] min-w-[44px]"
                >
                  দারাজ (Daraz) <ExternalLink size={10} aria-hidden />
                </a>
                <a
                  href={storeSearchUrl("rokomari", liveSearchQuery || "book")}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 rounded-lg border border-emerald-300 bg-white px-2.5 py-1 text-[12px] font-bold text-emerald-800 hover:bg-emerald-50 min-h-[44px] min-w-[44px]"
                >
                  রকমারি (Rokomari) <ExternalLink size={10} aria-hidden />
                </a>
                <a
                  href={storeSearchUrl("chaldal", liveSearchQuery || "grocery")}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 rounded-lg border border-rose-300 bg-white px-2.5 py-1 text-[12px] font-bold text-rose-800 hover:bg-rose-50 min-h-[44px] min-w-[44px]"
                >
                  চালডাল (Chaldal) <ExternalLink size={10} aria-hidden />
                </a>
                <a
                  href={storeSearchUrl("shwapno", liveSearchQuery || "shwapno")}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 rounded-lg border border-amber-300 bg-white px-2.5 py-1 text-[12px] font-bold text-amber-800 hover:bg-amber-50 min-h-[44px] min-w-[44px]"
                >
                  স্বপ্ন (Shwapno) <ExternalLink size={10} aria-hidden />
                </a>
                <a
                  href={TCB_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 rounded-lg border border-indigo-300 bg-white px-2.5 py-1 text-[12px] font-bold text-indigo-800 hover:bg-indigo-50 min-h-[44px] min-w-[44px]"
                >
                  টিসিবি দৈনিক দর <ExternalLink size={10} aria-hidden />
                </a>
              </div>
            </div>

            {/* Error Message */}
            {liveSearchError && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-[12.5px] text-red-800">
                <p className="font-semibold">{liveSearchError}</p>
                <p className="mt-1 text-[12px] text-red-700">
                  {T(
                    "সার্ভারে লাইভ এআই কী না থাকলেও উপরের দারাজ, রকমারি বা চালডাল বাটনে ক্লিক করে সরাসরি অফিসিয়াল পেজে দর দেখতে পারবেন।",
                    "Even without AI search quota, tap any store button above to inspect live offers directly on their site."
                  )}
                </p>
              </div>
            )}

            {/* Live Search Result Content */}
            {liveSearchResult && (
              <div className="space-y-3 rounded-xl border border-purple-200 bg-purple-50/30 p-3.5">
                <div className="whitespace-pre-wrap text-[13px] leading-relaxed text-slate-800">
                  {liveSearchResult.answer}
                </div>

                {liveSearchResult.sources.length > 0 && (
                  <div className="border-t border-purple-100 pt-2.5">
                    <span className="text-[12px] font-bold text-purple-900 block mb-1.5">
                      {T("যাচাইকৃত অনলাইন সোর্স:", "Verified Online Sources:")}
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {liveSearchResult.sources.map((s, idx) => (
                        <a
                          key={idx}
                          href={s.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-0.5 text-[12px] font-medium text-purple-900 hover:border-purple-300 min-h-[44px] min-w-[44px]"
                        >
                          <span className="max-w-[200px] truncate">{s.title || s.url}</span>
                          <ExternalLink size={10} aria-hidden />
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                <div className="border-t border-purple-100 pt-3 flex justify-between items-center">
                  <span className="text-[12px] text-slate-500">
                    {T("দারাজ/রকমারিতে দাম বদলাতে পারে। কেনার আগে মিলিয়ে নিন।", "Prices fluctuate on Daraz/Rokomari. Verify before purchase.")}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      add(liveSearchResult.query, 1, "piece");
                      setShowLiveSearchModal(false);
                      flash(T(`'${liveSearchResult.query}' ফর্দে যোগ হয়েছে!`, `Added '${liveSearchResult.query}' to list!`));
                    }}
                    className="inline-flex h-11 items-center gap-1 rounded-lg bg-emerald-700 px-3 text-[12px] font-bold text-white hover:bg-emerald-800 min-w-[44px]"
                  >
                    <Plus size={13} aria-hidden />
                    {T("ফর্দে যোগ করুন", "Add to Bazar List")}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Printable Memo Modal */}
      {showMemoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg space-y-4 rounded-2xl bg-white p-5 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="flex items-center gap-2 text-[16px] font-bold text-slate-900">
                <Printer size={18} className="text-emerald-700" aria-hidden />
                {T("বাজারের মেমো স্লিপ (প্রিন্ট বা কপি)", "Bazar Memo Slip (Print or Copy)")}
              </h3>
              <button
                type="button"
                onClick={() => setShowMemoModal(false)}
                className="rounded-lg p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-700 min-h-[44px] min-w-[44px]"
              >
                <X size={18} aria-hidden />
              </button>
            </div>

            <pre className="max-h-72 overflow-y-auto rounded-xl bg-slate-50 p-3 font-mono text-[12px] text-slate-800 whitespace-pre-wrap border border-slate-200">
              {memoText}
            </pre>

            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={copyMemoText}
                className="inline-flex min-h-[40px] items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 text-[12.5px] font-bold text-slate-800 hover:bg-slate-100 min-h-[44px] min-w-[44px]"
              >
                <Copy size={14} aria-hidden />
                {T("কপি করুন", "Copy")}
              </button>

              <button
                type="button"
                onClick={() => {
                  downloadText(`bazar-memo-${today}.txt`, memoText);
                  flash(T("মেমো টেক্সট ডাউনলোড হয়েছে!", "Memo downloaded!"));
                }}
                className="inline-flex min-h-[40px] items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 text-[12.5px] font-bold text-slate-800 hover:bg-slate-100 min-h-[44px] min-w-[44px]"
              >
                <Download size={14} aria-hidden />
                {T("টেক্সট ফাইল", "Download")}
              </button>

              <button
                type="button"
                onClick={() => {
                  if (typeof window !== "undefined") window.print();
                }}
                className="inline-flex min-h-[40px] items-center justify-center gap-1.5 rounded-xl bg-emerald-700 text-[12.5px] font-bold text-white hover:bg-emerald-800 min-h-[44px] min-w-[44px]"
              >
                <Printer size={14} aria-hidden />
                {T("প্রিন্ট স্লিপ", "Print Slip")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Personal Price Tracker & Month-on-Month Trends */}
      <div className="border-t border-slate-200 pt-4">
        <h3 className="text-[15px] font-bold text-slate-900">
          {T("আপনার দেওয়া দামের ইতিহাস ও মূল্যবৃদ্ধি ট্রেন্ড", "Your Historical Price Trends")}
        </h3>
        <p className="mt-0.5 text-[12.5px] text-slate-600">
          {T(
            "শুধু আপনার নিজের লেখা কেনা দাম থেকে প্রতি কেজি/লিটার/পিস হিসেবে। কোনো কাল্পনিক বাজারদর নয়।",
            "Calculated strictly from your own entered purchases, per kg/litre/piece. Zero invented rates."
          )}
        </p>

        {stats.length === 0 ? (
          <p className="mt-2 text-[13px] text-slate-500">
            {T("বাজার শেষ করে হিসাব সংরক্ষণ করলে এখানে দামের ট্রেন্ড জমা হবে।", "Finish a trip and your personal price history begins collecting here.")}
          </p>
        ) : (
          <div className="mt-2 overflow-x-auto">
            <table className="w-full min-w-[32rem] text-left text-[13px]" data-testid="bazar-stats">
              <thead className="text-[12px] uppercase tracking-wide text-slate-500 border-b border-slate-100">
                <tr>
                  <th className="py-2 pr-2">{T("পণ্য", "Item")}</th>
                  <th className="pr-2">{T("শেষ কেনা দর", "Last Paid")}</th>
                  <th className="pr-2">{T("৩০ দিনের গড়", "30-Day Avg")}</th>
                  <th>{T("আগের মাসের তুলনায়", "vs Last Month")}</th>
                </tr>
              </thead>
              <tbody>
                {stats.slice(0, 20).map((s) => {
                  const per = bn ? BASE_LABEL[s.unit].bn : BASE_LABEL[s.unit].en;
                  return (
                    <tr key={`${s.key}|${s.unit}`} className="border-b border-slate-100" data-stat={s.key}>
                      <td className="py-2.5 pr-2 font-bold text-slate-900">{s.name}</td>
                      <td className="pr-2 font-mono">
                        {taka(s.lastPoisha, bn)}/{per}
                      </td>
                      <td className="pr-2 font-mono">
                        {s.avg30Poisha !== null ? `${taka(s.avg30Poisha, bn)}/${per}` : "—"}
                      </td>
                      <td className="font-mono">
                        {s.changePct === null ? (
                          <span className="text-slate-500">—</span>
                        ) : (
                          <span
                            className={`inline-flex items-center gap-1 font-bold ${
                              s.changePct > 0
                                ? "text-red-700"
                                : s.changePct < 0
                                ? "text-emerald-700"
                                : "text-slate-600"
                            }`}
                          >
                            {s.changePct > 0 ? (
                              <TrendingUp size={13} aria-hidden />
                            ) : s.changePct < 0 ? (
                              <TrendingDown size={13} aria-hidden />
                            ) : null}
                            {s.changePct > 0 ? "+" : ""}
                            {bn ? bnNum(s.changePct) : s.changePct}%
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="text-[12.5px] text-slate-600">
            {T("সরকারি খুচরা বাজারদরের সঙ্গে মিলিয়ে দেখুন:", "Compare with official government rates:")}
          </span>
          <SourceTag
            confidence="official"
            label={T("টিসিবি: ঢাকার দৈনিক খুচরা বাজারদর", "TCB: Daily Dhaka Retail Prices")}
            url={TCB_URL}
            checked="2026-11-17"
          />
        </div>
      </div>
    </section>
  );
}
