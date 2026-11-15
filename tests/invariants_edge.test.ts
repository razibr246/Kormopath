import { test } from "node:test";
import assert from "node:assert/strict";
import { verifyEvidence, unknownAmounts, numberAppears } from "../lib/grounding.ts";
import { milestoneAmounts } from "../lib/contract.ts";
import { compareChannels, checkInvariants, type FinInput } from "../lib/finops.ts";

const standardFees = {
  fiverrFee: 20,
  fiverrWithdraw: 3,
  upworkFee: 10,
  upworkWithdraw: 2,
  payoneerFx: 2,
  payoneerBkashFx: 3,
  payoneerBkashFlat: 1,
  wireFlat: 20,
  bankFx: 0.8,
  freelancerIncentive: 2.5,
};

// -----------------------------------------------------------------------------
// 1. lib/grounding.ts Unicode & Evidence Edge Cases
// -----------------------------------------------------------------------------

test("Unicode NFC: Bengali decomposed vs composed characters verify cleanly in verifyEvidence", () => {
  // Case A: য় (U+09DF) vs য (U+09AF) + ় (U+09BC)
  const yaComposedQuote = "তাঁর বয়স হয়েছে";
  const yaDecomposedSource = "জাতীয় পরিচয়পত্র অনুযায়ী তাঁর ব\u09AF\u09BCস হয়েছে এবং তিনি নিবন্ধিত।";
  const yaRes1 = verifyEvidence(yaComposedQuote, yaDecomposedSource);
  assert.equal(yaRes1.verdict, "verified");
  assert.equal(yaRes1.score, 1);

  // Reverse check: decomposed quote against composed source
  const yaDecomposedQuote = "তাঁর ব\u09AF\u09BCস হয়েছে";
  const yaComposedSource = "জাতীয় পরিচয়পত্র অনুযায়ী তাঁর বয়স হয়েছে এবং তিনি নিবন্ধিত।";
  const yaRes2 = verifyEvidence(yaDecomposedQuote, yaComposedSource);
  assert.equal(yaRes2.verdict, "verified");
  assert.equal(yaRes2.score, 1);

  // Case B: ড় (U+09DC) vs ড (U+09A1) + ় (U+09BC)
  const rraComposedQuote = "নিয়মিত পড়াশোনা করা";
  const rraDecomposedSource = "ছাত্রছাত্রীদের উচিত নিয়মিত প\u09A1\u09BCাশোনা করা যাতে ভালো ফল হয়।";
  const rraRes = verifyEvidence(rraComposedQuote, rraDecomposedSource);
  assert.equal(rraRes.verdict, "verified");
  assert.equal(rraRes.score, 1);

  // Case C: ঢ় (U+09DD) vs ঢ (U+09A2) + ় (U+09BC)
  const rrhaComposedQuote = "দৃঢ় প্রতিজ্ঞা গ্রহণ";
  const rrhaDecomposedSource = "তিনি মানুষের সেবায় এক দৃঢ\u09BC প্রতিজ্ঞা গ্রহণ করেছিলেন।";
  const rrhaRes = verifyEvidence(rrhaComposedQuote, rrhaDecomposedSource);
  assert.equal(rrhaRes.verdict, "verified");
  assert.equal(rrhaRes.score, 1);
});

test("unknownAmounts: Edge formats, currency symbols, and empty inputs", () => {
  const allowed = [1200, 500];

  // Allowed variations of $1200 and $500 should return no unknown amounts
  assert.deepEqual(unknownAmounts("Total milestone is $1,200.00 today", allowed), []);
  assert.deepEqual(unknownAmounts("Total milestone is $1200 today", allowed), []);
  assert.deepEqual(unknownAmounts("Total milestone is $ 1200 today", allowed), []);
  assert.deepEqual(unknownAmounts("Two milestones: $1,200.00 and $ 500", allowed), []);

  // Float within tolerance (< 0.5 difference)
  assert.deepEqual(unknownAmounts("Close estimate: $1200.40", allowed), []);

  // Amounts exceeding tolerance (>= 0.5 difference) or unauthorized
  assert.deepEqual(unknownAmounts("Modified invoice: $1200.60", allowed), [1200.6]);
  assert.deepEqual(unknownAmounts("Unauthorized invoice: $1,500.00", allowed), [1500]);
  assert.deepEqual(unknownAmounts("Unknown fee of $ 2500 added", allowed), [2500]);

  // Non-dollar currency signs should be ignored by dollar extractor
  assert.deepEqual(unknownAmounts("Payments: ৳1,200, €500, £300, and 1200 BDT", allowed), []);
  assert.deepEqual(unknownAmounts("Plain text 1200 USD without dollar sign", allowed), []);

  // Empty and whitespace strings
  assert.deepEqual(unknownAmounts("", allowed), []);
  assert.deepEqual(unknownAmounts("   ", allowed), []);

  // Mixed text containing valid, non-dollar, and unexpected dollar values
  const mixedText = "Scope: $1,200.00 initial, ৳500 local tax, $ 500.00 tranche, bonus €200, unexpected $9,999.50 fee.";
  assert.deepEqual(unknownAmounts(mixedText, allowed), [9999.5]);
});

test("numberAppears: Comma formatting, decimal zeros, and zero boundary", () => {
  // Comma formatting
  assert.ok(numberAppears(1200, "Received USD 1,200 in bank transfer"));
  assert.ok(numberAppears(1200, "Received USD 1200 in bank transfer"));
  assert.ok(numberAppears(10000000, "Grand total of 10,000,000 BDT allocated"));

  // Decimal zeros and fractions
  assert.ok(numberAppears(1200, "Invoice balance: 1200.00 USD"));
  assert.ok(numberAppears(1200, "Invoice balance: 1,200.00 USD"));
  assert.ok(numberAppears(1200.5, "Invoice balance: 1,200.50 USD"));
  assert.ok(numberAppears(1200.5, "Invoice balance: 1200.5 USD"));

  // Zero amount boundary
  assert.ok(numberAppears(0, "Remaining fee: 0 USD"));
  assert.ok(numberAppears(0, "Remaining fee: 0.00 BDT"));

  // Numbers that must NOT match isolated zero
  assert.ok(!numberAppears(0, "Transaction amount is 100 USD"));
  assert.ok(!numberAppears(0, "Item count is 50 units"));

  // Substring containment guards (120 should not match 1200)
  assert.ok(!numberAppears(120, "Paid 1200 USD"));
  assert.ok(!numberAppears(200, "Paid 1200 USD"));
  assert.ok(!numberAppears(12, "Invoice 12.50 USD"));
});

test("verifyEvidence sliding window: 100% exact, non-contiguous, 80% boundary, and 79% failure", () => {
  // 1. Exact 100% continuous substring
  const exact = verifyEvidence("machine learning pipeline architecture", "production machine learning pipeline architecture deployed on kubernetes");
  assert.equal(exact.verdict, "verified");
  assert.equal(exact.score, 1);

  // 2. 100% token match non-contiguous (words inserted, within window)
  const nonContig = verifyEvidence(
    "machine learning pipeline architecture",
    "machine advanced learning scalable pipeline modern architecture verified"
  );
  assert.equal(nonContig.verdict, "partial");
  assert.equal(nonContig.score, 1);

  // 3. Exactly 80% threshold boundary (4 of 5 tokens present in window)
  const ev5 = "alpha beta gamma delta epsilon";
  const src4 = "prefix alpha extra beta noise gamma filler delta suffix";
  const hit80 = verifyEvidence(ev5, src4);
  assert.equal(hit80.verdict, "partial");
  assert.equal(hit80.score, 0.8);

  // 4. Below 80% threshold (3 of 4 tokens = 75%)
  const ev4 = "alpha beta gamma delta";
  const src3 = "prefix alpha extra beta noise gamma suffix";
  const hit75 = verifyEvidence(ev4, src3);
  assert.equal(hit75.verdict, "unverified");
  assert.equal(hit75.score, 0.75);

  // 5. Strict 79% token failure (79 of 100 tokens present in window)
  const ev100Words = Array.from({ length: 100 }, (_, i) => `token${i}`);
  const ev100 = ev100Words.join(" ");
  const src79 = ev100Words.slice(0, 79).join(" ");
  const hit79 = verifyEvidence(ev100, src79);
  assert.equal(hit79.verdict, "unverified");
  assert.equal(hit79.score, 0.79);

  // 6. Empty / blank inputs
  assert.deepEqual(verifyEvidence("", "some valid source text"), { verdict: "unverified", score: 0 });
  assert.deepEqual(verifyEvidence("some valid evidence", ""), { verdict: "unverified", score: 0 });
});

// -----------------------------------------------------------------------------
// 2. lib/contract.ts Milestone Edge Cases
// -----------------------------------------------------------------------------

test("milestoneAmounts: Handles empty milestone array gracefully", () => {
  assert.deepEqual(milestoneAmounts(1000, []), []);
  assert.deepEqual(milestoneAmounts(0, []), []);
  assert.deepEqual(milestoneAmounts(50000.55, []), []);
});

test("milestoneAmounts: Non-100% percentage sums reconcile cleanly via remainder allocation", () => {
  // Sum under 100% (60% total): remainder goes to the last milestone
  const under = milestoneAmounts(1000, [{ pct: 30 }, { pct: 30 }]);
  assert.deepEqual(under, [300, 700]);
  assert.equal(under.reduce((a, b) => a + b, 0), 1000);

  // Sum over 100% (110% total): negative remainder balances on the last milestone
  const over = milestoneAmounts(1000, [{ pct: 50 }, { pct: 60 }]);
  assert.deepEqual(over, [500, 500]);
  assert.equal(over.reduce((a, b) => a + b, 0), 1000);
});

test("milestoneAmounts: Zero USD contract distributes zero cents without NaN", () => {
  const zeroContract2 = milestoneAmounts(0, [{ pct: 50 }, { pct: 50 }]);
  assert.deepEqual(zeroContract2, [0, 0]);

  const zeroContract3 = milestoneAmounts(0, [{ pct: 33.33 }, { pct: 33.33 }, { pct: 33.34 }]);
  assert.deepEqual(zeroContract3, [0, 0, 0]);

  // Ensure no -0 or NaN
  assert.ok(zeroContract2.every((c) => Object.is(c, 0) || c === 0));
});

test("milestoneAmounts: Extreme $10M contract value preserves exact cent sum", () => {
  const valueUsd = 10_000_000;
  const parts = milestoneAmounts(valueUsd, [{ pct: 33.33 }, { pct: 33.33 }, { pct: 33.34 }]);
  assert.deepEqual(parts, [3333000, 3333000, 3334000]);

  const totalCents = parts.map((x) => Math.round(x * 100)).reduce((a, b) => a + b, 0);
  assert.equal(totalCents, 10_000_000 * 100);

  // Fractional cent contract: $10,000,000.01
  const fracParts = milestoneAmounts(10_000_000.01, [{ pct: 33.33 }, { pct: 33.33 }, { pct: 33.34 }]);
  const fracCents = fracParts.map((x) => Math.round(x * 100)).reduce((a, b) => a + b, 0);
  assert.equal(fracCents, 1000000001);
});

// -----------------------------------------------------------------------------
// 3. lib/finops.ts Calculation Invariants under Extreme Conditions
// -----------------------------------------------------------------------------

test("finops: Extreme FX rates (50.0 and 250.0 BDT/USD) preserve reconciliation invariant", () => {
  for (const fx of [50.0, 250.0]) {
    for (const claimIncentive of [false, true]) {
      const inp: FinInput = { invoiceUsd: 1500, withdrawals: 2, fx, fees: standardFees, claimIncentive };
      const channels = compareChannels(inp);
      const inv = checkInvariants(channels);
      assert.ok(inv.ok, `Failed invariant at FX ${fx}, incentive ${claimIncentive}: error ${inv.maxErrorBdt}`);
      assert.ok(inv.maxErrorBdt < 0.05);

      // Verify gross BDT scales linearly with FX
      const fiverr = channels.find((c) => c.id === "fiverr")!;
      assert.equal(fiverr.grossBdt, 1500 * fx);
    }
  }
});

test("finops: Zero gross invoice produces zero net and zero keptPct with valid invariants", () => {
  const inp: FinInput = { invoiceUsd: 0, withdrawals: 1, fx: 120, fees: standardFees, claimIncentive: true };
  const channels = compareChannels(inp);

  for (const c of channels) {
    assert.equal(c.grossBdt, 0);
    assert.equal(c.netBdt, 0);
    assert.equal(c.keptPct, 0);
  }

  const inv = checkInvariants(channels);
  assert.ok(inv.ok);
  assert.equal(inv.maxErrorBdt, 0);
});

test("finops: Excessive withdrawal count clamps netBdt to zero floor without going negative", () => {
  // $50 invoice with 100 withdrawals (fee = $3 * 100 = $300, exceeding invoice)
  const inp: FinInput = { invoiceUsd: 50, withdrawals: 100, fx: 120, fees: standardFees, claimIncentive: true };
  const channels = compareChannels(inp);

  for (const c of channels) {
    assert.ok(c.netBdt >= 0, `${c.id} netBdt is negative: ${c.netBdt}`);
    assert.equal(c.netBdt, 0);
  }

  const inv = checkInvariants(channels);
  assert.ok(inv.ok);
  assert.equal(inv.maxErrorBdt, 0);
});

test("finops: Comprehensive stress matrix verifies zero floating-point drift across all channels", () => {
  const invoices = [0.01, 0.99, 10, 853.37, 2450.75, 10000, 100000.55];
  const fxRates = [50.0, 85.5, 110.25, 120.0, 125.75, 250.0];
  const withdrawalCounts = [0, 1, 4, 10, 50, 100];
  const incentiveFlags = [false, true];

  let evaluatedChannels = 0;
  for (const invoiceUsd of invoices) {
    for (const fx of fxRates) {
      for (const withdrawals of withdrawalCounts) {
        for (const claimIncentive of incentiveFlags) {
          const inp: FinInput = { invoiceUsd, withdrawals, fx, fees: standardFees, claimIncentive };
          const channels = compareChannels(inp);
          const inv = checkInvariants(channels);
          assert.ok(inv.ok, `Invariant failed for inv=${invoiceUsd}, fx=${fx}, w=${withdrawals}, inc=${claimIncentive}`);

          for (const c of channels) {
            assert.ok(c.netBdt >= 0, `Negative netBdt found in ${c.id}`);
            const sum = c.grossBdt + c.steps.reduce((acc, step) => acc + step.bdt, 0);
            const drift = Math.abs(sum - c.netBdt);
            assert.ok(drift < 0.05, `Drift ${drift} exceeded 0.05 BDT in channel ${c.id}`);
            evaluatedChannels++;
          }
        }
      }
    }
  }

  assert.equal(evaluatedChannels, 2016);
});
