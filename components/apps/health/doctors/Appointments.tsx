"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { BadgeCheck, CalendarCheck, Download, Phone, Repeat, Video } from "lucide-react";
import { downloadText } from "@/lib/clientStore";
import { TYPE_LABEL, type Doctor } from "@/lib/health/doctors";
import { formatTaka } from "@/lib/health/payments";
import { canJoin, meetingUrl, receiptText, type Booking } from "@/lib/health/booking";
import { BookingFlow } from "./BookingFlow";
import { StatusChip, T as tr, allDoctors, bnNum, useBookings, useDoctorAdmin } from "./shared";

export function Appointments() {
  const [lang, setLang] = useState<"bn" | "en">("bn");
  const T = tr(lang);
  const bn = lang === "bn";
  const [bookings] = useBookings();
  const [admin] = useDoctorAdmin();
  const [followUp, setFollowUp] = useState<{ doctor: Doctor; parent: Booking } | null>(null);
  const doctors = useMemo(() => allDoctors(admin), [admin]);
  const [nowKey] = useState(() => { const t = new Date(Date.now() + 6 * 3_600_000).toISOString(); return `${t.slice(0, 10)} ${t.slice(11, 16)}`; });
  const sorted = [...bookings].sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`));
  const upcoming = sorted.filter((b) => `${b.date} ${b.time}` >= nowKey && b.status !== "refunded");
  const past = sorted.filter((b) => !upcoming.includes(b)).reverse();

  const card = (b: Booking) => {
    const doc = doctors.find((d) => d.id === b.doctorId);
    const joinable = canJoin(b);
    return (
      <li key={b.id} className="dr-rise space-y-3 rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="text-[17px] font-bold text-slate-900">{bn ? b.doctorNameBn : b.doctorNameEn}</h3>
            <p className="text-[14px] text-slate-700">{bn ? TYPE_LABEL[b.type].bn : TYPE_LABEL[b.type].en}{b.kind === "followup" ? T(" · ফলো-আপ", " · follow-up") : ""} · <span className="font-mono">{bn ? bnNum(`${b.date} ${b.time}`) : `${b.date} ${b.time}`}</span></p>
            <p className="text-[13px] text-slate-600">{T("রেফারেন্স", "Ref")} <span className="font-mono">{b.ref}</span> · {formatTaka(b.feePoisha, lang)}{b.trxId ? <> · TrxID <span className="font-mono">{b.trxId}</span></> : null}</p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <StatusChip status={b.status} lang={lang} />
            {b.status === "verified" && (b.demo
              ? <span className="dr-stamp dr-stamp-demo text-[13px]">{T("ডেমো যাচাই", "Demo check")}</span>
              : <span className="dr-stamp dr-stamp-in text-[13px]"><BadgeCheck size={15} aria-hidden /> {T("পেমেন্ট যাচাইকৃত", "Payment verified")}</span>)}
          </div>
        </div>
        {b.demo && <p className="text-[13px] font-semibold text-amber-800">{T("ডেমো বুকিং — কোনো টাকা নেওয়া হয়নি, কোনো কল হবে না।", "Demo booking — no money taken, no call will happen.")}</p>}
        <div className="flex flex-wrap gap-2">
          {joinable && b.type === "video" && b.room && <a href={meetingUrl(b.room)} target="_blank" rel="noopener noreferrer" className="kp-btn-primary inline-flex min-h-[44px] items-center gap-2 px-4 text-[14px]"><Video size={16} aria-hidden /> {T("ভিডিও কলে যোগ দিন", "Join video call")}</a>}
          {joinable && b.type === "audio" && doc?.consultPhone && <a href={`tel:${doc.consultPhone}`} className="kp-btn-primary inline-flex min-h-[44px] items-center gap-2 px-4 text-[14px]"><Phone size={16} aria-hidden /> {T("ডাক্তারকে কল করুন", "Call the doctor")}</a>}
          {!joinable && (b.type !== "inperson") && <span className="inline-flex min-h-[44px] items-center rounded-xl border border-dashed border-slate-300 px-3 text-[13.5px] text-slate-600">{b.demo ? T("ডেমোতে কল খোলে না", "Calls don't open in demo") : T("পেমেন্ট যাচাই হলে কলের লিংক খুলবে", "The call opens once payment is verified")}</span>}
          {b.status === "verified" && doc && <button type="button" onClick={() => { setFollowUp({ doctor: doc, parent: b }); window.scrollTo({ top: 0, behavior: "smooth" }); }} className="kp-btn-ghost inline-flex min-h-[44px] items-center gap-2 px-4 text-[14px]"><Repeat size={16} aria-hidden /> {T("ফলো-আপ নিন", "Book follow-up")} ({formatTaka(doc.followUpFeePoisha, lang)})</button>}
          <button type="button" onClick={() => downloadText(`receipt-${b.ref}.txt`, receiptText(b, lang), "text/plain;charset=utf-8")} className="kp-btn-ghost inline-flex min-h-[44px] items-center gap-2 px-4 text-[14px]"><Download size={16} aria-hidden /> {T("রসিদ", "Receipt")}</button>
        </div>
        {joinable && b.type === "video" && <p className="text-[12.5px] leading-relaxed text-slate-600">{T("ভিডিও কল হয় Jitsi Meet-এ (meet.jit.si)। রুম প্রথম খোলেন যিনি, তাঁকে (সাধারণত ডাক্তার) Google, GitHub বা Facebook দিয়ে সাইন ইন করতে হয়; রোগীর অ্যাকাউন্ট লাগে না। কল রেকর্ড করা হয় না।", "Video calls run on Jitsi Meet (meet.jit.si). The person who opens the room first (usually the doctor) must sign in with Google, GitHub or Facebook; patients need no account. Calls are not recorded.")}</p>}
      </li>
    );
  };

  return (
    <div className="space-y-6" data-testid="appointments">
      <section className="dr-rise rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[13px] font-semibold text-sky-800">{T("এই ফোনে রাখা বুকিং", "Bookings kept on this phone")}</p>
            <h1 className="mt-1 flex items-center gap-2 text-[clamp(28px,4.5vw,42px)] font-semibold leading-[1.1] text-slate-900"><CalendarCheck size={30} className="text-sky-700" aria-hidden /> {T("আমার অ্যাপয়েন্টমেন্ট", "My appointments")}</h1>
          </div>
          <button type="button" onClick={() => setLang(bn ? "en" : "bn")} className="kp-chip !h-10 !rounded-full !text-[13px] font-semibold">{bn ? "EN" : "বাং"}</button>
        </div>
      </section>

      {followUp && <BookingFlow doctor={followUp.doctor} lang={lang} followUpOf={followUp.parent} onClose={() => setFollowUp(null)} />}

      {bookings.length === 0 ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-6 text-center">
          <p className="text-[15.5px] text-slate-700">{T("এখনো কোনো বুকিং নেই।", "No bookings yet.")}</p>
          <Link href="/mediscan/doctors" className="kp-btn-primary mt-4 inline-flex min-h-[48px] items-center px-5 text-[15px]">{T("ডাক্তার খুঁজুন", "Find a doctor")}</Link>
        </section>
      ) : (
        <>
          <section aria-labelledby="up-h" className="space-y-3">
            <h2 id="up-h" className="text-[clamp(21px,3vw,27px)] font-semibold text-slate-900">{T("সামনের", "Upcoming")}</h2>
            {upcoming.length ? <ul className="space-y-3">{upcoming.map(card)}</ul> : <p className="text-[15px] text-slate-600">{T("সামনে কোনো অ্যাপয়েন্টমেন্ট নেই।", "Nothing upcoming.")}</p>}
          </section>
          {past.length > 0 && (
            <section aria-labelledby="past-h" className="space-y-3">
              <h2 id="past-h" className="text-[clamp(21px,3vw,27px)] font-semibold text-slate-900">{T("আগের ও বাতিল", "Past and cancelled")}</h2>
              <ul className="space-y-3">{past.map(card)}</ul>
            </section>
          )}
        </>
      )}
    </div>
  );
}
