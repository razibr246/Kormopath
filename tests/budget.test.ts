import { test } from "node:test";
import assert from "node:assert/strict";
import {
  parseAmount, parseEntry, parseSms, bnToAsciiDigits, summarizeMonth, budgetPace, splitBill,
  toCsv, sanitizeTransactions, migrateLegacy, unusualExpenses, type Transaction,
  calculateMfsCashoutFee, defaultMfsProvider, MFS_FEE_RATES, CATEGORIES,
  CATEGORY_STYLES, sanitizeCsvCell,
  simulate30DayCashFlow, calculateBakiInstallments, type ScheduledFlow,
} from "../lib/budget.ts";

test("Bengali digits convert and the user's example parses to 1200, not 200", () => {
  assert.equal(bnToAsciiDigits("১২০০"), "1200");
  const p = parseEntry("আজকে বাজারে ১২০০ টাকা খরচ করেছি।");
  assert.equal(p.amount, 1200);
  assert.equal(p.type, "expense");
  assert.equal(p.categoryId, "grocery");
  assert.equal(p.confidence, "high");
});

test("Amount phrases: digits, separators, decimals and multipliers", () => {
  assert.equal(parseAmount("1,200.50 টাকা"), 1200.5);
  assert.equal(parseAmount("২ হাজার ৫০০ টাকা"), 2500);
  assert.equal(parseAmount("5k spent"), 5000);
  assert.equal(parseAmount("আজ ৫ তারিখে ৩৫০ টাকা দিলাম"), 350, "prefers the number next to টাকা");
  assert.equal(parseAmount("৳১,২৫,০০০"), 125000);
});

test("Spoken Bangla number words", () => {
  assert.equal(parseAmount("বারোশো টাকা"), 1200);
  assert.equal(parseAmount("দেড় হাজার টাকা"), 1500);
  assert.equal(parseAmount("আড়াই হাজার"), 2500);
  assert.equal(parseAmount("দুই হাজার পাঁচশো টাকা"), 2500);
  assert.equal(parseAmount("সাড়ে তিনশো টাকা"), 350);
  assert.equal(parseAmount("সাড়ে তিন হাজার টাকা"), 3500);
});

test("No amount means null and low confidence: nothing is invented", () => {
  const p = parseEntry("রিকশা ভাড়া দিয়েছি");
  assert.equal(p.amount, null);
  assert.equal(p.confidence, "low");
  assert.ok(p.issues.length > 0);
  assert.equal(p.categoryId, "transport");
});

test("Income detection and payment method", () => {
  const p = parseEntry("ক্লায়েন্টের পেমেন্ট পেলাম ১৫০০০ টাকা বিকাশে");
  assert.equal(p.type, "income");
  assert.equal(p.categoryId, "freelance");
  assert.equal(p.method, "bKash");
  assert.equal(p.amount, 15000);
});

test("SMS parsing separates money in and money out", () => {
  const out = parseSms("bKash Payment Tk 350.00 to Chillox Banani successful. TrxID 9K810A");
  assert.equal(out.amount, 350);
  assert.equal(out.type, "expense");
  assert.equal(out.method, "bKash");
  assert.equal(out.trxId, "9K810A");
  assert.equal(out.categoryId, "food");

  const inc = parseSms("You have received Tk 5,000.00 from 01711000000. TrxID ABC123 bKash");
  assert.equal(inc.type, "income");
  assert.equal(inc.amount, 5000);

  const none = parseSms("Your OTP is 482913");
  assert.equal(none.amount, null, "digits without Tk/BDT are not treated as money");
});

const tx = (o: Partial<Transaction>): Transaction => ({
  id: Math.random().toString(36), type: "expense", amountPoisha: 10000, categoryId: "food", method: "Cash",
  note: "", date: "2026-11-03", source: "text", createdAt: "2026-11-03T10:00:00Z", updatedAt: "2026-11-03T10:00:00Z", history: [], ...o,
});

test("Month summary sums in integer poisha with no float drift", () => {
  const txs = [tx({ amountPoisha: 10 }), tx({ amountPoisha: 20 }), tx({ amountPoisha: 500000, type: "income", categoryId: "salary" }), tx({ date: "2026-10-31", amountPoisha: 99999 })];
  const s = summarizeMonth(txs, "2026-11");
  assert.equal(s.expensePoisha, 30);
  assert.equal(s.incomePoisha, 500000);
  assert.equal(s.netPoisha, 499970);
  assert.equal(s.count, 3);
  assert.equal(s.byCategory[0].pct, 100);
});

test("Budget pace spreads remaining budget over days left and never goes negative", () => {
  const p = budgetPace(1_000_000, 3_000_000, "2026-11-05"); // spent 10,000 of 30,000 by 5 Nov
  assert.equal(p.daysInMonth, 30);
  assert.equal(p.daysLeftIncludingToday, 26);
  assert.equal(p.safePerDayPoisha, Math.floor(2_000_000 / 26));
  assert.equal(p.projectedPoisha, 6_000_000);
  const over = budgetPace(4_000_000, 3_000_000, "2026-11-05");
  assert.equal(over.safePerDayPoisha, 0);
  assert.ok(over.overBudget);
});

test("Bill split shares always add up to the total", () => {
  const parts = splitBill(1000, 3);
  assert.equal(parts.length, 3);
  assert.equal(Math.round(parts.reduce((a, b) => a + b, 0) * 100), 100000);
  assert.deepEqual(parts, [333.34, 333.33, 333.33]);
});

test("CSV export quotes text and neutralises formula injection", () => {
  const csv = toCsv([tx({ note: '=HYPERLINK("x"), "quoted"' })]);
  assert.ok(csv.includes(`"'=HYPERLINK(""x""), ""quoted"""`), csv);
  assert.ok(csv.split("\n")[1].includes("100.00"));
});

test("Stored data is validated; malformed rows are dropped", () => {
  const good = tx({});
  const out = sanitizeTransactions([good, { id: "x", type: "expense", amountPoisha: -5, date: "2026-11-01" }, null, "junk", { ...good, id: "y", amountPoisha: 1.5 }]);
  assert.equal(out.length, 1);
  assert.equal(sanitizeTransactions("not an array").length, 0);
});

test("Legacy v1 data is migrated, not deleted", () => {
  const legacy = [{ id: "e1", category: "Transport", categoryBn: "যাতায়াত", amount: 200, note: "রিকশা", method: "Cash", time: "আজ সকাল" }];
  const m = migrateLegacy(legacy, "2026-11-05");
  assert.equal(m.length, 1);
  assert.equal(m[0].amountPoisha, 20000);
  assert.equal(m[0].categoryId, "transport");
  assert.equal(m[0].source, "migrated");
});

test("Unusual expense flagged only with enough history", () => {
  const base = [tx({ id: "a" }), tx({ id: "b" }), tx({ id: "c" })];
  assert.deepEqual(unusualExpenses([...base, tx({ id: "big", amountPoisha: 50000 })]), ["big"]);
  assert.deepEqual(unusualExpenses([tx({ id: "a" }), tx({ id: "big", amountPoisha: 50000 })]), []);
});

test("MFS Cash-Out Fee: computes exact integer poisha for all major providers", () => {
  // ৳1,000 withdrawal (100,000 poisha)
  const bkashApp = calculateMfsCashoutFee(1000, "bkash_app");
  assert.equal(bkashApp.feePoisha, 1490, "bKash App 1.49% is exactly 1490 poisha (৳14.90)");
  assert.equal(bkashApp.totalWithFeePoisha, 101490);

  const bkashUssd = calculateMfsCashoutFee(1000, "bkash_ussd");
  assert.equal(bkashUssd.feePoisha, 1850, "bKash USSD 1.85% is exactly 1850 poisha (৳18.50)");
  assert.equal(bkashUssd.totalWithFeePoisha, 101850);

  const nagadApp = calculateMfsCashoutFee(1000, "nagad_app");
  assert.equal(nagadApp.feePoisha, 1250, "Nagad App 1.25% is exactly 1250 poisha (৳12.50)");
  assert.equal(nagadApp.totalWithFeePoisha, 101250);

  const rocketApp = calculateMfsCashoutFee(1000, "rocket_app");
  assert.equal(rocketApp.feePoisha, 1670, "Rocket App 1.67% is exactly 1670 poisha (৳16.70)");
  assert.equal(rocketApp.totalWithFeePoisha, 101670);

  const rocketAtm = calculateMfsCashoutFee(1000, "rocket_atm");
  assert.equal(rocketAtm.feePoisha, 900, "Rocket ATM 0.90% is exactly 900 poisha (৳9.00)");
  assert.equal(rocketAtm.totalWithFeePoisha, 100900);
});

test("MFS Cash-Out Fee: ceil invariant guarantees no lost fractional poisha", () => {
  // ৳333 at 1.49%: 33300 * 0.0149 = 496.17 poisha -> Math.ceil gives 497 poisha (৳4.97)
  const fee = calculateMfsCashoutFee(333, "bkash_app");
  assert.equal(fee.feePoisha, 497);
  assert.equal(fee.totalWithFeePoisha, 33300 + 497);

  // Zero amount gives zero fee without error
  const zero = calculateMfsCashoutFee(0, "bkash_app");
  assert.equal(zero.feePoisha, 0);
  assert.equal(zero.totalWithFeePoisha, 0);

  // Negative amount clamped cleanly to zero
  const neg = calculateMfsCashoutFee(-500, "bkash_app");
  assert.equal(neg.feePoisha, 0);
});

test("MFS Provider Resolution: maps methods to canonical default providers", () => {
  assert.equal(defaultMfsProvider("bKash"), "bkash_app");
  assert.equal(defaultMfsProvider("Nagad"), "nagad_app");
  assert.equal(defaultMfsProvider("Rocket"), "rocket_app");
  assert.equal(defaultMfsProvider("Cash"), null);
  assert.equal(defaultMfsProvider("Bank"), null);
});

test("CSV Sanitization: neutralizes leading whitespace injection and pipe syntax", () => {
  // Leading whitespace before formula
  assert.equal(sanitizeCsvCell("   =1+1"), "'   =1+1");
  assert.equal(sanitizeCsvCell("\t@SUM(A1:A5)"), "'\t@SUM(A1:A5)");
  assert.equal(sanitizeCsvCell("  |cmd.exe"), "'  |cmd.exe");

  // Normal numbers and plain text untouched
  assert.equal(sanitizeCsvCell("1250.00"), "1250.00");
  assert.equal(sanitizeCsvCell("-50.25"), "-50.25");
  assert.equal(sanitizeCsvCell("বাজার খরচ"), "বাজার খরচ");

  // UTF-8 BOM is present at file start
  const csv = toCsv([]);
  assert.ok(csv.startsWith("\uFEFF"), "CSV must start with UTF-8 BOM for Excel rendering");
});

test("Category Styles: every declared category has a valid hex color and Tailwind classes", () => {
  for (const cat of CATEGORIES) {
    const style = CATEGORY_STYLES[cat.id];
    assert.ok(style, `Missing style for category ${cat.id}`);
    assert.ok(/^#[0-9a-f]{6}$/i.test(style.hex), `Invalid hex color for ${cat.id}`);
    assert.ok(style.twBg.startsWith("bg-"));
    assert.ok(style.twText.startsWith("text-"));
  }
});

test("CSV blocks formulas after whitespace and full-width formula prefixes", () => {
  for (const note of ["  =1+1", "\n@SUM(1)", "＋1+1", "\tformula", "\r=1"]) {
    const csv = toCsv([tx({ note })]);
    assert.ok(csv.includes("'" + note), `unsafe note: ${JSON.stringify(note)}`);
  }
  assert.ok(toCsv([tx({ note: "plain\rtext" })]).includes('"plain\rtext"'));
});

// ============================================================================
// 30-Day Cash Deficit & Baki Installment Simulator (LaMP Resilience Track)
// ============================================================================

test("simulate30DayCashFlow — identifies exact deficit day, lowest balance, and health level", () => {
  // Starting balance: ৳10,000 (1,000,000 poisha)
  const initial = 10_000_00;
  const flows: ScheduledFlow[] = [
    { id: "f1", dayOfMonth: 5, label: "Wholesale Supplier Batch 1", type: "expense", poisha: 4_000_00 },
    { id: "f2", dayOfMonth: 10, label: "Shop Rent & Distributor Invoice", type: "expense", poisha: 8_000_00 },
    { id: "f3", dayOfMonth: 15, label: "Expected Customer Receivables / Salary", type: "income", poisha: 15_000_00 },
    { id: "f4", dayOfMonth: 22, label: "Utility & Electricity Bill", type: "expense", poisha: 2_500_00 },
  ];

  const sim = simulate30DayCashFlow(initial, flows);
  assert.equal(sim.days.length, 30);
  assert.equal(sim.initialBalancePoisha, 10_000_00);
  // Day 1 to 4: 10,000
  assert.equal(sim.days[3].closingBalancePoisha, 10_000_00);
  // Day 5: 10,000 - 4,000 = 6,000
  assert.equal(sim.days[4].closingBalancePoisha, 6_000_00);
  // Day 10: 6,000 - 8,000 = -2,000 (Deficit!)
  assert.equal(sim.days[9].closingBalancePoisha, -2_000_00);
  assert.equal(sim.deficitDay, 10, "Deficit must be detected on Day 10");
  assert.equal(sim.lowestBalanceDay, 10);
  assert.equal(sim.lowestBalancePoisha, -2_000_00);
  assert.equal(sim.healthLevel, "critical");

  // Day 15: -2,000 + 15,000 = +13,000
  assert.equal(sim.days[14].closingBalancePoisha, 13_000_00);
  // Day 22: 13,000 - 2,500 = 10,500
  assert.equal(sim.days[21].closingBalancePoisha, 10_500_00);
  // Final closing balance on Day 30: 10,500
  assert.equal(sim.days[29].closingBalancePoisha, 10_500_00);

  // Invariant: netSurplus === totalIncome - totalExpense
  assert.equal(sim.totalExpectedIncomePoisha, 15_000_00);
  assert.equal(sim.totalScheduledExpensePoisha, 14_500_00);
  assert.equal(sim.netSurplusPoisha, 500_00);
});

test("simulate30DayCashFlow — healthy solvent simulation returns null deficitDay and solvent level", () => {
  const initial = 50_000_00; // ৳50,000
  const flows: ScheduledFlow[] = [
    { id: "f1", dayOfMonth: 3, label: "Groceries", type: "expense", poisha: 5_000_00 },
    { id: "f2", dayOfMonth: 12, label: "Freelance Milestone", type: "income", poisha: 20_000_00 },
  ];
  const sim = simulate30DayCashFlow(initial, flows);
  assert.equal(sim.deficitDay, null);
  assert.equal(sim.healthLevel, "solvent");
  assert.equal(sim.lowestBalancePoisha, 45_000_00);
  assert.equal(sim.lowestBalanceDay, 3);
});

test("calculateBakiInstallments — distributes debt across weeks with exact poisha sum invariant", () => {
  const plan = calculateBakiInstallments(10000, 4, "2026-11-20", "করিম সাহেব", "হাসান ব্রাদার্স ফার্মেসি");
  assert.equal(plan.totalDebtPoisha, 1_000_000);
  assert.equal(plan.weeks, 4);
  assert.equal(plan.weeklyInstallmentPoisha, 250_000);
  assert.equal(plan.finalInstallmentPoisha, 250_000);
  assert.equal(plan.schedule.length, 4);
  const sumPoisha = plan.schedule.reduce((acc, s) => acc + s.amountPoisha, 0);
  assert.equal(sumPoisha, plan.totalDebtPoisha);
  assert.ok(plan.smsReminderTemplateBn.includes("করিম সাহেব"));
  assert.ok(plan.smsReminderTemplateBn.includes("৳2,500"));
});

test("calculateBakiInstallments — handles uneven amounts with remainder cents on final week", () => {
  // ৳100.03 over 4 weeks = 10003 poisha / 4 = 2500 poisha, remainder 3 poisha
  const plan = calculateBakiInstallments(100.03, 4, "2026-11-20", "Jamal", "Bhai Bhai Store");
  assert.equal(plan.totalDebtPoisha, 10003);
  assert.equal(plan.weeklyInstallmentPoisha, 2500);
  assert.equal(plan.finalInstallmentPoisha, 2503);
  const sumPoisha = plan.schedule.reduce((acc, s) => acc + s.amountPoisha, 0);
  assert.equal(sumPoisha, 10003);
});
