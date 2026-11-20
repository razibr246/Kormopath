/**
 * Pure helpers for Buddy's Bangla replies and Bangla speech. No imports, so tests can load it directly.
 *
 * - `banglaShare` measures how much of a reply is written in Bengali script, so the chat route can
 *   reject (and repair) replies that drift into English.
 * - `prepareBanglaSpeech` turns a chat reply into text a Bangla voice can read naturally: product
 *   names in Bengali script, no markdown, links or emoji, and a bounded length cut at a sentence end.
 */

// Bengali script without its digits (U+09E6–U+09EF), so numbers alone never count as Bangla prose.
const BENGALI = /[ঀ-৥ৰ-৿]/g;
const LATIN = /[A-Za-z]/g;

/** Share of letters that are Bengali script (0..1). Digits, spaces and punctuation are ignored. */
export function banglaShare(text: string): number {
  const bn = text.match(BENGALI)?.length ?? 0;
  const latin = text.match(LATIN)?.length ?? 0;
  return bn + latin === 0 ? 0 : bn / (bn + latin);
}

/** Product and common terms written the way a Bangladeshi speaker says them. Longest first. */
const SPOKEN_TERMS: Array<[RegExp, string]> = [
  [/KormoPilot\s*AI/gi, "কর্মপাইলট এআই"],
  [/KormoPilot/gi, "কর্মপাইলট"],
  [/KormoPath/gi, "কর্মপথ"],
  [/Chakra\s*Agent/gi, "চক্র এজেন্ট"],
  [/HaatBazar(\s*AI)?/gi, "হাটবাজার"],
  [/ChuktiGuard/gi, "চুক্তিগার্ড"],
  [/FeeGuard(\s*BD)?/gi, "ফি-গার্ড"],
  [/AdmitBuddy/gi, "অ্যাডমিট বাডি"],
  [/MediScan(\s*BD)?/gi, "মেডিস্ক্যান"],
  [/Shohoj\s*Budget/gi, "সহজ বাজেট"],
  [/Probaho(\s*Coach)?/gi, "প্রবাহ কোচ"],
  [/Buddy/gi, "বাডি"],
  [/Workspace/gi, "ওয়ার্কস্পেস"],
  [/Passport/gi, "পাসপোর্ট"],
  [/Fiverr/gi, "ফাইভার"],
  [/Upwork/gi, "আপওয়ার্ক"],
  [/Payoneer/gi, "পেওনিয়ার"],
  [/bKash/gi, "বিকাশ"],
  [/Nagad/gi, "নগদ"],
  [/\bCSV\b/g, "সিএসভি"],
  [/\bSOP\b/g, "এসওপি"],
  [/\bCV\b/g, "সিভি"],
  [/\bAI\b/g, "এআই"],
  [/\bOK\b/gi, "ঠিক আছে"],
];

export const BN_DIGIT_WORDS: Record<string, string> = {
  "0": "শূন্য", "1": "এক", "2": "দুই", "3": "তিন", "4": "চার",
  "5": "পাঁচ", "6": "ছয়", "7": "সাত", "8": "আট", "9": "নয়",
  "০": "শূন্য", "১": "এক", "২": "দুই", "৩": "তিন", "৪": "চার",
  "৫": "পাঁচ", "৬": "ছয়", "৭": "সাত", "৮": "আট", "৯": "নয়",
};

/**
 * Standard Bengali number words 0 to 100 according to Bangladesh NCTB curriculum.
 */
export const BN_WORDS_0_TO_100: string[] = [
  "শূন্য", "এক", "দুই", "তিন", "চার", "পাঁচ", "ছয়", "সাত", "আট", "নয়", "দশ",
  "এগারো", "বারো", "তেরো", "চৌদ্দ", "পনেরো", "ষোল", "সতেরো", "আঠারো", "উনিশ", "বিশ",
  "একুশ", "বাইশ", "তেইশ", "চব্বিশ", "পঁচিশ", "ছাব্বিশ", "সাতাশ", "আঠাশ", "উনত্রিশ", "ত্রিশ",
  "একত্রিশ", "বত্রিশ", "তেত্রিশ", "চৌত্রিশ", "পঁয়ত্রিশ", "ছত্রিশ", "সাঁইত্রিশ", "আটত্রিশ", "উনচল্লিশ", "চল্লিশ",
  "একচল্লিশ", "বিয়াল্লিশ", "তেতাল্লিশ", "চুয়াল্লিশ", "পঁয়তাল্লিশ", "ছেচল্লিশ", "সাতচল্লিশ", "আটচল্লিশ", "উনপঞ্চাশ", "পঞ্চাশ",
  "একান্ন", "বায়ান্ন", "তিপ্পান্ন", "চুয়ান্ন", "পঞ্চান্ন", "ছাপ্পান্ন", "সাতান্ন", "আটান্ন", "উনষাট", "ষাট",
  "একষট্টি", "বাষট্টি", "তেষট্টি", "চৌষট্টি", "পঁয়ষট্টি", "ছেষট্টি", "সাতষট্টি", "আটষট্টি", "উনসত্তর", "সত্তর",
  "একাত্তর", "বাহাত্তর", "তিয়াত্তর", "চুয়াত্তর", "পঁচাত্তর", "ছিয়াত্তর", "সাতাত্তর", "আটাত্তর", "উনাশি", "আশি",
  "একাশি", "বিরাশি", "তিরাশি", "চৌরাশি", "পঁচাশি", "ছিয়াশি", "সাতাশি", "আটাশি", "উননব্বই", "নব্বই",
  "একানব্বই", "বিরানব্বই", "তিরানব্বই", "চুরানব্বই", "পঁচানব্বই", "ছিয়ানব্বই", "সাতানব্বই", "আটানব্বই", "নিরানব্বই", "একশত",
];

/**
 * Verified official Bangladesh helplines mapped to digit-by-digit spoken pronunciation.
 */
export const BANGLADESH_HELPLINES: Record<string, string> = {
  "16699": "এক ছয় ছয় নয় নয়", // জাতীয় আইনগত সহায়তা (NLASO)
  "999": "নয় নয় নয়",         // জাতীয় জরুরি সেবা (পুলিশ, অ্যাম্বুলেন্স, ফায়ার)
  "109": "এক শূন্য নয়",       // নারী ও শিশু নির্যাতন প্রতিরোধ
  "16123": "এক ছয় এক দুই তিন", // কৃষি কল সেন্টার
  "16263": "এক ছয় দুই ছয় তিন", // স্বাস্থ্য বাতায়ন
  "16358": "এক ছয় তিন পাঁচ আট", // প্রাণিসম্পদ কল সেন্টার
  "333": "তিন তিন তিন",        // জাতীয় তথ্য ও সেবা
  "106": "এক শূন্য ছয়",        // দুর্নীতি দমন কমিশন (দুদক)
  "16122": "এক ছয় এক দুই দুই", // ভূমি সেবা হটলাইন
  "1090": "এক শূন্য নয় শূন্য", // দুর্যোগের আগাম বার্তা
  "16247": "এক ছয় দুই চার সাত", // বিকাশ গ্রাহক সেবা হেল্পলাইন
  "16167": "এক ছয় এক ছয় সাত", // নগদ গ্রাহক সেবা হেল্পলাইন
  "16236": "এক ছয় দুই তিন ছয়", // বাংলাদেশ ব্যাংক CIPC (আর্থিক অভিযোগ)
  "105": "এক শূন্য পাঁচ",       // নির্বাচন কমিশন / জাতীয় পরিচয়পত্র (NID) সেবা
  "16430": "এক ছয় চার তিন শূন্য", // জাতীয় সঞ্চয় ব্যুরো
  "16575": "এক ছয় পাঁচ সাত পাঁচ", // জাতীয় রাজস্ব বোর্ড (NBR)
};

/**
 * Ordinal number representations in Bengali.
 */
export const BN_ORDINALS: Record<string, string> = {
  "১ম": "প্রথম", "1st": "প্রথম",
  "২য়": "দ্বিতীয়", "২য়": "দ্বিতীয়", "2nd": "দ্বিতীয়",
  "৩য়": "তৃতীয়", "৩য়": "তৃতীয়", "3rd": "তৃতীয়",
  "৪র্থ": "চতুর্থ", "4th": "চতুর্থ",
  "৫ম": "পঞ্চম", "5th": "পঞ্চম",
  "৬ষ্ঠ": "ষষ্ঠ", "6th": "ষষ্ঠ",
  "৭ম": "সপ্তম", "7th": "সপ্তম",
  "৮ম": "অষ্টম", "8th": "অষ্টম",
  "৯ম": "নবম", "9th": "নবম",
  "১০ম": "দশম", "10th": "দশম",
  "১১তম": "একাদশ", "11th": "একাদশ",
  "১২তম": "দ্বাদশ", "12th": "দ্বাদশ",
  "১৩তম": "ত্রয়োদশ", "13th": "ত্রয়োদশ",
  "১৪তম": "চতুর্দশ", "14th": "চতুর্দশ",
  "১৫তম": "পঞ্চদশ", "15th": "পঞ্চদশ",
  "১৬তম": "ষোড়শ", "16th": "ষোড়শ",
  "১৭তম": "সপ্তদশ", "17th": "সপ্তদশ",
  "১৮তম": "অষ্টাদশ", "18th": "অষ্টাদশ",
  "১৯তম": "ঊনবিংশ", "19th": "ঊনবিংশ",
  "২০তম": "বিংশ", "20th": "বিংশ",
};

/** Spells out numbers digit-by-digit in Bengali words (for clear phonetics in voice agent dialogue) */
export function spellDigitsBn(numberStr: string): string {
  return (numberStr ?? "")
    .replace(/\s+/g, "")
    .split("")
    .map((c) => BN_DIGIT_WORDS[c] ?? c)
    .join(" ");
}

/**
 * Converts any integer or decimal into natural spoken Bengali words
 * (handling শত, হাজার, লাখ, কোটি and দশমিক).
 */
export function numberToBanglaWords(numInput: number | string): string {
  const ascii = String(numInput)
    .replace(/[০-৯]/g, (d) => String(d.charCodeAt(0) - 0x09e6))
    .replace(/,/g, "")
    .trim();
  if (!ascii || !/^[-+]?\d+(\.\d+)?$/.test(ascii)) return "";

  const isNeg = ascii.startsWith("-");
  const clean = ascii.replace(/^[-+]/, "");
  const [intStr, decStr] = clean.split(".");
  const n = BigInt(intStr || "0");

  function chunk(val: bigint): string {
    if (val === 0n) return "";
    let res = "";

    // Crores (কোটি) = 10,000,000
    const crore = val / 10000000n;
    let rem = val % 10000000n;
    if (crore > 0n) {
      res += `${chunk(crore)} কোটি `;
    }

    // Lakhs (লাখ) = 100,000
    const lakh = rem / 100000n;
    rem = rem % 100000n;
    if (lakh > 0n) {
      res += `${BN_WORDS_0_TO_100[Number(lakh)] ?? String(lakh)} লাখ `;
    }

    // Thousands (হাজার) = 1,000
    const thousand = rem / 1000n;
    rem = rem % 1000n;
    if (thousand > 0n) {
      res += `${BN_WORDS_0_TO_100[Number(thousand)] ?? String(thousand)} হাজার `;
    }

    // Hundreds (শত) = 100
    const hundred = rem / 100n;
    rem = rem % 100n;
    if (hundred > 0n) {
      res += `${hundred === 1n ? "একশত" : (BN_WORDS_0_TO_100[Number(hundred)] ?? String(hundred)) + "শত"} `;
    }

    // 1..99
    if (rem > 0n) {
      res += `${BN_WORDS_0_TO_100[Number(rem)] ?? String(rem)} `;
    }

    return res.trim();
  }

  let words = chunk(n);
  if (!words) words = BN_WORDS_0_TO_100[0];
  if (isNeg) words = `মাইনাস ${words}`;

  if (decStr) {
    const decWords = decStr.split("").map((d) => BN_WORDS_0_TO_100[Number(d)] ?? d).join(" ");
    words += ` দশমিক ${decWords}`;
  }

  return words;
}

/** Bangla TTS reads Bengali numerals more naturally inside Bangla sentences. */
export function toBengaliDigits(text: string): string {
  return text.replace(/[0-9]/g, (d) => String.fromCharCode(0x09e6 + Number(d)));
}

/**
 * Transforms text numbers, helplines, ordinals, currencies, and ranges
 * into unambiguous, phonetically clear spoken Bengali words.
 */
export function verbalizeNumbersBn(input: string): string {
  let text = input;

  // 1. Ordinals: ১ম -> প্রথম, ২য় -> দ্বিতীয়, etc. (Lookbehind/lookahead safe for Bengali)
  for (const [ord, spoken] of Object.entries(BN_ORDINALS)) {
    text = text.replace(new RegExp(`(?<=^|[\\s,।!?.\\-—/])${ord}(?=$|[\\s,।!?.\\-—/])`, "g"), spoken);
  }

  // 2. Number ranges first (so range hyphens e.g. ৫০-১০০ or ২৪-৪৮ are not misidentified as standalone numbers)
  text = text.replace(/([0-9০-৯]+)\s*[-–—]\s*([0-9০-৯]+)\s*(দিন|মিনিট|ঘণ্টা|মাস|বছর|জন|টি|টা|বারের|বার|টাকা|পয়সা|কেজি|গ্রাম|একর|বিঘা|শতক|শতাংশ)/g, (_m, n1, n2, unit) => {
    return `${toBengaliDigits(n1)} থেকে ${toBengaliDigits(n2)} ${unit}`;
  });

  // 3. Known Helplines: 16699, 999, 109, 16247, 16167, 16236, 105, etc.
  for (const [helpline, spoken] of Object.entries(BANGLADESH_HELPLINES)) {
    const bnNum = toBengaliDigits(helpline);
    text = text.replace(new RegExp(`(?<=^|[\\s,।!?.\\-—/])(?:${helpline}|${bnNum})(?=$|[\\s,।!?.\\-—/])`, "g"), spoken);
  }

  // 4. Bangladesh 11-digit mobile numbers (e.g. 01711223344 or ০১৭১১২২৩৩৪৪)
  text = text.replace(/(?<=^|[\s,।!?.\-—/])(01[3-9]\d{8}|০১[৩-৯][০-৯]{8})(?=$|[\s,।!?.\-—/])/g, (num) => spellDigitsBn(num));

  // 5. Fractions: ১/২ -> অর্ধেক, ১/৪ -> এক চতুর্থাংশ, ৩/৪ -> তিন চতুর্থাংশ
  text = text.replace(/(?<=^|[\s,।!?.\-—/])(?:1\/2|১\/২)(?=$|[\s,।!?.\-—/])/g, "অর্ধেক");
  text = text.replace(/(?<=^|[\s,।!?.\-—/])(?:1\/4|১\/৪)(?=$|[\s,।!?.\-—/])/g, "এক চতুর্থাংশ");
  text = text.replace(/(?<=^|[\s,।!?.\-—/])(?:3\/4|৩\/৪)(?=$|[\s,।!?.\-—/])/g, "তিন চতুর্থাংশ");

  // 6. English currency notations: 500 tk / 500 taka / 500 BDT -> ৳ 500
  text = text.replace(/(?<=^|[\s,।!?.\-—/])([0-9০-৯,]+(\.[0-9০-৯]+)?)\s*(?:tk|taka|bdt)\b/gi, "৳ $1");

  // 7. Large currency amounts: ৳ ১,৫০,০০০ -> এক লাখ পঞ্চাশ হাজার টাকা
  text = text.replace(/৳\s*([0-9০-৯,]+(\.[0-9০-৯]+)?)/g, (_m, numStr) => {
    const clean = numStr.replace(/,/g, "").replace(/[০-৯]/g, (d: string) => String(d.charCodeAt(0) - 0x09e6));
    const val = Number(clean);
    if (!isNaN(val) && val >= 1000 && Number.isInteger(val)) {
      return `${numberToBanglaWords(clean)} টাকা`;
    }
    return `${toBengaliDigits(numStr)} টাকা`;
  });

  // USD / Dollar currency
  text = text.replace(/\$\s*([0-9০-৯,.]+)/g, (_m, numStr) => `${toBengaliDigits(numStr)} ডলার`);

  // 8. Percentages: 2.5% -> ২.৫ শতাংশ
  text = text.replace(/([0-9০-৯,.]+)\s*%/g, (_m, numStr) => `${toBengaliDigits(numStr)} শতাংশ`);

  // 9. Time / Clock: 10:30 -> ১০টা ৩০ মিনিট (consuming any trailing 'মিনিট' or 'মিনিটে' to prevent duplicate)
  text = text.replace(/(?<=^|[\s,।!?.\-—/])([0-9০-৯]{1,2}):(00|০০)(?:\s*মিনিট(?:ে)?)?(?=$|[\s,।!?.\-—/])/g, (_m, h) => `${toBengaliDigits(h)}টা`);
  text = text.replace(/(?<=^|[\s,।!?.\-—/])([0-9০-৯]{1,2}):([0-9০-৯]{2})(?:\s*মিনিট(?:ে)?)?(?=$|[\s,।!?.\-—/])/g, (_m, h, min) => `${toBengaliDigits(h)}টা ${toBengaliDigits(min)} মিনিট`);

  // 10. Standard measurement units normalization (kg -> কেজি, gm -> গ্রাম, etc.)
  text = text.replace(/([0-9০-৯]+)\s*kg\b/gi, (_m, n) => `${toBengaliDigits(n)} কেজি`);
  text = text.replace(/([0-9০-৯]+)\s*gm?\b/gi, (_m, n) => `${toBengaliDigits(n)} গ্রাম`);
  text = text.replace(/([0-9০-৯]+)\s*ml\b/gi, (_m, n) => `${toBengaliDigits(n)} মিলি`);
  text = text.replace(/([0-9০-৯]+)\s*km\b/gi, (_m, n) => `${toBengaliDigits(n)} কিলোমিটার`);

  // 11. Count classifiers: ১টি -> একটি, ১টা -> একটা, ২টি -> দুটি, ২টা -> দুটো
  text = text.replace(/(?<=^|[\s,।!?.\-—/])(?:1|১)টি(?=$|[\s,।!?.\-—/])/g, "একটি");
  text = text.replace(/(?<=^|[\s,।!?.\-—/])(?:1|১)টা(?=$|[\s,।!?.\-—/])/g, "একটা");
  text = text.replace(/(?<=^|[\s,।!?.\-—/])(?:2|২)টি(?=$|[\s,।!?.\-—/])/g, "দুটি");
  text = text.replace(/(?<=^|[\s,।!?.\-—/])(?:2|২)টা(?=$|[\s,।!?.\-—/])/g, "দুটো");
  text = text.replace(/(?<=^|[\s,।!?.\-—/])(?:3|৩)টি(?=$|[\s,।!?.\-—/])/g, "তিনটি");
  text = text.replace(/(?<=^|[\s,।!?.\-—/])(?:3|৩)টা(?=$|[\s,।!?.\-—/])/g, "তিনটা");

  // 12. Convert all remaining ASCII digits in the verbalized string to Bengali numerals
  return toBengaliDigits(text);
}

export const SPEECH_LIMIT = 1400;

export function prepareBanglaSpeech(
  input: string,
  limit = SPEECH_LIMIT,
  options: { verbalizeNumbers?: boolean } = {}
): string {
  let text = input.normalize("NFC");
  text = text
    .replace(/https?:\/\/\S+/gi, " ")
    .replace(/[*_`#>|~]+/g, " ")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\p{Extended_Pictographic}/gu, " ")
    .replace(/[‍️]/g, "");
  for (const [pattern, spoken] of SPOKEN_TERMS) text = text.replace(pattern, spoken);

  if (options.verbalizeNumbers) {
    text = verbalizeNumbersBn(text);
  } else {
    // Normalize spoken currency and percentages so TTS engines pronounce them naturally in Bengali
    text = text.replace(/৳\s*([0-9০-৯,.]+)/g, "$1 টাকা");
    text = text.replace(/([0-9০-৯,.]+)\s*%/g, "$1 শতাংশ");
  }

  text = toBengaliDigits(text).replace(/\s*\n+\s*/g, "। ").replace(/[ \t]+/g, " ").replace(/(।\s*){2,}/g, "। ").trim();
  if (text.length <= limit) return text;

  // Cut at the last sentence end that fits, so the voice never stops mid-word.
  const head = text.slice(0, limit);
  const cut = Math.max(head.lastIndexOf("।"), head.lastIndexOf("?"), head.lastIndexOf("!"), head.lastIndexOf("."));
  return (cut > limit * 0.4 ? head.slice(0, cut + 1) : head.slice(0, head.lastIndexOf(" ") > 0 ? head.lastIndexOf(" ") : limit)).trim();
}
