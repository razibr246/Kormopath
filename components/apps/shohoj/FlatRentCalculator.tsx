"use client";
import { useState, useMemo } from "react";
import {
  Calculator,
  Coins,
  Copy,
  Check,
  Plus,
  Trash2,
  Users,
  Home,
  CheckCircle2,
  Sparkles,
  Info,
} from "lucide-react";
import {
  estimateMoveInBudget,
  splitRoomRents,
  type RoomInput,
} from "@/lib/flatMess";
import { parseTaka, takaText, bnDigits } from "@/lib/mess";

interface FlatRentCalculatorProps {
  initialRentPoisha?: number;
  initialAdvancePoisha?: number;
  initialTitle?: string;
}

export function FlatRentCalculator({
  initialRentPoisha,
  initialAdvancePoisha,
  initialTitle,
}: FlatRentCalculatorProps) {
  const [tab, setTab] = useState<"movein" | "split">("movein");

  // Move-in Budget States
  const [rentInput, setRentInput] = useState(
    initialRentPoisha ? String(initialRentPoisha / 100) : "12000"
  );
  const [advanceInput, setAdvanceInput] = useState(
    initialAdvancePoisha ? String(initialAdvancePoisha / 100) : "24000"
  );
  const [utilsInput, setUtilsInput] = useState("2000");
  const [vanInput, setVanInput] = useState("1500");
  const [mealInput, setMealInput] = useState("3000");
  const [copiedMoveIn, setCopiedMoveIn] = useState(false);

  // Split Rent States
  const [totalFlatRentInput, setTotalFlatRentInput] = useState("24000");
  const [rooms, setRooms] = useState<RoomInput[]>([
    {
      id: "r1",
      name: "মাস্টার বেড রুম",
      occupantName: "সাকিব ও ফাহিম",
      hasAttachedBath: true,
      hasBalcony: true,
      sizeSqFt: 150,
    },
    {
      id: "r2",
      name: "মিডল বেড রুম",
      occupantName: "তানভীর",
      hasAttachedBath: false,
      hasBalcony: true,
      sizeSqFt: 130,
    },
    {
      id: "r3",
      name: "ছোট বেড রুম",
      occupantName: "রাকিব",
      hasAttachedBath: false,
      hasBalcony: false,
      sizeSqFt: 100,
    },
  ]);
  const [copiedSplit, setCopiedSplit] = useState(false);

  // Compute Move-In
  const moveInResult = useMemo(() => {
    const rentPoisha = parseTaka(rentInput) ?? 0;
    const advancePoisha = parseTaka(advanceInput) ?? 0;
    const utilsPoisha = parseTaka(utilsInput) ?? 0;
    const vanPoisha = parseTaka(vanInput) ?? 0;
    const mealPoisha = parseTaka(mealInput) ?? 0;

    return estimateMoveInBudget({
      rentPoisha,
      advancePoisha,
      utilitiesPoisha: utilsPoisha,
      vanFarePoisha: vanPoisha,
      mealDepositPoisha: mealPoisha,
    });
  }, [rentInput, advanceInput, utilsInput, vanInput, mealInput]);

  // Compute Split
  const totalFlatRentPoisha = useMemo(() => parseTaka(totalFlatRentInput) ?? 0, [totalFlatRentInput]);
  const splitResults = useMemo(() => {
    return splitRoomRents(totalFlatRentPoisha, rooms);
  }, [totalFlatRentPoisha, rooms]);

  const addRoom = () => {
    if (rooms.length >= 8) return;
    const nextNum = rooms.length + 1;
    setRooms([
      ...rooms,
      {
        id: `r-${Date.now()}-${nextNum}`,
        name: `বেড রুম ${bnDigits(nextNum)}`,
        occupantName: `সদস্য ${bnDigits(nextNum)}`,
        hasAttachedBath: false,
        hasBalcony: false,
        sizeSqFt: 120,
      },
    ]);
  };

  const removeRoom = (id: string) => {
    if (rooms.length <= 1) return;
    setRooms(rooms.filter((r) => r.id !== id));
  };

  const updateRoom = (id: string, updates: Partial<RoomInput>) => {
    setRooms(rooms.map((r) => (r.id === id ? { ...r, ...updates } : r)));
  };

  const copyMoveInSummary = async () => {
    const text = `📦 নতুন বাসা বা মেস বদলের বাজেট হিসাব:\n\n১. ১ম মাসের ভাড়া: ${takaText(
      moveInResult.rentPoisha,
      true
    )}\n২. অগ্রিম জামানত: ${takaText(moveInResult.advancePoisha, true)}\n৩. ইউটিলিটি ও বিল: ${takaText(
      moveInResult.utilitiesPoisha,
      true
    )}\n৪. ভ্যান/পিকআপ খরচ: ${takaText(moveInResult.vanFarePoisha, true)}\n৫. মেস মিল ডিপোজিট: ${takaText(
      moveInResult.mealDepositPoisha,
      true
    )}\n------------------------------\n🎯 প্রথম মাসে মোট লাগবে: ${takaText(
      moveInResult.totalMoveInPoisha,
      true
    )}\n🔄 পরবর্তী প্রতি মাসের খরচ: ${takaText(
      moveInResult.recurringMonthlyPoisha,
      true
    )}\n\n— KormoPath সহজ বাজেট মেস সহায়ক`;

    try {
      await navigator.clipboard.writeText(text);
      setCopiedMoveIn(true);
      setTimeout(() => setCopiedMoveIn(false), 2000);
    } catch {}
  };

  const copySplitSummary = async () => {
    const lines = splitResults.map(
      (r, i) =>
        `${bnDigits(i + 1)}. ${r.name} (${r.occupantName}): ${takaText(r.sharePoisha, true)} (${bnDigits(
          r.percentage
        )}%)`
    );
    const text = `🏠 ফ্ল্যাটের মোট ভাড়া ভাগাভাগি (${takaText(totalFlatRentPoisha, true)}):\n\n${lines.join(
      "\n"
    )}\n\n✓ সুবিধা অনুযায়ী শতভাগ নিখুঁত বণ্টন\n— KormoPath সহজ বাজেট`;

    try {
      await navigator.clipboard.writeText(text);
      setCopiedSplit(true);
      setTimeout(() => setCopiedSplit(false), 2000);
    } catch {}
  };

  return (
    <div className="space-y-6" data-testid="flat-rent-calculator">
      {/* Sub-tab selection */}
      <div className="flex border-b border-slate-200">
        <button
          type="button"
          onClick={() => setTab("movein")}
          className={`flex-1 py-3 text-center text-[15px] font-bold border-b-2 transition-colors ${
            tab === "movein"
              ? "border-emerald-700 text-emerald-900 bg-emerald-50/50"
              : "border-transparent text-slate-600 hover:text-slate-900"
          } min-h-[44px] min-w-[44px]`}
        >
          ১. বাসা বদল ও ১ম মাসের খরচের বাজেট
        </button>
        <button
          type="button"
          onClick={() => setTab("split")}
          className={`flex-1 py-3 text-center text-[15px] font-bold border-b-2 transition-colors ${
            tab === "split"
              ? "border-emerald-700 text-emerald-900 bg-emerald-50/50"
              : "border-transparent text-slate-600 hover:text-slate-900"
          } min-h-[44px] min-w-[44px]`}
        >
          ২. ফ্ল্যাটমেট রুম ভাড়া বণ্টন ক্যালকুলেটর
        </button>
      </div>

      {tab === "movein" ? (
        <div className="grid gap-6 lg:grid-cols-12">
          {/* Inputs */}
          <div className="lg:col-span-6 space-y-4 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs">
            <div className="space-y-1 border-b border-slate-100 pb-3">
              <h4 className="text-[17px] font-bold text-slate-900">খরচের খাতসমূহ দিন</h4>
              {initialTitle && (
                <p className="text-[12.5px] text-emerald-800 font-medium">
                  নির্বাচিত বাসা: <strong>{initialTitle}</strong>
                </p>
              )}
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-[13.5px] font-bold text-slate-800">
                  মাসিক ভাড়া (টাকা)
                </label>
                <input
                  type="text"
                  value={rentInput}
                  onChange={(e) => setRentInput(e.target.value)}
                  className="mt-1 w-full min-h-[42px] rounded-xl border border-slate-300 px-3.5 text-[15px] font-mono font-semibold min-h-[44px]"
                />
              </div>

              <div>
                <label className="block text-[13.5px] font-bold text-slate-800">
                  অগ্রিম জামানত / সিকিউরিটি ডিপোজিট (টাকা)
                </label>
                <input
                  type="text"
                  value={advanceInput}
                  onChange={(e) => setAdvanceInput(e.target.value)}
                  className="mt-1 w-full min-h-[42px] rounded-xl border border-slate-300 px-3.5 text-[15px] font-mono font-semibold min-h-[44px]"
                />
              </div>

              <div>
                <label className="block text-[13.5px] font-bold text-slate-800">
                  ইউটিলিটি ও বিল (গ্যাস, পানি, বিদ্যুৎ, ওয়াইফাই)
                </label>
                <input
                  type="text"
                  value={utilsInput}
                  onChange={(e) => setUtilsInput(e.target.value)}
                  className="mt-1 w-full min-h-[42px] rounded-xl border border-slate-300 px-3.5 text-[15px] font-mono min-h-[44px]"
                />
              </div>

              <div>
                <label className="block text-[13.5px] font-bold text-slate-800">
                  পিকআপ বা ভ্যান ভাড়া ও কুলি খরচ
                </label>
                <input
                  type="text"
                  value={vanInput}
                  onChange={(e) => setVanInput(e.target.value)}
                  className="mt-1 w-full min-h-[42px] rounded-xl border border-slate-300 px-3.5 text-[15px] font-mono min-h-[44px]"
                />
              </div>

              <div>
                <label className="block text-[13.5px] font-bold text-slate-800">
                  মেসের প্রাথমিক মিল ও বাজার জমা
                </label>
                <input
                  type="text"
                  value={mealInput}
                  onChange={(e) => setMealInput(e.target.value)}
                  className="mt-1 w-full min-h-[42px] rounded-xl border border-slate-300 px-3.5 text-[15px] font-mono min-h-[44px]"
                />
              </div>
            </div>
          </div>

          {/* Results Summary */}
          <div className="lg:col-span-6 space-y-4">
            <div className="rounded-2xl border border-emerald-300 bg-gradient-to-br from-emerald-50 via-white to-teal-50 p-5 sm:p-6 shadow-sm space-y-4">
              <div>
                <span className="text-[13px] font-bold uppercase tracking-wider text-emerald-800">
                  প্রথম মাসে সর্বমোট কত টাকা লাগবে?
                </span>
                <div className="mt-1 text-[32px] sm:text-[36px] font-extrabold text-emerald-950 font-mono">
                  {takaText(moveInResult.totalMoveInPoisha, true)}
                </div>
              </div>

              <div className="rounded-xl bg-white/80 p-3.5 border border-emerald-200/80 space-y-2 text-[14px]">
                <div className="flex justify-between text-slate-700">
                  <span>অগ্রিম জামানত:</span>
                  <strong className="font-mono">{takaText(moveInResult.advancePoisha, true)}</strong>
                </div>
                <div className="flex justify-between text-slate-700">
                  <span>প্রথম মাসের ভাড়া:</span>
                  <strong className="font-mono">{takaText(moveInResult.rentPoisha, true)}</strong>
                </div>
                <div className="flex justify-between text-slate-700">
                  <span>বিল ও ইউটিলিটি:</span>
                  <strong className="font-mono">{takaText(moveInResult.utilitiesPoisha, true)}</strong>
                </div>
                <div className="flex justify-between text-slate-700">
                  <span>ভ্যান ও স্থানান্তর খরচ:</span>
                  <strong className="font-mono">{takaText(moveInResult.vanFarePoisha, true)}</strong>
                </div>
                <div className="flex justify-between text-slate-700">
                  <span>মেসের খাবার জমা:</span>
                  <strong className="font-mono">{takaText(moveInResult.mealDepositPoisha, true)}</strong>
                </div>
              </div>

              <div className="rounded-xl bg-slate-900 text-white p-3.5 flex items-center justify-between">
                <div>
                  <span className="text-[12px] text-slate-500 block">পরবর্তী প্রতি মাসের আনুমানিক খরচ</span>
                  <strong className="text-[18px] font-bold font-mono">
                    {takaText(moveInResult.recurringMonthlyPoisha, true)} / মাস
                  </strong>
                </div>
              </div>

              <button
                type="button"
                onClick={copyMoveInSummary}
                className="w-full min-h-[44px] rounded-xl border border-emerald-400 bg-white px-4 text-[14.5px] font-bold text-emerald-950 hover:bg-emerald-100 flex items-center justify-center gap-2 transition-colors"
              >
                {copiedMoveIn ? (
                  <>
                    <Check size={16} className="text-emerald-700" />
                    <span>কপি সম্পন্ন হয়েছে!</span>
                  </>
                ) : (
                  <>
                    <Copy size={16} />
                    <span>হিসাবটি কপি করুন (Copy Budget)</span>
                  </>
                )}
              </button>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-2 text-[13px] text-slate-600">
              <p className="flex items-start gap-1.5 font-medium text-slate-800">
                <Info size={16} className="shrink-0 text-emerald-700 mt-0.5" />
                <span>মেস ও ফ্ল্যাট নেওয়ার জরুরি সতর্কতা:</span>
              </p>
              <ul className="list-disc pl-5 space-y-1 text-slate-600">
                <li>বাড়িওয়ালা বা ম্যানেজারের সাথে নোটিশ পিরিয়ড (কত দিন আগে বাসা ছাড়ার কথা বলতে হবে) স্পষ্ট করুন।</li>
                <li>অগ্রিম টাকা জমা দেওয়ার সময় অবশ্যই লিখিত রসিদ বা চুক্তিপত্রে স্বাক্ষর রাখুন।</li>
              </ul>
            </div>
          </div>
        </div>
      ) : (
        /* Room Split Tool */
        <div className="space-y-5">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <h4 className="text-[18px] font-bold text-slate-900">
                  ফ্ল্যাটমেটদের মধ্যে রুমের সুবিধা অনুযায়ী ন্যায্য ভাড়া বণ্টন
                </h4>
                <p className="text-[13.5px] text-slate-600">
                  মাস্টার বেড (অ্যাটাচড বাথ + বারান্দা) থাকলে বেশি ভাড়া এবং ছোট রুমে কম ভাড়া — সব পয়সা পর্যন্ত নিখুঁত হিসাব।
                </p>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-[14px] font-bold text-slate-700 shrink-0">ফ্ল্যাটের মোট ভাড়া ৳</label>
                <input
                  type="text"
                  value={totalFlatRentInput}
                  onChange={(e) => setTotalFlatRentInput(e.target.value)}
                  className="w-32 min-h-[42px] rounded-xl border border-slate-300 px-3 text-[16px] font-mono font-bold text-emerald-900 min-h-[44px]"
                />
              </div>
            </div>

            {/* Room List Inputs */}
            <div className="space-y-3">
              {rooms.map((room, idx) => (
                <div
                  key={room.id}
                  className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-slate-50/70 p-3 sm:p-4"
                >
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-emerald-800 text-[13px] font-bold text-white font-mono">
                    {bnDigits(idx + 1)}
                  </span>

                  <input
                    type="text"
                    value={room.name}
                    onChange={(e) => updateRoom(room.id, { name: e.target.value })}
                    placeholder="রুমের নাম"
                    className="w-36 min-h-[38px] rounded-lg border border-slate-300 bg-white px-2.5 text-[14px] font-semibold min-h-[44px]"
                  />

                  <input
                    type="text"
                    value={room.occupantName}
                    onChange={(e) => updateRoom(room.id, { occupantName: e.target.value })}
                    placeholder="কে বা কারা থাকবেন"
                    className="min-w-[130px] flex-1 min-h-[38px] rounded-lg border border-slate-300 bg-white px-2.5 text-[14px] min-h-[44px]"
                  />

                  <label className="flex items-center gap-1.5 text-[13px] font-medium text-slate-700 cursor-pointer min-h-[44px]">
                    <input
                      type="checkbox"
                      checked={room.hasAttachedBath}
                      onChange={(e) => updateRoom(room.id, { hasAttachedBath: e.target.checked })}
                      className="h-4 w-4 rounded text-emerald-700"
                    />
                    <span>অ্যাটাচড বাথ (+৩০%)</span>
                  </label>

                  <label className="flex items-center gap-1.5 text-[13px] font-medium text-slate-700 cursor-pointer min-h-[44px]">
                    <input
                      type="checkbox"
                      checked={room.hasBalcony}
                      onChange={(e) => updateRoom(room.id, { hasBalcony: e.target.checked })}
                      className="h-4 w-4 rounded text-emerald-700"
                    />
                    <span>বারান্দা (+১৫%)</span>
                  </label>

                  {rooms.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeRoom(room.id)}
                      className="text-slate-500 hover:text-red-700 p-1 min-h-[44px] min-w-[44px]"
                      aria-label="Remove room"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              ))}
            </div>

            <div className="flex justify-between items-center pt-2">
              <button
                type="button"
                onClick={addRoom}
                disabled={rooms.length >= 8}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-[13.5px] font-bold text-slate-800 hover:bg-slate-50 disabled:opacity-50 min-h-[44px] min-w-[44px]"
              >
                <Plus size={16} />
                <span>আরও একটি রুম যোগ করুন</span>
              </button>
            </div>
          </div>

          {/* Room Split Results Display */}
          <div className="rounded-2xl border border-emerald-300 bg-emerald-50/60 p-5 sm:p-6 space-y-4 shadow-sm">
            <div className="flex items-center justify-between">
              <h4 className="text-[17px] font-extrabold text-emerald-950">
                ন্যায্য ভাড়ার হিসাব (রুম ভিত্তিক)
              </h4>
              <button
                type="button"
                onClick={copySplitSummary}
                className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-800 px-3.5 py-2 text-[13px] font-bold text-white hover:bg-emerald-900 transition-colors min-h-[44px] min-w-[44px]"
              >
                {copiedSplit ? <Check size={15} /> : <Copy size={15} />}
                <span>{copiedSplit ? "কপি হয়েছে" : "মেসেঞ্জারে শেয়ার কপি"}</span>
              </button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {splitResults.map((item, idx) => (
                <div
                  key={item.roomId}
                  className="rounded-xl border border-emerald-200 bg-white p-4 space-y-1.5 shadow-2xs"
                >
                  <div className="flex items-center justify-between">
                    <strong className="text-[15px] text-slate-900">{item.name}</strong>
                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[12px] font-bold text-emerald-900">
                      {bnDigits(item.percentage)}%
                    </span>
                  </div>
                  <p className="text-[13px] text-slate-600">{item.occupantName}</p>
                  <div className="pt-2 border-t border-slate-100 flex items-baseline justify-between">
                    <span className="text-[12px] text-slate-500">প্রদেয় ভাড়া:</span>
                    <strong className="text-[18px] font-extrabold text-emerald-900 font-mono">
                      {takaText(item.sharePoisha, true)}
                    </strong>
                  </div>
                </div>
              ))}
            </div>

            <p className="text-[12.5px] text-emerald-950 font-medium text-center">
              ✓ সমস্ত রুমের ভাড়া যোগ করলে ঠিক <strong>{takaText(totalFlatRentPoisha, true)}</strong> টাকা হয় (কোনো পয়সা কম-বেশি হয় না)।
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
