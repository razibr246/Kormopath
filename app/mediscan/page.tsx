"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Pill, Upload, ShieldAlert, AlertTriangle, CheckCircle2, Printer, Phone, Info, Trash2, Save, HelpCircle, Calculator, Video, CalendarDays, CreditCard, UserRound, BellRing,
} from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import {
  parsePrescriptionText, checkAllPairs, checkPair, detectRedFlags, drugById, comparePrices, unitsForCourse,
  DRUG_REFERENCE, buildSchedule, scheduleToIcs, SLOT_BN, type ParsedLine, type ParsedPrescription, type Slot,
} from "@/lib/prescription";
import { usePersistentState, storageKey, downloadText, todayLocal } from "@/lib/clientStore";

// Fictional examples for trying the reader. Not real patients, doctors or hospitals.
const SAMPLES = [
  {
    id: "a",
    title: "নমুনা ১: জ্বর ও গ্যাস্ট্রিক",
    text: "Rx\nTab. Napa Extra 500mg+65mg 1+0+1 x 3 days p.c.\nCap. Pantonix 20mg 1+0+1 x 5 days a.c.\nAdvice: plenty of fluids",
  },
  {
    id: "b",
    title: "নমুনা ২: অ্যালার্জি ও অ্যাসিডিটি",
    text: "Rx\nTab. Fexo 120mg 0+0+1 x 7 days\nCap. Seclo 20mg 1+0+1 x 14 days a.c.\nTab. Napa 500mg 1+1+1 x 3 days p.c.",
  },
  {
    id: "c",
    title: "নমুনা ৩: অস্পষ্ট লাইন সহ",
    text: "Rx\nTab. Zithrin 500mg 1+0+0 x 3 days\nSyp. Antacid 2 tsp after meal\nTab. Xyzonil 10mg 0+0+1",
  },
];

interface SavedRx {
  id: string;
  label: string;
  savedAt: string;
  text: string;
}

const sanitizeSaved = (raw: unknown): SavedRx[] | null =>
  Array.isArray(raw)
    ? raw.filter((r): r is SavedRx => r && typeof r.id === "string" && typeof r.text === "string" && typeof r.label === "string" && typeof r.savedAt === "string").map((r) => ({ ...r, text: r.text.slice(0, 5000), label: r.label.slice(0, 80) }))
    : null;

const MEAL: Record<string, string> = { before: "খাবারের আগে", after: "খাবারের পরে", with: "খাবারের সাথে" };

// Clearly fictional demo profiles. Replace only with verified provider data and a real booking/payment integration.
const DEMO_DOCTORS = [
  { id: "demo-1", name: "ডা. সায়মা রহমান", specialty: "মেডিসিন বিশেষজ্ঞ", experience: "১০ বছরের অভিজ্ঞতা (ডেমো)", fee: 500 },
  { id: "demo-2", name: "ডা. আরিফুল ইসলাম", specialty: "শিশু স্বাস্থ্য", experience: "৮ বছরের অভিজ্ঞতা (ডেমো)", fee: 600 },
  { id: "demo-3", name: "ডা. নুসরাত জাহান", specialty: "চর্ম ও অ্যালার্জি", experience: "৬ বছরের অভিজ্ঞতা (ডেমো)", fee: 550 },
];

export default function MediScanPage() {
  const [text, setText] = useState("");
  const [symptoms, setSymptoms] = useState("");
  const [consent, setConsent] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [saved, setSaved] = usePersistentState<SavedRx[]>(storageKey("mediscan", "savedPrescriptions"), [], sanitizeSaved);
  const [saveLabel, setSaveLabel] = useState("");
  const [pairA, setPairA] = useState("azithromycin");
  const [pairB, setPairB] = useState("antacid-almg");
  const [doctorId, setDoctorId] = useState(DEMO_DOCTORS[0].id);
  const [consultationType, setConsultationType] = useState<"phone" | "video">("phone");
  const [appointmentSlot, setAppointmentSlot] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("bkash");
  const [demoBooking, setDemoBooking] = useState(false);
  const selectedDoctor = DEMO_DOCTORS.find((doctor) => doctor.id === doctorId) ?? DEMO_DOCTORS[0];

  const parsed = useMemo(() => parsePrescriptionText(text), [text]);
  const redFlags = useMemo(() => detectRedFlags(`${text}\n${symptoms}`), [text, symptoms]);
  const recognisedIds = parsed.lines.map((l) => l.drugId).filter((x): x is string => !!x);
  const findings = useMemo(() => checkAllPairs(recognisedIds), [recognisedIds.join(",")]); // eslint-disable-line react-hooks/exhaustive-deps
  const manualPair = checkPair(pairA, pairB);

  const handleUpload = async (file: File) => {
    setUploadMsg(null);
    if (!consent) {
      setUploadMsg({ kind: "error", text: "ছবি পাঠানোর আগে নিচের সম্মতি বক্সে টিক দিন।" });
      return;
    }
    if (!["image/jpeg", "image/png", "image/webp", "application/pdf"].includes(file.type)) {
      setUploadMsg({ kind: "error", text: "শুধু JPG, PNG, WEBP বা PDF ফাইল দেওয়া যাবে।" });
      return;
    }
    if (file.size > 4 * 1024 * 1024) {
      setUploadMsg({ kind: "error", text: "ফাইল ৪ MB-এর বেশি। ছোট বা কম রেজোলিউশনের ছবি দিন।" });
      return;
    }
    setUploading(true);
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(String(r.result).split(",")[1] ?? "");
        r.onerror = () => reject(new Error("read failed"));
        r.readAsDataURL(file);
      });
      const res = await fetch("/api/mediscan/ocr", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ consent: true, file: { mimeType: file.type, base64 } }),
      });
      const data = (await res.json().catch(() => ({}))) as { text?: string; legible?: boolean; error?: string };
      if (!res.ok || typeof data.text !== "string") {
        setUploadMsg({ kind: "error", text: data.error ?? "ছবি পড়া যায়নি। লেখা টাইপ করে দিন।" });
      } else if (!data.legible) {
        setUploadMsg({ kind: "error", text: "ছবিতে পড়ার মতো প্রেসক্রিপশন পাওয়া যায়নি। আরও পরিষ্কার ছবি দিন বা টাইপ করুন।" });
      } else {
        setText(data.text);
        setUploadMsg({ kind: "ok", text: "ছবি থেকে লেখা বের করা হয়েছে। এটি স্বয়ংক্রিয় পাঠ — ভুল থাকতে পারে। মূল প্রেসক্রিপশনের সাথে মিলিয়ে নিচের বক্সে ঠিক করে নিন।" });
      }
    } catch {
      setUploadMsg({ kind: "error", text: "নেটওয়ার্ক সমস্যা। লেখা টাইপ করে দিন — সেটি সম্পূর্ণ এই ডিভাইসেই কাজ করে।" });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f6f9fb] text-slate-900 antialiased">
      <AppHeader taglineEn="Understand your prescription safely"
        appId="mediscan"
        href="/mediscan"
        name="MediScan BD"
        taglineBn="প্রেসক্রিপশন বুঝতে সহায়তা · রোগ নির্ণয় নয়"
        icon={<Pill size={22} />}
        accent="from-sky-600 to-cyan-700"
      />

      {/* Always-visible emergency strip */}
      <div className="border-b border-red-200 bg-red-50 print:hidden">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-4 gap-y-1 px-4 py-2 text-[13px] text-red-900 sm:px-6">
          <span className="inline-flex items-center gap-1.5 font-bold"><Phone size={14} aria-hidden /> জরুরি অবস্থায়: <a href="tel:999" className="underline">999</a> (জাতীয় জরুরি সেবা — অ্যাম্বুলেন্স, পুলিশ, ফায়ার)</span>
          <span>স্বাস্থ্য পরামর্শ: <a href="tel:16263" className="font-semibold underline">16263</a> (স্বাস্থ্য বাতায়ন)</span>
        </div>
      </div>

      <main id="main" className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6">
        <section className="rounded-2xl border border-sky-100 bg-white p-5">
          <h1 className="text-[26px] font-extrabold leading-tight tracking-tight sm:text-[32px]">ডাক্তারের প্রেসক্রিপশন সহজ বাংলায় বুঝে নিন</h1>
          <p className="mt-2 max-w-3xl text-[15px] leading-relaxed text-slate-600">
            প্রেসক্রিপশনে যা লেখা আছে — কোন ওষুধ, দিনে কয়বার, কতদিন, খাবারের আগে না পরে — তা পরিষ্কার করে দেখায়। যা লেখা নেই বা আমরা চিনি না, তা স্পষ্ট করে জানায়। এটি ডাক্তার বা ফার্মাসিস্টের বিকল্প নয়; ডোজ বা ওষুধ নিজে থেকে বদলাবেন না।
          </p>
        </section>

        <section aria-labelledby="appointment-title" className="rounded-2xl border border-violet-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 id="appointment-title" className="flex items-center gap-2 text-[20px] font-extrabold"><CalendarDays size={21} className="text-violet-700" aria-hidden /> ডাক্তারের সাথে পরামর্শ বুক করুন</h2>
              <p className="mt-1 text-[13px] text-slate-600">ডেমো ডাক্তার বেছে ফোন বা ভিডিও পরামর্শের নমুনা বুকিং করুন।</p>
            </div>
            <span className="rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-[11px] font-bold text-amber-900">ডেমো · বাস্তব চিকিৎসক নন</span>
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div className="space-y-3">
              <label className="block text-[13px] font-bold">ডাক্তার বেছে নিন
                <select value={doctorId} onChange={(event) => { setDoctorId(event.target.value); setDemoBooking(false); }} className="mt-1 block w-full rounded-xl border border-slate-200 bg-white px-3 py-2 font-normal">
                  {DEMO_DOCTORS.map((doctor) => <option key={doctor.id} value={doctor.id}>{doctor.name} · {doctor.specialty}</option>)}
                </select>
              </label>
              <div className="flex items-center gap-3 rounded-xl bg-violet-50 p-3">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-violet-100 text-violet-800"><UserRound size={22} aria-hidden /></span>
                <div className="min-w-0 text-[13px]"><strong className="block">{selectedDoctor.name}</strong><span className="text-slate-600">{selectedDoctor.specialty} · {selectedDoctor.experience}</span></div>
              </div>
              <fieldset>
                <legend className="mb-1.5 text-[13px] font-bold">পরামর্শের ধরন</legend>
                <div className="flex flex-wrap gap-2">
                  <button type="button" aria-pressed={consultationType === "phone"} onClick={() => { setConsultationType("phone"); setDemoBooking(false); }} className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-[13px] font-bold ${consultationType === "phone" ? "border-violet-600 bg-violet-50 text-violet-900" : "border-slate-200"}`}><Phone size={16} aria-hidden /> ফোন কল</button>
                  <button type="button" aria-pressed={consultationType === "video"} onClick={() => { setConsultationType("video"); setDemoBooking(false); }} className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-[13px] font-bold ${consultationType === "video" ? "border-violet-600 bg-violet-50 text-violet-900" : "border-slate-200"}`}><Video size={16} aria-hidden /> ভিডিও কল</button>
                </div>
              </fieldset>
            </div>
            <div className="space-y-3">
              <label className="block text-[13px] font-bold">সময় বেছে নিন
                <select value={appointmentSlot} onChange={(event) => { setAppointmentSlot(event.target.value); setDemoBooking(false); }} className="mt-1 block w-full rounded-xl border border-slate-200 bg-white px-3 py-2 font-normal">
                  <option value="">একটি সময় বেছে নিন</option>
                  <option value="আজ, সন্ধ্যা ৭:০০">আজ, সন্ধ্যা ৭:০০</option>
                  <option value="আগামীকাল, সকাল ১০:৩০">আগামীকাল, সকাল ১০:৩০</option>
                  <option value="আগামীকাল, বিকেল ৪:০০">আগামীকাল, বিকেল ৪:০০</option>
                </select>
              </label>
              <label className="block text-[13px] font-bold">ডেমো পেমেন্ট পদ্ধতি
                <select value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)} className="mt-1 block w-full rounded-xl border border-slate-200 bg-white px-3 py-2 font-normal">
                  <option value="bkash">বিকাশ (নমুনা)</option><option value="nagad">নগদ (নমুনা)</option><option value="card">কার্ড (নমুনা)</option>
                </select>
              </label>
              <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-3 text-[14px]"><span className="inline-flex items-center gap-2 text-slate-700"><CreditCard size={17} aria-hidden /> পরামর্শ ফি</span><strong>৳{selectedDoctor.fee}</strong></div>
              <button type="button" disabled={!appointmentSlot} onClick={() => setDemoBooking(true)} className="w-full rounded-xl bg-violet-700 px-4 py-3 text-[14px] font-bold text-white hover:bg-violet-800 disabled:cursor-not-allowed disabled:opacity-40">বুকিং ও ডেমো পেমেন্ট নিশ্চিত করুন</button>
            </div>
          </div>
          {demoBooking && <div role="status" className="mt-4 rounded-xl border border-emerald-300 bg-emerald-50 p-4 text-[13px] text-emerald-950"><strong className="block">নমুনা অ্যাপয়েন্টমেন্ট তৈরি হয়েছে</strong><span>{selectedDoctor.name} · {consultationType === "phone" ? "ফোন কল" : "ভিডিও কল"} · {appointmentSlot} · ৳{selectedDoctor.fee} ({paymentMethod === "bkash" ? "বিকাশ" : paymentMethod === "nagad" ? "নগদ" : "কার্ড"})</span><p className="mt-1">এটি শুধু ডেমো: কোনো টাকা কাটা হয়নি, বুকিং ডাক্তারকে পাঠানো হয়নি, এবং কল/ভিডিও সংযোগ চালু নেই।</p></div>}
          <p className="mt-3 text-[11px] leading-relaxed text-slate-500">ডাক্তারদের নাম, সময় ও ফি কাল্পনিক। এই নমুনায় কোনো পেমেন্ট নেওয়া, চিকিৎসকের সাথে সংযোগ বা প্রকৃত অ্যাপয়েন্টমেন্ট তৈরি হয় না।</p>
        </section>

        {redFlags.length > 0 && (
          <section role="alert" className="rounded-2xl border-2 border-red-500 bg-red-50 p-5">
            <h2 className="flex items-center gap-2 text-[18px] font-extrabold text-red-800"><ShieldAlert size={22} aria-hidden /> এখনই চিকিৎসা নিন</h2>
            <ul className="mt-2 space-y-1 text-[14px] text-red-900">
              {redFlags.map((f) => <li key={f.id}>• {f.messageBn} <span className="text-red-700/80">(“{f.matched}”)</span></li>)}
            </ul>
            <div className="mt-3 flex flex-wrap gap-2">
              <a href="tel:999" className="inline-flex items-center gap-1.5 rounded-xl bg-red-600 px-4 py-2.5 text-[15px] font-bold text-white"><Phone size={16} aria-hidden /> 999-এ কল করুন</a>
              <span className="self-center text-[13px] text-red-900">অথবা নিকটস্থ হাসপাতালের জরুরি বিভাগে যান। এই অ্যাপের উত্তরের জন্য অপেক্ষা করবেন না।</span>
            </div>
          </section>
        )}

        <div className="grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
          {/* Input */}
          <section aria-labelledby="in-h" className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
            <h2 id="in-h" className="text-[17px] font-bold">১. প্রেসক্রিপশনের লেখা দিন</h2>
            <label htmlFor="rx" className="sr-only">প্রেসক্রিপশনের লেখা</label>
            <textarea
              id="rx"
              rows={8}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={"প্রতিটি ওষুধ আলাদা লাইনে লিখুন, যেমন:\nTab. Napa Extra 500mg 1+0+1 x 3 days p.c."}
              className="w-full rounded-xl border border-slate-200 p-3 font-mono text-[13px] leading-relaxed outline-none focus:border-sky-600"
            />
            <div>
              <span className="mb-1.5 block text-[11px] font-bold uppercase text-slate-400">কাল্পনিক নমুনা দিয়ে চেষ্টা করুন</span>
              <div className="flex flex-wrap gap-1.5">
                {SAMPLES.map((s) => (
                  <button key={s.id} onClick={() => setText(s.text)} className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-[12px] font-medium text-slate-700 hover:border-sky-500">{s.title}</button>
                ))}
                {text && <button onClick={() => setText("")} className="rounded-lg px-2.5 py-1 text-[12px] text-slate-500 underline">মুছুন</button>}
              </div>
            </div>

            <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
              <span className="block text-[13px] font-bold">ছবি থেকে লেখা বের করুন (ঐচ্ছিক)</span>
              <label className="flex items-start gap-2 text-[12px] leading-relaxed text-slate-700">
                <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5 h-4 w-4 accent-sky-600" />
                <span>
                  আমি বুঝেছি: ছবিটি লেখা পড়ার জন্য আমাদের সার্ভার হয়ে Google Gemini-তে পাঠানো হবে। আমরা ছবি বা লেখা সংরক্ষণ করি না। স্বাস্থ্য তথ্য সংবেদনশীল — রোগীর নাম/ফোন নম্বর ঢেকে ছবি তোলা ভালো। পাঠ ভুল হতে পারে, তাই আমি নিজে মিলিয়ে দেখব।
                </span>
              </label>
              <label className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-[13px] font-bold ${consent && !uploading ? "cursor-pointer bg-sky-600 text-white hover:bg-sky-700" : "cursor-not-allowed bg-slate-200 text-slate-500"}`}>
                <Upload size={15} aria-hidden /> {uploading ? "পড়া হচ্ছে…" : "ছবি / PDF বেছে নিন"}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,application/pdf"
                  className="sr-only"
                  disabled={!consent || uploading}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void handleUpload(f);
                    e.target.value = "";
                  }}
                />
              </label>
              {uploadMsg && (
                <p role={uploadMsg.kind === "error" ? "alert" : "status"} className={`text-[12px] ${uploadMsg.kind === "error" ? "text-red-700" : "text-emerald-800"}`}>{uploadMsg.text}</p>
              )}
            </div>

            <div>
              <label htmlFor="sym" className="text-[13px] font-bold">এখন কোনো উপসর্গ আছে? (ঐচ্ছিক)</label>
              <input id="sym" value={symptoms} onChange={(e) => setSymptoms(e.target.value)} placeholder="যেমন: জ্বর, মাথাব্যথা, শ্বাসকষ্ট…" className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-[13px] outline-none focus:border-sky-600" />
              <p className="mt-1 text-[11px] text-slate-500">শুধু জরুরি লক্ষণ চিনতে ব্যবহার হয়। আমরা রোগ নির্ণয় করি না।</p>
            </div>
          </section>

          {/* Results */}
          <section aria-labelledby="out-h" className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 id="out-h" className="text-[17px] font-bold">২. যা লেখা আছে</h2>
              {parsed.lines.length > 0 && (
                <button onClick={() => window.print()} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[12px] font-bold text-slate-700 print:hidden"><Printer size={14} aria-hidden /> প্রিন্ট করুন</button>
              )}
            </div>

            {parsed.lines.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-[14px] text-slate-500">
                {text.trim() ? "কোনো ওষুধের লাইন পাওয়া যায়নি। প্রতিটি ওষুধ আলাদা লাইনে Tab./Cap./Syp. দিয়ে লিখে দেখুন।" : "বাঁ দিকে প্রেসক্রিপশনের লেখা দিলে এখানে সহজ ভাষায় দেখাবে।"}
              </div>
            ) : (
              <>
                <p className="text-[13px] text-slate-600">
                  {parsed.lines.length}টি ওষুধের লাইন পাওয়া গেছে; {parsed.recognisedCount}টি আমাদের তালিকায় আছে
                  {parsed.unrecognisedCount > 0 && <>, <strong className="text-amber-800">{parsed.unrecognisedCount}টি চিনতে পারিনি</strong></>}।
                </p>
                <div className="grid gap-4 md:grid-cols-2">
                  {parsed.lines.map((l, i) => <MedicineCard key={i} line={l} />)}
                </div>
              </>
            )}

            {findings.length > 0 && (
              <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4">
                <h3 className="flex items-center gap-2 text-[15px] font-bold text-amber-900"><AlertTriangle size={18} aria-hidden /> ফার্মাসিস্ট বা ডাক্তারকে জিজ্ঞেস করুন</h3>
                <ul className="mt-2 space-y-2 text-[13px] text-amber-950">
                  {findings.map((f, i) => (
                    <li key={i}>
                      <strong>{f.titleBn}</strong> — {drugById(f.drugIds[0])?.genericName}{f.drugIds[0] !== f.drugIds[1] ? ` ও ${drugById(f.drugIds[1])?.genericName}` : ""}
                      <span className="block text-amber-900/90">{f.adviceBn}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {parsed.recognisedCount > 1 && findings.length === 0 && (
              <p className="rounded-xl border border-slate-200 bg-white p-3 text-[12px] text-slate-600">
                <Info size={14} className="mr-1 inline" aria-hidden />
                আমাদের ছোট তালিকায় এই ওষুধগুলোর মধ্যে কোনো পরিচিত সমস্যা পাওয়া যায়নি। <strong>এর মানে এই নয় যে একসাথে খাওয়া নিরাপদ</strong> — আপনার অন্য অসুখ বা অন্য ওষুধ থাকলে ফার্মাসিস্টকে জানান।
              </p>
            )}
          </section>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <PriceCompare lines={parsed.lines} />
          <ReminderPanel parsed={parsed} />

          <section aria-labelledby="pair-h" className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5">
            <h2 id="pair-h" className="flex items-center gap-1.5 text-[16px] font-bold"><HelpCircle size={17} aria-hidden /> দুটি ওষুধ একসাথে?</h2>
            <p className="text-[12px] text-slate-500">আমাদের ছোট রেফারেন্স তালিকা থেকে দুটি ওষুধ মিলিয়ে দেখুন।</p>
            {(["A", "B"] as const).map((k) => (
              <label key={k} className="block text-[12px] font-bold text-slate-600">
                {k === "A" ? "প্রথম ওষুধ" : "দ্বিতীয় ওষুধ"}
                <select value={k === "A" ? pairA : pairB} onChange={(e) => (k === "A" ? setPairA : setPairB)(e.target.value)} className="mt-1 block w-full rounded-lg border border-slate-200 bg-white px-2 py-2 text-[13px] font-normal">
                  {DRUG_REFERENCE.map((d) => <option key={d.id} value={d.id}>{d.genericName}</option>)}
                </select>
              </label>
            ))}
            <div className={`rounded-xl border p-3 text-[13px] ${manualPair.level === "no-data" ? "border-slate-200 bg-slate-50" : "border-amber-300 bg-amber-50"}`}>
              <strong className="block">{manualPair.titleBn}</strong>
              <span className="text-slate-700">{manualPair.adviceBn}</span>
            </div>
          </section>

          <section aria-labelledby="save-h" className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5 print:hidden">
            <h2 id="save-h" className="flex items-center gap-1.5 text-[16px] font-bold"><Save size={17} aria-hidden /> এই ডিভাইসে সংরক্ষণ (ঐচ্ছিক)</h2>
            <p className="text-[12px] text-slate-500">শুধু এই ব্রাউজারে থাকে, কোথাও পাঠানো হয় না। শেয়ার করা ফোনে সংরক্ষণ করবেন না।</p>
            <div className="flex gap-2">
              <label htmlFor="lbl" className="sr-only">নাম</label>
              <input id="lbl" value={saveLabel} maxLength={80} onChange={(e) => setSaveLabel(e.target.value)} placeholder="যেমন: মায়ের প্রেসক্রিপশন, নভেম্বর" className="flex-1 rounded-lg border border-slate-200 px-2 py-1.5 text-[13px]" />
              <button
                disabled={!text.trim()}
                onClick={() => {
                  setSaved((p) => [{ id: Math.random().toString(36).slice(2), label: saveLabel.trim() || "প্রেসক্রিপশন", savedAt: new Date().toISOString(), text: text.slice(0, 5000) }, ...p].slice(0, 30));
                  setSaveLabel("");
                }}
                className="rounded-lg bg-sky-600 px-3 py-1.5 text-[13px] font-bold text-white disabled:opacity-40"
              >
                সংরক্ষণ
              </button>
            </div>
            {saved.length > 0 && (
              <>
                <ul className="divide-y divide-slate-100 text-[13px]">
                  {saved.map((s) => (
                    <li key={s.id} className="flex items-center justify-between gap-2 py-2">
                      <button onClick={() => setText(s.text)} className="min-w-0 text-left hover:underline">
                        <span className="block truncate font-semibold">{s.label}</span>
                        <span className="text-[11px] text-slate-400">{new Date(s.savedAt).toLocaleDateString("en-GB")}</span>
                      </button>
                      <button onClick={() => setSaved((p) => p.filter((x) => x.id !== s.id))} aria-label={`${s.label} মুছুন`} className="p-1 text-slate-400 hover:text-red-600"><Trash2 size={15} /></button>
                    </li>
                  ))}
                </ul>
                <button onClick={() => { if (window.confirm("সব সংরক্ষিত প্রেসক্রিপশন মুছে ফেলবেন?")) setSaved([]); }} className="text-[12px] font-semibold text-red-700 underline">সব মুছে ফেলুন</button>
              </>
            )}
          </section>
        </div>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 text-[12px] leading-relaxed text-slate-600">
          <h2 className="mb-1 text-[14px] font-bold text-slate-800">সীমাবদ্ধতা ও উৎস</h2>
          <ul className="list-disc space-y-1 pl-5">
            <li>এটি সাধারণ তথ্য, চিকিৎসা পরামর্শ নয়। রোগ নির্ণয় করে না, ডোজ বা ওষুধ ঠিক করে দেয় না।</li>
            <li>ওষুধের তালিকা ছোট ({DRUG_REFERENCE.length}টি জেনেরিক) এবং ২০২৬-১১-০৫ তারিখে পর্যালোচিত। ব্র্যান্ডের নাম শুধু চেনার জন্য; দাম ও ব্র্যান্ড DGDA-র Drug Verification অ্যাপ বা ফার্মাসিস্টের কাছে যাচাই করুন।</li>
            <li>ব্র্যান্ড বদলাতে চাইলে (একই জেনেরিক ও স্ট্রেংথ) ডাক্তার বা ফার্মাসিস্টের সাথে কথা বলুন।</li>
            <li>স্বাস্থ্য বাতায়ন 16263 সেবা অর্থায়ন সংকটে আছে বলে খবর প্রকাশিত হয়েছে; না পেলে নিকটস্থ সরকারি হাসপাতালে যোগাযোগ করুন।</li>
          </ul>
          <p className="mt-2"><Link href="/settings" className="font-semibold text-sky-700 underline">সংরক্ষিত ডেটা দেখুন বা মুছুন</Link></p>
        </section>
      </main>
    </div>
  );
}

function MedicineCard({ line }: { line: ParsedLine }) {
  const d = line.drugId ? drugById(line.drugId) : undefined;
  return (
    <article className={`space-y-3 rounded-2xl border bg-white p-4 ${d ? "border-slate-200" : "border-amber-300"}`}>
      <div>
        <span className="block font-mono text-[12px] text-slate-500">{line.raw}</span>
        {d ? (
          <h3 className="mt-1 text-[16px] font-bold">{d.genericName}{line.strength ? ` · ${line.strength}` : ""}</h3>
        ) : (
          <h3 className="mt-1 flex items-center gap-1.5 text-[15px] font-bold text-amber-800"><AlertTriangle size={16} aria-hidden /> এই ওষুধ চিনতে পারিনি</h3>
        )}
        {d && <p className="text-[13px] text-slate-600">{d.whatItIsForBn}</p>}
      </div>
      <dl className="grid grid-cols-3 gap-2 text-[12px]">
        <div className="rounded-lg bg-slate-50 p-2">
          <dt className="font-bold text-slate-400">কয়বার</dt>
          <dd className="font-semibold text-slate-900">
            {line.dose ? line.dose.readingBn : line.timesPerDay ? `দিনে ${line.timesPerDay.toLocaleString("bn-BD")} বার` : <span className="text-amber-700">লেখা নেই</span>}
            {line.measure && <span className="block text-[11px] font-normal text-slate-600">প্রতিবার {line.measure.readingBn}</span>}
          </dd>
        </div>
        <div className="rounded-lg bg-slate-50 p-2">
          <dt className="font-bold text-slate-400">কতদিন</dt>
          <dd className="font-semibold text-slate-900">{line.durationText ?? <span className="text-amber-700">লেখা নেই</span>}</dd>
        </div>
        <div className="rounded-lg bg-slate-50 p-2">
          <dt className="font-bold text-slate-400">খাবার</dt>
          <dd className="font-semibold text-slate-900">{line.mealTiming ? MEAL[line.mealTiming] : <span className="text-slate-500">লেখা নেই</span>}</dd>
        </div>
      </dl>
      {d && <p className="rounded-lg bg-sky-50 p-2 text-[12px] text-sky-950">{d.generalNotesBn}</p>}
      {line.missing.length > 0 && (
        <ul className="space-y-0.5 text-[12px] text-amber-800">
          {line.missing.map((m) => <li key={m}>• {m}</li>)}
        </ul>
      )}
      {!line.missing.length && (
        <p className="flex items-center gap-1 text-[12px] text-emerald-700"><CheckCircle2 size={14} aria-hidden /> ডোজ ও সময়কাল দুটোই লেখা আছে।</p>
      )}
    </article>
  );
}

function PriceCompare({ lines }: { lines: ParsedLine[] }) {
  const usable = lines.filter((l) => l.drugId);
  const [idx, setIdx] = useState(0);
  const [quotes, setQuotes] = useState([{ label: "", price: "" }, { label: "", price: "" }]);
  const line = usable[Math.min(idx, usable.length - 1)];
  const units = line ? unitsForCourse(line.dose, line.durationText) : null;
  const [manualUnits, setManualUnits] = useState("");
  const unitsUsed = units ?? (Number(manualUnits) || 0);
  const result = comparePrices(quotes.map((q) => ({ label: q.label, pricePerUnit: Number(q.price) })), unitsUsed);

  return (
    <section aria-labelledby="price-h" className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5 print:hidden">
      <h2 id="price-h" className="flex items-center gap-1.5 text-[16px] font-bold"><Calculator size={17} aria-hidden /> দাম তুলনা</h2>
      <p className="text-[12px] text-slate-500">একই জেনেরিক ও স্ট্রেংথের যে ব্র্যান্ড/ফার্মেসির দাম আপনাকে বলা হয়েছে তা লিখুন। আমরা নিজে কোনো দাম দেখাই না।</p>
      {usable.length === 0 ? (
        <p className="text-[12px] text-slate-400">প্রথমে প্রেসক্রিপশনের লেখা দিন।</p>
      ) : (
        <>
          <select value={idx} onChange={(e) => setIdx(Number(e.target.value))} className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[13px]" aria-label="ওষুধ">
            {usable.map((l, i) => <option key={i} value={i}>{drugById(l.drugId!)?.genericName} {l.strength ?? ""}</option>)}
          </select>
          {units ? (
            <p className="text-[12px] text-slate-600">প্রেসক্রিপশন অনুযায়ী মোট দরকার: <strong>{units}টি</strong></p>
          ) : (
            <label className="block text-[12px] text-slate-600">ডোজ/সময়কাল লেখা নেই — কয়টি কিনবেন?
              <input inputMode="numeric" value={manualUnits} onChange={(e) => setManualUnits(e.target.value.replace(/\D/g, ""))} className="mt-1 block w-24 rounded border border-slate-200 px-2 py-1" />
            </label>
          )}
          {quotes.map((q, i) => (
            <div key={i} className="flex gap-2">
              <input aria-label={`ব্র্যান্ড বা ফার্মেসি ${i + 1}`} value={q.label} onChange={(e) => setQuotes(quotes.map((x, j) => (j === i ? { ...x, label: e.target.value.slice(0, 40) } : x)))} placeholder={`ব্র্যান্ড/ফার্মেসি ${i + 1}`} className="min-w-0 flex-1 rounded-lg border border-slate-200 px-2 py-1.5 text-[13px]" />
              <input aria-label={`প্রতি পিস দাম ${i + 1}`} inputMode="decimal" value={q.price} onChange={(e) => setQuotes(quotes.map((x, j) => (j === i ? { ...x, price: e.target.value.replace(/[^0-9.]/g, "") } : x)))} placeholder="৳/পিস" className="w-20 rounded-lg border border-slate-200 px-2 py-1.5 text-[13px]" />
            </div>
          ))}
          {quotes.length < 5 && <button onClick={() => setQuotes([...quotes, { label: "", price: "" }])} className="text-[12px] font-semibold text-sky-700">+ আরেকটি দাম</button>}
          {result && (
            <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-3 text-[13px] text-emerald-950">
              <strong>{result.cheapest.label}</strong> নিলে পুরো কোর্সে ৳{result.courseCostCheapest} — <strong>{result.dearest.label}</strong>-এর চেয়ে ৳{result.savingBdt} ({result.savingPct}%) কম।
              <span className="mt-1 block text-[11px] text-emerald-900">আপনার দেওয়া দামের ভিত্তিতে হিসাব। ব্র্যান্ড বদলানোর আগে ফার্মাসিস্টকে নিশ্চিত করুন যে জেনেরিক ও স্ট্রেংথ একই।</span>
            </div>
          )}
        </>
      )}
    </section>
  );
}

const sanitizeTimes = (raw: unknown): Record<Slot, string> | null => {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const ok = (v: unknown) => typeof v === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(v);
  return ok(r.morning) && ok(r.noon) && ok(r.night) ? { morning: r.morning as string, noon: r.noon as string, night: r.night as string } : null;
};

/** Daily medicine timetable from X+X+X doses, exportable as phone-calendar reminders. */
function ReminderPanel({ parsed }: { parsed: ParsedPrescription }) {
  // Only the user's preferred times are remembered; the medicines themselves are not saved here.
  const [times, setTimes] = usePersistentState<Record<Slot, string>>(storageKey("mediscan", "reminderTimes"), { morning: "08:00", noon: "14:00", night: "21:00" }, sanitizeTimes);
  const { entries, unscheduled } = useMemo(() => buildSchedule(parsed), [parsed]);
  if (!entries.length && !unscheduled.length) return null;
  const slots: Slot[] = ["morning", "noon", "night"];
  return (
    <section aria-labelledby="rem-h" className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5 print:break-inside-avoid">
      <h2 id="rem-h" className="flex items-center gap-1.5 text-[16px] font-bold"><BellRing size={17} aria-hidden /> দৈনিক সময়সূচি ও রিমাইন্ডার</h2>
      <p className="text-[12px] text-slate-600">প্রেসক্রিপশনে লেখা ১+০+১ ধরনের ডোজ থেকে তৈরি। সময় নিজের মতো ঠিক করে ফোনের ক্যালেন্ডারে রিমাইন্ডার যোগ করুন।</p>
      <div className="grid gap-3 sm:grid-cols-3">
        {slots.map((slot) => {
          const items = entries.filter((e) => e.slot === slot);
          return (
            <div key={slot} className="rounded-xl bg-slate-50 p-3" data-testid={`slot-${slot}`}>
              <label className="flex items-center justify-between gap-2 text-[13px] font-bold">{SLOT_BN[slot]}
                <input type="time" value={times[slot]} onChange={(e) => e.target.value && setTimes((t) => ({ ...t, [slot]: e.target.value }))} className="rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[12px] font-normal" />
              </label>
              {items.length ? (
                <ul className="mt-2 space-y-1 text-[12px]">
                  {items.map((e) => <li key={`${e.lineIndex}-${slot}`}>• {e.label} — <strong>{e.amountBn}</strong>{e.mealTiming ? ` (${MEAL[e.mealTiming]})` : ""}</li>)}
                </ul>
              ) : <p className="mt-2 text-[11px] text-slate-400">কিছু নেই</p>}
            </div>
          );
        })}
      </div>
      {unscheduled.length > 0 && (
        <p className="rounded-lg bg-amber-50 p-2 text-[12px] text-amber-900">
          {unscheduled.map((i) => parsed.lines[i].matchedAlias ?? parsed.lines[i].raw.slice(0, 30)).join(", ")}: দিনে কতবার লেখা আছে, কিন্তু কোন সময়ে তা লেখা নেই — সময় ফার্মাসিস্ট বা ডাক্তারের কাছে জেনে নিন। এগুলো রিমাইন্ডারে যোগ হয়নি।
        </p>
      )}
      {entries.length > 0 && (
        <button
          onClick={() => downloadText("mediscan-reminders.ics", scheduleToIcs(entries, times, todayLocal(), { stamp: new Date().toISOString().replace(/[-:]/g, "").slice(0, 15) + "Z" }), "text/calendar;charset=utf-8")}
          className="inline-flex items-center gap-1.5 rounded-lg bg-sky-700 px-3 py-2 text-[13px] font-bold text-white hover:bg-sky-800"
        >
          <CalendarDays size={15} aria-hidden /> ক্যালেন্ডার রিমাইন্ডার (.ics) ডাউনলোড
        </button>
      )}
      <p className="text-[11px] text-slate-500">রিমাইন্ডার ফাইল আপনার ডিভাইসেই তৈরি হয়, কোথাও পাঠানো হয় না। কোর্সের দৈর্ঘ্য লেখা না থাকলে ৩০ দিনের রিমাইন্ডার হয় — ডাক্তার যেমন বলেন তেমনই চালিয়ে যান বা বন্ধ করুন।</p>
    </section>
  );
}
