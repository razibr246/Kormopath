"use client";
import { useEffect, useMemo, useState } from "react";
import { ArrowRightLeft, Check, Pencil, Trash2, Wallet, X } from "lucide-react";
import { SourceTag } from "@/components/layout/AppHeader";
import { usePersistentState, storageKey, todayLocal } from "@/lib/clientStore";
import { MFS_FEE_RATES, type MfsProvider, type Transaction } from "@/lib/budget";
import {
  EMPTY_WALLETS, WALLET_IDS, WALLET_LABELS, cashoutTotal, chargesInMonth, makeTransfer, maxCashout, sanitizeWallets, totalBalance, walletBalances,
  type TransferKind, type WalletId, type WalletTransfer, type WalletsState,
} from "@/lib/wallets";

const BN = "০১২৩৪৫৬৭৮৯";
const bnDigits = (s: string) => s.replace(/\d/g, (d) => BN[Number(d)]);
/** South Asian grouping (12,50,000) with Bangla or Latin digits. */
const taka = (poisha: number, bn: boolean) => {
  const s = (poisha / 100).toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  return `৳${bn ? bnDigits(s) : s}`;
};
const toPoisha = (v: string) => { const n = Number(v.replace(/,/g, "")); return Number.isFinite(n) ? Math.round(n * 100) : NaN; };
const newId = () => `w${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

/** Cash-out rates offered per wallet (bKash, Nagad and Rocket have them in lib/budget.ts). */
const PROVIDERS_OF: Partial<Record<WalletId, MfsProvider[]>> = {
  bKash: ["bkash_ussd", "bkash_priyo", "bkash_app"],
  Nagad: ["nagad_app", "nagad_ussd"],
  Rocket: ["rocket_app", "rocket_atm"],
};

interface Draft { from: WalletId; to: WalletId; amount: string; kind: TransferKind; provider: MfsProvider | ""; date: string; note: string }

/**
 * হাতের টাকা ও ওয়ালেট: balances for cash, MFS wallets, bank and card, and transfers between them. A transfer is
 * money moving between the person's own wallets, so it is not counted as spending; only its fee is a charge.
 * Every cash-out rate shows where it came from, and the person can set their own.
 */
export function WalletsPanel({ txs }: { txs: Transaction[] }) {
  const [lang, setLang] = useState<"bn" | "en">("bn");
  const bn = lang === "bn";
  const T = (b: string, e: string) => (bn ? b : e);
  const [state, setState] = usePersistentState<WalletsState>(storageKey("shohoj", "wallets"), EMPTY_WALLETS, sanitizeWallets);
  const [today, setToday] = useState("");
  useEffect(() => { setToday(todayLocal()); }, []);
  const month = today.slice(0, 7);

  const balances = useMemo(() => walletBalances(state, txs), [state, txs]);
  const total = totalBalance(balances);
  const charges = month ? chargesInMonth(state.transfers, month) : { feePoisha: 0, count: 0 };
  const rateOf = (p: MfsProvider) => state.rateOverrides[p] ?? MFS_FEE_RATES[p].ratePct;

  // opening balances
  const [editOpen, setEditOpen] = useState(false);
  const [openDraft, setOpenDraft] = useState<Record<string, string>>({});
  const startOpenings = () => { setOpenDraft(Object.fromEntries(WALLET_IDS.map((w) => [w, String((state.openings[w] ?? 0) / 100)]))); setEditOpen(true); };
  const saveOpenings = () => {
    const openings: Partial<Record<WalletId, number>> = {};
    for (const w of WALLET_IDS) { const p = toPoisha(openDraft[w] ?? "0"); if (Number.isFinite(p) && p !== 0) openings[w] = p; }
    setState({ ...state, openings });
    setEditOpen(false);
  };

  // transfer form -> review -> save
  const [draft, setDraft] = useState<Draft>({ from: "bKash", to: "Cash", amount: "", kind: "cashout", provider: "bkash_ussd", date: "", note: "" });
  const [review, setReview] = useState<WalletTransfer | null>(null);
  const [err, setErr] = useState("");
  const providers = PROVIDERS_OF[draft.from] ?? [];
  const canCashout = providers.length > 0;
  const kind: TransferKind = canCashout ? draft.kind : "transfer";
  const provider = kind === "cashout" ? (providers.includes(draft.provider as MfsProvider) ? (draft.provider as MfsProvider) : providers[0]) : "";
  const rate = provider ? rateOf(provider) : 0;
  const amountP = toPoisha(draft.amount);
  const preview = Number.isFinite(amountP) && amountP > 0 ? cashoutTotal(amountP, kind === "cashout" ? rate : 0) : null;
  const most = kind === "cashout" && provider ? maxCashout(Math.max(0, balances[draft.from]), rate) : null;

  const toReview = () => {
    setErr("");
    const r = makeTransfer({ id: newId(), date: draft.date || today, from: draft.from, to: draft.to, amountPoisha: amountP, kind, ratePct: rate, provider: provider || "", note: draft.note, recordedAt: new Date().toISOString() });
    if (!r.ok) {
      setErr({ same_wallet: T("একই ওয়ালেটে পাঠানো যায় না", "From and to must differ"), bad_amount: T("সঠিক টাকার পরিমাণ লিখুন", "Enter a valid amount"), bad_date: T("তারিখ ঠিক নেই", "Check the date"), bad_rate: T("চার্জের হার ০ থেকে ১০% এর মধ্যে দিন", "Rate must be 0–10%") }[r.error]);
      return;
    }
    setReview(r.transfer);
  };
  const confirmSave = () => {
    if (!review) return;
    setState({ ...state, transfers: [...state.transfers, review] });
    setReview(null);
    setDraft({ ...draft, amount: "", note: "" });
  };
  const remove = (id: string) => { if (window.confirm(T("এই স্থানান্তর মুছবেন?", "Delete this transfer?"))) setState({ ...state, transfers: state.transfers.filter((t) => t.id !== id) }); };

  const setRate = (p: MfsProvider, v: string) => {
    const n = Number(v);
    const next = { ...state.rateOverrides };
    if (v.trim() === "" || !Number.isFinite(n)) delete next[p];
    else if (n >= 0 && n <= 10) next[p] = n;
    setState({ ...state, rateOverrides: next });
  };

  const L = (w: WalletId) => (bn ? WALLET_LABELS[w].bn : WALLET_LABELS[w].en);
  const recent = [...state.transfers].sort((a, b) => (b.date + b.recordedAt).localeCompare(a.date + a.recordedAt)).slice(0, 8);

  return (
    <section aria-labelledby="wallets-h" data-testid="wallets-panel" className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 id="wallets-h" className="flex items-center gap-1.5 text-[17px] font-bold text-slate-900"><Wallet size={18} aria-hidden /> {T("হাতের টাকা ও ওয়ালেট", "Cash and wallets")}</h2>
          <p className="mt-1 max-w-3xl text-[13px] leading-relaxed text-slate-600">
            {T("প্রতিটি ওয়ালেটে কত আছে। এক ওয়ালেট থেকে আরেকটিতে টাকা নেওয়া (যেমন বিকাশ থেকে ক্যাশ আউট) খরচ নয় — শুধু চার্জটুকু খরচ।",
              "What each wallet holds. Moving money between your own wallets (like a bKash cash-out) is not spending — only the charge is.")}
          </p>
        </div>
        <button type="button" onClick={() => setLang(bn ? "en" : "bn")} className="kp-chip !h-11 !rounded-full !text-[12px] font-semibold !min-w-[44px]" aria-label={bn ? "Switch to English" : "বাংলায় দেখুন"}>{bn ? "EN" : "বাং"}</button>
      </div>

      {/* balances */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" data-testid="wallet-balances">
        {WALLET_IDS.map((w) => (
          <div key={w} data-wallet={w} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
            <p className="text-[12px] font-semibold text-slate-600">{L(w)}</p>
            <p className={`font-mono text-[16px] font-bold ${balances[w] < 0 ? "text-red-700" : "text-slate-900"}`}>{taka(balances[w], bn)}</p>
          </div>
        ))}
        <div className="rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-2">
          <p className="text-[12px] font-semibold text-emerald-800">{T("সব মিলিয়ে", "All together")}</p>
          <p className="font-mono text-[16px] font-bold text-emerald-900" data-testid="wallet-total">{taka(total, bn)}</p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3 text-[13px]">
        <span className="rounded-full bg-amber-50 px-3 py-1 font-semibold text-amber-900" data-testid="wallet-charges">
          {T(`এই মাসের চার্জ: ${taka(charges.feePoisha, true)} (${bnDigits(String(charges.count))}টি)`, `Charges this month: ${taka(charges.feePoisha, false)} (${charges.count})`)}
        </span>
        <button type="button" onClick={startOpenings} className="inline-flex items-center gap-1 font-semibold text-emerald-800 underline-offset-2 hover:underline min-h-[44px] min-w-[44px]"><Pencil size={14} aria-hidden /> {T("শুরুর ব্যালান্স লিখুন", "Set opening balances")}</button>
      </div>
      <p className="text-[12px] text-slate-500">{T("ব্যালান্স = শুরুর ব্যালান্স + আয় − খরচ (মূল খাতায় যে মাধ্যমে লেখা) ± স্থানান্তর − চার্জ। নিজে লেখা হিসাব; ব্যাংক বা এমএফএস থেকে আনা নয়।", "Balance = opening + income − expense (by payment method in the main ledger) ± transfers − charges. Your own records, not read from any bank or MFS.")}</p>

      {editOpen && (
        <div className="space-y-2 rounded-xl border border-slate-200 p-3">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {WALLET_IDS.map((w) => (
              <label key={w} className="text-[12px] font-semibold text-slate-700">{L(w)}
                <input inputMode="decimal" value={openDraft[w] ?? ""} onChange={(e) => setOpenDraft({ ...openDraft, [w]: e.target.value })} className="mt-1 block w-full rounded-lg border border-slate-300 px-2 py-1.5 font-mono text-[14px] min-h-[44px]" />
              </label>
            ))}
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={saveOpenings} className="inline-flex min-h-[40px] items-center gap-1 rounded-lg bg-slate-900 px-3 text-[13px] font-bold text-white min-h-[44px] min-w-[44px]"><Check size={15} aria-hidden /> {T("সংরক্ষণ", "Save")}</button>
            <button type="button" onClick={() => setEditOpen(false)} className="inline-flex min-h-[40px] items-center gap-1 rounded-lg border border-slate-300 px-3 text-[13px] min-h-[44px] min-w-[44px]"><X size={15} aria-hidden /> {T("বাতিল", "Cancel")}</button>
          </div>
        </div>
      )}

      {/* transfer */}
      <div className="space-y-3 rounded-xl border border-slate-200 p-4">
        <h3 className="flex items-center gap-1.5 text-[15px] font-bold text-slate-900"><ArrowRightLeft size={16} aria-hidden /> {T("এক ওয়ালেট থেকে আরেকটিতে", "Move between wallets")}</h3>
        <div className="grid gap-2 sm:grid-cols-4">
          <label className="text-[12px] font-semibold text-slate-700">{T("থেকে", "From")}
            <select value={draft.from} onChange={(e) => setDraft({ ...draft, from: e.target.value as WalletId, provider: "" })} className="mt-1 block w-full rounded-lg border border-slate-300 px-2 py-1.5 text-[14px] min-h-[44px]" data-testid="wt-from">
              {WALLET_IDS.map((w) => <option key={w} value={w}>{L(w)}</option>)}
            </select>
          </label>
          <label className="text-[12px] font-semibold text-slate-700">{T("কোথায়", "To")}
            <select value={draft.to} onChange={(e) => setDraft({ ...draft, to: e.target.value as WalletId })} className="mt-1 block w-full rounded-lg border border-slate-300 px-2 py-1.5 text-[14px] min-h-[44px]" data-testid="wt-to">
              {WALLET_IDS.map((w) => <option key={w} value={w}>{L(w)}</option>)}
            </select>
          </label>
          <label className="text-[12px] font-semibold text-slate-700">{kind === "cashout" ? T("হাতে পাবেন (৳)", "Cash in hand (৳)") : T("পরিমাণ (৳)", "Amount (৳)")}
            <input inputMode="decimal" value={draft.amount} onChange={(e) => setDraft({ ...draft, amount: e.target.value })} className="mt-1 block w-full rounded-lg border border-slate-300 px-2 py-1.5 font-mono text-[14px] min-h-[44px]" data-testid="wt-amount" />
          </label>
          <label className="text-[12px] font-semibold text-slate-700">{T("তারিখ", "Date")}
            <input type="date" value={draft.date || today} max={today || undefined} onChange={(e) => setDraft({ ...draft, date: e.target.value })} className="mt-1 block w-full rounded-lg border border-slate-300 px-2 py-1.5 text-[14px] min-h-[44px]" />
          </label>
        </div>
        {canCashout && (
          <div className="flex flex-wrap gap-3 text-[13px]">
            <label className="inline-flex items-center gap-1.5 min-h-[44px]"><input type="radio" name="wt-kind" checked={kind === "cashout"} onChange={() => setDraft({ ...draft, kind: "cashout" })} /> {T("ক্যাশ আউট (চার্জ লাগে)", "Cash-out (has a charge)")}</label>
            <label className="inline-flex items-center gap-1.5 min-h-[44px]"><input type="radio" name="wt-kind" checked={kind === "transfer"} onChange={() => setDraft({ ...draft, kind: "transfer" })} /> {T("চার্জ ছাড়া স্থানান্তর", "Transfer without a charge")}</label>
          </div>
        )}
        {kind === "cashout" && provider && (
          <label className="block text-[12px] font-semibold text-slate-700">{T("কোন হারে", "Which rate")}
            <select value={provider} onChange={(e) => setDraft({ ...draft, provider: e.target.value as MfsProvider })} className="mt-1 block w-full rounded-lg border border-slate-300 px-2 py-1.5 text-[14px] min-h-[44px]" data-testid="wt-provider">
              {providers.map((p) => <option key={p} value={p}>{(bn ? MFS_FEE_RATES[p].nameBn : MFS_FEE_RATES[p].nameEn)}{state.rateOverrides[p] !== undefined ? T(` — আপনার হার ${state.rateOverrides[p]}%`, ` — your rate ${state.rateOverrides[p]}%`) : ""}</option>)}
            </select>
          </label>
        )}
        {preview && (
          <p className="rounded-lg bg-slate-50 px-3 py-2 text-[13.5px] text-slate-800" data-testid="wt-preview">
            {kind === "cashout"
              ? T(`হাতে ${taka(preview.receivePoisha, true)} পেতে ${L(draft.from)} থেকে কাটবে ${taka(preview.totalPoisha, true)} — চার্জ ${taka(preview.feePoisha, true)} (${bnDigits(String(rate))}%)।`,
                `To get ${taka(preview.receivePoisha, false)} in hand, ${L(draft.from)} pays ${taka(preview.totalPoisha, false)} — charge ${taka(preview.feePoisha, false)} (${rate}%).`)
              : T(`${L(draft.from)} থেকে ${L(draft.to)}-তে ${taka(preview.receivePoisha, true)}, কোনো চার্জ ধরা হয়নি।`, `${taka(preview.receivePoisha, false)} from ${L(draft.from)} to ${L(draft.to)}, no charge counted.`)}
            {most !== null && <span className="block text-[12px] text-slate-600">{T(`এই ব্যালান্সে চার্জসহ সর্বোচ্চ হাতে পাবেন ${taka(most, true)}।`, `With this balance the most you can get in hand is ${taka(most, false)}.`)}</span>}
          </p>
        )}
        <input aria-label={T("নোট (ঐচ্ছিক)", "Note (optional)")} value={draft.note} maxLength={120} onChange={(e) => setDraft({ ...draft, note: e.target.value })} placeholder={T("নোট (ঐচ্ছিক)", "Note (optional)")} className="block w-full rounded-lg border border-slate-300 px-2 py-1.5 text-[14px] min-h-[44px]" />
        {err && <p role="alert" className="text-[13px] font-semibold text-red-700">{err}</p>}
        {!review ? (
          <button type="button" onClick={toReview} disabled={!today} className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl bg-emerald-700 px-4 text-[14px] font-bold text-white disabled:opacity-50 min-w-[44px]" data-testid="wt-review">{T("দেখে নিন", "Review")}</button>
        ) : (
          <div className="space-y-2 rounded-xl border-2 border-emerald-500 bg-emerald-50/50 p-3" data-testid="wt-confirm">
            <p className="text-[14px] font-semibold text-slate-900">
              {T(`${L(review.from)} → ${L(review.to)}: ${taka(review.amountPoisha, true)}${review.feePoisha ? `, চার্জ ${taka(review.feePoisha, true)}` : ""}, ${bnDigits(review.date)}। ঠিক আছে?`,
                `${L(review.from)} → ${L(review.to)}: ${taka(review.amountPoisha, false)}${review.feePoisha ? `, charge ${taka(review.feePoisha, false)}` : ""}, ${review.date}. Is this right?`)}
            </p>
            <div className="flex gap-2">
              <button type="button" onClick={confirmSave} className="inline-flex min-h-[44px] items-center gap-1 rounded-xl bg-slate-900 px-4 text-[14px] font-bold text-white min-w-[44px]" data-testid="wt-save"><Check size={16} aria-hidden /> {T("হ্যাঁ, সংরক্ষণ করুন", "Yes, save")}</button>
              <button type="button" onClick={() => setReview(null)} className="inline-flex min-h-[44px] items-center gap-1 rounded-xl border border-slate-300 bg-white px-4 text-[14px] min-w-[44px]"><X size={16} aria-hidden /> {T("না, বদলাব", "No, edit")}</button>
            </div>
          </div>
        )}
      </div>

      {recent.length > 0 && (
        <ol className="space-y-1 text-[13px]" data-testid="wt-list">
          {recent.map((t) => (
            <li key={t.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-slate-50 px-3 py-2">
              <span><span className="font-mono">{bn ? bnDigits(t.date) : t.date}</span> · {L(t.from)} → {L(t.to)} · <span className="font-mono font-semibold">{taka(t.amountPoisha, bn)}</span>{t.feePoisha > 0 && <span className="text-amber-800"> · {T("চার্জ", "charge")} {taka(t.feePoisha, bn)}</span>}{t.note && <span className="text-slate-500"> · {t.note}</span>}</span>
              <button type="button" onClick={() => remove(t.id)} className="text-red-700 min-h-[44px] min-w-[44px]" aria-label={T("মুছুন", "Delete")}><Trash2 size={15} aria-hidden /></button>
            </li>
          ))}
        </ol>
      )}

      {/* rates and their sources */}
      <details className="rounded-xl border border-slate-200 p-3">
        <summary className="cursor-pointer text-[14px] font-semibold text-slate-800 min-h-[44px] min-w-[44px]">{T("ক্যাশ-আউট চার্জের হার ও উৎস — নিজের হার দিন", "Cash-out rates and sources — set your own")}</summary>
        <ul className="mt-3 space-y-3">
          {(Object.keys(MFS_FEE_RATES) as MfsProvider[]).map((p) => {
            const c = MFS_FEE_RATES[p];
            return (
              <li key={p} className="space-y-1" data-rate={p}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[13.5px] font-semibold text-slate-800">{bn ? c.nameBn : c.nameEn}</span>
                  <label className="inline-flex items-center gap-1 text-[12px] text-slate-600">{T("আপনার হার %", "Your rate %")}
                    <input inputMode="decimal" defaultValue={state.rateOverrides[p] ?? ""} placeholder={String(c.ratePct)} onBlur={(e) => setRate(p, e.target.value)} className="w-20 rounded-lg border border-slate-300 px-2 py-1 font-mono text-[13px] min-h-[44px]" aria-label={`${c.nameEn} rate`} />
                  </label>
                </div>
                {c.source
                  ? <SourceTag confidence="official" label={c.source.label} url={c.source.url} checked={c.source.checked} />
                  : <SourceTag confidence="unverified" label={T("যাচাই হয়নি", "Unverified")} />}
                {(bn ? c.noteBn : c.noteEn) && <p className="text-[12px] text-slate-600">{bn ? c.noteBn : c.noteEn}</p>}
              </li>
            );
          })}
        </ul>
      </details>
    </section>
  );
}
