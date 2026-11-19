/* Helplines and money facts carry an official source, or are labelled unverified. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { HELPLINES } from "../lib/legal/data.ts";
import { AIT_SOURCES, AIT_DEFAULT_RATES_UNVERIFIED } from "../lib/finops.ts";

test("legal helplines: every number has an https source on a .gov.bd domain and a check date", () => {
  for (const h of HELPLINES) {
    assert.match(h.source.url, /^https:\/\/([a-z0-9-]+\.)*gov\.bd(\/|$)/, h.id);
    assert.match(h.source.checked, /^\d{4}-\d{2}-\d{2}$/, h.id);
  }
  const land = HELPLINES.find((h) => h.number === "16122")!;
  assert.equal(land.source.url, "https://hotline.land.gov.bd/");
  assert.equal(HELPLINES.find((h) => h.number === "999")!.source.url, "https://bangladesh.gov.bd");
});

test("AIT facts: sources dated and honestly labelled; local rates marked unverified", () => {
  assert.ok(AIT_SOURCES.length >= 3);
  for (const s of AIT_SOURCES) {
    assert.match(s.url, /^https:\/\//);
    assert.equal(s.checked, "2026-11-19");
    assert.ok(["secondary", "official-unread"].includes(s.confidence), s.label);
  }
  assert.deepEqual(Object.keys(AIT_DEFAULT_RATES_UNVERIFIED).sort(), ["local_corporate_consulting", "local_corporate_it"]);
});
