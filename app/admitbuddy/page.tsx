"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  GraduationCap, Bookmark, BookmarkCheck, CalendarPlus, Download, ExternalLink, CheckCircle2, Circle, Trash2, Send, Copy,
  FileText, Bot, Info, AlertTriangle, ListChecks, Compass,
} from "lucide-react";
import { AppHeader, SourceTag } from "@/components/AppHeader";
import { saveUserProfile } from "@/lib/profile";
import {
  UNIVERSITIES, OFFICIAL_RESOURCES, DOCUMENT_CHECKLIST, calculateMatches, generateDeadlines, validateUserDeadline,
  generateSopDraft, answerCounselorQuery, analyzeListBalance, analyzeSopText, toIcs,
  APPLICATION_STAGES, applicationPipeline, sanitizeStatuses,
  type StudentProfile, type UserDeadline, type ApplicationStatus, type ApplicationStage,
} from "@/lib/admitbuddy";
import { usePersistentState, storageKey, downloadText, todayLocal } from "@/lib/clientStore";

type Tab = "discover" | "applications" | "sop" | "counselor" | "resources";

const DEFAULT_PROFILE: StudentProfile = { name: "", sscGpa: 5, hscGpa: 5, group: "Science", maxBudgetPerSemester: 80000, preferredLocations: [], interests: [] };
const LOCATIONS = [...new Set(UNIVERSITIES.map((u) => u.location))].sort();
const PROGRAMS = ["CSE", "Software Engineering", "EEE", "Civil", "Mechanical", "Architecture", "BBA", "Economics", "Pharmacy", "Law", "Physics"];

const sanitizeProfile = (r: unknown): StudentProfile | null => {
  if (!r || typeof r !== "object") return null;
  const p = r as Record<string, unknown>;
  const gpa = (v: unknown) => (typeof v === "number" && v >= 0 && v <= 5 ? v : null);
  if (gpa(p.sscGpa) === null || gpa(p.hscGpa) === null) return null;
  return {
    name: typeof p.name === "string" ? p.name.slice(0, 60) : "",
    sscGpa: p.sscGpa as number,
    hscGpa: p.hscGpa as number,
    group: p.group === "Commerce" || p.group === "Humanities" ? p.group : "Science",
    maxBudgetPerSemester: typeof p.maxBudgetPerSemester === "number" && p.maxBudgetPerSemester >= 0 ? Math.min(1_000_000, p.maxBudgetPerSemester) : 80000,
    preferredLocations: Array.isArray(p.preferredLocations) ? p.preferredLocations.filter((x): x is string => typeof x === "string" && LOCATIONS.includes(x)) : [],
    interests: Array.isArray(p.interests) ? p.interests.filter((x): x is string => typeof x === "string" && PROGRAMS.includes(x)) : [],
  };
};
const sanitizeIds = (r: unknown): string[] | null => (Array.isArray(r) ? r.filter((x): x is string => typeof x === "string").slice(0, 100) : null);
const sanitizeDeadlines = (r: unknown): UserDeadline[] | null =>
  Array.isArray(r) ? r.filter((d): d is UserDeadline => d && validateUserDeadline(d) === null && ["application", "exam", "other"].includes(d.kind) && typeof d.label === "string").slice(0, 200) : null;

export default function AdmitBuddyPage() {
  const [tab, setTab] = useState<Tab>("discover");
  const [profile, setProfile] = usePersistentState<StudentProfile>(storageKey("admitbuddy", "profile"), DEFAULT_PROFILE, sanitizeProfile);
  const [shortlist, setShortlist] = usePersistentState<string[]>(storageKey("admitbuddy", "shortlist"), [], sanitizeIds);
  const [userDeadlines, setUserDeadlines] = usePersistentState<UserDeadline[]>(storageKey("admitbuddy", "deadlines"), [], sanitizeDeadlines);
  const [doneTasks, setDoneTasks] = usePersistentState<string[]>(storageKey("admitbuddy", "doneTasks"), [], sanitizeIds);
  const [docs, setDocs] = usePersistentState<string[]>(storageKey("admitbuddy", "documents"), [], sanitizeIds);
  const [statuses, setStatuses] = usePersistentState<ApplicationStatus[]>(storageKey("admitbuddy", "applicationStatus"), [], sanitizeStatuses);
  const [today, setToday] = useState("1970-01-01");
  const [filter, setFilter] = useState<"all" | "eligible" | "public" | "private" | "shortlist">("all");
  const [editingProfile, setEditingProfile] = useState(false);
  useEffect(() => setToday(todayLocal()), []);

  const matches = useMemo(() => calculateMatches(profile, userDeadlines, today), [profile, userDeadlines, today]);
  const shortlisted = UNIVERSITIES.filter((u) => shortlist.includes(u.id));
  const tasks = useMemo(() => generateDeadlines(shortlisted, userDeadlines).map((t) => ({ ...t, isDone: t.isDone || doneTasks.includes(t.id) })), [shortlisted, userDeadlines, doneTasks]); // eslint-disable-line react-hooks/exhaustive-deps
  const balance = analyzeListBalance(matches, shortlist);

  const toggleShortlist = (id: string) =>
    setShortlist((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      saveUserProfile({ shortlistedUniversities: next });
      return next;
    });

  const filtered = matches.filter((m) =>
    filter === "all" ? true : filter === "eligible" ? m.eligibility === "meets" : filter === "shortlist" ? shortlist.includes(m.university.id) : m.university.type === filter,
  );
  const dated = tasks.filter((t) => t.dueDate && !t.isDone);
  const nextTask = dated[0];
  const profileEmpty = !profile.name && !profile.interests.length && !profile.preferredLocations.length;

  const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "discover", label: "বিশ্ববিদ্যালয় খুঁজুন", icon: <Compass size={15} aria-hidden /> },
    { id: "applications", label: `আবেদন ট্র্যাকার${shortlist.length ? ` (${shortlist.length})` : ""}`, icon: <ListChecks size={15} aria-hidden /> },
    { id: "sop", label: "SOP সহায়ক", icon: <FileText size={15} aria-hidden /> },
    { id: "counselor", label: "প্রশ্ন করুন", icon: <Bot size={15} aria-hidden /> },
    { id: "resources", label: "অফিসিয়াল লিংক", icon: <ExternalLink size={15} aria-hidden /> },
  ];

  return (
    <div className="min-h-screen bg-[#f7f7fd] text-slate-900 antialiased">
      <AppHeader taglineEn="University admission planner" appId="admitbuddy" href="/admitbuddy" name="AdmitBuddy" taglineBn="বিশ্ববিদ্যালয় ভর্তির পরিকল্পনা ও ট্র্যাকার" icon={<GraduationCap size={22} />} accent="from-indigo-600 to-blue-700" />

      <main id="main" className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6">
        <section className="flex flex-wrap items-start justify-between gap-4 rounded-2xl border border-indigo-100 bg-white p-5">
          <div className="max-w-2xl">
            <h1 className="text-[26px] font-extrabold leading-tight tracking-tight sm:text-[32px]">কোথায় আবেদন করবেন, কবে, কী কী লাগবে — এক জায়গায়</h1>
            <p className="mt-2 text-[15px] leading-relaxed text-slate-600">
              আপনার GPA, বাজেট ও পছন্দ অনুযায়ী {UNIVERSITIES.length}টি বিশ্ববিদ্যালয় সাজিয়ে দেখায়। ভর্তির তারিখ আমরা অনুমান করি না: অফিসিয়াল সার্কুলার প্রকাশিত হলে আপনি তারিখ ও উৎস যোগ করবেন, আমরা মনে করিয়ে দেব ও ক্যালেন্ডারে পাঠাব।
            </p>
          </div>
          <div className="min-w-[250px] rounded-2xl border border-slate-200 bg-slate-50 p-4 text-[13px]">
            <div className="flex items-center justify-between">
              <strong>{profile.name || "আপনার প্রোফাইল"}</strong>
              <button onClick={() => setEditingProfile(!editingProfile)} className="text-[12px] font-bold text-indigo-700">{editingProfile ? "বন্ধ" : "এডিট"}</button>
            </div>
            <p className="text-slate-600">SSC {profile.sscGpa.toFixed(2)} · HSC {profile.hscGpa.toFixed(2)} · {profile.group}</p>
            <p className="text-slate-600">বাজেট: ৳{profile.maxBudgetPerSemester.toLocaleString("en-IN")}/সেমিস্টার</p>
            {nextTask ? (
              <p className="mt-2 rounded-lg bg-indigo-50 p-2 text-indigo-900">পরের কাজ: <strong>{nextTask.title}</strong> — {nextTask.dueDate}</p>
            ) : (
              <p className="mt-2 text-[12px] text-slate-500">শর্টলিস্ট করে তারিখ যোগ করলে পরের কাজ এখানে দেখাবে।</p>
            )}
          </div>
        </section>

        {(editingProfile || profileEmpty) && <ProfileForm profile={profile} setProfile={setProfile} onDone={() => setEditingProfile(false)} />}

        <nav className="flex gap-1 overflow-x-auto rounded-xl border border-slate-200 bg-white p-1" role="tablist" aria-label="AdmitBuddy">
          {TABS.map((t) => (
            <button key={t.id} role="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)} className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-[13px] font-bold ${tab === t.id ? "bg-indigo-600 text-white" : "text-slate-600 hover:bg-slate-100"}`}>
              {t.icon} {t.label}
            </button>
          ))}
        </nav>

        {tab === "discover" && (
          <section aria-label="বিশ্ববিদ্যালয়" className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap gap-1.5" role="group" aria-label="ফিল্টার">
                {([["all", "সব"], ["eligible", "GPA শর্ত পূরণ"], ["public", "সরকারি"], ["private", "বেসরকারি"], ["shortlist", "শর্টলিস্ট"]] as const).map(([id, l]) => (
                  <button key={id} aria-pressed={filter === id} onClick={() => setFilter(id)} className={`rounded-lg border px-2.5 py-1 text-[12px] font-semibold ${filter === id ? "border-indigo-600 bg-indigo-50 text-indigo-800" : "border-slate-200 bg-white text-slate-600"}`}>{l}</button>
                ))}
              </div>
              <span className="text-[12px] text-slate-500">ফিট স্কোর = GPA ৪০ + বাজেট ৩০ + এলাকা ১৫ + বিষয় ১৫ (ভর্তির সম্ভাবনা নয়)</span>
            </div>
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-[12px] text-amber-950">
              <AlertTriangle size={14} className="mr-1 inline" aria-hidden />
              ন্যূনতম GPA ও খরচের পরিসর আনুমানিক এবং ২০২৬-২৭ সেশনের জন্য যাচাই করা হয়নি। সরকারি বিশ্ববিদ্যালয়ে আসন ঠিক হয় ভর্তি পরীক্ষার মেধাক্রমে। আবেদনের আগে অফিসিয়াল সার্কুলার পড়ুন।
            </div>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {filtered.map((m) => {
                const u = m.university;
                const saved = shortlist.includes(u.id);
                return (
                  <article key={u.id} className={`flex flex-col rounded-2xl border bg-white p-4 ${saved ? "border-indigo-400 ring-1 ring-indigo-200" : "border-slate-200"}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-[11px] font-bold uppercase text-slate-500">{u.type === "public" ? "সরকারি" : u.type === "private" ? "বেসরকারি" : "আন্তর্জাতিক"} · {u.location}</span>
                        <h3 className="text-[16px] font-bold leading-snug">{u.shortName} — {u.name}</h3>
                      </div>
                      <button onClick={() => toggleShortlist(u.id)} aria-pressed={saved} aria-label={saved ? `${u.shortName} শর্টলিস্ট থেকে সরান` : `${u.shortName} শর্টলিস্টে রাখুন`} className={`rounded-lg p-1.5 ${saved ? "text-indigo-700" : "text-slate-400 hover:text-indigo-700"}`}>
                        {saved ? <BookmarkCheck size={20} /> : <Bookmark size={20} />}
                      </button>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1.5 text-[11px] font-bold">
                      <span className="rounded bg-indigo-100 px-1.5 py-0.5 text-indigo-800">ফিট {m.matchScore}</span>
                      <span className={`rounded px-1.5 py-0.5 ${m.category === "Safety" ? "bg-emerald-100 text-emerald-800" : m.category === "Match" ? "bg-sky-100 text-sky-800" : "bg-amber-100 text-amber-900"}`}>{m.category}</span>
                      <span className={`rounded px-1.5 py-0.5 ${m.eligibility === "meets" ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-800"}`}>{m.eligibility === "meets" ? "আনুমানিক GPA শর্ত পূরণ" : "GPA শর্তের নিচে হতে পারে"}</span>
                    </div>
                    <p className="mt-2 text-[12px] text-slate-600">প্রোগ্রাম: {u.programs.join(", ")}</p>
                    <p className="text-[12px] text-slate-600">আনুমানিক ন্যূনতম GPA: SSC {u.minGpaSsc} · HSC {u.minGpaHsc} · খরচ ৳{u.minBudgetPerSemester.toLocaleString("en-IN")}–{u.maxBudgetPerSemester.toLocaleString("en-IN")}/সেম.</p>
                    <p className="mt-1 text-[12px] text-slate-500">{u.waiverInfo}</p>
                    <div className="mt-auto flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3 text-[12px]">
                      <span className={m.isClosed ? "font-bold text-red-700" : m.daysLeft !== null ? "font-bold text-indigo-800" : "text-slate-500"}>
                        {m.isClosed ? "আপনার দেওয়া আবেদনের শেষ তারিখ পার হয়েছে" : m.daysLeft !== null ? `${m.nextDeadline!.label}: ${m.daysLeft} দিন বাকি` : "তারিখ যোগ করা হয়নি"}
                      </span>
                      <a href={u.website} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-semibold text-indigo-700 underline">অফিসিয়াল সাইট <ExternalLink size={12} aria-hidden /></a>
                    </div>
                  </article>
                );
              })}
              {filtered.length === 0 && <p className="rounded-xl bg-white p-6 text-center text-[13px] text-slate-500 md:col-span-2 xl:col-span-3">এই ফিল্টারে কিছু নেই।</p>}
            </div>
          </section>
        )}

        {tab === "applications" && shortlist.length > 0 && <StatusBoard shortlist={shortlist} statuses={statuses} setStatuses={setStatuses} today={today} />}
        {tab === "applications" && (
          <ApplicationTracker
            shortlist={shortlist}
            tasks={tasks}
            userDeadlines={userDeadlines}
            setUserDeadlines={setUserDeadlines}
            doneTasks={doneTasks}
            setDoneTasks={setDoneTasks}
            docs={docs}
            setDocs={setDocs}
            balance={balance}
            today={today}
            goDiscover={() => setTab("discover")}
          />
        )}

        {tab === "sop" && <SopStudio profile={profile} />}
        {tab === "counselor" && <Counselor matches={matches} />}
        {tab === "resources" && (
          <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="text-[17px] font-bold">অফিসিয়াল উৎস</h2>
            <p className="text-[13px] text-slate-600">তারিখ, আসন, যোগ্যতা ও ফি — সবকিছুর চূড়ান্ত উৎস অফিসিয়াল সার্কুলার। নিচের পোর্টালগুলো আমরা ২০২৬-১১-০৫ তারিখে দেখেছি।</p>
            <ul className="space-y-3">
              {OFFICIAL_RESOURCES.map((r) => (
                <li key={r.url} className="rounded-xl border border-slate-200 p-3 text-[13px]">
                  <a href={r.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-bold text-indigo-700 underline">{r.label} <ExternalLink size={12} aria-hidden /></a>
                  <p className="mt-0.5 text-slate-600">{r.note}</p>
                  <span className="mt-1 inline-block"><SourceTag confidence="reported" label="সংবাদ/অফিসিয়াল পোর্টাল" checked={r.checked} /></span>
                </li>
              ))}
            </ul>
          </section>
        )}

        <p className="text-[11px] text-slate-500">
          সব তথ্য এই ডিভাইসে থাকে। ভর্তির সিদ্ধান্তের আগে প্রতিটি তথ্য অফিসিয়াল উৎসে মিলিয়ে নিন। <Link href="/settings" className="font-semibold text-indigo-700 underline">ডেটা এক্সপোর্ট/মুছুন</Link> · ভাইভা অনুশীলন: <Link href="/probaho" className="font-semibold text-indigo-700 underline">Probaho Coach</Link>
        </p>
      </main>
    </div>
  );
}

function ProfileForm({ profile, setProfile, onDone }: { profile: StudentProfile; setProfile: (p: StudentProfile) => void; onDone: () => void }) {
  const toggle = (list: string[], v: string) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);
  const gpaInput = (key: "sscGpa" | "hscGpa", label: string) => (
    <label className="text-[12px] font-bold text-slate-600">
      {label}
      <input type="number" min={0} max={5} step={0.01} value={profile[key]} onChange={(e) => setProfile({ ...profile, [key]: Math.min(5, Math.max(0, Number(e.target.value) || 0)) })} className="mt-1 block w-full rounded-lg border border-slate-200 px-2 py-1.5 text-[15px] font-bold" />
    </label>
  );
  return (
    <section aria-labelledby="pf-h" className="space-y-4 rounded-2xl border-2 border-indigo-200 bg-white p-5">
      <button type="button" onClick={() => { setProfile({ ...profile, name: "Nabila (example)", sscGpa: 5, hscGpa: 4.83, group: "Science", maxBudgetPerSemester: 90000, preferredLocations: ["Dhaka"], interests: ["CSE"] }); onDone(); }} className="float-right rounded-lg border border-indigo-300 bg-indigo-50 px-3 py-1.5 text-[12px] font-bold text-indigo-800 hover:bg-indigo-100" data-testid="example-profile">
        উদাহরণ প্রোফাইল · Try an example
      </button>
      <h2 id="pf-h" className="text-[17px] font-bold">আপনার তথ্য</h2>
      <div className="grid gap-3 sm:grid-cols-4">
        <label className="text-[12px] font-bold text-slate-600 sm:col-span-2">নাম (ঐচ্ছিক, SOP-এ ব্যবহার হবে)
          <input value={profile.name} maxLength={60} onChange={(e) => setProfile({ ...profile, name: e.target.value })} className="mt-1 block w-full rounded-lg border border-slate-200 px-2 py-1.5 text-[14px]" />
        </label>
        {gpaInput("sscGpa", "SSC GPA (৫ এর মধ্যে)")}
        {gpaInput("hscGpa", "HSC GPA (৫ এর মধ্যে)")}
        <fieldset className="sm:col-span-2">
          <legend className="text-[12px] font-bold text-slate-600">বিভাগ</legend>
          <div className="mt-1 flex gap-2">
            {(["Science", "Commerce", "Humanities"] as const).map((g) => (
              <button key={g} type="button" aria-pressed={profile.group === g} onClick={() => setProfile({ ...profile, group: g })} className={`flex-1 rounded-lg border px-2 py-1.5 text-[13px] font-semibold ${profile.group === g ? "border-indigo-600 bg-indigo-50 text-indigo-800" : "border-slate-200"}`}>
                {g === "Science" ? "বিজ্ঞান" : g === "Commerce" ? "ব্যবসায়" : "মানবিক"}
              </button>
            ))}
          </div>
        </fieldset>
        <label className="text-[12px] font-bold text-slate-600 sm:col-span-2">প্রতি সেমিস্টারে সর্বোচ্চ বাজেট: ৳{profile.maxBudgetPerSemester.toLocaleString("en-IN")}
          <input type="range" min={5000} max={250000} step={5000} value={profile.maxBudgetPerSemester} onChange={(e) => setProfile({ ...profile, maxBudgetPerSemester: Number(e.target.value) })} className="mt-2 w-full accent-indigo-600" />
        </label>
      </div>
      <fieldset>
        <legend className="text-[12px] font-bold text-slate-600">পছন্দের এলাকা (খালি রাখলে সব)</legend>
        <div className="mt-1 flex flex-wrap gap-1.5">
          {LOCATIONS.map((l) => <button key={l} type="button" aria-pressed={profile.preferredLocations.includes(l)} onClick={() => setProfile({ ...profile, preferredLocations: toggle(profile.preferredLocations, l) })} className={`rounded-lg border px-2.5 py-1 text-[12px] ${profile.preferredLocations.includes(l) ? "border-indigo-600 bg-indigo-50 font-bold text-indigo-800" : "border-slate-200"}`}>{l}</button>)}
        </div>
      </fieldset>
      <fieldset>
        <legend className="text-[12px] font-bold text-slate-600">আগ্রহের বিষয়</legend>
        <div className="mt-1 flex flex-wrap gap-1.5">
          {PROGRAMS.map((p) => <button key={p} type="button" aria-pressed={profile.interests.includes(p)} onClick={() => setProfile({ ...profile, interests: toggle(profile.interests, p) })} className={`rounded-lg border px-2.5 py-1 text-[12px] ${profile.interests.includes(p) ? "border-indigo-600 bg-indigo-50 font-bold text-indigo-800" : "border-slate-200"}`}>{p}</button>)}
        </div>
      </fieldset>
      <button onClick={onDone} className="rounded-xl bg-indigo-600 px-5 py-2 text-[14px] font-bold text-white">সংরক্ষণ করে ম্যাচ দেখুন</button>
    </section>
  );
}

function ApplicationTracker({
  shortlist, tasks, userDeadlines, setUserDeadlines, doneTasks, setDoneTasks, docs, setDocs, balance, today, goDiscover,
}: {
  shortlist: string[];
  tasks: ReturnType<typeof generateDeadlines>;
  userDeadlines: UserDeadline[];
  setUserDeadlines: (f: (p: UserDeadline[]) => UserDeadline[]) => void;
  doneTasks: string[];
  setDoneTasks: (f: (p: string[]) => string[]) => void;
  docs: string[];
  setDocs: (f: (p: string[]) => string[]) => void;
  balance: ReturnType<typeof analyzeListBalance>;
  today: string;
  goDiscover: () => void;
}) {
  const [form, setForm] = useState<Partial<UserDeadline>>({ kind: "application", label: "আবেদনের শেষ তারিখ", sourceNote: "অফিসিয়াল সার্কুলার" });
  const [err, setErr] = useState<string | null>(null);
  const uniOptions = UNIVERSITIES.filter((u) => shortlist.includes(u.id));
  useEffect(() => { if (!form.universityId && uniOptions[0]) setForm((f) => ({ ...f, universityId: uniOptions[0].id })); }, [uniOptions.length]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!shortlist.length) {
    return (
      <section className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
        <p className="text-[15px] font-semibold">এখনো কোনো বিশ্ববিদ্যালয় শর্টলিস্ট করা হয়নি।</p>
        <p className="mt-1 text-[13px] text-slate-500">“বিশ্ববিদ্যালয় খুঁজুন” থেকে বুকমার্ক আইকনে চাপ দিন।</p>
        <button onClick={goDiscover} className="mt-3 rounded-lg bg-indigo-600 px-4 py-2 text-[13px] font-bold text-white">বিশ্ববিদ্যালয় খুঁজুন</button>
      </section>
    );
  }

  const done = tasks.filter((t) => t.isDone).length;
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
      <section aria-labelledby="tasks-h" className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="tasks-h" className="text-[17px] font-bold">কাজের তালিকা ({done}/{tasks.length})</h2>
          <button
            disabled={!tasks.some((t) => t.dueDate)}
            onClick={() => downloadText("admitbuddy-deadlines.ics", toIcs(tasks, new Date().toISOString().replace(/[-:]/g, "").slice(0, 15) + "Z"), "text/calendar;charset=utf-8")}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-[12px] font-bold disabled:opacity-40"
          >
            <Download size={14} aria-hidden /> ক্যালেন্ডারে নিন (.ics)
          </button>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-indigo-500" style={{ width: `${tasks.length ? (done / tasks.length) * 100 : 0}%` }} /></div>
        <ul className="divide-y divide-slate-100">
          {tasks.map((t) => {
            const days = t.dueDate ? Math.round((Date.parse(t.dueDate) - Date.parse(today)) / 86_400_000) : null;
            return (
              <li key={t.id} className="flex items-start gap-3 py-2.5">
                <button onClick={() => setDoneTasks((p) => (p.includes(t.id) ? p.filter((x) => x !== t.id) : [...p, t.id]))} aria-pressed={t.isDone} aria-label={t.isDone ? "অসম্পূর্ণ করুন" : "সম্পন্ন করুন"} className="mt-0.5 text-indigo-600">
                  {t.isDone ? <CheckCircle2 size={19} /> : <Circle size={19} />}
                </button>
                <div className="min-w-0 flex-1">
                  <p className={`text-[14px] ${t.isDone ? "text-slate-400 line-through" : "font-semibold"}`}>{t.title}</p>
                  <p className="text-[12px] text-slate-500">
                    {t.dueDate ? <>তারিখ: <strong className={days !== null && days < 0 ? "text-red-700" : days !== null && days <= 7 ? "text-amber-700" : ""}>{t.dueDate}</strong>{days !== null && (days < 0 ? ` (${-days} দিন আগে পার হয়েছে)` : ` (${days} দিন বাকি)`)} · উৎস: {t.sourceNote ?? "—"}</> : "তারিখ এখনো জানা নেই"}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>

        <form
          className="space-y-2 rounded-xl border border-indigo-200 bg-indigo-50/50 p-3"
          onSubmit={(e) => {
            e.preventDefault();
            const v = validateUserDeadline(form);
            if (v) { setErr(v); return; }
            setErr(null);
            setUserDeadlines((p) => [...p, { universityId: form.universityId!, kind: form.kind as UserDeadline["kind"], date: form.date!, label: (form.label || "তারিখ").slice(0, 60), sourceNote: form.sourceNote!.slice(0, 120) }]);
            setForm({ ...form, date: "" });
          }}
        >
          <h3 className="flex items-center gap-1.5 text-[14px] font-bold"><CalendarPlus size={16} aria-hidden /> সার্কুলার থেকে তারিখ যোগ করুন</h3>
          <div className="grid gap-2 sm:grid-cols-2">
            <label className="text-[12px] font-bold text-slate-600">বিশ্ববিদ্যালয়
              <select value={form.universityId ?? ""} onChange={(e) => setForm({ ...form, universityId: e.target.value })} className="mt-1 block w-full rounded border border-slate-200 bg-white px-2 py-1.5 text-[13px] font-normal">
                {uniOptions.map((u) => <option key={u.id} value={u.id}>{u.shortName}</option>)}
              </select>
            </label>
            <label className="text-[12px] font-bold text-slate-600">ধরন
              <select value={form.kind} onChange={(e) => { const k = e.target.value as UserDeadline["kind"]; setForm({ ...form, kind: k, label: k === "application" ? "আবেদনের শেষ তারিখ" : k === "exam" ? "ভর্তি পরীক্ষা" : "" }); }} className="mt-1 block w-full rounded border border-slate-200 bg-white px-2 py-1.5 text-[13px] font-normal">
                <option value="application">আবেদনের শেষ তারিখ</option><option value="exam">ভর্তি পরীক্ষা</option><option value="other">অন্যান্য (ফল, ভাইভা, ভর্তি)</option>
              </select>
            </label>
            <label className="text-[12px] font-bold text-slate-600">তারিখ
              <input type="date" value={form.date ?? ""} onChange={(e) => setForm({ ...form, date: e.target.value })} className="mt-1 block w-full rounded border border-slate-200 px-2 py-1.5 text-[13px] font-normal" />
            </label>
            <label className="text-[12px] font-bold text-slate-600">বিবরণ
              <input value={form.label ?? ""} maxLength={60} onChange={(e) => setForm({ ...form, label: e.target.value })} className="mt-1 block w-full rounded border border-slate-200 px-2 py-1.5 text-[13px] font-normal" />
            </label>
            <label className="text-[12px] font-bold text-slate-600 sm:col-span-2">কোথা থেকে পেয়েছেন (উৎস)
              <input value={form.sourceNote ?? ""} maxLength={120} onChange={(e) => setForm({ ...form, sourceNote: e.target.value })} placeholder="যেমন: gstadmission.ac.bd সার্কুলার, ৩ ডিসেম্বর প্রকাশিত" className="mt-1 block w-full rounded border border-slate-200 px-2 py-1.5 text-[13px] font-normal" />
            </label>
          </div>
          {err && <p role="alert" className="text-[12px] text-red-700">{err}</p>}
          <button type="submit" className="rounded-lg bg-indigo-600 px-4 py-1.5 text-[13px] font-bold text-white">যোগ করুন</button>
        </form>
        {userDeadlines.length > 0 && (
          <ul className="space-y-1 text-[12px]">
            {userDeadlines.map((d, i) => (
              <li key={i} className="flex items-center justify-between gap-2 rounded bg-slate-50 px-2 py-1">
                <span>{UNIVERSITIES.find((u) => u.id === d.universityId)?.shortName}: {d.label} — {d.date} <span className="text-slate-400">({d.sourceNote})</span></span>
                <button onClick={() => setUserDeadlines((p) => p.filter((_, j) => j !== i))} aria-label="তারিখ মুছুন" className="p-1 text-slate-400 hover:text-red-600"><Trash2 size={13} /></button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <aside className="space-y-6">
        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="text-[16px] font-bold">শর্টলিস্টের ভারসাম্য</h2>
          <p className="mt-1 text-[13px]">Reach {balance.reaches} · Match {balance.matches} · Safety {balance.safeties}</p>
          <p className={`mt-2 rounded-lg p-2 text-[12px] ${balance.isBalanced ? "bg-emerald-50 text-emerald-900" : "bg-amber-50 text-amber-900"}`}>{balance.recommendationBn}</p>
        </section>
        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="text-[16px] font-bold">কাগজপত্র প্রস্তুত ({docs.length}/{DOCUMENT_CHECKLIST.length})</h2>
          <p className="mt-1 text-[11px] text-slate-500">সাধারণ তালিকা — প্রতিটি সার্কুলারে নির্দিষ্ট শর্ত (ছবির মাপ ইত্যাদি) দেখুন।</p>
          <ul className="mt-2 space-y-1.5">
            {DOCUMENT_CHECKLIST.map((d) => (
              <li key={d.id}>
                <label className="flex items-start gap-2 text-[13px]">
                  <input type="checkbox" checked={docs.includes(d.id)} onChange={() => setDocs((p) => (p.includes(d.id) ? p.filter((x) => x !== d.id) : [...p, d.id]))} className="mt-0.5 h-4 w-4 accent-indigo-600" />
                  <span className={docs.includes(d.id) ? "text-slate-400 line-through" : ""}>{d.label}</span>
                </label>
              </li>
            ))}
          </ul>
        </section>
      </aside>
    </div>
  );
}

function SopStudio({ profile }: { profile: StudentProfile }) {
  const [uniId, setUniId] = useState(UNIVERSITIES[0].id);
  const u = UNIVERSITIES.find((x) => x.id === uniId)!;
  const [program, setProgram] = useState(u.programs[0]);
  const [tone, setTone] = useState<"ambitious" | "sincere" | "storytelling">("sincere");
  const [draft, setDraft] = usePersistentState<string>(storageKey("admitbuddy", "sopDraft"), "", (r) => (typeof r === "string" ? r.slice(0, 20000) : null));
  const [copied, setCopied] = useState(false);
  const a = draft.trim() ? analyzeSopText(draft) : null;
  return (
    <section className="grid gap-6 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
      <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="text-[17px] font-bold">Statement of Purpose খসড়া</h2>
        <p className="text-[12px] text-slate-500">টেমপ্লেট শুধু শুরু করার জন্য। নিজের অভিজ্ঞতা, নির্দিষ্ট উদাহরণ ও সংখ্যা দিয়ে নিজের ভাষায় লিখুন — অনেক প্রতিষ্ঠান টেমপ্লেটের মতো লেখা সহজে চিনতে পারে।</p>
        <div className="grid gap-2 sm:grid-cols-3">
          <label className="text-[12px] font-bold text-slate-600">বিশ্ববিদ্যালয়
            <select value={uniId} onChange={(e) => { setUniId(e.target.value); setProgram(UNIVERSITIES.find((x) => x.id === e.target.value)!.programs[0]); }} className="mt-1 block w-full rounded border border-slate-200 bg-white px-2 py-1.5 text-[13px] font-normal">
              {UNIVERSITIES.map((x) => <option key={x.id} value={x.id}>{x.shortName}</option>)}
            </select>
          </label>
          <label className="text-[12px] font-bold text-slate-600">বিষয়
            <select value={program} onChange={(e) => setProgram(e.target.value)} className="mt-1 block w-full rounded border border-slate-200 bg-white px-2 py-1.5 text-[13px] font-normal">
              {u.programs.map((p) => <option key={p}>{p}</option>)}
            </select>
          </label>
          <label className="text-[12px] font-bold text-slate-600">ধরন
            <select value={tone} onChange={(e) => setTone(e.target.value as typeof tone)} className="mt-1 block w-full rounded border border-slate-200 bg-white px-2 py-1.5 text-[13px] font-normal">
              <option value="sincere">আনুষ্ঠানিক</option><option value="storytelling">গল্পের ভঙ্গিতে</option><option value="ambitious">উচ্চাকাঙ্ক্ষী</option>
            </select>
          </label>
        </div>
        <div className="flex gap-2">
          <button onClick={() => { if (!draft.trim() || window.confirm("বর্তমান খসড়ার জায়গায় নতুন টেমপ্লেট বসাবেন?")) setDraft(generateSopDraft({ studentName: profile.name || "", university: u, program, profile, tone })); }} className="rounded-lg bg-indigo-600 px-4 py-2 text-[13px] font-bold text-white">টেমপ্লেট বসান</button>
          {draft && <button onClick={() => { navigator.clipboard?.writeText(draft); setCopied(true); setTimeout(() => setCopied(false), 1500); }} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-[13px] font-bold"><Copy size={14} aria-hidden /> {copied ? "কপি হয়েছে" : "কপি"}</button>}
        </div>
        <label htmlFor="sop" className="sr-only">SOP</label>
        <textarea id="sop" rows={16} value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="এখানে আপনার SOP লিখুন বা টেমপ্লেট বসিয়ে নিজের মতো বদলান…" className="w-full rounded-xl border border-slate-200 p-3 text-[14px] leading-relaxed outline-none focus:border-indigo-600" />
      </div>
      <aside className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="text-[16px] font-bold">লেখার বিশ্লেষণ</h2>
        {!a ? <p className="text-[13px] text-slate-500">লিখতে শুরু করলে এখানে দেখাবে।</p> : (
          <>
            <dl className="grid grid-cols-2 gap-2 text-[12px]">
              <div className="rounded-lg bg-slate-50 p-2"><dt className="text-slate-500">শব্দ</dt><dd className="font-bold">{a.wordCount}</dd></div>
              <div className="rounded-lg bg-slate-50 p-2"><dt className="text-slate-500">বাক্য</dt><dd className="font-bold">{a.sentenceCount} (গড় {a.avgSentenceWords} শব্দ)</dd></div>
              <div className="rounded-lg bg-slate-50 p-2"><dt className="text-slate-500">পড়তে লাগবে</dt><dd className="font-bold">~{a.readingTimeMin} মিনিট</dd></div>
              <div className="rounded-lg bg-slate-50 p-2"><dt className="text-slate-500">Flesch Reading Ease</dt><dd className="font-bold">{a.readabilityScore}</dd></div>
            </dl>
            <p className="text-[12px] text-slate-600">{a.readabilityGrade}</p>
            <p className="text-[12px]"><strong>যা আছে:</strong> {a.keyThemes.join(", ") || "—"}</p>
            {!a.keyThemes.includes("Concrete experience") && <p className="rounded-lg bg-amber-50 p-2 text-[12px] text-amber-900">নিজের করা একটি নির্দিষ্ট কাজ বা প্রজেক্টের কথা যোগ করুন।</p>}
            {a.genericPhrases.length > 0 && <p className="rounded-lg bg-amber-50 p-2 text-[12px] text-amber-900">টেমপ্লেটের মতো শোনায়, নিজের ভাষায় বদলান: {a.genericPhrases.map((g) => `“${g}”`).join(", ")}</p>}
            <p className="text-[11px] text-slate-500"><Info size={12} className="mr-1 inline" aria-hidden />এটি স্বয়ংক্রিয় পাঠযোগ্যতা মাপ, লেখার মানের রায় নয়।</p>
          </>
        )}
      </aside>
    </section>
  );
}

function Counselor({ matches }: { matches: ReturnType<typeof calculateMatches> }) {
  const [input, setInput] = useState("");
  const [msgs, setMsgs] = useState<{ from: "user" | "bot"; text: string }[]>([
    { from: "bot", text: "আসসালামু আলাইকুম! কোনো বিশ্ববিদ্যালয়ের নাম, “বৃত্তি”, “তারিখ” বা “GST” লিখে জিজ্ঞেস করুন। আমি শুধু এই অ্যাপের তথ্য ও অফিসিয়াল লিংক থেকে উত্তর দিই — কোনো তারিখ বা কাট-অফ অনুমান করি না।" },
  ]);
  const send = (t: string) => {
    if (!t.trim()) return;
    setMsgs((p) => [...p, { from: "user", text: t }, { from: "bot", text: answerCounselorQuery(t, matches) }]);
    setInput("");
  };
  return (
    <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5">
      <h2 className="text-[17px] font-bold">প্রশ্ন করুন</h2>
      <div className="max-h-[420px] space-y-2 overflow-y-auto rounded-xl bg-slate-50 p-3" aria-live="polite">
        {msgs.map((m, i) => (
          <p key={i} className={`max-w-[85%] whitespace-pre-line rounded-xl px-3 py-2 text-[13px] ${m.from === "user" ? "ml-auto bg-indigo-600 text-white" : "bg-white text-slate-800 shadow-xs"}`}>{m.text}</p>
        ))}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {["BUET সম্পর্কে বলুন", "বৃত্তি ও ওয়েভার", "আমার তারিখগুলো", "GST গুচ্ছ"].map((s) => <button key={s} onClick={() => send(s)} className="rounded-lg border border-slate-200 px-2.5 py-1 text-[12px]">{s}</button>)}
      </div>
      <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); send(input); }}>
        <label htmlFor="ask" className="sr-only">প্রশ্ন</label>
        <input id="ask" value={input} onChange={(e) => setInput(e.target.value)} placeholder="আপনার প্রশ্ন…" className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-[14px] outline-none focus:border-indigo-600" />
        <button type="submit" aria-label="পাঠান" className="rounded-xl bg-indigo-600 px-4 text-white"><Send size={16} /></button>
      </form>
    </section>
  );
}

function StatusBoard({ shortlist, statuses, setStatuses, today }: {
  shortlist: string[];
  statuses: ApplicationStatus[];
  setStatuses: (s: ApplicationStatus[] | ((p: ApplicationStatus[]) => ApplicationStatus[])) => void;
  today: string;
}) {
  const pipe = applicationPipeline(shortlist, statuses);
  const update = (universityId: string, patch: Partial<ApplicationStatus>) =>
    setStatuses((p) => {
      const cur = p.find((x) => x.universityId === universityId) ?? { universityId, stage: "planning" as ApplicationStage, updatedAt: today, note: "" };
      return [...p.filter((x) => x.universityId !== universityId), { ...cur, ...patch, updatedAt: today }];
    });
  return (
    <section aria-labelledby="pipe-h" className="mb-6 space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="pipe-h" className="text-[17px] font-bold">আবেদনের অবস্থা</h2>
        <p className="text-[12px] text-slate-500">চলমান {pipe.active} · শেষ {pipe.finished}</p>
      </div>
      <ol className="flex flex-wrap gap-1.5 text-[11px]" aria-label="ধাপ অনুযায়ী সংখ্যা">
        {APPLICATION_STAGES.map((s) => (
          <li key={s.id} className={`rounded-full px-2.5 py-1 font-bold ${pipe.counts[s.id] ? "bg-indigo-100 text-indigo-900" : "bg-slate-100 text-slate-400"}`}>{s.label} {pipe.counts[s.id]}</li>
        ))}
      </ol>
      <ul className="divide-y divide-slate-100">
        {pipe.rows.map(({ university: u, status, next }) => (
          <li key={u.id} className="grid gap-2 py-3 sm:grid-cols-[minmax(0,1fr)_auto]" data-testid={`status-${u.id}`}>
            <div className="min-w-0">
              <strong className="text-[14px]">{u.shortName}</strong>
              <p className="text-[12px] text-slate-600">পরের কাজ: {next}</p>
              <input
                key={`${u.id}:${status.note}`}
                aria-label={`${u.shortName} নোট (রোল, ট্রানজেকশন আইডি)`}
                defaultValue={status.note}
                onBlur={(e) => e.target.value !== status.note && update(u.id, { note: e.target.value.slice(0, 200) })}
                placeholder="নোট: রোল নম্বর, ট্রানজেকশন আইডি…"
                className="mt-1 w-full rounded border border-slate-200 px-2 py-1 text-[12px]"
              />
            </div>
            <div className="flex flex-col items-start gap-1 sm:items-end">
              <select aria-label={`${u.shortName} আবেদনের ধাপ`} value={status.stage} onChange={(e) => update(u.id, { stage: e.target.value as ApplicationStage })} className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[13px] font-semibold">
                {APPLICATION_STAGES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
              </select>
              {status.updatedAt && <span className="text-[10px] text-slate-400">হালনাগাদ {status.updatedAt}</span>}
            </div>
          </li>
        ))}
      </ul>
      <p className="text-[11px] text-slate-500">ধাপগুলো আপনি নিজে বদলান — অ্যাপ কোনো বিশ্ববিদ্যালয়ের সাইট থেকে অবস্থা আনে না। সব তথ্য এই ডিভাইসে থাকে।</p>
    </section>
  );
}
