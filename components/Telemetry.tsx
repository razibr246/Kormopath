"use client";
import { useState } from "react";
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
  ok: "bg-kept",
  warn: "bg-haldi",
  fallback: "bg-[#6b5fb5]",
  fail: "bg-leak",
};

function Stats({ steps }: { steps: TraceStep[] }) {
  const model = steps.filter((s) => s.tool.startsWith("gemini") || s.tool.includes("vision")).length;
  const rejected = steps.filter((s) => s.tool === "evidence-check" && s.status === "warn").length;
  const fallbacks = steps.filter((s) => s.status === "fallback").length;
  const tools = steps.filter((s) => !s.tool.startsWith("gemini") && s.tool !== "zod").length;
  const items = [
    ["Model Calls", model],
    ["Code / Math Steps", tools],
    ["Evidence Checks", rejected],
    ["Deterministic Fallbacks", fallbacks],
  ] as const;
  return (
    <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-line bg-line text-[12px]">
      {items.map(([k, v]) => (
        <div key={k} className="bg-white px-2.5 py-1.5">
          <dt className="text-muted leading-tight">{k}</dt>
          <dd className="num text-[17px] font-bold text-ink">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

function Log({ steps }: { steps: TraceStep[] }) {
  if (!steps.length)
    return (
      <div className="rounded-xl border border-dashed border-line bg-white/70 p-4 text-[13px] text-muted space-y-2">
        <p className="font-semibold text-ink">Ready for Telemetry</p>
        <p>Pick one of the 3 Judge Presets or run any agent. Every model call, check and fallback is logged here with its measured time:</p>
        <div className="flex flex-wrap gap-1 text-[11px] font-mono text-muted">
          <span className="rounded bg-paper px-1.5 py-0.5 border border-line">[Gemini call]</span>
          <span className="rounded bg-paper px-1.5 py-0.5 border border-line">[Zod schema check]</span>
          <span className="rounded bg-paper px-1.5 py-0.5 border border-line">[Repair retry]</span>
          <span className="rounded bg-paper px-1.5 py-0.5 border border-line">[Evidence grounding]</span>
          <span className="rounded bg-paper px-1.5 py-0.5 border border-line">[Rule-based fallback]</span>
          <span className="rounded bg-paper px-1.5 py-0.5 border border-line">[Deterministic FinOps]</span>
        </div>
      </div>
    );
  return (
    <ol className="space-y-1.5" aria-live="polite">
      {[...steps].reverse().map((s, i) => (
        <li key={steps.length - i} className="rounded-lg border border-line bg-white px-2.5 py-2 text-[13px] leading-snug shadow-xs">
          <div className="flex items-center gap-2">
            <span className={`h-2 w-2 shrink-0 rounded-full ${DOT[s.status]}`} title={s.status} />
            <span className="font-bold text-[13px] text-ink">{s.agent}</span>
            <span className="truncate rounded bg-paper px-1.5 py-0.5 font-mono text-[11px] text-muted border border-line/60">
              {s.tool}
            </span>
            <span className="num ml-auto shrink-0 font-mono text-[11px] font-semibold text-muted">
              {s.ms} ms
            </span>
          </div>
          <p className="mt-1 pl-4 text-ink/80 text-[12px] font-mono leading-tight">{s.detail}</p>
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
    <div className="flex h-full flex-col gap-2.5">
      <div className="flex items-center justify-between gap-2 border-b border-line pb-2">
        <div className="flex items-center gap-1.5">
          <Terminal size={16} className="text-kept" />
          <h2 className="display text-[16px] font-bold text-ink">Live Telemetry &amp; Guardrails</h2>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={exportTraceJson}
            disabled={!steps.length}
            className="inline-flex items-center gap-1 rounded-md border border-line bg-white px-2 py-1 text-[11px] font-bold hover:border-kept transition-colors disabled:opacity-40"
            title="Export all execution trace events as JSON"
          >
            <Download size={12} /> Export Trace JSON
          </button>
          <button
            onClick={() => setDiffOpen(true)}
            disabled={!groundingDiff?.skills?.length}
            className="inline-flex items-center gap-1 rounded-md border border-line bg-white px-2 py-1 text-[11px] font-bold hover:border-kept transition-colors disabled:opacity-40"
            title="Inspect side-by-side Grounding Diff of original CV vs extracted skills"
          >
            <Scale size={12} /> Grounding Diff
          </button>
          <button
            onClick={() => setOpen(true)}
            disabled={!inspect.length}
            className="inline-flex items-center gap-1 rounded-md border border-line bg-white px-2 py-1 text-[11px] font-bold hover:border-kept transition-colors disabled:opacity-40"
            title="Inspect raw model outputs vs validated JSON schema"
          >
            <Braces size={12} /> Inspect JSON
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between text-[12px]">
        <span className="truncate text-muted">{live}</span>
        <span className="rounded bg-kept-soft px-1.5 py-0.5 font-mono text-[10px] font-bold text-kept">
          GUARDRAILS ON
        </span>
      </div>

      <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted">
        <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-kept" />Verified</span>
        <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-haldi" />Strict check</span>
        <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-[#6b5fb5]" />Deterministic fallback</span>
        <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-leak" />Rejected</span>
      </div>

      <Stats steps={steps} />
      <div className="min-h-0 flex-1 overflow-y-auto pr-1"><Log steps={steps} /></div>
    </div>
  );

  return (
    <>
      <aside className="hidden lg:block lg:sticky lg:top-[68px] lg:h-[calc(100vh-84px)]">{body}</aside>
      <button
        onClick={() => setSheet(true)}
        className="fixed bottom-4 right-4 z-30 inline-flex items-center gap-2 rounded-full bg-ink px-4 py-3 text-[14px] font-semibold text-white shadow-xl lg:hidden"
      >
        <Activity size={16} /> Telemetry ({steps.length})
      </button>
      {sheet && (
        <div className="fixed inset-0 z-40 flex flex-col bg-paper p-4 lg:hidden" role="dialog" aria-label="Agent telemetry">
          <button onClick={() => setSheet(false)} className="mb-2 self-end rounded-md border border-line bg-white p-2" aria-label="Close telemetry">
            <X size={18} />
          </button>
          {body}
        </div>
      )}

      {/* Grounding Diff Modal */}
      {diffOpen && groundingDiff && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/60 p-4 backdrop-blur-xs"
          role="dialog"
          aria-label="Inspect Grounding Diff"
          onClick={() => setDiffOpen(false)}
        >
          <div
            className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl border border-line"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between border-b border-line pb-3">
              <div className="flex items-center gap-2">
                <Scale size={20} className="text-kept" />
                <div>
                  <h3 className="display text-[20px] font-bold text-ink">
                    Grounding Diff Inspector {groundingDiff.candidateName ? `· ${groundingDiff.candidateName}` : ""}
                  </h3>
                  <p className="text-[12px] text-muted">
                    Deterministic verification: Every skill must literally quote the source text word-for-word.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setDiffOpen(false)}
                aria-label="Close"
                className="rounded-md border border-line p-1.5 hover:bg-paper"
              >
                <X size={16} />
              </button>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {/* Left Column: Source Document */}
              <div className="flex flex-col rounded-xl border border-line bg-paper p-4">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-[12px] font-bold uppercase tracking-wider text-muted">
                    Source Text (CV / Profile / OCR)
                  </span>
                  <span className="font-mono text-[11px] text-muted">
                    {groundingDiff.sourceText.length} chars
                  </span>
                </div>
                <div className="max-h-[500px] overflow-y-auto rounded-lg border border-line bg-white p-3 font-mono text-[12px] leading-relaxed text-ink whitespace-pre-wrap select-text">
                  {groundingDiff.sourceText || "No source text available."}
                </div>
              </div>

              {/* Right Column: Grounded Skills & Evidence */}
              <div className="flex flex-col rounded-xl border border-line bg-paper p-4">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-[12px] font-bold uppercase tracking-wider text-kept">
                    Extracted Skills &amp; Quoted Evidence ({groundingDiff.skills.length})
                  </span>
                  <span className="text-[11px] text-muted">Strict NFC Normalization</span>
                </div>

                <div className="max-h-[500px] space-y-2.5 overflow-y-auto pr-1">
                  {groundingDiff.skills.map((s, idx) => {
                    const isVerified = s.verdict === "verified";
                    const isPartial = s.verdict === "partial";
                    return (
                      <div
                        key={idx}
                        className={`rounded-xl border p-3 bg-white text-[13px] shadow-2xs ${
                          isVerified
                            ? "border-kept/40"
                            : isPartial
                            ? "border-haldi/40"
                            : "border-leak/40"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="font-bold text-ink text-[14px]">{s.name}</span>
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                              isVerified
                                ? "bg-kept-soft text-kept-dark"
                                : isPartial
                                ? "bg-haldi-soft text-haldi"
                                : "bg-leak-soft text-leak"
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
                        <div className="text-[11px] text-muted mb-1.5">
                          <span>Level: <strong className="text-ink">{s.level}</strong></span>
                          {s.origin && <span className="ml-2 font-mono">[{s.origin}]</span>}
                        </div>
                        <div className="rounded border border-line/60 bg-paper/70 p-2 font-mono text-[11px] text-ink leading-tight">
                          <span className="font-semibold text-muted">Quoted Evidence:</span>
                          <p className="mt-0.5 italic text-ink/90">
                            {s.evidence ? `“${s.evidence}”` : "(No verbatim evidence provided)"}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between border-t border-line pt-3 text-[12px] text-muted">
              <span>Grounding status derived via <code>lib/grounding.ts::verifyEvidence</code></span>
              <button
                onClick={() => setDiffOpen(false)}
                className="rounded-lg bg-ink px-4 py-1.5 text-[13px] font-bold text-white hover:bg-ink/90"
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
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/60 p-4 backdrop-blur-xs"
          role="dialog"
          aria-label="Inspect Raw JSON Schema"
          onClick={() => setOpen(false)}
        >
          <div
            className="max-h-[85vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl border border-line"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between border-b border-line pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck size={20} className="text-kept" />
                <h3 className="display text-[20px] font-bold text-ink">Inspect Raw Model vs Validated JSON Schema</h3>
              </div>
              <button onClick={() => setOpen(false)} aria-label="Close" className="rounded-md border border-line p-1.5 hover:bg-paper">
                <X size={16} />
              </button>
            </div>
            <p className="mb-4 text-[13px] text-muted">
              Raw model response is displayed side-by-side with the strictly parsed, grounded Zod schema object. The app only renders validated data — untrusted strings are stripped.
            </p>
            {inspect.map((x) => (
              <details key={x.label} className="mb-3 rounded-xl border border-line overflow-hidden" open>
                <summary className="cursor-pointer bg-paper px-3 py-2 font-bold text-[14px] text-ink">{x.label}</summary>
                <div className="grid gap-3 p-3 md:grid-cols-2">
                  <div>
                    <p className="mb-1 text-[11px] font-bold uppercase text-muted">Raw Model Generation</p>
                    <pre className="max-h-72 overflow-auto rounded-lg bg-paper p-2 font-mono text-[11px] leading-tight text-ink border border-line">
                      {x.raw ?? "No LLM guessing (deterministic code/rules engine)."}
                    </pre>
                  </div>
                  <div>
                    <p className="mb-1 text-[11px] font-bold uppercase text-kept">Validated &amp; Grounded Schema (Zod)</p>
                    <pre className="max-h-72 overflow-auto rounded-lg bg-paper p-2 font-mono text-[11px] leading-tight text-kept-dark border border-line">
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
