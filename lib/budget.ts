// Shohoj Budget engine. Pure, deterministic, no imports, so it runs under `node --test`.
// Money is stored as integer poisha (1 taka = 100 poisha) to avoid floating-point drift.

export type TxType = "expense" | "income";
export type Method = "Cash" | "bKash" | "Nagad" | "Rocket" | "Bank" | "Card";
export type CategoryId =
  | "grocery" | "food" | "transport" | "utilities" | "rent" | "health"
  | "education" | "shopping" | "family" | "mobile" | "other"
  | "salary" | "freelance" | "gift" | "other_income";

export interface Category {
  id: CategoryId;
  type: TxType;
  en: string;
  bn: string;
  keywords: string[];
}

export const CATEGORIES: Category[] = [
  { id: "grocery", type: "expense", en: "Groceries / bazar", bn: "বাজার ও মুদি", keywords: ["বাজার", "বাজারে", "মুদি", "চাল", "ডাল", "সবজি", "মাছ", "মাংস", "ডিম", "তেল", "grocery", "groceries", "bazar", "shwapno", "স্বপ্ন", "meena bazar", "agora"] },
  { id: "food", type: "expense", en: "Food & eating out", bn: "খাবার ও রেস্টুরেন্ট", keywords: ["খাবার", "খেলাম", "নাস্তা", "চা", "লাঞ্চ", "ডিনার", "বিরিয়ানি", "কাচ্চি", "রেস্টুরেন্ট", "food", "lunch", "dinner", "restaurant", "pizza", "foodpanda", "chillox", "cafe"] },
  { id: "transport", type: "expense", en: "Transport", bn: "যাতায়াত", keywords: ["রিকশা", "বাস", "সিএনজি", "উবার", "পাঠাও", "ভাড়া দিয়েছি", "ট্রেন", "লঞ্চ", "মেট্রো", "uber", "pathao", "bus", "rickshaw", "cng", "metro", "train", "fuel", "তেল নিলাম"] },
  { id: "utilities", type: "expense", en: "Bills & utilities", bn: "বিল ও ইউটিলিটি", keywords: ["বিল", "বিদ্যুৎ", "গ্যাস", "পানি", "ইন্টারনেট", "ওয়াইফাই", "bill", "desco", "dpdc", "wasa", "titas", "internet", "wifi", "electricity"] },
  { id: "rent", type: "expense", en: "Rent & mess", bn: "বাসা ও মেস ভাড়া", keywords: ["বাসা ভাড়া", "মেস", "rent", "house rent", "mess"] },
  { id: "health", type: "expense", en: "Health & medicine", bn: "স্বাস্থ্য ও ওষুধ", keywords: ["ওষুধ", "ডাক্তার", "ফার্মেসি", "হাসপাতাল", "টেস্ট", "medicine", "pharma", "pharmacy", "doctor", "hospital", "lazz"] },
  { id: "education", type: "expense", en: "Education", bn: "পড়াশোনা", keywords: ["বই", "টিউশন", "কোচিং", "ফি", "পরীক্ষা", "book", "tuition", "coaching", "course", "exam fee"] },
  { id: "mobile", type: "expense", en: "Mobile recharge", bn: "মোবাইল রিচার্জ", keywords: ["রিচার্জ", "ফ্লেক্সি", "মিনিট", "ডাটা", "recharge", "flexi", "data pack"] },
  { id: "shopping", type: "expense", en: "Shopping & clothes", bn: "কেনাকাটা", keywords: ["কাপড়", "জামা", "জুতা", "কেনাকাটা", "শপিং", "shopping", "aarong", "daraz", "clothes", "shoes"] },
  { id: "family", type: "expense", en: "Family & sending home", bn: "পরিবার", keywords: ["বাড়িতে পাঠালাম", "মা কে", "বাবা কে", "পরিবার", "family", "sent home"] },
  { id: "other", type: "expense", en: "Other expense", bn: "অন্যান্য খরচ", keywords: [] },
  { id: "salary", type: "income", en: "Salary", bn: "বেতন", keywords: ["বেতন", "স্যালারি", "salary"] },
  { id: "freelance", type: "income", en: "Freelance / client", bn: "ফ্রিল্যান্সিং আয়", keywords: ["ক্লায়েন্ট", "ফ্রিল্যান্স", "পেমেন্ট পেলাম", "payoneer", "upwork", "fiverr", "client", "freelance"] },
  { id: "gift", type: "income", en: "Gift / support", bn: "উপহার ও সহায়তা", keywords: ["উপহার", "সালামি", "gift", "eid salami"] },
  { id: "other_income", type: "income", en: "Other income", bn: "অন্যান্য আয়", keywords: ["টিউশনি থেকে", "আয়"] },
];

export const categoryById = (id: CategoryId): Category => CATEGORIES.find((c) => c.id === id) ?? CATEGORIES[10];

export interface CategoryStyle {
  hex: string;
  twBg: string;
  twText: string;
  twBorder: string;
}

export const CATEGORY_STYLES: Record<CategoryId, CategoryStyle> = {
  grocery: { hex: "#10b981", twBg: "bg-emerald-500", twText: "text-emerald-700", twBorder: "border-emerald-500" },
  food: { hex: "#f59e0b", twBg: "bg-amber-500", twText: "text-amber-700", twBorder: "border-amber-500" },
  transport: { hex: "#0ea5e9", twBg: "bg-sky-500", twText: "text-sky-700", twBorder: "border-sky-500" },
  utilities: { hex: "#8b5cf6", twBg: "bg-violet-500", twText: "text-violet-700", twBorder: "border-violet-500" },
  rent: { hex: "#6366f1", twBg: "bg-indigo-500", twText: "text-indigo-700", twBorder: "border-indigo-500" },
  health: { hex: "#f43f5e", twBg: "bg-rose-500", twText: "text-rose-700", twBorder: "border-rose-500" },
  education: { hex: "#3b82f6", twBg: "bg-blue-500", twText: "text-blue-700", twBorder: "border-blue-500" },
  mobile: { hex: "#06b6d4", twBg: "bg-cyan-500", twText: "text-cyan-700", twBorder: "border-cyan-500" },
  shopping: { hex: "#d946ef", twBg: "bg-fuchsia-500", twText: "text-fuchsia-700", twBorder: "border-fuchsia-500" },
  family: { hex: "#f97316", twBg: "bg-orange-500", twText: "text-orange-700", twBorder: "border-orange-500" },
  other: { hex: "#64748b", twBg: "bg-slate-500", twText: "text-slate-700", twBorder: "border-slate-500" },
  salary: { hex: "#059669", twBg: "bg-emerald-600", twText: "text-emerald-800", twBorder: "border-emerald-600" },
  freelance: { hex: "#0284c7", twBg: "bg-sky-600", twText: "text-sky-800", twBorder: "border-sky-600" },
  gift: { hex: "#ec4899", twBg: "bg-pink-500", twText: "text-pink-700", twBorder: "border-pink-500" },
  other_income: { hex: "#475569", twBg: "bg-slate-600", twText: "text-slate-800", twBorder: "border-slate-600" },
};

const BN_DIGITS = "০১২৩৪৫৬৭৮৯";

/** Convert Bengali digits to ASCII so "১২০০" becomes "1200". */
export function bnToAsciiDigits(s: string): string {
  return s.replace(/[০-৯]/g, (d) => String(BN_DIGITS.indexOf(d)));
}

// Spoken Bangla number words. Only exact forms we have tested are listed; anything else is
// left unparsed rather than guessed.
// Keys are NFC-normalised at load and input is NFC-normalised before lookup, so the
// one-codepoint and two-codepoint spellings of য়/ড় match the same entry.
const nfc = (w: string) => w.normalize("NFC");
const UNITS: Record<string, number> = Object.fromEntries(Object.entries({
  "এক": 1, "দুই": 2, "দু": 2, "তিন": 3, "চার": 4, "পাঁচ": 5, "ছয়": 6, "সাত": 7, "আট": 8, "নয়": 9,
  "দশ": 10, "এগারো": 11, "বারো": 12, "তেরো": 13, "চোদ্দ": 14, "চৌদ্দ": 14, "পনেরো": 15, "ষোলো": 16, "সতেরো": 17,
  "আঠারো": 18, "উনিশ": 19, "বিশ": 20, "কুড়ি": 20, "পঁচিশ": 25, "ত্রিশ": 30, "তিরিশ": 30, "চল্লিশ": 40, "পঞ্চাশ": 50,
  "ষাট": 60, "সত্তর": 70, "আশি": 80, "নব্বই": 90,
}).map(([k, v]) => [nfc(k), v]));
const FRACTIONS: Record<string, number> = Object.fromEntries(Object.entries({ "দেড়": 1.5, "আড়াই": 2.5, "সাড়ে": 0.5 }).map(([k, v]) => [nfc(k), v]));
const SARE = nfc("সাড়ে");

/**
 * Parse a Bangla/English amount phrase into taka. Returns null if no amount is present.
 * Handles: "১২০০", "1,200.50", "বারোশো", "দেড় হাজার", "আড়াই হাজার", "দুই হাজার পাঁচশো", "সাড়ে তিনশো", "২ হাজার", "5k".
 */
export function parseAmount(raw: string): number | null {
  const text = bnToAsciiDigits(raw.toLowerCase()).replace(/৳/g, " ");

  // 1) Digits with an explicit multiplier: "২ হাজার", "1.5k", "3 lakh"
  const mult = text.match(/(\d+(?:\.\d+)?)\s*(হাজার|k\b|লাখ|lakh|lac)/);
  if (mult) {
    const n = parseFloat(mult[1]);
    const m = /লাখ|lakh|lac/.test(mult[2]) ? 100000 : 1000;
    const rest = text.slice((mult.index ?? 0) + mult[0].length).match(/^\s*(\d+)/);
    return roundTaka(n * m + (rest ? parseInt(rest[1], 10) : 0));
  }

  // 2) Plain digits (with thousands separators). Prefer a number next to a currency word.
  const nums = [...text.matchAll(/(\d{1,3}(?:,\d{2,3})+|\d+)(?:\.(\d{1,2}))?/g)];
  if (nums.length) {
    const near = nums.find((m) => {
      const i = m.index ?? 0;
      const around = text.slice(Math.max(0, i - 8), i + m[0].length + 8);
      return /টাকা|tk|taka|bdt/.test(around);
    }) ?? nums[0];
    const whole = near[1].replace(/,/g, "");
    const value = parseFloat(whole + (near[2] ? "." + near[2] : ""));
    return Number.isFinite(value) ? roundTaka(value) : null;
  }

  // 3) Number words
  return parseBanglaNumberWords(raw);
}

export function parseBanglaNumberWords(raw: string): number | null {
  const words = nfc(raw).replace(/[,.!?।]/g, " ").split(/\s+/).filter(Boolean);
  let total = 0;
  let current = 0;
  let pendingFraction: number | null = null; // "সাড়ে" = +0.5 of next unit
  let found = false;

  const unitValue = (w: string): number | null => {
    if (w in UNITS) return UNITS[w];
    // "বারোশো", "পাঁচশো", "দুইশ", "একশো"
    const sho = w.match(/^(.+?)(শো|শ|শত)$/);
    if (sho && sho[1] in UNITS) return UNITS[sho[1]] * 100;
    if (w === "শো" || w === "একশ" || w === "একশো") return 100;
    return null;
  };

  for (const w of words) {
    if (w in FRACTIONS) {
      if (w === SARE) pendingFraction = 0.5;
      else { current += FRACTIONS[w]; found = true; }
      continue;
    }
    if (w === "হাজার") {
      total += (current || 1) * 1000 + (pendingFraction ? 500 : 0);
      current = 0; pendingFraction = null; found = true;
      continue;
    }
    if (w === "লাখ" || w === "লক্ষ") {
      total += (current || 1) * 100000;
      current = 0; pendingFraction = null; found = true;
      continue;
    }
    const v = unitValue(w);
    if (v !== null) {
      if (pendingFraction) {
        // "সাড়ে তিনশো" = 350, "সাড়ে তিন হাজার" handled when হাজার follows
        // "সাড়ে তিনশো" = 300 + 50. Below 100, wait for "হাজার" ("সাড়ে তিন হাজার" = 3500).
        if (v >= 100) { current += v + 50; pendingFraction = null; }
        else current += v;
      } else current += v;
      found = true;
    }
  }
  if (!found) return null;
  const value = total + current;
  return value > 0 ? roundTaka(value) : null;
}

const roundTaka = (n: number) => Math.round(n * 100) / 100;
export const toPoisha = (taka: number) => Math.round(taka * 100);
export const fromPoisha = (p: number) => p / 100;

const INCOME_CUES = ["পেলাম", "পেয়েছি", "পেয়েছি", "আয়", "আয়", "বেতন", "received", "income", "salary", "got paid", "cash in", "cashin", "received tk", "you have received"];
const METHOD_CUES: [Method, string[]][] = [
  ["bKash", ["বিকাশ", "bkash"]],
  ["Nagad", ["নগদে", "নগদ অ্যাকাউন্ট", "nagad"]],
  ["Rocket", ["রকেট", "rocket"]],
  ["Card", ["কার্ড", "card", "visa", "mastercard"]],
  ["Bank", ["ব্যাংক", "bank", "a/c", "account debited"]],
  ["Cash", ["ক্যাশ", "নগদ টাকা", "হাতে", "cash"]],
];

export interface ParsedEntry {
  amount: number | null; // taka; null means we could not find one and the user must type it
  type: TxType;
  categoryId: CategoryId;
  method: Method;
  matched: string[]; // words that drove the guesses, shown to the user
  confidence: "high" | "low";
  issues: string[]; // Bangla explanations of what needs checking
}

export function guessCategory(text: string, type: TxType): { id: CategoryId; matched: string[] } {
  const lower = text.toLowerCase();
  let bestId: CategoryId = type === "income" ? "other_income" : "other";
  let bestLen = 0;
  const matched: string[] = [];
  for (const c of CATEGORIES) {
    if (c.type !== type) continue;
    for (const k of c.keywords) {
      if (lower.includes(k.toLowerCase()) && k.length > bestLen) {
        bestId = c.id;
        bestLen = k.length;
        matched.splice(0, matched.length, k);
      }
    }
  }
  return { id: bestId, matched };
}

/** Understand a typed or spoken sentence. Never saves anything; the UI must ask for confirmation. */
export function parseEntry(raw: string): ParsedEntry {
  const text = raw.trim();
  const lower = text.toLowerCase();
  const issues: string[] = [];
  const amount = parseAmount(text);
  if (amount === null) issues.push("টাকার পরিমাণ বুঝতে পারিনি — নিজে লিখে দিন।");

  const incomeCue = INCOME_CUES.find((c) => lower.includes(c));
  const type: TxType = incomeCue ? "income" : "expense";

  const cat = guessCategory(text, type);
  if (cat.id === "other" || cat.id === "other_income") issues.push("খাত নিশ্চিত নয় — সঠিক খাত বেছে নিন।");

  let method: Method = "Cash";
  const methodHit: string[] = [];
  for (const [m, cues] of METHOD_CUES) {
    const hit = cues.find((c) => lower.includes(c));
    if (hit) { method = m; methodHit.push(hit); break; }
  }

  return {
    amount,
    type,
    categoryId: cat.id,
    method,
    matched: [...(incomeCue ? [incomeCue] : []), ...cat.matched, ...methodHit],
    confidence: amount !== null && issues.length === 0 ? "high" : "low",
    issues,
  };
}

export interface ParsedSms extends ParsedEntry {
  trxId: string | null;
  counterparty: string | null;
}

/** Parse an MFS/bank SMS. Distinguishes money received from money sent. */
export function parseSms(raw: string): ParsedSms {
  const text = raw.trim();
  const lower = text.toLowerCase();
  const issues: string[] = [];

  const amtMatch =
    text.match(/(?:tk|bdt|taka|টাকা)\.?\s*([0-9০-৯,]+(?:\.[0-9০-৯]+)?)/i) ||
    text.match(/([0-9০-৯,]+(?:\.[0-9০-৯]+)?)\s*(?:tk|bdt|taka|টাকা)/i);
  const amount = amtMatch ? roundTaka(parseFloat(bnToAsciiDigits(amtMatch[1]).replace(/,/g, ""))) : null;
  if (amount === null) issues.push("এসএমএস-এ 'Tk' বা 'BDT' সহ পরিমাণ পাওয়া যায়নি।");

  const credit = /(received|cash ?in|credited|you have received|জমা হয়েছে|পেয়েছেন)/i.test(text);
  const debit = /(payment|paid|sent|send money|cash ?out|debited|purchase|bill)/i.test(text);
  const type: TxType = credit && !debit ? "income" : "expense";
  if (credit && debit) issues.push("আয় না খরচ নিশ্চিত নয় — যাচাই করুন।");

  const trx = text.match(/trx\s*id[:\s]*([a-z0-9]+)/i);
  const to = text.match(/\bto\s+([A-Za-z0-9 &.'-]{2,40}?)(?:\s+(?:successful|via|on|at|\.|ref)|[.,]|$)/i);
  const at = text.match(/\bat\s+([A-Za-z0-9 &.'-]{2,40}?)(?:[.,]|\s+on|$)/i);
  const counterparty = (to?.[1] ?? at?.[1] ?? null)?.trim() ?? null;

  const cat = guessCategory(`${counterparty ?? ""} ${text}`, type);
  let method: Method = "bKash";
  if (lower.includes("nagad")) method = "Nagad";
  else if (lower.includes("rocket")) method = "Rocket";
  else if (/bank|a\/c|card/.test(lower)) method = /card/.test(lower) ? "Card" : "Bank";
  else if (!lower.includes("bkash")) issues.push("কোন মাধ্যম (বিকাশ/নগদ/ব্যাংক) নিশ্চিত নয়।");

  if (cat.id === "other" || cat.id === "other_income") issues.push("খাত নিশ্চিত নয় — সঠিক খাত বেছে নিন।");

  return {
    amount, type, categoryId: cat.id, method, trxId: trx ? trx[1] : null, counterparty,
    matched: cat.matched, confidence: amount !== null && issues.length === 0 ? "high" : "low", issues,
  };
}

export interface Transaction {
  id: string;
  type: TxType;
  amountPoisha: number;
  categoryId: CategoryId;
  method: Method;
  note: string;
  date: string; // YYYY-MM-DD, local date the money moved
  source: "voice" | "text" | "sms" | "manual" | "migrated" | "recurring";
  trxId?: string;
  createdAt: string; // ISO
  updatedAt: string; // ISO
  history: { at: string; change: string }[]; // audit trail of edits
}

export interface MonthSummary {
  month: string; // YYYY-MM
  incomePoisha: number;
  expensePoisha: number;
  netPoisha: number;
  byCategory: { id: CategoryId; poisha: number; pct: number }[];
  count: number;
}

export function summarizeMonth(txs: Transaction[], month: string): MonthSummary {
  const inMonth = txs.filter((t) => t.date.startsWith(month));
  let income = 0;
  let expense = 0;
  const cat = new Map<CategoryId, number>();
  for (const t of inMonth) {
    if (t.type === "income") income += t.amountPoisha;
    else {
      expense += t.amountPoisha;
      cat.set(t.categoryId, (cat.get(t.categoryId) ?? 0) + t.amountPoisha);
    }
  }
  const byCategory = [...cat.entries()]
    .map(([id, poisha]) => ({ id, poisha, pct: expense > 0 ? Math.round((poisha / expense) * 1000) / 10 : 0 }))
    .sort((a, b) => b.poisha - a.poisha);
  return { month, incomePoisha: income, expensePoisha: expense, netPoisha: income - expense, byCategory, count: inMonth.length };
}

export interface BudgetPace {
  daysInMonth: number;
  dayOfMonth: number;
  daysLeftIncludingToday: number;
  remainingPoisha: number;
  safePerDayPoisha: number; // remaining budget spread over days left, never negative
  projectedPoisha: number; // straight-line estimate of month-end spending, not a prediction
  overBudget: boolean;
  usedPct: number;
}

/** Straight-line pacing. `today` is YYYY-MM-DD so tests are deterministic. */
export function budgetPace(spentPoisha: number, budgetPoisha: number, today: string): BudgetPace {
  const [y, m, d] = today.split("-").map(Number);
  const daysInMonth = new Date(y, m, 0).getDate();
  const daysLeft = daysInMonth - d + 1;
  const remaining = budgetPoisha - spentPoisha;
  return {
    daysInMonth,
    dayOfMonth: d,
    daysLeftIncludingToday: daysLeft,
    remainingPoisha: remaining,
    safePerDayPoisha: remaining > 0 ? Math.floor(remaining / daysLeft) : 0,
    projectedPoisha: d > 0 ? Math.round((spentPoisha / d) * daysInMonth) : spentPoisha,
    overBudget: remaining < 0,
    usedPct: budgetPoisha > 0 ? Math.round((spentPoisha / budgetPoisha) * 1000) / 10 : 0,
  };
}

/**
 * Flag expenses that are unusually large for their category: more than 3x the median of that
 * category's other entries, with at least 3 other entries to compare against.
 */
export function unusualExpenses(txs: Transaction[]): string[] {
  const flagged: string[] = [];
  const expenses = txs.filter((t) => t.type === "expense");
  for (const t of expenses) {
    const peers = expenses.filter((o) => o.categoryId === t.categoryId && o.id !== t.id).map((o) => o.amountPoisha).sort((a, b) => a - b);
    if (peers.length < 3) continue;
    const mid = Math.floor(peers.length / 2);
    const median = peers.length % 2 ? peers[mid] : (peers[mid - 1] + peers[mid]) / 2;
    if (median > 0 && t.amountPoisha > median * 3) flagged.push(t.id);
  }
  return flagged;
}

/** Split a bill so the shares add up exactly to the total (remainder goes to the first people). */
export function splitBill(totalTaka: number, people: number): number[] {
  const n = Math.max(1, Math.floor(people));
  const total = toPoisha(Math.max(0, totalTaka));
  const base = Math.floor(total / n);
  const extra = total - base * n;
  return Array.from({ length: n }, (_, i) => fromPoisha(base + (i < extra ? 1 : 0)));
}

export type MfsProvider =
  | "bkash_app"
  | "bkash_ussd"
  | "nagad_app"
  | "nagad_ussd"
  | "rocket_app"
  | "rocket_atm";

export interface MfsFeeConfig {
  id: MfsProvider;
  nameBn: string;
  nameEn: string;
  ratePct: number;
  channel: "App" | "USSD" | "ATM";
  method: Method;
}

export const MFS_FEE_RATES: Record<MfsProvider, MfsFeeConfig> = {
  bkash_app: { id: "bkash_app", nameBn: "বিকাশ অ্যাপ (১.৪৯%)", nameEn: "bKash App (1.49%)", ratePct: 1.49, channel: "App", method: "bKash" },
  bkash_ussd: { id: "bkash_ussd", nameBn: "বিকাশ ইউএসএসডি (*২৪৭#) (১.৮৫%)", nameEn: "bKash USSD (*247#) (1.85%)", ratePct: 1.85, channel: "USSD", method: "bKash" },
  nagad_app: { id: "nagad_app", nameBn: "নগদ অ্যাপ (১.২৫%)", nameEn: "Nagad App (1.25%)", ratePct: 1.25, channel: "App", method: "Nagad" },
  nagad_ussd: { id: "nagad_ussd", nameBn: "নগদ ইউএসএসডি (*১৬৭#) (১.৫০%)", nameEn: "Nagad USSD (*167#) (1.50%)", ratePct: 1.50, channel: "USSD", method: "Nagad" },
  rocket_app: { id: "rocket_app", nameBn: "রকেট অ্যাপ (১.৬৭%)", nameEn: "Rocket App (1.67%)", ratePct: 1.67, channel: "App", method: "Rocket" },
  rocket_atm: { id: "rocket_atm", nameBn: "রকেট ডিবিবিএল এটিএম (০.৯০%)", nameEn: "Rocket DBBL ATM (0.90%)", ratePct: 0.90, channel: "ATM", method: "Rocket" },
};

export interface MfsFeeResult {
  amountPoisha: number;
  feePoisha: number;
  totalWithFeePoisha: number;
  ratePct: number;
  provider: MfsProvider;
}

/**
 * Calculate MFS cash-out fee in integer poisha with ceiling.
 * Banking invariant: Fractional poisha rounds UP so neither customer nor agent under-accounts.
 * Math: Math.ceil((amountPoisha * ratePct) / 100).
 */
export function calculateMfsCashoutFee(amountTakaOrPoisha: number, provider: MfsProvider, isPoisha = false): MfsFeeResult {
  const amountPoisha = isPoisha ? Math.max(0, Math.round(amountTakaOrPoisha)) : toPoisha(Math.max(0, amountTakaOrPoisha));
  const config = MFS_FEE_RATES[provider] ?? MFS_FEE_RATES.bkash_app;
  const feePoisha = amountPoisha > 0 ? Math.ceil((amountPoisha * config.ratePct) / 100) : 0;
  return {
    amountPoisha,
    feePoisha,
    totalWithFeePoisha: amountPoisha + feePoisha,
    ratePct: config.ratePct,
    provider: config.id,
  };
}

/** Resolve default MFS provider for a payment method. */
export function defaultMfsProvider(method: Method): MfsProvider | null {
  if (method === "bKash") return "bkash_app";
  if (method === "Nagad") return "nagad_app";
  if (method === "Rocket") return "rocket_app";
  return null;
}

const UTF8_BOM = "\uFEFF";

export const sanitizeCsvCell = (v: string | number): string => {
  const s = String(v);
  const isNumber = /^-?\d+(\.\d+)?$/.test(s.trim());
  const isFormula = (/^[\s]*[=+\-@＝＋－＠|]/u.test(s) || /^[\t\r\n]/u.test(s)) && !isNumber;
  const safe = isFormula ? "'" + s : s;
  return /[",\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
};

export function toCsv(txs: Transaction[]): string {
  const header = ["date", "type", "amount_bdt", "category", "method", "note", "trx_id", "source", "created_at", "updated_at"];
  const rows = [...txs]
    .sort((a, b) => a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt))
    .map((t) => [t.date, t.type, (t.amountPoisha / 100).toFixed(2), categoryById(t.categoryId).en, t.method, t.note, t.trxId ?? "", t.source, t.createdAt, t.updatedAt]);
  return UTF8_BOM + [header, ...rows].map((r) => r.map(sanitizeCsvCell).join(",")).join("\n");
}

/** Validate untrusted data read back from storage. Drops anything malformed instead of crashing. */
export function sanitizeTransactions(input: unknown): Transaction[] {
  if (!Array.isArray(input)) return [];
  const ids = new Set(CATEGORIES.map((c) => c.id));
  const methods: Method[] = ["Cash", "bKash", "Nagad", "Rocket", "Bank", "Card"];
  const out: Transaction[] = [];
  for (const t of input) {
    if (!t || typeof t !== "object") continue;
    const r = t as Record<string, unknown>;
    if (typeof r.id !== "string" || (r.type !== "expense" && r.type !== "income")) continue;
    if (typeof r.amountPoisha !== "number" || !Number.isInteger(r.amountPoisha) || r.amountPoisha <= 0 || r.amountPoisha > 10_000_000_000) continue;
    if (typeof r.date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(r.date)) continue;
    out.push({
      id: r.id,
      type: r.type,
      amountPoisha: r.amountPoisha,
      categoryId: ids.has(r.categoryId as CategoryId) ? (r.categoryId as CategoryId) : r.type === "income" ? "other_income" : "other",
      method: methods.includes(r.method as Method) ? (r.method as Method) : "Cash",
      note: typeof r.note === "string" ? r.note.slice(0, 300) : "",
      date: r.date,
      source: (["voice", "text", "sms", "manual", "migrated", "recurring"] as const).includes(r.source as Transaction["source"]) ? (r.source as Transaction["source"]) : "manual",
      trxId: typeof r.trxId === "string" ? r.trxId.slice(0, 40) : undefined,
      createdAt: typeof r.createdAt === "string" ? r.createdAt : new Date(0).toISOString(),
      updatedAt: typeof r.updatedAt === "string" ? r.updatedAt : new Date(0).toISOString(),
      history: Array.isArray(r.history) ? (r.history as { at: string; change: string }[]).filter((h) => h && typeof h.at === "string" && typeof h.change === "string").slice(-20) : [],
    });
  }
  return out;
}

/** Map the old v1 `shohoj_expenses` format (no dates, amounts in taka) into transactions. */
export function migrateLegacy(input: unknown, migratedOn: string): Transaction[] {
  if (!Array.isArray(input)) return [];
  const map: Record<string, CategoryId> = { Transport: "transport", Food: "food", Utilities: "utilities", Health: "health", Shopping: "shopping", Family: "family" };
  const now = new Date().toISOString();
  return input.flatMap((e) => {
    if (!e || typeof e !== "object") return [];
    const r = e as Record<string, unknown>;
    const amount = Number(r.amount);
    if (!(amount > 0)) return [];
    return [{
      id: `legacy-${String(r.id ?? Math.random()).slice(0, 30)}`,
      type: "expense" as const,
      amountPoisha: toPoisha(amount),
      categoryId: map[String(r.category)] ?? "other",
      method: (["bKash", "Nagad", "Cash", "Bank"].includes(String(r.method)) ? r.method : "Cash") as Method,
      note: `${String(r.note ?? "")}${r.time ? ` (পুরনো ভার্সন: ${String(r.time)})` : ""}`.slice(0, 300),
      date: migratedOn,
      source: "migrated" as const,
      createdAt: now,
      updatedAt: now,
      history: [{ at: now, change: "পুরনো ভার্সন থেকে স্থানান্তরিত — আসল তারিখ জানা নেই" }],
    }];
  });
}

// ---------------------------------------------------------------------------------------------
// Per-category monthly budgets (envelope-style, as in YNAB / Monefy) and savings goals.
// All amounts are integer poisha. Nothing here predicts the future: "needed per month" is plain
// arithmetic on the user's own target and date.

export type CategoryBudgets = Partial<Record<CategoryId, number>>; // poisha per month

export interface CategoryBudgetStatus {
  id: CategoryId;
  budgetPoisha: number;
  spentPoisha: number;
  remainingPoisha: number; // negative when over
  usedPct: number;
  level: "ok" | "near" | "over"; // near = 80% or more used
}

export function categoryBudgetStatus(summary: MonthSummary, budgets: CategoryBudgets): CategoryBudgetStatus[] {
  const spent = new Map(summary.byCategory.map((c) => [c.id, c.poisha]));
  const out: CategoryBudgetStatus[] = [];
  for (const c of CATEGORIES) {
    const budgetPoisha = budgets[c.id];
    if (!budgetPoisha || budgetPoisha <= 0) continue;
    const spentPoisha = spent.get(c.id) ?? 0;
    const usedPct = Math.round((spentPoisha / budgetPoisha) * 1000) / 10;
    out.push({
      id: c.id,
      budgetPoisha,
      spentPoisha,
      remainingPoisha: budgetPoisha - spentPoisha,
      usedPct,
      level: spentPoisha > budgetPoisha ? "over" : usedPct >= 80 ? "near" : "ok",
    });
  }
  return out.sort((a, b) => b.usedPct - a.usedPct);
}

const MAX_POISHA = 100_000_000_00; // ৳10 crore: anything larger is treated as corrupt input

export function sanitizeCategoryBudgets(input: unknown): CategoryBudgets | null {
  if (!input || typeof input !== "object" || Array.isArray(input)) return null;
  const ids = new Set(CATEGORIES.map((c) => c.id));
  const out: CategoryBudgets = {};
  for (const [k, v] of Object.entries(input as Record<string, unknown>)) {
    if (ids.has(k as CategoryId) && Number.isInteger(v) && (v as number) > 0 && (v as number) <= MAX_POISHA) out[k as CategoryId] = v as number;
  }
  return out;
}

export interface SavingsGoal {
  id: string;
  name: string;
  targetPoisha: number;
  targetDate: string | null; // YYYY-MM-DD, optional
  contributions: { id: string; date: string; poisha: number }[]; // negative = withdrawal
  createdAt: string;
}

export interface GoalProgress {
  savedPoisha: number;
  remainingPoisha: number; // never negative
  pct: number; // 0-100
  reached: boolean;
  daysLeft: number | null; // null without a date; negative when the date has passed
  /** Remaining amount spread over the 30-day periods left. Arithmetic, not a forecast. */
  perMonthNeededPoisha: number | null;
}

const dayNumber = (iso: string) => Math.floor(Date.parse(iso + "T00:00:00Z") / 86_400_000);

export function goalProgress(goal: SavingsGoal, today: string): GoalProgress {
  const savedPoisha = Math.max(0, goal.contributions.reduce((a, c) => a + c.poisha, 0));
  const remainingPoisha = Math.max(0, goal.targetPoisha - savedPoisha);
  const pct = goal.targetPoisha > 0 ? Math.min(100, Math.round((savedPoisha / goal.targetPoisha) * 1000) / 10) : 0;
  const daysLeft = goal.targetDate ? dayNumber(goal.targetDate) - dayNumber(today) : null;
  let perMonthNeededPoisha: number | null = null;
  if (daysLeft !== null && daysLeft >= 0 && remainingPoisha > 0) {
    const periods = Math.max(1, Math.ceil(daysLeft / 30));
    perMonthNeededPoisha = Math.ceil(remainingPoisha / periods);
  }
  return { savedPoisha, remainingPoisha, pct, reached: remainingPoisha === 0 && goal.targetPoisha > 0, daysLeft, perMonthNeededPoisha };
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function sanitizeGoals(input: unknown): SavingsGoal[] | null {
  if (!Array.isArray(input)) return null;
  const out: SavingsGoal[] = [];
  for (const g of input.slice(0, 50)) {
    if (!g || typeof g !== "object") continue;
    const o = g as Record<string, unknown>;
    if (typeof o.id !== "string" || typeof o.name !== "string" || !o.name.trim()) continue;
    if (!Number.isInteger(o.targetPoisha) || (o.targetPoisha as number) <= 0 || (o.targetPoisha as number) > MAX_POISHA) continue;
    const contributions = Array.isArray(o.contributions)
      ? o.contributions.filter((c): c is { id: string; date: string; poisha: number } =>
          !!c && typeof c === "object" && typeof (c as { id?: unknown }).id === "string" && typeof (c as { date?: unknown }).date === "string" && ISO_DATE.test((c as { date: string }).date) &&
          Number.isInteger((c as { poisha?: unknown }).poisha) && Math.abs((c as { poisha: number }).poisha) <= MAX_POISHA,
        ).slice(0, 1000)
      : [];
    out.push({
      id: o.id.slice(0, 64),
      name: o.name.slice(0, 80),
      targetPoisha: o.targetPoisha as number,
      targetDate: typeof o.targetDate === "string" && ISO_DATE.test(o.targetDate) ? o.targetDate : null,
      contributions,
      createdAt: typeof o.createdAt === "string" ? o.createdAt : "",
    });
  }
  return out;
}

// ---------------------------------------------------------------------------------------------
// 30-Day Cash Deficit & Baki Installment Simulator (Micro-merchant & Family Financial Resilience)
// Inspired by retail pharmacy cash flow management (LaMP). 100% deterministic integer poisha math.

export interface ScheduledFlow {
  id: string;
  dayOfMonth: number; // 1 to 30
  label: string;
  type: "income" | "expense";
  poisha: number;
}

export interface DayForecast {
  day: number;
  netChangePoisha: number;
  closingBalancePoisha: number;
  events: ScheduledFlow[];
}

export interface CashFlowSimulation {
  initialBalancePoisha: number;
  days: DayForecast[];
  lowestBalancePoisha: number;
  lowestBalanceDay: number;
  deficitDay: number | null; // Day when balance drops below 0, or null if solvent
  totalExpectedIncomePoisha: number;
  totalScheduledExpensePoisha: number;
  netSurplusPoisha: number;
  healthLevel: "solvent" | "vulnerable" | "critical"; // critical = deficit; vulnerable = lowest balance < 20% initial
}

export interface BakiInstallmentPlan {
  totalDebtPoisha: number;
  weeks: number;
  weeklyInstallmentPoisha: number;
  finalInstallmentPoisha: number;
  schedule: Array<{
    week: number;
    amountPoisha: number;
    dueDate: string;
  }>;
  smsReminderTemplateBn: string;
  smsReminderTemplateEn: string;
}

export function simulate30DayCashFlow(
  initialBalancePoisha: number,
  flows: ScheduledFlow[]
): CashFlowSimulation {
  const safeInitial = Math.max(0, initialBalancePoisha || 0);
  const days: DayForecast[] = [];
  let runningBalance = safeInitial;
  let lowestBalance = safeInitial;
  let lowestDay = 1;
  let deficitDay: number | null = null;
  let totalIncome = 0;
  let totalExpense = 0;

  const byDay = new Map<number, ScheduledFlow[]>();
  for (const f of flows) {
    const d = Math.max(1, Math.min(30, Math.floor(f.dayOfMonth || 1)));
    const list = byDay.get(d) ?? [];
    list.push(f);
    byDay.set(d, list);
    if (f.type === "income") totalIncome += Math.max(0, f.poisha);
    else totalExpense += Math.max(0, f.poisha);
  }

  for (let day = 1; day <= 30; day++) {
    const events = byDay.get(day) ?? [];
    let netChange = 0;
    for (const e of events) {
      if (e.type === "income") netChange += Math.max(0, e.poisha);
      else netChange -= Math.max(0, e.poisha);
    }
    runningBalance += netChange;
    days.push({
      day,
      netChangePoisha: netChange,
      closingBalancePoisha: runningBalance,
      events,
    });

    if (runningBalance < lowestBalance) {
      lowestBalance = runningBalance;
      lowestDay = day;
    }
    if (runningBalance < 0 && deficitDay === null) {
      deficitDay = day;
    }
  }

  let healthLevel: "solvent" | "vulnerable" | "critical" = "solvent";
  if (deficitDay !== null || lowestBalance < 0) {
    healthLevel = "critical";
  } else if (lowestBalance < safeInitial * 0.2 || lowestBalance < 500_00) {
    healthLevel = "vulnerable";
  }

  return {
    initialBalancePoisha: safeInitial,
    days,
    lowestBalancePoisha: lowestBalance,
    lowestBalanceDay: lowestDay,
    deficitDay,
    totalExpectedIncomePoisha: totalIncome,
    totalScheduledExpensePoisha: totalExpense,
    netSurplusPoisha: totalIncome - totalExpense,
    healthLevel,
  };
}

export function calculateBakiInstallments(
  debtTaka: number,
  weeks: number,
  startDateIso: string,
  customerName: string,
  merchantName: string
): BakiInstallmentPlan {
  const totalPoisha = Math.max(0, Math.round((Number(debtTaka) || 0) * 100));
  const numWeeks = Math.max(1, Math.min(52, Math.floor(Number(weeks) || 1)));
  const baseWeekly = Math.floor(totalPoisha / numWeeks);
  const remainder = totalPoisha - baseWeekly * numWeeks;

  const schedule: Array<{ week: number; amountPoisha: number; dueDate: string }> = [];
  const baseDateMs = Date.parse(startDateIso + "T00:00:00Z") || Date.now();

  for (let w = 1; w <= numWeeks; w++) {
    const isLast = w === numWeeks;
    const weekAmount = isLast ? baseWeekly + remainder : baseWeekly;
    const dueMs = baseDateMs + (w - 1) * 7 * 86_400_000;
    const dueDate = new Date(dueMs).toISOString().slice(0, 10);
    schedule.push({
      week: w,
      amountPoisha: weekAmount,
      dueDate,
    });
  }

  const takaFmt = (p: number) => `৳${(p / 100).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
  const finalAmount = schedule[schedule.length - 1]?.amountPoisha ?? baseWeekly;

  const smsBn = `শ্রদ্ধেয় ${customerName || "গ্রাহক"}, ${merchantName || "দোকান"}-এর বকেয়া বাকি কিস্তির পরিমাণ ${takaFmt(baseWeekly)}। আগামী কিস্তির তারিখ: ${schedule[0]?.dueDate || startDateIso}। নিয়মমাফিক পরিশোধের জন্য ধন্যবাদ।`;
  const smsEn = `Dear ${customerName || "Customer"}, your installment of ${takaFmt(baseWeekly)} for ${merchantName || "Store"} is scheduled for ${schedule[0]?.dueDate || startDateIso}. Thank you for your timely payment.`;

  return {
    totalDebtPoisha: totalPoisha,
    weeks: numWeeks,
    weeklyInstallmentPoisha: baseWeekly,
    finalInstallmentPoisha: finalAmount,
    schedule,
    smsReminderTemplateBn: smsBn,
    smsReminderTemplateEn: smsEn,
  };
}

// ---------------------------------------------------------------------------------------------
// Rent & bills pockets (ভাড়া ও বিলের পকেট). Escrow-style: income is set aside for each fixed due
// before its due date, earliest due first. Integer poisha only; the reconciliation invariant is
// paidThisMonth + setAside + leftToSpend === income whenever income covers what has been paid.
// Payment records are SELF-RECORDED by the user; nothing here verifies that money moved.

export type DueKind = "rent" | "electricity" | "gas" | "water" | "school" | "internet" | "loan" | "other";

export const DUE_KINDS: { id: DueKind; en: string; bn: string }[] = [
  { id: "rent", en: "Rent", bn: "বাসা ভাড়া" },
  { id: "electricity", en: "Electricity", bn: "বিদ্যুৎ বিল" },
  { id: "gas", en: "Gas", bn: "গ্যাস বিল" },
  { id: "water", en: "Water", bn: "পানির বিল" },
  { id: "school", en: "School fee", bn: "স্কুলের বেতন" },
  { id: "internet", en: "Internet", bn: "ইন্টারনেট" },
  { id: "loan", en: "Loan instalment", bn: "ঋণের কিস্তি" },
  { id: "other", en: "Other due", bn: "অন্যান্য" },
];

export interface FixedDue {
  id: string;
  kind: DueKind;
  name: string;
  amountPoisha: number;
  dueDay: number; // 1-31; clamped to the month's last day
  createdAt: string;
}

export interface DuePayment {
  id: string;
  dueId: string;
  month: string; // YYYY-MM the payment settles
  dueDate: string; // YYYY-MM-DD snapshot of the due date for that month
  paidOn: string; // YYYY-MM-DD the user says they paid
  amountPoisha: number;
  name: string; // snapshot of the due's name, so history survives deleting the due
  recordedAt: string; // ISO
}

const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

export const daysInMonthOf = (month: string): number => {
  const [y, m] = month.split("-").map(Number);
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
};

/** Due date of a monthly due in a given month. Day 31 in a 30-day month (or February) becomes the last day. */
export function dueDateInMonth(dueDay: number, month: string): string {
  const d = Math.min(Math.max(1, Math.floor(dueDay)), daysInMonthOf(month));
  return `${month}-${String(d).padStart(2, "0")}`;
}

export function shiftMonth(month: string, by: number): string {
  const [y, m] = month.split("-").map(Number);
  const idx = y * 12 + (m - 1) + by;
  return `${Math.floor(idx / 12)}-${String((idx % 12) + 1).padStart(2, "0")}`;
}

export const isPaidOnTime = (p: Pick<DuePayment, "paidOn" | "dueDate">): boolean => p.paidOn <= p.dueDate;

export const daysLate = (p: Pick<DuePayment, "paidOn" | "dueDate">): number => Math.max(0, dayNumber(p.paidOn) - dayNumber(p.dueDate));

export interface PocketLine {
  dueId: string;
  kind: DueKind;
  name: string;
  amountPoisha: number;
  dueDate: string;
  daysLeft: number; // negative when the due date has passed
  status: "paid" | "covered" | "partial" | "uncovered";
  setAsidePoisha: number; // 0 for paid dues
  shortfallPoisha: number; // what income cannot cover
  overdue: boolean; // unpaid and the due date has passed
  payment: DuePayment | null;
  paidOnTime: boolean | null;
}

export interface PocketPlan {
  month: string;
  incomePoisha: number;
  paidPoisha: number; // payments recorded this month
  setAsidePoisha: number; // sum of setAsidePoisha over unpaid lines, exactly
  leftToSpendPoisha: number; // never negative
  shortfallPoisha: number; // sum of line shortfalls
  lines: PocketLine[]; // sorted by due date, then name
  uncoveredIds: string[];
}

/**
 * Plan the month's pockets. Paid dues come out of income first (the money is gone), then the rest
 * of income is set aside for unpaid dues in due-date order. Every amount is an integer, so the
 * pockets add up to the total set aside with no rounding loss.
 */
export function planPockets(dues: FixedDue[], incomePoisha: number, month: string, payments: DuePayment[], today: string): PocketPlan {
  const income = Number.isInteger(incomePoisha) && incomePoisha > 0 ? incomePoisha : 0;
  const paidMap = new Map(payments.filter((p) => p.month === month).map((p) => [p.dueId, p]));
  const sorted = dues
    .map((d) => ({ d, dueDate: dueDateInMonth(d.dueDay, month) }))
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate) || a.d.name.localeCompare(b.d.name) || a.d.id.localeCompare(b.d.id));

  let paid = 0;
  for (const { d } of sorted) { const p = paidMap.get(d.id); if (p) paid += p.amountPoisha; }
  let available = Math.max(0, income - paid);

  const lines: PocketLine[] = sorted.map(({ d, dueDate }) => {
    const payment = paidMap.get(d.id) ?? null;
    const daysLeft = dayNumber(dueDate) - dayNumber(today);
    if (payment) {
      return { dueId: d.id, kind: d.kind, name: d.name, amountPoisha: d.amountPoisha, dueDate, daysLeft, status: "paid", setAsidePoisha: 0, shortfallPoisha: 0, overdue: false, payment, paidOnTime: isPaidOnTime(payment) };
    }
    const setAside = Math.min(d.amountPoisha, available);
    available -= setAside;
    const shortfall = d.amountPoisha - setAside;
    const status: PocketLine["status"] = shortfall === 0 ? "covered" : setAside > 0 ? "partial" : "uncovered";
    return { dueId: d.id, kind: d.kind, name: d.name, amountPoisha: d.amountPoisha, dueDate, daysLeft, status, setAsidePoisha: setAside, shortfallPoisha: shortfall, overdue: daysLeft < 0, payment: null, paidOnTime: null };
  });

  return {
    month,
    incomePoisha: income,
    paidPoisha: paid,
    setAsidePoisha: lines.reduce((a, l) => a + l.setAsidePoisha, 0),
    leftToSpendPoisha: available,
    shortfallPoisha: lines.reduce((a, l) => a + l.shortfallPoisha, 0),
    lines,
    uncoveredIds: lines.filter((l) => l.status === "partial" || l.status === "uncovered").map((l) => l.dueId),
  };
}

/** Record (or replace) the payment of one due for one month. Pure: returns a new array. */
export function markDuePaid(payments: DuePayment[], due: FixedDue, month: string, paidOn: string, recordedAt: string, amountPoisha = due.amountPoisha): DuePayment[] {
  if (!MONTH_RE.test(month) || !ISO_DATE.test(paidOn)) throw new Error("Invalid month or payment date.");
  if (!Number.isInteger(amountPoisha) || amountPoisha <= 0 || amountPoisha > MAX_POISHA) throw new Error("Invalid payment amount.");
  const record: DuePayment = { id: `${due.id}:${month}`, dueId: due.id, month, dueDate: dueDateInMonth(due.dueDay, month), paidOn, amountPoisha, name: due.name, recordedAt };
  return [...payments.filter((p) => !(p.dueId === due.id && p.month === month)), record];
}

export const unmarkDuePaid = (payments: DuePayment[], dueId: string, month: string): DuePayment[] =>
  payments.filter((p) => !(p.dueId === dueId && p.month === month));

export interface MonthPaymentHistory {
  month: string;
  records: DuePayment[];
  onTime: number;
  late: number;
  totalPoisha: number;
}

/** Payment history grouped by month, newest month first. */
export function paymentHistory(payments: DuePayment[]): MonthPaymentHistory[] {
  const byMonth = new Map<string, DuePayment[]>();
  for (const p of payments) byMonth.set(p.month, [...(byMonth.get(p.month) ?? []), p]);
  return [...byMonth.entries()]
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([month, records]) => {
      const sorted = [...records].sort((a, b) => a.dueDate.localeCompare(b.dueDate) || a.name.localeCompare(b.name));
      const onTime = sorted.filter(isPaidOnTime).length;
      return { month, records: sorted, onTime, late: sorted.length - onTime, totalPoisha: sorted.reduce((a, r) => a + r.amountPoisha, 0) };
    });
}

export const PAYMENT_RECORD_LABEL_EN = "SELF-RECORDED PAYMENT RECORD. Entered by the payer in KormoPath Shohoj Budget on their own device. NOT verified by KormoPath or by any bank or MFS provider or landlord. Ask for receipts or statements to verify.";
export const PAYMENT_RECORD_LABEL_BN = "নিজে লেখা পরিশোধের রেকর্ড। পরিশোধকারী নিজের ডিভাইসে সহজ বাজেটে লিখেছেন। KormoPath, ব্যাংক, এমএফএস বা বাড়িওয়ালা এটি যাচাই করেনি। যাচাইয়ের জন্য রসিদ বা স্টেটমেন্ট দেখুন।";

/** CSV "payment record" a user can show a landlord or lender. The label rows say it is self-recorded. No BOM. */
export function paymentRecordCsv(payments: DuePayment[], generatedOn: string, holder = ""): string {
  const rows: (string | number)[][] = [
    [PAYMENT_RECORD_LABEL_EN],
    [PAYMENT_RECORD_LABEL_BN],
    [`Generated on ${generatedOn}${holder.trim() ? ` for ${holder.trim().slice(0, 80)}` : ""}`],
    [],
    ["month", "due", "due_date", "paid_on", "amount_bdt", "on_time", "days_late", "verified"],
  ];
  const sorted = [...payments].sort((a, b) => a.month.localeCompare(b.month) || a.dueDate.localeCompare(b.dueDate) || a.name.localeCompare(b.name));
  for (const p of sorted) rows.push([p.month, p.name, p.dueDate, p.paidOn, (p.amountPoisha / 100).toFixed(2), isPaidOnTime(p) ? "yes" : "no", daysLate(p), "no (self-recorded)"]);
  const onTime = sorted.filter(isPaidOnTime).length;
  rows.push([], [`Summary: ${sorted.length} payments recorded; ${onTime} on or before the due date; ${sorted.length - onTime} late.`]);
  return rows.map((r) => r.map(sanitizeCsvCell).join(",")).join("\n") + "\n";
}

const DUE_KIND_IDS = new Set(DUE_KINDS.map((k) => k.id));

export function sanitizeDues(input: unknown): FixedDue[] | null {
  if (!Array.isArray(input)) return null;
  const out: FixedDue[] = [];
  for (const d of input.slice(0, 50)) {
    if (!d || typeof d !== "object") continue;
    const o = d as Record<string, unknown>;
    if (typeof o.id !== "string" || !o.id || typeof o.name !== "string" || !o.name.trim()) continue;
    if (!Number.isInteger(o.amountPoisha) || (o.amountPoisha as number) <= 0 || (o.amountPoisha as number) > MAX_POISHA) continue;
    if (!Number.isInteger(o.dueDay) || (o.dueDay as number) < 1 || (o.dueDay as number) > 31) continue;
    out.push({
      id: o.id.slice(0, 64),
      kind: DUE_KIND_IDS.has(o.kind as DueKind) ? (o.kind as DueKind) : "other",
      name: o.name.trim().slice(0, 60),
      amountPoisha: o.amountPoisha as number,
      dueDay: o.dueDay as number,
      createdAt: typeof o.createdAt === "string" ? o.createdAt.slice(0, 40) : "",
    });
  }
  return out;
}

export function sanitizeDuePayments(input: unknown): DuePayment[] | null {
  if (!Array.isArray(input)) return null;
  const out: DuePayment[] = [];
  const seen = new Set<string>();
  for (const d of input.slice(0, 2000)) {
    if (!d || typeof d !== "object") continue;
    const o = d as Record<string, unknown>;
    if (typeof o.id !== "string" || typeof o.dueId !== "string" || typeof o.name !== "string") continue;
    if (typeof o.month !== "string" || !MONTH_RE.test(o.month)) continue;
    if (typeof o.dueDate !== "string" || !ISO_DATE.test(o.dueDate) || !o.dueDate.startsWith(o.month)) continue;
    if (typeof o.paidOn !== "string" || !ISO_DATE.test(o.paidOn)) continue;
    if (!Number.isInteger(o.amountPoisha) || (o.amountPoisha as number) <= 0 || (o.amountPoisha as number) > MAX_POISHA) continue;
    const key = `${o.dueId}:${o.month}`;
    if (seen.has(key)) continue; // one payment per due per month
    seen.add(key);
    out.push({
      id: o.id.slice(0, 80), dueId: o.dueId.slice(0, 64), month: o.month, dueDate: o.dueDate, paidOn: o.paidOn,
      amountPoisha: o.amountPoisha as number, name: o.name.slice(0, 60), recordedAt: typeof o.recordedAt === "string" ? o.recordedAt.slice(0, 40) : "",
    });
  }
  return out;
}
