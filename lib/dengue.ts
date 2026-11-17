/*
 * Fever and dengue warning-sign watch (জ্বর ও ডেঙ্গু সতর্ক সংকেত). NO imports — pure and unit-tested
 * (tests/dengue.test.ts).
 *
 * Why: in dengue the danger often starts AFTER the fever goes down, and people who reach hospital late
 * are the ones who go into shock. This module does not diagnose dengue or anything else. It turns the WHO
 * warning-sign list into one fixed rule — any sign means "go to hospital now" — and keeps a dated
 * self-check log the family can show a doctor.
 *
 * Every sign and time window below comes from WHO (sources in DENGUE_SOURCES). Nothing here suggests a
 * medicine or a dose.
 */

export const DENGUE_CHECKED = "2026-11-17";

export const DENGUE_SOURCES = [
  { label: "WHO — Dengue and severe dengue (fact sheet)", url: "https://www.who.int/news-room/fact-sheets/detail/dengue-and-severe-dengue", checked: DENGUE_CHECKED },
  { label: "WHO — Dengue case management for primary and home-based care", url: "https://iris.who.int/server/api/core/bitstreams/5efa59c6-a79d-4b57-a1f4-35b5ea225601/content", checked: DENGUE_CHECKED },
  { label: "WHO — earlier dengue fact sheet (warning signs 3–7 days after first symptoms)", url: "http://www9.who.int/mediacentre/factsheets/fs117/en/", checked: DENGUE_CHECKED },
] as const;

export type WarningSignId =
  | "abdominal_pain" | "persistent_vomiting" | "rapid_breathing" | "bleeding" | "blood_vomit_stool"
  | "fatigue_restless" | "very_thirsty" | "pale_cold" | "weak" | "low_urine";

/** WHO's severe-dengue warning signs, in plain words. low_urine and the "3 times a day" detail come from
 * WHO's case-management guide; the rest are the fact-sheet list. */
export const WARNING_SIGNS: Array<{ id: WarningSignId; bn: string; en: string }> = [
  { id: "abdominal_pain", bn: "পেটে তীব্র ব্যথা", en: "Severe stomach pain" },
  { id: "persistent_vomiting", bn: "বারবার বমি (দিনে ৩ বারের বেশি)", en: "Vomiting that won't stop (more than 3 times a day)" },
  { id: "rapid_breathing", bn: "দ্রুত বা কষ্ট করে শ্বাস নেওয়া", en: "Fast or hard breathing" },
  { id: "bleeding", bn: "মাড়ি বা নাক থেকে রক্ত পড়া", en: "Bleeding gums or nose" },
  { id: "blood_vomit_stool", bn: "বমি বা পায়খানায় রক্ত (কালো পায়খানা)", en: "Blood in vomit or stool (black stool)" },
  { id: "fatigue_restless", bn: "খুব নিস্তেজ, ঝিমিয়ে পড়া বা অস্থির", en: "Very tired, drowsy or restless" },
  { id: "very_thirsty", bn: "খুব বেশি পিপাসা", en: "Very thirsty" },
  { id: "pale_cold", bn: "ত্বক ফ্যাকাশে ও হাত-পা ঠান্ডা", en: "Pale skin, cold hands and feet" },
  { id: "weak", bn: "খুব দুর্বল লাগা", en: "Feeling very weak" },
  { id: "low_urine", bn: "৪–৬ ঘণ্টা ধরে প্রস্রাব খুব কম", en: "Passing very little urine for 4–6 hours" },
];

const SIGN_IDS = new Set<string>(WARNING_SIGNS.map((s) => s.id));
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Calendar-valid YYYY-MM-DD (rejects 2026-02-30). */
export function isIsoDate(v: unknown): v is string {
  if (typeof v !== "string" || !ISO_DATE.test(v)) return false;
  const [y, m, d] = v.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1, d));
  return t.getUTCFullYear() === y && t.getUTCMonth() === m - 1 && t.getUTCDate() === d;
}

const dayNumber = (iso: string) => { const [y, m, d] = iso.split("-").map(Number); return Date.UTC(y, m - 1, d) / 86_400_000; };

/** Today's date in Bangladesh (UTC+6), whatever the device timezone. */
export function todayInBangladesh(now: Date = new Date()): string {
  return new Date(now.getTime() + 6 * 3_600_000).toISOString().slice(0, 10);
}

/** Day of fever, counting the start day as day 1. null when the start is missing, invalid or in the future. */
export function feverDay(start: string, today: string): number | null {
  if (!isIsoDate(start) || !isIsoDate(today)) return null;
  const diff = dayNumber(today) - dayNumber(start);
  return diff < 0 || diff > 60 ? null : diff + 1;
}

export type FeverLevel = "go_now" | "watch_closely" | "keep_watching";

export interface FeverInput {
  feverStart: string;
  today: string;
  feverGone: boolean;
  signs: string[];
}

export interface FeverAssessment {
  level: FeverLevel;
  day: number | null;
  signs: WarningSignId[];
  headlineBn: string;
  headlineEn: string;
  pointsBn: string[];
  pointsEn: string[];
}

export const NOT_A_TEST_BN = "এটি ডেঙ্গুর পরীক্ষা নয়, রোগও নির্ণয় করে না। সন্দেহ হলেই ডাক্তার দেখান।";
export const NOT_A_TEST_EN = "This is not a dengue test and does not diagnose anything. If in doubt, see a doctor.";

const bnNum = (n: number) => String(n).replace(/\d/g, (d) => "০১২৩৪৫৬৭৮৯"[Number(d)]);

/**
 * One fixed rule set (a design choice built on WHO guidance, not a risk score):
 * - any warning sign            -> go_now: hospital now, call 999 for an ambulance if needed
 * - fever day 3+ or fever gone  -> watch_closely: WHO says signs appear 3–7 days after the first symptoms,
 *                                  often as the fever falls, and a falling fever is not recovery
 * - otherwise                   -> keep_watching
 */
export function assessFever(input: FeverInput): FeverAssessment {
  const signs = [...new Set((input.signs ?? []).filter((s) => SIGN_IDS.has(s)))] as WarningSignId[];
  const day = feverDay(input.feverStart, input.today);
  const notTest = { bn: NOT_A_TEST_BN, en: NOT_A_TEST_EN };

  if (signs.length) {
    return {
      level: "go_now", day, signs,
      headlineBn: "এখনই হাসপাতালে যান",
      headlineEn: "Go to a hospital now",
      pointsBn: [
        "WHO-র তালিকার সতর্ক সংকেত দেখা যাচ্ছে। দেরি করবেন না — নিকটস্থ সরকারি হাসপাতালে যান।",
        "অ্যাম্বুলেন্স লাগলে ৯৯৯-এ ফোন করুন।",
        "রোগীকে একা ছাড়বেন না; সঙ্গে প্রেসক্রিপশন ও এই তালিকা নিন।",
        notTest.bn,
      ],
      pointsEn: [
        "A warning sign from WHO's list is present. Do not wait — go to the nearest government hospital.",
        "Call 999 if you need an ambulance.",
        "Do not leave the patient alone; take the prescription and this list.",
        notTest.en,
      ],
    };
  }

  if ((day !== null && day >= 3) || input.feverGone) {
    const why = input.feverGone
      ? { bn: "জ্বর কমে যাওয়া মানেই সেরে ওঠা নয় — ডেঙ্গুতে বিপদ প্রায়ই জ্বর কমার পরেই আসে।", en: "A falling fever is not recovery — in dengue the danger often comes after the fever goes down." }
      : { bn: `আজ জ্বরের ${bnNum(day as number)}তম দিন। প্রথম উপসর্গের ৩–৭ দিন পরে সতর্ক সংকেত দেখা দিতে পারে।`, en: `Today is day ${day} of the fever. Warning signs can appear 3–7 days after the first symptoms.` };
    return {
      level: "watch_closely", day, signs,
      headlineBn: "কড়া নজর রাখুন — আজই ডাক্তারের পরামর্শ নিন",
      headlineEn: "Watch closely — get a doctor's advice today",
      pointsBn: [why.bn, "স্বাস্থ্য বাতায়ন ১৬২৬৩-এ ২৪ ঘণ্টা ডাক্তারের পরামর্শ পাওয়া যায়।", "দিনে কয়েকবার এই তালিকা আবার দেখুন; একটি সংকেতও দেখা দিলে সঙ্গে সঙ্গে হাসপাতালে যান।", notTest.bn],
      pointsEn: [why.en, "Health call centre 16263 has doctors 24 hours a day.", "Check this list several times a day; if even one sign appears, go to hospital at once.", notTest.en],
    };
  }

  return {
    level: "keep_watching", day, signs,
    headlineBn: "এখন কোনো সতর্ক সংকেত বাছাই করা হয়নি",
    headlineEn: "No warning sign selected right now",
    pointsBn: ["এর মানে এই নয় যে রোগী নিরাপদ। জ্বর থাকলে ডাক্তারের পরামর্শ নিন (১৬২৬৩)।", "প্রতিদিন এই তালিকা দেখুন, বিশেষ করে জ্বর কমে যাওয়ার সময়।", notTest.bn],
    pointsEn: ["This does not mean the patient is safe. With a fever, get a doctor's advice (16263).", "Check this list every day, especially when the fever starts to go down.", notTest.en],
  };
}

// ---------------------------------------------------------------------------------------------
// Self-check log (stays on the device, mediscan namespace)
// ---------------------------------------------------------------------------------------------

export interface FeverCheck {
  date: string;
  time: string; // HH:MM, Bangladesh time
  day: number | null;
  feverGone: boolean;
  signs: WarningSignId[];
  level: FeverLevel;
}

export interface FeverWatch {
  feverStart: string;
  checks: FeverCheck[];
}

export const MAX_FEVER_CHECKS = 60;
const LEVELS = new Set<FeverLevel>(["go_now", "watch_closely", "keep_watching"]);

export function sanitizeFeverWatch(raw: unknown): FeverWatch | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const feverStart = isIsoDate(o.feverStart) ? o.feverStart : "";
  const checks: FeverCheck[] = [];
  for (const c of Array.isArray(o.checks) ? o.checks : []) {
    if (!c || typeof c !== "object") continue;
    const x = c as Record<string, unknown>;
    if (!isIsoDate(x.date) || typeof x.time !== "string" || !/^\d{2}:\d{2}$/.test(x.time) || !LEVELS.has(x.level as FeverLevel)) continue;
    const day = typeof x.day === "number" && Number.isInteger(x.day) && x.day >= 1 && x.day <= 61 ? x.day : null;
    const signs = Array.isArray(x.signs) ? [...new Set(x.signs.filter((s): s is WarningSignId => typeof s === "string" && SIGN_IDS.has(s)))] : [];
    checks.push({ date: x.date, time: x.time, day, feverGone: x.feverGone === true, signs, level: x.level as FeverLevel });
    if (checks.length >= MAX_FEVER_CHECKS) break;
  }
  return { feverStart, checks };
}

/** Plain-text summary for a doctor or the hospital desk. */
export function feverSummaryText(w: FeverWatch, lang: "bn" | "en" = "bn"): string {
  const bn = lang === "bn";
  const label = (id: WarningSignId) => { const s = WARNING_SIGNS.find((x) => x.id === id)!; return bn ? s.bn : s.en; };
  const lines = [
    bn ? "জ্বরের নিজস্ব নোট (পরিবারের লেখা, যাচাই করা নয়)" : "Fever self-check notes (written by the family, not verified)",
    `${bn ? "জ্বর শুরু" : "Fever started"}: ${w.feverStart || (bn ? "লেখা হয়নি" : "not entered")}`,
    "",
  ];
  for (const c of [...w.checks].sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))) {
    const dayTxt = c.day ? (bn ? `দিন ${c.day}` : `day ${c.day}`) : "";
    const gone = c.feverGone ? (bn ? "জ্বর কমেছে" : "fever down") : "";
    const signs = c.signs.length ? c.signs.map(label).join(", ") : (bn ? "কোনো সংকেত বাছাই হয়নি" : "no sign selected");
    lines.push(`${c.date} ${c.time} ${[dayTxt, gone].filter(Boolean).join(", ")} — ${signs}`);
  }
  lines.push("", bn ? NOT_A_TEST_BN : NOT_A_TEST_EN);
  return lines.join("\n");
}
