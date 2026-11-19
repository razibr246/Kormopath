"use client";
import { useState, useEffect, useMemo, useRef } from "react";
import {
  GraduationCap,
  Timer,
  CheckCircle2,
  XCircle,
  HelpCircle,
  AlertTriangle,
  Play,
  RotateCcw,
  Sparkles,
  Award,
  BookOpen,
  ArrowRight,
  ArrowLeft,
  Flame,
  Layers,
  ChevronRight,
  History,
  Check,
} from "lucide-react";
import {
  type ExamTrackId,
  type ExamTrackInfo,
  type PracticeQuestion,
  type ExamAttempt,
  EXAM_TRACKS,
  PRACTICE_QUESTIONS,
  QUICK_FLASHCARDS,
  OMR_BUBBLE_LETTERS,
  getAvailableSubjects,
  filterQuestionsBySubject,
  calculateExamScore,
  sanitizeExamAttempts,
} from "@/lib/examPractice";
import { usePersistentState, storageKey, readStored } from "@/lib/clientStore";
import { bnDigits } from "@/lib/contract";
import { UpgradeModal } from "@/components/pricing/UpgradeModal";
import { isFeatureGated, sanitizeSession, getStoredSession, type UserSession } from "@/lib/session";

export function ExamPracticeView() {
  const [selectedTrack, setSelectedTrack] = useState<ExamTrackId>("medical");
  const [mode, setMode] = useState<"exam" | "review" | "flashcards" | "history">("exam");

  // Exam in-progress state
  const [examActive, setExamActive] = useState(false);
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Record<string, number>>({});
  const [secondsRemaining, setSecondsRemaining] = useState(0);
  const [latestAttempt, setLatestAttempt] = useState<ExamAttempt | null>(null);
  const [examViewType, setExamViewType] = useState<"card" | "omr">("card");
  const [subjectFilter, setSubjectFilter] = useState("all");

  // Flashcards state
  const [flashcardIndex, setFlashcardIndex] = useState(0);
  const [cardFlipped, setCardFlipped] = useState(false);
  const [flashcardSubject, setFlashcardSubject] = useState("all");

  // Persistent attempts history
  const [history, setHistory] = usePersistentState<ExamAttempt[]>(
    storageKey("admitbuddy", "exam_attempts"),
    [],
    sanitizeExamAttempts
  );

  const [session, setSession] = useState<UserSession | null>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  useEffect(() => {
    setSession(getStoredSession());
    const onSession = () => setSession(getStoredSession());
    window.addEventListener("kormopath:session-change", onSession);
    window.addEventListener("storage", onSession);
    return () => {
      window.removeEventListener("kormopath:session-change", onSession);
      window.removeEventListener("storage", onSession);
    };
  }, []);

  const trackInfo = useMemo(
    () => EXAM_TRACKS.find((t) => t.id === selectedTrack) ?? EXAM_TRACKS[0],
    [selectedTrack]
  );

  const trackQuestions = useMemo(() => {
    const list = PRACTICE_QUESTIONS.filter((q) => q.trackId === selectedTrack);
    if (subjectFilter !== "all") {
      const filtered = list.filter((q) => q.subject.toLowerCase().includes(subjectFilter.toLowerCase()));
      if (filtered.length) return filtered;
    }
    return list;
  }, [selectedTrack, subjectFilter]);

  const availableSubjects = useMemo(() => {
    const subs = new Set<string>();
    PRACTICE_QUESTIONS.filter((q) => q.trackId === selectedTrack).forEach((q) => subs.add(q.subject));
    return Array.from(subs);
  }, [selectedTrack]);

  const filteredFlashcards = useMemo(() => {
    if (flashcardSubject === "all") return QUICK_FLASHCARDS;
    return QUICK_FLASHCARDS.filter((f) => f.subject.toLowerCase().includes(flashcardSubject.toLowerCase()));
  }, [flashcardSubject]);


  // Countdown timer
  useEffect(() => {
    if (!examActive || secondsRemaining <= 0) return;
    const interval = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          handleFinishExam();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [examActive, secondsRemaining]);

  const handleStartExamDirect = () => {
    setUserAnswers({});
    setCurrentQIndex(0);
    setLatestAttempt(null);
    setSecondsRemaining(trackInfo.durationMinutes * 60);
    setExamActive(true);
    setMode("exam");
  };

  const handleStartExam = () => {
    if (isFeatureGated(session, "admitbuddy", "practice_exams")) {
      setShowUpgradeModal(true);
      return;
    }
    handleStartExamDirect();
  };

  const handleSelectOption = (questionId: string, optionIndex: number) => {
    if (!examActive) return;
    setUserAnswers((prev) => ({
      ...prev,
      [questionId]: optionIndex,
    }));
  };

  const handleFinishExam = () => {
    setExamActive(false);
    const timeTaken = trackInfo.durationMinutes * 60 - secondsRemaining;
    const attempt = calculateExamScore(trackQuestions, userAnswers, trackInfo, timeTaken);
    setLatestAttempt(attempt);
    setHistory((prev) => [attempt, ...prev]);
    setMode("review");
  };

  const formatTimer = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  const currentQ = trackQuestions[currentQIndex] || trackQuestions[0];
  const activeFlashcard = QUICK_FLASHCARDS[flashcardIndex] || QUICK_FLASHCARDS[0];

  return (
    <div className="space-y-6" data-testid="exam-practice-view">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50/80 via-white to-indigo-50/60 p-4 sm:p-5 shadow-xs">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-blue-100/90 px-3 py-0.5 text-[12px] font-bold text-blue-900">
            <Sparkles size={14} className="text-blue-700" />
            <span>ভর্তি ও কলেজ পরীক্ষা প্রস্তুতি প্ল্যাটফর্ম</span>
          </div>
          <h3 className="text-[18px] sm:text-[20px] font-extrabold text-slate-900">
            মডেল টেস্ট, প্রশ্নব্যাংক ও নেগেটিভ মার্কিং অনুশীলন
          </h3>
          <p className="text-[13.5px] leading-relaxed text-slate-600">
            মেডিকেল, বুয়েট/ইঞ্জিনিয়ারিং, ঢাবি ক/খ/গ এবং গুচ্ছ ভর্তি পরীক্ষার বাস্তবসম্মত প্রশ্নব্যাংক। সঠিক উত্তরে +১.০ এবং প্রতিটি ভুল উত্তরে ০.২৫ নেগেটিভ মার্কিং।
          </p>
        </div>
        {!examActive && (
          <button
            type="button"
            onClick={handleStartExam}
            className="shrink-0 inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-blue-700 px-5 py-2.5 text-[14.5px] font-bold text-white shadow-sm hover:bg-blue-800 active:scale-98 transition-all min-w-[44px]"
          >
            <Play size={17} fill="currentColor" />
            <span>মডেল টেস্ট দিন</span>
          </button>
        )}
      </div>

      {/* Mode Navigation */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-2">
        <button
          type="button"
          onClick={() => {
            if (examActive && !window.confirm("পরীক্ষা বাতিল করতে চান? আপনার অগ্রগতি সংরক্ষিত হবে না।")) return;
            setExamActive(false);
            setMode("exam");
          }}
          className={`rounded-xl px-4 py-2 text-[14px] font-bold transition-all ${
            mode === "exam" && !examActive
              ? "bg-slate-900 text-white shadow-2xs"
              : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
          } min-h-[44px] min-w-[44px]`}
        >
          পরীক্ষা নির্বাচন
        </button>

        {examActive && (
          <span className="rounded-xl bg-red-600 px-4 py-2 text-[14px] font-extrabold text-white animate-pulse">
            পরীক্ষা চলছে ({formatTimer(secondsRemaining)})
          </span>
        )}

        {latestAttempt && (
          <button
            type="button"
            onClick={() => setMode("review")}
            className={`rounded-xl px-4 py-2 text-[14px] font-bold transition-all ${
              mode === "review"
                ? "bg-blue-700 text-white shadow-2xs"
                : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            } min-h-[44px] min-w-[44px]`}
          >
            ফলাফল ও ব্যাখ্যা
          </button>
        )}

        <button
          type="button"
          onClick={() => {
            if (examActive && !window.confirm("পরীক্ষা বাতিল করতে চান?")) return;
            setExamActive(false);
            setMode("flashcards");
          }}
          className={`rounded-xl px-4 py-2 text-[14px] font-bold transition-all ${
            mode === "flashcards"
              ? "bg-blue-700 text-white shadow-2xs"
              : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
          } min-h-[44px] min-w-[44px]`}
        >
          কুইক রিভিশন ফ্ল্যাশকার্ড
        </button>

        <button
          type="button"
          onClick={() => {
            if (examActive && !window.confirm("পরীক্ষা বাতিল করতে চান?")) return;
            setExamActive(false);
            setMode("history");
          }}
          className={`rounded-xl px-4 py-2 text-[14px] font-bold transition-all ${
            mode === "history"
              ? "bg-blue-700 text-white shadow-2xs"
              : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
          } min-h-[44px] min-w-[44px]`}
        >
          আমার স্কোর ও ইতিহাস ({bnDigits(history.length)})
        </button>
      </div>

      {/* TRACK SELECTION VIEW */}
      {mode === "exam" && !examActive && (
        <div className="space-y-4">
          <h4 className="text-[17px] font-bold text-slate-900">যে ভর্তি পরীক্ষার মডেল টেস্ট দিতে চান নির্বাচন করুন:</h4>
          <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
            {EXAM_TRACKS.map((track) => {
              const selected = track.id === selectedTrack;
              return (
                <div
                  key={track.id}
                  onClick={() => setSelectedTrack(track.id)}
                  className={`cursor-pointer rounded-2xl border p-4 sm:p-5 transition-all space-y-3 ${
                    selected
                      ? "border-blue-500 bg-blue-50/50 shadow-sm ring-2 ring-blue-500/20"
                      : "border-slate-200 bg-white hover:border-blue-300 hover:shadow-xs"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="rounded-lg bg-blue-100 px-2.5 py-0.5 text-[12px] font-extrabold text-blue-900">
                      {track.shortName}
                    </span>
                    <span className="text-[13px] font-mono font-bold text-slate-600">
                      {bnDigits(track.totalQuestions)} টি প্রশ্ন
                    </span>
                  </div>

                  <div>
                    <h5 className="text-[16.5px] font-extrabold text-slate-900 leading-snug">{track.nameBn}</h5>
                    <p className="mt-1 text-[13px] text-slate-600 leading-relaxed">{track.descriptionBn}</p>
                  </div>

                  <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-[12.5px] text-slate-500">
                    <span className="flex items-center gap-1 font-medium text-slate-700">
                      <Timer size={14} className="text-blue-600" />
                      <span>{bnDigits(track.durationMinutes)} মিনিট</span>
                    </span>
                    <span className="font-semibold text-rose-700">নেগেটিভ: -{track.negativeMark}</span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-3">
            <h5 className="text-[16px] font-bold text-slate-900 flex items-center gap-1.5">
              <Award size={18} className="text-blue-700" />
              <span>নির্বাচিত পরীক্ষা: {trackInfo.nameBn}</span>
            </h5>
            <div className="grid gap-3 sm:grid-cols-3 text-[13.5px]">
              <div className="rounded-xl bg-slate-50 p-3">
                <span className="block text-slate-500">বিষয়সমূহ</span>
                <strong className="text-slate-800">{trackInfo.subjects.join(", ")}</strong>
              </div>
              <div className="rounded-xl bg-slate-50 p-3">
                <span className="block text-slate-500">সময় ও পূর্ণমান</span>
                <strong className="text-slate-800">{bnDigits(trackInfo.durationMinutes)} মিনিট · পূর্ণমান {bnDigits(trackInfo.totalQuestions)}</strong>
              </div>
              <div className="rounded-xl bg-slate-50 p-3">
                <span className="block text-slate-500">নেগেটিভ মার্কিং বিধি</span>
                <strong className="text-rose-700">প্রতি ৪টি ভুল উত্তরের জন্য ১ নম্বর কর্তন (-০.২৫)</strong>
              </div>
            </div>

            {availableSubjects.length > 1 && (
              <div className="pt-2 border-t border-slate-200/60 flex flex-wrap items-center gap-2">
                <span className="text-[12.5px] font-bold text-slate-700">বিষয়ভিত্তিক ড্রিল:</span>
                <button
                  type="button"
                  onClick={() => setSubjectFilter("all")}
                  className={`rounded-lg px-2.5 py-1 text-[12px] font-bold transition-all ${
                    subjectFilter === "all" ? "bg-blue-700 text-white" : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                  } min-h-[44px] min-w-[44px]`}
                >
                  সব বিষয়
                </button>
                {availableSubjects.map((sub) => (
                  <button
                    key={sub}
                    type="button"
                    onClick={() => setSubjectFilter(sub)}
                    className={`rounded-lg px-2.5 py-1 text-[12px] font-bold transition-all ${
                      subjectFilter === sub ? "bg-blue-700 text-white" : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                    } min-h-[44px] min-w-[44px]`}
                  >
                    {sub}
                  </button>
                ))}
              </div>
            )}

            <button
              type="button"
              onClick={handleStartExam}
              className="w-full min-h-[46px] rounded-xl bg-blue-700 px-4 text-[15px] font-extrabold text-white hover:bg-blue-800 transition-colors flex items-center justify-center gap-2"
            >
              <Play size={17} fill="currentColor" />
              <span>{subjectFilter === "all" ? "এই পরীক্ষার মডেল টেস্ট শুরু করুন" : `${subjectFilter} ড্রিল শুরু করুন`}</span>
            </button>
          </div>
        </div>
      )}

      {/* ACTIVE TIMED EXAM VIEW */}
      {examActive && currentQ && (
        <div className="space-y-4">
          {/* Top Status Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs">
            <div className="flex items-center gap-2.5">
              <span className="rounded-lg bg-blue-100 px-3 py-1 text-[13px] font-extrabold text-blue-900">
                প্রশ্ন {bnDigits(currentQIndex + 1)} / {bnDigits(trackQuestions.length)}
              </span>
              <span className="text-[13px] font-bold text-slate-700">{currentQ.subject}</span>
              <span className="text-[12px] text-slate-500">({currentQ.topic})</span>
            </div>

            <div className="flex items-center gap-3">
              <div className="inline-flex rounded-lg border border-slate-200 bg-slate-100 p-0.5 text-[12px]">
                <button
                  type="button"
                  onClick={() => setExamViewType("card")}
                  className={`rounded-md px-2.5 py-1 font-bold transition-all ${
                    examViewType === "card" ? "bg-white text-blue-900 shadow-2xs" : "text-slate-600 hover:text-slate-900"
                  } min-h-[44px] min-w-[44px]`}
                >
                  কার্ড ভিউ
                </button>
                <button
                  type="button"
                  onClick={() => setExamViewType("omr")}
                  className={`rounded-md px-2.5 py-1 font-bold transition-all ${
                    examViewType === "omr" ? "bg-blue-700 text-white shadow-2xs" : "text-slate-600 hover:text-slate-900"
                  } min-h-[44px] min-w-[44px]`}
                >
                  OMR শিট ভিউ
                </button>
              </div>

              <div className="flex items-center gap-1.5 rounded-xl bg-rose-50 px-3 py-1.5 border border-rose-200 text-rose-900 font-mono font-bold text-[15px]">
                <Timer size={17} className="text-rose-600 animate-spin" />
                <span>{formatTimer(secondsRemaining)}</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (window.confirm("আপনি কি নিশ্চিত পরীক্ষা সমাপ্ত করে ফলাফল দেখতে চান?")) {
                    handleFinishExam();
                  }
                }}
                className="rounded-xl bg-slate-900 px-4 py-2 text-[13.5px] font-bold text-white hover:bg-slate-800 min-h-[44px] min-w-[44px]"
              >
                পরীক্ষা জমা দিন
              </button>
            </div>
          </div>

          {/* Question Pager Grid */}
          <div className="flex flex-wrap gap-1.5 p-3 rounded-xl border border-slate-200 bg-slate-50">
            {trackQuestions.map((q, idx) => {
              const isAnswered = typeof userAnswers[q.id] === "number";
              const isCurrent = idx === currentQIndex;
              return (
                <button
                  key={q.id}
                  type="button"
                  onClick={() => setCurrentQIndex(idx)}
                  className={`h-11 w-11 rounded-lg text-[13px] font-mono font-bold transition-all ${
                    isCurrent
                      ? "ring-2 ring-blue-600 bg-blue-600 text-white"
                      : isAnswered
                      ? "bg-blue-100 text-blue-950 border border-blue-300"
                      : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  {bnDigits(idx + 1)}
                </button>
              );
            })}
          </div>

          {examViewType === "omr" ? (
            /* OMR SHEET MODE */
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h4 className="text-[17px] font-bold text-slate-900">OMR অপটিক্যাল মার্ক রিডার সিমুলেশন</h4>
                  <p className="text-[12.5px] text-slate-500">ভর্তি পরীক্ষার ওএমআর শিটের মতো বৃত্ত ভরাট করুন।</p>
                </div>
                <span className="rounded-lg bg-emerald-50 text-emerald-800 font-mono font-bold text-[13px] px-3 py-1">
                  ভরাট: {bnDigits(Object.keys(userAnswers).length)} / {bnDigits(trackQuestions.length)}
                </span>
              </div>

              <div className="grid gap-2.5 sm:grid-cols-2 md:grid-cols-3">
                {trackQuestions.map((q, qIdx) => {
                  const chosen = userAnswers[q.id];
                  return (
                    <div
                      key={q.id}
                      onClick={() => setCurrentQIndex(qIdx)}
                      className={`rounded-xl border p-2.5 flex items-center justify-between gap-2 transition-all cursor-pointer ${
                        qIdx === currentQIndex
                          ? "border-blue-500 bg-blue-50/50 ring-1 ring-blue-400"
                          : "border-slate-200 bg-slate-50/60 hover:bg-slate-50"
                      }`}
                    >
                      <span className="font-mono font-bold text-[13px] text-slate-700 min-w-[26px]">
                        {bnDigits(qIdx + 1)}.
                      </span>
                      <div className="flex items-center gap-1.5">
                        {OMR_BUBBLE_LETTERS.map((letter, optIdx) => {
                          const isBubbleFilled = chosen === optIdx;
                          return (
                            <button
                              key={letter}
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSelectOption(q.id, optIdx);
                              }}
                              className={`h-11 w-11 rounded-full text-[12px] font-mono font-extrabold flex items-center justify-center transition-all ${
                                isBubbleFilled
                                  ? "bg-slate-900 text-white shadow-2xs scale-105"
                                  : "border border-slate-300 bg-white text-slate-600 hover:border-slate-500 hover:bg-slate-100"
                              }`}
                            >
                              {letter}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Active question preview underneath OMR */}
              <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50/50 p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[12px] font-bold text-blue-900">
                    প্রশ্ন {bnDigits(currentQIndex + 1)}: {currentQ.subject} ({currentQ.topic})
                  </span>
                  <button
                    type="button"
                    onClick={() => setExamViewType("card")}
                    className="text-[12px] text-blue-700 font-bold hover:underline min-h-[44px] min-w-[44px]"
                  >
                    কার্ড ভিউতে বিস্তারিত দেখুন →
                  </button>
                </div>
                <p className="text-[15px] font-bold text-slate-900">{currentQ.questionBn}</p>
                <div className="grid grid-cols-2 gap-2 text-[13px]">
                  {currentQ.options.map((opt, oIdx) => (
                    <div key={oIdx} className="text-slate-700">
                      <strong>{OMR_BUBBLE_LETTERS[oIdx]}.</strong> {opt}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            /* Question & 4 Options (Card View) */
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-5">
              <h4 className="text-[18px] sm:text-[20px] font-bold text-slate-900 leading-relaxed">
                {currentQ.questionBn}
              </h4>

              <div className="space-y-2.5">
                {currentQ.options.map((opt, optIdx) => {
                  const selected = userAnswers[currentQ.id] === optIdx;
                  const optLabels = ["(ক)", "(খ)", "(গ)", "(ঘ)"];
                  return (
                    <div
                      key={optIdx}
                      onClick={() => handleSelectOption(currentQ.id, optIdx)}
                      className={`cursor-pointer flex items-center gap-3 rounded-xl p-3.5 border transition-all ${
                        selected
                          ? "border-blue-600 bg-blue-50 text-blue-950 font-bold shadow-2xs ring-1 ring-blue-500"
                          : "border-slate-200 bg-white hover:bg-slate-50 text-slate-800"
                      }`}
                    >
                      <span className="grid h-6 w-6 place-items-center rounded-full border border-slate-300 text-[13px] font-mono font-bold">
                        {optLabels[optIdx]}
                      </span>
                      <span className="text-[15.5px] leading-snug">{opt}</span>
                    </div>
                  );
                })}
              </div>

              {/* Navigation buttons */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                <button
                  type="button"
                  disabled={currentQIndex === 0}
                  onClick={() => setCurrentQIndex((prev) => Math.max(0, prev - 1))}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 px-4 py-2 text-[14px] font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40 min-h-[44px] min-w-[44px]"
                >
                  <ArrowLeft size={16} />
                  <span>পূর্ববর্তী প্রশ্ন</span>
                </button>

                {currentQIndex < trackQuestions.length - 1 ? (
                  <button
                    type="button"
                    onClick={() => setCurrentQIndex((prev) => Math.min(trackQuestions.length - 1, prev + 1))}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-blue-700 px-5 py-2 text-[14px] font-bold text-white hover:bg-blue-800 min-h-[44px] min-w-[44px]"
                  >
                    <span>পরবর্তী প্রশ্ন</span>
                    <ArrowRight size={16} />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleFinishExam}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-700 px-5 py-2 text-[14px] font-bold text-white hover:bg-emerald-800 min-h-[44px] min-w-[44px]"
                  >
                    <Check size={16} />
                    <span>পরীক্ষা সমাপ্ত করুন</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* RESULTS & EXPLANATIONS VIEW */}
      {mode === "review" && latestAttempt && (
        <div className="space-y-6">
          {/* Score Card */}
          <div className="rounded-2xl border border-blue-300 bg-gradient-to-br from-blue-50 via-white to-indigo-50 p-5 sm:p-6 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-blue-100 pb-4">
              <div>
                <span className="text-[13px] font-bold uppercase tracking-wider text-blue-800">মডেল টেস্টের ফলাফল</span>
                <h4 className="text-[22px] font-extrabold text-slate-900">{trackInfo.nameBn}</h4>
              </div>
              <button
                type="button"
                onClick={handleStartExam}
                className="inline-flex items-center gap-1.5 rounded-xl bg-blue-700 px-4 py-2 text-[14px] font-bold text-white hover:bg-blue-800 min-h-[44px] min-w-[44px]"
              >
                <RotateCcw size={15} />
                <span>পুনরায় পরীক্ষা দিন</span>
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
              <div className="rounded-xl bg-white p-3.5 border border-blue-200">
                <span className="text-[12px] text-slate-500 block">মোট প্রাপ্ত নম্বর</span>
                <strong className="text-[26px] font-extrabold text-blue-900 font-mono">
                  {bnDigits(latestAttempt.score)}
                </strong>
                <span className="text-[12px] text-slate-500 block">পূর্ণমান: {bnDigits(latestAttempt.totalQuestions)}</span>
              </div>

              <div className="rounded-xl bg-white p-3.5 border border-emerald-200">
                <span className="text-[12px] text-slate-500 block">সঠিক উত্তর</span>
                <strong className="text-[26px] font-extrabold text-emerald-700 font-mono">
                  {bnDigits(latestAttempt.correctCount)}
                </strong>
                <span className="text-[12px] text-emerald-800 block">+{bnDigits(latestAttempt.correctCount * 1.0)} নম্বর</span>
              </div>

              <div className="rounded-xl bg-white p-3.5 border border-rose-200">
                <span className="text-[12px] text-slate-500 block">ভুল উত্তর (নেগেটিভ)</span>
                <strong className="text-[26px] font-extrabold text-rose-700 font-mono">
                  {bnDigits(latestAttempt.wrongCount)}
                </strong>
                <span className="text-[12px] text-rose-800 block">-{bnDigits(latestAttempt.wrongCount * trackInfo.negativeMark)} নম্বর</span>
              </div>

              <div className="rounded-xl bg-white p-3.5 border border-slate-200">
                <span className="text-[12px] text-slate-500 block">নির্ভুলতার হার (Accuracy)</span>
                <strong className="text-[26px] font-extrabold text-slate-900 font-mono">
                  {bnDigits(latestAttempt.accuracyPercentage)}%
                </strong>
                <span className="text-[12px] text-slate-500 block">উত্তর দিয়েছেন: {bnDigits(latestAttempt.answeredCount)} টি</span>
              </div>
            </div>

            {/* Subject breakdown */}
            <div className="rounded-xl bg-white/90 p-4 border border-blue-100 space-y-2">
              <span className="text-[13px] font-bold text-slate-800 block">বিষয়ভিত্তিক অগ্রগতি:</span>
              <div className="grid gap-2 sm:grid-cols-2">
                {Object.entries(latestAttempt.subjectBreakdown).map(([sub, data]) => (
                  <div key={sub} className="flex items-center justify-between text-[13px] bg-slate-50 p-2.5 rounded-lg">
                    <span className="font-semibold text-slate-800">{sub}</span>
                    <span className="font-mono">
                      সঠিক: <strong className="text-emerald-700">{bnDigits(data.correct)}</strong> / {bnDigits(data.total)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Full Detailed Answer Review */}
          <div className="space-y-4">
            <h4 className="text-[18px] font-extrabold text-slate-900">সকল প্রশ্নের নির্ভুল উত্তর ও ব্যাখ্যা:</h4>
            {trackQuestions.map((q, idx) => {
              const userChoice = userAnswers[q.id];
              const isCorrect = userChoice === q.correctIndex;
              const isUnanswered = typeof userChoice !== "number";

              return (
                <div
                  key={q.id}
                  className={`rounded-2xl border p-5 space-y-3 transition-all ${
                    isCorrect
                      ? "border-emerald-200 bg-emerald-50/30"
                      : isUnanswered
                      ? "border-slate-200 bg-white"
                      : "border-rose-200 bg-rose-50/30"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="flex items-center gap-2">
                      <span className="grid h-6 w-6 place-items-center rounded-full bg-slate-900 text-white text-[12px] font-mono font-bold">
                        {bnDigits(idx + 1)}
                      </span>
                      <strong className="text-[14px] text-slate-700">{q.subject}</strong>
                      <span className="text-[12px] text-slate-500">· {q.topic}</span>
                    </span>
                    <span className="text-[12px] font-bold">
                      {isCorrect ? (
                        <span className="text-emerald-800 flex items-center gap-1">
                          <CheckCircle2 size={16} /> সঠিক (+১.০)
                        </span>
                      ) : isUnanswered ? (
                        <span className="text-slate-500">উত্তর দেওয়া হয়নি (০)</span>
                      ) : (
                        <span className="text-rose-800 flex items-center gap-1">
                          <XCircle size={16} /> ভুল (-০.২৫)
                        </span>
                      )}
                    </span>
                  </div>

                  <h5 className="text-[16.5px] font-bold text-slate-900 leading-snug">{q.questionBn}</h5>

                  <div className="grid gap-2 sm:grid-cols-2 text-[14px]">
                    {q.options.map((opt, oIdx) => {
                      const isOptionCorrect = oIdx === q.correctIndex;
                      const isOptionChosen = oIdx === userChoice;

                      let badgeStyle = "border-slate-200 bg-white text-slate-800";
                      if (isOptionCorrect) {
                        badgeStyle = "border-emerald-500 bg-emerald-100/80 text-emerald-950 font-bold";
                      } else if (isOptionChosen && !isOptionCorrect) {
                        badgeStyle = "border-rose-500 bg-rose-100/80 text-rose-950 font-bold line-through";
                      }

                      return (
                        <div key={oIdx} className={`rounded-xl border p-2.5 flex items-center gap-2 ${badgeStyle}`}>
                          <span className="text-[12px] font-mono font-bold">
                            {oIdx === 0 ? "ক" : oIdx === 1 ? "খ" : oIdx === 2 ? "গ" : "ঘ"}.
                          </span>
                          <span>{opt}</span>
                        </div>
                      );
                    })}
                  </div>

                  <div className="rounded-xl bg-blue-50/70 p-3.5 border border-blue-200/60 text-[13px] text-blue-950 leading-relaxed">
                    💡 <strong>ব্যাখ্যা:</strong> {q.explanationBn}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* QUICK REVISION FLASHCARDS */}
      {mode === "flashcards" && (
        <div className="space-y-4 max-w-2xl mx-auto">
          <div className="text-center space-y-1">
            <h4 className="text-[20px] font-extrabold text-slate-900">গুরুত্বপূর্ণ সূত্র ও হাই-ইল্ড রিভিশন কার্ড</h4>
            <p className="text-[13.5px] text-slate-600">
              কার্ডে ট্যাপ করে উত্তর ও সমীকরণ দেখুন। ভর্তি পরীক্ষার গুরুত্বপূর্ণ শর্টকাট।
            </p>
          </div>

          {/* Flashcard Subject Filter */}
          <div className="flex flex-wrap items-center justify-center gap-1.5 pb-2">
            {(["all", "পদার্থবিজ্ঞান", "রসায়ন", "জীববিজ্ঞান", "উচ্চতর গণিত", "ইংরেজি", "সাধারণ জ্ঞান"] as const).map((sub) => (
              <button
                key={sub}
                type="button"
                onClick={() => {
                  setFlashcardSubject(sub);
                  setFlashcardIndex(0);
                  setCardFlipped(false);
                }}
                className={`rounded-lg px-2.5 py-1 text-[12px] font-bold transition-all ${
                  flashcardSubject === sub
                    ? "bg-blue-700 text-white shadow-2xs"
                    : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                } min-h-[44px] min-w-[44px]`}
              >
                {sub === "all" ? "সকল বিষয়" : sub}
              </button>
            ))}
          </div>

          {filteredFlashcards.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-slate-500">
              এই বিষয়ে কোনো ফ্ল্যাশকার্ড পাওয়া যায়নি।
            </div>
          ) : (
            (() => {
              const activeCard = filteredFlashcards[Math.min(flashcardIndex, filteredFlashcards.length - 1)];
              return (
                <>
                  <div
                    onClick={() => setCardFlipped(!cardFlipped)}
                    className="cursor-pointer min-h-[220px] rounded-3xl border-2 border-blue-300 bg-gradient-to-br from-white to-blue-50/50 p-7 shadow-md flex flex-col justify-between transition-all hover:shadow-lg text-center"
                  >
                    <div className="flex items-center justify-between text-[13px] text-slate-500">
                      <span className="rounded-md bg-blue-100 px-2.5 py-0.5 font-bold text-blue-900">
                        {activeCard.subject} · {activeCard.topic}
                      </span>
                      <span className="font-mono text-slate-500">
                        {bnDigits(flashcardIndex + 1)} / {bnDigits(filteredFlashcards.length)}
                      </span>
                    </div>

                    <div className="my-auto py-4">
                      {!cardFlipped ? (
                        <div className="space-y-2">
                          <span className="text-[12px] font-extrabold uppercase tracking-wider text-slate-500 block">প্রশ্ন / সূত্র</span>
                          <p className="text-[18px] sm:text-[20px] font-bold text-slate-900 leading-relaxed">
                            {activeCard.front}
                          </p>
                          <span className="text-[12px] text-blue-600 font-semibold block pt-2">
                            (উত্তর দেখতে কার্ডে চাপ দিন)
                          </span>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <span className="text-[12px] font-extrabold uppercase tracking-wider text-emerald-700 block">উত্তর ও ব্যাখ্যা</span>
                          <p className="text-[16px] sm:text-[18px] font-bold text-emerald-950 leading-relaxed whitespace-pre-line font-mono">
                            {activeCard.back}
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="text-[12px] text-slate-500">
                      {cardFlipped ? "পুনরায় প্রশ্ন দেখতে আবার ট্যাপ করুন" : "উত্তর দেখতে কার্ডে ট্যাপ করুন"}
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <button
                      type="button"
                      disabled={flashcardIndex === 0}
                      onClick={() => {
                        setCardFlipped(false);
                        setFlashcardIndex((prev) => Math.max(0, prev - 1));
                      }}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 px-4 py-2 text-[14px] font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40 min-h-[44px] min-w-[44px]"
                    >
                      <ArrowLeft size={16} /> পূর্ববর্তী
                    </button>
                    <span className="text-[13px] font-mono text-slate-600">
                      {bnDigits(flashcardIndex + 1)} / {bnDigits(filteredFlashcards.length)}
                    </span>
                    <button
                      type="button"
                      disabled={flashcardIndex >= filteredFlashcards.length - 1}
                      onClick={() => {
                        setCardFlipped(false);
                        setFlashcardIndex((prev) => Math.min(filteredFlashcards.length - 1, prev + 1));
                      }}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-blue-700 px-4 py-2 text-[14px] font-bold text-white hover:bg-blue-800 disabled:opacity-40 min-h-[44px] min-w-[44px]"
                    >
                      পরবর্তী <ArrowRight size={16} />
                    </button>
                  </div>
                </>
              );
            })()
          )}
        </div>
      )}

      {/* SCORE & ATTEMPT HISTORY */}
      {mode === "history" && (
        <div className="space-y-4">
          <h4 className="text-[18px] font-bold text-slate-900">পূর্ববর্তী মডেল টেস্টের স্কোর ও অগ্রগতি:</h4>
          {history.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-slate-500">
              এখনো কোনো মডেল টেস্ট সম্পন্ন করা হয়নি। পরীক্ষা শুরু করতে 'পরীক্ষা নির্বাচন' ট্যাবে যান।
            </div>
          ) : (
            <div className="space-y-2.5">
              {history.map((att) => {
                const tr = EXAM_TRACKS.find((t) => t.id === att.trackId);
                return (
                  <div
                    key={att.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs"
                  >
                    <div>
                      <strong className="text-[16px] text-slate-900 block">{tr?.nameBn || att.trackId}</strong>
                      <span className="text-[13px] text-slate-500">
                        তারিখ: {bnDigits(att.date)} · সময় ব্যয়: {Math.floor(att.timeTakenSeconds / 60)} মিনিট
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <span className="text-[12px] text-slate-500 block">নম্বর</span>
                        <strong className="text-[18px] font-extrabold text-blue-900 font-mono">
                          {bnDigits(att.score)} / {bnDigits(att.totalQuestions)}
                        </strong>
                      </div>
                      <span className="rounded-full bg-emerald-100 px-3 py-1 text-[13px] font-bold text-emerald-950">
                        {bnDigits(att.accuracyPercentage)}% নির্ভুল
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        targetAppId="admitbuddy"
        targetAppNameBn="AdmitBuddy ভর্তি প্রস্তুতি ও মডেল টেস্ট"
        featureNameBn="পূর্ণাঙ্গ মডেল টেস্ট ও ওএমআর সিমুলেশন"
        lang="bn"
        onSuccess={() => {
          handleStartExamDirect();
        }}
      />
    </div>
  );
}
