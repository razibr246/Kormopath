/*
 * Doctor directory for MediScan (pure, no imports; tests/health-booking.test.ts).
 *
 * Only fictional DEMO profiles ship with the app. A demo doctor can never become bookable for real money: real
 * booking needs a profile an admin added as a real doctor, with a BMDC registration number checked on the council's
 * own site and the date it was checked (see isRealBookable). Nothing here is a real doctor, BMDC number, review or
 * experience figure.
 */

export type ConsultType = "audio" | "video" | "inperson";
export type Availability = "online" | "today" | "busy" | "offline";

export interface Specialty { id: string; bn: string; en: string }

export const SPECIALTIES: readonly Specialty[] = [
  { id: "medicine", bn: "মেডিসিন", en: "Medicine" },
  { id: "orthopaedics", bn: "অর্থোপেডিক্স (হাড় ও জোড়া)", en: "Orthopaedics" },
  { id: "gynaecology", bn: "গাইনি ও প্রসূতি", en: "Gynaecology & obstetrics" },
  { id: "cardiology", bn: "হৃদরোগ (কার্ডিওলজি)", en: "Cardiology" },
  { id: "paediatrics", bn: "শিশু রোগ", en: "Paediatrics" },
];
export const specialtyById = (id: string) => SPECIALTIES.find((s) => s.id === id);

export interface Doctor {
  id: string;
  nameEn: string;
  nameBn: string;
  initials: string;
  qualifications: string; // as the doctor states them; demo values are fictional
  specialtyId: string;
  designationBn: string;
  designationEn: string;
  hospitalBn: string;
  hospitalEn: string;
  languages: string[]; // "bn" | "en" | …
  feePoisha: number;
  followUpFeePoisha: number;
  days: number[]; // 0 = Sunday … 6 = Saturday
  slots: string[]; // "HH:MM", Asia/Dhaka
  types: ConsultType[];
  availability: Availability;
  demo: boolean;
  verified: boolean; // BMDC registration checked by an admin
  bmdcNo: string | null;
  bmdcCheckedOn: string | null; // YYYY-MM-DD
  consultPhone: string | null; // only for verified real doctors
  suspended: boolean;
}

const demoDoctor = (d: Omit<Doctor, "demo" | "verified" | "bmdcNo" | "bmdcCheckedOn" | "consultPhone" | "suspended" | "hospitalBn" | "hospitalEn">): Doctor => ({
  ...d,
  hospitalBn: "ডেমো হাসপাতাল (কাল্পনিক)",
  hospitalEn: "Demo hospital (fictional)",
  demo: true,
  verified: false,
  bmdcNo: null,
  bmdcCheckedOn: null,
  consultPhone: null,
  suspended: false,
});

const tk = (taka: number) => taka * 100; // taka → integer poisha

/** Fictional demo profiles (the names the project owner asked for). Fees are demo values. */
export const DEMO_DOCTORS: readonly Doctor[] = [
  demoDoctor({ id: "demo-ahmed", nameEn: "Dr. Sample Ahmed", nameBn: "ডা. স্যাম্পল আহমেদ", initials: "SA", qualifications: "MBBS, FCPS (Medicine)", specialtyId: "medicine", designationBn: "মেডিসিন বিশেষজ্ঞ", designationEn: "Medicine Specialist", languages: ["bn", "en"], feePoisha: tk(500), followUpFeePoisha: tk(300), days: [0, 1, 2, 3, 4], slots: ["10:00", "10:30", "11:00", "19:00", "19:30"], types: ["audio", "video", "inperson"], availability: "online" }),
  demoDoctor({ id: "demo-rahman", nameEn: "Dr. Sample Rahman", nameBn: "ডা. স্যাম্পল রহমান", initials: "SR", qualifications: "MBBS, MS (Orthopaedics)", specialtyId: "orthopaedics", designationBn: "অর্থোপেডিক বিশেষজ্ঞ", designationEn: "Orthopaedic Specialist", languages: ["bn", "en"], feePoisha: tk(700), followUpFeePoisha: tk(400), days: [0, 2, 4], slots: ["16:00", "16:30", "17:00", "17:30"], types: ["video", "inperson"], availability: "today" }),
  demoDoctor({ id: "demo-karim", nameEn: "Dr. Sample Karim", nameBn: "ডা. স্যাম্পল করিম", initials: "SK", qualifications: "MBBS, FCPS (Gynaecology)", specialtyId: "gynaecology", designationBn: "গাইনি বিশেষজ্ঞ", designationEn: "Gynaecologist", languages: ["bn"], feePoisha: tk(600), followUpFeePoisha: tk(350), days: [1, 3, 6], slots: ["11:00", "11:30", "12:00", "20:00"], types: ["audio", "video", "inperson"], availability: "busy" }),
  demoDoctor({ id: "demo-khan", nameEn: "Dr. Sample Khan", nameBn: "ডা. স্যাম্পল খান", initials: "KH", qualifications: "MBBS, MD (Cardiology)", specialtyId: "cardiology", designationBn: "হৃদরোগ বিশেষজ্ঞ", designationEn: "Cardiologist", languages: ["bn", "en"], feePoisha: tk(800), followUpFeePoisha: tk(500), days: [0, 1, 3], slots: ["18:00", "18:30", "19:00"], types: ["audio", "video"], availability: "offline" }),
  demoDoctor({ id: "demo-akter", nameEn: "Dr. Sample Akter", nameBn: "ডা. স্যাম্পল আক্তার", initials: "AK", qualifications: "MBBS, FCPS (Paediatrics)", specialtyId: "paediatrics", designationBn: "শিশু রোগ বিশেষজ্ঞ", designationEn: "Child Specialist", languages: ["bn", "en"], feePoisha: tk(500), followUpFeePoisha: tk(300), days: [0, 1, 2, 3, 4, 6], slots: ["09:30", "10:00", "15:00", "15:30"], types: ["audio", "video", "inperson"], availability: "online" }),
];

/** Bookable for real money: a real (non-demo) profile, BMDC-checked with a date, not suspended. */
export const isRealBookable = (d: Doctor): boolean =>
  !d.demo && d.verified && !!d.bmdcNo && !!d.bmdcCheckedOn && !d.suspended;

// --- admin overrides (device only) -------------------------------------------------------------

export interface DoctorOverride {
  verified?: boolean;
  bmdcNo?: string | null;
  bmdcCheckedOn?: string | null;
  consultPhone?: string | null;
  suspended?: boolean;
  feePoisha?: number;
  followUpFeePoisha?: number;
}

/** Apply admin changes. A demo doctor's "verified" flag only ever shows a demo badge; it never makes it real. */
export function withOverrides(list: readonly Doctor[], overrides: Record<string, DoctorOverride>): Doctor[] {
  return list.map((d) => {
    const o = overrides[d.id];
    if (!o) return { ...d };
    return {
      ...d,
      ...o,
      demo: d.demo,
      feePoisha: validFee(o.feePoisha) ? (o.feePoisha as number) : d.feePoisha,
      followUpFeePoisha: validFee(o.followUpFeePoisha) ? (o.followUpFeePoisha as number) : d.followUpFeePoisha,
      verified: o.verified ?? d.verified,
      bmdcNo: o.bmdcNo ?? d.bmdcNo,
      bmdcCheckedOn: o.bmdcCheckedOn ?? d.bmdcCheckedOn,
      consultPhone: d.demo ? null : (o.consultPhone ?? d.consultPhone),
      suspended: o.suspended ?? d.suspended,
    };
  });
}

const validFee = (v: unknown): boolean => typeof v === "number" && Number.isInteger(v) && v >= 0 && v <= 100_000_00;

/** BD mobile in 01XXXXXXXXX form, or null. */
export function normalizeBdMobile(raw: string): string | null {
  const d = String(raw ?? "").replace(/[০-৯]/g, (c) => String("০১২৩৪৫৬৭৮৯".indexOf(c))).replace(/[^\d]/g, "");
  const local = d.startsWith("880") ? "0" + d.slice(3) : d;
  return /^01[3-9]\d{8}$/.test(local) ? local : null;
}

/** BMDC registration numbers are entered as printed on the certificate (e.g. "A-12345"); only shape is checked. */
export const isPlausibleBmdc = (s: string): boolean => /^[A-Za-z]{0,3}-?\s?\d{2,7}$/.test(String(s ?? "").trim());

// --- search -------------------------------------------------------------------------------------

export interface DoctorFilter {
  q?: string;
  specialtyId?: string;
  maxFeePoisha?: number | null;
  availability?: Availability | "any";
  language?: string | "any";
  hospital?: string;
  type?: ConsultType | "any";
}

export function filterDoctors(list: readonly Doctor[], f: DoctorFilter): Doctor[] {
  const q = (f.q ?? "").trim().toLowerCase();
  const hosp = (f.hospital ?? "").trim().toLowerCase();
  return list.filter((d) => {
    if (d.suspended) return false;
    if (q && ![d.nameEn, d.nameBn, d.designationBn, d.designationEn, d.qualifications].some((s) => s.toLowerCase().includes(q))) return false;
    if (f.specialtyId && f.specialtyId !== "any" && d.specialtyId !== f.specialtyId) return false;
    if (typeof f.maxFeePoisha === "number" && d.feePoisha > f.maxFeePoisha) return false;
    if (f.availability && f.availability !== "any" && d.availability !== f.availability) return false;
    if (f.language && f.language !== "any" && !d.languages.includes(f.language)) return false;
    if (hosp && !`${d.hospitalBn} ${d.hospitalEn}`.toLowerCase().includes(hosp)) return false;
    if (f.type && f.type !== "any" && !d.types.includes(f.type)) return false;
    return true;
  });
}

// --- slots --------------------------------------------------------------------------------------

export interface Slot { date: string; time: string; key: string }

const pad = (n: number) => String(n).padStart(2, "0");
const isoOf = (t: number) => { const d = new Date(t); return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`; };

/** Dhaka (UTC+6) "now" as { date, time }. */
export function dhakaNow(now: Date = new Date()): { date: string; time: string } {
  const t = new Date(now.getTime() + 6 * 3_600_000);
  return { date: isoOf(t.getTime()), time: `${pad(t.getUTCHours())}:${pad(t.getUTCMinutes())}` };
}

/** Upcoming slots over the next `days` days in Dhaka time, skipping slots already past. */
export function upcomingSlots(d: Doctor, now: Date = new Date(), days = 7): Slot[] {
  const today = dhakaNow(now);
  const [y, m, dd] = today.date.split("-").map(Number);
  const out: Slot[] = [];
  for (let i = 0; i < days; i++) {
    const t = Date.UTC(y, m - 1, dd + i);
    const wd = new Date(t).getUTCDay();
    if (!d.days.includes(wd)) continue;
    const date = isoOf(t);
    for (const time of d.slots) {
      if (date === today.date && time <= today.time) continue;
      out.push({ date, time, key: `${date} ${time}` });
    }
  }
  return out;
}

export const AVAILABILITY_LABEL: Record<Availability, { bn: string; en: string; tone: string }> = {
  online: { bn: "অনলাইনে আছেন", en: "Online", tone: "emerald" },
  today: { bn: "আজ পাওয়া যাবে", en: "Available today", tone: "sky" },
  busy: { bn: "ব্যস্ত", en: "Busy", tone: "amber" },
  offline: { bn: "অফলাইন", en: "Offline", tone: "slate" },
};

export const TYPE_LABEL: Record<ConsultType, { bn: string; en: string }> = {
  audio: { bn: "অডিও কল", en: "Audio call" },
  video: { bn: "ভিডিও কল", en: "Video call" },
  inperson: { bn: "সরাসরি চেম্বারে", en: "In person" },
};

/** A real doctor profile entered by an admin on this device (sanitised). */
export function sanitizeDoctor(raw: unknown): Doctor | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const str = (v: unknown, n: number) => (typeof v === "string" ? v.slice(0, n) : "");
  const id = str(o.id, 60);
  if (!id || !str(o.nameEn, 80)) return null;
  const types = Array.isArray(o.types) ? o.types.filter((t): t is ConsultType => t === "audio" || t === "video" || t === "inperson") : [];
  const days = Array.isArray(o.days) ? o.days.filter((n): n is number => Number.isInteger(n) && (n as number) >= 0 && (n as number) <= 6) : [];
  const slots = Array.isArray(o.slots) ? o.slots.filter((s): s is string => typeof s === "string" && /^\d{2}:\d{2}$/.test(s)).slice(0, 24) : [];
  const avail = ["online", "today", "busy", "offline"].includes(o.availability as string) ? (o.availability as Availability) : "offline";
  return {
    id, nameEn: str(o.nameEn, 80), nameBn: str(o.nameBn, 80) || str(o.nameEn, 80), initials: str(o.initials, 3) || str(o.nameEn, 80).split(/\s+/).map((w) => w[0] ?? "").join("").slice(0, 2).toUpperCase(),
    qualifications: str(o.qualifications, 120), specialtyId: specialtyById(str(o.specialtyId, 40)) ? str(o.specialtyId, 40) : "medicine",
    designationBn: str(o.designationBn, 80), designationEn: str(o.designationEn, 80), hospitalBn: str(o.hospitalBn, 120), hospitalEn: str(o.hospitalEn, 120),
    languages: Array.isArray(o.languages) ? o.languages.filter((l): l is string => typeof l === "string").slice(0, 5) : ["bn"],
    feePoisha: validFee(o.feePoisha) ? (o.feePoisha as number) : 0, followUpFeePoisha: validFee(o.followUpFeePoisha) ? (o.followUpFeePoisha as number) : 0,
    days, slots, types: types.length ? types : ["audio"], availability: avail,
    demo: false, verified: o.verified === true, bmdcNo: str(o.bmdcNo, 20) || null, bmdcCheckedOn: /^\d{4}-\d{2}-\d{2}$/.test(str(o.bmdcCheckedOn, 10)) ? str(o.bmdcCheckedOn, 10) : null,
    consultPhone: normalizeBdMobile(str(o.consultPhone, 20)), suspended: o.suspended === true,
  };
}
