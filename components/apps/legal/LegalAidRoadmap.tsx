"use client";

import { PhoneCall, FileEdit, Building2, Handshake, ShieldCheck, ArrowRight } from "lucide-react";
import Link from "next/link";

interface LegalAidRoadmapProps {
  lang?: "bn" | "en";
}

interface Step {
  num: string;
  numBn: string;
  icon: typeof PhoneCall;
  titleBn: string;
  titleEn: string;
  descBn: string;
  descEn: string;
  actionTextBn?: string;
  actionTextEn?: string;
  actionHref?: string;
}

const STEPS: Step[] = [
  {
    num: "01",
    numBn: "১",
    icon: PhoneCall,
    titleBn: "১৬৬৯৯ নম্বরে টোল-ফ্রি কথা",
    titleEn: "Call Toll-Free 16699",
    descBn: "যেকোনো মোবাইল অপারেটর থেকে বিনা ব্যালেন্সে ফোন করে আপনার অধিকার ও প্রাথমিক তথ্য জেনে নিন।",
    descEn: "Dial from any phone operator with zero balance to understand your legal rights and local office.",
    actionTextBn: "১৬৬৯৯ কল করুন",
    actionTextEn: "Dial 16699",
    actionHref: "tel:16699",
  },
  {
    num: "02",
    numBn: "২",
    icon: FileEdit,
    titleBn: "সহজ খসড়া ও কাগজপত্র তৈরি",
    titleEn: "Prepare Application Draft",
    descBn: "কর্মপথের গাইডেড উইজার্ডে ৫ মিনিটে নিজের ভাষায় আবেদনের খসড়া প্রস্তুত করে প্রিন্ট নিন।",
    descEn: "Draft a clean, structured application in simple Bangla or English in just 5 minutes on this device.",
    actionTextBn: "আবেদনের খসড়া তৈরি",
    actionTextEn: "Start Draft",
    actionHref: "/legal/apply",
  },
  {
    num: "03",
    numBn: "৩",
    icon: Building2,
    titleBn: "জেলা জজ আদালতে অফিসে জমা",
    titleEn: "Submit at District Court",
    descBn: "আপনার জেলার জজ আদালত প্রাঙ্গণে লিগ্যাল এইড অফিসারের ডেস্কে গিয়ে আবেদনপত্র জমা দিন।",
    descEn: "Hand over your application draft and copies to the District Legal Aid Officer at the court building.",
  },
  {
    num: "04",
    numBn: "৪",
    icon: Handshake,
    titleBn: "মামলা ছাড়াই আপস-মীমাংসা (ADR)",
    titleEn: "Out-of-Court ADR Mediation",
    descBn: "অধিকাংশ পারিবারিক ও জমি বিরোধে উভয় পক্ষকে ডেকে বিচারক কর্মকর্তার সামনে সমঝোতা করা হয়।",
    descEn: "For most civil and family disputes, pre-case mediation resolves issues without going to trial.",
    actionTextBn: "মীমাংসা প্রস্তুতি দেখুন",
    actionTextEn: "Mediation Prep",
    actionHref: "/legal/mediation",
  },
  {
    num: "05",
    numBn: "৫",
    icon: ShieldCheck,
    titleBn: "সরকারি খরচে প্যানেল আইনজীবী",
    titleEn: "Free Court Panel Lawyer",
    descBn: "আপসে নিষ্পত্তি না হলে আদালত মামলার জন্য সরকার বিনামূল্যে অভিজ্ঞ আইনজীবী ও কোর্ট ফি দেয়।",
    descEn: "If mediation does not resolve the dispute, the government assigns a panel lawyer and covers fees.",
  },
];

export function LegalAidRoadmap({ lang = "bn" }: LegalAidRoadmapProps) {
  const bn = lang === "bn";
  const T = (b: string, e: string) => (bn ? b : e);

  return (
    <section aria-labelledby="lg-roadmap-h" className="lg-card space-y-6" data-testid="legal-roadmap">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="kp-eyebrow">{T("সহজ কার্যপ্রণালী", "Step-by-step workflow")}</p>
          <h2 id="lg-roadmap-h" className="mt-1 text-[clamp(21px,3vw,28px)] font-semibold leading-tight text-slate-900">
            {T("সরকারি আইনি সহায়তার ৫টি সহজ ধাপ", "The 5 Simple Steps to Government Legal Aid")}
          </h2>
          <p className="mt-1 max-w-[64ch] text-[15px] leading-relaxed text-slate-700">
            {T(
              "শুরু থেকে শেষ পর্যন্ত কীভাবে একজন সাধারণ নাগরিক সরকারি খরচে আইনি সেবা বা আপস-মীমাংসা পান:",
              "From your first question to court representation or peaceful mediation — how it works:"
            )}
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {STEPS.map((step, idx) => {
          const StepIcon = step.icon;
          return (
            <div
              key={step.num}
              className="relative flex flex-col justify-between rounded-2xl border border-slate-200/90 bg-white p-4 shadow-2xs hover:border-indigo-300 transition-all duration-200 group"
            >
              <div>
                <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                  <span className="font-mono text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md">
                    {T(`ধাপ ${step.numBn}`, `Step ${step.num}`)}
                  </span>
                  <span className="grid h-8 w-8 place-items-center rounded-xl bg-slate-100 text-slate-700 group-hover:bg-indigo-900 group-hover:text-white transition-colors">
                    <StepIcon size={16} />
                  </span>
                </div>

                <h3 className="mt-3 font-bold text-[15px] text-slate-900 leading-snug">
                  {bn ? step.titleBn : step.titleEn}
                </h3>
                <p className="mt-1.5 text-[12.5px] leading-relaxed text-slate-600">
                  {bn ? step.descBn : step.descEn}
                </p>
              </div>

              {step.actionTextBn && step.actionHref && (
                <div className="mt-4 pt-2.5 border-t border-slate-100">
                  {step.actionHref.startsWith("tel:") ? (
                    <a
                      href={step.actionHref}
                      className="inline-flex items-center gap-1 text-[12px] font-bold text-indigo-700 hover:underline"
                    >
                      <span>{bn ? step.actionTextBn : step.actionTextEn}</span>
                      <ArrowRight size={12} />
                    </a>
                  ) : (
                    <Link
                      href={step.actionHref}
                      className="inline-flex items-center gap-1 text-[12px] font-bold text-indigo-700 hover:underline"
                    >
                      <span>{bn ? step.actionTextBn : step.actionTextEn}</span>
                      <ArrowRight size={12} />
                    </Link>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
