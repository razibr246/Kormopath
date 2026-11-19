"use client";
import { useState } from "react";
import {
  ShieldAlert,
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles,
  HelpCircle,
  FileCheck,
  AlertTriangle,
  Layers,
  Calculator as CalcIcon,
} from "lucide-react";
import {
  CALCULATOR_POLICIES,
  EXAM_DAY_PACKING,
  THREE_PASS_HALL_STRATEGY,
  type CalculatorPolicy,
} from "@/lib/admissionFinops";
import { bnDigits } from "@/lib/contract";

export function ExamDayStrategyView() {
  const [selectedCalcUni, setSelectedCalcUni] = useState(CALCULATOR_POLICIES[0].university);
  const [checkedPacking, setCheckedPacking] = useState<string[]>(["p-admit", "p-pen", "p-file"]);

  // Negative marking simulation state
  const [eliminatedOptions, setEliminatedOptions] = useState<number>(2); // 0 = blind, 1, 2 = 50-50

  const togglePacking = (id: string) => {
    setCheckedPacking((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  };

  const activePolicy = CALCULATOR_POLICIES.find((p) => p.university === selectedCalcUni) ?? CALCULATOR_POLICIES[0];

  // Mathematical expectation calculation for negative marking (-0.25)
  // Total choices = 4. Remaining choices after elimination = (4 - eliminatedOptions)
  const remainingChoices = Math.max(1, 4 - eliminatedOptions);
  const probCorrect = 1 / remainingChoices;
  const probWrong = (remainingChoices - 1) / remainingChoices;
  const expectedValue = (probCorrect * 1.0) - (probWrong * 0.25);

  return (
    <div className="space-y-6" data-testid="exam-day-strategy-view">
      {/* Banner */}
      <div className="rounded-2xl border border-indigo-200 bg-gradient-to-br from-indigo-50/90 via-white to-blue-50/70 p-5 shadow-xs">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-indigo-100/90 px-3 py-0.5 text-[12px] font-bold text-indigo-900">
            <ShieldAlert size={14} className="text-indigo-700" />
            <span>ভর্তি পরীক্ষার হল কৌশল ও নিয়মাবলি</span>
          </div>
          <h3 className="text-[18px] sm:text-[20px] font-extrabold text-slate-900">
            নেগেটিভ মার্কিং নিয়ন্ত্রণ, অনুমোদিত ক্যালকুলেটর ও ৩-ধাপের হল স্ট্র্যাটেজি
          </h3>
          <p className="text-[13.5px] leading-relaxed text-slate-600">
            প্রতিটি ভুলের মাশুল -০.২৫ নম্বর। কীভাবে ৬০ মিনিটে সর্বোচ্চ নির্ভুলতার সাথে ওএমআর শিট পূরণ করবেন এবং পরীক্ষার হলে অনাকাঙ্ক্ষিত ভুল এড়াবেন।
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Section 1: 3-Pass Hall Time Strategy */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs space-y-4">
          <h4 className="text-[16px] font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
            <Clock size={18} className="text-indigo-700" />
            ৬০ মিনিটের ৩-ধাপের হল স্ট্র্যাটেজি (Three-Pass Strategy)
          </h4>

          <div className="space-y-3.5">
            {THREE_PASS_HALL_STRATEGY.map((strat, index) => (
              <div
                key={index}
                className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 space-y-2 hover:bg-indigo-50/30 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-[14.5px] text-indigo-950">
                    {strat.phaseBn}
                  </span>
                  <span className="rounded-full bg-indigo-100 px-2.5 py-0.5 text-[12px] font-bold text-indigo-800">
                    {strat.minuteRange}
                  </span>
                </div>
                <p className="text-[13px] text-slate-700 leading-relaxed">
                  <strong>করণীয়:</strong> {strat.actionBn}
                </p>
                <p className="text-[12px] text-slate-500 italic bg-white/80 p-2 rounded-lg border border-slate-100">
                  ⚠️ <strong>সতর্কতা:</strong> {strat.ruleBn}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Section 2: Mathematical Negative Marking Expectancy */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs space-y-4">
          <h4 className="text-[16px] font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
            <Layers size={18} className="text-indigo-700" />
            নেগেটিভ মার্কিং ম্যাথমেটিক্যাল এনালাইসিস (-০.২৫)
          </h4>

          <div className="space-y-3">
            <p className="text-[13px] text-slate-600 leading-relaxed">
              অনুমান করে দাগানো কি লাভজনক? নিচের স্লাইডার দিয়ে দেখুন কয়টি অপশন বাদ দিলে দাগানো মেধা তালিকায় ইতিবাচক প্রভাব ফেলে:
            </p>

            <div className="rounded-xl bg-slate-50 p-4 border border-slate-200 space-y-3">
              <div className="flex justify-between items-center text-[13.5px] font-bold text-slate-800">
                <span>নিশ্চিত ভুল অপশন বাদ দিতে পেরেছেন:</span>
                <span className="text-indigo-700">{eliminatedOptions} টি অপশন</span>
              </div>

              <div className="flex gap-2">
                {[0, 1, 2].map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setEliminatedOptions(opt)}
                    className={`flex-1 py-2 px-3 rounded-lg text-[13px] font-bold transition-all ${
                      eliminatedOptions === opt
                        ? "bg-indigo-900 text-white shadow-2xs"
                        : "bg-white border border-slate-300 text-slate-700 hover:bg-slate-100"
                    } min-h-[44px] min-w-[44px]`}
                  >
                    {opt === 0 ? "০টি (অন্ধ অনুমান)" : opt === 1 ? "১টি বাদ" : "২টি বাদ (৫০/৫০)"}
                  </button>
                ))}
              </div>

              <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
                <div>
                  <span className="text-[12px] font-bold text-slate-500 block">গাণিতিক প্রত্যাশিত মান (Expected Value)</span>
                  <div
                    className={`text-[20px] font-black ${
                      expectedValue > 0 ? "text-emerald-700" : expectedValue === 0 ? "text-slate-600" : "text-red-700"
                    }`}
                  >
                    {expectedValue > 0 ? `+${expectedValue.toFixed(3)}` : expectedValue.toFixed(3)} নম্বর
                  </div>
                </div>

                <div className="text-right">
                  <span
                    className={`inline-block px-2.5 py-1 rounded-md text-[12px] font-bold ${
                      expectedValue > 0
                        ? "bg-emerald-100 text-emerald-900"
                        : "bg-amber-100 text-amber-900"
                    }`}
                  >
                    {expectedValue > 0 ? "✓ দাগানো যৌক্তিক" : "✕ ভুলেও দাগাবেন না"}
                  </span>
                </div>
              </div>

              <p className="text-[12px] text-slate-600 leading-normal">
                {eliminatedOptions === 0 && "অন্ধভাবে ৪টির মধ্যে একটি অনুমান করলে গড়ে কোনো নম্বর লাভ হয় না (০.০০), উল্টো ভুল দাগিয়ে কনফিডেন্স নষ্ট হয়।"}
                {eliminatedOptions === 1 && "১টি অপশন বাদ দিলে প্রত্যাশিত মান সামান্য ইতিবাচক (+০.১৬৭), তবে ঝুঁকি থাকে।"}
                {eliminatedOptions === 2 && "২টি ভুল নিশ্চিত বাদ দিয়ে ৫০/৫০ পরিস্থিতিতে এলে প্রতিটি প্রশ্নে প্রত্যাশিত মান +০.৩৭৫ নম্বর! এমন ক্ষেত্রে দাগানো পরিসংখ্যানগতভাবে লাভজনক।"}
              </p>
            </div>
          </div>
        </div>

        {/* Section 3: Calculator Policy Matrix */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h4 className="text-[16px] font-bold text-slate-900 flex items-center gap-2">
              <CalcIcon size={18} className="text-indigo-700" />
              বিশ্ববিদ্যালয়ভিত্তিক ক্যালকুলেটর পলিসি
            </h4>
          </div>

          <div className="space-y-3">
            <label className="text-[13px] font-bold text-slate-700 block">বিশ্ববিদ্যালয় নির্বাচন করুন:</label>
            <select
              value={selectedCalcUni}
              onChange={(e) => setSelectedCalcUni(e.target.value)}
              className="w-full min-h-[42px] rounded-xl border border-slate-300 bg-white px-3 text-[14px] font-semibold text-slate-800 min-h-[44px]"
            >
              {CALCULATOR_POLICIES.map((p) => (
                <option key={p.university} value={p.university}>
                  {p.university} ({p.isAllowed ? "অনুমোদিত" : "নিষিদ্ধ"})
                </option>
              ))}
            </select>

            <div
              className={`rounded-xl p-4 border space-y-3 ${
                activePolicy.isAllowed
                  ? "bg-emerald-50/70 border-emerald-200 text-emerald-950"
                  : "bg-rose-50/70 border-rose-200 text-rose-950"
              }`}
            >
              <div className="flex items-center gap-2">
                {activePolicy.isAllowed ? (
                  <CheckCircle2 size={18} className="text-emerald-700 shrink-0" />
                ) : (
                  <XCircle size={18} className="text-rose-700 shrink-0" />
                )}
                <span className="font-extrabold text-[14.5px]">
                  {activePolicy.isAllowed ? "ক্যালকুলেটর ব্যবহার অনুমোদিত" : "ক্যালকুলেটর সম্পূর্ণ নিষিদ্ধ"}
                </span>
              </div>

              <p className="text-[13px] leading-relaxed">{activePolicy.rulesBn}</p>

              {activePolicy.approvedModels.length > 0 && (
                <div className="space-y-1 pt-1">
                  <span className="text-[12px] font-bold uppercase tracking-wider text-emerald-900 block">
                    অনুমোদিত মডেলসমূহ:
                  </span>
                  <ul className="list-disc pl-4 text-[12.5px] space-y-0.5">
                    {activePolicy.approvedModels.map((m, i) => (
                      <li key={i}>{m}</li>
                    ))}
                  </ul>
                </div>
              )}

              {activePolicy.bannedModels.length > 0 && (
                <div className="space-y-1 pt-1">
                  <span className="text-[12px] font-bold uppercase tracking-wider text-rose-900 block">
                    নিষিদ্ধ মডেল বা ডিভাইস:
                  </span>
                  <ul className="list-disc pl-4 text-[12.5px] space-y-0.5">
                    {activePolicy.bannedModels.map((m, i) => (
                      <li key={i}>{m}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Section 4: Exam Day Packing Checklist */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h4 className="text-[16px] font-bold text-slate-900 flex items-center gap-2">
              <FileCheck size={18} className="text-indigo-700" />
              পরীক্ষার দিন সকালের প্যাকিং চেকলিস্ট
            </h4>
            <span className="text-[12px] font-bold text-slate-500">
              {checkedPacking.length}/{EXAM_DAY_PACKING.length}টি রেডি
            </span>
          </div>

          <div className="space-y-2">
            {EXAM_DAY_PACKING.map((item) => {
              const isChecked = checkedPacking.includes(item.id);
              return (
                <div
                  key={item.id}
                  onClick={() => togglePacking(item.id)}
                  className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                    isChecked
                      ? "border-emerald-500 bg-emerald-50/50"
                      : "border-slate-200 bg-white hover:bg-slate-50"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => {}}
                    className="mt-1 h-4 w-4 rounded border-slate-300 text-indigo-700 focus:ring-indigo-700"
                  />
                  <div className="space-y-0.5 text-left flex-1">
                    <div className="flex items-center gap-2">
                      <span className={`text-[13.5px] font-bold ${isChecked ? "text-emerald-950" : "text-slate-900"}`}>
                        {item.itemBn}
                      </span>
                      {item.mandatory && (
                        <span className="rounded bg-rose-100 px-1.5 py-0.2 text-[12px] font-black text-rose-800">
                          আবশ্যক
                        </span>
                      )}
                    </div>
                    <p className="text-[12px] text-slate-500">{item.noteBn}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
