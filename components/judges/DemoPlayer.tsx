"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Clock } from "lucide-react";

export interface DemoChapter {
  time: string;
  seconds: number;
  title: string;
  subtitle: string;
}

export const CHAPTERS: DemoChapter[] = [
  { time: "0:00", seconds: 0, title: "Flagship Overview", subtitle: "5-Stage Workspace" },
  { time: "0:41", seconds: 41, title: "Sandboxed Coding & Viva Verification", subtitle: "Worker & Viva Verification" },
  { time: "1:10", seconds: 70, title: "AdmitBuddy University Eligibility", subtitle: "University Matching & Criteria" },
  { time: "1:26", seconds: 86, title: "Shohoj Budget Spoken Numbers & Poisha", subtitle: "Bangla Numbers & Poisha Accounting" },
  { time: "1:41", seconds: 101, title: "HaatBazar & MediScan Safety", subtitle: "Agronomic & Prescription Safety" },
];

export const SCRIPT: [string, string][] = [
  ["0:00", "Meet KormoPath — AI you can check, built for young people in Bangladesh. I’m Razib Miah, and this is a two-minute tour."],
  ["0:09", "Every day, students here make big decisions — about careers, study, health and money — on information they can’t verify."],
  ["0:19", "Our flagship takes a freelancer from CV to money received. The Auditor reads the CV with Google Gemini — and only keeps a skill it can quote, word for word."],
  ["0:32", "The live trace shows every model call, schema check and fallback, with real timings. Nothing is hidden."],
  ["0:41", "The Examiner sets a real bug to fix in a sandbox, then a short viva. Pass both to earn a signed Skill Passport."],
  ["0:52", "Outreach drafts a pitch and a bilingual contract with an internet-shutdown clause. The pitch can’t mention any amount not in the contract."],
  ["1:02", "The Treasurer compares payout routes in taka. Fees are calculated by tested code — never by the model."],
  ["1:10", "The same rules power 11 everyday apps. AdmitBuddy matches students to universities — and never invents an admission date."],
  ["1:18", "MediScan reads a prescription in plain Bangla and turns it into reminders. It never diagnoses."],
  ["1:26", "Shohoj Budget understands spoken Bangla amounts — and saves nothing until you confirm."],
  ["1:32", "HaatBazar tells a farmer whether a distant market is worth the trip, with live weather."],
  ["1:38", "Probaho coaches interview answers — and its AI feedback must quote your own words."],
  ["1:44", "FeeGuard shows how much of a freelance payment really reaches you."],
  ["1:49", "Everything stays on your device. Judges can follow a two-minute tour on the site."],
  ["1:55", "Live now at kormopath.vercel.app. KormoPath — AI you can check. Thank you."],
];

function parseSeconds(t: string): number {
  const [m, s] = t.split(":").map(Number);
  return m * 60 + s;
}

const SCRIPT_ITEMS = SCRIPT.map(([time, text]) => ({
  time,
  seconds: parseSeconds(time),
  text,
}));

export function DemoPlayer() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [currentTime, setCurrentTime] = useState(0);

  const seekTo = (seconds: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = seconds;
      videoRef.current.play().catch(() => {});
      setCurrentTime(seconds);
    }
  };

  const activeChapterIndex = useMemo(() => {
    for (let i = CHAPTERS.length - 1; i >= 0; i--) {
      if (currentTime >= CHAPTERS[i].seconds) return i;
    }
    return 0;
  }, [currentTime]);

  const activeScriptIndex = useMemo(() => {
    for (let i = SCRIPT_ITEMS.length - 1; i >= 0; i--) {
      if (currentTime >= SCRIPT_ITEMS[i].seconds) return i;
    }
    return 0;
  }, [currentTime]);

  return (
    <div className="space-y-6">
      {/* Video Player */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-900 shadow-lg">
        <video
          ref={videoRef}
          controls
          preload="metadata"
          playsInline
          className="aspect-video w-full"
          onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
        >
          <source src="/demo/kormopath-demo.mp4" type="video/mp4" />
          <track kind="captions" src="/demo/kormopath-demo.vtt" srcLang="en" label="English" />
        </video>
      </div>

      {/* Chapter Marker Jump Controls */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-orange-100 text-orange-700">
              <Clock size={14} />
            </span>
            <h2 className="text-[15px] font-bold text-slate-900">Interactive Chapter Jump Markers</h2>
          </div>
          <span className="text-[12px] font-mono text-slate-500">
            {Math.floor(currentTime / 60)}:{String(Math.floor(currentTime % 60)).padStart(2, "0")} / 2:00
          </span>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
          {CHAPTERS.map((ch, idx) => {
            const isActive = activeChapterIndex === idx;
            return (
              <button
                key={ch.time}
                onClick={() => seekTo(ch.seconds)}
                className={`group flex flex-col rounded-xl border p-2.5 text-left transition-all ${
                  isActive
                    ? "border-orange-800 bg-orange-800 text-white shadow-sm ring-2 ring-orange-500/30"
                    : "border-slate-200 bg-slate-50/70 hover:border-orange-300 hover:bg-white text-slate-800"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`rounded px-1.5 py-0.5 font-mono text-[11px] font-bold ${
                      isActive ? "bg-white/20 text-white" : "bg-white border border-slate-200 text-orange-700"
                    }`}
                  >
                    {ch.time}
                  </span>
                  {isActive && <span className="h-2 w-2 rounded-full bg-white animate-pulse" />}
                </div>
                <span className="mt-1.5 block text-[13px] font-bold leading-tight line-clamp-1">{ch.title}</span>
                <span
                  className={`mt-0.5 block text-[11px] leading-tight line-clamp-1 ${
                    isActive ? "text-orange-50" : "text-slate-500"
                  }`}
                >
                  {ch.subtitle}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <p className="text-[14px] text-slate-600">
        Narrated in British English (synthesised voice), with captions. Screens recorded from this live site on 5 Nov 2026.{" "}
        <Link href="/judges" className="font-semibold text-orange-700 underline hover:text-orange-800">
          Try it yourself with the 3-minute judge tour →
        </Link>
      </p>

      {/* Synchronized Narration Script */}
      <section aria-labelledby="script-h" className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
        <div className="mb-3 flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h2 id="script-h" className="text-[18px] font-bold text-slate-900">Synchronized Narration Script</h2>
            <p className="text-[12px] text-slate-500">Click any line to jump video playback directly to that segment.</p>
          </div>
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
            {SCRIPT_ITEMS.length} Cues
          </span>
        </div>
        <ol className="divide-y divide-slate-100">
          {SCRIPT_ITEMS.map((item, idx) => {
            const isActive = activeScriptIndex === idx;
            return (
              <li
                key={item.time}
                onClick={() => seekTo(item.seconds)}
                className={`group grid cursor-pointer grid-cols-[3.5rem_minmax(0,1fr)] gap-3 rounded-lg px-2.5 py-2.5 text-[14px] transition-all ${
                  isActive
                    ? "bg-orange-50/90 font-medium text-slate-950 border-l-4 border-orange-500 pl-3"
                    : "hover:bg-slate-50 text-slate-700"
                }`}
              >
                <div className="flex items-center gap-1 font-mono text-[13px]">
                  <span className={isActive ? "font-bold text-orange-700" : "text-slate-500 group-hover:text-orange-600"}>
                    {item.time}
                  </span>
                </div>
                <div className="flex items-start justify-between gap-2">
                  <span className="leading-snug">{item.text}</span>
                  {isActive && (
                    <span className="shrink-0 rounded bg-orange-100 px-1.5 py-0.5 text-[10px] font-bold text-orange-800">
                      Playing
                    </span>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      </section>
    </div>
  );
}
