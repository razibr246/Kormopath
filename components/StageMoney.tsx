"use client";
import { useMemo, useRef, useState } from "react";
import { compareChannels, checkInvariants, best, batchingSaving, fmtBdt, type FeeValues, type Channel } from "@/lib/finops";
import { FEES, TAX_RULES, type Source } from "@/lib/data";
import type { LedgerRow } from "@/lib/types";
import { Panel, Btn, SourceTag, Field, inputCls } from "./ui";
import { Download, Upload, Plus, Trash2, Loader2, Trophy, CircleCheck, TriangleAlert, DollarSign, ArrowUpRight, ShieldCheck } from "lucide-react";

const LEAK_SHADES = ["#c62f3b", "#d9636c", "#e8959b"];

function Waterfall({ c, scale, isBest, isCurrent }: { c: Channel; scale: number; isBest: boolean; isCurrent: boolean }) {
  const leaks = c.steps.filter((s) => s.bdt < 0);
  const gains = c.steps.filter((s) => s.bdt > 0);
  const keptBase = c.netBdt - gains.reduce((a, s) => a + s.bdt, 0);
  const pct = (n: number) => `${(Math.abs(n) / scale) * 100}%`;
  return (
    <li className={`rounded-xl border p-3.5 transition-all ${isBest ? "border-kept bg-kept-soft/40 shadow-sm" : "border-line bg-white"}`}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-3">
        <p className="font-bold text-[15px] text-ink">
          {c.name}
          {isBest && <span className="ml-2 inline-flex items-center gap-1 rounded bg-kept px-2 py-0.5 text-[11px] font-bold text-white"><Trophy size={11} />keeps the most</span>}
          {isCurrent && <span className="ml-2 rounded bg-ink px-2 py-0.5 text-[11px] font-bold text-white">what you use now</span>}
        </p>
        <p className="display num text-[22px] font-bold text-ink">{fmtBdt(c.netBdt)}</p>
      </div>
      <p className="text-[13px] text-muted">{c.route} · you keep {c.keptPct}% of invoice</p>
      <div className="mt-2.5 flex h-4 w-full overflow-hidden rounded-full bg-paper" role="img" aria-label={`${c.name}: keeps ${fmtBdt(c.netBdt)} of ${fmtBdt(c.grossBdt)}`}>
        <div className="bar-grow h-full bg-kept" style={{ width: pct(keptBase) }} />
        {gains.map((g) => <div key={g.label} className="h-full bg-haldi" style={{ width: pct(g.bdt) }} title={g.label} />)}
        {leaks.map((l, i) => <div key={l.label} className="h-full" style={{ width: pct(l.bdt), background: LEAK_SHADES[i] }} title={l.label} />)}
      </div>
      <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-0.5 text-[12px]">
        {c.steps.map((s, i) => (
          <li key={s.label} className="num font-medium" style={{ color: s.bdt < 0 ? LEAK_SHADES[Math.min(i, 2)] : "#7a5410" }}>
            {s.label}: {s.bdt < 0 ? "" : "+"}{fmtBdt(s.bdt)}
          </li>
        ))}
      </ul>
    </li>
  );
}

export function StageMoney(props: {
  invoice: number; setInvoice: (n: number) => void;
  withdrawals: number; setWithdrawals: (n: number) => void;
  claim: boolean; setClaim: (b: boolean) => void;
  fees: FeeValues; setFee: (k: keyof FeeValues, v: number) => void;
  fx: { usdBdt: number; live: boolean; source: Source };
  current: "fiverr" | "upwork" | "none";
  ledger: LedgerRow[];
  addRow: (r: Omit<LedgerRow, "id">) => void;
  removeRow: (id: string) => void;
  onReceipt: (f: File) => void;
  reading: boolean;
  receiptMsg: string | null;
}) {
  const { invoice, fees, fx } = props;
  const inp = { invoiceUsd: invoice, withdrawals: props.withdrawals, fx: fx.usdBdt, fees, claimIncentive: props.claim };
  const channels = useMemo(() => compareChannels(inp), [invoice, props.withdrawals, fx.usdBdt, fees, props.claim]); // eslint-disable-line react-hooks/exhaustive-deps
  const inv = checkInvariants(channels);
  const top = best(channels);
  const cur = channels.find((c) => c.id === props.current) ?? channels[0];
  const yearly = (top.netBdt - cur.netBdt) * 12;
  const scale = Math.max(...channels.map((c) => Math.max(c.grossBdt, c.netBdt + c.steps.filter((s) => s.bdt < 0).reduce((a, s) => a - s.bdt, 0))));
  const batch = props.withdrawals > 1 ? batchingSaving(inp, cur.id) : null;
  const fileRef = useRef<HTMLInputElement>(null);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptConsent, setReceiptConsent] = useState(false);
  const [manual, setManual] = useState({ date: new Date().toISOString().slice(0, 10), payer: "", provider: "payoneer", amountUsd: "", bdt: "", reference: "" });

  // Option comparisons
  const optA = channels.find((c) => c.id === "fiverr") || channels[0];
  const optB = channels.find((c) => c.id === "payoneer_bkash") || channels[1];
  const optC = channels.find((c) => c.id === "bank_wire") || top;
  const gainCvsA = optC.netBdt - optA.netBdt;
  const gainCvsAYearly = gainCvsA * 12;

  const csv = () => {
    const head = ["Date", "Payer", "Channel", "Amount (USD)", "BDT received", "Reference", "Entered from", "Amount checked against receipt", "Tax note"];
    const rows = props.ledger.map((r) => [
      r.date, r.payer, r.provider, r.amountUsd.toFixed(2), r.bdtReceived ?? "", r.reference, r.source,
      r.source === "receipt" ? (r.checked ? "yes" : "needs review") : "n/a",
      ["bank", "payoneer", "wise"].includes(r.provider) ? "Formal channel: keep for ITES exemption / incentive claim" : "Check eligibility with your bank",
    ]);
    const body = [head, ...rows].map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\r\n");
    const blob = new Blob(["\uFEFF" + body], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `kormopath-nbr-bank-ledger-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div className="space-y-4">
      {/* Module Title Banner */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line bg-paper px-4 py-2.5">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-kept text-white text-[13px] font-bold">
            <DollarSign size={16} />
          </span>
          <span className="font-bold text-[15px] text-ink">Module 4: KormoPath TakaFlow</span>
          <span className="rounded bg-white px-2 py-0.5 text-[11px] font-semibold text-muted border border-line">
            Deterministic Cross-Border FinOps &amp; NBR Tax Agent
          </span>
        </div>
        <span className="text-[12px] font-medium text-kept flex items-center gap-1">
          <ShieldCheck size={13} /> Deterministic math · no AI in the numbers
        </span>
      </div>

      {/* 3-Route Architecture Cards */}
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-red-200 bg-red-50/40 p-3.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-red-700 uppercase">Option A: Marketplace</span>
            <span className="text-[11px] text-leak font-mono font-bold">-20% Cut</span>
          </div>
          <strong className="block text-[15px] text-ink mt-1">Fiverr / Upwork</strong>
          <p className="text-[12px] text-muted">20% commission + 2% FX conversion drain</p>
          <p className="mt-2 font-mono text-[18px] font-bold text-leak">{fmtBdt(optA.netBdt)}</p>
        </div>

        <div className="rounded-xl border border-blue-200 bg-blue-50/40 p-3.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-blue-700 uppercase">Option B: Direct Payoneer</span>
            <span className="text-[11px] text-blue-800 font-mono font-bold">0% Cut</span>
          </div>
          <strong className="block text-[15px] text-ink mt-1">Direct Client + Payoneer</strong>
          <p className="text-[12px] text-muted">Eliminates 20% commission; 2% payout conversion</p>
          <p className="mt-2 font-mono text-[18px] font-bold text-blue-900">{fmtBdt(optB.netBdt)}</p>
        </div>

        <div className="rounded-xl border-2 border-kept bg-kept-soft/50 p-3.5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-kept uppercase">Option C: Optimal Direct</span>
            <span className="rounded bg-kept px-1.5 py-0.2 text-[10px] font-bold text-white uppercase">+2.5% Incentive</span>
          </div>
          <strong className="block text-[15px] text-ink mt-1">Bank Wire / Wise + BB Incentive</strong>
          <p className="text-[12px] text-muted">Direct SWIFT + 2.5% Bangladesh Bank cash incentive</p>
          <p className="mt-2 font-mono text-[20px] font-extrabold text-kept">{fmtBdt(optC.netBdt)}</p>
        </div>
      </div>

      {/* Switch Gain Callout */}
      {gainCvsA > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-kept/50 bg-kept-soft p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-kept text-white font-bold">
              <ArrowUpRight size={22} />
            </div>
            <div>
              <p className="text-[13px] text-muted font-medium">Switching from Marketplace (Option A) to Direct Bank (Option C):</p>
              <p className="display text-[20px] font-extrabold text-ink">
                You keep <span className="text-kept">+{fmtBdt(gainCvsA)}</span> more per month (
                <span className="text-kept">+{fmtBdt(gainCvsAYearly)}/year</span>)
              </p>
            </div>
          </div>
          <span className="rounded-lg bg-white px-3 py-1.5 text-[12px] font-bold text-ink border border-line">
            Zero Platform Drain
          </span>
        </div>
      )}

      {/* Slider Controls */}
      <Panel className="p-4 sm:p-5">
        <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
          <Field label={`Monthly Invoice Amount: $${invoice.toLocaleString()} USD`}>
            <input
              type="range"
              min={100}
              max={5000}
              step={50}
              value={invoice}
              onChange={(e) => props.setInvoice(Number(e.target.value))}
              className="w-full accent-kept"
              aria-label="Monthly earnings in US dollars"
            />
          </Field>
          <div className="flex flex-wrap gap-3">
            <Field label="Withdrawal Frequency">
              <select className={inputCls} value={props.withdrawals} onChange={(e) => props.setWithdrawals(Number(e.target.value))}>
                {[1, 2, 4].map((n) => <option key={n} value={n}>{n === 1 ? "1× / month (Best for flat fees)" : n === 2 ? "2× / month" : "4× / month (Weekly)"}</option>)}
              </select>
            </Field>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-[13px]">
          <span className="num font-bold">$1 USD = ৳{fx.usdBdt.toFixed(2)} BDT {fx.live ? "(Live)" : "(2026 Base)"}</span>
          <SourceTag source={fx.source} compact />
          <label className="inline-flex items-center gap-2 font-medium text-ink cursor-pointer">
            <input type="checkbox" checked={props.claim} onChange={(e) => props.setClaim(e.target.checked)} className="accent-kept" />
            Claim 2.5% Bangladesh Bank ITES export incentive (via direct bank wire)
          </label>
        </div>
      </Panel>

      {/* Waterfall Comparison */}
      <Panel className="p-4 sm:p-5">
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="display text-[19px] font-bold">Payout Waterfall for {fmtBdt(invoice * fx.usdBdt)} Gross Value</h3>
          <span className={`inline-flex items-center gap-1 text-[12px] font-bold ${inv.ok ? "text-kept" : "text-leak"}`}>
            {inv.ok ? <CircleCheck size={14} /> : <TriangleAlert size={14} />} {inv.ok ? "Every route reconciles to the paisa" : "Reconciliation failed"}
          </span>
        </div>
        <ul className="space-y-2.5">
          {channels.map((c) => <Waterfall key={c.id} c={c} scale={scale} isBest={c.id === top.id} isCurrent={c.id === cur.id && props.current !== "none"} />)}
        </ul>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {props.current !== "none" && top.id !== cur.id && (
            <p className="rounded-lg bg-kept-soft p-3 text-[14px]">
              Switching new work from {cur.name} to <b>{top.name}</b> retains approximately <b className="num text-kept">+{fmtBdt(yearly)}</b> extra take-home pay per year.
            </p>
          )}
          {batch && batch.savedBdt > 0 && (
            <p className="rounded-lg bg-haldi-soft p-3 text-[14px]">
              Consolidating withdrawals to once a month instead of {props.withdrawals}× saves <b className="num">{fmtBdt(batch.savedBdt)}</b> monthly on flat transfer charges.
            </p>
          )}
        </div>
      </Panel>

      {/* Assumptions & Tax Rules */}
      <div className="grid gap-5 xl:grid-cols-2">
        <Panel className="p-4 sm:p-5">
          <h3 className="display text-[19px] font-bold">Verified 2026 Fee Assumptions</h3>
          <p className="mb-3 text-[13px] text-muted">Ground truth data from platform terms of service. You can adjust any parameter to test your scenario.</p>
          <ul className="divide-y divide-line max-h-[380px] overflow-y-auto pr-1">
            {(Object.keys(FEES) as (keyof FeeValues)[]).map((k) => (
              <li key={k} className="py-2">
                <div className="flex items-center gap-3">
                  <p className="min-w-0 flex-1 text-[13px] font-semibold text-ink">{FEES[k].label}</p>
                  <div className="flex shrink-0 items-center gap-1">
                    {FEES[k].unit === "USD" && <span className="text-muted text-[13px]">$</span>}
                    <input
                      type="number"
                      step="0.1"
                      min={0}
                      className="num w-18 rounded-lg border border-line bg-white px-2 py-1 text-right text-[14px] outline-none focus:border-kept"
                      value={fees[k]}
                      aria-label={FEES[k].label}
                      onChange={(e) => props.setFee(k, Math.max(0, Number(e.target.value) || 0))}
                    />
                    {FEES[k].unit === "%" && <span className="text-muted text-[13px]">%</span>}
                  </div>
                </div>
                <div className="mt-0.5"><SourceTag source={FEES[k].source} compact /></div>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel className="p-4 sm:p-5">
          <h3 className="display text-[19px] font-bold">NBR Tax &amp; Bangladesh Bank Repatriation Rules</h3>
          <ul className="mt-2 space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
            {TAX_RULES.map((r) => (
              <li key={r.id} className="rounded-lg border border-line p-3 bg-white">
                <p className="font-bold text-[14px] text-ink">{r.title}</p>
                <p className="text-[13px] mt-0.5 text-ink/90">{r.rule}</p>
                <p className="mt-1 text-[13px] text-muted" lang="bn">{r.bn}</p>
                <div className="mt-1.5"><SourceTag source={r.source} compact /></div>
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      {/* Income Ledger & CSV Download */}
      <Panel className="p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="display text-[19px] font-bold">Foreign Exchange &amp; NBR Tax Ledger</h3>
            <p className="text-[13px] text-muted">
              Maintain audited proof that your income arrived through authorized banking channels for NBR tax exemption and 2.5% incentive claims.
            </p>
          </div>
          <div className="flex gap-2">
            <input ref={fileRef} type="file" accept="image/*,application/pdf" className="hidden" onChange={(e) => setReceiptFile(e.target.files?.[0] ?? null)} />
            <Btn variant="ghost" onClick={() => fileRef.current?.click()} disabled={props.reading}>
              <Upload size={15} /> {receiptFile ? receiptFile.name : "Select Receipt"}
            </Btn>
            <Btn onClick={() => receiptFile && props.onReceipt(receiptFile)} disabled={props.reading || !receiptFile || !receiptConsent}>
              {props.reading ? <Loader2 size={15} className="animate-spin" /> : null} Read Receipt
            </Btn>
            <Btn onClick={csv} disabled={!props.ledger.length}>
              <Download size={15} /> Download NBR &amp; Bank Ledger (.CSV)
            </Btn>
          </div>
        </div>
        <label className="mt-3 flex items-start gap-2 rounded-lg border border-haldi/40 bg-haldi-soft p-3 text-[12px] leading-relaxed text-ink">
          <input type="checkbox" checked={receiptConsent} onChange={(e) => setReceiptConsent(e.target.checked)} className="mt-0.5 accent-kept" />
          <span>I agree to send the selected receipt to KormoPath for OCR. It may be sent to Google Gemini; unpaid-tier submissions may be used to improve Google products and reviewed by people. I will not upload receipts containing sensitive information. <a href="https://ai.google.dev/gemini-api/terms" target="_blank" rel="noopener noreferrer" className="font-bold underline">Review Gemini terms</a>.</span>
        </label>
        {props.receiptMsg && <p className="mt-2 rounded-lg bg-paper px-3 py-2 text-[14px]">{props.receiptMsg}</p>}
        <form
          className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-7"
          onSubmit={(e) => {
            e.preventDefault();
            const amt = Number(manual.amountUsd);
            if (!(amt > 0)) return;
            props.addRow({
              date: manual.date,
              payer: manual.payer || "Direct Client",
              provider: manual.provider,
              amountUsd: amt,
              bdtReceived: manual.bdt ? Number(manual.bdt) : null,
              reference: manual.reference,
              source: "manual",
              checked: false,
            });
            setManual({ ...manual, payer: "", amountUsd: "", bdt: "", reference: "" });
          }}
        >
          <input type="date" className={inputCls} value={manual.date} onChange={(e) => setManual({ ...manual, date: e.target.value })} aria-label="Date" />
          <input className={inputCls} placeholder="Payer / Client" value={manual.payer} onChange={(e) => setManual({ ...manual, payer: e.target.value })} aria-label="Payer" />
          <select className={inputCls} value={manual.provider} onChange={(e) => setManual({ ...manual, provider: e.target.value })} aria-label="Channel">
            {["bank", "payoneer", "wise", "bkash", "fiverr", "upwork", "other"].map((p) => <option key={p}>{p}</option>)}
          </select>
          <input className={`${inputCls} num`} placeholder="USD Amount" inputMode="decimal" value={manual.amountUsd} onChange={(e) => setManual({ ...manual, amountUsd: e.target.value })} aria-label="Amount in USD" />
          <input className={`${inputCls} num`} placeholder="BDT Received" inputMode="decimal" value={manual.bdt} onChange={(e) => setManual({ ...manual, bdt: e.target.value })} aria-label="BDT received" />
          <input className={inputCls} placeholder="Bank Ref / SWIFT" value={manual.reference} onChange={(e) => setManual({ ...manual, reference: e.target.value })} aria-label="Reference" />
          <Btn type="submit" variant="ghost"><Plus size={15} /> Add Row</Btn>
        </form>
        {props.ledger.length > 0 && (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-[14px]">
              <thead className="text-[12px] text-muted [&_th]:px-2 border-b border-line">
                <tr>
                  <th className="py-1">Date</th>
                  <th>Payer</th>
                  <th>Channel</th>
                  <th className="text-right">USD</th>
                  <th className="text-right">BDT</th>
                  <th>SWIFT / Ref</th>
                  <th>Verification</th>
                  <th />
                </tr>
              </thead>
              <tbody className="divide-y divide-line [&_td]:px-2">
                {props.ledger.map((r) => (
                  <tr key={r.id}>
                    <td className="num py-2 text-[13px]">{r.date}</td>
                    <td className="font-medium">{r.payer}</td>
                    <td><span className="rounded bg-paper px-2 py-0.5 text-[12px] font-mono">{r.provider}</span></td>
                    <td className="num text-right font-bold">${r.amountUsd.toFixed(2)}</td>
                    <td className="num text-right font-bold text-kept">{r.bdtReceived != null ? fmtBdt(r.bdtReceived) : "—"}</td>
                    <td className="max-w-[140px] truncate font-mono text-[12px] text-muted">{r.reference || "—"}</td>
                    <td className="text-[12px]">
                      {r.source === "manual" ? "Manual" : r.checked ? <span className="text-kept font-semibold">OCR Verified</span> : <span className="text-[#7a5410]">Review</span>}
                    </td>
                    <td>
                      <button onClick={() => props.removeRow(r.id)} aria-label="Remove row" className="p-1 text-muted hover:text-leak">
                        <Trash2 size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}
