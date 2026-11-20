"use client";

import { useState } from "react";
import {
  Building2,
  ShieldAlert,
  Users2,
  CheckCircle2,
  FileText,
  AlertTriangle,
  HelpCircle,
  Phone,
  Printer,
  ChevronRight,
  Sparkles,
  MapPin,
  Clock,
  Eye,
  ShieldCheck,
} from "lucide-react";
import { SourceTag } from "@/components/layout/AppHeader";
import { NLASO_DISTRICT_OFFICES, NLASO_LEGAL_AID_PAGE, HELPLINES } from "@/lib/legal/data";

interface CourtSurvivalGuideProps {
  lang?: "bn" | "en";
}

type TabKey = "location" | "touts" | "judge" | "checklist" | "faq";

export function CourtSurvivalGuide({ lang = "bn" }: CourtSurvivalGuideProps) {
  const bn = lang === "bn";
  const T = (b: string, e: string) => (bn ? b : e);
  const [activeTab, setActiveTab] = useState<TabKey>("location");

  const legalAid = HELPLINES.find((h) => h.id === "legal_aid");

  return (
    <section
      aria-labelledby="lg-survival-h"
      className="lg-card space-y-6 border-indigo-200/90 shadow-sm"
      data-testid="court-survival-guide"
    >
      {/* Header with Title and Reassurance */}
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-xl bg-indigo-100 text-indigo-900">
              <Building2 size={17} aria-hidden />
            </span>
            <p className="kp-eyebrow">{T("নাগরিক পরিদর্শন গাইড", "Citizen Court Visit Guide")}</p>
          </div>
          <h2
            id="lg-survival-h"
            className="mt-1 text-[clamp(21px,3vw,28px)] font-bold leading-tight text-slate-900"
          >
            {T(
              "জেলা জজ আদালত ও লিগ্যাল এইড অফিস পরিদর্শন নির্দেশিকা",
              "District Court & Legal Aid Office Survival Guide"
            )}
          </h2>
          <p className="mt-1.5 max-w-[65ch] text-[14.5px] leading-relaxed text-slate-600">
            {T(
              "আদালত প্রাঙ্গণ দেখে ঘাবড়াবেন না। সেখানে দালালদের এড়িয়ে কীভাবে সরাসরি জেলা লিগ্যাল এইড কর্মকর্তার কাছে পৌঁছাবেন এবং বিনা খরচে প্রতিকার পাবেন—তার বাস্তব নির্দেশিকা।",
              "Do not fear court premises. Here is practical civic advice on bypassing touts, finding the District Legal Aid Officer, and getting free justice with dignity."
            )}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <SourceTag
            confidence="official"
            label={NLASO_DISTRICT_OFFICES.label}
            url={NLASO_DISTRICT_OFFICES.url}
            checked={NLASO_DISTRICT_OFFICES.checked}
          />
        </div>
      </div>

      {/* Interactive Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab("location")}
          className={`kp-chip !h-10 !text-[13.5px] font-semibold transition-all ${
            activeTab === "location" ? "!bg-indigo-900 !text-white !border-indigo-900" : ""
          }`}
        >
          <MapPin size={15} aria-hidden />
          <span>{T("১. অফিস কোথায়?", "1. Office Location")}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("touts")}
          className={`kp-chip !h-10 !text-[13.5px] font-semibold transition-all ${
            activeTab === "touts" ? "!bg-amber-600 !text-white !border-amber-600" : "!border-amber-200 !text-amber-950 !bg-amber-50/50"
          }`}
        >
          <ShieldAlert size={15} aria-hidden />
          <span>{T("২. দালাল ও টাকা চাওয়া প্রতিরোধ", "2. Anti-Tout Shield")}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("judge")}
          className={`kp-chip !h-10 !text-[13.5px] font-semibold transition-all ${
            activeTab === "judge" ? "!bg-indigo-900 !text-white !border-indigo-900" : ""
          }`}
        >
          <Users2 size={15} aria-hidden />
          <span>{T("৩. কর্মকর্তার সঙ্গে কথোপকথন", "3. Talking to Officer")}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("checklist")}
          className={`kp-chip !h-10 !text-[13.5px] font-semibold transition-all ${
            activeTab === "checklist" ? "!bg-indigo-900 !text-white !border-indigo-900" : ""
          }`}
        >
          <FileText size={15} aria-hidden />
          <span>{T("৪. সাথে কী রাখবেন", "4. What to Bring")}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("faq")}
          className={`kp-chip !h-10 !text-[13.5px] font-semibold transition-all ${
            activeTab === "faq" ? "!bg-indigo-900 !text-white !border-indigo-900" : ""
          }`}
        >
          <HelpCircle size={15} aria-hidden />
          <span>{T("৫. সাধারণ প্রশ্ন ও ভয় দূর", "5. Fear Buster FAQ")}</span>
        </button>
      </div>

      {/* Tab 1: Office Location */}
      {activeTab === "location" && (
        <div className="space-y-4 motion-safe:animate-rise-in">
          <div className="rounded-2xl border border-indigo-100 bg-indigo-50/50 p-5">
            <h3 className="text-[17px] font-bold text-indigo-950 flex items-center gap-2">
              <Building2 size={19} className="text-indigo-700" />
              {T("আদালত ভবনে জেলা লিগ্যাল এইড অফিস কোথায় থাকে?", "Where is the Legal Aid Office in the Court Building?")}
            </h3>
            <p className="mt-2 text-[15px] leading-relaxed text-slate-700">
              {T(
                "দেশের প্রতিটি জেলা ও দায়রা জজ আদালত (District Judge Court) ভবনের নিচতলায় (Ground Floor) জেলা লিগ্যাল এইড অফিস অবস্থিত। রুমের বাইরে স্পষ্ট সাইনবোর্ড থাকে: \"জেলা লিগ্যাল এইড অফিস\"। কোনো কারণে রুম খুঁজে না পেলে আদালত ভবনের পুলিশ তথ্যকেন্দ্র বা কোনো কর্মচারীকে জিজ্ঞেস করুন।",
                "In every district judge court building in Bangladesh, the District Legal Aid Office is located on the ground floor. It has a clearly labeled official signboard. If you have trouble finding it, ask the police information booth or court staff."
              )}
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <span className="flex items-center gap-2 text-[14.5px] font-bold text-slate-900">
                <Clock size={16} className="text-indigo-600" />
                {T("অফিস সময়", "Office Hours")}
              </span>
              <p className="mt-1 text-[13.5px] text-slate-600">
                {T(
                  "রবিবার থেকে বৃহস্পতিবার, সকাল ৯:০০ টা থেকে বিকাল ৫:০০ টা পর্যন্ত (সরকারি ছুটির দিন ছাড়া)।",
                  "Sunday to Thursday, 9:00 AM to 5:00 PM (excluding public holidays)."
                )}
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <span className="flex items-center gap-2 text-[14.5px] font-bold text-slate-900">
                <MapPin size={16} className="text-emerald-600" />
                {T("কোন গেট দিয়ে ঢুকবেন", "Which Entrance")}
              </span>
              <p className="mt-1 text-[13.5px] text-slate-600">
                {T(
                  "জেলা জজ আদালতের মূল ফটক দিয়ে সরাসরি আদালত ভবনের প্রধান প্রবেশপথে যান।",
                  "Use the main gate of the District Judge Court to reach the primary courthouse entrance."
                )}
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <span className="flex items-center gap-2 text-[14.5px] font-bold text-slate-900">
                <ShieldCheck size={16} className="text-amber-600" />
                {T("কোনো পাস লাগবে কি?", "Need Any Pass?")}
              </span>
              <p className="mt-1 text-[13.5px] text-slate-600">
                {T(
                  "না। আদালত চলাকালীন যেকোনো নাগরিক বিনামূল্যে ও বাধাহীনভাবে এই অফিসে প্রবেশ করতে পারেন।",
                  "No. Any citizen can enter the legal aid office during working hours without any special pass."
                )}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Anti-Tout Shield */}
      {activeTab === "touts" && (
        <div className="space-y-4 motion-safe:animate-rise-in">
          <div className="rounded-2xl border-2 border-amber-300 bg-amber-50/80 p-5">
            <div className="flex items-start gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-amber-200 text-amber-950">
                <AlertTriangle size={22} className="text-amber-900" />
              </span>
              <div>
                <h3 className="text-[17.5px] font-bold text-amber-950">
                  {T(
                    "সতর্কতা: আদালত চত্বরের দালাল বা মধ্যস্বত্বভোগীদের ফাঁদে পা দেবেন না",
                    "Warning: Avoid Middlemen and Touts Outside the Courthouse"
                  )}
                </h3>
                <p className="mt-1.5 text-[14.5px] leading-relaxed text-amber-950">
                  {T(
                    "আদালতের গেট বা বারান্দায় অনেক সময় অজ্ঞাত ব্যক্তিরা আপনাকে ডেকে বলতে পারে—\"কী সমস্যা? চলেন দ্রুত ব্যবস্থা করে দিই\" বা \"টাকা দিলে ফরম পূরণ করে দিচ্ছি\"। এগুলো সম্পূর্ণরূপে ভুয়া ও প্রতারণা।",
                    "Outside court gates, touts often approach vulnerable citizens claiming they can speed up cases or charge for free application forms. Never give them any money."
                  )}
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-red-200 bg-red-50/50 p-4">
              <h4 className="text-[15px] font-bold text-red-950 flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-red-600" />
                {T("দালালদের পরিচিত কথা (যেগুলো শুনে সাবধান হবেন)", "Common Tout Pitches to Watch Out For")}
              </h4>
              <ul className="mt-2 space-y-1.5 text-[13.5px] text-red-900">
                <li>• {T("\"লিগ্যাল এইডের ফরম কিনতে ৫০০ টাকা লাগবে।\"", "\"You have to pay 500 taka for the application form.\"")}</li>
                <li>• {T("\"আমার মাধ্যমে গেলে আজকে বিচারকের সামনে কথা বলিয়ে দেব।\"", "\"Come through me and I'll arrange a quick hearing today.\"")}</li>
                <li>• {T("\"সরকারি উকিল ভালো না, আমার চেনাশোনা উকিলকে কম খরচে দিচ্ছি।\"", "\"Govt lawyers are slow, take my private lawyer for cheap.\"")}</li>
              </ul>
            </div>

            <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4">
              <h4 className="text-[15px] font-bold text-emerald-950 flex items-center gap-2">
                <CheckCircle2 size={16} className="text-emerald-700" />
                {T("আপনার সুরক্ষার নিয়ম (যা আপনি মেনে চলবেন)", "Your Ironclad Shield Rules")}
              </h4>
              <ul className="mt-2 space-y-1.5 text-[13.5px] text-emerald-900">
                <li>• {T("কারো সাথে কথা না বাড়িয়ে সোজা 'জেলা লিগ্যাল এইড অফিস' সাইনবোর্ড চিহ্নিত রুমে ঢুকুন।", "Walk straight into the room marked 'District Legal Aid Office'.")}</li>
                <li>• {T("আবেদনের ফরম ও পরামর্শ সম্পূর্ণ বিনামূল্যে। কাউকে ১টি পয়সাও দেবেন না।", "Forms and consultations are 100% free. Never pay a single poisha.")}</li>
                <li>• {T("কেউ হয়রানি করলে রুমের ভেতরে বিচারক কর্মকর্তা বা ১৬৬৯৯-এ অভিযোগ করুন।", "If harassed, inform the officer inside or call 16699.")}</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Talking to Officer */}
      {activeTab === "judge" && (
        <div className="space-y-4 motion-safe:animate-rise-in">
          <div className="rounded-2xl border border-indigo-200 bg-indigo-50/60 p-5">
            <h3 className="text-[17px] font-bold text-indigo-950 flex items-center gap-2">
              <Users2 size={19} className="text-indigo-800" />
              {T("লিগ্যাল এইড কর্মকর্তা কে এবং তিনি কী করেন?", "Who is the Legal Aid Officer and What Do They Do?")}
            </h3>
            <p className="mt-2 text-[15px] leading-relaxed text-slate-700">
              {T(
                "জেলা লিগ্যাল এইড কর্মকর্তা হলেন একজন বিজ্ঞ 'সিনিয়র সহকারী জজ' (Senior Assistant Judge)। তিনি কোনো পক্ষের আইনজীবী নন; তিনি একজন নিরপেক্ষ বিচার বিভাগীয় কর্মকর্তা। তিনি আপনার বক্তব্য মন দিয়ে শুনবেন এবং সিদ্ধান্ত নেবেন আপনার জন্য আপস-মীমাংসা উপযুক্ত নাকি আদালতে প্যানেল আইনজীবী নিয়োগ করতে হবে।",
                "The District Legal Aid Officer is a Senior Assistant Judge. They are an impartial judicial officer who will listen carefully to your issue and decide whether mediation or a court panel advocate is right for your case."
              )}
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <h4 className="text-[14.5px] font-bold text-slate-900">
                {T("১. কোনো কাঠগড়া নেই", "1. No Witness Box")}
              </h4>
              <p className="mt-1 text-[13px] leading-relaxed text-slate-600">
                {T(
                  "এটি কোনো এজলাস নয়। আপনি সাধারণ চেয়ারে বসে কর্মকর্তার মুখোমুখি শান্তভাবে কথা বলবেন।",
                  "This is an informal office room, not a courtroom. You sit comfortably in a chair across from the officer."
                )}
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <h4 className="text-[14.5px] font-bold text-slate-900">
                {T("২. সহজ বাংলা ভাষায় বলুন", "2. Speak Everyday Bangla")}
              </h4>
              <p className="mt-1 text-[13px] leading-relaxed text-slate-600">
                {T(
                  "কোনো জটিল আইন বা ধারা বলতে হবে না। আপনার সাথে ঘটে যাওয়া ঘটনা সহজ ভাষায় স্পষ্ট করে বলুন।",
                  "You do not need legal jargon or section numbers. Simply explain what happened in plain words."
                )}
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <h4 className="text-[14.5px] font-bold text-slate-900">
                {T("৩. গোপনীয়তার সম্পূর্ণ নিশ্চয়তা", "3. Complete Privacy")}
              </h4>
              <p className="mt-1 text-[13px] leading-relaxed text-slate-600">
                {T(
                  "পারিবারিক বা ব্যক্তিগত সংবেদনশীল তথ্য গোপন রাখা হয়। নির্ভয়ে সব সত্য ঘটনা বলুন।",
                  "Sensitive family and domestic facts remain fully confidential. You can speak without fear."
                )}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: What to Bring */}
      {activeTab === "checklist" && (
        <div className="space-y-4 motion-safe:animate-rise-in">
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <h3 className="text-[17px] font-bold text-slate-900 flex items-center gap-2">
              <FileText size={18} className="text-indigo-600" />
              {T("আদালত বা অফিসে যাওয়ার সময় ব্যাগে যা রাখবেন", "Essential Documents to Pack for Your Visit")}
            </h3>
            <p className="mt-1 text-[14px] text-slate-600">
              {T(
                "এই কাগজপত্রগুলোর মূল কপি এবং অন্তত ২টি করে ফটোকপি একটি ফাইলে গুছিয়ে নিন:",
                "Carry the original documents along with at least 2 photocopies neatly kept in a folder:"
              )}
            </p>

            <ul className="mt-4 space-y-2.5 text-[14px] text-slate-700">
              <li className="flex items-start gap-2.5">
                <CheckCircle2 size={17} className="text-emerald-600 shrink-0 mt-0.5" />
                <span>
                  <strong>{T("জাতীয় পরিচয়পত্র (NID) / জন্মনিবন্ধন:", "National ID or Birth Certificate:")}</strong>{" "}
                  {T("আপনার পরিচয় প্রমাণের জন্য ফটোকপি বাধ্যতামূলক।", "Photocopy is required for identity verification.")}
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 size={17} className="text-emerald-600 shrink-0 mt-0.5" />
                <span>
                  <strong>{T("ইউনিয়ন চেয়ারম্যান বা কাউন্সিলরের প্রত্যয়নপত্র:", "Local Councillor / Chairman Certificate:")}</strong>{" "}
                  {T("আর্থিক অসচ্ছলতা বা নাগরিকত্বের প্রমাণস্বরূপ অত্যন্ত কার্যকরী।", "Supports financial insolvency for legal aid eligibility.")}
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 size={17} className="text-emerald-600 shrink-0 mt-0.5" />
                <span>
                  <strong>{T("ঘটনা বা বিরোধের কাগজপত্র:", "Dispute / Event Papers:")}</strong>{" "}
                  {T("জমির খতিয়ান/দলিল, কাবিননামা, দেনমোহরের রসিদ, চিকিৎসার প্রেসক্রিপশন বা জিডি/মামলার নম্বর।", "Land records, marriage kabinnama, dower receipts, medical reports, or police GD numbers.")}
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 size={17} className="text-emerald-600 shrink-0 mt-0.5" />
                <span>
                  <strong>{T("বিপক্ষের নাম ও পূর্ণ ঠিকানা:", "Opponent's Name & Full Address:")}</strong>{" "}
                  {T("আপস-মীমাংসার নোটিশ বা সমন পাঠানোর জন্য প্রতিপক্ষের সঠিক ঠিকানা প্রয়োজন।", "Exact address is required to serve notices for ADR mediation.")}
                </span>
              </li>
            </ul>
          </div>
        </div>
      )}

      {/* Tab 5: Fear Buster FAQ */}
      {activeTab === "faq" && (
        <div className="space-y-3 motion-safe:animate-rise-in">
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <h4 className="text-[15px] font-bold text-slate-900">
              {T("প্রশ্ন: আইনজীবীরা কি পরে আমার কাছ থেকে কোনো গোপন টাকা চাইবে?", "Q: Will the appointed lawyer ask for secret fees later?")}
            </h4>
            <p className="mt-1 text-[13.5px] leading-relaxed text-slate-600">
              {T(
                "উত্তর: না। সরকারি প্যানেল আইনজীবীদের ফি সরাসরি সরকার বহন করে। কোনো আইনজীবী যদি আপনার কাছে টাকা দাবি করেন, আপনি সাথে সাথে জেলা লিগ্যাল এইড কর্মকর্তাকে লিখিত অভিযোগ দেবেন।",
                "Answer: Absolutely not. The government pays the panel lawyer directly. If any lawyer asks for money, immediately report it to the District Legal Aid Officer."
              )}
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <h4 className="text-[15px] font-bold text-slate-900">
              {T("প্রশ্ন: আমি যদি ঠিকমতো গুছিয়ে কথা বলতে না পারি?", "Q: What if I become nervous and cannot speak fluently?")}
            </h4>
            <p className="mt-1 text-[13.5px] leading-relaxed text-slate-600">
              {T(
                "উত্তর: ভয়ের কোনো কারণ নেই। আমাদের ওয়েবসাইটের 'আবেদনের খসড়া' থেকে আপনার সমস্যার বিবরণ প্রিন্ট করে নিন এবং কর্মকর্তার হাতে তুলে দিন। তিনি নিজেই পড়ে বুঝে নেবেন।",
                "Answer: Do not worry. Use our 'Application Draft' tool to prepare and print your story beforehand and hand it directly to the officer to read."
              )}
            </p>
          </div>
        </div>
      )}

      {/* Reassurance Footer Action */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-slate-50 p-4 border border-slate-200">
        <span className="text-[13.5px] font-medium text-slate-700">
          {T(
            "আদালতে যাওয়ার আগেই ১৬৬৯৯ নম্বরে ফোন করে আপনার জেলার অফিস কক্ষের নম্বর জেনে নিতে পারেন।",
            "Call toll-free 16699 before your visit to confirm your district office room number."
          )}
        </span>
        {legalAid && (
          <a
            href={`tel:${legalAid.number}`}
            className="kp-btn-primary inline-flex items-center gap-2 px-4 py-2 text-[13.5px]"
          >
            <Phone size={15} />
            <span>{T("১৬৬৯৯ কল করুন", "Call 16699")}</span>
          </a>
        )}
      </div>
    </section>
  );
}
