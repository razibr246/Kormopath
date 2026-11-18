/* Ported for KormoPath from the Digital Legal Aid System (razibr246 and AdribMahmud101): lib/demo/personas.ts,
 * lib/demo/simulations.ts and the DLAO, lawyer and chief desks. Everything here is a LABELLED DEMO: the people are
 * fictional, no real office uses these screens, and the time limits are the source app's design rules, not law.
 * Pure: only relative imports of other lib/legal files (node --test loads it directly). */
import { classifySeverity, type SeverityLevel } from "./severity.ts";
import { assessSla, daysInStageTone, CITIZEN_STATUS_LABELS, CASE_STATUSES, type CaseStatus, type SlaLevel } from "./caseDomain.ts";
import { actionsForTrack, deadlineFrom, gradeAction, summariseTracker, type LawyerTrack, type TrackedAction, type TrackerSummary } from "./lawyerTracker.ts";
import { createAuditEntry, type AuditEntry, type AuditKind } from "./audit.ts";

export const DEMO_LABEL_BN = "নমুনা · ডেমো — আসল লিগ্যাল এইড অফিস এই পাতা ব্যবহার করে না";
export const DEMO_LABEL_EN = "Demo — real legal aid offices do not use this screen";
export const DEMO_RULES_NOTE_BN = "সময়সীমাগুলো মূল অ্যাপের নকশার নিয়ম, আইন নয়। নাম ও ঘটনা কাল্পনিক।";
export const DEMO_RULES_NOTE_EN = "Time limits are the source app's design rules, not law. Names and events are fictional.";

const DAY = 86_400_000;

export type DeskRole = "citizen" | "dlao" | "lawyer" | "chief" | "mediator";
export const DESK_ROLES: { id: DeskRole; bn: string; en: string; whatBn: string; whatEn: string }[] = [
  { id: "citizen", bn: "আবেদনকারী", en: "Applicant", whatBn: "নিজের আবেদনের অবস্থা আর আইনজীবীর অগ্রগতি", whatEn: "Own application status and lawyer progress" },
  { id: "dlao", bn: "লিগ্যাল এইড কর্মকর্তা", en: "Legal aid officer", whatBn: "আবেদনের সারি, জরুরি চিহ্ন, সময়সীমা", whatEn: "Application queue, urgency flags, time limits" },
  { id: "lawyer", bn: "প্যানেল আইনজীবী", en: "Panel lawyer", whatBn: "নিয়োগ পাওয়া কেস আর করণীয়ের সময়সীমা", whatEn: "Assigned cases and action deadlines" },
  { id: "chief", bn: "প্রধান তত্ত্বাবধায়ক", en: "Chief supervisor", whatBn: "সার্বিক সংখ্যা আর আইনজীবীদের সাড়া", whatEn: "Overall counts and lawyer response" },
  { id: "mediator", bn: "মধ্যস্থতাকারী", en: "Mediator", whatBn: "মধ্যস্থতার কেস আর একটি কেসের গল্প", whatEn: "Mediation cases and one case's story" },
];

export interface DemoLawyer { id: string; bn: string; en: string }
export const DEMO_LAWYERS: DemoLawyer[] = [
  { id: "law-ka", bn: "আইনজীবী ক (নমুনা)", en: "Lawyer A (demo)" },
  { id: "law-kha", bn: "আইনজীবী খ (নমুনা)", en: "Lawyer B (demo)" },
  { id: "law-ga", bn: "আইনজীবী গ (নমুনা)", en: "Lawyer C (demo)" },
];

export interface DemoCase {
  id: string;
  /** Fictional applicant; the "(কাল্পনিক)" marker is part of the name on purpose. */
  nameBn: string;
  nameEn: string;
  situationBn: string;
  situationEn: string;
  /** The applicant's own words (Bangla), which the severity classifier reads. */
  problem: string;
  categoryBn: string;
  district: string;
  stage: CaseStatus;
  /** Days since the case was filed. */
  ageDays: number;
  /** Days spent in the current stage. */
  daysInStage: number;
  lawyerId: string | null;
  /** Days since a lawyer was appointed (null = none). */
  lawyerAssignedDaysAgo: number | null;
  lawyerTrack: LawyerTrack;
  /** How many of the plan's actions the demo lawyer had already logged at seed time. */
  actionsDoneAtSeed: number;
}

export const DEMO_CASES: DemoCase[] = [
  {
    id: "DEMO-01", nameBn: "মৌ (কাল্পনিক)", nameEn: "Mou (fictional)",
    situationBn: "ভাই তার হয়ে ফোন করছে; স্বামীর ফোনে কোনো বার্তা পাঠানো যাবে না।", situationEn: "Her brother calls on her behalf; no message may reach the husband's phone.",
    problem: "আমার স্বামী আমাকে মারছে আর যৌতুকের জন্য চাপ দিচ্ছে, আমি নিরাপদ না",
    categoryBn: "পারিবারিক", district: "জয়পুরহাট", stage: "review", ageDays: 12, daysInStage: 12,
    lawyerId: null, lawyerAssignedDaysAgo: null, lawyerTrack: "mediation", actionsDoneAtSeed: 0,
  },
  {
    id: "DEMO-02", nameBn: "রবি (কাল্পনিক)", nameEn: "Robi (fictional)",
    situationBn: "দৃষ্টিহীন আবেদনকারী; সব ধাপ কথায় ও ফোনে হতে হবে।", situationEn: "Visually impaired applicant; every step must work by voice and phone.",
    problem: "আমার জমি দখল হয়ে গেছে, প্রতিবেশী সীমানা সরিয়েছে, কাগজ আমার কাছে আছে",
    categoryBn: "জমি", district: "জয়পুরহাট", stage: "submitted", ageDays: 4, daysInStage: 4,
    lawyerId: null, lawyerAssignedDaysAgo: null, lawyerTrack: "court", actionsDoneAtSeed: 0,
  },
  {
    id: "DEMO-03", nameBn: "নীলা (কাল্পনিক)", nameEn: "Nila (fictional)",
    situationBn: "ভুয়া ছবি ছড়ানোর হুমকি; দ্রুত ও গোপনে সাড়া দরকার।", situationEn: "Threatened with fake photos; needs a fast, private response.",
    problem: "আমার ভুয়া ছবি বানিয়ে ছড়িয়ে দেওয়ার হুমকি দিচ্ছে, টাকা চাইছে",
    categoryBn: "সাইবার", district: "ঝিনাইদহ", stage: "submitted", ageDays: 2, daysInStage: 2,
    lawyerId: null, lawyerAssignedDaysAgo: null, lawyerTrack: "court", actionsDoneAtSeed: 0,
  },
  {
    id: "DEMO-04", nameBn: "নুমা (কাল্পনিক)", nameEn: "Numa (fictional)",
    situationBn: "মারমা ভাষায় কথা বলেন, ইন্টারনেট দুর্বল; সহায়তাকারী অনুবাদ করেন।", situationEn: "Speaks Marma with weak internet; a helper interprets.",
    problem: "আমাদের পাহাড়ের জমির কাগজ নিয়ে সমস্যা হয়েছে, আমি মারমা ভাষায় কথা বলি",
    categoryBn: "জমি", district: "খাগড়াছড়ি", stage: "review", ageDays: 9, daysInStage: 9,
    lawyerId: null, lawyerAssignedDaysAgo: null, lawyerTrack: "court", actionsDoneAtSeed: 0,
  },
  {
    id: "DEMO-05", nameBn: "মালু মিয়া (কাল্পনিক)", nameEn: "Malu Mia (fictional)",
    situationBn: "সাত মাস ধরে কেস থেমে আছে, ফোন নম্বর বারবার বদলায়।", situationEn: "Case stalled for seven months; the phone number keeps changing.",
    problem: "আমার কারখানার মালিক ছয় মাসের বেতন দেয় না, আইনজীবী থেকে কোনো আপডেট পাইনি",
    categoryBn: "শ্রম", district: "বরগুনা", stage: "lawyer", ageDays: 213, daysInStage: 200,
    lawyerId: "law-ka", lawyerAssignedDaysAgo: 200, lawyerTrack: "court", actionsDoneAtSeed: 2,
  },
  {
    id: "DEMO-06", nameBn: "সাথী (কাল্পনিক)", nameEn: "Sathi (fictional)",
    situationBn: "সন্তানের খরচ নিয়ে বিরোধ; দুই পক্ষই মধ্যস্থতায় রাজি।", situationEn: "Dispute over a child's maintenance; both sides agreed to mediate.",
    problem: "আমার সন্তানের খরচ বাবা দিচ্ছে না, আমরা আলোচনা করে মিটাতে চাই",
    categoryBn: "পারিবারিক", district: "রংপুর", stage: "mediation", ageDays: 48, daysInStage: 40,
    lawyerId: "law-kha", lawyerAssignedDaysAgo: 30, lawyerTrack: "mediation", actionsDoneAtSeed: 3,
  },
  {
    id: "DEMO-07", nameBn: "জামাল (কাল্পনিক)", nameEn: "Jamal (fictional)",
    situationBn: "ভাড়া বাড়ি থেকে নোটিস ছাড়া উচ্ছেদের চেষ্টা।", situationEn: "Being evicted from a rented home without notice.",
    problem: "আমাকে বাড়িওয়ালা নোটিস ছাড়া বের করে দিতে চায়, জিনিস আটকে রেখেছে",
    categoryBn: "বাড়িভাড়া", district: "ঢাকা", stage: "lawyer", ageDays: 26, daysInStage: 20,
    lawyerId: "law-ga", lawyerAssignedDaysAgo: 20, lawyerTrack: "court", actionsDoneAtSeed: 3,
  },
];

export const caseById = (id: string): DemoCase | undefined => DEMO_CASES.find((c) => c.id === id);
export const lawyerById = (id: string | null): DemoLawyer | undefined => DEMO_LAWYERS.find((l) => l.id === id);

// ---------------------------------------------------------------------------
// Device-stored demo state (namespace "legal", key "demo"); every change is logged to the demo audit trail.

export interface DemoState {
  role: DeskRole;
  /** Stage overrides made in the demo desks. */
  stages: Record<string, CaseStatus>;
  /** Lawyer action codes marked done in the demo, per case. */
  done: Record<string, string[]>;
  audit: AuditEntry[];
  simStep: number;
}

export const MAX_DEMO_AUDIT = 200;
export const emptyDemoState = (): DemoState => ({ role: "dlao", stages: {}, done: {}, audit: [], simStep: 0 });

const ROLE_SET = new Set<string>(["citizen", "dlao", "lawyer", "chief", "mediator"]);
const STAGE_SET = new Set<string>(CASE_STATUSES);
const AUDIT_KINDS = new Set<string>([
  "sensitive_case_opened", "identity_verified", "assist_overridden", "assist_accepted", "application_accepted",
  "application_rejected", "payment_approved", "payment_rejected", "misconduct_actioned", "message_sent", "message_blocked",
  "message_delayed", "transfer_accepted", "transfer_returned", "settlement_certified", "lawyer_changed",
]);

export function sanitizeDemoState(raw: unknown): DemoState | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const out = emptyDemoState();
  if (typeof o.role === "string" && ROLE_SET.has(o.role)) out.role = o.role as DeskRole;
  if (o.stages && typeof o.stages === "object") {
    for (const [k, v] of Object.entries(o.stages as Record<string, unknown>)) {
      if (caseById(k) && typeof v === "string" && STAGE_SET.has(v)) out.stages[k] = v as CaseStatus;
    }
  }
  if (o.done && typeof o.done === "object") {
    for (const [k, v] of Object.entries(o.done as Record<string, unknown>)) {
      if (caseById(k) && Array.isArray(v)) out.done[k] = [...new Set(v.filter((x): x is string => typeof x === "string").slice(0, 20))];
    }
  }
  if (Array.isArray(o.audit)) {
    for (const a of o.audit.slice(-MAX_DEMO_AUDIT)) {
      if (!a || typeof a !== "object") continue;
      const e = a as Record<string, unknown>;
      if (typeof e.id === "string" && typeof e.kind === "string" && AUDIT_KINDS.has(e.kind) && typeof e.refId === "string"
        && typeof e.actorId === "string" && typeof e.actorRole === "string" && typeof e.at === "string") {
        out.audit.push({
          id: e.id.slice(0, 120), kind: e.kind as AuditKind, refId: e.refId.slice(0, 40), actorId: e.actorId.slice(0, 40),
          actorRole: e.actorRole.slice(0, 20), at: e.at.slice(0, 40),
          ...(typeof e.detail === "string" ? { detail: e.detail.slice(0, 200) } : {}),
          ...(typeof e.reason === "string" ? { reason: e.reason.slice(0, 200) } : {}),
        });
      }
    }
  }
  if (typeof o.simStep === "number" && Number.isInteger(o.simStep) && o.simStep >= 0 && o.simStep < SIMULATION.length) out.simStep = o.simStep;
  return out;
}

const log = (s: DemoState, kind: AuditKind, refId: string, actorRole: DeskRole, now: Date, extra: { detail?: string; reason?: string } = {}): DemoState => ({
  ...s,
  audit: [...s.audit, createAuditEntry({ kind, refId, actorId: `demo-${actorRole}`, actorRole, now, ...extra })].slice(-MAX_DEMO_AUDIT),
});

export const stageOf = (s: DemoState, c: DemoCase): CaseStatus => s.stages[c.id] ?? c.stage;

/** Move a demo case to another stage, logged. Accepting into review and closing both leave an audit row. */
export function moveStage(s: DemoState, caseId: string, to: CaseStatus, actor: DeskRole, now: Date, reason?: string): DemoState {
  const c = caseById(caseId);
  if (!c || stageOf(s, c) === to) return s;
  const kind: AuditKind = to === "settled" ? "settlement_certified" : to === "unresolved" ? "application_rejected" : to === "lawyer" ? "lawyer_changed" : "application_accepted";
  return log({ ...s, stages: { ...s.stages, [caseId]: to } }, kind, caseId, actor, now, { detail: `${stageOf(s, c)} → ${to}`, ...(reason ? { reason } : {}) });
}

/** Opening an emergency-severity case is itself logged, as the source app requires for sensitive files. */
export function openCase(s: DemoState, caseId: string, actor: DeskRole, now: Date): DemoState {
  const c = caseById(caseId);
  if (!c) return s;
  return severityOf(c).level === "emergency" ? log(s, "sensitive_case_opened", caseId, actor, now, { detail: "demo desk view" }) : s;
}

export function markActionDone(s: DemoState, caseId: string, code: string, now: Date): DemoState {
  const c = caseById(caseId);
  if (!c || !c.lawyerId) return s;
  const cur = s.done[caseId] ?? [];
  if (cur.includes(code)) return s;
  return log({ ...s, done: { ...s.done, [caseId]: [...cur, code] } }, "message_sent", caseId, "lawyer", now, { detail: `action logged: ${code}` });
}

// ---------------------------------------------------------------------------
// Desk views

export interface SeverityBadge { level: SeverityLevel; bn: string; en: string; categoryBn: string }
const SEVERITY_LABEL: Record<SeverityLevel, { bn: string; en: string }> = {
  emergency: { bn: "জরুরি", en: "Emergency" },
  high: { bn: "উচ্চ", en: "High" },
  priority: { bn: "অগ্রাধিকার", en: "Priority" },
  standard: { bn: "সাধারণ", en: "Standard" },
};
export const SEVERITY_ORDER: SeverityLevel[] = ["emergency", "high", "priority", "standard"];

export function severityOf(c: DemoCase): SeverityBadge {
  const r = classifySeverity(c.problem);
  return { level: r.severity, ...SEVERITY_LABEL[r.severity], categoryBn: r.categoryBn };
}

export interface TimeBadge { level: SlaLevel; remainingDays: number | null; daysInStage: number; bn: string; en: string }

/** Review and mediation are timed against their own stage limits; other open stages use the generic 14/30-day tone. */
export function timeBadge(c: DemoCase, stage: CaseStatus): TimeBadge {
  if (stage === "settled" || stage === "unresolved") return { level: "ok", remainingDays: null, daysInStage: c.daysInStage, bn: "বন্ধ", en: "Closed" };
  if (stage === "review" || stage === "submitted" || stage === "mediation") {
    const a = assessSla(stage === "mediation" ? "mediation" : "review", c.daysInStage);
    const bn = a.remainingDays < 0 ? `${-a.remainingDays} দিন পেরিয়ে গেছে` : `${a.remainingDays} দিন বাকি`;
    const en = a.remainingDays < 0 ? `${-a.remainingDays} days over` : `${a.remainingDays} days left`;
    return { level: a.level, remainingDays: a.remainingDays, daysInStage: c.daysInStage, bn, en };
  }
  const level = daysInStageTone(c.daysInStage);
  return { level, remainingDays: null, daysInStage: c.daysInStage, bn: `এই ধাপে ${c.daysInStage} দিন`, en: `${c.daysInStage} days in this stage` };
}

export interface QueueRow { c: DemoCase; stage: CaseStatus; stageBn: string; stageEn: string; severity: SeverityBadge; time: TimeBadge }
export interface QueueFilter { severity?: SeverityLevel | "all"; stage?: CaseStatus | "open" | "all"; search?: string }

const TIME_RANK: Record<SlaLevel, number> = { breach: 0, near: 1, ok: 2 };

/** The officer's queue: most urgent first, then the most overdue. */
export function dlaoQueue(s: DemoState, filter: QueueFilter = {}): QueueRow[] {
  const q = (filter.search ?? "").normalize("NFC").trim().toLowerCase();
  return DEMO_CASES.map((c) => {
    const stage = stageOf(s, c);
    return { c, stage, stageBn: CITIZEN_STATUS_LABELS[stage].bn, stageEn: CITIZEN_STATUS_LABELS[stage].en, severity: severityOf(c), time: timeBadge(c, stage) };
  })
    .filter((r) => !filter.severity || filter.severity === "all" || r.severity.level === filter.severity)
    .filter((r) => !filter.stage || filter.stage === "all" || (filter.stage === "open" ? !["settled", "unresolved"].includes(r.stage) : r.stage === filter.stage))
    .filter((r) => !q || `${r.c.id} ${r.c.nameBn} ${r.c.nameEn} ${r.c.district} ${r.c.categoryBn}`.normalize("NFC").toLowerCase().includes(q))
    .sort((a, b) => SEVERITY_ORDER.indexOf(a.severity.level) - SEVERITY_ORDER.indexOf(b.severity.level) || TIME_RANK[a.time.level] - TIME_RANK[b.time.level] || a.c.id.localeCompare(b.c.id));
}

export interface LawyerCaseView { c: DemoCase; assignedAt: string; actions: TrackedAction[]; summary: TrackerSummary }

/** A demo case's lawyer obligations graded against the plan's deadlines (design rules, demo only). */
export function lawyerCaseView(s: DemoState, c: DemoCase, now: Date): LawyerCaseView | null {
  if (!c.lawyerId || c.lawyerAssignedDaysAgo === null) return null;
  const assigned = new Date(now.getTime() - c.lawyerAssignedDaysAgo * DAY);
  const assignedAt = assigned.toISOString();
  const marked = s.done[c.id] ?? [];
  const actions = actionsForTrack(c.lawyerTrack).map((a, i) => {
    const seeded = i < c.actionsDoneAtSeed;
    const doneAt = seeded ? deadlineFrom(assigned, Math.max(0, a.days - 1)) : marked.includes(a.code) ? now.toISOString() : null;
    return gradeAction({ code: a.code, labelBn: a.labelBn, dueAt: deadlineFrom(assigned, a.days), doneAt, noteBn: null }, assignedAt, now);
  });
  return { c, assignedAt, actions, summary: summariseTracker(actions, assignedAt, now) };
}

export function lawyerDesk(s: DemoState, lawyerId: string, now: Date): LawyerCaseView[] {
  return DEMO_CASES.filter((c) => c.lawyerId === lawyerId).map((c) => lawyerCaseView(s, c, now)).filter((v): v is LawyerCaseView => v !== null);
}

export interface ChiefStats {
  total: number;
  open: number;
  closed: number;
  byStage: { stage: CaseStatus; bn: string; en: string; count: number }[];
  bySeverity: { level: SeverityLevel; bn: string; en: string; count: number }[];
  overTime: number;
  lawyers: { lawyer: DemoLawyer; cases: number; progressPercent: number; overdue: number }[];
}

export function chiefStats(s: DemoState, now: Date): ChiefStats {
  const rows = dlaoQueue(s);
  const closed = rows.filter((r) => r.stage === "settled" || r.stage === "unresolved").length;
  return {
    total: rows.length,
    open: rows.length - closed,
    closed,
    byStage: CASE_STATUSES.map((stage) => ({ stage, ...CITIZEN_STATUS_LABELS[stage], count: rows.filter((r) => r.stage === stage).length })),
    bySeverity: SEVERITY_ORDER.map((level) => ({ level, ...SEVERITY_LABEL[level], count: rows.filter((r) => r.severity.level === level).length })),
    overTime: rows.filter((r) => r.time.level === "breach").length,
    lawyers: DEMO_LAWYERS.map((lawyer) => {
      const views = lawyerDesk(s, lawyer.id, now);
      const total = views.reduce((n, v) => n + v.summary.total, 0);
      const done = views.reduce((n, v) => n + v.summary.done, 0);
      return { lawyer, cases: views.length, progressPercent: total ? Math.round((done / total) * 100) : 0, overdue: views.reduce((n, v) => n + v.summary.overdue, 0) };
    }),
  };
}

// ---------------------------------------------------------------------------
// The simulation story: one fictional case from first call to a settlement draft.

export interface SimulationStep { id: string; titleBn: string; titleEn: string; captionBn: string; captionEn: string; bodyBn: string; bodyEn: string }

export const SIMULATION: SimulationStep[] = [
  { id: "call", titleBn: "সাহায্য চাওয়া", titleEn: "Asking for help", captionBn: "ভাই ফোন করে মৌ-এর হয়ে", captionEn: "Her brother calls for Mou",
    bodyBn: "মৌ নিজে কথা বলতে পারছে না, তাই তার ভাই সরকারি আইনি সহায়তার হেল্পলাইনে ফোন করে সমস্যা জানায়।", bodyEn: "Mou cannot speak for herself, so her brother calls the government legal aid helpline and explains." },
  { id: "flag", titleBn: "জরুরি চিহ্ন", titleEn: "Urgent flag", captionBn: "কর্মকর্তার ডেস্কে সবার ওপরে", captionEn: "Top of the officer's queue",
    bodyBn: "সমস্যার কথায় নির্যাতনের লক্ষণ থাকায় কেসটি জরুরি হিসেবে সারির শুরুতে আসে, আর খোলার ঘটনাও লিখে রাখা হয়।", bodyEn: "The words describe abuse, so the case is marked urgent and goes to the top; opening it is logged." },
  { id: "safe", titleBn: "নিরাপদ যোগাযোগ", titleEn: "Safe contact", captionBn: "স্বামীর ফোনে কোনো বার্তা নয়", captionEn: "Nothing to the husband's phone",
    bodyBn: "কোন সময়ে, কোন নম্বরে যোগাযোগ নিরাপদ তা ঠিক করা হয়; বাকি সব বার্তা আটকে রাখা হয় ও লগে ওঠে।", bodyEn: "A safe time and number are agreed; every other message is held back and logged." },
  { id: "identity", titleBn: "পরিচয় নিশ্চিত", titleEn: "Identity confirmed", captionBn: "অফিসে গিয়ে কাগজ দেখানো", captionEn: "Papers shown at the office",
    bodyBn: "মৌ নিকটের অফিসে গিয়ে নিজের পরিচয়পত্র দেখান; ছবি বা স্বাক্ষর কোনো অ্যাপে তোলা হয় না।", bodyEn: "Mou shows her ID at the nearest office; no photo or signature is captured in an app." },
  { id: "schedule", titleBn: "মধ্যস্থতার দিন", titleEn: "Mediation date", captionBn: "কার্যদিবস আর নিরাপদ সময় মিলিয়ে", captionEn: "A working day inside the safe window",
    bodyBn: "দুই পক্ষ আর মধ্যস্থতাকারীর সুবিধামতো একটি কার্যদিবস ঠিক হয়।", bodyEn: "A working day that suits both sides and the mediator is fixed." },
  { id: "mediate", titleBn: "মধ্যস্থতা", titleEn: "Mediation", captionBn: "আলোচনায় সমঝোতা", captionEn: "Agreement through talks",
    bodyBn: "মধ্যস্থতাকারীর উপস্থিতিতে দুই পক্ষ খরচ ও নিরাপত্তার শর্তে রাজি হয়।", bodyEn: "With the mediator present, both sides agree on maintenance and safety terms." },
  { id: "draft", titleBn: "মীমাংসার খসড়া", titleEn: "Settlement draft", captionBn: "শর্তগুলো লিখিত খসড়ায়", captionEn: "Terms written into a draft",
    bodyBn: "রাজি হওয়া শর্তগুলো একটি খসড়ায় লেখা হয়, যা আইনজীবী ও অফিস যাচাই করে স্বাক্ষরের আগে।", bodyEn: "The agreed terms go into a draft that the lawyer and office check before anyone signs." },
];
