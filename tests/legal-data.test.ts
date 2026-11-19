import { test } from "node:test";
import assert from "node:assert/strict";
import { HELPLINES, LAWS, LEGAL_SOURCES, LEGAL_CHECKED, ELIGIBILITY_NOTE_BN, helplineById } from "../lib/legal/data.ts";
import {
  newCaseFile, validateNewCaseFile, appendEvent, setStatus, editCaseFile, sanitizeCaseFiles, applicationText,
  MAX_TIMELINE, CASE_FILE_STATUS_LABELS,
} from "../lib/legal/caseFile.ts";
import { PROBLEM_CATEGORIES } from "../lib/legal/taxonomy.ts";
import { SEVERITY_RULES } from "../lib/legal/severity.ts";

test("legal data: every helpline and law carries an official source with the check date", () => {
  for (const h of HELPLINES) {
    assert.match(h.number, /^\d{3,5}$/, h.id);
    assert.match(h.source.url, /^https?:\/\//, h.id);
    // Re-checked sources carry their own, later date.
    assert.match(h.source.checked, /^\d{4}-\d{2}-\d{2}$/, h.id);
    assert.ok(h.source.checked >= LEGAL_CHECKED, h.id);
  }
  for (const l of Object.values(LAWS)) {
    assert.match(l.url, /^http:\/\/bdlaws\.minlaw\.gov\.bd\/act-details-\d+\.html$/, l.id);
    assert.equal(l.source.checked, LEGAL_CHECKED);
    assert.ok(l.bn && l.en, l.id);
  }
  assert.ok(LEGAL_SOURCES.length >= 4);
});

test("legal data: the national legal aid helpline is 16699 (nlaso.gov.bd), not the old 16430", () => {
  assert.equal(helplineById("legal_aid").number, "16699");
  assert.match(helplineById("legal_aid").source.url, /nlaso\.gov\.bd/);
  assert.ok(!HELPLINES.some((h) => h.number === "16430"));
});

test("legal data: no repealed or mislabelled law is named anywhere", () => {
  const names = [...Object.values(LAWS).flatMap((l) => [l.bn, l.en]), ...PROBLEM_CATEGORIES.map((c) => c.actBn ?? ""), ...SEVERITY_RULES.flatMap((r) => r.legalBasis)].join(" | ");
  for (const bad of [/Digital Security/i, /ডিজিটাল নিরাপত্তা/, /2012/, /বিষ প্রয়োগ/, /২০০৬\s*$/, /Section \d/i, /ধারা/]) assert.ok(!bad.test(names), String(bad));
  assert.match(LAWS.cyber_2026.bn, /সাইবার সুরক্ষা আইন, ২০২৬/);
  assert.match(LAWS.acid_2002.bn, /এসিড অপরাধ দমন আইন, ২০০২/);
});

test("legal data: eligibility is always 'the office decides'", () => {
  assert.match(ELIGIBILITY_NOTE_BN, /লিগ্যাল এইড অফিস/);
  assert.match(ELIGIBILITY_NOTE_BN, /১৬৬৯৯/);
});

const now = "2026-11-17T10:00:00.000Z";
const cat = PROBLEM_CATEGORIES[0];

test("case file: validation, creation and the printable draft", () => {
  assert.ok(validateNewCaseFile({ categoryId: "nope", districtId: "Mars", problem: "x" }).length >= 3);
  assert.deepEqual(validateNewCaseFile({ categoryId: cat.id, districtId: "Dhaka", problem: "আমার স্বামী আমাকে মারধর করেন" }), []);
  const f = newCaseFile({ categoryId: cat.id, districtId: "Dhaka", problem: "আমার স্বামী আমাকে মারধর করেন", applicant: { name: "রহিমা", phone: "০১৭১২৩৪৫৬৭৮", cannotAffordLawyer: true } }, "cf1", now);
  assert.equal(f.status, "draft");
  assert.equal(f.applicant.phone, "01712345678");
  assert.equal(f.timeline.length, 1);
  const text = applicationText(f);
  assert.match(text, /কোনো অফিসে জমা হয়নি/);
  assert.match(text, /১৬৬৯৯/);
});

test("case file: the timeline is append-only and status is self-reported", () => {
  let f = newCaseFile({ categoryId: cat.id, districtId: "Dhaka", problem: "জমির দখল নিয়ে বিরোধ চলছে" }, "cf2", now);
  f = setStatus(f, "contacted_helpline", "2026-11-18T09:00:00.000Z");
  f = editCaseFile(f, { problem: "জমির দখল নিয়ে বিরোধ, প্রতিবেশী হুমকি দিচ্ছে" }, "2026-11-18T10:00:00.000Z");
  assert.equal(f.status, "contacted_helpline");
  assert.deepEqual(f.timeline.map((e) => e.kind), ["created", "status", "edited"]);
  assert.equal(CASE_FILE_STATUS_LABELS[f.status].bn, "১৬৬৯৯-এ কথা বলেছি");
  assert.equal(editCaseFile(f, {}, now), f, "an empty edit adds nothing");
  for (let i = 0; i < MAX_TIMELINE + 5; i++) f = appendEvent(f, { at: now, kind: "note", text: "n" });
  assert.equal(f.timeline.length, MAX_TIMELINE);
});

test("case file: sanitize drops malformed records and keeps good ones", () => {
  const good = newCaseFile({ categoryId: cat.id, districtId: "Sylhet", problem: "বেতন পাচ্ছি না তিন মাস" }, "cf3", now);
  const out = sanitizeCaseFiles([good, null, { id: "x" }, { ...good, id: "cf4", status: "filed_with_court", districtId: "Atlantis", timeline: [{ at: "bad", kind: "note", text: "x" }] }]);
  assert.ok(out);
  assert.equal(out!.length, 2);
  assert.equal(out![1].status, "draft");
  assert.equal(out![1].districtId, "");
  assert.equal(out![1].timeline.length, 0);
  assert.equal(sanitizeCaseFiles("nope"), null);
});
