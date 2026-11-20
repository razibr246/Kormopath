"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { TrendingDown, ArrowRight, ShieldCheck, DollarSign, Wallet, Sparkles, Building, Info, FileCheck, Zap } from "lucide-react";
import { fmtBdt, type Channel } from "@/lib/finops";
import { formatFeeGuardAuditForZapier } from "@/lib/zapier";

interface AnnualLeakageCardProps {
  monthlyInvoiceUsd: number;
  fxRate: number;
  channels: Channel[];
}

export function AnnualLeakageCard({
  monthlyInvoiceUsd,
  fxRate,
  channels,
}: AnnualLeakageCardProps) {
  const [savingsUsage, setSavingsUsage] = useState<"macbook" | "rent" | "bazar">("rent");

  const annualUsd = monthlyInvoiceUsd * 12;
  const annualGrossBdt = Math.round(annualUsd * fxRate);

  const fiverrChannel = channels.find((c) => c.id === "fiverr");
  const upworkChannel = channels.find((c) => c.id === "upwork");
  const directWireChannel = channels.find((c) => c.id === "bank_wire");

  const leakageData = useMemo(() => {
    const fiverrMonthlyNet = fiverrChannel?.netBdt ?? (monthlyInvoiceUsd * fxRate * 0.76);
    const directMonthlyNet = directWireChannel?.netBdt ?? (monthlyInvoiceUsd * fxRate * 1.01);

    const fiverrAnnualNet = Math.round(fiverrMonthlyNet * 12);
    const directAnnualNet = Math.round(directMonthlyNet * 12);

    const fiverrAnnualLeakage = Math.max(0, annualGrossBdt - fiverrAnnualNet);
    const directAdvantage = Math.max(0, directAnnualNet - fiverrAnnualNet);

    return {
      fiverrAnnualNet,
      directAnnualNet,
      fiverrAnnualLeakage,
      directAdvantage,
      leakagePct: annualGrossBdt > 0 ? Math.round((fiverrAnnualLeakage / annualGrossBdt) * 100) : 24,
    };
  }, [annualGrossBdt, fiverrChannel, directWireChannel, monthlyInvoiceUsd, fxRate]);

  // Real-world comparisons for the saved money in Bangladesh
  const tangibleEquivalents = {
    rent: {
      label: "বাসার ভাড়া",
      desc: `প্রায় ${Math.max(1, Math.round(leakageData.directAdvantage / 25000))} মাসের বাসা ভাড়া (৳২৫,০০০/মাস হিসাবে)`,
    },
    macbook: {
      label: "ওয়ার্কস্টেশন / ম্যাকবুক",
      desc: leakageData.directAdvantage >= 180000 
        ? "১টি হাই-এন্ড M-সিরিজ ম্যাকবুক প্রো বা প্রফেশনাল ওয়ার্কস্টেশন" 
        : "প্রফেশনাল মনিটর, মেকানিক্যাল সেটআপ ও গ্যাজেট আপগ্রেড",
    },
    bazar: {
      label: "সংসারের মাসিক বাজার",
      desc: `প্রায় ${Math.max(1, Math.round(leakageData.directAdvantage / 15000))} মাসের পরিবারের পূর্ণাঙ্গ বাজার খরচ`,
    },
  };

  const [zapierSending, setZapierSending] = useState(false);
  const [zapierResult, setZapierResult] = useState<{ success: boolean; text: string } | null>(null);

  const handleExportToZapier = async () => {
    const webhookUrl = typeof window !== "undefined" ? localStorage.getItem("kormopath:zapier:webhook_url") || "" : "";
    if (!webhookUrl) {
      setZapierResult({ success: false, text: "সেটিংসে গিয়ে আগে আপনার Zapier ওয়েবহুক URL যুক্ত করুন (/settings)" });
      setTimeout(() => setZapierResult(null), 5000);
      return;
    }
    setZapierSending(true);
    setZapierResult(null);
    try {
      const payload = formatFeeGuardAuditForZapier({
        monthlyGrossUsd: monthlyInvoiceUsd,
        currentPlatform: "Fiverr",
        annualLeakageBdt: leakageData.fiverrAnnualLeakage,
        bestChannelName: "Direct SWIFT Wire",
        annualSavingsBdt: leakageData.directAdvantage,
      });
      const res = await fetch("/api/zapier/dispatch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          webhookUrl,
          event: payload.event,
          app: payload.app,
          data: payload.data,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setZapierResult({ success: true, text: "✓ সফলভাবে Zapier-এ পাঠানো হয়েছে! (Google Sheets/Slack সিঙ্ক সম্পন্ন)" });
      } else {
        setZapierResult({ success: false, text: data.error || "ওয়েবহুক সংযোগ ব্যর্থ হয়েছে" });
      }
    } catch {
      setZapierResult({ success: false, text: "Zapier ডিসপ্যাচ ব্যর্থ হয়েছে" });
    } finally {
      setZapierSending(false);
      setTimeout(() => setZapierResult(null), 4000);
    }
  };

  return (
    <section 
      aria-labelledby="leakage-title" 
      className="rounded-2xl border border-amber-200/90 bg-gradient-to-br from-amber-50/60 via-white to-emerald-50/40 p-5 sm:p-7 shadow-xs hover:shadow-md transition-all"
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-amber-100 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500 text-white shadow-xs">
              <TrendingDown size={16} aria-hidden />
            </span>
            <span className="text-[12px] font-bold uppercase tracking-wider text-amber-900">
              বার্ষিক আয় অডিট · ফি অপচয় বিশ্লেষণ
            </span>
          </div>
          <h2 id="leakage-title" className="mt-1.5 text-[20px] font-extrabold text-slate-900 sm:text-[24px]">
            বছরে কত টাকা মধ্যস্বত্বভোগী ফি-তে হারিয়ে যাচ্ছে?
          </h2>
          <p className="mt-1 text-[13.5px] text-slate-600">
            মাসিক ${monthlyInvoiceUsd.toLocaleString()} আয় ধরে বার্ষিক মোট আয় <strong>${annualUsd.toLocaleString()}</strong> (প্রায় {fmtBdt(annualGrossBdt)})
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-3 rounded-2xl border border-rose-200 bg-rose-50/90 px-4 py-3 text-right">
          <div>
            <span className="block text-[11px] font-bold uppercase tracking-wider text-rose-800">
              ফাইভারে বার্ষিক অপচয়
            </span>
            <strong className="text-[22px] font-extrabold text-rose-700">
              {fmtBdt(leakageData.fiverrAnnualLeakage)}
            </strong>
            <span className="block text-[11.5px] font-medium text-rose-600">
              মোট আয়ের প্রায় {leakageData.leakagePct}% ফি ও স্প্রেডে কাটা
            </span>
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {/* Fiverr annual card */}
        <div className="rounded-xl border border-rose-200/80 bg-white p-4.5 shadow-2xs">
          <div className="flex items-center justify-between">
            <strong className="text-[15px] font-bold text-rose-950">Fiverr মার্কেটপ্লেস</strong>
            <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-bold text-rose-800">২০% ফি</span>
          </div>
          <div className="mt-3">
            <span className="text-[11.5px] text-slate-500">বার্ষিক হাতে পান</span>
            <p className="text-[20px] font-extrabold text-slate-900">{fmtBdt(leakageData.fiverrAnnualNet)}</p>
          </div>
          <ul className="mt-3 space-y-1.5 border-t border-slate-100 pt-2.5 text-[12px] text-slate-600">
            <li className="flex items-center justify-between">
              <span>প্ল্যাটফর্ম ২০% কমিশন:</span>
              <span className="font-mono font-semibold text-rose-600">-{fmtBdt(Math.round(annualGrossBdt * 0.20))}</span>
            </li>
            <li className="flex items-center justify-between">
              <span>উইথড্রয়াল ও FX স্প্রেড:</span>
              <span className="font-mono font-semibold text-rose-600">~{fmtBdt(Math.round(annualGrossBdt * 0.04))}</span>
            </li>
          </ul>
        </div>

        {/* Direct SWIFT card */}
        <div className="rounded-xl border-2 border-emerald-500 bg-white p-4.5 shadow-xs relative">
          <span className="absolute -top-3 right-4 rounded-full bg-emerald-700 px-2.5 py-0.5 text-[10.5px] font-bold text-white shadow-2xs">
            সর্বোচ্চ লাভজনক রুট
          </span>
          <div className="flex items-center justify-between">
            <strong className="text-[15px] font-bold text-emerald-950">সরাসরি ওয়্যার (SWIFT)</strong>
            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-800">০% কমিশন</span>
          </div>
          <div className="mt-3">
            <span className="text-[11.5px] text-slate-500">বার্ষিক হাতে পান (প্রণোদনাসহ)</span>
            <p className="text-[20px] font-extrabold text-emerald-800">{fmtBdt(leakageData.directAnnualNet)}</p>
          </div>
          <ul className="mt-3 space-y-1.5 border-t border-slate-100 pt-2.5 text-[12px] text-slate-600">
            <li className="flex items-center justify-between">
              <span>প্ল্যাটফর্ম কমিশন:</span>
              <span className="font-mono font-semibold text-emerald-700">৳০ (নেই)</span>
            </li>
            <li className="flex items-center justify-between">
              <span>সরকারি ২.৫% নগদ প্রণোদনা:</span>
              <span className="font-mono font-semibold text-emerald-700">+{fmtBdt(Math.round(annualGrossBdt * 0.025))}</span>
            </li>
          </ul>
        </div>

        {/* Direct Client Migration advantage */}
        <div className="rounded-xl border border-indigo-200/90 bg-indigo-50/70 p-4.5 shadow-2xs sm:col-span-2 lg:col-span-1">
          <div className="flex items-center gap-1.5">
            <Sparkles size={16} className="text-indigo-700" aria-hidden />
            <strong className="text-[15px] font-bold text-indigo-950">সরাসরি ক্লায়েন্টে সাশ্রয়</strong>
          </div>
          <p className="mt-2 text-[12.5px] leading-relaxed text-indigo-900">
            Fiverr থেকে সরাসরি বৈধ চুক্তিতে (Contract) ক্লায়েন্ট আনলে বছরে আপনার কাছে অতিরিক্ত থাকবে:
          </p>
          <p className="mt-2 text-[24px] font-black text-indigo-900">
            +{fmtBdt(leakageData.directAdvantage)}
          </p>

          <div className="mt-3 rounded-lg bg-white/90 p-2.5 text-[12px] text-indigo-950 border border-indigo-100">
            <div className="flex gap-1 mb-1.5">
              {(["rent", "macbook", "bazar"] as const).map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setSavingsUsage(key)}
                  className={`rounded px-1.5 py-0.5 text-[10.5px] font-semibold transition-colors ${
                    savingsUsage === key ? "bg-indigo-700 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {tangibleEquivalents[key].label}
                </button>
              ))}
            </div>
            <p className="text-[11.5px] font-medium text-indigo-950 leading-snug">
              💡 {tangibleEquivalents[savingsUsage].desc}
            </p>
          </div>
        </div>
      </div>

      {zapierResult && (
        <div className={`mt-4 rounded-xl px-4 py-2.5 text-center text-[12.5px] font-semibold transition-all ${zapierResult.success ? "bg-emerald-600 text-white" : "bg-rose-600 text-white"}`}>
          {zapierResult.text}
        </div>
      )}

      {/* Action banner to ChuktiGuard & Zapier */}
      <div className="mt-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3.5 sm:p-4 text-[13px]">
        <div className="flex items-center gap-2.5">
          <FileCheck size={18} className="text-emerald-700 shrink-0" aria-hidden />
          <span className="text-slate-700">
            মার্কেটপ্লেসের বাইরে ঝুঁকিহীনভাবে ক্লায়েন্টের সাথে কাজ করতে চান? <strong>চুক্তিগার্ড (ChuktiGuard)</strong> দিয়ে ধারা ৪ (ইন্টারনেট ব্ল্যাকআউট সুরক্ষা) ও এনবিআর আইটিইএস ইনভয়েস তৈরি করুন।
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            onClick={handleExportToZapier}
            disabled={zapierSending}
            title="Zapier ওয়েবহুকে মাসিক অডিট লগ করুন (Google Sheets, Slack)"
            className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 font-bold text-amber-900 hover:bg-amber-100 transition-colors shadow-2xs text-[12px]"
          >
            <Zap size={14} className={`text-amber-600 ${zapierSending ? "animate-pulse" : ""}`} />
            <span>{zapierSending ? "পাঠানো হচ্ছে..." : "Zapier শিট এক্সপোর্ট"}</span>
          </button>
          <Link
            href="/chuktiguard"
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-2 font-bold text-white hover:bg-slate-800 transition-colors shadow-2xs text-[12.5px]"
          >
            <span>চুক্তি খসড়া তৈরি করুন</span>
            <ArrowRight size={14} aria-hidden />
          </Link>
        </div>
      </div>
    </section>
  );
}
