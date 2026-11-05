"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Navbar, Footer } from "@/components/Chrome";
import { EcosystemHub } from "@/components/EcosystemHub";
import { FX_FALLBACK } from "@/lib/data";
import {
  GraduationCap,
  Pill,
  Wallet,
  Sprout,
  Mic,
  Percent,
  Sparkles,
  ArrowRight,
  ArrowUpRight,
  ShieldCheck,
  CheckCircle2,
  ChevronDown,
  Layers,
  Target,
  Trophy,
  Zap,
  Activity,
  Globe,
  Compass,
} from "lucide-react";

export default function HomePage() {
  const [isEcosystemOpen, setIsEcosystemOpen] = useState(false);
  const [lang, setLang] = useState<"en" | "bn">("bn");
  const [fx, setFx] = useState({ usdBdt: FX_FALLBACK.usdBdt, live: false });

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/fx", { signal: controller.signal })
      .then((response) => response.json())
      .then((data: { usdBdt?: unknown; live?: unknown }) => {
        if (typeof data.usdBdt === "number" && Number.isFinite(data.usdBdt) && data.usdBdt > 80 && data.usdBdt < 250) {
          setFx({ usdBdt: data.usdBdt, live: data.live === true });
        }
      })
      .catch(() => { /* keep the labelled local reference rate when live FX is unavailable */ });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang === "bn" ? "bn" : "en";
    return () => { document.documentElement.lang = "bn"; };
  }, [lang]);

  return (
    <div className="min-h-screen bg-[#fafaf9] text-ink font-sans antialiased selection:bg-kept-soft selection:text-kept">
      {/* Top Navbar */}
      <Navbar
        lang={lang}
        setLang={setLang}
        usdBdt={fx.usdBdt}
        fxLive={fx.live}
        onOpenEcosystem={() => setIsEcosystemOpen(true)}
        isEcosystemOpen={isEcosystemOpen}
      />

      <main id="main" className="mx-auto max-w-[1360px] px-4 space-y-16 py-8 sm:py-12">
        {/* =========================================================
            HERO SECTION: Modern, Clean & High-Impact
            ========================================================= */}
        <section aria-label="Hero" className="home-hero relative pt-4 sm:pt-8 pb-6">
          <div className="mx-auto max-w-4xl text-center">
            {/* Official KormoPath Logo Emblem */}
            <div className="flex justify-center mb-6">
              <div className="inline-flex items-center gap-3.5 p-2 pr-6 rounded-2xl bg-white/95 border border-slate-200/90 shadow-md shadow-slate-200/40 backdrop-blur-md hover:scale-[1.01] transition-all">
                <img
                  src="/kormopath-logo.jpg"
                  alt="KormoPath Logo"
                  className="h-12 sm:h-14 w-auto rounded-xl object-contain shadow-xs border border-slate-100"
                />
                <div className="text-left">
                  <span className="block text-[18px] font-extrabold leading-tight">
                    <span className="text-[#070d1e]">Kormo</span>
                    <span className="bg-gradient-to-r from-orange-600 via-amber-500 to-orange-500 bg-clip-text text-transparent">Path</span>
                  </span>
                  <span className="block text-[11px] font-semibold text-orange-600 leading-none mt-0.5">স্বয়ংক্রিয় এআই ইকোসিস্টেম</span>
                </div>
              </div>
            </div>

            {/* Top Badge */}
            <div className="inline-flex items-center gap-2 rounded-full border border-orange-200/80 bg-orange-50/70 px-4 py-1.5 text-[12px] sm:text-[13px] font-bold text-orange-700 shadow-xs mb-6">
              <Sparkles size={15} className="text-orange-500 animate-pulse" />
              <span>Six practical apps for Bangladesh</span>
            </div>

            {/* Main Headline */}
            <h1 className="display text-[38px] sm:text-[58px] font-extrabold tracking-tight text-[#070d1e] leading-[1.08]">
              {lang === "bn" ? (
                <>
                  বাংলাদেশের তরুণদের জন্য <br className="hidden sm:inline" />
                  <span className="bg-gradient-to-r from-orange-600 via-amber-500 to-blue-600 bg-clip-text text-transparent">
                    স্বয়ংক্রিয় এআই
                  </span>{" "}
                  ইকোসিস্টেম
                </>
              ) : (
                <>
                  Autonomous AI Solutions <br className="hidden sm:inline" />
                  for{" "}
                  <span className="bg-gradient-to-r from-orange-600 via-amber-500 to-blue-600 bg-clip-text text-transparent">
                    Bangladeshi Youth
                  </span>
                </>
              )}
            </h1>

            {/* Subtitle */}
            <p className="mt-5 text-[16px] sm:text-[19px] text-muted max-w-3xl mx-auto leading-relaxed">
              {lang === "bn"
                ? "শিক্ষা, স্বাস্থ্য, বাজেট, কৃষি, ভাইভা অনুশীলন ও ফ্রিল্যান্স ফি — বাংলাদেশের বাস্তব কাজের জন্য ৬টি আলাদা অ্যাপ। হিসাব নির্ধারিত নিয়মে, উৎসসহ; ডেটা আপনার ডিভাইসে।"
                : "Six separate apps for Bangladesh: university admission planning, prescription reading with safety flags, Bangla voice budgeting with confirmation, farm trip and weather tools, viva practice, and freelance fee comparison. Calculations are deterministic and sourced; your data stays on your device."}
            </p>

            {/* Hero CTAs */}
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3 sm:gap-4">
              <a
                href="#apps-showcase"
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-orange-600 via-amber-500 to-orange-600 px-6 py-3.5 text-[15px] font-bold text-white shadow-lg shadow-orange-500/25 hover:shadow-xl hover:shadow-orange-500/35 hover:scale-[1.02] active:scale-[0.99] transition-all"
              >
                <span>{lang === "bn" ? "৬টি অ্যাপ দেখুন" : "Explore all 6 apps"}</span>
                <ArrowRight size={16} />
              </a>

              <Link
                href="/admitbuddy"
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-6 py-3.5 text-[15px] font-bold text-slate-900 hover:border-orange-500 hover:text-orange-600 transition-all shadow-xs"
              >
                <GraduationCap size={18} className="text-indigo-600" />
                <span>{lang === "bn" ? "এডমিট-বাডি (টপ পিক)" : "AdmitBuddy (Top Pick)"}</span>
              </Link>

              <button
                onClick={() => setIsEcosystemOpen(true)}
                className="inline-flex items-center gap-2 rounded-xl bg-slate-100 hover:bg-slate-200 px-5 py-3.5 text-[14px] font-semibold text-slate-700 transition-colors"
              >
                <Layers size={16} />
                <span>9-Dot Launcher</span>
              </button>
            </div>
          </div>

          {/* Clean Ecosystem Status Cards Row */}
          <div className="home-app-quick mt-12 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6 text-left">
            <Link
              href="/admitbuddy"
              className="home-app-quick-card group rounded-2xl border border-line bg-white p-3.5 hover:border-indigo-500 hover:shadow-sm transition-all"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                  <GraduationCap size={18} />
                </span>
                <ArrowUpRight size={15} className="home-app-arrow text-slate-400 transition-transform" aria-hidden />
              </div>
              <h4 className="text-[14px] font-bold text-ink group-hover:text-indigo-600 transition-colors">
                AdmitBuddy
              </h4>
              <p className="text-[11px] text-muted">Education Track</p>
            </Link>

            <Link
              href="/mediscan"
              className="home-app-quick-card group rounded-2xl border border-line bg-white p-3.5 hover:border-rose-500 hover:shadow-sm transition-all"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-50 text-rose-600">
                  <Pill size={18} />
                </span>
                <ArrowUpRight size={15} className="home-app-arrow text-slate-400 transition-transform" aria-hidden />
              </div>
              <h4 className="text-[14px] font-bold text-ink group-hover:text-rose-600 transition-colors">
                MediScan BD
              </h4>
              <p className="text-[11px] text-muted">Health Track</p>
            </Link>

            <Link
              href="/shohoj-budget"
              className="home-app-quick-card group rounded-2xl border border-line bg-white p-3.5 hover:border-amber-500 hover:shadow-sm transition-all"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
                  <Wallet size={18} />
                </span>
                <ArrowUpRight size={15} className="home-app-arrow text-slate-400 transition-transform" aria-hidden />
              </div>
              <h4 className="text-[14px] font-bold text-ink group-hover:text-amber-600 transition-colors">
                Shohoj Budget
              </h4>
              <p className="text-[11px] text-muted">Voice Finance</p>
            </Link>

            <Link
              href="/haatbazar"
              className="home-app-quick-card group rounded-2xl border border-line bg-white p-3.5 hover:border-emerald-600 hover:shadow-sm transition-all"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
                  <Sprout size={18} />
                </span>
                <ArrowUpRight size={15} className="home-app-arrow text-slate-400 transition-transform" aria-hidden />
              </div>
              <h4 className="text-[14px] font-bold text-ink group-hover:text-emerald-700 transition-colors">
                HaatBazar AI
              </h4>
              <p className="text-[11px] text-muted">Agriculture Track</p>
            </Link>

            <Link
              href="/probaho"
              className="home-app-quick-card group rounded-2xl border border-line bg-white p-3.5 hover:border-blue-600 hover:shadow-sm transition-all"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                  <Mic size={18} />
                </span>
                <ArrowUpRight size={15} className="home-app-arrow text-slate-400 transition-transform" aria-hidden />
              </div>
              <h4 className="text-[14px] font-bold text-ink group-hover:text-blue-600 transition-colors">
                Probaho Coach
              </h4>
              <p className="text-[11px] text-muted">Viva Speaking</p>
            </Link>

            <Link
              href="/feeguard"
              className="home-app-quick-card group rounded-2xl border border-line bg-white p-3.5 hover:border-teal-600 hover:shadow-sm transition-all"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-50 text-teal-700">
                  <Percent size={18} />
                </span>
                <ArrowUpRight size={15} className="home-app-arrow text-slate-400 transition-transform" aria-hidden />
              </div>
              <h4 className="text-[14px] font-bold text-ink group-hover:text-teal-700 transition-colors">
                FeeGuard BD
              </h4>
              <p className="text-[11px] text-muted">20% Fee Saver</p>
            </Link>
          </div>
        </section>

        {/* =========================================================
            FEATURED WORKABLE APPLICATIONS (The Core Showcase)
            ========================================================= */}
        <section id="apps-showcase" aria-label="Workable Applications" className="space-y-6 pt-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <span className="text-[12px] font-bold text-kept uppercase tracking-wider">
                Six apps, one KormoPath
              </span>
              <h2 className="display text-[28px] sm:text-[34px] font-extrabold text-ink mt-0.5">
                {lang === "bn" ? "৬টি সমন্বিত কার্যকর অ্যাপ" : "6 Workable Applications"}
              </h2>
              <p className="text-[15px] text-muted">
                {lang === "bn"
                  ? "প্রতিটি অ্যাপ্লিকেশন নির্দিষ্ট ডোমেন অনুযায়ী তৈরি এবং সরাসরি ব্যবহারযোগ্য।"
                  : "Every application is engineered directly with real data and interactive features."}
              </p>
            </div>

            <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[12px] font-bold text-emerald-800">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              <span>৬টি অ্যাপ · খুলে ব্যবহার করুন</span>
            </div>
          </div>

          <div className="home-app-grid grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {/* 1. AdmitBuddy */}
            <div className="home-app-card group rounded-3xl border border-line bg-white p-6 shadow-xs hover:border-indigo-500 hover:shadow-md transition-all flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 text-[22px]">
                    🏆
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    OPEN APP
                  </span>
                </div>
                <h3 className="font-extrabold text-[20px] text-ink mt-4 group-hover:text-indigo-600 transition-colors">
                  AdmitBuddy
                </h3>
                <span className="text-[11px] font-bold text-indigo-700 uppercase tracking-wide block mt-0.5">
                  Education &amp; Career Track
                </span>
                <p className="text-[14px] text-muted mt-2.5 leading-relaxed">
                  Matches Bangladeshi students with BUET/DU (Reach) vs SUST (Match) vs BRAC 50% waiver (Safety), auto-calculates GPA fit, and drafts admission essays.
                </p>
                <div className="mt-4 flex flex-wrap gap-1.5">
                  <span className="text-[11px] font-semibold bg-slate-50 border border-line px-2 py-0.5 rounded text-slate-700">18 Universities</span>
                  <span className="text-[11px] font-semibold bg-slate-50 border border-line px-2 py-0.5 rounded text-slate-700">GPA Cutoffs</span>
                  <span className="text-[11px] font-semibold bg-slate-50 border border-line px-2 py-0.5 rounded text-slate-700">AI SOP Studio</span>
                </div>
              </div>
              <Link
                href="/admitbuddy"
                className="mt-6 flex items-center justify-between rounded-xl bg-indigo-600 px-4 py-3 text-[14px] font-bold text-white hover:bg-indigo-700 transition-all shadow-xs group-hover:shadow"
              >
                <span>Launch AdmitBuddy</span>
                <ArrowRight size={15} className="group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </div>

            {/* 2. MediScan BD */}
            <div className="home-app-card group rounded-3xl border border-line bg-white p-6 shadow-xs hover:border-rose-500 hover:shadow-md transition-all flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 text-[22px]">
                    💊
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    OPEN APP
                  </span>
                </div>
                <h3 className="font-extrabold text-[20px] text-ink mt-4 group-hover:text-rose-600 transition-colors">
                  MediScan BD
                </h3>
                <span className="text-[11px] font-bold text-rose-700 uppercase tracking-wide block mt-0.5">
                  Health &amp; Services Track
                </span>
                <p className="text-[14px] text-muted mt-2.5 leading-relaxed">
                  Reads prescription text (photo reading optional, with consent), explains the written dose in plain Bangla, flags duplicate ingredients and urgent symptoms, and compares prices you were quoted.
                </p>
                <div className="mt-4 flex flex-wrap gap-1.5">
                  <span className="text-[11px] font-semibold bg-slate-50 border border-line px-2 py-0.5 rounded text-slate-700">Prescription reader</span>
                  <span className="text-[11px] font-semibold bg-slate-50 border border-line px-2 py-0.5 rounded text-slate-700">Bangla Timetable</span>
                  <span className="text-[11px] font-semibold bg-slate-50 border border-line px-2 py-0.5 rounded text-slate-700">Generic Savings</span>
                </div>
              </div>
              <Link
                href="/mediscan"
                className="mt-6 flex items-center justify-between rounded-xl bg-rose-600 px-4 py-3 text-[14px] font-bold text-white hover:bg-rose-700 transition-all shadow-xs group-hover:shadow"
              >
                <span>Launch MediScan BD</span>
                <ArrowRight size={15} className="group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </div>

            {/* 3. Shohoj Budget */}
            <div className="home-app-card group rounded-3xl border border-line bg-white p-6 shadow-xs hover:border-amber-500 hover:shadow-md transition-all flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 text-[22px]">
                    💰
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    OPEN APP
                  </span>
                </div>
                <h3 className="font-extrabold text-[20px] text-ink mt-4 group-hover:text-amber-600 transition-colors">
                  Shohoj Budget
                </h3>
                <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wide block mt-0.5">
                  Finance &amp; Productivity Track
                </span>
                <p className="text-[14px] text-muted mt-2.5 leading-relaxed">
                  Say or type “আজকে বাজারে ১২০০ টাকা খরচ করেছি”: it understands amount and category, asks you to confirm, then saves. Monthly budget, income, recurring items, SMS import and CSV export.
                </p>
                <div className="mt-4 flex flex-wrap gap-1.5">
                  <span className="text-[11px] font-semibold bg-slate-50 border border-line px-2 py-0.5 rounded text-slate-700">Bangla Speech AI</span>
                  <span className="text-[11px] font-semibold bg-slate-50 border border-line px-2 py-0.5 rounded text-slate-700">Daily Safe Limit</span>
                  <span className="text-[11px] font-semibold bg-slate-50 border border-line px-2 py-0.5 rounded text-slate-700">bKash SMS</span>
                </div>
              </div>
              <Link
                href="/shohoj-budget"
                className="mt-6 flex items-center justify-between rounded-xl bg-amber-600 px-4 py-3 text-[14px] font-bold text-white hover:bg-amber-700 transition-all shadow-xs group-hover:shadow"
              >
                <span>Launch Shohoj Budget</span>
                <ArrowRight size={15} className="group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </div>

            {/* 4. HaatBazar AI */}
            <div className="home-app-card group rounded-3xl border border-line bg-white p-6 shadow-xs hover:border-emerald-600 hover:shadow-md transition-all flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700 text-[22px]">
                    🌾
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    OPEN APP
                  </span>
                </div>
                <h3 className="font-extrabold text-[20px] text-ink mt-4 group-hover:text-emerald-700 transition-colors">
                  HaatBazar AI
                </h3>
                <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wide block mt-0.5">
                  Agriculture &amp; Marketplace Track
                </span>
                <p className="text-[14px] text-muted mt-2.5 leading-relaxed">
                  Checks whether a distant market really pays more after transport, commission and losses; keeps a dated price notebook; and checks the forecast before spraying. No invented prices.
                </p>
                <div className="mt-4 flex flex-wrap gap-1.5">
                  <span className="text-[11px] font-semibold bg-slate-50 border border-line px-2 py-0.5 rounded text-slate-700">64-District Mandis</span>
                  <span className="text-[11px] font-semibold bg-slate-50 border border-line px-2 py-0.5 rounded text-slate-700">Karwan Bazar Spread</span>
                  <span className="text-[11px] font-semibold bg-slate-50 border border-line px-2 py-0.5 rounded text-slate-700">Shared Truck</span>
                </div>
              </div>
              <Link
                href="/haatbazar"
                className="mt-6 flex items-center justify-between rounded-xl bg-emerald-700 px-4 py-3 text-[14px] font-bold text-white hover:bg-emerald-800 transition-all shadow-xs group-hover:shadow"
              >
                <span>Launch HaatBazar AI</span>
                <ArrowRight size={15} className="group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </div>

            {/* 5. Probaho Speaking Coach */}
            <div className="home-app-card group rounded-3xl border border-line bg-white p-6 shadow-xs hover:border-blue-600 hover:shadow-md transition-all flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 text-[22px]">
                    🗣️
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    OPEN APP
                  </span>
                </div>
                <h3 className="font-extrabold text-[20px] text-ink mt-4 group-hover:text-blue-600 transition-colors">
                  Probaho Speaking Coach
                </h3>
                <span className="text-[11px] font-bold text-blue-700 uppercase tracking-wide block mt-0.5">
                  Productivity &amp; Career Track
                </span>
                <p className="text-[14px] text-muted mt-2.5 leading-relaxed">
                  Speak or type an answer to a viva or interview question and see which expected topics you covered, structure, filler words and real pace, with a follow-up question. No accent scoring.
                </p>
                <div className="mt-4 flex flex-wrap gap-1.5">
                  <span className="text-[11px] font-semibold bg-slate-50 border border-line px-2 py-0.5 rounded text-slate-700">Live Audio Radar</span>
                  <span className="text-[11px] font-semibold bg-slate-50 border border-line px-2 py-0.5 rounded text-slate-700">Filler-Word Counter</span>
                  <span className="text-[11px] font-semibold bg-slate-50 border border-line px-2 py-0.5 rounded text-slate-700">130 WPM Pacing</span>
                </div>
              </div>
              <Link
                href="/probaho"
                className="mt-6 flex items-center justify-between rounded-xl bg-blue-600 px-4 py-3 text-[14px] font-bold text-white hover:bg-blue-700 transition-all shadow-xs group-hover:shadow"
              >
                <span>Launch Probaho Coach</span>
                <ArrowRight size={15} className="group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </div>

            {/* 6. FeeGuard BD */}
            <div className="home-app-card group rounded-3xl border border-line bg-white p-6 shadow-xs hover:border-teal-600 hover:shadow-md transition-all flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-50 text-teal-700 text-[22px]">
                    💸
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    OPEN APP
                  </span>
                </div>
                <h3 className="font-extrabold text-[20px] text-ink mt-4 group-hover:text-teal-700 transition-colors">
                  FeeGuard BD
                </h3>
                <span className="text-[11px] font-bold text-teal-700 uppercase tracking-wide block mt-0.5">
                  FinOps &amp; Remittance Track
                </span>
                <p className="text-[14px] text-muted mt-2.5 leading-relaxed">
                  Marketplace fee audit comparing Fiverr (-20%) vs Upwork (-10%) vs direct wire (+2.5% Bangladesh Bank cash incentive).
                </p>
                <div className="mt-4 flex flex-wrap gap-1.5">
                  <span className="text-[11px] font-semibold bg-slate-50 border border-line px-2 py-0.5 rounded text-slate-700">Fiverr 20% Audit</span>
                  <span className="text-[11px] font-semibold bg-slate-50 border border-line px-2 py-0.5 rounded text-slate-700">+2.5% Incentive</span>
                  <span className="text-[11px] font-semibold bg-slate-50 border border-line px-2 py-0.5 rounded text-slate-700">Pitch AI</span>
                </div>
              </div>
              <Link
                href="/feeguard"
                className="mt-6 flex items-center justify-between rounded-xl bg-teal-700 px-4 py-3 text-[14px] font-bold text-white hover:bg-teal-800 transition-all shadow-xs group-hover:shadow"
              >
                <span>Launch FeeGuard BD</span>
                <ArrowRight size={15} className="group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </div>
          </div>
        </section>

        {/* =========================================================
            CORE VALUE PILLARS (Why KormoPath Wins)
            ========================================================= */}
        <section aria-label="Key Pillars" className="rounded-3xl border border-line bg-white p-8 sm:p-10 shadow-xs">
          <div className="max-w-2xl mb-8">
            <span className="text-[12px] font-bold text-kept uppercase tracking-wider">
              Engineering Excellence
            </span>
            <h2 className="display text-[26px] sm:text-[32px] font-extrabold text-ink mt-1">
              Built Specifically for Bangladesh
            </h2>
            <p className="text-[15px] text-muted mt-2">
              Every model, calculation, and interface is custom-grounded in Bangladeshi regulatory, linguistic, and financial realities.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            <div className="rounded-2xl border border-line bg-paper/50 p-6 space-y-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-kept-soft text-kept font-bold text-[18px]">
                🛡️
              </span>
              <h3 className="font-extrabold text-[17px] text-ink">Grounded, Checked Output</h3>
              <p className="text-[13px] text-muted leading-relaxed">
                Money math and cutoffs run in pure deterministic TypeScript with strict invariant reconciliation. No probabilistic LLM hallucinated rates or fees.
              </p>
            </div>

            <div className="rounded-2xl border border-line bg-paper/50 p-6 space-y-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700 font-bold text-[18px]">
                🇧🇩
              </span>
              <h3 className="font-extrabold text-[17px] text-ink">Native Bangla Language AI</h3>
              <p className="text-[13px] text-muted leading-relaxed">
                Direct integration with browser speech recognition for native Bangladeshi Bangla (<code className="font-mono text-ink text-[12px]">bn-BD</code>) without expensive third-party APIs.
              </p>
            </div>

            <div className="rounded-2xl border border-line bg-paper/50 p-6 space-y-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-700 font-bold text-[18px]">
                ⚡
              </span>
              <h3 className="font-extrabold text-[17px] text-ink">Offline-Resilient Architecture</h3>
              <p className="text-[13px] text-muted leading-relaxed">
                Designed to operate during national network disruptions with local storage caching, Web Workers, and Clause 4 blackout protection templates.
              </p>
            </div>
          </div>
        </section>

        {/* =========================================================
            FAQ SECTION
            ========================================================= */}
        <section id="faq" aria-label="FAQ" className="rounded-3xl border border-line bg-white p-8 sm:p-10 shadow-xs">
          <div className="max-w-2xl mb-8">
            <span className="text-[12px] font-bold text-kept uppercase tracking-wider">
              Judges &amp; Visitors FAQ
            </span>
            <h2 className="display text-[26px] sm:text-[32px] font-extrabold text-ink mt-1">
              Frequently Asked Questions
            </h2>
          </div>

          <div className="space-y-3">
            <details className="group rounded-2xl border border-line bg-paper/40 p-4 transition-all" open>
              <summary className="flex cursor-pointer items-center justify-between font-bold text-[16px] text-ink list-none">
                <span>Are all 5 applications actually functional or just mockups?</span>
                <ChevronDown size={18} className="text-muted group-open:rotate-180 transition-transform" />
              </summary>
              <p className="mt-3 text-[14px] text-muted leading-relaxed">
                Each app works on its own without an account. AdmitBuddy tracks deadlines you copy from official circulars; MediScan BD reads prescription text and never diagnoses; Shohoj Budget confirms every voice entry before saving; HaatBazar AI calculates with your prices and live weather; Probaho Coach gives transparent feedback; FeeGuard BD shows every fee with its source.
              </p>
            </details>

            <details className="group rounded-2xl border border-line bg-paper/40 p-4 transition-all">
              <summary className="flex cursor-pointer items-center justify-between font-bold text-[16px] text-ink list-none">
                <span>How do I switch between the applications during testing?</span>
                <ChevronDown size={18} className="text-muted group-open:rotate-180 transition-transform" />
              </summary>
              <p className="mt-3 text-[14px] text-muted leading-relaxed">
                You can switch between apps from the <strong>app menu in the top-right corner</strong> on every page. See what each app stores on your device in <a href="/settings" className="underline">Data &amp; privacy settings</a>.
              </p>
            </details>
          </div>
        </section>

        {/* Bottom CTA Banner with Midnight Navy & Glowing Orange Theme */}
        <section aria-label="Call to Action" className="relative overflow-hidden rounded-3xl border border-slate-800 bg-[#070d1e] p-8 sm:p-14 text-center shadow-2xl text-white">
          <div className="absolute top-0 right-0 -mr-20 -mt-20 h-64 w-64 rounded-full bg-orange-500/15 blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 -ml-20 -mb-20 h-64 w-64 rounded-full bg-blue-500/15 blur-3xl pointer-events-none" />
          <div className="relative mx-auto max-w-2xl">
            <span className="inline-block rounded-full border border-orange-500/30 bg-orange-500/10 px-4 py-1 text-[12px] font-bold text-amber-300 uppercase tracking-wider">
              Autonomous AI Platform
            </span>
            <h2 className="display text-[28px] sm:text-[40px] font-extrabold text-white mt-4 leading-tight">
              Ready to Test the Future of Bangladeshi Youth AI?
            </h2>
            <p className="text-[15px] text-slate-300 mt-3.5 leading-relaxed">
              Experience all six practical apps right now without signing up.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3.5">
              <Link
                href="/admitbuddy"
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-orange-600 to-amber-500 px-6 py-3.5 text-[15px] font-bold text-white shadow-lg shadow-orange-600/30 hover:scale-[1.02] transition-all"
              >
                <span>Launch AdmitBuddy (Track #1)</span>
                <ArrowRight size={16} />
              </Link>
              <button
                onClick={() => setIsEcosystemOpen(true)}
                className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 hover:bg-white/15 px-5 py-3.5 text-[14px] font-bold text-white transition-all backdrop-blur"
              >
                <span>Open 9-Dot App Hub</span>
              </button>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <Footer />

      {/* 9-Dot Ecosystem Hub Modal */}
      <EcosystemHub
        isOpen={isEcosystemOpen}
        onClose={() => setIsEcosystemOpen(false)}
        activePersona={null}
        onSelectPersona={() => {}}
        lang={lang}
        usdBdt={fx.usdBdt}
      />
    </div>
  );
}
