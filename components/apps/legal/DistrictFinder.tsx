"use client";

import { useState, useMemo } from "react";
import { Building2, MapPin, Phone, Search, ExternalLink, Calendar, ShieldCheck, CheckCircle2, Navigation } from "lucide-react";
import { BD_DISTRICTS, DIVISIONS, DISTRICT_DIVISIONS, type DivisionId, type District } from "@/lib/legal/districts";
import { NLASO_DISTRICT_OFFICES, NLASO_HELPLINE_PAGE } from "@/lib/legal/data";
import { SourceTag } from "@/components/layout/AppHeader";
import { getDistrictCourtGoogleMapsUrl } from "@/lib/googleMaps";

interface DistrictFinderProps {
  lang?: "bn" | "en";
}

export function DistrictFinder({ lang = "bn" }: DistrictFinderProps) {
  const bn = lang === "bn";
  const T = (b: string, e: string) => (bn ? b : e);

  const [selectedDivision, setSelectedDivision] = useState<DivisionId>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDistrict, setSelectedDistrict] = useState<District>(BD_DISTRICTS[0]); // Default: Dhaka

  const filteredDistricts = useMemo(() => {
    return BD_DISTRICTS.filter((d) => {
      const matchDivision =
        selectedDivision === "all" || DISTRICT_DIVISIONS[d.en] === selectedDivision;
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        d.bn.includes(q) ||
        d.en.toLowerCase().includes(q);
      return matchDivision && matchSearch;
    });
  }, [selectedDivision, searchQuery]);

  return (
    <section aria-labelledby="lg-district-h" className="lg-card space-y-5" data-testid="legal-district-finder">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="kp-eyebrow">{T("সরাসরি যোগাযোগ ও অফিস", "Direct contact & offices")}</p>
          <h2 id="lg-district-h" className="mt-1 text-[clamp(21px,3vw,28px)] font-semibold leading-tight text-slate-900">
            {T("৬৪ জেলার লিগ্যাল এইড অফিস সন্ধান", "64 District Legal Aid Office Locator")}
          </h2>
          <p className="mt-1 max-w-[64ch] text-[15px] leading-relaxed text-slate-700">
            {T(
              "প্রতিটি জেলা ও দায়রা জজ আদালত প্রাঙ্গণে সরকারি লিগ্যাল এইড অফিস রয়েছে। আপনার জেলা বেছে নিয়ে অফিসের অবস্থান ও যাওয়ার নিয়ম দেখে নিন।",
              "There is an official legal aid office in every District & Sessions Judge Court building. Select your district to check office details and visiting guidance."
            )}
          </p>
        </div>

        <SourceTag
          confidence="official"
          label={NLASO_DISTRICT_OFFICES.label}
          url={NLASO_DISTRICT_OFFICES.url}
          checked={NLASO_DISTRICT_OFFICES.checked}
        />
      </div>

      {/* Division quick filter tabs */}
      <div className="flex flex-wrap gap-1.5 sm:gap-2 border-b border-slate-200/80 pb-3">
        {DIVISIONS.map((div) => {
          const active = selectedDivision === div.id;
          return (
            <button
              key={div.id}
              type="button"
              onClick={() => {
                setSelectedDivision(div.id);
                // Auto-select first matching district if current doesn't match
                if (div.id !== "all") {
                  const firstInDiv = BD_DISTRICTS.find((d) => DISTRICT_DIVISIONS[d.en] === div.id);
                  if (firstInDiv) setSelectedDistrict(firstInDiv);
                }
              }}
              className={`rounded-xl px-3 py-1.5 text-[13px] font-semibold transition-all ${
                active
                  ? "bg-indigo-900 text-white shadow-xs"
                  : "bg-slate-100/80 text-slate-700 hover:bg-slate-200"
              }`}
            >
              {bn ? div.bn : div.en}
            </button>
          );
        })}
      </div>

      {/* Search Input & District Pills */}
      <div className="grid gap-5 md:grid-cols-12 items-start">
        <div className="md:col-span-5 space-y-3">
          <div className="relative">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={T("জেলার নাম খুঁজুন (যেমন: কুমিল্লা, বগুড়া)...", "Search district (e.g., Cumilla, Bogura)...")}
              className="w-full rounded-xl border border-slate-300 bg-white pl-9 pr-3 py-2 text-[14.5px] text-slate-800 placeholder:text-slate-400 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
            />
          </div>

          <div className="max-h-[290px] overflow-y-auto space-y-1 pr-1 [scrollbar-width:thin]">
            {filteredDistricts.length === 0 ? (
              <p className="p-3 text-center text-[13.5px] text-slate-500">
                {T("কোনো জেলা পাওয়া যায়নি", "No matching district found")}
              </p>
            ) : (
              filteredDistricts.map((d) => {
                const isSelected = selectedDistrict.en === d.en;
                return (
                  <button
                    key={d.en}
                    type="button"
                    onClick={() => setSelectedDistrict(d)}
                    className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-[14px] transition-all ${
                      isSelected
                        ? "bg-indigo-50 border border-indigo-300 font-bold text-indigo-950 shadow-2xs"
                        : "hover:bg-slate-100 text-slate-700"
                    }`}
                  >
                    <span>{bn ? d.bn : d.en}</span>
                    <span className="text-[12px] font-normal text-slate-400">
                      {bn ? d.en : d.bn}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Selected District Office Card */}
        <div className="md:col-span-7 rounded-2xl border-2 border-indigo-200/90 bg-gradient-to-br from-indigo-50/50 via-white to-amber-50/30 p-5 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-indigo-100 pb-3">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-md bg-indigo-100 px-2 py-0.5 text-[11px] font-bold text-indigo-900 uppercase tracking-wide">
                <Building2 size={13} className="text-indigo-700" />
                {T("জেলা লিগ্যাল এইড অফিস", "District Legal Aid Office")}
              </span>
              <h3 className="mt-1 text-2xl font-bold text-slate-900">
                {bn ? `${selectedDistrict.bn} জেলা` : `${selectedDistrict.en} District`}
              </h3>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <a
                href={getDistrictCourtGoogleMapsUrl(selectedDistrict.en)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-200/90 bg-white px-3 py-1.5 text-[13px] font-semibold text-indigo-950 shadow-2xs hover:bg-indigo-50 hover:border-indigo-300 transition-all"
                title={T("গুগল ম্যাপসে আদালত চত্বর দেখুন", "View Court premises on Google Maps")}
              >
                <Navigation size={13} className="text-indigo-600" />
                <span>{T("গুগল ম্যাপস লোকেশন", "Google Maps Location")}</span>
                <ExternalLink size={12} className="text-slate-400" />
              </a>
              <a
                href="tel:16699"
                className="kp-btn-primary inline-flex items-center gap-1.5 !rounded-xl !px-3.5 !py-1.5 !text-[13.5px]"
              >
                <Phone size={15} />
                <span>{T("১৬৬৯৯ কল করুন", "Call 16699")}</span>
              </a>
            </div>
          </div>

          <div className="mt-4 space-y-3 text-[14.5px] text-slate-700">
            <div className="flex items-start gap-2.5">
              <MapPin size={18} className="text-indigo-600 shrink-0 mt-0.5" />
              <div>
                <strong className="block text-slate-900 font-semibold">{T("অফিসের সুনির্দিষ্ট ঠিকানা:", "Office Location:")}</strong>
                <span>
                  {bn
                    ? `জেলা ও দায়রা জজ আদালত ভবন প্রাঙ্গণ, ${selectedDistrict.bn}।`
                    : `District & Sessions Judge Court Premises, ${selectedDistrict.en}.`}
                </span>
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <ShieldCheck size={18} className="text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <strong className="block text-slate-900 font-semibold">{T("দায়িত্বরত বিচারক কর্মকর্তা:", "Presiding Judicial Officer:")}</strong>
                <span>
                  {T(
                    "জেলা লিগ্যাল এইড অফিসার (সিনিয়র সহকারী জজ / যুগ্ম জেলা জজ মর্যাদার বিচার বিভাগীয় কর্মকর্তা)।",
                    "District Legal Aid Officer (Judicial Officer of Senior Assistant Judge or Joint District Judge rank)."
                  )}
                </span>
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <Calendar size={18} className="text-amber-600 shrink-0 mt-0.5" />
              <div>
                <strong className="block text-slate-900 font-semibold">{T("অফিস সময় ও কর্মদিবস:", "Working Days & Hours:")}</strong>
                <span>
                  {T(
                    "রবিবার থেকে বৃহস্পতিবার, সকাল ৯:০০ টা থেকে বিকেল ৫:০০ টা পর্যন্ত (সরকারি ছুটির দিন ব্যতীত)।",
                    "Sunday to Thursday, 9:00 AM to 5:00 PM (excluding public holidays)."
                  )}
                </span>
              </div>
            </div>
          </div>

          {/* Available free services at this office */}
          <div className="mt-4 rounded-xl border border-indigo-100 bg-white/90 p-3">
            <p className="text-[12.5px] font-bold text-slate-900 uppercase tracking-wide">
              {T("এই অফিসে আপনি যে সেবাগুলো সম্পূর্ণ বিনামূল্যে পাবেন:", "Services provided completely free at this office:")}
            </p>
            <ul className="mt-2 grid gap-1.5 sm:grid-cols-2 text-[13px] text-slate-700">
              <li className="flex items-center gap-1.5">
                <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
                <span>{T("বিনা খরচে প্যানেল আইনজীবী নিয়োগ", "Free Panel Lawyer Assignment")}</span>
              </li>
              <li className="flex items-center gap-1.5">
                <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
                <span>{T("মামলা ছাড়াই আপস-মীমাংসা (ADR)", "Pre-case Out-of-Court Mediation")}</span>
              </li>
              <li className="flex items-center gap-1.5">
                <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
                <span>{T("কোর্ট ফি ও মামলার সব খরচ মওকুফ", "All Court Fees Covered by Govt")}</span>
              </li>
              <li className="flex items-center gap-1.5">
                <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
                <span>{T("আইনি অধিকার ও সুরক্ষা পরামর্শ", "Legal Rights & Safety Advice")}</span>
              </li>
            </ul>
          </div>

          <div className="mt-3.5 flex flex-wrap items-center justify-between gap-2 text-[12px] text-slate-500">
            <span>
              {T("অফিসে গিয়ে অভ্যর্থনা ডেস্কে বলুন: 'আমি লিগ্যাল এইড অফিসের খোঁজ করছি'", "Ask at the court reception: 'I am looking for the Legal Aid Office'")}
            </span>
            <a
              href={NLASO_DISTRICT_OFFICES.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 font-semibold text-indigo-700 hover:underline"
            >
              <span>{T("সরকারি সাইটে কর্মকর্তার তালিকা", "Officer list on nlaso.gov.bd")}</span>
              <ExternalLink size={12} />
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
