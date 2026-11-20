/**
 * Verified metadata for KormoPath ecosystem apps.
 * Pure TypeScript domain module — no external imports, 100% deterministic and unit-testable.
 * Used by AppHeader and app cards for citizen reassurance, official statutory citations,
 * helplines, audio summaries, and direct tool navigation.
 */

export interface AppMetadata {
  id: string;
  nameBn: string;
  nameEn: string;
  taglineBn: string;
  taglineEn: string;
  trustBadgeBn: string;
  authorityBn: string;
  authorityUrl?: string;
  lawCitationBn?: string;
  primaryHelpline?: { number: string; label: string; isTollFree: boolean };
  emergencyHelplines?: { number: string; label: string }[];
  keyBenefitsBn: string[];
  speechSummaryBn: string;
  quickLinks: { href: string; labelBn: string }[];
  privacyNoteBn: string;
}

export const APP_METADATA_REGISTRY: Record<string, AppMetadata> = {
  legal: {
    id: "legal",
    nameBn: "আইনি সহায়তা",
    nameEn: "Legal Aid BD",
    taglineBn: "বিনামূল্যে আইনি সাহায্যের পথ",
    taglineEn: "Your path to free government legal aid",
    trustBadgeBn: "সরকারি সেবা (NLASO)",
    authorityBn: "বাংলাদেশ আইনগত সহায়তা অধিদপ্তর (NLASO), আইন ও বিচার বিভাগ",
    authorityUrl: "https://nlaso.gov.bd",
    lawCitationBn: "আইনগত সহায়তা প্রদান আইন, ২০০০ (Act No. 6 of 2000)",
    primaryHelpline: { number: "16699", label: "টোল-ফ্রি জাতীয় আইনি সেবা", isTollFree: true },
    emergencyHelplines: [
      { number: "16699", label: "আইনি সহায়তা (টোল-ফ্রি)" },
      { number: "109", label: "নারী ও শিশু নির্যাতন প্রতিরোধ" },
      { number: "999", label: "জরুরি সেবা (পুলিশ/অ্যাম্বুলেন্স)" },
    ],
    keyBenefitsBn: [
      "১০০% সরকারি খরচে অভিজ্ঞ প্যানেল আইনজীবী নিয়োগ",
      "আদালতের কোর্ট ফি ও আনুষঙ্গিক মামলার সব খরচ সরকার বহন করে",
      "মামলা না করে আদালতের বাইরে আপস-মীমাংসা (ADR / সালিশ)",
      "স্বয়ংক্রিয় আইনি আবেদন খসড়া ও জেলা লিগ্যাল এইড অফিসের তথ্য",
    ],
    speechSummaryBn:
      "আইনি সহায়তা একটি নাগরিক পোর্টাল। টাকার অভাবে যাঁরা আইনজীবী রাখতে পারেন না, সরকার তাঁদের সম্পূর্ণ বিনামূল্যে আইনজীবী এবং আদালতের সব খরচ দেয়। এখান থেকে আবেদনের খসড়া প্রস্তুত করুন এবং ১৬৬৯৯ নম্বরে টোল-ফ্রি কল করুন।",
    quickLinks: [
      { href: "/legal/apply", labelBn: "আবেদনের খসড়া" },
      { href: "/legal/assistant", labelBn: "এআই পরামর্শক" },
      { href: "/legal/track", labelBn: "আমার কেস" },
      { href: "/legal/mediation", labelBn: "আপস-মীমাংসা" },
      { href: "/legal/demo", labelBn: "অফিস ডেমো" },
    ],
    privacyNoteBn: "১০০% অফলাইন ও ব্যক্তিগত — আপনার কোনো নাম বা মামলার তথ্য সার্ভারে সংরক্ষিত হয় না।",
  },
  mediscan: {
    id: "mediscan",
    nameBn: "মেডিস্ক্যান বিডি",
    nameEn: "MediScan BD",
    taglineBn: "প্রেসক্রিপশন রিডার, ডাক্তার ও জরুরি সেবা",
    taglineEn: "Prescription reader, verified doctors & emergency care",
    trustBadgeBn: "স্বাস্থ্য বাতায়ন",
    authorityBn: "স্বাস্থ্য অধিদপ্তর ও বাংলাদেশ মেডিকেল অ্যান্ড ডেন্টাল কাউন্সিল (BMDC)",
    authorityUrl: "https://dghs.gov.bd",
    lawCitationBn: "WHO / NHS ক্লিনিক্যাল রেড ফ্ল্যাগ ও বিএমডিসি স্ট্যান্ডার্ড",
    primaryHelpline: { number: "16263", label: "স্বাস্থ্য বাতায়ন (২৪/৭)", isTollFree: false },
    emergencyHelplines: [
      { number: "16263", label: "স্বাস্থ্য বাতায়ন" },
      { number: "999", label: "জরুরি অ্যাম্বুলেন্স" },
      { number: "10655", label: "আইইডিসিআর কন্ট্রোল রুম" },
    ],
    keyBenefitsBn: [
      "হাতে লেখা প্রেসক্রিপশন বাংলায় সহজ পাঠোদ্ধার (কনসেন্ট ভিত্তিক)",
      "ডব্লিউএইচও অনুমোদিত জরুরি রেড ফ্ল্যাগ সতর্কতা ও পরামর্শ",
      "ওষুধ খাবার নিয়ম ও সময়সূচি ট্র্যাকিং (৮০% পিডিসি থ্রেশহোল্ড)",
      "নিকটস্থ সরকারি ও বেসরকারি হাসপাতালের তথ্য ও মানচিত্র",
    ],
    speechSummaryBn:
      "মেডিস্ক্যান বিডি প্রেসক্রিপশন বুঝতে ও স্বাস্থ্যসেবায় সহায়তা করে। এটি কোনো প্রেসক্রিপশন বা চিকিৎসা দেয় না; জরুরি প্রয়োজনে ১৬২৬৩ স্বাস্থ্য বাতায়নে অথবা ৯৯৯ এ কল করুন।",
    quickLinks: [
      { href: "/mediscan", labelBn: "প্রেসক্রিপশন রিডার" },
      { href: "/mediscan/emergency", labelBn: "হাসপাতাল মানচিত্র" },
      { href: "/mediscan/assistant", labelBn: "লক্ষণ স্ক্রিনার" },
      { href: "/mediscan/telemedicine", labelBn: "টেলিমেডিসিন" },
    ],
    privacyNoteBn: "স্বাস্থ্য সংক্রান্ত তথ্য সম্পূর্ণ আপনার ডিভাইসে সংরক্ষিত থাকে, কোনো ক্লাউড স্টোরেজে রাখা হয় না।",
  },
  rokkha: {
    id: "rokkha",
    nameBn: "রক্ষা",
    nameEn: "Rokkha",
    taglineBn: "প্রতারণা ও দুর্যোগ প্রস্তুতি",
    taglineEn: "Fraud defense & disaster preparedness",
    trustBadgeBn: "সাইবার ও দুর্যোগ সুরক্ষা",
    authorityBn: "বাংলাদেশ ব্যাংক, বিটিআরসি ও দুর্যোগ ব্যবস্থাপনা অধিদপ্তর",
    authorityUrl: "https://btrc.gov.bd",
    lawCitationBn: "সাইবার নিরাপত্তা নীতিমালা ও আইএফআরসি দুর্যোগ প্রস্তুতি নির্দেশিকা",
    primaryHelpline: { number: "999", label: "জাতীয় জরুরি সেবা (সাইবার)", isTollFree: true },
    emergencyHelplines: [
      { number: "999", label: "জরুরি পুলিশ ও সাইবার সহায়তা" },
      { number: "1090", label: "দুর্যোগের আগাম বার্তা (টোল-ফ্রি)" },
      { number: "16247", label: "বিকাশ হেল্পলাইন" },
    ],
    keyBenefitsBn: [
      "এসএমএস, ভুয়া লিংক ও ওটিপি প্রতারণা শনাক্তকরণ",
      "বাস্তবমুখী স্ক্যাম ডিফেন্স ড্রিল ও সচেতনতা অনুশীলন",
      "জরুরি দুর্যোগ প্রস্তুতি চেকলিস্ট ও পারিবারিক অভিভাবক সতর্কতা",
      "টাকা পাঠানোর আগে কুলিং-অফ পজ ও নিরাপত্তা পরীক্ষা",
    ],
    speechSummaryBn:
      "রক্ষা আপনাকে আর্থিক প্রতারণা, ওটিপি চুরি এবং প্রাকৃতিক দুর্যোগ থেকে সুরক্ষিত রাখতে সাহায্য করে। কোনো সন্দেহজনক বার্তা পেলে পিন বা ওটিপি কখনোই কাউকে দেবেন না।",
    quickLinks: [
      { href: "/rokkha", labelBn: "মেসেজ স্ক্রিনার" },
      { href: "/rokkha#drill", labelBn: "স্ক্যাম ড্রিল" },
      { href: "/rokkha#guardian", labelBn: "ফ্যামিলি গার্ডিয়ান" },
      { href: "/rokkha#cooling", labelBn: "কুলিং-অফ পজ" },
    ],
    privacyNoteBn: "আপনার বার্তা বা স্ক্রিন করা লেখা কখনোই সার্ভারে পাঠানো হয় না, সবকিছু ডিভাইসেই বিশ্লেষণ হয়।",
  },
  krishi: {
    id: "krishi",
    nameBn: "মাঠসাথী",
    nameEn: "MaathSathi",
    taglineBn: "স্যাটেলাইট জমি, খামার ও ফসলের সমাধান",
    taglineEn: "Satellite crop radar, farm ledger & livestock care",
    trustBadgeBn: "কৃষি সেবা",
    authorityBn: "কৃষি সম্প্রসারণ অধিদপ্তর (DAE) ও প্রাণিসম্পদ অধিদপ্তর",
    authorityUrl: "https://dae.gov.bd",
    lawCitationBn: "কৃষি নীতি ও সমন্বিত বালাই ব্যবস্থাপনা নির্দেশিকা",
    primaryHelpline: { number: "16123", label: "কৃষি কল সেন্টার", isTollFree: false },
    emergencyHelplines: [
      { number: "16123", label: "কৃষি কল সেন্টার" },
      { number: "16358", label: "প্রাণিসম্পদ কল সেন্টার" },
      { number: "1090", label: "আবহাওয়া বার্তা" },
    ],
    keyBenefitsBn: [
      "স্যাটেলাইট মানচিত্রে ফসলের রোপণ ও বৃদ্ধির রাডার",
      "স্থানীয় আবহাওয়া ও স্প্রে করার উপযুক্ত সময় নির্ধারণ",
      "খামারের খরচের ডিজিটাল খাতা ও গবাদিপশু টিকাদান ক্যালেন্ডার",
      "ফসলের রোগবালাই প্রাথমিক শনাক্তকরণ ও কৃষি বিশেষজ্ঞ পরামর্শ",
    ],
    speechSummaryBn:
      "মাঠসাথী বাংলাদেশের কৃষকদের জন্য স্যাটেলাইট প্রযুক্তি ও খামারের হিসাব পরিচালনার স্মার্ট সঙ্গী। যে কোনো পরামর্শে ১৬১২৩ নম্বরে কৃষি কল সেন্টারে সরাসরি কথা বলুন।",
    quickLinks: [
      { href: "/krishi/field#/farmer", labelBn: "মাঠ রাডার" },
      { href: "/krishi", labelBn: "খামারের খাতা" },
      { href: "/haatbazar", labelBn: "হাটবাজার দর" },
    ],
    privacyNoteBn: "আপনার জমির পরিমাপ ও খরচের খাতা সম্পূর্ণভাবে আপনার ফোনেই জমা থাকে।",
  },
  feeguard: {
    id: "feeguard",
    nameBn: "ফি-গার্ড বিডি",
    nameEn: "FeeGuard BD",
    taglineBn: "ফ্রিল্যান্সার পেআউট ফি ও ক্যাশআউট ক্যালকুলেটর",
    taglineEn: "Freelance payout fee optimizer & cash-out leak detector",
    trustBadgeBn: "রেমিট্যান্স প্রণোদনা",
    authorityBn: "বাংলাদেশ ব্যাংক বৈদেশিক মুদ্রা নীতিমালা ও এনবিআর আইটিইএস প্রজ্ঞাপন",
    authorityUrl: "https://bb.org.bd",
    lawCitationBn: "৪% সরকারি রেমিট্যান্স ক্যাশ প্রণোদনা নির্দেশিকা",
    primaryHelpline: { number: "16247", label: "বিকাশ ফ্রিল্যান্সার সাপোর্ট", isTollFree: false },
    keyBenefitsBn: [
      "ফাইভ্যার, আপওয়ার্ক ও মার্কেটপ্লেস ফি লিকেজ গণনা",
      "সুইফট বনাম এমএফএস চ্যানেলে বার্ষিক আয় সাশ্রয় হিসাব",
      "৪% সরকারি রেমিট্যান্স প্রণোদনার শতভাগ প্রাপ্তি নিশ্চিতকরণ",
      "সরাসরি ব্যাংকে ক্যাশআউটের সেরা রেট ও কম ফি রুট নির্ধারণ",
    ],
    speechSummaryBn:
      "ফি-গার্ড বিডি ফ্রিল্যান্সারদের কষ্টের উপার্জিত ডলার নিরাপদে ও সবচেয়ে কম ফিতে বাংলাদেশে আনার হিসাব করে দেয়।",
    quickLinks: [
      { href: "/feeguard", labelBn: "ফি ক্যালকুলেটর" },
      { href: "/chuktiguard", labelBn: "চুক্তিগার্ড" },
      { href: "/workspace", labelBn: "স্কিল পাসপোর্ট" },
    ],
    privacyNoteBn: "কোনো আয়ের অংক বা ব্যক্তিগত ব্যাংকিং ডেটা সংরক্ষণ করা হয় না।",
  },
  chuktiguard: {
    id: "chuktiguard",
    nameBn: "চুক্তিগার্ড",
    nameEn: "ChuktiGuard",
    taglineBn: "ফ্রিল্যান্সিং ও সাপ্লাই চুক্তিপত্র তৈরির শিল্ড",
    taglineEn: "Contract generator & clause shield for freelancers",
    trustBadgeBn: "আইনি চুক্তি",
    authorityBn: "চুক্তি আইন ১৮৭২ (The Contract Act, 1872)",
    authorityUrl: "http://bdlaws.minlaw.gov.bd",
    lawCitationBn: "চুক্তি আইন ১৮৭২ ও এনবিআর আইটিইএস ফ্রেমওয়ার্ক",
    keyBenefitsBn: [
      "দ্বিভাষিক (বাংলা ও ইংরেজি) ক্লায়েন্ট চুক্তিপত্র তৈরি",
      "ধারা ৪ ফোর্স মেজার ও ইন্টারনেট ব্ল্যাকআউট প্রোটেকশন",
      "মাইলস্টোন পেমেন্ট ও কপিরাইট শর্তাবলি সুস্পষ্টকরণ",
      "ডিজিটাল ভেরিফিকেশন সীলযুক্ত প্রিন্ট ও পিডিএফ ডাউনলোড",
    ],
    speechSummaryBn:
      "চুক্তিগার্ড ফ্রিল্যান্সার ও ব্যবসায়ীদের জন্য আইনগতভাবে কার্যকর দ্বিভাষিক চুক্তি তৈরি করে পেমেন্ট ও ক্লায়েন্ট জটিলতা থেকে রক্ষা করে।",
    quickLinks: [
      { href: "/chuktiguard", labelBn: "চুক্তি তৈরি" },
      { href: "/feeguard", labelBn: "ফি-গার্ড" },
      { href: "/legal", labelBn: "আইনি সহায়তা" },
    ],
    privacyNoteBn: "চুক্তির খসড়া আপনার ডিভাইসেই তৈরি হয় এবং স্থানীয়ভাবে ডাউনলোড করা যায়।",
  },
  shohoj: {
    id: "shohoj",
    nameBn: "সহজ বাজেট",
    nameEn: "Shohoj Budget",
    taglineBn: "ভয়েস-ফার্স্ট সংসারের আয়-ব্যয় ও জাকাত",
    taglineEn: "Voice-first household expense tracker & zakat manager",
    trustBadgeBn: "সংসারের হিসাব",
    authorityBn: "ইসলামিক ফাউন্ডেশন বাংলাদেশ নিসাব মান ও বাজুস স্বর্ণের দর রেফারেন্স",
    authorityUrl: "https://islamicfoundation.gov.bd",
    lawCitationBn: "সঠিক ইনটিজার পয়সা ফিনান্সিয়াল রিকনসিলিয়েশন",
    keyBenefitsBn: [
      "মুখে বাংলায় বলে চাল-ডাল বা সংসারের খরচের হিসাব লেখা",
      "রুপা ও স্বর্ণের সঠিক ওজনে শরীয়াহসম্মত জাকাত ক্যালকুলেটর",
      "মেস ও ব্যাচেলর ফ্লাটের মিল ও ব্যালেন্স স্বয়ংক্রিয় নিষ্পত্তি",
      "ধার-দেনা ও কিস্তি পরিশোধের রিমাইন্ডার ট্র্যাকার",
    ],
    speechSummaryBn:
      "সহজ বাজেট আপনার পরিবারের আয়-ব্যয়, নিত্যদিনের বাজারের ফর্দ এবং বাৎসরিক জাকাত নিখুঁতভাবে পরিচালনা করতে সাহায্য করে।",
    quickLinks: [
      { href: "/shohoj-budget#wallets", labelBn: "ওয়ালেট" },
      { href: "/shohoj-budget#bazar", labelBn: "বাজার ফর্দ" },
      { href: "/shohoj-budget#mess", labelBn: "মেস হিসাব" },
      { href: "/shohoj-budget#zakat", labelBn: "জাকাত" },
    ],
    privacyNoteBn: "আপনার পরিবারের আর্থিক কোনো হিসাব সার্ভারে যায় না, ১০০% ব্যক্তিগত ডিভাইসে সুরক্ষিত।",
  },
  admitbuddy: {
    id: "admitbuddy",
    nameBn: "অ্যাডমিট বাডি",
    nameEn: "AdmitBuddy",
    taglineBn: "বিশ্ববিদ্যালয় ভর্তি প্রস্তুতি ও গুচ্ছ ক্যালকুলেটর",
    taglineEn: "University admission planner & cluster tracker",
    trustBadgeBn: "ভর্তি গাইড",
    authorityBn: "বাংলাদেশ বিশ্ববিদ্যালয় মঞ্জুরী কমিশন (ইউজিসি) ও গুচ্ছ ভর্তি কমিটি",
    authorityUrl: "https://ugc.gov.bd",
    lawCitationBn: "পাবলিক বিশ্ববিদ্যালয় সমন্বিত গুচ্ছ ভর্তি নীতিমালা",
    keyBenefitsBn: [
      "জিএসটি, প্রকৌশল, কৃষি ও মেডিকেল গুচ্ছের আবেদন যোগ্যতা যাচাই",
      "স্পেসড রিপিটিশন ভিত্তিক পড়ার রুটিন ও এক্সপোর্ট ক্যালেন্ডার",
      "ভর্তি পরীক্ষার বাজেট ও জেলা শহর ভ্রমণ খরচ ক্যালকুলেটর",
      "কোনো কাল্পনিক ডেডলাইন ছাড়া সম্পূর্ণ স্বচ্ছ ভর্তি তথ্য",
    ],
    speechSummaryBn:
      "অ্যাডমিট বাডি বাংলাদেশের পাবলিক বিশ্ববিদ্যালয়ে ভর্তিচ্ছু শিক্ষার্থীদের গুচ্ছ প্রস্তুতি ও সময় ব্যবস্থাপনায় সাহায্য করে।",
    quickLinks: [
      { href: "/admitbuddy", labelBn: "ভর্তি ক্যালকুলেটর" },
      { href: "/admitbuddy#study", labelBn: "পড়ার রুটিন" },
      { href: "/admitbuddy#calculator", labelBn: "খরচের হিসাব" },
    ],
    privacyNoteBn: "আপনার জিপিএ ও পরীক্ষার রুটিন সম্পূর্ণ আপনার ফোনেই থাকে।",
  },
  probaho: {
    id: "probaho",
    nameBn: "প্রবাহ কোচ",
    nameEn: "Probaho Coach",
    taglineBn: "ভাইভা ও কথা বলার অনুশীলন",
    taglineEn: "Viva & job interview speaking practice coach",
    trustBadgeBn: "ভাইভা কোচ",
    authorityBn: "বিসিএস ও আন্তর্জাতিক চাকরির ইন্টারভিউ স্ট্যান্ডার্ড",
    lawCitationBn: "STAR কাঠামোগত আচরণিক প্রতিক্রিয়া বিশ্লেষণ",
    keyBenefitsBn: [
      "বিসিএস, ব্যাংক ও আন্তর্জাতিক ভাইভার সরাসরি উত্তর অনুশীলন",
      "কথার গতি (শব্দ প্রতি মিনিট) ও ফিলার ওয়ার্ড শনাক্তকরণ",
      "স্টার (STAR) মেথডে সিচুয়েশন, টাস্ক, অ্যাকশন ও রেজাল্ট বিশ্লেষণ",
      "বাংলা ও ইংরেজিতে তাৎক্ষণিক স্কোর ও আত্মবিশ্বাস মূল্যায়ন",
    ],
    speechSummaryBn:
      "প্রবাহ কোচ ভাইভা ও চাকরির ইন্টারভিউতে আত্মবিশ্বাসের সাথে কথা বলার সেরা ডিজিটাল সহকারী।",
    quickLinks: [
      { href: "/probaho", labelBn: "অনুশীলন শুরু" },
      { href: "/workspace", labelBn: "ওয়ার্কস্পেস" },
    ],
    privacyNoteBn: "আপনার অডিও কথা ডিভাইসেই বিশ্লেষণ হয়, কোনো অডিও সার্ভারে রেকর্ড হয় না।",
  },
};

/** Get metadata for an app with a safe fallback */
export function getAppMetadata(appId: string): AppMetadata | null {
  return APP_METADATA_REGISTRY[appId] || null;
}
