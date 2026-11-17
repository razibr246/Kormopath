"use client";

import { useEffect, useState, useRef, useMemo, type FormEvent, type KeyboardEvent } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  MessageCircle,
  Send,
  Volume2,
  VolumeX,
  Brain,
  CheckSquare,
  ShieldCheck,
  Users,
  Compass,
  ArrowRight,
  ExternalLink,
  Globe,
  X,
  Copy,
  Mic,
  Square,
} from "lucide-react";
import { banglaShare, prepareBanglaSpeech } from "@/lib/banglaSpeech";
import { storageKey, usePersistentState } from "@/lib/clientStore";

export const CREW_APPS = [
  { id: "haatbazar", bnName: "হাটবাজার", name: "HaatBazar AI", tag: "কৃষি ও আবহাওয়া", route: "/haatbazar", icon: "🌾" },
  { id: "krishi", bnName: "মাঠসাথী", name: "MaathSathi", tag: "জমি, কাজ ও পশুপাখি", route: "/krishi", icon: "🚜" },
  { id: "rokkha", bnName: "রক্ষা", name: "Rokkha", tag: "প্রতারণা ও দুর্যোগে সুরক্ষা", route: "/rokkha", icon: "🛡️" },
  { id: "kormopath", bnName: "ওয়ার্কস্পেস", name: "KormoPath Workspace", tag: "সিভি থেকে পেমেন্ট", route: "/workspace", icon: "🧭" },
  { id: "chuktiguard", bnName: "চুক্তিগার্ড", name: "ChuktiGuard", tag: "আইন ও বিভ্রাট ধারা", route: "/chuktiguard", icon: "🛡️" },
  { id: "feeguard", bnName: "ফি-গার্ড", name: "FeeGuard BD", tag: "বৈদেশিক মুদ্রা ও কর", route: "/feeguard", icon: "৳" },
  { id: "admitbuddy", bnName: "অ্যাডমিট বাডি", name: "AdmitBuddy", tag: "বিশ্ববিদ্যালয় ভর্তি", route: "/admitbuddy", icon: "🎓" },
  { id: "mediscan", bnName: "মেডিস্ক্যান", name: "MediScan BD", tag: "প্রেসক্রিপশন ও সতর্কতা", route: "/mediscan", icon: "💊" },
  { id: "shohoj", bnName: "সহজ বাজেট", name: "Shohoj Budget", tag: "পয়সা বাজেট ও হিসাব", route: "/shohoj-budget", icon: "📊" },
  { id: "probaho", bnName: "প্রবাহ কোচ", name: "Probaho Coach", tag: "ভাইভা অনুশীলন", route: "/probaho", icon: "🎙️" },
] as const;

export type AppId = (typeof CREW_APPS)[number]["id"];

/** Tools a reply names (Bangla or English), so the answer can offer one-tap "open" buttons. */
const APP_MENTIONS: Array<[AppId, RegExp]> = [
  ["haatbazar", /হাটবাজার|haat\s*bazar/i],
  ["krishi", /মাঠসাথী|maath\s*sathi/i],
  ["rokkha", /রক্ষা|rokkha/i],
  ["kormopath", /ওয়ার্কস্পেস|workspace/i],
  ["chuktiguard", /চুক্তিগার্ড|chukti\s*guard/i],
  ["feeguard", /ফি-?গার্ড|fee\s*guard/i],
  ["admitbuddy", /অ্যাডমিট\s*বাডি|admit\s*buddy/i],
  ["mediscan", /মেডিস্ক্যান|medi\s*scan/i],
  ["shohoj", /সহজ\s*বাজেট|shohoj/i],
  ["probaho", /প্রবাহ|probaho/i],
];
/** Put numbered steps (১. ২. or 1. 2.) on their own lines when a reply runs them together. */
function formatReply(text: string) {
  return text.replace(/\s+(?=(?:[০-৯]|[0-9])\.\s)/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}

function mentionedApps(text: string) {
  const normalized = text.normalize("NFC");
  return CREW_APPS.filter((app) => APP_MENTIONS.some(([id, re]) => id === app.id && re.test(normalized))).slice(0, 3);
}

type Message = {
  role: "user" | "assistant";
  content: string;
  unverified?: boolean;
  sources?: Array<{ title: string; url: string }>;
};

type AssistantTab = "talk" | "tasks" | "crew" | "path" | "security";
type AssistantMode = "manual" | "agent";

function appForPath(path: string | null): AppId {
  if (path?.startsWith("/haatbazar")) return "haatbazar";
  if (path?.startsWith("/krishi")) return "krishi";
  if (path?.startsWith("/rokkha")) return "rokkha";
  if (path?.startsWith("/chuktiguard")) return "chuktiguard";
  if (path?.startsWith("/feeguard")) return "feeguard";
  if (path?.startsWith("/admitbuddy")) return "admitbuddy";
  if (path?.startsWith("/mediscan")) return "mediscan";
  if (path?.startsWith("/shohoj-budget")) return "shohoj";
  if (path?.startsWith("/probaho")) return "probaho";
  return "kormopath";
}

const CHIP_SUGGESTIONS_EN: Record<AppId, string[]> = {
  rokkha: ["Is this SMS a scam?", "Someone wants my OTP", "I lost money to a scam", "Cyclone go-bag list"],
  krishi: ["Add a task by voice", "Can I spray today?", "Which support can I get?", "Livestock helpline?"],
  haatbazar: [
    "What to plant?",
    "Compare the options",
    "Water today?",
    "Harvest date?",
    "Next crop?",
    "Report a problem",
    "Talk to my officer",
  ],
  kormopath: [
    "Audit my freelance profile",
    "How does verified viva work?",
    "Check contract blackout clause",
    "Direct client vs marketplace fee",
    "Verify skill passport",
  ],
  chuktiguard: [
    "48h blackout clause rules",
    "Draft freelance contract",
    "NBR ITES tax exemption notice",
    "Milestone delivery schedule",
  ],
  feeguard: [
    "Compare Upwork vs direct wire",
    "Calculate 2.5% cash incentive",
    "Best FX rate for USD to BDT",
    "Verify fee reconciliation",
  ],
  admitbuddy: [
    "Which university matches my GPA?",
    "Compare selective public unis",
    "Check admission deadline",
    "SOP readability check",
  ],
  mediscan: [
    "Explain prescription text",
    "Check known medicine cautions",
    "What are emergency signs?",
    "Food timing instructions",
  ],
  shohoj: [
    "Today's spending limit",
    "Calculate bKash cashout fee",
    "Split dinner bill with team",
    "Monthly budget health check",
  ],
  probaho: [
    "Start tech viva practice",
    "Evaluate STAR answer structure",
    "Check speaking pace & fillers",
    "Write custom interview question",
  ],
};

const CHIP_SUGGESTIONS_BN: Record<AppId, string[]> = {
  rokkha: ["এই এসএমএস কি প্রতারণা?", "কেউ ওটিপি চাইছে", "প্রতারণায় টাকা হারিয়েছি", "ঘূর্ণিঝড়ের প্রস্তুতি"],
  krishi: ["কথা বলে কাজ যোগ", "আজ স্প্রে করা যাবে?", "কোন সরকারি সহায়তা পাব?", "পশুর জন্য কোন নম্বরে ফোন?"],
  haatbazar: [
    "কী চাষ করব?",
    "বিকল্পগুলো তুলনা করুন",
    "আজ পানি দেব?",
    "ফসল কাটার সময় কখন?",
    "পরের ফসল বাছুন",
    "সমস্যা জানান",
    "কৃষি কর্মকর্তার সঙ্গে কথা বলুন",
  ],
  kormopath: [
    "কোন টুল দিয়ে শুরু করব?",
    "কর্মপরিকল্পনার ধাপগুলো বুঝুন",
    "নির্ভরযোগ্য হিসাব কীভাবে কাজ করে?",
    "দক্ষতার পাসপোর্ট যাচাই করুন",
  ],
  chuktiguard: [
    "ইন্টারনেট-বিভ্রাট সুরক্ষা ধারা",
    "কর অব্যাহতির প্রত্যয়ন",
    "চুক্তির খসড়া তৈরি করুন",
    "পেমেন্ট শর্তাদি নির্ধারণ",
  ],
  feeguard: [
    "মার্কেটপ্লেস ও সরাসরি পেমেন্ট তুলনা",
    "সরকারি ২.৫% নগদ প্রণোদনা",
    "পেমেন্টের সবচেয়ে সাশ্রয়ী পথ",
    "পয়সা নির্ভুল হিসাব যাচাই",
  ],
  admitbuddy: [
    "আমার জন্য কোন বিশ্ববিদ্যালয় মানানসই?",
    "বিজ্ঞপ্তির শেষ তারিখ ও শর্ত",
    "আবেদনের ভারসাম্য পরীক্ষা",
    "এসওপি লেখার পরামর্শ",
  ],
  mediscan: [
    "প্রেসক্রিপশনের লেখা বুঝিয়ে বলুন",
    "ওষুধের মিথস্ক্রিয়া সম্পর্কে জানান",
    "জরুরি লক্ষণগুলো কী?",
    "খাবারের সঙ্গে সেবনের নিয়ম",
  ],
  shohoj: [
    "আজ কত খরচ করা যাবে?",
    "বিকাশ ক্যাশআউট খরচ কত?",
    "নগদ ক্যাশআউট চার্জ হিসাব",
    "দলের বিল সমান ভাগে ভাগ",
  ],
  probaho: [
    "প্রযুক্তিগত ভাইভা শুরু করুন",
    "উত্তর বলার অনুশীলন ও স্কোর",
    "কথার গতি ও অতিরিক্ত শব্দ",
    "স্টার পদ্ধতিতে উত্তর সাজান",
  ],
};

const APP_TASKS: Record<AppId, Array<{ title: string; desc: string; query: string }>> = {
  rokkha: [
    { title: "সন্দেহজনক বার্তা যাচাই", desc: "এসএমএস বা কলের কথা পেস্ট করুন; ওটিপি, ভুল-লেনদেন, লটারি, লিংক — কোন লক্ষণ, কোথায় লেখা।", query: "Is this SMS a scam?" },
    { title: "টাকা পাঠানোর আগে বিরতি", desc: "চাপের লক্ষণ থাকলে কাউন্টডাউন; পুরোনো নম্বরে ফোন করে যাচাই, বিশ্বস্ত কাউকে জানানো।", query: "Someone wants my OTP" },
    { title: "টাকা হারালে কী করবেন", desc: "অফিসিয়াল হেল্পলাইন, জিডির জন্য রিপোর্ট, বাংলাদেশ ব্যাংক CIPC-তে অভিযোগের ধাপ।", query: "I lost money to a scam" },
  ],
  krishi: [
    { title: "আজকের কাজ ও আবহাওয়া", desc: "জমির কাজের তালিকা, স্প্রে-সেচের দিনে পূর্বাভাসের সতর্কতা।", query: "Can I spray today?" },
    { title: "সরকারি সহায়তার পথ", desc: "কৃষি কার্ড থেকে শুরু; কোন সেবার আগে কোনটা লাগে।", query: "Which support can I get?" },
    { title: "পশুপাখি ও মাছের খাতা", desc: "দুধ, ডিম, মাছ, খরচ-বিক্রি আর অফিসের দেওয়া টিকার তারিখ।", query: "Livestock helpline?" },
  ],
  haatbazar: [
    { title: "কী চাষ করবেন ও সার প্রস্তুত", desc: "মৌসুম, জমি ও বীজের প্রস্তুতি; সারের মাত্রা প্যাকেটের নির্দেশনা বা কৃষি কর্মকর্তার কাছ থেকে নিন।", query: "What to plant?" },
    { title: "ওষুধ ছিটানোর আবহাওয়া দেখুন", desc: "বৃষ্টি ও বাতাসের পূর্বাভাসের উপর ভিত্তি করে স্প্রে উইন্ডো দেখুন।", query: "Water today?" },
    { title: "ট্রাকভাড়া ভাগের হিসাব", desc: "পাইকারি বাজারে পণ্য পরিবহনের খরচ কৃষকদের মধ্যে ভাগ করুন।", query: "Compare the options" },
  ],
  kormopath: [
    { title: "প্রোফাইল অডিট সম্পন্ন করুন", desc: "সিভি ও গিটহাব প্রমাণের ভিত্তিতে বাস্তবসম্মত রেটিং নিন।", query: "Audit my freelance profile" },
    { title: "কোডিং ভাইভা সম্পন্ন করুন", desc: "ওয়েব ওয়ার্কার স্যান্ডবক্সে কোড রান করে পাসপোর্ট আর্ন করুন।", query: "Verify skill passport" },
    { title: "চুক্তি ও ট্যাক্স চিঠি পান", desc: "৪৮ ঘণ্টা বিভ্রাট ধারা ও এনবিআর আইটিইএস নোটিশ তৈরি করুন।", query: "Check contract blackout clause" },
  ],
  chuktiguard: [
    { title: "ইন্টারনেট বিভ্রাট ধারা যুক্ত করুন", desc: "জাতীয় বা আঞ্চলিক নেটওয়ার্ক ব্ল্যাকআউটে সুরক্ষা নিশ্চিত করুন।", query: "48h blackout clause rules" },
    { title: "কর অব্যাহতির নোটিশ যোগ", desc: "বৈধ রেমিট্যান্স চালানে সরকারি প্রজ্ঞাপনের রেফারেন্স রাখুন।", query: "NBR ITES tax exemption notice" },
  ],
  feeguard: [
    { title: "পেমেন্ট চ্যানেলের ফি তুলনা", desc: "আপওয়ার্ক ২০% বনাম সুইফট ডিরেক্ট ওয়্যারের মোট প্রাপ্তি দেখুন।", query: "Compare Upwork vs direct wire" },
    { title: "২.৫% নগদ সরকারি প্রণোদনা", desc: "ব্যাংকিং চ্যানেলে আসা রেমিট্যান্সে প্রণোদনা হিসাব করুন।", query: "Calculate 2.5% cash incentive" },
  ],
  admitbuddy: [
    { title: "বিশ্ববিদ্যালয় তালিকার ভারসাম্য", desc: "স্বপ্নের, মাঝারি ও নিরাপদ পছন্দের ভারসাম্য যাচাই করুন।", query: "Which university matches my GPA?" },
    { title: "অফিসিয়াল বিজ্ঞপ্তির তারিখ", desc: "ভর্তি বিজ্ঞপ্তি থেকে নিশ্চিত শেষ তারিখ যোগ করুন।", query: "Check admission deadline" },
  ],
  mediscan: [
    { title: "হাতে লেখা প্রেসক্রিপশন যাচাই", desc: "ছবি থেকে শনাক্ত হওয়া ওষুধের তালিকা মিলিয়ে নিন।", query: "Explain prescription text" },
    { title: "ওষুধের মিথস্ক্রিয়া সতর্কতা", desc: "একাধিক ওষুধের মধ্যে ক্ষতিকর সংমিশ্রণ পরীক্ষা করুন।", query: "Check known medicine cautions" },
  ],
  shohoj: [
    { title: "আজকের ব্যয়ের সীমা দেখুন", desc: "মাসিক বাজেটের ভিত্তিতে আজকের নিরাপদ খরচ জানুন।", query: "Today's spending limit" },
    { title: "ক্যাশ আউট চার্জ বাঁচান", desc: "বিকাশ ও নগদের এজেন্ট বনাম এটিএম ফি তুলনা করুন।", query: "Calculate bKash cashout fee" },
  ],
  probaho: [
    { title: "এক মিনিটের ভাইভা স্পারিং", desc: "ইংরেজি বা বাংলায় দ্রুত গুছিয়ে উত্তর দেওয়ার অনুশীলন।", query: "Start tech viva practice" },
    { title: "স্টার কাঠামোর ফিডব্যাক", desc: "পরিস্থিতি, কাজ, পদক্ষেপ ও ফলাফলের উপস্থিতি যাচাই করুন।", query: "Evaluate STAR answer structure" },
  ],
};

/**
 * Glowing pearl orb: a warm KormoPath halo, a frosted glass ring and a slowly turning
 * pastel core (orange, haldi gold, brand blue). `active` makes it breathe while Buddy
 * listens or speaks.
 */
export function SiriOrb({
  size = "md",
  active = false,
  onClick,
  label = "Toggle voice speaking or listening",
}: {
  size?: "sm" | "md" | "lg" | "xl";
  active?: boolean;
  onClick?: () => void;
  label?: string;
}) {
  const dimensions =
    size === "sm"
      ? "h-7 w-7"
      : size === "lg"
      ? "h-[68px] w-[68px] sm:h-[76px] sm:w-[76px]"
      : size === "xl"
      ? "h-[64px] w-[64px] sm:h-[72px] sm:w-[72px]"
      : "h-11 w-11";

  const orb = (
    <span className={`kp-orb ${active ? "kp-orb-active" : ""}`} aria-hidden="true">
      <span className="kp-orb-halo" />
      <span className="kp-orb-ring" />
      <span className="kp-orb-core">
        <span className="kp-orb-swirl" />
        <span className="kp-orb-blob kp-orb-blob-a" />
        <span className="kp-orb-blob kp-orb-blob-b" />
        <span className="kp-orb-blob kp-orb-blob-c" />
        <span className="kp-orb-gloss" />
      </span>
      <span className="kp-orb-eye" />
      {/* Three small dots circling the orb: it is alive, faster while listening or speaking. */}
      <span className="kp-orb-dots"><i /><i /><i /></span>
    </span>
  );

  const className = `relative grid shrink-0 place-items-center rounded-full ${dimensions} ${
    onClick ? "cursor-pointer transition-transform hover:scale-105 active:scale-95" : ""
  }`;

  return onClick ? (
    <button type="button" onClick={onClick} aria-label={label} className={`${className} border-0 bg-transparent p-0`}>
      {orb}
    </button>
  ) : (
    <span className={className} aria-hidden="true">
      {orb}
    </span>
  );
}

export function Buddy() {
  const pathname = usePathname();
  const routeApp = appForPath(pathname);
  const [selectedApp, setSelectedApp] = useState<AppId>(routeApp);
  const [open, setOpen] = useState(false);
  // Movable launcher: drag anywhere, it snaps to the nearest side and remembers the spot on this device.
  type DockPos = { side: "left" | "right"; bottom: number };
  const [dock, setDock] = usePersistentState<DockPos>(storageKey("platform", "buddyDock"), { side: "right", bottom: 16 }, (raw) => {
    const r = raw as Partial<DockPos> | null;
    return r && (r.side === "left" || r.side === "right") && typeof r.bottom === "number" && Number.isFinite(r.bottom) ? { side: r.side, bottom: Math.min(2000, Math.max(8, r.bottom)) } : null;
  });
  const [dragAt, setDragAt] = useState<{ left: number; top: number } | null>(null);
  const dragRef = useRef<{ x: number; y: number; left: number; top: number; moved: boolean } | null>(null);
  const suppressClickRef = useRef(false);
  const [mode, setMode] = useState<AssistantMode>("agent");
  const [tab, setTab] = useState<AssistantTab>("talk");
  const [deepThinking, setDeepThinking] = useState(true);
  const [browseEnabled, setBrowseEnabled] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [isNaturalVoice, setIsNaturalVoice] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  // Bangla first: replies, suggestions, speech recognition and voice all follow this.
  const [chipLang, setChipLang] = useState<"en" | "bn">("bn");
  const [voiceNote, setVoiceNote] = useState("");
  const [interim, setInterim] = useState("");
  const bn = chipLang === "bn";
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "আসসালামু আলাইকুম, আমি বাডি, আপনার বাংলা সহকারী। নিচের কোনো প্রশ্ন বেছে নিন, লিখুন, অথবা গোলকটি ছুঁয়ে বাংলায় কথা বলুন।",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const chatScrollRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<unknown>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const speechUrlRef = useRef<string | null>(null);
  const speechAbortRef = useRef<AbortController | null>(null);
  const [speechLoading, setSpeechLoading] = useState(false);

  const appMeta = useMemo(() => CREW_APPS.find((a) => a.id === selectedApp) ?? CREW_APPS[0], [selectedApp]);
  const suggestions = useMemo(() => {
    return chipLang === "en"
      ? CHIP_SUGGESTIONS_EN[selectedApp] ?? CHIP_SUGGESTIONS_EN.haatbazar
      : CHIP_SUGGESTIONS_BN[selectedApp] ?? CHIP_SUGGESTIONS_BN.haatbazar;
  }, [selectedApp, chipLang]);
  const tasks = useMemo(() => APP_TASKS[selectedApp] ?? APP_TASKS.haatbazar, [selectedApp]);

  useEffect(() => {
    setSelectedApp(routeApp);
  }, [routeApp]);

  // Other parts of the page (e.g. the home hero) can open Buddy without sharing state.
  useEffect(() => {
    const openBuddy = () => setOpen(true);
    window.addEventListener("kormopath:open-buddy", openBuddy);
    return () => window.removeEventListener("kormopath:open-buddy", openBuddy);
  }, []);

  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const stopSpeaking = () => {
    speechAbortRef.current?.abort();
    speechAbortRef.current = null;
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
      audioRef.current = null;
    }
    if (speechUrlRef.current) URL.revokeObjectURL(speechUrlRef.current);
    speechUrlRef.current = null;
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    setSpeechLoading(false);
    setIsSpeaking(false);
    setIsNaturalVoice(false);
  };

  const fallbackDeviceVoice = (text: string) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      setVoiceNote(chipLang === "bn" ? "এই ব্রাউজারে কণ্ঠ চালানো যায় না।" : "This browser cannot speak.");
      stopSpeaking();
      return;
    }
    const isBangla = banglaShare(text) >= 0.5;
    const synth = window.speechSynthesis;
    const pickVoice = () => {
      const voices = synth.getVoices();
      return isBangla
        ? voices.find((v) => v.lang === "bn-BD") ?? voices.find((v) => v.lang.toLowerCase().startsWith("bn"))
        : voices.find((v) => v.lang.toLowerCase().startsWith("en"));
    };
    const run = () => {
      try {
        synth.cancel();
        const voice = pickVoice();
        // An English voice reading Bengali script produces noise, so say so instead of speaking.
        if (isBangla && !voice) {
          setVoiceNote("এই ডিভাইসে বাংলা কণ্ঠ নেই; উত্তরটি পড়ে নিন।");
          stopSpeaking();
          return;
        }
        const utterance = new SpeechSynthesisUtterance(isBangla ? prepareBanglaSpeech(text) : text);
        utterance.lang = isBangla ? "bn-BD" : "en-US";
        if (voice) utterance.voice = voice;
        utterance.rate = isBangla ? 0.95 : 1;
        utterance.onstart = () => {
          setIsNaturalVoice(false);
          setIsSpeaking(true);
        };
        utterance.onend = () => stopSpeaking();
        utterance.onerror = () => stopSpeaking();
        synth.speak(utterance);
      } catch {
        stopSpeaking();
      }
    };
    // Voices load asynchronously on first use in Chrome.
    if (synth.getVoices().length === 0) {
      synth.addEventListener("voiceschanged", run, { once: true });
      window.setTimeout(() => { if (!synth.speaking) run(); }, 800);
    } else run();
  };

  const speak = async (text: string) => {
    if (!voiceEnabled || typeof window === "undefined") return;
    stopSpeaking();
    setVoiceNote("");
    // The natural (Gemini) voice is a Bangla voice; English replies use the device voice.
    if (banglaShare(text) < 0.5) {
      fallbackDeviceVoice(text);
      return;
    }

    // 1. Try server Gemini TTS for Bengali audio
    const controller = new AbortController();
    speechAbortRef.current = controller;
    setSpeechLoading(true);

    try {
      const response = await fetch("/api/buddy/speech", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text }),
        signal: controller.signal,
      });
      const data = (await response.json().catch(() => ({}))) as { audio?: string; error?: string; mimeType?: string };
      if (response.ok && data.audio) {
        const bytes = Uint8Array.from(atob(data.audio), (char) => char.charCodeAt(0));
        const blob = new Blob([bytes], { type: data.mimeType || "audio/wav" });
        const url = URL.createObjectURL(blob);
        speechUrlRef.current = url;
        const audio = new Audio(url);
        audioRef.current = audio;
        audio.onplay = () => {
          setIsNaturalVoice(true);
          setIsSpeaking(true);
        };
        audio.onended = () => stopSpeaking();
        audio.onerror = () => {
          fallbackDeviceVoice(text);
        };
        await audio.play();
        return;
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
    } finally {
      if (speechAbortRef.current === controller) {
        speechAbortRef.current = null;
        setSpeechLoading(false);
      }
    }

    // 2. Seamlessly fall back to browser device voice
    fallbackDeviceVoice(text);
  };

  useEffect(() => () => {
    speechAbortRef.current?.abort();
    audioRef.current?.pause();
    if (speechUrlRef.current) URL.revokeObjectURL(speechUrlRef.current);
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
  }, []);

  // Speech-To-Text (Web Speech API)
  const toggleListening = () => {
    if (isSpeaking || speechLoading) {
      stopSpeaking();
      return;
    }

    if (isListening) {
      if (recognitionRef.current && typeof (recognitionRef.current as { stop: () => void }).stop === "function") {
        (recognitionRef.current as { stop: () => void }).stop();
      }
      setIsListening(false);
      return;
    }

    const SpeechRecognition =
      (window as unknown as { SpeechRecognition?: new () => unknown }).SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition?: new () => unknown }).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setError(bn ? "এই ব্রাউজারে কথা শুনে লেখার সুবিধা নেই। নিচের ঘরে লিখে জিজ্ঞেস করুন।" : "This browser can't take voice input. Type your question below.");
      return;
    }

    try {
      const recognition = new (SpeechRecognition as new () => {
        continuous: boolean;
        interimResults: boolean;
        lang: string;
        onresult: (e: { resultIndex: number; results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void;
        onerror: (e: { error?: string }) => void;
        onend: () => void;
        start: () => void;
        stop: () => void;
      })();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = chipLang === "bn" ? "bn-BD" : "en-US";

      // Show words as they are heard; send once the browser marks the phrase final.
      recognition.onresult = (event) => {
        let live = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          const text = result[0]?.transcript ?? "";
          if (result.isFinal) {
            setInterim("");
            if (text.trim()) void send(undefined, text.trim());
          } else live += text;
        }
        if (live) setInterim(live);
      };
      recognition.onerror = (e) => {
        setIsListening(false);
        setInterim("");
        if (e?.error === "not-allowed" || e?.error === "service-not-allowed") {
          setError(bn ? "মাইক্রোফোনের অনুমতি পাওয়া যায়নি। ব্রাউজারের ঠিকানার পাশের তালা চিহ্ন থেকে অনুমতি দিন, অথবা লিখে জিজ্ঞেস করুন।" : "Microphone permission was denied. Allow it from the lock icon in the address bar, or type instead.");
        }
      };
      recognition.onend = () => { setIsListening(false); setInterim(""); };

      recognitionRef.current = recognition;
      recognition.start();
      setIsListening(true);
      setError("");
    } catch {
      setIsListening(false);
    }
  };

  const send = async (event?: FormEvent<HTMLFormElement>, suggested?: string) => {
    event?.preventDefault();
    const content = (suggested ?? input).trim();
    if (!content || loading) return;

    const nextMessages: Message[] = [...messages, { role: "user", content }];
    setMessages(nextMessages);
    setInput("");
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/buddy/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          appId: selectedApp,
          mode,
          lang: chipLang,
          deepThinking,
          browse: browseEnabled && selectedApp !== "mediscan",
          messages: nextMessages.slice(-8),
        }),
      });

      const data = (await response.json().catch(() => ({}))) as {
        reply?: string;
        error?: string;
        sources?: Array<{ title: string; url: string }>;
        unverified?: boolean;
      };

      if (!response.ok || typeof data.reply !== "string") {
        throw new Error(data.error || "এখন উত্তর পাওয়া গেল না।");
      }

      const reply = data.reply;
      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content: reply,
          sources: data.sources,
          unverified: data.unverified,
        },
      ]);
      void speak(reply);
    } catch (err) {
      setError(err instanceof Error ? err.message : "সংযোগে সমস্যা হয়েছে। আবার চেষ্টা করুন।");
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void send(undefined);
    }
  };

  const busy = loading || isListening || isSpeaking || speechLoading;
  const status = isListening
    ? bn ? "শুনছি…" : "Listening…"
    : loading
    ? bn ? "ভাবছি…" : "Thinking…"
    : speechLoading
    ? bn ? "কণ্ঠ তৈরি হচ্ছে…" : "Preparing voice…"
    : isSpeaking
    ? bn ? "বলছি… থামাতে গোলক ছুঁয়ে দিন" : "Speaking… tap the orb to stop"
    : bn ? "প্রস্তুত" : "Ready";
  const fresh = messages.length <= 1;
  const TABS: Array<{ id: AssistantTab; icon: typeof MessageCircle; bn: string; en: string }> = [
    { id: "talk", icon: MessageCircle, bn: "কথা", en: "Talk" },
    { id: "tasks", icon: CheckSquare, bn: "কাজ", en: "Tasks" },
    { id: "crew", icon: Users, bn: "টুল", en: "Tools" },
    { id: "security", icon: ShieldCheck, bn: "গোপনীয়তা", en: "Privacy" },
  ];

  return (
    <aside
      aria-label={bn ? "বাডি সহকারী" : "Buddy assistant"}
      className={`buddy-root fixed bottom-4 right-4 ${open ? "z-50" : "z-30"} print:hidden font-sans`}
      style={open ? undefined : dragAt
        ? { left: dragAt.left, top: dragAt.top, right: "auto", bottom: "auto" }
        : { [dock.side]: 16, [dock.side === "left" ? "right" : "left"]: "auto", bottom: `min(${dock.bottom}px, calc(100dvh - 110px))` }}
    >
      {open ? (
        <section
          role="dialog"
          aria-label={bn ? "বাডি · বাংলা সহকারী" : "Buddy · Bangla assistant"}
          className="buddy-panel bv2 flex h-[min(740px,calc(100dvh-2rem))] w-[min(440px,calc(100vw-2rem))] flex-col overflow-hidden text-[#fbf3e8]"
        >
          {/* Header: identity + live state */}
          <header className="flex items-center gap-3 px-4 pb-3 pt-4">
            <SiriOrb size="md" active={busy} />
            <div className="min-w-0 flex-1">
              <strong className="block font-display text-[19px] font-semibold leading-tight">{bn ? "বাডি" : "Buddy"}</strong>
              <span className="flex items-center gap-1.5 text-[12.5px] text-[#d6c5b2]" aria-live="polite">
                <span className={`h-2 w-2 rounded-full ${busy ? "bg-amber-400 animate-pulse" : "bg-emerald-400"}`} aria-hidden="true" />
                <span className="truncate">{status}</span>
              </span>
            </div>
            <button type="button" onClick={() => setChipLang(bn ? "en" : "bn")} className="bv2-chip" title={bn ? "উত্তর ও কণ্ঠের ভাষা" : "Reply and voice language"}>
              {bn ? "বাংলা" : "EN"}
            </button>
            <button
              type="button"
              onClick={() => { if (isSpeaking || speechLoading) stopSpeaking(); setVoiceEnabled(!voiceEnabled); }}
              className="bv2-icon"
              aria-pressed={voiceEnabled}
              aria-label={voiceEnabled ? (bn ? "কণ্ঠ বন্ধ করুন" : "Mute voice") : (bn ? "কণ্ঠ চালু করুন" : "Turn voice on")}
            >
              {voiceEnabled ? <Volume2 size={17} /> : <VolumeX size={17} />}
            </button>
            <button type="button" onClick={() => { stopSpeaking(); setOpen(false); }} className="bv2-icon" aria-label={bn ? "বাডি বন্ধ করুন" : "Close Buddy"}>
              <X size={18} />
            </button>
          </header>

          {/* Context: which tool Buddy is helping with, and how it answers */}
          <div className="flex flex-wrap items-center gap-2 px-4 pb-3">
            <label className="bv2-select">
              <span className="sr-only">{bn ? "কোন টুল নিয়ে কথা" : "Tool in focus"}</span>
              <span aria-hidden="true">{appMeta.icon}</span>
              <select
                value={selectedApp}
                onChange={(e) => { const id = e.target.value as AppId; setSelectedApp(id); if (id === "mediscan") setBrowseEnabled(false); }}
              >
                {CREW_APPS.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </label>
            <div className="bv2-seg" role="group" aria-label={bn ? "উত্তরের ধরন" : "Answer style"}>
              <button type="button" aria-pressed={mode === "manual"} onClick={() => setMode("manual")}>{bn ? "পরামর্শ" : "Advice"}</button>
              <button type="button" aria-pressed={mode === "agent"} onClick={() => setMode("agent")}>{bn ? "এজেন্ট" : "Agent"}</button>
            </div>
            <button type="button" aria-pressed={deepThinking} onClick={() => setDeepThinking(!deepThinking)} className={`bv2-chip ${deepThinking ? "bv2-chip-on" : ""}`} title={bn ? "উত্তর অ্যাপের নিয়মের সঙ্গে মিলিয়ে দেখে" : "Checks the answer against the tool's rules"}>
              <Brain size={13} /> {bn ? "যাচাই" : "Verify"}
            </button>
            <button
              type="button"
              aria-pressed={browseEnabled}
              disabled={selectedApp === "mediscan"}
              onClick={() => setBrowseEnabled(!browseEnabled)}
              className={`bv2-chip ${browseEnabled ? "bv2-chip-web" : ""}`}
              title={selectedApp === "mediscan" ? (bn ? "স্বাস্থ্যতথ্যের গোপনীয়তার জন্য বন্ধ" : "Off for medical privacy") : (bn ? "উত্তর ওয়েব থেকে, উৎসসহ" : "Answer from the web, with sources")}
            >
              <Globe size={13} /> {bn ? "ওয়েব" : "Web"}
            </button>
          </div>

          <nav className="bv2-tabs" aria-label={bn ? "বাডির অংশ" : "Buddy sections"}>
            {TABS.map(({ id, icon: Icon, bn: tbn, en }) => (
              <button key={id} type="button" aria-current={tab === id ? "page" : undefined} onClick={() => setTab(id)}>
                <Icon size={14} /> {bn ? tbn : en}
                {id === "tasks" && <span className="bv2-count">{tasks.length}</span>}
              </button>
            ))}
          </nav>

          {/* TALK */}
          {tab === "talk" && (
            <div ref={chatScrollRef} className="bv2-scroll flex-1 space-y-4 overflow-y-auto px-4 py-4" aria-live="polite">
              {fresh ? (
                <div className="flex flex-col items-center pt-2 text-center">
                  <SiriOrb size="xl" active={busy} onClick={toggleListening} label={bn ? "কথা বলতে ছুঁয়ে দিন" : "Tap to speak"} />
                  <p className="mt-5 font-display text-[22px] font-semibold leading-snug">{bn ? "আজ কী করবেন?" : "What shall we do today?"}</p>
                  <p className="mt-1.5 max-w-[30ch] text-[14px] leading-relaxed text-[#d6c5b2]">{messages[0]?.content}</p>
                  <div className="mt-5 grid w-full grid-cols-2 gap-2 text-left">
                    {suggestions.slice(0, 6).map((chip) => (
                      <button key={chip} type="button" disabled={loading} onClick={() => void send(undefined, chip)} className="bv2-suggest">
                        {chip}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                messages.slice(1).map((message, index) => (
                  message.role === "user" ? (
                    <div key={index} className="bv2-user">{message.content}</div>
                  ) : (
                    <div key={index} className="flex gap-2.5">
                      <span className="mt-1 h-7 w-7 shrink-0"><SiriOrb size="sm" /></span>
                      <div className="min-w-0 flex-1">
                        <div className="bv2-reply">
                          {message.unverified && <span className="mb-1.5 block text-[11.5px] font-bold text-amber-300">{bn ? "ওয়েবের ফল · উৎস খুলে যাচাই করুন" : "Web result · check the sources"}</span>}
                          <p className="whitespace-pre-wrap">{formatReply(message.content)}</p>
                          {message.sources && message.sources.length > 0 && (
                            <ul className="mt-2.5 space-y-1 border-t border-white/10 pt-2">
                              {message.sources.map((source) => (
                                <li key={source.url}>
                                  <a href={source.url} target="_blank" rel="noreferrer" className="inline-flex items-start gap-1 text-[12.5px] text-sky-300 underline decoration-sky-700 underline-offset-2 hover:text-sky-100">
                                    <ExternalLink size={12} className="mt-1 shrink-0" /> <span>{source.title}</span>
                                  </a>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                          <button type="button" className="bv2-mini" onClick={() => void speak(message.content)} aria-label={bn ? "উত্তরটি শুনুন" : "Play this answer"}>
                            <Volume2 size={13} /> {bn ? "শুনুন" : "Play"}
                          </button>
                          <button type="button" className="bv2-mini" onClick={() => { void navigator.clipboard?.writeText(message.content).catch(() => {}); }} aria-label={bn ? "উত্তর কপি করুন" : "Copy answer"}>
                            <Copy size={13} /> {bn ? "কপি" : "Copy"}
                          </button>
                          {mentionedApps(message.content).map((app) => (
                            <Link key={app.id} href={app.route} onClick={() => setOpen(false)} className="bv2-mini bv2-mini-go">
                              {app.icon} {bn ? `${app.bnName} খুলুন` : `Open ${app.name}`} <ArrowRight size={12} />
                            </Link>
                          ))}
                        </div>
                      </div>
                    </div>
                  )
                ))
              )}

              {interim && <div className="bv2-user opacity-70" aria-live="polite">{interim}…</div>}
              {loading && (
                <div className="flex items-center gap-2.5 text-[13px] text-[#d6c5b2]" role="status">
                  <span className="h-7 w-7 shrink-0"><SiriOrb size="sm" active /></span>
                  <span className="bv2-dots" aria-hidden="true"><i /><i /><i /></span>
                  <span>{deepThinking ? (bn ? "ভাবছি ও যাচাই করছি" : "Thinking and checking") : (bn ? "ভাবছি" : "Thinking")}</span>
                </div>
              )}
              {error && <p className="rounded-xl border border-rose-500/30 bg-rose-950/40 p-3 text-[12.5px] text-rose-100" role="alert">{error}</p>}
            </div>
          )}

          {/* TASKS */}
          {tab === "tasks" && (
            <div className="bv2-scroll flex-1 space-y-2.5 overflow-y-auto px-4 py-4">
              <p className="text-[13px] text-[#d6c5b2]">{bn ? `${appMeta.name}-এর জন্য পরের কাজ` : `Next steps in ${appMeta.name}`}</p>
              {tasks.map((t) => (
                <div key={t.title} className="bv2-card">
                  <strong className="block text-[14.5px] leading-snug text-emerald-200">{t.title}</strong>
                  <p className="mt-1 text-[13px] leading-relaxed text-[#d6c5b2]">{t.desc}</p>
                  <button type="button" onClick={() => { setTab("talk"); void send(undefined, t.query); }} className="mt-2.5 inline-flex items-center gap-1 text-[13px] font-bold text-amber-300 hover:text-amber-200">
                    {bn ? "বাডিকে জিজ্ঞেস করুন" : "Ask Buddy"} <ArrowRight size={13} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* TOOLS */}
          {tab === "crew" && (
            <div className="bv2-scroll flex-1 overflow-y-auto px-4 py-4">
              <p className="mb-2.5 text-[13px] text-[#d6c5b2]">{bn ? "কোন টুল নিয়ে কথা বলবেন? বাছলে বাডি সেই টুলের নিয়ম মেনে উত্তর দেবে।" : "Pick a tool; Buddy then answers by that tool's rules."}</p>
              <div className="grid gap-2">
                {CREW_APPS.map((a) => (
                  <div key={a.id} className={`bv2-card flex items-center gap-3 ${selectedApp === a.id ? "!border-emerald-400/70" : ""}`}>
                    <span className="text-[22px]" aria-hidden="true">{a.icon}</span>
                    <button type="button" className="min-w-0 flex-1 text-left" onClick={() => { setSelectedApp(a.id); if (a.id === "mediscan") setBrowseEnabled(false); setTab("talk"); }}>
                      <span className="block text-[14px] font-bold">{a.name}</span>
                      <span className="block text-[12.5px] text-[#b8a593]">{a.tag}</span>
                    </button>
                    <Link href={a.route} onClick={() => setOpen(false)} className="bv2-mini">{bn ? "খুলুন" : "Open"} <ArrowRight size={12} /></Link>
                  </div>
                ))}
              </div>
              <Link href="/opportunities" onClick={() => setOpen(false)} className="bv2-card mt-3 flex items-center gap-2 text-[13.5px] font-semibold text-emerald-200">
                <Compass size={16} /> {bn ? "আমার পথ: চাকরি, বৃত্তি ও কর্মসূচি" : "My Path: jobs, scholarships, programmes"} <ArrowRight size={13} className="ml-auto" />
              </Link>
            </div>
          )}

          {/* PRIVACY */}
          {tab === "security" && (
            <div className="bv2-scroll flex-1 space-y-2.5 overflow-y-auto px-4 py-4 text-[13.5px] leading-relaxed text-[#e2d3c2]">
              <div className="bv2-card">
                <strong className="flex items-center gap-1.5 text-emerald-200"><ShieldCheck size={16} /> {bn ? "আপনার তথ্য আপনার ডিভাইসে" : "Your data stays on your device"}</strong>
                <p className="mt-1.5">{bn ? "বাজেট, প্রেসক্রিপশন, সিভি ও চুক্তি ব্রাউজারেই থাকে; কোনো অ্যাকাউন্ট বা কেন্দ্রীয় ডেটাবেস নেই।" : "Budgets, prescriptions, CVs and contracts stay in your browser; there are no accounts or central database."}</p>
              </div>
              <div className="bv2-card">
                <strong className="text-emerald-200">{bn ? "বাডিকে যা পাঠানো হয়" : "What Buddy sends"}</strong>
                <p className="mt-1.5">{bn ? "শুধু এই কথোপকথনের শেষ কয়েকটি বার্তা, উত্তর তৈরির জন্য। Google-এর সার্ভারে কথোপকথন সংরক্ষণ বন্ধ রাখা হয়। স্বাস্থ্যতথ্য বাডিতে লিখবেন না; মেডিস্ক্যানে ওয়েব খোঁজ বন্ধ।" : "Only the last few messages of this chat, to write a reply. Storage on Google's side is turned off. Don't type health details here; web search is off for MediScan."}</p>
              </div>
              <Link href="/settings" onClick={() => setOpen(false)} className="bv2-mini bv2-mini-go">{bn ? "ডেটা ও প্রাইভেসি সেটিংস" : "Data & privacy settings"} <ArrowRight size={12} /></Link>
            </div>
          )}

          {/* Composer: one row, voice first */}
          <form onSubmit={(event) => void send(event)} className="bv2-composer">
            <label htmlFor="buddy-input" className="sr-only">{bn ? "বাডিকে লিখুন" : "Message Buddy"}</label>
            <textarea
              id="buddy-input"
              value={input}
              maxLength={1200}
              rows={1}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => setTab("talk")}
              placeholder={bn ? "বাংলায় লিখুন বা মাইকে বলুন…" : "Type or speak…"}
            />
            <button
              type="button"
              onClick={() => { setTab("talk"); toggleListening(); }}
              className={`bv2-mic ${isListening ? "bv2-mic-on" : ""}`}
              aria-pressed={isListening}
              aria-label={isSpeaking || speechLoading ? (bn ? "কথা থামান" : "Stop speaking") : isListening ? (bn ? "শোনা বন্ধ করুন" : "Stop listening") : (bn ? "মাইকে বলুন" : "Speak")}
            >
              {isSpeaking || speechLoading ? <Square size={15} /> : <Mic size={18} />}
            </button>
            <button type="submit" disabled={!input.trim() || loading} className="bv2-send" aria-label={bn ? "পাঠান" : "Send"}>
              <Send size={17} />
            </button>
          </form>
          {voiceNote && <p className="px-4 pb-3 -mt-1 text-[12px] text-amber-300">{voiceNote}</p>}
        </section>
      ) : (
        /* Collapsed launcher: the glowing Buddy orb */
        <button
          type="button"
          onPointerDown={(e) => {
            const box = (e.currentTarget.parentElement as HTMLElement).getBoundingClientRect();
            dragRef.current = { x: e.clientX, y: e.clientY, left: box.left, top: box.top, moved: false };
            e.currentTarget.setPointerCapture(e.pointerId);
          }}
          onPointerMove={(e) => {
            const d = dragRef.current;
            if (!d) return;
            const dx = e.clientX - d.x;
            const dy = e.clientY - d.y;
            if (!d.moved && Math.hypot(dx, dy) < 6) return; // a tap, not a drag
            d.moved = true;
            setDragAt({ left: Math.min(window.innerWidth - 90, Math.max(4, d.left + dx)), top: Math.min(window.innerHeight - 100, Math.max(4, d.top + dy)) });
          }}
          onPointerUp={(e) => {
            const d = dragRef.current;
            dragRef.current = null;
            if (!d?.moved || !dragAt) return;
            suppressClickRef.current = true;
            const box = (e.currentTarget.parentElement as HTMLElement).getBoundingClientRect();
            setDock({ side: box.left + box.width / 2 < window.innerWidth / 2 ? "left" : "right", bottom: Math.round(Math.max(8, window.innerHeight - box.bottom)) });
            setDragAt(null);
          }}
          onPointerCancel={() => { dragRef.current = null; setDragAt(null); }}
          onClick={() => {
            if (suppressClickRef.current) { suppressClickRef.current = false; return; }
            setOpen(true);
          }}
          aria-label="বাডি খুলুন (Open Buddy assistant)"
          aria-haspopup="dialog"
          aria-expanded={open}
          title="বাডি · বাংলা সহকারী"
          className={`buddy-orb-launcher group ${dragAt ? "is-dragging" : ""}`}
        >
          <SiriOrb size="xl" />
          <span className="buddy-orb-label"><i aria-hidden="true" />বাডি</span>
        </button>
      )}
    </aside>
  );
}
