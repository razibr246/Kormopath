"use client";

import { useEffect, useState, useRef, useMemo, type FormEvent, type KeyboardEvent } from "react";
import { usePathname } from "next/navigation";
import {
  MessageCircle,
  Send,
  X,
  Volume2,
  VolumeX,
  Keyboard,
  Brain,
  CheckSquare,
  ShieldCheck,
  Layers,
  ArrowRight,
  ExternalLink,
  Globe,
} from "lucide-react";

const APPS = [
  { id: "kormopath", name: "KormoPath", tag: "মূল সহায়তা", route: "/" },
  { id: "path", name: "My Path", tag: "কর্মজীবন", route: "/opportunities" },
  { id: "chuktiguard", name: "ChuktiGuard", tag: "চুক্তি", route: "/chuktiguard" },
  { id: "feeguard", name: "FeeGuard BD", tag: "পেমেন্ট ও ফি", route: "/feeguard" },
  { id: "admitbuddy", name: "AdmitBuddy", tag: "ভর্তি", route: "/admitbuddy" },
  { id: "mediscan", name: "MediScan BD", tag: "স্বাস্থ্যতথ্য", route: "/mediscan" },
  { id: "shohoj", name: "Shohoj Budget", tag: "পারিবারিক বাজেট", route: "/shohoj-budget" },
  { id: "haatbazar", name: "HaatBazar AI", tag: "কৃষি", route: "/haatbazar" },
  { id: "probaho", name: "Probaho Coach", tag: "কথা বলার অনুশীলন", route: "/probaho" },
] as const;

type AppId = (typeof APPS)[number]["id"];
type Message = {
  role: "user" | "assistant";
  content: string;
  unverified?: boolean;
  sources?: Array<{ title: string; url: string }>;
};
type AssistantTab = "talk" | "tasks" | "apps" | "security";
type AssistantMode = "manual" | "agent";

function appForPath(path: string | null): AppId {
  if (path?.startsWith("/opportunities")) return "path";
  if (path?.startsWith("/chuktiguard")) return "chuktiguard";
  if (path?.startsWith("/feeguard")) return "feeguard";
  if (path?.startsWith("/admitbuddy")) return "admitbuddy";
  if (path?.startsWith("/mediscan")) return "mediscan";
  if (path?.startsWith("/shohoj-budget")) return "shohoj";
  if (path?.startsWith("/haatbazar")) return "haatbazar";
  if (path?.startsWith("/probaho")) return "probaho";
  return "kormopath";
}

const APP_SUGGESTIONS: Record<AppId, string[]> = {
  haatbazar: [
    "কী চাষ করব?",
    "বিকল্পগুলো তুলনা করুন",
    "আজ পানি দেব?",
    "ফসল কাটার সময় কখন?",
    "পরের ফসল বাছুন",
    "সমস্যা জানান",
    "কৃষি কর্মকর্তার সঙ্গে কথা বলুন",
  ],
  admitbuddy: [
    "আমার জন্য কোন বিশ্ববিদ্যালয় মানানসই?",
    "বিকল্পগুলো তুলনা করুন",
    "আবেদনের তালিকা দেখুন",
    "ব্যক্তিগত বিবৃতির পাঠযোগ্যতা দেখুন",
    "অফিসিয়াল বিজ্ঞপ্তির শেষ তারিখ",
    "ভর্তির পরিকল্পনা ডাউনলোড করুন",
  ],
  mediscan: [
    "প্রেসক্রিপশনের লেখা বুঝিয়ে বলুন",
    "ওষুধের মিথস্ক্রিয়া সম্পর্কে জানান",
    "জরুরি লক্ষণগুলো কী?",
    "খাবারের সঙ্গে কীভাবে নিতে হয়?",
  ],
  shohoj: [
    "আজ কত খরচ করা যাবে?",
    "বিকাশে ক্যাশ আউটের খরচ",
    "নগদে ক্যাশ আউটের খরচ",
    "দলের বিল ভাগ করুন",
    "এই মাসের বাজেটের অবস্থা",
  ],
  probaho: [
    "প্রযুক্তিগত ভাইভা শুরু করুন",
    "উত্তর বলার অনুশীলন",
    "কথার গতি দেখুন",
    "অপ্রয়োজনীয় শব্দ কমান",
    "নিজের প্রশ্ন লিখুন",
  ],
  feeguard: [
    "মার্কেটপ্লেস ও সরাসরি পেমেন্ট তুলনা",
    "সরকারি নগদ প্রণোদনা",
    "পেমেন্টের ভালো পথ কোনটি?",
    "হিসাবটি যাচাই করুন",
  ],
  chuktiguard: [
    "ব্যবসায়িক চুক্তির খসড়া",
    "চুক্তির ইন্টারনেট-বিভ্রাট ধারা",
    "কর অব্যাহতির নোটিশ",
    "চুক্তির ধাপগুলো ভাগ করুন",
  ],
  path: [
    "দক্ষতার পাসপোর্ট যাচাই",
    "দক্ষতার ভবিষ্যৎ ঝুঁকি",
    "আমার আবেদনগুলো দেখুন",
    "পরের কাজটি কী?",
  ],
  kormopath: [
    "কোন টুল দিয়ে শুরু করব?",
    "কর্মপরিকল্পনার ধাপগুলো বুঝিয়ে বলুন",
    "নির্ভরযোগ্য হিসাব কীভাবে কাজ করে?",
    "সবগুলো অ্যাপ দেখুন",
  ],
};

const APP_TASKS: Record<AppId, Array<{ title: string; desc: string; href?: string }>> = {
  haatbazar: [
    { title: "ওষুধ ছিটানোর উপযুক্ত সময়", desc: "ছিটানোর আগে বৃষ্টি ও বাতাসের পূর্বাভাস দেখুন। পণ্যের লেবেল মেনে চলুন।" },
    { title: "ট্রাকভাড়া ভাগের হিসাব", desc: "কৃষকদের মধ্যে পণ্য পরিবহনের খরচ ভাগ করুন।" },
    { title: "পাইকারি দামের প্রভাব", desc: "দাম বাড়া বা কমায় সম্ভাব্য লাভের পরিবর্তন দেখুন।" },
  ],
  admitbuddy: [
    { title: "বিশ্ববিদ্যালয়ের পছন্দের ভারসাম্য", desc: "উচ্চ, মাঝারি ও নিরাপদ পছন্দগুলো গুছিয়ে নিন।" },
    { title: "অফিসিয়াল বিজ্ঞপ্তির তারিখ যোগ করুন", desc: "তারিখ ও শর্ত মূল বিজ্ঞপ্তি থেকে নিশ্চিত করুন।" },
    { title: "ভর্তির পরিকল্পনা নামিয়ে নিন", desc: "আবেদনের কাজগুলোর তালিকা ডাউনলোড করুন।" },
  ],
  mediscan: [
    { title: "হাতে লেখা প্রেসক্রিপশন মিলিয়ে দেখুন", desc: "ছবি ও পড়ে পাওয়া লেখাটি পাশাপাশি যাচাই করুন।" },
    { title: "ওষুধের সতর্কতা দেখুন", desc: "অজানা তথ্যকে নিরাপদ ধরে নেবেন না।" },
    { title: "ওষুধের ক্যালেন্ডার নামিয়ে নিন", desc: "আপনার দেওয়া সময় অনুযায়ী অনুস্মারক সাজান।" },
  ],
  shohoj: [
    { title: "আজকের খরচ লিখুন", desc: "বাংলায় বলে বা কিবোর্ডে লিখে খরচ যোগ করুন; সংরক্ষণের আগে যাচাই করুন।" },
    { title: "বিকাশ ও নগদের খরচ দেখুন", desc: "টাকা তোলার আগে নির্ধারিত ফি যাচাই করুন।" },
    { title: "মাসিক খরচের গতি দেখুন", desc: "বাকি দিনের সঙ্গে বাজেটের হিসাব মিলিয়ে নিন।" },
  ],
  probaho: [
    { title: "এক মিনিটের ভাইভা অনুশীলন", desc: "নির্ধারিত সময়ের মধ্যে প্রশ্নের উত্তর দিন।" },
    { title: "উত্তরের গঠন পর্যালোচনা", desc: "পরিস্থিতি, কাজ, পদক্ষেপ ও ফলাফল উল্লেখ করুন।" },
    { title: "কথার অপ্রয়োজনীয় শব্দ খেয়াল করুন", desc: "স্বাভাবিক ও পরিষ্কার গতিতে কথা বলার অনুশীলন করুন।" },
  ],
  feeguard: [
    { title: "মার্কেটপ্লেসের ফি তুলনা করুন", desc: "পেমেন্টের পথভেদে ফি ও হাতে পাওয়া অর্থ যাচাই করুন।" },
    { title: "সরকারি প্রণোদনার শর্ত দেখুন", desc: "প্রযোজ্যতার জন্য মূল নির্দেশনা যাচাই করুন।" },
  ],
  chuktiguard: [
    { title: "বিভ্রাট সুরক্ষাসহ চুক্তি তৈরি করুন", desc: "পর্যালোচিত নমুনা ধারা থেকে প্রযোজ্য অংশ বাছুন।" },
    { title: "কর অব্যাহতির নথি যোগ করুন", desc: "চালানে সঠিক সরকারি সনদ সংযুক্ত করুন।" },
  ],
  path: [
    { title: "দক্ষতার পরিবর্তনশীল চাহিদা দেখুন", desc: "আপনার দক্ষতার তথ্য ও প্রমাণ পর্যালোচনা করুন।" },
    { title: "দক্ষতার পাসপোর্ট তৈরি করুন", desc: "যাচাই করা দক্ষতার তথ্য দিয়ে পাসপোর্ট তৈরি করুন।" },
  ],
  kormopath: [
    { title: "সবগুলো অ্যাপ ঘুরে দেখুন", desc: "পড়াশোনা, স্বাস্থ্য, কৃষি, বাজেট, অনুশীলন ও পেমেন্ট টুল দেখুন।" },
    { title: "নির্ভরযোগ্যতার পরীক্ষা দেখুন", desc: "নির্দিষ্ট নিয়ম ও হিসাব কীভাবে ভুল কমায় তা বুঝুন।" },
  ],
};

/**
 * Glossy, planet-like KormoPath voice orb.
 */
function SiriOrb({
  size = "md",
  active = false,
  onClick,
}: {
  size?: "sm" | "md" | "lg";
  active?: boolean;
  onClick?: () => void;
}) {
  const dimensions =
    size === "sm"
      ? "h-8 w-8"
      : size === "lg"
      ? "h-16 w-16 sm:h-[72px] sm:w-[72px]"
      : "h-11 w-11";

  const sphere = (
    <div className={`siri-sphere w-full h-full ${active ? "siri-active" : ""}`}>
      <div className="siri-sphere-inner" />
      <div className="siri-sphere-sheen" />
    </div>
  );
  const className = `relative grid shrink-0 place-items-center rounded-full siri-sphere-bezel ${dimensions} ${
    onClick ? "cursor-pointer hover:scale-105 active:scale-95" : ""
  }`;

  return onClick ? (
    <button type="button" onClick={onClick} aria-label="বাংলায় কথা বলুন বা বলা থামান" className={`${className} border-0 bg-transparent p-0`}>
      {sphere}
    </button>
  ) : (
    <div className={className} aria-hidden="true">
      {sphere}
    </div>
  );
}

export function Buddy() {
  const pathname = usePathname();
  const routeApp = appForPath(pathname);
  const [selectedApp, setSelectedApp] = useState<AppId>(routeApp);
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<AssistantMode>("manual");
  const [tab, setTab] = useState<AssistantTab>("talk");
  const [deepThinking, setDeepThinking] = useState(true);
  const [browseEnabled, setBrowseEnabled] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [showKeyboard, setShowKeyboard] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const chatScrollRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<unknown>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const speechUrlRef = useRef<string | null>(null);
  const speechAbortRef = useRef<AbortController | null>(null);
  const [speechLoading, setSpeechLoading] = useState(false);

  const appMeta = useMemo(() => APPS.find((a) => a.id === selectedApp) ?? APPS[0], [selectedApp]);
  const suggestions = useMemo(() => APP_SUGGESTIONS[selectedApp] ?? APP_SUGGESTIONS.kormopath, [selectedApp]);
  const tasks = useMemo(() => APP_TASKS[selectedApp] ?? APP_TASKS.kormopath, [selectedApp]);

  useEffect(() => {
    setSelectedApp(routeApp);
  }, [routeApp]);

  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  // Generate Bangla audio on the server so the browser never substitutes an English voice.
  const speak = async (text: string) => {
    if (!voiceEnabled || typeof window === "undefined") return;
    stopSpeaking();
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
      if (!response.ok || !data.audio) throw new Error(data.error || "বাংলা কণ্ঠ তৈরি করা যায়নি।");
      const bytes = Uint8Array.from(atob(data.audio), (char) => char.charCodeAt(0));
      const blob = new Blob([bytes], { type: data.mimeType || "audio/wav" });
      const url = URL.createObjectURL(blob);
      speechUrlRef.current = url;
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onplay = () => setIsSpeaking(true);
      audio.onended = () => stopSpeaking();
      audio.onerror = () => {
        setError("বাংলা অডিও চালানো যায়নি। আবার চেষ্টা করুন।");
        stopSpeaking();
      };
      await audio.play();
    } catch (err) {
      if (!(err instanceof DOMException && err.name === "AbortError")) {
        setError(err instanceof Error ? err.message : "বাংলা কণ্ঠে সমস্যা হয়েছে। আবার চেষ্টা করুন।");
        setIsSpeaking(false);
      }
    } finally {
      if (speechAbortRef.current === controller) {
        speechAbortRef.current = null;
        setSpeechLoading(false);
      }
    }
  };

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
    setSpeechLoading(false);
    setIsSpeaking(false);
  };

  useEffect(() => () => {
    speechAbortRef.current?.abort();
    audioRef.current?.pause();
    if (speechUrlRef.current) URL.revokeObjectURL(speechUrlRef.current);
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
      setError("আপনার ব্রাউজারে ভয়েস রিকগনিশন সমর্থন করে না। নিচের কিবোর্ড আইকন দিয়ে লিখুন।");
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
      recognition.lang = "bn-BD";

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
      setMessages((current) => [...current, {
        role: "assistant",
        content: reply,
        sources: data.sources,
        unverified: data.unverified,
      }]);
      speak(reply);
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
    <aside aria-label="কর্মোপথ সহায়ক" className={`buddy-root fixed bottom-4 right-4 ${open ? "z-50" : "z-30"} print:hidden font-sans`}>
      {open ? (
        <section
          aria-label="কর্মোপথ Buddy সহকারী"
          className="buddy-panel flex h-[min(730px,88dvh)] w-[min(440px,calc(100vw-2rem))] flex-col overflow-hidden rounded-[24px] border border-slate-700 bg-[#0d141b] text-white shadow-xl shadow-black/40"
        >
          {/* macOS Style Window Titlebar */}
          <header className="flex items-center justify-between border-b border-slate-700 bg-[#101821] px-4 py-3">
            {/* Traffic Lights */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  stopSpeaking();
                  setOpen(false);
                }}
                className="h-3 w-3 rounded-full bg-[#ff5f56] border border-[#e0443e] hover:brightness-110"
                aria-label="বন্ধ করুন"
              />
              <span className="h-3 w-3 rounded-full bg-[#ffbd2e] border border-[#dea123] opacity-80" />
              <span className="h-3 w-3 rounded-full bg-[#27c93f] border border-[#1aab29] opacity-80" />
            </div>

            {/* Title & Badge */}
            <div className="flex items-center gap-2">
              <SiriOrb size="sm" active={isSpeaking || isListening} />
              <div className="text-center">
                <span className="block text-[15px] font-bold tracking-tight text-white leading-tight">
                  কর্মোপথ সহকারী
                </span>
                <span className="block text-[12px] text-slate-300 leading-tight mt-0.5">
                  {appMeta.name} · {appMeta.tag}
                </span>
              </div>
            </div>

            {/* Status Chip */}
            <div className="flex items-center gap-1.5">
              <span className="inline-flex items-center gap-1 rounded-full border border-slate-600 bg-slate-800 px-2.5 py-1 text-[12px] font-semibold text-slate-100">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                {mode === "manual" ? "সহায়তা" : "পরিকল্পনা"}
              </span>
            </div>
          </header>

          {/* Segmented Control: [Manual] vs [Agent] */}
          <div className="px-5 pt-3 pb-2 text-center border-b border-slate-700 bg-[#0b1117]">
            <div className="inline-flex rounded-full bg-[#141e26] p-1 border border-slate-600">
              <button
                type="button"
                onClick={() => setMode("manual")}
                className={`rounded-full px-5 py-2 text-[13px] font-bold transition-colors ${
                  mode === "manual"
                    ? "bg-white text-slate-900"
                    : "text-slate-200 hover:bg-slate-700"
                }`}
              >
                সহায়তা
              </button>
              <button
                type="button"
                onClick={() => setMode("agent")}
                className={`rounded-full px-5 py-2 text-[13px] font-bold transition-colors ${
                  mode === "agent"
                    ? "bg-white text-slate-900"
                    : "text-slate-200 hover:bg-slate-700"
                }`}
              >
                পরিকল্পনা
              </button>
            </div>
            <p className="mt-1.5 text-[12px] text-slate-300 leading-snug">
              {mode === "manual"
                ? "Buddy পথ দেখায়—কাজের নিয়ন্ত্রণ আপনার হাতে।"
                : "Buddy ধাপে ধাপে পরিকল্পনা সাজায়; কোনো কাজ নিজে করে না।"}
            </p>

            {/* Deep Thinking Mode Chip */}
            <div className="mt-2.5 flex justify-center">
              <button
                type="button"
                onClick={() => setDeepThinking(!deepThinking)}
                aria-pressed={deepThinking}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-semibold border transition-colors ${
                  deepThinking
                    ? "border-emerald-500 bg-emerald-950 text-emerald-200"
                    : "border-slate-600 bg-slate-800 text-slate-200 hover:bg-slate-700"
                }`}
              >
                <Brain size={13} className={deepThinking ? "text-emerald-400" : "text-slate-400"} />
                <span>{deepThinking ? "উত্তর যাচাই চালু" : "উত্তর যাচাই বন্ধ"}</span>
              </button>
            </div>
          </div>

          {/* Horizontal Navigation: Talk | Tasks | Apps | Security */}
          <nav aria-label="সহকারীর বিভাগ" className="flex border-b border-slate-700 bg-[#0e161f] px-4 text-[13px] font-semibold text-slate-300">
            <button
              type="button"
              onClick={() => setTab("talk")}
              className={`flex items-center gap-1.5 py-2.5 px-3 border-b-2 transition-colors ${
                tab === "talk"
                  ? "border-amber-400 text-amber-300 font-bold"
                  : "border-transparent text-slate-300 hover:text-white"
              }`}
            >
              <MessageCircle size={14} />
              <span>কথা</span>
            </button>
            <button
              type="button"
              onClick={() => setTab("tasks")}
              className={`flex items-center gap-1.5 py-2.5 px-3 border-b-2 transition-colors ${
                tab === "tasks"
                  ? "border-amber-400 text-amber-300 font-bold"
                  : "border-transparent text-slate-300 hover:text-white"
              }`}
            >
              <CheckSquare size={14} />
              <span>কাজ {tasks.length > 0 && <span className="rounded-full bg-slate-700 px-1.5 text-[11px]">{tasks.length}</span>}</span>
            </button>
            <button
              type="button"
              onClick={() => setTab("apps")}
              className={`flex items-center gap-1.5 py-2.5 px-3 border-b-2 transition-colors ${
                tab === "apps"
                  ? "border-amber-400 text-amber-300 font-bold"
                  : "border-transparent text-slate-300 hover:text-white"
              }`}
            >
              <Layers size={14} />
              <span>অ্যাপ</span>
            </button>
            <button
              type="button"
              onClick={() => setTab("security")}
              className={`flex items-center gap-1.5 py-2.5 px-3 border-b-2 transition-colors ${
                tab === "security"
                  ? "border-amber-400 text-amber-300 font-bold"
                  : "border-transparent text-slate-300 hover:text-white"
              }`}
            >
              <ShieldCheck size={14} />
              <span>গোপনীয়তা</span>
            </button>
          </nav>

          {/* Tab 1: Talk (Chat & Suggestions) */}
          {tab === "talk" && (
            <div className="flex-1 flex flex-col min-h-0">
              {/* Suggestion Chips */}
              <div className="p-3 border-b border-slate-700 bg-[#0a1016] flex flex-wrap gap-1.5 max-h-36 overflow-y-auto">
                {suggestions.map((chip) => (
                  <button
                    key={chip}
                    type="button"
                    disabled={loading}
                    onClick={() => void send(undefined, chip)}
                    className="rounded-full border border-slate-600 bg-slate-800 px-3 py-1.5 text-[12px] font-medium text-slate-100 hover:border-emerald-400 hover:bg-slate-700 transition-colors disabled:opacity-50"
                  >
                    {chip}
                  </button>
                ))}
                <button
                  type="button"
                  aria-pressed={browseEnabled}
                  disabled={selectedApp === "mediscan" || loading}
                  title={selectedApp === "mediscan" ? "ওষুধ ও ব্যক্তিগত স্বাস্থ্যতথ্যের জন্য ওয়েব খোঁজ বন্ধ" : "সূত্রসহ ওয়েবে খুঁজুন"}
                  onClick={() => setBrowseEnabled(!browseEnabled)}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                    browseEnabled
                      ? "border-sky-300 bg-sky-900 text-sky-100"
                      : "border-slate-500 bg-slate-900 text-slate-100 hover:bg-slate-700"
                  }`}
                >
                  <Globe size={14} />
                  ওয়েবে খুঁজুন
                </button>
              </div>

              {/* Chat Message Scroll */}
              <div
                ref={chatScrollRef}
                className="flex-1 overflow-y-auto p-4 space-y-3"
                aria-live="polite"
              >
                {messages.length === 0 ? (
                  <div className="buddy-intro rounded-2xl border border-slate-700 bg-[#111c30] p-4 text-center">
                    <p className="text-[15px] leading-relaxed text-slate-100 font-medium">
                      হ্যালো, আমি <strong className="text-emerald-400">Buddy</strong>। {appMeta.name} নিয়ে কীভাবে সাহায্য করতে পারি?
                    </p>
                    <p className="mt-2 text-[13px] leading-relaxed text-slate-300">
                      নিচের প্রশ্ন বেছে নিন অথবা নিচের গোলকটি চেপে বাংলায় কথা বলুন।
                    </p>
                  </div>
                ) : (
                  messages.map((message, index) => (
                    <div
                      key={`${index}-${message.role}`}
                      className={`max-w-[90%] rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed ${
                        message.role === "user"
                          ? "ml-auto bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-sm"
                          : "buddy-reply mr-auto border border-slate-700 bg-[#111c30] text-slate-100"
                      }`}
                    >
                      {message.unverified && <span className="mb-1.5 block text-[11px] font-bold text-amber-200">ওয়েবের তথ্য—যাচাই করা নয়</span>}
                      {message.content}
                      {message.sources && message.sources.length > 0 && (
                        <div className="mt-2 border-t border-slate-600 pt-2">
                          <span className="block text-[11px] font-semibold text-slate-200">সূত্র</span>
                          <ul className="mt-1 space-y-1">
                            {message.sources.map((source) => (
                              <li key={source.url}>
                                <a href={source.url} target="_blank" rel="noreferrer" className="inline-flex items-start gap-1 text-[12px] text-sky-300 underline decoration-sky-700 underline-offset-2 hover:text-sky-100">
                                  <ExternalLink size={12} className="mt-1 shrink-0" />
                                  <span>{source.title}</span>
                                </a>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ))
                )}
                {loading && (
                  <div className="flex items-center gap-2 text-[12px] text-emerald-400 py-1" role="status">
                    <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
                  <span>উত্তর তৈরি হচ্ছে…</span>
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

          {/* Tab 2: Tasks */}
          {tab === "tasks" && (
            <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
              <span className="text-[12px] font-bold text-slate-300 block mb-2">
                {appMeta.name} এর জরুরি অ্যাকশন তালিকা:
              </span>
              {tasks.map((t, idx) => (
                <div
                  key={idx}
                  className="rounded-xl border border-white/10 bg-white/[0.03] p-3 hover:border-emerald-500/40 transition-colors"
                >
                  <strong className="text-[13px] text-emerald-300 block leading-snug">
                    {t.title}
                  </strong>
                  <p className="text-[11px] text-slate-400 mt-1 leading-normal">
                    {t.desc}
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setTab("talk");
                      void send(undefined, t.title);
                    }}
                    className="mt-2 inline-flex items-center gap-1 text-[11px] font-bold text-amber-300 hover:text-amber-200"
                  >
                    <span>Buddy দিয়ে সমাধান করুন</span>
                    <ArrowRight size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Tab 3: Apps */}
          {tab === "apps" && (
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              <span className="text-[12px] font-bold text-slate-300 block mb-2">
                সহকারী কোন অ্যাপটি নিয়ে কাজ করবে?
              </span>
              <div className="grid grid-cols-1 gap-2">
                {APPS.map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => {
                      setSelectedApp(a.id);
                      if (a.id === "mediscan") setBrowseEnabled(false);
                      setTab("talk");
                      setMessages([]);
                    }}
                    className={`flex items-center justify-between p-3 rounded-xl border text-left transition-all ${
                      selectedApp === a.id
                        ? "border-emerald-500 bg-emerald-500/10 text-white"
                        : "border-white/5 bg-white/[0.02] text-slate-300 hover:border-white/20"
                    }`}
                  >
                    <div>
                      <span className="block text-[13px] font-bold">{a.name}</span>
                      <span className="block text-[10px] text-slate-400">{a.tag}</span>
                    </div>
                    {selectedApp === a.id && (
                      <span className="h-2 w-2 rounded-full bg-emerald-400" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Tab 4: Security */}
          {tab === "security" && (
            <div className="flex-1 overflow-y-auto p-4 space-y-3 text-[12px] text-slate-300">
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-3">
                <span className="flex items-center gap-1.5 font-bold text-emerald-300 text-[13px]">
                  <ShieldCheck size={16} />
                  <span>আপনার গোপনীয়তা</span>
                </span>
                <p className="mt-1.5 text-[11px] text-slate-300 leading-relaxed">
                  আপনার বাজেট, প্রেসক্রিপশন, সিভি এবং ইনভয়েস ডেটা ব্রাউজারের নিজস্ব লোকালস্টোরেজে থাকে।
                  কোনো ইউজার অ্যাকাউন্ট বা সেন্ট্রাল ডাটাবেজে স্টোর হয় না।
                </p>
              </div>

              <div className="rounded-xl border border-white/5 bg-white/[0.03] p-3 space-y-2 text-[11px] text-slate-400">
                <p>• <strong>প্রেসক্রিপশন সুরক্ষা</strong>: কোনো মেডিকেল ডেটা সংরক্ষণ করা হয় না।</p>
                <p>• <strong>আর্থিক সততা</strong>: ফিনান্সিয়াল হিসাব ১০০% অপরিবর্তনশীল পূর্ণসংখ্যা পয়সা নিয়মে গণনা হয়।</p>
                <p>• <strong>এআই ব্যবহার</strong>: উত্তরের জন্য সার্ভারের নিরাপদ জেমিনি সংযোগ ব্যবহৃত হয়; গোপন চাবি ব্রাউজারে পাঠানো হয় না।</p>
              </div>
            </div>
          )}

          {/* Optional Collapsible Text Input Area */}
          {showKeyboard && (
            <form
              onSubmit={(event) => void send(event)}
              className="flex items-end gap-2 border-t border-white/10 bg-[#0c1219] p-3"
            >
              <label htmlFor="buddy-input" className="sr-only">Buddy-কে বার্তা লিখুন</label>
              <textarea
                id="buddy-input"
                value={input}
                maxLength={1200}
                rows={2}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Buddy-কে কোনো প্রশ্ন করুন…"
                className="max-h-24 min-h-10 flex-1 resize-y rounded-xl border border-white/10 bg-slate-900/90 px-3 py-2 text-[12px] text-white outline-none placeholder:text-slate-500 focus:border-emerald-400"
              />
              <button
                type="submit"
                disabled={!input.trim() || loading}
                aria-label="বার্তা পাঠান"
                className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-bold hover:brightness-110 disabled:opacity-40"
              >
                <Send size={15} />
              </button>
            </form>
          )}

          {/* Bottom Siri Orb & Voice Bar (Apple-Style Interface) */}
          <footer className="border-t border-white/5 bg-gradient-to-t from-[#060a0e] via-[#091016] to-[#0c141c] px-4 py-3 text-center">
            <div className="flex items-center justify-between px-2">
              {/* Speaker / Voice Mute Toggle */}
              <button
                type="button"
                onClick={() => {
                  if (isSpeaking || speechLoading) stopSpeaking();
                  setVoiceEnabled(!voiceEnabled);
                }}
                title={voiceEnabled ? "বাংলা কণ্ঠ বন্ধ করুন" : "বাংলা কণ্ঠ চালু করুন"}
                className={`grid h-10 w-10 place-items-center rounded-full border transition-all ${
                  voiceEnabled
                    ? "border-white/15 bg-white/10 text-slate-200 hover:bg-white/20"
                    : "border-white/5 bg-white/5 text-slate-500 hover:text-slate-300"
                }`}
              >
                {voiceEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
              </button>

              {/* Large Glowing Siri Orb */}
              <SiriOrb
                size="lg"
                active={isSpeaking || isListening}
                onClick={toggleListening}
              />

              {/* Keyboard Toggle */}
              <button
                type="button"
                onClick={() => setShowKeyboard(!showKeyboard)}
                title="কিবোর্ডে লিখুন"
                className={`grid h-10 w-10 place-items-center rounded-full border transition-all ${
                  showKeyboard
                    ? "border-emerald-500/50 bg-emerald-500/20 text-emerald-300"
                    : "border-white/15 bg-white/10 text-slate-200 hover:bg-white/20"
                }`}
              >
                <Keyboard size={16} />
              </button>
            </div>

            {/* Status Text Below Orb */}
            <div className="mt-2 text-center">
              <span className="block text-[12px] font-semibold text-slate-300">
                {isSpeaking
                  ? "বাংলায় বলছি… থামাতে গোলকে চাপ দিন"
                  : speechLoading
                  ? "বাংলা কণ্ঠ তৈরি হচ্ছে…"
                  : isListening
                  ? "শুনছি… বাংলায় বলুন"
                  : "প্রস্তুত… বাংলায় কথা বলতে গোলকে চাপ দিন"}
              </span>
              <span className="block text-[10px] text-amber-300/80 font-medium mt-0.5">
                {voiceEnabled ? "বাংলা কণ্ঠ চালু" : "বাংলা কণ্ঠ বন্ধ"}
              </span>
            </div>
          </footer>
        </section>
      ) : (
        /* KormoPath Buddy floating launcher */
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="কর্মোপথ সহায়ক খুলুন"
          aria-haspopup="dialog"
          aria-expanded={open}
          className="buddy-launcher group grid place-items-center rounded-full border text-white transition-all duration-300"
        >
          <div className="buddy-launcher-orb" aria-hidden="true">
            <SiriOrb size="lg" active={false} />
          </div>
        </button>
      )}
    </aside>
  );
}
