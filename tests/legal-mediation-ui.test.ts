import { test } from "node:test";
import assert from "node:assert/strict";
import {
  splitEvenly, monthlyDates, installmentPlan, termProblems, buildDraft, draftText, upcomingSessionDays,
  parseTakaToPoisha, takaText, sanitizeMediation, safetyFlagged, EMPTY_DRAFT, type MoneyTerm,
} from "../lib/legal/mediationUi.ts";
import { fromDateKey, isWorkday } from "../lib/legal/mediation.ts";

test("splitEvenly reconciles to the poisha", () => {
  const parts = splitEvenly(1_000_00, 3);
  assert.equal(parts.reduce((a, b) => a + b, 0), 1_000_00);
  assert.deepEqual(parts, [33334, 33333, 33333]);
});

test("monthly dates clamp to the month end", () => {
  assert.deepEqual(monthlyDates("2027-01-31", 3), ["2027-01-31", "2027-02-28", "2027-03-31"]);
  assert.deepEqual(monthlyDates("bad", 3), []);
});

test("installment plan sums to the total and passes the checks", () => {
  const t: MoneyTerm = { id: "a", kind: "money", payer: "opposite", purposeBn: "ভরণপোষণ", totalPoisha: 30_000_00, installments: installmentPlan(30_000_00, 4, "2027-01-10") };
  assert.equal(t.installments.reduce((s, x) => s + x.amountPoisha, 0), 30_000_00);
  assert.deepEqual(termProblems(t), []);
  assert.ok(termProblems({ ...t, totalPoisha: 31_000_00 }).some((p) => p.includes("সমান নয়")));
});

test("session days are Bangladesh working days and skip marked holidays", () => {
  const today = fromDateKey("2026-11-18");
  const days = upcomingSessionDays(today, ["2026-11-19"], 10);
  assert.equal(days.length, 10);
  assert.ok(!days.includes("2026-11-19"));
  for (const d of days) assert.ok(isWorkday(fromDateKey(d)), d);
  assert.ok(!days.includes("2026-11-20") && !days.includes("2026-11-21")); // Friday, Saturday
});

test("draft: unwritten terms stay open; written ones carry their provenance; never called binding", () => {
  const empty = buildDraft(EMPTY_DRAFT);
  assert.ok(empty.openIds.includes("terms") && empty.openIds.includes("opposite_party"));
  const d = buildDraft({
    ...EMPTY_DRAFT, applicant: "রহিমা", opposite: "করিম", district: "ঢাকা", problem: "ভরণপোষণ বকেয়া", venue: "জেলা লিগ্যাল এইড অফিস", sessionDate: "2026-11-22",
    terms: [{ id: "m", kind: "money", payer: "opposite", purposeBn: "বকেয়া ভরণপোষণ", totalPoisha: 12_000_00, installments: installmentPlan(12_000_00, 3, "2026-12-01") }],
    conditions: ["কিস্তি না দিলে আবেদনকারী আদালতে যেতে পারবেন।"],
  });
  assert.ok(!d.openIds.includes("terms") && !d.openIds.includes("opposite_party"));
  const term = d.clauses.find((c) => c.id === "term_m")!;
  assert.equal(term.source, "yours");
  assert.ok(term.bodyBn!.includes("করিম") && term.bodyBn!.includes("১২,০০০"));
  assert.equal(d.totalPoisha, 12_000_00);
  const text = draftText(d);
  assert.ok(text.includes("আদালতের দলিল নয়"));
  assert.ok(!/বাধ্যতামূলক চুক্তি(?! নয়)|binding|আদালত অনুমোদিত/.test(text));
});

test("taka parsing and lakh grouping", () => {
  assert.equal(parseTakaToPoisha("১,২৫,০০০.৫০"), 12_500_050);
  assert.equal(parseTakaToPoisha("0"), null);
  assert.equal(takaText(12_500_050, false), "৳1,25,000.50");
});

test("sanitize keeps only known fields and valid dates", () => {
  const s = sanitizeMediation({ prep: ["nid", "x"], safety: { violence: true, junk: true }, holidays: ["2026-11-19", "nope"], draft: { applicant: 5, terms: [{ kind: "money", installments: [{ date: "2026-12-01", amountPoisha: -1 }] }, { kind: "?" }] }, savedAt: "now" })!;
  assert.deepEqual(s.prep, ["nid"]);
  assert.deepEqual(s.holidays, ["2026-11-19"]);
  assert.equal(s.draft.applicant, "");
  assert.equal(s.draft.terms.length, 1);
  assert.equal((s.draft.terms[0] as MoneyTerm).installments[0].amountPoisha, 0);
  assert.equal(safetyFlagged(s.safety), true);
  assert.equal(sanitizeMediation(null), null);
});
