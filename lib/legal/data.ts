/*
 * Verified legal facts for KormoPath's legal section (আইনি সহায়তা). NO imports — pure and unit-tested
 * (tests/legal-data.test.ts). Ported for KormoPath from the Digital Legal Aid System (razibr246 and
 * AdribMahmud101); every helpline and law name below was re-checked against an official or clearly
 * authoritative page on LEGAL_CHECKED and carries its source. Anything that could not be confirmed was left
 * out, not guessed:
 *   - no income threshold (the 2014 policy, the 2017-18 revision and the 2025/2026 amendments disagree in
 *     secondary reporting; the official policy PDF could not be read), so eligibility is always phrased as
 *     "you may qualify; the legal aid office decides";
 *   - no section numbers (several of these laws were amended in 2025-2026; sections are not quoted unless
 *     checked against the current text);
 *   - no labour helpline, no DLAO office phone numbers, no government notices;
 *   - the 2012 trafficking act is repealed (bdlaws) and the replacement's exact title could not be
 *     confirmed, so no trafficking law is named; the helplines still apply.
 * Law names follow their bdlaws.minlaw.gov.bd titles. `en` for a Bangla-titled law is a plain translation.
 */

export const LEGAL_CHECKED = "2026-11-17";

export interface LegalSource {
  label: string;
  url: string;
  checked: string;
}

const src = (label: string, url: string): LegalSource => ({ label, url, checked: LEGAL_CHECKED });

export const NLASO_HOME = src("বাংলাদেশ আইনগত সহায়তা অধিদপ্তর (nlaso.gov.bd)", "https://nlaso.gov.bd/");
export const NLASO_HELPLINE_PAGE = src("আইনগত সহায়তা অধিদপ্তর — জাতীয় হেল্পলাইন ১৬৬৯৯", "https://nlaso.gov.bd/pages/static-pages/69ca4e8234fc363bf320ca55");
export const NLASO_LEGAL_AID_PAGE = src("আইনগত সহায়তা অধিদপ্তর — সরকারি খরচে আইনগত সহায়তা", "https://nlaso.gov.bd/pages/static-pages/6922dc72933eb65569e106d0");
export const NLASO_DISTRICT_OFFICES = src("আইনগত সহায়তা অধিদপ্তর — জেলা লিগ্যাল এইড অফিস", "https://nlaso.gov.bd/pages/officers?filters=%7B%22officer_category%22%3A%20%226922d29b81fc96cef9e99564%22%7D");
export const BDLAWS = src("Laws of Bangladesh (bdlaws.minlaw.gov.bd)", "http://bdlaws.minlaw.gov.bd/");

export type HelplineId = "legal_aid" | "emergency" | "women_children" | "child" | "govt_info" | "land";

export interface Helpline {
  id: HelplineId;
  number: string; // ASCII digits, dialable
  bn: string;
  en: string;
  whenBn: string;
  whenEn: string;
  source: LegalSource;
}

export const HELPLINES: readonly Helpline[] = [
  {
    id: "legal_aid", number: "16699",
    bn: "সরকারি আইন সহায়তার জাতীয় হেল্পলাইন", en: "National government legal aid helpline",
    whenBn: "বিনা মূল্যে আইনি পরামর্শ ও লিগ্যাল এইড অফিসের খোঁজ", whenEn: "Free legal advice and finding your legal aid office",
    source: NLASO_HELPLINE_PAGE,
  },
  {
    id: "emergency", number: "999",
    bn: "জাতীয় জরুরি সেবা", en: "National emergency service",
    whenBn: "এখনই বিপদ: পুলিশ, অ্যাম্বুলেন্স, ফায়ার সার্ভিস", whenEn: "Danger right now: police, ambulance, fire",
    source: { label: "বাংলাদেশ জাতীয় তথ্য বাতায়ন — জরুরি সেবা নম্বরসমূহ (৯৯৯)", url: "https://bangladesh.gov.bd", checked: "2026-11-19" },
  },
  {
    id: "women_children", number: "109",
    bn: "নারী ও শিশু নির্যাতন প্রতিরোধে জাতীয় হেল্পলাইন", en: "National helpline against violence on women and children",
    whenBn: "নির্যাতন, বাল্যবিবাহ, যৌতুক, যৌন হয়রানি", whenEn: "Abuse, child marriage, dowry, sexual harassment",
    source: src("মহিলা ও শিশু বিষয়ক মন্ত্রণালয় — হেল্পলাইন ১০৯", "https://mowca.portal.gov.bd//sites/default/files/files/mowca.portal.gov.bd/publications/2232e974_c9d5_437c_bb2c_4b558af52020/English_MoWCA_Presentation_March_23.pdf"),
  },
  {
    id: "child", number: "1098",
    bn: "শিশু সহায়তা লাইন", en: "Child helpline",
    whenBn: "বিপদে থাকা শিশুর জন্য সহায়তা", whenEn: "Help for a child in danger",
    // Same official source and check date as Rokkha's helpline list (lib/rokkhaData.ts).
    source: { label: "বাংলাদেশ জাতীয় তথ্য বাতায়ন — শিশু সহায়তা লাইন (১০৯৮)", url: "https://bangladesh.gov.bd", checked: "2026-11-17" },
  },
  {
    id: "govt_info", number: "333",
    bn: "সরকারি তথ্য ও সেবা", en: "Government information and services",
    whenBn: "কোন অফিসে যাবেন, কোন সেবা কোথায়", whenEn: "Which office to go to, where a service is",
    source: { label: "বাংলাদেশ জাতীয় তথ্য বাতায়ন — জরুরি সেবা নম্বরসমূহ (৩৩৩)", url: "https://bangladesh.gov.bd", checked: "2026-11-19" },
  },
  {
    id: "land", number: "16122",
    bn: "ভূমি সেবা হটলাইন", en: "Land service hotline",
    whenBn: "জমির সেবা, নামজারি ও ভূমি অফিসের অভিযোগ", whenEn: "Land services, mutation and land office complaints",
    source: { label: "ভূমি মন্ত্রণালয় — Land 16122 Helpline (hotline.land.gov.bd)", url: "https://hotline.land.gov.bd/", checked: "2026-11-19" },
  },
] as const;

export const helplineById = (id: HelplineId): Helpline => HELPLINES.find((h) => h.id === id)!;

export type LawId =
  | "legal_aid_2000" | "domestic_violence_2010" | "women_children_2000" | "acid_2002" | "dowry_2018"
  | "child_marriage_2017" | "family_courts_2023" | "mflo_1961" | "land_crime_2023" | "specific_relief_1877"
  | "transfer_property_1882" | "partition_1893" | "succession_1925" | "negotiable_instruments_1881"
  | "labour_2006" | "cyber_2026" | "penal_code_1860" | "crpc_1898" | "arbitration_2001";

export interface Law {
  id: LawId;
  bn: string;
  en: string;
  url: string;
  source: LegalSource;
}

const law = (id: LawId, bn: string, en: string, actId: number): Law => {
  const url = `http://bdlaws.minlaw.gov.bd/act-details-${actId}.html`;
  return { id, bn, en, url, source: src(`bdlaws — ${bn}`, url) };
};

export const LAWS: Readonly<Record<LawId, Law>> = {
  legal_aid_2000: law("legal_aid_2000", "আইনগত সহায়তা প্রদান আইন, ২০০০", "Legal Aid Services Act, 2000", 834),
  domestic_violence_2010: law("domestic_violence_2010", "পারিবারিক সহিংসতা (প্রতিরোধ ও সুরক্ষা) আইন, ২০১০", "Domestic Violence (Prevention and Protection) Act, 2010", 1063),
  women_children_2000: law("women_children_2000", "নারী ও শিশু নির্যাতন দমন আইন, ২০০০", "Women and Children Repression Prevention Act, 2000", 835),
  acid_2002: law("acid_2002", "এসিড অপরাধ দমন আইন, ২০০২", "Acid Crime Control Act, 2002", 883),
  dowry_2018: law("dowry_2018", "যৌতুক নিরোধ আইন, ২০১৮", "Dowry Prohibition Act, 2018", 1256),
  child_marriage_2017: law("child_marriage_2017", "বাল্যবিবাহ নিরোধ আইন, ২০১৭", "Child Marriage Restraint Act, 2017", 1207),
  family_courts_2023: law("family_courts_2023", "পারিবারিক আদালত আইন, ২০২৩", "Family Courts Act, 2023", 1444),
  mflo_1961: law("mflo_1961", "মুসলিম পারিবারিক আইন অধ্যাদেশ, ১৯৬১", "The Muslim Family Laws Ordinance, 1961", 305),
  land_crime_2023: law("land_crime_2023", "ভূমি অপরাধ প্রতিরোধ ও প্রতিকার আইন, ২০২৩", "Land Crime Prevention and Remedy Act, 2023", 1454),
  specific_relief_1877: law("specific_relief_1877", "সুনির্দিষ্ট প্রতিকার আইন, ১৮৭৭", "The Specific Relief Act, 1877", 36),
  transfer_property_1882: law("transfer_property_1882", "সম্পত্তি হস্তান্তর আইন, ১৮৮২", "The Transfer of Property Act, 1882", 48),
  partition_1893: law("partition_1893", "বাঁটোয়ারা আইন, ১৮৯৩", "The Partition Act, 1893", 68),
  succession_1925: law("succession_1925", "উত্তরাধিকার আইন, ১৯২৫", "The Succession Act, 1925", 138),
  negotiable_instruments_1881: law("negotiable_instruments_1881", "হস্তান্তরযোগ্য দলিল আইন, ১৮৮১", "The Negotiable Instruments Act, 1881", 46),
  labour_2006: law("labour_2006", "বাংলাদেশ শ্রম আইন, ২০০৬", "Bangladesh Labour Act, 2006", 952),
  cyber_2026: law("cyber_2026", "সাইবার সুরক্ষা আইন, ২০২৬", "Cyber Security Act, 2026", 1710),
  penal_code_1860: law("penal_code_1860", "দণ্ডবিধি, ১৮৬০", "The Penal Code, 1860", 11),
  crpc_1898: law("crpc_1898", "ফৌজদারি কার্যবিধি, ১৮৯৮", "The Code of Criminal Procedure, 1898", 75),
  arbitration_2001: law("arbitration_2001", "সালিস আইন, ২০০১", "Arbitration Act, 2001", 850),
};

export const LEGAL_SOURCES: readonly LegalSource[] = [NLASO_HOME, NLASO_HELPLINE_PAGE, NLASO_LEGAL_AID_PAGE, NLASO_DISTRICT_OFFICES, BDLAWS];

/** The one way eligibility is ever stated to a person. */
export const ELIGIBILITY_NOTE_BN = "এটি শুধু একটি প্রাথমিক ধারণা। আপনি সরকারি খরচে আইনি সহায়তা পেতে পারেন কি না, তা আপনার জেলা লিগ্যাল এইড অফিস ঠিক করবে। জানতে ১৬৬৯৯ নম্বরে ফোন করুন।";
export const ELIGIBILITY_NOTE_EN = "This is only a first idea. Whether you get government legal aid is decided by your district legal aid office. Call 16699 to ask.";
export const NOT_LEGAL_ADVICE_BN = "এটি আইনি তথ্য, আইনি পরামর্শ নয়। আপনার নিজের বিষয়ে সিদ্ধান্তের আগে আইনজীবী বা লিগ্যাল এইড অফিসের সঙ্গে কথা বলুন।";
export const NOT_LEGAL_ADVICE_EN = "This is legal information, not legal advice. Talk to a lawyer or your legal aid office before deciding anything about your own case.";
