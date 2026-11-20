"use client";

import { useEffect, useState } from "react";
import {
  X,
  Minus,
  Plus,
  CheckCircle2,
  ChevronRight,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  UserCheck,
  Lock,
  Globe,
  BriefcaseBusiness,
  GraduationCap,
  HeartPulse,
  Scale,
  ShieldCheck as ShieldIcon,
  Sprout,
  Wallet,
  Fingerprint,
  KeyRound,
  Compass,
} from "lucide-react";
import { KormoPathLogo, KormoPathMark } from "@/components/brand/KormoPathLogo";
import {
  PERSONAS,
  type UserPersona,
  type UserSession,
  createSessionFromPersona,
  getStoredSession,
  saveStoredSession,
  SINGLE_APP_PRICE_BDT,
  ALL_ACCESS_PRICE_BDT,
} from "@/lib/session";

interface PersonaLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang?: "bn" | "en";
  onSelectPersona?: (persona: UserPersona) => void;
}

/**
 * macOS-grade squircle avatar tile with continuous curves,
 * specular reflection, and vibrant multi-stop Apple gradients.
 */
function PersonaAvatar({ icon }: { icon: "farmer" | "health" | "pro" | "guest" }) {
  if (icon === "farmer") {
    return (
      <div className="relative flex h-13 w-13 shrink-0 items-center justify-center rounded-[18px] bg-gradient-to-br from-emerald-400 via-emerald-600 to-teal-800 text-white shadow-[inset_0_1.5px_1px_rgba(255,255,255,0.65),inset_0_-1.5px_2px_rgba(0,0,0,0.22),0_8px_20px_-4px_rgba(16,185,129,0.45)] ring-1 ring-white/35 group-hover:scale-105 group-hover:shadow-[inset_0_1.5px_1px_rgba(255,255,255,0.8),0_10px_24px_-4px_rgba(16,185,129,0.55)] transition-all duration-200">
        <Sprout size={25} strokeWidth={2.3} className="drop-shadow-xs" />
        <span
          className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-[7px] bg-gradient-to-br from-amber-300 via-amber-400 to-amber-600 text-[10px] text-amber-950 font-black shadow-[0_2px_5px_rgba(0,0,0,0.2),inset_0_1px_0.5px_rgba(255,255,255,0.7)] ring-1.5 ring-white select-none"
          title="কৃষি ও পল্লী"
        >
          🌾
        </span>
      </div>
    );
  }
  if (icon === "health") {
    return (
      <div className="relative flex h-13 w-13 shrink-0 items-center justify-center rounded-[18px] bg-gradient-to-br from-sky-400 via-blue-600 to-indigo-800 text-white shadow-[inset_0_1.5px_1px_rgba(255,255,255,0.65),inset_0_-1.5px_2px_rgba(0,0,0,0.22),0_8px_20px_-4px_rgba(37,99,235,0.45)] ring-1 ring-white/35 group-hover:scale-105 group-hover:shadow-[inset_0_1.5px_1px_rgba(255,255,255,0.8),0_10px_24px_-4px_rgba(37,99,235,0.55)] transition-all duration-200">
        <HeartPulse size={25} strokeWidth={2.3} className="drop-shadow-xs" />
        <span
          className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-[7px] bg-gradient-to-br from-rose-400 via-rose-500 to-rose-700 text-[10px] text-white font-black shadow-[0_2px_5px_rgba(0,0,0,0.2),inset_0_1px_0.5px_rgba(255,255,255,0.7)] ring-1.5 ring-white select-none"
          title="স্বাস্থ্য ও সেবা"
        >
          🩺
        </span>
      </div>
    );
  }
  if (icon === "pro") {
    return (
      <div className="relative flex h-13 w-13 shrink-0 items-center justify-center rounded-[18px] bg-gradient-to-br from-amber-400 via-orange-500 to-amber-700 text-white shadow-[inset_0_1.5px_1px_rgba(255,255,255,0.7),inset_0_-1.5px_2px_rgba(0,0,0,0.22),0_8px_20px_-4px_rgba(245,158,11,0.48)] ring-1 ring-white/40 group-hover:scale-105 group-hover:shadow-[inset_0_1.5px_1px_rgba(255,255,255,0.85),0_10px_24px_-4px_rgba(245,158,11,0.6)] transition-all duration-200">
        <Sparkles size={25} strokeWidth={2.3} className="drop-shadow-xs" />
        <span
          className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-[7px] bg-gradient-to-br from-amber-200 via-yellow-300 to-amber-500 text-[11px] text-amber-950 font-black shadow-[0_2px_5px_rgba(0,0,0,0.2),inset_0_1px_0.5px_rgba(255,255,255,0.7)] ring-1.5 ring-white select-none"
          title="অল-অ্যাক্সেস প্রো"
        >
          ★
        </span>
      </div>
    );
  }
  return (
    <div className="relative flex h-13 w-13 shrink-0 items-center justify-center rounded-[18px] bg-gradient-to-br from-slate-500 via-slate-700 to-slate-900 text-white shadow-[inset_0_1.5px_1px_rgba(255,255,255,0.55),inset_0_-1.5px_2px_rgba(0,0,0,0.25),0_8px_20px_-4px_rgba(51,65,85,0.4)] ring-1 ring-white/25 group-hover:scale-105 group-hover:shadow-[inset_0_1.5px_1px_rgba(255,255,255,0.7),0_10px_24px_-4px_rgba(51,65,85,0.5)] transition-all duration-200">
      <Compass size={25} strokeWidth={2.3} className="drop-shadow-xs" />
      <span
        className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-[7px] bg-gradient-to-br from-slate-200 via-slate-300 to-slate-400 text-[10px] text-slate-800 font-black shadow-[0_2px_5px_rgba(0,0,0,0.2),inset_0_1px_0.5px_rgba(255,255,255,0.7)] ring-1.5 ring-white select-none"
        title="পাবলিক গেস্ট"
      >
        🌐
      </span>
    </div>
  );
}

export function PersonaLoginModal({
  isOpen,
  onClose,
  lang = "bn",
  onSelectPersona,
}: PersonaLoginModalProps) {
  const [activeSession, setActiveSession] = useState<UserSession | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const bn = lang === "bn";

  useEffect(() => {
    if (!isOpen) {
      setShowSuccess(false);
      return;
    }
    const current = getStoredSession();
    setActiveSession(current);
    if (current) {
      setSelectedId(current.personaId);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleChoose = (persona: UserPersona) => {
    setSelectedId(persona.id);
    const session = createSessionFromPersona(persona);
    saveStoredSession(session);
    setActiveSession(session);
    setShowSuccess(true);

    if (onSelectPersona) {
      onSelectPersona(persona);
    }

    setTimeout(() => {
      onClose();
      setShowSuccess(false);
    }, 600);
  };

  const handlePublicMode = () => {
    setSelectedId(null);
    saveStoredSession(null);
    setActiveSession(null);
    setShowSuccess(true);

    setTimeout(() => {
      onClose();
      setShowSuccess(false);
    }, 400);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="persona-modal-title"
      className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-4 md:p-6"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/70 backdrop-blur-md transition-opacity duration-300"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Card */}
      <div className="relative w-full max-w-4xl max-h-[92vh] overflow-y-auto md:overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-slate-900/10 transition-all duration-300 md:grid md:grid-cols-12 md:min-h-[620px]">
        {/* Left Panel: Animated Civic Constellation & Poetic Soul of Bengal (Zero Farmer Photo) */}
        <div className="relative hidden flex-col justify-between overflow-hidden bg-gradient-to-br from-[#062419] via-[#0b3827] to-[#041c13] p-7 text-white md:col-span-5 md:flex select-none">
          {/* Luminous Animated Aurora & Mesh Grid Background (Replaces static photo) */}
          <div className="pointer-events-none absolute inset-0 z-0">
            {/* Radial glow orbs */}
            <div className="absolute -top-16 -left-16 h-64 w-64 rounded-full bg-emerald-500/20 blur-3xl" />
            <div className="absolute top-1/2 -right-20 h-72 w-72 rounded-full bg-amber-500/15 blur-3xl" />
            <div className="absolute -bottom-16 left-1/4 h-64 w-64 rounded-full bg-teal-400/20 blur-3xl" />
            
            {/* Geometric perspective grid */}
            <svg
              className="absolute inset-0 h-full w-full opacity-15"
              xmlns="http://www.w3.org/2000/svg"
              width="100%"
              height="100%"
            >
              <defs>
                <pattern id="civic-grid" width="32" height="32" patternUnits="userSpaceOnUse">
                  <path d="M 32 0 L 0 0 0 32" fill="none" stroke="#6ee7b7" strokeWidth="0.5" strokeDasharray="2 4" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#civic-grid)" />
            </svg>
          </div>

          {/* Top Card: KormoPath Integrated Projects Showcase */}
          <div className="relative z-10 rounded-2xl border border-emerald-400/25 bg-black/40 p-4 backdrop-blur-md shadow-inner">
            <div className="flex items-center justify-between border-b border-emerald-500/20 pb-2 mb-2.5">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                  <Sparkles size={13} />
                </span>
                <span className="font-display text-[13.5px] font-bold text-white tracking-tight">
                  {bn ? "কর্মপথ প্রকল্প ও ইকোসিস্টেম" : "KormoPath Ecosystem"}
                </span>
              </div>
              <span className="rounded-full bg-emerald-500/15 border border-emerald-400/30 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
                {bn ? "৮টি ডোমেইন টুলস" : "8 Domain Tools"}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[11px] text-emerald-100/90">
              <div className="rounded-xl bg-white/5 p-2 border border-white/5 hover:bg-white/10 transition-colors">
                <div className="font-bold text-white flex items-center gap-1.5">
                  <span className="text-amber-300">🌾</span>
                  <span>{bn ? "মাঠসাথী ও হাট" : "Krishi & Haat"}</span>
                </div>
                <p className="mt-0.5 text-[10px] text-emerald-200/75 leading-tight">
                  {bn ? "ফসল রোগ ও বাজার দর" : "Crop health & market"}
                </p>
              </div>

              <div className="rounded-xl bg-white/5 p-2 border border-white/5 hover:bg-white/10 transition-colors">
                <div className="font-bold text-white flex items-center gap-1.5">
                  <span className="text-sky-300">🩺</span>
                  <span>{bn ? "মেডিস্ক্যান বিডি" : "MediScan BD"}</span>
                </div>
                <p className="mt-0.5 text-[10px] text-emerald-200/75 leading-tight">
                  {bn ? "প্রেসক্রিপশন ও ৯৯৯" : "Prescription & 999"}
                </p>
              </div>

              <div className="rounded-xl bg-white/5 p-2 border border-white/5 hover:bg-white/10 transition-colors">
                <div className="font-bold text-white flex items-center gap-1.5">
                  <span className="text-rose-300">🛡️</span>
                  <span>{bn ? "রক্ষা ও আইন" : "Rokkha & Legal"}</span>
                </div>
                <p className="mt-0.5 text-[10px] text-emerald-200/75 leading-tight">
                  {bn ? "প্রতারণা রোধ ও ১৬৬৯৯" : "Anti-scam & 16699"}
                </p>
              </div>

              <div className="rounded-xl bg-white/5 p-2 border border-white/5 hover:bg-white/10 transition-colors">
                <div className="font-bold text-white flex items-center gap-1.5">
                  <span className="text-emerald-300">💼</span>
                  <span>{bn ? "ফিগার্ড ও বাজেট" : "FinOps & Budget"}</span>
                </div>
                <p className="mt-0.5 text-[10px] text-emerald-200/75 leading-tight">
                  {bn ? "ফ্রিল্যান্স ফি ও সংসার" : "Fee leakage & wallets"}
                </p>
              </div>
            </div>
          </div>

          {/* Center: Dynamic Animated Civic Constellation Visual */}
          <div className="relative z-10 my-auto py-4 text-center">
            <div
              className="kp-civic-scene mx-auto"
              role="img"
              aria-label={bn
                ? "কর্মপথের শেখা, কাজ, স্বাস্থ্য, নিরাপত্তা, অর্থ ও কৃষির টুলগুলোকে ঘিরে একটি চলমান পথ"
                : "An animated path connecting KormoPath tools for learning, work, health, safety, money and farming"}
            >
              <svg className="kp-civic-scene-path" viewBox="0 0 240 200" aria-hidden="true">
                <ellipse cx="120" cy="100" rx="98" ry="70" />
                <ellipse className="kp-civic-scene-path-trail" cx="120" cy="100" rx="98" ry="70" />
                <ellipse className="kp-civic-scene-path-inner" cx="120" cy="100" rx="74" ry="52" />
              </svg>
              <span className="kp-civic-scene-node kp-civic-scene-node-1" title={bn ? "শিক্ষা ও অ্যাডমিশন" : "Study"}><GraduationCap size={18} /></span>
              <span className="kp-civic-scene-node kp-civic-scene-node-2" title={bn ? "কাজ ও চুক্তি" : "Work"}><BriefcaseBusiness size={18} /></span>
              <span className="kp-civic-scene-node kp-civic-scene-node-3" title={bn ? "স্বাস্থ্য ও প্রেসক্রিপশন" : "Health"}><HeartPulse size={18} /></span>
              <span className="kp-civic-scene-node kp-civic-scene-node-4" title={bn ? "সংসার ও বাজেট" : "Money"}><Wallet size={18} /></span>
              <span className="kp-civic-scene-node kp-civic-scene-node-5" title={bn ? "মাঠ ও কৃষি" : "Farming"}><Sprout size={18} /></span>
              <span className="kp-civic-scene-node kp-civic-scene-node-6" title={bn ? "সাইবার ও এমএফএস সুরক্ষা" : "Safety"}><ShieldIcon size={18} /></span>
              <span className="kp-civic-scene-node kp-civic-scene-node-7" title={bn ? "বিনামূল্যে আইনি সহায়তা" : "Legal"}><Scale size={18} /></span>
              <span className="kp-civic-scene-node kp-civic-scene-node-8" title={bn ? "কর্মপথ ইঞ্জিন" : "Core"}><KormoPathMark className="h-5 w-5" /></span>
              <span className="kp-civic-scene-mark">
                <KormoPathMark className="h-full w-full drop-shadow-[0_12px_24px_rgba(0,0,0,0.35)]" />
              </span>
            </div>
            <h3 className="mt-3 font-serif text-xl font-bold tracking-tight text-white">
              কর্মপথ / KormoPath
            </h3>
            <p className="mt-1 text-[12.5px] font-medium text-emerald-200">
              {bn ? "পড়া, কাজ, সংসার আর মাঠ — এক পথে সব হিসাব" : "Study, work, home, and field — all in one path"}
            </p>
          </div>

          {/* Bottom Card: Theme & Architecture Guarantee */}
          <div className="relative z-10 rounded-2xl bg-black/40 p-3.5 border border-emerald-400/25 backdrop-blur-md shadow-inner">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="flex h-5 w-5 items-center justify-center rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                <ShieldCheck size={13} />
              </span>
              <span className="font-display text-[12.5px] font-bold text-white tracking-tight">
                {bn ? "ডিভাইস-ফার্স্ট প্রাইভেসি ও ফ্রি সেবা" : "Device-First Privacy Architecture"}
              </span>
            </div>
            <p className="text-[11.5px] leading-relaxed text-emerald-200/90 font-medium">
              {bn
                ? "কোনো গোপন ক্লাউড ডাটাবেজ নেই। আপনার সব হিসাব ও প্রেসক্রিপশন সম্পূর্ণ আপনার নিজস্ব ডিভাইসে সংরক্ষিত। জরুরি স্বাস্থ্য ও আইনি সেবা সবার জন্য চিরকাল ফ্রি।"
                : "No cloud database. Sensitive health, contracts, and financial logs stay 100% on your local device. Essential emergency and civic legal aid stay permanently free."}
            </p>
            <div className="mt-2.5 flex items-center gap-1.5 flex-wrap text-[10px] font-bold">
              <span className="rounded-md bg-emerald-500/20 px-2 py-0.5 text-emerald-200 border border-emerald-400/25">
                ⚡ {bn ? "অফলাইন পিডব্লিউএ" : "Offline PWA"}
              </span>
              <span className="rounded-md bg-emerald-500/20 px-2 py-0.5 text-emerald-200 border border-emerald-400/25">
                🔒 {bn ? "জিরো ক্লাউড ট্র্যাকিং" : "Zero Cloud Tracking"}
              </span>
              <span className="rounded-md bg-amber-400/20 px-2 py-0.5 text-amber-200 border border-amber-400/25">
                🇧🇩 {bn ? "নাগরিক অধিকার" : "Civic First"}
              </span>
            </div>
          </div>
        </div>

        {/* Right Panel: Passwordless Persona Selector & bKash Packages */}
        <div className="flex flex-col justify-between p-6 sm:p-7 md:col-span-7 bg-slate-50/70 md:overflow-y-auto md:max-h-[88vh]">
          <div>
            <div className="mb-3 md:hidden">
              <KormoPathLogo variant="compact" size="sm" theme="light" />
            </div>

            {/* macOS Window Controls & Toolbar */}
            <div className="flex items-center justify-between border-b border-slate-200/70 pb-3 mb-3">
              {/* macOS Traffic Lights with Interactive Glyphs */}
              <div className="group flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="relative h-3 w-3 rounded-full bg-[#ff5f57] border border-[#e0443e]/80 shadow-[inset_0_1px_1px_rgba(255,255,255,0.4),0_0.5px_1px_rgba(0,0,0,0.15)] cursor-pointer hover:brightness-95 transition-all flex items-center justify-center"
                  title={bn ? "বন্ধ করুন" : "Close"}
                  aria-label={bn ? "বন্ধ করুন" : "Close"}
                >
                  <X size={8} strokeWidth={2.5} className="opacity-0 group-hover:opacity-100 text-[#4d0000] font-black transition-opacity" />
                </button>
                <span className="relative h-3 w-3 rounded-full bg-[#febc2e] border border-[#d89e24]/80 shadow-[inset_0_1px_1px_rgba(255,255,255,0.4),0_0.5px_1px_rgba(0,0,0,0.15)] flex items-center justify-center">
                  <Minus size={8} strokeWidth={2.5} className="opacity-0 group-hover:opacity-100 text-[#593d00] font-black transition-opacity" />
                </span>
                <span className="relative h-3 w-3 rounded-full bg-[#28c840] border border-[#1aab29]/80 shadow-[inset_0_1px_1px_rgba(255,255,255,0.4),0_0.5px_1px_rgba(0,0,0,0.15)] flex items-center justify-center">
                  <Plus size={8} strokeWidth={2.5} className="opacity-0 group-hover:opacity-100 text-[#0a4810] font-black transition-opacity" />
                </span>
                <span className="ml-2.5 inline-flex items-center gap-1.5 text-[11.5px] font-mono text-slate-400 font-semibold select-none">
                  <Lock size={10} className="text-slate-400" />
                  <span>kormopath.auth</span>
                </span>
              </div>

              {/* Language Switcher and Action Controls */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[12px] font-semibold text-slate-600 hover:bg-slate-200/70 hover:text-slate-900 transition-colors"
                >
                  <span>← ফিরে যান</span>
                </button>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200/90 bg-white/90 backdrop-blur-xs px-2.5 py-0.5 text-[11px] font-semibold text-slate-700 shadow-2xs">
                  <Globe size={11} className="text-emerald-700" />
                  <span>{bn ? "বাংলা" : "English"}</span>
                </span>
                <button
                  type="button"
                  onClick={onClose}
                  className="grid h-7 w-7 place-items-center rounded-full text-slate-400 hover:bg-slate-200/80 hover:text-slate-700 transition-colors"
                  aria-label={bn ? "বন্ধ করুন" : "Close"}
                >
                  <X size={15} />
                </button>
              </div>
            </div>

            {/* Title & Friendly Prompt */}
            <div className="mt-2">
              <h2 id="persona-modal-title" className="font-display text-[22px] sm:text-[24px] font-bold tracking-tight text-slate-900">
                {bn ? "কর্মপথ প্রোফাইল বেছে নিন" : "Choose a KormoPath profile"}
              </h2>
              <p className="mt-1 text-[13px] leading-relaxed text-slate-600 font-sans">
                {bn
                  ? "এই নমুনায় কোনো পাসওয়ার্ড বা ওটিপি নেই। নিচে থেকে আপনার মোড বেছে নিলেই চলবে, পরে যেকোনো সময় বদলানো বা লগআউট করা যায়।"
                  : "No passwords or OTP required. Simply choose a mode below to enter instantly; you can switch or log out anytime."}
              </p>
            </div>

            {/* macOS Passkey / Zero-Password Biometric Banner */}
            <div className="mt-3.5 flex items-center gap-3.5 rounded-2xl border border-emerald-500/25 bg-gradient-to-r from-emerald-500/10 via-teal-500/8 to-emerald-500/10 p-3.5 backdrop-blur-md shadow-xs">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] bg-gradient-to-br from-emerald-500 to-teal-700 text-white shadow-[inset_0_1px_1px_rgba(255,255,255,0.5),0_3px_10px_rgba(16,185,129,0.35)] ring-1 ring-white/30">
                <Fingerprint size={22} strokeWidth={2.2} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-display font-bold text-[14px] text-emerald-950 tracking-tight">
                    {bn ? "জিরো-পাসওয়ার্ড সিকিউর ডেমো অথেনটিকেশন" : "Zero-Password Secure Demo Authentication"}
                  </span>
                  <span className="rounded-full border border-emerald-500/35 bg-emerald-500/15 px-2 py-0.5 text-[10px] font-extrabold text-emerald-900 uppercase tracking-wide">
                    {bn ? "ডেমো মোড" : "Demo Mode"}
                  </span>
                </div>
                <p className="mt-0.5 text-[11.5px] text-emerald-800/90 leading-tight">
                  {bn
                    ? "পাসওয়ার্ডহীন মোবাইল ওটিপি বা ফিঙ্গারপ্রিন্ট আর্কিটেকচার · ডেটা সম্পূর্ণ আপনার ডিভাইসে সংরক্ষিত"
                    : "Passwordless biometric/OTP architecture · All data stays 100% private on your device"}
                </p>
              </div>
            </div>

            {/* 3 Explicit Persona Cards (Rahim Uddin, Lamia Akter, Najeeb Ahmed) */}
            <div className="mt-3.5 space-y-2.5">
              {(Object.values(PERSONAS) as UserPersona[]).map((p) => {
                const isSelected = selectedId === p.id;
                const isCurrent = activeSession?.personaId === p.id;

                let tierBadge = "bg-emerald-500/10 text-emerald-900 border-emerald-500/25";
                let tierTitle = bn ? "ফ্রি ইউজার" : "Free User";
                if (p.tier === "partial") {
                  tierBadge = "bg-sky-500/10 text-sky-950 border-sky-500/25";
                  tierTitle = bn ? "পার্শিয়াল প্রো (১টি অ্যাপ)" : "Single App Pro";
                }
                if (p.tier === "pro") {
                  tierBadge = "bg-amber-500/15 text-amber-950 border-amber-500/30";
                  tierTitle = bn ? "অল-অ্যাক্সেস ফুল প্রো" : "All-Access Pro";
                }

                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleChoose(p)}
                    className={`group relative flex w-full items-center justify-between rounded-[22px] border p-4 text-left transition-all duration-200 cursor-pointer ${
                      isSelected
                        ? "border-emerald-500/90 bg-gradient-to-r from-emerald-50/80 via-white to-white ring-2 ring-emerald-500/30 shadow-[0_8px_24px_-6px_rgba(16,185,129,0.25)] scale-[1.01]"
                        : "border-slate-200/80 bg-white/95 hover:border-slate-300 hover:bg-white hover:shadow-[0_6px_20px_rgba(0,0,0,0.05)] active:scale-[0.995]"
                    }`}
                  >
                    <div className="flex items-start gap-4 min-w-0 pr-3">
                      {/* macOS Squircle Avatar Tile */}
                      <PersonaAvatar icon={p.avatarIcon} />

                      {/* Info & Typography */}
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-display font-bold text-[16.5px] sm:text-[17px] text-slate-900 tracking-tight">
                            {bn ? p.nameBn : p.nameEn}
                          </span>
                          <span className={`rounded-full border px-2.5 py-0.5 text-[11px] font-bold tracking-tight shadow-2xs ${tierBadge}`}>
                            {tierTitle}
                          </span>
                          {isCurrent && (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-800 text-white px-2.5 py-0.5 text-[10.5px] font-bold shadow-xs">
                              <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-300"></span>
                              </span>
                              {bn ? "বর্তমান সক্রিয়" : "Active"}
                            </span>
                          )}
                        </div>

                        <p className="mt-0.5 text-[12px] font-semibold text-slate-500 flex items-center gap-1.5">
                          <span>{bn ? p.roleBn : p.roleEn}</span>
                          <span className="text-slate-300 font-bold">·</span>
                          <span>{bn ? p.locationBn : p.locationEn}</span>
                        </p>

                        <p className="mt-1 text-[12.5px] leading-relaxed text-slate-600 line-clamp-2">
                          {p.descriptionBn}
                        </p>
                      </div>
                    </div>

                    {/* Action Arrow / Check */}
                    <div className="shrink-0 pl-2">
                      {isSelected ? (
                        <div className="flex h-8.5 w-8.5 items-center justify-center rounded-full bg-emerald-600 text-white shadow-[0_2px_10px_rgba(16,185,129,0.45),inset_0_1px_1px_rgba(255,255,255,0.4)]">
                          <CheckCircle2 size={19} strokeWidth={2.5} />
                        </div>
                      ) : (
                        <div className="flex h-8.5 w-8.5 items-center justify-center rounded-full bg-slate-100/90 text-slate-400 group-hover:bg-emerald-50 group-hover:text-emerald-700 group-hover:translate-x-0.5 group-hover:shadow-xs transition-all">
                          <ChevronRight size={19} strokeWidth={2.2} />
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}

              {/* Public Guest Mode */}
              <button
                type="button"
                onClick={handlePublicMode}
                className={`group relative flex w-full items-center justify-between rounded-[22px] border p-4 text-left transition-all duration-200 cursor-pointer ${
                  !activeSession
                    ? "border-slate-500/90 bg-gradient-to-r from-slate-50 via-white to-white ring-2 ring-slate-500/25 shadow-[0_8px_20px_-6px_rgba(71,85,105,0.22)] scale-[1.01]"
                    : "border-slate-200/80 bg-white/95 hover:border-slate-300 hover:bg-white hover:shadow-[0_6px_20px_rgba(0,0,0,0.05)] active:scale-[0.995]"
                }`}
              >
                <div className="flex items-start gap-4 min-w-0 pr-3">
                  <PersonaAvatar icon="guest" />

                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-display font-bold text-[16.5px] sm:text-[17px] text-slate-900 tracking-tight">
                        {bn ? "সাধারণ পাবলিক ভিজিটর (লগইন ছাড়া)" : "Public Guest Mode (No Login)"}
                      </span>
                      <span className="rounded-full border border-slate-300 bg-slate-100/90 px-2.5 py-0.5 text-[11px] font-bold text-slate-700 shadow-2xs">
                        {bn ? "পাবলিক গেস্ট" : "Guest"}
                      </span>
                      {!activeSession && (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-800 text-white px-2.5 py-0.5 text-[10.5px] font-bold shadow-xs">
                          <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-300"></span>
                          </span>
                          {bn ? "বর্তমান সক্রিয়" : "Active"}
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-[12px] font-medium text-slate-500">
                      {bn ? "কোনো প্রোফাইল সংরক্ষণ না করে সাধারণ ভিজিটর হিসেবে প্ল্যাটফর্ম ব্যবহার করুন" : "Browse without saving any persona profile on this device"}
                    </p>
                  </div>
                </div>

                <div className="shrink-0 pl-2">
                  {!activeSession ? (
                    <div className="flex h-8.5 w-8.5 items-center justify-center rounded-full bg-emerald-600 text-white shadow-[0_2px_10px_rgba(16,185,129,0.45),inset_0_1px_1px_rgba(255,255,255,0.4)]">
                      <CheckCircle2 size={19} strokeWidth={2.5} />
                    </div>
                  ) : (
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100/80 text-slate-400 group-hover:bg-slate-200/80 transition-colors">
                      <ChevronRight size={18} />
                    </div>
                  )}
                </div>
              </button>
            </div>

            {/* bKash Payment & Package Box */}
            <div className="mt-4 rounded-2xl border border-pink-200/90 bg-gradient-to-r from-pink-50/80 via-white to-rose-50/60 p-4 shadow-2xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="grid h-7 w-7 place-items-center rounded-xl bg-[#e2136e] text-[12px] font-black text-white shadow-xs">
                    b
                  </span>
                  <div>
                    <span className="font-display font-bold text-[13.5px] text-pink-950 block leading-tight">
                      {bn ? "বিকাশ পেমেন্ট ও প্রিমিয়াম প্যাকেজ" : "bKash Payment & Packages"}
                    </span>
                    <span className="text-[11px] font-medium text-pink-800">
                      {bn ? "প্রস্তাবিত মূল্য · কোনো ফি নেওয়া হচ্ছে না" : "Proposed pricing · Demo only"}
                    </span>
                  </div>
                </div>
                <span className="rounded-full border border-amber-300 bg-amber-50 px-2.5 py-0.5 text-[11px] font-bold text-amber-900 shadow-2xs" data-testid="login-payments-closed">
                  {bn ? "পেমেন্ট এখনো চালু হয়নি" : "Payments not open yet"}
                </span>
              </div>
              <div className="mt-2.5 grid grid-cols-2 gap-2 text-[12px]">
                <div className="rounded-xl bg-white p-2.5 border border-pink-100 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <strong className="text-slate-900 font-semibold">{bn ? "অল-অ্যাক্সেস প্রো" : "All-Access Pro"}</strong>
                    <span className="rounded bg-amber-100 px-1 py-0.2 text-[9.5px] font-extrabold text-amber-900">⭐ সব অ্যাপ</span>
                  </div>
                  <div className="mt-1 flex items-baseline gap-1">
                    <span className="font-bold text-[14px] text-pink-700">৳{ALL_ACCESS_PRICE_BDT}</span>
                    <span className="text-[11px] text-slate-500">/মাস</span>
                  </div>
                </div>
                <div className="rounded-xl bg-white p-2.5 border border-pink-100 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <strong className="text-slate-900 font-semibold">{bn ? "সিঙ্গেল অ্যাপ প্রো" : "Single App Plus"}</strong>
                    <span className="rounded bg-blue-100 px-1 py-0.2 text-[9.5px] font-extrabold text-blue-900">১টি অ্যাপ</span>
                  </div>
                  <div className="mt-1 flex items-baseline gap-1">
                    <span className="font-bold text-[14px] text-pink-700">৳{SINGLE_APP_PRICE_BDT}</span>
                    <span className="text-[11px] text-slate-500">/মাস</span>
                  </div>
                </div>
              </div>
              <p className="mt-2 text-[11px] text-slate-600 leading-snug">
                {bn
                  ? "জরুরি সেবা, স্বাস্থ্য সহকারী, আইনি সহায়তা (১৬৬৯৯) ও প্রতারণা যাচাই সবার জন্য সবসময় ফ্রি। মূল্য প্রস্তাবিত; যাচাই করা বিকাশ মার্চেন্ট অ্যাকাউন্ট চালু হলে পেমেন্ট খুলবে। তার আগে কোনো নম্বরে টাকা পাঠাবেন না।"
                  : "Emergency help, the health assistant, legal aid (16699) and scam checks are free for everyone, always. Prices are proposed; payments open after a verified bKash merchant account. Until then, do not send money to any number."}
              </p>
            </div>
          </div>

          {/* Footer note */}
          <div className="mt-5 pt-3 border-t border-slate-200 flex items-center justify-between text-[11.5px] text-slate-500">
            <span>
              {bn ? "টপবারের ইউজার ব্যাজ থেকে যেকোনো সময় প্রোফাইল পরিবর্তন করা যাবে" : "Switch profiles anytime from the topbar badge"}
            </span>
            {showSuccess && (
              <span className="flex items-center gap-1 font-semibold text-emerald-700 animate-in fade-in duration-200">
                <CheckCircle2 size={13} /> {bn ? "প্রবেশ সফল!" : "Logged in successfully!"}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
