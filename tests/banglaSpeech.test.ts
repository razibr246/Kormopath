import { test } from "node:test";
import assert from "node:assert/strict";
import {
  banglaShare,
  prepareBanglaSpeech,
  spellDigitsBn,
  toBengaliDigits,
  numberToBanglaWords,
  verbalizeNumbersBn,
  BN_ORDINALS,
  BANGLADESH_HELPLINES,
} from "../lib/banglaSpeech.ts";

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

test("prepareBanglaSpeech normalizes currency symbols and percentages for natural speech", () => {
  assert.equal(prepareBanglaSpeech("ফি ৳৯৯ এবং রফতানি নগদ প্রণোদনা 2.5%"), "ফি ৯৯ টাকা এবং রফতানি নগদ প্রণোদনা ২.৫ শতাংশ");
  assert.equal(prepareBanglaSpeech("মোট ৳ ৫০০ জমা"), "মোট ৫০০ টাকা জমা");
});

test("spellDigitsBn spells out phone numbers digit-by-digit for clear voice pronunciation", () => {
  assert.equal(spellDigitsBn("16699"), "এক ছয় ছয় নয় নয়");
  assert.equal(spellDigitsBn("999"), "নয় নয় নয়");
  assert.equal(spellDigitsBn("109"), "এক শূন্য নয়");
  assert.equal(spellDigitsBn("১৬১২৩"), "এক ছয় এক দুই তিন");
});

test("prepareBanglaSpeech cuts long text at a sentence end within the limit", () => {
  const sentence = "এটি একটি পরীক্ষামূলক বাক্য। ";
  const out = prepareBanglaSpeech(sentence.repeat(100), 200);
  assert.ok(out.length <= 200, String(out.length));
  assert.ok(out.endsWith("।"), out.slice(-10));
});

test("numberToBanglaWords converts numbers into natural Bengali words", () => {
  assert.equal(numberToBanglaWords(0), "শূন্য");
  assert.equal(numberToBanglaWords(1), "এক");
  assert.equal(numberToBanglaWords(25), "পঁচিশ");
  assert.equal(numberToBanglaWords(99), "নিরানব্বই");
  assert.equal(numberToBanglaWords(100), "একশত");
  assert.equal(numberToBanglaWords(250), "দুইশত পঞ্চাশ");
  assert.equal(numberToBanglaWords(1500), "এক হাজার পাঁচশত");
  assert.equal(numberToBanglaWords(150000), "এক লাখ পঞ্চাশ হাজার");
  assert.equal(numberToBanglaWords("25000000"), "দুই কোটি পঞ্চাশ লাখ");
  assert.equal(numberToBanglaWords("2.5"), "দুই দশমিক পাঁচ");
  assert.equal(numberToBanglaWords("৩.১৪"), "তিন দশমিক এক চার");
});

test("verbalizeNumbersBn handles official Bangladesh helplines and mobile numbers", () => {
  const helplineText = "জরুরি প্রয়োজনে 16699 বা 999 নম্বরে যোগাযোগ করুন। বিকাশ হেল্পলাইন 16247 এবং নগদ 16167।";
  const verbalized = verbalizeNumbersBn(helplineText);
  assert.ok(verbalized.includes("এক ছয় ছয় নয় নয়"), verbalized);
  assert.ok(verbalized.includes("নয় নয় নয়"), verbalized);
  assert.ok(verbalized.includes("এক ছয় দুই চার সাত"), verbalized);
  assert.ok(verbalized.includes("এক ছয় এক ছয় সাত"), verbalized);

  const mobileText = "আমার মোবাইল নম্বর 01711223344।";
  const verbalizedMobile = verbalizeNumbersBn(mobileText);
  assert.ok(verbalizedMobile.includes("শূন্য এক সাত এক এক দুই দুই তিন তিন চার চার"), verbalizedMobile);
});

test("verbalizeNumbersBn handles ordinals, ranges, and currencies", () => {
  const text = "১ম ও ২য় সেমিস্টারের ফলাফল পেতে ২-৩ দিন অপেক্ষা করতে হবে। ফি ৳ ১,৫০,০০০ এবং সঞ্চয় $ ৫০।";
  const out = verbalizeNumbersBn(text);
  assert.ok(out.includes("প্রথম ও দ্বিতীয়"), out);
  assert.ok(out.includes("২ থেকে ৩ দিন"), out);
  assert.ok(out.includes("এক লাখ পঞ্চাশ হাজার টাকা"), out);
  assert.ok(out.includes("৫০ ডলার"), out);
});

test("verbalizeNumbersBn handles fractions, clock times, units, and classifiers", () => {
  const raw = "প্রতিদিন ১/২ কাপ দুধ এবং ১/৪ চামচ ওষুধ সকাল ১০:৩০ মিনিটে নিন। মোট ১টি কাজ এবং ২টি ফাইল। বাজার থেকে 500 tk দিয়ে 5 kg চাল আনুন।";
  const out = verbalizeNumbersBn(raw);
  assert.ok(out.includes("অর্ধেক কাপ"), out);
  assert.ok(out.includes("এক চতুর্থাংশ চামচ"), out);
  assert.ok(out.includes("১০টা ৩০ মিনিট"), out);
  assert.ok(out.includes("একটি কাজ"), out);
  assert.ok(out.includes("দুটি ফাইল"), out);
  assert.ok(out.includes("৫০০ টাকা"), out);
  assert.ok(out.includes("৫ কেজি চাল"), out);
});

test("verbalizeNumbersBn handles extended ranges and helplines", () => {
  const raw = "নেটওয়ার্ক বিভ্রাটে ২৪-৪৮ ঘণ্টা সময় লাগতে পারে। ৫০-১০০ টাকা ক্যাশআউট ফি। এনআইডি তথ্য পেতে 105 নম্বরে কল করুন।";
  const out = verbalizeNumbersBn(raw);
  assert.ok(out.includes("২৪ থেকে ৪৮ ঘণ্টা"), out);
  assert.ok(out.includes("৫০ থেকে ১০০ টাকা"), out);
  assert.ok(out.includes("এক শূন্য পাঁচ"), out);
});

test("prepareBanglaSpeech with verbalizeNumbers option integrates seamlessly", () => {
  const raw = "আইনি সহায়তা হেল্পলাইন 16699 এ কল করুন। মোট ফি ৳ ৯৯।";
  const out = prepareBanglaSpeech(raw, 500, { verbalizeNumbers: true });
  assert.ok(out.includes("এক ছয় ছয় নয় নয়"), out);
  assert.ok(out.includes("৯৯ টাকা"), out);
});
