import test from "node:test";
import assert from "node:assert/strict";
import {
  IELTS_CUE_CARDS,
  IELTS_SCORING_CRITERIA,
  evaluateEssayStructure,
} from "../lib/ieltsPrep.ts";

test("IELTS_CUE_CARDS contains essential topics with prompts and bullet points", () => {
  assert.ok(IELTS_CUE_CARDS.length >= 5);
  for (const card of IELTS_CUE_CARDS) {
    assert.ok(card.topic.length > 0);
    assert.ok(card.promptEn.length > 0);
    assert.ok(card.bulletPointsEn.length >= 3);
    assert.ok(card.vocabularyTipsEn.length >= 2);
    assert.ok(card.sampleFollowUpsPart3.length >= 2);
  }
});

test("IELTS_SCORING_CRITERIA covers official 4 pillars summing to 100%", () => {
  assert.equal(IELTS_SCORING_CRITERIA.length, 4);
  const totalWeight = IELTS_SCORING_CRITERIA.reduce((acc, curr) => acc + curr.weightPercentage, 0);
  assert.equal(totalWeight, 100);

  const codes = IELTS_SCORING_CRITERIA.map((c) => c.code);
  assert.ok(codes.includes("FC"));
  assert.ok(codes.includes("LR"));
  assert.ok(codes.includes("GRA"));
  assert.ok(codes.includes("PR"));
});

test("evaluateEssayStructure handles empty essay", () => {
  const result = evaluateEssayStructure("");
  assert.equal(result.totalWords, 0);
  assert.equal(result.paragraphCount, 0);
  assert.equal(result.scoreBandEstimate, "N/A");
});

test("evaluateEssayStructure flags essays under 250 words", () => {
  const shortEssay = `Nowadays education is important. Many people go to university.
However, fees are high.
In conclusion, we need good schools.`;
  const result = evaluateEssayStructure(shortEssay);
  assert.ok(result.totalWords < 250);
  assert.ok(result.feedbacksBn.some((f) => f.includes("২৫০ শব্দ আবশ্যক")));
});

test("evaluateEssayStructure rewards 4-paragraph essay with conclusion and adequate words", () => {
  // Generate authentic 260+ words
  const p1 = "In contemporary society, higher education plays an undeniable role in personal growth and national prosperity. While some argue that practical workplace competencies and vocational training hold superior practical value in the modern job market, I believe a comprehensive academic foundation provided by recognized universities remains completely indispensable for long-term societal progress and scientific development.";
  const p2 = "To begin with, universities offer structured research environments, laboratories, peer collaboration, and scholarly guidance that cannot easily be replicated through self-study or online tutorials alone. Students acquire critical analytical thinking, empirical reasoning, and interdisciplinary problem-solving skills through rigorous curricula. Furthermore, professional accreditations in critical fields such as medicine, civil engineering, and international corporate law strictly necessitate accredited university degrees. Without systematic institutional oversight, standards of healthcare and public infrastructure would inevitably deteriorate, posing severe dangers to civilization.";
  const p3 = "On the other hand, vocational education and digital bootcamps have democratized access to lucrative careers in burgeoning sectors such as software development, graphic design, and hospitality management. Many visionary entrepreneurs and tech innovators have established flourishing global enterprises without completing traditional undergraduate programs. This clearly indicates that practical acumen and technical expertise are profoundly respected across multiple industries. Nonetheless, advanced technological breakthroughs in artificial intelligence, biotechnology, and renewable energy demand sustained theoretical understanding, peer review, and high-level academic mentorship that only universities can nurture.";
  const p4 = "In conclusion, while vocational skills and non-traditional apprenticeships undoubtedly hold immense real-world value for immediate employability, formal tertiary degrees remain the quintessential cornerstone of sustainable socio-economic development, scholarly advancement, and civic leadership across modern nations.";

  const fullEssay = [p1, p2, p3, p4].join("\n\n");
  const result = evaluateEssayStructure(fullEssay);

  assert.ok(result.totalWords >= 250, `Expected at least 250 words, got ${result.totalWords}`);
  assert.equal(result.paragraphCount, 4);
  assert.equal(result.hasConclusion, true);
  assert.equal(result.scoreBandEstimate, "6.5 - 7.5");
});
