"use client";
import { useRef, useState } from "react";
import type { AuditResult } from "@/lib/types";
import { fmtBdt } from "@/lib/finops";
import { Panel, Btn, SourceTag, inputCls } from "./ui";
import { Upload, Check, CircleHelp, X, Github, Loader2, Sparkles, Compass, ShieldAlert, Calendar } from "lucide-react";

const VERDICT = {
  verified: { cls: "border-kept/40 bg-kept-soft text-kept", icon: Check, label: "Quote found in your CV" },
  partial: { cls: "border-haldi/60 bg-haldi-soft text-[#7a5410]", icon: CircleHelp, label: "Loosely backed by your CV" },
  unverified: { cls: "border-leak/30 bg-leak-soft text-leak line-through", icon: X, label: "Rejected: quote not in your CV" },
};

export function StageAudit({
  cv, setCv, result, busy, error, fx, onRun, onFile,
}: {
  cv: string;
  setCv: (s: string) => void;
  result: AuditResult | null;
  busy: boolean;
  error: string | null;
  fx: number;
  onRun: (github?: string) => void;
  onFile: (f: File, github?: string) => void;
}) {
  const [gh, setGh] = useState("");
  const [consented, setConsented] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const v = result?.valuation;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFileName(file.name);
      setSelectedFile(file);
    }
  };

  return (
    <div className="space-y-4">
      {/* Module Title Banner */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line bg-paper px-4 py-2.5">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-kept text-white text-[13px] font-bold">
            <Compass size={16} />
          </span>
          <span className="font-bold text-[15px] text-ink">Module 1: KormoPath Compass</span>
          <span className="rounded bg-white px-2 py-0.5 text-[11px] font-semibold text-muted border border-line">
            Multimodal Skill &amp; AI-Obsolescence Auditor
          </span>
        </div>
        <span className="text-[12px] font-medium text-muted">
          Valued against indicative 2026 Bangladesh rate ranges ($10–$100/hr)
        </span>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <Panel className="p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <h3 className="display text-[19px] font-bold">Your CV or Profile</h3>
            {fileName && (
              <span className="flex items-center gap-1 text-[11px] font-semibold text-kept bg-kept-soft px-2 py-0.5 rounded">
                <Sparkles size={11} /> OCR Ready: {fileName}
              </span>
            )}
          </div>
          <p className="mb-2 text-[14px] text-muted">Paste CV text, or upload a CV photo, PDF or a Fiverr/Upwork profile screenshot.</p>
          <p className="mb-3 rounded-lg bg-paper px-3 py-2 text-[12px] text-muted">Uploaded documents are processed through Vision OCR. Every claimed skill must strictly quote your source text or it gets rejected.</p>
          <textarea
            value={cv}
            onChange={(e) => setCv(e.target.value)}
            rows={12}
            className={`${inputCls} ledger-rule font-sans leading-8`}
            placeholder="Paste your CV, bio, technical stack, or project summary here…"
            aria-label="CV text"
          />
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <label className="relative flex min-w-[180px] flex-1 items-center gap-2 rounded-lg border border-line bg-white px-3 py-2">
              <Github size={16} className="text-muted" aria-hidden />
              <input
                value={gh}
                onChange={(e) => setGh(e.target.value.replace(/^@/, ""))}
                placeholder="GitHub username (optional)"
                className="w-full text-[15px] outline-none"
                aria-label="GitHub username"
              />
            </label>
            <input
              ref={fileRef}
              type="file"
              accept="image/*,application/pdf"
              className="hidden"
              onChange={handleFileChange}
            />
            <Btn variant="ghost" onClick={() => fileRef.current?.click()} disabled={busy}>
              <Upload size={16} /> Upload Screenshot/PDF
            </Btn>
            <Btn onClick={() => selectedFile ? onFile(selectedFile, gh || undefined) : onRun(gh || undefined)} disabled={busy || (!selectedFile && !cv.trim()) || !consented}>
              {busy ? <Loader2 size={16} className="animate-spin" /> : null} Audit with Compass
            </Btn>
          </div>
          <label className="mt-3 flex items-start gap-2 rounded-lg border border-haldi/40 bg-haldi-soft p-3 text-[12px] leading-relaxed text-ink">
            <input type="checkbox" checked={consented} onChange={(e) => setConsented(e.target.checked)} className="mt-0.5 accent-kept" />
            <span>I agree to send this CV text/file to KormoPath for analysis. It may be sent to Google Gemini; Google may use unpaid-tier submissions to improve products and human reviewers may review them. GitHub username may be checked via GitHub’s public API. I will not submit sensitive or confidential information. <a href="https://ai.google.dev/gemini-api/terms" target="_blank" rel="noopener noreferrer" className="font-bold underline">Review Gemini terms</a>.</span>
          </label>
          {error && <p className="mt-3 rounded-lg bg-leak-soft px-3 py-2 text-[14px] text-leak">{error}</p>}
        </Panel>

        <div className="space-y-4">
          {!result ? (
            <Panel className="flex min-h-[320px] flex-col items-center justify-center p-6 text-center text-muted">
              <Compass size={36} className="text-muted/40 mb-2" />
              <p className="max-w-sm font-medium">Your indicative market rate, skills backed by verbatim quotes from your CV, an AI-exposure estimate and a 7-day upskill roadmap will appear here.</p>
              <p className="mt-2 text-[12px] text-muted">Select any of the 3 Judge Presets above for a 1-click test.</p>
            </Panel>
          ) : (
            <>
              {/* Valuation Card */}
              <Panel className="p-4 sm:p-5">
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-[14px] text-muted">{result.extraction.name ?? "You"} • {v!.track.name}</p>
                      <span className="rounded bg-kept-soft px-2 py-0.5 text-[11px] font-bold text-kept">
                        Indicative range
                      </span>
                    </div>
                    <p className="display num text-[44px] font-extrabold leading-none text-kept">
                      ${v!.rateUsd}<span className="text-[20px] font-semibold text-muted">/hr</span>
                    </p>
                    <p className="num text-[15px] text-muted font-medium">
                      ≈ {fmtBdt(v!.rateUsd * fx)} BDT/hour (at ৳{fx.toFixed(1)}/USD)
                    </p>
                  </div>
                  <div className="w-full max-w-[260px]">
                    <div className="flex justify-between text-[12px] text-muted">
                      <span className="num">${v!.track.rateUsd[0]}/hr</span>
                      <span>2026 Market Range</span>
                      <span className="num">${v!.track.rateUsd[1]}/hr</span>
                    </div>
                    <div className="relative mt-1 h-2.5 rounded-full bg-paper">
                      <div className="bar-grow absolute inset-y-0 left-0 rounded-full bg-kept" style={{ width: `${v!.position * 100}%` }} />
                    </div>
                    <div className="mt-2"><SourceTag source={v!.track.source} compact /></div>
                  </div>
                </div>
                <details className="mt-3 text-[13px] text-muted">
                  <summary className="cursor-pointer font-semibold text-ink">How this valuation is computed</summary>
                  <p className="mt-1 font-mono text-[12px]">{v!.formula}</p>
                  <p className="mt-1">Calculated 100% deterministically by code from verified skills. The AI never guesses rates.</p>
                </details>
              </Panel>

              {/* Skills with strict CV quotes */}
              <Panel className="p-4 sm:p-5">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <h3 className="display text-[17px] font-bold">Skills We Could Ground in Source</h3>
                  <span className="text-[12px] text-muted">Engine: {result.engine}</span>
                </div>
                <ul className="flex flex-wrap gap-2">
                  {result.skills.map((s) => {
                    const V = VERDICT[s.verdict];
                    return (
                      <li
                        key={s.name + s.origin}
                        title={`${V.label}${s.origin === "github" ? " (GitHub)" : ""}: “${s.evidence}”`}
                        className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[13px] font-semibold ${V.cls}`}
                      >
                        <V.icon size={13} aria-hidden /> {s.name}
                        {s.origin === "github" && <Github size={12} aria-label="from GitHub" />}
                      </li>
                    );
                  })}
                </ul>
                <p className="mt-2 text-[12px] text-muted">
                  Hover any skill tag to view the exact verbatim line quoted from your CV. Skills not found in your document are struck out.
                </p>
              </Panel>

              {/* AI Exposure & 7-Day Roadmap */}
              <div className="grid gap-4 sm:grid-cols-2">
                <Panel className="p-4">
                  <div className="flex items-center justify-between">
                    <h3 className="display text-[16px] font-bold">AI Obsolescence Risk</h3>
                    <ShieldAlert size={16} className="text-muted" />
                  </div>
                  <p className="display num text-[34px] font-extrabold mt-1" style={{ color: v!.aiRisk > 50 ? "var(--color-leak)" : v!.aiRisk > 30 ? "#a8741a" : "var(--color-kept)" }}>
                    {v!.aiRisk}%
                  </p>
                  <p className="text-[12px] text-muted mt-1 leading-snug">
                    Share of entry-level tasks in {v!.track.name} already automated by AI tools. Adding premium skills (MCP, testing, system design) lowers vulnerability.
                  </p>
                </Panel>

                <Panel className="p-4">
                  <div className="flex items-center justify-between">
                    <h3 className="display text-[16px] font-bold">7-Day Upskill Roadmap</h3>
                    <Calendar size={16} className="text-kept" />
                  </div>
                  <ul className="mt-2 space-y-1.5 text-[13px]">
                    {v!.actions.length ? (
                      v!.actions.map((a, i) => (
                        <li key={a} className="flex items-start gap-2">
                          <span className="font-bold text-kept shrink-0">Day {i * 2 + 1}:</span>
                          <span className="text-ink">{a}</span>
                        </li>
                      ))
                    ) : (
                      <li className="text-kept font-semibold">Every premium skill for this track already demonstrated! Ready to double your rate.</li>
                    )}
                  </ul>
                </Panel>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
