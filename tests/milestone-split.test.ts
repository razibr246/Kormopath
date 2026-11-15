import { test } from "node:test";
import assert from "node:assert/strict";
import { splitMilestoneUsd } from "../lib/finops.ts";

test("milestone split reconciles every cent without producing zero amounts", () => {
  assert.deepEqual(splitMilestoneUsd(10, 3), [3.34, 3.33, 3.33]);
  for (const total of [0.2, 1.01, 10, 999999.99]) for (let count = 1; count <= 20; count++) {
    const amounts = splitMilestoneUsd(total, count);
    assert.equal(amounts.length, count);
    assert.equal(amounts.reduce((sum, amount) => sum + Math.round(amount * 100), 0), Math.round(total * 100));
    assert.ok(amounts.every((amount) => amount > 0));
  }
});
test("milestone split rejects invalid amounts, fractional cents and too many deliverables", () => {
  for (const total of [NaN, Infinity, -1, 0, 1_000_000, 0.001, 1.234]) assert.throws(() => splitMilestoneUsd(total, 1));
  for (const count of [0, -1, 1.5, 21, Infinity]) assert.throws(() => splitMilestoneUsd(10, count));
  assert.throws(() => splitMilestoneUsd(0.01, 2), /at least/);
});
