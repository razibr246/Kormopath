"use client";
import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Bot, ClipboardList, Phone, Scale, ScrollText } from "lucide-react";
import { SourceTag } from "@/components/layout/AppHeader";
import { EligibilityCard } from "@/components/apps/legal/EligibilityCard";
import { PROBLEM_CATEGORIES } from "@/lib/legal/taxonomy";
import { HELPLINES, LAWS, NLASO_DISTRICT_OFFICES, NLASO_HOME, NLASO_LEGAL_AID_PAGE, NOT_LEGAL_ADVICE_BN, NOT_LEGAL_ADVICE_EN } from "@/lib/legal/data";

const bnNum = (s: string) => s.replace(/\d/g, (d) => "০১২৩৪৫৬৭৮৯"[Number(d)]);

/**
 * /legal: start of the legal aid section. Features ported from the Digital Legal Aid System (razibr246 and
 * AdribMahmud101); every fact (helplines, the legal aid law, offices) comes from lib/legal/data.ts with its source.
 */
export default function LegalHome() {
  const [lang, setLang] = useState<"bn" | "en">("bn");
  const bn = lang === "bn";
  const T = (b: string, e: string) => (bn ? b : e);
  const legalAid = HELPLINES.find((h) => h.id === "legal_aid");
  const act = LAWS.legal_aid_2000;

  return (
    <>
      <section className="lg-card relative overflow-hidden !p-6 sm:!p-10" data-testid="legal-hero" aria-labelledby="lg-hero-h">
        <div aria-hidden className="pointer-events-none absolute -right-10 -top-10 h-56 w-56 rounded-full bg-indigo-100/70 blur-2xl" />
        <div aria-hidden className="pointer-events-none absolute -bottom-16 left-1/3 h-48 w-48 rounded-full bg-amber-100/70 blur-2xl" />
        <div className="relative grid items-center gap-6 md:grid-cols-[1fr_auto]">
          <div className="min-w-0">
            <div className="flex items-center justify-between gap-3">
              <p className="kp-eyebrow">{T("বিনামূল্যে আইনি সহায়তা", "Free legal aid")}</p>
              <button type="button" onClick={() => setLang(bn ? "en" : "bn")} className="kp-chip !h-9 !rounded-full !text-[13px] font-semibold" aria-label={bn ? "EN, Switch to English" : "বাং, বাংলায় দেখুন"}>{bn ? "EN" : "বাং"}</button>
            </div>
            <h1 id="lg-hero-h" className="mt-3 text-[clamp(30px,5vw,50px)] font-semibold leading-[1.08] text-slate-900 motion-safe:animate-rise-in">
              {bn ? <>আইনি সমস্যায় <em className="kp-em">একা নন</em></> : <>With a legal problem, <em className="kp-em">you are not alone</em></>}
            </h1>
            <p className="mt-3 max-w-[58ch] text-[15.5px] leading-relaxed text-slate-700 motion-safe:animate-rise-in" style={{ animationDelay: "80ms" }}>
              {T("টাকার অভাবে যাঁরা আইনজীবী রাখতে পারেন না, সরকার তাঁদের আইনি সহায়তা দেয়। এখানে দেখে নিন আপনি পেতে পারেন কি না, আবেদনের খসড়া তৈরি করুন, আর কোথায় যাবেন জেনে নিন।",
                "The government gives legal help to people who cannot afford a lawyer. See whether you may qualify, prepare an application draft, and find out where to go.")}
            </p>
            <div className="mt-5 flex flex-wrap gap-2 motion-safe:animate-rise-in" style={{ animationDelay: "160ms" }}>
              <Link href="/legal/apply" className="kp-btn-primary kp-btn-lg inline-flex items-center gap-2"><ClipboardList size={18} aria-hidden /> {T("আবেদনের খসড়া", "Application draft")}</Link>
              <Link href="/legal/assistant" className="kp-btn-ghost kp-btn-lg inline-flex items-center gap-2"><Bot size={18} aria-hidden /> {T("প্রশ্ন করুন", "Ask a question")}</Link>
              {legalAid && <a href={`tel:${legalAid.number}`} className="kp-btn-ghost kp-btn-lg inline-flex items-center gap-2"><Phone size={18} aria-hidden /> {bn ? bnNum(legalAid.number) : legalAid.number}</a>}
            </div>
          </div>
          <div aria-hidden className="mx-auto hidden h-44 w-44 place-items-center rounded-full border border-indigo-100 bg-white/80 shadow-[0_24px_60px_-30px_rgba(51,53,122,.55)] md:grid">
            <span className="lg-scale lg-scale-settle text-indigo-800"><Scale size={96} strokeWidth={1.4} /></span>
          </div>
        </div>
      </section>

      <section aria-labelledby="lg-what-h" className="grid gap-4 md:grid-cols-3">
        <div className="lg-card md:col-span-2">
          <p className="kp-eyebrow">{T("এটা কী", "What it is")}</p>
          <h2 id="lg-what-h" className="mt-1 text-[clamp(21px,3vw,27px)] font-semibold leading-tight text-slate-900">{T("সরকারি খরচে আইনি সহায়তা", "Legal aid at government cost")}</h2>
          <p className="mt-2 max-w-[62ch] text-[15px] leading-relaxed text-slate-700">
            {bn
              ? `${act.bn} অনুযায়ী বাংলাদেশ আইনগত সহায়তা অধিদপ্তর এই সহায়তা দেয়। জেলা লিগ্যাল এইড অফিস, সুপ্রিম কোর্ট লিগ্যাল এইড অফিস ও চৌকি আদালত লিগ্যাল এইড অফিসে যাওয়া যায়; জাতীয় হেল্পলাইন ১৬৬৯৯। কে পাবেন তা অফিসই ঠিক করে।`
              : `Under the ${act.en}, the National Legal Aid Services Organisation provides this help through district, Supreme Court and chowki-court legal aid offices, with the national helpline 16699. The office decides who gets it.`}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <SourceTag confidence="official" label={act.source.label} url={act.source.url} checked={act.source.checked} />
            <SourceTag confidence="official" label={NLASO_LEGAL_AID_PAGE.label} url={NLASO_LEGAL_AID_PAGE.url} checked={NLASO_LEGAL_AID_PAGE.checked} />
          </div>
        </div>
        <div className="lg-card flex flex-col justify-between gap-3">
          <div>
            <p className="kp-eyebrow">{T("কোথায় যাবেন", "Where to go")}</p>
            <p className="mt-2 text-[15px] leading-relaxed text-slate-700">{T("আপনার জেলার লিগ্যাল এইড অফিসের ঠিকানা ও কর্মকর্তার তালিকা অধিদপ্তরের সাইটে।", "Your district legal aid office's address and officers are listed on the organisation's site.")}</p>
          </div>
          <a href={NLASO_DISTRICT_OFFICES.url} target="_blank" rel="noopener noreferrer" className="kp-btn-ghost inline-flex min-h-[48px] items-center justify-between gap-2 px-4 text-[15px]">{T("জেলা অফিসের খোঁজ", "Find the district office")} <ArrowRight size={18} aria-hidden /></a>
          <SourceTag confidence="official" label={NLASO_HOME.label} url={NLASO_HOME.url} checked={NLASO_HOME.checked} />
        </div>
      </section>

      <EligibilityCard lang={lang} />

      <section aria-labelledby="lg-topics-h" className="space-y-3">
        <div>
          <p className="kp-eyebrow">{T("আপনার সমস্যা", "Your problem")}</p>
          <h2 id="lg-topics-h" className="mt-1 text-[clamp(21px,3vw,27px)] font-semibold leading-tight text-slate-900">{T("কোন বিষয়ে সাহায্য চান?", "What do you need help with?")}</h2>
        </div>
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {PROBLEM_CATEGORIES.map((c, i) => (
            <li key={c.id} className="lg-card lg-card-hover flex flex-col justify-between gap-3 !p-4 motion-safe:animate-rise-in" style={{ animationDelay: `${Math.min(i, 10) * 40}ms` }} data-topic={c.id}>
              <p className="text-[16.5px] font-bold leading-snug text-slate-900">{bn ? c.bn : c.en}</p>
              <div className="flex flex-wrap gap-2">
                <Link href={`/legal/assistant?topic=${encodeURIComponent(c.id)}`} className="kp-chip !h-10 !text-[13.5px] font-semibold"><Bot size={15} aria-hidden /> {T("জিজ্ঞাসা", "Ask")}</Link>
                <Link href={`/legal/apply?topic=${encodeURIComponent(c.id)}`} className="kp-chip !h-10 !text-[13.5px] font-semibold"><ClipboardList size={15} aria-hidden /> {T("খসড়া", "Draft")}</Link>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="lg-calls-h" className="lg-card space-y-3">
        <h2 id="lg-calls-h" className="text-[20px] font-extrabold text-slate-900">{T("যেসব নম্বরে ফোন করা যায়", "Numbers you can call")}</h2>
        <ul className="grid gap-2 sm:grid-cols-2">
          {HELPLINES.map((h) => (
            <li key={h.id} className="flex flex-col gap-2 rounded-xl border border-slate-200 p-3">
              <a href={`tel:${h.number}`} className="flex items-center gap-3">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-indigo-50 text-indigo-800"><Phone size={18} aria-hidden /></span>
                <span className="min-w-0">
                  <span className="block font-mono text-[17px] font-bold text-slate-900">{bn ? bnNum(h.number) : h.number}</span>
                  <span className="block text-[14px] leading-snug text-slate-700">{bn ? h.bn : h.en}</span>
                </span>
              </a>
              <p className="text-[13.5px] text-slate-600">{bn ? h.whenBn : h.whenEn}</p>
              <SourceTag confidence={h.source.url.includes("tbsnews") ? "reported" : "official"} label={h.source.label} url={h.source.url} checked={h.source.checked} />
            </li>
          ))}
        </ul>
      </section>

      <section className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50/60 p-4">
        <p className="max-w-[70ch] text-[14.5px] leading-relaxed text-amber-950">{bn ? NOT_LEGAL_ADVICE_BN : NOT_LEGAL_ADVICE_EN}</p>
        <Link href="/legal/track" className="kp-btn-ghost inline-flex min-h-[44px] items-center gap-2 px-4 text-[14.5px]"><ScrollText size={16} aria-hidden /> {T("আমার কেস", "My case")}</Link>
      </section>
    </>
  );
}
