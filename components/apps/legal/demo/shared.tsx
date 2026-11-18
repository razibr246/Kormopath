"use client";
import type { SeverityLevel } from "@/lib/legal/severity";
import type { SlaLevel } from "@/lib/legal/caseDomain";

export type Lang = "bn" | "en";
export const bnNum = (v: number | string) => String(v).replace(/\d/g, (d) => "০১২৩৪৫৬৭৮৯"[Number(d)]);
export const num = (v: number | string, lang: Lang) => (lang === "bn" ? bnNum(v) : String(v));

const SEV_STYLE: Record<SeverityLevel, string> = {
  emergency: "border-red-300 bg-red-50 text-red-900",
  high: "border-orange-300 bg-orange-50 text-orange-900",
  priority: "border-amber-300 bg-amber-50 text-amber-900",
  standard: "border-slate-300 bg-slate-50 text-slate-700",
};
const TIME_STYLE: Record<SlaLevel, string> = {
  breach: "border-red-300 bg-red-50 text-red-900",
  near: "border-amber-300 bg-amber-50 text-amber-900",
  ok: "border-emerald-300 bg-emerald-50 text-emerald-900",
};

export function Pill({ tone, children, testid }: { tone: string; children: React.ReactNode; testid?: string }) {
  return <span data-testid={testid} className={`inline-flex min-h-[26px] items-center rounded-full border px-2.5 text-[12.5px] font-semibold leading-[1.4] ${tone}`}>{children}</span>;
}
export const SeverityPill = ({ level, label }: { level: SeverityLevel; label: string }) => <Pill tone={SEV_STYLE[level]}>{label}</Pill>;
export const TimePill = ({ level, label }: { level: SlaLevel; label: string }) => <Pill tone={TIME_STYLE[level]}>{label}</Pill>;
