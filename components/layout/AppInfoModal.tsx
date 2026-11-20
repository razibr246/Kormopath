"use client";

import { useEffect, useState, useCallback, useRef, type ReactNode } from "react";
import Link from "next/link";
import {
  X,
  Phone,
  ShieldCheck,
  ExternalLink,
  Volume2,
  VolumeX,
  Copy,
  Check,
  CheckCircle2,
  Sparkles,
  Info,
} from "lucide-react";
import { type AppMetadata } from "@/lib/appMeta";

interface AppInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  metadata: AppMetadata;
  icon: ReactNode;
  accent: string;
}

const bnNum = (s: string) => s.replace(/\d/g, (d) => "০১২৩৪৫৬৭৮৯"[Number(d)]);

export function AppInfoModal({
  isOpen,
  onClose,
  metadata,
  icon,
  accent,
}: AppInfoModalProps) {
  const [copiedNumber, setCopiedNumber] = useState<string | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Trap click outside
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  // Copy helpline number
  const copyToClipboard = (num: string) => {
    try {
      navigator.clipboard.writeText(num);
      setCopiedNumber(num);
      setTimeout(() => setCopiedNumber(null), 2000);
    } catch {}
  };

  // Speech synthesis toggle
  const toggleSpeech = useCallback(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    } else {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(metadata.speechSummaryBn);
      utterance.lang = "bn-BD";
      utterance.rate = 0.95;
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);
      window.speechSynthesis.speak(utterance);
      setIsSpeaking(true);
    }
  }, [isSpeaking, metadata.speechSummaryBn]);

  // Cancel speech on unmount or close
  useEffect(() => {
    if (!isOpen && isSpeaking) {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
      setIsSpeaking(false);
    }
  }, [isOpen, isSpeaking]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="app-info-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={handleBackdropClick}
    >
      <div
        ref={modalRef}
        className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl border border-line bg-paper p-5 sm:p-6 shadow-2xl space-y-5 text-slate-900 focus:outline-none"
      >
        {/* Modal Header */}
        <div className="flex items-start justify-between gap-3 pb-3 border-b border-line">
          <div className="flex items-center gap-3 min-w-0">
            <span
              className={`relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${accent} text-white shadow-md ring-1 ring-white/50`}
            >
              <span className="absolute inset-0 rounded-2xl bg-gradient-to-t from-transparent via-white/10 to-white/20 pointer-events-none" />
              {icon}
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2
                  id="app-info-title"
                  className="font-display text-xl sm:text-2xl font-bold tracking-tight text-slate-900"
                >
                  {metadata.nameBn}
                </h2>
                <span className="inline-flex items-center gap-1 rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-0.5 text-[11px] font-bold text-indigo-900">
                  <Sparkles size={11} className="text-indigo-600" />
                  {metadata.trustBadgeBn}
                </span>
              </div>
              <p className="text-xs text-slate-600 font-medium truncate mt-0.5">
                {metadata.nameEn} · {metadata.taglineBn}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-slate-200 bg-white text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            aria-label="বন্ধ করুন"
          >
            <X size={16} />
          </button>
        </div>

        {/* Audio Listen Bar */}
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-indigo-100 bg-indigo-50/70 p-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-indigo-950">
            <Volume2 size={16} className={`text-indigo-600 ${isSpeaking ? "animate-pulse" : ""}`} />
            <span>{isSpeaking ? "বর্ণনা শোনানো হচ্ছে…" : "অডিও সারাংশ শুনুন (ভয়েস)"}</span>
          </div>
          <button
            type="button"
            onClick={toggleSpeech}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold transition-all ${
              isSpeaking
                ? "bg-red-600 text-white hover:bg-red-700"
                : "bg-indigo-700 text-white hover:bg-indigo-800"
            }`}
          >
            {isSpeaking ? (
              <>
                <VolumeX size={13} /> থামান
              </>
            ) : (
              <>
                <Volume2 size={13} /> পড়ে শোনান
              </>
            )}
          </button>
        </div>

        {/* Official Authority & Law Citation */}
        <div className="rounded-2xl border border-slate-200 bg-white p-3.5 space-y-1.5 shadow-2xs text-xs">
          <span className="font-bold text-slate-900 block flex items-center gap-1.5">
            <ShieldCheck size={14} className="text-emerald-700" /> সরকারি স্বীকৃতি ও আইনগত কাঠামো
          </span>
          <p className="text-slate-700 leading-relaxed font-medium">
            {metadata.authorityBn}
          </p>
          {metadata.lawCitationBn && (
            <p className="text-slate-600 font-mono text-[11px] pt-1 border-t border-slate-100">
              রেফারেন্স: {metadata.lawCitationBn}
            </p>
          )}
          {metadata.authorityUrl && (
            <a
              href={metadata.authorityUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[11.5px] font-bold text-indigo-700 hover:underline pt-0.5"
            >
              অফিসিয়াল ওয়েবসাইট দেখুন <ExternalLink size={11} />
            </a>
          )}
        </div>

        {/* Free Citizen Benefits */}
        <div className="space-y-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
            বিনামূল্যে যে নাগরিক সেবাগুলো পাবেন
          </h3>
          <ul className="space-y-1.5 text-xs text-slate-700">
            {metadata.keyBenefitsBn.map((benefit, i) => (
              <li key={i} className="flex items-start gap-2 rounded-xl bg-white/80 p-2 border border-slate-100">
                <CheckCircle2 size={15} className="text-emerald-600 shrink-0 mt-0.5" />
                <span className="font-medium leading-relaxed">{benefit}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Helplines */}
        {metadata.emergencyHelplines && metadata.emergencyHelplines.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <Phone size={12} className="text-indigo-600" /> জরুরি ও সরকারি হটলাইন
            </h3>
            <div className="grid gap-2 sm:grid-cols-2">
              {metadata.emergencyHelplines.map((h) => (
                <div
                  key={h.number}
                  className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white p-2.5 shadow-2xs"
                >
                  <a
                    href={`tel:${h.number}`}
                    className="flex items-center gap-2 text-xs font-bold text-slate-900 hover:text-indigo-700 transition-colors min-w-0"
                    title={`সরাসরি কল করুন (${h.number})`}
                  >
                    <Phone size={13} className="text-emerald-600 shrink-0" />
                    <span className="truncate">{h.label}</span>
                    <span className="font-mono text-xs text-indigo-700">({bnNum(h.number)})</span>
                  </a>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(h.number)}
                    className="grid h-6 w-6 shrink-0 place-items-center rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                    title="নম্বর কপি করুন"
                  >
                    {copiedNumber === h.number ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Quick Tools Jump */}
        {metadata.quickLinks && metadata.quickLinks.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              টুলস ও ফিচারসমূহ
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {metadata.quickLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={onClose}
                  className="inline-flex items-center gap-1 rounded-lg border border-line bg-white px-2.5 py-1 text-xs font-semibold text-slate-800 hover:border-indigo-400 hover:bg-indigo-50/50 hover:text-indigo-950 transition-all shadow-2xs"
                >
                  {link.labelBn} →
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Privacy Note */}
        <div className="flex items-center gap-2 rounded-xl bg-emerald-50/80 p-2.5 border border-emerald-200/70 text-[11.5px] font-medium text-emerald-950">
          <ShieldCheck size={15} className="text-emerald-700 shrink-0" />
          <span>{metadata.privacyNoteBn}</span>
        </div>
      </div>
    </div>
  );
}
