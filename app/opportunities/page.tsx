"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { AppHeader } from "@/components/AppHeader";
import { OpportunityTracker } from "@/components/OpportunityTracker";
import { storageKey, usePersistentState } from "@/lib/clientStore";
import {
  EMPTY_BOARD,
  MAX_SAVED_OPPORTUNITIES,
  OPPORTUNITY_TITLE_LIMIT,
  PATHS,
  normalizeOpportunityUrl,
  sanitizeOpportunityBoard,
  type OpportunityProgress,
  type PathId,
  type SavedOpportunity,
} from "@/lib/opportunities";
import { ArrowUpRight, Bookmark, Check, Compass, ExternalLink, GraduationCap, Sprout, Wallet, BriefcaseBusiness, Search, Pill, Mic, Percent } from "lucide-react";

type SearchSource = { title: string; url: string };

const APP_LINKS = [
  { name: "KormoPath Workspace", href: "/workspace", icon: Compass, detail: "CV, skill proof, client kit ও payout path" },
  { name: "AdmitBuddy", href: "/admitbuddy", icon: GraduationCap, detail: "ভর্তি পরিকল্পনা ও official circular checklist" },
  { name: "MediScan BD", href: "/mediscan", icon: Pill, detail: "প্রেসক্রিপশনের লেখা বুঝুন; রোগ নির্ণয় নয়" },
  { name: "Shohoj Budget", href: "/shohoj-budget", icon: Wallet, detail: "দৈনিক বাজেট ও product price research" },
  { name: "HaatBazar AI", href: "/haatbazar", icon: Sprout, detail: "নিজের দাম, লাভের হিসাব ও আবহাওয়া" },
  { name: "Probaho Coach", href: "/probaho", icon: Mic, detail: "ভাইভা ও speaking practice" },
  { name: "FeeGuard BD", href: "/feeguard", icon: Percent, detail: "পেমেন্ট channel-এর fee তুলনা" },
  { name: "ChuktiGuard", href: "/chuktiguard", icon: BriefcaseBusiness, detail: "Service Pack, invoice ও contract template" },
];

export default function OpportunitiesPage() {
  const [board, setBoard, { ready, saveFailed }] = usePersistentState(storageKey("platform", "opportunityBoard.v1"), EMPTY_BOARD, sanitizeOpportunityBoard);
  const [query, setQuery] = useState("");
  const [searchResult, setSearchResult] = useState<{ answer: string; sources: SearchSource[]; searchedAt: string } | null>(null);
  const [searchError, setSearchError] = useState("");
  const [searchSaveError, setSearchSaveError] = useState("");
  const [searching, setSearching] = useState(false);
  const requestRef = useRef<AbortController | null>(null);
  const activePath = PATHS.find((path) => path.id === board.path) ?? PATHS[0];
  const doneIds = board.completedByPath[activePath.id] ?? [];
  const progress = activePath.actions.length ? Math.round((doneIds.filter((id) => activePath.actions.some((action) => action.id === id)).length / activePath.actions.length) * 100) : 0;
  const visibleSaved = board.saved.filter((item) => item.track === activePath.id);

  useEffect(() => {
    setQuery(activePath.id === "home" ? "" : activePath.queryPlaceholder);
    setSearchResult(null);
    setSearchError("");
    setSearchSaveError("");
  }, [activePath.id, activePath.queryPlaceholder]);

  useEffect(() => () => requestRef.current?.abort(), []);

  const choosePath = (path: PathId) => {
    if (path === activePath.id) return;
    requestRef.current?.abort();
    requestRef.current = null;
    setSearching(false);
    setBoard((previous) => ({ ...previous, path }));
  };
  const toggleAction = (id: string) => setBoard((previous) => {
    const current = previous.completedByPath[activePath.id] ?? [];
    const next = current.includes(id) ? current.filter((value) => value !== id) : [...current, id];
    return { ...previous, completedByPath: { ...previous.completedByPath, [activePath.id]: next } };
  });

  const runSearch = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!ready || activePath.id === "home" || query.trim().length < 2 || requestRef.current) return;
    const request = new AbortController();
    requestRef.current = request;
    setSearching(true);
    setSearchError("");
    setSearchSaveError("");
    setSearchResult(null);
    try {
      const response = await fetch("/api/opportunities", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ path: activePath.id, query: query.trim() }),
        signal: request.signal,
      });
      const data = await response.json().catch(() => null) as { answer?: string; sources?: SearchSource[]; searchedAt?: string; error?: string } | null;
      if (request.signal.aborted) return;
      if (!response.ok || typeof data?.answer !== "string") throw new Error(data?.error || "খোঁজার ফল পাওয়া যায়নি।");
      const sources = new Map<string, SearchSource>();
      if (Array.isArray(data.sources)) {
        for (const source of data.sources) {
          if (typeof source?.title !== "string" || typeof source.url !== "string") continue;
          const url = normalizeOpportunityUrl(source.url);
          if (url && !sources.has(url)) sources.set(url, { url, title: source.title.trim() || new URL(url).hostname });
          if (sources.size === 10) break;
        }
      }
      setSearchResult({
        answer: data.answer,
        sources: [...sources.values()],
        searchedAt: typeof data.searchedAt === "string" ? data.searchedAt : new Date().toISOString(),
      });
    } catch (error) {
      if (!request.signal.aborted) setSearchError(error instanceof Error ? error.message : "সার্চে সমস্যা হয়েছে। আবার চেষ্টা করুন।");
    } finally {
      if (requestRef.current === request) {
        requestRef.current = null;
        setSearching(false);
      }
    }
  };

  function saveOpportunity(rawTitle: string, rawUrl: string): string | null {
    const title = rawTitle.trim().slice(0, OPPORTUNITY_TITLE_LIMIT);
    const url = normalizeOpportunityUrl(rawUrl);
    if (!title || !url) return "সুযোগের নাম ও সঠিক HTTP বা HTTPS লিংক দিন।";
    if (visibleSaved.some((item) => item.url === url)) return "এই লিংক এই পথে আগেই সংরক্ষণ করা হয়েছে।";
    if (board.saved.length >= MAX_SAVED_OPPORTUNITIES) return "সর্বোচ্চ ১০০টি সুযোগ রাখা যায়। নতুন সুযোগ যোগ করতে একটি পুরোনো সুযোগ সরান।";
    const opportunity: SavedOpportunity = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      title,
      url,
      track: activePath.id,
      savedAt: new Date().toISOString(),
      status: "saved",
      followUp: "",
      note: "",
    };
    setBoard((previous) => {
      if (previous.saved.length >= MAX_SAVED_OPPORTUNITIES || previous.saved.some((item) => item.track === opportunity.track && item.url === url)) return previous;
      return { ...previous, saved: [opportunity, ...previous.saved] };
    });
    return null;
  }

  function updateOpportunity(id: string, progress: OpportunityProgress) {
    setBoard((previous) => ({
      ...previous,
      saved: previous.saved.map((item) => item.id === id ? { ...item, ...progress } : item),
    }));
  }

  function removeOpportunity(id: string) {
    setBoard((previous) => ({ ...previous, saved: previous.saved.filter((item) => item.id !== id) }));
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 antialiased">
      <AppHeader taglineEn="Find opportunities, plan next steps" appId="path" href="/opportunities" name="My Path" taglineBn="সুযোগ খুঁজুন · পরের কাজ ঠিক করুন" icon={<Compass size={22} />} accent="from-indigo-500 to-violet-700" />
      <main id="main" className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 sm:py-9">
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="max-w-3xl">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-[11px] font-bold text-indigo-800"><Compass size={13} /> KormoPath Opportunity &amp; Action Board</span>
              <h1 className="mt-3 text-[28px] font-extrabold tracking-tight sm:text-[38px]">সুযোগ থেকে পরের পদক্ষেপ</h1>
              <p className="mt-2 text-[14px] leading-relaxed text-slate-600">একটি পথ বেছে নিন। সূত্রসহ সুযোগ খুঁজুন, প্রস্তুতির কাজগুলো টিক দিন, আর দরকারি KormoPath অ্যাপে যান। আপনার বোর্ড এই ডিভাইসেই থাকে।</p>
              {ready && <a href="#saved-title" className="mt-3 inline-flex items-center gap-1.5 text-sm font-bold text-indigo-800 hover:underline"><Bookmark size={15} aria-hidden /> সুযোগ ট্র্যাকার খুলুন</a>}
            </div>
            <div className="min-w-36 rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
              <span className="text-[11px] font-semibold text-slate-500">পথের অগ্রগতি</span>
              <strong className="mt-1 block text-[27px] font-extrabold text-indigo-700">{progress}%</strong>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200"><div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all" style={{ width: `${progress}%` }} /></div>
              <small className="mt-1 block text-[10px] text-slate-500">{doneIds.length} / {activePath.actions.length} কাজ</small>
            </div>
          </div>

          <div className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-4" role="group" aria-label="পথ বেছে নিন">
            {PATHS.map((path) => <button key={path.id} type="button" aria-pressed={activePath.id === path.id} disabled={!ready} onClick={() => choosePath(path.id)} className={`rounded-2xl border p-3 text-left transition ${activePath.id === path.id ? "border-indigo-500 bg-indigo-50 shadow-sm" : "border-slate-200 bg-white/70 hover:border-indigo-300"}`}><strong className="block text-[13px]">{path.title}</strong><span className="mt-1 block text-[11px] leading-relaxed text-slate-500">{path.description}</span></button>)}
          </div>
        </section>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,7fr)_minmax(300px,5fr)]">
          <section aria-labelledby="opp-search-title" className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
            <div><h2 id="opp-search-title" className="flex items-center gap-2 text-[18px] font-bold"><Search size={18} className="text-indigo-600" />{activePath.queryLabel}</h2><p className="mt-1 text-[12px] text-slate-500">ওয়েব খোঁজ Gemini Search ব্যবহার করে। ফলাফলে সূত্রের লিংক থাকবে; আবেদন করার আগে মূল পেজে শর্ত মিলিয়ে নিন।</p></div>
            {activePath.id === "home" ? <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-[13px] text-amber-950">স্বাস্থ্য বা ব্যক্তিগত কেনাকাটার তথ্য My Path-এ পাঠাবেন না। পণ্যের দাম তুলতে <Link href="/shohoj-budget" className="font-bold underline">Shohoj Budget</Link> খুলুন; স্বাস্থ্য সমস্যায় চিকিৎসক/সরকারি সেবার সাথে কথা বলুন।</div> : <form onSubmit={runSearch} className="flex flex-col gap-2 sm:flex-row"><label htmlFor="opportunity-query" className="sr-only">কী খুঁজবেন</label><input id="opportunity-query" value={query} maxLength={180} onChange={(event) => setQuery(event.target.value)} placeholder={activePath.queryPlaceholder} className="min-w-0 flex-1 rounded-xl border border-slate-200 px-3 py-2.5 text-[13px]"/><button disabled={!ready || searching || query.trim().length < 2} className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-700 px-4 py-2.5 text-[13px] font-bold text-white hover:bg-indigo-800 disabled:opacity-50"><Search size={15} />{searching ? "ওয়েবে খোঁজা হচ্ছে…" : "সুযোগ খুঁজুন"}</button></form>}
            {searchError && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-[12px] text-red-800">{searchError}</p>}
            {searching && <div role="status" className="animate-pulse rounded-xl bg-slate-100 p-5 text-[13px] text-slate-500">সাম্প্রতিক ওয়েব পেজ খোঁজা হচ্ছে…</div>}
            {searchResult && (
              <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/80 p-4" aria-live="polite">
                <div className="whitespace-pre-wrap text-[13px] leading-relaxed text-slate-800">{searchResult.answer}</div>
                <p className="text-[10px] text-slate-500">খোঁজা হয়েছে {new Date(searchResult.searchedAt).toLocaleString("bn-BD", { timeZone: "Asia/Dhaka" })} · Gemini-এর সারাংশ ভুল হতে পারে; মূল সূত্রে যাচাই করুন।</p>
                {searchResult.sources.length > 0 ? (
                  <div className="border-t border-slate-200 pt-3">
                    <h3 className="mb-2 text-[11px] font-bold text-slate-600">সার্চের সূত্র ও সংরক্ষণ</h3>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {searchResult.sources.map((source) => {
                        const saved = visibleSaved.some((item) => item.url === source.url);
                        return (
                          <div key={source.url} className="flex min-w-0 items-center gap-2 rounded-xl border border-slate-200 bg-white/80 p-2.5">
                            <a href={source.url} target="_blank" rel="noopener noreferrer" className="min-w-0 flex-1 text-[11px] font-semibold text-indigo-800 hover:underline">
                              <span className="block truncate">{source.title}</span>
                              <span className="inline-flex items-center gap-1 text-[10px] font-normal text-slate-500">মূল উৎস খুলুন <ExternalLink size={10} aria-hidden /></span>
                            </a>
                            <button type="button" onClick={() => setSearchSaveError(saveOpportunity(source.title, source.url) ?? "")} disabled={saved} aria-label={`${source.title} ${saved ? "সংরক্ষিত" : "সংরক্ষণ"}`} className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-slate-200 text-indigo-700 hover:bg-indigo-50 disabled:text-emerald-700">
                              {saved ? <Check size={14} aria-hidden /> : <Bookmark size={14} aria-hidden />}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                    {searchSaveError && <p role="alert" className="mt-2 text-xs text-red-700">{searchSaveError}</p>}
                  </div>
                ) : <p className="border-t border-slate-200 pt-2 text-[11px] text-amber-800">নির্দিষ্ট সূত্রের লিংক পাওয়া যায়নি; এই সারাংশের তথ্য যাচাই করা যাচ্ছে না।</p>}
              </div>
            )}
            <p className="text-[11px] leading-relaxed text-slate-500">সব সাইট বা পুরো ইন্টারনেট কভার হয় না। কোনো তারিখ, যোগ্যতা বা আবেদন খোলা আছে কি না—সূত্রে নিশ্চিত না হয়ে ধরে নেবেন না।</p>
          </section>

          <section aria-labelledby="next-steps-title" className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5">
            <div><h2 id="next-steps-title" className="text-[18px] font-bold">আপনার পরের কাজ</h2><p className="mt-1 text-[12px] text-slate-500">টিক দিলে এই ডিভাইসে অগ্রগতি সংরক্ষিত হবে।</p></div>
            {activePath.actions.map((action) => { const checked = doneIds.includes(action.id); return <div key={action.id} className={`flex items-start gap-3 rounded-xl border p-3 transition ${checked ? "border-emerald-200 bg-emerald-50/70" : "border-slate-200 bg-white/70"}`}><button type="button" onClick={() => toggleAction(action.id)} aria-pressed={checked} disabled={!ready} aria-label={`${action.title} ${checked ? "সম্পন্ন নয়" : "সম্পন্ন"}`} className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-md border ${checked ? "border-emerald-600 bg-emerald-600 text-white" : "border-slate-300 bg-white"}`}>{checked && <Check size={13} />}</button><div className="min-w-0 flex-1"><strong className={`block text-[13px] ${checked ? "text-emerald-900" : "text-slate-900"}`}>{action.title}</strong><p className="mt-0.5 text-[11px] leading-relaxed text-slate-600">{action.description}</p><Link href={action.href} className="mt-1 inline-flex items-center gap-1 text-[10px] font-bold text-indigo-700 hover:underline">{action.app}<ArrowUpRight size={11} /></Link></div></div>; })}
          </section>
        </div>

        {saveFailed && <p role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">ব্রাউজারে পরিবর্তন সংরক্ষণ করা যাচ্ছে না। পেজ বন্ধ করার আগে সুযোগের CSV নামিয়ে রাখুন।</p>}
        {ready && <OpportunityTracker key={activePath.id} items={visibleSaved} onAdd={saveOpportunity} onUpdate={updateOpportunity} onRemove={removeOpportunity} />}

        <section aria-labelledby="all-apps-title" className="rounded-2xl border border-slate-200 bg-white p-5"><h2 id="all-apps-title" className="text-[18px] font-bold">সব অ্যাপ, একই পথে</h2><p className="mt-1 text-[12px] text-slate-500">অ্যাপগুলো নিজ নিজ তথ্য আলাদাভাবে রাখে। কোনো সংরক্ষিত ব্যক্তিগত বা স্বাস্থ্য তথ্য এখানে স্বয়ংক্রিয়ভাবে আনা হয় না।</p><div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">{APP_LINKS.map((app) => { const Icon = app.icon; return <Link key={app.href} href={app.href} className="group rounded-xl border border-slate-200 bg-white/70 p-3 transition hover:-translate-y-0.5 hover:border-indigo-300 hover:shadow-sm"><span className="flex items-center justify-between"><Icon size={17} className="text-indigo-600" /><ArrowUpRight size={14} className="text-slate-400 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5" /></span><strong className="mt-2 block text-[12px]">{app.name}</strong><span className="mt-0.5 block text-[10px] text-slate-500">{app.detail}</span></Link>; })}</div></section>
      </main>
    </div>
  );
}
