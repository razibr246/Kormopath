/*
 * Smart bazar list and personal price tracker (বাজারের তালিকা). NO imports — pure and unit-tested
 * (tests/bazar.test.ts). Money is integer poisha.
 *
 * Every price here is one the user paid and typed in. Nothing in this module knows a market price:
 * the price history, averages and month-on-month change come only from the user's own entries.
 */

export type BazarUnit = "kg" | "g" | "litre" | "piece" | "dozen" | "hali";
export type BaseUnit = "kg" | "litre" | "piece";

export type StorePlatform = "daraz" | "rokomari" | "chaldal" | "shwapno" | "tcb";

export type BazarCategory = "grocery" | "produce" | "fish_meat" | "books_stationery" | "gadgets_home";

export const BAZAR_UNITS: Array<{ id: BazarUnit; bn: string; en: string }> = [
  { id: "kg", bn: "কেজি", en: "kg" },
  { id: "g", bn: "গ্রাম", en: "g" },
  { id: "litre", bn: "লিটার", en: "litre" },
  { id: "piece", bn: "পিস", en: "piece" },
  { id: "dozen", bn: "ডজন", en: "dozen" },
  { id: "hali", bn: "হালি", en: "hali (4)" },
];
const UNIT_IDS = new Set<string>(BAZAR_UNITS.map((u) => u.id));

export const STORE_PLATFORMS: Record<StorePlatform, { name: string; labelBn: string; color: string; noteBn: string }> = {
  daraz: { name: "Daraz", labelBn: "দারাজ", color: "sky", noteBn: "ইলেকট্রনিক্স ও গ্যাজেট" },
  rokomari: { name: "Rokomari", labelBn: "রকমারি", color: "emerald", noteBn: "বই ও শিক্ষা উপকরণ" },
  chaldal: { name: "Chaldal", labelBn: "চালডাল", color: "rose", noteBn: "গ্রোসারি ও তাজা খাবার" },
  shwapno: { name: "Shwapno", labelBn: "স্বপ্ন", color: "amber", noteBn: "সুপারশপ সামগ্রী" },
  tcb: { name: "TCB", labelBn: "টিসিবি দর", color: "indigo", noteBn: "সরকারি ন্যায্যমূল্য" },
};

export interface CatalogItem {
  id: string;
  nameBn: string;
  nameEn: string;
  category: BazarCategory;
  defaultQty: number;
  unit: BazarUnit;
  primaryStore: StorePlatform;
  secondaryStore?: StorePlatform;
}

export const POPULAR_STORE_ITEMS: CatalogItem[] = [
  // Groceries & Staples
  { id: "c-miniket", nameBn: "মিনিকেট চাল", nameEn: "Miniket Rice", category: "grocery", defaultQty: 5, unit: "kg", primaryStore: "chaldal", secondaryStore: "shwapno" },
  { id: "c-nazirshail", nameBn: "নাজিরশাইল চাল", nameEn: "Nazirshail Rice", category: "grocery", defaultQty: 5, unit: "kg", primaryStore: "chaldal", secondaryStore: "shwapno" },
  { id: "c-lentils", nameBn: "মসুর ডাল", nameEn: "Red Lentils", category: "grocery", defaultQty: 1, unit: "kg", primaryStore: "chaldal", secondaryStore: "shwapno" },
  { id: "c-oil", nameBn: "সয়াবিন তেল", nameEn: "Soybean Oil", category: "grocery", defaultQty: 2, unit: "litre", primaryStore: "chaldal", secondaryStore: "shwapno" },
  { id: "c-sugar", nameBn: "চিনি", nameEn: "Sugar", category: "grocery", defaultQty: 1, unit: "kg", primaryStore: "chaldal", secondaryStore: "shwapno" },
  { id: "c-salt", nameBn: "আয়োডিনযুক্ত লবণ", nameEn: "Iodized Salt", category: "grocery", defaultQty: 1, unit: "kg", primaryStore: "chaldal", secondaryStore: "shwapno" },
  { id: "c-flour", nameBn: "প্যাকেট আটা", nameEn: "Atta / Flour", category: "grocery", defaultQty: 2, unit: "kg", primaryStore: "chaldal", secondaryStore: "shwapno" },
  { id: "c-ghee", nameBn: "গাওয়া ঘি", nameEn: "Pure Ghee", category: "grocery", defaultQty: 250, unit: "g", primaryStore: "chaldal", secondaryStore: "daraz" },

  // Fresh Produce & Fish/Meat
  { id: "p-potato", nameBn: "গোল আলু", nameEn: "Potato", category: "produce", defaultQty: 2, unit: "kg", primaryStore: "chaldal", secondaryStore: "shwapno" },
  { id: "p-onion", nameBn: "দেশি পেঁয়াজ", nameEn: "Local Onion", category: "produce", defaultQty: 1, unit: "kg", primaryStore: "chaldal", secondaryStore: "shwapno" },
  { id: "p-garlic", nameBn: "রসুন", nameEn: "Garlic", category: "produce", defaultQty: 500, unit: "g", primaryStore: "chaldal", secondaryStore: "shwapno" },
  { id: "p-ginger", nameBn: "আদা", nameEn: "Ginger", category: "produce", defaultQty: 250, unit: "g", primaryStore: "chaldal", secondaryStore: "shwapno" },
  { id: "p-egg", nameBn: "লাল ডিম", nameEn: "Farm Eggs", category: "produce", defaultQty: 2, unit: "hali", primaryStore: "chaldal", secondaryStore: "shwapno" },
  { id: "p-fish", nameBn: "রুই মাছ", nameEn: "Rui Fish", category: "fish_meat", defaultQty: 1, unit: "kg", primaryStore: "chaldal", secondaryStore: "shwapno" },
  { id: "p-chicken", nameBn: "ব্রয়লার মুরগি", nameEn: "Broiler Chicken", category: "fish_meat", defaultQty: 1, unit: "kg", primaryStore: "chaldal", secondaryStore: "shwapno" },
  { id: "p-beef", nameBn: "গরুর মাংস", nameEn: "Beef (Bone-in)", category: "fish_meat", defaultQty: 1, unit: "kg", primaryStore: "chaldal", secondaryStore: "shwapno" },

  // Books & Stationery (Rokomari Benchmark)
  { id: "b-notebook", nameBn: "A4 প্র্যাকটিস খাতা", nameEn: "A4 Exercise Book", category: "books_stationery", defaultQty: 3, unit: "piece", primaryStore: "rokomari", secondaryStore: "daraz" },
  { id: "b-pens", nameBn: "কালো কালির বলপেন বক্স", nameEn: "Black Ballpen Box", category: "books_stationery", defaultQty: 1, unit: "piece", primaryStore: "rokomari", secondaryStore: "daraz" },
  { id: "b-calc", nameBn: "Casio fx-991EX ক্যালকুলেটর", nameEn: "Casio Scientific Calculator", category: "books_stationery", defaultQty: 1, unit: "piece", primaryStore: "rokomari", secondaryStore: "daraz" },
  { id: "b-guide", nameBn: "ভর্তি প্রশ্নব্যাংক ও গাইড", nameEn: "Admission Question Bank", category: "books_stationery", defaultQty: 1, unit: "piece", primaryStore: "rokomari", secondaryStore: "daraz" },
  { id: "b-ielts", nameBn: "Cambridge IELTS টেস্ট বুক", nameEn: "Cambridge IELTS Prep Book", category: "books_stationery", defaultQty: 1, unit: "piece", primaryStore: "rokomari", secondaryStore: "daraz" },

  // Gadgets & Household (Daraz Benchmark)
  { id: "g-led", nameBn: "LED লাইট বাল্ব", nameEn: "LED Light Bulb", category: "gadgets_home", defaultQty: 2, unit: "piece", primaryStore: "daraz", secondaryStore: "chaldal" },
  { id: "g-multi", nameBn: "মাল্টিপ্লাগ এক্সটেনশন সকেট", nameEn: "Power Extension Multiplug", category: "gadgets_home", defaultQty: 1, unit: "piece", primaryStore: "daraz", secondaryStore: "rokomari" },
  { id: "g-cable", nameBn: "টাইপ-সি ফাস্ট চার্জিং কেবল", nameEn: "Type-C Fast Charging Cable", category: "gadgets_home", defaultQty: 1, unit: "piece", primaryStore: "daraz", secondaryStore: "rokomari" },
  { id: "g-bat", nameBn: "রিচার্জেবল মসকুইটো ব্যাট", nameEn: "Rechargeable Mosquito Bat", category: "gadgets_home", defaultQty: 1, unit: "piece", primaryStore: "daraz", secondaryStore: "chaldal" },
  { id: "g-soap", nameBn: "অ্যান্টিব্যাকটেরিয়াল হ্যান্ডওয়াশ", nameEn: "Antibacterial Handwash", category: "gadgets_home", defaultQty: 1, unit: "piece", primaryStore: "chaldal", secondaryStore: "daraz" },
];

export function storeSearchUrl(store: StorePlatform, query: string): string {
  const enc = encodeURIComponent(query.trim());
  switch (store) {
    case "daraz":
      return `https://www.daraz.com.bd/catalog/?q=${enc}`;
    case "rokomari":
      return `https://www.rokomari.com/search?term=${enc}`;
    case "chaldal":
      return `https://chaldal.com/search/${enc}`;
    case "shwapno":
      return `https://www.shwapno.com/search?q=${enc}`;
    case "tcb":
      return "https://tcb.gov.bd/pages/static-pages/6922dcfb933eb65569e13083";
  }
}

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
  category?: BazarCategory;
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
const VALID_CATS = new Set<string>(["grocery", "produce", "fish_meat", "books_stationery", "gadgets_home"]);

export function sanitizeBazar(raw: unknown): BazarState | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const items: BazarItem[] = [];
  for (const x of Array.isArray(o.items) ? o.items : []) {
    if (!x || typeof x !== "object") continue;
    const i = x as Record<string, unknown>;
    const name = str(i.name, 60), qty = posNum(i.qty, 10_000), id = str(i.id, 40);
    if (!name || !qty || !id || !UNIT_IDS.has(i.unit as string)) continue;
    const cat = typeof i.category === "string" && VALID_CATS.has(i.category) ? (i.category as BazarCategory) : undefined;
    items.push({
      id,
      name,
      qty,
      unit: i.unit as BazarUnit,
      checked: i.checked === true,
      pricePoisha: poisha(i.pricePoisha),
      ...(cat ? { category: cat } : {}),
    });
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

/* ------------------------------------------------------------------ */
/* Voice / Multi-line Parser & Share Formatting                        */
/* ------------------------------------------------------------------ */

const BN_DIGIT_MAP: Record<string, string> = {
  "০": "0", "১": "1", "২": "2", "৩": "3", "৪": "4",
  "৫": "5", "৬": "6", "৭": "7", "৮": "8", "৯": "9",
};

export function parseBanglaQty(raw: string): number | null {
  const t = raw.trim();
  if (t === "আধা" || t === "অর্ধেক") return 0.5;
  if (t === "দেড়" || t === "দের") return 1.5;
  if (t === "আড়াই" || t === "আড়াই") return 2.5;
  if (t === "পোয়া" || t === "এক পোয়া") return 0.25;
  const numStr = t.replace(/[০-৯]/g, (d) => BN_DIGIT_MAP[d] || d);
  const val = parseFloat(numStr);
  return Number.isFinite(val) && val > 0 ? val : null;
}

export function detectBazarCategory(name: string): BazarCategory {
  const norm = itemKey(name);
  // Match popular store items first
  const match = POPULAR_STORE_ITEMS.find((p) => norm.includes(itemKey(p.nameBn)) || norm.includes(itemKey(p.nameEn)));
  if (match) return match.category;

  if (/(বই|খাতা|কলম|পেন্সিল|ক্যালকুলেটর|calculator|book|notebook|pen|admission|ielts|গাইড|প্রশ্নব্যাংক|স্টেশনারি|রকমারি)/i.test(norm)) {
    return "books_stationery";
  }
  if (/(বাল্ব|লাইট|কেবল|তার|মাল্টিপ্লাগ|চার্জার|ব্যাট|ব্যাটারি|হেডফোন|মাউস|হ্যান্ডওয়াশ|সাবান|শ্যাম্পু|soap|bulb|led|daraz|দারাজ|সকেট)/i.test(norm)) {
    return "gadgets_home";
  }
  if (/(মাছ|মাংস|মুরগি|চিকেন|গরু|খাসি|রুই|কাতলা|ইলিশ|চিংড়ি|beef|chicken|fish|meat|broiler|লেয়ার)/i.test(norm)) {
    return "fish_meat";
  }
  if (/(আলু|পেঁয়াজ|রসুন|আদা|মরিচ|টমেটো|ডিম|বেগুন|পটল|শাক|সবজি|ঝিঙা|লাউ|কুমড়া|গাজর|শসা|potato|onion|egg|vegetable)/i.test(norm)) {
    return "produce";
  }
  return "grocery";
}

export interface ParsedVoiceItem {
  name: string;
  qty: number;
  unit: BazarUnit;
  category: BazarCategory;
}

/**
 * Parses freeform Bengali / English speech or comma-separated lists into structured items.
 * Handles "২ কেজি আলু, ১ লিটার তেল, ১ ডজন ডিম", "casio calculator", "৫ কেজি মিনিকেট চাল".
 */
export function parseBazarVoiceText(input: string): ParsedVoiceItem[] {
  if (!input || typeof input !== "string") return [];
  // Split on commas, semicolons, plus signs, newlines, or conjunctions "এবং", "আর", "ও"
  const tokens = input
    .split(/[,;\n\+]|\s+(?:এবং|আর|ও)\s+/gi)
    .map((s) => s.trim())
    .filter(Boolean);

  const results: ParsedVoiceItem[] = [];

  for (const token of tokens) {
    if (!token) continue;
    let qty: number = 1;
    let unit: BazarUnit = "piece";
    let name = token;

    // Pattern 1: Starts with quantity + unit (e.g. "২ কেজি আলু", "500 gm chicken", "আধা লিটার তেল")
    const leadingMatch = token.match(/^([০-৯\d\.]+|আধা|অর্ধেক|দেড়|দের|আড়াই|আড়াই|পোয়া)\s*(কেজি|কিলো|কিলোগ্রাম|গ্রাম|gm|g|লিটার|লি|ltr|litres?|liters?|l|ডজন|dozen|হালি|পিস|টি|টা|খানা|pieces?|pcs?|pc)?\s*(.+)$/i);

    if (leadingMatch) {
      const q = parseBanglaQty(leadingMatch[1]);
      if (q !== null) {
        qty = q;
        const uStr = (leadingMatch[2] || "").toLowerCase();
        if (uStr) {
          if (/^(কেজি|কিলো|কিলোগ্রাম|kg|kgs?|kilo)$/i.test(uStr)) unit = "kg";
          else if (/^(গ্রাম|gm|g)$/i.test(uStr)) unit = "g";
          else if (/^(লিটার|লি|ltr|litres?|liters?|l)$/i.test(uStr)) unit = "litre";
          else if (/^(ডজন|dozen)$/i.test(uStr)) unit = "dozen";
          else if (/^(হালি)$/i.test(uStr)) unit = "hali";
          else unit = "piece";
        } else {
          // If no unit was explicitly mentioned, default based on item
          unit = /চাল|ডাল|আটা|চিনি|লবণ|আলু|পেঁয়াজ|মাংস|মাছ/i.test(leadingMatch[3]) ? "kg" : "piece";
        }
        name = leadingMatch[3].trim();
      }
    } else {
      // Pattern 2: Ends with quantity + unit (e.g. "আলু ২ কেজি", "সয়াবিন তেল ১ লিটার")
      const trailingMatch = token.match(/^(.+?)\s+([০-৯\d\.]+|আধা|অর্ধেক|দেড়|দের|আড়াই|আড়াই|পোয়া)\s*(কেজি|কিলো|কিলোগ্রাম|গ্রাম|gm|g|লিটার|লি|ltr|litres?|liters?|l|ডজন|dozen|হালি|পিস|টি|টা|খানা|pieces?|pcs?|pc)?$/i);
      if (trailingMatch) {
        const q = parseBanglaQty(trailingMatch[2]);
        if (q !== null) {
          qty = q;
          const uStr = (trailingMatch[3] || "").toLowerCase();
          if (uStr) {
            if (/^(কেজি|কিলো|কিলোগ্রাম|kg|kgs?|kilo)$/i.test(uStr)) unit = "kg";
            else if (/^(গ্রাম|gm|g)$/i.test(uStr)) unit = "g";
            else if (/^(লিটার|লি|ltr|litres?|liters?|l)$/i.test(uStr)) unit = "litre";
            else if (/^(ডজন|dozen)$/i.test(uStr)) unit = "dozen";
            else if (/^(হালি)$/i.test(uStr)) unit = "hali";
            else unit = "piece";
          } else {
            unit = /চাল|ডাল|আটা|চিনি|লবণ|আলু|পেঁয়াজ|মাংস|মাছ/i.test(trailingMatch[1]) ? "kg" : "piece";
          }
          name = trailingMatch[1].trim();
        }
      }
    }

    const cleanName = name.normalize("NFC").replace(/^[,\.\-\s]+|[,\.\-\s]+$/g, "").slice(0, 60);
    if (!cleanName) continue;

    results.push({
      name: cleanName,
      qty,
      unit,
      category: detectBazarCategory(cleanName),
    });
  }

  return results;
}

const BN_NUMS = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"];
const toBnDigits = (n: number | string) => String(n).replace(/\d/g, (d) => BN_NUMS[Number(d)]);

/** Formats a shopping list for WhatsApp or SMS sharing. */
export function formatBazarShareText(items: BazarItem[], date?: string, bn = true): string {
  const header = bn ? "🛒 সহজ বাজেট — বাজারের ফর্দ" : "🛒 Shohoj Budget — Bazar List";
  const dateLine = date ? (bn ? `তারিখ: ${toBnDigits(date)}` : `Date: ${date}`) : "";
  const unitMap: Record<BazarUnit, { bn: string; en: string }> = {
    kg: { bn: "কেজি", en: "kg" },
    g: { bn: "গ্রাম", en: "g" },
    litre: { bn: "লিটার", en: "litre" },
    piece: { bn: "পিস", en: "piece" },
    dozen: { bn: "ডজন", en: "dozen" },
    hali: { bn: "হালি", en: "hali" },
  };

  const lines = items.map((i) => {
    const qStr = bn ? toBnDigits(i.qty) : String(i.qty);
    const uStr = bn ? unitMap[i.unit].bn : unitMap[i.unit].en;
    const mark = i.checked ? "[✓]" : "[ ]";
    const price = i.checked && i.pricePoisha !== null
      ? ` (৳${bn ? toBnDigits((i.pricePoisha / 100).toLocaleString("en-IN")) : (i.pricePoisha / 100).toLocaleString("en-IN")})`
      : "";
    return `${mark} ${qStr} ${uStr} ${i.name}${price}`;
  });

  const total = tripTotal(items);
  const footer = bn
    ? `মোট আইটেম: ${toBnDigits(items.length)}টি${total > 0 ? ` | কেনা হয়েছে: ৳${toBnDigits((total / 100).toLocaleString("en-IN"))}` : ""}`
    : `Total items: ${items.length}${total > 0 ? ` | Bought: ৳${(total / 100).toLocaleString("en-IN")}` : ""}`;

  return [header, dateLine, "-------------------------", ...lines, "-------------------------", footer].filter(Boolean).join("\n");
}

export function whatsappBazarHref(text: string): string {
  return `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
}

export function smsBazarHref(text: string): string {
  return `sms:?body=${encodeURIComponent(text)}`;
}

export interface PresetBasket {
  id: string;
  nameBn: string;
  nameEn: string;
  tagBn: string;
  tagEn: string;
  platformFocus: StorePlatform;
  items: Array<{ nameBn: string; nameEn: string; qty: number; unit: BazarUnit; category: BazarCategory }>;
}

export const PRESET_BASKETS: PresetBasket[] = [
  {
    id: "monthly_grocery",
    nameBn: "মাসিক মুদি ফর্দ (চালডাল ও স্বপ্ন)",
    nameEn: "Monthly Grocery (Chaldal & Shwapno)",
    tagBn: "নিত্যপ্রয়োজনীয়",
    tagEn: "Essentials",
    platformFocus: "chaldal",
    items: [
      { nameBn: "মিনিকেট চাল", nameEn: "Miniket Rice", qty: 5, unit: "kg", category: "grocery" },
      { nameBn: "মসুর ডাল", nameEn: "Red Lentils", qty: 1, unit: "kg", category: "grocery" },
      { nameBn: "সয়াবিন তেল", nameEn: "Soybean Oil", qty: 2, unit: "litre", category: "grocery" },
      { nameBn: "আয়োডিনযুক্ত লবণ", nameEn: "Iodized Salt", qty: 1, unit: "kg", category: "grocery" },
      { nameBn: "চিনি", nameEn: "Sugar", qty: 1, unit: "kg", category: "grocery" },
      { nameBn: "প্যাকেট আটা", nameEn: "Atta / Flour", qty: 2, unit: "kg", category: "grocery" },
    ],
  },
  {
    id: "fresh_market",
    nameBn: "কাঁচাবাজার ও প্রোটিন (লোকাল বাজার)",
    nameEn: "Fresh Market & Protein",
    tagBn: "তাজা খাবার",
    tagEn: "Fresh",
    platformFocus: "chaldal",
    items: [
      { nameBn: "গোল আলু", nameEn: "Potato", qty: 2, unit: "kg", category: "produce" },
      { nameBn: "দেশি পেঁয়াজ", nameEn: "Local Onion", qty: 1, unit: "kg", category: "produce" },
      { nameBn: "রসুন", nameEn: "Garlic", qty: 250, unit: "g", category: "produce" },
      { nameBn: "আদা", nameEn: "Ginger", qty: 250, unit: "g", category: "produce" },
      { nameBn: "লাল ডিম", nameEn: "Farm Eggs", qty: 2, unit: "hali", category: "produce" },
      { nameBn: "রুই মাছ", nameEn: "Rui Fish", qty: 1, unit: "kg", category: "fish_meat" },
      { nameBn: "ব্রয়লার মুরগি", nameEn: "Broiler Chicken", qty: 1, unit: "kg", category: "fish_meat" },
    ],
  },
  {
    id: "rokomari_study",
    nameBn: "রকমারি স্টাডি কিট (বই ও স্টেশনারি)",
    nameEn: "Rokomari Study Kit (Books & Stationery)",
    tagBn: "পড়াশোনা ও চাকরি",
    tagEn: "Study & Career",
    platformFocus: "rokomari",
    items: [
      { nameBn: "A4 প্র্যাকটিস খাতা", nameEn: "A4 Exercise Book", qty: 3, unit: "piece", category: "books_stationery" },
      { nameBn: "কালো কালির বলপেন বক্স", nameEn: "Black Ballpen Box", qty: 1, unit: "piece", category: "books_stationery" },
      { nameBn: "Casio fx-991EX ক্যালকুলেটর", nameEn: "Casio Scientific Calculator", qty: 1, unit: "piece", category: "books_stationery" },
      { nameBn: "ভর্তি প্রশ্নব্যাংক ও গাইড", nameEn: "Admission Question Bank", qty: 1, unit: "piece", category: "books_stationery" },
    ],
  },
  {
    id: "daraz_home_gadgets",
    nameBn: "দারাজ হোম ও গ্যাজেট (Daraz Live)",
    nameEn: "Daraz Home & Tech Accessories",
    tagBn: "ইলেকট্রনিক্স",
    tagEn: "Electronics",
    platformFocus: "daraz",
    items: [
      { nameBn: "LED লাইট বাল্ব", nameEn: "LED Light Bulb", qty: 2, unit: "piece", category: "gadgets_home" },
      { nameBn: "মাল্টিপ্লাগ এক্সটেনশন সকেট", nameEn: "Power Extension Multiplug", qty: 1, unit: "piece", category: "gadgets_home" },
      { nameBn: "টাইপ-সি ফাস্ট চার্জিং কেবল", nameEn: "Type-C Fast Charging Cable", qty: 1, unit: "piece", category: "gadgets_home" },
      { nameBn: "রিচার্জেবল মসকুইটো ব্যাট", nameEn: "Rechargeable Mosquito Bat", qty: 1, unit: "piece", category: "gadgets_home" },
    ],
  },
];

/** Formats a clean printable memo / shopping slip representation. */
export function formatBazarMemo(items: BazarItem[], date: string, budgetPoisha = 0, bn = true): string {
  const title = bn ? "মেমো · বাজারের খরচের হিসাব" : "MEMO · BAZAR EXPENSE SUMMARY";
  const dateStr = bn ? `তারিখ: ${toBnDigits(date)}` : `Date: ${date}`;
  const total = tripTotal(items);
  const totalStr = bn
    ? `মোট কেনা: ৳${toBnDigits((total / 100).toLocaleString("en-IN"))}`
    : `Total bought: ৳${(total / 100).toLocaleString("en-IN")}`;
  const budgetStr = budgetPoisha > 0
    ? (bn ? `লক্ষ্য বাজেট: ৳${toBnDigits((budgetPoisha / 100).toLocaleString("en-IN"))}` : `Target budget: ৳${(budgetPoisha / 100).toLocaleString("en-IN")}`)
    : "";

  const unitMap: Record<BazarUnit, string> = {
    kg: bn ? "কেজি" : "kg",
    g: bn ? "গ্রাম" : "g",
    litre: bn ? "লিটার" : "litre",
    piece: bn ? "পিস" : "piece",
    dozen: bn ? "ডজন" : "dozen",
    hali: bn ? "হালি" : "hali",
  };

  const rows = items.map((i, idx) => {
    const num = bn ? `${toBnDigits(idx + 1)}.` : `${idx + 1}.`;
    const check = i.checked ? "[✓]" : "[ ]";
    const qty = bn ? toBnDigits(i.qty) : String(i.qty);
    const unit = unitMap[i.unit];
    const price = i.pricePoisha !== null
      ? (bn ? `৳${toBnDigits((i.pricePoisha / 100).toLocaleString("en-IN"))}` : `৳${(i.pricePoisha / 100).toLocaleString("en-IN")}`)
      : (bn ? "বাকি" : "pending");
    return `${num} ${check} ${i.name.padEnd(20, " ")} | ${qty} ${unit} | ${price}`;
  });

  return [
    "=====================================",
    `          ${title}          `,
    "=====================================",
    dateStr,
    budgetStr,
    "-------------------------------------",
    ...rows,
    "-------------------------------------",
    totalStr,
    "=====================================",
    bn ? "সহজ বাজেট · kormopath.com" : "Shohoj Budget · kormopath.com",
  ].filter(Boolean).join("\n");
}
