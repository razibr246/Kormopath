/*
 * Consultation bookings, kept on this device (pure; tests/health-booking.test.ts).
 *
 * KormoPath has no server database, so a booking lives on the patient's phone. For a real (verified) doctor the
 * patient sends the booking request message (bookingMessage) to the clinic operator by SMS or WhatsApp; the admin
 * checks the TrxID in the bKash app and marks it verified. Nothing is confirmed, and no call can be joined, before
 * that. Consultations are never recorded.
 */
import { canMove, checkTrxId, formatTaka, type PaymentStatus } from "./payments.ts";
import type { ConsultType, Doctor } from "./doctors.ts";
import { isRealBookable } from "./doctors.ts";

export interface PaymentEvent { at: string; status: PaymentStatus; by: "patient" | "admin"; note: string }

export interface Booking {
  id: string;
  ref: string; // shown to the patient and written in the bKash reference
  doctorId: string;
  doctorNameEn: string;
  doctorNameBn: string;
  demo: boolean; // made with a demo doctor: never a real payment
  type: ConsultType;
  kind: "new" | "followup";
  parentId: string | null;
  date: string; // YYYY-MM-DD (Dhaka)
  time: string; // HH:MM
  feePoisha: number;
  trxId: string | null;
  status: PaymentStatus;
  history: PaymentEvent[];
  room: string | null; // video meeting room name, created when booked
  patientNote: string; // optional, only what the patient chooses to add
  createdAt: string;
}

export const MAX_BOOKINGS = 200;
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I

/** `rand` returns bytes (crypto.getRandomValues in the app; a fixed source in tests). */
export type RandBytes = (n: number) => Uint8Array;
const pick = (rand: RandBytes, n: number) => Array.from(rand(n), (b) => ALPHABET[b % ALPHABET.length]).join("");

export const makeRef = (rand: RandBytes) => `KP-${pick(rand, 6)}`;
/** Unguessable meeting room name (20 random characters ≈ 100 bits). */
export const makeRoom = (rand: RandBytes) => `KormoPath-Consult-${pick(rand, 20)}`;
export const JITSI_BASE = "https://meet.jit.si/";
export const meetingUrl = (room: string) => `${JITSI_BASE}${encodeURIComponent(room)}`;

const active = (b: Booking) => b.status !== "failed" && b.status !== "refunded";

export type BookError = "slot_taken" | "not_bookable" | "type_unavailable" | "no_parent" | "suspended";

export interface NewBooking {
  doctor: Doctor;
  type: ConsultType;
  date: string;
  time: string;
  kind?: "new" | "followup";
  parentId?: string | null;
  patientNote?: string;
}

/**
 * Create a booking. Demo doctors give a demo booking (no money). A non-demo doctor must pass isRealBookable.
 * The same doctor, date and time can hold only one active booking.
 */
export function createBooking(list: readonly Booking[], input: NewBooking, nowIso: string, rand: RandBytes): { ok: true; booking: Booking } | { ok: false; error: BookError } {
  const d = input.doctor;
  if (d.suspended) return { ok: false, error: "suspended" };
  if (!d.demo && !isRealBookable(d)) return { ok: false, error: "not_bookable" };
  if (!d.types.includes(input.type)) return { ok: false, error: "type_unavailable" };
  if (list.some((b) => active(b) && b.doctorId === d.id && b.date === input.date && b.time === input.time)) return { ok: false, error: "slot_taken" };
  const kind = input.kind ?? "new";
  let fee = d.feePoisha;
  if (kind === "followup") {
    const parent = list.find((b) => b.id === input.parentId && b.doctorId === d.id && b.status === "verified");
    if (!parent) return { ok: false, error: "no_parent" };
    fee = d.followUpFeePoisha;
  }
  const booking: Booking = {
    id: `bk-${pick(rand, 10)}`, ref: makeRef(rand), doctorId: d.id, doctorNameEn: d.nameEn, doctorNameBn: d.nameBn, demo: d.demo,
    type: input.type, kind, parentId: kind === "followup" ? (input.parentId ?? null) : null, date: input.date, time: input.time,
    feePoisha: fee, trxId: null, status: "unpaid", history: [], room: input.type === "video" ? makeRoom(rand) : null,
    patientNote: String(input.patientNote ?? "").slice(0, 300), createdAt: nowIso,
  };
  return { ok: true, booking };
}

export type TrxError = "pin_like" | "format" | "duplicate" | "not_found" | "wrong_status";

/** The patient submits the bKash TrxID: unpaid/failed → pending. Duplicate TrxIDs across bookings are refused. */
export function submitTrxId(list: readonly Booking[], id: string, raw: string, nowIso: string): { ok: true; list: Booking[] } | { ok: false; error: TrxError } {
  const b = list.find((x) => x.id === id);
  if (!b) return { ok: false, error: "not_found" };
  if (!canMove(b.status, "pending")) return { ok: false, error: "wrong_status" };
  const c = checkTrxId(raw);
  if (!c.ok) return { ok: false, error: c.reason };
  if (list.some((x) => x.id !== id && x.trxId === c.trxId)) return { ok: false, error: "duplicate" };
  const next: Booking = { ...b, trxId: c.trxId, status: "pending", history: [...b.history, { at: nowIso, status: "pending", by: "patient", note: `TrxID ${c.trxId}` }] };
  return { ok: true, list: list.map((x) => (x.id === id ? next : x)) };
}

/** Admin decision. Verifying needs a TrxID; failing or refunding needs a reason. */
export function adminSetStatus(list: readonly Booking[], id: string, to: PaymentStatus, reason: string, nowIso: string): { ok: true; list: Booking[] } | { ok: false; error: "not_found" | "wrong_status" | "no_trx" | "no_reason" } {
  const b = list.find((x) => x.id === id);
  if (!b) return { ok: false, error: "not_found" };
  if (!canMove(b.status, to)) return { ok: false, error: "wrong_status" };
  if (to === "verified" && !b.trxId) return { ok: false, error: "no_trx" };
  if ((to === "failed" || to === "refunded") && !reason.trim()) return { ok: false, error: "no_reason" };
  const next: Booking = { ...b, status: to, history: [...b.history, { at: nowIso, status: to, by: "admin", note: reason.trim().slice(0, 200) }] };
  return { ok: true, list: list.map((x) => (x.id === id ? next : x)) };
}

/** A call can be joined only after an admin verified the payment, and never for a demo booking. */
export const canJoin = (b: Booking): boolean => b.status === "verified" && !b.demo;

const TYPE_TXT = { audio: { bn: "অডিও কল", en: "Audio call" }, video: { bn: "ভিডিও কল", en: "Video call" }, inperson: { bn: "সরাসরি চেম্বারে", en: "In person" } } as const;

/** The message the patient sends to the clinic operator. No medical detail unless the patient wrote a note. */
export function bookingMessage(b: Booking, lang: "bn" | "en" = "bn"): string {
  const bn = lang === "bn";
  const lines = bn
    ? [`কর্মপথ ডাক্তার বুকিং অনুরোধ`, `রেফারেন্স: ${b.ref}`, `ডাক্তার: ${b.doctorNameBn}`, `ধরন: ${TYPE_TXT[b.type].bn}${b.kind === "followup" ? " (ফলো-আপ)" : ""}`, `সময়: ${b.date} ${b.time}`, `ফি: ${formatTaka(b.feePoisha, "bn")}`, `বিকাশ TrxID: ${b.trxId ?? "—"}`]
    : [`KormoPath doctor booking request`, `Reference: ${b.ref}`, `Doctor: ${b.doctorNameEn}`, `Type: ${TYPE_TXT[b.type].en}${b.kind === "followup" ? " (follow-up)" : ""}`, `When: ${b.date} ${b.time}`, `Fee: ${formatTaka(b.feePoisha, "en")}`, `bKash TrxID: ${b.trxId ?? "—"}`];
  if (b.patientNote) lines.push(bn ? `রোগীর নোট: ${b.patientNote}` : `Patient note: ${b.patientNote}`);
  return lines.join("\n");
}

export function receiptText(b: Booking, lang: "bn" | "en" = "bn"): string {
  const bn = lang === "bn";
  const status = { unpaid: ["পেমেন্ট বাকি", "Not paid"], pending: ["যাচাইয়ের অপেক্ষায়", "Pending verification"], verified: ["যাচাই হয়েছে", "Verified"], failed: ["যাচাই ব্যর্থ", "Failed"], refunded: ["টাকা ফেরত", "Refunded"] }[b.status];
  return [
    bn ? "কর্মপথ পরামর্শ রসিদ" : "KormoPath consultation receipt",
    b.demo ? (bn ? "ডেমো — কোনো টাকা নেওয়া হয়নি" : "DEMO — no money was taken") : "",
    bookingMessage(b, lang),
    `${bn ? "অবস্থা" : "Status"}: ${bn ? status[0] : status[1]}`,
    ...b.history.map((h) => `${h.at.slice(0, 16).replace("T", " ")} · ${h.status} · ${h.note}`),
  ].filter(Boolean).join("\n");
}

const STATUSES = new Set<PaymentStatus>(["unpaid", "pending", "verified", "failed", "refunded"]);

export function sanitizeBookings(raw: unknown): Booking[] | null {
  if (!Array.isArray(raw)) return null;
  const out: Booking[] = [];
  const s = (v: unknown, n: number) => (typeof v === "string" ? v.slice(0, n) : "");
  for (const r of raw) {
    if (!r || typeof r !== "object") continue;
    const o = r as Record<string, unknown>;
    if (!s(o.id, 40) || !/^\d{4}-\d{2}-\d{2}$/.test(s(o.date, 10)) || !/^\d{2}:\d{2}$/.test(s(o.time, 5))) continue;
    const type = (["audio", "video", "inperson"] as const).find((t) => t === o.type);
    const status = STATUSES.has(o.status as PaymentStatus) ? (o.status as PaymentStatus) : null;
    if (!type || !status || typeof o.feePoisha !== "number" || !Number.isInteger(o.feePoisha) || o.feePoisha < 0) continue;
    out.push({
      id: s(o.id, 40), ref: s(o.ref, 20), doctorId: s(o.doctorId, 60), doctorNameEn: s(o.doctorNameEn, 80), doctorNameBn: s(o.doctorNameBn, 80),
      demo: o.demo !== false, type, kind: o.kind === "followup" ? "followup" : "new", parentId: s(o.parentId, 40) || null,
      date: s(o.date, 10), time: s(o.time, 5), feePoisha: o.feePoisha, trxId: s(o.trxId, 14) || null, status,
      history: Array.isArray(o.history) ? o.history.slice(0, 30).filter((h): h is PaymentEvent => !!h && typeof h === "object" && STATUSES.has((h as PaymentEvent).status)).map((h) => ({ at: s(h.at, 30), status: h.status, by: h.by === "admin" ? "admin" : "patient", note: s(h.note, 200) })) : [],
      room: s(o.room, 60) || null, patientNote: s(o.patientNote, 300), createdAt: s(o.createdAt, 30),
    });
    if (out.length >= MAX_BOOKINGS) break;
  }
  return out;
}

// --- admin audit log (append-only) -------------------------------------------------------------

export interface AuditEntry { at: string; action: string; target: string; detail: string }
export const appendAudit = (log: readonly AuditEntry[], e: AuditEntry): AuditEntry[] => [...log, { ...e, detail: e.detail.slice(0, 200) }].slice(-500);
