import { test } from "node:test";
import assert from "node:assert/strict";
import { createCooldown, RATE_LIMIT_COOLDOWN_MS, MAX_COOLDOWN_MS } from "../lib/cooldown.ts";

const chain = ["gemini-4-hydrogen", "gemini-3.5-flash-lite"];

test("cooldown: untouched chain keeps its order", () => {
  const c = createCooldown(() => 0);
  assert.deepEqual(c.order(chain), chain);
});

test("cooldown: a rate-limited model moves to the end, never dropped", () => {
  let t = 0;
  const c = createCooldown(() => t);
  c.mark("gemini-4-hydrogen", RATE_LIMIT_COOLDOWN_MS);
  assert.deepEqual(c.order(chain), ["gemini-3.5-flash-lite", "gemini-4-hydrogen"]);
  assert.equal(c.order(chain).length, chain.length);
  t = 60_000;
  assert.equal(c.remainingMs("gemini-4-hydrogen"), RATE_LIMIT_COOLDOWN_MS - 60_000);
});

test("cooldown: expires on its own and after a success", () => {
  let t = 0;
  const c = createCooldown(() => t);
  c.mark("gemini-4-hydrogen", 1_000);
  t = 1_000;
  assert.equal(c.remainingMs("gemini-4-hydrogen"), 0);
  assert.deepEqual(c.order(chain), chain);
  c.mark("gemini-4-hydrogen", 10_000);
  c.clear("gemini-4-hydrogen");
  assert.deepEqual(c.order(chain), chain);
});

test("cooldown: repeated failures back off exponentially, capped, and a success resets", () => {
  let t = 0;
  const c = createCooldown(() => t);
  c.mark("m", 120_000);
  assert.equal(c.remainingMs("m"), 120_000);
  c.mark("m", 120_000);
  assert.equal(c.remainingMs("m"), 240_000);
  for (let i = 0; i < 10; i++) c.mark("m", 120_000);
  assert.equal(c.remainingMs("m"), MAX_COOLDOWN_MS);
  c.clear("m");
  c.mark("m", 120_000);
  assert.equal(c.remainingMs("m"), 120_000);
});

test("cooldown: when every model is deferred, original order is kept", () => {
  const c = createCooldown(() => 0);
  c.mark("gemini-4-hydrogen", 5_000);
  c.mark("gemini-3.5-flash-lite", 5_000);
  assert.deepEqual(c.order(chain), chain);
});
