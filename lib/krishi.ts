/*
 * MaathSathi (মাঠসাথী) — the farmer's field companion. Pure and deterministic, NO imports, so every
 * rule here is unit-tested (tests/krishi.test.ts).
 *
 * What lives here: land-unit conversion, crop budgets in integer poisha, rotation checks by botanical
 * family, task buckets, a Bangla voice-to-task parser (always confirmed by the farmer before saving),
 * SMS length/encoding, livestock/poultry/fish records and the Crop Doctor confidence verdict.
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
export const isIsoDate = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s + "T00:00:00Z"));

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
