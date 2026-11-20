import "server-only";
import { createHash } from "crypto";
import { z } from "zod";
import { Tracer } from "./trace";
import { TEXT_MODELS, geminiAvailable, interact, outputText, type InputPart } from "./gemini";
import { LruCache, hedge, runStructured, type StructuredResult } from "./structuredCore";
import { GROQ, OPENROUTER, chatJSON, providerAvailable } from "./providers";

const MODEL = TEXT_MODELS[0];
// Per-instance cache, so identical requests never hit the API twice. Bounded (LRU) so a long-lived server instance
// cannot grow it without limit. Sensitive routes pass cache: false and are never stored.
export const LLM_CACHE_MAX = 500;
const cache = new LruCache<StructuredResult<unknown>>(LLM_CACHE_MAX);

export const llmAvailable = () => geminiAvailable() || providerAvailable(GROQ) || providerAvailable(OPENROUTER);

/** How long Groq gets alone before Gemini is started in parallel (ms). Groq usually answers in about a second. */
const HEDGE_MS = Math.max(0, Number(process.env.LLM_HEDGE_MS ?? 1500) || 1500);
export const modelName = () => MODEL;

export interface FilePart {
  mimeType: string;
  base64: string;
}

/**
 * One JSON-mode call through the shared Interactions client (lib/gemini.ts), which handles
 * model and key failover and logs every attempt to the trace.
 */
async function callGemini(tracer: Tracer, system: string, prompt: string, file?: FilePart): Promise<{ raw: string; model: string } | null> {
  const input: InputPart[] | string = file
    ? [{ type: "text", text: prompt }, { type: file.mimeType === "application/pdf" ? "document" : "image", data: file.base64, mime_type: file.mimeType }]
    : prompt;
  const res = await interact(tracer, {
    input,
    system_instruction: system,
    response_format: { type: "text", mime_type: "application/json" },
    generation_config: { thinking_level: "low" },
  }, { label: "JSON call" });
  if (!res) return null;
  const raw = outputText(res.data);
  if (!raw) {
    tracer.log(res.model, "Model returned no text", "fail");
    return null;
  }
  return { raw, model: res.model };
}

/**
 * The fastest valid answer from every configured provider, with every attempt in the trace:
 * text goes to Groq first (about a second); if Groq has not answered within HEDGE_MS, Gemini starts in parallel and
 * the first answer wins; if both fail, OpenRouter's free models are the last resort. Files (images, PDFs) need
 * Gemini. Whatever answers is validated by the caller's Zod schema and guards exactly the same way.
 */
async function callWithRetry(tracer: Tracer, system: string, prompt: string, file?: FilePart): Promise<{ raw: string; model: string } | null> {
  if (file) return geminiAvailable() ? callGemini(tracer, system, prompt, file) : null;
  const groq = providerAvailable(GROQ) ? () => chatJSON(tracer, GROQ, system, prompt) : null;
  const gemini = geminiAvailable() ? () => callGemini(tracer, system, prompt) : null;
  const first = groq ?? gemini;
  const second = groq && gemini ? gemini : null;
  if (first) {
    const won = await hedge(first, second, HEDGE_MS, (why) =>
      tracer.log("hedge", why === "slow" ? `Groq slower than ${HEDGE_MS} ms; Gemini started in parallel` : "Groq failed; Gemini started", "warn"),
    );
    if (won) {
      if (second) tracer.log("hedge", `Fastest valid answer from ${won.value.model}`, "ok");
      return won.value;
    }
  }
  if (providerAvailable(OPENROUTER)) {
    tracer.log("openrouter", "Groq and Gemini gave no answer; trying OpenRouter free models", "fallback");
    return chatJSON(tracer, OPENROUTER, system, prompt, 12_000, 8_000);
  }
  return null;
}

/**
 * Ask the model for JSON, validate it with Zod, and if it fails, send the validation
 * errors back and ask for a corrected object once. Returns null if no valid output,
 * so callers always have a deterministic fallback.
 */
export async function structured<S extends z.ZodTypeAny>(
  tracer: Tracer,
  schema: S,
  system: string,
  prompt: string,
  file?: FilePart,
  options: { cache?: boolean } = {},
): Promise<{ data: z.infer<S>; raw: string; model: string } | null> {
  // Sensitive inputs (e.g. health documents) pass cache: false so nothing is kept in memory.
  const useCache = options.cache ?? true;
  if (!llmAvailable()) {
    tracer.log("llm", "No AI key set (Gemini, Groq or OpenRouter), using rule-based agent", "fallback");
    return null;
  }
  const key = createHash("sha256").update(system + prompt + (file?.base64 ?? "")).digest("hex");
  return runStructured<z.infer<S>>({
    prompt,
    key,
    cache: useCache ? (cache as LruCache<StructuredResult<z.infer<S>>>) : null,
    cacheLabel: MODEL,
    call: (p) => callWithRetry(tracer, system, p, file),
    validate: (value) => {
      const v = schema.safeParse(value);
      return v.success ? { success: true, data: v.data } : { success: false, issues: v.error.issues.map((i) => ({ path: i.path, message: i.message })) };
    },
    log: (tool, detail, status, ms) => tracer.log(tool, detail, status, ms),
    now: () => performance.now(),
  });
}
