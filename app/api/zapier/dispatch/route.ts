import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { checkRateLimitShared, rateLimitResponse } from "@/lib/rateLimit";
import { validateZapierWebhookUrl, sanitizeZapierPayload } from "@/lib/zapier";

export const runtime = "nodejs";
export const maxDuration = 10;

const DispatchSchema = z.object({
  webhookUrl: z.string().min(1).max(500),
  event: z.string().min(1).max(100),
  app: z.string().min(1).max(50),
  data: z.record(z.unknown()),
});

export async function POST(req: NextRequest) {
  // 1. Rate Limit Check (30 webhook requests per minute per IP)
  const rl = await checkRateLimitShared(req, { limit: 30, windowMs: 60_000, bucket: "zapier" });
  if (!rl.success) {
    return rateLimitResponse(rl.limit, rl.resetSeconds, rl.store);
  }

  // 2. Body Validation
  let rawBody: unknown;
  try {
    rawBody = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = DispatchSchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid webhook payload", details: parsed.error.format() },
      { status: 400 }
    );
  }

  const { webhookUrl, event, app, data } = parsed.data;

  // 3. Validate Zapier Webhook URL
  const urlCheck = validateZapierWebhookUrl(webhookUrl);
  if (!urlCheck.valid) {
    return NextResponse.json({ error: urlCheck.error }, { status: 400 });
  }

  // 4. Sanitize Payload (Enforce zero-PII invariant)
  const cleanData = sanitizeZapierPayload(data);
  const outboundPayload = {
    event,
    app,
    source: "kormopath",
    timestamp: new Date().toISOString(),
    version: "1.0.0",
    data: cleanData,
  };

  // 5. Dispatch to Zapier Catch Hook
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);

    const zapierRes = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "KormoPath-Zapier-Integration/1.0",
      },
      body: JSON.stringify(outboundPayload),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!zapierRes.ok) {
      return NextResponse.json(
        {
          error: `Zapier webhook rejected with status ${zapierRes.status}`,
          status: zapierRes.status,
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Event successfully dispatched to Zapier",
      event,
      app,
      timestamp: outboundPayload.timestamp,
    });
  } catch (err: unknown) {
    const isTimeout = err instanceof Error && err.name === "AbortError";
    return NextResponse.json(
      {
        error: isTimeout ? "Zapier webhook connection timed out" : "Failed to connect to Zapier webhook",
        details: err instanceof Error ? err.message : String(err),
      },
      { status: 504 }
    );
  }
}
