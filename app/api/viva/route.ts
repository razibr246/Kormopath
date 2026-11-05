import { NextResponse } from "next/server";
import { z } from "zod";
import { Tracer } from "@/lib/trace";
import { structured, modelName } from "@/lib/llm";
import { CHALLENGES } from "@/lib/challenges";
import { verifyEvidence, normalize } from "@/lib/grounding";
import { checkRateLimit, rateLimitResponse } from "@/lib/rateLimit";

export const runtime = "nodejs";
export const maxDuration = 30;

const Body = z.object({ challengeId: z.string(), questionId: z.string(), answer: z.string().max(3000) });

const GradeSchema = z.object({
  covered: z.array(z.object({ point: z.number().int().min(0), quote: z.string().min(2).max(300) })).max(6),
  feedback: z.string().min(5).max(400),
});

const SYSTEM = `You are the Examiner agent of KormoPilot, grading a student's spoken or typed answer in a technical viva.
You get the question, a numbered rubric and the answer. For each rubric point the answer genuinely covers,
return {point: <rubric index>, quote: <exact words copied from the answer that show it>}.
Do not give credit for vague mentions. Then give one short, kind, specific feedback sentence naming what to add.
Return ONLY JSON: {"covered":[...],"feedback":"..."}`;

export async function POST(req: Request) {
  const rl = checkRateLimit(req, { limit: 30, windowMs: 60_000, bucket: "viva" });
  if (!rl.success) return rateLimitResponse(rl.limit, rl.resetSeconds);

  const tracer = new Tracer("Examiner");
  const p = Body.safeParse(await req.json().catch(() => ({})));
  if (!p.success) return NextResponse.json({ error: "Missing answer." }, { status: 400 });
  const ch = CHALLENGES.find((c) => c.id === p.data.challengeId);
  const q = ch?.viva.find((v) => v.id === p.data.questionId);
  if (!ch || !q) return NextResponse.json({ error: "Unknown question." }, { status: 404 });
  const answer = p.data.answer.trim();
  const total = q.rubric.length;

  if (answer.split(/\s+/).length < 6) {
    tracer.log("guard", "Answer under 6 words, not sent to the model", "warn");
    return NextResponse.json({ engine: "guard", covered: [], score: 0, total, feedback: "Give a fuller answer: explain what went wrong and how your fix handles it.", trace: tracer.steps });
  }

  const prompt = `QUESTION: ${q.question}\nRUBRIC:\n${q.rubric.map((r, i) => `${i}. ${r.point}`).join("\n")}\nANSWER:\n"""${answer}"""`;
  const llm = await structured(tracer, GradeSchema, SYSTEM, prompt);

  let covered: { point: number; quote: string; verified: boolean }[] = [];
  let feedback = "";
  let engine = "keyword-rubric";
  if (llm) {
    engine = llm.model;
    const t0 = performance.now();
    const seen = new Set<number>();
    covered = llm.data.covered
      .filter((c) => c.point < total && !seen.has(c.point) && seen.add(c.point))
      .map((c) => ({ ...c, verified: verifyEvidence(c.quote, answer).verdict !== "unverified" }));
    const rejected = covered.filter((c) => !c.verified).length;
    tracer.log("evidence-check", `${covered.length - rejected} rubric points backed by quotes from the answer${rejected ? `, ${rejected} rejected` : ""}`, rejected ? "warn" : "ok", Math.round(performance.now() - t0));
    covered = covered.filter((c) => c.verified);
    feedback = llm.data.feedback;
  } else {
    const a = normalize(answer);
    covered = q.rubric
      .map((r, i) => {
        const kw = r.keywords.find((k) => a.includes(normalize(k) || k));
        return kw ? { point: i, quote: kw, verified: true } : null;
      })
      .filter(Boolean) as typeof covered;
    const missing = q.rubric.filter((_, i) => !covered.some((c) => c.point === i));
    feedback = missing.length ? `Also cover: ${missing[0].point.toLowerCase()}.` : "Clear and complete.";
    tracer.log("keyword-grader", `Matched ${covered.length}/${total} rubric points by keyword`, "fallback");
  }

  // Score is computed by code from verified coverage, never chosen by the model.
  const score = Math.round((covered.length / total) * 10);
  tracer.log("scorer", `score = round(10 × ${covered.length}/${total}) = ${score}`, "ok");
  return NextResponse.json({ engine, covered, score, total, feedback, raw: llm?.raw ?? null, trace: tracer.steps });
}
