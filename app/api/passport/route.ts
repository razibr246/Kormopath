import { NextResponse } from "next/server";
import { Tracer } from "@/lib/trace";
import { PassportSchema, issue, check, usingDevSecret, signingConfigured } from "@/lib/passport";

import { checkRateLimit, rateLimitResponse } from "@/lib/rateLimit";

export const runtime = "nodejs";

export async function POST(req: Request) {
  if (!signingConfigured()) return NextResponse.json({ error: "Passport signing is unavailable until PASSPORT_SECRET is configured with at least 32 random characters." }, { status: 503 });
  const rl = checkRateLimit(req, { limit: 10, bucket: "passport-issue" });
  if (!rl.success) return rateLimitResponse(rl.limit, rl.resetSeconds);
  const tracer = new Tracer("Verifier");
  const p = PassportSchema.safeParse(await req.json().catch(() => ({})));
  if (!p.success) return NextResponse.json({ error: "Passport data failed validation." }, { status: 400 });
  if (p.data.testsPassed > p.data.testsTotal || p.data.vivaScore > p.data.vivaTotal) return NextResponse.json({ error: "Scores exceed their totals." }, { status: 400 });
  if (p.data.testsPassed < p.data.testsTotal) return NextResponse.json({ error: "All tests must pass before a passport is issued." }, { status: 422 });
  const t0 = performance.now();
  const out = issue(p.data);
  tracer.log("hmac-sha256", `Signed passport ${out.id}`, usingDevSecret() ? "warn" : "ok", Math.round(performance.now() - t0));
  if (usingDevSecret()) tracer.log("config", "PASSPORT_SECRET not set: using the public dev key", "warn");
  return NextResponse.json({ ...out, trace: tracer.steps });
}

export async function GET(req: Request) {
  const t = new URL(req.url).searchParams.get("t") || "";
  return NextResponse.json(check(t));
}
