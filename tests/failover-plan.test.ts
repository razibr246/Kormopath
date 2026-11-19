import { test } from "node:test";
import assert from "node:assert/strict";
import { attemptPlan, createCooldown, TIMEOUT_COOLDOWN_MS } from "../lib/cooldown.ts";

const MODELS = ["gemini-4-hydrogen", "gemini-3.5-flash-lite", "gemini-3.1-flash-lite"];

test("failover: a key refused with 401/403 is tried last, not dropped, and returns after its cooldown", () => {
  let now = 0;
  const models = createCooldown(() => now), keys = createCooldown(() => now);
  assert.deepEqual(attemptPlan(MODELS, 4, models, keys).keyOrder, [0, 1, 2, 3]);
  keys.mark("0", 30 * 60_000); // key 1 of 4 refused
  const p = attemptPlan(MODELS, 4, models, keys);
  assert.deepEqual(p.keyOrder, [1, 2, 3, 0]);
  assert.deepEqual(p.deferredKeys, [0]);
  now += 31 * 60_000;
  assert.deepEqual(attemptPlan(MODELS, 4, models, keys).keyOrder, [0, 1, 2, 3]);
});

test("failover: a model that answered 503 or timed out is tried last; a success clears it", () => {
  let now = 0;
  const models = createCooldown(() => now), keys = createCooldown(() => now);
  models.mark("gemini-4-hydrogen", TIMEOUT_COOLDOWN_MS);
  assert.deepEqual(attemptPlan(MODELS, 1, models, keys).models, ["gemini-3.5-flash-lite", "gemini-3.1-flash-lite", "gemini-4-hydrogen"]);
  models.clear("gemini-4-hydrogen");
  assert.deepEqual(attemptPlan(MODELS, 1, models, keys).models, MODELS);
});
