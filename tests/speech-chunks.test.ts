import { test } from "node:test";
import assert from "node:assert/strict";
import { splitSpeech } from "../lib/speechChunks.ts";

test("splitSpeech: a short first chunk so the voice starts fast, then larger chunks", () => {
  const t = "আপনি একা নন। বিনামূল্যে আইনি সহায়তার জন্য ১৬৬৯৯ নম্বরে ফোন করুন। জেলা লিগ্যাল এইড অফিসে গিয়ে আবেদন করতে পারেন। আপনার জাতীয় পরিচয়পত্র সঙ্গে নিন। অফিস সিদ্ধান্ত নেবে আপনি সহায়তা পাবেন কি না।";
  const c = splitSpeech(t);
  assert.ok(c.length >= 2, String(c.length));
  assert.ok(c[0].length <= 90, c[0]);
  for (const x of c.slice(1)) assert.ok(x.length <= 260, x);
  assert.equal(c.join(" ").replace(/\s+/g, " "), t.replace(/\s+/g, " "), "no text lost or reordered");
});

test("splitSpeech: empty input, one short sentence, and a very long sentence without stops", () => {
  assert.deepEqual(splitSpeech("   "), []);
  assert.deepEqual(splitSpeech("Call 999 now."), ["Call 999 now."]);
  const long = Array.from({ length: 80 }, (_, i) => `শব্দ${i}`).join(" ");
  const c = splitSpeech(long);
  assert.ok(c.every((x) => x.length <= 260));
  assert.equal(c.join(" "), long);
});
