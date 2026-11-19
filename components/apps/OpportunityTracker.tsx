"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { Bookmark, CalendarClock, Download, ExternalLink, Plus, Trash2, CheckSquare, Square, ChevronDown, ChevronUp, ArrowUpRight, CheckCircle2 } from "lucide-react";
import { downloadText, todayLocal } from "@/lib/clientStore";
import {
  APPLICATION_CHECKLIST_TEMPLATE,
  isFollowUpDate,
  isFollowUpDue,
  isOpportunityStatus,
  opportunitiesToCsv,
  opportunitiesToIcs,
  OPPORTUNITY_NOTE_LIMIT,
  OPPORTUNITY_STATUSES,
  OPPORTUNITY_TITLE_LIMIT,
  type OpportunityProgress,
  type OpportunityStatus,
  type SavedOpportunity,
} from "@/lib/opportunities";

const inputClass = "min-w-0 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus-visible:outline-2 focus-visible:outline-indigo-600";
const fieldClass = "w-full " + inputClass;
const primaryClass = "rounded-xl bg-indigo-700 px-3.5 py-2 text-sm font-bold text-white hover:bg-indigo-800 transition-colors";
const secondaryClass = "inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 px-3.5 py-2 text-sm font-bold text-slate-700 hover:bg-slate-100 transition-colors";
const statusClass: Record<OpportunityStatus, string> = {
  saved: "bg-slate-100 text-slate-700 border border-slate-200",
  drafting: "bg-amber-100 text-amber-900 border border-amber-200",
  applied: "bg-indigo-100 text-indigo-800 border border-indigo-200",
  interview: "bg-purple-100 text-purple-900 border border-purple-200",
  response: "bg-sky-100 text-sky-900 border border-sky-200",
  accepted: "bg-emerald-100 text-emerald-900 border border-emerald-200",
  closed: "bg-slate-100 text-slate-600 border border-slate-200",
};

function StatusOptions() {
  return Object.entries(OPPORTUNITY_STATUSES).map(([value, label]) => <option key={value} value={value}>{label}</option>);
}

type TrackerProps = {
  items: SavedOpportunity[];
  onAdd: (title: string, url: string) => string | null;
  onUpdate: (id: string, progress: OpportunityProgress) => void;
  onRemove: (id: string) => void;
};

export function OpportunityTracker({ items, onAdd, onUpdate, onRemove }: TrackerProps) {
  const [filter, setFilter] = useState("all");
  const [showAdd, setShowAdd] = useState(false);
  const [addError, setAddError] = useState("");
  const today = todayLocal();
  const reminders = items.filter((item) => isFollowUpDate(item.followUp) && item.status !== "accepted" && item.status !== "closed");
  const due = items.filter((item) => isFollowUpDue(item, today));
  const visible = filter === "all"
    ? items
    : filter === "due"
      ? due.sort((a, b) => a.followUp.localeCompare(b.followUp))
      : items.filter((item) => item.status === filter);

  function addLink(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const fields = new FormData(event.currentTarget);
    const error = onAdd(String(fields.get("title") ?? ""), String(fields.get("url") ?? ""));
    setAddError(error ?? "");
    if (!error) {
      setFilter("all");
      setShowAdd(false);
    }
  }

  return (
    <section aria-labelledby="saved-title" className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="saved-title" className="scroll-mt-24 flex items-center gap-2 text-lg font-bold"><Bookmark size={18} className="text-indigo-600" aria-hidden /> সুযোগ ট্র্যাকার</h2>
          <p className="mt-1 text-xs leading-relaxed text-slate-600">নিজের আবেদন, ফলো-আপ ও ফলাফল লিখে রাখুন। তথ্য এই ব্রাউজারে থাকে। আবেদন মূল সাইটে করুন।</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {reminders.length > 0 && <button type="button" className={secondaryClass} onClick={() => downloadText("kormopath-follow-ups.ics", opportunitiesToIcs(items), "text/calendar;charset=utf-8")}><CalendarClock size={15} aria-hidden /> ক্যালেন্ডারে ফলো-আপ</button>}
          {items.length > 0 && <button type="button" className={secondaryClass} onClick={() => downloadText("kormopath-opportunities.csv", opportunitiesToCsv(items))}><Download size={15} aria-hidden /> এই পথের CSV</button>}
          <button type="button" className={secondaryClass} aria-expanded={showAdd} onClick={() => { setShowAdd(!showAdd); setAddError(""); }}><Plus size={15} aria-hidden /> লিংক যোগ করুন</button>
        </div>
      </div>

      {reminders.length > 0 && <p className="mt-3 text-xs text-slate-500">ফলো-আপ ক্যালেন্ডার ফাইল ডাউনলোড করে Google Calendar বা অন্য ক্যালেন্ডারে import করুন। অ্যাপ নিজে notification পাঠায় না; তারিখ বদলালে নতুন ফাইল নিন।</p>}

      {showAdd && (
        <form onSubmit={addLink} className="mt-4 space-y-3 rounded-xl border border-indigo-200 bg-indigo-50/60 p-3 sm:p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="min-w-0 space-y-1 text-xs font-semibold">সুযোগের নাম
              <input name="title" className={fieldClass} maxLength={OPPORTUNITY_TITLE_LIMIT} placeholder="যেমন, ফ্রন্টএন্ড ইন্টার্নশিপ" required />
            </label>
            <label className="min-w-0 space-y-1 text-xs font-semibold">মূল লিংক
              <input name="url" type="url" className={fieldClass} placeholder="https://example.com/…" required />
            </label>
          </div>
          {addError && <p role="alert" className="text-xs font-medium text-red-700">{addError}</p>}
          <button className={primaryClass}>সুযোগ সংরক্ষণ করুন</button>
        </form>
      )}

      {items.length > 0 && (
        <div className="mt-4 space-y-2 rounded-xl bg-slate-50 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
              <span className="rounded-full bg-indigo-100 px-2.5 py-1 text-indigo-900 font-bold">{items.length}টি সুযোগ বোর্ডে</span>
              {due.length > 0 && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-1 text-amber-950 font-bold">
                  <CalendarClock size={14} aria-hidden /> {due.length}টি ফলো-আপ বাকি
                </span>
              )}
            </div>
            <span className="text-[12px] text-slate-500">স্টেজ অনুযায়ী ফিল্টার করুন:</span>
          </div>

          <div className="flex flex-wrap gap-1.5 pt-1">
            {[
              { id: "all", label: `সব সুযোগ (${items.length})` },
              { id: "due", label: `ফলো-আপ বাকি (${due.length})` },
              { id: "saved", label: `সংরক্ষিত (${items.filter((i) => i.status === "saved").length})` },
              { id: "drafting", label: `প্রস্তুতি (${items.filter((i) => i.status === "drafting").length})` },
              { id: "applied", label: `আবেদিত (${items.filter((i) => i.status === "applied").length})` },
              { id: "interview", label: `ইন্টারভিউ (${items.filter((i) => i.status === "interview").length})` },
              { id: "accepted", label: `নির্বাচিত (${items.filter((i) => i.status === "accepted").length})` },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilter(tab.id)}
                className={`rounded-full px-2.5 py-1 text-xs font-semibold transition-all ${
                  filter === tab.id
                    ? "bg-indigo-700 text-white shadow-sm"
                    : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-100"
                } min-h-[44px] min-w-[44px]`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {visible.length > 0 ? (
        <ul className="mt-3 grid items-start gap-3 md:grid-cols-2">
          {visible.map((item) => <OpportunityCard key={item.id} item={item} today={today} onUpdate={onUpdate} onRemove={onRemove} />)}
        </ul>
      ) : (
        <p className="mt-3 rounded-xl border border-dashed border-slate-300 p-5 text-center text-sm text-slate-600">
          {items.length > 0 ? "এই ফিল্টারে কোনো সুযোগ নেই।" : "সার্চের ফল থেকে বুকমার্ক করুন অথবা নিজের লিংক যোগ করুন।"}
        </p>
      )}
    </section>
  );
}

function OpportunityCard({ item, today, onUpdate, onRemove }: Pick<TrackerProps, "onUpdate" | "onRemove"> & {
  item: SavedOpportunity;
  today: string;
}) {
  const [editing, setEditing] = useState(false);
  const [showChecklist, setShowChecklist] = useState(false);
  const [dateError, setDateError] = useState(false);
  const due = isFollowUpDue(item, today);
  const savedAt = new Date(item.savedAt);
  const checklist = item.checklist ?? [];
  const checkedCount = checklist.length;

  const toggleChecklist = (docId: string) => {
    const next = checklist.includes(docId) ? checklist.filter((id) => id !== docId) : [...checklist, docId];
    onUpdate(item.id, {
      status: item.status,
      followUp: item.followUp,
      note: item.note,
      checklist: next,
    });
  };

  function saveProgress(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const fields = new FormData(event.currentTarget);
    const status = fields.get("status");
    const followUp = String(fields.get("followUp") ?? "");
    if (!isOpportunityStatus(status)) return;
    if (followUp && !isFollowUpDate(followUp)) {
      setDateError(true);
      return;
    }
    onUpdate(item.id, {
      status,
      followUp,
      note: String(fields.get("note") ?? "").trim().slice(0, OPPORTUNITY_NOTE_LIMIT),
      checklist: item.checklist,
    });
    setEditing(false);
  }

  return (
    <li className="min-w-0 space-y-3 rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs hover:border-indigo-300 transition-all">
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
        <a href={item.url} target="_blank" rel="noopener noreferrer" className="flex min-w-0 flex-1 items-start gap-1.5 text-sm font-bold text-indigo-800 hover:underline min-h-[44px]">
          <span className="min-w-0 [overflow-wrap:anywhere]">{item.title}</span><ExternalLink size={13} className="mt-0.5 shrink-0" aria-hidden />
        </a>
        <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${statusClass[item.status]}`}>{OPPORTUNITY_STATUSES[item.status]}</span>
      </div>
      {Number.isFinite(savedAt.getTime()) && <p className="text-xs text-slate-500">সংরক্ষিত <time dateTime={item.savedAt}>{savedAt.toLocaleDateString("bn-BD")}</time></p>}
      {item.followUp && (
        <p className={`flex flex-wrap items-center gap-1.5 text-xs ${due ? "font-bold text-amber-900" : "text-slate-600"}`}>
          <CalendarClock size={14} aria-hidden />
          {due ? (item.followUp === today ? "আজ ফলো-আপ" : "ফলো-আপ বাকি") : "ফলো-আপ"} ·
          <time dateTime={item.followUp}>{new Date(item.followUp + "T00:00:00Z").toLocaleDateString("bn-BD", { timeZone: "UTC", dateStyle: "medium" })}</time>
        </p>
      )}
      {!editing && item.note && <p className="whitespace-pre-wrap break-words text-xs leading-relaxed text-slate-700 bg-slate-50 rounded-lg p-2 border border-slate-100">{item.note}</p>}

      {/* Document Checklist Accordion */}
      <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-2.5">
        <button
          type="button"
          onClick={() => setShowChecklist(!showChecklist)}
          className="flex w-full items-center justify-between text-left text-xs font-semibold text-slate-700 hover:text-indigo-900 min-h-[44px]"
        >
          <span className="flex items-center gap-1.5">
            <CheckCircle2 size={13} className={checkedCount === APPLICATION_CHECKLIST_TEMPLATE.length ? "text-emerald-600" : "text-indigo-600"} />
            আবেদনের নথিপত্র চেকলিস্ট
            <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[12px] font-bold text-indigo-900">
              {checkedCount}/{APPLICATION_CHECKLIST_TEMPLATE.length}
            </span>
          </span>
          {showChecklist ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>

        {showChecklist && (
          <div className="mt-2.5 space-y-1.5 border-t border-slate-200/70 pt-2">
            {APPLICATION_CHECKLIST_TEMPLATE.map((doc) => {
              const isChecked = checklist.includes(doc.id);
              return (
                <div key={doc.id} className="flex items-start justify-between gap-2 text-xs py-0.5">
                  <button
                    type="button"
                    onClick={() => toggleChecklist(doc.id)}
                    className="flex flex-1 items-start gap-2 text-left min-h-[44px] min-w-[44px]"
                  >
                    {isChecked ? (
                      <CheckSquare size={14} className="mt-0.5 shrink-0 text-emerald-600" />
                    ) : (
                      <Square size={14} className="mt-0.5 shrink-0 text-slate-500" />
                    )}
                    <span className={isChecked ? "text-slate-500 line-through" : "font-medium text-slate-800"}>
                      {doc.labelBn}
                      <span className="block text-[12px] text-slate-500 font-normal">{doc.detailBn}</span>
                    </span>
                  </button>
                  {doc.appHref && (
                    <Link
                      href={doc.appHref}
                      className="inline-flex shrink-0 items-center gap-0.5 text-[12px] font-bold text-indigo-700 hover:underline min-h-[44px] min-w-[44px]"
                    >
                      {doc.appLabel || "টুল"} <ArrowUpRight size={10} />
                    </Link>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {editing ? (
        <form onSubmit={saveProgress} className="space-y-3 border-t border-slate-200 pt-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="min-w-0 space-y-1 text-xs font-semibold">আবেদনের অবস্থা
              <select name="status" className={fieldClass} defaultValue={item.status}><StatusOptions /></select>
            </label>
            <label className="min-w-0 space-y-1 text-xs font-semibold">ফলো-আপের তারিখ
              <input name="followUp" type="date" className={fieldClass} defaultValue={item.followUp} min="0001-01-01" max="9999-12-31" />
            </label>
          </div>
          <label className="block space-y-1 text-xs font-semibold">নোট ও ফলাফল
            <textarea name="note" className={fieldClass} rows={2} maxLength={OPPORTUNITY_NOTE_LIMIT} defaultValue={item.note} placeholder="যেমন, ইন্টারভিউয়ের সময় জানিয়েছে" />
          </label>
          {dateError && <p role="alert" className="text-xs text-red-700">সঠিক ফলো-আপের তারিখ দিন।</p>}
          <div className="flex flex-wrap gap-2">
            <button className={primaryClass}>পরিবর্তন সংরক্ষণ করুন</button>
            <button type="button" className={secondaryClass} onClick={() => setEditing(false)}>বাতিল</button>
          </div>
        </form>
      ) : (
        <div className="flex items-center justify-between gap-2 border-t border-slate-200 pt-2">
          <button type="button" className="rounded-lg px-2 py-1.5 text-xs font-bold text-indigo-800 hover:bg-indigo-50 min-h-[44px] min-w-[44px]" onClick={() => { setDateError(false); setEditing(true); }}>অগ্রগতি সম্পাদনা</button>
          <button type="button" aria-label={`${item.title} সরান`} className="grid h-11 w-11 shrink-0 place-items-center rounded-lg text-slate-500 hover:bg-red-50 hover:text-red-700" onClick={() => onRemove(item.id)}><Trash2 size={15} aria-hidden /></button>
        </div>
      )}
    </li>
  );
}
