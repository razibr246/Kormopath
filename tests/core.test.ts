import { test } from "node:test";
import assert from "node:assert/strict";
import { compareChannels, checkInvariants, best, batchingSaving, fmtBdt, type FinInput } from "../lib/finops.ts";
import { verifyEvidence, numberAppears, unknownAmounts } from "../lib/grounding.ts";
import { milestoneAmounts } from "../lib/contract.ts";

const fees = {
  fiverrFee: 20, fiverrWithdraw: 3, upworkFee: 10, upworkWithdraw: 2,
  payoneerFx: 2, payoneerBkashFx: 3, payoneerBkashFlat: 1,
  wireFlat: 20, bankFx: 0.8, freelancerIncentive: 2.5,
};
const base: FinInput = { invoiceUsd: 1000, withdrawals: 1, fx: 120, fees, claimIncentive: false };

test("Fiverr route: 20% fee, $3 withdrawal, 2% FX", () => {
  const f = compareChannels(base).find((c) => c.id === "fiverr")!;
  // (1000 - 200 - 3) * 0.98 * 120 = 93,727.2
  assert.equal(f.netBdt, 93727.2);
  assert.equal(f.grossBdt, 120000);
});

test("Bank wire with incentive adds 2.5% on the converted amount", () => {
  const w = compareChannels({ ...base, claimIncentive: true }).find((c) => c.id === "bank_wire")!;
  // (1000 - 20) * 0.992 * 120 * 1.025 = 119,575.68
  assert.equal(w.netBdt, 119575.68);
});

test("Steps always reconcile with net", () => {
  for (const amt of [5, 100, 853.37, 5000]) {
    for (const w of [1, 4]) {
      const r = checkInvariants(compareChannels({ ...base, invoiceUsd: amt, withdrawals: w, claimIncentive: true }));
      assert.ok(r.ok, `amount ${amt} withdrawals ${w}: error ${r.maxErrorBdt}`);
    }
  }
});

test("Tiny invoices never go negative", () => {
  const cs = compareChannels({ ...base, invoiceUsd: 10, withdrawals: 4 });
  for (const c of cs) assert.ok(c.netBdt >= 0, `${c.id} = ${c.netBdt}`);
});

test("Best channel and batching", () => {
  // the flat wire fee makes small invoices cheaper via bKash, large ones via bank wire
  assert.equal(best(compareChannels(base)).id, "bank_wire");
  assert.equal(best(compareChannels({ ...base, invoiceUsd: 200 })).id, "payoneer_bkash");
  const b = batchingSaving(base, "fiverr");
  assert.ok(b.savedBdt > 0);
});

test("Bangladeshi digit grouping", () => {
  assert.equal(fmtBdt(1234567), "৳12,34,567");
  assert.equal(fmtBdt(999), "৳999");
  assert.equal(fmtBdt(-45000), "−৳45,000");
});

test("Evidence check accepts real quotes and rejects invented ones", () => {
  const src = "Built a payment webhook handler in Node and Express for a bKash sandbox checkout.";
  assert.equal(verifyEvidence("payment webhook handler in Node", src).verdict, "verified");
  assert.equal(verifyEvidence("Kubernetes cluster autoscaling", src).verdict, "unverified");
  assert.equal(verifyEvidence("webhook handler in Node and Express for bKash", src).verdict, "partial");
});

test("Evidence check handles Bengali composite Unicode normalization (NFC) and marks", () => {
  // Composed য় (\u09DF) vs decomposed য + ় (\u09AF\u09BC)
  const src = "তিনি ঢাকায় থাকেন এবং একটি বাড়ি কিনেছেন।";
  assert.equal(verifyEvidence("ঢাকায়", src).verdict, "verified");
  assert.equal(verifyEvidence("ঢাকা\u09AF\u09BC", src).verdict, "verified");
  assert.equal(verifyEvidence("বা\u09A1\u09BCি", src).verdict, "verified");
  assert.equal(verifyEvidence("বা\u09DCি", src).verdict, "verified");

  // Partial match in Bengali with vowel marks
  const anthem = "আমার সোনার বাংলা আমি তোমায় ভালোবাসি চিরদিন তোমার আকাশ";
  assert.equal(verifyEvidence("সোনার বাংলা আমি তোমায় অনেক ভালোবাসি", anthem).verdict, "partial");
});

test("Numbers must literally appear", () => {
  assert.ok(numberAppears(1200, "Payment received USD 1,200.00 from Acme"));
  assert.ok(!numberAppears(1300, "Payment received USD 1,200.00 from Acme"));
  assert.deepEqual(unknownAmounts("Fixed $1,200 in three parts: $360 and $9,999", [1200, 360, 480]), [9999]);
});

test("Numbers appear in Bengali digits and with currency signs", () => {
  assert.ok(numberAppears(1200, "পেমেন্ট ১,২০০ টাকা"));
  assert.ok(numberAppears(1200, "মোট ৳১,২০০.০০ গ্রহণ"));
  assert.ok(!numberAppears(1300, "পেমেন্ট ১,২০০ টাকা"));
  assert.ok(numberAppears(45.5, "চার্জ ৪৫.৫০ টাকা"));
});

test("Milestones sum exactly to the contract value", () => {
  const parts = milestoneAmounts(1000.01, [{ pct: 30 }, { pct: 40 }, { pct: 30 }]);
  assert.equal(Math.round(parts.reduce((a, b) => a + b, 0) * 100), 100001);
});

test("milestoneAmounts handles empty arrays, zero USD, and uneven splits safely", () => {
  assert.deepEqual(milestoneAmounts(1000, []), []);
  assert.deepEqual(milestoneAmounts(0, []), []);
  assert.deepEqual(milestoneAmounts(0, [{ pct: 50 }, { pct: 50 }]), [0, 0]);

  // 3-way split with fractional cents reconciles remainder to final milestone
  const thirds = milestoneAmounts(100, [{ pct: 33.33 }, { pct: 33.33 }, { pct: 33.34 }]);
  assert.deepEqual(thirds, [33.33, 33.33, 33.34]);
  assert.equal(Math.round(thirds.reduce((a, b) => a + b, 0) * 100), 10000);

  // Under-allocated percentages (99% total) allocate remainder to final milestone
  const under = milestoneAmounts(100, [{ pct: 33 }, { pct: 33 }, { pct: 33 }]);
  assert.deepEqual(under, [33, 33, 34]);
  assert.equal(Math.round(under.reduce((a, b) => a + b, 0) * 100), 10000);
});

test("Rate limiter enforces sliding token-bucket window", async () => {
  const { checkRateLimit } = await import("../lib/rateLimit.ts");
  const mockReq = new Request("http://localhost:3000/api/audit", {
    headers: { "x-forwarded-for": "192.168.1.50" },
  });

  // Consume all tokens with low limit
  const first = checkRateLimit(mockReq, { limit: 2, windowMs: 10000 });
  assert.ok(first.success);
  assert.equal(first.remaining, 1);

  const second = checkRateLimit(mockReq, { limit: 2, windowMs: 10000 });
  assert.ok(second.success);
  assert.equal(second.remaining, 0);

  const third = checkRateLimit(mockReq, { limit: 2, windowMs: 10000 });
  assert.equal(third.success, false, "Third request must be blocked by rate limiter");
  assert.equal(third.remaining, 0);
});

test("CollegeVine-grade chancing engine computes Reach/Match/Safety balance ratio", async () => {
  const { analyzeListBalance } = await import("../lib/admitbuddy.ts");
  const mockMatches = [
    { university: { id: "u1" }, category: "Reach" },
    { university: { id: "u2" }, category: "Reach" },
    { university: { id: "u3" }, category: "Match" },
    { university: { id: "u4" }, category: "Match" },
    { university: { id: "u5" }, category: "Safety" },
  ] as any;

  const unbalanced = analyzeListBalance(mockMatches, ["u1", "u2"]); // 2 reach, 0 safety
  assert.equal(unbalanced.isBalanced, false);
  assert.ok(unbalanced.recommendationBn.length > 0);

  const balanced = analyzeListBalance(mockMatches, ["u1", "u3", "u4", "u5"]); // 1 reach, 2 match, 1 safety, total 4
  assert.equal(balanced.isBalanced, true);
  assert.ok(balanced.statusBn.includes("আদর্শ সুষম"));
});

test("SOP analyzer computes word count, reading time, and readability score", async () => {
  const { analyzeSopText } = await import("../lib/admitbuddy.ts");
  const essay =
    "As an aspiring Computer Science scholar from Bangladesh, my research journey is rooted in distributed systems and high-throughput transaction reliability. Over the past year, I built production web services and micro-fintech integrations serving local users. Admittance to this program allows me to bridge national engineering talent with global architectural standards.";
  const res = analyzeSopText(essay);
  assert.ok(res.wordCount > 40, "Word count should exceed 40 words");
  assert.ok(res.readingTimeMin > 0);
  assert.ok(Number.isFinite(res.readabilityScore), "Readability score should be calculated");
  // Real Flesch scores are not clamped: dense academic prose scores lower than plain prose.
  assert.ok(analyzeSopText("I built an app. It helps students pay fees. I want to learn more.").readabilityScore > res.readabilityScore);
});

test("ChuktiGuard calculates B2B milestones, SWIFT deductions, and 2.5% incentive", async () => {
  const { calculateInvoiceFinOps, generateClause4Text } = await import("../lib/chuktiguard.ts");
  const milestones = [
    { id: "1", title: "Frontend Architecture", amountUsd: 1000, dueDate: "2026-11-20", status: "approved" as const },
    { id: "2", title: "Backend API & Database", amountUsd: 1500, dueDate: "2026-11-30", status: "pending" as const },
  ];
  const finops = calculateInvoiceFinOps(milestones, 120, "swift");
  assert.equal(finops.totalUsd, 2500);
  assert.equal(finops.grossBdt, 300000); // 2500 * 120
  assert.equal(finops.incentiveGainBdt, 7500); // 300,000 * 0.025
  assert.ok(finops.netBdt > 0);
  assert.ok(finops.keptPct > 95);

  const shield = generateClause4Text({ freelancerName: "Rahim", clientCompany: "Acme Corp", gracePeriodHours: 72 });
  assert.ok(shield.en.includes("Rahim"));
  assert.ok(shield.en.includes("72 hours"));
  assert.ok(shield.bn.includes("রহিম") || shield.bn.includes("Rahim"));
});

test("calculateInvoiceFinOps preserves exact reconciliation invariant across all rails", async () => {
  const { calculateInvoiceFinOps } = await import("../lib/finops.ts");
  const rails = ["swift", "payoneer", "wise", "bkash_remit"] as const;
  const testCases = [
    [{ amountUsd: 2 }],
    [{ amountUsd: 500 }],
    [{ amountUsd: 1200 }, { amountUsd: 1800 }],
    [{ amountUsd: 1234.56 }, { amountUsd: 789.01 }],
    [{ amountUsd: 50000 }],
  ];

  for (const r of rails) {
    for (const ms of testCases) {
      const res = calculateInvoiceFinOps(ms as any, 120, r);
      // Invariant: Gross - Fees - FX + Incentive = Net
      const calculated = res.grossBdt - res.feeBdt - res.fxDrainBdt + res.incentiveGainBdt;
      assert.equal(res.netBdt, calculated, `Reconciliation mismatch for rail ${r} on total $${res.totalUsd}`);
      assert.ok(res.netBdt >= 0, `Net BDT must never be negative (rail=${r}, total=$${res.totalUsd})`);
    }
  }
});

test("calculateInvoiceFinOps handles empty milestones and zero amounts cleanly", async () => {
  const { calculateInvoiceFinOps } = await import("../lib/finops.ts");
  const empty = calculateInvoiceFinOps([], 120, "swift");
  assert.equal(empty.totalUsd, 0);
  assert.equal(empty.grossBdt, 0);
  assert.equal(empty.feeBdt, 0);
  assert.equal(empty.fxDrainBdt, 0);
  assert.equal(empty.incentiveGainBdt, 0);
  assert.equal(empty.netBdt, 0);
  assert.equal(empty.keptPct, 100);
});

test("FeeGuard: effective cost from what was actually received", async () => {
  const { effectiveCost, savingBetween, channelsToCsv } = await import("../lib/finops.ts");
  assert.deepEqual(effectiveCost(1000, 120, 96000), { lostBdt: 24000, lostPct: 20 });
  assert.equal(effectiveCost(0, 120, 100), null);
  const cs = compareChannels(base);
  const s = savingBetween(cs, "bank_wire", "fiverr");
  assert.equal(s, Math.round((cs.find((c) => c.id === "bank_wire")!.netBdt - cs.find((c) => c.id === "fiverr")!.netBdt) * 100) / 100);
  const csv = channelsToCsv(cs, 1000, 120);
  // every step on screen appears in the export, and nets match the engine
  const stepCount = cs.reduce((a, c) => a + Math.max(1, c.steps.length), 0);
  assert.equal(csv.split("\n").length, stepCount + 1);
  assert.ok(csv.includes(String(cs[0].netBdt.toFixed(2))));
});
