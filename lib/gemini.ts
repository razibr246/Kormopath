import "server-only";
import type { Tracer } from "./trace";
import { attemptPlan, createCooldown, rotateKeys, RATE_LIMIT_COOLDOWN_MS, TIMEOUT_COOLDOWN_MS } from "./cooldown";
let roundRobin = 0;
import { apiVersionFor } from "./geminiVersion";
export { apiVersionFor };

// Per server instance: a model that was just rate-limited on every key, or timed out, is tried
// last for a few minutes so each request does not pay the same wait again. See lib/cooldown.ts.
const cooldown = createCooldown();
// A key refused with 401/403 is revoked or invalid for every model, so it is tried last for a while instead of
// costing each request a round trip first. Still tried if every other key fails; never logged by value.
export const KEY_REJECTED_COOLDOWN_MS = 30 * 60_000;
const keyCooldown = createCooldown();

/*
 * Gemini Interactions API client (POST /v1/interactions; v1beta for TTS).
 * One place for keys, models, failover and response parsing, so every route behaves the same.
 *
 * Failover, logged step by step in the route's trace:
 *  - 404 (model not offered to this key)          -> next model
 *  - 401/403 (key rejected)                       -> next key
 *  - 429 (quota or rate limit for this key)       -> next key, then next model
 *  - 500/504 or network error                     -> retry the same model once, then next model
 *  - 503 (model under high demand)                -> next model (retried once only if it is the last)
 *  - 429 on every key, or a timeout               -> model is tried last for a while (lib/cooldown.ts)
 * Interactions are never stored on Google's side (store: false), which matters for MediScan.
 */

const BASE = "https://generativelanguage.googleapis.com";
const API_REVISION = "2026-05-20";

// Retired generations (generateContent-era names) are skipped even if an old env var still names
// them, and the current models are always appended, so a stale deployment setting cannot break AI.
const RETIRED = /^gemini-(1\.|2\.|flash-lite-latest$|flash-latest$)/;
const chain = (...names: Array<string | undefined>) => [...new Set(names.map((n) => n?.trim()).filter((n): n is string => Boolean(n) && !RETIRED.test(n!)))];
export const TEXT_MODELS = chain(process.env.GEMINI_MODEL, process.env.GEMINI_FALLBACK_MODEL, "gemini-4-hydrogen", "gemini-4-argon", "gemini-3.5-flash-lite", "gemini-3.1-flash-lite");
export const REASONING_MODELS = chain(process.env.GEMINI_REASONING_MODEL, "gemini-4-carbon", "gemini-4-argon", "gemini-4-hydrogen");
export const TTS_MODELS = chain(process.env.GEMINI_TTS_MODEL, "gemini-3.8-flash-lite-tts", "gemini-3.8-flash-tts");
export const DECISION_MODELS = chain(process.env.GEMINI_DECISION_MODEL, "gemini-decision-1", "gemini-4-hydrogen", "gemini-3.5-flash-lite");
export const VISION_MODELS = chain(process.env.GEMINI_VISION_MODEL, "gemini-4-hydrogen", "gemini-4-carbon", "gemini-3.5-flash-lite");

/** GEMINI_API_KEY first, then any extra keys in GEMINI_API_KEYS (comma-separated). Never logged. */
export function geminiKeys(): string[] {
  const extra = (process.env.GEMINI_API_KEYS ?? "").split(",").map((k) => k.trim());
  return [...new Set([process.env.GEMINI_API_KEY?.trim() ?? "", ...extra].filter(Boolean))];
}
export const geminiAvailable = () => geminiKeys().length > 0;

export class GeminiError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export type InputPart =
  | { type: "text"; text: string }
  | { type: "image" | "document" | "audio"; data: string; mime_type: string };

/** A user turn with annotated text, e.g. TTS speech_metadata style hints. */
export type UserInputStep = {
  type: "user_input";
  content: Array<{ type: "text"; text: string; annotations?: Array<{ type: "speech_metadata"; style?: string; speaker?: string }> }>;
};

export interface InteractionRequest {
  input: string | InputPart[] | UserInputStep[];
  system_instruction?: string;
  tools?: Array<{ type: "google_search" }>;
  response_format?: Record<string, unknown>;
  generation_config?: Record<string, unknown>;
}

type Step = { type: string; content?: Array<{ type: string; text?: string; data?: string; mime_type?: string; annotations?: Array<Record<string, unknown>> }> };
export type Interaction = { status?: string; steps?: Step[]; model?: string };

async function post(path: string, key: string, body: unknown, timeoutMs: number): Promise<Interaction> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(`${BASE}${path}`, {
      method: "POST",
      signal: ctrl.signal,
      headers: { "content-type": "application/json", "x-goog-api-key": key, "Api-Revision": API_REVISION },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const detail = await res.json().catch(() => null) as { error?: { message?: string } } | null;
      throw new GeminiError(res.status, `Gemini HTTP ${res.status}${detail?.error?.message ? `: ${String(detail.error.message).slice(0, 120)}` : ""}`);
    }
    return (await res.json()) as Interaction;
  } catch (e) {
    if (e instanceof GeminiError) throw e;
    throw new GeminiError(0, (e as Error).name === "AbortError" ? "Gemini timed out" : "Gemini network error");
  } finally {
    clearTimeout(timer);
  }
}


/**
 * Runs one interaction across models and keys. Returns the response and the model that answered,
 * or null when nothing worked; every attempt is in the trace.
 */
export async function interact(
  tracer: Tracer,
  request: InteractionRequest,
  options: { models?: string[]; apiVersion?: "v1" | "v1beta"; timeoutMs?: number; attemptMs?: number; label?: string } = {},
): Promise<{ data: Interaction; model: string } | null> {
  const keys = geminiKeys();
  if (!keys.length) {
    tracer.log("gemini", "No GEMINI_API_KEY set", "fallback");
    return null;
  }
  const plan = attemptPlan(options.models ?? TEXT_MODELS, keys.length, cooldown, keyCooldown);
  const { models, deferredKeys } = plan;
  // Share the load across the key pool: each request starts at the next healthy key.
  const keyOrder = rotateKeys(plan.keyOrder, deferredKeys, roundRobin++);
  if (deferredKeys.length) tracer.log("gemini", `${deferredKeys.length} key(s) refused recently; tried last`, "warn");
  for (const model of models) {
    const left = cooldown.remainingMs(model);
    if (left > 0) tracer.log(model, `Failed recently (rate limit or timeout); tried last for ${Math.ceil(left / 1000)} s more`, "warn");
  }
  // Image, document and audio inputs are only accepted on v1beta ("The value 'image' is not supported for
  // 'input[n].type' in v1, it is available in v1beta"), so file requests go there; text stays on v1.
  const path = `/${options.apiVersion ?? apiVersionFor(request)}/interactions`;
  // Total budget stays inside the route time limit (~30 s). Each attempt is capped so a slow
  // primary model still leaves time for the lighter fallback model.
  const timeoutMs = Math.min(options.timeoutMs ?? 26_000, 40_000);
  const attemptMs = options.attemptMs ?? 12_000;
  const started = performance.now();
  const deadline = started + timeoutMs;
  let attempts = 0, rejected = 0;

  for (let m = 0; m < models.length; m++) {
    const model = models[m];
    let retried = false;
    let rateLimited = 0;
    for (let k = 0; k < keys.length; k++) {
      const remaining = deadline - performance.now();
      if (remaining < 2_000) { tracer.log(model, "Out of time before another attempt", "fail"); return null; }
      const t0 = performance.now();
      const ki = keyOrder[k];
      const keyLabel = keys.length > 1 ? ` (key ${ki + 1}/${keys.length})` : "";
      try {
        // The last model may use all remaining time; earlier ones are capped.
        const budget = m === models.length - 1 ? remaining : Math.min(attemptMs, remaining);
        const data = await post(path, keys[ki], { model, store: false, ...request }, budget);
        tracer.log(model, `${options.label ?? "Interaction"} completed${keyLabel}`, "ok", Math.round(performance.now() - t0));
        cooldown.clear(model);
        keyCooldown.clear(String(ki));
        return { data, model };
      } catch (e) {
        const err = e as GeminiError;
        const ms = Math.round(performance.now() - t0);
        attempts++;
        if (err.status === 401 || err.status === 403) { rejected++; keyCooldown.mark(String(ki), KEY_REJECTED_COOLDOWN_MS); tracer.log(model, `Key rejected${keyLabel}; trying the next key`, "warn", ms); continue; }
        if (err.status === 429) {
          tracer.log(model, `Quota or rate limit${keyLabel}; trying the next key`, "warn", ms);
          if (++rateLimited === keys.length) cooldown.mark(model, RATE_LIMIT_COOLDOWN_MS);
          continue;
        }
        if (err.status === 404) { tracer.log(model, `Model not available to this key${keyLabel}; trying the next model`, "warn", ms); break; }
        // Retry once on a server error; a timeout goes straight to the next (lighter) model, and so
        // does 503 ("high demand" for this model) unless no other model is left to try.
        const lastModel = m === models.length - 1;
        if (((err.status >= 500 && (err.status !== 503 || lastModel)) || (err.status === 0 && err.message !== "Gemini timed out")) && !retried) {
          retried = true;
          tracer.log(model, `${err.message}; retrying once`, "warn", ms);
          await new Promise((r) => setTimeout(r, 600));
          k--; // same key again
          continue;
        }
        tracer.log(model, `${err.message}; trying the next model`, "warn", ms);
        // A timeout or "high demand" (503) means the next request would likely wait the same way: try it last for a while.
        if (err.message === "Gemini timed out" || err.status === 503) cooldown.mark(model, TIMEOUT_COOLDOWN_MS);
        break;
      }
    }
  }
  if (attempts > 0 && rejected === attempts) {
    // Every attempt was refused (401/403): the deployment's key is invalid or revoked, not a model outage.
    tracer.log("gemini", "Every API key was rejected (401/403): GEMINI_API_KEY in this deployment is invalid or revoked — fix it in the hosting settings", "fail", Math.round(performance.now() - started));
    console.error("[gemini] all API keys rejected (401/403); check GEMINI_API_KEY / GEMINI_API_KEYS in the deployment settings");
    return null;
  }
  tracer.log("gemini", "No model or key could answer", "fail", Math.round(performance.now() - started));
  return null;
}

/** Final text: the text parts of the model_output steps, joined. */
export function outputText(data: Interaction): string {
  return (data.steps ?? [])
    .filter((s) => s.type === "model_output")
    .flatMap((s) => s.content ?? [])
    .filter((c) => c.type === "text" && typeof c.text === "string")
    .map((c) => c.text as string)
    .join("")
    .trim();
}

/** url_citation annotations from search-grounded answers, de-duplicated and limited to http(s) links. */
export function citations(data: Interaction, limit = 8): Array<{ title: string; url: string }> {
  const out: Array<{ title: string; url: string }> = [];
  for (const step of data.steps ?? []) {
    if (step.type !== "model_output") continue;
    for (const c of step.content ?? []) {
      for (const a of c.annotations ?? []) {
        if (a.type !== "url_citation" || typeof a.url !== "string") continue;
        try {
          const url = new URL(a.url);
          if ((url.protocol !== "https:" && url.protocol !== "http:") || url.username || url.password) continue;
          if (out.some((x) => x.url === url.href)) continue;
          out.push({ url: url.href, title: String(typeof a.title === "string" && a.title ? a.title : url.hostname).slice(0, 160) });
        } catch { /* skip malformed links */ }
      }
    }
  }
  return out.slice(0, limit);
}

/** Last audio part (TTS returns audio/wav with a RIFF header by default). */
export function outputAudio(data: Interaction): { data: string; mimeType: string } | null {
  const audio = (data.steps ?? [])
    .filter((s) => s.type === "model_output")
    .flatMap((s) => s.content ?? [])
    .filter((c) => c.type === "audio" && typeof c.data === "string")
    .at(-1);
  return audio ? { data: audio.data as string, mimeType: audio.mime_type || "audio/wav" } : null;
}

/** True when a failed run hit quota limits (e.g. web search not included in the account's tier). */
export function quotaExhausted(tracer: Tracer): boolean {
  return tracer.steps.some((s) => s.detail.startsWith("Quota or rate limit")) && !tracer.steps.some((s) => s.status === "ok");
}

/** Web-search-grounded plain-text answer with cited sources. */
export async function groundedSearch(
  tracer: Tracer,
  prompt: string,
  system?: string,
): Promise<{ ok: true; answer: string; sources: Array<{ title: string; url: string }>; model: string } | { ok: false; reason: "quota" | "failed" | "empty" }> {
  const res = await interact(tracer, {
    input: prompt,
    ...(system ? { system_instruction: system } : {}),
    tools: [{ type: "google_search" }],
    generation_config: { thinking_level: "low", max_output_tokens: 1800 },
  }, { label: "Search-grounded answer", timeoutMs: 38_000, attemptMs: 20_000 });
  if (!res) return { ok: false, reason: quotaExhausted(tracer) ? "quota" : "failed" };
  const answer = outputText(res.data);
  if (!answer) return { ok: false, reason: "empty" };
  const sources = citations(res.data, 10);
  tracer.log(res.model, `Search returned ${sources.length} cited sources`, sources.length ? "ok" : "warn");
  return { ok: true, answer, sources, model: res.model };
}

/** Bangla message for a failed search, so the UI never pretends results exist. */
export const SEARCH_ERROR_BN: Record<"quota" | "failed" | "empty", string> = {
  quota: "ওয়েব খোঁজার কোটা এখন শেষ (Google অ্যাকাউন্টের সীমা)। একটু পরে আবার চেষ্টা করুন।",
  failed: "এখন ওয়েবে খোঁজা যাচ্ছে না। একটু পরে আবার চেষ্টা করুন।",
  empty: "কোনো ফলাফল পাওয়া যায়নি। অন্য শব্দে খুঁজে দেখুন।",
};
