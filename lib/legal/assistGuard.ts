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
];

export function isCrisis(text: string): boolean {
  const t = norm(text);
  return CRISIS.some((w) => t.includes(w.normalize("NFC").toLowerCase()));
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
const PROMISE = /(মামলা|কেস|আবেদন)\s*(দায়ের|দাখিল|ফাইল|জমা)\s*(হয়ে গেছে|করা হয়েছে|হয়েছে|করে দিয়েছি)|নিশ্চিতভাবে\s*(জিত|পাবেন)|অবশ্যই\s*জিতবেন|আপনি\s*জিতবেন|গ্যারান্টি|guarantee|you will win|your (case|application) (is|has been) (filed|submitted|registered)|i (have )?filed/i;

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
