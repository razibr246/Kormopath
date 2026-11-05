import { test } from "node:test";
import assert from "node:assert/strict";
import {
  calculateMatches, generateDeadlines, validateUserDeadline, answerCounselorQuery, analyzeSopText, countSyllables,
  UNIVERSITIES, type StudentProfile, type UserDeadline,
} from "../lib/admitbuddy.ts";

const profile: StudentProfile = { sscGpa: 5, hscGpa: 5, group: "Science", maxBudgetPerSemester: 85000, preferredLocations: ["Dhaka"], interests: ["CSE"] };

test("No university ships with an invented deadline", () => {
  for (const u of UNIVERSITIES) assert.equal(u.applicationDeadline, null, u.id);
  const m = calculateMatches(profile, [], "2026-11-05");
  for (const r of m) {
    assert.equal(r.daysLeft, null);
    assert.equal(r.isClosed, false);
  }
});

test("User-entered deadlines drive days-left and closed status", () => {
  const ds: UserDeadline[] = [
    { universityId: "buet", kind: "application", date: "2026-12-01", label: "আবেদন শেষ", sourceNote: "official circular" },
    { universityId: "du", kind: "application", date: "2026-10-01", label: "আবেদন শেষ", sourceNote: "official circular" },
  ];
  const m = calculateMatches(profile, ds, "2026-11-05");
  const buet = m.find((x) => x.university.id === "buet")!;
  assert.equal(buet.daysLeft, 26);
  assert.equal(buet.nextDeadline?.sourceNote, "official circular");
  assert.equal(m.find((x) => x.university.id === "du")!.isClosed, true);
});

test("Selective public universities stay 'Reach' even with a perfect GPA, and low GPA is 'below'", () => {
  const m = calculateMatches(profile, [], "2026-11-05");
  assert.equal(m.find((x) => x.university.id === "buet")!.category, "Reach");
  const low = calculateMatches({ ...profile, sscGpa: 3.5, hscGpa: 3.5 }, [], "2026-11-05");
  assert.equal(low.find((x) => x.university.id === "buet")!.eligibility, "below");
});

test("Task list keeps undated tasks undated instead of guessing", () => {
  const buet = UNIVERSITIES.find((u) => u.id === "buet")!;
  const tasks = generateDeadlines([buet], []);
  assert.ok(tasks.length >= 2);
  assert.ok(tasks.every((t) => t.dueDate === null));
  const withDate = generateDeadlines([buet], [{ universityId: "buet", kind: "exam", date: "2027-01-10", label: "পরীক্ষা", sourceNote: "circular" }]);
  assert.equal(withDate[0].dueDate, "2027-01-10");
});

test("Deadline input is validated", () => {
  assert.ok(validateUserDeadline({ universityId: "nope", date: "2026-12-01", sourceNote: "x y z" }));
  assert.ok(validateUserDeadline({ universityId: "buet", date: "12/01/2026", sourceNote: "circular" }));
  assert.ok(validateUserDeadline({ universityId: "buet", date: "2026-12-01", sourceNote: "" }));
  assert.equal(validateUserDeadline({ universityId: "buet", date: "2026-12-01", sourceNote: "official circular" }), null);
});

test("Counselor: 'du' inside 'education' no longer triggers Dhaka University; no invented dates", () => {
  const m = calculateMatches(profile, [], "2026-11-05");
  const ans = answerCounselorQuery("what education options do I have", m);
  assert.ok(!ans.includes("University of Dhaka"), ans);
  const dl = answerCounselorQuery("When is the deadline?", m);
  assert.ok(!/\d{4}-\d{2}-\d{2}/.test(dl), "no date when none entered: " + dl);
  assert.ok(answerCounselorQuery("Tell me about BUET", m).includes("Bangladesh University of Engineering"));
  assert.ok(answerCounselorQuery("brac fees?", m).includes("BRAC"));
});

test("SOP readability is a real Flesch score, not clamped", () => {
  assert.equal(countSyllables("cat"), 1);
  assert.equal(countSyllables("university"), 5);
  const easy = analyzeSopText("I like to code. I built a small app. It helps my friends.");
  const hard = analyzeSopText("Notwithstanding institutional heterogeneity, interdisciplinary methodological considerations necessitate comprehensive epistemological reconceptualization.");
  assert.ok(easy.readabilityScore > 80, `easy ${easy.readabilityScore}`);
  assert.ok(hard.readabilityScore < 0, `hard ${hard.readabilityScore}`);
  assert.deepEqual(analyzeSopText("This state-of-the-art, life-changing programme.").genericPhrases.sort(), ["life-changing", "state-of-the-art"]);
});

test("Calendar export includes only dated tasks with a reminder", async () => {
  const { toIcs } = await import("../lib/admitbuddy.ts");
  const ics = toIcs([
    { id: "a", universityId: "buet", universityName: "BUET", title: "BUET: আবেদন, শেষ", dueDate: "2026-12-01", isDone: false, priority: "high", sourceNote: "circular" },
    { id: "b", universityId: "buet", universityName: "BUET", title: "undated", dueDate: null, isDone: false, priority: "high" },
  ]);
  assert.equal((ics.match(/BEGIN:VEVENT/g) ?? []).length, 1);
  assert.ok(ics.includes("DTSTART;VALUE=DATE:20261201"));
  assert.ok(ics.includes("DTEND;VALUE=DATE:20261202"));
  assert.ok(ics.includes("আবেদন\\, শেষ"), "commas escaped");
  assert.ok(ics.includes("TRIGGER:-P2D"));
});
