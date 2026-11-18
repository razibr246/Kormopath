export type PathId = "freelance" | "study" | "farm" | "home";

export interface PathAction {
  id: string;
  title: string;
  description: string;
  app: string;
  href: string;
}

export const PATHS: { id: PathId; title: string; description: string; queryLabel: string; queryPlaceholder: string; actions: PathAction[] }[] = [
  {
    id: "freelance",
    title: "ফ্রিল্যান্স কাজ ও ক্যারিয়ার",
    description: "দক্ষতার প্রমাণ তৈরি করুন, কাজ খুঁজুন, অফার ও পেমেন্টের প্রস্তুতি নিন।",
    queryLabel: "চাকরি, গিগ বা প্রশিক্ষণ খুঁজুন",
    queryPlaceholder: "যেমন: বাংলাদেশি junior frontend remote internship",
    actions: [
      { id: "audit", title: "দক্ষতার প্রমাণ তৈরি", description: "CV ও কাজের নমুনা থেকে যাচাইযোগ্য skill বের করুন।", app: "KormoPath Workspace", href: "/workspace" },
      { id: "practice", title: "চ্যালেঞ্জ ও ভাইভা অনুশীলন", description: "সমস্যা সমাধান করে Passport-এর জন্য প্রমাণ তৈরি করুন।", app: "KormoPath Workspace", href: "/workspace" },
      { id: "packages", title: "Service Pack তৈরি", description: "কাজের scope, deliverable ও timeline গুছিয়ে client-ready offer করুন।", app: "ChuktiGuard", href: "/chuktiguard" },
      { id: "payout", title: "পেমেন্ট ও ফি তুলনা", description: "চ্যানেলভিত্তিক fee ও net amount-এর deterministic হিসাব দেখুন।", app: "FeeGuard BD", href: "/feeguard" },
    ],
  },
  {
    id: "study",
    title: "বিশ্ববিদ্যালয় ও পড়াশোনা",
    description: "নিজের যোগ্যতা মেলান, official circular যাচাই করুন, আবেদন ও interview প্রস্তুতি নিন।",
    queryLabel: "ভর্তি, বৃত্তি বা internship খুঁজুন",
    queryPlaceholder: "যেমন: Bangladesh undergraduate engineering scholarship 2026",
    actions: [
      { id: "admission", title: "ভর্তি পরিকল্পনা", description: "প্রোফাইল ও official circular দিয়ে shortlist এবং checklist সাজান।", app: "AdmitBuddy", href: "/admitbuddy" },
      { id: "interview", title: "ভাইভা অনুশীলন", description: "উত্তর দিন, feedback নিন, অনুশীলনের অগ্রগতি রাখুন।", app: "Probaho Coach", href: "/probaho" },
      { id: "passport", title: "কাজের নমুনা ও skill proof", description: "নিজের প্রমাণভিত্তিক কাজ গুছিয়ে শেয়ারের প্রস্তুতি নিন।", app: "KormoPath Workspace", href: "/workspace" },
    ],
  },
  {
    id: "farm",
    title: "কৃষি ও বাজার",
    description: "নিজের শোনা দাম দিয়ে লাভ হিসাব করুন, আবহাওয়া ও কৃষি সহায়তা দেখুন।",
    queryLabel: "কৃষি প্রশিক্ষণ, সরকারি সহায়তা বা বাজার তথ্য খুঁজুন",
    queryPlaceholder: "যেমন: Bangladesh farmer training government 2026",
    actions: [
      { id: "margin", title: "হাট বনাম মোকাম হিসাব", description: "পরিবহন, কমিশন ও ঘাটতি বাদ দিয়ে নিজের সংখ্যায় হিসাব করুন।", app: "HaatBazar AI", href: "/haatbazar" },
      { id: "weather", title: "আবহাওয়া ও স্প্রে সময়", description: "নির্বাচিত জেলার পূর্বাভাস দেখে স্প্রে-উপযোগী সময় যাচাই করুন।", app: "HaatBazar AI", href: "/haatbazar" },
      { id: "call", title: "কৃষি সহায়তা", description: "ফসলের রোগ ও ব্যবহারবিধি কৃষি কর্মকর্তার সাথে যাচাই করুন।", app: "কৃষি কল সেন্টার", href: "tel:16123" },
    ],
  },
  {
    id: "home",
    title: "ঘরের হিসাব ও স্বাস্থ্য",
    description: "বাজেট, পণ্য কেনা এবং প্রেসক্রিপশনের লেখা আলাদা ও নিরাপদভাবে সামলান।",
    queryLabel: "কোন পণ্য বা মডেল কিনতে চান?",
    queryPlaceholder: "যেমন: rice cooker 1.8L Bangladesh",
    actions: [
      { id: "budget", title: "মাসিক বাজেট গুছান", description: "লেনদেন যাচাই করে সংরক্ষণ করুন; আয়-ব্যয়ের সারাংশ দেখুন।", app: "Shohoj Budget", href: "/shohoj-budget" },
      { id: "product", title: "পণ্যের দাম তুলনা", description: "ওয়েবে পাওয়া অফার ও সূত্র দেখুন; বিক্রেতার সাইটে দাম মিলিয়ে নিন।", app: "Shohoj Budget", href: "/shohoj-budget" },
      { id: "prescription", title: "প্রেসক্রিপশন বুঝুন", description: "লেখা মিলিয়ে পড়ুন; রোগ নির্ণয় বা ওষুধ পরিবর্তনের জন্য নয়।", app: "MediScan BD", href: "/mediscan" },
      { id: "healthline", title: "স্বাস্থ্য সহায়তা", description: "জরুরি অবস্থায় 999; স্বাস্থ্য বাতায়ন 16263।", app: "স্বাস্থ্যসেবা", href: "tel:16263" },
    ],
  },
];

export const OPPORTUNITY_STATUSES = {
  saved: "সংরক্ষিত",
  drafting: "প্রস্তুতি",
  applied: "আবেদন করেছি",
  interview: "ইন্টারভিউ",
  response: "উত্তর পেয়েছি",
  accepted: "নির্বাচিত হয়েছি",
  closed: "বন্ধ",
} as const;

export type OpportunityStatus = keyof typeof OPPORTUNITY_STATUSES;

export interface OpportunityProgress {
  status: OpportunityStatus;
  followUp: string;
  note: string;
  checklist?: string[];
}

export const MAX_SAVED_OPPORTUNITIES = 100;
export const OPPORTUNITY_TITLE_LIMIT = 160;
export const OPPORTUNITY_NOTE_LIMIT = 500;

export interface SavedOpportunity extends OpportunityProgress {
  id: string;
  title: string;
  url: string;
  track: PathId;
  savedAt: string;
}

export interface ApplicationDocItem {
  id: string;
  labelBn: string;
  labelEn: string;
  detailBn: string;
  appHref?: string;
  appLabel?: string;
}

export const APPLICATION_CHECKLIST_TEMPLATE: ApplicationDocItem[] = [
  { id: "cv", labelBn: "সিভি / রিজিউমে", labelEn: "CV / Resume", detailBn: "কাজের অভিজ্ঞতা ও প্রজেক্টের তালিকা", appHref: "/workspace", appLabel: "Workspace-এ তৈরি করুন" },
  { id: "transcript", labelBn: "একাডেমিক সনদ ও মার্কশিট", labelEn: "Transcripts & Certificates", detailBn: "এসএসসি, এইচএসসি বা স্নাতক সনদ স্ক্যান" },
  { id: "nid", labelBn: "এনআইডি / পাসপোর্ট কপি", labelEn: "NID / Passport", detailBn: "পরিচয় প্রমাণের স্পষ্ট ডিজিটাল কপি" },
  { id: "sop", labelBn: "উদ্দেশ্যমূলক বিবৃতি / কভার লেটার", labelEn: "SOP / Cover Letter", detailBn: "কেন আপনি উপযুক্ত তা পরিষ্কার করে লেখা", appHref: "/admitbuddy", appLabel: "AdmitBuddy SOP চেক" },
  { id: "ref", labelBn: "সুপারিশপত্র / রেফারেন্স", labelEn: "Recommendation Letters", detailBn: "শিক্ষক বা পূর্বতন সুপারভাইজারের সুপারিশ" },
  { id: "portfolio", labelBn: "কাজের নমুনা / গিটহাব লিংক", labelEn: "Portfolio / GitHub", detailBn: "লাইভ প্রোজেক্ট লিংক ও কোড রিপোজিটরি", appHref: "/workspace", appLabel: "Passport-এ লিংক" },
  { id: "english", labelBn: "ইংরেজি পরীক্ষা বা ভাষার সনদ", labelEn: "Language Certificate", detailBn: "IELTS / Duolingo / প্রাতিষ্ঠানিক মাধ্যম সনদ" },
  { id: "fee", labelBn: "আবেদন ফি ও রসিদ সংরক্ষণ", labelEn: "Application Fee Receipt", detailBn: "চালান, ব্যাংক ড্রাফট বা বিকাশ/নগদ ট্রানজেকশন আইডি" },
];

export type OpportunityCategory = "job" | "internship" | "scholarship" | "grant" | "agri";

export interface VerifiedOpportunity {
  id: string;
  titleBn: string;
  titleEn: string;
  providerBn: string;
  providerEn: string;
  category: OpportunityCategory;
  path: PathId;
  url: string;
  badgeBn: string;
  badgeEn: string;
  descriptionBn: string;
  descriptionEn: string;
  eligibilityBn: string;
  eligibilityEn: string;
  deadlineNoteBn: string;
  deadlineNoteEn: string;
  financialBn: string;
  financialEn: string;
  verifiedSource: string;
  verifiedDate: string;
  tags: string[];
}

export const VERIFIED_OPPORTUNITIES: VerifiedOpportunity[] = [
  {
    id: "bpsc-bcs",
    titleBn: "বিসিএস পরীক্ষা ও ক্যাডার সার্কুলার নির্দেশিকা",
    titleEn: "BPSC Bangladesh Civil Service (BCS) Circular Guide",
    providerBn: "বাংলাদেশ সরকারি কর্ম কমিশন (BPSC)",
    providerEn: "Bangladesh Public Service Commission",
    category: "job",
    path: "study",
    url: "http://bpsc.teletalk.com.bd",
    badgeBn: "সরকারি ক্যাডার চাকরি",
    badgeEn: "Government Cadre Job",
    descriptionBn: "প্রশাসন, পুলিশ, পররাষ্ট্র, কর, কাস্টমস ও সাধারণ ক্যাডারের জন্য বার্ষিক সার্কুলার ও অনলাইন আবেদন পোর্টাল।",
    descriptionEn: "Official annual circular and online application portal for Administration, Police, Foreign, and general cadres.",
    eligibilityBn: "স্বীকৃত বিশ্ববিদ্যালয় থেকে ৪ বছর মেয়াদি স্নাতক বা স্নাতক (সম্মান) ডিগ্রি।",
    eligibilityEn: "4-year Bachelor's degree from a recognized university.",
    deadlineNoteBn: "বিপিএসসি-এর সরকারি বিজ্ঞপ্তির তফসিল অনুযায়ী নির্ধারিত হয়",
    deadlineNoteEn: "As per official BPSC gazette circular schedules",
    financialBn: "জাতীয় বেতন স্কেল ২০১৫ অনুযায়ী গ্রেড-৯ (বেসিক ২২,০০০ টাকা + ভাতা)",
    financialEn: "National Pay Scale 2015 Grade-9 (Basic 22,000 BDT + allowances)",
    verifiedSource: "bpsc.gov.bd · যাচাই: নভেম্বর ২০২৬",
    verifiedDate: "2026-11-18",
    tags: ["govt", "bcs", "cadre", "civil service", "bpsc"],
  },
  {
    id: "idea-startup-grant",
    titleBn: "আইসিটি বিভাগ iDEA স্টার্টআপ ও ইনোভেশন সিড ফান্ড",
    titleEn: "ICT Division iDEA Startup & Innovation Seed Grant",
    providerBn: "বাংলাদেশ কম্পিউটার কাউন্সিল ও আইসিটি বিভাগ",
    providerEn: "BCC & Information and Communication Technology Division",
    category: "grant",
    path: "freelance",
    url: "https://idea.gov.bd",
    badgeBn: "১০ লক্ষ টাকা সরকারি অনুদান",
    badgeEn: "Up to 10 Lakh BDT Seed Grant",
    descriptionBn: "তথ্যপ্রযুক্তিভিত্তিক উদ্ভাবনী ধারণা ও স্টার্টআপদের জন্য সরকারি অনুদান, মেন্টরশিপ ও কো-ওয়ার্কিং স্পেস সুবিধা।",
    descriptionEn: "Government seed funding, legal mentoring, and co-working support for IT-enabled Bangladeshi startups.",
    eligibilityBn: "বাংলাদেশি নাগরিক বা দল যাদের একটি কার্যকরী প্রোটোটাইপ বা ডিজিটাল সমাধান আছে।",
    eligibilityEn: "Bangladeshi citizens or teams with a working digital prototype or proof-of-concept.",
    deadlineNoteBn: "iDEA অফিসিয়াল পোর্টালে রাউন্ডভিত্তিক কল খোলা হয়",
    deadlineNoteEn: "Round-based applications opened on the official iDEA portal",
    financialBn: "১০,০০,০০০ (দশ লক্ষ) টাকা পর্যন্ত সমমূল্যের অফেরতযোগ্য অনুদান",
    financialEn: "Up to 1,000,000 BDT non-dilutive government grant",
    verifiedSource: "idea.gov.bd · যাচাই: নভেম্বর ২০২৬",
    verifiedDate: "2026-11-18",
    tags: ["tech", "startup", "grant", "ict", "idea", "seed funding"],
  },
  {
    id: "commonwealth-scholarship",
    titleBn: "কমনওয়েলথ স্কলারশিপ (যুক্তরাজ্য মাস্টার্স ও পিএইচডি)",
    titleEn: "Commonwealth Scholarships for Bangladesh (UK FCDO)",
    providerBn: "কমনওয়েলথ স্কলারশিপ কমিশন ও এফসিডিও",
    providerEn: "Commonwealth Scholarship Commission & UK FCDO",
    category: "scholarship",
    path: "study",
    url: "https://cscuk.fcdo.gov.uk/scholarships/commonwealth-masters-scholarships/",
    badgeBn: "১০০% ফুল-ফান্ডেড স্কলারশিপ",
    badgeEn: "100% Fully Funded UK Masters",
    descriptionBn: "যুক্তরাজ্যের শীর্ষ বিশ্ববিদ্যালয়গুলোতে পূর্ণ অর্থায়নে মাস্টার্স বা পিএইচডি করার সুযোগ।",
    descriptionEn: "Fully funded postgraduate master's and doctoral degrees at world-leading UK universities.",
    eligibilityBn: "কমপক্ষে দ্বিতীয় শ্রেণি বা সমমানের সিজিপিএ স্নাতক ডিগ্রি এবং কমনওয়েলথ দেশের স্থায়ী নাগরিক।",
    eligibilityEn: "At least upper second class equivalent bachelor's degree; Bangladeshi citizen.",
    deadlineNoteBn: "প্রতি বছর সেপ্টেম্বর-অক্টোবর মাসে পরবর্তী শিক্ষাবর্ষের আবেদন শুরু হয়",
    deadlineNoteEn: "Annual cycle typically opens September–October for next academic year",
    financialBn: "পূর্ণ টিউশন ফি, বিমানের আসা-যাওয়ার টিকিট, মাসিক প্রায় ১,৩৪৭ পাউন্ড ভাতা ও থিসিস গ্রান্ট",
    financialEn: "Full tuition, return airfare, monthly stipend (~£1,347–£1,652), warm clothes allowance",
    verifiedSource: "cscuk.fcdo.gov.uk · যাচাই: নভেম্বর ২০২৬",
    verifiedDate: "2026-11-18",
    tags: ["uk", "masters", "phd", "commonwealth", "scholarship", "fully funded"],
  },
  {
    id: "chevening-scholarship",
    titleBn: "শেভনিং স্কলারশিপ (যুক্তরাজ্য সরকার)",
    titleEn: "Chevening Scholarship for Future Leaders (UK Government)",
    providerBn: "যুক্তরাজ্য পররাষ্ট্র, কমনওয়েলথ ও উন্নয়ন অফিস (FCDO)",
    providerEn: "UK Foreign, Commonwealth & Development Office",
    category: "scholarship",
    path: "study",
    url: "https://www.chevening.org/scholarship/bangladesh/",
    badgeBn: "লিডারশিপ মাস্টার্স ফান্ডিং",
    badgeEn: "Prestigious UK 1-Year Masters",
    descriptionBn: "নেতৃত্বের সম্ভাবনাময় পেশাজীবীদের জন্য যুক্তরাজ্যের যেকোনো বিশ্ববিদ্যালয়ে ১ বছরের মাস্টার্স ডিগ্রি।",
    descriptionEn: "One-year fully funded master's program in the UK for individuals with demonstrable leadership potential.",
    eligibilityBn: "স্নাতক ডিগ্রি এবং কমপক্ষে ২ বছরের (২৮০০ ঘণ্টা) কাজের অভিজ্ঞতা।",
    eligibilityEn: "Undergraduate degree and at least 2 years (2,800 hours) of work experience.",
    deadlineNoteBn: "প্রতি বছর আগস্ট থেকে নভেম্বর মাসের প্রথম সপ্তাহ পর্যন্ত আবেদন চলে",
    deadlineNoteEn: "Annual window runs August to early November",
    financialBn: "বিশ্ববিদ্যালয়ের সম্পূর্ণ ফি, মাসিক জীবনযাত্রার ভাতা ও রিটার্ন এয়ার টিকিট",
    financialEn: "Full university tuition, monthly living allowance, travel costs to and from UK",
    verifiedSource: "chevening.org/scholarship/bangladesh/ · যাচাই: নভেম্বর ২০২৬",
    verifiedDate: "2026-11-18",
    tags: ["chevening", "uk", "masters", "leadership", "fcdo"],
  },
  {
    id: "mext-japan",
    titleBn: "জাপান সরকার মেক্সট স্কলারশিপ (MEXT Japan)",
    titleEn: "Japanese Government (MEXT) Embassy Recommendation Scholarship",
    providerBn: "জাপান দূতাবাস ও শিক্ষা মন্ত্রণালয় জাপান",
    providerEn: "Embassy of Japan in Dhaka & MEXT",
    category: "scholarship",
    path: "study",
    url: "https://www.bd.emb-japan.go.jp",
    badgeBn: "জাপান সরকারের বৃত্তি",
    badgeEn: "Monbukagakusho Japan Grant",
    descriptionBn: "জাপানি বিশ্ববিদ্যালয়ে আন্ডারগ্র্যাজুয়েট ও পোস্টগ্র্যাজুয়েট গবেষণা ও ডিগ্রির জন্য সম্পূর্ণ সরকারি অর্থায়ন।",
    descriptionEn: "Undergraduate and research student scholarships funded by the Japanese Government.",
    eligibilityBn: "আন্ডারগ্র্যাজুয়েটের জন্য এইচএসসি এবং রিসার্চের জন্য ১৬ বছরের নিয়মিত শিক্ষাজীবন সম্পন্ন।",
    eligibilityEn: "HSC for undergrad; 16 years completed education for postgraduate research.",
    deadlineNoteBn: "প্রতি বছর এপ্রিল-মে মাসে ঢাকাস্থ জাপান দূতাবাসের মাধ্যমে আবেদন গ্রহণ করা হয়",
    deadlineNoteEn: "Annual embassy screening round opens in April–May",
    financialBn: "পূর্ণ টিউশন মওকুফ, ঢাকা-টোকিও টিকিট, মাসিক প্রায় ১,৪৩,০০০-১,৪৫,০০০ ইয়েন স্টাইপেন্ড",
    financialEn: "Full tuition waiver, roundtrip airfare, ~143,000–145,000 JPY monthly allowance",
    verifiedSource: "bd.emb-japan.go.jp · যাচাই: নভেম্বর ২০২৬",
    verifiedDate: "2026-11-18",
    tags: ["japan", "mext", "asia", "tokyo", "scholarship", "research"],
  },
  {
    id: "daad-germany",
    titleBn: "ডিএএডি স্কলারশিপ (জার্মানি স্নাতকোত্তর ও পিএইচডি)",
    titleEn: "DAAD EPOS Scholarships for Developing Countries (Germany)",
    providerBn: "জার্মান অ্যাকাডেমিক এক্সচেঞ্জ সার্ভিস (DAAD)",
    providerEn: "German Academic Exchange Service",
    category: "scholarship",
    path: "study",
    url: "https://www.daad.de",
    badgeBn: "জার্মানি সরকারি মাস্টার্স",
    badgeEn: "German Master & Doctoral Funding",
    descriptionBn: "উন্নয়নমুখী বিষয়ে জার্মানির স্বনামধন্য বিশ্ববিদ্যালয়ে আন্তর্জাতিক মানের উচ্চশিক্ষা ও ভাতা।",
    descriptionEn: "Development-related postgraduate courses in German universities with comprehensive living allowances.",
    eligibilityBn: "স্নাতক ডিগ্রি এবং উন্নয়নমূলক বা সংশ্লিষ্ট ক্ষেত্রে কমপক্ষে ২ বছরের চাকরির অভিজ্ঞতা।",
    eligibilityEn: "Bachelor's degree with at least 2 years of relevant professional experience.",
    deadlineNoteBn: "বিশ্ববিদ্যালয় ও কোর্সভেদে আগস্ট থেকে ডিসেম্বরের মধ্যে আবেদনের শেষ সময়",
    deadlineNoteEn: "Course-specific deadlines typically ranging from August to December",
    financialBn: "মাসিক ৯৩৪ ইউরো (মাস্টার্স) বা ১৩০০ ইউরো (পিএইচডি), স্বাস্থ্যবীমা ও ভ্রমণ ভাতা",
    financialEn: "Monthly €934 (Masters) / €1,300 (PhD), health insurance, travel allowance",
    verifiedSource: "daad.de · যাচাই: নভেম্বর ২০২৬",
    verifiedDate: "2026-11-18",
    tags: ["germany", "daad", "europe", "engineering", "epos"],
  },
  {
    id: "fulbright-usa",
    titleBn: "ফুলব্রাইট ফরেন স্টুডেন্ট প্রোগ্রাম (যুক্তরাষ্ট্র)",
    titleEn: "Fulbright Foreign Student Program (US Department of State)",
    providerBn: "যুক্তরাষ্ট্র দূতাবাস ঢাকা ও স্টেট ডিপার্টমেন্ট",
    providerEn: "US Embassy Dhaka & US Department of State",
    category: "scholarship",
    path: "study",
    url: "https://bd.usembassy.gov",
    badgeBn: "যুক্তরাষ্ট্র মাস্টার্স ফেলোশিপ",
    badgeEn: "Fully Funded US Master's Degree",
    descriptionBn: "যুক্তরাষ্ট্রের শীর্ষস্থানীয় বিশ্ববিদ্যালয়ে মাস্টার্স ডিগ্রি অর্জনের জন্য খ্যাতনামা আন্তর্জাতিক বৃত্তি।",
    descriptionEn: "Enables young professionals in Bangladesh to study in the United States for master's degrees.",
    eligibilityBn: "৪ বছরের স্নাতক ডিগ্রি এবং স্নাতক সম্পন্ন করার পর কমপক্ষে ২ বছরের পেশাগত অভিজ্ঞতা।",
    eligibilityEn: "4-year bachelor's degree with at least 2 years post-graduation professional experience.",
    deadlineNoteBn: "সাধারণত প্রতি বছর ফেব্রুয়ারি-এপ্রিলে আবেদন শুরু হয়",
    deadlineNoteEn: "Annual application window opens typically February to April",
    financialBn: "সম্পূর্ণ টিউশন ফি, লিভিং স্টাইপেন্ড, স্বাস্থ্যবীমা এবং আসা-যাওয়ার বিমান টিকিট",
    financialEn: "Full tuition, living stipend, health benefit plan, and international airfare",
    verifiedSource: "bd.usembassy.gov · যাচাই: নভেম্বর ২০২৬",
    verifiedDate: "2026-11-18",
    tags: ["usa", "fulbright", "masters", "ivy league", "fellowship"],
  },
  {
    id: "gsoc-internship",
    titleBn: "গুগল সামার অব কোড (GSoC গ্লোবাল ওপেন সোর্স প্রোগ্রাম)",
    titleEn: "Google Summer of Code (GSoC Remote Open Source)",
    providerBn: "গুগল ওপেন সোর্স প্রোগ্রামস অফিস",
    providerEn: "Google Open Source Programs Office",
    category: "internship",
    path: "freelance",
    url: "https://summerofcode.withgoogle.com",
    badgeBn: "$1500–$3000 USD গ্লোবাল স্টাইপেন্ড",
    badgeEn: "Global Open Source Fellowship",
    descriptionBn: "লিনাক্স, অ্যাপাচি, পাইথনসহ শীর্ষস্থানীয় আন্তর্জাতিক ওপেন সোর্স সফটওয়্যার প্রজেক্টে রিমোট কোডিং কাজ।",
    descriptionEn: "Global online program bringing new developers into open source software development.",
    eligibilityBn: "১৮ বছর বা তদূর্ধ্ব যেকোনো শিক্ষার্থী বা ওপেন-সোর্সে শিক্ষানবিস কোডার।",
    eligibilityEn: "18+ years old, student or open source beginner with coding background.",
    deadlineNoteBn: "প্রতি বছর ফেব্রুয়ারিতে অর্গানাইজেশন ঘোষণা এবং মার্চ-এপ্রিলে শিক্ষার্থী প্রস্তাব জমা",
    deadlineNoteEn: "Organizations announced in February; proposals submitted in March–April",
    financialBn: "কাজের ব্যাপ্তিভেদে $1,500 থেকে $3,000 মার্কিন ডলার সমমূল্যের সরাসরি পেমেন্ট",
    financialEn: "Medium (~$1,500) and Large (~$3,000 USD) stipend based on project size",
    verifiedSource: "summerofcode.withgoogle.com · যাচাই: নভেম্বর ২০২৬",
    verifiedDate: "2026-11-18",
    tags: ["google", "gsoc", "coding", "open source", "remote", "tech"],
  },
  {
    id: "bb-agri-refinance",
    titleBn: "বাংলাদেশ ব্যাংক ৪% রেয়াতি সুদে বিশেষ কৃষি ঋণ স্কিম",
    titleEn: "Bangladesh Bank 4% Concessional Agri Refinance Scheme",
    providerBn: "বাংলাদেশ ব্যাংক (কৃষি ঋণ বিভাগ)",
    providerEn: "Bangladesh Bank Agricultural Credit Department",
    category: "agri",
    path: "farm",
    url: "https://www.bb.org.bd",
    badgeBn: "৪% স্বল্পসুদে কৃষি ঋণ",
    badgeEn: "4% Concessional Farm Credit",
    descriptionBn: "শস্য, শাকসবজি, ফলমূল, মসলা ও ডাল চাষের উৎপাদন বৃদ্ধির লক্ষ্যে বাংলাদেশ ব্যাংকের বিশেষ পুনঃঅর্থায়ন সুবিধা।",
    descriptionEn: "Special refinance facility for grains, spices, oilseeds, and vegetable cultivation at subsidized 4% interest.",
    eligibilityBn: "প্রকৃত চাষী, বর্গাচাষী বা ক্ষুদ্র কৃষক যাদের স্থানীয় কৃষি বা ব্যাংকিং শাখায় ঋণযোগ্য জমি বা রেকর্ড আছে।",
    eligibilityEn: "Genuine farmers, sharecroppers, or agri-entrepreneurs with local bank branch contact.",
    deadlineNoteBn: "বাংলাদেশ ব্যাংকের কৃষি ঋণ নীতিমালার আওতায় সারা বছর তফসিলি ব্যাংকের মাধ্যমে চালু থাকে",
    deadlineNoteEn: "Active year-round across scheduled public and private commercial banks",
    financialBn: "স্বল্প সুদের সরকারি রেয়াতি হারে ঋণ সুবিধা (সাধারণ হারের চেয়ে প্রায় ৫-৬% কম)",
    financialEn: "Subsidized 4% annual interest rate under Bangladesh Bank refinance fund",
    verifiedSource: "bb.org.bd · যাচাই: নভেম্বর ২০২৬",
    verifiedDate: "2026-11-18",
    tags: ["agri", "bangladesh bank", "loan", "farming", "crop loan"],
  },
  {
    id: "dae-farm-machinery",
    titleBn: "কৃষি যান্ত্রিকীকরণ ও সেচ সরঞ্জাম ভর্তুকি কর্মসূচি",
    titleEn: "DAE Farm Mechanization & Irrigation Equipment Subsidy",
    providerBn: "কৃষি সম্প্রসারণ অধিদপ্তর ও কৃষি মন্ত্রণালয়",
    providerEn: "Department of Agricultural Extension (DAE)",
    category: "agri",
    path: "farm",
    url: "https://dae.gov.bd",
    badgeBn: "৫০%–৭০% সরকারি ভর্তুকি",
    badgeEn: "50%–70% Machinery Subsidy",
    descriptionBn: "কম্বাইন হারভেস্টার, রাইস ট্রান্সপ্লান্টার, রিপার ও আধুনিক সেচ যন্ত্রে ৫০% থেকে ৭০% সরকারি আর্থিক সহায়তা।",
    descriptionEn: "Government subsidy on combine harvesters, transplanters, reapers, and modern irrigation tools.",
    eligibilityBn: "কৃষক গ্রুপ, সমবায় সমিতি বা একক কৃষক যিনি উপজেলা কৃষি অফিসের মাধ্যমে আবেদন করেন।",
    eligibilityEn: "Registered farmer groups, cooperatives, or individual farmers via Upazila Agriculture Office.",
    deadlineNoteBn: "উপজেলা কৃষি অফিসে মৌসুমভিত্তিক বরাদ্দ বিজ্ঞপ্তি জারি করা হয়",
    deadlineNoteEn: "Allocated seasonally through local Upazila Agriculture Offices",
    financialBn: "হাওর ও উপকূলীয় এলাকায় ৭০% এবং সাধারণ সমতল এলাকায় ৫০% পর্যন্ত ভর্তুকি",
    financialEn: "Up to 70% in Haor/coastal regions; 50% in general flatlands",
    verifiedSource: "dae.gov.bd · যাচাই: নভেম্বর ২০২৬",
    verifiedDate: "2026-11-18",
    tags: ["dae", "machinery", "subsidy", "combine harvester", "krishi"],
  },
  {
    id: "brainstation-associate",
    titleBn: "ব্রেইন স্টেশন ২৩ অ্যাসোসিয়েট সফটওয়্যার ইঞ্জিনিয়ার নিয়োগ",
    titleEn: "Brain Station 23 Graduate Software Engineer Opportunities",
    providerBn: "Brain Station 23 PLC",
    providerEn: "Brain Station 23 PLC",
    category: "job",
    path: "freelance",
    url: "https://brainstation-23.com/careers/",
    badgeBn: "শীর্ষ বাংলাদেশি আইটি চাকরি",
    badgeEn: "Premier Bangladeshi Tech Job",
    descriptionBn: "ফ্রেশ গ্র্যাজুয়েট ও জুনিয়র ডেভেলপারদের জন্য ফুল-টাইম সফটওয়্যার ইঞ্জিনিয়ারিং, ক্লাউড ও এআই পদ।",
    descriptionEn: "Full-time software engineering and cloud roles for fresh CS/IT graduates and junior developers.",
    eligibilityBn: "সিএসই বা সমমানের ইঞ্জিনিয়ারিং ডিগ্রি, ডেটা স্ট্রাকচার, অ্যালগরিদম ও যেকোনো একটি প্রোগ্রামিং ভাষায় দক্ষতা।",
    eligibilityEn: "CSE or equivalent degree, strong foundation in data structures, algorithms, and web/cloud tech.",
    deadlineNoteBn: "প্রতিষ্ঠানটির ক্যারিয়ার পোর্টালে সারাবছর ব্যাচভিত্তিক সার্কুলার প্রকাশিত হয়",
    deadlineNoteEn: "Batch circulars posted throughout the year on the official career site",
    financialBn: "বাজার-উপযোগী প্রারম্ভিক বেতন, প্রভিডেন্ট ফান্ড, গ্র্যাচুইটি ও বার্ষিক ইনসেন্টিভ",
    financialEn: "Competitive entry salary with gratuity, provident fund, and project bonuses",
    verifiedSource: "brainstation-23.com/careers/ · যাচাই: নভেম্বর ২০২৬",
    verifiedDate: "2026-11-18",
    tags: ["tech", "job", "software engineer", "dhaka", "cse"],
  },
  {
    id: "turkiye-burslari",
    titleBn: "তুর্কিয়ে বুরসলারি গভর্নমেন্ট স্কলারশিপ (তুরস্ক)",
    titleEn: "Türkiye Bursları Government Scholarships (Turkey)",
    providerBn: "তুর্কি সরকার (YTB)",
    providerEn: "Presidency for Turks Abroad and Related Communities",
    category: "scholarship",
    path: "study",
    url: "https://www.turkiyeburslari.gov.tr",
    badgeBn: "ফুল-ফান্ডেড তুর্কি বৃত্তি",
    badgeEn: "Full Turkish Gov Scholarship",
    descriptionBn: "তুরস্কের স্বনামধন্য বিশ্ববিদ্যালয়ে স্নাতক, মাস্টার্স ও পিএইচডির জন্য সম্পূর্ণ অর্থায়ন ও ফ্রি তুর্কি ভাষা কোর্স।",
    descriptionEn: "Undergraduate, master's, and doctoral studies in Turkey with full tuition and accommodation covered.",
    eligibilityBn: "আন্ডারগ্র্যাজুয়েটের জন্য কমপক্ষে ৭০% নম্বর এবং মাস্টার্স/পিএইচডির জন্য ৭৫% নম্বর।",
    eligibilityEn: "Minimum 70% academic achievement for undergrad, 75% for graduate applicants.",
    deadlineNoteBn: "প্রতি বছর ১০ জানুয়ারি থেকে ২০ ফেব্রুয়ারি পর্যন্ত আন্তর্জাতিক আবেদন গ্রহণ করা হয়",
    deadlineNoteEn: "Annual window is January 10 to February 20",
    financialBn: "১০০% বিশ্ববিদ্যালয় ফি, ফ্রি বিশ্ববিদ্যালয় ডরমিটরি, মাসিক স্টাইপেন্ড ও স্বাস্থ্যবীমা",
    financialEn: "100% tuition, free university dormitory, monthly stipend, health insurance, flights",
    verifiedSource: "turkiyeburslari.gov.tr · যাচাই: নভেম্বর ২০২৬",
    verifiedDate: "2026-11-18",
    tags: ["turkey", "scholarship", "undergraduate", "masters", "phd"],
  },
];

export interface OpportunityBoardState {
  path: PathId;
  completedByPath: Partial<Record<PathId, string[]>>;
  saved: SavedOpportunity[];
}

export const EMPTY_BOARD: OpportunityBoardState = { path: "freelance", completedByPath: {}, saved: [] };

export function normalizeOpportunityUrl(value: string): string | null {
  try {
    const url = new URL(value.trim());
    if ((url.protocol === "https:" || url.protocol === "http:") && !url.username && !url.password) return url.href;
  } catch {
    // An opportunity must link to an external web page.
  }
  return null;
}

export function isOpportunityStatus(value: unknown): value is OpportunityStatus {
  return typeof value === "string" && Object.hasOwn(OPPORTUNITY_STATUSES, value);
}

export function isFollowUpDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || value.startsWith("0000")) return false;
  const date = new Date(value + "T00:00:00Z");
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function isFollowUpDue(item: OpportunityProgress, today: string): boolean {
  return Boolean(item.followUp) && item.followUp <= today && item.status !== "accepted" && item.status !== "closed";
}

export function opportunitiesToCsv(items: SavedOpportunity[]): string {
  const headers = ["title", "url", "path", "status", "follow_up_date", "note", "saved_at"];
  const rows = items.map((item) => [item.title, item.url, item.track, item.status, item.followUp, item.note, item.savedAt]);
  return [headers, ...rows].map((row) => row.map((value) => {
    // Quote all cells and neutralize spreadsheet formulas, including after whitespace.
    const safe = /^[\s]*[=+\-@＝＋－＠]|^[\t\r\n]/u.test(value) ? "'" + value : value;
    return `"${safe.replace(/"/g, '""')}"`;
  }).join(",")).join("\r\n");
}

export function sanitizeOpportunityBoard(raw: unknown): OpportunityBoardState | null {
  if (!raw || typeof raw !== "object") return null;
  const value = raw as Record<string, unknown>;
  const path = PATHS.some((item) => item.id === value.path) ? value.path as PathId : null;
  if (!path) return null;
  const completedByPath: Partial<Record<PathId, string[]>> = {};
  for (const candidate of PATHS) {
    const rawIds = (value.completedByPath as Record<string, unknown> | undefined)?.[candidate.id];
    if (Array.isArray(rawIds)) completedByPath[candidate.id] = [...new Set(rawIds.filter((id): id is string => typeof id === "string" && id.length <= 50))].slice(0, 50);
  }
  const saved = Array.isArray(value.saved)
    ? value.saved.flatMap((item): SavedOpportunity[] => {
        if (!item || typeof item !== "object") return [];
        const row = item as Record<string, unknown>;
        if (typeof row.id !== "string" || typeof row.title !== "string" || typeof row.url !== "string" || typeof row.savedAt !== "string" || !PATHS.some((candidate) => candidate.id === row.track)) return [];
        const url = normalizeOpportunityUrl(row.url);
        if (!url) return [];
        const validChecklistIds = new Set(APPLICATION_CHECKLIST_TEMPLATE.map((item) => item.id));
        const checklist = Array.isArray(row.checklist)
          ? row.checklist.filter((id): id is string => typeof id === "string" && validChecklistIds.has(id)).slice(0, 20)
          : [];
        return [{
          id: row.id.slice(0, 80),
          title: row.title.trim().slice(0, OPPORTUNITY_TITLE_LIMIT) || new URL(url).hostname,
          url,
          track: row.track as PathId,
          savedAt: row.savedAt.slice(0, 40),
          status: isOpportunityStatus(row.status) ? row.status : "saved",
          followUp: typeof row.followUp === "string" && isFollowUpDate(row.followUp) ? row.followUp : "",
          note: typeof row.note === "string" ? row.note.slice(0, OPPORTUNITY_NOTE_LIMIT) : "",
          ...(checklist.length > 0 ? { checklist } : {}),
        }];
      }).slice(0, MAX_SAVED_OPPORTUNITIES)
    : [];
  return { path, completedByPath, saved };
}

/** All-day follow-ups can be imported into an existing calendar, without an account. */
export function opportunitiesToIcs(items: SavedOpportunity[], now = new Date()): string {
  const escape = (value: string) => value.replace(/\\/g, "\\\\").replace(/\r\n|\r|\n/g, "\\n").replace(/;/g, "\\;").replace(/,/g, "\\,");
  const stamp = now.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//KormoPath//My Path//BN", "CALSCALE:GREGORIAN", "METHOD:PUBLISH"];
  for (const item of items) {
    if (!isFollowUpDate(item.followUp) || item.status === "accepted" || item.status === "closed") continue;
    const next = new Date(Date.parse(item.followUp + "T00:00:00Z") + 86_400_000).toISOString().slice(0, 10).replace(/-/g, "");
    const url = normalizeOpportunityUrl(item.url);
    lines.push("BEGIN:VEVENT", `UID:${encodeURIComponent(item.id)}@mypath.kormopath`, `DTSTAMP:${stamp}`, `DTSTART;VALUE=DATE:${item.followUp.replace(/-/g, "")}`, `DTEND;VALUE=DATE:${next}`, `SUMMARY:${escape("Follow up: " + item.title)}`, `DESCRIPTION:${escape(item.note)}`);
    if (url) lines.push(`URL:${url}`);
    lines.push("END:VEVENT");
  }
  lines.push("END:VCALENDAR");
  // RFC 5545: fold at 75 UTF-8 octets without splitting Bangla codepoints.
  return lines.map((line) => {
    const folded: string[] = [];
    let part = "";
    let bytes = 0;
    for (const char of line) {
      const size = new TextEncoder().encode(char).length;
      if (bytes + size > 75) { folded.push(part); part = " "; bytes = 1; }
      part += char; bytes += size;
    }
    folded.push(part);
    return folded.join("\r\n");
  }).join("\r\n") + "\r\n";
}
