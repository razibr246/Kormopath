"use client";
import "./rokkha.css";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { AlertTriangle, BellRing, CheckCircle2, ClipboardCopy, ClipboardPaste, CloudRain, HandCoins, LifeBuoy, Link2, MessageSquareWarning, Phone, PhoneOff, ShieldCheck, Timer, Trash2, Users } from "lucide-react";
import { AppHeader, SourceTag } from "@/components/layout/AppHeader";
import { AppFooter } from "@/components/layout/AppFooter";
import { storageKey, usePersistentState } from "@/lib/clientStore";
import { DISTRICTS, type WeatherHour } from "@/lib/haatbazar";
import {
  CALL_GUARD_POINTS, CALL_GUARD_SECONDS, GUARDIAN_ALERT_BN, GUARDIAN_ALERT_EN, LINK_FLAG_TEXT, MAX_GUARDIANS,
  checkMessage, highlightSegments, incidentReport, inspectLinks, normalizeBdMobile, sanitizeGuardians, smsHref, toBnDigits, transferCheck,
  type Guardian, type PayMethod, type Requester, type TransferInputs,
} from "@/lib/rokkha";
import { PREP_CHECKLIST, PREP_SOURCES, RECOVERY_STEPS, ROKKHA_CHECKED, ROKKHA_HELPLINES, WARNING_LINKS } from "@/lib/rokkhaData";

type Lang = "bn" | "en";

const SAMPLE_SMS = "প্রিয় গ্রাহক, আমি বিকাশ অফিস থেকে বলছি। ভুলে আপনার নম্বরে ৫০০০ টাকা চলে গেছে, এখনই ফেরত দিন। যাচাইয়ের জন্য আপনার ওটিপি কোডটি বলুন। bit.ly/bk-refund";

const NAV = [
  { href: "#check", bn: "বার্তা যাচাই", en: "Check a message", icon: MessageSquareWarning },
  { href: "#pause", bn: "টাকা পাঠানোর আগে", en: "Before you send", icon: Timer },
  { href: "#guardian", bn: "পরিবারের পাহারা", en: "Family guardian", icon: Users },
  { href: "#lost", bn: "টাকা হারিয়েছেন?", en: "Lost money?", icon: LifeBuoy },
  { href: "#ready", bn: "দুর্যোগ প্রস্তুতি", en: "Disaster ready", icon: CloudRain },
  { href: "#help", bn: "হেল্পলাইন", en: "Helplines", icon: Phone },
] as const;

const REQUESTERS: Array<{ id: Requester; bn: string; en: string }> = [
  { id: "self", bn: "আমি নিজেই পাঠাচ্ছি (কেউ চায়নি)", en: "My own decision (nobody asked)" },
  { id: "known_person", bn: "পরিচিত মানুষ", en: "Someone I know" },
  { id: "new_contact", bn: "নতুন/অনলাইনে পরিচয়", en: "New or online-only contact" },
  { id: "official_claim", bn: "নিজেকে পুলিশ/ব্যাংক/অফিস বলছে", en: "Says they are police, a bank or an office" },
  { id: "job_or_agent", bn: "চাকরি/ভিসা/এজেন্ট", en: "Job, visa or agent" },
];
const METHODS: Array<{ id: PayMethod; bn: string; en: string }> = [
  { id: "mfs_send", bn: "বিকাশ/নগদ সেন্ড মানি", en: "bKash/Nagad send money" },
  { id: "agent_cashout", bn: "এজেন্টে ক্যাশ-আউট/ক্যাশ-ইন", en: "Agent cash-out / cash-in" },
  { id: "bank", bn: "ব্যাংক ট্রান্সফার", en: "Bank transfer" },
  { id: "gift_card", bn: "গিফট কার্ড / রিচার্জ কার্ড", en: "Gift card / top-up card" },
  { id: "crypto", bn: "ক্রিপ্টো (USDT ইত্যাদি)", en: "Crypto (USDT etc.)" },
  { id: "cash_handover", bn: "হাতে নগদ টাকা", en: "Cash handover" },
  { id: "other", bn: "অন্য কিছু", en: "Other" },
];

const sanitizeTicks = (raw: unknown): string[] | null =>
  Array.isArray(raw) ? raw.filter((x): x is string => typeof x === "string" && PREP_CHECKLIST.some((p) => p.id === x)) : null;
const sanitizeUntil = (raw: unknown): number | null => (typeof raw === "number" && Number.isFinite(raw) && raw >= 0 && raw < Date.now() + 2 * 3600_000 ? raw : null);
const sanitizeDistrict = (raw: unknown): string | null => (typeof raw === "string" && DISTRICTS.some((d) => d.id === raw) ? raw : null);

export default function RokkhaPage() {
  const [lang, setLang] = useState<Lang>("bn");
  const bn = lang === "bn";
  const T = (b: string, e: string) => (bn ? b : e);
  const num = (n: number | string) => (bn ? toBnDigits(n) : String(n));
  const [callOpen, setCallOpen] = useState(false);
  const [shared, setShared] = useState<{ text: string; n: number } | null>(null);
  const [reportLinks, setReportLinks] = useState("");
  const [guardians, setGuardians] = usePersistentState<Guardian[]>(storageKey("rokkha", "guardians"), [], sanitizeGuardians);

  // "#share=<text>" comes from the share target (public/sw.js); "#call" from the home-screen shortcut.
  // The hash is cleared right away so shared text does not linger in the address bar or history.
  useEffect(() => {
    const read = () => {
      const h = window.location.hash;
      if (h.startsWith("#share=")) {
        let text = "";
        try { text = decodeURIComponent(h.slice(7)); } catch { text = ""; }
        window.history.replaceState(null, "", "/rokkha#check");
        if (text.trim()) setShared({ text: text.slice(0, 5000), n: Date.now() });
        document.getElementById("check")?.scrollIntoView({ block: "start" });
      } else if (h === "#call") {
        window.history.replaceState(null, "", "/rokkha");
        setCallOpen(true);
      }
    };
    read();
    window.addEventListener("hashchange", read);
    return () => window.removeEventListener("hashchange", read);
  }, []);

  return (
    <div className="min-h-screen bg-paper">
      <AppHeader
        appId="rokkha"
        href="/rokkha"
        name="রক্ষা"
        taglineEn="Rokkha"
        taglineBn="প্রতারণা ও দুর্যোগে সুরক্ষা"
        icon={<ShieldCheck size={20} aria-hidden />}
        accent="from-amber-500 to-orange-700"
        right={
          <button type="button" onClick={() => setLang(bn ? "en" : "bn")} className="kp-chip !h-11 !rounded-full !text-[12px] font-semibold !min-w-[44px]" aria-label={bn ? "Switch to English" : "বাংলায় দেখুন"}>
            {bn ? "EN" : "বাং"}
          </button>
        }
      />

      <main id="main" className="mx-auto max-w-6xl space-y-6 px-4 pb-24 pt-4 sm:px-6">
        <section className="rk-hero p-5 sm:p-8" aria-labelledby="rk-title">
          <svg className="rk-shield" viewBox="0 0 24 24" fill="none" stroke="#9a3412" strokeWidth="1.2" aria-hidden>
            <path d="M12 2 4 5v6c0 5 3.4 9.4 8 11 4.6-1.6 8-6 8-11V5l-8-3Z" />
            <path d="m8.5 12 2.5 2.5 4.5-5" />
          </svg>
          <p className="kp-eyebrow">{T("০৭ · সুরক্ষা", "07 · Protect")}</p>
          <h1 id="rk-title" className="mt-2 text-[clamp(28px,5vw,48px)] font-semibold leading-[1.1] text-slate-900">
            {bn ? <>টাকা পাঠানোর আগে <em className="kp-em">একটু থামুন</em></> : <>Before you send money, <em className="kp-em">pause</em></>}
          </h1>
          <p className="mt-2 max-w-[52ch] text-[15.5px] leading-relaxed text-slate-700">
            {T(
              "সন্দেহজনক এসএমএস বা কলের কথা যাচাই করুন, ঝুঁকিপূর্ণ লেনদেনের আগে বিরতি নিন, টাকা হারালে কী করবেন জানুন, আর ঘূর্ণিঝড়-বন্যার জন্য প্রস্তুত থাকুন। সব হিসাব আপনার ফোনেই হয়।",
              "Check a suspicious SMS or call script, pause before a risky transfer, know what to do if money is lost, and get ready for cyclones and floods. Everything runs on your phone.",
            )}
          </p>
          <button type="button" data-testid="rk-call-open" onClick={() => setCallOpen(true)} className="rk-callbtn mt-4 min-h-[44px] min-w-[44px]">
            <PhoneOff size={26} aria-hidden />
            <span className="text-left">
              <span className="block text-[18px] font-bold leading-tight">{T("কলে আছেন? কেউ টাকা বা ওটিপি চাইছে?", "On a call? Someone asking for money or an OTP?")}</span>
              <span className="block text-[13.5px] font-medium opacity-90">{T("এখানে চাপুন — ১৫ সেকেন্ড থামুন, তারপর সিদ্ধান্ত নিন", "Tap here — pause 15 seconds before you decide")}</span>
            </span>
          </button>
          <div className="mt-3 flex flex-wrap gap-2">
            <a href="#check" className="kp-btn-ghost min-h-[50px] rounded-2xl px-5 text-[15.5px] font-bold"><MessageSquareWarning size={18} aria-hidden /> {T("বার্তা যাচাই করুন", "Check a message")}</a>
            <a href="tel:999" className="kp-btn-ghost min-h-[50px] rounded-2xl px-5 text-[15.5px] font-bold"><Phone size={18} aria-hidden /> {T("জরুরি ৯৯৯", "Emergency 999")}</a>
          </div>
        </section>

        <nav className="rk-nav" aria-label={T("রক্ষার অংশ", "Rokkha sections")}>
          {NAV.map((n) => (
            <a key={n.href} href={n.href}><n.icon size={17} aria-hidden /> {bn ? n.bn : n.en}</a>
          ))}
        </nav>

        <MessageChecker bn={bn} T={T} shared={shared} guardians={guardians} onLinks={setReportLinks} />
        <PauseFlow bn={bn} T={T} num={num} />
        <GuardianSection bn={bn} T={T} guardians={guardians} setGuardians={setGuardians} />
        <LostMoney bn={bn} T={T} links={reportLinks} />
        <Readiness bn={bn} T={T} num={num} />
        <Helplines bn={bn} T={T} />

        <p className="text-center text-[12.5px] text-slate-500">
          {T(
            "রক্ষা নিয়মভিত্তিক লক্ষণ খোঁজে; কোনো বার্তাকে \"নিরাপদ\" ঘোষণা করে না, টাকা ফেরতের নিশ্চয়তা দেয় না। নম্বর ও লিংক অফিসিয়াল উৎস থেকে, যাচাই " + ROKKHA_CHECKED + "।",
            "Rokkha looks for rule-based signs; it never declares a message \"safe\" and cannot promise money back. Numbers and links come from official sources, checked " + ROKKHA_CHECKED + ".",
          )}
        </p>
      </main>
      <AppFooter />
      {callOpen && <CallGuard bn={bn} T={T} guardians={guardians} onClose={() => setCallOpen(false)} />}
    </div>
  );
}

type Txt = { bn: boolean; T: (b: string, e: string) => string };

const OFFICIAL_CALLS = [
  { tel: "16247", bn: "বিকাশ ১৬২৪৭", en: "bKash 16247" },
  { tel: "16167", bn: "নগদ ১৬১৬৭", en: "Nagad 16167" },
  { tel: "999", bn: "জরুরি ৯৯৯", en: "Emergency 999" },
];

/** Alert button for saved guardians; opens the phone's own SMS app, the user still presses send. */
function GuardianAlert({ bn, T, guardians }: Txt & { guardians: Guardian[] }) {
  if (!guardians.length) return <a href="#guardian" className="inline-flex min-h-[44px] items-center text-[14px] font-semibold text-amber-900 underline underline-offset-4">{T("পরিবারের কাউকে পাহারাদার হিসেবে যোগ করুন", "Add a family guardian")}</a>;
  const names = guardians.map((g) => g.name || g.number).join(", ");
  return (
    <a data-testid="rk-guardian-alert" href={smsHref(guardians.map((g) => g.number), bn ? GUARDIAN_ALERT_BN : GUARDIAN_ALERT_EN)} className="kp-btn-ghost min-h-[48px] rounded-2xl px-4 font-bold">
      <BellRing size={18} aria-hidden /> {T(`${names}-কে সতর্ক করুন (এসএমএস)`, `Alert ${names} (SMS)`)}
    </a>
  );
}

/*
 * Full-screen pause for the moment a caller is pushing for money or a code (BhashaShield's
 * "cognitive friction" idea, as far as a web page can go: it cannot see the call, so the user opens it).
 */
function CallGuard({ bn, T, guardians, onClose }: Txt & { guardians: Guardian[]; onClose: () => void }) {
  const [left, setLeft] = useState(CALL_GUARD_SECONDS);
  const closeRef = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  useEffect(() => {
    const before = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    const id = window.setInterval(() => setLeft((s) => (s > 0 ? s - 1 : 0)), 1000);
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onCloseRef.current(); };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { window.clearInterval(id); window.removeEventListener("keydown", onKey); document.body.style.overflow = ""; before?.focus?.(); };
  }, []);
  const n = (v: number) => (bn ? toBnDigits(v) : String(v));

  return (
    <div className="rk-guard" role="dialog" aria-modal="true" aria-labelledby="rk-guard-title" data-testid="rk-call-guard">
      <div className="mx-auto flex min-h-full max-w-xl flex-col gap-4 px-4 py-6">
        <p className="kp-eyebrow !text-orange-200">{T("রক্ষা · কল পাহারা", "Rokkha · call guard")}</p>
        <h2 id="rk-guard-title" className="text-[clamp(26px,7vw,38px)] font-semibold leading-tight text-white">{T("থামুন। আগে ফোনটা কেটে দিন।", "Stop. Hang up first.")}</h2>
        <ul className="space-y-2">
          {CALL_GUARD_POINTS.map((p) => (
            <li key={p.en} className="flex gap-3 rounded-2xl bg-white/10 p-3 text-[16px] leading-relaxed text-white ring-1 ring-white/20">
              <AlertTriangle size={20} className="mt-1 shrink-0 text-amber-300" aria-hidden />
              <span>{bn ? p.bn : p.en}</span>
            </li>
          ))}
        </ul>
        <div>
          <p className="text-[14px] font-semibold text-orange-100">{T("ফোন কাটার পর নিজে ফোন করে যাচাই করুন:", "After hanging up, call yourself to check:")}</p>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {OFFICIAL_CALLS.map((c) => (
              <a key={c.tel} href={`tel:${c.tel}`} className="flex min-h-[52px] items-center justify-center gap-1 rounded-2xl bg-white px-2 text-center text-[14.5px] font-bold text-orange-900"><Phone size={16} aria-hidden /> {bn ? c.bn : c.en}</a>
            ))}
          </div>
        </div>
        <div className="rounded-2xl bg-white p-3"><GuardianAlert bn={bn} T={T} guardians={guardians} /></div>
        <div className="mt-auto grid gap-2 pt-2">
          <button ref={closeRef} type="button" onClick={onClose} className="min-h-[54px] rounded-2xl bg-amber-300 px-4 text-[17px] font-bold text-orange-950">{T("ফোন কেটে দিয়েছি", "I have hung up")}</button>
          <button type="button" data-testid="rk-call-continue" onClick={onClose} disabled={left > 0} className="min-h-[48px] rounded-2xl px-4 text-[15px] font-semibold text-orange-100 ring-1 ring-white/40 disabled:opacity-60">
            {left > 0 ? T(`${n(left)} সেকেন্ড ভাবুন…`, `Think for ${left} seconds…`) : T("বুঝেছি, তবুও চালিয়ে যাব", "I understand, continue anyway")}
          </button>
          <p className="sr-only" role="timer">{left > 0 ? T(`${n(left)} সেকেন্ড বাকি`, `${left} seconds left`) : ""}</p>
        </div>
      </div>
    </div>
  );
}

function GuardianSection({ bn, T, guardians, setGuardians }: Txt & { guardians: Guardian[]; setGuardians: (g: Guardian[]) => void }) {
  const [name, setName] = useState("");
  const [number, setNumber] = useState("");
  const [pending, setPending] = useState<Guardian | null>(null);
  const [err, setErr] = useState("");
  const review = () => {
    const n = normalizeBdMobile(number);
    if (!n) { setErr(T("সঠিক মোবাইল নম্বর লিখুন (যেমন ০১৭১২৩৪৫৬৭৮)।", "Enter a valid mobile number (e.g. 01712345678).")); return; }
    if (guardians.some((g) => g.number === n)) { setErr(T("এই নম্বর আগেই আছে।", "This number is already saved.")); return; }
    setErr(""); setPending({ name: name.trim().slice(0, 40), number: n });
  };
  const full = guardians.length >= MAX_GUARDIANS;

  return (
    <section id="guardian" className="rk-section rk-card p-5 sm:p-6" aria-labelledby="guardian-title">
      <SectionHead id="guardian-title" icon={Users} title={T("পরিবারের পাহারাদার", "Family guardian")} sub={T("বাবা-মা বা কম অভিজ্ঞ কারও ফোনে এটি চালু রাখুন। বিপদে এক চাপে আপনার ছেলে-মেয়ে বা আপনজনের কাছে সতর্কবার্তা যায়।", "Set this up on a parent's or a new user's phone. In trouble, one tap sends an alert to a trusted family member.")} />
      <ul className="grid gap-2 sm:grid-cols-2" data-testid="rk-guardians">
        {guardians.map((g) => (
          <li key={g.number} className="flex items-center justify-between gap-2 rounded-2xl bg-paper p-3 ring-1 ring-line">
            <span className="min-w-0"><span className="block font-bold text-ink">{g.name || T("পাহারাদার", "Guardian")}</span><span className="font-mono text-[14px] text-slate-600">{bn ? toBnDigits(g.number) : g.number}</span></span>
            <button type="button" onClick={() => setGuardians(guardians.filter((x) => x.number !== g.number))} className="kp-btn-ghost min-h-[44px] rounded-xl px-3 min-w-[44px]" aria-label={T(`${g.name || g.number} মুছুন`, `Remove ${g.name || g.number}`)}><Trash2 size={16} aria-hidden /></button>
          </li>
        ))}
      </ul>
      {!full && !pending && (
        <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <div>
            <label htmlFor="rk-g-name" className="text-[13.5px] font-semibold text-slate-700">{T("নাম (যেমন: ছেলে, রিনা)", "Name (e.g. son, Rina)")}</label>
            <input id="rk-g-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={40} className="rk-field mt-1 min-h-[44px]" />
          </div>
          <div>
            <label htmlFor="rk-g-num" className="text-[13.5px] font-semibold text-slate-700">{T("মোবাইল নম্বর", "Mobile number")}</label>
            <input id="rk-g-num" value={number} onChange={(e) => setNumber(e.target.value)} inputMode="tel" maxLength={20} className="rk-field mt-1 font-mono min-h-[44px]" placeholder="017XXXXXXXX" />
          </div>
          <button type="button" data-testid="rk-g-review" onClick={review} className="kp-btn-primary min-h-[48px] rounded-2xl px-5 font-bold">{T("যোগ করুন", "Add")}</button>
        </div>
      )}
      {err && <p role="alert" className="mt-2 text-[14px] font-semibold text-red-700">{err}</p>}
      {pending && (
        <div className="mt-3 rounded-2xl bg-amber-50 p-4 ring-1 ring-amber-200" data-testid="rk-g-confirm">
          <p className="text-[15px] text-amber-950">{T("এই নম্বরটি পাহারাদার হিসেবে সংরক্ষণ করবেন? শুধু এই ফোনেই থাকবে।", "Save this number as a guardian? It stays only on this phone.")}</p>
          <p className="mt-1 font-mono text-[16px] font-bold text-ink">{pending.name ? `${pending.name} · ` : ""}{bn ? toBnDigits(pending.number) : pending.number}</p>
          <p className="mt-1 text-[13px] text-amber-900">{T("আগে তাঁকে জানিয়ে অনুমতি নিন।", "Ask them first and get their OK.")}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" data-testid="rk-g-save" onClick={() => { setGuardians([...guardians, pending]); setPending(null); setName(""); setNumber(""); }} className="kp-btn-primary min-h-[48px] rounded-2xl px-5 font-bold">{T("হ্যাঁ, সংরক্ষণ করুন", "Yes, save")}</button>
            <button type="button" onClick={() => setPending(null)} className="kp-btn-ghost min-h-[48px] rounded-2xl px-4">{T("বাতিল", "Cancel")}</button>
          </div>
        </div>
      )}
      <div className="mt-4 flex flex-wrap items-center gap-3"><GuardianAlert bn={bn} T={T} guardians={guardians} /></div>
      <p className="mt-3 text-[12.5px] leading-relaxed text-slate-500">
        {T(
          "সতর্কবার্তায় কোনো টাকার অঙ্ক, নম্বর বা মেসেজ থাকে না — শুধু \"এখনই আমাকে ফোন করুন\"। এটি আপনার ফোনের নিজের এসএমএস অ্যাপ থেকে যায়, সাধারণ এসএমএস খরচ লাগে; পাহারাদারের ফোনে ইন্টারনেট লাগে না। রক্ষা নিজে কোনো বার্তা পাঠায় না।",
          "The alert holds no amount, number or message text — only \"call me now\". It goes from your phone's own SMS app at the normal SMS charge; the guardian needs no internet. Rokkha itself sends nothing.",
        )}
      </p>
    </section>
  );
}

function SectionHead({ id, icon: Icon, title, sub }: { id: string; icon: typeof ShieldCheck; title: string; sub: string }) {
  return (
    <div className="mb-3 flex items-start gap-3">
      <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-amber-50 text-amber-800 ring-1 ring-amber-200"><Icon size={20} aria-hidden /></span>
      <div className="min-w-0">
        <h2 id={id} className="text-[clamp(21px,3vw,27px)] font-semibold leading-tight text-slate-900">{title}</h2>
        <p className="mt-0.5 text-[14.5px] text-slate-600">{sub}</p>
      </div>
    </div>
  );
}

function MessageChecker({ bn, T, shared, guardians, onLinks }: Txt & { shared: { text: string; n: number } | null; guardians: Guardian[]; onLinks: (links: string) => void }) {
  const [text, setText] = useState("");
  const [checked, setChecked] = useState<string | null>(null);
  const [pasteMsg, setPasteMsg] = useState("");
  const [canPaste, setCanPaste] = useState(false);
  const result = useMemo(() => (checked === null ? null : checkMessage(checked)), [checked]);
  const segments = useMemo(() => (result ? highlightSegments(result) : []), [result]);
  const links = useMemo(() => (checked === null ? [] : inspectLinks(checked)), [checked]);

  useEffect(() => { setCanPaste(typeof navigator !== "undefined" && Boolean(navigator.clipboard?.readText)); }, []);
  useEffect(() => { if (shared) { setText(shared.text); setChecked(shared.text); } }, [shared]);
  useEffect(() => { onLinks(links.filter((l) => l.flags.length).map((l) => l.url).join("\n")); }, [links, onLinks]);

  const paste = async () => {
    try {
      const t = (await navigator.clipboard.readText()).slice(0, 5000);
      if (t.trim()) { setText(t); setChecked(t); setPasteMsg(""); } else setPasteMsg(T("ক্লিপবোর্ড খালি।", "The clipboard is empty."));
    } catch { setPasteMsg(T("পেস্ট করা যায়নি — বক্সে চেপে ধরে পেস্ট করুন।", "Could not paste — long-press the box and paste.")); }
  };

  return (
    <section id="check" className="rk-section rk-card p-5 sm:p-6" aria-labelledby="check-title">
      <SectionHead id="check-title" icon={MessageSquareWarning} title={T("বার্তা যাচাই", "Check a message")} sub={T("এসএমএস, হোয়াটসঅ্যাপ বা ফোনে যা বলেছে, এখানে লিখুন বা পেস্ট করুন। লেখা ফোনের বাইরে যায় না।", "Paste an SMS, WhatsApp text or what a caller said. The text never leaves your phone.")} />
      <label htmlFor="rk-msg" className="text-[14px] font-semibold text-slate-700">{T("বার্তার লেখা", "Message text")}</label>
      <textarea id="rk-msg" data-testid="rk-msg" value={text} onChange={(e) => setText(e.target.value)} rows={5} maxLength={5000} className="rk-field mt-1 leading-relaxed min-h-[44px]" placeholder={T("যেমন: ভুলে আপনার নম্বরে টাকা চলে গেছে…", "e.g. I sent money to your number by mistake…")} />
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" data-testid="rk-check" onClick={() => setChecked(text)} disabled={!text.trim()} className="kp-btn-primary min-h-[48px] rounded-2xl px-5 font-bold disabled:opacity-50">{T("লক্ষণ খুঁজুন", "Look for signs")}</button>
        {canPaste && <button type="button" onClick={paste} className="kp-btn-ghost min-h-[48px] rounded-2xl px-4"><ClipboardPaste size={17} aria-hidden /> {T("পেস্ট করে যাচাই", "Paste and check")}</button>}
        <button type="button" onClick={() => { setText(SAMPLE_SMS); setChecked(SAMPLE_SMS); }} className="kp-btn-ghost min-h-[48px] rounded-2xl px-4">{T("নমুনা বার্তা দেখুন", "Try a sample")}</button>
        {text && <button type="button" onClick={() => { setText(""); setChecked(null); }} className="kp-btn-ghost min-h-[48px] rounded-2xl px-4">{T("মুছুন", "Clear")}</button>}
      </div>
      {pasteMsg && <p role="status" className="mt-2 text-[13.5px] text-slate-600">{pasteMsg}</p>}
      <p className="mt-2 text-[12.5px] text-slate-500">{T("টিপ: অ্যাপটি হোম স্ক্রিনে যোগ করলে মেসেজ অ্যাপ থেকে \"শেয়ার\" করে সরাসরি এখানে পাঠাতে পারবেন।", "Tip: add this app to your home screen, then use \"Share\" in your Messages app to send a text straight here.")}</p>

      <div aria-live="polite" className="mt-4">
        {result && (
          <div className="rk-enter space-y-3" data-testid="rk-result">
            <p className={`flex items-start gap-2 rounded-2xl px-4 py-3 text-[15px] font-semibold ${result.hits.length ? "bg-orange-50 text-orange-900 ring-1 ring-orange-200" : "bg-slate-100 text-slate-800 ring-1 ring-slate-200"}`}>
              {result.hits.length ? <AlertTriangle size={20} className="mt-0.5 shrink-0" aria-hidden /> : <ShieldCheck size={20} className="mt-0.5 shrink-0" aria-hidden />}
              <span>{bn ? result.summaryBn : result.summaryEn}</span>
            </p>
            {result.hits.length > 0 && (
              <>
                <p className="whitespace-pre-wrap break-words rounded-2xl bg-white p-4 text-[15px] leading-relaxed ring-1 ring-line" aria-label={T("চিহ্নিত অংশসহ বার্তা", "Message with flagged parts")}>
                  {segments.map((s, i) => (s.ids.length ? <mark key={i} className="rk-mark">{s.text}</mark> : <span key={i}>{s.text}</span>))}
                </p>
                <ul className="grid gap-3 md:grid-cols-2">
                  {result.hits.map((h) => (
                    <li key={h.id} data-signal={h.id} className="rounded-2xl bg-paper p-4 ring-1 ring-line">
                      <p className="text-[15px] font-bold text-ink">{bn ? h.labelBn : h.labelEn}</p>
                      <p className="mt-1 text-[13.5px] text-slate-600">{T("বার্তায় লেখা:", "In the message:")} {h.spans.map((s, i) => <span key={i}><q className="rk-quote">{s.quote}</q>{i < h.spans.length - 1 ? " " : ""}</span>)}</p>
                      <p className="mt-2 text-[14px] leading-relaxed text-slate-700">{bn ? h.whyBn : h.whyEn}</p>
                    </li>
                  ))}
                </ul>
              </>
            )}
            {links.length > 0 && (
              <div className="rounded-2xl bg-white p-4 ring-1 ring-line" data-testid="rk-links">
                <p className="flex items-center gap-2 text-[15px] font-bold text-ink"><Link2 size={18} aria-hidden /> {T("লিংক পরীক্ষা", "Link check")}</p>
                <ul className="mt-2 space-y-3">
                  {links.map((l) => (
                    <li key={l.url} data-link-flags={l.flags.join(",")} className="text-[14px]">
                      <p className="break-all font-mono text-[13.5px] text-slate-800">{l.host}</p>
                      {l.pretendsToBe && <p className="mt-1 font-semibold text-orange-800">{T(`"${l.pretendsToBe}"-এর নাম ব্যবহার করছে, কিন্তু এটি তাদের অফিসিয়াল ঠিকানা নয়।`, `Uses the name "${l.pretendsToBe}", but this is not their official address.`)}</p>}
                      {l.flags.filter((f) => f !== "brand_lookalike").map((f) => <p key={f} className="mt-1 text-orange-900">• {bn ? LINK_FLAG_TEXT[f].bn : LINK_FLAG_TEXT[f].en}</p>)}
                      {l.officialFor && <p className="mt-1 text-slate-700">{T(`ঠিকানাটি ${l.officialFor}-এর নিজের, তবে প্রতারকেরা আসল লিংকও কপি করে পাঠায়। লিংকে না ঢুকে অ্যাপটি নিজে খুলুন।`, `This address belongs to ${l.officialFor}, but scammers copy real links too. Open the app yourself instead of the link.`)}</p>}
                      {!l.flags.length && !l.officialFor && <p className="mt-1 text-slate-700">{T("বিশেষ কোনো চিহ্ন পাওয়া যায়নি — তবু অচেনা লিংকে পিন, পাসওয়ার্ড বা কার্ড নম্বর দেবেন না।", "No special signs found — still never enter a PIN, password or card number on an unknown link.")}</p>}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {result.hits.length > 0 && <div className="flex flex-wrap gap-2"><GuardianAlert bn={bn} T={T} guardians={guardians} /></div>}
            <p className="text-[12.5px] text-slate-500">{T("এটি নিয়মভিত্তিক খোঁজ, এআই নয় — বাংলা, ইংরেজি ও ইংরেজি অক্ষরে লেখা বাংলা (Banglish) পড়ে। নতুন ধরনের প্রতারণা এই তালিকায় না-ও থাকতে পারে।", "This is a rule-based check, not AI — it reads Bangla, English and Bangla typed in English letters (Banglish). New kinds of scams may not be on the list.")}</p>
          </div>
        )}
      </div>
    </section>
  );
}

function PauseFlow({ bn, T, num }: Txt & { num: (n: number | string) => string }) {
  const [inp, setInp] = useState<TransferInputs>({ amountTaka: 0, requester: "known_person", metInPerson: true, urgency: false, secrecy: false, method: "mfs_send", viaNewNumber: false });
  const [amountText, setAmountText] = useState("");
  const [until, setUntil] = usePersistentState<number>(storageKey("rokkha", "pauseUntil"), 0, sanitizeUntil);
  const [now, setNow] = useState(0);
  const [startedFor, setStartedFor] = useState(0);
  const res = transferCheck(inp);

  useEffect(() => {
    setNow(Date.now());
    if (!until || until <= Date.now()) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [until]);

  const leftMs = until && now ? Math.max(0, until - now) : 0;
  const running = leftMs > 0;
  const done = until > 0 && now >= until;
  const mm = Math.floor(leftMs / 60000);
  const ss = Math.floor((leftMs % 60000) / 1000);
  const total = (startedFor || res.pauseMinutes || 1) * 60000;
  const R = 52;
  const C = 2 * Math.PI * R;

  const set = <K extends keyof TransferInputs>(k: K, v: TransferInputs[K]) => setInp((p) => ({ ...p, [k]: v }));
  const toggle = (k: "metInPerson" | "urgency" | "secrecy" | "viaNewNumber", bnL: string, enL: string, inverse = false) => (
    <label className="rk-toggle min-h-[44px]">
      <input type="checkbox" checked={inverse ? !inp[k] : inp[k]} onChange={(e) => set(k, inverse ? !e.target.checked : e.target.checked)} />
      <span>{T(bnL, enL)}</span>
    </label>
  );

  return (
    <section id="pause" className="rk-section rk-card p-5 sm:p-6" aria-labelledby="pause-title">
      <SectionHead id="pause-title" icon={Timer} title={T("টাকা পাঠানোর আগে", "Before you send money")} sub={T("কয়েকটি প্রশ্নের উত্তর দিন। চাপের লক্ষণ থাকলে একটু বিরতি নিন — প্রতারকেরা ঠিক এই সময়টাই দিতে চায় না।", "Answer a few questions. If there is pressure, take a pause — the one thing scammers do not want you to have.")} />
      <div className="grid gap-5 lg:grid-cols-[1.1fr_1fr]">
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="rk-amt" className="text-[14px] font-semibold text-slate-700">{T("কত টাকা (৳)", "Amount (৳)")}</label>
              <input id="rk-amt" inputMode="numeric" value={amountText} onChange={(e) => { const v = e.target.value.replace(/[^\d০-৯]/g, "").slice(0, 9); setAmountText(v); set("amountTaka", Number(v.replace(/[০-৯]/g, (d) => String("০১২৩৪৫৬৭৮৯".indexOf(d)))) || 0); }} className="rk-field mt-1 font-mono min-h-[44px]" placeholder="5000" />
            </div>
            <div>
              <label htmlFor="rk-method" className="text-[14px] font-semibold text-slate-700">{T("কীভাবে পাঠাতে বলছে", "How they want it")}</label>
              <select id="rk-method" value={inp.method} onChange={(e) => set("method", e.target.value as PayMethod)} className="rk-field mt-1 min-h-[44px]">
                {METHODS.map((m) => <option key={m.id} value={m.id}>{bn ? m.bn : m.en}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label htmlFor="rk-who" className="text-[14px] font-semibold text-slate-700">{T("কে টাকা চাইছে", "Who is asking")}</label>
            <select id="rk-who" value={inp.requester} onChange={(e) => set("requester", e.target.value as Requester)} className="rk-field mt-1 min-h-[44px]">
              {REQUESTERS.map((r) => <option key={r.id} value={r.id}>{bn ? r.bn : r.en}</option>)}
            </select>
          </div>
          <fieldset className="grid gap-2 sm:grid-cols-2">
            <legend className="sr-only">{T("চাপের লক্ষণ", "Pressure signs")}</legend>
            {inp.requester !== "self" && toggle("metInPerson", "তাঁর সঙ্গে কখনো সামনাসামনি দেখা হয়নি", "I have never met them in person", true)}
            {toggle("urgency", "এখনই পাঠাতে তাড়া দিচ্ছে", "They say it must be right now")}
            {toggle("secrecy", "কাউকে না জানাতে বলেছে", "They told me to keep it secret")}
            {toggle("viaNewNumber", "নতুন/অচেনা নম্বর থেকে অনুরোধ", "The request came from a new number")}
          </fieldset>
        </div>

        <div className="rounded-2xl bg-paper p-4 ring-1 ring-line" aria-live="polite">
          {res.flags.length === 0 ? (
            <p className="text-[15px] text-slate-700">{T("কোনো চাপের লক্ষণ বাছাই করা হয়নি। তবুও নিচের দুটি ধাপ মেনে চলুন।", "No pressure signs selected. Still follow the two steps below.")}</p>
          ) : (
            <>
              <p className={`text-[15.5px] font-bold ${res.level === "high" ? "text-orange-800" : "text-amber-900"}`}>
                {res.level === "high" ? T("উচ্চ ঝুঁকি — এখন পাঠাবেন না", "High risk — do not send now") : T("সাবধান — একটু থামুন", "Caution — take a pause")}
              </p>
              <ul className="mt-2 space-y-1 text-[14px] text-slate-700">
                {res.flags.map((f) => <li key={f.id}>• {bn ? f.bn : f.en} <span className="font-mono text-slate-500">+{num(f.minutes)}{T(" মি", "m")}</span></li>)}
              </ul>
            </>
          )}

          <div className="mt-4 flex items-center gap-4">
            <svg width="124" height="124" viewBox="0 0 124 124" className="rk-ring shrink-0" aria-hidden>
              <circle cx="62" cy="62" r={R} stroke="#eadfcc" strokeWidth="10" fill="none" />
              <circle cx="62" cy="62" r={R} stroke={done ? "#2f6b3a" : "#c2410c"} strokeWidth="10" fill="none" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={running ? C * (1 - leftMs / total) : done ? 0 : C} />
            </svg>
            <div>
              <p className="font-mono text-[34px] font-bold leading-none text-ink" data-testid="rk-countdown" aria-hidden>
                {running ? `${num(String(mm).padStart(2, "0"))}:${num(String(ss).padStart(2, "0"))}` : `${num(res.pauseMinutes)}${T(" মিনিট", " min")}`}
              </p>
              <p className="sr-only" role="timer">{running ? T(`বিরতির ${toBnDigits(mm + 1)} মিনিট বাকি`, `${mm + 1} minutes of the pause left`) : ""}</p>
              <p className="mt-1 text-[13.5px] text-slate-600">{running ? T("বিরতি চলছে। এর মধ্যে নিচের ধাপগুলো করুন।", "Pause running. Do the steps below meanwhile.") : done ? T("বিরতি শেষ। ধাপগুলো করা হলে তবেই সিদ্ধান্ত নিন।", "Pause over. Decide only after doing the steps.") : T("প্রস্তাবিত বিরতি", "Suggested pause")}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {!running && res.pauseMinutes > 0 && <button type="button" onClick={() => { setStartedFor(res.pauseMinutes); setUntil(Date.now() + res.pauseMinutes * 60000); }} className="kp-btn-sun min-h-[44px] rounded-xl px-4 font-bold min-w-[44px]">{T("বিরতি শুরু করুন", "Start the pause")}</button>}
                {(running || done) && <button type="button" onClick={() => setUntil(0)} className="kp-btn-ghost min-h-[44px] rounded-xl px-4 min-w-[44px]">{T("রিসেট", "Reset")}</button>}
              </div>
            </div>
          </div>
        </div>
      </div>

      <ol className="mt-4 space-y-2">
        {(bn ? res.stepsBn : res.stepsEn).map((s, i) => (
          <li key={i} className="flex gap-3 rounded-2xl bg-white p-3 text-[14.5px] text-slate-800 ring-1 ring-line">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-100 font-mono text-[13px] font-bold text-amber-900">{num(i + 1)}</span>
            <span>{s}</span>
          </li>
        ))}
      </ol>
      <p className="mt-3 text-[12.5px] leading-relaxed text-slate-500">{bn ? res.ruleBn : res.ruleEn}</p>
    </section>
  );
}

function LostMoney({ bn, T, links }: Txt & { links: string }) {
  const [f, setF] = useState({ date: "", time: "", amount: "", method: "", transactionId: "", senderNumber: "", receiverNumber: "", yourName: "", yourNumber: "", links: "", whatHappened: "" });
  useEffect(() => { if (links) setF((p) => ({ ...p, links })); }, [links]);
  const [which, setWhich] = useState<"helpline" | "gd">("helpline");
  const [copied, setCopied] = useState<string | null>(null);
  const report = incidentReport({ ...f, amountTaka: Number(f.amount.replace(/[^\d]/g, "")) || null });
  const text = report[which];
  const input = (k: keyof typeof f, bnL: string, enL: string, props: Record<string, string> = {}) => (
    <div>
      <label htmlFor={`rk-rep-${k}`} className="text-[13.5px] font-semibold text-slate-700">{T(bnL, enL)}</label>
      <input id={`rk-rep-${k}`} value={f[k]} onChange={(e) => setF((p) => ({ ...p, [k]: e.target.value }))} className="rk-field mt-1 min-h-[44px]" {...props} />
    </div>
  );
  const copy = async () => {
    try { await navigator.clipboard.writeText(text); setCopied(T("কপি হয়েছে", "Copied")); }
    catch { setCopied(T("কপি করা যায়নি — লেখাটি বেছে নিয়ে কপি করুন", "Could not copy — select the text and copy it")); }
    window.setTimeout(() => setCopied(null), 2500);
  };

  return (
    <section id="lost" className="rk-section rk-card p-5 sm:p-6" aria-labelledby="lost-title">
      <SectionHead id="lost-title" icon={HandCoins} title={T("টাকা হারিয়েছেন?", "Already lost money?")} sub={T("দেরি না করে এই ধাপগুলো করুন। টাকা ফেরতের নিশ্চয়তা কেউ দিতে পারে না, তবে দ্রুত জানালে সুযোগ বাড়ে।", "Act quickly. Nobody can promise the money back, but reporting fast gives the best chance.")} />
      <ol className="space-y-2">
        {RECOVERY_STEPS.map((s, i) => (
          <li key={s.id} className="flex gap-3 rounded-2xl bg-paper p-3 text-[14.5px] text-slate-800 ring-1 ring-line">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-orange-100 font-mono text-[13px] font-bold text-orange-900">{bn ? toBnDigits(i + 1) : i + 1}</span>
            <span className="min-w-0">{bn ? s.bn : s.en}{s.source && <span className="mt-1 block"><SourceTag confidence="official" label={s.source.label} url={s.source.url} checked={s.source.checked} /></span>}</span>
          </li>
        ))}
      </ol>

      <h3 className="mt-6 text-[18px] font-bold text-ink">{T("রিপোর্ট তৈরি করুন", "Build your report")}</h3>
      <p className="text-[13.5px] text-slate-600">{T("যা জানেন তাই লিখুন; ফাঁকা ঘর \"— (লিখুন)\" হিসেবে থাকবে। এই তথ্য কোথাও সংরক্ষণ বা পাঠানো হয় না।", "Fill in what you know; blanks stay as \"— (লিখুন)\". Nothing here is saved or sent anywhere.")}</p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {input("date", "তারিখ", "Date", { type: "date" })}
        {input("time", "সময়", "Time", { type: "time" })}
        {input("amount", "টাকার পরিমাণ (৳)", "Amount (৳)", { inputMode: "numeric" })}
        {input("method", "মাধ্যম (যেমন বিকাশ)", "Method (e.g. bKash)")}
        {input("transactionId", "লেনদেন আইডি (TrxID)", "Transaction ID")}
        {input("senderNumber", "যে নম্বর থেকে যোগাযোগ", "Number that contacted you", { inputMode: "tel" })}
        {input("receiverNumber", "যে নম্বরে টাকা গেছে", "Number the money went to", { inputMode: "tel" })}
        {input("yourName", "আপনার নাম", "Your name")}
        {input("yourNumber", "আপনার নম্বর", "Your number", { inputMode: "tel" })}
      </div>
      <label htmlFor="rk-links" className="mt-3 block text-[13.5px] font-semibold text-slate-700">{T("সন্দেহজনক লিংক (বার্তা যাচাই থেকে আপনা-আপনি আসে)", "Suspicious links (filled in from the message check)")}</label>
      <textarea id="rk-links" data-testid="rk-report-links" rows={2} maxLength={600} value={f.links} onChange={(e) => setF((p) => ({ ...p, links: e.target.value }))} className="rk-field mt-1 font-mono text-[13px] min-h-[44px]" />
      <label htmlFor="rk-what" className="mt-3 block text-[13.5px] font-semibold text-slate-700">{T("কী ঘটেছে", "What happened")}</label>
      <textarea id="rk-what" rows={3} maxLength={1500} value={f.whatHappened} onChange={(e) => setF((p) => ({ ...p, whatHappened: e.target.value }))} className="rk-field mt-1 min-h-[44px]" />

      <div className="mt-4 flex flex-wrap items-center gap-2" role="group" aria-label={T("রিপোর্টের ধরন", "Report type")}>
        <button type="button" aria-pressed={which === "helpline"} onClick={() => setWhich("helpline")} className={`min-h-[44px] rounded-xl px-4 font-semibold ring-1 ${which === "helpline" ? "bg-emerald-800 text-white ring-emerald-800" : "bg-white text-ink ring-line"} min-w-[44px]`}>{T("হেল্পলাইনের জন্য", "For the helpline")}</button>
        <button type="button" aria-pressed={which === "gd"} onClick={() => setWhich("gd")} className={`min-h-[44px] rounded-xl px-4 font-semibold ring-1 ${which === "gd" ? "bg-emerald-800 text-white ring-emerald-800" : "bg-white text-ink ring-line"} min-w-[44px]`}>{T("থানায় জিডি", "Police GD")}</button>
        <button type="button" onClick={copy} className="kp-btn-primary min-h-[44px] rounded-xl px-4 font-bold min-w-[44px]"><ClipboardCopy size={16} aria-hidden /> {T("কপি করুন", "Copy")}</button>
        <span aria-live="polite" className="text-[13px] font-semibold text-emerald-800">{copied}</span>
      </div>
      <pre className="mt-3 max-h-[360px] overflow-auto whitespace-pre-wrap break-words rounded-2xl bg-white p-4 font-mono text-[13px] leading-relaxed text-slate-800 ring-1 ring-line" aria-label={T("রিপোর্টের লেখা", "Report text")}>{text}</pre>
    </section>
  );
}

type Wx = { maxRain: number; maxWind: number; rainMm: number; temp: number | null; source: { label: string; url: string } } | null;

function Readiness({ bn, T, num }: Txt & { num: (n: number | string) => string }) {
  const [district, setDistrict] = usePersistentState<string>(storageKey("rokkha", "district"), "khulna", sanitizeDistrict);
  const [ticks, setTicks] = usePersistentState<string[]>(storageKey("rokkha", "prep"), [], sanitizeTicks);
  const [wx, setWx] = useState<Wx>(null);
  const [wxErr, setWxErr] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    setWx(null); setWxErr(null);
    fetch(`/api/weather?d=${encodeURIComponent(district)}`)
      .then((r) => r.json())
      .then((d: { hours?: WeatherHour[]; source?: { label: string; url: string }; error?: string }) => {
        if (!live) return;
        if (!d.hours?.length) { setWxErr("unavailable"); return; }
        const h = d.hours;
        setWx({
          maxRain: Math.max(...h.map((x) => x.precipProbability)),
          maxWind: Math.round(Math.max(...h.map((x) => x.windKmh))),
          rainMm: Math.round(h.reduce((a, x) => a + x.precipitationMm, 0) * 10) / 10,
          temp: Number.isFinite(h[0]?.temperatureC) ? Math.round(h[0].temperatureC) : null,
          source: d.source ?? { label: "Open-Meteo.com", url: "https://open-meteo.com/" },
        });
      })
      .catch(() => live && setWxErr("unavailable"));
    return () => { live = false; };
  }, [district]);

  const toggle = (id: string) => setTicks((all) => (all.includes(id) ? all.filter((x) => x !== id) : [...all, id]));
  const doneCount = PREP_CHECKLIST.filter((p) => ticks.includes(p.id)).length;

  return (
    <section id="ready" className="rk-section rk-card p-5 sm:p-6" aria-labelledby="ready-title">
      <SectionHead id="ready-title" icon={CloudRain} title={T("দুর্যোগ প্রস্তুতি", "Disaster readiness")} sub={T("জেলার সাধারণ পূর্বাভাস আর পরিবারের প্রস্তুতির তালিকা। অফিসিয়াল সতর্কবার্তার জন্য BMD ও FFWC দেখুন।", "A general district forecast and a household checklist. For official warnings, see BMD and FFWC.")} />
      <div className="grid gap-4 md:grid-cols-[1fr_1.4fr]">
        <div className="rounded-2xl bg-paper p-4 ring-1 ring-line">
          <label htmlFor="rk-district" className="text-[14px] font-semibold text-slate-700">{T("জেলা", "District")}</label>
          <select id="rk-district" value={district} onChange={(e) => setDistrict(e.target.value)} className="rk-field mt-1 font-semibold min-h-[44px]">
            {DISTRICTS.map((d) => <option key={d.id} value={d.id}>{bn ? d.nameBn : d.id[0].toUpperCase() + d.id.slice(1)}</option>)}
          </select>
          <div className="mt-3" aria-live="polite">
            {wx ? (
              <>
                <p className="text-[13px] font-semibold text-slate-500">{T("পরের ২৪ ঘণ্টা", "Next 24 hours")}</p>
                <dl className="mt-1 grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-xl bg-white p-2 ring-1 ring-line"><dt className="text-[12px] text-slate-500">{T("বৃষ্টির সম্ভাবনা", "Rain chance")}</dt><dd className="font-mono text-[20px] font-bold text-ink">{num(wx.maxRain)}%</dd></div>
                  <div className="rounded-xl bg-white p-2 ring-1 ring-line"><dt className="text-[12px] text-slate-500">{T("সর্বোচ্চ বাতাস", "Max wind")}</dt><dd className="font-mono text-[20px] font-bold text-ink">{num(wx.maxWind)}<span className="text-[12px]"> {T("কিমি/ঘ", "km/h")}</span></dd></div>
                  <div className="rounded-xl bg-white p-2 ring-1 ring-line"><dt className="text-[12px] text-slate-500">{T("মোট বৃষ্টি", "Total rain")}</dt><dd className="font-mono text-[20px] font-bold text-ink">{num(wx.rainMm)}<span className="text-[12px]"> {T("মিমি", "mm")}</span></dd></div>
                </dl>
                <div className="mt-2"><SourceTag confidence="reported" label={wx.source.label} url={wx.source.url} /></div>
                <p className="mt-2 text-[12.5px] text-slate-600">{T("এটি মডেলের সাধারণ পূর্বাভাস, সরকারি সতর্কসংকেত নয়।", "This is a general model forecast, not an official warning signal.")}</p>
              </>
            ) : <p className="text-[14px] text-slate-600">{wxErr ? T("পূর্বাভাস এখন পাওয়া যাচ্ছে না। নিচের অফিসিয়াল সাইট বা ১০৯০ দেখুন।", "Forecast unavailable right now. Use the official sites below or 1090.") : T("পূর্বাভাস আনা হচ্ছে…", "Loading forecast…")}</p>}
          </div>
          <ul className="mt-4 space-y-2">
            {WARNING_LINKS.map((w) => (
              <li key={w.id} className="text-[13.5px] text-slate-700">
                <a href={w.source.url} target="_blank" rel="noopener noreferrer" className="font-semibold text-emerald-800 underline-offset-2 hover:underline">{w.nameBn} ↗</a>
                <span className="block text-slate-600">{w.whatBn}</span>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <div className="flex items-baseline justify-between gap-2">
            <h3 className="text-[17px] font-bold text-ink">{T("পরিবারের প্রস্তুতি", "Household checklist")}</h3>
            <span className="font-mono text-[14px] font-semibold text-emerald-800">{num(doneCount)}/{num(PREP_CHECKLIST.length)}</span>
          </div>
          <ul className="mt-2 grid gap-2">
            {PREP_CHECKLIST.map((p) => (
              <li key={p.id}>
                <label className="rk-toggle min-h-[44px]">
                  <input type="checkbox" checked={ticks.includes(p.id)} onChange={() => toggle(p.id)} />
                  <span className={ticks.includes(p.id) ? "text-slate-500 line-through decoration-emerald-700/50" : ""}>{bn ? p.bn : p.en}</span>
                  {p.hazard !== "both" && <span className="ml-auto shrink-0 rounded-full bg-sky-50 px-2 py-0.5 text-[12px] font-semibold text-sky-800 ring-1 ring-sky-200">{p.hazard === "cyclone" ? T("ঘূর্ণিঝড়", "Cyclone") : T("বন্যা", "Flood")}</span>}
                </label>
              </li>
            ))}
          </ul>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {PREP_SOURCES.map((s) => <SourceTag key={s.url} confidence="official" label={s.label} url={s.url} checked={s.checked} />)}
          </div>
          <p className="mt-1 text-[12px] text-slate-500">{T("টিক চিহ্ন শুধু এই ফোনে থাকে।", "Ticks stay on this phone only.")}</p>
        </div>
      </div>
    </section>
  );
}

function Helplines({ bn, T }: Txt) {
  const groups = [
    { id: "emergency", bn: "জরুরি ও সুরক্ষা", en: "Emergency & safety" },
    { id: "money", bn: "টাকা ও ভোক্তা অভিযোগ", en: "Money & consumer complaints" },
    { id: "disaster", bn: "দুর্যোগ", en: "Disaster" },
  ] as const;
  return (
    <section id="help" className="rk-section rk-card p-5 sm:p-6" aria-labelledby="help-title">
      <SectionHead id="help-title" icon={Phone} title={T("হেল্পলাইন", "Helplines")} sub={T("প্রতিটি নম্বর অফিসিয়াল সাইট থেকে নেওয়া, পাশে উৎস ও যাচাইয়ের তারিখ। কেউ ফোনে নিজেকে এসব প্রতিষ্ঠানের লোক বললে, ফোন কেটে এই নম্বরে নিজে ফোন করুন।", "Each number is from an official site, with source and check date. If a caller claims to be from one of these, hang up and call this number yourself.")} />
      {groups.map((g) => (
        <div key={g.id} className="mt-4 first:mt-0">
          <h3 className="text-[15px] font-bold text-slate-700">{bn ? g.bn : g.en}</h3>
          <ul className="mt-2 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {ROKKHA_HELPLINES.filter((h) => h.group === g.id).map((h) => (
              <li key={h.id} className="flex flex-col rounded-2xl bg-paper p-4 ring-1 ring-line">
                <div className="flex items-start justify-between gap-2">
                  <p className="min-w-0 text-[14.5px] font-bold leading-snug text-ink">{bn ? h.nameBn : h.nameEn}</p>
                  <a href={`tel:${h.number}`} className="kp-btn-primary min-h-[44px] shrink-0 rounded-xl px-3 py-1.5 font-mono text-[15px] font-bold" aria-label={`${bn ? h.nameBn : h.nameEn}: ${T("ফোন করুন", "call")} ${h.number}`}>{bn ? h.numberBn : h.number}</a>
                </div>
                <p className="mt-1 text-[13.5px] text-slate-700">{bn ? h.forBn : h.forEn}</p>
                {h.noteBn && <p className="mt-1 break-words text-[12.5px] text-slate-600">{h.noteBn}</p>}
                <div className="mt-auto pt-2"><SourceTag confidence="official" label={h.source.label} url={h.source.url} checked={h.source.checked} /></div>
              </li>
            ))}
          </ul>
        </div>
      ))}
      <p className="mt-4 flex items-start gap-2 text-[13px] text-slate-600"><CheckCircle2 size={16} className="mt-0.5 shrink-0 text-emerald-700" aria-hidden />
        <span>{T("ভোক্তা অভিযোগের আবেদনপত্র লিখতে ", "To draft a consumer complaint, open ")}<Link href="/chuktiguard#dncrp" className="font-semibold text-emerald-800 underline">{T("চুক্তিগার্ড", "ChuktiGuard")}</Link>{T("; প্রতারণার কল চেনার অনুশীলন করতে ", "; to practise spotting scam calls, try ")}<Link href="/probaho#scam" className="font-semibold text-emerald-800 underline">{T("প্রবাহ কোচ", "Probaho Coach")}</Link>{T("।", ".")}</span>
      </p>
    </section>
  );
}
