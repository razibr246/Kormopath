import { test } from "node:test";
import assert from "node:assert/strict";
import {
  planPockets, markDuePaid, unmarkDuePaid, paymentHistory, paymentRecordCsv, dueDateInMonth, shiftMonth,
  isPaidOnTime, daysLate, sanitizeDues, sanitizeDuePayments, PAYMENT_RECORD_LABEL_EN,
  type FixedDue, type DuePayment,
} from "../lib/budget.ts";

const due = (id: string, name: string, taka: number, dueDay: number, kind: FixedDue["kind"] = "other"): FixedDue =>
  ({ id, kind, name, amountPoisha: Math.round(taka * 100), dueDay, createdAt: "" });

const DUES: FixedDue[] = [
  due("rent", "Rent", 12000, 5, "rent"),
  due("elec", "Electricity", 1333.33, 10, "electricity"),
  due("gas", "Gas", 1080, 15, "gas"),
  due("school", "School fee", 2500.01, 20, "school"),
  due("loan", "Loan instalment", 3333.37, 25, "loan"),
];
const total = DUES.reduce((a, d) => a + d.amountPoisha, 0);

test("allocations are integer poisha and add up exactly: paid + set aside + left === income", () => {
  for (const incomeTaka of [0, 0.01, 999.99, 12000, 13333.32, 13333.33, 20246.71, 20246.72, 50000.07]) {
    const income = Math.round(incomeTaka * 100);
    const plan = planPockets(DUES, income, "2026-11", [], "2026-11-01");
    for (const l of plan.lines) {
      assert.ok(Number.isInteger(l.setAsidePoisha) && l.setAsidePoisha >= 0);
      assert.equal(l.setAsidePoisha + l.shortfallPoisha, l.amountPoisha);
    }
    assert.equal(plan.lines.reduce((a, l) => a + l.setAsidePoisha, 0), plan.setAsidePoisha);
    assert.equal(plan.paidPoisha + plan.setAsidePoisha + plan.leftToSpendPoisha, income);
    assert.equal(plan.setAsidePoisha + plan.shortfallPoisha, total);
    assert.ok(plan.leftToSpendPoisha >= 0);
  }
});

test("earliest due is covered first; dues income cannot cover are flagged", () => {
  const plan = planPockets(DUES, Math.round(14000 * 100), "2026-11", [], "2026-11-01");
  assert.deepEqual(plan.lines.map((l) => l.dueId), ["rent", "elec", "gas", "school", "loan"]);
  assert.equal(plan.lines[0].status, "covered");
  assert.equal(plan.lines[1].status, "covered");
  assert.equal(plan.lines[2].status, "partial");
  assert.equal(plan.lines[2].setAsidePoisha, 1400000 - 1200000 - 133333);
  assert.equal(plan.lines[3].status, "uncovered");
  assert.deepEqual(plan.uncoveredIds, ["gas", "school", "loan"]);
  assert.equal(plan.leftToSpendPoisha, 0);
  assert.equal(plan.shortfallPoisha, total - 1400000);

  const rich = planPockets(DUES, total + 500, "2026-11", [], "2026-11-01");
  assert.deepEqual(rich.uncoveredIds, []);
  assert.equal(rich.leftToSpendPoisha, 500);
});

test("no income means every due is uncovered, nothing is invented", () => {
  const plan = planPockets(DUES, 0, "2026-11", [], "2026-11-01");
  assert.equal(plan.setAsidePoisha, 0);
  assert.equal(plan.uncoveredIds.length, DUES.length);
  assert.equal(planPockets(DUES, -5, "2026-11", [], "2026-11-01").incomePoisha, 0);
  assert.equal(planPockets(DUES, 10.5, "2026-11", [], "2026-11-01").incomePoisha, 0);
});

test("paid dues come out of income first and stop needing a pocket", () => {
  let pays: DuePayment[] = [];
  pays = markDuePaid(pays, DUES[0], "2026-11", "2026-11-04", "2026-11-04T10:00:00Z");
  const income = Math.round(15000 * 100);
  const plan = planPockets(DUES, income, "2026-11", pays, "2026-11-06");
  const rent = plan.lines.find((l) => l.dueId === "rent")!;
  assert.equal(rent.status, "paid");
  assert.equal(rent.setAsidePoisha, 0);
  assert.equal(rent.paidOnTime, true);
  assert.equal(plan.paidPoisha, 1200000);
  assert.equal(plan.paidPoisha + plan.setAsidePoisha + plan.leftToSpendPoisha, income);
  // A second mark for the same due and month replaces, it does not double-count.
  pays = markDuePaid(pays, DUES[0], "2026-11", "2026-11-05", "2026-11-05T10:00:00Z", 1100000);
  assert.equal(pays.length, 1);
  assert.equal(planPockets(DUES, income, "2026-11", pays, "2026-11-06").paidPoisha, 1100000);
  assert.equal(unmarkDuePaid(pays, "rent", "2026-11").length, 0);
  assert.throws(() => markDuePaid(pays, DUES[0], "2026-11", "not-a-date", ""));
  assert.throws(() => markDuePaid(pays, DUES[0], "2026-11", "2026-11-05", "", 0));
});

test("overdue unpaid dues are flagged with negative days left", () => {
  const plan = planPockets(DUES, total, "2026-11", [], "2026-11-12");
  const rent = plan.lines.find((l) => l.dueId === "rent")!;
  assert.equal(rent.overdue, true);
  assert.equal(rent.daysLeft, -7);
  assert.equal(plan.lines.find((l) => l.dueId === "gas")!.overdue, false);
});

test("month rollover: due day clamps to month end and last month's payment does not count", () => {
  assert.equal(dueDateInMonth(31, "2026-02"), "2026-02-28");
  assert.equal(dueDateInMonth(31, "2028-02"), "2028-02-29");
  assert.equal(dueDateInMonth(31, "2026-04"), "2026-04-30");
  assert.equal(dueDateInMonth(31, "2026-05"), "2026-05-31");
  assert.equal(shiftMonth("2026-12", 1), "2027-01");
  assert.equal(shiftMonth("2027-01", -1), "2026-12");
  assert.equal(shiftMonth("2026-11", -13), "2025-10");

  const endOfMonth = [due("rent", "Rent", 8000, 31, "rent")];
  const pays = markDuePaid([], endOfMonth[0], "2026-01", "2026-01-30", "");
  assert.equal(pays[0].dueDate, "2026-01-31");
  assert.equal(planPockets(endOfMonth, 800000, "2026-01", pays, "2026-01-31").lines[0].status, "paid");
  const feb = planPockets(endOfMonth, 800000, "2026-02", pays, "2026-02-01");
  assert.equal(feb.lines[0].status, "covered");
  assert.equal(feb.lines[0].dueDate, "2026-02-28");
  assert.equal(feb.paidPoisha, 0);
});

test("paid-on-time logic: on or before the due date is on time, later counts days late", () => {
  assert.equal(isPaidOnTime({ paidOn: "2026-11-05", dueDate: "2026-11-05" }), true);
  assert.equal(isPaidOnTime({ paidOn: "2026-11-01", dueDate: "2026-11-05" }), true);
  assert.equal(isPaidOnTime({ paidOn: "2026-11-06", dueDate: "2026-11-05" }), false);
  assert.equal(daysLate({ paidOn: "2026-12-02", dueDate: "2026-11-30" }), 2);
  assert.equal(daysLate({ paidOn: "2026-11-01", dueDate: "2026-11-30" }), 0);

  let pays: DuePayment[] = [];
  pays = markDuePaid(pays, DUES[0], "2026-10", "2026-10-05", "");
  pays = markDuePaid(pays, DUES[1], "2026-10", "2026-10-12", "");
  pays = markDuePaid(pays, DUES[0], "2026-11", "2026-11-03", "");
  const h = paymentHistory(pays);
  assert.deepEqual(h.map((m) => m.month), ["2026-11", "2026-10"]);
  assert.equal(h[1].onTime, 1);
  assert.equal(h[1].late, 1);
  assert.equal(h[1].totalPoisha, 1200000 + 133333);
});

test("payment record CSV is labelled self-recorded and never claims verification", () => {
  let pays: DuePayment[] = [];
  pays = markDuePaid(pays, DUES[0], "2026-10", "2026-10-07", "");
  pays = markDuePaid(pays, { ...DUES[1], name: "=HYPERLINK(\"x\")" }, "2026-10", "2026-10-09", "");
  const csv = paymentRecordCsv(pays, "2026-11-17", "Karim");
  const lines = csv.trim().split("\n");
  assert.ok(lines[0].includes("SELF-RECORDED"));
  assert.ok(lines[0].includes("NOT verified"));
  assert.ok(csv.includes(PAYMENT_RECORD_LABEL_EN.slice(0, 20)));
  assert.ok(lines.some((l) => l.startsWith("2026-10,Rent,2026-10-05,2026-10-07,12000.00,no,2,no (self-recorded)")));
  assert.ok(csv.includes("'=HYPERLINK"), "formula cells are neutralised");
  assert.ok(!csv.startsWith("﻿"));
  assert.match(csv, /2 payments recorded; 1 on or before the due date; 1 late/);
});

test("sanitizers drop malformed stored data", () => {
  assert.equal(sanitizeDues("x"), null);
  const dues = sanitizeDues([DUES[0], { ...DUES[1], amountPoisha: 1.5 }, { ...DUES[2], dueDay: 32 }, { ...DUES[3], kind: "nope" }, null]);
  assert.equal(dues!.length, 2);
  assert.equal(dues![1].kind, "other");
  const p = markDuePaid([], DUES[0], "2026-11", "2026-11-04", "");
  const clean = sanitizeDuePayments([...p, ...p, { ...p[0], dueId: "x", dueDate: "2026-12-05" }, { ...p[0], dueId: "y", month: "2026-13" }]);
  assert.equal(clean!.length, 1);
});
