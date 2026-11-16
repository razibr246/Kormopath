"use client";

import { useEffect, useState, useRef, useMemo, type FormEvent, type KeyboardEvent } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  MessageCircle,
  Send,
  Volume2,
  VolumeX,
  Keyboard,
  Brain,
  CheckSquare,
  ShieldCheck,
  Users,
  Compass,
  ArrowRight,
  ExternalLink,
  Globe,
  Sparkles,
} from "lucide-react";
import { banglaShare, prepareBanglaSpeech } from "@/lib/banglaSpeech";

export const CREW_APPS = [
  { id: "haatbazar", name: "HaatBazar AI", tag: "কৃষি ও আবহাওয়া", route: "/haatbazar", icon: "🌾" },
  { id: "kormopath", name: "KormoPath Core", tag: "ক্যারিয়ার ও চুক্তি", route: "/", icon: "🧭" },
  { id: "chuktiguard", name: "ChuktiGuard", tag: "আইন ও বিভ্রাট ধারা", route: "/chuktiguard", icon: "🛡️" },
  { id: "feeguard", name: "FeeGuard BD", tag: "বৈদেশিক মুদ্রা ও কর", route: "/feeguard", icon: "৳" },
  { id: "admitbuddy", name: "AdmitBuddy", tag: "বিশ্ববিদ্যালয় ভর্তি", route: "/admitbuddy", icon: "🎓" },
  { id: "mediscan", name: "MediScan BD", tag: "প্রেসক্রিপশন ও সতর্কতা", route: "/mediscan", icon: "💊" },
  { id: "shohoj", name: "Shohoj Budget", tag: "পয়সা বাজেট ও হিসাব", route: "/shohoj-budget", icon: "📊" },
  { id: "probaho", name: "Probaho Coach", tag: "ভাইভা অনুশীলন", route: "/probaho", icon: "🎙️" },
] as const;

export type AppId = (typeof CREW_APPS)[number]["id"];

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
  if (path?.startsWith("/chuktiguard")) return "chuktiguard";
  if (path?.startsWith("/feeguard")) return "feeguard";
  if (path?.startsWith("/admitbuddy")) return "admitbuddy";
  if (path?.startsWith("/mediscan")) return "mediscan";
  if (path?.startsWith("/shohoj-budget")) return "shohoj";
  if (path?.startsWith("/probaho")) return "probaho";
  return "kormopath";
}

const CHIP_SUGGESTIONS_EN: Record<AppId, string[]> = {
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
  haatbazar: [
    { title: "কী চাষ করবেন ও সার প্রস্তুত", desc: "০ দিনের মধ্যে সরিষা রোপণের প্রস্তুতি নিন এবং সার ঠিক করুন।", query: "What to plant?" },
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
        <span className="kp-orb-gloss" />
      </span>
      <span className="kp-orb-eye" />
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
  const [mode, setMode] = useState<AssistantMode>("agent");
  const [tab, setTab] = useState<AssistantTab>("talk");
  const [deepThinking, setDeepThinking] = useState(true);
  const [browseEnabled, setBrowseEnabled] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [isNaturalVoice, setIsNaturalVoice] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [showKeyboard, setShowKeyboard] = useState(false);
  // Bangla first: replies, suggestions, speech recognition and voice all follow this.
  const [chipLang, setChipLang] = useState<"en" | "bn">("bn");
  const [voiceNote, setVoiceNote] = useState("");
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
      setError("আপনার ডিভাইসের মাইক্রোফোন সমর্থন মেলেনি। কিবোর্ড আইকন দিয়ে লিখুন।");
      setShowKeyboard(true);
      return;
    }

    try {
      const recognition = new (SpeechRecognition as new () => {
        continuous: boolean;
        interimResults: boolean;
        lang: string;
        onresult: (e: { results: Array<Array<{ transcript: string }>> }) => void;
        onerror: () => void;
        onend: () => void;
        start: () => void;
        stop: () => void;
      })();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = chipLang === "bn" ? "bn-BD" : "en-US";

      recognition.onresult = (event) => {
        const transcript = event.results?.[0]?.[0]?.transcript;
        if (transcript) {
          void send(undefined, transcript);
        }
      };
      recognition.onerror = () => setIsListening(false);
      recognition.onend = () => setIsListening(false);

      recognitionRef.current = recognition;
      recognition.start();
      setIsListening(true);
      setError("");
    } catch {
      setIsListening(false);
      setShowKeyboard(true);
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

  return (
    <aside
      aria-label="Chakra Agent Buddy"
      className={`buddy-root fixed bottom-4 right-4 ${open ? "z-50" : "z-30"} print:hidden font-sans`}
    >
      {open ? (
        /* Expanded Assistant Modal Window (Attachment 2) */
        <section
          aria-label="Chakra Agent"
          className="buddy-panel flex h-[min(730px,90dvh)] w-[min(430px,calc(100vw-2rem))] flex-col overflow-hidden rounded-[26px] border border-slate-700/80 bg-[#0e151c] text-white shadow-2xl shadow-black/90"
        >
          {/* 1. Window Titlebar with macOS Traffic Lights */}
          <header className="flex items-center justify-between border-b border-slate-800 bg-[#121a22] px-4 py-3">
            {/* Traffic Lights */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  stopSpeaking();
                  setOpen(false);
                }}
                className="h-3 w-3 rounded-full bg-[#ff5f56] border border-[#e0443e] hover:brightness-110 cursor-pointer"
                aria-label="Close Chakra Agent"
              />
              <span className="h-3 w-3 rounded-full bg-[#ffbd2e] border border-[#dea123] opacity-80" />
              <span className="h-3 w-3 rounded-full bg-[#27c93f] border border-[#1aab29] opacity-80" />
            </div>

            {/* Title & Circular Chakra Badge */}
            <div className="flex items-center gap-2.5">
              <div className="h-6 w-6 rounded-full bg-emerald-950/80 border border-emerald-500/60 grid place-items-center shrink-0 shadow-[0_0_8px_rgba(52,211,153,0.3)]">
                <svg viewBox="0 0 24 24" className="h-4 w-4 text-emerald-400" fill="currentColor">
                  <circle cx="12" cy="12" r="3.2" fill="#34d399" />
                  <path
                    d="M12 2L13.6 8.5L20 7L15.5 12L20 17L13.6 15.5L12 22L10.4 15.5L4 17L8.5 12L4 7L10.4 8.5L12 2Z"
                    fill="currentColor"
                    opacity="0.85"
                  />
                </svg>
              </div>
              <div className="text-center">
                <span className="block text-[15px] font-bold tracking-tight text-white leading-tight">
                  {bn ? "বাডি · চক্র এজেন্ট" : "Chakra Agent"}
                </span>
                <span className="block text-[12px] text-slate-400 leading-tight mt-0.5">
                  {bn ? "আপনার বাংলা সহকারী" : "Your field assistant"}
                </span>
              </div>
            </div>

            {/* Top Right Mode Chip */}
            <button
              type="button"
              onClick={() => setMode(mode === "manual" ? "agent" : "manual")}
              className="rounded-full bg-white/10 hover:bg-white/15 px-3 py-1 text-[12px] font-medium text-slate-200 transition-colors cursor-pointer border border-white/5"
            >
              {mode === "manual" ? (bn ? "পরামর্শ" : "Manual") : (bn ? "এজেন্ট" : "Agent")}
            </button>
          </header>

          {/* 2. Segmented Pill Control: [ Manual | Agent ] */}
          <div className="px-5 pt-3.5 pb-2.5 text-center border-b border-slate-800 bg-[#0b1016]">
            <div className="inline-flex rounded-full bg-[#162029] p-1 border border-white/10">
              <button
                type="button"
                onClick={() => setMode("manual")}
                className={`rounded-full px-8 py-2 text-[14px] transition-all cursor-pointer ${
                  mode === "manual"
                    ? "bg-white text-slate-950 font-bold shadow-md"
                    : "text-slate-300 font-medium hover:text-white"
                }`}
              >
                {bn ? "পরামর্শ" : "Manual"}
              </button>
              <button
                type="button"
                onClick={() => setMode("agent")}
                className={`rounded-full px-8 py-2 text-[14px] transition-all cursor-pointer ${
                  mode === "agent"
                    ? "bg-white text-slate-950 font-bold shadow-md"
                    : "text-slate-300 font-medium hover:text-white"
                }`}
              >
                {bn ? "এজেন্ট" : "Agent"}
              </button>
            </div>

            {/* Mode Description Caption */}
            <p className="mt-2 text-[12px] text-slate-400 leading-snug">
              {mode === "manual"
                ? bn ? "বাডি শুধু পরামর্শ দেয়; প্রতিটি ধাপ আপনি নিজে করেন।" : "The agent only suggests; you do every step yourself."
                : bn ? "বাডি এগিয়ে থেকে পরের ধাপ সাজায়; প্রতিটি কাজ আপনি দেখে নিশ্চিত করেন।" : "The agent plans proactive steps; you review and confirm each action."}
            </p>

            {/* Deep Thinking Mode Chip */}
            <div className="mt-2.5 flex justify-center items-center gap-2">
              <button
                type="button"
                onClick={() => setDeepThinking(!deepThinking)}
                aria-pressed={deepThinking}
                className={`inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-[12px] font-semibold border transition-all cursor-pointer ${
                  deepThinking
                    ? "border-emerald-500/60 bg-emerald-950/60 text-emerald-300 shadow-[0_0_10px_rgba(52,211,153,0.15)]"
                    : "border-slate-700 bg-slate-800/80 text-slate-300 hover:border-slate-600"
                }`}
              >
                <Brain size={14} className={deepThinking ? "text-emerald-400" : "text-slate-400"} />
                <span>{bn ? "গভীর চিন্তা" : "Deep thinking"}</span>
              </button>

              <button
                type="button"
                onClick={() => setChipLang(chipLang === "en" ? "bn" : "en")}
                className="rounded-full border border-slate-700 bg-slate-800/80 px-2.5 py-1 text-[11px] font-bold text-slate-300 hover:text-white"
                title={bn ? "উত্তর ও কণ্ঠের ভাষা বদলান" : "Switch reply and voice language"}
              >
                {chipLang === "en" ? "EN" : "বাংলা"}
              </button>
            </div>
          </div>

          {/* 3. Horizontal Navigation: Talk | Tasks 1 | Crew | Path | Security */}
          <nav
            aria-label="Assistant sections"
            className="flex items-center justify-between border-b border-slate-800 bg-[#0d141b] px-3 text-[13px] font-semibold"
          >
            <button
              type="button"
              onClick={() => setTab("talk")}
              className={`flex items-center gap-1.5 py-2.5 px-3 border-b-2 transition-all cursor-pointer ${
                tab === "talk"
                  ? "border-amber-400 text-amber-300 font-bold"
                  : "border-transparent text-slate-400 hover:text-slate-200"
              }`}
            >
              <MessageCircle size={15} />
              <span>{bn ? "কথা" : "Talk"}</span>
            </button>

            <button
              type="button"
              onClick={() => setTab("tasks")}
              className={`flex items-center gap-1.5 py-2.5 px-3 border-b-2 transition-all cursor-pointer ${
                tab === "tasks"
                  ? "border-amber-400 text-amber-300 font-bold"
                  : "border-transparent text-slate-400 hover:text-slate-200"
              }`}
            >
              <CheckSquare size={15} />
              <span>
                {bn ? "কাজ" : "Tasks"} <span className="ml-0.5 rounded-full bg-slate-800 border border-slate-700 px-1.5 py-0.2 text-[10px] text-slate-300">1</span>
              </span>
            </button>

            <button
              type="button"
              onClick={() => setTab("crew")}
              className={`flex items-center gap-1.5 py-2.5 px-3 border-b-2 transition-all cursor-pointer ${
                tab === "crew"
                  ? "border-amber-400 text-amber-300 font-bold"
                  : "border-transparent text-slate-400 hover:text-slate-200"
              }`}
            >
              <Users size={15} />
              <span>{bn ? "দল" : "Crew"}</span>
            </button>

            <button
              type="button"
              onClick={() => setTab("path")}
              className={`flex items-center gap-1.5 py-2.5 px-3 border-b-2 transition-all cursor-pointer ${
                tab === "path"
                  ? "border-amber-400 text-amber-300 font-bold"
                  : "border-transparent text-slate-400 hover:text-slate-200"
              }`}
            >
              <Compass size={15} />
              <span>{bn ? "পথ" : "Path"}</span>
            </button>

            <button
              type="button"
              onClick={() => setTab("security")}
              className={`flex items-center gap-1.5 py-2.5 px-3 border-b-2 transition-all cursor-pointer ${
                tab === "security"
                  ? "border-amber-400 text-amber-300 font-bold"
                  : "border-transparent text-slate-400 hover:text-slate-200"
              }`}
            >
              <ShieldCheck size={15} />
              <span>{bn ? "নিরাপত্তা" : "Security"}</span>
            </button>
          </nav>

          {/* 4. Tab Content */}
          {/* TAB 1: TALK (Chat, Suggestions & Dialogue) */}
          {tab === "talk" && (
            <div className="flex-1 flex flex-col min-h-0">
              {/* Quick Action Suggestion Chips (Attachment 2) */}
              <div className="p-3 border-b border-slate-800 bg-[#0a1016] flex flex-wrap gap-1.5 max-h-36 overflow-y-auto">
                {suggestions.map((chip) => (
                  <button
                    key={chip}
                    type="button"
                    disabled={loading}
                    onClick={() => void send(undefined, chip)}
                    className="rounded-full border border-white/10 bg-[#1a232c] px-3.5 py-1.5 text-[12.5px] font-medium text-slate-200 hover:border-emerald-400/60 hover:bg-[#22303c] transition-all cursor-pointer disabled:opacity-50"
                  >
                    {chip}
                  </button>
                ))}

                <button
                  type="button"
                  aria-pressed={browseEnabled}
                  disabled={selectedApp === "mediscan" || loading}
                  title={selectedApp === "mediscan" ? "Web search disabled for medical privacy" : "Search web with Google Grounding"}
                  onClick={() => setBrowseEnabled(!browseEnabled)}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12px] font-semibold transition-all cursor-pointer disabled:opacity-40 ${
                    browseEnabled
                      ? "border-sky-400/80 bg-sky-950 text-sky-200"
                      : "border-slate-700 bg-slate-800/80 text-slate-300 hover:bg-slate-700"
                  }`}
                >
                  <Globe size={13} />
                  <span>{bn ? "ওয়েবে খুঁজুন" : "Search web"}</span>
                </button>
              </div>

              {/* Chat Message Scroll */}
              <div ref={chatScrollRef} className="flex-1 overflow-y-auto p-4 space-y-3" aria-live="polite">
                {messages.map((message, index) => (
                  <div
                    key={`${index}-${message.role}`}
                    className={`max-w-[92%] rounded-2xl px-4 py-3 text-[13.5px] leading-relaxed ${
                      message.role === "user"
                        ? "ml-auto bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md"
                        : "mr-auto border border-slate-700/80 bg-[#121c27] text-slate-100 shadow-sm"
                    }`}
                  >
                    {message.unverified && (
                      <span className="mb-1.5 block text-[11px] font-bold text-amber-300">
                        Web result · Verify with source
                      </span>
                    )}
                    <p className="whitespace-pre-wrap">{message.content}</p>

                    {message.sources && message.sources.length > 0 && (
                      <div className="mt-2.5 border-t border-slate-700 pt-2">
                        <span className="block text-[11px] font-semibold text-slate-300">Sources</span>
                        <ul className="mt-1 space-y-1">
                          {message.sources.map((source) => (
                            <li key={source.url}>
                              <a
                                href={source.url}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-start gap-1 text-[12px] text-sky-400 underline decoration-sky-700 underline-offset-2 hover:text-sky-200"
                              >
                                <ExternalLink size={12} className="mt-1 shrink-0" />
                                <span>{source.title}</span>
                              </a>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ))}

                {loading && (
                  <div className="flex items-center gap-2 text-[12px] text-emerald-400 py-1" role="status">
                    <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
                    <span>Thinking with deep verification…</span>
                  </div>
                )}

                {error && (
                  <p className="rounded-xl border border-rose-500/30 bg-rose-950/40 p-2.5 text-[11px] text-rose-200" role="alert">
                    {error}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: TASKS */}
          {tab === "tasks" && (
            <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
              <span className="text-[12px] font-bold text-slate-300 block mb-2">
                Priority Action Checklist for {appMeta.name}:
              </span>
              {tasks.map((t, idx) => (
                <div
                  key={idx}
                  className="rounded-xl border border-white/10 bg-[#131d27] p-3.5 hover:border-emerald-500/40 transition-colors"
                >
                  <strong className="text-[13.5px] text-emerald-300 block leading-snug">
                    {t.title}
                  </strong>
                  <p className="text-[12px] text-slate-400 mt-1 leading-relaxed">
                    {t.desc}
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setTab("talk");
                      void send(undefined, t.query);
                    }}
                    className="mt-2.5 inline-flex items-center gap-1 text-[12px] font-bold text-amber-300 hover:text-amber-200 cursor-pointer"
                  >
                    <span>Execute with Chakra Agent</span>
                    <ArrowRight size={13} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* TAB 3: CREW (Ecosystem Agents) */}
          {tab === "crew" && (
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              <span className="text-[12px] font-bold text-slate-300 block mb-2">
                KormoPath Multi-Agent Ecosystem Crew:
              </span>
              <div className="grid grid-cols-1 gap-2">
                {CREW_APPS.map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => {
                      setSelectedApp(a.id);
                      if (a.id === "mediscan") setBrowseEnabled(false);
                      setTab("talk");
                    }}
                    className={`flex items-center justify-between p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      selectedApp === a.id
                        ? "border-emerald-500 bg-emerald-950/40 text-white"
                        : "border-white/5 bg-[#121b24] text-slate-300 hover:border-white/20"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="text-xl">{a.icon}</span>
                      <div>
                        <span className="block text-[13px] font-bold">{a.name}</span>
                        <span className="block text-[11px] text-slate-400">{a.tag}</span>
                      </div>
                    </div>
                    {selectedApp === a.id ? (
                      <span className="h-2 w-2 rounded-full bg-emerald-400" />
                    ) : (
                      <ArrowRight size={14} className="text-slate-500" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: PATH (Opportunities & Skills Roadmap) */}
          {tab === "path" && (
            <div className="flex-1 overflow-y-auto p-4 space-y-3 text-[12.5px] text-slate-300">
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/30 p-3.5">
                <span className="flex items-center gap-1.5 font-bold text-emerald-300 text-[13.5px]">
                  <Compass size={16} />
                  <span>My Path · Career & Life Opportunities</span>
                </span>
                <p className="mt-2 text-[12px] text-slate-300 leading-relaxed">
                  Track live job opportunities, farmer aid programs, university circulars, and verified skill passports in one unified board.
                </p>
                <Link
                  href="/opportunities"
                  className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-emerald-500 px-3 py-1.5 text-[12px] font-bold text-slate-950 hover:bg-emerald-400 transition-colors"
                >
                  <span>Open Opportunities Board</span>
                  <ExternalLink size={12} />
                </Link>
              </div>

              <div className="rounded-xl border border-white/10 bg-[#121c27] p-3 space-y-2 text-[11.5px] text-slate-400">
                <p>• <strong>Skill Passport</strong>: HMAC-SHA256 signed tamper-proof proof of coding ability.</p>
                <p>• <strong>Contract Blackout Shield</strong>: Pre-drafted 48-hour internet outage protections.</p>
                <p>• <strong>Integer Poisha Math</strong>: Zero-hallucination currency reconciliation.</p>
              </div>
            </div>
          )}

          {/* TAB 5: SECURITY (Privacy & Local Guarantees) */}
          {tab === "security" && (
            <div className="flex-1 overflow-y-auto p-4 space-y-3 text-[12px] text-slate-300">
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-3.5">
                <span className="flex items-center gap-1.5 font-bold text-emerald-300 text-[13.5px]">
                  <ShieldCheck size={16} />
                  <span>Local-First Data Privacy Guarantee</span>
                </span>
                <p className="mt-2 text-[12px] text-slate-300 leading-relaxed">
                  Your budget calculations, prescriptions, CV data, and invoices stay in your browser&apos;s isolated LocalStorage. No user accounts or central databases can access your personal data.
                </p>
              </div>

              <div className="rounded-xl border border-white/5 bg-[#121b24] p-3 space-y-2 text-[11.5px] text-slate-400">
                <p>• <strong>Prescription Safety</strong>: Zero OCR data stored on central servers.</p>
                <p>• <strong>Financial Precision</strong>: Financial calculations run deterministically in integer poisha.</p>
                <p>• <strong>Cryptographic Passports</strong>: Secret keys never leave the server environment.</p>
              </div>
            </div>
          )}

          {/* 5. Optional Collapsible Text Input Area */}
          {showKeyboard && (
            <form
              onSubmit={(event) => void send(event)}
              className="flex items-end gap-2 border-t border-slate-800 bg-[#0c1219] p-3"
            >
              <label htmlFor="buddy-input" className="sr-only">Type a message to Chakra Agent</label>
              <textarea
                id="buddy-input"
                value={input}
                maxLength={1200}
                rows={2}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={bn ? "বাংলায় যেকোনো প্রশ্ন লিখুন…" : "Ask Chakra Agent anything…"}
                className="max-h-24 min-h-10 flex-1 resize-y rounded-xl border border-white/10 bg-slate-900/90 px-3 py-2 text-[12.5px] text-white outline-none placeholder:text-slate-500 focus:border-emerald-400"
              />
              <button
                type="submit"
                disabled={!input.trim() || loading}
                aria-label="Send message"
                className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-bold hover:brightness-110 disabled:opacity-40 cursor-pointer"
              >
                <Send size={15} />
              </button>
            </form>
          )}

          {/* 6. Apple Siri / Chakra Voice Interaction Footer (Attachments 2 & 3) */}
          <footer className="border-t border-slate-800 bg-gradient-to-t from-[#060a0e] via-[#091117] to-[#0c151e] px-4 py-3.5 text-center">
            <div className="flex items-center justify-between px-3">
              {/* Left Speaker / Mute Button */}
              <button
                type="button"
                onClick={() => {
                  if (isSpeaking || speechLoading) stopSpeaking();
                  setVoiceEnabled(!voiceEnabled);
                }}
                title={voiceEnabled ? "Mute audio voice" : "Enable audio voice"}
                className={`grid h-10 w-10 place-items-center rounded-full border transition-all cursor-pointer ${
                  voiceEnabled
                    ? "border-white/15 bg-white/10 text-slate-200 hover:bg-white/20"
                    : "border-white/5 bg-white/5 text-slate-500 hover:text-slate-300"
                }`}
              >
                {voiceEnabled ? <Volume2 size={17} /> : <VolumeX size={17} />}
              </button>

              {/* Center Photorealistic Siri / Chakra 3D Orb (Attachment 3) */}
              <SiriOrb
                size="lg"
                active={isSpeaking || isListening}
                onClick={toggleListening}
              />

              {/* Right Keyboard Toggle Button */}
              <button
                type="button"
                onClick={() => setShowKeyboard(!showKeyboard)}
                title="Type with keyboard"
                className={`grid h-10 w-10 place-items-center rounded-full border transition-all cursor-pointer ${
                  showKeyboard
                    ? "border-emerald-500/60 bg-emerald-500/20 text-emerald-300"
                    : "border-white/15 bg-white/10 text-slate-200 hover:bg-white/20"
                }`}
              >
                <Keyboard size={17} />
              </button>
            </div>

            {/* Status captions below the orb */}
            <div className="mt-2.5 text-center" aria-live="polite">
              <span className="block text-[12.5px] font-semibold text-slate-300 leading-snug">
                {chipLang === "bn"
                  ? isSpeaking
                    ? "বলছি… থামাতে গোলকটি ছুঁয়ে দিন"
                    : speechLoading
                    ? "কণ্ঠ তৈরি হচ্ছে…"
                    : isListening
                    ? "শুনছি… এখন বলুন"
                    : "কথা বলতে গোলকটি ছুঁয়ে দিন"
                  : isSpeaking
                  ? "Speaking... tap to stop"
                  : speechLoading
                  ? "Preparing voice audio…"
                  : isListening
                  ? "Listening... speak now"
                  : "Tap orb to speak"}
              </span>
              <span className="block text-[11px] text-[#f5b14a] font-medium mt-0.5 leading-snug">
                {voiceNote
                  ? voiceNote
                  : isSpeaking
                  ? isNaturalVoice
                    ? chipLang === "bn" ? "স্বাভাবিক বাংলা কণ্ঠে বলছি।" : "Natural voice speaks."
                    : chipLang === "bn" ? "ডিভাইসের কণ্ঠে বলছি।" : "The device voice speaks."
                  : voiceEnabled
                  ? chipLang === "bn" ? "বাংলা কণ্ঠ চালু" : "Voice on"
                  : chipLang === "bn" ? "কণ্ঠ বন্ধ" : "Voice muted"}
              </span>
            </div>
          </footer>
        </section>
      ) : (
        /* Collapsed launcher: the glowing Buddy orb */
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="বাডি খুলুন (Open Buddy assistant)"
          aria-haspopup="dialog"
          aria-expanded={open}
          title="বাডি · বাংলা সহকারী"
          className="buddy-orb-launcher group"
        >
          <SiriOrb size="xl" />
          <span className="buddy-orb-label">বাডি</span>
        </button>
      )}
    </aside>
  );
}
