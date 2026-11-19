"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowRight, BookOpen, Keyboard, Phone, PhoneCall, Scale, Send, Volume2 } from "lucide-react";
import { SourceTag } from "@/components/layout/AppHeader";
import { HELPLINES, LAWS, NOT_LEGAL_ADVICE_BN, NOT_LEGAL_ADVICE_EN, type HelplineId, type LawId } from "@/lib/legal/data";
import { PROBLEM_CATEGORIES } from "@/lib/legal/taxonomy";
import { GENERAL_TOPICS, INQUIRIES } from "@/lib/legal/inquiries";
import { INDIGENOUS_LANGUAGES, interpretSemanticBridge, type IndigenousLanguage, type SemanticBridgeResult } from "@/lib/legal/semanticBridge";
import { VoiceCall, speakText, stopSpeaking, type AssistReply } from "./VoiceCall";
import { isOfflineEngine, OFFLINE_LABEL } from "@/lib/health/offline";

/*
 * Legal assistant: ask in text or by a call. Ported from the Digital Legal Aid System's citizen chat and voice agent
 * (razibr246, AdribMahmud101) onto KormoPath's look and rules (docs/apps/legal/DESIGN_BRIEF.md). Answers come from
 * /api/legal/assist: Gemini under a fact guard, or the verified rule-based answers. Conversations are not saved.
 */

interface TraceStep { tool: string; detail: string; status: string }
interface Reply extends AssistReply {
  lang: "bn" | "en";
  helplines: HelplineId[];
  laws: LawId[];
  next: Array<{ href: string; bn: string; en: string }>;
  severity: string;
  categoryId: string | null;
  trace: TraceStep[];
}
type Msg = { who: "user"; text: string } | { who: "bot"; reply: Reply } | { who: "error"; text: string };

const CATS = PROBLEM_CATEGORIES.filter((c) => !c.freeText && c.id !== "other");
const GENERAL_IDS = new Set<string>(GENERAL_TOPICS.map((g) => g.id));

async function askLegal(message: string, lang: "bn" | "en", topic: string | null, history: Array<{ who: "user" | "bot"; text: string }>): Promise<Reply | null> {
  try {
    const r = await fetch("/api/legal/assist", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ message, lang, topic, history: history.slice(-6) }) });
    if (!r.ok) return null;
    return (await r.json()) as Reply;
  } catch { return null; }
}

function samplesFor(topic: string | null, bn: boolean): string[] {
  if (!topic) return [];
  const cat = CATS.find((c) => c.id === topic);
  if (cat) return cat.subcategories.slice(0, 4).map((s) => (bn ? s.bn : s.en));
  return INQUIRIES.filter((q) => q.topic === topic).slice(0, 4).map((q) => (bn ? q.questionBn : q.questionEn));
}

function AnswerCard({ reply, bn, latest, scaleKey }: { reply: Reply; bn: boolean; latest: boolean; scaleKey: number }) {
  const T = (b: string, e: string) => (bn ? b : e);
  const [showTrace, setShowTrace] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const lines = reply.helplines.map((id) => HELPLINES.find((h) => h.id === id)).filter((h): h is (typeof HELPLINES)[number] => !!h);
  const laws = reply.laws.map((id) => LAWS[id]).filter(Boolean);
  const listen = async () => {
    if (speaking) { stopSpeaking(); setSpeaking(false); return; }
    setSpeaking(true);
    await speakText(reply.answer, reply.lang);
    setSpeaking(false);
  };
  return (
    <article className="lg-card space-y-3 motion-safe:animate-rise-in" data-testid={latest ? "assist-answer" : undefined} data-crisis={reply.crisis ? "true" : "false"}>
      {reply.crisis && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border-2 border-red-400 bg-red-50 p-3 text-red-950" role="alert">
          <AlertTriangle size={20} className="shrink-0 text-red-700" aria-hidden />
          <p className="min-w-0 flex-1 text-[15px] font-bold leading-snug">{T("আপনি বিপদে থাকলে এখনই ফোন করুন", "If you are in danger, call now")}</p>
          <a href="tel:999" className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl bg-red-600 px-4 text-[15px] font-bold text-white"><Phone size={16} aria-hidden /> {T("৯৯৯", "999")}</a>
          <a href="tel:109" className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-red-300 bg-white px-4 text-[15px] font-bold text-red-800"><Phone size={16} aria-hidden /> {T("১০৯", "109")}</a>
        </div>
      )}
      <div className="flex items-start gap-3">
        <span key={scaleKey} className={`lg-scale ${latest ? "lg-scale-settle" : ""} mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-indigo-50 text-indigo-800`} aria-hidden><Scale size={19} /></span>
        <p className="min-w-0 flex-1 whitespace-pre-line text-[15.5px] leading-relaxed text-slate-800">{reply.answer}</p>
      </div>

      {lines.length > 0 && (
        <ul className="grid gap-2 sm:grid-cols-2">
          {lines.map((h) => (
            <li key={h.id} className="rounded-xl border border-slate-200 bg-slate-50/60 p-3">
              <a href={`tel:${h.number}`} className="flex items-center gap-2 text-[15px] font-bold text-slate-900"><Phone size={15} className="text-emerald-700" aria-hidden /><span className="font-mono">{bn ? h.number.replace(/\d/g, (d) => "০১২৩৪৫৬৭৮৯"[Number(d)]) : h.number}</span> {bn ? h.bn : h.en}</a>
              <p className="mt-0.5 text-[13.5px] text-slate-600">{bn ? h.whenBn : h.whenEn}</p>
              <div className="mt-1.5"><SourceTag confidence="official" label={h.source.label} url={h.source.url} checked={h.source.checked} /></div>
            </li>
          ))}
        </ul>
      )}

      {laws.length > 0 && (
        <div className="space-y-1.5">
          <p className="flex items-center gap-1.5 text-[13px] font-semibold text-slate-600"><BookOpen size={15} aria-hidden /> {T("সংশ্লিষ্ট আইন (পুরো লেখা সরকারি সাইটে)", "Related law (full text on the official site)")}</p>
          <div className="flex flex-wrap gap-2">
            {laws.map((l) => (
              <span key={l.id} className="inline-flex flex-wrap items-center gap-2">
                <a href={l.url} target="_blank" rel="noopener noreferrer" className="kp-chip !h-auto min-h-[36px] !rounded-full py-1 text-[13.5px] leading-[1.4]">{bn ? l.bn : l.en}</a>
                <SourceTag confidence="official" label={l.source.label} url={l.source.url} checked={l.source.checked} />
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
        {reply.next.map((n) => (n.href.startsWith("tel:")
          ? <a key={n.href} href={n.href} className="kp-btn-primary min-h-[44px]"><Phone size={16} aria-hidden /> {bn ? n.bn : n.en}</a>
          : <Link key={n.href} href={reply.categoryId && n.href === "/legal/apply" ? `${n.href}?category=${reply.categoryId}` : n.href} className="kp-btn-primary min-h-[44px]">{bn ? n.bn : n.en} <ArrowRight size={16} aria-hidden /></Link>))}
        <button type="button" onClick={() => void listen()} className="kp-btn-ghost min-h-[44px]"><Volume2 size={16} aria-hidden /> {speaking ? T("থামান", "Stop") : T("শুনুন", "Listen")}</button>
        <span className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[12px] font-semibold text-slate-600" data-testid={latest ? "assist-engine" : undefined} data-engine={reply.engine}>
          {isOfflineEngine(reply.engine)
            ? <span data-testid={latest ? "offline-label" : undefined}>{T(`${OFFLINE_LABEL.bn} · যাচাই করা নিয়ম থেকে`, `${OFFLINE_LABEL.en} · from checked rules`)}</span>
            : `${T("এআই, যাচাই করা", "AI, checked")} · ${reply.engine}`}
        </span>
        <button type="button" onClick={() => setShowTrace((v) => !v)} className="text-[12.5px] font-semibold text-indigo-800 underline underline-offset-2" aria-expanded={showTrace}>{T("কীভাবে তৈরি হলো", "How this was made")}</button>
      </div>
      {showTrace && (
        <ol className="space-y-1 rounded-xl bg-slate-50 p-3 text-[12.5px] text-slate-700">
          {reply.trace.map((s, i) => <li key={i} className={s.status === "fallback" ? "text-amber-800" : s.status === "fail" ? "text-red-800" : ""}><span className="font-mono">{s.tool}</span> — {s.detail}</li>)}
        </ol>
      )}
    </article>
  );
}

export function Assistant() {
  const [lang, setLang] = useState<"bn" | "en">("bn");
  const bn = lang === "bn";
  const T = (b: string, e: string) => (bn ? b : e);
  const [mode, setMode] = useState<"text" | "call">("text");
  const [community, setCommunity] = useState<"bn" | IndigenousLanguage>("bn");
  const [topic, setTopic] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [busy, setBusy] = useState(false);
  const [bridge, setBridge] = useState<SemanticBridgeResult | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const t = q.get("topic");
    if (t && (CATS.some((c) => c.id === t) || GENERAL_IDS.has(t))) setTopic(t);
    if (q.get("mode") === "call") setMode("call");
  }, []);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }); }, [msgs.length]);

  const history = (): Array<{ who: "user" | "bot"; text: string }> => msgs.flatMap((m): Array<{ who: "user" | "bot"; text: string }> =>
    m.who === "user" ? [{ who: "user", text: m.text }] : m.who === "bot" ? [{ who: "bot", text: m.reply.answer }] : []);

  const send = async (text: string, topicOverride?: string | null) => {
    const t = text.trim();
    if (!t || busy) return;
    setInput("");
    setMsgs((m) => [...m, { who: "user", text: t }]);
    setBusy(true);
    const reply = await askLegal(t, lang, topicOverride === undefined ? topic : topicOverride, history());
    setBusy(false);
    setMsgs((m) => [...m, reply ? { who: "bot", reply } : { who: "error", text: T("উত্তর আনা গেল না। ইন্টারনেট দেখে আবার চেষ্টা করুন, বা সরাসরি ১৬৬৯৯-এ ফোন করুন।", "Could not get an answer. Check the internet and try again, or call 16699 directly.") }]);
  };

  const submit = () => {
    const t = input.trim();
    if (!t) return;
    if (community !== "bn") {
      const r = interpretSemanticBridge(t, community);
      if (r.matched) { setBridge(r); return; }
    }
    void send(t);
  };

  const confirmBridge = (yes: boolean) => {
    const r = bridge;
    setBridge(null);
    if (!r) return;
    if (yes && r.categoryId) setTopic(r.categoryId);
    void send(r.transcript, yes ? r.categoryId : topic);
  };

  const ask = async (text: string, t: string | null) => {
    const reply = await askLegal(text, lang, t, []);
    return reply ? { answer: reply.answer, crisis: reply.crisis, engine: reply.engine } : null;
  };

  const samples = samplesFor(topic, bn);
  const replies = msgs.filter((m) => m.who === "bot").length;

  return (
    <div className="space-y-6" data-testid="legal-assistant">
      <section className="space-y-3 motion-safe:animate-rise-in">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="kp-eyebrow">{T("জিজ্ঞাসা করুন · লিখে বা কলে", "Ask · by text or call")}</p>
            <h1 className="mt-2 text-[clamp(30px,5vw,50px)] font-semibold leading-[1.08] text-slate-900">{bn ? <>আপনার আইনি প্রশ্ন, <em className="kp-em">সহজ ভাষায়</em></> : <>Your legal question, <em className="kp-em">in plain words</em></>}</h1>
            <p className="mt-2 max-w-[62ch] text-[15.5px] leading-relaxed text-slate-700">{T("কী হয়েছে বলুন; কোন আইন, কোন হেল্পলাইন আর পরের কোন ধাপ — উৎসসহ জানিয়ে দেব। কথোপকথন কোথাও সংরক্ষণ হয় না।", "Tell me what happened; I will point to the law, the helpline and the next step, with sources. Conversations are not saved anywhere.")}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label className="sr-only" htmlFor="lg-community">{T("আপনার ভাষা", "Your language")}</label>
            <select id="lg-community" value={community} onChange={(e) => setCommunity(e.target.value as "bn" | IndigenousLanguage)} className="min-h-[44px] rounded-xl border border-slate-300 bg-white px-3 text-[14px] font-semibold">
              <option value="bn">{T("ভাষা: বাংলা", "Language: Bangla")}</option>
              {INDIGENOUS_LANGUAGES.map((l) => <option key={l.id} value={l.id}>{T(`ভাষা: ${l.bn} (আনুমানিক)`, `Language: ${l.en} (approximate)`)}</option>)}
            </select>
            <button type="button" onClick={() => setLang(bn ? "en" : "bn")} className="kp-chip !h-11 !rounded-full !text-[13px] font-semibold" aria-label={bn ? "Switch to English" : "বাংলায় দেখুন"}>{bn ? "EN" : "বাং"}</button>
          </div>
        </div>
        <p className="max-w-[62ch] rounded-xl border border-indigo-200 bg-indigo-50/60 px-3 py-2 text-[13.5px] leading-relaxed text-indigo-950">{bn ? NOT_LEGAL_ADVICE_BN : NOT_LEGAL_ADVICE_EN}</p>
        <p className="max-w-[62ch] text-[13px] text-slate-600">{T("এআই চালু থাকলে শুধু আপনার লেখা প্রশ্নটি Google-এ যায় (সংরক্ষণ বন্ধ)। ", "When AI is on, only your typed question goes to Google (storage off). ")}<Link href="/privacy" className="font-semibold text-indigo-800 underline underline-offset-2" data-testid="privacy-link">{T("গোপনীয়তা", "Privacy")}</Link></p>
        {community !== "bn" && <p className="max-w-[62ch] text-[13.5px] text-slate-600">{T("চাকমা ও মারমা শব্দের অর্থ একটি প্রাথমিক শব্দতালিকা থেকে আন্দাজ করা হয়; ভুল হতে পারে, তাই প্রতিবার আপনাকে নিশ্চিত করতে বলা হবে।", "Chakma and Marma words are interpreted from an early word list; it can be wrong, so you will be asked to confirm each time.")}</p>}
        <div className="flex flex-wrap gap-2" role="tablist" aria-label={T("কীভাবে জিজ্ঞাসা করবেন", "How to ask")}>
          <button type="button" role="tab" aria-selected={mode === "text"} onClick={() => setMode("text")} className={`kp-chip !h-11 ${mode === "text" ? "kp-chip-on" : ""}`}><Keyboard size={16} aria-hidden /> {T("লিখে জিজ্ঞাসা", "Ask by text")}</button>
          <button type="button" role="tab" aria-selected={mode === "call"} onClick={() => setMode("call")} className={`kp-chip !h-11 ${mode === "call" ? "kp-chip-on" : ""}`} data-testid="assist-call-mode"><PhoneCall size={16} aria-hidden /> {T("কলে কথা বলুন", "Talk on a call")}</button>
        </div>
      </section>

      {mode === "call" ? (
        <VoiceCall lang={lang} community={community} ask={ask} />
      ) : (
        <>
          <section aria-labelledby="lg-topics-h" className="lg-card space-y-3">
            <h2 id="lg-topics-h" className="text-[18px] font-bold text-slate-900">{T("বিষয় বেছে নিন (না নিলেও চলবে)", "Pick a topic (optional)")}</h2>
            <div className="flex flex-wrap gap-2">
              {GENERAL_TOPICS.map((g) => (
                <button key={g.id} type="button" onClick={() => setTopic(topic === g.id ? null : g.id)} aria-pressed={topic === g.id} className={`kp-chip !h-auto min-h-[40px] py-1.5 leading-[1.4] ${topic === g.id ? "kp-chip-on" : ""} ${g.id === "safety" ? "!border-red-300 text-red-800" : ""}`}>{bn ? g.bn : g.en}</button>
              ))}
              {CATS.map((c) => (
                <button key={c.id} type="button" onClick={() => setTopic(topic === c.id ? null : c.id)} aria-pressed={topic === c.id} data-topic={c.id} className={`kp-chip !h-auto min-h-[40px] py-1.5 leading-[1.4] ${topic === c.id ? "kp-chip-on" : ""}`}>{bn ? c.bn : c.en}</button>
              ))}
            </div>
            {samples.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-[13px] font-semibold text-slate-600">{T("এমন কিছু? চাপ দিলেই জিজ্ঞাসা হবে", "Something like this? Tap to ask")}</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {samples.map((s) => (
                    <button key={s} type="button" onClick={() => void send(s)} disabled={busy} className="lg-card lg-card-hover !p-3 text-left text-[14.5px] leading-snug text-slate-800">{s}</button>
                  ))}
                </div>
              </div>
            )}
          </section>

          <section aria-label={T("কথোপকথন", "Conversation")} className="space-y-3">
            {msgs.map((m, i) => (m.who === "user"
              ? <p key={i} className="ml-auto max-w-[85%] rounded-2xl rounded-br-md bg-indigo-800 px-4 py-2.5 text-[15.5px] leading-relaxed text-white motion-safe:animate-rise-in">{m.text}</p>
              : m.who === "bot"
                ? <AnswerCard key={i} reply={m.reply} bn={bn} latest={i === msgs.length - 1} scaleKey={replies} />
                : <p key={i} role="alert" className="rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-[14.5px] text-amber-950">{m.text}</p>))}
            {busy && <p className="flex items-center gap-2 text-[14.5px] text-slate-600" role="status"><span className="lg-scale lg-scale-settle inline-grid h-8 w-8 place-items-center rounded-lg bg-indigo-50 text-indigo-800" aria-hidden><Scale size={17} /></span>{T("আইন আর উৎস মিলিয়ে দেখছি…", "Checking the law and sources…")}</p>}
            <div ref={endRef} />
          </section>

          {bridge && (
            <section className="rounded-2xl border-2 border-amber-400 bg-amber-50 p-4" data-testid="assist-bridge">
              <p className="text-[13px] font-bold text-amber-900">{T("আনুমানিক অর্থ — ঠিক কি না নিশ্চিত করুন", "Approximate meaning — please confirm")}</p>
              <p className="mt-1 text-[15px] text-amber-950">{bn ? bridge.normalizedBangla : `It sounds like you are talking about: ${bridge.legalIntentEn}`}</p>
              <p className="mt-1 text-[13px] text-amber-900">{bridge.matches.map((m) => `${m.matchedText} → ${bn ? m.glossBn : m.glossEn}`).join(" · ")}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <button type="button" onClick={() => confirmBridge(true)} className="kp-btn-primary min-h-[44px]">{T("হ্যাঁ, ঠিক", "Yes, that's right")}</button>
                <button type="button" onClick={() => confirmBridge(false)} className="kp-btn-ghost min-h-[44px]">{T("না, অন্য বিষয়", "No, something else")}</button>
              </div>
            </section>
          )}

          <form onSubmit={(e) => { e.preventDefault(); submit(); }} className="lg-card sticky bottom-3 z-10 flex items-end gap-2 !p-3 shadow-lg">
            <label className="sr-only" htmlFor="assist-input">{T("আপনার প্রশ্ন", "Your question")}</label>
            <textarea id="assist-input" data-testid="assist-input" value={input} onChange={(e) => setInput(e.target.value)} rows={2} maxLength={800}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(); } }}
              placeholder={T("যেমন: স্বামী ভরণপোষণ দেন না, কী করতে পারি?", "e.g. My husband does not pay maintenance — what can I do?")}
              className="min-w-0 flex-1 resize-none rounded-xl border border-slate-300 px-3 py-2.5 text-[15px] leading-relaxed" />
            <button type="submit" data-testid="assist-send" disabled={busy || !input.trim()} className="kp-btn-primary min-h-[48px] disabled:opacity-50"><Send size={17} aria-hidden /> <span className="hidden sm:inline">{T("পাঠান", "Send")}</span></button>
          </form>
        </>
      )}
    </div>
  );
}
