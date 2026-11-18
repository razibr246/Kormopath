"use client";
import { useEffect, useMemo, useState } from "react";
import { CalendarDays, CalendarX2 } from "lucide-react";
import { fromDateKey, toDateKey, weekdayBnShort, bdDayOfMonth, isDateKey } from "@/lib/legal/mediation";
import { bnNum, dateKeyBn, upcomingSessionDays } from "@/lib/legal/mediationUi";

/*
 * Session date picker (ported from the Digital Legal Aid System's mediation calendar, razibr246 and AdribMahmud101).
 * Bangladesh working days only (Sunday–Thursday, worked out in Asia/Dhaka time). No public-holiday list is shipped
 * because none is verified here: the person marks holidays themselves.
 */
export function MediationPlanner({
  bn, sessionDate, setSessionDate, holidays, setHolidays,
}: {
  bn: boolean;
  sessionDate: string; setSessionDate: (d: string) => void;
  holidays: string[]; setHolidays: (h: string[]) => void;
}) {
  const T = (b: string, e: string) => (bn ? b : e);
  const [today, setToday] = useState<Date | null>(null);
  const [marking, setMarking] = useState(false);
  const [newHoliday, setNewHoliday] = useState("");
  useEffect(() => { setToday(new Date()); }, []);
  const days = useMemo(() => (today ? upcomingSessionDays(today, holidays, 15) : []), [today, holidays]);
  const minKey = today ? toDateKey(today) : undefined;

  const toggleHoliday = (key: string) => setHolidays(holidays.includes(key) ? holidays.filter((h) => h !== key) : [...holidays, key].sort());
  const addHoliday = () => {
    if (!isDateKey(newHoliday)) return;
    if (!holidays.includes(newHoliday)) setHolidays([...holidays, newHoliday].sort());
    if (sessionDate === newHoliday) setSessionDate("");
    setNewHoliday("");
  };

  return (
    <section aria-labelledby="med-date-h" className="lg-card space-y-4" data-testid="med-date">
      <div>
        <p className="kp-eyebrow">{T("তারিখ", "Date")}</p>
        <h2 id="med-date-h" className="mt-1 flex items-center gap-2 text-[clamp(21px,3vw,27px)] font-semibold leading-tight text-slate-900"><CalendarDays size={22} className="text-indigo-700" aria-hidden />{T("কোন দিন বসতে চান", "Which day suits you")}</h2>
        <p className="mt-2 max-w-[62ch] text-[15px] leading-relaxed text-slate-700">{T("শুধু রবি থেকে বৃহস্পতিবার দেখানো হচ্ছে। সরকারি ছুটির যাচাই করা তালিকা এখানে নেই — ছুটির দিন নিজে চিহ্নিত করুন। আসল তারিখ ঠিক করবে লিগ্যাল এইড অফিস।", "Only Sunday to Thursday are shown. There is no verified public-holiday list here — mark holidays yourself. The legal aid office sets the real date.")}</p>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:thin]" role="listbox" aria-label={T("কাজের দিন", "Working days")}>
        {days.map((key) => {
          const d = fromDateKey(key);
          const on = sessionDate === key;
          return (
            <button key={key} type="button" role="option" aria-selected={on} data-date={key}
              onClick={() => (marking ? toggleHoliday(key) : setSessionDate(on ? "" : key))}
              className={`flex min-h-[72px] w-[64px] shrink-0 flex-col items-center justify-center rounded-2xl border text-center leading-[1.4] transition-transform duration-200 hover:-translate-y-0.5 ${on ? "border-indigo-800 bg-indigo-800 text-white" : "border-slate-200 bg-white text-slate-800"}`}>
              <span className="text-[13px]">{weekdayBnShort(d)}</span>
              <span className="font-mono text-[20px] font-bold">{bnNum(bdDayOfMonth(d))}</span>
            </button>
          );
        })}
      </div>
      {sessionDate && <p className="text-[15px] font-semibold text-slate-900" data-testid="med-date-chosen">{T("বাছাই:", "Chosen:")} {dateKeyBn(sessionDate)}</p>}

      <div className="rounded-xl border border-slate-200 bg-white p-3">
        <div className="flex flex-wrap items-center gap-2">
          <CalendarX2 size={18} className="text-amber-700" aria-hidden />
          <span className="text-[14.5px] font-semibold text-slate-800">{T("ছুটির দিন", "Holidays")}</span>
          <label className="sr-only" htmlFor="med-holiday">{T("ছুটির তারিখ", "Holiday date")}</label>
          <input id="med-holiday" type="date" min={minKey} value={newHoliday} onChange={(e) => setNewHoliday(e.target.value)} className="rounded-xl border border-slate-300 px-3 py-2 text-[15px]" />
          <button type="button" onClick={addHoliday} disabled={!isDateKey(newHoliday)} className="kp-btn-ghost min-h-[44px] rounded-xl px-3 text-[14px] disabled:opacity-50">{T("ছুটি যোগ করুন", "Add holiday")}</button>
          <button type="button" onClick={() => setMarking(!marking)} className={`kp-chip ${marking ? "kp-chip-on" : ""}`} aria-pressed={marking}>{T("তালিকা থেকে চিহ্নিত করুন", "Mark from the list")}</button>
        </div>
        {holidays.length > 0 && (
          <ul className="mt-2 flex flex-wrap gap-2">
            {holidays.map((h) => (
              <li key={h}><button type="button" onClick={() => toggleHoliday(h)} className="kp-chip" title={T("সরান", "Remove")}>{dateKeyBn(h)} ✕</button></li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
