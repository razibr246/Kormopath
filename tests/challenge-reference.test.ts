// The Examiner's exam must be real: every buggy starter fails at least one test, and every
// reference fix passes all of them (the "1-Click Apply Fix & Run" demo path and the judge tour rely on this).
// Mirrors the worker in lib/sandbox.ts: same compile step, same `assert`, no budgets (CI timing varies).
import { test } from "node:test";
import assert from "node:assert/strict";
import { CHALLENGES } from "../lib/challenges.ts";

function run(code: string, fnName: string, tests: { name: string; code: string }[]) {
  const fn = new Function(code + "\n;return " + fnName + ";")();
  assert.equal(typeof fn, "function", fnName + " should compile to a function");
  return tests.map((t) => {
    const check = (c: unknown, m?: string) => { if (!c) throw new Error(m || "assertion failed"); };
    try { new Function("fn", "assert", t.code)(fn, check); return { name: t.name, pass: true }; }
    catch (e) { return { name: t.name, pass: false, error: String((e as Error).message) }; }
  });
}

for (const ch of CHALLENGES) {
  test(`${ch.id}: the reference fix passes every test`, () => {
    const failed = run(ch.reference, ch.fnName, ch.tests).filter((r) => !r.pass);
    assert.deepEqual(failed, []);
  });
  test(`${ch.id}: the buggy starter fails at least one test`, () => {
    assert.ok(run(ch.buggy, ch.fnName, ch.tests).some((r) => !r.pass));
  });
  test(`${ch.id}: has viva questions to grade`, () => {
    assert.ok(ch.viva.length >= 1);
  });
}
