"use client";
import { useEffect, useMemo, useState } from "react";
import { BadgeCheck, Languages, Search, ShieldQuestion } from "lucide-react";
import { AVAILABILITY_LABEL, SPECIALTIES, TYPE_LABEL, filterDoctors, isRealBookable, specialtyById, type Availability, type ConsultType, type Doctor } from "@/lib/health/doctors";
import { formatTaka } from "@/lib/health/payments";
import { BookingFlow } from "./BookingFlow";
import { DoctorAvatar, TiltCard, T as tr, toneClass, useDoctorAdmin, allDoctors } from "./shared";

const LANG_NAME: Record<string, { bn: string; en: string }> = { bn: { bn: "বাংলা", en: "Bangla" }, en: { bn: "ইংরেজি", en: "English" } };

export function DoctorDirectory() {
  const [lang, setLang] = useState<"bn" | "en">("bn");
  const T = tr(lang);
  const bn = lang === "bn";
  const [admin] = useDoctorAdmin();
  const [q, setQ] = useState("");
  const [specialty, setSpecialty] = useState("any");
  const [maxFee, setMaxFee] = useState<string>("any");
  const [availability, setAvailability] = useState<Availability | "any">("any");
  const [language, setLanguage] = useState("any");
  const [type, setType] = useState<ConsultType | "any">("any");
  const [hospital, setHospital] = useState("");
  const [booking, setBooking] = useState<Doctor | null>(null);
  // Arriving from the "which doctor?" assistant: /mediscan/doctors?specialty=<id> (ids from lib/health/specialty.ts).
  const [askedFor, setAskedFor] = useState<string | null>(null);
  useEffect(() => {
    const want = new URLSearchParams(window.location.search).get("specialty");
    if (!want) return;
    setAskedFor(want);
    if (SPECIALTIES.some((s) => s.id === want)) setSpecialty(want);
  }, []);
  const askedMissing = askedFor !== null && !SPECIALTIES.some((s) => s.id === askedFor);

  const doctors = useMemo(() => allDoctors(admin), [admin]);
  const list = useMemo(() => filterDoctors(doctors, { q, specialtyId: specialty, maxFeePoisha: maxFee === "any" ? null : Number(maxFee) * 100, availability, language, type, hospital }), [doctors, q, specialty, maxFee, availability, language, type, hospital]);
  const select = "min-h-[44px] rounded-xl border border-slate-300 bg-white px-3 text-[14.5px]";

  return (
    <div className="space-y-6">
      <section className="dr-rise rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[13px] font-semibold text-sky-800">{T("ডাক্তার খুঁজুন · ফোন বা ভিডিওতে পরামর্শ", "Find a doctor · consult by phone or video")}</p>
            <h1 className="mt-1 text-[clamp(30px,5vw,46px)] font-semibold leading-[1.08] text-slate-900">{T("ঘরে বসে ", "Care from ")}<em className="kp-em">{T("বিশেষজ্ঞের পরামর্শ", "home")}</em></h1>
            <p className="mt-2 max-w-[62ch] text-[15.5px] leading-relaxed text-slate-700">{T("বিশেষজ্ঞ খুঁজুন, ফি আগেই দেখুন, সময় বেছে নিন। জরুরি অবস্থায় অ্যাপয়েন্টমেন্টের অপেক্ষা করবেন না — এখনই ৯৯৯-এ ফোন করুন বা নিকটস্থ হাসপাতালে যান।", "Find a specialist, see the fee first, pick a time. In an emergency don't wait for an appointment — call 999 or go to the nearest hospital now.")}</p>
          </div>
          <button type="button" onClick={() => setLang(bn ? "en" : "bn")} className="kp-chip !h-10 !rounded-full !text-[13px] font-semibold">{bn ? "EN" : "বাং"}</button>
        </div>
        <p className="mt-4 flex gap-2 rounded-xl border border-amber-300 bg-amber-50 p-3 text-[14px] leading-relaxed text-amber-950">
          <ShieldQuestion size={18} className="mt-0.5 shrink-0" aria-hidden />
          {T("এখন শুধু ডেমো প্রোফাইল আছে — কাল্পনিক ডাক্তার, আসল বুকিং বা পেমেন্ট নয়। বিএমডিসি নিবন্ধন যাচাই করা ডাক্তার যুক্ত হলে তবেই আসল বুকিং খুলবে।", "Only demo profiles for now — fictional doctors, no real booking or payment. Real booking opens only for doctors whose BMDC registration has been checked.")}
        </p>
      </section>

      {askedMissing && (
        <p className="rounded-xl border border-sky-200 bg-sky-50 p-3 text-[14.5px] leading-relaxed text-sky-950" data-testid="specialty-missing">
          {T("এই বিশেষত্বের কোনো ডাক্তার এখানে এখনো নেই। সরকারি হাসপাতালের বহির্বিভাগে দেখাতে পারেন, অথবা স্বাস্থ্য বাতায়ন ১৬২৬৩-এ ফোন করে পরামর্শ নিন।", "No doctor of this specialty is listed here yet. You can visit a government hospital's outpatient department, or call the health line 16263 for advice.")}
        </p>
      )}

      {booking && <BookingFlow doctor={booking} lang={lang} onClose={() => setBooking(null)} />}

      <section aria-label={T("খোঁজ ও ফিল্টার", "Search and filters")} className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5" data-testid="doctor-filter">
        <label className="flex min-h-[48px] items-center gap-2 rounded-xl border border-slate-300 bg-white px-3">
          <Search size={18} className="text-slate-500" aria-hidden />
          <span className="sr-only">{T("নাম বা বিশেষত্ব", "Name or specialty")}</span>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={T("ডাক্তারের নাম বা বিশেষত্ব", "Doctor's name or specialty")} className="min-w-0 flex-1 bg-transparent text-[15px] outline-none" />
        </label>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          <select aria-label={T("বিশেষত্ব", "Specialty")} value={specialty} onChange={(e) => setSpecialty(e.target.value)} className={select}>
            <option value="any">{T("সব বিশেষত্ব", "All specialties")}</option>
            {SPECIALTIES.map((s) => <option key={s.id} value={s.id}>{bn ? s.bn : s.en}</option>)}
          </select>
          <select aria-label={T("সর্বোচ্চ ফি", "Max fee")} value={maxFee} onChange={(e) => setMaxFee(e.target.value)} className={select}>
            <option value="any">{T("যেকোনো ফি", "Any fee")}</option>
            {[500, 600, 800].map((f) => <option key={f} value={f}>{T("সর্বোচ্চ ", "Up to ")}{formatTaka(f * 100, lang)}</option>)}
          </select>
          <select aria-label={T("এখন পাওয়া যাবে কি না", "Availability")} value={availability} onChange={(e) => setAvailability(e.target.value as Availability | "any")} className={select}>
            <option value="any">{T("যেকোনো সময়", "Any availability")}</option>
            {(Object.keys(AVAILABILITY_LABEL) as Availability[]).map((a) => <option key={a} value={a}>{bn ? AVAILABILITY_LABEL[a].bn : AVAILABILITY_LABEL[a].en}</option>)}
          </select>
          <select aria-label={T("পরামর্শের ধরন", "Consultation type")} value={type} onChange={(e) => setType(e.target.value as ConsultType | "any")} className={select}>
            <option value="any">{T("সব ধরন", "All types")}</option>
            {(Object.keys(TYPE_LABEL) as ConsultType[]).map((t) => <option key={t} value={t}>{bn ? TYPE_LABEL[t].bn : TYPE_LABEL[t].en}</option>)}
          </select>
          <select aria-label={T("ভাষা", "Language")} value={language} onChange={(e) => setLanguage(e.target.value)} className={select}>
            <option value="any">{T("যেকোনো ভাষা", "Any language")}</option>
            {Object.entries(LANG_NAME).map(([k, v]) => <option key={k} value={k}>{bn ? v.bn : v.en}</option>)}
          </select>
          <input aria-label={T("হাসপাতাল", "Hospital")} value={hospital} onChange={(e) => setHospital(e.target.value)} placeholder={T("হাসপাতাল", "Hospital")} className={select} />
        </div>
      </section>

      <section aria-label={T("ডাক্তারদের তালিকা", "Doctors")} data-testid="doctor-list">
        {list.length === 0 ? <p className="rounded-2xl border border-slate-200 bg-white p-5 text-[15px] text-slate-600">{T("এই ফিল্টারে কোনো ডাক্তার নেই। ফিল্টার কমিয়ে দেখুন।", "No doctor matches these filters. Try fewer filters.")}</p> : (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {list.map((d, i) => {
              const av = AVAILABILITY_LABEL[d.availability];
              const real = isRealBookable(d);
              return (
                <li key={d.id} className="dr-rise" style={{ animationDelay: `${Math.min(i, 8) * 60}ms` }}>
                  <TiltCard className="flex h-full flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-5" testId="doctor-card">
                    <div className="dr-card-lift flex items-start gap-3">
                      <DoctorAvatar initials={d.initials} availability={d.availability} />
                      <div className="min-w-0">
                        <h3 className="text-[17px] font-bold leading-snug text-slate-900">{bn ? d.nameBn : d.nameEn}</h3>
                        <p className="text-[14px] text-slate-700">{bn ? d.designationBn : d.designationEn}</p>
                        <p className="text-[13px] text-slate-600">{d.qualifications}</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {d.demo
                        ? <span className="inline-flex min-h-[26px] items-center rounded-full border border-amber-300 bg-amber-50 px-2.5 text-[12.5px] font-bold leading-[1.4] text-amber-900">{T("ডেমো প্রোফাইল · কাল্পনিক ডাক্তার", "Demo profile · fictional doctor")}</span>
                        : real ? <span className="inline-flex min-h-[26px] items-center gap-1 rounded-full border border-emerald-300 bg-emerald-50 px-2.5 text-[12.5px] font-bold leading-[1.4] text-emerald-800"><BadgeCheck size={14} aria-hidden /> {T("বিএমডিসি যাচাইকৃত", "BMDC verified")}</span> : null}
                      <span className={`inline-flex min-h-[26px] items-center rounded-full border px-2.5 text-[12.5px] font-semibold leading-[1.4] ${toneClass(av.tone)}`}>{bn ? av.bn : av.en}</span>
                    </div>
                    <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-[13.5px]">
                      <dt className="text-slate-500">{T("বিশেষত্ব", "Specialty")}</dt><dd className="text-slate-800">{bn ? specialtyById(d.specialtyId)?.bn : specialtyById(d.specialtyId)?.en}</dd>
                      <dt className="text-slate-500">{T("হাসপাতাল", "Hospital")}</dt><dd className="text-slate-800">{bn ? d.hospitalBn : d.hospitalEn}</dd>
                      <dt className="text-slate-500">BMDC</dt><dd className="text-slate-800">{d.demo ? T("যাচাই হয়নি (ডেমো)", "not verified (demo)") : d.bmdcNo ? `${d.bmdcNo} · ${d.bmdcCheckedOn}` : T("যাচাই হয়নি", "not verified")}</dd>
                      <dt className="text-slate-500"><Languages size={13} className="inline" aria-hidden /> {T("ভাষা", "Languages")}</dt><dd className="text-slate-800">{d.languages.map((l) => (bn ? LANG_NAME[l]?.bn : LANG_NAME[l]?.en) ?? l).join(", ")}</dd>
                      <dt className="text-slate-500">{T("পরামর্শ", "Consults")}</dt><dd className="text-slate-800">{d.types.map((t) => (bn ? TYPE_LABEL[t].bn : TYPE_LABEL[t].en)).join(", ")}</dd>
                    </dl>
                    <div className="mt-auto flex items-end justify-between gap-2 border-t border-slate-100 pt-3">
                      <div>
                        <p className="font-mono text-[20px] font-bold text-slate-900">{formatTaka(d.feePoisha, lang)}</p>
                        <p className="text-[12.5px] text-slate-600">{T("ফলো-আপ", "Follow-up")} {formatTaka(d.followUpFeePoisha, lang)}{d.demo ? T(" · ডেমো ফি", " · demo fee") : ""}</p>
                      </div>
                      <button type="button" onClick={() => { setBooking(d); window.scrollTo({ top: 0, behavior: "smooth" }); }} className={`${d.demo ? "kp-btn-ghost" : "kp-btn-primary"} inline-flex min-h-[48px] items-center px-4 text-[14.5px]`}>
                        {d.demo ? T("ডেমো বুকিং দেখুন", "Try demo booking") : T("বুক করুন", "Book")}
                      </button>
                    </div>
                  </TiltCard>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <p className="text-[13px] leading-relaxed text-slate-600">{T("রেটিং ও রিভিউ দেখানো হয় না: যাচাইকৃত রোগীর রিভিউ ছাড়া কোনো রেটিং বানানো হয় না। পরামর্শ কখনো রেকর্ড করা হয় না।", "No ratings or reviews are shown: none are made up without verified patients. Consultations are never recorded.")}</p>
    </div>
  );
}
