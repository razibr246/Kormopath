import { NextResponse } from "next/server";
import { z } from "zod";
import { checkRateLimit, rateLimitResponse } from "@/lib/rateLimit";

export const runtime = "nodejs";
export const maxDuration = 45;

const Body = z.object({ query: z.string().trim().min(2).max(160) });
const MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

export async function POST(req: Request) {
  const rl = checkRateLimit(req, { limit: 8, windowMs: 60_000, bucket: "product-search" });
  if (!rl.success) return rateLimitResponse(rl.limit, rl.resetSeconds);

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "পণ্যের নাম ২–১৬০ অক্ষরের মধ্যে লিখুন।" }, { status: 400 });
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "লাইভ পণ্য খোঁজার সুবিধা চালু নেই। সার্ভারে GEMINI_API_KEY যোগ করতে হবে।" }, { status: 503 });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 35_000);
  try {
    const prompt = `Search the web for this product and compare current online offers relevant to Bangladesh: "${parsed.data.query}".
Write a concise answer in Bengali. Include up to 5 distinct purchasable offers only when a current exact price is visible on a source page. For each offer give seller/site, exact listed price in BDT (or say price not shown), key product condition/specification, and one relevant drawback or uncertainty. Sort offers with verified exact BDT prices from low to high; put offers without visible prices last. Do not estimate or convert prices, do not invent sellers, prices, reviews, stock or product details. If evidence is insufficient, say so. Mention whether shipping/fees are excluded when unknown. Search Daraz Bangladesh and other relevant sellers where possible, but do not claim the whole internet was checked. End with a short recommendation to verify seller, warranty, condition and final checkout price. Return plain text, not JSON.`;
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(MODEL)}:generateContent`, {
      method: "POST",
      signal: controller.signal,
      headers: { "content-type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        tools: [{ google_search: {} }],
        generationConfig: { temperature: 0.2, maxOutputTokens: 1400 },
      }),
    });
    if (!response.ok) return NextResponse.json({ error: "এখন পণ্যের ফলাফল আনা যাচ্ছে না। একটু পরে আবার চেষ্টা করুন।" }, { status: 502 });
    const data = await response.json();
    const candidate = data?.candidates?.[0];
    const answer = candidate?.content?.parts?.map((part: { text?: string }) => part.text ?? "").join("").trim();
    if (typeof answer !== "string" || !answer) return NextResponse.json({ error: "খোঁজার ফলাফল পাওয়া যায়নি। অন্যভাবে পণ্যের নাম লিখে চেষ্টা করুন." }, { status: 502 });
    const rawSources: unknown[] = candidate?.groundingMetadata?.groundingChunks ?? [];
    const sources = rawSources.flatMap((chunk) => {
      const web = (chunk as { web?: { uri?: unknown; title?: unknown } })?.web;
      if (typeof web?.uri !== "string" || typeof web.title !== "string") return [];
      try {
        const url = new URL(web.uri);
        if (url.protocol !== "https:" && url.protocol !== "http:") return [];
        return [{ url: url.href, title: web.title.slice(0, 160) }];
      } catch { return []; }
    }).filter((source, index, all) => all.findIndex((other) => other.url === source.url) === index).slice(0, 8);
    return NextResponse.json({ answer, sources, model: MODEL });
  } catch {
    return NextResponse.json({ error: "ইন্টারনেটে খোঁজার সময় সমস্যা হয়েছে। আবার চেষ্টা করুন।" }, { status: 502 });
  } finally {
    clearTimeout(timer);
  }
}
