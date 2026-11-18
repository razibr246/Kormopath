"use client";
import Link from "next/link";
import { ArrowLeft, Printer } from "lucide-react";
import { usePersistentState } from "@/lib/clientStore";
import { MEDIATION_STORAGE_KEY, buildDraft, dateKeyBn, sanitizeMediation, type SavedMediation } from "@/lib/legal/mediationUi";
import { DraftDocument } from "@/components/apps/legal/SettlementDraft";

/* Print view of the saved settlement draft. The section's print CSS (components/apps/legal/legal.css) hides the
 * header, nav, help strip and footer; the buttons here carry `print:hidden`. */
export default function MediationPrintPage() {
  const [saved, , { ready }] = usePersistentState<SavedMediation | null>(MEDIATION_STORAGE_KEY, null, sanitizeMediation);
  if (!ready) return <p className="text-[15px] text-slate-600" role="status">খসড়া খোলা হচ্ছে…</p>;
  if (!saved) {
    return (
      <section className="lg-card space-y-3">
        <p className="text-[17px] font-bold text-slate-900">এখনো কোনো খসড়া সংরক্ষণ করা হয়নি।</p>
        <Link href="/legal/mediation" className="kp-btn-primary inline-flex min-h-[48px] items-center gap-2 rounded-xl px-5 text-[15px]"><ArrowLeft size={18} aria-hidden /> খসড়া বানান</Link>
      </section>
    );
  }
  const draft = buildDraft(saved.draft);
  return (
    <div className="space-y-4" data-testid="settle-print-view">
      <div className="flex flex-wrap gap-2 print:hidden">
        <Link href="/legal/mediation" className="kp-btn-ghost inline-flex min-h-[48px] items-center gap-2 rounded-xl px-4 text-[15px]"><ArrowLeft size={18} aria-hidden /> ফিরে যান</Link>
        <button type="button" onClick={() => window.print()} className="kp-btn-primary inline-flex min-h-[48px] items-center gap-2 rounded-xl px-5 text-[15px]"><Printer size={18} aria-hidden /> প্রিন্ট বা PDF</button>
      </div>
      <section className="lg-card print:border-0 print:p-0 print:shadow-none">
        <DraftDocument draft={draft} />
        <div className="mt-6 grid gap-6 sm:grid-cols-3 print:grid-cols-3">
          {["আবেদনকারী", "বিপরীত পক্ষ", "মধ্যস্থতাকারী"].map((r) => (
            <div key={r} className="pt-10 text-center text-[13.5px] text-slate-700"><div className="border-t border-slate-400 pt-1">{r}</div></div>
          ))}
        </div>
        <p className="mt-4 text-[12.5px] text-slate-600">
          এই ফোনে সংরক্ষিত: <span className="font-mono">{saved.savedAt.slice(0, 10)}</span>
          {saved.draft.sessionDate && <> · আলোচনার তারিখ: {dateKeyBn(saved.draft.sessionDate)}</>}
          {" "}· KormoPath আইনি সহায়তা থেকে তৈরি খসড়া। এটি কোনো সরকারি অফিস বা আদালত অনুমোদন করেনি।
        </p>
      </section>
    </div>
  );
}
