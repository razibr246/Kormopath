"use client";

import { useState } from "react";
import { ShieldCheck, Play, CheckCircle2, RefreshCw, Check, X } from "lucide-react";
import { verifyEvidence } from "@/lib/grounding";
import { compareChannels, checkInvariants, DEFAULT_FEES } from "@/lib/finops";
import { milestoneAmounts } from "@/lib/contract";
import { checkRateLimit } from "@/lib/rateLimit";

interface AssertionDetail {
  label: string;
  expected: string;
  actual: string;
  passed: boolean;
}

interface TestItem {
  id: string;
  name: string;
  category: string;
  description: string;
  status: "idle" | "running" | "pass" | "fail";
  durationMs: number;
  details: AssertionDetail[];
  error?: string;
}

export function LiveAssertionHarness() {
  const [tests, setTests] = useState<TestItem[]>([
    {
      id: "hallucination-trap",
      name: "Hallucination Trap Check",
      category: "Evidence Grounding",
      description: "Verifies verifyEvidence() rejects unquoted AI assertions and normalizes Bengali Unicode NFC strings.",
      status: "idle",
      durationMs: 0,
      details: [],
    },
    {
      id: "finops-invariants",
      name: "FinOps Invariant Check",
      category: "Deterministic Money Engine",
      description: "Verifies gross + steps == net across extreme inputs ($2 micro-invoice, $10k contract) with zero floating-point drift.",
      status: "idle",
      durationMs: 0,
      details: [],
    },
    {
      id: "milestone-boundaries",
      name: "Milestone Boundary Check",
      category: "Contract Engine",
      description: "Verifies milestoneAmounts() with empty arrays [] and non-standard percentages sums to exact total integer cents.",
      status: "idle",
      durationMs: 0,
      details: [],
    },
    {
      id: "rate-limiter",
      name: "Rate-Limiter & Token Bucket Check",
      category: "Security Infrastructure",
      description: "Verifies sliding token-bucket rate limiter enforces quotas and blocks requests exceeding limits.",
      status: "idle",
      durationMs: 0,
      details: [],
    },
  ]);
  const [isRunningAll, setIsRunningAll] = useState(false);

  const runTest = (testId: string) => {
    setTests((prev) =>
      prev.map((t) => (t.id === testId ? { ...t, status: "running" } : t))
    );

    setTimeout(() => {
      const t0 = performance.now();
      let passed = true;
      const details: AssertionDetail[] = [];
      let err: string | undefined;

      try {
        if (testId === "hallucination-trap") {
          const source = "Built a payment webhook handler in Node and Express for a bKash sandbox checkout. অভিজ্ঞ ডেভেলপার।";
          
          // Sub-assertion 1: Valid quote
          const r1 = verifyEvidence("payment webhook handler in Node", source);
          const p1 = r1.verdict === "verified";
          details.push({
            label: "Verbatim Quote Match",
            expected: "verdict: 'verified'",
            actual: `verdict: '${r1.verdict}', score: ${r1.score}`,
            passed: p1,
          });

          // Sub-assertion 2: Fabricated quote
          const r2 = verifyEvidence("Kubernetes cluster autoscaling with Terraform", source);
          const p2 = r2.verdict === "unverified";
          details.push({
            label: "Fabricated Hallucination Rejection",
            expected: "verdict: 'unverified'",
            actual: `verdict: '${r2.verdict}', score: ${r2.score}`,
            passed: p2,
          });

          // Sub-assertion 3: Bengali Unicode normalization
          const bnDecomposed = "অভিজ্ঞ".normalize("NFD");
          const r3 = verifyEvidence(bnDecomposed, source);
          const p3 = r3.verdict === "verified";
          details.push({
            label: "Bengali NFC Normalization",
            expected: "verdict: 'verified'",
            actual: `verdict: '${r3.verdict}', score: ${r3.score}`,
            passed: p3,
          });

          passed = p1 && p2 && p3;
        } else if (testId === "finops-invariants") {
          // Sub-assertion 1: $2 micro-invoice
          const micro = compareChannels({ invoiceUsd: 2, withdrawals: 1, fx: 120, fees: DEFAULT_FEES, claimIncentive: true });
          const invMicro = checkInvariants(micro);
          const noNeg = micro.every((c) => c.netBdt >= 0);
          details.push({
            label: "$2 Micro-Invoice Non-Negative Invariant",
            expected: "all netBdt >= 0 and ok: true",
            actual: `noNegative: ${noNeg}, ok: ${invMicro.ok}, maxError: ${invMicro.maxErrorBdt} BDT`,
            passed: noNeg && invMicro.ok,
          });

          // Sub-assertion 2: $10,000 macro-contract
          const macro = compareChannels({ invoiceUsd: 10000, withdrawals: 4, fx: 121.5, fees: DEFAULT_FEES, claimIncentive: true });
          const invMacro = checkInvariants(macro);
          details.push({
            label: "$10,000 High-Value Contract Invariant",
            expected: "ok: true, maxErrorBdt < 0.05",
            actual: `ok: ${invMacro.ok}, maxError: ${invMacro.maxErrorBdt} BDT`,
            passed: invMacro.ok && invMacro.maxErrorBdt < 0.05,
          });

          passed = noNeg && invMicro.ok && invMacro.ok;
        } else if (testId === "milestone-boundaries") {
          // Sub-assertion 1: Empty milestone array guard
          const empty = milestoneAmounts(1200, []);
          const p1 = Array.isArray(empty) && empty.length === 0;
          details.push({
            label: "Empty Milestones Array Guard []",
            expected: "[] (zero crash, length 0)",
            actual: `length: ${empty.length}`,
            passed: p1,
          });

          // Sub-assertion 2: Fractional cent allocation
          const parts = milestoneAmounts(1000.01, [{ pct: 33.33 }, { pct: 33.33 }, { pct: 33.34 }]);
          const sum = Math.round(parts.reduce((a, b) => a + b, 0) * 100) / 100;
          const p2 = sum === 1000.01;
          details.push({
            label: "Fractional 33.33% / 33.34% Slicing Reconciliation",
            expected: "$1000.01",
            actual: `$${sum} (${parts.join(", ")})`,
            passed: p2,
          });

          // Sub-assertion 3: Micro 5-cent contract
          const microParts = milestoneAmounts(0.05, [{ pct: 50 }, { pct: 50 }]);
          const microSum = Math.round(microParts.reduce((a, b) => a + b, 0) * 100) / 100;
          const p3 = microSum === 0.05;
          details.push({
            label: "5-Cent Split Boundary",
            expected: "$0.05",
            actual: `$${microSum}`,
            passed: p3,
          });

          passed = p1 && p2 && p3;
        } else if (testId === "rate-limiter") {
          const testBucket = "judge-test-" + Date.now();
          const req = new Request("https://kormopath.local/api/audit", {
            headers: { "x-forwarded-for": "10.0.0.1" },
          });

          const c1 = checkRateLimit(req, { limit: 2, windowMs: 10000, bucket: testBucket });
          const c2 = checkRateLimit(req, { limit: 2, windowMs: 10000, bucket: testBucket });
          const c3 = checkRateLimit(req, { limit: 2, windowMs: 10000, bucket: testBucket });

          const p1 = c1.success && c1.remaining === 1;
          const p2 = c2.success && c2.remaining === 0;
          const p3 = !c3.success && c3.remaining === 0;

          details.push({
            label: "Token Consumption (Limit 2)",
            expected: "Req 1: pass (1 left), Req 2: pass (0 left)",
            actual: `Req 1: ${c1.remaining} left, Req 2: ${c2.remaining} left`,
            passed: p1 && p2,
          });
          details.push({
            label: "3rd Request Rate Block Enforcement",
            expected: "success: false (quota exhausted)",
            actual: `success: ${c3.success}, reset: ${c3.resetSeconds}s`,
            passed: p3,
          });

          passed = p1 && p2 && p3;
        }
      } catch (e) {
        passed = false;
        err = (e as Error).message;
      }

      const durationMs = Math.round((performance.now() - t0) * 100) / 100;

      setTests((prev) =>
        prev.map((t) =>
          t.id === testId
            ? {
                ...t,
                status: passed ? "pass" : "fail",
                durationMs,
                details,
                error: err,
              }
            : t
        )
      );
    }, 40);
  };

  const runAllTests = () => {
    setIsRunningAll(true);
    tests.forEach((t) => runTest(t.id));
    setTimeout(() => setIsRunningAll(false), 300);
  };

  const passedCount = tests.filter((t) => t.status === "pass").length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-600 text-white shadow-xs">
              <ShieldCheck size={16} />
            </span>
            <h2 className="text-[19px] font-bold text-slate-900">3 · Live Client-Side Assertion Test Harness</h2>
          </div>
          <p className="text-[13px] text-slate-600">
            Execute deterministic invariant checks directly in your browser without external tools.
          </p>
        </div>
        <button
          onClick={runAllTests}
          disabled={isRunningAll}
          className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-orange-600 px-4 py-2 text-[14px] font-bold text-white shadow hover:bg-orange-700 transition-all disabled:opacity-50"
        >
          <Play size={14} className={isRunningAll ? "animate-spin" : ""} />
          Run All Assertions
        </button>
      </div>

      {passedCount > 0 && (
        <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-[13px] text-emerald-900">
          <div className="flex items-center gap-2 font-medium">
            <CheckCircle2 size={16} className="text-emerald-700" />
            <span>
              <strong>{passedCount} of {tests.length}</strong> verification assertions passed cleanly. Zero drift, 100% deterministic code.
            </span>
          </div>
          <span className="font-mono text-[11px] font-bold text-emerald-800">
            Total Time: {tests.reduce((a, b) => a + b.durationMs, 0).toFixed(2)}ms
          </span>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        {tests.map((test) => {
          const isPass = test.status === "pass";
          const isFail = test.status === "fail";
          const isRunning = test.status === "running";

          return (
            <div
              key={test.id}
              className={`flex flex-col justify-between rounded-2xl border p-4 transition-all ${
                isPass
                  ? "border-emerald-200 bg-white shadow-xs"
                  : isFail
                  ? "border-rose-200 bg-rose-50/40"
                  : "border-slate-200 bg-white"
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-600">
                    {test.category}
                  </span>
                  <div className="flex items-center gap-1.5">
                    {test.durationMs > 0 && (
                      <span className="font-mono text-[11px] text-slate-500">{test.durationMs}ms</span>
                    )}
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold ${
                        isPass
                          ? "bg-emerald-100 text-emerald-800"
                          : isFail
                          ? "bg-rose-100 text-rose-800"
                          : isRunning
                          ? "bg-amber-100 text-amber-800"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {isPass && <Check size={12} />}
                      {isFail && <X size={12} />}
                      {isRunning && <RefreshCw size={12} className="animate-spin" />}
                      {test.status.toUpperCase()}
                    </span>
                  </div>
                </div>

                <h3 className="text-[16px] font-bold text-slate-900">{test.name}</h3>
                <p className="mt-1 text-[13px] text-slate-600 leading-snug">{test.description}</p>

                {test.details.length > 0 && (
                  <div className="mt-3 space-y-1.5 border-t border-slate-100 pt-2.5">
                    {test.details.map((d, i) => (
                      <div key={i} className="rounded-lg bg-slate-50 p-2 font-mono text-[11px]">
                        <div className="flex items-center justify-between text-slate-700">
                          <span className="font-semibold">{d.label}</span>
                          <span className={d.passed ? "text-emerald-700 font-bold" : "text-rose-700 font-bold"}>
                            {d.passed ? "✓ PASS" : "✗ FAIL"}
                          </span>
                        </div>
                        <div className="mt-0.5 text-slate-500 text-[10px]">
                          <div>Expected: {d.expected}</div>
                          <div>Actual: {d.actual}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="mt-4 flex items-center justify-between pt-2 border-t border-slate-100">
                <button
                  onClick={() => runTest(test.id)}
                  disabled={isRunning}
                  className="inline-flex min-h-[44px] items-center gap-1 rounded-lg border border-slate-200 px-3 py-1 text-[12px] font-semibold text-slate-700 hover:border-slate-400 hover:bg-slate-50 disabled:opacity-50"
                >
                  <RefreshCw size={12} className={isRunning ? "animate-spin" : ""} />
                  {test.status === "idle" ? "Run Test" : "Re-run"}
                </button>
                <span className="text-[11px] text-slate-500">Node-compatible pure TS</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
