import { test } from "node:test";
import assert from "node:assert/strict";
import { checkAnswer, isCrisis, ALLOWED_HELPLINE_NUMBERS } from "../lib/legal/assistGuard.ts";
import { INQUIRIES, matchInquiry, ruleAnswer } from "../lib/legal/inquiries.ts";
import { interpretSemanticBridge, INDIGENOUS_SCENARIOS } from "../lib/legal/semanticBridge.ts";
import { HELPLINES, LAWS } from "../lib/legal/data.ts";
import { PROBLEM_CATEGORIES } from "../lib/legal/taxonomy.ts";

test("guard: verified helplines and a named law's year pass; other numbers fail", () => {
  assert.deepEqual(checkAnswer("১৬৬৯৯ নম্বরে ফোন করুন।", { crisis: false }), []);
  assert.deepEqual(checkAnswer(`সংশ্লিষ্ট আইন: ${LAWS.dowry_2018.bn}।`, { crisis: false }), []);
  assert.ok(checkAnswer("১৬৪৩০ নম্বরে ফোন করুন", { crisis: false }).some((i) => i.code === "unknown_number"));
  assert.ok(checkAnswer("call 16430 now", { crisis: false }).some((i) => i.code === "unknown_number"));
  assert.ok(checkAnswer("২০১৮ সালের আইনে এটা অপরাধ", { crisis: false }).some((i) => i.code === "unknown_law_year"));
});

test("guard: sections, taka amounts, promises and filed-claims are rejected", () => {
  assert.ok(checkAnswer("দণ্ডবিধির ধারা ৩২৩ অনুযায়ী", { crisis: false }).some((i) => i.code === "section"));
  assert.ok(checkAnswer("Under section 11 you can sue", { crisis: false }).some((i) => i.code === "section"));
  assert.ok(checkAnswer("মাসিক আয় ১৫,০০০ টাকার কম হলে", { crisis: false }).some((i) => i.code === "money"));
  assert.ok(checkAnswer("আপনার মামলা দায়ের হয়ে গেছে", { crisis: false }).some((i) => i.code === "promise"));
  assert.ok(checkAnswer("You will win this case", { crisis: false }).some((i) => i.code === "promise"));
});

test("guard: in a crisis the first sentence must give 999 or 109", () => {
  assert.equal(isCrisis("আমার স্বামী আমাকে প্রতিদিন মারধর করে"), true);
  assert.equal(isCrisis("he is threatening to kill me"), true);
  assert.equal(isCrisis("আমার জমির খতিয়ান ভুল"), false);
  assert.ok(checkAnswer("পারিবারিক আদালতে মামলা করা যায়। ৯৯৯-এ ফোন করুন।", { crisis: true }).some((i) => i.code === "crisis_first"));
  assert.deepEqual(checkAnswer("এখনই ৯৯৯-এ ফোন করুন। পরে ১৬৬৯৯।", { crisis: true }), []);
});

test("every rule-based answer passes the guard and names only verified helplines and laws", () => {
  for (const q of INQUIRIES) {
    for (const lang of ["bn", "en"] as const) {
      const a = ruleAnswer(lang === "bn" ? q.questionBn : q.questionEn, { lang, topic: q.topic });
      assert.deepEqual(checkAnswer(a.answer, { crisis: a.crisis }), [], `${q.id}/${lang}: ${a.answer}`);
      for (const h of a.helplines) assert.ok(HELPLINES.some((x) => x.id === h));
      for (const l of a.laws) assert.ok(l in LAWS);
    }
  }
  const numbersInText = INQUIRIES.flatMap((q) => [...(q.answerBn + q.answerEn).replace(/[০-৯]/g, (d) => String("০১২৩৪৫৬৭৮৯".indexOf(d))).matchAll(/\d{3,}/g)].map((m) => m[0]));
  for (const n of numbersInText) assert.ok(ALLOWED_HELPLINE_NUMBERS.has(n), `unverified number ${n} in inquiries`);
});

test("rule answer: crisis puts 999 first; topics and keywords pick the right inquiry", () => {
  const a = ruleAnswer("শ্বশুরবাড়িতে আমাকে মারধর করে, যৌতুক চায়");
  assert.equal(a.crisis, true);
  assert.match(a.answer.split("।")[0], /৯৯৯|১০৯/);
  assert.equal(matchInquiry("চেক বাউন্স হয়েছে")?.id, "cheque");
  assert.equal(matchInquiry("কীভাবে আবেদন করব")?.id, "aid_apply");
  const general = ruleAnswer("হ্যালো", { lang: "en" });
  assert.equal(general.inquiryId, null);
  assert.match(general.answer, /16699/);
  const byTopic = ruleAnswer("আমার একটা সমস্যা আছে", { topic: "rent" });
  assert.equal(byTopic.categoryId, "rent");
});

test("semantic bridge: Chakma and Marma seed terms map to taxonomy categories, always approximate", () => {
  const ids = new Set(PROBLEM_CATEGORIES.map((c) => c.id));
  for (const s of INDIGENOUS_SCENARIOS) assert.ok(ids.has(s.categoryId), s.id);
  const marma = interpretSemanticBridge("স্বামী খ্রো দিতে চায়, মিয়াং আর ছা নিয়ে বিপদে আছি", "marma");
  assert.equal(marma.matched, true);
  assert.equal(marma.categoryId, "family");
  assert.equal(marma.approximate, true);
  assert.equal(interpretSemanticBridge("আজ আবহাওয়া ভালো", "chakma").matched, false);
  assert.equal(interpretSemanticBridge("", "chakma").matched, false);
});

test("everyday land wording reaches a land answer, not 'tell me more'", async () => {
  const { matchInquiry } = await import("../lib/legal/inquiries.ts");
  const q = matchInquiry("জমির দলিল নিয়ে ভাইয়ের সাথে ঝামেলা");
  assert.ok(q && /জমি|ওয়ারিশ|উত্তরাধিকার/.test(q.questionBn + q.answerBn), q?.questionBn);
});

test("legal crisis is caught in everyday English and Banglish", () => {
  for (const t of ["My husband hits me every night", "he beats her and the kids", "amake mare protidin", "shoshur bari theke mere felbe bolche", "he threatened to kill me", "my brother is going to throw acid"]) {
    assert.ok(isCrisis(t), `should be crisis: ${t}`);
  }
  for (const t of ["land dispute with my brother", "how do I apply for legal aid", "my landlord kept the deposit"]) assert.equal(isCrisis(t), false, t);
});

test("legal guard rejects telling people they are eligible, will win, or need no lawyer", () => {
  for (const a of ["You are eligible for free legal aid.", "You will definitely get custody.", "You do not need a lawyer for this.", "আপনি অবশ্যই পাবেন।"]) {
    assert.ok(checkAnswer(a, { crisis: false }).some((i) => i.code === "promise"), a);
  }
  assert.deepEqual(checkAnswer("You may qualify; the legal aid office decides. Call 16699.", { crisis: false }), []);
});

test("guard round 2: 'you qualify', sure court outcomes, easy wins and 'costs nothing' are promises", async () => {
  const { checkAnswer } = await import("../lib/legal/assistGuard.ts");
  for (const a of ["You qualify for legal aid.", "The court will surely grant custody.", "You should win easily.", "It costs nothing at all."]) {
    assert.ok(checkAnswer(a, { userText: "", crisis: false } as never).some((i) => i.code === "promise"), a);
  }
});
