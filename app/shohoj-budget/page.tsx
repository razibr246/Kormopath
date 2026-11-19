"use client";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import {
  Wallet, Mic, MicOff, Trash2, Pencil, Check, X, AlertTriangle, Download, Undo2,
  TrendingDown, TrendingUp, Repeat, Users, Copy, MessageSquareText, Info, Search, ExternalLink, Target, PiggyBank,
  Smartphone, ShoppingBasket, HandCoins, UtensilsCrossed, Gem, NotebookPen,
} from "lucide-react";
import { AppHeader } from "@/components/layout/AppHeader";
import { bnDigits } from "@/lib/contract";

const BN_MONTH_NAMES = ["জানুয়ারি", "ফেব্রুয়ারি", "মার্চ", "এপ্রিল", "মে", "জুন", "জুলাই", "আগস্ট", "সেপ্টেম্বর", "অক্টোবর", "নভেম্বর", "ডিসেম্বর"];
/** "2026-11" -> "নভেম্বর ২০২৬" (the value stays ISO; only the label is Bangla). */
const bnMonth = (m: string) => { const [y, mo] = m.split("-"); const name = BN_MONTH_NAMES[Number(mo) - 1]; return name ? `${name} ${bnDigits(y)}` : bnDigits(m); };
import { useActiveTabIntoView } from "@/components/layout/useActiveTabIntoView";
import { AppFooter } from "@/components/layout/AppFooter";
import { RentPocketsPanel } from "@/components/apps/RentPocketsPanel";
import { WalletsPanel } from "@/components/apps/shohoj/WalletsPanel";
import { DharLedger } from "@/components/apps/shohoj/DharLedger";
import { BazarList } from "@/components/apps/shohoj/BazarList";
import { MessLedger } from "@/components/apps/shohoj/MessLedger";
import { ZakatHub } from "@/components/apps/shohoj/ZakatHub";
import { playClick, playCoinSound } from "@/lib/sound";
import {
  CATEGORIES, categoryById, parseEntry, parseSms, summarizeMonth, budgetPace, splitBill, toCsv,
  sanitizeTransactions, migrateLegacy, unusualExpenses, toPoisha, parseAmount,
  categoryBudgetStatus, sanitizeCategoryBudgets, goalProgress, sanitizeGoals,
  CATEGORY_STYLES, calculateMfsCashoutFee, defaultMfsProvider, MFS_FEE_RATES,
  simulate30DayCashFlow, calculateBakiInstallments, suggestRecurring, type ScheduledFlow,
  type CategoryBudgets, type SavingsGoal, type MonthSummary,
  type Transaction, type TxType, type CategoryId, type Method, type MfsProvider,
} from "@/lib/budget";
import { usePersistentState, storageKey, readStored, removeStored, downloadText, todayLocal } from "@/lib/clientStore";

type SR = {
  start: () => void;
  stop: () => void;
  abort?: () => void;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string; confidence?: number }>> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  maxAlternatives: number;
};

interface Draft {
  editingId: string | null;
  type: TxType;
  amount: string; // text field so the user can correct it freely
  categoryId: CategoryId;
  method: Method;
  date: string;
  note: string;
  source: Transaction["source"];
  trxId?: string;
  heard?: string; // the exact transcript or text we parsed
  speechConfidence?: number;
  matched: string[];
  issues: string[];
}

interface Recurring {
  id: string;
  type: TxType;
  amountPoisha: number;
  categoryId: CategoryId;
  method: Method;
  note: string;
  dayOfMonth: number;
}

const METHODS: Method[] = ["Cash", "bKash", "Nagad", "Rocket", "Bank", "Card"];
const tk = (poisha: number) =>
  "৳" + (poisha / 100).toLocaleString("en-IN", { minimumFractionDigits: poisha % 100 ? 2 : 0, maximumFractionDigits: 2 });

const sanitizeBudget = (raw: unknown) => (typeof raw === "number" && Number.isInteger(raw) && raw >= 0 && raw < 1e12 ? raw : null);
const sanitizeRecurring = (raw: unknown): Recurring[] | null =>
  Array.isArray(raw)
    ? raw.filter((r): r is Recurring => r && typeof r.id === "string" && Number.isInteger(r.amountPoisha) && r.amountPoisha > 0 && (r.type === "income" || r.type === "expense") && Number.isInteger(r.dayOfMonth))
    : null;

const EXAMPLES = [
  "আজকে বাজারে ১২০০ টাকা খরচ করেছি",
  "রিকশা ভাড়া দিলাম ৮০ টাকা",
  "বিকাশে ইন্টারনেট বিল দিলাম দেড় হাজার টাকা",
  "ক্লায়েন্টের পেমেন্ট পেলাম ১৫০০০ টাকা",
];

// সংসার: the household money workspace. The ledger is the home view; each module has a hash so it can be linked.
const VIEWS = [
  { id: "ledger", bn: "হিসাব", icon: NotebookPen },
  { id: "wallets", bn: "হাতের টাকা ও ওয়ালেট", icon: Wallet },
  { id: "dhar", bn: "দেনা-পাওনা", icon: HandCoins },
  { id: "bazar", bn: "বাজারের তালিকা", icon: ShoppingBasket },
  { id: "mess", bn: "মেস ও ফ্ল্যাট", icon: UtensilsCrossed },
  { id: "zakat", bn: "যাকাত ও সঞ্চয়", icon: Gem },
] as const;
type View = (typeof VIEWS)[number]["id"];
const viewFromHash = (h: string): View => (VIEWS.some((v) => v.id === h.replace(/^#/, "")) ? (h.replace(/^#/, "") as View) : "ledger");

export default function ShohojBudgetPage() {
  const [txs, setTxs, txState] = usePersistentState<Transaction[]>(storageKey("shohoj", "transactions.v2"), [], (r) => sanitizeTransactions(r));
  const [budgetPoisha, setBudgetPoisha] = usePersistentState<number>(storageKey("shohoj", "monthlyBudget"), toPoisha(20000), sanitizeBudget);
  const [recurring, setRecurring] = usePersistentState<Recurring[]>(storageKey("shohoj", "recurring"), [], sanitizeRecurring);
  const [catBudgets, setCatBudgets] = usePersistentState<CategoryBudgets>(storageKey("shohoj", "categoryBudgets"), {}, sanitizeCategoryBudgets);
  const [goals, setGoals] = usePersistentState<SavingsGoal[]>(storageKey("shohoj", "goals"), [], sanitizeGoals);

  const [today, setToday] = useState("2026-01-01");
  const [month, setMonth] = useState("2026-01");
  const [input, setInput] = useState("");
  const [sms, setSms] = useState("");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [view, setView] = useState<View>("ledger");
  const tabBar = useActiveTabIntoView<HTMLDivElement>(view); // keep the open section's tab visible on phones
  useEffect(() => {
    const sync = () => setView(viewFromHash(window.location.hash));
    sync();
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);
  const openView = (v: View) => {
    window.history.replaceState(null, "", v === "ledger" ? window.location.pathname : `#${v}`);
    setView(v);
    window.scrollTo({ top: 0 });
  };
  const [lastDeleted, setLastDeleted] = useState<Transaction | null>(null);
  const [voiceLang, setVoiceLang] = useState<"bn-BD" | "en-US">("bn-BD");
  const [recording, setRecording] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [voiceSupported, setVoiceSupported] = useState<boolean | null>(null);
  const [showHistory, setShowHistory] = useState<string | null>(null);
  const [splitTotal, setSplitTotal] = useState(1200);
  const [splitPeople, setSplitPeople] = useState(4);
  const [copied, setCopied] = useState(false);
  const [migratedCount, setMigratedCount] = useState(0);
  const [productQuery, setProductQuery] = useState("");
  const [productSearch, setProductSearch] = useState<{ answer: string; sources: { title: string; url: string }[] } | null>(null);
  const [productSearchError, setProductSearchError] = useState("");
  const [productSearching, setProductSearching] = useState(false);
  const recRef = useRef<SR | null>(null);

  // Dates come from the device clock after mount, so server and client renders match.
  useEffect(() => {
    const t = todayLocal();
    setToday(t);
    setMonth(t.slice(0, 7));
  }, []);

  // One-time migration of the old v1 key. The old data is kept until the user removes it.
  useEffect(() => {
    if (!txState.ready) return;
    const legacy = readStored("shohoj_expenses", (r) => r);
    if (!legacy || readStored(storageKey("shohoj", "legacyMigrated"), (r) => r) === true) return;
    const migrated = migrateLegacy(legacy, todayLocal());
    if (migrated.length) {
      setTxs((prev) => [...migrated.filter((m) => !prev.some((p) => p.id === m.id)), ...prev]);
      setMigratedCount(migrated.length);
    }
    try {
      window.localStorage.setItem(storageKey("shohoj", "legacyMigrated"), "true");
    } catch {
      /* ignore */
    }
  }, [txState.ready, setTxs]);

  useEffect(() => {
    const W = window as unknown as { SpeechRecognition?: new () => SR; webkitSpeechRecognition?: new () => SR };
    setVoiceSupported(Boolean(W.SpeechRecognition ?? W.webkitSpeechRecognition));
    return () => {
      try {
        recRef.current?.abort?.();
      } catch {
        /* ignore */
      }
    };
  }, []);

  const openDraftFromText = (text: string, source: Draft["source"], speechConfidence?: number) => {
    if (!text.trim()) return;
    const p = parseEntry(text);
    setDraft({
      editingId: null,
      type: p.type,
      amount: p.amount !== null ? String(p.amount) : "",
      categoryId: p.categoryId,
      method: p.method,
      date: today,
      note: text.trim().slice(0, 200),
      source,
      heard: text.trim(),
      speechConfidence,
      matched: p.matched,
      issues: [
        ...p.issues,
        ...(speechConfidence !== undefined && speechConfidence > 0 && speechConfidence < 0.7
          ? ["ভয়েস শনাক্তকরণ নিশ্চিত নয় — শোনা লেখাটি মিলিয়ে দেখুন।"]
          : []),
      ],
    });
  };

  const openDraftFromBazar = (e: { amountPoisha: number; note: string; date: string }) => {
    setDraft({
      editingId: null, type: "expense", amount: String(e.amountPoisha / 100), categoryId: "grocery", method: "Cash",
      date: e.date || today, note: e.note.slice(0, 200), source: "manual", matched: [], issues: [],
    });
    openView("ledger");
  };

  const openDraftFromSms = (text: string) => {
    if (!text.trim()) return;
    const p = parseSms(text);
    setDraft({
      editingId: null,
      type: p.type,
      amount: p.amount !== null ? String(p.amount) : "",
      categoryId: p.categoryId,
      method: p.method,
      date: today,
      note: (p.counterparty ? `${p.counterparty} · ` : "") + "এসএমএস থেকে",
      source: "sms",
      trxId: p.trxId ?? undefined,
      heard: text.trim(),
      matched: p.matched,
      issues: p.issues,
    });
  };

  const toggleVoice = () => {
    setVoiceError(null);
    if (recording) {
      recRef.current?.stop();
      return;
    }
    const W = window as unknown as { SpeechRecognition?: new () => SR; webkitSpeechRecognition?: new () => SR };
    const C = W.SpeechRecognition ?? W.webkitSpeechRecognition;
    if (!C) {
      setVoiceError("এই ব্রাউজারে ভয়েস ইনপুট নেই। Chrome বা Edge ব্যবহার করুন, অথবা লিখে দিন।");
      return;
    }
    const r = new C();
    r.lang = voiceLang;
    r.interimResults = false;
    r.continuous = false;
    r.maxAlternatives = 1;
    r.onresult = (e) => {
      const alt = e.results[0]?.[0];
      if (!alt) return;
      setInput(alt.transcript);
      openDraftFromText(alt.transcript, "voice", alt.confidence);
    };
    r.onerror = (e) => {
      const msg: Record<string, string> = {
        "not-allowed": "মাইক্রোফোনের অনুমতি দেওয়া হয়নি। ব্রাউজার সেটিংস থেকে অনুমতি দিন।",
        "no-speech": "কোনো কথা শোনা যায়নি। আবার চেষ্টা করুন।",
        network: "ভয়েস সার্ভিসে সংযোগ হয়নি (ইন্টারনেট দরকার)। লিখে এন্ট্রি দিন।",
        "language-not-supported": "এই ব্রাউজারে নির্বাচিত ভাষা সমর্থিত নয়।",
      };
      setVoiceError(msg[e.error] ?? `ভয়েস ত্রুটি: ${e.error}`);
    };
    r.onend = () => setRecording(false);
    recRef.current = r;
    try {
      r.start();
      setRecording(true);
    } catch {
      setRecording(false);
    }
  };

  const draftAmountPoisha = draft ? toPoisha(parseFloat(draft.amount.replace(/,/g, "")) || 0) : 0;
  const draftValid = !!draft && draftAmountPoisha > 0 && draftAmountPoisha < 1e12 && /^\d{4}-\d{2}-\d{2}$/.test(draft.date);

  const confirmDraft = () => {
    if (!draft || !draftValid) return;
    const now = new Date().toISOString();
    if (draft.editingId) {
      setTxs((prev) =>
        prev.map((t) => {
          if (t.id !== draft.editingId) return t;
          const changes: string[] = [];
          if (t.amountPoisha !== draftAmountPoisha) changes.push(`পরিমাণ ${tk(t.amountPoisha)} → ${tk(draftAmountPoisha)}`);
          if (t.categoryId !== draft.categoryId) changes.push(`খাত ${categoryById(t.categoryId).bn} → ${categoryById(draft.categoryId).bn}`);
          if (t.type !== draft.type) changes.push(`ধরন ${t.type} → ${draft.type}`);
          if (t.date !== draft.date) changes.push(`তারিখ ${t.date} → ${draft.date}`);
          if (t.method !== draft.method) changes.push(`মাধ্যম ${t.method} → ${draft.method}`);
          if (t.note !== draft.note) changes.push("নোট পরিবর্তিত");
          return {
            ...t,
            type: draft.type, amountPoisha: draftAmountPoisha, categoryId: draft.categoryId, method: draft.method,
            date: draft.date, note: draft.note.slice(0, 300), updatedAt: now,
            history: [...t.history, { at: now, change: changes.join("; ") || "কোনো পরিবর্তন নেই" }].slice(-20),
          };
        }),
      );
    } else {
      const t: Transaction = {
        id: `tx-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        type: draft.type, amountPoisha: draftAmountPoisha, categoryId: draft.categoryId, method: draft.method,
        note: draft.note.slice(0, 300), date: draft.date, source: draft.source, trxId: draft.trxId,
        createdAt: now, updatedAt: now,
        history: [{ at: now, change: `যোগ করা হয়েছে (${draft.source}${draft.heard ? `: "${draft.heard.slice(0, 80)}"` : ""})` }],
      };
      setTxs((prev) => [t, ...prev]);
      if (draft.date.slice(0, 7) !== month) setMonth(draft.date.slice(0, 7));
    }
    setDraft(null);
    setInput("");
    setSms("");
    playCoinSound();
  };

  const editTx = (t: Transaction) => {
    setDraft({
      editingId: t.id, type: t.type, amount: String(t.amountPoisha / 100), categoryId: t.categoryId, method: t.method,
      date: t.date, note: t.note, source: t.source, trxId: t.trxId, matched: [], issues: [],
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const deleteTx = (t: Transaction) => {
    setTxs((prev) => prev.filter((x) => x.id !== t.id));
    setLastDeleted(t);
  };

  const handleQuickAmount = (val: number) => {
    playClick();
    if (draft) {
      const cur = parseFloat(draft.amount.replace(/,/g, "")) || 0;
      const next = Math.round((cur + val) * 100) / 100;
      setDraft({ ...draft, amount: String(next) });
    } else {
      setDraft({
        editingId: null,
        type: "expense",
        amount: String(val),
        categoryId: "other",
        method: "Cash",
        date: today,
        note: "দ্রুত এন্ট্রি",
        source: "manual",
        matched: [],
        issues: ["খাত নিশ্চিত নয় — সঠিক খাত বেছে নিন।"],
      });
    }
  };

  const duplicateTrx = draft?.trxId ? txs.find((t) => t.trxId === draft.trxId && t.id !== draft.editingId) : undefined;

  const summary = useMemo(() => summarizeMonth(txs, month), [txs, month]);
  const isCurrentMonth = month === today.slice(0, 7);
  const pace = useMemo(() => budgetPace(summary.expensePoisha, budgetPoisha, isCurrentMonth ? today : `${month}-${String(new Date(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0).getDate()).padStart(2, "0")}`), [summary.expensePoisha, budgetPoisha, isCurrentMonth, today, month]);
  const monthTxs = useMemo(() => txs.filter((t) => t.date.startsWith(month)).sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt)), [txs, month]);
  const unusual = useMemo(() => new Set(unusualExpenses(txs)), [txs]);
  const months = useMemo(() => {
    const set = new Set(txs.map((t) => t.date.slice(0, 7)));
    set.add(today.slice(0, 7));
    return [...set].sort().reverse();
  }, [txs, today]);

  const recurringDueThisMonth = recurring.filter(
    (r) => !txs.some((t) => t.source === "recurring" && t.note.includes(`[R:${r.id}]`) && t.date.startsWith(month)),
  );

  const addRecurringForMonth = () => {
    const now = new Date().toISOString();
    const [y, m] = month.split("-").map(Number);
    const dim = new Date(y, m, 0).getDate();
    const created: Transaction[] = recurringDueThisMonth.map((r) => ({
      id: `tx-${Date.now()}-${r.id}`,
      type: r.type, amountPoisha: r.amountPoisha, categoryId: r.categoryId, method: r.method,
      note: `${r.note} [R:${r.id}]`, date: `${month}-${String(Math.min(r.dayOfMonth, dim)).padStart(2, "0")}`,
      source: "recurring", createdAt: now, updatedAt: now,
      history: [{ at: now, change: "নিয়মিত লেনদেন থেকে যোগ করা হয়েছে (ব্যবহারকারী নিশ্চিত করেছেন)" }],
    }));
    setTxs((prev) => [...created, ...prev]);
  };

  const searchProduct = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const query = productQuery.trim();
    if (query.length < 2 || query.length > 160 || productSearching) return;
    setProductSearching(true);
    setProductSearchError("");
    setProductSearch(null);
    try {
      const response = await fetch("/api/product-search", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ query }),
      });
      const data = await response.json().catch(() => ({})) as { answer?: string; sources?: { title: string; url: string }[]; error?: string };
      if (!response.ok || typeof data.answer !== "string") throw new Error(data.error || "পণ্যের ফলাফল পাওয়া যায়নি।");
      setProductSearch({ answer: data.answer, sources: Array.isArray(data.sources) ? data.sources.filter((source) => source && typeof source.title === "string" && typeof source.url === "string" && /^https?:\/\//.test(source.url)).slice(0, 8) : [] });
    } catch (error) {
      setProductSearchError(error instanceof Error ? error.message : "খোঁজার সময় সমস্যা হয়েছে। আবার চেষ্টা করুন।");
    } finally {
      setProductSearching(false);
    }
  };

  const shares = splitBill(splitTotal, splitPeople);
  const usedPct = Math.min(100, pace.usedPct);

  return (
    <div className="min-h-screen bg-[#f7faf8] text-slate-900 antialiased">
      <AppHeader taglineEn="Voice-first household budget"
        appId="shohoj"
        href="/shohoj-budget"
        name="Shohoj Budget"
        taglineBn="সংসারের হিসাব · বলুন, যাচাই করুন, সংরক্ষণ করুন"
        icon={<Wallet size={22} />}
        accent="from-emerald-500 to-teal-700"
      />

      <nav aria-label="সংসারের অংশ" className="border-b border-slate-200 bg-[#f7faf8]/95" data-testid="shongshar-nav">
        <div ref={tabBar} className="kp-tabbar mx-auto flex max-w-7xl gap-2 overflow-x-auto px-4 py-2 sm:px-6 [scrollbar-width:none]">
          {VIEWS.map((v) => (
            <button key={v.id} type="button" onClick={() => openView(v.id)} aria-current={view === v.id ? "page" : undefined} data-view={v.id}
              className={`inline-flex min-h-[44px] shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-[14px] font-semibold transition-colors ${view === v.id ? "border-emerald-700 bg-emerald-700 text-white" : "border-slate-200 bg-white text-slate-700 hover:border-emerald-400"} min-w-[44px]`}>
              <v.icon size={16} aria-hidden /> {v.bn}
            </button>
          ))}
        </div>
      </nav>

      <main id="main" className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 motion-safe:animate-rise-in">
        {view === "ledger" ? (<>
        <h1 className="sr-only">সহজ বাজেট · এই মাসের সংসারের হিসাব</h1>
        {migratedCount > 0 && (
          <div role="status" className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-sky-200 bg-sky-50 p-3 text-[13px] text-sky-900">
            <span>
              <Info size={15} className="mr-1 inline" aria-hidden />
              পুরনো ভার্সনের {migratedCount}টি এন্ট্রি নতুন খাতায় আনা হয়েছে। আসল তারিখ জানা না থাকায় আজকের তারিখ বসানো হয়েছে — প্রয়োজনে এডিট করুন।
            </span>
            <button onClick={() => { removeStored("shohoj_expenses"); setMigratedCount(0); }} className="rounded-lg border border-sky-300 bg-white px-2.5 py-1 font-semibold hover:bg-sky-100 min-h-[44px] min-w-[44px]">
              পুরনো কপি মুছুন
            </button>
          </div>
        )}
        {txState.saveFailed && (
          <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-[13px] text-red-800">
            এই ব্রাউজারে সংরক্ষণ করা যাচ্ছে না (প্রাইভেট মোড বা স্টোরেজ বন্ধ)। পেজ বন্ধ করলে ডেটা হারাবে — CSV ডাউনলোড করে রাখুন।
          </div>
        )}

        {/* Month overview */}
        <section aria-label="মাসের সারসংক্ষেপ" className="grid gap-4 md:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 md:col-span-2">
            <div className="flex items-center justify-between gap-2">
              <label className="text-[12px] font-bold uppercase tracking-wide text-slate-500" htmlFor="month">মাস</label>
              <select id="month" value={month} onChange={(e) => setMonth(e.target.value)} className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[13px] font-semibold min-h-[44px]">
                {months.map((m) => <option key={m} value={m}>{bnMonth(m)}</option>)}
              </select>
            </div>
            <div className="mt-3 flex items-end justify-between gap-3">
              <div>
                <span className="block text-[12px] text-slate-500">এই মাসের খরচ</span>
                <strong className="text-[30px] font-extrabold tracking-tight text-slate-900">{tk(summary.expensePoisha)}</strong>
                <span className="ml-1 text-[13px] text-slate-500">/ বাজেট {tk(budgetPoisha)}</span>
              </div>
              <label className="text-right text-[12px] text-slate-500">
                মাসিক বাজেট (৳)
                <input
                  type="number" min={0} step={500} inputMode="numeric"
                  value={budgetPoisha / 100}
                  onChange={(e) => setBudgetPoisha(toPoisha(Math.max(0, Number(e.target.value) || 0)))}
                  className="mt-0.5 block w-28 rounded-lg border border-slate-200 px-2 py-1 text-right text-[14px] font-bold text-slate-800 min-h-[44px]"
                />
              </label>
            </div>
            <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-valuenow={usedPct} aria-valuemin={0} aria-valuemax={100} aria-label="বাজেট ব্যবহার">
              <div className={`h-full rounded-full ${pace.usedPct >= 100 ? "bg-red-500" : pace.usedPct >= 80 ? "bg-amber-500" : "bg-emerald-500"}`} style={{ width: `${usedPct}%` }} />
            </div>
            <p className="mt-1.5 text-[12px] text-slate-600">
              বাজেটের {pace.usedPct}% ব্যবহৃত।{" "}
              {pace.overBudget ? <strong className="text-red-700">বাজেট {tk(-pace.remainingPoisha)} ছাড়িয়ে গেছে।</strong> : pace.usedPct >= 80 ? <strong className="text-amber-700">বাজেটের ৮০% পার হয়েছে।</strong> : null}
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <span className="block text-[12px] text-slate-500">{isCurrentMonth ? "আজ থেকে প্রতিদিন খরচ করা যাবে" : "মাস শেষে অবশিষ্ট"}</span>
            <strong className="text-[24px] font-extrabold text-emerald-700">{isCurrentMonth ? tk(pace.safePerDayPoisha) : tk(Math.max(0, pace.remainingPoisha))}</strong>
            {isCurrentMonth && <span className="block text-[12px] text-slate-500">অবশিষ্ট বাজেট ÷ বাকি {bnDigits(String(pace.daysLeftIncludingToday))} দিন (আজসহ)</span>}
            {isCurrentMonth && summary.expensePoisha > 0 && (
              <p className="mt-2 text-[12px] text-slate-600">
                এই গতিতে চললে মাস শেষে মোট খরচ প্রায় <strong>{tk(pace.projectedPoisha)}</strong> হতে পারে। <span className="text-slate-500">(সরল অনুমান, নিশ্চয়তা নয়)</span>
              </p>
            )}
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="flex items-center justify-between text-[12px]">
              <span className="inline-flex items-center gap-1 text-slate-500"><TrendingUp size={14} aria-hidden /> আয়</span>
              <strong className="text-emerald-700">{tk(summary.incomePoisha)}</strong>
            </div>
            <div className="mt-1 flex items-center justify-between text-[12px]">
              <span className="inline-flex items-center gap-1 text-slate-500"><TrendingDown size={14} aria-hidden /> খরচ</span>
              <strong className="text-slate-800">{tk(summary.expensePoisha)}</strong>
            </div>
            <div className="mt-2 flex items-center justify-between border-t border-slate-100 pt-2 text-[13px]">
              <span className="font-semibold text-slate-600">ব্যালান্স</span>
              <strong className={summary.netPoisha >= 0 ? "text-emerald-700" : "text-red-700"}>{summary.netPoisha < 0 ? "−" : ""}{tk(Math.abs(summary.netPoisha))}</strong>
            </div>
            <button
              onClick={() => downloadText(`shohoj-budget-${month}.csv`, toCsv(monthTxs))}
              disabled={!monthTxs.length}
              className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-slate-200 px-2 py-1.5 text-[12px] font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40 min-h-[44px]"
            >
              <Download size={14} aria-hidden /> এই মাসের CSV
            </button>
          </div>
        </section>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
          <div className="space-y-6">
            {/* Entry */}
            <section aria-labelledby="entry-h" className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 id="entry-h" className="text-[18px] font-bold">বলুন বা লিখুন</h2>
                <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-0.5 text-[12px]" role="group" aria-label="ভয়েসের ভাষা">
                  {(["bn-BD", "en-US"] as const).map((l) => (
                    <button key={l} onClick={() => setVoiceLang(l)} aria-pressed={voiceLang === l} className={`rounded-md px-2 py-1 font-semibold ${voiceLang === l ? "bg-white shadow-xs" : "text-slate-500"} min-h-[44px] min-w-[44px]`}>
                      {l === "bn-BD" ? "বাংলা" : "English"}
                    </button>
                  ))}
                </div>
              </div>
              <form
                className="flex flex-col gap-2 sm:flex-row"
                onSubmit={(e) => {
                  e.preventDefault();
                  openDraftFromText(input, "text");
                }}
              >
                <label htmlFor="entry" className="sr-only">লেনদেন লিখুন</label>
                <input
                  id="entry"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="যেমন: আজকে বাজারে ১২০০ টাকা খরচ করেছি"
                  className="flex-1 rounded-xl border border-slate-200 px-4 py-3 text-[15px] outline-none focus:border-emerald-600 min-h-[44px]"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={toggleVoice}
                    disabled={voiceSupported === false}
                    aria-pressed={recording}
                    className={`inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl px-4 py-3 text-[14px] font-bold text-white sm:flex-none ${recording ? "bg-red-600" : "bg-emerald-600 hover:bg-emerald-700"} disabled:bg-slate-300 min-h-[44px] min-w-[44px]`}
                  >
                    {recording ? <MicOff size={18} aria-hidden /> : <Mic size={18} aria-hidden />}
                    {recording ? "থামান" : "ভয়েস"}
                  </button>
                  <button type="submit" className="flex-1 rounded-xl bg-slate-900 px-4 py-3 text-[14px] font-bold text-white hover:bg-slate-800 sm:flex-none min-h-[44px] min-w-[44px]">
                    বুঝে নিন
                  </button>
                </div>
              </form>
              {recording && <p role="status" className="text-[13px] font-semibold text-red-700">শুনছি… কথা শেষ হলে থামবে।</p>}
              {voiceError && <p role="alert" className="text-[13px] text-red-700">{voiceError}</p>}
              <p className="text-[12px] leading-relaxed text-slate-500">
                ভয়েস ব্রাউজারের স্পিচ সার্ভিস ব্যবহার করে (Chrome-এ অডিও Google-এর সার্ভারে প্রক্রিয়া হয়)। আমরা অডিও সংরক্ষণ করি না। যা বুঝেছি তা আগে দেখাব — আপনি নিশ্চিত না করলে কিছুই সংরক্ষণ হবে না।
              </p>
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[12px] font-bold text-slate-500">দ্রুত যোগ:</span>
                {[
                  { bn: "+৳৫০", val: 50 },
                  { bn: "+৳১০০", val: 100 },
                  { bn: "+৳৫০০", val: 500 },
                  { bn: "+৳১০০০", val: 1000 },
                ].map((q) => (
                  <button
                    key={q.val}
                    type="button"
                    onClick={() => handleQuickAmount(q.val)}
                    className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[12px] font-semibold text-slate-700 shadow-sm hover:border-emerald-500 hover:bg-emerald-50 min-h-[44px] min-w-[44px]"
                  >
                    {q.bn}
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {EXAMPLES.map((ex) => (
                  <button key={ex} onClick={() => { setInput(ex); openDraftFromText(ex, "text"); playClick(); }} className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-[12px] text-slate-700 hover:border-emerald-500 min-h-[44px] min-w-[44px]">
                    {ex}
                  </button>
                ))}
              </div>
            </section>

            {/* Confirmation card */}
            {draft && (
              <section aria-labelledby="confirm-h" className="space-y-3 rounded-2xl border-2 border-emerald-500 bg-emerald-50/40 p-5 shadow-sm">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h2 id="confirm-h" className="text-[17px] font-bold">{draft.editingId ? "লেনদেন সংশোধন" : "ঠিক আছে কি না দেখে নিশ্চিত করুন"}</h2>
                    {draft.heard && (
                      <p className="mt-0.5 text-[12px] text-slate-600">
                        {draft.source === "voice" ? "শুনেছি" : draft.source === "sms" ? "এসএমএস" : "লেখা"}: <q className="font-semibold text-slate-800">{draft.heard}</q>
                      </p>
                    )}
                  </div>
                  <button onClick={() => setDraft(null)} aria-label="বাতিল" className="rounded-lg p-1 text-slate-500 hover:bg-white min-h-[44px] min-w-[44px]"><X size={18} /></button>
                </div>
                {draft.issues.length > 0 && (
                  <ul className="space-y-1 rounded-lg border border-amber-300 bg-amber-50 p-2.5 text-[12px] text-amber-900">
                    {draft.issues.map((i) => <li key={i} className="flex gap-1.5"><AlertTriangle size={14} className="mt-0.5 shrink-0" aria-hidden />{i}</li>)}
                  </ul>
                )}
                {duplicateTrx && (
                  <p className="rounded-lg border border-red-300 bg-red-50 p-2 text-[12px] text-red-800">
                    এই TrxID ({draft.trxId}) দিয়ে {duplicateTrx.date} তারিখে আগেই একটি এন্ট্রি আছে। দুবার যোগ হচ্ছে কি না দেখুন।
                  </p>
                )}
                <div className="grid gap-3 sm:grid-cols-2">
                  <fieldset className="sm:col-span-2">
                    <legend className="mb-1 text-[12px] font-bold text-slate-600">ধরন</legend>
                    <div className="flex gap-2">
                      {(["expense", "income"] as const).map((t) => (
                        <button
                          key={t}
                          type="button"
                          aria-pressed={draft.type === t}
                          onClick={() => setDraft({ ...draft, type: t, categoryId: categoryById(draft.categoryId).type === t ? draft.categoryId : t === "income" ? "other_income" : "other" })}
                          className={`flex-1 rounded-lg border px-3 py-2 text-[13px] font-bold ${draft.type === t ? (t === "expense" ? "border-red-400 bg-red-50 text-red-800" : "border-emerald-500 bg-emerald-100 text-emerald-800") : "border-slate-200 bg-white text-slate-600"} min-h-[44px] min-w-[44px]`}
                        >
                          {t === "expense" ? "খরচ" : "আয়"}
                        </button>
                      ))}
                    </div>
                  </fieldset>
                  <div className="space-y-1">
                    <label className="text-[12px] font-bold text-slate-600">
                      পরিমাণ (৳)
                      <input
                        autoFocus={!draft.amount}
                        inputMode="decimal"
                        value={draft.amount}
                        onChange={(e) => setDraft({ ...draft, amount: e.target.value.replace(/[^0-9.,০-৯]/g, "").replace(/[০-৯]/g, (d) => String("০১২৩৪৫৬৭৮৯".indexOf(d))) })}
                        aria-invalid={draftAmountPoisha <= 0}
                        className={`mt-1 block w-full rounded-lg border px-3 py-2 text-[18px] font-extrabold ${draftAmountPoisha > 0 ? "border-slate-200" : "border-red-400 bg-red-50"} min-h-[44px]`}
                      />
                    </label>
                    <div className="flex flex-wrap gap-1">
                      {[50, 100, 500, 1000].map((val) => (
                        <button
                          key={val}
                          type="button"
                          onClick={() => {
                            playClick();
                            const cur = parseFloat(draft.amount.replace(/,/g, "")) || 0;
                            const next = Math.round((cur + val) * 100) / 100;
                            setDraft({ ...draft, amount: String(next) });
                          }}
                          className="rounded-md border border-slate-200 bg-white px-2 py-0.5 text-[12px] font-bold text-slate-700 hover:border-emerald-500 hover:bg-emerald-50 min-h-[44px] min-w-[44px]"
                        >
                          +৳{val}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => {
                          playClick();
                          setDraft({ ...draft, amount: "" });
                        }}
                        className="rounded-md border border-slate-200 bg-white px-2 py-0.5 text-[12px] font-bold text-slate-500 hover:bg-slate-100 min-h-[44px] min-w-[44px]"
                        title="পরিমাণ মুছুন"
                      >
                        C
                      </button>
                    </div>
                  </div>
                  <label className="text-[12px] font-bold text-slate-600">
                    তারিখ
                    <input type="date" value={draft.date} max="2100-12-31" onChange={(e) => setDraft({ ...draft, date: e.target.value })} className="mt-1 block w-full rounded-lg border border-slate-200 px-3 py-2 text-[14px] min-h-[44px]" />
                  </label>
                  <label className="text-[12px] font-bold text-slate-600">
                    খাত
                    <select value={draft.categoryId} onChange={(e) => setDraft({ ...draft, categoryId: e.target.value as CategoryId })} className="mt-1 block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-[14px] min-h-[44px]">
                      {CATEGORIES.filter((c) => c.type === draft.type).map((c) => <option key={c.id} value={c.id}>{c.bn} ({c.en})</option>)}
                    </select>
                  </label>
                  <label className="text-[12px] font-bold text-slate-600">
                    মাধ্যম
                    <select value={draft.method} onChange={(e) => setDraft({ ...draft, method: e.target.value as Method })} className="mt-1 block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-[14px] min-h-[44px]">
                      {METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </label>
                  <label className="text-[12px] font-bold text-slate-600 sm:col-span-2">
                    নোট
                    <input value={draft.note} maxLength={300} onChange={(e) => setDraft({ ...draft, note: e.target.value })} className="mt-1 block w-full rounded-lg border border-slate-200 px-3 py-2 text-[14px] min-h-[44px]" />
                  </label>

                  {/* MFS Cash-out fee auto-calc helper */}
                  {draft.type === "expense" && (draft.method === "bKash" || draft.method === "Nagad" || draft.method === "Rocket") && (() => {
                    const defaultProvider = defaultMfsProvider(draft.method);
                    if (!defaultProvider) return null;
                    const numAmount = parseFloat(draft.amount.replace(/,/g, "")) || 0;
                    if (numAmount <= 0) return null;
                    const feeResult = calculateMfsCashoutFee(numAmount, defaultProvider);
                    const feeTaka = feeResult.feePoisha / 100;
                    const totalTaka = feeResult.totalWithFeePoisha / 100;
                    const config = MFS_FEE_RATES[defaultProvider];

                    const handleAddFee = () => {
                      playClick();
                      const noteWithoutFee = draft.note.replace(/\s*\[ক্যাশআউট চার্জ: ৳[0-9.]+\]/g, "");
                      setDraft({
                        ...draft,
                        amount: totalTaka.toFixed(2),
                        note: `${noteWithoutFee} [ক্যাশআউট চার্জ: ৳${feeTaka.toFixed(2)}]`.trim(),
                      });
                    };

                    return (
                      <div className="rounded-xl border border-sky-200 bg-sky-50/70 p-3 sm:col-span-2">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="text-[12px]">
                            <span className="font-bold text-sky-900">{config.nameBn} ক্যাশআউট চার্জ:</span>
                            <span className="ml-1.5 font-mono font-bold text-sky-700">৳{feeTaka.toFixed(2)}</span>
                            <span className="ml-2 text-slate-500">(মোট লাগবে ৳{totalTaka.toFixed(2)})</span>
                          </div>
                          <button
                            type="button"
                            onClick={handleAddFee}
                            className="rounded-lg bg-sky-600 px-2.5 py-1 text-[12px] font-bold text-white hover:bg-sky-700 min-h-[44px] min-w-[44px]"
                          >
                            ফি যোগ করুন (+৳{feeTaka.toFixed(2)})
                          </button>
                        </div>
                      </div>
                    );
                  })()}
                </div>
                {draft.matched.length > 0 && (
                  <p className="text-[12px] text-slate-500">যে শব্দ দেখে অনুমান করেছি: {draft.matched.map((m) => `"${m}"`).join(", ")}</p>
                )}
                <div className="flex gap-2">
                  <button onClick={confirmDraft} disabled={!draftValid} className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-3 text-[14px] font-bold text-white hover:bg-emerald-700 disabled:bg-slate-300 min-h-[44px] min-w-[44px]">
                    <Check size={18} aria-hidden /> {draft.editingId ? "সংশোধন সংরক্ষণ" : `নিশ্চিত করুন${draftAmountPoisha > 0 ? ` · ${tk(draftAmountPoisha)}` : ""}`}
                  </button>
                  <button onClick={() => setDraft(null)} className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-[14px] font-bold text-slate-700 min-h-[44px] min-w-[44px]">বাতিল</button>
                </div>
              </section>
            )}

            {/* Ledger */}
            <section aria-labelledby="ledger-h" className="rounded-2xl border border-slate-200 bg-white p-5">
              <div className="mb-3 flex items-center justify-between border-b border-slate-100 pb-3">
                <h2 id="ledger-h" className="text-[17px] font-bold">লেনদেন — {bnMonth(month)} ({bnDigits(String(monthTxs.length))}টি)</h2>
              </div>
              {lastDeleted && (
                <div role="status" className="mb-3 flex items-center justify-between rounded-lg bg-slate-900 px-3 py-2 text-[13px] text-white">
                  <span>মুছে ফেলা হয়েছে: {categoryById(lastDeleted.categoryId).bn} {tk(lastDeleted.amountPoisha)}</span>
                  <button onClick={() => { setTxs((p) => [lastDeleted, ...p]); setLastDeleted(null); }} className="inline-flex items-center gap-1 font-bold text-emerald-300 min-h-[44px] min-w-[44px]"><Undo2 size={14} aria-hidden /> ফিরিয়ে আনুন</button>
                </div>
              )}
              {!txState.ready ? (
                <p className="py-6 text-center text-[13px] text-slate-500">লোড হচ্ছে…</p>
              ) : monthTxs.length === 0 ? (
                <div className="py-8 text-center text-[13px] text-slate-500">
                  <p className="font-semibold text-slate-700">এই মাসে এখনো কোনো লেনদেন নেই।</p>
                  <p className="mt-1">উপরে বলুন বা লিখুন, অথবা নিচে বিকাশ/নগদ/ব্যাংকের এসএমএস পেস্ট করুন।</p>
                  {txs.length === 0 && (
                    <button onClick={() => setTxs(exampleMonth(today))} className="mt-4 inline-flex min-h-[44px] flex-col items-center justify-center rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-1 text-[13px] font-bold leading-tight text-emerald-800 hover:bg-emerald-100 min-w-[44px]" data-testid="load-example">
                      উদাহরণ দেখুন <span lang="en" className="text-[12px] font-semibold">Try an example</span>
                    </button>
                  )}
                </div>
              ) : (
                <>
                {txs.some((t) => t.id.startsWith("ex-")) && (
                  <p className="mb-2 flex flex-wrap items-center justify-between gap-2 rounded-lg bg-amber-50 px-3 py-2 text-[12px] text-amber-900">
                    <span>“উদাহরণ” লেখা লেনদেনগুলো নমুনা, আপনার আসল হিসাব নয়। · Example entries, not real data.</span>
                    <button onClick={() => setTxs((p) => p.filter((t) => !t.id.startsWith("ex-")))} className="font-bold underline min-h-[44px] min-w-[44px]">উদাহরণ মুছুন</button>
                  </p>
                )}
                <ul className="divide-y divide-slate-100">
                  {monthTxs.map((t) => (
                    <li key={t.id} className="py-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <strong className="text-[14px]">{categoryById(t.categoryId).bn}</strong>
                            <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[12px] font-mono text-slate-600">{t.method}</span>
                            {t.source === "migrated" && <span className="rounded bg-sky-100 px-1.5 py-0.5 text-[12px] text-sky-800">পুরনো ডেটা</span>}
                            {unusual.has(t.id) && <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[12px] font-bold text-amber-800">সাধারণের চেয়ে অনেক বেশি</span>}
                          </div>
                          <p className="truncate text-[12px] text-slate-500">{t.note.replace(/\s*\[R:[^\]]+\]/, "")}{t.trxId ? ` · TrxID ${t.trxId}` : ""}</p>
                          <span className="text-[12px] text-slate-500">{t.date}</span>
                          {showHistory === t.id && (
                            <ul className="mt-1 space-y-0.5 rounded bg-slate-50 p-2 text-[12px] text-slate-600">
                              {t.history.map((h, i) => <li key={i}>{new Date(h.at).toLocaleString("en-GB")}: {h.change}</li>)}
                            </ul>
                          )}
                        </div>
                        <div className="flex shrink-0 items-center gap-1">
                          <span className={`font-mono text-[15px] font-bold ${t.type === "income" ? "text-emerald-700" : "text-slate-900"}`}>
                            {t.type === "income" ? "+" : "−"}{tk(t.amountPoisha)}
                          </span>
                          <button onClick={() => setShowHistory(showHistory === t.id ? null : t.id)} className="rounded p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-700 min-h-[44px] min-w-[44px]" aria-label="পরিবর্তনের ইতিহাস"><Info size={15} /></button>
                          <button onClick={() => editTx(t)} className="rounded p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-700 min-h-[44px] min-w-[44px]" aria-label="সংশোধন"><Pencil size={15} /></button>
                          <button onClick={() => deleteTx(t)} className="rounded p-1.5 text-slate-500 hover:bg-red-50 hover:text-red-600 min-h-[44px] min-w-[44px]" aria-label="মুছুন"><Trash2 size={15} /></button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
                </>
              )}
            </section>
          </div>

          <aside className="space-y-6">
            {/* Category breakdown */}
            <section aria-labelledby="cat-h" className="rounded-2xl border border-slate-200 bg-white p-5">
              <h2 id="cat-h" className="mb-3 text-[16px] font-bold">কোথায় খরচ হচ্ছে</h2>
              {summary.byCategory.length === 0 ? (
                <p className="text-[13px] text-slate-500">খরচ যোগ করলে খাতভিত্তিক হিসাব এখানে দেখাবে।</p>
              ) : (
                <SpendingDonutChart summary={summary} />
              )}
              {summary.byCategory[0] && summary.byCategory[0].pct >= 40 && (
                <p className="mt-3 rounded-lg bg-amber-50 p-2 text-[12px] text-amber-900">
                  এই মাসের খরচের {summary.byCategory[0].pct}% গেছে <strong>{categoryById(summary.byCategory[0].id).bn}</strong> খাতে। কমানোর সুযোগ থাকলে এখান থেকেই শুরু করা সহজ।
                </p>
              )}
            </section>

            <CategoryBudgetsPanel summary={summary} budgets={catBudgets} setBudgets={setCatBudgets} />
            <GoalsPanel goals={goals} setGoals={setGoals} today={today} />
            <RentPocketsPanel month={month} today={today} recordedIncomePoisha={summary.incomePoisha} />

            {/* SMS */}
            <section aria-labelledby="sms-h" className="space-y-2 rounded-2xl border border-slate-200 bg-white p-5">
              <h2 id="sms-h" className="flex items-center gap-1.5 text-[16px] font-bold"><MessageSquareText size={17} aria-hidden /> এসএমএস থেকে যোগ করুন</h2>
              <p className="text-[12px] text-slate-500">বিকাশ, নগদ, রকেট বা ব্যাংকের এসএমএস পেস্ট করুন। আয়/খরচ, পরিমাণ ও TrxID বের করে নিশ্চিত করতে দেখাব। এসএমএস এই ডিভাইসের বাইরে যায় না।</p>
              <label htmlFor="sms" className="sr-only">এসএমএস</label>
              <textarea id="sms" rows={2} value={sms} onChange={(e) => setSms(e.target.value)} placeholder="Payment Tk 450.00 to Pizza Guy successful. TrxID 8A91BC" className="w-full rounded-xl border border-slate-200 px-3 py-2 font-mono text-[12px] outline-none focus:border-emerald-600 min-h-[44px]" />
              <div className="flex flex-wrap gap-1.5">
                <button onClick={() => openDraftFromSms(sms)} disabled={!sms.trim()} className="rounded-lg bg-slate-900 px-3 py-1.5 text-[12px] font-bold text-white disabled:opacity-40 min-h-[44px] min-w-[44px]">এসএমএস পড়ুন</button>
                <button onClick={() => openDraftFromSms("bKash Payment Tk 350.00 to Chillox Banani successful. TrxID 9K810A")} className="rounded-lg bg-slate-100 px-2 py-1 font-mono text-[12px] text-slate-700 min-h-[44px] min-w-[44px]">নমুনা: খরচ</button>
                <button onClick={() => openDraftFromSms("You have received Tk 5,000.00 from 01700000000. TrxID ABC123 bKash")} className="rounded-lg bg-slate-100 px-2 py-1 font-mono text-[12px] text-slate-700 min-h-[44px] min-w-[44px]">নমুনা: আয়</button>
              </div>
            </section>

            {/* Recurring */}
            <RecurringPanel
              recurring={recurring}
              setRecurring={setRecurring}
              suggestions={suggestRecurring(txs, recurring.map((r) => r.note))}
              dueCount={recurringDueThisMonth.length}
              month={month}
              onAddForMonth={addRecurringForMonth}
            />

            {/* Bill splitter */}
            <section aria-labelledby="split-h" className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5">
              <h2 id="split-h" className="flex items-center gap-1.5 text-[16px] font-bold"><Users size={17} aria-hidden /> মেস ও বন্ধুদের বিল ভাগ</h2>
              <div className="grid grid-cols-2 gap-2">
                <label className="text-[12px] font-bold text-slate-600">মোট বিল (৳)
                  <input type="number" min={0} value={splitTotal} onChange={(e) => setSplitTotal(Math.max(0, Number(e.target.value) || 0))} className="mt-1 block w-full rounded-lg border border-slate-200 px-2 py-1.5 text-[14px] font-bold min-h-[44px]" />
                </label>
                <label className="text-[12px] font-bold text-slate-600">কতজন
                  <input type="number" min={2} max={50} value={splitPeople} onChange={(e) => setSplitPeople(Math.min(50, Math.max(2, Number(e.target.value) || 2)))} className="mt-1 block w-full rounded-lg border border-slate-200 px-2 py-1.5 text-[14px] font-bold min-h-[44px]" />
                </label>
              </div>
              <p className="text-[13px]">
                জনপ্রতি <strong className="text-emerald-800">৳{shares[shares.length - 1].toFixed(2)}</strong>
                {shares[0] !== shares[shares.length - 1] && <span className="text-slate-500"> (প্রথম কয়েকজন ৳{shares[0].toFixed(2)}, যাতে মোট ঠিক ৳{splitTotal} হয়)</span>}
              </p>
              <button
                onClick={() => {
                  navigator.clipboard?.writeText(`বিল ৳${splitTotal}, ${splitPeople} জনে ভাগ: জনপ্রতি ৳${shares[shares.length - 1].toFixed(2)}${shares[0] !== shares[shares.length - 1] ? ` (কয়েকজন ৳${shares[0].toFixed(2)})` : ""}।`);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1800);
                }}
                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-700 px-3 py-1.5 text-[12px] font-bold text-white min-h-[44px] min-w-[44px]"
              >
                <Copy size={13} aria-hidden /> {copied ? "কপি হয়েছে" : "মেসেজ কপি করুন"}
              </button>
            </section>

            {/* MFS cash-out calculator panel */}
            <MfsFeeCalculatorPanel />

            {/* 30-Day Cash Deficit & Baki Simulation Panel (LaMP Resilience Track) */}
            <CashFlowDeficitAndBakiPanel />

            <p className="text-[12px] leading-relaxed text-slate-600">
              সব হিসাব এই ডিভাইসের ব্রাউজারে থাকে, অফলাইনেও কাজ করে (ভয়েস ছাড়া)। অনুমান ও পরামর্শ সাধারণ তথ্য, আর্থিক পরামর্শ নয়।{" "}
              <Link href="/settings" className="font-semibold text-emerald-700 underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 rounded">ডেটা এক্সপোর্ট বা মুছুন</Link>
            </p>
          </aside>
        </div>
        {/* Product price search is secondary: it sits below the budget so the page opens on the month itself. */}
        <section aria-labelledby="product-search-title" className="space-y-3 rounded-2xl border border-emerald-200/80 bg-white/80 backdrop-blur-md p-5 sm:p-6 shadow-xs hover:shadow-md transition-all">
          <div>
            <h2 id="product-search-title" className="flex items-center gap-2 text-[18px] font-extrabold text-slate-900"><Search size={21} className="text-emerald-700" aria-hidden /> পণ্যের দাম ও তথ্য খুঁজুন</h2>
            <p className="mt-1 text-[13px] text-slate-600">পণ্যের নাম বা মডেল লিখুন। AI ওয়েবে খুঁজে পাওয়া অফার, দাম এবং পণ্যের ভালো-মন্দ দিক উৎসসহ সাজিয়ে দেবে।</p>
          </div>
          <form onSubmit={searchProduct} className="flex flex-col gap-2 sm:flex-row">
            <label htmlFor="product-query" className="sr-only">কোন পণ্য খুঁজবেন</label>
            <input id="product-query" value={productQuery} maxLength={160} onChange={(event) => setProductQuery(event.target.value)} placeholder="যেমন: Redmi Note 14 8/256 GB" className="min-w-0 flex-1 rounded-xl border border-slate-200 px-4 py-3 text-[14px] outline-none focus:border-emerald-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 min-h-[44px]" />
            <button type="submit" disabled={productSearching || productQuery.trim().length < 2} className="min-h-[44px] inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-700 px-5 py-3 text-[14px] font-bold text-white hover:bg-emerald-800 disabled:cursor-wait disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2 transition-all min-w-[44px]"><Search size={16} aria-hidden />{productSearching ? "ওয়েবে খোঁজা হচ্ছে…" : "দাম তুলনা করুন"}</button>
          </form>
          <p className="text-[12px] leading-relaxed text-slate-600">দারাজসহ ওয়েবে পাওয়া সাইট থেকে তথ্য আসতে পারে, তবে সব দোকান বা পুরো ইন্টারনেট কভার হয় না। দাম/স্টক বদলাতে পারে; কেনার আগে বিক্রেতার সাইটে যাচাই করুন।</p>
          {productSearchError && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-[13px] text-red-800">{productSearchError}</p>}
          {productSearch && <div aria-live="polite" className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="whitespace-pre-wrap text-[13px] leading-relaxed text-slate-800">{productSearch.answer}</div>
            {productSearch.sources.length > 0 ? <div className="border-t border-slate-200 pt-3"><h2 className="mb-2 text-[12px] font-bold text-slate-600">খোঁজার উৎস · কেনার আগে মিলিয়ে দেখুন</h2><ul className="flex flex-wrap gap-2">{productSearch.sources.map((source) => <li key={source.url}><a href={source.url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-[44px] max-w-full items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[12px] font-semibold text-emerald-800 hover:border-emerald-400 min-w-[44px]"><span className="max-w-56 truncate">{source.title}</span><ExternalLink size={12} aria-hidden /></a></li>)}</ul></div> : <p className="border-t border-slate-200 pt-2 text-[12px] text-amber-800">সার্চের নির্দিষ্ট উৎস-লিংক পাওয়া যায়নি, তাই ফলাফলের দাম যাচাই করা যাচ্ছে না।</p>}
            <p className="text-[12px] text-slate-600">AI সারাংশে ভুল থাকতে পারে। তালিকার সর্বনিম্ন দাম নিশ্চিত বা সম্পূর্ণ নয়; ডেলিভারি চার্জ, ওয়ারেন্টি, পণ্যের অবস্থা ও বিক্রেতা যাচাই করুন।</p>
          </div>}
        </section>
        </>) : (
          <div className="mx-auto max-w-5xl">
            {view === "wallets" && <WalletsPanel txs={txs} />}
            {view === "dhar" && <DharLedger />}
            {view === "bazar" && <BazarList onAddExpense={openDraftFromBazar} />}
            {view === "mess" && <MessLedger />}
            {view === "zakat" && <ZakatHub />}
          </div>
        )}
      </main>
      <AppFooter lang="bn" />
    </div>
  );
}

function RecurringPanel({
  recurring, setRecurring, dueCount, month, onAddForMonth, suggestions,
}: {
  suggestions: ReturnType<typeof suggestRecurring>;
  recurring: Recurring[];
  setRecurring: (r: Recurring[] | ((p: Recurring[]) => Recurring[])) => void;
  dueCount: number;
  month: string;
  onAddForMonth: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [dismissed, setDismissed] = useState<string[]>([]);
  const [note, setNote] = useState("বাসা ভাড়া");
  const [amount, setAmount] = useState("8000");
  const [day, setDay] = useState(1);
  const [categoryId, setCategoryId] = useState<CategoryId>("rent");
  const [type, setType] = useState<TxType>("expense");
  const valid = Number(amount) > 0 && note.trim().length > 0;

  return (
    <section aria-labelledby="rec-h" className="space-y-2 rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex items-center justify-between">
        <h2 id="rec-h" className="flex items-center gap-1.5 text-[16px] font-bold"><Repeat size={17} aria-hidden /> নিয়মিত লেনদেন</h2>
        <button onClick={() => setOpen(!open)} className="text-[12px] font-bold text-emerald-700 min-h-[44px] min-w-[44px]">{open ? "বন্ধ" : "+ নতুন"}</button>
      </div>
      {recurring.length === 0 && !open && <p className="text-[12px] text-slate-500">বাসা ভাড়া, বেতন, ইন্টারনেট বিলের মতো প্রতি মাসের লেনদেন একবার লিখে রাখুন।</p>}
      {/* Review queue: repeated entries the user may want as a recurring rule. Nothing is saved without a tap. */}
      {suggestions.filter((sg) => !dismissed.includes(sg.key)).map((sg) => (
        <div key={sg.key} className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-[13px]">
          <p className="font-semibold text-amber-950">
            “{sg.note}” {sg.months.length} মাসে দেখা গেছে, প্রায় {tk(sg.amountPoisha)}। প্রতি মাসের নিয়মিত লেনদেন বানাবেন?
          </p>
          <p className="mt-0.5 text-[12px] text-amber-900/80">মাস: {sg.months.join(", ")} · প্রায় {sg.dayOfMonth} তারিখে</p>
          <div className="mt-2 flex gap-2">
            <button
              onClick={() => setRecurring((p) => [...p, { id: Math.random().toString(36).slice(2, 9), type: sg.type, amountPoisha: sg.amountPoisha, categoryId: sg.categoryId, method: sg.method, note: sg.note, dayOfMonth: sg.dayOfMonth }])}
              className="rounded-lg bg-emerald-700 px-3 py-1.5 text-[12px] font-bold text-white min-h-[44px] min-w-[44px]"
            >
              হ্যাঁ, যোগ করুন
            </button>
            <button onClick={() => setDismissed((d) => [...d, sg.key])} className="rounded-lg border border-amber-300 px-3 py-1.5 text-[12px] font-bold text-amber-900 min-h-[44px] min-w-[44px]">না</button>
          </div>
        </div>
      ))}
      <ul className="space-y-1 text-[13px]">
        {recurring.map((r) => (
          <li key={r.id} className="flex items-center justify-between">
            <span>{r.note} · প্রতি মাসের {r.dayOfMonth} তারিখ</span>
            <span className="flex items-center gap-1">
              <strong className={r.type === "income" ? "text-emerald-700" : ""}>{r.type === "income" ? "+" : "−"}{tk(r.amountPoisha)}</strong>
              <button onClick={() => setRecurring((p) => p.filter((x) => x.id !== r.id))} aria-label={`${r.note} মুছুন`} className="p-1 text-slate-500 hover:text-red-600 min-h-[44px] min-w-[44px]"><Trash2 size={13} /></button>
            </span>
          </li>
        ))}
      </ul>
      {open && (
        <div className="grid grid-cols-2 gap-2 rounded-lg bg-slate-50 p-3 text-[12px]">
          <label className="col-span-2 font-bold text-slate-600">বিবরণ<input value={note} onChange={(e) => setNote(e.target.value)} className="mt-1 block w-full rounded border border-slate-200 px-2 py-1 min-h-[44px]" /></label>
          <label className="font-bold text-slate-600">পরিমাণ (৳)<input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))} className="mt-1 block w-full rounded border border-slate-200 px-2 py-1 min-h-[44px]" /></label>
          <label className="font-bold text-slate-600">মাসের তারিখ<input type="number" min={1} max={31} value={day} onChange={(e) => setDay(Math.min(31, Math.max(1, Number(e.target.value) || 1)))} className="mt-1 block w-full rounded border border-slate-200 px-2 py-1 min-h-[44px]" /></label>
          <label className="font-bold text-slate-600">ধরন
            <select value={type} onChange={(e) => { const t = e.target.value as TxType; setType(t); setCategoryId(t === "income" ? "salary" : "rent"); }} className="mt-1 block w-full rounded border border-slate-200 bg-white px-2 py-1 min-h-[44px]">
              <option value="expense">খরচ</option><option value="income">আয়</option>
            </select>
          </label>
          <label className="font-bold text-slate-600">খাত
            <select value={categoryId} onChange={(e) => setCategoryId(e.target.value as CategoryId)} className="mt-1 block w-full rounded border border-slate-200 bg-white px-2 py-1 min-h-[44px]">
              {CATEGORIES.filter((c) => c.type === type).map((c) => <option key={c.id} value={c.id}>{c.bn}</option>)}
            </select>
          </label>
          <button
            disabled={!valid}
            onClick={() => {
              setRecurring((p) => [...p, { id: Math.random().toString(36).slice(2, 9), type, amountPoisha: toPoisha(Number(amount)), categoryId, method: "Cash", note: note.trim().slice(0, 80), dayOfMonth: day }]);
              setOpen(false);
            }}
            className="col-span-2 rounded-lg bg-slate-900 py-1.5 font-bold text-white disabled:opacity-40 min-h-[44px] min-w-[44px]"
          >
            সংরক্ষণ
          </button>
        </div>
      )}
      {dueCount > 0 && (
        <button onClick={onAddForMonth} className="w-full rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-[12px] font-bold text-emerald-800 hover:bg-emerald-100 min-h-[44px]">
          {bnMonth(month)} মাসের {bnDigits(String(dueCount))}টি নিয়মিত লেনদেন যোগ করুন
        </button>
      )}
    </section>
  );
}

const newId = () => Math.random().toString(36).slice(2, 10);

function CategoryBudgetsPanel({ summary, budgets, setBudgets }: { summary: MonthSummary; budgets: CategoryBudgets; setBudgets: (b: CategoryBudgets | ((p: CategoryBudgets) => CategoryBudgets)) => void }) {
  const [open, setOpen] = useState(false);
  const [categoryId, setCategoryId] = useState<CategoryId>("food");
  const [amount, setAmount] = useState("");
  const status = categoryBudgetStatus(summary, budgets);
  const taka = parseAmount(amount);
  const color = { ok: "bg-emerald-500", near: "bg-amber-500", over: "bg-red-500" } as const;
  return (
    <section aria-labelledby="catb-h" className="space-y-2 rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex items-center justify-between">
        <h2 id="catb-h" className="flex items-center gap-1.5 text-[16px] font-bold"><Target size={17} aria-hidden /> খাতভিত্তিক বাজেট</h2>
        <button onClick={() => setOpen(!open)} className="text-[12px] font-bold text-emerald-700 min-h-[44px] min-w-[44px]">{open ? "বন্ধ" : "+ সীমা ঠিক করুন"}</button>
      </div>
      {status.length === 0 && !open && <p className="text-[12px] text-slate-500">খাবার, যাতায়াতের মতো খাতে মাসিক সীমা দিন — ৮০% হলে হলুদ, পার হলে লাল সতর্কতা দেখাবে।</p>}
      <ul className="space-y-2.5">
        {status.map((s) => (
          <li key={s.id} data-testid={`catbudget-${s.id}`}>
            <div className="flex justify-between gap-2 text-[13px]">
              <span>{categoryById(s.id).bn}</span>
              <span className="flex items-center gap-1">
                <span className={s.level === "over" ? "font-bold text-red-700" : s.level === "near" ? "font-bold text-amber-700" : "font-semibold"}>{tk(s.spentPoisha)} / {tk(s.budgetPoisha)}</span>
                <button onClick={() => setBudgets((p) => { const n = { ...p }; delete n[s.id]; return n; })} aria-label={`${categoryById(s.id).bn} সীমা মুছুন`} className="p-0.5 text-slate-500 hover:text-red-600 min-h-[44px] min-w-[44px]"><Trash2 size={12} /></button>
              </span>
            </div>
            <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-valuenow={Math.min(100, s.usedPct)} aria-valuemin={0} aria-valuemax={100} aria-label={`${categoryById(s.id).bn} বাজেটের ব্যবহার`}>
              <div className={`h-full rounded-full ${color[s.level]}`} style={{ width: `${Math.min(100, s.usedPct)}%` }} />
            </div>
            {s.level === "over" && <p className="mt-0.5 text-[12px] font-semibold text-red-700" role="status">সীমা {tk(-s.remainingPoisha)} পার হয়েছে</p>}
            {s.level === "near" && <p className="mt-0.5 text-[12px] text-amber-800">বাকি {tk(s.remainingPoisha)}</p>}
          </li>
        ))}
      </ul>
      {open && (
        <div className="grid grid-cols-2 gap-2 rounded-lg bg-slate-50 p-3 text-[12px]">
          <label className="font-bold text-slate-600">খাত
            <select value={categoryId} onChange={(e) => setCategoryId(e.target.value as CategoryId)} className="mt-1 block w-full rounded border border-slate-200 bg-white px-2 py-1 min-h-[44px]">
              {CATEGORIES.filter((c) => c.type === "expense").map((c) => <option key={c.id} value={c.id}>{c.bn}</option>)}
            </select>
          </label>
          <label className="font-bold text-slate-600">মাসিক সীমা (৳)<input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="যেমন ৫০০০" className="mt-1 block w-full rounded border border-slate-200 px-2 py-1 min-h-[44px]" /></label>
          <button disabled={!taka || taka <= 0} onClick={() => { setBudgets((p) => ({ ...p, [categoryId]: toPoisha(taka!) })); setAmount(""); setOpen(false); }} className="col-span-2 rounded-lg bg-slate-900 py-1.5 font-bold text-white disabled:opacity-40 min-h-[44px] min-w-[44px]">সংরক্ষণ</button>
        </div>
      )}
    </section>
  );
}

function GoalsPanel({ goals, setGoals, today }: { goals: SavingsGoal[]; setGoals: (g: SavingsGoal[] | ((p: SavingsGoal[]) => SavingsGoal[])) => void; today: string }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [target, setTarget] = useState("");
  const [date, setDate] = useState("");
  const [add, setAdd] = useState<Record<string, string>>({});
  const targetTaka = parseAmount(target);
  const valid = name.trim().length > 0 && !!targetTaka && targetTaka > 0;

  const contribute = (g: SavingsGoal, sign: 1 | -1) => {
    const v = parseAmount(add[g.id] ?? "");
    if (!v || v <= 0) return;
    setGoals((p) => p.map((x) => (x.id === g.id ? { ...x, contributions: [...x.contributions, { id: newId(), date: today, poisha: sign * toPoisha(v) }] } : x)));
    setAdd((a) => ({ ...a, [g.id]: "" }));
  };

  return (
    <section aria-labelledby="goal-h" className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex items-center justify-between">
        <h2 id="goal-h" className="flex items-center gap-1.5 text-[16px] font-bold"><PiggyBank size={17} aria-hidden /> সঞ্চয়ের লক্ষ্য</h2>
        <button onClick={() => setOpen(!open)} className="text-[12px] font-bold text-emerald-700 min-h-[44px] min-w-[44px]">{open ? "বন্ধ" : "+ নতুন লক্ষ্য"}</button>
      </div>
      {goals.length === 0 && !open && <p className="text-[12px] text-slate-500">ল্যাপটপ, ঈদ, জরুরি তহবিল — লক্ষ্য ও তারিখ দিন, প্রতি মাসে কত জমাতে হবে হিসাব করে দেখাবে।</p>}
      {open && (
        <div className="grid grid-cols-2 gap-2 rounded-lg bg-slate-50 p-3 text-[12px]">
          <label className="col-span-2 font-bold text-slate-600">লক্ষ্যের নাম<input value={name} onChange={(e) => setName(e.target.value)} placeholder="যেমন ল্যাপটপ" className="mt-1 block w-full rounded border border-slate-200 px-2 py-1 min-h-[44px]" /></label>
          <label className="font-bold text-slate-600">লক্ষ্য (৳)<input inputMode="decimal" value={target} onChange={(e) => setTarget(e.target.value)} className="mt-1 block w-full rounded border border-slate-200 px-2 py-1 min-h-[44px]" /></label>
          <label className="font-bold text-slate-600">তারিখ (ঐচ্ছিক)<input type="date" value={date} min={today} onChange={(e) => setDate(e.target.value)} className="mt-1 block w-full rounded border border-slate-200 px-2 py-1 min-h-[44px]" /></label>
          <button disabled={!valid} onClick={() => { setGoals((p) => [...p, { id: newId(), name: name.trim().slice(0, 80), targetPoisha: toPoisha(targetTaka!), targetDate: date || null, contributions: [], createdAt: new Date().toISOString() }]); setName(""); setTarget(""); setDate(""); setOpen(false); }} className="col-span-2 rounded-lg bg-slate-900 py-1.5 font-bold text-white disabled:opacity-40 min-h-[44px] min-w-[44px]">লক্ষ্য যোগ করুন</button>
        </div>
      )}
      <ul className="space-y-3">
        {goals.map((g) => {
          const p = goalProgress(g, today);
          return (
            <li key={g.id} data-testid="goal" className="rounded-xl border border-slate-100 p-3">
              <div className="flex items-start justify-between gap-2 text-[13px]">
                <strong>{g.name}</strong>
                <button onClick={() => { if (window.confirm(`"${g.name}" লক্ষ্য মুছবেন?`)) setGoals((x) => x.filter((y) => y.id !== g.id)); }} aria-label={`${g.name} লক্ষ্য মুছুন`} className="p-0.5 text-slate-500 hover:text-red-600 min-h-[44px] min-w-[44px]"><Trash2 size={12} /></button>
              </div>
              <p className="text-[12px] text-slate-600">{tk(p.savedPoisha)} / {tk(g.targetPoisha)} ({p.pct}%)</p>
              <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-valuenow={p.pct} aria-valuemin={0} aria-valuemax={100} aria-label={`${g.name} লক্ষ্যের অগ্রগতি`}>
                <div className="h-full rounded-full bg-sky-500" style={{ width: `${p.pct}%` }} />
              </div>
              <p className="mt-1 text-[12px] text-slate-500" data-testid="goal-plan">
                {p.reached ? "🎉 লক্ষ্য পূরণ হয়েছে!" : p.daysLeft === null ? `বাকি ${tk(p.remainingPoisha)} · তারিখ দেননি` : p.daysLeft < 0 ? `তারিখ পেরিয়ে গেছে · বাকি ${tk(p.remainingPoisha)}` : `বাকি ${tk(p.remainingPoisha)} · ${p.daysLeft} দিন · মাসে প্রায় ${tk(p.perMonthNeededPoisha ?? 0)} জমাতে হবে`}
              </p>
              <div className="mt-2 flex gap-1">
                <input inputMode="decimal" aria-label={`${g.name}-এ জমার পরিমাণ`} value={add[g.id] ?? ""} onChange={(e) => setAdd((a) => ({ ...a, [g.id]: e.target.value }))} placeholder="৳" className="w-20 min-w-0 flex-1 rounded border border-slate-200 px-2 py-1 text-[12px] min-h-[44px]" />
                <button onClick={() => contribute(g, 1)} className="rounded bg-emerald-600 px-2 py-1 text-[12px] font-bold text-white min-h-[44px] min-w-[44px]">জমা</button>
                <button onClick={() => contribute(g, -1)} className="rounded border border-slate-200 px-2 py-1 text-[12px] font-bold min-h-[44px] min-w-[44px]">তোলা</button>
              </div>
            </li>
          );
        })}
      </ul>
      {goals.length > 0 && <p className="text-[12px] text-slate-500">লক্ষ্যের জমা আলাদা হিসাব; এটি আপনার লেনদেনের খাতায় নিজে থেকে কিছু যোগ করে না।</p>}
    </section>
  );
}

/** Clearly labelled example entries for first-time visitors; ids start with "ex-" so they can be removed in one tap. */
function exampleMonth(today: string): Transaction[] {
  const [y, m, d] = today.split("-").map(Number);
  const day = (n: number) => `${y}-${String(m).padStart(2, "0")}-${String(Math.min(n, d || 1)).padStart(2, "0")}`;
  const now = new Date().toISOString();
  const mk = (id: string, type: TxType, taka: number, categoryId: CategoryId, method: Method, note: string, n: number): Transaction => ({
    id: `ex-${id}`, type, amountPoisha: toPoisha(taka), categoryId, method, note: `উদাহরণ: ${note}`, date: day(n), source: "manual", createdAt: now, updatedAt: now, history: [],
  });
  return [
    mk("1", "income", 25000, "freelance", "bKash", "ক্লায়েন্টের পেমেন্ট", 1),
    mk("2", "expense", 8000, "rent", "Cash", "বাসা ভাড়া", 1),
    mk("3", "expense", 1200, "grocery", "Cash", "বাজার", 2),
    mk("4", "expense", 1500, "utilities", "bKash", "ইন্টারনেট বিল", 3),
    mk("5", "expense", 80, "transport", "Cash", "রিকশা ভাড়া", 4),
    mk("6", "expense", 650, "food", "Nagad", "বন্ধুদের সাথে খাওয়া", 4),
  ];
}

function SpendingDonutChart({ summary }: { summary: MonthSummary }) {
  const [hoveredId, setHoveredId] = useState<CategoryId | null>(null);
  const total = summary.expensePoisha;
  const radius = 70;
  const circumference = 2 * Math.PI * radius; // ~439.823

  let accumulated = 0;
  const slices = summary.byCategory.map((c) => {
    const ratio = total > 0 ? c.poisha / total : 0;
    const strokeDash = ratio * circumference;
    const offset = accumulated;
    accumulated += strokeDash;
    return {
      ...c,
      strokeDasharray: `${strokeDash} ${circumference}`,
      strokeDashoffset: -offset,
      color: CATEGORY_STYLES[c.id]?.hex ?? "#64748b",
    };
  });

  const activeCategory = summary.byCategory.find((c) => c.id === hoveredId);

  return (
    <div className="space-y-4">
      {/* SVG Donut Visualizer */}
      <div className="relative flex items-center justify-center">
        <svg
          viewBox="0 0 200 200"
          className="h-48 w-48 -rotate-90 transform"
          role="img"
          aria-label="বিভাগভিত্তিক ব্যয়ের চার্ট"
        >
          <circle cx="100" cy="100" r={radius} stroke="#f1f5f9" strokeWidth="24" fill="none" />
          {slices.map((slice) => (
            <circle
              key={slice.id}
              cx="100"
              cy="100"
              r={radius}
              stroke={slice.color}
              strokeWidth={hoveredId === slice.id ? 28 : 24}
              strokeDasharray={slice.strokeDasharray}
              strokeDashoffset={slice.strokeDashoffset}
              fill="none"
              className="cursor-pointer transition-all duration-200"
              onMouseEnter={() => setHoveredId(slice.id)}
              onMouseLeave={() => setHoveredId(null)}
              tabIndex={0}
              role="button"
              aria-label={`${categoryById(slice.id).bn}: ${tk(slice.poisha)} (${slice.pct}%)`}
              onFocus={() => setHoveredId(slice.id)}
              onBlur={() => setHoveredId(null)}
            />
          ))}
        </svg>

        {/* Center Dynamic HUD */}
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          {activeCategory ? (
            <>
              <span className="text-[12px] font-bold text-slate-600">{categoryById(activeCategory.id).bn}</span>
              <span className="text-[16px] font-extrabold text-slate-900">{tk(activeCategory.poisha)}</span>
              <span className="text-[12px] font-semibold text-emerald-600">{activeCategory.pct}%</span>
            </>
          ) : (
            <>
              <span className="text-[12px] font-medium text-slate-500">মোট খরচ</span>
              <strong className="text-[17px] font-extrabold text-slate-900">{tk(total)}</strong>
              <span className="text-[12px] text-slate-500">{summary.count}টি লেনদেন</span>
            </>
          )}
        </div>
      </div>

      {/* Segmented Progress Bar */}
      <div className="flex h-3 w-full overflow-hidden rounded-full bg-slate-100 shadow-inner">
        {summary.byCategory.map((c) => (
          <div
            key={c.id}
            style={{ width: `${c.pct}%`, backgroundColor: CATEGORY_STYLES[c.id]?.hex ?? "#64748b" }}
            className={`transition-all duration-200 ${hoveredId === c.id ? "brightness-110" : ""}`}
            title={`${categoryById(c.id).bn}: ${tk(c.poisha)} (${c.pct}%)`}
            onMouseEnter={() => setHoveredId(c.id)}
            onMouseLeave={() => setHoveredId(null)}
          />
        ))}
      </div>

      {/* Accessible Interactive Category Legend */}
      <ul className="space-y-2">
        {summary.byCategory.map((c) => {
          const style = CATEGORY_STYLES[c.id] ?? CATEGORY_STYLES.other;
          const isHovered = hoveredId === c.id;
          return (
            <li
              key={c.id}
              onMouseEnter={() => setHoveredId(c.id)}
              onMouseLeave={() => setHoveredId(null)}
              className={`flex items-center justify-between rounded-lg p-1.5 text-[13px] transition-colors cursor-pointer ${
                isHovered ? "bg-slate-50 font-bold" : ""
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: style.hex }} />
                <span>{categoryById(c.id).bn}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-800">{tk(c.poisha)}</span>
                <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[12px] text-slate-500 font-mono">
                  {c.pct}%
                </span>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function MfsFeeCalculatorPanel() {
  const [calcAmount, setCalcAmount] = useState(1000);
  const providers: MfsProvider[] = ["bkash_ussd", "bkash_priyo", "bkash_app", "nagad_app", "nagad_ussd", "rocket_app", "rocket_atm"];

  return (
    <section aria-labelledby="mfs-h" className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5">
      <h2 id="mfs-h" className="flex items-center gap-1.5 text-[16px] font-bold">
        <Smartphone size={17} aria-hidden /> এমএফএস ক্যাশ-আউট ক্যালকুলেটর
      </h2>
      <p className="text-[12px] text-slate-500">
        বিকাশ, নগদ ও রকেট থেকে টাকা তোলার চার্জ হিসাব করুন। প্রতিষ্ঠানের নিজের পাতায় মিলিয়ে দেখা হারের পাশে উৎস দেওয়া আছে; বাকিগুলো যাচাই হয়নি, তাই ওয়ালেট অংশে নিজের হার বসিয়ে নিন।
      </p>
      <div>
        <label className="text-[12px] font-bold text-slate-600">
          উত্তোলনের পরিমাণ (৳)
          <input
            type="number"
            min={0}
            value={calcAmount}
            onChange={(e) => setCalcAmount(Math.max(0, Number(e.target.value) || 0))}
            className="mt-1 block w-full rounded-lg border border-slate-200 px-3 py-1.5 text-[14px] font-bold font-mono min-h-[44px]"
          />
        </label>
      </div>
      <div className="space-y-2">
        {providers.map((p) => {
          const res = calculateMfsCashoutFee(calcAmount, p);
          const config = MFS_FEE_RATES[p];
          return (
            <div key={p} className="flex items-center justify-between rounded-lg bg-slate-50 p-2 text-[12px]">
              <div>
                <span className="font-semibold text-slate-800">{config.nameBn}</span>
                {config.source ? <a href={config.source.url} target="_blank" rel="noopener noreferrer" className="block text-[12px] font-semibold text-emerald-700 underline min-h-[44px] min-w-[44px]">উৎস: {config.source.label} · {config.source.checked}</a> : <span className="block text-[12px] font-semibold text-amber-700">যাচাই হয়নি — নিজের হার দিয়ে মিলিয়ে নিন</span>}
              </div>
              <div className="text-right">
                <span className="font-bold text-slate-900 font-mono">চার্জ: ৳{(res.feePoisha / 100).toFixed(2)}</span>
                <span className="block text-[12px] text-slate-500 font-mono">মোট: ৳{(res.totalWithFeePoisha / 100).toFixed(2)}</span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function CashFlowDeficitAndBakiPanel() {
  const [subTab, setSubTab] = useState<"cashflow" | "baki">("cashflow");
  const [startCashTaka, setStartCashTaka] = useState(15000);
  const [flows, setFlows] = useState<ScheduledFlow[]>([
    { id: "1", dayOfMonth: 5, label: "পাইকারি সাপ্লায়ার বিল", type: "expense", poisha: 8000_00 },
    { id: "2", dayOfMonth: 10, label: "দোকান/মেস বাসা ভাড়া", type: "expense", poisha: 10000_00 },
    { id: "3", dayOfMonth: 16, label: "গ্রাহকদের বাকি আদায় / ফ্রিল্যান্সিং", type: "income", poisha: 18000_00 },
    { id: "4", dayOfMonth: 24, label: "বিদ্যুৎ ও ইউটিলিটি বিল", type: "expense", poisha: 2500_00 },
  ]);

  // Baki Calculator State
  const [debtTaka, setDebtTaka] = useState(12000);
  const [weeks, setWeeks] = useState(4);
  const [customerName, setCustomerName] = useState("রহিম সাহেব");
  const [merchantName, setMerchantName] = useState("হাসান ফার্মেসি");
  const [smsCopied, setSmsCopied] = useState(false);

  const simulation = useMemo(() => {
    return simulate30DayCashFlow(startCashTaka * 100, flows);
  }, [startCashTaka, flows]);

  const bakiPlan = useMemo(() => {
    return calculateBakiInstallments(debtTaka, weeks, new Date().toISOString().slice(0, 10), customerName, merchantName);
  }, [debtTaka, weeks, customerName, merchantName]);

  const fmtTk = (poisha: number) =>
    "৳" + (poisha / 100).toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 2 });

  return (
    <section aria-labelledby="cashflow-h" className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <h2 id="cashflow-h" className="flex items-center gap-1.5 text-[15px] font-bold text-slate-900">
          <PiggyBank size={18} className="text-emerald-700" />
          <span>ক্যাশ ঘাটতি অ্যালার্ট ও বাকি কিস্তি (LaMP Track)</span>
        </h2>
        <div className="flex items-center rounded-lg bg-slate-100 p-0.5 text-[12px] font-bold">
          <button
            onClick={() => setSubTab("cashflow")}
            className={`px-2.5 py-1 rounded-md transition-all ${
              subTab === "cashflow" ? "bg-white text-emerald-800 shadow-xs" : "text-slate-600"
            } min-h-[44px] min-w-[44px]`}
          >
            ক্যাশফ্লো
          </button>
          <button
            onClick={() => setSubTab("baki")}
            className={`px-2.5 py-1 rounded-md transition-all ${
              subTab === "baki" ? "bg-white text-emerald-800 shadow-xs" : "text-slate-600"
            } min-h-[44px] min-w-[44px]`}
          >
            বাকি কিস্তি
          </button>
        </div>
      </div>

      {subTab === "cashflow" ? (
        <div className="space-y-3.5 text-[12.5px]">
          {/* Initial Balance */}
          <div>
            <label htmlFor="cash-start" className="block text-[12px] font-bold text-slate-700 mb-1">
              বর্তমান ক্যাশ বা ক্যাশবাক্সের উদ্বৃত্ত (৳):
            </label>
            <input
              id="cash-start"
              type="number"
              value={startCashTaka}
              onChange={(e) => setStartCashTaka(Math.max(0, Number(e.target.value) || 0))}
              className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-[13px] font-bold font-mono min-h-[44px]"
            />
          </div>

          {/* Health Alert Status */}
          <div
            className={`rounded-xl p-3 border ${
              simulation.healthLevel === "critical"
                ? "bg-rose-50 border-rose-300 text-rose-950"
                : simulation.healthLevel === "vulnerable"
                ? "bg-amber-50 border-amber-300 text-amber-950"
                : "bg-emerald-50 border-emerald-300 text-emerald-950"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-bold text-[13px]">
                {simulation.healthLevel === "critical"
                  ? "⚠️ ঘাটতির পূর্বাভাস (Cash Deficit Alert)!"
                  : simulation.healthLevel === "vulnerable"
                  ? "⚡ নগদ অর্থের ঝুঁকি (Vulnerable Cashflow)"
                  : "✅ নিরাপদ ক্যাশফ্লো (Solvent Cashflow)"}
              </span>
              <span className="text-[12px] font-mono font-bold uppercase">
                {simulation.healthLevel}
              </span>
            </div>

            {simulation.deficitDay !== null ? (
              <p className="mt-1 text-[12px] leading-relaxed">
                আগামী <strong>{simulation.deficitDay} নম্বর দিনে</strong> আপনার ক্যাশ ব্যালেন্স ঋণাত্মক হয়ে যাবে (সর্বনিম্ন ব্যালেন্স:{" "}
                <span className="font-mono font-bold text-rose-700">{fmtTk(simulation.lowestBalancePoisha)}</span>)। সাপ্লায়ারের বিল পরিশোধের আগেই বাকির কিস্তি আদায় করুন।
              </p>
            ) : (
              <p className="mt-1 text-[12px] leading-relaxed">
                পরবর্তী ৩০ দিনে কোনো ঘাটতি নেই। সর্বনিম্ন ক্যাশ থাকবে {simulation.lowestBalanceDay} নম্বর দিনে ({fmtTk(simulation.lowestBalancePoisha)})।
              </p>
            )}
          </div>

          {/* Scheduled Events Mini List */}
          <div className="space-y-1.5">
            <span className="block text-[12px] font-bold text-slate-600">আসন্ন ৩০ দিনের আয়-ব্যয়ের ধাপ:</span>
            <div className="max-h-36 overflow-y-auto space-y-1 rounded-lg border border-slate-100 p-1.5 bg-slate-50">
              {flows.map((f) => (
                <div key={f.id} className="flex items-center justify-between text-[12px] bg-white p-1.5 rounded border border-slate-100">
                  <span className="font-medium text-slate-800">
                    দিন {f.dayOfMonth}: {f.label}
                  </span>
                  <span className={`font-mono font-bold ${f.type === "income" ? "text-emerald-700" : "text-rose-700"}`}>
                    {f.type === "income" ? "+" : "-"}{fmtTk(f.poisha)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* Baki Installment Tab */
        <div className="space-y-3.5 text-[12.5px]">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label htmlFor="baki-total" className="block text-[12px] font-bold text-slate-700 mb-1">মোট বাকি (৳)</label>
              <input
                id="baki-total"
                type="number"
                value={debtTaka}
                onChange={(e) => setDebtTaka(Math.max(0, Number(e.target.value) || 0))}
                className="w-full rounded-lg border border-slate-200 px-2.5 py-1 text-[12.5px] font-mono font-bold min-h-[44px]"
              />
            </div>
            <div>
              <label htmlFor="baki-weeks" className="block text-[12px] font-bold text-slate-700 mb-1">কিস্তির সংখ্যা (সপ্তাহ)</label>
              <input
                id="baki-weeks"
                type="number"
                min={1}
                max={52}
                value={weeks}
                onChange={(e) => setWeeks(Math.max(1, Math.min(52, Number(e.target.value) || 1)))}
                className="w-full rounded-lg border border-slate-200 px-2.5 py-1 text-[12.5px] font-mono font-bold min-h-[44px]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[12px] font-bold text-slate-700 mb-1">গ্রাহকের নাম</label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-2.5 py-1 text-[12.5px] min-h-[44px]"
              />
            </div>
            <div>
              <label className="block text-[12px] font-bold text-slate-700 mb-1">দোকানের নাম</label>
              <input
                type="text"
                value={merchantName}
                onChange={(e) => setMerchantName(e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-2.5 py-1 text-[12.5px] min-h-[44px]"
              />
            </div>
          </div>

          <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-3 space-y-1">
            <div className="flex items-center justify-between text-[12px]">
              <span className="font-semibold text-emerald-950">প্রতি সপ্তাহের কিস্তি:</span>
              <span className="font-mono font-bold text-[14px] text-emerald-800">
                {fmtTk(bakiPlan.weeklyInstallmentPoisha)}
              </span>
            </div>
            <div className="flex items-center justify-between text-[12px] text-emerald-800">
              <span>মোট সময়সীমা: {bakiPlan.weeks} সপ্তাহ</span>
              <span>সর্বশেষ কিস্তি: {fmtTk(bakiPlan.finalInstallmentPoisha)}</span>
            </div>
          </div>

          {/* SMS Reminder Template */}
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-2.5 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[12px] font-bold text-slate-700">এসএমএস রিমাইন্ডার মেসেজ:</span>
              <button
                onClick={() => {
                  playClick();
                  navigator.clipboard.writeText(bakiPlan.smsReminderTemplateBn);
                  setSmsCopied(true);
                  setTimeout(() => setSmsCopied(false), 2000);
                }}
                className="inline-flex items-center gap-1 rounded bg-slate-800 px-2 py-0.5 text-[12px] font-bold text-white hover:bg-slate-700 transition-colors min-h-[44px] min-w-[44px]"
              >
                <Copy size={11} />
                <span>{smsCopied ? "কপি হয়েছে!" : "কপি"}</span>
              </button>
            </div>
            <p className="text-[12px] text-slate-600 leading-relaxed font-mono">
              {bakiPlan.smsReminderTemplateBn}
            </p>
          </div>
        </div>
      )}
    </section>
  );
}
