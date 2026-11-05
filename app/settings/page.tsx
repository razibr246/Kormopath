"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ShieldCheck, Download, Trash2, HardDrive } from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { listKeys, removeStored, downloadText, type AppNamespace } from "@/lib/clientStore";

const APPS: { ns: AppNamespace; name: string; href: string; what: string; sensitive?: boolean; legacy?: string[] }[] = [
  { ns: "shohoj", name: "Shohoj Budget", href: "/shohoj-budget", what: "লেনদেন, বাজেট, খাতভিত্তিক সীমা, সঞ্চয়ের লক্ষ্য, নিয়মিত লেনদেন", legacy: ["shohoj_expenses"] },
  { ns: "mediscan", name: "MediScan BD", href: "/mediscan", what: "আপনি সংরক্ষণ করতে বেছে নেওয়া প্রেসক্রিপশন, রিমাইন্ডারের সময়", sensitive: true },
  { ns: "admitbuddy", name: "AdmitBuddy", href: "/admitbuddy", what: "প্রোফাইল, শর্টলিস্ট, আবেদনের অবস্থা ও নোট, তারিখ, কাগজপত্রের তালিকা, SOP খসড়া" },
  { ns: "probaho", name: "Probaho Coach", href: "/probaho", what: "অনুশীলনের স্কোর (ট্রান্সক্রিপ্ট শুধু আপনি চাইলে), মাইক সম্মতি" },
  { ns: "haatbazar", name: "HaatBazar AI", href: "/haatbazar", what: "দামের খাতা, কৃষি বাজার/পরিবহনের quote, জেলা" },
  { ns: "feeguard", name: "FeeGuard BD", href: "/feeguard", what: "পেমেন্ট রেকর্ড" },
  { ns: "chuktiguard", name: "ChuktiGuard", href: "/chuktiguard", what: "Service Pack ও চুক্তির খসড়া" },
  { ns: "platform", name: "KormoPath প্ল্যাটফর্ম", href: "/", what: "সাধারণ প্রোফাইল, My Path-এর অগ্রগতি ও সংরক্ষিত সুযোগ", legacy: ["kormopath_unified_profile_v1"] },
];

function keysFor(app: (typeof APPS)[number]) {
  const legacy = (app.legacy ?? []).filter((k) => {
    try {
      return window.localStorage.getItem(k) !== null;
    } catch {
      return false;
    }
  });
  return [...listKeys(app.ns), ...legacy];
}

function bytes(keys: string[]) {
  try {
    return keys.reduce((a, k) => a + (window.localStorage.getItem(k)?.length ?? 0) * 2, 0);
  } catch {
    return 0;
  }
}

export default function SettingsPage() {
  const [, force] = useState(0);
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);

  const exportApp = (app: (typeof APPS)[number]) => {
    const data: Record<string, unknown> = {};
    for (const k of keysFor(app)) {
      try {
        data[k] = JSON.parse(window.localStorage.getItem(k) ?? "null");
      } catch {
        data[k] = window.localStorage.getItem(k);
      }
    }
    downloadText(`kormopath-${app.ns}-export.json`, JSON.stringify({ app: app.name, exportedAt: new Date().toISOString(), data }, null, 2), "application/json;charset=utf-8");
  };

  const wipeApp = (app: (typeof APPS)[number]) => {
    if (!window.confirm(`${app.name}-এর এই ডিভাইসে রাখা সব ডেটা মুছে যাবে। এটি ফেরানো যাবে না। আগে এক্সপোর্ট করেছেন?`)) return;
    for (const k of keysFor(app)) removeStored(k);
    force((n) => n + 1);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 antialiased">
      <AppHeader taglineEn="Your data & privacy" appId="kormopath" href="/settings" name="ডেটা ও প্রাইভেসি" taglineBn="কর্মপথের অ্যাপগুলো আপনার কোন তথ্য কোথায় রাখে" icon={<ShieldCheck size={22} />} accent="from-slate-700 to-slate-900" privacyNote={null} />
      <main id="main" className="mx-auto max-w-4xl space-y-6 px-4 py-6 sm:px-6">
        <section className="space-y-2 rounded-2xl border border-slate-200 bg-white p-5 text-[14px] leading-relaxed text-slate-700">
          <h1 className="text-[22px] font-extrabold text-slate-900">আপনার ডেটা আপনার ডিভাইসেই থাকে</h1>
          <p>KormoPath-এ লগইন অ্যাকাউন্ট বা ব্যবহারকারীর ডেটাবেস নেই। সংরক্ষণ চালু করলে তথ্য এই ব্রাউজারের লোকাল স্টোরেজে অ্যাপভিত্তিক আলাদা ঘরে থাকে। অন্য অ্যাপ তা স্বয়ংক্রিয়ভাবে পড়ে না। ব্রাউজার ডেটা মুছলে, ডিভাইস হারালে বা অন্য ব্রাউজারে গেলে স্থানীয় তথ্য হারাতে পারেন।</p>
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-[13px] text-amber-950">
            <strong className="block">আপনি কোনো অনলাইন সুবিধা চালালে কী পাঠানো হয়</strong>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li><strong>Workspace audit:</strong> আপনি জমা দেওয়া CV/প্রোফাইল লেখা বা ফাইল Gemini-তে যায়; GitHub username দিলে বা CV-তে GitHub URL থাকলে public repo lookup-এর জন্য username GitHub-এ যায়। Viva উত্তর, pitch-এর নাম/client/scope/দামের তথ্য এবং receipt OCR অনুরোধও সংশ্লিষ্ট KormoPath API-তে যায়; model-backed grading/drafting/OCR হলে Gemini-তে পাঠানো হয়।</li>
              <li><strong>Buddy:</strong> পাঠানো chat বার্তা Gemini-তে যায়। Buddy আপনার ব্রাউজারের অন্য অ্যাপের সংরক্ষিত ডেটা পড়তে পারে না।</li>
              <li><strong>ওয়েব সার্চ:</strong> My Path, Shohoj Budget ও HaatBazar-এ আপনি যে query লিখে সার্চ করেন তা Gemini Search-এ যায়।</li>
              <li><strong>MediScan:</strong> prescription-এর ছবি OCR করতে সম্মতি দিয়ে submit করলে ছবিটি Gemini-তে যায়। স্থানীয় নোট বা লেখা upload না করলে স্বয়ংক্রিয়ভাবে পাঠানো হয় না।</li>
              <li><strong>ভয়েস:</strong> Probaho/Shohoj-এর speech recognition আপনার browser-এর সেবা ব্যবহার করে; browser/provider অনুযায়ী audio বাইরে প্রক্রিয়াকৃত হতে পারে।</li>
              <li><strong>লাইভ তথ্য:</strong> USD/BDT rate-এর জন্য exchange-rate service এবং HaatBazar আবহাওয়ার জন্য Open-Meteo ব্যবহৃত হয়; আবহাওয়ার অনুরোধে নির্বাচিত জেলার পরিচিতি পাঠানো হয়।</li>
              <li><strong>Passport:</strong> issue/share করলে signing ও যাচাইয়ের জন্য token data KormoPath API-তে যায়। শেয়ার লিংক যার কাছে থাকবে, মেয়াদ শেষ না হওয়া পর্যন্ত সে নির্বাচিত তথ্য দেখতে পারে।</li>
            </ul>
          </div>
          <p className="text-[12px] text-slate-600">KormoPath application account database-এ এসব local record রাখা হয় না। তবে request প্রক্রিয়ায় KormoPath hosting ও নির্বাচিত third-party provider জড়িত; তাদের retention/data terms আলাদা। API key কোন billing/data tier-এ আছে তা deployment owner নিশ্চিত করবেন। পাসওয়ার্ড, পেমেন্ট গোপন তথ্য, রোগীর পরিচয় বা অপ্রয়োজনীয় sensitive তথ্য কোনো chat/search-এ দেবেন না।</p>
          <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-[12px] leading-relaxed text-red-950"><strong>Gemini API-এর unpaid service সতর্কতা:</strong> Google-এর বর্তমান শর্তে unpaid quota-তে পাঠানো লেখা, ছবি/ফাইল ও উত্তর Google-এর পণ্য উন্নয়নে ব্যবহৃত হতে পারে এবং মানব পর্যালোচক দেখতে পারেন। সংবেদনশীল, গোপন বা ব্যক্তিগত তথ্য unpaid service-এ পাঠাবেন না। Paid service-এও abuse monitoring-এর জন্য সীমিত logging থাকতে পারে। এই অ্যাপ নিজে billing tier শনাক্ত করতে পারে না। চালুর আগে <a href="https://ai.google.dev/gemini-api/terms" target="_blank" rel="noopener noreferrer" className="font-bold underline">Google Gemini API terms</a> যাচাই করুন।</p>
          <p className="text-[12px] text-slate-500">শেয়ার করা বা পাবলিক কম্পিউটারে ব্যবহার শেষে এখান থেকে ডেটা export বা মুছুন। ব্রাউজারের “সাইট ডেটা মুছুন” করলেও সব local data মুছে যাবে।</p>
        </section>

        <section aria-label="অ্যাপভিত্তিক ডেটা" className="space-y-3">
          {APPS.map((app) => {
            const keys = ready ? keysFor(app) : [];
            const size = ready ? bytes(keys) : 0;
            return (
              <div key={app.ns} className={`flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-white p-4 ${app.sensitive ? "border-sky-300" : "border-slate-200"}`}>
                <div className="min-w-0">
                  <Link href={app.href} className="text-[15px] font-bold hover:underline">{app.name}</Link>
                  {app.sensitive && <span className="ml-2 rounded bg-sky-100 px-1.5 py-0.5 text-[10px] font-bold text-sky-800">সংবেদনশীল স্বাস্থ্য তথ্য</span>}
                  <p className="text-[12px] text-slate-500">{app.what}</p>
                  <p className="mt-0.5 flex items-center gap-1 text-[11px] text-slate-400"><HardDrive size={12} aria-hidden /> {keys.length ? `${keys.length}টি আইটেম · প্রায় ${(size / 1024).toFixed(1)} KB` : "কিছু সংরক্ষিত নেই"}</p>
                </div>
                <div className="flex gap-2">
                  <button disabled={!keys.length} onClick={() => exportApp(app)} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-[12px] font-bold disabled:opacity-40"><Download size={14} aria-hidden /> এক্সপোর্ট</button>
                  <button disabled={!keys.length} onClick={() => wipeApp(app)} className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-3 py-1.5 text-[12px] font-bold text-red-700 disabled:opacity-40"><Trash2 size={14} aria-hidden /> মুছুন</button>
                </div>
              </div>
            );
          })}
        </section>
      </main>
    </div>
  );
}
