"use client";

import { useEffect, useState, useRef, useMemo, type FormEvent, type KeyboardEvent } from "react";
import { usePathname } from "next/navigation";
import {
  MessageCircle,
  Send,
  X,
  Sparkles,
  Volume2,
  VolumeX,
  Keyboard,
  Brain,
  CheckSquare,
  ShieldCheck,
  Layers,
  ArrowRight,
  ExternalLink,
} from "lucide-react";

const APPS = [
  { id: "kormopath", name: "KormoPath Core", tag: "Platform", route: "/" },
  { id: "path", name: "My Path Board", tag: "Career", route: "/opportunities" },
  { id: "chuktiguard", name: "ChuktiGuard", tag: "Contracts", route: "/chuktiguard" },
  { id: "feeguard", name: "FeeGuard BD", tag: "FinOps", route: "/feeguard" },
  { id: "admitbuddy", name: "AdmitBuddy", tag: "Admissions", route: "/admitbuddy" },
  { id: "mediscan", name: "MediScan BD", tag: "Health Rx", route: "/mediscan" },
  { id: "shohoj", name: "Shohoj Budget", tag: "Personal Finance", route: "/shohoj-budget" },
  { id: "haatbazar", name: "HaatBazar AI", tag: "Agriculture", route: "/haatbazar" },
  { id: "probaho", name: "Probaho Coach", tag: "Viva Prep", route: "/probaho" },
] as const;

type AppId = (typeof APPS)[number]["id"];
type Message = { role: "user" | "assistant"; content: string };
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
    "What to plant?",
    "Compare the options",
    "Water today?",
    "Harvest date?",
    "Next crop?",
    "Report a problem",
    "Talk to my officer",
  ],
  admitbuddy: [
    "What university fits me?",
    "Compare the options",
    "Check list balance",
    "Analyze SOP readability",
    "Verified circular deadlines",
    "Export roadmap (.md)",
  ],
  mediscan: [
    "Explain dosage code",
    "Check drug interactions",
    "Generic savings comparison",
    "Emergency red flags",
    "How to take with meals?",
  ],
  shohoj: [
    "Daily safe spend",
    "bKash cash-out fee",
    "Nagad cash-out fee",
    "Split group bill",
    "Budget pace this month",
  ],
  probaho: [
    "Start technical viva",
    "Practice STAR answer",
    "Check speaking pace",
    "Filler words advice",
    "Custom viva question",
  ],
  feeguard: [
    "Fiverr vs Direct SWIFT",
    "2.5% Cash incentive",
    "Best payout route",
    "Check reality calculation",
  ],
  chuktiguard: [
    "Generate B2B agreement",
    "Clause 4 Blackout SLA",
    "NBR ITES tax notice",
    "Split contract milestones",
  ],
  path: [
    "Verify skill passport",
    "AI obsolescence risk",
    "Track my applications",
    "Check next milestone",
  ],
  kormopath: [
    "What to explore?",
    "Explain 5-stage workspace",
    "How deterministic guards work",
    "Open 6 apps ecosystem",
  ],
};

const APP_TASKS: Record<AppId, Array<{ title: string; desc: string; href?: string }>> = {
  haatbazar: [
    { title: "Check 6-Hour Spray Window", desc: "Ensure no rain (>40%) or wind (>15 km/h) before spraying." },
    { title: "Calculate Truck Share Fare", desc: "Proportionally split shared haulage cost across farmers." },
    { title: "Wholesale Price Sensitivity", desc: "Model profit margin across ±15% wholesale price shocks." },
  ],
  admitbuddy: [
    { title: "Evaluate CollegeVine 2-3-2 Ratio", desc: "Check portfolio balance across Reach, Match, and Safety." },
    { title: "Set Official Circular Deadlines", desc: "Verify official university dates with zero invented data." },
    { title: "Export Admission Roadmap", desc: "Download structured Markdown checklist for applications." },
  ],
  mediscan: [
    { title: "Verify Handwritten Prescription", desc: "Cross-check OCR output side-by-side with original scan." },
    { title: "Scan for Chelation & Toxicity", desc: "Audit Ciprofloxacin + Antacids and Metronidazole combinations." },
    { title: "Export 30-Day Medication Calendar", desc: "Sync .ics medication reminders to your mobile device." },
  ],
  shohoj: [
    { title: "Log Today's Living Expenses", desc: "Use Bangla voice or 1-tap quick keypad for integer poisha logging." },
    { title: "Audit bKash / Nagad Cash-Outs", desc: "Calculate exact ceiling fees down to the poisha before withdrawal." },
    { title: "Check Monthly Spend Velocity", desc: "Verify daily safe burn rate against remaining days." },
  ],
  probaho: [
    { title: "1-Minute Viva Practice", desc: "Answer technical or behavioral prompt within target duration." },
    { title: "Review STAR Method Structure", desc: "Verify Situation, Task, Action, and Result coverage." },
    { title: "Audit Filler Word Density", desc: "Keep speech cadence near 130 WPM with under 3% filler words." },
  ],
  feeguard: [
    { title: "Audit Marketplace Commission Drain", desc: "Calculate exact savings switching to direct client wire." },
    { title: "Claim 2.5% Government Incentive", desc: "Verify Bangladesh Bank FE Circular 02 compliance." },
  ],
  chuktiguard: [
    { title: "Issue 48h Blackout Protected Contract", desc: "Include Clause 4 internet disruption force-majeure shield." },
    { title: "Include NBR ITES Tax Exemption", desc: "Attach statutory tax exemption certificate to B2B invoices." },
  ],
  path: [
    { title: "Audit Skill Obsolescence", desc: "Run multimodal CV extraction and rule-based skill valuation." },
    { title: "Issue Cryptographic Skill Passport", desc: "Sign verified competencies with HMAC-SHA256." },
  ],
  kormopath: [
    { title: "Explore All 6 Applications", desc: "Access Education, Health, Agriculture, Budget, Viva, and FinOps." },
    { title: "Run Live Judge Assertions", desc: "Test deterministic zero-hallucination guards in real time." },
  ],
};

/**
 * 3D Siri-Style Iridescent Glowing Metallic Sphere Orb
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

  return (
    <div
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      aria-label="Siri Voice Orb"
      className={`relative grid shrink-0 place-items-center rounded-full siri-sphere-bezel ${dimensions} ${
        onClick ? "cursor-pointer hover:scale-105 active:scale-95" : ""
      }`}
    >
      <div
        className={`siri-sphere w-full h-full ${
          active ? "siri-active" : ""
        }`}
      >
        <div className="siri-sphere-inner" />
        <div className="siri-sphere-sheen" />
        {/* Soft center sparkle reflection */}
        <div className="absolute inset-0 grid place-items-center z-10 pointer-events-none">
          <Sparkles
            size={size === "sm" ? 13 : size === "lg" ? 22 : 16}
            strokeWidth={1.8}
            className="text-amber-100/90 drop-shadow-[0_0_8px_rgba(45,212,191,0.8)]"
          />
        </div>
      </div>
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

  // Text-To-Speech (SpeechSynthesis)
  const speak = (text: string) => {
    if (!voiceEnabled || typeof window === "undefined" || !("speechSynthesis" in window)) return;
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "bn-BD";
      utterance.rate = 1.05;
      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);
      window.speechSynthesis.speak(utterance);
    } catch {
      setIsSpeaking(false);
    }
  };

  const stopSpeaking = () => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  };

  // Speech-To-Text (Web Speech API)
  const toggleListening = () => {
    if (isSpeaking) {
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
          messages: nextMessages.slice(-8),
        }),
      });

      const data = (await response.json().catch(() => ({}))) as { reply?: string; error?: string };
      if (!response.ok || typeof data.reply !== "string") {
        throw new Error(data.error || "এখন উত্তর পাওয়া গেল না।");
      }

      const reply = data.reply;
      setMessages((current) => [...current, { role: "assistant", content: reply }]);
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
    <aside aria-label="Buddy field assistant" className="fixed bottom-4 right-4 z-[70] print:hidden font-sans">
      {open ? (
        <section
          aria-label="KormoPath Buddy assistant window"
          className="flex h-[min(730px,88dvh)] w-[min(440px,calc(100vw-2rem))] flex-col overflow-hidden rounded-[28px] border border-white/10 bg-[#0d141b]/95 text-white shadow-2xl shadow-black/70 backdrop-blur-2xl transition-all"
        >
          {/* macOS Style Window Titlebar */}
          <header className="flex items-center justify-between border-b border-white/5 bg-[#101821]/90 px-4 py-3">
            {/* Traffic Lights */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  stopSpeaking();
                  setOpen(false);
                }}
                className="h-3 w-3 rounded-full bg-[#ff5f56] border border-[#e0443e] hover:brightness-110"
                aria-label="Close"
              />
              <span className="h-3 w-3 rounded-full bg-[#ffbd2e] border border-[#dea123] opacity-80" />
              <span className="h-3 w-3 rounded-full bg-[#27c93f] border border-[#1aab29] opacity-80" />
            </div>

            {/* Title & Badge */}
            <div className="flex items-center gap-2">
              <SiriOrb size="sm" active={isSpeaking || isListening} />
              <div className="text-center">
                <span className="block text-[14px] font-bold tracking-tight text-white leading-none">
                  KormoPath Buddy
                </span>
                <span className="block text-[10px] text-slate-400 leading-none mt-0.5">
                  {appMeta.name} • Field Assistant
                </span>
              </div>
            </div>

            {/* Status Chip */}
            <div className="flex items-center gap-1.5">
              <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-[10px] font-semibold text-slate-300">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                {mode === "manual" ? "Manual" : "Agent"}
              </span>
            </div>
          </header>

          {/* Segmented Control: [Manual] vs [Agent] */}
          <div className="px-5 pt-3 pb-2 text-center border-b border-white/5 bg-[#0b1117]">
            <div className="inline-flex rounded-full bg-[#141e26] p-1 border border-white/5 shadow-inner">
              <button
                type="button"
                onClick={() => setMode("manual")}
                className={`rounded-full px-6 py-1.5 text-[12px] font-bold transition-all ${
                  mode === "manual"
                    ? "bg-white text-slate-900 shadow-md scale-[1.02]"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Manual
              </button>
              <button
                type="button"
                onClick={() => setMode("agent")}
                className={`rounded-full px-6 py-1.5 text-[12px] font-bold transition-all ${
                  mode === "agent"
                    ? "bg-white text-slate-900 shadow-md scale-[1.02]"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Agent
              </button>
            </div>
            <p className="mt-1.5 text-[11px] text-slate-400 leading-tight">
              {mode === "manual"
                ? "The agent only suggests; you do every step yourself."
                : "Autonomous mode active; deterministic guardrails enforce zero drift."}
            </p>

            {/* Deep Thinking Mode Chip */}
            <div className="mt-2.5 flex justify-center">
              <button
                type="button"
                onClick={() => setDeepThinking(!deepThinking)}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold border transition-all ${
                  deepThinking
                    ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300 shadow-xs shadow-emerald-500/20"
                    : "border-white/10 bg-white/5 text-slate-400 hover:text-slate-200"
                }`}
              >
                <Brain size={13} className={deepThinking ? "text-emerald-400" : "text-slate-400"} />
                <span>Deep thinking (Gemini 2.5)</span>
              </button>
            </div>
          </div>

          {/* Horizontal Navigation: Talk | Tasks | Apps | Security */}
          <nav aria-label="Assistant navigation" className="flex border-b border-white/5 bg-[#0e161f] px-4 text-[12px] font-semibold text-slate-400">
            <button
              type="button"
              onClick={() => setTab("talk")}
              className={`flex items-center gap-1.5 py-2.5 px-3 border-b-2 transition-colors ${
                tab === "talk"
                  ? "border-amber-400 text-amber-300 font-bold"
                  : "border-transparent hover:text-white"
              }`}
            >
              <MessageCircle size={14} />
              <span>Talk</span>
            </button>
            <button
              type="button"
              onClick={() => setTab("tasks")}
              className={`flex items-center gap-1.5 py-2.5 px-3 border-b-2 transition-colors ${
                tab === "tasks"
                  ? "border-amber-400 text-amber-300 font-bold"
                  : "border-transparent hover:text-white"
              }`}
            >
              <CheckSquare size={14} />
              <span>Tasks {tasks.length > 0 && <span className="rounded-full bg-white/10 px-1.5 text-[10px]">{tasks.length}</span>}</span>
            </button>
            <button
              type="button"
              onClick={() => setTab("apps")}
              className={`flex items-center gap-1.5 py-2.5 px-3 border-b-2 transition-colors ${
                tab === "apps"
                  ? "border-amber-400 text-amber-300 font-bold"
                  : "border-transparent hover:text-white"
              }`}
            >
              <Layers size={14} />
              <span>Apps</span>
            </button>
            <button
              type="button"
              onClick={() => setTab("security")}
              className={`flex items-center gap-1.5 py-2.5 px-3 border-b-2 transition-colors ${
                tab === "security"
                  ? "border-amber-400 text-amber-300 font-bold"
                  : "border-transparent hover:text-white"
              }`}
            >
              <ShieldCheck size={14} />
              <span>Security</span>
            </button>
          </nav>

          {/* Tab 1: Talk (Chat & Suggestions) */}
          {tab === "talk" && (
            <div className="flex-1 flex flex-col min-h-0">
              {/* Suggestion Chips */}
              <div className="p-3 border-b border-white/5 bg-[#0a1016]/80 flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
                {suggestions.map((chip) => (
                  <button
                    key={chip}
                    type="button"
                    disabled={loading}
                    onClick={() => void send(undefined, chip)}
                    className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] font-medium text-slate-200 hover:border-emerald-400/60 hover:bg-emerald-500/10 hover:text-emerald-200 transition-all active:scale-95 disabled:opacity-50"
                  >
                    {chip}
                  </button>
                ))}
              </div>

              {/* Chat Message Scroll */}
              <div
                ref={chatScrollRef}
                className="flex-1 overflow-y-auto p-4 space-y-3"
                aria-live="polite"
              >
                {messages.length === 0 ? (
                  <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-4 text-center">
                    <p className="text-[14px] leading-relaxed text-slate-200 font-medium">
                      হ্যালো, আমি <strong className="text-emerald-400">Buddy</strong>। {appMeta.name} নিয়ে কীভাবে সাহায্য করতে পারি?
                    </p>
                    <p className="mt-2 text-[11px] leading-relaxed text-slate-400">
                      নিচের সাজেস্টেড প্রশ্নে ট্যাপ করুন অথবা <strong>Siri Orb</strong> চেপে ভয়েসে কথা বলুন।
                    </p>
                  </div>
                ) : (
                  messages.map((message, index) => (
                    <div
                      key={`${index}-${message.role}`}
                      className={`max-w-[90%] rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed ${
                        message.role === "user"
                          ? "ml-auto bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-sm"
                          : "mr-auto border border-white/10 bg-white/[0.05] text-slate-100 shadow-xs"
                      }`}
                    >
                      {message.content}
                    </div>
                  ))
                )}
                {loading && (
                  <div className="flex items-center gap-2 text-[12px] text-emerald-400 py-1" role="status">
                    <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
                    <span>Buddy ভাবছে…</span>
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
                  <span>ডিভাইস-ফার্স্ট গোপনীয়তা (Strict Privacy)</span>
                </span>
                <p className="mt-1.5 text-[11px] text-slate-300 leading-relaxed">
                  আপনার বাজেট, প্রেসক্রিপশন, সিভি এবং ইনভয়েস ডেটা ব্রাউজারের নিজস্ব লোকালস্টোরেজে থাকে।
                  কোনো ইউজার অ্যাকাউন্ট বা সেন্ট্রাল ডাটাবেজে স্টোর হয় না।
                </p>
              </div>

              <div className="rounded-xl border border-white/5 bg-white/[0.03] p-3 space-y-2 text-[11px] text-slate-400">
                <p>• <strong>প্রেসক্রিপশন সুরক্ষা</strong>: কোনো মেডিকেল ডেটা সংরক্ষণ করা হয় না।</p>
                <p>• <strong>আর্থিক সততা</strong>: ফিনান্সিয়াল হিসাব ১০০% অপরিবর্তনশীল পূর্ণসংখ্যা পয়সা নিয়মে গণনা হয়।</p>
                <p>• <strong>এআই লিমিট</strong>: শুধুমাত্র নির্দেশিত প্রম্পট প্রসেসিংয়ের জন্য নিরাপদ জেমিনি এপিআই ব্যবহৃত হয়।</p>
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
                aria-label="Send message"
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
                  if (isSpeaking) stopSpeaking();
                  setVoiceEnabled(!voiceEnabled);
                }}
                title={voiceEnabled ? "Mute voice response" : "Enable voice response"}
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
                title="Toggle text input"
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
                  ? "Speaking… tap orb to stop"
                  : isListening
                  ? "Listening… speak your question"
                  : "Ready… tap orb to talk"}
              </span>
              <span className="block text-[10px] text-amber-300/80 font-medium mt-0.5">
                {voiceEnabled ? "Natural voice is on; the device voice speaks." : "Voice output muted."}
              </span>
            </div>
          </footer>
        </section>
      ) : (
        /* Collapsed Floating Pill Launcher (Matching User Image 3) */
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open KormoPath Buddy assistant"
          className="group flex items-center gap-2.5 rounded-full border border-teal-900/60 bg-[#07131b]/95 px-3 py-2 text-white shadow-2xl shadow-teal-950/60 backdrop-blur-xl hover:scale-105 active:scale-95 hover:border-teal-500/40 transition-all duration-200"
        >
          {/* Bezel Ring enclosing the Siri Sphere */}
          <div className="relative">
            <SiriOrb size="sm" active={false} />
          </div>

          {/* Buddy Brand Text */}
          <span className="text-[14px] font-bold text-white tracking-wide pr-0.5">
            Buddy
          </span>

          {/* Cyan/Mint Outline Speech Bubble */}
          <MessageCircle
            size={18}
            strokeWidth={2}
            className="text-emerald-400 group-hover:scale-110 transition-transform"
            aria-hidden
          />
        </button>
      )}
    </aside>
  );
}
