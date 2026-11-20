"use client";

import { useState } from "react";
import Link from "next/link";
import {
  HeartHandshake,
  LandPlot,
  ShieldAlert,
  Briefcase,
  FileCheck,
  Scale,
  ChevronDown,
  ArrowRight,
  ClipboardList,
  Bot,
  Phone,
  Clock,
  FileText,
  AlertTriangle,
} from "lucide-react";
import { LAWS } from "@/lib/legal/data";

interface LegalProblemDiagnoserProps {
  lang?: "bn" | "en";
}

interface ProblemDetail {
  id: string;
  icon: typeof Scale;
  tone: string;
  titleBn: string;
  titleEn: string;
  descBn: string;
  descEn: string;
  lawBn: string;
  lawEn: string;
  lawUrl?: string;
  urgent24HrBn: string[];
  urgent24HrEn: string[];
  adrPotentialBn: string;
  adrPotentialEn: string;
  papersBn: string[];
  papersEn: string[];
  applyTopicId: string;
}

const LEGAL_PROBLEMS: ProblemDetail[] = [
  {
    id: "family",
    icon: HeartHandshake,
    tone: "from-rose-500 to-pink-600 text-rose-700 bg-rose-50 border-rose-200",
    titleBn: "পারিবারিক বিষয়, দেনমোহর ও ভরণপোষণ",
    titleEn: "Family Matters, Dower & Maintenance",
    descBn: "দাম্পত্য কলহ, বিচ্ছেদ, দেনমোহর অনাদায়, সন্তানের অভিভাবকত্ব বা ভরণপোষণ সমস্যা।",
    descEn: "Marital dispute, divorce, unpaid dower, child custody, and child/spouse maintenance.",
    lawBn: LAWS.family_courts_2023.bn,
    lawEn: LAWS.family_courts_2023.en,
    lawUrl: LAWS.family_courts_2023.url,
    urgent24HrBn: [
      "কাবিননামা/নিকাহনামা ও সন্তানের জন্মনিবন্ধনের ফটোকপি নিরাপদ স্থানে রাখুন।",
      "স্বামী বা শ্বশুরবাড়ির সাথে যোগাযোগ ও আর্থিক লেনদেনের রসিদ/মেসেজ প্রমাণ হিসেবে সংরক্ষণ করুন।",
      "শারীরিক নির্যাতনের ঝুঁকি থাকলে তাৎক্ষণিক ১০৯ (নারী নির্যাতন) বা ৯৯৯ নম্বরে কল করুন।",
    ],
    urgent24HrEn: [
      "Keep marriage deed (Kabinnama) and children's birth certificates in a safe place.",
      "Preserve communication, MFS transactions, and maintenance requests as evidence.",
      "If there is threat of physical violence, immediately dial 109 or 999.",
    ],
    adrPotentialBn: "মামলা করার আগেই জেলা লিগ্যাল এইড অফিসে ফ্রি প্রি-কেস মিডিয়েশন (আপস-মীমাংসা) সম্ভব। অধিকাংশ ক্ষেত্রে স্বামী-স্ত্রীকে ডেকে আপসে সম্মানজনক সমাধান করা হয়।",
    adrPotentialEn: "Pre-litigation mediation is freely available at DLAO. In most cases, amicable settlements for maintenance and dower are reached without a court trial.",
    papersBn: ["নিকাহনামা/কাবিননামা ফটোকপি", "সন্তানের জন্মসনদ", "চেয়ারম্যানের নাগরিকত্ব প্রত্যয়ন", "আবেদনকারীর ২ কপি ছবি"],
    papersEn: ["Marriage Certificate (Kabinnama)", "Children's Birth Certificates", "Citizenship Certificate", "2 Passport Photos"],
    applyTopicId: "family",
  },
  {
    id: "land",
    icon: LandPlot,
    tone: "from-emerald-600 to-teal-700 text-emerald-800 bg-emerald-50 border-emerald-200",
    titleBn: "জমিজমা দখল, জাল দলিল ও সীমানা বিরোধ",
    titleEn: "Land Dispossession, Fake Deeds & Boundaries",
    descBn: "জোরপূর্বক জমি দখল, ভুয়া খতিয়ান তৈরি, সীমানা জটিলতা ও ভূমি অপরাধ।",
    descEn: "Illegal encroachment, fraudulent deeds, boundary disputes, and land crimes.",
    lawBn: LAWS.land_crime_2023.bn,
    lawEn: LAWS.land_crime_2023.en,
    lawUrl: LAWS.land_crime_2023.url,
    urgent24HrBn: [
      "জমির খতিয়ান (CS/SA/RS/City/BS) এবং মূল দলিলের সার্টিফাইড কপি সংগ্রহে রাখুন।",
      "জোরপূর্বক দখল বা মারামারির চেষ্টা হলে তাৎক্ষণিক সংশ্লিষ্ট থানায় জিডি (সাধারণ ডায়েরি) করুন।",
      "১৬১২২ (ভূমি সেবা হটলাইন)-এ কল করে আপনার খতিয়ান ও রেকর্ড যাচাই করে নিন।",
    ],
    urgent24HrEn: [
      "Collect certified copies of record-of-rights (Khatian) and registered deeds.",
      "If there is threat of forceful possession, immediately file a General Diary (GD) at the police station.",
      "Call 16122 (Land Hotline) to check records and mutation authenticity.",
    ],
    adrPotentialBn: "সীমানা ও দখল বিরোধের ক্ষেত্রে স্থানীয় ভূমি জরিপকারী (আমিন) ও উভয় পক্ষের উপস্থিতিতে লিগ্যাল এইড মধ্যস্থতায় আদালতের দীর্ঘসূত্রিতা ছাড়াই সীমানা নির্ধারণ সম্ভব।",
    adrPotentialEn: "Boundary disputes can be peacefully surveyed and settled through DLAO mediation without spending years in court civil suits.",
    papersBn: ["জমির রেজিস্ট্রি দলিলের কপি", "হালনাগাদ খতিয়ান/পরচা", "ভূমি উন্নয়ন করের দাখিলা", "থানার জিডি কপি (যদি থাকে)"],
    papersEn: ["Deed certified copy", "Updated Khatian", "Land tax receipt (Dakhila)", "Police GD copy (if any)"],
    applyTopicId: "agri_land",
  },
  {
    id: "violence",
    icon: ShieldAlert,
    tone: "from-amber-600 to-red-600 text-amber-900 bg-amber-50 border-amber-200",
    titleBn: "নারী ও শিশু নির্যাতন, যৌতুক ও পারিবারিক সুরক্ষা",
    titleEn: "Domestic Abuse, Dowry & Child Protection",
    descBn: "শারীরিক বা মানসিক নির্যাতন, যৌতুকের দাবি, ইভটিজিং ও পারিবারিক সহিংসতা।",
    descEn: "Physical or mental cruelty, dowry extortion, harassment, and domestic abuse.",
    lawBn: LAWS.domestic_violence_2010.bn,
    lawEn: LAWS.domestic_violence_2010.en,
    lawUrl: LAWS.domestic_violence_2010.url,
    urgent24HrBn: [
      "জীবন ঝুঁকিতে থাকলে কালবিলম্ব না করে সরাসরি ৯৯৯ (পুলিশ) অথবা ১০৯ নম্বরে কল করুন।",
      "শারীরিক আঘাত পেলে নিকটস্থ সরকারি হাসপাতালে যান এবং মেডিকেল সার্টিফিকেট/প্রেসক্রিপশন সংগ্রহ করুন।",
      "পারিবারিক সহিংসতা প্রতিরোধ আইনে সুরক্ষা আদেশ (Protection Order) পাওয়ার অধিকার রয়েছে।",
    ],
    urgent24HrEn: [
      "If life is at risk, immediately dial 999 (Police) or 109 (Women/Child Violence Helpline).",
      "If physically injured, visit a government hospital and secure medical injury certificates.",
      "You have the right to an emergency Protection Order under the Domestic Violence Act.",
    ],
    adrPotentialBn: "সহিংসতা বা মারধরের ক্ষেত্রে কোনো জোরপূর্বক সমঝোতা চাপানো হয় না। তবে ভুক্তভোগী চাইলে নিরাপত্তা নিশ্চিত করে দেনমোহর বা আলাদা বসবাসের শর্তে আইনগত সহায়তা পায়।",
    adrPotentialEn: "Mediation is never forced in violent situations. Protection orders and free court panel lawyers are prioritized immediately for safety.",
    papersBn: ["হাসপাতালের চিকিৎসা ও ইনজুরি সনদ", "থানার জিডি বা অভিযোগের কপি", "জাতীয় পরিচয়পত্র", "নির্যাতন ও যৌতুক দাবির প্রমাণ"],
    papersEn: ["Medical injury certificates", "Police GD or complaint copy", "NID copy", "Evidence of extortion/threats"],
    applyTopicId: "family",
  },
  {
    id: "labour",
    icon: Briefcase,
    tone: "from-blue-600 to-indigo-700 text-blue-900 bg-blue-50 border-blue-200",
    titleBn: "শ্রমিক অধিকার, বকেয়া মজুরি ও অন্যায় বরখাস্ত",
    titleEn: "Labor Rights, Unpaid Wages & Termination",
    descBn: "গার্মেন্টস বা কারখানায় বকেয়া বেতন, বিনা নোটিশে চাকরিচ্যুতি, বা কর্মক্ষেত্রে দুর্ঘটনা।",
    descEn: "Unpaid factory wages, arbitrary dismissal without compensation, and workplace injury.",
    lawBn: LAWS.labour_2006.bn,
    lawEn: LAWS.labour_2006.en,
    lawUrl: LAWS.labour_2006.url,
    urgent24HrBn: [
      "কারখানার নিয়োগপত্র (Appointment Letter), হাজিরা কার্ড বা পরিচয়পত্র সাবধানে রাখুন।",
      "বেতনের স্লিপ, পে-স্লিপ, বিকাশ/রকেট মেসেজ বা সহকর্মীদের সাক্ষ্য সংগ্রহ করুন।",
      "চাকরিচ্যুতির ক্ষেত্রে শ্রম আদালতে যাওয়ার নির্ধারিত সময়সীমা (আইনি নোটিশ) মেনে চলা জরুরি।",
    ],
    urgent24HrEn: [
      "Safeguard your factory appointment letter, worker ID card, and punch records.",
      "Preserve pay slips, MFS salary SMS, or coworker witness contact info.",
      "Observe statutory limitation periods for filing grievance notices under Labor Law.",
    ],
    adrPotentialBn: "শ্রম লিগ্যাল এইড সেলে কারখানা কর্তৃপক্ষের সাথে শ্রম অধিদপ্তরের সহায়তায় অধিকাংশ বকেয়া বেতন ও ক্ষতিপূরণ সালিশের মাধ্যমে দ্রুত আদায় করা হয়।",
    adrPotentialEn: "Specialized Labor Legal Aid cells settle most unpaid wage and compensation claims quickly through arbitration without long litigation.",
    papersBn: ["কারখানার পরিচয়পত্র (Worker ID)", "নিয়োগপত্র বা সার্ভিস বুক", "বেতন রসিদ বা ব্যাংক স্টেটমেন্ট", "টার্মিনেশন বা ছাঁটাই চিঠি"],
    papersEn: ["Worker ID Card", "Appointment Letter", "Pay slips or bank records", "Termination letter"],
    applyTopicId: "other",
  },
  {
    id: "cheque",
    icon: FileCheck,
    tone: "from-violet-600 to-purple-700 text-violet-900 bg-violet-50 border-violet-200",
    titleBn: "চেক বাউন্স, প্রতারণা ও পাওনা টাকা আদায়",
    titleEn: "Cheque Dishonor, Fraud & Debt Recovery",
    descBn: "ব্যবসায়িক বা ব্যক্তিগত চেকে টাকা না থাকা, চেক বাউন্স বা আর্থিক প্রতারণা।",
    descEn: "Bounced cheque for insufficient funds, cheque dishonor, and financial breach.",
    lawBn: LAWS.negotiable_instruments_1881.bn,
    lawEn: LAWS.negotiable_instruments_1881.en,
    lawUrl: LAWS.negotiable_instruments_1881.url,
    urgent24HrBn: [
      "ব্যাংক থেকে চেক ডিজঅনার স্লিপ (Cheque Dishonor Memo) সাথে সাথে সংগ্রহ করুন।",
      "ডিজঅনার হওয়ার ৩০ দিনের মধ্যে আইনজীবীর মাধ্যমে বা লিগ্যাল এইডের সহায়তায় লিগ্যাল নোটিশ পাঠাতে হবে।",
      "আইনি নোটিশ প্রাপ্তির ৩০ দিন পর থেকে পরবর্তী ৩০ দিনের মধ্যে আদালতে মামলা দায়ের করতে হয়।",
    ],
    urgent24HrEn: [
      "Obtain the Bank Dishonor Memo immediately upon return of the cheque.",
      "Send a formal Legal Notice within 30 days of the dishonor memo date.",
      "Strict 30-day statutory limitation applies for filing court cases under the NI Act.",
    ],
    adrPotentialBn: "চেক ডিজঅনার মামলায় লিগ্যাল এইড অফিসার দেনাদার ও পাওনাদারকে ডেকে কিস্তিতে টাকা পরিশোধের নিরাপদ লিখিত আপসনামা করে দেন।",
    adrPotentialEn: "DLAO mediation allows creditors and debtors to establish a structured, legally stamped installment repayment agreement.",
    papersBn: ["মূল ব্যাংক চেক ও ডিজঅনার মেমো", "আইনি নোটিশের কপি ও রেজিস্ট্রি ডাক রসিদ", "লেনদেনের চুক্তিপত্র বা রসিদ", "আবেদনকারীর এনআইডি"],
    papersEn: ["Original cheque & bank dishonor memo", "Legal notice copy & registered postal receipt", "Transaction proof", "Applicant NID"],
    applyTopicId: "cheque",
  },
  {
    id: "inheritance",
    icon: Scale,
    tone: "from-amber-700 to-yellow-800 text-amber-950 bg-amber-50 border-amber-200",
    titleBn: "উত্তরাধিকার ও এজমালী সম্পত্তি বণ্টন",
    titleEn: "Inheritance, Partition & Joint Property",
    descBn: "পৈতৃক সম্পত্তি থেকে বঞ্চিত করা, ওয়ারিশদের মাঝে অংশ না দেওয়া, বাটোয়ারা জটিলতা।",
    descEn: "Deprivation of ancestral share, co-sharer exclusion, and property partition dispute.",
    lawBn: LAWS.partition_1893.bn,
    lawEn: LAWS.partition_1893.en,
    lawUrl: LAWS.partition_1893.url,
    urgent24HrBn: [
      "পিতা/মাতার মৃত্যুর সনদ এবং সংশ্লিষ্ট ইউনিয়ন পরিষদ বা কাউন্সিলর অফিস থেকে ওয়ারিশান সনদ নিন।",
      "পৈতৃক সমস্ত সম্পত্তির খতিয়ান ও আরএস/বিএস রেকর্ডের তথ্য গুছিয়ে রাখুন।",
      "অন্য শরিকরা জমি বিক্রি বা রূপান্তর করতে চাইলে তাৎক্ষণিক লিগ্যাল নোটিশ বা আপত্তি জানাতে পারেন।",
    ],
    urgent24HrEn: [
      "Collect parent's death certificate and legal heirship certificate from the local councillor/chairman.",
      "Assemble land records (CS/RS/BS) for all joint ancestral properties.",
      "If a co-sharer attempts unauthorized sale, issue a formal objection or pre-emption notice.",
    ],
    adrPotentialBn: "বাটোয়ারা মামলা আদালতে বছরের পর বছর চলে। লিগ্যাল এইড অফিসের মাধ্যমে নিরপেক্ষ সার্ভেয়ার এনে শরিকদের উপস্থিতিতে শান্তিপূর্ণ বণ্টননামা করা যায়।",
    adrPotentialEn: "Court partition suits can drag on for decades. DLAO ADR mediation brings all heirs together to reach an amicable registered partition.",
    papersBn: ["ইউনিয়ন বা পৌরসভা ওয়ারিশান সনদ", "পিতামাতার মৃত্যুসনদ", "সম্পত্তির মূল দলিল ও খতিয়ান", "সকল ওয়ারিশের নাম ও ঠিকানা"],
    papersEn: ["Legal Heirship Certificate", "Parents Death Certificate", "Property deeds and Khatians", "List of co-heirs"],
    applyTopicId: "inheritance",
  },
];

export function LegalProblemDiagnoser({ lang = "bn" }: LegalProblemDiagnoserProps) {
  const bn = lang === "bn";
  const T = (b: string, e: string) => (bn ? b : e);

  const [activeProblemId, setActiveProblemId] = useState<string>("family");

  const activeProblem = LEGAL_PROBLEMS.find((p) => p.id === activeProblemId) || LEGAL_PROBLEMS[0];
  const Icon = activeProblem.icon;

  return (
    <section aria-labelledby="lg-diag-h" className="lg-card space-y-6" data-testid="legal-diagnoser">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="kp-eyebrow">{T("আইনি অধিকার ও রোডম্যাপ", "Legal rights & roadmap")}</p>
          <h2 id="lg-diag-h" className="mt-1 text-[clamp(21px,3vw,28px)] font-semibold leading-tight text-slate-900">
            {T("আপনার সমস্যার ক্ষেত্র ও করণীয় গাইড", "Identify Your Legal Problem & Action Guide")}
          </h2>
          <p className="mt-1 max-w-[64ch] text-[15px] leading-relaxed text-slate-700">
            {T(
              "নিচের যেকোনো একটি বিষয়ে ট্যাপ করুন। সংশ্লিষ্ট আইন, জরুরি প্রথম পদক্ষেপ, আপস-মীমাংসার সুযোগ ও প্রয়োজনীয় কাগজের তালিকা দেখে নিন।",
              "Tap any category below to inspect applicable laws, 24-hour protective steps, ADR mediation options, and necessary documents."
            )}
          </p>
        </div>
      </div>

      {/* Grid of 6 problem cards */}
      <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
        {LEGAL_PROBLEMS.map((problem) => {
          const PIcon = problem.icon;
          const isSelected = activeProblemId === problem.id;
          return (
            <button
              key={problem.id}
              type="button"
              onClick={() => setActiveProblemId(problem.id)}
              className={`flex items-start gap-3 rounded-2xl border p-3.5 text-left transition-all duration-200 ${
                isSelected
                  ? "border-indigo-600 bg-white ring-2 ring-indigo-500/25 shadow-md scale-[1.01]"
                  : "border-slate-200/90 bg-white hover:border-indigo-300 hover:shadow-xs"
              }`}
            >
              <span
                className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br ${
                  isSelected ? "bg-indigo-900 text-white shadow-xs" : "bg-slate-100 text-slate-700"
                }`}
                aria-hidden
              >
                <PIcon size={20} />
              </span>
              <div className="min-w-0 flex-1">
                <span className="block text-[15px] font-bold leading-snug text-slate-900">
                  {bn ? problem.titleBn : problem.titleEn}
                </span>
                <span className="mt-1 block text-[12.5px] leading-relaxed text-slate-600 line-clamp-2">
                  {bn ? problem.descBn : problem.descEn}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Detailed Action Blueprint for Selected Category */}
      <div className="rounded-2xl border-2 border-indigo-200 bg-gradient-to-br from-indigo-50/40 via-white to-amber-50/20 p-5 sm:p-6 shadow-xs space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-indigo-100 pb-4">
          <div className="flex items-center gap-3">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-indigo-900 text-white shadow-xs">
              <Icon size={24} />
            </span>
            <div>
              <span className="text-[12px] font-bold uppercase tracking-wider text-indigo-700">
                {T("নির্বাচিত সমস্যার সমাধান ব্লুপ্রিন্ট", "Selected Problem Action Blueprint")}
              </span>
              <h3 className="text-xl sm:text-2xl font-bold text-slate-900">
                {bn ? activeProblem.titleBn : activeProblem.titleEn}
              </h3>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-indigo-200 bg-white px-3 py-1 text-[12.5px] font-semibold text-indigo-900 shadow-2xs">
              ⚖️ {bn ? activeProblem.lawBn : activeProblem.lawEn}
            </span>
            {activeProblem.lawUrl && (
              <a
                href={activeProblem.lawUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[12px] font-medium text-indigo-700 hover:underline"
              >
                {T("আইনের মূল পাঠ", "Statute Text")}
              </a>
            )}
          </div>
        </div>

        {/* 3 Columns: Immediate 24hr action, ADR potential, Required Papers */}
        <div className="grid gap-4 md:grid-cols-3">
          {/* Col 1: Immediate Steps */}
          <div className="rounded-xl border border-rose-200/90 bg-rose-50/40 p-4 space-y-2">
            <div className="flex items-center gap-2 text-rose-900 font-bold text-[14px]">
              <Clock size={16} className="text-rose-600" />
              <span>{T("প্রথম ২৪-৪৮ ঘণ্টার করণীয়", "First 24-48 Hours Checklist")}</span>
            </div>
            <ul className="space-y-1.5 text-[13px] text-slate-700">
              {(bn ? activeProblem.urgent24HrBn : activeProblem.urgent24HrEn).map((step, idx) => (
                <li key={idx} className="flex items-start gap-1.5">
                  <span className="text-rose-600 font-bold">•</span>
                  <span>{step}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Col 2: Out of court ADR */}
          <div className="rounded-xl border border-emerald-200/90 bg-emerald-50/40 p-4 space-y-2">
            <div className="flex items-center gap-2 text-emerald-950 font-bold text-[14px]">
              <HeartHandshake size={16} className="text-emerald-700" />
              <span>{T("আদালতের বাইরে আপস-মীমাংসা (ADR)", "Out-of-Court ADR Mediation")}</span>
            </div>
            <p className="text-[13px] leading-relaxed text-slate-700">
              {bn ? activeProblem.adrPotentialBn : activeProblem.adrPotentialEn}
            </p>
          </div>

          {/* Col 3: Papers to prepare */}
          <div className="rounded-xl border border-amber-200/90 bg-amber-50/40 p-4 space-y-2">
            <div className="flex items-center gap-2 text-amber-950 font-bold text-[14px]">
              <FileText size={16} className="text-amber-700" />
              <span>{T("প্রয়োজনীয় কাগজপত্র", "Papers to Prepare")}</span>
            </div>
            <ul className="space-y-1.5 text-[13px] text-slate-700">
              {(bn ? activeProblem.papersBn : activeProblem.papersEn).map((doc, idx) => (
                <li key={idx} className="flex items-start gap-1.5">
                  <span className="text-amber-700 font-bold">✓</span>
                  <span>{doc}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Action Buttons row */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-indigo-100/80">
          <p className="text-[13px] text-slate-600">
            {T(
              "আপনার নিজের কোনো খরচ নেই — সমস্ত আইনি সহায়তা ও প্যানেল আইনজীবীর ফি সরকার বহন করে।",
              "You incur no cost — the government covers legal aid and court panel lawyer fees."
            )}
          </p>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/legal/apply?topic=${encodeURIComponent(activeProblem.applyTopicId)}`}
              className="kp-btn-primary inline-flex items-center gap-2 px-4 py-2 !text-[13.5px]"
            >
              <ClipboardList size={16} />
              <span>{T("আবেদনের খসড়া তৈরি করুন", "Prepare Application Draft")}</span>
              <ArrowRight size={14} />
            </Link>

            <Link
              href={`/legal/assistant?topic=${encodeURIComponent(activeProblem.applyTopicId)}`}
              className="kp-btn-ghost inline-flex items-center gap-1.5 px-3 py-2 !text-[13.5px]"
            >
              <Bot size={15} />
              <span>{T("এআই সহকারীর পরামর্শ", "Ask AI Assistant")}</span>
            </Link>

            <a
              href="tel:16699"
              className="kp-btn-ghost inline-flex items-center gap-1.5 px-3 py-2 !text-[13.5px]"
            >
              <Phone size={15} />
              <span>{T("১৬৬৯৯ কল করুন", "Call 16699")}</span>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
