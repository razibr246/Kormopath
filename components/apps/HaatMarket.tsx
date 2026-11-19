"use client";
import { useState } from "react";
import { Search, Truck, ShoppingBasket, Plus, Trash2, ExternalLink, Globe2, Loader2 } from "lucide-react";
import { usePersistentState, storageKey, todayLocal } from "@/lib/clientStore";
import { KG_PER_MAUND } from "@/lib/haatbazar";

type Quote = { id: string; kind: "input" | "freight"; name: string; seller: string; unit: string; amount: number; route: string; date: string; source: string };
type Source = { title: string; url: string };
const clean = (v: unknown): Quote[] | null => Array.isArray(v) ? v.filter((q): q is Quote => !!q && typeof q.id === "string" && (q.kind === "input" || q.kind === "freight") && typeof q.name === "string" && typeof q.seller === "string" && typeof q.unit === "string" && Number.isFinite(q.amount) && q.amount >= 0 && q.amount < 1e9 && typeof q.route === "string" && typeof q.date === "string" && typeof q.source === "string").slice(0, 100) : null;

const inputCls = "mt-1 block min-h-[44px] w-full rounded-xl border border-stone-200 bg-white px-3 text-[15px] focus-visible:border-green-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600/30";

/**
 * Farm inputs and transport: web search (unverified, with sources) plus the farmer's own quotes.
 * Nothing here is a confirmed price; quotes stay on this device.
 */
export function HaatMarket() {
  const [quotes, setQuotes] = usePersistentState<Quote[]>(storageKey("haatbazar", "marketQuotes.v1"), [], clean);
  const [kind, setKind] = useState<"input" | "freight">("input");
  const [name, setName] = useState(""); const [seller, setSeller] = useState(""); const [unit, setUnit] = useState("বস্তা"); const [amount, setAmount] = useState(""); const [route, setRoute] = useState(""); const [source, setSource] = useState("");
  const [query, setQuery] = useState(""); const [results, setResults] = useState(""); const [sources, setSources] = useState<Source[]>([]); const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  const canAdd = name.trim() && seller.trim() && Number(amount) > 0;
  const add = () => { const n = Number(amount); if (!name.trim() || !seller.trim() || !Number.isFinite(n) || n <= 0) return; setQuotes((q) => [{ id: crypto.randomUUID(), kind, name: name.trim(), seller: seller.trim(), unit: kind === "freight" ? "৳/ট্রাক" : unit, amount: n, route: route.trim(), date: todayLocal(), source: source.trim() }, ...q].slice(0, 100)); setName(""); setSeller(""); setAmount(""); setRoute(""); setSource(""); };
  const search = async () => { if (query.trim().length < 2) return; setBusy(true); setError(""); setResults(""); setSources([]); try { const r = await fetch("/api/haatbazar/market", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ kind, query: query.trim() }) }); const d = await r.json(); if (!r.ok) throw new Error(d.error || "খোঁজ পাওয়া যায়নি।"); setResults(d.answer); setSources(d.sources || []); } catch (e) { setError(e instanceof Error ? e.message : "আবার চেষ্টা করুন।"); } finally { setBusy(false); } };
  const rows = quotes.filter((q) => q.kind === kind);
  const tab = (k: "input" | "freight", label: string, icon: React.ReactNode) => (
    <button
      type="button"
      onClick={() => setKind(k)}
      aria-pressed={kind === k}
      className={`inline-flex min-h-[44px] items-center gap-1.5 rounded-full px-4 text-[14px] font-bold transition-colors ${kind === k ? "bg-green-800 text-white shadow-sm" : "bg-stone-100 text-stone-800 hover:bg-stone-200"} min-w-[44px]`}
    >
      {icon}{label}
    </button>
  );

  return (
    <section id="farm-market" aria-labelledby="farm-market-h" className="hb-card space-y-5 p-5 sm:p-6">
      <div className="flex items-start gap-3">
        <span className="hb-icon-tile"><ShoppingBasket size={20} aria-hidden /></span>
        <div>
          <h2 id="farm-market-h" className="text-[18px] font-bold leading-tight">কৃষি বাজার ও পরিবহন</h2>
          <p className="mt-1 text-[13px] text-stone-600">সার, বীজ, যন্ত্রপাতি ও ট্রাকের সরবরাহকারী খুঁজুন; নিজের পাওয়া quote পাশাপাশি রাখুন। দাম ও ভাড়া বিক্রেতার কাছে যাচাই করুন।</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {tab("input", "কৃষি পণ্য", <ShoppingBasket size={15} aria-hidden />)}
        {tab("freight", "ট্রাক/পরিবহন", <Truck size={15} aria-hidden />)}
      </div>

      <div className="rounded-2xl border border-stone-200 bg-stone-50/60 p-4">
        <label htmlFor="market-search" className="flex items-center gap-1.5 text-[13px] font-bold text-stone-800"><Globe2 size={15} aria-hidden /> ওয়েবে খুঁজুন</label>
        <div className="mt-2 grid gap-2 sm:grid-cols-[1fr_auto]">
          <input id="market-search" value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => e.key === "Enter" && void search()} placeholder={kind === "input" ? "যেমন: বগুড়ায় আলুর বীজ, ইউরিয়া সার" : "যেমন: বগুড়া থেকে ঢাকা ৫ টন ট্রাক ভাড়া"} className="min-h-[44px] rounded-xl border border-stone-300 bg-white px-3 text-[15px] focus-visible:border-green-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600/30" />
          <button onClick={() => void search()} disabled={busy} className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl bg-green-800 px-5 font-bold text-white hover:bg-green-900 disabled:opacity-50 min-w-[44px]">
            {busy ? <Loader2 size={16} className="animate-spin motion-reduce:animate-none" aria-hidden /> : <Search size={16} aria-hidden />}{busy ? "খুঁজছি…" : "ওয়েবে খুঁজুন"}
          </button>
        </div>
        <p className="mt-2 text-[12px] text-stone-500">ওয়েব খোঁজের ফল যাচাই করা নয় — উৎস দেখে বিক্রেতার সঙ্গে নিশ্চিত হোন।</p>
        {error && <p role="alert" className="mt-3 rounded-xl bg-amber-50 p-3 text-[13px] text-amber-950">{error}</p>}
        {results && (
          <div className="hb-reveal mt-3 rounded-xl border border-green-200 bg-white p-4" aria-live="polite">
            <p className="whitespace-pre-wrap text-[14px] leading-relaxed">{results}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {sources.map((s) => <a key={s.url} href={s.url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-[36px] items-center gap-1 rounded-full border border-green-200 bg-green-50 px-3 text-[12px] font-semibold text-green-900 min-h-[44px] min-w-[44px]">{s.title}<ExternalLink size={12} aria-hidden /></a>)}
            </div>
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-stone-200 p-4">
        <h3 className="text-[15px] font-bold">আপনার quote যোগ করুন</h3>
        <div className="mt-2 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <label className="text-[12.5px] font-bold text-stone-700">{kind === "input" ? "পণ্য/সার/বীজের নাম" : "গাড়ি/সেবার ধরন"}<input value={name} onChange={(e) => setName(e.target.value)} placeholder={kind === "input" ? "যেমন: আলুর বীজ" : "যেমন: ৫ টন ট্রাক"} className={inputCls} /></label>
          <label className="text-[12.5px] font-bold text-stone-700">দোকান/সরবরাহকারী/চালক<input value={seller} onChange={(e) => setSeller(e.target.value)} className={inputCls} /></label>
          <label className="text-[12.5px] font-bold text-stone-700">দাম (৳)<input type="number" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} className={`${inputCls} font-mono min-h-[44px]`} /></label>
          {kind === "input" && <label className="text-[12.5px] font-bold text-stone-700">একক<input value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="বস্তা/কেজি/লিটার" className={inputCls} /></label>}
          <label className="text-[12.5px] font-bold text-stone-700">{kind === "input" ? "এলাকা/ডেলিভারি শর্ত" : "রুট ও ধারণক্ষমতা"}<input value={route} onChange={(e) => setRoute(e.target.value)} className={inputCls} /></label>
          <label className="text-[12.5px] font-bold text-stone-700">উৎস (ঐচ্ছিক)<input value={source} onChange={(e) => setSource(e.target.value)} placeholder="ফোন/ওয়েব/দোকান" className={inputCls} /></label>
        </div>
        <button onClick={add} disabled={!canAdd} className="mt-3 inline-flex min-h-[44px] items-center gap-1.5 rounded-xl bg-lime-100 px-4 text-[14px] font-bold text-green-950 hover:bg-lime-200 disabled:opacity-50 min-w-[44px]">
          <Plus size={16} aria-hidden />Quote রাখুন
        </button>
        <p className="mt-2 text-[12px] text-stone-500">আপনার quote শুধু এই ডিভাইসে থাকে। একই পণ্য ও একই এককের দামই তুলনা করুন। ১ মণ = {KG_PER_MAUND} কেজি।</p>
      </div>

      {rows.length > 0 && (
        <ul className="grid gap-2 sm:grid-cols-2">
          {rows.map((q) => (
            <li key={q.id} className="flex items-start justify-between gap-3 rounded-2xl border border-stone-200 bg-white p-3">
              <div className="min-w-0">
                <strong className="text-[14px]">{q.name}</strong>
                <p className="text-[13px] text-stone-600">{q.seller} · {q.route || "এলাকা/রুট দেওয়া নেই"}</p>
                <p className="mt-1 font-mono text-[15px] font-bold text-green-900">৳{q.amount.toLocaleString("en-BD")} <span className="font-sans text-[12px] font-semibold">{q.unit === "৳/ট্রাক" ? "/ ট্রাক" : `/ ${q.unit}`}</span></p>
                <p className="text-[12px] text-stone-500">{q.date}{q.source ? ` · ${q.source}` : ""}</p>
              </div>
              <button aria-label="Quote মুছুন" onClick={() => setQuotes((all) => all.filter((x) => x.id !== q.id))} className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-stone-500 hover:bg-red-50 hover:text-red-600"><Trash2 size={16} /></button>
            </li>
          ))}
        </ul>
      )}
      <p className="text-[12px] text-stone-500">এটি কেনাকাটা বা বুকিং সম্পন্ন করে না। মজুত, আসল দাম, পণ্যের নিবন্ধন/লেবেল, ডেলিভারি ও গাড়ির শর্ত সরাসরি যাচাই করুন; কীটনাশকের ব্যবহার কৃষি কর্মকর্তার পরামর্শ ও লেবেল অনুযায়ী করুন।</p>
    </section>
  );
}
