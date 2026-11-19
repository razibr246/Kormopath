"use client";

import { useEffect, useState } from "react";
import {
  X,
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

          {/* Top Poem Card: Jibanananda Das (Exact authentic quote from user reference) */}
          <div className="relative z-10 rounded-2xl border border-emerald-400/25 bg-black/35 p-4 backdrop-blur-md shadow-inner">
            <p className="font-serif text-[13px] leading-relaxed text-emerald-100 italic">
              &ldquo;আবার আসিব ফিরে ধানসিঁড়ির তীরে — এই বাংলায়<br />
              হয়তো মানুষ নয় — হয়তো বা শঙ্খচিল শালিখের বেশে;<br />
              হয়তো ভোরের কাক হয়ে এই কার্তিকের নবান্নের দেশে<br />
              কুয়াশার বুকে ভেসে একদিন আসিব এ কাঁঠাল-ছায়ায়;&rdquo;
            </p>
            <p className="mt-2 text-right font-sans text-[11.5px] font-semibold text-emerald-300">
              — জীবনানন্দ দাশ, &ldquo;আবার আসিব ফিরে&rdquo;, রূপসী বাংলা
            </p>
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

          {/* Bottom Philosophy Card (From user reference image) */}
          <div className="relative z-10 rounded-xl bg-black/40 p-3.5 border border-emerald-400/25 backdrop-blur-md">
            <p className="font-serif text-[12.5px] leading-relaxed text-emerald-100 font-semibold">
              &ldquo;যিনি মাঠে আছেন, সিদ্ধান্ত তাঁর। আমরা শুধু হিসাবটা হাতের কাছে আনি।&rdquo;
            </p>
            <p className="mt-1 text-[11px] text-emerald-300/90">
              {bn ? "দেশের মানুষের শ্রম, ঘাম ও মেধার আত্মনির্ভর প্ল্যাটফর্ম।" : "Self-reliant platform for Bangladeshi youth and citizens."}
            </p>
          </div>
        </div>

        {/* Right Panel: Passwordless Persona Selector & bKash Packages */}
        <div className="flex flex-col justify-between p-6 sm:p-7 md:col-span-7 bg-slate-50/70 md:overflow-y-auto md:max-h-[88vh]">
          <div>
            <div className="mb-3 md:hidden">
              <KormoPathLogo variant="compact" size="sm" theme="light" />
            </div>

            {/* Header: Back button, Language, and Close */}
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={onClose}
                className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[13px] font-semibold text-slate-600 hover:bg-slate-200/80 hover:text-slate-900 transition-colors"
              >
                <span>← ফিরে যান</span>
              </button>

              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 py-0.5 text-[11px] font-medium text-slate-700 shadow-2xs">
                  <Globe size={11} className="text-emerald-700" />
                  <span>{bn ? "বাংলা" : "English"}</span>
                </span>
                <button
                  type="button"
                  onClick={onClose}
                  className="grid h-8 w-8 place-items-center rounded-full text-slate-400 hover:bg-slate-200/80 hover:text-slate-700 transition-colors"
                  aria-label={bn ? "বন্ধ করুন" : "Close"}
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Title & Friendly Prompt (Matches FieldShift reference prompt) */}
            <div className="mt-4">
              <h2 id="persona-modal-title" className="font-serif text-2xl font-bold tracking-tight text-slate-900">
                {bn ? "কর্মপথ প্রোফাইল বেছে নিন" : "Choose a KormoPath profile"}
              </h2>
              <p className="mt-1 text-[13px] leading-relaxed text-slate-600">
                {bn
                  ? "এই নমুনায় কোনো পাসওয়ার্ড বা ওটিপি নেই। নিচে থেকে আপনার মোড বেছে নিলেই চলবে, পরে যেকোনো সময় বদলানো বা লগআউট করা যায়।"
                  : "No passwords or OTP required. Simply choose a mode below to enter instantly; you can switch or log out anytime."}
              </p>
            </div>

            {/* Zero-Password Security Badge (Auth0 style from user reference) */}
            <div className="mt-3 flex items-start gap-2.5 rounded-2xl bg-gradient-to-r from-emerald-50 to-teal-50/70 p-3 text-[12px] text-emerald-950 border border-emerald-200/90 shadow-2xs">
              <div className="grid h-7 w-7 shrink-0 place-items-center rounded-xl bg-emerald-600 text-white shadow-xs">
                <ShieldCheck size={16} />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 font-bold text-emerald-900">
                  <span>{bn ? "জিরো-পাসওয়ার্ড সিকিউর ডেমো অথেনটিকেশন" : "Zero-Password Secure Demo Authentication"}</span>
                  <span className="rounded bg-emerald-200/80 px-1.5 py-0.2 text-[10px] font-extrabold text-emerald-900">
                    {bn ? "ডেমো মোড" : "Demo Mode"}
                  </span>
                </div>
                <p className="mt-0.5 text-[11.5px] text-emerald-800 leading-tight">
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

                let tierBadge = "bg-emerald-50 text-emerald-900 border-emerald-200 ring-1 ring-emerald-300/40";
                let tierTitle = bn ? "ফ্রি ইউজার" : "Free User";
                if (p.tier === "partial") {
                  tierBadge = "bg-blue-50 text-blue-900 border-blue-200 ring-1 ring-blue-300/40";
                  tierTitle = bn ? "পার্শিয়াল প্রো (১টি অ্যাপ)" : "Single App Pro";
                }
                if (p.tier === "pro") {
                  tierBadge = "bg-amber-50 text-amber-950 border-amber-300 ring-1 ring-amber-400/40";
                  tierTitle = bn ? "অল-অ্যাক্সেস ফুল প্রো" : "All-Access Pro";
                }

                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleChoose(p)}
                    className={`group relative flex w-full items-center justify-between rounded-2xl border p-3.5 text-left transition-all duration-200 ${
                      isSelected
                        ? "border-emerald-600 bg-white ring-2 ring-emerald-500/30 shadow-md scale-[1.008]"
                        : "border-slate-200/90 bg-white hover:border-emerald-400 hover:shadow-xs"
                    }`}
                  >
                    <div className="flex items-start gap-3.5 min-w-0 pr-3">
                      {/* Avatar */}
                      <div className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-xl font-bold shadow-inner border border-slate-200/70 group-hover:bg-emerald-50 group-hover:border-emerald-200 transition-colors">
                        {p.avatarIcon === "farmer" && "🌾"}
                        {p.avatarIcon === "health" && "🩺"}
                        {p.avatarIcon === "pro" && "⭐"}
                      </div>

                      {/* Info */}
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-bold text-[15px] text-slate-900">
                            {bn ? p.nameBn : p.nameEn}
                          </span>
                          <span className={`rounded-md border px-2 py-0.5 text-[11px] font-extrabold ${tierBadge}`}>
                            {tierTitle}
                          </span>
                          {isCurrent && (
                            <span className="rounded-md bg-emerald-700 px-1.5 py-0.5 text-[10px] font-bold text-white shadow-2xs">
                              {bn ? "বর্তমান সক্রিয়" : "Active"}
                            </span>
                          )}
                        </div>

                        <p className="mt-0.5 text-[12px] font-medium text-slate-500">
                          {bn ? p.roleBn : p.roleEn} · {bn ? p.locationBn : p.locationEn}
                        </p>

                        <p className="mt-1 text-[12px] leading-snug text-slate-600 line-clamp-2">
                          {p.descriptionBn}
                        </p>
                      </div>
                    </div>

                    {/* Action Arrow / Check */}
                    <div className="shrink-0 pl-2">
                      {isSelected ? (
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-600 text-white shadow-xs">
                          <CheckCircle2 size={18} />
                        </div>
                      ) : (
                        <div className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 group-hover:bg-emerald-50 group-hover:text-emerald-700 transition-colors">
                          <ChevronRight size={18} />
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
                className={`group relative flex w-full items-center justify-between rounded-2xl border p-3.5 text-left transition-all duration-200 ${
                  !activeSession
                    ? "border-emerald-600 bg-white ring-2 ring-emerald-500/30 shadow-xs"
                    : "border-slate-200/90 bg-white hover:border-slate-300 hover:shadow-2xs"
                }`}
              >
                <div className="flex items-start gap-3.5 min-w-0 pr-3">
                  <div className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-xl font-bold shadow-inner border border-slate-200/70 group-hover:bg-slate-200/70 transition-colors">
                    🌐
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-[15px] text-slate-900">
                        {bn ? "সাধারণ পাবলিক ভিজিটর (লগইন ছাড়া)" : "Public Guest Mode (No Login)"}
                      </span>
                      <span className="rounded-md border border-slate-300 bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-700">
                        {bn ? "পাবলিক গেস্ট" : "Guest"}
                      </span>
                      {!activeSession && (
                        <span className="rounded-md bg-emerald-700 px-1.5 py-0.5 text-[10px] font-bold text-white shadow-2xs">
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
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-600 text-white shadow-xs">
                      <CheckCircle2 size={18} />
                    </div>
                  ) : (
                    <div className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 group-hover:bg-slate-100 transition-colors">
                      <ChevronRight size={18} />
                    </div>
                  )}
                </div>
              </button>
            </div>

            {/* bKash Payment & Package Box (Exact requested packages & number) */}
            <div className="mt-4 rounded-2xl border border-pink-200/80 bg-gradient-to-r from-pink-50/80 via-white to-pink-50/60 p-3.5 shadow-2xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="grid h-6 w-6 place-items-center rounded-lg bg-[#e2136e] text-[11px] font-black text-white shadow-xs">
                    b
                  </span>
                  <span className="font-bold text-[13px] text-pink-900">
                    {bn ? "বিকাশ পেমেন্ট ও প্রিমিয়াম প্যাকেজ" : "bKash Payment & Packages"}
                  </span>
                </div>
                <span className="rounded-lg border border-amber-300 bg-amber-50 px-2.5 py-0.5 text-[12px] font-bold text-amber-900" data-testid="login-payments-closed">
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
