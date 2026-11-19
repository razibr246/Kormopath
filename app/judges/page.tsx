import type { Metadata } from "next";
import Link from "next/link";
import { Compass, ShieldCheck, ArrowRight, Play, FlaskConical } from "lucide-react";
import { AppHeader } from "@/components/layout/AppHeader";
import { AppFooter } from "@/components/layout/AppFooter";
import { LiveAssertionHarness } from "@/components/judges/LiveAssertionHarness";

export const metadata: Metadata = {
  title: "Judge tour",
  description: "A 3-minute English guide to KormoPath: one student freelancer's journey from skill proof to contract to payout, and 11 apps that reuse the same trust engine.",
};

/**
 * The 3-minute path. Every click label below is copied from the UI it names
 * (app/workspace/page.tsx, components/workspace/*, app/rokkha/page.tsx); if a label changes, change it here too.
 */
const PATH: { time: string; where: string; click: string; look: string }[] = [
  {
    time: "0:00–0:30",
    where: "/workspace",
    click: "In the card \u201cTry it with a sample profile\u201d, press Run next to Tahmid Hasan.",
    look: "Steps 1, 3 and 4 (Auditor, Outreach, Treasurer) tick. Every verified skill shows the exact CV words it came from. Step 2 waits for you: an autopilot can\u2019t sit the exam, which is why the passport means something.",
  },
  {
    time: "0:30–1:30",
    where: "Step 2 \u00b7 Examiner",
    click: "Click \u201c2 Examiner\u201d. Press \u201c1-Click Apply Fix & Run\u201d. Tick the consent box, then for each viva question press \u201cAuto-Fill Model Answer\u201d and \u201cGrade Answer\u201d. Press \u201cMint Passport\u201d.",
    look: "Tests run in a sandboxed Web Worker. Viva points need quotes from the answer. Because you used the reference fix and model answers, the passport and its /verify page say \u201cViewed reference fix\u201d: shortcuts are disclosed, not hidden.",
  },
  {
    time: "1:30–2:15",
    where: "Steps 3 and 4",
    click: "Click \u201c3 Outreach\u201d, then \u201c4 Treasurer\u201d.",
    look: "The contract is a fixed bilingual template (Clause 4 extends deadlines by an internet outage + 48 h). The pitch is rejected if it names a dollar amount not in the contract. The Treasurer banner reads \u201cEvery route reconciles to the paisa\u201d: money is computed by tested code, never by the model.",
  },
  {
    time: "2:15–2:45",
    where: "/rokkha",
    click: "Press \u201c\u09a8\u09ae\u09c1\u09a8\u09be \u09ac\u09be\u09b0\u09cd\u09a4\u09be \u09a6\u09c7\u0996\u09c1\u09a8\u201d (Try a sample).",
    look: "The same trust engine, reused for scam messages: each warning sign quotes the exact words it matched. With no match it says \u201cthis does NOT mean it is safe\u201d, never \u201csafe\u201d.",
  },
  {
    time: "2:45–3:00",
    where: "/trust",
    click: "Open the measured results.",
    look: "The evidence-quote check, trap CVs, pitch amount guard and fee reconciliation, with sample sizes and limits, from a script anyone can re-run.",
  },
];

/** The other 11 apps: the same rules, reused. Claims here are limited to behaviour the code enforces. */
const APPS = [
  { name: "Rokkha", href: "/rokkha", what: "Scam-message checker and cooling-off pause", tryIt: "Press \u2018\u09a8\u09ae\u09c1\u09a8\u09be \u09ac\u09be\u09b0\u09cd\u09a4\u09be \u09a6\u09c7\u0996\u09c1\u09a8\u2019: each scam sign is highlighted with the exact words quoted.", trust: "Rule-based and offline. No hits never means \u2018safe\u2019; every helpline has an official source and check date." },
  { name: "FeeGuard BD", href: "/feeguard", what: "What reaches you from a freelance payment", tryIt: "Enter an invoice and compare the payout routes fee by fee.", trust: "Same engine as the Treasurer (lib/finops.ts); every route reconciles, every fee shows its source and check date." },
  { name: "ChuktiGuard", href: "/chuktiguard", what: "Contracts and consumer complaints", tryIt: "Open \u2018\u09ad\u09cb\u0995\u09cd\u09a4\u09be \u09ac\u09bf\u09b0\u09cb\u09a7\u2019 to draft a consumer complaint.", trust: "Clauses come from fixed templates; the model never writes legal text." },
  { name: "My Path Board", href: "/opportunities", what: "Jobs, scholarships and deadlines you track", tryIt: "Search for an opportunity.", trust: "Web results are shown as unverified search output with their sources, never as confirmed openings." },
  { name: "AdmitBuddy", href: "/admitbuddy", what: "University admission planner", tryIt: "Press \u2018Try an example\u2019 to see fit scores and a readability check on an SOP.", trust: "Never invents admission dates: students add dates from official circulars, with the source." },
  { name: "Probaho Coach", href: "/probaho", what: "Interview and viva practice", tryIt: "Answer a practice question.", trust: "Praise must quote your own words, checked in code; the score is computed by rules, not the model." },
  { name: "Shohoj Budget", href: "/shohoj-budget", what: "Voice-first Bangla household budget", tryIt: "Say or type an expense in Bangla.", trust: "Integer poisha maths; nothing parsed from speech or SMS is saved until you confirm it." },
  { name: "MediScan BD", href: "/mediscan", what: "Prescription reader and health help", tryIt: "Open a sample prescription to see medicines and timing in plain Bangla.", trust: "Never diagnoses; a medicine not in the list is never called \u2018safe\u2019; the 999 emergency strip is on every page." },
  { name: "Legal Aid", href: "/legal", what: "Legal information and free legal aid routes", tryIt: "Ask a question or open the demo case.", trust: "Information, not advice: only helplines and laws with an official source; eligibility always ends \u2018the legal aid office decides\u2019." },
  { name: "HaatBazar AI", href: "/haatbazar", what: "Is the far market worth the trip", tryIt: "Open \u2018\u09ab\u09b8\u09b2 \u09a1\u09be\u0995\u09cd\u09a4\u09be\u09b0\u2019 and tap symptoms.", trust: "No pesticide doses ever; refers to the product label and Krishi Call Centre 16123." },
  { name: "MaathSathi", href: "/krishi/field#/farmer", what: "Farmer field companion", tryIt: "Opens in Bangla: field map, tasks and crop doctor.", trust: "No doses for crops or animals; prices and yields are the farmer\u2019s own entries." },
];

export default function JudgesPage() {
  const lang = "en";

  return (
    <div className="min-h-screen flex flex-col bg-[#f8fafc] text-slate-900 antialiased">
      <AppHeader
        appId="kormopath"
        href="/judges"
        name="Judge tour"
        taglineEn="Test KormoPath in 3 minutes"
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
            <span>3-minute path</span>
          </div>
          <h1 className="text-[28px] sm:text-[36px] font-extrabold leading-tight tracking-tight text-slate-900">
            KormoPath in 3 minutes
          </h1>
          <p className="max-w-3xl text-[15px] sm:text-[16px] leading-relaxed text-slate-700">
            One user, one journey: a Bangladeshi student freelancer who can code but can&rsquo;t prove it. KormoPath takes them from <strong>skill proof</strong> (a signed Skill Passport) to a <strong>fair contract</strong> to the <strong>exact taka received</strong>, with four agents. The same trust engine runs 11 more apps, 12 in all: the AI reads and writes, code checks every claim, and money is never calculated by the model. No sign-up needed.
          </p>
          <div className="flex flex-wrap items-center gap-3 pt-1">
            <Link
              href="/workspace"
              className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-orange-600 px-5 py-2.5 text-[15px] font-bold text-white shadow-sm hover:bg-orange-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 transition-all active:scale-[0.98]"
            >
              <span>Start with the flagship → Workspace</span>
              <ArrowRight size={16} />
            </Link>
            <Link
              href="/demo"
              className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-orange-300 bg-white/90 px-5 py-2.5 text-[15px] font-bold text-orange-800 hover:bg-orange-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 transition-all active:scale-[0.98]"
            >
              <Play size={14} className="fill-orange-800" />
              <span>Watch the demo</span>
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

        {/* Section 1: the 3-minute path */}
        <section aria-labelledby="flag-h" className="rounded-2xl border border-slate-200/80 bg-white/80 backdrop-blur-md p-5 sm:p-6 shadow-xs hover:shadow-md transition-all">
          <h2 id="flag-h" className="mb-1 text-[19px] font-bold text-slate-900 flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-orange-100 text-orange-800 text-[13px] font-bold">1</span>
            <span>The 3-minute path: skill proof → contract → payout, then one reuse</span>
          </h2>
          <p className="mb-4 text-[13px] text-slate-600">Tahmid Hasan is a sample profile that ships with the app, not a real person.</p>
          <ol className="space-y-3.5 divide-y divide-slate-100">
            {PATH.map((f, i) => (
              <li key={f.time} className={`grid gap-1 sm:grid-cols-[7.5rem_minmax(0,1fr)_minmax(0,1.2fr)] sm:gap-4 ${i > 0 ? "pt-3.5" : ""}`}>
                <span className="font-mono text-[13px] font-bold text-orange-800">{f.time}<span className="block font-sans text-[12px] font-semibold text-slate-500">{f.where}</span></span>
                <span className="text-[14px] font-semibold text-slate-900">{f.click}</span>
                <span className="text-[13px] text-slate-600 leading-relaxed"><strong className="text-slate-800">Look for:</strong> {f.look}</span>
              </li>
            ))}
          </ol>
        </section>

        {/* Live Assertion Harness */}
        <section aria-labelledby="harness-h" className="rounded-2xl border border-slate-200/80 bg-white/80 backdrop-blur-md p-5 sm:p-6 shadow-xs hover:shadow-md transition-all">
          <LiveAssertionHarness />
        </section>

        {/* Section 2: the 11 apps that reuse the engine */}
        <section aria-labelledby="apps-h" className="space-y-4">
          <h2 id="apps-h" className="text-[19px] font-bold text-slate-900 flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-orange-100 text-orange-800 text-[13px] font-bold">2</span>
            <span>The same trust engine, reused in 11 more apps</span>
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
                    className="inline-flex min-h-[44px] items-center gap-1 rounded-xl border border-slate-300/80 bg-white px-3.5 py-1.5 text-[13px] font-bold text-slate-800 hover:border-slate-500 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 transition-all"
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
            <li>App data stays in your browser; see <Link href="/settings" className="font-semibold text-orange-700 underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 rounded">Data &amp; privacy</Link> for exactly what is sent to which service.</li>
            <li>Information only — not medical, legal, tax or financial advice.</li>
            <li>Source code: <a href="https://github.com/razibr246/Kormopath" className="font-semibold text-orange-700 underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 rounded" target="_blank" rel="noopener noreferrer">github.com/razibr246/Kormopath</a></li>
          </ul>
        </section>
      </main>
      <AppFooter lang={lang} />
    </div>
  );
}
