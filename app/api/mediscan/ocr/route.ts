import { NextResponse } from "next/server";
import { z } from "zod";
import { Tracer } from "@/lib/trace";
import { structured, llmAvailable, modelName } from "@/lib/llm";
import { checkRateLimit, rateLimitResponse } from "@/lib/rateLimit";

export const runtime = "nodejs";
export const maxDuration = 45;

// Health data is sensitive personal data. This route:
// - refuses to run without an explicit consent flag from the user,
// - accepts only images/PDFs up to ~4 MB,
// - never stores the file or the text (no logging of content, no cache of health data),
// - returns a *transcription draft* the user must check; it never interprets or diagnoses.
const ALLOWED = ["image/jpeg", "image/png", "image/webp", "application/pdf"] as const;
const MAX_BASE64 = 5_600_000; // ≈ 4.2 MB binary

const Body = z.object({
  consent: z.literal(true),
  file: z.object({
    mimeType: z.enum(ALLOWED),
    base64: z.string().min(100).max(MAX_BASE64).regex(/^[A-Za-z0-9+/=\s]+$/),
  }),
});

const Transcription = z.object({
  lines: z.array(z.string().max(200)).max(60),
  legible: z.boolean(),
});

const SYSTEM = `You transcribe Bangladeshi medical prescriptions for the patient, who will check your output.
Copy the text exactly as written, one prescription line per array item, keeping dose codes like 1+0+1, durations
like "x 5 days", and abbreviations like a.c./p.c. Do NOT correct, interpret, translate, add medicines, guess
illegible words, or give medical advice. Write [illegible] for any word you cannot read. Omit patient names,
phone numbers and addresses. If the image is not a prescription or is unreadable, return {"lines":[],"legible":false}.
Return only JSON: {"lines":["..."],"legible":true|false}.`;

export async function POST(req: Request) {
  const rl = checkRateLimit(req, { limit: 10, windowMs: 60_000, bucket: "mediscan-ocr" });
  if (!rl.success) return rateLimitResponse(rl.limit, rl.resetSeconds);

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    const consentMissing = parsed.error.issues.some((i) => i.path[0] === "consent");
    return NextResponse.json(
      {
        error: consentMissing
          ? "ছবি পাঠানোর আগে সম্মতি দিতে হবে।"
          : "শুধু JPG, PNG, WEBP বা PDF ফাইল (সর্বোচ্চ ৪ MB) পাঠানো যাবে।",
      },
      { status: 400 },
    );
  }

  if (!llmAvailable()) {
    return NextResponse.json(
      { error: "এই সার্ভারে ছবি পড়ার সুবিধা চালু নেই। প্রেসক্রিপশনের লেখা টাইপ করে দিন।", engine: "none" },
      { status: 503 },
    );
  }

  const tracer = new Tracer("MediScan");
  const out = await structured(tracer, Transcription, SYSTEM, "Transcribe this prescription.", {
    mimeType: parsed.data.file.mimeType,
    base64: parsed.data.file.base64.replace(/\s/g, ""),
  }, { cache: false });
  if (!out) {
    return NextResponse.json({ error: "ছবিটি পড়া যায়নি। আরও পরিষ্কার ছবি দিন অথবা লেখা টাইপ করুন।", trace: tracer.steps }, { status: 422 });
  }
  const lines = out.data.lines.map((l) => l.trim()).filter(Boolean);
  return NextResponse.json({
    engine: out.model,
    legible: out.data.legible && lines.length > 0,
    text: lines.join("\n"),
    // Trace steps contain only timings and statuses, never the prescription content.
    trace: tracer.steps,
  });
}
