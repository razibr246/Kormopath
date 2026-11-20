"use client";

// "একটি জীবন, সাতটি অধ্যায়": the home page's animated story (data in lib/lifeStory.ts).
// One fictional young man, Rafi, lives through KormoPath's seven life stages as the visitor scrolls. In each stage he
// says his problem (a voice line; "শুনুন" reads it aloud with the app's Bangla voice), asks Buddy, Buddy names the
// real app, the app's card ticks through what it actually does, and the scene turns from grey rain to warm sun.
//
// Motion: the figure is FieldShift360's farmer rig (two-bone IK for arms and legs, a curved spine, a lungi that
// drapes), driven by damped springs (lib/spring.ts) toward key poses (lib/lifeStoryPoses.ts): scroll only moves the
// targets, physics moves the body, so every change has weight, overshoot and settle. Breathing, blinking, an idle
// weight shift, Buddy's float and the father's gamchha tail add secondary motion. The frame is painted straight into
// the SVG (a few dozen attribute writes), and runs only while the story is on screen.
//
// Accessibility: with reduced motion (or before the script runs) the same seven chapters render as a plain list.
import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { ArrowRight, Briefcase, Check, GraduationCap, Percent, Pill, ShieldCheck, Sprout, Volume2, Wallet, type LucideIcon } from "lucide-react";
import Farmer, { LOOKS, farmerPainter, type FarmerLook } from "@/field360/src/components/farmwork/Farmer";
import { solve, inHand } from "@/field360/src/components/farmwork/rig";
import { blink } from "@/field360/src/engine/motion";
import { BEATS, STAGES, STORY_END, STORY_HERO, STORY_TITLE, beat, stageAt, type Stage } from "@/lib/lifeStory";
import { FATHER_POSES, NUMERIC_CHANNELS, POSES, RIG_GROUND, SPRINGS, SPRING_DEFAULT, type RigPose } from "@/lib/lifeStoryPoses";
import { springInit, springSet, springStep } from "@/lib/spring";
import EVAL from "@/lib/eval-results.json";
import { bnDigits } from "@/lib/contract";

type Lang = "bn" | "en";
const ICONS: Record<Stage["id"], LucideIcon> = { study: GraduationCap, work: Briefcase, earn: Percent, home: Wallet, health: Pill, field: Sprout, protect: ShieldCheck };

const RAFI: FarmerLook = { skin: "#9a5f3c", hair: "#1c1714", shirt: "#3f8f86", shirtLine: "#2a6a63", sleeve: true, lungi: "#2f4a7a", check: "#8fa9d6", hat: "hair" };
const FATHER: FarmerLook = { ...LOOKS.tomato, lungi: "#5b3b2a", check: "#c79a72" };

// The scene: viewBox 1000 × 620; the rig (ground y 300) is drawn at this scale and offset.
const VB = { w: 1000, h: 620 };
const RIG_SCALE = 1.72, RIG_DX = 118, RIG_DY = 47; // rig ground 300 → scene y 563
const FATHER_X = 300; // his hips, in rig units (mirrored, facing Rafi)

/** Measured results (lib/eval-results.json), shown only where they belong to the stage's app. */
function evidence(id: Stage["id"], bn: boolean): string | null {
  const n = (x: number) => (bn ? bnDigits(String(x)) : String(x));
  const e = EVAL as unknown as { audit: { verified: number; verifiedQuoteFound: number }; fees: { cases: number }; triage?: { routine: number; falseUrgent: number } };
  if (id === "work") return bn ? `পরিমাপ: ${n(e.audit.verifiedQuoteFound)}/${n(e.audit.verified)} দক্ষতা সিভি থেকে হুবহু উদ্ধৃত` : `Measured: ${n(e.audit.verifiedQuoteFound)}/${n(e.audit.verified)} skills quoted word for word from the CV`;
  if (id === "earn") return bn ? `পরিমাপ: ${bnDigits(e.fees.cases.toLocaleString("en-US"))}টি ফি-হিসাব, প্রতিটি পয়সা পর্যন্ত মেলে` : `Measured: ${e.fees.cases.toLocaleString("en-US")} fee cases reconcile to the poisha`;
  if (id === "health" && e.triage) return bn ? `পরিমাপ: ${n(e.triage.routine - e.triage.falseUrgent)}/${n(e.triage.routine)} সাধারণ প্রশ্নে ভুল জরুরি সতর্কতা নেই` : `Measured: ${e.triage.routine - e.triage.falseUrgent}/${e.triage.routine} routine questions without a false alarm`;
  return null;
}

function useReducedMotion() {
  const [reduced, setReduced] = useState<boolean | null>(null);
  useEffect(() => {
    const m = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    const set = () => setReduced(!!m?.matches);
    set();
    m?.addEventListener?.("change", set);
    return () => m?.removeEventListener?.("change", set);
  }, []);
  return reduced;
}

const say = (text: string, lang: Lang) => {
  import("@/components/apps/legal/VoiceCall").then((m) => m.speakText(text, lang)).catch(() => {
    try { const u = new SpeechSynthesisUtterance(text); u.lang = lang === "bn" ? "bn-BD" : "en-GB"; speechSynthesis.cancel(); speechSynthesis.speak(u); } catch { /* no voice */ }
  });
};

// ---------- scenery ----------
function Scenery({ id }: { id: Stage["id"] }) {
  // Everything here is in rig units (ground y 300), inside the rig transform, so props line up with the figure.
  const desk = (
    <g>
      <rect x="226" y="224" width="120" height="7" rx="2" fill="#7a5233" />
      <rect x="232" y="231" width="6" height="69" fill="#5e3f27" /><rect x="334" y="231" width="6" height="69" fill="#5e3f27" />
      <rect x="160" y="250" width="44" height="6" rx="2" fill="#6b4a2f" /><rect x="166" y="256" width="5" height="44" fill="#4f3522" /><rect x="194" y="256" width="5" height="44" fill="#4f3522" />
    </g>
  );
  if (id === "study") return (
    <g>{desk}
      <rect x="292" y="206" width="38" height="6" fill="#c0563b" /><rect x="295" y="200" width="34" height="6" fill="#3f8f86" /><rect x="290" y="194" width="36" height="6" fill="#d9a441" />
      <path d="M252 222l22-6 18 4-22 6z" fill="#f6efe2" stroke="#c9bda8" /><path d="M262 221l12-3" stroke="#9b8f7c" strokeWidth=".8" />
      <path d="M314 194v-34l-10-8" fill="none" stroke="#3b3a36" strokeWidth="2.4" /><path d="M296 150l18-6 6 12z" fill="#e8b54f" />
    </g>
  );
  if (id === "work") return (
    <g>{desk}
      <path d="M262 224l6-36h52l-4 36z" fill="#2c3440" /><path d="M267 220l5-28h42l-3 28z" fill="#9fe3c9" className="kp-ls-screen" />
      <path d="M250 224h82l-4 4h-74z" fill="#3a4350" />
      <path d="M275 199h24M273 205h30M272 211h20" stroke="#1d5a4c" strokeWidth="1.6" strokeLinecap="round" />
    </g>
  );
  if (id === "earn") return (
    <g>
      <rect x="40" y="120" width="12" height="180" fill="#b88e5e" /><rect x="380" y="120" width="12" height="180" fill="#b88e5e" />
      <path d="M20 120h400l-20-24H40z" fill="#8a5a3a" /><circle cx="300" cy="140" r="9" fill="#f4cf87" className="kp-ls-lamp" />
    </g>
  );
  if (id === "home") return (
    <g>
      <rect x="276" y="262" width="34" height="38" rx="5" fill="#d9b07a" stroke="#a87c48" /><path d="M280 262c0-14 26-14 26 0" fill="none" stroke="#a87c48" strokeWidth="2.4" />
      <circle cx="286" cy="258" r="6" fill="#4e7b3c" /><circle cx="298" cy="256" r="7" fill="#c0563b" /><path d="M303 262l10-16" stroke="#6b8f3c" strokeWidth="4" strokeLinecap="round" />
      <g className="kp-ls-receipts"><path d="M120 272l14-4 4 14-14 4z" fill="#f6efe2" /><path d="M96 286l12-2 2 12-12 2z" fill="#f6efe2" /><path d="M140 290l13 1-1 9-13-1z" fill="#efe6d4" /></g>
    </g>
  );
  if (id === "health") return (
    <g>
      <rect x="236" y="236" width="150" height="26" rx="4" fill="#8a5a3a" /><rect x="240" y="262" width="7" height="38" fill="#6b4329" /><rect x="374" y="262" width="7" height="38" fill="#6b4329" />
      <rect x="238" y="226" width="146" height="12" rx="5" fill="#efe6d4" />
      <ellipse cx="258" cy="222" rx="18" ry="8" fill="#f6efe2" stroke="#ddd2bf" />
      {/* mother asleep under a kantha, her saree's end over her hair; the quilt rises and falls with her breath */}
      <circle cx="262" cy="214" r="10" fill="#9c6242" /><path d="M251 212c2-12 20-14 23-2-6-4-15-5-23 2z" fill="#a33b4a" />
      <path d="M262 216c2 1.6 4 1.6 5 .4" stroke="#5e3a28" strokeWidth="1" fill="none" />
      <path className="kp-ls-breath" d="M270 226c20-14 70-14 110-4v8H270z" fill="#c0563b" /><path className="kp-ls-breath" d="M282 220c18-4 50-4 90 2" stroke="#f4cf87" strokeWidth="1.4" strokeDasharray="4 3" fill="none" />
      <path d="M232 196v-30m0 0h10" stroke="#9aa7a3" strokeWidth="2" />
    </g>
  );
  if (id === "field") return (
    <g>
      {Array.from({ length: 14 }, (_, i) => (
        <g key={i} transform={`translate(${-20 + i * 34} 0)`}>
          <path d={`M0 300c2-14 1-22-3-32M4 300c1-12 4-20 9-28M8 300c0-14-2-22-6-30`} stroke="#6f9a3e" strokeWidth="2.2" fill="none" className="kp-ls-paddy" style={{ animationDelay: `${-i * 0.37}s` }} />
        </g>
      ))}
    </g>
  );
  return ( // protect: a village road at dusk, a tea stall's post
    <g>
      <path d="M-60 300C80 286 300 284 520 300" stroke="#c9b48f" strokeWidth="10" fill="none" opacity=".6" />
      <rect x="388" y="176" width="8" height="124" fill="#6b4a2f" /><path d="M372 176h44l-6-12h-32z" fill="#8a5a3a" />
    </g>
  );
}

function PhoneProp({ glow }: { glow: string }) {
  return (
    <g>
      <rect x="-4" y="-13" width="9" height="17" rx="2" fill="#1e2530" stroke="#0e1218" strokeWidth=".8" />
      <rect x="-2.7" y="-11.4" width="6.4" height="13.6" rx="1" fill={glow} />
    </g>
  );
}

// ---------- the interactive story ----------
function Story({ lang }: { lang: Lang }) {
  const bn = lang === "bn";
  const outer = useRef<HTMLDivElement>(null);
  const stageEl = useRef<HTMLDivElement>(null);
  const rafiRef = useRef<SVGGElement>(null), fatherRef = useRef<SVGGElement>(null), phoneRef = useRef<SVGGElement>(null);
  const buddyRef = useRef<SVGGElement>(null), sunRef = useRef<SVGGElement>(null), rainRef = useRef<SVGGElement>(null);
  const [index, setIndex] = useState(0);
  // Portrait screens frame Rafi and Buddy above the app card (the scene runs on below its usual ground).
  const [portrait, setPortrait] = useState(false);
  useEffect(() => {
    const m = window.matchMedia("(max-aspect-ratio: 1/1)");
    const set = () => setPortrait(m.matches);
    set(); m.addEventListener("change", set);
    return () => m.removeEventListener("change", set);
  }, []);
  const portraitRef = useRef(false);
  portraitRef.current = portrait;
  const stage = STAGES[index];
  const Icon = ICONS[stage.id];
  const ev = evidence(stage.id, bn);

  useEffect(() => {
    const root = outer.current, box = stageEl.current;
    if (!root || !box || !rafiRef.current || !fatherRef.current) return;
    const paintRafi = farmerPainter(rafiRef.current, RAFI);
    const paintFather = farmerPainter(fatherRef.current, FATHER);
    const body = springSet(SPRINGS, SPRING_DEFAULT), dad = springSet(SPRINGS, SPRING_DEFAULT);
    let prog = springInit(0), buddyX = springInit(320), buddyY = springInit(120), mood = springInit(0), headV = springInit(0);
    let visible = false, raf = 0, last = performance.now(), t = 0, shown = -1;

    const target = () => {
      const r = root.getBoundingClientRect();
      const span = Math.max(1, r.height - window.innerHeight);
      return Math.min(1, Math.max(0, -r.top / span));
    };
    const channels = (p: RigPose) => { const o: Record<string, number> = {}; for (const k of NUMERIC_CHANNELS) o[k] = p[k] as number; return o; };

    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000); last = now; t += dt;
      // The story position itself rides a spring, so a flick of the wheel glides instead of jumping.
      prog = springStep(prog, target(), dt, { f: 1.6, z: 1 });
      const { index: i, local } = stageAt(prog.y);
      if (i !== shown) { shown = i; setIndex(i); }
      const st = STAGES[i];
      const bP = beat(local, BEATS.problem), bB = beat(local, BEATS.buddy), bA = beat(local, BEATS.app), bS = beat(local, BEATS.solved);
      // Which key pose he is heading for; the springs do the moving.
      const key = local < 0.34 ? st.poses[0] : local < 0.74 ? st.poses[1] : st.poses[2];
      const goal = POSES[key];
      const raw = body.step(channels(goal), dt);
      // Secondary motion: breath through the chest and hips, a slow weight shift while he stands.
      const breath = Math.sin(t * ((2 * Math.PI) / 3.8));
      const standing = goal.hipY < 215 ? 1 : 0;
      const pose = { ...goal, ...raw, chest: raw.chest + breath * 1.3, hipY: raw.hipY + breath * 0.5, hipX: raw.hipX + standing * Math.sin(t * 0.55) * 1.6 };
      const sk = solve(pose, RIG_GROUND);
      paintRafi(sk, { blink: blink(t, 3) });
      // Phone in his near hand, glowing brighter once Buddy has found the app.
      const ph = phoneRef.current;
      if (ph) {
        const [x, y, a] = inHand(sk, "n", 8, -1);
        ph.setAttribute("transform", `translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${(a + 90).toFixed(1)})`);
        ph.setAttribute("opacity", Math.min(1, Math.max(0, raw.phone)).toFixed(2));
      }
      // The father: present in the field and the last chapter; asking first, pleased once solved.
      const fd = fatherRef.current!;
      const withDad = st.cast.includes("father");
      fd.style.opacity = withDad ? "1" : "0";
      if (withDad) {
        const fg = local < 0.74 && st.id === "field" ? FATHER_POSES.ask : FATHER_POSES.happy;
        const fr = dad.step(channels(fg), dt);
        const fpose = { ...fg, ...fr, chest: fr.chest + Math.sin(t * 1.5 + 1) * 1.1 };
        const fsk = solve(fpose, RIG_GROUND);
        headV = springStep(headV, dad.velocity("head"), dt, { f: 2, z: 0.5 });
        paintFather(fsk, { blink: blink(t, 11), tail: -headV.y * 0.9 + Math.sin(t * 2.1) * 4, tailBend: Math.sin(t * 1.7) * 3 });
      }
      // Buddy floats near his head on a loose spring (it trails, overshoots a little, bobs).
      const head = sk.atlas as [number, number];
      const pt = portraitRef.current;
      buddyX = springStep(buddyX, head[0] + (pt ? 50 : 78), dt, { f: 0.9, z: 0.55 });
      buddyY = springStep(buddyY, head[1] - (pt ? 22 : 70) + Math.sin(t * 1.9) * 5, dt, { f: 0.9, z: 0.55 });
      const bd = buddyRef.current;
      if (bd) {
        const talk = bB * (1 - bS);
        bd.setAttribute("transform", `translate(${buddyX.y.toFixed(1)} ${buddyY.y.toFixed(1)}) scale(${(1 + talk * 0.18 + Math.sin(t * 6) * talk * 0.03).toFixed(3)})`);
        bd.style.setProperty("--talk", talk.toFixed(3));
      }
      // Mood: grey rain while it is a problem, warm sun once solved.
      mood = springStep(mood, bS, dt, { f: 0.8, z: 1 });
      sunRef.current?.setAttribute("opacity", mood.y.toFixed(3));
      rainRef.current?.setAttribute("opacity", ((1 - mood.y) * (1 - bA * 0.6)).toFixed(3));
      const s = box.style;
      s.setProperty("--b-problem", (bP * (1 - bB)).toFixed(3));
      s.setProperty("--b-buddy", (bB * (1 - bS)).toFixed(3));
      s.setProperty("--b-app", bA.toFixed(3));
      s.setProperty("--b-solved", bS.toFixed(3));
      s.setProperty("--mood", mood.y.toFixed(3));
      s.setProperty("--local", local.toFixed(3));
      const sayNow = bS > 0.5 ? "solved" : bB > 0.5 ? "buddy" : "problem";
      if (box.dataset.say !== sayNow) box.dataset.say = sayNow;
      if (visible) raf = requestAnimationFrame(frame);
    };
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      cancelAnimationFrame(raf);
      if (visible) { last = performance.now(); raf = requestAnimationFrame(frame); }
    }, { rootMargin: "120px" });
    io.observe(root);
    // Start at the right pose (no swoop from the default when arriving mid-story).
    const p0 = target(); prog = springInit(p0);
    const s0 = stageAt(p0); body.snap(channels(POSES[STAGES[s0.index].poses[0]]));
    dad.snap(channels(FATHER_POSES.ask));
    frame(performance.now());
    return () => { io.disconnect(); cancelAnimationFrame(raf); };
  }, []);

  const jump = (i: number) => {
    const r = outer.current!.getBoundingClientRect();
    const span = r.height - window.innerHeight;
    window.scrollTo({ top: window.scrollY + r.top + span * ((i + 0.62) / STAGES.length), behavior: "smooth" });
  };

  const line = (x: { bn: string; en: string }) => (bn ? x.bn : x.en);
  const num = (n: number) => (bn ? bnDigits(String(n).padStart(2, "0")) : String(n).padStart(2, "0"));
  const v = (name: string, k = 1): CSSProperties => ({ opacity: `calc(var(${name}) * ${k})` as unknown as number });

  return (
    <div ref={outer} style={{ height: `${STAGES.length * 125 + 40}vh` }} className="kp-ls-bleed relative" data-testid="life-story">
      <div ref={stageEl} className="kp-ls sticky top-0 h-[100svh] overflow-hidden" data-say="problem" style={{ ["--mood" as string]: 0 }}>
        {/* sky: grey and heavy while there is a problem, warm once solved (blended by --mood) */}
        <div className="kp-ls-sky absolute inset-0" aria-hidden="true" />
        <svg className="absolute inset-0 h-full w-full" viewBox={portrait ? "222 -170 520 1000" : `0 0 ${VB.w} ${VB.h}`} preserveAspectRatio={portrait ? "xMidYMid slice" : "xMidYMax slice"} aria-hidden="true">
          <defs>
            <radialGradient id="kp-ls-sun" cx="50%" cy="50%" r="50%"><stop offset="0" stopColor="#fff1c9" /><stop offset=".45" stopColor="#f6c56b" stopOpacity=".85" /><stop offset="1" stopColor="#f6c56b" stopOpacity="0" /></radialGradient>
            <radialGradient id="kp-ls-orb" cx="38%" cy="32%" r="70%"><stop offset="0" stopColor="#e9fff6" /><stop offset=".35" stopColor="#5fd3a6" /><stop offset=".8" stopColor="#0e6b4f" /><stop offset="1" stopColor="#084532" /></radialGradient>
          </defs>
          {/* watermark: the chapter number and name, huge and faint */}
          <text x="40" y="250" className="kp-ls-mark" fontSize="250">{num(stage.n)}</text>
          <text x="48" y="330" className="kp-ls-mark" fontSize="84">{line(stage.label)}</text>
          <g ref={sunRef} opacity="0"><circle cx="820" cy="140" r="150" fill="url(#kp-ls-sun)" /><circle cx="820" cy="140" r="38" fill="#ffd27a" /></g>
          {/* far hills and near ground, tinted by the chapter */}
          <path d="M0 470C140 420 260 440 380 452S640 410 780 430 960 450 1000 440V620H0Z" className="kp-ls-hill-far" />
          <path d="M0 540C180 512 360 524 520 536S820 512 1000 528V620H0Z" className="kp-ls-hill" />
          <g ref={rainRef}>
            {Array.from({ length: 46 }, (_, i) => (
              <line key={i} x1={(i * 97) % 1000} y1={-40 - ((i * 53) % 300)} x2={(i * 97) % 1000 - 9} y2={-10 - ((i * 53) % 300)} className="kp-ls-rain" style={{ animationDelay: `${-((i * 37) % 100) / 100}s` }} />
            ))}
          </g>
          <g transform={`translate(${RIG_DX} ${RIG_DY}) scale(${RIG_SCALE})`}>
            <g key={stage.id} className="kp-ls-props"><Scenery id={stage.id} /></g>
            <g ref={fatherRef} transform={`translate(${FATHER_X + 200} 0) scale(-1 1)`} style={{ transition: "opacity .6s" }}><Farmer look={FATHER} /></g>
            <g ref={rafiRef}><Farmer look={RAFI} /></g>
            <g ref={phoneRef} opacity="0"><PhoneProp glow="#9fe3c9" /></g>
            {/* Buddy: the same green orb as the assistant in the corner */}
            <g ref={buddyRef} className="kp-ls-buddy">
              <circle r="21" className="kp-ls-buddy-ring" />
              <circle r="15" fill="url(#kp-ls-orb)" />
              <ellipse cx="-5" cy="-6" rx="4.6" ry="2.6" fill="#fff" opacity=".75" />
              <circle cx="5" cy="-1" r="2.2" fill="#fff" opacity=".9" className="kp-ls-buddy-eye" />
            </g>
          </g>
          <path d="M0 600H1000V1100H0Z" className="kp-ls-hill" />
        </svg>

        {/* chapter rail */}
        <nav aria-label={bn ? "সাতটি অধ্যায়" : "Seven chapters"} className="kp-ls-rail absolute inset-x-0 top-[80px] z-20 mx-auto flex max-w-[1100px] gap-1.5 overflow-x-auto px-3 sm:top-[96px] sm:gap-2">
          {STAGES.map((s, i) => {
            const I = ICONS[s.id];
            return (
              <button key={s.id} type="button" onClick={() => jump(i)} aria-current={i === index ? "step" : undefined}
                className={`kp-ls-chip ${i === index ? "kp-ls-chip-on" : i < index ? "kp-ls-chip-done" : ""}`}>
                <I size={14} aria-hidden="true" /><span>{line(s.label)}</span>
                {i === index && <i className="kp-ls-chip-fill" aria-hidden="true" />}
              </button>
            );
          })}
        </nav>

        {/* title, then the dialogue: Rafi's problem → Buddy → Rafi's solution, as voice lines */}
        <div className="absolute bottom-3 left-3 right-3 z-10 sm:bottom-auto sm:left-[5%] sm:right-auto sm:top-[150px] sm:w-[min(520px,44vw)]">
          <p className="kp-eyebrow !text-emerald-900 hidden sm:block">{line(STORY_TITLE)} · {bn ? `অধ্যায় ${num(stage.n)}` : `Chapter ${num(stage.n)}`}</p>
          <div className="relative min-h-[150px] sm:mt-2 sm:min-h-[150px]">
            {([
              ["--b-problem", line(STORY_HERO), line(stage.problem), "kp-ls-say-rafi kp-ls-say-problem"],
              ["--b-buddy", bn ? "বাডি" : "Buddy", line(stage.buddy), "kp-ls-say-buddy kp-ls-say-buddyline"],
              ["--b-solved", line(STORY_HERO), line(stage.solution), "kp-ls-say-rafi kp-ls-say-happy kp-ls-say-solved"],
            ] as const).map(([cv, who, text, cls]) => (
              <figure key={cv} className={`kp-ls-say ${cls}`}>
                <figcaption><span className="kp-ls-wave" aria-hidden="true"><i /><i /><i /><i /></span>{who}</figcaption>
                <blockquote>{text}</blockquote>
                <button type="button" className="kp-ls-listen" onClick={() => say(`${who}: ${text}`, lang)} aria-label={bn ? `শুনুন: ${who}` : `Listen: ${who}`}><Volume2 size={14} aria-hidden="true" />{bn ? "শুনুন" : "Listen"}</button>
              </figure>
            ))}
          </div>
        </div>

        {/* the real app, ticking through what it does */}
        <aside aria-label={line(stage.app.name)} className="kp-ls-app absolute left-3 right-3 top-[130px] z-10 sm:left-auto sm:right-[5%] sm:top-[150px] sm:w-[340px]" style={{ opacity: "var(--b-app)" as unknown as number, transform: "translateY(calc((1 - var(--b-app)) * 24px))" }}>
          <div className="flex items-center gap-2.5 border-b border-line pb-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200"><Icon size={18} aria-hidden="true" /></span>
            <div className="min-w-0"><p className="text-[11.5px] font-semibold text-slate-500">KormoPath</p><p className="truncate text-[15.5px] font-bold text-slate-900">{line(stage.app.name)}</p></div>
          </div>
          <ul className="mt-2.5 space-y-1.5">
            {stage.steps.map((s, k) => (
              <li key={k} className={`flex gap-2 text-[13.5px] leading-snug text-slate-800 ${k >= 2 ? "hidden sm:flex" : ""}`} style={{ opacity: `clamp(0, calc(var(--b-app) * ${stage.steps.length + 1} - ${k}), 1)` as unknown as number }}>
                <Check size={15} className="mt-0.5 shrink-0 text-emerald-700" aria-hidden="true" />{line(s)}
              </li>
            ))}
          </ul>
          {ev && <p className="mt-2.5 rounded-lg bg-amber-50 px-2.5 py-1.5 text-[12.5px] font-semibold text-amber-900 ring-1 ring-amber-200" style={v("--b-solved")}>{ev}</p>}
          <Link href={stage.app.href} prefetch={false} className="mt-2.5 inline-flex items-center gap-1 text-[13.5px] font-bold text-emerald-800 hover:underline">
            {bn ? "অ্যাপটি খুলুন" : "Open the app"} <ArrowRight size={14} aria-hidden="true" />
          </Link>
        </aside>

        <p className="absolute bottom-1 right-3 z-10 hidden text-[11px] text-slate-600 sm:block">{bn ? "রাফি ও তার পরিবার কাল্পনিক চরিত্র; অ্যাপের প্রতিটি সুবিধা আসল।" : "Rafi and his family are fictional; every app feature is real."}</p>
      </div>
    </div>
  );
}

// ---------- the plain version: reduced motion, and before the script runs ----------
function StoryList({ lang }: { lang: Lang }) {
  const bn = lang === "bn";
  const line = (x: { bn: string; en: string }) => (bn ? x.bn : x.en);
  return (
    <ol className="grid gap-4 md:grid-cols-2" data-testid="life-story-list">
      {STAGES.map((s) => {
        const I = ICONS[s.id];
        const ev = evidence(s.id, bn);
        return (
          <li key={s.id} className="rounded-2xl border border-line bg-white p-5">
            <p className="flex items-center gap-2 text-[13px] font-bold text-emerald-800"><I size={16} aria-hidden="true" />{bn ? `অধ্যায় ${bnDigits(String(s.n))}` : `Chapter ${s.n}`} · {line(s.label)}</p>
            <p className="mt-2 text-[15px] text-slate-700">“{line(s.problem)}”</p>
            <p className="mt-2 text-[14px] text-emerald-900"><strong>{bn ? "বাডি:" : "Buddy:"}</strong> {line(s.buddy)}</p>
            <p className="mt-2 text-[15px] font-semibold text-slate-900">“{line(s.solution)}”</p>
            {ev && <p className="mt-2 text-[12.5px] font-semibold text-amber-900">{ev}</p>}
            <Link href={s.app.href} prefetch={false} className="mt-3 inline-flex items-center gap-1 text-[14px] font-bold text-emerald-800 hover:underline">{line(s.app.name)} <ArrowRight size={14} aria-hidden="true" /></Link>
          </li>
        );
      })}
    </ol>
  );
}

export function LifeStory({ lang }: { lang: Lang }) {
  const bn = lang === "bn";
  const reduced = useReducedMotion();
  // The animated figures are built only once the visitor scrolls near the story, so the home page's first load
  // (its hero, its speed score) never pays for them; until then the plain list holds the place.
  const wrap = useRef<HTMLDivElement>(null);
  const [near, setNear] = useState(false);
  useEffect(() => {
    const el = wrap.current;
    if (!el || near) return;
    if (!("IntersectionObserver" in window)) { setNear(true); return; }
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setNear(true); io.disconnect(); } }, { rootMargin: "900px 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, [near]);
  const animated = reduced === false && near;
  const end = useMemo(() => (bn ? STORY_END.bn : STORY_END.en), [bn]);
  return (
    <section aria-labelledby="life-story-title" className="kp-ls-wrap mt-24">
      <div className="mx-auto max-w-[1100px] px-1">
        <p className="kp-eyebrow">{bn ? "একজন মানুষের গল্প" : "One person's story"}</p>
        <h2 id="life-story-title" className="mt-3 text-[clamp(32px,5vw,58px)] font-semibold leading-[1.05] tracking-tight text-slate-900">
          {bn ? <>একটি জীবন, <em className="kp-em">সাতটি অধ্যায়</em></> : <>One life, <em className="kp-em">seven chapters</em></>}
        </h2>
        <p className="mt-3 max-w-2xl text-[17px] leading-relaxed text-slate-600">
          {bn ? "রাজশাহীর কৃষক পরিবারের ছেলে রাফি (কাল্পনিক)। ভর্তি থেকে প্রথম আয়, মায়ের অসুখ থেকে বাবার মাঠ আর প্রতারকের এসএমএস: প্রতিটি মোড়ে সে কী সমস্যায় পড়ে, বাডি কোন অ্যাপ দেখায়, আর কী বদলায়। নিচে স্ক্রল করুন।" : "Rafi (fictional), from a farming family in Rajshahi. From admission to his first pay, his mother's fever, his father's field and a scammer's SMS: at every turn, the problem, the app Buddy points to, and what changes. Scroll down."}
        </p>
      </div>
      <div ref={wrap} className="mt-8">{animated ? <Story lang={lang} /> : <div className="mx-auto max-w-[1100px]"><StoryList lang={lang} /></div>}</div>
      <div className="mx-auto mt-10 max-w-[1100px] rounded-[28px] bg-[#1d1712] px-6 py-10 text-center sm:px-12">
        <p className="mx-auto max-w-2xl text-[clamp(20px,2.6vw,28px)] font-semibold leading-snug text-[#fbf3e8]">{end}</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link href="/workspace" className="kp-btn-sun kp-btn-lg">{bn ? "ওয়ার্কস্পেস খুলুন" : "Open the Workspace"} <ArrowRight size={17} aria-hidden="true" /></Link>
          <button type="button" onClick={() => window.dispatchEvent(new Event("kormopath:open-buddy"))} className="kp-btn-ghost kp-btn-lg !border-white/30 !bg-white/10 !text-[#fbf3e8]">{bn ? "বাডিকে জিজ্ঞেস করুন" : "Ask Buddy"}</button>
        </div>
      </div>
    </section>
  );
}
