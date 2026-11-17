import { test } from "node:test";
import assert from "node:assert/strict";
import { doseIn } from "../lib/field360Guard.ts";

test("field360 dose guard: amounts and rates are caught in English and Bangla", () => {
  assert.ok(doseIn("Spray 2 ml per litre of water"));
  assert.ok(doseIn("mix 1.5 g in the tank"));
  assert.ok(doseIn("প্রতি লিটার পানিতে ২ মিলি মিশিয়ে দিন"));
  assert.ok(doseIn("১০ গ্রাম প্রয়োগ করুন"));
  assert.ok(doseIn("apply 20 kg urea"));
  assert.ok(doseIn("use it at 5% strength"));
});

test("field360 dose guard: plain advice without amounts passes", () => {
  assert.equal(doseIn("Remove and bury the spotted leaves. Follow the product label and ask your agriculture officer first."), null);
  assert.equal(doseIn("আক্রান্ত পাতা তুলে মাটিতে পুঁতে দিন। কৃষি কল সেন্টার ১৬১২৩-এ ফোন করুন।"), null);
  assert.equal(doseIn("Water at the base, not on the leaves, for 3 days"), null);
});
