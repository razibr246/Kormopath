import { NextResponse } from "next/server";
import { z } from "zod";
import { checkRateLimitShared, rateLimitResponse } from "@/lib/rateLimit";
import { Tracer } from "@/lib/trace";
import { TTS_MODELS, geminiAvailable, interact, outputAudio } from "@/lib/gemini";

export const runtime = "nodejs";
export const maxDuration = 30;

// Voice for the legal assistant's call mode (components/apps/legal/VoiceCall.tsx), through the same Gemini TTS client
// as Buddy. 503 without a key and 502 on failure: the page then speaks with the browser's own voice. Nothing is stored.
const Body = z.object({ text: z.string().trim().min(1).max(1200), lang: z.enum(["bn", "en"]).default("bn") });
const VOICE = process.env.GEMINI_TTS_VOICE || "Kore";
const STYLE = {
  bn: "Calm, warm and reassuring; clear everyday standard Bangladeshi Bangla, unhurried, short pauses at each দাঁড়ি; like a kind legal aid helpline officer; no Kolkata or English accent.",
  en: "Calm, warm and reassuring plain English, unhurried, like a kind helpline officer.",
};

export async function POST(req: Request) {
  const rl = await checkRateLimitShared(req, { limit: 20, windowMs: 60_000, bucket: "legal-speak" });
  if (!rl.success) return rateLimitResponse(rl.limit, rl.resetSeconds, rl.store);
  const p = Body.safeParse(await req.json().catch(() => null));
  if (!p.success) return NextResponse.json({ error: "text missing or too long" }, { status: 400 });
  if (!geminiAvailable()) return NextResponse.json({ error: "voice not configured" }, { status: 503 });
  const tracer = new Tracer("Legal Voice");
  const res = await interact(tracer, {
    input: [{ type: "user_input", content: [{ type: "text", text: p.data.text, annotations: [{ type: "speech_metadata", style: STYLE[p.data.lang] }] }] }],
    response_format: { type: "audio" },
    generation_config: { speech_config: [{ voice: VOICE }] },
  }, { models: TTS_MODELS, apiVersion: "v1beta", label: "Legal voice" });
  const audio = res ? outputAudio(res.data) : null;
  if (!res || !audio || audio.data.length > 12_000_000) {
    tracer.log("browser-voice", "No audio; the page speaks with the browser's own voice", "fallback");
    return NextResponse.json({ error: "voice unavailable", trace: tracer.steps }, { status: 502 });
  }
  return NextResponse.json({ audio: audio.data, mimeType: audio.mimeType, model: res.model, trace: tracer.steps }, { headers: { "Cache-Control": "no-store" } });
}
