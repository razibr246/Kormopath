"use client";
import { useMemo, useState } from "react";
import { ClipboardCopy, MessageSquarePlus, Phone, Printer, ShieldAlert, Trash2 } from "lucide-react";
import { BD_DISTRICTS } from "@/lib/legal/districts";
import { getProblemCategory } from "@/lib/legal/taxonomy";
import { classifySeverity } from "@/lib/legal/severity";
import { HELPLINES } from "@/lib/legal/data";
import { CASE_FILE_STATUS_LABELS, appendEvent, applicationText, setStatus, type CaseFile, type CaseFileStatus } from "@/lib/legal/caseFile";
import { bdStamp, severityAdvice } from "@/lib/legal/citizen";

type Lang = "bn" | "en";
const bnNum = (s: string) => s.replace(/\d/g, (d) => "০১২৩৪৫৬৭৮৯"[Number(d)]);

const STATUS_TONE: Record<CaseFileStatus, string> = {
  draft: "bg-slate-100 text-slate-800",
  ready: "bg-indigo-50 text-indigo-900",
  contacted_helpline: "bg-amber-50 text-amber-900",
  visited_office: "bg-amber-50 text-amber-900",
  got_help: "bg-emerald-50 text-emerald-900",
  closed: "bg-slate-100 text-slate-700",
};
const NEXT_STATUSES: CaseFileStatus[] = ["ready", "contacted_helpline", "visited_office", "got_help", "closed"];
const ADVICE_TONE = { danger: "border-red-500 bg-red-50 text-red-950", urgent: "border-amber-400 bg-amber-50 text-amber-950", soon: "border-indigo-300 bg-indigo-50 text-indigo-950", normal: "border-slate-200 bg-slate-50 text-slate-800" } as const;

/**
 * One saved draft as a diary (ported from the Digital Legal Aid System's case tracker, without the office's database):
 * every step is reported by the person themselves and the timeline only grows.
 */
export function CaseTimeline({ file, lang, onChange, onDelete }: { file: CaseFile; lang: Lang; onChange: (next: CaseFile) => void; onDelete: () => void }) {
  const bn = lang === "bn";
  const T = (b: string, e: string) => (bn ? b : e);
  const [note, setNote] = useState("");
  const [open, setOpen] = useState(false);
  const [msg, setMsg] = useState("");
  const cat = getProblemCategory(file.categoryId);
  const district = BD_DISTRICTS.find((d) => d.en === file.districtId);
  const severity = useMemo(() => classifySeverity(file.problem, { categoryId: file.categoryId, subcategoryId: file.subcategoryId }), [file.problem, file.categoryId, file.subcategoryId]);
  const advice = severityAdvice(severity.severity);
  const now = () => new Date().toISOString();
  const text = applicationText(file);

  const addNote = () => {
    const t = note.normalize("NFC").trim();
    if (!t) return;
    onChange(appendEvent(file, { at: now(), kind: "note", text: t }));
    setNote("");
  };
  const copy = async () => {
    try { await navigator.clipboard.writeText(text); setMsg(T("কপি হয়েছে", "Copied")); } catch { setMsg(T("কপি করা যায়নি", "Could not copy")); }
    window.setTimeout(() => setMsg(""), 2500);
  };
  const remove = () => { if (window.confirm(T("এই খসড়া ও তার পুরো সময়রেখা মুছে ফেলবেন? ফেরত আনা যাবে না।", "Delete this draft and its whole timeline? This cannot be undone."))) onDelete(); };

  return (
    <article className="lg-card lg-card-hover space-y-4" data-testid="track-case" data-status={file.status}>
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="kp-eyebrow">{bn ? bnNum(bdStamp(file.createdAt).slice(0, 10)) : bdStamp(file.createdAt).slice(0, 10)} · {bn ? district?.bn ?? "—" : district?.en ?? "—"}</p>
          <h3 className="mt-1 text-[18px] font-bold leading-snug text-slate-900">{cat ? (bn ? cat.bn : cat.en) : "—"}</h3>
          <p className="mt-1 line-clamp-2 max-w-[62ch] text-[14.5px] leading-relaxed text-slate-600">{file.problem}</p>
        </div>
        <span className={`shrink-0 rounded-full px-3 py-1 text-[13.5px] font-semibold leading-[1.4] ${STATUS_TONE[file.status]}`}>{bn ? CASE_FILE_STATUS_LABELS[file.status].bn : CASE_FILE_STATUS_LABELS[file.status].en}</span>
      </header>

      {severity.severity !== "standard" && (
        <div data-tone={advice.tone} className={`flex gap-3 rounded-xl border-2 p-3 ${ADVICE_TONE[advice.tone]}`}>
          <ShieldAlert size={20} className="mt-0.5 shrink-0" aria-hidden />
          <div className="space-y-2">
            <p className="text-[15px] font-semibold leading-snug">{bn ? advice.bn : advice.en}</p>
            <div className="flex flex-wrap gap-2">
              {advice.call.map((id) => HELPLINES.find((h) => h.id === id)).filter(Boolean).map((h) => (
                <a key={h!.id} href={`tel:${h!.number}`} className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl bg-white/80 px-3 text-[14px] font-bold"><Phone size={15} aria-hidden /> {h!.number}</a>
              ))}
            </div>
          </div>
        </div>
      )}

      <div>
        <p className="text-[14px] font-semibold text-slate-800">{T("এখন কোথায় আছেন? (নিজে চিহ্ন দিন)", "Where are you now? (mark it yourself)")}</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {NEXT_STATUSES.map((s) => (
            <button key={s} type="button" aria-pressed={file.status === s} disabled={file.status === s} onClick={() => onChange(setStatus(file, s, now()))}
              className={`kp-chip !h-10 !text-[13.5px] font-semibold ${file.status === s ? "kp-chip-on" : ""}`}>{bn ? CASE_FILE_STATUS_LABELS[s].bn : CASE_FILE_STATUS_LABELS[s].en}</button>
          ))}
        </div>
      </div>

      <div className="flex gap-2">
        <label htmlFor={`lg-note-${file.id}`} className="sr-only">{T("নোট", "Note")}</label>
        <input id={`lg-note-${file.id}`} value={note} maxLength={500} onChange={(e) => setNote(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addNote(); } }}
          placeholder={T("নোট: শুনানির তারিখ, অফিসে কার সঙ্গে কথা হলো…", "Note: hearing date, who you spoke to at the office…")} className="min-w-0 flex-1 rounded-xl border border-slate-300 px-3 py-2.5 text-[15px]" />
        <button type="button" onClick={addNote} disabled={!note.trim()} className="kp-btn-ghost inline-flex min-h-[44px] items-center gap-1.5 px-3 text-[14px] disabled:opacity-50"><MessageSquarePlus size={16} aria-hidden /> {T("যোগ", "Add")}</button>
      </div>

      <ol className="relative space-y-3 border-l-2 border-indigo-100 pl-4" aria-label={T("সময়রেখা", "Timeline")}>
        {[...file.timeline].reverse().slice(0, open ? 200 : 4).map((e, i) => (
          <li key={`${e.at}-${i}`} className="relative">
            <span className={`absolute -left-[23px] top-1.5 h-3 w-3 rounded-full border-2 border-white ${e.kind === "status" ? "bg-indigo-700" : e.kind === "note" ? "bg-amber-500" : "bg-slate-400"}`} aria-hidden />
            <p className="font-mono text-[12.5px] text-slate-500">{bn ? bnNum(bdStamp(e.at)) : bdStamp(e.at)}</p>
            <p className="text-[14.5px] leading-relaxed text-slate-800">{e.text}</p>
          </li>
        ))}
      </ol>
      {file.timeline.length > 4 && <button type="button" onClick={() => setOpen(!open)} className="text-[14px] font-semibold text-indigo-800 underline">{open ? T("কম দেখান", "Show less") : T("পুরো সময়রেখা", "Full timeline")}</button>}

      <div className="flex flex-wrap gap-2 border-t border-slate-200 pt-3">
        <button type="button" onClick={copy} className="kp-btn-ghost inline-flex min-h-[44px] items-center gap-1.5 px-3 text-[14px]"><ClipboardCopy size={16} aria-hidden /> {T("খসড়া কপি", "Copy draft")}</button>
        <button type="button" onClick={() => { const w = window.open("", "_blank"); if (w) { w.document.title = "legal-aid-draft"; const pre = w.document.createElement("pre"); pre.style.cssText = "white-space:pre-wrap;font:16px/1.7 sans-serif;padding:24px"; pre.textContent = text; w.document.body.appendChild(pre); w.print(); } }} className="kp-btn-ghost inline-flex min-h-[44px] items-center gap-1.5 px-3 text-[14px]"><Printer size={16} aria-hidden /> {T("প্রিন্ট", "Print")}</button>
        <button type="button" onClick={remove} className="kp-btn-ghost inline-flex min-h-[44px] items-center gap-1.5 px-3 text-[14px] text-red-700"><Trash2 size={16} aria-hidden /> {T("মুছুন", "Delete")}</button>
      </div>
      {msg && <p role="status" className="text-[14px] font-semibold text-emerald-800">{msg}</p>}
    </article>
  );
}
