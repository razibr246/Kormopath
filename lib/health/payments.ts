/*
 * Consultation payments (pure, no imports; tests/health-booking.test.ts).
 *
 * bKash "Send Money" to the project owner's personal number, verified by hand by an admin. This is NOT a merchant
 * gateway: nothing here confirms a payment automatically, and a booking is never marked paid without an admin
 * marking the TrxID verified. The receiver number is shown only for bookings with a real, BMDC-verified doctor
 * (lib/health/doctors.ts isRealBookable); demo bookings never show it.
 */

export const PAYMENT_CONFIG = {
  provider: "bkash",
  receiver: "01927228826",
  kind: "personal-send-money",
  ownerConfirmed: true, // provided by the project owner on 2026-11-18
  ownerConfirmedOn: "2026-11-18",
  merchantApi: false, // switch to the official bKash merchant payment API once an approved merchant account exists
} as const;

export type PaymentStatus = "unpaid" | "pending" | "verified" | "failed" | "refunded";

export const PAYMENT_STATUS_LABEL: Record<PaymentStatus, { bn: string; en: string; tone: string }> = {
  unpaid: { bn: "পেমেন্ট বাকি", en: "Not paid", tone: "slate" },
  pending: { bn: "যাচাইয়ের অপেক্ষায়", en: "Pending verification", tone: "amber" },
  verified: { bn: "যাচাই হয়েছে", en: "Verified", tone: "emerald" },
  failed: { bn: "যাচাই ব্যর্থ", en: "Failed", tone: "red" },
  refunded: { bn: "টাকা ফেরত", en: "Refunded", tone: "sky" },
};

/** Allowed status moves. Only an admin moves pending → verified/failed and verified → refunded. */
const MOVES: Record<PaymentStatus, PaymentStatus[]> = {
  unpaid: ["pending"],
  pending: ["verified", "failed"],
  verified: ["refunded"],
  failed: ["pending"], // the patient may submit a corrected TrxID
  refunded: [],
};
export const canMove = (from: PaymentStatus, to: PaymentStatus): boolean => MOVES[from].includes(to);

const BN = "০১২৩৪৫৬৭৮৯";
const ascii = (s: string) => s.replace(/[০-৯]/g, (d) => String(BN.indexOf(d)));

/** Uppercase, digits to ASCII, spaces and dashes removed. */
export const normalizeTrxId = (raw: string): string => ascii(String(raw ?? "")).toUpperCase().replace(/[\s-]+/g, "");

/**
 * bKash does not publish its TrxID format; the confirmation SMS shows a short code of capital letters and digits.
 * Accepted here: 8–12 letters or digits, at least one letter. A value of only 4–6 digits looks like a PIN or an
 * OTP and is refused with a warning.
 */
export function checkTrxId(raw: string): { ok: true; trxId: string } | { ok: false; reason: "pin_like" | "format" } {
  const v = normalizeTrxId(raw);
  if (/^\d{4,6}$/.test(v)) return { ok: false, reason: "pin_like" };
  if (!/^[A-Z0-9]{8,12}$/.test(v) || !/[A-Z]/.test(v)) return { ok: false, reason: "format" };
  return { ok: true, trxId: v };
}

const groupBn = (n: number): string => {
  // South Asian grouping: 12,34,567
  const s = String(Math.abs(Math.trunc(n)));
  if (s.length <= 3) return s;
  const last3 = s.slice(-3);
  const rest = s.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ",");
  return `${rest},${last3}`;
};

/** ৳ amount from integer poisha, lakh grouping; Bengali digits when bn. */
export function formatTaka(poisha: number, lang: "bn" | "en" = "bn"): string {
  const whole = Math.floor(Math.abs(poisha) / 100);
  const frac = Math.abs(poisha) % 100;
  const txt = `৳${poisha < 0 ? "-" : ""}${groupBn(whole)}${frac ? "." + String(frac).padStart(2, "0") : ""}`;
  return lang === "bn" ? txt.replace(/\d/g, (d) => BN[Number(d)]) : txt;
}
