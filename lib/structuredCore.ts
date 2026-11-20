/*
 * The model-independent heart of lib/llm.ts structured(): ask → parse JSON → validate → one repair retry → cache.
 * NO imports, so tests/llm.test.ts can drive it with a fake model (lib/llm.ts imports "server-only" and the real
 * Gemini client, which node --test cannot load). lib/llm.ts wires the real model, Zod schema and tracer into it.
 */

export type StepStatus = "ok" | "warn" | "fallback" | "fail";
export type Log = (tool: string, detail: string, status: StepStatus, ms?: number) => void;

/** A model call: returns raw text and the model that answered, or null when every model/key failed. */
export type ModelCall = (prompt: string) => Promise<{ raw: string; model: string } | null>;

/** Validation result in the shape of Zod's safeParse. */
export type Validate<T> = (value: unknown) => { success: true; data: T } | { success: false; issues: Array<{ path: Array<string | number>; message: string }> };

export interface StructuredResult<T> { data: T; raw: string; model: string }

/** Small LRU map: reads refresh an entry; inserting past `max` evicts the least recently used one. */
export class LruCache<V> {
  private map = new Map<string, V>();
  readonly max: number;
  constructor(max: number) {
    this.max = max;
    if (!Number.isInteger(max) || max < 1) throw new Error("LRU size must be a positive integer");
  }
  get size(): number { return this.map.size; }
  has(key: string): boolean { return this.map.has(key); }
  get(key: string): V | undefined {
    if (!this.map.has(key)) return undefined;
    const v = this.map.get(key) as V;
    this.map.delete(key);
    this.map.set(key, v);
    return v;
  }
  set(key: string, value: V): void {
    if (this.map.has(key)) this.map.delete(key);
    this.map.set(key, value);
    while (this.map.size > this.max) this.map.delete(this.map.keys().next().value as string);
  }
  clear(): void { this.map.clear(); }
}

export function parseJsonText(text: string): unknown {
  const cleaned = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "");
  return JSON.parse(cleaned);
}

export interface RunOptions<T> {
  prompt: string;
  call: ModelCall;
  validate: Validate<T>;
  log: Log;
  /** Cache key for this request; with `cache` it serves repeats without calling the model. */
  key?: string;
  cache?: LruCache<StructuredResult<T>> | null;
  /** Name shown in the trace for a cache hit. */
  cacheLabel?: string;
  now?: () => number;
}

/**
 * Ask for JSON, validate it, and if it fails send the problems back once and ask again.
 * Returns null when the model fails, or the output is still invalid after the repair, so callers always fall back.
 */
export async function runStructured<T>(o: RunOptions<T>): Promise<StructuredResult<T> | null> {
  const now = o.now ?? (() => Date.now());
  if (o.cache && o.key && o.cache.has(o.key)) {
    o.log(o.cacheLabel ?? "cache", "Served from cache (identical request seen before)", "ok");
    return o.cache.get(o.key) as StructuredResult<T>;
  }
  let lastErr = "";
  for (let attempt = 1; attempt <= 2; attempt++) {
    const p = attempt === 1 ? o.prompt : `${o.prompt}\n\nYour previous answer failed validation:\n${lastErr}\nReturn corrected JSON only.`;
    const t0 = now();
    const res = await o.call(p);
    if (!res) return null;
    o.log(res.model, `Attempt ${attempt}: ${res.raw.length} chars returned`, "ok", Math.round(now() - t0));
    const t1 = now();
    let parsed: unknown;
    try {
      parsed = parseJsonText(res.raw);
    } catch {
      lastErr = "Output was not valid JSON.";
      o.log("zod", "Not valid JSON, asking model to repair", "warn", Math.round(now() - t1));
      continue;
    }
    const v = o.validate(parsed);
    if (v.success) {
      o.log("zod", "Schema validated", "ok", Math.round(now() - t1));
      const out = { data: v.data, raw: res.raw, model: res.model };
      if (o.cache && o.key) o.cache.set(o.key, out);
      return out;
    }
    lastErr = v.issues.slice(0, 6).map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    // Name the failing fields and rules (first three, trimmed) so a repeat failure can be traced to one rule.
    const why = v.issues.slice(0, 3).map((i) => `${i.path.join(".") || "(root)"}: ${i.message.slice(0, 80)}`).join("; ");
    o.log("zod", `Schema failed (${v.issues.length} issues: ${why}), asking model to repair`, "warn", Math.round(now() - t1));
  }
  o.log("zod", "Model output still invalid after repair, falling back", "fallback");
  return null;
}

/**
 * Hedged call for speed: start `first`; if it has not answered within `delayMs` (or it already failed), start
 * `second` too, and return whichever non-null answer arrives first. Returns null only when both fail.
 * The slower call is left to finish in the background; its result is ignored.
 */
export function hedge<T>(
  first: () => Promise<T | null>,
  second: (() => Promise<T | null>) | null,
  delayMs: number,
  onSecondStart?: (reason: "slow" | "failed") => void,
): Promise<{ value: T; by: "first" | "second" } | null> {
  return new Promise((resolve) => {
    let done = false, pending = 1, started = false;
    const finish = (v: { value: T; by: "first" | "second" } | null) => { if (!done) { done = true; resolve(v); } };
    const settle = (by: "first" | "second") => (v: T | null) => {
      if (done) return;
      if (v !== null && v !== undefined) return finish({ value: v, by });
      pending--;
      if (by === "first" && !started) startSecond("failed");
      else if (pending === 0) finish(null);
    };
    const startSecond = (reason: "slow" | "failed") => {
      if (started || done || !second) { if (!second && pending === 0) finish(null); return; }
      started = true; pending++;
      onSecondStart?.(reason);
      second().then(settle("second"), () => settle("second")(null));
    };
    const timer = setTimeout(() => startSecond("slow"), Math.max(0, delayMs));
    first().then(settle("first"), () => settle("first")(null)).finally(() => { if (done) clearTimeout(timer); });
  });
}
