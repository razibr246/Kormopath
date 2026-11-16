import { NextResponse } from "next/server";
import { z } from "zod";
import { checkRateLimit, rateLimitResponse } from "@/lib/rateLimit";
import { Tracer } from "@/lib/trace";
import { prepareBanglaSpeech, banglaShare } from "@/lib/banglaSpeech";

export const runtime = "nodejs";
export const maxDuration = 30;

const Body = z.object({
  // Replies may mention product names in English; they are rewritten into Bengali script before speaking.
  text: z.string().trim().min(1).max(4000),
});
// Tried in order; a 404 (model not offered to this key) moves on to the next one.
const MODELS = [...new Set([process.env.GEMINI_TTS_MODEL, "gemini-2.5-flash-preview-tts", "gemini-2.5-pro-preview-tts"].filter((m): m is string => Boolean(m)))];
const VOICE = process.env.GEMINI_TTS_VOICE || "Kore";

function pcmToWav(pcm: Buffer, sampleRate = 24_000): Buffer {
  if (pcm.length < 2 || pcm.length % 2 !== 0) throw new Error("Gemini returned invalid PCM audio");
  const wav = Buffer.alloc(44 + pcm.length);
  wav.write("RIFF", 0);
  wav.writeUInt32LE(36 + pcm.length, 4);
  wav.write("WAVE", 8);
  wav.write("fmt ", 12);
  wav.writeUInt32LE(16, 16);
  wav.writeUInt16LE(1, 20);
  wav.writeUInt16LE(1, 22);
  wav.writeUInt32LE(sampleRate, 24);
  wav.writeUInt32LE(sampleRate * 2, 28);
  wav.writeUInt16LE(2, 32);
  wav.writeUInt16LE(16, 34);
  wav.write("data", 36);
  wav.writeUInt32LE(pcm.length, 40);
  pcm.copy(wav, 44);
  return wav;
}

export async function POST(req: Request) {
  const rl = checkRateLimit(req, { limit: 12, windowMs: 60_000, bucket: "buddy-speech" });
  if (!rl.success) return rateLimitResponse(rl.limit, rl.resetSeconds);

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "বাংলা কণ্ঠে পড়ার জন্য লেখা দিন।" }, { status: 400 });
  const spoken = prepareBanglaSpeech(parsed.data.text);
  if (!spoken || banglaShare(spoken) < 0.6) return NextResponse.json({ error: "শুধু বাংলা লেখা বাংলা কণ্ঠে পড়া হয়।" }, { status: 400 });
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "বাংলা কণ্ঠ চালাতে সার্ভারে GEMINI_API_KEY যোগ করতে হবে।" }, { status: 503 });

  const tracer = new Tracer("Buddy Voice");
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 25_000);
  const started = performance.now();
  try {
    let response: Response | null = null;
    let MODEL = MODELS[0];
    for (const model of MODELS) {
      MODEL = model;
      response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
        method: "POST",
        signal: controller.signal,
        headers: { "content-type": "application/json", "x-goog-api-key": apiKey },
        body: JSON.stringify({
          contents: [{ parts: [{ text: `বাংলাদেশের প্রমিত চলিত বাংলায়, ঢাকার শিক্ষিত বক্তার স্বাভাবিক উচ্চারণে পড়ুন। কণ্ঠ উষ্ণ, শান্ত ও বন্ধুসুলভ; গতি মাঝারি; প্রতিটি দাঁড়ি ও প্রশ্নবোধক চিহ্নে স্বাভাবিক বিরতি দিন। কলকাতার টান বা ইংরেজি উচ্চারণ নয়। কোনো শব্দ যোগ বা বাদ দেবেন না, শুধু নিচের বার্তাটি পড়ুন।\n\nবার্তা:\n${spoken}` }] }],
          generationConfig: {
            responseModalities: ["AUDIO"],
            speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: VOICE } } },
          },
        }),
      });
      if (response.status !== 404) break;
      tracer.log(model, "TTS model not available to this key (HTTP 404); trying the next model", "fail", Math.round(performance.now() - started));
    }
    if (!response || !response.ok) {
      tracer.log(MODEL, `Gemini TTS returned HTTP ${response?.status ?? "none"}${response?.status === 401 || response?.status === 403 ? " (GEMINI_API_KEY rejected)" : ""}`, "fail", Math.round(performance.now() - started));
      return NextResponse.json({ error: "বাংলা কণ্ঠ তৈরি করা যায়নি। একটু পরে আবার চেষ্টা করুন।", trace: tracer.steps }, { status: 502 });
    }

    const data = await response.json();
    const encoded: unknown = data?.candidates?.[0]?.content?.parts?.find((part: { inlineData?: { data?: unknown } }) => typeof part?.inlineData?.data === "string")?.inlineData?.data;
    if (typeof encoded !== "string" || encoded.length > 12_000_000) {
      tracer.log(MODEL, "Gemini returned no bounded audio data", "fail", Math.round(performance.now() - started));
      return NextResponse.json({ error: "বাংলা কণ্ঠের অডিও পাওয়া যায়নি।", trace: tracer.steps }, { status: 502 });
    }

    const wav = pcmToWav(Buffer.from(encoded, "base64"));
    tracer.log(MODEL, `Bangla speech generated (${wav.length} bytes)`, "ok", Math.round(performance.now() - started));
    return NextResponse.json({ audio: wav.toString("base64"), mimeType: "audio/wav", model: MODEL, trace: tracer.steps }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    tracer.log(MODELS[0], "Gemini TTS request failed", "fail", Math.round(performance.now() - started));
    return NextResponse.json({ error: "বাংলা কণ্ঠে সংযোগ করা যায়নি। আবার চেষ্টা করুন।", trace: tracer.steps }, { status: 502 });
  } finally {
    clearTimeout(timer);
  }
}
