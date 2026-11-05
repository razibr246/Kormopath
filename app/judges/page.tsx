import type { Metadata } from "next";
import Link from "next/link";
import { Compass, ShieldCheck } from "lucide-react";
import { AppHeader } from "@/components/AppHeader";

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
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 antialiased">
      <AppHeader appId="kormopath" href="/judges" name="Judge tour" taglineEn="Test KormoPath in 2 minutes" taglineBn="বিচারকদের জন্য দ্রুত গাইড" icon={<Compass size={22} />} accent="from-orange-500 to-amber-600" privacyNote={null} />
      <main id="main" className="mx-auto max-w-5xl space-y-8 px-4 py-8 sm:px-6" lang="en">
        <section className="space-y-3">
          <h1 className="text-[28px] font-extrabold leading-tight sm:text-[34px]">KormoPath in 2 minutes</h1>
          <p className="max-w-3xl text-[15px] leading-relaxed text-slate-700">
            KormoPath helps young Bangladeshis make career, study, health and money decisions with AI they can check. The flagship takes a freelancer from CV to money received with four Gemini-backed agents; six everyday apps use the same rule: the AI reads and writes, code verifies every claim, and money is never calculated by the model. No sign-up needed.
          </p>
          <Link href="/workspace" className="inline-flex items-center gap-2 rounded-xl bg-orange-600 px-5 py-3 text-[15px] font-bold text-white shadow hover:bg-orange-700">
            Start with the flagship → Workspace
          </Link>
        </section>

        <section aria-labelledby="flag-h" className="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 id="flag-h" className="mb-3 text-[19px] font-bold">1 · Flagship: CV → verified skills → client → money home</h2>
          <ol className="space-y-3">
            {FLAGSHIP.map((f, i) => (
              <li key={i} className="grid gap-1 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] sm:gap-4">
                <span className="text-[14px] font-semibold">{i + 1}. {f.step}</span>
                <span className="text-[13px] text-slate-600">Look for: {f.look}</span>
              </li>
            ))}
          </ol>
        </section>

        <section aria-labelledby="apps-h" className="space-y-3">
          <h2 id="apps-h" className="text-[19px] font-bold">2 · Six everyday apps (Bangla-first UI, English headers)</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {APPS.map((a) => (
              <article key={a.name} className="flex flex-col gap-2 rounded-2xl border border-slate-200 bg-white p-5">
                <div className="flex items-baseline justify-between gap-2">
                  <h3 className="text-[17px] font-bold">{a.name}</h3>
                  <span className="text-[12px] text-slate-500">{a.what}</span>
                </div>
                <p className="text-[13px]"><strong>Try:</strong> {a.tryIt}</p>
                <p className="flex gap-1.5 text-[12px] text-slate-600"><ShieldCheck size={14} className="mt-0.5 shrink-0 text-emerald-700" aria-hidden /> {a.trust}</p>
                <Link href={a.href} className="mt-auto self-start rounded-lg border border-slate-300 px-3 py-1.5 text-[13px] font-bold hover:border-slate-500">Open {a.name} →</Link>
              </article>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 text-[13px] leading-relaxed text-slate-700">
          <h2 className="mb-2 text-[16px] font-bold">Good to know</h2>
          <ul className="list-disc space-y-1 pl-5">
            <li>AI runs on Google Gemini (Flash models). If the model is overloaded, KormoPath retries, switches to a lighter model, and finally falls back to rule-based agents — always labelled.</li>
            <li>App data stays in your browser; see <Link href="/settings" className="font-semibold underline">Data &amp; privacy</Link> for exactly what is sent to which service.</li>
            <li>Information only — not medical, legal, tax or financial advice.</li>
            <li>Source code: <a href="https://github.com/razibr246/Kormopath" className="font-semibold underline" target="_blank" rel="noopener noreferrer">github.com/razibr246/Kormopath</a></li>
          </ul>
        </section>
      </main>
    </div>
  );
}
