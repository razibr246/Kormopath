"use client";
import { useEffect, useMemo, useState } from "react";
import { Check, Plus, ShoppingBasket, Trash2, TrendingDown, TrendingUp } from "lucide-react";
import { SourceTag } from "@/components/layout/AppHeader";
import { usePersistentState, storageKey, todayLocal } from "@/lib/clientStore";
import {
  BAZAR_UNITS, EMPTY_BAZAR, MAX_ITEMS, QUICK_ITEMS, finishTrip, priceStats, sanitizeBazar, tripTotal,
  type BazarItem, type BazarState, type BazarUnit,
} from "@/lib/bazar";

const BN = "০১২৩৪৫৬৭৮৯";
const bnNum = (v: number | string) => String(v).replace(/\d/g, (d) => BN[Number(d)]);
const toAscii = (s: string) => s.replace(/[০-৯]/g, (d) => String(BN.indexOf(d)));
const taka = (poisha: number, bn: boolean) => {
  const t = (poisha / 100).toLocaleString("en-IN", { maximumFractionDigits: 2 });
  return `৳${bn ? bnNum(t) : t}`;
};
const newId = () => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`);
const BASE_LABEL = { kg: { bn: "কেজি", en: "kg" }, litre: { bn: "লিটার", en: "litre" }, piece: { bn: "পিস", en: "piece" } } as const;

// TCB's official commodity price list (checked: the page loads and is titled "টিসিবি'র পণ্য মূল্য তালিকা").
const TCB_URL = "https://tcb.gov.bd/pages/static-pages/6922dcfb933eb65569e13083";

/**
 * Bazar list and personal price tracker. Every price is one the user paid and typed in; the tracker only
 * compares the user's own entries. Finishing a trip hands a draft expense to the page, which the user confirms.
 */
export function BazarList({ onAddExpense }: { onAddExpense?: (e: { amountPoisha: number; note: string; date: string }) => void }) {
  const [lang, setLang] = useState<"bn" | "en">("bn");
  const bn = lang === "bn";
  const T = (b: string, e: string) => (bn ? b : e);
  const [state, setState] = usePersistentState<BazarState>(storageKey("shohoj", "bazar"), EMPTY_BAZAR, sanitizeBazar);
  const [today, setToday] = useState("");
  useEffect(() => { setToday(todayLocal()); }, []);
  const [name, setName] = useState("");
  const [qty, setQty] = useState("1");
  const [unit, setUnit] = useState<BazarUnit>("kg");
  const [priceDraft, setPriceDraft] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState("");

  const flash = (m: string) => { setMsg(m); window.setTimeout(() => setMsg(""), 3000); };
  const add = (n: string, q: number, u: BazarUnit) => {
    const clean = n.normalize("NFC").trim().slice(0, 60);
    if (!clean || !(q > 0)) return;
    setState((s) => (s.items.length >= MAX_ITEMS ? s : { ...s, items: [...s.items, { id: newId(), name: clean, qty: q, unit: u, checked: false, pricePoisha: null }] }));
  };
  const update = (id: string, patch: Partial<BazarItem>) => setState((s) => ({ ...s, items: s.items.map((i) => (i.id === id ? { ...i, ...patch } : i)) }));
  const remove = (id: string) => setState((s) => ({ ...s, items: s.items.filter((i) => i.id !== id) }));
  const setPrice = (id: string, raw: string) => {
    setPriceDraft((d) => ({ ...d, [id]: raw }));
    const v = Number(toAscii(raw).replace(/[,\s৳]/g, ""));
    update(id, { pricePoisha: raw.trim() && Number.isFinite(v) && v >= 0 && v <= 1_000_000 ? Math.round(v * 100) : null });
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
    flash(onAddExpense
      ? T(`${bnNum(r.count)}টি জিনিসের ${taka(r.totalPoisha, true)} খরচ হিসাবে নিশ্চিত করতে পাঠানো হলো।`, `${r.count} items, ${taka(r.totalPoisha, false)}, sent to the ledger to confirm.`)
      : T("দাম সংরক্ষিত হয়েছে।", "Prices saved."));
  };

  return (
    <section aria-labelledby="bazar-h" data-testid="bazar-list" className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 id="bazar-h" className="flex items-center gap-1.5 text-[16px] font-bold"><ShoppingBasket size={17} aria-hidden /> {T("বাজারের তালিকা", "Bazar list")}</h2>
          <p className="mt-1 max-w-2xl text-[13px] leading-relaxed text-slate-600">
            {T("কী কিনবেন লিখে রাখুন, কেনার সময় টিক দিয়ে যে দাম দিলেন লিখুন। শেষে মোট খরচটি খাতায় নিশ্চিত করতে যাবে, আর আপনার দেওয়া দাম থেকেই দেখা যাবে কোন জিনিসের দাম বাড়ছে।",
              "List what to buy; at the market tick each item and type what you paid. The total goes to the ledger for you to confirm, and your own prices show which items are getting dearer.")}
          </p>
        </div>
        <button type="button" onClick={() => setLang(bn ? "en" : "bn")} className="kp-chip !h-8 !rounded-full !text-[12px] font-semibold" aria-label={bn ? "Switch to English" : "বাংলায় দেখুন"}>{bn ? "EN" : "বাং"}</button>
      </div>

      <div className="flex flex-wrap gap-1.5" aria-label={T("দ্রুত যোগ", "Quick add")}>
        {QUICK_ITEMS.map((q) => (
          <button key={q.bn} type="button" data-testid="bazar-chip" onClick={() => add(bn ? q.bn : q.en, 1, q.unit)} className="inline-flex min-h-[38px] items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-3 text-[13px] font-semibold text-slate-800 hover:border-emerald-400 hover:bg-emerald-50">
            <Plus size={13} aria-hidden /> {bn ? q.bn : q.en}
          </button>
        ))}
      </div>

      <form className="flex flex-wrap items-end gap-2" onSubmit={(e) => { e.preventDefault(); const q = Number(toAscii(qty)); add(name, q, unit); setName(""); setQty("1"); }}>
        <label className="min-w-[10rem] flex-1 text-[12px] font-semibold text-slate-600">{T("জিনিস", "Item")}
          <input id="bazar-name" value={name} maxLength={60} onChange={(e) => setName(e.target.value)} placeholder={T("যেমন: মিনিকেট চাল", "e.g. miniket rice")} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-[14px] font-normal outline-none focus:border-emerald-600" />
        </label>
        <label className="w-20 text-[12px] font-semibold text-slate-600">{T("পরিমাণ", "Qty")}
          <input id="bazar-qty" inputMode="decimal" value={qty} onChange={(e) => setQty(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-[14px] font-normal outline-none focus:border-emerald-600" />
        </label>
        <label className="text-[12px] font-semibold text-slate-600">{T("একক", "Unit")}
          <select id="bazar-unit" value={unit} onChange={(e) => setUnit(e.target.value as BazarUnit)} className="mt-1 block rounded-xl border border-slate-200 bg-white px-2 py-2.5 text-[14px] font-normal">
            {BAZAR_UNITS.map((u) => <option key={u.id} value={u.id}>{bn ? u.bn : u.en}</option>)}
          </select>
        </label>
        <button type="submit" data-testid="bazar-add" className="inline-flex min-h-[44px] items-center gap-1 rounded-xl bg-slate-900 px-4 text-[14px] font-bold text-white disabled:opacity-50" disabled={!name.trim()}><Plus size={16} aria-hidden /> {T("যোগ", "Add")}</button>
      </form>

      {state.items.length === 0 ? (
        <p className="rounded-xl bg-slate-50 px-3 py-3 text-[13px] text-slate-600">{T("তালিকা খালি। উপরের চিপ চাপুন বা নিজে লিখুন।", "The list is empty. Tap a chip above or type an item.")}</p>
      ) : (
        <ul className="space-y-2" data-testid="bazar-items">
          {state.items.map((i) => {
            const unitLabel = BAZAR_UNITS.find((u) => u.id === i.unit)!;
            return (
              <li key={i.id} data-item={i.name} className={`flex flex-wrap items-center gap-2 rounded-xl border px-3 py-2 ${i.checked ? "border-emerald-300 bg-emerald-50/50" : "border-slate-200"}`}>
                <label className="flex min-h-[40px] min-w-0 flex-1 cursor-pointer items-center gap-2.5 text-[14.5px]">
                  <input type="checkbox" checked={i.checked} onChange={(e) => update(i.id, { checked: e.target.checked })} className="h-5 w-5 accent-emerald-700" />
                  <span className={`min-w-0 font-semibold ${i.checked ? "text-slate-500 line-through decoration-emerald-600/60" : "text-slate-900"}`}>{i.name}</span>
                  <span className="shrink-0 font-mono text-[12.5px] text-slate-500">{bn ? bnNum(i.qty) : i.qty} {bn ? unitLabel.bn : unitLabel.en}</span>
                </label>
                {i.checked && (
                  <label className="flex items-center gap-1 text-[12.5px] font-semibold text-slate-700">
                    {T("দাম ৳", "Paid ৳")}
                    <input inputMode="decimal" data-testid="bazar-price" aria-label={T(`${i.name}-এর দাম`, `Price paid for ${i.name}`)}
                      value={priceDraft[i.id] ?? (i.pricePoisha !== null ? String(i.pricePoisha / 100) : "")}
                      onChange={(e) => setPrice(i.id, e.target.value)}
                      className={`w-24 rounded-lg border px-2 py-1.5 text-[14px] font-normal outline-none focus:border-emerald-600 ${i.pricePoisha === null ? "border-amber-400 bg-amber-50" : "border-slate-200"}`} />
                  </label>
                )}
                <button type="button" onClick={() => remove(i.id)} aria-label={T(`${i.name} মুছুন`, `Remove ${i.name}`)} className="grid h-9 w-9 place-items-center rounded-lg text-slate-500 hover:bg-red-50 hover:text-red-700"><Trash2 size={15} aria-hidden /></button>
              </li>
            );
          })}
        </ul>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-3">
        <div className="text-[13.5px] text-slate-700">
          <span className="font-semibold">{T("এই বাজারে মোট", "This trip")}: </span>
          <span className="font-mono text-[16px] font-bold text-slate-900" data-testid="bazar-total">{taka(total, bn)}</span>
          {waiting > 0 && <span className="ml-2 text-[12.5px] font-semibold text-amber-800">{T(`${bnNum(waiting)}টির দাম বাকি`, `${waiting} still need a price`)}</span>}
        </div>
        <button type="button" data-testid="bazar-finish" onClick={finish} disabled={!ready || !today} className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl bg-emerald-700 px-4 text-[14px] font-bold text-white disabled:opacity-50">
          <Check size={16} aria-hidden /> {T("বাজার শেষ — খরচ খাতায় নিন", "Finish trip — add to ledger")}
        </button>
      </div>
      {msg && <p role="status" className="text-[13px] font-semibold text-emerald-800">{msg}</p>}

      <div className="border-t border-slate-200 pt-4">
        <h3 className="text-[14.5px] font-bold text-slate-900">{T("আপনার দেওয়া দামের হিসাব", "Prices you paid")}</h3>
        <p className="mt-0.5 text-[12.5px] text-slate-600">{T("শুধু আপনার নিজের লেখা দাম থেকে, প্রতি কেজি/লিটার/পিস হিসাবে। বাজারদর নয়।", "Only from prices you entered, per kg/litre/piece. Not market rates.")}</p>
        {stats.length === 0 ? (
          <p className="mt-2 text-[13px] text-slate-500">{T("একটি বাজার শেষ করলে এখানে দাম জমতে থাকবে।", "Finish a trip and your prices start collecting here.")}</p>
        ) : (
          <div className="mt-2 overflow-x-auto">
            <table className="w-full min-w-[30rem] text-left text-[13px]" data-testid="bazar-stats">
              <thead className="text-[11.5px] uppercase tracking-wide text-slate-500">
                <tr><th className="py-1.5 pr-2">{T("জিনিস", "Item")}</th><th className="pr-2">{T("শেষ দাম", "Last")}</th><th className="pr-2">{T("৩০ দিনের গড়", "30-day avg")}</th><th>{T("আগের মাসের তুলনায়", "vs last month")}</th></tr>
              </thead>
              <tbody>
                {stats.slice(0, 20).map((s) => {
                  const per = bn ? BASE_LABEL[s.unit].bn : BASE_LABEL[s.unit].en;
                  return (
                    <tr key={`${s.key}|${s.unit}`} className="border-t border-slate-100" data-stat={s.key}>
                      <td className="py-2 pr-2 font-semibold text-slate-900">{s.name}</td>
                      <td className="pr-2 font-mono">{taka(s.lastPoisha, bn)}/{per}</td>
                      <td className="pr-2 font-mono">{s.avg30Poisha !== null ? `${taka(s.avg30Poisha, bn)}/${per}` : "—"}</td>
                      <td className="font-mono">
                        {s.changePct === null ? <span className="text-slate-400">—</span> : (
                          <span className={`inline-flex items-center gap-1 font-bold ${s.changePct > 0 ? "text-red-700" : s.changePct < 0 ? "text-emerald-700" : "text-slate-600"}`}>
                            {s.changePct > 0 ? <TrendingUp size={13} aria-hidden /> : s.changePct < 0 ? <TrendingDown size={13} aria-hidden /> : null}
                            {s.changePct > 0 ? "+" : ""}{bn ? bnNum(s.changePct) : s.changePct}%
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
          <span className="text-[12.5px] text-slate-600">{T("সরকারি দামের সঙ্গে মিলিয়ে দেখুন:", "Compare with official prices:")}</span>
          <SourceTag confidence="official" label={T("টিসিবি: ঢাকার দৈনিক খুচরা বাজারদর", "TCB: daily Dhaka retail prices")} url={TCB_URL} checked="2026-11-17" />
        </div>
      </div>
    </section>
  );
}
