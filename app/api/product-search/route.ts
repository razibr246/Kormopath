import { NextResponse } from "next/server";
import { z } from "zod";
import { checkRateLimit, rateLimitResponse } from "@/lib/rateLimit";
import { Tracer } from "@/lib/trace";
import { geminiAvailable, groundedSearch, SEARCH_ERROR_BN } from "@/lib/gemini";

export const runtime = "nodejs";
export const maxDuration = 45;

const Body = z.object({ query: z.string().trim().min(2).max(160) });

export async function POST(req: Request) {
  const rl = checkRateLimit(req, { limit: 8, windowMs: 60_000, bucket: "product-search" });
  if (!rl.success) return rateLimitResponse(rl.limit, rl.resetSeconds);

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "পণ্যের নাম ২–১৬০ অক্ষরের মধ্যে লিখুন।" }, { status: 400 });
  if (!geminiAvailable()) return NextResponse.json({ error: "লাইভ পণ্য খোঁজার সুবিধা চালু নেই। সার্ভারে GEMINI_API_KEY যোগ করতে হবে।" }, { status: 503 });

  {
    const prompt = `Search the web for this product and compare current online offers relevant to Bangladesh: "${parsed.data.query}".
Write a concise answer in Bengali. Include up to 5 distinct purchasable offers only when a current exact price is visible on a source page. For each offer give seller/site, exact listed price in BDT (or say price not shown), key product condition/specification, and one relevant drawback or uncertainty. Sort offers with verified exact BDT prices from low to high; put offers without visible prices last. Do not estimate or convert prices, do not invent sellers, prices, reviews, stock or product details. If evidence is insufficient, say so. Mention whether shipping/fees are excluded when unknown. Search Daraz Bangladesh and other relevant sellers where possible, but do not claim the whole internet was checked. End with a short recommendation to verify seller, warranty, condition and final checkout price. Return plain text, not JSON.`;
    const tracer = new Tracer("Product search");
    const result = await groundedSearch(tracer, prompt);
    if (!result.ok) return NextResponse.json({ error: SEARCH_ERROR_BN[result.reason], trace: tracer.steps }, { status: result.reason === "quota" ? 503 : 502 });
    return NextResponse.json({ answer: result.answer, sources: result.sources, model: result.model, trace: tracer.steps });
  }
}
