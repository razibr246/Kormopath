"use client";
import { useState } from "react";
import { Check, FileText, Plus } from "lucide-react";
import { documentSuggestions } from "@/lib/legal/citizen";

type Lang = "bn" | "en";

/**
 * Papers to bring if you have them. Only the names are kept (never the files), as in the Digital Legal Aid System's
 * documents page; the legal aid office says what it actually needs.
 */
export function DocumentChecklist({ lang, categoryId, value, onChange }: { lang: Lang; categoryId: string | null; value: string[]; onChange: (next: string[]) => void }) {
  const bn = lang === "bn";
  const T = (b: string, e: string) => (bn ? b : e);
  const [own, setOwn] = useState("");
  const suggested = documentSuggestions(categoryId);
  const extras = value.filter((v) => !suggested.some((s) => s.bn === v));
  const toggle = (name: string) => onChange(value.includes(name) ? value.filter((v) => v !== name) : [...value, name].slice(0, 30));
  const addOwn = () => {
    const name = own.normalize("NFC").trim().slice(0, 80);
    if (name && !value.includes(name)) onChange([...value, name].slice(0, 30));
    setOwn("");
  };

  return (
    <div className="space-y-3" data-testid="legal-documents">
      <p className="text-[14.5px] leading-relaxed text-slate-600">
        {T("যা আপনার কাছে আছে তাতে টিক দিন। ফাইল আপলোড হয় না — শুধু তালিকা থাকে, যাতে অফিসে যাওয়ার সময় মনে থাকে। কোন কাগজ লাগবে তা অফিস বলে দেবে।",
          "Tick what you have. No files are uploaded — only the list, so you remember to bring them. The office will tell you what it needs.")}
      </p>
      <ul className="grid gap-2 sm:grid-cols-2">
        {[...suggested.map((s) => ({ key: s.bn, label: bn ? s.bn : s.en })), ...extras.map((e) => ({ key: e, label: e }))].map((d) => {
          const on = value.includes(d.key);
          return (
            <li key={d.key}>
              <button type="button" aria-pressed={on} onClick={() => toggle(d.key)}
                className={`flex min-h-[52px] w-full items-center gap-3 rounded-xl border px-3 py-2 text-left text-[15px] leading-snug transition-colors ${on ? "border-emerald-600 bg-emerald-50 font-semibold text-emerald-950" : "border-slate-200 bg-white text-slate-800 hover:border-emerald-300"}`}>
                <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-md border ${on ? "border-emerald-700 bg-emerald-700 text-white" : "border-slate-300 bg-white"}`} aria-hidden>{on ? <Check size={16} /> : <FileText size={14} className="text-slate-400" />}</span>
                <span>{d.label}</span>
              </button>
            </li>
          );
        })}
      </ul>
      <div className="flex gap-2">
        <label htmlFor="lg-doc-own" className="sr-only">{T("অন্য কাগজের নাম", "Another paper")}</label>
        <input id="lg-doc-own" value={own} maxLength={80} onChange={(e) => setOwn(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addOwn(); } }}
          placeholder={T("অন্য কাগজ, যেমন: সাক্ষীর নাম ও ফোন", "Another paper, e.g. witness name and phone")} className="min-w-0 flex-1 rounded-xl border border-slate-300 px-3 py-2.5 text-[15px]" />
        <button type="button" onClick={addOwn} disabled={!own.trim()} className="kp-btn-ghost inline-flex min-h-[44px] items-center gap-1.5 px-3 text-[14px] disabled:opacity-50"><Plus size={16} aria-hidden /> {T("যোগ", "Add")}</button>
      </div>
    </div>
  );
}
