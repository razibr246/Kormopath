import { test } from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "crypto";
import {
  issue,
  check,
  usingDevSecret,
  issueShare,
  PassportSchema,
  SharedPassportSchema,
  type Passport,
} from "../lib/passport.ts";

const samplePassport: Passport = {
  v: 1,
  name: "Tanvir Ahmed",
  track: "Full-stack web development",
  challenge: "Payment Webhook Idempotency",
  testsPassed: 10,
  testsTotal: 10,
  edgePassed: true,
  perfPassed: true,
  vivaScore: 18,
  vivaTotal: 20,
  assisted: false,
  codeSha256: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
  issuedAt: "2026-11-15T06:00:00.000Z",
};

test("HMAC-SHA256 token issuance: format base64url(payload).base64url(signature) and shortId", () => {
  const { token, id } = issue(samplePassport);
  const parts = token.split(".");
  assert.equal(parts.length, 2);

  const decodedPayload = JSON.parse(Buffer.from(parts[0], "base64url").toString("utf-8"));
  assert.deepEqual(decodedPayload, samplePassport);

  assert.ok(parts[1].length > 30, "HMAC-SHA256 base64url signature should be long");
  assert.equal(id, parts[1].slice(0, 12).toUpperCase());
  assert.equal(id.length, 12);
  assert.match(id, /^[A-Z0-9_-]{12}$/);
});

test("check(token) verifies valid full passport and decodes payload correctly", () => {
  const { token, id } = issue(samplePassport);
  const res = check(token);
  assert.equal(res.valid, true);
  assert.equal(res.id, id);
  assert.equal(res.reason, undefined);
  assert.equal(res.passport?.v, 1);
  assert.equal(res.passport?.name, "Tanvir Ahmed");
  assert.equal(res.passport?.testsPassed, 10);
  assert.equal(res.passport?.codeSha256, samplePassport.codeSha256);
});

test("Tamper detection: modifying payload body invalidates signature", () => {
  const { token } = issue(samplePassport);
  const [body, sig] = token.split(".");

  // Tamper 1: Alter data inside JSON
  const parsed = JSON.parse(Buffer.from(body, "base64url").toString("utf-8"));
  parsed.testsPassed = 50;
  const tamperedBody = Buffer.from(JSON.stringify(parsed)).toString("base64url");
  const res1 = check(`${tamperedBody}.${sig}`);
  assert.equal(res1.valid, false);
  assert.equal(
    res1.reason,
    "Signature does not match. This passport was edited after it was issued, or was not issued by KormoPilot."
  );
  assert.equal(res1.passport, undefined);

  // Tamper 2: Character flip in encoded body
  const flippedBody = (body[0] === "A" ? "B" : "A") + body.slice(1);
  const res2 = check(`${flippedBody}.${sig}`);
  assert.equal(res2.valid, false);
});

test("Tamper detection: modifying or truncating signature invalidates token", () => {
  const { token } = issue(samplePassport);
  const [body, sig] = token.split(".");

  // Tamper 1: modify last character of signature
  const lastChar = sig.slice(-1);
  const badSig = sig.slice(0, -1) + (lastChar === "a" ? "b" : "a");
  const res1 = check(`${body}.${badSig}`);
  assert.equal(res1.valid, false);
  assert.equal(
    res1.reason,
    "Signature does not match. This passport was edited after it was issued, or was not issued by KormoPilot."
  );

  // Tamper 2: truncate signature
  const truncSig = sig.slice(0, 20);
  const res2 = check(`${body}.${truncSig}`);
  assert.equal(res2.valid, false);
  assert.equal(
    res2.reason,
    "Signature does not match. This passport was edited after it was issued, or was not issued by KormoPilot."
  );
});

test("check(token) rejects malformed passport links", () => {
  const malformedInputs = ["", "notokenhere", ".justsignature", "justbody.", "part1.part2.part3"];
  for (const input of malformedInputs) {
    const res = check(input);
    assert.equal(res.valid, false, `Expected malformed check for '${input}' to fail`);
    assert.equal(res.reason, "Malformed passport link.");
  }
});

test("check(token) rejects unreadable payload or invalid schema even if signed", () => {
  const secret = process.env.PASSPORT_SECRET || "kormopilot-dev-secret-set-PASSPORT_SECRET-in-production";

  // Case A: Non-JSON body with valid HMAC
  const badJsonBody = Buffer.from("this is not json").toString("base64url");
  const badJsonSig = createHmac("sha256", secret).update(badJsonBody).digest("base64url");
  const res1 = check(`${badJsonBody}.${badJsonSig}`);
  assert.equal(res1.valid, false);
  assert.equal(res1.reason, "Passport contents are unreadable.");

  // Case B: Schema violation (testsPassed: -5, missing required fields) with valid HMAC
  const invalidSchemaBody = Buffer.from(JSON.stringify({ v: 1, name: "" })).toString("base64url");
  const invalidSchemaSig = createHmac("sha256", secret).update(invalidSchemaBody).digest("base64url");
  const res2 = check(`${invalidSchemaBody}.${invalidSchemaSig}`);
  assert.equal(res2.valid, false);
  assert.equal(res2.reason, "Passport contents are unreadable.");
});

test("usingDevSecret() detects default fallback secret vs explicit PASSPORT_SECRET", () => {
  const originalEnv = process.env.PASSPORT_SECRET;
  try {
    delete process.env.PASSPORT_SECRET;
    assert.equal(usingDevSecret(), true);
    const devToken = issue(samplePassport).token;
    assert.equal(check(devToken).valid, true);

    process.env.PASSPORT_SECRET = "production-super-secret-key-2026-xyz";
    assert.equal(usingDevSecret(), false);
    assert.equal(check(devToken).valid, false);

    const prodToken = issue(samplePassport).token;
    assert.equal(check(prodToken).valid, true);
  } finally {
    if (originalEnv !== undefined) {
      process.env.PASSPORT_SECRET = originalEnv;
    } else {
      delete process.env.PASSPORT_SECRET;
    }
  }
});

test("issueShare() produces v2 token with strict PII/email redactions", () => {
  const share = issueShare(samplePassport, ["track", "viva"], 7);
  const res = check(share.token);
  assert.equal(res.valid, true);
  assert.equal(res.passport?.v, 2);

  const shared = res.passport as any;
  assert.equal(shared.name, undefined);
  assert.equal(shared.assisted, undefined);
  assert.equal(shared.codeSha256, undefined);
  assert.equal(shared.challenge, undefined);
  assert.equal(shared.testsPassed, undefined);

  assert.equal(shared.track, "Full-stack web development");
  assert.equal(shared.vivaScore, 18);
  assert.equal(shared.vivaTotal, 20);
});

test('issueShare() supports all selective field groups ("track", "challenge", "tests", "viva")', () => {
  const share = issueShare(samplePassport, ["track", "challenge", "tests", "viva"], 30);
  const res = check(share.token);
  assert.equal(res.valid, true);
  assert.equal(res.passport?.v, 2);

  const shared = res.passport as any;
  assert.equal(shared.track, samplePassport.track);
  assert.equal(shared.challenge, samplePassport.challenge);
  assert.equal(shared.testsPassed, samplePassport.testsPassed);
  assert.equal(shared.testsTotal, samplePassport.testsTotal);
  assert.equal(shared.edgePassed, samplePassport.edgePassed);
  assert.equal(shared.perfPassed, samplePassport.perfPassed);
  assert.equal(shared.vivaScore, samplePassport.vivaScore);
  assert.equal(shared.vivaTotal, samplePassport.vivaTotal);

  assert.equal(shared.name, undefined);
  assert.equal(shared.codeSha256, undefined);
  assert.equal(shared.assisted, undefined);
});

test("check() enforces expiration on selective share tokens", () => {
  // issueShare rejects unsupported lifetimes like -1
  assert.throws(() => issueShare(samplePassport, ["track"], -1));

  // Construct a validly-signed token that has expired in the past
  const secret = process.env.PASSPORT_SECRET || "kormopilot-dev-secret-set-PASSPORT_SECRET-in-production";
  const pastIssued = new Date(Date.now() - 10 * 86_400_000).toISOString();
  const pastExpired = new Date(Date.now() - 3 * 86_400_000).toISOString();
  const payload = { v: 2, track: samplePassport.track, issuedAt: pastIssued, expiresAt: pastExpired };
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = createHmac("sha256", secret).update(body).digest("base64url");
  const token = `${body}.${sig}`;

  const res = check(token);
  assert.equal(res.valid, false);
  assert.equal(res.reason, "This selective share link has expired.");
  assert.equal(res.passport, undefined);
});

test("PassportSchema and SharedPassportSchema validate structural boundaries", () => {
  assert.equal(PassportSchema.safeParse(samplePassport).success, true);

  // Negative tests on PassportSchema
  assert.equal(PassportSchema.safeParse({ ...samplePassport, v: 2 }).success, false);
  assert.equal(PassportSchema.safeParse({ ...samplePassport, name: "" }).success, false);
  assert.equal(PassportSchema.safeParse({ ...samplePassport, testsPassed: -1 }).success, false);
  assert.equal(PassportSchema.safeParse({ ...samplePassport, testsPassed: 51 }).success, false);
  assert.equal(PassportSchema.safeParse({ ...samplePassport, codeSha256: "invalid-sha" }).success, false);

  // SharedPassportSchema
  const validShared = {
    v: 2 as const,
    issuedAt: new Date().toISOString(),
    expiresAt: new Date().toISOString(),
  };
  assert.equal(SharedPassportSchema.safeParse(validShared).success, true);
  assert.equal(SharedPassportSchema.safeParse({ ...validShared, v: 1 as any }).success, false);
});
