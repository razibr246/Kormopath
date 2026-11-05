import { NextResponse } from "next/server";
import { z } from "zod";
import { Tracer } from "@/lib/trace";
import { structured } from "@/lib/llm";
import { QUESTIONS, analyzeAnswer } from "@/lib/speech";
import { verifyEvidence } from "@/lib/grounding";
import { checkRateLimit, rateLimitResponse } from "@/lib/rateLimit";

export const runtime = "nodejs";
export const maxDuration = 30;

const Body = z.object({ questionId: z.string().max(64), answer: z.string().min(1).max(4000) });

/**
 * AI coach for Probaho. The model names strengths and gaps, but every strength must quote the
 * speaker's own words, and the quote is checked inside the schema so a made-up quote triggers
 * the repair retry. The score shown to the user still comes only from the deterministic
 * analysis in lib/speech.ts; the model never sets a number.
 */
function coachSchema(answer: string) {
  const quoteOk = (q: string) => verifyEvidence(q, answer).verdict !== "unverified";
  return z
    .object({
      strengths: z.array(z.object({ point: z.string().min(3).max(160), quote: z.string().min(2).max(200) })).max(3),
      gaps: z.array(z.object({ tip: z.string().min(3).max(200) })).min(1).max(3),
      stronger_sentence: z.string().min(5).max(320),
    })
    .superRefine((v, ctx) => {
      v.strengths.forEach((s, i) => {
        if (!quoteOk(s.quote)) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["strengths", i, "quote"], message: "quote must be copied exactly from the ANSWER; it was not found there" });
        }
      });
    });
}

const SYSTEM = `You are Probaho Coach, a kind but honest interview and viva coach for Bangladeshi students.
You get a question, the topics an examiner expects, and the student's answer (typed, or speech-to-text that may contain recognition errors).
Return ONLY JSON: {"strengths":[{"point","quote"}],"gaps":[{"tip"}],"stronger_sentence":"..."}.
- strengths: up to 3 things the answer does well. quote MUST be words copied exactly from the ANSWER that show it. If nothing is good, return [].
- gaps: 1 to 3 specific, actionable tips (what to add or change), not generic advice.
- stronger_sentence: one improved sentence the student could say, written in the same language as the question, labelled by meaning only (no preface).
Never judge accent or pronunciation. Never invent facts about the student. Do not give a score.`;

export async function POST(req: Request) {
  const rl = checkRateLimit(req, { limit: 15, windowMs: 60_000, bucket: "probaho-coach" });
  if (!rl.success) return rateLimitResponse(rl.limit, rl.resetSeconds);

  const p = Body.safeParse(await req.json().catch(() => ({})));
  if (!p.success) return NextResponse.json({ error: "Missing answer." }, { status: 400 });
  const q = QUESTIONS.find((x) => x.id === p.data.questionId);
  if (!q) return NextResponse.json({ error: "Unknown question." }, { status: 404 });

  const tracer = new Tracer("Probaho");
  const answer = p.data.answer.trim();
  if (answer.split(/\s+/).length < 8) {
    tracer.log("guard", "Answer under 8 words, not sent to the model", "warn");
    return NextResponse.json({ engine: "guard", strengths: [], gaps: [{ tip: q.lang === "bn" ? "আরও কয়েকটি পূর্ণ বাক্যে উত্তর দিন।" : "Give a fuller answer — at least three or four sentences." }], stronger_sentence: null, trace: tracer.steps });
  }

  const prompt = `QUESTION (${q.lang === "bn" ? "Bangla" : "English"}): ${q.prompt}\nEXPECTED TOPICS:\n${q.topics.map((t) => `- ${t.label}`).join("\n")}\nANSWER:\n"""${answer}"""`;
  const llm = await structured(tracer, coachSchema(answer), SYSTEM, prompt, undefined, { cache: false });

  if (llm) {
    tracer.log("evidence-check", `${llm.data.strengths.length} strengths, each quote found in the answer`, "ok");
    return NextResponse.json({ engine: llm.model, ...llm.data, trace: tracer.steps });
  }

  // Rule-based fallback: the deterministic analysis, phrased as coach notes. Labelled in `engine`.
  const a = analyzeAnswer(answer, q, null);
  tracer.log("rule-coach", `Built from deterministic analysis: ${a.covered.length}/${q.topics.length} topics covered`, "fallback");
  return NextResponse.json({
    engine: "rule-based",
    strengths: a.covered.slice(0, 3).map((t) => ({ point: t.label, quote: t.terms.find((term) => answer.toLowerCase().includes(term.toLowerCase())) ?? t.label })),
    gaps: (a.missing.length ? a.missing.slice(0, 3).map((t) => ({ tip: t.followUp })) : a.tips.slice(0, 2).map((tip) => ({ tip }))).slice(0, 3),
    stronger_sentence: null,
    trace: tracer.steps,
  });
}
