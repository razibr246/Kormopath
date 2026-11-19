import { test } from "node:test";
import assert from "node:assert/strict";
import { RED_FLAGS, SPECIALTIES, SPECIALTY_IDS, doctorNote, findRedFlags, findTerm, routeSymptoms, specialtyById } from "../lib/health/specialty.ts";
import { checkAssistOutput, unsafeIn } from "../lib/health/healthGuard.ts";
import { HEALTH_SERVICES } from "../lib/health/services.ts";

test("red flags come first: any warning sign means emergency, with no specialty", () => {
  for (const [text, id] of [
    ["বাবার বুকে ব্যথা আর ঘাম হচ্ছে", "chest_pain"],
    ["মায়ের মুখ বেঁকে গেছে, কথা জড়িয়ে যাচ্ছে", "stroke"],
    ["he swallowed pesticide", "poisoning"],
    ["আমি আর বাঁচতে চাই না", "self_harm"],
    ["গর্ভাবস্থায় রক্ত যাচ্ছে", "pregnancy_bleeding"],
  ] as const) {
    const r = routeSymptoms({ text });
    assert.equal(r.emergency, true, text);
    assert.equal(r.specialty, null);
    assert.ok(r.redFlags.some((f) => f.id === id), `${text} -> ${r.redFlags.map((f) => f.id)}`);
  }
  // A ticked sign alone is enough.
  assert.equal(routeSymptoms({ text: "", ticked: ["seizure"] }).emergency, true);
});

test("every red flag has an NHS source, and keyword lists are not empty", () => {
  for (const f of RED_FLAGS) {
    assert.match(f.source.url, /^https:\/\/(111\.)?(www\.)?nhs\.uk\//, f.id);
    assert.ok(f.keywords.length >= 3, f.id);
  }
});

test("routing picks a specialty from the fixed list; children and pregnancy are respected", () => {
  assert.equal(routeSymptoms({ text: "তিন দিন ধরে কাশি" }).specialty?.id, "chest");
  assert.equal(routeSymptoms({ text: "itchy rash on my arm" }).specialty?.id, "dermatology");
  assert.equal(routeSymptoms({ text: "হাঁটুতে ব্যথা" }).specialty?.id, "orthopaedics");
  assert.equal(routeSymptoms({ text: "কাশি", ageGroup: "child" }).specialty?.id, "paediatrics");
  assert.equal(routeSymptoms({ text: "বমি বমি লাগে", ageGroup: "pregnant" }).specialty?.id, "gynaecology");
  assert.equal(routeSymptoms({ text: "something feels off" }).specialty?.id, "medicine");
  assert.equal(routeSymptoms({ text: "ব্যথা", areas: ["skin"] }).specialty?.id, "dermatology");
  for (const s of SPECIALTIES) assert.ok(SPECIALTY_IDS.includes(s.id));
});

test("guard rejects medicines, doses and diagnoses; accepts plain specialty reasons", () => {
  for (const bad of ["Take paracetamol 500 mg", "নাপা খান", "দিনে ৩ বার খাবেন", "You have diabetes", "আপনার ডায়াবেটিস হয়েছে", "1+0+1"]) {
    assert.ok(unsafeIn(bad), bad);
  }
  for (const ok of ["A chest specialist looks after long-lasting coughs.", "ত্বকের সমস্যা চর্মরোগ বিশেষজ্ঞ দেখেন।", "Tell the doctor it started 3 days ago."]) {
    assert.equal(unsafeIn(ok), null, ok);
  }
  const good = { specialtyId: "chest", whyBn: "দীর্ঘদিনের কাশি বক্ষব্যাধি বিশেষজ্ঞ দেখেন।", whyEn: "A chest specialist looks after long-lasting coughs.", tellDoctor: ["কাশি তিন দিন ধরে"] };
  assert.deepEqual(checkAssistOutput(good, "তিন দিন ধরে কাশি"), []);
  assert.ok(checkAssistOutput({ ...good, specialtyId: "oncology" }, "কাশি").length > 0);
  assert.ok(checkAssistOutput({ ...good, whyEn: "You have asthma." }, "কাশি").length > 0);
  assert.ok(checkAssistOutput(good, "কাশির সঙ্গে শ্বাস নিতে পারছে না").some((p) => /emergency/.test(p.message)));
});

test("doctor note holds only what the person wrote, plus the questions to ask", () => {
  const note = doctorNote({ text: "কাশি", since: "৩ দিন", ageGroup: "child", areas: ["chest"], medicinesTaking: "", allergies: "" }, specialtyById("paediatrics")!, "bn");
  assert.match(note, /কাশি/);
  assert.match(note, /৩ দিন/);
  assert.match(note, /বুক/);
  assert.match(note, /লেখা হয়নি/);
  assert.equal(unsafeIn(note), null);
});

test("terms come from the sourced glossary only", () => {
  assert.equal(findTerm("ECG")?.id, "ecg");
  assert.equal(findTerm("এক্স-রে")?.id, "xray");
  assert.equal(findTerm("something unknown"), null);
  assert.equal(findRedFlags("ordinary cough").length, 0);
});

test("services: 999 first, every entry sourced and dated, phones are dialable digits", () => {
  assert.equal(HEALTH_SERVICES[0].phone, "999");
  for (const s of HEALTH_SERVICES) {
    assert.match(s.source.url, /^https:\/\//, s.id);
    assert.match(s.source.checked, /^2026-11-(18|19)$/, s.id);
    if (s.phone) assert.match(s.phone, /^\d{3,6}$/, s.id);
  }
});

test("red flags are caught in everyday wording (Bangla, Banglish, English)", async () => {
  const { findRedFlags } = await import("../lib/health/specialty.ts");
  const urgent: Array<[string, string]> = [
    ["father, 70, chest hurts, left arm heavy, sweating a lot", "chest_pain"],
    ["pain in my chest since morning", "chest_pain"],
    ["বুকে খুব ব্যথা করছে", "chest_pain"],
    ["abbur buk e betha korche", "chest_pain"],
    ["my mother's left arm feels numb and heavy", "chest_pain"],
    ["he can't breathe properly", "breathing"],
    ["শ্বাস নিতে খুব কষ্ট হচ্ছে", "breathing"],
    ["baby breathing very fast", "child_fever_danger"],
    ["he collapsed in the bathroom", "unconscious"],
    ["দাদু অজ্ঞান হয়ে গেছে", "unconscious"],
    ["bleeding a lot from the leg", "bleeding"],
    ["অনেক রক্ত পড়ছে থামছে না", "bleeding"],
    ["I want to die", "self_harm"],
    ["আর বাঁচতে ইচ্ছা করে না", "self_harm"],
    ["her face is drooping on one side", "stroke"],
    ["কথা জড়িয়ে যাচ্ছে", "stroke"],
    ["my son drank kerosene", "poisoning"],
    ["bachcha kerosene kheyeche", "poisoning"],
    ["she is pregnant and bleeding", "pregnancy_bleeding"],
    ["hit by a bus, head bleeding", "severe_injury"],
  ];
  for (const [text, id] of urgent) {
    const ids = findRedFlags(text).map((f) => f.id);
    assert.ok(ids.includes(id as never), `"${text}" should raise ${id}, got [${ids.join(",")}]`);
  }
  const routine = ["knee pain for three weeks", "পিঠে হালকা ব্যথা", "itchy rash on my arm", "চোখ লাল হয়ে আছে", "toothache since yesterday", "mild headache in the evening"];
  for (const text of routine) assert.deepEqual(findRedFlags(text).map((f) => f.id), [], `"${text}" should not be an emergency`);
});

test("health guard catches doses in words, hedged diagnoses and unlisted medicines", async () => {
  const { unsafeIn } = await import("../lib/health/healthGuard.ts");
  for (const bad of ["give half a teaspoon three times daily", "it sounds like dengue", "this could be typhoid", "try montelukast", "domperidone helps", "আধা চামচ দিনে তিনবার", "মনে হচ্ছে ডেঙ্গু"]) {
    assert.ok(unsafeIn(bad), `should block: ${bad}`);
  }
  for (const ok of ["See a medicine specialist and tell them how long the cough has lasted.", "একজন শিশু বিশেষজ্ঞ দেখান।"]) assert.equal(unsafeIn(ok), null, ok);
});

test("999 is sourced to the national portal's emergency-number list, not a third-party page", () => {
  assert.equal(HEALTH_SERVICES[0].source.url, "https://bangladesh.gov.bd");
});

test("guard round 2: guessed conditions and non-drug treatment advice are blocked, routing text passes", () => {
  for (const bad of ["This is most likely a viral fever.", "Your symptoms point to dengue.", "Take ORS and rest.", "Apply Betnovate on the rash.", "An antihistamine may help.", "It is probably gastritis."]) assert.ok(unsafeIn(bad), bad);
  for (const ok of ["A medicine specialist looks after fever and weakness in adults, and is likely the right first step.", "Tell the doctor when the pain started and what makes it worse.", "A cardiologist checks the heart; doctors can arrange tests if needed."]) assert.equal(unsafeIn(ok), null, ok);
});
