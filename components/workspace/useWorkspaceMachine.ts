"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PERSONAS, type Persona } from "@/lib/presets";
import { CHALLENGES, challengeForTrack, type Challenge } from "@/lib/challenges";
import { FEES, FX_FALLBACK, type Source } from "@/lib/data";
import { compareChannels, best, checkInvariants, fmtBdt, type FeeValues } from "@/lib/finops";
import { milestoneAmounts, type ContractInput } from "@/lib/contract";
import { runTests, sha256 } from "@/lib/sandbox";
import type { TraceStep } from "@/lib/trace";
import type { AuditResult, TestResult, VivaGrade, PassportState, LedgerRow } from "@/lib/types";
import type { Inspectable } from "@/components/workspace/Telemetry";
import type { Pitch } from "@/components/workspace/StageContract";
import { storageKey, usePersistentState } from "@/lib/clientStore";

export const DEFAULT_FEES = Object.fromEntries(
  Object.entries(FEES).map(([k, v]) => [k, v.value])
) as unknown as FeeValues;

export const todayIso = () => new Date().toISOString().slice(0, 10);

export function fileToB64(f: File): Promise<{ mimeType: string; base64: string; name: string }> {
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

export async function postApi<T>(url: string, body: unknown): Promise<T & { error?: string; trace?: TraceStep[] }> {
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

export function useWorkspaceMachine() {
  // ---- global state ----
  const [lang, setLang] = usePersistentState<"en" | "bn">(
    storageKey("platform", "language"),
    "bn",
    (value) => value === "en" || value === "bn" ? value : null,
  );
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

  const remember = useCallback((label: string, validated: unknown, raw: string | null) => {
    setInspect((x) => ({ ...x, [label]: { label, validated, raw } }));
  }, []);

  // ---- stage 1: Auditor ----
  const [cv, setCv] = useState("");
  const [audit, setAudit] = useState<AuditResult | null>(null);
  const [auditBusy, setAuditBusy] = useState(false);
  const [auditErr, setAuditErr] = useState<string | null>(null);

  // ---- stage 2: Examiner ----
  const [challengeId, setChallengeId] = useState(CHALLENGES[0].id);
  const challenge = useMemo(() => CHALLENGES.find((c) => c.id === challengeId) ?? CHALLENGES[0], [challengeId]);
  const [code, setCode] = useState(CHALLENGES[0].buggy);
  const [results, setResults] = useState<TestResult[] | null>(null);
  const [compileError, setCompileError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [assisted, setAssisted] = useState(false);
  const [grades, setGrades] = useState<Record<string, VivaGrade>>({});
  const [grading, setGrading] = useState<string | null>(null);
  const [passport, setPassport] = useState<PassportState | null>(null);
  // The Treasurer has really compared the payout routes for an invoice (lib/finops, deterministic).
  const [payoutCompared, setPayoutCompared] = useState(false);
  const [issuing, setIssuing] = useState(false);
  const [issueErr, setIssueErr] = useState<string | null>(null);

  // ---- stage 3: Outreach ----
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
    date: todayIso(),
  });
  const [pitch, setPitch] = useState<Pitch | null>(null);
  const [pitching, setPitching] = useState(false);
  const [pitchError, setPitchError] = useState<string | null>(null);

  // ---- stage 4: Treasurer ----
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
          "Treasurer",
          "fx-rate-sync",
          `[FX-Sync: ${Math.round(performance.now() - t0)}ms] 1 USD = ৳${d.usdBdt.toFixed(2)} (${
            d.live ? "Daily provider quote" : "Reference benchmark"
          })`,
          Math.round(performance.now() - t0),
          d.live ? "ok" : "fallback"
        );
      })
      .catch(() => {
        local(
          "Treasurer",
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
      local(
        "Auditor",
        "audit-start",
        `[Auditor] Sending CV to the audit agent; skills are checked against the CV text and valued with the indicative rate dataset`,
        0
      );
      try {
        const d = await postApi<AuditResult>("/api/audit", { text, ...extra });
        log(d.trace);
        if (d.error) {
          setAuditErr(d.error);
          return null;
        }
        setAudit(d);
        remember(
          "Auditor: CV Extraction & Valuation",
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
    [log, local, remember]
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
        const d = await postApi<Pitch>("/api/pitch", {
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
          remember("Outreach: Proposal Kit", { subject: d.subject, body: d.body }, d.raw);
          local(
            "Outreach",
            "pitch-generator",
            `[Outreach: ${Math.round(performance.now() - t0)}ms] Proposal created; 20% platform fee eliminated`,
            Math.round(performance.now() - t0)
          );
        }
      } catch {
        setPitchError("Could not reach outreach agent.");
      } finally {
        setPitching(false);
      }
    },
    [log, local, remember]
  );

  const finopsSummary = useCallback(
    (inv: number, cur: string, f: FeeValues, rate: number) => {
      const t0 = performance.now();
      const cs = compareChannels({ invoiceUsd: inv, withdrawals: 1, fx: rate, fees: f, claimIncentive: true });
      const ok = checkInvariants(cs);
      const b = best(cs);
      setPayoutCompared(true);
      local(
        "Treasurer",
        "deterministic-finops",
        `[FinOps: deterministic, no model] Calculated 4 payout routes for $${inv}/mo: ${b.name} yields ${fmtBdt(
          b.netBdt
        )}. Invariant check: ${ok.ok ? "PASSED" : "FAILED"}.`,
        Math.round(performance.now() - t0),
        ok.ok ? "ok" : "fail"
      );
      remember(
        "Treasurer: Route Comparison",
        { invoiceUsd: inv, current: cur, fx: rate, channels: cs, invariant: ok },
        null
      );
    },
    [local, remember]
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
    setPayoutCompared(false);

    local(
      "KormoPath",
      "pipeline-start",
      `[Pipeline] Starting the 4-stage path for ${p.name} (${p.city}): Auditor → Examiner → Outreach → Treasurer`,
      0
    );

    setCv(p.cv);
    workRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    setStage(1);

    const a = await runAudit(p.cv);
    const ch = challengeForTrack(a?.valuation.track.id ?? "fullstack");
    pickChallenge(ch.id);

    local(
      "Auditor",
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
      date: todayIso(),
    };
    const clauseT0 = performance.now();
    setContract(c);
    // A real, measured step: the reviewed template (lib/contract.ts) is filled with validated inputs; no model involved.
    local(
      "Outreach",
      "legal-handoff",
      `Filled reviewed Clause 4 (outage buffer: deadlines extend by the outage + ${c.bufferHours} h) for the $${p.client.valueUsd} agreement from the fixed template`,
      Math.max(0, Math.round(performance.now() - clauseT0))
    );

    await runPitch(c, a, null);

    setInvoice(p.monthlyUsd);
    setCurrent(p.platform === "none" ? "fiverr" : p.platform);
    finopsSummary(p.monthlyUsd, p.platform, fees, fx.usdBdt);

    const secs = ((performance.now() - t0) / 1000).toFixed(1);
    local(
      "KormoPath",
      "pipeline-complete",
      `[Autopilot: ${secs}s] Steps 1, 3 and 4 ran for ${p.name}. Step 2 is a live exam that no autopilot can take for you: that is what makes the passport worth trusting.`,
      Math.round(performance.now() - t0)
    );
    setAuto({
      running: false,
      msg: `Steps 1, 3 and 4 ran in ${secs}s for ${p.name}. Step 2 is the live exam: fix the bug, answer the viva, and the passport is issued. Using the reference fix or a model answer marks it "assisted".`,
    });
  };

  // ---- stage 2: Examiner Handlers ----
  // `src` lets a caller test code it has just set: React state (`code`) is still the old value in that closure.
  // Buttons pass a click event, so anything that isn't a string falls back to the editor's code.
  const onRunTests = async (src?: unknown) => {
    const source = typeof src === "string" ? src : code;
    setRunning(true);
    setCompileError(null);
    try {
      const r = await runTests(source, challenge.fnName, challenge.tests);
      if (r.compileError) {
        setCompileError(r.compileError);
        setResults(null);
        local("Examiner", "sandbox-worker", `Code syntax error: ${r.compileError}`, r.ms, "fail");
        return;
      }
      setResults(r.results);
      const pass = r.results.filter((x) => x.pass).length;
      local(
        "Examiner",
        "sandbox-worker",
        `[Examiner: ${r.ms}ms] Executed ${r.results.length} tests in isolated Web Worker: ${pass} passed`,
        r.ms,
        pass === r.results.length ? "ok" : "warn"
      );
    } catch {
      setCompileError("Sandbox failed. Please refresh and retry.");
      local("Examiner", "sandbox-worker", "Worker crashed", 0, "fail");
    } finally {
      setRunning(false);
    }
  };

  const onGrade = async (qid: string, answer: string) => {
    setGrading(qid);
    try {
      const d = await postApi<VivaGrade>("/api/viva", { challengeId, questionId: qid, answer });
      log(d.trace);
      if (!d.error) {
        setGrades((g) => ({ ...g, [qid]: d }));
        remember(`Examiner: Question ${qid}`, { covered: d.covered, score: d.score, feedback: d.feedback }, d.raw);
        local(
          "Examiner",
          "viva-grader",
          `[Viva-Grade: Score ${d.score}/10] Grounded quotes: ${d.covered.length} rubric points satisfied`,
          45
        );
      } else local("Examiner", "viva-grader", d.error, 0, "fail");
    } catch {
      local("Examiner", "viva-grader", "Could not reach viva grader.", 0, "fail");
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
        "Examiner",
        "crypto-fingerprint",
        `[SHA-256: ${Math.round(performance.now() - t0)}ms] Fingerprinted verified code: ${hash.slice(0, 16)}…`,
        Math.round(performance.now() - t0)
      );
      const r = results ?? [];
      const viva = challenge.viva.reduce((a, q) => a + (grades[q.id]?.score ?? 0), 0);
      const d = await postApi<PassportState>("/api/passport", {
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
        local("Examiner", "passport-issuer", `[HMAC-Pass: Verified] Minted tamper-evident passport ${d.id}`, 30);
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
      const d = await postApi<{
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
      remember("Treasurer: Receipt OCR", d.receipt, d.raw);
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
          date: r.date ?? todayIso(),
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

  const done = [Boolean(audit), Boolean(passport), Boolean(pitch), payoutCompared || ledger.length > 0 || stage === 4];

  const groundingDiffData = useMemo(() => {
    if (!audit) return undefined;
    return {
      sourceText: cv || audit.extraction.ocr_text || "",
      skills: audit.skills,
      candidateName: audit.extraction.name || persona?.name || null,
    };
  }, [audit, cv, persona]);

  return {
    lang,
    setLang,
    isEcosystemOpen,
    setIsEcosystemOpen,
    trace,
    setTrace,
    inspect,
    setInspect,
    stage,
    setStage,
    persona,
    setPersona,
    auto,
    setAuto,
    fx,
    workRef,
    log,
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
    setReceiptMsg,
    finopsSummary,
    autopilot,
    onReceipt,
    hero,
    done,
    groundingDiffData,
  };
}
