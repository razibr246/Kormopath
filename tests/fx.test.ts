import { test } from "node:test";
import assert from "node:assert/strict";
import { readFxQuote } from "../lib/fx.ts";
const now = Date.parse("2026-11-08T12:00:00Z");
const quote = { rates: { BDT: 122.42 }, time_last_update_unix: Math.floor(now / 1000) - 3600 };
test("FX uses bounded provider numbers and a verified freshness timestamp", () => {
  assert.deepEqual(readFxQuote(quote, now), { rate: 122.42, checked: "2026-11-08T11:00:00.000Z" });
});
test("FX rejects stale/future/missing timestamps and malformed rates", () => {
  for (const rate of ["122", null, 0, 80, 250, Infinity, NaN]) assert.throws(() => readFxQuote({ ...quote, rates: { BDT: rate } }, now));
  for (const timestamp of [null, "today", now / 1000 - 49 * 3600, now / 1000 + 7200]) assert.throws(() => readFxQuote({ ...quote, time_last_update_unix: timestamp }, now));
});
