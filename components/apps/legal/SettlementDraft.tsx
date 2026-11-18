"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { FileSignature, Plus, Printer, Save, Scale, Trash2, X } from "lucide-react";
import { SourceTag } from "@/components/layout/AppHeader";
import {
  bnNum, buildDraft, installmentPlan, parseTakaToPoisha, takaText, termProblems, dateKeyBn,
  type DraftInputs, type Installment, type Party, type Term, type UiDraft,
} from "@/lib/legal/mediationUi";

/*
 * Settlement draft builder (ported from the Digital Legal Aid System's settlement-draft, razibr246 and
 * AdribMahmud101). Clause by clause, each with where its words came from; anything the person did not write stays
 * OPEN. It is a draft for discussion: never binding, never a court document. Saved on the device only after review.
 */
const uid = () => Math.random().toString(36).slice(2, 10);

export function SourceChip({ c }: { c: UiDraft["clauses"][number] }) {
  const tone = c.source === "open" ? "border-amber-300 bg-amber-50 text-amber-900" : c.source === "yours" ? "border-indigo-200 bg-indigo-50 text-indigo-900" : "border-emerald-200 bg-emerald-50 text-emerald-900";
  return <span className={`inline-flex min-h-[26px] items-center rounded-full border px-2.5 text-[12px] font-semibold leading-[1.4] ${tone}`}>{c.provenanceBn}</span>;
}

/** The draft as a document: shared by the review step and the print page. */
export function DraftDocument({ draft, stamp = true }: { draft: UiDraft; stamp?: boolean }) {
  const laws = [...new Map(draft.clauses.filter((c) => c.law).map((c) => [c.law!.id, c.law!])).values()];
  return (
    <article className="relative space-y-3" data-testid="settle-document">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h3 className="text-[20px] font-extrabold text-slate-900">{draft.titleBn}</h3>
        {stamp && <span className="lg-seal lg-seal-in text-[14px]">খসড়া · আদালতের দলিল নয়</span>}
      </div>
      <ol className="space-y-2">
        {draft.clauses.map((c) => (
          <li key={c.id} data-clause={c.id} data-source={c.source} className={`rounded-xl border p-3 ${c.bodyBn ? "border-slate-200 bg-white" : "border-dashed border-amber-400 bg-amber-50/60"}`}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-[15px] font-bold text-slate-900">{c.headingBn}</p>
              <SourceChip c={c} />
            </div>
            <p className="mt-1 text-[15px] leading-relaxed text-slate-800">{c.bodyBn ?? <span className="text-amber-900">খালি — {c.needsBn}</span>}</p>
            {c.law && <p className="mt-1 text-[13px] text-slate-600">সংশ্লিষ্ট আইন: {c.law.bn}</p>}
          </li>
        ))}
      </ol>
      <p className={`rounded-xl px-3 py-2 text-[15px] font-semibold ${draft.openIds.length ? "bg-amber-50 text-amber-950" : "bg-emerald-50 text-emerald-950"}`} data-testid="settle-status">{draft.completeBn}</p>
      <p className="text-[13.5px] leading-relaxed text-slate-600">এটি আইনি তথ্য ও আলোচনার খসড়া — আইনি পরামর্শ নয়, বাধ্যতামূলক চুক্তি নয়, আদালত বা কোনো সরকারি অফিস এটি অনুমোদন করেনি।</p>
      {laws.length > 0 && <div className="flex flex-wrap gap-2">{laws.map((l) => <SourceTag key={l.id} confidence="official" label={l.source.label} url={l.source.url} checked={l.source.checked} />)}</div>}
    </article>
  );
}

function MoneyEditor({ t, onChange, bn }: { t: Extract<Term, { kind: "money" }>; onChange: (t: Term) => void; bn: boolean }) {
  const T = (b: string, e: string) => (bn ? b : e);
  const [totalText, setTotalText] = useState(t.totalPoisha ? String(t.totalPoisha / 100) : "");
  const [count, setCount] = useState(String(t.installments.length || 1));
  const [first, setFirst] = useState(t.installments[0]?.date ?? "");
  const total = parseTakaToPoisha(totalText);
  const make = () => {
    if (!total || !first) return;
    onChange({ ...t, totalPoisha: total, installments: installmentPlan(total, Number(count) || 1, first) });
  };
  const setInst = (i: number, patch: Partial<Installment>) => onChange({ ...t, installments: t.installments.map((x, j) => (j === i ? { ...x, ...patch } : x)) });
  const input = "mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-[15px]";
  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-[14px] font-semibold text-slate-800">{T("কে দেবেন", "Who pays")}
          <select value={t.payer} onChange={(e) => onChange({ ...t, payer: e.target.value as Party })} className={input}>
            <option value="opposite">{T("বিপরীত পক্ষ", "The other side")}</option>
            <option value="applicant">{T("আবেদনকারী (আমি)", "The applicant (me)")}</option>
          </select>
        </label>
        <label className="text-[14px] font-semibold text-slate-800">{T("কী বাবদ", "What for")}
          <input value={t.purposeBn} maxLength={120} onChange={(e) => onChange({ ...t, purposeBn: e.target.value })} placeholder={T("যেমন: বকেয়া ভরণপোষণ", "e.g. unpaid maintenance")} className={input} />
        </label>
        <label className="text-[14px] font-semibold text-slate-800">{T("মোট টাকা (৳)", "Total (৳)")}
          <input inputMode="decimal" value={totalText} onChange={(e) => setTotalText(e.target.value)} className={`${input} font-mono`} data-testid="settle-total" />
        </label>
        <div className="grid grid-cols-2 gap-2">
          <label className="text-[14px] font-semibold text-slate-800">{T("কিস্তি", "Installments")}
            <input inputMode="numeric" value={count} onChange={(e) => setCount(e.target.value.replace(/[^0-9]/g, "").slice(0, 2))} className={`${input} font-mono`} />
          </label>
          <label className="text-[14px] font-semibold text-slate-800">{T("প্রথম তারিখ", "First date")}
            <input type="date" value={first} onChange={(e) => setFirst(e.target.value)} className={input} data-testid="settle-first" />
          </label>
        </div>
      </div>
      <button type="button" onClick={make} disabled={!total || !first} className="kp-btn-ghost min-h-[44px] rounded-xl px-4 text-[14px] disabled:opacity-50" data-testid="settle-plan">{T("মাসিক কিস্তি বানান", "Make monthly plan")}</button>
      {t.installments.length > 0 && (
        <ol className="space-y-2">
          {t.installments.map((x, i) => (
            <li key={i} className="grid grid-cols-[auto_1fr_1fr] items-center gap-2 text-[14px]">
              <span className="font-mono text-slate-600">{bn ? bnNum(i + 1) : i + 1}.</span>
              <input type="date" value={x.date} onChange={(e) => setInst(i, { date: e.target.value })} className="min-w-0 rounded-xl border border-slate-300 px-2 py-2 text-[14px]" aria-label={T("তারিখ", "Date")} />
              <input key={x.amountPoisha} inputMode="decimal" defaultValue={String(x.amountPoisha / 100)} onBlur={(e) => setInst(i, { amountPoisha: parseTakaToPoisha(e.target.value) ?? 0 })} className="min-w-0 rounded-xl border border-slate-300 px-2 py-2 font-mono text-[14px]" aria-label={T("টাকা", "Amount")} />
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

export function SettlementDraft({
  bn, draft, setDraft, onSave, savedAt,
}: {
  bn: boolean;
  draft: DraftInputs; setDraft: (d: DraftInputs) => void;
  onSave: () => void; savedAt: string | null;
}) {
  const T = (b: string, e: string) => (bn ? b : e);
  const [reviewing, setReviewing] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const built = useMemo(() => buildDraft(draft), [draft]);
  const problems = draft.terms.flatMap((t, i) => termProblems(t).map((p) => `${T("শর্ত", "Term")} ${bn ? bnNum(i + 1) : i + 1}: ${p}`));
  const set = (patch: Partial<DraftInputs>) => { setDraft({ ...draft, ...patch }); setReviewing(false); setJustSaved(false); };
  const setTerm = (i: number, t: Term) => set({ terms: draft.terms.map((x, j) => (j === i ? t : x)) });
  const input = "mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-[15px]";

  return (
    <section aria-labelledby="settle-h" className="lg-card space-y-5">
      <div>
        <p className="kp-eyebrow">{T("খসড়া", "Draft")}</p>
        <h2 id="settle-h" className="mt-1 flex items-center gap-2 text-[clamp(21px,3vw,27px)] font-semibold leading-tight text-slate-900"><FileSignature size={22} className="text-indigo-700" aria-hidden />{T("মীমাংসার খসড়া, ধারা ধরে ধরে", "A settlement draft, clause by clause")}</h2>
        <p className="mt-2 max-w-[62ch] text-[15px] leading-relaxed text-slate-700">{T("আপনি যা লিখবেন শুধু তা-ই খসড়ায় বসবে। যা লেখেননি তা খালি থাকবে — কেউ যেন না-জানা শর্তে সই না করে। প্রতিটি ধারার পাশে লেখা থাকবে কথাগুলো কোথা থেকে এসেছে।", "Only what you write goes into the draft. Anything you did not write stays blank, so no one signs a term they never agreed. Each clause shows where its words came from.")}</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-[14px] font-semibold text-slate-800">{T("আবেদনকারী (আপনার নাম)", "Applicant (your name)")}<input value={draft.applicant} maxLength={80} onChange={(e) => set({ applicant: e.target.value })} className={input} data-testid="settle-applicant" /></label>
        <label className="text-[14px] font-semibold text-slate-800">{T("বিপরীত পক্ষ", "Other side")}<input value={draft.opposite} maxLength={80} onChange={(e) => set({ opposite: e.target.value })} className={input} data-testid="settle-opposite" /></label>
        <label className="text-[14px] font-semibold text-slate-800">{T("জেলা", "District")}<input value={draft.district} maxLength={60} onChange={(e) => set({ district: e.target.value })} className={input} /></label>
        <label className="text-[14px] font-semibold text-slate-800">{T("স্থান", "Venue")}<input value={draft.venue} maxLength={120} onChange={(e) => set({ venue: e.target.value })} placeholder={T("যেমন: জেলা লিগ্যাল এইড অফিস", "e.g. district legal aid office")} className={input} /></label>
        <label className="text-[14px] font-semibold text-slate-800 sm:col-span-2">{T("বিরোধের ছোট বিবরণ", "Short description of the dispute")}<textarea rows={2} value={draft.problem} maxLength={800} onChange={(e) => set({ problem: e.target.value })} className={input} /></label>
      </div>
      {draft.sessionDate && <p className="text-[14px] text-slate-600">{T("আলোচনার তারিখ:", "Session date:")} {dateKeyBn(draft.sessionDate)}</p>}

      <div className="space-y-3">
        <h3 className="text-[17px] font-bold text-slate-900">{T("শর্তগুলো", "Terms")}</h3>
        {draft.terms.map((t, i) => (
          <div key={t.id} className="rounded-xl border border-slate-200 bg-slate-50/60 p-3 motion-safe:animate-rise-in" data-term={t.kind}>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-[15px] font-bold text-slate-900">{T("শর্ত", "Term")} {bn ? bnNum(i + 1) : i + 1}: {t.kind === "money" ? T("টাকা পরিশোধ", "Payment") : T("কাজ", "Action")}</p>
              <button type="button" onClick={() => set({ terms: draft.terms.filter((_, j) => j !== i) })} className="grid h-11 w-11 place-items-center rounded-xl text-red-700 hover:bg-red-50" aria-label={T("শর্ত মুছুন", "Remove term")}><Trash2 size={18} aria-hidden /></button>
            </div>
            {t.kind === "money" ? <MoneyEditor t={t} onChange={(nt) => setTerm(i, nt)} bn={bn} /> : (
              <div className="grid gap-3 sm:grid-cols-[1fr_2fr_1fr]">
                <label className="text-[14px] font-semibold text-slate-800">{T("কে করবেন", "Who")}
                  <select value={t.by} onChange={(e) => setTerm(i, { ...t, by: e.target.value as Party })} className={input}>
                    <option value="opposite">{T("বিপরীত পক্ষ", "The other side")}</option>
                    <option value="applicant">{T("আবেদনকারী (আমি)", "The applicant (me)")}</option>
                  </select>
                </label>
                <label className="text-[14px] font-semibold text-slate-800">{T("কী করবেন", "What")}<input value={t.whatBn} maxLength={300} onChange={(e) => setTerm(i, { ...t, whatBn: e.target.value })} placeholder={T("যেমন: জমির দলিলের কপি হস্তান্তর", "e.g. hand over a copy of the land deed")} className={input} /></label>
                <label className="text-[14px] font-semibold text-slate-800">{T("শেষ তারিখ", "Due")}<input type="date" value={t.dueDate} onChange={(e) => setTerm(i, { ...t, dueDate: e.target.value })} className={input} /></label>
              </div>
            )}
          </div>
        ))}
        <div className="flex flex-wrap gap-2">
          <button type="button" data-testid="settle-add-clause" onClick={() => set({ terms: [...draft.terms, { id: uid(), kind: "money", payer: "opposite", purposeBn: "", totalPoisha: 0, installments: [] }] })} className="kp-btn-ghost inline-flex min-h-[44px] items-center gap-2 rounded-xl px-4 text-[14px]"><Plus size={17} aria-hidden />{T("টাকার শর্ত", "Payment term")}</button>
          <button type="button" onClick={() => set({ terms: [...draft.terms, { id: uid(), kind: "deed", by: "opposite", whatBn: "", dueDate: "" }] })} className="kp-btn-ghost inline-flex min-h-[44px] items-center gap-2 rounded-xl px-4 text-[14px]"><Plus size={17} aria-hidden />{T("কাজের শর্ত", "Action term")}</button>
          <button type="button" onClick={() => set({ conditions: [...draft.conditions, ""] })} className="kp-btn-ghost inline-flex min-h-[44px] items-center gap-2 rounded-xl px-4 text-[14px]"><Plus size={17} aria-hidden />{T("শর্ত ভাঙলে কী হবে", "If a term is broken")}</button>
        </div>
        {draft.conditions.map((c, i) => (
          <div key={i} className="flex items-start gap-2">
            <textarea rows={2} value={c} maxLength={300} onChange={(e) => set({ conditions: draft.conditions.map((x, j) => (j === i ? e.target.value : x)) })} placeholder={T("যেমন: কিস্তি বকেয়া পড়লে আবেদনকারী আইনি পদক্ষেপ নিতে পারবেন।", "e.g. if an installment is missed the applicant may take legal action.")} className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-[15px]" />
            <button type="button" onClick={() => set({ conditions: draft.conditions.filter((_, j) => j !== i) })} className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-slate-600 hover:bg-slate-100" aria-label={T("সরান", "Remove")}><X size={18} aria-hidden /></button>
          </div>
        ))}
        {built.totalPoisha > 0 && <p className="text-[15px] font-semibold text-slate-900">{T("মোট টাকা:", "Total money:")} <span className="font-mono">{takaText(built.totalPoisha, bn)}</span></p>}
      </div>

      {problems.length > 0 && <ul className="space-y-1 rounded-xl bg-amber-50 p-3 text-[14px] text-amber-950" data-testid="settle-problems">{problems.map((p) => <li key={p}>• {p}</li>)}</ul>}

      <div className="flex flex-wrap items-center gap-2">
        <button type="button" data-testid="settle-review" disabled={problems.length > 0} onClick={() => setReviewing(true)} className="kp-btn-primary inline-flex min-h-[48px] items-center gap-2 rounded-xl px-5 text-[15px] disabled:opacity-50"><Scale size={18} aria-hidden />{T("খসড়া দেখে নিন", "Review the draft")}</button>
        {savedAt && <Link href="/legal/mediation/print" data-testid="settle-print" className="kp-btn-ghost inline-flex min-h-[48px] items-center gap-2 rounded-xl px-4 text-[15px]"><Printer size={18} aria-hidden />{T("প্রিন্ট বা PDF", "Print or PDF")}</Link>}
      </div>

      {reviewing && (
        <div className="space-y-3 rounded-2xl border-2 border-indigo-300 bg-indigo-50/40 p-4" data-testid="settle-confirm">
          <DraftDocument draft={built} />
          <div className="flex flex-wrap gap-2">
            <button type="button" data-testid="settle-save" onClick={() => { onSave(); setReviewing(false); setJustSaved(true); }} className="kp-btn-primary inline-flex min-h-[48px] items-center gap-2 rounded-xl px-5 text-[15px]"><Save size={18} aria-hidden />{T("এই ফোনে সংরক্ষণ করুন", "Save on this phone")}</button>
            <button type="button" onClick={() => setReviewing(false)} className="kp-btn-ghost min-h-[48px] rounded-xl px-4 text-[15px]">{T("আবার ঠিক করুন", "Keep editing")}</button>
          </div>
        </div>
      )}
      {justSaved && <p role="status" className="flex items-center gap-2 text-[14.5px] font-semibold text-emerald-800"><span className="lg-scale lg-scale-settle" aria-hidden><Scale size={20} /></span>{T("খসড়া শুধু এই ফোনে সংরক্ষিত হয়েছে। এটি কোথাও জমা হয়নি।", "Draft saved only on this phone. It has not been submitted anywhere.")}</p>}
    </section>
  );
}
