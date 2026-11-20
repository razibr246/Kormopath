"use client";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Navbar, Footer } from "@/components/layout/Chrome";
import dynamic from "next/dynamic";
import { HeroOrbit } from "@/components/home/HeroOrbit";
import { ProofStrip } from "@/components/home/ProofStrip";
// The ecosystem tour is a modal that renders nothing until opened, and it carries the demo personas and the
// budget parser; loading it on first open keeps them out of every home-page visit.
const EcosystemHub = dynamic(() => import("@/components/home/EcosystemHub").then((m) => m.EcosystemHub), { ssr: false });
import { FX_FALLBACK, type Source } from "@/lib/data";
import { storageKey, usePersistentState } from "@/lib/clientStore";
import {
  ArrowRight,
  ArrowUpRight,
  Briefcase,
  ChevronDown,
  Compass,
  CornerDownLeft,
  Database,
  GraduationCap,
  Lock,
  MessageCircle,
  Mic,
  Percent,
  Pill,
  Scale,
  ScrollText,
  Search,
  ShieldCheck,
  Sparkles,
  Sprout,
  Wallet,
  type LucideIcon, Tractor } from "lucide-react";
const PersonaLoginModal = dynamic(() => import("@/components/auth/PersonaLoginModal").then((m) => m.PersonaLoginModal), { ssr: false });
// The animated life story (farmer rig, springs, scenery) is its own chunk: it is far below the fold.
const LifeStory = dynamic(() => import("@/components/home/LifeStory").then((m) => m.LifeStory));
import { SignedInHome, type HomeApp } from "@/components/home/SignedInHome";
import { getStoredSession, type UserSession } from "@/lib/session";
import { personaHome } from "@/lib/personaHome";

type Lang = "en" | "bn";
const sanitizeLanguage = (value: unknown): Lang | null => value === "en" || value === "bn" ? value : null;
const isSource = (value: unknown): value is Source => {
  if (!value || typeof value !== "object") return false;
  const source = value as Record<string, unknown>;
  return typeof source.label === "string" &&
    typeof source.checked === "string" &&
    (source.url === undefined || typeof source.url === "string") &&
    ["official", "reported", "indicative", "estimate"].includes(String(source.confidence));
};
type Tool = {
  id: string;
  href: string;
  icon: LucideIcon;
  /** Tailwind classes for the icon tile and the card's top stripe (all from the v2 palette). */
  tone: string;
  stripe: string;
  name: { bn: string; en: string };
  line: { bn: string; en: string };
  chips: { bn: string[]; en: string[] };
};

const TOOLS: Record<"earn" | "life" | "farm", Tool[]> = {
  earn: [
    { id: "chuktiguard", href: "/chuktiguard", icon: ScrollText, tone: "bg-indigo-50 text-indigo-700 ring-indigo-200", stripe: "from-indigo-500 to-violet-500",
      name: { bn: "চুক্তিগার্ড", en: "ChuktiGuard" },
      line: { bn: "রিভিউ করা ধারার টেমপ্লেট থেকে ক্লায়েন্ট চুক্তি, মাইলস্টোন ও ইনভয়েস।", en: "Client contracts, milestones and invoices from reviewed clause templates." },
      chips: { bn: ["বাংলা-ইংরেজি ধারা", "মাইলস্টোন ভাগ"], en: ["Bilingual clauses", "Milestone split"] } },
    { id: "feeguard", href: "/feeguard", icon: Percent, tone: "bg-amber-50 text-amber-800 ring-amber-200", stripe: "from-amber-400 to-orange-500",
      name: { bn: "ফি-গার্ড", en: "FeeGuard BD" },
      line: { bn: "পেআউটের প্রতিটি ফি, রেট আর প্রণোদনা ধাপে ধাপে, প্রতিটির পাশে উৎস।", en: "Every payout fee, rate and incentive step by step, each with its source." },
      chips: { bn: ["চ্যানেল তুলনা", "২.৫% প্রণোদনা"], en: ["Channel compare", "2.5% incentive"] } },
    { id: "probaho", href: "/probaho", icon: Mic, tone: "bg-purple-50 text-purple-700 ring-purple-200", stripe: "from-purple-500 to-pink-500",
      name: { bn: "প্রবাহ কোচ", en: "Probaho Coach" },
      line: { bn: "ভাইভা ও ইন্টারভিউয়ের উত্তর বলে অনুশীলন; উত্তরের কাঠামো নিয়ে স্বচ্ছ ফিডব্যাক।", en: "Practise viva and interview answers aloud; transparent feedback on structure." },
      chips: { bn: ["বাংলা ও ইংরেজি", "প্রশ্নব্যাংক"], en: ["Bangla & English", "Question bank"] } },
    { id: "path", href: "/opportunities", icon: Compass, tone: "bg-sky-50 text-sky-800 ring-sky-200", stripe: "from-sky-500 to-blue-600",
      name: { bn: "আমার পথ", en: "My Path" },
      line: { bn: "চাকরি, বৃত্তি ও কৃষি কর্মসূচি খুঁজুন, সংরক্ষণ করুন, পরের ধাপ ঠিক করুন।", en: "Find jobs, scholarships and farm programmes; save them and plan next steps." },
      chips: { bn: ["উৎসসহ খোঁজ", "ক্যালেন্ডার"], en: ["Sourced search", "Calendar"] } },
  ],
  life: [
    { id: "admitbuddy", href: "/admitbuddy", icon: GraduationCap, tone: "bg-blue-50 text-blue-700 ring-blue-200", stripe: "from-blue-500 to-indigo-500",
      name: { bn: "অ্যাডমিট বাডি", en: "AdmitBuddy" },
      line: { bn: "বিশ্ববিদ্যালয় ভর্তির তালিকা, কাজের চেকলিস্ট আর অফিসিয়াল সার্কুলারের তারিখ।", en: "University shortlist, task checklist and dates from official circulars." },
      chips: { bn: ["জিপিএ মিল", "এসওপি খসড়া"], en: ["GPA fit", "SOP draft"] } },
    { id: "shohoj", href: "/shohoj-budget", icon: Wallet, tone: "bg-orange-50 text-orange-700 ring-orange-200", stripe: "from-orange-500 to-red-500",
      name: { bn: "সহজ বাজেট", en: "Shohoj Budget" },
      line: { bn: "সংসারের পুরো হিসাব: মুখে বলে খরচ, হাতের টাকা ও বিকাশ-নগদ, দেনা-পাওনা, বাজারের তালিকা, মেসের মিল আর যাকাত। নিশ্চিত করলে তবেই সংরক্ষণ।", en: "The whole household ledger: spoken entries, cash and bKash-Nagad wallets, dhar and baki, the bazar list, mess meals and zakat. Saved only after you confirm." },
      chips: { bn: ["দেনা-পাওনা", "মেসের হিসাব"], en: ["Dhar & baki", "Mess meals"] } },
    { id: "mediscan", href: "/mediscan", icon: Pill, tone: "bg-rose-50 text-rose-700 ring-rose-200", stripe: "from-rose-500 to-pink-500",
      name: { bn: "মেডিস্ক্যান", en: "MediScan BD" },
      line: { bn: "কাছের জরুরি হাসপাতাল খোঁজা, কোন ডাক্তার দেখাবেন, অনলাইন পরামর্শ আর প্রেসক্রিপশন সহজ বাংলায় — রোগ নির্ণয় করে না।", en: "Find the nearest emergency hospital, which doctor to see, online consultation and prescriptions in plain Bangla — never diagnoses." },
      chips: { bn: ["জরুরি হাসপাতাল", "ডাক্তার"], en: ["Emergency hospital", "Doctors"] } },
    { id: "rokkha", href: "/rokkha", icon: ShieldCheck, tone: "bg-amber-50 text-amber-800 ring-amber-200", stripe: "from-amber-500 to-orange-600",
      name: { bn: "রক্ষা", en: "Rokkha" },
      line: { bn: "সন্দেহজনক এসএমএসের লক্ষণ, টাকা পাঠানোর আগে বিরতি, টাকা হারালে কী করবেন আর দুর্যোগের প্রস্তুতি।", en: "Scam signs in an SMS, a pause before you send money, what to do if money is lost, and disaster readiness." },
      chips: { bn: ["প্রতারণা যাচাই", "বিরতির টাইমার"], en: ["Scam check", "Pause timer"] } },
    { id: "legal", href: "/legal", icon: Scale, tone: "bg-indigo-50 text-indigo-800 ring-indigo-200", stripe: "from-indigo-500 to-amber-500",
      name: { bn: "আইনি সহায়তা", en: "Legal Aid" },
      line: { bn: "বিনামূল্যে আইনি সাহায্য পাবেন কি না, আবেদনের খসড়া, মীমাংসার প্রস্তুতি আর কথা বলে আইনি তথ্য — উৎসসহ, পরামর্শ নয়।", en: "Whether you may get free legal aid, an application draft, mediation prep and spoken legal information — sourced, not advice." },
      chips: { bn: ["আবেদনের খসড়া", "মীমাংসা"], en: ["Application draft", "Mediation"] } },
  ],
  farm: [
    { id: "haatbazar", href: "/haatbazar", icon: Sprout, tone: "bg-emerald-50 text-emerald-800 ring-emerald-200", stripe: "from-emerald-500 to-lime-500",
      name: { bn: "হাটবাজার", en: "HaatBazar AI" },
      line: { bn: "আপনার দেওয়া দামে হাট বনাম আড়তের লাভ, জেলার আবহাওয়া আর স্প্রে করার সময়।", en: "Market vs wholesale margin at your own prices, district weather and spray windows." },
      chips: { bn: ["ট্রাক ভাগ", "কৃষি কল ১৬১২৩"], en: ["Truck share", "Krishi call 16123"] } },
    { id: "krishi", href: "/krishi/field#/farmer", icon: Tractor, tone: "bg-lime-50 text-lime-800 ring-lime-200", stripe: "from-lime-500 to-emerald-600",
      name: { bn: "মাঠসাথী", en: "MaathSathi" },
      line: { bn: "কী লাগাবেন, আজ সেচ লাগবে কি না, ফসলের ডাক্তার, রোপণ রাডার আর খামারের খাতা — নাসা, সেন্টিনেল আর মাটির তথ্যে, বাংলায়।", en: "What to plant, whether to water today, crop doctor, Ropon Radar and the farm book — from NASA, Sentinel and soil data, in Bangla." },
      chips: { bn: ["রোপণ রাডার", "খামারের খাতা"], en: ["Ropon Radar", "Farm book"] } },
  ],
};

const GROUPS = [
  { key: "earn" as const, bn: "আয়", en: "Earn", sub: { bn: "দক্ষতা থেকে পেমেন্ট পর্যন্ত", en: "From skill to payment" } },
  { key: "life" as const, bn: "জীবন", en: "Life", sub: { bn: "পড়াশোনা, সংসার ও স্বাস্থ্য", en: "Study, home and health" } },
  { key: "farm" as const, bn: "কৃষি", en: "Farm", sub: { bn: "মাঠ থেকে হাট", en: "From field to market" } },
];

/** Task-first search: plain-language jobs mapped to the tool that does them. */
const TASKS: Array<{ href: string; bn: string; en: string; keys: string }> = [
  { href: "/feeguard", bn: "পেআউটে কত ফি কাটবে দেখব", en: "See what my payout will cost", keys: "fee ফি payoneer পেওনিয়ার withdraw টাকা তোলা swift bkash বিকাশ wise upwork fiverr rate রেট" },
  { href: "/workspace", bn: "সিভি থেকে স্কিল পাসপোর্ট বানাব", en: "Turn my CV into a skill passport", keys: "cv সিভি skill স্কিল passport পাসপোর্ট github freelance ফ্রিল্যান্স audit চাকরি" },
  { href: "/chuktiguard", bn: "ক্লায়েন্টের সঙ্গে চুক্তি ও ইনভয়েস করব", en: "Draft a client contract and invoice", keys: "contract চুক্তি invoice ইনভয়েস client ক্লায়েন্ট milestone legal" },
  { href: "/probaho", bn: "ভাইভা/ইন্টারভিউ অনুশীলন করব", en: "Practise a viva or interview", keys: "viva ভাইভা interview ইন্টারভিউ speaking কথা বলা practice অনুশীলন" },
  { href: "/opportunities", bn: "চাকরি বা বৃত্তি খুঁজব", en: "Find a job or scholarship", keys: "job চাকরি scholarship বৃত্তি internship opportunity সুযোগ program" },
  { href: "/admitbuddy", bn: "ভর্তির পরিকল্পনা করব", en: "Plan university admission", keys: "admission ভর্তি university বিশ্ববিদ্যালয় gpa জিপিএ buet du sop" },
  { href: "/shohoj-budget#dhar", bn: "কে কত টাকা পাবে, কাকে কত দেব লিখব", en: "Track money I lent and owe (dhar, baki)", keys: "dhar ধার baki বাকি loan দেনা পাওনা lend borrow" },
  { href: "/shohoj-budget#mess", bn: "মেসের মিল রেট আর মাস শেষের হিসাব করব", en: "Mess meal rate and month-end settlement", keys: "mess মেস meal মিল bachelor ব্যাচেলর flat ফ্ল্যাট bazar duty বাজার" },
  { href: "/shohoj-budget#zakat", bn: "যাকাত হিসাব করব", en: "Calculate zakat", keys: "zakat যাকাত gold সোনা silver রুপা nisab নিসাব bhori ভরি sanchaypatra সঞ্চয়পত্র dps" },
  { href: "/shohoj-budget", bn: "সংসারের খরচ লিখে রাখব", en: "Track household spending", keys: "budget বাজেট expense খরচ bazar বাজার sms money হিসাব সংসার" },
  { href: "/mediscan/emergency", bn: "কাছের জরুরি হাসপাতাল খুঁজব", en: "Find the nearest emergency hospital", keys: "hospital হাসপাতাল emergency জরুরি icu আইসিইউ ambulance অ্যাম্বুলেন্স accident দুর্ঘটনা heart হার্ট" },
  { href: "/mediscan/assistant", bn: "কোন ডাক্তার দেখাব জানব", en: "Which doctor should I see", keys: "doctor ডাক্তার specialist বিশেষজ্ঞ symptom লক্ষণ consult পরামর্শ video ভিডিও" },
  { href: "/mediscan", bn: "প্রেসক্রিপশন বুঝব", en: "Understand a prescription", keys: "prescription প্রেসক্রিপশন medicine ওষুধ doctor ডাক্তার dose" },
  { href: "/mediscan#dengue", bn: "জ্বর হলে কী কী লক্ষণ দেখব", en: "Fever and dengue warning signs", keys: "fever জ্বর dengue ডেঙ্গু vomit বমি bleeding রক্ত hospital হাসপাতাল" },
  { href: "/haatbazar", bn: "হাটে বেচব না আড়তে, হিসাব করব", en: "Market or wholesale: which pays more", keys: "crop ফসল farm কৃষি haat হাট weather আবহাওয়া spray স্প্রে truck ট্রাক দাম price" },
  { href: "/krishi/field#/farmer", bn: "স্যাটেলাইটে জমি, সেচ আর রোপণের সময় দেখব", en: "See my field by satellite: water, planting time and Ropon Radar", keys: "satellite স্যাটেলাইট nasa নাসা sentinel radar রাডার রোপণ ropon aman আমন সেচ water irrigation soil মাটি field future ভবিষ্যৎ fieldshift" },
  { href: "/krishi", bn: "খামারের খাতা: কাজ, পশুপাখি ও খরচ লিখব", en: "Plan field work, livestock and government support", keys: "farm কৃষি krishi মাঠ জমি land task কাজ cow গরু poultry মুরগি fish মাছ support সহায়তা card কার্ড voice ভয়েস sms" },
  { href: "/legal", bn: "বিনামূল্যে আইনি সাহায্য পাব কি না দেখব", en: "See if I can get free legal aid", keys: "legal আইন আইনি lawyer উকিল আইনজীবী case মামলা court আদালত divorce তালাক land জমি dowry যৌতুক mediation মীমাংসা legal aid" },
  { href: "/rokkha", bn: "এই এসএমএস কি প্রতারণা, যাচাই করব", en: "Check if a message is a scam", keys: "scam প্রতারণা fraud otp ওটিপি pin পিন bkash বিকাশ nagad নগদ lottery লটারি sms এসএমএস banglish link লিংক call কল guardian পাহারা cyclone ঘূর্ণিঝড় flood বন্যা disaster দুর্যোগ helpline হেল্পলাইন gd জিডি" },
  { href: "/settings", bn: "আমার ডেটা দেখব বা মুছব", en: "See or delete my data", keys: "data ডেটা privacy প্রাইভেসি delete মুছুন export backup ব্যাকআপ" },
];

function matchTasks(query: string) {
  const q = query.trim().toLowerCase().normalize("NFC");
  if (!q) return TASKS.slice(0, 5);
  const words = q.split(/\s+/);
  return TASKS
    .map((task) => {
      const hay = `${task.bn} ${task.en} ${task.keys}`.toLowerCase().normalize("NFC");
      const score = words.reduce((n, w) => n + (hay.includes(w) ? 1 : 0), 0);
      return { task, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((x) => x.task)
    .slice(0, 5);
}

/** The life cycle: the same tools, ordered the way a life actually uses them. */
const LIFECYCLE: Array<{ icon: LucideIcon; tone: string; bn: string; en: string; when: { bn: string; en: string }; links: Array<{ href: string; bn: string; en: string }> }> = [
  { icon: GraduationCap, tone: "bg-blue-50 text-blue-700 ring-blue-200", bn: "পড়া", en: "Study",
    when: { bn: "এসএসসি-এইচএসসির পর ভর্তি আর প্রস্তুতি", en: "After SSC/HSC: admission and preparation" },
    links: [{ href: "/admitbuddy", bn: "ভর্তির পরিকল্পনা", en: "Admission plan" }, { href: "/admitbuddy#exam_practice", bn: "মডেল টেস্ট ও অনুশীলন", en: "Exam practice" }, { href: "/admitbuddy#foreign", bn: "বিদেশে উচ্চশিক্ষা", en: "Study abroad" }, { href: "/probaho", bn: "ভাইভা অনুশীলন", en: "Viva practice" }] },
  { icon: Briefcase, tone: "bg-emerald-50 text-emerald-800 ring-emerald-200", bn: "দক্ষতা ও কাজ", en: "Skills & work",
    when: { bn: "দক্ষতার প্রমাণ, চাকরি বা ফ্রিল্যান্স", en: "Prove skills, find a job or clients" },
    links: [{ href: "/workspace", bn: "স্কিল পাসপোর্ট", en: "Skill passport" }, { href: "/opportunities", bn: "সুযোগ খুঁজুন", en: "Find opportunities" }] },
  { icon: ScrollText, tone: "bg-indigo-50 text-indigo-700 ring-indigo-200", bn: "আয়", en: "Earn",
    when: { bn: "চুক্তি, ইনভয়েস আর টাকা দেশে আনা", en: "Contracts, invoices, bringing money home" },
    links: [{ href: "/chuktiguard", bn: "চুক্তি ও ইনভয়েস", en: "Contracts" }, { href: "/feeguard", bn: "পেআউটের ফি", en: "Payout fees" }] },
  { icon: Wallet, tone: "bg-orange-50 text-orange-700 ring-orange-200", bn: "সংসার", en: "Home & money",
    when: { bn: "প্রতিদিনের খরচ, বাজেট আর সঞ্চয়", en: "Daily spending, budget and savings" },
    links: [{ href: "/shohoj-budget", bn: "সহজ বাজেট", en: "Shohoj Budget" }, { href: "/shohoj-budget#dhar", bn: "দেনা-পাওনা", en: "Dhar & baki" }, { href: "/shohoj-budget#mess", bn: "মেস ও ফ্ল্যাট", en: "Mess & flat" }] },
  { icon: Pill, tone: "bg-rose-50 text-rose-700 ring-rose-200", bn: "স্বাস্থ্য", en: "Health",
    when: { bn: "জরুরি হাসপাতাল, ডাক্তার, জ্বরে বিপদের সংকেত, ওষুধের হিসাব", en: "Emergency hospitals, doctors, fever danger signs, medicines" },
    links: [{ href: "/mediscan/emergency", bn: "কাছের জরুরি হাসপাতাল", en: "Nearest emergency hospital" }, { href: "/mediscan/doctors", bn: "ডাক্তার খুঁজুন", en: "Find a doctor" }, { href: "/mediscan#dengue", bn: "জ্বর ও ডেঙ্গু সংকেত", en: "Fever & dengue signs" }, { href: "/mediscan#adherence", bn: "ওষুধ খাওয়ার হিসাব", en: "Taking my medicines" }, { href: "/mediscan", bn: "প্রেসক্রিপশন বুঝুন", en: "Read a prescription" }] },
  { icon: Sprout, tone: "bg-lime-50 text-lime-800 ring-lime-200", bn: "মাঠ", en: "Field",
    when: { bn: "ফসল, আবহাওয়া আর হাটের হিসাব", en: "Crops, weather and market maths" },
    links: [{ href: "/krishi/field#/farmer", bn: "মাঠসাথী", en: "MaathSathi" }, { href: "/haatbazar", bn: "হাটবাজার", en: "HaatBazar" }] },
  { icon: ShieldCheck, tone: "bg-amber-50 text-amber-800 ring-amber-200", bn: "সুরক্ষা", en: "Protect",
    when: { bn: "প্রতারণা চেনা, ভোক্তা অভিযোগ, তথ্যের ব্যাকআপ", en: "Spot scams, consumer complaints, back up data" },
    links: [{ href: "/rokkha#call", bn: "কলে আছেন? থামুন", en: "On a call? Pause" }, { href: "/rokkha#check", bn: "এসএমএস যাচাই", en: "Check an SMS" }, { href: "/probaho#scam", bn: "প্রতারণা চিনুন", en: "Scam practice" }, { href: "/legal", bn: "বিনামূল্যে আইনি সহায়তা", en: "Free legal aid" }, { href: "/chuktiguard#dncrp", bn: "ভোক্তা অভিযোগ", en: "Consumer complaint" }, { href: "/settings", bn: "লক করা ব্যাকআপ", en: "Locked backup" }] },
];

export default function HomePage() {
  const router = useRouter();
  const [isEcosystemOpen, setIsEcosystemOpen] = useState(false);
  const [lang, setLang] = usePersistentState<Lang>(storageKey("platform", "language"), "bn", sanitizeLanguage);
  const [fx, setFx] = useState({ usdBdt: FX_FALLBACK.usdBdt, live: false, source: FX_FALLBACK.source });
  const [query, setQuery] = useState("");
  const bn = lang === "bn";
  const results = useMemo(() => matchTasks(query), [query]);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/fx", { signal: controller.signal })
      .then((response) => response.json())
      .then((data: { usdBdt?: unknown; live?: unknown; source?: unknown }) => {
        if (typeof data.usdBdt === "number" && Number.isFinite(data.usdBdt) && data.usdBdt > 80 && data.usdBdt < 250) {
          setFx({
            usdBdt: data.usdBdt,
            live: data.live === true,
            source: isSource(data.source) ? data.source : FX_FALLBACK.source,
          });
        }
      })
      .catch(() => { /* keep the labelled local reference rate when live FX is unavailable */ });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    document.documentElement.lang = bn ? "bn" : "en";
    return () => { document.documentElement.lang = "bn"; };
  }, [bn]);

  const [loginModalOpen, setLoginModalOpen] = useState(false);

  // Two front doors, like large web platforms: visitors get the public landing page, a signed-in demo profile gets
  // its own home. The session is read after mount, so the server and first client render are the same (public).
  const [session, setSession] = useState<UserSession | null>(null);
  const [showPublic, setShowPublic] = useState(false);
  useEffect(() => {
    const read = () => { setSession(getStoredSession()); setShowPublic(false); };
    read();
    window.addEventListener("kormopath:session-change", read);
    window.addEventListener("storage", read);
    return () => { window.removeEventListener("kormopath:session-change", read); window.removeEventListener("storage", read); };
  }, []);
  const home = personaHome(session?.personaId);
  const personal = !!(session && home && !showPublic);
  const homeApps: HomeApp[] = [
    { id: "workspace", href: "/workspace", icon: Briefcase, tone: "bg-emerald-50 text-emerald-800 ring-emerald-200",
      name: { bn: "ওয়ার্কস্পেস", en: "Workspace" },
      line: { bn: "সিভি থেকে স্কিল পাসপোর্ট, ভাইভা, চুক্তি আর পেআউটের হিসাব।", en: "CV to skill passport, viva, contract and payout maths." } },
    ...[...TOOLS.earn, ...TOOLS.life, ...TOOLS.farm],
  ];
  const goToTopMatch = (event: FormEvent) => {
    event.preventDefault();
    if (results[0]) router.push(results[0].href);
  };

  const orbitTools = [...TOOLS.earn, ...TOOLS.life, ...TOOLS.farm].map((tool) => ({
    href: tool.href,
    label: bn ? tool.name.bn : tool.name.en,
    icon: tool.icon,
    tone: tool.tone,
  }));

  return (
    <div className="min-h-screen text-ink">
      <Navbar lang={lang} setLang={setLang} usdBdt={fx.usdBdt} fxLive={fx.live} fxSource={fx.source} onOpenEcosystem={() => setIsEcosystemOpen(true)} isEcosystemOpen={isEcosystemOpen} />

      <main id="main" className="mx-auto max-w-[1320px] px-4 sm:px-6">
        {session && home && showPublic && (
          <p className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-[14px] text-amber-950" data-testid="public-preview-bar">
            {bn ? "আপনি পাবলিক পেজ দেখছেন, যা দর্শকেরা দেখেন।" : "You are viewing the public page visitors see."}
            <button type="button" onClick={() => setShowPublic(false)} className="font-semibold underline">{bn ? "আমার হোমে ফিরুন" : "Back to my home"}</button>
          </p>
        )}
        {personal && session && home ? (
          <SignedInHome session={session} home={home} apps={homeApps} lang={lang} onShowPublic={() => { setShowPublic(true); window.scrollTo({ top: 0 }); }} onSwitchProfile={() => setLoginModalOpen(true)} />
        ) : (<>
        {/* ============ HERO ============ */}
        <section aria-labelledby="hero-title" className="kp-hero grid items-center gap-10 pb-10 pt-12 sm:pt-16 lg:grid-cols-[1.08fr_.92fr] lg:gap-6 lg:pt-20">
          <div className="kp-rise">
            <h1 id="hero-title" className="mt-0 text-[clamp(38px,6.2vw,76px)] font-semibold leading-[1.04] tracking-tight text-slate-900">
              {bn ? (
                <>পড়া, কাজ, সংসার আর মাঠ — <em className="kp-em">এক পথে</em> সব হিসাব।</>
              ) : (
                <>Study, work, home and field: <em className="kp-em">one honest path.</em></>
              )}
            </h1>
            <p className="mt-5 max-w-[34rem] text-[17px] leading-relaxed text-slate-600 sm:text-[19px]">
              {bn
                ? "মূল যাত্রা একজন ছাত্র ফ্রিল্যান্সারের: দক্ষতার প্রমাণ, তারপর চুক্তি, তারপর টাকা হাতে। একই ট্রাস্ট ইঞ্জিনে চলে আরও ১১টি অ্যাপ, মোট ১২টি। টাকার হিসাব নির্ধারিত নিয়মে, প্রতিটি সংখ্যার পাশে উৎস, আর কোনো তথ্য বানিয়ে বলা হয় না।"
                : "The flagship journey is a student freelancer's: skill proof, then a contract, then the payout. The same trust engine runs 11 more apps, 12 in all. Money maths follows fixed rules, every number shows its source, and nothing is made up."}
            </p>

            {/* Task-first search */}
            <form onSubmit={goToTopMatch} className="kp-intent mt-8" role="search">
              <label htmlFor="intent" className="sr-only">{bn ? "আজ কী করবেন?" : "What do you need today?"}</label>
              <Search size={20} className="shrink-0 text-slate-400" aria-hidden="true" />
              <input
                id="intent"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={bn ? "আজ কী করবেন? যেমন: পেআউটের ফি, ভর্তি, বাজারের খরচ…" : "What do you need today? e.g. payout fee, admission, bazar spending…"}
                autoComplete="off"
                aria-controls="intent-results"
              />
              <button type="button" onClick={() => window.dispatchEvent(new Event("kormopath:open-buddy"))} className="kp-intent-voice" aria-label={bn ? "বাডিকে বলুন, বাংলায়" : "Ask Buddy, by voice"} title={bn ? "বাডিকে বলুন" : "Ask Buddy"}>
                <MessageCircle size={18} />
                <span className="hidden sm:inline">{bn ? "বাডিকে বলুন" : "Ask Buddy"}</span>
              </button>
            </form>
            <ul id="intent-results" className="mt-3 flex flex-wrap gap-2" aria-live="polite">
              {results.length === 0 ? (
                <li className="text-[14px] text-slate-500">{bn ? "মিল পাওয়া যায়নি। বাডিকে জিজ্ঞেস করুন বা সব টুল দেখুন।" : "No match. Ask Buddy or browse all tools."}</li>
              ) : (
                results.map((task, i) => (
                  <li key={task.href} className={i >= 3 ? "hidden sm:block" : undefined}>
                    <Link href={task.href} prefetch={!task.href.includes("#")} className={`kp-task ${query && i === 0 ? "kp-task-top" : ""}`}>
                      {bn ? task.bn : task.en}
                      {query && i === 0 ? <CornerDownLeft size={13} aria-hidden="true" /> : <ArrowUpRight size={13} aria-hidden="true" />}
                    </Link>
                  </li>
                ))
              )}
            </ul>

            {/* One primary and one secondary action, the rest as quiet links (the way large product sites do it). */}
            <div className="mt-8 flex flex-wrap items-center gap-3">
              {/* B2C: first value with no sign-up. The workspace opens straight away; profiles and plans are optional. */}
              <Link href="/workspace" prefetch={true} className="kp-btn-primary kp-btn-lg" data-testid="hero-start">
                <Briefcase size={18} /> {bn ? "এখনই শুরু করুন" : "Start now"}
              </Link>
              <a href="#apps-showcase" className="kp-btn-ghost kp-btn-lg">
                {bn ? "সব অ্যাপ দেখুন" : "See all apps"} <ArrowRight size={17} />
              </a>
            </div>
            <p className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-[14.5px] text-slate-600">
              <span className="inline-flex items-center gap-1.5"><Lock size={14} className="text-emerald-700" aria-hidden="true" />{bn ? "সাইন-আপ লাগবে না, ফ্রি" : "No sign-up, free"}</span>
              <button type="button" onClick={() => setLoginModalOpen(true)} className="font-semibold text-emerald-800 underline-offset-4 hover:underline" data-testid="hero-demo-profiles">
                {bn ? "ডেমো প্রোফাইলে ঘুরে দেখুন" : "Try a demo profile"}
              </button>
              <Link href="/pricing" prefetch={true} className="inline-flex items-center gap-1 font-semibold text-emerald-800 underline-offset-4 hover:underline" data-testid="hero-pricing">
                <Sparkles size={14} aria-hidden="true" /> {bn ? "ফ্রি ও পেইড প্ল্যান" : "Free & paid plans"}
              </Link>
            </p>
          </div>

          <div className="kp-rise kp-rise-2 mx-auto w-full max-w-[540px]">
            <HeroOrbit
              tools={orbitTools}
              caption={{
                kept: bn ? "প্রতিটি টাকার হিসাব, উৎসসহ" : "Every taka, with its source",
                voice: bn ? "বাংলায় বলুন, বাডি শুনবে" : "Speak Bangla, Buddy listens",
              }}
            />
          </div>
        </section>

        {/* Trust strip */}
        <section aria-label={bn ? "আমাদের প্রতিশ্রুতি" : "Our promises"} className="kp-trust grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: Lock, t: bn ? "অ্যাকাউন্ট লাগে না" : "No account needed", d: bn ? "নাম, ফোন বা ইমেইল চাওয়া হয় না" : "No name, phone or email asked" },
            { icon: Database, t: bn ? "ডেটা আপনার" : "Your data", d: bn ? "ডিভাইসে থাকে; সেটিংসে রপ্তানি বা মুছুন" : "On your device; export or delete in Settings" },
            { icon: Scale, t: bn ? "নিয়মে হিসাব" : "Rule-based maths", d: bn ? "ফি, কর ও মোট: কোডে, এআই নয়" : "Fees, tax and totals in code, not AI" },
            { icon: ShieldCheck, t: bn ? "উৎস দেখানো" : "Sources shown", d: bn ? "দাম, তারিখ বা মাত্রা বানানো হয় না" : "No invented prices, dates or doses" },
          ].map(({ icon: Icon, t, d }) => (
            <div key={t} className="flex items-start gap-3 rounded-2xl border border-line bg-white/70 p-4 backdrop-blur">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200"><Icon size={18} /></span>
              <span>
                <strong className="block text-[15px] text-slate-900">{t}</strong>
                <span className="block text-[13.5px] leading-snug text-slate-600">{d}</span>
              </span>
            </div>
          ))}
        </section>

        <ProofStrip lang={bn ? "bn" : "en"} />

        {/* ============ LIFE CYCLE ============ */}
        <section aria-labelledby="life-title" className="pt-24">
          <p className="kp-eyebrow">{bn ? "জীবনের পথ" : "A life, step by step"}</p>
          <h2 id="life-title" className="mt-3 max-w-3xl text-[clamp(30px,4vw,48px)] font-semibold leading-tight tracking-tight text-slate-900">
            {bn ? <>পড়া থেকে মাঠ, <em className="kp-em">জীবনের প্রতিটি মোড়ে</em></> : <>From study to the field, <em className="kp-em">at every turn of life</em></>}
          </h2>
          <ol className="kp-life mt-10">
            {LIFECYCLE.map((stage, i) => {
              const Icon = stage.icon;
              return (
                <li key={stage.en} className="kp-life-stop group">
                  <span className={`kp-life-node ring-1 ${stage.tone} transition-all duration-300 group-hover:scale-108 group-hover:shadow-md`}>
                    <Icon size={20} />
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-[12px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/70">
                      {bn ? `০${"১২৩৪৫৬৭"[i]}` : `0${i + 1}`}
                    </span>
                  </div>
                  <strong className="mt-1.5 block font-display text-[21px] font-semibold text-slate-900 group-hover:text-emerald-950 transition-colors">
                    {bn ? stage.bn : stage.en}
                  </strong>
                  <span className="mt-1 block text-[13.5px] leading-snug text-slate-600">
                    {bn ? stage.when.bn : stage.when.en}
                  </span>
                  <span className="mt-3 flex flex-wrap gap-1.5">
                    {stage.links.map((link) => (
                      <Link
                        key={link.href}
                        href={link.href}
                        prefetch={!link.href.includes("#")}
                        className="kp-task !py-1 !text-[12.5px] transition-all hover:border-emerald-500 hover:bg-emerald-50/70"
                      >
                        {bn ? link.bn : link.en} <ArrowUpRight size={12} aria-hidden="true" />
                      </Link>
                    ))}
                  </span>
                </li>
              );
            })}
          </ol>
        </section>

        {/* ============ TOOLS ============ */}
        <section id="apps-showcase" aria-labelledby="tools-title" className="scroll-mt-28 pt-24">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="kp-eyebrow">{bn ? "একই ইঞ্জিনে আরও ১১টি অ্যাপ" : "11 more apps · same trust engine"}</p>
              <h2 id="tools-title" className="mt-3 text-[clamp(30px,4vw,48px)] font-semibold leading-tight tracking-tight text-slate-900">
                {bn ? <>যা দরকার, <em className="kp-em">সেটাই খুলুন</em></> : <>Open <em className="kp-em">just what you need</em></>}
              </h2>
            </div>
            <p className="max-w-md text-[15px] text-slate-600 sm:text-right">
              {bn ? "প্রতিটি টুল আলাদা, নিজে নিজেই কাজ করে। একটির তথ্য অন্যটি পড়ে না।" : "Each tool stands alone and works by itself. No tool reads another's data."}
            </p>
          </div>

          {(() => {
              const renderGroup = (group: (typeof GROUPS)[number], cols: string) => (
                <div key={group.key} className="mt-12">
                  <div className="mb-4 flex items-baseline gap-3 border-b border-line pb-3">
                    <h3 className="font-display text-[24px] font-semibold text-slate-900">{bn ? group.bn : group.en}</h3>
                    <span className="text-[14px] text-slate-500">{bn ? group.sub.bn : group.sub.en}</span>
                  </div>
                  <div className={`grid gap-4 ${cols}`}>
                    {TOOLS[group.key].map((tool) => {
                      const Icon = tool.icon;
                      return (
                        <Link
                          key={tool.id}
                          href={tool.href}
                          prefetch={true}
                          onPointerEnter={() => {
                            if (tool.href.startsWith("/") && !tool.href.includes("#")) router.prefetch(tool.href);
                          }}
                          onTouchStart={() => {
                            if (tool.href.startsWith("/") && !tool.href.includes("#")) router.prefetch(tool.href);
                          }}
                          className="kp-tool group"
                        >
                          <span className={`kp-tool-stripe bg-gradient-to-r ${tool.stripe}`} aria-hidden="true" />
                          <span className="flex items-start justify-between gap-3">
                            <span className={`grid h-12 w-12 place-items-center rounded-2xl ring-1 ${tool.tone}`}><Icon size={22} /></span>
                            <ArrowUpRight size={18} className="text-slate-400 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-slate-800" aria-hidden="true" />
                          </span>
                          <span className="mt-5 block font-display text-[21px] font-semibold text-slate-900">{bn ? tool.name.bn : tool.name.en}</span>
                          <span className="mt-0.5 block text-[12.5px] font-semibold uppercase tracking-wider text-slate-500">{bn ? tool.name.en : tool.name.bn}</span>
                          <span className="mt-3 block text-[15px] leading-relaxed text-slate-600">{bn ? tool.line.bn : tool.line.en}</span>
                          <span className="mt-auto flex flex-wrap gap-1.5 pt-4">
                            {(bn ? tool.chips.bn : tool.chips.en).map((c) => (
                              <span key={c} className="rounded-lg border border-line bg-slate-50 px-2 py-0.5 text-[12.5px] font-medium text-slate-700">{c}</span>
                            ))}
                          </span>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              );
              return (
                <>
                  {renderGroup(GROUPS[0], "sm:grid-cols-2 lg:grid-cols-4")}
                  <div className="grid gap-x-6 lg:grid-cols-[3fr_1fr]">
                    {renderGroup(GROUPS[1], "sm:grid-cols-2 lg:grid-cols-3")}
                    {renderGroup(GROUPS[2], "sm:grid-cols-2 lg:grid-cols-1")}
                  </div>
                </>
              );
          })()}
        </section>

        {/* ============ LIFE STORY: one person, seven chapters (animated) ============ */}
        <LifeStory lang={lang} />

        {/* ============ FAQ ============ */}
        <section id="faq" aria-labelledby="faq-title" className="mx-auto mt-24 max-w-3xl scroll-mt-28">
          <p className="kp-eyebrow text-center">{bn ? "প্রশ্নোত্তর" : "Questions"}</p>
          <h2 id="faq-title" className="mt-3 text-center text-[clamp(28px,3.6vw,42px)] font-semibold tracking-tight text-slate-900">
            {bn ? "যা জানতে চান" : "What people ask"}
          </h2>
          <div className="mt-8 space-y-3">
            {[
              {
                q: bn ? "টুলগুলো কি সত্যিই কাজ করে, নাকি শুধু নমুনা?" : "Do the tools actually work, or are they mock-ups?",
                a: bn
                  ? "প্রতিটি টুল অ্যাকাউন্ট ছাড়াই চলে। অ্যাডমিট বাডি আপনার দেওয়া সার্কুলারের তারিখ রাখে; মেডিস্ক্যান লেখা পড়ে, রোগ নির্ণয় করে না; সহজ বাজেট সংরক্ষণের আগে নিশ্চিত করে; হাটবাজার আপনার দামে আর লাইভ আবহাওয়ায় হিসাব করে; ফি-গার্ড প্রতিটি ফি উৎসসহ দেখায়।"
                  : "Every tool runs without an account. AdmitBuddy keeps the dates you copy from circulars; MediScan reads text and never diagnoses; Shohoj Budget confirms before saving; HaatBazar uses your prices and live weather; FeeGuard shows every fee with its source.",
              },
              {
                q: bn ? "আমার তথ্য কোথায় থাকে?" : "Where is my data kept?",
                a: bn
                  ? "আপনার ব্রাউজারেই। প্রতিটি টুলের তথ্য আলাদা জায়গায় থাকে। সেটিংস পাতায় দেখুন, ব্যাকআপ নিন বা মুছে দিন।"
                  : "In your browser. Each tool keeps its data separately. See, back up or delete it on the Settings page.",
              },
              {
                q: bn ? "এআই কোথায় ব্যবহার হয়, কোথায় হয় না?" : "Where is AI used, and where not?",
                a: bn
                  ? "এআই লেখা বোঝা, প্রস্তাব খসড়া আর বাডির উত্তরে সাহায্য করে। ফি, কর, মোট টাকা, চুক্তির ধারা আর ওষুধের মাত্রা কখনো এআই ঠিক করে না। এআই না থাকলেও প্রতিটি টুল নিয়মভিত্তিক বিকল্পে চলে।"
                  : "AI helps read text, draft pitches and answer in Buddy. Fees, tax, totals, contract clauses and doses are never decided by AI. Without AI, every tool falls back to rule-based logic.",
              },
              {
                q: bn ? "এটা কি বিনামূল্যে? টাকা লাগবে কখন?" : "Is it free? When would I pay?",
                a: bn
                  ? "জরুরি ৯৯৯ নির্দেশনা, কাছের হাসপাতাল, প্রতারণা যাচাই, আইনি সহায়তা, বাজেট আর সব হেল্পলাইন সবসময় বিনামূল্যে। শুধু সময় বাঁচানো সুবিধার জন্য প্রো প্ল্যান প্রস্তাবিত: এক অ্যাপ ৳৯৯, সব অ্যাপ ৳২৯৯ মাসে। যাচাই করা বিকাশ মার্চেন্ট অ্যাকাউন্ট চালু না হওয়া পর্যন্ত কোনো টাকা নেওয়া হয় না।"
                  : "Emergency 999 guidance, nearby hospitals, scam checks, legal aid, budgeting and every helpline are free forever. A Pro plan is proposed only for time-saving extras: ৳99 for one app or ৳299 for all, per month. No money is taken until a verified bKash merchant account is live.",
              },
              {
                q: bn ? "এক টুল থেকে অন্য টুলে যাব কীভাবে?" : "How do I move between tools?",
                a: bn
                  ? "প্রতিটি পাতার ওপরের ডান দিকের অ্যাপ মেনু থেকে, অথবা ⌘K / Ctrl+K চেপে খুঁজে।"
                  : "From the app menu at the top right of every page, or search with ⌘K / Ctrl+K.",
              },
            ].map((item, i) => (
              <details key={item.q} className="kp-faq group" open={i === 0}>
                <summary>
                  <span>{item.q}</span>
                  <ChevronDown size={18} className="shrink-0 text-slate-500 transition-transform group-open:rotate-180" aria-hidden="true" />
                </summary>
                <p>{item.a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* ============ CLOSING CTA ============ */}
        <section aria-labelledby="cta-title" className="kp-cta mt-24 text-center">
          <h2 id="cta-title" className="relative z-10 mx-auto max-w-3xl text-[clamp(30px,4.4vw,52px)] font-semibold leading-tight tracking-tight text-white">
            {bn ? <>আজকের কাজটা দিয়ে <em className="italic text-[#ffe2b5]">শুরু করুন</em></> : <>Start with <em className="italic text-[#ffe2b5]">today&apos;s task</em></>}
          </h2>
          <p className="relative z-10 mx-auto mt-4 max-w-xl text-[16.5px] text-white/85">
            {bn ? "সাইন আপ নেই, অপেক্ষা নেই। একটি টুল খুলুন, অথবা বাডিকে বাংলায় বলুন।" : "No sign-up, no waiting. Open a tool, or tell Buddy in Bangla."}
          </p>
          <div className="relative z-10 mt-8 flex flex-wrap justify-center gap-3">
            <Link href="/workspace" className="kp-btn-ghost kp-btn-lg !border-white/40">
              <Briefcase size={18} /> {bn ? "ওয়ার্কস্পেস" : "Workspace"}
            </Link>
            <button type="button" onClick={() => window.dispatchEvent(new Event("kormopath:open-buddy"))} className="kp-btn-ghost kp-btn-lg !border-white/40">
              <MessageCircle size={18} /> {bn ? "বাডির সঙ্গে কথা বলুন" : "Talk to Buddy"}
            </button>
          </div>
        </section>
        </>)}
      </main>

      <Footer />

      {isEcosystemOpen && <EcosystemHub
        isOpen={isEcosystemOpen}
        onClose={() => setIsEcosystemOpen(false)}
        activePersona={null}
        onSelectPersona={() => {}}
        lang={lang}
        usdBdt={fx.usdBdt}
      />}

      <PersonaLoginModal
        isOpen={loginModalOpen}
        onClose={() => setLoginModalOpen(false)}
        lang={lang}
      />
    </div>
  );
}
