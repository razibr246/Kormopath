"use client";
import { ReactNode, ButtonHTMLAttributes } from "react";
import type { Source } from "@/lib/data";
import { ExternalLink } from "lucide-react";

export function Panel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-xl border border-line bg-card ${className}`}>{children}</section>;
}

export function Btn({ variant = "primary", className = "", ...p }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "ghost" | "quiet" }) {
  const v =
    variant === "primary"
      ? "bg-kept text-white hover:bg-[#08583f] disabled:bg-muted/40"
      : variant === "ghost"
        ? "border border-ink/20 bg-white text-ink hover:border-ink/50 disabled:opacity-50"
        : "text-kept underline underline-offset-4 hover:text-ink disabled:opacity-50";
  const pad = variant === "quiet" ? "px-1 py-1" : "px-4 py-2.5";
  return <button {...p} className={`inline-flex items-center justify-center gap-2 rounded-lg text-[15px] font-semibold transition-colors disabled:cursor-not-allowed ${pad} ${v} ${className}`} />;
}

const CONF: Record<Source["confidence"], string> = {
  official: "bg-kept-soft text-kept",
  reported: "bg-[#e3ebf6] text-[#294a7a]",
  indicative: "bg-haldi-soft text-[#7a5410]",
  estimate: "bg-[#eceaf3] text-[#4b4370]",
};

export function SourceTag({ source, compact = false }: { source: Source; compact?: boolean }) {
  const inner = (
    <>
      <span className={`rounded px-1.5 py-0.5 text-[11px] font-semibold ${CONF[source.confidence]}`}>{source.confidence}</span>
      {!compact && <span className="text-muted">{source.label}</span>}
      {source.url && <ExternalLink size={12} className="shrink-0 text-muted" aria-hidden />}
    </>
  );
  return source.url ? (
    <a href={source.url} target="_blank" rel="noreferrer" title={`${source.label} (checked ${source.checked})`} className="inline-flex items-center gap-1.5 text-[12px] hover:underline">
      {inner}
    </a>
  ) : (
    <span title={`${source.label} (checked ${source.checked})`} className="inline-flex items-center gap-1.5 text-[12px]">{inner}</span>
  );
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[14px] font-semibold">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[12px] text-muted">{hint}</span>}
    </label>
  );
}

export const inputCls = "w-full rounded-lg border border-line bg-white px-3 py-2 text-[15px] outline-none focus:border-kept";
