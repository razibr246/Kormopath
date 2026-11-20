"use client";

import { useState } from "react";
import {
  CreditCard,
  Printer,
  Copy,
  Check,
  ShieldCheck,
  Scale,
  Phone,
  FileText,
  AlertCircle,
  Building2,
  Sparkles,
} from "lucide-react";
import { SourceTag } from "@/components/layout/AppHeader";
import { LAWS, HELPLINES, NOT_LEGAL_ADVICE_BN, NOT_LEGAL_ADVICE_EN } from "@/lib/legal/data";
import { BD_DISTRICTS } from "@/lib/legal/districts";

interface CitizenRightsPocketCardProps {
  lang?: "bn" | "en";
}

export function CitizenRightsPocketCard({ lang = "bn" }: CitizenRightsPocketCardProps) {
  const bn = lang === "bn";
  const T = (b: string, e: string) => (bn ? b : e);

  const [copied, setCopied] = useState(false);
  const [briefMode, setBriefMode] = useState(false);

  // Quick Brief Form State
  const [applicantName, setApplicantName] = useState("");
  const [district, setDistrict] = useState("Dhaka");
  const [opponent, setOpponent] = useState("");
  const [issueSummary, setIssueSummary] = useState("");
  const [showBriefPreview, setShowBriefPreview] = useState(false);

  const act = LAWS.legal_aid_2000;

  const handlePrint = () => {
    window.print();
  };

  const briefText = `
বাংলাদেশ আইনগত সহায়তা অধিদপ্তর (NLASO) — আবেদনকারীর প্রাথমিক তথ্য বিবরণী
-----------------------------------------------------------------
[খসড়া · নাগরিক কর্তৃক প্রস্তুতকৃত · আদালতের আনুষ্ঠানিক নথি নয়]

আবেদনকারীর নাম: ${applicantName.trim() || (bn ? "উল্লেখ নেই" : "Not specified")}
জেলা: ${BD_DISTRICTS.find((d) => d.en === district)?.[bn ? "bn" : "en"] || district}
প্রতিপক্ষের তথ্য: ${opponent.trim() || (bn ? "প্রযোজ্য নয় / জানা নেই" : "Not specified")}

সমস্যার মূল বিবরণ:
${issueSummary.trim() || (bn ? "বিবরণ লিপিবদ্ধ হয়নি।" : "No description provided.")}

আইনি অধিকারের নিশ্চয়তা:
• আইনগত সহায়তা প্রদান আইন ২০০০ অনুযায়ী রাষ্ট্রীয় খরচে সম্পূর্ণ বিনামূল্যে সেবা।
• জেলা লিগ্যাল এইড কর্মকর্তা (সিনিয়র সহকারী জজ) আবেদন পর্যালোচনা করবেন।
• জাতীয় হেল্পলাইন: ১৬৬৯৯ (টোল-ফ্রি) | জরুরি বিপদ: ৯৯৯ | নারী ও শিশু নির্যাতন: ১০৯

তারিখ: ${new Date().toLocaleDateString(bn ? "bn-BD" : "en-US")}
প্রস্তুত উৎস: KormoPath আইনি সহায়তা পোর্টাল
`.trim();

  const handleCopyBrief = async () => {
    try {
      await navigator.clipboard.writeText(briefText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {}
  };

  return (
    <section
      aria-labelledby="lg-pocket-h"
      className="lg-card space-y-6 border-indigo-200/90 shadow-sm"
      data-testid="citizen-rights-pocket-card"
    >
      {/* Section Header */}
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-xl bg-indigo-100 text-indigo-900">
              <CreditCard size={17} aria-hidden />
            </span>
            <p className="kp-eyebrow">{T("পকেট রেফারেন্স ও সারসংক্ষেপ", "Pocket Card & Brief")}</p>
          </div>
          <h2
            id="lg-pocket-h"
            className="mt-1 text-[clamp(21px,3vw,28px)] font-bold leading-tight text-slate-900"
          >
            {T(
              "নাগরিক আইনি অধিকার পকেট কার্ড ও ১ পাতার সংক্ষিপ্ত বিবরণী",
              "Citizen Legal Rights Pocket Card & 1-Page Brief"
            )}
          </h2>
          <p className="mt-1.5 max-w-[65ch] text-[14.5px] leading-relaxed text-slate-600">
            {T(
              "আদালতে বা লিগ্যাল এইড অফিসে যাওয়ার সময় এই কার্ডটি সাথে রাখুন অথবা কর্মকর্তাদের সামনে উপস্থাপন করার জন্য ১ পাতার পরিষ্কার বিবরণী প্রস্তুত করুন।",
              "Keep this pocket rights card handy during your court visit or generate a neat 1-page summary to present directly to the legal aid officer."
            )}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setBriefMode(!briefMode)}
            className={`kp-chip !h-9 !text-[13px] font-semibold transition-all ${
              briefMode ? "!bg-indigo-900 !text-white !border-indigo-900" : ""
            }`}
          >
            <FileText size={14} aria-hidden />
            <span>{T("১ পাতার বিবরণী প্রস্তুতকারক", "1-Page Brief Generator")}</span>
          </button>
          <SourceTag
            confidence="official"
            label={act.source.label}
            url={act.source.url}
            checked={act.source.checked}
          />
        </div>
      </div>

      {/* 1. VISUAL POCKET CARD */}
      {!briefMode ? (
        <div className="grid gap-6 md:grid-cols-[1.2fr_0.8fr] items-start">
          {/* Card Presentation */}
          <div className="relative overflow-hidden rounded-3xl border-2 border-indigo-300 bg-gradient-to-br from-indigo-950 via-slate-900 to-indigo-900 p-6 text-white shadow-xl">
            <div className="flex items-center justify-between border-b border-indigo-800/80 pb-4">
              <div className="flex items-center gap-2.5">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-indigo-500/30 text-amber-300 ring-1 ring-white/20">
                  <Scale size={20} />
                </span>
                <div>
                  <h3 className="font-bold text-[16px] text-white tracking-wide">
                    {T("নাগরিক আইনি অধিকার কার্ড", "Citizen Legal Rights Card")}
                  </h3>
                  <p className="text-[11.5px] text-indigo-300">
                    {T("আইনগত সহায়তা প্রদান আইন ২০০০", "Legal Aid Services Act 2000")}
                  </p>
                </div>
              </div>
              <span className="rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-[11px] font-bold text-emerald-300 ring-1 ring-emerald-500/40">
                {T("১০০% সরকারি সেবা", "100% Free Govt")}
              </span>
            </div>

            {/* 4 Core Inviolable Rights */}
            <div className="mt-4 space-y-3 text-[13.5px]">
              <div className="flex items-start gap-2.5">
                <ShieldCheck size={17} className="text-amber-400 shrink-0 mt-0.5" />
                <p>
                  <strong>{T("১. সম্পূর্ণ বিনামূল্যে আইনজীবী:", "1. Free Lawyer:")}</strong>{" "}
                  <span className="text-indigo-100">
                    {T("সরকার আইনজীবী নিয়োগ দেয় এবং সরাসরি ফি বহন করে।", "State appoints and pays panel advocate.")}
                  </span>
                </p>
              </div>

              <div className="flex items-start gap-2.5">
                <ShieldCheck size={17} className="text-amber-400 shrink-0 mt-0.5" />
                <p>
                  <strong>{T("২. সব আদালতের খরচ মওকুফ:", "2. All Court Costs Waived:")}</strong>{" "}
                  <span className="text-indigo-100">
                    {T("কোর্ট ফি, স্ট্যাম্প ও সমন জারির খরচ রাষ্ট্রীয় তহবিল দেয়।", "Court fees, stamps, and summons covered by state.")}
                  </span>
                </p>
              </div>

              <div className="flex items-start gap-2.5">
                <ShieldCheck size={17} className="text-amber-400 shrink-0 mt-0.5" />
                <p>
                  <strong>{T("৩. মামলা ছাড়াই আপস-মীমাংসা:", "3. Pre-case ADR Mediation:")}</strong>{" "}
                  <span className="text-indigo-100">
                    {T("আদালতে দীর্ঘ বিচার এড়াতে জজ অফিসে শান্তিপূর্ণ সমঝোতা।", "Peaceful dispute settlement without long trial.")}
                  </span>
                </p>
              </div>

              <div className="flex items-start gap-2.5">
                <ShieldCheck size={17} className="text-amber-400 shrink-0 mt-0.5" />
                <p>
                  <strong>{T("৪. চাঁদা বা ফি দাবি নিষিদ্ধ:", "4. Zero Extortion Shield:")}</strong>{" "}
                  <span className="text-indigo-100">
                    {T("কোনো আইনজীবী বা কর্মকর্তা টাকা চাইলে ১৬৬৯৯-এ অভিযোগ দিন।", "If anyone asks money, report directly to 16699.")}
                  </span>
                </p>
              </div>
            </div>

            {/* Bottom Strip on the Card */}
            <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-indigo-800/80 pt-3 text-[12px] text-indigo-300">
              <span className="font-mono font-bold text-amber-300 text-[14px]">
                {T("জাতীয় হটলাইন: ১৬৬৯৯", "Helpline: 16699")}
              </span>
              <span>{T("জেলা ও দায়রা জজ আদালত ভবন", "District Judge Court")}</span>
            </div>
          </div>

          {/* Practical Advice Alongside the Card */}
          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 space-y-2">
              <h4 className="text-[15px] font-bold text-slate-900 flex items-center gap-2">
                <AlertCircle size={16} className="text-indigo-700" />
                {T("এই কার্ডটি কীভাবে ব্যবহার করবেন?", "How to Use This Pocket Card")}
              </h4>
              <p className="text-[13.5px] leading-relaxed text-slate-600">
                {T(
                  "আদালত চত্বরে কোনো অপরিচিত ব্যক্তি বা দালাল আপনাকে বাধা দিলে বা টাকা দাবি করলে স্পষ্ট বলুন—আপনি 'আইনগত সহায়তা প্রদান আইন ২০০০' অনুযায়ী সরাসরি জেলা লিগ্যাল এইড অফিসারের কাছে যাচ্ছেন।",
                  "If any middleman or tout stops you or asks for money on court premises, clearly state that you are visiting the District Legal Aid Officer under the Legal Aid Services Act 2000."
                )}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handlePrint}
                className="kp-btn-primary inline-flex items-center gap-2 px-4 py-2 text-[13.5px]"
              >
                <Printer size={15} aria-hidden />
                <span>{T("কার্ডটি প্রিন্ট করুন", "Print Pocket Card")}</span>
              </button>

              <button
                type="button"
                onClick={() => setBriefMode(true)}
                className="kp-btn-ghost inline-flex items-center gap-2 px-4 py-2 text-[13.5px]"
              >
                <FileText size={15} aria-hidden />
                <span>{T("১ পাতার ব্রিফ লিখুন", "Write 1-Page Brief")}</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* 2. ONE-PAGE BRIEF GENERATOR */
        <div className="space-y-5 motion-safe:animate-rise-in">
          <div className="rounded-2xl border border-indigo-100 bg-indigo-50/50 p-4">
            <h3 className="text-[16.5px] font-bold text-indigo-950 flex items-center gap-2">
              <Sparkles size={18} className="text-indigo-700" />
              {T("লিগ্যাল এইড কর্মকর্তার জন্য ১ পাতার সংক্ষিপ্ত বিবরণী", "1-Page Case Summary for Legal Aid Officer")}
            </h3>
            <p className="mt-1 text-[13.5px] text-slate-600">
              {T(
                "কর্মকর্তার সামনে কথা বলতে সংকোচ বোধ করলে নিচের ঘরগুলো পূরণ করে প্রিন্ট বা কপি করে সাথে নিন। এটি কোনো আনুষ্ঠানিক আইনি দলিল নয়, আপনার কথা স্পষ্টভাবে তুলে ধরার সহজ মাধ্যম।",
                "If you feel nervous explaining your story, fill these fields to print or copy a clean brief to hand over to the officer."
              )}
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-[13px] font-bold text-slate-800 mb-1">
                {T("আপনার নাম (বা গোপন রাখতে চাইলে ডাকনাম)", "Your Name")}
              </label>
              <input
                type="text"
                value={applicantName}
                onChange={(e) => setApplicantName(e.target.value)}
                placeholder={T("যেমন: মোছাঃ ফাতেমা বেগম", "e.g., Fatema Begum")}
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-[14px] text-slate-900 focus:border-indigo-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[13px] font-bold text-slate-800 mb-1">
                {T("আপনার জেলা", "Your District")}
              </label>
              <select
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-[14px] text-slate-900 focus:border-indigo-600 focus:outline-none"
              >
                {BD_DISTRICTS.map((d) => (
                  <option key={d.en} value={d.en}>
                    {bn ? d.bn : d.en}
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-[13px] font-bold text-slate-800 mb-1">
                {T("প্রতিপক্ষের নাম ও সম্পর্ক (যদি থাকে)", "Opponent Name & Relation (If any)")}
              </label>
              <input
                type="text"
                value={opponent}
                onChange={(e) => setOpponent(e.target.value)}
                placeholder={T("যেমন: স্বামী / প্রতিবেশী / জমির অংশীদার", "e.g., Husband / Neighbor / Co-sharer")}
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-[14px] text-slate-900 focus:border-indigo-600 focus:outline-none"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-[13px] font-bold text-slate-800 mb-1">
                {T("মূল সমস্যা ও যা চান (৩-৪ লাইনে সংক্ষেপে)", "Brief Summary of Problem and What You Seek")}
              </label>
              <textarea
                rows={3}
                value={issueSummary}
                onChange={(e) => setIssueSummary(e.target.value)}
                placeholder={T(
                  "যেমন: বিগত ৬ মাস যাবত আমার স্বামী ভরণপোষণ দিচ্ছেন না এবং বাড়ি থেকে বের করে দিয়েছেন। আমি মীমাংসার মাধ্যমে সন্তানের খরচ ও অধিকার ফিরে পেতে চাই।",
                  "e.g., My husband has denied maintenance for 6 months and locked me out. I seek mediation to secure my child's expenses and my legal rights."
                )}
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-[14px] text-slate-900 focus:border-indigo-600 focus:outline-none leading-relaxed"
              />
            </div>
          </div>

          {/* Action Row */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setBriefMode(false)}
              className="text-[13px] font-semibold text-slate-600 hover:text-indigo-900"
            >
              ← {T("পকেট কার্ডে ফিরে যান", "Back to Pocket Card")}
            </button>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleCopyBrief}
                className="kp-chip !h-9 !text-[13px] font-semibold inline-flex items-center gap-1.5"
              >
                {copied ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                <span>{copied ? T("কপি হয়েছে!", "Copied!") : T("বিবরণী কপি করুন", "Copy Brief")}</span>
              </button>

              <button
                type="button"
                onClick={handlePrint}
                className="kp-btn-primary inline-flex items-center gap-2 px-4 py-2 text-[13.5px]"
              >
                <Printer size={15} />
                <span>{T("১ পাতার বিবরণী প্রিন্ট", "Print 1-Page Brief")}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
