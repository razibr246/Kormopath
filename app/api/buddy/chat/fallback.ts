/*
 * Buddy's rule-based answer, used when the model is unavailable (no key, key rejected, rate limit, invalid output).
 * Buddy must never end in a dead "AI server busy": it answers from KormoPath's own verified data and points to the
 * screen that can help. Every number here comes from a sourced module (lib/rokkhaData, lib/legal/data,
 * lib/health/services, lib/krishiData, lib/budget's verified MFS rates); nothing is invented. Emergencies come first,
 * using the same detectors as the health and legal assistants.
 */
import { ROKKHA_HELPLINES } from "../../../../lib/rokkhaData.ts";
import { HELPLINES as LEGAL_HELPLINES } from "../../../../lib/legal/data.ts";
import { HEALTH_SERVICES } from "../../../../lib/health/services.ts";
import { HELPLINES as KRISHI_HELPLINES } from "../../../../lib/krishiData.ts";
import { MFS_FEE_RATES, calculateMfsCashoutFee, parseAmount } from "../../../../lib/budget.ts";
import { findRedFlags } from "../../../../lib/health/specialty.ts";
import { isCrisis } from "../../../../lib/legal/assistGuard.ts";

export type FallbackLink = { href: string; label: string };
export interface FallbackAnswer { reply: string; links: FallbackLink[]; emergency: boolean }

const BN = "০১২৩৪৫৬৭৮৯";
const bnNum = (s: string | number) => String(s).replace(/\d/g, (d) => BN[Number(d)]);
const norm = (s: string) => (s ?? "").normalize("NFC").toLowerCase();

const rokkha = (n: string) => ROKKHA_HELPLINES.find((h) => h.number === n);
const line = (bn: boolean, number: string, nameBn: string, nameEn: string) => (bn ? `${bnNum(number)} — ${nameBn}` : `${number} — ${nameEn}`);

function helplineText(bn: boolean, numbers: string[]): string {
  const out: string[] = [];
  for (const n of numbers) {
    const r = rokkha(n);
    if (r) { out.push(line(bn, r.number, r.nameBn, r.nameEn)); continue; }
    const l = LEGAL_HELPLINES.find((h) => h.number === n);
    if (l) { out.push(line(bn, l.number, l.bn, l.en)); continue; }
    const h = HEALTH_SERVICES.find((s) => s.phone === n);
    if (h) { out.push(line(bn, n, h.bn, h.en)); continue; }
    const k = KRISHI_HELPLINES.find((s) => s.number === n) as { number: string; nameBn?: string; nameEn?: string; bn?: string; en?: string } | undefined;
    if (k) out.push(line(bn, n, k.nameBn ?? k.bn ?? n, k.nameEn ?? k.en ?? n));
  }
  return out.join("\n");
}

type Topic = { id: string; words: RegExp; href: string; bn: string; en: string; tipBn: string; tipEn: string; numbers: string[] };

const TOPICS: Topic[] = [
  { id: "fees", words: /fee|charge|cash ?out|bkash|nagad|rocket|payoneer|fiverr|upwork|wise|exchange|dollar|usd|চার্জ|ফি|ক্যাশ ?আউট|বিকাশ|নগদ|ডলার|রেট/i, href: "/feeguard", bn: "ফি-গার্ড", en: "FeeGuard",
    tipBn: "ফি-গার্ডে চ্যানেলগুলোর ফি ধাপে ধাপে দেখুন; হাতের টাকা ও বিকাশ-নগদের হিসাব সহজ বাজেটের ওয়ালেট অংশে।", tipEn: "FeeGuard shows each channel's fees step by step; cash and bKash/Nagad balances are in Shohoj Budget's wallets tab.", numbers: [] },
  { id: "scam", words: /scam|fraud|otp|pin|lottery|prize|hack|link|প্রতারণা|প্রতারক|ওটিপি|পিন|লটারি|পুরস্কার|হ্যাক|লিংক|লিঙ্ক/i, href: "/rokkha", bn: "রক্ষা", en: "Rokkha",
    tipBn: "রক্ষায় বার্তাটি পেস্ট করুন: কোন শব্দে প্রতারণার লক্ষণ, তা হুবহু দেখাবে। কোনো লক্ষণ না পাওয়া মানে নিরাপদ নয়। ওটিপি বা পিন কাউকে দেবেন না।", tipEn: "Paste the message into Rokkha: it quotes the exact words that match scam signs. Finding none does not mean it is safe. Never share an OTP or PIN.", numbers: ["16247", "16167", "999"] },
  { id: "health", words: /doctor|hospital|medicine|prescription|fever|dengue|pain|ডাক্তার|হাসপাতাল|ওষুধ|প্রেসক্রিপশন|জ্বর|ডেঙ্গু|ব্যথা|অসুখ/i, href: "/mediscan", bn: "মেডিস্ক্যান", en: "MediScan",
    tipBn: "মেডিস্ক্যানে প্রেসক্রিপশন সহজ বাংলায় বুঝুন, কোন ডাক্তার দেখাবেন জানুন, আর কাছের জরুরি হাসপাতাল খুঁজুন। এটি রোগ নির্ণয় বা ওষুধ বলে না।", tipEn: "MediScan explains a prescription in plain Bangla, suggests which kind of doctor to see and finds the nearest emergency hospital. It never diagnoses or prescribes.", numbers: ["16263", "999"] },
  { id: "legal", words: /legal|lawyer|court|case|police|divorce|land dispute|dowry|আইন|উকিল|আইনজীবী|আদালত|মামলা|থানা|তালাক|যৌতুক|জমি নিয়ে/i, href: "/legal", bn: "আইনি সহায়তা", en: "Legal Aid",
    tipBn: "আইনি সহায়তা অংশে দেখুন বিনামূল্যে সরকারি আইনি সহায়তা পেতে পারেন কি না; আবেদনের খসড়াও করতে পারবেন। এটি আইনি তথ্য, পরামর্শ নয়।", tipEn: "The Legal Aid section shows whether you may get free government legal aid and helps draft an application. It is legal information, not advice.", numbers: ["16699"] },
  { id: "farm", words: /crop|farm|seed|fertili|rice|paddy|harvest|ফসল|চাষ|কৃষি|বীজ|সার|ধান|সেচ|কৃষক/i, href: "/krishi/field#/farmer", bn: "মাঠসাথী", en: "MaathSathi",
    tipBn: "মাঠসাথীতে কী লাগাবেন, আজ সেচ লাগবে কি না আর ফসলের ডাক্তার দেখুন। কীটনাশকের মাত্রা লেবেল দেখে ও কৃষি কল সেন্টারে জিজ্ঞেস করে ঠিক করুন।", tipEn: "MaathSathi helps decide what to plant, whether to water today, and has a crop doctor. For pesticide amounts follow the label and ask the Krishi Call Centre.", numbers: ["16123"] },
  { id: "budget", words: /budget|expense|spend|saving|loan|lend|mess|zakat|বাজেট|খরচ|সঞ্চয়|ধার|বাকি|মেস|যাকাত|বাজার/i, href: "/shohoj-budget", bn: "সহজ বাজেট", en: "Shohoj Budget",
    tipBn: "সহজ বাজেটে মুখে বলে খরচ লিখুন; দেনা-পাওনা, মেসের হিসাব, বাজারের তালিকা আর যাকাতও সেখানে আছে।", tipEn: "Shohoj Budget takes spoken expenses and also has dhar/baki, mess meals, the bazar list and zakat.", numbers: [] },
  { id: "admission", words: /admission|university|gpa|sop|ielts|ভর্তি|বিশ্ববিদ্যালয়|জিপিএ/i, href: "/admitbuddy", bn: "অ্যাডমিট বাডি", en: "AdmitBuddy",
    tipBn: "অ্যাডমিট বাডিতে জিপিএ দিয়ে বিশ্ববিদ্যালয় মিলিয়ে দেখুন। তারিখ ও শর্ত সবসময় অফিসিয়াল সার্কুলারে যাচাই করুন।", tipEn: "AdmitBuddy matches universities to your GPA. Always confirm dates and requirements in the official circular.", numbers: [] },
  { id: "viva", words: /interview|viva|speaking|ভাইভা|ইন্টারভিউ|সাক্ষাৎকার/i, href: "/probaho", bn: "প্রবাহ কোচ", en: "Probaho Coach",
    tipBn: "প্রবাহ কোচে ইন্টারভিউ ও ভাইভার প্রশ্নে উত্তর অনুশীলন করুন।", tipEn: "Practise interview and viva answers in Probaho Coach.", numbers: [] },
];

const APP_HOME: Record<string, { href: string; bn: string; en: string }> = {
  kormopath: { href: "/workspace", bn: "ওয়ার্কস্পেস", en: "Workspace" }, path: { href: "/opportunities", bn: "আমার পথ", en: "My Path" },
  chuktiguard: { href: "/chuktiguard", bn: "চুক্তিগার্ড", en: "ChuktiGuard" }, feeguard: { href: "/feeguard", bn: "ফি-গার্ড", en: "FeeGuard" },
  admitbuddy: { href: "/admitbuddy", bn: "অ্যাডমিট বাডি", en: "AdmitBuddy" }, mediscan: { href: "/mediscan", bn: "মেডিস্ক্যান", en: "MediScan" },
  shohoj: { href: "/shohoj-budget", bn: "সহজ বাজেট", en: "Shohoj Budget" }, haatbazar: { href: "/haatbazar", bn: "হাটবাজার", en: "HaatBazar" },
  krishi: { href: "/krishi/field#/farmer", bn: "মাঠসাথী", en: "MaathSathi" }, rokkha: { href: "/rokkha", bn: "রক্ষা", en: "Rokkha" },
  legal: { href: "/legal", bn: "আইনি সহায়তা", en: "Legal Aid" }, probaho: { href: "/probaho", bn: "প্রবাহ কোচ", en: "Probaho Coach" },
};

/** The verified bKash cash-out rates (read on bkash.com), as one sentence. */
function bkashFeeText(bn: boolean): string {
  const rates = Object.values(MFS_FEE_RATES).filter((r) => r.verified && r.method === "bKash" && r.source);
  if (!rates.length) return "";
  const checked = rates[0].source!.checked;
  return bn
    ? `বিকাশের নিজের পাতায় (যাচাই ${bnNum(checked)}): এজেন্ট থেকে ক্যাশ আউট ${bnNum(rates.find((r) => r.id === "bkash_ussd")?.ratePct ?? "")}%, প্রিয় এজেন্টে ${bnNum(rates.find((r) => r.id === "bkash_priyo")?.ratePct ?? "")}% (মাসে সীমা আছে)।`
    : `bKash's own page (checked ${checked}): agent cash-out ${rates.find((r) => r.id === "bkash_ussd")?.ratePct}%, Priyo Agent ${rates.find((r) => r.id === "bkash_priyo")?.ratePct}% (monthly limit applies).`;
}

/**
 * A bKash cash-out fee question ("bkash e 5000 taka cash out e koto charge?") is answered from the verified rate in
 * lib/budget.ts before any model call, so Buddy never says it doesn't know a fee the app has verified. Only bKash's
 * agent rate is verified (bkash.com); other providers get no number, just a pointer to FeeGuard.
 */
export function directFeeAnswer(lastUserMessage: string, lang: "bn" | "en"): FallbackAnswer | null {
  const t = norm(lastUserMessage);
  if (!/bkash|বিকাশ/i.test(t) || !/charge|fee|cost|cash ?out|koto|কত|চার্জ|খরচ|কাটে|ক্যাশ ?আউট|ফি/i.test(t)) return null;
  const rate = MFS_FEE_RATES.bkash_app;
  if (!rate?.verified || !rate.source) return null;
  const amount = parseAmount(lastUserMessage);
  const bn = lang === "bn";
  let example = "";
  if (amount && amount > 0 && amount <= 10_000_000) {
    const fee = calculateMfsCashoutFee(amount, "bkash_app");
    const feeTaka = (fee.feePoisha / 100).toFixed(2);
    example = bn ? `\n${bnNum(amount)} টাকা এজেন্ট থেকে ক্যাশ আউটে চার্জ ${bnNum(feeTaka)} টাকা।` : `\nCashing out Tk ${amount} at an agent costs Tk ${feeTaka}.`;
  }
  const head = bkashFeeText(bn);
  return {
    emergency: false,
    reply: head + example + (bn ? "\nরেট বদলাতে পারে; লেনদেনের আগে বিকাশ অ্যাপে দেখে নিন।" : "\nRates can change; check the bKash app before you transact."),
    links: [{ href: "/feeguard", label: bn ? "ফি-গার্ড খুলুন" : "Open FeeGuard" }, { href: "/shohoj-budget#wallets", label: bn ? "হাতের টাকা ও ওয়ালেট" : "Wallets" }],
  };
}

export function fallbackAnswer(appId: string, lastUserMessage: string, lang: "bn" | "en"): FallbackAnswer {
  const bn = lang === "bn";
  const t = norm(lastUserMessage);

  // 1. Danger first: the same detectors the health and legal assistants use.
  const health = findRedFlags(t);
  if (health.length || isCrisis(t)) {
    const nums = health.length ? ["999", "16263"] : ["999", "109", "16699"];
    return {
      emergency: true,
      reply: (bn
        ? "এখনই ৯৯৯-এ ফোন করুন — বিপদ বা জরুরি অবস্থায় অপেক্ষা করবেন না।\n"
        : "Call 999 now — do not wait in an emergency or when someone is in danger.\n") + helplineText(bn, nums),
      links: health.length
        ? [{ href: "/mediscan/emergency", label: bn ? "কাছের জরুরি হাসপাতাল" : "Nearest emergency hospital" }]
        : [{ href: "/legal", label: bn ? "আইনি সহায়তা" : "Legal Aid" }],
    };
  }

  // 2. A topic the person asked about, else the app they are in.
  const topic = TOPICS.find((x) => x.words.test(t));
  if (topic) {
    const extra = topic.id === "fees" ? bkashFeeText(bn) : "";
    const nums = helplineText(bn, topic.numbers);
    return {
      emergency: false,
      reply: [bn ? topic.tipBn : topic.tipEn, extra, nums].filter(Boolean).join("\n"),
      links: [{ href: topic.href, label: bn ? `${topic.bn} খুলুন` : `Open ${topic.en}` }].concat(topic.id === "fees" ? [{ href: "/shohoj-budget#wallets", label: bn ? "হাতের টাকা ও ওয়ালেট" : "Wallets" }] : []),
    };
  }
  const home = APP_HOME[appId] ?? APP_HOME.kormopath;
  return {
    emergency: false,
    reply: bn
      ? `এই প্রশ্নের উত্তর এখন তৈরি করা যাচ্ছে না। ${home.bn} অংশে সরাসরি দেখতে পারেন, অথবা প্রশ্নে বিষয়টি লিখুন — যেমন ফি, প্রতারণা, ডাক্তার, আইন, ফসল বা বাজেট।`
      : `I can't write a full answer right now. You can go straight to ${home.en}, or name the topic in your question — fees, scam, doctor, legal, crops or budget.`,
    links: [{ href: home.href, label: bn ? `${home.bn} খুলুন` : `Open ${home.en}` }, { href: "/rokkha", label: bn ? "জরুরি নম্বর" : "Emergency numbers" }],
  };
}
