import { test } from "node:test";
import assert from "node:assert/strict";
import {
  parsePrescriptionText, checkPair, checkAllPairs, detectRedFlags, comparePrices, unitsForCourse,
  DRUG_REFERENCE, checkInteractions,
} from "../lib/prescription.ts";

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

test("DRUG_REFERENCE catalog expansion contains 20+ generics with complete schema integrity", () => {
  assert.ok(DRUG_REFERENCE.length >= 20, `Expected >= 20 drugs, found ${DRUG_REFERENCE.length}`);
  const requiredIds = [
    "ciprofloxacin", "amoxicillin-clavulanic", "cefixime", "losartan",
    "amlodipine", "atorvastatin", "cetirizine", "domperidone", "ors",
    "metronidazole", "salbutamol", "alcohol",
  ];
  for (const id of requiredIds) {
    const d = DRUG_REFERENCE.find((x) => x.id === id);
    assert.ok(d, `Drug ${id} must exist in DRUG_REFERENCE`);
    assert.ok(d.genericName.length > 0, `${id} genericName must be non-empty`);
    assert.ok(d.aliases.length > 0, `${id} must have aliases`);
    assert.ok(d.ingredients.length > 0, `${id} must have ingredients`);
    assert.ok(d.whatItIsForBn.length > 0, `${id} must have Bengali what-it-is-for`);
    assert.ok(d.generalNotesBn.length > 0, `${id} must have Bengali notes`);
  }
  const idSet = new Set(DRUG_REFERENCE.map((d) => d.id));
  assert.equal(idSet.size, DRUG_REFERENCE.length, "Drug IDs must be unique");
});

test("Brand alias resolution matches Bangladeshi commercial brands for newly added drugs", () => {
  const brandTests: [string, string][] = [
    ["Tab. Ciprocin 500mg 1+0+1", "ciprofloxacin"],
    ["Tab. Moxaclav 625mg 1+0+1", "amoxicillin-clavulanic"],
    ["Cap. Cef-3 200mg 1+0+1", "cefixime"],
    ["Tab. Osartil 50mg 1+0+0", "losartan"],
    ["Tab. Camlodin 5mg 1+0+0", "amlodipine"],
    ["Tab. Atova 10mg 0+0+1", "atorvastatin"],
    ["Tab. Alatrol 10mg 0+0+1", "cetirizine"],
    ["Tab. Motigut 10mg 1+1+1", "domperidone"],
    ["Syp. Orsaline-N 1 packet", "ors"],
    ["Tab. Filmet 400mg 1+1+1", "metronidazole"],
    ["Inhaler Ventolin 100mcg", "salbutamol"],
  ];

  for (const [line, expectedId] of brandTests) {
    const p = parsePrescriptionText(line);
    assert.equal(p.lines.length, 1, `Failed to parse line: ${line}`);
    assert.equal(p.lines[0].drugId, expectedId, `Brand in "${line}" should map to ${expectedId}`);
  }
});

test("Ciprofloxacin + Antacid triggers chelation warning in checkPair and checkInteractions", () => {
  // checkPair
  const pairNote = checkPair("ciprofloxacin", "antacid-almg");
  assert.equal(pairNote.level, "caution");
  assert.ok(pairNote.titleBn.includes("সিপ্রোফ্লক্সাসিন") || pairNote.titleBn.includes("অ্যান্টাসিড"));
  assert.ok(pairNote.adviceBn.includes("চিলেশন") || pairNote.adviceBn.includes("ঘণ্টা"));

  // checkInteractions
  const interResults = checkInteractions(["ciprofloxacin", "antacid-almg"]);
  assert.equal(interResults.length, 1);
  assert.equal(interResults[0].severity, "warning");
  assert.ok(interResults[0].mechanism.includes("Chelation"));
  assert.ok(interResults[0].recommendation.includes("2 hours"));
});

test("Metronidazole + Alcohol triggers critical disulfiram-like reaction warning", () => {
  // checkPair
  const pairNote = checkPair("metronidazole", "alcohol");
  assert.equal(pairNote.level, "caution");
  assert.ok(pairNote.titleBn.includes("মেট্রোনিডাজল") || pairNote.titleBn.includes("অ্যালকোহল"));
  assert.ok(pairNote.adviceBn.includes("৪৮–৭২") || pairNote.adviceBn.includes("ডাইসালফিরাম"));

  // checkInteractions
  const interResults = checkInteractions(["metronidazole", "alcohol"]);
  assert.equal(interResults.length, 1);
  assert.equal(interResults[0].severity, "critical");
  assert.ok(interResults[0].mechanism.includes("Disulfiram"));
  assert.ok(interResults[0].recommendation.includes("alcohol"));
});

test("checkInteractions evaluates unknown pairs as 'no-data', never 'safe'", () => {
  const unk = checkInteractions(["atorvastatin", "ors"]);
  assert.equal(unk.length, 1);
  assert.equal(unk[0].severity, "no-data");
  assert.ok(unk[0].recommendation.includes("safe"));
  assert.ok(unk[0].adviceBn?.includes("নিরাপদ"));

  // Duplicate PPI
  const ppiDup = checkInteractions(["omeprazole", "pantoprazole"]);
  assert.equal(ppiDup[0].severity, "warning");
  assert.ok(ppiDup[0].mechanism.includes("proton pump"));

  // Shared active ingredient
  const shared = checkInteractions(["paracetamol", "paracetamol-caffeine"]);
  assert.equal(shared[0].severity, "warning");
  assert.ok(shared[0].mechanism.includes("paracetamol"));
});

test("Multi-drug prescription line parsing handles new cardiovascular and antibiotic regimens", () => {
  const raw = `
Rx
Tab. Ciprocin 500mg 1+0+1 x 7 days
Tab. Osartil 50mg 1+0+0 x 30 days
Tab. Motigut 10mg 1+1+1 x 5 days a.c.
Syp. Antacid 2 tsp after meal
`;
  const p = parsePrescriptionText(raw);
  assert.equal(p.lines.length, 4);
  assert.equal(p.lines[0].drugId, "ciprofloxacin");
  assert.equal(p.lines[0].durationText, "৭ দিন");
  assert.equal(p.lines[1].drugId, "losartan");
  assert.equal(p.lines[1].durationText, "৩০ দিন");
  assert.equal(p.lines[2].drugId, "domperidone");
  assert.equal(p.lines[2].mealTiming, "before");
  assert.equal(p.lines[3].drugId, "antacid-almg");
  assert.equal(p.lines[3].mealTiming, "after");

  // Interaction check across all recognised drugs in the prescription
  const drugIds = p.lines.map((l) => l.drugId).filter((id): id is string => !!id);
  const interactions = checkInteractions(drugIds);
  const ciproAntacid = interactions.find(
    (i) => (i.pair[0] === "ciprofloxacin" && i.pair[1] === "antacid-almg") ||
           (i.pair[1] === "ciprofloxacin" && i.pair[0] === "antacid-almg")
  );
  assert.ok(ciproAntacid, "Prescription should detect ciprofloxacin + antacid chelation");
  assert.equal(ciproAntacid.severity, "warning");
});
