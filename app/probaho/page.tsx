"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Mic, Square, Keyboard, Play, RotateCcw, CheckCircle2, XCircle, Lightbulb, MessageCircleQuestion, Trash2, TrendingUp, Info, Sparkles, Quote, Pencil, Plus, X, ShieldAlert, ShieldCheck, AlertTriangle, PhoneCall, Send, Lock } from "lucide-react";
import { AppHeader } from "@/components/layout/AppHeader";
import { AppFooter } from "@/components/layout/AppFooter";
import {
  QUESTIONS, analyzeAnswer, progressSummary, starCheck, practiceStreak, createCustomQuestion, evaluateViva,
  SCAM_SCENARIOS, evaluateScamDefense, type Question, type Analysis, type SessionRecord, type ScamEvaluation,
} from "@/lib/speech";
import { usePersistentState, storageKey, readStored, writeStored } from "@/lib/clientStore";

type SR = {
  start: () => void;
  stop: () => void;
  abort?: () => void;
  onresult: ((e: { resultIndex: number; results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  lang: string;
  interimResults: boolean;
  continuous: boolean;
};

type TrackId = Question["track"] | "scam";

const TRACKS: { id: TrackId; label: string }[] = [
  { id: "technical", label: "টেকনিক্যাল ভাইভা" },
  { id: "hr", label: "এইচআর ইন্টারভিউ" },
  { id: "academic", label: "প্রজেক্ট/থিসিস ডিফেন্স" },
  { id: "bangla", label: "বাংলা ভাইভা" },
  { id: "scam", label: "🛡️ প্রতারণা প্রতিরোধ (Scam Gym)" },
];

const sanitizeHistory = (raw: unknown): SessionRecord[] | null =>
  Array.isArray(raw)
    ? raw.filter((r): r is SessionRecord => r && typeof r.id === "string" && typeof r.date === "string" && typeof r.total === "number" && r.total >= 0 && r.total <= 100).slice(0, 200)
    : null;

export default function ProbahoPage() {
  const [track, setTrack] = useState<TrackId>("technical");
  // Deep link: /probaho#scam opens the scam-practice track.
  useEffect(() => { if (window.location.hash === "#scam") setTrack("scam"); }, []);
  const [customQuestions, setCustomQuestions] = useState<Question[]>([]);
  const [customOpen, setCustomOpen] = useState(false);
  const [customPrompt, setCustomPrompt] = useState("");
  const [customDuration, setCustomDuration] = useState(90);
  const [customTrack, setCustomTrack] = useState<Question["track"]>("technical");
  const [customKeywords, setCustomKeywords] = useState("");

  // Scam Sparring State
  const [scamId, setScamId] = useState(SCAM_SCENARIOS[0].id);
  const selectedScam = useMemo(() => SCAM_SCENARIOS.find((s) => s.id === scamId) ?? SCAM_SCENARIOS[0], [scamId]);
  const [scamReply, setScamReply] = useState("");
  const [scamEval, setScamEval] = useState<ScamEvaluation | null>(null);

  const allQuestions = useMemo(() => [...QUESTIONS, ...customQuestions], [customQuestions]);
  const [qid, setQid] = useState(QUESTIONS[0].id);
  const q = allQuestions.find((x) => x.id === qid) ?? allQuestions[0];
  const [mode, setMode] = useState<"speak" | "type">("speak");
  const [finalText, setFinalText] = useState("");
  const [interim, setInterim] = useState("");
  const [typed, setTyped] = useState("");
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [recordedSeconds, setRecordedSeconds] = useState<number | null>(null);
  const [audioStream, setAudioStream] = useState<MediaStream | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editText, setEditText] = useState("");
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [supported, setSupported] = useState<boolean | null>(null);
  const [consented, setConsented] = useState(false);
  const [keepAudio, setKeepAudio] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [keepTranscripts, setKeepTranscripts] = usePersistentState<boolean>(storageKey("probaho", "keepTranscripts"), false, (r) => (typeof r === "boolean" ? r : null));
  const [history, setHistory] = usePersistentState<SessionRecord[]>(storageKey("probaho", "history"), [], sanitizeHistory);
  const [showModel, setShowModel] = useState(false);

  const recRef = useRef<SR | null>(null);
  const startRef = useRef<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const finalRef = useRef("");
  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    const W = window as unknown as { SpeechRecognition?: unknown; webkitSpeechRecognition?: unknown };
    const ok = Boolean(W.SpeechRecognition ?? W.webkitSpeechRecognition);
    setSupported(ok);
    if (!ok) setMode("type");
    setConsented(readStored(storageKey("probaho", "micConsent"), (r) => (r === true ? true : null)) === true);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      try { recRef.current?.abort?.(); } catch { /* ignore */ }
      mediaRef.current?.stream.getTracks().forEach((t) => t.stop());
    };
  }, []);

  useEffect(() => () => { if (audioUrl) URL.revokeObjectURL(audioUrl); }, [audioUrl]);

  const reset = () => {
    setFinalText(""); setInterim(""); setTyped(""); setAnalysis(null); setElapsed(0); setRecordedSeconds(null); setError(null); setShowModel(false);
    finalRef.current = "";
    if (audioStream) {
      audioStream.getTracks().forEach((t) => t.stop());
      setAudioStream(null);
    }
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl(null);
  };

  const pickQuestion = (id: string) => {
    reset();
    try { recRef.current?.abort?.(); } catch { /* ignore */ }
    setQid(id);
  };

  const finish = (text: string, seconds: number | null) => {
    const a = evaluateViva(text, q, seconds);
    setAnalysis(a);
    if (a.wordCount >= 5) {
      setHistory((p) => [
        {
          id: Math.random().toString(36).slice(2), questionId: q.id, date: new Date().toISOString(),
          total: a.score.total, content: a.score.content, structure: a.score.structure, delivery: a.score.delivery,
          wordCount: a.wordCount, wpm: a.wpm, fillerPer100: a.fillerPer100,
          ...(keepTranscripts ? { transcript: text.slice(0, 4000) } : {}),
        },
        ...p,
      ].slice(0, 200));
    }
  };

  const start = async () => {
    setError(null);
    const W = window as unknown as { SpeechRecognition?: new () => SR; webkitSpeechRecognition?: new () => SR };
    const C = W.SpeechRecognition ?? W.webkitSpeechRecognition;
    if (!C) { setError("এই ব্রাউজারে স্পিচ-টু-টেক্সট নেই। Chrome/Edge ব্যবহার করুন বা টাইপ করে উত্তর দিন।"); return; }
    reset();
    const r = new C();
    r.lang = q.lang === "bn" ? "bn-BD" : "en-US";
    r.interimResults = true;
    r.continuous = true;
    r.onresult = (e) => {
      let interimText = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const res = e.results[i];
        if (res.isFinal) finalRef.current = `${finalRef.current} ${res[0].transcript}`.trim();
        else interimText += res[0].transcript;
      }
      setFinalText(finalRef.current);
      setInterim(interimText);
    };
    r.onerror = (e) => {
      const msg: Record<string, string> = {
        "not-allowed": "মাইক্রোফোনের অনুমতি দেওয়া হয়নি। ব্রাউজারের ঠিকানা-বারের পাশের আইকন থেকে অনুমতি দিন।",
        "no-speech": "কোনো কথা শোনা যায়নি।",
        network: "স্পিচ সার্ভিসে সংযোগ হয়নি (ইন্টারনেট দরকার)। টাইপ করে উত্তর দিতে পারেন।",
        "language-not-supported": "এই ব্রাউজারে এই ভাষার স্পিচ-টু-টেক্সট নেই।",
      };
      if (e.error !== "aborted") setError(msg[e.error] ?? `স্পিচ ত্রুটি: ${e.error}`);
    };
    r.onend = () => {
      // Chrome can end a continuous session on its own after silence; finish with what we have.
      if (timerRef.current) clearInterval(timerRef.current);
      setRecording(false);
      setInterim("");
      const secs = startRef.current ? (Date.now() - startRef.current) / 1000 : null;
      startRef.current = null;
      setRecordedSeconds(secs);
      if (mediaRef.current && mediaRef.current.state !== "inactive") mediaRef.current.stop();
      if (finalRef.current.trim()) finish(finalRef.current, secs);
    };
    recRef.current = r;

    if (navigator.mediaDevices?.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        setAudioStream(stream);
        if (keepAudio) {
          const mr = new MediaRecorder(stream);
          chunksRef.current = [];
          mr.ondataavailable = (ev) => ev.data.size && chunksRef.current.push(ev.data);
          mr.onstop = () => {
            setAudioUrl(URL.createObjectURL(new Blob(chunksRef.current, { type: mr.mimeType || "audio/webm" })));
          };
          mr.start();
          mediaRef.current = mr;
        }
      } catch {
        setError("মাইক্রোফোন অডিও ভিজ্যুয়ালাইজার চালু করা যায়নি; ট্রান্সক্রিপ্ট কাজ করবে।");
      }
    }

    try {
      r.start();
      startRef.current = Date.now();
      setRecording(true);
      timerRef.current = setInterval(() => startRef.current && setElapsed(Math.round((Date.now() - startRef.current) / 1000)), 500);
    } catch {
      setRecording(false);
    }
  };

  const stop = () => {
    recRef.current?.stop();
    if (audioStream) {
      audioStream.getTracks().forEach((t) => t.stop());
      setAudioStream(null);
    }
  };

  const handleCreateCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customPrompt.trim()) return;
    const keywordsArr = customKeywords
      .split(/[,،]+/)
      .map((k) => k.trim())
      .filter(Boolean);
    const newQ = createCustomQuestion({
      prompt: customPrompt,
      track: customTrack,
      targetSeconds: customDuration,
      keywords: keywordsArr.length > 0 ? keywordsArr : undefined,
    });
    setCustomQuestions((prev) => [newQ, ...prev]);
    setTrack(newQ.track);
    setQid(newQ.id);
    setCustomOpen(false);
    setCustomPrompt("");
    setCustomKeywords("");
    reset();
  };

  const openEditModal = () => {
    setEditText(finalText);
    setEditModalOpen(true);
  };

  const saveEditedTranscript = () => {
    setFinalText(editText);
    finalRef.current = editText;
    setEditModalOpen(false);
    finish(editText, recordedSeconds);
  };

  const progress = useMemo(() => progressSummary(history), [history]);
  const streak = useMemo(() => practiceStreak(history, new Date().toISOString().slice(0, 10)), [history]);
  const answerText = mode === "speak" ? finalText : typed;
  const star = analysis && q.track === "hr" ? starCheck(answerText) : null;
  const questionsInTrack = track === "scam" ? [] : allQuestions.filter((x) => x.track === track);
  const shownText = mode === "speak" ? `${finalText}${interim ? ` ${interim}` : ""}` : typed;
  const over = elapsed > q.targetSeconds;

  return (
    <div className="min-h-screen bg-[#f8f7fc] text-slate-900 antialiased">
      <AppHeader taglineEn="Interview & viva speaking coach" appId="probaho" href="/probaho" name="Probaho Coach" taglineBn="ভাইভা ও ইন্টারভিউ বলার অনুশীলন" icon={<Mic size={22} />} accent="from-violet-600 to-indigo-700" />

      <main id="main" className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 motion-safe:animate-rise-in">
        <section className="flex flex-wrap items-end justify-between gap-4 rounded-2xl border border-violet-100/80 bg-white/80 backdrop-blur-md p-5 sm:p-6 shadow-xs hover:shadow-md transition-all">
          <div className="max-w-2xl">
            <h1 className="text-[26px] font-extrabold leading-tight tracking-tight text-slate-900 sm:text-[32px]">প্রশ্নের উত্তর বলুন, কোথায় ভালো হলো আর কী বাদ পড়ল দেখুন</h1>
            <p className="mt-2 text-[15px] leading-relaxed text-slate-600">
              প্রতিটি প্রশ্নে কোন বিষয়গুলো একজন পরীক্ষক শুনতে চান তা আগে থেকে ঠিক করা আছে। আপনার উত্তর সেগুলো ছুঁয়েছে কি না, উদাহরণ ও সারসংক্ষেপ আছে কি না, ফিলার শব্দ কত — সব স্বচ্ছভাবে দেখায়। উচ্চারণ বা অ্যাকসেন্টের জন্য নম্বর কাটে না।
            </p>
          </div>
          {progress && (
            <div className="min-w-[240px] rounded-2xl border border-violet-200/80 bg-violet-50/90 backdrop-blur-md p-4 text-[13px] shadow-xs">
              <span className="flex items-center gap-1 text-[11px] font-bold uppercase text-violet-800"><TrendingUp size={13} aria-hidden /> আপনার অগ্রগতি</span>
              <p className="mt-1"><strong>{progress.sessions}</strong>টি চেষ্টা, <strong>{progress.daysPractised}</strong> দিন অনুশীলন</p>
              <p>সাম্প্রতিক গড়: <strong>{progress.recentAvg}</strong> (প্রথম দিকে {progress.earlyAvg})</p>
              <p>সবচেয়ে দুর্বল দিক: <strong>{progress.weakest === "content" ? "বিষয়বস্তু" : progress.weakest === "structure" ? "গঠন" : "উপস্থাপন"}</strong></p>
            </div>
          )}
        </section>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
          <section aria-labelledby="q-h" className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="ট্র্যাক">
              {TRACKS.map((t) => (
                <button
                  key={t.id}
                  role="tab"
                  aria-selected={track === t.id}
                  onClick={() => {
                    setTrack(t.id);
                    if (t.id !== "scam") {
                      pickQuestion(allQuestions.find((x) => x.track === t.id)?.id ?? allQuestions[0].id);
                    }
                  }}
                  className={`rounded-lg px-3 py-1.5 text-[12px] font-bold ${
                    track === t.id ? "bg-violet-600 text-white" : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {track === "scam" ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-[12px] font-bold text-slate-700 mb-1.5">
                    প্রতারণার ধরন নির্বাচন করুন (Scam Vector)
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {SCAM_SCENARIOS.map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => {
                          setScamId(s.id);
                          setScamReply("");
                          setScamEval(null);
                        }}
                        className={`text-left p-3 rounded-xl border text-[13px] transition-all ${
                          scamId === s.id
                            ? "border-red-500 bg-red-50/70 shadow-xs font-bold text-red-950"
                            : "border-slate-200 bg-slate-50/50 hover:bg-slate-100/70 text-slate-700"
                        }`}
                      >
                        <div className="flex items-center gap-1.5">
                          <ShieldAlert size={15} className={scamId === s.id ? "text-red-600" : "text-slate-400"} />
                          <span>{s.titleBn}</span>
                        </div>
                        <div className="text-[11px] font-normal text-slate-500 mt-0.5 truncate">
                          {s.scammerPersonaBn}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Simulated Scammer Incoming Attack Box */}
                <div className="rounded-2xl border-2 border-red-200 bg-gradient-to-br from-red-50/80 via-white to-amber-50/50 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="relative flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                      </span>
                      <span className="text-[12px] font-bold uppercase tracking-wide text-red-800">
                        সরাসরি প্রতারণার আক্রমণ (Live Threat Pitch)
                      </span>
                    </div>
                    <span className="text-[11px] font-mono text-slate-500">{selectedScam.category}</span>
                  </div>

                  <div className="bg-white/90 rounded-xl border border-red-100 p-3.5 shadow-2xs">
                    <div className="text-[11px] font-semibold text-slate-500 mb-1">
                      ছদ্মবেশী প্রতারক: <span className="text-slate-800 font-bold">{selectedScam.scammerPersonaBn}</span>
                    </div>
                    <p className="text-[14px] leading-relaxed text-slate-800 italic font-medium">
                      &ldquo;{selectedScam.openingPitchBn}&rdquo;
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-1.5 items-center">
                    <span className="text-[11px] font-bold text-slate-500">মনস্তাত্ত্বিক ফাঁদ:</span>
                    <span className="rounded-md bg-amber-100/80 text-amber-900 px-2 py-0.5 text-[11px] font-semibold">
                      {selectedScam.tacticExplanationBn}
                    </span>
                  </div>
                </div>

                {/* User Response Area */}
                <div className="space-y-2">
                  <label htmlFor="scam-reply" className="block text-[12px] font-bold text-slate-700">
                    আপনার প্রতিরক্ষা উত্তর (প্রতারককে কী বলবেন?)
                  </label>
                  <textarea
                    id="scam-reply"
                    rows={4}
                    value={scamReply}
                    onChange={(e) => setScamReply(e.target.value)}
                    placeholder="যেমন: আমি কোনো ওটিপি বা পিন দেব না। আমি সরাসরি কাস্টমার কেয়ারে ১৬২৪৭-এ ফোন দিচ্ছি..."
                    className="w-full rounded-xl border border-slate-200 p-3 text-[14px] outline-none focus:border-red-500 transition-colors"
                  />

                  {/* Preset Safe Retorts */}
                  <div className="flex flex-wrap gap-1.5">
                    <span className="text-[11px] text-slate-500 py-1 font-semibold">কুইক রেসপন্স:</span>
                    {[
                      "আমি কাউকে OTP বা পিন দেই না। আমি ১৬২৪৭-এ ফোন দিচ্ছি।",
                      "চাকরির জন্য আগে ডিপোজিট চাওয়া অবৈধ। সাইবার হেল্পলাইনে জানাচ্ছি।",
                      "ভর্তি বা প্রশ্ন ফাঁসের টাকা চাওয়া অপরাধ। ৯৯৯-এ অভিযোগ করব।"
                    ].map((sample, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setScamReply(sample)}
                        className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] text-slate-700 hover:bg-slate-100 transition-colors"
                      >
                        {sample}
                      </button>
                    ))}
                  </div>

                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        if (!scamReply.trim()) return;
                        const res = evaluateScamDefense(scamId, scamReply);
                        setScamEval(res);
                      }}
                      disabled={!scamReply.trim()}
                      className="inline-flex items-center gap-2 rounded-xl bg-red-600 hover:bg-red-700 px-5 py-2.5 text-[14px] font-bold text-white shadow-xs transition-all disabled:opacity-40"
                    >
                      <ShieldCheck size={16} /> প্রতিরক্ষা মূল্যায়ন করুন (Evaluate Defense)
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <>
                <div>
                  <div className="flex items-center justify-between">
                    <label htmlFor="q-select" className="block text-[12px] font-bold text-slate-600">
                      প্রশ্ন
                    </label>
                    <button
                      type="button"
                      onClick={() => setCustomOpen(!customOpen)}
                      className="inline-flex items-center gap-1 text-[12px] font-bold text-violet-700 hover:text-violet-900"
                    >
                      <Plus size={14} aria-hidden /> {customOpen ? "কাস্টম ফরম বন্ধ" : "+ কাস্টম প্রশ্ন তৈরি"}
                    </button>
                  </div>
                  <select id="q-select" value={qid} onChange={(e) => pickQuestion(e.target.value)} className="mt-1 block w-full rounded-lg border border-slate-200 bg-white px-2 py-2 text-[13px] font-normal">
                    {questionsInTrack.map((x) => <option key={x.id} value={x.id}>[{x.level}] {x.prompt}</option>)}
                  </select>
                </div>

                {customOpen && (
                  <form onSubmit={handleCreateCustom} className="space-y-3 rounded-xl border border-violet-200 bg-violet-50/50 p-4 text-[13px]">
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-violet-900">নিজের কাস্টম প্রশ্ন তৈরি করুন</h3>
                      <button type="button" onClick={() => setCustomOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={16} /></button>
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600">প্রশ্নের বিবরণ (Prompt)</label>
                      <textarea
                        rows={2}
                        required
                        value={customPrompt}
                        onChange={(e) => setCustomPrompt(e.target.value)}
                        placeholder="যেমন: Compare optimistic locking vs pessimistic locking in high concurrency systems."
                        className="mt-1 w-full rounded-lg border border-slate-200 bg-white p-2 text-[13px] outline-none focus:border-violet-600"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600">ট্র্যাক</label>
                        <select
                          value={customTrack}
                          onChange={(e) => setCustomTrack(e.target.value as Question["track"])}
                          className="mt-1 block w-full rounded-lg border border-slate-200 bg-white p-1.5 text-[12px]"
                        >
                          {TRACKS.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600">সময় সীমা (সেকেন্ড)</label>
                        <select
                          value={customDuration}
                          onChange={(e) => setCustomDuration(Number(e.target.value))}
                          className="mt-1 block w-full rounded-lg border border-slate-200 bg-white p-1.5 text-[12px]"
                        >
                          <option value={30}>৩০ সেকেন্ড</option>
                          <option value={60}>৬০ সেকেন্ড</option>
                          <option value={90}>৯০ সেকেন্ড</option>
                          <option value={120}>১২০ সেকেন্ড</option>
                          <option value={180}>১৮০ সেকেন্ড</option>
                        </select>
                      </div>
                      <div className="col-span-2 sm:col-span-1">
                        <label className="block text-[11px] font-bold text-slate-600">বিষয়/কিওয়ার্ড (কমা দিয়ে, ঐচ্ছিক)</label>
                        <input
                          type="text"
                          value={customKeywords}
                          onChange={(e) => setCustomKeywords(e.target.value)}
                          placeholder="version, lock, conflicts"
                          className="mt-1 block w-full rounded-lg border border-slate-200 bg-white p-1.5 text-[12px]"
                        />
                      </div>
                    </div>
                    <button
                      type="submit"
                      disabled={!customPrompt.trim()}
                      className="rounded-lg bg-violet-600 px-4 py-2 text-[12px] font-bold text-white hover:bg-violet-700 disabled:opacity-40"
                    >
                      প্রশ্ন তৈরি করে শুরু করুন
                    </button>
                  </form>
                )}

                <div id="q-h" className="rounded-xl border border-violet-200 bg-violet-50/60 p-4">
              <span className="text-[11px] font-bold uppercase text-violet-800">প্রশ্ন · লক্ষ্য সময় {q.targetSeconds} সেকেন্ড</span>
              <p className="mt-1 text-[17px] font-bold leading-snug">{q.prompt}</p>
              <details className="mt-2 text-[12px] text-slate-600">
                <summary className="cursor-pointer font-semibold text-violet-800">পরীক্ষক কী শুনতে চান (উত্তরের আগে দেখতে পারেন)</summary>
                <ul className="mt-1 list-disc pl-5">{q.topics.map((t) => <li key={t.id}>{t.label}</li>)}</ul>
              </details>
            </div>

            <div className="flex flex-wrap items-center gap-2" role="group" aria-label="উত্তরের ধরন">
              <button onClick={() => { reset(); setMode("speak"); }} disabled={supported === false} aria-pressed={mode === "speak"} className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[13px] font-bold ${mode === "speak" ? "border-violet-600 bg-violet-50 text-violet-800" : "border-slate-200 text-slate-600"} disabled:opacity-40`}><Mic size={15} aria-hidden /> বলে উত্তর</button>
              <button onClick={() => { reset(); setMode("type"); }} aria-pressed={mode === "type"} className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[13px] font-bold ${mode === "type" ? "border-violet-600 bg-violet-50 text-violet-800" : "border-slate-200 text-slate-600"}`}><Keyboard size={15} aria-hidden /> লিখে উত্তর</button>
              {supported === false && <span className="text-[12px] text-slate-500">এই ব্রাউজারে ভয়েস নেই — লিখে অনুশীলন করুন।</span>}
            </div>

            {mode === "speak" && !consented && (
              <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-4 text-[13px]">
                <p><strong>মাইক ব্যবহারের আগে জেনে নিন:</strong> কথা থেকে লেখা তৈরি হয় আপনার ব্রাউজারের স্পিচ সার্ভিসে (Chrome-এ অডিও Google-এর সার্ভারে প্রক্রিয়া হয়)। KormoPath কোনো অডিও আপলোড বা সংরক্ষণ করে না। স্কোর এই ডিভাইসেই হিসাব হয়।</p>
                <button onClick={() => { setConsented(true); writeStored(storageKey("probaho", "micConsent"), true); }} className="rounded-lg bg-violet-600 px-3 py-1.5 font-bold text-white">বুঝেছি, মাইক চালু করতে দিন</button>
              </div>
            )}

            {mode === "speak" && consented && (
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-3">
                  {!recording ? (
                    <button onClick={() => void start()} className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-5 py-3 text-[14px] font-bold text-white hover:bg-violet-700"><Mic size={18} aria-hidden /> উত্তর বলা শুরু করুন</button>
                  ) : (
                    <button onClick={stop} className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-5 py-3 text-[14px] font-bold text-white"><Square size={16} aria-hidden /> শেষ করুন</button>
                  )}
                  <span role="timer" aria-live="off" className={`font-mono text-[18px] font-bold ${over ? "text-amber-700" : "text-slate-700"}`}>{elapsed}s / {q.targetSeconds}s</span>
                  <label className="flex items-center gap-1.5 text-[12px] text-slate-600">
                    <input type="checkbox" checked={keepAudio} disabled={recording} onChange={(e) => setKeepAudio(e.target.checked)} className="accent-violet-600" />
                    নিজের রেকর্ডিং পরে শুনতে চাই (শুধু এই পেজে, সংরক্ষণ হয় না)
                  </label>
                </div>
                {recording && (
                  <div className="space-y-2">
                    <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                      <div className={`h-full ${over ? "bg-amber-500" : "bg-violet-500"}`} style={{ width: `${Math.min(100, (elapsed / q.targetSeconds) * 100)}%` }} />
                    </div>
                    <AudioWaveformVisualizer stream={audioStream} active={recording} />
                  </div>
                )}
              </div>
            )}

            {mode === "type" && (
              <div className="space-y-2">
                <label htmlFor="typed" className="sr-only">আপনার উত্তর</label>
                <textarea id="typed" rows={6} value={typed} onChange={(e) => setTyped(e.target.value)} placeholder="যেভাবে মুখে বলতেন সেভাবে লিখুন…" className="w-full rounded-xl border border-slate-200 p-3 text-[14px] outline-none focus:border-violet-600" />
                <button onClick={() => finish(typed, null)} disabled={!typed.trim()} className="rounded-xl bg-violet-600 px-5 py-2.5 text-[14px] font-bold text-white disabled:opacity-40">মূল্যায়ন করুন</button>
              </div>
            )}

            {error && <p role="alert" className="text-[13px] text-red-700">{error}</p>}

            {mode === "speak" && (shownText || recording) && (
              <div className="min-h-[100px] rounded-xl border border-slate-200 bg-slate-50 p-3 text-[14px] leading-relaxed" aria-live="polite">
                <div className="mb-1.5 flex items-center justify-between">
                  <span className="block text-[11px] font-bold uppercase text-slate-400">যা শোনা গেছে (স্বয়ংক্রিয় — ভুল থাকতে পারে)</span>
                  {!recording && finalText && (
                    <button
                      type="button"
                      onClick={openEditModal}
                      className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-bold text-violet-700 shadow-sm hover:bg-violet-50"
                    >
                      <Pencil size={11} aria-hidden /> এডিট করুন
                    </button>
                  )}
                </div>
                {finalText}<span className="text-slate-400"> {interim}</span>
              </div>
            )}
            {audioUrl && (
              <div className="flex items-center gap-2 text-[12px]">
                <Play size={14} aria-hidden /> <audio controls src={audioUrl} className="h-8" />
                <button onClick={() => { URL.revokeObjectURL(audioUrl); setAudioUrl(null); }} className="text-red-700 underline">রেকর্ডিং মুছুন</button>
              </div>
            )}
            {mode === "speak" && analysis && finalText && (
              <p className="text-[11px] text-slate-500">
                ট্রান্সক্রিপ্টে ভুল শব্দ থাকলে ঠিক করে আসল রেকর্ডিং সময় ধরে পুনর্মূল্যায়ন করুন:{" "}
                <button className="font-semibold text-violet-700 underline" onClick={openEditModal}>
                  ট্রান্সক্রিপ্ট এডিট করুন
                </button>
              </p>
            )}

            {/* Inline Transcript Edit Modal */}
            {editModalOpen && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
                <div className="w-full max-w-lg space-y-4 rounded-2xl bg-white p-5 shadow-xl">
                  <div className="flex items-center justify-between">
                    <h3 className="text-[16px] font-bold text-slate-900">ট্রান্সক্রিপ্ট সংশোধন</h3>
                    <button onClick={() => setEditModalOpen(false)} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100">
                      <X size={18} />
                    </button>
                  </div>
                  <p className="text-[12px] text-slate-500">
                    স্পিচ-টু-টেক্সটের ভুল শব্দগুলো সংশোধন করুন। আপনার আসল রেকর্ডিং সময় {recordedSeconds ? `(${Math.round(recordedSeconds)} সেকেন্ড)` : ""} ও অডিও ফাইল বহাল থাকবে।
                  </p>
                  <textarea
                    rows={6}
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 p-3 text-[14px] outline-none focus:border-violet-600"
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setEditModalOpen(false)}
                      className="rounded-lg border border-slate-200 px-3 py-1.5 text-[13px] font-bold text-slate-700"
                    >
                      বাতিল
                    </button>
                    <button
                      type="button"
                      onClick={saveEditedTranscript}
                      disabled={!editText.trim()}
                      className="rounded-lg bg-violet-600 px-4 py-1.5 text-[13px] font-bold text-white hover:bg-violet-700 disabled:opacity-40"
                    >
                      সংরক্ষণ ও পুনর্মূল্যায়ন
                    </button>
                  </div>
                </div>
              </div>
            )}
              </>
            )}
          </section>

          <section aria-labelledby="fb-h" className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
            {track === "scam" ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 id="fb-h" className="text-[17px] font-bold text-slate-900">সাইবার প্রতিরক্ষা মূল্যায়ন</h2>
                  {scamEval && (
                    <button
                      type="button"
                      onClick={() => {
                        setScamReply("");
                        setScamEval(null);
                      }}
                      className="inline-flex items-center gap-1 text-[12px] font-semibold text-red-700 hover:underline"
                    >
                      <RotateCcw size={13} /> আবার চেষ্টা
                    </button>
                  )}
                </div>

                {!scamEval ? (
                  <div className="py-8 text-center space-y-3">
                    <div className="mx-auto w-12 h-12 rounded-full bg-red-50 text-red-600 flex items-center justify-center">
                      <ShieldAlert size={24} />
                    </div>
                    <p className="text-[13px] text-slate-600 max-w-sm mx-auto">
                      প্রতারকের আক্রমণের বিপরীতে আপনার উত্তর লিখে বা দ্রুত উত্তরে ক্লিক করে মূল্যায়ন করুন। ইঞ্জিন যাচাই করবে কোনো স্পর্শকাতর তথ্য ফাঁসের ঝুঁকি তৈরি হলো কি না।
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4 motion-safe:animate-rise-in">
                    {/* Verdict Banner */}
                    <div
                      className={`p-4 rounded-xl border-2 flex items-start gap-3 ${
                        scamEval.verdict === "safe"
                          ? "bg-emerald-50/90 border-emerald-500 text-emerald-950"
                          : scamEval.verdict === "risky"
                          ? "bg-amber-50/90 border-amber-500 text-amber-950"
                          : "bg-red-50/90 border-red-600 text-red-950"
                      }`}
                    >
                      {scamEval.verdict === "safe" ? (
                        <ShieldCheck size={24} className="text-emerald-600 shrink-0 mt-0.5" />
                      ) : scamEval.verdict === "risky" ? (
                        <AlertTriangle size={24} className="text-amber-600 shrink-0 mt-0.5" />
                      ) : (
                        <ShieldAlert size={24} className="text-red-600 shrink-0 mt-0.5" />
                      )}
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-[15px]">
                            {scamEval.verdict === "safe"
                              ? "১০০% সুরক্ষিত প্রতিরোধ (Safe Defense)"
                              : scamEval.verdict === "risky"
                              ? "ঝুঁকিপূর্ণ প্রতিক্রিয়া (Risky Hesitation)"
                              : "মারাত্মক নিরাপত্তা লঙ্ঘন (Fatal Compromise)"}
                          </span>
                          <span className="text-[12px] font-bold px-2 py-0.5 rounded-full bg-white/80 border">
                            স্কোর: {scamEval.score}/১০০
                          </span>
                        </div>
                        <p className="text-[13px] mt-1.5 leading-relaxed font-normal">
                          {scamEval.feedbackBn}
                        </p>
                        <p className="text-[12px] mt-1 text-slate-700 font-medium">
                          {scamEval.safetyAdviceBn}
                        </p>
                      </div>
                    </div>

                    {/* Golden Standard Defense */}
                    <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3.5 space-y-1.5">
                      <div className="text-[11px] font-bold uppercase text-slate-500 flex items-center gap-1">
                        <Lightbulb size={13} className="text-amber-600" /> আদর্শ সাইবার নিরাপত্তা প্রতিক্রিয়া:
                      </div>
                      <p className="text-[13px] text-slate-800 font-medium italic">
                        &ldquo;{selectedScam.goldenDefenseBn}&rdquo;
                      </p>
                    </div>
                  </div>
                )}

                {/* Official Emergency Reporting Directory */}
                <div className="rounded-xl border border-slate-200 bg-white p-3.5 space-y-2">
                  <div className="text-[12px] font-bold text-slate-800 flex items-center gap-1.5">
                    <PhoneCall size={14} className="text-violet-600" /> সাইবার ক্রাইম ও প্রতারণা অভিযোগ হটলাইন
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[12px]">
                    <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
                      <span className="block font-semibold text-slate-800">CID Cyber Police BD</span>
                      <span className="font-mono text-violet-700 font-bold">01730336431</span>
                    </div>
                    <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
                      <span className="block font-semibold text-slate-800">জাতীয় জরুরি সেবা</span>
                      <span className="font-mono text-emerald-700 font-bold">999</span>
                    </div>
                    <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
                      <span className="block font-semibold text-slate-800">বিকাশ ফ্রড সাপোর্ট</span>
                      <span className="font-mono text-pink-700 font-bold">16247</span>
                    </div>
                    <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
                      <span className="block font-semibold text-slate-800">নগদ হেল্পলাইন</span>
                      <span className="font-mono text-orange-700 font-bold">16167</span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <h2 id="fb-h" className="text-[17px] font-bold">ফিডব্যাক</h2>
                  {analysis && <button onClick={reset} className="inline-flex items-center gap-1 text-[12px] font-semibold text-violet-700"><RotateCcw size={13} aria-hidden /> আবার চেষ্টা</button>}
                </div>
                {!analysis ? (
                  <p className="py-10 text-center text-[13px] text-slate-500">উত্তর দেওয়ার পর এখানে বিষয়ভিত্তিক ফিডব্যাক, পরের প্রশ্ন ও একটি নমুনা উত্তর দেখাবে।</p>
                ) : (
                  <Feedback a={analysis} q={q} showModel={showModel} setShowModel={setShowModel} />
                )}
                {star && (
                  <div className="rounded-xl border border-violet-200 bg-violet-50/60 p-3" data-testid="star-check">
                    <h3 className="text-[13px] font-bold">STAR গঠন (Situation · Task · Action · Result)</h3>
                    <ul className="mt-2 grid grid-cols-2 gap-1.5 text-[12px] sm:grid-cols-4">
                      {([["situation", "পরিস্থিতি"], ["task", "আপনার দায়িত্ব"], ["action", "আপনি কী করলেন"], ["result", "ফলাফল"]] as const).map(([k, l]) => (
                        <li key={k} className={`rounded-lg px-2 py-1 font-semibold ${star[k] ? "bg-emerald-100 text-emerald-900" : "bg-amber-100 text-amber-900"}`}>{star[k] ? "✓" : "○"} {l}</li>
                      ))}
                    </ul>
                    <p className="mt-2 text-[11px] text-slate-600">{star.missing.length ? "যে অংশে চিহ্ন নেই, সেটি গল্পে স্পষ্ট করে বলুন।" : "চারটি অংশেরই ইঙ্গিত পাওয়া গেছে।"} এটি কিছু সংকেত-শব্দ দেখে করা আন্দাজ, গল্পের মান যাচাই নয়।</p>
                  </div>
                )}
                {analysis && <AiCoach key={`${q.id}:${answerText.length}`} questionId={q.id} answer={answerText} lang={q.lang} />}
              </>
            )}
          </section>
        </div>

        <section aria-labelledby="hist-h" className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 id="hist-h" className="text-[16px] font-bold">অনুশীলনের ইতিহাস</h2>
            {streak.best > 0 && <span className="rounded-full bg-orange-100 px-2.5 py-0.5 text-[12px] font-bold text-orange-900" data-testid="streak">🔥 টানা {streak.current} দিন · সেরা {streak.best}</span>}
            <div className="flex flex-wrap items-center gap-3 text-[12px]">
              <label className="flex items-center gap-1.5"><input type="checkbox" checked={keepTranscripts} onChange={(e) => setKeepTranscripts(e.target.checked)} className="accent-violet-600" /> ইতিহাসে ট্রান্সক্রিপ্টও রাখুন</label>
              {history.length > 0 && <button onClick={() => { if (window.confirm("সব অনুশীলনের ইতিহাস মুছবেন?")) setHistory([]); }} className="inline-flex items-center gap-1 font-semibold text-red-700"><Trash2 size={13} aria-hidden /> সব মুছুন</button>}
            </div>
          </div>
          <p className="mt-1 text-[11px] text-slate-500">শুধু এই ডিভাইসে থাকে। ডিফল্টভাবে শুধু স্কোর রাখা হয়, আপনার বলা কথা নয়।</p>
          {history.length === 0 ? (
            <p className="mt-3 text-[13px] text-slate-500">এখনো কোনো অনুশীলন নেই। প্রতিদিন একটি প্রশ্ন দিয়ে শুরু করুন।</p>
          ) : (
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[560px] text-left text-[13px]">
                <thead className="text-[11px] uppercase text-slate-500"><tr><th className="py-1">তারিখ</th><th>প্রশ্ন</th><th className="text-right">মোট</th><th className="text-right">বিষয়/৫০</th><th className="text-right">গঠন/২০</th><th className="text-right">উপস্থাপন/৩০</th><th className="text-right">ফিলার/১০০</th><th /></tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {history.slice(0, 30).map((h) => (
                    <tr key={h.id}>
                      <td className="py-1.5">{new Date(h.date).toLocaleDateString("en-GB")}</td>
                      <td className="max-w-[240px] truncate" title={h.transcript}>{QUESTIONS.find((x) => x.id === h.questionId)?.prompt ?? h.questionId}</td>
                      <td className="text-right font-bold">{h.total}</td>
                      <td className="text-right">{h.content}</td>
                      <td className="text-right">{h.structure}</td>
                      <td className="text-right">{h.delivery}</td>
                      <td className="text-right">{h.fillerPer100}</td>
                      <td className="text-right"><button onClick={() => setHistory((p) => p.filter((x) => x.id !== h.id))} aria-label="মুছুন" className="p-1 text-slate-400 hover:text-red-600"><Trash2 size={13} /></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <p className="text-[12px] text-slate-600">
          <Info size={12} className="mr-1 inline text-slate-500" aria-hidden />
          স্কোর একটি স্বয়ংক্রিয় অনুশীলন-নির্দেশক, পরীক্ষার ফল নয়। স্পিচ-টু-টেক্সট ভুল শুনলে ফলাফলও ভুল হতে পারে; বাংলা স্বীকৃতি ইংরেজির চেয়ে কম নির্ভুল হতে পারে। দক্ষতা যাচাইসহ স্কিল পাসপোর্ট চাইলে <Link href="/workspace" className="font-semibold text-violet-700 underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-600 rounded">KormoPath Workspace</Link>।
        </p>
      </main>
      <AppFooter lang="bn" />
    </div>
  );
}

function Feedback({ a, q, showModel, setShowModel }: { a: Analysis; q: Question; showModel: boolean; setShowModel: (b: boolean) => void }) {
  const bar = (v: number, max: number, label: string) => (
    <div>
      <div className="flex justify-between text-[12px]"><span>{label}</span><strong>{v}/{max}</strong></div>
      <div className="mt-0.5 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-violet-500" style={{ width: `${(v / max) * 100}%` }} /></div>
    </div>
  );
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <div className="flex h-20 w-20 shrink-0 flex-col items-center justify-center rounded-2xl bg-violet-600 text-white">
          <strong className="text-[28px] leading-none">{a.score.total}</strong>
          <span className="text-[10px]">/১০০</span>
        </div>
        <div className="flex-1 space-y-1.5">
          {bar(a.score.content, 50, "বিষয়বস্তু (প্রত্যাশিত বিষয় ছুঁয়েছে কি না)")}
          {bar(a.score.structure, 20, "গঠন (উদাহরণ, সারসংক্ষেপ, বাক্যের দৈর্ঘ্য)")}
          {bar(a.score.delivery, 30, "উপস্থাপন (ফিলার, গতি)")}
        </div>
      </div>

      <ul className="space-y-1 text-[13px]">
        {q.topics.map((t) => {
          const ok = a.covered.includes(t);
          return (
            <li key={t.id} className="flex items-start gap-1.5">
              {ok ? <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-emerald-600" aria-label="বলা হয়েছে" /> : <XCircle size={16} className="mt-0.5 shrink-0 text-slate-400" aria-label="বাদ পড়েছে" />}
              <span className={ok ? "" : "text-slate-500"}>{t.label}</span>
            </li>
          );
        })}
      </ul>

      <dl className="grid grid-cols-2 gap-2 text-[12px] sm:grid-cols-4">
        <div className="rounded-lg bg-slate-50 p-2"><dt className="text-slate-500">শব্দ</dt><dd className="font-bold">{a.wordCount}</dd></div>
        <div className="rounded-lg bg-slate-50 p-2"><dt className="text-slate-500">গতি</dt><dd className="font-bold">{a.wpm !== null ? `${a.wpm} wpm` : "—"}</dd></div>
        <div className="rounded-lg bg-slate-50 p-2"><dt className="text-slate-500">ফিলার/১০০ শব্দ</dt><dd className="font-bold">{a.fillerPer100}</dd></div>
        <div className="rounded-lg bg-slate-50 p-2"><dt className="text-slate-500">গড় বাক্য</dt><dd className="font-bold">{a.avgSentenceWords} শব্দ</dd></div>
      </dl>
      {a.paceNote && <p className="text-[12px] text-slate-600">{a.paceNote}</p>}
      {a.fillers.length > 0 && <p className="text-[12px] text-slate-600">ফিলার: {a.fillers.map((f) => `"${f.word}" ×${f.count}`).join(", ")}</p>}

      {a.tips.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
          <h3 className="flex items-center gap-1.5 text-[13px] font-bold text-amber-900"><Lightbulb size={15} aria-hidden /> উন্নতির জন্য</h3>
          <ul className="mt-1 list-disc space-y-0.5 pl-5 text-[13px] text-amber-950">{a.tips.map((t) => <li key={t}>{t}</li>)}</ul>
        </div>
      )}
      {a.followUp && (
        <div className="rounded-xl border border-violet-200 bg-violet-50 p-3 text-[13px]">
          <h3 className="flex items-center gap-1.5 font-bold text-violet-900"><MessageCircleQuestion size={15} aria-hidden /> পরীক্ষকের পরের প্রশ্ন হতে পারে</h3>
          <p className="mt-1">{a.followUp}</p>
        </div>
      )}
      <div>
        <button onClick={() => setShowModel(!showModel)} className="text-[13px] font-bold text-violet-700">{showModel ? "নমুনা উত্তর লুকান" : "একটি শক্তিশালী নমুনা উত্তর দেখুন"}</button>
        {showModel && <p className="mt-2 rounded-xl bg-slate-50 p-3 text-[13px] leading-relaxed">{q.modelAnswer}</p>}
      </div>
    </div>
  );
}

interface CoachResult {
  engine: string;
  strengths: { point: string; quote: string }[];
  gaps: { tip: string }[];
  stronger_sentence: string | null;
  error?: string;
}

/** Optional Gemini coach. Sends only this answer's text, after the user clicks. */
function AiCoach({ questionId, answer, lang }: { questionId: string; answer: string; lang: "en" | "bn" }) {
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<CoachResult | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const en = lang === "en";
  const run = async () => {
    setBusy(true);
    setErr(null);
    try {
      const r = await fetch("/api/probaho/coach", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ questionId, answer }) });
      const d = (await r.json()) as CoachResult;
      if (!r.ok) throw new Error(d.error || `HTTP ${r.status}`);
      setRes(d);
    } catch (e) {
      setErr(en ? `AI coach unavailable right now (${(e as Error).message}). The feedback above still applies.` : `এখন AI কোচ পাওয়া যাচ্ছে না (${(e as Error).message})। উপরের ফিডব্যাক প্রযোজ্য।`);
    } finally {
      setBusy(false);
    }
  };
  const isAi = res && res.engine !== "rule-based" && res.engine !== "guard";
  return (
    <div className="space-y-3 rounded-xl border border-violet-200 bg-gradient-to-br from-violet-50 to-white p-4" data-testid="ai-coach">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="flex items-center gap-1.5 text-[14px] font-bold"><Sparkles size={16} className="text-violet-700" aria-hidden /> {en ? "AI coach (Gemini)" : "AI কোচ (Gemini)"}</h3>
        {res && <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${isAi ? "bg-violet-100 text-violet-800" : "bg-amber-100 text-amber-900"}`}>{isAi ? res.engine : en ? "rule-based fallback" : "নিয়মভিত্তিক বিকল্প"}</span>}
      </div>
      {!res && (
        <>
          <p className="text-[12px] text-slate-600">{en ? "Get specific coaching on this answer. Every strength must quote your own words — we check each quote. Your score above is not changed by the AI." : "এই উত্তরের ওপর নির্দিষ্ট পরামর্শ নিন। প্রতিটি ভালো দিক আপনার নিজের কথা থেকে উদ্ধৃত হতে হবে — আমরা যাচাই করি। উপরের স্কোর AI বদলায় না।"}</p>
          <button onClick={run} disabled={busy} className="inline-flex items-center gap-1.5 rounded-lg bg-violet-700 px-3 py-2 text-[13px] font-bold text-white hover:bg-violet-800 disabled:opacity-50">
            <Sparkles size={14} aria-hidden /> {busy ? (en ? "Thinking…" : "ভাবছে…") : en ? "Ask the AI coach" : "AI কোচকে জিজ্ঞেস করুন"}
          </button>
          <p className="text-[10px] text-slate-500">{en ? "Sends only this answer's text to Google Gemini. Nothing is stored." : "শুধু এই উত্তরের লেখা Google Gemini-তে পাঠানো হয়। কিছু সংরক্ষণ করা হয় না।"}</p>
        </>
      )}
      {err && <p role="alert" className="text-[12px] text-amber-900">{err}</p>}
      {res && (
        <div className="space-y-3 text-[13px]">
          {res.strengths.length > 0 && (
            <div>
              <p className="mb-1 text-[11px] font-bold uppercase text-emerald-800">{en ? "What worked" : "যা ভালো হয়েছে"}</p>
              <ul className="space-y-1.5">
                {res.strengths.map((s, i) => (
                  <li key={i} className="rounded-lg bg-emerald-50 p-2">
                    <span className="font-semibold">{s.point}</span>
                    <span className="mt-0.5 flex items-start gap-1 text-[12px] italic text-slate-600"><Quote size={12} className="mt-0.5 shrink-0" aria-hidden /> “{s.quote}”</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div>
            <p className="mb-1 text-[11px] font-bold uppercase text-amber-800">{en ? "Improve next time" : "পরের বার উন্নতি করুন"}</p>
            <ul className="list-disc space-y-1 pl-5">{res.gaps.map((g, i) => <li key={i}>{g.tip}</li>)}</ul>
          </div>
          {res.stronger_sentence && (
            <div className="rounded-lg border border-violet-200 bg-white p-2">
              <p className="text-[11px] font-bold uppercase text-violet-800">{en ? "Try saying" : "এভাবে বলে দেখুন"}</p>
              <p className="mt-0.5">{res.stronger_sentence}</p>
            </div>
          )}
          <p className="text-[10px] text-slate-500">{isAi ? (en ? "Each quoted strength was checked against your answer text." : "প্রতিটি উদ্ধৃতি আপনার উত্তরের লেখার সাথে মিলিয়ে দেখা হয়েছে।") : en ? "Model unavailable, so this is built from the rule-based analysis." : "মডেল পাওয়া যায়নি, তাই নিয়মভিত্তিক বিশ্লেষণ থেকে তৈরি।"}</p>
        </div>
      )}
    </div>
  );
}

function AudioWaveformVisualizer({ stream, active }: { stream: MediaStream | null; active: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animRef = useRef<number | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const [webAudioFailed, setWebAudioFailed] = useState(false);

  useEffect(() => {
    if (!active || !stream) {
      if (animRef.current) cancelAnimationFrame(animRef.current);
      if (audioCtxRef.current && audioCtxRef.current.state !== "closed") {
        try { audioCtxRef.current.close(); } catch {}
      }
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let stopped = false;
    const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtxClass) {
      setWebAudioFailed(true);
      return;
    }

    try {
      const audioCtx = new AudioCtxClass();
      audioCtxRef.current = audioCtx;
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 128;
      analyser.smoothingTimeConstant = 0.8;
      source.connect(analyser);

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const draw = () => {
        if (stopped) return;
        animRef.current = requestAnimationFrame(draw);
        analyser.getByteFrequencyData(dataArray);

        const width = canvas.width;
        const height = canvas.height;
        ctx.clearRect(0, 0, width, height);

        const barCount = 28;
        const barWidth = (width / barCount) - 2;
        const step = Math.floor(bufferLength / barCount) || 1;

        for (let i = 0; i < barCount; i++) {
          const val = dataArray[i * step] || 0;
          const barHeight = Math.max(3, (val / 255) * height);
          const x = i * (barWidth + 2);
          const y = (height - barHeight) / 2;

          const gradient = ctx.createLinearGradient(0, y, 0, y + barHeight);
          gradient.addColorStop(0, "#8b5cf6");
          gradient.addColorStop(1, "#4f46e5");

          ctx.fillStyle = gradient;
          if (typeof ctx.roundRect === "function") {
            ctx.beginPath();
            ctx.roundRect(x, y, barWidth, barHeight, 2);
            ctx.fill();
          } else {
            ctx.fillRect(x, y, barWidth, barHeight);
          }
        }
      };

      draw();
    } catch {
      setWebAudioFailed(true);
    }

    return () => {
      stopped = true;
      if (animRef.current) cancelAnimationFrame(animRef.current);
      if (audioCtxRef.current && audioCtxRef.current.state !== "closed") {
        try { audioCtxRef.current.close(); } catch {}
      }
    };
  }, [active, stream]);

  if (webAudioFailed) {
    return (
      <div className="flex items-center justify-center gap-1.5 h-10 rounded-xl bg-violet-50/50 p-2">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <div key={i} className="w-1.5 bg-violet-500 rounded-full animate-pulse" style={{ height: `${12 + (i % 4) * 6}px`, animationDelay: `${i * 120}ms` }} />
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-violet-100 bg-violet-50/50 p-2.5">
      <div className="flex items-center gap-2 mb-1.5">
        <span className="relative flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
        </span>
        <span className="text-[11px] font-bold uppercase tracking-wider text-violet-800">মাইক্রোফোন লাইভ অডিও স্পেকট্রাম</span>
      </div>
      <canvas ref={canvasRef} width={340} height={42} className="w-full max-w-[360px] h-10 rounded-lg" />
    </div>
  );
}
