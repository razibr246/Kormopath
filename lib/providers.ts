import "server-only";
import type { Tracer } from "./trace";
import { attemptPlan, createCooldown, RATE_LIMIT_COOLDOWN_MS, TIMEOUT_COOLDOWN_MS } from "./cooldown";

/*
 * Extra text providers behind Gemini, both OpenAI-compatible chat completions with JSON mode:
 *   Groq       (GROQ_API_KEYS / GROQ_API_KEY)             fastest; answers in about a second
 *   OpenRouter (OPENROUTER_API_KEYS / OPENROUTER_API_KEY)  free models, the last resort
 * Keys are tried in order with the same cooldown rules as Gemini (a refused key goes last for 30 minutes; a
 * rate-limited or slow model goes last for a few minutes). Keys are never logged. Every attempt is in the trace.
 * Text only: images, PDFs and speech stay on Gemini.
 */

export interface Provider {
  id: "groq" | "openrouter";
  url: string;
  keys: () => string[];
  models: () => string[];
  extra?: (model: string) => Record<string, unknown>;
  headers?: Record<string, string>;
}

const list = (...vals: Array<string | undefined>) =>
  [...new Set(vals.flatMap((v) => (v ?? "").split(",")).map((k) => k.trim()).filter(Boolean))];

export const GROQ: Provider = {
  id: "groq",
  url: "https://api.groq.com/openai/v1/chat/completions",
  keys: () => list(process.env.GROQ_API_KEY, process.env.GROQ_API_KEYS),
  // Checked against Groq's /models list on 2026-11-20. gpt-oss takes a reasoning effort; low keeps it fast.
  models: () => list(process.env.GROQ_MODEL, "openai/gpt-oss-120b", "qwen/qwen3.8-27b", "openai/gpt-oss-20b"),
  extra: (m) => (m.startsWith("openai/gpt-oss") ? { reasoning_effort: "low" } : {}),
};

export const OPENROUTER: Provider = {
  id: "openrouter",
  url: "https://openrouter.ai/api/v1/chat/completions",
  keys: () => list(process.env.OPENROUTER_API_KEY, process.env.OPENROUTER_API_KEYS),
  // Free models (":free"), checked against OpenRouter's /models list on 2026-11-20.
  models: () => list(process.env.OPENROUTER_MODEL, "google/gemma-4-31b-it:free", "google/gemma-4-26b-a4b-it:free", "nvidia/nemotron-3.5-lightning:free"),
  headers: { "HTTP-Referer": "https://kormopath.vercel.app", "X-Title": "KormoPath" },
};

export const providerAvailable = (p: Provider) => p.keys().length > 0;

const KEY_REFUSED_MS = 30 * 60_000;
const cool = { groq: { model: createCooldown(), key: createCooldown() }, openrouter: { model: createCooldown(), key: createCooldown() } };

class HttpError extends Error { constructor(public status: number, msg: string) { super(msg); } }

async function post(p: Provider, key: string, body: unknown, ms: number): Promise<string> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    const r = await fetch(p.url, {
      method: "POST",
      headers: { authorization: `Bearer ${key}`, "content-type": "application/json", ...(p.headers ?? {}) },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
    const text = await r.text();
    if (!r.ok) {
      let msg = `HTTP ${r.status}`;
      try { msg += `: ${String(JSON.parse(text)?.error?.message ?? "").slice(0, 140)}`; } catch { /* not JSON */ }
      throw new HttpError(r.status, msg);
    }
    const j = JSON.parse(text);
    const content = j?.choices?.[0]?.message?.content;
    if (typeof content !== "string" || !content.trim()) throw new HttpError(0, "empty reply");
    return content;
  } catch (e) {
    if ((e as Error).name === "AbortError") throw new HttpError(0, "timed out");
    throw e;
  } finally {
    clearTimeout(t);
  }
}

/**
 * One JSON-mode chat call through a provider, trying models and keys in cooldown order within `budgetMs`.
 * Returns the raw text and model, or null when nothing answered (the caller falls back).
 */
export async function chatJSON(
  tracer: Tracer,
  p: Provider,
  system: string,
  prompt: string,
  budgetMs = 9_000,
  attemptMs = 6_000,
): Promise<{ raw: string; model: string } | null> {
  const keys = p.keys();
  if (!keys.length) return null;
  const c = cool[p.id];
  const { models, keyOrder } = attemptPlan(p.models(), keys.length, c.model, c.key);
  const deadline = performance.now() + budgetMs;
  const messages = [
    { role: "system", content: `${system}\nReturn only one JSON object, no other text.` },
    { role: "user", content: prompt },
  ];
  for (const model of models) {
    let limited = 0;
    for (const ki of keyOrder) {
      const left = deadline - performance.now();
      if (left < 800) { tracer.log(p.id, "Out of time before another attempt", "fail"); return null; }
      const t0 = performance.now();
      const label = keys.length > 1 ? ` (key ${ki + 1}/${keys.length})` : "";
      try {
        const raw = await post(p, keys[ki], { model, messages, response_format: { type: "json_object" }, temperature: 0.2, max_tokens: 1400, ...(p.extra?.(model) ?? {}) }, Math.min(attemptMs, left));
        tracer.log(`${p.id}:${model}`, `JSON call completed${label}`, "ok", Math.round(performance.now() - t0));
        c.model.clear(model); c.key.clear(String(ki));
        return { raw, model: `${p.id}/${model}` };
      } catch (e) {
        const err = e as HttpError;
        const ms = Math.round(performance.now() - t0);
        if (err.status === 401 || err.status === 403) { c.key.mark(String(ki), KEY_REFUSED_MS); tracer.log(`${p.id}:${model}`, `Key refused${label}; trying the next key`, "warn", ms); continue; }
        if (err.status === 429) { tracer.log(`${p.id}:${model}`, `Rate limited${label}; trying the next key`, "warn", ms); if (++limited === keyOrder.length) c.model.mark(model, RATE_LIMIT_COOLDOWN_MS); continue; }
        if (err.status === 404 || err.status === 400) { tracer.log(`${p.id}:${model}`, `${err.message}; trying the next model`, "warn", ms); break; }
        tracer.log(`${p.id}:${model}`, `${err.message}; trying the next model`, "warn", ms);
        if (err.message === "timed out" || err.status >= 500) c.model.mark(model, TIMEOUT_COOLDOWN_MS);
        break;
      }
    }
  }
  tracer.log(p.id, "No model or key answered", "fail");
  return null;
}
