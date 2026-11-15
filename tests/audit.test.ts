import { test } from "node:test";
import assert from "node:assert/strict";
import {
  ruleExtract,
  groundSkills,
  incomeGrounded,
  valuate,
  type CheckedSkill,
  type Extraction,
} from "../lib/audit.ts";
import { TRACKS } from "../lib/data.ts";

test("ruleExtract() deterministically extracts profile, experience, skills, and Upwork income", () => {
  const input = `Arif Hossain
Senior Full-Stack Developer | React, Node.js, Next.js, TypeScript
5+ years of experience building web applications.
Core skills: React, TypeScript, Docker, PostgreSQL, Tailwind.
Currently earning $2,500/month on Upwork.`;

  const res = ruleExtract(input);
  assert.equal(res.name, "Arif Hossain");
  assert.ok(res.headline?.includes("Senior Full-Stack Developer"));
  assert.equal(res.years_experience, 5);
  assert.equal(res.marketplace.platform, "upwork");
  assert.equal(res.marketplace.monthly_income_usd, 2500);
  assert.equal(res.marketplace.evidence, "$2,500/month");

  assert.ok(res.skills.some((s) => s.name.toLowerCase() === "react"));
  assert.ok(res.skills.some((s) => s.name.toLowerCase() === "typescript"));
  assert.ok(res.skills.some((s) => s.name.toLowerCase() === "docker"));

  // Line with "Senior" produces advanced level skills
  const reactSkill = res.skills.find((s) => s.name.toLowerCase() === "react");
  assert.equal(reactSkill?.level, "advanced");
});

test('ruleExtract() parses Fiverr platform, "yrs" experience, and "per mo" income', () => {
  const input = `Sumaiya Akter
UI/UX Designer & Prototyping Specialist
3 yrs freelancing on Fiverr.
Making $1,200 per mo designing mobile interfaces.
Expert in Figma, UI/UX, Wireframe, Prototyping.`;

  const res = ruleExtract(input);
  assert.equal(res.name, "Sumaiya Akter");
  assert.equal(res.years_experience, 3);
  assert.equal(res.marketplace.platform, "fiverr");
  assert.equal(res.marketplace.monthly_income_usd, 1200);

  assert.ok(res.skills.some((s) => s.name.toLowerCase() === "figma"));
  assert.ok(res.skills.some((s) => s.name.toLowerCase() === "ui/ux"));
  const figmaSkill = res.skills.find((s) => s.name.toLowerCase() === "figma");
  assert.equal(figmaSkill?.level, "advanced"); // From "Expert"
});

test("ruleExtract() falls back cleanly to nulls with zero hallucination on unformatted input", () => {
  const input = `contact: dev@example.com
Just started learning Python.`;

  const res = ruleExtract(input);
  assert.equal(res.name, null, "Email/colon line should not be treated as a candidate name");
  assert.equal(res.years_experience, null, "Years experience should not be guessed");
  assert.equal(res.marketplace.platform, "none");
  assert.equal(res.marketplace.monthly_income_usd, null);
  assert.equal(res.marketplace.evidence, null);

  assert.ok(res.skills.some((s) => s.name.toLowerCase() === "python"));
  const py = res.skills.find((s) => s.name.toLowerCase() === "python");
  assert.equal(py?.level, "intermediate");
});

test("ruleExtract() deduplicates skills and caps skill list at 20", () => {
  const input = `Freelancer
Developer
React, React.js, Next.js, Next, Node, Express, Django, Python, TypeScript, JavaScript, Postgres, MongoDB,
Docker, SQL, FastAPI, GraphQL, Flutter, Dart, Android, Kotlin, Swift, iOS,
Firebase, Figma, Tailwind, Vue, PHP, Laravel, Shopify, WordPress.`;

  const res = ruleExtract(input);
  assert.ok(res.skills.length <= 20, `Skills length was ${res.skills.length}, expected <= 20`);

  // Check no duplicate react entries (react and react.js normalize to react)
  const reactMatches = res.skills.filter((s) => s.name.toLowerCase().startsWith("react"));
  assert.equal(reactMatches.length, 1);
});

test('groundSkills() assigns "verified" to exact verbatim skill quotes', () => {
  const source = "Built production-ready web APIs with React, Next.js, TypeScript, and PostgreSQL.";
  const ex: Extraction = {
    ocr_text: "",
    name: "Test Developer",
    headline: null,
    years_experience: 3,
    skills: [
      { name: "typescript", level: "intermediate", evidence: "React, Next.js, TypeScript, and PostgreSQL" },
    ],
    marketplace: { platform: "none", monthly_income_usd: null, evidence: null },
  };

  const checked = groundSkills(ex, source);
  assert.equal(checked.length, 1);
  assert.equal(checked[0].verdict, "verified");
  assert.equal(checked[0].score, 1);
  assert.equal(checked[0].origin, "document");
});

test('groundSkills() assigns "partial" when quote has word shifts or skill name is not grounded', () => {
  // Case A: Quote with word shifts (approx 80%+ overlap)
  const sourceA = "Built high-throughput payment webhook handler in Node with Express for bKash checkout.";
  const exA: Extraction = {
    ocr_text: "",
    name: "Test Developer",
    headline: null,
    years_experience: 3,
    skills: [
      { name: "node", level: "intermediate", evidence: "webhook handler in Node and Express for bKash" },
    ],
    marketplace: { platform: "none", monthly_income_usd: null, evidence: null },
  };
  const checkedA = groundSkills(exA, sourceA);
  assert.equal(checkedA[0].verdict, "partial");
  assert.ok(checkedA[0].score >= 0.8);

  // Case B: Evidence verbatim in source, but skill name itself is absent from evidence & source
  const sourceB = "Containerized microservices and automated deployment pipelines.";
  const exB: Extraction = {
    ocr_text: "",
    name: "Test Developer",
    headline: null,
    years_experience: 3,
    skills: [
      { name: "kubernetes", level: "intermediate", evidence: "Containerized microservices and automated deployment pipelines." },
    ],
    marketplace: { platform: "none", monthly_income_usd: null, evidence: null },
  };
  const checkedB = groundSkills(exB, sourceB);
  assert.equal(checkedB[0].verdict, "partial", "Missing skill name in verbatim quote downgrades to partial");
});

test('groundSkills() assigns "unverified" to invented claims not in the source', () => {
  const source = "Created responsive landing pages using HTML and CSS.";
  const ex: Extraction = {
    ocr_text: "",
    name: "Test Developer",
    headline: null,
    years_experience: 3,
    skills: [
      { name: "solidity", level: "advanced", evidence: "Engineered smart contracts on Ethereum with Solidity" },
    ],
    marketplace: { platform: "none", monthly_income_usd: null, evidence: null },
  };

  const checked = groundSkills(ex, source);
  assert.equal(checked[0].verdict, "unverified");
  assert.ok(checked[0].score < 0.8);
});

test("incomeGrounded() validates literal appearance of monthly income figures", () => {
  const source = "Verified earnings certificate: $2,500.00/month across 12 projects.";

  const baseEx: Extraction = {
    ocr_text: "",
    name: "Test",
    headline: null,
    years_experience: 2,
    skills: [],
    marketplace: { platform: "upwork", monthly_income_usd: 2500, evidence: "$2,500.00/month" },
  };

  // Literal match
  assert.equal(incomeGrounded(baseEx, source), true);

  // Invented/inflated income
  const inflatedEx: Extraction = {
    ...baseEx,
    marketplace: { ...baseEx.marketplace, monthly_income_usd: 3500 },
  };
  assert.equal(incomeGrounded(inflatedEx, source), false);

  // Null income
  const nullEx: Extraction = {
    ...baseEx,
    marketplace: { ...baseEx.marketplace, monthly_income_usd: null },
  };
  assert.equal(incomeGrounded(nullEx, source), false);

  // Comma formatting check
  const commaSource = "Earned $10,000 per mo in agency revenue.";
  const commaEx: Extraction = {
    ...baseEx,
    marketplace: { ...baseEx.marketplace, monthly_income_usd: 10000 },
  };
  assert.equal(incomeGrounded(commaEx, commaSource), true);
});

test("valuate() accurately matches domain tracks and ranks by skill hits", () => {
  const fullstackSkills: CheckedSkill[] = [
    { name: "react", level: "intermediate", evidence: "react", verdict: "verified", score: 1, origin: "document" },
    { name: "next.js", level: "intermediate", evidence: "next.js", verdict: "verified", score: 1, origin: "document" },
    { name: "typescript", level: "intermediate", evidence: "typescript", verdict: "verified", score: 1, origin: "document" },
    { name: "node", level: "intermediate", evidence: "node", verdict: "verified", score: 1, origin: "document" },
    { name: "postgresql", level: "intermediate", evidence: "postgresql", verdict: "verified", score: 1, origin: "document" },
  ];

  const val = valuate(fullstackSkills, 3);
  assert.equal(val.track.id, "fullstack");
  assert.equal(val.ranking[0].id, "fullstack");
  assert.equal(val.ranking[0].hits, 5);

  const aiSkills: CheckedSkill[] = [
    { name: "rag", level: "intermediate", evidence: "rag", verdict: "verified", score: 1, origin: "document" },
    { name: "mcp", level: "intermediate", evidence: "mcp", verdict: "verified", score: 1, origin: "document" },
    { name: "langchain", level: "intermediate", evidence: "langchain", verdict: "verified", score: 1, origin: "document" },
    { name: "llm", level: "intermediate", evidence: "llm", verdict: "verified", score: 1, origin: "document" },
    { name: "vector database", level: "intermediate", evidence: "vector database", verdict: "verified", score: 1, origin: "document" },
  ];

  const valAi = valuate(aiSkills, 2);
  assert.equal(valAi.track.id, "ai_automation");
});

test('valuate() filters out "unverified" skills from usable valuation pool', () => {
  const mixedSkills: CheckedSkill[] = [
    { name: "react", level: "intermediate", evidence: "react", verdict: "verified", score: 1, origin: "document" },
    { name: "typescript", level: "intermediate", evidence: "typescript", verdict: "verified", score: 1, origin: "document" },
    { name: "docker", level: "intermediate", evidence: "docker", verdict: "verified", score: 1, origin: "document" },
    { name: "solidity", level: "advanced", evidence: "fake", verdict: "unverified", score: 0.2, origin: "document" },
    { name: "pytorch", level: "advanced", evidence: "fake", verdict: "unverified", score: 0.1, origin: "document" },
  ];

  const val = valuate(mixedSkills, 2);
  const fullstackRank = val.ranking.find((r) => r.id === "fullstack");
  assert.equal(fullstackRank?.hits, 3);

  const onlyVerified: CheckedSkill[] = mixedSkills.slice(0, 3);
  const valVerifiedOnly = valuate(onlyVerified, 2);
  assert.equal(val.rateUsd, valVerifiedOnly.rateUsd);
  assert.equal(val.position, valVerifiedOnly.position);
});

test("valuate() enforces position cap (0.05 min to 0.85 max)", () => {
  // Lower bound test
  const valLow = valuate([], null);
  assert.equal(valLow.position, 0.05);
  const [lo, hi] = valLow.track.rateUsd;
  assert.equal(valLow.rateUsd, Math.round(lo + 0.05 * (hi - lo)));

  // Negative years and non-finite values clamp strictly to 0.05 lower bound
  const valNeg5 = valuate([], -5);
  assert.equal(valNeg5.position, 0.05);

  const valNeg100 = valuate([], -100);
  assert.equal(valNeg100.position, 0.05);
  const [loNeg100, hiNeg100] = valNeg100.track.rateUsd;
  assert.equal(valNeg100.rateUsd, Math.round(loNeg100 + 0.05 * (hiNeg100 - loNeg100)));

  const valNaN = valuate([], NaN);
  assert.equal(valNaN.position, 0.05);
  const [loNaN, hiNaN] = valNaN.track.rateUsd;
  assert.equal(valNaN.rateUsd, Math.round(loNaN + 0.05 * (hiNaN - loNaN)));

  // Upper bound test (10 advanced fullstack skills including all 7 premium skills, 10 years exp)
  const fullstackTrack = TRACKS.find((t) => t.id === "fullstack")!;
  const premiumSkills = fullstackTrack.premium.map((p) => ({
    name: p,
    level: "advanced" as const,
    evidence: p,
    verdict: "verified" as const,
    score: 1,
    origin: "document" as const,
  }));
  const extraSkills = ["react", "node", "express"].map((s) => ({
    name: s,
    level: "advanced" as const,
    evidence: s,
    verdict: "verified" as const,
    score: 1,
    origin: "document" as const,
  }));

  const valHigh = valuate([...premiumSkills, ...extraSkills], 10);
  assert.equal(valHigh.position, 0.85); // Strictly capped at 0.85
  assert.equal(valHigh.rateUsd, Math.round(15 + 0.85 * (50 - 15)));
});

test("valuate() derives hourly rate, reduces AI risk per premium skill, and emits actions", () => {
  const fullstackTrack = TRACKS.find((t) => t.id === "fullstack")!;
  const baseAiRisk = fullstackTrack.aiRisk; // 45

  // 2 premium skills
  const twoPremium: CheckedSkill[] = [
    { name: "typescript", level: "intermediate", evidence: "typescript", verdict: "verified", score: 1, origin: "document" },
    { name: "docker", level: "intermediate", evidence: "docker", verdict: "verified", score: 1, origin: "document" },
  ];
  const val2 = valuate(twoPremium, 2);
  assert.equal(val2.premiumHave.length, 2);
  assert.equal(val2.aiRisk, baseAiRisk - 6 * 2);

  // All 7 premium skills
  const allPremium: CheckedSkill[] = fullstackTrack.premium.map((p) => ({
    name: p,
    level: "intermediate" as const,
    evidence: p,
    verdict: "verified" as const,
    score: 1,
    origin: "document" as const,
  }));
  const valAll = valuate(allPremium, 2);
  assert.equal(valAll.aiRisk, 10, "AI risk should enforce floor of 10");

  // Premium missing action recommendations
  assert.ok(val2.premiumMissing.length > 0);
  assert.ok(
    val2.premiumMissing.slice(0, 3).every((p) => val2.actions.some((a) => a.includes(`Add ${p} to a public project`)))
  );

  // Partial skill warning in actions
  const partialSkill: CheckedSkill[] = [
    { name: "react", level: "intermediate", evidence: "react", verdict: "partial", score: 0.85, origin: "document" },
  ];
  const valPartial = valuate(partialSkill, 1);
  assert.ok(
    valPartial.actions.some((a) =>
      a.includes("Some skills are only loosely backed by your CV. Name the project or result where you used each one.")
    )
  );
});
