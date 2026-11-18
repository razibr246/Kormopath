import { test } from "node:test";
import assert from "node:assert/strict";
import {
  calculateMatches, generateDeadlines, validateUserDeadline, answerCounselorQuery, analyzeSopText, countSyllables,
  UNIVERSITIES, toRoadmapMarkdown, analyzeListBalance, sanitizeStatuses, applicationPipeline,
  type StudentProfile, type UserDeadline,
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

test("UNIVERSITIES catalog expansion contains 24+ institutions with complete schema integrity", () => {
  assert.ok(UNIVERSITIES.length >= 24, `Expected >= 24 universities, found ${UNIVERSITIES.length}`);
  const requiredIds = ["ju", "ru", "bu", "cou", "iu", "butex", "bsmrau", "dmc", "ku"];
  for (const id of requiredIds) {
    const uni = UNIVERSITIES.find((u) => u.id === id);
    assert.ok(uni, `Missing required university: ${id}`);
    assert.equal(uni.applicationDeadline, null, `${id} must have null deadline`);
    assert.ok(uni.name.length > 0, `${id} name must be non-empty`);
    assert.ok(uni.shortName.length > 0, `${id} shortName must be non-empty`);
    assert.ok(uni.programs.length > 0, `${id} must have programs`);
    assert.ok(uni.website.startsWith("https://"), `${id} website must start with https://`);
    assert.ok(uni.minGpaTotal > 0, `${id} must have positive minGpaTotal`);
    assert.ok(uni.minBudgetPerSemester > 0, `${id} must have positive minBudget`);
  }
  // No duplicate IDs
  const idSet = new Set(UNIVERSITIES.map((u) => u.id));
  assert.equal(idSet.size, UNIVERSITIES.length, "University IDs must be unique");
});

test("Search filter accurately matches by name, shortName, programs, and location", () => {
  const searchPredicate = (u: (typeof UNIVERSITIES)[0], q: string) => {
    const term = q.trim().toLowerCase();
    if (!term) return true;
    return (
      u.name.toLowerCase().includes(term) ||
      u.shortName.toLowerCase().includes(term) ||
      u.location.toLowerCase().includes(term) ||
      u.programs.some((p) => p.toLowerCase().includes(term))
    );
  };

  // Match by name
  assert.ok(UNIVERSITIES.filter((u) => searchPredicate(u, "Jahangirnagar")).some((u) => u.id === "ju"));
  // Match by shortName (case insensitive)
  assert.ok(UNIVERSITIES.filter((u) => searchPredicate(u, "butex")).some((u) => u.id === "butex"));
  // Match by program
  assert.ok(UNIVERSITIES.filter((u) => searchPredicate(u, "Textile")).some((u) => u.id === "butex"));
  assert.ok(UNIVERSITIES.filter((u) => searchPredicate(u, "MBBS")).some((u) => u.id === "dmc"));
  // Match by location
  const rajshahiUnis = UNIVERSITIES.filter((u) => searchPredicate(u, "Rajshahi"));
  assert.ok(rajshahiUnis.some((u) => u.id === "ru"));
  assert.ok(rajshahiUnis.some((u) => u.id === "ruet"));
  // Nonexistent search returns empty
  assert.equal(UNIVERSITIES.filter((u) => searchPredicate(u, "nonexistentxyz123")).length, 0);
});

test("CollegeVine list balance correctly evaluates balanced, reach-heavy, and zero-safety portfolios", () => {
  const m = calculateMatches(profile, [], "2026-11-05");

  // Empty shortlist
  const empty = analyzeListBalance(m, []);
  assert.equal(empty.isBalanced, false);
  assert.equal(empty.total, 0);

  // Zero-safety shortlist (BUET, DU, BUTEX are all Reach)
  const zeroSafety = analyzeListBalance(m, ["buet", "du", "butex"]);
  assert.equal(zeroSafety.isBalanced, false);
  assert.equal(zeroSafety.safeties, 0);
  assert.ok(zeroSafety.recommendationBn.includes("Safety/Waiver"));

  // Balanced 2-3-2 ratio portfolio
  const mockMatches = [
    { university: { id: "reach1" }, category: "Reach" },
    { university: { id: "match1" }, category: "Match" },
    { university: { id: "match2" }, category: "Match" },
    { university: { id: "safety1" }, category: "Safety" },
  ] as any;
  const balanced = analyzeListBalance(mockMatches, ["reach1", "match1", "match2", "safety1"]);
  assert.equal(balanced.isBalanced, true);
  assert.ok(balanced.statusBn.includes("Optimal 2-3-2 Ratio"));
});

test("toRoadmapMarkdown generates comprehensive structured Markdown without invented dates", () => {
  const shortlisted = UNIVERSITIES.filter((u) => ["buet", "ju", "dmc"].includes(u.id));
  const userDeadlines: UserDeadline[] = [
    { universityId: "buet", kind: "application", date: "2026-12-15", label: "আবেদনের শেষ তারিখ", sourceNote: "buet.ac.bd circular" },
  ];
  const tasks = generateDeadlines(shortlisted, userDeadlines);
  const md = toRoadmapMarkdown(profile, shortlisted, tasks, undefined, userDeadlines, [], "2026-11-15");

  assert.ok(md.includes("# KormoPath AdmitBuddy — বিশ্ববিদ্যালয় ভর্তি রোডম্যাপ"));
  assert.ok(md.includes("শিক্ষার্থীর নাম:"));
  assert.ok(md.includes("SSC"));
  assert.ok(md.includes("BUET"));
  assert.ok(md.includes("JU"));
  assert.ok(md.includes("DMC"));
  assert.ok(md.includes("2026-12-15"));
  assert.ok(md.includes("buet.ac.bd circular"));
  assert.ok(md.includes("0 Invented Dates Invariant"));
  assert.ok(md.includes("প্রয়োজনীয় কাগজপত্র ও সনদের চেকলিস্ট"));
});

test("Counselor accurately resolves new universities, medical, textile, and agriculture queries with strict word boundaries", () => {
  const m = calculateMatches(profile, [], "2026-11-05");
  // JU
  const juAns = answerCounselorQuery("Tell me about JU", m);
  assert.ok(juAns.includes("Jahangirnagar"), "JU query matches Jahangirnagar");
  // BUTEX / Textile
  const butexAns = answerCounselorQuery("Tell me about BUTEX", m);
  assert.ok(butexAns.includes("Textile") || butexAns.includes("BUTEX"));
  // Medical
  const medAns = answerCounselorQuery("medical admission guidelines", m);
  assert.ok(medAns.includes("DGME") || medAns.includes("মেডিকেল") || medAns.includes("Medical"));
  // Word boundary safety: 'justice' must NOT trigger JU, 'running' must NOT trigger RU
  const justiceAns = answerCounselorQuery("social justice in education", m);
  assert.ok(!justiceAns.includes("Jahangirnagar"), "'justice' must not trigger JU");
  const runningAns = answerCounselorQuery("running for club president", m);
  assert.ok(!runningAns.includes("University of Rajshahi"), "'running' must not trigger RU");
});

test("Application pipeline and status sanitization preserves stage integrity", () => {
  const valid = sanitizeStatuses([
    { universityId: "ju", stage: "applied", updatedAt: "2026-11-10", note: "Roll 4410" },
    { universityId: "butex", stage: "planning", updatedAt: "", note: "" },
    { universityId: "invalid_uni_xyz", stage: "applied" },
  ]);
  assert.ok(valid);
  assert.equal(valid.length, 2);
  assert.equal(valid[0].universityId, "ju");
  assert.equal(valid[1].universityId, "butex");

  const pipe = applicationPipeline(["ju", "butex"], valid);
  assert.equal(pipe.rows.length, 2);
  assert.equal(pipe.counts.applied, 1);
  assert.equal(pipe.counts.planning, 1);
  assert.equal(pipe.active, 2);
  assert.equal(pipe.finished, 0);
});

test("compareUniversities correctly compares selected institutions across key dimensions", async () => {
  const { compareUniversities } = await import("../lib/admitbuddy.ts");
  const comp = compareUniversities(["buet", "du", "brac"]);
  assert.equal(comp.universities.length, 3);
  assert.ok(comp.metrics.length >= 6);

  const typeMetric = comp.metrics.find((m) => m.key === "type");
  assert.ok(typeMetric);
  assert.ok(String(typeMetric.values["buet"]).includes("সরকারি"));
  assert.ok(String(typeMetric.values["brac"]).includes("বেসরকারি"));

  // Empty selection handling
  const emptyComp = compareUniversities([]);
  assert.equal(emptyComp.universities.length, 0);
  assert.equal(emptyComp.metrics.length, 0);
});

test("UNIT_ELIGIBILITY_MATRIX and checkUnitEligibility evaluate cluster eligibility deterministically", async () => {
  const { UNIT_ELIGIBILITY_MATRIX, checkUnitEligibility } = await import("../lib/admitbuddy.ts");
  assert.ok(UNIT_ELIGIBILITY_MATRIX.length >= 8);

  // High-achieving Science student
  const scienceStudent = {
    sscGpa: 5.0,
    hscGpa: 5.0,
    group: "Science" as const,
    maxBudgetPerSemester: 80000,
    preferredLocations: [],
    interests: [],
  };
  const results = checkUnitEligibility(scienceStudent);
  const buet = results.find((r) => r.unit.id === "buet");
  assert.ok(buet);
  assert.equal(buet.isEligible, true);
  assert.equal(buet.gpaGap, 0);

  // Low GPA Commerce student trying for Science BUET
  const commerceStudent = {
    sscGpa: 3.2,
    hscGpa: 3.4,
    group: "Commerce" as const,
    maxBudgetPerSemester: 50000,
    preferredLocations: [],
    interests: [],
  };
  const commResults = checkUnitEligibility(commerceStudent);
  const commBuet = commResults.find((r) => r.unit.id === "buet");
  assert.ok(commBuet);
  assert.equal(commBuet.isEligible, false);
  assert.ok(commBuet.reasonsBn.length >= 2, "Should cite group mismatch and GPA gap");
});

test("SCHOLARSHIPS_DIRECTORY contains verified domestic and international scholarships", async () => {
  const { SCHOLARSHIPS_DIRECTORY } = await import("../lib/admitbuddy.ts");
  assert.ok(SCHOLARSHIPS_DIRECTORY.length >= 6);

  const pmeat = SCHOLARSHIPS_DIRECTORY.find((s) => s.id === "pmeat");
  assert.ok(pmeat);
  assert.equal(pmeat.category, "domestic");
  assert.ok(pmeat.officialUrl.startsWith("https://"));

  const erasmus = SCHOLARSHIPS_DIRECTORY.find((s) => s.id === "erasmus");
  assert.ok(erasmus);
  assert.equal(erasmus.category, "international");
  assert.ok(erasmus.coverageBn.includes("১০০%"));
});

