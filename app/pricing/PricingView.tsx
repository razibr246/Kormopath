"use client";

import { useState } from "react";
import Link from "next/link";
import { ShieldCheck, Sparkles, Check, HeartPulse, Scale, Siren, Wallet, Sprout, Hospital, BellRing } from "lucide-react";
import { Navbar, Footer } from "@/components/layout/Chrome";
import { UpgradeModal } from "@/components/pricing/UpgradeModal";
import { PRICE_SINGLE_APP_BDT, PRICE_FULL_ACCESS_BDT, PAYMENTS_OPEN } from "@/lib/session";
import { bnDigits } from "@/lib/contract";

/*
 * B2C plans, stated honestly: the free list is the safety charter (lib/session.ts SAFETY_FEATURES and
 * ALWAYS_FREE_APPS), prices are a team proposal (PRICES_PROPOSED), and payments are off (PAYMENTS_OPEN). No user
 * counts, testimonials or revenue figures appear here because none have been measured.
 */
export function PricingView() {
  const [lang, setLang] = useState<"bn" | "en">("bn");
  const [modal, setModal] = useState(false);
  const bn = lang === "bn";
  const t = (b: string, e: string) => (bn ? b : e);
  const tk = (n: number) => `৳${bn ? bnDigits(String(n)) : n}`;

  const FREE: Array<{ icon: typeof Siren; bn: string; en: string }> = [
    { icon: Siren, bn: "জরুরি হাসপাতাল খোঁজা, ৯৯৯ ও ১৬২৬৩ সবসময় চোখের সামনে", en: "Emergency hospital finder, with 999 and 16263 always on screen" },
    { icon: HeartPulse, bn: "“কোন ডাক্তার দেখাব?” সহকারী, প্রেসক্রিপশন পড়া, ওষুধের সময়সূচি ও জ্বরের লক্ষণ নজরদারি", en: "“Which doctor?” assistant, prescription reading, medicine schedule and fever watch" },
    { icon: Scale, bn: "আইনি সহায়তা: আবেদন, মামলা ট্র্যাকিং, মধ্যস্থতা, ১৬৬৯৯ ও ১০৯", en: "Legal aid: applications, case tracking, mediation, 16699 and 109" },
    { icon: ShieldCheck, bn: "রক্ষা: প্রতারণার বার্তা ও লিংক যাচাই, পরিবারকে সতর্ক করা", en: "Rokkha: scam message and link checks, family alerts" },
    { icon: Wallet, bn: "সহজ বাজেট, ওয়ালেট, ধার-বাকি, মেস ও যাকাত; ফি-গার্ড ও চুক্তিগার্ড", en: "Shohoj budget, wallets, dues, mess and zakat; FeeGuard and ChuktiGuard" },
    { icon: Sprout, bn: "মাঠসাথী ও হাটবাজার: মাঠ, খামারের খাতা ও আবহাওয়া", en: "MaathSathi and HaatBazar: field, farm book and weather" },
  ];

  const plans: Array<{ id: string; name: string; price: number; adds: string[] }> = [
    {
      id: "single",
      name: t("একটি অ্যাপ", "One app"),
      price: PRICE_SINGLE_APP_BDT,
      adds: [
        t("একটি অ্যাপের সব পেইড সুবিধা, যেমন অ্যাডমিটবাডির মডেল টেস্ট ও অনুশীলন পরীক্ষা", "Every paid extra in one app, e.g. AdmitBuddy model tests and practice exams"),
        t("অথবা মেডিস্ক্যানে যাচাই করা ডাক্তারের বুকিং (যাচাই চালু হলে)", "Or booking verified doctors in MediScan (once verification is live)"),
      ],
    },
    {
      id: "all",
      name: t("অল-অ্যাক্সেস", "All-access"),
      price: PRICE_FULL_ACCESS_BDT,
      adds: [
        t("সব অ্যাপের পেইড সুবিধা একসাথে", "Paid extras in every app"),
        t("প্রবাহ কোচে সীমাহীন অনুশীলন ও ওয়ার্কস্পেস পিডিএফ এক্সপোর্ট", "Unlimited Probaho coaching and Workspace PDF export"),
      ],
    },
  ];

  return (
    <div className="min-h-screen">
      <Navbar lang={lang} setLang={setLang} />
      <main id="main" className="mx-auto max-w-5xl space-y-8 px-4 py-10 sm:px-6" data-testid="pricing-page">
        <header className="space-y-3">
          <p className="kp-eyebrow">{t("প্ল্যান ও মূল্য", "Plans & pricing")}</p>
          <h1 className="text-[clamp(30px,5vw,46px)] font-semibold leading-tight text-slate-900">
            {t("সুরক্ষা সবার জন্য ফ্রি। বাড়তি সুবিধার জন্য ছোট মাসিক ফি।", "Safety is free for everyone. Extras cost a small monthly fee.")}
          </h1>
          <p className="max-w-[65ch] text-[16px] leading-relaxed text-slate-700">
            {t("সাইন-আপ ছাড়াই এখনই ব্যবহার শুরু করুন। জরুরি সেবা, স্বাস্থ্য সহকারী, আইনি সহায়তা ও প্রতারণা যাচাই কখনো টাকার পেছনে থাকবে না।",
               "Start now with no sign-up. Emergency help, the health assistant, legal aid and scam checks will never sit behind a payment.")}
          </p>
          <p className="inline-flex rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-[14px] font-semibold text-amber-900" data-testid="pricing-payments-closed">
            {PAYMENTS_OPEN ? "" : t("প্রস্তাবিত মাসিক মূল্য · পেমেন্ট এখনো চালু হয়নি", "Proposed monthly prices · payments are not open yet")}
          </p>
        </header>

        <section className="rounded-3xl border border-emerald-200 bg-emerald-50/60 p-5 sm:p-7" aria-labelledby="free-h">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 id="free-h" className="text-[24px] font-semibold text-slate-900">{t("চিরকাল ফ্রি", "Free forever")}</h2>
            <span className="font-mono text-[28px] font-bold text-emerald-800">{tk(0)}</span>
          </div>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {FREE.map(({ icon: Icon, bn: b, en: e }) => (
              <li key={e} className="flex items-start gap-2.5 text-[15px] leading-relaxed text-slate-800">
                <Icon size={18} className="mt-1 shrink-0 text-emerald-700" aria-hidden /> {bn ? b : e}
              </li>
            ))}
          </ul>
          <Link href="/workspace" className="kp-btn-primary mt-5 min-h-[44px] px-5">{t("এখনই শুরু করুন", "Start now")}</Link>
        </section>

        <section className="grid gap-4 sm:grid-cols-2" aria-label={t("পেইড প্ল্যান", "Paid plans")}>
          {plans.map((p) => (
            <article key={p.id} className="flex flex-col rounded-3xl border border-slate-200 bg-white p-5 sm:p-6" data-testid={`plan-${p.id}`}>
              <h2 className="text-[20px] font-semibold text-slate-900">{p.name}</h2>
              <p className="mt-2 flex items-baseline gap-1.5">
                <span className="font-mono text-[34px] font-bold text-slate-900">{tk(p.price)}</span>
                <span className="text-[14px] text-slate-500">{t("/মাস · প্রস্তাবিত", "/month · proposed")}</span>
              </p>
              <ul className="mt-3 space-y-2">
                {p.adds.map((a) => (
                  <li key={a} className="flex items-start gap-2 text-[15px] text-slate-700"><Check size={17} className="mt-1 shrink-0 text-emerald-700" aria-hidden /> {a}</li>
                ))}
                <li className="flex items-start gap-2 text-[15px] text-slate-700"><Check size={17} className="mt-1 shrink-0 text-emerald-700" aria-hidden /> {t("ফ্রি প্ল্যানের সবকিছু", "Everything in Free")}</li>
              </ul>
              <button type="button" onClick={() => setModal(true)} className="kp-btn-ghost mt-auto min-h-[44px] justify-center px-4 pt-3" style={{ marginTop: "1.25rem" }}>
                <BellRing size={15} aria-hidden /> {t("আগাম অ্যাক্সেস বা ডেমো", "Early access or demo")}
              </button>
            </article>
          ))}
        </section>

        <section className="space-y-3 rounded-3xl border border-slate-200 bg-white p-5 sm:p-7" aria-labelledby="why-h">
          <h2 id="why-h" className="text-[22px] font-semibold text-slate-900">{t("কেন টাকা নেব", "Why we charge")}</h2>
          <p className="max-w-[68ch] text-[15.5px] leading-relaxed text-slate-700">
            {t("এআই উত্তর, সার্ভার ও তথ্য যাচাইয়ের খরচ আছে। যারা বাড়তি সুবিধা চান তাদের ছোট ফি দিয়েই ফ্রি সুরক্ষা সেবাগুলো সবার জন্য চালু রাখা যাবে।",
               "AI answers, servers and fact-checking cost money. A small fee from people who want the extras keeps the free safety features running for everyone.")}
          </p>
          <h3 className="pt-2 text-[18px] font-semibold text-slate-900">{t("পেমেন্ট কবে খুলবে", "When payments open")}</h3>
          <p className="max-w-[68ch] text-[15.5px] leading-relaxed text-slate-700">
            {t("যাচাই করা বিকাশ মার্চেন্ট অ্যাকাউন্ট ও সার্ভারে পেমেন্ট যাচাই চালু হলে। তার আগে কোনো নম্বরে টাকা পাঠাবেন না, কেউ “কর্মপথের নামে” চাইলেও না।",
               "Once a verified bKash merchant account and server-side payment checks are in place. Until then, do not send money to any number, even if someone asks “for KormoPath”.")}
          </p>
          <p className="flex items-start gap-2 text-[14px] text-slate-500">
            <Hospital size={16} className="mt-0.5 shrink-0" aria-hidden />
            {t("মূল্য দল প্রস্তাব করেছে; চূড়ান্ত মূল্য প্রতিষ্ঠাতা ঠিক করবেন। এই পাতায় কোনো ব্যবহারকারী-সংখ্যা বা আয়ের দাবি নেই, কারণ তা এখনো মাপা হয়নি।",
               "Prices are a team proposal; the founder sets the final numbers. This page makes no user-count or revenue claims, because none have been measured yet.")}
          </p>
        </section>

        <p className="text-center text-[14px] text-slate-500">
          <Sparkles size={14} className="mr-1 inline" aria-hidden />
          <Link href="/privacy" className="underline">{t("আপনার তথ্য কোথায় থাকে", "Where your data stays")}</Link>
        </p>
      </main>
      <Footer />
      <UpgradeModal isOpen={modal} onClose={() => setModal(false)} targetAppId="admitbuddy" targetAppNameBn={t("অ্যাডমিটবাডি মডেল টেস্ট", "AdmitBuddy model tests")} featureNameBn={t("পেইড প্ল্যান", "Paid plans")} lang={lang} />
    </div>
  );
}
