"use client";
import { useState } from "react";
import { SymptomAssistant } from "./SymptomAssistant";

export function AssistantPage() {
  const [lang, setLang] = useState<"bn" | "en">("bn");
  const bn = lang === "bn";
  return (
    <main id="main" className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6">
      <header className="kp-rise space-y-2">
        <p className="kp-eyebrow !font-sans !text-[13px] !leading-[1.4] !tracking-normal !normal-case">{bn ? "কোন ডাক্তার দেখাব?" : "Which doctor should I see?"}</p>
        <h1 className="text-[clamp(30px,5vw,50px)] font-semibold leading-[1.08] text-slate-900">
          {bn ? <>সঠিক ডাক্তারের কাছে, <em className="kp-em">প্রথমবারেই</em></> : <>The right doctor, <em className="kp-em">first time</em></>}
        </h1>
        <p className="max-w-[62ch] text-[15.5px] leading-relaxed text-slate-700">
          {bn
            ? "প্রথমে বিপদের লক্ষণ দেখে নিন। তারপর কী হচ্ছে লিখুন বা শরীরের ছবিতে ছুঁয়ে দেখান — কোন ধরনের ডাক্তার দেখাবেন আর তাকে কী বলবেন, তা গুছিয়ে দেব। এটি রোগ নির্ণয় বা ওষুধের পরামর্শ নয়।"
            : "First check the danger signs. Then describe what's happening or tap the body map — we'll suggest which kind of doctor to see and organise what to tell them. This is not a diagnosis or medicine advice."}
        </p>
      </header>
      <SymptomAssistant lang={lang} setLang={setLang} />
    </main>
  );
}
