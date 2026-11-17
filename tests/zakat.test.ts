import { test } from "node:test";
import assert from "node:assert/strict";
import {
  BHORI_MG, NISAB_GOLD_MG, NISAB_SILVER_MG, computeZakat, emptyZakat, formatTaka, groupTaka, holdingMg, nextHawlApprox,
  parseTakaInput, parseWeightInput, sanitizeZakat, simpleMaturity, valueAt, ZAKAT_SOURCES,
} from "../lib/zakat.ts";

test("zakat: built-in facts match their sources", () => {
  assert.equal(BHORI_MG, 11_664);
  assert.equal(NISAB_GOLD_MG, 87_480);
  assert.equal(NISAB_SILVER_MG, 612_360);
  assert.ok(ZAKAT_SOURCES.every((s) => s.url.startsWith("https://") && s.checked === "2026-11-17"));
});

test("zakat: weights and values in integer milligrams and poisha", () => {
  assert.equal(holdingMg({ unit: "bhori", weightMilli: 1000 }), 11_664);
  assert.equal(holdingMg({ unit: "gram", weightMilli: 5_500 }), 5_500);
  // 2 bhori at ৳1,00,000 per bhori = ৳2,00,000
  assert.equal(valueAt(holdingMg({ unit: "bhori", weightMilli: 2000 }), { poisha: 10_000_000, unit: "bhori" }), 20_000_000);
  // 10 g at ৳300 per gram
  assert.equal(valueAt(10_000, { poisha: 30_000, unit: "gram" }), 300_000);
  assert.equal(valueAt(10_000, undefined), null);
});

test("zakat: no price entered means no verdict, never a guess", () => {
  const s = emptyZakat();
  s.cash.cash = 100_000_000;
  const r = computeZakat(s);
  assert.equal(r.nisabPoisha, null);
  assert.equal(r.reachesNisab, null);
  assert.equal(r.duePoisha, 0);
});

test("zakat: 2.5% of net wealth once it reaches the silver nisab", () => {
  const s = emptyZakat();
  s.rates.silver["22K"] = { poisha: 30_000, unit: "gram" }; // user-typed example rate ৳300/g
  s.cash.cash = 50_000_000; // ৳5,00,000
  s.debtsPoisha = 10_000_000; // ৳1,00,000
  const r = computeZakat(s);
  assert.equal(r.nisabPoisha, Math.round((612_360 * 30_000) / 1000)); // ৳1,83,708
  assert.equal(r.netPoisha, 40_000_000);
  assert.equal(r.reachesNisab, true);
  assert.equal(r.duePoisha, 1_000_000); // ৳10,000
  s.cash.cash = 10_000_000;
  const below = computeZakat(s);
  assert.equal(below.reachesNisab, false);
  assert.equal(below.duePoisha, 0);
});

test("zakat: worn jewellery toggle and missing-rate warning", () => {
  const s = emptyZakat();
  s.holdings = [{ id: "a", metal: "gold", purity: "22K", unit: "bhori", weightMilli: 1000, worn: true, note: "" }];
  assert.deepEqual(computeZakat(s).missingRates, [{ metal: "gold", purity: "22K" }]);
  s.rates.gold["22K"] = { poisha: 20_000_000, unit: "bhori" };
  assert.equal(computeZakat(s).metalsPoisha, 20_000_000);
  s.includeWorn = false;
  assert.equal(computeZakat(s).metalsPoisha, 0);
  assert.deepEqual(computeZakat(s).missingRates, []);
});

test("zakat: hawl date is about one lunar year later", () => {
  assert.deepEqual(nextHawlApprox("2026-01-01", "2026-01-10"), { date: "2026-12-21", daysLeft: 345 });
  assert.equal(nextHawlApprox("2026-02-30", "2026-03-01"), null);
});

test("zakat: savings estimate is simple interest at the user's rate", () => {
  const r = simpleMaturity({ principalPoisha: 10_000_000, rateBps: 1000, startDate: "2026-01-01", maturityDate: "2027-01-01" });
  assert.deepEqual(r, { days: 365, profitPoisha: 1_000_000, totalPoisha: 11_000_000 });
  assert.equal(simpleMaturity({ principalPoisha: 1, rateBps: 1, startDate: "2027-01-01", maturityDate: "2026-01-01" }), null);
});

test("zakat: lakh/crore formatting and input parsing", () => {
  assert.equal(groupTaka(123_456_750), "12,34,567.50");
  assert.equal(groupTaka(100_000), "1,000");
  assert.equal(formatTaka(1_250_000_000, "bn"), "৳১,২৫,০০,০০০");
  assert.equal(parseTakaInput("১২,৫০০"), 1_250_000);
  assert.equal(parseTakaInput("12.5"), 1250);
  assert.equal(parseTakaInput("abc"), null);
  assert.equal(parseWeightInput("২.৫"), 2500);
  assert.equal(parseWeightInput("1.2345"), null);
});

test("zakat: sanitizer keeps valid data and drops junk", () => {
  assert.equal(sanitizeZakat(null), null);
  const s = sanitizeZakat({
    cash: { cash: 500, bankMfs: -3, dpsFdr: "x" }, debtsPoisha: 9,
    holdings: [{ metal: "gold", purity: "22K", unit: "bhori", weightMilli: 1500, worn: true }, { metal: "copper", purity: "22K", unit: "gram", weightMilli: 1 }],
    rates: { gold: { "22K": { poisha: 100, unit: "bhori" }, "99K": { poisha: 1, unit: "gram" } }, silver: { "21K": { poisha: -1, unit: "gram" } } },
    rateDate: "2026-11-17", rateSource: "bajus.org", basis: "gold", nisabPurity: "nope", hawlStart: "bad",
    savings: [{ kind: "sanchaypatra", name: "5-year", principalPoisha: 100, rateBps: 1150, startDate: "2026-01-01", maturityDate: "2031-01-01" }],
  })!;
  assert.equal(s.cash.cash, 500);
  assert.equal(s.cash.bankMfs, 0);
  assert.equal(s.holdings.length, 1);
  assert.deepEqual(s.rates.gold, { "22K": { poisha: 100, unit: "bhori" } });
  assert.deepEqual(s.rates.silver, {});
  assert.equal(s.basis, "gold");
  assert.equal(s.nisabPurity, "22K");
  assert.equal(s.hawlStart, "");
  assert.equal(s.savings[0].kind, "sanchaypatra");
});
