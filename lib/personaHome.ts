/**
 * What the signed-in home shows each demo profile first. Pure data, no imports (unit-tested in
 * tests/persona-home.test.ts).
 *
 * The pattern follows large web platforms: a signed-out visitor sees the public landing page; a signed-in person sees
 * their own home, with their apps first, quick tasks for their day, and their plan. The profiles are fictional demos
 * (lib/session.ts): nothing here is a real person's data, and no number, price or result is invented here. Safety
 * tools (emergency, scam check, legal aid) stay on every home and are always free.
 */

export type PersonaHomeId = "rahim_uddin" | "lamia_akter" | "najeeb_ahmed";

export type QuickTask = { href: string; bn: string; en: string };

export type PersonaHome = {
  /** One line on what this home is arranged for. */
  focusBn: string;
  focusEn: string;
  /** App ids in the order this person reaches for them (ids from the home page's TOOLS, plus "workspace"). */
  apps: string[];
  quick: QuickTask[];
};

/** Safety tools pinned on every signed-in home. Always free (ALWAYS_FREE_APPS / SAFETY_FEATURES in lib/session.ts). */
export const SAFETY_LINKS: QuickTask[] = [
  { href: "/mediscan/emergency", bn: "কাছের জরুরি হাসপাতাল", en: "Nearest emergency hospital" },
  { href: "/rokkha#check", bn: "এসএমএস প্রতারণা যাচাই", en: "Check an SMS for scams" },
  { href: "/legal", bn: "বিনামূল্যে আইনি সহায়তা", en: "Free legal aid" },
];

export const PERSONA_HOME: Record<PersonaHomeId, PersonaHome> = {
  rahim_uddin: {
    focusBn: "মাঠ, হাট আর সংসারের হিসাব আগে",
    focusEn: "Field, market and household money first",
    apps: ["krishi", "haatbazar", "shohoj", "rokkha", "legal", "mediscan", "path", "feeguard", "chuktiguard", "admitbuddy", "probaho", "workspace"],
    quick: [
      { href: "/krishi/field#/farmer", bn: "আজ জমিতে সেচ লাগবে কি না", en: "Does my field need water today" },
      { href: "/haatbazar", bn: "হাটে বেচব না আড়তে", en: "Sell at the market or wholesale" },
      { href: "/krishi", bn: "খামারের খাতায় কাজ লিখব", en: "Add a task to the farm book" },
      { href: "/shohoj-budget#dhar", bn: "দেনা-পাওনা লিখব", en: "Note money lent or owed" },
    ],
  },
  lamia_akter: {
    focusBn: "স্বাস্থ্যসেবা আর পড়াশোনা আগে",
    focusEn: "Health care and study first",
    apps: ["mediscan", "admitbuddy", "probaho", "shohoj", "rokkha", "legal", "path", "feeguard", "chuktiguard", "haatbazar", "krishi", "workspace"],
    quick: [
      { href: "/mediscan/doctors", bn: "ডাক্তার খুঁজব", en: "Find a doctor" },
      { href: "/mediscan/assistant", bn: "কোন ডাক্তার দেখাব জানব", en: "Which doctor should I see" },
      { href: "/mediscan#dengue", bn: "জ্বর ও ডেঙ্গুর বিপদ সংকেত", en: "Fever and dengue danger signs" },
      { href: "/admitbuddy", bn: "ভর্তির পরিকল্পনা", en: "Plan admission" },
    ],
  },
  najeeb_ahmed: {
    focusBn: "দক্ষতা, ক্লায়েন্ট আর পেআউট আগে",
    focusEn: "Skills, clients and payouts first",
    apps: ["workspace", "chuktiguard", "feeguard", "path", "probaho", "shohoj", "mediscan", "admitbuddy", "rokkha", "legal", "haatbazar", "krishi"],
    quick: [
      { href: "/workspace", bn: "সিভি থেকে স্কিল পাসপোর্ট", en: "CV to skill passport" },
      { href: "/feeguard", bn: "পেআউটে কত ফি কাটবে", en: "What my payout will cost" },
      { href: "/chuktiguard", bn: "ক্লায়েন্টের চুক্তি ও ইনভয়েস", en: "Client contract and invoice" },
      { href: "/shohoj-budget#zakat", bn: "যাকাত হিসাব", en: "Calculate zakat" },
    ],
  },
};

/** The home for a signed-in profile, or null for a guest or an unknown id (they see the public page). */
export function personaHome(personaId: string | null | undefined): PersonaHome | null {
  if (!personaId || !Object.prototype.hasOwnProperty.call(PERSONA_HOME, personaId)) return null;
  return PERSONA_HOME[personaId as PersonaHomeId];
}

/** Greeting by the hour in Asia/Dhaka (0–23). */
export function greetingFor(hour: number): { bn: string; en: string } {
  if (hour >= 5 && hour < 12) return { bn: "শুভ সকাল", en: "Good morning" };
  if (hour >= 12 && hour < 17) return { bn: "শুভ দুপুর", en: "Good afternoon" };
  if (hour >= 17 && hour < 21) return { bn: "শুভ সন্ধ্যা", en: "Good evening" };
  return { bn: "স্বাগতম", en: "Welcome back" };
}

/** Plain names for each paid feature id in PAID_FEATURES (lib/session.ts); a test keeps the two in step. */
export const PAID_FEATURE_LABELS: Record<string, { bn: string; en: string }> = {
  "admitbuddy:practice_exams": { bn: "অনুশীলন পরীক্ষা", en: "Practice exams" },
  "admitbuddy:model_tests": { bn: "মডেল টেস্ট", en: "Model tests" },
  "admitbuddy:ai_counselor_unlimited": { bn: "সীমাহীন এআই কাউন্সেলর", en: "Unlimited AI counsellor" },
  "mediscan:doctor_booking": { bn: "ডাক্তারের সিরিয়াল বুকিং", en: "Doctor booking" },
  "mediscan:tele_consult": { bn: "ভিডিও পরামর্শ", en: "Video consultation" },
  "probaho:unlimited_coaching": { bn: "সীমাহীন কোচিং", en: "Unlimited coaching" },
  "workspace:pdf_export": { bn: "পিডিএফ রপ্তানি", en: "PDF export" },
};
