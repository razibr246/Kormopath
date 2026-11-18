import { test } from "node:test";
import assert from "node:assert/strict";
import {
  EMPTY_ANSWERS, GROUND_LABELS, LEGAL_CASES_KEY, QUICK_QUESTIONS, answeredCount, bdStamp, composeProblem, documentSuggestions,
  eligibilityMessage, factsFromAnswers, severityAdvice,
} from "../lib/legal/citizen.ts";
import { assessLegalAidEligibility } from "../lib/legal/eligibility.ts";
import { HELPLINES } from "../lib/legal/data.ts";
import { PROBLEM_CATEGORIES } from "../lib/legal/taxonomy.ts";

test("legal citizen: storage key matches the clientStore format", () => {
  assert.equal(LEGAL_CASES_KEY, "kormopath:legal:caseFiles");
});

test("legal citizen: unanswered questions stay unknown, never 'no'", () => {
  const f = factsFromAnswers(EMPTY_ANSWERS);
  assert.equal(f.cannotAffordLawyer, null);
  assert.equal(f.employed, null);
  assert.equal(f.gender, null);
  assert.equal(answeredCount(EMPTY_ANSWERS), 0);
  assert.equal(QUICK_QUESTIONS.length, Object.keys(EMPTY_ANSWERS).length);
});

test("legal citizen: 'cannot afford' alone may qualify, and the office always decides", () => {
  const d = assessLegalAidEligibility(factsFromAnswers({ ...EMPTY_ANSWERS, cannotAfford: true }));
  const m = eligibilityMessage(d);
  assert.equal(m.tone, "likely");
  assert.ok(m.reasons.some((r) => r.en === "Cannot afford a lawyer"));
  assert.match(m.note.bn, /লিগ্যাল এইড অফিস ঠিক করবে/);
  assert.match(m.note.en, /decided by your district legal aid office/);
});

test("legal citizen: nothing answered gives 'unclear', never a refusal", () => {
  const m = eligibilityMessage(assessLegalAidEligibility(factsFromAnswers(EMPTY_ANSWERS)));
  assert.equal(m.tone, "unclear");
  assert.match(m.title.bn, /আবেদন করতে বাধা নেই/);
});

test("legal citizen: acid ground is labelled as an acid attack, not poisoning", () => {
  assert.match(GROUND_LABELS.acid_attack_victim.bn, /এসিড/);
  const d = assessLegalAidEligibility(factsFromAnswers({ ...EMPTY_ANSWERS, acid: true }));
  assert.ok(eligibilityMessage(d).reasons.some((r) => /এসিড/.test(r.bn)));
  assert.ok(!eligibilityMessage(d).reasons.some((r) => /বিষ/.test(r.bn)));
});

test("legal citizen: every ground code the core can return has a label", () => {
  const all = { ...EMPTY_ANSWERS, woman: true, child: true, disability: true, cannotAfford: true, unemployed: true, violence: true, abandoned: true, acid: true, trafficking: true, onlineAbuse: true };
  for (const g of assessLegalAidEligibility(factsFromAnswers(all)).grounds) assert.ok(GROUND_LABELS[g.code], g.code);
});

test("legal citizen: document checklist has the basics and category extras, without duplicates", () => {
  const base = documentSuggestions(null);
  assert.ok(base.length >= 2);
  for (const c of PROBLEM_CATEGORIES) {
    const list = documentSuggestions(c.id);
    assert.equal(new Set(list.map((d) => d.bn)).size, list.length, c.id);
    assert.ok(list.length >= base.length);
  }
  assert.ok(documentSuggestions("cheque").some((d) => /চেক/.test(d.bn)));
});

test("legal citizen: the other side's details are appended to the story", () => {
  assert.equal(composeProblem(" আমার জমি দখল হয়েছে ", { name: "", relation: "", address: "" }), "আমার জমি দখল হয়েছে");
  const s = composeProblem("জমি দখল", { name: "করিম", relation: "প্রতিবেশী", address: "" });
  assert.match(s, /অপর পক্ষ — নাম: করিম; সম্পর্ক: প্রতিবেশী/);
});

test("legal citizen: severity advice only names helplines that exist in the verified data", () => {
  const ids = new Set(HELPLINES.map((h) => h.id));
  for (const lvl of ["emergency", "high", "priority", "standard"] as const) {
    const a = severityAdvice(lvl);
    assert.ok(a.call.length > 0);
    for (const id of a.call) assert.ok(ids.has(id), id);
  }
  assert.equal(severityAdvice("emergency").tone, "danger");
});

test("legal citizen: Bangladesh time stamp", () => {
  assert.equal(bdStamp("2026-11-18T00:30:00.000Z"), "2026-11-18 06:30");
  assert.equal(bdStamp("nope"), "");
});
