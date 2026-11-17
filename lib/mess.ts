/*
 * Bachelor mess & shared flat ledger (মেস ও ফ্ল্যাট) for Shohoj Budget. NO imports — pure and unit-tested
 * (tests/mess.test.ts).
 *
 * Money is integer poisha. Meals are integer HALF-UNITS (0 = none, 1 = half meal, 2 = one meal … 4 = two meals),
 * so 0.5 meals never becomes a float.
 *
 * How the month settles (all of it reconciles to the poisha):
 * - Bazar is bought by members out of their own pocket; each bazar entry counts as "paid" by that member.
 * - Deposits go to the manager's cash box; each deposit counts as "paid" by that member.
 * - A shared utility is paid either by one member (counts as that member's "paid") or from the cash box.
 * - Meal cost: in "calculated" mode the whole bazar total is shared by meals eaten (own + guests hosted).
 *   Each member's exact share is bazar × theirMeals ÷ allMeals; everyone gets the floor of it, and the poisha
 *   left over go one each to the largest fractional parts (ties: roster order). So meal costs add up to the
 *   bazar total exactly. With no meals at all, the bazar is split equally (same remainder rule).
 *   In "fixed" mode each member pays rate × meals (half a meal = half the rate, rounded half up to the poisha);
 *   the difference from the real bazar total is the "fixed-rate gap" (positive = surplus kept by the mess).
 * - Utilities are split equally among active members: everyone gets the floor, and the left-over poisha go one
 *   each to the first active members in roster order.
 * - balance = paid − (meal cost + utility share). Positive: the manager gives it back. Negative: the member pays.
 * - Invariant (tested): sum(balances) = cash on hand − fixed-rate gap, where cash on hand = deposits − utilities
 *   paid from the box. So once every balance is paid or refunded, the cash box ends at exactly the fixed-rate
 *   gap (zero in calculated mode): nothing is lost or created. settlementCheck() returns that difference, 0.
 */

export const MAX_MEMBERS = 20;
export const MAX_ENTRIES = 400;
export const MAX_HISTORY = 12;
export const MAX_HALF_UNITS = 4; // two meals in one slot
export const MAX_GUEST_HALF_UNITS = 20; // ten guest meals a day from one host

export type MealSlot = 0 | 1 | 2; // breakfast, lunch, dinner
export const SLOTS: Array<{ id: MealSlot; bn: string; en: string; short: string; shortBn: string }> = [
  { id: 0, bn: "সকাল", en: "Breakfast", short: "B", shortBn: "স" },
  { id: 1, bn: "দুপুর", en: "Lunch", short: "L", shortBn: "দু" },
  { id: 2, bn: "রাত", en: "Dinner", short: "D", shortBn: "রা" },
];

export type UtilityKind = "wifi" | "gas" | "electricity" | "bua" | "other";
export const UTILITY_KINDS: Array<{ id: UtilityKind; bn: string; en: string }> = [
  { id: "wifi", bn: "ওয়াইফাই", en: "Wi-Fi" },
  { id: "gas", bn: "গ্যাস", en: "Gas" },
  { id: "electricity", bn: "বিদ্যুৎ", en: "Electricity" },
  { id: "bua", bn: "বুয়া/খালার বেতন", en: "Bua / khala salary" },
  { id: "other", bn: "অন্যান্য", en: "Other" },
];

export interface MessMember { id: string; name: string; active: boolean }
/** One member's meals on one day: slots in half-units, plus guest meals they hosted (half-units). */
export interface MealDay { date: string; member: string; slots: [number, number, number]; guests: number }
export interface BazarEntry { id: string; date: string; by: string; amountPoisha: number; note: string }
export interface Deposit { id: string; date: string; by: string; amountPoisha: number }
export interface Utility { id: string; kind: UtilityKind; amountPoisha: number; paidBy: string | null; note: string }
export interface ClosedCycle { start: string; end: string; sheet: string; mealRatePoisha: number; closedOn: string }

export interface MessState {
  members: MessMember[];
  closeDay: number; // 1–28: the cycle starts on this day of the month
  cycleStart: string; // YYYY-MM-DD
  mealMode: "calculated" | "fixed";
  fixedRatePoisha: number; // per full meal, fixed mode
  rotaOffset: number; // shifts today's bazar duty (skip / swap)
  meals: MealDay[];
  bazar: BazarEntry[];
  deposits: Deposit[];
  utilities: Utility[];
  history: ClosedCycle[];
}

// ---------------------------------------------------------------------------------------------
// Dates (calendar math on YYYY-MM-DD, no time zones)
// ---------------------------------------------------------------------------------------------
const ISO = /^\d{4}-\d{2}-\d{2}$/;
export function isIsoDate(v: unknown): v is string {
  if (typeof v !== "string" || !ISO.test(v)) return false;
  const [y, m, d] = v.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1, d));
  return t.getUTCFullYear() === y && t.getUTCMonth() === m - 1 && t.getUTCDate() === d;
}
const toNum = (iso: string) => { const [y, m, d] = iso.split("-").map(Number); return Date.UTC(y, m - 1, d) / 86_400_000; };
const fromNum = (n: number) => new Date(n * 86_400_000).toISOString().slice(0, 10);
export const addDays = (iso: string, days: number) => fromNum(toNum(iso) + days);
export const daysBetween = (a: string, b: string) => toNum(b) - toNum(a);
const ymd = (y: number, m: number, d: number) => fromNum(Date.UTC(y, m, d) / 86_400_000); // m is 0-based, may overflow

export const clampCloseDay = (n: unknown) => (typeof n === "number" && Number.isInteger(n) ? Math.min(28, Math.max(1, n)) : 1);

/** The cycle containing `today`: from the close day of this (or the previous) month to the day before the next. */
export function cycleFor(today: string, closeDay: number): { start: string; end: string } {
  const cd = clampCloseDay(closeDay);
  const [y, m, d] = today.split("-").map(Number);
  const start = d >= cd ? ymd(y, m - 1, cd) : ymd(y, m - 2, cd);
  const [sy, sm] = start.split("-").map(Number);
  return { start, end: addDays(ymd(sy, sm, cd), -1) };
}
/** End of the cycle that begins on `start`. */
export function cycleEnd(start: string, closeDay: number): string {
  const [y, m] = start.split("-").map(Number);
  return addDays(ymd(y, m, clampCloseDay(closeDay)), -1);
}
export const cycleDays = (start: string, end: string): string[] =>
  Array.from({ length: Math.max(0, daysBetween(start, end) + 1) }, (_, i) => addDays(start, i));
export const inCycle = (date: string, start: string, end: string) => date >= start && date <= end;

// ---------------------------------------------------------------------------------------------
// Money helpers
// ---------------------------------------------------------------------------------------------
/** Parse "1,450", "১৪৫০.৫০" or "1450" taka into poisha. null when not a positive amount under 1 crore. */
export function parseTaka(raw: string): number | null {
  const ascii = String(raw ?? "").replace(/[০-৯]/g, (c) => String("০১২৩৪৫৬৭৮৯".indexOf(c))).replace(/[,\s৳]/g, "").replace(/টাকা|tk/gi, "");
  if (!/^\d+(\.\d{1,2})?$/.test(ascii)) return null;
  const p = Math.round(Number(ascii) * 100);
  return p > 0 && p < 10_000_000_00 ? p : null;
}

const BN = "০১২৩৪৫৬৭৮৯";
export const bnDigits = (s: string | number) => String(s).replace(/\d/g, (d) => BN[Number(d)]);

/** South Asian grouping: 12,50,000. */
function groupLakh(intStr: string): string {
  if (intStr.length <= 3) return intStr;
  const last3 = intStr.slice(-3);
  const rest = intStr.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ",");
  return `${rest},${last3}`;
}
/** ৳12,50,000.50 or ৳১২,৫০,০০০.৫০ (paisa only when not zero). */
export function takaText(poisha: number, bn = true): string {
  const neg = poisha < 0;
  const abs = Math.abs(Math.round(poisha));
  const whole = groupLakh(String(Math.floor(abs / 100)));
  const frac = abs % 100;
  const s = `${neg ? "−" : ""}৳${whole}${frac ? `.${String(frac).padStart(2, "0")}` : ""}`;
  return bn ? bnDigits(s) : s;
}
/** 3 half-units → "1.5". */
export const mealsText = (half: number, bn = true) => {
  const s = half % 2 ? `${Math.floor(half / 2)}.5` : String(half / 2);
  return bn ? bnDigits(s) : s;
};

/** Split `total` into parts proportional to `weights` (integers ≥ 0), summing to `total` exactly.
 * Floor each exact share; the left-over units go one each to the largest fractional parts, ties by index. */
export function apportion(total: number, weights: number[]): number[] {
  const sum = weights.reduce((a, b) => a + b, 0);
  if (!weights.length) return [];
  if (sum <= 0) return apportion(total, weights.map(() => 1));
  const exact = weights.map((w) => (total * w) / sum);
  const out = exact.map(Math.floor);
  let left = total - out.reduce((a, b) => a + b, 0);
  const order = exact.map((e, i) => ({ i, frac: e - Math.floor(e) })).sort((a, b) => b.frac - a.frac || a.i - b.i);
  for (let k = 0; left > 0 && k < order.length; k++, left--) out[order[k].i] += 1;
  return out;
}

// ---------------------------------------------------------------------------------------------
// Meals and rota
// ---------------------------------------------------------------------------------------------
export const clampHalf = (n: unknown, max = MAX_HALF_UNITS) => (typeof n === "number" && Number.isFinite(n) ? Math.min(max, Math.max(0, Math.round(n))) : 0);

/** Set one member's slot on one day (half-units). Removes the row when it becomes empty. */
export function setMeal(meals: MealDay[], date: string, member: string, slot: MealSlot, half: number): MealDay[] {
  const rest = meals.filter((x) => !(x.date === date && x.member === member));
  const cur = meals.find((x) => x.date === date && x.member === member) ?? { date, member, slots: [0, 0, 0] as [number, number, number], guests: 0 };
  const slots = [...cur.slots] as [number, number, number];
  slots[slot] = clampHalf(half);
  const row = { ...cur, slots };
  return row.slots.some(Boolean) || row.guests ? [...rest, row] : rest;
}
export function setGuests(meals: MealDay[], date: string, member: string, half: number): MealDay[] {
  const rest = meals.filter((x) => !(x.date === date && x.member === member));
  const cur = meals.find((x) => x.date === date && x.member === member) ?? { date, member, slots: [0, 0, 0] as [number, number, number], guests: 0 };
  const row = { ...cur, guests: clampHalf(half, MAX_GUEST_HALF_UNITS) };
  return row.slots.some(Boolean) || row.guests ? [...rest, row] : rest;
}
export const dayHalfUnits = (m: MealDay) => m.slots[0] + m.slots[1] + m.slots[2] + m.guests;

/** Who does the bazar on `date`: active members in roster order, one per day from the cycle start. */
export function dutyFor(state: Pick<MessState, "members" | "cycleStart" | "rotaOffset">, date: string): MessMember | null {
  const active = state.members.filter((m) => m.active);
  if (!active.length) return null;
  const n = active.length;
  const idx = (((daysBetween(state.cycleStart, date) + state.rotaOffset) % n) + n) % n;
  return active[idx];
}

// ---------------------------------------------------------------------------------------------
// Settlement
// ---------------------------------------------------------------------------------------------
export interface MemberLine {
  id: string;
  name: string;
  active: boolean;
  mealHalfUnits: number; // own + guests hosted
  guestHalfUnits: number;
  mealCostPoisha: number;
  utilityPoisha: number;
  bazarPaidPoisha: number;
  depositPoisha: number;
  utilityPaidPoisha: number;
  paidPoisha: number;
  balancePoisha: number; // + gets back, − owes
}
export interface Settlement {
  start: string;
  end: string;
  lines: MemberLine[];
  totalMealHalfUnits: number;
  bazarPoisha: number;
  depositsPoisha: number;
  utilitiesPoisha: number;
  utilitiesFromBoxPoisha: number;
  mealChargesPoisha: number;
  mealRatePoisha: number; // per full meal (calculated: bazar ÷ meals, rounded half up; display only)
  cashOnHandPoisha: number; // deposits − utilities paid from the cash box
  fixedGapPoisha: number; // fixed mode: meal charges − bazar (surplus kept by the mess); 0 in calculated mode
}

export function settle(state: MessState, end = cycleEnd(state.cycleStart, state.closeDay)): Settlement {
  const start = state.cycleStart;
  const inside = <T extends { date: string }>(xs: T[]) => xs.filter((x) => inCycle(x.date, start, end));
  const members = state.members;
  const ids = new Set(members.map((m) => m.id));
  const meals = inside(state.meals).filter((m) => ids.has(m.member));
  const bazar = inside(state.bazar).filter((b) => ids.has(b.by));
  const deposits = inside(state.deposits).filter((d) => ids.has(d.by));
  const utilities = state.utilities;

  const half = members.map((m) => meals.filter((x) => x.member === m.id).reduce((a, x) => a + dayHalfUnits(x), 0));
  const guests = members.map((m) => meals.filter((x) => x.member === m.id).reduce((a, x) => a + x.guests, 0));
  const totalHalf = half.reduce((a, b) => a + b, 0);
  const bazarPoisha = bazar.reduce((a, b) => a + b.amountPoisha, 0);

  let mealCost: number[];
  if (state.mealMode === "fixed") {
    mealCost = half.map((h) => Math.floor((state.fixedRatePoisha * h + 1) / 2)); // rate × h/2, half poisha rounds up
  } else {
    mealCost = totalHalf > 0 ? apportion(bazarPoisha, half) : apportion(bazarPoisha, members.map((m) => (m.active ? 1 : 0)));
  }
  const utilitiesPoisha = utilities.reduce((a, u) => a + u.amountPoisha, 0);
  const activeIdx = members.map((m, i) => (m.active ? i : -1)).filter((i) => i >= 0);
  const utilShare = members.map(() => 0);
  if (activeIdx.length) {
    const n = activeIdx.length;
    const base = Math.floor(utilitiesPoisha / n);
    let left = utilitiesPoisha - base * n;
    for (const i of activeIdx) { utilShare[i] = base + (left > 0 ? 1 : 0); if (left > 0) left--; }
  }
  const lines: MemberLine[] = members.map((m, i) => {
    const bazarPaid = bazar.filter((b) => b.by === m.id).reduce((a, b) => a + b.amountPoisha, 0);
    const dep = deposits.filter((d) => d.by === m.id).reduce((a, d) => a + d.amountPoisha, 0);
    const utilPaid = utilities.filter((u) => u.paidBy === m.id).reduce((a, u) => a + u.amountPoisha, 0);
    const paid = bazarPaid + dep + utilPaid;
    return {
      id: m.id, name: m.name, active: m.active, mealHalfUnits: half[i], guestHalfUnits: guests[i],
      mealCostPoisha: mealCost[i], utilityPoisha: utilShare[i],
      bazarPaidPoisha: bazarPaid, depositPoisha: dep, utilityPaidPoisha: utilPaid, paidPoisha: paid,
      balancePoisha: paid - mealCost[i] - utilShare[i],
    };
  });
  const depositsPoisha = deposits.reduce((a, d) => a + d.amountPoisha, 0);
  const utilitiesFromBoxPoisha = utilities.filter((u) => !u.paidBy || !ids.has(u.paidBy)).reduce((a, u) => a + u.amountPoisha, 0);
  const mealChargesPoisha = mealCost.reduce((a, b) => a + b, 0);
  const mealRatePoisha = state.mealMode === "fixed" ? state.fixedRatePoisha : totalHalf > 0 ? Math.round((bazarPoisha * 2) / totalHalf) : 0;
  return {
    start, end, lines, totalMealHalfUnits: totalHalf, bazarPoisha, depositsPoisha, utilitiesPoisha, utilitiesFromBoxPoisha,
    mealChargesPoisha, mealRatePoisha,
    cashOnHandPoisha: depositsPoisha - utilitiesFromBoxPoisha,
    fixedGapPoisha: state.mealMode === "fixed" ? mealChargesPoisha - bazarPoisha : 0,
  };
}

/** 0 when the settlement reconciles: sum(balances) − (cash on hand − fixed-rate gap). */
export const settlementCheck = (s: Settlement) =>
  s.lines.reduce((a, l) => a + l.balancePoisha, 0) - (s.cashOnHandPoisha - s.fixedGapPoisha);

/** Plain-text month-end sheet to paste into the mess group. */
export function settlementText(s: Settlement, lang: "bn" | "en" = "bn"): string {
  const bn = lang === "bn";
  const t = (p: number) => takaText(p, bn);
  const d = (x: string) => (bn ? bnDigits(x) : x);
  const out = [
    bn ? `মেসের মাসিক হিসাব: ${d(s.start)} থেকে ${d(s.end)}` : `Mess settlement: ${s.start} to ${s.end}`,
    bn ? `মোট বাজার ${t(s.bazarPoisha)} · মোট মিল ${mealsText(s.totalMealHalfUnits, bn)} · মিল রেট ${t(s.mealRatePoisha)}` : `Bazar ${t(s.bazarPoisha)} · meals ${mealsText(s.totalMealHalfUnits, bn)} · meal rate ${t(s.mealRatePoisha)}`,
    bn ? `মোট বিল (ভাগ সমান) ${t(s.utilitiesPoisha)} · জমা ${t(s.depositsPoisha)}` : `Shared bills (split equally) ${t(s.utilitiesPoisha)} · deposits ${t(s.depositsPoisha)}`,
    "",
  ];
  for (const l of s.lines) {
    if (!l.mealHalfUnits && !l.paidPoisha && !l.utilityPoisha && !l.mealCostPoisha) continue;
    const verdict = l.balancePoisha > 0 ? (bn ? `ফেরত পাবেন ${t(l.balancePoisha)}` : `gets back ${t(l.balancePoisha)}`)
      : l.balancePoisha < 0 ? (bn ? `দেবেন ${t(-l.balancePoisha)}` : `pays ${t(-l.balancePoisha)}`) : (bn ? "হিসাব সমান" : "settled");
    out.push(bn
      ? `${l.name}: মিল ${mealsText(l.mealHalfUnits, bn)}${l.guestHalfUnits ? ` (অতিথি ${mealsText(l.guestHalfUnits, bn)})` : ""}, মিল খরচ ${t(l.mealCostPoisha)}, বিলের ভাগ ${t(l.utilityPoisha)}, দিয়েছেন ${t(l.paidPoisha)} → ${verdict}`
      : `${l.name}: meals ${mealsText(l.mealHalfUnits, bn)}${l.guestHalfUnits ? ` (guests ${mealsText(l.guestHalfUnits, bn)})` : ""}, meal cost ${t(l.mealCostPoisha)}, bills ${t(l.utilityPoisha)}, paid ${t(l.paidPoisha)} → ${verdict}`);
  }
  out.push("");
  out.push(bn ? `ম্যানেজারের কাছে নগদ ${t(s.cashOnHandPoisha)}` : `Cash with the manager ${t(s.cashOnHandPoisha)}`);
  if (s.fixedGapPoisha) out.push(bn ? `নির্দিষ্ট রেটে উদ্বৃত্ত (মেস তহবিলে থাকবে) ${t(s.fixedGapPoisha)}` : `Fixed-rate surplus (stays in the mess fund) ${t(s.fixedGapPoisha)}`);
  out.push(bn ? "নিজেদের লেখা হিসাব, KormoPath সহজ বাজেট (মেস ও ফ্ল্যাট)। মিলিয়ে দেখুন।" : "Self-recorded by the mess in KormoPath Shohoj Budget (Mess & flat). Please check.");
  return out.join("\n");
}

// ---------------------------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------------------------
export function emptyMess(today: string, closeDay = 1): MessState {
  return {
    members: [], closeDay: clampCloseDay(closeDay), cycleStart: cycleFor(today, closeDay).start, mealMode: "calculated",
    fixedRatePoisha: 0, rotaOffset: 0, meals: [], bazar: [], deposits: [], utilities: [], history: [],
  };
}

/** Close the current cycle: keep its sheet in history and start the next cycle with an empty book. Members stay. */
export function closeCycle(state: MessState, closedOn: string, lang: "bn" | "en" = "bn"): MessState {
  const s = settle(state);
  const nextStart = addDays(s.end, 1);
  const keep = <T extends { date: string }>(xs: T[]) => xs.filter((x) => x.date > s.end);
  return {
    ...state,
    cycleStart: nextStart,
    rotaOffset: 0,
    meals: keep(state.meals),
    bazar: keep(state.bazar),
    deposits: keep(state.deposits),
    utilities: [],
    history: [{ start: s.start, end: s.end, sheet: settlementText(s, lang), mealRatePoisha: s.mealRatePoisha, closedOn }, ...state.history].slice(0, MAX_HISTORY),
  };
}

const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const id = (v: unknown) => (typeof v === "string" && /^[A-Za-z0-9_-]{1,40}$/.test(v) ? v : null);
const money = (v: unknown) => (typeof v === "number" && Number.isInteger(v) && v > 0 && v < 10_000_000_00 ? v : null);
const arr = (v: unknown) => (Array.isArray(v) ? v : []);

export function sanitizeMess(raw: unknown): MessState | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (!isIsoDate(o.cycleStart)) return null;
  const members: MessMember[] = [];
  for (const m of arr(o.members)) {
    const x = (m ?? {}) as Record<string, unknown>;
    const mid = id(x.id); const name = str(x.name, 40);
    if (!mid || !name || members.some((y) => y.id === mid)) continue;
    members.push({ id: mid, name, active: x.active !== false });
    if (members.length >= MAX_MEMBERS) break;
  }
  const ids = new Set(members.map((m) => m.id));
  const meals: MealDay[] = [];
  const seen = new Set<string>();
  for (const m of arr(o.meals)) {
    const x = (m ?? {}) as Record<string, unknown>;
    const member = id(x.member);
    if (!isIsoDate(x.date) || !member || !ids.has(member) || seen.has(`${x.date}|${member}`)) continue;
    const s = arr(x.slots);
    const slots: [number, number, number] = [clampHalf(s[0]), clampHalf(s[1]), clampHalf(s[2])];
    const guests = clampHalf(x.guests, MAX_GUEST_HALF_UNITS);
    if (!slots.some(Boolean) && !guests) continue;
    seen.add(`${x.date}|${member}`);
    meals.push({ date: x.date, member, slots, guests });
    if (meals.length >= MAX_MEMBERS * 62) break;
  }
  const bazar: BazarEntry[] = [];
  for (const b of arr(o.bazar)) {
    const x = (b ?? {}) as Record<string, unknown>;
    const bid = id(x.id); const by = id(x.by); const amt = money(x.amountPoisha);
    if (!bid || !by || !ids.has(by) || !isIsoDate(x.date) || amt === null) continue;
    bazar.push({ id: bid, date: x.date, by, amountPoisha: amt, note: str(x.note, 80) });
    if (bazar.length >= MAX_ENTRIES) break;
  }
  const deposits: Deposit[] = [];
  for (const d of arr(o.deposits)) {
    const x = (d ?? {}) as Record<string, unknown>;
    const did = id(x.id); const by = id(x.by); const amt = money(x.amountPoisha);
    if (!did || !by || !ids.has(by) || !isIsoDate(x.date) || amt === null) continue;
    deposits.push({ id: did, date: x.date, by, amountPoisha: amt });
    if (deposits.length >= MAX_ENTRIES) break;
  }
  const kinds = new Set(UTILITY_KINDS.map((k) => k.id));
  const utilities: Utility[] = [];
  for (const u of arr(o.utilities)) {
    const x = (u ?? {}) as Record<string, unknown>;
    const uid = id(x.id); const amt = money(x.amountPoisha);
    if (!uid || amt === null || !kinds.has(x.kind as UtilityKind)) continue;
    const paidBy = id(x.paidBy);
    utilities.push({ id: uid, kind: x.kind as UtilityKind, amountPoisha: amt, paidBy: paidBy && ids.has(paidBy) ? paidBy : null, note: str(x.note, 60) });
    if (utilities.length >= 40) break;
  }
  const history: ClosedCycle[] = [];
  for (const h of arr(o.history)) {
    const x = (h ?? {}) as Record<string, unknown>;
    if (!isIsoDate(x.start) || !isIsoDate(x.end) || !isIsoDate(x.closedOn) || typeof x.sheet !== "string") continue;
    history.push({ start: x.start, end: x.end, closedOn: x.closedOn, sheet: x.sheet.slice(0, 8000), mealRatePoisha: typeof x.mealRatePoisha === "number" && Number.isInteger(x.mealRatePoisha) && x.mealRatePoisha >= 0 ? x.mealRatePoisha : 0 });
    if (history.length >= MAX_HISTORY) break;
  }
  const rota = typeof o.rotaOffset === "number" && Number.isInteger(o.rotaOffset) ? ((o.rotaOffset % 1000) + 1000) % 1000 : 0;
  return {
    members, closeDay: clampCloseDay(o.closeDay), cycleStart: o.cycleStart,
    mealMode: o.mealMode === "fixed" ? "fixed" : "calculated",
    fixedRatePoisha: typeof o.fixedRatePoisha === "number" && Number.isInteger(o.fixedRatePoisha) && o.fixedRatePoisha >= 0 && o.fixedRatePoisha < 100_000_00 ? o.fixedRatePoisha : 0,
    rotaOffset: rota, meals, bazar, deposits, utilities, history,
  };
}
