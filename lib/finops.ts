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

export const DEFAULT_FEES: FeeValues = {
  fiverrFee: 20,
  fiverrWithdraw: 3,
  upworkFee: 10,
  upworkWithdraw: 2,
  payoneerFx: 2,
  payoneerBkashFx: 3,
  payoneerBkashFlat: 1,
  wireFlat: 20,
  bankFx: 0.8,
  freelancerIncentive: 2.5,
};

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

export type PaymentRail = "swift" | "payoneer" | "wise" | "bkash_remit";

export interface InvoiceFinOpsResult {
  totalUsd: number;
  grossBdt: number;
  incentiveGainBdt: number;
  feeBdt: number;
  fxDrainBdt: number;
  netBdt: number;
  keptPct: number;
  formattedGross: string;
  formattedIncentive: string;
  formattedNet: string;
}

export function calculateInvoiceFinOps(
  milestones: Array<{ amountUsd: number }>,
  usdBdtRate: number,
  rail: PaymentRail = "swift",
  fees: FeeValues = DEFAULT_FEES
): InvoiceFinOpsResult {
  const totalUsd = milestones.reduce((sum, m) => sum + (Number(m.amountUsd) || 0), 0);
  if (totalUsd <= 0 || usdBdtRate <= 0) {
    return {
      totalUsd: Math.max(0, totalUsd),
      grossBdt: 0,
      incentiveGainBdt: 0,
      feeBdt: 0,
      fxDrainBdt: 0,
      netBdt: 0,
      keptPct: 100,
      formattedGross: fmtBdt(0),
      formattedIncentive: fmtBdt(0),
      formattedNet: fmtBdt(0),
    };
  }

  const grossBdt = Math.round(totalUsd * usdBdtRate);
  const incentiveRate = rail === "swift" || rail === "bkash_remit" ? fees.freelancerIncentive / 100 : 0;
  const incentiveGainBdt = Math.round(grossBdt * incentiveRate);

  let processingFeeUsd = 0;
  let fxSpreadPct = 0;

  switch (rail) {
    case "swift":
      processingFeeUsd = Math.min(totalUsd, fees.wireFlat);
      fxSpreadPct = fees.bankFx / 100;
      break;
    case "payoneer":
      processingFeeUsd = totalUsd * 0.01;
      fxSpreadPct = fees.payoneerFx / 100;
      break;
    case "wise":
      processingFeeUsd = totalUsd * 0.005;
      fxSpreadPct = 0.006;
      break;
    case "bkash_remit":
      processingFeeUsd = 0;
      fxSpreadPct = 0.015;
      break;
  }

  const feeBdt = Math.round(processingFeeUsd * usdBdtRate);
  const fxDrainBdt = Math.round(grossBdt * fxSpreadPct);
  const netBdt = grossBdt - feeBdt - fxDrainBdt + incentiveGainBdt;
  const keptPct = grossBdt > 0 ? Number(((netBdt / grossBdt) * 100).toFixed(1)) : 100;

  return {
    totalUsd,
    grossBdt,
    incentiveGainBdt,
    feeBdt,
    fxDrainBdt,
    netBdt,
    keptPct,
    formattedGross: fmtBdt(grossBdt),
    formattedIncentive: fmtBdt(incentiveGainBdt),
    formattedNet: fmtBdt(netBdt),
  };
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

// Effective rate: taka that actually arrives per invoiced dollar, after every fee and FX margin.
// Compare it with the mid-market rate to see each channel's true cost in one number (Wise-style).
export function effectiveRate(channel: Channel, invoiceUsd: number): number | null {
  if (!(invoiceUsd > 0) || !Number.isFinite(channel.netBdt)) return null;
  return r2(channel.netBdt / invoiceUsd);
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

// ---------------------------------------------------------------- Freelancer AIT / TDS (উৎসে কর) Under Income Tax Act 2023
export type FreelanceContractType = "foreign_export" | "local_corporate_it" | "local_corporate_consulting" | "local_individual";

export interface AitCalculationInput {
  amountBdt: number;
  contractType: FreelanceContractType;
  hasPsr: boolean; // Proof of Submission of Return (রিটার্ন জমার প্রমাণক)
  hasTin: boolean; // 12-digit e-TIN
  /** The base TDS rate printed on the deductor's certificate or challan. The built-in defaults are common rates
   * reported by tax guides, not verified against an official NBR schedule, so the user should enter their own. */
  ratePct?: number;
}

/** Sources behind the AIT statements (checked 2026-11-19). No NBR document could be read to confirm them
 * (NBR PDFs use legacy Bangla fonts and refused automated download), so every item below is "secondary":
 * official-body statements reported by the press or a Big-Four firm. The local service rates have no source: unverified. */
export const AIT_SOURCES = [
  { label: "Bangladesh Bank: no source tax may be deducted from IT freelancing remittances (TBS report)", url: "https://www.tbsnews.net/economy/banking/no-source-tax-can-be-deducted-it-freelancing-sector-cenbank-710314", checked: "2026-11-19", confidence: "secondary" },
  { label: "Income Tax Act 2023, Sixth Schedule (Part 1): IT-enabled services/freelancing income exemption (Daily Star explainer)", url: "https://online-d11.thedailystar.net/business/news/foreign-remittance-income-freelancing-or-remote-work-tax-free-or-taxable-4084906", checked: "2026-11-19", confidence: "secondary" },
  { label: "Income Tax Act 2023 full text (NBR; legacy-font PDF, not machine-readable, so not checked line by line)", url: "https://nbr.gov.bd/uploads/acts/Income_tax_act_2023.pdf", checked: "2026-11-19", confidence: "official-unread" },
  { label: "KPMG: tax deducted at a 50% higher rate when the payee has no Proof of Submission of Return", url: "https://assets.kpmg.com/content/dam/kpmg/bd/pdf/TaxUpdate/Salient_features_of_Finance_Ordinance_June_2025.pdf", checked: "2026-11-19", confidence: "secondary" },
] as const;
/** Common base rates reported by tax guides; NOT verified against the official schedule (user should override). */
export const AIT_DEFAULT_RATES_UNVERIFIED = { local_corporate_it: 5, local_corporate_consulting: 10 } as const;

export interface AitCalculationResult {
  grossBdt: number;
  contractType: FreelanceContractType;
  baseRatePct: number;
  effectiveRatePct: number;
  psrPenaltyApplied: boolean;
  aitAmountBdt: number;
  netReceivableBdt: number;
  isTaxExempt: boolean;
  incentiveEligible: boolean;
  incentiveAmountBdt: number;
  lawReference: string;
  adviceBn: string;
  /** false when the base rate is the unverified default rather than the user's own certificate rate. */
  rateFromUser: boolean;
}

/**
 * Calculates withholding tax (AIT / TDS) for Bangladeshi freelancers & contractors
 * under the Bangladesh Income Tax Act 2023 (আয়কর আইন ২০২৩) and Bangladesh Bank Cash Incentive circulars.
 */
export function calculateFreelancerAIT(input: AitCalculationInput): AitCalculationResult {
  const grossBdt = Math.max(0, Math.round(input.amountBdt));
  if (grossBdt === 0) {
    return {
      grossBdt: 0,
      contractType: input.contractType,
      baseRatePct: 0,
      effectiveRatePct: 0,
      psrPenaltyApplied: false,
      aitAmountBdt: 0,
      netReceivableBdt: 0,
      isTaxExempt: input.contractType === "foreign_export",
      incentiveEligible: input.contractType === "foreign_export",
      incentiveAmountBdt: 0,
      lawReference: "আয়কর আইন ২০২৩",
      adviceBn: "ইনভয়েসের টাকার পরিমাণ দিন।",
      rateFromUser: false,
    };
  }

  if (input.contractType === "foreign_export") {
    const incentiveAmountBdt = Math.round(grossBdt * 0.025);
    return {
      grossBdt,
      contractType: "foreign_export",
      baseRatePct: 0,
      effectiveRatePct: 0,
      psrPenaltyApplied: false,
      aitAmountBdt: 0,
      netReceivableBdt: grossBdt + incentiveAmountBdt,
      isTaxExempt: true,
      incentiveEligible: true,
      incentiveAmountBdt,
      lawReference: "আয়কর আইন ২০২৩, ষষ্ঠ তফসিল (অংশ ১): আইটি ফ্রিল্যান্সিং আয় করমুক্ত; বাংলাদেশ ব্যাংক: এই রেমিট্যান্স থেকে উৎসে কর কাটা যাবে না। মেয়াদ ও শর্ত প্রতি বাজেটে বদলাতে পারে — এনবিআর বা কর আইনজীবীর কাছে যাচাই করুন।",
      adviceBn: "বৈধ ব্যাংকিং চ্যানেলে রেমিট্যান্স আনলে এবং পিআরসি (PRC) সংগ্রহ করলে কোনো উৎসে কর নেই এবং ২.৫% সরকারি নগদ প্রণোদনা পাবেন।",
      rateFromUser: false,
    };
  }

  if (input.contractType === "local_individual") {
    return {
      grossBdt,
      contractType: "local_individual",
      baseRatePct: 0,
      effectiveRatePct: 0,
      psrPenaltyApplied: false,
      aitAmountBdt: 0,
      netReceivableBdt: grossBdt,
      isTaxExempt: false,
      incentiveEligible: false,
      incentiveAmountBdt: 0,
      lawReference: "আয়কর আইন ২০২৩ — ব্যক্তি পর্যায়ের প্রত্যক্ষ কর",
      adviceBn: "ব্যক্তিগত ক্লায়েন্ট সাধারণত উৎসে কর কাটে না। বার্ষিক মোট আয় করমুক্ত সীমা ছাড়ালে বার্ষিক রিটার্নে নিজে কর দিতে হবে — চলতি বছরের সীমা এনবিআর-এর সাইটে দেখে নিন।",
      rateFromUser: false,
    };
  }

  const isConsulting = input.contractType === "local_corporate_consulting";
  const userRate = typeof input.ratePct === "number" && Number.isFinite(input.ratePct) && input.ratePct >= 0 && input.ratePct <= 30 ? input.ratePct : null;
  const baseRatePct = userRate ?? AIT_DEFAULT_RATES_UNVERIFIED[isConsulting ? "local_corporate_consulting" : "local_corporate_it"];
  const psrPenaltyApplied = !input.hasPsr;
  const effectiveRatePct = psrPenaltyApplied ? baseRatePct * 1.5 : baseRatePct;

  const aitAmountBdt = Math.round((grossBdt * effectiveRatePct) / 100);
  const netReceivableBdt = grossBdt - aitAmountBdt;

  const lawReference = psrPenaltyApplied
    ? "আয়কর আইন ২০২৩: রিটার্ন জমার প্রমাণক (PSR) না থাকলে উৎসে কর ৫০% বেশি হারে কাটা হয়"
    : "আয়কর আইন ২০২৩: সেবার বিপরীতে উৎসে কর (হার উৎসে কর বিধিমালা অনুযায়ী)";

  const adviceBn = psrPenaltyApplied
    ? `ট্যাক্স রিটার্ন জমার প্রমাণক (PSR) জমা না দেওয়ায় ৫০% অতিরিক্ত উৎসে কর (${effectiveRatePct}%) কর্তন হবে। পিএসআর জমা দিলে কর কমবে ${baseRatePct}%-এ।`
    : `পিএসআর জমা থাকায় ${baseRatePct}% উৎসে কর কর্তন ধরা হয়েছে। কর্তনকারী প্রতিষ্ঠান থেকে উৎসে কর কর্তনের প্রত্যয়নপত্র বা চালান সংগ্রহ করুন।`;
  const rateNote = userRate === null
    ? ` (${baseRatePct}% একটি সাধারণ হার, সরকারি তফসিলে যাচাই করা নয় — আপনার প্রত্যয়নপত্রের হার বসান।)`
    : "";

  return {
    grossBdt,
    contractType: input.contractType,
    baseRatePct,
    effectiveRatePct,
    psrPenaltyApplied,
    aitAmountBdt,
    netReceivableBdt,
    isTaxExempt: false,
    incentiveEligible: false,
    incentiveAmountBdt: 0,
    lawReference,
    adviceBn: adviceBn + rateNote,
    rateFromUser: userRate !== null,
  };
}
