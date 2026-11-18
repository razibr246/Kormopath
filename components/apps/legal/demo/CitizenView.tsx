"use client";
import { useState } from "react";
import { CITIZEN_STATUS_LABELS, CASE_STATUSES } from "@/lib/legal/caseDomain";
import { describeTracker } from "@/lib/legal/lawyerTracker";
import { DEMO_CASES, lawyerById, lawyerCaseView, stageOf, type DemoState } from "@/lib/legal/demoData";
import { num, type Lang } from "./shared";

const PATH = CASE_STATUSES.filter((s) => s !== "unresolved");

/** What one fictional applicant would see about their own case: plain status words, never internal codes. */
export function CitizenView({ state, lang, now }: { state: DemoState; lang: Lang; now: Date }) {
  const bn = lang === "bn";
  const T = (b: string, e: string) => (bn ? b : e);
  const [id, setId] = useState("DEMO-05");
  const c = DEMO_CASES.find((x) => x.id === id)!;
  const stage = stageOf(state, c);
  const lv = lawyerCaseView(state, c, now);
  const at = (PATH as readonly string[]).indexOf(stage);
  return (
    <section aria-labelledby="citizen-h" className="lg-card space-y-4" data-testid="citizen-view">
      <div>
        <p className="kp-eyebrow">{T("আবেদনকারীর চোখে · নমুনা", "Applicant view · demo")}</p>
        <h2 id="citizen-h" className="mt-1 text-[20px] font-extrabold text-slate-900">{T("আমার কেস কোথায় আছে", "Where my case is")}</h2>
      </div>
      <label className="block text-[14px] font-semibold text-slate-700">{T("কোন নমুনা আবেদনকারী", "Which demo applicant")}
        <select value={id} onChange={(e) => setId(e.target.value)} className="mt-1 block min-h-[44px] w-full rounded-xl border border-slate-300 bg-white px-3 text-[15px] font-normal">
          {DEMO_CASES.map((x) => <option key={x.id} value={x.id}>{bn ? x.nameBn : x.nameEn}</option>)}
        </select>
      </label>
      <ol className="grid gap-2 sm:grid-cols-6" aria-label={T("কেসের ধাপ", "Case stages")}>
        {PATH.map((s, i) => {
          const done = stage !== "unresolved" && i <= at;
          return (
            <li key={s} className={`rounded-xl border px-3 py-2 text-[13.5px] leading-[1.4] ${i === at ? "border-indigo-600 bg-indigo-50 font-bold text-indigo-900" : done ? "border-emerald-300 bg-emerald-50 text-emerald-900" : "border-slate-200 bg-white text-slate-500"}`}>
              {bn ? CITIZEN_STATUS_LABELS[s].bn : CITIZEN_STATUS_LABELS[s].en}
            </li>
          );
        })}
      </ol>
      {stage === "unresolved" && <p className="rounded-xl border border-slate-300 bg-slate-50 p-3 text-[15px]">{T(CITIZEN_STATUS_LABELS.unresolved.bn, CITIZEN_STATUS_LABELS.unresolved.en)}</p>}
      <p className="text-[15px] leading-relaxed text-slate-700">{T(`আবেদনের ${num(c.ageDays, lang)} দিন হয়েছে।`, `Applied ${c.ageDays} days ago.`)} {lv ? `${bn ? lawyerById(c.lawyerId)?.bn : lawyerById(c.lawyerId)?.en}: ${describeTracker(lv.summary)}` : T("এখনো আইনজীবী নিয়োগ হয়নি।", "No lawyer appointed yet.")}</p>
    </section>
  );
}
