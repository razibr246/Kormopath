"use client";
import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ClipboardCopy,
  HandCoins,
  MessageSquareText,
  Plus,
  Trash2,
  X,
  Mic,
  MicOff,
  CalendarPlus,
  Search,
  Filter,
  Sparkles,
  BookOpen,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Send,
  ExternalLink,
} from "lucide-react";
import { usePersistentState, storageKey, downloadText } from "@/lib/clientStore";
import {
  MAX_DHAR_ENTRIES,
  addSettlement,
  dharTotals,
  formatTaka,
  perPerson,
  remainingPoisha,
  sanitizeDhar,
  settledPoisha,
  settlementSlip,
  smsHref,
  takaToPoisha,
  todayDhaka,
  validateEntry,
  whatsappHref,
  generateReminderMessage,
  parseDharVoiceText,
  exportDharToIcs,
  DHAR_CATEGORIES,
  PAYMENT_METHODS,
  KARZ_HASANA_ETHICS,
  type DharDirection,
  type DharCategory,
  type PaymentMethod,
  type ReminderTone,
  type DharEntry,
  type NewEntryInput,
} from "@/lib/dhar";

const bnNum = (v: number | string) => String(v).replace(/\d/g, (d) => "০১২৩৪৫৬৭৮৯"[Number(d)]);
const uid = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
const EMPTY = (today: string): NewEntryInput => ({
  direction: "receivable",
  counterparty: "",
  phone: "",
  amount: "",
  date: today,
  due: "",
  note: "",
  category: "personal",
});
const input = "mt-1 w-full min-h-[44px] rounded-xl border border-slate-300 px-3 py-2 text-[15px]";

export function DharLedger() {
  const [lang, setLang] = useState<"bn" | "en">("bn");
  const bn = lang === "bn";
  const T = (b: string, e: string) => (bn ? b : e);

  const [entries, setEntries] = usePersistentState<DharEntry[]>(storageKey("shohoj", "dhar"), [], sanitizeDhar);
  const [today, setToday] = useState("");
  useEffect(() => {
    setToday(todayDhaka());
  }, []);

  const [form, setForm] = useState<NewEntryInput>(EMPTY(""));
  useEffect(() => {
    if (today && !form.date) setForm((f) => ({ ...f, date: today }));
  }, [today, form.date]);

  const [review, setReview] = useState<Omit<DharEntry, "id" | "createdAt"> | null>(null);
  const [errors, setErrors] = useState<string[]>([]);

  // Settlement Form State
  const [payFor, setPayFor] = useState<string | null>(null);
  const [payAmount, setPayAmount] = useState("");
  const [payNote, setPayNote] = useState("");
  const [payMethod, setPayMethod] = useState<PaymentMethod>("cash");
  const [payTxnId, setPayTxnId] = useState("");
  const [payErr, setPayErr] = useState("");

  // Reminder Modal State
  const [reminderEntry, setReminderEntry] = useState<DharEntry | null>(null);
  const [reminderTone, setReminderTone] = useState<ReminderTone>("friendly");

  // Statement Slip State
  const [slipFor, setSlipFor] = useState<string | null>(null);
  const [msg, setMsg] = useState("");
  const [showSettled, setShowSettled] = useState(false);
  const [showEthics, setShowEthics] = useState(false);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<DharCategory | "all">("all");
  const [directionFilter, setDirectionFilter] = useState<"all" | "receivable" | "payable" | "overdue">("all");
  const [sortBy, setSortBy] = useState<"date_desc" | "amount_desc" | "due_asc">("date_desc");

  // Voice Input State
  const [isListening, setIsListening] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState("");

  const money = (p: number) => formatTaka(p, bn);
  const totals = useMemo(() => dharTotals(entries, today || "9999-12-31"), [entries, today]);
  const people = useMemo(() => perPerson(entries), [entries]);

  const flash = (m: string) => {
    setMsg(m);
    window.setTimeout(() => setMsg(""), 2500);
  };

  const set = <K extends keyof NewEntryInput>(k: K, v: NewEntryInput[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const ERR: Record<string, [string, string]> = {
    name: ["নাম লিখুন (৬০ অক্ষরের মধ্যে)", "Enter a name (up to 60 characters)"],
    phone: ["ফোন নম্বর ঠিক নেই (০১XXXXXXXXX)", "Phone number is not valid (01XXXXXXXXX)"],
    amount: ["টাকার পরিমাণ ঠিক নেই", "Amount is not valid"],
    date: ["তারিখ ঠিক নেই", "Date is not valid"],
    due: ["শেষ তারিখ শুরুর তারিখের আগে হতে পারে না", "Due date cannot be before the start date"],
  };

  const startReview = () => {
    const v = validateEntry(form);
    if (!v.ok) {
      setErrors(v.errors);
      setReview(null);
      return;
    }
    if (entries.length >= MAX_DHAR_ENTRIES) {
      setErrors([]);
      flash(T("খাতা ভরে গেছে — মিটে যাওয়া হিসাব মুছে জায়গা করুন", "The book is full — delete settled entries first"));
      return;
    }
    setErrors([]);
    setReview(v.entry);
  };

  const save = () => {
    if (!review) return;
    setEntries([{ ...review, id: uid(), createdAt: Date.now() }, ...entries]);
    setReview(null);
    setForm(EMPTY(today));
    flash(T("হিসাব এই ফোনে সংরক্ষিত হয়েছে", "Saved on this phone"));
  };

  // Voice input recognition handler
  const handleVoiceInput = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert(T("আপনার ব্রাউজারে স্পিচ রিকগনিশন সাপোর্ট নেই। গুগল ক্রোম বা এজ ব্যবহার করুন।", "Speech recognition not supported in this browser."));
      return;
    }

    if (isListening) {
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = "bn-BD";
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setIsListening(true);
        setVoiceTranscript("");
      };

      recognition.onresult = (event: any) => {
        const text = event.results[0][0].transcript;
        setVoiceTranscript(text);
        const parsed = parseDharVoiceText(text, today);
        if (parsed.ok) {
          setForm((prev) => ({
            ...prev,
            direction: parsed.entry.direction,
            counterparty: parsed.entry.counterparty,
            amount: parsed.entry.amount,
            category: parsed.entry.category,
            note: parsed.entry.note,
          }));
          flash(T("ভয়েস থেকে হিসাব পূরণ হয়েছে — দেখে নিশ্চিত করুন", "Parsed from voice — please check and confirm"));
        } else {
          flash(parsed.reason);
        }
      };

      recognition.onerror = () => {
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
    } catch {
      setIsListening(false);
    }
  };

  const pay = (e: DharEntry) => {
    const p = takaToPoisha(payAmount);
    if (p === null) {
      setPayErr(T("টাকার পরিমাণ ঠিক নেই", "Amount is not valid"));
      return;
    }
    const r = addSettlement(e, {
      id: uid(),
      date: today,
      amountPoisha: p,
      note: payNote.trim(),
      method: payMethod,
      txnId: payTxnId.trim() || undefined,
    });
    if (!r.ok) {
      setPayErr(
        r.reason === "more_than_remaining"
          ? T(`বাকি আছে ${money(remainingPoisha(e))} — এর বেশি নয়`, `Only ${money(remainingPoisha(e))} is open`)
          : T("যোগ করা গেল না", "Could not add")
      );
      return;
    }
    setEntries(entries.map((x) => (x.id === e.id ? r.entry : x)));
    setPayFor(null);
    setPayAmount("");
    setPayNote("");
    setPayTxnId("");
    setPayErr("");
    flash(remainingPoisha(r.entry) ? T("পরিশোধ যোগ হয়েছে", "Payment added") : T("হিসাব মিটে গেছে", "Settled in full"));
  };

  const remove = (e: DharEntry) => {
    const txt = T(
      `${e.counterparty}-এর এই হিসাব (${money(e.principalPoisha)}) আর এর সব পরিশোধ মুছে ফেলবেন?`,
      `Delete this entry for ${e.counterparty} (${money(e.principalPoisha)}) and all its payments?`
    );
    if (window.confirm(txt)) setEntries(entries.filter((x) => x.id !== e.id));
  };

  const downloadCalendar = () => {
    const icsContent = exportDharToIcs(entries);
    if (!icsContent) {
      flash(T("মেয়াদযুক্ত কোনো বাকি হিসাব নেই", "No dues with deadlines"));
      return;
    }
    downloadText("dhar-reminders.ics", icsContent, "text/calendar");
    flash(T("ক্যালেন্ডার (.ics) ফাইল ডাউনলোড হয়েছে", "Downloaded .ics reminder file"));
  };

  const slip = slipFor ? settlementSlip(entries, slipFor, lang, today) : "";
  const slipPerson = people.find((p) => p.key === slipFor) ?? null;

  const copySlip = async () => {
    try {
      await navigator.clipboard.writeText(slip);
      flash(T("কপি হয়েছে", "Copied"));
    } catch {
      flash(T("কপি করা যায়নি", "Could not copy"));
    }
  };

  // Filtered & Sorted Entries
  const filteredEntries = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return entries.filter((e) => {
      // Search
      if (q && !e.counterparty.toLowerCase().includes(q) && !e.phone.includes(q) && !e.note.toLowerCase().includes(q)) {
        return false;
      }
      // Category
      if (activeCategory !== "all" && (e.category || "personal") !== activeCategory) {
        return false;
      }
      // Direction / Status
      const rem = remainingPoisha(e);
      if (directionFilter === "receivable" && e.direction !== "receivable") return false;
      if (directionFilter === "payable" && e.direction !== "payable") return false;
      if (directionFilter === "overdue" && (!e.due || rem === 0 || e.due >= today)) return false;

      return true;
    }).sort((a, b) => {
      if (sortBy === "amount_desc") {
        return remainingPoisha(b) - remainingPoisha(a);
      }
      if (sortBy === "due_asc") {
        if (!a.due) return 1;
        if (!b.due) return -1;
        return a.due.localeCompare(b.due);
      }
      return b.date.localeCompare(a.date);
    });
  }, [entries, searchQuery, activeCategory, directionFilter, sortBy, today]);

  const openList = filteredEntries.filter((e) => remainingPoisha(e) > 0);
  const settledList = filteredEntries.filter((e) => remainingPoisha(e) === 0);

  const row = (e: DharEntry) => {
    const r = remainingPoisha(e);
    const late = !!e.due && r > 0 && today && e.due < today;
    const recv = e.direction === "receivable";
    const categoryInfo = DHAR_CATEGORIES[e.category || "personal"];

    return (
      <li
        key={e.id}
        data-testid="dhar-entry"
        data-direction={e.direction}
        className={`rounded-2xl border p-4 transition-all shadow-2xs ${
          late ? "border-red-300 bg-red-50/50" : "border-slate-200 bg-white hover:border-slate-300"
        }`}
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[17px] font-bold text-slate-900">{e.counterparty}</span>
              <span
                className={`rounded-full px-2.5 py-0.5 text-[11.5px] font-bold ${
                  recv ? "bg-emerald-100 text-emerald-900" : "bg-orange-100 text-orange-900"
                }`}
              >
                {recv ? T("আমি পাব", "I get") : T("আমি দেব", "I pay")}
              </span>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
                {categoryInfo.icon} {bn ? categoryInfo.bn : categoryInfo.en}
              </span>
            </div>

            <p className="text-[13px] text-slate-600">
              {bn ? bnNum(e.date) : e.date}
              {e.due ? ` · ${T("শেষ তারিখ", "due")} ${bn ? bnNum(e.due) : e.due}` : ""}
              {e.phone ? ` · 📞 ${e.phone}` : ""}
              {e.note ? ` · 📝 ${e.note}` : ""}
            </p>

            {late && (
              <p className="flex items-center gap-1.5 text-[12.5px] font-bold text-red-700 bg-red-100/70 px-2.5 py-1 rounded-lg w-fit">
                <AlertTriangle size={14} aria-hidden />
                {T("নির্ধারিত শেষ তারিখ পেরিয়ে গেছে!", "Past the due date!")}
              </p>
            )}
          </div>

          <div className="text-right">
            <p className="font-mono text-[20px] font-black text-slate-900" data-testid="dhar-remaining">
              {money(r)}
            </p>
            {settledPoisha(e) > 0 && (
              <p className="text-[12px] text-slate-500 font-medium">
                {T(
                  `মূল: ${money(e.principalPoisha)} | শোধ: ${money(settledPoisha(e))}`,
                  `Total: ${money(e.principalPoisha)} | Paid: ${money(settledPoisha(e))}`
                )}
              </p>
            )}
          </div>
        </div>

        {/* Settlement history */}
        {e.settlements.length > 0 && (
          <div className="mt-3 space-y-1.5 border-t border-slate-100 pt-2.5">
            <span className="text-[11.5px] font-bold text-slate-500 uppercase tracking-wider block">
              {T("পরিশোধের ইতিহাস:", "Settlement History:")}
            </span>
            <ul className="space-y-1 text-[13px] text-slate-700">
              {e.settlements.map((s) => (
                <li key={s.id} className="flex items-center justify-between rounded-lg bg-slate-50 px-2.5 py-1 text-[12.5px]">
                  <span>
                    ✓ {bn ? bnNum(s.date) : s.date} · {T("পরিশোধ", "Paid")}{" "}
                    <strong className="font-mono text-emerald-800">{money(s.amountPoisha)}</strong>
                    {s.method && ` (${PAYMENT_METHODS[s.method]?.[bn ? "bn" : "en"] || s.method})`}
                    {s.note && ` · ${s.note}`}
                  </span>
                  {s.txnId && <span className="font-mono text-[11px] text-slate-500">Txn: {s.txnId}</span>}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Action Buttons */}
        <div className="mt-3 flex flex-wrap gap-2 pt-1 border-t border-slate-100/80">
          {r > 0 && payFor !== e.id && (
            <button
              type="button"
              onClick={() => {
                setPayFor(e.id);
                setPayAmount("");
                setPayErr("");
              }}
              className="kp-chip !min-h-[40px] font-bold !bg-emerald-50 !text-emerald-900 !border-emerald-200 hover:!bg-emerald-100"
            >
              <HandCoins size={15} aria-hidden />
              {recv ? T("টাকা পেলাম (শোধ)", "Got Paid") : T("টাকা দিলাম (শোধ)", "I Paid")}
            </button>
          )}

          {r > 0 && (
            <button
              type="button"
              onClick={() => {
                setReminderEntry(e);
                setReminderTone("friendly");
              }}
              className="kp-chip !min-h-[40px] font-semibold !bg-indigo-50 !text-indigo-900 !border-indigo-200 hover:!bg-indigo-100"
            >
              <Send size={14} aria-hidden />
              {T("তাগাদা ও রিমাইন্ডার", "Smart Reminder")}
            </button>
          )}

          <button
            type="button"
            onClick={() => setSlipFor(e.phone || e.counterparty.trim().toLowerCase().replace(/\s+/g, " "))}
            className="kp-chip !min-h-[40px]"
          >
            <MessageSquareText size={15} aria-hidden /> {T("হিসাবের স্লিপ", "Statement")}
          </button>

          <button
            type="button"
            onClick={() => remove(e)}
            className="kp-chip !min-h-[40px] text-red-700 hover:bg-red-50"
            aria-label={T(`${e.counterparty}-এর হিসাব মুছুন`, `Delete entry for ${e.counterparty}`)}
          >
            <Trash2 size={15} aria-hidden />
          </button>
        </div>

        {/* Payment input pop-out */}
        {payFor === e.id && (
          <div className="mt-3 rounded-2xl bg-slate-50 p-4 border border-slate-200 space-y-3">
            <span className="text-[13px] font-bold text-slate-800 block">
              {recv ? T("টাকা প্রাপ্তি যোগ করুন:", "Record Received Payment:") : T("টাকা পরিশোধ যোগ করুন:", "Record Payment Made:")}
            </span>

            <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4">
              <div>
                <label className="text-[12.5px] font-bold text-slate-700 block mb-1">
                  {T("কত টাকা (৳)", "Amount (৳)")}
                </label>
                <input
                  inputMode="decimal"
                  value={payAmount}
                  onChange={(x) => setPayAmount(x.target.value)}
                  className="w-full min-h-[40px] rounded-xl border border-slate-300 bg-white px-3 text-[14px]"
                  placeholder={bn ? `সর্বোচ্চ ${bnNum((r / 100).toString())}` : `max ${r / 100}`}
                  data-testid="dhar-pay-amount"
                />
              </div>

              <div>
                <label className="text-[12.5px] font-bold text-slate-700 block mb-1">
                  {T("পরিশোধের মাধ্যম", "Payment Method")}
                </label>
                <select
                  value={payMethod}
                  onChange={(x) => setPayMethod(x.target.value as PaymentMethod)}
                  className="w-full min-h-[40px] rounded-xl border border-slate-300 bg-white px-2.5 text-[13.5px]"
                >
                  {Object.entries(PAYMENT_METHODS).map(([mKey, mVal]) => (
                    <option key={mKey} value={mKey}>
                      {bn ? mVal.bn : mVal.en}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[12.5px] font-bold text-slate-700 block mb-1">
                  {T("TrxID (ঐচ্ছিক)", "TrxID (Optional)")}
                </label>
                <input
                  value={payTxnId}
                  maxLength={40}
                  onChange={(x) => setPayTxnId(x.target.value)}
                  className="w-full min-h-[40px] rounded-xl border border-slate-300 bg-white px-3 text-[14px] font-mono"
                  placeholder="যেমন: BL10A9..."
                />
              </div>

              <div>
                <label className="text-[12.5px] font-bold text-slate-700 block mb-1">
                  {T("নোট (ঐচ্ছিক)", "Note (Optional)")}
                </label>
                <input
                  value={payNote}
                  maxLength={120}
                  onChange={(x) => setPayNote(x.target.value)}
                  className="w-full min-h-[40px] rounded-xl border border-slate-300 bg-white px-3 text-[14px]"
                  placeholder={T("যেমন: নগদ ক্যাশ", "e.g. Cash")}
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setPayFor(null)}
                className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-[13px] font-semibold text-slate-700 hover:bg-slate-100"
              >
                {T("বাতিল", "Cancel")}
              </button>
              <button
                type="button"
                onClick={() => pay(e)}
                className="rounded-xl bg-slate-900 px-5 py-2 text-[13px] font-bold text-white hover:bg-black"
                data-testid="dhar-pay-save"
              >
                {T("সংরক্ষণ করুন", "Save Payment")}
              </button>
            </div>

            {payErr && <p className="text-[13px] font-bold text-red-700" role="alert">{payErr}</p>}
          </div>
        )}
      </li>
    );
  };

  return (
    <section data-testid="dhar-ledger" aria-labelledby="dhar-h" className="scroll-mt-24 space-y-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-4">
        <div className="min-w-0 space-y-1">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100/80 px-3 py-0.5 text-[12px] font-bold text-emerald-900">
            <HandCoins size={14} className="text-emerald-700" />
            <span>{T("ডিজিটাল দেনা-পাওনা ও খাতা", "Digital Dues & Credit Ledger")}</span>
          </div>
          <h2 id="dhar-h" className="text-[20px] font-extrabold text-slate-900">
            {T("দেনা-পাওনা (ধার ও বাকি খাতা)", "Dues: Lent & Borrowed Money")}
          </h2>
          <p className="text-[13.5px] leading-relaxed text-slate-600">
            {T(
              "ধার দেওয়া টাকা কোনো ব্যয় নয় — এটি ফেরত পাওয়ার অর্থ। সুদমুক্ত কর্জ, দোকানের বাকি ও মেসের শেয়ার্ড হিসাব রাখুন বিশ্বস্ততার সাথে।",
              "Money you lend is recoverable capital, kept apart from spending. Track personal loans, shop credit and shared dues securely."
            )}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={downloadCalendar}
            className="kp-chip !min-h-[38px] font-semibold text-slate-700"
            title={T("ক্যালেন্ডার রিমাইন্ডার ডাউনলোড (.ics)", "Download calendar reminders")}
          >
            <CalendarPlus size={15} /> {T("ক্যালেন্ডার (.ics)", "Calendar (.ics)")}
          </button>
          <button
            type="button"
            onClick={() => setLang(bn ? "en" : "bn")}
            className="kp-chip !h-9 !rounded-full !text-[12px] font-bold"
            aria-label={bn ? "Switch to English" : "বাংলায় দেখুন"}
          >
            {bn ? "English" : "বাংলা"}
          </button>
        </div>
      </div>

      {/* Totals Cards */}
      <div className="grid gap-3 sm:grid-cols-3" data-testid="dhar-totals">
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4">
          <p className="text-[13px] font-bold text-emerald-900">{T("আমি পাব (পাওনা)", "To Receive (Receivables)")}</p>
          <p className="font-mono text-[24px] font-black text-emerald-950" data-testid="dhar-receive">
            {money(totals.receivePoisha)}
          </p>
          <span className="text-[11px] text-emerald-700">{T("বকেয়া ফেরত আসার অপেক্ষায়", "Awaiting return")}</span>
        </div>

        <div className="rounded-2xl border border-orange-200 bg-orange-50/70 p-4">
          <p className="text-[13px] font-bold text-orange-900">{T("আমি দেব (দেনা / বাকি)", "To Pay (Payables / Baki)")}</p>
          <p className="font-mono text-[24px] font-black text-orange-950" data-testid="dhar-pay">
            {money(totals.payPoisha)}
          </p>
          <span className="text-[11px] text-orange-700">{T("পরিশোধযোগ্য দায়", "Outstanding liabilities")}</span>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
          <p className="text-[13px] font-bold text-slate-700">{T("নিট ব্যালেন্স", "Net Balance")}</p>
          <p
            className={`font-mono text-[24px] font-black ${
              totals.netPoisha >= 0 ? "text-slate-900" : "text-rose-700"
            }`}
            data-testid="dhar-net"
          >
            {money(totals.netPoisha)}
          </p>
          <span className="text-[11px] text-slate-500">
            {totals.netPoisha >= 0 ? T("সার্বিক পাওনা উদ্বৃত্ত", "Net surplus") : T("সার্বিক দেনার পরিমাণ", "Net deficit")}
          </span>
        </div>
      </div>

      {/* Overdue Alert banner */}
      {totals.overdue.length > 0 && (
        <div className="flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50/80 p-3.5 text-[13.5px] font-semibold text-red-800" data-testid="dhar-overdue">
          <AlertTriangle size={18} className="shrink-0 text-red-700" aria-hidden />
          <span>
            {T(
              `${bnNum(totals.overdue.length)}টি হিসাবের শেষ তারিখ পেরিয়ে গেছে: ${totals.overdue.map((e) => e.counterparty).join(", ")}`,
              `${totals.overdue.length} entries are past their due date: ${totals.overdue.map((e) => e.counterparty).join(", ")}`
            )}
          </span>
        </div>
      )}

      {/* Karz-e-Hasana Guidance Card */}
      <div className="rounded-2xl border border-indigo-200 bg-indigo-50/40 p-4">
        <button
          type="button"
          onClick={() => setShowEthics(!showEthics)}
          className="flex w-full items-center justify-between text-left"
        >
          <div className="flex items-center gap-2">
            <BookOpen size={17} className="text-indigo-700" />
            <strong className="text-[14px] text-indigo-950 font-bold">
              {T("সুদমুক্ত কর্জ ও দেনা-পাওনার নৈতিক নীতিমালা (কুরআন ও হাদিসের আলোকে)", "Ethical Principles of Debt & Karz-e-Hasana")}
            </strong>
          </div>
          {showEthics ? <ChevronUp size={18} className="text-indigo-700" /> : <ChevronDown size={18} className="text-indigo-700" />}
        </button>

        {showEthics && (
          <div className="mt-3.5 grid gap-3 sm:grid-cols-2 pt-2 border-t border-indigo-100">
            {KARZ_HASANA_ETHICS.map((rule) => (
              <div key={rule.id} className="rounded-xl bg-white p-3 border border-indigo-100 space-y-1">
                <span className="text-[11px] font-bold text-indigo-800 block">{rule.sourceBn}</span>
                <strong className="text-[13px] text-slate-900 block">{rule.titleBn}</strong>
                <p className="text-[12px] text-slate-600 leading-relaxed">{rule.descriptionBn}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* New entry form */}
      <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4 sm:p-5 space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-slate-200 pb-3">
          <div className="flex items-center gap-2">
            <Plus size={18} className="text-slate-900" />
            <h3 className="text-[16px] font-bold text-slate-900">{T("নতুন হিসাব যোগ করুন", "Add New Entry")}</h3>
          </div>

          {/* Voice Input Button */}
          <button
            type="button"
            onClick={handleVoiceInput}
            className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-[13px] font-bold transition-all ${
              isListening
                ? "bg-rose-600 text-white animate-pulse"
                : "border border-indigo-200 bg-indigo-50 text-indigo-900 hover:bg-indigo-100"
            }`}
          >
            {isListening ? <MicOff size={15} /> : <Mic size={15} />}
            {isListening ? T("শুনছি... বলুন", "Listening...") : T("ভয়েসে বলুন", "Voice Input")}
          </button>
        </div>

        {voiceTranscript && (
          <p className="text-[12.5px] text-indigo-900 bg-indigo-100/60 p-2.5 rounded-xl border border-indigo-200">
            🎙️ <strong>ভয়েস ইনপুট:</strong> &ldquo;{voiceTranscript}&rdquo;
          </p>
        )}

        {/* Direction toggle */}
        <div className="space-y-1.5">
          <label className="text-[12.5px] font-bold text-slate-700 block">
            {T("লেনদেনের ধরন:", "Transaction Type:")}
          </label>
          <div className="flex flex-wrap gap-2.5" role="radiogroup" aria-label={T("ধরন", "Type")}>
            {(["receivable", "payable"] as DharDirection[]).map((d) => (
              <button
                key={d}
                type="button"
                role="radio"
                aria-checked={form.direction === d}
                onClick={() => set("direction", d)}
                data-testid={`dhar-dir-${d}`}
                className={`min-h-[44px] flex-1 rounded-xl border px-4 text-[14px] font-bold transition-all ${
                  form.direction === d
                    ? d === "receivable"
                      ? "border-emerald-600 bg-emerald-600 text-white shadow-2xs"
                      : "border-orange-600 bg-orange-600 text-white shadow-2xs"
                    : "border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
                }`}
              >
                {d === "receivable"
                  ? T("আমি পাব (ধার দিলাম / ঋণ দিলাম)", "I Receive (I Lent)")
                  : T("আমি দেব (দোকানের বাকি / ধার নিলাম)", "I Pay (Shop Credit / Borrowed)")}
              </button>
            ))}
          </div>
        </div>

        {/* Category selector */}
        <div className="space-y-1.5">
          <label className="text-[12.5px] font-bold text-slate-700 block">
            {T("খাতের বিভাগ:", "Category:")}
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {(Object.entries(DHAR_CATEGORIES) as [DharCategory, { bn: string; en: string; icon: string }][]).map(
              ([catKey, catVal]) => {
                const isSelected = form.category === catKey;
                return (
                  <button
                    key={catKey}
                    type="button"
                    onClick={() => set("category", catKey)}
                    className={`flex items-center gap-1.5 p-2.5 rounded-xl border text-[13px] font-semibold transition-all ${
                      isSelected
                        ? "border-indigo-600 bg-indigo-50 text-indigo-950 font-bold"
                        : "border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    <span>{catVal.icon}</span>
                    <span>{bn ? catVal.bn : catVal.en}</span>
                  </button>
                );
              }
            )}
          </div>
        </div>

        {/* Inputs Grid */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <label className="text-[12.5px] font-bold text-slate-700 block mb-0.5">
              {T("কার সাথে (নাম বা দোকান)", "Name or Shop")}
            </label>
            <input
              value={form.counterparty}
              maxLength={60}
              onChange={(x) => set("counterparty", x.target.value)}
              className={input}
              data-testid="dhar-name"
              placeholder={T("যেমন: রাকিব / করিম স্টোর", "e.g. Rakib / Karim Store")}
            />
          </div>

          <div>
            <label className="text-[12.5px] font-bold text-slate-700 block mb-0.5">
              {T("টাকার পরিমাণ (৳)", "Amount (৳)")}
            </label>
            <input
              inputMode="decimal"
              value={form.amount}
              onChange={(x) => set("amount", x.target.value)}
              className={input}
              data-testid="dhar-amount"
              placeholder="৫০০"
            />
          </div>

          <div>
            <label className="text-[12.5px] font-bold text-slate-700 block mb-0.5">
              {T("মোবাইল নম্বর (ঐচ্ছিক)", "Phone (Optional)")}
            </label>
            <input
              inputMode="tel"
              value={form.phone}
              onChange={(x) => set("phone", x.target.value)}
              className={input}
              data-testid="dhar-phone"
              placeholder="01XXXXXXXXX"
            />
          </div>

          <div>
            <label className="text-[12.5px] font-bold text-slate-700 block mb-0.5">
              {T("তারিখ", "Date")}
            </label>
            <input
              type="date"
              value={form.date}
              max={today || undefined}
              onChange={(x) => set("date", x.target.value)}
              className={input}
            />
          </div>

          <div>
            <label className="text-[12.5px] font-bold text-slate-700 block mb-0.5">
              {T("ফেরতের শেষ তারিখ (ঐচ্ছিক)", "Due Date (Optional)")}
            </label>
            <input
              type="date"
              value={form.due}
              min={form.date || undefined}
              onChange={(x) => set("due", x.target.value)}
              className={input}
            />
          </div>

          <div>
            <label className="text-[12.5px] font-bold text-slate-700 block mb-0.5">
              {T("নোট বা বিবরণ (ঐচ্ছিক)", "Note (Optional)")}
            </label>
            <input
              value={form.note}
              maxLength={160}
              onChange={(x) => set("note", x.target.value)}
              className={input}
              placeholder={T("যেমন: বিকাশ ফি সহ", "e.g. including bKash fee")}
            />
          </div>
        </div>

        {errors.length > 0 && (
          <ul className="space-y-0.5 text-[13px] font-bold text-red-700" role="alert">
            {errors.map((k) => (
              <li key={k}>• {ERR[k]?.[bn ? 0 : 1]}</li>
            ))}
          </ul>
        )}

        <button
          type="button"
          onClick={startReview}
          className="inline-flex min-h-[46px] items-center gap-2 rounded-xl bg-slate-900 px-5 text-[14.5px] font-bold text-white hover:bg-black"
          data-testid="dhar-review"
        >
          <Plus size={17} aria-hidden /> {T("যাচাই করে দেখুন", "Review Entry")}
        </button>

        {/* Confirmation before saving */}
        {review && (
          <div className="rounded-2xl border-2 border-emerald-500 bg-emerald-50/80 p-4 space-y-3" data-testid="dhar-confirm">
            <span className="text-[13px] font-bold text-emerald-950 uppercase tracking-wider block">
              {T("তথ্য মিলিয়ে নিশ্চিত করুন:", "Confirm Entry Details:")}
            </span>
            <p className="text-[16px] text-slate-900">
              {review.direction === "receivable"
                ? T(`${review.counterparty}-এর কাছে আমি পাব`, `${review.counterparty} owes me`)
                : T(`${review.counterparty}-কে আমি দেব`, `I owe ${review.counterparty}`)}{" "}
              <strong className="font-mono text-[18px] text-emerald-950">{money(review.principalPoisha)}</strong>
              {review.due ? T(` · শেষ তারিখ ${bnNum(review.due)}`, ` · Due ${review.due}`) : ""}
              {review.phone ? ` · 📞 ${review.phone}` : ""}
            </p>
            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={save}
                className="min-h-[42px] rounded-xl bg-emerald-700 px-5 text-[14px] font-bold text-white hover:bg-emerald-800"
                data-testid="dhar-save"
              >
                {T("সংরক্ষণ করুন", "Confirm & Save")}
              </button>
              <button
                type="button"
                onClick={() => setReview(null)}
                className="min-h-[42px] rounded-xl border border-slate-300 bg-white px-4 text-[14px] font-semibold text-slate-700 hover:bg-slate-100"
              >
                {T("সংশোধন করুন", "Edit")}
              </button>
            </div>
          </div>
        )}
      </div>

      {msg && <p role="status" className="text-[14px] font-bold text-emerald-800 bg-emerald-50 p-2.5 rounded-xl border border-emerald-200">{msg}</p>}

      {/* People Quick Summary Chips */}
      {people.length > 0 && (
        <div className="space-y-2">
          <p className="text-[13px] font-bold text-slate-700">{T("ব্যক্তিভিত্তিক সারসংক্ষেপ:", "Per Person Balance:")}</p>
          <ul className="flex flex-wrap gap-2" data-testid="dhar-people">
            {people.map((p) => (
              <li key={p.key}>
                <button
                  type="button"
                  onClick={() => setSlipFor(p.key)}
                  className={`min-h-[40px] rounded-xl border px-3 text-[13.5px] font-medium transition-all ${
                    p.netPoisha >= 0
                      ? "border-emerald-200 bg-emerald-50 text-emerald-950 hover:bg-emerald-100"
                      : "border-orange-200 bg-orange-50 text-orange-950 hover:bg-orange-100"
                  }`}
                >
                  <strong>{p.name}:</strong>{" "}
                  <span className="font-mono font-bold">{money(Math.abs(p.netPoisha))}</span>{" "}
                  <span className="text-[11.5px]">{p.netPoisha >= 0 ? T("পাব", "to get") : T("দেব", "to pay")}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Search & Filter Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={T("নাম, ফোন বা নোট দিয়ে খুঁজুন...", "Search by name, phone or note...")}
            className="w-full min-h-[42px] rounded-xl border border-slate-300 bg-white pl-9 pr-3 text-[13.5px] outline-none focus:border-indigo-600"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto [scrollbar-width:none]">
          <select
            value={directionFilter}
            onChange={(e) => setDirectionFilter(e.target.value as any)}
            className="min-h-[42px] rounded-xl border border-slate-300 bg-white px-3 text-[13px] font-semibold text-slate-800"
          >
            <option value="all">{T("সব হিসাব", "All Entries")}</option>
            <option value="receivable">{T("শুধু আমি পাব", "Receivables Only")}</option>
            <option value="payable">{T("শুধু আমি দেব", "Payables Only")}</option>
            <option value="overdue">{T("মেয়াদোত্তীর্ণ", "Overdue Only")}</option>
          </select>

          <select
            value={activeCategory}
            onChange={(e) => setActiveCategory(e.target.value as any)}
            className="min-h-[42px] rounded-xl border border-slate-300 bg-white px-3 text-[13px] font-semibold text-slate-800"
          >
            <option value="all">{T("সকল খাত", "All Categories")}</option>
            {Object.entries(DHAR_CATEGORIES).map(([cKey, cVal]) => (
              <option key={cKey} value={cKey}>
                {cVal.icon} {bn ? cVal.bn : cVal.en}
              </option>
            ))}
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="min-h-[42px] rounded-xl border border-slate-300 bg-white px-3 text-[13px] font-semibold text-slate-800"
          >
            <option value="date_desc">{T("তারিখ (নতুন)", "Date (Newest)")}</option>
            <option value="amount_desc">{T("টাকা (সর্বোচ্চ)", "Amount (High to Low)")}</option>
            <option value="due_asc">{T("শেষ তারিখ (আসন্ন)", "Due Date (Closest)")}</option>
          </select>
        </div>
      </div>

      {/* Polite Reminder Studio Modal */}
      {reminderEntry && (
        <div className="rounded-2xl border-2 border-indigo-300 bg-indigo-50/70 p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-indigo-200 pb-3">
            <div className="flex items-center gap-2">
              <Send size={18} className="text-indigo-700" />
              <h4 className="text-[16px] font-bold text-slate-900">
                {T("স্মার্ট তাগাদা ও শিষ্টাচারপূর্ণ মেসেজ", "Smart & Polite Reminder Generator")}
              </h4>
            </div>
            <button
              type="button"
              onClick={() => setReminderEntry(null)}
              className="kp-chip !min-h-[36px]"
            >
              <X size={15} />
            </button>
          </div>

          <div className="space-y-2">
            <span className="text-[12.5px] font-bold text-slate-700 block">
              {T("মেসেজের ভাব ও সুর (Tone):", "Message Tone:")}
            </span>
            <div className="flex gap-2 flex-wrap">
              {(["friendly", "formal", "urgent"] as ReminderTone[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setReminderTone(t)}
                  className={`rounded-xl px-3.5 py-1.5 text-[13px] font-bold transition-all ${
                    reminderTone === t
                      ? "bg-indigo-900 text-white shadow-2xs"
                      : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  {t === "friendly"
                    ? T("🌸 বিনীত ও মিষ্টি তাগাদা", "Friendly")
                    : t === "formal"
                    ? T("📋 আনুষ্ঠানিক স্টেটমেন্ট", "Formal")
                    : T("🚨 জরুরি প্রয়োজন", "Urgent")}
                </button>
              ))}
            </div>
          </div>

          {/* Generated message preview */}
          {(() => {
            const reminderText = generateReminderMessage(reminderEntry, reminderTone, lang, today);
            return (
              <div className="space-y-3">
                <div className="rounded-xl bg-white p-4 border border-indigo-200 text-[13.5px] leading-relaxed text-slate-800 whitespace-pre-wrap">
                  {reminderText}
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(reminderText);
                        flash(T("মেসেজ কপি হয়েছে", "Message copied"));
                      } catch {
                        flash(T("কপি করা যায়নি", "Could not copy"));
                      }
                    }}
                    className="kp-chip !min-h-[42px] font-bold"
                  >
                    <ClipboardCopy size={15} /> {T("কপি করুন", "Copy Text")}
                  </button>

                  <a
                    href={whatsappHref(reminderText, reminderEntry.phone)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="kp-chip !min-h-[42px] font-bold !bg-emerald-700 !text-white !border-emerald-700 hover:!bg-emerald-800"
                  >
                    WhatsApp
                  </a>

                  {reminderEntry.phone && (
                    <a
                      href={smsHref(reminderEntry.phone, reminderText)}
                      className="kp-chip !min-h-[42px] font-bold !bg-indigo-700 !text-white !border-indigo-700 hover:!bg-indigo-800"
                    >
                      {T("এসএমএস পাঠান", "Send SMS")}
                    </a>
                  )}
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* Statement Slip View */}
      {slipFor && slip && (
        <div className="rounded-2xl border border-slate-300 bg-slate-50 p-4 space-y-3" data-testid="dhar-slip">
          <div className="flex items-center justify-between gap-2 border-b border-slate-200 pb-2">
            <p className="text-[15px] font-bold text-slate-900">
              {T("হিসাবের স্লিপ (ডিজিটাল রসিদ)", "Dues Statement Slip")}
            </p>
            <button type="button" onClick={() => setSlipFor(null)} className="kp-chip !min-h-[36px]" aria-label="Close">
              <X size={15} aria-hidden />
            </button>
          </div>
          <pre className="max-h-64 overflow-auto whitespace-pre-wrap rounded-xl bg-white p-3.5 text-[13px] font-mono leading-relaxed text-slate-800 border border-slate-200">
            {slip}
          </pre>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={copySlip} className="kp-chip !min-h-[42px] font-bold">
              <ClipboardCopy size={15} aria-hidden /> {T("কপি", "Copy")}
            </button>
            {slipPerson?.phone && (
              <a href={smsHref(slipPerson.phone, slip)} className="kp-chip !min-h-[42px] font-bold" data-testid="dhar-sms">
                {T("এসএমএস", "SMS")}
              </a>
            )}
            <a
              href={whatsappHref(slip, slipPerson?.phone ?? "")}
              target="_blank"
              rel="noopener noreferrer"
              className="kp-chip !min-h-[42px] font-bold"
              data-testid="dhar-wa"
            >
              WhatsApp
            </a>
          </div>
        </div>
      )}

      {/* Open entries list */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-[15px] font-bold text-slate-900">
            {T(`খোলা হিসাবসমূহ (${bnNum(openList.length)}টি)`, `Open Dues (${openList.length})`)}
          </h4>
          <span className="text-[12px] text-slate-500">
            {T("বকেয়া টাকা নিষ্পত্তির তালিকা", "Pending balances")}
          </span>
        </div>

        {openList.length > 0 ? (
          <ul className="space-y-3" data-testid="dhar-open">
            {openList.map(row)}
          </ul>
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 p-8 text-center text-slate-500">
            <p>{T("কোনো খোলা হিসাব পাওয়া যায়নি।", "No open dues matching current filter.")}</p>
          </div>
        )}
      </div>

      {/* Settled entries */}
      {settledList.length > 0 && (
        <div className="pt-2 border-t border-slate-200 space-y-2">
          <button
            type="button"
            onClick={() => setShowSettled((v) => !v)}
            className="kp-chip !min-h-[40px] font-semibold"
          >
            {showSettled
              ? T("মিটে যাওয়া হিসাব লুকান", "Hide Settled")
              : T(`মিটে যাওয়া হিসাব দেখুন (${bnNum(settledList.length)}টি)`, `View Settled Entries (${settledList.length})`)}
          </button>
          {showSettled && <ul className="space-y-3 opacity-80">{settledList.map(row)}</ul>}
        </div>
      )}

      <p className="text-[12px] text-slate-500 pt-2 border-t border-slate-100">
        {T(
          "সব হিসাব সম্পূর্ণ সুরক্ষিতভাবে আপনার ডিভাইসে থাকে। কোনো সার্ভারে পাঠানো হয় না। পরিশোধ শুধু যোগ হয়, ইতিহাস মুছে যায় না।",
          "All records are saved privately on this device only. Payments are strictly append-only."
        )}
      </p>
    </section>
  );
}
