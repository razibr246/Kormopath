import { test } from "node:test";
import assert from "node:assert/strict";
import {
  STUDY_DESTINATIONS,
  STANDARDIZED_TESTS,
  PACE_TRACKS,
  DOCUMENT_ATTESTATION_CHECKLIST,
  sanitizeForeignApplications,
  calculateSolvencyRequirement,
  generateProfessorColdEmail,
} from "../lib/foreignAdmission.ts";

test("STUDY_DESTINATIONS covers Germany, USA, Canada, UK, Japan, Malaysia with tuition & visa facts", () => {
  const ids = STUDY_DESTINATIONS.map((d) => d.id);
  assert.ok(ids.includes("germany"));
  assert.ok(ids.includes("usa"));
  assert.ok(ids.includes("canada"));
  assert.ok(ids.includes("uk"));
  assert.ok(ids.includes("japan"));
  assert.ok(ids.includes("malaysia"));

  for (const dest of STUDY_DESTINATIONS) {
    assert.ok(dest.countryBn.length > 0);
    assert.ok(dest.countryEn.length > 0);
    assert.ok(dest.avgTuitionBdtPerYear.length > 0);
    assert.ok(dest.blockedAccountOrSolvency.length > 0);
    assert.ok(dest.workRightsBn.length > 0);
    assert.ok(dest.popularUniversities.length > 0);
    assert.ok(dest.officialPortalUrl.startsWith("https://"));
  }
});

test("PACE_TRACKS defines 6-mo fast track, 12-mo standard, and 24-mo long term roadmaps", () => {
  const ids = PACE_TRACKS.map((p) => p.id);
  assert.deepEqual(ids, ["fast_track", "standard", "long_term"]);

  for (const track of PACE_TRACKS) {
    assert.ok(track.milestones.length > 0);
    for (const m of track.milestones) {
      assert.ok(m.titleBn.length > 0);
      assert.ok(m.tasksBn.length > 0);
      assert.ok(["tests", "documents", "applications", "visa", "profile"].includes(m.category));
    }
  }
});

test("STANDARDIZED_TESTS contains guidance for IELTS, Duolingo, SAT, and GRE", () => {
  const names = STANDARDIZED_TESTS.map((t) => t.testName);
  assert.ok(names.some((n) => n.includes("IELTS")));
  assert.ok(names.some((n) => n.includes("Duolingo")));
  assert.ok(names.some((n) => n.includes("SAT")));
  assert.ok(names.some((n) => n.includes("GRE")));

  for (const t of STANDARDIZED_TESTS) {
    assert.ok(t.typicalMinScore.length > 0);
    assert.ok(t.competitiveScore.length > 0);
    assert.ok(t.preparationAdviceBn.length > 0);
  }
});

test("DOCUMENT_ATTESTATION_CHECKLIST includes essential official attestation steps", () => {
  const ids = DOCUMENT_ATTESTATION_CHECKLIST.map((d) => d.id);
  assert.ok(ids.includes("doc-passport"));
  assert.ok(ids.includes("doc-transcripts"));
  assert.ok(ids.includes("doc-mofa"));
  assert.ok(ids.includes("doc-bank"));
  assert.ok(ids.includes("doc-police"));
});

test("sanitizeForeignApplications handles valid and malformed objects", () => {
  assert.deepEqual(sanitizeForeignApplications(null), []);
  assert.deepEqual(sanitizeForeignApplications("invalid"), []);

  const raw = [
    {
      id: "app-1",
      universityName: "Technical University of Munich",
      country: "Germany",
      major: "Informatics",
      status: "applied",
      scholarshipApplied: true,
    },
    {
      bad: "row without id",
    },
  ];

  const sanitized = sanitizeForeignApplications(raw);
  assert.equal(sanitized.length, 1);
  assert.equal(sanitized[0].id, "app-1");
  assert.equal(sanitized[0].universityName, "Technical University of Munich");
  assert.equal(sanitized[0].status, "applied");
  assert.equal(sanitized[0].scholarshipApplied, true);
});

test("STUDY_DESTINATIONS includes South Korea, Australia, Nordic Countries, and Turkey", () => {
  const ids = STUDY_DESTINATIONS.map((d) => d.id);
  assert.ok(ids.includes("south_korea"));
  assert.ok(ids.includes("australia"));
  assert.ok(ids.includes("nordic"));
  assert.ok(ids.includes("turkey"));
});

test("calculateSolvencyRequirement accurately computes required blocked account / living funds in BDT", () => {
  const ger = calculateSolvencyRequirement("germany");
  assert.equal(ger.country.countryId, "germany");
  assert.equal(ger.livingOriginal, 11904);
  assert.equal(ger.livingBdt, 11904 * 135);
  assert.ok(ger.grandTotalBdt > ger.livingBdt);

  const usa = calculateSolvencyRequirement("usa", 20000);
  assert.equal(usa.country.countryId, "usa");
  assert.equal(usa.tuitionBdt, 20000 * 125);
});

test("generateProfessorColdEmail generates a tailored, polite inquiry with paper and subject line", () => {
  const email = generateProfessorColdEmail({
    applicantName: "Nafis Ahmed",
    professorName: "Andrew Ng",
    universityName: "Stanford University",
    department: "Computer Science",
    paperOrResearchTopic: "Deep Learning in Medical Imaging",
    applicantBackground: "Machine Learning and Biomedical Engineering",
    intendedDegree: "MS",
    intendedTerm: "Fall 2027",
  });

  assert.ok(email.subject.includes("Prospective MS Student Inquiry"));
  assert.ok(email.subject.includes("Nafis Ahmed"));
  assert.ok(email.body.includes("Dear Dr. Andrew Ng"));
  assert.ok(email.body.includes("Stanford University"));
  assert.ok(email.body.includes("Deep Learning in Medical Imaging"));
  assert.ok(email.body.includes("Fall 2027"));
});

