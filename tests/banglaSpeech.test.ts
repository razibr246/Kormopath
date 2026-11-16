import { test } from "node:test";
import assert from "node:assert/strict";
import { banglaShare, prepareBanglaSpeech } from "../lib/banglaSpeech.ts";

test("banglaShare measures Bengali script against Latin letters", () => {
  assert.equal(banglaShare("আমি বাডি"), 1);
  assert.equal(banglaShare("hello"), 0);
  assert.equal(banglaShare("১২৩ ... !"), 0);
  const mixed = banglaShare("ফি-গার্ড অ্যাপটি খুলুন FeeGuard");
  assert.ok(mixed > 0.5 && mixed < 0.9, `mixed share was ${mixed}`);
});

test("prepareBanglaSpeech writes product names in Bengali script and drops markup", () => {
  const out = prepareBanglaSpeech("**FeeGuard BD** খুলুন 🙂 https://example.com/x আর KormoPath-এ CV দিন।");
  assert.equal(/[A-Za-z]/.test(out), false, out);
  assert.ok(out.includes("ফি-গার্ড") && out.includes("কর্মপথ") && out.includes("সিভি"), out);
  assert.ok(!out.includes("*") && !out.includes("http"), out);
});

test("prepareBanglaSpeech uses Bengali digits and turns line breaks into pauses", () => {
  assert.equal(prepareBanglaSpeech("কৃষি কল সেন্টার 16123\nধন্যবাদ"), "কৃষি কল সেন্টার ১৬১২৩। ধন্যবাদ");
});

test("prepareBanglaSpeech cuts long text at a sentence end within the limit", () => {
  const sentence = "এটি একটি পরীক্ষামূলক বাক্য। ";
  const out = prepareBanglaSpeech(sentence.repeat(100), 200);
  assert.ok(out.length <= 200, String(out.length));
  assert.ok(out.endsWith("।"), out.slice(-10));
});
