/*
 * Shohoj Budget wallets (হাতের টাকা ও ওয়ালেট). NO imports — pure and unit-tested (tests/wallets.test.ts).
 *
 * Money is integer poisha. A wallet's balance is its user-entered opening balance, plus income and minus
 * expense recorded in the main ledger with that payment method, plus transfers in, minus transfers out and the
 * fee each transfer cost. A transfer (bKash -> Cash by cash-out, Bank -> bKash, ...) moves money between the
 * person's own wallets, so it is never an expense; only its fee is a charge. That way a cash-out is not counted
 * twice. Invariant: the sum of all balances changes only by income - expense - fees.
 */

export const WALLET_IDS = ["Cash", "bKash", "Nagad", "Rocket", "Upay", "Bank", "Card"] as const;
export type WalletId = (typeof WALLET_IDS)[number];

export const WALLET_LABELS: Record<WalletId, { bn: string; en: string }> = {
  Cash: { bn: "হাতের টাকা", en: "Cash in hand" },
  bKash: { bn: "বিকাশ", en: "bKash" },
  Nagad: { bn: "নগদ", en: "Nagad" },
  Rocket: { bn: "রকেট", en: "Rocket" },
  Upay: { bn: "উপায়", en: "Upay" },
  Bank: { bn: "ব্যাংক", en: "Bank" },
  Card: { bn: "কার্ড", en: "Card" },
};

export type TransferKind = "cashout" | "transfer";

export interface WalletTransfer {
  id: string;
  date: string; // YYYY-MM-DD
  from: WalletId;
  to: WalletId;
  /** What arrives in `to` (for a cash-out: the cash in hand). */
  amountPoisha: number;
  /** Charge taken from `from` on top of the amount. */
  feePoisha: number;
  kind: TransferKind;
  /** Fee rate used, for the record (may be the user's own). */
  ratePct: number;
  /** Which provider rate was used (e.g. "bkash_ussd"), or "" for a free transfer. */
  provider: string;
  note: string;
  recordedAt: string; // ISO
}

export interface WalletsState {
  /** Opening balance per wallet, poisha (may be negative for a card or overdraft). */
  openings: Partial<Record<WalletId, number>>;
  transfers: WalletTransfer[];
  /** The user's own cash-out rates (percent), keyed by provider id; they override the starter rates. */
  rateOverrides: Record<string, number>;
}

/** The fields of a ledger transaction this module needs (the Transaction type in lib/budget.ts has them). */
export interface LedgerTx {
  type: "income" | "expense";
  method: string;
  amountPoisha: number;
  date: string;
}

export const EMPTY_WALLETS: WalletsState = { openings: {}, transfers: [], rateOverrides: {} };
export const MAX_TRANSFERS = 1000;
const MAX_POISHA = 100_000_000_000; // Tk 1 billion: anything bigger is a typo or tampered storage

const isWallet = (v: unknown): v is WalletId => typeof v === "string" && (WALLET_IDS as readonly string[]).includes(v);
const isInt = (v: unknown): v is number => typeof v === "number" && Number.isInteger(v) && Math.abs(v) <= MAX_POISHA;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Fee in integer poisha, rounded UP, with integer maths (rate in thousandths of a percent, so 1.395% is exact). */
export function feeFor(amountPoisha: number, ratePct: number): number {
  const amount = Math.max(0, Math.round(amountPoisha));
  const milli = Math.max(0, Math.round(ratePct * 1000));
  return amount > 0 && milli > 0 ? Math.ceil((amount * milli) / 100000) : 0;
}

/** To get `receivePoisha` in hand from a cash-out, this much leaves the wallet (amount + fee). */
export function cashoutTotal(receivePoisha: number, ratePct: number): { receivePoisha: number; feePoisha: number; totalPoisha: number } {
  const receive = Math.max(0, Math.round(receivePoisha));
  const fee = feeFor(receive, ratePct);
  return { receivePoisha: receive, feePoisha: fee, totalPoisha: receive + fee };
}

/** The most cash a balance can give in hand once the fee is taken (largest X with X + fee(X) <= balance). */
export function maxCashout(balancePoisha: number, ratePct: number): number {
  const bal = Math.max(0, Math.floor(balancePoisha));
  if (bal === 0) return 0;
  let x = Math.floor((bal * 100000) / (100000 + Math.max(0, Math.round(ratePct * 1000))));
  while (x > 0 && x + feeFor(x, ratePct) > bal) x--;
  while (x + 1 + feeFor(x + 1, ratePct) <= bal) x++;
  return x;
}

/** Ledger methods map to wallets one to one; anything else is ignored rather than guessed. */
const walletOfMethod = (method: string): WalletId | null => (isWallet(method) ? method : null);

export function walletBalances(state: WalletsState, txs: LedgerTx[]): Record<WalletId, number> {
  const out = Object.fromEntries(WALLET_IDS.map((w) => [w, state.openings[w] ?? 0])) as Record<WalletId, number>;
  for (const t of txs) {
    const w = walletOfMethod(t.method);
    if (!w || !isInt(t.amountPoisha)) continue;
    out[w] += t.type === "income" ? t.amountPoisha : -t.amountPoisha;
  }
  for (const tr of state.transfers) {
    out[tr.from] -= tr.amountPoisha + tr.feePoisha;
    out[tr.to] += tr.amountPoisha;
  }
  return out;
}

export const totalBalance = (b: Record<WalletId, number>): number => WALLET_IDS.reduce((s, w) => s + b[w], 0);

/** Transfer charges (cash-out and other fees) in one month, YYYY-MM. */
export function chargesInMonth(transfers: WalletTransfer[], month: string): { feePoisha: number; count: number } {
  let fee = 0, count = 0;
  for (const t of transfers) if (t.date.startsWith(month) && t.feePoisha > 0) { fee += t.feePoisha; count++; }
  return { feePoisha: fee, count };
}

/** Builds a checked transfer; returns an error code instead when it does not make sense. */
export function makeTransfer(input: {
  id: string; date: string; from: WalletId; to: WalletId; amountPoisha: number; kind: TransferKind;
  ratePct: number; provider: string; note?: string; recordedAt: string;
}): { ok: true; transfer: WalletTransfer } | { ok: false; error: "same_wallet" | "bad_amount" | "bad_date" | "bad_rate" } {
  if (input.from === input.to) return { ok: false, error: "same_wallet" };
  const amount = Math.round(input.amountPoisha);
  if (!Number.isFinite(amount) || amount <= 0 || amount > MAX_POISHA) return { ok: false, error: "bad_amount" };
  if (!ISO_DATE.test(input.date)) return { ok: false, error: "bad_date" };
  const rate = input.kind === "cashout" ? input.ratePct : 0;
  if (!Number.isFinite(rate) || rate < 0 || rate > 10) return { ok: false, error: "bad_rate" };
  return {
    ok: true,
    transfer: {
      id: input.id, date: input.date, from: input.from, to: input.to, amountPoisha: amount,
      feePoisha: feeFor(amount, rate), kind: input.kind, ratePct: rate, provider: input.kind === "cashout" ? input.provider.slice(0, 40) : "",
      note: (input.note ?? "").slice(0, 120), recordedAt: input.recordedAt,
    },
  };
}

/** Storage sanitizer for usePersistentState: drops anything malformed, never throws. */
export function sanitizeWallets(raw: unknown): WalletsState | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const openings: Partial<Record<WalletId, number>> = {};
  if (o.openings && typeof o.openings === "object") {
    for (const [k, v] of Object.entries(o.openings as Record<string, unknown>)) if (isWallet(k) && isInt(v)) openings[k] = v;
  }
  const transfers: WalletTransfer[] = [];
  for (const t of Array.isArray(o.transfers) ? o.transfers : []) {
    if (!t || typeof t !== "object") continue;
    const x = t as Record<string, unknown>;
    if (typeof x.id !== "string" || !x.id || !isWallet(x.from) || !isWallet(x.to) || x.from === x.to) continue;
    if (typeof x.date !== "string" || !ISO_DATE.test(x.date) || !isInt(x.amountPoisha) || x.amountPoisha <= 0 || !isInt(x.feePoisha) || x.feePoisha < 0) continue;
    if (x.kind !== "cashout" && x.kind !== "transfer") continue;
    const ratePct = typeof x.ratePct === "number" && Number.isFinite(x.ratePct) && x.ratePct >= 0 && x.ratePct <= 10 ? x.ratePct : 0;
    transfers.push({
      id: x.id.slice(0, 60), date: x.date, from: x.from, to: x.to, amountPoisha: x.amountPoisha, feePoisha: x.feePoisha, kind: x.kind, ratePct,
      provider: typeof x.provider === "string" ? x.provider.slice(0, 40) : "", note: typeof x.note === "string" ? x.note.slice(0, 120) : "",
      recordedAt: typeof x.recordedAt === "string" ? x.recordedAt.slice(0, 40) : "",
    });
    if (transfers.length >= MAX_TRANSFERS) break;
  }
  const rateOverrides: Record<string, number> = {};
  if (o.rateOverrides && typeof o.rateOverrides === "object") {
    for (const [k, v] of Object.entries(o.rateOverrides as Record<string, unknown>)) {
      if (/^[a-z_]{2,30}$/.test(k) && typeof v === "number" && Number.isFinite(v) && v >= 0 && v <= 10) rateOverrides[k] = v;
    }
  }
  return { openings, transfers, rateOverrides };
}
