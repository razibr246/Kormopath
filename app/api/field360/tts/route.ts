import { NextResponse } from "next/server";
import { z } from "zod";
import { checkRateLimitShared, rateLimitResponse } from "@/lib/rateLimit";
import { Tracer } from "@/lib/trace";
import { TTS_MODELS, geminiAvailable, interact, outputAudio } from "@/lib/gemini";

export const runtime = "nodejs";
export const maxDuration = 30;

// The Chakra Agent's voice in the MaathSathi field app (field360/src/voice/speech.js), through the same Gemini TTS
// client as Buddy. 503 without a key and 429 when busy: the page then speaks with the browser's own voice.
const Body = z.object({
  text: z.string().trim().min(1).max(900),
  lang: z.enum(["bn", "en"]).default("bn"),
  speaker: z.string().max(20).optional(),
});
const VOICE = process.env.GEMINI_TTS_VOICE || "Kore";
const STYLE = {
  bn: "Warm, natural adult Bangladeshi woman speaking clear, everyday standard Bangla from Bangladesh; relaxed conversational pace, short pauses at each দাঁড়ি; no Kolkata or English accent.",
  en: "Warm, friendly British English with relaxed, conversational pacing.",
};

export async function POST(req: Request) {
  const rl = await checkRateLimitShared(req, { limit: 30, windowMs: 60_000, bucket: "field360-tts" });
  if (!rl.success) return rateLimitResponse(rl.limit, rl.resetSeconds);
  const p = Body.safeParse(await req.json().catch(() => null));
  if (!p.success) return NextResponse.json({ error: "text missing or too long" }, { status: 400 });
  if (!geminiAvailable()) return NextResponse.json({ error: "voice not configured" }, { status: 503 });
  const tracer = new Tracer("Field Voice");
  const res = await interact(tracer, {
    input: [{ type: "user_input", content: [{ type: "text", text: p.data.text, annotations: [{ type: "speech_metadata", style: STYLE[p.data.lang] }] }] }],
    response_format: { type: "audio" },
    generation_config: { speech_config: [{ voice: VOICE }] },
  }, { models: TTS_MODELS, apiVersion: "v1beta", label: "Field voice" });
  const audio = res ? outputAudio(res.data) : null;
  if (!res || !audio || audio.data.length > 12_000_000) {
    tracer.log("browser-voice", "No audio; the page speaks with the browser's own voice", "fallback");
    return NextResponse.json({ error: "busy, try again in a minute", trace: tracer.steps }, { status: 429 });
  }
  return NextResponse.json({ audio: audio.data, mime: audio.mimeType, voice: VOICE, model: res.model, trace: tracer.steps }, { headers: { "Cache-Control": "no-store" } });
}
