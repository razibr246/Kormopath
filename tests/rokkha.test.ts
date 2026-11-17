import test from "node:test";
import assert from "node:assert/strict";
import { checkMessage, highlightSegments, incidentReport, transferCheck, NO_HIT_BN, NO_HIT_EN, PAUSE_CAP_MINUTES, type TransferInputs } from "../lib/rokkha.ts";
import { ROKKHA_HELPLINES, PREP_CHECKLIST, RECOVERY_STEPS, WARNING_LINKS } from "../lib/rokkhaData.ts";

const ids = (text: string) => checkMessage(text).hits.map((h) => h.id);

test("Rokkha: every hit quotes an exact span of the input", () => {
  const text = "প্রিয় গ্রাহক, আমি বিকাশ অফিস থেকে বলছি। ভুলে আপনার নম্বরে ৫০০০ টাকা চলে গেছে, এখনই ফেরত দিন। আপনার ওটিপি কোডটি বলুন। bit.ly/abc12";
  const r = checkMessage(text);
  assert.ok(r.hits.length >= 4);
  for (const h of r.hits) {
    for (const s of h.spans) assert.equal(r.text.slice(s.start, s.end), s.quote);
    assert.ok(text.normalize("NFC").includes(h.quote), `${h.id} quote must come from input`);
    assert.ok(h.labelBn && h.labelEn && h.whyBn && h.whyEn);
  }
  const found = r.hits.map((h) => h.id);
  for (const id of ["mfs_agent", "mfs_refund", "otp_pin", "pressure_secrecy", "suspicious_link"]) assert.ok(found.includes(id as never), id);
  assert.equal(r.hits.find((h) => h.id === "suspicious_link")?.quote, "bit.ly/abc12");
});

test("Rokkha: English typologies", () => {
  assert.ok(ids("Congratulations! You have won the lucky draw.").includes("lottery_prize"));
  assert.ok(ids("Visa ready for Dubai job, send processing fee 20000 today").includes("advance_fee"));
  assert.ok(ids("Earn daily profit with online task commission, double your money").includes("investment_task"));
  assert.ok(ids("This is the police. Your case is open.").includes("impersonation"));
  assert.ok(ids("Your son had an accident, send money").includes("relative_trouble"));
  assert.ok(ids("Please install AnyDesk so I can help").includes("remote_access"));
  assert.ok(ids("Share the OTP you just received").includes("otp_pin"));
  assert.ok(ids("Visit https://claim-prize.top/x now").includes("suspicious_link"));
  assert.ok(ids("I sent money by mistake, please refund").includes("mfs_refund"));
  assert.ok(ids("Do this urgently and don't tell anyone").includes("pressure_secrecy"));
});

test("Rokkha: Bangla typologies, including decomposed characters", () => {
  assert.ok(ids("অভিনন্দন! আপনি লটারি জিতেছেন").includes("lottery_prize"));
  assert.ok(ids("মালয়েশিয়ায় চাকরি, ভিসার জন্য অগ্রিম ২০ হাজার জমা দিন").includes("advance_fee"));
  assert.ok(ids("টাস্ক করে প্রতিদিন আয় করুন, টাকা দ্বিগুণ").includes("investment_task"));
  assert.ok(ids("আমি থানা থেকে বলছি, পুলিশ কেস হয়েছে").includes("impersonation"));
  assert.ok(ids("আপনার ছেলে দুর্ঘটনায় হাসপাতালে").includes("relative_trouble"));
  assert.ok(ids("এনিডেস্ক অ্যাপ ইনস্টল করুন").includes("remote_access"));
  assert.ok(ids("কাউকে বলবেন না, ১০ মিনিটের মধ্যে পাঠান").includes("pressure_secrecy"));
  // য় written as য + nukta (two code points) must still match after NFC.
  const decomposed = "আপনার মেয়ে বিপদে আছে".replace(/য়/g, "য়");
  assert.ok(ids(decomposed).includes("relative_trouble"));
});

test("Rokkha: no hits never says safe", () => {
  const r = checkMessage("আজ বিকেলে বাসায় আসবে? Bring the rice.");
  assert.equal(r.hits.length, 0);
  assert.equal(r.summaryBn, NO_HIT_BN);
  assert.equal(r.summaryEn, NO_HIT_EN);
  assert.match(r.summaryEn, /does NOT mean it is safe/);
  assert.match(r.summaryBn, /মানে এই নয় যে বার্তাটি নিরাপদ/);
  assert.doesNotMatch(r.summaryEn, /^(it is |this is |looks )?safe/i);
  assert.equal(checkMessage("").hits.length, 0);
});

test("Rokkha: highlight segments rebuild the text", () => {
  const r = checkMessage("Congratulations, you won! Send your OTP now: bit.ly/x");
  const segs = highlightSegments(r);
  assert.equal(segs.map((s) => s.text).join(""), r.text);
  assert.ok(segs.some((s) => s.ids.length > 0));
});

const base: TransferInputs = { amountTaka: 2000, requester: "self", metInPerson: true, urgency: false, secrecy: false, method: "bank", viaNewNumber: false };

test("Rokkha: transferCheck with no pressure has no pause", () => {
  const r = transferCheck(base);
  assert.equal(r.flags.length, 0);
  assert.equal(r.pauseMinutes, 0);
  assert.equal(r.level, "none");
  assert.ok(r.stepsEn.some((s) => /number you already had/.test(s)));
  assert.ok(r.stepsEn.some((s) => /trusted person/.test(s)));
  // A big amount alone adds no flag (the amount tier only applies when pressure exists).
  assert.equal(transferCheck({ ...base, amountTaka: 500_000 }).pauseMinutes, 0);
});

test("Rokkha: transferCheck flags pressure and caps the pause", () => {
  const r = transferCheck({ amountTaka: 60_000, requester: "official_claim", metInPerson: false, urgency: true, secrecy: true, method: "gift_card", viaNewNumber: true });
  const f = r.flags.map((x) => x.id);
  for (const id of ["secrecy", "new_number", "urgency", "not_met", "official", "untraceable", "large_amount"]) assert.ok(f.includes(id), id);
  assert.equal(r.pauseMinutes, PAUSE_CAP_MINUTES);
  assert.equal(r.level, "high");
  assert.ok(r.stepsEn.some((s) => /gift cards or crypto/.test(s)));

  const mild = transferCheck({ ...base, requester: "known_person", metInPerson: true, urgency: true, amountTaka: 15_000 });
  assert.deepEqual(mild.flags.map((x) => x.id), ["urgency", "medium_amount"]);
  assert.equal(mild.pauseMinutes, 15);
  assert.equal(mild.level, "caution");
  assert.equal(transferCheck({ ...base, requester: "new_contact", method: "crypto", metInPerson: false }).level, "high");
  assert.equal(transferCheck({ ...base, amountTaka: Number.NaN, urgency: true }).pauseMinutes, 10);
});

test("Rokkha: incident report keeps the user's values and marks missing ones", () => {
  const r = incidentReport({ date: "2026-11-17", time: "14:05", amountTaka: 125000, method: "bKash", transactionId: "9KX7A1B2C3", senderNumber: "01700000000", whatHappened: "ফোনে এজেন্ট পরিচয়ে ওটিপি চেয়েছিল।\u0007" });
  for (const text of [r.helpline, r.gd]) {
    assert.match(text, /9KX7A1B2C3/);
    assert.match(text, /01700000000/);
    assert.match(text, /৳1,25,000/);
    assert.match(text, /2026-11-17/);
    assert.match(text, /— \(লিখুন\)/); // receiver number was not given
    assert.doesNotMatch(text, /\u0007/);
  }
  assert.match(r.gd, /সাধারণ ডায়েরি/);
  assert.match(r.helpline, /Transaction ID/);
  assert.match(incidentReport({}).helpline, /টাকার পরিমাণ \(Amount\): — \(লিখুন\)/);
});

test("Rokkha data: every helpline and link has an official source and check date", () => {
  for (const h of ROKKHA_HELPLINES) {
    assert.match(h.source.url, /^https:\/\//);
    assert.match(h.source.checked, /^\d{4}-\d{2}-\d{2}$/);
    assert.match(h.number, /^\d+$/);
  }
  for (const w of WARNING_LINKS) assert.match(w.source.url, /^https:\/\//);
  assert.equal(new Set(PREP_CHECKLIST.map((p) => p.id)).size, PREP_CHECKLIST.length);
  assert.ok(RECOVERY_STEPS.length >= 4);
});
