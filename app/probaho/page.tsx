"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Mic, Square, Keyboard, Play, RotateCcw, CheckCircle2, XCircle, Lightbulb, MessageCircleQuestion, Trash2, TrendingUp, Info, Sparkles, Quote } from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { QUESTIONS, analyzeAnswer, progressSummary, starCheck, practiceStreak, type Question, type Analysis, type SessionRecord } from "@/lib/speech";
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

const TRACKS: { id: Question["track"]; label: string }[] = [
  { id: "technical", label: "টেকনিক্যাল ভাইভা" },
  { id: "hr", label: "এইচআর ইন্টারভিউ" },
  { id: "academic", label: "প্রজেক্ট/থিসিস ডিফেন্স" },
  { id: "bangla", label: "বাংলা ভাইভা" },
];

const sanitizeHistory = (raw: unknown): SessionRecord[] | null =>
  Array.isArray(raw)
    ? raw.filter((r): r is SessionRecord => r && typeof r.id === "string" && typeof r.date === "string" && typeof r.total === "number" && r.total >= 0 && r.total <= 100).slice(0, 200)
    : null;

export default function ProbahoPage() {
  const [track, setTrack] = useState<Question["track"]>("technical");
  const [qid, setQid] = useState(QUESTIONS[0].id);
  const q = QUESTIONS.find((x) => x.id === qid)!;
  const [mode, setMode] = useState<"speak" | "type">("speak");
  const [finalText, setFinalText] = useState("");
  const [interim, setInterim] = useState("");
  const [typed, setTyped] = useState("");
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
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
    setFinalText(""); setInterim(""); setTyped(""); setAnalysis(null); setElapsed(0); setError(null); setShowModel(false);
    finalRef.current = "";
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl(null);
  };

  const pickQuestion = (id: string) => {
    // Stop any recording for the old question; reset() clears the transcript first, so the
    // aborted session's onend finds nothing to score.
    reset();
    try { recRef.current?.abort?.(); } catch { /* ignore */ }
    setQid(id);
  };

  const finish = (text: string, seconds: number | null) => {
    const a = analyzeAnswer(text, q, seconds);
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
      if (mediaRef.current && mediaRef.current.state !== "inactive") mediaRef.current.stop();
      if (finalRef.current.trim()) finish(finalRef.current, secs);
    };
    recRef.current = r;

    if (keepAudio && navigator.mediaDevices?.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mr = new MediaRecorder(stream);
        chunksRef.current = [];
        mr.ondataavailable = (ev) => ev.data.size && chunksRef.current.push(ev.data);
        mr.onstop = () => {
          stream.getTracks().forEach((t) => t.stop());
          setAudioUrl(URL.createObjectURL(new Blob(chunksRef.current, { type: mr.mimeType || "audio/webm" })));
        };
        mr.start();
        mediaRef.current = mr;
      } catch {
        setError("নিজের রেকর্ডিং চালু করা যায়নি; ট্রান্সক্রিপ্ট তবুও কাজ করবে।");
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

  const stop = () => recRef.current?.stop();

  const progress = useMemo(() => progressSummary(history), [history]);
  const streak = useMemo(() => practiceStreak(history, new Date().toISOString().slice(0, 10)), [history]);
  const answerText = mode === "speak" ? finalText : typed;
  const star = analysis && q.track === "hr" ? starCheck(answerText) : null;
  const questionsInTrack = QUESTIONS.filter((x) => x.track === track);
  const shownText = mode === "speak" ? `${finalText}${interim ? ` ${interim}` : ""}` : typed;
  const over = elapsed > q.targetSeconds;

  return (
    <div className="min-h-screen bg-[#f8f7fc] text-slate-900 antialiased">
      <AppHeader taglineEn="Interview & viva speaking coach" appId="probaho" href="/probaho" name="Probaho Coach" taglineBn="ভাইভা ও ইন্টারভিউ বলার অনুশীলন" icon={<Mic size={22} />} accent="from-violet-600 to-indigo-700" />

      <main id="main" className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6">
        <section className="flex flex-wrap items-end justify-between gap-4 rounded-2xl border border-violet-100 bg-white p-5">
          <div className="max-w-2xl">
            <h1 className="text-[26px] font-extrabold leading-tight tracking-tight sm:text-[32px]">প্রশ্নের উত্তর বলুন, কোথায় ভালো হলো আর কী বাদ পড়ল দেখুন</h1>
            <p className="mt-2 text-[15px] leading-relaxed text-slate-600">
              প্রতিটি প্রশ্নে কোন বিষয়গুলো একজন পরীক্ষক শুনতে চান তা আগে থেকে ঠিক করা আছে। আপনার উত্তর সেগুলো ছুঁয়েছে কি না, উদাহরণ ও সারসংক্ষেপ আছে কি না, ফিলার শব্দ কত — সব স্বচ্ছভাবে দেখায়। উচ্চারণ বা অ্যাকসেন্টের জন্য নম্বর কাটে না।
            </p>
          </div>
          {progress && (
            <div className="min-w-[240px] rounded-2xl border border-violet-200 bg-violet-50 p-4 text-[13px]">
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
                <button key={t.id} role="tab" aria-selected={track === t.id} onClick={() => { setTrack(t.id); pickQuestion(QUESTIONS.find((x) => x.track === t.id)!.id); }} className={`rounded-lg px-3 py-1.5 text-[12px] font-bold ${track === t.id ? "bg-violet-600 text-white" : "bg-slate-100 text-slate-600"}`}>
                  {t.label}
                </button>
              ))}
            </div>
            <label className="block text-[12px] font-bold text-slate-600">
              প্রশ্ন
              <select value={qid} onChange={(e) => pickQuestion(e.target.value)} className="mt-1 block w-full rounded-lg border border-slate-200 bg-white px-2 py-2 text-[13px] font-normal">
                {questionsInTrack.map((x) => <option key={x.id} value={x.id}>[{x.level}] {x.prompt}</option>)}
              </select>
            </label>
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
                {recording && <div className="h-1.5 overflow-hidden rounded-full bg-slate-100"><div className={`h-full ${over ? "bg-amber-500" : "bg-violet-500"}`} style={{ width: `${Math.min(100, (elapsed / q.targetSeconds) * 100)}%` }} /></div>}
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
                <span className="mb-1 block text-[11px] font-bold uppercase text-slate-400">যা শোনা গেছে (স্বয়ংক্রিয় — ভুল থাকতে পারে)</span>
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
              <p className="text-[11px] text-slate-500">ট্রান্সক্রিপ্টে ভুল শব্দ থাকলে “লিখে উত্তর” মোডে ঠিক করে আবার মূল্যায়ন করতে পারেন: <button className="underline" onClick={() => { setTyped(finalText); setMode("type"); setAnalysis(null); }}>ট্রান্সক্রিপ্ট এডিট করুন</button></p>
            )}
          </section>

          <section aria-labelledby="fb-h" className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
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

        <p className="text-[11px] text-slate-500">
          <Info size={12} className="mr-1 inline" aria-hidden />
          স্কোর একটি স্বয়ংক্রিয় অনুশীলন-নির্দেশক, পরীক্ষার ফল নয়। স্পিচ-টু-টেক্সট ভুল শুনলে ফলাফলও ভুল হতে পারে; বাংলা স্বীকৃতি ইংরেজির চেয়ে কম নির্ভুল হতে পারে। দক্ষতা যাচাইসহ স্কিল পাসপোর্ট চাইলে <Link href="/workspace" className="font-semibold text-violet-700 underline">KormoPath Workspace</Link>।
        </p>
      </main>
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
