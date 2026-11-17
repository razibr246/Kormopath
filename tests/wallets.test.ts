import { test } from "node:test";
import assert from "node:assert/strict";
import {
  WALLET_IDS, cashoutTotal, chargesInMonth, feeFor, makeTransfer, maxCashout, sanitizeWallets, totalBalance, walletBalances,
  type LedgerTx, type WalletsState,
} from "../lib/wallets.ts";

const tx = (type: "income" | "expense", method: string, taka: number, date = "2026-11-05"): LedgerTx => ({ type, method, amountPoisha: taka * 100, date });
const transfer = (from: any, to: any, taka: number, kind: "cashout" | "transfer", ratePct: number, date = "2026-11-10") => {
  const r = makeTransfer({ id: `t${taka}${from}${to}`, date, from, to, amountPoisha: taka * 100, kind, ratePct, provider: "bkash_ussd", recordedAt: "2026-11-10T10:00:00Z" });
  assert.ok(r.ok);
  return r.transfer;
};

test("wallets: fees are integer poisha, rounded up, exact for 1.395%", () => {
  assert.equal(feeFor(100000, 1.85), 1850); // Tk 1,000 at 1.85% = Tk 18.50
  assert.equal(feeFor(100000, 1.395), 1395); // Tk 1,000 at 1.395% = Tk 13.95
  assert.equal(feeFor(33300, 1.49), 497); // 496.17 -> 497
  assert.equal(feeFor(0, 1.85), 0);
  assert.equal(feeFor(-500, 1.85), 0);
  assert.deepEqual(cashoutTotal(500000, 1.85), { receivePoisha: 500000, feePoisha: 9250, totalPoisha: 509250 }); // Tk 5,000 in hand costs Tk 5,092.50
});

test("wallets: maxCashout never overdraws and is the largest amount that fits", () => {
  for (const [bal, rate] of [[509250, 1.85], [100000, 1.395], [1, 1.85], [0, 1.85], [777777, 0.9]] as const) {
    const x = maxCashout(bal, rate);
    assert.ok(x + feeFor(x, rate) <= bal, `fits ${bal}`);
    assert.ok(x + 1 + feeFor(x + 1, rate) > bal, `largest ${bal}`);
  }
  assert.equal(maxCashout(509250, 1.85), 500000);
});

test("wallets: a cash-out moves money, it is not an expense; only the fee is a charge", () => {
  const state: WalletsState = { openings: { Cash: 100000, bKash: 1000000 }, transfers: [], rateOverrides: {} };
  const ledger = [tx("income", "bKash", 20000), tx("expense", "Cash", 820), tx("expense", "bKash", 1450)];
  const before = walletBalances(state, ledger);
  assert.equal(before.Cash, 100000 - 82000);
  assert.equal(before.bKash, 1000000 + 2000000 - 145000);

  const after = walletBalances({ ...state, transfers: [transfer("bKash", "Cash", 5000, "cashout", 1.85)] }, ledger);
  assert.equal(after.Cash, before.Cash + 500000);
  assert.equal(after.bKash, before.bKash - 500000 - 9250);
  assert.equal(totalBalance(after), totalBalance(before) - 9250, "the total drops only by the fee");
});

test("wallets invariant: total = openings + income - expense - fees, whatever the transfers", () => {
  const openings = { Cash: 50000, bKash: 300000, Bank: 5000000, Card: -20000 };
  const ledger = [tx("income", "Bank", 45000), tx("expense", "Cash", 300), tx("expense", "Card", 1200), tx("income", "Nagad", 700), tx("expense", "Upay", 50), tx("expense", "Unknown", 999)];
  const transfers = [
    transfer("Bank", "bKash", 10000, "transfer", 0),
    transfer("bKash", "Cash", 4000, "cashout", 1.85),
    transfer("Nagad", "Cash", 500, "cashout", 1.5),
    transfer("Cash", "Upay", 100, "transfer", 0),
  ];
  const b = walletBalances({ openings, transfers, rateOverrides: {} }, ledger);
  const income = (45000 + 700) * 100, expense = (300 + 1200 + 50) * 100; // "Unknown" method is not a wallet: ignored
  const fees = transfers.reduce((s, t) => s + t.feePoisha, 0);
  assert.equal(totalBalance(b), 50000 + 300000 + 5000000 - 20000 + income - expense - fees);
  assert.equal(transfers[0].feePoisha, 0, "a plain transfer has no fee");
  assert.deepEqual(Object.keys(b), [...WALLET_IDS]);
});

test("wallets: monthly charges count only fees in that month", () => {
  const ts = [transfer("bKash", "Cash", 1000, "cashout", 1.85, "2026-11-02"), transfer("bKash", "Cash", 2000, "cashout", 1.85, "2026-10-30"), transfer("Bank", "bKash", 3000, "transfer", 0, "2026-11-03")];
  assert.deepEqual(chargesInMonth(ts, "2026-11"), { feePoisha: 1850, count: 1 });
});

test("wallets: makeTransfer refuses nonsense", () => {
  const base = { id: "x", date: "2026-11-10", from: "bKash" as const, to: "Cash" as const, amountPoisha: 1000, kind: "cashout" as const, ratePct: 1.85, provider: "bkash_ussd", recordedAt: "z" };
  assert.deepEqual(makeTransfer({ ...base, to: "bKash" }), { ok: false, error: "same_wallet" });
  assert.deepEqual(makeTransfer({ ...base, amountPoisha: 0 }), { ok: false, error: "bad_amount" });
  assert.deepEqual(makeTransfer({ ...base, date: "10/11/2026" }), { ok: false, error: "bad_date" });
  assert.deepEqual(makeTransfer({ ...base, ratePct: 50 }), { ok: false, error: "bad_rate" });
  const free = makeTransfer({ ...base, kind: "transfer", ratePct: 50 });
  assert.ok(free.ok && free.transfer.feePoisha === 0, "the rate is ignored for a plain transfer");
});

test("wallets: sanitizeWallets keeps good data and drops tampered rows", () => {
  assert.equal(sanitizeWallets(null), null);
  assert.equal(sanitizeWallets("x"), null);
  const s = sanitizeWallets({
    openings: { Cash: 5000, Gold: 10, bKash: 1.5, Bank: 2e14 },
    transfers: [
      { id: "a", date: "2026-11-01", from: "bKash", to: "Cash", amountPoisha: 100000, feePoisha: 1850, kind: "cashout", ratePct: 1.85, provider: "bkash_ussd", note: "", recordedAt: "" },
      { id: "b", date: "2026-11-01", from: "Cash", to: "Cash", amountPoisha: 100, feePoisha: 0, kind: "transfer" },
      { id: "c", date: "bad", from: "Bank", to: "Cash", amountPoisha: 100, feePoisha: 0, kind: "transfer" },
      { id: "d", date: "2026-11-01", from: "Bank", to: "Cash", amountPoisha: -100, feePoisha: 0, kind: "transfer" },
      { id: "e", date: "2026-11-01", from: "Bank", to: "Cash", amountPoisha: 100, feePoisha: 0, kind: "gift" },
    ],
    rateOverrides: { bkash_ussd: 1.85, nagad_app: 99, "<script>": 1 },
  })!;
  assert.deepEqual(s.openings, { Cash: 5000 });
  assert.deepEqual(s.transfers.map((t) => t.id), ["a"]);
  assert.deepEqual(s.rateOverrides, { bkash_ussd: 1.85 });
});
