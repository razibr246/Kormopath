import type { Metadata } from "next";
import { PlayCircle } from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { DemoPlayer } from "@/components/DemoPlayer";

export const metadata: Metadata = {
  title: "Demo video",
  description: "A narrated 2-minute tour of KormoPath: the four-agent flagship and six everyday apps.",
};

export default function DemoPage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 antialiased">
      <AppHeader
        appId="kormopath"
        href="/demo"
        name="Demo video"
        taglineEn="KormoPath in 2 minutes"
        taglineBn="২ মিনিটে কর্মপথ"
        icon={<PlayCircle size={22} />}
        accent="from-orange-500 to-amber-600"
        privacyNote={null}
      />
      <main id="main" className="mx-auto max-w-5xl space-y-6 px-4 py-8 sm:px-6" lang="en">
        <h1 className="text-[28px] font-extrabold leading-tight sm:text-[34px]">KormoPath — 2-minute demo</h1>
        <DemoPlayer />
      </main>
    </div>
  );
}
