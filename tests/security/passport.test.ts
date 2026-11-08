import { test } from "node:test";
import assert from "node:assert/strict";
import { check, issue, issueShare, signingConfigured, type Passport } from "../../lib/passport.ts";
const passport: Passport = { v: 1, name: "Test", track: "Web", challenge: "Webhook", testsPassed: 3, testsTotal: 3, edgePassed: true, perfPassed: true, vivaScore: 10, vivaTotal: 20, assisted: false, codeSha256: "a".repeat(64), issuedAt: new Date().toISOString() };

test("production signing fails closed without a strong configured key", () => {
  const env = { ...process.env };
  try {
    process.env.NODE_ENV = "production";
    for (const weak of ["", "short", "kormopilot-dev-secret-set-PASSPORT_SECRET-in-production"]) {
      process.env.PASSPORT_SECRET = weak;
      assert.equal(signingConfigured(), false);
      assert.throws(() => issue(passport), /unavailable/);
      assert.equal(check("fake.token").valid, false);
    }
    process.env.PASSPORT_SECRET = "test-only-key-with-more-than-32-characters";
    assert.equal(check(issue(passport).token).valid, true);
  } finally { process.env = env; }
});
test("tokens reject tampering, extra segments, impossible dates and scores", () => {
  const token = issue(passport).token;
  assert.equal(check(token).valid, true);
  assert.equal(check(token + ".extra").valid, false);
  assert.equal(check(token.slice(0, -2) + "xx").valid, false);
  assert.throws(() => issue({ ...passport, issuedAt: "not-a-date" }));
  assert.throws(() => issue({ ...passport, testsPassed: 4 }), /totals/);
  assert.throws(() => issue({ ...passport, vivaScore: 15, vivaTotal: 10 }), /totals/);
});
test("selective share omits holder identity and limits lifetime", () => {
  const shared = check(issueShare(passport, ["tests"], 1).token);
  assert.equal(shared.valid, true);
  assert.equal(shared.passport?.testsPassed, 3);
  assert.equal(Object.hasOwn(shared.passport!, "name"), false);
  assert.equal(Object.hasOwn(shared.passport!, "track"), false);
  assert.throws(() => issueShare(passport, ["tests"], -1));
});
