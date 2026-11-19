"use client";
import { useState } from "react";
import {
  FileText,
  Copy,
  Check,
  Download,
  Printer,
  Sparkles,
  ShieldCheck,
  Info,
} from "lucide-react";
import {
  generateTenancyAgreement,
  type TenancyAgreementData,
  type FlatMessListing,
} from "@/lib/flatMess";
import { downloadText } from "@/lib/clientStore";

interface FlatAgreementViewProps {
  initialListing?: FlatMessListing | null;
}

export function FlatAgreementView({ initialListing }: FlatAgreementViewProps) {
  const [lang, setLang] = useState<"bn" | "en">("bn");
  const [ownerName, setOwnerName] = useState(initialListing?.contactName || "");
  const [tenantName, setTenantName] = useState("");
  const [tenantNid, setTenantNid] = useState("");
  const [tenantPhone, setTenantPhone] = useState("");
  const [address, setAddress] = useState(
    initialListing ? `${initialListing.address || initialListing.area}, ${initialListing.city}` : ""
  );
  const [rentTaka, setRentTaka] = useState(
    initialListing ? String(initialListing.rentPoisha / 100) : "8000"
  );
  const [advanceTaka, setAdvanceTaka] = useState(
    initialListing ? String(initialListing.advancePoisha / 100) : "16000"
  );
  const [dueDay, setDueDay] = useState("7");
  const [noticeMonths, setNoticeMonths] = useState("1");
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [billsNote, setBillsNote] = useState(
    initialListing?.billsIncluded
      ? "গ্যাস, পানি ও সাধারণ ময়লা বিল ভাড়ার অন্তর্ভুক্ত। ওয়াইফাই ও ব্যক্তিগত বিদ্যুৎ বিল সমানভাবে বণ্টন হবে।"
      : "বিদ্যুৎ, গ্যাস, পানি, ময়লা বিল এবং ওয়াইফাই বিল সকল সদস্য সমানভাবে বহন করবেন।"
  );
  const [customRules, setCustomRules] = useState(
    initialListing?.rules?.join(", ") ||
      "মেসের অভ্যন্তরে ধূমপান বা মাদক সম্পূর্ণ নিষিদ্ধ, রাত ১১টায় প্রধান গেট বন্ধ"
  );
  const [copied, setCopied] = useState(false);

  const agreementData: TenancyAgreementData = {
    ownerName,
    tenantName,
    tenantNidOrStudentId: tenantNid,
    tenantPhone,
    flatOrMessAddress: address,
    rentAmountTaka: Number(rentTaka) || 0,
    advanceDepositTaka: Number(advanceTaka) || 0,
    dueDayOfMonth: Number(dueDay) || 7,
    noticeMonths: Number(noticeMonths) || 1,
    startDate,
    electricityAndBillsNote: billsNote,
    customRules: customRules
      .split(/[,;\n]/)
      .map((r) => r.trim())
      .filter(Boolean),
  };

  const agreementText = generateTenancyAgreement(agreementData, lang);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(agreementText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  const handleDownload = () => {
    const filename = `tenancy-agreement-${startDate}.txt`;
    downloadText(filename, agreementText, "text/plain;charset=utf-8");
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6" data-testid="flat-agreement-view">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-0.5 text-[12px] font-bold text-slate-800">
            <ShieldCheck size={14} className="text-emerald-700" />
            <span>আইনি সুরক্ষা ও স্বচ্ছতা</span>
          </div>
          <h3 className="mt-1 text-[20px] font-extrabold text-slate-900">
            মেস ও ফ্ল্যাট ভাড়ার অঙ্গীকারনামা ও চুক্তিপত্রের খসড়া
          </h3>
          <p className="text-[13.5px] text-slate-600">
            অগ্রিম টাকা ফেরত, নোটিশ পিরিয়ড এবং মেস শৃঙ্খলা নিয়ে বাড়িওয়ালা বা ম্যানেজারের সাথে লিখিত চুক্তি তৈরি করুন।
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setLang(lang === "bn" ? "en" : "bn")}
            className="rounded-full border border-slate-300 px-3.5 py-1 text-[13px] font-bold hover:bg-slate-50 min-h-[44px] min-w-[44px]"
          >
            {lang === "bn" ? "English Draft" : "বাংলা খসড়া"}
          </button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        {/* Form Controls */}
        <div className="lg:col-span-5 space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <h4 className="text-[16px] font-bold text-slate-900 border-b border-slate-100 pb-2">
            চুক্তির পক্ষ ও শর্তাবলী পূরণ করুন
          </h4>

          <div className="space-y-3">
            <div>
              <label className="block text-[13px] font-bold text-slate-800">
                বাড়িওয়ালা / মেস ম্যানেজারের নাম
              </label>
              <input
                type="text"
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
                placeholder="যেমন: জনাব মোঃ সেলিম"
                className="mt-1 w-full min-h-[40px] rounded-xl border border-slate-300 px-3 text-[14px] min-h-[44px]"
              />
            </div>

            <div>
              <label className="block text-[13px] font-bold text-slate-800">
                ভাড়াটিয়া / মেস সদস্যের নাম
              </label>
              <input
                type="text"
                value={tenantName}
                onChange={(e) => setTenantName(e.target.value)}
                placeholder="যেমন: আরিফুল ইসলাম"
                className="mt-1 w-full min-h-[40px] rounded-xl border border-slate-300 px-3 text-[14px] min-h-[44px]"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[12.5px] font-bold text-slate-800">
                  জাতীয় পরিচয়পত্র / স্টুডেন্ট আইডি
                </label>
                <input
                  type="text"
                  value={tenantNid}
                  onChange={(e) => setTenantNid(e.target.value)}
                  placeholder="NID বা Varsity ID"
                  className="mt-1 w-full min-h-[40px] rounded-xl border border-slate-300 px-3 text-[13.5px] min-h-[44px]"
                />
              </div>

              <div>
                <label className="block text-[12.5px] font-bold text-slate-800">মোবাইল নম্বর</label>
                <input
                  type="tel"
                  value={tenantPhone}
                  onChange={(e) => setTenantPhone(e.target.value)}
                  placeholder="01XXXXXXXXX"
                  className="mt-1 w-full min-h-[40px] rounded-xl border border-slate-300 px-3 text-[13.5px] font-mono min-h-[44px]"
                />
              </div>
            </div>

            <div>
              <label className="block text-[13px] font-bold text-slate-800">বাসা/মেসের ঠিকানা</label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="রোড, বাড়ি, ফ্ল্যাট নং, এলাকা"
                className="mt-1 w-full min-h-[40px] rounded-xl border border-slate-300 px-3 text-[14px] min-h-[44px]"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[12.5px] font-bold text-slate-800">
                  মাসিক ভাড়া (টাকা)
                </label>
                <input
                  type="text"
                  value={rentTaka}
                  onChange={(e) => setRentTaka(e.target.value)}
                  className="mt-1 w-full min-h-[40px] rounded-xl border border-slate-300 px-3 text-[14px] font-mono font-bold text-emerald-900 min-h-[44px]"
                />
              </div>

              <div>
                <label className="block text-[12.5px] font-bold text-slate-800">
                  অগ্রিম জামানত (টাকা)
                </label>
                <input
                  type="text"
                  value={advanceTaka}
                  onChange={(e) => setAdvanceTaka(e.target.value)}
                  className="mt-1 w-full min-h-[40px] rounded-xl border border-slate-300 px-3 text-[14px] font-mono font-bold min-h-[44px]"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[12.5px] font-bold text-slate-800">
                  ভাড়া দেওয়ার তারিখ (মাসের)
                </label>
                <input
                  type="number"
                  min="1"
                  max="28"
                  value={dueDay}
                  onChange={(e) => setDueDay(e.target.value)}
                  className="mt-1 w-full min-h-[40px] rounded-xl border border-slate-300 px-3 text-[14px] min-h-[44px]"
                />
              </div>

              <div>
                <label className="block text-[12.5px] font-bold text-slate-800">
                  নোটিশ পিরিয়ড (মাস)
                </label>
                <input
                  type="number"
                  min="1"
                  max="6"
                  value={noticeMonths}
                  onChange={(e) => setNoticeMonths(e.target.value)}
                  className="mt-1 w-full min-h-[40px] rounded-xl border border-slate-300 px-3 text-[14px] min-h-[44px]"
                />
              </div>
            </div>

            <div>
              <label className="block text-[13px] font-bold text-slate-800">বিল সংক্রান্ত শর্ত</label>
              <textarea
                rows={2}
                value={billsNote}
                onChange={(e) => setBillsNote(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-300 p-2.5 text-[13px] min-h-[44px]"
              />
            </div>

            <div>
              <label className="block text-[13px] font-bold text-slate-800">
                বিশেষ নিয়মাবলী (কমা দিয়ে)
              </label>
              <textarea
                rows={2}
                value={customRules}
                onChange={(e) => setCustomRules(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-300 p-2.5 text-[13px] min-h-[44px]"
              />
            </div>
          </div>
        </div>

        {/* Live Formatted Draft Display */}
        <div className="lg:col-span-7 space-y-4">
          <div className="rounded-2xl border border-slate-300 bg-slate-50/70 p-5 sm:p-6 shadow-inner space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3">
              <span className="text-[13px] font-bold text-slate-700 flex items-center gap-1.5">
                <FileText size={16} className="text-emerald-700" />
                <span>প্রিন্ট ও কপি করার উপযোগী খসড়া</span>
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopy}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-[13px] font-bold text-slate-800 hover:bg-slate-50 shadow-2xs min-h-[44px] min-w-[44px]"
                >
                  {copied ? <Check size={14} className="text-emerald-700" /> : <Copy size={14} />}
                  <span>{copied ? "কপি হয়েছে!" : "কপি"}</span>
                </button>
                <button
                  type="button"
                  onClick={handleDownload}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-[13px] font-bold text-slate-800 hover:bg-slate-50 shadow-2xs min-h-[44px] min-w-[44px]"
                >
                  <Download size={14} />
                  <span>ডাউনলোড</span>
                </button>
                <button
                  type="button"
                  onClick={handlePrint}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-3 py-1.5 text-[13px] font-bold text-white hover:bg-slate-800 shadow-2xs min-h-[44px] min-w-[44px]"
                >
                  <Printer size={14} />
                  <span>প্রিন্ট</span>
                </button>
              </div>
            </div>

            {/* Document sheet */}
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs font-mono text-[13px] sm:text-[13.5px] leading-relaxed whitespace-pre-wrap text-slate-800 overflow-x-auto max-h-[550px] overflow-y-auto">
              {agreementText}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
