// Bangla-first UX helpers: the fever-watch date echo and the Probaho question translations.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readableDate } from "../app/mediscan/bnDate.ts";
import { PROMPT_BN, LEVEL_BN } from "../app/probaho/promptBn.ts";
import { QUESTIONS } from "../lib/speech.ts";

test("readableDate writes the chosen fever date in Bangla words and digits", () => {
  assert.equal(readableDate("2026-11-05", true), "৫ নভেম্বর ২০২৬");
  assert.equal(readableDate("2026-01-31", true), "৩১ জানুয়ারি ২০২৬");
  assert.equal(readableDate("2026-11-05", false), "5 November 2026");
});

test("readableDate returns nothing for missing or impossible dates", () => {
  for (const bad of ["", "2026-13-01", "2026-02-30", "2026-00-10", "05/11/2026", "2026-11-5"]) {
    assert.equal(readableDate(bad, true), "", bad);
  }
  assert.equal(readableDate("2028-02-29", true), "২৯ ফেব্রুয়ারি ২০২৮"); // leap year
});

test("every English Probaho question has a Bangla version, and no stray ids", () => {
  const english = QUESTIONS.filter((q) => q.lang === "en").map((q) => q.id);
  for (const id of english) assert.ok(PROMPT_BN[id]?.trim(), `missing Bangla prompt for ${id}`);
  const known = new Set(QUESTIONS.map((q) => q.id));
  for (const id of Object.keys(PROMPT_BN)) assert.ok(known.has(id), `PROMPT_BN has unknown id ${id}`);
  for (const level of new Set(QUESTIONS.map((q) => q.level))) assert.ok(LEVEL_BN[level], `missing level ${level}`);
});

test("Bangla prompts are written in Bangla script", () => {
  for (const [id, text] of Object.entries(PROMPT_BN)) assert.match(text, /[ঀ-৿]/, id);
});
