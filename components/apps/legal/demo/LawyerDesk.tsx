"use client";
import { useEffect, useState } from "react";
import { CheckCircle2, Circle, AlertTriangle, Clock, Scale } from "lucide-react";
import { DEMO_LAWYERS, lawyerDesk, type DemoState } from "@/lib/legal/demoData";
import type { ActionState } from "@/lib/legal/lawyerTracker";
import { num, Pill, type Lang } from "./shared";

const STATE: Record<ActionState, { bn: string; en: string; tone: string; Icon: typeof Circle }> = {
  done: { bn: "সম্পন্ন", en: "Done", tone: "border-emerald-300 bg-emerald-50 text-emerald-900", Icon: CheckCircle2 },
  overdue: { bn: "সময় পেরিয়েছে", en: "Overdue", tone: "border-red-300 bg-red-50 text-red-900", Icon: AlertTriangle },
  due_soon: { bn: "শিগগির শেষ", en: "Due soon", tone: "border-amber-300 bg-amber-50 text-amber-900", Icon: Clock },
  pending: { bn: "বাকি", en: "Pending", tone: "border-slate-300 bg-slate-50 text-slate-700", Icon: Circle },
  na: { bn: "প্রযোজ্য নয়", en: "N/A", tone: "border-slate-200 bg-white text-slate-500", Icon: Circle },
};

/** The panel lawyer's obligations, graded against the source app's action plan (design rules, demo only). */
export function LawyerDesk({ state, lang, now, onDone }: { state: DemoState; lang: Lang; now: Date; onDone: (caseId: string, code: string) => void }) {
  const bn = lang === "bn";
  const T = (b: string, e: string) => (bn ? b : e);
  const [lawyerId, setLawyerId] = useState(DEMO_LAWYERS[0].id);
  const [settle, setSettle] = useState(false);
  const views = lawyerDesk(state, lawyerId, now);
  useEffect(() => { setSettle(false); const t = window.setTimeout(() => setSettle(true), 30); return () => window.clearTimeout(t); }, [state.done]);

  return (
    <section aria-labelledby="lawyer-h" className="lg-card space-y-4" data-testid="lawyer-desk">
      <div>
        <p className="kp-eyebrow">{T("আইনজীবীর ডেস্ক · নমুনা", "Lawyer desk · demo")}</p>
        <h2 id="lawyer-h" className="mt-1 text-[20px] font-extrabold text-slate-900">{T("নিয়োগ পাওয়া কেস ও করণীয়", "Assigned cases and duties")}</h2>
        <p className="mt-1 max-w-[62ch] text-[14px] leading-relaxed text-slate-600">{T("নিয়োগের পর প্রতিটি কাজের একটি সময়সীমা আছে, যাতে আবেদনকারী বুঝতে পারেন কাজ চলছে কি না। কাজ শেষ হলে চিহ্ন দিন।", "Each duty has a deadline after appointment, so the applicant can see whether work is moving. Mark a duty when it is done.")}</p>
      </div>
      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={T("আইনজীবী বেছে নিন", "Pick a lawyer")}>
        {DEMO_LAWYERS.map((l) => (
          <button key={l.id} type="button" role="radio" aria-checked={l.id === lawyerId} onClick={() => setLawyerId(l.id)} className={`kp-chip !min-h-[44px] !leading-[1.4] ${l.id === lawyerId ? "kp-chip-on" : ""}`}>{bn ? l.bn : l.en}</button>
        ))}
      </div>
      {views.length === 0 && <p className="rounded-xl bg-slate-50 p-4 text-[14px] text-slate-600">{T("এই আইনজীবীর কোনো নমুনা কেস নেই।", "No demo case for this lawyer.")}</p>}
      {views.map((v) => (
        <article key={v.c.id} className="rounded-2xl border border-slate-200 p-4" data-case={v.c.id}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-[17px] font-bold text-slate-900">{bn ? v.c.nameBn : v.c.nameEn} <span className="font-mono text-[13px] font-normal text-slate-500">{v.c.id}</span></h3>
            <span className="text-[14px] text-slate-600">{T(`নিয়োগের ${num(v.summary.daysSinceAppointment, lang)} দিন`, `${v.summary.daysSinceAppointment} days since appointment`)}</span>
          </div>
          <div className="mt-3 flex items-center gap-3">
            <span className={`lg-scale text-indigo-700 ${settle ? "lg-scale-settle" : ""}`} aria-hidden><Scale size={22} /></span>
            <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-valuenow={v.summary.progressPercent} aria-valuemin={0} aria-valuemax={100} aria-label={T("লগ করা কাজ", "Logged duties")}>
              <div className="h-full rounded-full bg-emerald-600 transition-[width] duration-700 motion-reduce:transition-none" style={{ width: `${v.summary.progressPercent}%` }} />
            </div>
            <span className="font-mono text-[14px] text-slate-700">{num(v.summary.done, lang)}/{num(v.summary.total, lang)}</span>
          </div>
          <ul className="mt-3 space-y-1.5">
            {v.actions.filter((a) => a.state !== "na").map((a) => {
              const st = STATE[a.state];
              return (
                <li key={a.code} className="flex flex-wrap items-center gap-2 rounded-xl bg-slate-50 px-3 py-2">
                  <st.Icon size={17} className="shrink-0 text-slate-600" aria-hidden />
                  <span className="min-w-0 flex-1 text-[14.5px] text-slate-800">{a.labelBn}</span>
                  <Pill tone={st.tone}>{bn ? st.bn : st.en}{a.state === "overdue" ? ` · ${num(-a.daysRemaining, lang)} ${T("দিন", "d")}` : a.state === "due_soon" || a.state === "pending" ? ` · ${num(a.daysRemaining, lang)} ${T("দিন বাকি", "d left")}` : ""}</Pill>
                  {a.state !== "done" && <button type="button" onClick={() => onDone(v.c.id, a.code)} data-done={a.code} className="kp-btn-ghost min-h-[44px] px-3 text-[13.5px]">{T("সম্পন্ন চিহ্ন দিন", "Mark done")}</button>}
                </li>
              );
            })}
          </ul>
        </article>
      ))}
    </section>
  );
}
