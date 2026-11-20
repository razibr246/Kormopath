"use client";

import { useState } from "react";
import {
  Handshake,
  Gavel,
  ShieldAlert,
  Bot,
  ArrowRight,
  PhoneCall,
  CheckCircle2,
  Sparkles,
  HelpCircle,
} from "lucide-react";
import Link from "next/link";
import { SourceTag } from "@/components/layout/AppHeader";
import { NLASO_LEGAL_AID_PAGE, HELPLINES } from "@/lib/legal/data";

interface LegalServicePickerProps {
  lang?: "bn" | "en";
}

type ServiceMode = "mediation" | "court" | "emergency" | "inquiry";

export function LegalServicePicker({ lang = "bn" }: LegalServicePickerProps) {
  const bn = lang === "bn";
  const T = (b: string, e: string) => (bn ? b : e);

  const [selectedService, setSelectedService] = useState<ServiceMode>("mediation");
  const legalAid = HELPLINES.find((h) => h.id === "legal_aid");

  return (
    <section
      aria-labelledby="lg-picker-h"
      className="lg-card space-y-6 border-slate-200 shadow-sm"
      data-testid="legal-service-picker"
    >
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-xl bg-indigo-100 text-indigo-900">
              <Sparkles size={17} aria-hidden />
            </span>
            <p className="kp-eyebrow">{T("দ্রুত সেবা বাছাইকারী", "Quick Service Matcher")}</p>
          </div>
          <h2
            id="lg-picker-h"
            className="mt-1 text-[clamp(21px,3vw,28px)] font-bold leading-tight text-slate-900"
          >
            {T(
              "আপনার সমস্যার জন্য কোন আইনি সেবাটি সবচেয়ে উপযুক্ত?",
              "Which Legal Aid Service Fits Your Situation?"
            )}
          </h2>
          <p className="mt-1.5 max-w-[65ch] text-[14.5px] leading-relaxed text-slate-600">
            {T(
              "সরাসরি মামলা নাকি আপস-মীমাংসা? নিচে আপনার পরিস্থিতি বেছে নিন এবং সবচেয়ে দ্রুত ও নিরাপদ আইনি পথ জানুন।",
              "Direct court filing or peaceful mediation? Choose your situation below to discover the fastest and safest legal route."
            )}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <SourceTag
            confidence="official"
            label={NLASO_LEGAL_AID_PAGE.label}
            url={NLASO_LEGAL_AID_PAGE.url}
            checked={NLASO_LEGAL_AID_PAGE.checked}
          />
        </div>
      </div>

      {/* 4 Interactive Service Option Cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {/* 1. ADR Mediation */}
        <button
          type="button"
          onClick={() => setSelectedService("mediation")}
          className={`flex flex-col justify-between text-left rounded-2xl border p-4 transition-all duration-200 ${
            selectedService === "mediation"
              ? "border-emerald-600 bg-emerald-50/60 shadow-sm ring-2 ring-emerald-500/20"
              : "border-slate-200 bg-white hover:border-emerald-300 hover:bg-slate-50/50"
          }`}
        >
          <div>
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-100 text-emerald-950 mb-3">
              <Handshake size={20} />
            </span>
            <h3 className="font-bold text-[15.5px] text-slate-900">
              {T("মামলা ছাড়াই আপস-মীমাংসা", "Out-of-Court Mediation")}
            </h3>
            <p className="mt-1.5 text-[12.5px] text-slate-600 leading-relaxed">
              {T(
                "উভয় পক্ষকে জজ অফিসে ডেকে বন্ধুত্বপূর্ণ সমাধান (ADR)।",
                "Peaceful settlement before court trials via judicial ADR."
              )}
            </p>
          </div>
          <span className="mt-3 inline-flex items-center gap-1 text-[12px] font-bold text-emerald-800">
            {selectedService === "mediation" ? T("✓ নির্বাচিত", "✓ Selected") : T("বিস্তারিত দেখুন →", "View details →")}
          </span>
        </button>

        {/* 2. Court Panel Lawyer */}
        <button
          type="button"
          onClick={() => setSelectedService("court")}
          className={`flex flex-col justify-between text-left rounded-2xl border p-4 transition-all duration-200 ${
            selectedService === "court"
              ? "border-indigo-600 bg-indigo-50/60 shadow-sm ring-2 ring-indigo-500/20"
              : "border-slate-200 bg-white hover:border-indigo-300 hover:bg-slate-50/50"
          }`}
        >
          <div>
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-indigo-100 text-indigo-950 mb-3">
              <Gavel size={20} />
            </span>
            <h3 className="font-bold text-[15.5px] text-slate-900">
              {T("আদালতের প্যানেল আইনজীবী", "Court Panel Lawyer")}
            </h3>
            <p className="mt-1.5 text-[12.5px] text-slate-600 leading-relaxed">
              {T(
                "আদালতে চলমান মামলা পরিচালনা ও উকিল নিয়োগ।",
                "Free appointed advocate for ongoing or formal court cases."
              )}
            </p>
          </div>
          <span className="mt-3 inline-flex items-center gap-1 text-[12px] font-bold text-indigo-800">
            {selectedService === "court" ? T("✓ নির্বাচিত", "✓ Selected") : T("বিস্তারিত দেখুন →", "View details →")}
          </span>
        </button>

        {/* 3. Spoken Legal Inquiry */}
        <button
          type="button"
          onClick={() => setSelectedService("inquiry")}
          className={`flex flex-col justify-between text-left rounded-2xl border p-4 transition-all duration-200 ${
            selectedService === "inquiry"
              ? "border-amber-600 bg-amber-50/60 shadow-sm ring-2 ring-amber-500/20"
              : "border-slate-200 bg-white hover:border-amber-300 hover:bg-slate-50/50"
          }`}
        >
          <div>
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-amber-100 text-amber-950 mb-3">
              <Bot size={20} />
            </span>
            <h3 className="font-bold text-[15.5px] text-slate-900">
              {T("আইনি অধিকার ও তথ্য জিজ্ঞাসা", "Legal Info & Rights Inquiry")}
            </h3>
            <p className="mt-1.5 text-[12.5px] text-slate-600 leading-relaxed">
              {T(
                "টোল-ফ্রি কল বা এআই সহকারীর মাধ্যমে তাৎক্ষণিক তথ্য।",
                "Instant legal rights guidance via toll-free call or AI."
              )}
            </p>
          </div>
          <span className="mt-3 inline-flex items-center gap-1 text-[12px] font-bold text-amber-900">
            {selectedService === "inquiry" ? T("✓ নির্বাচিত", "✓ Selected") : T("বিস্তারিত দেখুন →", "View details →")}
          </span>
        </button>

        {/* 4. Emergency / Police Safety */}
        <button
          type="button"
          onClick={() => setSelectedService("emergency")}
          className={`flex flex-col justify-between text-left rounded-2xl border p-4 transition-all duration-200 ${
            selectedService === "emergency"
              ? "border-red-600 bg-red-50/70 shadow-sm ring-2 ring-red-500/20"
              : "border-slate-200 bg-white hover:border-red-300 hover:bg-red-50/30"
          }`}
        >
          <div>
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-red-100 text-red-950 mb-3">
              <ShieldAlert size={20} />
            </span>
            <h3 className="font-bold text-[15.5px] text-slate-900">
              {T("জরুরি শারীরিক নিরাপত্তা", "Immediate Safety & Danger")}
            </h3>
            <p className="mt-1.5 text-[12.5px] text-slate-600 leading-relaxed">
              {T(
                "মারধর, শারীরিক নির্যাতন বা জীবনের সরাসরি হুমকি।",
                "Physical assault, domestic violence, or immediate danger."
              )}
            </p>
          </div>
          <span className="mt-3 inline-flex items-center gap-1 text-[12px] font-bold text-red-700">
            {selectedService === "emergency" ? T("✓ নির্বাচিত", "✓ Selected") : T("জরুরি কল →", "Emergency call →")}
          </span>
        </button>
      </div>

      {/* Selected Mode Detail Panel */}
      <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5 sm:p-6 motion-safe:animate-rise-in">
        {selectedService === "mediation" && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <span className="text-[12px] font-bold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full">
                  {T("বিকল্প বিরোধ নিষ্পত্তি (ADR)", "Alternative Dispute Resolution")}
                </span>
                <h4 className="mt-2 text-[18px] font-bold text-slate-900">
                  {T("আদালতের লড়াই ছাড়াই শান্তিপূর্ণ আপস-মীমাংসা", "Peaceful Out-of-Court Settlement")}
                </h4>
              </div>
              <Link
                href="/legal/mediation"
                className="kp-btn-primary inline-flex items-center gap-2 px-4 py-2 text-[14px]"
              >
                <span>{T("মীমাংসা সহায়তায় যান", "Go to Mediation Prep")}</span>
                <ArrowRight size={15} />
              </Link>
            </div>

            <p className="text-[14.5px] leading-relaxed text-slate-700">
              {T(
                "দাম্পত্য কলহ, দেনমোহর ও সন্তানের ভরণপোষণ, পারিবারিক জমি বা সীমানা বিরোধের ক্ষেত্রে সরাসরি মামলা না করে লিগ্যাল এইড কর্মকর্তার মাধ্যমে উভয় পক্ষকে ডেকে আপসনামা তৈরি করা যায়। এতে সময় ও মানসিক শান্তি বাঁচে এবং সম্পর্কের ভবিষ্যৎ রক্ষা পায়।",
                "For domestic disputes, dower, maintenance, and family land boundaries, the legal aid officer summons both sides to forge a binding settlement without trial costs."
              )}
            </p>
          </div>
        )}

        {selectedService === "court" && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <span className="text-[12px] font-bold text-indigo-800 bg-indigo-100 px-2.5 py-0.5 rounded-full">
                  {T("আদালতে বিনামূল্যে প্রতিনিধিত্ব", "Free Court Representation")}
                </span>
                <h4 className="mt-2 text-[18px] font-bold text-slate-900">
                  {T("প্যানেল আইনজীবী ও কোর্ট ফি মওকুফ", "Appointed Panel Lawyer & Court Fees Covered")}
                </h4>
              </div>
              <Link
                href="/legal/apply"
                className="kp-btn-primary inline-flex items-center gap-2 px-4 py-2 text-[14px]"
              >
                <span>{T("আবেদনের খসড়া তৈরি করুন", "Prepare Application Draft")}</span>
                <ArrowRight size={15} />
              </Link>
            </div>

            <p className="text-[14.5px] leading-relaxed text-slate-700">
              {T(
                "যদি আপনার বিরুদ্ধে ইতিমধ্যেই সমন বা মামলা জারি হয়ে থাকে, অথবা মামলা লড়তে বাধ্য হন কিন্তু আইনজীবী রাখার অর্থ নেই—জেলা লিগ্যাল এইড কমিটি অভিজ্ঞ আইনজীবী নিযুক্ত করে দেবে এবং কোর্টের সমস্ত খরচ সরকার বহন করবে।",
                "If a lawsuit is already pending or you cannot afford private defense advocates, the legal aid committee assigns an experienced panel advocate with zero court fees."
              )}
            </p>
          </div>
        )}

        {selectedService === "inquiry" && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <span className="text-[12px] font-bold text-amber-900 bg-amber-100 px-2.5 py-0.5 rounded-full">
                  {T("তাৎক্ষণিক আইন ও অধিকারের তথ্য", "Instant Rights & Procedural Info")}
                </span>
                <h4 className="mt-2 text-[18px] font-bold text-slate-900">
                  {T("ভয়েস ও লিখিত আইনি সহকারী", "Voice and Text Civic Legal Assistant")}
                </h4>
              </div>
              <div className="flex flex-wrap gap-2">
                {legalAid && (
                  <a
                    href={`tel:${legalAid.number}`}
                    className="kp-btn-ghost inline-flex items-center gap-2 px-4 py-2 text-[14px]"
                  >
                    <PhoneCall size={15} className="text-emerald-700" />
                    <span>{T("১৬৬৯৯ কল", "Call 16699")}</span>
                  </a>
                )}
                <Link
                  href="/legal/assistant"
                  className="kp-btn-primary inline-flex items-center gap-2 px-4 py-2 text-[14px]"
                >
                  <span>{T("এআই সহকারীকে জিজ্ঞাসা", "Ask AI Assistant")}</span>
                  <ArrowRight size={15} />
                </Link>
              </div>
            </div>

            <p className="text-[14.5px] leading-relaxed text-slate-700">
              {T(
                "কোনো আইনগত বিষয়ে আপনার প্রাথমিক অধিকার জানা, দলিলপত্রের নিয়মাবলী বা লিগ্যাল এইড অফিসের ঠিকানা নিশ্চিত করতে আমাদের এআই সহকারীর সাথে বাংলায় বা ইংরেজিতে কথা বলুন অথবা জাতীয় টোল-ফ্রি হটলাইন ১৬৬৯৯ ডায়াল করুন।",
                "Understand your basic civic rights, document requirements, or office location by chatting with our AI assistant or dialing the toll-free hotline 16699."
              )}
            </p>
          </div>
        )}

        {selectedService === "emergency" && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <span className="text-[12px] font-bold text-red-900 bg-red-100 px-2.5 py-0.5 rounded-full">
                  {T("জীবন ও শারীরিক নিরাপত্তা প্রথম", "Physical Safety First")}
                </span>
                <h4 className="mt-2 text-[18px] font-bold text-red-950">
                  {T("তাৎক্ষণিক পুলিশ ও উদ্ধার সহায়তা", "Immediate Police & Rescue Help")}
                </h4>
              </div>
              <div className="flex flex-wrap gap-2">
                <a
                  href="tel:999"
                  className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-red-600 px-5 text-[15px] font-bold text-white hover:bg-red-700 shadow-sm"
                >
                  <PhoneCall size={16} />
                  <span>{T("৯৯৯ পুলিশ জরুরি", "999 Police Emergency")}</span>
                </a>
                <a
                  href="tel:109"
                  className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-red-300 bg-white px-4 text-[14px] font-bold text-red-800 hover:bg-red-50"
                >
                  <span>{T("১০৯ নারী ও শিশু", "109 Women & Child")}</span>
                </a>
              </div>
            </div>

            <p className="text-[14.5px] leading-relaxed text-red-950">
              {T(
                "শারীরিক হামলা, প্রাণনাশের হুমকি বা অপহরণের মতো বিপজ্জনক পরিস্থিতিতে কোনো আবেদন বা আইনি কাগজপত্র নিয়ে অপেক্ষা করবেন না। আগে নিজের ও পরিবারের নিরাপত্তা নিশ্চিত করতে অবিলম্বে ৯৯৯ অথবা ১০৯ নম্বরে কল করুন।",
                "In life-threatening emergencies, assault, or immediate violence, do not wait for legal aid paperwork. Dial 999 or 109 immediately to ensure personal safety first."
              )}
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
