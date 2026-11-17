import { test } from "node:test";
import assert from "node:assert/strict";
import { issue, check } from "../lib/passport.ts";
import { buildOpenBadge, readPassportPayload, verifyUrl, VC_CONTEXT_V2, OB_CONTEXT_V3, UNSIGNED_NOTE } from "../lib/badge.ts";

const passport = {
  v: 1 as const,
  name: "Rahim Uddin",
  track: "Full-stack",
  challenge: "The double-credited payment",
  testsPassed: 6,
  testsTotal: 6,
  edgePassed: true,
  perfPassed: true,
  vivaScore: 17,
  vivaTotal: 20,
  assisted: false,
  codeSha256: "a".repeat(64),
  issuedAt: "2026-11-17T10:00:00.000Z",
};

test("readPassportPayload decodes a real issued token and rejects junk", () => {
  const { token } = issue(passport);
  const p = readPassportPayload(token);
  assert.ok(p);
  assert.equal(p.name, "Rahim Uddin");
  assert.equal(p.testsPassed, 6);
  assert.equal(readPassportPayload("not-a-token"), null);
  assert.equal(readPassportPayload("abc.def"), null);
  // A v2 selective share is not a full passport.
  const v2 = Buffer.from(JSON.stringify({ v: 2, issuedAt: passport.issuedAt, expiresAt: passport.issuedAt })).toString("base64url");
  assert.equal(readPassportPayload(`${v2}.sig`), null);
  // Scores above their totals are rejected.
  const bad = Buffer.from(JSON.stringify({ ...passport, testsPassed: 9 })).toString("base64url");
  assert.equal(readPassportPayload(`${bad}.sig`), null);
});

test("buildOpenBadge produces an OB 3.0-shaped, honestly unsigned credential", () => {
  const { token, id } = issue(passport);
  const p = readPassportPayload(token)!;
  const b = buildOpenBadge({ passport: p, passportId: id, token, origin: "https://kormopath.example/", documentSkills: ["React", " React ", "TypeScript", ""] });

  assert.deepEqual(b["@context"], [VC_CONTEXT_V2, OB_CONTEXT_V3]);
  assert.equal(VC_CONTEXT_V2, "https://www.w3.org/ns/credentials/v2");
  assert.equal(OB_CONTEXT_V3, "https://purl.imsglobal.org/spec/ob/v3p0/context-3.0.3.json");
  assert.deepEqual(b.type, ["VerifiableCredential", "OpenBadgeCredential"]);
  assert.deepEqual(b.issuer, { id: "https://kormopath.example", type: ["Profile"], name: "KormoPath", url: "https://kormopath.example" });
  assert.equal(b.validFrom, passport.issuedAt);
  assert.deepEqual(b.credentialSubject.type, ["AchievementSubject"]);
  assert.deepEqual(b.credentialSubject.achievement.type, ["Achievement"]);
  assert.ok(b.credentialSubject.achievement.criteria.narrative.length > 0);
  assert.deepEqual(b.credentialSubject.achievement.tag, ["Full-stack", "React", "TypeScript"]);

  // No proof of any kind, and the text says so.
  assert.equal("proof" in b, false);
  assert.ok(b.description.includes(UNSIGNED_NOTE));
  assert.match(b.description, /unsigned/);
  assert.match(b.description, /not separately tested/);

  // The evidence link is the real /verify URL and it verifies.
  assert.equal(b.evidence.length, 1);
  assert.deepEqual(b.evidence[0].type, ["Evidence"]);
  assert.equal(b.evidence[0].id, verifyUrl("https://kormopath.example", token));
  const t = new URL(b.evidence[0].id).searchParams.get("t")!;
  assert.equal(t, token);
  assert.equal(check(t).valid, true);

  // Deterministic and JSON-serialisable.
  assert.deepEqual(JSON.parse(JSON.stringify(b)), buildOpenBadge({ passport: p, passportId: id, token, origin: "https://kormopath.example", documentSkills: ["React", "TypeScript"] }));
});

test("assisted passports and missing CV skills are reported, not hidden", () => {
  const { token, id } = issue({ ...passport, assisted: true, perfPassed: false });
  const b = buildOpenBadge({ passport: readPassportPayload(token)!, passportId: id, token, origin: "https://x.example" });
  assert.match(b.description, /assisted/);
  assert.match(b.description, /performance budget not met/);
  assert.doesNotMatch(b.description, /not separately tested/);
  assert.deepEqual(b.credentialSubject.achievement.tag, ["Full-stack"]);
});
