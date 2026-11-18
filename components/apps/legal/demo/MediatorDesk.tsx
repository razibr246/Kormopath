"use client";
import { dlaoQueue, type DemoState } from "@/lib/legal/demoData";
import { num, TimePill, type Lang } from "./shared";

/** Cases waiting at mediation, timed against the mediation stage limit (design rule, demo only). */
export function MediatorDesk({ state, lang, onSettle }: { state: DemoState; lang: Lang; onSettle: (caseId: string) => void }) {
  const bn = lang === "bn";
  const T = (b: string, e: string) => (bn ? b : e);
  const rows = dlaoQueue(state, { stage: "mediation" });
  return (
    <section aria-labelledby="med-h" className="lg-card space-y-3" data-testid="mediator-desk">
      <p className="kp-eyebrow">{T("মধ্যস্থতাকারীর ডেস্ক · নমুনা", "Mediator desk · demo")}</p>
      <h2 id="med-h" className="text-[20px] font-extrabold text-slate-900">{T("মধ্যস্থতায় থাকা কেস", "Cases in mediation")}</h2>
      {rows.length === 0 && <p className="rounded-xl bg-slate-50 p-4 text-[14px] text-slate-600">{T("এখন মধ্যস্থতায় কোনো নমুনা কেস নেই। কর্মকর্তার ডেস্ক থেকে একটি কেস পাঠিয়ে দেখুন।", "No demo case is in mediation. Send one from the officer desk.")}</p>}
      <ul className="space-y-2">
        {rows.map((r) => (
          <li key={r.c.id} className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 p-3">
            <span className="min-w-0 flex-1 text-[15px] font-semibold text-slate-900">{bn ? r.c.nameBn : r.c.nameEn}<span className="block text-[13px] font-normal text-slate-600">{r.c.categoryBn} · {T(`মধ্যস্থতায় ${num(r.c.daysInStage, lang)} দিন`, `${r.c.daysInStage} days in mediation`)}</span></span>
            <TimePill level={r.time.level} label={bn ? r.time.bn.replace(/\d/g, (d) => "০১২৩৪৫৬৭৮৯"[Number(d)]) : r.time.en} />
            <button type="button" onClick={() => onSettle(r.c.id)} className="kp-btn-primary min-h-[44px] px-4 text-[14px]">{T("সমঝোতা হয়েছে (নমুনা)", "Agreement reached (demo)")}</button>
          </li>
        ))}
      </ul>
    </section>
  );
}
