"use client";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { ClipboardCheck, CalendarDays, Check, Flame, MessageCircleQuestion, Plus, Trash2, Pencil, X } from "lucide-react";
import {
  computeAdherence, calendarStrip, toggleDose, removeMedicineLog, todayInDhaka, addDays, doseKey, pdcPercent,
  validateMedicine, sanitizeSchedule, sanitizeLog, adherenceToIcs, MAX_TIMES_PER_DAY, MAX_MEDICINES, DEFAULT_WINDOW_DAYS,
  type AdherenceMedicine, type DayCell,
} from "@/lib/adherence";
import { buildSchedule, courseDays, type ParsedLine } from "@/lib/prescription";
import { usePersistentState, storageKey, downloadText } from "@/lib/clientStore";
import { bnDigits } from "@/lib/contract";

type Lang = "bn" | "en";

interface Draft {
  name: string;
  amountNote: string;
  times: string[];
  startDate: string;
  endDate: string; // "" = no end date written
}

const emptyDraft = (today: string): Draft => ({ name: "", amountNote: "", times: [""], startDate: today, endDate: "" });

const SLOT_TIMES = { morning: "08:00", noon: "14:00", night: "21:00" } as const;

const STATUS_STYLE: Record<DayCell["status"], string> = {
  covered: "bg-emerald-500 text-white border-emerald-600",
  partial: "bg-amber-200 text-amber-950 border-amber-400",
  missed: "bg-white text-red-700 border-red-300",
  "not-scheduled": "bg-slate-100 text-slate-400 border-slate-200",
  today: "bg-sky-50 text-sky-900 border-sky-500 border-2",
  future: "bg-slate-50 text-slate-300 border-slate-100",
};

/**
 * "Taking my medicines": the user's own confirmed schedule, one tap per dose, a 30-day strip
 * and PDC. Data stays in the mediscan namespace on this device. The schedule only ever comes
 * from the user (optionally prefilled from the prescription lines above); nothing here
 * proposes a dose.
 */
export function AdherenceTracker({ lines }: { lines: ParsedLine[] }) {
  const [lang, setLang] = useState<Lang>("bn");
  const t = (bn: string, en: string) => (lang === "bn" ? bn : en);
  const num = (n: number | string) => (lang === "bn" ? bnDigits(n) : String(n));

  const [meds, setMeds, medsState] = usePersistentState<AdherenceMedicine[]>(storageKey("mediscan", "adherenceSchedule"), [], sanitizeSchedule);
  const [log, setLog, logState] = usePersistentState<string[]>(storageKey("mediscan", "adherenceLog"), [], sanitizeLog);

  // The calendar day is read after mount so server and first client render match.
  const [today, setToday] = useState<string | null>(null);
  useEffect(() => {
    const tick = () => setToday(todayInDhaka());
    tick();
    const id = window.setInterval(tick, 60_000);
    return () => window.clearInterval(id);
  }, []);
  const [selected, setSelected] = useState<string | null>(null);
  const day = selected && today && selected <= today ? selected : today;

  const [draft, setDraft] = useState<Draft | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [reviewing, setReviewing] = useState(false);
  const [checked, setChecked] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  // Prescription lines that say how many times a day. Only these can prefill.
  const prefillable = useMemo(() => {
    const { entries } = buildSchedule({ lines, recognisedCount: 0, unrecognisedCount: 0 });
    return lines
      .map((l, i) => ({ l, i, label: entries.find((e) => e.lineIndex === i)?.label ?? l.raw.slice(0, 60) }))
      .filter(({ l }) => (l.dose && (l.dose.morning || l.dose.noon || l.dose.night)) || (l.timesPerDay && l.timesPerDay <= MAX_TIMES_PER_DAY));
  }, [lines]);

  const summary = useMemo(() => (today ? computeAdherence(meds, log, today) : null), [meds, log, today]);
  const strip = useMemo(() => (today ? calendarStrip(meds, log, today, DEFAULT_WINDOW_DAYS) : []), [meds, log, today]);

  // Wait for stored data so an empty default never flashes or overwrites saved ticks.
  if (!today || !medsState.ready || !logState.ready) return null;

  const startAdd = () => {
    setDraft(emptyDraft(today));
    setEditingId(null);
    setReviewing(false);
    setChecked(false);
    setErrors([]);
  };

  const prefillFrom = (idx: number) => {
    const p = prefillable.find((x) => x.i === idx);
    if (!p) return;
    const { l, label } = p;
    // Times per day come from the prescription. Clock times are only reminder times: filled
    // for X+X+X slots, left blank for "bd"/"tds" where the hours are the prescriber's call.
    const times = l.dose
      ? (["morning", "noon", "night"] as const).filter((s) => l.dose![s] > 0).map((s) => SLOT_TIMES[s])
      : Array.from({ length: l.timesPerDay ?? 1 }, () => "");
    const days = courseDays(l.durationText);
    setDraft({
      name: label.slice(0, 80),
      amountNote: (l.measure?.readingBn ?? l.dose?.readingBn ?? "").slice(0, 40),
      times,
      startDate: today,
      endDate: days ? addDays(today, days - 1) : "",
    });
    setReviewing(false);
    setChecked(false);
    setErrors([]);
  };

  const draftToMed = (d: Draft): AdherenceMedicine => ({
    id: editingId ?? Math.random().toString(36).slice(2, 12),
    name: d.name.trim().slice(0, 80),
    amountNote: d.amountNote.trim().slice(0, 40),
    times: d.times,
    startDate: d.startDate,
    endDate: d.endDate || null,
  });

  const review = () => {
    if (!draft) return;
    const errs = validateMedicine(draftToMed(draft));
    setErrors(errs);
    if (!errs.length) {
      setReviewing(true);
      setChecked(false);
    }
  };

  const confirmSave = () => {
    if (!draft || !checked) return;
    const med = draftToMed(draft);
    if (validateMedicine(med).length) return;
    setMeds((prev) => (editingId ? prev.map((m) => (m.id === editingId ? med : m)) : [...prev, med].slice(0, MAX_MEDICINES)));
    // Editing the number of doses drops ticks for doses that no longer exist.
    if (editingId) setLog((prev) => prev.filter((k) => !k.startsWith(`${med.id}|`) || Number(k.split("|")[2]) < med.times.length));
    setDraft(null);
    setEditingId(null);
    setReviewing(false);
  };

  const remove = (m: AdherenceMedicine) => {
    if (!window.confirm(t(`"${m.name}" এবং এর সব টিক মুছে ফেলবেন?`, `Remove "${m.name}" and all its ticks?`))) return;
    setMeds((prev) => prev.filter((x) => x.id !== m.id));
    setLog((prev) => removeMedicineLog(prev, m.id));
  };

  const edit = (m: AdherenceMedicine) => {
    setDraft({ name: m.name, amountNote: m.amountNote, times: [...m.times], startDate: m.startDate, endDate: m.endDate ?? "" });
    setEditingId(m.id);
    setReviewing(false);
    setChecked(false);
    setErrors([]);
  };

  const setTimesCount = (n: number) => {
    if (!draft) return;
    const times = Array.from({ length: n }, (_, i) => draft.times[i] ?? "");
    setDraft({ ...draft, times });
    setReviewing(false);
  };

  const errText: Record<string, string> = {
    name: t("ওষুধের নাম লিখুন।", "Enter the medicine name."),
    times: t("প্রতিটি ডোজের সময় দিন।", "Set a time for every dose."),
    startDate: t("শুরুর তারিখ দিন।", "Set a start date."),
    endDate: t("শেষের তারিখ ঠিক নয়।", "End date is not valid."),
    endBeforeStart: t("শেষের তারিখ শুরুর আগে হতে পারে না।", "End date cannot be before the start date."),
  };

  const dayMeds = meds.filter((m) => day && m.startDate <= day && (m.endDate === null || day <= m.endDate));
  const overall = summary?.overall;
  const overallPct = overall ? pdcPercent(overall.pdc) : null;
  const fmtDate = (d: string) => {
    const [, mo, dd] = d.split("-");
    return lang === "bn" ? `${bnDigits(Number(dd))}/${bnDigits(Number(mo))}` : `${Number(dd)}/${Number(mo)}`;
  };
  const statusLabel = (c: DayCell) =>
    ({
      covered: t("সব ডোজ নেওয়া", "all doses taken"),
      partial: t(`${bnDigits(c.taken)}/${bnDigits(c.scheduled)} ডোজ`, `${c.taken}/${c.scheduled} doses`),
      missed: t("কোনো ডোজ টিক নেই", "no doses ticked"),
      "not-scheduled": t("ওষুধ নেই", "nothing scheduled"),
      today: t(`আজ: ${bnDigits(c.taken)}/${bnDigits(c.scheduled)}`, `today: ${c.taken}/${c.scheduled}`),
      future: "",
    })[c.status];

  return (
    <section id="adherence" aria-labelledby="adh-h" className="scroll-mt-24 space-y-4 rounded-2xl border border-emerald-200 bg-white p-4 sm:p-5 print:hidden" data-testid="adherence">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h2 id="adh-h" className="flex items-center gap-2 text-[18px] font-extrabold"><ClipboardCheck size={20} className="text-emerald-700" aria-hidden /> {t("ওষুধ খাওয়ার হিসাব", "Taking my medicines")}</h2>
          <p className="mt-1 text-[12px] leading-relaxed text-slate-600">
            {t(
              "প্রেসক্রিপশনে যা লেখা আছে ঠিক সেভাবে নিজের সময়সূচি দিন, তারপর প্রতিটি ডোজ খেয়ে টিক দিন। এই অ্যাপ ডোজ ঠিক করে দেয় না।",
              "Enter your schedule exactly as your prescription says, then tick each dose when you take it. This app never sets a dose.",
            )}
          </p>
        </div>
        <div role="group" aria-label={t("ভাষা", "Language")} className="inline-flex shrink-0 rounded-lg border border-slate-200 p-0.5 text-[12px] font-bold">
          {(["bn", "en"] as const).map((l) => (
            <button key={l} type="button" aria-pressed={lang === l} onClick={() => setLang(l)} className={`rounded-md px-2.5 py-1 ${lang === l ? "bg-emerald-700 text-white" : "text-slate-600"}`}>{l === "bn" ? "বাংলা" : "English"}</button>
          ))}
        </div>
      </div>

      {/* Summary */}
      {meds.length > 0 && overall && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Stat label={t(`গত ${bnDigits(DEFAULT_WINDOW_DAYS)} দিনের PDC`, `PDC, last ${DEFAULT_WINDOW_DAYS} days`)} value={overallPct === null ? "—" : `${num(overallPct)}%`} testId="adh-pdc" />
          <Stat label={t("পুরো দিন নেওয়া", "Days fully covered")} value={`${num(overall.daysCovered)}/${num(overall.daysInWindow)}`} />
          <Stat label={t("বাদ পড়া ডোজ", "Missed doses")} value={num(overall.missedDoses)} />
          <Stat label={t("টানা দিন", "Current streak")} value={num(overall.currentStreak)} icon={<Flame size={14} aria-hidden className="text-orange-600" />} />
        </div>
      )}
      {meds.length > 0 && overallPct === null && (
        <p className="text-[12px] text-slate-500">{t("হিসাব শুরু হবে প্রথম পুরো দিন শেষ হলে। আজকের দিন শেষ না হওয়া পর্যন্ত গোনা হয় না।", "The score starts after your first full day. Today is not counted until it is over.")}</p>
      )}
      {overall?.flag && (
        <div role="note" className="flex gap-2 rounded-xl border border-sky-200 bg-sky-50 p-3 text-[13px] text-sky-950" data-testid="adh-flag">
          <MessageCircleQuestion size={18} className="mt-0.5 shrink-0" aria-hidden />
          <p>
            {t(
              "গত কয়েক দিনে কিছু ডোজ বাদ পড়েছে বলে দেখা যাচ্ছে। আপনার ডাক্তার বা ফার্মাসিস্টের সাথে কথা বলুন — ওষুধ খেতে কোনো অসুবিধা হলে তাঁরা সাহায্য করতে পারেন। নিজে থেকে ডোজ বদলাবেন না।",
              "Some doses seem to have been missed recently. Talk to your doctor or pharmacist; they can help if something makes the medicine hard to take. Do not change a dose on your own.",
            )}
            <span className="mt-1 block text-[11px] text-sky-900/80">{t("৮০% সীমা: PQA ও CMS-এর ব্যবহৃত মানদণ্ড। এটি রোগ নির্ণয় নয়।", "80% threshold: the standard used by PQA and CMS. This is not a diagnosis.")}</span>
          </p>
        </div>
      )}

      {/* 30-day strip */}
      {meds.length > 0 && (
        <div>
          <h3 className="mb-1.5 flex items-center gap-1.5 text-[13px] font-bold"><CalendarDays size={15} aria-hidden /> {t(`গত ${bnDigits(DEFAULT_WINDOW_DAYS)} দিন`, `Last ${DEFAULT_WINDOW_DAYS} days`)}</h3>
          <ol className="grid grid-cols-10 gap-1" aria-label={t("৩০ দিনের ক্যালেন্ডার", "30-day calendar")}>
            {strip.map((c) => (
              <li key={c.date}>
                <button
                  type="button"
                  onClick={() => setSelected(c.date)}
                  aria-pressed={day === c.date}
                  aria-label={`${fmtDate(c.date)}: ${statusLabel(c)}`}
                  title={`${c.date}: ${statusLabel(c)}`}
                  data-status={c.status}
                  className={`flex h-9 w-full items-center justify-center rounded-md border font-mono text-[10px] ${STATUS_STYLE[c.status]} ${day === c.date ? "ring-2 ring-slate-900 ring-offset-1" : ""}`}
                >
                  {c.status === "covered" ? <Check size={13} aria-hidden /> : num(Number(c.date.slice(8)))}
                </button>
              </li>
            ))}
          </ol>
          <ul className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-slate-600">
            <li className="flex items-center gap-1"><span className="h-3 w-3 rounded-sm bg-emerald-500" aria-hidden /> {t("সব ডোজ", "All doses")}</li>
            <li className="flex items-center gap-1"><span className="h-3 w-3 rounded-sm border border-amber-400 bg-amber-200" aria-hidden /> {t("কিছু ডোজ", "Some doses")}</li>
            <li className="flex items-center gap-1"><span className="h-3 w-3 rounded-sm border border-red-300 bg-white" aria-hidden /> {t("টিক নেই", "None ticked")}</li>
            <li className="flex items-center gap-1"><span className="h-3 w-3 rounded-sm bg-slate-100" aria-hidden /> {t("ওষুধ নেই", "Not scheduled")}</li>
          </ul>
        </div>
      )}

      {/* Dose ticks for the selected day (today by default) */}
      {meds.length > 0 && day && (
        <div className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-[14px] font-bold">{day === today ? t("আজকের ডোজ", "Today's doses") : t(`${fmtDate(day)} তারিখের ডোজ (ঠিক করছেন)`, `Doses on ${fmtDate(day)} (correcting)`)}</h3>
            {day !== today && <button type="button" onClick={() => setSelected(null)} className="text-[12px] font-semibold text-sky-700 underline">{t("আজকে ফিরুন", "Back to today")}</button>}
          </div>
          {dayMeds.length === 0 ? (
            <p className="text-[12px] text-slate-500">{t("এই দিনে কোনো ওষুধ নির্ধারিত নেই।", "No medicine scheduled on this day.")}</p>
          ) : (
            <ul className="space-y-2">
              {dayMeds.map((m) => (
                <li key={m.id} className="rounded-xl border border-slate-200 p-3">
                  <span className="block text-[14px] font-semibold">{m.name}{m.amountNote && <span className="font-normal text-slate-600"> · {m.amountNote}</span>}</span>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {m.times.map((time, i) => {
                      const on = log.includes(doseKey(m.id, day, i));
                      return (
                        <button
                          key={i}
                          type="button"
                          aria-pressed={on}
                          onClick={() => setLog((prev) => toggleDose(prev, m.id, day, i))}
                          className={`inline-flex min-h-11 items-center gap-1.5 rounded-xl border px-3 text-[14px] font-bold ${on ? "border-emerald-600 bg-emerald-600 text-white" : "border-slate-300 bg-white text-slate-800"}`}
                        >
                          {on ? <Check size={16} aria-hidden /> : <span className="h-4 w-4 rounded border-2 border-slate-400" aria-hidden />}
                          {num(time)}
                          <span className="sr-only">{on ? t(" নেওয়া হয়েছে", " taken") : t(" এখনো নেওয়া হয়নি", " not taken yet")}</span>
                        </button>
                      );
                    })}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Per-medicine breakdown */}
      {summary && summary.medicines.length > 0 && (
        <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 text-[13px]">
          {summary.medicines.map((r) => {
            const m = meds.find((x) => x.id === r.medId)!;
            const pct = pdcPercent(r.pdc);
            return (
              <li key={r.medId} className="flex items-start justify-between gap-2 p-3">
                <div className="min-w-0">
                  <span className="block truncate font-semibold">{m.name}</span>
                  <span className="text-[11px] text-slate-500">
                    {t(`দিনে ${bnDigits(m.times.length)} বার`, `${m.times.length}× a day`)} · {fmtDate(m.startDate)} – {m.endDate ? fmtDate(m.endDate) : t("শেষ তারিখ নেই", "no end date")}
                    {" · "}PDC {pct === null ? "—" : `${num(pct)}%`} · {t(`বাদ ${bnDigits(r.missedDoses)}`, `missed ${r.missedDoses}`)}
                  </span>
                </div>
                <div className="flex shrink-0 gap-1">
                  <button type="button" onClick={() => edit(m)} aria-label={t(`${m.name} সম্পাদনা`, `Edit ${m.name}`)} className="grid h-9 w-9 place-items-center rounded-lg text-slate-500 hover:bg-slate-100"><Pencil size={15} /></button>
                  <button type="button" onClick={() => remove(m)} aria-label={t(`${m.name} মুছুন`, `Remove ${m.name}`)} className="grid h-9 w-9 place-items-center rounded-lg text-slate-500 hover:bg-red-50 hover:text-red-600"><Trash2 size={15} /></button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {/* Add / edit with an explicit confirm step */}
      {!draft ? (
        <div className="flex flex-wrap gap-2">
          {meds.length < MAX_MEDICINES && (
            <button type="button" onClick={startAdd} className="inline-flex min-h-11 items-center gap-1.5 rounded-xl bg-emerald-700 px-4 text-[14px] font-bold text-white hover:bg-emerald-800"><Plus size={16} aria-hidden /> {t("ওষুধের সময়সূচি যোগ করুন", "Add a medicine schedule")}</button>
          )}
          {meds.length > 0 && (
            <button
              type="button"
              onClick={() => downloadText("mediscan-adherence-reminders.ics", adherenceToIcs(meds, { stamp: new Date().toISOString().replace(/[-:]/g, "").slice(0, 15) + "Z" }), "text/calendar;charset=utf-8")}
              className="inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-sky-700 px-4 text-[14px] font-bold text-sky-800 hover:bg-sky-50"
            >
              <CalendarDays size={16} aria-hidden /> {t("দৈনিক রিমাইন্ডার (.ics)", "Daily reminders (.ics)")}
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-3" data-testid="adh-form">
          <div className="flex items-center justify-between">
            <h3 className="text-[14px] font-bold">{editingId ? t("সময়সূচি সম্পাদনা", "Edit schedule") : t("নতুন সময়সূচি", "New schedule")}</h3>
            <button type="button" onClick={() => { setDraft(null); setEditingId(null); }} aria-label={t("বাতিল", "Cancel")} className="grid h-9 w-9 place-items-center rounded-lg text-slate-500 hover:bg-white"><X size={16} /></button>
          </div>

          {!reviewing ? (
            <>
              {!editingId && prefillable.length > 0 && (
                <label className="block text-[12px] font-bold text-slate-700">{t("উপরের প্রেসক্রিপশন থেকে নিন (ঐচ্ছিক)", "Fill from the prescription above (optional)")}
                  <select defaultValue="" onChange={(e) => e.target.value !== "" && prefillFrom(Number(e.target.value))} className="mt-1 block w-full rounded-lg border border-slate-200 bg-white px-2 py-2 text-[13px] font-normal">
                    <option value="">{t("একটি লাইন বেছে নিন", "Choose a line")}</option>
                    {prefillable.map((p) => <option key={p.i} value={p.i}>{p.label}</option>)}
                  </select>
                  <span className="mt-1 block font-normal text-slate-500">{t("পূরণ হওয়ার পর মূল প্রেসক্রিপশনের সাথে মিলিয়ে নিন।", "Check every field against your paper prescription after filling.")}</span>
                </label>
              )}
              <label className="block text-[12px] font-bold text-slate-700">{t("ওষুধের নাম (প্রেসক্রিপশনে যেমন লেখা)", "Medicine name (as written on the prescription)")}
                <input value={draft.name} maxLength={80} onChange={(e) => setDraft({ ...draft, name: e.target.value })} className="mt-1 block w-full rounded-lg border border-slate-200 bg-white px-2 py-2 text-[14px] font-normal" />
              </label>
              <label className="block text-[12px] font-bold text-slate-700">{t("প্রতিবার কতটুকু (প্রেসক্রিপশনে যেমন লেখা, ঐচ্ছিক)", "Amount each time (as written, optional)")}
                <input value={draft.amountNote} maxLength={40} onChange={(e) => setDraft({ ...draft, amountNote: e.target.value })} placeholder={t("যেমন: ১টি", "e.g. 1 tablet")} className="mt-1 block w-full rounded-lg border border-slate-200 bg-white px-2 py-2 text-[14px] font-normal" />
              </label>
              <fieldset>
                <legend className="text-[12px] font-bold text-slate-700">{t("দিনে কয়বার (প্রেসক্রিপশন অনুযায়ী)", "Times a day (from the prescription)")}</legend>
                <div className="mt-1 flex gap-2">
                  {Array.from({ length: MAX_TIMES_PER_DAY }, (_, i) => i + 1).map((n) => (
                    <button key={n} type="button" aria-pressed={draft.times.length === n} onClick={() => setTimesCount(n)} className={`h-11 w-11 rounded-xl border text-[15px] font-bold ${draft.times.length === n ? "border-emerald-700 bg-emerald-700 text-white" : "border-slate-300 bg-white"}`}>{num(n)}</button>
                  ))}
                </div>
              </fieldset>
              <div className="grid grid-cols-2 gap-2">
                {draft.times.map((time, i) => (
                  <label key={i} className="block text-[12px] font-bold text-slate-700">{t(`ডোজ ${bnDigits(i + 1)}-এর রিমাইন্ডার সময়`, `Dose ${i + 1} reminder time`)}
                    <input type="time" value={time} onChange={(e) => setDraft({ ...draft, times: draft.times.map((x, j) => (j === i ? e.target.value : x)) })} className="mt-1 block w-full rounded-lg border border-slate-200 bg-white px-2 py-2 text-[14px] font-normal" />
                  </label>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <label className="block text-[12px] font-bold text-slate-700">{t("শুরুর তারিখ", "Start date")}
                  <input type="date" value={draft.startDate} onChange={(e) => setDraft({ ...draft, startDate: e.target.value })} className="mt-1 block w-full rounded-lg border border-slate-200 bg-white px-2 py-2 text-[14px] font-normal" />
                </label>
                <label className="block text-[12px] font-bold text-slate-700">{t("শেষের তারিখ (লেখা থাকলে)", "End date (if written)")}
                  <input type="date" value={draft.endDate} min={draft.startDate} onChange={(e) => setDraft({ ...draft, endDate: e.target.value })} className="mt-1 block w-full rounded-lg border border-slate-200 bg-white px-2 py-2 text-[14px] font-normal" />
                </label>
              </div>
              {errors.length > 0 && (
                <ul role="alert" className="space-y-0.5 text-[12px] text-red-700">{errors.map((e) => <li key={e}>• {errText[e] ?? e}</li>)}</ul>
              )}
              <button type="button" onClick={review} className="inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-emerald-700 px-4 text-[14px] font-bold text-white hover:bg-emerald-800">{t("মিলিয়ে দেখুন", "Review")}</button>
            </>
          ) : (
            <div className="space-y-3">
              <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 rounded-lg bg-white p-3 text-[13px]">
                <dt className="font-bold text-slate-500">{t("ওষুধ", "Medicine")}</dt><dd>{draft.name}</dd>
                <dt className="font-bold text-slate-500">{t("প্রতিবার", "Each time")}</dt><dd>{draft.amountNote || <span className="text-slate-400">{t("লেখা হয়নি", "not entered")}</span>}</dd>
                <dt className="font-bold text-slate-500">{t("দিনে", "Per day")}</dt><dd>{t(`${bnDigits(draft.times.length)} বার`, `${draft.times.length} times`)} — {draft.times.map(num).join(", ")}</dd>
                <dt className="font-bold text-slate-500">{t("তারিখ", "Dates")}</dt><dd>{draft.startDate} → {draft.endDate || t("শেষ তারিখ নেই", "no end date")}</dd>
              </dl>
              <label className="flex items-start gap-2 text-[13px] leading-relaxed">
                <input type="checkbox" checked={checked} onChange={(e) => setChecked(e.target.checked)} className="mt-1 h-4 w-4 accent-emerald-700" />
                <span>{t("আমি আমার প্রেসক্রিপশনের সাথে মিলিয়ে দেখেছি; এটি ডাক্তার যেভাবে লিখেছেন সেভাবেই আছে।", "I have checked this against my prescription; it matches what the doctor wrote.")}</span>
              </label>
              <div className="flex gap-2">
                <button type="button" onClick={() => setReviewing(false)} className="min-h-11 flex-1 rounded-xl border border-slate-300 bg-white px-3 text-[14px] font-bold">{t("ঠিক করুন", "Edit")}</button>
                <button type="button" disabled={!checked} onClick={confirmSave} className="min-h-11 flex-1 rounded-xl bg-emerald-700 px-3 text-[14px] font-bold text-white disabled:cursor-not-allowed disabled:opacity-40">{t("নিশ্চিত করে সংরক্ষণ", "Confirm and save")}</button>
              </div>
            </div>
          )}
        </div>
      )}

      <p className="text-[11px] leading-relaxed text-slate-500">
        {t(
          "PDC (Proportion of Days Covered): গত ৩০টি পুরো দিনের মধ্যে কত দিন সব ডোজ টিক দেওয়া হয়েছে। শুরুর আগের দিন, শেষের পরের দিন ও আজকের চলমান দিন গোনা হয় না। সব তথ্য শুধু এই ডিভাইসে থাকে।",
          "PDC (Proportion of Days Covered): of the last 30 full days, how many had every dose ticked. Days before the start, after the end and today (still in progress) are not counted. Everything stays on this device.",
        )}
      </p>
    </section>
  );
}

function Stat({ label, value, icon, testId }: { label: string; value: string; icon?: ReactNode; testId?: string }) {
  return (
    <div className="rounded-xl bg-slate-50 p-3">
      <span className="block text-[11px] font-bold text-slate-500">{label}</span>
      <span className="mt-0.5 flex items-center gap-1 font-mono text-[20px] font-bold text-slate-900" data-testid={testId}>{icon}{value}</span>
    </div>
  );
}
