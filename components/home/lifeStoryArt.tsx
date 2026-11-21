// Set design for the life story (components/home/LifeStory.tsx): each chapter gets its own place and time of day,
// drawn in scene units (viewBox 1000 × 620, ground ≈ y 563). Outdoor sets are layered for parallax: `far` (a tree line
// of coconut palms and tin-roof houses) moves least with the camera, `mid` more. Indoor sets put Rafi in a room: a
// plastered wall, a floor, and a window that shows the weather outside (rain while he struggles, sun once solved).
// Colours that should change with the mood use CSS custom properties set by the frame loop (--mood 0 → 1).
import type { ReactNode } from "react";
import type { StageId } from "@/lib/lifeStory";

export const INDOOR: Record<StageId, boolean> = { study: true, work: true, earn: false, home: false, health: true, field: false, protect: false };

/** A coconut palm: a leaning trunk and drooping fronds; `s` scales it, `lean` bends it. */
function Palm({ x, y, s = 1, lean = 1 }: { x: number; y: number; s?: number; lean?: number }) {
  const tx = 18 * lean;
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} className="kp-ls-palm">
      <path d={`M0 0C${4 * lean} -40 ${tx - 6} -80 ${tx} -120`} fill="none" strokeWidth="6" strokeLinecap="round" className="kp-ls-trunk" />
      <g transform={`translate(${tx} -120)`} className="kp-ls-fronds"><g>
        <animateTransform attributeName="transform" type="rotate" values={`-3;${3 + lean};-3`} dur={`${3.6 + Math.abs(lean)}s`} repeatCount="indefinite" />
        {[-150, -115, -80, -40, -5, 30].map((a, i) => (
          <path key={i} transform={`rotate(${a})`} d="M0 0C14 -6 34 -4 52 6C36 2 20 4 0 0Z" />
        ))}
        <circle r="5" className="kp-ls-coco" />
      </g></g>
    </g>
  );
}

/** A village house: mud wall, a corrugated tin roof (the ridges catch the light), a door. */
function Hut({ x, y, w = 70, s = 1 }: { x: number; y: number; w?: number; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <rect x="0" y="-34" width={w} height="34" className="kp-ls-mud" />
      <path d={`M-8 -34L${w / 2} -60L${w + 8} -34Z`} className="kp-ls-tin" />
      {Array.from({ length: Math.floor(w / 9) }, (_, i) => <path key={i} d={`M${i * 9} -34L${w / 2} -58`} className="kp-ls-tin-ridge" />)}
      <rect x={w * 0.42} y="-22" width="12" height="22" className="kp-ls-door" />
    </g>
  );
}

function Banana({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} className="kp-ls-banana">
      <path d="M0 0V-46" strokeWidth="5" className="kp-ls-trunk" fill="none" />
      {[-60, -20, 25, 65].map((a, i) => <path key={i} transform={`translate(0 -44) rotate(${a})`} d="M0 0C10 -10 34 -12 40 -4C30 -2 14 2 0 0Z" />)}
    </g>
  );
}

/** The village beyond: a soft tree line, palms and houses (far layer). */
function Village({ variant = 0 }: { variant?: number }) {
  return (
    <g className="kp-ls-far">
      <path d="M-200 470C-120 446 -40 452 40 444S200 430 300 440 460 426 560 436 760 424 880 434 1100 440 1200 446V560H-200Z" className="kp-ls-treeline" />
      {variant === 0 ? (
        <>
          <Hut x={90} y={470} w={74} s={0.8} /><Palm x={70} y={470} s={0.7} lean={-0.6} /><Palm x={210} y={466} s={0.85} lean={0.8} />
          <Hut x={760} y={462} w={86} s={0.75} /><Palm x={860} y={462} s={0.9} lean={-0.9} /><Banana x={730} y={462} s={0.7} />
        </>
      ) : (
        <>
          <Palm x={40} y={460} s={0.8} lean={0.7} /><Palm x={150} y={466} s={0.65} lean={-0.5} /><Hut x={620} y={458} w={64} s={0.7} />
          <Palm x={910} y={456} s={0.95} lean={-0.7} /><Banana x={980} y={460} s={0.8} />
        </>
      )}
    </g>
  );
}

/** A room: plastered wall, floor, skirting, and a window onto the weather. */
function Room({ night = false, children }: { night?: boolean; children?: ReactNode }) {
  return (
    <g>
      <rect x="-300" y="-500" width="1600" height="1020" className={night ? "kp-ls-wall kp-ls-wall-night" : "kp-ls-wall"} />
      <rect x="-300" y="520" width="1600" height="700" className="kp-ls-floor" />
      <rect x="-300" y="512" width="1600" height="10" className="kp-ls-skirting" />
      {/* the window: its own sky, rain while the problem lasts, warm light once solved */}
      <g transform="translate(640 150)">
        <rect x="-8" y="-8" width="196" height="196" rx="4" className="kp-ls-frame" />
        <clipPath id={`kp-ls-win-${night ? "n" : "d"}`}><rect width="180" height="180" /></clipPath>
        <g clipPath={`url(#kp-ls-win-${night ? "n" : "d"})`}>
          <rect width="180" height="180" className={night ? "kp-ls-winsky kp-ls-winsky-night" : "kp-ls-winsky"} />
          {night ? <><circle cx="132" cy="44" r="16" className="kp-ls-moon" />{[[30, 30], [70, 60], [100, 22], [150, 100], [40, 120]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="1.6" className="kp-ls-star" style={{ animationDelay: `${-i * 0.6}s` }} />)}</> : <circle cx="140" cy="46" r="22" className="kp-ls-winsun" />}
          <path d="M-10 150C30 130 70 140 100 128S160 120 200 130V200H-10Z" className="kp-ls-wintrees" />
          <g className="kp-ls-winrain">{Array.from({ length: 12 }, (_, i) => <line key={i} x1={i * 17} y1={-20 - (i * 29) % 80} x2={i * 17 - 6} y2={2 - (i * 29) % 80} style={{ animationDelay: `${-i * 0.13}s` }} />)}</g>
        </g>
        <path d="M90 0V180M0 90H180" className="kp-ls-mullion" />
      </g>
      {/* light through the window falls on the floor once it clears */}
      <path d="M640 330L820 330L900 600L560 600Z" className="kp-ls-winlight" />
      {children}
    </g>
  );
}

/**
 * Light on the actors, drawn over everything in the set like a film grade: `multiply` tints the whole frame to the
 * time of day (cool at night, gold in the afternoon, rose at dusk); `screen` adds light from a source in the scene
 * (the laptop and the lamp spilling onto his face, the morning window once the plan is clear).
 */
/**
 * The full-frame grade for each scene, as a colour and an opacity expression. It is drawn as an HTML overlay above the
 * SVG (LifeStory.tsx), not inside it: inside, a frame-sized blend layer had to be re-rasterised with the scene on
 * every frame; as its own composited layer the GPU blends it almost for free.
 */
export const GRADE: Partial<Record<StageId, { color: string; k: string }>> = {
  work: { color: "#2a3a66", k: "calc(.34 - var(--mood) * .08)" },
  health: { color: "#2b2f55", k: "calc(.3 - var(--mood) * .06)" },
  earn: { color: "#ffcf8a", k: "calc(.08 + var(--mood) * .1)" },
  protect: { color: "#e98b6a", k: "calc(.12 + var(--mood) * .08)" },
};

/** Light sources in the scene (inside the SVG, so they sit where the lamp, the laptop and the window are). */
export function Lighting({ id }: { id: StageId }): ReactNode {
  const glow = (gid: string, cx: number, cy: number, r: number, color: string, k: string) => (
    <>
      <radialGradient id={gid} cx="50%" cy="50%" r="50%"><stop offset="0" stopColor={color} stopOpacity="1" /><stop offset="1" stopColor={color} stopOpacity="0" /></radialGradient>
      <circle cx={cx} cy={cy} r={r} fill={`url(#${gid})`} style={{ mixBlendMode: "screen", opacity: k as unknown as number }} />
    </>
  );
  switch (id) {
    case "work": return <g pointerEvents="none">{glow("kp-ls-lt-laptop", 600, 390, 230, "#9fe3c9", "calc(.42 + var(--mood) * .2)")}</g>;
    case "health": return <g pointerEvents="none">{glow("kp-ls-lt-lamp", 190, 300, 300, "#ffcf87", "calc(.34 + var(--mood) * .22)")}</g>;
    case "study": return <g pointerEvents="none">{glow("kp-ls-lt-win", 720, 260, 360, "#ffe6a8", "calc(var(--mood) * .45)")}</g>;
    case "protect": return <g pointerEvents="none">{glow("kp-ls-lt-dusk", 900, 120, 420, "#ffb27a", "calc(.2 + var(--mood) * .2)")}</g>;
    default: return null;
  }
}

/** Per-chapter set: what sits behind the actors (`far` drifts least, then the room or the `mid` props). */
export function Backdrop({ id }: { id: StageId }): { far: ReactNode; mid: ReactNode } {
  switch (id) {
    case "study":
      return {
        far: null,
        mid: (
          <Room>
            {/* a calendar and a shelf of books; a bulb that lights when the plan is clear */}
            <g transform="translate(170 250)"><rect width="74" height="92" rx="3" className="kp-ls-paper" /><rect width="74" height="20" rx="3" className="kp-ls-cal-head" />{Array.from({ length: 12 }, (_, i) => <rect key={i} x={8 + (i % 4) * 16} y={30 + Math.floor(i / 4) * 18} width="10" height="10" className="kp-ls-cal-day" style={{ ["--i" as string]: i }} />)}</g>
            <g transform="translate(300 300)"><rect width="150" height="8" className="kp-ls-shelf" />{["#c0563b", "#3f8f86", "#d9a441", "#4a5a8a", "#8a5a3a", "#6f9a3e"].map((c, i) => <rect key={i} x={6 + i * 22} y={-34 + (i % 2) * 4} width="16" height={34 - (i % 2) * 4} fill={c} />)}</g>
            <g className="kp-ls-bulb"><path d="M560 -40V120" className="kp-ls-wire" /><circle cx="560" cy="132" r="13" className="kp-ls-bulb-glass" /><circle cx="560" cy="132" r="90" className="kp-ls-bulb-glow" /></g>
          </Room>
        ),
      };
    case "work":
      return {
        far: null,
        mid: (
          <Room night>
            {/* night: the laptop is the light in the room */}
            <g transform="translate(150 260)"><rect width="120" height="80" rx="4" className="kp-ls-paper kp-ls-dim" /><path d="M14 22h90M14 38h70M14 54h80" className="kp-ls-notes" /></g>
            <circle cx="610" cy="430" r="230" className="kp-ls-screenglow" />
          </Room>
        ),
      };
    case "health":
      return {
        far: null,
        mid: (
          <Room night>
            {/* a mosquito net over the bed, a water glass, a dim lamp */}
            <g transform="translate(150 300)"><rect width="34" height="70" rx="6" className="kp-ls-lamp-body" /><circle cx="17" cy="-8" r="60" className="kp-ls-lamp-glow" /></g>
            <path d="M560 210L900 210L960 470L520 470Z" className="kp-ls-net" />
            <path d="M560 210C600 300 590 400 540 470M900 210C870 300 900 400 950 470M730 210V470" className="kp-ls-net-fold" />
          </Room>
        ),
      };
    case "earn":
      return { far: <Village variant={0} />, mid: null };
    case "home":
      return {
        far: <Village variant={1} />,
        mid: (
          // a bazar stall behind him: an awning, baskets of produce
          <g transform="translate(700 440)">
            <path d="M-20 -80H200L188 -56H-8Z" className="kp-ls-awning" />
            {Array.from({ length: 6 }, (_, i) => <path key={i} d={`M${-20 + i * 37} -80l18 0l-6 24h-14z`} className={i % 2 ? "kp-ls-awning-b" : ""} />)}
            <rect x="0" y="-56" width="4" height="70" className="kp-ls-post" /><rect x="176" y="-56" width="4" height="70" className="kp-ls-post" />
            <rect x="10" y="-6" width="160" height="16" rx="3" className="kp-ls-table" />
            {[["#c0563b", 30], ["#6f9a3e", 70], ["#e8b54f", 110], ["#8a3a6a", 150]].map(([c, x], i) => <ellipse key={i} cx={x as number} cy={-14} rx="18" ry="10" fill={c as string} />)}
          </g>
        ),
      };
    case "field":
      return {
        far: <Village variant={1} />,
        mid: (
          // paddy rows receding to the tree line; a glint of water between them
          <g className="kp-ls-paddyfar">
            {Array.from({ length: 7 }, (_, r) => (
              <path key={r} d={`M-200 ${478 + r * 12}H1200`} strokeWidth={1 + r * 0.5} className="kp-ls-row" style={{ opacity: 0.35 + r * 0.08 }} />
            ))}
            <path d="M-200 486H1200" className="kp-ls-water" />
          </g>
        ),
      };
    case "protect":
      return {
        far: <Village variant={0} />,
        mid: (
          // dusk on the village road: a tea stall's lamp and a phone tower against the sky
          <g>
            <path d="M880 470L896 300L912 470M884 420H908M888 370H904" className="kp-ls-tower" />
            <circle cx="896" cy="298" r="3" className="kp-ls-tower-light" />
          </g>
        ),
      };
  }
}
