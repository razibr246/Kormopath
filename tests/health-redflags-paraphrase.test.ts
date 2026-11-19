/*
 * Red-flag recall and false-alarm rate on real phrasings: Bangla, Banglish, English, typos.
 * A miss can cost a life, so every phrasing in URGENT must raise the flag named.
 * ROUTINE is everyday non-emergency wording; at most 5% of it may raise a flag.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { findRedFlags } from "../lib/health/specialty.ts";

const URGENT: Array<[string, string]> = [
  // chest pain
  ["my dad has crushing chest pain", "chest_pain"],
  ["chest feels tight and heavy", "chest_pain"],
  ["chst pain and sweating", "chest_pain"],
  ["there is pressure on my chest", "chest_pain"],
  ["বুকটা চেপে আসছে", "chest_pain"],
  ["বুকের বাম পাশে ব্যথা", "chest_pain"],
  ["বুক ব্যাথা করতেছে", "chest_pain"],
  ["buke chap lagche", "chest_pain"],
  ["buker betha", "chest_pain"],
  ["ammur buk e batha r gham", "chest_pain"],
  ["I think he is having a heart attack", "chest_pain"],
  // breathing
  ["she is struggling to breathe", "breathing"],
  ["cant breath", "breathing"],
  ["he is gasping for air", "breathing"],
  ["his lips are turning blue", "breathing"],
  ["শ্বাস নিতে পারছি না", "breathing"],
  ["দম বন্ধ হয়ে আসছে", "breathing"],
  ["শাস নিতে কস্ট হচ্ছে", "breathing"],
  ["nishash nite parche na", "breathing"],
  ["shash nite kosto hocche", "breathing"],
  ["dom atke ashche", "breathing"],
  // unconscious
  ["grandma fainted and won't wake up", "unconscious"],
  ["he passed out and is not responding", "unconscious"],
  ["বাবা বেহুঁশ হয়ে পড়ে আছে", "unconscious"],
  ["মা হঠাৎ অচেতন", "unconscious"],
  ["nana ogyan hoye gese", "unconscious"],
  ["dadi jaagche na, shara dicche na", "unconscious"],
  // stroke
  ["his mouth is crooked and he can't lift his arm", "stroke"],
  ["sudden weakness on one side of the body", "stroke"],
  ["her speech is slurred all of a sudden", "stroke"],
  ["মুখ এক দিকে বেঁকে গেছে", "stroke"],
  ["হঠাৎ এক পাশ অবশ হয়ে গেছে", "stroke"],
  ["mukh beke geche, kotha jorie jacche", "stroke"],
  // bleeding
  ["blood is pouring out of the cut", "bleeding"],
  ["the bleeding won't stop", "bleeding"],
  ["রক্ত বন্ধ হচ্ছে না", "bleeding"],
  ["অনেক রক্ত বের হচ্ছে", "bleeding"],
  ["onek rokto porche", "bleeding"],
  // self harm
  ["I don't want to live anymore", "self_harm"],
  ["i want to end my life", "self_harm"],
  ["thinking of killing myself", "self_harm"],
  ["i cut myself again", "self_harm"],
  ["আমি নিজেকে শেষ করে দেব", "self_harm"],
  ["আর বেঁচে থাকতে চাই না", "self_harm"],
  ["ami more jete chai", "self_harm"],
  ["r bachte ichcha kore na", "self_harm"],
  ["suiside korbo", "self_harm"],
  // poisoning
  ["my child swallowed rat poison", "poisoning"],
  ["she took a whole strip of sleeping pills", "poisoning"],
  ["ছেলে কীটনাশক খেয়ে ফেলেছে", "poisoning"],
  ["ঘুমের ট্যাবলেট অনেকগুলো খেয়েছে", "poisoning"],
  ["bish kheyeche", "poisoning"],
  // seizure
  ["he is having a fit and won't stop shaking", "seizure"],
  ["বাচ্চার খিচুনি হচ্ছে", "seizure"],
  ["khichuni uthche", "seizure"],
  // child danger
  ["newborn is limp and not feeding", "child_fever_danger"],
  ["বাচ্চা খুব জোরে জোরে শ্বাস নিচ্ছে, দ্রুত", "child_fever_danger"],
  ["shishu nisteje hoye geche", "child_fever_danger"],
  // pregnancy
  ["7 months pregnant and bleeding", "pregnancy_bleeding"],
  ["গর্ভবতী, রক্ত যাচ্ছে", "pregnancy_bleeding"],
  ["pregnant obosthay rokto jacche", "pregnancy_bleeding"],
  // injury
  ["fell from the roof and hit his head", "severe_injury"],
  ["মোটরসাইকেল এক্সিডেন্ট, মাথা ফেটে গেছে", "severe_injury"],
  ["bus accident, onek rokto", "severe_injury"],
  // throat swelling
  ["after the injection her throat is swelling up", "swelling_throat"],
  ["গলা ফুলে শ্বাস আটকে আসছে", "swelling_throat"],
  // labour
  ["her water broke", "labour"],
  ["প্রসবের ব্যথা উঠেছে", "labour"],
  // judge re-score round 2 (live miss: crushing chest + sweating got "cardiology")
  ["crushing feeling in my father's chest and he is sweating, which doctor next week?", "chest_pain"],
  ["sudden chest discomfort", "chest_pain"], ["বুক ধড়ফড় করছে আর মাথা ঘুরছে", "chest_pain"],
  ["high fever and neck is stiff", "child_fever_danger"], ["She took 20 of her mother's pills", "poisoning"],
  ["I feel like ending everything tonight", "self_harm"], ["lips are going purple", "breathing"],
  ["worst headache of his life", "stroke"], ["snake bit my son", "severe_injury"],
  ["spilled boiling water on her arm", "severe_injury"], ["চোখে কেমিক্যাল পড়েছে", "severe_injury"],
  ["pregnant and spotting heavily", "pregnancy_bleeding"],
];

const ROUTINE = [
  "knee pain for three weeks", "mild headache in the evening", "itchy rash on my arm", "toothache since yesterday",
  "I have a cold and runny nose", "back pain after lifting a box", "my eyes are red and itchy", "dry cough for a week",
  "how often should I check my blood pressure", "blood test report shows high cholesterol", "I need a skin doctor",
  "stomach upset after eating out", "my child has a mild fever", "acne on my face", "where can I get an eye test",
  "পিঠে হালকা ব্যথা", "চোখ লাল হয়ে আছে", "তিন দিন ধরে কাশি", "দাঁতে ব্যথা", "মাথা হালকা ঘুরছে সকালে",
  "পেটে গ্যাস হচ্ছে", "চুল পড়ে যাচ্ছে", "হাঁটুতে ব্যথা", "রক্তের গ্রুপ জানতে চাই", "ডায়াবেটিস ডাক্তার কোথায় পাব",
  "matha betha korche", "pet e gas", "gola betha r jor", "kashi hocche", "chokhe chulkani",
  // judge re-score round 2: must stay calm
  "I sweat a lot at night", "my neck is a bit sore", "I take 2 tablets for blood pressure", "I take 10 mg once a day",
];

test(`red flags: ${URGENT.length} everyday phrasings all raise the right flag`, () => {
  assert.ok(URGENT.length >= 60);
  const misses: string[] = [];
  for (const [text, id] of URGENT) {
    const ids = findRedFlags(text).map((f) => f.id);
    if (!ids.includes(id as never)) misses.push(`"${text}" -> want ${id}, got [${ids.join(",")}]`);
  }
  assert.deepEqual(misses, []);
});

test(`red flags: at most 5% false alarms on ${ROUTINE.length} routine phrasings`, () => {
  assert.ok(ROUTINE.length >= 30);
  const alarms = ROUTINE.filter((t) => findRedFlags(t).length > 0);
  assert.ok(alarms.length / ROUTINE.length <= 0.05, `false alarms: ${alarms.join(" | ")}`);
});
