"use client";
import { useState } from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle2, ExternalLink, FlaskConical, Gauge, ShieldCheck, TriangleAlert, XCircle } from "lucide-react";
import { AppHeader } from "@/components/layout/AppHeader";
import { AppFooter } from "@/components/layout/AppFooter";

/** Shape of lib/eval-results.json, written by scripts/eval.ts. Every number on this page comes from it. */
export type EvalResults = {
  generatedAt: string;
  base: string;
  engines: Record<string, number>;
  audit: { cvs: number; skillsReturned: number; verified: number; verifiedQuoteFound: number; rejectedByEvidenceCheck: number; failures: string[] };
  probes: Array<{ id: string; label: string; passed: boolean; verifiedSkills: string[]; leaked: string[] }>;
  pitch: { runs: number; fromModel: number; amountsFound: number; amountsNotInContract: number; marketplaceMentions: number; failures: string[] };
  coach: { runs: number; fromModel: number; quotes: number; quotesFound: number; failures: string[] };
  fees: { cases: number; channelRoutes: number; failures: number; maxErrorBdt: number };
  latencyMs: Record<string, { n: number; p50: number | null; p95: number | null }>;
};

type Lang = "en" | "bn";
const BN_DIGITS = "০১২৩৪৫৬৭৮৯";
const num = (n: number | null | undefined, lang: Lang) => {
  if (n === null || n === undefined || !Number.isFinite(n)) return "—";
  const s = n.toLocaleString("en-US");
  return lang === "bn" ? s.replace(/\d/g, (d) => BN_DIGITS[Number(d)]) : s;
};
const secs = (ms: number | null | undefined, lang: Lang) => {
  if (ms === null || ms === undefined) return "—";
  if (ms < 1000) return `${num(Math.round(ms), lang)} ${lang === "bn" ? "মি.সে." : "ms"}`;
  return `${num(Math.round(ms / 100) / 10, lang)} ${lang === "bn" ? "সে." : "s"}`;
};

const ROUTE_NAMES: Record<string, { en: string; bn: string }> = {
  "/api/audit": { en: "Auditor (CV → skills)", bn: "অডিটর (সিভি → দক্ষতা)" },
  "/api/pitch": { en: "Outreach (pitch email)", bn: "আউটরিচ (পিচ ইমেইল)" },
  "/api/probaho/coach": { en: "Probaho coach", bn: "প্রবাহ কোচ" },
};

function engineLabel(engine: string, lang: Lang, primary: string) {
  if (engine.startsWith("http-")) return lang === "bn" ? `অনুরোধ ব্যর্থ (HTTP ${engine.slice(5)})` : `Request failed (HTTP ${engine.slice(5)})`;
  if (engine === primary) return lang === "bn" ? `${engine} (মূল মডেল)` : `${engine} (primary model)`;
  if (engine.startsWith("gemini")) return lang === "bn" ? `${engine} (হালকা বিকল্প মডেল)` : `${engine} (lighter fallback model)`;
  return lang === "bn" ? `${engine} (নিয়মভিত্তিক বিকল্প, এআই নয়)` : `${engine} (rule-based fallback, no AI)`;
}

function Ratio({ ok, total, lang }: { ok: number; total: number; lang: Lang }) {
  const good = total > 0 && ok === total;
  return (
    <p className="font-mono text-[30px] font-bold leading-none tracking-tight">
      <span className={good ? "text-emerald-700" : "text-orange-700"}>{num(ok, lang)}</span>
      <span className="text-slate-400"> / {num(total, lang)}</span>
    </p>
  );
}

function Card({ title, children, n }: { title: string; children: React.ReactNode; n: string }) {
  return (
    <article className="flex min-w-0 flex-col gap-3 rounded-2xl border border-line bg-card p-5 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-[16px] font-bold text-slate-900">{title}</h3>
        <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 font-mono text-[11px] text-slate-600">{n}</span>
      </div>
      {children}
    </article>
  );
}

function Failures({ items, lang }: { items: string[]; lang: Lang }) {
  if (!items.length) return null;
  return (
    <ul className="space-y-1 rounded-xl bg-orange-50 p-3 text-[12.5px] text-orange-900">
      <li className="font-semibold">{lang === "bn" ? "যা ব্যর্থ হয়েছে:" : "What failed:"}</li>
      {items.map((f) => <li key={f} className="break-words">• {f}</li>)}
    </ul>
  );
}

export function TrustView({ results: r, primaryModel }: { results: EvalResults; primaryModel: string }) {
  const [lang, setLang] = useState<Lang>("en");
  const bn = lang === "bn";
  const t = (en: string, b: string) => (bn ? b : en);

  const when = new Intl.DateTimeFormat(bn ? "bn-BD" : "en-GB", { timeZone: "Asia/Dhaka", dateStyle: "long", timeStyle: "short" }).format(new Date(r.generatedAt));
  const totalCalls = Object.values(r.engines).reduce((a, b) => a + b, 0);
  const primaryAnswers = r.engines[primaryModel] ?? 0;
  const ruleAnswers = Object.entries(r.engines).filter(([e]) => !e.startsWith("gemini") && !e.startsWith("http-")).reduce((a, [, n]) => a + n, 0);
  const failedRequests = Object.entries(r.engines).filter(([e]) => e.startsWith("http-")).reduce((a, [, n]) => a + n, 0);
  const probesPassed = r.probes.filter((p) => p.passed).length;

  const limits: string[] = [
    t(`Small sample: ${num(r.audit.cvs, lang)} sample CVs, ${num(r.pitch.runs, lang)} pitches and ${num(r.coach.runs, lang)} coach answers. The CVs and answers were written by us, not collected from real users.`,
      `নমুনা ছোট: ${num(r.audit.cvs, lang)}টি নমুনা সিভি, ${num(r.pitch.runs, lang)}টি পিচ ও ${num(r.coach.runs, lang)}টি কোচ-উত্তর। এগুলো আমাদের লেখা, বাস্তব ব্যবহারকারীর কাছ থেকে নেওয়া নয়।`),
    t(`The ${num(r.probes.length, lang)} hallucination probes are our own test inputs. Passing them does not prove the model can never be tricked.`,
      `${num(r.probes.length, lang)}টি হ্যালুসিনেশন-পরীক্ষা আমাদের নিজের বানানো। এগুলো পাস করা মানে এই নয় যে মডেলকে কখনো ভুল পথে নেওয়া যাবে না।`),
    t("The quote checks prove a skill or praise is written in the source text. They do not prove the person really has that skill.",
      "উদ্ধৃতি-যাচাই শুধু প্রমাণ করে দক্ষতা বা প্রশংসাটি মূল লেখায় আছে। ব্যক্তির আসলেই সেই দক্ষতা আছে কি না, তা প্রমাণ করে না।"),
    ...(primaryAnswers === 0
      ? [t(`In this run no answer came from the primary model (${primaryModel}); it was rate-limited or timed out on our free-tier key, so the lighter model answered. The app logs this in every trace.`,
           `এই পরিমাপে মূল মডেল (${primaryModel}) থেকে কোনো উত্তর আসেনি; আমাদের ফ্রি-টিয়ার কি-তে সেটি রেট-লিমিট বা টাইমআউট হয়েছে, তাই হালকা মডেল উত্তর দিয়েছে। অ্যাপ প্রতিটি ট্রেসে এটি দেখায়।`)]
      : []),
    t(`Speed was measured on a ${r.base}, not on the live Vercel site. The first call after a cold start can be slower.`,
      `গতি মাপা হয়েছে ${r.base === "local production build" ? "লোকাল প্রোডাকশন বিল্ডে" : r.base}, লাইভ ভার্সেল সাইটে নয়। কোল্ড স্টার্টের পর প্রথম কল ধীর হতে পারে।`),
    t("FeeGuard's math is exact, but its fee and tax parameters are indicative, each with a source and the date we checked it (lib/data.ts). Platforms change fees; check before you rely on them.",
      "ফি-গার্ডের হিসাব নির্ভুল, কিন্তু ফি ও করের মানগুলো নির্দেশক; প্রতিটির উৎস ও যাচাইয়ের তারিখ আছে (lib/data.ts)। প্ল্যাটফর্ম ফি বদলায়; ভরসা করার আগে মিলিয়ে নিন।"),
    t("Web-search features (opportunities, product prices, market search) have no rule-based fallback: without a working Gemini key they return an error instead of guessing.",
      "ওয়েব-খোঁজের ফিচারগুলোর (সুযোগ, পণ্যের দাম, বাজার খোঁজ) নিয়মভিত্তিক বিকল্প নেই: জেমিনি কি কাজ না করলে অনুমান না করে ত্রুটি দেখায়।"),
  ];

  return (
    <div className="flex min-h-screen flex-col bg-paper text-ink antialiased">
      <AppHeader
        appId="kormopath"
        href="/trust"
        name={t("Measured results", "পরিমাপ করা ফল")}
        taglineEn="AI you can check"
        taglineBn="যাচাই করা যায় এমন এআই"
        icon={<FlaskConical size={22} />}
        accent="from-emerald-600 to-teal-700"
        privacyNote={null}
      />
      <main id="main" lang={lang} className="mx-auto w-full max-w-5xl flex-1 space-y-8 px-4 py-8 sm:px-6">
        {/* 1. Hero */}
        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="kp-eyebrow">{t("Transparency report", "স্বচ্ছতা প্রতিবেদন")}</p>
            <button type="button" onClick={() => setLang(bn ? "en" : "bn")} className="kp-chip font-semibold" aria-label={bn ? "View in English" : "বাংলায় দেখুন"}>
              {bn ? "English" : "বাংলা"}
            </button>
          </div>
          <h1 className="text-[28px] font-extrabold leading-tight tracking-tight text-slate-900 sm:text-[38px]">
            {t("AI you can check — ", "যাচাই করা যায় এমন এআই — ")}<span className="kp-em">{t("measured, not claimed", "দাবি নয়, পরিমাপ")}</span>
          </h1>
          <p className="max-w-3xl text-[15px] leading-relaxed text-slate-700">
            {t("A script runs KormoPath's real agents on fixed inputs and checks every output with code that does not trust the app's own checks. Every number below is read from that run. Nothing here is typed in by hand.",
               "একটি স্ক্রিপ্ট নির্দিষ্ট ইনপুটে কর্মপথের আসল এজেন্টগুলো চালায় এবং অ্যাপের নিজের যাচাইয়ের ওপর ভরসা না করে আলাদা কোড দিয়ে প্রতিটি ফল মিলিয়ে দেখে। নিচের প্রতিটি সংখ্যা সেই পরিমাপ থেকে নেওয়া; হাতে লেখা কিছু নেই।")}
          </p>
          <div className="flex flex-wrap gap-2 text-[13px]">
            <span className="kp-chip h-auto max-w-full whitespace-normal py-1.5"><Gauge size={14} className="shrink-0 text-emerald-700" /> {t("Measured", "পরিমাপের সময়")}: {when} ({t("Dhaka time", "ঢাকা সময়")})</span>
            <span className="kp-chip font-mono">{t("Reproduce", "নিজে চালান")}: npm run eval</span>
          </div>
        </section>

        {/* 2. Measured results */}
        <section aria-labelledby="results-h" className="space-y-4">
          <h2 id="results-h" className="text-[21px] font-bold text-slate-900">{t("What we measured", "যা মাপা হয়েছে")}</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <Card title={t("Auditor: every verified skill quotes the CV", "অডিটর: প্রতিটি যাচাইকৃত দক্ষতা সিভি থেকে উদ্ধৃত")} n={`n = ${num(r.audit.cvs, lang)} ${t("CVs", "সিভি")}`}>
              <Ratio ok={r.audit.verifiedQuoteFound} total={r.audit.verified} lang={lang} />
              <p className="text-[13.5px] leading-relaxed text-slate-600">
                {t(`Skills marked "verified" whose evidence quote we found word-for-word in the CV. The model returned ${num(r.audit.skillsReturned, lang)} skills; the evidence check rejected ${num(r.audit.rejectedByEvidenceCheck, lang)}.`,
                   `"যাচাইকৃত" দক্ষতা, যার প্রমাণ-উদ্ধৃতি আমরা সিভিতে হুবহু পেয়েছি। মডেল ${num(r.audit.skillsReturned, lang)}টি দক্ষতা দিয়েছে; প্রমাণ-যাচাই বাদ দিয়েছে ${num(r.audit.rejectedByEvidenceCheck, lang)}টি।`)}
              </p>
              <Failures items={r.audit.failures} lang={lang} />
            </Card>

            <Card title={t("Hallucination probes", "হ্যালুসিনেশন পরীক্ষা")} n={`n = ${num(r.probes.length, lang)}`}>
              <Ratio ok={probesPassed} total={r.probes.length} lang={lang} />
              <ul className="space-y-2 text-[13.5px]">
                {r.probes.map((p) => (
                  <li key={p.id} className="flex gap-2">
                    {p.passed ? <CheckCircle2 size={17} className="mt-0.5 shrink-0 text-emerald-700" /> : <XCircle size={17} className="mt-0.5 shrink-0 text-orange-700" />}
                    <span className="min-w-0 text-slate-700">
                      <b>{p.label}</b>{" — "}
                      {p.verifiedSkills.length
                        ? t(`verified: ${p.verifiedSkills.join(", ")}`, `যাচাইকৃত: ${p.verifiedSkills.join(", ")}`)
                        : t("no skill was verified", "কোনো দক্ষতা যাচাইকৃত হয়নি")}
                      {p.leaked.length ? t(` · invented: ${p.leaked.join(", ")}`, ` · বানানো: ${p.leaked.join(", ")}`) : ""}
                    </span>
                  </li>
                ))}
              </ul>
            </Card>

            <Card title={t("Outreach: no dollar figure outside the contract", "আউটরিচ: চুক্তির বাইরে কোনো ডলারের অঙ্ক নয়")} n={`n = ${num(r.pitch.runs, lang)} ${t("pitches", "পিচ")}`}>
              <p className="font-mono text-[30px] font-bold leading-none tracking-tight">
                <span className={r.pitch.amountsNotInContract === 0 ? "text-emerald-700" : "text-orange-700"}>{num(r.pitch.amountsNotInContract, lang)}</span>
                <span className="text-[15px] font-semibold text-slate-500"> {t(`of ${num(r.pitch.amountsFound, lang)} dollar figures were not in the contract`, `/ ${num(r.pitch.amountsFound, lang)}টি ডলারের অঙ্ক চুক্তিতে ছিল না`)}</span>
              </p>
              <p className="text-[13.5px] leading-relaxed text-slate-600">
                {t(`${num(r.pitch.fromModel, lang)} of ${num(r.pitch.runs, lang)} pitches were written by the model; the rest used the fixed template. Marketplace mentions: ${num(r.pitch.marketplaceMentions, lang)}.`,
                   `${num(r.pitch.runs, lang)}টির মধ্যে ${num(r.pitch.fromModel, lang)}টি পিচ মডেল লিখেছে; বাকিগুলো নির্দিষ্ট টেমপ্লেট থেকে। মার্কেটপ্লেসের উল্লেখ: ${num(r.pitch.marketplaceMentions, lang)}।`)}
              </p>
              <Failures items={r.pitch.failures} lang={lang} />
            </Card>

            <Card title={t("Probaho coach: praise quotes your own words", "প্রবাহ কোচ: প্রশংসায় আপনার নিজের কথা")} n={`n = ${num(r.coach.runs, lang)} ${t("answers", "উত্তর")}`}>
              <Ratio ok={r.coach.quotesFound} total={r.coach.quotes} lang={lang} />
              <p className="text-[13.5px] leading-relaxed text-slate-600">
                {t(`Quotes in the coach's praise that we found in the speaker's answer. ${num(r.coach.fromModel, lang)} of ${num(r.coach.runs, lang)} coach replies came from the model; the score itself is always computed by code.`,
                   `কোচের প্রশংসার উদ্ধৃতি, যা আমরা বক্তার উত্তরে পেয়েছি। ${num(r.coach.runs, lang)}টির মধ্যে ${num(r.coach.fromModel, lang)}টি কোচ-উত্তর মডেল থেকে; স্কোর সবসময় কোড হিসাব করে।`)}
              </p>
              <Failures items={r.coach.failures} lang={lang} />
            </Card>

            <Card title={t("FeeGuard: every taka reconciles", "ফি-গার্ড: প্রতিটি টাকার হিসাব মেলে")} n={`n = ${num(r.fees.cases, lang)} ${t("inputs", "ইনপুট")}`}>
              <p className="font-mono text-[30px] font-bold leading-none tracking-tight">
                <span className={r.fees.failures === 0 ? "text-emerald-700" : "text-orange-700"}>{num(r.fees.failures, lang)}</span>
                <span className="text-[15px] font-semibold text-slate-500"> {t("failures", "ব্যর্থতা")}</span>
              </p>
              <p className="text-[13.5px] leading-relaxed text-slate-600">
                {t(`Gross minus itemised fees equals net on ${num(r.fees.channelRoutes, lang)} payout routes across ${num(r.fees.cases, lang)} generated invoices. Largest rounding difference: ৳${num(r.fees.maxErrorBdt, lang)}. No AI is involved in this math.`,
                   `${num(r.fees.cases, lang)}টি তৈরি করা ইনভয়েসে ${num(r.fees.channelRoutes, lang)}টি পেআউট পথে মোট থেকে আলাদা আলাদা ফি বাদ দিলে নিট মেলে। সর্বোচ্চ রাউন্ডিং পার্থক্য: ৳${num(r.fees.maxErrorBdt, lang)}। এই হিসাবে কোনো এআই নেই।`)}
              </p>
            </Card>
          </div>
        </section>

        {/* 3. Speed and engines */}
        <section aria-labelledby="speed-h" className="space-y-4 rounded-2xl border border-line bg-card p-5 shadow-sm sm:p-6">
          <h2 id="speed-h" className="text-[21px] font-bold text-slate-900">{t("Speed, and who answered", "গতি, আর কে উত্তর দিল")}</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13.5px] sm:text-[14px]">
              <thead>
                <tr className="border-b border-line text-[11.5px] uppercase tracking-wider text-slate-500">
                  <th className="py-2 pr-3">{t("Agent", "এজেন্ট")}</th>
                  <th className="py-2 pr-3 text-right">n</th>
                  <th className="py-2 pr-3 text-right">{t("median", "মধ্যমা")}</th>
                  <th className="py-2 text-right leading-tight">{t("slowest 5%", "ধীরতম ৫%")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {Object.entries(r.latencyMs).map(([route, l]) => (
                  <tr key={route}>
                    <td className="py-2 pr-3 font-medium text-slate-800">{ROUTE_NAMES[route]?.[lang] ?? route}</td>
                    <td className="py-2 pr-3 text-right font-mono">{num(l.n, lang)}</td>
                    <td className="py-2 pr-3 text-right font-mono">{secs(l.p50, lang)}</td>
                    <td className="py-2 text-right font-mono">{secs(l.p95, lang)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div>
            <h3 className="mb-2 text-[15px] font-bold text-slate-900">{t(`Which engine answered (${num(totalCalls, lang)} calls)`, `কোন ইঞ্জিন উত্তর দিল (${num(totalCalls, lang)}টি কল)`)}</h3>
            <ul className="space-y-1.5 text-[14px]">
              {Object.entries(r.engines).sort((a, b) => b[1] - a[1]).map(([engine, n]) => (
                <li key={engine} className="flex flex-wrap items-baseline justify-between gap-x-3 border-b border-line/60 pb-1.5">
                  <span className="min-w-0 break-words text-slate-700">{engineLabel(engine, lang, primaryModel)}</span>
                  <span className="font-mono font-semibold">{num(n, lang)}</span>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-[13px] leading-relaxed text-slate-600">
              {t(`${num(ruleAnswers, lang)} answers came from a rule-based fallback and ${num(failedRequests, lang)} requests failed. Fallbacks are always labelled in the app's live trace, never hidden.`,
                 `${num(ruleAnswers, lang)}টি উত্তর নিয়মভিত্তিক বিকল্প থেকে এসেছে এবং ${num(failedRequests, lang)}টি অনুরোধ ব্যর্থ হয়েছে। অ্যাপের লাইভ ট্রেসে বিকল্প সবসময় চিহ্নিত থাকে, লুকানো হয় না।`)}
            </p>
          </div>
        </section>

        {/* 4. Honest limits */}
        <section aria-labelledby="limits-h" className="space-y-3 rounded-2xl border border-amber-300 bg-amber-50/70 p-5 sm:p-6">
          <h2 id="limits-h" className="flex items-center gap-2 text-[21px] font-bold text-slate-900">
            <TriangleAlert size={20} className="text-amber-700" /> {t("Honest limits", "সৎ সীমাবদ্ধতা")}
          </h2>
          <ul className="space-y-2 text-[14px] leading-relaxed text-slate-800">
            {limits.map((l) => <li key={l} className="flex gap-2"><span aria-hidden className="text-amber-700">•</span><span className="min-w-0">{l}</span></li>)}
          </ul>
        </section>

        {/* 5. Links */}
        <section className="flex flex-wrap gap-3">
          <Link href="/judges" className="kp-btn-primary">{t("2-minute judge tour", "২ মিনিটের বিচারক গাইড")} <ArrowRight size={15} /></Link>
          <Link href="/settings" className="kp-btn-ghost"><ShieldCheck size={15} /> {t("Privacy: what is sent where", "প্রাইভেসি: কোন তথ্য কোথায় যায়")}</Link>
          <a href="https://github.com/razibr246/Kormopath" target="_blank" rel="noopener noreferrer" className="kp-btn-ghost">
            {t("Source code on GitHub", "গিটহাবে সোর্স কোড")} <ExternalLink size={14} />
          </a>
        </section>
      </main>
      <AppFooter lang={lang} />
    </div>
  );
}
