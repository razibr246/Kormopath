// Deterministic money engine. Pure functions, no imports, no language model.
// Unit-tested in tests/finops.test.ts.

export interface FeeValues {
  fiverrFee: number; // %
  fiverrWithdraw: number; // USD per withdrawal
  upworkFee: number; // %
  upworkWithdraw: number; // USD per withdrawal
  payoneerFx: number; // %
  payoneerBkashFx: number; // %
  payoneerBkashFlat: number; // USD per withdrawal
  wireFlat: number; // USD per wire
  bankFx: number; // %
  freelancerIncentive: number; // %
}

export interface FinInput {
  invoiceUsd: number; // per month
  withdrawals: number; // withdrawals or wires per month
  fx: number; // mid-market BDT per USD
  fees: FeeValues;
  claimIncentive: boolean;
}

export interface Step {
  label: string;
  bdt: number; // signed: negative = money lost, positive = money gained
}

export interface Channel {
  id: "fiverr" | "upwork" | "payoneer_bkash" | "bank_wire";
  name: string;
  route: string;
  marketplace: boolean;
  steps: Step[];
  grossBdt: number;
  netBdt: number;
  keptPct: number;
}

const r2 = (n: number) => Math.round(n * 100) / 100;

function build(
  id: Channel["id"], name: string, route: string, marketplace: boolean,
  inp: FinInput, platformPct: number, flatUsd: number, fxPct: number, incentivePct: number,
): Channel {
  const gross = inp.invoiceUsd;
  const grossBdt = gross * inp.fx;
  const steps: Step[] = [];
  let usd = gross;
  if (platformPct > 0) {
    const cut = usd * (platformPct / 100);
    usd -= cut;
    steps.push({ label: `Platform fee ${platformPct}%`, bdt: -cut * inp.fx });
  }
  if (flatUsd > 0 && inp.withdrawals > 0) {
    const cut = Math.min(usd, flatUsd * inp.withdrawals);
    usd -= cut;
    steps.push({ label: `Withdrawal fees $${flatUsd} × ${inp.withdrawals}`, bdt: -cut * inp.fx });
  }
  if (fxPct > 0) {
    const cut = usd * (fxPct / 100);
    usd -= cut;
    steps.push({ label: `Currency conversion ${fxPct}%`, bdt: -cut * inp.fx });
  }
  let netBdt = usd * inp.fx;
  if (incentivePct > 0) {
    const plus = netBdt * (incentivePct / 100);
    netBdt += plus;
    steps.push({ label: `Bangladesh Bank freelancer incentive ${incentivePct}%`, bdt: plus });
  }
  return {
    id, name, route, marketplace, steps,
    grossBdt: r2(grossBdt),
    netBdt: r2(netBdt),
    keptPct: grossBdt > 0 ? r2((netBdt / grossBdt) * 100) : 0,
  };
}

export function compareChannels(inp: FinInput): Channel[] {
  const f = inp.fees;
  return [
    build("fiverr", "Fiverr", "Fiverr → Payoneer → bank", true, inp, f.fiverrFee, f.fiverrWithdraw, f.payoneerFx, 0),
    build("upwork", "Upwork", "Upwork → Payoneer → bank", true, inp, f.upworkFee, f.upworkWithdraw, f.payoneerFx, 0),
    build("payoneer_bkash", "Direct client via Payoneer", "Client → Payoneer → bKash", false, inp, 0, f.payoneerBkashFlat, f.payoneerBkashFx, 0),
    build("bank_wire", "Direct client via bank wire", "Client → SWIFT → your BD bank", false, inp, 0, f.wireFlat, f.bankFx, inp.claimIncentive ? f.freelancerIncentive : 0),
  ];
}

// Invariant: gross + every step must equal net. Catches any arithmetic slip.
export function checkInvariants(channels: Channel[]): { ok: boolean; maxErrorBdt: number } {
  let maxErr = 0;
  for (const c of channels) {
    const sum = c.grossBdt + c.steps.reduce((a, s) => a + s.bdt, 0);
    maxErr = Math.max(maxErr, Math.abs(sum - c.netBdt));
    if (c.netBdt < 0) return { ok: false, maxErrorBdt: Infinity };
  }
  return { ok: maxErr < 0.05, maxErrorBdt: r2(maxErr) };
}

export function best(channels: Channel[]): Channel {
  return channels.reduce((a, b) => (b.netBdt > a.netBdt ? b : a));
}

// How much fixed per-withdrawal fees cost when you cash out weekly vs once a month.
export function batchingSaving(inp: FinInput, channel: Channel["id"]): { weekly: number; monthly: number; savedBdt: number } {
  const at = (w: number) => compareChannels({ ...inp, withdrawals: w }).find((c) => c.id === channel)!.netBdt;
  const weekly = at(4);
  const monthly = at(1);
  return { weekly, monthly, savedBdt: r2(monthly - weekly) };
}

export function fmtBdt(n: number): string {
  // South Asian digit grouping: 12,34,567
  const neg = n < 0;
  const s = Math.round(Math.abs(n)).toString();
  const last3 = s.slice(-3);
  const rest = s.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ",");
  return (neg ? "−" : "") + "৳" + (rest ? rest + "," + last3 : last3);
}

// What a freelancer actually lost, from what they really received. Lets users check our
// estimates against their own bank statement.
export function effectiveCost(grossUsd: number, midFx: number, receivedBdt: number): { lostBdt: number; lostPct: number } | null {
  if (!(grossUsd > 0) || !(midFx > 0) || !(receivedBdt >= 0)) return null;
  const expected = grossUsd * midFx;
  const lost = expected - receivedBdt;
  return { lostBdt: r2(lost), lostPct: r2((lost / expected) * 100) };
}

// Difference between two channels for the same invoice. Positive = `better` keeps more.
export function savingBetween(channels: Channel[], better: Channel["id"], worse: Channel["id"]): number {
  const b = channels.find((c) => c.id === better);
  const w = channels.find((c) => c.id === worse);
  return b && w ? r2(b.netBdt - w.netBdt) : 0;
}

// CSV built from the engine's own steps, so the export always matches what is on screen.
export function channelsToCsv(channels: Channel[], invoiceUsd: number, fx: number): string {
  const rows = [["channel", "route", "invoice_usd", "fx_bdt_per_usd", "gross_bdt", "step", "step_bdt", "net_bdt", "kept_pct"]];
  for (const c of channels) {
    if (!c.steps.length) rows.push([c.name, c.route, String(invoiceUsd), String(fx), c.grossBdt.toFixed(2), "", "", c.netBdt.toFixed(2), String(c.keptPct)]);
    for (const s of c.steps) rows.push([c.name, c.route, String(invoiceUsd), String(fx), c.grossBdt.toFixed(2), s.label, r2(s.bdt).toFixed(2), c.netBdt.toFixed(2), String(c.keptPct)]);
  }
  return rows.map((r) => r.map((v) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v)).join(",")).join("\n");
}

/** Split a user-priced package into positive milestone amounts, preserving every cent. */
export function splitMilestoneUsd(totalUsd: number, count: number): number[] {
  if (!Number.isFinite(totalUsd) || totalUsd <= 0 || totalUsd >= 1_000_000 || !Number.isInteger(count) || count < 1 || count > 20) throw new Error("Enter a valid package amount and 1–20 deliverables.");
  const cents = Math.round((totalUsd + Number.EPSILON) * 100);
  if (Math.abs(totalUsd - cents / 100) > 1e-8) throw new Error("Use at most two decimal places for USD.");
  if (cents < count) throw new Error("Each deliverable needs at least $0.01. Increase the total or use fewer deliverables.");
  const base = Math.floor(cents / count);
  const remainder = cents % count;
  return Array.from({ length: count }, (_, index) => (base + (index < remainder ? 1 : 0)) / 100);
}
