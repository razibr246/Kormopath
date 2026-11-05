import { NextResponse } from "next/server";
import { z } from "zod";
import { Tracer } from "@/lib/trace";
import { structured, modelName } from "@/lib/llm";
import { unknownAmounts } from "@/lib/grounding";
import { checkRateLimit, rateLimitResponse } from "@/lib/rateLimit";

export const runtime = "nodejs";
export const maxDuration = 30;

const Body = z.object({
  name: z.string().max(60),
  track: z.string().max(60),
  skills: z.array(z.string().max(40)).max(20),
  clientName: z.string().max(80),
  clientType: z.string().max(80),
  scope: z.string().max(600),
  valueUsd: z.number().min(1).max(1_000_000),
  milestones: z.array(z.number()).max(6),
  passportId: z.string().max(20).nullable(),
});

const SYSTEM = `You are the Outreach agent of KormoPilot. Write a short cold email from a Bangladeshi freelancer to a
prospective direct client they found themselves (not on a marketplace). Plain, confident, specific, under 150 words.
Rules: mention only the skills listed; use only the dollar amounts given; never mention Fiverr, Upwork or fees;
if a passport ID is given, mention the verified skill passport once. Mention working across time zones with
a 48-hour outage buffer written into the contract. Return ONLY JSON {"subject":"...","body":"..."}.`;

function template(b: z.infer<typeof Body>) {
  const skills = b.skills.slice(0, 4).join(", ") || b.track;
  return {
    subject: `${b.scope.split(/[.\n]/)[0].slice(0, 60)}: a fixed-price plan`,
    body: `Hi ${b.clientName || "there"},

I'm ${b.name}, a ${b.track.toLowerCase()} developer in Bangladesh working with ${skills}. I noticed ${b.clientType || "your team"} could use help with: ${b.scope}

I'd deliver it for a fixed $${b.valueUsd}, split into ${b.milestones.length} milestones so you only pay as work is approved.${b.passportId ? ` My skills are independently verified (Skill Passport ${b.passportId}).` : ""}

I work across time zones with daily async updates, and my contract includes a 48-hour buffer for internet or power outages, so you're never left guessing.

Could we do a 15-minute call this week?

${b.name}`,
  };
}

export async function POST(req: Request) {
  const rl = checkRateLimit(req, { limit: 30, windowMs: 60_000, bucket: "pitch" });
  if (!rl.success) return rateLimitResponse(rl.limit, rl.resetSeconds);

  const tracer = new Tracer("Outreach");
  const p = Body.safeParse(await req.json().catch(() => ({})));
  if (!p.success) return NextResponse.json({ error: "Missing pitch details." }, { status: 400 });
  const b = p.data;
  const allowed = [b.valueUsd, ...b.milestones];

  // Guardrails live inside the schema, so violations trigger the model's repair loop.
  const Pitch = z.object({ subject: z.string().min(3).max(120), body: z.string().min(40).max(1500) }).superRefine((v, ctx) => {
    const bad = unknownAmounts(v.subject + " " + v.body, allowed);
    if (bad.length) ctx.addIssue({ code: "custom", path: ["body"], message: `Uses dollar amounts not provided: ${bad.join(", ")}. Allowed: ${allowed.join(", ")}` });
    if (/fiverr|upwork/i.test(v.body)) ctx.addIssue({ code: "custom", path: ["body"], message: "Must not mention marketplaces." });
  });

  const prompt = `FREELANCER: ${b.name}\nTRACK: ${b.track}\nVERIFIED SKILLS: ${b.skills.join(", ")}\nCLIENT: ${b.clientName} (${b.clientType})\nSCOPE: ${b.scope}\nPRICE: $${b.valueUsd}\nMILESTONES: ${b.milestones.map((m) => "$" + m).join(", ")}\nPASSPORT ID: ${b.passportId ?? "none"}`;
  const llm = await structured(tracer, Pitch, SYSTEM, prompt);
  if (llm) {
    tracer.log("amount-guard", `Every dollar figure matches the contract (${allowed.map((a) => "$" + a).join(", ")})`, "ok");
    return NextResponse.json({ engine: llm.model, ...llm.data, raw: llm.raw, trace: tracer.steps });
  }
  tracer.log("template", "Filled the outreach template with your verified details", "fallback");
  return NextResponse.json({ engine: "template", ...template(b), raw: null, trace: tracer.steps });
}
