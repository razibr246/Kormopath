/**
 * Pure domain module for Customizable Dashboard:
 * - 12 companion apps
 * - 4 quick presets: "কৃষক ও পল্লী", "শিক্ষার্থী ও ভর্তি", "পেশাজীবী ও ফ্রিল্যান্সার", "সব অ্যাপ"
 * - Pure sanitization, reordering, and toggle functions
 *
 * Strict constraint: No external imports, no @/ imports, pure TypeScript.
 */

export interface DashboardApp {
  id: string;
  nameBn: string;
  nameEn: string;
  descBn: string;
  descEn?: string;
  href: string;
  icon: string;
  tagBn: string;
  tagEn?: string;
  category: "earn" | "life" | "farm" | "safety";
  stripe?: string;
  tone?: string;
  isPro?: boolean;
}

export const ALL_DASHBOARD_APPS: readonly DashboardApp[] = [
  {
    id: "admitbuddy",
    nameBn: "ভর্তি প্রস্তুতি (AdmitBuddy)",
    nameEn: "AdmitBuddy BD",
    descBn: "২৪+ বিশ্ববিদ্যালয়ের তথ্য, যোগ্যতা যাচাই ও মডেল টেস্ট",
    descEn: "24+ university shortlist, GPA criteria & admission planning",
    href: "/admitbuddy",
    icon: "🎓",
    tagBn: "ভর্তি ও ক্যাম্পাস",
    tagEn: "Admission & Campus",
    category: "life",
    stripe: "from-sky-500 to-indigo-500",
    tone: "ring-sky-500/20 bg-sky-50 text-sky-800",
  },
  {
    id: "mediscan",
    nameBn: "মেডিস্ক্যান বিডি (MediScan BD)",
    nameEn: "MediScan BD",
    descBn: "প্রেসক্রিপশন রিডার, ওষুধ যাচাই ও ডাক্তার কনসালটেশন",
    descEn: "Prescription reader, emergency hospital finder & doctor advice",
    href: "/mediscan",
    icon: "🩺",
    tagBn: "স্বাস্থ্য ও প্রেসক্রিপশন",
    tagEn: "Health & Clinics",
    category: "life",
    stripe: "from-emerald-500 to-teal-500",
    tone: "ring-emerald-500/20 bg-emerald-50 text-emerald-800",
  },
  {
    id: "shohoj",
    nameBn: "সহজ বাজেট (Shohoj Budget)",
    nameEn: "Shohoj Budget",
    descBn: "ক্যাশ-আউট ফি অপ্টিমাইজার, ধার/বাকি ও জাকাত হিসাব",
    descEn: "Household ledger: cash-out fees, dhar/baki, bazar & zakat",
    href: "/shohoj-budget",
    icon: "💰",
    tagBn: "সংসার ও বাজেট",
    tagEn: "Budget & Household",
    category: "life",
    stripe: "from-amber-500 to-orange-500",
    tone: "ring-amber-500/20 bg-amber-50 text-amber-900",
  },
  {
    id: "krishi",
    nameBn: "মাঠসাথী (MaathSathi)",
    nameEn: "MaathSathi Farm Book",
    descBn: "কৃষকের খামার খাতা, ফসল ক্যালেন্ডার ও বালাইনাশক সতর্কতা",
    descEn: "Farmer's digital book, crop calendar & livestock tracker",
    href: "/krishi",
    icon: "🌾",
    tagBn: "কৃষি ও খামার",
    tagEn: "Agriculture & Farm",
    category: "farm",
    stripe: "from-emerald-600 to-lime-600",
    tone: "ring-emerald-500/20 bg-emerald-50 text-emerald-800",
  },
  {
    id: "field",
    nameBn: "মাঠসাথী ফিল্ড (MaathSathi Field)",
    nameEn: "MaathSathi Field & Radar",
    descBn: "রোপণ রাডার, স্যাটেলাইট মনিটরিং ও মাঠ জরিপ",
    descEn: "Ropon Radar, satellite irrigation & field weather",
    href: "/krishi/field#/farmer",
    icon: "🛰️",
    tagBn: "স্যাটেলাইট ও রাডার",
    tagEn: "Satellite & Radar",
    category: "farm",
    stripe: "from-teal-600 to-emerald-600",
    tone: "ring-teal-500/20 bg-teal-50 text-teal-800",
  },
  {
    id: "haatbazar",
    nameBn: "হাটবাজার এআই (HaatBazar AI)",
    nameEn: "HaatBazar AI",
    descBn: "কৃষি বিপণন অধিদপ্তরের পাইকারি ও খুচরা দরদাম যাচাই",
    descEn: "Government mandi wholesale vs retail crop market margin",
    href: "/haatbazar",
    icon: "⚖️",
    tagBn: "বাজারদর",
    tagEn: "Market Prices",
    category: "farm",
    stripe: "from-orange-500 to-amber-500",
    tone: "ring-orange-500/20 bg-orange-50 text-orange-900",
  },
  {
    id: "rokkha",
    nameBn: "রক্ষা (Rokkha Defense)",
    nameEn: "Rokkha Scam Guard",
    descBn: "স্ক্যাম ও ভুয়া লিংক ডিটেক্টর, ফ্যামিলি গার্ডিয়ান ও হেল্পলাইন",
    descEn: "Scam & fraudulent link checker, emergency pause & helplines",
    href: "/rokkha",
    icon: "🛡️",
    tagBn: "সুরক্ষা",
    tagEn: "Safety & Fraud",
    category: "safety",
    stripe: "from-rose-500 to-red-600",
    tone: "ring-rose-500/20 bg-rose-50 text-rose-800",
  },
  {
    id: "legal",
    nameBn: "আইনি সহায়তা (Digital Legal Aid)",
    nameEn: "Digital Legal Aid",
    descBn: "আইনি পরামর্শ, ১৬৬৯৯/১৬১২২ হেল্পলাইন ও মধ্যস্থতা মূল্যায়ন",
    descEn: "Government legal aid eligibility, application drafts & 16699",
    href: "/legal",
    icon: "⚖️",
    tagBn: "আইন ও সালিশ",
    tagEn: "Legal & Justice",
    category: "safety",
    stripe: "from-indigo-500 to-purple-600",
    tone: "ring-indigo-500/20 bg-indigo-50 text-indigo-800",
  },
  {
    id: "probaho",
    nameBn: "প্রবাহ কোচ (Probaho Coach)",
    nameEn: "Probaho Coach",
    descBn: "ইংরেজি কথা বলার জড়তা কাটানো ও ক্লায়েন্ট ইন্টারভিউ কোচিং",
    descEn: "Spoken viva and job interview practice with transparent feedback",
    href: "/probaho",
    icon: "🎙️",
    tagBn: "দক্ষতা",
    tagEn: "Communication & Viva",
    category: "earn",
    stripe: "from-purple-500 to-pink-500",
    tone: "ring-purple-500/20 bg-purple-50 text-purple-800",
  },
  {
    id: "feeguard",
    nameBn: "ফি গার্ড বিডি (FeeGuard BD)",
    nameEn: "FeeGuard BD",
    descBn: "আন্তর্জাতিক রেমিট্যান্স ও ফ্রিল্যান্সার পেআউট ফি অপ্টিমাইজার",
    descEn: "Freelance payout & remittance fee breakdown with 2.5% incentive",
    href: "/feeguard",
    icon: "💳",
    tagBn: "টাকা ও ফি",
    tagEn: "Payout & FX Fees",
    category: "earn",
    stripe: "from-blue-500 to-cyan-500",
    tone: "ring-blue-500/20 bg-blue-50 text-blue-800",
  },
  {
    id: "chuktiguard",
    nameBn: "চুক্তি গার্ড (ChuktiGuard)",
    nameEn: "ChuktiGuard",
    descBn: "ফ্রিল্যান্সার ও ব্যবসায়িক দ্বিভাষিক চুক্তি ও ধারা বিশ্লেষণ",
    descEn: "Bilingual freelance contracts, milestone invoices & reviewed clauses",
    href: "/chuktiguard",
    icon: "📜",
    tagBn: "আইনি চুক্তি",
    tagEn: "Contracts & Invoices",
    category: "earn",
    stripe: "from-emerald-500 to-teal-500",
    tone: "ring-emerald-500/20 bg-emerald-50 text-emerald-800",
  },
  {
    id: "workspace",
    nameBn: "কর্মপথ ওয়ার্কস্পেস (Workspace)",
    nameEn: "KormoPath Workspace",
    descBn: "সিভি অডিট, স্কিল পাসপোর্ট, চুক্তি সম্পাদন ও পেমেন্ট রিসিট",
    descEn: "4-stage pipeline: CV audit, examiner challenge, contract & payout",
    href: "/workspace",
    icon: "💼",
    tagBn: "ক্যারিয়ার",
    tagEn: "Career & Pipeline",
    category: "earn",
    stripe: "from-orange-600 to-red-600",
    tone: "ring-orange-500/20 bg-orange-50 text-orange-900",
  },
];

export const DASHBOARD_PRESETS: Record<
  string,
  { id: string; labelBn: string; labelEn: string; appIds: string[] }
> = {
  rural: {
    id: "rural",
    labelBn: "কৃষক ও পল্লী",
    labelEn: "Farmer & Rural",
    appIds: ["krishi", "field", "haatbazar", "rokkha"],
  },
  student: {
    id: "student",
    labelBn: "শিক্ষার্থী ও ভর্তি",
    labelEn: "Student & Admission",
    appIds: ["admitbuddy", "probaho", "shohoj", "rokkha"],
  },
  freelancer: {
    id: "freelancer",
    labelBn: "পেশাজীবী ও ফ্রিল্যান্সার",
    labelEn: "Professional & Freelancer",
    appIds: ["workspace", "feeguard", "chuktiguard", "shohoj", "rokkha"],
  },
  all: {
    id: "all",
    labelBn: "সব অ্যাপ",
    labelEn: "All Apps",
    appIds: ALL_DASHBOARD_APPS.map((a) => a.id),
  },
};

export const DEFAULT_PINNED_APPS: string[] = ALL_DASHBOARD_APPS.map((a) => a.id);

const VALID_APP_IDS = new Set<string>(ALL_DASHBOARD_APPS.map((a) => a.id));

/**
 * Sanitizes untrusted client storage data into a valid list of pinned app IDs.
 */
export function sanitizePinnedApps(raw: unknown): string[] {
  if (!Array.isArray(raw)) {
    return [...DEFAULT_PINNED_APPS];
  }
  const seen = new Set<string>();
  const validList: string[] = [];
  for (const item of raw) {
    if (typeof item === "string" && VALID_APP_IDS.has(item) && !seen.has(item)) {
      seen.add(item);
      validList.push(item);
    }
  }
  return validList.length > 0 ? validList : [...DEFAULT_PINNED_APPS];
}

/**
 * Reorders pinned apps by moving an item from fromIndex to toIndex.
 */
export function reorderPinnedApps(current: string[], fromIndex: number, toIndex: number): string[] {
  if (
    !Array.isArray(current) ||
    fromIndex < 0 ||
    fromIndex >= current.length ||
    toIndex < 0 ||
    toIndex >= current.length ||
    fromIndex === toIndex
  ) {
    return [...(current || [])];
  }

  const result = [...current];
  const [removed] = result.splice(fromIndex, 1);
  result.splice(toIndex, 0, removed);
  return result;
}

/**
 * Toggles an app ID in the pinned list.
 * Ensures at least one app remains pinned.
 */
export function togglePinnedApp(current: string[], appId: string): string[] {
  if (!VALID_APP_IDS.has(appId)) {
    return [...current];
  }

  if (current.includes(appId)) {
    if (current.length <= 1) {
      return [...current]; // Keep at least one pinned
    }
    return current.filter((id) => id !== appId);
  }

  return [...current, appId];
}
