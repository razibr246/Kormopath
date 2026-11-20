"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Bot,
  ClipboardList,
  Phone,
  Scale,
  ScrollText,
  Handshake,
  ShieldCheck,
  Building2,
  CheckCircle2,
  Sparkles,
  PhoneCall,
  Gavel,
  BookOpen,
} from "lucide-react";
import { SourceTag } from "@/components/layout/AppHeader";
import { EligibilityCard } from "@/components/apps/legal/EligibilityCard";
import { DistrictFinder } from "@/components/apps/legal/DistrictFinder";
import { LegalProblemDiagnoser } from "@/components/apps/legal/LegalProblemDiagnoser";
import { InteractiveDocumentChecklist } from "@/components/apps/legal/InteractiveDocumentChecklist";
import { LegalAidRoadmap } from "@/components/apps/legal/LegalAidRoadmap";
import { LegalFaqAccordion } from "@/components/apps/legal/LegalFaqAccordion";
import { LegalServicePicker } from "@/components/apps/legal/LegalServicePicker";
import { CourtSurvivalGuide } from "@/components/apps/legal/CourtSurvivalGuide";
import { SummonsActionGuide } from "@/components/apps/legal/SummonsActionGuide";
import { CitizenRightsPocketCard } from "@/components/apps/legal/CitizenRightsPocketCard";
import { PROBLEM_CATEGORIES } from "@/lib/legal/taxonomy";
import {
  HELPLINES,
  LAWS,
  NLASO_DISTRICT_OFFICES,
  NLASO_HOME,
  NLASO_LEGAL_AID_PAGE,
  NOT_LEGAL_ADVICE_BN,
  NOT_LEGAL_ADVICE_EN,
} from "@/lib/legal/data";

const bnNum = (s: string) => s.replace(/\d/g, (d) => "০১২৩৪৫৬৭৮৯"[Number(d)]);

/**
 * /legal: Complete civic legal aid portal for everyday Bangladeshi citizens.
 * Ported & elevated from the Digital Legal Aid System (razibr246 and AdribMahmud101).
 * Follows KormoPath design brief (docs/apps/legal/DESIGN_BRIEF.md):
 * - Legal information, never legal advice.
 * - Every fact, helpline, and law comes from lib/legal/data.ts with its official source and check date.
 * - Emergency help strip and verified 16699 / 999 / 109 hotline integration.
 */
export default function LegalHome() {
  const [lang, setLang] = useState<"bn" | "en">("bn");
  const bn = lang === "bn";
  const T = (b: string, e: string) => (bn ? b : e);
  const legalAid = HELPLINES.find((h) => h.id === "legal_aid");
  const act = LAWS.legal_aid_2000;

  return (
    <div className="space-y-8">
      {/* ============================================================ */}
      {/* 1. HERO SECTION (Tested with data-testid="legal-hero")        */}
      {/* ============================================================ */}
      <section
        className="lg-card relative overflow-hidden !p-6 sm:!p-10 border-indigo-200/80 shadow-sm"
        data-testid="legal-hero"
        aria-labelledby="lg-hero-h"
      >
        <div aria-hidden className="pointer-events-none absolute -right-10 -top-10 h-64 w-64 rounded-full bg-indigo-100/70 blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute -bottom-16 left-1/3 h-56 w-56 rounded-full bg-amber-100/70 blur-3xl" />
        
        <div className="relative grid items-center gap-6 md:grid-cols-[1fr_auto]">
          <div className="min-w-0">
            <div className="flex items-center justify-between gap-3">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-200 bg-indigo-50/80 px-3 py-0.5 text-[12px] font-bold text-indigo-900 shadow-2xs">
                <Scale size={13} className="text-indigo-700" />
                {T("সরকারি খরচে বিনামূল্যে আইনি সহায়তা", "Government Free Legal Aid")}
              </span>
              <button
                type="button"
                onClick={() => setLang(bn ? "en" : "bn")}
                className="kp-chip !h-9 !rounded-full !text-[13px] font-semibold"
                aria-label={bn ? "EN, Switch to English" : "বাং, বাংলায় দেখুন"}
              >
                {bn ? "English" : "বাংলা"}
              </button>
            </div>

            <h1
              id="lg-hero-h"
              className="mt-3 text-[clamp(32px,5vw,52px)] font-semibold leading-[1.08] text-slate-900 motion-safe:animate-rise-in font-display"
            >
              {bn ? (
                <>আইনি সমস্যায় <em className="kp-em">একা নন</em></>
              ) : (
                <>With a legal problem, <em className="kp-em">you are not alone</em></>
              )}
            </h1>

            <p
              className="mt-3.5 max-w-[62ch] text-[15.5px] sm:text-[16px] leading-relaxed text-slate-700 motion-safe:animate-rise-in"
              style={{ animationDelay: "80ms" }}
            >
              {T(
                "টাকার অভাবে যাঁরা আইনজীবী রাখতে পারেন না, সরকার তাঁদের সম্পূর্ণ বিনামূল্যে আইনজীবী, আদালতের কোর্ট ফি এবং আপস-মীমাংসার সহায়তা দেয়। এখানে আপনার অধিকার জানুন, আবেদনের খসড়া প্রস্তুত করুন এবং আপনার এলাকার অফিসে সরাসরি যোগাযোগ করুন।",
                "The government provides free panel lawyers, covers all court fees, and arranges out-of-court mediation for citizens who cannot afford private legal costs. Check your rights, draft an application, and find your local district office."
              )}
            </p>

            {/* Quick Action Buttons */}
            <div
              className="mt-6 flex flex-wrap items-center gap-2.5 motion-safe:animate-rise-in"
              style={{ animationDelay: "160ms" }}
            >
              <Link
                href="/legal/apply"
                className="kp-btn-primary kp-btn-lg inline-flex items-center gap-2"
              >
                <ClipboardList size={18} aria-hidden />
                <span>{T("আবেদনের খসড়া তৈরি", "Prepare Application")}</span>
              </Link>

              <Link
                href="/legal/assistant"
                className="kp-btn-ghost kp-btn-lg inline-flex items-center gap-2"
              >
                <Bot size={18} aria-hidden />
                <span>{T("এআই ও ভয়েস জিজ্ঞাসা", "Ask Legal Assistant")}</span>
              </Link>

              <Link
                href="/legal/mediation"
                className="kp-btn-ghost kp-btn-lg inline-flex items-center gap-2"
              >
                <Handshake size={18} aria-hidden />
                <span>{T("আপস-মীমাংসা (ADR)", "ADR Mediation")}</span>
              </Link>

              {legalAid && (
                <a
                  href={`tel:${legalAid.number}`}
                  className="kp-btn-ghost kp-btn-lg inline-flex items-center gap-2 text-indigo-900 font-bold"
                >
                  <Phone size={18} className="text-emerald-700" aria-hidden />
                  <span className="font-mono">{bn ? bnNum(legalAid.number) : legalAid.number}</span>
                  <span className="text-[12px] font-semibold text-emerald-800 bg-emerald-100/80 px-2 py-0.5 rounded-full">
                    {T("টোল-ফ্রি", "Toll-Free")}
                  </span>
                </a>
              )}
            </div>

            {/* Reassurance strip */}
            <div className="mt-5 flex flex-wrap items-center gap-4 text-[12.5px] text-slate-600 font-medium pt-3 border-t border-slate-200/70">
              <span className="flex items-center gap-1.5 text-emerald-800">
                <CheckCircle2 size={15} className="text-emerald-600" />
                {T("১০০% সরকারি খরচে সেবা", "100% Covered by Government")}
              </span>
              <span className="flex items-center gap-1.5 text-indigo-800">
                <ShieldCheck size={15} className="text-indigo-600" />
                {T("বিচার বিভাগীয় তত্ত্বাবধান", "Judicial Officer Supervised")}
              </span>
              <span className="flex items-center gap-1.5 text-slate-700">
                <Building2 size={15} className="text-slate-500" />
                {T("৬৪ জেলা জজ আদালতে সরাসরি ডেস্ক", "Direct DLAO Desks in All 64 Districts")}
              </span>
            </div>
          </div>

          {/* Aesthetic Animated Balance Scale Tile */}
          <div
            aria-hidden
            className="mx-auto hidden h-48 w-48 place-items-center rounded-3xl border-2 border-indigo-200/90 bg-gradient-to-br from-indigo-50/80 via-white to-amber-50/50 shadow-[0_24px_60px_-25px_rgba(51,53,122,.35)] md:grid select-none"
          >
            <div className="text-center">
              <span className="lg-scale lg-scale-settle inline-block text-indigo-900 drop-shadow-xs">
                <Scale size={90} strokeWidth={1.5} />
              </span>
              <span className="mt-1 block text-[11px] font-bold uppercase tracking-wider text-indigo-700">
                {T("আইনের আশ্রয় সবার অধিকার", "Equal Justice For All")}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* 2. RAPID LEGAL SERVICE PICKER & TRIAGE (World-Class UX)      */}
      {/* ============================================================ */}
      <LegalServicePicker lang={lang} />

      {/* ============================================================ */}
      {/* 3. THE 3 CORE PILLARS OF LEGAL AID                           */}
      {/* ============================================================ */}
      <section aria-label={T("আইনি সহায়তার ৩টি প্রধান সুবিধা", "3 Pillars of Legal Aid")} className="grid gap-4 sm:grid-cols-3">
        <div className="lg-card p-5 border-l-4 border-l-indigo-600">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-indigo-100 text-indigo-900">
              <Gavel size={20} />
            </span>
            <div>
              <h3 className="font-bold text-[16px] text-slate-900">
                {T("বিনামূল্যে প্যানেল আইনজীবী", "Free Court Panel Lawyer")}
              </h3>
              <p className="text-[12px] font-medium text-indigo-700">{T("সরকার সব ফি পরিশোধ করে", "Govt pays lawyer fees")}</p>
            </div>
          </div>
          <p className="mt-3 text-[13.5px] leading-relaxed text-slate-600">
            {T(
              "আদালতে আপনার পক্ষে মামলা পরিচালনা করার জন্য জেলা লিগ্যাল এইড কমিটি অভিজ্ঞ প্যানেল আইনজীবী নিয়োগ দেয়। আইনজীবীকে কোনো ফি দিতে হয় না।",
              "The District Legal Aid Committee assigns experienced panel advocates to represent you in court at zero cost."
            )}
          </p>
        </div>

        <div className="lg-card p-5 border-l-4 border-l-emerald-600">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-emerald-100 text-emerald-950">
              <Handshake size={20} />
            </span>
            <div>
              <h3 className="font-bold text-[16px] text-slate-900">
                {T("মামলা ছাড়াই আপস-মীমাংসা", "Out-of-Court Mediation")}
              </h3>
              <p className="text-[12px] font-medium text-emerald-700">{T("বিকল্প বিরোধ নিষ্পত্তি (ADR)", "Pre-litigation ADR")}</p>
            </div>
          </div>
          <p className="mt-3 text-[13.5px] leading-relaxed text-slate-600">
            {T(
              "আদালতের বছরের পর বছর দীর্ঘসূত্রিতা এড়াতে বিচারক কর্মকর্তার উপস্থিতিতে উভয় পক্ষকে ডেকে শান্তিপূর্ণ আইনি আপসনামা সম্পন্ন করা হয়।",
              "Avoid lengthy court trials: the judicial officer summons both parties to negotiate a peaceful, binding settlement."
            )}
          </p>
        </div>

        <div className="lg-card p-5 border-l-4 border-l-amber-600">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-amber-100 text-amber-950">
              <Scale size={20} />
            </span>
            <div>
              <h3 className="font-bold text-[16px] text-slate-900">
                {T("কোর্ট ফি ও মামলার খরচ মওকুফ", "All Court Fees Covered")}
              </h3>
              <p className="text-[12px] font-medium text-amber-800">{T("রাষ্ট্র বহন করে সমস্ত ব্যয়", "State covers all costs")}</p>
            </div>
          </div>
          <p className="mt-3 text-[13.5px] leading-relaxed text-slate-600">
            {T(
              "আদালতের দাখিল খরচ, সমন জারি, টাইপ ও স্ট্যাম্প ফি—মামলার সমস্ত অনুষঙ্গিক খরচ আইন অনুযায়ী সরকারের তহবিল থেকে প্রদান করা হয়।",
              "Filing fees, summons, typing, and court stamps are officially paid from the government legal aid fund."
            )}
          </p>
        </div>
      </section>

      {/* ============================================================ */}
      {/* 4. INTERACTIVE LEGAL PROBLEM DIAGNOSER (New World-Class UX)   */}
      {/* ============================================================ */}
      <LegalProblemDiagnoser lang={lang} />

      {/* ============================================================ */}
      {/* 5. COURT SUMMONS & LEGAL NOTICE PROTOCOL                     */}
      {/* ============================================================ */}
      <SummonsActionGuide lang={lang} />

      {/* ============================================================ */}
      {/* 6. 64 DISTRICT LEGAL AID OFFICE LOCATOR (Built-in Tool)      */}
      {/* ============================================================ */}
      <DistrictFinder lang={lang} />

      {/* ============================================================ */}
      {/* 7. DISTRICT COURT & DLAO SURVIVAL GUIDE (Anti-Tout Protocol) */}
      {/* ============================================================ */}
      <CourtSurvivalGuide lang={lang} />

      {/* ============================================================ */}
      {/* 8. 2-MINUTE ELIGIBILITY ESTIMATOR (Tested Component)         */}
      {/* ============================================================ */}
      <EligibilityCard lang={lang} />

      {/* ============================================================ */}
      {/* 9. INTERACTIVE DOCUMENT READINESS CHECKLIST                  */}
      {/* ============================================================ */}
      <InteractiveDocumentChecklist lang={lang} />

      {/* ============================================================ */}
      {/* 10. CITIZEN RIGHTS POCKET CARD & 1-PAGE SUMMARY GENERATOR    */}
      {/* ============================================================ */}
      <CitizenRightsPocketCard lang={lang} />

      {/* ============================================================ */}
      {/* 11. STEP-BY-STEP WORKFLOW ROADMAP (Visual Guide)             */}
      {/* ============================================================ */}
      <LegalAidRoadmap lang={lang} />

      {/* ============================================================ */}
      {/* 8. PROBLEM TAXONOMY CATEGORIES (Tested with data-topic)      */}
      {/* ============================================================ */}
      <section aria-labelledby="lg-topics-h" className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <p className="kp-eyebrow">{T("সমস্যার বিস্তার", "Problem taxonomy")}</p>
            <h2 id="lg-topics-h" className="mt-1 text-[clamp(21px,3vw,27px)] font-semibold leading-tight text-slate-900">
              {T("আইনি সহায়তার সুনির্দিষ্ট ক্ষেত্রসমূহ", "Specific Legal Aid Practice Areas")}
            </h2>
          </div>
          <p className="text-[13px] text-slate-500 max-w-[50ch]">
            {T("যেকোনো বিষয়ে ট্যাপ করে সহকারীকে জিজ্ঞাসা করুন অথবা আবেদনপত্রের ড্রাফট তৈরি করুন।", "Tap any area to ask the assistant or start an application draft.")}
          </p>
        </div>

        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {PROBLEM_CATEGORIES.map((c, i) => (
            <li
              key={c.id}
              className="lg-card lg-card-hover flex flex-col justify-between gap-3 !p-4.5 motion-safe:animate-rise-in border-slate-200"
              style={{ animationDelay: `${Math.min(i, 10) * 35}ms` }}
              data-topic={c.id}
            >
              <div>
                <p className="text-[16px] font-bold leading-snug text-slate-900">
                  {bn ? c.bn : c.en}
                </p>
                {c.actBn && (
                  <span className="mt-1.5 inline-block text-[11.5px] font-medium text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100">
                    {c.actBn}
                  </span>
                )}
              </div>

              <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100">
                <Link
                  href={`/legal/assistant?topic=${encodeURIComponent(c.id)}`}
                  className="kp-chip !h-9 !text-[13px] font-semibold"
                >
                  <Bot size={14} aria-hidden /> {T("জিজ্ঞাসা", "Ask")}
                </Link>
                <Link
                  href={`/legal/apply?topic=${encodeURIComponent(c.id)}`}
                  className="kp-chip !h-9 !text-[13px] font-semibold"
                >
                  <ClipboardList size={14} aria-hidden /> {T("খসড়া", "Draft")}
                </Link>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* ============================================================ */}
      {/* 9. STATUTE FACTS & NLASO CITATION                            */}
      {/* ============================================================ */}
      <section aria-labelledby="lg-what-h" className="grid gap-4 md:grid-cols-3">
        <div className="lg-card md:col-span-2 space-y-3">
          <p className="kp-eyebrow">{T("আইনগত ভিত্তি", "Legal Foundation")}</p>
          <h2 id="lg-what-h" className="text-[20px] sm:text-[22px] font-bold text-slate-900">
            {T("আইনগত সহায়তা প্রদান আইন ২০০০", "Legal Aid Services Act 2000")}
          </h2>
          <p className="text-[15px] leading-relaxed text-slate-700">
            {bn
              ? `${act.bn} অনুযায়ী বাংলাদেশ আইনগত সহায়তা অধিদপ্তর (NLASO) এই সহায়তা দেয়। দেশের প্রতিটি জেলা লিগ্যাল এইড অফিস, সুপ্রিম কোর্ট লিগ্যাল এইড অফিস ও চৌকি আদালত লিগ্যাল এইড অফিসে সাধারণ নাগরিকরা এই সেবা পান। জাতীয় টোল-ফ্রি হেল্পলাইন ১৬৬৯৯। কে সহায়তা পাবেন তা জেলা অফিস বিবেচনা করে নির্ধারণ করে।`
              : `Under the ${act.en}, the National Legal Aid Services Organisation provides legal aid through district, Supreme Court, and chowki-court offices, supported by national toll-free helpline 16699. The district legal aid office decides who gets aid.`}
          </p>
          <div className="flex flex-wrap gap-2 pt-1">
            <SourceTag confidence="official" label={act.source.label} url={act.source.url} checked={act.source.checked} />
            <SourceTag confidence="official" label={NLASO_LEGAL_AID_PAGE.label} url={NLASO_LEGAL_AID_PAGE.url} checked={NLASO_LEGAL_AID_PAGE.checked} />
            <SourceTag confidence="official" label={NLASO_HOME.label} url={NLASO_HOME.url} checked={NLASO_HOME.checked} />
          </div>
        </div>

        <div className="lg-card flex flex-col justify-between gap-3 bg-gradient-to-br from-indigo-50/50 to-white">
          <div>
            <p className="kp-eyebrow">{T("জাতীয় হটলাইন", "National Hotline")}</p>
            <h3 className="text-2xl font-bold font-mono text-indigo-950 mt-1">১৬৬৯৯</h3>
            <p className="mt-1 text-[13.5px] leading-relaxed text-slate-700">
              {T(
                "যেকোনো মোবাইল বা ল্যান্ডফোন থেকে বিনা ব্যালেন্সে ফোন করে সরাসরি লিগ্যাল এইড কর্মকর্তার সাথে কথা বলুন।",
                "Call from any phone operator with zero balance to speak directly with a legal aid counselor."
              )}
            </p>
          </div>
          <a
            href="tel:16699"
            className="kp-btn-primary inline-flex min-h-[44px] items-center justify-center gap-2 px-4 text-[14px]"
          >
            <Phone size={16} />
            <span>{T("এখনই ১৬৬৯৯ ডায়াল করুন", "Dial 16699 Now")}</span>
          </a>
        </div>
      </section>

      {/* ============================================================ */}
      {/* 10. VERIFIED HELPLINES DIRECTORY                             */}
      {/* ============================================================ */}
      <section aria-labelledby="lg-calls-h" className="lg-card space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div>
            <p className="kp-eyebrow">{T("জরুরি হটলাইন", "Emergency Hotlines")}</p>
            <h2 id="lg-calls-h" className="text-[20px] font-bold text-slate-900">
              {T("যেসব সরকারি নম্বরে সরাসরি ফোন করা যায়", "Verified Government Helplines You Can Call")}
            </h2>
          </div>
          <span className="text-[12px] text-slate-500">{T("সবগুলো নম্বর সরকারি পোর্টালে যাচাইকৃত", "All numbers verified against official portals")}</span>
        </div>

        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {HELPLINES.map((h) => (
            <li key={h.id} className="flex flex-col justify-between gap-2.5 rounded-2xl border border-slate-200/90 bg-white p-4 shadow-2xs hover:border-indigo-300 transition-colors">
              <div>
                <a href={`tel:${h.number}`} className="flex items-center gap-3 group">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-indigo-50 text-indigo-900 group-hover:bg-indigo-900 group-hover:text-white transition-colors">
                    <Phone size={18} aria-hidden />
                  </span>
                  <span className="min-w-0">
                    <span className="block font-mono text-[18px] font-bold text-slate-900 group-hover:text-indigo-700 transition-colors">
                      {bn ? bnNum(h.number) : h.number}
                    </span>
                    <span className="block text-[13.5px] font-semibold leading-snug text-slate-700">
                      {bn ? h.bn : h.en}
                    </span>
                  </span>
                </a>
                <p className="mt-2 text-[12.5px] text-slate-600 leading-snug">
                  {bn ? h.whenBn : h.whenEn}
                </p>
              </div>

              <div className="pt-2 border-t border-slate-100">
                <SourceTag
                  confidence={h.source.url.includes("tbsnews") ? "reported" : "official"}
                  label={h.source.label}
                  url={h.source.url}
                  checked={h.source.checked}
                />
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* ============================================================ */}
      {/* 11. LEGAL FAQ ACCORDION (Addressing Citizen Fears)           */}
      {/* ============================================================ */}
      <LegalFaqAccordion lang={lang} />

      {/* ============================================================ */}
      {/* 12. LEGAL DISCLAIMER & CASE TRACKER LINK                     */}
      {/* ============================================================ */}
      <section className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-amber-200 bg-amber-50/70 p-5 shadow-2xs">
        <div className="max-w-[70ch] space-y-1">
          <span className="inline-block text-[11px] font-bold uppercase tracking-wider text-amber-900 bg-amber-200/70 px-2 py-0.5 rounded">
            {T("আইনি তথ্যের নোটিশ", "Legal Information Notice")}
          </span>
          <p className="text-[14.5px] leading-relaxed text-amber-950 font-medium">
            {bn ? NOT_LEGAL_ADVICE_BN : NOT_LEGAL_ADVICE_EN}
          </p>
        </div>

        <Link
          href="/legal/track"
          className="kp-btn-ghost inline-flex min-h-[44px] items-center gap-2 px-5 text-[14.5px] bg-white border-amber-300 hover:bg-amber-100"
        >
          <ScrollText size={16} aria-hidden />
          <span>{T("আমার সংরক্ষিত কেস ডায়েরি", "My Saved Case Diary")}</span>
          <ArrowRight size={14} />
        </Link>
      </section>
    </div>
  );
}
