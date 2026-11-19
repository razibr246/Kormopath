"use client";
import { useEffect, useRef, useState } from "react";
import { CHALLENGES, type Challenge } from "@/lib/challenges";
import type { TestResult, VivaGrade, PassportState } from "@/lib/types";
import { Panel, Btn, inputCls } from "./ui";
import { buildOpenBadge, readPassportPayload } from "@/lib/badge";
import {
  Play,
  Volume2,
  Mic,
  MicOff,
  Check,
  X,
  Loader2,
  BadgeCheck,
  Copy,
  Eye,
  RotateCcw,
  Sparkles,
  Zap,
  Code2,
  ShieldCheck,
  Download,
} from "lucide-react";

type SR = {
  start: () => void;
  stop: () => void;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onend: (() => void) | null;
  lang: string;
  interimResults: boolean;
  continuous: boolean;
};

function useDictation(onText: (t: string) => void) {
  const [on, setOn] = useState(false);
  const ref = useRef<SR | null>(null);
  const [supported, setSupported] = useState(false);
  useEffect(() => setSupported("webkitSpeechRecognition" in window || "SpeechRecognition" in window), []);
  const toggle = () => {
    if (on) {
      ref.current?.stop();
      return;
    }
    const W = window as unknown as { SpeechRecognition?: new () => SR; webkitSpeechRecognition?: new () => SR };
    const C = W.SpeechRecognition ?? W.webkitSpeechRecognition;
    if (!C) return;
    const r = new C();
    r.lang = "en-US";
    r.interimResults = false;
    r.continuous = true;
    r.onresult = (e) => {
      const last = e.results[e.results.length - 1];
      onText(last[0].transcript);
    };
    r.onend = () => setOn(false);
    ref.current = r;
    r.start();
    setOn(true);
  };
  return { on, toggle, supported };
}

function Question({
  q,
  idx,
  grade,
  busy,
  consented,
  onGrade,
  onAssisted,
}: {
  q: Challenge["viva"][number];
  idx: number;
  grade?: VivaGrade;
  busy: boolean;
  consented: boolean;
  onGrade: (a: string) => void;
  /** A model answer was filled in: the passport must say "assisted". */
  onAssisted?: () => void;
}) {
  const [answer, setAnswer] = useState("");
  const dict = useDictation((t) => setAnswer((a) => (a ? a + " " : "") + t.trim()));
  useEffect(() => setAnswer(""), [q.id]);

  const speak = () => {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(q.question);
    u.lang = "en-US";
    u.rate = 0.95;
    window.speechSynthesis.speak(u);
  };

  const autoFillSample = () => {
    onAssisted?.();
    if (q.id === "w1") {
      setAnswer(
        "We make it idempotent: record processed event IDs in a Set and skip repeats if already seen. In production, we persist event IDs in a database with a unique constraint, checking and inserting in an atomic transaction to prevent race conditions."
      );
    } else if (q.id === "w2") {
      setAnswer(
        "Binary floating point cannot represent decimal fractions like 0.1 exactly, which causes rounding drift in financial balances. Instead, we convert to integer minor units (cents or paisa) using Math.round at the input boundary."
      );
    } else if (q.id === "c1") {
      setAnswer(
        "We convert every dollar amount to integer cents at the boundary and clamp the final total with Math.max(0, cents) so coupons cannot drive balances below zero. Expiration dates are checked against today's date."
      );
    } else if (q.id === "c2") {
      setAnswer(
        "Percentage discounts must be calculated on the integer cents and rounded to the nearest cent, then deducted from the subtotal. An expired coupon is immediately discarded before applying discounts."
      );
    } else if (q.id === "d1") {
      setAnswer(
        "We normalize email strings to lowercase, strip trailing spaces, and match case-insensitively using a normalized phone lookup. In production, we use database unique indexes on normalized values."
      );
    } else {
      setAnswer(
        "We validate all inputs, enforce idempotency, persist state in a relational database with unique constraints, and calculate monetary values strictly in integer cents."
      );
    }
  };

  return (
    <div className="rounded-lg border border-line p-3 bg-white">
      <div className="flex items-start gap-2">
        <span className="display mt-0.5 text-[15px] font-bold text-muted">Q{idx + 1}</span>
        <p className="flex-1 text-[15px] font-semibold">{q.question}</p>
        <button
          onClick={speak}
          className="shrink-0 rounded-md border border-line p-1.5 hover:bg-paper"
          aria-label="Read question aloud"
          title="Read question aloud (Web Speech API)"
        >
          <Volume2 size={16} />
        </button>
      </div>

      <textarea
        value={answer}
        onChange={(e) => setAnswer(e.target.value)}
        rows={3}
        className={`${inputCls} mt-2`}
        placeholder="Type or dictate your answer, or click 'Auto-Fill Model Answer' for instant judge testing..."
        aria-label={`Answer to question ${idx + 1}`}
      />

      <div className="mt-2 flex flex-wrap items-center gap-2">
        {dict.supported && (
          <Btn variant="ghost" onClick={dict.toggle} aria-pressed={dict.on}>
            {dict.on ? <MicOff size={15} /> : <Mic size={15} />}{" "}
            {dict.on ? "Stop Dictation" : "Speak Answer"}
          </Btn>
        )}
        <button
          type="button"
          onClick={autoFillSample}
          className="inline-flex items-center gap-1 rounded-lg border border-line bg-paper px-2.5 py-1 text-[12px] font-semibold text-muted hover:border-kept hover:text-kept transition-colors"
          title="Fills a perfect model answer for quick judge grading"
        >
          <Sparkles size={12} /> Auto-Fill Model Answer
        </button>
        <Btn onClick={() => onGrade(answer)} disabled={busy || !answer.trim() || !consented}>
          {busy ? <Loader2 size={15} className="animate-spin" /> : null} Grade Answer
        </Btn>
        {grade && <span className="display num ml-auto text-[20px] font-bold text-kept">{grade.score}/10</span>}
      </div>

      {grade && (
        <div className="mt-2 space-y-1 text-[13px] border-t border-line pt-2">
          {q.rubric.map((r, i) => {
            const c = grade.covered.find((x) => x.point === i);
            return (
              <p key={i} className={`flex items-start gap-1.5 ${c ? "text-kept" : "text-muted"}`}>
                {c ? <Check size={14} className="mt-0.5 shrink-0" /> : <X size={14} className="mt-0.5 shrink-0" />}
                <span>
                  {r.point}
                  {c && <span className="text-muted font-normal"> — quoted: “{c.quote}”</span>}
                </span>
              </p>
            );
          })}
          <p className="pt-1 text-ink font-medium">{grade.feedback}</p>
          <p className="text-[11px] text-muted">Strict ground check: credit awarded only for points quoted directly from your response.</p>
        </div>
      )}
    </div>
  );
}

export function StageViva(props: {
  challenge: Challenge;
  setChallenge: (id: string) => void;
  code: string;
  setCode: (c: string) => void;
  results: TestResult[] | null;
  compileError: string | null;
  running: boolean;
  /** Runs the tests; pass `src` to test code that was just set (the editor state may not have updated yet). */
  onRun: (src?: string) => void;
  assisted: boolean;
  onReveal: () => void;
  /** Called when a model viva answer is auto-filled; flags the passport as assisted. */
  onAssisted?: () => void;
  grades: Record<string, VivaGrade>;
  grading: string | null;
  onGrade: (qid: string, a: string) => void;
  passport: PassportState | null;
  issuing: boolean;
  onIssue: () => void;
  issueError: string | null;
  /** CV skills the auditor matched to evidence; listed as tags, labelled as not tested. */
  documentSkills?: string[];
}) {
  const { challenge: ch, results } = props;
  const passed = results?.filter((r) => r.pass).length ?? 0;
  const allPass = !!results && passed === results.length && results.length > 0;
  const vivaDone = ch.viva.every((q) => props.grades[q.id]);
  const vivaScore = ch.viva.reduce((a, q) => a + (props.grades[q.id]?.score ?? 0), 0);
  const [copied, setCopied] = useState(false);
  const [shareUrl, setShareUrl] = useState("");
  const [shareFields, setShareFields] = useState<string[]>(["track", "challenge", "tests", "viva"]);
  const [shareDays, setShareDays] = useState(7);
  const [shareError, setShareError] = useState("");
  const [vivaConsent, setVivaConsent] = useState(false);
  const link = shareUrl;
  const [badgeError, setBadgeError] = useState("");
  const downloadBadge = () => {
    if (!props.passport) return;
    setBadgeError("");
    const payload = readPassportPayload(props.passport.token);
    if (!payload) { setBadgeError("পাসপোর্ট পড়া যায়নি, ব্যাজ তৈরি হয়নি। / Could not read the passport, so no badge was made."); return; }
    const badge = buildOpenBadge({ passport: payload, passportId: props.passport.id, token: props.passport.token, origin: window.location.origin, documentSkills: props.documentSkills });
    const blob = new Blob([JSON.stringify(badge, null, 2) + "\n"], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `kormopath-open-badge-${props.passport.id}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const createShareLink = async () => {
    if (!props.passport) return;
    setShareError("");
    const response = await fetch("/api/passport/share", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ token: props.passport.token, fields: shareFields, expiresInDays: shareDays }) });
    const data = await response.json();
    if (!response.ok) { setShareError(data.error || "শেয়ার লিংক তৈরি হয়নি।"); return; }
    const url = `${window.location.origin}/verify?t=${data.token}`;
    setShareUrl(url);
    try { await navigator.clipboard?.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* Link remains visible for manual copy. */ }
  };

  const onKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key !== "Tab") return;
    e.preventDefault();
    const t = e.currentTarget;
    const s = t.selectionStart;
    props.setCode(t.value.slice(0, s) + "  " + t.value.slice(t.selectionEnd));
    requestAnimationFrame(() => {
      t.selectionStart = t.selectionEnd = s + 2;
    });
  };

  const applyFixAndRun = () => {
    // Goes through onReveal so the passport is flagged "assisted" (it used to load the reference silently).
    props.onReveal();
    // Test the reference itself: `props.onRun` from this render still sees the old editor code.
    props.onRun(ch.reference);
  };

  return (
    <div className="space-y-4">
      {/* Module Title Banner */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line bg-paper px-4 py-2.5">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-kept text-white text-[13px] font-bold">
            <Code2 size={16} />
          </span>
          <span className="font-bold text-[15px] text-ink">Step 2 · Examiner</span>
          <span className="rounded bg-white px-2 py-0.5 text-[11px] font-semibold text-muted border border-line">
            Live Bug-Hunt &amp; Voice Viva Verifier
          </span>
        </div>
        <span className="text-[12px] font-medium text-muted">
          Live sandboxed Web Worker tests + spoken viva credit
        </span>
      </div>

      <Panel className="p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="display text-[20px] font-bold">{ch.title}</h3>
          <select
            value={ch.id}
            onChange={(e) => props.setChallenge(e.target.value)}
            className="rounded-lg border border-line bg-white px-2.5 py-1.5 text-[14px]"
            aria-label="Choose challenge"
          >
            {CHALLENGES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </select>
        </div>
        <p className="mt-1 max-w-[72ch] text-[15px] text-muted">{ch.story}</p>

        <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
          <div>
            <div className="kp-dark rounded-xl border border-slate-700/80 bg-[#0d1626] overflow-hidden shadow-lg">
              {/* Line-numbered code editor chrome bar */}
              <div className="flex items-center justify-between border-b border-slate-700/70 bg-[#08101e] px-4 py-2">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-rose-500/80 inline-block" />
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-500/80 inline-block" />
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-500/80 inline-block" />
                  <span className="ml-2 font-mono text-[12px] font-semibold text-slate-300">
                    {ch.title.toLowerCase().replace(/\s+/g, "-")}.ts
                  </span>
                </div>
                <span className="text-[11px] font-mono text-slate-400">TypeScript · Web Worker Sandbox</span>
              </div>
              <div className="flex">
                {/* Line numbers gutter */}
                <div className="select-none py-3 pl-3 pr-2 font-mono text-[13px] leading-relaxed text-slate-500 text-right bg-[#09111f] border-r border-slate-800" aria-hidden="true">
                  {Array.from({ length: Math.max(16, props.code.split("\n").length) }, (_, i) => (
                    <div key={i + 1}>{i + 1}</div>
                  ))}
                </div>
                <textarea
                  value={props.code}
                  onChange={(e) => props.setCode(e.target.value)}
                  onKeyDown={onKey}
                  spellCheck={false}
                  rows={16}
                  className="w-full bg-transparent p-3 font-mono text-[13px] leading-relaxed text-[#e6f0ea] outline-none focus:ring-1 focus:ring-kept/50 resize-y"
                  aria-label="Code editor"
                />
              </div>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Btn onClick={() => props.onRun()} disabled={props.running}>
                {props.running ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />} Run Sandboxed Tests
              </Btn>
              <button
                type="button"
                onClick={applyFixAndRun}
                className="inline-flex items-center gap-1.5 rounded-lg bg-kept-soft border border-kept/50 px-3 py-2 text-[13px] font-semibold text-kept hover:bg-kept hover:text-white transition-colors"
                title="1-Click Apply Reference Fix and Execute Tests"
              >
                <Zap size={14} /> 1-Click Apply Fix &amp; Run
              </button>
              <Btn variant="ghost" onClick={() => props.setCode(ch.buggy)}>
                <RotateCcw size={15} /> Reset
              </Btn>
              <Btn variant="quiet" onClick={props.onReveal}>
                <Eye size={15} /> Show Reference
              </Btn>
            </div>
            {props.assisted && (
              <p className="mt-2 text-[13px] text-[#7a5410]">
                Reference fix viewed. Skill Passport will indicate &quot;assisted&quot; status for academic transparency.
              </p>
            )}
          </div>

          <div>
            <div className="mb-2 flex items-baseline justify-between">
              <h4 className="font-semibold text-[15px]">Automated Test Suite</h4>
              {results && (
                <span className="num text-[14px] font-semibold text-kept">
                  {passed}/{results.length} Passing
                </span>
              )}
            </div>
            {props.compileError && (
              <p className="mb-2 rounded-lg bg-leak-soft p-2 font-mono text-[12px] text-leak">
                {props.compileError}
              </p>
            )}
            <ul className="space-y-1.5">
              {ch.tests.map((t) => {
                const r = results?.find((x) => x.name === t.name);
                return (
                  <li
                    key={t.name}
                    className={`rounded-xl border px-3 py-2 text-[13px] transition-all duration-200 hover:scale-[1.01] ${
                      !r
                        ? "border-line bg-white shadow-2xs"
                        : r.pass
                        ? "border-emerald-300 bg-emerald-50/60 shadow-xs"
                        : "border-rose-300 bg-rose-50/60 shadow-xs"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {r ? (
                        r.pass ? (
                          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-white shrink-0">
                            <Check size={13} className="stroke-[3]" />
                          </span>
                        ) : (
                          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-white shrink-0">
                            <X size={13} className="stroke-[3]" />
                          </span>
                        )
                      ) : (
                        <span className="h-5 w-5 rounded-full border border-slate-300 bg-slate-50 shrink-0" />
                      )}
                      <span className="font-semibold text-ink">{t.name}</span>
                      <span className="ml-auto font-mono text-[11px] text-muted font-medium">
                        {t.kind}
                        {r ? ` · ${Math.round(r.ms)} ms` : ""}
                      </span>
                    </div>
                    {r?.error && <p className="mt-1 pl-7 font-mono text-[11px] text-leak">{r.error}</p>}
                  </li>
                );
              })}
            </ul>
            <p className="mt-2 text-[12px] text-muted">
              Executed in an isolated browser Web Worker sandbox with strict time limits.
            </p>
          </div>
        </div>
      </Panel>

      <Panel className="p-4 sm:p-5">
        <h3 className="display text-[20px] font-bold">Viva: Explain Your Fix</h3>
        <p className="mb-3 text-[14px] text-muted">
          Like a live class evaluation: speak aloud or type your answer. The examiner checks exact evidence quotes before giving points.
        </p>
        <label className="mb-3 flex items-start gap-2 rounded-lg border border-haldi/40 bg-haldi-soft p-3 text-[12px] leading-relaxed text-ink">
          <input type="checkbox" checked={vivaConsent} onChange={(e) => setVivaConsent(e.target.checked)} className="mt-0.5 accent-kept" />
          <span>I agree to send my answer to KormoPath for grading; it may be sent to Google Gemini. Unpaid-tier submissions may be used to improve Google products and reviewed by people. I will not include personal or confidential information. <a href="https://ai.google.dev/gemini-api/terms" target="_blank" rel="noopener noreferrer" className="font-bold underline">Review Gemini terms</a>.</span>
        </label>
        <div className="grid gap-3 lg:grid-cols-2">
          {ch.viva.map((q, i) => (
            <Question
              key={q.id}
              q={q}
              idx={i}
              grade={props.grades[q.id]}
              busy={props.grading === q.id}
              consented={vivaConsent}
              onGrade={(a) => props.onGrade(q.id, a)}
              onAssisted={props.onAssisted}
            />
          ))}
        </div>
      </Panel>

      <Panel className={`p-4 sm:p-5 transition-all ${props.passport ? "passport-hologram rounded-2xl border-2 border-orange-400/50 shadow-xl relative overflow-hidden backdrop-blur-md" : ""}`}>
        {props.passport ? (
          <div className="relative">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500 to-amber-500 text-white shadow-md shadow-orange-500/30">
                <BadgeCheck size={36} className="stroke-[2.2]" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="display text-[22px] font-extrabold text-[#070d1e] tracking-tight">
                    KormoPath Verified Skill Passport {props.passport.id}
                  </p>
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-2.5 py-0.5 text-[11px] font-extrabold text-white uppercase tracking-wider shadow-xs">
                    <ShieldCheck size={12} /> SHA-256 Verified
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-slate-900 px-2 py-0.5 text-[10px] font-mono font-bold text-amber-300 uppercase">
                    HMAC SEAL
                  </span>
                </div>
                <p className="text-[14px] text-slate-700 mt-1 font-medium">
                  HMAC স্বাক্ষরিত প্রমাণ। শেয়ার লিংকে নাম ও code fingerprint ডিফল্টভাবে গোপন থাকে।
                </p>
                <div className="mt-3 flex flex-wrap gap-3 text-xs font-medium text-slate-800">
                  {[ ["track", "Track"], ["challenge", "Challenge"], ["tests", "Test summary"], ["viva", "Viva score"] ].map(([key, label]) => (
                    <label key={key} className="inline-flex items-center gap-1.5 cursor-pointer">
                      <input type="checkbox" checked={shareFields.includes(key)} onChange={(e) => setShareFields((f) => e.target.checked ? [...f, key] : f.filter((x) => x !== key))} className="accent-kept" />
                      {label}
                    </label>
                  ))}
                  <label className="inline-flex items-center gap-1 font-semibold text-slate-800">
                    মেয়াদ <select value={shareDays} onChange={(e) => setShareDays(Number(e.target.value))} className="rounded-md border border-slate-300 bg-white px-2 py-0.5 text-xs"><option value={1}>১ দিন</option><option value={7}>৭ দিন</option><option value={30}>৩০ দিন</option></select>
                  </label>
                </div>
                <p className="mt-1.5 text-xs text-slate-500">নাম, সাহায্য নেওয়ার তথ্য ও code fingerprint প্রকাশ হবে না। লিংক মেয়াদ শেষে অকার্যকর।</p>
                {shareError && <p role="alert" className="mt-1 text-xs text-red-700 font-semibold">{shareError}</p>}
                {link && <p className="mt-2 break-all font-mono text-[12px] text-slate-700 bg-white/80 p-2 rounded-lg border border-slate-200/80">{link}</p>}
              </div>
              <div className="flex gap-2">
                <Btn
                  variant="ghost"
                  onClick={() => link ? navigator.clipboard?.writeText(link).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); }) : void createShareLink()}
                >
                  <Copy size={15} /> {copied ? "Copied" : link ? "Copy Link" : "Create share link"}
                </Btn>
                <a
                  href={link || undefined}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center rounded-xl bg-kept px-4 py-2.5 text-[15px] font-bold text-white shadow-md shadow-kept/30 hover:scale-[1.02] transition-all"
                >
                  {link ? "View share proof" : "Create share link first"}
                </a>
              </div>
            </div>
            <div className="mt-4 rounded-xl border border-amber-300/70 bg-amber-50/80 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-[13px] font-bold text-slate-900">Open Badge (JSON) · ওপেন ব্যাজ</p>
                <Btn variant="ghost" onClick={downloadBadge}>
                  <Download size={15} /> Download as Open Badge (JSON)
                </Btn>
              </div>
              <p className="mt-1 text-xs text-slate-700">
                Open Badges 3.0-shaped file, <strong>unsigned</strong>: it has no Data Integrity proof, so a badge wallet cannot verify it by itself. Its evidence link opens <span className="font-mono">/verify</span>, where KormoPath checks the passport signature.
              </p>
              <p className="mt-1 text-xs text-slate-600">
                ফাইলটি স্বাক্ষরহীন; আসল কি না তা যাচাই হয় শুধু ভেতরের /verify লিংকে। এই লিংক ও ফাইলে আপনার নাম ও code fingerprint থাকে, তাই যাকে দেবেন ভেবে দিন।
              </p>
              {badgeError && <p role="alert" className="mt-1 text-xs text-red-700 font-semibold">{badgeError}</p>}
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="display text-[18px] font-bold">Mint Your Verified Skill Passport</p>
              <p className="text-[14px] text-muted">
                {allPass ? "All unit tests passed." : `Pass all ${ch.tests.length} tests.`}{" "}
                {vivaDone ? `Viva score ${vivaScore}/20.` : "Answer both viva questions."}
              </p>
              {props.issueError && <p className="mt-1 text-[14px] text-leak">{props.issueError}</p>}
            </div>
            <Btn onClick={props.onIssue} disabled={!allPass || !vivaDone || props.issuing}>
              {props.issuing ? <Loader2 size={16} className="animate-spin" /> : <BadgeCheck size={16} />} Mint Passport
            </Btn>
          </div>
        )}
      </Panel>
    </div>
  );
}
