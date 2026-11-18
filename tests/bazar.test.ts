import { test } from "node:test";
import assert from "node:assert/strict";
import {
  toBase,
  unitPricePoisha,
  itemKey,
  tripTotal,
  finishTrip,
  priceStats,
  sanitizeBazar,
  QUICK_ITEMS,
  storeSearchUrl,
  parseBanglaQty,
  parseBazarVoiceText,
  detectBazarCategory,
  formatBazarShareText,
  whatsappBazarHref,
  smsBazarHref,
  STORE_PLATFORMS,
  POPULAR_STORE_ITEMS,
  type BazarState,
} from "../lib/bazar.ts";

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

test("bazar: sanitize drops bad rows and preserves valid category", () => {
  assert.equal(sanitizeBazar("x"), null);
  const s = sanitizeBazar({
    items: [
      { id: "a", name: "চাল", qty: 5, unit: "kg", checked: true, pricePoisha: 100, category: "grocery" },
      { id: "b", name: "", qty: 1, unit: "kg" },
      { id: "c", name: "x", qty: 1, unit: "ton" },
      { id: "d", name: "খাতা", qty: 2, unit: "piece", checked: false, pricePoisha: null, category: "books_stationery" },
    ],
    history: [
      { name: "চাল", date: "2026-11-01", qty: 5, unit: "kg", pricePoisha: 1.5 },
      { name: "চাল", date: "2026-11-01", qty: 5, unit: "kg", pricePoisha: 150 },
    ],
  });
  assert.equal(s?.items.length, 2);
  assert.equal(s?.items[0].category, "grocery");
  assert.equal(s?.items[1].category, "books_stationery");
  assert.equal(s?.history.length, 1);
});

test("bazar: storeSearchUrl constructs valid external search URLs", () => {
  assert.ok(storeSearchUrl("daraz", "মাল্টিপ্লাগ").includes("daraz.com.bd/catalog/?q=%E0%A6%AE%E0%A6%BE%E0%A6%B2%E0%A7%8D%E0%A6%9F%E0%A6%BF%E0%A6%AA%E0%A7%8D%E0%A6%B2%E0%A6%BE%E0%A6%97"));
  assert.ok(storeSearchUrl("rokomari", "Casio fx-991EX").includes("rokomari.com/search?term=Casio%20fx-991EX"));
  assert.ok(storeSearchUrl("chaldal", "মিনিকেট চাল").includes("chaldal.com/search/"));
  assert.ok(storeSearchUrl("shwapno", "সয়াবিন তেল").includes("shwapno.com/search?q="));
  assert.equal(storeSearchUrl("tcb", "চাল"), "https://tcb.gov.bd/pages/static-pages/6922dcfb933eb65569e13083");
});

test("bazar: parseBanglaQty parses Bengali numerals and colloquial fractions", () => {
  assert.equal(parseBanglaQty("২.৫"), 2.5);
  assert.equal(parseBanglaQty("৫০০"), 500);
  assert.equal(parseBanglaQty("আধা"), 0.5);
  assert.equal(parseBanglaQty("অর্ধেক"), 0.5);
  assert.equal(parseBanglaQty("দেড়"), 1.5);
  assert.equal(parseBanglaQty("আড়াই"), 2.5);
  assert.equal(parseBanglaQty("পোয়া"), 0.25);
  assert.equal(parseBanglaQty("invalid"), null);
});

test("bazar: detectBazarCategory detects category from popular items and keywords", () => {
  assert.equal(detectBazarCategory("Casio fx-991EX ক্যালকুলেটর"), "books_stationery");
  assert.equal(detectBazarCategory("Cambridge IELTS 19"), "books_stationery");
  assert.equal(detectBazarCategory("মাল্টিপ্লাগ এক্সটেনশন"), "gadgets_home");
  assert.equal(detectBazarCategory("LED লাইট বাল্ব"), "gadgets_home");
  assert.equal(detectBazarCategory("দেশি মুরগি"), "fish_meat");
  assert.equal(detectBazarCategory("গোল আলু"), "produce");
  assert.equal(detectBazarCategory("মিনিকেট চাল"), "grocery");
});

test("bazar: parseBazarVoiceText parses multi-item sentences cleanly", () => {
  const text = "২ কেজি আলু, ১ লিটার সয়াবিন তেল আর ১ ডজন ডিম";
  const items = parseBazarVoiceText(text);
  assert.equal(items.length, 3);
  assert.equal(items[0].name, "আলু");
  assert.equal(items[0].qty, 2);
  assert.equal(items[0].unit, "kg");
  assert.equal(items[1].name, "সয়াবিন তেল");
  assert.equal(items[1].qty, 1);
  assert.equal(items[1].unit, "litre");
  assert.equal(items[2].name, "ডিম");
  assert.equal(items[2].qty, 1);
  assert.equal(items[2].unit, "dozen");

  // Trailing quantity format
  const trailing = parseBazarVoiceText("প্যাকেট আটা ২ কেজি, Casio ক্যালকুলেটর ১ পিস");
  assert.equal(trailing.length, 2);
  assert.equal(trailing[0].name, "প্যাকেট আটা");
  assert.equal(trailing[0].qty, 2);
  assert.equal(trailing[0].unit, "kg");
  assert.equal(trailing[1].name, "Casio ক্যালকুলেটর");
  assert.equal(trailing[1].unit, "piece");
});

test("bazar: formatBazarShareText generates structured shopping list for WhatsApp/SMS", () => {
  const items = [
    { id: "1", name: "মিনিকেট চাল", qty: 5, unit: "kg" as const, checked: true, pricePoisha: 37500 },
    { id: "2", name: "সয়াবিন তেল", qty: 2, unit: "litre" as const, checked: false, pricePoisha: null },
  ];
  const shareBn = formatBazarShareText(items, "2026-11-18", true);
  assert.ok(shareBn.includes("সহজ বাজেট — বাজারের ফর্দ"));
  assert.ok(shareBn.includes("[✓] ৫ কেজি মিনিকেট চাল (৳৩৭৫)"));
  assert.ok(shareBn.includes("[ ] ২ লিটার সয়াবিন তেল"));
  assert.ok(shareBn.includes("মোট আইটেম: ২টি"));

  const wa = whatsappBazarHref(shareBn);
  assert.ok(wa.startsWith("https://api.whatsapp.com/send?text="));
  assert.ok(smsBazarHref(shareBn).startsWith("sms:?body="));
});

test("bazar: popular store items catalog integrity", () => {
  assert.ok(POPULAR_STORE_ITEMS.length >= 20);
  for (const item of POPULAR_STORE_ITEMS) {
    assert.ok(item.id && item.nameBn && item.nameEn);
    assert.ok(item.defaultQty > 0);
    assert.ok(["daraz", "rokomari", "chaldal", "shwapno", "tcb"].includes(item.primaryStore));
  }
});
