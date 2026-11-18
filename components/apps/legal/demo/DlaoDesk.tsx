"use client";
import { useMemo, useState } from "react";
import { ChevronRight, FileClock, Search, ShieldAlert, X } from "lucide-react";
import { CITIZEN_STATUS_LABELS, type CaseStatus } from "@/lib/legal/caseDomain";
import { dlaoQueue, lawyerById, type DemoState, type QueueFilter, type QueueRow } from "@/lib/legal/demoData";
import type { SeverityLevel } from "@/lib/legal/severity";
import { num, SeverityPill, TimePill, type Lang } from "./shared";

const SEV_FILTER: { id: SeverityLevel | "all"; bn: string; en: string }[] = [
  { id: "all", bn: "সব", en: "All" }, { id: "emergency", bn: "জরুরি", en: "Emergency" }, { id: "high", bn: "উচ্চ", en: "High" },
  { id: "priority", bn: "অগ্রাধিকার", en: "Priority" }, { id: "standard", bn: "সাধারণ", en: "Standard" },
];
/** What the officer may do next from each stage (demo moves; every one is written to the audit trail). */
const NEXT: Partial<Record<CaseStatus, CaseStatus[]>> = {
  submitted: ["review", "unresolved"],
  review: ["mediation", "lawyer", "unresolved"],
  mediation: ["settled", "lawyer", "unresolved"],
  lawyer: ["court", "settled", "unresolved"],
  court: ["settled", "unresolved"],
};

export function DlaoDesk({ state, lang, onMove, onOpen }: {
  state: DemoState; lang: Lang;
  onMove: (caseId: string, to: CaseStatus, reason?: string) => void;
  onOpen: (caseId: string) => void;
}) {
  const bn = lang === "bn";
  const T = (b: string, e: string) => (bn ? b : e);
  const [filter, setFilter] = useState<QueueFilter>({ severity: "all", stage: "open", search: "" });
  const [openId, setOpenId] = useState<string | null>(null);
  const rows = useMemo(() => dlaoQueue(state, filter), [state, filter]);
  const open = openId ? dlaoQueue(state).find((r) => r.c.id === openId) ?? null : null;

  const openRow = (r: QueueRow) => { setOpenId(r.c.id); onOpen(r.c.id); };

  return (
    <section aria-labelledby="dlao-h" className="lg-card space-y-4" data-testid="dlao-queue">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="kp-eyebrow">{T("কর্মকর্তার ডেস্ক · নমুনা", "Officer desk · demo")}</p>
          <h2 id="dlao-h" className="mt-1 text-[20px] font-extrabold text-slate-900">{T("আবেদনের সারি", "Application queue")}</h2>
          <p className="mt-1 max-w-[62ch] text-[14px] leading-relaxed text-slate-600">{T("জরুরি কেস সবার ওপরে, তারপর যেগুলোর সময় পেরিয়েছে। কেস খুললে তার সময়রেখা আর লগ দেখবেন।", "Emergencies first, then the most overdue. Open a case to see its timeline and log.")}</p>
        </div>
        <span className="font-mono text-[14px] text-slate-600">{num(rows.length, lang)} {T("টি কেস", "cases")}</span>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {SEV_FILTER.map((f) => (
          <button key={f.id} type="button" onClick={() => setFilter((p) => ({ ...p, severity: f.id }))} aria-pressed={filter.severity === f.id}
            className={`kp-chip !min-h-[44px] !leading-[1.4] ${filter.severity === f.id ? "kp-chip-on" : ""}`}>{bn ? f.bn : f.en}</button>
        ))}
        <label className="sr-only" htmlFor="dlao-stage">{T("ধাপ", "Stage")}</label>
        <select id="dlao-stage" value={filter.stage} onChange={(e) => setFilter((p) => ({ ...p, stage: e.target.value as QueueFilter["stage"] }))}
          className="min-h-[44px] rounded-xl border border-slate-300 bg-white px-3 text-[14px]">
          <option value="open">{T("খোলা কেস", "Open cases")}</option>
          <option value="all">{T("সব কেস", "All cases")}</option>
          {(Object.keys(CITIZEN_STATUS_LABELS) as CaseStatus[]).map((s) => <option key={s} value={s}>{bn ? CITIZEN_STATUS_LABELS[s].bn : CITIZEN_STATUS_LABELS[s].en}</option>)}
        </select>
        <label className="relative min-w-0 flex-1 basis-48">
          <span className="sr-only">{T("খুঁজুন", "Search")}</span>
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" aria-hidden />
          <input value={filter.search} onChange={(e) => setFilter((p) => ({ ...p, search: e.target.value }))} placeholder={T("নাম, জেলা বা কেস নম্বর", "Name, district or case id")}
            className="min-h-[44px] w-full rounded-xl border border-slate-300 py-2.5 pl-9 pr-3 text-[15px]" />
        </label>
      </div>

      <ul className="space-y-2">
        {rows.length === 0 && <li className="rounded-xl bg-slate-50 p-4 text-[14px] text-slate-600">{T("এই ফিল্টারে কোনো কেস নেই।", "No case matches this filter.")}</li>}
        {rows.map((r, i) => (
          <li key={r.c.id} className="kp-rise" style={{ animationDelay: `${i * 50}ms` }}>
            <button type="button" onClick={() => openRow(r)} data-case={r.c.id}
              className={`flex w-full flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border p-3 text-left transition-[border-color,box-shadow] hover:border-indigo-300 hover:shadow-sm ${openId === r.c.id ? "border-indigo-500 bg-indigo-50/40" : "border-slate-200 bg-white"}`}>
              <span className="font-mono text-[13px] text-slate-500">{r.c.id}</span>
              <span className="min-w-0 flex-1 text-[15px] font-semibold text-slate-900">{bn ? r.c.nameBn : r.c.nameEn}<span className="block text-[13px] font-normal text-slate-600">{r.c.categoryBn} · {r.c.district} · {bn ? r.stageBn : r.stageEn}</span></span>
              <SeverityPill level={r.severity.level} label={bn ? r.severity.bn : r.severity.en} />
              <TimePill level={r.time.level} label={bn ? bnDays(r.time.bn) : r.time.en} />
              <ChevronRight size={18} className="text-slate-400" aria-hidden />
            </button>
          </li>
        ))}
      </ul>

      {open && (
        <article aria-labelledby="case-h" className="rounded-2xl border-2 border-indigo-200 bg-indigo-50/30 p-4 sm:p-5" data-testid="dlao-case">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="font-mono text-[13px] text-slate-500">{open.c.id} · {T("নমুনা কেস", "demo case")}</p>
              <h3 id="case-h" className="text-[18px] font-bold text-slate-900">{bn ? open.c.nameBn : open.c.nameEn}</h3>
            </div>
            <button type="button" onClick={() => setOpenId(null)} className="kp-icon-btn !h-11 !w-11" aria-label={T("বন্ধ করুন", "Close")}><X size={18} aria-hidden /></button>
          </div>
          {open.severity.level === "emergency" && (
            <p className="mt-2 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-[14px] text-red-900"><ShieldAlert size={18} className="mt-0.5 shrink-0" aria-hidden />{T("সংবেদনশীল কেস: খোলার ঘটনা লগে লেখা হয়েছে। যোগাযোগ শুধু নিরাপদ সময়ে ও নিরাপদ নম্বরে।", "Sensitive case: opening it was logged. Contact only in the safe window and on the safe number.")}</p>
          )}
          <p className="mt-3 text-[15px] leading-relaxed text-slate-700">{bn ? open.c.situationBn : open.c.situationEn}</p>
          <blockquote className="mt-2 rounded-xl border-l-4 border-indigo-300 bg-white px-3 py-2 text-[15px] text-slate-800">“{open.c.problem}”</blockquote>
          <div className="mt-3 flex flex-wrap gap-2">
            <SeverityPill level={open.severity.level} label={`${bn ? open.severity.bn : open.severity.en} · ${open.severity.categoryBn}`} />
            <TimePill level={open.time.level} label={bn ? bnDays(open.time.bn) : open.time.en} />
            {open.c.lawyerId && <span className="kp-chip !min-h-[26px] !text-[12.5px]">{bn ? lawyerById(open.c.lawyerId)?.bn : lawyerById(open.c.lawyerId)?.en}</span>}
          </div>

          {NEXT[open.stage] && (
            <div className="mt-4">
              <p className="text-[13.5px] font-semibold text-slate-700">{T("পরের ধাপে পাঠান (নমুনা):", "Move to (demo):")}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {NEXT[open.stage]!.map((to) => (
                  <button key={to} type="button" data-move={to}
                    onClick={() => {
                      const terminal = to === "settled" || to === "unresolved";
                      const reason = terminal ? window.prompt(T("কারণ লিখুন (লগে থাকবে)", "Reason (kept in the log)")) ?? "" : undefined;
                      if (terminal && !reason?.trim()) return;
                      onMove(open.c.id, to, reason?.trim());
                    }}
                    className={to === "unresolved" ? "kp-btn-ghost min-h-[44px] px-4 text-[14px]" : "kp-btn-primary min-h-[44px] px-4 text-[14px]"}>
                    {bn ? CITIZEN_STATUS_LABELS[to].bn : CITIZEN_STATUS_LABELS[to].en}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="mt-4">
            <p className="flex items-center gap-1.5 text-[13.5px] font-semibold text-slate-700"><FileClock size={16} aria-hidden /> {T("সময়রেখা ও লগ", "Timeline and log")}</p>
            <ol className="mt-2 space-y-1.5 border-l-2 border-slate-200 pl-4 text-[14px]">
              <li className="text-slate-600">{T(`${num(open.c.ageDays, lang)} দিন আগে আবেদন জমা`, `Filed ${open.c.ageDays} days ago`)}</li>
              {state.audit.filter((a) => a.refId === open.c.id).map((a) => (
                <li key={a.id} className="text-slate-800">
                  <span className="font-mono text-[12.5px] text-slate-500">{a.at.slice(0, 16).replace("T", " ")}</span> · {AUDIT_LABEL[a.kind] ?? a.kind}{a.detail ? ` · ${a.detail}` : ""}{a.reason ? ` · ${T("কারণ", "reason")}: ${a.reason}` : ""}
                </li>
              ))}
            </ol>
          </div>
        </article>
      )}
    </section>
  );
}

const bnDays = (s: string) => s.replace(/\d/g, (d) => "০১২৩৪৫৬৭৮৯"[Number(d)]);
const AUDIT_LABEL: Record<string, string> = {
  sensitive_case_opened: "সংবেদনশীল কেস খোলা হয়েছে",
  application_accepted: "ধাপ বদল",
  application_rejected: "বন্ধ: সমাধা হয়নি",
  settlement_certified: "বন্ধ: সমাধা হয়েছে",
  lawyer_changed: "আইনজীবীর কাছে",
  message_sent: "আইনজীবীর কাজ লগ হয়েছে",
};
