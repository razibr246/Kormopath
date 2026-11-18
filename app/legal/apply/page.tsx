"use client";
import { useState } from "react";
import { ApplyWizard } from "@/components/apps/legal/ApplyWizard";

/** /legal/apply: prepare a printable legal aid application draft, saved on this phone after review. Nothing is filed. */
export default function LegalApply() {
  const [lang, setLang] = useState<"bn" | "en">("bn");
  const bn = lang === "bn";
  return (
    <>
      <header className="flex flex-wrap items-end justify-between gap-3 print:hidden">
        <div className="min-w-0">
          <p className="kp-eyebrow">{bn ? "আবেদনের খসড়া" : "Application draft"}</p>
          <h1 className="mt-2 text-[clamp(30px,5vw,50px)] font-semibold leading-[1.08] text-slate-900">
            {bn ? <>আবেদন <em className="kp-em">গুছিয়ে নিন</em></> : <>Get your application <em className="kp-em">ready</em></>}
          </h1>
          <p className="mt-2 max-w-[62ch] text-[15.5px] leading-relaxed text-slate-700">
            {bn ? "পাঁচ ধাপে একটি খসড়া তৈরি হবে, যা প্রিন্ট করে বা পড়ে শুনিয়ে লিগ্যাল এইড অফিসে দিতে পারবেন। এটি কোথাও জমা হয় না।"
              : "Five steps make a draft you can print or read out at the legal aid office. It is not submitted anywhere."}
          </p>
        </div>
        <button type="button" onClick={() => setLang(bn ? "en" : "bn")} className="kp-chip !h-9 !rounded-full !text-[13px] font-semibold" aria-label={bn ? "Switch to English" : "বাংলায় দেখুন"}>{bn ? "EN" : "বাং"}</button>
      </header>
      <ApplyWizard lang={lang} />
    </>
  );
}
