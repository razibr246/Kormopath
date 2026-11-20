"use client";

import { useState } from "react";
import {
  MailWarning,
  AlertOctagon,
  CheckCircle2,
  PhoneCall,
  Clock,
  Building2,
  FileSearch,
  Scale,
  Calendar,
  ShieldCheck,
  ChevronRight,
} from "lucide-react";
import Link from "next/link";
import { SourceTag } from "@/components/layout/AppHeader";
import { NLASO_LEGAL_AID_PAGE, HELPLINES } from "@/lib/legal/data";

interface SummonsActionGuideProps {
  lang?: "bn" | "en";
}

export function SummonsActionGuide({ lang = "bn" }: SummonsActionGuideProps) {
  const bn = lang === "bn";
  const T = (b: string, e: string) => (bn ? b : e);

  const [activeStep, setActiveStep] = useState<number>(1);
  const legalAid = HELPLINES.find((h) => h.id === "legal_aid");

  return (
    <section
      aria-labelledby="lg-summons-h"
      className="lg-card space-y-6 border-amber-200/90 shadow-sm"
      data-testid="summons-action-guide"
    >
      {/* Top Header */}
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-xl bg-amber-100 text-amber-900">
              <MailWarning size={17} aria-hidden />
            </span>
            <p className="kp-eyebrow">{T("জরুরি নাগরিক দিকনির্দেশনা", "Urgent Citizen Protocol")}</p>
          </div>
          <h2
            id="lg-summons-h"
            className="mt-1 text-[clamp(21px,3vw,28px)] font-bold leading-tight text-slate-900"
          >
            {T(
              "আদালতের সমন বা আইনি নোটিশ পেলে কী করবেন?",
              "What to Do If You Receive a Court Summons or Legal Notice"
            )}
          </h2>
          <p className="mt-1.5 max-w-[65ch] text-[14.5px] leading-relaxed text-slate-600">
            {T(
              "ডাকপিয়ন বা পুলিশ এসে আদালতে হাজিরার কাগজ ধরিয়ে দিলে আতঙ্কিত হবেন না। সঠিক আইনি পদক্ষেপ জানলে আপনি বিনামূল্যে সরকারি আইনজীবীর সহায়তা নিয়ে নিজের অধিকার রক্ষা করতে পারবেন।",
              "Do not panic if you receive a court summons or legal letter. Knowing the proper protocol enables you to secure a free government advocate to defend your rights."
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

      {/* 3 Fatal Mistakes Callout */}
      <div className="rounded-2xl border-2 border-red-200 bg-red-50/70 p-5">
        <div className="flex items-start gap-3">
          <AlertOctagon size={24} className="shrink-0 text-red-600 mt-0.5" />
          <div className="space-y-1.5">
            <h3 className="text-[16px] font-bold text-red-950">
              {T("৩টি মারাত্মক ভুল যা কখনো করবেন না:", "3 Fatal Mistakes You Must Avoid:")}
            </h3>
            <ul className="grid gap-2 text-[14px] text-red-900 sm:grid-cols-3">
              <li className="rounded-xl border border-red-200/80 bg-white/80 p-3">
                <strong>১. নোটিশ উপেক্ষা করা:</strong>{" "}
                {T(
                  "কাগজ ফেলে রাখলে আদালত আপনার অনুপস্থিতিতে একতরফা রায় দিতে পারে।",
                  "Ignoring it may result in an ex-parte ruling against you."
                )}
              </li>
              <li className="rounded-xl border border-red-200/80 bg-white/80 p-3">
                <strong>২. ভয় পেয়ে পালিয়ে থাকা:</strong>{" "}
                {T(
                  "পলাতক হলে গ্রেপ্তারি পরোয়ানা জারি হতে পারে। আইনগত মোকাবিলাই নিরাপদ।",
                  "Absconding leads to warrants; legal representation protects you."
                )}
              </li>
              <li className="rounded-xl border border-red-200/80 bg-white/80 p-3">
                <strong>৩. দালাল ধরে টাকা খরচ:</strong>{" "}
                {T(
                  "কোনো মধ্যস্বত্বভোগী নয়, সরকার আপনাকে বিনামূল্যে আইনজীবী দেবে।",
                  "Never pay middlemen; the state provides free defense."
                )}
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Interactive 3-Step Proper Action Flow */}
      <div className="space-y-4">
        <h3 className="text-[17px] font-bold text-slate-900 flex items-center gap-2">
          <ShieldCheck size={19} className="text-emerald-700" />
          {T("নিরাপদ ৩টি পদক্ষেপের ধারাবাহিক নিয়ম:", "The 3 Proper Action Steps:")}
        </h3>

        <div className="grid gap-4 sm:grid-cols-3">
          {/* Step 1 */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 flex flex-col justify-between">
            <div>
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-indigo-100 text-[13px] font-bold text-indigo-900 mb-3">
                ১
              </span>
              <h4 className="text-[16px] font-bold text-slate-900">
                {T("কাগজটির মূল তথ্য নোট করুন", "Identify Key Information")}
              </h4>
              <p className="mt-2 text-[13.5px] text-slate-600 leading-relaxed">
                {T(
                  "সমনের উপরে কোন আদালতের নাম (যেমন: ১ম সহকারী জজ আদালত), মামলার নম্বর, এবং পরবর্তী হাজিরার কোন তারিখ দেওয়া আছে তা স্পষ্টভাবে খেয়াল করুন।",
                  "Note the exact Court Name, Case Number, and the Next Scheduled Hearing Date printed on the paper."
                )}
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 text-[12.5px] font-medium text-indigo-800">
              {T("টিপ: কাগজের পরিষ্কার ছবি তুলে রাখুন", "Tip: Take a clear photo for backup")}
            </div>
          </div>

          {/* Step 2 */}
          <div className="rounded-2xl border border-indigo-200 bg-indigo-50/50 p-5 flex flex-col justify-between">
            <div>
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-indigo-600 text-[13px] font-bold text-white mb-3">
                ২
              </span>
              <h4 className="text-[16px] font-bold text-slate-900">
                {T("তারিখের আগেই লিগ্যাল এইডে যান", "Visit Legal Aid Before Hearing")}
              </h4>
              <p className="mt-2 text-[13.5px] text-slate-600 leading-relaxed">
                {T(
                  "হাজিরার তারিখের অন্তত ৩–৫ দিন পূর্বে সমনটি নিয়ে আপনার জেলা জজ আদালত ভবনের জেলা লিগ্যাল এইড অফিসে চলে যান বা ১৬৬৯৯ ডায়াল করুন।",
                  "At least 3-5 days before the hearing date, visit your District Legal Aid Office with the summons copy or dial 16699."
                )}
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-indigo-100 text-[12.5px] font-medium text-emerald-800 flex items-center gap-1.5">
              <CheckCircle2 size={14} className="text-emerald-600" />
              {T("সরকার বিনামূল্যে আইনজীবী বরাদ্দ দেবে", "Free panel advocate assigned")}
            </div>
          </div>

          {/* Step 3 */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 flex flex-col justify-between">
            <div>
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-slate-900 text-[13px] font-bold text-white mb-3">
                ৩
              </span>
              <h4 className="text-[16px] font-bold text-slate-900">
                {T("আইনজীবীর মাধ্যমে জবাব দাখিল", "Submit Written Response")}
              </h4>
              <p className="mt-2 text-[13.5px] text-slate-600 leading-relaxed">
                {T(
                  "আপনার জন্য নির্ধারিত সরকারি প্যানেল আইনজীবী আদালতে আপনার পক্ষে হাজিরা দেবেন এবং আইনি জবাব (Written Statement) প্রস্তুত করে কোর্টে দাখিল করবেন।",
                  "Your assigned advocate appears in court on your behalf and submits your formal written defense."
                )}
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 text-[12.5px] font-medium text-slate-600">
              {T("আপনার ব্যক্তিগত খরচ: ০ টাকা", "Your out-of-pocket cost: 0 Taka")}
            </div>
          </div>
        </div>
      </div>

      {/* Emergency Quick Consultation Prompt */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-gradient-to-r from-indigo-900 to-indigo-950 p-5 text-white">
        <div className="min-w-0">
          <h4 className="text-[16.5px] font-bold">
            {T("হাতে আদালতের সমন আছে? এখনই সরকারি পরামর্শ নিন", "Holding a Summons? Get Free Government Guidance Now")}
          </h4>
          <p className="mt-1 text-[13.5px] text-indigo-200 max-w-[60ch]">
            {T(
              "টোল-ফ্রি ১৬৬৯৯ নম্বরে কল করে অফিসিয়াল লিগ্যাল এইড কাউন্সেলরকে সমনের বিবরণ পড়ে শোনান।",
              "Dial toll-free 16699 to read the summons details directly to an official legal counselor."
            )}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {legalAid && (
            <a
              href={`tel:${legalAid.number}`}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-white px-4 text-[14px] font-bold text-indigo-950 hover:bg-indigo-50 shadow-sm"
            >
              <PhoneCall size={16} className="text-emerald-700" />
              <span>{T("১৬৬৯৯ কল করুন", "Dial 16699")}</span>
            </a>
          )}
          <Link
            href="/legal/assistant"
            className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-indigo-400 bg-indigo-800/60 px-4 text-[14px] font-semibold text-white hover:bg-indigo-800"
          >
            <span>{T("অনলাইনে এআই সহকারীকে জিজ্ঞাসা", "Ask Online Assistant")}</span>
            <ChevronRight size={15} />
          </Link>
        </div>
      </div>
    </section>
  );
}
