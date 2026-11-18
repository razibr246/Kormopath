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
    assert.equal(s.source.checked, "2026-11-18", s.id);
    if (s.phone) assert.match(s.phone, /^\d{3,6}$/, s.id);
  }
});
