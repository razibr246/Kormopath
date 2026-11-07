import { test } from "node:test";
import assert from "node:assert/strict";
import { analyzeAnswer, countFillers, containsTerm, progressSummary, practiceReviewQueue, QUESTIONS, type SessionRecord } from "../lib/speech.ts";

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

test("Practice review follows the newest attempt, preserves legacy scores, and drops mastered questions", () => {
  const older: SessionRecord = { id: "1", questionId: q.id, date: "2026-11-01T12:00:00Z", total: 55, content: 25, structure: 10, delivery: 20, wordCount: 20, wpm: null, fillerPer100: 0 };
  assert.equal(practiceReviewQueue([older])[0].topics, null);
  const missed = { ...older, id: "2", date: "2026-11-02T12:00:00Z", missedTopicIds: ["verify", "old-id"] };
  assert.deepEqual(practiceReviewQueue([older, missed])[0].topics?.map((topic) => topic.id), ["verify"]);
  const mastered = { ...missed, id: "3", date: "2026-11-03T12:00:00Z", content: 50, missedTopicIds: [] };
  assert.deepEqual(practiceReviewQueue([mastered, older, missed]), []);
});
