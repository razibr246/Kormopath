import test from "node:test";
import assert from "node:assert/strict";
import * as S from "../lib/session.ts";
import {
  PERSONAS,
  DEFAULT_PERSONA_ID,
  getPersona,
  createSessionFromPersona,
  isAlwaysFreeApp,
  isAppUnlocked,
  isFeatureGated,
  enableDemoPro,
  joinEarlyAccess,
  guestSession,
  sanitizeSession,
  getStoredSession,
  SAFETY_FEATURES,
  PAID_FEATURES,
  PAYMENTS_OPEN,
  PRICE_SINGLE_APP_BDT,
  PRICE_FULL_ACCESS_BDT,
  AUTH_SESSION_KEY,
  LEGACY_AUTH_SESSION_KEY,
} from "../lib/session.ts";

const free = createSessionFromPersona(PERSONAS.rahim_uddin, () => "2026-11-19T00:00:00.000Z");

test("session: three fictional demo profiles, labelled as demo, default is the free one", () => {
  assert.deepEqual(Object.keys(PERSONAS).sort(), ["lamia_akter", "najeeb_ahmed", "rahim_uddin"]);
  for (const p of Object.values(PERSONAS)) {
    assert.match(p.badgeBn, /ডেমো প্রোফাইল/);
    assert.match(p.roleBn + p.descriptionBn, /কাল্পনিক/);
  }
  assert.equal(DEFAULT_PERSONA_ID, "rahim_uddin");
  assert.equal(getPersona("najeeb_ahmed")?.tier, "pro");
  assert.equal(getPersona("toString"), null);
  assert.equal(getPersona("nope"), null);
});

test("session: no payment number and payments are off; prices are a proposal", () => {
  assert.equal(PAYMENTS_OPEN, false);
  assert.equal(S.PRICES_PROPOSED, true);
  assert.equal(PRICE_SINGLE_APP_BDT, 99);
  assert.equal(PRICE_FULL_ACCESS_BDT, 299);
  const exported = JSON.stringify(Object.entries(S).map(([k, v]) => [k, typeof v === "function" ? "fn" : v]));
  assert.ok(!/0\d{10}|01927228826/.test(exported), "no phone number is exported");
  assert.ok(!("BKASH_RECEIVER_NUMBER" in S) && !("applyTrxIdUnlock" in S) && !("validateTrxId" in S));
});

test("session: safety features are never gated, for no session, a free session or a stored free session", () => {
  const stored = sanitizeSession({ personaId: "x", tier: "free" });
  for (const id of SAFETY_FEATURES) {
    const [app, feature] = id.split(":");
    for (const s of [null, free, stored, guestSession()]) assert.equal(isFeatureGated(s, app, feature), false, `${id} gated`);
  }
  for (const app of ["rokkha", "legal", "krishi", "shohoj", "haatbazar", "feeguard", "chuktiguard"]) {
    assert.ok(isAlwaysFreeApp(app));
    assert.equal(isAppUnlocked(null, app), true);
    assert.equal(isFeatureGated(null, app, "anything"), false);
  }
  // A feature that is not on the paid list is never gated either.
  assert.equal(isFeatureGated(null, "mediscan", "some_new_feature"), false);
});

test("session: only listed convenience features are gated, and paid profiles open them", () => {
  assert.equal(isFeatureGated(null, "admitbuddy", "practice_exams"), true);
  assert.equal(isFeatureGated(free, "mediscan", "doctor_booking"), true);
  const lamia = createSessionFromPersona(PERSONAS.lamia_akter);
  assert.equal(isFeatureGated(lamia, "mediscan", "doctor_booking"), false);
  assert.equal(isFeatureGated(lamia, "admitbuddy", "practice_exams"), true);
  const najeeb = createSessionFromPersona(PERSONAS.najeeb_ahmed);
  for (const [app, features] of Object.entries(PAID_FEATURES)) for (const f of features) assert.equal(isFeatureGated(najeeb, app, f), false);
});

test("session: any paid profile is a demo; a free one is not", () => {
  assert.equal(free.demo, false);
  assert.equal(createSessionFromPersona(PERSONAS.lamia_akter).demo, true);
  assert.equal(createSessionFromPersona(PERSONAS.najeeb_ahmed).demo, true);
});

test("session: demo Pro is labelled demo; early access never unlocks anything", () => {
  const all = enableDemoPro(free, "all");
  assert.equal(all.tier, "pro");
  assert.equal(all.demo, true);
  const one = enableDemoPro(free, "admitbuddy");
  assert.equal(one.tier, "partial");
  assert.ok(one.unlockedApps.includes("admitbuddy") && one.demo);

  const early = joinEarlyAccess(free, "all", () => "2026-11-19T01:00:00.000Z");
  assert.equal(early.tier, "free");
  assert.deepEqual(early.unlockedApps, []);
  assert.equal(early.demo, false);
  assert.deepEqual(early.earlyAccess, [{ scope: "all", at: "2026-11-19T01:00:00.000Z" }]);
  assert.equal(joinEarlyAccess(early, "all").earlyAccess.length, 1, "no duplicate entries");
  assert.equal(isFeatureGated(early, "admitbuddy", "practice_exams"), true);
});

test("session: stored data is untrusted; a paid tier read from storage is always marked demo", () => {
  assert.equal(sanitizeSession(null), null);
  assert.equal(sanitizeSession([]), null);
  assert.equal(sanitizeSession({ personaId: "" }), null);
  const forged = sanitizeSession({ personaId: "x", tier: "pro", unlockedApps: ["*", "<script>"], demo: false, purchases: [{ trxId: "FAKE1234" }] });
  assert.equal(forged?.tier, "pro");
  assert.equal(forged?.demo, true, "a hand-edited paid tier still shows as demo");
  assert.deepEqual(forged?.unlockedApps, ["*"]);
  const freeStar = sanitizeSession({ personaId: "x", tier: "free", unlockedApps: ["*"] });
  assert.deepEqual(freeStar?.unlockedApps, []);
  assert.equal(sanitizeSession({ personaId: "x", tier: "weird" })?.tier, "free");
});

test("session: storage keys and legacy migration", () => {
  assert.equal(AUTH_SESSION_KEY, "kormopath:auth:session");
  assert.equal(LEGACY_AUTH_SESSION_KEY, "kormopath:platform:session");
  const map = new Map<string, string>();
  const store = { getItem: (k: string) => map.get(k) ?? null, setItem: (k: string, v: string) => void map.set(k, v), removeItem: (k: string) => void map.delete(k) };
  map.set(LEGACY_AUTH_SESSION_KEY, JSON.stringify({ personaId: "lamia_akter", tier: "partial", unlockedApps: ["mediscan"] }));
  const loaded = getStoredSession(store);
  assert.equal(loaded?.personaId, "lamia_akter");
  assert.equal(loaded?.demo, true);
  assert.ok(map.get(AUTH_SESSION_KEY));
  map.set(AUTH_SESSION_KEY, "{not json");
  assert.equal(getStoredSession(store), null);
});
