import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { buildStudyPlan, sanitizeStudyInput, validateStudyInput, SELF_CHECKS, type StudyChapter } from "../lib/admitbuddy.ts";
import { allDayIcs } from "../lib/ics.ts";

const ch = (id: string, subject: string, hours: number): StudyChapter => ({ id, subject, title: `${subject} ${id}`, hours });

describe("AdmitBuddy study plan", () => {
  test("schedules each chapter first, then revisions at +1, +3, +7, +14 days", () => {
    const p = buildStudyPlan({ start: "2026-12-01", examDate: "2027-01-10", hoursPerDay: 2, chapters: [ch("a", "Physics", 2)] });
    assert.equal(p.overload, false);
    const learn = p.days.flatMap((d) => d.sessions.filter((s) => s.kind === "learn").map(() => d.date));
    assert.deepEqual(learn, ["2026-12-01"]);
    const rev = p.days.flatMap((d) => d.sessions.filter((s) => s.kind === "revise").map((s) => [d.date, s.round]));
    assert.deepEqual(rev, [["2026-12-02", 1], ["2026-12-04", 2], ["2026-12-08", 3], ["2026-12-15", 4]]);
    assert.equal(p.clippedRevisions, 0);
  });

  test("never schedules on or after the exam date and clips late revisions", () => {
    const p = buildStudyPlan({ start: "2026-12-01", examDate: "2026-12-06", hoursPerDay: 3, chapters: [ch("a", "Bangla", 2), ch("b", "English", 2)] });
    assert.equal(p.days.at(-1)!.date, "2026-12-05");
    for (const d of p.days) assert.ok(d.date < "2026-12-06");
    // a finishes 12-01 (+7, +14 clipped); b finishes 12-02 (+7, +14 clipped)
    assert.equal(p.clippedRevisions, 4);
    assert.equal(p.overload, false);
    assert.ok(p.messagesBn.some((m) => m.includes("পরীক্ষার দিন")));
  });

  test("flags overload when the hours are not enough", () => {
    const p = buildStudyPlan({ start: "2026-12-01", examDate: "2026-12-04", hoursPerDay: 1, chapters: [ch("a", "Math", 2), ch("b", "Math", 2)] });
    assert.equal(p.availableMinutes, 180);
    assert.equal(p.overload, true);
    assert.deepEqual(p.unscheduled, ["b"]);
    assert.ok(p.neededMinutes > p.availableMinutes);
    for (const d of p.days) assert.ok(d.minutes <= 60);
  });

  test("revisions that do not fit slide forward, and drop with overload if none fit before the exam", () => {
    // 30 minutes a day, a 30-minute chapter, 30-minute revisions: day 2 holds revision 1 only.
    const p = buildStudyPlan({ start: "2026-12-01", examDate: "2026-12-05", hoursPerDay: 0.5, chapters: [ch("a", "ICT", 0.5), ch("b", "ICT", 0.5)] });
    const d2 = p.days.find((d) => d.date === "2026-12-02")!;
    assert.deepEqual(d2.sessions.map((s) => s.kind), ["revise"]);
    assert.ok(p.unscheduled.length === 0);
    // 12-04 has a's round 2 and b's round 1 due but room for one; the earlier round wins, a's round 2 is dropped.
    assert.deepEqual(p.droppedRevisions, [{ chapterId: "a", round: 2 }]);
    assert.equal(p.overload, true);
    assert.equal(p.days.reduce((a, d) => a + d.minutes, 0) <= p.availableMinutes, true);
  });

  test("round-robins subjects and splits long chapters across days", () => {
    const p = buildStudyPlan({ start: "2026-12-01", examDate: "2027-01-30", hoursPerDay: 2, chapters: [ch("p1", "Physics", 3), ch("p2", "Physics", 1), ch("c1", "Chemistry", 1)] });
    const order = p.days.flatMap((d) => d.sessions.filter((s) => s.kind === "learn").map((s) => s.chapterId));
    assert.deepEqual([...new Set(order)], ["p1", "c1", "p2"]);
    assert.equal(p.days[0].sessions.find((s) => s.chapterId === "p1")!.minutes, 120);
  });

  test("blocked (power-cut) days get no sessions and the plan reflows", () => {
    const p = buildStudyPlan({ start: "2026-12-01", examDate: "2026-12-20", hoursPerDay: 1, chapters: [ch("a", "Bio", 1), ch("b", "Bio", 1)], blockedDates: ["2026-12-02"] });
    const d2 = p.days.find((d) => d.date === "2026-12-02")!;
    assert.equal(d2.blocked, true);
    assert.equal(d2.sessions.length, 0);
    assert.equal(p.studyDays, p.days.length - 1);
    // a's +1 revision (due 12-02) moved to 12-03, ahead of new study
    assert.equal(p.days.find((d) => d.date === "2026-12-03")!.sessions[0].kind, "revise");
  });

  test("every day has a metacognitive self-check, and the plan exports to .ics", () => {
    const p = buildStudyPlan({ start: "2026-12-01", examDate: "2026-12-08", hoursPerDay: 2, chapters: [ch("a", "Math", 1)] });
    for (const d of p.days) assert.ok(SELF_CHECKS.some((s) => s.bn === d.selfCheckBn));
    assert.equal(SELF_CHECKS[0].en, "Close the book: write 3 things you remember.");
    const ics = allDayIcs(p.days.filter((d) => d.sessions.length).map((d) => ({ uid: d.date, date: d.date, title: "পড়া", description: d.selfCheckBn })), "AdmitBuddy");
    assert.equal((ics.match(/BEGIN:VEVENT/g) ?? []).length, p.days.filter((d) => d.sessions.length).length);
  });

  test("validation and sanitising", () => {
    assert.match(validateStudyInput({ start: "2026-12-01", examDate: "2026-12-01", hoursPerDay: 2, chapters: [ch("a", "x", 1)] })!, /পরে/);
    assert.match(validateStudyInput({ start: "2026-12-01", examDate: "2026-12-09", hoursPerDay: 0, chapters: [ch("a", "x", 1)] })!, /ঘণ্টা/);
    assert.throws(() => buildStudyPlan({ start: "2026-12-01", examDate: "2026-12-09", hoursPerDay: 2, chapters: [] }));
    const s = sanitizeStudyInput({ examDate: "2027-02-30", hoursPerDay: 99, chapters: [{ id: "a", subject: "M", title: "t", hours: -1 }, { id: "b", subject: "M", title: "t", hours: 2 }], blockedDates: ["bad", "2026-12-05"] })!;
    assert.equal(s.examDate, "");
    assert.equal(s.hoursPerDay, 3);
    assert.deepEqual(s.chapters.map((c) => c.id), ["b"]);
    assert.deepEqual(s.blockedDates, ["2026-12-05"]);
    assert.equal(sanitizeStudyInput("x"), null);
  });
});
