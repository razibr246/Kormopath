import { test } from "node:test";
import assert from "node:assert/strict";
import {
  calculateInvoiceFinOps,
  generateClause4Text,
  NBR_ITES_DECLARATION,
  fmtBdt,
  SAMPLE_CHUKTI_PRESETS,
  type InvoiceMilestone,
} from "../lib/chuktiguard.ts";
import { milestoneAmounts } from "../lib/contract.ts";

// ============================================================================
// 1. calculateInvoiceFinOps(): Payout Rails, Deductions, and Invariants
// ============================================================================

test("calculateInvoiceFinOps — SWIFT rail calculates receiving fee, 0.8% FX spread, and 2.5% BB incentive", () => {
  const milestones: InvoiceMilestone[] = [
    { id: "m1", title: "Milestone 1", amountUsd: 1000, dueDate: "2026-11-20", status: "approved" },
    { id: "m2", title: "Milestone 2", amountUsd: 1500, dueDate: "2026-11-30", status: "pending" },
  ];
  // totalUsd = 2500, fx = 120
  // grossBdt = 300,000
  // incentive (2.5%) = 7,500
  // fee ($20 wireFlat * 120) = 2,400
  // fxDrain (0.8% of 300,000) = 2,400
  // netBdt = 300,000 - 2,400 - 2,400 + 7,500 = 302,700
  // keptPct = (302700 / 300000) * 100 = 100.9%
  const res = calculateInvoiceFinOps(milestones, 120, "swift");
  assert.equal(res.totalUsd, 2500);
  assert.equal(res.grossBdt, 300000);
  assert.equal(res.incentiveGainBdt, 7500);
  assert.equal(res.feeBdt, 2400);
  assert.equal(res.fxDrainBdt, 2400);
  assert.equal(res.netBdt, 302700);
  assert.equal(res.keptPct, 100.9);
  assert.equal(res.formattedGross, "৳3,00,000");
  assert.equal(res.formattedIncentive, "৳7,500");
  assert.equal(res.formattedNet, "৳3,02,700");
});

test("calculateInvoiceFinOps — Payoneer rail calculates 1% receiving fee, 2.0% FX spread, and 0% incentive", () => {
  const milestones: InvoiceMilestone[] = [
    { id: "m1", title: "UI Components", amountUsd: 2000, dueDate: "2026-11-20", status: "delivered" },
  ];
  // totalUsd = 2000, fx = 120
  // grossBdt = 240,000
  // incentive = 0
  // fee = 2000 * 0.01 = 20 USD -> 20 * 120 = 2,400 BDT
  // fxDrain = 240,000 * 0.02 = 4,800 BDT
  // netBdt = 240,000 - 2,400 - 4,800 + 0 = 232,800 BDT
  // keptPct = (232800 / 240000) * 100 = 97.0%
  const res = calculateInvoiceFinOps(milestones, 120, "payoneer");
  assert.equal(res.totalUsd, 2000);
  assert.equal(res.grossBdt, 240000);
  assert.equal(res.incentiveGainBdt, 0);
  assert.equal(res.feeBdt, 2400);
  assert.equal(res.fxDrainBdt, 4800);
  assert.equal(res.netBdt, 232800);
  assert.equal(res.keptPct, 97.0);
  assert.equal(res.formattedGross, "৳2,40,000");
  assert.equal(res.formattedIncentive, "৳0");
  assert.equal(res.formattedNet, "৳2,32,800");
});

test("calculateInvoiceFinOps — Wise rail calculates 0.5% fee, 0.6% FX spread, and 0% incentive", () => {
  const milestones: InvoiceMilestone[] = [
    { id: "m1", title: "API Integration", amountUsd: 1000, dueDate: "2026-11-20", status: "paid" },
  ];
  // totalUsd = 1000, fx = 120
  // grossBdt = 120,000
  // incentive = 0
  // fee = 1000 * 0.005 = 5 USD -> 5 * 120 = 600 BDT
  // fxDrain = 120,000 * 0.006 = 720 BDT
  // netBdt = 120,000 - 600 - 720 + 0 = 118,680 BDT
  // keptPct = (118680 / 120000) * 100 = 98.9%
  const res = calculateInvoiceFinOps(milestones, 120, "wise");
  assert.equal(res.totalUsd, 1000);
  assert.equal(res.grossBdt, 120000);
  assert.equal(res.incentiveGainBdt, 0);
  assert.equal(res.feeBdt, 600);
  assert.equal(res.fxDrainBdt, 720);
  assert.equal(res.netBdt, 118680);
  assert.equal(res.keptPct, 98.9);
  assert.equal(res.formattedGross, "৳1,20,000");
  assert.equal(res.formattedIncentive, "৳0");
  assert.equal(res.formattedNet, "৳1,18,680");
});

test("calculateInvoiceFinOps — bKash Remit rail calculates 0 fee, 1.5% FX spread, and 2.5% BB incentive", () => {
  const milestones: InvoiceMilestone[] = [
    { id: "m1", title: "Mobile UI Design", amountUsd: 1000, dueDate: "2026-11-20", status: "pending" },
  ];
  // totalUsd = 1000, fx = 120
  // grossBdt = 120,000
  // incentive (2.5%) = 3,000
  // fee = 0 BDT
  // fxDrain (1.5%) = 1,800 BDT
  // netBdt = 120,000 - 0 - 1,800 + 3,000 = 121,200 BDT
  // keptPct = (121200 / 120000) * 100 = 101.0%
  const res = calculateInvoiceFinOps(milestones, 120, "bkash_remit");
  assert.equal(res.totalUsd, 1000);
  assert.equal(res.grossBdt, 120000);
  assert.equal(res.incentiveGainBdt, 3000);
  assert.equal(res.feeBdt, 0);
  assert.equal(res.fxDrainBdt, 1800);
  assert.equal(res.netBdt, 121200);
  assert.equal(res.keptPct, 101.0);
  assert.equal(res.formattedGross, "৳1,20,000");
  assert.equal(res.formattedIncentive, "৳3,000");
  assert.equal(res.formattedNet, "৳1,21,200");
});

test("calculateInvoiceFinOps — defaults to SWIFT payment rail when rail argument is omitted", () => {
  const milestones: InvoiceMilestone[] = [
    { id: "m1", title: "Sprint Delivery", amountUsd: 1500, dueDate: "2026-11-25", status: "approved" },
  ];
  const withDefault = calculateInvoiceFinOps(milestones, 121.5);
  const explicitSwift = calculateInvoiceFinOps(milestones, 121.5, "swift");
  assert.deepEqual(withDefault, explicitSwift);
});

test("calculateInvoiceFinOps — strict deduction invariant: netBdt === grossBdt - feeBdt - fxDrainBdt + incentiveGainBdt", () => {
  const rails: Array<"swift" | "payoneer" | "wise" | "bkash_remit"> = ["swift", "payoneer", "wise", "bkash_remit"];
  const testAmounts = [10, 250, 1000, 3456.78, 10000];
  const fxRates = [115, 120, 122.35];

  for (const rail of rails) {
    for (const amt of testAmounts) {
      for (const fx of fxRates) {
        const ms: InvoiceMilestone[] = [{ id: "t", title: "T", amountUsd: amt, dueDate: "2026-12-01", status: "pending" }];
        const res = calculateInvoiceFinOps(ms, fx, rail);
        const expectedNet = res.grossBdt - res.feeBdt - res.fxDrainBdt + res.incentiveGainBdt;
        assert.equal(res.netBdt, expectedNet, `Invariant failed for rail=${rail}, amt=${amt}, fx=${fx}`);
      }
    }
  }
});

test("calculateInvoiceFinOps — zero-dollar and empty milestone inputs handled gracefully", () => {
  const emptyRes = calculateInvoiceFinOps([], 120, "payoneer");
  assert.equal(emptyRes.totalUsd, 0);
  assert.equal(emptyRes.grossBdt, 0);
  assert.equal(emptyRes.netBdt, 0);
  assert.equal(emptyRes.keptPct, 100);

  const zeroMilestoneRes = calculateInvoiceFinOps([{ id: "z", title: "Zero", amountUsd: 0, dueDate: "2026-12-01", status: "pending" }], 120, "wise");
  assert.equal(zeroMilestoneRes.totalUsd, 0);
  assert.equal(zeroMilestoneRes.grossBdt, 0);
  assert.equal(zeroMilestoneRes.netBdt, 0);
  assert.equal(zeroMilestoneRes.keptPct, 100);
});

test("calculateInvoiceFinOps — alignment with lib/finops.ts channel logic on incentive qualification", () => {
  const ms: InvoiceMilestone[] = [{ id: "c", title: "Check", amountUsd: 2000, dueDate: "2026-12-01", status: "approved" }];
  const fx = 120;

  // SWIFT and bKash Remit qualify for Bangladesh Bank 2.5% incentive
  const swiftRes = calculateInvoiceFinOps(ms, fx, "swift");
  const bkashRes = calculateInvoiceFinOps(ms, fx, "bkash_remit");
  assert.equal(swiftRes.incentiveGainBdt, Math.round(2000 * fx * 0.025));
  assert.equal(bkashRes.incentiveGainBdt, Math.round(2000 * fx * 0.025));

  // Payoneer and Wise do NOT qualify for automated direct bank 2.5% incentive
  const payoneerRes = calculateInvoiceFinOps(ms, fx, "payoneer");
  const wiseRes = calculateInvoiceFinOps(ms, fx, "wise");
  assert.equal(payoneerRes.incentiveGainBdt, 0);
  assert.equal(wiseRes.incentiveGainBdt, 0);
});

// ============================================================================
// 2. Milestone Splitting in ChuktiGuard / Contract: milestoneAmounts()
// ============================================================================

test("milestoneAmounts — integer cents splitting with remainder cents allocated to last milestone", () => {
  // $1000.01 split 30% / 40% / 30%
  // 100001 cents * 0.30 = 30000.3 -> 30000 ($300.00)
  // 100001 cents * 0.40 = 40000.4 -> 40000 ($400.00)
  // 100001 cents * 0.30 = 30000.3 -> 30000 + remainder 1 = 30001 ($300.01)
  const parts = milestoneAmounts(1000.01, [{ pct: 30 }, { pct: 40 }, { pct: 30 }]);
  assert.deepEqual(parts, [300, 400, 300.01]);
  assert.equal(Math.round(parts.reduce((a, b) => a + b, 0) * 100), 100001);
});

test("milestoneAmounts — single milestone receives 100% of contract value", () => {
  const parts = milestoneAmounts(500, [{ pct: 100 }]);
  assert.deepEqual(parts, [500]);

  const floatParts = milestoneAmounts(1234.56, [{ pct: 100 }]);
  assert.deepEqual(floatParts, [1234.56]);
});

test("milestoneAmounts — zero-dollar invoice produces zero-valued milestone slices", () => {
  const parts = milestoneAmounts(0, [{ pct: 50 }, { pct: 50 }]);
  assert.deepEqual(parts, [0, 0]);
  assert.equal(parts.reduce((a, b) => a + b, 0), 0);
});

test("milestoneAmounts — multiple unequal milestones maintain exact penny sum invariant", () => {
  // $100 with 33%, 33%, 34%
  const parts = milestoneAmounts(100, [{ pct: 33 }, { pct: 33 }, { pct: 34 }]);
  assert.deepEqual(parts, [33, 33, 34]);
  assert.equal(parts.reduce((a, b) => a + b, 0), 100);

  // $500.55 with 15%, 25%, 60%
  // 50055 * 0.15 = 7508 ($75.08)
  // 50055 * 0.25 = 12513 ($125.13)
  // 50055 * 0.60 = 30033 + remainder 1 = 30034 ($300.34)
  const unevenParts = milestoneAmounts(500.55, [{ pct: 15 }, { pct: 25 }, { pct: 60 }]);
  assert.deepEqual(unevenParts, [75.08, 125.13, 300.34]);
  assert.equal(Math.round(unevenParts.reduce((a, b) => a + b, 0) * 100), 50055);
});

test("milestoneAmounts — handles empty milestones array boundary gracefully", () => {
  const parts = milestoneAmounts(1000, []);
  assert.deepEqual(parts, []);
});

// ============================================================================
// 3. Clause 4: Internet Blackout Shield (generateClause4Text)
// ============================================================================

test("generateClause4Text — generates bilingual text with default parameters (72h, Contractor, Client)", () => {
  const shield = generateClause4Text();
  assert.ok(shield.en.includes("The Contractor"));
  assert.ok(shield.en.includes("The Client"));
  assert.ok(shield.en.includes("72 hours"));
  assert.ok(shield.bn.includes("The Contractor"));
  assert.ok(shield.bn.includes("The Client"));
  assert.ok(shield.bn.includes("72 ঘণ্টার"));
});

test("generateClause4Text — correctly injects custom freelancerName, clientCompany, and gracePeriodHours", () => {
  const shield = generateClause4Text({
    freelancerName: "Tanvir Ahmed",
    clientCompany: "Apex Digital Solutions Inc.",
    gracePeriodHours: 48,
  });
  assert.ok(shield.en.includes("Tanvir Ahmed"));
  assert.ok(shield.en.includes("Apex Digital Solutions Inc."));
  assert.ok(shield.en.includes("48 hours"));
  assert.ok(shield.bn.includes("Tanvir Ahmed"));
  assert.ok(shield.bn.includes("Apex Digital Solutions Inc."));
  assert.ok(shield.bn.includes("48 ঘণ্টার"));
});

test("generateClause4Text — cites global internet monitoring authorities (Cloudflare Radar, NetBlocks, IODA)", () => {
  const shield = generateClause4Text();
  assert.ok(shield.en.includes("Cloudflare Radar"));
  assert.ok(shield.en.includes("NetBlocks"));
  assert.ok(shield.en.includes("IODA"));
  assert.ok(shield.bn.includes("ক্লাউডফ্লেয়ার রাডার"));
  assert.ok(shield.bn.includes("নেটব্লকস"));
});

test("generateClause4Text — cites undersea telecommunications infrastructure (SEA-ME-WE 4/5)", () => {
  const shield = generateClause4Text();
  assert.ok(shield.en.includes("SEA-ME-WE 4/5"));
  assert.ok(shield.bn.includes("SEA-ME-WE ৪/৫"));
});

test("generateClause4Text — includes Force Majeure and legal protection provisions in EN and BN", () => {
  const shield = generateClause4Text();
  // English provisions
  assert.ok(shield.en.includes("CLAUSE 4: TELECOMMUNICATION & INFRASTRUCTURE DISRUPTION SHIELD (FORCE MAJEURE)"));
  assert.ok(shield.en.includes("4.1 Uncontrollable Infrastructure Events:"));
  assert.ok(shield.en.includes("4.2 Automatic Grace Period & Dispute Moratorium:"));
  assert.ok(shield.en.includes("4.3 Mutual Good Faith:"));
  assert.ok(shield.en.includes("dispute escrow freeze"));
  assert.ok(shield.en.includes("adverse reputation rating"));

  // Bengali provisions
  assert.ok(shield.bn.includes("ধারা ৪: টেলিযোগাযোগ ও ইন্টারনেট ব্ল্যাকআউট নিরাপত্তা ঢাল (ফোর্স মেজর)"));
  assert.ok(shield.bn.includes("৪.১ নিয়ন্ত্রণহীন অবকাঠামোগত বিঘ্ন:"));
  assert.ok(shield.bn.includes("৪.২ স্বয়ংক্রিয় গ্রেস পিরিয়ড ও বিরোধ স্থগিতকরণ:"));
  assert.ok(shield.bn.includes("৪.৩ পারস্পরিক আস্থা:"));
  assert.ok(shield.bn.includes("বিলম্ব জরিমানা"));
  assert.ok(shield.bn.includes("এসক্রো বাতিল"));
  assert.ok(shield.bn.includes("নেগেটিভ ফিডব্যাক"));
});

// ============================================================================
// 4. Statutory NBR ITES Tax Exemption Notice (NBR_ITES_DECLARATION)
// ============================================================================

test("NBR_ITES_DECLARATION — English notice includes Sixth Schedule Para 33, Section 52, and 0% AIT exemption", () => {
  assert.ok(NBR_ITES_DECLARATION.en.includes("Sixth Schedule (Part A, Paragraph 33)"));
  assert.ok(NBR_ITES_DECLARATION.en.includes("Section 52"));
  assert.ok(NBR_ITES_DECLARATION.en.includes("Income Tax Act 2023"));
  assert.ok(NBR_ITES_DECLARATION.en.includes("100% EXEMPT from Advance Income Tax (AIT) withholding at source"));
  assert.ok(NBR_ITES_DECLARATION.en.includes("2.5% Cash Incentive"));
  assert.ok(NBR_ITES_DECLARATION.en.includes("Bangladesh Bank FE Circular No. 02/2022"));
  assert.ok(NBR_ITES_DECLARATION.en.includes("Information Technology Enabled Services (ITES)"));
  assert.ok(NBR_ITES_DECLARATION.en.includes("Software Development"));
  assert.ok(NBR_ITES_DECLARATION.en.includes("Cloud Engineering"));
});

test("NBR_ITES_DECLARATION — Bengali notice includes Income Tax Act 2023, 6th Schedule, and 100% tax-free citations", () => {
  assert.ok(NBR_ITES_DECLARATION.bn.includes("জাতীয় রাজস্ব বোর্ড (এনবিআর)"));
  assert.ok(NBR_ITES_DECLARATION.bn.includes("আয়কর আইন ২০২৩ (বাংলাদেশ)-এর ষষ্ঠ তফসিল (অংশ ক, অনুচ্ছেদ ৩৩)"));
  assert.ok(NBR_ITES_DECLARATION.bn.includes("৫২ ধারা অনুযায়ী"));
  assert.ok(NBR_ITES_DECLARATION.bn.includes("উৎসে কর কর্তন (AIT) থেকে সম্পূর্ণ অব্যাহতিপ্রাপ্ত (১০০% করমুক্ত)"));
  assert.ok(NBR_ITES_DECLARATION.bn.includes("বাংলাদেশ ব্যাংক সার্কুলার নং ০২/২০২২"));
  assert.ok(NBR_ITES_DECLARATION.bn.includes("২.৫% নগদ প্রণোদনা"));
});

// ============================================================================
// 5. Currency Formatting & Sample Presets
// ============================================================================

test("fmtBdt & SAMPLE_CHUKTI_PRESETS — formats currency and validates preset invoice contracts", () => {
  assert.equal(fmtBdt(420000), "৳4,20,000");
  assert.equal(fmtBdt(10500), "৳10,500");
  assert.equal(fmtBdt(1234567), "৳12,34,567");
  assert.equal(fmtBdt(999), "৳999");
  assert.equal(fmtBdt(-1800), "−৳1,800");
  assert.equal(fmtBdt(0), "৳0");

  assert.ok(SAMPLE_CHUKTI_PRESETS.length >= 2);
  const p0 = SAMPLE_CHUKTI_PRESETS[0];
  assert.equal(p0.invoiceNumber, "INV-2025-089");
  assert.equal(p0.paymentRail, "swift");
  assert.equal(p0.includeClause4Shield, true);
  assert.equal(p0.includeNbrExemption, true);
  const p0Fin = calculateInvoiceFinOps(p0.milestones, 120, p0.paymentRail);
  assert.equal(p0Fin.totalUsd, 3500);
  assert.equal(p0Fin.grossBdt, 420000);
  assert.equal(p0Fin.netBdt, 424740);
  assert.equal(p0Fin.netBdt, p0Fin.grossBdt - p0Fin.feeBdt - p0Fin.fxDrainBdt + p0Fin.incentiveGainBdt);
});
