/*
 * Foreign University Admission, Study Abroad & Flexible Pace Roadmap for Bangladeshi Students.
 * NO imports — pure, deterministic, and unit-tested (tests/foreignAdmission.test.ts).
 *
 * Covers:
 * - Popular destinations: Germany, USA, Canada, UK, Japan, Malaysia, South Korea.
 * - Flexible pacing: Fast-Track (6-9 mo), Standard (12-18 mo), Long-Term (2+ yrs).
 * - Standardized tests & requirements: IELTS, TOEFL, Duolingo, SAT, GRE.
 * - Document attestation & checklist: Board, MOFA, Embassy, Notary, Bank Solvency.
 * - Multi-university application pipeline & scholarship tracking.
 */

export interface StudyDestination {
  id: string;
  countryBn: string;
  countryEn: string;
  flag: string;
  tuitionTypeBn: string;
  avgTuitionBdtPerYear: string;
  livingCostBdtPerMonth: string;
  blockedAccountOrSolvency: string;
  workRightsBn: string;
  languageRequirements: string;
  scholarshipOpportunitiesBn: string;
  keyIntakes: string[];
  prOrWorkVisaProspects: string;
  popularUniversities: string[];
  keyHighlights: string[];
  officialPortalUrl: string;
}

export type PaceTrackId = "fast_track" | "standard" | "long_term";

export interface PaceMilestone {
  monthNumber: number;
  phaseBn: string;
  phaseEn: string;
  category: "tests" | "documents" | "applications" | "visa" | "profile";
  titleBn: string;
  tasksBn: string[];
}

export interface PaceTrack {
  id: PaceTrackId;
  nameBn: string;
  nameEn: string;
  durationMonths: number;
  suitableForBn: string;
  descriptionBn: string;
  milestones: PaceMilestone[];
}

export interface ForeignApplication {
  id: string;
  universityName: string;
  country: string;
  major: string;
  degreeLevel: "Undergraduate" | "Masters" | "PhD";
  intake: string; // e.g. "Fall 2027" or "Winter 2026"
  deadline: string; // YYYY-MM-DD or text
  applicationFeeBdt: number;
  status: "shortlisted" | "preparing_docs" | "applied" | "interview" | "admitted" | "rejected" | "visa";
  scholarshipApplied: boolean;
  notes: string;
}

export interface StandardizedTestRequirement {
  testName: string;
  purposeBn: string;
  typicalMinScore: string;
  competitiveScore: string;
  costEstimateBdt: string;
  preparationAdviceBn: string;
}

export const STUDY_DESTINATIONS: StudyDestination[] = [
  {
    id: "germany",
    countryBn: "জার্মানি (Germany)",
    countryEn: "Germany",
    flag: "🇩🇪",
    tuitionTypeBn: "বেশিরভাগ পাবলিক বিশ্ববিদ্যালয়ে টিউশন ফি ফ্রি (০ টাকা)",
    avgTuitionBdtPerYear: "০ - ৫০,০০০ টাকা (নামমাত্র সেমিস্টার কন্ট্রিবিউশন)",
    livingCostBdtPerMonth: "৮০,০০০ - ১,১০,০০০ টাকা",
    blockedAccountOrSolvency: "ব্লকড অ্যাকাউন্ট প্রায় €১১,৯০৪ ইউরো (প্রতি বছর আপডেট হয়)",
    workRightsBn: "বছরে ১৪০ পুরো দিন বা ২৮০ অর্ধ দিন খণ্ডকালীন কাজের সুযোগ",
    languageRequirements: "ইংরেজি মাধ্যমে: IELTS 6.5+; জার্মান মাধ্যমে: TestDaF বা Goethe C1",
    scholarshipOpportunitiesBn: "DAAD স্কলারশিপ, Deutschlandstipendium, ইরাসমাস মুন্ডুস",
    keyIntakes: ["উইন্টার ইনটেক (সেপ্টেম্বর/অক্টোবর)", "সামার ইনটেক (মার্চ/এপ্রিল)"],
    prOrWorkVisaProspects: "পড়াশোনা শেষে ১৮ মাসের জব সিকার ভিসা ও দ্রুত স্থায়ী বসবাসের সুযোগ",
    popularUniversities: [
      "Technical University of Munich (TUM)",
      "Ludwig Maximilian University of Munich (LMU)",
      "Heidelberg University",
      "RWTH Aachen University",
      "TU Berlin",
    ],
    keyHighlights: [
      "বিশ্বসেরা ইঞ্জিনিয়ারিং, প্রযুক্তি ও মৌলিক বিজ্ঞান",
      "পাবলিক বিশ্ববিদ্যালয়ে কোনো টিউশন ফি নেই",
      "ইউরোপের সেনজেনভুক্ত ২৭টি দেশে অবাধ যাতায়াত",
    ],
    officialPortalUrl: "https://www.daad.de",
  },
  {
    id: "usa",
    countryBn: "যুক্তরাষ্ট্র (USA)",
    countryEn: "United States",
    flag: "🇺🇸",
    tuitionTypeBn: "টিউশন ফি বেশি, তবে সর্বোচ্চ নিড-বেসড ও মেরিট স্কলারশিপ বিদ্যমান",
    avgTuitionBdtPerYear: "১৫,০০,০০০ - ৪০,০০,০০০ টাকা (স্কলারশিপ ছাড়া)",
    livingCostBdtPerMonth: "১,০০,০০০ - ১,৬০,০০০ টাকা",
    blockedAccountOrSolvency: "১ বছরের টিউশন ও থাকার খরচের ব্যাংক সলভেন্সি (সাধারণত ৩৫-৫০ লাখ টাকা)",
    workRightsBn: "ক্যাম্পাসে সপ্তাহে ২০ ঘণ্টা কাজ; STEM কোর্সে ৩ বছরের OPT ওয়ার্ক পারমিট",
    languageRequirements: "IELTS 6.5-7.5 বা TOEFL 85-100; আন্ডারগ্র্যাজুয়েটে SAT (অপশনাল/রিকোয়ার্ড)",
    scholarshipOpportunitiesBn: "সম্পূর্ণ টিউশন ওয়েভার, টিচিং/রিসার্চ অ্যাসিস্ট্যান্টশিপ (TA/RA), ফুলব্রাইট",
    keyIntakes: ["ফল ইনটেক (আগস্ট/সেপ্টেম্বর — প্রধান)", "স্প্রিং ইনটেক (জানুয়ারি)"],
    prOrWorkVisaProspects: "STEM ফিল্ডে ৩ বছর কাজের সুযোগ (OPT) এবং পরবর্তীতে H-1B ভিসা স্পনসরশিপ",
    popularUniversities: [
      "Harvard / MIT / Stanford",
      "University of Texas at Austin",
      "University of Michigan",
      "Purdue University",
      "State Universities (affordable tuition with waivers)",
    ],
    keyHighlights: [
      "বিশ্বের সবচেয়ে উন্নত গবেষণাগার ও বিশাল ইন্ডাস্ট্রি নেটওয়ার্ক",
      "যোগ্য শিক্ষার্থীদের জন্য ১০০% ফুল রাইড স্কলারশিপের সুযোগ",
      "ক্যাম্পাস কালচার ও বহুমুখী ক্যারিয়ার উন্মোচন",
    ],
    officialPortalUrl: "https://www.educationusa.state.gov",
  },
  {
    id: "canada",
    countryBn: "কানাডা (Canada)",
    countryEn: "Canada",
    flag: "🇨🇦",
    tuitionTypeBn: "মাঝারি থেকে উচ্চ টিউশন, তবে Co-op ইন্টার্নশিপ ও স্থায়ী বসবাসের সহজ পথ",
    avgTuitionBdtPerYear: "১২,০০,০০০ - ২৮,০০,০০০ টাকা",
    livingCostBdtPerMonth: "৯০,০০০ - ১,৪০,০০০ টাকা",
    blockedAccountOrSolvency: "GIC (Guaranteed Investment Certificate) প্রায় ২০,৬৩৫ কানাডিয়ান ডলার",
    workRightsBn: "সপ্তাহে ২০-২৪ ঘণ্টা খণ্ডকালীন কাজ এবং কো-অপ টার্মে ফুল-টাইম পেইড কাজ",
    languageRequirements: "IELTS 6.5 (কোনো ব্যান্ডে ৬.০ এর নিচে নয়) বা PTE / TOEFL",
    scholarshipOpportunitiesBn: "Vanier Canada Graduate Scholarships, প্রভিন্সিয়াল রিসার্চ অ্যাওয়ার্ড",
    keyIntakes: ["ফল (সেপ্টেম্বর)", "উইন্টার (জানুয়ারি)", "সামার (মে)"],
    prOrWorkVisaProspects: "স্নাতক শেষে ৩ বছরের পোস্ট-গ্র্যাজুয়েট ওয়ার্ক পারমিট (PGWP) ও এক্সপ্রেস এন্ট্রি PR",
    popularUniversities: [
      "University of Toronto",
      "UBC (University of British Columbia)",
      "McGill University",
      "University of Waterloo",
      "University of Alberta",
    ],
    keyHighlights: [
      "নিরাপদ, অভিবাসীবান্ধব ও বহুসংস্কৃতির পরিবেশ",
      "Co-op প্রোগ্রামে পড়াশোনার ফাঁকেই কানাডিয়ান কাজের অভিজ্ঞতা",
      "পড়াশোনা শেষে সহজে স্থায়ী নাগরিকত্ব (PR)-এর পথ",
    ],
    officialPortalUrl: "https://www.educanada.ca",
  },
  {
    id: "uk",
    countryBn: "যুক্তরাজ্য (UK)",
    countryEn: "United Kingdom",
    flag: "🇬🇧",
    tuitionTypeBn: "১ বছরের দ্রুততম মাস্টার্স ও ৩ বছরের আন্ডারগ্র্যাজুয়েট প্রোগ্রাম",
    avgTuitionBdtPerYear: "১৬,০০,০০০ - ৩২,০০,০০০ টাকা",
    livingCostBdtPerMonth: "১,১০,০০০ - ১,৭০,০০০ টাকা (লন্ডন ও বাইরে ভিন্ন)",
    blockedAccountOrSolvency: "২৮ দিন মেয়াদী ব্যাংক স্টেটমেন্ট (টিউশন ব্যালেন্স + ৯ মাসের লিভিং কস্ট)",
    workRightsBn: "টার্ম চলাকালীন সপ্তাহে ২০ ঘণ্টা কাজ এবং ছুটিতে ফুল টাইম",
    languageRequirements: "IELTS 6.0 - 7.0 বা MOI (কিছু বিশ্ববিদ্যালয়ে)",
    scholarshipOpportunitiesBn: "Chevening স্কলারশিপ, Commonwealth, GREAT Scholarships",
    keyIntakes: ["সেপ্টেম্বর/অক্টোবর (প্রধান)", "জানুয়ারি/ফেব্রুয়ারি"],
    prOrWorkVisaProspects: "পড়াশোনা শেষে ২ বছরের গ্র্যাজুয়েট রুট ওয়ার্ক ভিসা (PSW)",
    popularUniversities: [
      "Oxford / Cambridge / Imperial",
      "University of Manchester",
      "University of Edinburgh",
      "University of Warwick",
      "Coventry / Teesside / Hertfordshire (affordable)",
    ],
    keyHighlights: [
      "মাত্র ১ বছরে মাস্টার্স ডিগ্রি সম্পন্ন করে সময় ও লিভিং কস্ট বাঁচানো",
      "বিশ্বখ্যাত চিভেনিং ও কমনওয়েলথ সম্পূর্ণ অর্থায়িত স্কলারশিপ",
      "লন্ডন সহ বিশ্ব অর্থনৈতিক কেন্দ্রের সুযোগ",
    ],
    officialPortalUrl: "https://study-uk.britishcouncil.org",
  },
  {
    id: "japan",
    countryBn: "জাপান (Japan)",
    countryEn: "Japan",
    flag: "🇯🇵",
    tuitionTypeBn: "সাশ্রয়ী টিউশন ফি ও সরকারি সম্পূর্ণ ফ্রি MEXT স্কলারশিপ",
    avgTuitionBdtPerYear: "৪,০০,০০০ - ৭,০০,০০০ টাকা (জাতীয় বিশ্ববিদ্যালয়ে)",
    livingCostBdtPerMonth: "৭০,০০০ - ১,০০,০০০ টাকা",
    blockedAccountOrSolvency: "স্পন্সরের ১৫-২০ লাখ টাকার ব্যাংক সলভেন্সি ও বাৎসরিক আয়ের প্রমাণ",
    workRightsBn: "সপ্তাহে ২৮ ঘণ্টা খণ্ডকালীন কাজ করার সরকারি অনুমোদন",
    languageRequirements: "ইংরেজি ডিগ্রিতে IELTS 6.0+; জাপানিজ ডিগ্রিতে JLPT N2 বা N1",
    scholarshipOpportunitiesBn: "MEXT (Monbukagakusho) স্কলারশিপ (সম্পূর্ণ টিউশন + বিমান ভাড়া + মাসিক ভাতা)",
    keyIntakes: ["এপ্রিল (প্রধান জাপানিজ সেশন)", "সেপ্টেম্বর/অক্টোবর (গ্লোবাল ডিগ্রি)"],
    prOrWorkVisaProspects: "পড়াশোনা শেষে ইঞ্জিনিয়ারিং ও আইটি ফিল্ডে উচ্চ বেতনের চাকরির নিশ্চিত সুযোগ",
    popularUniversities: [
      "University of Tokyo",
      "Kyoto University",
      "Tokyo Institute of Technology",
      "Osaka University",
      "Tohoku University",
    ],
    keyHighlights: [
      "বিশ্বের শীর্ষ প্রযুক্তি, রোবোটিক্স ও অটোমোবাইল উদ্ভাবন",
      "MEXT স্কলারশিপে কোনো টাকা ছাড়াই পড়ালেখা ও সঞ্চয়ের সুযোগ",
      "নিরাপদ সমাজ ও কর্মঠ সংস্কৃতি",
    ],
    officialPortalUrl: "https://www.studyinjapan.go.jp",
  },
  {
    id: "malaysia",
    countryBn: "মালয়েশিয়া (Malaysia)",
    countryEn: "Malaysia",
    flag: "🇲🇾",
    tuitionTypeBn: "খুবই সাশ্রয়ী বাজেট ও বিশ্বমানের বিদেশি বিশ্ববিদ্যালয়ের শাখা ক্যাম্পাস",
    avgTuitionBdtPerYear: "৩,৫০,০০০ - ৮,০০,০০০ টাকা",
    livingCostBdtPerMonth: "৩৫,০০০ - ৫৫,০০০ টাকা",
    blockedAccountOrSolvency: "সাধারণত ৮-১০ লাখ টাকার ব্যাংক স্টেটমেন্ট যথেষ্ট",
    workRightsBn: "সেমিস্টার ব্রেকে সর্বোচ্চ ২০ ঘণ্টা কাজের সুযোগ",
    languageRequirements: "IELTS 5.5 - 6.5 বা বিশ্ববিদ্যালয়ের নিজস্ব ইংলিশ টেস্ট",
    scholarshipOpportunitiesBn: "Malaysian International Scholarship (MIS), ইউনিভার্সিটি মেরিট ওয়েভার",
    keyIntakes: ["ফেব্রুয়ারি/মার্চ", "জুলাই/আগস্ট", "অক্টোবর/নভেম্বর"],
    prOrWorkVisaProspects: "টুইনিং প্রোগ্রামের মাধ্যমে ক্রেডিট ট্রান্সফার করে ইউকে বা অস্ট্রেলিয়া যাওয়ার সুযোগ",
    popularUniversities: [
      "Universiti Malaya (UM)",
      "Universiti Teknologi Malaysia (UTM)",
      "Monash University Malaysia (Australian branch)",
      "University of Nottingham Malaysia (UK branch)",
      "Taylor's University",
    ],
    keyHighlights: [
      "বাংলাদেশি শিক্ষার্থীদের জন্য অত্যন্ত সাশ্রয়ী খাওয়া-থাকা ও টিউশন",
      "অস্ট্রেলিয়ান ও ব্রিটিশ ডিগ্রি অর্ধেক খরচে গ্রহণের সুযোগ",
      "মুসলিমবান্ধব হালাল খাবার ও সহজ ভিসা প্রক্রিয়া",
    ],
    officialPortalUrl: "https://educationmalaysia.gov.my",
  },
  {
    id: "south_korea",
    countryBn: "দক্ষিণ কোরিয়া (South Korea)",
    countryEn: "South Korea",
    flag: "🇰🇷",
    tuitionTypeBn: "জিকেএস (GKS) সরকারি ফুল স্কলারশিপ ও বিশ্বসেরা ল্যাব ফ্যাসিলিটি",
    avgTuitionBdtPerYear: "৪,৫০,০০০ - ৯,০০,০০০ টাকা (স্কলারশিপ ছাড়া)",
    livingCostBdtPerMonth: "৬০,০০০ - ৯০,০০০ টাকা",
    blockedAccountOrSolvency: "সাধারণত প্রায় $২০,০০০ মার্কিন ডলারের ব্যাংক সলভেন্সি সার্টিফিকেট",
    workRightsBn: "সপ্তাহে ২০ ঘণ্টা কাজ এবং ছুটির দিনে ফুল টাইম",
    languageRequirements: "ইংরেজি মাধ্যমে IELTS 6.0-6.5; কোরিয়ান মাধ্যমে TOPIK লেভেল ৩ বা ৪",
    scholarshipOpportunitiesBn: "Global Korea Scholarship (GKS/KGSP) সম্পূর্ণ ফ্রি (টিউশন + ভাতা + বিমান ভাড়া)",
    keyIntakes: ["স্প্রিং ইনটেক (মার্চ — প্রধান)", "ফল ইনটেক (সেপ্টেম্বর)"],
    prOrWorkVisaProspects: "STEM ও হাই-টেক গ্র্যাজুয়েটদের জন্য F-2-7 পয়েন্ট ভিত্তিক রেসিডেন্স ভিসা ও D-10 জব সিকার",
    popularUniversities: [
      "Seoul National University (SNU)",
      "KAIST (Korea Advanced Institute of Science & Technology)",
      "Yonsei University",
      "Korea University (SKY Universities)",
      "POSTECH",
    ],
    keyHighlights: [
      "বিশ্বের শীর্ষ সেমিকন্ডাক্টর, ইলেকট্রনিক্স ও এআই উদ্ভাবনের প্রাণকেন্দ্র",
      "GKS স্কলারশিপ পেলে পুরো ডিগ্রি ১০০% ফ্রিতে সম্পন্ন করা যায়",
      "নিরাপদ জীবনযাপন ও সমৃদ্ধ সাংস্কৃতিক পরিবেশ",
    ],
    officialPortalUrl: "https://www.studyinkorea.go.kr",
  },
  {
    id: "australia",
    countryBn: "অস্ট্রেলিয়া (Australia)",
    countryEn: "Australia",
    flag: "🇦🇺",
    tuitionTypeBn: "বিশ্বমানের Group of Eight বিশ্ববিদ্যালয় ও সর্বোচ্চ পার্ট-টাইম মজুরি",
    avgTuitionBdtPerYear: "১৮,০০,০০০ - ৩৫,০০,০০০ টাকা",
    livingCostBdtPerMonth: "১,২০,০০০ - ১,৮০,০০০ টাকা",
    blockedAccountOrSolvency: "বাৎসরিক লিভিং কস্ট AUD $২৯,৭১০ + ১ বছরের টিউশন ফি সমপরিমাণ ব্যাংক সলভেন্সি",
    workRightsBn: "পাক্ষিক ৪৮ ঘণ্টা (Fortnightly 48 hours) কাজ করার সুযোগ; সর্বোচ্চ ন্যূনতম মজুরি",
    languageRequirements: "IELTS 6.5 (প্রতি সেকশনে ৬.০) বা PTE Academic 58+",
    scholarshipOpportunitiesBn: "Australia Awards, Research Training Program (RTP), ডিনস মেরিট স্কলারশিপ",
    keyIntakes: ["সেমিস্টার ১ (ফেব্রুয়ারি/মার্চ — প্রধান)", "সেমিস্টার ২ (জুলাই)"],
    prOrWorkVisaProspects: "পড়াশোনা শেষে ২–৪ বছরের Post-Study Work Visa (Subclass 485) ও স্কিলড মাইগ্রেশন",
    popularUniversities: [
      "University of Melbourne",
      "University of Sydney (USYD)",
      "UNSW Sydney",
      "Australian National University (ANU)",
      "Monash University",
    ],
    keyHighlights: [
      "বিশ্বের সবচেয়ে বাসযোগ্য শহর (মেলবোর্ন, সিডনি, ব্রিসবেন)",
      "উচ্চতম পার্ট-টাইম ঘণ্টার মজুরি (ঘণ্টায় প্রায় AUD $২৪+)",
      "পিএইচডি ও রিসার্চ শিক্ষার্থীদের জন্য সম্পূর্ণ টিউশন ফ্রি ও স্টাইপেন্ড",
    ],
    officialPortalUrl: "https://www.studyaustralia.gov.au",
  },
  {
    id: "nordic",
    countryBn: "সুইডেন ও ফিনল্যান্ড (Nordic Countries)",
    countryEn: "Sweden & Finland",
    flag: "🇸🇪",
    tuitionTypeBn: "ইউরোপের উদ্ভাবনী হাব, ১০০% পর্যন্ত টিউশন ফি ওয়েভারের সুযোগ",
    avgTuitionBdtPerYear: "১২,০০,০০০ - ২২,০০,০০০ টাকা (স্কলারশিপ ছাড়া)",
    livingCostBdtPerMonth: "৯০,০০০ - ১,৩০,০০০ টাকা",
    blockedAccountOrSolvency: "সুইডিশ মাইগ্রেশন এজেন্সি নির্ধারিত মাসিক প্রায় SEK ৯,৪৫০ (বাৎসরিক ব্যাংক স্টেটমেন্ট)",
    workRightsBn: "কাজের সময়ের কোনো নির্দিষ্ট আইনি সীমা নেই (অধ্যয়নে সন্তোষজনক অগ্রগতি আবশ্যক)",
    languageRequirements: "ইংরেজি মাধ্যমে সম্পূর্ণ ডিগ্রি; IELTS 6.5 (প্রতিটি ব্যান্ডে ৫.৫+)",
    scholarshipOpportunitiesBn: "Swedish Institute (SI) Scholarship, ফিনিশ বিশ্ববিদ্যালয় ৫০%-১০০% টিউশন ওয়েভার",
    keyIntakes: ["অটাম ইনটেক (আগস্ট/সেপ্টেম্বর — কেন্দ্রীয় আবেদন পোর্টাল)"],
    prOrWorkVisaProspects: "স্নাতক শেষে ১ বছরের জব সিকার ভিসা এবং স্থায়ী পিআর অর্জনের সুনির্দিষ্ট নিয়ম",
    popularUniversities: [
      "KTH Royal Institute of Technology (Sweden)",
      "Lund University (Sweden)",
      "Aalto University (Finland)",
      "University of Helsinki (Finland)",
      "Uppsala University (Sweden)",
    ],
    keyHighlights: [
      "UniversityAdmissions.se ও Studyinfo.fi এর মাধ্যমে এক আবেদনে একাধিক বিশ্ববিদ্যালয়ে পছন্দ",
      "পরিচ্ছন্ন, পরিবেশবান্ধব ও প্রযুক্তিবান্ধব উচ্চ জীবনমান",
      "ইংরেজি ভাষায় আন্তর্জাতিক মানের শত শত মাস্টার্স কোর্স",
    ],
    officialPortalUrl: "https://www.universityadmissions.se",
  },
  {
    id: "turkey",
    countryBn: "তুরস্ক (Turkey)",
    countryEn: "Turkey",
    flag: "🇹🇷",
    tuitionTypeBn: "সম্পূর্ণ বিনামূল্যে সরকারি 'তুর্কিয়ে বুরসলারি' বৃত্তি ও সাশ্রয়ী পাবলিক বিশ্ববিদ্যালয়",
    avgTuitionBdtPerYear: "১,০০,০০০ - ৩,৫০,০০০ টাকা (পাবলিক বিশ্ববিদ্যালয়ে)",
    livingCostBdtPerMonth: "৪০,০০০ - ৬৫,০০০ টাকা",
    blockedAccountOrSolvency: "সাধারণত ৫-৮ লাখ টাকার ব্যাংক স্টেটমেন্ট যথেষ্ট",
    workRightsBn: "স্নাতকোত্তর শিক্ষার্থীদের জন্য সীমিত কাজের সুযোগ",
    languageRequirements: "তুর্কিয়ে বুরসলারিতে কোনো আইইএলটিএস বাধ্যবাধকতা নেই (১ বছর ফ্রি তার্কিশ ভাষা কোর্স অন্তর্ভুক্ত)",
    scholarshipOpportunitiesBn: "Türkiye Bursları: ১০০% ফ্রি টিউশন, ডরমিটরিতে ফ্রি থাকা-খাওয়া, মাসিক স্টাইপেন্ড ও ফ্রি বিমান টিকিট",
    keyIntakes: ["ফল ইনটেক (সেপ্টেম্বর/অক্টোবর)"],
    prOrWorkVisaProspects: "আন্তর্জাতিক সংস্থায় ও ইউরোপ-এশিয়ার বাণিজ্য করিডোরে চাকরির সুযোগ",
    popularUniversities: [
      "Middle East Technical University (METU)",
      "Boğaziçi University",
      "Koç University",
      "Sabancı University",
      "Istanbul Technical University (ITU)",
    ],
    keyHighlights: [
      "সম্পূর্ণ বিনা খরচে থাকা-খাওয়া ও পড়ার জন্য বিশ্বের সেরা ফুল-ফান্ডেড সরকারি বৃত্তি",
      "ইউরোপ ও এশিয়ার সংযোগস্থলে সমৃদ্ধ সাংস্কৃতিক ও ঐতিহাসিক অভিজ্ঞতা",
      "বাংলাদেশি শিক্ষার্থীদের জন্য অত্যন্ত জনপ্রিয় ও সম্মানজনক বিকল্প",
    ],
    officialPortalUrl: "https://www.turkiyeburslari.gov.tr",
  },
];

export const STANDARDIZED_TESTS: StandardizedTestRequirement[] = [
  {
    testName: "IELTS (International English Language Testing System)",
    purposeBn: "ইংরেজি ভাষার দক্ষতা পরিমাপ (Reading, Listening, Writing, Speaking)",
    typicalMinScore: "Overall 6.5 (কোনো সেকশনে 6.0 এর নিচে নয়)",
    competitiveScore: "7.0 - 8.0+",
    costEstimateBdt: "প্রায় ২৫,৫০০ - ২৮,০০০ টাকা",
    preparationAdviceBn: "ক্যামব্রিজ প্র্যাকটিস টেস্ট ১-১৯ সমাধান করুন। প্রতিদিন ২০ মিনিট বিবিসি নিউজ শোনা ও রাইটিং টাস্ক-২ নিয়মিত অনুশীলন করুন।",
  },
  {
    testName: "Duolingo English Test (DET)",
    purposeBn: "বাসায় বসে অনলাইনে স্বল্প খরচে দ্রুততম ইংরেজি পরীক্ষা",
    typicalMinScore: "105 - 115",
    competitiveScore: "125 - 140+",
    costEstimateBdt: "প্রায় ৬,৫০০ - ৭,০০০ টাকা ($৫৯-$৬৫ ডলার)",
    preparationAdviceBn: "কম্পিউটারে টাইপিং স্পিড বাড়ান এবং ডুওলিঙ্গোর অফিসিয়াল ওয়েবসাইটের ফ্রি আনলিমিটেড মক টেস্ট নিয়মিত দিন।",
  },
  {
    testName: "SAT (Scholastic Assessment Test)",
    purposeBn: "যুক্তরাষ্ট্র ও কানাডার আন্ডারগ্র্যাজুয়েট ভর্তিতে গণিত ও ইংরেজির মূল্যায়ন",
    typicalMinScore: "1150 - 1250",
    competitiveScore: "1400 - 1550+ (ফুল স্কলারশিপের জন্য)",
    costEstimateBdt: "প্রায় ১২,০০০ - ১৪,০০০ টাকা",
    preparationAdviceBn: "খান একাডেমি (Khan Academy) ও ব্লুবুক (Bluebook) অ্যাপ থেকে ডিজিটাল স্যাট মডেল টেস্ট নিয়মিত অনুশীলন করুন।",
  },
  {
    testName: "GRE (Graduate Record Examination)",
    purposeBn: "মাস্টার্স ও পিএইচডি ভর্তিতে অ্যানালিটিক্যাল, ভার্বাল ও কোয়ান্ট যাচাই",
    typicalMinScore: "305 - 315",
    competitiveScore: "320 - 335+ (TA/RA ফান্ডিং পাওয়ার জন্য)",
    costEstimateBdt: "প্রায় ২৫,০০০ - ২৮,০০০ টাকা",
    preparationAdviceBn: "ম্যাগুশ (Magoosh) ও ম্যানহাটন ৫ পাউন্ড বই থেকে কোয়ান্ট এবং গ্রেগম্যাট (GregMat) থেকে ভার্বাল ভোকাবুলারি আয়ত্ত করুন।",
  },
];

export const PACE_TRACKS: PaceTrack[] = [
  {
    id: "fast_track",
    nameBn: "ফাস্ট-ট্র্যাক (Fast Track: ৬-৯ মাস)",
    nameEn: "Fast-Track (6-9 Months)",
    durationMonths: 6,
    suitableForBn: "যাদের হাতে সময় কম, আসন্ন সেশনের জন্য অবিলম্বে প্রস্তুতি নিতে চান",
    descriptionBn: "ভাষার পরীক্ষা এবং কাগজপত্র দ্রুত তৈরি করে সবচেয়ে দ্রুততম সময়ে আবেদন নিশ্চিত করার কৌশল।",
    milestones: [
      {
        monthNumber: 1,
        phaseBn: "মাস ১-২: টেস্ট প্রেপ ও পাসপোর্ট",
        phaseEn: "Month 1-2: Test Prep & Passport",
        category: "tests",
        titleBn: "পাসপোর্ট নিশ্চিতকরণ ও নিবিড় IELTS/DET প্রস্তুতি",
        tasksBn: [
          "ই-পাসপোর্টের মেয়াদ অন্তত ১.৫ বছর আছে কিনা যাচাই বা রিনিউ করুন",
          "IELTS বা Duolingo পরীক্ষার তারিখ বুক করুন এবং প্রতিদিন ৪ ঘণ্টা নিবিড় প্রস্তুতি নিন",
          "এসএসসি ও এইচএসসি পরীক্ষার মূল সার্টিফিকেট ও মার্কশিট সংগ্রহ করুন",
        ],
      },
      {
        monthNumber: 3,
        phaseBn: "মাস ৩-৪: কাগজপত্র সত্যায়ন ও বিশ্ববিদ্যালয় শর্টলিস্ট",
        phaseEn: "Month 3-4: Attestation & Shortlist",
        category: "documents",
        titleBn: "শিক্ষা বোর্ড ও পররাষ্ট্র মন্ত্রণালয় (MOFA) সত্যায়ন",
        tasksBn: [
          "সংশ্লিষ্ট শিক্ষা বোর্ড থেকে মার্কশিট ও সার্টিফিকেট সত্যায়ন করুন",
          "পররাষ্ট্র মন্ত্রণালয় (MOFA) থেকে নোটারি ও কাউন্টার সাইন সম্পন্ন করুন",
          "৫-৮টি উপযুক্ত বিশ্ববিদ্যালয় শর্টলিস্ট করে ডেডলাইন ক্যালেন্ডার তৈরি করুন",
          "কলেজ/বিশ্ববিদ্যালয়ের শিক্ষকদের কাছ থেকে ২টি রিকমেন্ডেশন লেটার (LOR) নিন",
        ],
      },
      {
        monthNumber: 5,
        phaseBn: "মাস ৫-৬: এসওপি ও চূড়ান্ত আবেদন দাখিল",
        phaseEn: "Month 5-6: SOP & Application Submission",
        category: "applications",
        titleBn: "SOP ড্রাফট ও পোর্টালে আবেদন",
        tasksBn: [
          "উদ্দেশ্যপত্র বা Statement of Purpose (SOP) পরিমার্জন করুন",
          "পোর্টালে আবেদন ও ফি পরিশোধ করে অফার লেটারের জন্য অপেক্ষা করুন",
          "ব্যাংক সলভেন্সি সার্টিফিকেট ও স্পন্সরের ট্যাক্স ডকুমেন্টস গোছানো শুরু করুন",
        ],
      },
    ],
  },
  {
    id: "standard",
    nameBn: "স্ট্যান্ডার্ড পেস (Standard Pace: ১২-১৮ মাস)",
    nameEn: "Standard Pace (12-18 Months)",
    durationMonths: 12,
    suitableForBn: "এইচএসসি সম্পন্নকারী বা অনার্স ফাইনাল ইয়ারের শিক্ষার্থীদের জন্য সেরা",
    descriptionBn: "ধাপে ধাপে প্রোফাইল সমৃদ্ধ করে সর্বোচ্চ স্কলারশিপ নিশ্চিত করার সবচেয়ে কার্যকর ও সুষম পথ।",
    milestones: [
      {
        monthNumber: 1,
        phaseBn: "মাস ১-৩: ফাউন্ডেশন ও প্রোফাইল প্রস্তুতি",
        phaseEn: "Month 1-3: Foundation & Profile",
        category: "profile",
        titleBn: "গবেষণা, লক্ষ্য নির্ধারণ ও ভাষার বুনিয়াদ",
        tasksBn: [
          "নিজের বাজেট, দেশ ও পছন্দের ক্যারিয়ার ট্র‍্যাক নির্বাচন করুন",
          "IELTS/TOEFL বা SAT/GRE-এর বেসিক সিলেবাস ও ভোকাবুলারি রিভিশন শুরু করুন",
          "প্রাসঙ্গিক অনলাইন কোর্স, সহশিক্ষা কার্যক্রম বা প্রজেক্টে যুক্ত হন",
        ],
      },
      {
        monthNumber: 4,
        phaseBn: "মাস ৪-৬: স্ট্যান্ডার্ডাইজড পরীক্ষা সমাপ্তি",
        phaseEn: "Month 4-6: Complete Tests",
        category: "tests",
        titleBn: "অফিসিয়াল পরীক্ষায় অংশগ্রহণ ও কাঙ্ক্ষিত স্কোর অর্জন",
        tasksBn: [
          "IELTS (টার্গেট ৭.০+) বা Duolingo অফিসিয়াল পরীক্ষা সম্পন্ন করুন",
          "প্রয়োজনে SAT বা GRE পরীক্ষা সম্পন্ন করুন",
          "সকল একাডেমিক ডকুমেন্টস বোর্ড ও পররাষ্ট্র মন্ত্রণালয় থেকে সত্যায়ন করুন",
        ],
      },
      {
        monthNumber: 7,
        phaseBn: "মাস ৭-৯: আবেদন খসড়া ও এসওপি পরিমার্জন",
        phaseEn: "Month 7-9: Essay & Shortlist",
        category: "applications",
        titleBn: "নিখুঁত এসওপি ও ৩ স্তরের বিশ্ববিদ্যালয় বাছাই (Reach/Match/Safety)",
        tasksBn: [
          "২টি ড্রিম (Reach), ৪টি ম্যাচ (Match) ও ২টি সেফটি (Safety) বিশ্ববিদ্যালয় চূড়ান্ত করুন",
          "প্রতিটি বিশ্ববিদ্যালয়ের প্রোফেসর বা বিভাগের জন্য কাস্টমাইজড এসওপি লিখুন",
          "স্কলারশিপ ও ওয়েভার অ্যাপ্লিকেশনের শর্তাবলী যাচাই করুন",
        ],
      },
      {
        monthNumber: 10,
        phaseBn: "মাস ১০-১২: ভিসা, ব্লকড অ্যাকাউন্ট ও টিকিট",
        phaseEn: "Month 10-12: Visa & Departure",
        category: "visa",
        titleBn: "ভিসা আবেদন ও দেশ ত্যাগের প্রস্তুতি",
        tasksBn: [
          "অফার লেটার পাওয়ার পর ব্লকড অ্যাকাউন্ট বা ব্যাংক ড্রাফট জমা দিন",
          "এম্বাসিতে ভিসা অ্যাপয়েন্টমেন্ট বুক ও ইন্টারভিউ অনুশীলন করুন",
          "পুলিশ ক্লিয়ারেন্স সার্টিফিকেট ও আন্তর্জাতিক ভ্যাকসিনেশন কার্ড সংগ্রহ করুন",
        ],
      },
    ],
  },
  {
    id: "long_term",
    nameBn: "দীর্ঘমেয়াদি প্রস্তুতি (Early Bird / Long Term: ২+ বছর)",
    nameEn: "Long-Term (2+ Years)",
    durationMonths: 24,
    suitableForBn: "কলেজের প্রথম বর্ষ বা অনার্সের শুরুর দিকের শিক্ষার্থীদের জন্য",
    descriptionBn: "আইভি লিগ, অক্সফোর্ড-কেমব্রিজ বা বিশ্বসেরা ১০০ বিশ্ববিদ্যালয়ে ১০০% স্কলারশিপ পাওয়ার প্রস্তুতি।",
    milestones: [
      {
        monthNumber: 1,
        phaseBn: "বছর ১: সর্বোচ্চ জিপিএ ও অলিম্পিয়াড/রিসার্চ",
        phaseEn: "Year 1: High GPA & Research",
        category: "profile",
        titleBn: "একাডেমিক উৎকর্ষ ও এক্সট্রা-কারিকুলার নেতৃত্ব",
        tasksBn: [
          "এসএসসি ও এইচএসসি বা অনার্সে টপ সিজিপিএ নিশ্চিত রাখা",
          "বিজ্ঞান/গণিত অলিম্পিয়াড, বিতর্ক, কোডিং প্রতিযোগিতা বা সমাজসেবায় লিডারশিপ",
          "আন্তর্জাতিক জার্নালে রিসার্চ পেপারের সহকারী হিসেবে কাজ করা",
        ],
      },
      {
        monthNumber: 13,
        phaseBn: "বছর ২: প্রিমিয়াম টেস্ট স্কোর ও ফুল-ফান্ডিং আবেদন",
        phaseEn: "Year 2: Premium Scores & Scholarships",
        category: "applications",
        titleBn: "SAT ১৫০০+ বা GRE ৩২৫+ এবং বিশ্বসেরা স্কলারশিপ",
        tasksBn: [
          "SAT/GRE এবং IELTS-এ সর্বোচ্চ স্কোর নিশ্চিত করা",
          "আন্তর্জাতিক প্রখ্যাত অধ্যাপকদের সাথে যোগাযোগ ও প্রজেক্ট শেয়ারিং",
          "ফুলব্রাইট, ডায়াড বা কমনওয়েলথের প্রাথমিক ড্রাফট তৈরি",
        ],
      },
    ],
  },
];

export const DOCUMENT_ATTESTATION_CHECKLIST = [
  {
    id: "doc-passport",
    titleBn: "ই-পাসপোর্ট (E-Passport)",
    descriptionBn: "ভ্রমণ ও আবেদন শুরুর তারিখ থেকে অন্তত ১.৫ বছর বা ১৮ মাস মেয়াদ থাকা বাধ্যতামূলক।",
    importance: "mandatory",
  },
  {
    id: "doc-transcripts",
    titleBn: "শিক্ষা বোর্ড সত্যায়ন (Education Board Attestation)",
    descriptionBn: "এসএসসি ও এইচএসসির মূল সার্টিফিকেট ও মার্কশিট সংশ্লিষ্ট শিক্ষা বোর্ড থেকে ভেরিফাই ও সিলমোহর করানো।",
    importance: "mandatory",
  },
  {
    id: "doc-mofa",
    titleBn: "পররাষ্ট্র মন্ত্রণালয় সত্যায়ন (MOFA Counter-Attestation)",
    descriptionBn: "বোর্ড ও শিক্ষা মন্ত্রণালয়ের সত্যায়ন শেষে সেগুনবাগিচায় পররাষ্ট্র মন্ত্রণালয় থেকে বিনামূল্যে কাউন্টার সাইন।",
    importance: "mandatory",
  },
  {
    id: "doc-notary",
    titleBn: "নোটারি পাবলিক সত্যায়ন (Notarized Copies)",
    descriptionBn: "মূল দলিলের ফটোকপি প্রথম শ্রেণীর অ্যাডভোকেট বা নোটারি পাবলিক দ্বারা সত্যায়িত কপি।",
    importance: "mandatory",
  },
  {
    id: "doc-bank",
    titleBn: "ব্যাংক সলভেন্সি ও স্টেটমেন্ট (Bank Solvency Certificate)",
    descriptionBn: "স্পন্সর (পিতা/মাতা/নিজে)-এর অ্যাকাউন্ট সলভেন্সি ও বিগত ৬ মাসের স্থিতিশীল ট্রানজ্যাকশন হিস্ট্রি।",
    importance: "mandatory",
  },
  {
    id: "doc-police",
    titleBn: "পুলিশ ক্লিয়ারেন্স সার্টিফিকেট (Police Clearance Certificate)",
    descriptionBn: "অনলাইনে (pcc.police.gov.bd) আবেদন করে থানা থেকে সংগৃহীত নির্দোষ প্রতিবেদন। মেয়াদ সাধারণত ৬ মাস।",
    importance: "mandatory",
  },
  {
    id: "doc-lor",
    titleBn: "একাডেমিক সুপারিশপত্র (Letter of Recommendation - LOR)",
    descriptionBn: "কলেজ বা বিশ্ববিদ্যালয়ের সম্মানিত ২-৩ জন শিক্ষক কর্তৃক অফিশিয়াল লেটারহেড ও প্রাতিষ্ঠানিক ইমেইল সহ সুপারিশ।",
    importance: "high",
  },
  {
    id: "doc-sop",
    titleBn: "উদ্দেশ্যপত্র (Statement of Purpose / Motivational Letter)",
    descriptionBn: "কেন এই বিষয়, কেন এই দেশ ও বিশ্ববিদ্যালয় এবং ভবিষ্যৎ লক্ষ্য নিয়ে সুসংগঠিত ব্যক্তিগত প্রবন্ধ।",
    importance: "high",
  },
];

// ---------------------------------------------------------------------------------------------
// Sanitizers
// ---------------------------------------------------------------------------------------------
export function sanitizeForeignApplications(raw: unknown): ForeignApplication[] {
  if (!Array.isArray(raw)) return [];
  const out: ForeignApplication[] = [];

  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    if (typeof o.id !== "string" || typeof o.universityName !== "string") continue;

    out.push({
      id: o.id.slice(0, 50),
      universityName: o.universityName.slice(0, 100),
      country: typeof o.country === "string" ? o.country.slice(0, 50) : "Germany",
      major: typeof o.major === "string" ? o.major.slice(0, 80) : "Computer Science",
      degreeLevel: o.degreeLevel === "Undergraduate" || o.degreeLevel === "PhD" ? o.degreeLevel : "Masters",
      intake: typeof o.intake === "string" ? o.intake.slice(0, 40) : "Fall 2027",
      deadline: typeof o.deadline === "string" ? o.deadline.slice(0, 40) : "",
      applicationFeeBdt: typeof o.applicationFeeBdt === "number" && o.applicationFeeBdt >= 0 ? o.applicationFeeBdt : 0,
      status: ["shortlisted", "preparing_docs", "applied", "interview", "admitted", "rejected", "visa"].includes(
        o.status as string
      )
        ? (o.status as ForeignApplication["status"])
        : "shortlisted",
      scholarshipApplied: o.scholarshipApplied === true,
      notes: typeof o.notes === "string" ? o.notes.slice(0, 250) : "",
    });

    if (out.length >= 30) break;
  }

  return out;
}

// ---------------------------------------------------------------------------------------------
// Blocked Account & Financial Solvency Calculator
// ---------------------------------------------------------------------------------------------
export interface SolvencyRequirement {
  countryId: string;
  countryNameBn: string;
  currencyCode: string;
  currencySymbol: string;
  exchangeRateToBdt: number; // Approximate indicative conversion rate
  monthlyRequirementOriginal: number;
  monthsCount: number;
  totalLivingOriginal: number;
  tuitionDepositOriginal: number;
  airfareAndEmergencyBdt: number;
  notesBn: string;
}

export interface SolvencyBreakdown {
  country: SolvencyRequirement;
  livingOriginal: number;
  livingBdt: number;
  tuitionBdt: number;
  airfareBdt: number;
  grandTotalBdt: number;
}

export const SOLVENCY_PROFILES: Record<string, SolvencyRequirement> = {
  germany: {
    countryId: "germany",
    countryNameBn: "জার্মানি (Germany)",
    currencyCode: "EUR",
    currencySymbol: "€",
    exchangeRateToBdt: 135,
    monthlyRequirementOriginal: 992,
    monthsCount: 12,
    totalLivingOriginal: 11904,
    tuitionDepositOriginal: 0, // Tuition is free
    airfareAndEmergencyBdt: 180000,
    notesBn: "অফিসিয়াল ব্লকড অ্যাকাউন্ট (Sperrkonto)। পৌঁছানোর পর প্রতি মাসে €৯৯২ ইউরো করে নিজের একাউন্টে তোলা যায়।",
  },
  usa: {
    countryId: "usa",
    countryNameBn: "যুক্তরাষ্ট্র (USA)",
    currencyCode: "USD",
    currencySymbol: "$",
    exchangeRateToBdt: 125,
    monthlyRequirementOriginal: 1500,
    monthsCount: 12,
    totalLivingOriginal: 18000,
    tuitionDepositOriginal: 15000, // Indicative 1st year tuition or partial scholarship
    airfareAndEmergencyBdt: 250000,
    notesBn: "I-20 ইস্যু ও F-1 ভিসা ইন্টারভিউয়ের জন্য ১ বছরের টিউশন ও লিভিং খরচের ব্যাংক স্টেটমেন্ট দেখাতে হয়।",
  },
  uk: {
    countryId: "uk",
    countryNameBn: "যুক্তরাজ্য (UK)",
    currencyCode: "GBP",
    currencySymbol: "£",
    exchangeRateToBdt: 160,
    monthlyRequirementOriginal: 1136, // Outside London rate
    monthsCount: 9, // UKVI requires 9 months
    totalLivingOriginal: 10224,
    tuitionDepositOriginal: 12000, // CAS deposit or remainder
    airfareAndEmergencyBdt: 200000,
    notesBn: "UKVI নিয়ম অনুযায়ী লন্ডনের বাইরে ৯ মাসের জন্য £১০,২২৪ বা লন্ডনের ভেতরে £১৩,৩৪৭ পাউন্ড ২৮ দিন ব্যাংকে থাকতে হবে।",
  },
  canada: {
    countryId: "canada",
    countryNameBn: "কানাডা (Canada)",
    currencyCode: "CAD",
    currencySymbol: "CA$",
    exchangeRateToBdt: 90,
    monthlyRequirementOriginal: 1720,
    monthsCount: 12,
    totalLivingOriginal: 20635, // Updated GIC rate
    tuitionDepositOriginal: 12000,
    airfareAndEmergencyBdt: 220000,
    notesBn: "GIC (Guaranteed Investment Certificate) হিসেবে ২০,৬৩৫ কানাডিয়ান ডলার অগ্রিম ডিপোজিট করতে হয়।",
  },
  australia: {
    countryId: "australia",
    countryNameBn: "অস্ট্রেলিয়া (Australia)",
    currencyCode: "AUD",
    currencySymbol: "A$",
    exchangeRateToBdt: 80,
    monthlyRequirementOriginal: 2475,
    monthsCount: 12,
    totalLivingOriginal: 29710,
    tuitionDepositOriginal: 15000,
    airfareAndEmergencyBdt: 220000,
    notesBn: "হোম অ্যাফেয়ার্স অস্ট্রেলিয়া কর্তৃক নির্ধারিত বাৎসরিক লিভিং কস্ট AUD $২৯,৭১০ দেখাতে হয়।",
  },
};

export function calculateSolvencyRequirement(
  countryId: string,
  customTuitionOriginal?: number
): SolvencyBreakdown {
  const profile = SOLVENCY_PROFILES[countryId] ?? SOLVENCY_PROFILES.germany;
  const tuitionOriginal = typeof customTuitionOriginal === "number" && customTuitionOriginal >= 0
    ? customTuitionOriginal
    : profile.tuitionDepositOriginal;

  const livingBdt = Math.round(profile.totalLivingOriginal * profile.exchangeRateToBdt);
  const tuitionBdt = Math.round(tuitionOriginal * profile.exchangeRateToBdt);
  const grandTotalBdt = livingBdt + tuitionBdt + profile.airfareAndEmergencyBdt;

  return {
    country: profile,
    livingOriginal: profile.totalLivingOriginal,
    livingBdt,
    tuitionBdt,
    airfareBdt: profile.airfareAndEmergencyBdt,
    grandTotalBdt,
  };
}

// ---------------------------------------------------------------------------------------------
// Professor Cold Email Generator
// ---------------------------------------------------------------------------------------------
export interface ProfessorColdEmailInput {
  applicantName: string;
  professorName: string;
  universityName: string;
  department: string;
  paperOrResearchTopic: string;
  applicantBackground: string;
  intendedDegree: "MS" | "PhD";
  intendedTerm: string;
}

export function generateProfessorColdEmail(input: ProfessorColdEmailInput): { subject: string; body: string } {
  const pName = input.professorName.trim() || "Professor";
  const uName = input.universityName.trim() || "your university";
  const dept = input.department.trim() || "Department of Computer Science & Engineering";
  const aName = input.applicantName.trim() || "Prospective Student";
  const deg = input.intendedDegree || "MS";
  const term = input.intendedTerm.trim() || "Fall 2027";
  const topic = input.paperOrResearchTopic.trim() || "recent publications in your laboratory";
  const bg = input.applicantBackground.trim() || "my undergraduate coursework and research thesis";

  const subject = `Prospective ${deg} Student Inquiry (${term}) — ${aName}`;

  const body = `Dear Dr. ${pName},

I hope this email finds you well.

My name is ${aName}, and I recently completed my undergraduate degree with a focus on ${bg}. I am writing to express my strong interest in joining your research group as a prospective ${deg} student for ${term} in the ${dept} at ${uName}.

I have been following your lab's outstanding work and was particularly inspired by your paper regarding ${topic}. The methodology and insights presented in your work strongly align with my academic trajectory and passion for advancing computational solutions in this domain.

During my undergraduate studies in Bangladesh, I developed hands-on technical experience with data structures, algorithms, and practical software experimentation. I am eager to apply my disciplined work ethic and analytical skills to contribute directly to your ongoing research projects.

Could you kindly let me know if you are anticipating taking on new graduate research assistants (GRA/GTA) for the ${term} cohort? I would welcome the opportunity to discuss how my background could support your lab's objectives.

I have attached my Curriculum Vitae (CV) and unofficial academic transcripts for your review. Thank you very much for your time and consideration.

Sincerely,
${aName}
Email: [Your Professional Email]
LinkedIn: [Your Profile Link]
GitHub / Portfolio: [Your Link]`;

  return { subject, body };
}

