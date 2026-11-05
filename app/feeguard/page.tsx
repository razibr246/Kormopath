"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Percent, Download, Copy, CheckCircle2, AlertTriangle, RefreshCw, Scale, Trash2, Save, Info } from "lucide-react";
import { AppHeader, SourceTag } from "@/components/AppHeader";
import { FEES, FX_FALLBACK, TAX_RULES, MACRO, type Source } from "@/lib/data";
import {
  compareChannels, best, checkInvariants, batchingSaving, effectiveCost, channelsToCsv, fmtBdt,
  type Channel, type FeeValues,
} from "@/lib/finops";
import { usePersistentState, storageKey, downloadText, todayLocal } from "@/lib/clientStore";

const DEFAULT_FEES = Object.fromEntries(Object.entries(FEES).map(([k, v]) => [k, v.value])) as unknown as FeeValues;

interface PaymentRecord {
  id: string;
  date: string;
  channel: Channel["id"];
  grossUsd: number;
  fx: number;
  receivedBdt: number;
  estimatedNetBdt: number;
  note: string;
}

const sanitizeRecords = (raw: unknown): PaymentRecord[] | null =>
  Array.isArray(raw)
    ? raw.filter((r): r is PaymentRecord => r && typeof r.id === "string" && typeof r.date === "string" && [r.grossUsd, r.fx, r.receivedBdt, r.estimatedNetBdt].every((n) => typeof n === "number" && Number.isFinite(n) && n >= 0))
    : null;

const CHANNEL_STYLE: Record<Channel["id"], string> = {
  fiverr: "border-rose-200",
  upwork: "border-amber-200",
  payoneer_bkash: "border-sky-200",
  bank_wire: "border-emerald-200",
};

export default function FeeGuardPage() {
  const [invoiceUsd, setInvoiceUsd] = useState(1000);
  const [withdrawals, setWithdrawals] = useState(1);
  const [fx, setFx] = useState(FX_FALLBACK.usdBdt);
  const [fxSource, setFxSource] = useState<{ source: Source; live: boolean } | null>(null);
  const [fxLoading, setFxLoading] = useState(true);
  const [claimIncentive, setClaimIncentive] = useState(false);
  const [fees, setFees] = useState<FeeValues>(DEFAULT_FEES);
  const [showFees, setShowFees] = useState(false);
  const [records, setRecords] = usePersistentState<PaymentRecord[]>(storageKey("feeguard", "payments"), [], sanitizeRecords);

  const loadFx = () => {
    setFxLoading(true);
    fetch("/api/fx")
      .then((r) => r.json())
      .then((d: { usdBdt?: number; live?: boolean; source?: Source }) => {
        if (typeof d.usdBdt === "number" && d.usdBdt > 80 && d.usdBdt < 250) {
          setFx(Math.round(d.usdBdt * 100) / 100);
          setFxSource({ source: d.source ?? FX_FALLBACK.source, live: Boolean(d.live) });
        }
      })
      .catch(() => setFxSource({ source: FX_FALLBACK.source, live: false }))
      .finally(() => setFxLoading(false));
  };
  useEffect(loadFx, []);

  const input = { invoiceUsd, withdrawals, fx, fees, claimIncentive };
  const channels = useMemo(() => compareChannels(input), [invoiceUsd, withdrawals, fx, fees, claimIncentive]); // eslint-disable-line react-hooks/exhaustive-deps
  const invariant = checkInvariants(channels);
  const top = best(channels);
  const fiverr = channels.find((c) => c.id === "fiverr")!;
  const marketplaceBest = channels.filter((c) => c.marketplace).reduce((a, b) => (b.netBdt > a.netBdt ? b : a));
  const directBest = channels.filter((c) => !c.marketplace).reduce((a, b) => (b.netBdt > a.netBdt ? b : a));
  const batching = batchingSaving({ ...input, withdrawals: 1 }, "fiverr");
  const feesEdited = Object.keys(DEFAULT_FEES).some((k) => fees[k as keyof FeeValues] !== DEFAULT_FEES[k as keyof FeeValues]);

  return (
    <div className="min-h-screen bg-[#f6f8f7] text-slate-900 antialiased">
      <AppHeader taglineEn="Freelance payout fee checker"
        appId="feeguard"
        href="/feeguard"
        name="FeeGuard BD"
        taglineBn="ফ্রিল্যান্স আয়ের ফি ও রূপান্তর খরচ স্বচ্ছভাবে তুলনা"
        icon={<Percent size={22} />}
        accent="from-emerald-600 to-teal-800"
        right={
          <span className="hidden items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 font-mono text-[12px] sm:inline-flex">
            $1 = ৳{fx.toFixed(2)}
          </span>
        }
      />

      <main id="main" className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6">
        <section className="flex flex-wrap items-end justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5">
          <div className="max-w-2xl">
            <h1 className="text-[26px] font-extrabold leading-tight tracking-tight sm:text-[32px]">আপনার ইনভয়েসের কত টাকা আসলে হাতে আসে?</h1>
            <p className="mt-2 text-[15px] leading-relaxed text-slate-600">
              Fiverr-এর ২০% সার্ভিস ফি, Upwork-এর পরিবর্তনশীল ফি, উইথড্রয়াল চার্জ ও কারেন্সি রূপান্তর — প্রতিটি ধাপ আলাদা করে দেখায়। সব সংখ্যা নিচের উৎস থেকে, প্রয়োজনে নিজে বদলাতে পারবেন। এগুলো <strong>অনুমান</strong>; আসল খরচ মিলিয়ে দেখতে নিচের “বাস্তব যাচাই” ব্যবহার করুন।
            </p>
          </div>
          <div className="min-w-[260px] rounded-2xl border-2 border-emerald-500 bg-emerald-50 p-4">
            <span className="block text-[11px] font-bold uppercase tracking-wide text-emerald-800">এই ইনপুটে সবচেয়ে বেশি থাকে</span>
            <strong className="block text-[22px] font-extrabold text-emerald-800">{top.name}</strong>
            <span className="text-[13px] text-emerald-900">{fmtBdt(top.netBdt)} · ইনভয়েসের {top.keptPct}%</span>
            <span className="mt-1 block text-[11px] text-emerald-900/80">আনুমানিক, শর্ত নিচে দেখুন</span>
          </div>
        </section>

        {/* Inputs */}
        <section aria-label="ইনপুট" className="grid gap-5 rounded-2xl border border-slate-200 bg-white p-5 md:grid-cols-3">
          <div className="space-y-2">
            <label htmlFor="inv" className="flex items-center justify-between text-[14px] font-bold">
              মাসিক ইনভয়েস (USD)
              <input id="inv" type="number" min={1} max={100000} value={invoiceUsd} onChange={(e) => setInvoiceUsd(Math.min(100000, Math.max(0, Number(e.target.value) || 0)))} className="w-28 rounded-lg border border-slate-200 px-2 py-1 text-right font-mono text-[16px] font-bold text-emerald-700" />
            </label>
            <input type="range" min={50} max={5000} step={50} value={Math.min(5000, invoiceUsd)} onChange={(e) => setInvoiceUsd(Number(e.target.value))} className="w-full accent-emerald-600" aria-label="ইনভয়েস স্লাইডার" />
          </div>
          <div className="space-y-2">
            <span className="block text-[14px] font-bold">মাসে কতবার টাকা তোলেন</span>
            <div className="grid grid-cols-3 gap-2" role="group" aria-label="উইথড্রয়াল সংখ্যা">
              {[1, 2, 4].map((w) => (
                <button key={w} aria-pressed={withdrawals === w} onClick={() => setWithdrawals(w)} className={`rounded-xl border py-2 text-[13px] font-bold ${withdrawals === w ? "border-emerald-600 bg-emerald-600 text-white" : "border-slate-200 bg-slate-50 text-slate-700"}`}>
                  {w === 1 ? "মাসে ১" : w === 2 ? "মাসে ২" : "সাপ্তাহিক"}
                </button>
              ))}
            </div>
            {batching.savedBdt > 0 && (
              <p className="text-[11px] text-slate-500">Fiverr-এ সাপ্তাহিকের বদলে মাসে একবার তুললে উইথড্রয়াল ফি-তে প্রায় {fmtBdt(batching.savedBdt)} কম যায়।</p>
            )}
          </div>
          <div className="space-y-2">
            <label htmlFor="fx" className="flex items-center justify-between text-[14px] font-bold">
              ডলার রেট (৳/USD)
              <span className="flex items-center gap-1">
                <input id="fx" type="number" step={0.01} min={80} max={250} value={fx} onChange={(e) => { setFx(Number(e.target.value) || 0); setFxSource((s) => (s ? { ...s, live: false, source: { label: "আপনার দেওয়া রেট", checked: todayLocal(), confidence: "estimate" } } : s)); }} className="w-24 rounded-lg border border-slate-200 px-2 py-1 text-right font-mono text-[15px] font-bold" />
                <button onClick={loadFx} aria-label="লাইভ রেট আবার আনুন" className="rounded p-1 text-slate-500 hover:bg-slate-100"><RefreshCw size={14} className={fxLoading ? "animate-spin" : ""} /></button>
              </span>
            </label>
            {fxSource && (
              <SourceTag
                confidence={fxSource.live ? "reported" : fxSource.source.confidence === "official" ? "estimate" : fxSource.source.confidence}
                label={fxSource.live ? "লাইভ মিড-মার্কেট রেট (open.er-api.com)" : fxSource.source.label.includes("আপনার") ? fxSource.source.label : "লাইভ রেট পাওয়া যায়নি — ফলব্যাক রেট, নিজে ঠিক করে নিন"}
                url={fxSource.live ? fxSource.source.url : undefined}
                checked={fxSource.source.checked?.slice(0, 16)}
              />
            )}
            <label className="flex items-start gap-2 rounded-lg border border-slate-200 bg-slate-50 p-2 text-[12px]">
              <input type="checkbox" checked={claimIncentive} onChange={(e) => setClaimIncentive(e.target.checked)} className="mt-0.5 h-4 w-4 accent-emerald-600" />
              <span>ব্যাংক ওয়্যারে বাংলাদেশ ব্যাংকের <strong>২.৫% রপ্তানি প্রণোদনা</strong> যোগ করুন (শুধু যোগ্য সফটওয়্যার/আইটিইএস ফ্রিল্যান্সার, কাগজপত্রসহ ব্যাংকে দাবি করলে)</span>
            </label>
          </div>
          <div className="md:col-span-3">
            <button onClick={() => setShowFees(!showFees)} className="text-[13px] font-bold text-emerald-700">
              {showFees ? "ফি-এর হার লুকান" : "ফি-এর হার ও উৎস দেখুন / বদলান"}{feesEdited && " (আপনি বদলেছেন)"}
            </button>
            {showFees && (
              <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {Object.values(FEES).map((f) => (
                  <div key={f.id} className="rounded-xl border border-slate-200 p-3">
                    <label className="flex items-center justify-between gap-2 text-[12px] font-bold">
                      <span>{f.label}</span>
                      <span className="flex items-center gap-1">
                        <input type="number" step={0.1} min={0} max={f.unit === "%" ? 50 : 100} value={fees[f.id as keyof FeeValues]} onChange={(e) => setFees({ ...fees, [f.id]: Math.max(0, Number(e.target.value) || 0) })} className="w-16 rounded border border-slate-200 px-1.5 py-0.5 text-right font-mono" />
                        <span className="text-slate-500">{f.unit === "%" ? "%" : "$"}</span>
                      </span>
                    </label>
                    <div className="mt-1.5"><SourceTag confidence={f.source.confidence} label={f.source.label} url={f.source.url} checked={f.source.checked} /></div>
                  </div>
                ))}
                <button onClick={() => setFees(DEFAULT_FEES)} className="self-start text-[12px] font-semibold text-slate-600 underline">ডিফল্টে ফিরুন</button>
              </div>
            )}
          </div>
        </section>

        {/* Channels */}
        <section aria-labelledby="ch-h">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 id="ch-h" className="text-[18px] font-bold">চারটি পথে কত থাকে</h2>
            <div className="flex items-center gap-3">
              <span className={`text-[12px] font-semibold ${invariant.ok ? "text-emerald-700" : "text-red-700"}`}>
                {invariant.ok ? "✓ প্রতিটি ধাপ যোগ করলে নিট মিলে যায়" : `হিসাবে গরমিল (${invariant.maxErrorBdt})`}
              </span>
              <button onClick={() => downloadText(`feeguard-${invoiceUsd}usd-${todayLocal()}.csv`, channelsToCsv(channels, invoiceUsd, fx))} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[12px] font-bold text-slate-700 hover:bg-slate-50">
                <Download size={14} aria-hidden /> CSV
              </button>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {channels.map((c) => (
              <article key={c.id} className={`flex flex-col rounded-2xl border-2 bg-white p-4 ${c.id === top.id ? "border-emerald-500 shadow-md" : CHANNEL_STYLE[c.id]}`}>
                <div className="flex items-center justify-between">
                  <span className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase ${c.marketplace ? "bg-slate-100 text-slate-700" : "bg-emerald-100 text-emerald-800"}`}>{c.marketplace ? "মার্কেটপ্লেস" : "সরাসরি ক্লায়েন্ট"}</span>
                  {c.id === top.id && <span className="text-[11px] font-bold text-emerald-700">সবচেয়ে বেশি থাকে</span>}
                </div>
                <h3 className="mt-2 text-[16px] font-extrabold">{c.name}</h3>
                <p className="text-[12px] text-slate-500">{c.route}</p>
                <div className="mt-3 border-b border-slate-100 pb-3">
                  <span className="block text-[11px] text-slate-500">আনুমানিক হাতে আসে</span>
                  <strong className="font-mono text-[24px] font-extrabold">{fmtBdt(c.netBdt)}</strong>
                  <span className="block text-[12px] font-semibold text-slate-500">ইনভয়েসের {c.keptPct}% · কাটা যায় {fmtBdt(c.grossBdt - c.netBdt)}</span>
                </div>
                <dl className="mt-3 flex-1 space-y-1.5 text-[12px]">
                  <div className="flex justify-between"><dt className="text-slate-600">মোট ইনভয়েস</dt><dd className="font-mono font-bold">{fmtBdt(c.grossBdt)}</dd></div>
                  {c.steps.map((s) => (
                    <div key={s.label} className={`flex justify-between gap-2 ${s.bdt < 0 ? "text-red-700" : "font-bold text-emerald-700"}`}>
                      <dt>{s.label}</dt>
                      <dd className="font-mono">{s.bdt < 0 ? "−" : "+"}{fmtBdt(Math.abs(s.bdt))}</dd>
                    </div>
                  ))}
                </dl>
              </article>
            ))}
          </div>
        </section>

        {/* What the difference means */}
        <section className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="flex items-center gap-1.5 text-[16px] font-bold"><Scale size={17} aria-hidden /> পার্থক্যটা কী বোঝায়</h2>
            <p className="mt-2 text-[14px] text-slate-700">
              এই ইনপুটে সবচেয়ে ভালো সরাসরি পথ (<strong>{directBest.name}</strong>) Fiverr-এর চেয়ে মাসে আনুমানিক{" "}
              <strong className="text-emerald-700">{fmtBdt(directBest.netBdt - fiverr.netBdt)}</strong> বেশি রাখে, আর সবচেয়ে ভালো মার্কেটপ্লেস পথের ({marketplaceBest.name}) চেয়ে{" "}
              <strong className="text-emerald-700">{fmtBdt(directBest.netBdt - marketplaceBest.netBdt)}</strong> বেশি।
            </p>
            <ul className="mt-3 space-y-1.5 text-[12px] text-slate-600">
              <li className="flex gap-1.5"><AlertTriangle size={14} className="mt-0.5 shrink-0 text-amber-600" aria-hidden />এই সাশ্রয় সবার জন্য নিশ্চিত নয় — সরাসরি ক্লায়েন্ট নিজেকে খুঁজে বের করতে হয়, যার নিজস্ব সময় ও ঝুঁকি আছে।</li>
              <li className="flex gap-1.5"><AlertTriangle size={14} className="mt-0.5 shrink-0 text-amber-600" aria-hidden />{MACRO.marketplaceWarning}</li>
              <li className="flex gap-1.5"><Info size={14} className="mt-0.5 shrink-0 text-slate-500" aria-hidden />Upwork-এর ফি প্রতিটি চুক্তিতে ০–১৫% পর্যন্ত আলাদা হতে পারে; প্রপোজালে যে হার দেখায় তা উপরের সেটিংসে বসান। ব্যাংক ওয়্যারের খরচ অনুমান — আপনার ব্যাংকের ইনওয়ার্ড SWIFT চার্জ জেনে নিন।</li>
            </ul>
          </div>

          <RealityCheck channels={channels} invoiceUsd={invoiceUsd} fx={fx} onSave={(r) => setRecords((p) => [r, ...p].slice(0, 200))} />
        </section>

        {records.length > 0 && (
          <section aria-labelledby="rec-h" className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 id="rec-h" className="text-[16px] font-bold">আপনার পেমেন্ট রেকর্ড ({records.length})</h2>
              <button
                onClick={() => downloadText(`feeguard-payments-${todayLocal()}.csv`, ["date,channel,gross_usd,fx,estimated_net_bdt,received_bdt,actual_cost_pct,note", ...records.map((r) => [r.date, r.channel, r.grossUsd, r.fx, r.estimatedNetBdt, r.receivedBdt, effectiveCost(r.grossUsd, r.fx, r.receivedBdt)?.lostPct ?? "", `"${r.note.replace(/"/g, '""')}"`].join(","))].join("\n"))}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-[12px] font-bold"
              >
                <Download size={14} aria-hidden /> CSV
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-left text-[13px]">
                <thead className="text-[11px] uppercase text-slate-500">
                  <tr><th className="py-1">তারিখ</th><th>পথ</th><th className="text-right">ইনভয়েস</th><th className="text-right">অনুমান</th><th className="text-right">আসলে পেয়েছেন</th><th className="text-right">আসল খরচ</th><th /></tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {records.map((r) => {
                    const ec = effectiveCost(r.grossUsd, r.fx, r.receivedBdt);
                    return (
                      <tr key={r.id}>
                        <td className="py-2">{r.date}</td>
                        <td>{channels.find((c) => c.id === r.channel)?.name ?? r.channel}</td>
                        <td className="text-right font-mono">${r.grossUsd}</td>
                        <td className="text-right font-mono">{fmtBdt(r.estimatedNetBdt)}</td>
                        <td className="text-right font-mono font-bold">{fmtBdt(r.receivedBdt)}</td>
                        <td className="text-right font-mono">{ec ? `${ec.lostPct}%` : "—"}</td>
                        <td className="text-right"><button onClick={() => setRecords((p) => p.filter((x) => x.id !== r.id))} aria-label="রেকর্ড মুছুন" className="p-1 text-slate-400 hover:text-red-600"><Trash2 size={14} /></button></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        )}

        <div className="grid gap-4 lg:grid-cols-2">
          <PitchTemplate invoiceUsd={invoiceUsd} />
          <section className="rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="text-[16px] font-bold">কর ও প্রণোদনা — যা জানা জরুরি</h2>
            <ul className="mt-3 space-y-3 text-[13px]">
              {TAX_RULES.map((t) => (
                <li key={t.id}>
                  <strong className="block">{t.title}</strong>
                  <span className="block text-slate-700">{t.bn}</span>
                  <span className="mt-1 inline-block"><SourceTag confidence={t.source.confidence} label={t.source.label} url={t.source.url} checked={t.source.checked} /></span>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-[11px] text-slate-500">এটি তথ্য, কর বা আইনি পরামর্শ নয়। নিজের ক্ষেত্রে প্রযোজ্যতা কর আইনজীবী বা ব্যাংকের সাথে নিশ্চিত হোন।</p>
          </section>
        </div>

        <p className="text-[12px] text-slate-500">
          চুক্তি ও মাইলস্টোন ইনভয়েস দরকার? <Link href="/chuktiguard" className="font-semibold text-emerald-700 underline">ChuktiGuard</Link> · পুরো স্কিল-থেকে-আয় পাইপলাইন: <Link href="/workspace" className="font-semibold text-emerald-700 underline">KormoPath Workspace</Link>
        </p>
      </main>
    </div>
  );
}

function RealityCheck({ channels, invoiceUsd, fx, onSave }: { channels: Channel[]; invoiceUsd: number; fx: number; onSave: (r: PaymentRecord) => void }) {
  const [channel, setChannel] = useState<Channel["id"]>("fiverr");
  const [received, setReceived] = useState("");
  const [note, setNote] = useState("");
  const [saved, setSaved] = useState(false);
  const c = channels.find((x) => x.id === channel)!;
  const receivedBdt = Number(received.replace(/,/g, ""));
  const ec = received ? effectiveCost(invoiceUsd, fx, receivedBdt) : null;
  const diff = received ? receivedBdt - c.netBdt : 0;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <h2 className="flex items-center gap-1.5 text-[16px] font-bold"><CheckCircle2 size={17} aria-hidden /> বাস্তব যাচাই: আসলে কত পেয়েছেন?</h2>
      <p className="mt-1 text-[12px] text-slate-500">ব্যাংক/বিকাশ স্টেটমেন্টে যত টাকা এসেছে তা লিখুন। আমাদের অনুমানের সাথে তুলনা করে আসল মোট খরচ দেখাবে।</p>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <label className="text-[12px] font-bold text-slate-600">কোন পথে এসেছে
          <select value={channel} onChange={(e) => setChannel(e.target.value as Channel["id"])} className="mt-1 block w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[13px] font-normal">
            {channels.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
          </select>
        </label>
        <label className="text-[12px] font-bold text-slate-600">হাতে এসেছে (৳) — ${invoiceUsd} ইনভয়েসের জন্য
          <input inputMode="decimal" value={received} onChange={(e) => { setReceived(e.target.value.replace(/[^0-9.,]/g, "")); setSaved(false); }} placeholder={String(Math.round(c.netBdt))} className="mt-1 block w-full rounded-lg border border-slate-200 px-2 py-1.5 font-mono text-[13px]" />
        </label>
      </div>
      {ec && (
        <div className="mt-3 rounded-xl bg-slate-50 p-3 text-[13px]">
          <p>মিড-মার্কেট রেটে ${invoiceUsd} = {fmtBdt(invoiceUsd * fx)}। আসল মোট খরচ: <strong>{fmtBdt(ec.lostBdt)} ({ec.lostPct}%)</strong>।</p>
          <p className={`mt-1 ${Math.abs(diff) < 1 ? "text-slate-600" : diff > 0 ? "text-emerald-700" : "text-red-700"}`}>
            আমাদের অনুমানের চেয়ে {Math.abs(diff) < 1 ? "প্রায় সমান" : `${fmtBdt(Math.abs(diff))} ${diff > 0 ? "বেশি পেয়েছেন" : "কম পেয়েছেন — কোনো চার্জ বাদ পড়েছে কি না দেখুন, বা উপরের ফি-হার ঠিক করুন"}`}।
          </p>
          <div className="mt-2 flex gap-2">
            <input value={note} maxLength={80} onChange={(e) => setNote(e.target.value)} placeholder="নোট (ঐচ্ছিক)" aria-label="নোট" className="min-w-0 flex-1 rounded-lg border border-slate-200 px-2 py-1 text-[12px]" />
            <button
              onClick={() => {
                onSave({ id: Math.random().toString(36).slice(2), date: todayLocal(), channel, grossUsd: invoiceUsd, fx, receivedBdt, estimatedNetBdt: c.netBdt, note });
                setSaved(true);
              }}
              disabled={saved}
              className="inline-flex items-center gap-1 rounded-lg bg-slate-900 px-3 py-1 text-[12px] font-bold text-white disabled:opacity-50"
            >
              <Save size={13} aria-hidden /> {saved ? "সংরক্ষিত" : "রেকর্ডে রাখুন"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function PitchTemplate({ invoiceUsd }: { invoiceUsd: number }) {
  const [client, setClient] = useState("");
  const [service, setService] = useState("web development");
  const [where, setWhere] = useState("LinkedIn");
  const [copied, setCopied] = useState(false);
  const text = `Hi ${client || "there"},

I found ${where === "referral" ? "your team through a mutual contact" : `your company on ${where}`} and noticed you may need help with ${service}.

I'm a freelancer based in Bangladesh. I work on fixed-price milestones (for example, a $${invoiceUsd} scope split into 2–3 approved milestones), with daily async updates across time zones and a written buffer for internet or power outages.

I can invoice by international bank transfer or Payoneer, whichever is easier for you.

Would a 15-minute call this week work?

Best regards,`;
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-[16px] font-bold">নতুন সরাসরি ক্লায়েন্টের জন্য ইমেইল</h2>
        <button onClick={() => { navigator.clipboard?.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1800); }} className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-[12px] font-bold text-white">
          {copied ? <CheckCircle2 size={14} aria-hidden /> : <Copy size={14} aria-hidden />} {copied ? "কপি হয়েছে" : "কপি"}
        </button>
      </div>
      <p className="mt-1 rounded-lg bg-amber-50 p-2 text-[12px] text-amber-900">শুধু যে ক্লায়েন্ট আপনি নিজে খুঁজে পেয়েছেন তাদের জন্য। Fiverr/Upwork-এ পরিচয় হওয়া ক্লায়েন্টকে প্ল্যাটফর্মের বাইরে নেওয়া তাদের নিয়ম ভঙ্গ করে।</p>
      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        <label className="text-[12px] font-bold text-slate-600">ক্লায়েন্টের নাম<input value={client} maxLength={60} onChange={(e) => setClient(e.target.value)} className="mt-1 block w-full rounded-lg border border-slate-200 px-2 py-1 text-[13px] font-normal" /></label>
        <label className="text-[12px] font-bold text-slate-600">সেবা<input value={service} maxLength={80} onChange={(e) => setService(e.target.value)} className="mt-1 block w-full rounded-lg border border-slate-200 px-2 py-1 text-[13px] font-normal" /></label>
        <label className="text-[12px] font-bold text-slate-600">কোথায় পেয়েছেন
          <select value={where} onChange={(e) => setWhere(e.target.value)} className="mt-1 block w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-[13px] font-normal">
            <option>LinkedIn</option><option value="referral">রেফারেল</option><option>their website</option><option>a local tech event</option>
          </select>
        </label>
      </div>
      <pre className="mt-3 whitespace-pre-wrap rounded-xl border border-slate-200 bg-slate-50 p-3 font-mono text-[12px] leading-relaxed">{text}</pre>
    </section>
  );
}
