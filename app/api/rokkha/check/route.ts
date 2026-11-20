import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { checkRateLimitShared, rateLimitResponse } from "@/lib/rateLimit";
import { Tracer } from "@/lib/trace";
import { checkMessage } from "@/lib/rokkha";
import {
  decide,
  buildScamDecisionQuestions,
  evaluateScamRisk,
} from "@/lib/decisions";

export const runtime = "nodejs";
export const maxDuration = 15;

const CheckSchema = z.object({
  message: z.string().min(1).max(3000),
});

export async function POST(req: NextRequest) {
  // 1. Rate Limiter (20 checks per minute per IP)
  const rl = await checkRateLimitShared(req, {
    limit: 20,
    windowMs: 60_000,
    bucket: "rokkha-check",
  });
  if (!rl.success) {
    return rateLimitResponse(rl.limit, rl.resetSeconds, rl.store);
  }

  // 2. Validate input
  let rawBody: unknown;
  try {
    rawBody = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = CheckSchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json({ error: "যাচাই করার জন্য টেক্সট প্রদান করুন।" }, { status: 400 });
  }

  const text = parsed.data.message.trim();
  const tracer = new Tracer("Rokkha Shield");

  // 3. Always run deterministic rule check first
  const ruleCheck = checkMessage(text);
  tracer.log(
    "rule-engine",
    ruleCheck.hits.length > 0
      ? `Matched ${ruleCheck.hits.length} known scam patterns: ${ruleCheck.hits.map((h) => h.id).join(", ")}`
      : "No known regex patterns found (unverified, not guaranteed safe)",
    ruleCheck.hits.length > 0 ? "warn" : "ok"
  );

  // 4. Run Gemini Decisions API for calibrated AI verification
  const decisionQuestions = buildScamDecisionQuestions();
  const decisionResult = await decide(
    tracer,
    {
      input: text,
      questions: decisionQuestions,
    },
    {
      fallback: () => ({
        is_phishing_or_scam: {
          noul: ruleCheck.hits.length > 0 ? 0.90 : 0.05,
          confidence: 0.85,
        },
        asks_for_sensitive_credentials: {
          noul: ruleCheck.hits.some((h) => h.id === "otp_pin") ? 0.95 : 0.02,
          confidence: 0.90,
        },
        threat_severity: {
          choice: ruleCheck.hits.some((h) => h.id === "otp_pin")
            ? "critical"
            : ruleCheck.hits.length > 0
            ? "high"
            : "low",
          confidence: 0.85,
        },
      }),
      timeoutMs: 6000,
    }
  );

  const evaluation = decisionResult
    ? evaluateScamRisk(decisionResult.answers)
    : {
        isScam: ruleCheck.hits.length > 0,
        maxRiskScore: ruleCheck.hits.length > 0 ? 0.85 : 0.0,
        severity: (ruleCheck.hits.some((h) => h.id === "otp_pin")
          ? "critical"
          : ruleCheck.hits.length > 0
          ? "high"
          : "none") as "critical" | "high" | "low" | "none",
        credentialLeakRisk: ruleCheck.hits.some((h) => h.id === "otp_pin"),
      };

  tracer.log(
    "risk-evaluation",
    `Final risk verdict: ${evaluation.isScam ? "SCAM FLAGGED" : "UNCONFIRMED"} (Score: ${evaluation.maxRiskScore}, Severity: ${evaluation.severity})`,
    evaluation.isScam ? "warn" : "ok"
  );

  return NextResponse.json({
    ruleCheck: {
      hitsCount: ruleCheck.hits.length,
      hits: ruleCheck.hits,
      summaryBn: ruleCheck.summaryBn,
      summaryEn: ruleCheck.summaryEn,
    },
    aiDecision: {
      calibrated: decisionResult?.calibrated ?? false,
      isScam: evaluation.isScam,
      riskScore: evaluation.maxRiskScore,
      severity: evaluation.severity,
      credentialLeakRisk: evaluation.credentialLeakRisk,
      engine: decisionResult?.model ?? "deterministic-fallback",
    },
    trace: tracer.steps,
  });
}
