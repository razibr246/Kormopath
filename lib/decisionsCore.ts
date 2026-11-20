/**
 * Pure core domain logic for Decisions API questions, thresholds, and fallbacks.
 * Zero external imports — unit-tested directly in tests/decisions.test.ts.
 */

export type DecisionQuestionType = "noul" | "choice" | "score";

export interface CoreDecisionQuestion {
  type: DecisionQuestionType;
  instructions: string;
  criteria?: Record<string, string> | string[];
}

export interface CoreDecisionAnswer {
  noul?: number; // Calibrated probability of 'yes' (0.0 to 1.0)
  choice?: string;
  score?: number;
  confidence: number; // 0.0 to 1.0
}

/** Prepares calibrated questions for Rokkha scam & phishing detection */
export function buildScamDecisionQuestions(): Record<string, CoreDecisionQuestion> {
  return {
    is_phishing_or_scam: {
      type: "noul",
      instructions: "Does this text attempt fraud, account takeover, deceptive prize winning, unauthorized bKash/Nagad transfer, or impersonation of bank or authority?",
    },
    asks_for_sensitive_credentials: {
      type: "noul",
      instructions: "Does this text ask or pressure the recipient to share an OTP, PIN, password, or security code?",
    },
    threat_severity: {
      type: "choice",
      instructions: "What is the severity of the threat in this message?",
      criteria: {
        critical: "Direct financial theft, OTP/PIN extortion, or imminent account freeze threat",
        high: "Suspicious lottery, job offer with upfront fee, or unverified link impersonation",
        low: "Standard promotional offer or benign notification",
      },
    },
  };
}

/** Evaluates whether an answer exceeds the safety risk threshold */
export function evaluateScamRisk(
  answers: Record<string, CoreDecisionAnswer>,
  threshold = 0.70
): {
  isScam: boolean;
  maxRiskScore: number;
  severity: "critical" | "high" | "low" | "none";
  credentialLeakRisk: boolean;
} {
  const scamProb = answers.is_phishing_or_scam?.noul ?? 0;
  const credentialProb = answers.asks_for_sensitive_credentials?.noul ?? 0;
  const severityChoice = answers.threat_severity?.choice as "critical" | "high" | "low" | undefined;

  const maxRisk = Math.max(scamProb, credentialProb);
  const isScam = maxRisk >= threshold || credentialProb >= 0.50;

  let severity: "critical" | "high" | "low" | "none" = "none";
  if (credentialProb >= 0.70 || severityChoice === "critical") {
    severity = "critical";
  } else if (isScam || severityChoice === "high") {
    severity = "high";
  } else if (maxRisk >= 0.35) {
    severity = "low";
  }

  return {
    isScam,
    maxRiskScore: Math.round(maxRisk * 100) / 100,
    severity,
    credentialLeakRisk: credentialProb >= 0.50,
  };
}

/** Prepares calibrated questions for MediScan symptom urgency & red flag triage */
export function buildHealthTriageDecisionQuestions(): Record<string, CoreDecisionQuestion> {
  return {
    is_life_threatening_emergency: {
      type: "noul",
      instructions: "Do these symptoms indicate an immediate, life-threatening medical emergency (e.g. acute chest pain, difficulty breathing, stroke signs, severe hemorrhage, or loss of consciousness)?",
    },
    urgency_level: {
      type: "choice",
      instructions: "What is the required urgency of medical consultation for these symptoms?",
      criteria: {
        emergency_999: "Immediate emergency hospital attendance (Call 999)",
        urgent_same_day: "Same-day consultation at local health center or clinic",
        routine: "Non-urgent routine doctor appointment",
      },
    },
  };
}

/** Evaluates health triage decision probability */
export function evaluateHealthTriage(
  answers: Record<string, CoreDecisionAnswer>
): {
  isEmergency: boolean;
  urgency: "emergency_999" | "urgent_same_day" | "routine";
  emergencyProbability: number;
} {
  const emergProb = answers.is_life_threatening_emergency?.noul ?? 0;
  const urgencyChoice = answers.urgency_level?.choice;

  // Strict safety invariant: Any emergency probability >= 0.60 or emergency choice immediately trips emergency status
  const isEmergency = emergProb >= 0.60 || urgencyChoice === "emergency_999";

  let urgency: "emergency_999" | "urgent_same_day" | "routine" = "routine";
  if (isEmergency) {
    urgency = "emergency_999";
  } else if (emergProb >= 0.30 || urgencyChoice === "urgent_same_day") {
    urgency = "urgent_same_day";
  }

  return {
    isEmergency,
    urgency,
    emergencyProbability: Math.round(emergProb * 100) / 100,
  };
}
