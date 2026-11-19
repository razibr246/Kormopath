import "server-only";
import { createHash } from "crypto";
import { z } from "zod";
import { Tracer } from "./trace";
import { TEXT_MODELS, geminiAvailable, interact, outputText, type InputPart } from "./gemini";
import { LruCache, runStructured, type StructuredResult } from "./structuredCore";

const MODEL = TEXT_MODELS[0];
// Per-instance cache, so identical requests never hit the API twice. Bounded (LRU) so a long-lived server instance
// cannot grow it without limit. Sensitive routes pass cache: false and are never stored.
export const LLM_CACHE_MAX = 500;
const cache = new LruCache<StructuredResult<unknown>>(LLM_CACHE_MAX);

export const llmAvailable = () => geminiAvailable();
export const modelName = () => MODEL;

export interface FilePart {
  mimeType: string;
  base64: string;
}

/**
 * One JSON-mode call through the shared Interactions client (lib/gemini.ts), which handles
 * model and key failover and logs every attempt to the trace.
 */
async function callWithRetry(tracer: Tracer, system: string, prompt: string, file?: FilePart): Promise<{ raw: string; model: string } | null> {
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
    tracer.log("llm", "No GEMINI_API_KEY set, using rule-based agent", "fallback");
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
