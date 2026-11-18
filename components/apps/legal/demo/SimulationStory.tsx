"use client";
import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Scale } from "lucide-react";
import { SIMULATION } from "@/lib/legal/demoData";
import { num, type Lang } from "./shared";

/** One fictional case from first call to a settlement draft, step by step. The scale settles on every step. */
export function SimulationStory({ step, onStep, lang }: { step: number; onStep: (n: number) => void; lang: Lang }) {
  const bn = lang === "bn";
  const T = (b: string, e: string) => (bn ? b : e);
  const s = SIMULATION[step] ?? SIMULATION[0];
  const [pulse, setPulse] = useState(0);
  useEffect(() => { setPulse((p) => p + 1); }, [step]);
  const last = step === SIMULATION.length - 1;
  return (
    <section aria-labelledby="sim-h" className="lg-card space-y-4" data-testid="simulation-story">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="kp-eyebrow">{T("একটি কেসের গল্প · কাল্পনিক", "One case, start to end · fictional")}</p>
          <h2 id="sim-h" className="mt-1 text-[clamp(21px,3vw,27px)] font-semibold leading-tight text-slate-900">{T("ফোন থেকে ", "From a call to ")}<em className="kp-em">{T("মীমাংসার খসড়া", "a settlement draft")}</em></h2>
        </div>
        <span key={pulse} className="lg-scale lg-scale-settle text-indigo-700" aria-hidden><Scale size={34} /></span>
      </div>
      <ol className="flex gap-1.5" aria-label={T("ধাপগুলো", "Steps")}>
        {SIMULATION.map((x, i) => (
          <li key={x.id} className="flex-1">
            <button type="button" onClick={() => onStep(i)} aria-current={i === step ? "step" : undefined} aria-label={`${num(i + 1, lang)}. ${bn ? x.titleBn : x.titleEn}`}
              className={`block h-2.5 w-full rounded-full transition-colors ${i < step ? "bg-emerald-600" : i === step ? "bg-indigo-700" : "bg-slate-200"}`} />
          </li>
        ))}
      </ol>
      <div key={s.id} className="kp-rise rounded-2xl border border-indigo-100 bg-indigo-50/40 p-4">
        <p className="text-[13.5px] font-semibold text-indigo-800">{T(`ধাপ ${num(step + 1, lang)} / ${num(SIMULATION.length, lang)}`, `Step ${step + 1} of ${SIMULATION.length}`)} · {bn ? s.captionBn : s.captionEn}</p>
        <h3 className="mt-1 text-[18px] font-bold text-slate-900">{bn ? s.titleBn : s.titleEn}</h3>
        <p className="mt-1 max-w-[62ch] text-[15px] leading-relaxed text-slate-700">{bn ? s.bodyBn : s.bodyEn}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => onStep(Math.max(0, step - 1))} disabled={step === 0} className="kp-btn-ghost min-h-[48px] px-4 text-[15px] disabled:opacity-50"><ChevronLeft size={18} aria-hidden /> {T("আগের ধাপ", "Back")}</button>
        <button type="button" onClick={() => onStep(last ? 0 : step + 1)} className="kp-btn-primary min-h-[48px] px-4 text-[15px]" data-testid="sim-next">{last ? T("আবার শুরু", "Start again") : T("পরের ধাপ", "Next step")} {!last && <ChevronRight size={18} aria-hidden />}</button>
      </div>
    </section>
  );
}
