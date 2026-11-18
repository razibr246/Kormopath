import { test } from "node:test";
import assert from "node:assert/strict";
import {
  addSettlement, dharTotals, formatTaka, isOverdue, normalizeBdMobile, perPerson, remainingPoisha, sanitizeDhar,
  settlementSlip, takaToPoisha, todayDhaka, validateEntry, whatsappHref, smsHref,
  generateReminderMessage, parseDharVoiceText, exportDharToIcs, KARZ_HASANA_ETHICS,
  type DharEntry,
} from "../lib/dhar.ts";

const entry = (over: Partial<DharEntry> = {}): DharEntry => ({
  id: "e1", direction: "receivable", counterparty: "Rakib", phone: "+8801712345678", principalPoisha: 50000,
  date: "2026-11-01", due: "2026-11-10", note: "", settlements: [], createdAt: 1, ...over,
});

test("dhar: taka text to integer poisha, Bangla digits and commas", () => {
  assert.equal(takaToPoisha("৫০০"), 50000);
  assert.equal(takaToPoisha("1,450.5"), 145050);
  assert.equal(takaToPoisha("12.345"), null);
  assert.equal(takaToPoisha("0"), null);
  assert.equal(takaToPoisha("-5"), null);
  assert.equal(takaToPoisha("abc"), null);
});

test("dhar: BD mobile normalised, wrong numbers rejected", () => {
  assert.equal(normalizeBdMobile("০১৭১২-৩৪৫৬৭৮"), "+8801712345678");
  assert.equal(normalizeBdMobile("+8801912345678"), "+8801912345678");
  assert.equal(normalizeBdMobile("01212345678"), null);
  assert.equal(normalizeBdMobile("12345"), null);
});

test("dhar: validation catches bad name, phone, amount and a due date before the start", () => {
  const ok = validateEntry({ direction: "payable", counterparty: "  Karim  Store ", phone: "", amount: "2913", date: "2026-11-01", due: "", note: "baki" });
  assert.ok(ok.ok && ok.entry.counterparty === "Karim Store" && ok.entry.principalPoisha === 291300 && ok.entry.phone === "");
  const bad = validateEntry({ direction: "payable", counterparty: "", phone: "123", amount: "x", date: "2026-02-30", due: "2026-01-01", note: "" });
  assert.ok(!bad.ok);
  if (!bad.ok) for (const k of ["name", "phone", "amount", "date"] as const) assert.ok(bad.errors.includes(k), k);
});

test("dhar: settlements are append-only and never exceed what is open", () => {
  let e = entry();
  const r1 = addSettlement(e, { id: "s1", date: "2026-11-05", amountPoisha: 20000 });
  assert.ok(r1.ok); if (r1.ok) e = r1.entry;
  assert.equal(remainingPoisha(e), 30000);
  const r2 = addSettlement(e, { id: "s2", date: "2026-11-06", amountPoisha: 40000 });
  assert.deepEqual(r2, { ok: false, reason: "more_than_remaining" });
  assert.equal(addSettlement(e, { id: "s3", date: "2026-11-06", amountPoisha: 0 }).ok, false);
  const r4 = addSettlement(e, { id: "s4", date: "2026-11-07", amountPoisha: 30000 });
  assert.ok(r4.ok && remainingPoisha(r4.entry) === 0 && r4.entry.settlements.length === 2);
});

test("dhar: totals, net, overdue on Dhaka date, per person", () => {
  const list = [
    entry(),
    entry({ id: "e2", direction: "payable", counterparty: "Karim Store", phone: "", principalPoisha: 291300, due: "" }),
    entry({ id: "e3", counterparty: "rakib", phone: "+8801712345678", principalPoisha: 10000, due: "2026-12-01" }),
    entry({ id: "e4", principalPoisha: 5000, settlements: [{ id: "s", date: "2026-11-02", amountPoisha: 5000, note: "" }] }),
  ];
  const t = dharTotals(list, "2026-11-17");
  assert.equal(t.receivePoisha, 60000);
  assert.equal(t.payPoisha, 291300);
  assert.equal(t.netPoisha, -231300);
  assert.equal(t.openCount, 3);
  assert.deepEqual(t.overdue.map((e) => e.id), ["e1"]);
  assert.equal(isOverdue(list[3], "2026-12-30"), false); // settled is never overdue
  const people = perPerson(list);
  assert.equal(people.length, 2);
  const rakib = people.find((p) => p.phone === "+8801712345678")!;
  assert.equal(rakib.receivePoisha, 60000);
  assert.equal(rakib.openEntries, 2);
  assert.equal(todayDhaka(new Date("2026-11-16T19:00:00Z")), "2026-11-17");
});

test("dhar: lakh grouping and Bangla digits", () => {
  assert.equal(formatTaka(125000000, false), "৳12,50,000");
  assert.equal(formatTaka(145050, false), "৳1,450.50");
  assert.equal(formatTaka(125000000), "৳১২,৫০,০০০");
  assert.equal(formatTaka(-50000, false), "-৳500");
});

test("dhar: slip lists history and the net, links only prefill", () => {
  const e = entry({ settlements: [{ id: "s", date: "2026-11-05", amountPoisha: 20000, note: "bKash" }] });
  const en = settlementSlip([e], "+8801712345678", "en", "2026-11-17");
  assert.match(en, /Dues statement: Rakib/);
  assert.match(en, /paid ৳200 \(bKash\)/);
  assert.match(en, /Total you owe me: ৳300/);
  const bn = settlementSlip([e], "+8801712345678", "bn", "2026-11-17");
  assert.match(bn, /মোট আমার পাওনা: ৳৩০০/);
  assert.ok(smsHref("+8801712345678", "a b").startsWith("sms:+8801712345678?body=a%20b"));
  assert.ok(whatsappHref("hi", "+8801712345678").startsWith("https://wa.me/8801712345678?text=hi"));
});

test("dhar: sanitize drops malformed rows and over-paid history", () => {
  const out = sanitizeDhar([
    entry(),
    { ...entry({ id: "bad" }), direction: "gift" },
    { ...entry({ id: "neg" }), principalPoisha: -5 },
    entry({ id: "over", settlements: [{ id: "a", date: "2026-11-02", amountPoisha: 40000, note: "" }, { id: "b", date: "2026-11-03", amountPoisha: 40000, note: "" }] }),
    entry({ id: "ph", phone: "999" }),
    "junk",
  ]);
  assert.ok(out);
  assert.deepEqual(out!.map((e) => e.id), ["e1", "over", "ph"]);
  assert.equal(out![1].settlements.length, 1);
  assert.equal(out![2].phone, "");
  assert.equal(sanitizeDhar("x"), null);
});

test("dhar: categories, payment methods, and reminder generator", () => {
  const e = entry({
    counterparty: "হাসান",
    principalPoisha: 250000,
    date: "2026-11-01",
    due: "2026-11-20",
    category: "personal",
    note: "জরুরি ধার",
  });

  const friendly = generateReminderMessage(e, "friendly", "bn", "2026-11-18");
  assert.match(friendly, /হাসান/);
  assert.match(friendly, /২,৫০০/);
  assert.match(friendly, /সুবিধাজনক সময়ে পাঠিয়ে দিলে কৃতজ্ঞ থাকব/);

  const formal = generateReminderMessage(e, "formal", "bn", "2026-11-18");
  assert.match(formal, /দেনা-পাওনার হালনাগাদ হিসাব বিবরণী/);

  const urgent = generateReminderMessage(e, "urgent", "bn", "2026-11-18");
  assert.match(urgent, /পারিবারিক জরুরি প্রয়োজনে/);

  // Payable direction
  const p = entry({
    direction: "payable",
    counterparty: "করিম স্টোর",
    principalPoisha: 120000,
    category: "shop_baki",
  });
  const payableMsg = generateReminderMessage(p, "friendly", "bn", "2026-11-18");
  assert.match(payableMsg, /করিম স্টোর/);
  assert.match(payableMsg, /মনে আছে/);
});

test("dhar: voice parsing extracts direction, amount, counterparty and category", () => {
  const v1 = parseDharVoiceText("রাকিবকে ৫০০ টাকা ধার দিলাম", "2026-11-18");
  assert.ok(v1.ok);
  if (v1.ok) {
    assert.equal(v1.entry.direction, "receivable");
    assert.equal(v1.entry.amount, "500");
    assert.match(v1.entry.counterparty, /রাকিব/);
  }

  const v2 = parseDharVoiceText("মুদি দোকানে ১২৫০ টাকা বাকি দিতে হবে", "2026-11-18");
  assert.ok(v2.ok);
  if (v2.ok) {
    assert.equal(v2.entry.direction, "payable");
    assert.equal(v2.entry.amount, "1250");
    assert.equal(v2.entry.category, "shop_baki");
  }

  const v3 = parseDharVoiceText("সমিতির কিস্তি ৩০০০ টাকা", "2026-11-18");
  assert.ok(v3.ok);
  if (v3.ok) {
    assert.equal(v3.entry.category, "samity_emi");
    assert.equal(v3.entry.amount, "3000");
  }
});

test("dhar: ICS calendar export generates valid VEVENTs with alarm", () => {
  const list = [
    entry({ counterparty: "সায়েম", principalPoisha: 50000, due: "2026-11-25" }),
    entry({ id: "e2", counterparty: "করিম স্টোর", direction: "payable", principalPoisha: 120000, due: "2026-11-30" }),
    entry({ id: "e3", counterparty: "হাসান", principalPoisha: 50000, due: "" }), // No due date
  ];

  const ics = exportDharToIcs(list);
  assert.match(ics, /BEGIN:VCALENDAR/);
  assert.match(ics, /SUMMARY:পাওনা আদায়: সায়েম/);
  assert.match(ics, /SUMMARY:দেনা পরিশোধ: করিম স্টোর/);
  assert.match(ics, /TRIGGER:-P1D/);
  assert.match(ics, /END:VCALENDAR/);
});

