/* Rule-based legal information for the assistant, used when there is no model key or the model's answer fails the
 * guard. Adapted for KormoPath from the Digital Legal Aid System (razibr246 and AdribMahmud101),
 * lib/agent/knowledge/universal-inquiries_v2.ts. Imports only ./*.ts.
 *
 * KormoPath changes: every answer names only helplines and laws verified in ./data.ts (by id, rendered from the data,
 * never typed into the text), and the original's unverifiable claims are removed: income limits, response times,
 * "apply on our website or mobile app", "the government pays every cost", section numbers and the DLAS demo cases.
 * Where the original said what will happen, this says whom to ask. Information, not advice. */
import { HELPLINES, LAWS, NOT_LEGAL_ADVICE_BN, NOT_LEGAL_ADVICE_EN, type HelplineId, type LawId } from "./data.ts";
import { PROBLEM_CATEGORIES } from "./taxonomy.ts";
import { classifySeverity } from "./severity.ts";
import { isCrisis } from "./assistGuard.ts";

export type NextStep = "apply" | "mediation" | "call" | "none";

export interface Inquiry {
  id: string;
  /** ./taxonomy.ts category id, or a general topic */
  topic: string;
  questionBn: string;
  questionEn: string;
  answerBn: string;
  answerEn: string;
  keywords: string[];
  helplines: HelplineId[];
  laws: LawId[];
  next: NextStep;
  urgent?: boolean;
}

/** General topics shown as chips next to the taxonomy categories. */
export const GENERAL_TOPICS = [
  { id: "aid", bn: "বিনামূল্যে সাহায্য পাব কি?", en: "Can I get free legal aid?" },
  { id: "apply", bn: "কীভাবে আবেদন করব", en: "How do I apply" },
  { id: "safety", bn: "এখনই বিপদে আছি", en: "I am in danger now" },
] as const;

export const INQUIRIES: Inquiry[] = [
  {
    id: "aid_eligibility", topic: "aid",
    questionBn: "আমি কি বিনামূল্যে আইনগত সহায়তা পেতে পারি?", questionEn: "Can I get free legal aid?",
    answerBn: "সরকারি আইনগত সহায়তা দেওয়া হয় তাঁদের, যাঁরা নিজের খরচে আইনজীবী রাখতে পারেন না, আর বিশেষভাবে নির্যাতনের শিকার নারী ও শিশুসহ অসহায় মানুষদের। আপনি পাবেন কি না, তা ঠিক করে আপনার জেলা লিগ্যাল এইড অফিস। জানতে বিনা খরচে ১৬৬৯৯ নম্বরে ফোন করুন।",
    answerEn: "Government legal aid is for people who cannot afford a lawyer, especially vulnerable people such as women and children who face violence. Whether you get it is decided by your district legal aid office. Call 16699 free of charge to ask.",
    keywords: ["যোগ্য", "যোগ্যতা", "বিনামূল্যে", "বিনা খরচে", "ফ্রি", "সরকারি খরচে", "পাব কি", "পাবো কি", "গরিব", "অসচ্ছল", "টাকা নেই", "টাকা নাই", "free", "eligible", "afford", "poor", "legal aid"],
    helplines: ["legal_aid"], laws: ["legal_aid_2000"], next: "apply",
  },
  {
    id: "aid_apply", topic: "apply",
    questionBn: "আইনগত সহায়তার জন্য কীভাবে আবেদন করব?", questionEn: "How do I apply for legal aid?",
    answerBn: "১৬৬৯৯ নম্বরে ফোন করে পরামর্শ নিন এবং আপনার জেলার লিগ্যাল এইড অফিসের খোঁজ নিন। এখানে আবেদনের একটি খসড়া তৈরি করে প্রিন্ট বা কপি করে অফিসে নিয়ে যেতে পারেন। এই খসড়া নিজে কোথাও জমা হয় না।",
    answerEn: "Call 16699 for advice and to find your district legal aid office. You can make an application draft here and print or copy it to take to the office. The draft is not submitted anywhere by itself.",
    keywords: ["আবেদন", "দরখাস্ত", "কীভাবে", "কিভাবে", "কোথায় যাব", "অফিস কোথায়", "apply", "application", "how do i", "where do i go"],
    helplines: ["legal_aid"], laws: ["legal_aid_2000"], next: "apply",
  },
  {
    id: "aid_documents", topic: "apply",
    questionBn: "কী কী কাগজ সঙ্গে নেব?", questionEn: "What papers should I take?",
    answerBn: "আপনার সমস্যার সঙ্গে যুক্ত যা কাগজ আছে — যেমন পরিচয়পত্র, কাবিননামা, জমির দলিল, চিকিৎসার কাগজ, চিঠি বা নোটিশ — তার কপি সঙ্গে রাখুন। ঠিক কোনগুলো লাগবে, তা লিগ্যাল এইড অফিস বলে দেবে। কাগজ না থাকলেও ১৬৬৯৯-এ জিজ্ঞেস করুন।",
    answerEn: "Keep copies of any papers linked to your problem, such as ID, marriage certificate (kabinnama), land deed, medical papers, letters or notices. The legal aid office will tell you exactly which ones it needs. Even without papers, ask on 16699.",
    keywords: ["কাগজ", "কাগজপত্র", "দলিল", "এনআইডি", "nid", "জাতীয় পরিচয়পত্র", "কি কি লাগবে", "কী কী লাগবে", "documents", "papers", "id card"],
    helplines: ["legal_aid"], laws: [], next: "apply",
  },
  {
    id: "aid_mediation", topic: "aid",
    questionBn: "মীমাংসা (মধ্যস্থতা) কী?", questionEn: "What is mediation?",
    answerBn: "মীমাংসা মানে দুই পক্ষ একজন নিরপেক্ষ মানুষের সামনে বসে আদালতের বাইরে নিজেরা সমাধানে আসার চেষ্টা। আপনার বিষয়ে মীমাংসা সম্ভব কি না এবং কীভাবে হবে, তা লিগ্যাল এইড অফিসে জিজ্ঞেস করুন। এখানে প্রস্তুতির তালিকা ও মীমাংসার একটি খসড়া বানাতে পারেন।",
    answerEn: "Mediation means both sides sit with a neutral person and try to reach their own solution outside court. Ask your legal aid office whether and how mediation is possible in your matter. You can prepare a checklist and a draft settlement here.",
    keywords: ["মীমাংসা", "মধ্যস্থতা", "আপস", "সালিশ", "মিটমাট", "mediation", "settle", "compromise", "adr"],
    helplines: ["legal_aid"], laws: ["arbitration_2001"], next: "mediation",
  },
  {
    id: "aid_boundary", topic: "aid",
    questionBn: "আমি কি মামলায় জিতব? কোন ধারায় মামলা করব?", questionEn: "Will I win? Under which section do I file?",
    answerBn: "এটা আপনার কাগজ ও ঘটনার খুঁটিনাটির ওপর নির্ভর করে, তাই এখানে বলা যাবে না। আইনজীবী বা লিগ্যাল এইড অফিস আপনার কাগজ দেখে বলবেন। ১৬৬৯৯-এ ফোন করে পরামর্শ নিন।",
    answerEn: "That depends on your papers and the details of what happened, so it cannot be said here. A lawyer or the legal aid office will look at your papers and tell you. Call 16699 for advice.",
    keywords: ["জিতব", "জিতবো", "ধারা", "কোন ধারায়", "রায়", "win", "section", "which section", "chance"],
    helplines: ["legal_aid"], laws: [], next: "call",
  },
  {
    id: "safety_now", topic: "safety", urgent: true,
    questionBn: "আমি এখনই বিপদে আছি", questionEn: "I am in danger now",
    answerBn: "এখনই ৯৯৯-এ ফোন করুন। নারী বা শিশু নির্যাতনের ক্ষেত্রে ১০৯-এ ফোন করুন। নিরাপদ জায়গায় যান বা বিশ্বাসী কাউকে জানান। নিরাপদ হলে পরে ১৬৬৯৯-এ আইনি পরামর্শ নিন।",
    answerEn: "Call 999 now. For violence against women or children, call 109. Go somewhere safe or tell someone you trust. Once you are safe, call 16699 for legal advice.",
    keywords: ["বিপদ", "জরুরি", "বাঁচান", "help me", "danger", "emergency", "unsafe"],
    helplines: ["emergency", "women_children", "legal_aid"], laws: [], next: "call",
  },
  {
    id: "domestic_violence", topic: "dowry_violence", urgent: true,
    questionBn: "স্বামী বা শ্বশুরবাড়ির লোকজন আমাকে মারধর করে", questionEn: "My husband or in-laws beat me",
    answerBn: "আপনি এখন বিপদে থাকলে ৯৯৯-এ ফোন করুন, নারী নির্যাতনের জন্য ১০৯-এ ফোন করুন। পারিবারিক সহিংসতা থেকে সুরক্ষা চাওয়ার আইন আছে। নিরাপদ হলে ১৬৬৯৯-এ ফোন করে লিগ্যাল এইড অফিসের সাহায্য নিন।",
    answerEn: "If you are in danger now, call 999, or 109 for violence against women. There is a law for protection from domestic violence. Once safe, call 16699 to get help from the legal aid office.",
    keywords: ["মারধর", "মারে", "পেটায়", "নির্যাতন", "শ্বশুরবাড়ি", "গায়ে হাত", "beat", "beats", "violence", "abuse", "hits me"],
    helplines: ["emergency", "women_children", "legal_aid"], laws: ["domestic_violence_2010", "women_children_2000"], next: "call",
  },
  {
    id: "dowry", topic: "dowry",
    questionBn: "যৌতুক দাবি করা হচ্ছে", questionEn: "Dowry is being demanded",
    answerBn: "যৌতুক চাওয়া ও দেওয়া আইনে নিষিদ্ধ। যৌতুকের জন্য নির্যাতন হলে ১০৯ বা বিপদে ৯৯৯-এ ফোন করুন। আইনি সাহায্যের জন্য ১৬৬৯৯-এ ফোন করুন।",
    answerEn: "Demanding and giving dowry is prohibited by law. If there is violence over dowry, call 109, or 999 in danger. For legal help, call 16699.",
    keywords: ["যৌতুক", "dowry", "joutuk"],
    helplines: ["women_children", "legal_aid"], laws: ["dowry_2018", "women_children_2000"], next: "apply",
  },
  {
    id: "child_marriage", topic: "family", urgent: true,
    questionBn: "বাল্যবিবাহ দেওয়া হচ্ছে", questionEn: "A child marriage is being arranged",
    answerBn: "বাল্যবিবাহ আইনে নিষিদ্ধ। এখনই ১০৯ (নারী ও শিশু নির্যাতন প্রতিরোধ হেল্পলাইন) বা ৯৯৯-এ জানান।",
    answerEn: "Child marriage is prohibited by law. Report it now on 109 (helpline against violence on women and children) or 999.",
    keywords: ["বাল্যবিবাহ", "বাল্য বিবাহ", "কম বয়সে বিয়ে", "child marriage", "underage marriage"],
    helplines: ["women_children", "emergency"], laws: ["child_marriage_2017"], next: "call",
  },
  {
    id: "family_maintenance", topic: "family",
    questionBn: "স্বামী ভরণপোষণ দেন না", questionEn: "My husband does not pay maintenance",
    answerBn: "স্ত্রী ও সন্তানের ভরণপোষণ এবং দেনমোহরের দাবি পারিবারিক আদালতে করা যায়। কাবিননামা ও খরচের কাগজ রাখুন। লিগ্যাল এইড অফিস থেকে আইনজীবী বা মীমাংসার সাহায্য চাইতে ১৬৬৯৯-এ ফোন করুন।",
    answerEn: "Claims for maintenance of a wife and children, and for dower, can be made in the family court. Keep the kabinnama and records of expenses. Call 16699 to ask the legal aid office for a lawyer or mediation.",
    keywords: ["ভরণপোষণ", "খরচ দেয় না", "খরচ দেন না", "দেনমোহর", "মোহরানা", "কাবিন", "maintenance", "dower", "mohr", "kabin"],
    helplines: ["legal_aid"], laws: ["family_courts_2023", "mflo_1961"], next: "mediation",
  },
  {
    id: "family_divorce_custody", topic: "family",
    questionBn: "তালাক বা সন্তানের হেফাজত নিয়ে বিরোধ", questionEn: "A dispute over divorce or child custody",
    answerBn: "তালাক, দাম্পত্য অধিকার ও সন্তানের হেফাজতের বিরোধ পারিবারিক আদালতের বিষয়। প্রতিটি ঘটনার নিয়ম আলাদা হতে পারে, তাই নিজে সিদ্ধান্ত নেওয়ার আগে লিগ্যাল এইড অফিস বা আইনজীবীর পরামর্শ নিন (১৬৬৯৯)।",
    answerEn: "Disputes about divorce, marital rights and child custody go to the family court. The rules can differ from case to case, so take advice from the legal aid office or a lawyer (16699) before deciding.",
    keywords: ["তালাক", "ডিভোর্স", "বিচ্ছেদ", "হেফাজত", "কাস্টডি", "সন্তান নিয়ে গেছে", "divorce", "talaq", "custody", "separation"],
    helplines: ["legal_aid"], laws: ["family_courts_2023", "mflo_1961"], next: "apply",
  },
  {
    id: "land_dispossession", topic: "inheritance",
    questionBn: "জোর করে আমার জমি দখল করেছে", questionEn: "Someone has taken my land by force",
    answerBn: "জমি জবরদখল বা জাল দলিলের বিরুদ্ধে আইন আছে। দলিল, খতিয়ান ও খাজনার রসিদের কপি রাখুন। ভূমি সেবার জন্য ১৬১২২ এবং আইনি সাহায্যের জন্য ১৬৬৯৯-এ ফোন করুন। হুমকি বা মারধর হলে ৯৯৯।",
    answerEn: "There is a law against land grabbing and forged deeds. Keep copies of the deed, record of rights (khatian) and tax receipts. Call 16122 for land services and 16699 for legal help. If there are threats or violence, call 999.",
    keywords: ["দখল", "জবরদখল", "জাল দলিল", "জমি নিয়ে গেছে", "জমি", "জমির", "জমিজমা", "জায়গা জমি", "দলিল নিয়ে", "land", "land dispute", "land grab", "forged deed", "occupied my land", "dokhol"],
    helplines: ["land", "legal_aid"], laws: ["land_crime_2023", "specific_relief_1877"], next: "apply",
  },
  {
    id: "land_inheritance", topic: "inheritance",
    questionBn: "পৈতৃক সম্পত্তির ভাগ পাচ্ছি না", questionEn: "I am not getting my share of inherited property",
    answerBn: "ওয়ারিশ সম্পত্তি ভাগ নিয়ে বিরোধে আদালতে বাঁটোয়ারা চাওয়া যায়, আবার মীমাংসাতেও সমাধান হতে পারে। দলিল, খতিয়ান ও ওয়ারিশ সনদ জোগাড় করুন এবং ১৬৬৯৯-এ পরামর্শ নিন।",
    answerEn: "In a dispute over sharing inherited property you can ask the court for partition, and mediation can also solve it. Gather the deed, khatian and heirship certificate and ask on 16699.",
    keywords: ["ওয়ারিশ", "উত্তরাধিকার", "পৈতৃক", "ভাগ", "বাঁটোয়ারা", "বাটোয়ারা", "ভাইয়ের সাথে", "ভাইদের সাথে", "বোনের ভাগ", "বাবার জমি", "inheritance", "partition", "share of property", "heir"],
    helplines: ["legal_aid", "land"], laws: ["partition_1893", "succession_1925"], next: "mediation",
  },
  {
    id: "land_preemption", topic: "agri_land",
    questionBn: "আমাকে না জানিয়ে জমি বিক্রি করেছে", questionEn: "Land was sold without telling me",
    answerBn: "যৌথ বা পাশের জমি বিক্রিতে আপনার অগ্রক্রয়ের দাবি থাকতে পারে, কিন্তু এমন দাবির সময়সীমা থাকে। তাই দেরি না করে দলিলসহ লিগ্যাল এইড অফিসে যান (১৬৬৯৯)।",
    answerEn: "When joint or adjoining land is sold you may have a pre-emption claim, but such claims have time limits. So go to the legal aid office with your papers without delay (16699).",
    keywords: ["অগ্রক্রয়", "না জানিয়ে বিক্রি", "শরিক", "শরীক", "pre-emption", "preemption", "sold without telling"],
    helplines: ["legal_aid", "land"], laws: ["transfer_property_1882"], next: "apply",
  },
  {
    id: "rent", topic: "rent",
    questionBn: "বাড়িওয়ালা জোর করে বাসা ছাড়তে বলছে", questionEn: "The landlord is forcing me to leave",
    answerBn: "ভাড়ার চুক্তি, ভাড়ার রসিদ ও নোটিশ সংরক্ষণ করুন। জোর করে বের করে দেওয়া বা পানি-বিদ্যুৎ কেটে দেওয়ার মতো ঘটনায় আইনি সাহায্য নিতে ১৬৬৯৯-এ ফোন করুন। হুমকি বা মারধর হলে ৯৯৯।",
    answerEn: "Keep the rent agreement, rent receipts and any notice. For forced eviction or cut utilities, call 16699 for legal help. If there are threats or violence, call 999.",
    keywords: ["ভাড়া", "বাড়িওয়ালা", "ভাড়াটিয়া", "বাসা ছাড়", "জামানত", "অ্যাডভান্স", "rent", "landlord", "tenant", "evict", "deposit"],
    helplines: ["legal_aid"], laws: [], next: "mediation",
  },
  {
    id: "cheque", topic: "cheque",
    questionBn: "চেক বাউন্স হয়েছে, টাকা ফেরত পাচ্ছি না", questionEn: "A cheque bounced and I am not getting my money",
    answerBn: "চেক ডিসঅনার হলে আইনি প্রতিকার আছে, তবে নোটিশ ও মামলার সময়সীমা কড়া। ব্যাংকের ফেরত-স্লিপ ও চেকের কপি রাখুন এবং দেরি না করে ১৬৬৯৯-এ পরামর্শ নিন।",
    answerEn: "There is a legal remedy when a cheque is dishonoured, but the notice and filing deadlines are strict. Keep the bank's return slip and a copy of the cheque, and ask on 16699 without delay.",
    keywords: ["চেক", "বাউন্স", "ডিসঅনার", "ঋণ", "ধার দিয়েছিলাম", "টাকা ফেরত", "cheque", "check bounce", "dishonour", "loan", "debt"],
    helplines: ["legal_aid"], laws: ["negotiable_instruments_1881"], next: "apply",
  },
  {
    id: "parents", topic: "maintenance",
    questionBn: "সন্তানেরা বৃদ্ধ মা-বাবার দেখাশোনা করে না", questionEn: "Children do not look after their elderly parents",
    answerBn: "বৃদ্ধ মা-বাবার ভরণপোষণ নিয়ে আইনি সাহায্য পাওয়া যায়। প্রথমে পরিবারে বা মীমাংসায় সমাধানের চেষ্টা করা যায়। লিগ্যাল এইড অফিসের সাহায্য নিতে ১৬৬৯৯-এ ফোন করুন।",
    answerEn: "Legal help is available for the maintenance of elderly parents. A solution can first be tried within the family or through mediation. Call 16699 for the legal aid office's help.",
    keywords: ["বৃদ্ধ", "মা-বাবা", "বাবা-মা", "পিতা-মাতা", "দেখাশোনা", "elderly parents", "parents maintenance"],
    helplines: ["legal_aid"], laws: [], next: "mediation",
  },
  {
    id: "cyber", topic: "cyber", urgent: true,
    questionBn: "অনলাইনে ছবি ছড়িয়ে ব্ল্যাকমেইল করছে", questionEn: "Someone is blackmailing me online with photos",
    answerBn: "হুমকি বা ব্ল্যাকমেইল হলে এখনই ৯৯৯-এ জানান; নারী বা শিশু হলে ১০৯। টাকা দেবেন না, স্ক্রিনশট ও লিংক সংরক্ষণ করুন, কিছু মুছবেন না। সাইবার অপরাধের বিরুদ্ধে আইন আছে; আইনি সাহায্যের জন্য ১৬৬৯৯।",
    answerEn: "If there are threats or blackmail, report it now on 999; for women or children, 109. Do not pay, save screenshots and links, and do not delete anything. There is a law against cyber crime; for legal help, call 16699.",
    keywords: ["ব্ল্যাকমেইল", "ছবি ছড়িয়ে", "ফেসবুক", "অনলাইন", "হ্যাক", "আইডি", "ভিডিও ছেড়ে দেবে", "blackmail", "online", "facebook", "hacked", "nude", "photos"],
    helplines: ["emergency", "women_children", "legal_aid"], laws: ["cyber_2026"], next: "call",
  },
  {
    id: "labour", topic: "other",
    questionBn: "মালিক বেতন দিচ্ছে না বা চাকরি থেকে বের করে দিয়েছে", questionEn: "My employer is not paying wages or fired me",
    answerBn: "বকেয়া মজুরি, ছাঁটাই বা কর্মস্থলে আঘাতের বিষয়ে শ্রমিকদের অধিকার আইনে আছে। নিয়োগপত্র, হাজিরা ও বেতনের প্রমাণ রাখুন এবং ১৬৬৯৯-এ পরামর্শ নিন।",
    answerEn: "Workers' rights on unpaid wages, dismissal and injury at work are set out in law. Keep your appointment letter, attendance and pay records, and ask on 16699.",
    keywords: ["বেতন", "মজুরি", "চাকরি থেকে", "ছাঁটাই", "মালিক", "কারখানা", "wages", "salary", "fired", "employer", "factory", "labour"],
    helplines: ["legal_aid"], laws: ["labour_2006"], next: "apply",
  },
  {
    id: "bot_identity", topic: "aid",
    questionBn: "আপনি কি মানুষ?", questionEn: "Are you a person?",
    answerBn: "না, আমি কর্মপথের একটি সহকারী, মানুষ নই। আমি সাধারণ আইনি তথ্য দিই; সিদ্ধান্ত নেন লিগ্যাল এইড অফিস ও আইনজীবী। মানুষের সঙ্গে কথা বলতে ১৬৬৯৯-এ ফোন করুন।",
    answerEn: "No, I am a KormoPath assistant, not a person. I give general legal information; the legal aid office and lawyers make decisions. To talk to a person, call 16699.",
    keywords: ["আপনি কে", "মানুষ", "রোবট", "এআই", "who are you", "are you human", "robot", "ai"],
    helplines: ["legal_aid"], laws: [], next: "call",
  },
];

// ---------------------------------------------------------------------------------------------
// Matching and the rule-based answer
// ---------------------------------------------------------------------------------------------

const BN = "০১২৩৪৫৬৭৮৯";
const norm = (s: string): string => (s ?? "").normalize("NFC").replace(/[০-৯]/g, (d) => String(BN.indexOf(d))).toLowerCase();

/** Best inquiry for the text (and optional topic), or null. Topic alone picks that topic's first inquiry. */
export function matchInquiry(text: string, topic?: string | null): Inquiry | null {
  const t = norm(text);
  let best: { q: Inquiry; score: number } | null = null;
  for (const q of INQUIRIES) {
    let score = 0;
    for (const k of q.keywords) if (t.includes(norm(k))) score += k.length >= 5 ? 2 : 1;
    if (topic && q.topic === topic) score += 1.5;
    if (q.urgent && score > 0) score += 0.5;
    if (score > 0 && (!best || score > best.score)) best = { q, score };
  }
  return best && best.score >= 1.5 ? best.q : null;
}

export interface RuleAnswer {
  answer: string;
  lang: "bn" | "en";
  crisis: boolean;
  helplines: HelplineId[];
  laws: LawId[];
  next: NextStep;
  inquiryId: string | null;
  severity: string;
  categoryId: string | null;
}

const lawNames = (ids: LawId[], lang: "bn" | "en") => ids.map((id) => (lang === "bn" ? LAWS[id].bn : LAWS[id].en));

/** Deterministic answer: crisis first, then the best inquiry, then the chosen category, then the general one. */
export function ruleAnswer(text: string, opts: { lang?: "bn" | "en"; topic?: string | null } = {}): RuleAnswer {
  const lang = opts.lang === "en" ? "en" : "bn";
  const crisis = isCrisis(text);
  const sev = classifySeverity(text, { categoryId: opts.topic ?? null });
  const q = matchInquiry(text, opts.topic) ?? (crisis ? INQUIRIES.find((x) => x.id === "safety_now")! : null);
  const category = PROBLEM_CATEGORIES.find((c) => c.id === (q?.topic ?? opts.topic)) ?? null;

  let body: string;
  let helplines: HelplineId[];
  let laws: LawId[];
  let next: NextStep;
  if (q) {
    body = lang === "bn" ? q.answerBn : q.answerEn;
    helplines = q.helplines; laws = q.laws; next = q.next;
  } else if (category) {
    body = lang === "bn"
      ? `আপনার বিষয়টি "${category.bn}"-এর মধ্যে পড়তে পারে। ঘটনার তারিখ, কাগজপত্র আর কারা জড়িত তা লিখে রাখুন, তারপর ১৬৬৯৯-এ ফোন করে লিগ্যাল এইড অফিসের পরামর্শ নিন। চাইলে এখানে আবেদনের খসড়া বানাতে পারেন।`
      : `Your matter may fall under "${category.en}". Write down the dates, papers and who is involved, then call 16699 for the legal aid office's advice. You can also make an application draft here.`;
    helplines = ["legal_aid"]; laws = []; next = "apply";
  } else {
    body = lang === "bn"
      ? "আপনার সমস্যাটা আরেকটু খুলে বলুন: কী হয়েছে, কবে, আর কার সঙ্গে। অথবা ওপরের বিষয়গুলো থেকে একটি বেছে নিন। সরাসরি পরামর্শ চাইলে ১৬৬৯৯-এ ফোন করুন।"
      : "Tell me a little more: what happened, when, and with whom. Or pick one of the topics above. For direct advice, call 16699.";
    helplines = ["legal_aid"]; laws = []; next = "none";
  }

  if (crisis && !/(999|৯৯৯|109|১০৯)/.test((body.split(/[।.]/)[0] ?? ""))) {
    body = (lang === "bn" ? "আপনি এখন বিপদে থাকলে ৯৯৯-এ ফোন করুন; নারী বা শিশু নির্যাতনে ১০৯। " : "If you are in danger now, call 999; for violence against women or children, 109. ") + body;
    helplines = Array.from(new Set<HelplineId>(["emergency", "women_children", ...helplines]));
  }
  if (laws.length) body += lang === "bn" ? ` সংশ্লিষ্ট আইন: ${lawNames(laws, "bn").join("; ")}।` : ` Related law: ${lawNames(laws, "en").join("; ")}.`;
  body += " " + (lang === "bn" ? NOT_LEGAL_ADVICE_BN : NOT_LEGAL_ADVICE_EN);

  return { answer: body, lang, crisis, helplines, laws, next, inquiryId: q?.id ?? null, severity: sev.severity, categoryId: category?.id ?? null };
}

/** The helpline records for a list of ids, in order. */
export const helplinesFor = (ids: HelplineId[]) => ids.map((id) => HELPLINES.find((h) => h.id === id)!).filter(Boolean);
