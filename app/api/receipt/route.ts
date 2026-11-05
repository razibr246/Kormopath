import { NextResponse } from "next/server";
import { z } from "zod";
import { Tracer } from "@/lib/trace";
import { structured, llmAvailable, modelName } from "@/lib/llm";
import { numberAppears, verifyEvidence } from "@/lib/grounding";
import { checkRateLimit, rateLimitResponse } from "@/lib/rateLimit";

export const runtime = "nodejs";
export const maxDuration = 60;

const Body = z.object({ mimeType: z.string(), base64: z.string().max(6_000_000) });

const ReceiptSchema = z.object({
  ocr_text: z.string().min(5),
  provider: z.enum(["payoneer", "wise", "bkash", "nagad", "upay", "bank", "fiverr", "upwork", "other"]),
  amount: z.number().positive(),
  currency: z.string().length(3),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
  reference: z.string().max(80).nullable(),
  payer: z.string().max(120).nullable(),
});

const SYSTEM = `You are the Ledger agent of KormoPilot. Read a payment receipt or transaction screenshot.
First transcribe all visible text into ocr_text verbatim. Then fill: provider, amount (number, as printed),
currency (ISO code), date (YYYY-MM-DD or null), reference (transaction ID as printed or null), payer (or null).
Copy values exactly as printed. If something is not visible, use null. Return ONLY JSON.`;

export async function POST(req: Request) {
  const rl = checkRateLimit(req, { limit: 20, windowMs: 60_000, bucket: "receipt" });
  if (!rl.success) return rateLimitResponse(rl.limit, rl.resetSeconds);

  const tracer = new Tracer("Ledger");
  const p = Body.safeParse(await req.json().catch(() => ({})));
  if (!p.success) return NextResponse.json({ error: "Upload a receipt image or PDF." }, { status: 400 });
  if (!llmAvailable()) {
    tracer.log("vision", "Receipt reading needs GEMINI_API_KEY on the server", "fail");
    return NextResponse.json({ error: "Receipt reading isn't configured on this deployment. Add the payment manually below.", trace: tracer.steps }, { status: 422 });
  }
  const llm = await structured(tracer, ReceiptSchema, SYSTEM, "Read this receipt.", p.data);
  if (!llm) return NextResponse.json({ error: "Couldn't read that receipt. Try a sharper screenshot or add it manually.", trace: tracer.steps }, { status: 422 });

  const r = llm.data;
  const t0 = performance.now();
  const amountOk = numberAppears(r.amount, r.ocr_text);
  const refOk = r.reference ? verifyEvidence(r.reference, r.ocr_text).verdict === "verified" : true;
  tracer.log("evidence-check", `Amount ${amountOk ? "found" : "NOT found"} in transcription; reference ${refOk ? "ok" : "not found"}`, amountOk && refOk ? "ok" : "warn", Math.round(performance.now() - t0));
  return NextResponse.json({ engine: llm.model, receipt: r, checks: { amountOk, refOk }, needsReview: !amountOk || !refOk, raw: llm.raw, trace: tracer.steps });
}
