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
import { ArrowRight, Briefcase, Check, GraduationCap, Maximize, Pause, Percent, Pill, Play, RotateCcw, Scale, Sprout, Volume2, VolumeX, Wallet, type LucideIcon } from "lucide-react";
import { storageKey, usePersistentState } from "@/lib/clientStore";
import Farmer, { LOOKS, farmerPainter, type FarmerLook } from "@/field360/src/components/farmwork/Farmer";
import { solve, inHand } from "@/field360/src/components/farmwork/rig";
import { blink } from "@/field360/src/engine/motion";
import { Backdrop, INDOOR, Lighting } from "@/components/home/lifeStoryArt";
import type { StoryAudio } from "@/components/home/storyAudio";
import { BEATS, STAGES, STORY_END, STORY_HERO, STORY_TITLE, beat, stageAt, type Stage } from "@/lib/lifeStory";
import { FATHER_POSES, NUMERIC_CHANNELS, POSES, RIG_GROUND, SPRINGS, SPRING_DEFAULT, type RigPose } from "@/lib/lifeStoryPoses";
import { footAt, springInit, springSet, springStep, stepFeet } from "@/lib/spring";
import type React from "react";
import EVAL from "@/lib/eval-results.json";
import { bnDigits } from "@/lib/contract";

type Lang = "bn" | "en";
const ICONS: Record<Stage["id"], LucideIcon> = { study: GraduationCap, work: Briefcase, earn: Percent, home: Wallet, health: Pill, field: Sprout, protect: Scale };

// Wardrobe: what each person would really wear in that situation (the costume changes under the chapter slate).
const RAFI_BASE: FarmerLook = { skin: "#9a5f3c", hair: "#1c1714", shirt: "#3f8f86", shirtLine: "#2a6a63", sleeve: true, lungi: "#2f4a7a", check: "#8fa9d6", hat: "hair" };
const WARDROBE: Record<Stage["id"], FarmerLook> = {
  // a student at home in the morning: T-shirt and pajama, barefoot
  study: { ...RAFI_BASE, shirt: "#e8b54f", shirtLine: "#a8792c", pants: "#8b929a", skirt: "none" },
  // late-night coding: a dark long-sleeved top and dark trousers
  work: { ...RAFI_BASE, shirt: "#3a4352", shirtLine: "#232a35", longSleeve: true, pants: "#2c3340", skirt: "none" },
  // out on business (the payment, the bank): a light-blue shirt, trousers and shoes
  earn: { ...RAFI_BASE, shirt: "#cfe0f2", shirtLine: "#8aa6c4", longSleeve: true, pants: "#2f3a4a", shoes: "#2a2018", skirt: "none" },
  // the bazar: T-shirt, lungi and sandals, as it is worn there
  home: { ...RAFI_BASE, sandals: true },
  // taking Mother to hospital at night: a long-sleeved shirt, trousers, sandals
  health: { ...RAFI_BASE, shirt: "#8a3f3a", shirtLine: "#5e2a26", longSleeve: true, pants: "#3d4654", sandals: true, skirt: "none" },
  // in the field with Father: a ganji, the lungi tucked up, a gamchha round his head
  field: { ...RAFI_BASE, shirt: undefined, sleeve: false, vest: "#f3efe6", vestLine: "#cfc6b5", lungi: "#4e7b3c", check: "#b8d39a", tuck: true, hat: "gamcha", hatColor: "#eef3e4", hatLine: "#3d7a46" },
  // the legal aid office: a cream panjabi and pajama, sandals
  protect: { ...RAFI_BASE, shirt: "#f4efe2", shirtLine: "#c9bc9a", longSleeve: true, skirt: "kurta", hem: 0.9, hemDrop: 5, pants: "#e4dccb", sandals: true },
};
const FATHER_FIELD: FarmerLook = { ...LOOKS.tomato, lungi: "#5b3b2a", check: "#c79a72" };
// to the legal aid office: a white panjabi and pajama
const FATHER_WARDROBE: Partial<Record<Stage["id"], FarmerLook>> = {
  protect: { ...FATHER_FIELD, shirt: "#fbf8f1", shirtLine: "#cfc7b4", longSleeve: true, skirt: "kurta", hem: 0.95, hemDrop: 5, pants: "#e9e3d3", sandals: true },
};
const fatherLook = (id: Stage["id"]) => FATHER_WARDROBE[id] ?? FATHER_FIELD;

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
      {/* code types itself; a verified badge lands on the screen once the passport is signed */}
      <path d="M275 199h24M273 205h30M272 211h20" stroke="#1d5a4c" strokeWidth="1.6" strokeLinecap="round" className="kp-ls-code" />
      <g className="kp-ls-badge" transform="translate(304 200)"><circle r="6.5" fill="#0e6b4f" stroke="#fff" strokeWidth="1.2" /><path d="M-3 0l2 2.3 4-4.6" stroke="#fff" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round" /></g>
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
      <g className="kp-ls-receipts"><g className="kp-ls-receipt"><path d="M120 272l14-4 4 14-14 4z" fill="#f6efe2" /></g><g className="kp-ls-receipt"><path d="M96 286l12-2 2 12-12 2z" fill="#f6efe2" /></g><g className="kp-ls-receipt"><path d="M140 290l13 1-1 9-13-1z" fill="#efe6d4" /></g></g>
    </g>
  );
  if (id === "health") return (
    <g>
      <rect x="236" y="236" width="150" height="26" rx="4" fill="#8a5a3a" /><rect x="240" y="262" width="7" height="38" fill="#6b4329" /><rect x="374" y="262" width="7" height="38" fill="#6b4329" />
      <rect x="238" y="226" width="146" height="12" rx="5" fill="#efe6d4" />
      <ellipse cx="258" cy="222" rx="18" ry="8" fill="#f6efe2" stroke="#ddd2bf" />
      {/* mother asleep under a kantha, her saree's end over her hair; the quilt rises and falls with her breath */}
      <circle cx="262" cy="214" r="10" fill="#9c6242" /><path d="M251 212c2-12 20-14 23-2-6-4-15-5-23 2z" fill="#a33b4a" />
      {/* her eyes: closed with fever, open and smiling once she has been seen in time */}
      <path d="M257.4 211.4q1.6 1 3.2 0M264 211.4q1.6 1 3.2 0" stroke="#5e3a28" strokeWidth=".9" fill="none" className="kp-ls-eyes-shut" />
      <g className="kp-ls-eyes-open"><circle cx="259" cy="211" r="1.1" fill="#2a1d16" /><circle cx="265.6" cy="211" r="1.1" fill="#2a1d16" /><path d="M261 216.4q3 2.6 6 0" stroke="#5e3a28" strokeWidth="1" fill="none" /></g>
      <path d="M262 216c2 1.6 4 1.6 5 .4" stroke="#5e3a28" strokeWidth="1" fill="none" className="kp-ls-eyes-shut" />
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

// ---------- the story player ----------
/** Seconds per chapter: problem ≈ 3 s, Buddy ≈ 2.4 s, the app ≈ 3.7 s, the solution ≈ 3 s. */
const CHAPTER_SECONDS = 11;
const CHAPTERS_END = STAGES.length * CHAPTER_SECONDS;
/** The epilogue: sunrise over the field, father and son, the apps rising like sky lanterns. */
const EPILOGUE_SECONDS = 7;
const DURATION = CHAPTERS_END + EPILOGUE_SECONDS;
const APP_GLOW: Record<Stage["id"], string> = { study: "#9cc3ff", work: "#9fe3c9", earn: "#ffd58a", home: "#ffb08a", health: "#ffa3b4", field: "#c8ec8f", protect: "#ffd27a" };
const clock = (s: number, bn: boolean) => {
  const v = `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
  return bn ? bnDigits(v) : v;
};
const sanitizeBool = (raw: unknown) => (typeof raw === "boolean" ? raw : null);

function Story({ lang }: { lang: Lang }) {
  const bn = lang === "bn";
  const stageEl = useRef<HTMLDivElement>(null);
  const rafiRef = useRef<SVGGElement>(null), fatherRef = useRef<SVGGElement>(null), phoneRef = useRef<SVGGElement>(null), screenRef = useRef<SVGRectElement>(null);
  const buddyRef = useRef<SVGGElement>(null), sunRef = useRef<SVGGElement>(null), rainRef = useRef<SVGGElement>(null);
  const camRef = useRef<SVGGElement>(null), beamRef = useRef<SVGPathElement>(null), fgRef = useRef<SVGGElement>(null);
  // The painters hold references to the drawn parts, so they are rebuilt whenever a costume change remounts the figure.
  const paintRafiRef = useRef<ReturnType<typeof farmerPainter> | null>(null), paintFatherRef = useRef<ReturnType<typeof farmerPainter> | null>(null);
  const tuftRef = useRef<Element | null>(null);
  const trailRef = useRef<SVGGElement>(null);
  const farRef = useRef<SVGGElement>(null), coinsRef = useRef<SVGGElement>(null), smsRef = useRef<SVGGElement>(null);
  const dustN = useRef<SVGEllipseElement>(null), dustF = useRef<SVGEllipseElement>(null), rimRef = useRef<SVGRectElement>(null);
  const scrubRef = useRef<HTMLInputElement>(null), timeRef = useRef<HTMLSpanElement>(null);
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [ended, setEnded] = useState(false);
  const [started, setStarted] = useState(false);
  const [epilogue, setEpilogue] = useState(false);
  const [autoplay, setAutoplay] = usePersistentState<boolean>(storageKey("platform", "storyAutoplay"), true, sanitizeBool);
  const [portrait, setPortrait] = useState(false);
  // Everything the frame loop reads lives in refs, so play/pause/seek never restart the loop.
  // Sound: soft music and sound design (components/home/storyAudio.ts), on by default and remembered on this device.
  // Browsers only allow sound after a click, so it starts on the first press of play, a chapter, or the sound button.
  const [sound, setSound] = usePersistentState<boolean>(storageKey("platform", "storySound"), true, sanitizeBool);
  const [audible, setAudible] = useState(false);
  const audio = useRef<StoryAudio | null>(null);
  const ctl = useRef({ time: 0, playing: false, scrubbing: false, userPaused: false, visible: false, autoplay: true, portrait: false, sound: true });
  ctl.current.autoplay = autoplay;
  ctl.current.sound = sound;
  const startSound = async () => {
    if (!ctl.current.sound) return;
    if (!audio.current) {
      try { const { StoryAudio } = await import("@/components/home/storyAudio"); audio.current = new StoryAudio(0.7); } catch { return; }
    }
    await audio.current.resume();
    setAudible(audio.current.running);
  };
  const stopSound = () => { audio.current?.suspend(); setAudible(false); };
  const toggleSound = () => {
    const next = !sound; setSound(next); ctl.current.sound = next;
    if (next) { void startSound(); } else stopSound();
  };
  useEffect(() => () => { audio.current?.close(); audio.current = null; }, []);
  ctl.current.portrait = portrait;
  const stage = STAGES[index];
  useEffect(() => {
    if (rafiRef.current) { paintRafiRef.current = farmerPainter(rafiRef.current, WARDROBE[stage.id]); tuftRef.current = rafiRef.current.querySelector(".kp-hair-tuft"); }
    if (fatherRef.current) paintFatherRef.current = farmerPainter(fatherRef.current, fatherLook(stage.id));
  }, [stage.id]);
  const set = Backdrop({ id: stage.id });
  const Icon = ICONS[stage.id];
  const ev = evidence(stage.id, bn);

  const play = () => { const c = ctl.current; if (c.time >= DURATION - 0.05) c.time = 0; c.playing = true; c.userPaused = false; setPlaying(true); setEnded(false); setStarted(true); void startSound(); };
  const pause = (byUser = true) => { const c = ctl.current; c.playing = false; if (byUser) c.userPaused = true; setPlaying(false); stopSound(); };
  const seek = (s: number) => { const c = ctl.current; c.time = Math.min(DURATION, Math.max(0, s)); setEnded(false); setStarted(true); };

  useEffect(() => {
    const m = window.matchMedia("(max-aspect-ratio: 1/1)");
    const set = () => setPortrait(m.matches);
    set(); m.addEventListener("change", set);
    return () => m.removeEventListener("change", set);
  }, []);

  useEffect(() => {
    const box = stageEl.current;
    if (!box || !rafiRef.current || !fatherRef.current) return;
    const c = ctl.current;
    paintRafiRef.current = farmerPainter(rafiRef.current, WARDROBE[STAGES[0].id]);
    paintFatherRef.current = farmerPainter(fatherRef.current, fatherLook(STAGES[0].id));
    const body = springSet(SPRINGS, SPRING_DEFAULT), dad = springSet(SPRINGS, SPRING_DEFAULT);
    let buddyX = springInit(320), buddyY = springInit(120), mood = springInit(0), headV = springInit(0);
    let zoom = springInit(1), panX = springInit(0), hair = springInit(0);
    const trail: Array<[number, number]> = [];
    let lastPhone: [number, number] | null = null;
    // Feet are planted and step on their own (lib/spring.ts stepFeet): walking emerges from the hips moving.
    const feet = { n: footAt(216), f: footAt(184) };
    const ENTRANCE = 74; // he walks in from this far left at the start of a standing chapter
    const WALK_SPEED = 66; // rig units per second: slower than the feet can step (a stride per step), so it is a walk, not a lunge
    let walkOffset = 0;
    tuftRef.current = rafiRef.current.querySelector(".kp-hair-tuft");
    // Lip-sync: two incommensurate sines give a natural, never-repeating open/close rhythm.
    const lips = (time: number) => Math.sin(time * 13) + 0.8 * Math.sin(time * 7.7 + 1.3) > 0.35;
    // Game-style procedural layers on top of the key poses.
    // Idle noise: three incommensurate sines, so nothing ever freezes and nothing ever visibly repeats.
    const noise = (time: number, seed: number) => (Math.sin(time * 0.71 + seed) + 0.6 * Math.sin(time * 1.37 + seed * 2.1) + 0.35 * Math.sin(time * 2.93 + seed * 3.7)) / 1.95;
    // Eye saccades: every 1.2–3 s the eyes jump to a new point near where they were looking (deterministic per slot).
    const hash1 = (n: number) => { const v = Math.sin(n * 127.1 + 311.7) * 43758.5453; return v - Math.floor(v); };
    const saccade = (time: number, seed: number) => {
      let acc = 0, slot = 0;
      while (acc + 1.2 + hash1(slot + seed) * 1.8 < time % 40) { acc += 1.2 + hash1(slot + seed) * 1.8; slot++; }
      return [(hash1(slot * 3 + seed) - 0.5) * 0.9, (hash1(slot * 7 + seed) - 0.5) * 0.7] as const;
    };
    let raf = 0, last = performance.now(), t = 0, shown = -1, lastUi = 0, shownEpi = false;
    let prevBB = 0, prevCoin = 0, prevWarn = 0;
    let receipts: Array<{ el: SVGGElement; cx: number; cy: number }> | null = null;
    const written: Record<string, number> = {};
    const setVar = (name: string, v: number, step: number) => {
      if (written[name] !== undefined && Math.abs(written[name] - v) < step && v !== 0 && v !== 1) return;
      written[name] = v; box.style.setProperty(name, v.toFixed(4));
    };
    const channels = (p: RigPose) => { const o: Record<string, number> = {}; for (const k of NUMERIC_CHANNELS) o[k] = p[k] as number; return o; };

    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000); last = now; t += dt;
      if (c.playing && !c.scrubbing) {
        c.time += dt;
        if (c.time >= DURATION) { c.time = DURATION; c.playing = false; setPlaying(false); setEnded(true); window.setTimeout(() => { if (!ctl.current.playing) { audio.current?.suspend(); setAudible(false); } }, 3500); }
      }
      const epi = c.time >= CHAPTERS_END;
      if (epi !== shownEpi) { shownEpi = epi; setEpilogue(epi); box.dataset.epi = epi ? "1" : "0"; if (epi && c.playing) audio.current?.cue("rise"); }
      // In the epilogue the field chapter is held at its solved end: sunrise, both of them cheering.
      const { index: i, local } = epi ? { index: 5, local: 1 } : stageAt(c.time / CHAPTERS_END);
      if (i !== shown) {
        // A new chapter: under the title card, he is moved back off his mark and walks in.
        const first = POSES[STAGES[i].poses[0]];
        if (first.hipY < 215 && local < 0.2) {
          // The cut is hidden by the title card: his whole body takes the new chapter's opening pose, off his mark.
          body.snap({ ...channels(first), hipX: first.hipX - ENTRANCE });
          walkOffset = -ENTRANCE;
          feet.n = footAt(first.nfX - ENTRANCE); feet.f = footAt(first.ffX - ENTRANCE);
        }
        if (shown >= 0 && c.playing) audio.current?.cue("whoosh");
        shown = i; setIndex(i); receipts = null;
      }
      const st = STAGES[i];
      const bP = beat(local, BEATS.problem), bB = beat(local, BEATS.buddy), bA = beat(local, BEATS.app), bS = beat(local, BEATS.solved);
      if (c.playing && bB > 0.05 && prevBB <= 0.05 && !epi) audio.current?.cue("chime");
      prevBB = bB;
      // Which key pose he is heading for; the springs do the moving (weight, overshoot, settle).
      const key = local < 0.34 ? st.poses[0] : local < 0.74 ? st.poses[1] : st.poses[2];
      const goal = POSES[key];
      const saying = bS > 0.5 ? "solved" : bB > 0.5 ? "buddy" : "problem";
      const rafiTalks = (saying === "problem" && local > BEATS.problem[0] && local < BEATS.buddy[0] + 0.02) || (saying === "solved" && local < 0.97);
      const target = channels(goal);
      // While Buddy talks he looks up at it; while the app opens his free hand comes to the phone and taps.
      if (saying === "buddy") { target.eye = 1; target.eyeY = -1.4; target.head -= 22; target.neck -= 8; target.brow = 0.9; }
      else { const [sx, sy] = saccade(t, 3); target.eye += sx; target.eyeY += sy; }
      // Surprise: the moment Buddy appears his eyes go wide and his brows jump, then settle (a fast, bouncy spring).
      const startle = beat(local, [BEATS.buddy[0] - 0.02, BEATS.buddy[0] + 0.03]) * (1 - beat(local, [BEATS.buddy[0] + 0.05, BEATS.buddy[0] + 0.12]));
      target.wide += startle; target.brow += startle * 1.2; target.squint *= 1 - startle;
      // Momentum lean: he leans into his own speed (forward when walking, back a touch when stopping).
      const hipV = body.velocity("hipX");
      target.lumbar += Math.max(-4, Math.min(6, hipV * 0.07));
      if (lastPhone && bA > 0.15 && bS < 0.5 && (key === "phone" || key === "kneelPhone")) {
        target.fhX = lastPhone[0] - 1.5;
        target.fhY = lastPhone[1] + 2 + Math.max(0, Math.sin(t * 7.5)) * 3.2;
      }
      // Walking in: the hips' goal advances at a steady pace; the spring and the stepping feet follow it.
      if (walkOffset < 0) { walkOffset = Math.min(0, walkOffset + WALK_SPEED * dt); target.hipX += walkOffset; }
      const raw = body.step(target, dt);
      // Idle noise on the head, chest and hands (a few units at most), on top of the springs.
      raw.head += noise(t, 1) * 1.6; raw.chest += noise(t, 4) * 0.9;
      raw.nhX += noise(t, 7) * 1.2; raw.nhY += noise(t, 9) * 1; raw.fhX += noise(t, 11) * 1.2; raw.fhY += noise(t, 13) * 1;
      const breath = Math.sin(t * ((2 * Math.PI) / 3.8));
      const standing = goal.hipY < 215 ? 1 : 0;
      const pose: Record<string, number | string> = { ...goal, ...raw, chest: raw.chest + breath * 1.3, hipY: raw.hipY + breath * 0.5, hipX: raw.hipX + standing * Math.sin(t * 0.55) * 1.6 };
      // Talking: the head nods on the stresses, a free hand gestures, a cheering fist pumps; the mouth moves.
      if (rafiTalks) {
        pose.head = (pose.head as number) + Math.sin(t * 4.3) * 2.2;
        if (key === "stand" || key === "phone") { pose.fhX = (pose.fhX as number) + Math.sin(t * 2.6) * 5; pose.fhY = (pose.fhY as number) + Math.sin(t * 3.4) * 4; pose.fhShape = "open"; }
        if (key === "cheer") pose.fhY = (pose.fhY as number) - Math.abs(Math.sin(t * 3.2)) * 7;
        pose.mouth = lips(t) ? "open" : saying === "solved" ? "smile" : goal.mouth;
      }
      if (bA > 0.2 && bS < 0.5 && goal.phone) pose.nhWrist = (pose.nhWrist as number) + Math.sin(t * 5) * 4; // thumb scrolling
      // Feet: while he stands, each foot stays planted until the hips have moved too far from it, then steps.
      if (goal.hipY < 215) {
        const hx = pose.hipX as number;
        // Predictive placement: each foot steps to where the hips will be a step from now, not where they are.
        const lead = body.velocity("hipX") * 0.28;
        const g = stepFeet(feet, { n: hx + lead + (goal.nfX - goal.hipX), f: hx + lead + (goal.ffX - goal.hipX) }, dt, t, 7);
        pose.nfX = feet.n.x; pose.ffX = feet.f.x;
        // Arms swing against the legs while he walks (only an arm that is not holding the phone or his head).
        const walking = walkOffset < 0 || feet.n.k >= 0 || feet.f.k >= 0;
        if (walking) {
          const swing = ((feet.n.x - feet.f.x) - (goal.nfX - goal.ffX)) * 0.45;
          if (key !== "phone" && key !== "cheer") { pose.nhX = (pose.nhX as number) - swing; pose.nhY = (pose.nhY as number) - Math.abs(swing) * 0.2; }
          if (key === "phone" || key === "stand") { pose.fhX = (pose.fhX as number) + swing; pose.fhY = (pose.fhY as number) - Math.abs(swing) * 0.2; }
        }
        pose.nfLift = g.n.lift; pose.ffLift = g.f.lift; pose.nfRoll = g.n.roll; pose.ffRoll = g.f.roll;
        // Each swing tips the body over the planted foot a little.
        pose.lumbar = (pose.lumbar as number) + (g.n.lift + g.f.lift) * 0.12;
        // Gait bob: the hips rise as the swinging leg passes under them and settle at the heel strike;
        // the head counter-rotates against the spine so the gaze stays level (head stabilisation).
        const swingK = Math.max(feet.n.k, feet.f.k);
        const bob = swingK >= 0 ? -Math.sin(Math.PI * swingK) * 2.6 + (swingK > 0.85 ? (swingK - 0.85) * 8 : 0) : 0;
        pose.hipY = (pose.hipY as number) + bob;
        pose.head = (pose.head as number) - ((pose.lumbar as number) - goal.lumbar) * 0.55;
      } else {
        feet.n = footAt(raw.nfX); feet.f = footAt(raw.ffX);
      }
      const sk = solve(pose, RIG_GROUND);
      // A puff of dust where a heel lands.
      for (const [el, ft] of [[dustN.current, feet.n], [dustF.current, feet.f]] as const) {
        if (!el) continue;
        const age = t - ft.strikeAt;
        el.setAttribute("cx", (ft.x + 2).toFixed(1));
        el.setAttribute("rx", (5 + age * 34).toFixed(1));
        el.setAttribute("ry", (1.6 + age * 5).toFixed(1));
        el.setAttribute("opacity", Math.max(0, 0.38 * (1 - age / 0.55)).toFixed(3));
      }
      // The lungi trails the hips; the hair tuft swings on an under-damped spring driven by the head's motion.
      paintRafiRef.current?.(sk, { blink: blink(t, 3), drag: -body.velocity("hipX") * 0.6 });
      hair = springStep(hair, -body.velocity("head") * 0.9 + Math.sin(t * 1.3) * 3, dt, { f: 2.4, z: 0.32 });
      tuftRef.current?.setAttribute("transform", `rotate(${hair.y.toFixed(2)} 1 -34)`);
      // The phone in his near hand; its screen takes the colour of the app Buddy names.
      let phoneAt: [number, number] = [0, 0];
      const ph = phoneRef.current;
      if (ph) {
        const [x, y, a] = inHand(sk, "n", 8, -1);
        phoneAt = [x, y];
        lastPhone = [x, y];
        ph.setAttribute("transform", `translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${(a + 90).toFixed(1)})`);
        ph.setAttribute("opacity", Math.min(1, Math.max(0, raw.phone)).toFixed(2));
        screenRef.current?.setAttribute("fill", bA > 0.05 ? APP_GLOW[st.id] : "#cfd8dc");
      }
      const fd = fatherRef.current!;
      const withDad = st.cast.includes("father");
      fd.style.opacity = withDad ? "1" : "0";
      if (withDad) {
        const asking = local < 0.74;
        const fg = asking ? FATHER_POSES.ask : FATHER_POSES.happy;
        const fr = dad.step(channels(fg), dt);
        const fpose: Record<string, number | string> = { ...fg, ...fr, chest: fr.chest + Math.sin(t * 1.5 + 1) * 1.1 + noise(t, 21) * 0.8, head: fr.head + noise(t, 23) * 1.4 };
        { const [sx, sy] = saccade(t, 17); fpose.eye = (fpose.eye as number) + sx; fpose.eyeY = (fpose.eyeY as number) + sy; }
        // He talks with his open hand while he asks, in the field and over the land.
        if (asking && local < BEATS.buddy[0]) {
          fpose.nhX = (fpose.nhX as number) + Math.sin(t * 2.2) * 6; fpose.nhY = (fpose.nhY as number) + Math.sin(t * 3.1 + 0.5) * 5;
          fpose.head = (fpose.head as number) + Math.sin(t * 3.7) * 2; fpose.mouth = lips(t + 0.7) ? "open" : "calm";
        }
        const fsk = solve(fpose, RIG_GROUND);
        headV = springStep(headV, dad.velocity("head"), dt, { f: 2, z: 0.5 });
        paintFatherRef.current?.(fsk, { blink: blink(t, 11), tail: -headV.y * 0.9 + Math.sin(t * 2.1) * 4, tailBend: Math.sin(t * 1.7) * 3 });
      }
      // Buddy floats near his head on a loose spring: it trails, overshoots a little, bobs.
      const head = sk.atlas as [number, number];
      const pt = c.portrait;
      // In the epilogue Buddy settles between father and son, at their head height.
      buddyX = springStep(buddyX, epi ? head[0] + 68 : head[0] + (pt ? 50 : 78), dt, { f: 0.9, z: 0.55 });
      buddyY = springStep(buddyY, (epi ? head[1] + 6 : Math.max(40, head[1] - (pt ? 22 : 66))) + Math.sin(t * 1.9) * 5, dt, { f: 0.9, z: 0.55 });
      const talk = bB * (1 - bS);
      const bd = buddyRef.current;
      if (bd) {
        const base = 1 + talk * 0.18 + Math.sin(t * 6) * talk * 0.03;
        const speed = Math.hypot(buddyX.v, buddyY.v), ang = (Math.atan2(buddyY.v, buddyX.v) * 180) / Math.PI;
        const st2 = 1 + Math.min(0.22, speed * 0.0018); // stretch along the motion, squash across it
        bd.setAttribute("transform", `translate(${buddyX.y.toFixed(1)} ${buddyY.y.toFixed(1)}) rotate(${ang.toFixed(1)}) scale(${(base * st2).toFixed(3)} ${(base / st2).toFixed(3)}) rotate(${(-ang).toFixed(1)})`);
        bd.style.setProperty("--talk", talk.toFixed(3));
        trail.unshift([buddyX.y, buddyY.y]); if (trail.length > 12) trail.pop();
        const tr = trailRef.current;
        if (tr) for (const [j, el] of Array.from(tr.children).entries()) {
          const at = trail[Math.min(trail.length - 1, 3 + j * 3)];
          el.setAttribute("cx", at[0].toFixed(1)); el.setAttribute("cy", at[1].toFixed(1));
          el.setAttribute("opacity", Math.min(0.28, speed * 0.0016) * (1 - j * 0.3) + "");
        }
      }
      // Buddy's light on the phone while it names the app.
      const beam = beamRef.current;
      if (beam) {
        const k = bA * (1 - bS) * Math.min(1, raw.phone);
        const [bx, by] = [buddyX.y, buddyY.y + 10], [px, py] = phoneAt;
        beam.setAttribute("d", `M${bx.toFixed(1)} ${by.toFixed(1)}Q${((bx + px) / 2 + 12).toFixed(1)} ${((by + py) / 2 - 6).toFixed(1)} ${px.toFixed(1)} ${(py - 4).toFixed(1)}`);
        beam.setAttribute("opacity", k.toFixed(3));
      }
      // Camera: a slow push-in on the problem, back out (a touch toward the app card) as it resolves.
      zoom = springStep(zoom, 1 + 0.07 * (1 - bA) * (1 - bS) - 0.02 * bS, dt, { f: 0.45, z: 1 });
      panX = springStep(panX, pt ? 0 : -24 * bA * (1 - bS), dt, { f: 0.45, z: 1 });
      const cx = RIG_DX + 205 * RIG_SCALE, cy = RIG_DY + 170 * RIG_SCALE;
      // Handheld breath: a camera operator never holds perfectly still (well under a pixel of roll, a few of drift).
      const hx = noise(t * 0.6, 41) * 2.2, hy = noise(t * 0.6, 43) * 1.6, hr = noise(t * 0.5, 47) * 0.18;
      camRef.current?.setAttribute("transform", `translate(${(cx + panX.y + hx).toFixed(1)} ${(cy + hy).toFixed(1)}) rotate(${hr.toFixed(3)}) scale(${zoom.y.toFixed(4)}) translate(${-cx} ${-cy})`);
      // Foreground: nearer than everything, so it moves more with the camera (parallax depth).
      // Far layer (tree line, palms, houses): moves about half as much as the scene.
      farRef.current?.setAttribute("transform", `translate(${(-panX.y * 0.55).toFixed(1)} 0)`);
      fgRef.current?.setAttribute("transform", `translate(${(cx + panX.y * 1.8).toFixed(1)} ${cy.toFixed(1)}) scale(${(1 + (zoom.y - 1) * 1.6).toFixed(4)}) translate(${-cx} ${-cy})`);
      // Mood: grey rain while it is a problem, warm sun once solved.
      mood = springStep(mood, bS, dt, { f: 0.8, z: 1 });
      sunRef.current?.setAttribute("opacity", mood.y.toFixed(3));
      rimRef.current?.setAttribute("opacity", (mood.y * 0.75).toFixed(3));
      const rainK = (1 - mood.y) * (1 - bA * 0.6);
      audio.current?.update({ playing: c.playing, mood: epi ? 1 : mood.y, rain: epi ? 0 : st.id === "field" ? Math.max(rainK, 0.4 * mood.y) : rainK, epilogue: epi, indoor: INDOOR[st.id] });
      rainRef.current?.setAttribute("opacity", (st.id === "field" ? Math.max(rainK, 0.42 * mood.y) : rainK).toFixed(3));
      // ---- story beats: a prop acts out what the app does ----
      const phoneOk = lastPhone && raw.phone > 0.3;
      // Home: the scattered receipts fly into his phone while the app opens (arc, spin, shrink).
      if (st.id === "home") {
        if (!receipts || receipts.length === 0) receipts = Array.from(box.querySelectorAll<SVGGElement>(".kp-ls-receipt")).map((el) => { const b = el.getBBox(); return { el, cx: b.x + b.width / 2, cy: b.y + b.height / 2 }; });
        const k = Math.min(1, bA * 1.15);
        for (const [j, rc] of receipts.entries()) {
          const kk = Math.min(1, Math.max(0, k * 1.3 - j * 0.15));
          const e = kk * kk * (3 - 2 * kk);
          const [tx, ty] = phoneOk ? lastPhone! : [rc.cx, rc.cy];
          const dx = (tx - rc.cx) * e, dy = (ty - rc.cy) * e - Math.sin(Math.PI * e) * 34;
          rc.el.setAttribute("transform", `translate(${dx.toFixed(1)} ${dy.toFixed(1)}) rotate(${(e * 200).toFixed(0)} ${rc.cx} ${rc.cy}) scale(1)`);
          rc.el.style.opacity = String(1 - e * 0.95);
        }
      }
      // Earn: ৳ coins rise out of the phone while FeeGuard opens.
      const coins = coinsRef.current;
      if (coins) {
        const show = st.id === "earn" && phoneOk ? bA * (1 - bS) : 0;
        coins.style.opacity = show.toFixed(3);
        if (show > 0) for (const [j, el] of Array.from(coins.children).entries()) {
          const ph2 = (t * 0.9 + j / 3) % 1;
          if (j === 0 && c.playing && ph2 < prevCoin) audio.current?.cue("coin");
          if (j === 0) prevCoin = ph2;
          el.setAttribute("transform", `translate(${(lastPhone![0] + Math.sin(ph2 * 6 + j) * 7 + (j - 1) * 6).toFixed(1)} ${(lastPhone![1] - 8 - ph2 * 46).toFixed(1)}) scale(${(0.7 + ph2 * 0.5).toFixed(2)})`);
          (el as SVGGElement).style.opacity = (Math.sin(Math.PI * ph2)).toFixed(2);
        }
      }
      // Protect: the scam SMS beside his phone; Rokkha's warning pops onto it as the app opens.
      const sms = smsRef.current;
      if (sms) {
        const show = st.id === "protect" && phoneOk ? 1 - bS : 0;
        sms.style.opacity = show.toFixed(3);
        if (show > 0) sms.setAttribute("transform", `translate(${(lastPhone![0] + 12).toFixed(1)} ${(lastPhone![1] - 30).toFixed(1)})`);
        const warn = sms.querySelector<SVGGElement>(".kp-ls-warn");
        const wk = beat(local, [BEATS.app[0], BEATS.app[0] + 0.12]);
        warn?.setAttribute("transform", `translate(6 32) scale(${(0.6 + 0.4 * wk + Math.sin(Math.PI * wk) * 0.18).toFixed(3)})`);
        if (warn) warn.style.opacity = wk.toFixed(3);
        if (show > 0 && c.playing && wk > 0.5 && prevWarn <= 0.5) audio.current?.cue("warn");
        prevWarn = show > 0 ? wk : 0;
      }
      // CSS variables restyle every element that reads them, so write one only when it visibly changes.
      setVar("--b-app", bA, 0.01); setVar("--b-solved", bS, 0.01); setVar("--mood", mood.y, 0.008);
      setVar("--local", local, 0.004); setVar("--p", c.time / DURATION, 0.0015);
      const sayNow = bS > 0.5 ? "solved" : bB > 0.5 ? "buddy" : "problem";
      if (box.dataset.say !== sayNow) box.dataset.say = sayNow;
      if (now - lastUi > 120) {
        lastUi = now;
        if (scrubRef.current && !c.scrubbing) scrubRef.current.value = String(Math.round((c.time / DURATION) * 1000));
        if (timeRef.current) timeRef.current.textContent = clock(c.time, bn);
      }
      if (c.visible) raf = requestAnimationFrame(frame);
    };
    const io = new IntersectionObserver(([e]) => {
      c.visible = e.isIntersecting;
      cancelAnimationFrame(raf);
      if (c.visible) {
        last = performance.now(); raf = requestAnimationFrame(frame);
        // Auto-play: start when it comes into view, unless the visitor paused it or it has ended.
        if (c.autoplay && !c.userPaused && !c.playing && c.time < DURATION - 0.05 && e.intersectionRatio >= 0.45) { c.playing = true; setPlaying(true); setStarted(true); if (audio.current && c.sound) void audio.current.resume().then(() => setAudible(!!audio.current?.running)); }
      } else if (c.playing) { c.playing = false; setPlaying(false); audio.current?.suspend(); setAudible(false); }
    }, { threshold: [0, 0.45] });
    io.observe(box);
    body.snap(channels(POSES[STAGES[0].poses[0]]));
    dad.snap(channels(FATHER_POSES.ask));
    frame(performance.now());
    return () => { io.disconnect(); cancelAnimationFrame(raf); };
  }, [bn]);

  const onKey = (e: React.KeyboardEvent) => {
    if ((e.target as HTMLElement).closest("input,button") && e.key !== "Escape" && (e.target as HTMLElement).tagName !== "DIV") return;
    if (e.key === " " || e.key === "k") { e.preventDefault(); ctl.current.playing ? pause() : play(); }
    else if (e.key === "ArrowRight") { e.preventDefault(); seek(ctl.current.time + 5); }
    else if (e.key === "ArrowLeft") { e.preventDefault(); seek(ctl.current.time - 5); }
    else if (e.key === "Home") { e.preventDefault(); seek(0); }
  };
  const fullscreen = () => {
    const el = stageEl.current;
    if (!el) return;
    if (document.fullscreenElement) document.exitFullscreen?.(); else el.requestFullscreen?.().catch(() => {});
  };

  const line = (x: { bn: string; en: string }) => (bn ? x.bn : x.en);
  const num = (n: number) => (bn ? bnDigits(String(n).padStart(2, "0")) : String(n).padStart(2, "0"));
  const v = (name: string, k = 1): CSSProperties => ({ opacity: `calc(var(${name}) * ${k})` as unknown as number });

  return (
    <div className="mx-auto w-full max-w-[1280px]" data-testid="life-story">
      <div ref={stageEl} tabIndex={0} onKeyDown={onKey} role="region" aria-roledescription={bn ? "ভিডিও" : "video"} aria-label={line(STORY_TITLE)}
        data-stage={stage.id} data-indoor={INDOOR[stage.id] ? "1" : "0"} className="kp-ls relative h-[min(86svh,780px)] overflow-hidden rounded-[22px] outline-none ring-emerald-600 focus-visible:ring-4 sm:aspect-video sm:h-auto sm:rounded-[30px]" data-say="problem" style={{ ["--mood" as string]: 0 }}>
        <div className="kp-ls-sky absolute inset-0" aria-hidden="true" />
        <svg className="absolute inset-0 h-full w-full" viewBox={portrait ? "222 -170 520 1000" : `0 0 ${VB.w} ${VB.h}`} preserveAspectRatio={portrait ? "xMidYMid slice" : "xMidYMax slice"} aria-hidden="true">
          <defs>
            <radialGradient id="kp-ls-sun" cx="50%" cy="50%" r="50%"><stop offset="0" stopColor="#fff1c9" /><stop offset=".45" stopColor="#f6c56b" stopOpacity=".85" /><stop offset="1" stopColor="#f6c56b" stopOpacity="0" /></radialGradient>
            <radialGradient id="kp-ls-orb" cx="38%" cy="32%" r="70%"><stop offset="0" stopColor="#e9fff6" /><stop offset=".35" stopColor="#5fd3a6" /><stop offset=".8" stopColor="#0e6b4f" /><stop offset="1" stopColor="#084532" /></radialGradient>
            <linearGradient id="kp-ls-beam" x1="0" x2="1"><stop offset="0" stopColor="#bfffe5" stopOpacity=".95" /><stop offset="1" stopColor="#5fd3a6" stopOpacity=".2" /></linearGradient>
            <radialGradient id="kp-ls-rim" cx="82%" cy="20%" r="80%"><stop offset="0" stopColor="#ffd27a" stopOpacity=".95" /><stop offset=".55" stopColor="#f6a04d" stopOpacity=".35" /><stop offset="1" stopColor="#f6a04d" stopOpacity="0" /></radialGradient>
            <radialGradient id="kp-ls-vignette" cx="50%" cy="45%" r="75%"><stop offset=".6" stopColor="#000" stopOpacity="0" /><stop offset="1" stopColor="#1d1712" stopOpacity=".28" /></radialGradient>
          </defs>
          <g ref={sunRef} opacity="0" className="kp-ls-outdoor"><circle cx="820" cy="140" r="150" fill="url(#kp-ls-sun)" /><circle cx="820" cy="140" r="38" fill="#ffd27a" /></g>
          {/* clouds drift; heavy grey in the problem, small and white once solved */}
          <g className="kp-ls-clouds kp-ls-outdoor">
            {[[120, 110, 1], [470, 70, 0.8], [760, 120, 1.15], [300, 180, 0.6]].map(([x, y, k], i) => (
              <path key={i} className="kp-ls-cloud" style={{ animationDelay: `${-i * 9}s` }} transform={`translate(${x} ${y}) scale(${k})`} d="M-70 20c-24 0-30-30-6-36 2-26 38-34 52-14 10-22 52-20 56 6 26-4 38 30 12 44z" />
            ))}
          </g>
          <g ref={camRef}>
            <g ref={farRef}><g key={`far-${stage.id}`} className="kp-ls-props">{set.far}</g></g>
            <path d="M0 470C140 420 260 440 380 452S640 410 780 430 960 450 1000 440V620H0Z" className="kp-ls-hill-far kp-ls-outdoor" />
            <path d="M0 540C180 512 360 524 520 536S820 512 1000 528V620H0Z" className="kp-ls-hill kp-ls-outdoor" />
            <g key={`mid-${stage.id}`} className="kp-ls-props">{set.mid}</g>
            {/* watermark: the chapter number and name, huge and faint (on the sky, or on the room's wall) */}
            <text x="40" y="250" className="kp-ls-mark" fontSize="250">{num(stage.n)}</text>
            <text x="48" y="330" className="kp-ls-mark" fontSize="84">{line(stage.label)}</text>
            <g ref={rainRef} className="kp-ls-outdoor">
              {Array.from({ length: 46 }, (_, i) => (
                <line key={i} x1={(i * 97) % 1000} y1={-40 - ((i * 53) % 300)} x2={(i * 97) % 1000 - 9} y2={-10 - ((i * 53) % 300)} className="kp-ls-rain" style={{ animationDelay: `${-((i * 37) % 100) / 100}s` }} />
              ))}
              {Array.from({ length: 14 }, (_, i) => (
                <ellipse key={`s${i}`} cx={40 + i * 70 + ((i * 31) % 40)} cy={548 + ((i * 17) % 40)} rx="7" ry="1.8" className="kp-ls-splash" style={{ animationDelay: `${-((i * 23) % 100) / 100}s` }} />
              ))}
            </g>
            {/* sun motes rise once the problem is solved */}
            <g className="kp-ls-motes">
              {Array.from({ length: 14 }, (_, i) => <circle key={i} cx={180 + i * 52} cy={520 - ((i * 41) % 180)} r={1.6 + (i % 3)} style={{ animationDelay: `${-i * 0.7}s` }} />)}
            </g>
            <g transform={`translate(${RIG_DX} ${RIG_DY}) scale(${RIG_SCALE})`}>
              <g key={stage.id} className="kp-ls-props"><Scenery id={stage.id} /></g>
              <g ref={fatherRef} transform={`translate(${FATHER_X + 200} 0) scale(-1 1)`} style={{ transition: "opacity .6s" }}><Farmer key={`dad-${fatherLook(stage.id) === FATHER_FIELD ? "field" : stage.id}`} look={fatherLook(stage.id)} /></g>
              <ellipse ref={dustN} cy={RIG_GROUND + 1} rx="5" ry="1.6" fill="#b9a383" opacity="0" />
              <ellipse ref={dustF} cy={RIG_GROUND + 1} rx="5" ry="1.6" fill="#b9a383" opacity="0" />
              <g ref={rafiRef}><Farmer key={`rafi-${stage.id}`} look={WARDROBE[stage.id]} /></g>
              <path ref={beamRef} fill="none" stroke="url(#kp-ls-beam)" strokeWidth="2.4" strokeLinecap="round" strokeDasharray="3 4" className="kp-ls-beam" opacity="0" />
              <g ref={phoneRef} opacity="0">
                <rect x="-4" y="-13" width="9" height="17" rx="2" fill="#1e2530" stroke="#0e1218" strokeWidth=".8" />
                <rect ref={screenRef} x="-2.7" y="-11.4" width="6.4" height="13.6" rx="1" fill="#cfd8dc" />
              </g>
              {/* story-beat props, moved by the frame loop */}
              <g ref={coinsRef} style={{ opacity: 0 }}>
                {[0, 1, 2].map((j) => <g key={j}><circle r="5.2" fill="#f4cf87" stroke="#c99041" strokeWidth="1" /><text y="2.6" textAnchor="middle" fontSize="7.4" fontWeight="700" fill="#7a5520">৳</text></g>)}
              </g>
              <g ref={smsRef} style={{ opacity: 0 }}>
                <path d="M0 0h58a5 5 0 0 1 5 5v12a5 5 0 0 1-5 5H10l-6 6 1-6H0a5 5 0 0 1-5-5V5a5 5 0 0 1 5-5z" fill="#fffdf9" stroke="#c9bda8" strokeWidth=".8" />
                <text x="29" y="14.5" textAnchor="middle" fontSize="7.2" fontWeight="700" fill="#3b302a">{bn ? "‘ওটিপি দিন’" : "‘Send the OTP’"}</text>
                <g className="kp-ls-warn" style={{ opacity: 0 }}>
                  <rect x="-2" y="-6" width="52" height="12" rx="6" fill="#b3261e" />
                  <text x="24" y="2.6" textAnchor="middle" fontSize="6.6" fontWeight="800" fill="#fff">{bn ? "⚠ প্রতারণার লক্ষণ" : "⚠ Scam signs"}</text>
                </g>
              </g>
              {/* Buddy's motion trail: ghosts of where it just was, only visible when it moves fast */}
              <g ref={trailRef} aria-hidden="true">{[0, 1, 2].map((j) => <circle key={j} r={13 - j * 2.5} fill="#5fd3a6" opacity="0" />)}</g>
              <g ref={buddyRef} className="kp-ls-buddy">
                <circle r="21" className="kp-ls-buddy-ring" />
                <circle r="15" fill="url(#kp-ls-orb)" />
                <ellipse cx="-5" cy="-6" rx="4.6" ry="2.6" fill="#fff" opacity=".75" />
                <circle cx="5" cy="-1" r="2.2" fill="#fff" opacity=".9" />
              </g>
            </g>
            <path d="M0 600H1000V1100H0Z" className="kp-ls-hill" />
            {/* light on the actors: the scene's grade and its light sources, over everything in the set */}
            <g key={`light-${stage.id}`} className="kp-ls-light">{epilogue ? null : <Lighting id={stage.id} />}</g>
          </g>
          {/* foreground: blurred grass at the frame's edges, nearer than the actors */}
          <g ref={fgRef} className="kp-ls-fg">
            <path d="M-20 640C10 560 30 520 42 470C50 530 62 560 70 640ZM30 640C52 580 80 548 104 520C96 570 92 600 96 640ZM-30 640C-10 590 -4 560 0 530C16 580 24 610 26 640Z" />
            <path d="M1020 640C990 560 972 522 962 478C952 532 940 566 934 640ZM970 640C948 582 922 552 898 528C906 574 910 604 906 640Z" />
          </g>
          {/* warm rim light from the sun once the problem is solved */}
          <rect ref={rimRef} x="-200" y="-400" width="1400" height="1600" fill="url(#kp-ls-rim)" opacity="0" style={{ mixBlendMode: "soft-light" }} pointerEvents="none" />
          <rect x="-200" y="-400" width="1400" height="1600" fill="url(#kp-ls-vignette)" pointerEvents="none" />
        </svg>

        {/* title card: wipes across at each chapter change, like a film's chapter slate */}
        {started && (
          <div key={epilogue ? "wipe-epi" : `wipe-${stage.id}`} className="kp-ls-wipe pointer-events-none absolute inset-0 z-[25] grid place-items-center" aria-hidden="true">
            <div className="text-center">
              <p className="font-mono text-[clamp(44px,8vw,110px)] font-bold leading-none text-[#f4cf87]">{epilogue ? "✦" : num(stage.n)}</p>
              <p className="mt-2 text-[clamp(24px,3.6vw,46px)] font-semibold text-[#fbf3e8]">{epilogue ? (bn ? "নতুন ভোর" : "A new dawn") : line(stage.label)}</p>
            </div>
          </div>
        )}

        {/* epilogue: the seven apps rise like fanush (sky lanterns) into the sunrise; the closing line settles */}
        {epilogue && (
          <div className="kp-ls-epi pointer-events-none absolute inset-0 z-[15]" aria-live="polite">
            {STAGES.map((s, i) => {
              const I = ICONS[s.id];
              return (
                <span key={s.id} className="kp-ls-lantern" style={{ left: `${8 + i * 13.5}%`, animationDelay: `${0.25 + (i % 3) * 0.35 + i * 0.12}s`, ["--sway" as string]: `${(i % 2 ? 1 : -1) * (10 + (i % 3) * 6)}px` }}>
                  <I size={20} aria-hidden="true" /><em>{line(s.label)}</em>
                </span>
              );
            })}
            <div className="kp-ls-epi-text absolute inset-x-4 top-[7%] text-center">
              <p className="text-[clamp(24px,3.4vw,44px)] font-semibold leading-tight text-[#1d1712]">{bn ? <>কর্মপথ: <em className="kp-em">প্রতিটি মোড়ে পাশে</em></> : <>KormoPath: <em className="kp-em">beside you at every turn</em></>}</p>
              <p className="mx-auto mt-3 max-w-xl text-[clamp(14px,1.5vw,18px)] font-medium text-[#3d3630]">{line(STORY_END)}</p>
            </div>
          </div>
        )}

        {/* chapters: jump to any */}
        <nav aria-label={bn ? "সাতটি অধ্যায়" : "Seven chapters"} className="kp-ls-rail absolute inset-x-0 top-3 z-20 flex gap-1.5 overflow-x-auto px-3 sm:top-4 sm:justify-center sm:gap-2">
          {STAGES.map((s, i) => {
            const I = ICONS[s.id];
            return (
              <button key={s.id} type="button" onClick={() => { seek(i * CHAPTER_SECONDS + 0.2); if (!ctl.current.playing) play(); else void startSound(); }} aria-current={i === index && !epilogue ? "step" : undefined}
                className={`kp-ls-chip ${i === index && !epilogue ? "kp-ls-chip-on" : i < index || epilogue ? "kp-ls-chip-done" : ""}`}>
                <I size={14} aria-hidden="true" /><span>{line(s.label)}</span>
                {i === index && !epilogue && <i className="kp-ls-chip-fill" aria-hidden="true" />}
              </button>
            );
          })}
        </nav>

        {/* the dialogue: Rafi's problem → Buddy → Rafi's solution, as voice lines */}
        <div className="absolute bottom-[64px] left-3 right-3 z-10 sm:bottom-auto sm:left-[4%] sm:right-auto sm:top-[70px] sm:w-[min(500px,42%)]">
          <p className="kp-eyebrow kp-ls-title hidden sm:block">{line(STORY_TITLE)} · {bn ? `অধ্যায় ${num(stage.n)}` : `Chapter ${num(stage.n)}`}</p>
          <div className="relative min-h-[150px] sm:mt-2">
            {([
              [line(STORY_HERO), line(stage.problem), "kp-ls-say-rafi kp-ls-say-problem"],
              [bn ? "বাডি" : "Buddy", line(stage.buddy), "kp-ls-say-buddy kp-ls-say-buddyline"],
              [line(STORY_HERO), line(stage.solution), "kp-ls-say-rafi kp-ls-say-happy kp-ls-say-solved"],
            ] as const).map(([who, text, cls]) => (
              <figure key={cls} className={`kp-ls-say ${cls}`}>
                <figcaption><span className="kp-ls-wave" aria-hidden="true"><i /><i /><i /><i /></span>{who}</figcaption>
                <blockquote>{text}</blockquote>
                <button type="button" className="kp-ls-listen" onClick={() => { pause(); say(`${who}: ${text}`, lang); }} aria-label={bn ? `শুনুন: ${who}` : `Listen: ${who}`}><Volume2 size={14} aria-hidden="true" />{bn ? "শুনুন" : "Listen"}</button>
              </figure>
            ))}
          </div>
        </div>

        {/* the real app, ticking through what it does */}
        <aside aria-label={line(stage.app.name)} className="kp-ls-app absolute left-3 right-3 top-[60px] z-10 sm:left-auto sm:right-[4%] sm:top-[70px] sm:w-[330px]" style={{ opacity: "var(--b-app)" as unknown as number, transform: "translateY(calc((1 - var(--b-app)) * 24px))" }}>
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
          <p className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1">
            <Link href={stage.app.href} prefetch={false} className="inline-flex items-center gap-1 text-[13.5px] font-bold text-emerald-800 hover:underline">
              {stage.also ? line({ bn: "আইনি সহায়তা খুলুন", en: "Open Legal Aid" }) : bn ? "অ্যাপটি খুলুন" : "Open the app"} <ArrowRight size={14} aria-hidden="true" />
            </Link>
            {stage.also && <Link href={stage.also.href} prefetch={false} className="inline-flex items-center gap-1 text-[13.5px] font-bold text-emerald-800 hover:underline">{bn ? `${stage.also.name.bn} খুলুন` : `Open ${stage.also.name.en}`} <ArrowRight size={14} aria-hidden="true" /></Link>}
          </p>
        </aside>

        {/* poster: before it starts (auto-play off) and after it ends */}
        {(!started || ended) && (
          <button type="button" onClick={play} className="kp-ls-poster absolute inset-0 z-30 grid place-items-center" aria-label={ended ? (bn ? "আবার দেখুন" : "Watch again") : (bn ? "গল্পটি দেখুন" : "Play the story")}>
            <span className="kp-ls-bigplay">{ended ? <RotateCcw size={30} aria-hidden="true" /> : <Play size={34} aria-hidden="true" />}</span>
            <span className="mt-3 rounded-full bg-[#1d1712]/80 px-4 py-1.5 text-[15px] font-bold text-[#fbf3e8]">{ended ? (bn ? "আবার দেখুন" : "Watch again") : (bn ? `গল্পটি দেখুন · ${clock(DURATION, true)}` : `Play the story · ${clock(DURATION, false)}`)}</span>
          </button>
        )}

        {/* autoplay starts silent (browser rule): one tap turns the music on */}
        {playing && sound && !audible && (
          <button type="button" onClick={() => void startSound()} className="kp-ls-soundhint absolute bottom-[64px] right-3 z-40 sm:bottom-[76px] sm:right-5" data-testid="story-sound-hint">
            <Volume2 size={16} aria-hidden="true" /> {bn ? "সংগীত শুনতে চাপুন" : "Tap for music"}
          </button>
        )}

        {/* controls */}
        <div className="kp-ls-controls absolute inset-x-0 bottom-0 z-40 flex items-center gap-2 px-3 pb-2.5 pt-6 sm:gap-3 sm:px-5 sm:pb-3.5">
          <button type="button" onClick={() => (playing ? pause() : play())} className="kp-ls-ctl" aria-label={playing ? (bn ? "থামান" : "Pause") : (bn ? "চালান" : "Play")} data-testid="story-play">
            {playing ? <Pause size={18} aria-hidden="true" /> : <Play size={18} aria-hidden="true" />}
          </button>
          <span className="shrink-0 font-mono text-[12.5px] font-semibold tabular-nums text-white"><span ref={timeRef}>{clock(0, bn)}</span> / {clock(DURATION, bn)}</span>
          <div className="kp-ls-track relative flex-1">
            <input ref={scrubRef} type="range" min={0} max={1000} defaultValue={0} className="kp-ls-scrub w-full" aria-label={bn ? "গল্পের সময়" : "Story position"}
              onPointerDown={() => { ctl.current.scrubbing = true; }}
              onPointerUp={() => { ctl.current.scrubbing = false; }}
              onChange={(e) => seek((Number(e.currentTarget.value) / 1000) * DURATION)} />
            {STAGES.map((s, i) => (i === 0 ? null : <i key={s.id} className="kp-ls-tick" style={{ left: `${((i * CHAPTER_SECONDS) / DURATION) * 100}%` }} aria-hidden="true" />))}
            <i className="kp-ls-tick kp-ls-tick-epi" style={{ left: `${(CHAPTERS_END / DURATION) * 100}%` }} aria-hidden="true" />
          </div>
          <button type="button" onClick={toggleSound} className="kp-ls-ctl" aria-pressed={sound} aria-label={sound ? (bn ? "শব্দ বন্ধ করুন" : "Mute") : (bn ? "শব্দ চালু করুন" : "Unmute")} data-testid="story-sound">
            {sound ? <Volume2 size={17} aria-hidden="true" /> : <VolumeX size={17} aria-hidden="true" />}
          </button>
          <button type="button" role="switch" aria-checked={autoplay} onClick={() => setAutoplay(!autoplay)} className={`kp-ls-auto ${autoplay ? "kp-ls-auto-on" : ""}`} data-testid="story-autoplay">
            <i aria-hidden="true" /><span className="hidden sm:inline">{bn ? "অটো-প্লে" : "Autoplay"}</span><span className="sr-only sm:hidden">{bn ? "অটো-প্লে" : "Autoplay"}</span>
          </button>
          <span className="hidden sm:contents"><button type="button" onClick={fullscreen} className="kp-ls-ctl" aria-label={bn ? "পূর্ণ পর্দা" : "Full screen"}><Maximize size={17} aria-hidden="true" /></button></span>
        </div>
      </div>
      <p className="mt-2 px-1 text-[12.5px] text-slate-500">{bn ? "রাফি ও তার পরিবার কাল্পনিক চরিত্র; অ্যাপের প্রতিটি সুবিধা আসল। স্পেস: চালান/থামান · ← →: ৫ সেকেন্ড" : "Rafi and his family are fictional; every app feature is real. Space: play/pause · ← →: 5 seconds"}</p>
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
          {bn ? "রাজশাহীর কৃষক পরিবারের ছেলে রাফি (কাল্পনিক)। ভর্তি থেকে প্রথম আয়, মায়ের অসুখ থেকে বাবার মাঠ আর প্রতারকের এসএমএস: প্রতিটি মোড়ে সে কী সমস্যায় পড়ে, বাডি কোন অ্যাপ দেখায়, আর কী বদলায়। চালিয়ে দেখুন: প্রায় দেড় মিনিট।" : "Rafi (fictional), from a farming family in Rajshahi. From admission to his first pay, his mother's fever, his father's field and a scammer's SMS: at every turn, the problem, the app Buddy points to, and what changes. Press play: about a minute and a half."}
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
