import { test } from "node:test";
import assert from "node:assert/strict";
import { STAGES, BEATS, stageAt, beat } from "../lib/lifeStory.ts";
import { POSES, FATHER_POSES, NUMERIC_CHANNELS } from "../lib/lifeStoryPoses.ts";
import { HELPLINES } from "../lib/legal/data.ts";

test("seven chapters in the home page's life-cycle order, each with a real app route", () => {
  assert.deepEqual(STAGES.map((s) => s.id), ["study", "work", "earn", "home", "health", "field", "protect"]);
  const routes = ["/admitbuddy", "/workspace", "/feeguard", "/shohoj-budget", "/mediscan/emergency", "/krishi/field#/farmer", "/legal"];
  assert.deepEqual(STAGES.map((s) => s.app.href), routes);
  for (const s of STAGES) {
    for (const l of [s.label, s.problem, s.buddy, s.solution, s.app.name, ...s.steps]) assert.ok(l.bn.trim() && l.en.trim(), s.id);
    for (const p of s.poses) assert.ok(POSES[p], `${s.id}: pose ${p}`);
  }
});

test("the only numbers in the story are sourced ones (helplines, the 2.5% incentive)", () => {
  const allowed = new Set(["999", "16123", "16699", "2.5", "২.৫", "৯৯৯", "১৬১২৩", "১৬৬৯৯"]);
  const text = STAGES.flatMap((s) => [s.problem, s.buddy, s.solution, ...s.steps]).flatMap((l) => [l.bn, l.en]).join(" ");
  const nums = text.match(/[0-9০-৯]+(?:[.][0-9০-৯]+)?/g) ?? [];
  const stray = nums.filter((n) => !allowed.has(n) && !/^(three|তিন)$/.test(n));
  assert.deepEqual(stray, [], `unsourced numbers: ${stray.join(", ")}`);
  for (const n of ["999", "16699"]) assert.ok(HELPLINES.some((h) => h.number === n), `${n} is a listed helpline`);
});

test("every pose carries every animated channel", () => {
  for (const [name, p] of Object.entries({ ...POSES, ...FATHER_POSES })) {
    for (const k of NUMERIC_CHANNELS) assert.equal(typeof p[k], "number", `${name}.${k}`);
  }
});

test("story progress maps to chapters and beats", () => {
  assert.deepEqual(stageAt(0), { index: 0, local: 0 });
  assert.equal(stageAt(1).index, 6);
  assert.equal(stageAt(0.5).index, 3);
  assert.equal(beat(0, BEATS.app), 0);
  assert.equal(beat(1, BEATS.app), 1);
  const mid = beat((BEATS.app[0] + BEATS.app[1]) / 2, BEATS.app);
  assert.ok(Math.abs(mid - 0.5) < 1e-9);
});
