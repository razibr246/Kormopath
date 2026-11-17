import test from "node:test";
import assert from "node:assert/strict";
import { assessFever, feverDay, isIsoDate, sanitizeFeverWatch, feverSummaryText, todayInBangladesh, WARNING_SIGNS, DENGUE_SOURCES, NOT_A_TEST_BN, NOT_A_TEST_EN, MAX_FEVER_CHECKS } from "../lib/dengue.ts";

const base = { feverStart: "2026-11-15", today: "2026-11-16", feverGone: false, signs: [] as string[] };

test("dengue: any WHO warning sign means go to hospital now, on any day", () => {
  for (const s of WARNING_SIGNS) {
    const a = assessFever({ ...base, feverStart: "", signs: [s.id] });
    assert.equal(a.level, "go_now", s.id);
    assert.ok(a.pointsEn.some((p) => /999/.test(p)));
  }
});

test("dengue: day 3+ or a falling fever means watch closely; earlier means keep watching", () => {
  assert.equal(assessFever(base).level, "keep_watching");
  assert.equal(assessFever({ ...base, today: "2026-11-17" }).level, "watch_closely");
  const gone = assessFever({ ...base, feverGone: true });
  assert.equal(gone.level, "watch_closely");
  assert.match(gone.pointsEn[0], /not recovery/);
});

test("dengue: never claims safe or a diagnosis, never names a medicine", () => {
  const all = [assessFever(base), assessFever({ ...base, feverGone: true }), assessFever({ ...base, signs: ["bleeding"] })];
  for (const a of all) {
    const text = [a.headlineEn, ...a.pointsEn].join(" ");
    assert.ok(a.pointsBn.includes(NOT_A_TEST_BN) && a.pointsEn.includes(NOT_A_TEST_EN));
    assert.doesNotMatch(text, /\byou have dengue\b|\bnot dengue\b|paracetamol|ibuprofen|aspirin|\bmg\b|\bdose\b/i);
  }
  assert.match(assessFever(base).pointsEn[0], /does not mean the patient is safe/);
});

test("dengue: unknown signs ignored, dates validated", () => {
  assert.equal(assessFever({ ...base, signs: ["made_up"] }).level, "keep_watching");
  assert.equal(isIsoDate("2026-02-30"), false);
  assert.equal(feverDay("2026-11-17", "2026-11-17"), 1);
  assert.equal(feverDay("2026-11-18", "2026-11-17"), null);
  assert.equal(feverDay("bad", "2026-11-17"), null);
  assert.equal(feverDay("2026-02-27", "2026-03-01"), 3);
  assert.equal(todayInBangladesh(new Date("2026-11-17T19:30:00Z")), "2026-11-18");
});

test("dengue: stored log is sanitised and the doctor summary is labelled self-recorded", () => {
  const w = sanitizeFeverWatch({ feverStart: "2026-11-15", checks: [
    { date: "2026-11-17", time: "09:10", day: 3, feverGone: true, signs: ["abdominal_pain", "x"], level: "go_now" },
    { date: "2026-02-30", time: "09:10", level: "go_now" },
    { date: "2026-11-16", time: "9am", level: "go_now" },
  ] });
  assert.equal(w?.checks.length, 1);
  assert.deepEqual(w?.checks[0].signs, ["abdominal_pain"]);
  assert.equal(sanitizeFeverWatch("x"), null);
  const many = sanitizeFeverWatch({ checks: Array.from({ length: 80 }, () => ({ date: "2026-11-17", time: "10:00", level: "keep_watching" })) });
  assert.equal(many?.checks.length, MAX_FEVER_CHECKS);
  const txt = feverSummaryText(w!, "en");
  assert.match(txt, /not verified/);
  assert.match(txt, /Severe stomach pain/);
  assert.ok(DENGUE_SOURCES.every((s) => s.url.includes("who.int") && s.checked));
});
