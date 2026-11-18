"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { AlertTriangle, CheckCircle2, ClipboardCopy, MessageSquareText, Phone, ShieldAlert, Video, X } from "lucide-react";
import { TYPE_LABEL, upcomingSlots, isRealBookable, type ConsultType, type Doctor } from "@/lib/health/doctors";
import { PAYMENT_CONFIG, formatTaka } from "@/lib/health/payments";
import { bookingMessage, createBooking, submitTrxId, type Booking } from "@/lib/health/booking";
import { bnNum, randBytes, StatusChip, T as tr, useBookings } from "./shared";

const STEPS = [
  { bn: "ধরন", en: "Type" },
  { bn: "সময়", en: "Time" },
  { bn: "ফি দেখুন", en: "Fee" },
  { bn: "পেমেন্ট", en: "Payment" },
];

const BOOK_ERR: Record<string, { bn: string; en: string }> = {
  slot_taken: { bn: "এই সময়টি ইতিমধ্যে বুক করা আছে। আরেকটি সময় বেছে নিন।", en: "This slot is already booked. Pick another time." },
  not_bookable: { bn: "এই ডাক্তার এখনো যাচাই হননি, তাই আসল বুকিং নেওয়া যাবে না।", en: "This doctor is not verified yet, so real bookings are closed." },
  type_unavailable: { bn: "এই ডাক্তার এই ধরনের পরামর্শ দেন না।", en: "This doctor does not offer this consultation type." },
  suspended: { bn: "এই প্রোফাইল এখন বন্ধ আছে।", en: "This profile is suspended." },
  no_parent: { bn: "ফলো-আপের জন্য আগের একটি যাচাই হওয়া পরামর্শ লাগবে।", en: "A follow-up needs an earlier verified consultation." },
};
const TRX_ERR: Record<string, { bn: string; en: string }> = {
  pin_like: { bn: "এটা পিন বা ওটিপির মতো দেখাচ্ছে। পিন/ওটিপি কাউকে দেবেন না — এখানে শুধু বিকাশের কনফার্মেশন এসএমএসের TrxID লিখুন।", en: "That looks like a PIN or OTP. Never share those — enter only the TrxID from bKash's confirmation SMS." },
  format: { bn: "TrxID ঠিক মনে হচ্ছে না: ৮–১২টি ইংরেজি অক্ষর ও সংখ্যা, এসএমএসে যেমন আছে।", en: "That TrxID doesn't look right: 8–12 letters and digits, as in the SMS." },
  duplicate: { bn: "এই TrxID আগেই আরেকটি বুকিংয়ে ব্যবহার হয়েছে।", en: "This TrxID was already used for another booking." },
  wrong_status: { bn: "এই বুকিংয়ের পেমেন্ট এখন বদলানো যাবে না।", en: "This booking's payment can't be changed now." },
  not_found: { bn: "বুকিং পাওয়া যায়নি।", en: "Booking not found." },
};

export function BookingFlow({ doctor, lang, onClose, followUpOf }: { doctor: Doctor; lang: "bn" | "en"; onClose: () => void; followUpOf?: Booking | null }) {
  const T = tr(lang);
  const bn = lang === "bn";
  const [bookings, setBookings] = useBookings();
  const [type, setType] = useState<ConsultType | null>(followUpOf?.type ?? null);
  const [slot, setSlot] = useState<string>("");
  const [note, setNote] = useState("");
  const [booking, setBooking] = useState<Booking | null>(null);
  const [trx, setTrx] = useState("");
  const [err, setErr] = useState("");
  const [copied, setCopied] = useState(false);
  const real = isRealBookable(doctor);
  const slots = useMemo(() => upcomingSlots(doctor, new Date(), 7), [doctor]);
  const taken = new Set(bookings.filter((b) => b.doctorId === doctor.id && b.status !== "failed" && b.status !== "refunded").map((b) => `${b.date} ${b.time}`));
  const fee = followUpOf ? doctor.followUpFeePoisha : doctor.feePoisha;
  const live = booking ? bookings.find((b) => b.id === booking.id) ?? booking : null;
  const step = live ? (live.status === "unpaid" ? 3 : 4) : !type ? 0 : !slot ? 1 : 2;

  const confirm = () => {
    if (!type || !slot) return;
    const [date, time] = slot.split(" ");
    const r = createBooking(bookings, { doctor, type, date, time, kind: followUpOf ? "followup" : "new", parentId: followUpOf?.id ?? null, patientNote: note }, new Date().toISOString(), randBytes);
    if (!r.ok) { setErr(bn ? BOOK_ERR[r.error].bn : BOOK_ERR[r.error].en); return; }
    setErr("");
    setBookings((prev) => [...prev, r.booking]);
    setBooking(r.booking);
  };
  const sendTrx = () => {
    if (!live) return;
    const r = submitTrxId(bookings, live.id, trx, new Date().toISOString());
    if (!r.ok) { setErr(bn ? TRX_ERR[r.error].bn : TRX_ERR[r.error].en); return; }
    setErr("");
    setBookings(r.list);
  };
  const msg = live ? bookingMessage(live, lang) : "";
  const copy = async () => { try { await navigator.clipboard.writeText(msg); setCopied(true); window.setTimeout(() => setCopied(false), 2000); } catch { /* ignore */ } };

  return (
    <section aria-labelledby="book-h" className="dr-rise space-y-5 rounded-2xl border-2 border-sky-300 bg-white p-5 sm:p-6" data-testid="book-start">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[13px] font-semibold text-sky-800">{followUpOf ? T("ফলো-আপ পরামর্শ", "Follow-up consultation") : T("পরামর্শ বুক করুন", "Book a consultation")}</p>
          <h2 id="book-h" className="text-[clamp(21px,3vw,27px)] font-semibold leading-tight text-slate-900">{bn ? doctor.nameBn : doctor.nameEn}</h2>
          <p className="text-[14px] text-slate-600">{bn ? doctor.designationBn : doctor.designationEn} · {doctor.qualifications}</p>
        </div>
        <button type="button" onClick={onClose} aria-label={T("বন্ধ করুন", "Close")} className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50"><X size={18} aria-hidden /></button>
      </div>

      {doctor.demo && (
        <div className="flex gap-2 rounded-xl border-2 border-dashed border-amber-400 bg-amber-50 p-3 text-[14px] leading-relaxed text-amber-950" data-testid="demo-pay-banner">
          <AlertTriangle size={18} className="mt-0.5 shrink-0" aria-hidden />
          <span><strong>{T("ডেমো — কোনো টাকা পাঠাবেন না।", "Demo — do not send any money.")}</strong> {T("এটি কাল্পনিক ডাক্তার। পুরো ধাপগুলো দেখানোর জন্য; কোনো ডাক্তারকে বুকিং যায় না, কল হয় না।", "This is a fictional doctor. The steps are shown for practice only; no booking reaches a doctor and no call happens.")}</span>
        </div>
      )}

      {/* Four-step progress path */}
      <ol className="dr-path" style={{ ["--dr-progress" as string]: String(Math.min(step, 3) / 3) }} aria-label={T("বুকিংয়ের ধাপ", "Booking steps")}>
        <span className="dr-path-fill" aria-hidden />
        {STEPS.map((s, i) => (
          <li key={s.en} className={`dr-node ${i < step ? "dr-node-done" : i === step ? "dr-node-now" : ""}`} aria-current={i === step ? "step" : undefined}>
            <span className="dr-node-dot">{i < step ? "✓" : bnNum(i + 1)}</span>
            <span className="text-[13px] font-semibold leading-[1.4] text-slate-700">{bn ? s.bn : s.en}</span>
          </li>
        ))}
      </ol>

      {!live && (
        <>
          <fieldset data-testid="book-type">
            <legend className="mb-2 text-[15px] font-bold text-slate-800">{T("১. কীভাবে কথা বলবেন?", "1. How will you consult?")}</legend>
            <div className="flex flex-wrap gap-2">
              {doctor.types.map((t) => (
                <button key={t} type="button" aria-pressed={type === t} onClick={() => setType(t)} className={`inline-flex min-h-[48px] items-center gap-2 rounded-xl border px-4 text-[15px] font-semibold leading-[1.4] ${type === t ? "border-sky-700 bg-sky-700 text-white" : "border-slate-300 bg-white text-slate-800 hover:border-sky-400"}`}>
                  {t === "video" ? <Video size={17} aria-hidden /> : <Phone size={17} aria-hidden />} {bn ? TYPE_LABEL[t].bn : TYPE_LABEL[t].en}
                </button>
              ))}
            </div>
          </fieldset>

          {type && (
            <fieldset data-testid="book-slot">
              <legend className="mb-2 text-[15px] font-bold text-slate-800">{T("২. সময় বেছে নিন (ঢাকার সময়)", "2. Pick a time (Dhaka time)")}</legend>
              {slots.length === 0 ? <p className="text-[14px] text-slate-600">{T("আগামী ৭ দিনে কোনো সময় খালি নেই।", "No free time in the next 7 days.")}</p> : (
                <div className="flex max-h-56 flex-wrap gap-2 overflow-y-auto">
                  {slots.map((s) => {
                    const busy = taken.has(s.key);
                    return (
                      <button key={s.key} type="button" disabled={busy} aria-pressed={slot === s.key} onClick={() => setSlot(s.key)} className={`min-h-[44px] rounded-xl border px-3 font-mono text-[14px] ${slot === s.key ? "border-sky-700 bg-sky-700 text-white" : busy ? "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400 line-through" : "border-slate-300 bg-white text-slate-800 hover:border-sky-400"}`}>
                        {bn ? bnNum(s.date.slice(5).split("-").reverse().join("/")) : s.date.slice(5).split("-").reverse().join("/")} · {bn ? bnNum(s.time) : s.time}
                      </button>
                    );
                  })}
                </div>
              )}
            </fieldset>
          )}

          {type && slot && (
            <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-[15px] font-bold text-slate-800">{T("৩. ফি — বুক করার আগেই", "3. Fee — before you book")}</p>
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-[14.5px] text-slate-700">{bn ? TYPE_LABEL[type].bn : TYPE_LABEL[type].en}{followUpOf ? T(" · ফলো-আপ", " · follow-up") : ""}</span>
                <span className="font-mono text-[24px] font-bold text-slate-900">{formatTaka(fee, lang)}</span>
              </div>
              <p className="text-[13px] text-slate-600">{T("এর বাইরে কোনো চার্জ নেই। বিকাশে পাঠানোর খরচ (যদি থাকে) বিকাশ নিজে দেখায়।", "No other charges. Any bKash sending charge is shown by bKash itself.")}{doctor.demo ? T(" (ডেমো ফি)", " (demo fee)") : ""}</p>
              <label className="block text-[13.5px] font-semibold text-slate-700">{T("ডাক্তারকে কিছু জানাতে চাইলে (ঐচ্ছিক, বুকিং বার্তায় যাবে)", "Anything for the doctor (optional, goes in the booking message)")}
                <textarea value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} rows={2} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-[15px] leading-[1.6]" />
              </label>
              <button type="button" onClick={confirm} className="kp-btn-primary inline-flex min-h-[48px] items-center gap-2 px-5 text-[15px]">{T("বুকিং তৈরি করুন", "Create booking")}</button>
            </div>
          )}
        </>
      )}

      {live && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
            <span className="text-[14px] text-slate-700">{T("রেফারেন্স", "Reference")}: <strong className="font-mono text-slate-900">{live.ref}</strong> · {formatTaka(live.feePoisha, lang)}</span>
            <StatusChip status={live.status} lang={lang} />
          </div>

          {live.status === "unpaid" && (
            <div className="space-y-3 rounded-xl border border-sky-200 bg-sky-50/50 p-4">
              <p className="text-[15px] font-bold text-slate-800">{T("৪. বিকাশে পেমেন্ট", "4. Pay with bKash")}</p>
              <ol className="list-decimal space-y-1 pl-5 text-[14.5px] leading-relaxed text-slate-700">
                <li>{T("বিকাশ অ্যাপে \"সেন্ড মানি\" বেছে নিন।", "In the bKash app choose \"Send Money\".")}</li>
                <li>{T("নম্বর", "Number")}: {real && !live.demo
                  ? <strong className="font-mono text-[16px] text-slate-900">{PAYMENT_CONFIG.receiver}</strong>
                  : <strong className="text-amber-800">{T("যাচাইকৃত ডাক্তার যুক্ত হলে নম্বর দেখাবে", "shown once a verified doctor is added")}</strong>}</li>
                <li>{T("টাকা", "Amount")}: <strong className="font-mono">{formatTaka(live.feePoisha, lang)}</strong> · {T("রেফারেন্সে লিখুন", "Reference")}: <strong className="font-mono">{live.ref}</strong></li>
                <li>{T("বিকাশের কনফার্মেশন এসএমএস থেকে TrxID নিচে লিখুন।", "Enter the TrxID from bKash's confirmation SMS below.")}</li>
              </ol>
              <p className="flex gap-2 rounded-lg bg-white p-2.5 text-[13.5px] font-semibold text-red-800"><ShieldAlert size={16} className="mt-0.5 shrink-0" aria-hidden /> {T("টাকা নিতে বিকাশের পিন বা ওটিপি কখনো লাগে না। কেউ চাইলে দেবেন না।", "Receiving money never needs your bKash PIN or OTP. Never give them to anyone.")}</p>
              <div className="flex flex-wrap gap-2">
                <label className="sr-only" htmlFor="pay-trx">TrxID</label>
                <input id="pay-trx" value={trx} onChange={(e) => setTrx(e.target.value)} placeholder="TrxID, e.g. 9A8B7C6D5E" autoComplete="off" inputMode="text" maxLength={20} className="min-h-[48px] min-w-0 flex-1 rounded-xl border border-slate-300 px-3 font-mono text-[15px] uppercase" data-testid="pay-trxid" />
                <button type="button" onClick={sendTrx} disabled={!trx.trim()} className="kp-btn-primary min-h-[48px] px-5 text-[15px] disabled:opacity-50" data-testid="pay-submit">{T("জমা দিন", "Submit")}</button>
              </div>
            </div>
          )}

          {live.status !== "unpaid" && (
            <div className="space-y-3">
              <p className="flex gap-2 text-[15px] leading-relaxed text-slate-800"><CheckCircle2 size={18} className="mt-0.5 shrink-0 text-sky-700" aria-hidden />
                {live.demo
                  ? T("ডেমো বুকিং: যাচাইয়ের ধাপ দেখানো হলো। কোনো টাকা নেওয়া হয়নি, কোনো ডাক্তারকে কিছু পাঠানো হয়নি।", "Demo booking: the verification step is shown. No money was taken and nothing went to a doctor.")
                  : T("TrxID জমা হয়েছে। এই অ্যাপের কোনো সার্ভার নেই, তাই নিচের বুকিং বার্তাটি ক্লিনিক অপারেটরকে পাঠান। তিনি বিকাশে টাকা মিলিয়ে নিশ্চিত করলে তবেই বুকিং নিশ্চিত হবে।", "TrxID submitted. This app has no server, so send the booking message below to the clinic operator. The booking is confirmed only after they match the payment in bKash.")}
              </p>
              <pre className="whitespace-pre-wrap rounded-xl border border-slate-200 bg-slate-50 p-3 font-mono text-[13px] leading-[1.6] text-slate-800">{msg}</pre>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={copy} className="kp-btn-ghost inline-flex min-h-[44px] items-center gap-2 px-4 text-[14px]"><ClipboardCopy size={16} aria-hidden /> {copied ? T("কপি হয়েছে", "Copied") : T("বার্তা কপি", "Copy message")}</button>
                {real && !live.demo && <>
                  <a href={`sms:${PAYMENT_CONFIG.receiver}?body=${encodeURIComponent(msg)}`} className="kp-btn-ghost inline-flex min-h-[44px] items-center gap-2 px-4 text-[14px]"><MessageSquareText size={16} aria-hidden /> SMS</a>
                  <a href={`https://wa.me/88${PAYMENT_CONFIG.receiver}?text=${encodeURIComponent(msg)}`} target="_blank" rel="noopener noreferrer" className="kp-btn-ghost inline-flex min-h-[44px] items-center gap-2 px-4 text-[14px]">WhatsApp</a>
                </>}
                <Link href="/mediscan/appointments" className="kp-btn-primary inline-flex min-h-[44px] items-center px-4 text-[14px]">{T("আমার অ্যাপয়েন্টমেন্ট", "My appointments")}</Link>
              </div>
            </div>
          )}
        </div>
      )}

      {err && <p role="alert" className="rounded-xl border border-red-300 bg-red-50 p-3 text-[14px] font-semibold text-red-800">{err}</p>}
    </section>
  );
}
