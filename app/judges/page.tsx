import type { Metadata } from "next";
import Link from "next/link";
import { Compass, ShieldCheck, ArrowRight, Play, FlaskConical } from "lucide-react";
import { AppHeader } from "@/components/layout/AppHeader";
import { AppFooter } from "@/components/layout/AppFooter";
import { LiveAssertionHarness } from "@/components/judges/LiveAssertionHarness";

export const metadata: Metadata = {
  title: "Judge tour",
  description: "A 2-minute English guide to testing KormoPath: the four-agent flagship and seven everyday apps.",
};

const FLAGSHIP = [
  { step: "Open the Workspace and click a judge preset (e.g. Tahmid Hasan).", look: "Skills Gemini could not quote from the CV are struck out; the hourly rate is an indicative range from a sourced dataset." },
  { step: "Watch the Live Telemetry column on the right.", look: "Each Gemini call, Zod schema check, evidence check and timing is logged — and any retry or rule-based fallback is labelled." },
  { step: "Stage 2: run the bug-hunt tests, then answer the viva.", look: "Tests run in a sandboxed Web Worker; viva credit is only given for points backed by quotes from your answer." },
  { step: "Stage 3 and 4: open the pitch, contract and payout comparison.", look: "The pitch may not mention any $ amount not in the contract; clauses come from fixed bilingual templates; money is computed by tested code, never the model." },
];

const APPS = [
  { name: "ChuktiGuard", href: "/chuktiguard", what: "Legal dispute & DNCRP petition studio", tryIt: "Open 'ভোক্তা বিরোধ (DNCRP Dispute)' → see auto-drafted Section 45/52 consumer petitions & 48h blackout clauses.", trust: "Zero LLM legal hallucinations: statutory bilingual legal templates with DNCRP 16121 hotline & email integration." },
  { name: "Shohoj Budget", href: "/shohoj-budget", what: "Voice budget & 30-day cash deficit simulator", tryIt: "Scroll to '30-Day Deficit & Baki Simulator' → see exact day cash drops below zero and split debt installments.", trust: "Integer poisha math; zero floating-point drift; 100% offline on device." },
  { name: "Probaho Coach", href: "/probaho", what: "Interview coach & Cyber Scam Sparring Arena", tryIt: "Switch to '🛡️ প্রতারণা প্রতিরোধ (Scam Gym)' → defend against simulated bKash OTP theft & task scams.", trust: "Deterministic safety scoring (safe/risky/fatal); CID Cyber Police 01730336431 integration." },
  { name: "HaatBazar AI", href: "/haatbazar", what: "Crop Doctor & 28-district market margins", tryIt: "Open 'ফসল ডাক্তার' → tap symptoms like 'চোখের মতো দাগ' on Paddy to diagnose Blast with organic IPM.", trust: "Strictly zero pesticide dosage; links directly to Krishi Call Centre 16123." },
  { name: "FeeGuard BD", href: "/feeguard", what: "Freelance payout fee & tax checker", tryIt: "Compare 4 payout routes with NBR ITES tax exemption notice and 2.5% Bangladesh Bank cash incentives.", trust: "Every fee line reconciles to the exact poisha; statutory Bangladesh Bank circular citations." },
  { name: "AdmitBuddy", href: "/admitbuddy", what: "University admission planner", tryIt: "Click 'Try an example' → see fit scores, shortlist BUET, and check SOP readability with Flesch score.", trust: "Never invents admission dates: students add dates from official circulars, with the source." },
  { name: "MediScan BD", href: "/mediscan", what: "Prescription reader & interaction warning", tryIt: "Click a sample prescription → see medicine, dose, and food timing in plain Bangla.", trust: "Never diagnoses; unknown drug pairs are 'no data', never 'safe'; emergency strip stays visible." },
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

        {/* Measured results: every AI check, run on fixed inputs by scripts/eval.ts */}
        <Link
          href="/trust"
          className="group flex flex-col gap-3 rounded-2xl border border-emerald-300 bg-emerald-50/80 p-5 shadow-xs transition-all hover:shadow-md sm:flex-row sm:items-center sm:justify-between sm:p-6"
        >
          <span className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-700 text-white"><FlaskConical size={20} /></span>
            <span className="min-w-0">
              <span className="block text-[17px] font-bold text-slate-900">Measured, not claimed: see the numbers</span>
              <span className="block text-[14px] leading-relaxed text-slate-700">Evidence-quote checks, hallucination probes, the pitch amount guard and fee reconciliation, run on fixed inputs by a script anyone can re-run, with honest limits.</span>
            </span>
          </span>
          <span className="inline-flex shrink-0 items-center gap-1.5 text-[14px] font-bold text-emerald-800 group-hover:underline">Open measured results <ArrowRight size={15} /></span>
        </Link>

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

        {/* Section 2: Seven Ecosystem Apps */}
        <section aria-labelledby="apps-h" className="space-y-4">
          <h2 id="apps-h" className="text-[19px] font-bold text-slate-900 flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-orange-100 text-orange-800 text-[13px] font-bold">2</span>
            <span>Seven everyday apps (Bangla-first UI, English headers)</span>
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
