import { test } from "node:test";
import assert from "node:assert/strict";
import { parsePrescriptionText, checkPair, checkAllPairs, detectRedFlags, comparePrices, unitsForCourse } from "../lib/prescription.ts";

test("Reads dose, duration and meal timing only from what is written", () => {
  const p = parsePrescriptionText("Dr. X\nRx: Tab. Napa Extra (500mg+65mg) 1+0+1 x 3 days p.c.\nCap. Seclo 20mg 1+0+1 x 14 days a.c.\nAdvice: rest");
  assert.equal(p.lines.length, 2, "doctor name and advice lines are not medicines");
  const [napa, seclo] = p.lines;
  assert.equal(napa.drugId, "paracetamol-caffeine", "longest alias wins: napa extra, not napa");
  assert.equal(napa.dose?.readingBn, "সকালে ১টি, রাতে ১টি");
  assert.equal(napa.durationText, "৩ দিন");
  assert.equal(napa.mealTiming, "after");
  assert.equal(seclo.drugId, "omeprazole");
  assert.equal(seclo.mealTiming, "before");
  assert.equal(seclo.strength, "20mg");
});

test("Missing dose or duration is reported, never invented", () => {
  const p = parsePrescriptionText("Tab. Comet 500mg");
  assert.equal(p.lines[0].dose, null);
  assert.equal(p.lines[0].durationText, null);
  assert.equal(p.lines[0].missing.length, 2);
});

test("Unknown medicine lines are kept and flagged, not replaced with a known drug", () => {
  const p = parsePrescriptionText("Tab. Xyzonil 10mg 0+0+1 x 7 days");
  assert.equal(p.lines.length, 1);
  assert.equal(p.lines[0].drugId, null);
  assert.equal(p.unrecognisedCount, 1);
  assert.equal(parsePrescriptionText("random text with no medicines").lines.length, 0, "no fallback medicines");
});

test("Bengali digits and Bangla duration words", () => {
  const p = parsePrescriptionText("ট্যাব Fexo 120mg ০+০+১ ৭ দিন খাবারের পরে");
  assert.equal(p.lines[0].drugId, "fexofenadine");
  assert.equal(p.lines[0].dose?.night, 1);
  assert.equal(p.lines[0].durationText, "৭ দিন");
  assert.equal(p.lines[0].mealTiming, "after");
});

test("Duplicate ingredient and duplicate class are caught; unknown pairs are 'no data', never 'safe'", () => {
  assert.equal(checkPair("paracetamol", "paracetamol-caffeine").level, "duplicate");
  assert.equal(checkPair("omeprazole", "esomeprazole").level, "duplicate");
  assert.equal(checkPair("azithromycin", "antacid-almg").level, "caution");
  const unknown = checkPair("metformin", "fexofenadine");
  assert.equal(unknown.level, "no-data");
  assert.ok(unknown.adviceBn.includes("নিরাপদ"), "explicitly says no-data is not 'safe'");
  assert.equal(checkAllPairs(["paracetamol", "paracetamol-caffeine", "metformin"]).length, 1);
});

test("Red flags trigger emergency guidance in English and Bangla", () => {
  assert.equal(detectRedFlags("my father has chest pain since morning")[0]?.id, "chest");
  assert.equal(detectRedFlags("রাত থেকে শ্বাসকষ্ট হচ্ছে")[0]?.id, "breath");
  assert.equal(detectRedFlags("Tab Napa 1+0+1 x 3 days").length, 0);
});

test("Price comparison uses user-entered quotes and course units from the written dose", () => {
  const p = parsePrescriptionText("Cap Seclo 20mg 1+0+1 x 14 days");
  const units = unitsForCourse(p.lines[0].dose, p.lines[0].durationText);
  assert.equal(units, 28);
  const c = comparePrices([{ label: "Brand A", pricePerUnit: 6 }, { label: "Brand B", pricePerUnit: 4.5 }], units!);
  assert.equal(c?.savingBdt, 42);
  assert.equal(c?.savingPct, 25);
  assert.equal(comparePrices([{ label: "Only one", pricePerUnit: 5 }], 10), null);
});
