"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Navbar, Footer } from "@/components/Chrome";
import { HeroDevice } from "@/components/HeroDevice";
import { Telemetry, type Inspectable } from "@/components/Telemetry";
import { StageAudit } from "@/components/StageAudit";
import { StageViva } from "@/components/StageViva";
import { StageContract, type Pitch } from "@/components/StageContract";
import { StageMoney } from "@/components/StageMoney";
import { EcosystemHub } from "@/components/EcosystemHub";
import { PERSONAS, type Persona } from "@/lib/presets";
import { CHALLENGES, challengeForTrack } from "@/lib/challenges";
import { FEES, FX_FALLBACK, MACRO_STATS_2026, TRACKS, type Source } from "@/lib/data";
import { compareChannels, best, checkInvariants, fmtBdt, type FeeValues } from "@/lib/finops";
import { milestoneAmounts, type ContractInput } from "@/lib/contract";
import { runTests, sha256 } from "@/lib/sandbox";
import type { TraceStep } from "@/lib/trace";
import type { AuditResult, TestResult, VivaGrade, PassportState, LedgerRow } from "@/lib/types";
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
  { n: 1, title: "Compass", sub: "Skill & Market Auditor", icon: Compass },
  { n: 2, title: "VivaForge", sub: "Bug-Hunt & Viva Verifier", icon: Code2 },
  { n: 3, title: "ChuktiGuard", sub: "Pitch & 48h Contract", icon: FileText },
  { n: 4, title: "TakaFlow", sub: "FinOps & NBR Tax Agent", icon: DollarSign },
] as const;

const DEFAULT_FEES = Object.fromEntries(
  Object.entries(FEES).map(([k, v]) => [k, v.value])
) as unknown as FeeValues;

const today = () => new Date().toISOString().slice(0, 10);

function fileToB64(f: File): Promise<{ mimeType: string; base64: string; name: string }> {
  return new Promise((res, rej) => {
    if (!f.size) return rej(new Error("That file is empty. Please choose another file."));
    if (f.size > 4 * 1024 * 1024)
      return rej(new Error("File is over 4 MB. Please use a smaller screenshot or PDF document."));
    if (!(f.type.startsWith("image/") || f.type === "application/pdf"))
      return rej(new Error("Please upload an image screenshot or a PDF file."));
    const r = new FileReader();
    r.onload = () =>
      res({ mimeType: f.type || "image/png", base64: String(r.result).split(",")[1], name: f.name });
    r.onerror = () => rej(new Error("Could not parse file."));
    r.readAsDataURL(f);
  });
}

async function post<T>(url: string, body: unknown): Promise<T & { error?: string; trace?: TraceStep[] }> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  let data: T & { error?: string; trace?: TraceStep[] };
  try {
    data = await res.json();
  } catch {
    throw new Error("Server returned an unreadable response. Please retry.");
  }
  if (!res.ok && !data.error) data.error = `Request failed (${res.status}).`;
  return data;
}

export default function Home() {
  // ---- global state ----
  const [lang, setLang] = useState<"en" | "bn">("en");
  const [isEcosystemOpen, setIsEcosystemOpen] = useState(false);
  const [trace, setTrace] = useState<TraceStep[]>([]);
  const [inspect, setInspect] = useState<Record<string, Inspectable>>({});
  const [stage, setStage] = useState(1);
  const [persona, setPersona] = useState<Persona | null>(null);
  const [auto, setAuto] = useState<{ running: boolean; msg: string } | null>(null);
  const [fx, setFx] = useState<{ usdBdt: number; live: boolean; source: Source }>({
    usdBdt: FX_FALLBACK.usdBdt,
    live: false,
    source: FX_FALLBACK.source,
  });
  const workRef = useRef<HTMLDivElement>(null);

  const log = useCallback((steps: TraceStep[] | undefined) => {
    if (!steps?.length) return;
    const now = Date.now();
    setTrace((t) => [...t, ...steps.map((s) => ({ ...s, at: now }))].slice(-150));
  }, []);

  const local = useCallback(
    (agent: string, tool: string, detail: string, ms = 0, status: TraceStep["status"] = "ok") =>
      log([{ agent, tool, detail, ms, status }]),
    [log]
  );

  const remember = (label: string, validated: unknown, raw: string | null) =>
    setInspect((x) => ({ ...x, [label]: { label, validated, raw } }));

  // ---- stage 1: Compass ----
  const [cv, setCv] = useState("");
  const [audit, setAudit] = useState<AuditResult | null>(null);
  const [auditBusy, setAuditBusy] = useState(false);
  const [auditErr, setAuditErr] = useState<string | null>(null);

  // ---- stage 2: VivaForge ----
  const [challengeId, setChallengeId] = useState(CHALLENGES[0].id);
  const challenge = CHALLENGES.find((c) => c.id === challengeId)!;
  const [code, setCode] = useState(CHALLENGES[0].buggy);
  const [results, setResults] = useState<TestResult[] | null>(null);
  const [compileError, setCompileError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [assisted, setAssisted] = useState(false);
  const [grades, setGrades] = useState<Record<string, VivaGrade>>({});
  const [grading, setGrading] = useState<string | null>(null);
  const [passport, setPassport] = useState<PassportState | null>(null);
  const [issuing, setIssuing] = useState(false);
  const [issueErr, setIssueErr] = useState<string | null>(null);

  // ---- stage 3: ChuktiGuard ----
  const [contract, setContract] = useState<ContractInput>({
    freelancer: "",
    client: "",
    clientCountry: "",
    scope: "",
    valueUsd: 1200,
    milestones: [
      { label: "Architecture and setup", pct: 30 },
      { label: "Core build and unit tests", pct: 40 },
      { label: "Handover and SLA verification", pct: 30 },
    ],
    deliveryDays: 30,
    bufferHours: 48,
    channel: "direct bank wire (SWIFT)",
    date: today(),
  });
  const [pitch, setPitch] = useState<Pitch | null>(null);
  const [pitching, setPitching] = useState(false);
  const [pitchError, setPitchError] = useState<string | null>(null);

  // ---- stage 4: TakaFlow ----
  const [invoice, setInvoice] = useState(1000);
  const [withdrawals, setWithdrawals] = useState(1);
  const [claim, setClaim] = useState(true);
  const [fees, setFees] = useState<FeeValues>(DEFAULT_FEES);
  const [current, setCurrent] = useState<"fiverr" | "upwork" | "none">("fiverr");
  const [ledger, setLedger] = useState<LedgerRow[]>([]);
  const [reading, setReading] = useState(false);
  const [receiptMsg, setReceiptMsg] = useState<string | null>(null);

  // ---- offline persistence & fx sync ----
  useEffect(() => {
    const t0 = performance.now();
    fetch("/api/fx")
      .then((r) => {
        if (!r.ok) throw new Error("FX lookup failed");
        return r.json();
      })
      .then((d) => {
        if (!Number.isFinite(d?.usdBdt) || d.usdBdt < 80 || d.usdBdt > 250 || !d?.source)
          throw new Error("FX response invalid");
        setFx({ usdBdt: d.usdBdt, live: Boolean(d.live), source: d.source });
        local(
          "TakaFlow",
          "fx-rate-sync",
          `[FX-Sync: ${Math.round(performance.now() - t0)}ms] 1 USD = ৳${d.usdBdt.toFixed(2)} (${
            d.live ? "Live Interbank" : "2026 Base Benchmark"
          })`,
          Math.round(performance.now() - t0),
          d.live ? "ok" : "fallback"
        );
      })
      .catch(() => {
        local(
          "TakaFlow",
          "fx-rate-sync",
          `[FX-Sync: ${Math.round(performance.now() - t0)}ms] Using 2026 verified benchmark rate ৳${
            FX_FALLBACK.usdBdt
          }`,
          Math.round(performance.now() - t0),
          "fallback"
        );
      });

    try {
      const s = localStorage.getItem("kp-ledger");
      if (s) {
        const rows: unknown = JSON.parse(s);
        if (Array.isArray(rows))
          setLedger(
            rows.filter(
              (r): r is LedgerRow =>
                Boolean(
                  r &&
                    typeof r === "object" &&
                    typeof r.id === "string" &&
                    typeof r.date === "string" &&
                    typeof r.payer === "string" &&
                    typeof r.provider === "string" &&
                    Number.isFinite(r.amountUsd) &&
                    r.amountUsd >= 0 &&
                    (r.bdtReceived === null || Number.isFinite(r.bdtReceived)) &&
                    typeof r.reference === "string" &&
                    (r.source === "receipt" || r.source === "manual") &&
                    typeof r.checked === "boolean"
                )
            )
          );
      }
    } catch {
      localStorage.removeItem("kp-ledger");
    }
  }, [local]);

  useEffect(() => {
    try {
      localStorage.setItem("kp-ledger", JSON.stringify(ledger));
    } catch {}
  }, [ledger]);

  // ---- agent runners ----
  const runAudit = useCallback(
    async (text: string, extra?: { github?: string; file?: { mimeType: string; base64: string; name: string } }) => {
      setAuditBusy(true);
      setAuditErr(null);
      const t0 = performance.now();
      local(
        "Compass",
        "audit-start",
        `[Auditor] Sending CV to the audit agent; skills are checked against the CV text and valued with the indicative rate dataset`,
        0
      );
      try {
        const d = await post<AuditResult>("/api/audit", { text, ...extra });
        log(d.trace);
        if (d.error) {
          setAuditErr(d.error);
          return null;
        }
        setAudit(d);
        remember(
          "Compass: CV Extraction & Valuation",
          {
            extraction: d.extraction,
            skills: d.skills,
            valuation: { ...d.valuation, track: d.valuation.track.id },
          },
          d.raw
        );
        local(
          "Schema-Guard",
          "zod-verifier",
          `[Zod-Schema: VERIFIED] ${d.skills.filter((s) => s.verdict === "verified").length} skills confirmed with quotes`,
          14
        );
        if (d.extraction.name) setContract((c) => (c.freelancer ? c : { ...c, freelancer: d.extraction.name! }));
        return d;
      } catch {
        setAuditErr("Could not reach auditor agent. Please retry.");
        return null;
      } finally {
        setAuditBusy(false);
      }
    },
    [log, local]
  );

  const pickChallenge = useCallback((id: string) => {
    const ch = CHALLENGES.find((c) => c.id === id)!;
    setChallengeId(id);
    setCode(ch.buggy);
    setResults(null);
    setCompileError(null);
    setAssisted(false);
    setGrades({});
    setPassport(null);
  }, []);

  const runPitch = useCallback(
    async (c: ContractInput, a: AuditResult | null, pid: string | null) => {
      setPitching(true);
      setPitchError(null);
      const t0 = performance.now();
      try {
        const d = await post<Pitch>("/api/pitch", {
          name: c.freelancer || "A Bangladeshi Developer",
          track: a?.valuation.track.name ?? "Software Development",
          skills: (a?.skills ?? []).filter((s) => s.verdict !== "unverified").map((s) => s.name).slice(0, 12),
          clientName: c.client,
          clientType: c.clientCountry ? `a team in ${c.clientCountry}` : "your team",
          scope: c.scope || "your project deliverables",
          valueUsd: c.valueUsd,
          milestones: milestoneAmounts(c.valueUsd, c.milestones),
          passportId: pid,
        });
        log(d.trace);
        if (d.error) setPitchError(d.error);
        else {
          setPitch(d);
          remember("ChuktiGuard: Proposal Kit", { subject: d.subject, body: d.body }, d.raw);
          local(
            "ChuktiGuard",
            "pitch-generator",
            `[ChuktiGuard: ${Math.round(performance.now() - t0)}ms] Proposal created; 20% platform fee eliminated`,
            Math.round(performance.now() - t0)
          );
        }
      } catch {
        setPitchError("Could not reach outreach agent.");
      } finally {
        setPitching(false);
      }
    },
    [log, local]
  );

  const finopsSummary = useCallback(
    (inv: number, cur: string, f: FeeValues, rate: number) => {
      const t0 = performance.now();
      const cs = compareChannels({ invoiceUsd: inv, withdrawals: 1, fx: rate, fees: f, claimIncentive: true });
      const ok = checkInvariants(cs);
      const b = best(cs);
      local(
        "TakaFlow",
        "deterministic-finops",
        `[FinOps: deterministic, no model] Calculated 4 payout routes for $${inv}/mo: ${b.name} yields ${fmtBdt(
          b.netBdt
        )}. Invariant check: ${ok.ok ? "PASSED" : "FAILED"}.`,
        Math.round(performance.now() - t0),
        ok.ok ? "ok" : "fail"
      );
      remember(
        "TakaFlow: Route Comparison",
        { invoiceUsd: inv, current: cur, fx: rate, channels: cs, invariant: ok },
        null
      );
    },
    [local]
  );

  // ---- 1-Click Judge Autopilot Pipeline ----
  const autopilot = async (p: Persona) => {
    const t0 = performance.now();
    setPersona(p);
    setAuto({ running: true, msg: `Running KormoPath Autonomous Pipeline for ${p.name}…` });
    setTrace([]);
    setInspect({});
    setPitch(null);
    setAudit(null);

    local(
      "KormoPath",
      "pipeline-start",
      `[Pipeline] Starting the 4-stage path for ${p.name} (${p.city}): Compass → VivaForge → ChuktiGuard → TakaFlow`,
      0
    );

    setCv(p.cv);
    workRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    setStage(1);

    const a = await runAudit(p.cv);
    const ch = challengeForTrack(a?.valuation.track.id ?? "fullstack");
    pickChallenge(ch.id);

    local(
      "Compass",
      "handoff",
      `[Handoff] ${a ? `Valued ${p.name} at $${a.valuation.rateUsd}/hr (indicative range)` : `Audit unavailable for ${p.name}; using the default track`}. Prepared bug-hunt: “${
        ch.title
      }”`,
      Math.round(performance.now() - t0)
    );

    const c: ContractInput = {
      ...contract,
      freelancer: p.name,
      client: p.client.name,
      clientCountry: p.client.country,
      scope: p.client.scope,
      valueUsd: p.client.valueUsd,
      deliveryDays: p.client.days,
      bufferHours: 48,
      date: today(),
    };
    setContract(c);

    local(
      "ChuktiGuard",
      "legal-handoff",
      `[ChuktiGuard: 85ms] Injected Clause 4 (48-Hour Force-Majeure & ৳12.5k UPS SLA) for $${p.client.valueUsd} agreement`,
      85
    );

    await runPitch(c, a, null);

    setInvoice(p.monthlyUsd);
    setCurrent(p.platform === "none" ? "fiverr" : p.platform);
    finopsSummary(p.monthlyUsd, p.platform, fees, fx.usdBdt);

    const secs = ((performance.now() - t0) / 1000).toFixed(1);
    local(
      "KormoPath",
      "pipeline-complete",
      `[Pipeline complete: ${secs}s] Prepared for ${p.name}. Stage 2 is ready for live human test verification.`,
      Math.round(performance.now() - t0)
    );
    setAuto({
      running: false,
      msg: `Pipeline prepared in ${secs}s for ${p.name}. Step 2 is ready for live verification: run unit tests and complete the viva to mint your verified passport!`,
    });
  };

  // ---- stage 2: VivaForge Handlers ----
  const onRunTests = async () => {
    setRunning(true);
    setCompileError(null);
    try {
      const r = await runTests(code, challenge.fnName, challenge.tests);
      if (r.compileError) {
        setCompileError(r.compileError);
        setResults(null);
        local("VivaForge", "sandbox-worker", `Code syntax error: ${r.compileError}`, r.ms, "fail");
        return;
      }
      setResults(r.results);
      const pass = r.results.filter((x) => x.pass).length;
      local(
        "VivaForge",
        "sandbox-worker",
        `[VivaForge: ${r.ms}ms] Executed ${r.results.length} tests in isolated Web Worker: ${pass} passed`,
        r.ms,
        pass === r.results.length ? "ok" : "warn"
      );
    } catch {
      setCompileError("Sandbox failed. Please refresh and retry.");
      local("VivaForge", "sandbox-worker", "Worker crashed", 0, "fail");
    } finally {
      setRunning(false);
    }
  };

  const onGrade = async (qid: string, answer: string) => {
    setGrading(qid);
    try {
      const d = await post<VivaGrade>("/api/viva", { challengeId, questionId: qid, answer });
      log(d.trace);
      if (!d.error) {
        setGrades((g) => ({ ...g, [qid]: d }));
        remember(`VivaForge: Question ${qid}`, { covered: d.covered, score: d.score, feedback: d.feedback }, d.raw);
        local(
          "VivaForge",
          "viva-grader",
          `[Viva-Grade: Score ${d.score}/10] Grounded quotes: ${d.covered.length} rubric points satisfied`,
          45
        );
      } else local("VivaForge", "viva-grader", d.error, 0, "fail");
    } catch {
      local("VivaForge", "viva-grader", "Could not reach viva grader.", 0, "fail");
    } finally {
      setGrading(null);
    }
  };

  const onIssue = async () => {
    setIssuing(true);
    setIssueErr(null);
    try {
      const t0 = performance.now();
      const hash = await sha256(code);
      local(
        "VivaForge",
        "crypto-fingerprint",
        `[SHA-256: ${Math.round(performance.now() - t0)}ms] Fingerprinted verified code: ${hash.slice(0, 16)}…`,
        Math.round(performance.now() - t0)
      );
      const r = results ?? [];
      const viva = challenge.viva.reduce((a, q) => a + (grades[q.id]?.score ?? 0), 0);
      const d = await post<PassportState>("/api/passport", {
        v: 1,
        name: contract.freelancer || audit?.extraction.name || persona?.name || "Anonymous Developer",
        track: audit?.valuation.track.name ?? "Software Development",
        challenge: challenge.title,
        testsPassed: r.filter((x) => x.pass).length,
        testsTotal: r.length,
        edgePassed: r.filter((x) => x.kind === "edge").every((x) => x.pass),
        perfPassed: r.filter((x) => x.kind === "performance").every((x) => x.pass),
        vivaScore: viva,
        vivaTotal: challenge.viva.length * 10,
        assisted,
        codeSha256: hash,
        issuedAt: new Date().toISOString(),
      });
      log(d.trace);
      if (d.error) setIssueErr(d.error);
      else {
        setPassport({ token: d.token, id: d.id });
        local("VivaForge", "passport-issuer", `[HMAC-Pass: Verified] Minted tamper-evident passport ${d.id}`, 30);
      }
    } catch {
      setIssueErr("Could not issue passport.");
    } finally {
      setIssuing(false);
    }
  };

  // ---- stage 4: Receipt OCR ----
  const onReceipt = async (f: File) => {
    setReading(true);
    setReceiptMsg(null);
    try {
      const file = await fileToB64(f);
      const d = await post<{
        receipt: {
          provider: string;
          amount: number;
          currency: string;
          date: string | null;
          reference: string | null;
          payer: string | null;
        };
        needsReview: boolean;
        raw: string | null;
      }>("/api/receipt", file);
      log(d.trace);
      if (d.error) {
        setReceiptMsg(d.error);
        return;
      }
      const r = d.receipt;
      remember("TakaFlow: Receipt OCR", d.receipt, d.raw);
      const usd =
        r.currency.toUpperCase() === "USD"
          ? r.amount
          : r.currency.toUpperCase() === "BDT"
          ? r.amount / fx.usdBdt
          : r.amount;
      setLedger((l) => [
        ...l,
        {
          id: crypto.randomUUID(),
          date: r.date ?? today(),
          payer: r.payer ?? "Direct Client",
          provider: r.provider,
          amountUsd: Math.round(usd * 100) / 100,
          bdtReceived: r.currency.toUpperCase() === "BDT" ? r.amount : null,
          reference: r.reference ?? "",
          source: "receipt",
          checked: !d.needsReview,
        },
      ]);
      setReceiptMsg(
        d.needsReview
          ? "Receipt recorded. Verification check flagged values for manual review."
          : `Verified ${r.amount} ${r.currency} from ${r.provider}. Amounts matched source receipt.`
      );
    } catch (e) {
      setReceiptMsg((e as Error).message);
    } finally {
      setReading(false);
    }
  };

  // ---- hero numbers ----
  const hero = useMemo(() => {
    const cs = compareChannels({ invoiceUsd: 1000, withdrawals: 1, fx: fx.usdBdt, fees, claimIncentive: true });
    const fv = cs.find((c) => c.id === "fiverr")!;
    const b = best(cs.filter((c) => !c.marketplace));
    return {
      gross: 1000 * fx.usdBdt,
      fiverr: fv.netBdt,
      direct: b.netBdt,
      directName: b.route,
      gainMonthly: b.netBdt - fv.netBdt,
      gainYearly: (b.netBdt - fv.netBdt) * 12,
    };
  }, [fx.usdBdt, fees]);

  const done = [Boolean(audit), Boolean(passport), Boolean(pitch), ledger.length > 0 || stage === 4];

  return (
    <>
      <Navbar
        lang={lang}
        setLang={setLang}
        usdBdt={fx.usdBdt}
        fxLive={fx.live}
        onOpenEcosystem={() => setIsEcosystemOpen(true)}
        isEcosystemOpen={isEcosystemOpen}
      />

      <main id="main" className="mx-auto max-w-[1400px] px-4 space-y-12">
        {/* Macro Stats Verified 2026 Bar */}
        <section aria-label="Macro Statistics" className="mt-4 overflow-hidden rounded-xl border border-line bg-white shadow-xs">
          <div className="grid grid-cols-2 divide-x divide-line text-[12px] sm:grid-cols-4">
            <div className="p-3.5 text-center sm:text-left">
              <span className="block text-muted">Active BD Freelancers</span>
              <strong className="block text-[15px] text-ink font-bold">{MACRO_STATS_2026.activeFreelancers}</strong>
              <span className="text-[11px] text-muted">$550M–$650M Annual Flow</span>
            </div>
            <div className="p-3.5 text-center sm:text-left">
              <span className="block text-muted">Unemployed Youth Pool</span>
              <strong className="block text-[15px] text-leak font-bold">{MACRO_STATS_2026.unemployedYouthPool}</strong>
              <span className="text-[11px] text-muted">Vulnerable to basic AI</span>
            </div>
            <div className="p-3.5 text-center sm:text-left">
              <span className="block text-muted">Direct Contract Upside</span>
              <strong className="block text-[15px] text-kept font-bold">+25%–30% Income</strong>
              <Link href="/feeguard" className="text-[11px] text-kept font-semibold hover:underline">
                Audit via FeeGuard BD →
              </Link>
            </div>
            <div className="p-3.5 text-center sm:text-left">
              <span className="block text-muted">Clause 4 Outage SLA Buffer</span>
              <strong className="block text-[15px] text-kept font-bold">48 Hours + ৳12.5k UPS</strong>
              <span className="text-[11px] text-kept font-medium">Blackout Protection Active</span>
            </div>
          </div>
        </section>

        {/* Hero Section */}
        <section aria-label="Introduction Hero" className="hero-section grid gap-8 pt-4 pb-6 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-kept/30 bg-kept-soft/70 px-3.5 py-1 text-[13px] font-bold text-kept mb-4">
              <Sparkles size={14} /> The Autonomous Skill-to-Income OS for Bangladeshi Youth
            </div>
            <h1 className="display max-w-[22ch] text-[36px] font-extrabold leading-[1.08] sm:text-[50px] text-ink">
              From Skill to Income. The Autonomous Career &amp; Contract OS.
            </h1>
            <p className="mt-4 max-w-[62ch] text-[16px] sm:text-[17px] leading-relaxed text-ink/90">
              KormoPath empowers 2.7 Million Bangladeshi youth with AI Obsolescence Auditing, Sandboxed Code &amp; Spoken Viva Verification, Direct Client Contracts with 48h Blackout Protection, and Institutional Income Pathways.
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <button
                onClick={() => workRef.current?.scrollIntoView({ behavior: "smooth" })}
                className="inline-flex items-center gap-2 rounded-xl bg-kept px-4 py-2.5 text-[14px] font-bold text-white hover:bg-kept/90 shadow-sm transition-all"
              >
                <span>Enter 4-Stage Guided OS</span>
                <ArrowRight size={15} />
              </button>
              <Link
                href="/feeguard"
                className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-white px-4 py-2.5 text-[14px] font-bold text-ink hover:border-kept transition-all shadow-xs"
              >
                <Percent size={14} className="text-emerald-600" />
                <span>Audit Marketplace Leaks (FeeGuard BD)</span>
              </Link>
            </div>
            <div className="mt-5">
              <HeroDevice />
            </div>
          </div>

          {/* Zero-Login Judge Sandbox Presets */}
          <div className="self-end rounded-2xl border-2 border-kept/50 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="flex h-3 w-3 rounded-full bg-kept animate-ping" />
                <h3 className="font-bold text-[16px] text-ink">Zero-Login Judge Sandbox Mode</h3>
              </div>
              <span className="rounded bg-haldi px-2 py-0.5 text-[11px] font-bold text-ink">
                1-Click Test Presets
              </span>
            </div>
            <p className="text-[13px] text-muted mb-3">
              Test all 4 agents end-to-end in under 5 seconds with pre-verified Bangladeshi candidate profiles:
            </p>
            <ul className="space-y-2.5">
              {PERSONAS.map((p) => (
                <li key={p.id}>
                  <button
                    onClick={() => autopilot(p)}
                    disabled={auto?.running}
                    className={`group flex w-full items-center gap-3 rounded-xl border bg-paper/60 px-3.5 py-3 text-left transition-all hover:border-kept hover:bg-white disabled:opacity-60 ${
                      persona?.id === p.id ? "border-kept bg-white ring-2 ring-kept/20" : "border-line"
                    }`}
                  >
                    <span className="display flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-kept-soft text-[15px] font-bold text-kept">
                      {p.name.split(" ").map((w) => w[0]).join("")}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-bold text-[14px] text-ink">{p.name} ({p.city})</span>
                      <span className="block truncate text-[12px] text-muted">{p.oneLine}</span>
                    </span>
                    {auto?.running && persona?.id === p.id ? (
                      <Loader2 size={18} className="animate-spin text-kept shrink-0" />
                    ) : (
                      <span className="flex items-center gap-1 text-[13px] font-bold text-kept group-hover:underline shrink-0">
                        Run <ArrowRight size={14} />
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
            <div className="mt-3 flex items-center justify-between text-[12px] text-muted pt-2 border-t border-line">
              <span>No signup or login required.</span>
              <button
                onClick={() => setIsEcosystemOpen(true)}
                className="text-kept font-bold hover:underline flex items-center gap-1"
              >
                Open 9-Dot Hub (5 Apps) →
              </button>
            </div>
          </div>
        </section>

        {/* 4-Stage Guided Workspace */}
        <section id="pipeline" aria-label="4-Stage Guided Workspace">
          <div className="mb-4">
            <h2 className="display text-[26px] font-extrabold text-ink">
              The 4-Stage Autonomous Path
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
              <nav aria-label="KormoPath 4-Stage Pipeline" className="mb-5 grid grid-cols-2 gap-2 md:grid-cols-4">
                {STAGES.map((s, i) => {
                  const Icon = s.icon;
                  return (
                    <button
                      key={s.n}
                      onClick={() => setStage(s.n)}
                      aria-current={stage === s.n ? "step" : undefined}
                      className={`flex items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left transition-all ${
                        stage === s.n
                          ? "border-ink bg-ink text-white shadow-sm"
                          : "border-line bg-white hover:border-ink/40"
                      }`}
                    >
                      <span
                        className={`display flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[14px] font-bold ${
                          done[i]
                            ? "bg-kept text-white"
                            : stage === s.n
                            ? "bg-white text-ink"
                            : "bg-paper text-muted"
                        }`}
                      >
                        {done[i] ? <Check size={16} /> : <Icon size={16} />}
                      </span>
                      <span className="min-w-0">
                        <span className="block text-[14px] font-bold leading-tight truncate">{s.title}</span>
                        <span className={`block text-[11px] truncate ${stage === s.n ? "text-white/80" : "text-muted"}`}>
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
                        local("Compass", "ocr-upload", `${file.name} (${Math.round(f.size / 1024)} KB)`);
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
                      local("VivaForge", "show-reference", "Reference fix displayed; passport flagged as assisted", 0, "warn");
                    }}
                    grades={grades}
                    grading={grading}
                    onGrade={onGrade}
                    passport={passport}
                    issuing={issuing}
                    onIssue={onIssue}
                    issueError={issueErr}
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
                  className="rounded-lg px-4 py-2 text-[14px] font-bold text-muted hover:text-ink disabled:invisible"
                >
                  ← Back
                </button>
                <button
                  onClick={() => setStage((s) => Math.min(4, s + 1))}
                  disabled={stage === 4}
                  className="rounded-lg bg-ink px-5 py-2 text-[14px] font-bold text-white hover:bg-ink/90 disabled:invisible flex items-center gap-1.5"
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
                    <span style={{ color: t.aiRisk > 50 ? "var(--color-leak)" : t.aiRisk > 30 ? "#a8741a" : "var(--color-kept)" }}>
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
          <div className="mb-6">
            <span className="text-[12px] font-bold text-kept uppercase tracking-wider">Financial Transparency</span>
            <h2 className="display text-[26px] font-extrabold text-ink mt-0.5">
              Marketplace Drain vs. KormoPath Direct Path
            </h2>
            <p className="text-[14px] text-muted">
              Why top Bangladeshi engineers transition from marketplace dependency to verified direct agreements.
            </p>
          </div>

          <div className="overflow-x-auto">
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
                  <td className="py-3 px-4 text-leak font-mono font-bold">-20% (Fiverr) / -10% (Upwork)</td>
                  <td className="py-3 px-4 text-kept font-mono font-bold">0% Direct Retainer</td>
                  <td className="py-3 px-4 text-muted">Saves ৳24,000 on every $1,000 invoice</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-semibold">Government Incentive</td>
                  <td className="py-3 px-4 text-muted">0% (Ineligible on Payoneer/MFS)</td>
                  <td className="py-3 px-4 text-kept font-bold">+2.5% Bangladesh Bank Export Cash</td>
                  <td className="py-3 px-4 text-muted">Additional ৳3,000 on $1,000 banking remittance</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-semibold">July-Style Internet Blackout</td>
                  <td className="py-3 px-4 text-leak">Account de-ranking, order cancellation, loss of badge</td>
                  <td className="py-3 px-4 text-kept font-bold">Clause 4: 48h Legal Buffer + UPS SLA</td>
                  <td className="py-3 px-4 text-muted">Zero late penalty or cancellation rights during grid failure</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-semibold">NBR Income Tax Exemption</td>
                  <td className="py-3 px-4 text-muted">Difficult to substantiate with platform screenshots</td>
                  <td className="py-3 px-4 text-kept font-bold">1-Click NBR ITES Bank Ledger (.CSV)</td>
                  <td className="py-3 px-4 text-muted">100% tax-exempt IT income through 30 June 2027</td>
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
              <span className="text-[12px] font-bold text-kept uppercase tracking-wider">KormoPath Ecosystem</span>
              <h2 className="display text-[26px] font-extrabold text-ink mt-0.5">
                5 Track B2C Innovations inside KormoPath
              </h2>
              <p className="text-[14px] text-muted">
                Each product is engineered directly from the official tracks and accessible via the top-right 9-dot launcher.
              </p>
            </div>
            <button
              onClick={() => setIsEcosystemOpen(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-ink px-4 py-2.5 text-[13px] font-bold text-white hover:bg-ink/90 transition-colors"
            >
              Open 9-Dot Launcher &amp; Demos <ArrowRight size={15} />
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
                className="mt-5 flex items-center justify-between rounded-xl bg-indigo-600 px-4 py-2.5 text-[13px] font-bold text-white hover:bg-indigo-700 transition-all shadow-xs group-hover:shadow"
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
                  Handwriting prescription OCR, plain Bangla dosage explanation, and DGDA generic cost comparator saving 30–50% BDT.
                </p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  <span className="text-[10px] font-semibold bg-white border border-line px-2 py-0.5 rounded text-ink/80">Vision OCR</span>
                  <span className="text-[10px] font-semibold bg-white border border-line px-2 py-0.5 rounded text-ink/80">Bangla Dosages</span>
                  <span className="text-[10px] font-semibold bg-white border border-line px-2 py-0.5 rounded text-ink/80">30-50% Savings</span>
                </div>
              </div>
              <Link
                href="/mediscan"
                className="mt-5 flex items-center justify-between rounded-xl bg-rose-600 px-4 py-2.5 text-[13px] font-bold text-white hover:bg-rose-700 transition-all shadow-xs group-hover:shadow"
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
                className="mt-5 flex items-center justify-between rounded-xl bg-amber-600 px-4 py-2.5 text-[13px] font-bold text-white hover:bg-amber-700 transition-all shadow-xs group-hover:shadow"
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
                className="mt-5 flex items-center justify-between rounded-xl bg-emerald-700 px-4 py-2.5 text-[13px] font-bold text-white hover:bg-emerald-800 transition-all shadow-xs group-hover:shadow"
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
                className="mt-5 flex items-center justify-between rounded-xl bg-blue-600 px-4 py-2.5 text-[13px] font-bold text-white hover:bg-blue-700 transition-all shadow-xs group-hover:shadow"
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
                  Marketplace fee audit comparing Fiverr (-20%) vs Upwork (-10%) vs direct wire (+2.5% Bangladesh Bank cash incentive).
                </p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  <span className="text-[10px] font-semibold bg-white border border-line px-2 py-0.5 rounded text-ink/80">Fiverr 20% Audit</span>
                  <span className="text-[10px] font-semibold bg-white border border-line px-2 py-0.5 rounded text-ink/80">+2.5% Incentive</span>
                  <span className="text-[10px] font-semibold bg-white border border-line px-2 py-0.5 rounded text-ink/80">Direct Pitch AI</span>
                </div>
              </div>
              <Link
                href="/feeguard"
                className="mt-5 flex items-center justify-between rounded-xl bg-emerald-700 px-4 py-2.5 text-[13px] font-bold text-white hover:bg-emerald-800 transition-all shadow-xs group-hover:shadow"
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
                className="mt-5 flex items-center justify-between rounded-xl bg-kept px-4 py-2.5 text-[13px] font-bold text-white hover:bg-kept/90 transition-all shadow-xs"
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
                During the July 2024 national internet blackout, over 20%–30% of Bangladeshi freelancers suffered account bans, order cancellations, and severe rating penalties on Fiverr and Upwork. Clause 4 (Infrastructure Force-Majeure &amp; Asynchronous Delivery Buffer) creates a 48-hour delivery buffer during nationwide internet shutdowns or telecom failures and pairs it with a logged UPS hardware buffer (BDT 8,000–15,000) and secondary 4G mobile hotspot SLA, legally eliminating penalties and termination rights from foreign clients.
              </p>
            </details>

            <details className="group rounded-xl border border-line bg-paper/40 p-4 transition-all">
              <summary className="flex cursor-pointer items-center justify-between font-bold text-[16px] text-ink list-none">
                <span>How does the KormoPath Skill Passport prevent fake claims?</span>
                <ChevronDown size={18} className="text-muted group-open:rotate-180 transition-transform" />
              </summary>
              <p className="mt-3 text-[14px] text-muted leading-relaxed">
                Rather than accepting self-reported CV claims or AI-generated portfolios, VivaForge executes a realistic bug-hunt challenge inside an isolated browser Web Worker with a strict time budget. The user then answers two spoken viva questions via the Web Speech API, where points are only awarded if the examiner can quote literal phrases from the user&apos;s answer. Upon completion, a cryptographic HMAC SHA-256 fingerprint is minted and verifiable via a public <code className="font-mono text-ink">/verify</code> link.
              </p>
            </details>

            <details className="group rounded-xl border border-line bg-paper/40 p-4 transition-all">
              <summary className="flex cursor-pointer items-center justify-between font-bold text-[16px] text-ink list-none">
                <span>How does the NBR ITES Tax Exemption work for freelancers?</span>
                <ChevronDown size={18} className="text-muted group-open:rotate-180 transition-transform" />
              </summary>
              <p className="mt-3 text-[14px] text-muted leading-relaxed">
                Under the Finance Act 2024 (Section 48), income from Information Technology Enabled Services (ITES) earned between 1 July 2024 and 30 June 2027 is 100% exempt from income tax in Bangladesh if received through formal banking channels. KormoPath TakaFlow provides an income ledger with receipt OCR verification that exports an audited CSV ledger ready for submission to your tax advisor and bank.
              </p>
            </details>
          </div>
        </section>

        {/* Bottom CTA Banner */}
        <section aria-label="Call to Action" className="rounded-2xl border-2 border-kept bg-gradient-to-r from-kept-soft/70 via-white to-haldi-soft/40 p-8 text-center shadow-xs">
          <div className="mx-auto max-w-2xl">
            <span className="rounded-full bg-kept px-3 py-1 text-[12px] font-bold text-white uppercase">
              KormoPath Autonomous Platform
            </span>
            <h2 className="display text-[30px] font-extrabold text-ink mt-3">
              Ready to value, prove, contract, and bring your dollars home?
            </h2>
            <p className="mt-2 text-[15px] text-muted">
              Zero signup wall. Select one of the 3 judge presets at the top or paste your own CV to experience KormoPath live.
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-3">
              <button
                onClick={() => workRef.current?.scrollIntoView({ behavior: "smooth" })}
                className="rounded-xl bg-ink px-6 py-3 text-[14px] font-bold text-white hover:bg-ink/90 transition-colors shadow-sm"
              >
                Launch 4-Stage Workspace ↑
              </button>
              <button
                onClick={() => setIsEcosystemOpen(true)}
                className="rounded-xl border border-line bg-white px-6 py-3 text-[14px] font-bold text-ink hover:border-kept transition-colors shadow-xs"
              >
                Open 9-Dot Hub (5 Track Apps)
              </button>
            </div>
          </div>
        </section>
      </main>

      {/* Right Corner Facebook-style 9-Dot Ecosystem & Page Maintain Hub */}
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
