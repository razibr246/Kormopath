import { test } from "node:test";
import assert from "node:assert/strict";
import {
  apportion, closeCycle, cycleEnd, cycleFor, dutyFor, emptyMess, mealsText, parseTaka, sanitizeMess, setGuests, setMeal,
  settle, settlementCheck, settlementText, takaText, type MessState,
} from "../lib/mess.ts";

const base = (): MessState => ({
  ...emptyMess("2026-11-17", 10),
  members: [
    { id: "a", name: "Rakib", active: true },
    { id: "b", name: "Tanvir", active: true },
    { id: "c", name: "Sajid", active: true },
  ],
});

test("cycle runs from the close day to the day before next month's", () => {
  assert.deepEqual(cycleFor("2026-11-17", 10), { start: "2026-11-10", end: "2026-12-09" });
  assert.deepEqual(cycleFor("2026-11-05", 10), { start: "2026-10-10", end: "2026-11-09" });
  assert.deepEqual(cycleFor("2026-01-03", 10), { start: "2025-12-10", end: "2026-01-09" });
  assert.deepEqual(cycleFor("2026-02-14", 1), { start: "2026-02-01", end: "2026-02-28" });
  assert.equal(cycleEnd("2026-12-10", 10), "2027-01-09");
});

test("apportion sums exactly; leftovers go to the largest fractions, ties by order", () => {
  assert.deepEqual(apportion(100, [1, 1, 1]), [34, 33, 33]);
  assert.deepEqual(apportion(1000, [1, 2]), [333, 667]);
  assert.deepEqual(apportion(7, [0, 0]), [4, 3]); // no weights: equal split
  for (let n = 0; n < 200; n++) {
    const w = Array.from({ length: 1 + (n % 7) }, (_, i) => (n * 7 + i * 13) % 9);
    const total = (n * 104729) % 500000;
    assert.equal(apportion(total, w).reduce((a, b) => a + b, 0), total);
  }
});

test("meals are half-units; guest meals are charged to the host", () => {
  let s = base();
  s.meals = setMeal(s.meals, "2026-11-11", "a", 0, 1); // half breakfast
  s.meals = setMeal(s.meals, "2026-11-11", "a", 1, 2);
  s.meals = setGuests(s.meals, "2026-11-11", "a", 2); // one guest meal
  s.meals = setMeal(s.meals, "2026-11-11", "b", 2, 2);
  s.bazar = [{ id: "x1", date: "2026-11-11", by: "b", amountPoisha: 90000, note: "" }];
  const r = settle(s);
  const a = r.lines.find((l) => l.id === "a")!;
  assert.equal(a.mealHalfUnits, 5);
  assert.equal(a.guestHalfUnits, 2);
  assert.equal(mealsText(a.mealHalfUnits, false), "2.5");
  assert.equal(r.totalMealHalfUnits, 7);
  // 900 taka over 3.5 meals: rate per meal ≈ 257.14
  assert.equal(r.mealRatePoisha, Math.round((90000 * 2) / 7));
  assert.equal(r.lines.reduce((x, l) => x + l.mealCostPoisha, 0), 90000);
  // clearing a row removes it
  s.meals = setGuests(setMeal(setMeal(setMeal(s.meals, "2026-11-11", "a", 0, 0), "2026-11-11", "a", 1, 0), "2026-11-11", "a", 2, 0), "2026-11-11", "a", 0);
  assert.equal(s.meals.filter((m) => m.member === "a").length, 0);
});

test("settlement: balances, utilities split equally with remainder in roster order", () => {
  const s = base();
  s.meals = [
    { date: "2026-11-10", member: "a", slots: [2, 2, 2], guests: 0 },
    { date: "2026-11-10", member: "b", slots: [0, 2, 2], guests: 0 },
    { date: "2026-11-10", member: "c", slots: [0, 0, 2], guests: 0 },
  ];
  s.bazar = [{ id: "b1", date: "2026-11-10", by: "a", amountPoisha: 120000, note: "চাল" }];
  s.deposits = [{ id: "d1", date: "2026-11-10", by: "b", amountPoisha: 200000 }, { id: "d2", date: "2026-11-10", by: "c", amountPoisha: 100000 }];
  s.utilities = [{ id: "u1", kind: "wifi", amountPoisha: 100000, paidBy: null, note: "" }, { id: "u2", kind: "bua", amountPoisha: 50000, paidBy: "a", note: "" }];
  const r = settle(s);
  const by = Object.fromEntries(r.lines.map((l) => [l.id, l]));
  assert.deepEqual([by.a.mealCostPoisha, by.b.mealCostPoisha, by.c.mealCostPoisha], [60000, 40000, 20000]);
  assert.deepEqual([by.a.utilityPoisha, by.b.utilityPoisha, by.c.utilityPoisha], [50000, 50000, 50000]);
  assert.equal(by.a.balancePoisha, 120000 + 50000 - 60000 - 50000);
  assert.equal(r.cashOnHandPoisha, 300000 - 100000);
  assert.equal(settlementCheck(r), 0);
  const text = settlementText(r, "bn");
  assert.match(text, /মিল রেট ৳২০০/);
  assert.match(text, /ফেরত পাবেন|দেবেন/);
  assert.match(settlementText(r, "en"), /Rakib: meals 3/);
});

test("invariant: balances reconcile to the poisha in both meal modes, over many random months", () => {
  let seed = 7;
  const rnd = (n: number) => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed % n; };
  for (let k = 0; k < 300; k++) {
    const s = base();
    s.members.push({ id: "d", name: "Off", active: rnd(2) === 0 });
    s.mealMode = rnd(2) ? "fixed" : "calculated";
    s.fixedRatePoisha = 3000 + rnd(9000);
    for (let i = 0; i < 40; i++) {
      const date = `2026-11-${String(10 + rnd(20)).padStart(2, "0")}`;
      const m = s.members[rnd(4)].id;
      s.meals = setMeal(s.meals, date, m, rnd(3) as 0 | 1 | 2, rnd(5));
      if (rnd(5) === 0) s.meals = setGuests(s.meals, date, m, rnd(4));
    }
    for (let i = 0; i < 6; i++) s.bazar.push({ id: `b${i}`, date: "2026-11-15", by: s.members[rnd(4)].id, amountPoisha: 1 + rnd(500000), note: "" });
    for (let i = 0; i < 3; i++) s.deposits.push({ id: `d${i}`, date: "2026-11-12", by: s.members[rnd(4)].id, amountPoisha: 1 + rnd(300000) });
    for (let i = 0; i < 3; i++) s.utilities.push({ id: `u${i}`, kind: "gas", amountPoisha: 1 + rnd(99999), paidBy: rnd(2) ? s.members[rnd(4)].id : null, note: "" });
    const r = settle(s);
    assert.equal(settlementCheck(r), 0, `month ${k}`);
    assert.equal(r.lines.reduce((a, l) => a + l.utilityPoisha, 0), r.utilitiesPoisha); // a, b, c are always active
    if (s.mealMode === "calculated") assert.equal(r.lines.reduce((a, l) => a + l.mealCostPoisha, 0), r.bazarPoisha);
    for (const l of r.lines) assert.ok(Number.isInteger(l.balancePoisha));
  }
});

test("entries outside the cycle are ignored", () => {
  const s = base();
  s.bazar = [{ id: "old", date: "2026-11-09", by: "a", amountPoisha: 50000, note: "" }, { id: "new", date: "2026-12-09", by: "a", amountPoisha: 10000, note: "" }];
  assert.equal(settle(s).bazarPoisha, 10000);
});

test("bazar duty rotates through active members", () => {
  const s = base();
  s.members[1].active = false;
  assert.equal(dutyFor(s, s.cycleStart)?.id, "a");
  assert.equal(dutyFor(s, "2026-11-11")?.id, "c");
  assert.equal(dutyFor(s, "2026-11-12")?.id, "a");
  assert.equal(dutyFor({ ...s, rotaOffset: 1 }, s.cycleStart)?.id, "c");
  assert.equal(dutyFor({ ...s, members: [] }, s.cycleStart), null);
});

test("closing a cycle keeps the sheet and starts the next one empty", () => {
  const s = base();
  s.bazar = [{ id: "b1", date: "2026-11-20", by: "a", amountPoisha: 10000, note: "" }];
  s.utilities = [{ id: "u", kind: "wifi", amountPoisha: 3000, paidBy: null, note: "" }];
  const n = closeCycle(s, "2026-12-09");
  assert.equal(n.cycleStart, "2026-12-10");
  assert.equal(n.bazar.length, 0);
  assert.equal(n.utilities.length, 0);
  assert.equal(n.members.length, 3);
  assert.equal(n.history.length, 1);
  assert.match(n.history[0].sheet, /মেসের মাসিক হিসাব/);
});

test("money parsing and lakh grouping", () => {
  assert.equal(parseTaka("1,450"), 145000);
  assert.equal(parseTaka("১৪৫০.৫০"), 145050);
  assert.equal(parseTaka("৳ 200 টাকা"), 20000);
  assert.equal(parseTaka("0"), null);
  assert.equal(parseTaka("abc"), null);
  assert.equal(takaText(125000000, false), "৳12,50,000");
  assert.equal(takaText(125000050, true), "৳১২,৫০,০০০.৫০");
  assert.equal(takaText(-5000, false), "−৳50");
});

test("sanitizeMess drops bad rows, unknown members and caps sizes", () => {
  assert.equal(sanitizeMess(null), null);
  assert.equal(sanitizeMess({ cycleStart: "2026-02-30" }), null);
  const s = sanitizeMess({
    cycleStart: "2026-11-10", closeDay: 99, mealMode: "weird", fixedRatePoisha: -5,
    members: [{ id: "a", name: " Rakib " }, { id: "a", name: "dup" }, { id: "bad id!", name: "x" }, ...Array.from({ length: 30 }, (_, i) => ({ id: `m${i}`, name: `M${i}` }))],
    meals: [{ date: "2026-11-11", member: "a", slots: [9, 1.4, -1], guests: 99 }, { date: "2026-11-11", member: "ghost", slots: [2, 0, 0] }],
    bazar: [{ id: "b", date: "2026-11-11", by: "a", amountPoisha: 100.5 }, { id: "c", date: "2026-11-11", by: "a", amountPoisha: 500 }],
    utilities: [{ id: "u", kind: "wifi", amountPoisha: 100, paidBy: "ghost" }, { id: "v", kind: "jet", amountPoisha: 1 }],
    rotaOffset: -3,
  })!;
  assert.equal(s.members.length, 20);
  assert.equal(s.members[0].name, "Rakib");
  assert.equal(s.closeDay, 28);
  assert.equal(s.mealMode, "calculated");
  assert.equal(s.fixedRatePoisha, 0);
  assert.deepEqual(s.meals, [{ date: "2026-11-11", member: "a", slots: [4, 1, 0], guests: 20 }]);
  assert.equal(s.bazar.length, 1);
  assert.deepEqual(s.utilities, [{ id: "u", kind: "wifi", amountPoisha: 100, paidBy: null, note: "" }]);
  assert.equal(s.rotaOffset, 997);
});
