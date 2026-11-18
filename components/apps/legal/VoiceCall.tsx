"use client";
import { useEffect, useRef, useState } from "react";
import { Mic, MicOff, Phone, PhoneOff, RotateCcw, Send } from "lucide-react";
import { PROBLEM_CATEGORIES } from "@/lib/legal/taxonomy";
import { interpretSemanticBridge, type IndigenousLanguage, type SemanticBridgeResult } from "@/lib/legal/semanticBridge";

/*
 * Call mode of the legal assistant: a calm phone screen with a keypad menu, a speaking orb and a live transcript.
 * The IVR flow and greeting follow the Digital Legal Aid System's voice agent (razibr246, AdribMahmud101); its paid
 * Soniox speech and Groq model are replaced by the browser's own speech recognition, Gemini TTS (/api/legal/speak)
 * with the browser voice as fallback, and /api/legal/assist. Nothing is recorded, stored or uploaded except the
 * recognised text of each question, sent to /api/legal/assist to answer it.
 */

export interface AssistReply {
  answer: string;
  crisis: boolean;
  engine: string;
}

type SR = {
  lang: string; interimResults: boolean; continuous: boolean; maxAlternatives: number;
  start: () => void; stop: () => void; abort: () => void;
  onresult: ((e: { resultIndex: number; results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
};

const bnNum = (v: string | number) => String(v).replace(/\d/g, (d) => "০১২৩৪৫৬৭৮৯"[Number(d)]);

/** The ten problem categories on keys 1–9 and 0, as in the original IVR menu. */
export const KEYPAD = PROBLEM_CATEGORIES.filter((c) => !c.freeText && c.id !== "other").slice(0, 10).map((c, i) => ({ key: i === 9 ? "0" : String(i + 1), cat: c }));

let currentAudio: HTMLAudioElement | null = null;

/** Speaks text with Gemini TTS, falling back to the browser voice. Resolves when speech ends or is stopped. */
export async function speakText(text: string, lang: "bn" | "en"): Promise<void> {
  stopSpeaking();
  const clean = text.replace(/\s+/g, " ").trim().slice(0, 1200);
  if (!clean) return;
  try {
    const r = await fetch("/api/legal/speak", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ text: clean, lang }) });
    if (r.ok) {
      const j = (await r.json()) as { audio?: string; mimeType?: string };
      if (j.audio) {
        await new Promise<void>((resolve) => {
          const a = new Audio(`data:${j.mimeType || "audio/wav"};base64,${j.audio}`);
          currentAudio = a;
          a.onended = () => resolve();
          a.onerror = () => resolve();
          a.onpause = () => resolve();
          a.play().catch(() => resolve());
        });
        return;
      }
    }
  } catch { /* fall through to the browser voice */ }
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  await new Promise<void>((resolve) => {
    const u = new SpeechSynthesisUtterance(clean);
    u.lang = lang === "bn" ? "bn-BD" : "en-GB";
    u.rate = 0.95;
    u.onend = () => resolve();
    u.onerror = () => resolve();
    window.speechSynthesis.speak(u);
  });
}

export function stopSpeaking() {
  if (currentAudio) { currentAudio.pause(); currentAudio = null; }
  if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
}

type Phase = "idle" | "speaking" | "listening" | "thinking";
interface Line { who: "you" | "agent"; text: string }

export function VoiceCall({ lang, community, ask }: {
  lang: "bn" | "en";
  community: "bn" | IndigenousLanguage;
  ask: (text: string, topic: string | null) => Promise<AssistReply | null>;
}) {
  const bn = lang === "bn";
  const T = (b: string, e: string) => (bn ? b : e);
  const [inCall, setInCall] = useState(false);
  const [phase, setPhase] = useState<Phase>("idle");
  const [lines, setLines] = useState<Line[]>([]);
  const [interim, setInterim] = useState("");
  const [topic, setTopicState] = useState<string | null>(null);
  const topicRef = useRef<string | null>(null);
  const setTopic = (v: string | null) => { topicRef.current = v; setTopicState(v); };
  const [supported, setSupported] = useState(true);
  const [seconds, setSeconds] = useState(0);
  const [bridge, setBridge] = useState<SemanticBridgeResult | null>(null);
  const [typed, setTyped] = useState("");
  const recRef = useRef<SR | null>(null);
  const liveRef = useRef(false);

  useEffect(() => {
    const w = window as unknown as { SpeechRecognition?: unknown; webkitSpeechRecognition?: unknown };
    setSupported(!!(w.SpeechRecognition || w.webkitSpeechRecognition));
    return () => { liveRef.current = false; recRef.current?.abort(); stopSpeaking(); };
  }, []);
  useEffect(() => {
    if (!inCall) return;
    const t = window.setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => window.clearInterval(t);
  }, [inCall]);

  const menuText = () => (bn
    ? `বিষয় বেছে নিতে নম্বর চাপুন: ${KEYPAD.slice(0, 5).map((k) => `${bnNum(k.key)} ${k.cat.bn}`).join(", ")}, অথবা সরাসরি আপনার সমস্যা বলুন।`
    : `Press a number to choose a topic: ${KEYPAD.slice(0, 5).map((k) => `${k.key} ${k.cat.en}`).join(", ")}, or just tell me your problem.`);

  // Plain functions on purpose: the speak → listen → answer chain runs across renders, so it reads the topic from a ref.
  async function say(text: string) {
    setPhase("speaking");
    setLines((l) => [...l, { who: "agent", text }]);
    await speakText(text, lang);
    if (liveRef.current) listen();
  }

  const handleQuestion = async (text: string, chosenTopic: string | null) => {
    setLines((l) => [...l, { who: "you", text }]);
    setPhase("thinking");
    const reply = await ask(text, chosenTopic);
    if (!liveRef.current) return;
    await say(reply ? reply.answer : T("দুঃখিত, এখন উত্তর আনা গেল না। ১৬৬৯৯-এ ফোন করুন।", "Sorry, I could not get an answer now. Please call 16699."));
  };

  const onHeard = (text: string) => {
    if (community !== "bn") {
      const r = interpretSemanticBridge(text, community);
      if (r.matched) { setLines((l) => [...l, { who: "you", text }]); setBridge(r); setPhase("idle"); return; }
    }
    void handleQuestion(text, topicRef.current);
  };

  function listen() {
    const w = window as unknown as { SpeechRecognition?: new () => SR; webkitSpeechRecognition?: new () => SR };
    const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!Ctor) { setSupported(false); setPhase("idle"); return; }
    const rec = new Ctor();
    rec.lang = bn ? "bn-BD" : "en-US";
    rec.interimResults = true;
    rec.continuous = false;
    rec.maxAlternatives = 1;
    let finalText = "";
    rec.onresult = (e) => {
      let live = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) finalText += r[0].transcript; else live += r[0].transcript;
      }
      setInterim(live || finalText);
    };
    rec.onerror = (e) => { if (e.error === "not-allowed") setSupported(false); };
    rec.onend = () => {
      recRef.current = null;
      setInterim("");
      if (!liveRef.current) return;
      const t = finalText.trim();
      if (t) onHeard(t); else setPhase("idle");
    };
    recRef.current = rec;
    setPhase("listening");
    try { rec.start(); } catch { setPhase("idle"); }
  }

  const start = async () => {
    liveRef.current = true;
    setInCall(true); setSeconds(0); setLines([]); setTopic(null); setBridge(null);
    await say(T(
      "আইনি সহায়তায় স্বাগতম। আমি কর্মপথের একটি সহকারী, মানুষ নই; আমি আইনি তথ্য দিই, পরামর্শ নয়। আপনি বিপদে থাকলে এখনই ৯৯৯-এ ফোন করুন। ",
      "Welcome to Legal Aid. I am a KormoPath assistant, not a person; I give legal information, not advice. If you are in danger, call 999 now. ",
    ) + menuText());
  };

  const stop = () => {
    liveRef.current = false;
    recRef.current?.abort(); recRef.current = null;
    stopSpeaking();
    setPhase("idle"); setInCall(false); setInterim(""); setBridge(null);
  };

  const press = async (key: string) => {
    if (!inCall) return;
    recRef.current?.abort(); recRef.current = null;
    stopSpeaking();
    if (key === "*") { await say(menuText()); return; }
    const k = KEYPAD.find((x) => x.key === key);
    if (!k) return;
    setTopic(k.cat.id);
    setLines((l) => [...l, { who: "you", text: `${T("চাপলেন", "Pressed")} ${bn ? bnNum(key) : key}` }]);
    await say(T(`আপনি বেছে নিয়েছেন: ${k.cat.bn}। এখন আপনার সমস্যাটা নিজের ভাষায় বলুন।`, `You chose: ${k.cat.en}. Now tell me your problem in your own words.`));
  };

  const confirmBridge = async (yes: boolean) => {
    const r = bridge;
    setBridge(null);
    if (!r) return;
    if (yes && r.categoryId) setTopic(r.categoryId);
    await handleQuestion(r.transcript, yes ? r.categoryId : topicRef.current);
  };

  const sendTyped = async () => {
    const t = typed.trim();
    if (!t || !inCall) return;
    setTyped("");
    recRef.current?.abort(); stopSpeaking();
    onHeard(t);
  };

  const mm = `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
  const status = { idle: T("অপেক্ষা করছি", "Waiting"), speaking: T("বলছি…", "Speaking…"), listening: T("শুনছি…", "Listening…"), thinking: T("ভাবছি…", "Thinking…") }[phase];

  return (
    <section data-testid="legal-voice" aria-labelledby="voice-h" className="lg-card overflow-hidden !p-0">
      <div className="grid gap-0 md:grid-cols-[minmax(0,340px)_1fr]">
        <div className="flex flex-col items-center gap-4 bg-gradient-to-b from-indigo-950 to-slate-900 px-5 py-6 text-white">
          <div className="flex w-full items-center justify-between text-[13px] text-white/80">
            <span className="font-mono">{inCall ? (bn ? bnNum(mm) : mm) : T("কল বন্ধ", "Not in a call")}</span>
            <span aria-live="polite">{inCall ? status : ""}</span>
          </div>
          <h2 id="voice-h" className="text-center text-[20px] font-semibold leading-snug text-white">{T("আইনি সহায়তার কল", "Legal aid call")}</h2>
          <span className="relative grid h-[96px] w-[96px] place-items-center" aria-hidden>
            <span className={`kp-orb ${phase === "speaking" || phase === "listening" ? "kp-orb-active" : ""}`}>
              <span className="kp-orb-halo" /><span className="kp-orb-ring" />
              <span className="kp-orb-core"><span className="kp-orb-swirl" /><span className="kp-orb-blob kp-orb-blob-a" /><span className="kp-orb-blob kp-orb-blob-b" /><span className="kp-orb-blob kp-orb-blob-c" /><span className="kp-orb-gloss" /></span>
              <span className="kp-orb-eye" /><span className="kp-orb-dots"><i /><i /><i /></span>
            </span>
          </span>
          {topic && <p className="rounded-full bg-white/10 px-3 py-1 text-[13px] leading-[1.4]">{bn ? PROBLEM_CATEGORIES.find((c) => c.id === topic)?.bn : PROBLEM_CATEGORIES.find((c) => c.id === topic)?.en}</p>}

          <div className="grid w-full max-w-[260px] grid-cols-3 gap-2" role="group" aria-label={T("নম্বর প্যাড", "Keypad")}>
            {["1", "2", "3", "4", "5", "6", "7", "8", "9", "*", "0", "#"].map((key) => {
              const k = KEYPAD.find((x) => x.key === key);
              const label = key === "*" ? T("আবার শুনুন", "Repeat") : key === "#" ? T("মানুষের সঙ্গে", "A person") : (bn ? k?.cat.bn : k?.cat.en) ?? "";
              const inner = (
                <>
                  <span className="font-mono text-[20px] font-bold leading-none">{key === "*" ? <RotateCcw size={18} aria-hidden /> : bn ? bnNum(key) : key}</span>
                  <span className="mt-1 line-clamp-1 text-[10.5px] leading-[1.4] text-white/75">{label}</span>
                </>
              );
              const cls = "flex min-h-[56px] flex-col items-center justify-center rounded-2xl bg-white/10 px-1 transition-colors hover:bg-white/20 disabled:opacity-40";
              return key === "#"
                ? <a key={key} href="tel:16699" className={cls} aria-label={T("১৬৬৯৯-এ মানুষের সঙ্গে কথা বলুন", "Talk to a person on 16699")}>{inner}</a>
                : <button key={key} type="button" className={cls} disabled={!inCall} onClick={() => void press(key)} aria-label={`${key}: ${label}`} data-key={key}>{inner}</button>;
            })}
          </div>

          <div className="flex w-full max-w-[260px] gap-2">
            {!inCall ? (
              <button type="button" onClick={() => void start()} data-testid="voice-start" className="kp-btn-primary kp-btn-lg flex-1 justify-center"><Phone size={18} aria-hidden /> {T("কল শুরু করুন", "Start the call")}</button>
            ) : (
              <>
                <button type="button" onClick={() => (phase === "listening" ? recRef.current?.stop() : listen())} disabled={!supported || phase === "thinking" || phase === "speaking"}
                  className="inline-flex min-h-[52px] flex-1 items-center justify-center gap-2 rounded-2xl bg-white/15 text-[15px] font-semibold disabled:opacity-40">
                  {phase === "listening" ? <MicOff size={18} aria-hidden /> : <Mic size={18} aria-hidden />} {phase === "listening" ? T("শেষ", "Done") : T("বলুন", "Speak")}
                </button>
                <button type="button" onClick={stop} data-testid="voice-stop" className="inline-flex min-h-[52px] flex-1 items-center justify-center gap-2 rounded-2xl bg-red-600 text-[15px] font-bold text-white"><PhoneOff size={18} aria-hidden /> {T("কল শেষ", "End call")}</button>
              </>
            )}
          </div>
        </div>

        <div className="flex min-h-[320px] flex-col gap-3 p-5 sm:p-6">
          <p className="kp-eyebrow">{T("কথোপকথন", "Transcript")}</p>
          {!supported && <p className="rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-[14px] text-amber-900">{T("এই ব্রাউজারে কথা শোনা যায় না বা মাইক বন্ধ। নিচে লিখে প্রশ্ন করুন; উত্তর শুনতে পাবেন।", "This browser cannot listen, or the mic is blocked. Type your question below; you will still hear the answer.")}</p>}
          <ol className="flex-1 space-y-2 overflow-y-auto" aria-live="polite">
            {lines.length === 0 && <li className="text-[14.5px] text-slate-600">{T("কল শুরু করলে এখানে কথা লেখা হয়ে দেখা যাবে। কোনো রেকর্ডিং রাখা হয় না।", "Once the call starts, the conversation appears here as text. Nothing is recorded.")}</li>}
            {lines.map((l, i) => (
              <li key={i} className={`max-w-[92%] rounded-2xl px-3.5 py-2.5 text-[15px] leading-relaxed ${l.who === "you" ? "ml-auto bg-indigo-50 text-indigo-950" : "bg-slate-50 text-slate-800"}`}>{l.text}</li>
            ))}
            {interim && <li className="ml-auto max-w-[92%] rounded-2xl border border-dashed border-indigo-300 px-3.5 py-2.5 text-[15px] italic text-indigo-900">{interim}</li>}
          </ol>

          {bridge && (
            <div className="rounded-2xl border-2 border-amber-400 bg-amber-50 p-4" data-testid="voice-bridge">
              <p className="text-[13px] font-bold text-amber-900">{T("আনুমানিক অর্থ — ঠিক কি না নিশ্চিত করুন", "Approximate meaning — please confirm")}</p>
              <p className="mt-1 text-[15px] text-amber-950">{bn ? bridge.normalizedBangla : `It sounds like you are talking about: ${bridge.legalIntentEn}`}</p>
              <p className="mt-1 text-[13px] text-amber-900">{bridge.matches.map((m) => `${m.matchedText} → ${bn ? m.glossBn : m.glossEn}`).join(" · ")}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <button type="button" onClick={() => void confirmBridge(true)} className="kp-btn-primary min-h-[44px]">{T("হ্যাঁ, ঠিক", "Yes, that's right")}</button>
                <button type="button" onClick={() => void confirmBridge(false)} className="kp-btn-ghost min-h-[44px]">{T("না, অন্য বিষয়", "No, something else")}</button>
              </div>
            </div>
          )}

          <form onSubmit={(e) => { e.preventDefault(); void sendTyped(); }} className="flex gap-2">
            <label className="sr-only" htmlFor="voice-typed">{T("লিখে বলুন", "Type instead")}</label>
            <input id="voice-typed" value={typed} onChange={(e) => setTyped(e.target.value)} disabled={!inCall} maxLength={800}
              placeholder={inCall ? T("বলতে না পারলে এখানে লিখুন…", "Can't speak? Type here…") : T("আগে কল শুরু করুন", "Start the call first")}
              className="min-w-0 flex-1 rounded-xl border border-slate-300 px-3 py-2.5 text-[15px] disabled:bg-slate-50" />
            <button type="submit" disabled={!inCall || !typed.trim()} className="kp-btn-ghost min-h-[44px]" aria-label={T("পাঠান", "Send")}><Send size={16} aria-hidden /></button>
          </form>
        </div>
      </div>
    </section>
  );
}
