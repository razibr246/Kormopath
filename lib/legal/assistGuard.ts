/* Guardrails for the legal assistant (app/api/legal/assist). Pure; imports only ./data.ts.
 * KormoPath rule: the assistant may name only the helplines and laws verified in ./data.ts, never a section number,
 * never an income threshold or taka amount, and never promise an outcome or say a case is filed. A message that sounds
 * like danger must put 999 or 109 first. The route runs checkAnswer inside the Zod schema (superRefine), so a violation
 * sends the answer back through the model's repair loop; still failing, the rule-based answer is used. */
import { HELPLINES, LAWS, type HelplineId, type LawId } from "./data.ts";

const BN = "০১২৩৪৫৬৭৮৯";
export const toAsciiDigits = (s: string): string => s.replace(/[০-৯]/g, (d) => String(BN.indexOf(d)));
export const toBnDigits = (s: string): string => s.replace(/\d/g, (d) => BN[Number(d)]);

const norm = (s: string): string => toAsciiDigits((s ?? "").normalize("NFC")).toLowerCase();

export const ALLOWED_HELPLINE_NUMBERS: ReadonlySet<string> = new Set(HELPLINES.map((h) => h.number));
const LAW_LIST = Object.values(LAWS);
const LAW_YEARS: ReadonlySet<string> = new Set(LAW_LIST.map((l) => toAsciiDigits(l.bn).match(/\d{4}/)?.[0] ?? ""));

/** Crisis words (Bangla, Banglish, English). Any hit means 999 / 109 must lead the answer. */
const CRISIS = [
  "মারধর", "মারছে", "মারে", "পেটায়", "পেটাচ্ছে", "নির্যাতন", "ধর্ষণ", "যৌন হয়রানি", "আত্মহত্যা", "মরে যেতে", "মেরে ফেল", "খুন", "জীবন বিপন্ন",
  "প্রাণনাশ", "হুমকি দিচ্ছে", "অপহরণ", "পাচার", "এসিড", "আটকে রেখেছে", "আটকে রাখা", "শিশুকে মার", "বাচ্চাকে মার", "রক্ত",
  "marche", "maarche", "nirjaton", "dhorshon", "atmohotta",
  "suicide", "kill myself", "kill me", "rape", "beating me", "beats me", "abuse", "kidnap", "trafficking", "acid attack", "locked me", "threatening to kill",
  "domestic violence", "want to die",
  // added after the paraphrase suite (tests/legal-crisis-paraphrase.test.ts)
  "violence", "voilence", "stalk", "molest", "groped", "sexually harass", "sexual harass", "touched me", "not safe", "unsafe at home",
  "child marriage", "forced marriage", "জোর করে বিয়ে", "বাল্যবিবাহ", "বাল্য বিবাহ", "jor kore biye", "নিরাপদ না", "নিরাপদ নই", "nirapod na", "nirapod noi",
  "গলা টিপে", "gola tipe", "লাথি", "laathi", "lathi mare", "mardhor", "pachar", "jouno hoyrani", "jouno hoirani", "atke rakh", "মারার কথা", "মারার হুমকি",
];
// Everyday phrasing in English and Banglish ("my husband hits me every night", "amake mare", "marbe bole hymki").
const CRISIS_PATTERNS: readonly RegExp[] = [
  /\b(hits?|hitting|hurts?|slap\w*|punch\w*|kick\w*|chok\w*|strangl\w*|beat\w*|beet\w*|burn(s|ed|t)?)\b[\s\S]{0,12}\b(me|her|him|us|my (wife|mother|mom|sister|daughter|son|child|kids?))\b/i,
  /\b(threaten(s|ed|ing)?|thretening|will|would|going to|gonna)\b[\s\S]{0,20}\b(kill|hurt|burn|throw acid)\b/i,
  /\b(amake|amay|amaire|take|oke|bou ke|bachcha ke|baccha ke)\s*(mare|maare|marche|maarche|marse|maarse|pitay|petay|marbe|mere felbe|mere fel)\b/i,
  /\b(mere felbe|mere felar|marbe bole|khun korbe|acid marbe)\b/i,
  /(মেরে ফেলবে|মেরে ফেলার|প্রাণে মারার|খুন করবে|এসিড মারবে|গায়ে হাত তোলে|গায়ে হাত তুলে)/,
  // "force" only as coercion, never inside "enforced" or "the law in force".
  /\bforc(e|es|ed|ing)\s+(me|her|him|us|my|them|to|into)\b/i,
  /\bpush(es|ed|ing)?\s+(me|her|him|my \w+)\b[\s\S]{0,25}\b(down|stairs|wall|floor|out)\b/i,
  /\block(s|ed|ing)?\s+(me|her|him|us|my \w+)\s+(in|inside|up)\b|\blocked (in|inside) (a|the|my) room\b/i,
  /(ঘরে আটকে|আটকে রাখে|আটকে রাখছে|তালা দিয়ে রাখে|gaye ha+t (tole|tule|tola)|gaye hath (tole|tule))/i,
  /\b(send|sending|sent|share|sharing|shared|post|posting|posted|leak\w*|upload\w*|spread\w*)\b[\s\S]{0,25}\b(private|nude|naked|intimate|personal)\s+(photo|pic|picture|image|video)s?\b|(ছবি|ভিডিও)[\s\S]{0,20}(ছড়িয়ে দেবে|ছড়িয়ে দিচ্ছে|ভাইরাল করবে|ফাঁস)/i,
  /\b(demand\w*|ask\w*|want\w*|pressur\w*)\b[\s\S]{0,15}\b(sex|sexual favou?rs?|to sleep with)\b|\b(boss|manager|teacher|landlord)\b[\s\S]{0,30}\b(sex|sleep with me|touch\w*)\b/i,
  /\b(scared|afraid|terrified|frightened) (to go|of going) (back )?home\b|বাড়ি (যেতে|ফিরতে) ভয়|বাসায় (যেতে|ফিরতে) ভয়/i,
  // judge round 3 (offline misses)
  /\btwist(s|ed|ing)?\s+(my|her|his)\s+(arm|wrist|hand|neck)\b|\b(arm|wrist)[\s\S]{0,20}(cracked|broke|broken)\b/i,
  /\b(stalk\w*|follows? me (everywhere|home|to work)|keeps following me|waits? outside my (house|home|office|school))\b|পিছু নেয়|পিছু নিচ্ছে|পিছে পিছে আসে/i,
  /\b(poured|pour(s|ing)?|threw|throw(s|ing)?|douse\w*|splash\w*)\b[\s\S]{0,20}\b(kerosene|petrol|gasoline|acid|oil|fuel)\b|কেরোসিন (ঢেলে|দিয়ে)|পেট্রোল ঢেলে|kerosin dhele/i,
  /\b(took|takes|taken|snatch\w*|keeps?|kept|hid|hides)\s+(away\s+)?(my|her)\s+(phone|mobile)\b|(won'?t|doesn'?t|does not|will not) let (me|her) (go out|leave|out of the house|call)|ফোন কেড়ে|মোবাইল কেড়ে|বাইরে যেতে দেয় না|ঘর থেকে বের হতে দেয় না/i,
  /\b(employer|boss|agency|company|owner|madam|sponsor|kafeel|malik)\b[\s\S]{0,30}\b(kept|keeps|took|takes|holding|has|seized|won'?t (return|give back))\b[\s\S]{0,15}\bpassport\b|\bpassport\b[\s\S]{0,25}\b(kept|taken|seized|confiscated|won'?t (return|give))\b|পাসপোর্ট (আটকে|রেখে দিয়েছে|কেড়ে|ফেরত দিচ্ছে না)/i,
  /\b(leak|post|share|spread|send|upload|viral)\w*\b[\s\S]{0,30}\b(video|photos?|pictures?|pics)\b[\s\S]{0,30}\b(unless|if i don'?t|if i do not|pay|money|taka)\b|\b(blackmail\w*|sextort\w*)\b|ব্ল্যাকমেইল|ভিডিও (ছেড়ে|ভাইরাল করে) দেবে/i,
  /\b(step-?father|step-?dad|uncle|cousin|teacher|tutor|neighbou?r|landlord|brother-in-law)\b[\s\S]{0,30}\b(comes?|came|coming|enters?|entered|sneaks?)\s+(in)?to (my|her|his) (room|bed)\b|(সৎ ?বাবা|চাচা|মামা)[\s\S]{0,20}রাতে[\s\S]{0,15}(ঘরে|রুমে) আসে/i,
  /\b(burn(t|ed)?|set (fire|on fire) to|torched|set alight)\b[\s\S]{0,15}\b(our|my|the|his|her) (house|home|shop|hut|room)\b|ঘরে আগুন (দিয়েছে|দেয়|লাগিয়ে)|বাড়িতে আগুন (দিয়েছে|দেয়|লাগিয়ে)/i,
  /\bmarry (off|her off)\b[\s\S]{0,30}\b(1[0-7]|[5-9])\b|\b(1[0-7]|[5-9])[ -]?(years?|yrs?)[ -]?old\b[\s\S]{0,30}\b(marr\w*|biye|wedding)\b|\b(marr\w*|biye)\b[\s\S]{0,30}\b(1[0-7]|[5-9])[ -]?(years?|yrs?)[ -]?old\b/i,
];

export function isCrisis(text: string): boolean {
  const t = norm(text);
  return CRISIS.some((w) => t.includes(w.normalize("NFC").toLowerCase())) || CRISIS_PATTERNS.some((re) => re.test(t));
}

export interface GuardContext {
  /** the user's message (and history) — a crisis there forces 999/109 first */
  crisis: boolean;
}

export interface GuardIssue {
  code: "unknown_number" | "section" | "money" | "unknown_law_year" | "promise" | "crisis_first";
  detail: string;
}

const SECTION = /(ধারা|অনুচ্ছেদ|উপধারা|দফা)\s*[-:]?\s*[0-9]|section\s*[0-9]|\bsec\.?\s*[0-9]|\barticle\s*[0-9]|\brule\s*[0-9]/i;
const MONEY = /([0-9][0-9,.]*\s*(টাকা|tk\.?|taka|bdt|৳|লাখ|লক্ষ|হাজার|lakh|crore|কোটি))|((৳|tk\.?|bdt)\s*[0-9])/i;
const PROMISE = /(মামলা|কেস|আবেদন)\s*(দায়ের|দাখিল|ফাইল|জমা)\s*(হয়ে গেছে|করা হয়েছে|হয়েছে|করে দিয়েছি)|নিশ্চিতভাবে\s*(জিত|পাবেন)|অবশ্যই\s*(জিতবেন|পাবেন)|আপনি\s*জিতবেন|পাবেনই|গ্যারান্টি|guarantee|you will win|your (case|application) (is|has been) (filed|submitted|registered)|i (have )?filed/i;
// Eligibility and outcomes are decided by the legal aid office or the court, never by us.
const DECIDES_FOR_THEM = /\byou (are|'re) (definitely |certainly |clearly )?(eligible|qualified|entitled)\b|\byou (will|'ll) (definitely |surely |certainly )?(get|win|receive|be granted)\b|\b(definitely|certainly) (will|get|win)\b|\b(don'?t|do not|won'?t) need (a |any )?lawyer\b|no need (for|of) (a )?lawyer|আপনি\s*(অবশ্যই\s*)?যোগ্য|আইনজীবীর\s*(কোনো\s*)?(দরকার|প্রয়োজন)\s*নেই|নিশ্চিত(ভাবে)?\s*পাবেন|\byou (do |will )?qualify\b|\b(court|judge|office|they) (will|would) (surely|definitely|certainly|obviously)\b|\b(should|will|would) win (easily|for sure)\b|\bcosts? (you )?nothing( at all)?\b|\bwill cost (you )?nothing\b|\b(your )?chances (are|look) (very |really |quite )?(good|high|strong|excellent)\b|\bsure to (get|win|receive|be granted)\b|\b(easily|quickly) (get|obtain|win)\b[\s\S]{0,40}\b(in|within) (a|one|two|\d+) (day|week|month)s?\b|\b(completely|totally|absolutely|100%) free\b|\bno (charges?|fees?|costs?) (at all|whatsoever)\b|\bno charges\b|\b(he|she|they|the accused|your husband) (will|would) (definitely |surely )?(go to|be sent to|end up in) (jail|prison)\b|জেল হবেই|অবশ্যই জেল হবে|সম্পূর্ণ বিনামূল্যে|কোনো খরচ (লাগবে|হবে) না/i;

/** Every problem in a model answer, or [] when it can be shown. */
export function checkAnswer(answer: string, ctx: GuardContext): GuardIssue[] {
  const issues: GuardIssue[] = [];
  const t = norm(answer);

  // Numbers: 3+ digit numbers must be a verified helpline or the year of a verified law that is named in the answer.
  const named = LAW_LIST.filter((l) => t.includes(norm(l.bn)) || t.includes(norm(l.en)));
  const namedYears = new Set(named.map((l) => toAsciiDigits(l.bn).match(/\d{4}/)?.[0] ?? ""));
  for (const m of t.matchAll(/(?<![0-9])[0-9]{3,}(?![0-9])/g)) {
    const n = m[0];
    if (ALLOWED_HELPLINE_NUMBERS.has(n)) continue;
    if (namedYears.has(n)) continue;
    issues.push(LAW_YEARS.has(n)
      ? { code: "unknown_law_year", detail: `The year ${n} appears without the verified law it belongs to. Name the law exactly as given, or drop the year.` }
      : { code: "unknown_number", detail: `The number ${n} is not a verified helpline. Use only: ${[...ALLOWED_HELPLINE_NUMBERS].join(", ")}.` });
  }
  if (SECTION.test(t)) issues.push({ code: "section", detail: "Do not cite section, article or rule numbers." });
  if (MONEY.test(t)) issues.push({ code: "money", detail: "Do not state taka amounts, fees or income thresholds." });
  if (PROMISE.test(t)) issues.push({ code: "promise", detail: "Never say a case is filed or promise an outcome; the legal aid office or court decides." });
  if (DECIDES_FOR_THEM.test(t)) issues.push({ code: "promise", detail: "Never tell the person they are eligible, will win/get something, or don't need a lawyer; say they may qualify and the legal aid office or court decides." });
  // "Call the helpline" without a number leaves a frightened person with nothing to dial.
  if (/\b(helpline|hotline)\b|হেল্পলাইন|হটলাইন/.test(t) && ![...ALLOWED_HELPLINE_NUMBERS].some((n) => t.includes(n))) {
    issues.push({ code: "unknown_number", detail: `The answer mentions a helpline but gives no number. Write the number itself: ${[...ALLOWED_HELPLINE_NUMBERS].join(", ")}.` });
  }
  if (ctx.crisis) {
    const first = t.split(/[।.!?\n]/).find((s) => s.trim()) ?? "";
    if (!/(999|109)/.test(first)) issues.push({ code: "crisis_first", detail: "The person may be in danger: the first sentence must tell them to call 999 (or 109 for women and children) now." });
  }
  return issues;
}

/** Turn issues into one repair message for the model. */
export const issuesText = (issues: GuardIssue[]): string => issues.map((i) => `${i.code}: ${i.detail}`).join(" ");

export const HELPLINE_IDS = HELPLINES.map((h) => h.id) as [HelplineId, ...HelplineId[]];
export const LAW_IDS = Object.keys(LAWS) as [LawId, ...LawId[]];


/**
 * Turns what a model wrote in the helplines/laws arrays into known ids: an exact id, a helpline's exact number
 * ("16699") or name, or a law's exact name. Anything else is dropped, so nothing is ever invented; the answer
 * text is still checked by checkAnswer(). Saves a repair round trip when a model writes "16699" instead of
 * "legal_aid".
 */
const fold = (x: string) => x.normalize("NFC").toLowerCase().replace(/[\s,.\-–—()]+/g, " ").trim();
export function normalizeHelplineIds(raw: unknown): HelplineId[] {
  if (!Array.isArray(raw)) return [];
  const out = new Set<HelplineId>();
  for (const v of raw) {
    if (typeof v !== "string") continue;
    const t = fold(v);
    const h = HELPLINES.find((x) => x.id === v || fold(x.number) === t || fold(x.bn) === t || fold(x.en) === t);
    if (h) out.add(h.id as HelplineId);
  }
  return [...out].slice(0, 4);
}
export function normalizeLawIds(raw: unknown): LawId[] {
  if (!Array.isArray(raw)) return [];
  const out = new Set<LawId>();
  for (const v of raw) {
    if (typeof v !== "string") continue;
    const t = fold(v);
    const l = Object.values(LAWS).find((x) => x.id === v || fold(x.bn) === t || fold(x.en) === t);
    if (l) out.add(l.id as LawId);
  }
  return [...out].slice(0, 4);
}
