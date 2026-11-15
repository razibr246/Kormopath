import { NextResponse } from "next/server";
import { z } from "zod";
import { checkRateLimit, rateLimitResponse } from "@/lib/rateLimit";
import { Tracer } from "@/lib/trace";

export const runtime = "nodejs";
export const maxDuration = 30;

const Body = z.object({
  text: z.string().trim().min(1).max(1400).superRefine((text, ctx) => {
    if (!/[\u0980-\u09FF]/.test(text) || /[A-Za-z]/.test(text)) {
      ctx.addIssue({ code: "custom", message: "শুধু বাংলা অক্ষরের লেখা পড়া যাবে।" });
    }
  }),
});
const MODEL = process.env.GEMINI_TTS_MODEL || "gemini-3.1-flash-tts-preview";

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
  if (!parsed.success) return NextResponse.json({ error: "বাংলা কণ্ঠে পড়ার জন্য ১–১৪০০ অক্ষরের লেখা দিন।" }, { status: 400 });
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "বাংলা কণ্ঠ চালাতে সার্ভারে GEMINI_API_KEY যোগ করতে হবে।" }, { status: 503 });

  const tracer = new Tracer("Buddy Voice");
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 25_000);
  const started = performance.now();
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(MODEL)}:generateContent`, {
      method: "POST",
      signal: controller.signal,
      headers: { "content-type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify({
        contents: [{ parts: [{ text: `বাংলাদেশের প্রমিত বাংলায় উষ্ণ, স্বাভাবিক ও স্পষ্ট কণ্ঠে শুধু নিচের বার্তাটি পড়ুন। ইংরেজি ভাষায় পড়বেন না, কোনো কথা যোগ বা বাদ দেবেন না।\n\nবার্তা:\n${parsed.data.text}` }] }],
        generationConfig: {
          responseModalities: ["AUDIO"],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: "Kore" } } },
        },
      }),
    });
    if (!response.ok) {
      tracer.log(MODEL, `Gemini TTS returned HTTP ${response.status}`, "fail", Math.round(performance.now() - started));
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
    tracer.log(MODEL, "Gemini TTS request failed", "fail", Math.round(performance.now() - started));
    return NextResponse.json({ error: "বাংলা কণ্ঠে সংযোগ করা যায়নি। আবার চেষ্টা করুন।", trace: tracer.steps }, { status: 502 });
  } finally {
    clearTimeout(timer);
  }
}
