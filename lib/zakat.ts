/*
 * Zakat & savings hub (যাকাত ও সঞ্চয়) for Shohoj Budget. NO imports — pure and unit-tested (tests/zakat.test.ts).
 *
 * Money is integer poisha. Weights are integer milligrams. Only three facts are built in, each checked on the page
 * listed in ZAKAT_SOURCES: 1 bhori = 11.664 g, the nisab weights (87.48 g gold / 612.36 g silver) and the 2.5% rate.
 * Gold and silver PRICES are never built in: the user types today's rate with its source and date, and the result
 * repeats that date. This is a calculator, not a fatwa.
 */

export const ZAKAT_CHECKED = "2026-11-17";

export const ZAKAT_SOURCES = [
  { label: "The Business Standard — BAJUS gold price per bhori (11.664 grams)", url: "https://www.tbsnews.net/node/1321321", checked: ZAKAT_CHECKED },
  { label: "The Business Standard — nisab: 612.36 g silver or 87.48 g gold", url: "https://www.tbsnews.net/node/406406", checked: ZAKAT_CHECKED },
  { label: "Islamic Relief Canada — 2.5% once every Hijri year; nisab 87.48 g gold or 612.36 g silver", url: "https://islamicreliefcanada.org/our-work/zakat/zakat-on-gold", checked: ZAKAT_CHECKED },
  { label: "BAJUS (Bangladesh Jewellers Association) — today's gold and silver rates", url: "https://www.bajus.org/", checked: ZAKAT_CHECKED },
] as const;

/** 1 bhori = 11.664 g, as used in BAJUS price notices. Kept in milligrams. */
export const BHORI_MG = 11_664;
export const NISAB_GOLD_MG = 87_480;
export const NISAB_SILVER_MG = 612_360;
/** 2.5% = 25 per 1000. */
export const ZAKAT_PER_MILLE = 25;
/** A lunar (Hijri) year is about 354 days; the next date shown from it is labelled approximate. */
export const LUNAR_YEAR_DAYS_APPROX = 354;

export type Metal = "gold" | "silver";
export type Purity = "22K" | "21K" | "18K" | "traditional";
export const PURITIES: Purity[] = ["22K", "21K", "18K", "traditional"];
export const PURITY_LABEL: Record<Purity, { bn: string; en: string }> = {
  "22K": { bn: "২২ ক্যারেট", en: "22 carat" },
  "21K": { bn: "২১ ক্যারেট", en: "21 carat" },
  "18K": { bn: "১৮ ক্যারেট", en: "18 carat" },
  traditional: { bn: "সনাতন", en: "Traditional" },
};
export type WeightUnit = "bhori" | "gram";
export type NisabBasis = Metal;

/** A price the user typed: poisha per bhori or per gram, with where and when they read it. */
export interface MetalRate { poisha: number; unit: WeightUnit }
export type Rates = Record<Metal, Partial<Record<Purity, MetalRate>>>;

export interface MetalHolding {
  id: string;
  metal: Metal;
  purity: Purity;
  unit: WeightUnit;
  /** weight × 1000 in the chosen unit (e.g. 2.5 bhori = 2500), integer */
  weightMilli: number;
  worn: boolean;
  note: string;
}

export const CASH_KEYS = ["cash", "bankMfs", "dpsFdr", "sanchaypatra", "dharReceivable", "businessStock", "other"] as const;
export type CashKey = (typeof CASH_KEYS)[number];
export const CASH_LABEL: Record<CashKey, { bn: string; en: string }> = {
  cash: { bn: "হাতে নগদ টাকা", en: "Cash in hand" },
  bankMfs: { bn: "ব্যাংক ও বিকাশ/নগদ/রকেটের ব্যালান্স", en: "Bank and bKash/Nagad/Rocket balances" },
  dpsFdr: { bn: "ডিপিএস / এফডিআর-এ জমা", en: "DPS / FDR deposits" },
  sanchaypatra: { bn: "সঞ্চয়পত্রের মূল টাকা", en: "Sanchaypatra principal" },
  dharReceivable: { bn: "ফেরত পাওয়ার মতো ধার", en: "Loans you expect back (dhar)" },
  businessStock: { bn: "ব্যবসার মালামাল (বিক্রয়মূল্যে)", en: "Business stock (at sale value)" },
  other: { bn: "অন্যান্য যাকাতযোগ্য সম্পদ", en: "Other zakatable assets" },
};

export type SavingsKind = "dps" | "sanchaypatra" | "fdr" | "other";
export interface SavingsItem {
  id: string;
  kind: SavingsKind;
  name: string;
  principalPoisha: number;
  /** yearly rate the user entered, in basis points (11.5% = 1150) */
  rateBps: number;
  startDate: string;
  maturityDate: string;
}

export interface ZakatState {
  cash: Record<CashKey, number>;
  debtsPoisha: number;
  holdings: MetalHolding[];
  rates: Rates;
  rateDate: string;
  rateSource: string;
  basis: NisabBasis;
  nisabPurity: Purity;
  includeWorn: boolean;
  hawlStart: string;
  savings: SavingsItem[];
}

export const emptyCash = (): Record<CashKey, number> => ({ cash: 0, bankMfs: 0, dpsFdr: 0, sanchaypatra: 0, dharReceivable: 0, businessStock: 0, other: 0 });
export const emptyZakat = (): ZakatState => ({
  cash: emptyCash(), debtsPoisha: 0, holdings: [], rates: { gold: {}, silver: {} }, rateDate: "", rateSource: "",
  basis: "silver", nisabPurity: "22K", includeWorn: true, hawlStart: "", savings: [],
});

// ---------------------------------------------------------------------------------------------
// Weights and values
// ---------------------------------------------------------------------------------------------

/** Holding weight in milligrams (integer). */
export function holdingMg(h: Pick<MetalHolding, "unit" | "weightMilli">): number {
  const w = Math.max(0, Math.round(h.weightMilli));
  return h.unit === "bhori" ? Math.round((w * BHORI_MG) / 1000) : w;
}

/** Value in poisha of `mg` milligrams at a typed rate; null when no rate was entered. */
export function valueAt(mg: number, rate: MetalRate | undefined): number | null {
  if (!rate || !(rate.poisha > 0)) return null;
  const perUnitMg = rate.unit === "bhori" ? BHORI_MG : 1000;
  return Math.round((Math.max(0, mg) * rate.poisha) / perUnitMg);
}

export interface HoldingValue { id: string; mg: number; poisha: number | null; counted: boolean }

export interface ZakatResult {
  cashPoisha: number;
  metals: HoldingValue[];
  metalsPoisha: number;
  /** holdings that count but have no rate yet */
  missingRates: { metal: Metal; purity: Purity }[];
  grossPoisha: number;
  debtsPoisha: number;
  netPoisha: number;
  nisabMg: number;
  /** null until the user enters a rate for the nisab metal and purity */
  nisabPoisha: number | null;
  reachesNisab: boolean | null;
  duePoisha: number;
}

export function computeZakat(s: ZakatState): ZakatResult {
  const cashPoisha = CASH_KEYS.reduce((a, k) => a + Math.max(0, Math.round(s.cash[k] ?? 0)), 0);
  const missing = new Map<string, { metal: Metal; purity: Purity }>();
  const metals = s.holdings.map((h) => {
    const mg = holdingMg(h);
    const counted = s.includeWorn || !h.worn;
    const poisha = valueAt(mg, s.rates[h.metal]?.[h.purity]);
    if (counted && poisha === null && mg > 0) missing.set(`${h.metal}:${h.purity}`, { metal: h.metal, purity: h.purity });
    return { id: h.id, mg, poisha, counted };
  });
  const metalsPoisha = metals.reduce((a, m) => a + (m.counted && m.poisha ? m.poisha : 0), 0);
  const grossPoisha = cashPoisha + metalsPoisha;
  const debtsPoisha = Math.max(0, Math.round(s.debtsPoisha));
  const netPoisha = Math.max(0, grossPoisha - debtsPoisha);
  const nisabMg = s.basis === "gold" ? NISAB_GOLD_MG : NISAB_SILVER_MG;
  const nisabPoisha = valueAt(nisabMg, s.rates[s.basis]?.[s.nisabPurity]);
  const reachesNisab = nisabPoisha === null ? null : netPoisha >= nisabPoisha;
  const duePoisha = reachesNisab ? Math.round((netPoisha * ZAKAT_PER_MILLE) / 1000) : 0;
  return { cashPoisha, metals, metalsPoisha, missingRates: [...missing.values()], grossPoisha, debtsPoisha, netPoisha, nisabMg, nisabPoisha, reachesNisab, duePoisha };
}

// ---------------------------------------------------------------------------------------------
// Dates
// ---------------------------------------------------------------------------------------------

const ISO = /^\d{4}-\d{2}-\d{2}$/;
export function isIsoDate(v: unknown): v is string {
  if (typeof v !== "string" || !ISO.test(v)) return false;
  const [y, m, d] = v.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1, d));
  return t.getUTCFullYear() === y && t.getUTCMonth() === m - 1 && t.getUTCDate() === d;
}
const dayNum = (iso: string) => { const [y, m, d] = iso.split("-").map(Number); return Date.UTC(y, m - 1, d) / 86_400_000; };
const fromDayNum = (n: number) => new Date(n * 86_400_000).toISOString().slice(0, 10);

/** About one lunar year after the hawl start (approximate: the Hijri calendar decides). */
export function nextHawlApprox(start: string, today: string): { date: string; daysLeft: number } | null {
  if (!isIsoDate(start) || !isIsoDate(today)) return null;
  let n = dayNum(start) + LUNAR_YEAR_DAYS_APPROX;
  const t = dayNum(today);
  while (n < t) n += LUNAR_YEAR_DAYS_APPROX;
  return { date: fromDayNum(n), daysLeft: n - t };
}

// ---------------------------------------------------------------------------------------------
// Savings (estimate only, at the user's own rate)
// ---------------------------------------------------------------------------------------------

/** Simple (non-compounding) value at maturity at the rate the user typed. An estimate, before any tax or fees. */
export function simpleMaturity(item: Pick<SavingsItem, "principalPoisha" | "rateBps" | "startDate" | "maturityDate">): { days: number; profitPoisha: number; totalPoisha: number } | null {
  if (!isIsoDate(item.startDate) || !isIsoDate(item.maturityDate)) return null;
  const days = dayNum(item.maturityDate) - dayNum(item.startDate);
  if (days <= 0 || item.principalPoisha <= 0 || item.rateBps < 0) return null;
  const profitPoisha = Math.round((item.principalPoisha * item.rateBps * days) / (10_000 * 365));
  return { days, profitPoisha, totalPoisha: item.principalPoisha + profitPoisha };
}

// ---------------------------------------------------------------------------------------------
// Formatting: ৳ with South Asian (lakh/crore) grouping, Bangla or Latin digits
// ---------------------------------------------------------------------------------------------

const BN = "০১২৩৪৫৬৭৮৯";
export const bnDigits = (s: string) => s.replace(/\d/g, (d) => BN[Number(d)]);

/** 1234567.5 taka -> "12,34,567.50"; whole taka drop the paisa. */
export function groupTaka(poisha: number): string {
  const neg = poisha < 0;
  const p = Math.abs(Math.round(poisha));
  const taka = Math.floor(p / 100);
  const paisa = p % 100;
  const s = String(taka);
  const last3 = s.slice(-3);
  const rest = s.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ",");
  const whole = rest ? `${rest},${last3}` : last3;
  return `${neg ? "-" : ""}${whole}${paisa ? `.${String(paisa).padStart(2, "0")}` : ""}`;
}
export const formatTaka = (poisha: number, lang: "bn" | "en" = "bn") => `৳${lang === "bn" ? bnDigits(groupTaka(poisha)) : groupTaka(poisha)}`;

/** "12.5" / "১২.৫" / "12,500" -> poisha; null when not a non-negative amount. */
export function parseTakaInput(raw: string): number | null {
  const t = String(raw ?? "").replace(/[০-৯]/g, (d) => String(BN.indexOf(d))).replace(/[,\s৳]/g, "").trim();
  if (!t) return 0;
  if (!/^\d+(\.\d{0,2})?$/.test(t)) return null;
  const [a, b = ""] = t.split(".");
  return Number(a) * 100 + Number((b + "00").slice(0, 2));
}

/** "2.5" -> 2500 (thousandths), Bangla digits allowed; null when invalid. */
export function parseWeightInput(raw: string): number | null {
  const t = String(raw ?? "").replace(/[০-৯]/g, (d) => String(BN.indexOf(d))).replace(/\s/g, "");
  if (!t) return 0;
  if (!/^\d+(\.\d{0,3})?$/.test(t)) return null;
  const [a, b = ""] = t.split(".");
  return Number(a) * 1000 + Number((b + "000").slice(0, 3));
}

// ---------------------------------------------------------------------------------------------
// Storage sanitizer (shohoj namespace)
// ---------------------------------------------------------------------------------------------

const MAX_POISHA = 1_000_000_000_000; // ৳1,000 crore cap on any one figure
const money = (v: unknown) => (typeof v === "number" && Number.isFinite(v) && v >= 0 ? Math.min(MAX_POISHA, Math.round(v)) : 0);
const str = (v: unknown, n: number) => (typeof v === "string" ? v.slice(0, n) : "");
const isPurity = (v: unknown): v is Purity => PURITIES.includes(v as Purity);
const isMetal = (v: unknown): v is Metal => v === "gold" || v === "silver";
const isUnit = (v: unknown): v is WeightUnit => v === "bhori" || v === "gram";
export const MAX_HOLDINGS = 40;
export const MAX_SAVINGS = 30;

function sanitizeRate(v: unknown): MetalRate | undefined {
  if (!v || typeof v !== "object") return undefined;
  const o = v as Record<string, unknown>;
  const poisha = money(o.poisha);
  return poisha > 0 && isUnit(o.unit) ? { poisha, unit: o.unit } : undefined;
}

export function sanitizeZakat(raw: unknown): ZakatState | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const base = emptyZakat();
  const c = (o.cash && typeof o.cash === "object" ? o.cash : {}) as Record<string, unknown>;
  for (const k of CASH_KEYS) base.cash[k] = money(c[k]);
  base.debtsPoisha = money(o.debtsPoisha);
  for (const h of Array.isArray(o.holdings) ? o.holdings.slice(0, MAX_HOLDINGS) : []) {
    const x = (h ?? {}) as Record<string, unknown>;
    if (!isMetal(x.metal) || !isPurity(x.purity) || !isUnit(x.unit)) continue;
    const w = typeof x.weightMilli === "number" && Number.isFinite(x.weightMilli) && x.weightMilli >= 0 ? Math.min(100_000_000, Math.round(x.weightMilli)) : 0;
    base.holdings.push({ id: str(x.id, 40) || `h${base.holdings.length}`, metal: x.metal, purity: x.purity, unit: x.unit, weightMilli: w, worn: x.worn === true, note: str(x.note, 60) });
  }
  const r = (o.rates && typeof o.rates === "object" ? o.rates : {}) as Record<string, unknown>;
  for (const m of ["gold", "silver"] as Metal[]) {
    const row = (r[m] && typeof r[m] === "object" ? r[m] : {}) as Record<string, unknown>;
    for (const p of PURITIES) { const v = sanitizeRate(row[p]); if (v) base.rates[m][p] = v; }
  }
  base.rateDate = isIsoDate(o.rateDate) ? o.rateDate : "";
  base.rateSource = str(o.rateSource, 120);
  base.basis = o.basis === "gold" ? "gold" : "silver";
  base.nisabPurity = isPurity(o.nisabPurity) ? o.nisabPurity : "22K";
  base.includeWorn = o.includeWorn !== false;
  base.hawlStart = isIsoDate(o.hawlStart) ? o.hawlStart : "";
  for (const s of Array.isArray(o.savings) ? o.savings.slice(0, MAX_SAVINGS) : []) {
    const x = (s ?? {}) as Record<string, unknown>;
    const kind: SavingsKind = x.kind === "dps" || x.kind === "sanchaypatra" || x.kind === "fdr" ? x.kind : "other";
    const rateBps = typeof x.rateBps === "number" && Number.isFinite(x.rateBps) && x.rateBps >= 0 ? Math.min(10_000, Math.round(x.rateBps)) : 0;
    base.savings.push({ id: str(x.id, 40) || `s${base.savings.length}`, kind, name: str(x.name, 60), principalPoisha: money(x.principalPoisha), rateBps, startDate: isIsoDate(x.startDate) ? x.startDate : "", maturityDate: isIsoDate(x.maturityDate) ? x.maturityDate : "" });
  }
  return base;
}
