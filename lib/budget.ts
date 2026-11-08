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

const csvCell = (v: string | number) => {
  const s = String(v);
  // Neutralise spreadsheet formula injection and quote when needed.
  const safe = /^[\s]*[=+\-@＝＋－＠]|^[\t\r\n]/u.test(s) && !/^-?\d+(\.\d+)?$/.test(s) ? "'" + s : s;
  return /[",\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
};

export function toCsv(txs: Transaction[]): string {
  const header = ["date", "type", "amount_bdt", "category", "method", "note", "trx_id", "source", "created_at", "updated_at"];
  const rows = [...txs]
    .sort((a, b) => a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt))
    .map((t) => [t.date, t.type, (t.amountPoisha / 100).toFixed(2), categoryById(t.categoryId).en, t.method, t.note, t.trxId ?? "", t.source, t.createdAt, t.updatedAt]);
  return [header, ...rows].map((r) => r.map(csvCell).join(",")).join("\n");
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
