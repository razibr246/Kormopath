import { NextResponse } from "next/server";
import { z } from "zod";
import { Tracer } from "@/lib/trace";
import { structured } from "@/lib/llm";
import { checkRateLimitShared, rateLimitResponse } from "@/lib/rateLimit";
import { BODY_AREAS, SPECIALTIES, SPECIALTY_IDS, findTerm, routeSymptoms, specialtyById, type SpecialtyId } from "@/lib/health/specialty";
import { checkAssistOutput } from "@/lib/health/healthGuard";

export const runtime = "nodejs";
export const maxDuration = 30;

// "Which doctor should I see?" for MediScan (components/apps/health/assistant). Health data: never cached, never
// stored. Emergency signs are checked first by fixed rules and answered with 999 straight away, without a model.
// Otherwise the model only picks a kind of doctor from a fixed list and explains why in general words; the guard
// inside the schema rejects any diagnosis, medicine or dose, and the rule-based router answers when there is no key
// or no clean answer.
const AREA_IDS = BODY_AREAS.map((a) => a.id) as [string, ...string[]];

const Body = z.discriminatedUnion("mode", [
  z.object({
    mode: z.literal("route"),
    text: z.string().trim().min(2).max(1500),
    lang: z.enum(["bn", "en"]).default("bn"),
    ageGroup: z.enum(["adult", "child", "older", "pregnant"]).default("adult"),
    ticked: z.array(z.string().max(40)).max(20).default([]),
    areas: z.array(z.enum(AREA_IDS)).max(7).default([]),
  }),
  z.object({ mode: z.literal("term"), term: z.string().trim().min(1).max(80), lang: z.enum(["bn", "en"]).default("bn") }),
]);

const SYSTEM = `You help people in Bangladesh decide which KIND of doctor to see. You are not a doctor.
Rules: never name a disease or condition as what the person has, never say "you have", never suggest any medicine, home remedy dose, tablet, frequency or amount. Pick exactly one specialtyId from this list: ${SPECIALTIES.map((s) => `${s.id} (${s.en})`).join("; ")}.
Children go to paediatrics; pregnancy-related problems to gynaecology; when unsure, medicine.
whyBn / whyEn: one or two plain sentences on why this kind of doctor looks after the problem the person described, in general words.
tellDoctor: 2-4 short points (in the person's language) of facts from their own words they should tell the doctor; add nothing they did not say.
Return ONLY JSON {"specialtyId":"...","whyBn":"...","whyEn":"...","tellDoctor":["..."]}.`;

export async function POST(req: Request) {
  const rl = await checkRateLimitShared(req, { limit: 20, windowMs: 60_000, bucket: "health-assist" });
  if (!rl.success) return rateLimitResponse(rl.limit, rl.resetSeconds);
  const tracer = new Tracer("HealthAssistant");
  const p = Body.safeParse(await req.json().catch(() => ({})));
  if (!p.success) return NextResponse.json({ error: "উপসর্গ লিখুন (২ থেকে ১৫০০ অক্ষর)।" }, { status: 400 });
  const b = p.data;

  if (b.mode === "term") {
    const term = findTerm(b.term);
    tracer.log("glossary", term ? `Matched "${term.id}" in the sourced glossary` : "Not in the sourced glossary", term ? "ok" : "warn");
    return NextResponse.json({ mode: "term", term, engine: "rule-based", raw: null, trace: tracer.steps });
  }

  // 1. Emergency signs first, by fixed rules: answered immediately, no model, no further questions.
  const route = routeSymptoms({ text: b.text, ageGroup: b.ageGroup, ticked: b.ticked, areas: b.areas });
  if (route.emergency) {
    tracer.log("red-flags", `Emergency signs: ${route.redFlags.map((r) => r.id).join(", ")} → 999 now`, "warn");
    return NextResponse.json({ mode: "route", emergency: true, redFlags: route.redFlags.map((r) => r.id), engine: "rule-based", raw: null, trace: tracer.steps });
  }
  tracer.log("router", `Rule-based match: ${route.specialty?.id ?? "none"}${route.matched.length ? ` (${route.matched.slice(0, 6).join(", ")})` : ""}`, "ok");

  // 2. Model answer, checked inside the schema (repair loop on any violation).
  const Answer = z.object({
    specialtyId: z.string().max(30),
    whyBn: z.string().min(5).max(400),
    whyEn: z.string().min(5).max(400),
    tellDoctor: z.array(z.string().min(2).max(200)).min(1).max(4),
  }).superRefine((v, ctx) => {
    for (const pr of checkAssistOutput(v, b.text)) ctx.addIssue({ code: "custom", path: pr.field.split("."), message: pr.message });
  });
  const areas = b.areas.map((a) => BODY_AREAS.find((x) => x.id === a)?.en).filter(Boolean).join(", ");
  const prompt = `LANGUAGE: ${b.lang === "bn" ? "Bangla" : "English"}\nWHO: ${b.ageGroup}\nBODY AREAS TAPPED: ${areas || "none"}\nTHE PERSON WROTE: """${b.text}"""\nRULE-BASED SUGGESTION: ${route.specialty?.id ?? "medicine"}`;
  const llm = await structured(tracer, Answer, SYSTEM, prompt, undefined, { cache: false });
  if (llm && (SPECIALTY_IDS as readonly string[]).includes(llm.data.specialtyId)) {
    tracer.log("health-guard", "No diagnosis, medicine or dose; specialty from the fixed list", "ok");
    const sp = specialtyById(llm.data.specialtyId)!;
    return NextResponse.json({
      mode: "route", emergency: false, specialtyId: sp.id as SpecialtyId, whyBn: llm.data.whyBn, whyEn: llm.data.whyEn, tellDoctor: llm.data.tellDoctor,
      alternatives: route.alternatives.map((a) => a.id).filter((id) => id !== sp.id), engine: llm.model, raw: llm.raw, trace: tracer.steps,
    });
  }

  // 3. Rule-based fallback, visible in the trace.
  tracer.log("rule-based", "Answered from the fixed specialty router (no model key, or no answer passed the checks)", "fallback");
  const sp = route.specialty ?? specialtyById("medicine")!;
  return NextResponse.json({
    mode: "route", emergency: false, specialtyId: sp.id, whyBn: sp.coversBn, whyEn: sp.coversEn, tellDoctor: [],
    alternatives: route.alternatives.map((a) => a.id), engine: "rule-based", raw: null, trace: tracer.steps,
  });
}
