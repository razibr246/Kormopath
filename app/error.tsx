"use client";
import { RefreshCw } from "lucide-react";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <main id="main" className="mx-auto flex min-h-[75dvh] max-w-xl flex-col items-center justify-center px-5 text-center">
    <div className="rounded-full border border-amber-200 bg-amber-50 px-4 py-1.5 text-sm font-bold text-amber-900">সাময়িক সমস্যা</div>
    <h1 className="display mt-5 text-4xl font-extrabold tracking-tight text-slate-950">এই পৃষ্ঠাটি লোড হয়নি</h1>
    <p className="mt-3 text-slate-600">আপনার ডিভাইসে রাখা তথ্য অক্ষত আছে। আবার চেষ্টা করুন; সমস্যা থাকলে হোমপেজে ফিরে যান।</p>
    <div className="mt-6 flex gap-3"><button onClick={() => reset()} className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-3 font-bold text-white"><RefreshCw size={16}/>আবার চেষ্টা</button><a href="/" className="rounded-xl border border-slate-300 bg-white px-4 py-3 font-bold text-slate-800">হোমপেজ</a></div>
  </main>;
}
