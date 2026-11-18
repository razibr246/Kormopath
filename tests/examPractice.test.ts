import { test } from "node:test";
import assert from "node:assert/strict";
import {
  EXAM_TRACKS,
  PRACTICE_QUESTIONS,
  QUICK_FLASHCARDS,
  calculateExamScore,
  getQuestionsForTrack,
  sanitizeExamAttempts,
  type PracticeQuestion,
} from "../lib/examPractice.ts";

test("EXAM_TRACKS covers Medical, Engineering, DU Ka/Kha/Ga, and GST with correct negative marking", () => {
  const ids = EXAM_TRACKS.map((t) => t.id);
  assert.ok(ids.includes("medical"));
  assert.ok(ids.includes("engineering"));
  assert.ok(ids.includes("du_ka"));
  assert.ok(ids.includes("du_kha"));
  assert.ok(ids.includes("du_ga"));
  assert.ok(ids.includes("gst"));

  for (const track of EXAM_TRACKS) {
    assert.equal(track.negativeMark, 0.25, "Standard Bangladesh negative marking must be 0.25");
    assert.equal(track.marksPerQuestion, 1.0);
    assert.ok(track.subjects.length > 0);
  }
});

test("PRACTICE_QUESTIONS has complete schema integrity and valid 4-option MCQs", () => {
  assert.ok(PRACTICE_QUESTIONS.length >= 15);

  for (const q of PRACTICE_QUESTIONS) {
    assert.ok(q.id.length > 0);
    assert.ok(q.questionBn.length > 5);
    assert.equal(q.options.length, 4, "Every MCQ must have exactly 4 options");
    assert.ok([0, 1, 2, 3].includes(q.correctIndex), "Correct index must be 0, 1, 2 or 3");
    assert.ok(q.explanationBn.length > 5, "Must provide detailed explanation");
    assert.ok(q.subject.length > 0);
  }
});

test("calculateExamScore accurately computes correct, wrong, and negative marking", () => {
  const track = EXAM_TRACKS.find((t) => t.id === "medical")!;
  const questions: PracticeQuestion[] = [
    {
      id: "q1",
      trackId: "medical",
      subject: "Biology",
      topic: "Cell",
      questionBn: "Q1",
      options: ["A", "B", "C", "D"],
      correctIndex: 1, // B
      explanationBn: "Exp 1",
      difficulty: "easy",
    },
    {
      id: "q2",
      trackId: "medical",
      subject: "Biology",
      topic: "Cell",
      questionBn: "Q2",
      options: ["A", "B", "C", "D"],
      correctIndex: 2, // C
      explanationBn: "Exp 2",
      difficulty: "easy",
    },
    {
      id: "q3",
      trackId: "medical",
      subject: "Chemistry",
      topic: "Organic",
      questionBn: "Q3",
      options: ["A", "B", "C", "D"],
      correctIndex: 0, // A
      explanationBn: "Exp 3",
      difficulty: "easy",
    },
    {
      id: "q4",
      trackId: "medical",
      subject: "Chemistry",
      topic: "Organic",
      questionBn: "Q4",
      options: ["A", "B", "C", "D"],
      correctIndex: 3, // D
      explanationBn: "Exp 4",
      difficulty: "easy",
    },
  ];

  // User answers: q1 correct (1), q2 wrong (0), q3 correct (0), q4 unanswered
  const userAnswers: Record<string, number> = {
    q1: 1, // correct
    q2: 0, // wrong
    q3: 0, // correct
    // q4 unanswered
  };

  const attempt = calculateExamScore(questions, userAnswers, track, 120);

  assert.equal(attempt.totalQuestions, 4);
  assert.equal(attempt.answeredCount, 3);
  assert.equal(attempt.correctCount, 2);
  assert.equal(attempt.wrongCount, 1);
  // Score = 2 * 1.0 - 1 * 0.25 = 1.75 marks
  assert.equal(attempt.score, 1.75);
  // Accuracy = 2 / 3 = 66.7%
  assert.equal(attempt.accuracyPercentage, 66.7);
  assert.equal(attempt.subjectBreakdown["Biology"].correct, 1);
  assert.equal(attempt.subjectBreakdown["Biology"].wrong, 1);
  assert.equal(attempt.subjectBreakdown["Chemistry"].correct, 1);
  assert.equal(attempt.subjectBreakdown["Chemistry"].wrong, 0);
});

test("QUICK_FLASHCARDS contains essential high-yield notes", () => {
  assert.ok(QUICK_FLASHCARDS.length >= 5);
  for (const fc of QUICK_FLASHCARDS) {
    assert.ok(fc.front.length > 5);
    assert.ok(fc.back.length > 5);
    assert.ok(fc.subject.length > 0);
  }
});

test("sanitizeExamAttempts handles corrupt and malformed input gracefully", () => {
  assert.deepEqual(sanitizeExamAttempts(null), []);
  assert.deepEqual(sanitizeExamAttempts("bad string"), []);

  const raw = [
    {
      id: "att-1",
      trackId: "medical",
      score: 18.5,
      totalQuestions: 20,
      answeredCount: 20,
      correctCount: 19,
      wrongCount: 1,
    },
    {
      bad: "object",
    },
  ];

  const sanitized = sanitizeExamAttempts(raw);
  assert.equal(sanitized.length, 1);
  assert.equal(sanitized[0].id, "att-1");
  assert.equal(sanitized[0].score, 18.5);
  assert.equal(sanitized[0].trackId, "medical");
});

test("filterQuestionsBySubject and getAvailableSubjects provide seamless subject filtering", async () => {
  const { filterQuestionsBySubject, getAvailableSubjects } = await import("../lib/examPractice.ts");
  const subjects = getAvailableSubjects();
  assert.ok(subjects.length >= 4);

  const bioQuestions = filterQuestionsBySubject("জীববিজ্ঞান");
  assert.ok(bioQuestions.length >= 4);
  assert.ok(bioQuestions.every((q) => q.subject.includes("জীববিজ্ঞান")));

  const phyQuestions = filterQuestionsBySubject("পদার্থবিজ্ঞান");
  assert.ok(phyQuestions.length >= 4);

  const allQ = filterQuestionsBySubject("all");
  assert.ok(allQ.length >= 35);
});

