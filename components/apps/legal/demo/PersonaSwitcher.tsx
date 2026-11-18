"use client";
import { Briefcase, Gavel, Handshake, LayoutDashboard, User } from "lucide-react";
import { DESK_ROLES, type DeskRole } from "@/lib/legal/demoData";
import type { Lang } from "./shared";

const ICONS: Record<DeskRole, typeof User> = { citizen: User, dlao: LayoutDashboard, lawyer: Briefcase, chief: Gavel, mediator: Handshake };

/** Pick whose desk to look at. No login: every role is open, because nothing here is real. */
export function PersonaSwitcher({ role, onChange, lang }: { role: DeskRole; onChange: (r: DeskRole) => void; lang: Lang }) {
  return (
    <div role="radiogroup" aria-label={lang === "bn" ? "কার ডেস্ক দেখবেন" : "Whose desk to view"} data-testid="persona-switch" className="grid gap-2 sm:grid-cols-5">
      {DESK_ROLES.map((r) => {
        const Icon = ICONS[r.id];
        const on = r.id === role;
        return (
          <button key={r.id} type="button" role="radio" aria-checked={on} data-role={r.id} onClick={() => onChange(r.id)}
            className={`flex min-h-[64px] flex-col items-start gap-1 rounded-2xl border p-3 text-left transition-[transform,box-shadow,border-color] duration-200 hover:-translate-y-0.5 motion-reduce:transform-none ${on ? "border-indigo-700 bg-indigo-50 shadow-sm" : "border-slate-200 bg-white hover:border-indigo-300"}`}>
            <span className={`inline-flex items-center gap-1.5 text-[15px] font-bold leading-[1.4] ${on ? "text-indigo-900" : "text-slate-900"}`}><Icon size={17} aria-hidden /> {lang === "bn" ? r.bn : r.en}</span>
            <span className="text-[12.5px] leading-snug text-slate-600">{lang === "bn" ? r.whatBn : r.whatEn}</span>
          </button>
        );
      })}
    </div>
  );
}
