import type { Metadata } from "next";
import Link from "next/link";
import { KormoPathMark } from "@/components/KormoPathLogo";

export const metadata: Metadata = { title: "অফলাইন", robots: { index: false } };

/** Shown by the service worker when there is no connection and the page was never opened before. */
export default function OfflinePage() {
  return (
    <main id="main" className="mx-auto flex min-h-[80vh] max-w-xl flex-col items-center justify-center px-6 text-center">
      <KormoPathMark className="h-20 w-20" />
      <h1 className="mt-6 text-[clamp(28px,6vw,40px)] font-semibold tracking-tight text-slate-900">এখন ইন্টারনেট নেই</h1>
      <p className="mt-3 text-[16px] leading-relaxed text-slate-600">
        আগে খোলা টুলগুলো অফলাইনেও খুলবে, আর আপনার সংরক্ষিত তথ্য এই ডিভাইসেই আছে। ওয়েব খোঁজ, আবহাওয়া, লাইভ রেট আর বাডির উত্তরের জন্য সংযোগ লাগবে।
      </p>
      <p className="mt-2 text-[14px] text-slate-500">You&apos;re offline. Tools you opened before still work; live search, weather, rates and Buddy need a connection.</p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link href="/" className="kp-btn-primary kp-btn-lg">হোমে যান</Link>
        <Link href="/settings" className="kp-btn-ghost kp-btn-lg">আমার ডেটা</Link>
      </div>
    </main>
  );
}
