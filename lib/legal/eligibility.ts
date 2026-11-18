/*
 * Ported for KormoPath from the Digital Legal Aid System (razibr246 and AdribMahmud101), lib/case/legal-aid-eligibility.ts.
 * KormoPath changes: law names come only from ./data.ts (verified, sourced); no section numbers; the unsourced
 * ৳15,000 monthly means test is removed (the applicant says whether they can afford a lawyer); every verdict is
 * worded as "you may qualify — the legal aid office decides" (ELIGIBILITY_NOTE_*). The grounds below are the
 * original app's screening design, not a statement of the official rules.
 */
import { LAWS, type LawId } from "./data.ts";

/**
 * Free legal-aid eligibility.
 *
 * The rule this implements, as stated for the service:
 *
 *   "Free government legal aid is available to financially insolvent, unemployed
 *    or unable-to-work people, as well as vulnerable groups such as children,
 *    abused women/children, trafficking or acid-attack victims, destitute/abandoned
 *    women, and persons with disabilities. A woman facing cyberbullying, online
 *    harassment, threats, blackmail or similar abuse may also seek legal aid,
 *    particularly where she is financially unable to pursue justice or falls within
 *    a protected/vulnerable category."
 *
 * That paragraph has three independent limbs, and the third is explicitly a
 * *particularity* — a woman facing online abuse qualifies, but "particularly where"
 * means the abuse alone is weaker than the other grounds and should be reported as
 * such rather than silently treated as equal to trafficking. So each ground returns
 * its own strength and the decision records every ground that applied, not just the
 * first one that matched. An officer can then see exactly why someone passed.
 *
 * Pure and dependency-free, like `lib/case/domain.ts`, so it is testable without a
 * browser and reusable from a route, a server component or a client component. It
 * must never be re-derived in a screen: this is the single answer to "does this
 * person get a free lawyer", and a DLAO's decision has to be explainable.
 */

export type EligibilityStrength = "decisive" | "supporting" | "conditional";

export interface EligibilityGround {
  /** Stable, machine-readable. Branch on this, never on the prose. */
  code: string;
  bn: string;
  en: string;
  strength: EligibilityStrength;
  /** Why this ground applies, for the officer's file. */
  detail: string;
}

export interface EligibilityDecision {
  eligible: boolean;
  /** Every ground that applied, strongest first. Never just the first match. */
  grounds: EligibilityGround[];
  /** The single strongest ground's code — what the verdict is "because of". */
  basis: string | null;
  basisBn: string;
  /**
   * The statute or scheme the matter is engaged under. Never null: an unrecognised
   * category resolves to the general-petition entry rather than leaving the officer
   * with no statute to quote.
   */
  act: ActRef;
  /** Short, spoken, human sentence for the applicant. Never a tag name. */
  assuranceBn: string;
  priority: "urgent" | "high" | "standard";
  /** True when eligibility rests on the weaker cyber limb. */
  conditionalBasis: boolean;
}

/**
 * Tri-state on purpose. `false` means "answered no", `null`/`undefined` means
 * "not established". Collapsing the two would be the same mistake as treating
 * unknown income as zero income: it would make an unasked question look like a
 * negative answer and hand someone free legal aid on a technicality.
 */
export interface ApplicantFacts {
  gender?: string | null;
  isChild?: boolean | null;
  /** From the application's own disability field, not inferred from the text. */
  hasDisability?: boolean | null;
  /** Monthly household income in BDT, kept for the file. Not compared with any threshold (none is verified). */
  monthlyIncome?: number | null;
  /** The applicant's own answer: "I cannot pay for a lawyer". Unknown is `null`, which is not "yes". */
  cannotAffordLawyer?: boolean | null;
  employed?: boolean | null;
  /** Physically able to work — separate from being employed. */
  ableToWork?: boolean | null;
  destituteOrAbandoned?: boolean | null;
  /** From the severity spec's Category A tags, not from free text. */
  traffickingRisk?: boolean | null;
  acidAttackVictim?: boolean | null;
  physicallyAbused?: boolean | null;
  /** Woman facing cyberbullying, online harassment, threats or blackmail. */
  onlineAbuseAgainstWoman?: boolean | null;
  categoryId?: string | null;
  subcategoryId?: string | null;
}

export interface ActRef { bn: string; en: string; section: null; url: string | null; lawId: LawId | null }

const ref = (id: LawId): ActRef => ({ bn: LAWS[id].bn, en: LAWS[id].en, section: null, url: LAWS[id].url, lawId: id });
const GENERAL: ActRef = { bn: "সাধারণ আবেদন", en: "General petition", section: null, url: null, lawId: null };

// Only verified laws (./data.ts). Categories without a confirmed current law (trafficking, disability) fall back
// to the general petition rather than naming a repealed or unconfirmed act.
const ACTS: Record<string, ActRef> = {
  cyber: ref("cyber_2026"),
  violence: ref("women_children_2000"),
  acid: ref("acid_2002"),
  family: ref("family_courts_2023"),
  domestic_violence: ref("domestic_violence_2010"),
  dowry: ref("dowry_2018"),
  labour: ref("labour_2006"),
  land: ref("land_crime_2023"),
  property: ref("transfer_property_1882"),
  cheque: ref("negotiable_instruments_1881"),
  inheritance: ref("succession_1925"),
  general: GENERAL,
};

/** The statute each deciding ground engages, so `act` always matches `basis`. */
const ACT_FOR_BASIS: Record<string, ActRef> = {
  acid_attack_victim: ACTS.acid,
  abused_woman_or_child: ACTS.violence,
  destitute_abandoned_woman: ACTS.violence,
  child: ACTS.violence,
  woman_online_abuse: ACTS.cyber,
  // No verified current law is named for these grounds (./data.ts), so they quote the general petition rather than
  // borrowing the category's law, which would tell the applicant the wrong thing was assessed.
  trafficking_victim: GENERAL,
  person_with_disability: GENERAL,
};

function actForCategory(categoryId: string | null | undefined) {
  if (!categoryId) return ACTS.general;
  return ACTS[categoryId] ?? ACTS.general;
}

/** Grounds from the "vulnerable groups such as ..." limb. */
const PROTECTED_CODES = new Set([
  "trafficking_victim",
  "acid_attack_victim",
  "abused_woman_or_child",
  "destitute_abandoned_woman",
  "child",
  "person_with_disability",
]);

/** Grounds from the "financially insolvent, unemployed or unable-to-work" limb. */
const MEANS_CODES = new Set(["financially_insolvent", "unemployed", "unable_to_work"]);

function isWoman(gender: string | null | undefined): boolean {
  return typeof gender === "string" && /^(female|woman|নারী|মহিলা)$/i.test(gender.trim());
}

/**
 * The strongest ground decides eligibility, but every ground is returned. Two
 * reasons: an officer appealing a refusal needs the full picture, and the
 * "conditional" cyber limb is meaningless unless the decisive grounds are visible
 * alongside it.
 */
export function assessLegalAidEligibility(facts: ApplicantFacts): EligibilityDecision {
  const grounds: EligibilityGround[] = [];
  const woman = isWoman(facts.gender);

  if (facts.traffickingRisk) {
    grounds.push({
      code: "trafficking_victim",
      bn: "মানব পাচারের শিকার",
      en: "Trafficking victim",
      strength: "decisive",
      detail: "নারী ও শিশু পাচারের শিকার হিসেবে চিহ্নিত।",
    });
  }
  if (facts.acidAttackVictim) {
    grounds.push({
      code: "acid_attack_victim",
      bn: "এসিড সন্ত্রাসের শিকার",
      en: "Acid-attack victim",
      strength: "decisive",
      detail: "এসিড সন্ত্রাসের শিকার হিসেবে চিহ্নিত।",
    });
  }
  if (facts.physicallyAbused) {
    grounds.push({
      code: "abused_woman_or_child",
      bn: "নারী বা শিশুর প্রতি সহিংসতার শিকার",
      en: "Abused woman or child",
      strength: "decisive",
      detail: "নারী ও শিশু নির্যাতনের শিকার হিসেবে চিহ্নিত।",
    });
  }
  if (facts.destituteOrAbandoned) {
    grounds.push({
      code: "destitute_abandoned_woman",
      bn: "অসচ্ছল ও পরিত্যক্ত নারী",
      en: "Destitute or abandoned woman",
      strength: "decisive",
      detail: woman ? "অসচ্ছল ও পরিত্যক্ত নারী হিসেবে চিহ্নিত।" : "অসচ্ছল ও পরিত্যক্ত ব্যক্তি হিসেবে চিহ্নিত।",
    });
  }
  if (facts.isChild) {
    grounds.push({
      code: "child",
      bn: "শিশু",
      en: "Child",
      strength: "decisive",
      detail: "নাবালক আবেদক, স্বার্থপ্রতিনিধির মাধ্যমে আবেদন করা হয়েছে।",
    });
  }
  if (facts.hasDisability) {
    grounds.push({
      code: "person_with_disability",
      bn: "প্রতিবন্ধী ব্যক্তি",
      en: "Person with a disability",
      strength: "decisive",
      detail: "প্রতিবন্ধী ব্যক্তি হিসেবে অগ্রাধিকার প্রাপ্য।",
    });
  }

  // Limb one: means. Income unknown is deliberately not treated as zero income —
  // it is recorded as unproven and, on its own, does not grant eligibility.
  const insolvent = facts.cannotAffordLawyer === true;
  if (insolvent) {
    grounds.push({
      code: "financially_insolvent",
      bn: "আর্থিকভাবে অক্ষম",
      en: "Financially insolvent",
      strength: "decisive",
      detail: "আবেদনকারী জানিয়েছেন যে আইনজীবীর খরচ বহন করতে পারেন না।",
    });
  }
  if (facts.employed === false) {
    grounds.push({
      code: "unemployed",
      bn: "বেকার",
      en: "Unemployed",
      strength: "decisive",
      detail: "কোনো চাকরি নেই।",
    });
  }
  if (facts.ableToWork === false) {
    grounds.push({
      code: "unable_to_work",
      bn: "কাজ করতে অক্ষম",
      en: "Unable to work",
      strength: "decisive",
      detail: "শারীরিক বা মানসিক কারণে কাজ করতে পারেন না।",
    });
  }

  // Limb three: the protected cyber limb. "Particularly where" makes it weaker than
  // a trafficking or disability ground, so it is recorded as conditional and the
  // assurance says so in plain words rather than implying a certainty.
  if (facts.onlineAbuseAgainstWoman && woman) {
    // The paragraph says a woman facing this abuse "may also seek legal aid,
    // particularly where she is financially unable to pursue justice OR falls within
    // a protected/vulnerable category". So this is a full ground in its own right once
    // either of those is present, and only a conditional one when neither is — the
    // "particularly where" is doing real work here, not decoration.
    const hasProtected = grounds.some((g) => PROTECTED_CODES.has(g.code));
    const hasMeans = grounds.some((g) => MEANS_CODES.has(g.code));
    const strength: EligibilityStrength = hasProtected ? "supporting" : hasMeans ? "decisive" : "conditional";
    grounds.push({
      code: "woman_online_abuse",
      bn: "অনলাইন নির্যাতনের শিকার নারী",
      en: "Woman facing cyberbullying, online harassment, threats or blackmail",
      strength,
      detail:
        strength === "supporting"
          ? "অনলাইন নির্যাতনের শিকার হওয়ায় সুরক্ষিত শ্রেণিতে রয়েছেন।"
          : strength === "decisive"
            ? "অনলাইন নির্যাতনের শিকার এবং আর্থিকভাবে বিচারের খরচ বহনে অক্ষম — দুই শর্তই পূরণ।"
            : "অনলাইন নির্যাতনের শিকার হলেও আর্থিক সামর্থ্য বা সুরক্ষিত শ্রেণির কোনোটিই প্রমাণ করা হয়নি।",
    });
  }

  // Within "decisive", a protected-category ground outranks a means ground. Both
  // grant eligibility, but they are not equally durable: someone who is a trafficking
  // victim or a person with a disability qualifies whatever her income, whereas
  // "unemployed" alone is thin — she would stop qualifying the day she found work.
  // Naming the means ground as the basis would tell her that, which is both wrong and
  // the kind of thing that loses an appeal.
  const VULNERABLE_FIRST = [
    // Where a woman faces online abuse and also meets the means test, the abuse is
    // the substantive reason she is in front of us, so it is named first.
    "woman_online_abuse",
    "trafficking_victim",
    "acid_attack_victim",
    "abused_woman_or_child",
    "destitute_abandoned_woman",
    "child",
    "person_with_disability",
    "financially_insolvent",
    "unable_to_work",
    "unemployed",
  ];
  const rank: Record<EligibilityStrength, number> = { conditional: 0, supporting: 1, decisive: 2 };
  grounds.sort((a, b) => {
    const byStrength = rank[b.strength] - rank[a.strength];
    if (byStrength !== 0) return byStrength;
    return VULNERABLE_FIRST.indexOf(a.code) - VULNERABLE_FIRST.indexOf(b.code);
  });

  const decisive = grounds.find((g) => g.strength === "decisive") ?? null;
  const conditionalOnly = grounds.length > 0 && decisive === null;
  const eligible = decisive !== null;
  const basis = decisive?.code ?? grounds[0]?.code ?? null;

  // The statute quoted must follow the ground that actually decided the case.
  //
  // It used to be picked from the raw flags, which could quote the Digital Security
  // Act while the decision rested on her disability — an applicant reads that as the
  // office having assessed the wrong thing. Deriving it from the basis makes the two
  // impossible to disagree.
  const act = ACT_FOR_BASIS[basis ?? ""] ?? actForCategory(facts.categoryId);

  const assuranceBn = buildAssurance(eligible, decisive, conditionalOnly, woman, facts);

  return {
    eligible,
    grounds,
    basis,
    basisBn: decisive?.bn ?? grounds[0]?.bn ?? "",
    act,
    assuranceBn,
    priority: facts.traffickingRisk || facts.acidAttackVictim || facts.physicallyAbused ? "urgent" : eligible ? "high" : "standard",
    conditionalBasis: conditionalOnly,
  };
}

/**
 * The spoken verdict. Short, in plain Bangla, addressed to the applicant — and it
 * never leaks a tag or a code, which is the one thing the severity spec forbids.
 */
function buildAssurance(
  eligible: boolean,
  decisive: EligibilityGround | null,
  conditionalOnly: boolean,
  woman: boolean,
  facts: ApplicantFacts,
): string {
  const office = " চূড়ান্ত সিদ্ধান্ত নেবে আপনার জেলা লিগ্যাল এইড অফিস; জানতে ১৬৬৯৯ নম্বরে ফোন করুন।";
  if (eligible && decisive) {
    return `${decisive.bn} — এই অবস্থায় আপনি সরকারি খরচে আইনি সহায়তা পেতে পারেন।${office}`;
  }
  if (conditionalOnly) {
    return woman
      ? `অনলাইন নির্যাতনের শিকার হলে আপনি সহায়তা চাইতে পারেন; আর্থিক অবস্থার তথ্য দিলে অফিস ভালোভাবে বিবেচনা করতে পারবে।${office}`
      : `দেওয়া তথ্যে স্পষ্ট কোনো কারণ পাওয়া যায়নি, তবু আবেদন করতে বাধা নেই।${office}`;
  }
  if (facts.hasDisability) {
    return `প্রতিবন্ধী ব্যক্তি হিসেবে আপনি অগ্রাধিকার চাইতে পারেন।${office}`;
  }
  return `দেওয়া তথ্যে সহায়তার স্পষ্ট কারণ পাওয়া যায়নি, তবু আবেদন করতে বাধা নেই।${office}`;
}
