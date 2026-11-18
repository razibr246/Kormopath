/*
 * Guardrails for the MediScan health assistant (app/api/health/assist). Pure, imports only ./specialty.ts.
 * Runs inside the Zod schema's superRefine, so a model answer that breaks a rule goes back through the repair loop.
 *
 * Rules (KormoPath MediScan): never diagnose, never name or suggest a medicine, never give a dose or amount,
 * the specialty must come from the fixed list, and any emergency sign forces the emergency answer.
 */
import { SPECIALTY_IDS, findRedFlags, norm } from "./specialty.ts";

const BN_DIGITS = "০১২৩৪৫৬৭৮৯";
const ascii = (s: string) => s.replace(/[০-৯]/g, (d) => String(BN_DIGITS.indexOf(d)));

// Number + dose unit, or "N times a day", in English or Bangla.
const DOSE = /\d+(?:[.,]\d+)?\s*(?:mg|mcg|µg|g\b|ml|mL|iu|units?\b|tab(?:let)?s?\b|caps?(?:ule)?s?\b|drops?\b|puffs?\b|মিগ্রা|মি\.গ্রা|মিলিগ্রাম|মিলি|গ্রাম|ট্যাবলেট|ক্যাপসুল|ফোঁটা|চামচ)/i;
const FREQUENCY = /\b(?:once|twice|thrice|\d)\s*(?:a|per)\s*day\b|দিনে\s*\d+\s*বার|\b(?:od|bd|tds|qid|bid|tid)\b|\d\s*\+\s*\d\s*\+\s*\d/i;
// Medicine words and common Bangladesh brand/generic names that must never appear as a suggestion.
const MEDICINE_WORDS = /\b(?:paracetamol|napa|ace\b|ibuprofen|aspirin|antibiotic|amoxicillin|azithromycin|ciprofloxacin|metronidazole|omeprazole|esomeprazole|pantoprazole|ranitidine|antacid|cetirizine|fexofenadine|loratadine|salbutamol|insulin|metformin|steroid|prednisolone|dexamethasone|diclofenac|tramadol|orsaline)\b|প্যারাসিটামল|নাপা|অ্যান্টিবায়োটিক|এন্টিবায়োটিক|ইনসুলিন|স্টেরয়েড|ওমিপ্রাজল|খাওয়ার স্যালাইন|ঔষধ খান|ওষুধ খান|take (?:a |the )?(?:medicine|tablet|pill)/i;
// A disease named as a conclusion about this person.
const DIAGNOSIS = /\byou (?:have|have got|are suffering from|definitely have|probably have|likely have)\b|\bit (?:is|'s) (?:likely|probably|definitely)\b|\bdiagnos(?:is|ed|e)\b|\bthis is (?:a|an) (?:case|sign) of\b|আপনার\s+\S+(?:\s+\S+)?\s+(?:রোগ\s+)?হয়েছে|আপনি\s+\S+(?:\s+\S+)?\s+(?:রোগে\s+)?আক্রান্ত|নিশ্চিত(?:ভাবে)?\s+\S+\s+রোগ|এটি\s+(?:সম্ভবত|নিশ্চয়ই)\s+\S+\s*রোগ|রোগ নির্ণয় করা হলো/i;

export interface GuardProblem { field: string; message: string }

export interface AssistOutput {
  specialtyId: string;
  whyBn: string;
  whyEn: string;
  tellDoctor: string[];
}

/** Text that reads as a dose, medicine suggestion or diagnosis, or null when clean. */
export function unsafeIn(text: string): string | null {
  const t = ascii(norm(text));
  const m = t.match(DOSE) ?? t.match(FREQUENCY) ?? t.match(MEDICINE_WORDS) ?? t.match(DIAGNOSIS);
  return m ? m[0] : null;
}

/** Every rule broken by a model answer; empty means it may be shown. `userText` is what the person wrote. */
export function checkAssistOutput(out: AssistOutput, userText: string): GuardProblem[] {
  const problems: GuardProblem[] = [];
  if (!(SPECIALTY_IDS as readonly string[]).includes(out.specialtyId)) {
    problems.push({ field: "specialtyId", message: `specialtyId must be one of: ${SPECIALTY_IDS.join(", ")}.` });
  }
  const fields: Array<[string, string]> = [["whyBn", out.whyBn], ["whyEn", out.whyEn], ...out.tellDoctor.map((t, i) => [`tellDoctor.${i}`, t] as [string, string])];
  for (const [field, text] of fields) {
    const bad = unsafeIn(text);
    if (bad) problems.push({ field, message: `Contains "${bad}". Never name a disease as a conclusion, never suggest a medicine and never give a dose or frequency; only say which kind of doctor to see and why, in general words.` });
  }
  if (findRedFlags(userText).length) {
    problems.push({ field: "specialtyId", message: "The person described an emergency sign: this must be answered as an emergency (999), not with a specialty." });
  }
  return problems;
}
