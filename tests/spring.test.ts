import { test } from "node:test";
import assert from "node:assert/strict";
import { springInit, springStep, springSet } from "../lib/spring.ts";

const run = (z: number, f = 2, secs = 4, dt = 1 / 60) => {
  let s = springInit(0); let peak = 0;
  for (let t = 0; t < secs; t += dt) { s = springStep(s, 1, dt, { f, z }); peak = Math.max(peak, s.y); }
  return { s, peak };
};

test("a spring settles on its target", () => {
  const { s } = run(0.7);
  assert.ok(Math.abs(s.y - 1) < 1e-3 && Math.abs(s.v) < 1e-2, `y=${s.y} v=${s.v}`);
});

test("under-damped overshoots a little; critically damped does not", () => {
  const under = run(0.5).peak, crit = run(1).peak;
  assert.ok(under > 1.05 && under < 1.25, `under-damped peak ${under}`);
  assert.ok(crit <= 1.0001, `critical peak ${crit}`);
});

test("a long frame (tab returning) never explodes", () => {
  let s = springInit(0);
  for (let i = 0; i < 20; i++) s = springStep(s, 1, 0.5, { f: 4, z: 0.3 });
  assert.ok(Number.isFinite(s.y) && Math.abs(s.y) < 3, `y=${s.y}`);
});

test("springSet keeps channels independent and snap() jumps without motion", () => {
  const set = springSet({ a: { f: 3, z: 1 } }, { f: 1, z: 1 });
  set.snap({ a: 5, b: -5 });
  const out = set.step({ a: 5, b: -5 }, 1 / 60);
  assert.deepEqual(out, { a: 5, b: -5 });
  set.step({ a: 6, b: -5 }, 1 / 60); // first frame: velocity builds, position not yet moved
  const moved = set.step({ a: 6, b: -5 }, 1 / 60);
  assert.ok(moved.a > 5 && moved.a < 6 && moved.b === -5);
});
