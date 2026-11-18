"use client";
import { useEffect, useState } from "react";
import { RotateCcw, TriangleAlert } from "lucide-react";
import { usePersistentState, storageKey } from "@/lib/clientStore";
import type { CaseStatus } from "@/lib/legal/caseDomain";
import {
  DEMO_LABEL_BN, DEMO_LABEL_EN, DEMO_RULES_NOTE_BN, DEMO_RULES_NOTE_EN, emptyDemoState, markActionDone, moveStage, openCase, sanitizeDemoState,
  type DemoState, type DeskRole,
} from "@/lib/legal/demoData";
import { PersonaSwitcher } from "./PersonaSwitcher";
import { DlaoDesk } from "./DlaoDesk";
import { LawyerDesk } from "./LawyerDesk";
import { ChiefMonitor } from "./ChiefMonitor";
import { CitizenView } from "./CitizenView";
import { MediatorDesk } from "./MediatorDesk";
import { SimulationStory } from "./SimulationStory";
import type { Lang } from "./shared";

/*
 * Office demo: the legal aid officer, panel lawyer, chief, mediator and applicant views from the Digital Legal Aid
 * System (razibr246, AdribMahmud101), as a labelled demo with fictional people and no logins. State stays on this
 * device (legal namespace) and can be reset.
 */
export function DemoDesk() {
  const [lang, setLang] = useState<Lang>("bn");
  const bn = lang === "bn";
  const T = (b: string, e: string) => (bn ? b : e);
  const [state, setState] = usePersistentState<DemoState>(storageKey("legal", "demo"), emptyDemoState(), sanitizeDemoState);
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => { setNow(new Date()); }, []);

  const update = (fn: (s: DemoState, at: Date) => DemoState) => setState((s) => fn(s, new Date()));
  const setRole = (role: DeskRole) => setState((s) => ({ ...s, role }));
  const reset = () => { if (window.confirm(T("ডেমোর সব পরিবর্তন মুছে শুরুর অবস্থায় ফেরাবেন?", "Undo every demo change and start over?"))) setState(emptyDemoState()); };

  return (
    <div className="space-y-6" data-testid="legal-demo">
      <div role="note" data-testid="demo-banner" className="flex flex-wrap items-start gap-3 rounded-2xl border-2 border-dashed border-amber-400 bg-amber-50 p-4">
        <TriangleAlert size={22} className="mt-0.5 shrink-0 text-amber-700" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="text-[17px] font-bold leading-snug text-amber-950">{bn ? DEMO_LABEL_BN : DEMO_LABEL_EN}</p>
          <p className="mt-1 text-[14px] leading-relaxed text-amber-900">{bn ? DEMO_RULES_NOTE_BN : DEMO_RULES_NOTE_EN} {T("কোনো লগইন নেই, কিছুই কোথাও পাঠানো হয় না; পরিবর্তন শুধু এই ফোনে থাকে।", "There are no logins and nothing is sent anywhere; changes stay on this phone.")}</p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => setLang(bn ? "en" : "bn")} className="kp-chip !min-h-[44px] !rounded-full !leading-[1.4]" aria-label={bn ? "Switch to English" : "বাংলায় দেখুন"}>{bn ? "EN" : "বাং"}</button>
          <button type="button" onClick={reset} data-testid="demo-reset" className="kp-btn-ghost min-h-[44px] px-3 text-[14px]"><RotateCcw size={16} aria-hidden /> {T("রিসেট", "Reset")}</button>
        </div>
      </div>

      <section aria-labelledby="demo-h" className="space-y-3">
        <p className="kp-eyebrow">{T("অফিস ডেমো", "Office demo")}</p>
        <h1 id="demo-h" className="text-[clamp(30px,5vw,50px)] font-semibold leading-[1.08] text-slate-900">{T("এক আবেদন, ", "One application, ")}<em className="kp-em">{T("পাঁচ টেবিল", "five desks")}</em></h1>
        <p className="max-w-[62ch] text-[15.5px] leading-relaxed text-slate-700">{T("একটি আইনি সহায়তার আবেদন কর্মকর্তা, আইনজীবী, মধ্যস্থতাকারী আর তত্ত্বাবধায়কের হাত ঘুরে কীভাবে এগোয়, তা দেখুন। কার ডেস্ক দেখবেন বেছে নিন।", "See how a legal aid application moves through the officer, lawyer, mediator and supervisor. Pick whose desk to view.")}</p>
        <PersonaSwitcher role={state.role} onChange={setRole} lang={lang} />
      </section>

      {!now ? (
        <div className="lg-card text-[15px] text-slate-600" role="status">{T("ডেমো খোলা হচ্ছে…", "Opening the demo…")}</div>
      ) : (
        <div key={state.role} className="kp-rise space-y-6">
          {state.role === "dlao" && (
            <DlaoDesk state={state} lang={lang}
              onMove={(id: string, to: CaseStatus, reason?: string) => update((s, at) => moveStage(s, id, to, "dlao", at, reason))}
              onOpen={(id: string) => update((s, at) => openCase(s, id, "dlao", at))} />
          )}
          {state.role === "lawyer" && <LawyerDesk state={state} lang={lang} now={now} onDone={(id, code) => update((s, at) => markActionDone(s, id, code, at))} />}
          {state.role === "chief" && <ChiefMonitor state={state} lang={lang} now={now} />}
          {state.role === "citizen" && <CitizenView state={state} lang={lang} now={now} />}
          {state.role === "mediator" && <MediatorDesk state={state} lang={lang} onSettle={(id) => update((s, at) => moveStage(s, id, "settled", "mediator", at, "demo: agreement reached in mediation"))} />}
        </div>
      )}

      <SimulationStory step={state.simStep} onStep={(n) => setState((s) => ({ ...s, simStep: n }))} lang={lang} />
    </div>
  );
}
