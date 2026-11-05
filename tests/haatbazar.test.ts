import { test } from "node:test";
import assert from "node:assert/strict";
import { tripMargin, shareTruck, priceAgeDays, sprayWindow, seasonForMonth, CROP_DISEASES, type WeatherHour } from "../lib/haatbazar.ts";

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
