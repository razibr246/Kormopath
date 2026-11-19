"use client";
import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  ClipboardCopy,
  Download,
  Lock,
  Plus,
  ShoppingBasket,
  Trash2,
  UserPlus,
  Users,
  Wallet,
  Building2,
  Calculator,
  FileText,
  UtensilsCrossed,
  Sparkles,
  Home,
} from "lucide-react";
import { usePersistentState, storageKey, todayLocal, downloadText } from "@/lib/clientStore";
import {
  MAX_MEMBERS,
  SLOTS,
  UTILITY_KINDS,
  bnDigits,
  closeCycle,
  cycleDays,
  cycleEnd,
  cycleFor,
  dayHalfUnits,
  dutyFor,
  emptyMess,
  mealsText,
  parseTaka,
  sanitizeMess,
  setGuests,
  setMeal,
  settle,
  settlementCheck,
  settlementText,
  takaText,
  type MealSlot,
  type MessState,
  type UtilityKind,
} from "@/lib/mess";
import {
  type FlatMessListing,
  sanitizeListings,
} from "@/lib/flatMess";
import { FlatMessDirectory } from "./FlatMessDirectory";
import { FlatPostForm } from "./FlatPostForm";
import { FlatRentCalculator } from "./FlatRentCalculator";
import { FlatAgreementView } from "./FlatAgreementView";

const uid = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
const HALF_OPTIONS = [0, 1, 2, 3, 4];
const field = "min-h-[44px] rounded-xl border border-slate-300 bg-white px-3 text-[15px]";
const card = "space-y-3 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5";

type MessSubTab = "ledger" | "directory" | "post" | "calculator" | "agreement";

/**
 * Bachelor mess & shared flat hub (মেস ও ফ্ল্যাট).
 * Integrates:
 * 1. Daily meals, bazar & shared bills ledger with poisha reconciliation (lib/mess.ts).
 * 2. Bangladesh Mess & Flat Directory & To-Let finder (lib/flatMess.ts).
 * 3. Community To-Let / Mess posting for any general user.
 * 4. Move-in budget estimator & room-wise fair rent split calculator.
 * 5. Tenancy & Mess legal agreement draft generator.
 */
export function MessLedger() {
  const [lang, setLang] = useState<"bn" | "en">("bn");
  const bn = lang === "bn";
  const T = (b: string, e: string) => (bn ? b : e);
  const N = (v: string | number) => (bn ? bnDigits(v) : String(v));
  const tk = (p: number) => takaText(p, bn);

  const [subTab, setSubTab] = useState<MessSubTab>("ledger");
  const [calcParams, setCalcParams] = useState<{ rentPoisha?: number; advancePoisha?: number; title?: string }>({});
  const [agreementListing, setAgreementListing] = useState<FlatMessListing | null>(null);

  // Persistent community user listings
  const [userListings, setUserListings] = usePersistentState<FlatMessListing[]>(
    storageKey("shohoj", "flat_listings"),
    [],
    sanitizeListings
  );

  const [today, setToday] = useState("");
  useEffect(() => {
    setToday(todayLocal());
  }, []);
  const [st, setSt, { ready }] = usePersistentState<MessState>(
    storageKey("shohoj", "mess"),
    emptyMess("2026-01-01"),
    sanitizeMess
  );

  // A brand-new book starts on the cycle that contains today.
  useEffect(() => {
    if (!ready || !today) return;
    const empty =
      !st.members.length &&
      !st.meals.length &&
      !st.bazar.length &&
      !st.deposits.length &&
      !st.history.length;
    const want = cycleFor(today, st.closeDay).start;
    if (empty && st.cycleStart !== want) setSt((s) => ({ ...s, cycleStart: want }));
  }, [ready, today, st, setSt]);

  const end = cycleEnd(st.cycleStart, st.closeDay);
  const days = useMemo(() => cycleDays(st.cycleStart, end), [st.cycleStart, end]);
  const [day, setDay] = useState("");
  useEffect(() => {
    if (today && !day) setDay(today >= st.cycleStart && today <= end ? today : st.cycleStart);
  }, [today, day, st.cycleStart, end]);
  const editDay = day && day >= st.cycleStart && day <= end ? day : st.cycleStart;

  const [msg, setMsg] = useState("");
  const flash = (m: string) => {
    setMsg(m);
    window.setTimeout(() => setMsg(""), 2600);
  };
  const nameOf = (id: string | null) => st.members.find((m) => m.id === id)?.name ?? T("ক্যাশ বক্স", "Cash box");
  const active = st.members.filter((m) => m.active);

  // ---- user listings management ----
  const handleAddUserListing = (listing: FlatMessListing) => {
    setUserListings((prev) => [listing, ...prev]);
    flash(T("বিজ্ঞাপনটি সফলভাবে সংরক্ষিত হয়েছে", "Listing saved successfully"));
  };

  const handleDeleteUserListing = (id: string) => {
    setUserListings((prev) => prev.filter((item) => item.id !== id));
    flash(T("বিজ্ঞাপনটি মুছে ফেলা হয়েছে", "Listing removed"));
  };

  const handleSelectForCalculator = (rentPoisha: number, advancePoisha: number, title: string) => {
    setCalcParams({ rentPoisha, advancePoisha, title });
    setSubTab("calculator");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSelectForAgreement = (listing: FlatMessListing) => {
    setAgreementListing(listing);
    setSubTab("agreement");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // ---- members ----
  const [newName, setNewName] = useState("");
  const addMember = () => {
    const name = newName.trim().slice(0, 40);
    if (!name || st.members.length >= MAX_MEMBERS) return;
    setSt((s) => ({ ...s, members: [...s.members, { id: uid(), name, active: true }] }));
    setNewName("");
  };
  const removeMember = (id: string) => {
    const m = st.members.find((x) => x.id === id);
    if (
      !m ||
      !window.confirm(
        T(
          `${m.name}-কে মুছবেন? তাঁর মিল, বাজার ও জমার হিসাবও মুছে যাবে।`,
          `Remove ${m.name}? Their meals, bazar and deposits are deleted too.`
        )
      )
    )
      return;
    setSt((s) => ({
      ...s,
      members: s.members.filter((x) => x.id !== id),
      meals: s.meals.filter((x) => x.member !== id),
      bazar: s.bazar.filter((x) => x.by !== id),
      deposits: s.deposits.filter((x) => x.by !== id),
      utilities: s.utilities.map((u) => (u.paidBy === id ? { ...u, paidBy: null } : u)),
    }));
  };

  // ---- money entries ----
  const [bz, setBz] = useState({ by: "", amount: "", note: "" });
  const [dep, setDep] = useState({ by: "", amount: "" });
  const [ut, setUt] = useState<{ kind: UtilityKind; amount: string; paidBy: string }>({
    kind: "wifi",
    amount: "",
    paidBy: "",
  });
  const addBazar = () => {
    const p = parseTaka(bz.amount);
    const by = bz.by || active[0]?.id;
    if (!p || !by) return flash(T("টাকার অঙ্ক আর কে দিলেন লিখুন", "Enter the amount and who paid"));
    setSt((s) => ({
      ...s,
      bazar: [...s.bazar, { id: uid(), date: editDay, by, amountPoisha: p, note: bz.note.trim().slice(0, 80) }],
    }));
    setBz({ by, amount: "", note: "" });
  };
  const addDeposit = () => {
    const p = parseTaka(dep.amount);
    const by = dep.by || active[0]?.id;
    if (!p || !by) return flash(T("টাকার অঙ্ক আর কে জমা দিলেন লিখুন", "Enter the amount and who deposited"));
    setSt((s) => ({
      ...s,
      deposits: [...s.deposits, { id: uid(), date: editDay, by, amountPoisha: p }],
    }));
    setDep({ by, amount: "" });
  };
  const addUtility = () => {
    const p = parseTaka(ut.amount);
    if (!p) return flash(T("বিলের টাকা লিখুন", "Enter the bill amount"));
    setSt((s) => ({
      ...s,
      utilities: [...s.utilities, { id: uid(), kind: ut.kind, amountPoisha: p, paidBy: ut.paidBy || null, note: "" }],
    }));
    setUt({ ...ut, amount: "" });
  };

  const result = useMemo(() => settle(st), [st]);
  const check = settlementCheck(result);
  const sheet = settlementText(result, lang);
  const duty = today ? dutyFor(st, today >= st.cycleStart && today <= end ? today : editDay) : null;
  const overdue = !!today && today > end;
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(sheet);
      flash(T("হিসাব কপি হয়েছে — মেস গ্রুপে পাঠান", "Copied — paste it in the mess group"));
    } catch {
      flash(T("কপি করা যায়নি — ডাউনলোড ব্যবহার করুন", "Could not copy — use download"));
    }
  };
  const doClose = () => {
    if (
      !window.confirm(
        T(
          `${N(st.cycleStart)} থেকে ${N(end)}-এর হিসাব বন্ধ করবেন? শিট ইতিহাসে থাকবে, নতুন মাস খালি খাতায় শুরু হবে।`,
          `Close ${st.cycleStart} to ${end}? The sheet stays in history and the next cycle starts on an empty book.`
        )
      )
    )
      return;
    setSt((s) => closeCycle(s, today || end, lang));
    setDay("");
    flash(T("মাসের হিসাব বন্ধ হয়েছে", "Cycle closed"));
  };

  const mealFor = (date: string, member: string) => st.meals.find((m) => m.date === date && m.member === member);
  const cycleBazar = st.bazar.filter((b) => b.date >= st.cycleStart && b.date <= end);
  const cycleDeposits = st.deposits.filter((d) => d.date >= st.cycleStart && d.date <= end);

  return (
    <section aria-labelledby="mess-h" data-testid="mess-ledger" className="min-w-0 space-y-6">
      {/* Top Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 id="mess-h" className="flex items-center gap-2 text-[22px] font-extrabold text-slate-900">
            <Users size={24} className="text-emerald-700" aria-hidden />{" "}
            {T("মেস ও ফ্ল্যাটের সম্পূর্ণ ব্যবস্থা", "Mess & Shared Flat Hub")}
          </h2>
          <p className="mt-1 max-w-3xl text-[14.5px] leading-relaxed text-slate-700">
            {T(
              "প্রতিদিনের মিল ও বাজারের হিসাব, ঢাকা ও অন্যান্য শহরের মেস/ফ্ল্যাট ডিরেক্টরি, নিজের বাসা বা সিট পোস্ট করার সুবিধা, ন্যায্য রুম ভাড়া বণ্টন এবং চুক্তিপত্রের খসড়া — সব এক জায়গায়। তথ্য থাকে শুধু আপনার ফোনে।",
              "Daily meal and bazar ledger, nationwide mess/flat directory, community to-let posting, fair room rent splitter, and tenancy agreements — all in one place on your phone."
            )}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setLang(bn ? "en" : "bn")}
          className="kp-chip !h-11 !rounded-full !text-[12px] font-semibold !min-w-[44px]"
          aria-label={bn ? "Switch to English" : "বাংলায় দেখুন"}
        >
          {bn ? "EN" : "বাং"}
        </button>
      </div>

      {/* Sub-Navigation Tabs */}
      <nav aria-label="মেস ও ফ্ল্যাটের বিভাগসমূহ" className="flex overflow-x-auto gap-2 pb-1 [scrollbar-width:none]">
        <button
          type="button"
          onClick={() => setSubTab("ledger")}
          className={`inline-flex min-h-[44px] shrink-0 items-center gap-2 rounded-xl px-4 text-[14.5px] font-bold transition-all ${
            subTab === "ledger"
              ? "bg-emerald-800 text-white shadow-sm"
              : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
          } min-w-[44px]`}
        >
          <UtensilsCrossed size={17} />
          <span>{T("১. মিলের খাতা ও মেস হিসাব", "1. Meal & Bazar Ledger")}</span>
        </button>

        <button
          type="button"
          onClick={() => setSubTab("directory")}
          className={`inline-flex min-h-[44px] shrink-0 items-center gap-2 rounded-xl px-4 text-[14.5px] font-bold transition-all ${
            subTab === "directory"
              ? "bg-emerald-800 text-white shadow-sm"
              : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
          } min-w-[44px]`}
        >
          <Building2 size={17} />
          <span>{T("২. মেস ও ফ্ল্যাট ডিরেক্টরি", "2. Mess & Flat Directory")}</span>
        </button>

        <button
          type="button"
          onClick={() => setSubTab("post")}
          className={`inline-flex min-h-[44px] shrink-0 items-center gap-2 rounded-xl px-4 text-[14.5px] font-bold transition-all ${
            subTab === "post"
              ? "bg-emerald-800 text-white shadow-sm"
              : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
          } min-w-[44px]`}
        >
          <Plus size={17} />
          <span>{T("৩. বাসা/সিট পোস্ট করুন", "3. Post To-Let")}</span>
        </button>

        <button
          type="button"
          onClick={() => setSubTab("calculator")}
          className={`inline-flex min-h-[44px] shrink-0 items-center gap-2 rounded-xl px-4 text-[14.5px] font-bold transition-all ${
            subTab === "calculator"
              ? "bg-emerald-800 text-white shadow-sm"
              : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
          } min-w-[44px]`}
        >
          <Calculator size={17} />
          <span>{T("৪. বাজেট ও রুম ভাগ", "4. Budget & Room Split")}</span>
        </button>

        <button
          type="button"
          onClick={() => setSubTab("agreement")}
          className={`inline-flex min-h-[44px] shrink-0 items-center gap-2 rounded-xl px-4 text-[14.5px] font-bold transition-all ${
            subTab === "agreement"
              ? "bg-emerald-800 text-white shadow-sm"
              : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
          } min-w-[44px]`}
        >
          <FileText size={17} />
          <span>{T("৫. চুক্তিপত্রের খসড়া", "5. Tenancy Agreement")}</span>
        </button>
      </nav>

      {/* SUB-TAB 2: DIRECTORY */}
      {subTab === "directory" && (
        <FlatMessDirectory
          userListings={userListings}
          onAddUserListing={handleAddUserListing}
          onDeleteUserListing={handleDeleteUserListing}
          onSelectForCalculator={handleSelectForCalculator}
          onSelectForAgreement={handleSelectForAgreement}
          onOpenPostTab={() => setSubTab("post")}
        />
      )}

      {/* SUB-TAB 3: POST FORM */}
      {subTab === "post" && (
        <FlatPostForm
          onAddListing={handleAddUserListing}
          onDone={() => setSubTab("directory")}
        />
      )}

      {/* SUB-TAB 4: BUDGET & ROOM SPLIT CALCULATOR */}
      {subTab === "calculator" && (
        <FlatRentCalculator
          initialRentPoisha={calcParams.rentPoisha}
          initialAdvancePoisha={calcParams.advancePoisha}
          initialTitle={calcParams.title}
        />
      )}

      {/* SUB-TAB 5: TENANCY AGREEMENT */}
      {subTab === "agreement" && (
        <FlatAgreementView initialListing={agreementListing} />
      )}

      {/* SUB-TAB 1: DAILY MEAL & BAZAR LEDGER */}
      {subTab === "ledger" && (
        <div className="space-y-4">
          {/* Cycle + setup */}
          <div className={card}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="flex items-center gap-1.5 text-[15px] font-bold text-slate-900">
                <CalendarDays size={17} aria-hidden /> {T("এই মাসের হিসাব", "This cycle")}:{" "}
                <span className="font-mono">
                  {N(st.cycleStart)} → {N(end)}
                </span>
              </p>
              <label className="flex items-center gap-2 text-[14px] text-slate-700">
                {T("হিসাব শুরু প্রতি মাসের", "Starts each month on day")}
                <select
                  value={st.closeDay}
                  onChange={(e) => {
                    const cd = Number(e.target.value);
                    setSt((s) => ({
                      ...s,
                      closeDay: cd,
                      cycleStart: cycleFor(today || s.cycleStart, cd).start,
                    }));
                    setDay("");
                  }}
                  className={`${field} !min-h-[38px] min-h-[44px]`}
                  aria-label={T("হিসাব শুরুর তারিখ", "Cycle start day")}
                >
                  {Array.from({ length: 28 }, (_, i) => i + 1).map((d) => (
                    <option key={d} value={d}>
                      {N(d)}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            {overdue && (
              <p role="alert" className="rounded-xl bg-amber-50 px-3 py-2 text-[14px] font-semibold text-amber-900">
                {T(
                  `এই মাসের হিসাব ${N(end)}-এ শেষ হয়েছে। নিচে হিসাব দেখে "মাস বন্ধ করুন" চাপুন।`,
                  `This cycle ended on ${end}. Check the sheet below, then close the cycle.`
                )}
              </p>
            )}

            <div className="flex flex-wrap gap-2">
              <label className="sr-only" htmlFor="mess-name">
                {T("সদস্যের নাম", "Member name")}
              </label>
              <input
                id="mess-name"
                value={newName}
                maxLength={40}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addMember()}
                placeholder={T("সদস্যের নাম, যেমন রাকিব", "Member name, e.g. Rakib")}
                className={`${field} min-w-0 flex-1 min-h-[44px]`}
              />
              <button
                type="button"
                data-testid="mess-add-member"
                onClick={addMember}
                disabled={!newName.trim() || st.members.length >= MAX_MEMBERS}
                className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl bg-slate-900 px-4 text-[15px] font-bold text-white disabled:opacity-50 min-w-[44px]"
              >
                <UserPlus size={17} aria-hidden /> {T("যোগ করুন", "Add")}
              </button>
            </div>
            {st.members.length > 0 && (
              <ul className="flex flex-wrap gap-2">
                {st.members.map((m) => (
                  <li
                    key={m.id}
                    className={`flex items-center gap-1 rounded-full border px-3 py-1 text-[14px] ${
                      m.active ? "border-emerald-300 bg-emerald-50 text-emerald-950" : "border-slate-200 bg-slate-50 text-slate-500"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() =>
                        setSt((s) => ({
                          ...s,
                          members: s.members.map((x) => (x.id === m.id ? { ...x, active: !x.active } : x)),
                        }))
                      }
                      title={T("এই মাসে আছেন / নেই", "In the mess this month / away")}
                      className="font-semibold min-h-[44px] min-w-[44px]"
                    >
                      {m.name}
                      {!m.active && ` · ${T("নেই", "away")}`}
                    </button>
                    <button
                      type="button"
                      onClick={() => removeMember(m.id)}
                      aria-label={T(`${m.name} মুছুন`, `Remove ${m.name}`)}
                      className="grid h-11 w-11 place-items-center rounded-full text-slate-500 hover:text-red-700"
                    >
                      <Trash2 size={14} aria-hidden />
                    </button>
                  </li>
                ))}
              </ul>
            )}

            <fieldset className="flex flex-wrap items-center gap-3 text-[14px]">
              <legend className="sr-only">{T("মিল রেট", "Meal rate")}</legend>
              <label className="flex items-center gap-2 min-h-[44px]">
                <input
                  type="radio"
                  name="mess-mode"
                  checked={st.mealMode === "calculated"}
                  onChange={() => setSt((s) => ({ ...s, mealMode: "calculated" }))}
                  className="h-5 w-5"
                />{" "}
                {T("মোট বাজার ÷ মোট মিল", "Bazar ÷ meals")}
              </label>
              <label className="flex items-center gap-2 min-h-[44px]">
                <input
                  type="radio"
                  name="mess-mode"
                  checked={st.mealMode === "fixed"}
                  onChange={() => setSt((s) => ({ ...s, mealMode: "fixed" }))}
                  className="h-5 w-5"
                />{" "}
                {T("নির্দিষ্ট মিল রেট", "Fixed meal rate")}
              </label>
              {st.mealMode === "fixed" && (
                <label className="flex items-center gap-2">
                  ৳
                  <input
                    inputMode="decimal"
                    defaultValue={st.fixedRatePoisha ? String(st.fixedRatePoisha / 100) : ""}
                    onBlur={(e) =>
                      setSt((s) => ({ ...s, fixedRatePoisha: parseTaka(e.target.value) ?? 0 }))
                    }
                    aria-label={T("প্রতি মিলের রেট (টাকা)", "Rate per meal (taka)")}
                    className={`${field} !min-h-[38px] w-28 min-h-[44px]`}
                    placeholder={T("প্রতি মিল", "per meal")}
                  />
                </label>
              )}
            </fieldset>
          </div>

          {st.members.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-slate-300 bg-white p-5 text-[15px] text-slate-600">
              {T("শুরু করতে মেসের সদস্যদের নাম যোগ করুন।", "Add the mess members to start.")}
            </p>
          ) : (
            <>
              {/* Duty + day editor */}
              <div className={card}>
                {duty && (
                  <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-amber-50 px-3 py-2">
                    <p className="flex items-center gap-1.5 text-[15px] font-semibold text-amber-950">
                      <ShoppingBasket size={17} aria-hidden /> {T("আজকের বাজার কার", "Bazar duty today")}:{" "}
                      <strong data-testid="mess-duty">{duty.name}</strong>
                    </p>
                    <button
                      type="button"
                      onClick={() => setSt((s) => ({ ...s, rotaOffset: (s.rotaOffset + 1) % 1000 }))}
                      className="rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-[13px] font-semibold text-amber-900 min-h-[44px] min-w-[44px]"
                    >
                      {T("পরের জনকে দিন", "Pass to next")}
                    </button>
                  </div>
                )}
                <div className="flex flex-wrap items-center gap-2">
                  <label htmlFor="mess-day" className="text-[14px] font-semibold text-slate-800">
                    {T("তারিখ", "Date")}
                  </label>
                  <input
                    id="mess-day"
                    type="date"
                    value={editDay}
                    min={st.cycleStart}
                    max={end}
                    onChange={(e) => setDay(e.target.value)}
                    className={field}
                  />
                </div>
                <div className="space-y-2">
                  {active.map((m) => {
                    const row = mealFor(editDay, m.id);
                    return (
                      <div
                        key={m.id}
                        className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-100 p-2"
                      >
                        <span className="min-w-[90px] flex-1 text-[15px] font-semibold text-slate-900">
                          {m.name}
                        </span>
                        {SLOTS.map((sl) => (
                          <label key={sl.id} className="flex items-center gap-1 text-[13px] text-slate-600">
                            {bn ? sl.bn : sl.en}
                            <select
                              value={row?.slots[sl.id] ?? 0}
                              onChange={(e) =>
                                setSt((s) => ({
                                  ...s,
                                  meals: setMeal(
                                    s.meals,
                                    editDay,
                                    m.id,
                                    sl.id as MealSlot,
                                    Number(e.target.value)
                                  ),
                                }))
                              }
                              className="min-h-[40px] rounded-lg border border-slate-300 bg-white px-1.5 text-[15px] min-h-[44px]"
                              aria-label={`${m.name} ${bn ? sl.bn : sl.en}`}
                            >
                              {HALF_OPTIONS.map((h) => (
                                <option key={h} value={h}>
                                  {mealsText(h, bn)}
                                </option>
                              ))}
                            </select>
                          </label>
                        ))}
                        <label className="flex items-center gap-1 text-[13px] text-slate-600">
                          {T("অতিথি", "Guests")}
                          <select
                            value={row?.guests ?? 0}
                            onChange={(e) =>
                              setSt((s) => ({
                                ...s,
                                meals: setGuests(s.meals, editDay, m.id, Number(e.target.value)),
                              }))
                            }
                            className="min-h-[40px] rounded-lg border border-slate-300 bg-white px-1.5 text-[15px] min-h-[44px]"
                            aria-label={T(`${m.name}-এর অতিথি মিল`, `${m.name}'s guest meals`)}
                          >
                            {Array.from({ length: 21 }, (_, h) => h).map((h) => (
                              <option key={h} value={h}>
                                {mealsText(h, bn)}
                              </option>
                            ))}
                          </select>
                        </label>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Meal grid */}
              <div className={card}>
                <h3 className="text-[16px] font-bold text-slate-900">
                  {T("মিলের ছক", "Meal grid")}{" "}
                  <span className="text-[13px] font-normal text-slate-500">
                    {T("(ঘরে চাপ দিলে সেই দিন খুলবে)", "(tap a cell to open that day)")}
                  </span>
                </h3>
                <div
                  className="max-w-full overflow-x-auto overscroll-x-contain rounded-xl border border-slate-200"
                  data-testid="mess-grid"
                >
                  <table className="border-collapse text-[13px]">
                    <thead>
                      <tr className="bg-slate-50">
                        <th
                          scope="col"
                          className="sticky left-0 z-10 min-w-[96px] bg-slate-50 px-2 py-2 text-left font-semibold text-slate-700"
                        >
                          {T("সদস্য", "Member")}
                        </th>
                        {days.map((d) => (
                          <th
                            key={d}
                            scope="col"
                            className={`min-w-[34px] px-1 py-2 text-center font-mono font-semibold ${
                              d === editDay ? "bg-emerald-100 text-emerald-900" : "text-slate-600"
                            }`}
                          >
                            {N(Number(d.slice(8)))}
                          </th>
                        ))}
                        <th
                          scope="col"
                          className="min-w-[48px] px-2 py-2 text-center font-semibold text-slate-700"
                        >
                          {T("মোট", "Total")}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {st.members.map((m) => {
                        const line = result.lines.find((l) => l.id === m.id);
                        return (
                          <tr key={m.id} className="border-t border-slate-100">
                            <th
                              scope="row"
                              className="sticky left-0 z-10 max-w-[120px] truncate bg-white px-2 py-1.5 text-left font-semibold text-slate-900"
                            >
                              {m.name}
                            </th>
                            {days.map((d) => {
                              const r = mealFor(d, m.id);
                              const h = r ? dayHalfUnits(r) : 0;
                              return (
                                <td key={d} className="p-0 text-center">
                                  <button
                                    type="button"
                                    onClick={() => setDay(d)}
                                    className={`h-11 w-full min-w-[34px] font-mono ${
                                      d === editDay ? "bg-emerald-50" : ""
                                    } ${h ? "text-slate-900" : "text-slate-300"}`}
                                    aria-label={`${m.name} ${d}: ${mealsText(h, bn)}`}
                                  >
                                    {h ? mealsText(h, bn) : "·"}
                                  </button>
                                </td>
                              );
                            })}
                            <td className="px-2 text-center font-mono font-bold">
                              {mealsText(line?.mealHalfUnits ?? 0, bn)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Bazar, deposits, bills */}
              <div className="grid gap-4 lg:grid-cols-3">
                <div className={card}>
                  <h3 className="flex items-center gap-1.5 text-[16px] font-bold">
                    <ShoppingBasket size={17} aria-hidden /> {T("বাজার", "Bazar")}{" "}
                    <span className="text-[13px] font-normal text-slate-500">· {N(editDay)}</span>
                  </h3>
                  <select
                    value={bz.by}
                    onChange={(e) => setBz({ ...bz, by: e.target.value })}
                    className={`${field} w-full min-h-[44px]`}
                    aria-label={T("কে বাজার করলেন", "Who paid")}
                  >
                    {active.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                  <div className="flex gap-2">
                    <input
                      inputMode="decimal"
                      value={bz.amount}
                      onChange={(e) => setBz({ ...bz, amount: e.target.value })}
                      placeholder={T("টাকা", "Taka")}
                      aria-label={T("বাজারের টাকা", "Bazar amount")}
                      className={`${field} w-28 min-h-[44px]`}
                    />
                    <input
                      value={bz.note}
                      maxLength={80}
                      onChange={(e) => setBz({ ...bz, note: e.target.value })}
                      placeholder={T("কী কিনলেন", "What")}
                      aria-label={T("নোট", "Note")}
                      className={`${field} min-w-0 flex-1 min-h-[44px]`}
                    />
                  </div>
                  <button
                    type="button"
                    data-testid="mess-add-bazar"
                    onClick={addBazar}
                    className="inline-flex min-h-[44px] w-full items-center justify-center gap-1.5 rounded-xl bg-emerald-700 px-4 text-[15px] font-bold text-white"
                  >
                    <Plus size={17} aria-hidden /> {T("বাজার যোগ করুন", "Add bazar")}
                  </button>
                  <ul className="max-h-48 space-y-1 overflow-y-auto text-[14px]">
                    {[...cycleBazar].reverse().map((b) => (
                      <li
                        key={b.id}
                        className="flex items-center justify-between gap-2 rounded-lg bg-slate-50 px-2 py-1"
                      >
                        <span className="min-w-0 truncate">
                          {N(b.date.slice(5))} · {nameOf(b.by)}
                          {b.note && ` · ${b.note}`}
                        </span>
                        <span className="flex shrink-0 items-center gap-1 font-mono">
                          {tk(b.amountPoisha)}
                          <button
                            type="button"
                            onClick={() =>
                              setSt((s) => ({ ...s, bazar: s.bazar.filter((x) => x.id !== b.id) }))
                            }
                            aria-label={T("মুছুন", "Delete")}
                            className="text-slate-500 hover:text-red-700 min-h-[44px] min-w-[44px]"
                          >
                            <Trash2 size={14} />
                          </button>
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className={card}>
                  <h3 className="flex items-center gap-1.5 text-[16px] font-bold">
                    <Wallet size={17} aria-hidden /> {T("ম্যানেজারের কাছে জমা", "Deposit to manager")}
                  </h3>
                  <select
                    value={dep.by}
                    onChange={(e) => setDep({ ...dep, by: e.target.value })}
                    className={`${field} w-full min-h-[44px]`}
                    aria-label={T("কে জমা দিলেন", "Who deposited")}
                  >
                    {active.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                  <input
                    inputMode="decimal"
                    value={dep.amount}
                    onChange={(e) => setDep({ ...dep, amount: e.target.value })}
                    placeholder={T("টাকা", "Taka")}
                    aria-label={T("জমার টাকা", "Deposit amount")}
                    className={`${field} w-full min-h-[44px]`}
                  />
                  <button
                    type="button"
                    onClick={addDeposit}
                    className="inline-flex min-h-[44px] w-full items-center justify-center gap-1.5 rounded-xl bg-slate-900 px-4 text-[15px] font-bold text-white"
                  >
                    <Plus size={17} aria-hidden /> {T("জমা যোগ করুন", "Add deposit")}
                  </button>
                  <ul className="max-h-40 space-y-1 overflow-y-auto text-[14px]">
                    {[...cycleDeposits].reverse().map((d) => (
                      <li
                        key={d.id}
                        className="flex items-center justify-between gap-2 rounded-lg bg-slate-50 px-2 py-1"
                      >
                        <span className="min-w-0 truncate">
                          {N(d.date.slice(5))} · {nameOf(d.by)}
                        </span>
                        <span className="flex shrink-0 items-center gap-1 font-mono">
                          {tk(d.amountPoisha)}
                          <button
                            type="button"
                            onClick={() =>
                              setSt((s) => ({ ...s, deposits: s.deposits.filter((x) => x.id !== d.id) }))
                            }
                            aria-label={T("মুছুন", "Delete")}
                            className="text-slate-500 hover:text-red-700 min-h-[44px] min-w-[44px]"
                          >
                            <Trash2 size={14} />
                          </button>
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className={card}>
                  <h3 className="text-[16px] font-bold">{T("সমান ভাগের বিল", "Shared bills (split equally)")}</h3>
                  <div className="flex gap-2">
                    <select
                      value={ut.kind}
                      onChange={(e) => setUt({ ...ut, kind: e.target.value as UtilityKind })}
                      className={`${field} min-w-0 flex-1 min-h-[44px]`}
                      aria-label={T("বিলের ধরন", "Bill type")}
                    >
                      {UTILITY_KINDS.map((k) => (
                        <option key={k.id} value={k.id}>
                          {bn ? k.bn : k.en}
                        </option>
                      ))}
                    </select>
                    <input
                      inputMode="decimal"
                      value={ut.amount}
                      onChange={(e) => setUt({ ...ut, amount: e.target.value })}
                      placeholder={T("টাকা", "Taka")}
                      aria-label={T("বিলের টাকা", "Bill amount")}
                      className={`${field} w-24 min-h-[44px]`}
                    />
                  </div>
                  <select
                    value={ut.paidBy}
                    onChange={(e) => setUt({ ...ut, paidBy: e.target.value })}
                    className={`${field} w-full min-h-[44px]`}
                    aria-label={T("কে বিল দিলেন", "Paid by")}
                  >
                    <option value="">{T("ম্যানেজারের ক্যাশ বক্স থেকে", "From the manager's cash box")}</option>
                    {active.map((m) => (
                      <option key={m.id} value={m.id}>
                        {T(`${m.name} নিজে দিয়েছেন`, `${m.name} paid`)}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={addUtility}
                    className="inline-flex min-h-[44px] w-full items-center justify-center gap-1.5 rounded-xl bg-slate-900 px-4 text-[15px] font-bold text-white"
                  >
                    <Plus size={17} aria-hidden /> {T("বিল যোগ করুন", "Add bill")}
                  </button>
                  <ul className="space-y-1 text-[14px]">
                    {st.utilities.map((u) => (
                      <li
                        key={u.id}
                        className="flex items-center justify-between gap-2 rounded-lg bg-slate-50 px-2 py-1"
                      >
                        <span className="min-w-0 truncate">
                          {bn
                            ? UTILITY_KINDS.find((k) => k.id === u.kind)?.bn
                            : UTILITY_KINDS.find((k) => k.id === u.kind)?.en}{" "}
                          · {nameOf(u.paidBy)}
                        </span>
                        <span className="flex shrink-0 items-center gap-1 font-mono">
                          {tk(u.amountPoisha)}
                          <button
                            type="button"
                            onClick={() =>
                              setSt((s) => ({
                                ...s,
                                utilities: s.utilities.filter((x) => x.id !== u.id),
                              }))
                            }
                            aria-label={T("মুছুন", "Delete")}
                            className="text-slate-500 hover:text-red-700 min-h-[44px] min-w-[44px]"
                          >
                            <Trash2 size={14} />
                          </button>
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Settlement */}
              <div className={card} data-testid="mess-settlement">
                <h3 className="text-[17px] font-bold text-slate-900">
                  {T("মাস শেষের হিসাব", "Month-end settlement")}
                </h3>
                <div className="grid grid-cols-2 gap-2 text-[14px] sm:grid-cols-4">
                  <p className="rounded-xl bg-slate-50 p-2">
                    {T("মোট বাজার", "Bazar")}
                    <br />
                    <strong className="font-mono text-[16px]">{tk(result.bazarPoisha)}</strong>
                  </p>
                  <p className="rounded-xl bg-slate-50 p-2">
                    {T("মোট মিল", "Meals")}
                    <br />
                    <strong className="font-mono text-[16px]">{mealsText(result.totalMealHalfUnits, bn)}</strong>
                  </p>
                  <p className="rounded-xl bg-slate-50 p-2">
                    {T("মিল রেট", "Meal rate")}
                    <br />
                    <strong className="font-mono text-[16px]" data-testid="mess-rate">
                      {tk(result.mealRatePoisha)}
                    </strong>
                  </p>
                  <p className="rounded-xl bg-slate-50 p-2">
                    {T("ম্যানেজারের কাছে নগদ", "Cash with manager")}
                    <br />
                    <strong className="font-mono text-[16px]">{tk(result.cashOnHandPoisha)}</strong>
                  </p>
                </div>
                <div className="max-w-full overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full min-w-[520px] border-collapse text-[14px]">
                    <thead>
                      <tr className="bg-slate-50 text-left text-slate-700">
                        <th scope="col" className="sticky left-0 bg-slate-50 px-2 py-2">
                          {T("সদস্য", "Member")}
                        </th>
                        <th scope="col" className="px-2 py-2 text-right">
                          {T("মিল", "Meals")}
                        </th>
                        <th scope="col" className="px-2 py-2 text-right">
                          {T("মিল খরচ", "Meal cost")}
                        </th>
                        <th scope="col" className="px-2 py-2 text-right">
                          {T("বিলের ভাগ", "Bills")}
                        </th>
                        <th scope="col" className="px-2 py-2 text-right">
                          {T("দিয়েছেন", "Paid")}
                        </th>
                        <th scope="col" className="px-2 py-2 text-right">
                          {T("ফল", "Result")}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.lines.map((l) => (
                        <tr key={l.id} className="border-t border-slate-100" data-member={l.id}>
                          <th scope="row" className="sticky left-0 bg-white px-2 py-1.5 text-left font-semibold">
                            {l.name}
                          </th>
                          <td className="px-2 text-right font-mono">{mealsText(l.mealHalfUnits, bn)}</td>
                          <td className="px-2 text-right font-mono">{tk(l.mealCostPoisha)}</td>
                          <td className="px-2 text-right font-mono">{tk(l.utilityPoisha)}</td>
                          <td className="px-2 text-right font-mono">{tk(l.paidPoisha)}</td>
                          <td
                            className={`px-2 text-right font-mono font-bold ${
                              l.balancePoisha > 0
                                ? "text-emerald-800"
                                : l.balancePoisha < 0
                                ? "text-red-700"
                                : "text-slate-600"
                            }`}
                            data-balance={l.balancePoisha}
                          >
                            {l.balancePoisha > 0
                              ? `${T("ফেরত", "gets")} ${tk(l.balancePoisha)}`
                              : l.balancePoisha < 0
                              ? `${T("দেবেন", "pays")} ${tk(-l.balancePoisha)}`
                              : T("সমান", "even")}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p
                  data-testid="mess-check"
                  data-ok={check === 0 ? "true" : "false"}
                  className={`text-[13px] ${check === 0 ? "text-emerald-800" : "font-bold text-red-700"}`}
                >
                  {check === 0
                    ? T(
                        `✓ হিসাব মিলেছে: সবার ফল যোগ করলে ম্যানেজারের নগদের সমান${
                          result.fixedGapPoisha ? ", নির্দিষ্ট রেটের উদ্বৃত্ত বাদে" : ""
                        }।`,
                        `✓ Reconciled: the results add up to the manager's cash${
                          result.fixedGapPoisha ? ", less the fixed-rate surplus" : ""
                        }.`
                      )
                    : T("হিসাব মেলেনি — দয়া করে জানান।", "Does not reconcile — please report this.")}
                  {result.fixedGapPoisha !== 0 &&
                    ` ${T("নির্দিষ্ট রেটে উদ্বৃত্ত", "Fixed-rate surplus")}: ${tk(result.fixedGapPoisha)}`}
                </p>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={copy}
                    className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-4 text-[15px] min-w-[44px]"
                  >
                    <ClipboardCopy size={17} aria-hidden /> {T("হিসাব কপি করুন", "Copy sheet")}
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      downloadText(`mess-${st.cycleStart}.txt`, sheet, "text/plain;charset=utf-8")
                    }
                    className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-4 text-[15px] min-w-[44px]"
                  >
                    <Download size={17} aria-hidden /> {T("ডাউনলোড", "Download")}
                  </button>
                  <button
                    type="button"
                    data-testid="mess-close"
                    onClick={doClose}
                    className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl bg-slate-900 px-4 text-[15px] font-bold text-white min-w-[44px]"
                  >
                    <Lock size={17} aria-hidden /> {T("মাস বন্ধ করুন", "Close cycle")}
                  </button>
                </div>
              </div>
            </>
          )}

          {msg && (
            <p role="status" className="text-[14px] font-semibold text-emerald-800">
              {msg}
            </p>
          )}

          {st.history.length > 0 && (
            <details className={card}>
              <summary className="cursor-pointer text-[15px] font-bold min-h-[44px] min-w-[44px]">
                {T(`আগের মাসগুলো (${N(st.history.length)})`, `Earlier cycles (${st.history.length})`)}
              </summary>
              <ul className="space-y-2">
                {st.history.map((h) => (
                  <li key={`${h.start}-${h.closedOn}`} className="rounded-xl bg-slate-50 p-3">
                    <p className="text-[14px] font-semibold">
                      {N(h.start)} → {N(h.end)} · {T("মিল রেট", "meal rate")} {tk(h.mealRatePoisha)}
                    </p>
                    <pre className="mt-1 max-h-48 overflow-auto whitespace-pre-wrap text-[12.5px] leading-relaxed text-slate-700">
                      {h.sheet}
                    </pre>
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}
    </section>
  );
}
