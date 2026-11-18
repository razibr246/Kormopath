/*
 * MaathSathi (মাঠসাথী) — the farmer's field companion. Pure and deterministic, NO imports, so every
 * rule here is unit-tested (tests/krishi.test.ts).
 *
 * What lives here: land-unit conversion, crop budgets in integer poisha, rotation checks by botanical
 * family, task buckets, a Bangla voice-to-task parser (always confirmed by the farmer before saving),
 * SMS length/encoding, livestock/poultry/fish records, the Crop Doctor confidence verdict, farmer-entered
 * harvest records and the farm record export (season summary + farmOS-shaped JSON logs).
 *
 * What never lives here: prices, yields, sowing dates, subsidy amounts or any pesticide/medicine dose.
 * Those are entered by the farmer (with where they heard it) or come from a sourced reference in
 * lib/krishiData.ts. Chemical questions always go to the product label and Krishi Call Centre 16123.
 */

// ---------------------------------------------------------------- land units
export type LandUnit = "decimal" | "acre" | "hectare" | "bigha";

/** 1 acre = 100 decimals (শতাংশ) exactly; 1 hectare = 2.4710538 acres. A bigha differs by region, so its size is the farmer's. */
export const DECIMALS_PER_ACRE = 100;
export const ACRES_PER_HECTARE = 2.4710538;
export const DEFAULT_BIGHA_DECIMALS = 33; // common in much of Bangladesh; the farmer can change it

export function toDecimals(value: number, unit: LandUnit, bighaDecimals = DEFAULT_BIGHA_DECIMALS): number {
  if (!Number.isFinite(value) || value < 0) throw new Error("জমির পরিমাণ শূন্য বা তার বেশি একটি সংখ্যা দিন।");
  if (unit === "bigha" && (!Number.isFinite(bighaDecimals) || bighaDecimals <= 0 || bighaDecimals > 200)) throw new Error("এক বিঘা কত শতাংশ, তা ঠিকভাবে দিন।");
  const d = unit === "decimal" ? value : unit === "acre" ? value * DECIMALS_PER_ACRE : unit === "hectare" ? value * ACRES_PER_HECTARE * DECIMALS_PER_ACRE : value * bighaDecimals;
  return Math.round(d * 100) / 100;
}

export function fromDecimals(decimals: number, unit: LandUnit, bighaDecimals = DEFAULT_BIGHA_DECIMALS): number {
  const v = unit === "decimal" ? decimals : unit === "acre" ? decimals / DECIMALS_PER_ACRE : unit === "hectare" ? decimals / DECIMALS_PER_ACRE / ACRES_PER_HECTARE : decimals / bighaDecimals;
  return Math.round(v * 1000) / 1000;
}

// ---------------------------------------------------------------- plots
export type LandLevel = "high" | "medium" | "low";
export type WaterSource = "rain" | "deep-tubewell" | "shallow-tubewell" | "canal-river" | "pond" | "other";

export interface Plot {
  id: string;
  name: string;
  decimals: number;
  level: LandLevel;
  water: WaterSource;
  /** Crops grown on this plot, oldest first, as the farmer remembers them. */
  history: Array<{ season: string; cropId: string }>;
  /** The farmer's own soil-test numbers (from an SRDI card or kit), never filled in by the app. */
  soilTest?: { ph?: number; organicMatterPct?: number; tested?: string };
}

export function totalDecimals(plots: Pick<Plot, "decimals">[]): number {
  return Math.round(plots.reduce((a, p) => a + (Number.isFinite(p.decimals) && p.decimals > 0 ? p.decimals : 0), 0) * 100) / 100;
}

/** Holding class used in Bangladesh agricultural statistics (by decimals). */
export function holdingClass(decimals: number): "landless" | "marginal" | "small" | "medium" | "large" {
  if (decimals < 5) return "landless";
  if (decimals < 50) return "marginal";
  if (decimals < 250) return "small";
  if (decimals < 750) return "medium";
  return "large";
}

// ---------------------------------------------------------------- money (integer poisha)
/** Taka to integer poisha; rejects negatives and more than two decimals. */
export function toPoisha(taka: number): number {
  if (!Number.isFinite(taka) || taka < 0) throw new Error("টাকার পরিমাণ শূন্য বা তার বেশি দিন।");
  const p = Math.round((taka + Number.EPSILON) * 100);
  if (Math.abs(taka * 100 - p) > 1e-6) throw new Error("টাকায় সর্বোচ্চ দুই ঘর দশমিক দিন।");
  return p;
}
export const fromPoisha = (p: number) => p / 100;

export interface CostLine { label: string; poisha: number }
export interface CropBudgetInput {
  costs: CostLine[];
  /** The farmer's own expected harvest in kg (never a default yield). */
  expectedKg: number;
  /** The price the farmer expects per kg, in poisha (their own quote). */
  pricePerKgPoisha: number;
  decimals: number;
}
export interface CropBudget {
  totalCostPoisha: number;
  revenuePoisha: number;
  profitPoisha: number;
  /** Lowest price per kg (rounded up to the poisha) at which the farmer does not lose money. */
  breakEvenPerKgPoisha: number | null;
  costPerDecimalPoisha: number | null;
  /** Reconciliation: revenue - sum(costs) === profit, to the poisha. */
  reconciles: boolean;
}

export function cropBudget(i: CropBudgetInput): CropBudget {
  for (const c of i.costs) if (!Number.isInteger(c.poisha) || c.poisha < 0) throw new Error(`"${c.label}" খরচ সঠিক নয়।`);
  if (!Number.isFinite(i.expectedKg) || i.expectedKg < 0) throw new Error("আশা করা ফলন শূন্য বা তার বেশি কেজিতে দিন।");
  if (!Number.isInteger(i.pricePerKgPoisha) || i.pricePerKgPoisha < 0) throw new Error("প্রতি কেজির দাম সঠিক নয়।");
  const totalCostPoisha = i.costs.reduce((a, c) => a + c.poisha, 0);
  const revenuePoisha = Math.round(i.expectedKg * i.pricePerKgPoisha);
  const profitPoisha = revenuePoisha - totalCostPoisha;
  return {
    totalCostPoisha,
    revenuePoisha,
    profitPoisha,
    breakEvenPerKgPoisha: i.expectedKg > 0 ? Math.ceil(totalCostPoisha / i.expectedKg) : null,
    costPerDecimalPoisha: i.decimals > 0 ? Math.round(totalCostPoisha / i.decimals) : null,
    reconciles: revenuePoisha - i.costs.reduce((a, c) => a + c.poisha, 0) === profitPoisha,
  };
}

// ---------------------------------------------------------------- crop rotation (botanical families)
export type CropFamily = "cereal" | "legume" | "brassica" | "nightshade" | "allium" | "cucurbit" | "fibre" | "fruit-tree" | "other";

/** Botanical family per crop id (Poaceae, Fabaceae, Brassicaceae, Solanaceae, Amaryllidaceae, Cucurbitaceae, Malvaceae). */
export const CROP_FAMILY: Record<string, CropFamily> = {
  rice: "cereal", wheat: "cereal", maize: "cereal",
  lentil: "legume", mungbean: "legume", grasspea: "legume", chickpea: "legume", blackgram: "legume", soybean: "legume", groundnut: "legume",
  mustard: "brassica", cabbage: "brassica", cauliflower: "brassica", radish: "brassica",
  potato: "nightshade", tomato: "nightshade", brinjal: "nightshade", chilli: "nightshade",
  onion: "allium", garlic: "allium",
  pumpkin: "cucurbit", gourd: "cucurbit", cucumber: "cucurbit",
  jute: "fibre",
  mango: "fruit-tree",
  sesame: "other", sunflower: "other",
};

export const FARM_CROPS: Array<{ id: string; bn: string }> = [
  { id: "rice", bn: "ধান" }, { id: "wheat", bn: "গম" }, { id: "maize", bn: "ভুট্টা" },
  { id: "lentil", bn: "মসুর" }, { id: "mungbean", bn: "মুগ" }, { id: "grasspea", bn: "খেসারি" }, { id: "chickpea", bn: "ছোলা" }, { id: "blackgram", bn: "মাষকলাই" }, { id: "soybean", bn: "সয়াবিন" }, { id: "groundnut", bn: "চিনাবাদাম" },
  { id: "mustard", bn: "সরিষা" }, { id: "cabbage", bn: "বাঁধাকপি" }, { id: "cauliflower", bn: "ফুলকপি" }, { id: "radish", bn: "মুলা" },
  { id: "potato", bn: "আলু" }, { id: "tomato", bn: "টমেটো" }, { id: "brinjal", bn: "বেগুন" }, { id: "chilli", bn: "মরিচ" },
  { id: "onion", bn: "পেঁয়াজ" }, { id: "garlic", bn: "রসুন" },
  { id: "pumpkin", bn: "মিষ্টিকুমড়া" }, { id: "gourd", bn: "লাউ" }, { id: "cucumber", bn: "শসা" },
  { id: "jute", bn: "পাট" }, { id: "sesame", bn: "তিল" }, { id: "sunflower", bn: "সূর্যমুখী" }, { id: "mango", bn: "আম" },
];

export const cropBn = (id: string) => FARM_CROPS.find((c) => c.id === id)?.bn ?? id;

export interface RotationCheck {
  seasons: number;
  distinctFamilies: number;
  /** Longest run of consecutive seasons from the same family (excluding paddy-after-paddy, reported separately). */
  longestSameFamilyRun: number;
  sameFamilyFamily: CropFamily | null;
  legumeInLast3: boolean;
  /** 0–100: more families, a legume and short same-family runs score higher. A guide, not a yield forecast. */
  diversityScore: number;
  notesBn: string[];
}

export function rotationCheck(history: Array<{ cropId: string }>): RotationCheck {
  const fams = history.map((h) => CROP_FAMILY[h.cropId] ?? "other");
  let best = 0, run = 0, bestFam: CropFamily | null = null;
  for (let k = 0; k < fams.length; k++) {
    run = k > 0 && fams[k] === fams[k - 1] ? run + 1 : 1;
    if (run > best) { best = run; bestFam = fams[k]; }
  }
  const distinct = new Set(fams).size;
  const legumeInLast3 = fams.slice(-3).includes("legume");
  const notes: string[] = [];
  if (!history.length) notes.push("এই জমিতে আগের মৌসুমগুলোতে কী ছিল, লিখে রাখুন। তাহলে পরিকল্পনা আরও কাজের হবে।");
  if (best >= 3 && bestFam === "cereal") notes.push("টানা কয়েক মৌসুম শুধু দানাশস্য (ধান/গম/ভুট্টা) হচ্ছে। মাঝে একটি ডাল ফসল রাখলে মাটির জৈব নাইট্রোজেন বাড়ে।");
  else if (best >= 2 && bestFam && bestFam !== "cereal" && bestFam !== "fruit-tree") notes.push(`একই গোত্রের ফসল টানা ${best} বার — একই রোগ-পোকা জমিতে থেকে যেতে পারে। পরের মৌসুমে অন্য গোত্রের ফসল ভাবুন।`);
  if (history.length >= 2 && !legumeInLast3) notes.push("শেষ তিন মৌসুমে কোনো ডাল ফসল (মসুর, মুগ, খেসারি, মাষকলাই) নেই।");
  const score = history.length ? Math.max(0, Math.min(100, Math.round(25 * Math.min(distinct, 3) + (legumeInLast3 ? 25 : 0) - 10 * Math.max(0, best - 2)))) : 0;
  return { seasons: history.length, distinctFamilies: distinct, longestSameFamilyRun: best, sameFamilyFamily: bestFam, legumeInLast3, diversityScore: score, notesBn: notes };
}

// ---------------------------------------------------------------- dates and tasks
/** A real calendar date: 2026-02-30 is rejected (Date.parse alone would roll it over to March). */
export const isIsoDate = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s + "T00:00:00Z")) && new Date(s + "T00:00:00Z").toISOString().startsWith(s);

export function addDays(iso: string, days: number): string {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function daysBetween(fromIso: string, toIso: string): number {
  return Math.round((Date.parse(toIso + "T00:00:00Z") - Date.parse(fromIso + "T00:00:00Z")) / 86_400_000);
}

export type TaskKind = "irrigate" | "fertilise" | "spray" | "weed" | "sow" | "harvest" | "market" | "animal" | "fish" | "other";

export interface FarmTask {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  kind: TaskKind;
  plotId?: string;
  done: boolean;
}

export function taskBuckets(tasks: FarmTask[], today: string) {
  const open = tasks.filter((t) => !t.done && isIsoDate(t.date)).sort((a, b) => a.date.localeCompare(b.date));
  return {
    overdue: open.filter((t) => t.date < today),
    today: open.filter((t) => t.date === today),
    upcoming: open.filter((t) => t.date > today && daysBetween(today, t.date) <= 7),
    later: open.filter((t) => daysBetween(today, t.date) > 7),
    done: tasks.filter((t) => t.done).length,
  };
}

/** Weather-aware warnings for today's tasks. `sprayOk` comes from lib/haatbazar.ts sprayWindow(). */
export function taskWeatherWarnings(todayTasks: FarmTask[], weather: { sprayOk: boolean; rainLikely: boolean } | null): Array<{ taskId: string; bn: string }> {
  if (!weather) return [];
  const out: Array<{ taskId: string; bn: string }> = [];
  for (const t of todayTasks) {
    if (t.kind === "spray" && !weather.sprayOk) out.push({ taskId: t.id, bn: "পূর্বাভাস অনুযায়ী এখন স্প্রে করার উপযোগী সময় নয়। বৃষ্টি বা বাতাস কমলে করুন।" });
    if ((t.kind === "irrigate" || t.kind === "fertilise") && weather.rainLikely) out.push({ taskId: t.id, bn: "আগামী কয়েক ঘণ্টায় বৃষ্টির সম্ভাবনা আছে। সেচ বা উপরি সার দেওয়ার আগে একবার দেখে নিন।" });
  }
  return out;
}

// ---------------------------------------------------------------- Bangla voice → task (always confirmed)
const BN_DIGITS = "০১২৩৪৫৬৭৮৯";
export const bnToAscii = (s: string) => s.replace(/[০-৯]/g, (d) => String(BN_DIGITS.indexOf(d)));

const KIND_WORDS: Array<[TaskKind, RegExp]> = [
  ["irrigate", /সেচ|পানি দি|irrigat|water/i],
  ["fertilise", /সার|ইউরিয়া|fertili[sz]/i],
  ["spray", /স্প্রে|ছিটা|কীটনাশক|spray/i],
  ["weed", /নিড়ানি|নিড়ান|আগাছা|weed/i],
  ["sow", /বীজ বোন|বীজ বপন|বপন|রোপণ|রোপন|চারা লাগা|sow|plant/i],
  ["harvest", /কাট(া|বো|তে)|তোলা|সংগ্রহ|harvest/i],
  ["market", /হাটে|বাজারে|বেচ|বিক্রি|sell|market/i],
  ["animal", /গরু|ছাগল|হাঁস|মুরগি|টিকা|ভ্যাকসিন|cow|goat|vaccin/i],
  ["fish", /মাছ|পুকুর|খাবার দি|fish|pond/i],
];

export interface ParsedTask { kind: TaskKind; date: string; title: string; dayWord: string | null }

/** "কাল সকালে সেচ দিতে হবে" → irrigate, tomorrow. Returns null when no farm task is recognised. */
export function parseTaskUtterance(text: string, today: string): ParsedTask | null {
  const t = text.normalize("NFC").trim();
  if (!t) return null;
  const kind = KIND_WORDS.find(([, re]) => re.test(t))?.[0] ?? null;
  if (!kind) return null;
  let offset = 0;
  let dayWord: string | null = null;
  const ascii = bnToAscii(t);
  const nDays = ascii.match(/(\d{1,2})\s*দিন\s*পর/);
  if (nDays) { offset = Number(nDays[1]); dayWord = `${nDays[1]} দিন পর`; }
  else if (/পরশু|day after tomorrow/i.test(t)) { offset = 2; dayWord = "পরশু"; }
  else if (/আগামীকাল|আগামী কাল|কাল|tomorrow/i.test(t)) { offset = 1; dayWord = "কাল"; }
  else if (/আজ|today/i.test(t)) { offset = 0; dayWord = "আজ"; }
  return { kind, date: addDays(today, offset), title: t.replace(/\s+/g, " ").slice(0, 120), dayWord };
}

// ---------------------------------------------------------------- SMS (3GPP TS 23.038 GSM 7-bit vs UCS-2)
const GSM_BASIC = "@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !\"#¤%&'()*+,-./0123456789:;<=>?¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà";
const GSM_EXT = "^{}\\[~]|€\f";

export interface SmsInfo { encoding: "GSM-7" | "UCS-2"; units: number; segments: number; perSegment: number }

/** How many SMS a message takes. Any Bangla letter forces UCS-2 (70 per SMS, 67 when split). */
export function smsInfo(text: string): SmsInfo {
  const chars = [...text];
  const gsm = chars.every((c) => GSM_BASIC.includes(c) || GSM_EXT.includes(c));
  if (gsm) {
    const units = chars.reduce((a, c) => a + (GSM_EXT.includes(c) ? 2 : 1), 0);
    const per = units <= 160 ? 160 : 153;
    return { encoding: "GSM-7", units, segments: units === 0 ? 0 : Math.ceil(units / per), perSegment: per };
  }
  // UCS-2 counts UTF-16 code units.
  const units = text.length;
  const per = units <= 70 ? 70 : 67;
  return { encoding: "UCS-2", units, segments: units === 0 ? 0 : Math.ceil(units / per), perSegment: per };
}

/** Converts ASCII digits to Bengali numerals. */
export const bnNum = (n: number | string) => String(n).replace(/\d/g, (d) => BN_DIGITS[Number(d)]);

export interface DaySummary { dateBn: string; sprayBn: string | null; tasks: FarmTask[]; helpline: string }

/** A short Bangla message a farmer can forward to a family member's basic phone. */
export function composeFarmSms(s: DaySummary): string {
  const list = s.tasks.slice(0, 3).map((t, i) => `${bnNum(i + 1)}. ${t.title.slice(0, 40)}`).join("; ");
  const parts = [`মাঠসাথী ${s.dateBn}`, list ? `কাজ: ${list}` : "আজ কোনো কাজ লেখা নেই", s.sprayBn ? `স্প্রে: ${s.sprayBn}` : null, `পরামর্শ: ${s.helpline}`];
  return parts.filter(Boolean).join("। ");
}

// ---------------------------------------------------------------- livestock, poultry and fish records
export type AnimalKind = "cow" | "buffalo" | "goat" | "sheep" | "chicken" | "duck" | "fish-pond";
export const ANIMAL_KINDS: Array<{ id: AnimalKind; bn: string; unitBn: string; group: "livestock" | "poultry" | "fish" }> = [
  { id: "cow", bn: "গরু", unitBn: "টি", group: "livestock" },
  { id: "buffalo", bn: "মহিষ", unitBn: "টি", group: "livestock" },
  { id: "goat", bn: "ছাগল", unitBn: "টি", group: "livestock" },
  { id: "sheep", bn: "ভেড়া", unitBn: "টি", group: "livestock" },
  { id: "chicken", bn: "মুরগি", unitBn: "টি", group: "poultry" },
  { id: "duck", bn: "হাঁস", unitBn: "টি", group: "poultry" },
  { id: "fish-pond", bn: "মাছের পুকুর", unitBn: "শতাংশ", group: "fish" },
];

export interface Herd { id: string; kind: AnimalKind; name: string; count: number }

export type FarmLogKind = "milk-l" | "eggs" | "fish-kg" | "feed-kg" | "expense" | "sale" | "vaccination" | "illness";
export interface FarmLog {
  id: string;
  herdId: string;
  date: string;
  kind: FarmLogKind;
  /** litres, eggs, kg, or poisha for expense/sale; 0 for vaccination/illness notes. */
  amount: number;
  note?: string;
  /** For vaccination: the next date the farmer was told by the livestock office (never computed by the app). */
  nextDue?: string;
}

export interface HerdSummary {
  milkL: number; eggs: number; fishKg: number; feedKg: number;
  expensePoisha: number; salePoisha: number; netPoisha: number;
  vaccinationsDue: Array<{ herdId: string; date: string; overdue: boolean }>;
  reconciles: boolean;
}

export function herdSummary(logs: FarmLog[], fromIso: string, toIso: string, today: string): HerdSummary {
  const inRange = logs.filter((l) => isIsoDate(l.date) && l.date >= fromIso && l.date <= toIso);
  const sum = (k: FarmLogKind) => inRange.filter((l) => l.kind === k).reduce((a, l) => a + (Number.isFinite(l.amount) && l.amount > 0 ? l.amount : 0), 0);
  const expensePoisha = Math.round(sum("expense"));
  const salePoisha = Math.round(sum("sale"));
  const latestDue = new Map<string, string>();
  for (const l of logs) if (l.kind === "vaccination" && l.nextDue && isIsoDate(l.nextDue)) {
    const prev = latestDue.get(l.herdId);
    if (!prev || l.nextDue > prev) latestDue.set(l.herdId, l.nextDue);
  }
  const due = [...latestDue.entries()].filter(([, d]) => daysBetween(today, d) <= 14).map(([herdId, date]) => ({ herdId, date, overdue: date < today })).sort((a, b) => a.date.localeCompare(b.date));
  const netPoisha = salePoisha - expensePoisha;
  return {
    milkL: Math.round(sum("milk-l") * 10) / 10, eggs: Math.round(sum("eggs")), fishKg: Math.round(sum("fish-kg") * 10) / 10, feedKg: Math.round(sum("feed-kg") * 10) / 10,
    expensePoisha, salePoisha, netPoisha, vaccinationsDue: due, reconciles: salePoisha - expensePoisha === netPoisha,
  };
}

// ---------------------------------------------------------------- coastal aquaculture & gher (উপকূলীয় ঘের ও মৎস্য)
export type GherSpecies = "bagda" | "golda" | "crab" | "tilapia";

export interface GherSpeciesInfo {
  id: GherSpecies;
  nameBn: string;
  scientificName: string;
  optimalSalinityPpt: { min: number; max: number };
  typicalDepthFeet: { min: number; max: number };
  maxStockingPerDecimal: number;
}

export const GHER_SPECIES_DATA: Record<GherSpecies, GherSpeciesInfo> = {
  bagda: {
    id: "bagda",
    nameBn: "বাগদা চিংড়ি",
    scientificName: "Penaeus monodon",
    optimalSalinityPpt: { min: 10, max: 25 },
    typicalDepthFeet: { min: 3, max: 5 },
    maxStockingPerDecimal: 300,
  },
  golda: {
    id: "golda",
    nameBn: "গলদা চিংড়ি",
    scientificName: "Macrobrachium rosenbergii",
    optimalSalinityPpt: { min: 0, max: 5 },
    typicalDepthFeet: { min: 3, max: 4.5 },
    maxStockingPerDecimal: 150,
  },
  crab: {
    id: "crab",
    nameBn: "শিলা কাঁকড়া",
    scientificName: "Scylla serrata",
    optimalSalinityPpt: { min: 15, max: 28 },
    typicalDepthFeet: { min: 2.5, max: 4 },
    maxStockingPerDecimal: 100,
  },
  tilapia: {
    id: "tilapia",
    nameBn: "লবণসহিষ্ণু তেলাপিয়া",
    scientificName: "Oreochromis niloticus",
    optimalSalinityPpt: { min: 5, max: 15 },
    typicalDepthFeet: { min: 3.5, max: 6 },
    maxStockingPerDecimal: 200,
  },
};

export interface GherPond {
  id: string;
  name: string;
  decimals: number;
  species: GherSpecies;
  salinityPpt: number;
  waterDepthFeet: number;
  stockingCount: number;
  stockingDate: string;
  note?: string;
}

/** Stocking density in PL / fingerlings per decimal (সংখ্যা প্রতি শতাংশ) */
export function calculateStockingDensity(stockingCount: number, decimals: number): number {
  if (!Number.isFinite(stockingCount) || stockingCount < 0 || !Number.isFinite(decimals) || decimals <= 0) {
    return 0;
  }
  return Math.round((stockingCount / decimals) * 10) / 10;
}

/**
 * Feed Conversion Ratio (FCR = Total Feed Given (kg) / Total Harvest Weight (kg)).
 * Lower FCR indicates better feed efficiency (e.g. 1.2 to 1.8 is typical).
 */
export function calculateFcr(totalFeedKg: number, harvestedKg: number): number | null {
  if (!Number.isFinite(totalFeedKg) || totalFeedKg <= 0 || !Number.isFinite(harvestedKg) || harvestedKg <= 0) {
    return null;
  }
  return Math.round((totalFeedKg / harvestedKg) * 100) / 100;
}

export interface SalinitySuitability {
  status: "optimal" | "tolerable" | "stress";
  labelBn: string;
  adviceBn: string;
}

/**
 * Checks salinity suitability for the coastal aquaculture species.
 * Calibrated against Department of Fisheries (DoF) and BFRI coastal guidelines.
 */
export function checkSalinitySuitability(species: GherSpecies, ppt: number): SalinitySuitability {
  if (!Number.isFinite(ppt) || ppt < 0) {
    return {
      status: "stress",
      labelBn: "অজানা বা ভুল মাত্রা",
      adviceBn: "লবণাক্ততার সঠিক রিফ্র্যাক্টোমিটার বা স্যালিনিটি মিটার রিডিং দিন।",
    };
  }

  const info = GHER_SPECIES_DATA[species];
  if (!info) {
    return {
      status: "tolerable",
      labelBn: "সাধারণ পর্যায়",
      adviceBn: "উপজেলা মৎস্য কর্মকর্তার সঙ্গে পরামর্শ করুন।",
    };
  }

  if (ppt >= info.optimalSalinityPpt.min && ppt <= info.optimalSalinityPpt.max) {
    return {
      status: "optimal",
      labelBn: "অনুকূল মাত্রা (Optimal)",
      adviceBn: `লবণাক্ততা ${ppt} ppt এই প্রজাতির জন্য সম্পূর্ণ অনুকূল। নিয়মিত পানির গভীরতা বজায় রাখুন।`,
    };
  }

  if (species === "bagda" && ((ppt >= 5 && ppt < 10) || (ppt > 25 && ppt <= 30))) {
    return {
      status: "tolerable",
      labelBn: "সহনশীল মাত্রা (Tolerable)",
      adviceBn: `লবণাক্ততা ${ppt} ppt সহনশীল সীমায় আছে। অতিরিক্ত বৃষ্টি বা খরায় লবণাক্ততার আকস্মিক পরিবর্তন খেয়াল রাখুন।`,
    };
  }

  if (species === "golda" && ppt > 5 && ppt <= 8) {
    return {
      status: "tolerable",
      labelBn: "সহনশীল মাত্রা (Tolerable)",
      adviceBn: `গলদার জন্য লবণাক্ততা কিছুটা বেশি (${ppt} ppt)। মিষ্টি পানি যোগ করার ব্যবস্থা রাখুন।`,
    };
  }

  if (species === "crab" && ((ppt >= 10 && ppt < 15) || (ppt > 28 && ppt <= 32))) {
    return {
      status: "tolerable",
      labelBn: "সহনশীল মাত্রা (Tolerable)",
      adviceBn: `কাঁকড়ার জন্য লবণাক্ততা (${ppt} ppt) সহনশীল। পানি বিনিময় তদারকি করুন।`,
    };
  }

  if (species === "tilapia" && ppt > 15 && ppt <= 25) {
    return {
      status: "tolerable",
      labelBn: "সহনশীল মাত্রা (Tolerable)",
      adviceBn: `তেলাপিয়া (${ppt} ppt) টিকে থাকতে পারবে, তবে বৃদ্ধির হার কিছুটা কম হতে পারে।`,
    };
  }

  return {
    status: "stress",
    labelBn: "ঝুঁকিপূর্ণ / প্রতিকূল মাত্রা (Stress)",
    adviceBn: `লবণাক্ততা ${ppt} ppt এই প্রজাতির বৃদ্ধির জন্য ক্ষতিকর। দ্রুত পানি নিয়ন্ত্রণ করুন অথবা মৎস্য হেল্পলাইন ১৬৩৫৮-এ কল দিন।`,
  };
}

// ---------------------------------------------------------------- Crop Doctor: calibrated honesty
export type DoctorVerdict = "likely" | "possible" | "unsure";

/**
 * Turns a symptom-match result into an honest verdict. A single matching word is never "likely":
 * we need at least two of the farmer's symptoms to match AND most of them. Otherwise we say we are
 * not sure and send the farmer to the agriculture officer or 16123.
 */
export function doctorVerdict(matchScore: number, matchedCount: number, askedCount: number): { verdict: DoctorVerdict; bn: string } {
  if (askedCount === 0 || matchedCount === 0) return { verdict: "unsure", bn: "নিশ্চিত নই — লক্ষণ বেছে নিন, অথবা কৃষি অফিসার বা ১৬১২৩-এ যোগাযোগ করুন।" };
  if (matchedCount >= 2 && matchScore >= 67) return { verdict: "likely", bn: "লক্ষণগুলো এই রোগের সঙ্গে মিলছে। তবু নিশ্চিত হতে উপসহকারী কৃষি কর্মকর্তাকে দেখান।" };
  if (matchScore >= 50) return { verdict: "possible", bn: "কিছু লক্ষণ মিলছে, সব নয়। আরও লক্ষণ মিলিয়ে দেখুন বা কৃষি অফিসারকে দেখান।" };
  return { verdict: "unsure", bn: "নিশ্চিত নই — কৃষি অফিসার বা ১৬১২৩-এ যোগাযোগ করুন।" };
}

// ---------------------------------------------------------------- government support matching
export interface SupportRule { needs?: string[]; maxDecimals?: number }
/** Which programmes a farmer can start with now, and which need another one first. */
export function supportPath(programs: Array<{ id: string; rule: SupportRule }>, farmer: { decimals: number; has: string[] }) {
  const ready: string[] = [], needsFirst: Array<{ id: string; missing: string[] }> = [], notForYou: string[] = [];
  for (const p of programs) {
    if (p.rule.maxDecimals !== undefined && farmer.decimals > p.rule.maxDecimals) { notForYou.push(p.id); continue; }
    const missing = (p.rule.needs ?? []).filter((n) => !farmer.has.includes(n));
    if (missing.length) needsFirst.push({ id: p.id, missing }); else ready.push(p.id);
  }
  return { ready, needsFirst, notForYou };
}

// ---------------------------------------------------------------- sanitizers for stored records
const str = (v: unknown, max = 120) => (typeof v === "string" ? v.slice(0, max) : null);

export function sanitizePlots(raw: unknown): Plot[] | null {
  if (!Array.isArray(raw)) return null;
  const levels: LandLevel[] = ["high", "medium", "low"];
  const waters: WaterSource[] = ["rain", "deep-tubewell", "shallow-tubewell", "canal-river", "pond", "other"];
  return raw.slice(0, 50).flatMap((p) => {
    if (!p || typeof p !== "object") return [];
    const o = p as Record<string, unknown>;
    const id = str(o.id, 40), name = str(o.name, 60);
    const decimals = typeof o.decimals === "number" && Number.isFinite(o.decimals) && o.decimals >= 0 && o.decimals < 1e6 ? o.decimals : null;
    if (!id || !name || decimals === null) return [];
    const history = Array.isArray(o.history) ? o.history.slice(0, 30).flatMap((h) => {
      const hh = h as Record<string, unknown>;
      const season = str(hh?.season, 40), cropId = str(hh?.cropId, 30);
      return season && cropId ? [{ season, cropId }] : [];
    }) : [];
    const st = o.soilTest && typeof o.soilTest === "object" ? (o.soilTest as Record<string, unknown>) : null;
    const num = (v: unknown, lo: number, hi: number) => (typeof v === "number" && Number.isFinite(v) && v >= lo && v <= hi ? v : undefined);
    return [{
      id, name, decimals,
      level: levels.includes(o.level as LandLevel) ? (o.level as LandLevel) : "medium",
      water: waters.includes(o.water as WaterSource) ? (o.water as WaterSource) : "other",
      history,
      soilTest: st ? { ph: num(st.ph, 0, 14), organicMatterPct: num(st.organicMatterPct, 0, 100), tested: str(st.tested, 10) ?? undefined } : undefined,
    }];
  });
}

export function sanitizeTasks(raw: unknown): FarmTask[] | null {
  if (!Array.isArray(raw)) return null;
  const kinds: TaskKind[] = ["irrigate", "fertilise", "spray", "weed", "sow", "harvest", "market", "animal", "fish", "other"];
  return raw.slice(0, 300).flatMap((t) => {
    const o = (t ?? {}) as Record<string, unknown>;
    const id = str(o.id, 40), title = str(o.title, 160), date = str(o.date, 10);
    if (!id || !title || !date || !isIsoDate(date)) return [];
    return [{ id, title, date, kind: kinds.includes(o.kind as TaskKind) ? (o.kind as TaskKind) : "other", plotId: str(o.plotId, 40) ?? undefined, done: o.done === true }];
  });
}

export function sanitizeHerds(raw: unknown): Herd[] | null {
  if (!Array.isArray(raw)) return null;
  const kinds = ANIMAL_KINDS.map((k) => k.id);
  return raw.slice(0, 50).flatMap((h) => {
    const o = (h ?? {}) as Record<string, unknown>;
    const id = str(o.id, 40), name = str(o.name, 60);
    const count = typeof o.count === "number" && Number.isInteger(o.count) && o.count >= 0 && o.count < 1e6 ? o.count : null;
    if (!id || !name || count === null || !kinds.includes(o.kind as AnimalKind)) return [];
    return [{ id, name, count, kind: o.kind as AnimalKind }];
  });
}

export function sanitizeGhers(raw: unknown): GherPond[] | null {
  if (!Array.isArray(raw)) return null;
  const validSpecies = new Set<GherSpecies>(["bagda", "golda", "crab", "tilapia"]);
  return raw.slice(0, 50).flatMap((g) => {
    if (!g || typeof g !== "object") return [];
    const o = g as Record<string, unknown>;
    const id = str(o.id, 40);
    const name = str(o.name, 60);
    const decimals = typeof o.decimals === "number" && Number.isFinite(o.decimals) && o.decimals > 0 && o.decimals < 1e5 ? o.decimals : null;
    const species = typeof o.species === "string" && validSpecies.has(o.species as GherSpecies) ? (o.species as GherSpecies) : null;
    const salinityPpt = typeof o.salinityPpt === "number" && Number.isFinite(o.salinityPpt) && o.salinityPpt >= 0 && o.salinityPpt <= 60 ? o.salinityPpt : 0;
    const waterDepthFeet = typeof o.waterDepthFeet === "number" && Number.isFinite(o.waterDepthFeet) && o.waterDepthFeet >= 0 && o.waterDepthFeet <= 30 ? o.waterDepthFeet : 4;
    const stockingCount = typeof o.stockingCount === "number" && Number.isFinite(o.stockingCount) && o.stockingCount >= 0 && o.stockingCount < 1e8 ? o.stockingCount : 0;
    const stockingDate = str(o.stockingDate, 10);

    if (!id || !name || decimals === null || !species || !stockingDate || !isIsoDate(stockingDate)) return [];
    return [{
      id,
      name,
      decimals,
      species,
      salinityPpt,
      waterDepthFeet,
      stockingCount,
      stockingDate,
      note: str(o.note, 160) ?? undefined,
    }];
  });
}

export function sanitizeLogs(raw: unknown): FarmLog[] | null {
  if (!Array.isArray(raw)) return null;
  const kinds: FarmLogKind[] = ["milk-l", "eggs", "fish-kg", "feed-kg", "expense", "sale", "vaccination", "illness"];
  return raw.slice(0, 2000).flatMap((l) => {
    const o = (l ?? {}) as Record<string, unknown>;
    const id = str(o.id, 40), herdId = str(o.herdId, 40), date = str(o.date, 10);
    const amount = typeof o.amount === "number" && Number.isFinite(o.amount) && o.amount >= 0 && o.amount < 1e12 ? o.amount : null;
    if (!id || !herdId || !date || !isIsoDate(date) || amount === null || !kinds.includes(o.kind as FarmLogKind)) return [];
    const nextDue = str(o.nextDue, 10);
    return [{ id, herdId, date, kind: o.kind as FarmLogKind, amount, note: str(o.note, 160) ?? undefined, nextDue: nextDue && isIsoDate(nextDue) ? nextDue : undefined }];
  });
}

// ---------------------------------------------------------------- harvest records (farmer-entered)
/** One harvest the farmer weighed or counted, and what they sold of it. All numbers are the farmer's own. */
export interface HarvestRec {
  id: string;
  plotId: string;
  cropId: string;
  date: string; // YYYY-MM-DD
  kg: number;
  soldKg?: number;
  /** What the farmer says they received, in integer poisha. */
  salePoisha?: number;
  /** Who bought or where, as the farmer wrote it. */
  buyer?: string;
}

export function sanitizeHarvests(raw: unknown): HarvestRec[] | null {
  if (!Array.isArray(raw)) return null;
  const qty = (v: unknown) => (typeof v === "number" && Number.isFinite(v) && v >= 0 && v < 1e9 ? v : undefined);
  return raw.slice(0, 500).flatMap((h) => {
    const o = (h ?? {}) as Record<string, unknown>;
    const id = str(o.id, 40), plotId = str(o.plotId, 40), cropId = str(o.cropId, 30), date = str(o.date, 10);
    const kg = qty(o.kg);
    if (!id || !plotId || !cropId || !date || !isIsoDate(date) || kg === undefined) return [];
    const sale = typeof o.salePoisha === "number" && Number.isInteger(o.salePoisha) && o.salePoisha >= 0 && o.salePoisha < 1e13 ? o.salePoisha : undefined;
    return [{ id, plotId, cropId, date, kg, soldKg: qty(o.soldKg), salePoisha: sale, buyer: str(o.buyer, 80) ?? undefined }];
  });
}

// ---------------------------------------------------------------- farm record export (খামারের খাতা)
/*
 * Builds a self-recorded farm record from what the farmer saved in MaathSathi: a plain-language season
 * summary per plot, and a JSON export whose log entries are shaped like farmOS logs.
 *
 * farmOS log model (checked 2026-11-17 at https://farmos.org/model/type/log/ and /model/type/quantity/):
 * every log has a name, a timestamp and a status (pending / done / abandoned); log types include
 * activity, observation, input and harvest (also lab test, maintenance, medical, seeding, transplanting);
 * a quantity has a measure (count, weight, volume, value, ...), a decimal value, units and an optional
 * label. We use only activity, input, harvest and observation, and only "done" entries.
 *
 * Nothing here is verified: it is the farmer's own record. No quantity is invented. Completed spray or
 * fertiliser tasks become input logs WITHOUT a quantity, because the app never records doses.
 */
export type FarmOsLogType = "activity" | "input" | "harvest" | "observation";
export interface FarmOsQuantity { measure: "count" | "weight" | "volume" | "value"; value: number; units: string; label?: string }
export interface FarmOsLog {
  id: string;
  type: FarmOsLogType;
  /** ISO 8601 at local midnight, Bangladesh time (UTC+06:00, no daylight saving). */
  timestamp: string;
  name: string;
  status: "done";
  quantity: FarmOsQuantity[];
  /** ids of plots (land assets) or herds (animal/pond assets) the log is about. */
  asset: string[];
  notes?: string;
  /** Which MaathSathi record the log came from. */
  source: "task" | "herd-log" | "harvest" | "soil-test";
}

/** The farmer's plan for one plot (from the planning tab). These are planned costs, not receipts. */
export interface PlanBudget { plotId: string; cropId: string; costs: Array<{ label: string; taka: number }>; expectedKg: number; priceTaka: number; priceSource: string }

export interface PlotSeason {
  plotId: string;
  name: string;
  decimals: number;
  /** Crops as the farmer listed them in the plot history (season label + crop). */
  cropsGrown: Array<{ season: string; cropBn: string }>;
  plannedCropBn: string | null;
  sown: Array<{ date: string; title: string }>;
  inputs: Array<{ date: string; kindBn: string; title: string }>;
  otherWork: Array<{ date: string; title: string }>;
  harvests: Array<{ date: string; cropBn: string; kg: number; soldKg: number | null; salePoisha: number | null; buyer: string | null }>;
  harvestKg: number;
  soldKg: number;
  salePoisha: number;
  /** Sum of the farmer's planned cost lines, in poisha; null when there is no plan. */
  plannedCostPoisha: number | null;
  soilTest: string | null;
}

export interface HerdRecord {
  id: string; name: string; kindBn: string; count: number; unitBn: string;
  milkL: number; eggs: number; fishKg: number; feedKg: number; salePoisha: number; expensePoisha: number;
  vaccinations: string[]; illnesses: string[];
}

export interface FarmRecord {
  period: { from: string; to: string };
  generatedOn: string;
  disclaimerBn: string;
  disclaimerEn: string;
  plots: PlotSeason[];
  unassignedWork: Array<{ date: string; title: string }>;
  herds: HerdRecord[];
  logs: FarmOsLog[];
  totals: { harvestKg: number; salePoisha: number; logCount: number };
}

export const FARM_RECORD_DISCLAIMER_BN = "এই খাতা কৃষক নিজে লিখেছেন (স্ব-লিখিত)। ঋণ কর্মকর্তা, বিমাকারী বা সমবায়ের কাজে লাগতে পারে, তবে কেউ যাচাই করেনি।";
export const FARM_RECORD_DISCLAIMER_EN = "Self-recorded by the farmer; useful for a loan officer, insurer or cooperative; not verified.";

const TASK_KIND_BN: Record<TaskKind, string> = { irrigate: "সেচ", fertilise: "সার", spray: "স্প্রে", weed: "নিড়ানি", sow: "বপন/রোপণ", harvest: "ফসল তোলা", market: "হাটে বিক্রি", animal: "পশুপাখি", fish: "মাছ", other: "অন্য কাজ" };
/** sow → activity (farmOS "seeding" needs a plant asset we do not track); fertilise/spray → input with no quantity. */
const TASK_LOG_TYPE: Record<TaskKind, FarmOsLogType> = { irrigate: "activity", fertilise: "input", spray: "input", weed: "activity", sow: "activity", harvest: "activity", market: "activity", animal: "activity", fish: "activity", other: "activity" };
const INPUT_KINDS: TaskKind[] = ["fertilise", "spray", "irrigate"];

const tsBd = (iso: string) => `${iso}T00:00:00+06:00`;
const round1 = (n: number) => Math.round(n * 10) / 10;
const round3 = (n: number) => Math.round(n * 1000) / 1000;
const positive = (n: number) => (Number.isFinite(n) && n > 0 ? n : 0);

export function buildFarmRecord(input: {
  plots: Plot[]; tasks: FarmTask[]; herds: Herd[]; logs: FarmLog[]; harvests: HarvestRec[]; budgets?: PlanBudget[];
  from: string; to: string; generatedOn: string;
}): FarmRecord {
  if (!isIsoDate(input.from) || !isIsoDate(input.to) || input.from > input.to) throw new Error("সময়কাল ঠিক নয়: শুরুর তারিখ শেষের তারিখের আগে দিন।");
  const inRange = (d: string) => isIsoDate(d) && d >= input.from && d <= input.to;
  const plotIds = new Set(input.plots.map((p) => p.id));
  const doneTasks = input.tasks.filter((t) => t.done && inRange(t.date)).sort((a, b) => a.date.localeCompare(b.date));
  const harvests = input.harvests.filter((h) => inRange(h.date) && Number.isFinite(h.kg) && h.kg >= 0).sort((a, b) => a.date.localeCompare(b.date));
  const out: FarmOsLog[] = [];

  for (const t of doneTasks) {
    out.push({
      id: `task-${t.id}`, type: TASK_LOG_TYPE[t.kind], timestamp: tsBd(t.date), name: `${TASK_KIND_BN[t.kind]}: ${t.title}`.slice(0, 160), status: "done",
      quantity: [], asset: t.plotId && plotIds.has(t.plotId) ? [t.plotId] : [], notes: "তারিখটি কাজের তালিকার নির্ধারিত দিন (scheduled date of the task)", source: "task",
    });
  }
  for (const h of harvests) {
    const q: FarmOsQuantity[] = [{ measure: "weight", value: round3(h.kg), units: "kg", label: "harvested" }];
    if (h.soldKg !== undefined) q.push({ measure: "weight", value: round3(h.soldKg), units: "kg", label: "sold" });
    if (h.salePoisha !== undefined) q.push({ measure: "value", value: h.salePoisha / 100, units: "BDT", label: "sale received" });
    out.push({ id: `harvest-${h.id}`, type: "harvest", timestamp: tsBd(h.date), name: `${cropBn(h.cropId)} তোলা`, status: "done", quantity: q, asset: plotIds.has(h.plotId) ? [h.plotId] : [], notes: h.buyer ? `ক্রেতা/বাজার: ${h.buyer}` : undefined, source: "harvest" });
  }
  for (const p of input.plots) {
    const st = p.soilTest;
    if (st?.tested && inRange(st.tested) && (st.ph !== undefined || st.organicMatterPct !== undefined)) {
      const parts = [st.ph !== undefined ? `pH ${st.ph}` : null, st.organicMatterPct !== undefined ? `organic matter ${st.organicMatterPct}%` : null].filter(Boolean).join(", ");
      out.push({ id: `soil-${p.id}`, type: "observation", timestamp: tsBd(st.tested), name: `মাটি পরীক্ষা: ${p.name}`, status: "done", quantity: [], asset: [p.id], notes: `${parts} (কৃষকের কার্ড থেকে লেখা)`, source: "soil-test" });
    }
  }
  const herdById = new Map(input.herds.map((h) => [h.id, h]));
  const herdLogs = input.logs.filter((l) => herdById.has(l.herdId) && inRange(l.date)).sort((a, b) => a.date.localeCompare(b.date));
  for (const l of herdLogs) {
    const herd = herdById.get(l.herdId)!;
    const base = { id: `herd-${l.id}`, timestamp: tsBd(l.date), status: "done" as const, asset: [herd.id], notes: l.note, source: "herd-log" as const };
    const amt = positive(l.amount);
    switch (l.kind) {
      case "milk-l": out.push({ ...base, type: "harvest", name: `দুধ: ${herd.name}`, quantity: [{ measure: "volume", value: round1(amt), units: "l" }] }); break;
      case "eggs": out.push({ ...base, type: "harvest", name: `ডিম: ${herd.name}`, quantity: [{ measure: "count", value: Math.round(amt), units: "eggs" }] }); break;
      case "fish-kg": out.push({ ...base, type: "harvest", name: `মাছ ধরা: ${herd.name}`, quantity: [{ measure: "weight", value: round3(amt), units: "kg" }] }); break;
      case "feed-kg": out.push({ ...base, type: "input", name: `খাবার দেওয়া: ${herd.name}`, quantity: [{ measure: "weight", value: round3(amt), units: "kg", label: "feed" }] }); break;
      case "expense": out.push({ ...base, type: "activity", name: `খরচ: ${herd.name}`, quantity: [{ measure: "value", value: Math.round(amt) / 100, units: "BDT", label: "expense" }] }); break;
      case "sale": out.push({ ...base, type: "activity", name: `বিক্রি: ${herd.name}`, quantity: [{ measure: "value", value: Math.round(amt) / 100, units: "BDT", label: "sale received" }] }); break;
      case "vaccination": out.push({ ...base, type: "activity", name: `টিকা দেওয়া: ${herd.name}`, quantity: [], notes: [l.note, l.nextDue ? `পরের তারিখ (অফিস যা বলেছে): ${l.nextDue}` : null].filter(Boolean).join(" · ") || undefined }); break;
      case "illness": out.push({ ...base, type: "observation", name: `অসুখ: ${herd.name}`, quantity: [] }); break;
    }
  }
  out.sort((a, b) => a.timestamp.localeCompare(b.timestamp) || a.id.localeCompare(b.id));

  const plots: PlotSeason[] = input.plots.map((p) => {
    const tasks = doneTasks.filter((t) => t.plotId === p.id);
    const hs = harvests.filter((h) => h.plotId === p.id);
    const plan = input.budgets?.find((b) => b.plotId === p.id);
    const st = p.soilTest;
    return {
      plotId: p.id, name: p.name, decimals: p.decimals,
      cropsGrown: p.history.map((h) => ({ season: h.season, cropBn: cropBn(h.cropId) })),
      plannedCropBn: plan ? cropBn(plan.cropId) : null,
      sown: tasks.filter((t) => t.kind === "sow").map((t) => ({ date: t.date, title: t.title })),
      inputs: tasks.filter((t) => INPUT_KINDS.includes(t.kind)).map((t) => ({ date: t.date, kindBn: TASK_KIND_BN[t.kind], title: t.title })),
      otherWork: tasks.filter((t) => t.kind !== "sow" && !INPUT_KINDS.includes(t.kind)).map((t) => ({ date: t.date, title: t.title })),
      harvests: hs.map((h) => ({ date: h.date, cropBn: cropBn(h.cropId), kg: h.kg, soldKg: h.soldKg ?? null, salePoisha: h.salePoisha ?? null, buyer: h.buyer ?? null })),
      harvestKg: round3(hs.reduce((a, h) => a + h.kg, 0)),
      soldKg: round3(hs.reduce((a, h) => a + (h.soldKg ?? 0), 0)),
      salePoisha: hs.reduce((a, h) => a + (h.salePoisha ?? 0), 0),
      plannedCostPoisha: plan ? plan.costs.reduce((a, c) => a + Math.round(positive(c.taka) * 100), 0) : null,
      soilTest: st && (st.ph !== undefined || st.organicMatterPct !== undefined)
        ? [st.ph !== undefined ? `pH ${st.ph}` : null, st.organicMatterPct !== undefined ? `জৈব পদার্থ ${st.organicMatterPct}%` : null, st.tested ? `(${st.tested})` : null].filter(Boolean).join(" ")
        : null,
    };
  });

  const herds: HerdRecord[] = input.herds.map((h) => {
    const ls = herdLogs.filter((l) => l.herdId === h.id);
    const sum = (k: FarmLogKind) => ls.filter((l) => l.kind === k).reduce((a, l) => a + positive(l.amount), 0);
    const meta = ANIMAL_KINDS.find((k) => k.id === h.kind)!;
    return {
      id: h.id, name: h.name, kindBn: meta.bn, count: h.count, unitBn: meta.unitBn,
      milkL: round1(sum("milk-l")), eggs: Math.round(sum("eggs")), fishKg: round1(sum("fish-kg")), feedKg: round1(sum("feed-kg")),
      salePoisha: Math.round(sum("sale")), expensePoisha: Math.round(sum("expense")),
      vaccinations: ls.filter((l) => l.kind === "vaccination").map((l) => l.date),
      illnesses: ls.filter((l) => l.kind === "illness").map((l) => `${l.date}${l.note ? `: ${l.note}` : ""}`),
    };
  });

  return {
    period: { from: input.from, to: input.to }, generatedOn: input.generatedOn,
    disclaimerBn: FARM_RECORD_DISCLAIMER_BN, disclaimerEn: FARM_RECORD_DISCLAIMER_EN,
    plots,
    unassignedWork: doneTasks.filter((t) => !t.plotId || !plotIds.has(t.plotId)).map((t) => ({ date: t.date, title: t.title })),
    herds,
    logs: out,
    totals: { harvestKg: round3(plots.reduce((a, p) => a + p.harvestKg, 0)), salePoisha: plots.reduce((a, p) => a + p.salePoisha, 0), logCount: out.length },
  };
}

/** The downloadable JSON: farmOS-shaped logs plus the plots and herds they point to. */
export function farmRecordJson(r: FarmRecord, plots: Plot[], herds: Herd[]): string {
  return JSON.stringify({
    format: "kormopath.maathsathi.farm-record/v1",
    shapedLike: "farmOS logs (https://farmos.org/model/type/log/); not an official farmOS export",
    verified: false,
    disclaimer: { en: r.disclaimerEn, bn: r.disclaimerBn },
    period: r.period,
    generatedOn: r.generatedOn,
    assets: {
      land: plots.map((p) => ({ id: p.id, name: p.name, area: { value: p.decimals, units: "decimal (1/100 acre)" } })),
      animal: herds.map((h) => ({ id: h.id, name: h.name, kind: h.kind, count: h.count })),
    },
    logs: r.logs,
  }, null, 2);
}
