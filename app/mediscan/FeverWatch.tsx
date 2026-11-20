"use client";
import { useEffect, useState } from "react";
import { AlertTriangle, ClipboardCopy, Download, Phone, Save, Thermometer, Trash2 } from "lucide-react";
import { SourceTag } from "@/components/layout/AppHeader";
import { usePersistentState, storageKey, downloadText } from "@/lib/clientStore";
import {
  DENGUE_SOURCES, WARNING_SIGNS, assessFever, feverSummaryText, sanitizeFeverWatch, todayInBangladesh,
  MAX_FEVER_CHECKS, type FeverCheck, type FeverWatch as FeverWatchData,
} from "@/lib/dengue";
import { readableDate } from "./bnDate";

const bnNum = (v: number | string) => String(v).replace(/\d/g, (d) => "০১২৩৪৫৬৭৮৯"[Number(d)]);

const LEVEL_STYLE = {
  go_now: "border-red-500 bg-red-50 text-red-950",
  watch_closely: "border-amber-400 bg-amber-50 text-amber-950",
  keep_watching: "border-slate-300 bg-slate-50 text-slate-900",
} as const;

/**
 * Fever and dengue warning-sign watch. The family ticks what they see; one fixed WHO-based rule decides
 * between "go to hospital now", "watch closely" and "keep watching". It never says dengue or not-dengue,
 * never suggests a medicine, and saves a check only when the user taps save.
 */
export function FeverWatch() {
  const [lang, setLang] = useState<"bn" | "en">("bn");
  const bn = lang === "bn";
  const T = (b: string, e: string) => (bn ? b : e);
  const [saved, setSaved] = usePersistentState<FeverWatchData>(storageKey("mediscan", "feverWatch"), { feverStart: "", checks: [] }, sanitizeFeverWatch);
  const [today, setToday] = useState("");
  const [feverStart, setFeverStart] = useState("");
  const [feverGone, setFeverGone] = useState(false);
  const [signs, setSigns] = useState<string[]>([]);
  const [msg, setMsg] = useState("");

  useEffect(() => { setToday(todayInBangladesh()); }, []);
  useEffect(() => { if (saved.feverStart && !feverStart) setFeverStart(saved.feverStart); }, [saved.feverStart, feverStart]);

  const a = assessFever({ feverStart, today, feverGone, signs });
  const toggle = (id: string) => setSigns((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  const flash = (m: string) => { setMsg(m); window.setTimeout(() => setMsg(""), 2500); };

  const saveCheck = () => {
    const now = new Date(Date.now() + 6 * 3_600_000);
    const check: FeverCheck = { date: today, time: now.toISOString().slice(11, 16), day: a.day, feverGone, signs: a.signs, level: a.level };
    setSaved({ feverStart, checks: [...saved.checks, check].slice(-MAX_FEVER_CHECKS) });
    flash(T("আজকের অবস্থা এই ফোনে সংরক্ষিত হয়েছে।", "Today's check is saved on this phone."));
  };
  const summary = feverSummaryText({ feverStart: feverStart || saved.feverStart, checks: saved.checks }, lang);
  const copy = async () => {
    try { await navigator.clipboard.writeText(summary); flash(T("কপি হয়েছে", "Copied")); }
    catch { flash(T("কপি করা যায়নি — ডাউনলোড ব্যবহার করুন", "Could not copy — use download")); }
  };

  return (
    <section id="dengue" aria-labelledby="dengue-h" data-testid="fever-watch" className="scroll-mt-24 space-y-4 rounded-2xl border-2 border-red-200 bg-white p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 id="dengue-h" className="flex items-center gap-2 text-[20px] font-extrabold text-slate-900"><Thermometer size={22} className="text-red-600" aria-hidden /> {T("জ্বর ও ডেঙ্গু সতর্ক সংকেত", "Fever and dengue warning signs")}</h2>
          <p className="mt-1 max-w-3xl text-[14.5px] leading-relaxed text-slate-700">
            {T(
              "ডেঙ্গুতে বিপদ প্রায়ই আসে জ্বর কমে যাওয়ার পরে, আর যারা দেরিতে হাসপাতালে যান তাদের ঝুঁকিই বেশি। জ্বরের দিন আর যা দেখছেন তা বাছাই করুন — একটি সংকেতও থাকলে রক্ষা বলবে এখনই হাসপাতালে যেতে।",
              "In dengue the danger often comes after the fever goes down, and people who reach hospital late face the most risk. Enter the fever day and tick what you see — if even one sign is there, it will tell you to go to hospital now.",
            )}
          </p>
        </div>
        <button type="button" onClick={() => setLang(bn ? "en" : "bn")} className="kp-chip !h-11 !min-w-[44px] !rounded-full !text-[13px] font-semibold" aria-label={bn ? "EN, Switch to English" : "বাং, বাংলায় দেখুন"}>{bn ? "EN" : "বাং"}</button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="fv-start" className="text-[14px] font-semibold text-slate-800">{T("জ্বর কবে শুরু হয়েছে", "When did the fever start")}</label>
          <input id="fv-start" type="date" value={feverStart} max={today || undefined} onChange={(e) => setFeverStart(e.target.value)} aria-describedby="fv-start-read" className="mt-1 min-h-[48px] w-full rounded-xl border border-slate-300 px-3 py-2.5 text-[15px]" />
          <p id="fv-start-read" className="mt-1 text-[14px] text-slate-700" data-testid="fever-start-bn">
            {feverStart ? <>{T("বেছে নেওয়া তারিখ: ", "Chosen date: ")}<strong className="font-semibold text-slate-900">{readableDate(feverStart, bn)}</strong></> : T("ক্যালেন্ডার থেকে তারিখ বেছে নিন", "Pick the date from the calendar")}
          </p>
          {a.day !== null && <p className="mt-1 text-[14px] font-semibold text-slate-800" data-testid="fever-day">{T(`আজ জ্বরের ${bnNum(a.day)}তম দিন`, `Today is day ${a.day} of the fever`)}</p>}
        </div>
        <label className="flex min-h-[52px] items-center gap-3 self-end rounded-xl border border-slate-300 px-3 py-2 text-[15px]">
          <input type="checkbox" checked={feverGone} onChange={(e) => setFeverGone(e.target.checked)} className="h-5 w-5" />
          <span>{T("জ্বর এখন কমে গেছে বা চলে গেছে", "The fever has gone down or stopped")}</span>
        </label>
      </div>

      <fieldset>
        <legend className="text-[14px] font-semibold text-slate-800">{T("এগুলোর কোনোটি কি দেখছেন? (WHO-র সতর্ক সংকেত)", "Do you see any of these? (WHO warning signs)")}</legend>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {WARNING_SIGNS.map((s) => {
            const on = signs.includes(s.id);
            return (
              <label key={s.id} data-sign={s.id} className={`flex min-h-[52px] cursor-pointer items-center gap-3 rounded-xl border px-3 py-2 text-[15px] transition-colors ${on ? "border-red-500 bg-red-50 font-semibold text-red-950" : "border-slate-200 bg-white text-slate-800"}`}>
                <input type="checkbox" checked={on} onChange={() => toggle(s.id)} className="h-5 w-5 accent-red-600" />
                <span>{bn ? s.bn : s.en}</span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <div aria-live="polite" data-testid="fever-result" data-level={a.level} className={`rounded-2xl border-2 p-4 ${LEVEL_STYLE[a.level]}`}>
        <p className="flex items-start gap-2 text-[19px] font-extrabold leading-snug">{a.level !== "keep_watching" && <AlertTriangle size={22} className="mt-0.5 shrink-0" aria-hidden />}<span>{bn ? a.headlineBn : a.headlineEn}</span></p>
        <ul className="mt-2 space-y-1 text-[15px] leading-relaxed">
          {(bn ? a.pointsBn : a.pointsEn).map((p) => <li key={p}>• {p}</li>)}
        </ul>
        <div className="mt-3 flex flex-wrap gap-2">
          {a.level === "go_now" && <a href="tel:999" className="inline-flex min-h-[50px] items-center gap-2 rounded-xl bg-red-600 px-5 text-[16px] font-bold text-white"><Phone size={18} aria-hidden /> {T("৯৯৯ — অ্যাম্বুলেন্স", "999 — ambulance")}</a>}
          <a href="tel:16263" className="inline-flex min-h-[50px] items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 text-[15px] font-bold text-slate-900"><Phone size={17} aria-hidden /> {T("১৬২৬৩ — ডাক্তারের পরামর্শ", "16263 — doctor advice")}</a>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button type="button" data-testid="fever-save" onClick={saveCheck} disabled={!today} className="inline-flex min-h-[48px] items-center gap-2 rounded-xl bg-slate-900 px-4 text-[15px] font-bold text-white disabled:opacity-50"><Save size={17} aria-hidden /> {T("আজকের অবস্থা সংরক্ষণ করুন", "Save today's check")}</button>
        {saved.checks.length > 0 && (
          <>
            <button type="button" onClick={copy} className="inline-flex min-h-[48px] items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 text-[15px]"><ClipboardCopy size={17} aria-hidden /> {T("ডাক্তারের জন্য সারাংশ কপি", "Copy summary for the doctor")}</button>
            <button type="button" onClick={() => downloadText(`fever-notes-${today}.txt`, summary)} className="inline-flex min-h-[48px] items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 text-[15px]"><Download size={17} aria-hidden /> {T("ডাউনলোড", "Download")}</button>
            <button type="button" onClick={() => { if (window.confirm(T("সব জ্বরের নোট মুছে ফেলবেন?", "Delete all fever notes?"))) { setSaved({ feverStart: "", checks: [] }); setFeverStart(""); } }} className="inline-flex min-h-[48px] items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 text-[15px] text-red-700"><Trash2 size={17} aria-hidden /> {T("মুছুন", "Delete")}</button>
          </>
        )}
      </div>
      {msg && <p role="status" className="text-[14px] font-semibold text-emerald-800">{msg}</p>}

      {saved.checks.length > 0 && (
        <ol className="space-y-1 text-[14px] text-slate-800" data-testid="fever-log">
          {[...saved.checks].reverse().slice(0, 7).map((c, i) => (
            <li key={`${c.date}-${c.time}-${i}`} className="flex flex-wrap gap-x-2 rounded-lg bg-slate-50 px-3 py-2">
              <span className="font-mono">{bn ? bnNum(c.date) : c.date} {bn ? bnNum(c.time) : c.time}</span>
              {c.day && <span>{T(`দিন ${bnNum(c.day)}`, `day ${c.day}`)}</span>}
              <span className={c.level === "go_now" ? "font-bold text-red-700" : c.level === "watch_closely" ? "font-semibold text-amber-800" : ""}>
                {c.signs.length ? T(`${bnNum(c.signs.length)}টি সংকেত`, `${c.signs.length} sign${c.signs.length > 1 ? "s" : ""}`) : T("সংকেত নেই", "no sign")}
              </span>
            </li>
          ))}
        </ol>
      )}

      <div className="flex flex-wrap gap-2 border-t border-slate-200 pt-3">
        {DENGUE_SOURCES.map((s) => <SourceTag key={s.url} confidence="official" label={s.label} url={s.url} checked={s.checked} />)}
      </div>
      <p className="text-[12.5px] leading-relaxed text-slate-600">
        {T(
          "নিয়ম (আমাদের নকশা, WHO-র তালিকার ওপর): একটি সংকেতও থাকলে \"এখনই হাসপাতাল\"; জ্বরের ৩য় দিন বা পরে, কিংবা জ্বর কমে গেলে \"কড়া নজর\"। কোনো ওষুধ বা ডোজ বলা হয় না। নোট শুধু এই ফোনে থাকে।",
          "Rule (our design, built on WHO's list): any sign means \"hospital now\"; day 3 or later, or a fever that has gone down, means \"watch closely\". No medicine or dose is ever suggested. Notes stay only on this phone.",
        )}
      </p>
    </section>
  );
}
