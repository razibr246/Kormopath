/*
 * Smart bazar list and personal price tracker (বাজারের তালিকা). NO imports — pure and unit-tested
 * (tests/bazar.test.ts). Money is integer poisha.
 *
 * Every price here is one the user paid and typed in. Nothing in this module knows a market price:
 * the price history, averages and month-on-month change come only from the user's own entries.
 */

export type BazarUnit = "kg" | "g" | "litre" | "piece" | "dozen" | "hali";
export type BaseUnit = "kg" | "litre" | "piece";

export const BAZAR_UNITS: Array<{ id: BazarUnit; bn: string; en: string }> = [
  { id: "kg", bn: "কেজি", en: "kg" },
  { id: "g", bn: "গ্রাম", en: "g" },
  { id: "litre", bn: "লিটার", en: "litre" },
  { id: "piece", bn: "পিস", en: "piece" },
  { id: "dozen", bn: "ডজন", en: "dozen" },
  { id: "hali", bn: "হালি", en: "hali (4)" },
];
const UNIT_IDS = new Set<string>(BAZAR_UNITS.map((u) => u.id));

/** Quick-add chips: names and a usual unit only, never a price. */
export const QUICK_ITEMS: Array<{ bn: string; en: string; unit: BazarUnit }> = [
  { bn: "চাল", en: "Rice", unit: "kg" },
  { bn: "ডাল", en: "Lentils", unit: "kg" },
  { bn: "তেল", en: "Oil", unit: "litre" },
  { bn: "পেঁয়াজ", en: "Onion", unit: "kg" },
  { bn: "আলু", en: "Potato", unit: "kg" },
  { bn: "ডিম", en: "Eggs", unit: "hali" },
  { bn: "মাছ", en: "Fish", unit: "kg" },
  { bn: "মুরগি", en: "Chicken", unit: "kg" },
  { bn: "সবজি", en: "Vegetables", unit: "kg" },
];

/** g → kg, hali = 4 pieces, dozen = 12 pieces. */
export function toBase(qty: number, unit: BazarUnit): { qty: number; unit: BaseUnit } {
  switch (unit) {
    case "g": return { qty: qty / 1000, unit: "kg" };
    case "kg": return { qty, unit: "kg" };
    case "litre": return { qty, unit: "litre" };
    case "hali": return { qty: qty * 4, unit: "piece" };
    case "dozen": return { qty: qty * 12, unit: "piece" };
    default: return { qty, unit: "piece" };
  }
}

/** Price per base unit (per kg / per litre / per piece) in poisha, rounded; null when the quantity is not usable. */
export function unitPricePoisha(pricePoisha: number, qty: number, unit: BazarUnit): number | null {
  const b = toBase(qty, unit);
  if (!(b.qty > 0) || !Number.isFinite(pricePoisha) || pricePoisha < 0) return null;
  return Math.round(pricePoisha / b.qty);
}

/** Matching key for an item name: NFC (Bangla can be one codepoint or two), lower case, single spaces. */
export const itemKey = (name: string): string => name.normalize("NFC").toLowerCase().replace(/\s+/g, " ").trim();

export interface BazarItem {
  id: string;
  name: string;
  qty: number;
  unit: BazarUnit;
  checked: boolean;
  pricePoisha: number | null; // what was paid for this line, entered when it is ticked
}

export interface PriceEntry {
  key: string;
  name: string;
  date: string; // YYYY-MM-DD
  qty: number;
  unit: BazarUnit;
  pricePoisha: number;
}

export interface BazarState {
  items: BazarItem[];
  history: PriceEntry[];
}

export const EMPTY_BAZAR: BazarState = { items: [], history: [] };
export const MAX_ITEMS = 80;
export const MAX_HISTORY = 1000;

/** Sum of the ticked lines that have a price. */
export function tripTotal(items: BazarItem[]): number {
  return items.reduce((s, i) => s + (i.checked && i.pricePoisha !== null ? i.pricePoisha : 0), 0);
}

/**
 * Close a shopping trip: the ticked, priced lines go into the price history and leave the list; the rest stay.
 * Returns the total and a short note for a draft expense. It does not record an expense: the page hands the
 * draft to the ledger, where the user confirms it.
 */
export function finishTrip(state: BazarState, date: string): { state: BazarState; totalPoisha: number; note: string; count: number } {
  const done = state.items.filter((i) => i.checked && i.pricePoisha !== null);
  const entries: PriceEntry[] = done.map((i) => ({ key: itemKey(i.name), name: i.name.normalize("NFC").trim(), date, qty: i.qty, unit: i.unit, pricePoisha: i.pricePoisha as number }));
  const names = done.map((i) => i.name.trim());
  const note = names.length ? `বাজার: ${names.slice(0, 5).join(", ")}${names.length > 5 ? ` +${names.length - 5}` : ""}` : "";
  return {
    state: { items: state.items.filter((i) => !(i.checked && i.pricePoisha !== null)), history: [...state.history, ...entries].slice(-MAX_HISTORY) },
    totalPoisha: tripTotal(state.items),
    note,
    count: done.length,
  };
}

const dayNum = (iso: string) => { const [y, m, d] = iso.split("-").map(Number); return Date.UTC(y, m - 1, d) / 86_400_000; };
const avg = (xs: number[]) => (xs.length ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) : null);
const prevMonth = (month: string) => { const [y, m] = month.split("-").map(Number); return m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, "0")}`; };

export interface PriceStats {
  key: string;
  name: string;
  unit: BaseUnit;
  entries: number;
  lastPoisha: number;     // per base unit, most recent entry
  lastDate: string;
  avg30Poisha: number | null; // per base unit, entries within the last 30 days
  thisMonthPoisha: number | null;
  prevMonthPoisha: number | null;
  changePct: number | null; // this month's average vs the previous month's, one decimal
}

/**
 * Personal price history, one row per item and base unit (an item bought by the piece and by the kg gives two
 * rows, never a mixed average). Only the user's own entries are used.
 */
export function priceStats(history: PriceEntry[], today: string): PriceStats[] {
  const groups = new Map<string, Array<{ e: PriceEntry; per: number; base: BaseUnit }>>();
  for (const e of history) {
    const per = unitPricePoisha(e.pricePoisha, e.qty, e.unit);
    if (per === null) continue;
    const base = toBase(e.qty, e.unit).unit;
    const k = `${e.key}|${base}`;
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k)!.push({ e, per, base });
  }
  const month = today.slice(0, 7), prev = prevMonth(month), t = dayNum(today);
  const out: PriceStats[] = [];
  for (const rows of groups.values()) {
    rows.sort((a, b) => a.e.date.localeCompare(b.e.date));
    const last = rows[rows.length - 1];
    const thisM = avg(rows.filter((r) => r.e.date.startsWith(month)).map((r) => r.per));
    const prevM = avg(rows.filter((r) => r.e.date.startsWith(prev)).map((r) => r.per));
    out.push({
      key: last.e.key, name: last.e.name, unit: last.base, entries: rows.length,
      lastPoisha: last.per, lastDate: last.e.date,
      avg30Poisha: avg(rows.filter((r) => { const d = t - dayNum(r.e.date); return d >= 0 && d < 30; }).map((r) => r.per)),
      thisMonthPoisha: thisM, prevMonthPoisha: prevM,
      changePct: thisM !== null && prevM ? Math.round(((thisM - prevM) / prevM) * 1000) / 10 : null,
    });
  }
  return out.sort((a, b) => b.lastDate.localeCompare(a.lastDate) || a.name.localeCompare(b.name));
}

const ISO = /^\d{4}-\d{2}-\d{2}$/;
const str = (v: unknown, max: number) => (typeof v === "string" ? v.normalize("NFC").trim().slice(0, max) : "");
const posNum = (v: unknown, max: number) => (typeof v === "number" && Number.isFinite(v) && v > 0 && v <= max ? v : null);
const poisha = (v: unknown) => (typeof v === "number" && Number.isInteger(v) && v >= 0 && v <= 100_000_000 ? v : null);

export function sanitizeBazar(raw: unknown): BazarState | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const items: BazarItem[] = [];
  for (const x of Array.isArray(o.items) ? o.items : []) {
    if (!x || typeof x !== "object") continue;
    const i = x as Record<string, unknown>;
    const name = str(i.name, 60), qty = posNum(i.qty, 10_000), id = str(i.id, 40);
    if (!name || !qty || !id || !UNIT_IDS.has(i.unit as string)) continue;
    items.push({ id, name, qty, unit: i.unit as BazarUnit, checked: i.checked === true, pricePoisha: poisha(i.pricePoisha) });
    if (items.length >= MAX_ITEMS) break;
  }
  const history: PriceEntry[] = [];
  for (const x of Array.isArray(o.history) ? o.history : []) {
    if (!x || typeof x !== "object") continue;
    const e = x as Record<string, unknown>;
    const name = str(e.name, 60), qty = posNum(e.qty, 10_000), p = poisha(e.pricePoisha);
    if (!name || !qty || p === null || typeof e.date !== "string" || !ISO.test(e.date) || !UNIT_IDS.has(e.unit as string)) continue;
    history.push({ key: itemKey(name), name, date: e.date, qty, unit: e.unit as BazarUnit, pricePoisha: p });
  }
  return { items, history: history.slice(-MAX_HISTORY) };
}
