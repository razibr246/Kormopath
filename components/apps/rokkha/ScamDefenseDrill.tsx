"use client";

import { useState } from "react";
import { ShieldAlert, CheckCircle2, AlertTriangle, XCircle, ArrowRight, Phone, Sparkles, HelpCircle, RotateCcw } from "lucide-react";
import { SCAM_SCENARIOS, evaluateScamDefense, type ScamScenario, type ScamEvaluation } from "@/lib/speech";

export function ScamDefenseDrill({ bn = true }: { bn?: boolean }) {
  const [selectedScenarioId, setSelectedScenarioId] = useState(SCAM_SCENARIOS[0].id);
  const [userResponse, setUserResponse] = useState("");
  const [evaluation, setEvaluation] = useState<ScamEvaluation | null>(null);

  const scenario = SCAM_SCENARIOS.find((s) => s.id === selectedScenarioId) ?? SCAM_SCENARIOS[0];

  const handleSelectScenario = (id: string) => {
    setSelectedScenarioId(id);
    setUserResponse("");
    setEvaluation(null);
  };

  const handleEvaluate = (textToEvaluate?: string) => {
    const text = textToEvaluate ?? userResponse;
    const res = evaluateScamDefense(scenario.id, text);
    setEvaluation(res);
  };

  const handleQuickDefense = (defenseText: string) => {
    setUserResponse(defenseText);
    handleEvaluate(defenseText);
  };

  const handleReset = () => {
    setUserResponse("");
    setEvaluation(null);
  };

  return (
    <section
      id="drill"
      aria-labelledby="drill-title"
      className="rounded-2xl border border-amber-300/80 bg-gradient-to-br from-amber-50/70 via-white to-orange-50/50 p-5 sm:p-7 shadow-xs hover:shadow-md transition-all"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-amber-100 pb-4">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-100/90 px-3 py-0.5 text-[12px] font-bold text-amber-900">
            <ShieldAlert size={14} className="text-amber-700" />
            <span>প্রতারণা প্রতিরোধ সিমুলেটর</span>
          </div>
          <h2 id="drill-title" className="mt-1 text-[20px] font-extrabold text-slate-900 sm:text-[24px]">
            প্রতারক চেনার ড্রিল (Scam Defense Practice)
          </h2>
          <p className="text-[13.5px] text-slate-600">
            বাস্তব জীবনের ৪টি ঝুঁকিপূর্ণ প্রতারণার ফাঁদে আপনি কেমন জবাব দেবেন তা আগেই পরীক্ষা করুন।
          </p>
        </div>
        <button
          type="button"
          onClick={handleReset}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[12px] font-semibold text-slate-700 hover:bg-slate-50"
        >
          <RotateCcw size={13} />
          <span>রিসেট</span>
        </button>
      </div>

      {/* Scenario Picker */}
      <div className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-4" role="tablist" aria-label="প্রতারণার ধরন">
        {SCAM_SCENARIOS.map((s) => (
          <button
            key={s.id}
            type="button"
            role="tab"
            aria-selected={s.id === selectedScenarioId}
            onClick={() => handleSelectScenario(s.id)}
            className={`rounded-xl border p-3 text-left transition-all ${
              s.id === selectedScenarioId
                ? "border-amber-600 bg-amber-600 text-white shadow-xs"
                : "border-slate-200 bg-white text-slate-800 hover:border-amber-300 hover:bg-amber-50/40"
            }`}
          >
            <span className="block text-[11px] font-bold uppercase tracking-wider opacity-80">
              {s.scammerPersonaBn}
            </span>
            <strong className="mt-0.5 block text-[13px] font-bold leading-snug">
              {s.titleBn}
            </strong>
          </button>
        ))}
      </div>

      {/* Active Scenario Card */}
      <div className="mt-5 rounded-2xl border border-rose-200 bg-rose-50/60 p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-rose-600 text-white font-bold shadow-xs">
            ⚠️
          </span>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-rose-800">
                প্রতারকের কথোপকথন / বার্তা:
              </span>
              <span className="rounded bg-rose-200/80 px-1.5 py-0.5 text-[10.5px] font-bold text-rose-950">
                {scenario.manipulationTactic === "urgency"
                  ? "ভয় ও তাড়াহুড়া"
                  : scenario.manipulationTactic === "greed"
                  ? "অবাস্তব লোভ"
                  : "ভুয়া কর্তৃত্ব"}
              </span>
            </div>
            <p className="mt-1.5 text-[14.5px] font-medium text-rose-950 leading-relaxed italic">
              &ldquo;{scenario.openingPitchBn}&rdquo;
            </p>
            <p className="mt-2 text-[12px] text-rose-800">
              💡 <strong>কৌশল শনাক্তকরণ:</strong> {scenario.tacticExplanationBn}
            </p>
          </div>
        </div>
      </div>

      {/* Response input and quick choices */}
      <div className="mt-5 space-y-3">
        <label htmlFor="scam-reply" className="block text-[13.5px] font-bold text-slate-800">
          আপনার তাৎক্ষণিক প্রতিক্রিয়া কী হবে? (নিচে লিখুন বা কুইক চয়েস সিলেক্ট করুন)
        </label>

        <div className="flex flex-wrap gap-2">
          <span className="text-[12px] font-semibold text-slate-500 self-center">কুইক টেস্ট:</span>
          <button
            type="button"
            onClick={() => handleQuickDefense("ওটিপি কোড দিচ্ছি, অ্যাকাউন্ট ঠিক করে দিন")}
            className="rounded-lg border border-red-200 bg-red-50/80 px-2.5 py-1 text-[11.5px] font-bold text-red-800 hover:bg-red-100 transition-colors"
          >
            ❌ ওটিপি দেওয়া (ভুল)
          </button>
          <button
            type="button"
            onClick={() => handleQuickDefense("ভাই আমি কাস্টমার কেয়ার ১৬২৪৭ এ ফোন দিয়ে নিজে কথা বলছি, কোনো পিন দেব না")}
            className="rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11.5px] font-bold text-emerald-800 hover:bg-emerald-100 transition-colors"
          >
            ✅ হেল্পলাইন ও দৃঢ় অস্বীকৃতি (সঠিক)
          </button>
          <button
            type="button"
            onClick={() => handleQuickDefense("আপনি কে? আমি কি টাকা ফেরত পাব?")}
            className="rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11.5px] font-bold text-amber-800 hover:bg-amber-100 transition-colors"
          >
            ⚠️ দ্বিধান্বিত জবাব (ঝুঁকিপূর্ণ)
          </button>
        </div>

        <div className="flex gap-2">
          <textarea
            id="scam-reply"
            rows={2}
            value={userResponse}
            onChange={(e) => setUserResponse(e.target.value)}
            placeholder="যেমন: কোনো পিন বা ওটিপি দেওয়া হবে না, প্রয়োজনে ১৬২৪৭ বা ৯৯৯-এ যোগাযোগ করব..."
            className="w-full rounded-xl border border-slate-300 bg-white p-3 text-[14px] outline-none focus:border-amber-600 focus:ring-1 focus:ring-amber-600"
          />
          <button
            type="button"
            onClick={() => handleEvaluate()}
            className="inline-flex shrink-0 items-center justify-center rounded-xl bg-amber-600 px-5 font-bold text-white hover:bg-amber-700 transition-colors shadow-2xs text-[14px]"
          >
            যাচাই করুন
          </button>
        </div>
      </div>

      {/* Evaluation Results */}
      {evaluation && (
        <div
          role="region"
          aria-live="polite"
          className={`mt-6 rounded-2xl border p-5 transition-all ${
            evaluation.verdict === "safe"
              ? "border-emerald-300 bg-emerald-50/80 text-emerald-950"
              : evaluation.verdict === "fatal"
              ? "border-red-300 bg-red-50/90 text-red-950"
              : "border-amber-300 bg-amber-50/90 text-amber-950"
          }`}
        >
          <div className="flex items-start justify-between gap-3 border-b pb-3 border-current/20">
            <div className="flex items-center gap-2">
              {evaluation.verdict === "safe" ? (
                <CheckCircle2 size={24} className="text-emerald-600 shrink-0" />
              ) : evaluation.verdict === "fatal" ? (
                <XCircle size={24} className="text-red-600 shrink-0" />
              ) : (
                <AlertTriangle size={24} className="text-amber-600 shrink-0" />
              )}
              <div>
                <strong className="text-[17px] font-extrabold block">
                  {evaluation.verdict === "safe"
                    ? "চমৎকার প্রতিরক্ষা! (Safe Defense)"
                    : evaluation.verdict === "fatal"
                    ? "মারাত্মক ভুল! প্রতারকের ফাঁদে পা দিয়েছেন (Fatal Failure)"
                    : "ঝুঁকিপূর্ণ প্রতিক্রিয়া (Risky Response)"}
                </strong>
                <span className="text-[12.5px] opacity-90">
                  স্কোর: <strong>{evaluation.score}/১০০</strong>
                </span>
              </div>
            </div>
            <span
              className={`rounded-full px-3 py-1 text-[12px] font-black uppercase ${
                evaluation.verdict === "safe"
                  ? "bg-emerald-600 text-white"
                  : evaluation.verdict === "fatal"
                  ? "bg-red-700 text-white"
                  : "bg-amber-600 text-white"
              }`}
            >
              {evaluation.verdict}
            </span>
          </div>

          <div className="mt-3.5 space-y-2 text-[13.5px] leading-relaxed">
            <p>
              <strong>বিশ্লেষণ:</strong> {evaluation.feedbackBn}
            </p>
            <div className="rounded-xl bg-white/80 p-3 border border-current/20 text-[13px]">
              <strong className="block text-[12px] uppercase tracking-wide opacity-80 mb-1">
                আদর্শ ও নিরাপদ প্রতিরক্ষা (Golden Defense):
              </strong>
              <p className="font-medium">{evaluation.safetyAdviceBn}</p>
            </div>
            <p className="text-[12.5px] pt-1">
              📞 <strong>অফিসিয়াল হেল্পলাইন:</strong> {evaluation.officialHelpline}
            </p>
          </div>
        </div>
      )}
    </section>
  );
}
