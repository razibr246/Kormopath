import { test } from "node:test";
import assert from "node:assert/strict";
import {
  computeAdherence, calendarStrip, toggleDose, doseKey, addDays, daysBetween, dateRange, todayInDhaka,
  isValidDate, sanitizeSchedule, sanitizeLog, validateMedicine, adherenceToIcs, removeMedicineLog,
  PDC_THRESHOLD, type AdherenceMedicine,
} from "../lib/adherence.ts";

const med = (over: Partial<AdherenceMedicine> = {}): AdherenceMedicine => ({
  id: "m1",
  name: "Tab. Napa 500mg",
  amountNote: "১টি",
  times: ["08:00"],
  startDate: "2026-10-01",
  endDate: null,
  ...over,
});

/** Log every dose of `m` on each date in [from, to]. */
const logAll = (m: AdherenceMedicine, from: string, to: string) =>
  dateRange(from, to).flatMap((d) => m.times.map((_, i) => doseKey(m.id, d, i)));

test("Calendar-day helpers are timezone-independent and handle month/leap edges", () => {
  assert.equal(addDays("2026-02-28", 1), "2026-03-01");
  assert.equal(addDays("2028-02-28", 1), "2028-02-29", "2028 is a leap year");
  assert.equal(addDays("2026-12-31", 1), "2027-01-01");
  assert.equal(daysBetween("2026-10-01", "2026-10-31"), 30);
  assert.equal(dateRange("2026-10-30", "2026-11-02").length, 4);
  assert.equal(isValidDate("2026-02-30"), false);
  assert.equal(isValidDate("2026-2-3"), false);
  // 18:30 UTC is already the next day in Dhaka (UTC+6).
  assert.equal(todayInDhaka(new Date("2026-11-16T18:30:00Z")), "2026-11-17");
  assert.equal(todayInDhaka(new Date("2026-11-16T17:59:00Z")), "2026-11-16");
});

test("PDC: 24 of 30 completed days covered = 80%, at the threshold so no flag", () => {
  const m = med({ startDate: "2026-09-01" });
  const today = "2026-11-17";
  // Window = 30 completed days: 2026-10-18 .. 2026-11-16. Skip 6 of them.
  const skip = new Set(["2026-10-20", "2026-10-25", "2026-11-01", "2026-11-05", "2026-11-10", "2026-11-12"]);
  const log = logAll(m, "2026-10-18", "2026-11-16").filter((k) => !skip.has(k.split("|")[1]));
  const r = computeAdherence([m], log, today).medicines[0];
  assert.equal(r.windowStart, "2026-10-18");
  assert.equal(r.windowEnd, "2026-11-16");
  assert.equal(r.daysInWindow, 30);
  assert.equal(r.daysCovered, 24);
  assert.equal(r.pdc, 0.8);
  assert.equal(r.missedDoses, 6);
  assert.equal(r.flag, false, "80% is adherent under the PQA/CMS threshold");
  assert.equal(r.currentStreak, 4, "11-13 .. 11-16 covered; 11-12 missed");
});

test("Threshold flag: below 80% shows the neutral prompt", () => {
  const m = med({ startDate: "2026-09-01" });
  const log = logAll(m, "2026-10-18", "2026-11-16").slice(0, 23); // 23 of 30
  const r = computeAdherence([m], log, "2026-11-17");
  assert.equal(PDC_THRESHOLD, 0.8);
  assert.ok(r.medicines[0].pdc! < 0.8);
  assert.equal(r.medicines[0].flag, true);
  assert.equal(r.overall.flag, true);
});

test("Window start is clipped to the medicine's start date", () => {
  const m = med({ startDate: "2026-11-10" });
  const log = logAll(m, "2026-11-10", "2026-11-16");
  const r = computeAdherence([m], log, "2026-11-17").medicines[0];
  assert.equal(r.windowStart, "2026-11-10", "never counts days before the start date");
  assert.equal(r.daysInWindow, 7);
  assert.equal(r.pdc, 1);
  // Doses logged before the start date are ignored, not counted.
  const early = computeAdherence([m], [...log, doseKey("m1", "2026-11-01", 0)], "2026-11-17").medicines[0];
  assert.equal(early.daysCovered, 7);
  assert.equal(early.daysInWindow, 7);
});

test("Window end is clipped to the end date; a course that ended long ago has nothing to measure", () => {
  const m = med({ startDate: "2026-11-01", endDate: "2026-11-05" });
  const r = computeAdherence([m], logAll(m, "2026-11-01", "2026-11-03"), "2026-11-17").medicines[0];
  assert.equal(r.windowEnd, "2026-11-05");
  assert.equal(r.daysInWindow, 5);
  assert.equal(r.daysCovered, 3);
  assert.equal(r.todayScheduled, 0, "not scheduled after the end date");
  const old = computeAdherence([med({ startDate: "2026-01-01", endDate: "2026-01-05" })], [], "2026-11-17").medicines[0];
  assert.equal(old.pdc, null);
  assert.equal(old.flag, false, "no data is never a low score");
});

test("Multi-dose days: a day counts as covered only if all scheduled doses were logged", () => {
  const m = med({ times: ["08:00", "21:00"], startDate: "2026-11-14" });
  const today = "2026-11-17";
  const log = [
    doseKey("m1", "2026-11-14", 0), doseKey("m1", "2026-11-14", 1), // full
    doseKey("m1", "2026-11-15", 0), // partial: 1 of 2
    // 2026-11-16 nothing
  ];
  const r = computeAdherence([m], log, today).medicines[0];
  assert.equal(r.daysInWindow, 3);
  assert.equal(r.daysCovered, 1, "partial day is not covered");
  assert.equal(r.missedDoses, 3, "1 on the partial day + 2 on the empty day");
  const strip = calendarStrip([m], log, today, 5);
  assert.deepEqual(strip.map((c) => c.status), ["not-scheduled", "covered", "partial", "missed", "today"]);
  assert.deepEqual([strip[2].taken, strip[2].scheduled], [1, 2]);
});

test("Future days and today-in-progress are not counted; future logs are ignored", () => {
  const m = med({ startDate: "2026-11-17" });
  const future = [doseKey("m1", "2026-11-18", 0), doseKey("m1", "2026-11-19", 0)];
  const r = computeAdherence([m], future, "2026-11-17");
  assert.equal(r.medicines[0].daysInWindow, 0, "start date today: no completed day yet");
  assert.equal(r.medicines[0].pdc, null);
  assert.equal(r.medicines[0].missedDoses, 0, "today's untaken dose is not yet missed");
  assert.equal(r.overall.pdc, null);
  assert.equal(r.medicines[0].todayScheduled, 1);
  assert.equal(r.medicines[0].todayTaken, 0);
  // A medicine starting in the future contributes nothing.
  const later = computeAdherence([med({ startDate: "2026-12-01" })], [], "2026-11-17");
  assert.equal(later.medicines[0].daysInWindow, 0);
  assert.equal(later.medicines[0].todayScheduled, 0);
  const strip = calendarStrip([m], future, "2026-11-17", 3);
  assert.equal(strip[strip.length - 1].date, "2026-11-17", "strip never shows future days");
});

test("Streak includes today once today is complete", () => {
  const m = med({ startDate: "2026-11-10" });
  const log = logAll(m, "2026-11-14", "2026-11-17");
  const r = computeAdherence([m], log, "2026-11-17");
  assert.equal(r.medicines[0].currentStreak, 4);
  assert.equal(r.overall.currentStreak, 4);
  const notYet = computeAdherence([m], log.filter((k) => !k.includes("2026-11-17")), "2026-11-17");
  assert.equal(notYet.medicines[0].currentStreak, 3, "today not done yet does not break the streak");
});

test("Overall: a day is covered only if every medicine scheduled that day was fully taken", () => {
  const a = med({ id: "a", startDate: "2026-11-14" });
  const b = med({ id: "b", name: "Cap. Seclo 20mg", times: ["07:30", "19:30"], startDate: "2026-11-15" });
  const log = [
    ...logAll(a, "2026-11-14", "2026-11-16"),
    ...logAll(b, "2026-11-15", "2026-11-15"),
    doseKey("b", "2026-11-16", 0),
  ];
  const r = computeAdherence([a, b], log, "2026-11-17");
  assert.equal(r.overall.daysInWindow, 3, "11-14 (a only), 11-15, 11-16");
  assert.equal(r.overall.daysCovered, 2);
  assert.equal(r.overall.missedDoses, 1);
  assert.equal(r.overall.todayScheduled, 3);
  assert.equal(r.medicines[1].daysInWindow, 2, "b clipped to its own start date");
});

test("Window length option and toggleDose", () => {
  const m = med({ startDate: "2026-01-01" });
  const r = computeAdherence([m], [], "2026-11-17", { windowDays: 7 });
  assert.equal(r.medicines[0].daysInWindow, 7);
  assert.equal(r.medicines[0].windowStart, "2026-11-10");
  let log = toggleDose([], "m1", "2026-11-17", 0);
  assert.deepEqual(log, ["m1|2026-11-17|0"]);
  log = toggleDose(log, "m1", "2026-11-17", 0);
  assert.deepEqual(log, [], "second tap un-ticks");
  assert.deepEqual(removeMedicineLog(["m1|2026-11-17|0", "m2|2026-11-17|0"], "m1"), ["m2|2026-11-17|0"]);
});

test("Sanitisers treat stored data as untrusted", () => {
  assert.equal(sanitizeSchedule("x"), null);
  const out = sanitizeSchedule([
    med(),
    med({ id: "m1" }), // duplicate id
    { ...med({ id: "bad-time" }), times: ["25:00"] },
    { ...med({ id: "bad-end" }), endDate: "2026-09-01" }, // before start
    { ...med({ id: "too-many" }), times: ["08:00", "10:00", "12:00", "14:00", "16:00"] },
    { id: "<script>", name: "x", times: ["08:00"], startDate: "2026-10-01", endDate: null },
    null,
  ]);
  assert.deepEqual(out!.map((m) => m.id), ["m1"]);
  assert.deepEqual(validateMedicine({ name: "", times: [], startDate: "x" }), ["name", "times", "startDate"]);
  assert.deepEqual(sanitizeLog(["m1|2026-11-17|0", "m1|2026-11-17|0", "m1|2026-13-01|0", "m1|2026-11-17|9", 5]), ["m1|2026-11-17|0"]);
});

test("ICS export: one daily event per dose time, ending on the written end date", () => {
  const ics = adherenceToIcs([
    med({ times: ["08:00", "21:00"], endDate: "2026-10-05" }),
    med({ id: "m2", name: "Cap. Seclo; 20mg", amountNote: "" }),
  ], { stamp: "20261117T000000Z" });
  assert.equal((ics.match(/BEGIN:VEVENT/g) ?? []).length, 3);
  assert.match(ics, /DTSTART:20261001T080000/);
  assert.match(ics, /DTSTART:20261001T210000/);
  assert.match(ics, /RRULE:FREQ=DAILY;UNTIL=20261005T235959/);
  assert.match(ics, /RRULE:FREQ=DAILY;COUNT=30/, "no end date: 30-day reminder, said so in the description");
  assert.match(ics, /Seclo\\; 20mg/, "text is escaped");
  assert.ok(ics.includes("\r\n"));
});
