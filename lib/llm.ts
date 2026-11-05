import "server-only";
import { createHash } from "crypto";
import { z } from "zod";
import { Tracer } from "./trace";

const MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";
// Used only when the primary model is overloaded or rate-limited (HTTP 429/500/503/504).
const FALLBACK_MODEL = process.env.GEMINI_FALLBACK_MODEL || "gemini-flash-lite-latest";
// Timeouts are not retried: a 25 s abort plus retries could outlast the route time limit.
const TRANSIENT = /Gemini HTTP (429|500|503|504)|fetch failed/i;
const cache = new Map<string, unknown>(); // per-instance cache: identical requests never hit the API twice

export const llmAvailable = () => Boolean(process.env.GEMINI_API_KEY);
export const modelName = () => MODEL;

export interface FilePart {
  mimeType: string;
  base64: string;
}

async function callGemini(model: string, system: string, prompt: string, file?: FilePart): Promise<string> {
  const parts: unknown[] = [{ text: prompt }];
  if (file) parts.push({ inline_data: { mime_type: file.mimeType, data: file.base64 } });
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 25_000);
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
      method: "POST",
      signal: ctrl.signal,
      headers: { "content-type": "application/json", "x-goog-api-key": process.env.GEMINI_API_KEY! },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: [{ role: "user", parts }],
        generationConfig: { responseMimeType: "application/json", temperature: 0.1 },
      }),
    });
    if (!res.ok) throw new Error(`Gemini HTTP ${res.status}`);
    const data = await res.json();
    const text: string | undefined = data?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? "").join("");
    if (!text) throw new Error("Gemini returned no text");
    return text;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * One model call with resilience against overload: on a transient error, wait briefly and retry
 * the same model once, then try the lighter fallback model. Every attempt is written to the
 * trace so a degraded run is visible, never silent.
 */
async function callWithRetry(tracer: Tracer, system: string, prompt: string, file?: FilePart): Promise<{ raw: string; model: string } | null> {
  const plan: { model: string; delay: number }[] = [
    { model: MODEL, delay: 0 },
    { model: MODEL, delay: 800 },
    ...(FALLBACK_MODEL && FALLBACK_MODEL !== MODEL ? [{ model: FALLBACK_MODEL, delay: 300 }] : []),
  ];
  for (let i = 0; i < plan.length; i++) {
    const { model, delay } = plan[i];
    if (delay) await new Promise((r) => setTimeout(r, delay));
    const t0 = performance.now();
    try {
      const raw = await callGemini(model, system, prompt, file);
      return { raw, model };
    } catch (e) {
      const msg = (e as Error).message;
      const last = i === plan.length - 1 || !TRANSIENT.test(msg);
      const next = last ? "" : plan[i + 1].model === model ? " — retrying" : ` — switching to ${plan[i + 1].model}`;
      tracer.log(model, `Call failed: ${msg}${next}`, last ? "fail" : "warn", Math.round(performance.now() - t0));
      if (last) return null;
    }
  }
  return null;
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
