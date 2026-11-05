import { z } from "zod";
import { TRACKS, Track } from "./data";
import { normalize, verifyEvidence, numberAppears, Verdict } from "./grounding";

export const Level = z.enum(["beginner", "intermediate", "advanced"]);

export const ExtractionSchema = z.object({
  ocr_text: z.string().default(""),
  name: z.string().nullable().default(null),
  headline: z.string().nullable().default(null),
  years_experience: z.number().min(0).max(40).nullable().default(null),
  skills: z
    .array(
      z.object({
        name: z.string().min(1).max(40),
        level: Level.default("intermediate"),
        // Guardrail inside the schema so a violation triggers the repair retry: an elided quote
        // ("Skills: [...] Node") can stitch unrelated parts of a CV together, and never matches
        // the source verbatim, so the evidence check would reject a true skill.
        evidence: z
          .string()
          .min(2)
          .max(200)
          .refine((e) => !/\.\.\.|…|\[\s*\.+\s*\]/.test(e), {
            message: "evidence must be one contiguous exact quote from the source; do not use '...', '…' or '[...]' — quote a shorter span instead",
          }),
      }),
    )
    .max(30),
  marketplace: z
    .object({
      platform: z.enum(["fiverr", "upwork", "other", "none"]),
      monthly_income_usd: z.number().min(0).max(100000).nullable(),
      evidence: z.string().nullable(),
    })
    .default({ platform: "none", monthly_income_usd: null, evidence: null }),
});
export type Extraction = z.infer<typeof ExtractionSchema>;

export const EXTRACT_SYSTEM = `You are the Auditor agent of KormoPilot, reading a Bangladeshi freelancer's CV or marketplace profile.
Return ONLY a JSON object with keys: ocr_text, name, headline, years_experience, skills, marketplace.
- ocr_text: if an image or PDF is attached, transcribe all readable text verbatim; otherwise "".
- skills: each {name, level: "beginner"|"intermediate"|"advanced", evidence}. evidence MUST be an exact quote
  (max 12 words) copied character-for-character as ONE unbroken span of the source that contains the skill.
  Never shorten a quote with "...", "…" or "[...]"; if the line is long, quote only the few words around the skill
  (e.g. source "Skills: React, Next.js, TypeScript, Node" → evidence for Node: "TypeScript, Node").
  Never invent skills that the source does not show.
- marketplace: {platform: "fiverr"|"upwork"|"other"|"none", monthly_income_usd: number|null, evidence: exact quote|null}.
- Do not guess rates, prices or salaries. Do not add commentary.`;

// ---------- Rule-based extractor (used when no model is available) ----------
const LEXICON = Array.from(new Set(TRACKS.flatMap((t) => [...t.keywords, ...t.premium]))).sort((a, b) => b.length - a.length);

export function ruleExtract(source: string): Extraction {
  const lines = source.split(/\n|(?<=[.;])\s/).map((l) => l.trim()).filter(Boolean);
  const seen = new Set<string>();
  const skills: Extraction["skills"] = [];
  for (const kw of LEXICON) {
    const re = new RegExp(`(^|[^a-z0-9])${kw.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&")}s?([^a-z0-9]|$)`, "i");
    const line = lines.find((l) => re.test(l));
    if (!line) continue;
    const key = normalize(kw).replace(/\.js$/, "");
    if ([...seen].some((k) => k.includes(key))) continue;
    seen.add(key);
    const words = line.split(/\s+/);
    const idx = words.findIndex((w) => re.test(" " + w + " "));
    const quote = words.slice(Math.max(0, idx - 4), idx + 6).join(" ");
    const adv = /(senior|lead|advanced|expert|\d+\+?\s*years)/i.test(line);
    skills.push({ name: kw, level: adv ? "advanced" : "intermediate", evidence: quote || kw });
    if (skills.length >= 20) break;
  }
  const years = source.match(/(\d{1,2})\+?\s*(?:years?|yrs)/i);
  const income = source.match(/\$\s?([0-9][0-9,]*)\s*(?:\/|per)\s*(?:mo|month)/i);
  const platform = /fiverr/i.test(source) ? "fiverr" : /upwork/i.test(source) ? "upwork" : "none";
  const nameLine = lines[0] && lines[0].length < 40 && !/[@:]/.test(lines[0]) ? lines[0] : null;
  return {
    ocr_text: "",
    name: nameLine,
    headline: lines[1]?.slice(0, 80) ?? null,
    years_experience: years ? Number(years[1]) : null,
    skills,
    marketplace: {
      platform,
      monthly_income_usd: income ? Number(income[1].replace(/,/g, "")) : null,
      evidence: income ? income[0] : null,
    },
  };
}

// ---------- Grounding + valuation (deterministic) ----------
export interface CheckedSkill {
  name: string;
  level: z.infer<typeof Level>;
  evidence: string;
  verdict: Verdict;
  score: number;
  origin: "document" | "github";
}

export function groundSkills(ex: Extraction, source: string): CheckedSkill[] {
  const full = `${source}\n${ex.ocr_text}`;
  return ex.skills.map((s) => {
    const v = verifyEvidence(s.evidence, full);
    // the skill name itself should also be visible near the evidence
    const nameOk = normalize(s.evidence).includes(normalize(s.name).split(" ")[0]) || normalize(full).includes(normalize(s.name));
    const verdict: Verdict = v.verdict === "verified" && !nameOk ? "partial" : v.verdict;
    return { ...s, verdict, score: v.score, origin: "document" as const };
  });
}

export function incomeGrounded(ex: Extraction, source: string): boolean {
  const n = ex.marketplace.monthly_income_usd;
  return n !== null && numberAppears(n, `${source}\n${ex.ocr_text}`);
}

function matches(skill: string, kw: string) {
  const s = normalize(skill);
  const k = normalize(kw);
  return s === k || s.split(/[ /]/).includes(k) || (k.length > 3 && s.includes(k));
}

export interface Valuation {
  track: Track;
  ranking: { id: string; name: string; hits: number }[];
  rateUsd: number;
  position: number;
  premiumHave: string[];
  premiumMissing: string[];
  aiRisk: number;
  formula: string;
  actions: string[];
}

export function valuate(skills: CheckedSkill[], years: number | null): Valuation {
  const usable = skills.filter((s) => s.verdict !== "unverified");
  const ranking = TRACKS.map((t) => ({
    id: t.id,
    name: t.name,
    hits: new Set(usable.filter((s) => t.keywords.some((k) => matches(s.name, k))).map((s) => normalize(s.name))).size,
  })).sort((a, b) => b.hits - a.hits || TRACKS.find((t) => t.id === b.id)!.rateUsd[1] - TRACKS.find((t) => t.id === a.id)!.rateUsd[1]);
  const track = TRACKS.find((t) => t.id === ranking[0].id)!;
  const hits = ranking[0].hits;
  const premiumHave = track.premium.filter((p) => usable.some((s) => matches(s.name, p)));
  const premiumMissing = track.premium.filter((p) => !premiumHave.includes(p));
  const lv = usable.length ? usable.reduce((a, s) => a + (s.level === "advanced" ? 0.1 : s.level === "intermediate" ? 0.05 : 0), 0) / usable.length : 0;
  const y = Math.min(years ?? 0, 5);
  const position = Math.min(0.85, 0.05 + 0.03 * Math.min(hits, 5) + 0.08 * y + 0.04 * premiumHave.length + lv / 2);
  const [lo, hi] = track.rateUsd;
  const rateUsd = Math.round(lo + position * (hi - lo));
  const aiRisk = Math.max(10, track.aiRisk - 6 * premiumHave.length);
  const actions = premiumMissing.slice(0, 3).map((p) => `Add ${p} to a public project. Freelancers at the top of this range show it.`);
  if (usable.some((s) => s.verdict === "partial")) actions.push("Some skills are only loosely backed by your CV. Name the project or result where you used each one.");
  return {
    track, ranking, rateUsd, position: Math.round(position * 100) / 100, premiumHave, premiumMissing, aiRisk,
    formula: `position = 0.05 + 0.03×min(${hits},5) matched skills + 0.08×min(${years ?? 0},5) years + 0.04×${premiumHave.length} premium skills + ${(lv / 2).toFixed(3)} level bonus (cap 0.85) → $${lo} + ${position.toFixed(2)}×($${hi}−$${lo})`,
    actions,
  };
}
