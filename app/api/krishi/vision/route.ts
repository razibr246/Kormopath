import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { checkRateLimitShared, rateLimitResponse } from "@/lib/rateLimit";
import { Tracer } from "@/lib/trace";
import { structured, llmAvailable } from "@/lib/llm";
import { buildCropVisionSystemPrompt, sanitizeCropAdvice } from "@/lib/cropVision";

export const runtime = "nodejs";
export const maxDuration = 30;

const VisionRequestSchema = z.object({
  imageBase64: z.string().min(50).max(6_000_000),
  mimeType: z.enum(["image/jpeg", "image/png", "image/webp"]),
  cropHint: z.string().max(100).optional(),
});

const DiagnosisSchema = z.object({
  cropIdentified: z.string().min(2).max(100),
  condition: z.enum(["healthy", "pest_infestation", "fungal_or_bacterial", "nutrient_deficiency", "unclear"]),
  symptomsObserved: z.array(z.string().max(150)).max(5),
  possibleCausesBn: z.array(z.string().max(200)).max(4),
  safeRemediesBn: z.array(z.string().max(300)).max(4),
  warningNoticeBn: z.string().max(300),
});

export async function POST(req: NextRequest) {
  // 1. Rate limiting (12 image checks per minute per IP)
  const rl = await checkRateLimitShared(req, {
    limit: 12,
    windowMs: 60_000,
    bucket: "krishi-vision",
  });
  if (!rl.success) {
    return rateLimitResponse(rl.limit, rl.resetSeconds, rl.store);
  }

  // 2. Validate request body
  let rawBody: unknown;
  try {
    rawBody = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON request" }, { status: 400 });
  }

  const parsed = VisionRequestSchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json({ error: "ফসলের পাতার স্পষ্ট ছবি দিন (JPEG/PNG/WebP)।" }, { status: 400 });
  }

  const { imageBase64, mimeType, cropHint } = parsed.data;
  const tracer = new Tracer("MaathSathi Vision");

  if (!llmAvailable()) {
    tracer.log("vision", "No GEMINI_API_KEY configured; providing local agricultural advice", "fallback");
    return NextResponse.json({
      engine: "rule-based-guidance",
      analysis: {
        cropIdentified: cropHint || "চিহ্নিত ফসল",
        condition: "unclear",
        symptomsObserved: ["সার্ভারে এআই ভিশন কি কনফিগার করা নেই"],
        possibleCausesBn: ["ছবির সুনির্দিষ্ট রোগ নির্ণয়ের জন্য কৃষি সম্প্রসারণ অধিদপ্তরের মাঠ কর্মকর্তার সহায়তা নিন"],
        safeRemediesBn: [
          "জমিতে পানি নিষ্কাশন ব্যবস্থা ঠিক রাখুন",
          "আক্রান্ত পাতা তুলে দূরে মাটিতে পুঁতে ফেলুন",
          "জৈব বালাইনাশক ও নিম তেলের স্প্রে ব্যবহার করতে পারেন",
        ],
        warningNoticeBn: "কীটনাশকের সঠিক মাত্রার জন্য কৃষি কল সেন্টার ১৬১২৩-এ কল করুন (সকাল ৭টা - রাত ৯টা)।",
      },
      trace: tracer.steps,
    });
  }

  const prompt = `Inspect this crop/leaf image. ${cropHint ? `Farmer notes crop: ${cropHint}.` : ""}
Identify the crop, any visible disease or pest symptoms, and advise safe agronomic practices without chemical dosages.`;

  const result = await structured(
    tracer,
    DiagnosisSchema,
    buildCropVisionSystemPrompt(),
    prompt,
    {
      mimeType,
      base64: imageBase64,
    },
    { cache: false }
  );

  if (result) {
    // Sanitize remedies to guarantee the no-dose invariant
    const sanitizedRemedies = result.data.safeRemediesBn.map((r) => sanitizeCropAdvice(r).cleanText);
    const sanitizedNotice = sanitizeCropAdvice(result.data.warningNoticeBn).cleanText;

    tracer.log("safety-guard", "Verified agricultural no-dose invariant across remedies", "ok");

    return NextResponse.json({
      engine: result.model,
      analysis: {
        ...result.data,
        safeRemediesBn: sanitizedRemedies,
        warningNoticeBn: sanitizedNotice,
      },
      trace: tracer.steps,
    });
  }

  // Graceful rule-based fallback if model fails
  tracer.log("vision-fallback", "Model did not return structured result; falling back to official helplines", "fallback");
  return NextResponse.json({
    engine: "fallback-advisory",
    analysis: {
      cropIdentified: cropHint || "অজ্ঞাত ফসল",
      condition: "unclear",
      symptomsObserved: ["ছবিটি অস্পষ্ট বা বিশ্লেষণ করা সম্ভব হয়নি"],
      possibleCausesBn: ["ছবির রেজোলিউশন কম অথবা পাতার লক্ষণ পরিষ্কার নয়"],
      safeRemediesBn: [
        "দিনের আলোতে পাতার কাছাকাছি স্পষ্ট ছবি তুলুন",
        "স্থানীয় উপসহকারী কৃষি কর্মকর্তা (SAAO)-কে সরাসরি দেখান",
      ],
      warningNoticeBn: "কৃষি তথ্য সার্ভিসের পরামর্শের জন্য ১৬১২৩ নম্বরে বিনামূল্যে কথা বলুন।",
    },
    trace: tracer.steps,
  });
}
