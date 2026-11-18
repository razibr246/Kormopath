"use client";
import { useState } from "react";
import {
  Calculator,
  Compass,
  Building2,
  DollarSign,
  Hotel,
  Bus,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Download,
  Receipt,
} from "lucide-react";
import {
  UNIT_FORM_FEES,
  calculateAdmissionBudget,
  type UnitFeeInfo,
} from "@/lib/admissionFinops";
import { bnDigits } from "@/lib/contract";

export function AdmissionCostEstimator() {
  const [selectedUnits, setSelectedUnits] = useState<string[]>([
    "DU 'ক' ইউনিট (বিজ্ঞান)",
    "BUET প্রকৌশল ও স্থাপত্য",
    "Medical MBBS কেন্দ্রীয় ভর্তি",
    "GST সাধারণ ও বিজ্ঞান গুচ্ছ",
  ]);

  const [applicantHomeDistrict, setApplicantHomeDistrict] = useState("ঢাকা");
  const [lodgingType, setLodgingType] = useState<"mess" | "hotel" | "relatives">("relatives");
  const [numberOfExamsRequiringTravel, setNumberOfExamsRequiringTravel] = useState(2);
  const [mockTestBudget, setMockTestBudget] = useState(2000);
  const [booksBudget, setBooksBudget] = useState(2500);

  const toggleUnit = (label: string) => {
    setSelectedUnits((prev) =>
      prev.includes(label) ? prev.filter((u) => u !== label) : [...prev, label]
    );
  };

  const report = calculateAdmissionBudget({
    selectedUnits,
    applicantHomeDistrict,
    lodgingType,
    numberOfExamsRequiringTravel,
    mockTestBudgetBdt: mockTestBudget,
    booksAndQuestionBanksBdt: booksBudget,
  });

  return (
    <div className="space-y-6" data-testid="admission-cost-estimator">
      {/* Header Banner */}
      <div className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50/90 via-white to-teal-50/70 p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100/90 px-3 py-0.5 text-[12px] font-bold text-emerald-900">
              <Receipt size={14} className="text-emerald-700" />
              <span>এডমিশন ফিনঅপ্স ও বাজেট ক্যালকুলেটর</span>
            </div>
            <h3 className="text-[18px] sm:text-[20px] font-extrabold text-slate-900">
              ভর্তি পরীক্ষার বাস্তব খরচ প্ল্যানার (আবেদন ফি + যাতায়াত + থাকা-খাওয়া)
            </h3>
            <p className="text-[13.5px] leading-relaxed text-slate-600">
              মফস্বল ও ঢাকার শিক্ষার্থীদের জন্য বিশ্ববিদ্যালয়ে আবেদন ফি, আন্তঃজেলা যাতায়াত, মেস/হোটেল আবাসন ও প্রশ্নব্যাংক বাজেটের পূর্ণাঙ্গ হিসাব।
            </p>
          </div>
          <div className="rounded-2xl border border-emerald-200 bg-white p-4 text-center shrink-0 min-w-[160px] shadow-2xs">
            <span className="text-[11.5px] font-bold text-slate-500 block">সম্ভাব্য মোট খরচ</span>
            <div className="text-[24px] font-black text-emerald-800">
              ৳ {bnDigits(report.grandTotalBdt.toLocaleString("en-US"))}
            </div>
            <span className="text-[11px] text-slate-500">{selectedUnits.length}টি ইউনিট নির্বাচিত</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Form Controls */}
        <div className="lg:col-span-2 space-y-6">
          {/* Step 1: Unit Selection */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-[15px] font-bold text-slate-900 flex items-center gap-2">
                <Building2 size={18} className="text-emerald-700" />
                ১. কোন কোন ইউনিটে পরীক্ষা দেবেন? (আবেদন ফি নির্বাচন)
              </h4>
              <span className="text-[12px] font-bold text-slate-500">
                {selectedUnits.length}টি নির্বাচিত
              </span>
            </div>

            <p className="mb-2.5 rounded-xl border border-amber-300 bg-amber-50 p-3 text-[13.5px] leading-relaxed text-amber-950" data-testid="fee-unverified-note">
              এখানের আবেদন ফি আনুমানিক ধারণা, কোনো সরকারি উৎস থেকে যাচাই করা নয়। প্রতি বছর ফি বদলায় — আবেদনের আগে সংশ্লিষ্ট বিশ্ববিদ্যালয়ের ভর্তি সার্কুলারে আসল ফি মিলিয়ে নিন। যাতায়াত ও থাকার খরচও আনুমানিক।
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {UNIT_FORM_FEES.map((item) => {
                const label = `${item.universityShort} ${item.unitNameBn}`;
                const isChecked = selectedUnits.includes(label) || selectedUnits.some((u) => u.includes(item.unitNameBn));
                return (
                  <button
                    key={`${item.universityShort}-${item.unitNameBn}`}
                    type="button"
                    onClick={() => toggleUnit(label)}
                    className={`flex items-start justify-between p-3 rounded-xl border text-left transition-all ${
                      isChecked
                        ? "border-emerald-600 bg-emerald-50/70 text-emerald-950 shadow-2xs"
                        : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    <div className="space-y-0.5 pr-2">
                      <div className="flex items-center gap-1.5">
                        <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10.5px] font-bold text-slate-700">
                          {item.universityShort}
                        </span>
                        <span className="text-[13px] font-bold">{item.unitNameBn}</span>
                      </div>
                      <p className="text-[11.5px] text-slate-500">
                        কেন্দ্র: {item.centerLocations.join(", ")}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-[13px] font-black text-slate-900">
                        ৳ {bnDigits(item.estimatedFeeBdt)}
                      </span>
                      <span className="block text-[11px] font-semibold text-amber-800">আনুমানিক · যাচাই হয়নি</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Step 2: Location, Travel & Lodging Parameters */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs space-y-4">
            <h4 className="text-[15px] font-bold text-slate-900 flex items-center gap-2">
              <Bus size={18} className="text-emerald-700" />
              ২. যাতায়াত ও পরীক্ষার দিন আবাসনের ব্যবস্থা
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-[13px] font-bold text-slate-700 block mb-1">
                  আপনার নিজ জেলা (Home District)
                </label>
                <select
                  value={applicantHomeDistrict}
                  onChange={(e) => setApplicantHomeDistrict(e.target.value)}
                  className="w-full min-h-[40px] rounded-xl border border-slate-300 bg-white px-3 text-[14px]"
                >
                  <option value="ঢাকা">ঢাকা বিভাগ (Dhaka)</option>
                  <option value="চট্টগ্রাম">চট্টগ্রাম (Chattogram)</option>
                  <option value="রাজশাহী">রাজশাহী (Rajshahi)</option>
                  <option value="খুলনা">খুলনা (Khulna)</option>
                  <option value="সিলেট">সিলেট (Sylhet)</option>
                  <option value="বরিশাল">বরিশাল (Barishal)</option>
                  <option value="রংপুর">রংপুর (Rangpur)</option>
                  <option value="ময়মনসিংহ">ময়মনসিংহ (Mymensingh)</option>
                  <option value="অন্যান্য">অন্যান্য জেলা (Outside Dhaka)</option>
                </select>
                <p className="text-[11px] text-slate-500 mt-1">
                  ঢাকার বাইরের শিক্ষার্থীদের বুয়েট/জাবি/রাবি ক্যাম্পাসে যাতায়াত খরচ যুক্ত হয়।
                </p>
              </div>

              <div>
                <label className="text-[13px] font-bold text-slate-700 block mb-1">
                  ক্যাম্পাসে থাকার ব্যবস্থা (Lodging Type)
                </label>
                <select
                  value={lodgingType}
                  onChange={(e) => setLodgingType(e.target.value as any)}
                  className="w-full min-h-[40px] rounded-xl border border-slate-300 bg-white px-3 text-[14px]"
                >
                  <option value="relatives">পরিচিত / আত্মীয়-স্বজনের বাসা (৳ ০)</option>
                  <option value="mess">বিশ্ববিদ্যালয়ের হল / ছাত্র মেস (গেস্ট) (~৳ ৬০০/রাত)</option>
                  <option value="hotel">হোটেল বা গেস্টহাউস (~৳ ১,৮০০/রাত)</option>
                </select>
              </div>

              <div>
                <label className="text-[13px] font-bold text-slate-700 block mb-1">
                  ক্যাম্পাস ভ্রমণের সংখ্যা (Exams Requiring Travel)
                </label>
                <input
                  type="number"
                  min="0"
                  max="8"
                  value={numberOfExamsRequiringTravel}
                  onChange={(e) => setNumberOfExamsRequiringTravel(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full min-h-[40px] rounded-xl border border-slate-300 bg-white px-3 text-[14px]"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  যেসব পরীক্ষার কেন্দ্র আপনার নিজ শহরের বাইরে।
                </p>
              </div>

              <div>
                <label className="text-[13px] font-bold text-slate-700 block mb-1">
                  মডেল টেস্ট ও প্রশ্নব্যাংক বাজেট (BDT)
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    min="0"
                    step="500"
                    value={mockTestBudget + booksBudget}
                    onChange={(e) => {
                      const val = Math.max(0, parseInt(e.target.value) || 0);
                      setMockTestBudget(Math.round(val * 0.45));
                      setBooksBudget(Math.round(val * 0.55));
                    }}
                    className="w-full min-h-[40px] rounded-xl border border-slate-300 bg-white px-3 text-[14px]"
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  কোচিং/অনলাইন মডেল টেস্ট ও প্রশ্নব্যাংক ক্রয়ের আনুমানিক ব্যয়।
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Detailed Breakdown Report */}
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs space-y-4">
            <h4 className="text-[15px] font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
              <Calculator size={18} className="text-emerald-700" />
              খরচের বিস্তারিত ব্রেকডাউন (Itemized)
            </h4>

            <div className="space-y-3 text-[13.5px]">
              <div className="flex justify-between items-center text-slate-700">
                <span>১. আবেদন ফরম ফি ({selectedUnits.length}টি ইউনিট):</span>
                <strong className="text-slate-900 font-bold">
                  ৳ {bnDigits(report.totalFormFeesBdt.toLocaleString("en-US"))}
                </strong>
              </div>

              <div className="flex justify-between items-center text-slate-700">
                <span>২. আন্তঃজেলা যাতায়াত ({numberOfExamsRequiringTravel} ট্রিপ):</span>
                <strong className="text-slate-900 font-bold">
                  ৳ {bnDigits(report.totalTravelBdt.toLocaleString("en-US"))}
                </strong>
              </div>

              <div className="flex justify-between items-center text-slate-700">
                <span>৩. আবাসন খরচ ({lodgingType === "hotel" ? "হোটেল" : lodgingType === "mess" ? "মেস/হল" : "বাসা"}):</span>
                <strong className="text-slate-900 font-bold">
                  ৳ {bnDigits(report.totalLodgingBdt.toLocaleString("en-US"))}
                </strong>
              </div>

              <div className="flex justify-between items-center text-slate-700">
                <span>৪. খাওয়া ও লোকাল রিকশা/কন্টিনজেন্সি:</span>
                <strong className="text-slate-900 font-bold">
                  ৳ {bnDigits(report.totalFoodAndContingencyBdt.toLocaleString("en-US"))}
                </strong>
              </div>

              <div className="flex justify-between items-center text-slate-700">
                <span>৫. প্রশ্নব্যাংক ও প্র্যাকটিস উপকরণ:</span>
                <strong className="text-slate-900 font-bold">
                  ৳ {bnDigits(report.academicMaterialsBdt.toLocaleString("en-US"))}
                </strong>
              </div>

              <div className="border-t-2 border-dashed border-slate-200 pt-3 flex justify-between items-center text-[16px]">
                <strong className="text-emerald-950 font-black">সর্বমোট আনুমানিক বাজেট:</strong>
                <strong className="text-emerald-800 font-black text-[18px]">
                  ৳ {bnDigits(report.grandTotalBdt.toLocaleString("en-US"))}
                </strong>
              </div>
            </div>

            {/* Smart Advice */}
            <div className="rounded-xl bg-emerald-50/80 p-3.5 space-y-2 border border-emerald-100 text-[12.5px] text-emerald-950">
              <strong className="font-bold flex items-center gap-1.5 text-emerald-900">
                <CheckCircle2 size={14} className="text-emerald-700" />
                খরচ কমানোর টিপস ও নির্দেশনা:
              </strong>
              <ul className="list-disc pl-4 space-y-1 text-emerald-900/90">
                {report.tipsBn.map((tip, i) => (
                  <li key={i}>{tip}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
