"use client";
import { useMemo, useState } from "react";
import { buildContract, milestoneAmounts, bnDigits, type ContractInput } from "@/lib/contract";
import { MACRO } from "@/lib/data";
import { Panel, Btn, Field, inputCls } from "./ui";
import { Printer, Copy, Loader2, Mail, ShieldAlert, Sparkles, FileText, CheckCircle2 } from "lucide-react";

export interface Pitch {
  engine: string;
  subject: string;
  body: string;
  raw: string | null;
}

export function StageContract({
  c, set, pitch, pitching, onPitch, passportId, error,
}: {
  c: ContractInput;
  set: (patch: Partial<ContractInput>) => void;
  pitch: Pitch | null;
  pitching: boolean;
  onPitch: () => void;
  passportId: string | null;
  error?: string | null;
}) {
  const [lang, setLang] = useState<"en" | "bn">("en");
  const [copied, setCopied] = useState<string | null>(null);
  const [pitchConsent, setPitchConsent] = useState(false);
  const doc = useMemo(() => buildContract(c, lang), [c, lang]);
  const amounts = milestoneAmounts(c.valueUsd, c.milestones);
  const pctSum = c.milestones.reduce((a, m) => a + m.pct, 0);
  const copy = (k: string, t: string) => {
    navigator.clipboard?.writeText(t);
    setCopied(k);
    setTimeout(() => setCopied(null), 1500);
  };
  const plain = `${doc.title}\n\n` + doc.clauses.map((cl, i) => `${i + 1}. ${cl.heading}\n${cl.body}`).join("\n\n");

  return (
    <div className="space-y-4">
      {/* Module Title Banner */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line bg-paper px-4 py-2.5">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-kept text-white text-[13px] font-bold">
            <FileText size={16} />
          </span>
          <span className="font-bold text-[15px] text-ink">Module 3: KormoPath ChuktiGuard</span>
          <span className="rounded bg-white px-2 py-0.5 text-[11px] font-semibold text-muted border border-line">
            Direct-Client Pitch &amp; Blackout-Shield Legal Agent
          </span>
        </div>
        <span className="text-[12px] font-medium text-muted">
          Saves 20% marketplace commissions + Enforces 48-Hour Outage SLA
        </span>
      </div>

      <div className="flex items-start gap-3 rounded-xl border border-haldi bg-haldi-soft/70 p-3.5 text-[14px] no-print">
        <ShieldAlert size={20} className="mt-0.5 shrink-0 text-[#7a5410]" />
        <div>
          <strong className="block text-[#7a5410] font-bold mb-0.5">Ethical Compliance &amp; Marketplace Rule:</strong>
          <p>{MACRO.marketplaceWarning}</p>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <div className="space-y-4 no-print">
          <Panel className="space-y-3 p-4 sm:p-5">
            <h3 className="display text-[19px] font-bold">Deal Terms &amp; Scope</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Your Name"><input className={inputCls} value={c.freelancer} onChange={(e) => set({ freelancer: e.target.value })} placeholder="Your full name" /></Field>
              <Field label="Client Name"><input className={inputCls} value={c.client} onChange={(e) => set({ client: e.target.value })} placeholder="Client contact or company" /></Field>
              <Field label="Client Country"><input className={inputCls} value={c.clientCountry} onChange={(e) => set({ clientCountry: e.target.value })} placeholder="United States, Germany, etc." /></Field>
              <Field label="Fixed Price (USD)"><input type="number" min={1} className={`${inputCls} num`} value={c.valueUsd} onChange={(e) => set({ valueUsd: Math.max(1, Number(e.target.value) || 1) })} /></Field>
            </div>
            <Field label="Project Scope & Deliverables"><textarea rows={3} className={inputCls} value={c.scope} onChange={(e) => set({ scope: e.target.value })} placeholder="Core deliverables, timeline, tech stack..." /></Field>
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="Delivery Days"><input type="number" min={1} className={`${inputCls} num`} value={c.deliveryDays} onChange={(e) => set({ deliveryDays: Math.max(1, Number(e.target.value) || 1) })} /></Field>
              <Field label="Clause 4 Outage Buffer">
                <select className={inputCls} value={c.bufferHours} onChange={(e) => set({ bufferHours: Number(e.target.value) })}>
                  {[24, 48, 72].map((h) => <option key={h} value={h}>{h} hours</option>)}
                </select>
              </Field>
              <Field label="Payment Channel">
                <select className={inputCls} value={c.channel} onChange={(e) => set({ channel: e.target.value })}>
                  {["direct bank wire (SWIFT)", "Payoneer", "Wise"].map((h) => <option key={h}>{h}</option>)}
                </select>
              </Field>
            </div>
            <div>
              <p className="mb-1 text-[14px] font-semibold">Milestone Billing Schedule</p>
              <ul className="space-y-1.5">
                {c.milestones.map((m, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <input className={`${inputCls} flex-1`} value={m.label} aria-label={`Milestone ${i + 1} name`} onChange={(e) => set({ milestones: c.milestones.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)) })} />
                    <input type="number" min={1} max={100} className={`${inputCls} num w-20`} value={m.pct} aria-label={`Milestone ${i + 1} percent`} onChange={(e) => set({ milestones: c.milestones.map((x, j) => (j === i ? { ...x, pct: Math.max(1, Number(e.target.value) || 1) } : x)) })} />
                    <span className="num w-20 text-right text-[14px] text-muted font-mono">${amounts[i].toFixed(2)}</span>
                  </li>
                ))}
              </ul>
              {pctSum !== 100 && <p className="mt-1 text-[13px] text-leak">Milestones sum to {pctSum}%. Please adjust to 100%.</p>}
            </div>
          </Panel>

          <Panel className="p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="display text-[19px] font-bold">Direct Client Outreach Kit</h3>
              <Btn variant="ghost" onClick={onPitch} disabled={pitching || pctSum !== 100 || !pitchConsent}>
                {pitching ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />} {pitch ? "Regenerate Pitch" : "Generate Cold Pitch"}
              </Btn>
            </div>
            <label className="mt-3 flex items-start gap-2 rounded-lg border border-haldi/40 bg-haldi-soft p-3 text-[12px] leading-relaxed text-ink">
              <input type="checkbox" checked={pitchConsent} onChange={(e) => setPitchConsent(e.target.checked)} className="mt-0.5 accent-kept" />
              <span>I agree to send the entered names, client details, scope, and pricing to KormoPath to draft this pitch; it may be sent to Google Gemini. Unpaid-tier submissions may be used to improve Google products and reviewed by people. I will not enter sensitive or confidential information. <a href="https://ai.google.dev/gemini-api/terms" target="_blank" rel="noopener noreferrer" className="font-bold underline">Review Gemini terms</a>.</span>
            </label>
            {error && <p role="alert" className="mt-3 rounded-lg bg-leak-soft px-3 py-2 text-[14px] text-leak">{error}</p>}
            {pitch ? (
              <>
                <p className="mt-3 text-[14px]"><span className="text-muted">Subject:</span> <span className="font-semibold text-ink">{pitch.subject}</span></p>
                <pre className="mt-2 whitespace-pre-wrap rounded-lg bg-paper p-3 font-sans text-[14px] leading-relaxed border border-line">{pitch.body}</pre>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <Btn variant="ghost" onClick={() => copy("pitch", `${pitch.subject}\n\n${pitch.body}`)}>
                    <Copy size={15} /> {copied === "pitch" ? "Copied" : "Copy Pitch Email"}
                  </Btn>
                  <a className="inline-flex items-center gap-2 rounded-lg border border-ink/20 bg-white px-3.5 py-2 text-[14px] font-semibold hover:border-kept" href={`mailto:?subject=${encodeURIComponent(pitch.subject)}&body=${encodeURIComponent(pitch.body)}`}>
                    <Mail size={15} /> Open in Email Client
                  </a>
                  <span className="text-[12px] text-muted">Dollar figures reconciled with contract{passportId ? "; links your verified passport" : ""}</span>
                </div>
              </>
            ) : (
              <p className="mt-2 text-[14px] text-muted">
                The outreach agent writes a concise cold proposal incorporating your verified skills, milestone pricing, and eliminating the 20% platform commission.
              </p>
            )}
          </Panel>
        </div>

        <Panel className="p-0">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-3 no-print bg-paper/60">
            <div className="inline-flex rounded-lg border border-line bg-white p-0.5" role="group" aria-label="Contract language">
              {(["en", "bn"] as const).map((l) => (
                <button key={l} onClick={() => setLang(l)} aria-pressed={lang === l} className={`rounded-md px-3 py-1 text-[13px] font-bold transition-colors ${lang === l ? "bg-ink text-white" : "text-muted hover:text-ink"}`}>
                  {l === "en" ? "English Agreement" : "বাংলা চুক্তিপত্র"}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <Btn variant="ghost" onClick={() => copy("contract", plain)}>
                <Copy size={15} /> {copied === "contract" ? "Copied" : "Copy Agreement"}
              </Btn>
              <Btn onClick={() => window.print()}>
                <Printer size={15} /> Print / Save PDF
              </Btn>
            </div>
          </div>

          <article id="contract-print" className="px-5 py-6 sm:px-8" lang={lang}>
            <div className="flex items-center justify-between border-b border-line pb-3">
              <h3 className="display text-[22px] font-bold text-ink">{doc.title}</h3>
              <span className="rounded bg-kept-soft px-2.5 py-0.5 text-[11px] font-bold text-kept">
                KormoPath Legal SLA
              </span>
            </div>
            <ol className="mt-4 space-y-4">
              {doc.clauses.map((cl, i) => (
                <li key={i} className={cl.highlight ? "rounded-lg border-2 border-kept/50 bg-kept-soft/50 py-3 pl-4 pr-3 shadow-sm" : ""}>
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-[15px] text-ink">{lang === "bn" ? bnDigits(i + 1) : i + 1}. {cl.heading}</h4>
                    {cl.highlight && <span className="rounded bg-kept text-white text-[10px] font-bold px-2 py-0.5 uppercase">Blackout Shield</span>}
                  </div>
                  <p className="mt-1.5 text-[14px] leading-relaxed text-ink/90">{cl.body}</p>
                </li>
              ))}
            </ol>
            <div className="mt-10 grid grid-cols-2 gap-8 text-[14px]">
              <div className="border-t border-ink pt-1.5 font-semibold">{c.client || "Client Representative"}</div>
              <div className="border-t border-ink pt-1.5 font-semibold">{c.freelancer || "Independent Contractor"}</div>
            </div>
            <p className="mt-6 text-[12px] text-muted">
              {lang === "en" ? "Fixed reviewed template. Grounded in deterministic rules. Model output never alters legal clauses." : "পর্যালোচিত নির্দিষ্ট চুক্তি কাঠামো। মডেল আউটপুট আইনি ধারা পরিবর্তন করে না।"}
            </p>
          </article>
        </Panel>
      </div>
    </div>
  );
}
