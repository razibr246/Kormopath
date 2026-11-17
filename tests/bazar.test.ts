import { test } from "node:test";
import assert from "node:assert/strict";
import { toBase, unitPricePoisha, itemKey, tripTotal, finishTrip, priceStats, sanitizeBazar, QUICK_ITEMS, type BazarState } from "../lib/bazar.ts";

test("bazar units: g to kg, hali = 4 pieces, dozen = 12 pieces", () => {
  assert.deepEqual(toBase(500, "g"), { qty: 0.5, unit: "kg" });
  assert.deepEqual(toBase(2, "hali"), { qty: 8, unit: "piece" });
  assert.deepEqual(toBase(1, "dozen"), { qty: 12, unit: "piece" });
  assert.equal(unitPricePoisha(4500, 500, "g"), 9000); // Tk 45 for 500 g = Tk 90/kg
  assert.equal(unitPricePoisha(5400, 1, "hali"), 1350); // Tk 54 a hali = Tk 13.50 an egg
  assert.equal(unitPricePoisha(100, 0, "kg"), null);
});

test("bazar: Bangla names match whether composed or decomposed", () => {
  const composed = "পেঁয়াজ".normalize("NFC"), decomposed = "পেঁয়াজ".normalize("NFD");
  assert.equal(itemKey(composed), itemKey(decomposed));
  assert.equal(itemKey("  Red   Onion "), "red onion");
});

test("bazar: quick chips carry names only, no prices", () => {
  for (const q of QUICK_ITEMS) assert.deepEqual(Object.keys(q).sort(), ["bn", "en", "unit"]);
});

test("bazar: finishing a trip totals priced ticks, logs history, keeps the rest", () => {
  const s: BazarState = {
    items: [
      { id: "a", name: "চাল", qty: 5, unit: "kg", checked: true, pricePoisha: 37500 },
      { id: "b", name: "ডিম", qty: 2, unit: "hali", checked: true, pricePoisha: 10800 },
      { id: "c", name: "তেল", qty: 1, unit: "litre", checked: true, pricePoisha: null },
      { id: "d", name: "আলু", qty: 2, unit: "kg", checked: false, pricePoisha: null },
    ],
    history: [],
  };
  assert.equal(tripTotal(s.items), 48300);
  const r = finishTrip(s, "2026-11-17");
  assert.equal(r.totalPoisha, 48300);
  assert.equal(r.count, 2);
  assert.ok(r.note.includes("চাল") && r.note.includes("ডিম"));
  assert.deepEqual(r.state.items.map((i) => i.id), ["c", "d"]);
  assert.equal(r.state.history.length, 2);
});

test("bazar: personal price stats from own entries, change vs previous month", () => {
  const h = [
    { key: "চাল", name: "চাল", date: "2026-10-05", qty: 5, unit: "kg" as const, pricePoisha: 35000 }, // 70/kg
    { key: "চাল", name: "চাল", date: "2026-10-20", qty: 5, unit: "kg" as const, pricePoisha: 37000 }, // 74/kg
    { key: "চাল", name: "চাল", date: "2026-11-10", qty: 5, unit: "kg" as const, pricePoisha: 40000 }, // 80/kg
  ];
  const [s] = priceStats(h, "2026-11-17");
  assert.equal(s.unit, "kg");
  assert.equal(s.lastPoisha, 8000);
  assert.equal(s.prevMonthPoisha, 7200);
  assert.equal(s.thisMonthPoisha, 8000);
  assert.equal(s.changePct, 11.1);
  assert.equal(s.avg30Poisha, 7700); // 20 Oct and 10 Nov are inside 30 days
});

test("bazar: per-kg and per-piece buys of one item are never averaged together", () => {
  const h = [
    { key: "মাছ", name: "মাছ", date: "2026-11-01", qty: 1, unit: "kg" as const, pricePoisha: 30000 },
    { key: "মাছ", name: "মাছ", date: "2026-11-02", qty: 2, unit: "piece" as const, pricePoisha: 40000 },
  ];
  assert.equal(priceStats(h, "2026-11-17").length, 2);
});

test("bazar: sanitize drops bad rows and rejects non-objects", () => {
  assert.equal(sanitizeBazar("x"), null);
  const s = sanitizeBazar({
    items: [{ id: "a", name: "চাল", qty: 5, unit: "kg", checked: true, pricePoisha: 100 }, { id: "b", name: "", qty: 1, unit: "kg" }, { id: "c", name: "x", qty: 1, unit: "ton" }],
    history: [{ name: "চাল", date: "2026-11-01", qty: 5, unit: "kg", pricePoisha: 1.5 }, { name: "চাল", date: "2026-11-01", qty: 5, unit: "kg", pricePoisha: 150 }],
  });
  assert.equal(s?.items.length, 1);
  assert.equal(s?.history.length, 1);
});
