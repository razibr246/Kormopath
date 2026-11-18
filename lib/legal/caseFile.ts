/*
 * The citizen's own legal aid case file, stored only on the device (storageKey("legal", "caseFiles")). NO imports
 * except ./ siblings — pure and unit-tested (tests/legal-casefile.test.ts). Built for KormoPath from the Digital Legal
 * Aid System's application record (razibr246 and AdribMahmud101), without its database, logins or docket numbers.
 *
 * What it is: a prepared application and a diary. KormoPath never files anything with a legal aid office, so every
 * status here is something the person reports themselves ("I called 16699", "I visited the office"). The timeline is
 * append-only: an edit adds an "edited" event, nothing is ever rewritten or removed, except deleting the whole file.
 */

import { BD_DISTRICTS } from "./districts.ts";
import { getProblemCategory, getProblemSubcategory } from "./taxonomy.ts";

export const MAX_CASE_FILES = 20;
export const MAX_TIMELINE = 200;
export const MAX_PROBLEM_CHARS = 2000;
export const MAX_NOTE_CHARS = 500;

/** Self-reported progress. Never a status from an office. */
export type CaseFileStatus = "draft" | "ready" | "contacted_helpline" | "visited_office" | "got_help" | "closed";

export const CASE_FILE_STATUS_LABELS: Record<CaseFileStatus, { bn: string; en: string }> = {
  draft: { bn: "খসড়া", en: "Draft" },
  ready: { bn: "আবেদন প্রস্তুত", en: "Application ready" },
  contacted_helpline: { bn: "১৬৬৯৯-এ কথা বলেছি", en: "I called 16699" },
  visited_office: { bn: "লিগ্যাল এইড অফিসে গিয়েছি", en: "I visited the legal aid office" },
  got_help: { bn: "সহায়তা পাচ্ছি", en: "I am getting help" },
  closed: { bn: "বিষয়টি শেষ", en: "Matter closed" },
};

export type TimelineKind = "created" | "edited" | "status" | "note" | "document";

export interface TimelineEvent {
  at: string; // ISO time
  kind: TimelineKind;
  text: string; // user's own words or a fixed label, max MAX_NOTE_CHARS
  status?: CaseFileStatus;
}

export interface ApplicantInfo {
  name: string;
  phone: string; // ASCII digits, may be empty
  gender: "female" | "male" | "other" | "";
  isChild: boolean | null;
  hasDisability: boolean | null;
  cannotAffordLawyer: boolean | null;
}

export interface CaseFile {
  id: string;
  createdAt: string;
  updatedAt: string;
  categoryId: string;
  subcategoryId: string;
  districtId: string;
  problem: string;
  applicant: ApplicantInfo;
  /** Names of papers the person has ready (from the checklist), never the files themselves. */
  documents: string[];
  status: CaseFileStatus;
  timeline: TimelineEvent[];
}

export interface NewCaseFileInput {
  categoryId: string;
  subcategoryId?: string;
  districtId: string;
  problem: string;
  applicant?: Partial<ApplicantInfo>;
  documents?: string[];
}

const STATUSES = new Set<string>(Object.keys(CASE_FILE_STATUS_LABELS));
const KINDS = new Set<string>(["created", "edited", "status", "note", "document"]);
const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/;
const clip = (s: unknown, n: number) => (typeof s === "string" ? s.normalize("NFC").trim().slice(0, n) : "");
const tri = (v: unknown): boolean | null => (v === true ? true : v === false ? false : null);
const digits = (s: unknown) => (typeof s === "string" ? s.replace(/[০-৯]/g, (d) => String("০১২৩৪৫৬৭৮৯".indexOf(d))).replace(/\D/g, "").slice(0, 15) : "");

// Districts are keyed by their English name (BD_DISTRICTS has no separate id).
const districtIds = new Set(BD_DISTRICTS.map((d) => d.en));

/** Problems with the input, as Bangla messages; empty means it can be saved. */
export function validateNewCaseFile(input: NewCaseFileInput): string[] {
  const issues: string[] = [];
  if (!getProblemCategory(input.categoryId)) issues.push("সমস্যার ধরন বেছে নিন।");
  if (!districtIds.has(input.districtId)) issues.push("জেলা বেছে নিন।");
  if (clip(input.problem, MAX_PROBLEM_CHARS).length < 10) issues.push("সমস্যাটি অন্তত এক-দুই লাইনে লিখুন।");
  return issues;
}

export function newCaseFile(input: NewCaseFileInput, id: string, nowIso: string): CaseFile {
  const a = input.applicant ?? {};
  const sub = input.subcategoryId && getProblemSubcategory(input.categoryId, input.subcategoryId) ? input.subcategoryId : "";
  return {
    id: clip(id, 40),
    createdAt: nowIso,
    updatedAt: nowIso,
    categoryId: input.categoryId,
    subcategoryId: sub,
    districtId: input.districtId,
    problem: clip(input.problem, MAX_PROBLEM_CHARS),
    applicant: {
      name: clip(a.name, 80),
      phone: digits(a.phone),
      gender: a.gender === "female" || a.gender === "male" || a.gender === "other" ? a.gender : "",
      isChild: tri(a.isChild),
      hasDisability: tri(a.hasDisability),
      cannotAffordLawyer: tri(a.cannotAffordLawyer),
    },
    documents: (input.documents ?? []).map((d) => clip(d, 80)).filter(Boolean).slice(0, 30),
    status: "draft",
    timeline: [{ at: nowIso, kind: "created", text: "আবেদনের খসড়া তৈরি" }],
  };
}

/** Append one event (append-only). A status event also moves the file's status. */
export function appendEvent(file: CaseFile, event: TimelineEvent): CaseFile {
  const ev: TimelineEvent = { at: event.at, kind: event.kind, text: clip(event.text, MAX_NOTE_CHARS), ...(event.status ? { status: event.status } : {}) };
  const timeline = [...file.timeline, ev].slice(-MAX_TIMELINE);
  return { ...file, updatedAt: event.at, status: ev.kind === "status" && ev.status ? ev.status : file.status, timeline };
}

export function setStatus(file: CaseFile, status: CaseFileStatus, nowIso: string): CaseFile {
  return appendEvent(file, { at: nowIso, kind: "status", status, text: CASE_FILE_STATUS_LABELS[status].bn });
}

/** Edit the prepared application. The old text is not kept in the event (privacy); the event records that it changed. */
export function editCaseFile(file: CaseFile, patch: Partial<Pick<CaseFile, "problem" | "documents" | "districtId" | "subcategoryId">> & { applicant?: Partial<ApplicantInfo> }, nowIso: string): CaseFile {
  const changed: string[] = [];
  const next: CaseFile = { ...file, applicant: { ...file.applicant } };
  if (patch.problem !== undefined && clip(patch.problem, MAX_PROBLEM_CHARS) !== file.problem) { next.problem = clip(patch.problem, MAX_PROBLEM_CHARS); changed.push("সমস্যার বিবরণ"); }
  if (patch.districtId !== undefined && districtIds.has(patch.districtId) && patch.districtId !== file.districtId) { next.districtId = patch.districtId; changed.push("জেলা"); }
  if (patch.subcategoryId !== undefined && patch.subcategoryId !== file.subcategoryId) { next.subcategoryId = getProblemSubcategory(file.categoryId, patch.subcategoryId) ? patch.subcategoryId : ""; changed.push("উপ-ধরন"); }
  if (patch.documents !== undefined) { next.documents = patch.documents.map((d) => clip(d, 80)).filter(Boolean).slice(0, 30); changed.push("কাগজপত্রের তালিকা"); }
  if (patch.applicant) {
    const a = patch.applicant;
    if (a.name !== undefined) next.applicant.name = clip(a.name, 80);
    if (a.phone !== undefined) next.applicant.phone = digits(a.phone);
    if (a.gender !== undefined) next.applicant.gender = a.gender === "female" || a.gender === "male" || a.gender === "other" ? a.gender : "";
    if (a.isChild !== undefined) next.applicant.isChild = tri(a.isChild);
    if (a.hasDisability !== undefined) next.applicant.hasDisability = tri(a.hasDisability);
    if (a.cannotAffordLawyer !== undefined) next.applicant.cannotAffordLawyer = tri(a.cannotAffordLawyer);
    changed.push("আবেদনকারীর তথ্য");
  }
  if (!changed.length) return file;
  return appendEvent(next, { at: nowIso, kind: "edited", text: `বদলানো হয়েছে: ${changed.join(", ")}` });
}

/** Device storage guard: drops anything malformed, caps sizes. */
export function sanitizeCaseFiles(raw: unknown): CaseFile[] | null {
  if (!Array.isArray(raw)) return null;
  const out: CaseFile[] = [];
  for (const r of raw.slice(0, MAX_CASE_FILES)) {
    if (!r || typeof r !== "object") continue;
    const o = r as Record<string, unknown>;
    if (typeof o.id !== "string" || !o.id || typeof o.createdAt !== "string" || !ISO.test(o.createdAt)) continue;
    if (typeof o.categoryId !== "string" || !getProblemCategory(o.categoryId)) continue;
    const a = (o.applicant && typeof o.applicant === "object" ? o.applicant : {}) as Record<string, unknown>;
    const timeline: TimelineEvent[] = [];
    for (const e of Array.isArray(o.timeline) ? o.timeline.slice(-MAX_TIMELINE) : []) {
      if (!e || typeof e !== "object") continue;
      const x = e as Record<string, unknown>;
      if (typeof x.at !== "string" || !ISO.test(x.at) || !KINDS.has(x.kind as string)) continue;
      timeline.push({ at: x.at, kind: x.kind as TimelineKind, text: clip(x.text, MAX_NOTE_CHARS), ...(STATUSES.has(x.status as string) ? { status: x.status as CaseFileStatus } : {}) });
    }
    out.push({
      id: clip(o.id, 40),
      createdAt: o.createdAt,
      updatedAt: typeof o.updatedAt === "string" && ISO.test(o.updatedAt) ? o.updatedAt : o.createdAt,
      categoryId: o.categoryId,
      subcategoryId: typeof o.subcategoryId === "string" && getProblemSubcategory(o.categoryId, o.subcategoryId) ? o.subcategoryId : "",
      districtId: typeof o.districtId === "string" && districtIds.has(o.districtId) ? o.districtId : "",
      problem: clip(o.problem, MAX_PROBLEM_CHARS),
      applicant: {
        name: clip(a.name, 80),
        phone: digits(a.phone),
        gender: a.gender === "female" || a.gender === "male" || a.gender === "other" ? a.gender : "",
        isChild: tri(a.isChild),
        hasDisability: tri(a.hasDisability),
        cannotAffordLawyer: tri(a.cannotAffordLawyer),
      },
      documents: Array.isArray(o.documents) ? o.documents.map((d) => clip(d, 80)).filter(Boolean).slice(0, 30) : [],
      status: STATUSES.has(o.status as string) ? (o.status as CaseFileStatus) : "draft",
      timeline,
    });
  }
  return out;
}

/** Plain-text application draft the person can print, copy or read out at the office or on 16699. */
export function applicationText(file: CaseFile): string {
  const cat = getProblemCategory(file.categoryId);
  const sub = file.subcategoryId ? getProblemSubcategory(file.categoryId, file.subcategoryId) : null;
  const district = BD_DISTRICTS.find((d) => d.en === file.districtId);
  const yn = (v: boolean | null) => (v === true ? "হ্যাঁ" : v === false ? "না" : "বলা হয়নি");
  return [
    "সরকারি আইনি সহায়তার আবেদনের খসড়া (নিজে প্রস্তুত করা, কোনো অফিসে জমা হয়নি)",
    "",
    `নাম: ${file.applicant.name || "—"}`,
    `ফোন: ${file.applicant.phone || "—"}`,
    `জেলা: ${district?.bn ?? "—"}`,
    `সমস্যার ধরন: ${cat?.bn ?? "—"}${sub ? ` — ${sub.bn}` : ""}`,
    `আইনজীবীর খরচ দিতে পারি না: ${yn(file.applicant.cannotAffordLawyer)}`,
    `প্রতিবন্ধিতা আছে: ${yn(file.applicant.hasDisability)}`,
    "",
    "সমস্যার বিবরণ:",
    file.problem || "—",
    "",
    `সঙ্গে থাকা কাগজপত্র: ${file.documents.length ? file.documents.join(", ") : "—"}`,
    "",
    "জমা দিতে: জেলা লিগ্যাল এইড অফিসে যান বা ১৬৬৯৯ নম্বরে ফোন করুন (বাংলাদেশ আইনগত সহায়তা অধিদপ্তর, nlaso.gov.bd)।",
  ].join("\n");
}
