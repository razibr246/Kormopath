"use client";
import { useMemo, useState } from "react";
import { AlertTriangle, BadgeCheck, Ban, ExternalLink, ListChecks, MessageSquareWarning, Plus, ShieldCheck } from "lucide-react";
import { isPlausibleBmdc, isRealBookable, normalizeBdMobile, sanitizeDoctor, SPECIALTIES, type Doctor } from "@/lib/health/doctors";
import { PAYMENT_STATUS_LABEL, formatTaka, type PaymentStatus } from "@/lib/health/payments";
import { adminSetStatus, appendAudit } from "@/lib/health/booking";
import { StatusChip, T as tr, allDoctors, randBytes, useBookings, useDoctorAdmin, type AdminState } from "./shared";

// BMDC's own site points registered-doctor searches to this address (checked 2026-11-18 via the council's
// search page notice; the site blocks automated access, so open it in a browser).
const BMDC_VERIFY = { url: "https://verify.bmdc.org.bd/", checked: "2026-11-18" };

export function AdminDemo() {
  const [lang, setLang] = useState<"bn" | "en">("bn");
  const T = tr(lang);
  const bn = lang === "bn";
  const [admin, setAdmin] = useDoctorAdmin();
  const [bookings, setBookings] = useBookings();
  const [reason, setReason] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState("");
  const doctors = useMemo(() => allDoctors(admin), [admin]);
  const now = () => new Date().toISOString();
  const log = (s: AdminState, action: string, target: string, detail: string): AdminState => ({ ...s, audit: appendAudit(s.audit, { at: now(), action, target, detail }) });

  // --- doctor verification ---
  const [form, setForm] = useState<Record<string, { bmdc: string; date: string; fee: string; fu: string }>>({});
  const f = (id: string) => form[id] ?? { bmdc: "", date: "", fee: "", fu: "" };
  const setF = (id: string, k: "bmdc" | "date" | "fee" | "fu", v: string) => setForm((p) => ({ ...p, [id]: { ...f(id), [k]: v } }));

  const verify = (d: Doctor) => {
    const x = f(d.id);
    if (!isPlausibleBmdc(x.bmdc) || !/^\d{4}-\d{2}-\d{2}$/.test(x.date)) { setMsg(T("বিএমডিসি নম্বর ও যাচাইয়ের তারিখ দিন (বিএমডিসির সাইটে মিলিয়ে)।", "Enter the BMDC number and the date you checked it on BMDC's site.")); return; }
    setAdmin((s) => {
      if (d.demo) return log({ ...s, overrides: { ...s.overrides, [d.id]: { ...s.overrides[d.id], verified: true, bmdcNo: x.bmdc.trim(), bmdcCheckedOn: x.date } } }, "verify-demo", d.nameEn, `${x.bmdc} on ${x.date} (demo profile: stays non-bookable)`);
      return log({ ...s, realDoctors: s.realDoctors.map((r) => (r.id === d.id ? { ...r, verified: true, bmdcNo: x.bmdc.trim(), bmdcCheckedOn: x.date } : r)) }, "verify", d.nameEn, `${x.bmdc} on ${x.date}`);
    });
    setMsg(d.demo ? T("ডেমো প্রোফাইলে যাচাই চিহ্ন দেওয়া হলো — ডেমো ডাক্তার কখনো আসল বুকিং নেয় না।", "Marked verified on a demo profile — a demo doctor never takes real bookings.") : T("ডাক্তার যাচাই হলো।", "Doctor verified."));
  };
  const toggleSuspend = (d: Doctor) => setAdmin((s) => {
    const next = !d.suspended;
    if (d.demo) return log({ ...s, overrides: { ...s.overrides, [d.id]: { ...s.overrides[d.id], suspended: next } } }, next ? "suspend" : "unsuspend", d.nameEn, "");
    return log({ ...s, realDoctors: s.realDoctors.map((r) => (r.id === d.id ? { ...r, suspended: next } : r)) }, next ? "suspend" : "unsuspend", d.nameEn, "");
  });
  const setFees = (d: Doctor) => {
    const x = f(d.id);
    const fee = Math.round(Number(x.fee) * 100), fu = Math.round(Number(x.fu) * 100);
    if (!(fee > 0) || !(fu >= 0)) { setMsg(T("ফি টাকায় লিখুন।", "Enter fees in taka.")); return; }
    setAdmin((s) => d.demo
      ? log({ ...s, overrides: { ...s.overrides, [d.id]: { ...s.overrides[d.id], feePoisha: fee, followUpFeePoisha: fu } } }, "set-fees", d.nameEn, `${fee}/${fu} poisha`)
      : log({ ...s, realDoctors: s.realDoctors.map((r) => (r.id === d.id ? { ...r, feePoisha: fee, followUpFeePoisha: fu } : r)) }, "set-fees", d.nameEn, `${fee}/${fu} poisha`));
    setMsg(T("ফি বদলানো হলো।", "Fees updated."));
  };

  // --- add a real doctor (device only) ---
  const [nd, setNd] = useState({ nameEn: "", nameBn: "", qualifications: "", specialtyId: "medicine", hospitalEn: "", phone: "", bmdc: "", date: "", fee: "", fu: "", slots: "10:00, 10:30, 19:00" });
  const addReal = () => {
    const phone = normalizeBdMobile(nd.phone);
    if (!nd.nameEn.trim() || !nd.qualifications.trim() || !phone || !isPlausibleBmdc(nd.bmdc) || !/^\d{4}-\d{2}-\d{2}$/.test(nd.date) || !(Number(nd.fee) > 0)) { setMsg(T("নাম, যোগ্যতা, পরামর্শের ফোন, বিএমডিসি নম্বর, যাচাইয়ের তারিখ ও ফি — সব লাগবে।", "Name, qualifications, consult phone, BMDC number, check date and fee are all required.")); return; }
    const id = `real-${Array.from(randBytes(6), (b) => b.toString(16).padStart(2, "0")).join("")}`;
    const doc = sanitizeDoctor({ id, nameEn: nd.nameEn, nameBn: nd.nameBn, qualifications: nd.qualifications, specialtyId: nd.specialtyId, designationEn: SPECIALTIES.find((s) => s.id === nd.specialtyId)?.en, designationBn: SPECIALTIES.find((s) => s.id === nd.specialtyId)?.bn, hospitalEn: nd.hospitalEn, hospitalBn: nd.hospitalEn, languages: ["bn", "en"], feePoisha: Math.round(Number(nd.fee) * 100), followUpFeePoisha: Math.round(Number(nd.fu || 0) * 100), days: [0, 1, 2, 3, 4, 6], slots: nd.slots.split(/[,\s]+/).filter(Boolean), types: ["audio", "video"], availability: "today", verified: true, bmdcNo: nd.bmdc.trim(), bmdcCheckedOn: nd.date, consultPhone: phone });
    if (!doc) return;
    setAdmin((s) => log({ ...s, realDoctors: [...s.realDoctors, doc] }, "add-real-doctor", doc.nameEn, `BMDC ${doc.bmdcNo} checked ${doc.bmdcCheckedOn}`));
    setMsg(T("আসল ডাক্তার যুক্ত হলো — শুধু এই ডিভাইসে দেখা যাবে।", "Real doctor added — visible on this device only."));
  };

  // --- payments ---
  const queue = bookings.filter((b) => b.status === "pending" || b.status === "verified").sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const decide = (id: string, to: PaymentStatus) => {
    const b = bookings.find((x) => x.id === id);
    const r = adminSetStatus(bookings, id, to, reason[id] ?? (to === "verified" ? "TrxID matched in the bKash app" : ""), now());
    if (!r.ok) { setMsg(r.error === "no_reason" ? T("কারণ লিখুন।", "Write a reason.") : r.error === "no_trx" ? T("TrxID নেই।", "No TrxID.") : T("এই অবস্থা থেকে বদলানো যায় না।", "Can't change from this status.")); return; }
    setBookings(r.list);
    setAdmin((s) => log(s, `payment-${to}`, b?.ref ?? id, `${b?.trxId ?? ""} ${reason[id] ?? ""}`.trim()));
    setMsg(`${b?.ref}: ${bn ? PAYMENT_STATUS_LABEL[to].bn : PAYMENT_STATUS_LABEL[to].en}`);
  };

  // --- complaints ---
  const [complaint, setComplaint] = useState({ ref: "", text: "" });
  const addComplaint = () => {
    if (!complaint.text.trim()) return;
    setAdmin((s) => log({ ...s, complaints: [...s.complaints, { id: `c-${Date.now()}`, at: now(), bookingRef: complaint.ref.trim(), text: complaint.text.trim(), status: "open" }] }, "complaint-open", complaint.ref || "-", complaint.text.slice(0, 80)));
    setComplaint({ ref: "", text: "" });
  };
  const resolve = (id: string) => setAdmin((s) => log({ ...s, complaints: s.complaints.map((c) => (c.id === id ? { ...c, status: "resolved" } : c)) }, "complaint-resolved", id, ""));

  const input = "min-h-[44px] rounded-xl border border-slate-300 bg-white px-3 text-[14.5px]";
  const card = "rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 space-y-4";

  return (
    <div className="space-y-6" data-testid="admin-demo">
      <section className="dr-rise space-y-3 rounded-2xl border-2 border-dashed border-amber-400 bg-amber-50 p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <h1 className="flex items-center gap-2 text-[clamp(26px,4vw,38px)] font-semibold leading-tight text-slate-900"><ShieldCheck size={28} className="text-amber-700" aria-hidden /> {T("অ্যাডমিন ডেমো", "Admin demo")}</h1>
          <button type="button" onClick={() => setLang(bn ? "en" : "bn")} className="kp-chip !h-10 !rounded-full !text-[13px] font-semibold">{bn ? "EN" : "বাং"}</button>
        </div>
        <p role="note" data-testid="admin-demo-banner" className="rounded-xl bg-red-700 px-4 py-3 text-[16px] font-bold leading-snug text-white">
          {T("ডেমো — শুধু এই ডিভাইসে। এখান থেকে কোনো টাকা নেওয়া যায় না, কোনো পেমেন্ট নম্বর দেখানো হয় না।", "Demo — this device only. It cannot take payments and never shows a payment number.")}
        </p>
        <p className="flex gap-2 text-[14.5px] leading-relaxed text-amber-950"><AlertTriangle size={18} className="mt-0.5 shrink-0" aria-hidden /> {T("লগইন নেই, সার্ভার নেই: এখানে যা করবেন তা শুধু এই ডিভাইসে থাকে। আসল সেবা চালাতে হলে এই কাজগুলো একটি সুরক্ষিত সার্ভারে, লগইনসহ করতে হবে।", "No login, no server: everything here stays on this device. Running a real service needs these steps on a secured server with logins.")}</p>
      </section>
      {msg && <p role="status" className="rounded-xl border border-sky-300 bg-sky-50 p-3 text-[14.5px] font-semibold text-sky-900">{msg}</p>}

      <section aria-labelledby="ad-doc" className={card} data-testid="admin-verify">
        <h2 id="ad-doc" className="flex items-center gap-2 text-[20px] font-extrabold text-slate-900"><BadgeCheck size={20} className="text-emerald-700" aria-hidden /> {T("ডাক্তার যাচাই, ফি ও স্থগিত", "Verify doctors, fees and suspension")}</h2>
        <p className="text-[14px] leading-relaxed text-slate-700">{T("নিবন্ধন যাচাই করুন বিএমডিসির নিজের সাইটে, তারপর নম্বর ও তারিখ লিখুন:", "Check the registration on BMDC's own site, then enter the number and date:")} <a href={BMDC_VERIFY.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-semibold text-sky-800 underline">verify.bmdc.org.bd <ExternalLink size={13} aria-hidden /></a> <span className="text-[12.5px] text-slate-500">({T("ঠিকানা যাচাই", "address checked")} {BMDC_VERIFY.checked})</span></p>
        <ul className="space-y-3">
          {doctors.map((d) => (
            <li key={d.id} className="space-y-2 rounded-xl border border-slate-200 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <strong className="text-[15.5px] text-slate-900">{bn ? d.nameBn : d.nameEn} {d.demo && <span className="text-[12.5px] font-semibold text-amber-800">({T("ডেমো", "demo")})</span>}</strong>
                <span className="text-[13px] text-slate-600">{d.verified ? `BMDC ${d.bmdcNo} · ${d.bmdcCheckedOn}` : T("যাচাই হয়নি", "not verified")} · {formatTaka(d.feePoisha, lang)}{d.suspended ? T(" · স্থগিত", " · suspended") : ""}{isRealBookable(d) ? T(" · আসল বুকিং খোলা", " · real booking open") : ""}</span>
              </div>
              <div className="flex flex-wrap gap-2">
                <input aria-label="BMDC" placeholder="BMDC (A-12345)" value={f(d.id).bmdc} onChange={(e) => setF(d.id, "bmdc", e.target.value)} className={`${input} w-36`} />
                <input aria-label={T("যাচাইয়ের তারিখ", "Checked on")} type="date" value={f(d.id).date} onChange={(e) => setF(d.id, "date", e.target.value)} className={input} />
                <button type="button" onClick={() => verify(d)} className="kp-btn-primary min-h-[44px] px-3 text-[14px]">{T("যাচাই চিহ্ন দিন", "Mark verified")}</button>
                <input aria-label={T("ফি (টাকা)", "Fee (taka)")} inputMode="decimal" placeholder={T("ফি ৳", "Fee ৳")} value={f(d.id).fee} onChange={(e) => setF(d.id, "fee", e.target.value)} className={`${input} w-24`} />
                <input aria-label={T("ফলো-আপ ফি (টাকা)", "Follow-up fee (taka)")} inputMode="decimal" placeholder={T("ফলো-আপ ৳", "Follow-up ৳")} value={f(d.id).fu} onChange={(e) => setF(d.id, "fu", e.target.value)} className={`${input} w-28`} />
                <button type="button" onClick={() => setFees(d)} className="kp-btn-ghost min-h-[44px] px-3 text-[14px]">{T("ফি রাখুন", "Save fees")}</button>
                <button type="button" onClick={() => toggleSuspend(d)} className="kp-btn-ghost inline-flex min-h-[44px] items-center gap-1 px-3 text-[14px] text-red-800"><Ban size={15} aria-hidden /> {d.suspended ? T("চালু করুন", "Reinstate") : T("স্থগিত", "Suspend")}</button>
              </div>
            </li>
          ))}
        </ul>
        <details className="rounded-xl border border-slate-200 p-3">
          <summary className="cursor-pointer text-[15px] font-bold text-slate-800"><Plus size={15} className="inline" aria-hidden /> {T("আসল ডাক্তার যুক্ত করুন (শুধু এই ডিভাইস)", "Add a real doctor (this device only)")}</summary>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <input className={input} placeholder="Name (English)" value={nd.nameEn} onChange={(e) => setNd({ ...nd, nameEn: e.target.value })} />
            <input className={input} placeholder="নাম (বাংলা)" value={nd.nameBn} onChange={(e) => setNd({ ...nd, nameBn: e.target.value })} />
            <input className={input} placeholder="MBBS, FCPS (…)" value={nd.qualifications} onChange={(e) => setNd({ ...nd, qualifications: e.target.value })} />
            <select className={input} value={nd.specialtyId} onChange={(e) => setNd({ ...nd, specialtyId: e.target.value })}>{SPECIALTIES.map((s) => <option key={s.id} value={s.id}>{bn ? s.bn : s.en}</option>)}</select>
            <input className={input} placeholder={T("হাসপাতাল/চেম্বার", "Hospital/chamber")} value={nd.hospitalEn} onChange={(e) => setNd({ ...nd, hospitalEn: e.target.value })} />
            <input className={input} placeholder={T("পরামর্শের ফোন 01…", "Consult phone 01…")} inputMode="tel" value={nd.phone} onChange={(e) => setNd({ ...nd, phone: e.target.value })} />
            <input className={input} placeholder="BMDC (A-12345)" value={nd.bmdc} onChange={(e) => setNd({ ...nd, bmdc: e.target.value })} />
            <input className={input} type="date" aria-label={T("বিএমডিসি যাচাইয়ের তারিখ", "BMDC checked on")} value={nd.date} onChange={(e) => setNd({ ...nd, date: e.target.value })} />
            <input className={input} placeholder={T("ফি ৳", "Fee ৳")} inputMode="decimal" value={nd.fee} onChange={(e) => setNd({ ...nd, fee: e.target.value })} />
            <input className={input} placeholder={T("ফলো-আপ ফি ৳", "Follow-up fee ৳")} inputMode="decimal" value={nd.fu} onChange={(e) => setNd({ ...nd, fu: e.target.value })} />
            <input className={`${input} sm:col-span-2`} placeholder="Slots: 10:00, 10:30" value={nd.slots} onChange={(e) => setNd({ ...nd, slots: e.target.value })} />
          </div>
          <button type="button" onClick={addReal} className="kp-btn-primary mt-3 min-h-[44px] px-4 text-[14px]">{T("যুক্ত করুন", "Add")}</button>
        </details>
      </section>

      <section aria-labelledby="ad-pay" className={card} data-testid="admin-payments">
        <h2 id="ad-pay" className="flex items-center gap-2 text-[20px] font-extrabold text-slate-900"><ListChecks size={20} className="text-sky-700" aria-hidden /> {T("বিকাশ পেমেন্ট যাচাই", "bKash payment verification")}</h2>
        <p className="text-[14px] leading-relaxed text-slate-700">{T("বিকাশ অ্যাপে প্রাপ্ত টাকার তালিকায় TrxID ও পরিমাণ মিলিয়ে তবেই \"যাচাই হয়েছে\" দিন। না মিললে কারণসহ \"ব্যর্থ\"।", "Mark \"Verified\" only after matching the TrxID and amount in the bKash app's received list. Otherwise \"Failed\" with a reason.")}</p>
        {queue.length === 0 ? <p className="text-[14.5px] text-slate-600">{T("যাচাইয়ের জন্য কিছু নেই।", "Nothing to verify.")}</p> : (
          <ul className="space-y-3">
            {queue.map((b) => (
              <li key={b.id} className="space-y-2 rounded-xl border border-slate-200 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[14.5px] text-slate-800"><span className="font-mono font-bold">{b.ref}</span> · {bn ? b.doctorNameBn : b.doctorNameEn} · {formatTaka(b.feePoisha, lang)} · TrxID <span className="font-mono">{b.trxId}</span>{b.demo ? T(" · ডেমো", " · demo") : ""}</span>
                  <StatusChip status={b.status} lang={lang} />
                </div>
                <div className="flex flex-wrap gap-2">
                  <input aria-label={T("কারণ / নোট", "Reason / note")} placeholder={T("কারণ / নোট", "Reason / note")} value={reason[b.id] ?? ""} onChange={(e) => setReason((r) => ({ ...r, [b.id]: e.target.value }))} className={`${input} min-w-0 flex-1`} />
                  {b.status === "pending" && <>
                    <button type="button" onClick={() => decide(b.id, "verified")} className="kp-btn-primary min-h-[44px] px-3 text-[14px]">{T("যাচাই হয়েছে", "Verified")}</button>
                    <button type="button" onClick={() => decide(b.id, "failed")} className="kp-btn-ghost min-h-[44px] px-3 text-[14px] text-red-800">{T("ব্যর্থ", "Failed")}</button>
                  </>}
                  {b.status === "verified" && <button type="button" onClick={() => decide(b.id, "refunded")} className="kp-btn-ghost min-h-[44px] px-3 text-[14px]">{T("টাকা ফেরত দেওয়া হয়েছে", "Refunded")}</button>}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="ad-comp" className={card}>
        <h2 id="ad-comp" className="flex items-center gap-2 text-[20px] font-extrabold text-slate-900"><MessageSquareWarning size={20} className="text-amber-700" aria-hidden /> {T("অভিযোগ", "Complaints")}</h2>
        <div className="flex flex-wrap gap-2">
          <input className={`${input} w-32`} placeholder="KP-…" value={complaint.ref} onChange={(e) => setComplaint({ ...complaint, ref: e.target.value })} />
          <input className={`${input} min-w-0 flex-1`} placeholder={T("অভিযোগ লিখুন", "Write the complaint")} value={complaint.text} onChange={(e) => setComplaint({ ...complaint, text: e.target.value })} />
          <button type="button" onClick={addComplaint} className="kp-btn-ghost min-h-[44px] px-3 text-[14px]">{T("যোগ করুন", "Add")}</button>
        </div>
        <ul className="space-y-2">
          {admin.complaints.map((c) => (
            <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 p-3 text-[14px]">
              <span className="min-w-0 text-slate-800">{c.bookingRef && <span className="font-mono">{c.bookingRef} · </span>}{c.text}</span>
              {c.status === "open" ? <button type="button" onClick={() => resolve(c.id)} className="kp-btn-ghost min-h-[40px] px-3 text-[13.5px]">{T("সমাধান হয়েছে", "Resolved")}</button> : <span className="text-[13px] font-semibold text-emerald-800">{T("সমাধান হয়েছে", "Resolved")}</span>}
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="ad-audit" className={card}>
        <h2 id="ad-audit" className="text-[20px] font-extrabold text-slate-900">{T("অডিট লগ (শুধু যোগ হয়)", "Audit log (append-only)")}</h2>
        {admin.audit.length === 0 ? <p className="text-[14.5px] text-slate-600">{T("এখনো কিছু নেই।", "Nothing yet.")}</p> : (
          <ol className="max-h-72 space-y-1 overflow-y-auto font-mono text-[12.5px] text-slate-700">
            {[...admin.audit].reverse().map((a, i) => <li key={`${a.at}-${i}`}>{a.at.slice(0, 16).replace("T", " ")} · {a.action} · {a.target}{a.detail ? ` · ${a.detail}` : ""}</li>)}
          </ol>
        )}
      </section>
    </div>
  );
}
