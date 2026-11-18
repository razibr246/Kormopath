/*
 * Admission FinOps & Exam Hall Strategy Engine for Bangladeshi Students.
 * NO imports — pure, deterministic, and unit-tested (tests/admissionFinops.test.ts).
 *
 * Covers:
 * - Application form fee estimates per university & unit
 * - Inter-district travel, exam day lodging & food budgeting
 * - Negative marking mathematical expectancy & guessing guidelines
 * - Approved calculator models per university (BUET vs DU vs Medical)
 * - Exam day packing checklist & hall protocol
 */

export interface UnitFeeInfo {
  universityId: string;
  universityShort: string;
  unitNameBn: string;
  estimatedFeeBdt: number;
  centerLocations: string[]; // e.g. ["ঢাকা"] or ["সকল বিভাগীয় শহর"]
  requiresTravelFromOutsideDhaka: boolean;
}

// UNVERIFIED planning estimates, not official fees: no source was recorded for these figures and fees change every
// year. The UI labels each one "আনুমানিক · যাচাই হয়নি" and points to the admission circular (AGENTS.md: never invent facts).
export const UNIT_FORM_FEES: UnitFeeInfo[] = [
  { universityId: "du", universityShort: "DU", unitNameBn: "'ক' ইউনিট (বিজ্ঞান)", estimatedFeeBdt: 1050, centerLocations: ["৮টি বিভাগীয় শহর"], requiresTravelFromOutsideDhaka: false },
  { universityId: "du", universityShort: "DU", unitNameBn: "'খ' ইউনিট (কলা ও সামাজিক)", estimatedFeeBdt: 1050, centerLocations: ["৮টি বিভাগীয় শহর"], requiresTravelFromOutsideDhaka: false },
  { universityId: "du", universityShort: "DU", unitNameBn: "'গ' ইউনিট (ব্যবসায় শিক্ষা)", estimatedFeeBdt: 1050, centerLocations: ["৮টি বিভাগীয় শহর"], requiresTravelFromOutsideDhaka: false },
  { universityId: "buet", universityShort: "BUET", unitNameBn: "প্রকৌশল ও স্থাপত্য", estimatedFeeBdt: 1300, centerLocations: ["বুয়েট ক্যাম্পাস (ঢাকা)"], requiresTravelFromOutsideDhaka: true },
  { universityId: "dmc", universityShort: "Medical", unitNameBn: "MBBS কেন্দ্রীয় ভর্তি", estimatedFeeBdt: 1000, centerLocations: ["সারাদেশের ১৯টি কেন্দ্র"], requiresTravelFromOutsideDhaka: false },
  { universityId: "eng-cluster", universityShort: "CKRUET", unitNameBn: "ইঞ্জিনিয়ারিং গুচ্ছ", estimatedFeeBdt: 1350, centerLocations: ["রুয়েট", "কুয়েট", "চুয়েট"], requiresTravelFromOutsideDhaka: true },
  { universityId: "gst", universityShort: "GST", unitNameBn: "সাধারণ ও বিজ্ঞান গুচ্ছ", estimatedFeeBdt: 1500, centerLocations: ["২৪টি বিশ্ববিদ্যালয় ক্যাম্পাস"], requiresTravelFromOutsideDhaka: false },
  { universityId: "agri", universityShort: "Agri Cluster", unitNameBn: "কৃষি গুচ্ছ", estimatedFeeBdt: 1200, centerLocations: ["৮টি কৃষি বিশ্ববিদ্যালয়"], requiresTravelFromOutsideDhaka: false },
  { universityId: "ju", universityShort: "JU", unitNameBn: "জাবি 'A' ইউনিট", estimatedFeeBdt: 1100, centerLocations: ["সাভার (ঢাকা)"], requiresTravelFromOutsideDhaka: true },
  { universityId: "ru", universityShort: "RU", unitNameBn: "রাবি 'C' ইউনিট", estimatedFeeBdt: 1320, centerLocations: ["রাজশাহী ক্যাম্পাস"], requiresTravelFromOutsideDhaka: true },
  { universityId: "cu", universityShort: "CU", unitNameBn: "চবি 'A' ইউনিট", estimatedFeeBdt: 1050, centerLocations: ["চট্টগ্রাম ও ঢাকা"], requiresTravelFromOutsideDhaka: false },
  { universityId: "butex", universityShort: "BUTEX", unitNameBn: "টেক্সটাইল ইঞ্জিনিয়ারিং", estimatedFeeBdt: 1200, centerLocations: ["তেজগাঁও (ঢাকা)"], requiresTravelFromOutsideDhaka: true },
];

export interface AdmissionBudgetInput {
  selectedUnits: string[]; // universityId + unitName combinations
  applicantHomeDistrict: string;
  lodgingType: "mess" | "hotel" | "relatives";
  numberOfExamsRequiringTravel: number;
  mockTestBudgetBdt?: number;
  booksAndQuestionBanksBdt?: number;
}

export interface AdmissionBudgetReport {
  totalFormFeesBdt: number;
  totalTravelBdt: number;
  totalLodgingBdt: number;
  totalFoodAndContingencyBdt: number;
  academicMaterialsBdt: number;
  grandTotalBdt: number;
  formFeeBreakdown: Array<{ unit: string; fee: number }>;
  tipsBn: string[];
}

export function calculateAdmissionBudget(input: AdmissionBudgetInput): AdmissionBudgetReport {
  const breakdown: Array<{ unit: string; fee: number }> = [];
  let totalFormFees = 0;

  for (const item of input.selectedUnits) {
    const found = UNIT_FORM_FEES.find((u) => `${u.universityShort}-${u.unitNameBn}` === item || u.unitNameBn.includes(item));
    if (found) {
      breakdown.push({ unit: `${found.universityShort} ${found.unitNameBn}`, fee: found.estimatedFeeBdt });
      totalFormFees += found.estimatedFeeBdt;
    } else {
      // Default standard fee
      breakdown.push({ unit: item, fee: 1100 });
      totalFormFees += 1100;
    }
  }

  const travelCount = Math.max(0, input.numberOfExamsRequiringTravel);
  const isOutsideDhaka = input.applicantHomeDistrict.toLowerCase() !== "dhaka" && input.applicantHomeDistrict.toLowerCase() !== "ঢাকা";

  // Estimated round-trip inter-district bus/train fare per exam
  const travelPerExam = isOutsideDhaka ? 1400 : 400;
  const totalTravel = travelCount * travelPerExam;

  // Lodging per exam night (assuming 1-2 nights per travel exam)
  let lodgingPerExam = 0;
  if (input.lodgingType === "hotel") {
    lodgingPerExam = 1800;
  } else if (input.lodgingType === "mess") {
    lodgingPerExam = 600;
  } else {
    lodgingPerExam = 0; // relatives
  }
  const totalLodging = travelCount * lodgingPerExam;

  // Food and local rickshaw/auto contingency
  const foodPerExam = travelCount * 800;
  const contingency = Math.round((totalFormFees + totalTravel + totalLodging) * 0.1);
  const totalFoodAndContingency = foodPerExam + contingency;

  const academicMaterials = (Number(input.mockTestBudgetBdt) || 0) + (Number(input.booksAndQuestionBanksBdt) || 0);
  const grandTotal = totalFormFees + totalTravel + totalLodging + totalFoodAndContingency + academicMaterials;

  const tipsBn: string[] = [];
  if (isOutsideDhaka) {
    tipsBn.push("ঢাবি ও মেডিকেল পরীক্ষা নিজ নিজ বিভাগীয় কেন্দ্রে দেওয়ার সুযোগ নিন, এতে যাতায়াত ও হোটেল খরচ ৫০% বেঁচে যাবে।");
  }
  if (input.lodgingType === "hotel") {
    tipsBn.push("বিশ্ববিদ্যালয়ের বড় ভাই-আপুদের হলে বা পরিচিত মেসে অতিথি হিসেবে থাকলে হোটেল খরচ বাঁচবে।");
  }
  tipsBn.push("প্রতিটি আবেদন ফি পরিশোধের পর অবশ্যই ট্রানজেকশন আইডি (TxnID) ও আবেদন কপি দুই সেট প্রিন্ট করে রাখুন।");

  return {
    totalFormFeesBdt: totalFormFees,
    totalTravelBdt: totalTravel,
    totalLodgingBdt: totalLodging,
    totalFoodAndContingencyBdt: totalFoodAndContingency,
    academicMaterialsBdt: academicMaterials,
    grandTotalBdt: grandTotal,
    formFeeBreakdown: breakdown,
    tipsBn,
  };
}

// ---------------------------------------------------------------------------------------------
// Approved Calculator Guidelines per University
// ---------------------------------------------------------------------------------------------
export interface CalculatorPolicy {
  university: string;
  isAllowed: boolean;
  approvedModels: string[];
  bannedModels: string[];
  rulesBn: string;
}

export const CALCULATOR_POLICIES: CalculatorPolicy[] = [
  {
    university: "বুয়েট ও ইঞ্জিনিয়ারিং গুচ্ছ (BUET / CKRUET)",
    isAllowed: true,
    approvedModels: [
      "Casio fx-991EX (ClassWiz - সাধারণ অনুমোদিত)",
      "Casio fx-991MS / fx-100MS",
      "Casio fx-570ES Plus / 570MS",
      "Sharp EL-W506 / Canon F-789SGA",
    ],
    bannedModels: ["যেকোনো প্রোগ্রামযোগ্য (Programmable) ক্যালকুলেটর", "fx-9860G", "গ্রাফিক্যাল ক্যালকুলেটর"],
    rulesBn: "নন-প্রোগ্রামেবল সায়েন্টিফিক ক্যালকুলেটর অনুমোদিত। মেমোরি কভার বা স্লিভ খুলে হলে প্রবেশ করতে হতে পারে।",
  },
  {
    university: "ঢাকা বিশ্ববিদ্যালয় (DU সকল ইউনিট)",
    isAllowed: false,
    approvedModels: [],
    bannedModels: ["সব ধরনের ক্যালকুলেটর সম্পূর্ণ নিষিদ্ধ"],
    rulesBn: "ঢাবি ক/খ/গ/ঘ কোনো ইউনিটে কোনো প্রকার সাধারণ বা সায়েন্টিফিক ক্যালকুলেটর ব্যবহার করা সম্পূর্ণ নিষিদ্ধ। মুখে মুখে ও খসড়া করে হিসাব করতে হবে।",
  },
  {
    university: "মেডিকেল ও ডেন্টাল ভর্তি পরীক্ষা (DGME)",
    isAllowed: false,
    approvedModels: [],
    bannedModels: ["সব ধরনের ক্যালকুলেটর, ঘড়ি ও ইলেকট্রনিক ডিভাইস সম্পূর্ণ নিষিদ্ধ"],
    rulesBn: "মেডিকেল ভর্তি পরীক্ষায় ক্যালকুলেটর নিষিদ্ধ। পদার্থ ও রসায়নের গাণিতিক সমস্যাগুলোর মান সাধারণত কাটাকাটিযোগ্য পূর্ণসংখ্যায় দেওয়া হয়।",
  },
  {
    university: "গুচ্ছ সাধারণ ও বিজ্ঞান প্রযুক্তি (GST)",
    isAllowed: false,
    approvedModels: [],
    bannedModels: ["সব ধরনের ক্যালকুলেটর নিষিদ্ধ"],
    rulesBn: "জিএসটি সমন্বিত ভর্তি পরীক্ষায় কোনো ক্যালকুলেটর ব্যবহার করা যাবে না।",
  },
  {
    university: "জাহাঙ্গীরনগর বিশ্ববিদ্যালয় (JU A ইউনিট)",
    isAllowed: false,
    approvedModels: [],
    bannedModels: ["সব ধরনের ক্যালকুলেটর নিষিদ্ধ"],
    rulesBn: "জাবিতে ক্যালকুলেটর নিষিদ্ধ। রাফ করার জন্য প্রশ্নপত্রে ফাঁকা স্থান থাকে।",
  },
];

// ---------------------------------------------------------------------------------------------
// Exam Day Packing Checklist & Hall Strategy
// ---------------------------------------------------------------------------------------------
export interface ExamPackingItem {
  id: string;
  itemBn: string;
  category: "documents" | "stationery" | "rules";
  mandatory: boolean;
  noteBn: string;
}

export const EXAM_DAY_PACKING: ExamPackingItem[] = [
  { id: "p-admit", itemBn: "ভর্তি পরীক্ষার রঙিন এডমিট কার্ড (Admit Card) - ২ কপি", category: "documents", mandatory: true, noteBn: "সার্কুলারে রঙিন (Color) প্রিন্ট বলা থাকলে অবশ্যই রঙিন প্রিন্ট নিন।" },
  { id: "p-hsc-reg", itemBn: "HSC রেজিস্ট্রেশন কার্ডের মূল কপি (Original)", category: "documents", mandatory: true, noteBn: "হলে ইনভিজিলেটর মূল রেজিস্ট্রেশন কার্ডের সাথে এডমিট কার্ড মেলাবেন।" },
  { id: "p-pen", itemBn: "কালো কালির বলপয়েন্ট কলম (কমপক্ষে ৩টি)", category: "stationery", mandatory: true, noteBn: "জেল পেন বা সাইনপেন ওএমআরে ব্যবহার করবেন না। কালি ছড়িয়ে নষ্ট হতে পারে।" },
  { id: "p-pencil", itemBn: "2B পেন্সিল ও ইরেজার (প্রযোজ্য ক্ষেত্রে)", category: "stationery", mandatory: false, noteBn: "রাফ স্কেচ বা ড্রয়িংয়ের জন্য।" },
  { id: "p-file", itemBn: "স্বচ্ছ ফাইল / ক্লিয়ার পাউচ (Transparent Pouch)", category: "stationery", mandatory: true, noteBn: "অস্বচ্ছ ব্যাগ হলে নেওয়া নিষিদ্ধ; শুধুমাত্র স্বচ্ছ পাউচে কলম ও কার্ড রাখুন।" },
  { id: "p-calc", itemBn: "অনুমোদিত সায়েন্টিফিক ক্যালকুলেটর (শুধুমাত্র বুয়েট/ইঞ্জিনিয়ারিংয়ে)", category: "stationery", mandatory: false, noteBn: "ঢাবি বা মেডিকেলে সম্পূর্ণ নিষিদ্ধ।" },
  { id: "p-watch", itemBn: "সাধারণ অ্যানালগ হাতঘড়ি (স্মার্টওয়াচ নিষিদ্ধ)", category: "stationery", mandatory: false, noteBn: "ডিজিটাল ও ব্লুটুথ ঘড়ি নিষিদ্ধ। অধিকাংশ হলের দেওয়ালে ঘড়ি থাকে।" },
  { id: "p-photo", itemBn: "পাসপোর্ট সাইজ সত্যায়িত ছবি (১-২ কপি অতিরিক্ত)", category: "documents", mandatory: false, noteBn: "জরুরি প্রয়োজনে এডমিট কার্ডের ত্রুটিতে কাজে লাগতে পারে।" },
];

export interface HallTimeStrategy {
  phaseBn: string;
  minuteRange: string;
  actionBn: string;
  ruleBn: string;
}

export const THREE_PASS_HALL_STRATEGY: HallTimeStrategy[] = [
  {
    phaseBn: "১ম রাউন্ড (First Pass - Sure Shots)",
    minuteRange: "১ম - ২৫ মিনিট",
    actionBn: "প্রশ্নপত্র শুরু থেকে শেষ পর্যন্ত দ্রুত পড়ে যেসব প্রশ্নের উত্তর ১০০% জানা আছে শুধু সেগুলো দাগিয়ে ফেলুন।",
    ruleBn: "কোনো প্রশ্ন আটকে গেলে এক সেকেন্ডও সময় নষ্ট করবেন না। কঠিন প্রশ্নে গোল দাগ দিয়ে এগিয়ে যান।",
  },
  {
    phaseBn: "২য় রাউন্ড (Second Pass - Calculations)",
    minuteRange: "২৬ - ৫০ মিনিট",
    actionBn: "যেসব প্রশ্ন একটু হিসাব করলে বা সূত্র বসালে মিলবে (অঙ্ক ও রিলেটেড কেমিস্ট্রি/ফিজিক্স) সেগুলো সমাধান করুন।",
    ruleBn: "২টি অপশনের মধ্যে দ্বিধা থাকলে এবং নিশ্চিত ২টি অপশন ভুল প্রমাণ করতে পারলে কেবল দাগানো বিবেচনা করতে পারেন।",
  },
  {
    phaseBn: "৩য় রাউন্ড (Third Pass - Review & OMR Safe Check)",
    minuteRange: "৫১ - ৬০ মিনিট",
    actionBn: "রোল নম্বর ও রেজিস্ট্রেশন নম্বরের বৃত্ত সঠিক ভরাট হয়েছে কিনা পুনরায় নিশ্চিত হোন।",
    ruleBn: "অন্ধভাবে কোনো অনুমান করবেন না। ৪টি ভুল উত্তর দাগালে ১ নম্বর হারিয়ে মেধা তালিকায় শত শত ধাপ নিচে নেমে যাবেন।",
  },
];
