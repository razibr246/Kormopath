/**
 * "একটি জীবন, সাতটি অধ্যায়": the home page's animated story. A fictional young man, Rafi, from a farming family in
 * Rajshahi, lives through KormoPath's seven life stages (the same order as the home page's life cycle). In each
 * stage he says his problem out loud, asks Buddy, Buddy points him to the real app, and the app solves it.
 *
 * Rules (AGENTS.md): every feature named here exists in the app, and every number is either a constant with a source
 * (lib/data.ts) or a measured result (lib/eval-results.json, passed in by the page). Rafi, his parents and the sample
 * SMS are fictional and are labelled so on the page. Pure data, no imports: tested in tests/life-story.test.ts.
 */

export type Pose =
  | "stand" | "worry" | "phone" | "cheer"
  | "sitWorry" | "sitPhone" | "sitWork"
  | "kneel" | "kneelPhone" | "shade";

export type StageId = "study" | "work" | "earn" | "home" | "health" | "field" | "protect";

export type Line = { bn: string; en: string };

export type Stage = {
  id: StageId;
  n: number;
  label: Line;
  /** The problem, spoken by Rafi (shown as a voice subtitle). */
  problem: Line;
  /** What Buddy tells him: which app, and why. */
  buddy: Line;
  app: { name: Line; href: string };
  /** A second real app in the same chapter (Rokkha beside Legal Aid). */
  also?: { name: Line; href: string };
  /** Three to four real things the app does for this problem, ticked one by one on the app card. */
  steps: Line[];
  /** The outcome, spoken by Rafi once it is solved. */
  solution: Line;
  /** Poses through the stage: struggling, asking Buddy with the phone, solved. */
  poses: [Pose, Pose, Pose];
  /** Who else is in the scene. */
  cast: Array<"mother" | "father">;
};

export const STORY_TITLE: Line = { bn: "একটি জীবন, সাতটি অধ্যায়", en: "One life, seven chapters" };
export const STORY_HERO: Line = { bn: "রাফি", en: "Rafi" };

export const STAGES: Stage[] = [
  {
    id: "study", n: 1, label: { bn: "পড়া", en: "Study" },
    problem: { bn: "এইচএসসি শেষ। কোন বিশ্ববিদ্যালয়ে আবেদন করব, শেষ তারিখ কবে, কিছুই গোছানো নেই।", en: "HSC is done. Which university, which deadline? Nothing is in one place." },
    buddy: { bn: "রাফি, অ্যাডমিট বাডি খোলো: তোমার জিপিএ মিলিয়ে তালিকা আর অফিসিয়াল সার্কুলারের তারিখ এক জায়গায়।", en: "Rafi, open AdmitBuddy: a shortlist that fits your GPA and dates from official circulars, in one place." },
    app: { name: { bn: "অ্যাডমিট বাডি", en: "AdmitBuddy" }, href: "/admitbuddy" },
    steps: [
      { bn: "জিপিএ অনুযায়ী বিশ্ববিদ্যালয়ের তালিকা", en: "Universities that fit the GPA" },
      { bn: "অফিসিয়াল সার্কুলারের তারিখ", en: "Dates from official circulars" },
      { bn: "কাজের চেকলিস্ট", en: "A task checklist" },
      { bn: "মডেল টেস্ট ও অনুশীলন", en: "Model tests and practice" },
    ],
    solution: { bn: "এখন জানি কোথায় আবেদন করব আর কবে। প্রতিদিন একটু করে প্রস্তুতি।", en: "Now I know where to apply and when. A little practice every day." },
    poses: ["sitWorry", "sitPhone", "sitWork"], cast: [],
  },
  {
    id: "work", n: 2, label: { bn: "দক্ষতা ও কাজ", en: "Skills & work" },
    problem: { bn: "কোড লিখতে পারি, কিন্তু ক্লায়েন্ট বিশ্বাস করবে কেন? প্রমাণ কোথায়?", en: "I can code, but why would a client trust me? Where is the proof?" },
    buddy: { bn: "ওয়ার্কস্পেসে সিভি দাও: প্রতিটি দক্ষতা সিভি থেকে হুবহু উদ্ধৃতিসহ, তারপর কোড চ্যালেঞ্জ আর মুখে ভাইভা।", en: "Give your CV to the Workspace: every skill with an exact quote from it, then a code challenge and a spoken viva." },
    app: { name: { bn: "ওয়ার্কস্পেস", en: "Workspace" }, href: "/workspace" },
    steps: [
      { bn: "সিভি আর গিটহাব থেকে প্রমাণসহ দক্ষতা", en: "Skills with evidence from CV and GitHub" },
      { bn: "ব্রাউজারে কোড চ্যালেঞ্জ", en: "A code challenge in the browser" },
      { bn: "মুখে ভাইভা", en: "A spoken viva" },
      { bn: "স্বাক্ষর করা স্কিল পাসপোর্ট, যাচাই লিংকসহ", en: "A signed skill passport with a verify link" },
    ],
    solution: { bn: "এখন ক্লায়েন্টকে একটা লিংক পাঠাই, তারা নিজেরাই যাচাই করে।", en: "Now I send clients one link and they check it themselves." },
    poses: ["sitWorry", "sitPhone", "sitWork"], cast: [],
  },
  {
    id: "earn", n: 3, label: { bn: "আয়", en: "Earn" },
    problem: { bn: "প্রথম কাজের পেমেন্ট ডলারে। ফি কেটে হাতে কত টাকা পাব? চুক্তিই বা কোথায়?", en: "My first payment is in dollars. How much reaches me after fees? And where is the contract?" },
    buddy: { bn: "চুক্তিগার্ডে রিভিউ করা ধারার চুক্তি আর ইনভয়েস, ফি-গার্ডে প্রতিটি ফি ধাপে ধাপে, উৎসসহ।", en: "ChuktiGuard for a contract from reviewed clauses and an invoice; FeeGuard for every fee, step by step, with sources." },
    app: { name: { bn: "ফি-গার্ড ও চুক্তিগার্ড", en: "FeeGuard & ChuktiGuard" }, href: "/feeguard" },
    steps: [
      { bn: "বাংলা-ইংরেজি চুক্তি, মাইলস্টোনসহ", en: "A bilingual contract with milestones" },
      { bn: "চ্যানেল তুলনা: কোন পথে কত কাটে", en: "Channels compared: what each one costs" },
      { bn: "প্রতিটি ফি ও রেটের পাশে উৎস", en: "A source beside every fee and rate" },
      { bn: "ফ্রিল্যান্সারের ২.৫% প্রণোদনা, ব্যাংকে দাবি করার নিয়মসহ", en: "The 2.5% freelancer incentive, and how to claim it at the bank" },
    ],
    solution: { bn: "এখন আগেই জানি হাতে কত আসবে, আর কোন পথে কম কাটে।", en: "Now I know beforehand what will reach me, and which route costs less." },
    poses: ["worry", "phone", "cheer"], cast: [],
  },
  {
    id: "home", n: 4, label: { bn: "সংসার", en: "Home & money" },
    problem: { bn: "মাস শেষে টাকা কোথায় গেল বুঝি না। কাকে কত ধার দিলাম, তাও মনে নেই।", en: "At month's end I can't tell where the money went, or who owes me what." },
    buddy: { bn: "সহজ বাজেটে মুখে বলো ‘বাজারে খরচ’, তুমি নিশ্চিত করলে তবেই লেখা হবে। দেনা-পাওনাও আলাদা খাতায়।", en: "In Shohoj Budget just say the expense; it is saved only after you confirm. Money lent and owed has its own book." },
    app: { name: { bn: "সহজ বাজেট", en: "Shohoj Budget" }, href: "/shohoj-budget" },
    steps: [
      { bn: "মুখে বলে খরচ লেখা, নিশ্চিত করলে তবেই সংরক্ষণ", en: "Spoken entries, saved only after you confirm" },
      { bn: "নগদ, বিকাশ ও নগদ ওয়ালেট আলাদা", en: "Cash, bKash and Nagad wallets kept apart" },
      { bn: "দেনা-পাওনার খাতা", en: "A book for dhar and baki" },
      { bn: "সব তথ্য নিজের ফোনেই থাকে", en: "Everything stays on your own phone" },
    ],
    solution: { bn: "এখন প্রতিটি টাকার হিসাব আছে, ধার দেওয়া টাকাও ফেরত পেয়েছি।", en: "Now every taka is accounted for, and the money I lent came back." },
    poses: ["worry", "phone", "cheer"], cast: [],
  },
  {
    id: "health", n: 5, label: { bn: "স্বাস্থ্য", en: "Health" },
    problem: { bn: "মায়ের তিন দিন ধরে জ্বর। কখন হাসপাতালে নেব? কাছের জরুরি বিভাগ কোথায়?", en: "Mother has had a fever for three days. When do we go to hospital? Where is the nearest emergency?" },
    buddy: { bn: "মেডিস্ক্যানে বিশ্ব স্বাস্থ্য সংস্থার বিপদ সংকেত দেখো: একটিও থাকলে এখনই হাসপাতাল। কাছের জরুরি হাসপাতালও দেখাবে। জরুরি হলে ৯৯৯।", en: "Check WHO's danger signs in MediScan: any one means hospital now. It also shows the nearest emergency hospital. In an emergency, 999." },
    app: { name: { bn: "মেডিস্ক্যান", en: "MediScan BD" }, href: "/mediscan/emergency" },
    steps: [
      { bn: "জ্বর ও ডেঙ্গুর বিপদ সংকেত (বিশ্ব স্বাস্থ্য সংস্থা)", en: "Fever and dengue danger signs (WHO)" },
      { bn: "কাছের জরুরি হাসপাতাল, ম্যাপের তথ্য থেকে", en: "The nearest emergency hospital, from map data" },
      { bn: "যাওয়ার আগে ফোন করে নিশ্চিত হওয়ার নম্বর", en: "A number to call and confirm before going" },
      { bn: "রোগ নির্ণয় বা ওষুধের মাত্রা নয়: ডাক্তারই বলবেন", en: "No diagnosis or doses: that is the doctor's call" },
    ],
    solution: { bn: "সময়মতো হাসপাতালে নিয়েছি। ডাক্তার দেখেছেন, মা এখন ভালো আছেন।", en: "We reached the hospital in time. The doctor saw her, and Mother is well now." },
    poses: ["kneel", "kneelPhone", "stand"], cast: ["mother"],
  },
  {
    id: "field", n: 6, label: { bn: "মাঠ", en: "Field" },
    problem: { bn: "বাবা জিজ্ঞেস করছেন: আজ কি সেচ দেব? ধান হাটে বেচব, না আড়তে?", en: "Father asks: should we water today? Sell the paddy at the market, or to the wholesaler?" },
    buddy: { bn: "মাঠসাথীতে আবহাওয়া মিলিয়ে সেচের পরামর্শ, আর হাটবাজারে তোমাদের নিজেদের দামে কোথায় লাভ বেশি।", en: "MaathSathi gives watering advice from the weather, and HaatBazar shows where you earn more at your own prices." },
    app: { name: { bn: "মাঠসাথী ও হাটবাজার", en: "MaathSathi & HaatBazar" }, href: "/krishi/field#/farmer" },
    steps: [
      { bn: "জমির আবহাওয়া আর সেচের পরামর্শ", en: "Field weather and watering advice" },
      { bn: "রোপণের সময় দেখার রাডার", en: "A radar for planting time" },
      { bn: "নিজের দামে হাট বনাম আড়তের লাভ", en: "Market vs wholesale at your own prices" },
      { bn: "কীটনাশকের মাত্রা নয়: লেবেল আর কৃষি কল সেন্টার ১৬১২৩", en: "No pesticide doses: the label and Krishi Call Centre 16123" },
    ],
    solution: { bn: "বৃষ্টি আসছে, তাই আজ সেচ লাগেনি। ধান বেচেছি যেখানে লাভ বেশি।", en: "Rain was coming, so no watering today. We sold where we earn more." },
    poses: ["shade", "phone", "cheer"], cast: ["father"],
  },
  {
    id: "protect", n: 7, label: { bn: "সুরক্ষা ও আইন", en: "Protect & law" },
    problem: { bn: "এসএমএস এল: ‘বিকাশ বন্ধ হবে, ওটিপি দিন।’ আবার পাশের জমির লোক বাবার জমির সীমানা ঠেলে দিচ্ছে। উকিলের টাকা কোথায়?", en: "An SMS: ‘Your bKash will close, send the OTP.’ And a neighbour is pushing into Father's land. How do we pay a lawyer?" },
    buddy: { bn: "ওটিপি কাউকে দিও না: রক্ষায় মেসেজটা যাচাই করো। আর জমির বিরোধে আইনি সহায়তায় দেখো বিনামূল্যে সাহায্য পেতে পারো কি না, আবেদনের খসড়া আর মধ্যস্থতার প্রস্তুতি।", en: "Never share an OTP: check the SMS in Rokkha. For the land dispute, Legal Aid shows whether you may get free help, an application draft and how to prepare for mediation." },
    app: { name: { bn: "রক্ষা ও আইনি সহায়তা", en: "Rokkha & Legal Aid" }, href: "/legal" },
    also: { name: { bn: "রক্ষা", en: "Rokkha" }, href: "/rokkha" },
    steps: [
      { bn: "প্রতারণার লক্ষণ, মেসেজের হুবহু কথাসহ; ‘নিরাপদ’ কখনো বলে না", en: "Scam signs quoting the exact words; it never says ‘safe’" },
      { bn: "বিনামূল্যে আইনি সহায়তা পেতে পারেন কি না: সিদ্ধান্ত লিগ্যাল এইড অফিসের", en: "Whether you may get free legal aid: the legal aid office decides" },
      { bn: "আবেদনের খসড়া আর মধ্যস্থতার প্রস্তুতি", en: "An application draft and mediation prep" },
      { bn: "আইনি সহায়তা হেল্পলাইন ১৬৬৯৯; পরামর্শ নয়, আইনি তথ্য", en: "Legal aid helpline 16699; legal information, not advice" },
    ],
    solution: { bn: "ওটিপি দিইনি, টাকা যায়নি। জমির বিষয়ে বাবাকে নিয়ে লিগ্যাল এইড অফিসে আবেদন করেছি, মধ্যস্থতার জন্য।", en: "I never sent the OTP and lost nothing. And with Father I applied to the legal aid office for mediation over the land." },
    poses: ["phone", "phone", "cheer"], cast: ["father"],
  },
];

/** The closing line after the seventh chapter. */
export const STORY_END: Line = {
  bn: "পড়া থেকে মাঠ, প্রতিটি মোড়ে কর্মপথ পাশে। তথ্য বানানো নয়, প্রতিটি হিসাব উৎসসহ।",
  en: "From study to the field, KormoPath at every turn. Nothing made up; every number with its source.",
};

/** Where a stage begins and ends inside its scroll share: problem, Buddy, the app, then the solution. */
export const BEATS = { problem: [0.06, 0.32], buddy: [0.3, 0.52], app: [0.46, 0.8], solved: [0.72, 1] } as const;

/** Which stage and how far through it, for overall story progress p in [0, 1]. */
export function stageAt(p: number, count = STAGES.length): { index: number; local: number } {
  const x = Math.min(Math.max(p, 0), 1) * count;
  const index = Math.min(count - 1, Math.floor(x));
  return { index, local: Math.min(1, x - index) };
}

/** 0 → 1 as `local` crosses [a, b], eased; 0 before, 1 after. */
export function beat(local: number, [a, b]: readonly [number, number]): number {
  const k = Math.min(1, Math.max(0, (local - a) / (b - a)));
  return k * k * (3 - 2 * k);
}
