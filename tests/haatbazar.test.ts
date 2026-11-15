import { test } from "node:test";
import assert from "node:assert/strict";
import {
  tripMargin,
  shareTruck,
  priceAgeDays,
  sprayWindow,
  seasonForMonth,
  calculateSensitivityCurve,
  DISTRICTS,
  CROP_DISEASES,
  KG_PER_MAUND,
  type WeatherHour,
} from "../lib/haatbazar.ts";

const base = { quantityKg: 1000, localPricePerKg: 38, distantPricePerKg: 48, transportPerMaund: 65, commissionPct: 5, labourPerMaund: 10, lossPct: 2, otherCosts: 300 };

test("Trip margin uses wholesale price and subtracts every cost", () => {
  const r = tripMargin(base);
  assert.equal(r.maunds, 25);
  assert.equal(r.sellableKg, 980);
  assert.equal(r.localRevenue, 38000);
  assert.equal(r.distantRevenue, 47040);
  assert.equal(r.commission, 2352);
  assert.equal(r.transport, 1625);
  assert.equal(r.labour, 250);
  // 47040 - 2352 - 1625 - 250 - 300 = 42513
  assert.equal(r.distantNet, 42513);
  assert.equal(r.extraVsLocal, 4513);
  assert.ok(r.worthIt);
});

test("Break-even distant price exactly matches selling locally", () => {
  const r = tripMargin(base);
  const atBreakEven = tripMargin({ ...base, distantPricePerKg: r.breakEvenDistantPrice });
  // at the (rounded-up) break-even price you never lose, and gain at most one paisa per sellable kg
  assert.ok(atBreakEven.extraVsLocal >= 0, `extra at break-even = ${atBreakEven.extraVsLocal}`);
  assert.ok(atBreakEven.extraVsLocal <= r.sellableKg * 0.01, `extra at break-even = ${atBreakEven.extraVsLocal}`);
});

test("When costs exceed the price gap, the trip is not worth it", () => {
  const r = tripMargin({ ...base, distantPricePerKg: 40 });
  assert.equal(r.worthIt, false);
  assert.ok(r.extraVsLocal < 0);
});

test("Shared truck fare splits by load and sums exactly", () => {
  const shares = shareTruck(4500, [10, 10, 5]);
  assert.equal(shares.reduce((a, b) => a + b, 0), 4500);
  assert.deepEqual(shares, [1800, 1800, 900]);
  const odd = shareTruck(1000, [1, 1, 1]);
  assert.equal(odd.reduce((a, b) => a + b, 0), 1000);
  assert.deepEqual(shareTruck(1000, [0, 0]), [0, 0]);
});

test("Price age is computed so stale prices can be flagged", () => {
  assert.equal(priceAgeDays("2026-11-01", "2026-11-05"), 4);
  assert.equal(priceAgeDays("bad", "2026-11-05"), Infinity);
});

const hour = (p: number, w: number, mm = 0): WeatherHour => ({ time: "", precipProbability: p, precipitationMm: mm, windKmh: w, temperatureC: 25 });

test("Spray window blocks rain or strong wind in the next 6 hours", () => {
  assert.equal(sprayWindow(Array(6).fill(hour(10, 5))).ok, true);
  assert.equal(sprayWindow([hour(10, 5), hour(70, 5), ...Array(4).fill(hour(10, 5))]).ok, false);
  assert.equal(sprayWindow(Array(6).fill(hour(10, 20))).ok, false);
  assert.equal(sprayWindow([]).ok, false);
});

test("Season lookup and no pesticide doses in disease notes", () => {
  assert.equal(seasonForMonth(12).id, "rabi");
  assert.equal(seasonForMonth(8).id, "kharif2");
  for (const d of CROP_DISEASES) {
    const all = Object.values(d).join(" ");
    assert.ok(!/(গ্রাম|মিলি|ml|g\/l|gm)\s*(?:প্রতি|\/|per)/i.test(all), `dose found in ${d.id}`);
    assert.ok(d.chemicalNoteBn.includes("১৬১২৩"));
  }
});

test("DISTRICTS list covers 28+ agricultural hubs across all 8 divisions with valid coordinates", () => {
  assert.ok(DISTRICTS.length >= 28, `Expected at least 28 districts, found ${DISTRICTS.length}`);
  
  // Unique IDs
  const idSet = new Set(DISTRICTS.map((d) => d.id));
  assert.equal(idSet.size, DISTRICTS.length, "All district IDs must be unique");

  // Geographic bounds of Bangladesh
  for (const d of DISTRICTS) {
    assert.ok(d.id && typeof d.id === "string" && !/\s/.test(d.id), `Invalid ID for district ${d.id}`);
    assert.ok(d.nameBn && typeof d.nameBn === "string", `Missing Bengali name for ${d.id}`);
    assert.ok(d.lat >= 20.5 && d.lat <= 26.6, `Latitude ${d.lat} out of Bangladesh bounds for ${d.id}`);
    assert.ok(d.lon >= 88.0 && d.lon <= 92.7, `Longitude ${d.lon} out of Bangladesh bounds for ${d.id}`);
  }

  // Verify critical agricultural hub representation across all divisions
  const requiredHubs = [
    "pabna", "natore", "naogaon", "sirajganj", // Rajshahi
    "chuadanga", "meherpur", "kushtia", "satkhira", // Khulna
    "gaibandha", "nilphamari", "panchagarh", // Rangpur
    "tangail", "narsingdi", "munshiganj", "kishoreganj", // Dhaka
    "jamalpur", "netrokona", // Mymensingh
    "brahmanbaria", "coxsbazar", "noakhali", // Chattogram
    "habiganj", "sunamganj", // Sylhet
    "bhola", "patuakhali", // Barishal
  ];
  for (const hub of requiredHubs) {
    assert.ok(idSet.has(hub), `Required agricultural hub ${hub} missing from DISTRICTS`);
  }
});

test("CROP_DISEASES catalog contains 8+ threats including tomato, onion, jute, and BPH with zero pesticide doses", () => {
  assert.ok(CROP_DISEASES.length >= 8, `Expected at least 8 crop diseases, found ${CROP_DISEASES.length}`);
  const ids = new Set(CROP_DISEASES.map((d) => d.id));

  // Verify newly added threats
  assert.ok(ids.has("tomato-bacterial-wilt"), "Tomato bacterial wilt must be present");
  assert.ok(ids.has("onion-purple-blotch"), "Onion purple blotch must be present");
  assert.ok(ids.has("jute-stem-rot"), "Jute stem rot must be present");
  assert.ok(ids.has("rice-brown-planthopper"), "Rice brown planthopper must be present");

  for (const d of CROP_DISEASES) {
    assert.ok(["high", "medium", "low"].includes(d.severity));
    assert.ok(d.cropNameBn.length > 0);
    assert.ok(d.diseaseNameBn.length > 0);
    assert.ok(d.symptomsBn.length > 0);
    assert.ok(d.preventiveActionBn.length > 0);
    assert.ok(d.nonChemicalBn.length > 0);
    // Mandatory helpline reference
    assert.ok(d.chemicalNoteBn.includes("১৬১২৩"), `Chemical note missing 16123 helpline in ${d.id}`);
    assert.ok(d.chemicalNoteBn.includes("উপজেলা কৃষি অফিস"), `Chemical note missing extension office in ${d.id}`);
    // Strict zero pesticide dosage check
    const fullText = `${d.symptomsBn} ${d.favouredByBn} ${d.preventiveActionBn} ${d.nonChemicalBn} ${d.chemicalNoteBn}`;
    assert.ok(!/(গ্রাম|মিলি|ml|g\/l|gm)\s*(?:প্রতি|\/|per)/i.test(fullText), `Prohibited pesticide dosage found in ${d.id}`);
  }
});

test("calculateSensitivityCurve produces monotonic curves and accurate price shocks", () => {
  const curve = calculateSensitivityCurve(base);
  assert.equal(curve.length, 7, "Default curve should have 7 delta points");

  // Check 0% baseline matches tripMargin
  const baseline = curve.find((p) => p.deltaPct === 0)!;
  assert.ok(baseline, "Baseline 0% must exist");
  assert.equal(baseline.adjustedWholesalePrice, base.distantPricePerKg);
  assert.equal(baseline.distantNet, 42513);
  assert.equal(baseline.extraVsLocal, 4513);
  assert.equal(baseline.worthIt, true);

  // Check -15% downward price shock
  const down15 = curve.find((p) => p.deltaPct === -15)!;
  assert.equal(down15.adjustedWholesalePrice, 40.8);
  assert.equal(down15.distantNet, 35809.8);
  assert.equal(down15.extraVsLocal, -2190.2);
  assert.equal(down15.worthIt, false);

  // Check +15% upward price shock
  const up15 = curve.find((p) => p.deltaPct === 15)!;
  assert.equal(up15.adjustedWholesalePrice, 55.2);
  assert.equal(up15.distantNet, 49216.2);
  assert.equal(up15.extraVsLocal, 11216.2);
  assert.equal(up15.worthIt, true);

  // Monotonicity check
  for (let i = 1; i < curve.length; i++) {
    assert.ok(curve[i].adjustedWholesalePrice > curve[i - 1].adjustedWholesalePrice, "Price must increase with delta");
    assert.ok(curve[i].distantNet > curve[i - 1].distantNet, "Distant net must increase with price");
    assert.ok(curve[i].extraVsLocal > curve[i - 1].extraVsLocal, "Extra profit must increase with price");
  }

  // Custom deltas support
  const custom = calculateSensitivityCurve(base, [-20, 20]);
  assert.equal(custom.length, 2);
  assert.equal(custom[0].deltaPct, -20);
  assert.equal(custom[1].deltaPct, 20);
});

test("Break-even price math handles extreme edge cases defensively", () => {
  // Zero quantity
  const zeroQ = tripMargin({ ...base, quantityKg: 0 });
  assert.equal(zeroQ.maunds, 0);
  assert.equal(zeroQ.breakEvenDistantPrice, Infinity);
  assert.equal(zeroQ.worthIt, false);

  // 100% transit loss
  const totalLoss = tripMargin({ ...base, lossPct: 100 });
  assert.equal(totalLoss.sellableKg, 0);
  assert.equal(totalLoss.breakEvenDistantPrice, Infinity);
  assert.equal(totalLoss.worthIt, false);

  // 100% arotdar commission
  const totalComm = tripMargin({ ...base, commissionPct: 100 });
  assert.equal(totalComm.breakEvenDistantPrice, Infinity);
});

test("Truck fare remainder distribution handles arbitrary loads and odd sums", () => {
  // Single farmer gets 100% of the fare
  assert.deepEqual(shareTruck(3000, [50]), [3000]);

  // Odd fare splitting evenly with fractional remainder
  const oddFare = shareTruck(7777, [7, 13, 29, 3]);
  assert.equal(oddFare.reduce((a, b) => a + b, 0), 7777, "Sum of shares must equal total fare exactly");

  // Zero fare or zero load returns zeros
  assert.deepEqual(shareTruck(0, [10, 20]), [0, 0]);
  assert.deepEqual(shareTruck(5000, [0, 0, 0]), [0, 0, 0]);
});
