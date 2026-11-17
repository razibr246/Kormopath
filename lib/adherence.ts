// MediScan BD: medicine-adherence tracker ("AdhereLoop"). Pure and deterministic, no imports,
// so it is unit-tested under `node --test`.
//
// Safety rules this module enforces:
// - The schedule is the user's own, copied from their prescription and confirmed by them.
//   This module never proposes a medicine, a dose, a number of doses or a course length; it
//   only counts what the user logged against what the user said the prescription says.
// - A low score is never a diagnosis or a verdict. The only output is a neutral prompt to
//   talk to the doctor or pharmacist.
//
// Calendar rules:
// - All dates are plain "YYYY-MM-DD" strings for the user's local calendar day in Bangladesh
//   (Asia/Dhaka, UTC+6 all year; no daylight saving since 2009). Day arithmetic goes through
//   Date.UTC, which does not depend on the device's timezone, so a phone set to another zone
//   or a DST change cannot shift a day.
// - Days before the medicine's start date, after its end date, and after today are never
//   counted.
// - "Today" is still in progress, so it is not counted as covered or missed in PDC. It is
//   reported separately (doses taken so far), and it extends the streak once it is complete.
//
// Coverage rule (decided and documented): a day counts as covered only if EVERY scheduled
// dose for that day was logged. A day with 1 of 2 doses logged is "partial" and is NOT
// covered for PDC; its untaken dose counts as missed.

export const DEFAULT_WINDOW_DAYS = 30;

/**
 * PDC at or above 80% is the standard adherence threshold used by the Pharmacy Quality
 * Alliance (PQA) adherence measures and the CMS Medicare Part D Star Ratings. Below it we show
 * a neutral "talk to your doctor or pharmacist" prompt, never a judgement.
 */
export const PDC_THRESHOLD = 0.8;

export const MAX_TIMES_PER_DAY = 4;
export const MAX_MEDICINES = 20;
export const MAX_LOG_ENTRIES = 5000;

export interface AdherenceMedicine {
  id: string;
  /** Medicine name as written on the prescription. */
  name: string;
  /** Amount per time as written on the prescription ("১টি", "৫ মি.লি."); free text, optional. */
  amountNote: string;
  /** Reminder clock times, one per dose ("HH:MM", local). Length = times per day. */
  times: string[];
  startDate: string; // YYYY-MM-DD
  endDate: string | null; // YYYY-MM-DD inclusive; null = no end written ("continue")
}

/** A logged dose: medicine id, calendar day, dose index (0-based, < times per day). */
export interface DoseLogEntry {
  medId: string;
  date: string;
  dose: number;
}

// ---------- calendar-day helpers (timezone-independent) ----------

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const DAY_MS = 86_400_000;

export function isValidDate(s: unknown): s is string {
  if (typeof s !== "string") return false;
  const m = DATE_RE.exec(s);
  if (!m) return false;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  if (y < 2000 || y > 2100 || mo < 1 || mo > 12 || d < 1) return false;
  const dt = new Date(Date.UTC(y, mo - 1, d));
  return dt.getUTCMonth() === mo - 1 && dt.getUTCDate() === d;
}

export const isValidTime = (s: unknown): s is string => typeof s === "string" && TIME_RE.test(s);

/** Day number since 1970-01-01 for a YYYY-MM-DD string. */
function dayNum(date: string): number {
  const m = DATE_RE.exec(date)!;
  return Math.round(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])) / DAY_MS);
}

function fromDayNum(n: number): string {
  const d = new Date(n * DAY_MS);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}

export const addDays = (date: string, n: number) => fromDayNum(dayNum(date) + n);
/** b - a in whole days. */
export const daysBetween = (a: string, b: string) => dayNum(b) - dayNum(a);

/** Today's calendar date in Bangladesh (UTC+6, no DST), whatever the device timezone. */
export function todayInDhaka(now: Date = new Date()): string {
  const d = new Date(now.getTime() + 6 * 3_600_000);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}

/** Inclusive list of dates from a to b (empty if b < a). */
export function dateRange(a: string, b: string): string[] {
  const out: string[] = [];
  for (let n = dayNum(a), end = dayNum(b); n <= end; n++) out.push(fromDayNum(n));
  return out;
}

// ---------- log helpers ----------

export const doseKey = (medId: string, date: string, dose: number) => `${medId}|${date}|${dose}`;

export function parseDoseKey(key: string): DoseLogEntry | null {
  const parts = key.split("|");
  if (parts.length !== 3) return null;
  const dose = Number(parts[2]);
  if (!parts[0] || !isValidDate(parts[1]) || !Number.isInteger(dose) || dose < 0 || dose >= MAX_TIMES_PER_DAY) return null;
  return { medId: parts[0], date: parts[1], dose };
}

/** Toggle one dose in the log (one tap per dose). Returns a new array. */
export function toggleDose(log: string[], medId: string, date: string, dose: number): string[] {
  const key = doseKey(medId, date, dose);
  return log.includes(key) ? log.filter((k) => k !== key) : [...log, key].slice(-MAX_LOG_ENTRIES);
}

/** Drop every logged dose for a medicine (used when the user removes it). */
export const removeMedicineLog = (log: string[], medId: string) => log.filter((k) => !k.startsWith(`${medId}|`));

const isActiveOn = (m: AdherenceMedicine, date: string) =>
  daysBetween(m.startDate, date) >= 0 && (m.endDate === null || daysBetween(date, m.endDate) >= 0);

/** Number of distinct valid doses logged for this medicine on this day. */
function takenOn(m: AdherenceMedicine, date: string, logSet: Set<string>): number {
  let n = 0;
  for (let i = 0; i < m.times.length; i++) if (logSet.has(doseKey(m.id, date, i))) n++;
  return n;
}

// ---------- results ----------

export type DayStatus = "covered" | "partial" | "missed" | "not-scheduled" | "today" | "future";

export interface DayCell {
  date: string;
  status: DayStatus;
  scheduled: number;
  taken: number;
}

export interface MedicineAdherence {
  medId: string;
  name: string;
  /** First and last day counted (completed days only); null when no completed day is in the window yet. */
  windowStart: string | null;
  windowEnd: string | null;
  daysInWindow: number;
  daysCovered: number;
  /** daysCovered / daysInWindow, 0..1; null when there is no completed day to measure. */
  pdc: number | null;
  missedDoses: number;
  /** Consecutive fully covered days ending today (if today is complete) or yesterday. */
  currentStreak: number;
  todayTaken: number;
  todayScheduled: number;
  /** PDC below the PQA/CMS 80% threshold: show the neutral talk-to-your-doctor prompt. */
  flag: boolean;
}

export interface AdherenceSummary {
  today: string;
  windowDays: number;
  medicines: MedicineAdherence[];
  overall: {
    daysInWindow: number;
    /** Days on which every medicine scheduled that day was fully taken. */
    daysCovered: number;
    pdc: number | null;
    missedDoses: number;
    currentStreak: number;
    todayTaken: number;
    todayScheduled: number;
    flag: boolean;
  };
}

const clampWindow = (n: number | undefined) => (Number.isInteger(n) && (n as number) >= 1 ? Math.min(n as number, 365) : DEFAULT_WINDOW_DAYS);

function medicineAdherence(m: AdherenceMedicine, logSet: Set<string>, today: string, windowDays: number): MedicineAdherence {
  const yesterday = addDays(today, -1);
  const rollingStart = addDays(today, -windowDays); // window = the last `windowDays` completed days
  const start = daysBetween(rollingStart, m.startDate) > 0 ? m.startDate : rollingStart;
  const end = m.endDate !== null && daysBetween(m.endDate, yesterday) > 0 ? m.endDate : yesterday;
  const days = daysBetween(start, end) >= 0 ? dateRange(start, end) : [];

  let covered = 0;
  let missed = 0;
  for (const d of days) {
    const t = takenOn(m, d, logSet);
    if (t === m.times.length) covered++;
    missed += m.times.length - t;
  }

  const todayScheduled = isActiveOn(m, today) ? m.times.length : 0;
  const todayTaken = todayScheduled ? takenOn(m, today, logSet) : 0;

  // Streak: today counts once complete; otherwise start from yesterday. Not bounded by the
  // window, but never before the start date.
  let streak = 0;
  let cursor = todayScheduled && todayTaken === todayScheduled ? today : yesterday;
  while (isActiveOn(m, cursor) && takenOn(m, cursor, logSet) === m.times.length) {
    streak++;
    cursor = addDays(cursor, -1);
  }

  const pdc = days.length ? covered / days.length : null;
  return {
    medId: m.id,
    name: m.name,
    windowStart: days.length ? start : null,
    windowEnd: days.length ? end : null,
    daysInWindow: days.length,
    daysCovered: covered,
    pdc,
    missedDoses: missed,
    currentStreak: streak,
    todayTaken,
    todayScheduled,
    flag: pdc !== null && pdc < PDC_THRESHOLD,
  };
}

/** One calendar day, combined across every medicine scheduled that day. */
export function dayCell(meds: AdherenceMedicine[], logSet: Set<string>, date: string, today: string): DayCell {
  const offset = daysBetween(today, date);
  let scheduled = 0;
  let taken = 0;
  let allFull = true;
  for (const m of meds) {
    if (!isActiveOn(m, date)) continue;
    scheduled += m.times.length;
    const t = takenOn(m, date, logSet);
    taken += t;
    if (t < m.times.length) allFull = false;
  }
  if (offset > 0) return { date, status: "future", scheduled, taken: 0 };
  if (!scheduled) return { date, status: "not-scheduled", scheduled: 0, taken: 0 };
  if (offset === 0) return { date, status: allFull ? "covered" : "today", scheduled, taken };
  return { date, status: allFull ? "covered" : taken > 0 ? "partial" : "missed", scheduled, taken };
}

/** The last `days` calendar days ending today, oldest first, for the calendar strip. */
export function calendarStrip(meds: AdherenceMedicine[], log: string[], today: string, days = DEFAULT_WINDOW_DAYS): DayCell[] {
  const set = new Set(log);
  return dateRange(addDays(today, -(clampWindow(days) - 1)), today).map((d) => dayCell(meds, set, d, today));
}

/**
 * Proportion of Days Covered (PDC) per medicine and overall over a rolling window of
 * completed days (default 30), clipped to each medicine's start and end dates.
 */
export function computeAdherence(
  meds: AdherenceMedicine[],
  log: string[],
  today: string,
  opts: { windowDays?: number } = {},
): AdherenceSummary {
  const windowDays = clampWindow(opts.windowDays);
  const set = new Set(log);
  const medicines = meds.map((m) => medicineAdherence(m, set, today, windowDays));

  const days = dateRange(addDays(today, -windowDays), addDays(today, -1));
  let inWindow = 0;
  let covered = 0;
  for (const d of days) {
    const c = dayCell(meds, set, d, today);
    if (c.status === "not-scheduled") continue;
    inWindow++;
    if (c.status === "covered") covered++;
  }

  const todayCell = dayCell(meds, set, today, today);
  let streak = 0;
  let cursor = todayCell.scheduled > 0 && todayCell.status === "covered" ? today : addDays(today, -1);
  for (let guard = 0; guard < 3650; guard++) {
    if (dayCell(meds, set, cursor, today).status !== "covered") break;
    streak++;
    cursor = addDays(cursor, -1);
  }

  const pdc = inWindow ? covered / inWindow : null;
  return {
    today,
    windowDays,
    medicines,
    overall: {
      daysInWindow: inWindow,
      daysCovered: covered,
      pdc,
      missedDoses: medicines.reduce((s, m) => s + m.missedDoses, 0),
      currentStreak: streak,
      todayTaken: todayCell.taken,
      todayScheduled: todayCell.scheduled,
      flag: pdc !== null && pdc < PDC_THRESHOLD,
    },
  };
}

/** Whole-number percent for display; null stays null (nothing to measure yet). */
export const pdcPercent = (pdc: number | null) => (pdc === null ? null : Math.round(pdc * 100));

// ---------- validation of stored / entered data (untrusted) ----------

export function validateMedicine(m: Partial<AdherenceMedicine>): string[] {
  const errors: string[] = [];
  if (typeof m.name !== "string" || !m.name.trim()) errors.push("name");
  if (!Array.isArray(m.times) || m.times.length < 1 || m.times.length > MAX_TIMES_PER_DAY || !m.times.every(isValidTime)) errors.push("times");
  if (!isValidDate(m.startDate)) errors.push("startDate");
  if (m.endDate !== null && m.endDate !== undefined) {
    if (!isValidDate(m.endDate)) errors.push("endDate");
    else if (isValidDate(m.startDate) && daysBetween(m.startDate, m.endDate) < 0) errors.push("endBeforeStart");
  }
  return errors;
}

export function sanitizeSchedule(raw: unknown): AdherenceMedicine[] | null {
  if (!Array.isArray(raw)) return null;
  const out: AdherenceMedicine[] = [];
  const seen = new Set<string>();
  for (const r of raw) {
    if (!r || typeof r !== "object") continue;
    const o = r as Record<string, unknown>;
    if (typeof o.id !== "string" || !/^[a-z0-9-]{1,40}$/i.test(o.id) || seen.has(o.id)) continue;
    const med: AdherenceMedicine = {
      id: o.id,
      name: typeof o.name === "string" ? o.name.trim().slice(0, 80) : "",
      amountNote: typeof o.amountNote === "string" ? o.amountNote.trim().slice(0, 40) : "",
      // An invalid time rejects the whole entry rather than silently changing times per day.
      times: Array.isArray(o.times) ? (o.times as string[]).slice(0, MAX_TIMES_PER_DAY + 1) : [],
      startDate: o.startDate as string,
      endDate: o.endDate === null || o.endDate === undefined ? null : (o.endDate as string),
    };
    if (validateMedicine(med).length) continue;
    seen.add(med.id);
    out.push(med);
    if (out.length >= MAX_MEDICINES) break;
  }
  return out;
}

export function sanitizeLog(raw: unknown): string[] | null {
  if (!Array.isArray(raw)) return null;
  const set = new Set<string>();
  for (const k of raw) if (typeof k === "string" && k.length <= 80 && parseDoseKey(k)) set.add(k);
  return [...set].slice(-MAX_LOG_ENTRIES);
}

// ---------- calendar export (RFC 5545) ----------

/**
 * Daily repeating reminders, one event per dose time. Ends on the end date written on the
 * prescription; with no end date it repeats for `openEndedDays` and says so. Floating local
 * times (no TZID), so the phone shows them at the clock time the user picked.
 */
export function adherenceToIcs(meds: AdherenceMedicine[], opts: { stamp?: string; openEndedDays?: number } = {}): string {
  const stamp = opts.stamp ?? "20260101T000000Z";
  const openEnded = opts.openEndedDays ?? DEFAULT_WINDOW_DAYS;
  const esc = (s: string) => s.replace(/[\\;,]/g, (c) => "\\" + c).replace(/\r?\n/g, "\\n");
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//KormoPath//MediScan Adherence//BN", "CALSCALE:GREGORIAN"];
  for (const m of meds) {
    m.times.forEach((time, i) => {
      const until = m.endDate ? `UNTIL=${m.endDate.replace(/-/g, "")}T235959` : `COUNT=${openEnded}`;
      const note = m.endDate
        ? `শেষ তারিখ ${m.endDate} (প্রেসক্রিপশন অনুযায়ী)।`
        : `শেষ তারিখ লেখা নেই — ${openEnded} দিনের রিমাইন্ডার; ডাক্তারের পরামর্শমতো চালিয়ে যান বা বন্ধ করুন।`;
      lines.push(
        "BEGIN:VEVENT",
        `UID:${m.id}-${i}-${m.startDate}@adherence.mediscan.kormopath`,
        `DTSTAMP:${stamp}`,
        `DTSTART:${m.startDate.replace(/-/g, "")}T${time.replace(":", "")}00`,
        "DURATION:PT10M",
        `RRULE:FREQ=DAILY;${until}`,
        `SUMMARY:${esc(`ওষুধ: ${m.name}${m.amountNote ? ` — ${m.amountNote}` : ""}`)}`,
        `DESCRIPTION:${esc(`${note} এটি শুধু মনে করিয়ে দেওয়ার জন্য; ডোজ আপনার প্রেসক্রিপশন থেকে। সন্দেহ হলে ডাক্তার/ফার্মাসিস্টকে জিজ্ঞেস করুন।`)}`,
        "BEGIN:VALARM", "TRIGGER:PT0M", "ACTION:DISPLAY", `DESCRIPTION:${esc(m.name)}`, "END:VALARM",
        "END:VEVENT",
      );
    });
  }
  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}
