"use client";

import { useState, useEffect } from "react";
import { Zap, Check, AlertCircle, Copy, Send, ExternalLink, ShieldCheck, RefreshCw } from "lucide-react";
import { validateZapierWebhookUrl, formatContractForZapier } from "@/lib/zapier";

const STORAGE_KEY = "kormopath:zapier:webhook_url";

export function ZapierIntegrationCard() {
  const [webhookUrl, setWebhookUrl] = useState("");
  const [savedUrl, setSavedUrl] = useState("");
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [copiedSample, setCopiedSample] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY) || "";
      setWebhookUrl(stored);
      setSavedUrl(stored);
    } catch {}
  }, []);

  const saveUrl = () => {
    const trimmed = webhookUrl.trim();
    const check = validateZapierWebhookUrl(trimmed);
    if (!check.valid && trimmed.length > 0) {
      setTestResult({ success: false, message: check.error || "অকার্যকর ইউআরএল" });
      return;
    }
    try {
      if (trimmed) {
        localStorage.setItem(STORAGE_KEY, trimmed);
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
      setSavedUrl(trimmed);
      setTestResult({ success: true, message: "Zapier ওয়েবহুক সংরক্ষিত হয়েছে" });
      setTimeout(() => setTestResult(null), 3000);
    } catch {}
  };

  const sendTestEvent = async () => {
    if (!savedUrl) {
      setTestResult({ success: false, message: "আগে একটি বৈধ ওয়েবহুক ইউআরএল সংরক্ষণ করুন" });
      return;
    }

    setTesting(true);
    setTestResult(null);

    const testPayload = formatContractForZapier({
      title: "Sample Web Development Agreement (Test)",
      freelancerName: "রহিম উদ্দিন (টেস্ট)",
      clientName: "Acme International",
      totalBdt: 75000,
      milestonesCount: 2,
      hasForceMajeure: true,
      effectiveDate: new Date().toISOString().split("T")[0],
    });

    try {
      const res = await fetch("/api/zapier/dispatch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          webhookUrl: savedUrl,
          event: testPayload.event,
          app: testPayload.app,
          data: testPayload.data,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setTestResult({
          success: true,
          message: "✓ সফলভাবে Zapier-এ টেস্ট ইভেন্ট পাঠানো হয়েছে! আপনার Zapier হিস্ট্রি চেক করুন।",
        });
      } else {
        setTestResult({
          success: false,
          message: data.error || `সার্ভার এরর: ${res.status}`,
        });
      }
    } catch (err) {
      setTestResult({
        success: false,
        message: err instanceof Error ? err.message : "ওয়েবহুক সংযোগ ব্যর্থ হয়েছে",
      });
    } finally {
      setTesting(false);
    }
  };

  const copySamplePayload = () => {
    const sample = formatContractForZapier({
      title: "Contract Title",
      freelancerName: "Freelancer Name",
      clientName: "Client Org",
      totalBdt: 100000,
      milestonesCount: 3,
      hasForceMajeure: true,
      effectiveDate: "2026-11-20",
    });
    try {
      navigator.clipboard.writeText(JSON.stringify(sample, null, 2));
      setCopiedSample(true);
      setTimeout(() => setCopiedSample(false), 2000);
    } catch {}
  };

  return (
    <div className="rounded-2xl border border-line bg-card p-4 sm:p-6 shadow-2xs space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-orange-600 text-white shadow-xs">
            <Zap size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-display text-base sm:text-lg font-bold text-slate-900">
                Zapier অটোমেশন ও ওয়েবহুক ইন্টিগ্রেশন
              </h3>
              <span className="rounded-full bg-orange-100 px-2 py-0.5 text-[10.5px] font-bold text-orange-900 border border-orange-200">
                ৯,০০০+ অ্যাপস
              </span>
            </div>
            <p className="text-xs text-slate-600 mt-0.5">
              কর্মপথের চুক্তি, ফি রিপোর্ট ও অডিট ডেটা সরাসরি গুগল ড্রাইভ, নোশন, স্ল্যাক বা স্প্রেডশিটে পাঠান।
            </p>
          </div>
        </div>
        <a
          href="https://zapier.com/apps/webhook/integrations"
          target="_blank"
          rel="noopener noreferrer"
          className="hidden sm:inline-flex items-center gap-1 text-xs font-semibold text-orange-700 hover:underline"
        >
          Zapier নির্দেশিকা <ExternalLink size={12} />
        </a>
      </div>

      {/* Webhook Input Field */}
      <div className="space-y-2 pt-2">
        <label htmlFor="zapier-webhook-input" className="block text-xs font-bold text-slate-800">
          আপনার Zapier Catch Hook URL:
        </label>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            id="zapier-webhook-input"
            type="url"
            value={webhookUrl}
            onChange={(e) => setWebhookUrl(e.target.value)}
            placeholder="https://hooks.zapier.com/hooks/catch/..."
            className="flex-1 rounded-xl border border-line bg-white px-3 py-2 text-xs font-mono text-slate-800 placeholder:text-slate-400 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
          />
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={saveUrl}
              className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800 transition-colors shadow-2xs"
            >
              সংরক্ষণ
            </button>
            <button
              type="button"
              onClick={sendTestEvent}
              disabled={testing || !savedUrl}
              className="inline-flex items-center gap-1.5 rounded-xl border border-orange-300 bg-orange-50 px-3.5 py-2 text-xs font-bold text-orange-900 hover:bg-orange-100 transition-colors disabled:opacity-50"
            >
              {testing ? <RefreshCw size={13} className="animate-spin" /> : <Send size={13} />}
              <span>টেস্ট পাঠান</span>
            </button>
          </div>
        </div>
      </div>

      {/* Status Feedback Toast */}
      {testResult && (
        <div
          className={`flex items-start gap-2 rounded-xl p-3 text-xs font-medium border ${
            testResult.success
              ? "bg-emerald-50 text-emerald-950 border-emerald-300"
              : "bg-red-50 text-red-950 border-red-300"
          }`}
        >
          {testResult.success ? (
            <Check size={16} className="text-emerald-700 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle size={16} className="text-red-700 shrink-0 mt-0.5" />
          )}
          <span className="leading-relaxed">{testResult.message}</span>
        </div>
      )}

      {/* Connected Features & Actions */}
      <div className="grid gap-2 sm:grid-cols-2 pt-1 text-xs">
        <div className="rounded-xl border border-slate-100 bg-white/70 p-2.5">
          <strong className="text-slate-900 block font-bold">📜 চুক্তিগার্ড (ChuktiGuard):</strong>
          <span className="text-slate-600 mt-0.5 block">
            নতুন চুক্তি তৈরি হলে মেটাডেটা স্বয়ংক্রিয়ভাবে নোশন ডাটাবেজ বা গুগল ড্রাইভে সেভ হবে।
          </span>
        </div>
        <div className="rounded-xl border border-slate-100 bg-white/70 p-2.5">
          <strong className="text-slate-900 block font-bold">৳ ফি-গার্ড (FeeGuard BD):</strong>
          <span className="text-slate-600 mt-0.5 block">
            বাৎসরিক ফি সাশ্রয় ও রেমিট্যান্স ক্যালকুলেশন রিপোর্ট এক্সেল বা শিটে এক্সপোর্ট হবে।
          </span>
        </div>
      </div>

      {/* Sample Payload Drawer & Privacy Guarantee */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-line text-[11.5px] text-slate-500">
        <div className="flex items-center gap-1.5 text-emerald-800 font-semibold">
          <ShieldCheck size={14} className="text-emerald-600" />
          <span>১০০% জিরো-পিআইআই: কোনো পাসওয়ার্ড বা গোপন ডেটা ওয়েবহুকে পাঠানো হয় না।</span>
        </div>
        <button
          type="button"
          onClick={copySamplePayload}
          className="inline-flex items-center gap-1 text-slate-700 hover:text-slate-950 font-bold underline cursor-pointer"
        >
          {copiedSample ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
          <span>{copiedSample ? "কপি হয়েছে!" : "নমুনা পে-লোড JSON কপি করুন"}</span>
        </button>
      </div>
    </div>
  );
}
