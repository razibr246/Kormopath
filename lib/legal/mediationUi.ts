/* Ported for KormoPath from the Digital Legal Aid System (razibr246 and AdribMahmud101): the person's own mediation
 * prep and settlement DRAFT, built on ./settlement.ts (clause-by-clause draft with provenance) and ./mediation.ts
 * (Bangladesh working-day calendar). Pure: only relative imports between lib/legal files (node --test loads it).
 *
 * KormoPath rules: money is integer poisha; the draft is for discussion, never a court document and never binding;
 * a term the person did not write stays OPEN (the core's load-bearing rule); holidays are marked by the person
 * because no verified public-holiday list is shipped.
 */
import { draftSettlement, type SettlementClause } from "./settlement.ts";
import { addDays, fromDateKey, isDateKey, isWorkday, toDateKey, formatBn } from "./mediation.ts";
import { LAWS, type Law } from "./data.ts";

const BN = "০১২৩৪৫৬৭৮৯";
export const bnNum = (v: number | string): string => String(v).replace(/[0-9]/g, (d) => BN[Number(d)]);

/** ৳ with South Asian grouping (1,23,456.50), Bengali digits by default. */
export function takaText(poisha: number, bn = true): string {
  const neg = poisha < 0;
  const abs = Math.abs(Math.round(poisha));
  const taka = Math.floor(abs / 100);
  const ps = abs % 100;
  const s = String(taka);
  const last3 = s.slice(-3);
  const rest = s.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ",");
  const grouped = rest ? `${rest},${last3}` : last3;
  const out = `${neg ? "-" : ""}৳${grouped}${ps ? `.${String(ps).padStart(2, "0")}` : ""}`;
  return bn ? bnNum(out) : out;
}

/** "1,500", "১৫০০.৫০" -> poisha; null if not a positive amount. */
export function parseTakaToPoisha(raw: string): number | null {
  const ascii = String(raw ?? "").replace(/[০-৯]/g, (d) => String(BN.indexOf(d))).replace(/[,\s৳]/g, "");
  if (!/^\d{1,9}(\.\d{1,2})?$/.test(ascii)) return null;
  const [t, p = ""] = ascii.split(".");
  const v = Number(t) * 100 + Number(p.padEnd(2, "0"));
  return v > 0 ? v : null;
}

// ---------------------------------------------------------------------------------------------
// Prep checklist and safety screen
// ---------------------------------------------------------------------------------------------

export const PREP_ITEMS: ReadonlyArray<{ id: string; bn: string; en: string }> = [
  { id: "nid", bn: "জাতীয় পরিচয়পত্র বা জন্মনিবন্ধনের কপি", en: "Copy of your NID or birth registration" },
  { id: "papers", bn: "বিরোধের কাগজ: দলিল, রসিদ, কাবিননামা, চুক্তি, ছবি বা বার্তা", en: "Papers about the dispute: deeds, receipts, nikahnama, agreements, photos or messages" },
  { id: "timeline", bn: "কী, কবে ঘটেছে — তারিখসহ ছোট একটি তালিকা", en: "A short list of what happened and when, with dates" },
  { id: "witness", bn: "সাক্ষী থাকলে তাদের নাম ও ফোন নম্বর", en: "Names and phone numbers of any witnesses" },
  { id: "want", bn: "আপনি কী চান, তা লিখে রাখা", en: "What you want, written down" },
  { id: "limit", bn: "কোন শর্তে রাজি হবেন না, তা আগে ঠিক করা", en: "What you will not agree to, decided in advance" },
  { id: "support", bn: "চাইলে একজন বিশ্বস্ত মানুষ সঙ্গে নেওয়া", en: "Someone you trust to come with you, if you want" },
];

/** Signs that mediation is not the right path (the person's own answers; nothing is inferred). */
export const SAFETY_QUESTIONS: ReadonlyArray<{ id: string; bn: string; en: string }> = [
  { id: "violence", bn: "অপর পক্ষ কি আপনাকে মারধর বা শারীরিক আঘাত করেছে?", en: "Has the other side hit or physically hurt you?" },
  { id: "threat", bn: "আপনি কি হুমকি পাচ্ছেন বা ভয়ে আছেন?", en: "Are you being threatened, or are you afraid?" },
  { id: "pressure", bn: "কেউ কি আপনাকে মীমাংসায় রাজি হতে চাপ দিচ্ছে?", en: "Is someone pressuring you to agree to mediation?" },
  { id: "child", bn: "বিষয়টি কি শিশুর ওপর নির্যাতন বা বাল্যবিবাহ নিয়ে?", en: "Is it about abuse of a child or a child marriage?" },
];

export type SafetyAnswers = Record<string, boolean>;
export const safetyFlagged = (a: SafetyAnswers): boolean => SAFETY_QUESTIONS.some((q) => a[q.id] === true);

// ---------------------------------------------------------------------------------------------
// Session date: Bangladesh working days (Sun–Thu) minus days the person marks as holidays
// ---------------------------------------------------------------------------------------------

export function upcomingSessionDays(today: Date, holidays: readonly string[], count = 15): string[] {
  const off = new Set(holidays);
  const out: string[] = [];
  let d = addDays(today, 1);
  for (let i = 0; i < 90 && out.length < count; i++, d = addDays(d, 1)) {
    const key = toDateKey(d);
    if (isWorkday(d) && !off.has(key)) out.push(key);
  }
  return out;
}

export const dateKeyBn = (key: string): string => (isDateKey(key) ? formatBn(fromDateKey(key)) : "");

// ---------------------------------------------------------------------------------------------
// Settlement terms written by the person
// ---------------------------------------------------------------------------------------------

export type Party = "applicant" | "opposite";

export interface Installment { date: string; amountPoisha: number }

export interface MoneyTerm {
  id: string;
  kind: "money";
  payer: Party;
  purposeBn: string;
  totalPoisha: number;
  installments: Installment[];
}

export interface DeedTerm {
  id: string;
  kind: "deed";
  by: Party;
  whatBn: string;
  dueDate: string;
}

export type Term = MoneyTerm | DeedTerm;

export interface DraftInputs {
  applicant: string;
  opposite: string;
  district: string;
  problem: string;
  venue: string;
  mediator: string;
  sessionDate: string;
  terms: Term[];
  conditions: string[];
}

/** Split a total into n integer installments; the remainder goes one poisha each to the first ones. */
export function splitEvenly(totalPoisha: number, n: number): number[] {
  const k = Math.max(1, Math.min(60, Math.floor(n)));
  const base = Math.floor(totalPoisha / k);
  const rem = totalPoisha - base * k;
  return Array.from({ length: k }, (_, i) => base + (i < rem ? 1 : 0));
}

/** Monthly due dates from a first date (day clamped to the month's last day), as YYYY-MM-DD. */
export function monthlyDates(first: string, n: number): string[] {
  if (!isDateKey(first)) return [];
  const [y, m, d] = first.split("-").map(Number);
  return Array.from({ length: Math.max(1, Math.min(60, n)) }, (_, i) => {
    const mm = m - 1 + i;
    const yy = y + Math.floor(mm / 12);
    const mo = ((mm % 12) + 12) % 12;
    const last = new Date(Date.UTC(yy, mo + 1, 0)).getUTCDate();
    return `${yy}-${String(mo + 1).padStart(2, "0")}-${String(Math.min(d, last)).padStart(2, "0")}`;
  });
}

export function installmentPlan(totalPoisha: number, n: number, first: string): Installment[] {
  const dates = monthlyDates(first, n);
  return splitEvenly(totalPoisha, dates.length).map((amountPoisha, i) => ({ date: dates[i], amountPoisha }));
}

/** Problems that must be fixed before the draft can be reviewed. Empty = consistent. */
export function termProblems(t: Term): string[] {
  const out: string[] = [];
  if (t.kind === "money") {
    if (!(t.totalPoisha > 0)) out.push("মোট টাকার পরিমাণ দিন।");
    if (!t.installments.length) out.push("কিস্তি বা পরিশোধের তারিখ দিন।");
    const sum = t.installments.reduce((s, x) => s + x.amountPoisha, 0);
    if (t.installments.length && sum !== t.totalPoisha) out.push(`কিস্তির যোগফল (${takaText(sum)}) মোটের (${takaText(t.totalPoisha)}) সমান নয়।`);
    if (t.installments.some((x) => !isDateKey(x.date))) out.push("প্রতিটি কিস্তির সঠিক তারিখ দিন।");
    if (t.installments.some((x, i) => i > 0 && x.date < t.installments[i - 1].date)) out.push("কিস্তির তারিখ আগে থেকে পরে সাজান।");
    if (t.installments.some((x) => !(x.amountPoisha > 0))) out.push("কোনো কিস্তি শূন্য হতে পারে না।");
  } else {
    if (!t.whatBn.trim()) out.push("কী করতে হবে তা লিখুন।");
    if (!isDateKey(t.dueDate)) out.push("শেষ তারিখ দিন।");
  }
  return out;
}

// ---------------------------------------------------------------------------------------------
// The draft: the core's clauses, with the person's own terms filling only what they wrote
// ---------------------------------------------------------------------------------------------

export type UiSource = "core" | "yours" | "open";

export interface UiClause {
  id: string;
  headingBn: string;
  bodyBn: string | null;
  /** Where this clause's words came from, in plain Bangla. */
  provenanceBn: string;
  source: UiSource;
  needsBn?: string;
  law?: Law;
}

export interface UiDraft {
  titleBn: string;
  clauses: UiClause[];
  openIds: string[];
  /** Never "binding": only that nothing is left blank. */
  completeBn: string;
  totalPoisha: number;
}

const partyName = (p: Party, d: DraftInputs) => (p === "applicant" ? d.applicant.trim() || "আবেদনকারী" : d.opposite.trim() || "বিপরীত পক্ষ");

const lawFor = (label: string | undefined): Law | undefined => (label ? Object.values(LAWS).find((l) => l.bn === label) : undefined);

const CORE_PROVENANCE: Record<string, string> = {
  "party.applicant": "আপনার দেওয়া নাম",
  "case.problem": "আপনার লেখা বিবরণ",
  "case.district": "আপনার দেওয়া জেলা",
  "mediation.settled_at": "আপনার বাছাই করা তারিখ ও স্থান",
  "mediation.notes": "আপনার লেখা",
  law: "আইনের নাম (bdlaws, যাচাই করা)",
  open: "এখনো ঠিক হয়নি",
};

export function buildDraft(d: DraftInputs): UiDraft {
  const core = draftSettlement({
    docketId: "খসড়া",
    problem: d.problem.trim(),
    district: d.district.trim() || null,
    applicantName: d.applicant.trim() || null,
    mediatorName: d.mediator.trim() || null,
    venue: d.venue.trim() || null,
    notes: null,
    settledAt: isDateKey(d.sessionDate) ? fromDateKey(d.sessionDate).toISOString() : null,
    outcome: null,
  });
  const fromCore = (c: SettlementClause): UiClause => ({
    id: c.id, headingBn: c.headingBn, bodyBn: c.bodyBn, source: c.bodyBn === null ? "open" : "core",
    provenanceBn: CORE_PROVENANCE[c.bodyBn === null ? "open" : c.source] ?? "নথি",
    needsBn: c.bodyBn === null ? c.needsBn : undefined, law: lawFor(c.legalBasisBn),
  });

  const clauses: UiClause[] = [];
  let total = 0;
  for (const c of core.clauses) {
    if (c.id === "opposite_party" && d.opposite.trim()) {
      clauses.push({ ...fromCore(c), bodyBn: `বিপরীত পক্ষ: ${d.opposite.trim()}।`, source: "yours", provenanceBn: "আপনার দেওয়া নাম", needsBn: undefined });
      continue;
    }
    if (c.id === "terms") {
      if (!d.terms.length) { clauses.push(fromCore(c)); continue; }
      d.terms.forEach((t, i) => {
        if (t.kind === "money") {
          total += t.totalPoisha;
          const plan = t.installments.map((x, j) => `${bnNum(j + 1)}) ${dateKeyBn(x.date)} — ${takaText(x.amountPoisha)}`).join("; ");
          clauses.push({
            id: `term_${t.id}`, headingBn: `শর্ত ${bnNum(i + 1)}: টাকা পরিশোধ`, source: "yours", provenanceBn: "আপনার লেখা শর্ত",
            bodyBn: `${partyName(t.payer, d)} ${t.purposeBn.trim() ? `${t.purposeBn.trim()} বাবদ ` : ""}মোট ${takaText(t.totalPoisha)} পরিশোধ করবেন, ${bnNum(t.installments.length)}টি কিস্তিতে: ${plan}।`,
            law: LAWS.arbitration_2001,
          });
        } else {
          clauses.push({
            id: `term_${t.id}`, headingBn: `শর্ত ${bnNum(i + 1)}: কাজ`, source: "yours", provenanceBn: "আপনার লেখা শর্ত",
            bodyBn: `${partyName(t.by, d)} ${dateKeyBn(t.dueDate)}-এর মধ্যে: ${t.whatBn.trim()}।`, law: LAWS.arbitration_2001,
          });
        }
      });
      continue;
    }
    if (c.id === "deadline" && d.terms.length) {
      const last = d.terms.flatMap((t) => (t.kind === "money" ? t.installments.map((x) => x.date) : [t.dueDate])).filter(isDateKey).sort().pop();
      clauses.push(last
        ? { ...fromCore(c), bodyBn: `সব শর্ত ${dateKeyBn(last)}-এর মধ্যে পূরণ করতে হবে।`, source: "yours", provenanceBn: "আপনার শর্তের শেষ তারিখ", needsBn: undefined }
        : fromCore(c));
      continue;
    }
    if (c.id === "enforcement" && d.conditions.some((x) => x.trim())) {
      clauses.push({ ...fromCore(c), bodyBn: d.conditions.filter((x) => x.trim()).map((x, j) => `${bnNum(j + 1)}) ${x.trim()}`).join(" "), source: "yours", provenanceBn: "আপনার লেখা শর্ত", needsBn: undefined });
      continue;
    }
    clauses.push(fromCore(c));
  }
  const openIds = clauses.filter((c) => c.bodyBn === null).map((c) => c.id);
  return {
    titleBn: "মীমাংসার খসড়া",
    clauses,
    openIds,
    totalPoisha: total,
    completeBn: openIds.length
      ? `${bnNum(openIds.length)}টি অংশ এখনো খালি। খালি অংশ থাকা অবস্থায় কেউ স্বাক্ষর করবেন না।`
      : "সব অংশ লেখা হয়েছে। এটি তবু একটি খসড়া: স্বাক্ষরের আগে লিগ্যাল এইড অফিস বা আইনজীবীকে দেখিয়ে নিন।",
  };
}

export function draftText(draft: UiDraft): string {
  const lines = [`${draft.titleBn} — খসড়া · আদালতের দলিল নয়`, ""];
  for (const c of draft.clauses) lines.push(c.bodyBn ? `${c.headingBn}: ${c.bodyBn}` : `[${c.headingBn} — খালি: ${c.needsBn ?? ""}]`);
  lines.push("", draft.completeBn, "এটি আইনি তথ্য ও আলোচনার খসড়া, আইনি পরামর্শ বা বাধ্যতামূলক চুক্তি নয়।");
  return lines.join("\n");
}

// ---------------------------------------------------------------------------------------------
// Device storage (kormopath:legal:mediation)
// ---------------------------------------------------------------------------------------------

export interface SavedMediation {
  prep: string[];
  wants: string;
  canAccept: string;
  mustNot: string;
  safety: SafetyAnswers;
  holidays: string[];
  draft: DraftInputs;
  savedAt: string;
}

export const EMPTY_DRAFT: DraftInputs = { applicant: "", opposite: "", district: "", problem: "", venue: "", mediator: "", sessionDate: "", terms: [], conditions: [] };

const str = (v: unknown, max: number): string => (typeof v === "string" ? v.normalize("NFC").slice(0, max) : "");
const keyOrEmpty = (v: unknown): string => (typeof v === "string" && isDateKey(v) ? v : "");
const posInt = (v: unknown): number => (typeof v === "number" && Number.isInteger(v) && v > 0 && v < 1e12 ? v : 0);

function sanitizeTerm(raw: unknown, i: number): Term | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const id = str(o.id, 40) || `t${i}`;
  if (o.kind === "money") {
    const installments = (Array.isArray(o.installments) ? o.installments : []).slice(0, 60).map((x) => {
      const r = (x ?? {}) as Record<string, unknown>;
      return { date: keyOrEmpty(r.date), amountPoisha: posInt(r.amountPoisha) };
    });
    return { id, kind: "money", payer: o.payer === "applicant" ? "applicant" : "opposite", purposeBn: str(o.purposeBn, 120), totalPoisha: posInt(o.totalPoisha), installments };
  }
  if (o.kind === "deed") return { id, kind: "deed", by: o.by === "applicant" ? "applicant" : "opposite", whatBn: str(o.whatBn, 300), dueDate: keyOrEmpty(o.dueDate) };
  return null;
}

export function sanitizeMediation(raw: unknown): SavedMediation | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const d = (o.draft ?? {}) as Record<string, unknown>;
  const safety: SafetyAnswers = {};
  const s = (o.safety ?? {}) as Record<string, unknown>;
  for (const q of SAFETY_QUESTIONS) if (typeof s[q.id] === "boolean") safety[q.id] = s[q.id] as boolean;
  const ids = new Set(PREP_ITEMS.map((p) => p.id));
  return {
    prep: (Array.isArray(o.prep) ? o.prep : []).filter((x): x is string => typeof x === "string" && ids.has(x)),
    wants: str(o.wants, 600), canAccept: str(o.canAccept, 600), mustNot: str(o.mustNot, 600),
    safety,
    holidays: (Array.isArray(o.holidays) ? o.holidays : []).map(keyOrEmpty).filter(Boolean).slice(0, 60),
    draft: {
      applicant: str(d.applicant, 80), opposite: str(d.opposite, 80), district: str(d.district, 60), problem: str(d.problem, 800),
      venue: str(d.venue, 120), mediator: str(d.mediator, 80), sessionDate: keyOrEmpty(d.sessionDate),
      terms: (Array.isArray(d.terms) ? d.terms : []).slice(0, 12).map(sanitizeTerm).filter((t): t is Term => t !== null),
      conditions: (Array.isArray(d.conditions) ? d.conditions : []).slice(0, 8).map((x) => str(x, 300)),
    },
    savedAt: str(o.savedAt, 40),
  };
}

export const MEDIATION_STORAGE_KEY = "kormopath:legal:mediation";
