import test from "node:test";
import assert from "node:assert/strict";
import { LruCache, runStructured, parseJsonText, type ModelCall, type Validate, type StructuredResult } from "../lib/structuredCore.ts";

// A tiny schema: { name: string }, the shape lib/llm.ts gets from Zod's safeParse.
type Out = { name: string };
const validate: Validate<Out> = (v) =>
  v && typeof v === "object" && typeof (v as Out).name === "string"
    ? { success: true, data: { name: (v as Out).name } }
    : { success: false, issues: [{ path: ["name"], message: "Required" }] };

function fakeModel(replies: Array<string | null>) {
  const prompts: string[] = [];
  const call: ModelCall = async (p) => {
    prompts.push(p);
    const r = replies.shift();
    return r === null || r === undefined ? null : { raw: r, model: "fake-model" };
  };
  return { call, prompts };
}
const logs = () => { const steps: string[] = []; return { steps, log: (tool: string, detail: string, status: string) => { steps.push(`${tool}|${status}|${detail}`); } }; };

test("llm: valid JSON on the first attempt is returned and validated", async () => {
  const m = fakeModel(['```json\n{"name":"Rina"}\n```']);
  const l = logs();
  const r = await runStructured({ prompt: "P", call: m.call, validate, log: l.log });
  assert.deepEqual(r, { data: { name: "Rina" }, raw: '```json\n{"name":"Rina"}\n```', model: "fake-model" });
  assert.equal(m.prompts.length, 1);
  assert.ok(l.steps.some((s) => s.startsWith("zod|ok|Schema validated")));
});

test("llm: schema failure sends the issues back once and accepts the repaired answer", async () => {
  const m = fakeModel(['{"nom":"x"}', '{"name":"Fixed"}']);
  const l = logs();
  const r = await runStructured({ prompt: "P", call: m.call, validate, log: l.log });
  assert.equal(r?.data.name, "Fixed");
  assert.equal(m.prompts.length, 2);
  assert.match(m.prompts[1], /failed validation:\nname: Required\nReturn corrected JSON only\./);
  assert.ok(l.steps.some((s) => s.startsWith("zod|warn|Schema failed (1 issues)")));
});

test("llm: invalid JSON triggers the repair prompt", async () => {
  const m = fakeModel(["not json", '{"name":"Ok"}']);
  const r = await runStructured({ prompt: "P", call: m.call, validate, log: () => {} });
  assert.equal(r?.data.name, "Ok");
  assert.match(m.prompts[1], /Output was not valid JSON\./);
});

test("llm: still invalid after the repair returns null and logs a fallback", async () => {
  const m = fakeModel(['{"a":1}', '{"b":2}', '{"name":"never asked"}']);
  const l = logs();
  const r = await runStructured({ prompt: "P", call: m.call, validate, log: l.log });
  assert.equal(r, null);
  assert.equal(m.prompts.length, 2, "only one repair attempt");
  assert.ok(l.steps.at(-1)?.startsWith("zod|fallback|"));
});

test("llm: a failed model call returns null without a retry", async () => {
  const m = fakeModel([null]);
  assert.equal(await runStructured({ prompt: "P", call: m.call, validate, log: () => {} }), null);
  assert.equal(m.prompts.length, 1);
});

test("llm: identical request is served from cache without calling the model", async () => {
  const cache = new LruCache<StructuredResult<Out>>(10);
  const m = fakeModel(['{"name":"A"}', '{"name":"B"}']);
  const l = logs();
  const first = await runStructured({ prompt: "P", key: "k1", cache, call: m.call, validate, log: l.log, cacheLabel: "gem" });
  const second = await runStructured({ prompt: "P", key: "k1", cache, call: m.call, validate, log: l.log, cacheLabel: "gem" });
  assert.equal(m.prompts.length, 1);
  assert.deepEqual(second, first);
  assert.ok(l.steps.includes("gem|ok|Served from cache (identical request seen before)"));
});

test("llm: cache:false (no cache passed) never stores or reads results", async () => {
  const cache = new LruCache<StructuredResult<Out>>(10);
  const m = fakeModel(['{"name":"A"}', '{"name":"B"}']);
  // lib/llm.ts passes cache: null when the caller sets { cache: false } (MediScan OCR, health assistant).
  const a = await runStructured({ prompt: "P", key: "k1", cache: null, call: m.call, validate, log: () => {} });
  const b = await runStructured({ prompt: "P", key: "k1", cache: null, call: m.call, validate, log: () => {} });
  assert.equal(a?.data.name, "A");
  assert.equal(b?.data.name, "B");
  assert.equal(cache.size, 0);
  assert.equal(m.prompts.length, 2);
});

test("llm: invalid output is never cached", async () => {
  const cache = new LruCache<StructuredResult<Out>>(10);
  const m = fakeModel(["x", "y"]);
  await runStructured({ prompt: "P", key: "k", cache, call: m.call, validate, log: () => {} });
  assert.equal(cache.size, 0);
});

test("llm: LRU cache is bounded and evicts the least recently used entry", () => {
  const c = new LruCache<number>(3);
  c.set("a", 1); c.set("b", 2); c.set("c", 3);
  assert.equal(c.get("a"), 1); // a is now most recent
  c.set("d", 4); // evicts b
  assert.equal(c.has("b"), false);
  assert.deepEqual([c.has("a"), c.has("c"), c.has("d")], [true, true, true]);
  c.set("c", 30); // update refreshes c, size unchanged
  assert.equal(c.size, 3);
  c.set("e", 5); // evicts a (least recent after c was refreshed)
  assert.equal(c.has("a"), false);
  assert.equal(c.get("c"), 30);
  for (let i = 0; i < 2000; i++) c.set(`k${i}`, i);
  assert.equal(c.size, 3);
  assert.throws(() => new LruCache(0));
});

test("llm: lib/llm.ts caps its cache at 500 entries", async () => {
  const { readFile } = await import("node:fs/promises");
  const src = await readFile(new URL("../lib/llm.ts", import.meta.url), "utf8");
  assert.match(src, /LLM_CACHE_MAX = 500;/);
  assert.match(src, /new LruCache<StructuredResult<unknown>>\(LLM_CACHE_MAX\)/);
});

test("llm: parseJsonText strips code fences", () => {
  assert.deepEqual(parseJsonText(' ```JSON\n{"a":1}\n``` '), { a: 1 });
  assert.throws(() => parseJsonText("{bad"));
});
