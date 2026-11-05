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
