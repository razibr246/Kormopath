import "server-only";
import { createHash } from "crypto";
import { z } from "zod";
import { Tracer } from "./trace";
import { TEXT_MODELS, geminiAvailable, interact, outputText, type InputPart } from "./gemini";

const MODEL = TEXT_MODELS[0];
const cache = new Map<string, unknown>(); // per-instance cache: identical requests never hit the API twice

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

function parseJson(text: string): unknown {
  const cleaned = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "");
  return JSON.parse(cleaned);
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
  if (useCache && cache.has(key)) {
    tracer.log(MODEL, "Served from cache (identical request seen before)", "ok");
    return cache.get(key) as { data: z.infer<S>; raw: string; model: string };
  }

  let lastErr = "";
  for (let attempt = 1; attempt <= 2; attempt++) {
    const p = attempt === 1 ? prompt : `${prompt}\n\nYour previous answer failed validation:\n${lastErr}\nReturn corrected JSON only.`;
    const t0 = performance.now();
    const res = await callWithRetry(tracer, system, p, file);
    if (!res) return null;
    const raw = res.raw;
    tracer.log(res.model, `Attempt ${attempt}: ${raw.length} chars returned`, "ok", Math.round(performance.now() - t0));
    const t1 = performance.now();
    let parsed: unknown;
    try {
      parsed = parseJson(raw);
    } catch {
      lastErr = "Output was not valid JSON.";
      tracer.log("zod", "Not valid JSON, asking model to repair", "warn", Math.round(performance.now() - t1));
      continue;
    }
    const v = schema.safeParse(parsed);
    if (v.success) {
      tracer.log("zod", "Schema validated", "ok", Math.round(performance.now() - t1));
      const out = { data: v.data, raw, model: res.model };
      if (useCache) cache.set(key, out);
      return out;
    }
    lastErr = v.error.issues.slice(0, 6).map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    tracer.log("zod", `Schema failed (${v.error.issues.length} issues), asking model to repair`, "warn", Math.round(performance.now() - t1));
  }
  tracer.log("zod", "Model output still invalid after repair, falling back", "fallback");
  return null;
}
