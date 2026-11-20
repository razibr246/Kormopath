"use client";

import { useState } from "react";
import { CheckSquare, Square, Printer, CheckCircle2, FileCheck2, Sparkles, AlertCircle } from "lucide-react";

interface InteractiveDocumentChecklistProps {
  lang?: "bn" | "en";
}

interface ChecklistItem {
  id: string;
  category: "general" | "family" | "land" | "money";
  categoryBn: string;
  categoryEn: string;
  titleBn: string;
  titleEn: string;
  whyBn: string;
  whyEn: string;
}

const DEFAULT_CHECKLIST: ChecklistItem[] = [
  {
    id: "nid",
    category: "general",
    categoryBn: "মৌলিক কাগজপত্র",
    categoryEn: "Basic Documents",
    titleBn: "জাতীয় পরিচয়পত্র (NID) বা জন্মনিবন্ধনের ফটোকপি",
    titleEn: "National ID (NID) or Birth Certificate Copy",
    whyBn: "আবেদনকারীর পরিচয় ও নাগরিকত্ব নিশ্চিত করার জন্য প্রয়োজন।",
    whyEn: "Required to verify applicant identity and citizenship.",
  },
  {
    id: "chairmanship",
    category: "general",
    categoryBn: "মৌলিক কাগজপত্র",
    categoryEn: "Basic Documents",
    titleBn: "ইউনিয়ন চেয়ারম্যান বা কাউন্সিলরের প্রত্যয়নপত্র",
    titleEn: "Chairman / Ward Councillor Certificate",
    whyBn: "নাগরিকত্ব ও আর্থিকভাবে অসচ্ছলতার প্রমাণের জন্য (শর্ত শিথিলের ক্ষেত্রে অত্যন্ত সহায়ক)।",
    whyEn: "Proves local residence and financial insolvency for legal aid eligibility.",
  },
  {
    id: "photos",
    category: "general",
    categoryBn: "মৌলিক কাগজপত্র",
    categoryEn: "Basic Documents",
    titleBn: "পাসপোর্ট সাইজ রঙিন ছবি (২ কপি)",
    titleEn: "Passport Size Color Photos (2 Copies)",
    whyBn: "লিগ্যাল এইড আবেদন ফরম এবং কোর্ট ফাইল নথিতে সংযুক্ত করার জন্য।",
    whyEn: "To attach with the legal aid application form and case file.",
  },
  {
    id: "kabinnama",
    category: "family",
    categoryBn: "পারিবারিক ও দেনমোহর",
    categoryEn: "Family Matters",
    titleBn: "নিকাহনামা / কাবিননামা বা তালাকের নোটিশ",
    titleEn: "Marriage Deed (Kabinnama) / Divorce Notice",
    whyBn: "দেনমোহরের অঙ্ক, বিয়ের তারিখ ও শর্তাবলি প্রমাণের মূল নথি।",
    whyEn: "Primary legal evidence of dower amount, marriage date, and terms.",
  },
  {
    id: "child_birth",
    category: "family",
    categoryBn: "পারিবারিক ও দেনমোহর",
    categoryEn: "Family Matters",
    titleBn: "সন্তানের অনলাইন জন্মনিবন্ধন সনদ",
    titleEn: "Children's Digital Birth Registration Certificate",
    whyBn: "সন্তানের ভরণপোষণ ও অভিভাবকত্ব অধিকার প্রতিষ্ঠার প্রমাণ।",
    whyEn: "Required for child maintenance claims and custody evaluation.",
  },
  {
    id: "khatian",
    category: "land",
    categoryBn: "জমিজমা বিরোধ",
    categoryEn: "Land & Property",
    titleBn: "হালনাগাদ খতিয়ান বা পরচার সার্টিফাইড কপি",
    titleEn: "Updated Khatian / Record-of-Rights Certified Copy",
    whyBn: "জমির প্রকৃত মালিকানা ও রেকর্ড প্রমাণের জন্য অপরিহার্য।",
    whyEn: "Essential proof of legal title, mutations, and land ownership.",
  },
  {
    id: "deed",
    category: "land",
    categoryBn: "জমিজমা বিরোধ",
    categoryEn: "Land & Property",
    titleBn: "জমির মূল রেজিস্ট্রি দলিল বা সার্টিফাইড নকল",
    titleEn: "Original Land Deed or Certified True Copy",
    whyBn: "জমির সীমানা ও কেনাবেচার বৈধ হস্তান্তরের প্রমাণ।",
    whyEn: "Proves legal boundaries and valid transfer of real estate.",
  },
  {
    id: "cheque_slip",
    category: "money",
    categoryBn: "টাকা ও চেক ডিজঅনার",
    categoryEn: "Money & Cheque",
    titleBn: "ব্যাংক চেক ও ডিজঅনার মেমোর মূল কপি",
    titleEn: "Original Bank Cheque & Dishonor Return Memo",
    whyBn: "এনআই অ্যাক্ট ১৩৮ ধারায় মামলা করার জন্য ব্যাংক স্লিপ বাধ্যতামূলক।",
    whyEn: "Bank memo is mandatory proof for NI Act Section 138 filings.",
  },
];

export function InteractiveDocumentChecklist({ lang = "bn" }: InteractiveDocumentChecklistProps) {
  const bn = lang === "bn";
  const T = (b: string, e: string) => (bn ? b : e);

  const [checkedIds, setCheckedIds] = useState<Record<string, boolean>>({
    nid: true, // Sample pre-check
  });

  const [activeCategoryFilter, setActiveCategoryFilter] = useState<string>("all");

  const toggleCheck = (id: string) => {
    setCheckedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const filteredItems = DEFAULT_CHECKLIST.filter((item) => {
    if (activeCategoryFilter === "all") return true;
    return item.category === activeCategoryFilter;
  });

  const totalFiltered = filteredItems.length;
  const completedCount = filteredItems.filter((i) => checkedIds[i.id]).length;
  const percentage = totalFiltered > 0 ? Math.round((completedCount / totalFiltered) * 100) : 0;

  const handlePrint = () => {
    window.print();
  };

  return (
    <section aria-labelledby="lg-checklist-h" className="lg-card space-y-5" data-testid="legal-doc-checklist">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="kp-eyebrow">{T("অফিসে যাওয়ার পূর্বপ্রস্তুতি", "Preparation before visiting office")}</p>
          <h2 id="lg-checklist-h" className="mt-1 text-[clamp(21px,3vw,28px)] font-semibold leading-tight text-slate-900">
            {T("প্রয়োজনীয় কাগজপত্রের চেকলিস্ট", "Document Readiness Checklist")}
          </h2>
          <p className="mt-1 max-w-[64ch] text-[15px] leading-relaxed text-slate-700">
            {T(
              "লিগ্যাল এইড অফিসে যাওয়ার আগে প্রয়োজনীয় কাগজপত্রে টিক দিয়ে প্রস্তুতি দেখে নিন। কোনো ফাইল আপলোড করা লাগবে না — এটি কেবল আপনার নিজের সুবিধার জন্য।",
              "Tick the documents you have prepared before visiting the legal aid office. No files are uploaded — this is purely an on-device personal checklist."
            )}
          </p>
        </div>

        <button
          type="button"
          onClick={handlePrint}
          className="kp-btn-ghost inline-flex items-center gap-1.5 px-3 py-1.5 !text-[13.5px]"
          title={T("চেকলিস্ট প্রিন্ট করুন", "Print Checklist")}
        >
          <Printer size={15} />
          <span>{T("চেকলিস্ট প্রিন্ট", "Print Checklist")}</span>
        </button>
      </div>

      {/* Progress Bar & Filter Tabs */}
      <div className="rounded-2xl border border-indigo-100 bg-indigo-50/50 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <FileCheck2 size={18} className="text-indigo-700" />
            <span className="font-bold text-[14px] text-slate-900">
              {T("আপনার প্রস্তুতি অগ্রগতি:", "Your Preparation Progress:")}
            </span>
            <span className="rounded-md bg-indigo-900 px-2 py-0.5 text-[12px] font-bold text-white font-mono">
              {bn ? `${completedCount} / ${totalFiltered}টি প্রস্তুত (${percentage}%)` : `${completedCount} / ${totalFiltered} ready (${percentage}%)`}
            </span>
          </div>

          <div className="flex flex-wrap gap-1.5 text-[12.5px]">
            {[
              { id: "all", bn: "সব কাগজ", en: "All" },
              { id: "general", bn: "মৌলিক (সবার)", en: "Basic" },
              { id: "family", bn: "পারিবারিক", en: "Family" },
              { id: "land", bn: "জমিজমা", en: "Land" },
              { id: "money", bn: "চেক ও টাকা", en: "Cheque" },
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setActiveCategoryFilter(f.id)}
                className={`rounded-lg px-2.5 py-1 font-semibold transition-all ${
                  activeCategoryFilter === f.id
                    ? "bg-indigo-900 text-white shadow-2xs"
                    : "bg-white text-slate-700 hover:bg-slate-100 border border-slate-200"
                }`}
              >
                {bn ? f.bn : f.en}
              </button>
            ))}
          </div>
        </div>

        {/* Progress bar line */}
        <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-slate-200">
          <div
            className="h-full bg-gradient-to-r from-indigo-600 to-emerald-600 transition-all duration-300"
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>

      {/* Interactive Item List */}
      <div className="grid gap-2.5 sm:grid-cols-2">
        {filteredItems.map((item) => {
          const isDone = Boolean(checkedIds[item.id]);
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => toggleCheck(item.id)}
              className={`flex items-start gap-3 rounded-2xl border p-3.5 text-left transition-all duration-150 ${
                isDone
                  ? "border-emerald-500 bg-emerald-50/50 shadow-2xs"
                  : "border-slate-200 bg-white hover:border-slate-300"
              }`}
            >
              <span className="mt-0.5 shrink-0 text-emerald-700" aria-hidden>
                {isDone ? (
                  <CheckSquare size={20} className="text-emerald-700 fill-emerald-100" />
                ) : (
                  <Square size={20} className="text-slate-400" />
                )}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className={`text-[14.5px] font-bold leading-snug ${isDone ? "text-emerald-950 line-through opacity-80" : "text-slate-900"}`}>
                    {bn ? item.titleBn : item.titleEn}
                  </span>
                </div>
                <span className="mt-1 block text-[12px] leading-relaxed text-slate-500">
                  {bn ? item.whyBn : item.whyEn}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-2 rounded-xl bg-amber-50 p-3 text-[12.5px] text-amber-900 border border-amber-200">
        <AlertCircle size={16} className="shrink-0 text-amber-700" />
        <span>
          {T(
            "কোনো কাগজ প্রস্তুত না থাকলেও অফিসে যেতে দ্বিধা করবেন না — জেলা লিগ্যাল এইড অফিসার আপনাকে প্রয়োজনীয় সনদ সংগ্রহের পরামর্শ দেবেন।",
            "Even if you are missing some documents, do not hesitate to visit — the District Legal Aid Officer will guide you on how to collect them."
          )}
        </span>
      </div>
    </section>
  );
}
