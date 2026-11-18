import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  toDecimals, fromDecimals, totalDecimals, holdingClass, toPoisha, cropBudget, rotationCheck, addDays, daysBetween,
  taskBuckets, taskWeatherWarnings, parseTaskUtterance, smsInfo, composeFarmSms, herdSummary, doctorVerdict,
  supportPath, sanitizePlots, sanitizeTasks, sanitizeHerds, sanitizeLogs, sanitizeGhers, bnNum,
  calculateStockingDensity, calculateFcr, checkSalinitySuitability, GHER_SPECIES_DATA,
  type FarmTask, type FarmLog,
} from "../lib/krishi.ts";
import { HELPLINES, SUPPORT, KRISHI_CHECKED } from "../lib/krishiData.ts";
import { diagnoseCropSymptom } from "../lib/haatbazar.ts";

describe("MaathSathi: land units", () => {
  test("acre and hectare convert exactly; bigha uses the farmer's size", () => {
    assert.equal(toDecimals(1, "acre"), 100);
    assert.equal(toDecimals(1, "hectare"), 247.11);
    assert.equal(toDecimals(2, "bigha"), 66);
    assert.equal(toDecimals(2, "bigha", 20), 40);
    assert.equal(fromDecimals(66, "bigha"), 2);
    assert.equal(fromDecimals(247.10538, "hectare"), 1);
  });
  test("rejects negative land and impossible bigha", () => {
    assert.throws(() => toDecimals(-1, "decimal"));
    assert.throws(() => toDecimals(1, "bigha", 0));
  });
  test("total area ignores broken records; holding classes follow the census bands", () => {
    assert.equal(totalDecimals([{ decimals: 33 }, { decimals: 16.5 }, { decimals: NaN }]), 49.5);
    assert.equal(holdingClass(4), "landless");
    assert.equal(holdingClass(49), "marginal");
    assert.equal(holdingClass(50), "small");
    assert.equal(holdingClass(249), "small");
    assert.equal(holdingClass(250), "medium");
    assert.equal(holdingClass(750), "large");
  });
});

describe("MaathSathi: crop budget in poisha", () => {
  test("profit reconciles and break-even rounds up to the poisha", () => {
    const b = cropBudget({
      costs: [{ label: "বীজ", poisha: toPoisha(1200) }, { label: "সার", poisha: toPoisha(2350.5) }, { label: "শ্রমিক", poisha: toPoisha(4000) }],
      expectedKg: 700,
      pricePerKgPoisha: toPoisha(14),
      decimals: 33,
    });
    assert.equal(b.totalCostPoisha, 755_050);
    assert.equal(b.revenuePoisha, 980_000);
    assert.equal(b.profitPoisha, 224_950);
    assert.equal(b.breakEvenPerKgPoisha, Math.ceil(755_050 / 700));
    assert.ok(b.reconciles);
    assert.equal(b.costPerDecimalPoisha, Math.round(755_050 / 33));
  });
  test("no harvest means no break-even price, and money input is validated", () => {
    assert.equal(cropBudget({ costs: [], expectedKg: 0, pricePerKgPoisha: 0, decimals: 0 }).breakEvenPerKgPoisha, null);
    assert.throws(() => toPoisha(-5));
    assert.throws(() => toPoisha(1.234));
    assert.throws(() => cropBudget({ costs: [{ label: "x", poisha: 1.5 }], expectedKg: 1, pricePerKgPoisha: 1, decimals: 1 }));
  });
});

describe("MaathSathi: rotation check", () => {
  test("rice after rice after rice is flagged and a pulse is suggested", () => {
    const r = rotationCheck([{ cropId: "rice" }, { cropId: "rice" }, { cropId: "rice" }]);
    assert.equal(r.longestSameFamilyRun, 3);
    assert.equal(r.legumeInLast3, false);
    assert.ok(r.notesBn.some((n) => n.includes("ডাল")));
  });
  test("a diverse rotation with a pulse scores higher than a monoculture", () => {
    const mono = rotationCheck([{ cropId: "rice" }, { cropId: "rice" }, { cropId: "rice" }, { cropId: "rice" }]);
    const mixed = rotationCheck([{ cropId: "rice" }, { cropId: "mustard" }, { cropId: "lentil" }, { cropId: "rice" }]);
    assert.ok(mixed.diversityScore > mono.diversityScore);
    assert.equal(mixed.legumeInLast3, true);
  });
  test("two nightshades in a row are flagged; empty history asks for records", () => {
    assert.ok(rotationCheck([{ cropId: "potato" }, { cropId: "tomato" }]).notesBn.some((n) => n.includes("একই গোত্রের")));
    assert.equal(rotationCheck([]).diversityScore, 0);
  });
});

describe("MaathSathi: tasks and weather", () => {
  const today = "2026-11-17";
  const tasks: FarmTask[] = [
    { id: "a", title: "সেচ", date: "2026-11-16", kind: "irrigate", done: false },
    { id: "b", title: "স্প্রে", date: today, kind: "spray", done: false },
    { id: "c", title: "নিড়ানি", date: "2026-11-20", kind: "weed", done: false },
    { id: "d", title: "হাটে যাওয়া", date: "2026-12-30", kind: "market", done: false },
    { id: "e", title: "সার", date: today, kind: "fertilise", done: true },
  ];
  test("buckets overdue, today, this week and later", () => {
    const b = taskBuckets(tasks, today);
    assert.deepEqual(b.overdue.map((t) => t.id), ["a"]);
    assert.deepEqual(b.today.map((t) => t.id), ["b"]);
    assert.deepEqual(b.upcoming.map((t) => t.id), ["c"]);
    assert.deepEqual(b.later.map((t) => t.id), ["d"]);
    assert.equal(b.done, 1);
  });
  test("spraying is flagged when the forecast says no; nothing is said without weather", () => {
    assert.equal(taskWeatherWarnings([tasks[1]], { sprayOk: false, rainLikely: true }).length, 1);
    assert.equal(taskWeatherWarnings([tasks[1]], { sprayOk: true, rainLikely: false }).length, 0);
    assert.equal(taskWeatherWarnings([tasks[1]], null).length, 0);
  });
  test("date helpers", () => {
    assert.equal(addDays("2026-12-31", 1), "2027-01-01");
    assert.equal(daysBetween("2026-11-17", "2026-11-20"), 3);
  });
});

describe("MaathSathi: Bangla voice to task", () => {
  const today = "2026-11-17";
  test("tomorrow's irrigation", () => {
    const p = parseTaskUtterance("কাল সকালে সেচ দিতে হবে", today);
    assert.equal(p?.kind, "irrigate");
    assert.equal(p?.date, "2026-11-18");
  });
  test("day after tomorrow, Bengali digits and 'n days later'", () => {
    assert.equal(parseTaskUtterance("পরশু সরিষার জমিতে নিড়ানি", today)?.date, "2026-11-19");
    assert.equal(parseTaskUtterance("৩ দিন পর গরুর টিকা", today)?.date, "2026-11-20");
    assert.equal(parseTaskUtterance("৩ দিন পর গরুর টিকা", today)?.kind, "animal");
  });
  test("unknown speech returns null so nothing is saved by guess", () => {
    assert.equal(parseTaskUtterance("আজ আকাশ খুব সুন্দর", today), null);
    assert.equal(parseTaskUtterance("   ", today), null);
  });
});

describe("MaathSathi: SMS", () => {
  test("Bangla uses UCS-2: 70 per SMS, 67 per part when split", () => {
    assert.deepEqual(smsInfo("আজ সেচ"), { encoding: "UCS-2", units: 6, segments: 1, perSegment: 70 });
    assert.equal(smsInfo("ক".repeat(71)).segments, 2);
    assert.equal(smsInfo("ক".repeat(134)).segments, 2);
    assert.equal(smsInfo("ক".repeat(135)).segments, 3);
  });
  test("plain English uses GSM-7; extension characters count double", () => {
    assert.deepEqual(smsInfo("a".repeat(160)), { encoding: "GSM-7", units: 160, segments: 1, perSegment: 160 });
    assert.equal(smsInfo("a".repeat(161)).segments, 2);
    assert.equal(smsInfo("€").units, 2);
  });
  test("farm SMS lists at most three tasks and the helpline", () => {
    const msg = composeFarmSms({
      dateBn: "১৭ নভেম্বর",
      sprayBn: "আজ নয়",
      tasks: [1, 2, 3, 4].map((i) => ({ id: String(i), title: `কাজ ${i}`, date: "2026-11-17", kind: "other" as const, done: false })),
      helpline: "১৬১২৩",
    });
    assert.ok(msg.includes("১. কাজ 1") && msg.includes("৩. কাজ 3") && !msg.includes("কাজ 4"));
    assert.ok(msg.includes("১৬১২৩"));
    assert.equal(bnNum(2026), "২০২৬");
  });
});

describe("MaathSathi: livestock, poultry and fish records", () => {
  const logs: FarmLog[] = [
    { id: "1", herdId: "cows", date: "2026-11-01", kind: "milk-l", amount: 6.5 },
    { id: "2", herdId: "cows", date: "2026-11-02", kind: "milk-l", amount: 7 },
    { id: "3", herdId: "hens", date: "2026-11-02", kind: "eggs", amount: 18 },
    { id: "4", herdId: "cows", date: "2026-11-03", kind: "expense", amount: 150_000 },
    { id: "5", herdId: "cows", date: "2026-11-03", kind: "sale", amount: 420_000 },
    { id: "6", herdId: "cows", date: "2026-10-01", kind: "vaccination", amount: 0, nextDue: "2026-11-20" },
    { id: "7", herdId: "hens", date: "2026-10-01", kind: "vaccination", amount: 0, nextDue: "2026-11-10" },
    { id: "8", herdId: "pond", date: "2026-10-01", kind: "vaccination", amount: 0, nextDue: "2027-03-01" },
  ];
  test("totals, net and reminders only from dates the farmer entered", () => {
    const s = herdSummary(logs, "2026-11-01", "2026-11-30", "2026-11-17");
    assert.equal(s.milkL, 13.5);
    assert.equal(s.eggs, 18);
    assert.equal(s.netPoisha, 270_000);
    assert.ok(s.reconciles);
    assert.deepEqual(s.vaccinationsDue.map((v) => [v.herdId, v.overdue]), [["hens", true], ["cows", false]]);
  });
});

describe("MaathSathi: Crop Doctor honesty", () => {
  test("one matching word is never 'likely'", () => {
    assert.equal(doctorVerdict(100, 1, 1).verdict, "possible");
    assert.equal(doctorVerdict(100, 2, 2).verdict, "likely");
    assert.equal(doctorVerdict(33, 1, 3).verdict, "unsure");
    assert.equal(doctorVerdict(0, 0, 0).verdict, "unsure");
    assert.ok(doctorVerdict(0, 0, 2).bn.includes("১৬১২৩"));
  });
  test("the shared disease library never gives a dose and names 16123", () => {
    const r = diagnoseCropSymptom("potato", ["সাদা ছত্রাক", "পানিভেজা দাগ"]);
    assert.ok(r.topMatch);
    assert.equal(r.helpline.number, "16123");
    assert.doesNotMatch(r.helpline.note, /বিনামূল্যে/);
    assert.doesNotMatch(r.topMatch!.disease.chemicalNoteBn, /\d+\s*(মিলি|গ্রাম|ml|g)\b/i);
  });
});

describe("MaathSathi: sourced reference data", () => {
  test("every helpline and programme names an official source with a check date", () => {
    for (const h of [...HELPLINES, ...SUPPORT]) {
      assert.match(h.source.url, /^https:\/\/([a-z0-9-]+\.)*(gov\.bd|bb\.org\.bd)(\/|$)/);
      assert.match(h.source.checked, /^\d{4}-\d{2}-\d{2}$/);
    }
    assert.equal(KRISHI_CHECKED, "2026-11-17");
    assert.deepEqual(HELPLINES.map((h) => h.number), ["16123", "16358", "333", "999"]);
  });
  test("no programme text carries a dose or a taka amount", () => {
    for (const p of SUPPORT) assert.doesNotMatch(`${p.benefitBn} ${p.whereBn}`, /\d+\s*(টাকা|মিলি|কেজি|kg|ml)/);
  });
  test("support path: the bank account needs the card first", () => {
    const r = supportPath(SUPPORT, { decimals: 40, has: [] });
    assert.ok(r.ready.includes("krishi_card"));
    assert.deepEqual(r.needsFirst, [{ id: "ten_taka", missing: ["krishi_card"] }]);
    assert.ok(supportPath(SUPPORT, { decimals: 40, has: ["krishi_card"] }).ready.includes("ten_taka"));
  });
});

describe("MaathSathi: stored records are sanitised", () => {
  test("bad records are dropped, good ones kept", () => {
    assert.equal(sanitizePlots("x"), null);
    assert.equal(sanitizePlots([{ id: "p", name: "বাড়ির পাশের জমি", decimals: 33, level: "high", water: "rain", history: [{ season: "আমন ২০২৫", cropId: "rice" }] }, { id: 1 }])?.length, 1);
    assert.equal(sanitizeTasks([{ id: "t", title: "সেচ", date: "2026-13-40", kind: "irrigate" }])?.length, 0);
    assert.equal(sanitizeHerds([{ id: "h", name: "গরু", kind: "cow", count: 2 }, { id: "x", name: "?", kind: "dragon", count: 1 }])?.length, 1);
    assert.equal(sanitizeLogs([{ id: "l", herdId: "h", date: "2026-11-01", kind: "eggs", amount: -3 }])?.length, 0);
    assert.equal(sanitizeGhers([{ id: "g", name: "দক্ষিণ ঘের", decimals: 50, species: "bagda", salinityPpt: 18, waterDepthFeet: 4, stockingCount: 10000, stockingDate: "2026-03-15" }, { id: "bad" }])?.length, 1);
  });
});

describe("MaathSathi: coastal aquaculture & gher tracking", () => {
  test("stocking density calculates PL per decimal correctly", () => {
    // 10,000 PL in 50 decimals = 200 PL/decimal
    assert.equal(calculateStockingDensity(10000, 50), 200);
    assert.equal(calculateStockingDensity(3300, 33), 100);
    assert.equal(calculateStockingDensity(0, 50), 0);
    assert.equal(calculateStockingDensity(10000, 0), 0);
  });

  test("FCR (Feed Conversion Ratio) computes feed efficiency accurately", () => {
    // 1500 kg feed given for 1000 kg harvest = 1.5 FCR
    assert.equal(calculateFcr(1500, 1000), 1.5);
    // 1800 kg feed for 1200 kg harvest = 1.5 FCR
    assert.equal(calculateFcr(1800, 1200), 1.5);
    assert.equal(calculateFcr(0, 1000), null);
    assert.equal(calculateFcr(1500, 0), null);
  });

  test("salinity suitability matches Department of Fisheries biological thresholds", () => {
    // Bagda (Penaeus monodon): optimal 10-25 ppt
    assert.equal(checkSalinitySuitability("bagda", 18).status, "optimal");
    assert.equal(checkSalinitySuitability("bagda", 8).status, "tolerable");
    assert.equal(checkSalinitySuitability("bagda", 28).status, "tolerable");
    assert.equal(checkSalinitySuitability("bagda", 2).status, "stress");
    assert.equal(checkSalinitySuitability("bagda", 35).status, "stress");

    // Golda (Macrobrachium rosenbergii): freshwater preferring (0-5 ppt optimal)
    assert.equal(checkSalinitySuitability("golda", 3).status, "optimal");
    assert.equal(checkSalinitySuitability("golda", 7).status, "tolerable");
    assert.equal(checkSalinitySuitability("golda", 15).status, "stress");

    // Crab (Scylla serrata): high salinity brackish (15-28 ppt optimal)
    assert.equal(checkSalinitySuitability("crab", 20).status, "optimal");
    assert.equal(checkSalinitySuitability("crab", 12).status, "tolerable");
    assert.equal(checkSalinitySuitability("crab", 5).status, "stress");

    // Negative / invalid
    assert.equal(checkSalinitySuitability("bagda", -1).status, "stress");
  });

  test("GHER_SPECIES_DATA contains complete scientific and management benchmarks", () => {
    assert.ok(GHER_SPECIES_DATA.bagda.scientificName.includes("Penaeus"));
    assert.ok(GHER_SPECIES_DATA.golda.nameBn.includes("গলদা"));
    assert.ok(GHER_SPECIES_DATA.crab.optimalSalinityPpt.min >= 10);
  });
});
