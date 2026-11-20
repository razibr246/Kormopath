import { NextResponse } from "next/server";
import { z } from "zod";
import { checkRateLimitShared, rateLimitResponse } from "@/lib/rateLimit";
import { Tracer } from "@/lib/trace";
import { ttsGet, ttsKey, ttsPut } from "@/lib/ttsCache";
import { prepareBanglaSpeech, banglaShare } from "@/lib/banglaSpeech";
import { TTS_MODELS, geminiAvailable, interact, outputAudio } from "@/lib/gemini";

export const runtime = "nodejs";
export const maxDuration = 30;

const Body = z.object({
  // Replies may mention product names in English; they are rewritten into Bengali script before speaking.
  text: z.string().trim().min(1).max(4000),
});
// Prebuilt voice; Gemini 3.8 TTS lists Bangla as supported and detects the language itself.
const VOICE = process.env.GEMINI_TTS_VOICE || "Kore";
const STYLE = "Warm, calm and friendly; standard Bangladeshi Bangla as spoken by an educated Dhaka speaker; natural pace with short pauses at each দাঁড়ি; no Kolkata or English accent.";

export async function POST(req: Request) {
  const rl = await checkRateLimitShared(req, { limit: 40, windowMs: 60_000, bucket: "buddy-speech" });
  if (!rl.success) return rateLimitResponse(rl.limit, rl.resetSeconds, rl.store);

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "বাংলা কণ্ঠে পড়ার জন্য লেখা দিন।" }, { status: 400 });
  const spoken = prepareBanglaSpeech(parsed.data.text);
  if (!spoken || banglaShare(spoken) < 0.6) return NextResponse.json({ error: "শুধু বাংলা লেখা বাংলা কণ্ঠে পড়া হয়।" }, { status: 400 });
  if (!geminiAvailable()) return NextResponse.json({ error: "বাংলা কণ্ঠ চালাতে সার্ভারে GEMINI_API_KEY যোগ করতে হবে।" }, { status: 503 });

  const tracer = new Tracer("Buddy Voice");
  const ck = ttsKey(VOICE, STYLE, spoken);
  const hit = ttsGet(ck);
  if (hit) {
    tracer.log("tts-cache", "Same line spoken recently; played from memory", "ok", 0);
    return NextResponse.json({ ...hit, trace: tracer.steps }, { headers: { "Cache-Control": "no-store" } });
  }
  const res = await interact(tracer, {
    input: [{ type: "user_input", content: [{ type: "text", text: spoken, annotations: [{ type: "speech_metadata", style: STYLE }] }] }],
    response_format: { type: "audio" },
    generation_config: { speech_config: [{ voice: VOICE }] },
  }, { models: TTS_MODELS, apiVersion: "v1beta", label: "Bangla speech" });
  const audio = res ? outputAudio(res.data) : null;
  if (!res || !audio || audio.data.length > 12_000_000) {
    if (res) tracer.log(res.model, "No bounded audio in the response", "fail");
    return NextResponse.json({ error: "বাংলা কণ্ঠ তৈরি করা যায়নি। একটু পরে আবার চেষ্টা করুন।", trace: tracer.steps }, { status: 502 });
  }
  ttsPut(ck, spoken, { audio: audio.data, mimeType: audio.mimeType, model: res.model });
  return NextResponse.json({ audio: audio.data, mimeType: audio.mimeType, model: res.model, trace: tracer.steps }, { headers: { "Cache-Control": "no-store" } });
}
