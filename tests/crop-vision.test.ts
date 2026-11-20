import test from "node:test";
import assert from "node:assert/strict";
import { sanitizeCropAdvice, buildCropVisionSystemPrompt } from "../lib/cropVision.ts";

test("Crop Vision: sanitizeCropAdvice removes chemical dosages and attaches helpline 16123", () => {
  const unsafeText = "পাতার দাগের জন্য প্রতি লিটারে 2 ml টিল্ট বা 5 গ্রাম কার্বেনডাজিম স্প্রে করুন।";
  const { cleanText, dosesRemoved } = sanitizeCropAdvice(unsafeText);

  assert.equal(dosesRemoved, true);
  assert.ok(!cleanText.includes("2 ml"));
  assert.ok(!cleanText.includes("5 গ্রাম"));
  assert.ok(cleanText.includes("[অনুমোদিত মাত্রা প্যাকেটের লেবেল দেখে নিন]"));
  assert.ok(cleanText.includes("১৬১২৩"));
});

test("Crop Vision: sanitizeCropAdvice leaves safe cultural remedies untouched", () => {
  const safeText = "আক্রান্ত পাতা তুলে মাটিতে পুঁতে ফেলুন এবং জমিতে অতিরিক্ত পানি জমতে দেবেন না। নিম খৈল ব্যবহার করুন।";
  const { cleanText, dosesRemoved } = sanitizeCropAdvice(safeText);

  assert.equal(dosesRemoved, false);
  assert.equal(cleanText, safeText);
});

test("Crop Vision: buildCropVisionSystemPrompt mandates no-dose rule and 16123 helpline", () => {
  const prompt = buildCropVisionSystemPrompt();
  assert.ok(prompt.includes("DO NOT provide specific chemical dosages"));
  assert.ok(prompt.includes("16123"));
});
