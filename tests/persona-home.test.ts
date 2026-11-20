import { test } from "node:test";
import assert from "node:assert/strict";
import { PERSONA_HOME, PAID_FEATURE_LABELS, SAFETY_LINKS, greetingFor, personaHome } from "../lib/personaHome.ts";
import { PAID_FEATURES, PERSONAS, isAlwaysFreeApp } from "../lib/session.ts";

const APP_IDS = ["workspace", "chuktiguard", "feeguard", "probaho", "path", "admitbuddy", "shohoj", "mediscan", "rokkha", "legal", "haatbazar", "krishi"];

test("every demo profile has its own home, listing each app exactly once", () => {
  assert.deepEqual(Object.keys(PERSONA_HOME).sort(), Object.keys(PERSONAS).sort());
  for (const [id, h] of Object.entries(PERSONA_HOME)) {
    assert.deepEqual([...h.apps].sort(), [...APP_IDS].sort(), id);
    assert.ok(h.quick.length >= 3, id);
    for (const q of h.quick) assert.match(q.href, /^\/[a-z]/, `${id} ${q.href}`);
  }
  // Homes differ: each profile sees a different first app.
  assert.equal(new Set(Object.values(PERSONA_HOME).map((h) => h.apps[0])).size, 3);
});

test("guests and unknown ids get the public page, not a personal home", () => {
  assert.equal(personaHome("guest"), null);
  assert.equal(personaHome(null), null);
  assert.equal(personaHome("__proto__"), null);
  assert.ok(personaHome("lamia_akter"));
});

test("every paid feature has a plain name, and safety links point at always-free tools", () => {
  for (const [app, feats] of Object.entries(PAID_FEATURES)) for (const f of feats) assert.ok(PAID_FEATURE_LABELS[`${app}:${f}`], `${app}:${f}`);
  assert.equal(Object.keys(PAID_FEATURE_LABELS).length, Object.values(PAID_FEATURES).flat().length);
  assert.ok(isAlwaysFreeApp("rokkha") && isAlwaysFreeApp("legal"));
  assert.deepEqual(SAFETY_LINKS.map((s) => s.href.split(/[/#]/)[1]), ["mediscan", "rokkha", "legal"]);
});

test("greeting follows the Dhaka hour", () => {
  assert.equal(greetingFor(8).bn, "শুভ সকাল");
  assert.equal(greetingFor(13).en, "Good afternoon");
  assert.equal(greetingFor(19).bn, "শুভ সন্ধ্যা");
  assert.equal(greetingFor(2).en, "Welcome back");
});
