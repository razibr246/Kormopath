/*
 * MediScan services directory (/mediscan/services). Pure, no imports.
 * Every entry was opened on its own page on 2026-11-18. Only official government pages are "official"; a long-running
 * volunteer organisation is "reported". Entries we could not verify were left out (not guessed): no private
 * ambulance companies, no diagnostic-centre directory, and no mental-health line (the helpline whose number appears in
 * directories had a compromised website on the check date).
 */

export const SERVICES_CHECKED = "2026-11-18";

export type ServiceGroup = "emergency" | "advice" | "hospitals" | "blood" | "vaccines" | "medicines";
export type ServiceConfidence = "official" | "reported";

export interface HealthService {
  id: string;
  group: ServiceGroup;
  bn: string;
  en: string;
  whatBn: string;
  whatEn: string;
  phone?: string; // ASCII digits, dialable
  url?: string;
  source: { label: string; url: string; checked: string };
  confidence: ServiceConfidence;
}

const s = (label: string, url: string) => ({ label, url, checked: SERVICES_CHECKED });

export const SERVICE_GROUPS: ReadonlyArray<{ id: ServiceGroup; bn: string; en: string }> = [
  { id: "emergency", bn: "জরুরি ও অ্যাম্বুলেন্স", en: "Emergency & ambulance" },
  { id: "advice", bn: "ডাক্তারের পরামর্শ", en: "Doctor advice" },
  { id: "hospitals", bn: "সরকারি হাসপাতাল ও ক্লিনিক", en: "Government hospitals & clinics" },
  { id: "blood", bn: "রক্তদান", en: "Blood donation" },
  { id: "vaccines", bn: "টিকা", en: "Vaccination" },
  { id: "medicines", bn: "ওষুধ ও ফার্মেসি", en: "Medicines & pharmacies" },
];

export const HEALTH_SERVICES: readonly HealthService[] = [
  {
    id: "999", group: "emergency", phone: "999", confidence: "official",
    bn: "জাতীয় জরুরি সেবা ৯৯৯", en: "National emergency service 999",
    whatBn: "অ্যাম্বুলেন্স, পুলিশ বা ফায়ার সার্ভিস — এখনই বিপদ হলে প্রথমে এখানে ফোন করুন। নিবন্ধন বা টাকা লাগে না।",
    whatEn: "Ambulance, police or fire service — call here first in any emergency. No registration or payment.",
    source: { label: "বাংলাদেশ জাতীয় তথ্য বাতায়ন — জরুরি সেবা নম্বরসমূহ (৯৯৯)", url: "https://bangladesh.gov.bd", checked: "2026-11-19" },
  },
  {
    id: "16263-ambulance", group: "emergency", phone: "16263", url: "https://16263.dghs.gov.bd/", confidence: "official",
    bn: "স্বাস্থ্য বাতায়ন — অ্যাম্বুলেন্স ও হাসপাতালের খোঁজ", en: "Shastho Batayon — ambulance and hospital information",
    whatBn: "সরকারি হাসপাতাল, ডাক্তার ও অ্যাম্বুলেন্সের তথ্য ও ফোন নম্বর দেয়; দিনরাত ২৪ ঘণ্টা।",
    whatEn: "Gives information and phone numbers for government hospitals, doctors and ambulances; 24 hours a day.",
    source: s("স্বাস্থ্য বাতায়ন ১৬২৬৩ — স্বাস্থ্য অধিদপ্তর", "https://16263.dghs.gov.bd/"),
  },
  {
    id: "16263", group: "advice", phone: "16263", url: "https://16263.dghs.gov.bd/", confidence: "official",
    bn: "স্বাস্থ্য বাতায়ন ১৬২৬৩ — ডাক্তারের পরামর্শ", en: "Shastho Batayon 16263 — talk to a doctor",
    whatBn: "সরকারি এই হেল্পলাইনে ফোন করে সরাসরি ডাক্তারের পরামর্শ নেওয়া যায়, ২৪ ঘণ্টা। স্বাস্থ্যসেবা নিয়ে অভিযোগও জানানো যায়। সাধারণ কলের বিলের বেশি লাগে না।",
    whatEn: "Call this government helpline to talk directly to a doctor, 24 hours a day. You can also report complaints about health services. Costs no more than a normal call.",
    source: s("স্বাস্থ্য বাতায়ন ১৬২৬৩ — স্বাস্থ্য অধিদপ্তর", "https://16263.dghs.gov.bd/"),
  },
  {
    id: "dghs-hospitals", group: "hospitals", url: "https://hospitaldghs.gov.bd/", confidence: "official",
    bn: "স্বাস্থ্য অধিদপ্তর — হাসপাতাল ও ক্লিনিক শাখা", en: "DGHS — Hospital & Clinic section",
    whatBn: "সরকারি হাসপাতাল ও ক্লিনিক বিষয়ক স্বাস্থ্য অধিদপ্তরের শাখার ওয়েবসাইট।",
    whatEn: "The Directorate General of Health Services' website for hospitals and clinics.",
    source: s("Hospital & Clinic Section — DGHS", "https://hospitaldghs.gov.bd/"),
  },
  {
    id: "dghs", group: "hospitals", url: "https://dghs.gov.bd/", confidence: "official",
    bn: "স্বাস্থ্য অধিদপ্তর", en: "Directorate General of Health Services (DGHS)",
    whatBn: "সরকারি স্বাস্থ্যসেবার নোটিশ, হাসপাতাল ও কর্মসূচির তথ্য।",
    whatEn: "Notices, hospitals and programmes of the government health service.",
    source: s("স্বাস্থ্য অধিদপ্তর (dghs.gov.bd)", "https://dghs.gov.bd/"),
  },
  {
    id: "badhan", group: "blood", url: "https://badhan.org/", confidence: "reported",
    bn: "বাঁধন — স্বেচ্ছায় রক্তদাতাদের সংগঠন", en: "Badhan — voluntary blood donors' organisation",
    whatBn: "শিক্ষার্থীদের স্বেচ্ছাসেবী রক্তদান সংগঠন। রক্ত নেওয়ার আগে হাসপাতালে রক্তের গ্রুপ মিলিয়ে নিন।",
    whatEn: "A student volunteer blood-donation organisation. Have the hospital match the blood group before a transfusion.",
    source: s("Badhan (badhan.org)", "https://badhan.org/"),
  },
  {
    id: "vaxepi", group: "vaccines", url: "https://vaxepi.gov.bd/", confidence: "official",
    bn: "ভ্যাক্সইপিআই — টিকার নিবন্ধন ও সনদ", en: "VaxEPI — vaccine registration and certificates",
    whatBn: "সরকারি টিকা কর্মসূচির (ইপিআই) নাগরিক পোর্টাল: নিবন্ধন ও টিকার সনদ। শিশুর টিকার সময়সূচি কাছের টিকাকেন্দ্রে জেনে নিন।",
    whatEn: "Citizen portal of the government immunisation programme (EPI): registration and vaccination certificates. Ask your nearest vaccination centre for your child's schedule.",
    source: s("VaxEPI Citizen Portal", "https://vaxepi.gov.bd/"),
  },
  {
    id: "dgda", group: "medicines", url: "https://dgda.gov.bd/", confidence: "official",
    bn: "ঔষধ প্রশাসন অধিদপ্তর", en: "Directorate General of Drug Administration (DGDA)",
    whatBn: "ওষুধ ও ফার্মেসির সরকারি নিয়ন্ত্রক সংস্থা। ওষুধ কিনবেন নিবন্ধিত ফার্মেসি থেকে, প্রেসক্রিপশন অনুযায়ী।",
    whatEn: "The government regulator for medicines and pharmacies. Buy medicines from a registered pharmacy, as prescribed.",
    source: s("ঔষধ প্রশাসন অধিদপ্তর (dgda.gov.bd)", "https://dgda.gov.bd/"),
  },
];

/** Links into tools that already exist in KormoPath. */
export const KORMOPATH_HEALTH_LINKS: ReadonlyArray<{ href: string; bn: string; en: string; whatBn: string; whatEn: string }> = [
  { href: "/mediscan/emergency", bn: "কাছের জরুরি হাসপাতাল", en: "Nearest emergency hospital", whatBn: "আপনার এলাকার জরুরি বিভাগ, দূরত্ব ও পথ", whatEn: "Emergency departments near you, distance and directions" },
  { href: "/mediscan", bn: "প্রেসক্রিপশন বুঝুন", en: "Read a prescription", whatBn: "প্রেসক্রিপশনে কী লেখা আছে সহজ বাংলায়", whatEn: "What a prescription says, in plain Bangla" },
  { href: "/mediscan#adherence", bn: "ওষুধের সময়সূচি", en: "Medicine schedule", whatBn: "ডাক্তারের দেওয়া সময়ে ওষুধ খেয়েছেন কি না টিক দিন", whatEn: "Tick off doses on the schedule your doctor gave" },
  { href: "/mediscan#dengue", bn: "জ্বর ও ডেঙ্গু সতর্ক সংকেত", en: "Fever & dengue warning signs", whatBn: "কখন দেরি না করে হাসপাতালে যাবেন", whatEn: "When to go to hospital without delay" },
  { href: "/mediscan/assistant", bn: "কোন ডাক্তার দেখাব?", en: "Which doctor should I see?", whatBn: "উপসর্গ লিখুন, কোন ধরনের ডাক্তার জানুন", whatEn: "Describe symptoms, learn which kind of doctor" },
];

/** What to keep for each family member — a checklist only; nothing is collected. */
export const FAMILY_HEALTH_GUIDE: ReadonlyArray<{ bn: string; en: string }> = [
  { bn: "রক্তের গ্রুপ ও জানা অ্যালার্জি", en: "Blood group and known allergies" },
  { bn: "নিয়মিত যে ওষুধ খান (প্রেসক্রিপশনের ছবি বা কপি)", en: "Regular medicines (a photo or copy of the prescription)" },
  { bn: "শিশুর টিকার কার্ড ও টিকার সনদ", en: "Children's vaccination card and certificates" },
  { bn: "আগের পরীক্ষার রিপোর্ট ও হাসপাতালের ছাড়পত্র", en: "Past test reports and hospital discharge papers" },
  { bn: "পরিচিত ডাক্তারের নাম ও কাছের হাসপাতালের ফোন নম্বর", en: "Your regular doctor's name and the nearest hospital's phone number" },
  { bn: "জরুরি অবস্থায় কাকে ফোন করবেন (পরিবারের দুইজন)", en: "Who to call in an emergency (two family members)" },
];
