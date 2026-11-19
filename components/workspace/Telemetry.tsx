"use client";
import { useState, useEffect } from "react";
import type { TraceStep } from "@/lib/trace";
import { X, Braces, Activity, ShieldCheck, Terminal, Download, Scale, Check, AlertCircle } from "lucide-react";

export interface Inspectable {
  label: string;
  validated: unknown;
  raw: string | null;
}

export interface GroundingDiffData {
  sourceText: string;
  skills: {
    name: string;
    level: string;
    evidence: string;
    verdict: "verified" | "partial" | "unverified";
    score: number;
    origin?: string;
  }[];
  candidateName?: string | null;
}

const DOT: Record<TraceStep["status"], string> = {
  ok: "bg-emerald-400 shadow-xs shadow-emerald-400/50",
  warn: "bg-amber-400 shadow-xs shadow-amber-400/50",
  fallback: "bg-violet-400 shadow-xs shadow-violet-400/50",
  fail: "bg-rose-400 shadow-xs shadow-rose-400/50",
};

function getToolBadgeStyle(tool: string, status: TraceStep["status"]) {
  if (tool.startsWith("gemini") || tool.includes("vision")) {
    return "text-cyan-400 bg-cyan-950/70 border-cyan-800/80";
  }
  if (status === "fallback") {
    return "text-violet-300 bg-violet-950/70 border-violet-800/80";
  }
  if (status === "warn") {
    return "text-amber-300 bg-amber-950/70 border-amber-800/80";
  }
  if (status === "fail") {
    return "text-rose-300 bg-rose-950/70 border-rose-800/80";
  }
  if (tool === "zod" || status === "ok") {
    return "text-emerald-400 bg-emerald-950/70 border-emerald-800/80";
  }
  return "text-slate-300 bg-slate-800/80 border-slate-700/80";
}

function Stats({ steps }: { steps: TraceStep[] }) {
  const model = steps.filter((s) => s.tool.startsWith("gemini") || s.tool.includes("vision")).length;
  const rejected = steps.filter((s) => s.tool === "evidence-check" && s.status === "warn").length;
  const fallbacks = steps.filter((s) => s.status === "fallback").length;
  const tools = steps.filter((s) => !s.tool.startsWith("gemini") && s.tool !== "zod").length;
  const items = [
    { label: "Model Calls", val: model, color: "text-cyan-400" },
    { label: "Code / Math Steps", val: tools, color: "text-emerald-400" },
    { label: "Evidence Checks", val: rejected, color: "text-amber-400" },
    { label: "Deterministic Fallbacks", val: fallbacks, color: "text-violet-400" },
  ] as const;
  return (
    <dl className="grid grid-cols-2 gap-1.5 overflow-hidden rounded-xl border border-[#3a2b1f] bg-[#1b130e] p-1.5 text-[12px]">
      {items.map((it) => (
        <div key={it.label} className="rounded-lg bg-[#21170f] border border-[#3a2b1f]/70 px-2.5 py-1.5">
          <dt className="text-slate-400 text-[11px] leading-tight truncate">{it.label}</dt>
          <dd className={`num font-mono text-[17px] font-bold ${it.color} mt-0.5`}>{it.val}</dd>
        </div>
      ))}
    </dl>
  );
}

function Log({ steps }: { steps: TraceStep[] }) {
  if (!steps.length)
    return (
      <div className="rounded-xl border border-dashed border-[#3a2b1f] bg-[#1b130e]/80 p-4 text-[13px] text-slate-400 space-y-2">
        <p className="font-semibold text-slate-200">Ready for Telemetry</p>
        <p>Pick one of the 3 Judge Presets or run any agent. Every model call, check and fallback is logged here with its measured time:</p>
        <div className="flex flex-wrap gap-1 text-[11px] font-mono text-slate-400">
          <span className="rounded bg-[#21170f] px-1.5 py-0.5 border border-cyan-800/60 text-cyan-400">[Gemini call]</span>
          <span className="rounded bg-[#21170f] px-1.5 py-0.5 border border-emerald-800/60 text-emerald-400">[Zod schema check]</span>
          <span className="rounded bg-[#21170f] px-1.5 py-0.5 border border-amber-800/60 text-amber-400">[Repair retry]</span>
          <span className="rounded bg-[#21170f] px-1.5 py-0.5 border border-slate-700 text-slate-300">[Evidence grounding]</span>
          <span className="rounded bg-[#21170f] px-1.5 py-0.5 border border-violet-800/60 text-violet-400">[Rule-based fallback]</span>
          <span className="rounded bg-[#21170f] px-1.5 py-0.5 border border-emerald-800/60 text-emerald-400">[Deterministic FinOps]</span>
        </div>
      </div>
    );
  return (
    <ol className="space-y-1.5" aria-live="polite">
      {[...steps].reverse().map((s, i) => (
        <li key={steps.length - i} className="rounded-xl border border-[#3a2b1f] bg-[#21170f] px-3 py-2 text-[13px] leading-snug shadow-xs hover:border-slate-700 transition-all">
          <div className="flex items-center gap-2">
            <span className={`h-2 w-2 shrink-0 rounded-full ${DOT[s.status]}`} title={s.status} />
            <span className="font-bold text-[13px] text-white">{s.agent}</span>
            <span className={`truncate rounded-md px-1.5 py-0.5 font-mono text-[11px] font-semibold border ${getToolBadgeStyle(s.tool, s.status)}`}>
              {s.tool}
            </span>
            <span className="num ml-auto shrink-0 font-mono text-[11px] font-medium text-slate-400">
              {s.ms} ms
            </span>
          </div>
          <p className="mt-1 pl-4 text-slate-300 text-[12px] font-mono leading-tight">{s.detail}</p>
        </li>
      ))}
    </ol>
  );
}

export function Telemetry({
  steps,
  inspect,
  live,
  groundingDiff,
}: {
  steps: TraceStep[];
  inspect: Inspectable[];
  live: string;
  groundingDiff?: GroundingDiffData;
}) {
  const [open, setOpen] = useState(false);
  const [diffOpen, setDiffOpen] = useState(false);
  const [sheet, setSheet] = useState(false);

  // Close modals or mobile telemetry sheet on Escape key
  useEffect(() => {
    if (!open && !diffOpen && !sheet) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        if (diffOpen) setDiffOpen(false);
        if (open) setOpen(false);
        if (sheet) setSheet(false);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, diffOpen, sheet]);

  const exportTraceJson = () => {
    const exportData = {
      version: "1.0",
      exportedAt: new Date().toISOString(),
      totalSteps: steps.length,
      summary: {
        modelCalls: steps.filter((s) => s.tool.startsWith("gemini") || s.tool.includes("vision")).length,
        codeMathSteps: steps.filter((s) => !s.tool.startsWith("gemini") && s.tool !== "zod").length,
        evidenceChecks: steps.filter((s) => s.tool === "evidence-check" && s.status === "warn").length,
        fallbacks: steps.filter((s) => s.status === "fallback").length,
      },
      steps: steps.map((s, index) => ({
        id: index + 1,
        agent: s.agent,
        tool: s.tool,
        detail: s.detail,
        ms: s.ms,
        status: s.status,
        timestamp: s.at ?? Date.now(),
      })),
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `kormopath-telemetry-trace-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const body = (
    <div className="kp-dark flex h-full flex-col gap-2.5 rounded-2xl border border-[#3a2b1f] bg-[#170f0a] p-3 text-slate-200 shadow-2xl">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#3a2b1f] pb-2.5">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5" aria-hidden="true">
            <span className="h-2.5 w-2.5 rounded-full bg-rose-500/80 inline-block" />
            <span className="h-2.5 w-2.5 rounded-full bg-amber-500/80 inline-block" />
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500/80 inline-block" />
          </div>
          <span className="font-mono text-cyan-400 text-xs font-semibold">$ telemetry</span>
          <h2 className="display text-[15px] font-bold text-white tracking-tight">Live Telemetry &amp; Guardrails</h2>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={exportTraceJson}
            disabled={!steps.length}
            className="inline-flex items-center gap-1 rounded-md border border-[#3a2b1f] bg-[#142036] hover:bg-[#1c2e4f] px-2 py-1 text-[11px] font-bold text-slate-200 hover:text-white transition-colors disabled:opacity-30"
            title="Export all execution trace events as JSON"
          >
            <Download size={12} /> Export Trace JSON
          </button>
          <button
            onClick={() => setDiffOpen(true)}
            disabled={!groundingDiff?.skills?.length}
            className="inline-flex items-center gap-1 rounded-md border border-[#3a2b1f] bg-[#142036] hover:bg-[#1c2e4f] px-2 py-1 text-[11px] font-bold text-slate-200 hover:text-white transition-colors disabled:opacity-30"
            title="Inspect side-by-side Grounding Diff of original CV vs extracted skills"
          >
            <Scale size={12} /> Grounding Diff
          </button>
          <button
            onClick={() => setOpen(true)}
            disabled={!inspect.length}
            className="inline-flex items-center gap-1 rounded-md border border-[#3a2b1f] bg-[#142036] hover:bg-[#1c2e4f] px-2 py-1 text-[11px] font-bold text-slate-200 hover:text-white transition-colors disabled:opacity-30"
            title="Inspect raw model outputs vs validated JSON schema"
          >
            <Braces size={12} /> Inspect JSON
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between text-[12px] px-1">
        <span className="truncate text-slate-400 font-mono text-[11px]">{live}</span>
        <span className="rounded-md border border-emerald-800/80 bg-emerald-950/70 px-1.5 py-0.5 font-mono text-[10px] font-bold text-emerald-400">
          GUARDRAILS ON
        </span>
      </div>

      <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-slate-400 px-1">
        <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-400" />Verified</span>
        <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-400" />Strict check</span>
        <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-violet-400" />Deterministic fallback</span>
        <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-rose-400" />Rejected</span>
      </div>

      <Stats steps={steps} />
      <div className="min-h-0 flex-1 overflow-y-auto pr-1"><Log steps={steps} /></div>
    </div>
  );

  return (
    <>
      <aside className="hidden lg:block lg:sticky lg:top-[68px] lg:h-[calc(100vh-84px)]">{body}</aside>
      {/* Phone only: appears once an agent has run (more than the boot line), above the safe area on the right, so it
          never sits on top of the step-1 call to action on first view. */}
      {steps.length > 1 && <button
        onClick={() => setSheet(true)}
        aria-label={`Telemetry: ${steps.length} agent steps`}
        className="fixed bottom-[calc(env(safe-area-inset-bottom)+16px)] right-4 z-30 inline-flex items-center gap-2 rounded-full bg-[#170f0a] border border-[#3a2b1f] px-4 py-3 text-[14px] font-semibold text-white shadow-xl hover:border-slate-600 transition-colors lg:hidden"
      >
        <Activity size={16} /> Telemetry ({steps.length})
      </button>}
      {sheet && (
        <div className="fixed inset-0 z-40 flex flex-col bg-[#170f0a] p-4 lg:hidden" role="dialog" aria-label="Agent telemetry">
          <button onClick={() => setSheet(false)} className="mb-2 self-end rounded-lg border border-[#3a2b1f] bg-[#142036] p-2 text-slate-300 hover:text-white" aria-label="Close telemetry">
            <X size={18} />
          </button>
          {body}
        </div>
      )}

      {/* Grounding Diff Modal */}
      {diffOpen && groundingDiff && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
          role="dialog"
          aria-label="Inspect Grounding Diff"
          onClick={() => setDiffOpen(false)}
        >
          <div
            className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-[#170f0a] p-6 shadow-2xl border border-[#3a2b1f] text-slate-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between border-b border-[#3a2b1f] pb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-500/20 text-orange-400 border border-orange-500/30">
                  <Scale size={18} />
                </div>
                <div>
                  <h3 className="display text-[20px] font-bold text-white">
                    Grounding Diff Inspector {groundingDiff.candidateName ? `· ${groundingDiff.candidateName}` : ""}
                  </h3>
                  <p className="text-[12px] text-slate-400">
                    Deterministic verification: Every skill must literally quote the source text word-for-word.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setDiffOpen(false)}
                aria-label="Close"
                className="rounded-lg border border-[#3a2b1f] bg-[#24170f] p-1.5 text-slate-400 hover:text-white hover:bg-[#2d1e14]"
              >
                <X size={16} />
              </button>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {/* Left Column: Source Document */}
              <div className="flex flex-col rounded-xl border border-[#3a2b1f] bg-[#1b130e] p-4">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-[12px] font-bold uppercase tracking-wider text-slate-400">
                    Source Text (CV / Profile / OCR)
                  </span>
                  <span className="font-mono text-[11px] text-cyan-400">
                    {groundingDiff.sourceText.length} chars
                  </span>
                </div>
                <div className="max-h-[500px] overflow-y-auto rounded-lg border border-[#3a2b1f] bg-[#120c08] p-3 font-mono text-[12px] leading-relaxed text-slate-300 whitespace-pre-wrap select-text">
                  {groundingDiff.sourceText || "No source text available."}
                </div>
              </div>

              {/* Right Column: Grounded Skills & Evidence */}
              <div className="flex flex-col rounded-xl border border-[#3a2b1f] bg-[#1b130e] p-4">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-[12px] font-bold uppercase tracking-wider text-emerald-400">
                    Extracted Skills &amp; Quoted Evidence ({groundingDiff.skills.length})
                  </span>
                  <span className="text-[11px] text-slate-400">Strict NFC Normalization</span>
                </div>

                <div className="max-h-[500px] space-y-2.5 overflow-y-auto pr-1">
                  {groundingDiff.skills.map((s, idx) => {
                    const isVerified = s.verdict === "verified";
                    const isPartial = s.verdict === "partial";
                    return (
                      <div
                        key={idx}
                        className={`rounded-xl border p-3 bg-[#21170f] text-[13px] shadow-2xs ${
                          isVerified
                            ? "border-emerald-600/50"
                            : isPartial
                            ? "border-amber-600/50"
                            : "border-rose-600/50"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="font-bold text-white text-[14px]">{s.name}</span>
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                              isVerified
                                ? "bg-emerald-950/80 text-emerald-300 border border-emerald-800/60"
                                : isPartial
                                ? "bg-amber-950/80 text-amber-300 border border-amber-800/60"
                                : "bg-rose-950/80 text-rose-300 border border-rose-800/60"
                            }`}
                          >
                            {isVerified ? (
                              <Check size={11} className="stroke-[3]" />
                            ) : (
                              <AlertCircle size={11} />
                            )}
                            {s.verdict} ({Math.round(s.score * 100)}%)
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400 mb-1.5">
                          <span>Level: <strong className="text-slate-200">{s.level}</strong></span>
                          {s.origin && <span className="ml-2 font-mono text-cyan-400">[{s.origin}]</span>}
                        </div>
                        <div className="rounded border border-[#3a2b1f] bg-[#080e1a] p-2 font-mono text-[11px] text-slate-300 leading-tight">
                          <span className="font-semibold text-slate-400">Quoted Evidence:</span>
                          <p className="mt-0.5 italic text-slate-200">
                            {s.evidence ? `“${s.evidence}”` : "(No verbatim evidence provided)"}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between border-t border-[#3a2b1f] pt-3 text-[12px] text-slate-400">
              <span>Grounding status derived via <code>lib/grounding.ts::verifyEvidence</code></span>
              <button
                onClick={() => setDiffOpen(false)}
                className="rounded-lg bg-orange-600 hover:bg-orange-500 px-4 py-1.5 text-[13px] font-bold text-white transition-colors"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Raw JSON Schema Modal */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
          role="dialog"
          aria-label="Inspect Raw JSON Schema"
          onClick={() => setOpen(false)}
        >
          <div
            className="max-h-[85vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-[#170f0a] p-5 shadow-2xl border border-[#3a2b1f] text-slate-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between border-b border-[#3a2b1f] pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck size={20} className="text-emerald-400" />
                <h3 className="display text-[20px] font-bold text-white">Inspect Raw Model vs Validated JSON Schema</h3>
              </div>
              <button onClick={() => setOpen(false)} aria-label="Close" className="rounded-lg border border-[#3a2b1f] bg-[#24170f] p-1.5 text-slate-400 hover:text-white hover:bg-[#2d1e14]">
                <X size={16} />
              </button>
            </div>
            <p className="mb-4 text-[13px] text-slate-400">
              Raw model response is displayed side-by-side with the strictly parsed, grounded Zod schema object. The app only renders validated data — untrusted strings are stripped.
            </p>
            {inspect.map((x) => (
              <details key={x.label} className="mb-3 rounded-xl border border-[#3a2b1f] overflow-hidden" open>
                <summary className="cursor-pointer bg-[#21170f] px-3.5 py-2.5 font-bold text-[14px] text-slate-200 border-b border-[#3a2b1f] hover:bg-[#2a1d13]">{x.label}</summary>
                <div className="grid gap-3 p-3 md:grid-cols-2 bg-[#1b130e]">
                  <div>
                    <p className="mb-1 text-[11px] font-bold uppercase text-slate-400 font-mono">Raw Model Generation</p>
                    <pre className="max-h-72 overflow-auto rounded-lg bg-[#120c08] p-2.5 font-mono text-[11px] leading-tight text-cyan-300 border border-[#3a2b1f]">
                      {x.raw ?? "No LLM guessing (deterministic code/rules engine)."}
                    </pre>
                  </div>
                  <div>
                    <p className="mb-1 text-[11px] font-bold uppercase text-emerald-400 font-mono">Validated &amp; Grounded Schema (Zod)</p>
                    <pre className="max-h-72 overflow-auto rounded-lg bg-[#120c08] p-2.5 font-mono text-[11px] leading-tight text-emerald-300 border border-[#3a2b1f]">
                      {JSON.stringify(x.validated, null, 2)}
                    </pre>
                  </div>
                </div>
              </details>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
