"use client";
import { useMemo, useState } from "react";
import { AlertTriangle, CalendarPlus, CheckCircle2, Circle, Plus, Trash2, WifiOff, Zap } from "lucide-react";
import { usePersistentState, storageKey, downloadText } from "@/lib/clientStore";
import { buildStudyPlan, sanitizeStudyInput, validateStudyInput, REVISION_OFFSETS, type StudyPlanInput } from "@/lib/admitbuddy";
import { allDayIcs } from "@/lib/ics";

type Saved = Omit<StudyPlanInput, "start">;
const EMPTY: Saved = { examDate: "", hoursPerDay: 3, chapters: [], blockedDates: [] };
const sanitizeDone = (r: unknown): string[] | null => (Array.isArray(r) ? r.filter((x): x is string => typeof x === "string").slice(0, 5000) : null);
const uid = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
const fieldCls = "w-full min-h-[44px] rounded-lg border border-slate-300 bg-white px-3 text-[15px] focus:outline-none focus:ring-2 focus:ring-indigo-500";
const hm = (min: number) => (min >= 60 ? `${Math.floor(min / 60)} ঘ. ${min % 60 ? `${min % 60} মি.` : ""}` : `${min} মি.`).trim();
const ROUND_BN = ["", "১ম রিভিশন (+১ দিন)", "২য় রিভিশন (+৩ দিন)", "৩য় রিভিশন (+৭ দিন)", "৪র্থ রিভিশন (+১৪ দিন)"];

const PRINT_CSS = `@media print {
  body * { visibility: hidden !important; }
  #study-plan, #study-plan * { visibility: visible !important; }
  #study-plan { position: absolute; inset: 0 auto auto 0; width: 100%; }
  .no-print { display: none !important; }
}`;

export function StudyPlanner({ today }: { today: string }) {
  const [saved, setSaved] = usePersistentState<Saved>(storageKey("admitbuddy", "studyPlan"), EMPTY, sanitizeStudyInput);
  const [done, setDone] = usePersistentState<string[]>(storageKey("admitbuddy", "studyDone"), [], sanitizeDone);
  const [subject, setSubject] = useState("");
  const [title, setTitle] = useState("");
  const [hours, setHours] = useState("2");
  const [blockDate, setBlockDate] = useState("");
  const [err, setErr] = useState<string | null>(null);

  const input: StudyPlanInput = { ...saved, start: today };
  const invalid = validateStudyInput(input);
  const plan = useMemo(() => (invalid ? null : buildStudyPlan(input)), [invalid, saved, today]); // eslint-disable-line react-hooks/exhaustive-deps
  const update = (patch: Partial<Saved>) => setSaved((s) => ({ ...s, ...patch }));
  const toggle = (id: string) => setDone((d) => (d.includes(id) ? d.filter((x) => x !== id) : [...d, id]));
  const allSessions = plan?.days.flatMap((d) => d.sessions) ?? [];
  const doneCount = allSessions.filter((s) => done.includes(s.id)).length;

  const addChapter = () => {
    const h = Number(hours);
    if (!subject.trim() || !title.trim()) return setErr("বিষয় ও অধ্যায়ের নাম দিন।");
    if (!Number.isFinite(h) || h <= 0 || h > 100) return setErr("অধ্যায়ে কত ঘণ্টা লাগবে, ০-এর বেশি দিন।");
    update({ chapters: [...saved.chapters, { id: uid(), subject: subject.trim().slice(0, 40), title: title.trim().slice(0, 80), hours: h }] });
    setTitle(""); setErr(null);
  };

  const exportIcs = () => {
    if (!plan) return;
    const events = plan.days.filter((d) => d.sessions.length).map((d) => ({
      uid: `study-${d.date}`, date: d.date,
      title: `পড়া: ${d.sessions.map((s) => `${s.subject} ${s.title}${s.kind === "revise" ? " (রিভিশন)" : ""}`).join(", ")}`.slice(0, 200),
      description: [...d.sessions.map((s) => `${s.subject} — ${s.title}: ${s.kind === "learn" ? "প্রথম পড়া" : ROUND_BN[s.round]} · ${hm(s.minutes)}`), `নিজেকে যাচাই: ${d.selfCheckBn}`].join("\n"),
    }));
    downloadText(`admitbuddy-study-plan-${saved.examDate}.ics`, allDayIcs(events, "AdmitBuddy"), "text/calendar;charset=utf-8");
  };

  return (
    <section aria-labelledby="study-h" className="space-y-4">
      <style>{PRINT_CSS}</style>
      <div className="no-print space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
        <div>
          <h2 id="study-h" className="text-[17px] font-bold">পড়ার পরিকল্পনা</h2>
          <p className="mt-1 text-[13.5px] text-slate-600">পরীক্ষার তারিখ, অধ্যায় আর দিনে কত ঘণ্টা পড়তে পারবেন দিন। প্রথমে প্রতিটি অধ্যায় একবার পড়া, তারপর পড়া শেষের {REVISION_OFFSETS.map((d) => `+${d}`).join(", ")} দিন পরে ছোট রিভিশন — পরীক্ষার দিন বা তার পরে কিছু রাখা হয় না। ঘণ্টার হিসাব আপনার নিজের অনুমান।</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="text-[13px] font-semibold text-slate-700">পরীক্ষার তারিখ<input type="date" className={fieldCls} value={saved.examDate} min={today} onChange={(e) => update({ examDate: e.target.value })} /></label>
          <label className="text-[13px] font-semibold text-slate-700">দিনে কত ঘণ্টা<input className={`${fieldCls} font-mono min-h-[44px]`} inputMode="decimal" value={saved.hoursPerDay} onChange={(e) => { const n = Number(e.target.value); if (Number.isFinite(n) && n > 0 && n <= 16) update({ hoursPerDay: n }); }} /></label>
          <label className="text-[13px] font-semibold text-slate-700">যেদিন পড়া হবে না (বিদ্যুৎ/নেট নেই)
            <div className="flex gap-2"><input type="date" className={fieldCls} value={blockDate} onChange={(e) => setBlockDate(e.target.value)} />
              <button type="button" className="shrink-0 rounded-lg border border-slate-300 px-3 text-[13px] font-bold min-h-[44px] min-w-[44px]" onClick={() => { if (blockDate && !saved.blockedDates?.includes(blockDate)) update({ blockedDates: [...(saved.blockedDates ?? []), blockDate].sort() }); setBlockDate(""); }}>বাদ দিন</button></div>
          </label>
        </div>
        {(saved.blockedDates?.length ?? 0) > 0 && (
          <div className="flex flex-wrap gap-2 text-[12.5px]">{saved.blockedDates!.map((d) => (
            <button key={d} type="button" onClick={() => update({ blockedDates: saved.blockedDates!.filter((x) => x !== d) })} className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 font-semibold text-amber-900 ring-1 ring-amber-200 min-h-[44px] min-w-[44px]" aria-label={`${d} আবার যোগ করুন`}><Zap size={12} aria-hidden /> {d} ✕</button>
          ))}</div>
        )}
        <div className="grid gap-2 sm:grid-cols-[1fr_2fr_7rem_auto]">
          <input className={fieldCls} value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="বিষয়, যেমন: পদার্থবিজ্ঞান" aria-label="বিষয়" list="study-subjects" />
          <datalist id="study-subjects">{[...new Set(saved.chapters.map((c) => c.subject))].map((s) => <option key={s} value={s} />)}</datalist>
          <input className={fieldCls} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="অধ্যায়, যেমন: ভেক্টর" aria-label="অধ্যায়" onKeyDown={(e) => { if (e.key === "Enter") addChapter(); }} />
          <input className={`${fieldCls} font-mono min-h-[44px]`} inputMode="decimal" value={hours} onChange={(e) => setHours(e.target.value)} aria-label="ঘণ্টা" title="এই অধ্যায় প্রথমবার পড়তে কত ঘণ্টা লাগবে" />
          <button type="button" onClick={addChapter} className="inline-flex min-h-[44px] items-center justify-center gap-1 rounded-lg bg-indigo-600 px-4 text-[14px] font-bold text-white min-w-[44px]"><Plus size={15} /> যোগ</button>
        </div>
        {err && <p role="alert" className="text-[13px] text-rose-700">{err}</p>}
        {saved.chapters.length > 0 && (
          <ul className="flex flex-wrap gap-2">{saved.chapters.map((c) => (
            <li key={c.id} className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-[13px]">{c.subject}: {c.title} · {c.hours} ঘ.
              <button type="button" aria-label={`${c.title} মুছুন`} onClick={() => update({ chapters: saved.chapters.filter((x) => x.id !== c.id) })} className="text-slate-500 hover:text-rose-700 min-h-[44px] min-w-[44px]"><Trash2 size={13} /></button></li>
          ))}</ul>
        )}
        <p className="flex items-start gap-2 rounded-xl bg-sky-50 p-3 text-[13px] text-sky-900"><WifiOff size={16} className="mt-0.5 shrink-0" aria-hidden /> বিদ্যুৎ চলে গেলে বা ইন্টারনেট না থাকলেও পরিকল্পনা চলে: সব হিসাব এই ফোনেই হয়, একবার খোলা থাকলে অফলাইনেও খোলে। আগে থেকে প্রিন্ট করে বা ক্যালেন্ডারে (.ics) রেখে দিন। কোনো দিন পড়া না হলে সেই দিনটা “বাদ দিন” — বাকি পরিকল্পনা নিজে থেকে সরে যাবে।</p>
      </div>

      {invalid && saved.chapters.length > 0 && saved.examDate && <p role="alert" className="rounded-xl bg-rose-50 p-3 text-[13.5px] text-rose-800">{invalid}</p>}
      {!plan && (!saved.examDate || !saved.chapters.length) && <p className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center text-[14px] text-slate-600">পরীক্ষার তারিখ আর অন্তত একটি অধ্যায় দিলে দিনভিত্তিক পরিকল্পনা এখানে দেখাবে।</p>}

      {plan && (
        <div id="study-plan" className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-[16px] font-bold">পরীক্ষা {saved.examDate} · {plan.studyDays} দিন পড়া</h3>
              <p className="text-[13px] text-slate-600">লাগবে {hm(plan.neededMinutes)} · হাতে আছে {hm(plan.availableMinutes)} · শেষ {doneCount}/{allSessions.length}</p>
            </div>
            <div className="no-print flex gap-2">
              <button type="button" onClick={exportIcs} className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg bg-indigo-600 px-3 text-[13px] font-bold text-white min-h-[44px] min-w-[44px]"><CalendarPlus size={15} /> ক্যালেন্ডার (.ics)</button>
              <button type="button" onClick={() => window.print()} className="inline-flex min-h-[40px] items-center rounded-lg border border-slate-300 px-3 text-[13px] font-bold min-h-[44px] min-w-[44px]">প্রিন্ট</button>
            </div>
          </div>
          {plan.overload && <p role="alert" className="flex items-start gap-2 rounded-xl bg-rose-50 p-3 text-[13.5px] font-semibold text-rose-800"><AlertTriangle size={16} className="mt-0.5 shrink-0" aria-hidden /> সময়ে কুলাচ্ছে না।</p>}
          {plan.messagesBn.length > 0 && <ul className="space-y-1 text-[13px] text-slate-700">{plan.messagesBn.map((m) => <li key={m}>• {m}</li>)}</ul>}
          {plan.unscheduled.length > 0 && <p className="text-[13px] text-rose-800">বাকি থেকে যাবে: {saved.chapters.filter((c) => plan.unscheduled.includes(c.id)).map((c) => `${c.subject} ${c.title}`).join(", ")}</p>}
          <ol className="space-y-2">
            {plan.days.map((d) => (
              <li key={d.date} className={`rounded-xl border p-3 ${d.date === today ? "border-indigo-300 bg-indigo-50/50" : "border-slate-200"} ${d.blocked ? "opacity-60" : ""}`}>
                <p className="flex flex-wrap items-baseline justify-between gap-2 text-[14px] font-bold"><span>{d.date}{d.date === today ? " · আজ" : ""}</span><span className="font-mono text-[12.5px] font-normal text-slate-500">{d.blocked ? "বাদ (বিদ্যুৎ/নেট নেই)" : hm(d.minutes)}</span></p>
                {!d.blocked && d.sessions.length === 0 && <p className="text-[13px] text-slate-500">ফাঁকা দিন — বিশ্রাম বা পুরোনো পড়া দেখুন।</p>}
                <ul className="mt-1 space-y-1">{d.sessions.map((s) => {
                  const on = done.includes(s.id);
                  return (
                    <li key={s.id}>
                      <button type="button" aria-pressed={on} onClick={() => toggle(s.id)} className="flex w-full items-start gap-2 rounded-lg px-1 py-1 text-left text-[14px] hover:bg-slate-50 min-h-[44px]">
                        {on ? <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-emerald-600" aria-hidden /> : <Circle size={18} className="mt-0.5 shrink-0 text-slate-500" aria-hidden />}
                        <span className={on ? "text-slate-500 line-through" : ""}><strong>{s.subject}</strong> — {s.title} · <span className={s.kind === "revise" ? "text-indigo-700" : ""}>{s.kind === "learn" ? "প্রথম পড়া" : ROUND_BN[s.round]}</span> · {hm(s.minutes)}</span>
                      </button>
                    </li>
                  );
                })}</ul>
                {d.sessions.length > 0 && <p className="mt-1 rounded-lg bg-amber-50 px-2 py-1 text-[12.5px] text-amber-900">✍ নিজেকে যাচাই: {d.selfCheckBn}</p>}
              </li>
            ))}
          </ol>
          <p className="text-[12px] text-slate-500">রিভিশনের নিয়ম: অধ্যায় প্রথমবার পড়া শেষের ১, ৩, ৭ ও ১৪ দিন পরে অল্প সময় বই না দেখে মনে করার চেষ্টা (spaced retrieval)। জায়গা না হলে পরের ফাঁকা দিনে সরে যায়।</p>
        </div>
      )}
    </section>
  );
}
