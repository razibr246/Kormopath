"use client";
import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, ClipboardCopy, HandCoins, MessageSquareText, Plus, Trash2, X } from "lucide-react";
import { usePersistentState, storageKey } from "@/lib/clientStore";
import {
  MAX_DHAR_ENTRIES, addSettlement, dharTotals, formatTaka, perPerson, remainingPoisha, sanitizeDhar, settledPoisha,
  settlementSlip, smsHref, takaToPoisha, todayDhaka, validateEntry, whatsappHref,
  type DharDirection, type DharEntry, type NewEntryInput,
} from "@/lib/dhar";

const bnNum = (v: number | string) => String(v).replace(/\d/g, (d) => "০১২৩৪৫৬৭৮৯"[Number(d)]);
const uid = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
const EMPTY = (today: string): NewEntryInput => ({ direction: "receivable", counterparty: "", phone: "", amount: "", date: today, due: "", note: "" });
const input = "mt-1 w-full min-h-[44px] rounded-xl border border-slate-300 px-3 py-2 text-[15px]";

/**
 * দেনা-পাওনা: money lent (আমি পাব) and shop baki / borrowed money (আমি দেব), kept apart from spending.
 * New entries are reviewed before saving; payments are only ever added; a slip is shared only when the user sends it.
 */
export function DharLedger() {
  const [lang, setLang] = useState<"bn" | "en">("bn");
  const bn = lang === "bn";
  const T = (b: string, e: string) => (bn ? b : e);
  const [entries, setEntries] = usePersistentState<DharEntry[]>(storageKey("shohoj", "dhar"), [], sanitizeDhar);
  const [today, setToday] = useState("");
  useEffect(() => { setToday(todayDhaka()); }, []);
  const [form, setForm] = useState<NewEntryInput>(EMPTY(""));
  useEffect(() => { if (today && !form.date) setForm((f) => ({ ...f, date: today })); }, [today, form.date]);
  const [review, setReview] = useState<Omit<DharEntry, "id" | "createdAt"> | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [payFor, setPayFor] = useState<string | null>(null);
  const [payAmount, setPayAmount] = useState("");
  const [payNote, setPayNote] = useState("");
  const [payErr, setPayErr] = useState("");
  const [slipFor, setSlipFor] = useState<string | null>(null);
  const [msg, setMsg] = useState("");
  const [showSettled, setShowSettled] = useState(false);

  const money = (p: number) => formatTaka(p, bn);
  const totals = useMemo(() => dharTotals(entries, today || "9999-12-31"), [entries, today]);
  const people = useMemo(() => perPerson(entries), [entries]);
  const flash = (m: string) => { setMsg(m); window.setTimeout(() => setMsg(""), 2500); };
  const set = <K extends keyof NewEntryInput>(k: K, v: NewEntryInput[K]) => setForm((f) => ({ ...f, [k]: v }));

  const ERR: Record<string, [string, string]> = {
    name: ["নাম লিখুন (৬০ অক্ষরের মধ্যে)", "Enter a name (up to 60 characters)"],
    phone: ["ফোন নম্বর ঠিক নেই (০১XXXXXXXXX)", "Phone number is not valid (01XXXXXXXXX)"],
    amount: ["টাকার পরিমাণ ঠিক নেই", "Amount is not valid"],
    date: ["তারিখ ঠিক নেই", "Date is not valid"],
    due: ["শেষ তারিখ শুরুর তারিখের আগে হতে পারে না", "Due date cannot be before the start date"],
  };

  const startReview = () => {
    const v = validateEntry(form);
    if (!v.ok) { setErrors(v.errors); setReview(null); return; }
    if (entries.length >= MAX_DHAR_ENTRIES) { setErrors([]); flash(T("খাতা ভরে গেছে — মিটে যাওয়া হিসাব মুছে জায়গা করুন", "The book is full — delete settled entries first")); return; }
    setErrors([]); setReview(v.entry);
  };
  const save = () => {
    if (!review) return;
    setEntries([{ ...review, id: uid(), createdAt: Date.now() }, ...entries]);
    setReview(null); setForm(EMPTY(today));
    flash(T("হিসাব এই ফোনে সংরক্ষিত হয়েছে", "Saved on this phone"));
  };

  const pay = (e: DharEntry) => {
    const p = takaToPoisha(payAmount);
    if (p === null) { setPayErr(T("টাকার পরিমাণ ঠিক নেই", "Amount is not valid")); return; }
    const r = addSettlement(e, { id: uid(), date: today, amountPoisha: p, note: payNote.trim() });
    if (!r.ok) { setPayErr(r.reason === "more_than_remaining" ? T(`বাকি আছে ${money(remainingPoisha(e))} — এর বেশি নয়`, `Only ${money(remainingPoisha(e))} is open`) : T("যোগ করা গেল না", "Could not add")); return; }
    setEntries(entries.map((x) => (x.id === e.id ? r.entry : x)));
    setPayFor(null); setPayAmount(""); setPayNote(""); setPayErr("");
    flash(remainingPoisha(r.entry) ? T("পরিশোধ যোগ হয়েছে", "Payment added") : T("হিসাব মিটে গেছে", "Settled in full"));
  };
  const remove = (e: DharEntry) => {
    const txt = T(`${e.counterparty}-এর এই হিসাব (${money(e.principalPoisha)}) আর এর সব পরিশোধ মুছে ফেলবেন?`, `Delete this entry for ${e.counterparty} (${money(e.principalPoisha)}) and all its payments?`);
    if (window.confirm(txt)) setEntries(entries.filter((x) => x.id !== e.id));
  };

  const slip = slipFor ? settlementSlip(entries, slipFor, lang, today) : "";
  const slipPerson = people.find((p) => p.key === slipFor) ?? null;
  const copy = async () => {
    try { await navigator.clipboard.writeText(slip); flash(T("কপি হয়েছে", "Copied")); }
    catch { flash(T("কপি করা যায়নি", "Could not copy")); }
  };

  const open = entries.filter((e) => remainingPoisha(e) > 0);
  const settled = entries.filter((e) => remainingPoisha(e) === 0);
  const row = (e: DharEntry) => {
    const r = remainingPoisha(e);
    const late = !!e.due && r > 0 && today && e.due < today;
    const recv = e.direction === "receivable";
    return (
      <li key={e.id} data-testid="dhar-entry" data-direction={e.direction} className={`rounded-xl border p-3 ${late ? "border-red-300 bg-red-50/60" : "border-slate-200 bg-white"}`}>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[15.5px] font-bold text-slate-900">{e.counterparty} <span className={`ml-1 rounded-full px-2 py-0.5 text-[12px] font-semibold ${recv ? "bg-emerald-100 text-emerald-900" : "bg-orange-100 text-orange-900"}`}>{recv ? T("আমি পাব", "I get") : T("আমি দেব", "I pay")}</span></p>
            <p className="mt-0.5 text-[13px] text-slate-600">{bn ? bnNum(e.date) : e.date}{e.due ? ` · ${T("শেষ তারিখ", "due")} ${bn ? bnNum(e.due) : e.due}` : ""}{e.note ? ` · ${e.note}` : ""}</p>
            {late && <p className="mt-1 flex items-center gap-1 text-[13px] font-semibold text-red-700"><AlertTriangle size={14} aria-hidden /> {T("শেষ তারিখ পেরিয়ে গেছে", "Past the due date")}</p>}
          </div>
          <div className="text-right">
            <p className="font-mono text-[18px] font-bold text-slate-900" data-testid="dhar-remaining">{money(r)}</p>
            {settledPoisha(e) > 0 && <p className="text-[12px] text-slate-500">{T(`মোট ${money(e.principalPoisha)}, শোধ ${money(settledPoisha(e))}`, `of ${money(e.principalPoisha)}, paid ${money(settledPoisha(e))}`)}</p>}
          </div>
        </div>
        {e.settlements.length > 0 && (
          <ul className="mt-2 space-y-0.5 border-t border-slate-100 pt-2 text-[13px] text-slate-600">
            {e.settlements.map((s) => <li key={s.id}>{bn ? bnNum(s.date) : s.date} · {T("পরিশোধ", "paid")} {money(s.amountPoisha)}{s.note ? ` · ${s.note}` : ""}</li>)}
          </ul>
        )}
        <div className="mt-2 flex flex-wrap gap-2">
          {r > 0 && payFor !== e.id && <button type="button" onClick={() => { setPayFor(e.id); setPayAmount(""); setPayErr(""); }} className="kp-chip !min-h-[44px] font-semibold"><HandCoins size={15} aria-hidden /> {recv ? T("টাকা পেলাম", "Got paid") : T("টাকা দিলাম", "I paid")}</button>}
          <button type="button" onClick={() => setSlipFor(e.phone || e.counterparty.trim().toLowerCase().replace(/\s+/g, " "))} className="kp-chip !min-h-[44px]"><MessageSquareText size={15} aria-hidden /> {T("হিসাবের স্লিপ", "Statement")}</button>
          <button type="button" onClick={() => remove(e)} className="kp-chip !min-h-[44px] text-red-700" aria-label={T(`${e.counterparty}-এর হিসাব মুছুন`, `Delete entry for ${e.counterparty}`)}><Trash2 size={15} aria-hidden /></button>
        </div>
        {payFor === e.id && (
          <div className="mt-2 grid gap-2 rounded-xl bg-slate-50 p-3 sm:grid-cols-[1fr_1fr_auto_auto]">
            <label className="text-[13px] font-semibold text-slate-700">{T("কত টাকা", "Amount")}<input inputMode="decimal" value={payAmount} onChange={(x) => setPayAmount(x.target.value)} className={input} placeholder={bn ? `সর্বোচ্চ ${bnNum((r / 100).toString())}` : `max ${r / 100}`} data-testid="dhar-pay-amount" /></label>
            <label className="text-[13px] font-semibold text-slate-700">{T("নোট (ঐচ্ছিক)", "Note (optional)")}<input value={payNote} maxLength={120} onChange={(x) => setPayNote(x.target.value)} className={input} placeholder={T("যেমন: বিকাশে", "e.g. by bKash")} /></label>
            <button type="button" onClick={() => pay(e)} className="self-end min-h-[44px] rounded-xl bg-slate-900 px-4 text-[14px] font-bold text-white" data-testid="dhar-pay-save">{T("যোগ করুন", "Add")}</button>
            <button type="button" onClick={() => setPayFor(null)} className="self-end min-h-[44px] rounded-xl border border-slate-300 px-3 text-[14px]">{T("বাতিল", "Cancel")}</button>
            {payErr && <p className="text-[13px] font-semibold text-red-700 sm:col-span-4" role="alert">{payErr}</p>}
          </div>
        )}
      </li>
    );
  };

  return (
    <section data-testid="dhar-ledger" aria-labelledby="dhar-h" className="scroll-mt-24 space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 id="dhar-h" className="flex items-center gap-2 text-[18px] font-bold text-slate-900"><HandCoins size={20} className="text-emerald-700" aria-hidden /> {T("দেনা-পাওনা (ধার ও বাকি)", "Dues: lent and owed")}</h2>
          <p className="mt-1 text-[13.5px] text-slate-600">{T("ধার দেওয়া টাকা খরচ নয় — ফেরত পাওয়ার টাকা, তাই খরচের হিসাবে যোগ হয় না।", "Money you lend is not spending — you get it back, so it is kept out of your expenses.")}</p>
        </div>
        <button type="button" onClick={() => setLang(bn ? "en" : "bn")} className="kp-chip !h-8 !rounded-full !text-[12px] font-semibold" aria-label={bn ? "Switch to English" : "বাংলায় দেখুন"}>{bn ? "EN" : "বাং"}</button>
      </div>

      <div className="grid gap-2 sm:grid-cols-3" data-testid="dhar-totals">
        <div className="rounded-xl bg-emerald-50 p-3"><p className="text-[13px] font-semibold text-emerald-900">{T("আমি পাব", "To receive")}</p><p className="font-mono text-[20px] font-bold text-emerald-900" data-testid="dhar-receive">{money(totals.receivePoisha)}</p></div>
        <div className="rounded-xl bg-orange-50 p-3"><p className="text-[13px] font-semibold text-orange-900">{T("আমি দেব", "To pay")}</p><p className="font-mono text-[20px] font-bold text-orange-900" data-testid="dhar-pay">{money(totals.payPoisha)}</p></div>
        <div className="rounded-xl bg-slate-50 p-3"><p className="text-[13px] font-semibold text-slate-700">{T("নিট", "Net")}</p><p className="font-mono text-[20px] font-bold text-slate-900" data-testid="dhar-net">{money(totals.netPoisha)}</p></div>
      </div>
      {totals.overdue.length > 0 && (
        <p className="flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-[14px] font-semibold text-red-800" data-testid="dhar-overdue">
          <AlertTriangle size={16} aria-hidden /> {T(`${bnNum(totals.overdue.length)}টি হিসাবের শেষ তারিখ পেরিয়েছে: ${totals.overdue.map((e) => e.counterparty).join(", ")}`, `${totals.overdue.length} past due: ${totals.overdue.map((e) => e.counterparty).join(", ")}`)}
        </p>
      )}

      {/* New entry, reviewed before saving */}
      <div className="rounded-xl border border-slate-200 p-3">
        <p className="text-[15px] font-bold text-slate-900">{T("নতুন হিসাব", "New entry")}</p>
        <div className="mt-2 flex flex-wrap gap-2" role="radiogroup" aria-label={T("ধরন", "Type")}>
          {(["receivable", "payable"] as DharDirection[]).map((d) => (
            <button key={d} type="button" role="radio" aria-checked={form.direction === d} onClick={() => set("direction", d)} data-testid={`dhar-dir-${d}`}
              className={`min-h-[44px] rounded-xl border px-4 text-[14.5px] font-semibold ${form.direction === d ? (d === "receivable" ? "border-emerald-600 bg-emerald-50 text-emerald-900" : "border-orange-500 bg-orange-50 text-orange-900") : "border-slate-300 bg-white text-slate-700"}`}>
              {d === "receivable" ? T("আমি পাব (ধার দিলাম)", "I get (I lent)") : T("আমি দেব (বাকি / ধার নিলাম)", "I pay (baki / borrowed)")}
            </button>
          ))}
        </div>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          <label className="text-[13px] font-semibold text-slate-700">{T("কার সাথে (নাম বা দোকান)", "With whom (name or shop)")}<input value={form.counterparty} maxLength={60} onChange={(x) => set("counterparty", x.target.value)} className={input} data-testid="dhar-name" placeholder={T("যেমন: রাকিব / করিম স্টোর", "e.g. Rakib / Karim Store")} /></label>
          <label className="text-[13px] font-semibold text-slate-700">{T("টাকা", "Amount (৳)")}<input inputMode="decimal" value={form.amount} onChange={(x) => set("amount", x.target.value)} className={input} data-testid="dhar-amount" placeholder="৫০০" /></label>
          <label className="text-[13px] font-semibold text-slate-700">{T("ফোন (ঐচ্ছিক)", "Phone (optional)")}<input inputMode="tel" value={form.phone} onChange={(x) => set("phone", x.target.value)} className={input} data-testid="dhar-phone" placeholder="01XXXXXXXXX" /></label>
          <label className="text-[13px] font-semibold text-slate-700">{T("নোট (ঐচ্ছিক)", "Note (optional)")}<input value={form.note} maxLength={160} onChange={(x) => set("note", x.target.value)} className={input} placeholder={T("যেমন: বিকাশে দিলাম", "e.g. sent by bKash")} /></label>
          <label className="text-[13px] font-semibold text-slate-700">{T("তারিখ", "Date")}<input type="date" value={form.date} max={today || undefined} onChange={(x) => set("date", x.target.value)} className={input} /></label>
          <label className="text-[13px] font-semibold text-slate-700">{T("ফেরতের শেষ তারিখ (ঐচ্ছিক)", "Due date (optional)")}<input type="date" value={form.due} min={form.date || undefined} onChange={(x) => set("due", x.target.value)} className={input} /></label>
        </div>
        {errors.length > 0 && <ul className="mt-2 space-y-0.5 text-[13px] font-semibold text-red-700" role="alert">{errors.map((k) => <li key={k}>• {ERR[k]?.[bn ? 0 : 1]}</li>)}</ul>}
        <button type="button" onClick={startReview} className="mt-3 inline-flex min-h-[46px] items-center gap-2 rounded-xl bg-slate-900 px-4 text-[15px] font-bold text-white" data-testid="dhar-review"><Plus size={17} aria-hidden /> {T("দেখে নিন", "Review")}</button>

        {review && (
          <div className="mt-3 rounded-xl border-2 border-emerald-500 bg-emerald-50/50 p-3" data-testid="dhar-confirm">
            <p className="text-[15px] font-bold text-slate-900">{T("ঠিক আছে কি না দেখে নিশ্চিত করুন", "Check, then confirm")}</p>
            <p className="mt-1 text-[15px] text-slate-800">
              {review.direction === "receivable" ? T(`${review.counterparty}-এর কাছে আমি পাব`, `${review.counterparty} owes me`) : T(`${review.counterparty}-কে আমি দেব`, `I owe ${review.counterparty}`)}{" "}
              <span className="font-mono font-bold">{money(review.principalPoisha)}</span>
              {review.due ? T(` · শেষ তারিখ ${bnNum(review.due)}`, ` · due ${review.due}`) : ""}{review.phone ? ` · ${review.phone}` : ""}
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <button type="button" onClick={save} className="min-h-[44px] rounded-xl bg-emerald-700 px-4 text-[14.5px] font-bold text-white" data-testid="dhar-save">{T("সংরক্ষণ করুন", "Save")}</button>
              <button type="button" onClick={() => setReview(null)} className="min-h-[44px] rounded-xl border border-slate-300 bg-white px-4 text-[14.5px]">{T("ঠিক করব", "Edit")}</button>
            </div>
          </div>
        )}
      </div>
      {msg && <p role="status" className="text-[14px] font-semibold text-emerald-800">{msg}</p>}

      {people.length > 0 && (
        <div>
          <p className="text-[14px] font-bold text-slate-800">{T("জনপ্রতি", "By person")}</p>
          <ul className="mt-1 flex flex-wrap gap-2" data-testid="dhar-people">
            {people.map((p) => (
              <li key={p.key}>
                <button type="button" onClick={() => setSlipFor(p.key)} className={`min-h-[44px] rounded-xl border px-3 text-[14px] ${p.netPoisha >= 0 ? "border-emerald-200 bg-emerald-50 text-emerald-900" : "border-orange-200 bg-orange-50 text-orange-900"}`}>
                  {p.name}: <span className="font-mono font-bold">{money(Math.abs(p.netPoisha))}</span> {p.netPoisha >= 0 ? T("পাব", "to get") : T("দেব", "to pay")}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {slipFor && slip && (
        <div className="rounded-xl border border-slate-300 bg-slate-50 p-3" data-testid="dhar-slip">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[14.5px] font-bold text-slate-900">{T("হিসাবের স্লিপ — আপনি নিজে পাঠাবেন", "Statement — you send it yourself")}</p>
            <button type="button" onClick={() => setSlipFor(null)} className="kp-chip !min-h-[40px]" aria-label={T("বন্ধ করুন", "Close")}><X size={15} aria-hidden /></button>
          </div>
          <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap rounded-lg bg-white p-3 text-[13px] leading-relaxed text-slate-800">{slip}</pre>
          <div className="mt-2 flex flex-wrap gap-2">
            <button type="button" onClick={copy} className="kp-chip !min-h-[44px]"><ClipboardCopy size={15} aria-hidden /> {T("কপি", "Copy")}</button>
            {slipPerson?.phone && <a href={smsHref(slipPerson.phone, slip)} className="kp-chip !min-h-[44px]" data-testid="dhar-sms">{T("এসএমএস", "SMS")}</a>}
            <a href={whatsappHref(slip, slipPerson?.phone ?? "")} target="_blank" rel="noopener noreferrer" className="kp-chip !min-h-[44px]" data-testid="dhar-wa">WhatsApp</a>
          </div>
          <p className="mt-1 text-[12.5px] text-slate-600">{T("কিছুই নিজে থেকে পাঠানো হয় না; বোতাম চাপলে আপনার ফোনের অ্যাপ খুলবে।", "Nothing is sent automatically; the buttons only open your own app.")}</p>
        </div>
      )}

      {open.length > 0 ? <ul className="space-y-2" data-testid="dhar-open">{open.map(row)}</ul>
        : <p className="text-[14px] text-slate-600">{T("কোনো খোলা হিসাব নেই।", "No open entries.")}</p>}
      {settled.length > 0 && (
        <div>
          <button type="button" onClick={() => setShowSettled((v) => !v)} className="kp-chip !min-h-[44px]">{showSettled ? T("মিটে যাওয়া লুকান", "Hide settled") : T(`মিটে যাওয়া হিসাব (${bnNum(settled.length)})`, `Settled entries (${settled.length})`)}</button>
          {showSettled && <ul className="mt-2 space-y-2 opacity-80">{settled.map(row)}</ul>}
        </div>
      )}
      <p className="text-[12.5px] text-slate-600">{T("হিসাব শুধু এই ফোনে থাকে। পরিশোধ শুধু যোগ হয়, আগের লেখা বদলানো যায় না; ভুল হলে পুরো হিসাব মুছে আবার লিখুন।", "Kept only on this phone. Payments are only added, never edited; if something is wrong, delete the entry and write it again.")}</p>
    </section>
  );
}
