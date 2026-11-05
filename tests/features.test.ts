// Tests for competitor-inspired features: category budgets & savings goals (Shohoj),
// liquid doses & reminders (MediScan), application tracker (AdmitBuddy), STAR & streak (Probaho).
import { test } from "node:test";
import assert from "node:assert/strict";
import { categoryBudgetStatus, goalProgress, sanitizeGoals, sanitizeCategoryBudgets, summarizeMonth, type Transaction, type SavingsGoal } from "../lib/budget.ts";
import { parsePrescriptionText, readMeasure, readTimesPerDay, buildSchedule, scheduleToIcs, courseDays } from "../lib/prescription.ts";
import { applicationPipeline, sanitizeStatuses, UNIVERSITIES } from "../lib/admitbuddy.ts";
import { starCheck, practiceStreak, QUESTIONS, type SessionRecord } from "../lib/speech.ts";

const tx = (id: string, categoryId: Transaction["categoryId"], taka: number, date = "2026-11-03"): Transaction => ({
  id, type: "expense", amountPoisha: taka * 100, categoryId, method: "Cash", note: "", date, source: "manual", createdAt: "", updatedAt: "", history: [],
});

test("Category budgets: ok / near / over, unbudgeted categories ignored", () => {
  const s = summarizeMonth([tx("a", "food", 4500), tx("b", "transport", 900), tx("c", "food", 1000), tx("d", "health", 300)], "2026-11");
  const st = categoryBudgetStatus(s, { food: 500000, transport: 100000 });
  assert.deepEqual(st.map((x) => [x.id, x.level]), [["food", "over"], ["transport", "near"]]);
  assert.equal(st[0].remainingPoisha, -50000);
  assert.equal(st[1].usedPct, 90);
});

test("Category budget sanitiser drops unknown ids, floats and negatives", () => {
  assert.deepEqual(sanitizeCategoryBudgets({ food: 100000, nope: 5, transport: -1, health: 1.5 }), { food: 100000 });
  assert.equal(sanitizeCategoryBudgets([1, 2]), null);
});

test("Savings goal: progress, per-month need is plain arithmetic, past dates give no plan", () => {
  const g: SavingsGoal = { id: "g", name: "Laptop", targetPoisha: 6000000, targetDate: "2027-02-03", createdAt: "", contributions: [{ id: "1", date: "2026-11-01", poisha: 1500000 }, { id: "2", date: "2026-11-02", poisha: -500000 }] };
  const p = goalProgress(g, "2026-11-05");
  assert.equal(p.savedPoisha, 1000000);
  assert.equal(p.remainingPoisha, 5000000);
  assert.equal(p.daysLeft, 90);
  assert.equal(p.perMonthNeededPoisha, Math.ceil(5000000 / 3));
  const past = goalProgress({ ...g, targetDate: "2026-10-01" }, "2026-11-05");
  assert.ok(past.daysLeft! < 0);
  assert.equal(past.perMonthNeededPoisha, null);
  const done = goalProgress({ ...g, contributions: [{ id: "1", date: "2026-11-01", poisha: 7000000 }] }, "2026-11-05");
  assert.equal(done.reached, true);
  assert.equal(done.pct, 100);
  assert.equal(done.remainingPoisha, 0);
});

test("Goal sanitiser rejects corrupt goals and contributions", () => {
  const out = sanitizeGoals([{ id: "a", name: "Eid", targetPoisha: 100000, targetDate: "bad", contributions: [{ id: "x", date: "2026-11-01", poisha: 50 }, { id: "y", date: "x", poisha: 1 }, { id: "z", date: "2026-11-01", poisha: 0.5 }] }, { id: "b", name: "", targetPoisha: 5 }, null]);
  assert.equal(out!.length, 1);
  assert.equal(out![0].targetDate, null);
  assert.equal(out![0].contributions.length, 1);
});

test("Liquid doses are read as written; a strength like 125mg/5ml is not a dose", () => {
  assert.deepEqual(readMeasure("Syp. Napa 120mg/5ml 2 tsp tds x 5 days"), { amount: 2, unit: "tsp", readingBn: "২ চা-চামচ" });
  assert.equal(readMeasure("Syp. Napa 120mg/5ml"), null);
  assert.equal(readMeasure("Syp. Fexo 5 ml bd")!.unit, "ml");
  assert.equal(readMeasure("সিরাপ ১ চামচ দিনে ৩ বার")!.amount, 1);
  assert.equal(readMeasure("Syp 500 ml"), null, "implausible amounts are not read");
});

test("Frequency abbreviations and Bangla 'দিনে ৩ বার'", () => {
  assert.equal(readTimesPerDay("Tab Fexo 120mg od"), 1);
  assert.equal(readTimesPerDay("1 tab bd after food"), 2);
  assert.equal(readTimesPerDay("2 tsp tds"), 3);
  assert.equal(readTimesPerDay("5 ml qid"), 4);
  assert.equal(readTimesPerDay("twice daily"), 2);
  assert.equal(readTimesPerDay("দিনে ৩ বার"), 3);
  assert.equal(readTimesPerDay("food and odour"), null, "no matches inside words");
});

test("Prescription: syrup line is no longer reported as 'dose missing'; spoon warning shown", () => {
  const p = parsePrescriptionText("Syp. Napa 120mg/5ml 2 tsp tds x 5 days p.c.");
  const l = p.lines[0];
  assert.equal(l.timesPerDay, 3);
  assert.equal(l.measure!.unit, "tsp");
  assert.ok(!l.missing.some((m) => m.includes("১+০+১")));
  assert.ok(l.missing.some((m) => m.includes("মাপের কাপ")));
});

test("Schedule uses only X+X+X doses; bd/tds lines are left for the pharmacist", () => {
  const p = parsePrescriptionText("Tab. Napa 500mg 1+0+1 x 5 days p.c.\nCap. Seclo 20mg 1+0+0 x 2 weeks a.c.\nSyp. Fexo 5 ml bd");
  const { entries, unscheduled } = buildSchedule(p);
  assert.deepEqual(entries.map((e) => e.slot), ["morning", "night", "morning"]);
  assert.equal(entries[2].days, 14);
  assert.deepEqual(unscheduled, [2]);
  assert.equal(entries[0].label, "Tab Napa 500mg", "name keeps the prescription's spelling");
  const combo = buildSchedule(parsePrescriptionText("Tab. Napa Extra 500mg+65mg 1+0+1 x 3 days")).entries[0];
  assert.match(combo.label, /Napa Extra/);
  assert.equal(courseDays("চলবে (ডাক্তার বন্ধ করতে না বলা পর্যন্ত)"), null);
});

test("Reminder .ics repeats for the course length at the chosen time", () => {
  const p = parsePrescriptionText("Tab. Napa 500mg 1+0+1 x 5 days p.c.\nCap. Seclo 20mg 1+0+0 cont.");
  const ics = scheduleToIcs(buildSchedule(p).entries, { morning: "07:30", noon: "13:00", night: "bad" }, "2026-11-05", { openEndedDays: 30 });
  assert.match(ics, /DTSTART:20261105T073000/);
  assert.match(ics, /DTSTART:20261105T080000/, "invalid time falls back to 08:00");
  assert.equal((ics.match(/RRULE:FREQ=DAILY;COUNT=5/g) ?? []).length, 2);
  assert.match(ics, /COUNT=30/);
  assert.equal((ics.match(/BEGIN:VEVENT/g) ?? []).length, 3);
  assert.ok(ics.split("\r\n").length > 10);
});

test("Application pipeline: defaults to planning, counts stages, sanitiser drops unknowns", () => {
  const [a, b, c] = UNIVERSITIES;
  const st = sanitizeStatuses([
    { universityId: a.id, stage: "applied", updatedAt: "2026-11-01", note: "roll 123" },
    { universityId: b.id, stage: "admitted", updatedAt: "x", note: 5 },
    { universityId: "fake", stage: "applied" },
    { universityId: c.id, stage: "hacked" },
  ])!;
  assert.equal(st.length, 2);
  assert.equal(st[1].updatedAt, "");
  const p = applicationPipeline([a.id, b.id, c.id, "missing"], st);
  assert.equal(p.rows.length, 3);
  assert.equal(p.counts.planning, 1);
  assert.equal(p.counts.applied, 1);
  assert.equal(p.finished, 1);
  assert.equal(p.active, 2);
});

test("STAR check finds the parts of a story and names the missing ones", () => {
  const full = QUESTIONS.find((q) => q.id === "hr-conflict")!.modelAnswer;
  assert.deepEqual(starCheck(full).missing, []);
  const weak = starCheck("I think teamwork is important and I always try my best.");
  assert.deepEqual(weak.missing, ["situation", "task", "action", "result"]);
  assert.equal(starCheck("It happened within my team.").situation, false, "no match inside words");
});

test("Practice streak counts consecutive days and survives until the end of today", () => {
  const r = (date: string): SessionRecord => ({ id: date, questionId: "x", date: date + "T10:00:00.000Z", total: 1, content: 1, structure: 0, delivery: 0, wordCount: 1, wpm: null, fillerPer100: 0 });
  const recs = ["2026-10-01", "2026-10-02", "2026-10-03", "2026-11-03", "2026-11-04", "2026-11-04"].map(r);
  assert.deepEqual(practiceStreak(recs, "2026-11-05"), { current: 2, best: 3 });
  assert.deepEqual(practiceStreak(recs, "2026-11-07"), { current: 0, best: 3 });
  assert.deepEqual(practiceStreak([], "2026-11-05"), { current: 0, best: 0 });
});
