"use client";
import Link from "next/link";
import { KormoPathLogo } from "@/components/brand/KormoPathLogo";
import { ShieldCheck, Sparkles, ExternalLink, ArrowUpRight, Linkedin } from "lucide-react";

export interface AppFooterProps {
  lang?: "en" | "bn";
  className?: string;
}

/**
 * Shared accessible footer for all ecosystem applications.
 * Guarantees cross-app branding continuity, WCAG AA contrast,
 * civic disclaimers, and direct navigation links.
 */
export function AppFooter({
  lang = "bn",
  className = "",
}: AppFooterProps): React.JSX.Element {
  return (
    <footer
      className={`mt-16 border-t border-slate-200 bg-white text-slate-700 pb-20 sm:pb-12 print:hidden ${className}`}
      role="contentinfo"
    >
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4 pb-8 border-b border-slate-200 text-[13px]">
          {/* Col 1: Brand & Identity */}
          <div className="space-y-3 sm:col-span-2 lg:col-span-1">
            <Link
              href="/"
              prefetch={true}
              className="inline-block group"
            >
              <KormoPathLogo theme="light" variant="full" size="md" />
            </Link>
            <p className="text-[13px] text-slate-600 leading-relaxed">
              {lang === "bn"
                ? "বাংলাদেশের তরুণ ও ফ্রিল্যান্সারদের জন্য স্বায়ত্তশাসিত স্কিল ভেরিফিকেশন, বাইলিঙ্গুয়াল চুক্তি ও ট্যাক্স শিল্ড অপারেটিং সিস্টেম।"
                : "The Autonomous Skill-to-Income, Legal & FinOps Platform for Bangladeshi youth and independent professionals."}
            </p>
            <div className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-700">
              <ShieldCheck size={13} className="text-emerald-600" />
              <span>{lang === "bn" ? "ডেটা স্থানীয় ডিভাইসে সুরক্ষিত (No Tracking)" : "Local-first privacy (No Tracking)"}</span>
            </div>
          </div>

          {/* Col 2: Navigation Links */}
          <div className="space-y-2">
            <h2 className="font-sans text-[14px] font-bold tracking-normal text-slate-900">
              {lang === "bn" ? "গুরুত্বপূর্ণ লিংক" : "Platform Navigation"}
            </h2>
            <ul className="space-y-1.5 text-slate-600">
              <li>
                <Link
                  href="/workspace"
                  prefetch={true}
                  className="hover:text-orange-600 transition-colors inline-flex items-center gap-1"
                >
                  <span>{lang === "bn" ? "ওয়ার্কস্পেস ও অডিট" : "Workspace Pipeline"}</span>
                  <ArrowUpRight size={12} className="opacity-60" />
                </Link>
              </li>
              <li>
                <Link
                  href="/#apps-showcase"
                  prefetch={false}
                  className="hover:text-orange-600 transition-colors inline-flex items-center gap-1"
                >
                  <span>{lang === "bn" ? "সকল ইকোসিস্টেম অ্যাপ" : "Ecosystem Showcase"}</span>
                </Link>
              </li>
              <li>
                <Link
                  href="/opportunities"
                  prefetch={true}
                  className="hover:text-orange-600 transition-colors inline-flex items-center gap-1"
                >
                  <span>{lang === "bn" ? "সুযোগ ও আমার পথ" : "Opportunities Board"}</span>
                </Link>
              </li>
              <li>
                <Link
                  href="/rokkha"
                  prefetch={true}
                  className="hover:text-orange-600 transition-colors inline-flex items-center gap-1"
                >
                  <span>{lang === "bn" ? "রক্ষা: প্রতারণা ও দুর্যোগে সুরক্ষা" : "Rokkha: scam & disaster safety"}</span>
                </Link>
              </li>
              <li>
                <Link
                  href="/legal"
                  prefetch={true}
                  className="hover:text-orange-600 transition-colors inline-flex items-center gap-1"
                >
                  <span>{lang === "bn" ? "আইনি সহায়তা: সরকারি ফ্রি লিগ্যাল এইড" : "Legal Aid: free legal aid"}</span>
                </Link>
              </li>
              <li>
                <Link
                  href="/judges"
                  prefetch={true}
                  className="hover:text-amber-600 font-medium transition-colors inline-flex items-center gap-1"
                >
                  <span>{lang === "bn" ? "বিচারক গাইড (Judge Tour)" : "Judge Walkthrough"}</span>
                </Link>
              </li>
              <li>
                <Link
                  href="/trust"
                  prefetch={true}
                  className="hover:text-emerald-700 font-medium transition-colors inline-flex items-center gap-1"
                >
                  <span>{lang === "bn" ? "যাচাই করা ফলাফল" : "Measured results"}</span>
                </Link>
              </li>
              <li>
                <Link
                  href="/settings"
                  prefetch={true}
                  className="hover:text-orange-600 transition-colors inline-flex items-center gap-1"
                >
                  <span>{lang === "bn" ? "প্রাইভেসি ও ব্যাকআপ" : "Privacy & Backup"}</span>
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 3: Regulatory Grounding */}
          <div className="space-y-2">
            <h2 className="font-sans text-[14px] font-bold tracking-normal text-slate-900">
              {lang === "bn" ? "কর ও প্রণোদনা (তথ্য)" : "Tax & incentives (information)"}
            </h2>
            <div className="space-y-2 text-[12px] text-slate-600 leading-snug">
              <p>
                <strong className="text-slate-800">{lang === "bn" ? "কর:" : "Tax:"}</strong>{" "}
                {lang === "bn" ? "ফ্রিল্যান্সিং আয় আয়কর আইন ২০২৩-এর ষষ্ঠ তফসিলে করমুক্ত বলে প্রকাশিত। তথ্য, কর পরামর্শ নয়।" : "Freelancing income is reported as exempt under the Sixth Schedule, Income Tax Act 2023. Information, not tax advice."}
              </p>
              <p>
                <strong className="text-slate-800">{lang === "bn" ? "নগদ প্রণোদনা:" : "Cash incentive:"}</strong>{" "}
                {lang === "bn" ? "ফ্রিল্যান্সারদের ২.৫% (প্রকাশিত খবর অনুযায়ী); প্রযোজ্য কি না, ব্যাংক ঠিক করে।" : "2.5% for individual freelancers, as reported; your bank decides if it applies."}
              </p>
              <p>
                <strong className="text-slate-800">{lang === "bn" ? "ধারা ৪:" : "Clause 4:"}</strong>{" "}
                {lang === "bn" ? "আমাদের চুক্তি টেমপ্লেটের ইন্টারনেট-বন্ধ ধারা (আইন নয়)।" : "our contract template's internet-blackout clause (a contract term, not a law)."}
              </p>
            </div>
          </div>

          {/* Col 4: Civic Help & Helplines */}
          <div className="space-y-2">
            <h2 className="font-sans text-[14px] font-bold tracking-normal text-slate-900">
              {lang === "bn" ? "জরুরি হেল্পলাইন" : "Civic Helplines"}
            </h2>
            <div className="space-y-1.5 text-[12px] text-slate-600">
              <p>
                🚨 <strong className="text-slate-800">৯৯৯</strong> — {lang === "bn" ? "জাতীয় জরুরি সেবা" : "National Emergency"}
              </p>
              <p>
                🩺 <strong className="text-slate-800">১৬২৬৩</strong> — {lang === "bn" ? "স্বাস্থ্য বাতায়ন" : "Health Helpline"}
              </p>
              <p>
                🌾 <strong className="text-slate-800">১৬১২৩</strong> — {lang === "bn" ? "কৃষি কল সেন্টার" : "Krishi Call Centre"}
              </p>
              <p className="pt-1 text-[11px] text-slate-500">
                {lang === "bn"
                  ? "তথ্য যাচাইয়ের জন্য শুধুমাত্র অফিশিয়াল গেজেট ও সার্কুলার ব্যবহার করা হয়েছে।"
                  : "All statutory figures verified against official gazettes."}
              </p>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between text-[12px] text-slate-500">
          <div>
            <p className="font-semibold text-slate-800">
              KormoPath • কর্মপথ Autonomous System
            </p>
            <p>
              {lang === "bn"
                ? "ঢাকা ও খুলনায় তৈরি। সমস্ত হিসাব বিশুদ্ধ গাণিতিক সূত্রে যাচাইকৃত।"
                : "Built in Dhaka & Khulna. All financial calculations deterministic and unit-tested."}
            </p>
            <a
              href="https://www.linkedin.com/in/razibr246"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Connect with Razib on LinkedIn (opens in a new tab)"
              className="mt-1 inline-flex items-center gap-1 text-slate-600 transition-all hover:text-emerald-800 hover:[text-shadow:0_0_7px_rgba(14,107,79,0.55),0_0_12px_rgba(217,84,58,0.3)] focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
            >
              <Linkedin size={13} aria-hidden="true" />
              <span>LinkedIn</span>
            </a>
          </div>
          <div className="sm:text-right text-[11px] text-slate-500">
            <p>{lang === "bn" ? "শুধুমাত্র তথ্যের উদ্দেশ্যে; কোনো আইনি বা ট্যাক্স পরামর্শ নয়।" : "For informational purposes; not formal legal or tax counsel."}</p>
            <p className="text-slate-600">
              {lang === "bn" ? "ব্যাংক রেট ও ইনসেনটিভ অনুমোদিত ডিলার ব্যাংকে নিশ্চিত করুন।" : "Confirm inward remittance terms with your authorized dealer bank."}
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
