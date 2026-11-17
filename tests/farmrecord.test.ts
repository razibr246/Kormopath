import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  buildFarmRecord, farmRecordJson, sanitizeHarvests, FARM_RECORD_DISCLAIMER_EN,
  type FarmLog, type FarmTask, type Herd, type HarvestRec, type Plot,
} from "../lib/krishi.ts";

const plots: Plot[] = [
  { id: "p1", name: "পুকুরপাড়", decimals: 33, level: "medium", water: "shallow-tubewell", history: [{ season: "আমন ২০২৬", cropId: "rice" }], soilTest: { ph: 6.2, tested: "2026-06-01" } },
  { id: "p2", name: "বাড়ির পাশে", decimals: 10, level: "high", water: "rain", history: [] },
];
const tasks: FarmTask[] = [
  { id: "t1", title: "আমন চারা রোপণ", date: "2026-07-20", kind: "sow", plotId: "p1", done: true },
  { id: "t2", title: "ইউরিয়া উপরি প্রয়োগ", date: "2026-08-10", kind: "fertilise", plotId: "p1", done: true },
  { id: "t3", title: "সেচ", date: "2026-08-15", kind: "irrigate", plotId: "p1", done: false }, // not done → excluded
  { id: "t4", title: "নিড়ানি", date: "2026-08-20", kind: "weed", done: true }, // no plot
  { id: "t5", title: "পুরোনো কাজ", date: "2025-01-01", kind: "other", plotId: "p1", done: true }, // out of range
];
const harvests: HarvestRec[] = [{ id: "h1", plotId: "p1", cropId: "rice", date: "2026-11-25", kg: 650, soldKg: 400, salePoisha: 1_200_000, buyer: "স্থানীয় আড়ত" }];
const herds: Herd[] = [{ id: "g1", kind: "cow", name: "লালি", count: 2 }];
const logs: FarmLog[] = [
  { id: "l1", herdId: "g1", date: "2026-09-01", kind: "milk-l", amount: 4.5 },
  { id: "l2", herdId: "g1", date: "2026-09-02", kind: "vaccination", amount: 0, nextDue: "2027-03-01" },
  { id: "l3", herdId: "g1", date: "2026-09-03", kind: "sale", amount: 50_000 },
  { id: "l4", herdId: "gone", date: "2026-09-03", kind: "eggs", amount: 10 }, // herd deleted → excluded
];
const build = () => buildFarmRecord({ plots, tasks, herds, logs, harvests, budgets: [{ plotId: "p1", cropId: "rice", costs: [{ label: "সার", taka: 1500.5 }, { label: "শ্রমিক", taka: 3000 }], expectedKg: 600, priceTaka: 30, priceSource: "আড়ত" }], from: "2026-01-01", to: "2026-12-31", generatedOn: "2026-12-31" });

describe("MaathSathi farm record", () => {
  test("season summary per plot uses only the farmer's completed, in-range records", () => {
    const r = build();
    const p1 = r.plots.find((p) => p.plotId === "p1")!;
    assert.deepEqual(p1.sown, [{ date: "2026-07-20", title: "আমন চারা রোপণ" }]);
    assert.deepEqual(p1.inputs.map((x) => x.title), ["ইউরিয়া উপরি প্রয়োগ"]);
    assert.equal(p1.otherWork.length, 0);
    assert.equal(p1.harvestKg, 650);
    assert.equal(p1.soldKg, 400);
    assert.equal(p1.salePoisha, 1_200_000);
    assert.equal(p1.plannedCostPoisha, 450_050);
    assert.deepEqual(p1.cropsGrown, [{ season: "আমন ২০২৬", cropBn: "ধান" }]);
    assert.match(p1.soilTest!, /pH 6.2/);
    const p2 = r.plots.find((p) => p.plotId === "p2")!;
    assert.equal(p2.harvestKg, 0);
    assert.equal(p2.plannedCostPoisha, null, "no plan → no invented cost");
    assert.deepEqual(r.unassignedWork.map((w) => w.title), ["নিড়ানি"]);
    assert.equal(r.herds[0].milkL, 4.5);
    assert.equal(r.herds[0].salePoisha, 50_000);
  });

  test("logs are shaped like farmOS logs and use only activity/input/harvest/observation", () => {
    const r = build();
    const types = new Set(r.logs.map((l) => l.type));
    for (const t of types) assert.ok(["activity", "input", "harvest", "observation"].includes(t), t);
    for (const l of r.logs) {
      assert.equal(l.status, "done");
      assert.match(l.timestamp, /^\d{4}-\d{2}-\d{2}T00:00:00\+06:00$/);
      assert.ok(l.name.length > 0);
      for (const q of l.quantity) assert.ok(Number.isFinite(q.value) && q.units.length > 0);
    }
    const sorted = [...r.logs].sort((a, b) => a.timestamp.localeCompare(b.timestamp) || a.id.localeCompare(b.id));
    assert.deepEqual(r.logs.map((l) => l.id), sorted.map((l) => l.id));
    const harvest = r.logs.find((l) => l.id === "harvest-h1")!;
    assert.equal(harvest.type, "harvest");
    assert.deepEqual(harvest.quantity, [
      { measure: "weight", value: 650, units: "kg", label: "harvested" },
      { measure: "weight", value: 400, units: "kg", label: "sold" },
      { measure: "value", value: 12000, units: "BDT", label: "sale received" },
    ]);
    assert.equal(r.logs.find((l) => l.id === "task-t1")!.type, "activity");
    const fert = r.logs.find((l) => l.id === "task-t2")!;
    assert.equal(fert.type, "input");
    assert.deepEqual(fert.quantity, [], "no dose is ever recorded or invented");
    assert.equal(r.logs.find((l) => l.id === "soil-p1")!.type, "observation");
    assert.deepEqual(r.logs.find((l) => l.id === "herd-l1")!.quantity, [{ measure: "volume", value: 4.5, units: "l" }]);
    assert.ok(!r.logs.some((l) => l.id === "task-t3" || l.id === "task-t5" || l.id === "herd-l4"));
    assert.equal(r.totals.logCount, r.logs.length);
  });

  test("JSON export is labelled self-recorded and not verified", () => {
    const r = build();
    const j = JSON.parse(farmRecordJson(r, plots, herds));
    assert.equal(j.verified, false);
    assert.equal(j.disclaimer.en, FARM_RECORD_DISCLAIMER_EN);
    assert.match(j.disclaimer.en, /not verified/);
    assert.equal(j.assets.land.length, 2);
    assert.equal(j.logs.length, r.logs.length);
  });

  test("rejects a bad period and empty data gives an empty record", () => {
    assert.throws(() => buildFarmRecord({ plots, tasks, herds, logs, harvests, from: "2026-12-31", to: "2026-01-01", generatedOn: "2026-12-31" }));
    const r = buildFarmRecord({ plots: [], tasks: [], herds: [], logs: [], harvests: [], from: "2026-01-01", to: "2026-12-31", generatedOn: "2026-12-31" });
    assert.equal(r.logs.length, 0);
    assert.equal(r.totals.harvestKg, 0);
  });

  test("sanitizeHarvests keeps valid farmer entries only", () => {
    const s = sanitizeHarvests([
      { id: "a", plotId: "p1", cropId: "rice", date: "2026-11-01", kg: 10, salePoisha: 12.5 },
      { id: "b", plotId: "p1", cropId: "rice", date: "2026-02-30", kg: 10 },
      { id: "c", plotId: "p1", cropId: "rice", date: "2026-11-01", kg: -1 },
    ])!;
    assert.equal(s.length, 1);
    assert.equal(s[0].salePoisha, undefined, "non-integer poisha dropped");
    assert.equal(sanitizeHarvests({}), null);
  });
});
