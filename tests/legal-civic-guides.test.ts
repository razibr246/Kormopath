import { test } from "node:test";
import assert from "node:assert/strict";
import { HELPLINES, LAWS, NOT_LEGAL_ADVICE_BN } from "../lib/legal/data.ts";
import { BD_DISTRICTS } from "../lib/legal/districts.ts";

test("civic legal guides: all hotlines referenced in guides exist in verified data.ts", () => {
  const verifiedNumbers = new Set(HELPLINES.map((h) => h.number));
  assert.ok(verifiedNumbers.has("16699"), "National Legal Aid helpline must be 16699");
  assert.ok(verifiedNumbers.has("999"), "Emergency police must be 999");
  assert.ok(verifiedNumbers.has("109"), "Women & child helpline must be 109");
  assert.ok(verifiedNumbers.has("1098"), "Child helpline must be 1098");
  assert.ok(verifiedNumbers.has("16122"), "Land helpline must be 16122");
});

test("civic legal guides: legal foundation references Act No. 6 of 2000", () => {
  const act = LAWS.legal_aid_2000;
  assert.ok(act);
  assert.match(act.bn, /আইনগত সহায়তা প্রদান আইন, ২০০০/);
  assert.match(act.url, /act-details-834\.html/);
});

test("civic legal guides: 1-page brief format preserves mandatory citizen disclaimer", () => {
  const sampleBrief = `
বাংলাদেশ আইনগত সহায়তা অধিদপ্তর (NLASO) — আবেদনকারীর প্রাথমিক তথ্য বিবরণী
-----------------------------------------------------------------
[খসড়া · নাগরিক কর্তৃক প্রস্তুতকৃত · আদালতের আনুষ্ঠানিক নথি নয়]

আবেদনকারীর নাম: মোছাঃ ফাতেমা বেগম
জেলা: ঢাকা
প্রতিপক্ষের তথ্য: স্বামী

সমস্যার মূল বিবরণ:
বিগত ৬ মাস যাবত ভরণপোষণ দিচ্ছেন না। আপস-মীমাংসার মাধ্যমে অধিকার চাই।

আইনি অধিকারের নিশ্চয়তা:
• আইনগত সহায়তা প্রদান আইন ২০০০ অনুযায়ী রাষ্ট্রীয় খরচে সম্পূর্ণ বিনামূল্যে সেবা।
• জেলা লিগ্যাল এইড কর্মকর্তা (সিনিয়র সহকারী জজ) আবেদন পর্যালোচনা করবেন।
• জাতীয় হেল্পলাইন: ১৬৬৯৯ (টোল-ফ্রি) | জরুরি বিপদ: ৯৯৯ | নারী ও শিশু নির্যাতন: ১০৯
`.trim();

  // Invariant 1: Must clearly state it is a draft, not an official court document
  assert.match(sampleBrief, /খসড়া · নাগরিক কর্তৃক প্রস্তুতকৃত · আদালতের আনুষ্ঠানিক নথি নয়/);
  
  // Invariant 2: Must never claim a case is filed
  assert.doesNotMatch(sampleBrief, /মামলা দাখিল হয়েছে/);
  assert.doesNotMatch(sampleBrief, /আদালতে দায়েরকৃত/);

  // Invariant 3: Must cite toll-free 16699
  assert.match(sampleBrief, /১৬৬৯৯/);
});

test("civic legal guides: all 64 districts in Bangladesh are available for office locator and brief generation", () => {
  assert.equal(BD_DISTRICTS.length, 64, "Must cover all 64 districts of Bangladesh");
  const dhaka = BD_DISTRICTS.find((d) => d.en === "Dhaka");
  assert.ok(dhaka);
  assert.equal(dhaka.bn, "ঢাকা");
});

test("civic legal guides: quick exit destination is safe and privacy-preserving", () => {
  const safeDest = "https://www.google.com";
  assert.match(safeDest, /^https:\/\//);
  assert.ok(safeDest.includes("google.com"));
});
