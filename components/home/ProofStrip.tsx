"use client";

// "Measured, not claimed": the home page's proof numbers. Every figure is read from lib/eval-results.json, which
// scripts/eval.ts writes by running the real agents (see /trust); nothing here is typed in by hand. Numbers count
// up once when the strip scrolls into view; with reduced motion they appear at their final value.
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, FlaskConical } from "lucide-react";
import EVAL from "@/lib/eval-results.json";
import { bnDigits } from "@/lib/contract";

type Lang = "bn" | "en";
type Stat = { value: number; total?: number; bn: string; en: string };

type Triage = { routine: number; falseUrgent: number };
const triage = (EVAL as unknown as { triage?: Triage }).triage;

const STATS: Stat[] = [
  { value: EVAL.audit.verifiedQuoteFound, total: EVAL.audit.verified, bn: "দক্ষতা সিভি থেকে হুবহু উদ্ধৃত", en: "skills quoted word for word from the CV" },
  { value: EVAL.probes.filter((p) => p.passed).length, total: EVAL.probes.length, bn: "ফাঁদ-সিভিতে কোনো দক্ষতা বানানো হয়নি", en: "trap CVs: no skill invented" },
  { value: EVAL.pitch.amountsNotInContract, total: EVAL.pitch.amountsFound, bn: "পিচে চুক্তির বাইরের ডলার অঙ্ক", en: "dollar amounts in pitches outside the contract" },
  ...(triage ? [{ value: triage.falseUrgent, total: triage.routine, bn: "সাধারণ স্বাস্থ্য প্রশ্নে ভুল জরুরি সতর্কতা", en: "routine health questions wrongly sent to 999" }] : []),
  { value: EVAL.fees.cases, bn: "ফি-হিসাবের ঘটনা, প্রতিটি পয়সা পর্যন্ত মেলে", en: "fee cases that reconcile to the poisha" },
];

function useCountUp(target: number, run: boolean, ms = 1100) {
  const [n, setN] = useState(target);
  useEffect(() => {
    if (!run) return;
    if (typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) { setN(target); return; }
    let raf = 0;
    const t0 = performance.now();
    const step = (t: number) => {
      const p = Math.min(1, (t - t0) / ms);
      setN(Math.round(target * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    setN(0);
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [run, target, ms]);
  return n;
}

function Figure({ stat, run, lang }: { stat: Stat; run: boolean; lang: Lang }) {
  const n = useCountUp(stat.value, run);
  const fmt = (x: number) => (lang === "bn" ? bnDigits(x.toLocaleString("en-US")) : x.toLocaleString("en-US"));
  return (
    <div className="kp-proof-item">
      <p className="kp-proof-num" aria-hidden="true">
        {fmt(n)}
        {stat.total !== undefined && <span className="kp-proof-tot">/{fmt(stat.total)}</span>}
      </p>
      <p className="sr-only">{fmt(stat.value)}{stat.total !== undefined ? ` / ${fmt(stat.total)}` : ""}</p>
      <p className="kp-proof-label">{lang === "bn" ? stat.bn : stat.en}</p>
    </div>
  );
}

export function ProofStrip({ lang }: { lang: Lang }) {
  const ref = useRef<HTMLElement>(null);
  const [run, setRun] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") { setRun(true); return; }
    const io = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) { setRun(true); io.disconnect(); } }, { threshold: 0.35 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  const date = new Date(EVAL.generatedAt);
  const when = date.toLocaleDateString(lang === "bn" ? "bn-BD" : "en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Dhaka" });
  const live = /^https:\/\//.test(String(EVAL.base));
  return (
    <section ref={ref} aria-labelledby="proof-title" className="kp-proof mt-6" data-testid="home-proof">
      <div className="kp-proof-head">
        <p id="proof-title" className="kp-eyebrow inline-flex items-center gap-2"><FlaskConical size={14} aria-hidden="true" /> {lang === "bn" ? "দাবি নয়, পরিমাপ" : "Measured, not claimed"}</p>
        <p className="kp-proof-note">
          {lang === "bn" ? `${live ? "লাইভ সাইটে" : "প্রোডাকশন বিল্ডে"} আসল এজেন্ট চালিয়ে মাপা · ${when}` : `Measured by running the real agents ${live ? "on the live site" : "on a production build"} · ${when}`}
        </p>
      </div>
      <div className="kp-proof-grid">
        {STATS.map((s) => <Figure key={s.en} stat={s} run={run} lang={lang} />)}
      </div>
      <Link href="/trust" className="kp-proof-link">
        {lang === "bn" ? "কীভাবে মাপা হয়েছে, পুরো ফল দেখুন" : "See how it was measured"} <ArrowRight size={15} aria-hidden="true" />
      </Link>
    </section>
  );
}
