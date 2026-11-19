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

// Doses and schedules written in words ("half a teaspoon three times daily", "আধা চামচ দিনে তিনবার").
const WORD_DOSE = /\b(?:half|one|two|three|a|1\/2)\s+(?:a\s+)?(?:tea|table)?spoons?\b|\b(?:one|two|three|four|1|2|3|4)\s+(?:times|tablets?|capsules?|drops?|puffs?)\b|\b(?:every|each)\s+\d+\s*(?:hours?|hrs?)\b|\btimes (?:a |per )?(?:day|daily)\b|\b(?:twice|thrice) daily\b|(?:আধা|এক|দুই|তিন)\s*চামচ|দিনে\s*(?:এক|দুই|তিন|চার)\s*বার|ঘণ্টা\s*পর\s*পর/i;
// A diagnosis offered as a guess is still a diagnosis.
const HEDGED_DIAGNOSIS = /\b(?:sounds|looks|seems) like (?:a |an )?\w+|\b(?:could|might|may) (?:well )?be (?:a |an )?(?:case of |sign of )?(?:dengue|typhoid|malaria|covid|infection|pneumonia|asthma|diabetes|cancer|tb|tuberculosis|ulcer|heart attack|stroke|appendicitis|jaundice)\b|মনে হচ্ছে\s*(?:আপনার|তার)?\s*\S*\s*(?:ডেঙ্গু|টাইফয়েড|ম্যালেরিয়া|জন্ডিস|নিউমোনিয়া|ডায়াবেটিস|ক্যান্সার|আলসার)|সম্ভবত\s*(?:ডেঙ্গু|টাইফয়েড|ম্যালেরিয়া|জন্ডিস|নিউমোনিয়া|ডায়াবেটিস|ক্যান্সার|আলসার)/i;
// "Most likely a viral fever", "points to dengue", "it is probably gastritis": a guessed condition, still a diagnosis.
const LIKELY_DIAGNOSIS = /\b(?:most likely|more likely|very likely|probably|likely|points? (?:to|towards)|suggests?|consistent with|indicat(?:es|ive of)|typical of)\s+(?:a |an |the |some )?(?:\w+itis|\w+osis|viral|bacterial|fungal|flu|influenza|allergy|allergic|migraine|infection|dengue|typhoid|malaria|covid|pneumonia|asthma|diabetes|cancer|ulcer|gastric|acidity|heart attack|stroke|anaemia|anemia|jaundice|fracture|sprain)\b|সম্ভবত\s*(?:ভাইরাল|গ্যাস্ট্রিক|অ্যালার্জি|এলার্জি|ইনফেকশন|সংক্রমণ)/i;
// Treatment advice that is not a named drug: ORS, creams, antihistamines, painkillers, home applications.
const TREATMENT = /\b(?:take|drink|use|apply|try|give|put on|rub)\s+(?:some |an? |the |this )?(?:ors|oral rehydration|saline|cream|ointment|gel|lotion|eye ?drops|syrup|antihistamine|painkiller|pain ?killer|balm|ice pack|hot compress)\b|\b(?:antihistamines?|painkillers?|ointments?|betnovate|dermovate|burnol|savlon|dettol|calamine|zinc oxide)\b|\bors\b|মলম|ক্রিম লাগান|অ্যান্টিহিস্টামিন|ব্যথানাশক|স্যালাইন খান/i;
// Generic drug-name endings, so medicines missing from MEDICINE_WORDS are still caught (montelukast, domperidone…).
const DRUG_SUFFIX = /\b[a-z]{3,}(?:prazole|mycin|cillin|floxacin|olol|pril|sartan|statin|lukast|peridone|tadine|ifene|azepam|oxetine|triptan|dronate|parin|cycline|conazole|vir)\b/i;

/** Text that reads as a dose, medicine suggestion or diagnosis, or null when clean. */
export function unsafeIn(text: string): string | null {
  const t = ascii(norm(text));
  const m = t.match(DOSE) ?? t.match(FREQUENCY) ?? t.match(WORD_DOSE) ?? t.match(MEDICINE_WORDS) ?? t.match(DRUG_SUFFIX) ?? t.match(DIAGNOSIS) ?? t.match(HEDGED_DIAGNOSIS) ?? t.match(LIKELY_DIAGNOSIS) ?? t.match(TREATMENT);
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
