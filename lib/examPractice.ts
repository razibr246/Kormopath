/*
 * Exam Practice & Model Test Simulator for Bangladeshi College & Admission Students.
 * NO imports — pure, deterministic, and unit-tested (tests/examPractice.test.ts).
 *
 * Covers major admission exams:
 * 1. Medical (মেডিকেল ও ডেন্টাল ভর্তি পরীক্ষা)
 * 2. Engineering / BUET (ইঞ্জিনিয়ারিং ও বুয়েট)
 * 3. DU Ka / Science (ঢাকা বিশ্ববিদ্যালয় 'ক' ইউনিট)
 * 4. DU Kha / Arts & Humanities (ঢাকা বিশ্ববিদ্যালয় 'খ' ইউনিট)
 * 5. DU Ga / Business (ঢাকা বিশ্ববিদ্যালয় 'গ' ইউনিট)
 * 6. GST Cluster (গুচ্ছ সাধারণ, বিজ্ঞান ও প্রযুক্তি)
 *
 * Scoring follows standard Bangladesh admission rules:
 * - Each correct answer: +1.0 mark
 * - Each incorrect answer: -0.25 mark (Negative marking)
 * - Unanswered questions: 0 mark
 */

export type ExamTrackId = "medical" | "engineering" | "du_ka" | "du_kha" | "du_ga" | "gst";

export interface ExamTrackInfo {
  id: ExamTrackId;
  nameBn: string;
  nameEn: string;
  shortName: string;
  subjects: string[];
  totalQuestions: number;
  durationMinutes: number;
  negativeMark: number;
  marksPerQuestion: number;
  passMark?: number;
  descriptionBn: string;
}

export interface PracticeQuestion {
  id: string;
  trackId: ExamTrackId;
  subject: string;
  topic: string;
  questionBn: string;
  questionEn?: string;
  options: [string, string, string, string];
  correctIndex: 0 | 1 | 2 | 3;
  explanationBn: string;
  explanationEn?: string;
  difficulty: "easy" | "medium" | "hard";
  sourceExam?: string; // e.g. "মেডিকেল ভর্তি পরীক্ষা ২০১৯-২০"
}

export interface ExamAttempt {
  id: string;
  trackId: ExamTrackId;
  date: string; // YYYY-MM-DD
  timeTakenSeconds: number;
  totalQuestions: number;
  answeredCount: number;
  correctCount: number;
  wrongCount: number;
  score: number; // Final score taking negative marks into account
  accuracyPercentage: number;
  subjectBreakdown: Record<string, { correct: number; wrong: number; total: number }>;
}

export interface QuickFlashcard {
  id: string;
  subject: string;
  topic: string;
  front: string; // Question or concept
  back: string; // Key formula, answer or explanation
  importance: "high" | "medium";
}

export const EXAM_TRACKS: ExamTrackInfo[] = [
  {
    id: "medical",
    nameBn: "মেডিকেল ও ডেন্টাল ভর্তি পরীক্ষা",
    nameEn: "Medical & Dental Admission Test (MBBS/BDS)",
    shortName: "Medical",
    subjects: ["জীববিজ্ঞান (Biology)", "রসায়ন (Chemistry)", "পদার্থবিজ্ঞান (Physics)", "ইংরেজি (English)", "সাধারণ জ্ঞান (GK)"],
    totalQuestions: 20,
    durationMinutes: 20,
    negativeMark: 0.25,
    marksPerQuestion: 1.0,
    passMark: 8.0,
    descriptionBn: "জীববিজ্ঞান (৩০), রসায়ন (২৫), পদার্থ (২০), ইংরেজি (১৫) ও সাধারণ জ্ঞান (১০) নম্বরের সমন্বিত পরীক্ষা। নেগেটিভ মার্কিং ০.২৫।",
  },
  {
    id: "engineering",
    nameBn: "বুয়েট ও ইঞ্জিনিয়ারিং ভর্তি পরীক্ষা",
    nameEn: "BUET & Engineering Admission",
    shortName: "Engineering",
    subjects: ["উচ্চতর গণিত (Math)", "পদার্থবিজ্ঞান (Physics)", "রসায়ন (Chemistry)"],
    totalQuestions: 20,
    durationMinutes: 25,
    negativeMark: 0.25,
    marksPerQuestion: 1.0,
    descriptionBn: "উচ্চতর গণিত, পদার্থ ও রসায়নের কনসেপচুয়াল ও গাণিতিক সমস্যা। গভীর পর্যবেক্ষণ ও দ্রুত সমাধান যাচাই।",
  },
  {
    id: "du_ka",
    nameBn: "ঢাকা বিশ্ববিদ্যালয় 'ক' ইউনিট (বিজ্ঞান)",
    nameEn: "DU 'Ka' Unit (Faculty of Science)",
    shortName: "DU Science",
    subjects: ["পদার্থবিজ্ঞান (Physics)", "রসায়ন (Chemistry)", "গণিত (Math)", "জীববিজ্ঞান (Biology)"],
    totalQuestions: 20,
    durationMinutes: 20,
    negativeMark: 0.25,
    marksPerQuestion: 1.0,
    descriptionBn: "পদার্থবিজ্ঞান, রসায়ন, গণিত ও জীববিজ্ঞানের এমসিকিউ অংশ। প্রতিটি ভুল উত্তরের জন্য ০.২৫ নম্বর কাটা যাবে।",
  },
  {
    id: "du_kha",
    nameBn: "ঢাকা বিশ্ববিদ্যালয় 'খ' ইউনিট (কলা, আইন ও সামাজিক বিজ্ঞান)",
    nameEn: "DU 'Kha' Unit (Arts & Social Sciences)",
    shortName: "DU Arts",
    subjects: ["বাংলা (Bangla)", "ইংরেজি (English)", "সাধারণ জ্ঞান (General Knowledge)"],
    totalQuestions: 20,
    durationMinutes: 20,
    negativeMark: 0.25,
    marksPerQuestion: 1.0,
    descriptionBn: "বাংলা ব্যাকরণ ও সাহিত্য, ইংরেজি গ্রামার ও রিডিং কম্প্রিহেনশন এবং বাংলাদেশ ও আন্তর্জাতিক সাম্প্রতিক বিষয়াবলী।",
  },
  {
    id: "du_ga",
    nameBn: "ঢাকা বিশ্ববিদ্যালয় 'গ' ইউনিট (ব্যবসায় শিক্ষা)",
    nameEn: "DU 'Ga' Unit (Business Studies)",
    shortName: "DU Business",
    subjects: ["হিসাববিজ্ঞান (Accounting)", "ব্যবসায় সংগঠন ও ব্যবস্থাপনা (Business)", "ইংরেজি (English)", "বাংলা (Bangla)"],
    totalQuestions: 20,
    durationMinutes: 20,
    negativeMark: 0.25,
    marksPerQuestion: 1.0,
    descriptionBn: "হিসাববিজ্ঞানের নীতিমালা ও গাণিতিক প্রয়োগ, ব্যবসায় সংগঠন ও ব্যবস্থাপনা, ইংরেজি ও বাংলা।",
  },
  {
    id: "gst",
    nameBn: "গুচ্ছ সাধারণ, বিজ্ঞান ও প্রযুক্তি (GST)",
    nameEn: "GST Cluster Admission",
    shortName: "GST Cluster",
    subjects: ["পদার্থবিজ্ঞান", "রসায়ন", "গণিত/জীববিজ্ঞান", "বাংলা/ইংরেজি"],
    totalQuestions: 20,
    durationMinutes: 20,
    negativeMark: 0.25,
    marksPerQuestion: 1.0,
    descriptionBn: "২৪টি সাধারণ ও বিজ্ঞান প্রযুক্তি বিশ্ববিদ্যালয়ের সমন্বিত গুচ্ছ ভর্তি পরীক্ষার প্যাটার্ন।",
  },
];

/**
 * Authentic, curated questions covering genuine Bangladeshi admission exam syllabi.
 */
export const PRACTICE_QUESTIONS: PracticeQuestion[] = [
  // --- MEDICAL ---
  {
    id: "med-bio-01",
    trackId: "medical",
    subject: "জীববিজ্ঞান (Biology)",
    topic: "কোষ ও এর গঠন",
    questionBn: "কোষের প্রোটিন তৈরির কারখানা বা 'Protein Factory' বলা হয় কোন অঙ্গাণুকে?",
    options: ["লাইসোসোম", "রাইবোসোম", "গলগি বডি", "মাইটোকন্ড্রিয়া"],
    correctIndex: 1,
    explanationBn: "রাইবোসোম (Ribosome) কোষে প্রোটিন সংশ্লেষণের প্রধান স্থান, তাই একে কোষের প্রোটিন ফ্যাক্টরি বলা হয়। মাইটোকন্ড্রিয়া হলো পাওয়ার হাউস।",
    difficulty: "easy",
    sourceExam: "মেডিকেল ভর্তি পরীক্ষা",
  },
  {
    id: "med-bio-02",
    trackId: "medical",
    subject: "জীববিজ্ঞান (Biology)",
    topic: "রক্ত ও সংবহন",
    questionBn: "মানবদেহে সার্বজনীন দাতা (Universal Donor) রক্ত গ্রুপ কোনটি?",
    options: ["AB+", "AB-", "O+", "O-"],
    correctIndex: 3,
    explanationBn: "O নেগেটিভ (O-) রক্তে A ও B কোনো অ্যান্টিজেন নেই এবং Rh ফ্যাক্টরও নেই। তাই যেকোনো গ্রুপের রোগীকে এই রক্ত জরুরি অবস্থায় দেওয়া যায়।",
    difficulty: "medium",
    sourceExam: "মেডিকেল ভর্তি পরীক্ষা",
  },
  {
    id: "med-chem-03",
    trackId: "medical",
    subject: "রসায়ন (Chemistry)",
    topic: "জৈব রসায়ন",
    questionBn: "ফরমালিন হলো ফরমালডিহাইডের কত শতাংশ জলীয় দ্রবণ?",
    options: ["১০% - ১৫%", "২০% - ২৫%", "৩৭% - ৪০%", "৫০% - ৬০%"],
    correctIndex: 2,
    explanationBn: "মিথান্যাল বা ফরমালডিহাইডের (HCHO) ৩৭% থেকে ৪০% জলীয় দ্রবণকে ফরমালিন বলা হয়। এটি পচনরোধক হিসেবে কাজ করে।",
    difficulty: "easy",
    sourceExam: "মেডিকেল ভর্তি পরীক্ষা",
  },
  {
    id: "med-phy-04",
    trackId: "medical",
    subject: "পদার্থবিজ্ঞান (Physics)",
    topic: "মহাকর্ষ ও অভিকর্ষ",
    questionBn: "পৃথিবীর কেন্দ্রে অভিকর্ষজ ত্বরণ (g)-এর মান কত?",
    options: ["9.8 m/s²", "9.83 m/s²", "0 m/s²", "অসীম"],
    correctIndex: 2,
    explanationBn: "পৃথিবীর কেন্দ্রে কার্যকর ভর শূন্য হওয়ায় পৃথিবীর কেন্দ্রস্থলে অভিকর্ষজ ত্বরণের মান g = 0 m/s² হয়।",
    difficulty: "easy",
    sourceExam: "মেডিকেল ভর্তি পরীক্ষা",
  },
  {
    id: "med-gk-05",
    trackId: "medical",
    subject: "সাধারণ জ্ঞান (GK)",
    topic: "মুক্তিযুদ্ধ ও সংবিধান",
    questionBn: "ঐতিহাসিক ৭ই মার্চের ভাষণকে ইউনেস্কো কবে 'মেমোরি অব দ্য ওয়ার্ল্ড রেজিস্টার'-এ বিশ্ব প্রামাণ্য ঐতিহ্য হিসেবে অন্তর্ভুক্ত করে?",
    options: ["৩০ অক্টোবর ২০১৭", "৭ মার্চ ২০১৮", "২৬ মার্চ ২০১৬", "১৬ ডিসেম্বর ২০১৭"],
    correctIndex: 0,
    explanationBn: "২০১৭ সালের ৩০ অক্টোবর ইউনেস্কো বঙ্গবন্ধুর ঐতিহাসিক ৭ই মার্চের ভাষণকে বিশ্ব প্রামাণ্য ঐতিহ্য হিসেবে স্বীকৃতি দেয়।",
    difficulty: "medium",
    sourceExam: "মেডিকেল ভর্তি পরীক্ষা",
  },

  // --- ENGINEERING & BUET ---
  {
    id: "eng-math-01",
    trackId: "engineering",
    subject: "উচ্চতর গণিত (Math)",
    topic: "ক্যালকুলাস ও লিমিট",
    questionBn: "lim (x → 0) [sin(5x) / tan(2x)] -এর মান কত?",
    options: ["1", "5/2", "2/5", "0"],
    correctIndex: 1,
    explanationBn: "lim (x→0) [sin(5x)/(5x) * (2x)/tan(2x) * 5/2] = 1 * 1 * 5/2 = 5/2।",
    difficulty: "easy",
    sourceExam: "বুয়েট প্রিলিমিনারি মডেল",
  },
  {
    id: "eng-math-02",
    trackId: "engineering",
    subject: "উচ্চতর গণিত (Math)",
    topic: "জটিল সংখ্যা",
    questionBn: "এককের একটি কাল্পনিক ঘনমূল ω হলে, (1 - ω + ω²)² + (1 + ω - ω²)² -এর মান কত?",
    options: ["-4", "4", "0", "8"],
    correctIndex: 0,
    explanationBn: "1 + ω + ω² = 0, সুতরাং 1 + ω² = -ω এবং 1 + ω = -ω²। সমীকরণটি হয় (-2ω)² + (-2ω²)² = 4ω² + 4ω⁴ = 4(ω² + ω) = 4(-1) = -4।",
    difficulty: "medium",
    sourceExam: "ইঞ্জিনিয়ারিং গুচ্ছ পরীক্ষা",
  },
  {
    id: "eng-phy-03",
    trackId: "engineering",
    subject: "পদার্থবিজ্ঞান (Physics)",
    topic: "কাজ, শক্তি ও ক্ষমতা",
    questionBn: "একটি বস্তুর ভরবেগ দ্বিগুণ করা হলে তার গতিশক্তি পূর্বের গতিশক্তির কতগুণ হবে?",
    options: ["২ গুণ", "৩ গুণ", "৪ গুণ", "অপরিবর্তিত"],
    correctIndex: 2,
    explanationBn: "আমরা জানি গতিশক্তি E_k = P² / (2m)। ভরবেগ P দ্বিগুণ (2P) হলে নতুন গতিশক্তি হবে (2P)² / (2m) = 4 * (P² / 2m) = ৪ গুণ।",
    difficulty: "easy",
    sourceExam: "বুয়েট ও ঢাবি ক",
  },
  {
    id: "eng-phy-04",
    trackId: "engineering",
    subject: "পদার্থবিজ্ঞান (Physics)",
    topic: "গতিবিদ্যা ও প্রক্ষেপক",
    questionBn: "কোনো বস্তুকে অনুভূমিকের সাথে কত কোণে নিক্ষেপ করলে সর্বাধিক অনুভূমিক পাল্লা (Maximum Range) পাওয়া যায়?",
    options: ["30°", "45°", "60°", "90°"],
    correctIndex: 1,
    explanationBn: "পাল্লা R = (u² sin 2θ) / g। sin 2θ এর সর্বোচ্চ মান ১ যখন 2θ = 90° বা θ = 45°।",
    difficulty: "easy",
    sourceExam: "ইঞ্জিনিয়ারিং ভর্তি পরীক্ষা",
  },
  {
    id: "eng-chem-05",
    trackId: "engineering",
    subject: "রসায়ন (Chemistry)",
    topic: "জারণ-বিজারণ",
    questionBn: "K₂Cr₂O₇ যৌগে ক্রোমিয়াম (Cr)-এর জারণ সংখ্যা কত?",
    options: ["+3", "+5", "+6", "+7"],
    correctIndex: 2,
    explanationBn: "পটাশিয়াম (+1)*2 + Cr(x)*2 + অক্সিজেন (-2)*7 = 0 => 2 + 2x - 14 = 0 => 2x = 12 => x = +6।",
    difficulty: "easy",
    sourceExam: "বুয়েট ও রুয়েট",
  },

  // --- DU KA (Science) ---
  {
    id: "du-ka-01",
    trackId: "du_ka",
    subject: "পদার্থবিজ্ঞান (Physics)",
    topic: "তরঙ্গ ও শব্দ",
    questionBn: "শব্দ তরঙ্গ কোন ধরনের তরঙ্গ?",
    options: ["অনুদৈর্ঘ্য বা লম্বিক তরঙ্গ", "অনুপ্ৰস্থ তরঙ্গ", "তড়িৎচৌম্বকীয় তরঙ্গ", "স্থির তরঙ্গ"],
    correctIndex: 0,
    explanationBn: "শব্দ তরঙ্গ মাধ্যমে সংকোচন ও প্রসারণের মাধ্যমে অগ্রসর হয়, যা কণার স্পন্দনের সমান্তরালে চলে। তাই এটি অনুদৈর্ঘ্য তরঙ্গ।",
    difficulty: "easy",
    sourceExam: "ঢাকা বিশ্ববিদ্যালয় 'ক' ইউনিট",
  },
  {
    id: "du-ka-02",
    trackId: "du_ka",
    subject: "রসায়ন (Chemistry)",
    topic: "পর্যায় সারণি ও বন্ধন",
    questionBn: "কোন মৌলটির তড়িৎ ঋণাত্মকতা (Electronegativity) সবচেয়ে বেশি?",
    options: ["ক্লোরিন (Cl)", "অক্সিজেন (O)", "ফ্লোরিন (F)", "নাইট্রোজেন (N)"],
    correctIndex: 2,
    explanationBn: "পল্লিং স্কেলে ফ্লোরিনের তড়িৎ ঋণাত্মকতা সর্বোচ্চ (৪.০)। এরপরেই রয়েছে অক্সিজেন (৩.৫)।",
    difficulty: "easy",
    sourceExam: "ঢাকা বিশ্ববিদ্যালয় 'ক' ইউনিট",
  },
  {
    id: "du-ka-03",
    trackId: "du_ka",
    subject: "গণিত (Math)",
    topic: "অন্তরীকরণ",
    questionBn: "d/dx [ln(sec x + tan x)] -এর মান কোনটি?",
    options: ["sec x", "tan x", "sec² x", "sec x tan x"],
    correctIndex: 0,
    explanationBn: "d/dx [ln(sec x + tan x)] = (sec x tan x + sec² x) / (sec x + tan x) = sec x (tan x + sec x) / (sec x + tan x) = sec x।",
    difficulty: "medium",
    sourceExam: "ঢাকা বিশ্ববিদ্যালয় 'ক' ইউনিট",
  },

  // --- DU KHA (Arts & Social Sciences) ---
  {
    id: "du-kha-01",
    trackId: "du_kha",
    subject: "বাংলা (Bangla)",
    topic: "ধ্বনি ও বর্ণ",
    questionBn: "নিচের কোন ধ্বনিটি 'তালব্য ধ্বনি'?",
    options: ["ক", "ট", "চ", "প"],
    correctIndex: 2,
    explanationBn: "চ-বর্গের ধ্বনিসমূহ (চ, ছ, জ, ঝ, ঞ) উচ্চারণের সময় জিভের তালুর সাথে স্পর্শ ঘটে, তাই এগুলো তালব্য ধ্বনি।",
    difficulty: "easy",
    sourceExam: "ঢাকা বিশ্ববিদ্যালয় 'খ' ইউনিট",
  },
  {
    id: "du-kha-02",
    trackId: "du_kha",
    subject: "ইংরেজি (English)",
    topic: "Prepositions",
    questionBn: "Choose the correct preposition: 'He died _______ overwork.'",
    options: ["of", "from", "by", "for"],
    correctIndex: 1,
    explanationBn: "রোগে মারা গেলে 'died of' (e.g. died of cancer), কিন্তু অতিরিক্ত পরিশ্রম বা আঘাতের কারণে মারা গেলে 'died from' বসে।",
    difficulty: "medium",
    sourceExam: "ঢাকা বিশ্ববিদ্যালয় 'খ' ইউনিট",
  },
  {
    id: "du-kha-03",
    trackId: "du_kha",
    subject: "সাধারণ জ্ঞান (General Knowledge)",
    topic: "বাংলাদেশ বিষয়াবলী",
    questionBn: "বঙ্গবন্ধু স্যাটেলাইট-১ কোন মহাকাশ গবেষণা কেন্দ্র থেকে উৎক্ষেপণ করা হয়েছিল?",
    options: ["বাইকোনুর কসমোড্রোম", "কেনেডি স্পেস সেন্টার", "শ্রীহরিকোটা", "গিয়ানা স্পেস সেন্টার"],
    correctIndex: 1,
    explanationBn: "২০১৮ সালের ১১ মে যুক্তরাষ্ট্রের ফ্লোরিডার কেনেডি স্পেস সেন্টার থেকে স্পেসএক্সের ফ্যালকন-৯ রকেটের মাধ্যমে বঙ্গবন্ধু স্যাটেলাইট-১ উৎক্ষেপণ করা হয়।",
    difficulty: "medium",
    sourceExam: "ঢাকা বিশ্ববিদ্যালয় 'খ' ইউনিট",
  },

  // --- DU GA (Business Studies) ---
  {
    id: "du-ga-01",
    trackId: "du_ga",
    subject: "হিসাববিজ্ঞান (Accounting)",
    topic: "হিসাব সমীকরণ",
    questionBn: "হিসাব সমীকরণের মৌলিক রূপ কোনটি?",
    options: [
      "সম্পদ = দায় + মালিকানাস্বত্ব (A = L + OE)",
      "সম্পদ + দায় = মালিকানাস্বত্ব",
      "সম্পদ = দায় - মালিকানাস্বত্ব",
      "মালিকানাস্বত্ব = সম্পদ + দায়",
    ],
    correctIndex: 0,
    explanationBn: "হিসাববিজ্ঞানের মৌলিক সমীকরণ হলো Assets = Liabilities + Owner's Equity (সম্পদ = দায় + মালিকানাস্বত্ব)।",
    difficulty: "easy",
    sourceExam: "ঢাকা বিশ্ববিদ্যালয় 'গ' ইউনিট",
  },
  {
    id: "du-ga-02",
    trackId: "du_ga",
    subject: "ব্যবসায় সংগঠন ও ব্যবস্থাপনা (Business)",
    topic: "ব্যবস্থাপনার নীতি",
    questionBn: "আধুনিক ব্যবস্থাপনার জনক (Father of Modern Management) কে?",
    options: ["এফ ডব্লিউ টেলর", "হেনরি ফেয়ল", "অ্যাডাম স্মিথ", "পিটার ড্রাকার"],
    correctIndex: 1,
    explanationBn: "হেনরি ফেয়লকে আধুনিক প্রশাসনিক ব্যবস্থাপনার জনক বলা হয়। তিনি ব্যবস্থাপনার ১৪টি নীতি প্রণয়ন করেন। এফ ডব্লিউ টেলর হলেন বৈজ্ঞানিক ব্যবস্থাপনার জনক।",
    difficulty: "easy",
    sourceExam: "ঢাকা বিশ্ববিদ্যালয় 'গ' ইউনিট",
  },

  // --- GST CLUSTER ---
  {
    id: "gst-all-01",
    trackId: "gst",
    subject: "রসায়ন (Chemistry)",
    topic: "দ্রবণ ও ঘনমাত্রা",
    questionBn: "১ মোলার (1 M) দ্রবণের ক্ষেত্রে নিচের কোনটি সঠিক?",
    options: [
      "১ লিটার দ্রবণে ১ মোল দ্রবীভূত থাকে",
      "১০০০ গ্রাম দ্রাবকে ১ মোল দ্রবীভূত থাকে",
      "১০০ মিলি দ্রবণে ১ মোল থাকে",
      "১ কিলোগ্রাম দ্রবণে ১ মোল থাকে",
    ],
    correctIndex: 0,
    explanationBn: "নির্দিষ্ট তাপমাত্রায় প্রতি লিটার দ্রবণে দ্রবীভূত দ্রবের মোল সংখ্যাকে মোলারিটি (M) বলে।",
    difficulty: "easy",
    sourceExam: "গুচ্ছ ভর্তি পরীক্ষা",
  },
  {
    id: "gst-all-02",
    trackId: "gst",
    subject: "তথ্য ও যোগাযোগ প্রযুক্তি (ICT)",
    topic: "সংখ্যা পদ্ধতি",
    questionBn: "বাইনারি সংখ্যা (1101)₂ এর দশমিক (Decimal) মান কত?",
    options: ["11", "12", "13", "14"],
    correctIndex: 2,
    explanationBn: "(1*2³) + (1*2²) + (0*2¹) + (1*2⁰) = 8 + 4 + 0 + 1 = 13।",
    difficulty: "easy",
    sourceExam: "গুচ্ছ ভর্তি পরীক্ষা",
  },

  // --- ADDITIONAL MEDICAL QUESTIONS ---
  {
    id: "med-bio-06",
    trackId: "medical",
    subject: "জীববিজ্ঞান (Biology)",
    topic: "মানব শারীরতত্ত্ব: রক্ত",
    questionBn: "হৃদপিণ্ডের কোন প্রকোষ্ঠ থেকে অক্সিজেনযুক্ত রক্ত সারা দেহে সংবহিত হয়?",
    options: ["ডান অলিন্দ", "বাম অলিন্দ", "ডান নিলয়", "বাম নিলয়"],
    correctIndex: 3,
    explanationBn: "ফুসফুস থেকে পালমোনারি শিরার মাধ্যমে অক্সিজেনযুক্ত রক্ত বাম অলিন্দে আসে এবং সেখান থেকে বাম নিলয় হয়ে অ্যাওর্টা বা মহাধমনীর মাধ্যমে সারা দেহে প্রবাহিত হয়।",
    difficulty: "easy",
    sourceExam: "মেডিকেল ভর্তি পরীক্ষা",
  },
  {
    id: "med-bio-07",
    trackId: "medical",
    subject: "জীববিজ্ঞান (Biology)",
    topic: "অণুজীব: ভাইরাস ও ব্যাকটেরিয়া",
    questionBn: "TMV (Tobacco Mosaic Virus) ভাইরাসের আকৃতি কেমন?",
    options: ["গোলাকার", "দণ্ডাকার (Rod-shaped)", "ঘূর্ণনাকার", "ব্যাঙাচি আকার"],
    correctIndex: 1,
    explanationBn: "টোব্যাকো মোজাইক ভাইরাস (টিএমভি) দণ্ডাকার বা রড-শেপড ভাইরাস। পোলিও ভাইরাস গোলাকার এবং T2 ব্যাকটেরিওফাজ ব্যাঙাচি আকারের।",
    difficulty: "easy",
    sourceExam: "মেডিকেল ভর্তি পরীক্ষা",
  },
  {
    id: "med-chem-08",
    trackId: "medical",
    subject: "রসায়ন (Chemistry)",
    topic: "মৌলের পর্যায়বৃত্ত ধর্ম",
    questionBn: "মানব রক্তের স্বাভাবিক pH মান কত?",
    options: ["6.4 - 6.8", "7.35 - 7.45", "7.8 - 8.2", "5.5 - 6.0"],
    correctIndex: 1,
    explanationBn: "মানব রক্তের স্বাভাবিক pH সামান্য ক্ষারীয় এবং এর মান ৭.৩৫ থেকে ৭.৪৫ এর মধ্যে নিয়ন্ত্রিত থাকে (গড় ৭.৪)।",
    difficulty: "easy",
    sourceExam: "মেডিকেল ভর্তি পরীক্ষা",
  },
  {
    id: "med-eng-09",
    trackId: "medical",
    subject: "ইংরেজি (English)",
    topic: "Vocabulary & Synonym",
    questionBn: "What is the synonym of the word 'Pensive'?",
    options: ["Careless", "Thoughtful", "Shallow", "Cheerful"],
    correctIndex: 1,
    explanationBn: "'Pensive' শব্দের অর্থ গভীর চিন্তামগ্ন বা ভাবুক। এর সঠিক সিনোনিম হলো 'Thoughtful'।",
    difficulty: "medium",
    sourceExam: "মেডিকেল ভর্তি পরীক্ষা",
  },

  // --- ADDITIONAL ENGINEERING & BUET QUESTIONS ---
  {
    id: "eng-math-06",
    trackId: "engineering",
    subject: "উচ্চতর গণিত (Math)",
    topic: "ম্যাট্রিক্স ও নির্ণায়ক",
    questionBn: "একটি 3x3 ম্যাট্রিক্স A এর জন্য |A| = 5 হলে, |2A| -এর মান কত?",
    options: ["10", "20", "40", "80"],
    correctIndex: 2,
    explanationBn: "n x n ম্যাট্রিক্সের ক্ষেত্রে |k * A| = k^n * |A|। এখানে n = 3 এবং k = 2, সুতরাং |2A| = 2³ * 5 = 8 * 5 = 40।",
    difficulty: "medium",
    sourceExam: "বুয়েট ও রুয়েট",
  },
  {
    id: "eng-math-07",
    trackId: "engineering",
    subject: "উচ্চতর গণিত (Math)",
    topic: "বৃত্ত ও সরলরেখা",
    questionBn: "x² + y² - 6x + 8y = 0 বৃত্তের কেন্দ্র ও ব্যাসার্ধ যথাক্রমে কোনটি?",
    options: ["(3, -4) এবং 5", "(-3, 4) এবং 5", "(3, -4) এবং 25", "(-6, 8) এবং 10"],
    correctIndex: 0,
    explanationBn: "বৃত্তের সমীকরণ x² + y² + 2gx + 2fy + c = 0 এর সাথে তুলনা করলে g = -3, f = 4, c = 0। কেন্দ্র (-g, -f) = (3, -4)। ব্যাসার্ধ r = √(g² + f² - c) = √(9 + 16) = 5।",
    difficulty: "easy",
    sourceExam: "বুয়েট ও কুয়েট",
  },
  {
    id: "eng-phy-08",
    trackId: "engineering",
    subject: "পদার্থবিজ্ঞান (Physics)",
    topic: "স্থির তড়িৎ ও ধারকত্ব",
    questionBn: "বায়ু মাধ্যমে 1 কুলম্ব করে দুটি সমধর্মী চার্জ 1 মিটার দূরত্বে স্থাপন করলে এদের মধ্যকার বিকর্ষণ বল কত?",
    options: ["9 x 10⁹ N", "1 N", "8.85 x 10⁻¹² N", "9 x 10⁻⁹ N"],
    correctIndex: 0,
    explanationBn: "কুলম্বের সূত্রানুসারে F = (1 / 4πε₀) * (q₁q₂ / r²)। শূন্য বা বায়ু মাধ্যমে 1 / 4πε₀ = 9 x 10⁹ N·m²/C²। অতএব F = 9 x 10⁹ * (1 * 1 / 1²) = 9 x 10⁹ N।",
    difficulty: "easy",
    sourceExam: "ইঞ্জিনিয়ারিং গুচ্ছ",
  },
  {
    id: "eng-chem-09",
    trackId: "engineering",
    subject: "রসায়ন (Chemistry)",
    topic: "সংকরায়ন (Hybridization)",
    questionBn: "SF₆ (সালফার হেক্সাফ্লোরাইড) অণুর কেন্দ্রীয় পরমাণুর সংকরায়ন এবং জ্যামিতিক গঠন কোনটি?",
    options: ["sp³ ও চতুস্তলকীয়", "sp³d ও ত্রিকোণীয় দ্বিপিরামিডীয়", "sp³d² ও অষ্টতলকীয় (Octahedral)", "dsp² ও সমতলীয় বর্গাকার"],
    correctIndex: 2,
    explanationBn: "SF₆ এ সালফারের চারপাশে ৬টি সিগমা বন্ধন জোড় এবং কোনো মুক্তজোড় ইলেকট্রন নেই (Stearic Number = 6)। তাই সংকরায়ন sp³d² এবং আকৃতি অষ্টতলকীয়।",
    difficulty: "medium",
    sourceExam: "বুয়েট ও ঢাবি ক",
  },

  // --- ADDITIONAL DU KA (Science) QUESTIONS ---
  {
    id: "du-ka-04",
    trackId: "du_ka",
    subject: "পদার্থবিজ্ঞান (Physics)",
    topic: "আধুনিক পদার্থবিজ্ঞানের সূচনা",
    questionBn: "ফোটনের স্থির ভর (Rest Mass) কত?",
    options: ["শূন্য (0)", "9.1 x 10⁻³¹ kg", "1.67 x 10⁻²⁷ kg", "অসীম"],
    correctIndex: 0,
    explanationBn: "বিশেষ আপেক্ষিক তত্ত্ব অনুযায়ী আলো বা ফোটন কণা সর্বদা আলোর বেগে ধাবমান এবং এর নিশ্চল বা স্থির ভর শূন্য।",
    difficulty: "easy",
    sourceExam: "ঢাকা বিশ্ববিদ্যালয় 'ক' ইউনিট",
  },
  {
    id: "du-ka-05",
    trackId: "du_ka",
    subject: "রসায়ন (Chemistry)",
    topic: "রাসায়নিক পরিবর্তন ও বাফার",
    questionBn: "নিচের কোন মিশ্রণটি একটি ক্ষারীয় বাফার দ্রবণ তৈরি করে?",
    options: ["CH₃COOH + CH₃COONa", "NH₄OH + NH₄Cl", "HCl + NaCl", "HNO₃ + NaNO₃"],
    correctIndex: 1,
    explanationBn: "দুর্বল ক্ষার এবং এর তীব্র অ্যাসিডীয় লবণের মিশ্রণ (যেমন NH₄OH ও NH₄Cl) একটি ক্ষারীয় বাফার তৈরি করে।",
    difficulty: "medium",
    sourceExam: "ঢাকা বিশ্ববিদ্যালয় 'ক' ইউনিট",
  },
  {
    id: "du-ka-06",
    trackId: "du_ka",
    subject: "গণিত (Math)",
    topic: "ত্রিকোণমিতি ও বিপরীত বৃত্তীয় ফাংশন",
    questionBn: "tan⁻¹(1/2) + tan⁻¹(1/3) এর মান কত?",
    options: ["π/6", "π/4", "π/3", "π/2"],
    correctIndex: 1,
    explanationBn: "tan⁻¹(x) + tan⁻¹(y) = tan⁻¹[(x+y)/(1-xy)] = tan⁻¹[(1/2 + 1/3) / (1 - 1/6)] = tan⁻¹[(5/6)/(5/6)] = tan⁻¹(1) = π/4।",
    difficulty: "easy",
    sourceExam: "ঢাকা বিশ্ববিদ্যালয় 'ক' ইউনিট",
  },

  // --- ADDITIONAL DU KHA (Arts) QUESTIONS ---
  {
    id: "du-kha-04",
    trackId: "du_kha",
    subject: "বাংলা (Bangla)",
    topic: "সমাস",
    questionBn: "'পায়ে হেঁটে যে চলে' - পদদলিত; এটি কোন সমাসের উদাহরণ?",
    options: ["কর্মধারয়", "উপপদ তৎপুরুষ", "অলুক বহুব্রীহি", "দ্বিগু"],
    correctIndex: 1,
    explanationBn: "কৃদন্ত পদের সাথে উপপদের যে সমাস হয় তাকে উপপদ তৎপুরুষ সমাস বলে। যেমন: জলে চরে যা = জলচর, পায়ে হেঁটে চলে যে = পদচারী/উপপদ।",
    difficulty: "medium",
    sourceExam: "ঢাকা বিশ্ববিদ্যালয় 'খ' ইউনিট",
  },
  {
    id: "du-kha-05",
    trackId: "du_kha",
    subject: "সাধারণ জ্ঞান (General Knowledge)",
    topic: "আন্তর্জাতিক বিষয়াবলী",
    questionBn: "জলবায়ু পরিবর্তনের ক্ষয়ক্ষতি মোকাবিলায় কপ-২৭ সম্মেলনে কোন ঐতিহাসিক তহবিল গঠনের সিদ্ধান্ত গৃহীত হয়?",
    options: ["গ্রিন ক্লাইমেট ফান্ড", "লস অ্যান্ড ড্যামেজ ফান্ড (Loss and Damage Fund)", "গ্লোবাল এনভায়রনমেন্ট ফ্যাসিলিটি", "ক্লাইমেট রেজিলিয়েন্স ফান্ড"],
    correctIndex: 1,
    explanationBn: "২০২২ সালে মিশরের শারম আল-শেখে অনুষ্ঠিত COP27 সম্মেলনে জলবায়ু ঝুঁকিপূর্ণ দেশগুলোর জন্য ঐতিহাসিক 'Loss and Damage Fund' গঠনের সিদ্ধান্ত হয়।",
    difficulty: "medium",
    sourceExam: "ঢাকা বিশ্ববিদ্যালয় 'খ' ইউনিট",
  },

  // --- ADDITIONAL DU GA (Commerce) QUESTIONS ---
  {
    id: "du-ga-04",
    trackId: "du_ga",
    subject: "হিসাববিজ্ঞান (Accounting)",
    topic: "রেওয়ামিল ও ভুল সংশোধন",
    questionBn: "নিচের কোন ভুলটি রেওয়ামিলে ধরা পড়ে না?",
    options: ["বাদ পড়ার ভুল (Error of Omission)", "যোগফলের ভুল", "একতরফা খতিয়ান পোস্টিং ভুল", "টাকার অংক ভুল লেখা"],
    correctIndex: 0,
    explanationBn: "লেনদেন প্রাথমিক হিসাবের বইয়ে সম্পূর্ণরূপে লিপিবদ্ধ না হলে (বাদ পড়ার ভুল) উভয় দিক সমপরিমাণে বাদ পড়ে, ফলে রেওয়ামিল মিলে যায় এবং ভুলটি ধরা পড়ে না।",
    difficulty: "medium",
    sourceExam: "ঢাকা বিশ্ববিদ্যালয় 'গ' ইউনিট",
  },
  {
    id: "du-ga-05",
    trackId: "du_ga",
    subject: "ব্যবসায় সংগঠন ও ব্যবস্থাপনা (Business)",
    topic: "নেতৃত্ব ও প্রেষণা",
    questionBn: "মাসলোর চাহিদা সোপান তত্ত্বের (Maslow's Hierarchy of Needs) সর্বোচ্চ স্তর কোনটি?",
    options: ["শারীরবৃত্তীয় চাহিদা", "নিরাপত্তার চাহিদা", "আত্মপ্রতিষ্ঠার চাহিদা (Self-Actualization)", "সামাজিক চাহিদা"],
    correctIndex: 2,
    explanationBn: "আব্রাহাম মাসলোর চাহিদা সোপান তত্ত্বের চূড়ায় বা সর্বোচ্চ স্তরে রয়েছে আত্মপ্রতিষ্ঠা বা আত্মউন্নয়ন (Self-Actualization)-এর চাহিদা।",
    difficulty: "easy",
    sourceExam: "ঢাকা বিশ্ববিদ্যালয় 'গ' ইউনিট",
  },

  // --- ADDITIONAL GST CLUSTER QUESTIONS ---
  {
    id: "gst-all-03",
    trackId: "gst",
    subject: "পদার্থবিজ্ঞান (Physics)",
    topic: "তাপগতিবিদ্যা",
    questionBn: "একটি কার্নো ইঞ্জিন 227°C এবং 27°C তাপমাত্রার আধারের মধ্যে কাজ করলে এর সর্বোচ্চ দক্ষতা (Efficiency) কত?",
    options: ["20%", "30%", "40%", "50%"],
    correctIndex: 2,
    explanationBn: "T₁ = 227 + 273 = 500 K; T₂ = 27 + 273 = 300 K। দক্ষতা η = (1 - T₂/T₁) * 100% = (1 - 300/500) * 100% = (2/5) * 100% = 40%।",
    difficulty: "easy",
    sourceExam: "গুচ্ছ ভর্তি পরীক্ষা",
  },
  {
    id: "gst-all-04",
    trackId: "gst",
    subject: "জীববিজ্ঞান (Biology)",
    topic: "জিনতত্ত্ব ও বিবর্তন",
    questionBn: "মেন্ডেলের প্রথম সূত্রের ফিনোটাইপিক অনুপাত (Monohybrid ratio) কোনটি?",
    options: ["9:3:3:1", "3:1", "1:2:1", "9:7"],
    correctIndex: 1,
    explanationBn: "গ্রেগর জোহান মেন্ডেলের পৃথকীকরণ সূত্র বা প্রথম সূত্রের F₂ জনুতে ফিনোটাইপিক অনুপাত ৩:১ (৩টি প্রকট ও ১টি প্রচ্ছন্ন লক্ষণযুক্ত)।",
    difficulty: "easy",
    sourceExam: "গুচ্ছ ভর্তি পরীক্ষা",
  },

  // --- COMPREHENSIVE SET 2 ---
  {
    id: "med-bio-10",
    trackId: "medical",
    subject: "জীববিজ্ঞান (Biology)",
    topic: "মানব শারীরতত্ত্ব: রেচন ও বর্জ্য",
    questionBn: "বৃক্কের গঠন ও কাজের মৌলিক একক (Functional Unit) কোনটি?",
    options: ["নিউরন", "নেফ্রন", "বোম্যান্স ক্যাপসুল", "ম্যালপিজিয়ান বডি"],
    correctIndex: 1,
    explanationBn: "বৃক্কের গঠন ও কাজের গাঠনিক একক হলো নেফ্রন (Nephron)। প্রতিটি মানব বৃক্কে প্রায় ১০-১২ লক্ষ নেফ্রন থাকে। নিউরন হলো স্নায়ুতন্ত্রের একক।",
    difficulty: "easy",
    sourceExam: "মেডিকেল ভর্তি পরীক্ষা",
  },
  {
    id: "eng-math-10",
    trackId: "engineering",
    subject: "উচ্চতর গণিত (Math)",
    topic: "ভেক্টর ও স্থানাঙ্ক জ্যামিতি",
    questionBn: "ā = 2î + 3ĵ - 4k̂ এবং b̄ = 4î + 6ĵ + mk̂ ভেক্টরদ্বয় পরস্পর লম্ব হলে m-এর মান কত?",
    options: ["5", "6.5", "13/2", "26/4"],
    correctIndex: 2,
    explanationBn: "দুটি ভেক্টর লম্ব হলে এদের ডট গুণন শূন্য হয়: ā · b̄ = (2*4) + (3*6) + (-4*m) = 8 + 18 - 4m = 26 - 4m = 0 => 4m = 26 => m = 26/4 = 13/2।",
    difficulty: "easy",
    sourceExam: "বুয়েট ও রুয়েট",
  },
  {
    id: "eng-phy-11",
    trackId: "engineering",
    subject: "পদার্থবিজ্ঞান (Physics)",
    topic: "সরল ছন্দিত স্পন্দন (SHM)",
    questionBn: "একটি সরল দোলকের বিস্তার দ্বিগুণ করা হলে এর দোলনকাল (Time Period) কতগুণ হবে?",
    options: ["দ্বিগুণ", "অর্ধেক", "চারগুণ", "অপরিবর্তিত থাকবে"],
    correctIndex: 3,
    explanationBn: "সরল দোলকের দোলনকাল T = 2π √(L/g)। বিস্তার (Amplitude) ৪ ডিগ্রির মধ্যে থাকলে দোলনকাল বিস্তারের ওপর নির্ভর করে না; তাই দোলনকাল অপরিবর্তিত থাকবে।",
    difficulty: "medium",
    sourceExam: "ইঞ্জিনিয়ারিং ভর্তি পরীক্ষা",
  },
  {
    id: "du-ka-07",
    trackId: "du_ka",
    subject: "রসায়ন (Chemistry)",
    topic: "জৈব রসায়ন: হাইড্রোকার্বন",
    questionBn: "বেনজিনে কয়টি ডিলোকালাইজড (Delocalized) পাই (π) ইলেকট্রন বিদ্যমান?",
    options: ["৩টি", "৬টি", "১২টি", "১৮টি"],
    correctIndex: 1,
    explanationBn: "বেনজিন বলয়ে ৩টি কার্বন-কার্বন দ্বিবন্ধন থাকে। প্রতিটি দ্বিবন্ধনে ২টি করে পাই ইলেকট্রন মিলিয়ে মোট ৬টি π ইলেকট্রন রেজোন্যান্সের মাধ্যমে ডিলোকালাইজড থাকে (Hückel's 4n+2 rule)।",
    difficulty: "easy",
    sourceExam: "ঢাকা বিশ্ববিদ্যালয় 'ক' ইউনিট",
  },
  {
    id: "du-ka-08",
    trackId: "du_ka",
    subject: "গণিত (Math)",
    topic: "দ্বিপদী বিস্তৃতি (Binomial)",
    questionBn: "(x + 1/x)⁸ এর বিস্তৃতিতে x-বর্জিত বা ধ্রুব পদের মান কত?",
    options: ["56", "70", "28", "8"],
    correctIndex: 1,
    explanationBn: "সাধারণ পদ T_(r+1) = ⁸C_r * x^(8-r) * (x⁻¹)^r = ⁸C_r * x^(8-2r)। x-বর্জিত পদের জন্য 8 - 2r = 0 => r = 4। অতএব পদটির মান ⁸C₄ = (8*7*6*5)/(4*3*2*1) = 70।",
    difficulty: "medium",
    sourceExam: "ঢাকা বিশ্ববিদ্যালয় 'ক' ইউনিট",
  },
  {
    id: "du-kha-06",
    trackId: "du_kha",
    subject: "বাংলা (Bangla)",
    topic: "সন্ধি",
    questionBn: "'গায়ক' শব্দের সঠিক সন্ধিবিচ্ছেদ কোনটি?",
    options: ["গা + অক", "গৈ + অক", "গো + অক", "গে + অক"],
    correctIndex: 1,
    explanationBn: "ঐ-কার এর পর অ থাকলে ঐ স্থানে 'আয়্' হয়। সুতরাং গৈ + অক = গায়ক (যেমন নৈ + অক = নায়ক)।",
    difficulty: "easy",
    sourceExam: "ঢাকা বিশ্ববিদ্যালয় 'খ' ইউনিট",
  },
  {
    id: "du-kha-07",
    trackId: "du_kha",
    subject: "ইংরেজি (English)",
    topic: "Subject-Verb Agreement",
    questionBn: "Choose the correct sentence:",
    options: [
      "Neither the teacher nor the students was present.",
      "Neither the teacher nor the students were present.",
      "Neither the teacher nor the students has been present.",
      "Neither the teacher nor the students is present.",
    ],
    correctIndex: 1,
    explanationBn: "'Neither ... nor' দ্বারা যুক্ত একাধিক কর্তার ক্ষেত্রে Verb সবসময় নিকটবর্তী Subject অনুযায়ী বসে। এখানে 'students' বহুবচন (Plural), তাই Verb হবে 'were' বা plural।",
    difficulty: "medium",
    sourceExam: "ঢাকা বিশ্ববিদ্যালয় 'খ' ইউনিট",
  },
  {
    id: "du-ga-06",
    trackId: "du_ga",
    subject: "হিসাববিজ্ঞান (Accounting)",
    topic: "অবচয় ও অবচয় ধার্য পদ্ধতি",
    questionBn: "কোন অবচয় পদ্ধতিতে সম্পত্তির কার্যকাল শেষে ভগ্নাবশেষ মূল্য (Salvage value) কখনো শূন্য হয় না?",
    options: ["সরলরৈখিক পদ্ধতি", "ক্রমহ্রাসমান জের পদ্ধতি (Diminishing Balance)", "উৎপাদন একক পদ্ধতি", "বর্ষসংখ্যার সমষ্টি পদ্ধতি"],
    correctIndex: 1,
    explanationBn: "ক্রমহ্রাসমান জের পদ্ধতিতে প্রতি বছর হ্রাসকৃত পুস্তক মূল্যের ওপর অবচয়ের হার প্রয়োগ করা হয়, ফলে গাণিতিকভাবে মূল্য কখনো শূন্য হয় না।",
    difficulty: "medium",
    sourceExam: "ঢাকা বিশ্ববিদ্যালয় 'গ' ইউনিট",
  },
  {
    id: "gst-all-05",
    trackId: "gst",
    subject: "তথ্য ও যোগাযোগ প্রযুক্তি (ICT)",
    topic: "HTML ও ওয়েব ডিজাইন",
    questionBn: "HTML এ হাইপারলিংক তৈরি করার জন্য কোন ট্যাগটি ব্যবহৃত হয়?",
    options: ["<link>", "<a>", "<href>", "<url>"],
    correctIndex: 1,
    explanationBn: "ওয়েবপেজে হাইপারলিংক সংযোগ করার জন্য অ্যাঙ্কর ট্যাগ <a> এবং href অ্যাট্রিবিউট ব্যবহৃত হয়, যেমন <a href='url'>টেক্সট</a>।",
    difficulty: "easy",
    sourceExam: "গুচ্ছ ভর্তি পরীক্ষা",
  },
  {
    id: "gst-all-06",
    trackId: "gst",
    subject: "ইংরেজি (English)",
    topic: "Idioms & Phrases",
    questionBn: "What is the meaning of the idiom 'A blessing in disguise'?",
    options: [
      "A tragedy without end",
      "An apparent misfortune that eventually has good results",
      "A fake promise from a friend",
      "A secret curse",
    ],
    correctIndex: 1,
    explanationBn: "'A blessing in disguise' বাগধারাটির অর্থ দৃশ্যত কোনো দুর্ভাগ্য বা অমঙ্গল মনে হলেও প্রকৃতপক্ষে যা পরবর্তীতে ইতিবাচক বা শুভ ফল বয়ে আনে।",
    difficulty: "easy",
    sourceExam: "গুচ্ছ ভর্তি পরীক্ষা",
  },
];

/**
 * High-yield revision flashcards for last-minute review.
 */
export const QUICK_FLASHCARDS: QuickFlashcard[] = [
  {
    id: "fc-01",
    subject: "পদার্থবিজ্ঞান",
    topic: "মহাকর্ষ",
    front: "মুক্তিবেগ (Escape Velocity)-এর সমীকরণ কী এবং পৃথিবীতে এর মান কত?",
    back: "v_e = √(2gR) = √(2GM/R)। পৃথিবীতে মুক্তিবেগের মান প্রায় ১১.২ কিমি/সেকেন্ড।",
    importance: "high",
  },
  {
    id: "fc-02",
    subject: "রসায়ন",
    topic: "জৈব যৌগ",
    front: "লুকাস বিকারক (Lucas Reagent) কী এবং এটি কীসের শনাক্তকরণে ব্যবহৃত হয়?",
    back: "অনার্দ্র ZnCl₂ ও গাঢ় HCl-এর মিশ্রণ। এটি ১°, ২° ও ৩° অ্যালকোহল পার্থক্যকরণে ব্যবহৃত হয়।",
    importance: "high",
  },
  {
    id: "fc-03",
    subject: "জীববিজ্ঞান",
    topic: "উদ্ভিদবিজ্ঞান",
    front: "ক্রেবস চক্র (Krebs Cycle) কোষের কোথায় সংঘটিত হয়?",
    back: "মাইটোকন্ড্রিয়ার ধাত্রে (Matrix)। এখানে অধিকাংশ ATP ও শক্তি উৎপাদিত হয়।",
    importance: "high",
  },
  {
    id: "fc-04",
    subject: "উচ্চতর গণিত",
    topic: "ত্রিকোণমিতি",
    front: "cos(2A) এর ৪টি গুরুত্বপূর্ণ সূত্র কী কী?",
    back: "1. cos²A - sin²A\n2. 2cos²A - 1\n3. 1 - 2sin²A\n4. (1 - tan²A)/(1 + tan²A)",
    importance: "high",
  },
  {
    id: "fc-05",
    subject: "ইংরেজি",
    topic: "Grammar Rules",
    front: "'No sooner had ... than' এবং 'Scarcely had ... when' এর নিয়ম কী?",
    back: "No sooner had + Sub + V3 ... than + Past Indefinite। Scarcely/Hardly had + Sub + V3 ... when/before + Past Indefinite।",
    importance: "high",
  },
  {
    id: "fc-06",
    subject: "পদার্থবিজ্ঞান",
    topic: "আধুনিক পদার্থবিজ্ঞান",
    front: "ডি-ব্রগলি তরঙ্গদৈর্ঘ্য (de Broglie Wavelength) এর সমীকরণ কী?",
    back: "λ = h / p = h / (mv) = h / √(2mE_k)। যেখানে h হলো প্ল্যাঙ্কের ধ্রুবক এবং p হলো ভরবেগ।",
    importance: "high",
  },
  {
    id: "fc-07",
    subject: "রসায়ন",
    topic: "জৈব রসায়ন",
    front: "মার্কোভনিকভের নিয়ম (Markovnikov's Rule) কী?",
    back: "অপ্রতিসম অ্যালকিনে অপ্রতিসম বিকারক (যেমন HBr) যুক্ত হওয়ার সময় বিকারকের ঋণাত্মক অংশ কম হাইড্রোজেনযুক্ত দ্বিবন্ধন কার্বনে যুক্ত হয়।",
    importance: "high",
  },
  {
    id: "fc-08",
    subject: "উচ্চতর গণিত",
    topic: "ক্যালকুলাস শর্টকাট",
    front: "∫ e^(kx) [k f(x) + f'(x)] dx এর অনির্দিষ্ট যোগজ (Integral) কী?",
    back: "e^(kx) * f(x) + C। ভর্তি পরীক্ষায় এই শর্টকাট সরাসরি বহুল ব্যবহৃত হয়।",
    importance: "high",
  },
  {
    id: "fc-09",
    subject: "জীববিজ্ঞান",
    topic: "প্রাণিবিজ্ঞান",
    front: "মানব করোটিক স্নায়ু (Cranial Nerves) কয় জোড়া এবং ১০ম স্নায়ুর নাম কী?",
    back: "১২ জোড়া। ১০ম করোটিক স্নায়ু হলো 'ভেগাস' (Vagus), যা মিশ্র প্রকৃতির এবং হৃৎস্পন্দন নিয়ন্ত্রণ করে।",
    importance: "high",
  },
  {
    id: "fc-10",
    subject: "সাধারণ জ্ঞান",
    topic: "বাংলাদেশ ঐতিহ্য",
    front: "বাংলাদেশের ইউনেস্কো বিশ্ব ঐতিহ্যবাহী স্থান (UNESCO World Heritage Sites) কোনগুলো?",
    back: "১. সুন্দরবন (প্রাকৃতিক)\n২. পাহাড়পুরের বৌদ্ধ বিহার (সাংস্কৃতিক)\n৩. বাগেরহাটের ষাটগম্বুজ মসজিদ (সাংস্কৃতিক)।",
    importance: "high",
  },
];

export const OMR_BUBBLE_LETTERS = ["A", "B", "C", "D"] as const;

export function getAvailableSubjects(): string[] {
  const set = new Set<string>();
  for (const q of PRACTICE_QUESTIONS) {
    set.add(q.subject);
  }
  return Array.from(set).sort();
}

export function filterQuestionsBySubject(subject: string): PracticeQuestion[] {
  if (!subject || subject === "all") return PRACTICE_QUESTIONS;
  return PRACTICE_QUESTIONS.filter((q) => q.subject.toLowerCase().includes(subject.toLowerCase()));
}


// ---------------------------------------------------------------------------------------------
// Scoring & Attempt Calculation
// ---------------------------------------------------------------------------------------------
export function calculateExamScore(
  questions: PracticeQuestion[],
  userAnswers: Record<string, number>, // questionId -> selectedOptionIndex (0-3)
  trackInfo: ExamTrackInfo,
  timeTakenSeconds: number
): ExamAttempt {
  let correctCount = 0;
  let wrongCount = 0;
  let answeredCount = 0;

  const subjectBreakdown: Record<string, { correct: number; wrong: number; total: number }> = {};

  for (const q of questions) {
    if (!subjectBreakdown[q.subject]) {
      subjectBreakdown[q.subject] = { correct: 0, wrong: 0, total: 0 };
    }
    subjectBreakdown[q.subject].total += 1;

    const chosen = userAnswers[q.id];
    if (typeof chosen === "number") {
      answeredCount += 1;
      if (chosen === q.correctIndex) {
        correctCount += 1;
        subjectBreakdown[q.subject].correct += 1;
      } else {
        wrongCount += 1;
        subjectBreakdown[q.subject].wrong += 1;
      }
    }
  }

  const rawScore = correctCount * trackInfo.marksPerQuestion - wrongCount * trackInfo.negativeMark;
  const score = Math.round(Math.max(0, rawScore) * 100) / 100;
  const accuracyPercentage =
    answeredCount > 0 ? Math.round((correctCount / answeredCount) * 1000) / 10 : 0;

  return {
    id: `attempt-${Date.now()}`,
    trackId: trackInfo.id,
    date: new Date().toISOString().slice(0, 10),
    timeTakenSeconds,
    totalQuestions: questions.length,
    answeredCount,
    correctCount,
    wrongCount,
    score,
    accuracyPercentage,
    subjectBreakdown,
  };
}

export function getQuestionsForTrack(trackId: ExamTrackId): PracticeQuestion[] {
  return PRACTICE_QUESTIONS.filter((q) => q.trackId === trackId);
}

// ---------------------------------------------------------------------------------------------
// Sanitizers
// ---------------------------------------------------------------------------------------------
export function sanitizeExamAttempts(raw: unknown): ExamAttempt[] {
  if (!Array.isArray(raw)) return [];
  const out: ExamAttempt[] = [];

  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    if (
      typeof o.id !== "string" ||
      typeof o.trackId !== "string" ||
      typeof o.score !== "number" ||
      typeof o.totalQuestions !== "number"
    )
      continue;

    out.push({
      id: o.id.slice(0, 60),
      trackId: o.trackId as ExamTrackId,
      date: typeof o.date === "string" ? o.date.slice(0, 10) : "2026-11-18",
      timeTakenSeconds: Number(o.timeTakenSeconds) || 0,
      totalQuestions: Number(o.totalQuestions) || 0,
      answeredCount: Number(o.answeredCount) || 0,
      correctCount: Number(o.correctCount) || 0,
      wrongCount: Number(o.wrongCount) || 0,
      score: Number(o.score) || 0,
      accuracyPercentage: Number(o.accuracyPercentage) || 0,
      subjectBreakdown: (o.subjectBreakdown as ExamAttempt["subjectBreakdown"]) || {},
    });

    if (out.length >= 50) break;
  }

  return out;
}
