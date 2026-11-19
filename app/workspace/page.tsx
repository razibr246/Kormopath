"use client";
import Link from "next/link";
import dynamic from "next/dynamic";
import { Navbar, Footer } from "@/components/layout/Chrome";
import { HeroDevice } from "@/components/workspace/HeroDevice";
import { Telemetry } from "@/components/workspace/Telemetry";
import { StageAudit } from "@/components/workspace/StageAudit";

const StageLoading = () => (
  <div className="flex h-64 items-center justify-center rounded-2xl border border-line bg-white/60">
    <div className="flex items-center gap-2 text-sm text-slate-500 font-medium">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
      <span>ধাপ লোড হচ্ছে...</span>
    </div>
  </div>
);

const StageViva = dynamic(() => import("@/components/workspace/StageViva").then((m) => m.StageViva), { loading: StageLoading, ssr: false });
const StageContract = dynamic(() => import("@/components/workspace/StageContract").then((m) => m.StageContract), { loading: StageLoading, ssr: false });
const StageMoney = dynamic(() => import("@/components/workspace/StageMoney").then((m) => m.StageMoney), { loading: StageLoading, ssr: false });
import { EcosystemHub } from "@/components/home/EcosystemHub";
import { PERSONAS } from "@/lib/presets";
import { CHALLENGES } from "@/lib/challenges";
import { TRACKS } from "@/lib/data";
import EVAL from "@/lib/eval-results.json";
import { fmtBdt } from "@/lib/finops";
import { useWorkspaceMachine, fileToB64 } from "@/components/workspace/useWorkspaceMachine";
import {
  Check,
  Loader2,
  Sparkles,
  ShieldCheck,
  ArrowRight,
  ArrowUpRight,
  Compass,
  Code2,
  FileText,
  DollarSign,
  TrendingUp,
  HelpCircle,
  Layers,
  ChevronDown,
  Scale,
  Award,
  Zap,
  Percent,
} from "lucide-react";

const STAGES = [
  { n: 1, title: "Auditor", sub: "Checks each skill against your CV", icon: Compass },
  { n: 2, title: "Examiner", sub: "Code challenge + spoken viva", icon: Code2 },
  { n: 3, title: "Outreach", sub: "Pitch + bilingual contract", icon: FileText },
  { n: 4, title: "Treasurer", sub: "Fees, tax & taka received", icon: DollarSign },
] as const;

export default function Home() {
  const {
    lang,
    setLang,
    isEcosystemOpen,
    setIsEcosystemOpen,
    trace,
    inspect,
    stage,
    setStage,
    persona,
    setPersona,
    auto,
    fx,
    workRef,
    local,
    remember,
    cv,
    setCv,
    audit,
    auditBusy,
    auditErr,
    setAuditErr,
    runAudit,
    challengeId,
    challenge,
    code,
    setCode,
    results,
    compileError,
    running,
    assisted,
    setAssisted,
    grades,
    grading,
    passport,
    issuing,
    issueErr,
    pickChallenge,
    onRunTests,
    onGrade,
    onIssue,
    contract,
    setContract,
    pitch,
    pitching,
    pitchError,
    runPitch,
    invoice,
    setInvoice,
    withdrawals,
    setWithdrawals,
    claim,
    setClaim,
    fees,
    setFees,
    current,
    setCurrent,
    ledger,
    setLedger,
    reading,
    receiptMsg,
    finopsSummary,
    autopilot,
    onReceipt,
    hero,
    done,
    groundingDiffData,
  } = useWorkspaceMachine();

  // Every figure is live (FX) or measured by scripts/eval.ts (lib/eval-results.json).
  const proofBar = (
        <section aria-label={lang === "bn" ? "যাচাই করা ফলাফল" : "Measured results"} className="mt-4 overflow-hidden rounded-2xl border border-slate-200/80 bg-white/90 backdrop-blur-md shadow-xs">
          <div className="grid grid-cols-2 divide-x divide-line text-[12px] sm:grid-cols-4">
            {[
              {
                dot: "bg-emerald-500",
                label: lang === "bn" ? "সিভি থেকে উদ্ধৃতিসহ দক্ষতা" : "Skills quoted from the CV",
                value: `${EVAL.audit.verifiedQuoteFound}/${EVAL.audit.verified}`,
                note: lang === "bn" ? `${EVAL.audit.cvs}টি নমুনা সিভি` : `${EVAL.audit.cvs} sample CVs`,
              },
              {
                dot: "bg-orange-500",
                label: lang === "bn" ? "ফাঁদ-সিভি পরীক্ষা" : "Trap-CV tests passed",
                value: `${EVAL.probes.filter((p) => p.passed).length}/${EVAL.probes.length}`,
                note: lang === "bn" ? "কোনো দক্ষতা বানানো হয়নি" : "no invented skills",
              },
              {
                dot: "bg-emerald-500",
                label: lang === "bn" ? "ফি-হিসাব মিলেছে" : "Fee routes that reconcile",
                value: `${(EVAL.fees.channelRoutes - EVAL.fees.failures).toLocaleString("en-US")}/${EVAL.fees.channelRoutes.toLocaleString("en-US")}`,
                note: lang === "bn" ? `${EVAL.fees.cases.toLocaleString("en-US")}টি ইনপুট` : `${EVAL.fees.cases.toLocaleString("en-US")} generated inputs`,
              },
              {
                dot: fx.live ? "bg-emerald-500" : "bg-amber-500",
                label: fx.live ? (lang === "bn" ? "দৈনিক USD → BDT রেট" : "Daily USD → BDT rate") : (lang === "bn" ? "রেফারেন্স রেট" : "Reference USD → BDT"),
                value: `৳${fx.usdBdt.toFixed(2)}`,
                note: fx.source.label,
              },
            ].map((c) => (
              <div key={c.label} className="p-3.5 sm:p-4 text-center sm:text-left">
                <span className="flex items-center justify-center sm:justify-start gap-1.5 text-muted">
                  <span className={`h-2 w-2 rounded-full ${c.dot}`} aria-hidden="true" />
                  {c.label}
                </span>
                <strong className="block text-[16px] text-ink font-mono font-extrabold tabular-nums mt-0.5">{c.value}</strong>
                <span className="block text-[12px] text-muted line-clamp-2">{c.note}</span>
              </div>
            ))}
          </div>
          <Link href="/trust" className="flex min-h-[44px] items-center justify-center gap-1.5 border-t border-line px-3 py-2 text-[12px] font-semibold text-kept hover:bg-kept-soft/40">
            {lang === "bn" ? "কীভাবে মাপা হয়েছে দেখুন" : "How these were measured"} ·{" "}
            {new Date(EVAL.generatedAt).toLocaleDateString(lang === "bn" ? "bn-BD" : "en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Dhaka" })} →
          </Link>
        </section>
  );

  return (
    <>
      <Navbar
        lang={lang}
        setLang={setLang}
        usdBdt={fx.usdBdt}
        fxLive={fx.live}
        fxSource={fx.source}
        onOpenEcosystem={() => setIsEcosystemOpen(true)}
        isEcosystemOpen={isEcosystemOpen}
      />

      <main id="main" className="mx-auto max-w-7xl px-4 sm:px-6 space-y-12">
        {/* Proof bar (measured results): above the hero from 640px; on phones it follows the hero so the start button is above the fold. */}
        <div className="hidden sm:block">{proofBar}</div>

        {/* Hero Section */}
        <section aria-label="Introduction Hero" className="hero-section grid gap-8 pt-4 pb-6 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
          <div>
            <p className="kp-eyebrow">{lang === "bn" ? "ওয়ার্কস্পেস · চার ধাপ" : "Workspace · four steps"}</p>
            <h1 className="mt-3 max-w-[18ch] text-[clamp(36px,5vw,62px)] font-semibold leading-[1.05] tracking-tight text-slate-900">
              {lang === "bn" ? <>দক্ষতা থেকে <em className="kp-em">টাকা হাতে</em>, প্রমাণসহ</> : <>From skill to <em className="kp-em">money in hand</em>, with proof</>}
            </h1>
            <p className="mt-4 max-w-[58ch] text-[16px] leading-relaxed text-slate-600 sm:text-[18px]">
              {lang === "bn"
                ? "সিভি আর পাবলিক গিটহাব থেকে প্রমাণসহ দক্ষতা যাচাই, ব্রাউজারে কোড চ্যালেঞ্জ ও ভাইভা, সরাসরি ক্লায়েন্টের জন্য রিভিউ করা চুক্তি, আর ফি-কর-প্রণোদনার নির্ধারিত হিসাব। প্রতিটি ধাপে কী চলল, নিচের লগে দেখা যায়।"
                : "Skills checked against your CV and public GitHub, a code challenge and viva in your browser, a reviewed contract for a direct client, and fixed-rule maths for fees, tax and incentive. Every step shows what ran in the log below."}
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <button onClick={() => workRef.current?.scrollIntoView({ behavior: "smooth" })} className="kp-btn-primary kp-btn-lg">
                <span>{lang === "bn" ? "ধাপ ১ শুরু করুন" : "Start step 1"}</span>
                <ArrowRight size={16} />
              </button>
              <Link href="/feeguard" className="kp-btn-ghost kp-btn-lg">
                <Percent size={15} className="text-amber-700" />
                <span>{lang === "bn" ? "পেআউটের ফি দেখুন" : "Check payout fees"}</span>
              </Link>
            </div>
            <div className="mt-6">
              <HeroDevice />
            </div>
          </div>

          {/* Zero-Login Judge Sandbox Presets */}
          <div className="self-end rounded-2xl border-2 border-kept/50 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="flex h-3 w-3 rounded-full bg-kept animate-ping" />
                <h2 className="font-sans text-[16px] font-bold tracking-normal text-ink">{lang === "bn" ? "নমুনা প্রোফাইলে চালিয়ে দেখুন" : "Try it with a sample profile"}</h2>
              </div>
              <span className="rounded-full bg-amber-100/80 border border-amber-300/60 px-2.5 py-0.5 text-[11px] font-bold text-amber-900 shadow-2xs">
                {lang === "bn" ? "লগইন লাগে না" : "No login"}
              </span>
            </div>
            <p className="text-[13px] text-muted mb-3">
              {lang === "bn" ? "নমুনা প্রার্থী দিয়ে ১, ৩ ও ৪ নম্বর ধাপ একবারে চলে। ২ নম্বর ধাপ সরাসরি পরীক্ষা: সেটা কোনো অটোপাইলট আপনার হয়ে দিতে পারে না। এরা উদাহরণ, বাস্তব মানুষ নন।" : "Runs steps 1, 3 and 4 at once with a sample candidate. Step 2 is a live exam no autopilot can take for you. These are examples, not real people."}
            </p>
            <ul className="space-y-2.5">
              {PERSONAS.map((p) => (
                <li key={p.id}>
                  <button
                    onClick={() => autopilot(p)}
                    disabled={auto?.running}
                    className={`group flex w-full items-center gap-3 rounded-xl border px-3.5 py-3 text-left transition-all hover:border-kept hover:shadow-sm disabled:opacity-60 ${
                      persona?.id === p.id ? "border-kept bg-white ring-2 ring-kept/20 shadow-xs" : "border-slate-200/90 bg-slate-50/70 hover:bg-white"
                    }`}
                  >
                    <span className="display flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-orange-50 to-amber-100 border border-orange-200/60 text-[14px] font-extrabold text-orange-700 shadow-2xs">
                      {p.name.split(" ").map((w) => w[0]).join("")}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-bold text-[14px] text-ink">{p.name} ({p.city})</span>
                      <span className="block truncate text-[12px] text-muted">{p.oneLine}</span>
                    </span>
                    {auto?.running && persona?.id === p.id ? (
                      <Loader2 size={18} className="animate-spin text-kept shrink-0" />
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-orange-100/80 px-2.5 py-1 text-[11px] font-bold text-orange-700 group-hover:bg-orange-600 group-hover:text-white transition-colors shrink-0">
                        {lang === "bn" ? "চালান" : "Run"} <ArrowRight size={12} />
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
            <div className="mt-3 flex items-center justify-between text-[12px] text-muted pt-2 border-t border-line">
              <span>{lang === "bn" ? "কোনো সাইন আপ নেই।" : "No sign-up needed."}</span>
              <button
                onClick={() => setIsEcosystemOpen(true)}
                className="text-kept font-bold hover:underline inline-flex items-center gap-1 min-h-[44px] py-1"
              >
                {lang === "bn" ? "সব অ্যাপ দেখুন →" : "See all apps →"}
              </button>
            </div>
          </div>
        </section>
        <div className="sm:hidden">{proofBar}</div>

        {/* 4-Stage Guided Workspace */}
        <section id="pipeline" aria-label="4-Stage Guided Workspace">
          <div className="mb-4">
            <h2 className="display text-[26px] font-extrabold text-ink">
              {lang === "bn" ? "চার ধাপের পথ" : "The four-step path"}
            </h2>
            <p className="text-[14px] text-muted">
              From raw skill auditing to verified code testing, direct agreement generation, and deterministic cross-border payout.
            </p>
          </div>

          <div ref={workRef} className="grid scroll-mt-20 gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
            <div className="min-w-0">
              {auto && (
                <p
                  className={`mb-4 rounded-xl px-4 py-3 text-[14px] font-medium border ${
                    auto.running ? "bg-white border-line" : "bg-kept-soft border-kept/30 text-kept"
                  }`}
                  role="status"
                >
                  {auto.msg}
                </p>
              )}

              {/* Stage Nav Tabs */}
              <nav aria-label="KormoPath 4-Stage Pipeline" className="mb-5 grid grid-cols-2 gap-2 md:grid-cols-4 rounded-2xl border border-slate-200/90 bg-slate-100/70 p-1.5 shadow-2xs">
                {STAGES.map((s, i) => {
                  const Icon = s.icon;
                  return (
                    <button
                      key={s.n}
                      onClick={() => setStage(s.n)}
                      aria-current={stage === s.n ? "step" : undefined}
                      className={`flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-left transition-all ${
                        stage === s.n
                          ? "border border-[#3a2b1f] bg-[#1b130e] text-white shadow-md ring-1 ring-amber-400/20"
                          : "border border-transparent bg-white/70 hover:bg-white text-slate-800 hover:shadow-xs"
                      }`}
                    >
                      <span
                        className={`display flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[14px] font-bold transition-colors ${
                          done[i]
                            ? "bg-emerald-500 text-white shadow-xs"
                            : stage === s.n
                            ? "bg-white/15 text-white border border-white/20"
                            : "bg-slate-100 text-slate-500 border border-slate-200/60"
                        }`}
                      >
                        {done[i] ? <Check size={16} className="stroke-[2.5]" /> : <Icon size={16} />}
                      </span>
                      <span className="min-w-0">
                        <span className="block text-[14px] font-bold leading-tight truncate">{s.title}</span>
                        <span className={`block text-[11px] truncate ${stage === s.n ? "text-slate-300" : "text-slate-500"}`}>
                          {s.sub}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </nav>

              {/* Active Stage Body */}
              <div key={stage} className="stage-enter">
                {stage === 1 && (
                  <StageAudit
                    cv={cv}
                    setCv={setCv}
                    result={audit}
                    busy={auditBusy}
                    error={auditErr}
                    fx={fx.usdBdt}
                    onRun={(gh) => runAudit(cv, { github: gh })}
                    onFile={async (f, gh) => {
                      try {
                        const file = await fileToB64(f);
                        local("Auditor", "ocr-upload", `${file.name} (${Math.round(f.size / 1024)} KB)`);
                        await runAudit(cv, { file, github: gh });
                      } catch (e) {
                        setAuditErr((e as Error).message);
                      }
                    }}
                  />
                )}
                {stage === 2 && (
                  <StageViva
                    challenge={challenge}
                    setChallenge={pickChallenge}
                    code={code}
                    setCode={setCode}
                    results={results}
                    compileError={compileError}
                    running={running}
                    onRun={onRunTests}
                    assisted={assisted}
                    onReveal={() => {
                      setAssisted(true);
                      setCode(challenge.reference);
                      local("Examiner", "show-reference", "Reference fix displayed; passport flagged as assisted", 0, "warn");
                    }}
                    onAssisted={() => {
                      if (!assisted) local("Examiner", "model-answer", "Model viva answer auto-filled; passport flagged as assisted", 0, "warn");
                      setAssisted(true);
                    }}
                    grades={grades}
                    grading={grading}
                    onGrade={onGrade}
                    passport={passport}
                    issuing={issuing}
                    onIssue={onIssue}
                    issueError={issueErr}
                    documentSkills={audit?.skills.filter((s) => s.verdict === "verified").map((s) => s.name) ?? []}
                  />
                )}
                {stage === 3 && (
                  <StageContract
                    c={contract}
                    set={(p) => setContract((c) => ({ ...c, ...p }))}
                    pitch={pitch}
                    pitching={pitching}
                    onPitch={() => runPitch(contract, audit, passport?.id ?? null)}
                    passportId={passport?.id ?? null}
                    error={pitchError}
                  />
                )}
                {stage === 4 && (
                  <StageMoney
                    invoice={invoice}
                    setInvoice={setInvoice}
                    withdrawals={withdrawals}
                    setWithdrawals={setWithdrawals}
                    claim={claim}
                    setClaim={setClaim}
                    fees={fees}
                    setFee={(k, v) => setFees((f) => ({ ...f, [k]: v }))}
                    fx={fx}
                    current={current}
                    ledger={ledger}
                    addRow={(r) => setLedger((l) => [...l, { ...r, id: crypto.randomUUID() }])}
                    removeRow={(id) => setLedger((l) => l.filter((x) => x.id !== id))}
                    onReceipt={onReceipt}
                    reading={reading}
                    receiptMsg={receiptMsg}
                  />
                )}
              </div>

              {/* Back / Next Buttons */}
              <div className="mt-6 flex justify-between border-t border-line pt-4">
                <button
                  onClick={() => setStage((s) => Math.max(1, s - 1))}
                  disabled={stage === 1}
                  className="min-h-[44px] rounded-lg px-4 py-2 text-[14px] font-bold text-muted hover:text-ink disabled:invisible"
                >
                  ← Back
                </button>
                <button
                  onClick={() => setStage((s) => Math.min(4, s + 1))}
                  disabled={stage === 4}
                  className="min-h-[44px] rounded-lg bg-ink px-5 py-2 text-[14px] font-bold text-white hover:bg-ink/90 disabled:invisible flex items-center gap-1.5"
                >
                  Next: {STAGES[Math.min(3, stage)].title} <ArrowRight size={15} />
                </button>
              </div>
            </div>

            {/* Module 5: Access & Telemetry Hub Sidebar */}
            <Telemetry
              steps={trace}
              inspect={Object.values(inspect)}
              live={persona ? `Active Persona: ${persona.name}` : "Waiting for pipeline trigger"}
              groundingDiff={groundingDiffData}
            />
          </div>
        </section>

        {/* 2026 Bangladesh Freelance Rate Benchmarks */}
        <section id="benchmarks" aria-label="2026 Bangladesh Freelance Rate Matrix" className="rounded-2xl border border-line bg-white p-6 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
            <div>
              <span className="text-[12px] font-bold text-kept uppercase tracking-wider">Grounded Economic Data</span>
              <h2 className="display text-[26px] font-extrabold text-ink mt-0.5">
                2026 Bangladesh Freelance Rate Matrix
              </h2>
              <p className="text-[14px] text-muted">
                Official market benchmarks for Bangladeshi technical talent across local and foreign remote hiring.
              </p>
            </div>
            <span className="rounded-lg bg-paper px-3 py-1.5 text-[12px] font-mono text-muted border border-line">
              Dataset Base: 1 USD = ৳{fx.usdBdt.toFixed(1)} BDT
            </span>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {TRACKS.slice(0, 4).map((t) => (
              <div key={t.id} className="rounded-xl border border-line bg-paper/40 p-4 hover:border-kept transition-all">
                <span className="text-[11px] font-bold text-muted uppercase block">{t.demand}</span>
                <h3 className="font-bold text-[16px] text-ink mt-1">{t.name}</h3>
                <p className="display text-[24px] font-extrabold text-kept mt-2">
                  ${t.rateUsd[0]}–${t.rateUsd[1]}<span className="text-[14px] font-normal text-muted">/hr</span>
                </p>
                <p className="text-[12px] text-muted font-medium">
                  ≈ ৳{(t.rateUsd[0] * fx.usdBdt).toLocaleString()} – ৳{(t.rateUsd[1] * fx.usdBdt).toLocaleString()} BDT/hr
                </p>
                <div className="mt-3 border-t border-line pt-2 text-[12px]">
                  <span className="text-muted block">AI Replacement Risk:</span>
                  <div className="flex items-center justify-between font-bold mt-0.5">
                    <span style={{ color: t.aiRisk > 50 ? "var(--color-leak)" : t.aiRisk > 30 ? "var(--color-haldi)" : "var(--color-kept)" }}>
                      {t.aiRisk}% Exposure
                    </span>
                    <span className="text-muted font-normal text-[11px]">heuristic estimate</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Head-to-Head Comparison Table: Fiverr vs Direct Path */}
        <section id="comparison" aria-label="Marketplace vs Direct Comparison" className="rounded-2xl border border-line bg-white p-6 shadow-xs">
          <div className="flex flex-wrap items-end justify-between gap-3 mb-6">
            <div>
              <span className="text-[12px] font-bold text-kept uppercase tracking-wider">Financial Transparency</span>
              <h2 className="display text-[26px] font-extrabold text-ink mt-0.5">
                Marketplace Drain vs. KormoPath Direct Path
              </h2>
              <p className="text-[14px] text-muted">
                Why top Bangladeshi engineers transition from marketplace dependency to verified direct agreements.
              </p>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 border border-slate-200/80 px-3 py-1 text-[11px] font-semibold text-slate-600 sm:hidden">
              Swipe horizontally to compare →
            </span>
          </div>

          <div className="relative overflow-x-auto rounded-xl border border-line/80 shadow-2xs">
            <table className="w-full min-w-[700px] text-left text-[14px]">
              <thead className="bg-paper text-[13px] text-muted border-b border-line">
                <tr>
                  <th className="py-3 px-4">Dimension</th>
                  <th className="py-3 px-4 text-leak">Fiverr / Upwork Marketplace</th>
                  <th className="py-3 px-4 text-kept font-bold">KormoPath Direct Path</th>
                  <th className="py-3 px-4">Bangladeshi Impact</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                <tr>
                  <td className="py-3 px-4 font-semibold">Platform Fee Cut</td>
                  <td className="py-3 px-4 text-leak font-mono font-bold">-20% (Fiverr) / 0–15% (Upwork)</td>
                  <td className="py-3 px-4 text-kept font-mono font-bold">0% Direct Retainer</td>
                  <td className="py-3 px-4 text-muted">Step 4 shows the taka difference for your own invoice and today&apos;s rate</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-semibold">Government Incentive</td>
                  <td className="py-3 px-4 text-muted">0% (Ineligible on Payoneer/MFS)</td>
                  <td className="py-3 px-4 text-kept font-bold">+2.5% Bangladesh Bank Export Cash</td>
                  <td className="py-3 px-4 text-muted">2.5% of the amount, claimed through your bank (Bangladesh Bank FY2026-27 circular)</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-semibold">July-Style Internet Blackout</td>
                  <td className="py-3 px-4 text-leak">Account de-ranking, order cancellation, loss of badge</td>
                  <td className="py-3 px-4 text-kept font-bold">Clause 4: 48h Legal Buffer + UPS SLA</td>
                  <td className="py-3 px-4 text-muted">Deadlines extend by the outage + 48 h, once the client signs the clause</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-semibold">NBR Income Tax Exemption</td>
                  <td className="py-3 px-4 text-muted">Difficult to substantiate with platform screenshots</td>
                  <td className="py-3 px-4 text-kept font-bold">1-Click NBR ITES Bank Ledger (.CSV)</td>
                  <td className="py-3 px-4 text-muted">IT/ITES income earned 1 Jul 2024 – 30 Jun 2027 is exempt if fully received by bank (reported)</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-semibold">Skill Credibility</td>
                  <td className="py-3 px-4 text-muted">Static review stars vulnerable to review manipulation</td>
                  <td className="py-3 px-4 text-kept font-bold">HMAC SHA-256 Verified Skill Passport</td>
                  <td className="py-3 px-4 text-muted">Proves live bug-hunt + spoken viva performance</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* 5 Track Ecosystem Showcase */}
        <section id="ecosystem-preview" aria-label="Ecosystem Apps" className="rounded-2xl border border-line bg-white p-6 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
            <div>
              <span className="kp-eyebrow">{lang === "bn" ? "আরও টুল" : "More tools"}</span>
              <h2 className="display text-[26px] font-extrabold text-ink mt-1">
                {lang === "bn" ? "কর্মপথের অন্য টুলগুলো" : "Other KormoPath tools"}
              </h2>
              <p className="text-[14px] text-muted">
                {lang === "bn" ? "প্রতিটি টুল আলাদাভাবে চলে; ওপরের ডান দিকের \u201cসব অ্যাপ\u201d থেকেও খোলা যায়।" : "Each tool runs on its own; open them from \u201cAll apps\u201d at the top right too."}
              </p>
            </div>
            <button
              onClick={() => setIsEcosystemOpen(true)}
              className="kp-btn-ghost"
            >
              {lang === "bn" ? "সব অ্যাপ" : "All apps"} <ArrowRight size={15} />
            </button>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {/* 1. AdmitBuddy */}
            <div className="group rounded-2xl border border-line bg-paper/40 p-5 hover:border-indigo-500 hover:shadow-md transition-all flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[24px]">🏆</span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    WORKABLE APP
                  </span>
                </div>
                <h3 className="font-bold text-[17px] text-ink mt-2 group-hover:text-indigo-600 transition-colors">
                  AdmitBuddy
                </h3>
                <span className="text-[11px] font-bold text-indigo-700 uppercase tracking-wide">
                  Education &amp; Career Track
                </span>
                <p className="text-[13px] text-muted mt-2 leading-relaxed">
                  Matches Bangladeshi students with BUET/DU (Reach) vs SUST (Match) vs BRAC 50% waiver (Safety) and drafts SOP essays.
                </p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  <span className="text-[10px] font-semibold bg-white border border-line px-2 py-0.5 rounded text-ink/80">18 Universities</span>
                  <span className="text-[10px] font-semibold bg-white border border-line px-2 py-0.5 rounded text-ink/80">GPA % Matcher</span>
                  <span className="text-[10px] font-semibold bg-white border border-line px-2 py-0.5 rounded text-ink/80">AI SOP Studio</span>
                </div>
              </div>
              <Link
                href="/admitbuddy"
                className="mt-5 flex min-h-[44px] items-center justify-between rounded-xl bg-indigo-600 px-4 py-2.5 text-[13px] font-bold text-white hover:bg-indigo-700 transition-all shadow-xs group-hover:shadow"
              >
                <span>Launch AdmitBuddy</span>
                <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </div>

            {/* 2. MediScan BD */}
            <div className="group rounded-2xl border border-line bg-paper/40 p-5 hover:border-rose-500 hover:shadow-md transition-all flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[24px]">💊</span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    WORKABLE APP
                  </span>
                </div>
                <h3 className="font-bold text-[17px] text-ink mt-2 group-hover:text-rose-600 transition-colors">
                  MediScan BD
                </h3>
                <span className="text-[11px] font-bold text-rose-700 uppercase tracking-wide">
                  Health &amp; Services Track
                </span>
                <p className="text-[13px] text-muted mt-2 leading-relaxed">
                  Reads a prescription photo, explains what it says in plain Bangla (never diagnoses or changes a dose), finds the nearest emergency hospital and books doctors.
                </p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  <span className="text-[10px] font-semibold bg-white border border-line px-2 py-0.5 rounded text-ink/80">Vision OCR</span>
                  <span className="text-[10px] font-semibold bg-white border border-line px-2 py-0.5 rounded text-ink/80">Plain Bangla</span>
                  <span className="text-[10px] font-semibold bg-white border border-line px-2 py-0.5 rounded text-ink/80">Emergency hospitals</span>
                </div>
              </div>
              <Link
                href="/mediscan"
                className="mt-5 flex min-h-[44px] items-center justify-between rounded-xl bg-rose-600 px-4 py-2.5 text-[13px] font-bold text-white hover:bg-rose-700 transition-all shadow-xs group-hover:shadow"
              >
                <span>Launch MediScan BD</span>
                <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </div>

            {/* 3. Shohoj Budget */}
            <div className="group rounded-2xl border border-line bg-paper/40 p-5 hover:border-amber-500 hover:shadow-md transition-all flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[24px]">💰</span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    WORKABLE APP
                  </span>
                </div>
                <h3 className="font-bold text-[17px] text-ink mt-2 group-hover:text-amber-600 transition-colors">
                  Shohoj Budget
                </h3>
                <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wide">
                  Finance &amp; Productivity Track
                </span>
                <p className="text-[13px] text-muted mt-2 leading-relaxed">
                  Natural Bangla speech parsing (&quot;আজ ২০০ টাকা রিকশা ভাড়া দিয়েছি&quot;), daily safe-to-spend coach, and bKash cashflow alerts.
                </p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  <span className="text-[10px] font-semibold bg-white border border-line px-2 py-0.5 rounded text-ink/80">Bangla Speech AI</span>
                  <span className="text-[10px] font-semibold bg-white border border-line px-2 py-0.5 rounded text-ink/80">Daily Safe Limit</span>
                  <span className="text-[10px] font-semibold bg-white border border-line px-2 py-0.5 rounded text-ink/80">bKash SMS Parser</span>
                </div>
              </div>
              <Link
                href="/shohoj-budget"
                className="mt-5 flex min-h-[44px] items-center justify-between rounded-xl bg-amber-600 px-4 py-2.5 text-[13px] font-bold text-white hover:bg-amber-700 transition-all shadow-xs group-hover:shadow"
              >
                <span>Launch Shohoj Budget</span>
                <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </div>

            {/* 4. HaatBazar AI */}
            <div className="group rounded-2xl border border-line bg-paper/40 p-5 hover:border-emerald-600 hover:shadow-md transition-all flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[24px]">🌾</span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    WORKABLE APP
                  </span>
                </div>
                <h3 className="font-bold text-[17px] text-ink mt-2 group-hover:text-emerald-700 transition-colors">
                  HaatBazar AI
                </h3>
                <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wide">
                  Agriculture &amp; Marketplace Track
                </span>
                <p className="text-[13px] text-muted mt-2 leading-relaxed">
                  64-district mandi fair price intelligence (Bogura/Jessore vs Karwan Bazar), 7-day trend, and vegetable freshness AI grading.
                </p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  <span className="text-[10px] font-semibold bg-white border border-line px-2 py-0.5 rounded text-ink/80">64-District Mandis</span>
                  <span className="text-[10px] font-semibold bg-white border border-line px-2 py-0.5 rounded text-ink/80">Karwan Bazar Spread</span>
                  <span className="text-[10px] font-semibold bg-white border border-line px-2 py-0.5 rounded text-ink/80">Truck Calculator</span>
                </div>
              </div>
              <Link
                href="/haatbazar"
                className="mt-5 flex min-h-[44px] items-center justify-between rounded-xl bg-emerald-700 px-4 py-2.5 text-[13px] font-bold text-white hover:bg-emerald-800 transition-all shadow-xs group-hover:shadow"
              >
                <span>Launch HaatBazar AI</span>
                <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </div>

            {/* 5. Probaho Speaking Coach */}
            <div className="group rounded-2xl border border-line bg-paper/40 p-5 hover:border-blue-600 hover:shadow-md transition-all flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[24px]">🗣️</span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    WORKABLE APP
                  </span>
                </div>
                <h3 className="font-bold text-[17px] text-ink mt-2 group-hover:text-blue-600 transition-colors">
                  Probaho Speaking Coach
                </h3>
                <span className="text-[11px] font-bold text-blue-700 uppercase tracking-wide">
                  Productivity &amp; Career Track
                </span>
                <p className="text-[13px] text-muted mt-2 leading-relaxed">
                  Live viva interview radar detecting filler words (&quot;umm, like&quot;), measuring 130 WPM cadence, and grading technical confidence.
                </p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  <span className="text-[10px] font-semibold bg-white border border-line px-2 py-0.5 rounded text-ink/80">Live Viva Mic</span>
                  <span className="text-[10px] font-semibold bg-white border border-line px-2 py-0.5 rounded text-ink/80">Filler-Word Counter</span>
                  <span className="text-[10px] font-semibold bg-white border border-line px-2 py-0.5 rounded text-ink/80">130 WPM Cadence</span>
                </div>
              </div>
              <Link
                href="/probaho"
                className="mt-5 flex min-h-[44px] items-center justify-between rounded-xl bg-blue-600 px-4 py-2.5 text-[13px] font-bold text-white hover:bg-blue-700 transition-all shadow-xs group-hover:shadow"
              >
                <span>Launch Probaho Coach</span>
                <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </div>

            {/* FeeGuard BD */}
            <div className="group rounded-2xl border border-line bg-paper/40 p-5 hover:border-emerald-600 hover:shadow-md transition-all flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[24px]">💸</span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    WORKABLE APP
                  </span>
                </div>
                <h3 className="font-bold text-[17px] text-ink mt-2 group-hover:text-emerald-700 transition-colors">
                  FeeGuard BD
                </h3>
                <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wide">
                  FinOps &amp; Remittance Track
                </span>
                <p className="text-[13px] text-muted mt-2 leading-relaxed">
                  Marketplace fee audit comparing Fiverr (-20%) vs Upwork (variable 0–15%) vs direct wire (+2.5% Bangladesh Bank cash incentive).
                </p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  <span className="text-[10px] font-semibold bg-white border border-line px-2 py-0.5 rounded text-ink/80">Fiverr 20% Audit</span>
                  <span className="text-[10px] font-semibold bg-white border border-line px-2 py-0.5 rounded text-ink/80">+2.5% Incentive</span>
                  <span className="text-[10px] font-semibold bg-white border border-line px-2 py-0.5 rounded text-ink/80">Direct Pitch AI</span>
                </div>
              </div>
              <Link
                href="/feeguard"
                className="mt-5 flex min-h-[44px] items-center justify-between rounded-xl bg-emerald-700 px-4 py-2.5 text-[13px] font-bold text-white hover:bg-emerald-800 transition-all shadow-xs group-hover:shadow"
              >
                <span>Launch FeeGuard BD</span>
                <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </div>

            {/* 6. KormoPath Core OS */}
            <div className="rounded-2xl border-2 border-kept bg-kept-soft/50 p-5 flex flex-col justify-between shadow-xs">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[24px]">🧭</span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-kept px-2.5 py-0.5 text-[10px] font-bold text-white shadow-xs">
                    FLAGSHIP SYSTEM
                  </span>
                </div>
                <h3 className="font-bold text-[17px] text-ink mt-2">
                  KormoPath Core OS
                </h3>
                <span className="text-[11px] font-bold text-kept uppercase tracking-wide">
                  Central Flagship Platform
                </span>
                <p className="text-[13px] text-ink/80 mt-2 leading-relaxed">
                  The primary autonomous operating system uniting skill valuation, code verification, contract safety, and cross-border FinOps.
                </p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  <span className="text-[10px] font-semibold bg-white border border-kept/30 px-2 py-0.5 rounded text-kept">4-Stage Guided OS</span>
                  <span className="text-[10px] font-semibold bg-white border border-kept/30 px-2 py-0.5 rounded text-kept">HMAC Passport</span>
                  <span className="text-[10px] font-semibold bg-white border border-kept/30 px-2 py-0.5 rounded text-kept">Clause 4 UPS SLA</span>
                </div>
              </div>
              <button
                onClick={() => workRef.current?.scrollIntoView({ behavior: "smooth" })}
                className="mt-5 flex min-h-[44px] items-center justify-between rounded-xl bg-kept px-4 py-2.5 text-[13px] font-bold text-white hover:bg-kept/90 transition-all shadow-xs"
              >
                <span>Enter Guided Workspace</span>
                <ArrowUpRight size={14} />
              </button>
            </div>
          </div>
        </section>

        {/* Semantic HTML FAQ Section */}
        <section id="faq" aria-label="Frequently Asked Questions" className="rounded-2xl border border-line bg-white p-6 shadow-xs">
          <div className="mb-6">
            <span className="text-[12px] font-bold text-kept uppercase tracking-wider">Judges &amp; Engineering FAQ</span>
            <h2 className="display text-[26px] font-extrabold text-ink mt-0.5">
              Frequently Asked Questions
            </h2>
            <p className="text-[14px] text-muted">
              Everything technical and financial judges need to know about KormoPath&apos;s architecture.
            </p>
          </div>

          <div className="space-y-3">
            <details className="group rounded-xl border border-line bg-paper/40 p-4 transition-all" open>
              <summary className="flex cursor-pointer items-center justify-between font-bold text-[16px] text-ink list-none">
                <span>Why does KormoPath prohibit AI models from computing money or drafting legal clauses?</span>
                <ChevronDown size={18} className="text-muted group-open:rotate-180 transition-transform" />
              </summary>
              <p className="mt-3 text-[14px] text-muted leading-relaxed">
                Language models are probabilistic and inherently prone to numeric drift and hallucination. In KormoPath, all financial calculations (Fiverr fees, Payoneer FX, bKash cash-out, and the 2.5% Bangladesh Bank cash incentive) run exclusively in pure deterministic TypeScript functions in <code className="font-mono text-ink">lib/finops.ts</code> with a strict reconciliation invariant check (<code className="font-mono text-ink">Gross = Net + Itemized Leaks</code>). Similarly, legal contracts are fixed, reviewed templates in <code className="font-mono text-ink">lib/contract.ts</code> where untrusted model outputs can never alter legal clauses.
              </p>
            </details>

            <details className="group rounded-xl border border-line bg-paper/40 p-4 transition-all">
              <summary className="flex cursor-pointer items-center justify-between font-bold text-[16px] text-ink list-none">
                <span>What is Clause 4 and why does it specifically address Bangladeshi infrastructure?</span>
                <ChevronDown size={18} className="text-muted group-open:rotate-180 transition-transform" />
              </summary>
              <p className="mt-3 text-[14px] text-muted leading-relaxed">
                During the July 2024 national internet shutdown, freelancers in Bangladesh could not deliver work or answer clients for days. Clause 4 (Infrastructure Force-Majeure &amp; Asynchronous Delivery Buffer) is a fixed template clause: if both sides sign it, deadlines extend by the length of a nationwide internet shutdown or telecom failure plus a 48-hour buffer. It is a drafting aid, not legal advice; how it is enforced depends on the contract and the client.
              </p>
            </details>

            <details className="group rounded-xl border border-line bg-paper/40 p-4 transition-all">
              <summary className="flex cursor-pointer items-center justify-between font-bold text-[16px] text-ink list-none">
                <span>How does the KormoPath Skill Passport prevent fake claims?</span>
                <ChevronDown size={18} className="text-muted group-open:rotate-180 transition-transform" />
              </summary>
              <p className="mt-3 text-[14px] text-muted leading-relaxed">
                Rather than accepting self-reported CV claims or AI-generated portfolios, Examiner executes a realistic bug-hunt challenge inside an isolated browser Web Worker with a strict time budget. The user then answers two spoken viva questions via the Web Speech API, where points are only awarded if the examiner can quote literal phrases from the user&apos;s answer. Upon completion, a cryptographic HMAC SHA-256 fingerprint is minted and verifiable via a public <code className="font-mono text-ink">/verify</code> link.
              </p>
            </details>

            <details className="group rounded-xl border border-line bg-paper/40 p-4 transition-all">
              <summary className="flex cursor-pointer items-center justify-between font-bold text-[16px] text-ink list-none">
                <span>How does the NBR ITES Tax Exemption work for freelancers?</span>
                <ChevronDown size={18} className="text-muted group-open:rotate-180 transition-transform" />
              </summary>
              <p className="mt-3 text-[14px] text-muted leading-relaxed">
                Under the Finance Act 2024 (as reported; check the current Finance Act), income from Information Technology Enabled Services (ITES) earned between 1 July 2024 and 30 June 2027 is reported to be exempt from income tax in Bangladesh when received through formal banking channels; confirm with a tax adviser. KormoPath Treasurer provides an income ledger with receipt reading that exports a CSV you can give your tax advisor and bank.
              </p>
            </details>
          </div>
        </section>

        {/* Bottom CTA Banner */}
        <section aria-label="Call to Action" className="kp-cta text-center">
          <div className="relative z-10 mx-auto max-w-2xl">
            <h2 className="text-[clamp(28px,4vw,44px)] font-semibold leading-tight text-white">
              {lang === "bn" ? <>যাচাই, প্রমাণ, চুক্তি, <em className="italic text-[#ffe2b5]">তারপর টাকা</em></> : <>Value, prove, contract, <em className="italic text-[#ffe2b5]">then get paid</em></>}
            </h2>
            <p className="mt-3 text-[16px] text-white/85">
              {lang === "bn" ? "সাইন আপ নেই। ওপরের নমুনা প্রোফাইল বেছে নিন, অথবা নিজের সিভি দিন।" : "No sign-up. Pick a sample profile above, or paste your own CV."}
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-3">
              <button
                onClick={() => workRef.current?.scrollIntoView({ behavior: "smooth" })}
                className="kp-btn-ghost kp-btn-lg !border-white/40"
              >
                {lang === "bn" ? "ধাপ ১-এ যান ↑" : "Go to step 1 ↑"}
              </button>
              <button
                onClick={() => setIsEcosystemOpen(true)}
                className="kp-btn-ghost kp-btn-lg !border-white/40"
              >
                {lang === "bn" ? "সব অ্যাপ" : "All apps"}
              </button>
            </div>
          </div>
        </section>
      </main>

      {/* All-apps launcher modal */}
      <EcosystemHub
        isOpen={isEcosystemOpen}
        onClose={() => setIsEcosystemOpen(false)}
        activePersona={persona}
        onSelectPersona={autopilot}
        lang={lang}
        usdBdt={fx.usdBdt}
      />

      <Footer />
    </>
  );
}
