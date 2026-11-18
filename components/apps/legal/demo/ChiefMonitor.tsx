"use client";
import { chiefStats, type DemoState } from "@/lib/legal/demoData";
import { num, type Lang } from "./shared";

const SEV_BAR: Record<string, string> = { emergency: "bg-red-600", high: "bg-orange-600", priority: "bg-amber-500", standard: "bg-slate-400" };

/** Counts and lawyer response for the whole (demo) office, drawn with plain CSS bars. */
export function ChiefMonitor({ state, lang, now }: { state: DemoState; lang: Lang; now: Date }) {
  const bn = lang === "bn";
  const T = (b: string, e: string) => (bn ? b : e);
  const s = chiefStats(state, now);
  const maxStage = Math.max(1, ...s.byStage.map((x) => x.count));
  const tiles = [
    { bn: "মোট কেস", en: "All cases", v: s.total },
    { bn: "খোলা", en: "Open", v: s.open },
    { bn: "বন্ধ", en: "Closed", v: s.closed },
    { bn: "সময় পেরিয়েছে", en: "Over time", v: s.overTime, warn: s.overTime > 0 },
  ];
  return (
    <section aria-labelledby="chief-h" className="lg-card space-y-5" data-testid="chief-monitor">
      <div>
        <p className="kp-eyebrow">{T("তত্ত্বাবধান · নমুনা", "Supervision · demo")}</p>
        <h2 id="chief-h" className="mt-1 text-[20px] font-extrabold text-slate-900">{T("অফিসের সার্বিক অবস্থা", "The office at a glance")}</h2>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {tiles.map((t, i) => (
          <div key={t.en} className={`kp-rise rounded-2xl border p-4 ${t.warn ? "border-red-200 bg-red-50" : "border-slate-200 bg-slate-50"}`} style={{ animationDelay: `${i * 60}ms` }}>
            <p className="text-[13px] font-semibold text-slate-600">{bn ? t.bn : t.en}</p>
            <p className={`mt-1 font-mono text-[32px] font-bold leading-none ${t.warn ? "text-red-800" : "text-slate-900"}`}>{num(t.v, lang)}</p>
          </div>
        ))}
      </div>
      <div className="grid gap-5 md:grid-cols-2">
        <div>
          <h3 className="text-[17px] font-bold text-slate-900">{T("ধাপ অনুযায়ী", "By stage")}</h3>
          <ul className="mt-2 space-y-1.5">
            {s.byStage.map((x) => (
              <li key={x.stage} className="grid grid-cols-[minmax(0,9rem)_1fr_auto] items-center gap-2 text-[14px]">
                <span className="truncate text-slate-700">{bn ? x.bn : x.en}</span>
                <span className="h-3 overflow-hidden rounded-full bg-slate-100"><span className="block h-full rounded-full bg-indigo-600 transition-[width] duration-700 motion-reduce:transition-none" style={{ width: `${(x.count / maxStage) * 100}%` }} /></span>
                <span className="font-mono text-slate-800">{num(x.count, lang)}</span>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex h-3 overflow-hidden rounded-full bg-slate-100" aria-label={T("গুরুত্ব অনুযায়ী ভাগ", "Split by severity")} role="img">
            {s.bySeverity.filter((x) => x.count).map((x) => <span key={x.level} className={SEV_BAR[x.level]} style={{ width: `${(x.count / Math.max(1, s.total)) * 100}%` }} title={`${x.bn}: ${x.count}`} />)}
          </div>
          <p className="mt-1.5 flex flex-wrap gap-x-3 text-[13px] text-slate-600">{s.bySeverity.map((x) => <span key={x.level}><span className={`mr-1 inline-block h-2.5 w-2.5 rounded-full ${SEV_BAR[x.level]}`} aria-hidden />{bn ? x.bn : x.en} {num(x.count, lang)}</span>)}</p>
        </div>
        <div>
          <h3 className="text-[17px] font-bold text-slate-900">{T("আইনজীবীদের সাড়া", "Lawyer response")}</h3>
          <p className="text-[13px] text-slate-600">{T("লগ করা কাজের শতাংশ — আইনজীবীর নম্বর নয়।", "Share of duties logged — not a rating of the lawyer.")}</p>
          <ul className="mt-2 space-y-2">
            {s.lawyers.map((l) => (
              <li key={l.lawyer.id}>
                <div className="flex justify-between text-[14px]"><span className="text-slate-800">{bn ? l.lawyer.bn : l.lawyer.en}</span><span className="font-mono text-slate-700">{num(l.progressPercent, lang)}%{l.overdue ? ` · ${num(l.overdue, lang)} ${T("দেরি", "late")}` : ""}</span></div>
                <div className="mt-1 h-3 overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full transition-[width] duration-700 motion-reduce:transition-none ${l.overdue ? "bg-amber-500" : "bg-emerald-600"}`} style={{ width: `${l.progressPercent}%` }} /></div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
