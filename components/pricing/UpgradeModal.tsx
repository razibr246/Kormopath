"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { X, CheckCircle2, Sparkles, ShieldCheck, BellRing, FlaskConical } from "lucide-react";
import {
  SINGLE_APP_PRICE_BDT,
  ALL_ACCESS_PRICE_BDT,
  enableDemoPro,
  joinEarlyAccess,
  guestSession,
  getStoredSession,
  saveStoredSession,
  type UserSession,
} from "@/lib/session";
import { bnDigits } from "@/lib/contract";

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetAppId?: string;
  targetAppNameBn?: string;
  featureNameBn?: string;
  lang?: "bn" | "en";
  onSuccess?: () => void;
}

/**
 * Paid-plan sheet. Real payments are OFF: it shows the proposed prices, lets the person join an early-access list
 * (saved on this device only) or switch paid features on as a labelled demo with no money. Nothing typed here can
 * unlock anything, and no payment number exists.
 */
export function UpgradeModal({
  isOpen,
  onClose,
  targetAppId = "admitbuddy",
  targetAppNameBn = "ভর্তি প্রস্তুতি ও মডেল টেস্ট",
  featureNameBn = "মডেল টেস্ট ও অনুশীলন পরীক্ষা",
  lang = "bn",
  onSuccess,
}: UpgradeModalProps) {
  const [selectedPlan, setSelectedPlan] = useState<"single" | "all">("all");
  const [done, setDone] = useState<null | "demo" | "early">(null);
  const [session, setSession] = useState<UserSession | null>(null);
  const bn = lang === "bn";
  const price = (n: number) => `৳${bn ? bnDigits(String(n)) : n}`;

  useEffect(() => {
    if (!isOpen) {
      setDone(null);
      return;
    }
    setSession(getStoredSession());
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const scope = selectedPlan === "all" ? "all" : targetAppId;
  const base = () => session ?? getStoredSession() ?? guestSession();

  const turnOnDemo = () => {
    const updated = enableDemoPro(base(), scope);
    saveStoredSession(updated);
    setSession(updated);
    setDone("demo");
    setTimeout(() => {
      onSuccess?.();
      onClose();
    }, 1200);
  };

  const joinList = () => {
    const updated = joinEarlyAccess(base(), scope);
    saveStoredSession(updated);
    setSession(updated);
    setDone("early");
  };

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="upgrade-modal-title" className="fixed inset-0 z-[130] flex items-center justify-center p-3 sm:p-4 md:p-6" data-testid="upgrade-modal">
      <button type="button" className="fixed inset-0 bg-slate-900/60 backdrop-blur-md" onClick={onClose} aria-label={bn ? "বন্ধ করুন" : "Close"} />

      <section className="relative max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-3xl bg-white shadow-2xl ring-1 ring-slate-900/10">
        <div className="relative bg-gradient-to-r from-emerald-900 via-teal-900 to-emerald-950 p-6 text-white">
          <button type="button" onClick={onClose} className="absolute right-3 top-3 grid h-11 w-11 place-items-center rounded-full text-emerald-200 transition-colors hover:bg-white/10 hover:text-white" aria-label={bn ? "বন্ধ করুন" : "Close"}>
            <X size={18} />
          </button>
          <div className="flex items-center gap-2 text-amber-300">
            <Sparkles size={16} aria-hidden />
            <span className="font-mono text-xs font-semibold uppercase tracking-wider">{bn ? "পেইড সুবিধা" : "Paid plan"}</span>
          </div>
          <h2 id="upgrade-modal-title" className="mt-2 pr-10 font-serif text-2xl font-bold tracking-tight">
            {bn ? `${featureNameBn}` : `Unlock ${featureNameBn}`}
          </h2>
          <p className="mt-1 text-[13px] leading-relaxed text-emerald-100">
            {bn
              ? "জরুরি সেবা, উপসর্গ সহকারী, প্রেসক্রিপশন পড়া, আইনি সহায়তা ও প্রতারণা যাচাই সবার জন্য সবসময় ফ্রি। পেইড প্ল্যান শুধু বাড়তি সুবিধা যোগ করে।"
              : "Emergency help, the symptom assistant, prescription reading, legal aid and scam checks are free for everyone, always. A paid plan only adds extras."}
          </p>
        </div>

        <div className="p-6">
          {done === "demo" ? (
            <div className="py-8 text-center" role="status">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 text-amber-800"><FlaskConical size={32} aria-hidden /></div>
              <h3 className="mt-4 font-serif text-xl font-bold text-slate-900">{bn ? "ডেমো হিসেবে চালু হলো" : "Switched on as a demo"}</h3>
              <p className="mx-auto mt-1.5 max-w-md text-sm text-slate-600">{bn ? "কোনো টাকা নেওয়া হয়নি। যেখানে এই সুবিধা চালু, সেখানে “ডেমো” লেখা থাকবে।" : "No money was taken. Wherever these features are on, they show a “Demo” badge."}</p>
            </div>
          ) : done === "early" ? (
            <div className="py-8 text-center" role="status">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-700"><CheckCircle2 size={32} aria-hidden /></div>
              <h3 className="mt-4 font-serif text-xl font-bold text-slate-900">{bn ? "আগাম অ্যাক্সেস তালিকায় রাখা হলো" : "Added to the early-access list"}</h3>
              <p className="mx-auto mt-1.5 max-w-md text-sm text-slate-600">{bn ? "আপনার আগ্রহ শুধু এই ডিভাইসে সংরক্ষিত হয়েছে; কোথাও পাঠানো হয়নি, কোনো সুবিধাও চালু হয়নি।" : "Saved on this device only; nothing was sent anywhere and nothing was unlocked."}</p>
              <button type="button" onClick={onClose} className="kp-btn-ghost mt-4 min-h-[44px] px-4">{bn ? "ঠিক আছে" : "OK"}</button>
            </div>
          ) : (
            <>
              <p className="mb-3 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-[13px] font-semibold text-amber-900" data-testid="payments-closed">
                {bn ? "প্রস্তাবিত মূল্য · পেমেন্ট এখনো চালু হয়নি" : "Proposed price · payments are not open yet"}
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                {([["single", bn ? "একটি অ্যাপ" : "One app", targetAppNameBn, SINGLE_APP_PRICE_BDT], ["all", bn ? "অল-অ্যাক্সেস" : "All-access", bn ? "সব অ্যাপের পেইড সুবিধা" : "Paid extras in every app", ALL_ACCESS_PRICE_BDT]] as const).map(([id, label, what, amount]) => (
                  <button key={id} type="button" onClick={() => setSelectedPlan(id)} aria-pressed={selectedPlan === id}
                    className={`min-h-[44px] rounded-2xl border p-4 text-left transition-all ${selectedPlan === id ? "border-emerald-600 bg-emerald-50/60 ring-2 ring-emerald-500/20" : "border-slate-200 bg-white hover:border-slate-300"}`}>
                    <span className="text-[12px] font-semibold uppercase tracking-wider text-slate-500">{label}</span>
                    <span className="mt-1 block text-[15px] font-bold text-slate-900">{what}</span>
                    <span className="mt-2 flex items-baseline gap-1">
                      <span className="font-serif text-2xl font-extrabold text-slate-900">{price(amount)}</span>
                      <span className="text-[12px] font-medium text-slate-500">{bn ? "/মাস (প্রস্তাবিত)" : "/month (proposed)"}</span>
                    </span>
                  </button>
                ))}
              </div>

              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                <button type="button" onClick={joinList} className="kp-btn-primary min-h-[44px] justify-center px-4 text-[14px]" data-testid="join-early-access">
                  <BellRing size={15} aria-hidden /> {bn ? "আগাম অ্যাক্সেস তালিকায় নাম দিন" : "Join early access"}
                </button>
                <button type="button" onClick={turnOnDemo} className="kp-btn-ghost min-h-[44px] justify-center px-4 text-[14px]" data-testid="enable-demo-pro">
                  <FlaskConical size={15} aria-hidden /> {bn ? "ডেমোতে প্রো চালু করুন — কোনো টাকা লাগবে না" : "Try Pro as a demo — no money"}
                </button>
              </div>

              <div className="mt-4 flex items-start gap-2 text-[12px] text-slate-600">
                <ShieldCheck size={14} className="mt-0.5 shrink-0 text-emerald-700" aria-hidden />
                <span>
                  {bn
                    ? "যাচাই করা বিকাশ মার্চেন্ট অ্যাকাউন্ট চালু হলে পেমেন্ট খুলবে। তার আগে কোনো নম্বরে টাকা পাঠাবেন না, কেউ চাইলেও না।"
                    : "Payments open once a verified bKash merchant account is in place. Until then, do not send money to any number, even if someone asks."}{" "}
                  <Link href="/pricing" className="font-semibold text-emerald-800 underline" onClick={onClose}>{bn ? "সব প্ল্যান দেখুন" : "See all plans"}</Link>
                </span>
              </div>
            </>
          )}
        </div>
      </section>
    </div>
  );
}
