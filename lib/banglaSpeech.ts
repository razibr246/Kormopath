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

/** Bangla TTS reads Bengali numerals more naturally inside Bangla sentences. */
function toBengaliDigits(text: string): string {
  return text.replace(/[0-9]/g, (d) => String.fromCharCode(0x09e6 + Number(d)));
}

export const SPEECH_LIMIT = 1400;

export function prepareBanglaSpeech(input: string, limit = SPEECH_LIMIT): string {
  let text = input.normalize("NFC");
  text = text
    .replace(/https?:\/\/\S+/gi, " ")
    .replace(/[*_`#>|~]+/g, " ")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\p{Extended_Pictographic}/gu, " ")
    .replace(/[‍️]/g, "");
  for (const [pattern, spoken] of SPOKEN_TERMS) text = text.replace(pattern, spoken);
  text = toBengaliDigits(text).replace(/\s*\n+\s*/g, "। ").replace(/[ \t]+/g, " ").replace(/(।\s*){2,}/g, "। ").trim();
  if (text.length <= limit) return text;

  // Cut at the last sentence end that fits, so the voice never stops mid-word.
  const head = text.slice(0, limit);
  const cut = Math.max(head.lastIndexOf("।"), head.lastIndexOf("?"), head.lastIndexOf("!"), head.lastIndexOf("."));
  return (cut > limit * 0.4 ? head.slice(0, cut + 1) : head.slice(0, head.lastIndexOf(" ") > 0 ? head.lastIndexOf(" ") : limit)).trim();
}
