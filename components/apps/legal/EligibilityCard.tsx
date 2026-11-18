"use client";
import { useMemo, useState } from "react";
import { Scale, RotateCcw } from "lucide-react";
import { SourceTag } from "@/components/layout/AppHeader";
import { assessLegalAidEligibility } from "@/lib/legal/eligibility";
import { NLASO_LEGAL_AID_PAGE } from "@/lib/legal/data";
import { EMPTY_ANSWERS, QUICK_QUESTIONS, answeredCount, eligibilityMessage, factsFromAnswers, type QuickAnswers } from "@/lib/legal/citizen";

type Lang = "bn" | "en";

const TONE = {
  likely: "border-emerald-300 bg-emerald-50 text-emerald-950",
  maybe: "border-amber-300 bg-amber-50 text-amber-950",
  unclear: "border-slate-200 bg-slate-50 text-slate-900",
} as const;

/**
 * Quick check: "may I get government legal aid?" Ported from the Digital Legal Aid System's eligibility engine
 * (lib/legal/eligibility.ts). Unanswered questions stay unknown; the verdict always ends with "the office decides".
 * Nothing here is saved.
 */
export function EligibilityCard({ lang, categoryId = null }: { lang: Lang; categoryId?: string | null }) {
  const bn = lang === "bn";
  const T = (b: string, e: string) => (bn ? b : e);
  const [a, setA] = useState<QuickAnswers>(EMPTY_ANSWERS);
  const n = answeredCount(a);
  const result = useMemo(() => eligibilityMessage(assessLegalAidEligibility(factsFromAnswers(a, categoryId))), [a, categoryId]);
  const set = (id: keyof QuickAnswers, v: boolean) => setA((p) => ({ ...p, [id]: p[id] === v ? null : v }));
  const signature = Object.values(a).map((v) => (v === null ? "-" : v ? "1" : "0")).join("");

  return (
    <section aria-labelledby="lg-elig-h" data-testid="legal-eligibility" className="lg-card space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="kp-eyebrow">{T("২ মিনিটের যাচাই", "2-minute check")}</p>
          <h2 id="lg-elig-h" className="mt-1 text-[clamp(21px,3vw,27px)] font-semibold leading-tight text-slate-900">
            {T("সরকারি খরচে আইনি সহায়তা পেতে পারেন?", "Could you get free government legal aid?")}
          </h2>
          <p className="mt-1 max-w-[62ch] text-[15px] leading-relaxed text-slate-700">
            {T("যেটা জানেন সেটার উত্তর দিন; বাকিগুলো ফাঁকা রাখলেও চলবে। কিছুই সংরক্ষণ হয় না।", "Answer what you know; you can leave the rest blank. Nothing is saved.")}
          </p>
        </div>
        {n > 0 && (
          <button type="button" onClick={() => setA(EMPTY_ANSWERS)} className="kp-btn-ghost inline-flex min-h-[44px] items-center gap-1.5 px-3 text-[14px]">
            <RotateCcw size={16} aria-hidden /> {T("আবার শুরু", "Start over")}
          </button>
        )}
      </div>

      <ul className="grid gap-2 sm:grid-cols-2">
        {QUICK_QUESTIONS.map((q) => (
          <li key={q.id} className="flex min-h-[52px] flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2">
            <span className="min-w-0 flex-1 text-[14.5px] leading-snug text-slate-800">{bn ? q.bn : q.en}</span>
            <span className="flex shrink-0 gap-1.5" role="group" aria-label={bn ? q.bn : q.en}>
              {([true, false] as const).map((v) => (
                <button key={String(v)} type="button" aria-pressed={a[q.id] === v} onClick={() => set(q.id, v)} data-q={q.id} data-v={v ? "yes" : "no"}
                  className={`kp-chip !h-10 min-w-[56px] justify-center !text-[14px] font-semibold ${a[q.id] === v ? (v ? "!border-emerald-600 !bg-emerald-50 text-emerald-900" : "!border-slate-500 !bg-slate-100 text-slate-900") : ""}`}>
                  {v ? T("হ্যাঁ", "Yes") : T("না", "No")}
                </button>
              ))}
            </span>
          </li>
        ))}
      </ul>

      {n > 0 && (
        <div aria-live="polite" data-tone={result.tone} data-testid="legal-eligibility-result" className={`flex gap-4 rounded-2xl border-2 p-4 ${TONE[result.tone]}`}>
          <span key={signature} className="lg-scale lg-scale-settle mt-1 shrink-0 text-indigo-800" aria-hidden><Scale size={40} strokeWidth={1.75} /></span>
          <div className="min-w-0 space-y-2">
            <p className="text-[18px] font-bold leading-snug">{bn ? result.title.bn : result.title.en}</p>
            {result.reasons.length > 0 && (
              <ul className="flex flex-wrap gap-1.5">
                {result.reasons.map((r) => <li key={r.en} className="rounded-full border border-current/20 bg-white/70 px-3 py-1 text-[13.5px] leading-[1.4]">{bn ? r.bn : r.en}</li>)}
              </ul>
            )}
            <p className="text-[14.5px] leading-relaxed">{bn ? result.note.bn : result.note.en}</p>
            <SourceTag confidence="official" label={NLASO_LEGAL_AID_PAGE.label} url={NLASO_LEGAL_AID_PAGE.url} checked={NLASO_LEGAL_AID_PAGE.checked} />
          </div>
        </div>
      )}
    </section>
  );
}
