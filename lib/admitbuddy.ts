// AdmitBuddy: university discovery, eligibility hints and application tracking.
// Pure and deterministic (no imports) so it is unit-tested under `node --test`.
//
// Honesty rules:
// - No admission date is ever invented. Deadlines come from the student, copied from the
//   official circular, with the source they used.
// - GPA thresholds are indicative eligibility hints, not admission chances. Public
//   university seats are decided by admission-test merit.

export interface University {
  id: string;
  name: string;
  shortName: string;
  type: "public" | "private" | "international";
  minGpaSsc: number;
  minGpaHsc: number;
  minGpaTotal: number;
  minBudgetPerSemester: number; // BDT, indicative
  maxBudgetPerSemester: number; // BDT, indicative
  location: string;
  programs: string[];
  applicationDeadline: string | null; // null = not announced / not entered
  website: string;
  waiverInfo: string;
  rankingBd: number; // display order only, not an official ranking
}

export interface StudentProfile {
  sscGpa: number;
  hscGpa: number;
  group: "Science" | "Commerce" | "Humanities";
  maxBudgetPerSemester: number;
  preferredLocations: string[];
  interests: string[];
  name?: string;
}

/** A date the student copied from an official circular. */
export interface UserDeadline {
  universityId: string;
  kind: "application" | "exam" | "other";
  date: string; // YYYY-MM-DD
  label: string;
  sourceNote: string; // e.g. "GST circular PDF, gstadmission.ac.bd"
}

export interface MatchResult {
  university: University;
  matchScore: number; // 0 - 100 fit score (not an admission probability)
  category: "Reach" | "Match" | "Safety";
  eligibility: "meets" | "below" | "check";
  breakdown: {
    gpaScore: number;
    budgetScore: number;
    locationScore: number;
    programScore: number;
  };
  nextDeadline: UserDeadline | null;
  daysLeft: number | null; // null when no date has been entered
  isClosed: boolean;
  isBestMatch?: boolean;
}

export interface DeadlineItem {
  id: string;
  universityId: string;
  universityName: string;
  title: string;
  dueDate: string | null; // null = date not announced / not entered yet
  isDone: boolean;
  priority: "high" | "medium" | "low";
  sourceNote?: string;
}

export interface OfficialResource {
  label: string;
  url: string;
  note: string;
  checked: string;
}

// Portals confirmed in research on 2026-11-05 (see docs). Links only; we do not copy dates.
export const OFFICIAL_RESOURCES: OfficialResource[] = [
  { label: "GST গুচ্ছ ভর্তি (সাধারণ, বিজ্ঞান ও প্রযুক্তি)", url: "https://gstadmission.ac.bd", note: "২০২৫-২৬ সেশনে অনলাইন আবেদন ডিসেম্বর ২০২৫ থেকে জানুয়ারি ২০২৬ পর্যন্ত চলেছিল বলে খবর প্রকাশিত হয়েছে। ২০২৬-২৭ সার্কুলার দেখুন।", checked: "2026-11-05" },
  { label: "প্রধানমন্ত্রীর শিক্ষা সহায়তা ট্রাস্ট — স্নাতক উপবৃত্তি", url: "https://estipend.pmeat.gov.bd", note: "স্নাতক পর্যায়ের শিক্ষার্থীরা এই পোর্টালে নিবন্ধন করেন বলে খবর প্রকাশিত। যোগ্যতা ও সময়সূচি পোর্টালে দেখুন।", checked: "2026-11-05" },
  { label: "বিশ্ববিদ্যালয় মঞ্জুরি কমিশন (UGC)", url: "https://ugc.gov.bd", note: "অনুমোদিত সরকারি ও বেসরকারি বিশ্ববিদ্যালয়ের তালিকা যাচাই করুন।", checked: "2026-11-05" },
];

// Bangladeshi universities. Names, websites and programme lists are for discovery only.
// GPA thresholds and fee ranges are INDICATIVE and unverified for the 2026-27 session;
// deadlines are null until the student enters the date from the official circular.
// See docs/admitbuddy-research-and-plan.md.
export const UNIVERSITIES: University[] = [
  {
    id: "buet",
    name: "Bangladesh University of Engineering and Technology",
    shortName: "BUET",
    type: "public",
    minGpaSsc: 5.0,
    minGpaHsc: 5.0,
    minGpaTotal: 10.0,
    minBudgetPerSemester: 5000,
    maxBudgetPerSemester: 15000,
    location: "Dhaka",
    programs: ["CSE", "EEE", "Mechanical", "Civil", "Architecture", "BME"],
    applicationDeadline: null,
    website: "https://www.buet.ac.bd",
    waiverInfo: "সরকারি ভর্তুকিযুক্ত টিউশন। সঠিক ফি ও বৃত্তির তথ্য ভর্তি সার্কুলারে দেখুন।",
    rankingBd: 1,
  },
  {
    id: "du",
    name: "University of Dhaka",
    shortName: "DU",
    type: "public",
    minGpaSsc: 4.0,
    minGpaHsc: 4.0,
    minGpaTotal: 8.5,
    minBudgetPerSemester: 4000,
    maxBudgetPerSemester: 12000,
    location: "Dhaka",
    programs: ["CSE", "Software Engineering", "BBA", "Economics", "Pharmacy", "Law", "Physics"],
    applicationDeadline: null,
    website: "https://www.du.ac.bd",
    waiverInfo: "সরকারি ভর্তুকিযুক্ত টিউশন। সঠিক ফি ও বৃত্তির তথ্য ভর্তি সার্কুলারে দেখুন।",
    rankingBd: 2,
  },
  {
    id: "sust",
    name: "Shahjalal University of Science and Technology",
    shortName: "SUST",
    type: "public",
    minGpaSsc: 4.0,
    minGpaHsc: 4.0,
    minGpaTotal: 8.0,
    minBudgetPerSemester: 4500,
    maxBudgetPerSemester: 12000,
    location: "Sylhet",
    programs: ["CSE", "Software Engineering", "EEE", "Civil", "Architecture", "Economics"],
    applicationDeadline: null,
    website: "https://www.sust.edu",
    waiverInfo: "সরকারি ভর্তুকিযুক্ত টিউশন। সঠিক ফি ও বৃত্তির তথ্য ভর্তি সার্কুলারে দেখুন।",
    rankingBd: 3,
  },
  {
    id: "iut",
    name: "Islamic University of Technology",
    shortName: "IUT",
    type: "international",
    minGpaSsc: 4.8,
    minGpaHsc: 4.8,
    minGpaTotal: 9.5,
    minBudgetPerSemester: 65000,
    maxBudgetPerSemester: 140000,
    location: "Gazipur",
    programs: ["CSE", "Software Engineering", "EEE", "Mechanical", "Civil"],
    applicationDeadline: null,
    website: "https://www.iutoic-dhaka.edu",
    waiverInfo: "আন্তর্জাতিক/বিশেষ কাঠামোর প্রতিষ্ঠান। টিউশন ও বৃত্তির শর্ত অফিসিয়াল ওয়েবসাইটে দেখুন।",
    rankingBd: 4,
  },
  {
    id: "brac",
    name: "BRAC University",
    shortName: "BRACU",
    type: "private",
    minGpaSsc: 3.5,
    minGpaHsc: 3.5,
    minGpaTotal: 7.5,
    minBudgetPerSemester: 95000,
    maxBudgetPerSemester: 165000,
    location: "Dhaka",
    programs: ["CSE", "Data Science", "EEE", "BBA", "Economics", "Pharmacy", "Biotechnology"],
    applicationDeadline: null,
    website: "https://www.bracu.ac.bd",
    waiverInfo: "বেসরকারি বিশ্ববিদ্যালয়ে সাধারণত মেধা ও আর্থিক ওয়েভার থাকে — হার ও শর্ত বিশ্ববিদ্যালয়ের অফিসিয়াল ওয়েবসাইটে যাচাই করুন।",
    rankingBd: 5,
  },
  {
    id: "nsu",
    name: "North South University",
    shortName: "NSU",
    type: "private",
    minGpaSsc: 3.5,
    minGpaHsc: 3.5,
    minGpaTotal: 7.5,
    minBudgetPerSemester: 90000,
    maxBudgetPerSemester: 160000,
    location: "Dhaka",
    programs: ["CSE", "EEE", "BBA", "Marketing", "Finance", "Pharmacy", "Economics"],
    applicationDeadline: null,
    website: "https://www.northsouth.edu",
    waiverInfo: "বেসরকারি বিশ্ববিদ্যালয়ে সাধারণত মেধা ও আর্থিক ওয়েভার থাকে — হার ও শর্ত বিশ্ববিদ্যালয়ের অফিসিয়াল ওয়েবসাইটে যাচাই করুন।",
    rankingBd: 6,
  },
  {
    id: "ruet",
    name: "Rajshahi University of Engineering & Technology",
    shortName: "RUET",
    type: "public",
    minGpaSsc: 4.5,
    minGpaHsc: 4.8,
    minGpaTotal: 9.2,
    minBudgetPerSemester: 5000,
    maxBudgetPerSemester: 14000,
    location: "Rajshahi",
    programs: ["CSE", "EEE", "ECE", "Mechanical", "Civil"],
    applicationDeadline: null,
    website: "https://www.ruet.ac.bd",
    waiverInfo: "সরকারি ভর্তুকিযুক্ত টিউশন। সঠিক ফি ও বৃত্তির তথ্য ভর্তি সার্কুলারে দেখুন।",
    rankingBd: 7,
  },
  {
    id: "kuet",
    name: "Khulna University of Engineering & Technology",
    shortName: "KUET",
    type: "public",
    minGpaSsc: 4.5,
    minGpaHsc: 4.8,
    minGpaTotal: 9.2,
    minBudgetPerSemester: 5000,
    maxBudgetPerSemester: 14000,
    location: "Khulna",
    programs: ["CSE", "EEE", "BME", "Mechanical", "Civil"],
    applicationDeadline: null,
    website: "https://www.kuet.ac.bd",
    waiverInfo: "সরকারি ভর্তুকিযুক্ত টিউশন। সঠিক ফি ও বৃত্তির তথ্য ভর্তি সার্কুলারে দেখুন।",
    rankingBd: 8,
  },
  {
    id: "cuet",
    name: "Chittagong University of Engineering & Technology",
    shortName: "CUET",
    type: "public",
    minGpaSsc: 4.5,
    minGpaHsc: 4.8,
    minGpaTotal: 9.2,
    minBudgetPerSemester: 5000,
    maxBudgetPerSemester: 14000,
    location: "Chattogram",
    programs: ["CSE", "EEE", "Petroleum", "Mechanical", "Civil"],
    applicationDeadline: null,
    website: "https://www.cuet.ac.bd",
    waiverInfo: "সরকারি ভর্তুকিযুক্ত টিউশন। সঠিক ফি ও বৃত্তির তথ্য ভর্তি সার্কুলারে দেখুন।",
    rankingBd: 9,
  },
  {
    id: "aiub",
    name: "American International University-Bangladesh",
    shortName: "AIUB",
    type: "private",
    minGpaSsc: 3.0,
    minGpaHsc: 3.0,
    minGpaTotal: 6.5,
    minBudgetPerSemester: 70000,
    maxBudgetPerSemester: 125000,
    location: "Dhaka",
    programs: ["CSE", "Software Engineering", "EEE", "BBA", "Architecture"],
    applicationDeadline: null,
    website: "https://www.aiub.edu",
    waiverInfo: "বেসরকারি বিশ্ববিদ্যালয়ে সাধারণত মেধা ও আর্থিক ওয়েভার থাকে — হার ও শর্ত বিশ্ববিদ্যালয়ের অফিসিয়াল ওয়েবসাইটে যাচাই করুন।",
    rankingBd: 10,
  },
  {
    id: "uiu",
    name: "United International University",
    shortName: "UIU",
    type: "private",
    minGpaSsc: 3.0,
    minGpaHsc: 3.0,
    minGpaTotal: 6.5,
    minBudgetPerSemester: 65000,
    maxBudgetPerSemester: 115000,
    location: "Dhaka",
    programs: ["CSE", "Data Science", "EEE", "BBA", "Economics"],
    applicationDeadline: null,
    website: "https://www.uiu.ac.bd",
    waiverInfo: "বেসরকারি বিশ্ববিদ্যালয়ে সাধারণত মেধা ও আর্থিক ওয়েভার থাকে — হার ও শর্ত বিশ্ববিদ্যালয়ের অফিসিয়াল ওয়েবসাইটে যাচাই করুন।",
    rankingBd: 11,
  },
  {
    id: "diu",
    name: "Daffodil International University",
    shortName: "DIU",
    type: "private",
    minGpaSsc: 2.5,
    minGpaHsc: 2.5,
    minGpaTotal: 6.0,
    minBudgetPerSemester: 50000,
    maxBudgetPerSemester: 95000,
    location: "Dhaka",
    programs: ["CSE", "Software Engineering", "EEE", "BBA", "Multimedia & Creative Tech"],
    applicationDeadline: null,
    website: "https://www.daffodilvarsity.edu.bd",
    waiverInfo: "বেসরকারি বিশ্ববিদ্যালয়ে সাধারণত মেধা ও আর্থিক ওয়েভার থাকে — হার ও শর্ত বিশ্ববিদ্যালয়ের অফিসিয়াল ওয়েবসাইটে যাচাই করুন।",
    rankingBd: 12,
  },
  {
    id: "ewu",
    name: "East West University",
    shortName: "EWU",
    type: "private",
    minGpaSsc: 3.5,
    minGpaHsc: 3.5,
    minGpaTotal: 7.0,
    minBudgetPerSemester: 75000,
    maxBudgetPerSemester: 130000,
    location: "Dhaka",
    programs: ["CSE", "EEE", "BBA", "Economics", "Pharmacy"],
    applicationDeadline: null,
    website: "https://www.ewubd.edu",
    waiverInfo: "বেসরকারি বিশ্ববিদ্যালয়ে সাধারণত মেধা ও আর্থিক ওয়েভার থাকে — হার ও শর্ত বিশ্ববিদ্যালয়ের অফিসিয়াল ওয়েবসাইটে যাচাই করুন।",
    rankingBd: 13,
  },
  {
    id: "aust",
    name: "Ahsanullah University of Science and Technology",
    shortName: "AUST",
    type: "private",
    minGpaSsc: 4.0,
    minGpaHsc: 4.5,
    minGpaTotal: 8.5,
    minBudgetPerSemester: 85000,
    maxBudgetPerSemester: 140000,
    location: "Dhaka",
    programs: ["CSE", "EEE", "Mechanical", "Civil", "Architecture", "Textile"],
    applicationDeadline: null,
    website: "https://www.aust.edu",
    waiverInfo: "বেসরকারি বিশ্ববিদ্যালয়ে সাধারণত মেধা ও আর্থিক ওয়েভার থাকে — হার ও শর্ত বিশ্ববিদ্যালয়ের অফিসিয়াল ওয়েবসাইটে যাচাই করুন।",
    rankingBd: 14,
  },
  {
    id: "bup",
    name: "Bangladesh University of Professionals",
    shortName: "BUP",
    type: "public",
    minGpaSsc: 4.5,
    minGpaHsc: 4.5,
    minGpaTotal: 9.0,
    minBudgetPerSemester: 25000,
    maxBudgetPerSemester: 45000,
    location: "Dhaka",
    programs: ["CSE", "ICT", "BBA", "Economics", "International Relations"],
    applicationDeadline: null,
    website: "https://www.bup.edu.bd",
    waiverInfo: "সরকারি ভর্তুকিযুক্ত টিউশন। সঠিক ফি ও বৃত্তির তথ্য ভর্তি সার্কুলারে দেখুন।",
    rankingBd: 15,
  },
  {
    id: "cu",
    name: "University of Chittagong",
    shortName: "CU",
    type: "public",
    minGpaSsc: 3.5,
    minGpaHsc: 3.5,
    minGpaTotal: 8.0,
    minBudgetPerSemester: 4000,
    maxBudgetPerSemester: 12000,
    location: "Chattogram",
    programs: ["CSE", "EEE", "BBA", "Economics", "Law"],
    applicationDeadline: null,
    website: "https://www.cu.ac.bd",
    waiverInfo: "সরকারি ভর্তুকিযুক্ত টিউশন। সঠিক ফি ও বৃত্তির তথ্য ভর্তি সার্কুলারে দেখুন।",
    rankingBd: 16,
  },
  {
    id: "ju",
    name: "Jahangirnagar University",
    shortName: "JU",
    type: "public",
    minGpaSsc: 4.0,
    minGpaHsc: 4.0,
    minGpaTotal: 8.0,
    minBudgetPerSemester: 4000,
    maxBudgetPerSemester: 12000,
    location: "Savar, Dhaka",
    programs: ["CSE", "IIT", "Pharmacy", "Biochemistry", "Economics", "Physics", "Chemistry", "Law"],
    applicationDeadline: null,
    website: "https://www.juniv.edu",
    waiverInfo: "সম্পূর্ণ আবাসিক সরকারি বিশ্ববিদ্যালয়। বিভাগভিত্তিক শর্ত ও ভর্তি পরীক্ষার বিস্তারিত অফিসিয়াল সার্কুলারে দেখুন।",
    rankingBd: 17,
  },
  {
    id: "ru",
    name: "University of Rajshahi",
    shortName: "RU",
    type: "public",
    minGpaSsc: 3.5,
    minGpaHsc: 3.5,
    minGpaTotal: 7.5,
    minBudgetPerSemester: 4000,
    maxBudgetPerSemester: 12000,
    location: "Rajshahi",
    programs: ["CSE", "ICE", "EEE", "BBA", "Economics", "Law", "Pharmacy", "Fisheries"],
    applicationDeadline: null,
    website: "https://www.ru.ac.bd",
    waiverInfo: "দেশের দ্বিতীয় বৃহত্তম সরকারি বিশ্ববিদ্যালয়। দ্বিতীয়বার পরীক্ষার সুযোগ ও ইউনিট শর্ত সার্কুলার দেখুন।",
    rankingBd: 18,
  },
  {
    id: "bu",
    name: "University of Barishal",
    shortName: "BU",
    type: "public",
    minGpaSsc: 3.5,
    minGpaHsc: 3.5,
    minGpaTotal: 7.5,
    minBudgetPerSemester: 4000,
    maxBudgetPerSemester: 11000,
    location: "Barishal",
    programs: ["CSE", "EEE", "BBA", "Economics", "English", "Chemistry", "Law"],
    applicationDeadline: null,
    website: "https://bu.ac.bd",
    waiverInfo: "সাধারণত GST গুচ্ছের অন্তর্ভুক্ত সরকারি সাধারণ বিশ্ববিদ্যালয়। আসন ও আবেদন প্রক্রিয়া সার্কুলার অনুযায়ী।",
    rankingBd: 19,
  },
  {
    id: "cou",
    name: "Comilla University",
    shortName: "CoU",
    type: "public",
    minGpaSsc: 3.5,
    minGpaHsc: 3.5,
    minGpaTotal: 7.5,
    minBudgetPerSemester: 4000,
    maxBudgetPerSemester: 11000,
    location: "Cumilla",
    programs: ["CSE", "ICT", "Pharmacy", "BBA", "Economics", "Physics"],
    applicationDeadline: null,
    website: "https://www.cou.ac.bd",
    waiverInfo: "সরকারি সাধারণ বিশ্ববিদ্যালয় (সাধারণত GST গুচ্ছভুক্ত)। ভর্তি শর্ত ও ফি অফিসিয়াল পোর্টালে দেখুন।",
    rankingBd: 20,
  },
  {
    id: "iu",
    name: "Islamic University, Bangladesh",
    shortName: "IU",
    type: "public",
    minGpaSsc: 3.5,
    minGpaHsc: 3.5,
    minGpaTotal: 7.0,
    minBudgetPerSemester: 3500,
    maxBudgetPerSemester: 10000,
    location: "Kushtia",
    programs: ["CSE", "ICE", "Biotechnology", "BBA", "Economics", "Law", "Al-Quran & Islamic Studies"],
    applicationDeadline: null,
    website: "https://www.iu.ac.bd",
    waiverInfo: "সরকারি বিশ্ববিদ্যালয়। প্রকৌশল, বিজ্ঞান, ব্যবসায় প্রশাসন ও ধর্মতত্ত্ব অনুষদভিত্তিক ভর্তি পরীক্ষা অনুষ্ঠিত হয়।",
    rankingBd: 21,
  },
  {
    id: "butex",
    name: "Bangladesh University of Textiles",
    shortName: "BUTEX",
    type: "public",
    minGpaSsc: 4.5,
    minGpaHsc: 4.5,
    minGpaTotal: 9.0,
    minBudgetPerSemester: 5000,
    maxBudgetPerSemester: 14000,
    location: "Dhaka",
    programs: ["Textile Engineering", "Textile Machinery", "Apparel Engineering", "Wet Process Engineering", "Dyes & Chemical Engineering"],
    applicationDeadline: null,
    website: "https://www.butex.edu.bd",
    waiverInfo: "টেক্সটাইল প্রকৌশল শিক্ষায় দেশের একমাত্র বিশেষায়িত পাবলিক বিশ্ববিদ্যালয়। একক ভর্তি পরীক্ষার মাধ্যমে ভর্তি।",
    rankingBd: 22,
  },
  {
    id: "bsmrau",
    name: "Bangabandhu Sheikh Mujibur Rahman Agricultural University",
    shortName: "BSMRAU",
    type: "public",
    minGpaSsc: 4.0,
    minGpaHsc: 4.0,
    minGpaTotal: 8.5,
    minBudgetPerSemester: 4500,
    maxBudgetPerSemester: 12000,
    location: "Gazipur",
    programs: ["Agriculture", "Fisheries", "Veterinary Medicine", "Agricultural Economics"],
    applicationDeadline: null,
    website: "https://bsmrau.edu.bd",
    waiverInfo: "কৃষি গুচ্ছ (Agricultural Cluster) ভুক্ত শীর্ষ গবেষণাভিত্তিক কৃষি বিশ্ববিদ্যালয়। কেন্দ্রীয় সার্কুলার দেখুন।",
    rankingBd: 23,
  },
  {
    id: "dmc",
    name: "Dhaka Medical College (DGHS Medical Cluster)",
    shortName: "DMC",
    type: "public",
    minGpaSsc: 4.0,
    minGpaHsc: 4.0,
    minGpaTotal: 9.0,
    minBudgetPerSemester: 3000,
    maxBudgetPerSemester: 10000,
    location: "Dhaka",
    programs: ["MBBS", "BDS"],
    applicationDeadline: null,
    website: "https://dgme.portal.gov.bd",
    waiverInfo: "স্বাস্থ্য শিক্ষা অধিদপ্তর (DGME/DGHS) নিয়ন্ত্রিত কেন্দ্রীয় মেডিকেল ভর্তি পরীক্ষা। নামমাত্র সরকারি চিকিৎসা শিক্ষা ফি।",
    rankingBd: 24,
  },
  {
    id: "ku",
    name: "Khulna University",
    shortName: "KU",
    type: "public",
    minGpaSsc: 4.0,
    minGpaHsc: 4.0,
    minGpaTotal: 8.0,
    minBudgetPerSemester: 4000,
    maxBudgetPerSemester: 12000,
    location: "Khulna",
    programs: ["CSE", "ECE", "BBA", "Economics", "Biotechnology", "Architecture", "Environmental Science"],
    applicationDeadline: null,
    website: "https://ku.ac.bd",
    waiverInfo: "সরকারি সাধারণ বিশ্ববিদ্যালয়। রাজনীতিমুক্ত সুশৃঙ্খল ক্যাম্পাস। ভর্তি বিজ্ঞপ্তি অফিসিয়াল সাইটে দেখুন।",
    rankingBd: 25,
  },
];

export function deadlinesFor(universityId: string, userDeadlines: UserDeadline[]): UserDeadline[] {
  return userDeadlines.filter((d) => d.universityId === universityId).sort((a, b) => a.date.localeCompare(b.date));
}

export function daysBetween(fromIso: string, toIso: string): number {
  const a = Date.parse(fromIso.slice(0, 10) + "T00:00:00Z");
  const b = Date.parse(toIso.slice(0, 10) + "T00:00:00Z");
  return Math.round((b - a) / 86_400_000);
}

// Weighted fit score (0 - 100): GPA eligibility 40, budget 30, location 15, programme 15.
// `today` is YYYY-MM-DD so results are deterministic in tests.
export function calculateMatches(profile: StudentProfile, userDeadlines: UserDeadline[] = [], today = "1970-01-01"): MatchResult[] {
  const userTotalGpa = profile.sscGpa + profile.hscGpa;

  const results: MatchResult[] = UNIVERSITIES.map((u) => {
    const meets = userTotalGpa >= u.minGpaTotal && profile.hscGpa >= u.minGpaHsc && profile.sscGpa >= u.minGpaSsc;
    let gpaScore = 0;
    if (meets) gpaScore = 40;
    else gpaScore = Math.max(0, Math.min(38, Math.round((userTotalGpa / u.minGpaTotal) * 35)));

    let budgetScore = 0;
    if (u.type === "public") budgetScore = 30;
    else if (profile.maxBudgetPerSemester >= u.maxBudgetPerSemester) budgetScore = 30;
    else if (profile.maxBudgetPerSemester >= u.minBudgetPerSemester) {
      const span = u.maxBudgetPerSemester - u.minBudgetPerSemester;
      budgetScore = Math.round(15 + ((profile.maxBudgetPerSemester - u.minBudgetPerSemester) / (span || 1)) * 15);
    } else budgetScore = Math.max(0, Math.round((profile.maxBudgetPerSemester / (u.minBudgetPerSemester || 1)) * 14));

    const locationScore =
      !profile.preferredLocations.length || profile.preferredLocations.some((l) => l.toLowerCase() === u.location.toLowerCase()) ? 15 : 5;

    let programScore = 15;
    if (profile.interests.length) {
      const hits = profile.interests.filter((i) => u.programs.some((p) => p.toLowerCase().includes(i.toLowerCase()))).length;
      programScore = Math.min(15, hits * 8 || 4);
    }

    const totalScore = Math.min(100, Math.round(gpaScore + budgetScore + locationScore + programScore));

    // Reach / Match / Safety describes competitiveness, not probability. Highly selective
    // public universities are always "Reach" because seats are decided by the admission test.
    let category: MatchResult["category"];
    const selective = u.minGpaTotal >= 9.5 || (u.type === "public" && u.minGpaHsc >= 5.0);
    if (!meets) category = "Reach";
    else if (selective) category = "Reach";
    else if (u.type === "public") category = "Match";
    else if (userTotalGpa >= u.minGpaTotal + 1.0 && budgetScore >= 25) category = "Safety";
    else category = totalScore >= 80 ? "Match" : "Reach";

    const upcoming = deadlinesFor(u.id, userDeadlines).filter((d) => daysBetween(today, d.date) >= 0);
    const past = deadlinesFor(u.id, userDeadlines).filter((d) => daysBetween(today, d.date) < 0);
    const nextDeadline = upcoming[0] ?? null;
    const daysLeft = nextDeadline ? daysBetween(today, nextDeadline.date) : null;
    const isClosed = !nextDeadline && past.some((d) => d.kind === "application");

    return {
      university: u,
      matchScore: totalScore,
      category,
      eligibility: meets ? "meets" : "below",
      breakdown: { gpaScore, budgetScore, locationScore, programScore },
      nextDeadline,
      daysLeft,
      isClosed,
    };
  });

  results.sort((a, b) => b.matchScore - a.matchScore);
  if (results.length) results[0].isBestMatch = true;
  return results;
}

export const DOCUMENT_CHECKLIST = [
  { id: "ssc", label: "SSC/সমমান মার্কশিট ও সনদ (মূল + সত্যায়িত কপি)" },
  { id: "hsc", label: "HSC/সমমান মার্কশিট ও সনদ" },
  { id: "photo", label: "সাম্প্রতিক পাসপোর্ট সাইজ ছবি (সার্কুলারের মাপ অনুযায়ী ডিজিটাল কপি)" },
  { id: "nid", label: "জন্ম নিবন্ধন / জাতীয় পরিচয়পত্র" },
  { id: "fee", label: "আবেদন ফি পরিশোধের রসিদ / ট্রানজেকশন আইডি" },
  { id: "admit", label: "প্রবেশপত্র (Admit card) ডাউনলোড ও প্রিন্ট" },
  { id: "quota", label: "কোটা/বিশেষ সনদ (প্রযোজ্য হলে)" },
];

/** Application tasks for the shortlist. Tasks without an entered date stay undated, never guessed. */
export function generateDeadlines(shortlisted: University[], userDeadlines: UserDeadline[]): DeadlineItem[] {
  const list: DeadlineItem[] = [];
  for (const u of shortlisted) {
    const ds = deadlinesFor(u.id, userDeadlines);
    const app = ds.find((d) => d.kind === "application");
    const exam = ds.find((d) => d.kind === "exam");
    list.push({
      id: `${u.id}-circular`, universityId: u.id, universityName: u.shortName,
      title: `${u.shortName}: অফিসিয়াল ভর্তি সার্কুলার পড়ে তারিখগুলো এখানে যোগ করুন`,
      dueDate: null, isDone: ds.length > 0, priority: ds.length ? "low" : "high",
    });
    list.push({
      id: `${u.id}-app`, universityId: u.id, universityName: u.shortName,
      title: `${u.shortName}: অনলাইন আবেদন জমা`,
      dueDate: app?.date ?? null, isDone: false, priority: "high", sourceNote: app?.sourceNote,
    });
    if (exam) {
      list.push({
        id: `${u.id}-exam`, universityId: u.id, universityName: u.shortName,
        title: `${u.shortName}: ভর্তি পরীক্ষা`, dueDate: exam.date, isDone: false, priority: "high", sourceNote: exam.sourceNote,
      });
    }
    for (const other of ds.filter((d) => d.kind === "other")) {
      list.push({
        id: `${u.id}-other-${other.date}-${other.label.slice(0, 12)}`, universityId: u.id, universityName: u.shortName,
        title: `${u.shortName}: ${other.label}`, dueDate: other.date, isDone: false, priority: "medium", sourceNote: other.sourceNote,
      });
    }
  }
  return list.sort((a, b) => (a.dueDate ?? "9999").localeCompare(b.dueDate ?? "9999"));
}

/** Validate a deadline the user typed. Returns a Bangla error or null. */
export function validateUserDeadline(d: Partial<UserDeadline>): string | null {
  if (!d.universityId || !UNIVERSITIES.some((u) => u.id === d.universityId)) return "বিশ্ববিদ্যালয় নির্বাচন করুন।";
  if (!d.date || !/^\d{4}-\d{2}-\d{2}$/.test(d.date) || Number.isNaN(Date.parse(d.date))) return "সঠিক তারিখ দিন।";
  const y = Number(d.date.slice(0, 4));
  if (y < 2024 || y > 2030) return "তারিখটি ২০২৪–২০৩০ এর মধ্যে হতে হবে।";
  if (!d.sourceNote || d.sourceNote.trim().length < 3) return "তারিখটি কোথা থেকে পেয়েছেন লিখুন (যেমন: অফিসিয়াল সার্কুলার)।";
  return null;
}

// SOP Template Generator
export function generateSopDraft(params: {
  studentName: string;
  university: University;
  program: string;
  profile: StudentProfile;
  tone: "ambitious" | "sincere" | "storytelling";
}): string {
  const { studentName, university, program, profile, tone } = params;

  if (tone === "storytelling") {
    return `To the Admissions Committee of ${university.name},

Growing up in Bangladesh, my curiosity for ${program} was sparked not merely by textbooks, but by seeing real-world inefficiencies and aspiring to solve them. Achieving an SSC GPA of ${profile.sscGpa.toFixed(2)} and an HSC GPA of ${profile.hscGpa.toFixed(2)} in the ${profile.group} stream laid the rigorous quantitative foundation I carry today.

${university.shortName}'s distinguished faculty, state-of-the-art laboratories, and forward-thinking curriculum in ${program} make it my top academic destination. In particular, ${university.shortName}'s emphasis on practical research and regional development aligns seamlessly with my long-term goal of building scalable technological infrastructure in Bangladesh.

Given my disciplined academic background and dedication to innovation, I am confident that I will actively enrich your academic community. I eagerly look forward to starting my undergraduate journey at ${university.name}.

Respectfully submitted,
${studentName || "Prospective Student"}`;
  }

  if (tone === "sincere") {
    return `Statement of Purpose for Undergraduate Admission
Target Institution: ${university.name} (${university.shortName})
Intended Major: ${program}

I am formally applying for admission into the ${program} undergraduate department at ${university.name}. Throughout my secondary education in Bangladesh, I maintained high academic integrity, securing GPA ${profile.sscGpa.toFixed(2)} in SSC and GPA ${profile.hscGpa.toFixed(2)} in HSC (${profile.group} background).

My choice of ${university.shortName} is guided by its stellar academic reputation, rigorous standards, and track record of graduating leaders in ${program}.

I seek to bring relentless curiosity, collaborative teamwork, and strong problem-solving skills to the incoming batch. Thank you for reviewing my application and considering me for this life-changing academic opportunity.

Sincerely,
${studentName || "Applicant"}`;
  }

  // default: ambitious
  return `Academic Statement of Purpose
Applicant: ${studentName || "Prospective Scholar"} | Target: ${university.shortName} — ${program}

As a motivated student from Bangladesh equipped with an SSC GPA of ${profile.sscGpa.toFixed(2)} and HSC GPA of ${profile.hscGpa.toFixed(2)}, I am applying to ${university.name} to master the foundational principles and modern industrial practices of ${program}.

${university.shortName} stands out as the premier benchmark for academic rigor in ${university.location}. Its cutting-edge research opportunities, competitive student cohort, and industry linkages offer the ideal launchpad for my ambitions in ${program}. 

With a clear focus on technological advancement and ethical leadership, I am prepared to meet the demanding standards of ${university.shortName} and contribute meaningfully to the institution's legacy of excellence.

Sincerely,
${studentName || "Applicant"}`;
}

// CollegeVine-Style Application List Balance Analyzer
export interface ListBalanceReport {
  reaches: number;
  matches: number;
  safeties: number;
  total: number;
  isBalanced: boolean;
  statusBn: string;
  recommendationBn: string;
}

export function analyzeListBalance(allMatches: MatchResult[], shortlistedIds: string[]): ListBalanceReport {
  const chosen = allMatches.filter((m) => shortlistedIds.includes(m.university.id));
  const reaches = chosen.filter((m) => m.category === "Reach").length;
  const matches = chosen.filter((m) => m.category === "Match").length;
  const safeties = chosen.filter((m) => m.category === "Safety").length;
  const total = chosen.length;

  if (total === 0) {
    return {
      reaches: 0,
      matches: 0,
      safeties: 0,
      total: 0,
      isBalanced: false,
      statusBn: "তালিকা ফাঁকা",
      recommendationBn: "কমপক্ষে ২–৩টি সেফটি ও ৩–৪টি টার্গেট বিশ্ববিদ্যালয় শর্টলিস্টে যোগ করুন।",
    };
  }

  const hasReach = reaches >= 1;
  const hasMatch = matches >= 2;
  const hasSafety = safeties >= 1;
  const isBalanced = hasReach && hasMatch && hasSafety && total >= 4;

  let statusBn = isBalanced ? "আদর্শ সুষম তালিকা (Optimal 2-3-2 Ratio)" : "তালিকা ভারসাম্যহীন";
  let recommendationBn = "";

  if (safeties === 0) {
    recommendationBn = "ঝুঁকিপূর্ণ! আপনার তালিকায় কোনো 'Safety/Waiver' বিশ্ববিদ্যালয় নেই। অন্তত ১-২টি ব্যাকআপ যোগ করুন।";
  } else if (reaches > total * 0.6) {
    recommendationBn = "তালিকা অতিরিক্ত 'Reach' নির্ভর। কিছু 'Match' ও 'Safety' অন্তর্ভুক্ত করুন।";
  } else if (isBalanced) {
    recommendationBn = "অভিনন্দন! আপনার শর্টলিস্টে রিচ, টার্গেট ও সেফটির চমৎকার ভারসাম্য রয়েছে।";
  } else {
    recommendationBn = "আরও ২-৩টি প্রতিষ্ঠান যুক্ত করে স্বাস্থ্যকর তালিকা তৈরি করুন।";
  }

  return { reaches, matches, safeties, total, isBalanced, statusBn, recommendationBn };
}

// SOP readability. Flesch Reading Ease (English): 206.835 − 1.015·(words/sentences) − 84.6·(syllables/words).
// Higher is easier; most admissions essays land around 30–60. Not clamped, not a quality grade.
export interface SopAnalysis {
  wordCount: number;
  charCount: number;
  sentenceCount: number;
  readingTimeMin: number;
  readabilityScore: number; // Flesch Reading Ease, may be < 0 or > 100
  readabilityGrade: string;
  avgSentenceWords: number;
  keyThemes: string[];
  genericPhrases: string[]; // template-sounding phrases worth rewriting in your own words
}

export function countSyllables(word: string): number {
  const w = word.toLowerCase().replace(/[^a-z]/g, "");
  if (!w) return 0;
  if (w.length <= 3) return 1;
  const trimmed = w.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, "").replace(/^y/, "");
  const groups = trimmed.match(/[aeiouy]{1,2}/g);
  return Math.max(1, groups ? groups.length : 1);
}

const GENERIC = ["state-of-the-art", "life-changing", "relentless curiosity", "legacy of excellence", "seamlessly", "premier benchmark", "cutting-edge", "ever since i was a child", "passionate about", "enrich your academic community"];

export function analyzeSopText(text: string): SopAnalysis {
  const words = text.trim().split(/\s+/).filter(Boolean);
  const wordCount = words.length;
  const sentences = text.split(/[.!?]+(?:\s|$)/).map((x) => x.trim()).filter(Boolean);
  const sentenceCount = Math.max(1, sentences.length);
  const syllables = words.reduce((a, w) => a + countSyllables(w), 0);
  const fre = wordCount ? 206.835 - 1.015 * (wordCount / sentenceCount) - 84.6 * (syllables / wordCount) : 0;
  const readabilityScore = Math.round(fre * 10) / 10;
  const readabilityGrade =
    readabilityScore >= 60 ? "সহজপাঠ্য (Plain English)" : readabilityScore >= 30 ? "একাডেমিক মানের — বোঝা যায়, তবে কিছু বাক্য ছোট করা যায়" : "কঠিন — বাক্য ছোট ও শব্দ সহজ করুন";

  const lower = text.toLowerCase();
  const themes: string[] = [];
  if (/research|gpa|grade|olympiad/.test(lower)) themes.push("Academic record");
  if (/project|built|developed|designed|led/.test(lower)) themes.push("Concrete experience");
  if (/community|bangladesh|village|district|society/.test(lower)) themes.push("Social impact");
  if (/curriculum|faculty|lab|course|programme|program/.test(lower)) themes.push("Fit with the programme");

  return {
    wordCount,
    charCount: text.length,
    sentenceCount,
    readingTimeMin: Math.max(1, Math.round(wordCount / 200)),
    readabilityScore,
    readabilityGrade,
    avgSentenceWords: Math.round((wordCount / sentenceCount) * 10) / 10,
    keyThemes: themes,
    genericPhrases: GENERIC.filter((g) => lower.includes(g)),
  };
}

// Rule-based counselor. Answers only from this app's data and official links; never states
// a deadline or cutoff that has not been entered from a circular.
const has = (q: string, ...terms: string[]) =>
  terms.some((t) => (/^[a-z]+$/.test(t) ? new RegExp(`(^|[^a-z])${t}([^a-z]|$)`).test(q) : q.includes(t)));

export function answerCounselorQuery(query: string, matches: MatchResult[]): string {
  const q = query.toLowerCase();
  const byShort = (id: string) => UNIVERSITIES.find((u) => u.id === id);

  for (const u of UNIVERSITIES) {
    if (has(q, u.shortName.toLowerCase(), u.id) || q.includes(u.name.toLowerCase())) {
      const m = matches.find((x) => x.university.id === u.id);
      const deadline = m?.nextDeadline
        ? `আপনার যোগ করা পরবর্তী তারিখ: ${m.nextDeadline.label} — ${m.nextDeadline.date} (উৎস: ${m.nextDeadline.sourceNote}).`
        : "এই বিশ্ববিদ্যালয়ের কোনো তারিখ এখনো যোগ করা হয়নি। অফিসিয়াল সার্কুলার প্রকাশিত হলে Deadlines ট্যাবে যোগ করুন।";
      return `${u.name} (${u.location}). প্রোগ্রাম: ${u.programs.join(", ")}. আনুমানিক ন্যূনতম GPA: SSC ${u.minGpaSsc}, HSC ${u.minGpaHsc} (যাচাই করা হয়নি — সার্কুলার দেখুন)। ${deadline} অফিসিয়াল ওয়েবসাইট: ${u.website}`;
    }
  }
  if (has(q, "dhaka university", "ঢাকা বিশ্ববিদ্যালয়")) {
    const du = byShort("du")!;
    return `University of Dhaka-র ভর্তি তথ্য ও সার্কুলার অফিসিয়াল ওয়েবসাইটে (${du.website}) প্রকাশিত হয়। আমরা কোনো তারিখ বা কাট-অফ অনুমান করি না।`;
  }
  if (has(q, "medical", "মেডিকেল", "mbbs", "bds", "dghs", "dgme")) {
    const dmc = byShort("dmc")!;
    return `সরকারি মেডিকেল কলেজসমূহে ভর্তি পরীক্ষা স্বাস্থ্য শিক্ষা অধিদপ্তর (DGME/DGHS) কেন্দ্রীয়ভাবে আয়োজন করে (${dmc.website})। ন্যূনতম মোট GPA ৯.০০ (এসএসসি ও এইচএসসিতে জীববিজ্ঞানে ন্যূনতম জিপিএ থাকতে হয়)। সঠিক তারিখ অফিসিয়াল সার্কুলার থেকে Deadlines ট্যাবে যোগ করুন।`;
  }
  if (has(q, "agriculture", "কৃষি", "কৃষি গুচ্ছ", "agri", "agricultural")) {
    const bsmrau = byShort("bsmrau")!;
    return `কৃষি গুচ্ছের আওতায় BSMRAU, BAU সহ কৃষি বিশ্ববিদ্যালয়সমূহে কেন্দ্রীয়ভাবে ভর্তি পরীক্ষা হয় (${bsmrau.website})। বিস্তারিত শর্ত অফিসিয়াল সার্কুলারে দেখুন।`;
  }
  if (has(q, "textile", "টেক্সটাইল")) {
    const butex = byShort("butex")!;
    return `${butex.name} (${butex.shortName}): টেক্সটাইল ইঞ্জিনিয়ারিংয়ে বিশেষায়িত পাবলিক বিশ্ববিদ্যালয়। প্রোগ্রাম: ${butex.programs.join(", ")}। অফিসিয়াল সাইট: ${butex.website}।`;
  }
  if (has(q, "scholarship", "waiver", "stipend", "বৃত্তি", "উপবৃত্তি", "ওয়েভার", "কম খরচ")) {
    const pm = OFFICIAL_RESOURCES[1];
    return `খরচ কমানোর পথ: (১) সরকারি বিশ্ববিদ্যালয়ে টিউশন ভর্তুকিযুক্ত। (২) বেসরকারি বিশ্ববিদ্যালয়ে মেধা/আর্থিক ওয়েভার থাকে — হার ও শর্ত প্রতিটি বিশ্ববিদ্যালয়ের ওয়েবসাইটে দেখুন। (৩) স্নাতক পর্যায়ের সরকারি উপবৃত্তি: ${pm.label} — ${pm.url}। কোনো বৃত্তির শর্ত আমরা নিশ্চিত না করে বলি না।`;
  }
  if (has(q, "deadline", "তারিখ", "কবে", "last date", "শেষ তারিখ")) {
    const upcoming = matches.filter((m) => m.nextDeadline).sort((a, b) => (a.daysLeft ?? 0) - (b.daysLeft ?? 0)).slice(0, 3);
    if (!upcoming.length) {
      return "আপনি এখনো কোনো তারিখ যোগ করেননি। ২০২৬-২৭ সেশনের অনেক সার্কুলার এখনো প্রকাশিত নাও হতে পারে। প্রকাশিত হলে Deadlines ট্যাবে তারিখ ও উৎস যোগ করুন — আমরা মনে করিয়ে দেব।";
    }
    return "আপনার যোগ করা পরবর্তী তারিখ:\n" + upcoming.map((m, i) => `${i + 1}. ${m.university.shortName}: ${m.nextDeadline!.label} — ${m.nextDeadline!.date} (${m.daysLeft} দিন বাকি)`).join("\n");
  }
  if (has(q, "gst", "guccho", "গুচ্ছ")) {
    const g = OFFICIAL_RESOURCES[0];
    return `${g.label}: ${g.url}. ${g.note}`;
  }
  if (has(q, "private", "বেসরকারি")) {
    const priv = matches.filter((m) => m.university.type === "private").slice(0, 3).map((m) => m.university.shortName);
    return `আপনার প্রোফাইল ও বাজেটে মিল থাকা বেসরকারি বিশ্ববিদ্যালয়: ${priv.join(", ") || "—"}। ফি-এর পরিসর আনুমানিক; অনুমোদন UGC-র তালিকায় (${OFFICIAL_RESOURCES[2].url}) যাচাই করুন।`;
  }
  if (has(q, "cse", "কম্পিউটার", "software")) {
    const cse = matches.filter((m) => m.university.programs.some((p) => /cse|software/i.test(p))).slice(0, 5).map((m) => m.university.shortName);
    return `এই তালিকায় CSE/Software Engineering আছে: ${cse.join(", ")}। HSC-তে গণিত ও পদার্থবিজ্ঞানের নম্বর অনেক ভর্তি পরীক্ষায় গুরুত্বপূর্ণ — নির্দিষ্ট শর্ত সার্কুলারে দেখুন।`;
  }
  const top = matches.slice(0, 3).map((m) => m.university.shortName).join(", ");
  return `আপনার প্রোফাইলের সাথে সবচেয়ে মিল (ফিট স্কোর, ভর্তির সম্ভাবনা নয়): ${top}। কোনো বিশ্ববিদ্যালয়ের নাম (যেমন BUET, NSU), "বৃত্তি", "তারিখ" বা "GST" লিখে জিজ্ঞেস করুন।`;
}

/** All-day calendar events (RFC 5545) for dated tasks, so students can add them to their phone. */
export function toIcs(items: DeadlineItem[], stamp = "20260101T000000Z"): string {
  const esc = (s: string) => s.replace(/[\;,]/g, (c) => "\\" + c).replace(/\n/g, "\\n");
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//KormoPath//AdmitBuddy//BN", "CALSCALE:GREGORIAN"];
  for (const it of items) {
    if (!it.dueDate) continue;
    const d = it.dueDate.replace(/-/g, "");
    const next = new Date(Date.parse(it.dueDate + "T00:00:00Z") + 86_400_000).toISOString().slice(0, 10).replace(/-/g, "");
    lines.push(
      "BEGIN:VEVENT",
      `UID:${it.id}@admitbuddy.kormopath`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${d}`,
      `DTEND;VALUE=DATE:${next}`,
      `SUMMARY:${esc(it.title)}`,
      `DESCRIPTION:${esc(`উৎস: ${it.sourceNote ?? "আপনার দেওয়া"}. অফিসিয়াল সার্কুলারে আবার মিলিয়ে নিন।`)}`,
      "BEGIN:VALARM", "TRIGGER:-P2D", "ACTION:DISPLAY", `DESCRIPTION:${esc(it.title)}`, "END:VALARM",
      "END:VEVENT",
    );
  }
  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}

// ---------------------------------------------------------------------------------------------
// Application tracker (pipeline view, as in Common App's dashboard). The student moves each
// shortlisted university through the stages by hand; nothing is inferred or auto-advanced.

export const APPLICATION_STAGES = [
  { id: "planning", label: "পরিকল্পনা", next: "অফিসিয়াল সার্কুলার পড়ুন, যোগ্যতা ও তারিখ মিলিয়ে নিন।" },
  { id: "applied", label: "আবেদন জমা", next: "আবেদন ফি পরিশোধ করুন ও রসিদ/ট্রানজেকশন আইডি সংরক্ষণ করুন।" },
  { id: "paid", label: "ফি পরিশোধ", next: "প্রবেশপত্র প্রকাশের তারিখ সার্কুলারে দেখে রাখুন।" },
  { id: "admit-card", label: "প্রবেশপত্র", next: "প্রবেশপত্র প্রিন্ট করুন; কেন্দ্র ও সময় মিলিয়ে নিন।" },
  { id: "exam-done", label: "পরীক্ষা শেষ", next: "অফিসিয়াল সাইটে ফলাফল প্রকাশের নোটিশ দেখুন।" },
  { id: "result", label: "ফলাফল", next: "মেধাতালিকা/ভর্তির নির্দেশনা ও কাগজপত্র জমার তারিখ দেখুন।" },
  { id: "admitted", label: "ভর্তি সম্পন্ন", next: "অভিনন্দন! অন্য আবেদনগুলোর অবস্থা আপডেট করুন।" },
  { id: "not-selected", label: "নির্বাচিত হননি", next: "অপেক্ষমাণ তালিকা বা অন্য বিকল্পগুলোর দিকে মন দিন।" },
] as const;

export type ApplicationStage = (typeof APPLICATION_STAGES)[number]["id"];

export interface ApplicationStatus {
  universityId: string;
  stage: ApplicationStage;
  updatedAt: string; // YYYY-MM-DD
  note: string; // e.g. roll number, transaction id (stays on device)
}

export function stageInfo(stage: ApplicationStage) {
  return APPLICATION_STAGES.find((s) => s.id === stage) ?? APPLICATION_STAGES[0];
}

/** Counts per stage and one next step per shortlisted university (planning if never set). */
export function applicationPipeline(shortlistedIds: string[], statuses: ApplicationStatus[]) {
  const byId = new Map(statuses.map((s) => [s.universityId, s]));
  const rows = shortlistedIds
    .map((id) => UNIVERSITIES.find((u) => u.id === id))
    .filter((u): u is University => !!u)
    .map((u) => {
      const st = byId.get(u.id) ?? { universityId: u.id, stage: "planning" as ApplicationStage, updatedAt: "", note: "" };
      return { university: u, status: st, next: stageInfo(st.stage).next };
    });
  const counts = Object.fromEntries(APPLICATION_STAGES.map((s) => [s.id, 0])) as Record<ApplicationStage, number>;
  for (const r of rows) counts[r.status.stage]++;
  const finished = counts.admitted + counts["not-selected"];
  return { rows, counts, active: rows.length - finished, finished };
}

export function sanitizeStatuses(input: unknown): ApplicationStatus[] | null {
  if (!Array.isArray(input)) return null;
  const stages = new Set<string>(APPLICATION_STAGES.map((s) => s.id));
  const ids = new Set(UNIVERSITIES.map((u) => u.id));
  return input
    .filter((x): x is ApplicationStatus =>
      !!x && typeof x === "object" && ids.has((x as ApplicationStatus).universityId) && stages.has((x as ApplicationStatus).stage),
    )
    .map((x) => ({
      universityId: x.universityId,
      stage: x.stage,
      updatedAt: typeof x.updatedAt === "string" && /^\d{4}-\d{2}-\d{2}$/.test(x.updatedAt) ? x.updatedAt : "",
      note: typeof x.note === "string" ? x.note.slice(0, 200) : "",
    }))
    .slice(0, 100);
}

/**
 * Generates a clean, structured Markdown admission roadmap summary.
 * Fully deterministic (no floating point drift, zero invented dates, strict honesty).
 */
export function toRoadmapMarkdown(
  profile: StudentProfile,
  shortlisted: University[],
  tasks: DeadlineItem[],
  balance?: ListBalanceReport,
  userDeadlines: UserDeadline[] = [],
  statuses: ApplicationStatus[] = [],
  today = "1970-01-01"
): string {
  const lines: string[] = [];
  const studentName = profile.name?.trim() || "ভর্তিচ্ছু শিক্ষার্থী";
  const statusMap = new Map(statuses.map((s) => [s.universityId, s]));

  // 1. Title & Header
  lines.push("# KormoPath AdmitBuddy — বিশ্ববিদ্যালয় ভর্তি রোডম্যাপ");
  lines.push(`> প্রস্তুতের তারিখ: ${today} | প্রস্তুতকারী: ${studentName}`);
  lines.push("");

  // 2. Student Profile Summary
  lines.push("## ১. শিক্ষার্থীর প্রোফাইল ও প্রাথমিক যোগ্যতা");
  lines.push(`- **শিক্ষার্থীর নাম:** ${studentName}`);
  lines.push(`- **মাধ্যমিক (SSC) GPA:** ${profile.sscGpa.toFixed(2)}`);
  lines.push(`- **উচ্চ মাধ্যমিক (HSC) GPA:** ${profile.hscGpa.toFixed(2)} (মোট GPA: ${(profile.sscGpa + profile.hscGpa).toFixed(2)})`);
  lines.push(`- **শাখা / গ্রুপ:** ${profile.group}`);
  lines.push(`- **প্রতি সেমিস্টারে সর্বোচ্চ বাজেট:** ৳${profile.maxBudgetPerSemester.toLocaleString("en-IN")}`);
  if (profile.preferredLocations && profile.preferredLocations.length > 0) {
    lines.push(`- **পছন্দের এলাকা:** ${profile.preferredLocations.join(", ")}`);
  }
  if (profile.interests && profile.interests.length > 0) {
    lines.push(`- **আগ্রহের বিষয়:** ${profile.interests.join(", ")}`);
  }
  lines.push("");

  // 3. CollegeVine List Balance Analysis
  if (balance) {
    lines.push("## ২. শর্টলিস্ট পোর্টফোলিও ভারসাম্য (CollegeVine 2-3-2 মানদণ্ড)");
    lines.push(`- **মোট শর্টলিস্টেড বিশ্ববিদ্যালয়:** ${balance.total}টি`);
    lines.push(`  - **Reach (প্রতিযোগিতাপূর্ণ):** ${balance.reaches}টি`);
    lines.push(`  - **Match (টার্গেট):** ${balance.matches}টি`);
    lines.push(`  - **Safety / Waiver (নিরাপদ বিকল্প):** ${balance.safeties}টি`);
    lines.push(`- **ভারসাম্য মূল্যায়ন:** ${balance.statusBn}`);
    lines.push(`- **পরামর্শ:** ${balance.recommendationBn}`);
    lines.push("");
  }

  // 4. Shortlisted Universities Detailed Table
  lines.push("## ৩. শর্টলিস্টেড বিশ্ববিদ্যালয় ও আবেদনের বর্তমান অগ্রগতি");
  if (shortlisted.length === 0) {
    lines.push("*এখনো কোনো বিশ্ববিদ্যালয় শর্টলিস্ট করা হয়নি।*");
  } else {
    lines.push("| বিশ্ববিদ্যালয় | ধরন | অবস্থান | বর্তমান ধাপ | ফিট/ক্যাটাগরি | অফিসিয়াল ওয়েবসাইট |");
    lines.push("| :--- | :--- | :--- | :--- | :--- | :--- |");
    for (const u of shortlisted) {
      const st = statusMap.get(u.id);
      const stageName = st ? stageInfo(st.stage).label : "পরিকল্পনা";
      const typeLabel = u.type === "public" ? "সরকারি" : u.type === "private" ? "বেসরকারি" : "আন্তর্জাতিক";
      lines.push(`| **${u.shortName}** — ${u.name} | ${typeLabel} | ${u.location} | ${stageName} | আনুমানিক GPA ${u.minGpaTotal} | [ওয়েবসাইট](${u.website}) |`);
    }
  }
  lines.push("");

  // 5. Actionable Deadlines & Task Timeline (Honest Invariant: 0 invented dates)
  lines.push("## ৪. ভর্তি পরীক্ষার সময়সূচি ও করণীয় তালিকা");
  const datedTasks = tasks.filter((t) => t.dueDate);
  const undatedTasks = tasks.filter((t) => !t.dueDate);

  if (datedTasks.length > 0) {
    lines.push("### ঘোষিত / আপনার যোগ করা তারিখসমূহ (উৎসসহ)");
    lines.push("| তারিখ | বিশ্ববিদ্যালয় | কাজের বিবরণ | অবস্থা | সার্কুলার উৎস নোট |");
    lines.push("| :--- | :--- | :--- | :--- | :--- |");
    for (const t of datedTasks) {
      const statusIcon = t.isDone ? "[x] সম্পন্ন" : "[ ] বাকি";
      lines.push(`| ${t.dueDate} | ${t.universityName} | ${t.title} | ${statusIcon} | ${t.sourceNote || "ব্যবহারকারীর দেওয়া"} |`);
    }
    lines.push("");
  }

  if (undatedTasks.length > 0) {
    lines.push("### অফিসিয়াল সার্কুলার অপেক্ষমাণ কাজ (অঘোষিত তারিখ)");
    lines.push("> *সতর্কবার্তা: কোনো তারিখ বা কাট-অফ অনুমান করা হয়নি (0 Invented Dates Invariant)। সার্কুলার প্রকাশিত হলে অ্যাপে তারিখ যোগ করুন।*");
    for (const t of undatedTasks) {
      const statusIcon = t.isDone ? "[x]" : "[ ]";
      lines.push(`- ${statusIcon} **${t.universityName}**: ${t.title}`);
    }
    lines.push("");
  }

  // 6. Document Checklist
  lines.push("## ৫. প্রয়োজনীয় কাগজপত্র ও সনদের চেকলিস্ট");
  for (const doc of DOCUMENT_CHECKLIST) {
    lines.push(`- [ ] ${doc.label}`);
  }
  lines.push("");

  // 7. Important Disclaimers and Official Portals
  lines.push("## ৬. গুরুত্বপূর্ণ অফিসিয়াল পোর্টাল ও আইনি নোটিশ");
  for (const r of OFFICIAL_RESOURCES) {
    lines.push(`- **${r.label}:** ${r.url}  \n  *(${r.note})*`);
  }
  lines.push("");
  lines.push("> **আইনি নোটিশ:** ন্যূনতম GPA ও ফি সংক্রান্ত তথ্যসমূহ আনুমানিক। সরকারি বিশ্ববিদ্যালয়ে আসন বণ্টন সম্পূর্ণ ভর্তি পরীক্ষার মেধার ভিত্তিতে হয়। যেকোনো সিদ্ধান্তের পূর্বে মূল অফিসিয়াল সার্কুলার যাচাই করে নিন।");
  lines.push("");

  return lines.join("\n");
}

// ---------------------------------------------------------------------------------------------
// Study plan (পড়ার পরিকল্পনা): a deterministic, client-only day-by-day plan.
//
// The student enters the exam date, the chapters (with their own estimate of hours per chapter)
// and the hours they can study per day. The planner walks the days from `start` up to the day
// BEFORE the exam (nothing is ever scheduled on or after the exam date) and, each day:
//   1. first places the spaced-retrieval revisions that are due (or carried over from a full day),
//   2. then fills the remaining time with first-time study of the next chapter, round-robin across
//      subjects so one subject does not take the whole first week.
// Spacing rule: once a chapter's first study is finished on day D, it is revisited on D+1, D+3, D+7
// and D+14. Any revision that would land on or after the exam date is clipped (not scheduled).
// A revision that does not fit on its day slides to the next day with free time, still before the exam.
// If chapters are left unstudied, or revisions cannot fit before the exam, the plan reports overload.
// Days the student marks as lost (power cut, no internet, illness) get no sessions; the plan reflows.
// All time is in whole minutes so the arithmetic is exact.
// ---------------------------------------------------------------------------------------------
export const REVISION_OFFSETS = [1, 3, 7, 14] as const;

export interface StudyChapter { id: string; subject: string; title: string; hours: number }
export interface StudyPlanInput {
  start: string; // YYYY-MM-DD, first study day (usually today)
  examDate: string; // YYYY-MM-DD, no sessions on or after this day
  hoursPerDay: number;
  chapters: StudyChapter[];
  /** Minutes per revision session. Default 30. */
  revisionMinutes?: number;
  /** Days with no study (power cut, no internet, illness). */
  blockedDates?: string[];
}
export interface StudySession {
  id: string;
  chapterId: string;
  subject: string;
  title: string;
  kind: "learn" | "revise";
  /** Revision round 1..4 (for +1, +3, +7, +14 days); 0 for first study. */
  round: number;
  minutes: number;
}
export interface StudyDay { date: string; sessions: StudySession[]; minutes: number; blocked: boolean; selfCheckBn: string; selfCheckEn: string }
export interface StudyPlan {
  days: StudyDay[];
  studyDays: number;
  availableMinutes: number;
  neededMinutes: number;
  /** Chapters whose first study could not be finished before the exam. */
  unscheduled: string[];
  /** Revisions dropped because no day before the exam had time for them. */
  droppedRevisions: Array<{ chapterId: string; round: number }>;
  /** Revisions not planned because their spacing date falls on or after the exam. */
  clippedRevisions: number;
  overload: boolean;
  messagesBn: string[];
}

/** Metacognitive self-checks only: they ask the student to recall, never state a fact. */
export const SELF_CHECKS: Array<{ bn: string; en: string }> = [
  { bn: "বই বন্ধ করুন: মনে থাকা ৩টি বিষয় লিখুন।", en: "Close the book: write 3 things you remember." },
  { bn: "আজকের অধ্যায়টা ১ মিনিটে কাউকে বোঝানোর মতো করে বলুন।", en: "Explain today's chapter aloud in one minute, as if to a friend." },
  { bn: "কোন অংশটা সবচেয়ে কঠিন লাগল? এক লাইনে লিখে রাখুন।", en: "Which part felt hardest? Write it down in one line." },
  { bn: "বই না দেখে নিজেই ২টি প্রশ্ন বানিয়ে উত্তর দিন।", en: "Without the book, make up 2 questions and answer them." },
  { bn: "গতকালের পড়া থেকে একটা জিনিস মনে করুন, তারপর বই খুলে মিলিয়ে নিন।", en: "Recall one thing from yesterday, then open the book to check." },
];

const isoOk = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s + "T00:00:00Z")) && new Date(s + "T00:00:00Z").toISOString().startsWith(s);
const plusDays = (iso: string, n: number) => new Date(Date.parse(iso + "T00:00:00Z") + n * 86_400_000).toISOString().slice(0, 10);

export function validateStudyInput(i: StudyPlanInput): string | null {
  if (!isoOk(i.start)) return "শুরুর তারিখ ঠিক নয়।";
  if (!isoOk(i.examDate)) return "পরীক্ষার তারিখ দিন (YYYY-MM-DD)।";
  if (i.examDate <= i.start) return "পরীক্ষার তারিখ আজকের পরে হতে হবে।";
  if (daysBetween(i.start, i.examDate) > 400) return "পরিকল্পনা সর্বোচ্চ ৪০০ দিনের জন্য।";
  if (!Number.isFinite(i.hoursPerDay) || i.hoursPerDay <= 0 || i.hoursPerDay > 16) return "দিনে কত ঘণ্টা পড়বেন, ০ থেকে ১৬-এর মধ্যে দিন।";
  if (!i.chapters.length) return "অন্তত একটি অধ্যায় যোগ করুন।";
  if (i.chapters.length > 200) return "সর্বোচ্চ ২০০টি অধ্যায়।";
  for (const c of i.chapters) if (!Number.isFinite(c.hours) || c.hours <= 0 || c.hours > 100) return `"${c.title}" অধ্যায়ের ঘণ্টা ০ থেকে ১০০-এর মধ্যে দিন।`;
  return null;
}

export function buildStudyPlan(i: StudyPlanInput): StudyPlan {
  const err = validateStudyInput(i);
  if (err) throw new Error(err);
  const capacity = Math.round(i.hoursPerDay * 60);
  const revMin = Math.max(5, Math.round(i.revisionMinutes ?? 30));
  const blocked = new Set((i.blockedDates ?? []).filter(isoOk));

  // Round-robin order across subjects, keeping each subject's own chapter order.
  const bySubject = new Map<string, StudyChapter[]>();
  for (const c of i.chapters) bySubject.set(c.subject, [...(bySubject.get(c.subject) ?? []), c]);
  const queue: Array<{ ch: StudyChapter; left: number; part: number }> = [];
  for (let k = 0, added = true; added; k++) {
    added = false;
    for (const list of bySubject.values()) if (list[k]) { queue.push({ ch: list[k], left: Math.round(list[k].hours * 60), part: 0 }); added = true; }
  }

  const pending: Array<{ ch: StudyChapter; round: number; due: string }> = [];
  const days: StudyDay[] = [];
  let clipped = 0;
  const total = daysBetween(i.start, i.examDate);
  for (let d = 0; d < total; d++) {
    const date = plusDays(i.start, d);
    const check = SELF_CHECKS[d % SELF_CHECKS.length];
    if (blocked.has(date)) { days.push({ date, sessions: [], minutes: 0, blocked: true, selfCheckBn: check.bn, selfCheckEn: check.en }); continue; }
    let free = capacity;
    const sessions: StudySession[] = [];
    // 1. due revisions, earliest due first
    pending.sort((a, b) => a.due.localeCompare(b.due) || a.round - b.round);
    for (let k = 0; k < pending.length && free >= revMin; ) {
      const r = pending[k];
      if (r.due > date) { k++; continue; }
      sessions.push({ id: `${date}:${r.ch.id}:r${r.round}`, chapterId: r.ch.id, subject: r.ch.subject, title: r.ch.title, kind: "revise", round: r.round, minutes: revMin });
      free -= revMin;
      pending.splice(k, 1);
    }
    // 2. first-time study
    while (free > 0 && queue.length) {
      const q = queue[0];
      const m = Math.min(free, q.left);
      q.part++;
      sessions.push({ id: `${date}:${q.ch.id}:l${q.part}`, chapterId: q.ch.id, subject: q.ch.subject, title: q.ch.title, kind: "learn", round: 0, minutes: m });
      q.left -= m; free -= m;
      if (q.left === 0) {
        queue.shift();
        REVISION_OFFSETS.forEach((off, idx) => {
          const due = plusDays(date, off);
          if (due >= i.examDate) clipped++;
          else pending.push({ ch: q.ch, round: idx + 1, due });
        });
      }
    }
    days.push({ date, sessions, minutes: capacity - free, blocked: false, selfCheckBn: check.bn, selfCheckEn: check.en });
  }

  const studyDays = days.filter((d) => !d.blocked).length;
  const availableMinutes = studyDays * capacity;
  const unscheduled = queue.map((q) => q.ch.id);
  const droppedRevisions = pending.map((p) => ({ chapterId: p.ch.id, round: p.round }));
  const scheduledRev = days.reduce((a, d) => a + d.sessions.filter((s) => s.kind === "revise").length, 0);
  const learnNeeded = i.chapters.reduce((a, c) => a + Math.round(c.hours * 60), 0);
  // First study of every chapter plus every revision the plan wanted before the exam (placed or dropped).
  const neededMinutes = learnNeeded + (scheduledRev + droppedRevisions.length) * revMin;
  const overload = unscheduled.length > 0 || droppedRevisions.length > 0;
  const messagesBn: string[] = [];
  if (unscheduled.length) messagesBn.push(`সময় কম: পরীক্ষার আগে ${unscheduled.length}টি অধ্যায় প্রথমবার পড়াও শেষ হবে না। দিনে পড়ার সময় বাড়ান, অধ্যায় ভাগ করে নিন বা অগ্রাধিকার ঠিক করুন।`);
  if (droppedRevisions.length) messagesBn.push(`${droppedRevisions.length}টি রিভিশনের জায়গা হয়নি। রিভিশন বাদ দিলে মনে রাখা কঠিন হয়।`);
  if (clipped) messagesBn.push(`${clipped}টি রিভিশন পরীক্ষার দিন বা তার পরে পড়ত, তাই রাখা হয়নি।`);
  if (blocked.size) messagesBn.push(`${days.filter((d) => d.blocked).length}টি দিন বাদ রাখা হয়েছে (বিদ্যুৎ/ইন্টারনেট নেই বা অন্য কারণে)।`);
  return { days, studyDays, availableMinutes, neededMinutes, unscheduled, droppedRevisions, clippedRevisions: clipped, overload, messagesBn };
}

export function sanitizeStudyInput(raw: unknown): Omit<StudyPlanInput, "start"> | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const examDate = typeof o.examDate === "string" && (o.examDate === "" || isoOk(o.examDate)) ? o.examDate : "";
  const hoursPerDay = typeof o.hoursPerDay === "number" && Number.isFinite(o.hoursPerDay) && o.hoursPerDay > 0 && o.hoursPerDay <= 16 ? o.hoursPerDay : 3;
  const chapters = Array.isArray(o.chapters) ? o.chapters.slice(0, 200).flatMap((c) => {
    const x = (c ?? {}) as Record<string, unknown>;
    if (typeof x.id !== "string" || typeof x.subject !== "string" || typeof x.title !== "string") return [];
    const hours = typeof x.hours === "number" && Number.isFinite(x.hours) && x.hours > 0 && x.hours <= 100 ? x.hours : null;
    return hours === null ? [] : [{ id: x.id.slice(0, 40), subject: x.subject.slice(0, 40), title: x.title.slice(0, 80), hours }];
  }) : [];
  const blockedDates = Array.isArray(o.blockedDates) ? o.blockedDates.filter((d): d is string => typeof d === "string" && isoOk(d)).slice(0, 400) : [];
  return { examDate, hoursPerDay, chapters, blockedDates };
}
