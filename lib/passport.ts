import "server-only";
import { createHmac, timingSafeEqual } from "crypto";
import { z } from "zod";

export const PassportSchema = z.object({
  v: z.literal(1),
  name: z.string().min(1).max(60),
  track: z.string().max(60),
  challenge: z.string().max(80),
  testsPassed: z.number().int().min(0).max(50),
  testsTotal: z.number().int().min(1).max(50),
  edgePassed: z.boolean(),
  perfPassed: z.boolean(),
  vivaScore: z.number().int().min(0).max(20),
  vivaTotal: z.number().int().min(1).max(20),
  assisted: z.boolean(),
  codeSha256: z.string().regex(/^[a-f0-9]{64}$/),
  issuedAt: z.string().datetime(),
});
export type Passport = z.infer<typeof PassportSchema>;
export const SharedPassportSchema = z.object({ v: z.literal(2), track: z.string().max(60).optional(), challenge: z.string().max(80).optional(), testsPassed: z.number().int().min(0).max(50).optional(), testsTotal: z.number().int().min(1).max(50).optional(), edgePassed: z.boolean().optional(), perfPassed: z.boolean().optional(), vivaScore: z.number().int().min(0).max(20).optional(), vivaTotal: z.number().int().min(1).max(20).optional(), issuedAt: z.string().datetime(), expiresAt: z.string().datetime() });
export type SharedPassport = z.infer<typeof SharedPassportSchema>;

const DEV_SECRET = "kormopilot-dev-secret-set-PASSPORT_SECRET-in-production";
export const usingDevSecret = () => !process.env.PASSPORT_SECRET;
export const signingConfigured = () => process.env.NODE_ENV !== "production" || Boolean(process.env.PASSPORT_SECRET && process.env.PASSPORT_SECRET.length >= 32 && process.env.PASSPORT_SECRET !== DEV_SECRET);
const secret = () => {
  if (!signingConfigured()) throw new Error("Passport signing is unavailable. Configure PASSPORT_SECRET with at least 32 random characters.");
  return process.env.PASSPORT_SECRET || DEV_SECRET;
};

const b64u = (s: string) => Buffer.from(s).toString("base64url");
const sign = (body: string) => createHmac("sha256", secret()).update(body).digest("base64url");

export function issue(p: Passport): { token: string; id: string } {
  p = PassportSchema.parse(p);
  if (p.testsPassed > p.testsTotal || p.vivaScore > p.vivaTotal) throw new Error("Scores exceed their totals.");
  const body = b64u(JSON.stringify(p));
  const sig = sign(body);
  return { token: `${body}.${sig}`, id: sig.slice(0, 12).toUpperCase() };
}

export function check(token: string): { valid: boolean; passport?: Passport | SharedPassport; id?: string; reason?: string } {
  if (!signingConfigured()) return { valid: false, reason: "Passport verification is unavailable until a production signing key is configured." };
  if (token.length > 8000 || token.split(".").length !== 2) return { valid: false, reason: "Malformed passport link." };
  const [body, sig] = token.split(".");
  if (!body || !sig) return { valid: false, reason: "Malformed passport link." };
  const expected = sign(body);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return { valid: false, reason: "Signature does not match. This passport was edited after it was issued, or was not issued by KormoPilot." };
  try {
    const raw = JSON.parse(Buffer.from(body, "base64url").toString());
    const p = raw?.v === 2 ? SharedPassportSchema.parse(raw) : PassportSchema.parse(raw);
    if ((p.testsPassed !== undefined && p.testsTotal !== undefined && p.testsPassed > p.testsTotal) || (p.vivaScore !== undefined && p.vivaTotal !== undefined && p.vivaScore > p.vivaTotal)) return { valid: false, reason: "Invalid score totals." };
    if (p.v === 2 && Date.parse(p.expiresAt) <= Date.parse(p.issuedAt)) return { valid: false, reason: "Invalid share expiry." };
    if (p.v === 2 && Date.parse(p.expiresAt) <= Date.now()) return { valid: false, reason: "This selective share link has expired." };
    return { valid: true, passport: p, id: sig.slice(0, 12).toUpperCase() };
  } catch {
    return { valid: false, reason: "Passport contents are unreadable." };
  }
}

export function issueShare(p: Passport, fields: Array<"track" | "challenge" | "tests" | "viva">, expiresInDays: number) {
  if (![1, 7, 30].includes(expiresInDays)) throw new Error("Unsupported share lifetime.");
  const payload: SharedPassport = { v: 2, issuedAt: p.issuedAt, expiresAt: new Date(Date.now() + expiresInDays * 86_400_000).toISOString() };
  if (fields.includes("track")) payload.track = p.track;
  if (fields.includes("challenge")) payload.challenge = p.challenge;
  if (fields.includes("tests")) Object.assign(payload, { testsPassed: p.testsPassed, testsTotal: p.testsTotal, edgePassed: p.edgePassed, perfPassed: p.perfPassed });
  if (fields.includes("viva")) Object.assign(payload, { vivaScore: p.vivaScore, vivaTotal: p.vivaTotal });
  const body = b64u(JSON.stringify(payload)); const sig = sign(body);
  return { token: `${body}.${sig}`, id: sig.slice(0, 12).toUpperCase() };
}
