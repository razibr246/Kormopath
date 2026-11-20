"use client";
import { useEffect, useRef, useState } from "react";
import { Handshake } from "lucide-react";
import { SourceTag } from "@/components/layout/AppHeader";
import { usePersistentState } from "@/lib/clientStore";
import { NOT_LEGAL_ADVICE_BN, NOT_LEGAL_ADVICE_EN, LAWS } from "@/lib/legal/data";
import {
  EMPTY_DRAFT, MEDIATION_STORAGE_KEY, sanitizeMediation, type DraftInputs, type SafetyAnswers, type SavedMediation,
} from "@/lib/legal/mediationUi";
import { MediationPrep } from "@/components/apps/legal/MediationPrep";
import { MediationPlanner } from "@/components/apps/legal/MediationPlanner";
import { SettlementDraft } from "@/components/apps/legal/SettlementDraft";

/*
 * Mediation and settlement (ported from the Digital Legal Aid System, razibr246 and AdribMahmud101).
 * Everything is worked on in memory and written to this device (kormopath:legal:mediation) only when the person
 * reviews the draft and taps save. Nothing is sent anywhere.
 */
export default function MediationPage() {
  const [lang, setLang] = useState<"bn" | "en">("bn");
  const bn = lang === "bn";
  const T = (b: string, e: string) => (bn ? b : e);
  const [saved, setSaved, { ready }] = usePersistentState<SavedMediation | null>(MEDIATION_STORAGE_KEY, null, sanitizeMediation);

  const [prep, setPrep] = useState<string[]>([]);
  const [wants, setWants] = useState("");
  const [canAccept, setCanAccept] = useState("");
  const [mustNot, setMustNot] = useState("");
  const [safety, setSafety] = useState<SafetyAnswers>({});
  const [holidays, setHolidays] = useState<string[]>([]);
  const [draft, setDraft] = useState<DraftInputs>(EMPTY_DRAFT);

  // Load the saved copy once, after mount.
  const loaded = useRef(false);
  useEffect(() => {
    if (!ready || loaded.current) return;
    loaded.current = true;
    if (!saved) return;
    setPrep(saved.prep); setWants(saved.wants); setCanAccept(saved.canAccept); setMustNot(saved.mustNot);
    setSafety(saved.safety); setHolidays(saved.holidays); setDraft(saved.draft);
  }, [ready, saved]);

  const save = () => setSaved({ prep, wants, canAccept, mustNot, safety, holidays, draft, savedAt: new Date().toISOString() });
  const clear = () => {
    if (!window.confirm(T("এই ফোন থেকে মীমাংসার সব তথ্য মুছে ফেলবেন?", "Delete all mediation notes from this phone?"))) return;
    setSaved(null); setPrep([]); setWants(""); setCanAccept(""); setMustNot(""); setSafety({}); setHolidays([]); setDraft(EMPTY_DRAFT);
  };

  return (
    <div className="space-y-6" data-testid="legal-mediation">
      <section className="lg-card motion-safe:animate-rise-in">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="kp-eyebrow">{T("মীমাংসা · বিকল্প বিরোধ নিষ্পত্তি", "Mediation · alternative dispute resolution")}</p>
            <h1 className="mt-2 text-[clamp(30px,5vw,50px)] font-semibold leading-[1.08] text-slate-900">
              {bn ? <>আদালতের বাইরে, <em className="kp-em">নিজের শর্তে</em></> : <>Outside court, <em className="kp-em">on your own terms</em></>}
            </h1>
            <p className="mt-3 max-w-[62ch] text-[15.5px] leading-relaxed text-slate-700">
              {T(
                "জেলা লিগ্যাল এইড অফিস অনেক বিরোধে বিনামূল্যে মধ্যস্থতার ব্যবস্থা করতে পারে। এখানে আপনি নিরাপদ কি না যাচাই করবেন, কী নিয়ে যাবেন ঠিক করবেন, আর আলোচনার জন্য একটি খসড়া বানাবেন।",
                "District legal aid offices can arrange free mediation for many disputes. Here you check that you are safe, decide what to bring, and build a draft to talk from.",
              )}
            </p>
          </div>
          <button type="button" onClick={() => setLang(bn ? "en" : "bn")} className="kp-chip !h-9 font-semibold" aria-label={bn ? "EN, Switch to English" : "বাং, বাংলায় দেখুন"}>{bn ? "EN" : "বাং"}</button>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Handshake size={18} className="text-indigo-700" aria-hidden />
          <span className="text-[13.5px] text-slate-600">{bn ? NOT_LEGAL_ADVICE_BN : NOT_LEGAL_ADVICE_EN}</span>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {[LAWS.legal_aid_2000, LAWS.arbitration_2001].map((l) => <SourceTag key={l.id} confidence="official" label={l.source.label} url={l.source.url} checked={l.source.checked} />)}
        </div>
      </section>

      <MediationPrep bn={bn} safety={safety} setSafety={setSafety} prep={prep} setPrep={setPrep} wants={wants} setWants={setWants} canAccept={canAccept} setCanAccept={setCanAccept} mustNot={mustNot} setMustNot={setMustNot} />
      <MediationPlanner bn={bn} sessionDate={draft.sessionDate} setSessionDate={(d) => setDraft({ ...draft, sessionDate: d })} holidays={holidays} setHolidays={setHolidays} />
      <SettlementDraft bn={bn} draft={draft} setDraft={setDraft} onSave={save} savedAt={saved?.savedAt ?? null} />

      {saved && (
        <p className="flex flex-wrap items-center gap-3 text-[13.5px] text-slate-600">
          {T("শেষ সংরক্ষণ:", "Last saved:")} <span className="font-mono">{saved.savedAt.slice(0, 16).replace("T", " ")}</span>
          <button type="button" onClick={clear} className="min-h-[44px] rounded-xl px-3 font-semibold text-red-700 hover:bg-red-50">{T("সব মুছুন", "Delete all")}</button>
        </p>
      )}
    </div>
  );
}
