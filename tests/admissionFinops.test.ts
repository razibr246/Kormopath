import test from "node:test";
import assert from "node:assert/strict";
import {
  UNIT_FORM_FEES,
  calculateAdmissionBudget,
  CALCULATOR_POLICIES,
  EXAM_DAY_PACKING,
  THREE_PASS_HALL_STRATEGY,
} from "../lib/admissionFinops.ts";

test("UNIT_FORM_FEES contains major university clusters with non-zero fee estimates", () => {
  assert.ok(UNIT_FORM_FEES.length >= 10);
  for (const item of UNIT_FORM_FEES) {
    assert.ok(item.estimatedFeeBdt > 0, `Fee should be positive for ${item.universityShort}`);
    assert.ok(item.unitNameBn.length > 0);
    assert.ok(item.centerLocations.length > 0);
  }

  const buet = UNIT_FORM_FEES.find((u) => u.universityShort === "BUET");
  assert.ok(buet);
  assert.equal(buet.requiresTravelFromOutsideDhaka, true);

  const du = UNIT_FORM_FEES.find((u) => u.universityShort === "DU");
  assert.ok(du);
  assert.equal(du.requiresTravelFromOutsideDhaka, false); // 8 divisional centers
});

test("calculateAdmissionBudget handles zero travel and calculates accurate sums", () => {
  const result = calculateAdmissionBudget({
    selectedUnits: ["DU 'ক' ইউনিট (বিজ্ঞান)", "Medical MBBS কেন্দ্রীয় ভর্তি"],
    applicantHomeDistrict: "ঢাকা",
    lodgingType: "relatives",
    numberOfExamsRequiringTravel: 0,
    mockTestBudgetBdt: 1500,
    booksAndQuestionBanksBdt: 2000,
  });

  assert.equal(result.totalTravelBdt, 0);
  assert.equal(result.totalLodgingBdt, 0);
  assert.ok(result.totalFormFeesBdt > 0);
  assert.equal(result.academicMaterialsBdt, 3500);
  assert.ok(result.grandTotalBdt > result.totalFormFeesBdt);
  assert.ok(result.tipsBn.length > 0);
});

test("calculateAdmissionBudget includes travel and hotel lodging for outside-Dhaka applicant", () => {
  const result = calculateAdmissionBudget({
    selectedUnits: ["BUET প্রকৌশল ও স্থাপত্য", "CKRUET ইঞ্জিনিয়ারিং গুচ্ছ"],
    applicantHomeDistrict: "রংপুর",
    lodgingType: "hotel",
    numberOfExamsRequiringTravel: 2,
    mockTestBudgetBdt: 0,
    booksAndQuestionBanksBdt: 0,
  });

  // 2 exams * 1400 = 2800
  assert.equal(result.totalTravelBdt, 2800);
  // 2 exams * 1800 hotel = 3600
  assert.equal(result.totalLodgingBdt, 3600);
  assert.ok(result.grandTotalBdt > result.totalFormFeesBdt + result.totalTravelBdt + result.totalLodgingBdt);
});

test("CALCULATOR_POLICIES clearly separates allowed vs banned institutions", () => {
  const buetPolicy = CALCULATOR_POLICIES.find((p) => p.university.includes("BUET"));
  assert.ok(buetPolicy);
  assert.equal(buetPolicy.isAllowed, true);
  assert.ok(buetPolicy.approvedModels.some((m) => m.includes("991EX") || m.includes("991MS")));

  const duPolicy = CALCULATOR_POLICIES.find((p) => p.university.includes("DU"));
  assert.ok(duPolicy);
  assert.equal(duPolicy.isAllowed, false);
  assert.equal(duPolicy.approvedModels.length, 0);

  const medPolicy = CALCULATOR_POLICIES.find((p) => p.university.includes("মেডিকেল"));
  assert.ok(medPolicy);
  assert.equal(medPolicy.isAllowed, false);
});

test("EXAM_DAY_PACKING and THREE_PASS_HALL_STRATEGY have required items and phases", () => {
  assert.ok(EXAM_DAY_PACKING.length >= 6);
  const admitCard = EXAM_DAY_PACKING.find((i) => i.id === "p-admit");
  assert.ok(admitCard);
  assert.equal(admitCard.mandatory, true);

  assert.equal(THREE_PASS_HALL_STRATEGY.length, 3);
  assert.ok(THREE_PASS_HALL_STRATEGY[0].phaseBn.includes("১ম রাউন্ড"));
  assert.ok(THREE_PASS_HALL_STRATEGY[1].phaseBn.includes("২য় রাউন্ড"));
  assert.ok(THREE_PASS_HALL_STRATEGY[2].phaseBn.includes("৩য় রাউন্ড"));
});
