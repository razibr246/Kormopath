"use client";
import { useState, useEffect } from "react";
import {
  Globe2,
  Clock,
  CheckCircle2,
  Calendar,
  ExternalLink,
  BookOpen,
  FileCheck,
  Plus,
  Trash2,
  Sparkles,
  Award,
  DollarSign,
  Briefcase,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Mic,
  Play,
  RotateCcw,
  PenTool,
  MessageSquare,
} from "lucide-react";
import {
  STUDY_DESTINATIONS,
  STANDARDIZED_TESTS,
  PACE_TRACKS,
  DOCUMENT_ATTESTATION_CHECKLIST,
  SOLVENCY_PROFILES,
  calculateSolvencyRequirement,
  generateProfessorColdEmail,
  sanitizeForeignApplications,
  type StudyDestination,
  type PaceTrackId,
  type ForeignApplication,
  type ProfessorColdEmailInput,
} from "@/lib/foreignAdmission";
import {
  IELTS_CUE_CARDS,
  IELTS_SCORING_CRITERIA,
  evaluateEssayStructure,
  type IeltsCueCard,
  type EssayStructureCheck,
} from "@/lib/ieltsPrep";
import { usePersistentState, storageKey } from "@/lib/clientStore";
import { bnDigits } from "@/lib/contract";
import { Copy, Check } from "lucide-react";

export function ForeignAdmissionView() {
  const [activeTab, setActiveTab] = useState<"pace" | "destinations" | "tests" | "ielts" | "solvency" | "cold_email" | "checklist" | "tracker">("pace");
  const [selectedPace, setSelectedPace] = useState<PaceTrackId>("standard");
  const [expandedCountry, setExpandedCountry] = useState<string | null>("germany");

  // IELTS prep state
  const [selectedCueCardId, setSelectedCueCardId] = useState<string>(IELTS_CUE_CARDS[0].id);
  const [prepSecondsLeft, setPrepSecondsLeft] = useState<number>(60);
  const [isPrepRunning, setIsPrepRunning] = useState<boolean>(false);
  const [speakSecondsLeft, setSpeakSecondsLeft] = useState<number>(120);
  const [isSpeakRunning, setIsSpeakRunning] = useState<boolean>(false);
  const [prepNotes, setPrepNotes] = useState<string>("");
  const [essayInput, setEssayInput] = useState<string>("");
  const [essayResult, setEssayResult] = useState<EssayStructureCheck | null>(null);

  // Timer effects for IELTS
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isPrepRunning && prepSecondsLeft > 0) {
      interval = setInterval(() => {
        setPrepSecondsLeft((s) => s - 1);
      }, 1000);
    } else if (prepSecondsLeft === 0 && isPrepRunning) {
      setIsPrepRunning(false);
      // Auto transition suggestion
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isPrepRunning, prepSecondsLeft]);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isSpeakRunning && speakSecondsLeft > 0) {
      interval = setInterval(() => {
        setSpeakSecondsLeft((s) => s - 1);
      }, 1000);
    } else if (speakSecondsLeft === 0 && isSpeakRunning) {
      setIsSpeakRunning(false);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isSpeakRunning, speakSecondsLeft]);

  // Solvency calculator state
  const [solvencyCountry, setSolvencyCountry] = useState("germany");
  const [customTuition, setCustomTuition] = useState<number | undefined>(undefined);

  // Cold email state
  const [emailInput, setEmailInput] = useState<ProfessorColdEmailInput>({
    applicantName: "",
    professorName: "",
    universityName: "",
    department: "Computer Science & Engineering",
    paperOrResearchTopic: "",
    applicantBackground: "",
    intendedDegree: "MS",
    intendedTerm: "Fall 2027",
  });
  const [copiedEmail, setCopiedEmail] = useState(false);

  // Persistent user applications and checked documents
  const [applications, setApplications] = usePersistentState<ForeignApplication[]>(
    storageKey("admitbuddy", "foreign_apps"),
    [],
    sanitizeForeignApplications
  );

  const [checkedDocs, setCheckedDocs] = usePersistentState<string[]>(
    storageKey("admitbuddy", "checked_foreign_docs"),
    [],
    (raw) => (Array.isArray(raw) ? raw.filter((x): x is string => typeof x === "string") : [])
  );

  // New Application Form State
  const [showAddForm, setShowAddForm] = useState(false);
  const [newUni, setNewUni] = useState("");
  const [newCountry, setNewCountry] = useState("জার্মানি (Germany)");
  const [newMajor, setNewMajor] = useState("Computer Science");
  const [newDegree, setNewDegree] = useState<"Undergraduate" | "Masters" | "PhD">("Masters");
  const [newIntake, setNewIntake] = useState("Fall 2027");
  const [newDeadline, setNewDeadline] = useState("");
  const [newScholarship, setNewScholarship] = useState(true);

  const currentPaceTrack = PACE_TRACKS.find((p) => p.id === selectedPace) ?? PACE_TRACKS[1];

  const toggleDoc = (docId: string) => {
    setCheckedDocs((prev) =>
      prev.includes(docId) ? prev.filter((d) => d !== docId) : [...prev, docId]
    );
  };

  const handleAddApplication = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUni.trim()) return;

    const newApp: ForeignApplication = {
      id: `foreign-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      universityName: newUni.trim(),
      country: newCountry,
      major: newMajor.trim() || "General",
      degreeLevel: newDegree,
      intake: newIntake,
      deadline: newDeadline,
      applicationFeeBdt: 0,
      status: "shortlisted",
      scholarshipApplied: newScholarship,
      notes: "",
    };

    setApplications((prev) => [newApp, ...prev]);
    setNewUni("");
    setNewDeadline("");
    setShowAddForm(false);
  };

  const handleDeleteApp = (id: string) => {
    setApplications((prev) => prev.filter((a) => a.id !== id));
  };

  const handleUpdateStatus = (id: string, status: ForeignApplication["status"]) => {
    setApplications((prev) => prev.map((a) => (a.id === id ? { ...a, status } : a)));
  };

  return (
    <div className="space-y-6" data-testid="foreign-admission-view">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-2xl border border-indigo-200 bg-gradient-to-br from-indigo-50/90 via-white to-blue-50/70 p-4 sm:p-5 shadow-xs">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-indigo-100/90 px-3 py-0.5 text-[12px] font-bold text-indigo-900">
            <Globe2 size={14} className="text-indigo-700" />
            <span>বিদেশে উচ্চশিক্ষা ও স্কলারশিপ হাব</span>
          </div>
          <h3 className="text-[18px] sm:text-[20px] font-extrabold text-slate-900">
            নিজের সুবিধাজনক পেস অনুযায়ী বিশ্বমানের বিশ্ববিদ্যালয়ে ভর্তির প্রস্তুতি
          </h3>
          <p className="text-[13.5px] leading-relaxed text-slate-600">
            জার্মানি (ফ্রি টিউশন), ইউএসএ, কানাডা, ইউকে, জাপান ও মালয়েশিয়ায় উচ্চশিক্ষা। ৬ মাসের ফাস্ট-ট্র্যাক থেকে ২ বছরের লং-টার্ম রোডম্যাপ, আইইএলটিএস/স্যাট গাইড ও আবেদন ট্র্যাকার।
          </p>
        </div>
      </div>

      {/* Navigation Pills */}
      <div className="flex overflow-x-auto gap-2 border-b border-slate-200 pb-2 [scrollbar-width:none]">
        <button
          type="button"
          onClick={() => setActiveTab("pace")}
          className={`inline-flex min-h-[42px] shrink-0 items-center gap-2 rounded-xl px-4 text-[14px] font-bold transition-all ${
            activeTab === "pace"
              ? "bg-indigo-900 text-white shadow-2xs"
              : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
          } min-h-[44px] min-w-[44px]`}
        >
          <Clock size={16} />
          <span>১. সুবিধাজনক পেস রোডম্যাপ</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("destinations")}
          className={`inline-flex min-h-[42px] shrink-0 items-center gap-2 rounded-xl px-4 text-[14px] font-bold transition-all ${
            activeTab === "destinations"
              ? "bg-indigo-900 text-white shadow-2xs"
              : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
          } min-h-[44px] min-w-[44px]`}
        >
          <Globe2 size={16} />
          <span>২. দেশ ও বিশ্ববিদ্যালয় নির্দেশিকা</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("tests")}
          className={`inline-flex min-h-[42px] shrink-0 items-center gap-2 rounded-xl px-4 text-[14px] font-bold transition-all ${
            activeTab === "tests"
              ? "bg-indigo-900 text-white shadow-2xs"
              : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
          } min-h-[44px] min-w-[44px]`}
        >
          <Award size={16} />
          <span>৩. IELTS / SAT / GRE প্রস্তুতি</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("ielts")}
          className={`inline-flex min-h-[42px] shrink-0 items-center gap-2 rounded-xl px-4 text-[14px] font-bold transition-all ${
            activeTab === "ielts"
              ? "bg-indigo-900 text-white shadow-2xs"
              : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
          } min-h-[44px] min-w-[44px]`}
        >
          <Mic size={16} />
          <span>৪. IELTS স্পিকিং ও রাইটিং সিমুলেটর</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("solvency")}
          className={`inline-flex min-h-[42px] shrink-0 items-center gap-2 rounded-xl px-4 text-[14px] font-bold transition-all ${
            activeTab === "solvency"
              ? "bg-indigo-900 text-white shadow-2xs"
              : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
          } min-h-[44px] min-w-[44px]`}
        >
          <DollarSign size={16} />
          <span>৫. ব্লকড একাউন্ট ও সলভেন্সি</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("cold_email")}
          className={`inline-flex min-h-[42px] shrink-0 items-center gap-2 rounded-xl px-4 text-[14px] font-bold transition-all ${
            activeTab === "cold_email"
              ? "bg-indigo-900 text-white shadow-2xs"
              : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
          } min-h-[44px] min-w-[44px]`}
        >
          <Briefcase size={16} />
          <span>৬. প্রফেসর কোল্ড ইমেইল</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("checklist")}
          className={`inline-flex min-h-[42px] shrink-0 items-center gap-2 rounded-xl px-4 text-[14px] font-bold transition-all ${
            activeTab === "checklist"
              ? "bg-indigo-900 text-white shadow-2xs"
              : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
          } min-h-[44px] min-w-[44px]`}
        >
          <FileCheck size={16} />
          <span>৭. ডকুমেন্টস ও সত্যায়ন চেকলিস্ট</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("tracker")}
          className={`inline-flex min-h-[42px] shrink-0 items-center gap-2 rounded-xl px-4 text-[14px] font-bold transition-all ${
            activeTab === "tracker"
              ? "bg-indigo-900 text-white shadow-2xs"
              : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
          } min-h-[44px] min-w-[44px]`}
        >
          <Sparkles size={16} />
          <span>৮. আমার আবেদন ট্র্যাকার ({bnDigits(applications.length)})</span>
        </button>
      </div>

      {/* TAB 1: FLEXIBLE PACE ROADMAP */}
      {activeTab === "pace" && (
        <div className="space-y-5">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-3">
            <h4 className="text-[17px] font-bold text-slate-900">
              আপনার বর্তমান সময় ও লক্ষ্য অনুযায়ী রোডম্যাপের গতি (Pace) বেছে নিন:
            </h4>
            <div className="grid gap-3 sm:grid-cols-3">
              {PACE_TRACKS.map((track) => {
                const active = track.id === selectedPace;
                return (
                  <div
                    key={track.id}
                    onClick={() => setSelectedPace(track.id)}
                    className={`cursor-pointer rounded-2xl border p-4 space-y-2 transition-all ${
                      active
                        ? "border-indigo-600 bg-indigo-50/70 shadow-sm ring-2 ring-indigo-500/20"
                        : "border-slate-200 bg-slate-50/60 hover:bg-white"
                    }`}
                  >
                    <span className="rounded-md bg-indigo-100 px-2.5 py-0.5 text-[12px] font-extrabold text-indigo-900">
                      {bnDigits(track.durationMonths)} মাস
                    </span>
                    <h5 className="text-[16px] font-bold text-slate-900 leading-snug">{track.nameBn}</h5>
                    <p className="text-[12.5px] text-slate-600 leading-relaxed">{track.suitableForBn}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Timeline Milestones */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-[18px] font-extrabold text-slate-900">
                {currentPaceTrack.nameBn} — ধাপে ধাপে করণীয় তালিকা:
              </h4>
              <span className="text-[13px] text-slate-500 font-medium">
                লক্ষ্য: ১০০% কার্যকর আবেদন প্রস্তুতকরণ
              </span>
            </div>

            <div className="space-y-3">
              {currentPaceTrack.milestones.map((m, idx) => (
                <div
                  key={idx}
                  className="rounded-2xl border border-slate-200 bg-white p-5 space-y-3 shadow-2xs"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                    <div className="flex items-center gap-2">
                      <span className="grid h-7 w-7 place-items-center rounded-full bg-indigo-900 text-white text-[13px] font-mono font-bold">
                        {bnDigits(idx + 1)}
                      </span>
                      <strong className="text-[16px] text-slate-900">{m.phaseBn}</strong>
                    </div>
                    <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[12px] font-semibold text-slate-600">
                      {m.titleBn}
                    </span>
                  </div>

                  <ul className="space-y-2">
                    {m.tasksBn.map((task, tIdx) => (
                      <li key={tIdx} className="flex items-start gap-2.5 text-[14px] text-slate-700">
                        <CheckCircle2 size={16} className="shrink-0 text-indigo-700 mt-0.5" />
                        <span>{task}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: COUNTRY & DESTINATIONS */}
      {activeTab === "destinations" && (
        <div className="space-y-4">
          <div className="space-y-1">
            <h4 className="text-[18px] font-bold text-slate-900">
              বাংলাদেশি শিক্ষার্থীদের শীর্ষ পছন্দের উচ্চশিক্ষা গন্তব্য:
            </h4>
            <p className="text-[13.5px] text-slate-600">
              টিউশন ফি, ব্লকড অ্যাকাউন্ট/ব্যাংক সলভেন্সি, স্কলারশিপ ও খণ্ডকালীন কাজের সরকারি নিয়মের সত্যনিষ্ঠ তথ্য।
            </p>
          </div>

          <div className="space-y-3">
            {STUDY_DESTINATIONS.map((dest) => {
              const isExpanded = expandedCountry === dest.id;
              return (
                <div
                  key={dest.id}
                  className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-2xs transition-all hover:border-indigo-300"
                >
                  <div
                    onClick={() => setExpandedCountry(isExpanded ? null : dest.id)}
                    className="cursor-pointer flex flex-wrap items-center justify-between gap-3 p-4 sm:p-5 hover:bg-slate-50/80"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-[28px]">{dest.flag}</span>
                      <div>
                        <h5 className="text-[17px] font-extrabold text-slate-900 leading-snug">
                          {dest.countryBn}
                        </h5>
                        <span className="text-[13px] text-emerald-800 font-medium">
                          {dest.tuitionTypeBn}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-[13px] text-slate-500 font-mono hidden sm:inline">
                        ইনটেক: {dest.keyIntakes[0]}
                      </span>
                      {isExpanded ? <ChevronUp size={20} className="text-slate-500" /> : <ChevronDown size={20} className="text-slate-500" />}
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="border-t border-slate-100 bg-slate-50/50 p-5 space-y-4 text-[13.5px]">
                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        <div className="rounded-xl bg-white p-3 border border-slate-200">
                          <span className="text-[12px] text-slate-500 block">টিউশন ফি (বাৎসরিক)</span>
                          <strong className="text-slate-900 font-mono text-[14.5px]">{dest.avgTuitionBdtPerYear}</strong>
                        </div>

                        <div className="rounded-xl bg-white p-3 border border-slate-200">
                          <span className="text-[12px] text-slate-500 block">থাকা-খাওয়া খরচ (মাসিক)</span>
                          <strong className="text-slate-900 font-mono text-[14.5px]">{dest.livingCostBdtPerMonth}</strong>
                        </div>

                        <div className="rounded-xl bg-white p-3 border border-slate-200">
                          <span className="text-[12px] text-slate-500 block">ব্যাংক সলভেন্সি / ব্লকড অ্যাকাউন্ট</span>
                          <strong className="text-indigo-950 font-medium text-[13px]">{dest.blockedAccountOrSolvency}</strong>
                        </div>

                        <div className="rounded-xl bg-white p-3 border border-slate-200">
                          <span className="text-[12px] text-slate-500 block">কাজের অনুমতি (Part-time Work)</span>
                          <strong className="text-slate-800 text-[13px]">{dest.workRightsBn}</strong>
                        </div>

                        <div className="rounded-xl bg-white p-3 border border-slate-200">
                          <span className="text-[12px] text-slate-500 block">ভাষাগত যোগ্যতা</span>
                          <strong className="text-slate-800 text-[13px]">{dest.languageRequirements}</strong>
                        </div>

                        <div className="rounded-xl bg-white p-3 border border-slate-200">
                          <span className="text-[12px] text-slate-500 block">প্রধান স্কলারশিপসমূহ</span>
                          <strong className="text-emerald-800 text-[13px]">{dest.scholarshipOpportunitiesBn}</strong>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <span className="text-[13px] font-bold text-slate-800">শীর্ষস্থানীয় বিশ্ববিদ্যালয়সমূহ:</span>
                        <div className="flex flex-wrap gap-1.5">
                          {dest.popularUniversities.map((uni, uIdx) => (
                            <span key={uIdx} className="rounded-lg bg-white px-2.5 py-1 text-[12px] border border-slate-200 text-slate-700 font-medium">
                              {uni}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-slate-200/80">
                        <span className="text-[12.5px] text-slate-600">
                          পড়াশোনা শেষে সুযোগ: <strong>{dest.prOrWorkVisaProspects}</strong>
                        </span>
                        <a
                          href={dest.officialPortalUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[13px] font-bold text-indigo-700 hover:underline min-h-[44px] min-w-[44px]"
                        >
                          <span>অফিসিয়াল পোর্টাল</span>
                          <ExternalLink size={13} />
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 3: STANDARDIZED TESTS (IELTS, SAT, GRE) */}
      {activeTab === "tests" && (
        <div className="space-y-4">
          <div className="space-y-1">
            <h4 className="text-[18px] font-bold text-slate-900">
              আন্তর্জাতিক প্রমিত পরীক্ষা ও প্রস্তুতি গাইড:
            </h4>
            <p className="text-[13.5px] text-slate-600">
              কাঙ্ক্ষিত স্কোর, আনুমানিক ফি এবং বাংলাদেশি শিক্ষার্থীদের জন্য সর্বোচ্চ স্কোর অর্জনের কার্যপ্রণালী।
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {STANDARDIZED_TESTS.map((test, idx) => (
              <div key={idx} className="rounded-2xl border border-slate-200 bg-white p-5 space-y-3 shadow-2xs">
                <div className="border-b border-slate-100 pb-2">
                  <h5 className="text-[16.5px] font-extrabold text-slate-900">{test.testName}</h5>
                  <p className="text-[12.5px] text-slate-500">{test.purposeBn}</p>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[13px]">
                  <div className="rounded-xl bg-slate-50 p-2.5">
                    <span className="text-[12px] text-slate-500 block">ন্যূনতম স্কোর</span>
                    <strong className="text-slate-800 font-mono">{test.typicalMinScore}</strong>
                  </div>
                  <div className="rounded-xl bg-emerald-50 p-2.5">
                    <span className="text-[12px] text-emerald-800 block">স্কলারশিপ টার্গেট</span>
                    <strong className="text-emerald-950 font-mono font-bold">{test.competitiveScore}</strong>
                  </div>
                </div>

                <div className="text-[13px] text-slate-600">
                  আনুমানিক ফি: <strong className="text-slate-800 font-mono">{test.costEstimateBdt}</strong>
                </div>

                <div className="rounded-xl bg-indigo-50/70 p-3 text-[12.5px] text-indigo-950 leading-relaxed border border-indigo-100">
                  🎯 <strong>প্রস্তুতি পরামর্শ:</strong> {test.preparationAdviceBn}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: IELTS SPEAKING & WRITING SIMULATOR */}
      {activeTab === "ielts" && (() => {
        const activeCueCard = IELTS_CUE_CARDS.find((c) => c.id === selectedCueCardId) ?? IELTS_CUE_CARDS[0];

        const handleStartPrep = () => {
          setIsPrepRunning(true);
          setIsSpeakRunning(false);
          setPrepSecondsLeft(60);
        };

        const handleStartSpeak = () => {
          setIsPrepRunning(false);
          setIsSpeakRunning(true);
          setSpeakSecondsLeft(120);
        };

        const handleResetTimers = () => {
          setIsPrepRunning(false);
          setIsSpeakRunning(false);
          setPrepSecondsLeft(60);
          setSpeakSecondsLeft(120);
        };

        const handleEvaluateEssay = () => {
          const evalResult = evaluateEssayStructure(essayInput);
          setEssayResult(evalResult);
        };

        return (
          <div className="space-y-6" data-testid="ielts-prep-tab">
            <div className="space-y-1">
              <h4 className="text-[18px] font-bold text-slate-900">
                IELTS স্পিকিং ও রাইটিং প্র্যাকটিস ল্যাব
              </h4>
              <p className="text-[13.5px] text-slate-600">
                রিয়েল স্পিকিং পার্ট-২ কিউ-কার্ড, ১ মিনিট প্রস্তুতি ও ২ মিনিট কথা বলার লাইভ টাইমার, এবং টাস্ক-২ প্রবন্ধ মূল্যায়নকারী।
              </p>
            </div>

            {/* Speaking Part 2 Simulator */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-5 shadow-2xs">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                <div>
                  <span className="text-[12px] font-bold text-indigo-700 uppercase tracking-wider block">
                    Speaking Part 2 • Cue Card
                  </span>
                  <h5 className="text-[16px] font-extrabold text-slate-900">
                    কিউ-কার্ড টপিক নির্বাচন করুন:
                  </h5>
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <select
                    value={selectedCueCardId}
                    onChange={(e) => {
                      setSelectedCueCardId(e.target.value);
                      handleResetTimers();
                    }}
                    className="w-full sm:w-[260px] rounded-xl border border-slate-300 bg-white px-3 py-2 text-[13.5px] font-semibold text-slate-800 min-h-[44px]"
                  >
                    {IELTS_CUE_CARDS.map((card) => (
                      <option key={card.id} value={card.id}>
                        {card.topic}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* The Cue Card Box */}
              <div className="rounded-2xl border-2 border-indigo-200 bg-indigo-50/40 p-5 space-y-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1">
                    <span className="inline-block rounded-md bg-indigo-200/80 px-2 py-0.5 text-[12px] font-bold text-indigo-950 capitalize">
                      Category: {activeCueCard.category}
                    </span>
                    <h6 className="text-[17px] font-black text-slate-900">
                      {activeCueCard.promptEn}
                    </h6>
                  </div>
                </div>

                <div className="rounded-xl bg-white p-4 border border-indigo-100 space-y-2">
                  <span className="text-[12.5px] font-extrabold text-slate-800 block">
                    You should say:
                  </span>
                  <ul className="list-disc pl-5 space-y-1.5 text-[13.5px] text-slate-700">
                    {activeCueCard.bulletPointsEn.map((pt, i) => (
                      <li key={i}>{pt}</li>
                    ))}
                  </ul>
                </div>

                <div className="text-[12.5px] text-slate-600 bg-white/70 p-3 rounded-xl border border-indigo-100/70">
                  💡 <strong>বাংলা অর্থ:</strong> {activeCueCard.banglaTranslation}
                </div>

                {/* Vocabulary Tips */}
                <div className="space-y-1.5">
                  <span className="text-[12px] font-bold text-indigo-900 block">
                    উচ্চ ব্যান্ডের শব্দভাণ্ডার (Vocabulary Booster):
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {activeCueCard.vocabularyTipsEn.map((vocab, i) => (
                      <span
                        key={i}
                        className="rounded-lg bg-indigo-100 px-2.5 py-1 text-[12px] font-semibold text-indigo-950 font-mono"
                      >
                        {vocab}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Dual Timers & Note Taking Section */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2">
                {/* Left: 1-Min Prep & 2-Min Speak Timers */}
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <strong className="text-[14px] font-bold text-slate-800 flex items-center gap-1.5">
                      <Clock size={16} className="text-indigo-700" />
                      লাইভ এক্সাম টাইমার
                    </strong>
                    <button
                      type="button"
                      onClick={handleResetTimers}
                      className="text-[12px] font-bold text-slate-500 hover:text-slate-800 flex items-center gap-1 min-h-[44px] min-w-[44px]"
                    >
                      <RotateCcw size={13} /> রিসেট
                    </button>
                  </div>

                  {/* 1 Min Prep Timer */}
                  <div className="rounded-xl bg-white p-3.5 border border-slate-200 flex items-center justify-between">
                    <div>
                      <span className="text-[12px] font-bold text-slate-500 block">১ মিনিট প্রস্তুতি (Prep Time)</span>
                      <div className="text-[22px] font-black text-indigo-950 font-mono">
                        {Math.floor(prepSecondsLeft / 60)}:{(prepSecondsLeft % 60).toString().padStart(2, "0")}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleStartPrep}
                      disabled={isPrepRunning}
                      className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-[13px] font-bold text-white transition-all ${
                        isPrepRunning ? "bg-amber-600 animate-pulse" : "bg-indigo-900 hover:bg-indigo-950"
                      } min-h-[44px] min-w-[44px]`}
                    >
                      <Play size={14} /> {isPrepRunning ? "প্রস্তুতি চলছে..." : "১ মি. শুরু করুন"}
                    </button>
                  </div>

                  {/* 2 Min Speaking Timer */}
                  <div className="rounded-xl bg-white p-3.5 border border-slate-200 flex items-center justify-between">
                    <div>
                      <span className="text-[12px] font-bold text-slate-500 block">২ মিনিট স্পিকিং (Speaking Time)</span>
                      <div className="text-[22px] font-black text-emerald-800 font-mono">
                        {Math.floor(speakSecondsLeft / 60)}:{(speakSecondsLeft % 60).toString().padStart(2, "0")}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleStartSpeak}
                      disabled={isSpeakRunning}
                      className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-[13px] font-bold text-white transition-all ${
                        isSpeakRunning ? "bg-emerald-600 animate-pulse" : "bg-emerald-800 hover:bg-emerald-900"
                      } min-h-[44px] min-w-[44px]`}
                    >
                      <Mic size={14} /> {isSpeakRunning ? "স্পিকিং চলছে..." : "২ মি. স্পিকিং শুরু"}
                    </button>
                  </div>

                  {isSpeakRunning && (
                    <div className="rounded-lg bg-emerald-100 p-2.5 text-center text-[12px] font-bold text-emerald-900 animate-pulse">
                      🎙️ স্পষ্টভাবে কথা বলতে থাকুন! ২ মিনিট পূর্ণ না হওয়া পর্যন্ত থামবেন না।
                    </div>
                  )}
                </div>

                {/* Right: Prep Notes Notepad */}
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-2 flex flex-col">
                  <div className="flex items-center justify-between">
                    <strong className="text-[14px] font-bold text-slate-800 flex items-center gap-1.5">
                      <PenTool size={16} className="text-indigo-700" />
                      প্রস্তুতির নোটপ্যাড (১ মিনিটে পয়েন্ট লিখুন)
                    </strong>
                    <span className="text-[12px] text-slate-500">পেন্সিল-নোটের অনুরূপ</span>
                  </div>
                  <textarea
                    rows={5}
                    value={prepNotes}
                    onChange={(e) => setPrepNotes(e.target.value)}
                    placeholder="১ মিনিটে যা যা বলবেন তার দ্রুত বুলেট পয়েন্ট লিখে ফেলুন (e.g. Cox's Bazar, 2024, friends, parasailing, relaxed)..."
                    className="w-full flex-1 rounded-xl border border-slate-300 bg-white p-3 text-[13px] text-slate-800 outline-none focus:border-indigo-600 min-h-[44px]"
                  />
                </div>
              </div>

              {/* Part 3 Follow-up Questions */}
              <div className="rounded-xl bg-slate-50 p-4 border border-slate-200 space-y-2">
                <span className="text-[13px] font-extrabold text-slate-900 flex items-center gap-1.5">
                  <MessageSquare size={16} className="text-indigo-700" />
                  Speaking Part 3 • ফলো-আপ আলোচনার সম্ভাব্য প্রশ্নসমূহ:
                </span>
                <ul className="list-disc pl-5 space-y-1 text-[13px] text-slate-700">
                  {activeCueCard.sampleFollowUpsPart3.map((q, i) => (
                    <li key={i}>{q}</li>
                  ))}
                </ul>
              </div>
            </div>

            {/* IELTS 4-Pillar Scoring Criteria */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4 shadow-2xs">
              <h5 className="text-[16px] font-bold text-slate-900">
                IELTS স্পিকিং ও রাইটিং ৪টি স্কোরিং মাপকাঠি (Band 7.0+ পাওয়ার কৌশল):
              </h5>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {IELTS_SCORING_CRITERIA.map((criterion) => (
                  <div
                    key={criterion.code}
                    className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="rounded bg-indigo-100 px-2 py-0.5 text-[12px] font-black text-indigo-900 font-mono">
                        {criterion.code} ({criterion.weightPercentage}%)
                      </span>
                      <strong className="text-[13px] text-slate-900">{criterion.nameEn}</strong>
                    </div>
                    <div className="text-[12.5px] font-bold text-slate-700">{criterion.nameBn}</div>
                    <p className="text-[12px] text-slate-600 leading-relaxed">{criterion.keyAdviceBn}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Writing Task 2 Structure & Band Evaluator */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4 shadow-2xs">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <span className="text-[12px] font-bold text-indigo-700 uppercase tracking-wider block">
                    Writing Task 2 • Academic & General
                  </span>
                  <h5 className="text-[16px] font-extrabold text-slate-900">
                    প্রবন্ধের গঠন ও শব্দসংখ্যা পরীক্ষক (Essay Structure Evaluator)
                  </h5>
                </div>
              </div>

              <div className="space-y-2">
                <textarea
                  rows={8}
                  value={essayInput}
                  onChange={(e) => setEssayInput(e.target.value)}
                  placeholder="আপনার টাস্ক-২ প্রবন্ধটি এখানে পেস্ট করুন বা লিখুন (কমপক্ষে ২৫০ শব্দ)..."
                  className="w-full rounded-xl border border-slate-300 p-3 text-[13.5px] text-slate-800 outline-none focus:border-indigo-600 min-h-[44px]"
                />
                <div className="flex items-center justify-between">
                  <span className="text-[12px] text-slate-500">
                    শব্দসংখ্যা: {essayInput.trim() ? essayInput.trim().split(/\s+/).length : 0} | অনুচ্ছেদ: {essayInput.trim() ? essayInput.trim().split(/\n\s*\n/).filter(Boolean).length : 0}
                  </span>
                  <button
                    type="button"
                    onClick={handleEvaluateEssay}
                    className="rounded-xl bg-indigo-900 px-5 py-2 text-[13.5px] font-bold text-white hover:bg-indigo-950 min-h-[44px] min-w-[44px]"
                  >
                    গঠন ও সম্ভাব্য ব্যান্ড যাচাই করুন
                  </button>
                </div>
              </div>

              {essayResult && (
                <div className="rounded-xl border border-indigo-200 bg-indigo-50/60 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[13px] font-bold text-slate-700">সম্ভাব্য ব্যান্ড রেঞ্জ:</span>
                    <span className="text-[18px] font-black text-indigo-900">
                      {essayResult.scoreBandEstimate}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[12.5px] text-slate-700 border-t border-indigo-100 pt-2">
                    <div>মোট শব্দ: <strong>{essayResult.totalWords}</strong></div>
                    <div>অনুচ্ছেদ সংখ্যা: <strong>{essayResult.paragraphCount}</strong></div>
                    <div>উপসংহার স্পষ্ট: <strong>{essayResult.hasConclusion ? "হ্যাঁ (Yes)" : "না (No)"}</strong></div>
                    <div>ভূমিকা উপস্থিতি: <strong>{essayResult.hasIntroduction ? "হ্যাঁ (Yes)" : "না (No)"}</strong></div>
                  </div>
                  <div className="space-y-1 pt-1">
                    <span className="text-[12px] font-bold text-indigo-950 block">পরামর্শ ও পর্যবেক্ষণ:</span>
                    <ul className="list-disc pl-5 space-y-0.5 text-[12.5px] text-slate-700">
                      {essayResult.feedbacksBn.map((fb, idx) => (
                        <li key={idx}>{fb}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* TAB 5: SOLVENCY & BLOCKED ACCOUNT CALCULATOR */}
      {activeTab === "solvency" && (() => {
        const breakdown = calculateSolvencyRequirement(solvencyCountry, customTuition);
        return (
          <div className="space-y-5">
            <div className="space-y-1">
              <h4 className="text-[18px] font-bold text-slate-900">
                ব্লকড একাউন্ট ও ব্যাংক সলভেন্সি ক্যালকুলেটর:
              </h4>
              <p className="text-[13.5px] text-slate-600">
                জার্মানি, ইউএসএ, ইউকে, কানাডা ও অস্ট্রেলিয়ায় ভিসা আবেদনের জন্য প্রয়োজনীয় জীবনযাত্রার খরচ ও সলভেন্সির সঠিক হিসাব।
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="text-[12.5px] font-bold text-slate-700 block mb-1">
                    টার্গেট দেশ নির্বাচন করুন
                  </label>
                  <select
                    value={solvencyCountry}
                    onChange={(e) => {
                      setSolvencyCountry(e.target.value);
                      setCustomTuition(undefined);
                    }}
                    className="w-full rounded-xl border border-slate-300 bg-white p-2.5 text-[14px] font-semibold text-slate-900 outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 min-h-[44px]"
                  >
                    {Object.values(SOLVENCY_PROFILES).map((p) => (
                      <option key={p.countryId} value={p.countryId}>
                        {p.countryNameBn}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[12.5px] font-bold text-slate-700 block mb-1">
                    আনুমানিক প্রথম বছরের টিউশন ডিপোজিট ({breakdown.country.currencyCode})
                  </label>
                  <input
                    type="number"
                    min={0}
                    placeholder={String(breakdown.country.tuitionDepositOriginal)}
                    value={customTuition !== undefined ? customTuition : ""}
                    onChange={(e) => setCustomTuition(e.target.value ? Number(e.target.value) : 0)}
                    className="w-full rounded-xl border border-slate-300 p-2.5 text-[14px] text-slate-900 outline-none focus:border-indigo-600 min-h-[44px]"
                  />
                  <span className="text-[12px] text-slate-500 mt-0.5 block">
                    {breakdown.country.countryId === "germany" ? "জার্মানিতে পাবলিক বিশ্ববিদ্যালয়ে টিউশন ফ্রি (০)" : "স্কলারশিপ পেলে টিউশন ফি কম হতে পারে"}
                  </span>
                </div>
              </div>

              {/* Breakdown Cards */}
              <div className="grid gap-3 sm:grid-cols-3 pt-2">
                <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-4 text-center">
                  <span className="text-[12px] text-slate-600 block">জীবনযাত্রা খরচ / ব্লকড একাউন্ট</span>
                  <strong className="text-[20px] font-bold text-blue-900 block font-mono">
                    {breakdown.country.currencySymbol}{breakdown.livingOriginal.toLocaleString()}
                  </strong>
                  <span className="text-[12px] font-mono text-slate-600">
                    ~৳{breakdown.livingBdt.toLocaleString("en-IN")} টাকা
                  </span>
                </div>

                <div className="rounded-xl border border-purple-200 bg-purple-50/50 p-4 text-center">
                  <span className="text-[12px] text-slate-600 block">টিউশন ডিপোজিট / ব্যাংক ফান্ড</span>
                  <strong className="text-[20px] font-bold text-purple-900 block font-mono">
                    {breakdown.country.currencySymbol}{(customTuition !== undefined ? customTuition : breakdown.country.tuitionDepositOriginal).toLocaleString()}
                  </strong>
                  <span className="text-[12px] font-mono text-slate-600">
                    ~৳{breakdown.tuitionBdt.toLocaleString("en-IN")} টাকা
                  </span>
                </div>

                <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4 text-center">
                  <span className="text-[12px] text-slate-600 block">বিমান টিকিট, ভিসা ও ইমার্জেন্সি</span>
                  <strong className="text-[20px] font-bold text-amber-900 block font-mono">
                    ৳{breakdown.airfareBdt.toLocaleString("en-IN")}
                  </strong>
                  <span className="text-[12px] text-slate-600 block">এককালীন তহবিল</span>
                </div>
              </div>

              {/* Total Summary */}
              <div className="rounded-2xl border-2 border-indigo-300 bg-gradient-to-r from-indigo-50 to-blue-50 p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <span className="text-[12px] font-extrabold uppercase tracking-wider text-indigo-800 block">
                    মোট প্রাক্কলিত আর্থিক প্রস্তুতি (Grand Total)
                  </span>
                  <strong className="text-[24px] sm:text-[28px] font-extrabold text-slate-900 font-mono">
                    ৳{breakdown.grandTotalBdt.toLocaleString("en-IN")} টাকা
                  </strong>
                </div>
                <div className="text-[12px] text-slate-600 max-w-sm leading-relaxed">
                  {breakdown.country.notesBn}
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* TAB 5: PROFESSOR COLD EMAIL GENERATOR */}
      {activeTab === "cold_email" && (() => {
        const generated = generateProfessorColdEmail(emailInput);
        return (
          <div className="space-y-5">
            <div className="space-y-1">
              <h4 className="text-[18px] font-bold text-slate-900">
                প্রফেসর কোল্ড ইমেইল সহায়ক (RA/TA Assistantship Outreach):
              </h4>
              <p className="text-[13.5px] text-slate-600">
                আমেরিকা, কানাডা, জার্মানি ও অস্ট্রেলিয়ায় মাস্টার্স বা পিএইচডি ফান্ডিংয়ের জন্য প্রফেসরদের কাছে পাঠানোর উপযোগী একাডেমিক কোল্ড ইমেইল ড্রাফট।
              </p>
            </div>

            <div className="grid gap-5 lg:grid-cols-2">
              {/* Input Form */}
              <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-3.5 shadow-xs">
                <h5 className="text-[15px] font-bold text-slate-900 border-b border-slate-100 pb-2">
                  আপনার ও প্রফেসরের তথ্য দিন:
                </h5>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="text-[12px] font-bold text-slate-700 block mb-1">আপনার নাম</label>
                    <input
                      type="text"
                      placeholder="e.g. Tanvir Hasan"
                      value={emailInput.applicantName}
                      onChange={(e) => setEmailInput({ ...emailInput, applicantName: e.target.value })}
                      className="w-full rounded-xl border border-slate-300 p-2 text-[13px] outline-none focus:border-indigo-600 min-h-[44px]"
                    />
                  </div>

                  <div>
                    <label className="text-[12px] font-bold text-slate-700 block mb-1">প্রফেসরের নাম</label>
                    <input
                      type="text"
                      placeholder="e.g. Andrew Ng"
                      value={emailInput.professorName}
                      onChange={(e) => setEmailInput({ ...emailInput, professorName: e.target.value })}
                      className="w-full rounded-xl border border-slate-300 p-2 text-[13px] outline-none focus:border-indigo-600 min-h-[44px]"
                    />
                  </div>

                  <div>
                    <label className="text-[12px] font-bold text-slate-700 block mb-1">বিশ্ববিদ্যালয়ের নাম</label>
                    <input
                      type="text"
                      placeholder="e.g. Stanford University"
                      value={emailInput.universityName}
                      onChange={(e) => setEmailInput({ ...emailInput, universityName: e.target.value })}
                      className="w-full rounded-xl border border-slate-300 p-2 text-[13px] outline-none focus:border-indigo-600 min-h-[44px]"
                    />
                  </div>

                  <div>
                    <label className="text-[12px] font-bold text-slate-700 block mb-1">বিভাগ (Department)</label>
                    <input
                      type="text"
                      value={emailInput.department}
                      onChange={(e) => setEmailInput({ ...emailInput, department: e.target.value })}
                      className="w-full rounded-xl border border-slate-300 p-2 text-[13px] outline-none focus:border-indigo-600 min-h-[44px]"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="text-[12px] font-bold text-slate-700 block mb-1">
                      প্রফেসরের সাম্প্রতিক পেপারের নাম বা রিসার্চ টপিক
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Deep learning models for medical image segmentation"
                      value={emailInput.paperOrResearchTopic}
                      onChange={(e) => setEmailInput({ ...emailInput, paperOrResearchTopic: e.target.value })}
                      className="w-full rounded-xl border border-slate-300 p-2 text-[13px] outline-none focus:border-indigo-600 min-h-[44px]"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="text-[12px] font-bold text-slate-700 block mb-1">
                      আপনার প্রাসঙ্গিক থিসিস / প্রজেক্ট / ব্যাকগ্রাউন্ড
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. my undergraduate thesis on CNNs and hands-on PyTorch projects"
                      value={emailInput.applicantBackground}
                      onChange={(e) => setEmailInput({ ...emailInput, applicantBackground: e.target.value })}
                      className="w-full rounded-xl border border-slate-300 p-2 text-[13px] outline-none focus:border-indigo-600 min-h-[44px]"
                    />
                  </div>

                  <div>
                    <label className="text-[12px] font-bold text-slate-700 block mb-1">ডিগ্রি স্তর</label>
                    <select
                      value={emailInput.intendedDegree}
                      onChange={(e) => setEmailInput({ ...emailInput, intendedDegree: e.target.value as "MS" | "PhD" })}
                      className="w-full rounded-xl border border-slate-300 bg-white p-2 text-[13px] outline-none focus:border-indigo-600 min-h-[44px]"
                    >
                      <option value="MS">MS / Master of Science</option>
                      <option value="PhD">PhD / Doctorate</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[12px] font-bold text-slate-700 block mb-1">টার্গেট ইনটেক</label>
                    <input
                      type="text"
                      placeholder="e.g. Fall 2027"
                      value={emailInput.intendedTerm}
                      onChange={(e) => setEmailInput({ ...emailInput, intendedTerm: e.target.value })}
                      className="w-full rounded-xl border border-slate-300 p-2 text-[13px] outline-none focus:border-indigo-600 min-h-[44px]"
                    />
                  </div>
                </div>

                <div className="rounded-xl bg-amber-50 p-3 text-[12px] text-amber-950 leading-relaxed border border-amber-200">
                  💡 <strong>প্রফেসর ইমেইল টিপস:</strong> প্রফেসরের স্থানীয় সময় সকাল ৮টা থেকে ৯টার মধ্যে ইমেইল পাঠান (বাংলাদেশ সময় বিকেলে বা রাতে)। ইমেইল ২০০-২৫০ শব্দের মধ্যে সীমাবদ্ধ রাখুন এবং অবশ্যই ১ পাতার প্রফেশনাল একাডেমিক সিভি (PDF) সংযুক্ত করুন।
                </div>
              </div>

              {/* Generated Output */}
              <div className="rounded-2xl border border-indigo-200 bg-white p-5 space-y-3 shadow-xs flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <span className="text-[13px] font-bold text-indigo-900">তৈরি হওয়া কোল্ড ইমেইল ড্রাফট</span>
                    <button
                      type="button"
                      onClick={() => {
                        const full = `Subject: ${generated.subject}\n\n${generated.body}`;
                        navigator.clipboard?.writeText(full);
                        setCopiedEmail(true);
                        setTimeout(() => setCopiedEmail(false), 2000);
                      }}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-300 bg-indigo-50 px-3 py-1.5 text-[12px] font-bold text-indigo-800 hover:bg-indigo-100 transition-colors min-h-[44px] min-w-[44px]"
                    >
                      {copiedEmail ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                      <span>{copiedEmail ? "কপি হয়েছে!" : "সম্পূর্ণ ইমেইল কপি"}</span>
                    </button>
                  </div>

                  <div className="rounded-xl bg-slate-50 p-2.5 border border-slate-200 text-[13px]">
                    <span className="text-slate-500 font-bold block text-[12px]">Subject:</span>
                    <span className="font-semibold text-slate-800 font-mono">{generated.subject}</span>
                  </div>

                  <div className="max-h-[380px] overflow-y-auto rounded-xl border border-slate-200 p-3.5 text-[13px] leading-relaxed font-mono whitespace-pre-line text-slate-800 bg-slate-50/50">
                    {generated.body}
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* TAB 6: DOCUMENT ATTESTATION CHECKLIST */}
      {activeTab === "checklist" && (
        <div className="space-y-4">
          <div className="space-y-1">
            <h4 className="text-[18px] font-bold text-slate-900">
              ডকুমেন্টস সত্যায়ন ও আবেদনের চেকলিস্ট:
            </h4>
            <p className="text-[13.5px] text-slate-600">
              শিক্ষা বোর্ড, পররাষ্ট্র মন্ত্রণালয় (MOFA) এবং ব্যাংক থেকে যা যা প্রস্তুত রাখতে হবে। আপনার সম্পন্ন করা ধাপে টিক দিন।
            </p>
          </div>

          <div className="space-y-2.5">
            {DOCUMENT_ATTESTATION_CHECKLIST.map((doc) => {
              const isDone = checkedDocs.includes(doc.id);
              return (
                <div
                  key={doc.id}
                  onClick={() => toggleDoc(doc.id)}
                  className={`cursor-pointer flex items-start gap-3 rounded-2xl border p-4 transition-all ${
                    isDone
                      ? "border-emerald-300 bg-emerald-50/50"
                      : "border-slate-200 bg-white hover:bg-slate-50"
                  }`}
                >
                  <div
                    className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded border ${
                      isDone
                        ? "border-emerald-700 bg-emerald-700 text-white"
                        : "border-slate-300 bg-white"
                    }`}
                  >
                    {isDone && <CheckCircle2 size={15} />}
                  </div>
                  <div className="space-y-0.5">
                    <strong
                      className={`text-[15px] block ${
                        isDone ? "text-emerald-950 line-through decoration-emerald-500" : "text-slate-900"
                      }`}
                    >
                      {doc.titleBn}
                    </strong>
                    <p className="text-[13px] text-slate-600 leading-relaxed">{doc.descriptionBn}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 5: APPLICATION TRACKER */}
      {activeTab === "tracker" && (
        <div className="space-y-5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h4 className="text-[18px] font-bold text-slate-900">
                বিদেশের বিশ্ববিদ্যালয় আবেদন ট্র্যাকার:
              </h4>
              <p className="text-[13.5px] text-slate-600">
                যে সকল বিশ্ববিদ্যালয়ে আবেদন করতে চান তা তালিকাভুক্ত করুন ও স্ট্যাটাস ট্র্যাক করুন।
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowAddForm(!showAddForm)}
              className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl bg-indigo-900 px-4 text-[13.5px] font-bold text-white hover:bg-indigo-950 min-h-[44px] min-w-[44px]"
            >
              <Plus size={16} />
              <span>নতুন বিশ্ববিদ্যালয় যোগ করুন</span>
            </button>
          </div>

          {/* Add Form */}
          {showAddForm && (
            <form onSubmit={handleAddApplication} className="rounded-2xl border border-indigo-200 bg-indigo-50/40 p-5 space-y-4">
              <h5 className="text-[16px] font-bold text-indigo-950">আবেদনের তথ্য যোগ করুন</h5>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <label className="block text-[12.5px] font-bold text-slate-700">বিশ্ববিদ্যালয়ের নাম *</label>
                  <input
                    type="text"
                    required
                    value={newUni}
                    onChange={(e) => setNewUni(e.target.value)}
                    placeholder="যেমন: Technical University of Munich"
                    className="mt-1 w-full min-h-[38px] rounded-xl border border-slate-300 bg-white px-3 text-[14px] min-h-[44px]"
                  />
                </div>

                <div>
                  <label className="block text-[12.5px] font-bold text-slate-700">দেশ</label>
                  <select
                    value={newCountry}
                    onChange={(e) => setNewCountry(e.target.value)}
                    className="mt-1 w-full min-h-[38px] rounded-xl border border-slate-300 bg-white px-3 text-[14px] min-h-[44px]"
                  >
                    <option value="জার্মানি (Germany)">জার্মানি (Germany)</option>
                    <option value="যুক্তরাষ্ট্র (USA)">যুক্তরাষ্ট্র (USA)</option>
                    <option value="কানাডা (Canada)">কানাডা (Canada)</option>
                    <option value="যুক্তরাজ্য (UK)">যুক্তরাজ্য (UK)</option>
                    <option value="জাপান (Japan)">জাপান (Japan)</option>
                    <option value="মালয়েশিয়া (Malaysia)">মালয়েশিয়া (Malaysia)</option>
                    <option value="অন্যান্য (Other)">অন্যান্য (Other)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[12.5px] font-bold text-slate-700">ডিগ্রি ও সাবজেক্ট</label>
                  <input
                    type="text"
                    value={newMajor}
                    onChange={(e) => setNewMajor(e.target.value)}
                    placeholder="যেমন: M.Sc. in Data Science"
                    className="mt-1 w-full min-h-[38px] rounded-xl border border-slate-300 bg-white px-3 text-[14px] min-h-[44px]"
                  />
                </div>

                <div>
                  <label className="block text-[12.5px] font-bold text-slate-700">টার্গেট ইনটেক</label>
                  <input
                    type="text"
                    value={newIntake}
                    onChange={(e) => setNewIntake(e.target.value)}
                    placeholder="যেমন: Winter 2026 বা Fall 2027"
                    className="mt-1 w-full min-h-[38px] rounded-xl border border-slate-300 bg-white px-3 text-[14px] min-h-[44px]"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="rounded-xl border border-slate-300 px-4 py-2 text-[13.5px] font-bold text-slate-600 hover:bg-slate-100 min-h-[44px] min-w-[44px]"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-indigo-900 px-5 py-2 text-[13.5px] font-bold text-white hover:bg-indigo-950 min-h-[44px] min-w-[44px]"
                >
                  সংরক্ষণ করুন
                </button>
              </div>
            </form>
          )}

          {/* List of Applications */}
          {applications.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-slate-500 space-y-2">
              <p>এখনো কোনো বিদেশি বিশ্ববিদ্যালয় যোগ করা হয়নি।</p>
              <button
                type="button"
                onClick={() => setShowAddForm(true)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-900 px-4 py-2 text-[13px] font-bold text-white hover:bg-indigo-950 min-h-[44px] min-w-[44px]"
              >
                <Plus size={15} /> প্রথম বিশ্ববিদ্যালয় যোগ করুন
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {applications.map((app) => (
                <div
                  key={app.id}
                  className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <strong className="text-[16px] text-slate-900">{app.universityName}</strong>
                      <span className="rounded-md bg-indigo-50 px-2 py-0.5 text-[12px] font-bold text-indigo-900">
                        {app.country}
                      </span>
                    </div>
                    <p className="text-[13.5px] text-slate-600">
                      {app.major} ({app.degreeLevel}) · ইনটেক: <strong>{app.intake}</strong>
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <select
                      value={app.status}
                      onChange={(e) => handleUpdateStatus(app.id, e.target.value as ForeignApplication["status"])}
                      className="min-h-[38px] rounded-xl border border-slate-300 bg-white px-3 text-[13px] font-semibold text-slate-800 min-h-[44px]"
                    >
                      <option value="shortlisted">তালিকায় রাখা (Shortlisted)</option>
                      <option value="preparing_docs">কাগজপত্র প্রস্তুত (Docs)</option>
                      <option value="applied">আবেদন সম্পন্ন (Applied)</option>
                      <option value="interview">ইন্টারভিউ (Interview)</option>
                      <option value="admitted">অফার লেটার প্রাপ্ত (Admitted)</option>
                      <option value="visa">ভিসা প্রক্রিয়া (Visa)</option>
                    </select>

                    <button
                      type="button"
                      onClick={() => handleDeleteApp(app.id)}
                      className="text-slate-500 hover:text-red-700 p-1.5 min-h-[44px] min-w-[44px]"
                      aria-label="Delete application"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
