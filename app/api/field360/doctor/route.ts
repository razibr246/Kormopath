import { NextResponse } from "next/server";
import { z } from "zod";
import { Tracer } from "@/lib/trace";
import { structured } from "@/lib/llm";
import { checkRateLimitShared, rateLimitResponse } from "@/lib/rateLimit";
import { doseIn } from "@/lib/field360Guard";

export const runtime = "nodejs";
export const maxDuration = 30;

// FieldShift360 crop doctor (field360/src/pages/farmer/CropDoctor.jsx). The page only sends a photo after the farmer
// agrees to send it for a cloud check. The photo is not cached or stored. With no key or a failed call this answers
// 503 "not configured" and the page runs its own rule-based offline check, saying so.
const CROPS = ["boro", "tomato", "wheat", "lentil", "mustard", "mungbean", "sesame", "jute", "aus", "aman"] as const;

const Body = z.object({
  image: z.string().min(1000).max(3_000_000).regex(/^[A-Za-z0-9+/=]+$/),
  crop: z.enum(CROPS),
  lang: z.enum(["bn", "en"]).default("bn"),
  context: z.unknown().optional(),
  known: z.array(z.object({ key: z.string().max(40), en: z.string().max(120) })).max(40).default([]),
});

const noDose = (v: string, ctx: z.RefinementCtx, path: (string | number)[]) => {
  const d = doseIn(v);
  if (d) ctx.addIssue({ code: "custom", path, message: `Contains a dose or rate ("${d}"). Never give amounts; say to follow the product label and ask the agriculture officer (Krishi Call Centre 16123).` });
};

const Report = z.object({
  is_crop_photo: z.boolean(),
  crop_seen: z.string().max(200),
  image_quality: z.enum(["good", "poor", "unusable"]),
  retake_tip: z.string().max(400),
  findings: z.array(z.object({
    key: z.string().max(40),
    name_bn: z.string().max(120),
    name_en: z.string().max(120),
    likelihood: z.number().min(0).max(1),
    evidence: z.string().max(500),
  })).max(3),
  urgency: z.enum(["low", "medium", "high"]),
  summary: z.string().max(800),
  actions_now: z.array(z.string().max(300)).max(5),
  treatment_note: z.string().max(600),
  call_officer_if: z.string().max(400),
}).superRefine((r, ctx) => {
  noDose(r.treatment_note, ctx, ["treatment_note"]);
  r.actions_now.forEach((a, i) => noDose(a, ctx, ["actions_now", i]));
  noDose(r.summary, ctx, ["summary"]);
});

const SYSTEM = `You are the crop doctor in MaathSathi (KormoPath), for smallholder farmers in Bangladesh. A farmer sends one photo of their crop.
Give a careful first look, as an experienced Sub-Assistant Agriculture Officer of the Department of Agricultural Extension (DAE) would at the field edge:
- Look at the plant part, the pattern of spots or damage, colour, margins, insects or eggs, wilting.
- Weigh it against the field context (crop, days since planting, recent weather, satellite reading).
- Be honest about uncertainty: keep likelihood under 0.7 unless the signs are distinctive. Nutrient deficiency, herbicide damage, water stress and disease can look alike; say so.
- Non-chemical steps first (remove and bury affected leaves, drainage, spacing, water at the base, traps).
- A chemical only as Bangladesh's institutes (DAE/BARI/BRRI) recommend it, by active-ingredient group, with "follow the product label and ask your agriculture officer or Krishi Call Centre 16123 first". NEVER write any amount, dose, rate or concentration. Never suggest a banned pesticide.
- If the photo is not a crop, or too blurred or dark, say so kindly and explain how to retake it.
- Write everything the farmer reads in the requested language, in plain words.
Return ONLY JSON with keys: is_crop_photo, crop_seen, image_quality (good|poor|unusable), retake_tip, findings[{key,name_bn,name_en,likelihood,evidence}] (max 3; use a key from the known list when it fits, else "other"; "healthy" if nothing is wrong), urgency (low|medium|high), summary, actions_now[], treatment_note, call_officer_if.`;

export async function POST(req: Request) {
  const rl = await checkRateLimitShared(req, { limit: 10, windowMs: 60_000, bucket: "field360-doctor" });
  if (!rl.success) return rateLimitResponse(rl.limit, rl.resetSeconds);
  const tracer = new Tracer("CropDoctor");
  const p = Body.safeParse(await req.json().catch(() => ({})));
  if (!p.success) return NextResponse.json({ error: "image missing, too large, or unknown crop" }, { status: 400 });
  const b = p.data;
  const ctxText = JSON.stringify(b.context ?? {}).slice(0, 4000);
  const prompt = `LANGUAGE: ${b.lang === "bn" ? "Bangla" : "English"}\nCROP THE FARMER NAMED: ${b.crop}\nKNOWN PROBLEMS: ${b.known.map((k) => `${k.key} (${k.en})`).join("; ") || "none"}\nFIELD CONTEXT (JSON): ${ctxText}`;
  tracer.log("consent", "Farmer agreed to send this photo for a cloud check; it is not cached or stored", "ok");
  const llm = await structured(tracer, Report, SYSTEM, prompt, { mimeType: "image/jpeg", base64: b.image }, { cache: false });
  if (!llm) {
    tracer.log("offline-check", "No model answer; the page runs its rule-based offline check instead", "fallback");
    return NextResponse.json({ error: "doctor not configured", engine: "rule-based", raw: null, trace: tracer.steps }, { status: 503 });
  }
  tracer.log("dose-guard", "No dose, rate or amount in the advice", "ok");
  return NextResponse.json({ report: llm.data, sources: [], model: llm.model, engine: llm.model, raw: llm.raw, at: Date.now(), trace: tracer.steps });
}
