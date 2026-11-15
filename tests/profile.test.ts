import { test } from "node:test";
import assert from "node:assert/strict";
import { emptyProfile, sanitizeUserProfile } from "../lib/profileData.ts";

test("new profiles contain no invented personal details or achievements", () => {
  const profile = emptyProfile();
  assert.equal(profile.name, "");
  assert.equal(profile.vivaScore, 0);
  assert.equal(profile.verifiedHourlyUsd, 0);
  assert.deepEqual(profile.shortlistedUniversities, []);
  profile.skills.push("React");
  assert.deepEqual(emptyProfile().skills, []);
});
test("profile sanitizer bounds stored fields and drops malformed values", () => {
  assert.equal(sanitizeUserProfile(null), null);
  assert.equal(sanitizeUserProfile([]), null);
  const profile = sanitizeUserProfile({ name: "  নাম ", skills: ["React", null, "React", ""], monthlyBudget: -1, vivaScore: Infinity, passedTests: "3", updatedAt: "bad", passportToken: "x".repeat(8001), shortlistedUniversities: ["buet"], unknown: true })!;
  assert.equal(profile.name, "নাম");
  assert.deepEqual(profile.skills, ["React"]);
  assert.equal(profile.monthlyBudget, 0);
  assert.equal(profile.vivaScore, 0);
  assert.equal(profile.passedTests, 0);
  assert.equal(profile.updatedAt, "");
  assert.equal(profile.passportToken, null);
  assert.equal(Object.hasOwn(profile, "unknown"), false);
});
