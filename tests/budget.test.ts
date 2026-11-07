import { test } from "node:test";
import assert from "node:assert/strict";
import {
  parseAmount, parseEntry, parseSms, bnToAsciiDigits, summarizeMonth, compareMonthlySpending, budgetPace, splitBill,
  toCsv, sanitizeTransactions, migrateLegacy, unusualExpenses, type Transaction,
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

test("Spending comparison uses the same cutoff, excludes samples, and rolls over January", () => {
  const rows = [
    tx({ date: "2026-01-04", amountPoisha: 30500 }),
    tx({ date: "2026-01-12", amountPoisha: 99900 }),
    tx({ date: "2025-12-05", amountPoisha: 12500 }),
    tx({ date: "2025-12-09", amountPoisha: 50000 }),
    tx({ id: "ex-1", date: "2026-01-04", amountPoisha: 20000 }),
    tx({ date: "2025-12-04", categoryId: "grocery", amountPoisha: 1800 }),
  ];
  const r = compareMonthlySpending(rows, "2026-01", "2026-01-05");
  assert.equal(r.previous.month, "2025-12");
  assert.equal(r.cutoffDay, 5);
  assert.equal(r.differencePoisha, 16200);
  assert.deepEqual(r.changes.map((c) => [c.id, c.differencePoisha]), [["food", 18000], ["grocery", -1800]]);
  const historical = compareMonthlySpending(rows, "2026-01", "2026-02-01");
  assert.equal(historical.cutoffDay, null);
  assert.equal(historical.current.expensePoisha, 130400);
  assert.equal(historical.previous.expensePoisha, 64300);
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
