import { NextResponse } from "next/server";
import { z } from "zod";
import { Tracer } from "@/lib/trace";
import { structured, llmAvailable, modelName } from "@/lib/llm";
import { ExtractionSchema, EXTRACT_SYSTEM, ruleExtract, groundSkills, incomeGrounded, valuate, CheckedSkill } from "@/lib/audit";
import { checkRateLimit, rateLimitResponse } from "@/lib/rateLimit";

export const runtime = "nodejs";
export const maxDuration = 60;

const Body = z.object({
  text: z.string().max(20000).default(""),
  file: z.object({ mimeType: z.string(), base64: z.string().max(6_000_000), name: z.string().optional() }).optional(),
  github: z.string().max(100).optional(),
});

async function githubSkills(user: string, tracer: Tracer): Promise<CheckedSkill[]> {
  return tracer.time(
    "github-api",
    async () => {
      try {
        const res = await fetch(`https://api.github.com/users/${encodeURIComponent(user)}/repos?per_page=100&sort=pushed`, {
          headers: { accept: "application/vnd.github+json", "user-agent": "kormopilot-ai" },
          next: { revalidate: 3600 },
        });
        if (!res.ok) return [] as CheckedSkill[];
        const repos: { name: string; language: string | null; fork: boolean; topics?: string[] }[] = await res.json();
        const byLang = new Map<string, string[]>();
        for (const r of repos.filter((r) => !r.fork)) {
          for (const tag of [r.language, ...(r.topics ?? [])].filter(Boolean) as string[]) {
            byLang.set(tag.toLowerCase(), [...(byLang.get(tag.toLowerCase()) ?? []), r.name]);
          }
        }
        return [...byLang.entries()].slice(0, 12).map(([lang, names]) => ({
          name: lang,
          level: names.length >= 3 ? ("advanced" as const) : ("intermediate" as const),
          evidence: `${names.length} public repo${names.length > 1 ? "s" : ""}: ${names.slice(0, 3).join(", ")}`,
          verdict: "verified" as const,
          score: 1,
          origin: "github" as const,
        }));
      } catch {
        return [] as CheckedSkill[];
      }
    },
    (r) => (r.length ? `Read public repos of @${user}: ${r.length} languages/topics found` : `No public repos readable for @${user}`),
    (r) => (r.length ? "ok" : "warn"),
  );
}

export async function POST(req: Request) {
  const rl = checkRateLimit(req, { limit: 30, windowMs: 60_000, bucket: "audit" });
  if (!rl.success) return rateLimitResponse(rl.limit, rl.resetSeconds);

  const tracer = new Tracer("Auditor");
  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Send CV text or a file." }, { status: 400 });
  const { text, file } = parsed.data;
  if (!text.trim() && !file) return NextResponse.json({ error: "Paste your CV or profile text, or upload an image or PDF." }, { status: 400 });

  if (file && !llmAvailable()) {
    tracer.log("vision", "Reading images needs GEMINI_API_KEY on the server", "fail");
    return NextResponse.json({ error: "Reading images and PDFs needs the AI model, which isn't configured on this deployment. Paste the text instead.", trace: tracer.steps }, { status: 422 });
  }

  tracer.log("router", file ? `Document upload (${file.mimeType}) → vision extraction` : `Text input (${text.length} chars) → extraction`);

  // 1. Extraction: model with schema + repair loop, or rule-based fallback
  const llm = await structured(tracer, ExtractionSchema, EXTRACT_SYSTEM, `SOURCE TEXT:\n${text || "(see attached file)"}`, file ? { mimeType: file.mimeType, base64: file.base64 } : undefined);
  const extraction = llm?.data ?? ruleExtract(text);
  if (!llm) tracer.log("rule-extractor", `Keyword lexicon matched ${extraction.skills.length} skills`, "fallback");
  const engine = llm ? llm.model : "rule-based";

  // 2. Evidence check: every skill must be quoted from the source
  const t0 = performance.now();
  let skills = groundSkills(extraction, text);
  const counts = { verified: 0, partial: 0, unverified: 0 };
  skills.forEach((s) => counts[s.verdict]++);
  tracer.log("evidence-check", `${counts.verified} verified, ${counts.partial} partial, ${counts.unverified} rejected (quote not found in source)`, counts.unverified ? "warn" : "ok", Math.round(performance.now() - t0));

  // 3. Tool use: GitHub
  const gh = parsed.data.github || (text + extraction.ocr_text).match(/github\.com\/([A-Za-z0-9-]{1,39})/i)?.[1];
  if (gh) {
    const ghSkills = await githubSkills(gh, tracer);
    const have = new Set(skills.map((s) => s.name.toLowerCase()));
    skills = [...skills, ...ghSkills.filter((s) => !have.has(s.name))];
  }

  const incomeOk = incomeGrounded(extraction, text);
  if (extraction.marketplace.monthly_income_usd !== null) {
    tracer.log("evidence-check", incomeOk ? `Monthly income $${extraction.marketplace.monthly_income_usd} found in source` : "Reported income not found in source, ignored", incomeOk ? "ok" : "warn");
  }

  // 4. Deterministic valuation against the local dataset
  const t1 = performance.now();
  const valuation = valuate(skills, extraction.years_experience);
  tracer.log("benchmark-lookup", `Best match: ${valuation.track.name} ($${valuation.track.rateUsd[0]}–${valuation.track.rateUsd[1]}/hr) → $${valuation.rateUsd}/hr`, "ok", Math.round(performance.now() - t1));

  return NextResponse.json({
    engine,
    extraction: { ...extraction, marketplace: { ...extraction.marketplace, monthly_income_usd: incomeOk ? extraction.marketplace.monthly_income_usd : null } },
    skills,
    valuation,
    raw: llm?.raw ?? null,
    trace: tracer.steps,
  });
}
