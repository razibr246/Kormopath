"use client";
import { useState, useEffect } from "react";
import {
  Play,
  Pause,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  Sun,
  Droplets,
  Wind,
  CheckCircle2,
  Calendar,
} from "lucide-react";

export interface AgriStage {
  id: number;
  titleBn: string;
  titleEn: string;
  seasonBn: string;
  durationDays: string;
  farmerAttire: string;
  toolsBn: string;
  descriptionBn: string;
  advisoryBn: string;
  color: string;
}

export const AGRI_STAGES: AgriStage[] = [
  {
    id: 1,
    titleBn: "১. জমি প্রস্তুতি ও লাঙল চাষ",
    titleEn: "1. Soil Preparation & Ploughing",
    seasonBn: "রবি / খরিফ মৌসুমের সূচনা",
    durationDays: "৭–১০ দিন",
    farmerAttire: "লুঙ্গি হাঁটুর উপরে তোলা, মাথায় গামছা বাঁধা",
    toolsBn: "ঐতিহ্যবাহী কাঠের লাঙল, মই ও আধুনিক পাওয়ার টিলার",
    descriptionBn: "মাটি নরম ও ঝুরঝুরে করতে ৩–৪ বার আড়াআড়ি চাষ দিয়ে মই দিয়ে সমান করা হয়। মাটির আর্দ্রতা রক্ষা ও আগাছা পরিষ্কার করা অত্যন্ত জরুরি।",
    advisoryBn: "মাটির পিএইচ (pH) ৬.০–৬.৫ এর মধ্যে রাখতে শতাংশ প্রতি ২ কেজি জৈব কম্পোস্ট বা গোবর সার প্রয়োগ করুন।",
    color: "#854d0e", // earthy brown
  },
  {
    id: 2,
    titleBn: "২. বীজ তলা তৈরি ও চারা রোপণ",
    titleEn: "2. Seedling Nursery & Sowing",
    seasonBn: "আমন / বোরো রোপণ মৌসুম",
    durationDays: "১৫–২০ দিন বয়সের চারা",
    farmerAttire: "হাতে কাঁদাযুক্ত গামছা, রোদের জন্য বাঁশের মাথাল",
    toolsBn: "বীজতলা সিডার, বাঁশের খুঁটি ও রোপণ রশি",
    descriptionBn: "পরিপক্ব সুস্থ চারা তুলে এনে কাদা জমিতে নির্দিষ্ট দূরত্বে (২০ সেমি × ১৫ সেমি) সোজা সারিতে রোপণ করা হয়, যাতে পর্যাপ্ত সূর্যালোক পৌঁছায়।",
    advisoryBn: "রোপণের সময় প্রতিটি গুচ্ছিতে ২–৩টি সুস্থ চারা ৩–৪ সেমি গভীরে পুঁততে হবে; বেশি গভীরে দিলে কুশি গজাতে দেরি হয়।",
    color: "#15803d", // vibrant plant green
  },
  {
    id: 3,
    titleBn: "৩. অগভীর নলকূপে সেচ ও পুষ্টি",
    titleEn: "3. Irrigation & Nutrient Delivery",
    seasonBn: "কুশি পর্যায় ও সক্রিয় বৃদ্ধি",
    durationDays: "প্রতি ১০–১২ দিন পর পর",
    farmerAttire: "হালকা সুতি কুর্তি, ড্রেনেজ পরিষ্কারে কোদাল হাতে",
    toolsBn: "সোলার/ডিজেল অগভীর পাম্প (STW), ড্রেন চ্যানেল",
    descriptionBn: "বোরো বা সবজি ক্ষেতে পানি আটকে না রেখে এডব্লিউডি (AWD - পর্যায়ক্রমিক ভিজানো ও শুকানো) পদ্ধতিতে সেচ দিলে পানি ও সেচের জ্বালানি খরচ কমে বলে গবেষণায় দেখা গেছে।",
    advisoryBn: "ইউরিয়া সার একসাথে না দিয়ে ৩ কিস্তিতে গুটি ইউরিয়া প্রয়োগ করুন। এতে নাইট্রোজেনের অপচয় রোধ হয়।",
    color: "#0284c7", // water blue
  },
  {
    id: 4,
    titleBn: "৪. নিবিড় পরিচর্যা ও ফসল পুষ্ট হওয়া",
    titleEn: "4. Crop Growth & Flowering",
    seasonBn: "থোড় ও শিষ পর্যায় (Golden Bloom)",
    durationDays: "২৫–৩৫ দিন",
    farmerAttire: "বাঁশের মাথাল, জৈব বালাইনাশক স্প্রে কিট",
    toolsBn: "ন্যাপস্যাক স্প্রেয়ার, আলোর ফাঁদ (Light Trap)",
    descriptionBn: "সবুজ ধানগাছ সোনালী শীষে রূপ নেয়। ক্ষতিকর মাজরা পোকা দমনে ক্ষতিকর রাসায়নিক পরিহার করে আলোর ফাঁদ ও ট্রাইকোডার্মা ব্যবহার করা হয়।",
    advisoryBn: "দানা বাঁধার সময় জমিতে যেন টান না পড়ে। ক্ষেতের আইলে ৫–৭ সেমি পানি ধরে রাখলে অপুষ্ট দানার হার কমে যায়।",
    color: "#d97706", // golden amber
  },
  {
    id: 5,
    titleBn: "৫. কাস্তে দিয়ে কর্তন ও মাড়াই",
    titleEn: "5. Harvesting & Threshing",
    seasonBn: "নবান্ন ও সোনালী ফসল সংগ্রহ",
    durationDays: "৩–৫ দিন",
    farmerAttire: "উৎসবমুখর নতুন গামছা ও ঐতিহ্যবাহী কাস্তে",
    toolsBn: "দাঁতালো কাস্তে, প্যাডেল থ্রেশার ও বাঁশের কুলা",
    descriptionBn: "শীষের ৮০% সোনালী রং ধারণ করলে সকালের শিশির শুকানোর পর কাটা শুরু হয়। মাড়াই শেষে কুলা দিয়ে বাতাসে উড়িয়ে ধুলোবালি ও চিটা আলাদা করা হয়।",
    advisoryBn: "ফসল কাটার পর আর্দ্রতা ১২% এ নামিয়ে আনতে অন্তত ৩–৪ দিন রোদে ভালোভাবে শুকিয়ে তবেই গুদামজাত বা মোকামে তুলুন।",
    color: "#b45309", // harvest gold
  },
  {
    id: 6,
    titleBn: "৬. মোকামে পরিবহন ও ন্যায্য মূল্য",
    titleEn: "6. Mandi Transport & Fair Arbitrage",
    seasonBn: "বাজারজাতকরণ ও আয় নিশ্চিতকরণ",
    durationDays: "২৪ ঘণ্টার মধ্যে আড়তে সরবরাহ",
    farmerAttire: "পরিচ্ছন্ন পাঞ্জাবি-লুঙ্গি, মোবাইল ডিজিটাল লেজার",
    toolsBn: "যৌথ মিনি ট্রাক, ডিজিটাল ওজন স্কেল ও HaatBazar AI",
    descriptionBn: "মধ্যস্বত্বভোগীদের এড়িয়ে সরাসরি মহাস্থান বা কাওরান বাজার মোকামে পণ্য পাঠানো হয়। অ্যাপে লাইভ দর দেখে সবচেয়ে লাভজনক পাইকার নির্বাচন করা হয়।",
    advisoryBn: "কয়েকজন কৃষক মিলে একটি ট্রাক ভাড়া করলে ভাড়া ভাগ হয়ে মণপ্রতি খরচ কমে। নিচের হিসাবযন্ত্রে নিজের ভাড়া বসিয়ে দেখুন।",
    color: "#059669", // prosperity emerald
  },
];

export function AgriculturalLifecycle() {
  const [activeStep, setActiveStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);

  // Auto-play timer
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setActiveStep((prev) => (prev + 1) % AGRI_STAGES.length);
    }, 4500);
    return () => clearInterval(interval);
  }, [isPlaying]);

  const stage = AGRI_STAGES[activeStep];

  return (
    <div className="rounded-3xl border border-amber-200/90 bg-gradient-to-b from-amber-50/40 via-white to-amber-50/20 p-5 sm:p-7 shadow-sm">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-amber-200/60 pb-4">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full border border-amber-300 bg-amber-100/70 px-3 py-1 text-[11px] font-bold text-amber-900 mb-1.5">
            <Sparkles size={13} className="text-amber-600 animate-spin" />
            <span>জীবন্ত কৃষি চক্র ও কৃষক পরিক্রমা • Interactive Agriculture Journey</span>
          </div>
          <h3 className="display text-[22px] sm:text-[26px] font-extrabold text-slate-900 tracking-tight">
            মাঠ থেকে মোকাম: দেশীয় কৃষকের পূর্ণাঙ্গ ফসলী জীবনচক্র
          </h3>
          <p className="text-[13px] text-slate-600">
            লাঙল চাষ থেকে শুরু করে ফসল কাটা ও পাইকারি বাজারে সর্বোচ্চ দাম নিশ্চিত করার ধারাবাহিক বাস্তবসম্মত ধাপ।
          </p>
        </div>

        {/* Stepper Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-[12px] font-bold transition-all shadow-xs ${
              isPlaying
                ? "bg-amber-600 text-white hover:bg-amber-700"
                : "border border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100"
            }`}
            title={isPlaying ? "এনিমেশন পজ করুন" : "স্বয়ংক্রিয় এনিমেশন চালু করুন"}
          >
            {isPlaying ? <Pause size={14} /> : <Play size={14} />}
            <span>{isPlaying ? "অটো-প্লে চলছে" : "প্লে করুন"}</span>
          </button>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setActiveStep((prev) => (prev - 1 + AGRI_STAGES.length) % AGRI_STAGES.length)}
              className="rounded-xl border border-slate-200 bg-white p-2 text-slate-700 hover:bg-slate-50 transition-colors shadow-xs"
              aria-label="Previous step"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={() => setActiveStep((prev) => (prev + 1) % AGRI_STAGES.length)}
              className="rounded-xl border border-slate-200 bg-white p-2 text-slate-700 hover:bg-slate-50 transition-colors shadow-xs"
              aria-label="Next step"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Progress Track */}
      <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 pt-4 pb-5">
        {AGRI_STAGES.map((s, idx) => {
          const isActive = idx === activeStep;
          const isDone = idx < activeStep;

          return (
            <button
              key={s.id}
              onClick={() => {
                setActiveStep(idx);
                setIsPlaying(false);
              }}
              className={`rounded-xl p-2.5 text-left transition-all border ${
                isActive
                  ? "border-amber-600 bg-amber-100/80 text-amber-950 font-bold shadow-xs ring-2 ring-amber-500/20"
                  : isDone
                  ? "border-emerald-200 bg-emerald-50/50 text-emerald-900 font-medium"
                  : "border-slate-200 bg-white/70 text-slate-600 hover:bg-slate-50"
              }`}
            >
              <div className="flex items-center justify-between text-[11px] mb-1">
                <span className="font-mono">ধাপ ০{idx + 1}</span>
                {isDone && <CheckCircle2 size={12} className="text-emerald-600" />}
              </div>
              <span className="text-[12px] block leading-tight line-clamp-1">
                {s.titleBn.split(".")[1]?.trim() || s.titleBn}
              </span>
            </button>
          );
        })}
      </div>

      {/* Interactive Main Stage Showcase with Dynamic SVG Vector Animation */}
      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr] items-center rounded-2xl border border-amber-200/80 bg-white p-5 sm:p-6 shadow-xs">
        {/* Animated Vector Canvas */}
        <div className="relative overflow-hidden rounded-2xl border border-amber-100 bg-gradient-to-b from-sky-100 via-amber-50/40 to-emerald-50/60 p-4 h-[260px] sm:h-[300px] flex items-center justify-center">
          {/* Animated Sky Elements */}
          <div className="absolute top-4 left-6 flex items-center gap-2 text-amber-500 animate-pulse">
            <Sun size={32} className="text-amber-500 drop-shadow-md" />
            <span className="text-[11px] font-bold text-amber-800 bg-white/80 px-2 py-0.5 rounded-full border border-amber-200 backdrop-blur-xs">
              {stage.seasonBn}
            </span>
          </div>

          {/* Natural Animated SVG Canvas Representing Stage */}
          <svg
            viewBox="0 0 500 240"
            className="w-full h-full max-h-[220px]"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Horizon & Sky Backdrop */}
            <defs>
              <linearGradient id="groundGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor={stage.id === 1 ? "#a16207" : stage.id === 5 ? "#d97706" : "#16a34a"} />
                <stop offset="100%" stopColor={stage.id === 1 ? "#713f12" : stage.id === 5 ? "#b45309" : "#14532d"} />
              </linearGradient>
              <linearGradient id="waterGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#38bdf8" />
                <stop offset="100%" stopColor="#0284c7" />
              </linearGradient>
            </defs>

            {/* Distant River & Village Trees */}
            <path
              d="M0 130 Q120 115 250 128 T500 125 L500 145 L0 145 Z"
              fill="#86efac"
              opacity="0.6"
            />
            {/* Village Palm & Mango Trees Silhouette */}
            <g fill="#15803d" opacity="0.45">
              <circle cx="80" cy="115" r="16" />
              <circle cx="95" cy="112" r="14" />
              <circle cx="410" cy="116" r="15" />
              <circle cx="430" cy="113" r="18" />
            </g>

            {/* Agricultural Soil / Paddy Ground */}
            <rect x="0" y="140" width="500" height="100" fill="url(#groundGrad)" />

            {/* Dynamic Stage Elements */}
            {stage.id === 1 && (
              /* Stage 1: Ploughing & Soil Preparation */
              <g className="transition-all duration-700">
                {/* Furrow Lines */}
                <line x1="0" y1="165" x2="500" y2="165" stroke="#78350f" strokeWidth="3" strokeDasharray="8 6" />
                <line x1="0" y1="190" x2="500" y2="190" stroke="#78350f" strokeWidth="4" strokeDasharray="12 6" />
                <line x1="0" y1="215" x2="500" y2="215" stroke="#78350f" strokeWidth="5" strokeDasharray="14 7" />

                {/* Farmer with Lungi & Bullock Plough / Power Tiller */}
                <g transform="translate(180, 75)">
                  {/* Farmer Head with Red/Green Gamcha */}
                  <circle cx="50" cy="30" r="11" fill="#c2410c" />
                  <path d="M40 24 Q50 15 60 24" fill="#dc2626" stroke="#991b1b" strokeWidth="3" />
                  {/* Torso with fold */}
                  <path d="M42 41 L58 41 L55 85 L45 85 Z" fill="#b45309" />
                  {/* Folded Lungi at knees */}
                  <path d="M42 70 L58 70 L56 100 L44 100 Z" fill="#047857" stroke="#065f46" strokeWidth="1.5" />
                  {/* Legs in mud */}
                  <line x1="47" y1="100" x2="45" y2="125" stroke="#9a3412" strokeWidth="4" />
                  <line x1="53" y1="100" x2="57" y2="125" stroke="#9a3412" strokeWidth="4" />
                  {/* Arms holding plough handle */}
                  <line x1="44" y1="52" x2="25" y2="75" stroke="#9a3412" strokeWidth="3" />
                  <line x1="56" y1="52" x2="25" y2="75" stroke="#9a3412" strokeWidth="3" />
                  {/* Wooden Plough (লাঙল) */}
                  <line x1="25" y1="75" x2="20" y2="130" stroke="#451a03" strokeWidth="5" />
                  <polygon points="12,130 28,130 20,115" fill="#1e293b" />
                  {/* Tiller Shaft */}
                  <line x1="20" y1="120" x2="-35" y2="105" stroke="#451a03" strokeWidth="4" />
                </g>
              </g>
            )}

            {stage.id === 2 && (
              /* Stage 2: Sowing & Planting in Waterlogged Paddy */
              <g className="transition-all duration-700">
                {/* Water layer */}
                <rect x="0" y="140" width="500" height="25" fill="url(#waterGrad)" opacity="0.75" />
                {/* Rice Seedling Bunches in Soil */}
                {[30, 70, 110, 150, 190, 230, 270, 310, 350, 390, 430, 470].map((x, i) => (
                  <g key={i} transform={`translate(${x}, 150)`}>
                    <line x1="0" y1="0" x2="-4" y2="-18" stroke="#4ade80" strokeWidth="2.5" />
                    <line x1="0" y1="0" x2="0" y2="-22" stroke="#22c55e" strokeWidth="3" />
                    <line x1="0" y1="0" x2="5" y2="-17" stroke="#16a34a" strokeWidth="2.5" />
                  </g>
                ))}
                {/* Farmer bending to plant with conical bamboo sunhat (মাথাল) */}
                <g transform="translate(220, 90)">
                  {/* Bamboo Mathal Hat */}
                  <polygon points="35,18 75,18 55,2" fill="#ca8a04" stroke="#a16207" strokeWidth="2" />
                  {/* Bending Body */}
                  <path d="M45 28 Q60 38 48 68" fill="none" stroke="#ea580c" strokeWidth="12" strokeLinecap="round" />
                  {/* Lungi in water */}
                  <path d="M44 65 Q48 85 40 98" fill="none" stroke="#047857" strokeWidth="14" strokeLinecap="round" />
                  {/* Extended Arm planting seedling */}
                  <line x1="45" y1="42" x2="68" y2="65" stroke="#c2410c" strokeWidth="3.5" />
                  <line x1="68" y1="65" x2="72" y2="78" stroke="#22c55e" strokeWidth="3" />
                </g>
              </g>
            )}

            {stage.id === 3 && (
              /* Stage 3: Irrigation & Water Channel Flow */
              <g className="transition-all duration-700">
                {/* Flowing Water Canal */}
                <path
                  d="M0 160 Q150 175 300 162 T500 170 L500 195 Q320 185 180 200 T0 185 Z"
                  fill="url(#waterGrad)"
                />
                {/* Ripples */}
                <path d="M50 172 Q80 168 110 172" stroke="#ffffff" strokeWidth="2" fill="none" opacity="0.8" />
                <path d="M220 178 Q250 174 280 178" stroke="#ffffff" strokeWidth="2" fill="none" opacity="0.8" />
                {/* Shallow Tubewell Pump (STW) with gushing pipe */}
                <g transform="translate(360, 110)">
                  <rect x="0" y="25" width="30" height="22" fill="#334155" rx="3" />
                  {/* Pump Outlet Pipe */}
                  <path d="M5 32 L-25 32 Q-35 32 -38 48" fill="none" stroke="#64748b" strokeWidth="8" />
                  {/* Gushing Water Flow */}
                  <path d="M-38 48 Q-42 62 -30 68" fill="none" stroke="#38bdf8" strokeWidth="7" strokeLinecap="round" />
                </g>
                {/* Farmer checking drainage channel */}
                <g transform="translate(130, 85)">
                  <circle cx="30" cy="22" r="10" fill="#9a3412" />
                  <line x1="30" y1="32" x2="30" y2="75" stroke="#d97706" strokeWidth="8" />
                  <line x1="30" y1="75" x2="25" y2="105" stroke="#047857" strokeWidth="6" />
                  <line x1="30" y1="75" x2="35" y2="105" stroke="#047857" strokeWidth="6" />
                  {/* Kodal / Spade (কোদাল) */}
                  <line x1="28" y1="45" x2="55" y2="75" stroke="#451a03" strokeWidth="3" />
                  <polygon points="50,75 62,75 58,88" fill="#475569" />
                </g>
              </g>
            )}

            {stage.id === 4 && (
              /* Stage 4: Crop Maturation & Lush Golden Ears */
              <g className="transition-all duration-700">
                {/* Swaying Golden Paddy Ears */}
                {[20, 55, 90, 125, 160, 195, 230, 265, 300, 335, 370, 405, 440, 475].map((x, i) => (
                  <g key={i} transform={`translate(${x}, 150)`}>
                    <path d="M0 40 Q5 15 -10 -25" stroke="#16a34a" strokeWidth="3" fill="none" />
                    {/* Golden Grain Ear (শীষ) */}
                    <path d="M-10 -25 Q-18 -38 -5 -50" stroke="#f59e0b" strokeWidth="4.5" strokeLinecap="round" fill="none" />
                  </g>
                ))}
                {/* Light Trap / Biological Care Lantern */}
                <g transform="translate(380, 95)">
                  <line x1="20" y1="0" x2="20" y2="85" stroke="#78350f" strokeWidth="4" />
                  <polygon points="5,25 35,25 20,5" fill="#fef08a" stroke="#ca8a04" strokeWidth="2" />
                  <circle cx="20" cy="22" r="6" fill="#facc15" className="animate-ping" />
                </g>
                {/* Farmer inspecting grain ripeness */}
                <g transform="translate(140, 85)">
                  <polygon points="35,16 75,16 55,2" fill="#ca8a04" stroke="#a16207" strokeWidth="2" />
                  <circle cx="55" cy="22" r="9" fill="#c2410c" />
                  <path d="M55 31 L55 78" stroke="#b45309" strokeWidth="8" />
                  <path d="M55 78 L52 105" stroke="#047857" strokeWidth="6" />
                  <line x1="55" y1="45" x2="35" y2="58" stroke="#9a3412" strokeWidth="3" />
                </g>
              </g>
            )}

            {stage.id === 5 && (
              /* Stage 5: Sickle Harvesting & Threshing with Kula */
              <g className="transition-all duration-700">
                {/* Harvested sheaves tied with straw */}
                {[60, 140, 390, 450].map((x, i) => (
                  <g key={i} transform={`translate(${x}, 160)`}>
                    <polygon points="0,30 20,30 10,-5" fill="#d97706" stroke="#b45309" strokeWidth="1.5" />
                    <line x1="2" y1="15" x2="18" y2="15" stroke="#78350f" strokeWidth="2" />
                  </g>
                ))}
                {/* Farmer harvesting with sickle (কাস্তে) */}
                <g transform="translate(220, 88)">
                  <polygon points="35,15 75,15 55,1" fill="#ca8a04" stroke="#a16207" strokeWidth="2" />
                  <circle cx="55" cy="21" r="9" fill="#c2410c" />
                  {/* Bending posture */}
                  <path d="M55 30 Q65 48 50 78" fill="none" stroke="#ea580c" strokeWidth="10" strokeLinecap="round" />
                  <path d="M50 78 L45 106" stroke="#047857" strokeWidth="7" />
                  {/* Sickle (কাস্তে) Curve */}
                  <path d="M54 52 Q72 65 65 78 Q55 82 50 72" fill="none" stroke="#94a3b8" strokeWidth="3.5" />
                  <line x1="50" y1="72" x2="48" y2="66" stroke="#78350f" strokeWidth="4" />
                </g>
              </g>
            )}

            {stage.id === 6 && (
              /* Stage 6: Direct Mandi Transport (Truck & Digital Price) */
              <g className="transition-all duration-700">
                {/* Road surface */}
                <rect x="0" y="170" width="500" height="70" fill="#334155" />
                <line x1="0" y1="205" x2="500" y2="205" stroke="#facc15" strokeWidth="3" strokeDasharray="20 15" />

                {/* Shared Farmers' Pickup Truck */}
                <g transform="translate(120, 95)">
                  {/* Truck Body */}
                  <rect x="0" y="30" width="130" height="45" fill="#0284c7" rx="4" />
                  {/* Truck Cabin */}
                  <path d="M130 45 L155 45 L175 60 L175 75 L130 75 Z" fill="#0369a1" />
                  {/* Window */}
                  <polygon points="135,48 152,48 165,60 135,60" fill="#e0f2fe" />
                  {/* Fresh Produce Sacks Loaded */}
                  <circle cx="25" cy="22" r="14" fill="#d97706" />
                  <circle cx="50" cy="20" r="15" fill="#16a34a" />
                  <circle cx="75" cy="21" r="14" fill="#dc2626" />
                  <circle cx="100" cy="22" r="14" fill="#ea580c" />
                  {/* Wheels */}
                  <circle cx="35" cy="75" r="16" fill="#0f172a" />
                  <circle cx="35" cy="75" r="7" fill="#94a3b8" />
                  <circle cx="145" cy="75" r="16" fill="#0f172a" />
                  <circle cx="145" cy="75" r="7" fill="#94a3b8" />
                </g>

                {/* Mandi Rate Marker Badge */}
                <g transform="translate(340, 105)">
                  <rect x="0" y="0" width="125" height="48" fill="#ffffff" rx="8" stroke="#10b981" strokeWidth="2" filter="drop-shadow(0 2px 4px rgba(0,0,0,0.1))" />
                  <text x="10" y="20" fill="#065f46" fontSize="10" fontWeight="bold">কাওরান বাজার পাইকারি</text>
                  <text x="10" y="38" fill="#047857" fontSize="14" fontWeight="800">ন্যায্য দাম</text>
                </g>
              </g>
            )}
          </svg>
        </div>

        {/* Stage Data & Farmer Advisory */}
        <div className="space-y-3.5">
          <div className="flex items-center justify-between">
            <span
              className="text-[11px] font-extrabold uppercase px-2.5 py-0.5 rounded-full"
              style={{ backgroundColor: `${stage.color}18`, color: stage.color }}
            >
              {stage.titleEn}
            </span>
            <span className="text-[12px] font-semibold text-slate-500 flex items-center gap-1">
              <Calendar size={13} /> স্থায়িত্ব: <strong>{stage.durationDays}</strong>
            </span>
          </div>

          <h4 className="display text-[22px] font-bold text-slate-900 leading-tight">
            {stage.titleBn}
          </h4>

          <p className="text-[14px] text-slate-600 leading-relaxed">
            {stage.descriptionBn}
          </p>

          <div className="grid grid-cols-2 gap-2 text-[12px]">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-2.5">
              <span className="block font-bold text-slate-800">ব্যবহৃত কৃষি সরঞ্জাম:</span>
              <span className="text-slate-600">{stage.toolsBn}</span>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-2.5">
              <span className="block font-bold text-slate-800">কৃষকের পরিধেয় ও কৌশল:</span>
              <span className="text-slate-600">{stage.farmerAttire}</span>
            </div>
          </div>

          {/* Expert Field Advisory */}
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-3 text-[12px] text-emerald-950">
            <strong className="block text-emerald-800 mb-0.5">🌾 বাংলাদেশ কৃষি গবেষণা কাউন্সিল (BARC) পরামর্শ:</strong>
            <span>{stage.advisoryBn}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
