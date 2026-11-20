import { NextResponse } from "next/server";
import { z } from "zod";
import { checkRateLimitShared, rateLimitResponse } from "@/lib/rateLimit";
import { Tracer } from "@/lib/trace";
import { ttsGet, ttsKey, ttsPut } from "@/lib/ttsCache";
import { prepareBanglaSpeech, banglaShare } from "@/lib/banglaSpeech";
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
  const t0 = performance.now();
  const rl = await checkRateLimitShared(req, { limit: 30, windowMs: 60_000, bucket: "field360-tts" });
  if (!rl.success) return rateLimitResponse(rl.limit, rl.resetSeconds, rl.store);
  const p = Body.safeParse(await req.json().catch(() => null));
  if (!p.success) return NextResponse.json({ error: "text missing or too long" }, { status: 400 });
  if (!geminiAvailable()) return NextResponse.json({ error: "voice not configured" }, { status: 503 });

  const spoken = p.data.lang === "bn"
    ? prepareBanglaSpeech(p.data.text, undefined, { verbalizeNumbers: true })
    : p.data.text;
  if (!spoken || (p.data.lang === "bn" && banglaShare(spoken) < 0.5)) {
    return NextResponse.json({ error: "বাংলা কণ্ঠে পড়ার মতো কোনো টেক্সট পাওয়া যায়নি।" }, { status: 400 });
  }

  const tracer = new Tracer("Field Voice");
  const styleStr = STYLE[p.data.lang];
  const ck = ttsKey(VOICE, styleStr, spoken);
  const hit = ttsGet(ck);
  if (hit) {
    const elapsed = Math.round((performance.now() - t0) * 10) / 10;
    tracer.log("tts-cache", `Line spoken recently; played from memory in ${elapsed}ms`, "ok", 0);
    return NextResponse.json(
      { audio: hit.audio, mime: hit.mimeType || "audio/wav", mimeType: hit.mimeType || "audio/wav", voice: VOICE, model: hit.model || "cache", trace: tracer.steps, latencyMs: elapsed },
      {
        headers: {
          "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
          "X-TTS-Model": hit.model || "cache",
          "X-TTS-Chars": String(spoken.length),
          "X-TTS-Cache-Hit": "1",
          "X-TTS-Latency-Ms": String(elapsed),
        },
      }
    );
  }

  const res = await interact(tracer, {
    input: [{ type: "user_input", content: [{ type: "text", text: spoken, annotations: [{ type: "speech_metadata", style: styleStr }] }] }],
    response_format: { type: "audio" },
    generation_config: { speech_config: [{ voice: VOICE }] },
  }, { models: TTS_MODELS, apiVersion: "v1beta", attemptMs: 4500, timeoutMs: 12000, label: "Field voice" });
  const audio = res ? outputAudio(res.data) : null;
  const elapsed = Math.round((performance.now() - t0) * 10) / 10;
  if (!res || !audio || audio.data.length > 12_000_000) {
    tracer.log("browser-voice", "No audio; the page speaks with the browser's own voice", "fallback");
    return NextResponse.json({ error: "busy, try again in a minute", trace: tracer.steps, latencyMs: elapsed }, { status: 429 });
  }

  ttsPut(ck, spoken, { audio: audio.data, mimeType: audio.mimeType, model: res.model });
  return NextResponse.json(
    { audio: audio.data, mime: audio.mimeType, mimeType: audio.mimeType, voice: VOICE, model: res.model, trace: tracer.steps, latencyMs: elapsed },
    {
      headers: {
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
        "X-TTS-Model": res.model,
        "X-TTS-Chars": String(spoken.length),
        "X-TTS-Cache-Hit": "0",
        "X-TTS-Latency-Ms": String(elapsed),
      },
    }
  );
}
