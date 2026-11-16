"use client";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Navbar, Footer } from "@/components/Chrome";
import { EcosystemHub } from "@/components/EcosystemHub";
import { HeroOrbit } from "@/components/HeroOrbit";
import { FX_FALLBACK } from "@/lib/data";
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
  Sprout,
  Wallet,
  type LucideIcon,
} from "lucide-react";

type Lang = "en" | "bn";
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
      line: { bn: "মুখে বলুন বা লিখুন “আজ বাজারে ৳২০০”: নিশ্চিত করলে তবেই সংরক্ষণ।", en: "Say or type “৳200 at the bazar today”: saved only after you confirm." },
      chips: { bn: ["বাংলা ভয়েস", "বিকাশ এসএমএস"], en: ["Bangla voice", "bKash SMS"] } },
    { id: "mediscan", href: "/mediscan", icon: Pill, tone: "bg-rose-50 text-rose-700 ring-rose-200", stripe: "from-rose-500 to-pink-500",
      name: { bn: "মেডিস্ক্যান", en: "MediScan BD" },
      line: { bn: "প্রেসক্রিপশনে যা লেখা আছে সহজ বাংলায় বোঝায়; রোগ নির্ণয় করে না।", en: "Explains what the prescription says in plain Bangla; never diagnoses." },
      chips: { bn: ["সময়সূচি", "জরুরি সতর্কতা"], en: ["Timetable", "Urgent flags"] } },
  ],
  farm: [
    { id: "haatbazar", href: "/haatbazar", icon: Sprout, tone: "bg-emerald-50 text-emerald-800 ring-emerald-200", stripe: "from-emerald-500 to-lime-500",
      name: { bn: "হাটবাজার", en: "HaatBazar AI" },
      line: { bn: "আপনার দেওয়া দামে হাট বনাম আড়তের লাভ, জেলার আবহাওয়া আর স্প্রে করার সময়।", en: "Market vs wholesale margin at your own prices, district weather and spray windows." },
      chips: { bn: ["ট্রাক ভাগ", "কৃষি কল ১৬১২৩"], en: ["Truck share", "Krishi call 16123"] } },
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
  { href: "/shohoj-budget", bn: "সংসারের খরচ লিখে রাখব", en: "Track household spending", keys: "budget বাজেট expense খরচ bazar বাজার sms money হিসাব সংসার" },
  { href: "/mediscan", bn: "প্রেসক্রিপশন বুঝব", en: "Understand a prescription", keys: "prescription প্রেসক্রিপশন medicine ওষুধ doctor ডাক্তার dose" },
  { href: "/haatbazar", bn: "হাটে বেচব না আড়তে, হিসাব করব", en: "Market or wholesale: which pays more", keys: "crop ফসল farm কৃষি haat হাট weather আবহাওয়া spray স্প্রে truck ট্রাক দাম price" },
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
    links: [{ href: "/admitbuddy", bn: "ভর্তির পরিকল্পনা", en: "Admission plan" }, { href: "/probaho", bn: "ভাইভা অনুশীলন", en: "Viva practice" }] },
  { icon: Briefcase, tone: "bg-emerald-50 text-emerald-800 ring-emerald-200", bn: "দক্ষতা ও কাজ", en: "Skills & work",
    when: { bn: "দক্ষতার প্রমাণ, চাকরি বা ফ্রিল্যান্স", en: "Prove skills, find a job or clients" },
    links: [{ href: "/workspace", bn: "স্কিল পাসপোর্ট", en: "Skill passport" }, { href: "/opportunities", bn: "সুযোগ খুঁজুন", en: "Find opportunities" }] },
  { icon: ScrollText, tone: "bg-indigo-50 text-indigo-700 ring-indigo-200", bn: "আয়", en: "Earn",
    when: { bn: "চুক্তি, ইনভয়েস আর টাকা দেশে আনা", en: "Contracts, invoices, bringing money home" },
    links: [{ href: "/chuktiguard", bn: "চুক্তি ও ইনভয়েস", en: "Contracts" }, { href: "/feeguard", bn: "পেআউটের ফি", en: "Payout fees" }] },
  { icon: Wallet, tone: "bg-orange-50 text-orange-700 ring-orange-200", bn: "সংসার", en: "Home & money",
    when: { bn: "প্রতিদিনের খরচ, বাজেট আর সঞ্চয়", en: "Daily spending, budget and savings" },
    links: [{ href: "/shohoj-budget", bn: "সহজ বাজেট", en: "Shohoj Budget" }] },
  { icon: Pill, tone: "bg-rose-50 text-rose-700 ring-rose-200", bn: "স্বাস্থ্য", en: "Health",
    when: { bn: "পরিবারের প্রেসক্রিপশন বোঝা, জরুরি নম্বর", en: "Understand family prescriptions, emergency numbers" },
    links: [{ href: "/mediscan", bn: "মেডিস্ক্যান", en: "MediScan" }] },
  { icon: Sprout, tone: "bg-lime-50 text-lime-800 ring-lime-200", bn: "মাঠ", en: "Field",
    when: { bn: "ফসল, আবহাওয়া আর হাটের হিসাব", en: "Crops, weather and market maths" },
    links: [{ href: "/haatbazar", bn: "হাটবাজার", en: "HaatBazar" }] },
  { icon: ShieldCheck, tone: "bg-amber-50 text-amber-800 ring-amber-200", bn: "সুরক্ষা", en: "Protect",
    when: { bn: "প্রতারণা চেনা, ভোক্তা অভিযোগ, তথ্যের ব্যাকআপ", en: "Spot scams, consumer complaints, back up data" },
    links: [{ href: "/probaho#scam", bn: "প্রতারণা চিনুন", en: "Scam practice" }, { href: "/chuktiguard#dncrp", bn: "ভোক্তা অভিযোগ", en: "Consumer complaint" }, { href: "/settings", bn: "লক করা ব্যাকআপ", en: "Locked backup" }] },
];

const PIPELINE = [
  { n: "০১", bn: "যাচাই", en: "Audit", d: { bn: "সিভি আর পাবলিক গিটহাব থেকে প্রমাণসহ দক্ষতা।", en: "Skills with evidence from your CV and public GitHub." } },
  { n: "০২", bn: "পরীক্ষা", en: "Prove", d: { bn: "ব্রাউজারের স্যান্ডবক্সে কোড চ্যালেঞ্জ আর মুখে ভাইভা।", en: "A sandboxed code challenge and a spoken viva." } },
  { n: "০৩", bn: "চুক্তি", en: "Contract", d: { bn: "সরাসরি ক্লায়েন্টের জন্য প্রস্তাব আর রিভিউ করা চুক্তি।", en: "A pitch and a reviewed contract for a direct client." } },
  { n: "০৪", bn: "টাকা", en: "Get paid", d: { bn: "ফি, কর আর প্রণোদনার নির্ধারিত হিসাব, মিলিয়ে দেখা।", en: "Fees, tax and incentive, reconciled to the taka." } },
];

export default function HomePage() {
  const router = useRouter();
  const [isEcosystemOpen, setIsEcosystemOpen] = useState(false);
  const [lang, setLang] = useState<Lang>("bn");
  const [fx, setFx] = useState({ usdBdt: FX_FALLBACK.usdBdt, live: false });
  const [query, setQuery] = useState("");
  const bn = lang === "bn";
  const results = useMemo(() => matchTasks(query), [query]);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/fx", { signal: controller.signal })
      .then((response) => response.json())
      .then((data: { usdBdt?: unknown; live?: unknown }) => {
        if (typeof data.usdBdt === "number" && Number.isFinite(data.usdBdt) && data.usdBdt > 80 && data.usdBdt < 250) {
          setFx({ usdBdt: data.usdBdt, live: data.live === true });
        }
      })
      .catch(() => { /* keep the labelled local reference rate when live FX is unavailable */ });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    document.documentElement.lang = bn ? "bn" : "en";
    return () => { document.documentElement.lang = "bn"; };
  }, [bn]);

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
      <Navbar lang={lang} setLang={setLang} usdBdt={fx.usdBdt} fxLive={fx.live} onOpenEcosystem={() => setIsEcosystemOpen(true)} isEcosystemOpen={isEcosystemOpen} />

      <main id="main" className="mx-auto max-w-[1320px] px-4 sm:px-6">
        {/* ============ HERO ============ */}
        <section aria-labelledby="hero-title" className="kp-hero grid items-center gap-10 pb-10 pt-12 sm:pt-16 lg:grid-cols-[1.08fr_.92fr] lg:gap-6 lg:pt-20">
          <div className="kp-rise">
            <span className="kp-chip font-semibold">
              <span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" /><span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-600" /></span>
              {bn ? "অ্যাকাউন্ট লাগে না · তথ্য থাকে আপনার ডিভাইসে" : "No account · your data stays on your device"}
            </span>

            <h1 id="hero-title" className="mt-6 text-[clamp(38px,6.2vw,76px)] font-semibold leading-[1.04] tracking-tight text-slate-900">
              {bn ? (
                <>পড়া, কাজ, সংসার আর মাঠ — <em className="kp-em">এক পথে</em> সব হিসাব।</>
              ) : (
                <>Study, work, home and field: <em className="kp-em">one honest path.</em></>
              )}
            </h1>

            <p className="mt-5 max-w-[34rem] text-[17px] leading-relaxed text-slate-600 sm:text-[19px]">
              {bn
                ? "বাংলাদেশের দৈনন্দিন কাজের জন্য ৯টি ব্যবহারিক টুল আর একজন বাংলা সহকারী। টাকার হিসাব নির্ধারিত নিয়মে, প্রতিটি সংখ্যার পাশে উৎস, আর কোনো তথ্য বানিয়ে বলা হয় না।"
                : "Nine practical tools and a Bangla assistant for everyday work in Bangladesh. Money maths follows fixed rules, every number shows its source, and nothing is made up."}
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
              <button type="button" onClick={() => window.dispatchEvent(new Event("kormopath:open-buddy"))} className="kp-intent-voice" aria-label={bn ? "বাডিকে বাংলায় বলুন" : "Ask Buddy by voice"} title={bn ? "বাডিকে বলুন" : "Ask Buddy"}>
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
                    <Link href={task.href} className={`kp-task ${query && i === 0 ? "kp-task-top" : ""}`}>
                      {bn ? task.bn : task.en}
                      {query && i === 0 ? <CornerDownLeft size={13} aria-hidden="true" /> : <ArrowUpRight size={13} aria-hidden="true" />}
                    </Link>
                  </li>
                ))
              )}
            </ul>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link href="/workspace" className="kp-btn-primary kp-btn-lg">
                <Briefcase size={18} /> {bn ? "ওয়ার্কস্পেস শুরু করুন" : "Start the Workspace"}
              </Link>
              <a href="#apps-showcase" className="kp-btn-ghost kp-btn-lg">
                {bn ? "সব টুল দেখুন" : "See all tools"} <ArrowRight size={17} />
              </a>
            </div>
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
            { icon: Lock, t: bn ? "লগইন নেই" : "No login", d: bn ? "নাম, ফোন বা ইমেইল চাওয়া হয় না" : "No name, phone or email asked" },
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
                <li key={stage.en} className="kp-life-stop">
                  <span className={`kp-life-node ring-1 ${stage.tone}`}><Icon size={20} /></span>
                  <span className="font-mono text-[12px] font-bold text-slate-500">{bn ? `০${"১২৩৪৫৬৭"[i]}` : `0${i + 1}`}</span>
                  <strong className="mt-1 block font-display text-[21px] font-semibold text-slate-900">{bn ? stage.bn : stage.en}</strong>
                  <span className="mt-1 block text-[14px] leading-snug text-slate-600">{bn ? stage.when.bn : stage.when.en}</span>
                  <span className="mt-3 flex flex-wrap gap-1.5">
                    {stage.links.map((link) => (
                      <Link key={link.href} href={link.href} className="kp-task !py-1 !text-[13px]">
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
              <p className="kp-eyebrow">{bn ? "৯টি টুল · তিনটি পথ" : "Nine tools · three paths"}</p>
              <h2 id="tools-title" className="mt-3 text-[clamp(30px,4vw,48px)] font-semibold leading-tight tracking-tight text-slate-900">
                {bn ? <>যা দরকার, <em className="kp-em">সেটাই খুলুন</em></> : <>Open <em className="kp-em">just what you need</em></>}
              </h2>
            </div>
            <p className="max-w-md text-[15px] text-slate-600">
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
                      <Link key={tool.id} href={tool.href} className="kp-tool group">
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

        {/* ============ WORKSPACE PIPELINE ============ */}
        <section aria-labelledby="pipeline-title" className="kp-pipeline mt-24">
          <div className="relative z-10 grid gap-10 lg:grid-cols-[.9fr_1.1fr] lg:items-center">
            <div>
              <p className="kp-eyebrow !text-orange-300">{bn ? "মূল কাজ · ওয়ার্কস্পেস" : "The flagship · Workspace"}</p>
              <h2 id="pipeline-title" className="mt-3 text-[clamp(30px,4vw,46px)] font-semibold leading-tight tracking-tight text-[#fbf3e8]">
                {bn ? <>সিভি থেকে <em className="kp-em-dark">টাকা হাতে</em> পর্যন্ত</> : <>From CV to <em className="kp-em-dark">money in hand</em></>}
              </h2>
              <p className="mt-4 max-w-md text-[16px] leading-relaxed text-[#e2d3c2]">
                {bn
                  ? "একজন ফ্রিল্যান্সারের চারটি ধাপ এক জায়গায়। প্রতিটি ধাপে কী হলো, কোন মডেল বা নিয়ম চলল, সবই খোলা লগে দেখা যায়।"
                  : "A freelancer's four steps in one place. Each step shows what ran, which model or rule, in an open log."}
              </p>
              <Link href="/workspace" className="kp-btn-sun kp-btn-lg mt-7">
                {bn ? "ওয়ার্কস্পেস খুলুন" : "Open the Workspace"} <ArrowRight size={17} />
              </Link>
            </div>
            <ol className="grid gap-3 sm:grid-cols-2">
              {PIPELINE.map((step) => (
                <li key={step.n} className="kp-step">
                  <span className="font-mono text-[13px] font-bold text-orange-300">{step.n}</span>
                  <strong className="mt-2 block font-display text-[22px] font-semibold text-[#fbf3e8]">{bn ? step.bn : step.en}</strong>
                  <span className="mt-1.5 block text-[14.5px] leading-relaxed text-[#d6c5b2]">{bn ? step.d.bn : step.d.en}</span>
                </li>
              ))}
            </ol>
          </div>
        </section>

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
      </main>

      <Footer />

      <EcosystemHub
        isOpen={isEcosystemOpen}
        onClose={() => setIsEcosystemOpen(false)}
        activePersona={null}
        onSelectPersona={() => {}}
        lang={lang}
        usdBdt={fx.usdBdt}
      />
    </div>
  );
}
