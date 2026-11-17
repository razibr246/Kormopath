"use client";
import { useMemo, useState } from "react";
import { Home, Download, Check, X, AlertTriangle, Trash2, Undo2 } from "lucide-react";
import {
  DUE_KINDS, planPockets, markDuePaid, unmarkDuePaid, paymentHistory, paymentRecordCsv, sanitizeDues, sanitizeDuePayments,
  dueDateInMonth, parseAmount, toPoisha, type FixedDue, type DuePayment, type DueKind, type PocketLine,
} from "@/lib/budget";
import { usePersistentState, storageKey, downloadText } from "@/lib/clientStore";

type Lang = "bn" | "en";

const tk = (poisha: number) =>
  "৳" + (poisha / 100).toLocaleString("en-IN", { minimumFractionDigits: poisha % 100 ? 2 : 0, maximumFractionDigits: 2 });

const newId = () => Math.random().toString(36).slice(2, 10);

const sanitizeIncomeByMonth = (raw: unknown): Record<string, number> | null => {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (/^\d{4}-\d{2}$/.test(k) && Number.isInteger(v) && (v as number) >= 0 && (v as number) <= 10_000_000_000) out[k] = v as number;
  }
  return out;
};

const T = {
  title: { bn: "ভাড়া ও বিলের পকেট", en: "Rent & bills pockets" },
  intro: {
    bn: "প্রতি মাসের নির্দিষ্ট খরচ (ভাড়া, বিল, স্কুল ফি, কিস্তি) আর তারিখ লিখুন। আয় থেকে আগে এগুলোর টাকা আলাদা করে রাখার হিসাব দেখাব, যেটা আগে বাকি সেটা আগে।",
    en: "List fixed monthly dues (rent, bills, school fee, loan instalment) with their due day. We show how much of your income to set aside for each before it is due, earliest first.",
  },
  income: { bn: "এই মাসের আয়", en: "This month's income" },
  useRecorded: { bn: "লেনদেন থেকে নিন", en: "Use recorded income" },
  recordedNone: { bn: "এই মাসে কোনো আয় লেখা নেই", en: "No income recorded this month" },
  setAside: { bn: "আলাদা রাখুন", en: "Set aside" },
  paidSoFar: { bn: "পরিশোধিত", en: "Paid so far" },
  left: { bn: "খরচের জন্য বাকি", en: "Left to spend" },
  short: { bn: "আয়ে কুলাচ্ছে না", en: "Income can't cover" },
  add: { bn: "+ খরচ যোগ", en: "+ Add due" },
  name: { bn: "নাম", en: "Name" },
  kind: { bn: "ধরন", en: "Type" },
  amount: { bn: "পরিমাণ (৳)", en: "Amount (৳)" },
  day: { bn: "প্রতি মাসের তারিখ", en: "Due day of month" },
  review: { bn: "দেখে নিন", en: "Review" },
  save: { bn: "নিশ্চিত করে সংরক্ষণ", en: "Confirm & save" },
  cancel: { bn: "বাতিল", en: "Cancel" },
  markPaid: { bn: "পরিশোধ হয়েছে", en: "Mark paid" },
  paidOn: { bn: "পরিশোধের তারিখ", en: "Paid on" },
  confirmPaid: { bn: "নিশ্চিত করুন", en: "Confirm" },
  undo: { bn: "ফেরত নিন", en: "Undo" },
  history: { bn: "সময়মতো পরিশোধের ইতিহাস", en: "On-time payment history" },
  download: { bn: "পরিশোধের রেকর্ড (CSV)", en: "Payment record (CSV)" },
  selfRecorded: {
    bn: "এই রেকর্ড আপনি নিজে লিখছেন; KormoPath, ব্যাংক বা বাড়িওয়ালা কেউ যাচাই করেনি। ফাইলেও তা স্পষ্ট লেখা থাকবে।",
    en: "You record these yourself; nobody (KormoPath, a bank or the landlord) has verified them. The file says so too.",
  },
  empty: { bn: "এখনো কোনো নির্দিষ্ট খরচ যোগ করা হয়নি।", en: "No fixed dues added yet." },
  noIncome: { bn: "আয় লিখলে প্রতিটি পকেটে কত রাখতে হবে দেখাব।", en: "Enter income to see how much each pocket needs." },
} as const;

const statusLabel = (l: PocketLine, lang: Lang) => {
  if (l.status === "paid") return l.paidOnTime ? (lang === "bn" ? "সময়মতো পরিশোধিত" : "Paid on time") : (lang === "bn" ? "দেরিতে পরিশোধিত" : "Paid late");
  if (l.status === "covered") return lang === "bn" ? "পুরো টাকা আছে" : "Fully covered";
  if (l.status === "partial") return lang === "bn" ? "আংশিক" : "Partly covered";
  return lang === "bn" ? "টাকা নেই" : "Not covered";
};

export function RentPocketsPanel({ month, today, recordedIncomePoisha }: { month: string; today: string; recordedIncomePoisha: number }) {
  const [lang, setLang] = useState<Lang>("bn");
  const [dues, setDues] = usePersistentState<FixedDue[]>(storageKey("shohoj", "fixedDues"), [], sanitizeDues);
  const [payments, setPayments] = usePersistentState<DuePayment[]>(storageKey("shohoj", "duePayments"), [], sanitizeDuePayments);
  const [incomeByMonth, setIncomeByMonth] = usePersistentState<Record<string, number>>(storageKey("shohoj", "pocketIncome"), {}, sanitizeIncomeByMonth);

  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<DueKind>("rent");
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [day, setDay] = useState(5);
  const [pending, setPending] = useState<FixedDue | null>(null); // awaiting confirmation
  const [paying, setPaying] = useState<{ dueId: string; paidOn: string; amount: string } | null>(null);
  const [incomeText, setIncomeText] = useState<string | null>(null);

  const t = (k: keyof typeof T) => T[k][lang];
  const kindLabel = (k: DueKind) => DUE_KINDS.find((x) => x.id === k)?.[lang] ?? k;

  const manualIncome = incomeByMonth[month];
  const incomePoisha = manualIncome ?? recordedIncomePoisha;
  const plan = useMemo(() => planPockets(dues, incomePoisha, month, payments, today), [dues, incomePoisha, month, payments, today]);
  const history = useMemo(() => paymentHistory(payments), [payments]);

  const amountTaka = parseAmount(amount);
  const formValid = !!amountTaka && amountTaka > 0 && day >= 1 && day <= 31;

  const review = () => {
    if (!formValid) return;
    setPending({ id: newId(), kind, name: (name.trim() || kindLabel(kind)).slice(0, 60), amountPoisha: toPoisha(amountTaka!), dueDay: day, createdAt: new Date().toISOString() });
  };
  const confirmSave = () => {
    if (!pending) return;
    setDues((d) => [...d, pending]);
    setPending(null); setOpen(false); setName(""); setAmount("");
  };

  const commitIncome = () => {
    if (incomeText === null) return;
    const v = incomeText.trim() === "" ? null : parseAmount(incomeText);
    setIncomeByMonth((m) => {
      const next = { ...m };
      if (v === null || !(v >= 0)) delete next[month]; else next[month] = toPoisha(v);
      return next;
    });
    setIncomeText(null);
  };

  const confirmPaid = () => {
    if (!paying) return;
    const d = dues.find((x) => x.id === paying.dueId);
    const v = parseAmount(paying.amount);
    if (!d || !v || v <= 0 || !/^\d{4}-\d{2}-\d{2}$/.test(paying.paidOn)) return;
    setPayments((p) => markDuePaid(p, d, month, paying.paidOn, new Date().toISOString(), toPoisha(v)));
    setPaying(null);
  };

  return (
    <section aria-labelledby="pockets-h" className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="pockets-h" className="flex items-center gap-1.5 text-[16px] font-bold"><Home size={17} aria-hidden /> {t("title")}</h2>
        <div className="flex items-center gap-2">
          <div role="group" aria-label="Language" className="inline-flex rounded-lg border border-slate-200 text-[11px] font-bold">
            {(["bn", "en"] as const).map((l) => (
              <button key={l} onClick={() => setLang(l)} aria-pressed={lang === l} className={`px-2 py-1 ${lang === l ? "bg-slate-900 text-white" : "text-slate-600"} rounded-md`}>{l === "bn" ? "বাংলা" : "EN"}</button>
            ))}
          </div>
          <button onClick={() => { setOpen(!open); setPending(null); }} className="text-[12px] font-bold text-emerald-700">{open ? t("cancel") : t("add")}</button>
        </div>
      </div>
      <p className="text-[12px] text-slate-500">{t("intro")}</p>

      {/* Income */}
      <div className="rounded-lg bg-slate-50 p-3 text-[12px]">
        <label htmlFor="pocket-income" className="font-bold text-slate-600">{t("income")} ({month})</label>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <input
            id="pocket-income"
            inputMode="decimal"
            value={incomeText ?? (manualIncome !== undefined ? String(manualIncome / 100) : "")}
            placeholder={recordedIncomePoisha > 0 ? tk(recordedIncomePoisha) : "0"}
            onChange={(e) => setIncomeText(e.target.value)}
            onBlur={commitIncome}
            onKeyDown={(e) => { if (e.key === "Enter") commitIncome(); }}
            className="w-32 rounded border border-slate-200 px-2 py-1 text-[14px] font-bold"
          />
          <button
            onClick={() => { setIncomeText(null); setIncomeByMonth((m) => { const n = { ...m }; delete n[month]; return n; }); }}
            disabled={manualIncome === undefined}
            className="rounded-lg bg-white px-2 py-1 font-bold text-emerald-800 ring-1 ring-emerald-200 disabled:opacity-40"
          >
            {t("useRecorded")}
          </button>
          <span className="text-slate-500">{recordedIncomePoisha > 0 ? tk(recordedIncomePoisha) : t("recordedNone")}</span>
        </div>
      </div>

      {open && (
        <div className="grid grid-cols-2 gap-2 rounded-lg bg-slate-50 p-3 text-[12px]">
          {!pending ? (
            <>
              <label className="font-bold text-slate-600">{t("kind")}
                <select value={kind} onChange={(e) => setKind(e.target.value as DueKind)} className="mt-1 block w-full rounded border border-slate-200 bg-white px-2 py-1">
                  {DUE_KINDS.map((k) => <option key={k.id} value={k.id}>{k[lang]}</option>)}
                </select>
              </label>
              <label className="font-bold text-slate-600">{t("name")}
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder={kindLabel(kind)} className="mt-1 block w-full rounded border border-slate-200 px-2 py-1" />
              </label>
              <label className="font-bold text-slate-600">{t("amount")}
                <input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} className="mt-1 block w-full rounded border border-slate-200 px-2 py-1" />
              </label>
              <label className="font-bold text-slate-600">{t("day")}
                <input type="number" min={1} max={31} value={day} onChange={(e) => setDay(Math.min(31, Math.max(1, Math.floor(Number(e.target.value) || 1))))} className="mt-1 block w-full rounded border border-slate-200 px-2 py-1" />
              </label>
              <button disabled={!formValid} onClick={review} className="col-span-2 rounded-lg bg-slate-900 py-1.5 font-bold text-white disabled:opacity-40">{t("review")}</button>
            </>
          ) : (
            <div className="col-span-2 space-y-2 rounded-lg border-2 border-emerald-500 bg-emerald-50/50 p-3">
              <p className="text-[13px]">
                <strong>{pending.name}</strong> · {kindLabel(pending.kind)} · <strong>{tk(pending.amountPoisha)}</strong> ·{" "}
                {lang === "bn" ? `প্রতি মাসের ${pending.dueDay} তারিখ` : `day ${pending.dueDay} each month`} ({lang === "bn" ? "এ মাসে" : "this month"} {dueDateInMonth(pending.dueDay, month)})
              </p>
              <div className="flex gap-2">
                <button onClick={confirmSave} className="inline-flex items-center gap-1 rounded-lg bg-emerald-700 px-3 py-1.5 font-bold text-white"><Check size={13} aria-hidden /> {t("save")}</button>
                <button onClick={() => setPending(null)} className="inline-flex items-center gap-1 rounded-lg bg-white px-3 py-1.5 font-bold text-slate-700 ring-1 ring-slate-200"><X size={13} aria-hidden /> {t("cancel")}</button>
              </div>
            </div>
          )}
        </div>
      )}

      {dues.length === 0 ? (
        <p className="text-[12px] text-slate-500">{t("empty")}</p>
      ) : (
        <>
          <dl className="grid grid-cols-2 gap-2 text-[12px]">
            <div className="rounded-lg bg-emerald-50 p-2"><dt className="font-bold text-emerald-900">{t("setAside")}</dt><dd className="font-mono text-[15px] font-bold">{tk(plan.setAsidePoisha)}</dd></div>
            <div className="rounded-lg bg-slate-50 p-2"><dt className="font-bold text-slate-700">{t("left")}</dt><dd className="font-mono text-[15px] font-bold">{tk(plan.leftToSpendPoisha)}</dd></div>
            <div className="rounded-lg bg-slate-50 p-2"><dt className="font-bold text-slate-700">{t("paidSoFar")}</dt><dd className="font-mono text-[15px] font-bold">{tk(plan.paidPoisha)}</dd></div>
            <div className={`rounded-lg p-2 ${plan.shortfallPoisha > 0 ? "bg-red-50" : "bg-slate-50"}`}><dt className={`font-bold ${plan.shortfallPoisha > 0 ? "text-red-800" : "text-slate-700"}`}>{t("short")}</dt><dd className="font-mono text-[15px] font-bold">{tk(plan.shortfallPoisha)}</dd></div>
          </dl>
          {plan.incomePoisha === 0 && <p className="text-[12px] text-amber-800">{t("noIncome")}</p>}
          {plan.uncoveredIds.length > 0 && plan.incomePoisha > 0 && (
            <p role="status" className="flex items-start gap-1.5 rounded-lg bg-red-50 p-2 text-[12px] text-red-900">
              <AlertTriangle size={14} className="mt-0.5 shrink-0" aria-hidden />
              {lang === "bn"
                ? `${plan.uncoveredIds.length}টি খরচের পুরো টাকা এই আয়ে হচ্ছে না। মোট ঘাটতি ${tk(plan.shortfallPoisha)}।`
                : `${plan.uncoveredIds.length} due(s) can't be fully covered by this income. Total gap ${tk(plan.shortfallPoisha)}.`}
            </p>
          )}

          <ul className="divide-y divide-slate-100">
            {plan.lines.map((l) => (
              <li key={l.dueId} className="py-2 text-[12px]">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-bold text-slate-900">{l.name} <span className="font-normal text-slate-500">· {kindLabel(l.kind)}</span></p>
                    <p className="text-slate-600">
                      {tk(l.amountPoisha)} · {l.dueDate}{" "}
                      {l.status !== "paid" && (l.overdue
                        ? <span className="font-bold text-red-700">({lang === "bn" ? `${-l.daysLeft} দিন পার` : `${-l.daysLeft} days overdue`})</span>
                        : <span>({lang === "bn" ? `${l.daysLeft} দিন বাকি` : `${l.daysLeft} days left`})</span>)}
                    </p>
                    <p className={l.status === "paid" ? (l.paidOnTime ? "text-emerald-700" : "text-amber-700") : l.status === "covered" ? "text-emerald-700" : "text-red-700"}>
                      {statusLabel(l, lang)}
                      {l.status !== "paid" && <> · {t("setAside")} <strong className="font-mono">{tk(l.setAsidePoisha)}</strong>{l.shortfallPoisha > 0 && <> · {lang === "bn" ? "ঘাটতি" : "gap"} <strong className="font-mono">{tk(l.shortfallPoisha)}</strong></>}</>}
                      {l.payment && <> · {l.payment.paidOn} · {tk(l.payment.amountPoisha)}</>}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    {l.status === "paid" ? (
                      <button onClick={() => setPayments((p) => unmarkDuePaid(p, l.dueId, month))} className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2 py-1 font-bold text-slate-700"><Undo2 size={12} aria-hidden /> {t("undo")}</button>
                    ) : (
                      <button onClick={() => setPaying({ dueId: l.dueId, paidOn: today.startsWith(month) ? today : l.dueDate, amount: String(l.amountPoisha / 100) })} className="rounded-lg bg-emerald-700 px-2 py-1 font-bold text-white">{t("markPaid")}</button>
                    )}
                    <button
                      onClick={() => { if (window.confirm(lang === "bn" ? `"${l.name}" মুছবেন? আগের পরিশোধের রেকর্ড থাকবে।` : `Delete "${l.name}"? Past payment records are kept.`)) setDues((d) => d.filter((x) => x.id !== l.dueId)); }}
                      className="rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                      aria-label={lang === "bn" ? "মুছুন" : "Delete"}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                {paying?.dueId === l.dueId && (
                  <div className="mt-2 grid grid-cols-2 gap-2 rounded-lg border-2 border-emerald-500 bg-emerald-50/50 p-2">
                    <label className="font-bold text-slate-600">{t("paidOn")}
                      <input type="date" value={paying.paidOn} onChange={(e) => setPaying({ ...paying, paidOn: e.target.value })} className="mt-1 block w-full rounded border border-slate-200 px-2 py-1" />
                    </label>
                    <label className="font-bold text-slate-600">{t("amount")}
                      <input inputMode="decimal" value={paying.amount} onChange={(e) => setPaying({ ...paying, amount: e.target.value })} className="mt-1 block w-full rounded border border-slate-200 px-2 py-1" />
                    </label>
                    <p className="col-span-2 text-[11px] text-slate-600">
                      {paying.paidOn && paying.paidOn <= l.dueDate
                        ? (lang === "bn" ? "নির্ধারিত তারিখের মধ্যে: সময়মতো হিসেবে লেখা হবে।" : "On or before the due date: recorded as on time.")
                        : (lang === "bn" ? "নির্ধারিত তারিখের পরে: দেরিতে হিসেবে লেখা হবে।" : "After the due date: recorded as late.")}
                    </p>
                    <div className="col-span-2 flex gap-2">
                      <button onClick={confirmPaid} className="inline-flex items-center gap-1 rounded-lg bg-emerald-700 px-3 py-1.5 font-bold text-white"><Check size={13} aria-hidden /> {t("confirmPaid")}</button>
                      <button onClick={() => setPaying(null)} className="inline-flex items-center gap-1 rounded-lg bg-white px-3 py-1.5 font-bold text-slate-700 ring-1 ring-slate-200"><X size={13} aria-hidden /> {t("cancel")}</button>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </>
      )}

      {/* History */}
      {history.length > 0 && (
        <div className="space-y-2 border-t border-slate-100 pt-3">
          <h3 className="text-[13px] font-bold text-slate-800">{t("history")}</h3>
          <ul className="space-y-1 text-[12px]">
            {history.slice(0, 12).map((m) => (
              <li key={m.month} className="flex items-center justify-between gap-2 rounded-lg bg-slate-50 px-2 py-1">
                <span className="font-mono font-bold">{m.month}</span>
                <span>
                  <span className="text-emerald-700">{lang === "bn" ? `সময়মতো ${m.onTime}` : `${m.onTime} on time`}</span>
                  {m.late > 0 && <span className="text-amber-700"> · {lang === "bn" ? `দেরিতে ${m.late}` : `${m.late} late`}</span>}
                  <span className="text-slate-500"> · {tk(m.totalPoisha)}</span>
                </span>
              </li>
            ))}
          </ul>
          <button
            onClick={() => downloadText(`payment-record-self-recorded-${today}.csv`, paymentRecordCsv(payments, today))}
            className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-[12px] font-bold text-white"
          >
            <Download size={13} aria-hidden /> {t("download")}
          </button>
          <p className="text-[11px] text-slate-500">{t("selfRecorded")}</p>
        </div>
      )}
    </section>
  );
}
