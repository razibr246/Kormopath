import type { Metadata } from "next";
import Link from "next/link";
import { Compass, ShieldCheck, ArrowRight, Play } from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { AppFooter } from "@/components/AppFooter";
import { LiveAssertionHarness } from "@/components/LiveAssertionHarness";

export const metadata: Metadata = {
  title: "Judge tour",
  description: "A 2-minute English guide to testing KormoPath: the four-agent flagship and six everyday apps.",
};

const FLAGSHIP = [
  { step: "Open the Workspace and click a judge preset (e.g. Tahmid Hasan).", look: "Skills Gemini could not quote from the CV are struck out; the hourly rate is an indicative range from a sourced dataset." },
  { step: "Watch the Live Telemetry column on the right.", look: "Each Gemini call, Zod schema check, evidence check and timing is logged — and any retry or rule-based fallback is labelled." },
  { step: "Stage 2: run the bug-hunt tests, then answer the viva.", look: "Tests run in a sandboxed Web Worker; viva credit is only given for points backed by quotes from your answer." },
  { step: "Stage 3 and 4: open the pitch, contract and payout comparison.", look: "The pitch may not mention any $ amount not in the contract; clauses come from fixed bilingual templates; money is computed by tested code, never the model." },
];

const APPS = [
  { name: "AdmitBuddy", href: "/admitbuddy", what: "University admission planner", tryIt: "Click “Try an example” → see fit scores, then shortlist BUET and open the Application tracker.", trust: "Never invents admission dates: students add dates from official circulars, with the source." },
  { name: "MediScan BD", href: "/mediscan", what: "Prescription reader", tryIt: "Click a sample prescription → see medicine, dose, duration and meal timing in plain Bangla, plus a daily schedule you can export as phone reminders.", trust: "Never diagnoses; an unknown medicine pair is “no data”, never “safe”; emergency numbers always visible; photo reading needs explicit consent." },
  { name: "Shohoj Budget", href: "/shohoj-budget", what: "Voice-first household budget", tryIt: "Click “Load example data”, or type “বাজারে ১২০০ টাকা খরচ করেছি” and press বুঝে নিন.", trust: "Reads Bangla numbers (১২০০, বারোশো); nothing is saved until you confirm; money is stored as integer poisha." },
  { name: "HaatBazar AI", href: "/haatbazar", what: "Farm trip profit + weather", tryIt: "Change the prices in the trip calculator, then pick a district for live weather and spray advice.", trust: "No invented market prices; example values are labelled; no pesticide doses — refers to the label and Krishi Call Centre 16123." },
  { name: "Probaho Coach", href: "/probaho", what: "Interview & viva speaking coach", tryIt: "Pick “এইচআর ইন্টারভিউ”, choose “Tell me about a time…”, type an answer, then click “Ask the AI coach”.", trust: "Score is transparent and deterministic; Gemini’s coaching must quote your own words, checked by code; accent is never scored." },
  { name: "FeeGuard BD", href: "/feeguard", what: "Freelance payout fee checker", tryIt: "Change the invoice amount and compare the four payout routes in taka.", trust: "Every fee line comes from the same tested engine and adds up exactly to the net amount; each fee shows its source." },
];

export default function JudgesPage() {
  const lang = "en";

  return (
    <div className="min-h-screen flex flex-col bg-[#f8fafc] text-slate-900 antialiased">
      <AppHeader
        appId="kormopath"
        href="/judges"
        name="Judge tour"
        taglineEn="Test KormoPath in 2 minutes"
        taglineBn="বিচারকদের জন্য দ্রুত গাইড"
        icon={<Compass size={22} />}
        accent="from-orange-500 to-amber-600"
        privacyNote={null}
      />
      <main id="main" className="mx-auto w-full max-w-5xl flex-1 space-y-8 px-4 py-8 sm:px-6 motion-safe:animate-rise-in" lang="en">
        {/* Hero Section */}
        <section className="space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-orange-200 bg-orange-50/80 px-3 py-1 text-[12px] font-bold text-orange-800">
            <span>Judge & Evaluator Guide</span>
            <span className="text-orange-400">·</span>
            <span>2-Minute Fast Track</span>
          </div>
          <h1 className="text-[28px] sm:text-[36px] font-extrabold leading-tight tracking-tight text-slate-900">
            KormoPath in 2 minutes
          </h1>
          <p className="max-w-3xl text-[15px] sm:text-[16px] leading-relaxed text-slate-700">
            KormoPath helps young Bangladeshis make career, study, health and money decisions with AI they can check. The flagship takes a freelancer from CV to money received with four Gemini-backed agents; six everyday apps use the same rule: the AI reads and writes, code verifies every claim, and money is never calculated by the model. No sign-up needed.
          </p>
          <div className="flex flex-wrap items-center gap-3 pt-1">
            <Link
              href="/workspace"
              className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-orange-600 px-5 py-2.5 text-[15px] font-bold text-white shadow-sm hover:bg-orange-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#007aff] focus-visible:ring-offset-2 transition-all active:scale-[0.98]"
            >
              <span>Start with the flagship → Workspace</span>
              <ArrowRight size={16} />
            </Link>
            <Link
              href="/demo"
              className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-orange-300 bg-white/90 px-5 py-2.5 text-[15px] font-bold text-orange-800 hover:bg-orange-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#007aff] focus-visible:ring-offset-2 transition-all active:scale-[0.98]"
            >
              <Play size={14} className="fill-orange-800" />
              <span>Watch the 2-minute demo</span>
            </Link>
          </div>
        </section>

        {/* Section 1: Flagship */}
        <section aria-labelledby="flag-h" className="rounded-2xl border border-slate-200/80 bg-white/80 backdrop-blur-md p-5 sm:p-6 shadow-xs hover:shadow-md transition-all">
          <h2 id="flag-h" className="mb-4 text-[19px] font-bold text-slate-900 flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-orange-100 text-orange-800 text-[13px] font-bold">1</span>
            <span>Flagship: CV → verified skills → client → money home</span>
          </h2>
          <ol className="space-y-3.5 divide-y divide-slate-100">
            {FLAGSHIP.map((f, i) => (
              <li key={i} className={`grid gap-1 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] sm:gap-4 ${i > 0 ? "pt-3.5" : ""}`}>
                <span className="text-[14px] font-semibold text-slate-900">{i + 1}. {f.step}</span>
                <span className="text-[13px] text-slate-600 leading-relaxed"><strong className="text-slate-800">Look for:</strong> {f.look}</span>
              </li>
            ))}
          </ol>
        </section>

        {/* Live Assertion Harness */}
        <section aria-labelledby="harness-h" className="rounded-2xl border border-slate-200/80 bg-white/80 backdrop-blur-md p-5 sm:p-6 shadow-xs hover:shadow-md transition-all">
          <LiveAssertionHarness />
        </section>

        {/* Section 2: Six Ecosystem Apps */}
        <section aria-labelledby="apps-h" className="space-y-4">
          <h2 id="apps-h" className="text-[19px] font-bold text-slate-900 flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-orange-100 text-orange-800 text-[13px] font-bold">2</span>
            <span>Six everyday apps (Bangla-first UI, English headers)</span>
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {APPS.map((a) => (
              <article key={a.name} className="flex flex-col gap-2.5 rounded-2xl border border-slate-200/80 bg-white/80 backdrop-blur-md p-5 shadow-xs hover:shadow-md transition-all">
                <div className="flex items-baseline justify-between gap-2 border-b border-slate-100 pb-2.5">
                  <h3 className="text-[17px] font-bold text-slate-900">{a.name}</h3>
                  <span className="text-[12px] font-semibold text-slate-600">{a.what}</span>
                </div>
                <p className="text-[13px] text-slate-700 leading-relaxed">
                  <strong className="text-slate-900">Try:</strong> {a.tryIt}
                </p>
                <p className="flex gap-1.5 text-[12px] text-slate-600 leading-normal">
                  <ShieldCheck size={14} className="mt-0.5 shrink-0 text-emerald-700" aria-hidden />
                  <span>{a.trust}</span>
                </p>
                <div className="mt-auto pt-2">
                  <Link
                    href={a.href}
                    className="inline-flex min-h-[38px] items-center gap-1 rounded-xl border border-slate-300/80 bg-white px-3.5 py-1.5 text-[13px] font-bold text-slate-800 hover:border-slate-500 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#007aff] focus-visible:ring-offset-2 transition-all"
                  >
                    <span>Open {a.name}</span>
                    <ArrowRight size={13} />
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* Good to know */}
        <section className="rounded-2xl border border-slate-200/80 bg-white/80 backdrop-blur-md p-5 sm:p-6 text-[13px] leading-relaxed text-slate-700 shadow-xs hover:shadow-md transition-all">
          <h2 className="mb-2 text-[16px] font-bold text-slate-900">Good to know</h2>
          <ul className="list-disc space-y-1.5 pl-5 text-slate-600">
            <li>AI runs on Google Gemini (Flash models). If the model is overloaded, KormoPath retries, switches to a lighter model, and finally falls back to rule-based agents — always labelled.</li>
            <li>App data stays in your browser; see <Link href="/settings" className="font-semibold text-orange-700 underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#007aff] rounded">Data &amp; privacy</Link> for exactly what is sent to which service.</li>
            <li>Information only — not medical, legal, tax or financial advice.</li>
            <li>Source code: <a href="https://github.com/razibr246/Kormopath" className="font-semibold text-orange-700 underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#007aff] rounded" target="_blank" rel="noopener noreferrer">github.com/razibr246/Kormopath</a></li>
          </ul>
        </section>
      </main>
      <AppFooter lang={lang} />
    </div>
  );
}
