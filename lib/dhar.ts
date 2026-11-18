/*
 * Dhar & Baki ledger (দেনা-পাওনা) for Shohoj Budget. NO imports — pure and unit-tested (tests/dhar.test.ts).
 *
 * Money lent (dhar given) is recoverable, not spending; shop baki and borrowed money are owed, not yet spent cash.
 * Amounts are integer poisha. Settlement history is append-only: a payment is never edited, only added, and an
 * entry with history can only be deleted as a whole (the UI confirms first).
 */

export type DharDirection = "receivable" | "payable"; // receivable: আমি পাব · payable: আমি দেব

export type DharCategory = "personal" | "shop_baki" | "mess_office" | "samity_emi";

export type PaymentMethod = "cash" | "bkash" | "nagad" | "rocket" | "bank" | "other";

export type ReminderTone = "friendly" | "formal" | "urgent";

export const DHAR_CATEGORIES: Record<DharCategory, { bn: string; en: string; icon: string }> = {
  personal: { bn: "ব্যক্তিগত ধার", en: "Personal Loan", icon: "🤝" },
  shop_baki: { bn: "দোকানের বাকি", en: "Shop Baki", icon: "🛒" },
  mess_office: { bn: "মেস/অফিস খরচ", en: "Mess/Shared", icon: "💼" },
  samity_emi: { bn: "কিস্তি/সমিতি", en: "EMI/Samity", icon: "⏱️" },
};

export const PAYMENT_METHODS: Record<PaymentMethod, { bn: string; en: string }> = {
  cash: { bn: "নগদ (Cash)", en: "Cash" },
  bkash: { bn: "বিকাশ (bKash)", en: "bKash" },
  nagad: { bn: "নগদ (Nagad)", en: "Nagad" },
  rocket: { bn: "রকেট (Rocket)", en: "Rocket" },
  bank: { bn: "ব্যাংক ট্রান্সফার", en: "Bank Transfer" },
  other: { bn: "অন্যান্য", en: "Other" },
};

export interface DharSettlement {
  id: string;
  date: string; // YYYY-MM-DD
  amountPoisha: number; // > 0
  note: string;
  method?: PaymentMethod;
  txnId?: string;
}

export interface DharEntry {
  id: string;
  direction: DharDirection;
  counterparty: string;
  phone: string; // "" or +8801XXXXXXXXX
  principalPoisha: number; // > 0
  date: string; // YYYY-MM-DD the dhar/baki started
  due: string; // "" or YYYY-MM-DD
  note: string;
  category?: DharCategory;
  settlements: DharSettlement[];
  createdAt: number;
}

export const MAX_DHAR_ENTRIES = 300;
export const MAX_SETTLEMENTS = 100;
export const MAX_PRINCIPAL_POISHA = 100_000_000_00; // ৳10 crore: a sanity cap, not a rule

const ISO = /^\d{4}-\d{2}-\d{2}$/;
export function isIsoDate(v: unknown): v is string {
  if (typeof v !== "string" || !ISO.test(v)) return false;
  const [y, m, d] = v.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1, d));
  return t.getUTCFullYear() === y && t.getUTCMonth() === m - 1 && t.getUTCDate() === d;
}

/** Today in Bangladesh (UTC+6), whatever the device timezone. */
export const todayDhaka = (now: Date = new Date()) => new Date(now.getTime() + 6 * 3_600_000).toISOString().slice(0, 10);

/** Bangladeshi mobile as +8801XXXXXXXXX, accepting Bangla digits, spaces, dashes and an optional +88 / 88. */
export function normalizeBdMobile(raw: string): string | null {
  const digits = String(raw ?? "")
    .replace(/[০-৯]/g, (d) => String("০১২৩৪৫৬৭৮৯".indexOf(d)))
    .replace(/[\s\-().]/g, "")
    .replace(/^\+?88(?=01)/, "");
  return /^01[3-9]\d{8}$/.test(digits) ? `+88${digits}` : null;
}

/** Taka text (Bangla or ASCII digits, commas, up to 2 decimals) to integer poisha; null when invalid or ≤ 0. */
export function takaToPoisha(raw: string | number): number | null {
  const s = String(raw ?? "").replace(/[০-৯]/g, (d) => String("০১২৩৪৫৬৭৮৯".indexOf(d))).replace(/[,\s৳]/g, "").replace(/টাকা|tk/gi, "");
  if (!/^\d+(\.\d{1,2})?$/.test(s)) return null;
  const [whole, frac = ""] = s.split(".");
  const p = Number(whole) * 100 + Number((frac + "00").slice(0, 2));
  return Number.isSafeInteger(p) && p > 0 && p <= MAX_PRINCIPAL_POISHA ? p : null;
}

export const settledPoisha = (e: DharEntry) => e.settlements.reduce((s, x) => s + x.amountPoisha, 0);
export const remainingPoisha = (e: DharEntry) => Math.max(0, e.principalPoisha - settledPoisha(e));
export const isSettled = (e: DharEntry) => remainingPoisha(e) === 0;
export const isOverdue = (e: DharEntry, today: string) => !isSettled(e) && !!e.due && e.due < today;

export interface DharTotals {
  receivePoisha: number; // still to get back
  payPoisha: number; // still to pay
  netPoisha: number; // receive − pay
  openCount: number;
  overdue: DharEntry[];
}

export function dharTotals(entries: DharEntry[], today: string): DharTotals {
  let receivePoisha = 0, payPoisha = 0, openCount = 0;
  const overdue: DharEntry[] = [];
  for (const e of entries) {
    const r = remainingPoisha(e);
    if (!r) continue;
    openCount++;
    if (e.direction === "receivable") receivePoisha += r; else payPoisha += r;
    if (isOverdue(e, today)) overdue.push(e);
  }
  overdue.sort((a, b) => a.due.localeCompare(b.due));
  return { receivePoisha, payPoisha, netPoisha: receivePoisha - payPoisha, openCount, overdue };
}

export interface PersonSummary {
  key: string;
  name: string;
  phone: string;
  receivePoisha: number;
  payPoisha: number;
  netPoisha: number; // > 0: they owe me · < 0: I owe them
  openEntries: number;
}

const personKey = (e: DharEntry) => (e.phone || e.counterparty.trim().toLowerCase().replace(/\s+/g, " "));

/** One line per person (matched by phone, else by name), open balances only, biggest first. */
export function perPerson(entries: DharEntry[]): PersonSummary[] {
  const map = new Map<string, PersonSummary>();
  for (const e of entries) {
    const r = remainingPoisha(e);
    if (!r) continue;
    const k = personKey(e);
    const p = map.get(k) ?? { key: k, name: e.counterparty, phone: e.phone, receivePoisha: 0, payPoisha: 0, netPoisha: 0, openEntries: 0 };
    if (e.direction === "receivable") p.receivePoisha += r; else p.payPoisha += r;
    p.netPoisha = p.receivePoisha - p.payPoisha;
    p.openEntries++;
    if (!p.phone && e.phone) p.phone = e.phone;
    map.set(k, p);
  }
  return [...map.values()].sort((a, b) => Math.abs(b.netPoisha) - Math.abs(a.netPoisha));
}

export type SettleResult = { ok: true; entry: DharEntry } | { ok: false; reason: "invalid_amount" | "more_than_remaining" | "invalid_date" | "too_many" };

/** Append one payment. Never more than what is still open; history is never rewritten. */
export function addSettlement(
  e: DharEntry,
  s: { id: string; date: string; amountPoisha: number; note?: string; method?: PaymentMethod; txnId?: string }
): SettleResult {
  if (!Number.isSafeInteger(s.amountPoisha) || s.amountPoisha <= 0) return { ok: false, reason: "invalid_amount" };
  if (s.amountPoisha > remainingPoisha(e)) return { ok: false, reason: "more_than_remaining" };
  if (!isIsoDate(s.date)) return { ok: false, reason: "invalid_date" };
  if (e.settlements.length >= MAX_SETTLEMENTS) return { ok: false, reason: "too_many" };
  return {
    ok: true,
    entry: {
      ...e,
      settlements: [
        ...e.settlements,
        {
          id: s.id,
          date: s.date,
          amountPoisha: s.amountPoisha,
          note: (s.note ?? "").slice(0, 120),
          method: s.method,
          txnId: s.txnId ? s.txnId.slice(0, 40) : undefined,
        },
      ],
    },
  };
}

export interface NewEntryInput {
  direction: DharDirection;
  counterparty: string;
  phone: string;
  amount: string;
  date: string;
  due: string;
  note: string;
  category?: DharCategory;
}

export type ValidateResult = { ok: true; entry: Omit<DharEntry, "id" | "createdAt"> } | { ok: false; errors: Array<"name" | "phone" | "amount" | "date" | "due"> };

export function validateEntry(i: NewEntryInput): ValidateResult {
  const errors: Array<"name" | "phone" | "amount" | "date" | "due"> = [];
  const name = i.counterparty.normalize("NFC").trim().replace(/\s+/g, " ");
  if (!name || name.length > 60) errors.push("name");
  const phone = i.phone.trim() ? normalizeBdMobile(i.phone) : "";
  if (phone === null) errors.push("phone");
  const p = takaToPoisha(i.amount);
  if (p === null) errors.push("amount");
  if (!isIsoDate(i.date)) errors.push("date");
  if (i.due && (!isIsoDate(i.due) || (isIsoDate(i.date) && i.due < i.date))) errors.push("due");
  if (errors.length) return { ok: false, errors };
  const cat: DharCategory = i.category && ["personal", "shop_baki", "mess_office", "samity_emi"].includes(i.category) ? i.category : "personal";
  return {
    ok: true,
    entry: {
      direction: i.direction,
      counterparty: name,
      phone: phone || "",
      principalPoisha: p as number,
      date: i.date,
      due: i.due || "",
      note: i.note.normalize("NFC").trim().slice(0, 160),
      category: cat,
      settlements: [],
    },
  };
}

const BN = "০১২৩৪৫৬৭৮৯";
const bnDigits = (s: string) => s.replace(/\d/g, (d) => BN[Number(d)]);

/** South Asian grouping (12,50,000) with up to 2 decimals; Bengali digits when bn. */
export function formatTaka(poisha: number, bn = true): string {
  const neg = poisha < 0;
  const abs = Math.abs(Math.round(poisha));
  const whole = String(Math.floor(abs / 100));
  const frac = abs % 100;
  const last3 = whole.slice(-3), rest = whole.slice(0, -3);
  const grouped = rest ? `${rest.replace(/\B(?=(\d{2})+(?!\d))/g, ",")},${last3}` : last3;
  const s = `${neg ? "-" : ""}৳${grouped}${frac ? `.${String(frac).padStart(2, "0")}` : ""}`;
  return bn ? bnDigits(s) : s;
}

/** Plain-text settlement slip for one person; the user copies or sends it themselves. */
export function settlementSlip(entries: DharEntry[], person: string, lang: "bn" | "en", today: string): string {
  const bn = lang === "bn";
  const mine = entries.filter((e) => personKey(e) === person);
  if (!mine.length) return "";
  const name = mine[0].counterparty;
  const d = (s: string) => (bn ? bnDigits(s) : s);
  const lines = [bn ? `দেনা-পাওনার হিসাব: ${name}` : `Dues statement: ${name}`, bn ? `তারিখ: ${d(today)}` : `Date: ${today}`, ""];
  let receive = 0, pay = 0;
  for (const e of [...mine].sort((a, b) => a.date.localeCompare(b.date))) {
    const r = remainingPoisha(e);
    const dir = e.direction === "receivable" ? (bn ? "আমি পাব" : "you owe me") : (bn ? "আমি দেব" : "I owe you");
    lines.push(`${d(e.date)} · ${dir} · ${formatTaka(e.principalPoisha, bn)}${e.note ? ` (${e.note})` : ""}`);
    for (const s of e.settlements) lines.push(`   ${d(s.date)} · ${bn ? "পরিশোধ" : "paid"} ${formatTaka(s.amountPoisha, bn)}${s.note ? ` (${s.note})` : ""}`);
    lines.push(`   ${bn ? "বাকি" : "open"}: ${formatTaka(r, bn)}${e.due && r ? ` · ${bn ? "শেষ তারিখ" : "due"} ${d(e.due)}` : ""}`);
    if (e.direction === "receivable") receive += r; else pay += r;
  }
  const net = receive - pay;
  lines.push("");
  lines.push(net > 0 ? (bn ? `মোট আমার পাওনা: ${formatTaka(net, bn)}` : `Total you owe me: ${formatTaka(net, bn)}`)
    : net < 0 ? (bn ? `মোট আমার দেনা: ${formatTaka(-net, bn)}` : `Total I owe you: ${formatTaka(-net, bn)}`)
      : (bn ? "সব হিসাব মিটে গেছে।" : "All settled."));
  lines.push(bn ? "(নিজের ফোনে লেখা হিসাব; ভুল থাকলে জানাবেন।)" : "(Kept on my own phone; tell me if anything is wrong.)");
  return lines.join("\n");
}

export const smsHref = (phone: string, text: string) => `sms:${phone}?body=${encodeURIComponent(text)}`;
export const whatsappHref = (text: string, phone = "") => `https://wa.me/${phone.replace(/^\+/, "")}?text=${encodeURIComponent(text)}`;

const str = (v: unknown, max: number) => (typeof v === "string" ? v.slice(0, max) : "");

/** Storage guard: drops anything malformed, keeps history append-only shaped, caps sizes. */
export function sanitizeDhar(raw: unknown): DharEntry[] | null {
  if (!Array.isArray(raw)) return null;
  const out: DharEntry[] = [];
  for (const r of raw) {
    if (!r || typeof r !== "object") continue;
    const o = r as Record<string, unknown>;
    if (o.direction !== "receivable" && o.direction !== "payable") continue;
    const id = str(o.id, 40), name = str(o.counterparty, 60).trim();
    const principal = o.principalPoisha;
    if (!id || !name || !Number.isSafeInteger(principal) || (principal as number) <= 0 || (principal as number) > MAX_PRINCIPAL_POISHA || !isIsoDate(o.date)) continue;
    const phone = typeof o.phone === "string" && o.phone ? normalizeBdMobile(o.phone) ?? "" : "";
    const category: DharCategory = typeof o.category === "string" && ["personal", "shop_baki", "mess_office", "samity_emi"].includes(o.category) ? (o.category as DharCategory) : "personal";
    const settlements: DharSettlement[] = [];
    let sum = 0;
    for (const s of Array.isArray(o.settlements) ? o.settlements : []) {
      if (!s || typeof s !== "object") continue;
      const x = s as Record<string, unknown>;
      const a = x.amountPoisha;
      if (!Number.isSafeInteger(a) || (a as number) <= 0 || !isIsoDate(x.date) || sum + (a as number) > (principal as number)) continue;
      sum += a as number;
      const method: PaymentMethod | undefined = typeof x.method === "string" && ["cash", "bkash", "nagad", "rocket", "bank", "other"].includes(x.method) ? (x.method as PaymentMethod) : undefined;
      const txnId = typeof x.txnId === "string" ? str(x.txnId, 40) : undefined;
      settlements.push({ id: str(x.id, 40) || `s${settlements.length}`, date: x.date, amountPoisha: a as number, note: str(x.note, 120), method, txnId });
      if (settlements.length >= MAX_SETTLEMENTS) break;
    }
    out.push({
      id, direction: o.direction, counterparty: name, phone, principalPoisha: principal as number, date: o.date,
      due: isIsoDate(o.due) ? o.due : "", note: str(o.note, 160), category, settlements,
      createdAt: typeof o.createdAt === "number" && Number.isFinite(o.createdAt) ? o.createdAt : 0,
    });
    if (out.length >= MAX_DHAR_ENTRIES) break;
  }
  return out;
}

/** Polite & culturally appropriate reminder messages for Bangladesh */
export function generateReminderMessage(
  entry: DharEntry,
  tone: ReminderTone,
  lang: "bn" | "en",
  today: string
): string {
  const bn = lang === "bn";
  const rem = remainingPoisha(entry);
  const remFormatted = formatTaka(rem, bn);
  const totalFormatted = formatTaka(entry.principalPoisha, bn);
  const name = entry.counterparty;
  const d = (s: string) => (bn ? bnDigits(s) : s);

  if (entry.direction === "receivable") {
    if (tone === "friendly") {
      return bn
        ? `আসসালামু আলাইকুম ${name} ভাই/আপু, আশা করি ভালো আছেন। ব্যস্ততার মাঝে হয়তো মনে নেই— গত ${d(entry.date)}-এ ${entry.note ? `(${entry.note}) ` : ""}দেওয়া ধার বাবদ ${remFormatted} বাকি রয়েছে${entry.due ? ` (পরিশোধের কথা ছিল ${d(entry.due)})` : ""}। সুবিধাজনক সময়ে পাঠিয়ে দিলে কৃতজ্ঞ থাকব। ধন্যবাদ!`
        : `Hello ${name}, hope you are doing well! Just a gentle reminder regarding the loan of ${remFormatted}${entry.note ? ` for ${entry.note}` : ""} from ${entry.date}${entry.due ? ` (due ${entry.due})` : ""}. Please send it when convenient. Thank you!`;
    }
    if (tone === "formal") {
      return bn
        ? `দেনা-পাওনার হালনাগাদ হিসাব বিবরণী:\nপ্রাপক: ${name}\nমূল অঙ্ক: ${totalFormatted}\nবর্তমান বকেয়া: ${remFormatted}\nতারিখ: ${d(entry.date)}${entry.due ? ` · নির্ধারিত শেষ তারিখ: ${d(entry.due)}` : ""}\nঅনুগ্রহ করে হিসাব নিষ্পত্তির অনুরোধ করা হলো।`
        : `Dues Statement:\nCounterparty: ${name}\nOriginal Amount: ${totalFormatted}\nRemaining Balance: ${remFormatted}\nDate: ${entry.date}${entry.due ? ` · Due Date: ${entry.due}` : ""}\nPlease arrange settlement at your earliest convenience.`;
    }
    return bn
      ? `আসসালামু আলাইকুম ${name} ভাই, হঠাৎ পারিবারিক জরুরি প্রয়োজনে টাকার দরকার পড়েছে। গত ${d(entry.date)}-এর পাওনা ${remFormatted} টাকাটা আজ বা কালকের মধ্যে পাঠানো কি সম্ভব হবে? অনেক বড় উপকার হতো।`
      : `Hello ${name}, I am facing an urgent financial need today. Could you please arrange the repayment of ${remFormatted} from ${entry.date}? It would be of great help. Thank you.`;
  } else {
    return bn
      ? `আসসালামু আলাইকুম ${name} ভাই, আপনার থেকে নেওয়া ${remFormatted}${entry.note ? ` (${entry.note})` : ""}-এর বিষয়টি মনে আছে। ইনশাআল্লাহ দ্রুতই হিসাব চুকিয়ে দেব। বিলম্বের জন্য দুঃখিত!`
      : `Hello ${name}, I have not forgotten the ${remFormatted} I owe you${entry.note ? ` for ${entry.note}` : ""}. I will settle it soon, thank you for your patience!`;
  }
}

export interface ParsedDharVoice {
  direction: DharDirection;
  counterparty: string;
  amount: string;
  category: DharCategory;
  note: string;
}

export function parseDharVoiceText(rawText: string, today: string): { ok: true; entry: ParsedDharVoice } | { ok: false; reason: string } {
  const text = (rawText || "").normalize("NFC").trim();
  if (!text) return { ok: false, reason: "কোনো কথা পাওয়া যায়নি" };

  const digitMatch = text.match(/[০-৯\d]+(?:\.[০-৯\d]+)?/);
  if (!digitMatch) return { ok: false, reason: "টাকার পরিমাণ শনাক্ত করা যায়নি" };
  const amountStr = digitMatch[0].replace(/[০-৯]/g, (d) => String("০১২৩৪৫৬৭৮৯".indexOf(d)));

  const lower = text.toLowerCase();
  let direction: DharDirection = "receivable";
  if (
    lower.includes("দিতে হবে") ||
    lower.includes("দেব") ||
    lower.includes("বাকি আছে") ||
    lower.includes("বাকি") ||
    lower.includes("ধার নিলাম") ||
    lower.includes("ধার নিয়েছি") ||
    lower.includes("ঋণ নিলাম")
  ) {
    direction = "payable";
  }

  let category: DharCategory = "personal";
  if (lower.includes("দোকান") || lower.includes("স্টোর") || lower.includes("মুদি") || lower.includes("ফার্মেসি")) {
    category = "shop_baki";
  } else if (lower.includes("মেস") || lower.includes("অফিস") || lower.includes("খালা বিল") || lower.includes("মিল")) {
    category = "mess_office";
  } else if (lower.includes("কিস্তি") || lower.includes("সমিতি") || lower.includes("ডিপিএস")) {
    category = "samity_emi";
  }

  let cleaned = text
    .replace(/[০-৯\d]+(?:\.[০-৯\d]+)?/g, "")
    .replace(/টাকা|টাকার|tk/gi, "")
    .replace(/ধার\s*দিলাম|ধার\s*দিয়েছি|ধার\s*নিলাম|ধার\s*নিয়েছে|ধার\s*নিল/g, "")
    .replace(/বাকি\s*আছে|দিতে\s*হবে|পাব|দেব/g, "")
    .replace(/বিকাশে|নগদে|আজ|গতকাল|পরশু/g, "")
    .trim();

  cleaned = cleaned.replace(/কে$|র$|এর$/g, "").trim();
  const counterparty = cleaned.slice(0, 40) || (category === "shop_baki" ? "দোকান বাকি" : "অজ্ঞাত ব্যক্তি");

  return {
    ok: true,
    entry: {
      direction,
      counterparty,
      amount: amountStr,
      category,
      note: text.slice(0, 100),
    },
  };
}

export function exportDharToIcs(entries: DharEntry[]): string {
  const withDue = entries.filter((e) => e.due && remainingPoisha(e) > 0);
  if (!withDue.length) return "";

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//KormoPath//Shohoj Dhar Ledger//BN",
    "CALSCALE:GREGORIAN",
  ];

  for (const e of withDue) {
    const dt = e.due.replace(/-/g, "");
    const rem = formatTaka(remainingPoisha(e), false);
    const summary = e.direction === "receivable"
      ? `পাওনা আদায়: ${e.counterparty} (${rem})`
      : `দেনা পরিশোধ: ${e.counterparty} (${rem})`;
    const desc = `${e.counterparty}-এর দেনা-পাওনা পরিশোধের শেষ তারিখ। মূল অঙ্ক: ${formatTaka(e.principalPoisha, false)}। নোট: ${e.note || "নেই"}`;

    lines.push("BEGIN:VEVENT");
    lines.push(`UID:dhar-${e.id}@kormopath`);
    lines.push(`DTSTAMP:${dt}T090000Z`);
    lines.push(`DTSTART;VALUE=DATE:${dt}`);
    lines.push(`SUMMARY:${summary}`);
    lines.push(`DESCRIPTION:${desc}`);
    lines.push("BEGIN:VALARM");
    lines.push("ACTION:DISPLAY");
    lines.push("DESCRIPTION:Dhar Reminder");
    lines.push("TRIGGER:-P1D");
    lines.push("END:VALARM");
    lines.push("END:VEVENT");
  }

  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}

export interface KarzEthicRule {
  id: string;
  titleBn: string;
  sourceBn: string;
  descriptionBn: string;
}

export const KARZ_HASANA_ETHICS: KarzEthicRule[] = [
  {
    id: "written_contract",
    titleBn: "ঋণ ও লেনদেন স্পষ্টভাবে লিখে রাখা",
    sourceBn: "পবিত্র কুরআন (সূরা আল-বাকারা: ২৮২)",
    descriptionBn: "ছোট বা বড় যেকোনো মেয়াদি ঋণ বা বাকির হিসাব লিখে রাখা আবশ্যক। এতে ভুল বোঝাবুঝি দূর হয় এবং হিসাব নিরাপদ থাকে।",
  },
  {
    id: "gentle_relief",
    titleBn: "অস্বচ্ছল ঋণগ্রস্তকে সময় দেওয়া বা মাফ করা",
    sourceBn: "সূরা আল-বাকারা: ২৮০ ও সহীহ হাদিস",
    descriptionBn: "ঋণগ্রহীতা যদি সংকটে পড়ে, তবে তাকে সামর্থ্য অর্জন পর্যন্ত সময় দেওয়া এবং সম্ভব হলে কিছু বা পুরো মাফ করে দেওয়া অশেষ সওয়াবের কাজ।",
  },
  {
    id: "no_extra_benefit",
    titleBn: "ঋণ দিয়ে অতিরিক্ত সুবিধা বা সুদ গ্রহণ না করা",
    sourceBn: "ইসলামি ফিকহ ও কর্জে হাসানা নীতি",
    descriptionBn: "কর্জ দেওয়ার বিনিময়ে কোনো প্রকার অতিরিক্ত অর্থ, পণ্য বা বাধ্যতামূলক সুবিধা দাবি করা যাবে না। কর্জ সম্পূর্ণ সুদমুক্ত মানবিক আমল।",
  },
  {
    id: "timely_repayment",
    titleBn: "সামর্থ্য থাকলে ইচ্ছাকৃত ঋণ পরিশোধে দেরি না করা",
    sourceBn: "সহীহ বুখারী: ২৪০০",
    descriptionBn: "টাকা পরিশোধের সামর্থ্য থাকার পরও ঋণদাতার পাওনা আটকে রাখা বা ঘোরানো জুলুমের শামিল। নির্ধারিত সময়ে পরিশোধ করা উত্তম মুমিনের বৈশিষ্ট্য।",
  },
];
