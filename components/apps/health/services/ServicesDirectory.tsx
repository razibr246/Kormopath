"use client";
import { useState } from "react";
import Link from "next/link";
import { ArrowRight, ExternalLink, Phone, Users } from "lucide-react";
import { SourceTag } from "@/components/layout/AppHeader";
import { FAMILY_HEALTH_GUIDE, HEALTH_SERVICES, KORMOPATH_HEALTH_LINKS, SERVICE_GROUPS } from "@/lib/health/services";
import "../assistant/assistant.css";

const bnNum = (s: string) => s.replace(/\d/g, (d) => "০১২৩৪৫৬৭৮৯"[Number(d)]);

export function ServicesDirectory() {
  const [lang, setLang] = useState<"bn" | "en">("bn");
  const bn = lang === "bn";
  const T = (b: string, e: string) => (bn ? b : e);
  let i = 0;
  const delay = () => ({ animationDelay: `${Math.min(i++, 12) * 60}ms` });

  return (
    <main id="main" className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6" data-testid="services-page">
      <header className="kp-rise flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-2">
          <p className="kp-eyebrow !font-sans !text-[13px] !leading-[1.4] !tracking-normal !normal-case">{T("অ্যাম্বুলেন্স ও স্বাস্থ্যসেবা", "Ambulance & health services")}</p>
          <h1 className="text-[clamp(30px,5vw,50px)] font-semibold leading-[1.08] text-slate-900">{bn ? <>দরকারের সময় <em className="kp-em">সঠিক নম্বর</em></> : <>The <em className="kp-em">right number</em> when it matters</>}</h1>
          <p className="max-w-[62ch] text-[15.5px] leading-relaxed text-slate-700">{T("জরুরি অবস্থায় আগে ৯৯৯। নিচের প্রতিটি সেবা তার নিজের সরকারি বা প্রতিষ্ঠানের পাতায় মিলিয়ে দেখা, তারিখসহ। যা যাচাই করা যায়নি, তা রাখা হয়নি।", "In an emergency, 999 first. Every service below was checked on its own official or organisation page, with the date. Anything we could not verify was left out.")}</p>
        </div>
        <button type="button" onClick={() => setLang(bn ? "en" : "bn")} className="kp-chip !min-h-[44px]">{bn ? "EN" : "বাং"}</button>
      </header>

      {SERVICE_GROUPS.map((g) => {
        const items = HEALTH_SERVICES.filter((s) => s.group === g.id);
        if (!items.length) return null;
        return (
          <section key={g.id} aria-labelledby={`sv-${g.id}`} className="space-y-3">
            <h2 id={`sv-${g.id}`} className="text-[clamp(21px,3vw,27px)] font-semibold leading-tight text-slate-900">{bn ? g.bn : g.en}</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {items.map((s) => (
                <article key={s.id} data-testid="service-card" style={delay()} className={`hb-rise hb-lift space-y-3 rounded-2xl border bg-white p-5 ${s.group === "emergency" ? "border-red-300" : "border-slate-200"}`}>
                  <h3 className="text-[18px] font-bold text-slate-900">{bn ? s.bn : s.en}</h3>
                  <p className="text-[15px] leading-relaxed text-slate-700">{bn ? s.whatBn : s.whatEn}</p>
                  <div className="flex flex-wrap gap-2">
                    {s.phone && <a href={`tel:${s.phone}`} className={`inline-flex min-h-[48px] items-center gap-2 rounded-xl px-4 text-[16px] font-bold ${s.phone === "999" ? "bg-red-700 text-white" : "kp-btn-primary"}`}><Phone size={17} aria-hidden /> <span className="font-mono">{bn ? bnNum(s.phone) : s.phone}</span></a>}
                    {s.url && <a href={s.url} target="_blank" rel="noopener noreferrer" className="kp-btn-ghost inline-flex min-h-[48px] items-center gap-2 px-4 text-[15px]">{T("ওয়েবসাইট", "Website")} <ExternalLink size={15} aria-hidden /></a>}
                  </div>
                  <SourceTag confidence={s.confidence} label={s.source.label} url={s.source.url} checked={s.source.checked} />
                </article>
              ))}
            </div>
          </section>
        );
      })}

      <section aria-labelledby="sv-kp" className="space-y-3">
        <h2 id="sv-kp" className="text-[clamp(21px,3vw,27px)] font-semibold leading-tight text-slate-900">{T("এখানেই যা করতে পারেন", "What you can do right here")}</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {KORMOPATH_HEALTH_LINKS.map((l) => (
            <Link key={l.href} href={l.href} style={delay()} className="hb-rise hb-lift flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-5">
              <span><span className="block text-[17px] font-bold text-slate-900">{bn ? l.bn : l.en}</span><span className="block text-[14px] text-slate-600">{bn ? l.whatBn : l.whatEn}</span></span>
              <ArrowRight size={18} className="shrink-0 text-sky-700" aria-hidden />
            </Link>
          ))}
        </div>
      </section>

      <section aria-labelledby="sv-family" className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
        <h2 id="sv-family" className="flex items-center gap-2 text-[20px] font-extrabold text-slate-900"><Users size={20} className="text-sky-700" aria-hidden /> {T("পরিবারের স্বাস্থ্য: প্রত্যেকের জন্য যা হাতের কাছে রাখবেন", "Family health: what to keep ready for each person")}</h2>
        <ul className="grid gap-2 sm:grid-cols-2">
          {FAMILY_HEALTH_GUIDE.map((f) => <li key={f.en} className="rounded-xl bg-slate-50 px-3 py-2.5 text-[15px] text-slate-800">• {bn ? f.bn : f.en}</li>)}
        </ul>
        <p className="text-[13px] text-slate-600">{T("এটি শুধু একটি তালিকা; এই পাতা কোনো তথ্য নেয় বা রাখে না।", "This is only a checklist; this page collects and keeps nothing.")}</p>
      </section>
    </main>
  );
}
