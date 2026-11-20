import test from "node:test";
import assert from "node:assert/strict";
import {
  buildScamDecisionQuestions,
  evaluateScamRisk,
  buildHealthTriageDecisionQuestions,
  evaluateHealthTriage,
} from "../lib/decisionsCore.ts";

test("Decisions API: buildScamDecisionQuestions produces required calibrated criteria", () => {
  const q = buildScamDecisionQuestions();
  assert.equal(q.is_phishing_or_scam.type, "noul");
  assert.equal(q.asks_for_sensitive_credentials.type, "noul");
  assert.equal(q.threat_severity.type, "choice");
  assert.ok(q.threat_severity.criteria && typeof q.threat_severity.criteria === "object");
});

test("Decisions API: evaluateScamRisk detects high-probability scam and flags credential extortion", () => {
  // Case 1: High probability scam asking for OTP
  const res1 = evaluateScamRisk({
    is_phishing_or_scam: { noul: 0.92, confidence: 0.95 },
    asks_for_sensitive_credentials: { noul: 0.88, confidence: 0.90 },
    threat_severity: { choice: "critical", confidence: 0.92 },
  });
  assert.equal(res1.isScam, true);
  assert.equal(res1.severity, "critical");
  assert.equal(res1.credentialLeakRisk, true);
  assert.equal(res1.maxRiskScore, 0.92);

  // Case 2: Benign promotion message
  const res2 = evaluateScamRisk({
    is_phishing_or_scam: { noul: 0.08, confidence: 0.98 },
    asks_for_sensitive_credentials: { noul: 0.01, confidence: 0.99 },
    threat_severity: { choice: "low", confidence: 0.85 },
  });
  assert.equal(res2.isScam, false);
  assert.equal(res2.severity, "none");
  assert.equal(res2.credentialLeakRisk, false);
  assert.equal(res2.maxRiskScore, 0.08);
});

test("Decisions API: buildHealthTriageDecisionQuestions defines life-threatening safety parameters", () => {
  const q = buildHealthTriageDecisionQuestions();
  assert.equal(q.is_life_threatening_emergency.type, "noul");
  assert.equal(q.urgency_level.type, "choice");
});

test("Decisions API: evaluateHealthTriage enforces safety fail-safe for acute symptoms", () => {
  // Case 1: High emergency probability trips emergency 999
  const res1 = evaluateHealthTriage({
    is_life_threatening_emergency: { noul: 0.85, confidence: 0.94 },
    urgency_level: { choice: "emergency_999", confidence: 0.90 },
  });
  assert.equal(res1.isEmergency, true);
  assert.equal(res1.urgency, "emergency_999");
  assert.equal(res1.emergencyProbability, 0.85);

  // Case 2: Routine mild symptom
  const res2 = evaluateHealthTriage({
    is_life_threatening_emergency: { noul: 0.05, confidence: 0.96 },
    urgency_level: { choice: "routine", confidence: 0.88 },
  });
  assert.equal(res2.isEmergency, false);
  assert.equal(res2.urgency, "routine");
  assert.equal(res2.emergencyProbability, 0.05);

  // Case 3: Moderate symptom requiring same-day visit
  const res3 = evaluateHealthTriage({
    is_life_threatening_emergency: { noul: 0.35, confidence: 0.80 },
    urgency_level: { choice: "urgent_same_day", confidence: 0.75 },
  });
  assert.equal(res3.isEmergency, false);
  assert.equal(res3.urgency, "urgent_same_day");
});
