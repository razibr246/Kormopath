import type { Metadata } from "next";
import Link from "next/link";
import { PlayCircle } from "lucide-react";
import { AppHeader } from "@/components/AppHeader";

export const metadata: Metadata = {
  title: "Demo video",
  description: "A narrated 2-minute tour of KormoPath: the four-agent flagship and six everyday apps.",
};

// Narration script with start times (seconds) matching public/demo/kormopath-demo.mp4.
const SCRIPT: [string, string][] = [
  ["0:00", "Meet KormoPath — AI you can check, built for young people in Bangladesh. I’m Razib Miah, and this is a two-minute tour."],
  ["0:09", "Every day, students here make big decisions — about careers, study, health and money — on information they can’t verify."],
  ["0:19", "Our flagship takes a freelancer from CV to money received. The Auditor reads the CV with Google Gemini — and only keeps a skill it can quote, word for word."],
  ["0:32", "The live trace shows every model call, schema check and fallback, with real timings. Nothing is hidden."],
  ["0:41", "The Examiner sets a real bug to fix in a sandbox, then a short viva. Pass both to earn a signed Skill Passport."],
  ["0:52", "Outreach drafts a pitch and a bilingual contract with an internet-shutdown clause. The pitch can’t mention any amount not in the contract."],
  ["1:02", "The Treasurer compares payout routes in taka. Fees are calculated by tested code — never by the model."],
  ["1:10", "The same rules power six everyday apps. AdmitBuddy matches students to universities — and never invents an admission date."],
  ["1:18", "MediScan reads a prescription in plain Bangla and turns it into reminders. It never diagnoses."],
  ["1:26", "Shohoj Budget understands spoken Bangla amounts — and saves nothing until you confirm."],
  ["1:32", "HaatBazar tells a farmer whether a distant market is worth the trip, with live weather."],
  ["1:38", "Probaho coaches interview answers — and its AI feedback must quote your own words."],
  ["1:44", "FeeGuard shows how much of a freelance payment really reaches you."],
  ["1:49", "Everything stays on your device. Judges can follow a two-minute tour on the site."],
  ["1:55", "Live now at kormopath.vercel.app. KormoPath — AI you can check. Thank you."],
];

export default function DemoPage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 antialiased">
      <AppHeader appId="kormopath" href="/demo" name="Demo video" taglineEn="KormoPath in 2 minutes" taglineBn="২ মিনিটে কর্মপথ" icon={<PlayCircle size={22} />} accent="from-orange-500 to-amber-600" privacyNote={null} />
      <main id="main" className="mx-auto max-w-5xl space-y-6 px-4 py-8 sm:px-6" lang="en">
        <h1 className="text-[28px] font-extrabold leading-tight sm:text-[34px]">KormoPath — 2-minute demo</h1>
        <video controls preload="metadata" playsInline className="aspect-video w-full rounded-2xl border border-slate-200 bg-slate-900" poster="">
          <source src="/demo/kormopath-demo.mp4" type="video/mp4" />
          <track kind="captions" src="/demo/kormopath-demo.vtt" srcLang="en" label="English" />
        </video>
        <p className="text-[14px] text-slate-600">
          Narrated in British English (synthesised voice), with captions. Screens recorded from this live site on 5 Nov 2026.{" "}
          <Link href="/judges" className="font-semibold underline">Try it yourself with the 2-minute judge tour →</Link>
        </p>
        <section aria-labelledby="script-h" className="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 id="script-h" className="mb-3 text-[18px] font-bold">Narration script</h2>
          <ol className="divide-y divide-slate-100">
            {SCRIPT.map(([t, line]) => (
              <li key={t} className="grid grid-cols-[3.5rem_minmax(0,1fr)] gap-3 py-2 text-[15px]">
                <span className="font-mono text-[13px] text-orange-700">{t}</span>
                <span>{line}</span>
              </li>
            ))}
          </ol>
        </section>
      </main>
    </div>
  );
}
