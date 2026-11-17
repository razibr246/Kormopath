/*
 * Dhar & Baki ledger (দেনা-পাওনা) for Shohoj Budget. NO imports — pure and unit-tested (tests/dhar.test.ts).
 *
 * Money lent (dhar given) is recoverable, not spending; shop baki and borrowed money are owed, not yet spent cash.
 * Amounts are integer poisha. Settlement history is append-only: a payment is never edited, only added, and an
 * entry with history can only be deleted as a whole (the UI confirms first).
 */

export type DharDirection = "receivable" | "payable"; // receivable: আমি পাব · payable: আমি দেব

export interface DharSettlement {
  id: string;
  date: string; // YYYY-MM-DD
  amountPoisha: number; // > 0
  note: string;
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
export function addSettlement(e: DharEntry, s: { id: string; date: string; amountPoisha: number; note?: string }): SettleResult {
  if (!Number.isSafeInteger(s.amountPoisha) || s.amountPoisha <= 0) return { ok: false, reason: "invalid_amount" };
  if (s.amountPoisha > remainingPoisha(e)) return { ok: false, reason: "more_than_remaining" };
  if (!isIsoDate(s.date)) return { ok: false, reason: "invalid_date" };
  if (e.settlements.length >= MAX_SETTLEMENTS) return { ok: false, reason: "too_many" };
  return { ok: true, entry: { ...e, settlements: [...e.settlements, { id: s.id, date: s.date, amountPoisha: s.amountPoisha, note: (s.note ?? "").slice(0, 120) }] } };
}

export interface NewEntryInput {
  direction: DharDirection;
  counterparty: string;
  phone: string;
  amount: string;
  date: string;
  due: string;
  note: string;
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
  return { ok: true, entry: { direction: i.direction, counterparty: name, phone: phone || "", principalPoisha: p as number, date: i.date, due: i.due || "", note: i.note.normalize("NFC").trim().slice(0, 160), settlements: [] } };
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
    const settlements: DharSettlement[] = [];
    let sum = 0;
    for (const s of Array.isArray(o.settlements) ? o.settlements : []) {
      if (!s || typeof s !== "object") continue;
      const x = s as Record<string, unknown>;
      const a = x.amountPoisha;
      if (!Number.isSafeInteger(a) || (a as number) <= 0 || !isIsoDate(x.date) || sum + (a as number) > (principal as number)) continue;
      sum += a as number;
      settlements.push({ id: str(x.id, 40) || `s${settlements.length}`, date: x.date, amountPoisha: a as number, note: str(x.note, 120) });
      if (settlements.length >= MAX_SETTLEMENTS) break;
    }
    out.push({
      id, direction: o.direction, counterparty: name, phone, principalPoisha: principal as number, date: o.date,
      due: isIsoDate(o.due) ? o.due : "", note: str(o.note, 160), settlements,
      createdAt: typeof o.createdAt === "number" && Number.isFinite(o.createdAt) ? o.createdAt : 0,
    });
    if (out.length >= MAX_DHAR_ENTRIES) break;
  }
  return out;
}
