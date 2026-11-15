import { test } from "node:test";
import assert from "node:assert/strict";
import {
  analyzeAnswer, countFillers, containsTerm, progressSummary, QUESTIONS,
  starCheck, createCustomQuestion, evaluateViva,
  type SessionRecord,
} from "../lib/speech.ts";

const q = QUESTIONS.find((x) => x.id === "tech-race")!;

test("Keyword matching respects word boundaries", () => {
  assert.ok(containsTerm("we lock the row", "lock"));
  assert.ok(!containsTerm("the code block runs", "lock"), "'block' must not count as 'lock'");
  assert.ok(containsTerm("SELECT ... FOR UPDATE? select  for update", "select for update"));
  assert.ok(containsTerm("আমি প্রশিক্ষণের কথা বলছি", "প্রশিক্ষণ"));
});

test("'like' is a filler only when used as a pause word", () => {
  assert.equal(countFillers("We used a broker like RabbitMQ.", "en").length, 0);
  const f = countFillers("So, like, we um basically lock it, you know.", "en");
  const byWord = Object.fromEntries(f.map((x) => [x.word, x.count]));
  assert.equal(byWord.like, 1);
  assert.equal(byWord.um, 1);
  assert.equal(byWord.basically, 1);
  assert.equal(byWord["you know"], 1);
  assert.equal(countFillers("মানে আমি আসলে বলতে চাই", "bn").length, 2);
});

test("Model answer covers every topic and scores well; pace is real, not clamped", () => {
  const a = analyzeAnswer(q.modelAnswer, q, 40);
  assert.equal(a.missing.length, 0, `missing: ${a.missing.map((m) => m.id)}`);
  assert.ok(a.hasExample && a.hasConclusion);
  assert.ok(a.score.total >= 85, `total ${a.score.total}`);
  assert.equal(a.wpm, Math.round(a.wordCount / (40 / 60)), "wpm comes straight from words and time");
  const fast = analyzeAnswer(q.modelAnswer, q, 15);
  assert.ok(fast.wpm! > 170, "very fast answers are reported as fast, not capped");
});

test("Typed answers have no pace and no penalty for it", () => {
  const a = analyzeAnswer(q.modelAnswer, q, null);
  assert.equal(a.wpm, null);
  assert.equal(a.paceNote, null);
});

test("Weak answer: missing topics produce a follow-up question and specific tips", () => {
  const a = analyzeAnswer("Um, I would, um, basically use a transaction, um, you know.", q, 20);
  assert.ok(a.covered.some((t) => t.id === "txn"));
  assert.ok(a.missing.some((t) => t.id === "idem"));
  assert.ok(a.followUp && a.followUp.length > 10);
  assert.ok(a.fillerPer100 > 20);
  assert.ok(a.score.total < 40, `total ${a.score.total}`);
  assert.ok(a.tips.some((t) => t.startsWith("Not covered")));
});

test("Score is the transparent sum of its parts", () => {
  const a = analyzeAnswer(q.modelAnswer, q, 40);
  assert.equal(a.score.total, a.score.content + a.score.structure + a.score.delivery);
});

test("Bangla question analysis", () => {
  const bq = QUESTIONS.find((x) => x.id === "bn-current")!;
  const a = analyzeAnswer(bq.modelAnswer, bq, null);
  assert.equal(a.missing.length, 0, `missing: ${a.missing.map((m) => m.id)}`);
  assert.ok(a.hasConclusion);
});

test("Progress summary compares early and recent sessions", () => {
  const rec = (d: string, total: number): SessionRecord => ({ id: d, questionId: "x", date: d, total, content: total / 2, structure: 10, delivery: 15, wordCount: 100, wpm: 130, fillerPer100: 2 });
  const p = progressSummary([rec("2026-11-01T10:00:00Z", 40), rec("2026-11-02T10:00:00Z", 60), rec("2026-11-03T10:00:00Z", 80)]);
  assert.equal(p?.sessions, 3);
  assert.equal(p?.daysPractised, 3);
  assert.equal(progressSummary([]), null);
});

test("Every model answer in the question bank covers all of its own topics", () => {
  for (const question of QUESTIONS) {
    const a = analyzeAnswer(question.modelAnswer, question, null);
    assert.equal(a.missing.length, 0, `${question.id} misses ${a.missing.map((m) => m.id).join(",")}`);
  }
});

test("Expanded Question Bank has at least 16 questions covering all tracks", () => {
  assert.ok(QUESTIONS.length >= 16, `Expected >= 16 questions, got ${QUESTIONS.length}`);
  const technical = QUESTIONS.filter((x) => x.track === "technical");
  const hr = QUESTIONS.filter((x) => x.track === "hr");
  const academic = QUESTIONS.filter((x) => x.track === "academic");
  const bangla = QUESTIONS.filter((x) => x.track === "bangla");

  assert.ok(technical.length >= 5, `Expected >= 5 technical, got ${technical.length}`);
  assert.ok(hr.length >= 4, `Expected >= 4 HR, got ${hr.length}`);
  assert.ok(academic.length >= 3, `Expected >= 3 academic, got ${academic.length}`);
  assert.ok(bangla.length >= 4, `Expected >= 4 bangla, got ${bangla.length}`);

  // Assert all milestone-requested questions exist
  const expectedIds = [
    "tech-rest-graphql",
    "tech-db-index",
    "tech-microservices",
    "bn-bcs-intro",
    "bn-econ-priorities",
    "acad-methodology",
    "acad-reviewer-feedback",
    "hr-setback",
  ];
  for (const id of expectedIds) {
    assert.ok(QUESTIONS.some((x) => x.id === id), `Missing required question: ${id}`);
  }
});

test("Every model answer in the question bank covers all of its own topics and scores >= 80", () => {
  for (const question of QUESTIONS) {
    const a = analyzeAnswer(question.modelAnswer, question, null);
    assert.equal(a.missing.length, 0, `${question.id} misses ${a.missing.map((m) => m.id).join(",")}`);
    assert.ok(a.score.total >= 80, `${question.id} model answer scored only ${a.score.total}`);
  }
});

test("STAR behavioral check on hr-setback detects all 4 components", () => {
  const q = QUESTIONS.find((x) => x.id === "hr-setback")!;
  const star = starCheck(q.modelAnswer);
  assert.ok(star.situation, "Expected situation to be detected");
  assert.ok(star.task, "Expected task to be detected");
  assert.ok(star.action, "Expected action to be detected");
  assert.ok(star.result, "Expected result to be detected");
  assert.equal(star.missing.length, 0);

  // Partial STAR check: omitting result
  const partial = starCheck("In my capstone project, my task was to fix the database. I decided to add PgBouncer.");
  assert.ok(partial.situation && partial.task && partial.action);
  assert.ok(!partial.result);
  assert.ok(partial.missing.includes("result"));
});

test("Custom Question creation and evaluateViva scoring", () => {
  const custom = createCustomQuestion({
    prompt: "How do you implement rate limiting in a Next.js App Router application?",
    track: "technical",
    targetSeconds: 60,
    keywords: ["token bucket", "redis", "headers", "status 429"],
  });

  assert.equal(custom.topics.length, 4);
  assert.equal(custom.targetSeconds, 60);

  const answer = "We use a token bucket algorithm stored in Redis. When limits exceed, we return status 429 with Retry-After headers. For example, in an API route handling 1000 req/min. So, rate limiting protects our upstream.";
  const a = evaluateViva(answer, custom, 45);

  assert.equal(a.missing.length, 0);
  assert.equal(a.score.content, 50);
  assert.equal(a.score.total, a.score.content + a.score.structure + a.score.delivery);
  assert.ok(a.score.total >= 85);
});

test("Custom Question auto-extracts keywords when none provided", () => {
  const auto = createCustomQuestion({
    prompt: "Explain micro-frontends architecture and module federation in enterprise web systems.",
    track: "technical",
  });
  assert.ok(auto.topics.length >= 2);
  const labels = auto.topics.map((t) => t.label.toLowerCase());
  assert.ok(labels.some((l) => l.includes("micro-frontends") || l.includes("federation") || l.includes("enterprise")));
});

test("Inline transcript correction preserves original pace while updating content score", () => {
  const q = QUESTIONS.find((x) => x.id === "tech-rest-graphql")!;
  // Misheard transcript by STT
  const misheard = "rest has multiple routes. we have query complexity. For example, in 2024. So, that is it.";
  const a1 = analyzeAnswer(misheard, q, 60);

  // Corrected transcript after inline edit
  const corrected = "REST exposes multiple endpoints with HTTP verbs. GraphQL uses a single endpoint with a strongly typed schema. It avoids over-fetching. We manage the N+1 problem with DataLoader. For example, in our mobile app. So, choose GraphQL for client flexibility.";
  const a2 = analyzeAnswer(corrected, q, 60);

  assert.ok(a2.score.content > a1.score.content, "Corrected transcript should have higher content score");
  assert.equal(a2.seconds, 60);
  assert.equal(a2.wpm, Math.round(a2.wordCount / (60 / 60)), "Pace calculation must be preserved from the original 60s recording");
});
