// MediScan BD: prescription reading helper. Pure and deterministic, no imports, so it is
// unit-tested under `node --test`.
//
// Safety rules this module enforces:
// - It only reports what is written in the text it is given. It never invents a medicine,
//   dose, duration, doctor or hospital. Missing information is reported as missing.
// - The reference list is general patient information, not a clinical database. It is
//   small on purpose; "not in our list" is never presented as "safe".
// - It does not recommend switching brands or changing doses. That is for the prescriber
//   or pharmacist.

export type DrugClass =
  | "analgesic"
  | "ppi"
  | "antibiotic"
  | "antihistamine"
  | "leukotriene"
  | "antidiabetic"
  | "antacid"
  | "antihypertensive"
  | "statin"
  | "prokinetic"
  | "electrolyte"
  | "antiprotozoal"
  | "bronchodilator"
  | "antiemetic"
  | "oral-rehydration"
  | "substance";

export interface DrugItem {
  id: string;
  /** Brand names as commonly written on Bangladeshi prescriptions; used only for matching. */
  aliases: string[];
  genericName: string;
  /** Active ingredient keys, for duplicate-ingredient checks. */
  ingredients: string[];
  drugClass: DrugClass;
  whatItIsForBn: string;
  generalNotesBn: string;
}

export type DrugInfo = DrugItem;

/** Reviewed: 2026-11-05. General information only; see docs/mediscan-research-and-plan.md. */
export const DRUG_REFERENCE: DrugItem[] = [
  {
    id: "paracetamol",
    aliases: ["napa", "ace", "paracetamol"],
    genericName: "Paracetamol",
    ingredients: ["paracetamol"],
    drugClass: "analgesic",
    whatItIsForBn: "জ্বর ও ব্যথা কমাতে ব্যবহৃত হয়।",
    generalNotesBn: "একাধিক প্যারাসিটামলযুক্ত ওষুধ একসাথে খেলে দৈনিক সর্বোচ্চ মাত্রা পার হওয়ার ঝুঁকি থাকে। লিভারের রোগ থাকলে ডাক্তারকে জানান।",
  },
  {
    id: "paracetamol-caffeine",
    aliases: ["napa extra", "ace plus", "paracetamol + caffeine", "paracetamol+caffeine"],
    genericName: "Paracetamol + Caffeine",
    ingredients: ["paracetamol", "caffeine"],
    drugClass: "analgesic",
    whatItIsForBn: "ব্যথা ও জ্বর কমাতে ব্যবহৃত হয়; এতে ক্যাফেইন আছে।",
    generalNotesBn: "এতে প্যারাসিটামল আছে — অন্য প্যারাসিটামলের সাথে মিলিয়ে দৈনিক মাত্রা হিসাব করুন। ক্যাফেইন থাকায় অতিরিক্ত চা/কফি এড়িয়ে চলুন।",
  },
  {
    id: "omeprazole",
    aliases: ["seclo", "losectil", "omeprazole"],
    genericName: "Omeprazole",
    ingredients: ["omeprazole"],
    drugClass: "ppi",
    whatItIsForBn: "পাকস্থলীর অ্যাসিড কমায় (গ্যাস্ট্রিক, বুক জ্বালা, আলসার)।",
    generalNotesBn: "সাধারণত খাবারের আগে খেতে বলা হয় — আপনার প্রেসক্রিপশনের নির্দেশনা মানুন। দীর্ঘদিন খাওয়ার আগে ডাক্তারের সাথে কথা বলুন।",
  },
  {
    id: "esomeprazole",
    aliases: ["maxpro", "nexum", "sergel", "esomeprazole"],
    genericName: "Esomeprazole",
    ingredients: ["esomeprazole"],
    drugClass: "ppi",
    whatItIsForBn: "পাকস্থলীর অ্যাসিড কমায় (গ্যাস্ট্রিক, বুক জ্বালা, GERD)।",
    generalNotesBn: "একই সাথে দুটি অ্যাসিড-কমানোর ক্যাপসুল (PPI) সাধারণত দেওয়া হয় না — দুটি থাকলে ডাক্তারকে জিজ্ঞেস করুন।",
  },
  {
    id: "pantoprazole",
    aliases: ["pantonix", "pantobex", "pantoprazole"],
    genericName: "Pantoprazole",
    ingredients: ["pantoprazole"],
    drugClass: "ppi",
    whatItIsForBn: "পাকস্থলীর অ্যাসিড কমায় (গ্যাস্ট্রিক, বুক জ্বালা, আলসার)।",
    generalNotesBn: "সাধারণত খাবারের আগে খেতে বলা হয় — আপনার প্রেসক্রিপশনের নির্দেশনা মানুন।",
  },
  {
    id: "azithromycin",
    aliases: ["zithrin", "azithrocin", "azithromycin"],
    genericName: "Azithromycin",
    ingredients: ["azithromycin"],
    drugClass: "antibiotic",
    whatItIsForBn: "ব্যাকটেরিয়াজনিত সংক্রমণের অ্যান্টিবায়োটিক। ভাইরাস জ্বরে কাজ করে না।",
    generalNotesBn: "ডাক্তার যতদিন বলেছেন পুরো কোর্স শেষ করুন, ভালো লাগলেও মাঝপথে বন্ধ করবেন না। অ্যালুমিনিয়াম/ম্যাগনেসিয়ামযুক্ত অ্যান্টাসিডের সাথে একই সময়ে খাবেন না।",
  },
  {
    id: "fexofenadine",
    aliases: ["fexo", "fenadin", "fexofenadine"],
    genericName: "Fexofenadine",
    ingredients: ["fexofenadine"],
    drugClass: "antihistamine",
    whatItIsForBn: "অ্যালার্জি, হাঁচি, সর্দি, চুলকানি কমায়।",
    generalNotesBn: "ফলের রস (যেমন কমলা, আঙুর, আপেল) একসাথে খেলে কাজ কমে যেতে পারে — পানি দিয়ে খান।",
  },
  {
    id: "montelukast",
    aliases: ["monas", "montene", "montelukast"],
    genericName: "Montelukast",
    ingredients: ["montelukast"],
    drugClass: "leukotriene",
    whatItIsForBn: "হাঁপানি ও অ্যালার্জিজনিত নাক বন্ধ প্রতিরোধে ব্যবহৃত হয়।",
    generalNotesBn: "হঠাৎ শ্বাসকষ্টের সময় এটি কাজ করে না। মেজাজ বা ঘুমে অস্বাভাবিক পরিবর্তন হলে ডাক্তারকে জানান।",
  },
  {
    id: "metformin",
    aliases: ["comet", "bigmet", "metformin"],
    genericName: "Metformin",
    ingredients: ["metformin"],
    drugClass: "antidiabetic",
    whatItIsForBn: "টাইপ-২ ডায়াবেটিসে রক্তের শর্করা নিয়ন্ত্রণে ব্যবহৃত হয়।",
    generalNotesBn: "সাধারণত খাবারের সাথে বা পরে খেতে বলা হয়। নিজে থেকে ডোজ বাড়াবেন/কমাবেন না।",
  },
  {
    id: "antacid-almg",
    aliases: ["antacid", "aluminium hydroxide", "magnesium hydroxide", "entacyd", "flacol"],
    genericName: "Aluminium hydroxide + Magnesium hydroxide (antacid)",
    ingredients: ["aluminium hydroxide", "magnesium hydroxide"],
    drugClass: "antacid",
    whatItIsForBn: "পেটের অ্যাসিড সাময়িকভাবে নিষ্ক্রিয় করে বুক জ্বালা কমায়।",
    generalNotesBn: "অনেক ওষুধের শোষণ কমিয়ে দেয় — অন্য ওষুধের সাথে সময়ের ব্যবধান রাখতে হয় কি না ফার্মাসিস্টকে জিজ্ঞেস করুন।",
  },
  {
    id: "ciprofloxacin",
    aliases: ["ciprocin", "neofloxin", "cipro", "cpro", "flontin", "beuflox", "ciprofloxacin"],
    genericName: "Ciprofloxacin",
    ingredients: ["ciprofloxacin"],
    drugClass: "antibiotic",
    whatItIsForBn: "ব্যাকটেরিয়াজনিত সংক্রমণ (যেমন প্রস্রাবের সংক্রমণ, ডায়রিয়া, টাইফয়েড ও শ্বাসনালীর সংক্রমণ) নিরাময়ে ব্যবহৃত ফ্লুরোকুইনোলোন অ্যান্টিবায়োটিক।",
    generalNotesBn: "ক্যালসিয়াম, ম্যাগনেসিয়াম বা অ্যালুমিনিয়ামযুক্ত অ্যান্টাসিড খাওয়ার অন্তত ২ ঘণ্টা আগে বা ৪-৬ ঘণ্টা পরে খান, অন্যথায় শোষণ ব্যাহত হয়। ডাক্তারের পরামর্শমতো পুরো কোর্স শেষ করুন।",
  },
  {
    id: "amoxicillin-clavulanic",
    aliases: ["moxaclav", "clavupen", "amoxiclav", "co-amoxiclav", "co amoxiclav", "tyclav", "amoxicillin + clavulanic acid", "amoxicillin+clavulanic acid"],
    genericName: "Amoxicillin + Clavulanic acid",
    ingredients: ["amoxicillin", "clavulanic acid"],
    drugClass: "antibiotic",
    whatItIsForBn: "কান, গলা, ফুসফুস ও মূত্রনালীর প্রতিরোধী ব্যাকটেরিয়াজনিত সংক্রমণের অ্যান্টিবায়োটিক।",
    generalNotesBn: "পেটের অস্বস্তি এড়াতে প্রধান খাবারের শুরুতে খান। পেনিসিলিনে অ্যালার্জি থাকলে ডাক্তারকে জানান এবং সম্পূর্ণ কোর্স শেষ করুন।",
  },
  {
    id: "cefixime",
    aliases: ["cef-3", "cef 3", "cef3", "triocav", "denvar", "cefutic", "triocim", "cefixime"],
    genericName: "Cefixime",
    ingredients: ["cefixime"],
    drugClass: "antibiotic",
    whatItIsForBn: "টাইফয়েড জ্বর, শ্বাসতন্ত্র ও মূত্রনালীর তীব্র ব্যাকটেরিয়াজনিত সংক্রমণের ৩য় প্রজন্মের সেফালোস্পোরিন অ্যান্টিবায়োটিক।",
    generalNotesBn: "জ্বর কমে গেলেও ডাক্তারের নির্দেশিত পুরো কোর্স শেষ করুন; মাঝপথে বন্ধ করলে ব্যাকটেরিয়াল রেজিস্ট্যান্স হতে পারে।",
  },
  {
    id: "losartan",
    aliases: ["osartil", "angilock", "losar", "prosan", "losan", "losartan potassium", "losartan"],
    genericName: "Losartan Potassium",
    ingredients: ["losartan"],
    drugClass: "antihypertensive",
    whatItIsForBn: "উচ্চ রক্তচাপ নিয়ন্ত্রণে এবং ডায়াবেটিক রোগীদের কিডনি সুরক্ষায় ব্যবহৃত ARB শ্রেণির ওষুধ।",
    generalNotesBn: "প্রতিদিন একই সময়ে খাওয়া উচিত। নিজে থেকে হঠাৎ ওষুধ বন্ধ করবেন না। গর্ভাবস্থায় এই ওষুধ খাওয়া নিষেধ।",
  },
  {
    id: "amlodipine",
    aliases: ["camlodin", "amocal", "lodipin", "amdocal", "amlocab", "amlodipine besylate", "amlodipine"],
    genericName: "Amlodipine",
    ingredients: ["amlodipine"],
    drugClass: "antihypertensive",
    whatItIsForBn: "উচ্চ রক্তচাপ নিয়ন্ত্রণ ও হৃদরোগে রক্তনালী প্রসারিত করে রক্ত চলাচল স্বাভাবিক রাখতে ব্যবহৃত ক্যালসিয়াম চ্যানেল ব্লকার।",
    generalNotesBn: "নিয়মিত রক্তচাপ মাপুন। পা বা গোড়ালি ফুলে গেলে বা হঠাৎ মাথা ঘুরলে ডাক্তারকে জানান।",
  },
  {
    id: "atorvastatin",
    aliases: ["atova", "lipicon", "tiginor", "atorva", "anzitor", "atorvastatin calcium", "atorvastatin"],
    genericName: "Atorvastatin",
    ingredients: ["atorvastatin"],
    drugClass: "statin",
    whatItIsForBn: "রক্তে অতিরিক্ত কোলেস্টেরল কমিয়ে হার্ট অ্যাটাক ও স্ট্রোকের ঝুঁকি কমাতে ব্যবহৃত স্ট্যাটিন।",
    generalNotesBn: "সাধারণত রাতে শোয়ার আগে খাওয়া ভালো। মাংসপেশিতে তীব্র ব্যথা বা দুর্বলতা অনুভব করলে দ্রুত ডাক্তারকে জানান।",
  },
  {
    id: "cetirizine",
    aliases: ["alatrol", "cetron", "atrizin", "cetrizin", "citrosin", "rhinil", "cetirizine"],
    genericName: "Cetirizine",
    ingredients: ["cetirizine"],
    drugClass: "antihistamine",
    whatItIsForBn: "নাক দিয়ে পানি পড়া, হাঁচি, চুলকানি ও অ্যালার্জি নিরাময়ে ব্যবহৃত ২য় প্রজন্মের অ্যান্টিহিস্টামিন।",
    generalNotesBn: "কিছু মানুষের ক্ষেত্রে ঘুম ঘুম ভাব তৈরি করতে পারে; গাড়ি চালানো বা ঝুঁকিপূর্ণ কাজের সময় সতর্ক থাকুন।",
  },
  {
    id: "domperidone",
    aliases: ["motigut", "omidon", "don-a", "don a", "motidon", "domper", "domperidone"],
    genericName: "Domperidone",
    ingredients: ["domperidone"],
    drugClass: "prokinetic",
    whatItIsForBn: "বমি বমি ভাব, বমি, পেট ফাঁপা ও বদহজম দূর করতে ব্যবহৃত প্রোকাইনেটিক ওষুধ।",
    generalNotesBn: "সাধারণত খাবারের ১৫ থেকে ৩০ মিনিট আগে খেতে হয়। হৃদযন্ত্রের অস্বাভাবিক ছন্দ (arrhythmia) থাকলে আগে ডাক্তারকে জানান।",
  },
  {
    id: "ors",
    aliases: ["orsaline", "orsaline-n", "orsaline n", "or saline", "oral saline", "smc orsaline", "ors powder", "ors"],
    genericName: "Oral Rehydration Salts (ORS)",
    ingredients: ["sodium chloride", "potassium chloride", "sodium citrate", "glucose"],
    drugClass: "electrolyte",
    whatItIsForBn: "ডায়রিয়া, বমি বা তীব্র গরমে শরীরে পানির ঘাটতি ও ইলেক্ট্রোলাইট ভারসাম্যহীনতা পূরণে ব্যবহৃত খাবার স্যালাইন।",
    generalNotesBn: "নির্দিষ্ট পরিমাণ (সাধারণত ৫০০ মি.লি.) ফুটানো ঠান্ডা পানিতে পুরো প্যাকেট গুলিয়ে তৈরি করুন। কম পানিতে স্যালাইন গুলবেন না। প্রস্তুতকৃত স্যালাইন ১২ ঘণ্টার বেশি রাখবেন না।",
  },
  {
    id: "metronidazole",
    aliases: ["filmet", "flamet", "amodiadis", "metrodex", "flamyd", "amodis", "metryl", "metronidazole"],
    genericName: "Metronidazole",
    ingredients: ["metronidazole"],
    drugClass: "antiprotozoal",
    whatItIsForBn: "অ্যামিবায়াসিস, পেটের আমাশয়, দাঁতের ইনফেকশন ও অ্যানারোবিক ব্যাকটেরিয়ার সংক্রমণে ব্যবহৃত ওষুধ।",
    generalNotesBn: "এই ওষুধ চলাকালীন এবং কোর্স শেষ হওয়ার অন্তত ৪৮ থেকে ৭২ ঘণ্টা পর্যন্ত যেকোনো ধরনের অ্যালকোহল বা মদ সম্পূর্ণরূপে পরিহার করুন।",
  },
  {
    id: "salbutamol",
    aliases: ["ventolin", "asmasol", "sultolin", "salbutamol"],
    genericName: "Salbutamol",
    ingredients: ["salbutamol"],
    drugClass: "bronchodilator",
    whatItIsForBn: "হাঁপানি ও সিওপিডি (COPD) রোগীদের হঠাৎ তীব্র শ্বাসকষ্ট উপশমে দ্রুত কার্যকর ব্রঙ্কোডাইলেটর।",
    generalNotesBn: "হঠাৎ শ্বাসকষ্টের সময় ইনহেলার ব্যবহারবিধি মেনে নিন। ব্যবহারের পর হৃদস্পন্দন সাময়িক বেড়ে যেতে পারে।",
  },
  {
    id: "alcohol",
    aliases: ["alcohol", "ethanol", "wine", "beer", "whisky", "vodka", "spirits", "মদ", "অ্যালকোহল"],
    genericName: "Alcohol / Ethanol (অ্যালকোহল)",
    ingredients: ["ethanol"],
    drugClass: "substance",
    whatItIsForBn: "অ্যালকোহলযুক্ত পানীয় বা পদার্থ (পারস্পরিক প্রতিক্রিয়া পর্যালোচনার রেফারেন্স)।",
    generalNotesBn: "মেট্রোনিডাজল ও সিডেটিভ ওষুধের সাথে তীব্র বিষাক্ত প্রতিক্রিয়া সৃষ্টি করে।",
  },
];

export const drugById = (id: string) => DRUG_REFERENCE.find((d) => d.id === id);

const BN = "০১২৩৪৫৬৭৮৯";
const ascii = (s: string) => s.replace(/[০-৯]/g, (d) => String(BN.indexOf(d)));

export interface ParsedDose {
  morning: number;
  noon: number;
  night: number;
  /** Plain-Bangla reading of what the prescription says, e.g. "সকালে ১টি, রাতে ১টি". */
  readingBn: string;
}

export interface ParsedLine {
  raw: string;
  drugId: string | null; // null when the line looks like a medicine we do not recognise
  matchedAlias: string | null;
  form: string | null; // Tab / Cap / Syp / Inj / Drop / Cream as written
  strength: string | null; // as written, e.g. "500mg"
  dose: ParsedDose | null; // null = not written; never guessed
  /** Liquid/drop amount as written ("5 ml", "2 tsp", "১ চামচ"). Never converted between units. */
  measure: { amount: number; unit: "ml" | "tsp" | "spoon" | "drop"; readingBn: string } | null;
  /** Times per day when written as od/bd/tds/qid, "twice daily" or "দিনে ৩ বার". */
  timesPerDay: number | null;
  durationText: string | null;
  mealTiming: "before" | "after" | "with" | null;
  missing: string[]; // Bangla notes of what the line does not say
}

export interface ParsedPrescription {
  lines: ParsedLine[];
  recognisedCount: number;
  unrecognisedCount: number;
}

const toBnDigits = (n: number | string) => String(n).replace(/[0-9]/g, (d) => BN[Number(d)]);

function readDose(line: string): ParsedDose | null {
  const m = ascii(line).match(/(?:^|[^\d.])(\d(?:\.\d)?|½)\s*\+\s*(\d(?:\.\d)?|½)\s*\+\s*(\d(?:\.\d)?|½)(?!\s*\+)/);
  if (!m) return null;
  const val = (s: string) => (s === "½" ? 0.5 : Number(s));
  const [morning, noon, night] = [val(m[1]), val(m[2]), val(m[3])];
  if ([morning, noon, night].some((v) => !Number.isFinite(v) || v > 4)) return null;
  const parts: string[] = [];
  const fmt = (v: number) => (v === 0.5 ? "আধা" : `${toBnDigits(v)}টি`);
  if (morning) parts.push(`সকালে ${fmt(morning)}`);
  if (noon) parts.push(`দুপুরে ${fmt(noon)}`);
  if (night) parts.push(`রাতে ${fmt(night)}`);
  return { morning, noon, night, readingBn: parts.length ? parts.join(", ") : "০+০+০ লেখা আছে — ডাক্তারকে জিজ্ঞেস করুন" };
}

function readDuration(line: string): string | null {
  const t = ascii(line.toLowerCase());
  const en = t.match(/(?:x|×|for|-)\s*(\d{1,3})\s*(days?|d\b|weeks?|wks?|months?|mo\b)/);
  if (en) {
    const n = Number(en[1]);
    const unit = en[2].startsWith("d") ? "দিন" : en[2].startsWith("w") ? "সপ্তাহ" : "মাস";
    return `${toBnDigits(n)} ${unit}`;
  }
  const bn = line.match(/([০-৯0-9]{1,3})\s*(দিন|সপ্তাহ|মাস)/);
  if (bn) return `${toBnDigits(ascii(bn[1]))} ${bn[2]}`;
  if (/চলবে|continue|cont\.?\b/i.test(line)) return "চলবে (ডাক্তার বন্ধ করতে না বলা পর্যন্ত)";
  return null;
}

function readMealTiming(line: string): ParsedLine["mealTiming"] {
  const t = line.toLowerCase();
  if (/\ba\.?\s?c\.?(?![a-z])|before (?:meal|food)|খাবার(?:ের)? আগে|খালি পেটে/.test(t)) return "before";
  if (/\bp\.?\s?c\.?(?![a-z])|after (?:meal|food)|খাবার(?:ের)? পরে|ভরা পেটে/.test(t)) return "after";
  if (/with (?:meal|food)|খাবারের সাথে/.test(t)) return "with";
  return null;
}

const UNIT_BN = { ml: "মি.লি.", tsp: "চা-চামচ", spoon: "চামচ", drop: "ফোঁটা" } as const;

/** "5 ml", "2 tsp", "১ চামচ", "2 drops". A strength such as "125mg/5ml" is not a dose. */
export function readMeasure(line: string): ParsedLine["measure"] {
  const t = ascii(line.toLowerCase());
  const re = /(?:^|[^\d./])(\d{1,2}(?:\.\d)?|½)\s*(ml|tsp|teaspoons?|tea\s?spoons?|চা[- ]?চামচ|চামচ|spoons?|drops?|ফোঁটা)(?![a-z])/g;
  for (const m of t.matchAll(re)) {
    const before = t.slice(0, m.index! + m[0].length - m[1].length - m[2].length).trimEnd();
    if (before.endsWith("/")) continue;
    const amount = m[1] === "½" ? 0.5 : Number(m[1]);
    const u = m[2];
    const unit = u === "ml" ? "ml" : /^(tsp|tea)|চা/.test(u) ? "tsp" : /drop|ফোঁটা/.test(u) ? "drop" : "spoon";
    if (!(amount > 0) || amount > (unit === "ml" ? 30 : unit === "drop" ? 20 : 4)) return null;
    const amt = amount === 0.5 ? "আধা" : toBnDigits(amount);
    return { amount, unit, readingBn: `${amt} ${UNIT_BN[unit]}` };
  }
  return null;
}

/** od / bd / tds / qid, "twice daily", "3 times a day", "দিনে ৩ বার". Null when not written. */
export function readTimesPerDay(line: string): number | null {
  const t = ascii(line.toLowerCase());
  const bn = t.match(/দিনে\s*(\d)\s*(?:বার|বেলা)/);
  if (bn) return Number(bn[1]) >= 1 && Number(bn[1]) <= 6 ? Number(bn[1]) : null;
  if (/দিনে\s*(?:একবার|এক বার)/.test(t)) return 1;
  if (/দিনে\s*(?:দুইবার|দুই বার|দুবার|২ বেলা)/.test(t)) return 2;
  if (/দিনে\s*(?:তিনবার|তিন বার)/.test(t)) return 3;
  const n = t.match(/\b(\d)\s*(?:times|x)\s*(?:a|per)?\s*day\b|\b(\d)\s*times daily\b/);
  if (n) return Number(n[1] ?? n[2]);
  if (/\b(?:qid|q\.i\.d\.?|four times)\b/.test(t)) return 4;
  if (/\b(?:tds|tid|t\.i\.d\.?|t\.d\.s\.?|thrice)\b/.test(t)) return 3;
  if (/\b(?:bd|bid|b\.i\.d\.?|b\.d\.?|twice)\b/.test(t)) return 2;
  if (/\b(?:od|o\.d\.?|once daily|once a day)\b/.test(t)) return 1;
  return null;
}

const FORM_RE = /^\s*(?:rx[:.)\s]*)?(?:\d+[.)]\s*)?(tab|tablet|cap|capsule|syp|syrup|susp|inj|injection|drop|drops|cream|oint|ointment|inh|inhaler|sachet)\.?\b/i;

function findDrug(line: string): { drug: DrugItem; alias: string } | null {
  const t = ` ${line.toLowerCase().replace(/[^a-z0-9+\s]/g, " ").replace(/\s+/g, " ")} `;
  let best: { drug: DrugItem; alias: string } | null = null;
  for (const d of DRUG_REFERENCE) {
    for (const a of d.aliases) {
      const needle = ` ${a.toLowerCase().replace(/\s*\+\s*/g, " + ")} `;
      const hay = t.replace(/\s*\+\s*/g, " + ");
      // Whole-word match only, and the longest alias wins ("napa extra" beats "napa").
      if (hay.includes(needle) && (!best || a.length > best.alias.length)) best = { drug: d, alias: a };
    }
  }
  return best;
}

/** Read prescription text line by line. Only lines that look like medicine lines are returned. */
export function parsePrescriptionText(raw: string): ParsedPrescription {
  const lines: ParsedLine[] = [];
  for (const rawLine of raw.split(/\r?\n|;/)) {
    const line = rawLine.trim();
    if (!line) continue;
    const formMatch = line.match(FORM_RE);
    const hit = findDrug(line);
    if (!formMatch && !hit) continue; // not a medicine line (doctor name, advice, etc.)

    const strength = ascii(line).match(/(\d+(?:\.\d+)?\s*(?:mg|mcg|g|ml|iu|%)(?:\s*\+\s*\d+(?:\.\d+)?\s*(?:mg|mcg|g|ml))?)/i)?.[1]?.replace(/\s+/g, "") ?? null;
    const dose = readDose(line);
    const measure = readMeasure(line);
    const timesPerDay = dose ? null : readTimesPerDay(line);
    const durationText = readDuration(line);
    const mealTiming = readMealTiming(line);
    const missing: string[] = [];
    if (!hit) missing.push("এই ওষুধ আমাদের ছোট তালিকায় নেই — নাম ও কাজ ফার্মাসিস্টের কাছে নিশ্চিত হোন।");
    if (!dose && !measure && !timesPerDay) missing.push("ডোজ (যেমন ১+০+১) লেখা পাওয়া যায়নি।");
    else if (!dose && measure && !timesPerDay) missing.push("দিনে কতবার খাবেন লেখা পাওয়া যায়নি।");
    if (measure && measure.unit !== "ml") missing.push("চামচ/ফোঁটার মাপ ঘরের চামচে আন্দাজ করবেন না — ওষুধের সাথে দেওয়া মাপের কাপ/ড্রপার ব্যবহার করুন।");
    if (!durationText) missing.push("কতদিন খাবেন লেখা পাওয়া যায়নি।");
    lines.push({
      raw: line,
      drugId: hit?.drug.id ?? null,
      matchedAlias: hit?.alias ?? null,
      form: formMatch ? formMatch[1] : null,
      strength,
      dose,
      measure,
      timesPerDay,
      durationText,
      mealTiming,
      missing,
    });
  }
  const recognisedCount = lines.filter((l) => l.drugId).length;
  return { lines, recognisedCount, unrecognisedCount: lines.length - recognisedCount };
}

export type InteractionLevel = "caution" | "duplicate" | "no-data";

export interface InteractionNote {
  level: InteractionLevel;
  titleBn: string;
  adviceBn: string;
  drugIds: [string, string];
}

// Small, reviewed list of well-documented pairs. Anything not here returns "no-data".
const PAIR_RULES: { a: string | DrugClass; b: string | DrugClass; titleBn: string; adviceBn: string }[] = [
  {
    a: "azithromycin",
    b: "antacid",
    titleBn: "অ্যান্টাসিড অ্যান্টিবায়োটিকের শোষণ কমাতে পারে",
    adviceBn: "অ্যাজিথ্রোমাইসিনের প্রোডাক্ট লিফলেটে অ্যালুমিনিয়াম/ম্যাগনেসিয়ামযুক্ত অ্যান্টাসিড একই সময়ে না খেতে বলা হয়। কতক্ষণ ব্যবধান রাখবেন তা ফার্মাসিস্টের কাছে নিশ্চিত হোন।",
  },
  {
    a: "ciprofloxacin",
    b: "antacid",
    titleBn: "অ্যান্টাসিড সিপ্রোফ্লক্সাসিনের শোষণ উল্লেখযোগ্যভাবে কমিয়ে দেয় (চিলেশন ঝুঁকি)",
    adviceBn: "অ্যালুমিনিয়াম বা ম্যাগনেসিয়ামযুক্ত অ্যান্টাসিড সিপ্রোফ্লক্সাসিনের সাথে চিলেশন (রাসায়নিক বন্ধন) তৈরি করে রক্তে এর শোষণ ৯০% পর্যন্ত কমিয়ে দেয়। অ্যান্টাসিড খাওয়ার অন্তত ২ ঘণ্টা আগে বা ৪-৬ ঘণ্টা পরে সিপ্রোফ্লক্সাসিন খান।",
  },
  {
    a: "metronidazole",
    b: "alcohol",
    titleBn: "মেট্রোনিডাজল ও অ্যালকোহলে মারাত্মক বিষক্রিয়ার ঝুঁকি (ডাইসালফিরাম-সদৃশ প্রতিক্রিয়া)",
    adviceBn: "মেট্রোনিডাজল চলাকালীন এবং কোর্স শেষ হওয়ার অন্তত ৪৮–৭২ ঘণ্টা পর্যন্ত কোনো ধরনের অ্যালকোহল/মদ গ্রহণ সম্পূর্ণরূপে নিষেধ। ডাইসালফিরাম-সদৃশ প্রতিক্রিয়ায় তীব্র বমি, অসহ্য মাথাব্যথা, বুক ধড়ফড় ও রক্তচাপ কমে যেতে পারে।",
  },
  {
    a: "ciprofloxacin",
    b: "azithromycin",
    titleBn: "হৃদযন্ত্রের কিউটি (QT) ব্যবধান বাড়ার ঝুঁকি",
    adviceBn: "উভয় অ্যান্টিবায়োটিকই হৃদযন্ত্রের বৈদ্যুতিক ছন্দ (QT Interval) দীর্ঘায়িত করতে পারে। একসাথে সেবনে অ্যারিথমিয়ার ঝুঁকি বাড়ে। বুক ধড়ফড় করলে অবিলম্বে চিকিৎসকের পরামর্শ নিন।",
  },
];

const matches = (d: DrugItem, key: string | DrugClass) => d.id === key || d.drugClass === key;

export function checkPair(idA: string, idB: string): InteractionNote {
  const a = drugById(idA);
  const b = drugById(idB);
  const pair: [string, string] = [idA, idB];
  if (!a || !b) {
    return { level: "no-data", titleBn: "তথ্য নেই", adviceBn: "এই ওষুধ আমাদের তালিকায় নেই।", drugIds: pair };
  }
  if (a.id === b.id) {
    return { level: "duplicate", titleBn: "একই ওষুধ দুবার", adviceBn: "একই ওষুধ দুবার নির্বাচন করা হয়েছে। প্রেসক্রিপশনে দুবার থাকলে ডাক্তার বা ফার্মাসিস্টকে জিজ্ঞেস করুন।", drugIds: pair };
  }
  const shared = a.ingredients.filter((i) => b.ingredients.includes(i));
  if (shared.length) {
    return {
      level: "duplicate",
      titleBn: `একই উপাদান দুটিতেই আছে (${shared.join(", ")})`,
      adviceBn: "দুটি ভিন্ন নামের ওষুধে একই উপাদান থাকলে মোট মাত্রা বেশি হয়ে যেতে পারে। একসাথে খাওয়ার আগে ডাক্তার বা ফার্মাসিস্টকে জিজ্ঞেস করুন।",
      drugIds: pair,
    };
  }
  if (a.drugClass === b.drugClass && a.drugClass === "ppi") {
    return {
      level: "duplicate",
      titleBn: "একই ধরনের দুটি অ্যাসিড-কমানোর ওষুধ (PPI)",
      adviceBn: "সাধারণত একসাথে দুটি PPI দেওয়া হয় না। ভুল করে দুটি কিনেছেন কি না ফার্মাসিস্টকে দেখান।",
      drugIds: pair,
    };
  }
  for (const r of PAIR_RULES) {
    if ((matches(a, r.a) && matches(b, r.b)) || (matches(a, r.b) && matches(b, r.a))) {
      return { level: "caution", titleBn: r.titleBn, adviceBn: r.adviceBn, drugIds: pair };
    }
  }
  return {
    level: "no-data",
    titleBn: "আমাদের তালিকায় এই জোড়ার তথ্য নেই",
    adviceBn: "এর মানে এই নয় যে একসাথে খাওয়া নিরাপদ। আমাদের তালিকা খুব ছোট। ফার্মাসিস্ট বা ডাক্তারের কাছে নিশ্চিত হোন।",
    drugIds: pair,
  };
}

/** Check every pair among recognised medicines; returns only findings (duplicate/caution). */
export function checkAllPairs(ids: string[]): InteractionNote[] {
  const uniq = [...new Set(ids)];
  const out: InteractionNote[] = [];
  const dupIds = ids.filter((id, i) => ids.indexOf(id) !== i);
  for (const id of new Set(dupIds)) out.push(checkPair(id, id));
  for (let i = 0; i < uniq.length; i++) {
    for (let j = i + 1; j < uniq.length; j++) {
      const n = checkPair(uniq[i], uniq[j]);
      if (n.level !== "no-data") out.push(n);
    }
  }
  return out;
}

export type InteractionSeverity = "critical" | "warning" | "info" | "no-data";

export interface InteractionResult {
  pair: [string, string];
  severity: InteractionSeverity;
  mechanism: string;
  recommendation: string;
  titleBn?: string;
  adviceBn?: string;
}

/**
 * Validates clinical interactions across provided drugs.
 * Invariant: Unknown pairs return severity: "no-data", NEVER "safe".
 */
export function checkInteractions(drugs: (DrugItem | string)[]): InteractionResult[] {
  const resolved = drugs
    .map((d) => (typeof d === "string" ? drugById(d) : d))
    .filter((d): d is DrugItem => !!d);

  const results: InteractionResult[] = [];
  if (resolved.length < 2) return results;

  for (let i = 0; i < resolved.length; i++) {
    for (let j = i + 1; j < resolved.length; j++) {
      const a = resolved[i];
      const b = resolved[j];
      const pair: [string, string] = [a.id, b.id];

      // 1. Same drug
      if (a.id === b.id) {
        results.push({
          pair,
          severity: "warning",
          mechanism: "Duplicate prescription of identical active ingredient",
          recommendation: "Avoid duplicate dosing of identical medicines to prevent toxicity.",
          titleBn: "একই ওষুধ দুবার",
          adviceBn: "একই ওষুধ দুবার নির্বাচন করা হয়েছে। প্রেসক্রিপশনে দুবার থাকলে ডাক্তার বা ফার্মাসিস্টকে জিজ্ঞেস করুন।",
        });
        continue;
      }

      // 2. Shared ingredients
      const shared = a.ingredients.filter((x) => b.ingredients.includes(x));
      if (shared.length > 0) {
        results.push({
          pair,
          severity: "warning",
          mechanism: `Shared active ingredients: ${shared.join(", ")}`,
          recommendation: "Monitor cumulative dose to avoid accidental overdose.",
          titleBn: `একই উপাদান দুটিতেই আছে (${shared.join(", ")})`,
          adviceBn: "দুটি ভিন্ন নামের ওষুধে একই উপাদান থাকলে মোট মাত্রা বেশি হয়ে যেতে পারে। একসাথে খাওয়ার আগে ডাক্তার বা ফার্মাসিস্টকে জিজ্ঞেস করুন।",
        });
        continue;
      }

      // 3. Duplicate PPI
      if (a.drugClass === "ppi" && b.drugClass === "ppi") {
        results.push({
          pair,
          severity: "warning",
          mechanism: "Concurrent therapy with multiple proton pump inhibitors (PPIs)",
          recommendation: "Multiple PPIs are rarely indicated concurrently; verify with prescriber.",
          titleBn: "একই ধরনের দুটি অ্যাসিড-কমানোর ওষুধ (PPI)",
          adviceBn: "সাধারণত একসাথে দুটি PPI দেওয়া হয় না। ভুল করে দুটি কিনেছেন কি না ফার্মাসিস্টকে দেখান।",
        });
        continue;
      }

      // 4. Metronidazole + Alcohol (disulfiram-like reaction - CRITICAL)
      const isMetro = a.id === "metronidazole" || b.id === "metronidazole";
      const isAlcohol = a.id === "alcohol" || b.id === "alcohol";
      if (isMetro && isAlcohol) {
        results.push({
          pair,
          severity: "critical",
          mechanism: "Disulfiram-like reaction caused by metronidazole inhibiting aldehyde dehydrogenase, resulting in toxic acetaldehyde accumulation.",
          recommendation: "Strictly avoid all alcohol consumption during metronidazole therapy and for 48-72 hours after completion.",
          titleBn: "মেট্রোনিডাজল ও অ্যালকোহলে মারাত্মক বিষক্রিয়ার ঝুঁকি (ডাইসালফিরাম-সদৃশ প্রতিক্রিয়া)",
          adviceBn: "মেট্রোনিডাজল চলাকালীন এবং কোর্স শেষ হওয়ার অন্তত ৪৮–৭২ ঘণ্টা পর্যন্ত কোনো ধরনের অ্যালকোহল/মদ গ্রহণ সম্পূর্ণরূপে নিষেধ। ডাইসালফিরাম-সদৃশ প্রতিক্রিয়ায় তীব্র বমি, অসহ্য মাথাব্যথা, বুক ধড়ফড় ও রক্তচাপ কমে যেতে পারে।",
        });
        continue;
      }

      // 5. Ciprofloxacin + Antacids (chelation risk)
      const isCipro = a.id === "ciprofloxacin" || b.id === "ciprofloxacin";
      const isAntacid = a.drugClass === "antacid" || b.drugClass === "antacid";
      if (isCipro && isAntacid) {
        results.push({
          pair,
          severity: "warning",
          mechanism: "Chelation of ciprofloxacin by polyvalent cations (Al3+, Mg2+) in antacids, markedly reducing oral bioavailability.",
          recommendation: "Administer ciprofloxacin at least 2 hours before or 4-6 hours after taking antacids.",
          titleBn: "অ্যান্টাসিড সিপ্রোফ্লক্সাসিনের শোষণ উল্লেখযোগ্যভাবে কমিয়ে দেয় (চিলেশন ঝুঁকি)",
          adviceBn: "অ্যালুমিনিয়াম বা ম্যাগনেসিয়ামযুক্ত অ্যান্টাসিড সিপ্রোফ্লক্সাসিনের সাথে চিলেশন তৈরি করে রক্তে এর শোষণ ৯০% পর্যন্ত কমিয়ে দেয়। অ্যান্টাসিড খাওয়ার অন্তত ২ ঘণ্টা আগে বা ৪-৬ ঘণ্টা পরে সিপ্রোফ্লক্সাসিন খান।",
        });
        continue;
      }

      // 6. Azithromycin + Antacid
      const isAzithro = a.id === "azithromycin" || b.id === "azithromycin";
      if (isAzithro && isAntacid) {
        results.push({
          pair,
          severity: "warning",
          mechanism: "Aluminium and magnesium antacids reduce peak serum concentration (Cmax) of azithromycin.",
          recommendation: "Separate administration times or consult pharmacist.",
          titleBn: "অ্যান্টাসিড অ্যান্টিবায়োটিকের শোষণ কমাতে পারে",
          adviceBn: "অ্যাজিথ্রোমাইসিনের প্রোডাক্ট লিফলেটে অ্যালুমিনিয়াম/ম্যাগনেসিয়ামযুক্ত অ্যান্টাসিড একই সময়ে না খেতে বলা হয়। কতক্ষণ ব্যবধান রাখবেন তা ফার্মাসিস্টের কাছে নিশ্চিত হোন।",
        });
        continue;
      }

      // 7. Ciprofloxacin + Azithromycin (QT Prolongation)
      if (isCipro && isAzithro) {
        results.push({
          pair,
          severity: "warning",
          mechanism: "Additive prolongation of the QT interval, increasing the risk of cardiac arrhythmias.",
          recommendation: "Use with caution in patients with cardiac risk factors; monitor ECG or consult prescriber.",
          titleBn: "হৃদযন্ত্রের কিউটি (QT) ব্যবধান বাড়ার ঝুঁকি",
          adviceBn: "উভয় অ্যান্টিবায়োটিকই হৃদযন্ত্রের বৈদ্যুতিক ছন্দ (QT Interval) দীর্ঘায়িত করতে পারে। একসাথে সেবনে অ্যারিথমিয়ার ঝুঁকি বাড়ে। বুক ধড়ফড় করলে অবিলম্বে চিকিৎসকের পরামর্শ নিন।",
        });
        continue;
      }

      // 8. Unknown pair (Strictly "no-data", never "safe")
      results.push({
        pair,
        severity: "no-data",
        mechanism: "No documented interaction in reference catalog.",
        recommendation: "Lack of recorded interaction in our reference database does not mean combination is safe. Always consult a licensed doctor or pharmacist.",
        titleBn: "আমাদের তালিকায় এই জোড়ার তথ্য নেই",
        adviceBn: "এর মানে এই নয় যে একসাথে খাওয়া নিরাপদ। আমাদের তালিকা খুব ছোট। ফার্মাসিস্ট বা ডাক্তারের কাছে নিশ্চিত হোন।",
      });
    }
  }

  return results;
}

export interface RedFlag {
  id: string;
  matched: string;
  messageBn: string;
}

// Symptoms that need urgent in-person care. Matching is deliberately broad: a false alarm
// costs a moment of reading; a missed emergency costs much more.
const RED_FLAGS: { id: string; terms: string[]; messageBn: string }[] = [
  { id: "chest", terms: ["chest pain", "বুকে ব্যথা", "বুক ব্যথা", "বুকে চাপ"], messageBn: "বুকে ব্যথা বা চাপ হার্টের সমস্যার লক্ষণ হতে পারে।" },
  { id: "breath", terms: ["shortness of breath", "can't breathe", "cannot breathe", "breathing difficulty", "শ্বাসকষ্ট", "শ্বাস নিতে পারছি না", "দম বন্ধ"], messageBn: "তীব্র শ্বাসকষ্ট জরুরি অবস্থা।" },
  { id: "unconscious", terms: ["unconscious", "fainted", "অজ্ঞান", "জ্ঞান হারা"], messageBn: "কেউ অজ্ঞান হলে দ্রুত চিকিৎসা দরকার।" },
  { id: "seizure", terms: ["seizure", "convulsion", "fits", "খিঁচুনি"], messageBn: "খিঁচুনি জরুরি চিকিৎসার প্রয়োজন হতে পারে।" },
  { id: "stroke", terms: ["face drooping", "slurred speech", "মুখ বেঁকে", "কথা জড়িয়ে", "এক পাশ অবশ", "হাত পা অবশ"], messageBn: "মুখ বেঁকে যাওয়া, কথা জড়ানো বা এক পাশ অবশ — স্ট্রোকের লক্ষণ হতে পারে। প্রতিটি মিনিট গুরুত্বপূর্ণ।" },
  { id: "bleeding", terms: ["vomiting blood", "blood in vomit", "রক্তবমি", "রক্ত বমি", "কালো পায়খানা", "heavy bleeding", "অনেক রক্ত"], messageBn: "রক্তবমি বা অতিরিক্ত রক্তপাত জরুরি অবস্থা।" },
  { id: "allergy", terms: ["swollen lips", "throat swelling", "ঠোঁট ফুলে", "গলা ফুলে", "জিহ্বা ফুলে"], messageBn: "ঠোঁট/গলা ফুলে যাওয়া তীব্র অ্যালার্জির লক্ষণ হতে পারে।" },
  { id: "overdose", terms: ["overdose", "too many tablets", "বেশি ওষুধ খেয়ে", "অনেকগুলো ট্যাবলেট খেয়ে", "ভুল করে বেশি"], messageBn: "বেশি ওষুধ খেয়ে ফেললে উপসর্গ না থাকলেও এখনই চিকিৎসকের পরামর্শ নিন।" },
  { id: "selfharm", terms: ["suicide", "kill myself", "self harm", "আত্মহত্যা", "নিজেকে শেষ", "মরে যেতে চাই"], messageBn: "আপনি একা নন। এখনই কাছের কাউকে জানান এবং জরুরি সাহায্য নিন।" },
];

export function detectRedFlags(text: string): RedFlag[] {
  const t = text.toLowerCase();
  const out: RedFlag[] = [];
  for (const f of RED_FLAGS) {
    const hit = f.terms.find((term) => t.includes(term.toLowerCase()));
    if (hit) out.push({ id: f.id, matched: hit, messageBn: f.messageBn });
  }
  return out;
}

export interface PriceQuote {
  label: string; // brand or pharmacy as the user wrote it
  pricePerUnit: number; // BDT, entered by the user
}

/** Compare prices the user was quoted for the same generic and strength. */
export function comparePrices(quotes: PriceQuote[], unitsNeeded: number) {
  const valid = quotes.filter((q) => Number.isFinite(q.pricePerUnit) && q.pricePerUnit > 0 && q.label.trim());
  if (valid.length < 2 || !(unitsNeeded > 0)) return null;
  const sorted = [...valid].sort((a, b) => a.pricePerUnit - b.pricePerUnit);
  const cheapest = sorted[0];
  const dearest = sorted[sorted.length - 1];
  const r2 = (n: number) => Math.round(n * 100) / 100;
  return {
    cheapest,
    dearest,
    courseCostCheapest: r2(cheapest.pricePerUnit * unitsNeeded),
    courseCostDearest: r2(dearest.pricePerUnit * unitsNeeded),
    savingBdt: r2((dearest.pricePerUnit - cheapest.pricePerUnit) * unitsNeeded),
    savingPct: Math.round(((dearest.pricePerUnit - cheapest.pricePerUnit) / dearest.pricePerUnit) * 100),
  };
}

/** Units needed for a course, from the dose written on the prescription. */
export function unitsForCourse(dose: ParsedDose | null, durationText: string | null): number | null {
  if (!dose || !durationText) return null;
  const m = ascii(durationText).match(/(\d+)\s*(দিন|সপ্তাহ|মাস)/);
  if (!m) return null;
  const days = Number(m[1]) * (m[2] === "সপ্তাহ" ? 7 : m[2] === "মাস" ? 30 : 1);
  const perDay = dose.morning + dose.noon + dose.night;
  return perDay > 0 ? Math.ceil(perDay * days) : null;
}

/** Days in a written course ("৫ দিন", "২ সপ্তাহ"). Null for "চলবে" or when not written. */
export function courseDays(durationText: string | null): number | null {
  if (!durationText) return null;
  const m = ascii(durationText).match(/(\d+)\s*(দিন|সপ্তাহ|মাস)/);
  if (!m) return null;
  return Number(m[1]) * (m[2] === "সপ্তাহ" ? 7 : m[2] === "মাস" ? 30 : 1);
}

export type Slot = "morning" | "noon" | "night";
export const SLOT_BN: Record<Slot, string> = { morning: "সকাল", noon: "দুপুর", night: "রাত" };

export interface ScheduleEntry {
  slot: Slot;
  lineIndex: number;
  label: string; // medicine as written
  amountBn: string; // "১টি", "আধা", "৫ মি.লি."
  mealTiming: ParsedLine["mealTiming"];
  days: number | null;
}

/**
 * Daily timetable built only from X+X+X doses on the prescription. Lines written as "bd"/"tds"
 * are listed separately in `unscheduled`: which hours those mean is the doctor's or
 * pharmacist's call, so we do not assign them to slots.
 */
export function buildSchedule(p: ParsedPrescription): { entries: ScheduleEntry[]; unscheduled: number[] } {
  const entries: ScheduleEntry[] = [];
  const unscheduled: number[] = [];
  p.lines.forEach((l, i) => {
    // Show the medicine name as the prescription spells it, not our lowercase lookup alias.
    const asWritten = l.matchedAlias
      ? l.raw.match(new RegExp(l.matchedAlias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s*\\\+\s*/g, "\\s*\\+\\s*"), "i"))?.[0] ?? l.matchedAlias
      : null;
    const label = asWritten ? `${l.form ? l.form + " " : ""}${asWritten}${l.strength ? " " + l.strength : ""}` : l.raw.slice(0, 60);
    if (!l.dose) {
      if (l.measure || l.timesPerDay) unscheduled.push(i);
      return;
    }
    for (const slot of ["morning", "noon", "night"] as Slot[]) {
      const v = l.dose[slot];
      if (!v) continue;
      const amountBn = l.measure ? l.measure.readingBn : v === 0.5 ? "আধা" : `${toBnDigits(v)}টি`;
      entries.push({ slot, lineIndex: i, label, amountBn, mealTiming: l.mealTiming, days: courseDays(l.durationText) });
    }
  });
  return { entries, unscheduled };
}

/**
 * Daily repeating reminders (RFC 5545) at the times the user chose. Courses with a written
 * length repeat that many days; "continue" courses repeat for `openEndedDays` and say so.
 */
export function scheduleToIcs(
  entries: ScheduleEntry[],
  times: Record<Slot, string>, // "HH:MM", local
  startDate: string, // YYYY-MM-DD
  opts: { stamp?: string; openEndedDays?: number } = {},
): string {
  const stamp = opts.stamp ?? "20260101T000000Z";
  const openEnded = opts.openEndedDays ?? 30;
  const esc = (s: string) => s.replace(/[\\;,]/g, (c) => "\\" + c).replace(/\n/g, "\\n");
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//KormoPath//MediScan//BN", "CALSCALE:GREGORIAN"];
  const meal = { before: " (খাবারের আগে)", after: " (খাবারের পরে)", with: " (খাবারের সাথে)" } as const;
  entries.forEach((e, n) => {
    const time = /^([01]\d|2[0-3]):[0-5]\d$/.test(times[e.slot]) ? times[e.slot] : "08:00";
    const count = e.days ?? openEnded;
    const note = e.days ? `${toBnDigits(e.days)} দিনের কোর্স।` : `কোর্সের দৈর্ঘ্য লেখা নেই — ${toBnDigits(openEnded)} দিনের রিমাইন্ডার; ডাক্তারের পরামর্শমতো চালিয়ে যান বা বন্ধ করুন।`;
    lines.push(
      "BEGIN:VEVENT",
      `UID:${startDate}-${e.lineIndex}-${e.slot}-${n}@mediscan.kormopath`,
      `DTSTAMP:${stamp}`,
      `DTSTART:${startDate.replace(/-/g, "")}T${time.replace(":", "")}00`,
      "DURATION:PT10M",
      `RRULE:FREQ=DAILY;COUNT=${count}`,
      `SUMMARY:${esc(`ওষুধ: ${e.label} — ${e.amountBn}${e.mealTiming ? meal[e.mealTiming] : ""}`)}`,
      `DESCRIPTION:${esc(`${note} এটি শুধু মনে করিয়ে দেওয়ার জন্য; ডোজ প্রেসক্রিপশন থেকে নেওয়া। সন্দেহ হলে ডাক্তার/ফার্মাসিস্টকে জিজ্ঞেস করুন।`)}`,
      "BEGIN:VALARM", "TRIGGER:PT0M", "ACTION:DISPLAY", `DESCRIPTION:${esc(e.label)}`, "END:VALARM",
      "END:VEVENT",
    );
  });
  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}
