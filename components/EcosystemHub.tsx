"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import type { Persona } from "@/lib/presets";
import { PERSONAS } from "@/lib/presets";
import { parseEntry, categoryById } from "@/lib/budget";
import {
  X,
  LayoutGrid,
  Sparkles,
  GraduationCap,
  Pill,
  Wallet,
  Sprout,
  Mic,
  ShieldCheck,
  CheckCircle2,
  Clock,
  ArrowRight,
  TrendingUp,
  Download,
  RotateCcw,
  Volume2,
  AlertTriangle,
  Zap,
  Percent,
} from "lucide-react";

export interface EcosystemHubProps {
  isOpen: boolean;
  onClose: () => void;
  activePersona: Persona | null;
  onSelectPersona: (p: Persona) => void;
  lang: "en" | "bn";
  usdBdt: number;
}

export function EcosystemLauncherButton({ onClick, isOpen }: { onClick: () => void; isOpen: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`group relative flex items-center gap-2 rounded-xl border px-3 py-1.5 text-left transition-all ${
        isOpen
          ? "border-orange-500 bg-orange-500/20 text-orange-400 shadow-sm ring-2 ring-orange-500/30"
          : "border-white/15 bg-white/5 hover:border-orange-500/50 hover:bg-white/10 text-white"
      }`}
      aria-label="KormoPath Ecosystem Hub"
      title="Open 9-Dot Ecosystem Hub"
    >
      {/* 9-dot grid icon */}
      <div className="grid grid-cols-3 gap-0.5 p-0.5" aria-hidden="true">
        <span className="h-1 w-1 rounded-full bg-orange-400" />
        <span className="h-1 w-1 rounded-full bg-orange-400" />
        <span className="h-1 w-1 rounded-full bg-orange-400" />
        <span className="h-1 w-1 rounded-full bg-orange-400" />
        <span className="h-1 w-1 rounded-full bg-orange-400" />
        <span className="h-1 w-1 rounded-full bg-orange-400" />
        <span className="h-1 w-1 rounded-full bg-orange-400" />
        <span className="h-1 w-1 rounded-full bg-orange-400" />
        <span className="h-1 w-1 rounded-full bg-orange-400" />
      </div>
      <div className="hidden sm:block">
        <span className="block text-[12px] font-bold leading-none text-white">Ecosystem</span>
        <span className="block text-[10px] text-slate-400 leading-tight">6 Apps • Hub</span>
      </div>
      <span className="flex h-2 w-2 rounded-full bg-orange-400 animate-pulse" />
    </button>
  );
}

export function EcosystemHub({
  isOpen,
  onClose,
  activePersona,
  onSelectPersona,
  lang,
  usdBdt,
}: EcosystemHubProps) {
  const [tab, setTab] = useState<"apps" | "page">("apps");
  const [activeDemo, setActiveDemo] = useState<string | null>(null);

  // AdmitBuddy demo state
  const [abGpa, setAbGpa] = useState("5.00");
  const [abGroup, setAbGroup] = useState("science");
  const [abSop, setAbSop] = useState<string | null>(null);

  // MediScan demo state
  const [medSample, setMedSample] = useState("napa");

  // Shohoj Budget demo state
  const [sbInput, setSbInput] = useState("আজ ২০০ টাকা রিকশা ভাড়া দিয়েছি");
  const [sbResult, setSbResult] = useState<{ cat: string; amount: number | null; issues: string[] } | null>(null);

  // HaatBazar demo state
  const [hbDistrict, setHbDistrict] = useState("Bogura");
  const [hbCrop, setHbCrop] = useState("potato");

  // Probaho demo state
  const [probahoPlaying, setProbahoPlaying] = useState(false);
  const [probahoScore, setProbahoScore] = useState<number | null>(89);

  // Close on Escape key press
  useEffect(() => {
    if (!isOpen) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Uses the same tested parser as Shohoj Budget: no amount is ever invented.
  const handleSbProcess = (text: string) => {
    setSbInput(text);
    const r = parseEntry(text);
    const c = categoryById(r.categoryId);
    setSbResult({ cat: `${c.en} (${c.bn})`, amount: r.amount, issues: r.issues });
  };

  const handleGenerateSop = () => {
    setAbSop(
      `"As an aspiring Computer Science scholar from Bangladesh with a GPA of ${abGpa}, my research journey is rooted in distributed systems and high-throughput transaction reliability. Over the past year, I built production web services and micro-fintech integrations serving local users. Admittance to this program allows me to bridge national engineering talent with global architectural standards."`
    );
  };

  const handleProbahoTest = () => {
    setProbahoPlaying(true);
    setTimeout(() => {
      setProbahoPlaying(false);
      setProbahoScore(92);
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end bg-ink/40 p-2 sm:p-4 backdrop-blur-sm">
      <div
        className="flex max-h-[95vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-line bg-white shadow-2xl transition-all"
        role="dialog"
        aria-label="KormoPath Ecosystem & Page Maintenance Hub"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-line bg-paper px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-kept text-white shadow-sm">
              <LayoutGrid size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="display text-[18px] font-bold text-ink">KormoPath Ecosystem &amp; Hub</h2>
                <span className="rounded bg-haldi px-2 py-0.5 text-[11px] font-bold text-ink">
                  Autonomous Suite
                </span>
              </div>
              <p className="text-[12px] text-muted">
                {lang === "bn"
                  ? "মূল প্ল্যাটফর্ম ও ৬টি ট্র্যাকের উদ্ভাবনী ইকোসিস্টেম হাব"
                  : "Central Operating System & 6-Track Innovation Suite"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-muted hover:bg-white hover:text-ink transition-colors"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-line bg-white px-5 pt-3" role="tablist" aria-label="Ecosystem Hub sections">
          <button
            onClick={() => {
              setTab("apps");
              setActiveDemo(null);
            }}
            role="tab"
            aria-selected={tab === "apps"}
            className={`border-b-2 px-4 py-2.5 text-[14px] font-bold transition-colors ${
              tab === "apps"
                ? "border-kept text-kept"
                : "border-transparent text-muted hover:text-ink"
            }`}
          >
            🌐 {lang === "bn" ? "৬টি অ্যাপ (Ecosystem)" : "6 Apps (Ecosystem)"}
          </button>
          <button
            onClick={() => {
              setTab("page");
              setActiveDemo(null);
            }}
            role="tab"
            aria-selected={tab === "page"}
            className={`border-b-2 px-4 py-2.5 text-[14px] font-bold transition-colors ${
              tab === "page"
                ? "border-kept text-kept"
                : "border-transparent text-muted hover:text-ink"
            }`}
          >
            ⚙️ {lang === "bn" ? "আমার প্রোফাইল ও এসএলএ মেইনটেন্যান্স" : "My Page & SLA Maintenance"}
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {tab === "apps" && !activeDemo && (
            <div className="space-y-4">
              <div className="rounded-xl border border-kept/30 bg-kept-soft/40 p-3.5 text-[13px] text-ink">
                <span className="font-bold text-kept">How the 5 ideas unite:</span> KormoPath is the central
                autonomous pipeline. Each buildathon track connects directly into this ecosystem. You can launch
                an interactive mini-demo of any companion module right here:
              </div>

              {/* 1. Flagship Core */}
              <div className="rounded-xl border-2 border-kept bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-kept text-white font-bold">
                      🧭
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-[16px] text-ink">KormoPath Core OS</h3>
                        <span className="rounded bg-kept px-2 py-0.5 text-[10px] font-bold text-white uppercase">
                          Active Platform
                        </span>
                      </div>
                      <p className="text-[12px] text-muted">Education, Career, FinOps &amp; Legal Tracks</p>
                    </div>
                  </div>
                </div>
                <p className="mt-2 text-[13px] text-ink/80">
                  The primary 5-stage pipeline currently loaded below: Compass (CV/Audit), VivaForge (Bug-hunt),
                  ChuktiGuard (Bilingual contract &amp; Clause 4 blackout protection), and TakaFlow (FinOps &amp; NBR
                  ledger).
                </p>
              </div>

              {/* FeeGuard BD */}
              <div className="rounded-xl border border-line bg-white p-4 hover:border-kept transition-all">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-100 text-emerald-800 font-bold">
                      <Percent size={20} />
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-[15px] text-ink">FeeGuard BD</h3>
                        <span className="rounded bg-paper px-1.5 py-0.5 text-[10px] font-bold text-muted uppercase">
                          FinOps &amp; Freedom Track
                        </span>
                      </div>
                      <p className="text-[12px] text-muted">
                        Fiverr 20% Fee Drain Audit, Direct Client Pitch &amp; 2.5% Remittance Incentive
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Link
                      href="/feeguard"
                      onClick={onClose}
                      className="flex items-center gap-1 rounded-lg bg-emerald-700 px-3 py-1.5 text-[12px] font-semibold text-white hover:bg-emerald-800 transition-colors"
                    >
                      Open Full App →
                    </Link>
                  </div>
                </div>
                <p className="mt-2 text-[12px] text-muted">
                  Calculates exact take-home differences across Fiverr, Upwork, and direct wire (+2.5% Bangladesh Bank cash incentive). Exports NBR tax-free ITES reports and generates polite client migration pitches.
                </p>
              </div>

              {/* ChuktiGuard */}
              <div className="rounded-xl border border-line bg-white p-4 hover:border-indigo-600 transition-all">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-100 text-indigo-800 font-bold">
                      <ShieldCheck size={20} />
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-[15px] text-ink">ChuktiGuard</h3>
                        <span className="rounded bg-indigo-50 text-indigo-700 px-1.5 py-0.5 text-[10px] font-bold uppercase">
                          B2B Contracts &amp; Invoicing
                        </span>
                      </div>
                      <p className="text-[12px] text-muted">
                        B2B Milestone Invoices, Clause 4 Outage Shield &amp; NBR Tax-Free ITES Declarations
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Link
                      href="/chuktiguard"
                      onClick={onClose}
                      className="flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-1.5 text-[12px] font-semibold text-white hover:bg-indigo-700 transition-colors"
                    >
                      Open Full App →
                    </Link>
                  </div>
                </div>
                <p className="mt-2 text-[12px] text-muted">
                  Contra &amp; Deel benchmark: 1-click professional B2B sprint invoicing with statutory NBR Section 52 tax exemption and legally sound Clause 4 Force Majeure shields during internet disruptions.
                </p>
              </div>

              {/* 2. AdmitBuddy */}
              <div className="rounded-xl border border-line bg-white p-4 hover:border-kept transition-all">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#e8f0fe] text-[#1a73e8] font-bold">
                      <GraduationCap size={20} />
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-[15px] text-ink">AdmitBuddy</h3>
                        <span className="rounded bg-paper px-1.5 py-0.5 text-[10px] font-bold text-muted uppercase">
                          Education Track
                        </span>
                      </div>
                      <p className="text-[12px] text-muted">
                        BD University Matching Engine, Reach/Match/Safety &amp; Scholarship Studio
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setActiveDemo("admitbuddy")}
                      className="flex items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1.5 text-[12px] font-semibold text-slate-700 hover:bg-slate-200 transition-colors"
                    >
                      Mini-Demo
                    </button>
                    <Link
                      href="/admitbuddy"
                      onClick={onClose}
                      className="flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-1.5 text-[12px] font-semibold text-white hover:bg-indigo-700 transition-colors"
                    >
                      Open Full App →
                    </Link>
                  </div>
                </div>
                <p className="mt-2 text-[12px] text-muted">
                  Matches Bangladeshi students with BUET, DU, SUST vs Private universities based on GPA cutoffs,
                  scholarship eligibility and auto-drafts polished SOP essays.
                </p>
              </div>

              {/* 3. MediScan BD */}
              <div className="rounded-xl border border-line bg-white p-4 hover:border-kept transition-all">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#fce8e6] text-[#d93025] font-bold">
                      <Pill size={20} />
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-[15px] text-ink">MediScan BD</h3>
                        <span className="rounded bg-paper px-1.5 py-0.5 text-[10px] font-bold text-muted uppercase">
                          Health &amp; Services Track
                        </span>
                      </div>
                      <p className="text-[12px] text-muted">
                        Prescription Reader, Plain-Bangla Dose Guide &amp; Safety Flags
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setActiveDemo("mediscan")}
                      className="flex items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1.5 text-[12px] font-semibold text-slate-700 hover:bg-slate-200 transition-colors"
                    >
                      Mini-Demo
                    </button>
                    <Link
                      href="/mediscan"
                      onClick={onClose}
                      className="flex items-center gap-1 rounded-lg bg-rose-600 px-3 py-1.5 text-[12px] font-semibold text-white hover:bg-rose-700 transition-colors"
                    >
                      Open Full App →
                    </Link>
                  </div>
                </div>
                <p className="mt-2 text-[12px] text-muted">
                  Reads prescription text (photo reading optional, with consent), explains the written dose in plain
                  Bangla, flags duplicate ingredients and urgent symptoms, and compares prices you were quoted.
                </p>
              </div>

              {/* 4. Shohoj Budget */}
              <div className="rounded-xl border border-line bg-white p-4 hover:border-kept transition-all">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#e6f4ea] text-[#137333] font-bold">
                      <Wallet size={20} />
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-[15px] text-ink">Shohoj Budget</h3>
                        <span className="rounded bg-paper px-1.5 py-0.5 text-[10px] font-bold text-muted uppercase">
                          Finance &amp; Lifestyle Track
                        </span>
                      </div>
                      <p className="text-[12px] text-muted">
                        Bangla Voice Expense Logger &amp; Daily Safe-to-Spend Coach
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setActiveDemo("budget")}
                      className="flex items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1.5 text-[12px] font-semibold text-slate-700 hover:bg-slate-200 transition-colors"
                    >
                      Mini-Demo
                    </button>
                    <Link
                      href="/shohoj-budget"
                      onClick={onClose}
                      className="flex items-center gap-1 rounded-lg bg-amber-600 px-3 py-1.5 text-[12px] font-semibold text-white hover:bg-amber-700 transition-colors"
                    >
                      Open Full App →
                    </Link>
                  </div>
                </div>
                <p className="mt-2 text-[12px] text-muted">
                  Understands spoken Bangla (&quot;আজ দুইশো টাকা রিকশায় খরচ করেছি&quot;), categorizes instantly,
                  simulates bKash SMS parsing, and calculates today&apos;s safe spending limit to avoid end-of-month cash deficits.
                </p>
              </div>

              {/* 5. HaatBazar AI */}
              <div className="rounded-xl border border-line bg-white p-4 hover:border-kept transition-all">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#fef7e0] text-[#b06000] font-bold">
                      <Sprout size={20} />
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-[15px] text-ink">HaatBazar AI</h3>
                        <span className="rounded bg-paper px-1.5 py-0.5 text-[10px] font-bold text-muted uppercase">
                          Agriculture &amp; Marketplace Track
                        </span>
                      </div>
                      <p className="text-[12px] text-muted">
                        64-District Fair Price Intelligence &amp; Quality Grading
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setActiveDemo("haatbazar")}
                      className="flex items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1.5 text-[12px] font-semibold text-slate-700 hover:bg-slate-200 transition-colors"
                    >
                      Mini-Demo
                    </button>
                    <Link
                      href="/haatbazar"
                      onClick={onClose}
                      className="flex items-center gap-1 rounded-lg bg-emerald-700 px-3 py-1.5 text-[12px] font-semibold text-white hover:bg-emerald-800 transition-colors"
                    >
                      Open Full App →
                    </Link>
                  </div>
                </div>
                <p className="mt-2 text-[12px] text-muted">
                  Works out whether a distant market really pays more after transport, commission and losses, keeps a
                  dated price notebook, and checks the forecast before spraying. Prices are yours, never invented.
                </p>
              </div>

              {/* 6. Probaho */}
              <div className="rounded-xl border border-line bg-white p-4 hover:border-kept transition-all">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#f3e8fd] text-[#9333ea] font-bold">
                      <Mic size={20} />
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-[15px] text-ink">Probaho Speaking Coach</h3>
                        <span className="rounded bg-paper px-1.5 py-0.5 text-[10px] font-bold text-muted uppercase">
                          Productivity &amp; Career Track
                        </span>
                      </div>
                      <p className="text-[12px] text-muted">
                        Viva &amp; Interview Practice with Topic, Structure &amp; Filler Feedback
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setActiveDemo("probaho")}
                      className="flex items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1.5 text-[12px] font-semibold text-slate-700 hover:bg-slate-200 transition-colors"
                    >
                      Mini-Demo
                    </button>
                    <Link
                      href="/probaho"
                      onClick={onClose}
                      className="flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1.5 text-[12px] font-semibold text-white hover:bg-blue-700 transition-colors"
                    >
                      Open Full App →
                    </Link>
                  </div>
                </div>
                <p className="mt-2 text-[12px] text-muted">
                  Analyzes spoken answers for technical job interviews and university vivas: flags filler words
                  (&quot;umm&quot;, &quot;like&quot;), evaluates words-per-minute pace, and grades confidence radar.
                </p>
              </div>
            </div>
          )}

          {/* Interactive Mini-Demo 1: AdmitBuddy */}
          {tab === "apps" && activeDemo === "admitbuddy" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <button
                  onClick={() => setActiveDemo(null)}
                  className="text-[13px] font-semibold text-kept hover:underline"
                >
                  ← Back to all Apps
                </button>
                <span className="rounded bg-[#e8f0fe] px-2 py-0.5 text-[11px] font-bold text-[#1a73e8]">
                  AdmitBuddy Interactive Demo
                </span>
              </div>

              <div className="rounded-xl border border-line bg-white p-4">
                <h4 className="font-bold text-[15px] text-ink">Bangladeshi University Matcher Engine</h4>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="block text-[12px] font-semibold text-muted">HSC / A-Level GPA:</label>
                    <select
                      value={abGpa}
                      onChange={(e) => setAbGpa(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-line bg-white px-3 py-1.5 text-[14px]"
                    >
                      <option value="5.00">GPA 5.00 (Golden / Full)</option>
                      <option value="4.80">GPA 4.80</option>
                      <option value="4.50">GPA 4.50</option>
                      <option value="4.00">GPA 4.00</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[12px] font-semibold text-muted">Target Faculty / Major:</label>
                    <select
                      value={abGroup}
                      onChange={(e) => setAbGroup(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-line bg-white px-3 py-1.5 text-[14px]"
                    >
                      <option value="science">Engineering &amp; CSE</option>
                      <option value="business">BBA &amp; Finance</option>
                      <option value="bio">Biomedical &amp; Pharmacy</option>
                    </select>
                  </div>
                </div>

                {/* Categorized Matches */}
                <div className="mt-4 grid gap-2.5 sm:grid-cols-3">
                  <div className="rounded-lg border border-red-200 bg-red-50/50 p-2.5">
                    <span className="block text-[11px] font-bold text-red-700 uppercase">Reach University</span>
                    <strong className="block text-[14px] text-ink">BUET / DU &apos;Ka&apos;</strong>
                    <span className="text-[12px] text-muted">Match Score: 92%</span>
                    <span className="mt-1 block text-[11px] text-ink/70">Cutoff: 4.95+ • Exam Dec 2026</span>
                  </div>
                  <div className="rounded-lg border border-blue-200 bg-blue-50/50 p-2.5">
                    <span className="block text-[11px] font-bold text-blue-700 uppercase">Target Match</span>
                    <strong className="block text-[14px] text-ink">SUST / RUET / KUET</strong>
                    <span className="text-[12px] text-muted">Match Score: 96%</span>
                    <span className="mt-1 block text-[11px] text-ink/70">Cutoff: 4.60+ • Direct Cluster</span>
                  </div>
                  <div className="rounded-lg border border-green-200 bg-green-50/50 p-2.5">
                    <span className="block text-[11px] font-bold text-green-700 uppercase">Safety / Waiver</span>
                    <strong className="block text-[14px] text-ink">BRAC / NSU / UIU</strong>
                    <span className="text-[12px] text-muted">Match Score: 99%</span>
                    <span className="mt-1 block text-[11px] text-green-800 font-semibold">
                      50% Merit Scholarship Waiver
                    </span>
                  </div>
                </div>

                <div className="mt-4 border-t border-line pt-3">
                  <button
                    onClick={handleGenerateSop}
                    className="rounded-lg bg-ink px-4 py-2 text-[13px] font-semibold text-white hover:bg-ink/90 transition-colors"
                  >
                    Draft Statement of Purpose (SOP) with AI
                  </button>
                  {abSop && (
                    <div className="mt-3 rounded-lg border border-kept/40 bg-kept-soft/30 p-3 text-[13px] leading-relaxed text-ink">
                      {abSop}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Interactive Mini-Demo 2: MediScan BD */}
          {tab === "apps" && activeDemo === "mediscan" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <button
                  onClick={() => setActiveDemo(null)}
                  className="text-[13px] font-semibold text-kept hover:underline"
                >
                  ← Back to all Apps
                </button>
                <span className="rounded bg-[#fce8e6] px-2 py-0.5 text-[11px] font-bold text-[#d93025]">
                  MediScan BD Interactive Demo
                </span>
              </div>

              <div className="rounded-xl border border-line bg-white p-4">
                <h4 className="font-bold text-[15px] text-ink">Prescription Reader (fictional samples)</h4>
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => setMedSample("napa")}
                    className={`rounded-lg px-3 py-1.5 text-[12px] font-semibold ${
                      medSample === "napa" ? "bg-ink text-white" : "border border-line bg-white"
                    }`}
                  >
                    Sample A: Napa Extra (Fever/Pain)
                  </button>
                  <button
                    onClick={() => setMedSample("pantobex")}
                    className={`rounded-lg px-3 py-1.5 text-[12px] font-semibold ${
                      medSample === "pantobex" ? "bg-ink text-white" : "border border-line bg-white"
                    }`}
                  >
                    Sample B: Pantobex 20 (Gastric)
                  </button>
                </div>

                <div className="mt-3 rounded-lg border border-line bg-paper p-3 text-[13px]">
                  <span className="font-bold text-muted uppercase text-[11px]">Sample prescription text (fictional):</span>
                  <p className="font-mono text-ink mt-0.5">
                    {medSample === "napa"
                      ? "Rx: Tab Napa Extra (Paracetamol 500mg + Caffeine 65mg) — 1+0+1 x 3 days p.c."
                      : "Rx: Cap Pantobex 20mg (Pantoprazole Sodium) — 1+0+1 x 14 days a.c."}
                  </p>
                </div>

                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-lg border border-line p-3">
                    <span className="block text-[11px] font-bold text-muted uppercase">
                      Plain Bangla Usage Guidance
                    </span>
                    <p className="mt-1 text-[13px] text-ink leading-relaxed">
                      {medSample === "napa"
                        ? "প্যারাসিটামল ও ক্যাফেইন সংমিশ্রণ। দ্রুত মাথাব্যথা ও জ্বর উপশম করে। অবশ্যই ভরা পেটে (খাবারের পরে) খাবেন। ডোজ মিস হলে সাথে সাথে খাবেন, একসাথে দুটি খাবেন না।"
                        : "প্যান্টোপ্রাজল গ্যাস্ট্রিক অ্যাসিড কমায়। প্রতিদিন সকাল ও রাতে খাবার গ্রহণের ৩০ মিনিট পূর্বে সেব্য।"}
                    </p>
                  </div>
                  <div className="rounded-lg border border-green-200 bg-green-50/50 p-3">
                    <span className="block text-[11px] font-bold text-green-800 uppercase">
                      Same generic, other brands
                    </span>
                    <strong className="block text-[14px] text-ink mt-0.5">
                      {medSample === "napa" ? "Paracetamol + Caffeine" : "Pantoprazole 20mg"}
                    </strong>
                    <span className="block text-[12px] text-green-700 font-semibold mt-1">
                      Ask the pharmacy for prices of other brands and compare them in MediScan
                    </span>
                    <span className="block text-[11px] text-muted">Confirm any brand switch with your pharmacist or doctor</span>
                  </div>
                </div>

                <div className="mt-3 flex items-center gap-2 text-[12px] text-kept font-medium">
                  <CheckCircle2 size={16} /> MediScan flags duplicate ingredients and known cautions; “no data” never means “safe”.
                </div>
              </div>
            </div>
          )}

          {/* Interactive Mini-Demo 3: Shohoj Budget */}
          {tab === "apps" && activeDemo === "budget" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <button
                  onClick={() => setActiveDemo(null)}
                  className="text-[13px] font-semibold text-kept hover:underline"
                >
                  ← Back to all Apps
                </button>
                <span className="rounded bg-[#e6f4ea] px-2 py-0.5 text-[11px] font-bold text-[#137333]">
                  Shohoj Budget Interactive Demo
                </span>
              </div>

              <div className="rounded-xl border border-line bg-white p-4">
                <h4 className="font-bold text-[15px] text-ink">Bangla Voice/Text Expense &amp; Safe-to-Spend Coach</h4>
                <p className="text-[12px] text-muted mt-1">
                  Click a real Bangladeshi voice prompt or type to test instant categorization:
                </p>

                <div className="mt-2 flex flex-wrap gap-2">
                  <button
                    onClick={() => handleSbProcess("আজ ২০০ টাকা রিকশা ভাড়া দিয়েছি")}
                    className="rounded-lg border border-line bg-paper px-2.5 py-1 text-[12px] hover:border-kept"
                  >
                    &quot;আজ ২০০ টাকা রিকশা ভাড়া দিয়েছি&quot;
                  </button>
                  <button
                    onClick={() => handleSbProcess("দুপুরে কাচ্চি বিরিয়ানি খেলাম ৩৫০ টাকা")}
                    className="rounded-lg border border-line bg-paper px-2.5 py-1 text-[12px] hover:border-kept"
                  >
                    &quot;দুপুরে কাচ্চি বিরিয়ানি খেলাম ৩৫০ টাকা&quot;
                  </button>
                  <button
                    onClick={() => handleSbProcess("বিকাশে ইন্টারনেট বিল দিলাম ১০০০ টাকা")}
                    className="rounded-lg border border-line bg-paper px-2.5 py-1 text-[12px] hover:border-kept"
                  >
                    &quot;বিকাশে ইন্টারনেট বিল দিলাম ১০০০ টাকা&quot;
                  </button>
                </div>

                <div className="mt-3 flex gap-2">
                  <input
                    value={sbInput}
                    onChange={(e) => handleSbProcess(e.target.value)}
                    className="w-full rounded-lg border border-line px-3 py-2 text-[14px]"
                    placeholder="বাংলায় লিখুন বা বলুন..."
                  />
                  <button
                    onClick={() => handleSbProcess(sbInput)}
                    className="rounded-lg bg-ink px-4 py-2 text-[13px] font-semibold text-white"
                  >
                    Categorize
                  </button>
                </div>

                {sbResult && (
                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    <div className="rounded-lg border border-line bg-paper p-3 text-center">
                      <span className="block text-[11px] font-bold text-muted uppercase">Detected Category</span>
                      <strong className="block text-[14px] text-ink mt-0.5">{sbResult.cat}</strong>
                    </div>
                    <div className="rounded-lg border border-line bg-paper p-3 text-center">
                      <span className="block text-[11px] font-bold text-muted uppercase">Amount (BDT)</span>
                      <strong className="block text-[16px] text-leak mt-0.5 font-bold">
                        {sbResult.amount !== null ? `৳${sbResult.amount.toLocaleString("en-IN")}` : "বোঝা যায়নি"}
                      </strong>
                    </div>
                    <div className="rounded-lg border border-kept/40 bg-kept-soft/40 p-3 text-center">
                      <span className="block text-[11px] font-bold text-kept uppercase">Next step</span>
                      <span className="block text-[12px] text-ink mt-0.5">
                        {sbResult.issues.length ? sbResult.issues[0] : "Shohoj Budget-এ নিশ্চিত করলে তবেই সংরক্ষণ হবে।"}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Interactive Mini-Demo 4: HaatBazar AI */}
          {tab === "apps" && activeDemo === "haatbazar" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <button
                  onClick={() => setActiveDemo(null)}
                  className="text-[13px] font-semibold text-kept hover:underline"
                >
                  ← Back to all Apps
                </button>
                <span className="rounded bg-[#fef7e0] px-2 py-0.5 text-[11px] font-bold text-[#b06000]">
                  HaatBazar AI Interactive Demo
                </span>
              </div>

              <div className="rounded-xl border border-line bg-white p-4">
                <h4 className="font-bold text-[15px] text-ink">64-District Fair Price Intelligence</h4>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="block text-[12px] font-semibold text-muted">Select District Mandi:</label>
                    <select
                      value={hbDistrict}
                      onChange={(e) => setHbDistrict(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-line bg-white px-3 py-1.5 text-[14px]"
                    >
                      <option value="Bogura">Bogura (বগুড়া মহাস্থান হাট)</option>
                      <option value="Jessore">Jessore (যশোর খাজুরা হাট)</option>
                      <option value="Rajshahi">Rajshahi (রাজশাহী বানেশ্বর হাট)</option>
                      <option value="Rangpur">Rangpur (রংপুর মিঠাপুকুর)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[12px] font-semibold text-muted">Product / Crop:</label>
                    <select
                      value={hbCrop}
                      onChange={(e) => setHbCrop(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-line bg-white px-3 py-1.5 text-[14px]"
                    >
                      <option value="potato">Potato (গোল আলু — ডায়মন্ড)</option>
                      <option value="chilli">Green Chilli (কাঁচা মরিচ)</option>
                      <option value="onion">Onion (দেশি পেঁয়াজ)</option>
                    </select>
                  </div>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-lg border border-line bg-paper p-3 text-center">
                    <span className="block text-[11px] font-bold text-muted uppercase">
                      {hbDistrict} Farmgate Mandi
                    </span>
                    <strong className="block text-[18px] text-ink mt-0.5 font-bold">
                      {hbCrop === "potato" ? "৳৩৮/কেজি" : hbCrop === "chilli" ? "৳১১০/কেজি" : "৳৬৫/কেজি"}
                    </strong>
                    <span className="text-[11px] text-muted">Example figure, not market data</span>
                  </div>
                  <div className="rounded-lg border border-line bg-paper p-3 text-center">
                    <span className="block text-[11px] font-bold text-muted uppercase">Example distant price</span>
                    <strong className="block text-[18px] text-ink mt-0.5 font-bold">
                      {hbCrop === "potato" ? "৳৫৫/কেজি" : hbCrop === "chilli" ? "৳১৮০/কেজি" : "৳৯৫/কেজি"}
                    </strong>
                    <span className="text-[11px] text-muted">Use the wholesale price, not retail</span>
                  </div>
                  <div className="rounded-lg border border-kept/40 bg-kept-soft/40 p-3 text-center">
                    <span className="block text-[11px] font-bold text-kept uppercase">Before you travel</span>
                    <strong className="block text-[16px] text-kept mt-0.5 font-bold">
                      Subtract every cost
                    </strong>
                    <span className="text-[11px] text-kept font-semibold">HaatBazar shows the break-even price</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Interactive Mini-Demo 5: Probaho */}
          {tab === "apps" && activeDemo === "probaho" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <button
                  onClick={() => setActiveDemo(null)}
                  className="text-[13px] font-semibold text-kept hover:underline"
                >
                  ← Back to all Apps
                </button>
                <span className="rounded bg-[#f3e8fd] px-2 py-0.5 text-[11px] font-bold text-[#9333ea]">
                  Probaho Speaking Coach Demo
                </span>
              </div>

              <div className="rounded-xl border border-line bg-white p-4">
                <h4 className="font-bold text-[15px] text-ink">Interview Viva Practice</h4>
                <div className="mt-2 rounded-lg border border-line bg-paper p-3 text-[13px]">
                  <span className="font-bold text-muted uppercase text-[11px]">Mock Viva Prompt:</span>
                  <p className="font-medium text-ink mt-0.5">
                    &quot;Explain how you prevent race conditions when updating user balances in a PostgreSQL payment webhook.&quot;
                  </p>
                </div>

                <div className="mt-3 flex items-center gap-3">
                  <button
                    onClick={handleProbahoTest}
                    disabled={probahoPlaying}
                    className="flex items-center gap-2 rounded-lg bg-ink px-4 py-2 text-[13px] font-semibold text-white hover:bg-ink/90 disabled:opacity-60"
                  >
                    <Volume2 size={16} />
                    {probahoPlaying ? "Analyzing speech cadence..." : "Simulate Spoken Candidate Answer"}
                  </button>
                  {probahoScore && (
                    <span className="text-[14px] font-bold text-kept">Overall Score: {probahoScore}/100</span>
                  )}
                </div>

                {probahoScore && (
                  <div className="mt-4 grid gap-2.5 sm:grid-cols-4">
                    <div className="rounded-lg border border-line p-2.5 text-center">
                      <span className="block text-[11px] font-bold text-muted uppercase">Filler Words</span>
                      <strong className="block text-[15px] text-green-700">1 (&quot;um&quot;)</strong>
                      <span className="text-[10px] text-muted">Optimal &lt; 3</span>
                    </div>
                    <div className="rounded-lg border border-line p-2.5 text-center">
                      <span className="block text-[11px] font-bold text-muted uppercase">Speaking Pace</span>
                      <strong className="block text-[15px] text-ink">134 WPM</strong>
                      <span className="text-[10px] text-muted">Clear &amp; Natural</span>
                    </div>
                    <div className="rounded-lg border border-line p-2.5 text-center">
                      <span className="block text-[11px] font-bold text-muted uppercase">Confidence</span>
                      <strong className="block text-[15px] text-kept">91%</strong>
                      <span className="text-[10px] text-muted">Firm pitch &amp; tone</span>
                    </div>
                    <div className="rounded-lg border border-line p-2.5 text-center">
                      <span className="block text-[11px] font-bold text-muted uppercase">Technical Depth</span>
                      <strong className="block text-[15px] text-kept">95%</strong>
                      <span className="text-[10px] text-muted">Quotes `SELECT FOR UPDATE`</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: MY PAGE & SLA MAINTENANCE */}
          {tab === "page" && (
            <div className="space-y-4">
              {/* Persona / Profile Card */}
              <div className="rounded-xl border border-line bg-white p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="flex h-12 w-12 items-center justify-center rounded-full bg-kept-soft text-[18px] font-bold text-kept">
                      {activePersona ? activePersona.name.split(" ").map((w) => w[0]).join("") : "KP"}
                    </span>
                    <div>
                      <h3 className="font-bold text-[16px] text-ink">
                        {activePersona ? activePersona.name : "Freelancer Profile"}
                      </h3>
                      <p className="text-[13px] text-muted">
                        {activePersona ? `${activePersona.city}, Bangladesh` : "Bangladesh"} • Level 2 Verified
                      </p>
                    </div>
                  </div>
                  <span className="rounded-full bg-kept/10 px-3 py-1 text-[12px] font-bold text-kept flex items-center gap-1.5">
                    <ShieldCheck size={14} /> Public Verified Station
                  </span>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-3 border-t border-line pt-3">
                  <div>
                    <span className="block text-[11px] font-bold text-muted uppercase">Active Target Rate</span>
                    <strong className="text-[15px] text-ink">
                      $25/hr <span className="text-muted font-normal">({(25 * usdBdt).toLocaleString()} BDT/hr)</span>
                    </strong>
                  </div>
                  <div>
                    <span className="block text-[11px] font-bold text-muted uppercase">Direct Deal Volume</span>
                    <strong className="text-[15px] text-ink">$1,200/mo Active</strong>
                  </div>
                  <div>
                    <span className="block text-[11px] font-bold text-muted uppercase">Skill Passport</span>
                    <strong className="text-[15px] text-kept font-semibold">HMAC SHA-256 Ready</strong>
                  </div>
                </div>
              </div>

              {/* Hardware SLA & Blackout Shield Station */}
              <div className="rounded-xl border border-haldi bg-haldi-soft/30 p-4">
                <div className="flex items-center gap-2">
                  <Zap size={18} className="text-[#7a5410]" />
                  <h4 className="font-bold text-[15px] text-[#7a5410]">
                    Clause 4 Blackout &amp; SLA Infrastructure Shield
                  </h4>
                </div>
                <p className="mt-1 text-[13px] text-ink/80 leading-relaxed">
                  Protects your freelancer reputation from client termination during national telecom or grid outages:
                </p>

                <div className="mt-3 grid gap-2.5 sm:grid-cols-3 text-[12px]">
                  <div className="rounded-lg border border-haldi/60 bg-white p-2.5">
                    <span className="block font-bold text-[#7a5410]">48-Hour Buffer</span>
                    <span>Clause 4 active on all direct agreements.</span>
                  </div>
                  <div className="rounded-lg border border-haldi/60 bg-white p-2.5">
                    <span className="block font-bold text-[#7a5410]">Hardware UPS SLA</span>
                    <span>৳১২,৫০০ UPS battery backup buffer logged.</span>
                  </div>
                  <div className="rounded-lg border border-haldi/60 bg-white p-2.5">
                    <span className="block font-bold text-[#7a5410]">Offline Resilience</span>
                    <span>State persisted in LocalStorage (Zero loss).</span>
                  </div>
                </div>
              </div>

              {/* FinOps & NBR Tax Compliance Station */}
              <div className="rounded-xl border border-line bg-white p-4">
                <h4 className="font-bold text-[15px] text-ink">NBR Tax &amp; Bank Incentive Status</h4>
                <div className="mt-3 space-y-2 text-[13px]">
                  <div className="flex items-center justify-between border-b border-line pb-2">
                    <span className="text-muted">IT/ITES 100% Tax Exemption:</span>
                    <span className="font-bold text-kept">1 Jul 2024 – 30 Jun 2027 if received via bank (reported)</span>
                  </div>
                  <div className="flex items-center justify-between border-b border-line pb-2">
                    <span className="text-muted">Bangladesh Bank 2.5% Cash Incentive:</span>
                    <span className="font-bold text-kept">Eligible software/ITES freelancers, via your bank, with documents</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted">Fiverr 20% service fee on $1,000/month (before other costs):</span>
                    <span className="font-bold text-ink">
                      +৳{((1000 * 0.20 * usdBdt) * 12).toLocaleString()}/year
                    </span>
                  </div>
                </div>
              </div>

              {/* Fast Switch Persona */}
              <div className="rounded-xl border border-line bg-paper p-4">
                <h4 className="font-bold text-[14px] text-ink">Fast Persona Switcher</h4>
                <div className="mt-2 grid gap-2 sm:grid-cols-3">
                  {PERSONAS.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => {
                        onSelectPersona(p);
                        onClose();
                      }}
                      className={`rounded-lg border p-2 text-left text-[12px] transition-colors ${
                        activePersona?.id === p.id
                          ? "border-kept bg-white font-bold text-kept"
                          : "border-line bg-white text-ink hover:border-kept/60"
                      }`}
                    >
                      <strong className="block">{p.name}</strong>
                      <span className="text-muted truncate block">{p.city}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-line bg-paper px-5 py-3 text-[12px] text-muted">
          <span>KormoPath • Autonomous AI Platform for Bangladeshi Youth</span>
          <button
            onClick={onClose}
            className="rounded-lg bg-ink px-4 py-1.5 text-[12px] font-semibold text-white hover:bg-ink/90 transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

