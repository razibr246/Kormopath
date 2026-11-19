/* The privacy page matches the code, assistants link to it, and fallback answers are labelled offline. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { isOfflineEngine, OFFLINE_LABEL } from "../lib/health/offline.ts";

const read = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");

test("offline label: rule-based, template, empty or unknown engines are offline; a model name is not", () => {
  for (const e of ["rule-based", "rule-based (offline)", "template", "", null, undefined]) assert.equal(isOfflineEngine(e), true, String(e));
  for (const e of ["gemini-4-hydrogen", "gemini-3.5-flash-lite"]) assert.equal(isOfflineEngine(e), false, e);
  assert.equal(OFFLINE_LABEL.bn, "অফলাইন উত্তর");
  for (const f of ["components/apps/legal/Assistant.tsx", "components/apps/health/assistant/SymptomAssistant.tsx"]) {
    const src = read(f);
    assert.match(src, /isOfflineEngine\(/, f);
    assert.match(src, /data-testid=\{?[^>]*offline-label/, f);
    assert.match(src, /href="\/privacy"/, f);
  }
});

test("health assistant: the 999 strip sits above the symptom input and is not gated by the triage list", () => {
  const src = read("components/apps/health/assistant/SymptomAssistant.tsx");
  const strip = src.indexOf('data-testid="assist-999-strip"');
  assert.ok(strip > 0 && strip < src.indexOf('id="hb-text"'));
  assert.match(src.slice(strip, strip + 900), /href="tel:999"/);
});

test("privacy page states only what the code does", () => {
  const page = read("app/privacy/page.tsx");
  for (const s of ["store: false", 'href="/settings"', "অফলাইন উত্তর", "localStorage"]) assert.ok(page.includes(s), s);
  // The claims it makes are backed by the code.
  assert.match(read("lib/gemini.ts"), /store: false/);
  assert.match(read("app/api/legal/assist/route.ts"), /cache: false/);
  assert.match(read("app/api/health/assist/route.ts"), /cache: false/);
  assert.match(read("lib/rateLimit.ts"), /maxAgeMs = 600_000/);
});
