"use client";

import { useState } from "react";
import { HelpCircle, ChevronDown, CheckCircle2 } from "lucide-react";

interface LegalFaqAccordionProps {
  lang?: "bn" | "en";
}

interface FaqItem {
  id: string;
  qBn: string;
  qEn: string;
  aBn: string;
  aEn: string;
}

const FAQS: FaqItem[] = [
  {
    id: "fees",
    qBn: "আইনি সহায়তা পেতে কি কাউকে টাকা বা কোনো ধরনের ফি দিতে হয়?",
    qEn: "Do I have to pay any fees or money to get government legal aid?",
    aBn: "না, বাংলাদেশ সরকারের 'আইনগত সহায়তা প্রদান আইন ২০০০' অনুযায়ী লিগ্যাল এইডের সমস্ত সেবা সম্পূর্ণ বিনামূল্যে। আবেদন ফরম, প্যানেল আইনজীবীর ফি, আদালতের কোর্ট ফি এবং মামলার সমস্ত অনুষঙ্গিক খরচ সরকার বহন করে। কাউকে কোনো প্রকার ফি বা বকশিশ দিতে হবে না।",
    aEn: "No. Under the Legal Aid Services Act 2000, all services are completely free. The government pays for the application, court panel lawyers, filing costs, and court fees. Never pay anything to any third party.",
  },
  {
    id: "income",
    qBn: "আমার কোনো চাকরি বা ব্যাংক স্টেটমেন্ট নেই, আমি কি আইনি সহায়তা পাব?",
    qEn: "I have no formal job or bank statement. Can I still qualify?",
    aBn: "হ্যাঁ, অবশ্যই। অসচ্ছল নারী, শিশু, প্রতিবন্ধী ব্যক্তি, প্রবীণ নাগরিক, নির্যাতিতা এবং ভিজিএফ কার্ডধারীদের ক্ষেত্রে কোনো জটিল আয়ের নথিপত্রের প্রয়োজন নেই। স্থানীয় ইউনিয়ন পরিষদ চেয়ারম্যান বা ওয়ার্ড কাউন্সিলরের সাধারণ নাগরিকত্ব ও অসচ্ছলতার প্রত্যয়নপত্রই যথেষ্ট। কে সহায়তা পাবেন তা জেলা লিগ্যাল এইড অফিস বিবেচনা করে ঠিক করবে।",
    aEn: "Yes. For indigent women, children, persons with disabilities, elderly, domestic abuse survivors, and VGF cardholders, formal bank statements are not required. A certificate from your local council chairman is sufficient. The district legal aid office decides.",
  },
  {
    id: "adr",
    qBn: "মামলা না করে কি আদালতে না গিয়ে আপস-মীমাংসা করা সম্ভব?",
    qEn: "Can I resolve my dispute through mediation without filing a lawsuit in court?",
    aBn: "হ্যাঁ! লিগ্যাল এইড আইনের ২১(ক) ধারা অনুযায়ী জেলা লিগ্যাল এইড অফিসার উভয় পক্ষকে নোটিশ দিয়ে ডেকে 'প্রি-কেইস মিডিয়েশন' (মামলার পূর্বেই আপস-মীমাংসা) করিয়ে থাকেন। বিশেষ করে পারিবারিক দেনমোহর, ভরণপোষণ, সীমানা বিরোধ ও বাড়ি ভাড়ার মতো বিষয়ে আদালতের দীর্ঘসূত্রিতা ছাড়াই দ্রুত উভয় পক্ষের সম্মতিতে লিখিত ও আইনি আপসনামা সম্পন্ন হয়।",
    aEn: "Yes! Under Section 21A of the Legal Aid Act, the District Legal Aid Officer can summon both parties for pre-case mediation. Family dower, maintenance, rent, and boundary disputes are peacefully resolved without long court trials.",
  },
  {
    id: "helpline_cost",
    qBn: "১৬৬৯৯ হেল্পলাইনে ফোন দিলে কি কোনো টাকা বা ব্যালেন্স কাটে?",
    qEn: "Does calling the 16699 helpline cost money or phone balance?",
    aBn: "না, জাতীয় লিগ্যাল এইড হেল্পলাইন ১৬৬৯৯ সম্পূর্ণ টোল-ফ্রি (Toll-Free)। গ্রামীণফোন, রবি, বাংলালিংক, এয়ারটেল বা টেলিটক যেকোনো সিম বা ল্যান্ডফোন থেকে ফোনে কোনো টাকা বা ব্যালেন্স না থাকলেও সরাসরি কল করে আইনি পরামর্শ নেওয়া যায়।",
    aEn: "No. The National Legal Aid Helpline 16699 is 100% toll-free across all mobile networks in Bangladesh (Grameenphone, Robi, Banglalink, Teletalk). You can call even with zero balance.",
  },
  {
    id: "location",
    qBn: "আমার জেলায় জেলা লিগ্যাল এইড অফিস কোথায় অবস্থিত?",
    qEn: "Where is the District Legal Aid Office located in my district?",
    aBn: "বাংলাদেশের প্রতিটি জেলার 'জেলা ও দায়রা জজ আদালত ভবন' প্রাঙ্গণেই লিগ্যাল এইড অফিস অবস্থিত। সেখানে একজন সিনিয়র সহকারী জজ বা যুগ্ম জেলা জজ মর্যাদার কর্মকর্তা পূর্ণকালীন জেলা লিগ্যাল এইড অফিসার হিসেবে দায়িত্ব পালন করেন। সপ্তাহের প্রতি রবিবার থেকে বৃহস্পতিবার সকাল ৯টা থেকে বিকেল ৫টা পর্যন্ত অফিস খোলা থাকে।",
    aEn: "In every district, the office is located inside the District & Sessions Judge Court building. A full-time judicial officer serves as the District Legal Aid Officer Sunday through Thursday, 9:00 AM to 5:00 PM.",
  },
];

export function LegalFaqAccordion({ lang = "bn" }: LegalFaqAccordionProps) {
  const bn = lang === "bn";
  const T = (b: string, e: string) => (bn ? b : e);

  const [openIds, setOpenIds] = useState<Record<string, boolean>>({
    fees: true, // Keep the most important reassurance open by default
  });

  const toggle = (id: string) => {
    setOpenIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <section aria-labelledby="lg-faq-h" className="lg-card space-y-4" data-testid="legal-faq">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="kp-eyebrow">{T("সাধারণ জিজ্ঞাসা ও উত্তর", "Common questions & answers")}</p>
          <h2 id="lg-faq-h" className="mt-1 text-[clamp(21px,3vw,28px)] font-semibold leading-tight text-slate-900">
            {T("আইনি সহায়তা নিয়ে সচরাচর প্রশ্ন", "Frequently Asked Questions")}
          </h2>
          <p className="mt-1 max-w-[64ch] text-[15px] leading-relaxed text-slate-700">
            {T(
              "আদালত ও সরকারি লিগ্যাল এইড সম্পর্কে সাধারণ নাগরিকদের সবচেয়ে জরুরি প্রশ্নগুলোর স্বচ্ছ উত্তর:",
              "Transparent answers to the most important questions about government legal aid and court representation:"
            )}
          </p>
        </div>
      </div>

      <div className="space-y-2.5">
        {FAQS.map((faq) => {
          const isOpen = Boolean(openIds[faq.id]);
          return (
            <div
              key={faq.id}
              className="rounded-2xl border border-slate-200/90 bg-white overflow-hidden transition-all duration-200"
            >
              <button
                type="button"
                onClick={() => toggle(faq.id)}
                aria-expanded={isOpen}
                className="flex w-full items-center justify-between gap-3 p-4 text-left transition-colors hover:bg-slate-50/70"
              >
                <span className="flex items-start gap-2.5 min-w-0">
                  <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-lg bg-indigo-50 text-indigo-800 text-[12px] font-bold">
                    ?
                  </span>
                  <span className="font-bold text-[15.5px] leading-snug text-slate-900">
                    {bn ? faq.qBn : faq.qEn}
                  </span>
                </span>
                <ChevronDown
                  size={18}
                  className={`text-slate-400 shrink-0 transition-transform duration-200 ${
                    isOpen ? "rotate-180 text-indigo-700" : ""
                  }`}
                />
              </button>

              {isOpen && (
                <div className="border-t border-slate-100 bg-slate-50/50 p-4 pt-3 text-[14.5px] leading-relaxed text-slate-700 animate-in fade-in duration-200">
                  <p>{bn ? faq.aBn : faq.aEn}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
