"use client";

import { useEffect, useState, useRef } from "react";
import {
  Sparkles,
  ChevronDown,
  UserCheck,
  Zap,
  LogOut,
  ShieldCheck,
  Check,
  X,
  ArrowUpRight,
  Sprout,
  HeartPulse,
  Compass,
} from "lucide-react";
import dynamic from "next/dynamic";
import {
  PERSONAS,
  type UserPersona,
  type UserSession,
  createSessionFromPersona,
  getStoredSession,
  saveStoredSession,
} from "@/lib/session";

const PersonaLoginModal = dynamic(() => import("@/components/auth/PersonaLoginModal").then((m) => m.PersonaLoginModal), { ssr: false });
const UpgradeModal = dynamic(() => import("@/components/pricing/UpgradeModal").then((m) => m.UpgradeModal), { ssr: false });

interface UserNavBadgeProps {
  lang?: "bn" | "en";
  className?: string;
  onOpenLogin?: () => void;
}

export function UserNavBadge({ lang = "bn", className = "", onOpenLogin }: UserNavBadgeProps) {
  const [session, setSession] = useState<UserSession | null>(null);
  const [mounted, setMounted] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const bn = lang === "bn";

  useEffect(() => {
    setMounted(true);
    const sync = () => {
      setSession(getStoredSession());
    };
    sync();

    window.addEventListener("kormopath:session-change", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("kormopath:session-change", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  // Close dropdown on outside click or escape
  useEffect(() => {
    if (!menuOpen) return;
    const handleOutsideClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [menuOpen]);

  const handleSwitchPersona = (persona: UserPersona) => {
    const newSession = createSessionFromPersona(persona);
    saveStoredSession(newSession);
    setSession(newSession);
    setMenuOpen(false);
  };

  const handleLogout = () => {
    saveStoredSession(null);
    setSession(null);
    setMenuOpen(false);
  };

  const handleOpenLogin = () => {
    if (onOpenLogin) {
      onOpenLogin();
    } else {
      setLoginModalOpen(true);
    }
  };

  if (!mounted) {
    return (
      <div className={`h-9 w-24 rounded-full bg-slate-100/60 animate-pulse ${className}`} />
    );
  }

  function UserAvatarSquircle({
    personaId,
    size = "sm",
  }: {
    personaId?: string;
    size?: "sm" | "md" | "lg";
  }) {
    let sizeClasses = "h-5 w-5 rounded-[6px]";
    let iconSize = 12;
    if (size === "md") {
      sizeClasses = "h-7 w-7 rounded-[9px]";
      iconSize = 15;
    } else if (size === "lg") {
      sizeClasses = "h-10 w-10 rounded-[13px]";
      iconSize = 20;
    }

    if (personaId === "rahim_uddin") {
      return (
        <div
          className={`relative flex shrink-0 items-center justify-center bg-gradient-to-br from-emerald-400 via-emerald-600 to-teal-800 text-white shadow-[inset_0_1px_1px_rgba(255,255,255,0.6),0_2px_6px_rgba(16,185,129,0.35)] ring-1 ring-white/30 ${sizeClasses}`}
        >
          <Sprout size={iconSize} strokeWidth={2.4} />
        </div>
      );
    }
    if (personaId === "lamia_akter") {
      return (
        <div
          className={`relative flex shrink-0 items-center justify-center bg-gradient-to-br from-sky-400 via-blue-600 to-indigo-800 text-white shadow-[inset_0_1px_1px_rgba(255,255,255,0.6),0_2px_6px_rgba(37,99,235,0.35)] ring-1 ring-white/30 ${sizeClasses}`}
        >
          <HeartPulse size={iconSize} strokeWidth={2.4} />
        </div>
      );
    }
    if (personaId === "najeeb_ahmed") {
      return (
        <div
          className={`relative flex shrink-0 items-center justify-center bg-gradient-to-br from-amber-400 via-orange-500 to-amber-700 text-white shadow-[inset_0_1px_1px_rgba(255,255,255,0.6),0_2px_6px_rgba(245,158,11,0.35)] ring-1 ring-white/40 ${sizeClasses}`}
        >
          <Sparkles size={iconSize} strokeWidth={2.4} />
        </div>
      );
    }
    return (
      <div
        className={`relative flex shrink-0 items-center justify-center bg-gradient-to-br from-slate-500 via-slate-600 to-slate-800 text-white shadow-[inset_0_1px_1px_rgba(255,255,255,0.4),0_2px_6px_rgba(71,85,105,0.3)] ring-1 ring-white/20 ${sizeClasses}`}
      >
        <Compass size={iconSize} strokeWidth={2.4} />
      </div>
    );
  }

  const getTierBadgeStyle = (tier?: string) => {
    if (tier === "pro") {
      return "bg-amber-100 text-amber-900 border-amber-300 ring-1 ring-amber-400/30";
    }
    if (tier === "partial") {
      return "bg-blue-100 text-blue-900 border-blue-300 ring-1 ring-blue-400/30";
    }
    return "bg-emerald-100 text-emerald-950 border-emerald-300 ring-1 ring-emerald-400/30";
  };

  const getTierLabel = (tier?: string) => {
    // Paid tiers only ever exist as a demo (no payments are open), so the badge always says so.
    if (tier === "pro") return bn ? "প্রো · ডেমো" : "PRO · DEMO";
    if (tier === "partial") return bn ? "একটি অ্যাপ · ডেমো" : "1 APP · DEMO";
    return bn ? "ফ্রি" : "FREE";
  };

  return (
    <>
      <div className={`relative inline-block text-left ${className}`} ref={menuRef}>
        {session ? (
          <div className="inline-flex items-center rounded-full border border-emerald-300/80 bg-white/95 p-1 shadow-xs hover:border-emerald-500 transition-all">
            <button
              type="button"
              onClick={() => setMenuOpen(!menuOpen)}
              aria-expanded={menuOpen}
              aria-haspopup="menu"
              className="group inline-flex items-center gap-2 pl-2 pr-2 py-0.5 text-slate-800 transition-colors cursor-pointer"
              title={bn ? "প্রোফাইল মেনু ও ১-ক্লিক পরিবর্তন" : "Persona menu & 1-click switch"}
            >
              <UserAvatarSquircle personaId={session.personaId} size="sm" />
              <span className="max-w-[100px] xl:max-w-[120px] truncate text-[13px] font-semibold text-slate-900">
                {bn ? session.nameBn : session.nameEn}
              </span>
              <span
                className={`rounded px-1.5 py-0.5 text-[9.5px] font-bold uppercase tracking-wider border ${getTierBadgeStyle(
                  session.tier
                )}`}
              >
                {getTierLabel(session.tier)}
              </span>
              <ChevronDown
                size={14}
                className={`text-slate-500 transition-transform duration-200 ${
                  menuOpen ? "rotate-180 text-emerald-700" : ""
                }`}
              />
            </button>

            <div className="h-4 w-px bg-slate-200 shrink-0 mx-0.5" aria-hidden="true" />

            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex h-7 w-7 items-center justify-center rounded-full text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors shrink-0 cursor-pointer"
              title={bn ? "পাবলিক মোডে ফিরুন (লগআউট)" : "Return to Public Guest Mode (Logout)"}
              aria-label={bn ? "পাবলিক মোডে ফিরুন" : "Return to Public Guest Mode"}
            >
              <X size={14} />
            </button>

            {menuOpen && (
              <div
                role="menu"
                aria-orientation="vertical"
                className="absolute right-0 mt-2 w-76 origin-top-right rounded-2xl border border-slate-200/90 bg-white/95 backdrop-blur-xl p-3 shadow-2xl ring-1 ring-slate-900/10 z-[100] transition-all animate-in fade-in zoom-in-95 duration-150"
              >
                {/* Current Active Persona Details */}
                <div className="rounded-xl bg-slate-50/90 p-3 border border-slate-200/70 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                      {bn ? "বর্তমান প্রোফাইল" : "Active Persona"}
                    </span>
                    <span
                      className={`rounded px-1.5 py-0.2 text-[9.5px] font-extrabold uppercase border ${getTierBadgeStyle(
                        session.tier
                      )}`}
                    >
                      {getTierLabel(session.tier)}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center gap-3">
                    <UserAvatarSquircle personaId={session.personaId} size="lg" />
                    <div className="min-w-0">
                      <p className="font-display font-bold text-[14.5px] text-slate-900 truncate">
                        {bn ? session.nameBn : session.nameEn}
                      </p>
                      <p className="text-[11.5px] text-slate-500 truncate">
                        {session.personaId === "rahim_uddin"
                          ? bn ? "কৃষক ও পল্লী উদ্যোক্তা" : "Farmer & Entrepreneur"
                          : session.personaId === "lamia_akter"
                          ? bn ? "স্বাস্থ্য সহকারী ও শিক্ষার্থী" : "Health Assistant & Student"
                          : bn ? "সফটওয়্যার প্রকৌশলী ও পরামর্শক" : "Software Engineer & Pro"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* 1-Click Persona Switch List */}
                <div className="mt-2.5 pt-2 border-t border-slate-100">
                  <p className="px-1 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    {bn ? "১-ক্লিকে প্রোফাইল পরিবর্তন:" : "1-Click Switch Persona:"}
                  </p>
                  <div className="mt-1.5 space-y-1">
                    {(Object.values(PERSONAS) as UserPersona[]).map((p) => {
                      const isCurrent = session.personaId === p.id;
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => handleSwitchPersona(p)}
                          className={`flex w-full items-center justify-between rounded-xl px-2.5 py-2 text-left text-[12.5px] transition-colors cursor-pointer ${
                            isCurrent
                              ? "bg-emerald-50 text-emerald-950 font-semibold border border-emerald-200"
                              : "text-slate-700 hover:bg-slate-100 hover:text-slate-900"
                          }`}
                        >
                          <span className="flex items-center gap-2.5 min-w-0 truncate">
                            <UserAvatarSquircle personaId={p.id} size="md" />
                            <span className="truncate font-medium">{bn ? p.nameBn : p.nameEn}</span>
                          </span>
                          <span className="flex items-center gap-1.5 shrink-0">
                            <span
                              className={`rounded px-1.5 py-0.5 text-[9px] font-bold uppercase ${
                                p.tier === "pro"
                                  ? "bg-amber-100 text-amber-900"
                                  : p.tier === "partial"
                                  ? "bg-blue-100 text-blue-900"
                                  : "bg-slate-100 text-slate-700"
                              }`}
                            >
                              {p.tier}
                            </span>
                            {isCurrent && <Check size={14} className="text-emerald-700" />}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Upgrade Button if not Pro */}
                {session.tier !== "pro" && (
                  <div className="mt-2.5 pt-2 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => {
                        setMenuOpen(false);
                        setUpgradeModalOpen(true);
                      }}
                      className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-3 py-2 text-[12px] font-bold text-white shadow-xs hover:from-amber-600 hover:to-orange-600 transition-all"
                    >
                      <Zap size={14} />
                      <span>{bn ? "পেইড প্ল্যান দেখুন (পেমেন্ট এখনো বন্ধ)" : "See paid plans (payments not open yet)"}</span>
                    </button>
                  </div>
                )}

                {/* Logout Button */}
                <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-[11.5px] font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors"
                  >
                    <LogOut size={13} />
                    <span>{bn ? "পাবলিক মোডে ফিরুন" : "Log out to Guest"}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      setLoginModalOpen(true);
                    }}
                    className="text-[11px] font-medium text-emerald-700 hover:underline"
                  >
                    {bn ? "সব মোড দেখুন" : "View modal"}
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <button
            type="button"
            onClick={handleOpenLogin}
            aria-label={bn ? "শুরু করুন" : "Get started"}
            className="group inline-flex min-h-[44px] h-[44px] items-center gap-1.5 rounded-full bg-gradient-to-r from-[#0e4d36] to-[#0a3827] hover:from-[#0b402c] hover:to-[#082b1e] px-5 text-[14px] font-bold text-white shadow-[0_2px_8px_rgba(14,77,54,0.35)] hover:shadow-[0_4px_14px_rgba(14,77,54,0.45)] border border-emerald-500/25 active:scale-[0.98] transition-all duration-200"
          >
            <span>{bn ? "শুরু করুন" : "Get started"}</span>
            <ArrowUpRight size={15} className="text-emerald-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </button>
        )}
      </div>

      <PersonaLoginModal
        isOpen={loginModalOpen}
        onClose={() => setLoginModalOpen(false)}
        lang={lang}
      />

      <UpgradeModal
        isOpen={upgradeModalOpen}
        onClose={() => setUpgradeModalOpen(false)}
        lang={lang}
      />
    </>
  );
}
