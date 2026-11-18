/*
 * Citizen-journey helpers for the KormoPath legal section (/legal, /legal/apply, /legal/track). NO imports except
 * ./ siblings — pure and unit-tested (tests/legal-citizen.test.ts). Flows ported from the Digital Legal Aid System's
 * citizen portal (razibr246 and AdribMahmud101), rebuilt to work on the device without logins, dockets or filing.
 */
import type { ApplicantFacts, EligibilityDecision } from "./eligibility.ts";
import type { SeverityLevel } from "./severity.ts";
import type { HelplineId } from "./data.ts";
import { ELIGIBILITY_NOTE_BN, ELIGIBILITY_NOTE_EN } from "./data.ts";

/** Same format as lib/clientStore.storageKey("legal", "caseFiles"); kept literal until "legal" joins AppNamespace. */
export const LEGAL_CASES_KEY = "kormopath:legal:caseFiles";

export interface Bi { bn: string; en: string }

/**
 * Plain labels for every eligibility ground code, used instead of the core's own `bn` strings so the screen can show
 * both languages (and the acid ground is named as an acid attack, not poisoning).
 */
export const GROUND_LABELS: Record<string, Bi> = {
  trafficking_victim: { bn: "মানব পাচারের শিকার", en: "Victim of trafficking" },
  acid_attack_victim: { bn: "এসিড সন্ত্রাসের শিকার", en: "Victim of an acid attack" },
  abused_woman_or_child: { bn: "নারী বা শিশুর প্রতি সহিংসতার শিকার", en: "Woman or child facing violence" },
  destitute_abandoned_woman: { bn: "অসচ্ছল ও পরিত্যক্ত নারী", en: "Destitute or abandoned woman" },
  child: { bn: "শিশু", en: "Child" },
  person_with_disability: { bn: "প্রতিবন্ধী ব্যক্তি", en: "Person with a disability" },
  financially_insolvent: { bn: "আইনজীবীর খরচ দিতে পারেন না", en: "Cannot afford a lawyer" },
  unemployed: { bn: "বেকার", en: "Unemployed" },
  unable_to_work: { bn: "কাজ করতে অক্ষম", en: "Unable to work" },
  woman_online_abuse: { bn: "অনলাইন হয়রানির শিকার নারী", en: "Woman facing online abuse" },
};

/** The quick check's yes/no questions, in the order they are asked. */
export interface QuickAnswers {
  woman: boolean | null;
  child: boolean | null;
  disability: boolean | null;
  cannotAfford: boolean | null;
  unemployed: boolean | null;
  violence: boolean | null;
  abandoned: boolean | null;
  acid: boolean | null;
  trafficking: boolean | null;
  onlineAbuse: boolean | null;
}

export const EMPTY_ANSWERS: QuickAnswers = {
  woman: null, child: null, disability: null, cannotAfford: null, unemployed: null,
  violence: null, abandoned: null, acid: null, trafficking: null, onlineAbuse: null,
};

export const QUICK_QUESTIONS: { id: keyof QuickAnswers; bn: string; en: string }[] = [
  { id: "cannotAfford", bn: "আইনজীবীর খরচ দেওয়ার সামর্থ্য আপনার নেই?", en: "You cannot afford to pay a lawyer?" },
  { id: "woman", bn: "আপনি কি নারী?", en: "Are you a woman?" },
  { id: "child", bn: "যার জন্য সাহায্য চান, সে কি শিশু?", en: "Is the person who needs help a child?" },
  { id: "disability", bn: "কোনো প্রতিবন্ধিতা আছে?", en: "Do you have a disability?" },
  { id: "unemployed", bn: "এখন কোনো কাজ বা চাকরি নেই?", en: "You have no job right now?" },
  { id: "violence", bn: "নির্যাতন বা সহিংসতার শিকার হয়েছেন?", en: "Have you faced abuse or violence?" },
  { id: "abandoned", bn: "স্বামী বা পরিবার ফেলে চলে গেছে, দেখাশোনার কেউ নেই?", en: "Abandoned by husband or family, with no one to support you?" },
  { id: "onlineAbuse", bn: "অনলাইনে হয়রানি, হুমকি বা ব্ল্যাকমেইলের শিকার?", en: "Facing online harassment, threats or blackmail?" },
  { id: "acid", bn: "এসিড সন্ত্রাসের শিকার?", en: "Victim of an acid attack?" },
  { id: "trafficking", bn: "পাচারের শিকার বা পাচারের ঝুঁকিতে?", en: "Trafficked, or at risk of trafficking?" },
];

/** Map the quick answers onto the core's tri-state facts (null stays "not answered", never "no"). */
export function factsFromAnswers(a: QuickAnswers, categoryId?: string | null): ApplicantFacts {
  const not = (v: boolean | null) => (v === null ? null : !v);
  return {
    gender: a.woman === true ? "female" : a.woman === false ? "male" : null,
    isChild: a.child,
    hasDisability: a.disability,
    cannotAffordLawyer: a.cannotAfford,
    employed: not(a.unemployed),
    physicallyAbused: a.violence,
    destituteOrAbandoned: a.abandoned,
    acidAttackVictim: a.acid,
    traffickingRisk: a.trafficking,
    onlineAbuseAgainstWoman: a.onlineAbuse,
    categoryId: categoryId ?? null,
  };
}

export const answeredCount = (a: QuickAnswers) => Object.values(a).filter((v) => v !== null).length;

/** A bilingual verdict that never claims a decision: the legal aid office decides. */
export function eligibilityMessage(d: EligibilityDecision): { tone: "likely" | "maybe" | "unclear"; title: Bi; reasons: Bi[]; note: Bi } {
  const reasons = d.grounds.map((g) => GROUND_LABELS[g.code] ?? { bn: g.bn, en: g.en });
  const note = { bn: ELIGIBILITY_NOTE_BN, en: ELIGIBILITY_NOTE_EN };
  if (d.eligible) {
    return { tone: "likely", reasons, note, title: { bn: "আপনি সরকারি খরচে আইনি সহায়তা পেতে পারেন", en: "You may qualify for government legal aid" } };
  }
  if (d.grounds.length) {
    return { tone: "maybe", reasons, note, title: { bn: "সহায়তা চাইতে পারেন — অফিস বিবেচনা করবে", en: "You can ask for help — the office will consider it" } };
  }
  return { tone: "unclear", reasons, note, title: { bn: "স্পষ্ট কারণ পাওয়া যায়নি, তবু আবেদন করতে বাধা নেই", en: "No clear reason found, but you can still apply" } };
}

/**
 * Papers worth bringing if the person has them. A checklist, not an official requirement: the legal aid office says
 * what it needs. Category ids are the taxonomy's (./taxonomy.ts).
 */
const COMMON_DOCS: Bi[] = [
  { bn: "জাতীয় পরিচয়পত্র বা জন্ম নিবন্ধন", en: "National ID card or birth registration" },
  { bn: "ছবি (পাসপোর্ট সাইজ)", en: "Passport-size photo" },
];
const CATEGORY_DOCS: Record<string, Bi[]> = {
  family: [{ bn: "কাবিননামা / বিয়ের কাগজ", en: "Marriage certificate (kabinnama)" }, { bn: "তালাকের নোটিশ (থাকলে)", en: "Divorce notice (if any)" }],
  maintenance: [{ bn: "কাবিননামা / বিয়ের কাগজ", en: "Marriage certificate (kabinnama)" }, { bn: "সন্তানের জন্ম নিবন্ধন", en: "Children's birth registration" }],
  dowry: [{ bn: "কাবিননামা / বিয়ের কাগজ", en: "Marriage certificate (kabinnama)" }, { bn: "দাবি বা হুমকির প্রমাণ (বার্তা, সাক্ষী)", en: "Proof of the demand or threats (messages, witnesses)" }],
  dowry_violence: [{ bn: "চিকিৎসার কাগজ বা ডাক্তারি সনদ", en: "Medical papers or certificate" }, { bn: "থানায় করা জিডি/মামলার কপি (থাকলে)", en: "Copy of any GD or case filed at the police station" }],
  rent: [{ bn: "ভাড়ার চুক্তি বা রসিদ", en: "Rent agreement or receipts" }],
  inheritance: [{ bn: "মৃত্যু সনদ", en: "Death certificate" }, { bn: "ওয়ারিশ সনদ", en: "Succession (warish) certificate" }, { bn: "জমির দলিল ও খতিয়ান", en: "Land deed and khatian" }],
  agri_land: [{ bn: "জমির দলিল ও খতিয়ান", en: "Land deed and khatian" }, { bn: "খাজনার রসিদ", en: "Land tax receipts" }],
  non_agri_land: [{ bn: "জমি বা ফ্ল্যাটের দলিল", en: "Deed of the land or flat" }, { bn: "নামজারির কাগজ", en: "Mutation papers" }],
  cheque: [{ bn: "চেকের কপি", en: "Copy of the cheque" }, { bn: "ব্যাংকের ডিজঅনার স্লিপ", en: "Bank dishonour slip" }],
  cyber: [{ bn: "স্ক্রিনশট (তারিখ ও লিংকসহ)", en: "Screenshots (with dates and links)" }, { bn: "প্রোফাইল বা পোস্টের লিংক", en: "Links to the profile or posts" }],
};

export function documentSuggestions(categoryId: string | null | undefined): Bi[] {
  const extra = categoryId ? CATEGORY_DOCS[categoryId] ?? [] : [];
  const seen = new Set<string>();
  return [...COMMON_DOCS, ...extra].filter((d) => (seen.has(d.bn) ? false : (seen.add(d.bn), true)));
}

/** The application story with the other side's details appended (caseFile has one free-text problem field). */
export function composeProblem(story: string, other: { name: string; relation: string; address: string }): string {
  const s = story.normalize("NFC").trim();
  const parts = [other.name.trim() && `নাম: ${other.name.trim()}`, other.relation.trim() && `সম্পর্ক: ${other.relation.trim()}`, other.address.trim() && `ঠিকানা: ${other.address.trim()}`].filter(Boolean);
  return parts.length ? `${s}\n\nঅপর পক্ষ — ${parts.join("; ")}` : s;
}

/** What to do now, by how serious the core's severity classifier finds the story. Numbers only from ./data.ts ids. */
export function severityAdvice(level: SeverityLevel): { tone: "danger" | "urgent" | "soon" | "normal"; bn: string; en: string; call: HelplineId[] } {
  switch (level) {
    case "emergency":
      return { tone: "danger", call: ["emergency", "women_children"], bn: "আপনার নিরাপত্তা সবার আগে। বিপদ থাকলে এখনই ৯৯৯-এ ফোন করুন; নারী ও শিশুর জন্য ১০৯।", en: "Your safety comes first. If you are in danger, call 999 now; for women and children, 109." };
    case "high":
      return { tone: "urgent", call: ["legal_aid", "women_children"], bn: "বিষয়টি গুরুতর। দেরি না করে আজই ১৬৬৯৯-এ ফোন করুন।", en: "This is serious. Call 16699 today, without delay." };
    case "priority":
      return { tone: "soon", call: ["legal_aid"], bn: "যত তাড়াতাড়ি পারেন ১৬৬৯৯-এ ফোন করে জানান।", en: "Call 16699 as soon as you can." };
    default:
      return { tone: "normal", call: ["legal_aid"], bn: "খসড়াটি নিয়ে জেলা লিগ্যাল এইড অফিসে যান বা ১৬৬৯৯-এ ফোন করুন।", en: "Take the draft to your district legal aid office or call 16699." };
  }
}

/** Local date-time for a timeline row, Bangladesh time (UTC+6), "YYYY-MM-DD HH:MM". */
export function bdStamp(iso: string): string {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return "";
  return new Date(t + 6 * 3_600_000).toISOString().slice(0, 16).replace("T", " ");
}
