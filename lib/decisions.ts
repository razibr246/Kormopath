import "server-only";
import { geminiKeys, geminiAvailable, DECISION_MODELS } from "./gemini";
import type { Tracer } from "./trace";
import {
  type CoreDecisionQuestion,
  type CoreDecisionAnswer,
  buildScamDecisionQuestions,
  evaluateScamRisk,
  buildHealthTriageDecisionQuestions,
  evaluateHealthTriage,
} from "./decisionsCore";

export type DecisionQuestion = CoreDecisionQuestion;
export type DecisionAnswer = CoreDecisionAnswer;

export {
  buildScamDecisionQuestions,
  evaluateScamRisk,
  buildHealthTriageDecisionQuestions,
  evaluateHealthTriage,
};

const BASE = "https://generativelanguage.googleapis.com";
const API_REVISION = "2026-05-20";

export interface DecisionsResult {
  answers: Record<string, DecisionAnswer>;
  model: string;
  calibrated: boolean;
}

export interface DecisionRequest {
  input: string | Array<{ type: string; text?: string; data?: string; mime_type?: string }>;
  questions: Record<string, DecisionQuestion>;
}

/**
 * Executes a calibrated decision evaluation using the Gemini Decisions API (gemini-decision-1).
 * Features:
 * - 0 output tokens: zero risk of text hallucination.
 * - Calibrated probabilities and confidence metrics.
 * - Always enforces store: false for strict user privacy.
 * - Automatic deterministic fallback when no API key is available or on network refusal.
 */
export async function decide(
  tracer: Tracer,
  request: DecisionRequest,
  options: {
    fallback?: () => Record<string, DecisionAnswer>;
    timeoutMs?: number;
  } = {}
): Promise<DecisionsResult | null> {
  const keys = geminiKeys();
  if (!keys.length) {
    tracer.log("decisions", "No GEMINI_API_KEY set; using deterministic rule fallback", "fallback");
    if (options.fallback) {
      return {
        answers: options.fallback(),
        model: "deterministic-rules",
        calibrated: false,
      };
    }
    return null;
  }

  const model = DECISION_MODELS[0] || "gemini-decision-1";
  const path = "/v1beta/decisions";
  const timeoutMs = options.timeoutMs ?? 10_000;
  const started = performance.now();

  for (let k = 0; k < keys.length; k++) {
    const key = keys[k];
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);

    try {
      const res = await fetch(`${BASE}${path}`, {
        method: "POST",
        signal: ctrl.signal,
        headers: {
          "content-type": "application/json",
          "x-goog-api-key": key,
          "Api-Revision": API_REVISION,
        },
        body: JSON.stringify({
          model,
          store: false, // Strict zero-PII privacy guarantee
          input: request.input,
          questions: request.questions,
        }),
      });

      clearTimeout(timer);

      if (!res.ok) {
        const errorText = await res.text().catch(() => "");
        tracer.log(model, `Decision HTTP ${res.status}: ${errorText.slice(0, 100)}`, "warn", Math.round(performance.now() - started));
        continue; // Try next key
      }

      const json = (await res.json()) as { answers?: Record<string, DecisionAnswer> };
      if (json && json.answers) {
        tracer.log(model, `Evaluated ${Object.keys(json.answers).length} calibrated questions`, "ok", Math.round(performance.now() - started));
        return {
          answers: json.answers,
          model,
          calibrated: true,
        };
      }
    } catch (err: unknown) {
      clearTimeout(timer);
      const isAbort = err instanceof Error && err.name === "AbortError";
      tracer.log(model, isAbort ? "Decisions API timed out" : "Decisions network error", "warn", Math.round(performance.now() - started));
    }
  }

  // If all keys or attempts fail, execute deterministic fallback
  if (options.fallback) {
    tracer.log("decisions", "Decisions API unavailable; executed deterministic rule fallback", "fallback");
    return {
      answers: options.fallback(),
      model: "deterministic-rules",
      calibrated: false,
    };
  }

  return null;
}
