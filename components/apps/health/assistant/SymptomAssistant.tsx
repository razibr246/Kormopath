"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowRight, BookOpen, ClipboardCopy, Hospital, Mic, MicOff, Phone, Stethoscope } from "lucide-react";
import { SourceTag } from "@/components/layout/AppHeader";
import {
  HEALTH_SOURCES, MEDICAL_TERMS, RED_FLAGS, doctorNote, findTerm, routeSymptoms, specialtyById,
  type AgeGroup, type BodyAreaId, type MedicalTerm, type RedFlag,
} from "@/lib/health/specialty";
import { BodyMap } from "./BodyMap";
import { isOfflineEngine, OFFLINE_LABEL } from "@/lib/health/offline";
import "./assistant.css";

type Result =
  | { kind: "emergency"; flags: RedFlag[] }
  | { kind: "specialty"; specialtyId: string; whyBn: string; whyEn: string; tellDoctor: string[]; alternatives: string[]; engine: string; trace: { tool: string; detail: string; status: string }[] };

type SR = { start(): void; stop(): void; abort?(): void; lang: string; interimResults: boolean; continuous: boolean; onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null; onend: (() => void) | null; onerror: (() => void) | null };

const AGES: Array<{ id: AgeGroup; bn: string; en: string }> = [
  { id: "adult", bn: "প্রাপ্তবয়স্ক", en: "Adult" },
  { id: "child", bn: "শিশু (১৫ বছরের কম)", en: "Child (under 15)" },
  { id: "older", bn: "বয়স্ক (৬৫+)", en: "Older (65+)" },
  { id: "pregnant", bn: "গর্ভবতী", en: "Pregnant" },
];

/** Emergency answer: shown at once (no animation), nothing else on screen competes with it. */
function EmergencyAlert({ flags, bn, onBack }: { flags: RedFlag[]; bn: boolean; onBack: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { ref.current?.focus(); }, []);
  return (
    <section ref={ref} tabIndex={-1} role="alert" data-testid="redflag-alert" className="space-y-4 rounded-2xl border-2 border-red-600 bg-red-50 p-5 sm:p-6 outline-none">
      <p className="flex items-start gap-2 text-[clamp(21px,3vw,27px)] font-extrabold leading-tight text-red-900"><AlertTriangle size={26} className="mt-1 shrink-0" aria-hidden /> {bn ? "এখনই ৯৯৯-এ ফোন করুন বা সবচেয়ে কাছের জরুরি বিভাগে যান" : "Call 999 now or go to the nearest emergency department"}</p>
      <ul className="space-y-1 text-[15.5px] leading-relaxed text-red-950">
        {flags.map((f) => <li key={f.id}>• {bn ? f.bn : f.en}</li>)}
      </ul>
      <p className="text-[15px] text-red-950">{bn ? "এটি অপেক্ষা করার মতো নয়। অনলাইন ডাক্তারের অ্যাপয়েন্টমেন্টের জন্য বসে থাকবেন না। রোগীকে একা রাখবেন না।" : "This cannot wait. Do not wait for an online appointment. Do not leave the person alone."}</p>
      <div className="flex flex-wrap gap-2">
        <a href="tel:999" className="inline-flex min-h-[52px] items-center gap-2 rounded-xl bg-red-700 px-6 text-[17px] font-bold text-white"><Phone size={19} aria-hidden /> {bn ? "৯৯৯-এ কল করুন" : "Call 999"}</a>
        <Link href="/mediscan/emergency" className="inline-flex min-h-[52px] items-center gap-2 rounded-xl border-2 border-red-700 bg-white px-5 text-[16px] font-bold text-red-800"><Hospital size={18} aria-hidden /> {bn ? "কাছের জরুরি হাসপাতাল" : "Nearest emergency hospital"}</Link>
        <a href="tel:16263" className="inline-flex min-h-[52px] items-center gap-2 rounded-xl border border-red-300 bg-white px-4 text-[15px] font-semibold text-red-900"><Phone size={17} aria-hidden /> {bn ? "১৬২৬৩ — ডাক্তারের পরামর্শ" : "16263 — doctor advice"}</a>
      </div>
      <div className="flex flex-wrap gap-2">{[...new Map(flags.map((f) => [f.source.url, f.source])).values()].map((s) => <SourceTag key={s.url} confidence="official" label={s.label} url={s.url} checked={s.checked} />)}</div>
      <button type="button" onClick={onBack} className="text-[13.5px] font-semibold text-red-800 underline">{bn ? "ভুল করে বাছাই করেছি — ফিরে যান" : "I ticked this by mistake — go back"}</button>
    </section>
  );
}

export function SymptomAssistant({ lang, setLang }: { lang: "bn" | "en"; setLang: (l: "bn" | "en") => void }) {
  const bn = lang === "bn";
  const T = (b: string, e: string) => (bn ? b : e);
  const [ticked, setTicked] = useState<string[]>([]);
  const [noneTicked, setNoneTicked] = useState(false);
  const [text, setText] = useState("");
  const [age, setAge] = useState<AgeGroup>("adult");
  const [areas, setAreas] = useState<BodyAreaId[]>([]);
  const [since, setSince] = useState("");
  const [meds, setMeds] = useState("");
  const [allergies, setAllergies] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [err, setErr] = useState("");
  const [copied, setCopied] = useState(false);
  const [listening, setListening] = useState(false);
  const srRef = useRef<SR | null>(null);
  const [termQ, setTermQ] = useState("");
  const [term, setTerm] = useState<MedicalTerm | null | undefined>(undefined);

  const toggleArea = (id: BodyAreaId) => setAreas((a) => (a.includes(id) ? a.filter((x) => x !== id) : [...a, id]));
  const toggleFlag = (id: string) => { setNoneTicked(false); setTicked((t) => (t.includes(id) ? t.filter((x) => x !== id) : [...t, id])); };

  // A ticked warning sign answers at once, before anything is typed or sent.
  useEffect(() => {
    if (ticked.length) setResult({ kind: "emergency", flags: RED_FLAGS.filter((r) => ticked.includes(r.id)) });
  }, [ticked]);

  // Checked after mount so the first render matches the server (no hydration mismatch).
  const [speechOk, setSpeechOk] = useState(false);
  useEffect(() => { setSpeechOk("SpeechRecognition" in window || "webkitSpeechRecognition" in window); }, []);
  const toggleMic = () => {
    if (listening) { srRef.current?.stop(); return; }
    const W = window as unknown as { SpeechRecognition?: new () => SR; webkitSpeechRecognition?: new () => SR };
    const C = W.SpeechRecognition ?? W.webkitSpeechRecognition;
    if (!C) return;
    const sr = new C();
    sr.lang = bn ? "bn-BD" : "en-US"; sr.interimResults = false; sr.continuous = false;
    sr.onresult = (e) => { const said = Array.from(e.results).map((r) => r[0]?.transcript ?? "").join(" "); setText((t) => (t ? `${t} ${said}` : said).slice(0, 1500)); };
    sr.onend = () => setListening(false);
    sr.onerror = () => setListening(false);
    srRef.current = sr; setListening(true); sr.start();
  };

  const submit = async () => {
    setErr(""); setCopied(false);
    const local = routeSymptoms({ text, ageGroup: age, ticked, areas });
    if (local.emergency) { setResult({ kind: "emergency", flags: local.redFlags }); return; }
    setResult(null); setLoading(true);
    try {
      const r = await fetch("/api/health/assist", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ mode: "route", text, lang, ageGroup: age, ticked, areas }) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "error");
      if (j.emergency) setResult({ kind: "emergency", flags: RED_FLAGS.filter((f) => (j.redFlags as string[]).includes(f.id)) });
      else setResult({ kind: "specialty", specialtyId: j.specialtyId, whyBn: j.whyBn, whyEn: j.whyEn, tellDoctor: j.tellDoctor ?? [], alternatives: j.alternatives ?? [], engine: j.engine, trace: j.trace ?? [] });
    } catch {
      // Offline or server error: the same fixed router runs on the device.
      const sp = local.specialty ?? specialtyById("medicine")!;
      setResult({ kind: "specialty", specialtyId: sp.id, whyBn: sp.coversBn, whyEn: sp.coversEn, tellDoctor: [], alternatives: local.alternatives.map((a) => a.id), engine: "rule-based (offline)", trace: [] });
      setErr(T("ইন্টারনেট পাওয়া যায়নি; ফোনের ভেতরের নিয়ম দিয়ে উত্তর দেওয়া হলো।", "No connection; answered by the rules on this phone."));
    } finally { setLoading(false); }
  };

  const sp = result?.kind === "specialty" ? specialtyById(result.specialtyId) : null;
  const note = sp ? doctorNote({ text, since, ageGroup: age, areas, medicinesTaking: meds, allergies }, sp, lang) : "";
  const copy = async () => { try { await navigator.clipboard.writeText(note); setCopied(true); } catch { setCopied(false); } };

  if (result?.kind === "emergency") {
    return <EmergencyAlert flags={result.flags} bn={bn} onBack={() => { setTicked([]); setResult(null); }} />;
  }

  return (
    <div className="space-y-6" data-testid="health-assistant">
      {/* 1. Triage first: any of these means emergency, no questions asked. */}
      <section aria-labelledby="hb-triage-h" className="space-y-3 rounded-2xl border-2 border-red-200 bg-white p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="kp-eyebrow !font-sans !text-[13px] !leading-[1.4] !tracking-normal !normal-case">{T("প্রথমে নিরাপত্তা", "Safety first")}</p>
            <h2 id="hb-triage-h" className="mt-1 text-[20px] font-extrabold text-slate-900">{T("এখন এগুলোর কোনোটি হচ্ছে?", "Is any of this happening now?")}</h2>
          </div>
          <button type="button" onClick={() => setLang(bn ? "en" : "bn")} className="kp-chip !min-h-[44px]">{bn ? "EN" : "বাং"}</button>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          {RED_FLAGS.map((f) => (
            <label key={f.id} className="flex min-h-[52px] cursor-pointer items-center gap-3 rounded-xl border border-slate-200 px-3 py-2 text-[15px] leading-[1.45] text-slate-800 hover:border-red-400">
              <input type="checkbox" checked={ticked.includes(f.id)} onChange={() => toggleFlag(f.id)} className="h-5 w-5 shrink-0 accent-red-700" data-flag={f.id} />
              <span>{bn ? f.bn : f.en}</span>
            </label>
          ))}
        </div>
        <button type="button" onClick={() => setNoneTicked(true)} aria-pressed={noneTicked} className={`kp-btn-ghost inline-flex min-h-[48px] items-center gap-2 px-4 text-[15px] ${noneTicked ? "!border-emerald-600" : ""}`} data-testid="redflag-none">
          {T("এগুলোর কোনোটি নয়", "None of these")}
        </button>
      </section>

      {/* 2. Describe it. */}
      <section aria-labelledby="hb-desc-h" className={`grid gap-6 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 lg:grid-cols-[1fr_220px] ${noneTicked ? "" : "opacity-60"}`} aria-disabled={!noneTicked}>
        <div className="space-y-4">
          <h2 id="hb-desc-h" className="text-[20px] font-extrabold text-slate-900">{T("কী হচ্ছে, নিজের ভাষায় লিখুন", "Describe it in your own words")}</h2>
          <fieldset>
            <legend className="text-[14px] font-semibold text-slate-700">{T("কার জন্য", "Who is it for")}</legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {AGES.map((a) => <button key={a.id} type="button" aria-pressed={age === a.id} onClick={() => setAge(a.id)} className={`kp-chip !min-h-[44px] !text-[14px] ${age === a.id ? "kp-chip-on" : ""}`}>{bn ? a.bn : a.en}</button>)}
            </div>
          </fieldset>
          <div>
            <div role="note" data-testid="assist-999-strip" className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border-2 border-red-300 bg-red-50 px-3 py-2 text-[14.5px] font-semibold leading-snug text-red-900">
              <AlertTriangle size={18} aria-hidden className="shrink-0" />
              <span className="min-w-0 flex-1">{T("বুকে ব্যথা · শ্বাস নিতে পারছে না · অজ্ঞান · মরে যেতে ইচ্ছা করছে → এখনই ৯৯৯", "Chest pain · can't breathe · unconscious · want to die → call 999 now")}</span>
              <a href="tel:999" className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg bg-red-700 px-3 text-white"><Phone size={16} aria-hidden /> {T("৯৯৯-এ কল", "Call 999")}</a>
            </div>
            <label htmlFor="hb-text" className="text-[14px] font-semibold text-slate-700">{T("উপসর্গ", "Symptoms")}</label>
            <div className="mt-1 flex gap-2">
              <textarea id="hb-text" data-testid="symptom-input" value={text} onChange={(e) => setText(e.target.value.slice(0, 1500))} rows={4} disabled={!noneTicked}
                placeholder={T("যেমন: তিন দিন ধরে কাশি আর গলা ব্যথা", "e.g. cough and sore throat for three days")}
                className="min-w-0 flex-1 rounded-xl border border-slate-300 px-3 py-2.5 text-[15px] leading-[1.7]" />
              {speechOk && <button type="button" onClick={toggleMic} disabled={!noneTicked} aria-pressed={listening} aria-label={listening ? T("শোনা বন্ধ", "Stop listening") : T("বলে লিখুন", "Speak")} className="kp-icon-btn !h-12 !w-12 shrink-0">{listening ? <MicOff size={19} aria-hidden /> : <Mic size={19} aria-hidden />}</button>}
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="text-[13.5px] font-semibold text-slate-700">{T("কতদিন ধরে", "Since when")}<input value={since} onChange={(e) => setSince(e.target.value.slice(0, 60))} disabled={!noneTicked} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-[15px]" placeholder={T("যেমন: ৩ দিন", "e.g. 3 days")} /></label>
            <label className="text-[13.5px] font-semibold text-slate-700">{T("এখন যে ওষুধ খান", "Medicines you take")}<input value={meds} onChange={(e) => setMeds(e.target.value.slice(0, 200))} disabled={!noneTicked} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-[15px]" /></label>
            <label className="text-[13.5px] font-semibold text-slate-700">{T("অ্যালার্জি", "Allergies")}<input value={allergies} onChange={(e) => setAllergies(e.target.value.slice(0, 120))} disabled={!noneTicked} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-[15px]" /></label>
          </div>
          <p className="text-[13px] leading-relaxed text-slate-600">{T("ওষুধ ও অ্যালার্জির ঘর শুধু ডাক্তারের নোটে বসে; কোথাও পাঠানো বা সংরক্ষণ হয় না। উপসর্গের লেখা শুধু উত্তর তৈরির জন্য পাঠানো হয়, রাখা হয় না।", "Medicines and allergies only go into your note for the doctor; they are not sent or saved. Symptoms are sent only to make the answer and are not kept.")}{" "}<Link href="/privacy" className="font-semibold text-sky-800 underline underline-offset-2" data-testid="privacy-link">{T("গোপনীয়তা", "Privacy")}</Link></p>
          <button type="button" data-testid="symptom-submit" onClick={submit} disabled={!noneTicked || text.trim().length < 2 || loading} className="kp-btn-primary kp-btn-lg inline-flex items-center gap-2 disabled:opacity-50">
            <Stethoscope size={18} aria-hidden /> {T("কোন ডাক্তার দেখাব?", "Which doctor should I see?")}
          </button>
          {!noneTicked && <p className="text-[13.5px] font-semibold text-red-800">{T("আগে ওপরের তালিকা দেখে নিন।", "First check the list above.")}</p>}
        </div>
        <div>
          <p className="mb-2 text-center text-[14px] font-semibold text-slate-700">{T("কোথায় সমস্যা? ছুঁয়ে বাছুন", "Where? Tap to choose")}</p>
          <BodyMap areas={areas} onToggle={toggleArea} bn={bn} />
        </div>
      </section>

      {loading && (
        <div className="flex items-center gap-4 rounded-2xl border border-sky-200 bg-white p-5" role="status" aria-live="polite">
          <span className="hb-orb shrink-0" aria-hidden />
          <p className="text-[15px] text-slate-700">{T("আপনার কথা মিলিয়ে দেখা হচ্ছে…", "Matching your description…")}</p>
        </div>
      )}
      {err && <p role="status" className="text-[14px] font-semibold text-amber-800">{err}</p>}

      {result?.kind === "specialty" && sp && (
        <section className="hb-card-in space-y-4 rounded-2xl border-2 border-sky-300 bg-white p-5 sm:p-6" data-testid="specialty-result" data-specialty={sp.id} aria-live="polite">
          <p className="kp-eyebrow !font-sans !text-[13px] !leading-[1.4] !tracking-normal !normal-case">{T("যে ধরনের ডাক্তার দেখাতে পারেন", "The kind of doctor to see")}</p>
          <h2 className="text-[clamp(21px,3vw,27px)] font-semibold leading-tight text-slate-900">{bn ? sp.bn : sp.en}</h2>
          <p className="max-w-[62ch] text-[15.5px] leading-relaxed text-slate-700">{bn ? result.whyBn : result.whyEn}</p>
          {result.tellDoctor.length > 0 && (
            <div>
              <p className="text-[14px] font-semibold text-slate-700">{T("ডাক্তারকে যা বলবেন", "Tell the doctor")}</p>
              <ul className="mt-1 space-y-1 text-[15px] text-slate-700">{result.tellDoctor.map((t) => <li key={t}>• {t}</li>)}</ul>
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            <Link href={`/mediscan/doctors?specialty=${sp.id}`} className="kp-btn-primary inline-flex min-h-[48px] items-center gap-2 px-5 text-[15px]">{T("এই ধরনের ডাক্তার খুঁজুন", "Find this kind of doctor")} <ArrowRight size={17} aria-hidden /></Link>
            <button type="button" onClick={copy} className="kp-btn-ghost inline-flex min-h-[48px] items-center gap-2 px-4 text-[15px]"><ClipboardCopy size={17} aria-hidden /> {copied ? T("কপি হয়েছে", "Copied") : T("ডাক্তারের নোট কপি করুন", "Copy note for the doctor")}</button>
          </div>
          {result.alternatives.length > 0 && (
            <p className="text-[14px] text-slate-600">{T("এগুলোও মিলতে পারে: ", "Also possible: ")}{result.alternatives.map((id) => specialtyById(id)).filter(Boolean).map((s) => (bn ? s!.bn : s!.en)).join(" · ")}</p>
          )}
          <details className="rounded-xl bg-slate-50 p-3 text-[13.5px] text-slate-700">
            <summary className="cursor-pointer font-semibold">{T("ডাক্তারের জন্য নোট দেখুন", "See the note for the doctor")}</summary>
            <pre className="mt-2 whitespace-pre-wrap font-sans leading-relaxed">{note}</pre>
          </details>
          <p className="text-[13px] leading-relaxed text-slate-600">
            {T("এটি রোগ নির্ণয় নয় এবং কোনো ওষুধের পরামর্শ নয় — শুধু কোন ধরনের ডাক্তারের কাছে যাবেন তার ধারণা। অবস্থা খারাপ হলে বা নতুন বিপদের লক্ষণ দেখলে সঙ্গে সঙ্গে ৯৯৯।", "This is not a diagnosis and not medicine advice — only an idea of which kind of doctor to see. If things get worse or a danger sign appears, call 999 at once.")}
            {" "}{isOfflineEngine(result.engine)
              ? <span className="rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-[12px] font-semibold text-amber-900" data-testid="offline-label">{T(`${OFFLINE_LABEL.bn} · নিয়ম থেকে`, `${OFFLINE_LABEL.en} · from fixed rules`)}</span>
              : <span className="font-mono text-[12px] text-slate-500" data-testid="assist-engine">({result.engine})</span>}
          </p>
        </section>
      )}

      {/* Plain-language terms, each with its NHS page. */}
      <section aria-labelledby="hb-terms-h" className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
        <h2 id="hb-terms-h" className="flex items-center gap-2 text-[20px] font-extrabold text-slate-900"><BookOpen size={20} className="text-sky-700" aria-hidden /> {T("ডাক্তারি শব্দের সহজ মানে", "Medical words in plain language")}</h2>
        <div className="flex flex-wrap gap-2">
          {MEDICAL_TERMS.map((m) => <button key={m.id} type="button" onClick={() => { setTerm(m); setTermQ(m.names[0]); }} className={`kp-chip !min-h-[44px] !text-[14px] ${term?.id === m.id ? "kp-chip-on" : ""}`}>{(bn ? m.names.find((n) => /[ঀ-৿]/.test(n)) : undefined) ?? m.names[0].toUpperCase()}</button>)}
        </div>
        <form onSubmit={(e) => { e.preventDefault(); setTerm(findTerm(termQ)); }} className="flex gap-2">
          <label htmlFor="hb-term" className="sr-only">{T("শব্দ", "Word")}</label>
          <input id="hb-term" value={termQ} onChange={(e) => setTermQ(e.target.value.slice(0, 80))} placeholder={T("যেমন: ইসিজি", "e.g. ECG")} className="min-w-0 flex-1 rounded-xl border border-slate-300 px-3 py-2.5 text-[15px]" />
          <button type="submit" className="kp-btn-ghost min-h-[48px] px-4 text-[15px]">{T("মানে দেখুন", "Explain")}</button>
        </form>
        {term && (
          <div className="space-y-2 rounded-xl bg-sky-50 p-4">
            <p className="text-[15.5px] leading-relaxed text-slate-800">{bn ? term.bn : term.en}</p>
            <SourceTag confidence="official" label={term.source.label} url={term.source.url} checked={term.source.checked} />
          </div>
        )}
        {term === null && <p className="text-[14px] text-slate-600">{T("এই শব্দটি আমাদের তালিকায় নেই। ডাক্তার বা ১৬২৬৩-এ জিজ্ঞাসা করুন।", "This word isn't in our list. Ask your doctor or call 16263.")}</p>}
      </section>

      <div className="flex flex-wrap gap-2 border-t border-slate-200 pt-3">
        {HEALTH_SOURCES.map((s) => <SourceTag key={s.url} confidence="official" label={s.label} url={s.url} checked={s.checked} />)}
      </div>
    </div>
  );
}
