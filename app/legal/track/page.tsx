"use client";
import { useState } from "react";
import Link from "next/link";
import { ClipboardList, Scale } from "lucide-react";
import { CaseTimeline } from "@/components/apps/legal/CaseTimeline";
import { usePersistentState } from "@/lib/clientStore";
import { sanitizeCaseFiles, type CaseFile } from "@/lib/legal/caseFile";
import { LEGAL_CASES_KEY } from "@/lib/legal/citizen";
import { NOT_LEGAL_ADVICE_BN, NOT_LEGAL_ADVICE_EN } from "@/lib/legal/data";

/** /legal/track: the person's own saved drafts as diaries. Statuses are self-reported; no office data is shown. */
export default function LegalTrack() {
  const [lang, setLang] = useState<"bn" | "en">("bn");
  const bn = lang === "bn";
  const [files, setFiles, state] = usePersistentState<CaseFile[]>(LEGAL_CASES_KEY, [], sanitizeCaseFiles);
  const update = (next: CaseFile) => setFiles((prev) => prev.map((f) => (f.id === next.id ? next : f)));
  const remove = (id: string) => setFiles((prev) => prev.filter((f) => f.id !== id));

  return (
    <>
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="kp-eyebrow">{bn ? "আমার কেস" : "My case"}</p>
          <h1 className="mt-2 text-[clamp(30px,5vw,50px)] font-semibold leading-[1.08] text-slate-900">
            {bn ? <>নিজের হিসাব, <em className="kp-em">নিজের হাতে</em></> : <>Your own record, <em className="kp-em">in your hands</em></>}
          </h1>
          <p className="mt-2 max-w-[62ch] text-[15.5px] leading-relaxed text-slate-700">
            {bn ? "আপনার খসড়াগুলো আর যা ঘটছে তা এখানে নিজে লিখে রাখুন। এটি কোনো অফিসের রেকর্ড নয়, শুধু এই ফোনে থাকে।"
              : "Your drafts and what happens next, noted by you. This is not an office record; it stays on this phone."}
          </p>
        </div>
        <button type="button" onClick={() => setLang(bn ? "en" : "bn")} className="kp-chip !h-9 !rounded-full !text-[13px] font-semibold" aria-label={bn ? "Switch to English" : "বাংলায় দেখুন"}>{bn ? "EN" : "বাং"}</button>
      </header>

      {state.ready && files.length === 0 && (
        <section className="lg-card flex flex-col items-center gap-3 py-10 text-center" data-testid="track-empty">
          <span className="lg-scale lg-scale-settle text-indigo-800" aria-hidden><Scale size={56} strokeWidth={1.5} /></span>
          <p className="text-[18px] font-bold text-slate-900">{bn ? "এখনো কোনো খসড়া নেই" : "No drafts yet"}</p>
          <p className="max-w-[46ch] text-[15px] leading-relaxed text-slate-600">{bn ? "আবেদনের খসড়া তৈরি করলে সেটি এখানে দেখা যাবে।" : "Prepare an application draft and it will show up here."}</p>
          <Link href="/legal/apply" className="kp-btn-primary inline-flex min-h-[48px] items-center gap-2 px-5 text-[15px]"><ClipboardList size={18} aria-hidden /> {bn ? "খসড়া তৈরি করুন" : "Prepare a draft"}</Link>
        </section>
      )}

      <div className="space-y-4">
        {files.map((f) => <CaseTimeline key={f.id} file={f} lang={lang} onChange={update} onDelete={() => remove(f.id)} />)}
      </div>

      {files.length > 0 && <p className="text-[13.5px] leading-relaxed text-slate-600">{bn ? NOT_LEGAL_ADVICE_BN : NOT_LEGAL_ADVICE_EN}</p>}
    </>
  );
}
