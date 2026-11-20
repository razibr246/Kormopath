import { test } from "node:test";
import assert from "node:assert/strict";
import { hedge } from "../lib/structuredCore.ts";

const after = <T,>(ms: number, v: T) => () => new Promise<T>((r) => setTimeout(() => r(v), ms));

test("hedge: a fast first answer wins and the second never starts", async () => {
  let started = false;
  const r = await hedge(after(10, "A"), () => { started = true; return after(5, "B")(); }, 100);
  assert.deepEqual(r, { value: "A", by: "first" });
  assert.equal(started, false);
});

test("hedge: a slow first lets the second start after the delay, and the quicker answer wins", async () => {
  const reasons: string[] = [];
  const r = await hedge(after(300, "slow"), after(20, "fast"), 50, (why) => reasons.push(why));
  assert.deepEqual(r, { value: "fast", by: "second" });
  assert.deepEqual(reasons, ["slow"]);
});

test("hedge: a failed first starts the second at once, without waiting for the delay", async () => {
  const t0 = Date.now(); const reasons: string[] = [];
  const r = await hedge(after(5, null), after(10, "B"), 1000, (why) => reasons.push(why));
  assert.deepEqual(r, { value: "B", by: "second" });
  assert.ok(Date.now() - t0 < 500);
  assert.deepEqual(reasons, ["failed"]);
});

test("hedge: both failing (or rejecting) returns null; no second means the first decides", async () => {
  assert.equal(await hedge(after(5, null), () => Promise.reject(new Error("x")), 10), null);
  assert.equal(await hedge(after(5, null), null, 10), null);
  assert.deepEqual(await hedge(after(5, 7), null, 10), { value: 7, by: "first" });
});
