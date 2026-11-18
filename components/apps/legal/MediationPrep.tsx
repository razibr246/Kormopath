"use client";
import { AlertTriangle, CheckCircle2, Phone, ShieldAlert } from "lucide-react";
import { SourceTag } from "@/components/layout/AppHeader";
import { HELPLINES } from "@/lib/legal/data";
import { PREP_ITEMS, SAFETY_QUESTIONS, bnNum, safetyFlagged, type SafetyAnswers } from "@/lib/legal/mediationUi";

/*
 * Mediation prep (ported from the Digital Legal Aid System, razibr246 and AdribMahmud101): what mediation is, a
 * safety screen that never pushes mediation on someone facing violence, and a checklist of what to bring and decide.
 */
export function MediationPrep({
  bn, safety, setSafety, prep, setPrep, wants, setWants, canAccept, setCanAccept, mustNot, setMustNot,
}: {
  bn: boolean;
  safety: SafetyAnswers; setSafety: (s: SafetyAnswers) => void;
  prep: string[]; setPrep: (p: string[]) => void;
  wants: string; setWants: (v: string) => void;
  canAccept: string; setCanAccept: (v: string) => void;
  mustNot: string; setMustNot: (v: string) => void;
}) {
  const T = (b: string, e: string) => (bn ? b : e);
  const flagged = safetyFlagged(safety);
  const urgent = HELPLINES.filter((h) => h.id === "emergency" || h.id === "women_children" || h.id === "legal_aid");
  const toggle = (id: string) => setPrep(prep.includes(id) ? prep.filter((x) => x !== id) : [...prep, id]);
  const field = "mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-[15px] leading-relaxed";

  return (
    <section aria-labelledby="med-prep-h" className="lg-card space-y-5 motion-safe:animate-rise-in" data-testid="med-prep">
      <div>
        <p className="kp-eyebrow">{T("প্রস্তুতি", "Prepare")}</p>
        <h2 id="med-prep-h" className="mt-1 text-[clamp(21px,3vw,27px)] font-semibold leading-tight text-slate-900">{T("মীমাংসার আগে নিজেকে নিরাপদ রাখুন", "Before mediation, keep yourself safe")}</h2>
        <p className="mt-2 max-w-[62ch] text-[15px] leading-relaxed text-slate-700">
          {T(
            "মীমাংসা (সালিশ) মানে দুই পক্ষ একজন নিরপেক্ষ মধ্যস্থতাকারীর সামনে বসে আলোচনা করে সমাধান খোঁজা। এতে রাজি হওয়া বা না হওয়া আপনার সিদ্ধান্ত — কেউ আপনাকে বাধ্য করতে পারে না।",
            "Mediation means both sides sit with a neutral mediator and look for a solution together. Agreeing to it, or not, is your choice — no one can force you.",
          )}
        </p>
      </div>

      <fieldset className="space-y-2">
        <legend className="text-[17px] font-bold text-slate-900">{T("এগুলোর কোনোটি কি আপনার ক্ষেত্রে সত্য?", "Is any of this true for you?")}</legend>
        {SAFETY_QUESTIONS.map((q) => {
          const on = safety[q.id] === true;
          return (
            <label key={q.id} className={`flex min-h-[48px] cursor-pointer items-center gap-3 rounded-xl border px-3 py-2 text-[15px] leading-[1.45] transition-colors ${on ? "border-red-400 bg-red-50 font-semibold text-red-950" : "border-slate-200 bg-white text-slate-800"}`}>
              <input type="checkbox" checked={on} onChange={(e) => setSafety({ ...safety, [q.id]: e.target.checked })} className="h-5 w-5 accent-red-700" />
              <span>{bn ? q.bn : q.en}</span>
            </label>
          );
        })}
      </fieldset>

      {flagged && (
        <div role="alert" className="rounded-2xl border-2 border-red-400 bg-red-50 p-4 text-red-950" data-testid="med-safety-alert">
          <p className="flex items-start gap-2 text-[18px] font-bold leading-snug"><ShieldAlert size={22} className="mt-0.5 shrink-0" aria-hidden />{T("এই অবস্থায় মীমাংসা আপনার জন্য সঠিক পথ নাও হতে পারে", "Mediation may not be the right path for you now")}</p>
          <p className="mt-2 max-w-[62ch] text-[15px] leading-relaxed">
            {T(
              "সহিংসতা, হুমকি বা চাপের মধ্যে মীমাংসায় বসলে আপনি নিজের কথা স্বাধীনভাবে বলতে পারবেন না। মীমাংসায় রাজি হতে হবে না। আগে নিজের নিরাপত্তা নিশ্চিত করুন এবং আইনি সহায়তা নিন।",
              "With violence, threats or pressure you cannot speak freely in mediation. You do not have to agree to it. Make yourself safe first and get legal help.",
            )}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {urgent.map((h) => (
              <a key={h.id} href={`tel:${h.number}`} className={`inline-flex min-h-[48px] items-center gap-2 rounded-xl px-4 text-[15px] font-bold leading-[1.4] ${h.id === "emergency" ? "bg-red-700 text-white" : "border border-red-300 bg-white text-red-900"}`}>
                <Phone size={17} aria-hidden /> <span className="font-mono">{bn ? bnNum(h.number) : h.number}</span> {bn ? h.bn : h.en}
              </a>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">{urgent.map((h) => <SourceTag key={h.id} confidence="official" label={h.source.label} url={h.source.url} checked={h.source.checked} />)}</div>
        </div>
      )}

      <fieldset>
        <legend className="text-[17px] font-bold text-slate-900">{T("সঙ্গে নিন ও আগে ঠিক করুন", "Bring and decide in advance")}</legend>
        <ul className="mt-2 grid gap-2 sm:grid-cols-2">
          {PREP_ITEMS.map((p, i) => {
            const on = prep.includes(p.id);
            return (
              <li key={p.id} className="motion-safe:animate-rise-in" style={{ animationDelay: `${i * 40}ms` }}>
                <label className={`flex min-h-[52px] cursor-pointer items-center gap-3 rounded-xl border px-3 py-2 text-[15px] leading-[1.45] transition-colors ${on ? "border-emerald-500 bg-emerald-50 text-emerald-950" : "border-slate-200 bg-white text-slate-800"}`}>
                  <input type="checkbox" checked={on} onChange={() => toggle(p.id)} className="h-5 w-5 accent-emerald-700" />
                  <span className="flex-1">{bn ? p.bn : p.en}</span>
                  {on && <CheckCircle2 size={18} className="text-emerald-700" aria-hidden />}
                </label>
              </li>
            );
          })}
        </ul>
        <p className="mt-2 text-[13.5px] text-slate-600">{T(`${bnNum(prep.length)}/${bnNum(PREP_ITEMS.length)} প্রস্তুত`, `${prep.length}/${PREP_ITEMS.length} ready`)}</p>
      </fieldset>

      <div className="grid gap-3 md:grid-cols-3">
        <label className="text-[14px] font-semibold text-slate-800">{T("আমি কী চাই", "What I want")}
          <textarea rows={3} maxLength={600} value={wants} onChange={(e) => setWants(e.target.value)} className={field} />
        </label>
        <label className="text-[14px] font-semibold text-slate-800">{T("কোন পর্যন্ত মানতে পারি", "What I can accept")}
          <textarea rows={3} maxLength={600} value={canAccept} onChange={(e) => setCanAccept(e.target.value)} className={field} />
        </label>
        <label className="text-[14px] font-semibold text-slate-800">{T("কোনোভাবেই মানব না", "What I will never accept")}
          <textarea rows={3} maxLength={600} value={mustNot} onChange={(e) => setMustNot(e.target.value)} className={field} />
        </label>
      </div>
      <p className="flex items-start gap-2 text-[13.5px] leading-relaxed text-slate-600"><AlertTriangle size={16} className="mt-0.5 shrink-0 text-amber-700" aria-hidden />{T("সালিশে চাপ অনুভব করলে আলোচনা থামাতে ও সময় চাইতে পারেন। কোনো কাগজ না বুঝে সই করবেন না।", "If you feel pressured you can stop and ask for time. Never sign a paper you do not understand.")}</p>
    </section>
  );
}
