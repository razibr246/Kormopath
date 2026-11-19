// Buddy's rule-based answer (app/api/buddy/chat/fallback.ts): used whenever the model cannot answer.
// It must never be a dead end, never invent a phone number or fee, and must put emergencies first.
import { test } from "node:test";
import assert from "node:assert/strict";
import { fallbackAnswer } from "../app/api/buddy/chat/fallback.ts";
import { ROKKHA_HELPLINES } from "../lib/rokkhaData.ts";
import { HELPLINES as LEGAL_HELPLINES } from "../lib/legal/data.ts";
import { HEALTH_SERVICES } from "../lib/health/services.ts";
import { HELPLINES as KRISHI_HELPLINES } from "../lib/krishiData.ts";

const BN = "০১২৩৪৫৬৭৮৯";
const toLatin = (s: string) => s.replace(/[০-৯]/g, (d) => String(BN.indexOf(d)));
const KNOWN = new Set<string>([
  ...ROKKHA_HELPLINES.map((h) => h.number),
  ...LEGAL_HELPLINES.map((h) => h.number),
  ...HEALTH_SERVICES.map((h) => h.phone).filter(Boolean) as string[],
  ...KRISHI_HELPLINES.map((h: { number: string }) => h.number),
]);

/** Every 3–11 digit run that looks like a phone number must be a sourced helpline. */
function phoneNumbers(text: string): string[] {
  return (toLatin(text).match(/(?<![\d.])\d{3,11}(?![\d.%])/g) ?? []).filter((n) => !/^20\d\d$/.test(n));
}

const QUESTIONS = [
  "bKash cash out charge koto?", "বিকাশে ক্যাশ আউট চার্জ কত?", "someone asked for my OTP", "লটারিতে পুরস্কার জিতেছি বলছে",
  "জ্বর তিন দিন ধরে, কোন ডাক্তার দেখাব?", "জমি নিয়ে মামলা, উকিল লাগবে", "ধানে পোকা লেগেছে", "মেসের হিসাব কীভাবে করব",
  "ভর্তির জিপিএ কত লাগবে", "ইন্টারভিউ অনুশীলন", "hello", "আজ আবহাওয়া কেমন",
];

test("never a dead end: every answer has text and at least one in-app link", () => {
  for (const lang of ["bn", "en"] as const) {
    for (const q of QUESTIONS) {
      const a = fallbackAnswer("kormopath", q, lang);
      assert.ok(a.reply.trim().length > 20, `${lang} ${q}: empty reply`);
      assert.ok(a.links.length >= 1, `${lang} ${q}: no link`);
      for (const l of a.links) assert.match(l.href, /^\//, "links stay inside KormoPath");
      assert.doesNotMatch(a.reply, /ব্যস্ত|busy/i, "never the old 'server busy' message");
    }
  }
});

test("every phone number in an answer is a sourced helpline", () => {
  for (const lang of ["bn", "en"] as const) {
    for (const q of [...QUESTIONS, "আমার বাচ্চা শ্বাস নিতে পারছে না", "স্বামী মারধর করছে"]) {
      for (const n of phoneNumbers(fallbackAnswer("rokkha", q, lang).reply)) {
        assert.ok(KNOWN.has(n), `${lang} "${q}": ${n} is not in a sourced helpline list`);
      }
    }
  }
});

test("emergencies come first and say 999", () => {
  for (const q of ["আমার বাচ্চা শ্বাস নিতে পারছে না", "chest pain and can't breathe", "স্বামী মারধর করছে, প্রাণের ভয়"]) {
    const a = fallbackAnswer("shohoj", q, "bn");
    assert.equal(a.emergency, true, q);
    assert.match(a.reply.split("\n")[0], /৯৯৯/, q);
  }
  assert.equal(fallbackAnswer("shohoj", "বাজারের খরচ লিখব", "bn").emergency, false);
});

test("fee answers quote only the verified bKash rates and send people to FeeGuard", () => {
  const a = fallbackAnswer("kormopath", "bkash cash out fee", "en");
  assert.match(a.reply, /1\.85%/);
  assert.match(a.reply, /1\.395%/);
  assert.ok(a.links.some((l) => l.href === "/feeguard"));
  assert.doesNotMatch(a.reply, /nagad[^\n]*\d+(\.\d+)?%/i, "Nagad's rate is unverified and must not be quoted");
});

test("scam answers never call anything safe", () => {
  const a = fallbackAnswer("kormopath", "এই লিংক কি নিরাপদ?", "bn");
  assert.ok(a.links.some((l) => l.href === "/rokkha"));
  assert.match(a.reply, /নিরাপদ নয়/);
});

test("Bangla answers are written in Bengali digits", () => {
  const a = fallbackAnswer("kormopath", "বিকাশে ক্যাশ আউট চার্জ কত?", "bn");
  assert.doesNotMatch(a.reply, /[0-9]/);
});
