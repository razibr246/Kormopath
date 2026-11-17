// The picture beside "The weather is not what it used to be": drought on one side, flood on the other, in the
// chosen country's own landscape, as an original animated illustration: a rain curtain and ripples over the flooded
// half, a pulsing sun and heat shimmer over the cracked half, storm clouds drifting, birds crossing, the crop swaying.
// Each country has its own ground (paddy and palms in Bangladesh, wheat on the Punjab plain, terraces under the
// Himalaya, an olive grove in Spain ...) and the same two weathers, blended softly across the middle. Changing country wipes the new scene in over the old one; the pointer
// moves the layers a little (parallax). It is decoration: the numbers beside it come from the data, not from this.
// Everything holds still under "reduced motion".
import { useEffect, useRef, useState } from 'react';
import { ABROAD } from '../../data/abroad';
import { useStore } from '../../store';
import { hash } from '../../engine/motion';

const W = 800, H = 450, HZ = 250;
const f1 = (n) => n.toFixed(1);

const CSS = `
.cs-root{--px:0;--py:0}
.cs-par{transition:transform .25s ease-out}
@keyframes cs-rain{from{transform:translate(0,-80px)}to{transform:translate(-38px,480px)}}
@keyframes cs-drift{from{transform:translateX(-30px)}to{transform:translateX(30px)}}
@keyframes cs-pulse{0%,100%{opacity:.5}50%{opacity:.95}}
@keyframes cs-sway{0%,100%{transform:rotate(-2.5deg)}50%{transform:rotate(3.2deg)}}
@keyframes cs-ripple{0%{transform:scale(.3);opacity:.65}100%{transform:scale(1.5);opacity:0}}
@keyframes cs-shimmer{0%{transform:translateX(-16px);opacity:0}50%{opacity:.55}100%{transform:translateX(16px);opacity:0}}
@keyframes cs-enter{from{clip-path:inset(0 0 0 100%);transform:scale(1.07)}to{clip-path:inset(0 0 0 0);transform:scale(1)}}
@keyframes cs-kb{from{transform:scale(1)}to{transform:scale(1.07) translate(-1.5%,-1%)}}
@keyframes cs-fly{from{transform:translateX(0)}to{transform:translateX(900px)}}
@keyframes cs-cap{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
@keyframes cs-flash{0%,92%,100%{opacity:0}94%{opacity:.35}96%{opacity:0}98%{opacity:.2}}
.cs-sway{transform-box:fill-box;transform-origin:50% 100%;animation:cs-sway 3.4s ease-in-out infinite}
.cs-ripple{transform-box:fill-box;transform-origin:center;animation:cs-ripple 3.2s ease-out infinite}
@media (prefers-reduced-motion:reduce){.cs-root *{animation:none!important;transition:none!important}}
`;

// ---------- weather layers shared by every scene ----------

function Rain({ id, n = 70 }) {
  return (
    <g mask={`url(#wet${id})`} stroke="#dbe8f6" strokeLinecap="round" opacity=".75">
      {Array.from({ length: n }, (_, i) => {
        const x = 330 + hash(i * 3.1) * 530, len = 14 + hash(i * 7.3) * 16;
        return <line key={i} x1={f1(x)} y1="0" x2={f1(x - 5)} y2={f1(len)} strokeWidth={f1(0.8 + hash(i * 5.1) * 0.9)} style={{ animation: `cs-rain ${f1(0.55 + hash(i * 9.7) * 0.5)}s linear ${f1(-hash(i * 2.3) * 1.5)}s infinite` }} />;
      })}
    </g>
  );
}

function Shimmer({ id }) {
  return (
    <g mask={`url(#dry${id})`} fill="none" stroke="#fff6d8" strokeWidth="1.6" strokeLinecap="round">
      {[0, 1, 2, 3, 4].map((i) => <path key={i} d={`M${40 + i * 70} ${HZ + 10 + i * 9}q30 -6 60 0t60 0`} style={{ animation: `cs-shimmer ${f1(2.4 + i * 0.5)}s ease-in-out ${f1(-i * 0.7)}s infinite` }} />)}
    </g>
  );
}

function Ripples({ id }) {
  return (
    <g mask={`url(#wet${id})`} fill="none" stroke="#e6f0f6" strokeWidth="1.2">
      {Array.from({ length: 12 }, (_, i) => {
        const y = HZ + 22 + hash(i * 4.4) * 160, x = 440 + hash(i * 6.1) * 350, rx = 10 + (y - HZ) * 0.12;
        return <ellipse key={i} className="cs-ripple" cx={f1(x)} cy={f1(y)} rx={f1(rx)} ry={f1(rx * 0.28)} style={{ animationDelay: `${f1(-hash(i * 8.8) * 3.2)}s` }} />;
      })}
    </g>
  );
}

function Sun({ cx = 120, cy = 92 }) {
  return (
    <g>
      <g opacity=".22" fill="#fff4c8" style={{ animation: 'cs-pulse 6s ease-in-out infinite' }}>
        {[-58, -40, -22, -4, 14].map((a) => <path key={a} d={`M${cx} ${cy}L${f1(cx + 420 * Math.cos((a + 70) * Math.PI / 180) - 14)} ${f1(cy + 420 * Math.sin((a + 70) * Math.PI / 180))}h28Z`} />)}
      </g>
      <circle cx={cx} cy={cy} r="64" fill="#ffd77a" opacity=".22" style={{ animation: 'cs-pulse 5s ease-in-out infinite' }} />
      <circle cx={cx} cy={cy} r="34" fill="#ffe7a0" opacity=".5" style={{ animation: 'cs-pulse 5s ease-in-out -1.6s infinite' }} />
      <circle cx={cx} cy={cy} r="17" fill="#fffbe8" />
    </g>
  );
}

function Storm({ id }) {
  return (
    <g style={{ animation: 'cs-drift 16s ease-in-out infinite alternate' }}>
      <g filter={`url(#soft${id})`}>
        <path d="M330 -20H900V92c-40 26-80 4-120 18-40 14-70-8-110 6-40 12-80-6-120 10-34 12-60-2-90 4-20-30-20-60 0-78Z" fill={`url(#storm${id})`} />
        <path d="M430 36c50-22 90 2 140-10 50-12 100 12 150-2 50-12 90 6 140 0V120c-50 14-90-6-140 6-50 12-100-8-150 6-50 12-80-8-120 2-30-14-40-30-20-8Z" fill="#6f7b90" opacity=".75" />
      </g>
      <g fill="#fff" style={{ animation: 'cs-flash 7s linear infinite' }}><path d="M560 20H820V130H560Z" opacity=".5" /><path d="M650 60l-12 34h10l-10 30 26-40h-11l9-24Z" opacity="1" /></g>
    </g>
  );
}

function Birds() {
  return (
    <g fill="none" stroke="#33404a" strokeWidth="1.6" strokeLinecap="round" opacity=".7">
      {[0, 1, 2, 3, 4].map((i) => (
        <path key={i} d={`M${-20 - i * 18} ${70 + (i % 2) * 10 + i * 4}q5 -5 10 0q5 -5 10 0`} style={{ animation: `cs-fly ${22 + i}s linear ${-i * 3}s infinite` }} />
      ))}
    </g>
  );
}

// ---------- the ground ----------

// The crop in perspective: bands of small plants from the horizon to the foot of the picture, each band nearer, bigger
// and sparser; on the dry side they lean and are straw-coloured, on the wet side they stand green in the water.
const BANDS = Array.from({ length: 15 }, (_, j) => {
  const y = HZ + 5 + (H - HZ) * (j / 14) ** 1.7, sc = 0.12 + 0.88 * (y - HZ) / (H - HZ);
  const step = 4 + 24 * sc;
  return { y, sc, step };
});
function bandPath({ y, sc, step }, j, dry) {
  let d = '';
  for (let x = -10 + hash(j * 7.1) * step; x < W + 10; x += step) {
    const h = (10 + hash(x * 0.37 + j) * 6) * sc * 1.6, lean = dry ? (5 + hash(x + j) * 6) * sc : (hash(x * 1.3 + j) - 0.5) * 2 * sc;
    const yy = y + (hash(x * 0.71 + j * 3) - 0.5) * 3 * sc;
    d += `M${f1(x - 2 * sc)} ${f1(yy)}l${f1(lean - 1 * sc)} ${f1(-h)}M${f1(x)} ${f1(yy)}l${f1(lean)} ${f1(-h * 1.15)}M${f1(x + 2 * sc)} ${f1(yy)}l${f1(lean + 1.5 * sc)} ${f1(-h * 0.9)}`;
  }
  return d;
}
const ROWS_DRY = BANDS.map((b, j) => bandPath(b, j, true));
const ROWS_WET = BANDS.map((b, j) => bandPath(b, j, false));

function cracks() {
  let d = '';
  for (let k = 0; k < 26; k++) {
    let x = 10 + hash(k * 3.7) * 400, y = HZ + 14 + hash(k * 5.9) * 180;
    d += `M${f1(x)} ${f1(y)}`;
    for (let s = 0; s < 4; s++) { x += (hash(k * 11 + s) - 0.4) * 26 * (1 + (y - HZ) / 120); y += (hash(k * 13 + s) - 0.25) * 12 * (1 + (y - HZ) / 140); d += `L${f1(x)} ${f1(y)}`; }
  }
  return d;
}
const CRACKS = cracks();

// A tuft of the crop in the foreground: dry and bent on the left, green and upright on the right.
function Tuft({ x, y, k, kind, dry, c }) {
  const h = (kind === 'corn' ? 92 : kind === 'wheat' ? 70 : 62) + hash(k * 3.3) * 22;
  const lean = dry ? 14 + hash(k) * 12 : (hash(k * 2.2) - 0.5) * 6;
  const col = dry ? c.dry : c.green;
  const d = [-7, -3, 1, 5, 8].map((o, i) => `M${o} 0Q${f1(o + lean * 0.3)} ${f1(-h * 0.6)} ${f1(o * 1.6 + lean)} ${f1(-h * (0.78 + (i % 3) * 0.1))}`).join('');
  return (
    <g transform={`translate(${f1(x)} ${f1(y)})`}>
      <g className="cs-sway" style={{ animationDelay: `${f1(-hash(k * 6.1) * 3)}s`, animationDuration: `${f1(2.8 + hash(k) * 1.6)}s` }}>
        <path d={d} stroke={col} strokeWidth={kind === 'corn' ? 4.5 : 2.6} fill="none" strokeLinecap="round" />
        {kind === 'wheat' && <ellipse cx={f1(lean + 1)} cy={f1(-h - 6)} rx="3" ry="8" fill={dry ? '#b99a52' : '#c9b04e'} transform={`rotate(${f1(lean * 1.2)} ${f1(lean)} ${f1(-h)})`} />}
        {kind === 'corn' && <path d={`M-12 ${f1(-h * 0.5)}Q${f1(-2 + lean)} ${f1(-h * 0.6)} ${f1(lean)} ${f1(-h)}M12 ${f1(-h * 0.45)}Q${f1(lean * 0.6)} ${f1(-h * 0.6)} ${f1(lean)} ${f1(-h)}`} stroke={col} strokeWidth="3" fill="none" strokeLinecap="round" />}
        {kind === 'soy' && [0, 1, 2].map((i) => <ellipse key={i} cx={f1(lean * 0.4 + (i - 1) * 7)} cy={f1(-h * (0.5 + i * 0.12))} rx="6" ry="3.2" fill={col} />)}
      </g>
    </g>
  );
}

function Shrub({ x, y, k, dry, c }) {
  const r = dry ? 12 + hash(k) * 4 : 15 + hash(k) * 5;
  return (
    <g transform={`translate(${f1(x)} ${f1(y)})`}>
      <path d="M0 0v-9" stroke="#6a5237" strokeWidth="3" />
      <g className="cs-sway" style={{ animationDelay: `${f1(-hash(k * 6.1) * 3)}s` }}>
        <ellipse cx="0" cy={f1(-9 - r * 0.7)} rx={f1(r * 1.15)} ry={f1(r * 0.8)} fill={dry ? c.dry : c.green} />
        <ellipse cx={f1(-r * 0.3)} cy={f1(-11 - r * 0.8)} rx={f1(r * 0.6)} ry={f1(r * 0.4)} fill="#fff" opacity=".14" />
      </g>
    </g>
  );
}

// ---------- landmarks on the horizon ----------

function Landmark({ kind, x }) {
  const g = (children) => <g transform={`translate(${x} ${HZ + 2})`}>{children}</g>;
  switch (kind) {
    case 'palm': return g(<><path d="M0 0Q6 -30 2 -62" stroke="#6b4a2c" strokeWidth="4" fill="none" /><g stroke="#3f7a3c" strokeWidth="3" fill="none" strokeLinecap="round"><path d="M2 -62q-20 -8 -32 4M2 -62q-10 -16 -26 -14M2 -62q10 -16 26 -12M2 -62q20 -6 32 6M2 -62q0 -14 4 -22" /></g><g transform="translate(60 0) scale(.8)"><path d="M0 0Q-5 -26 0 -54" stroke="#6b4a2c" strokeWidth="4" fill="none" /><g stroke="#3f7a3c" strokeWidth="3" fill="none" strokeLinecap="round"><path d="M0 -54q-18 -6 -28 6M0 -54q-8 -14 -24 -12M0 -54q8 -14 24 -10M0 -54q18 -4 28 8" /></g></g></>);
    case 'tubewell': return g(<><rect x="-16" y="-24" width="32" height="24" fill="#d8d2c4" stroke="#8d8676" /><path d="M-18 -24L0 -38L18 -24Z" fill="#b85c38" /><path d="M16 -8h16q8 0 8 8" stroke="#6f7a82" strokeWidth="4" fill="none" /><path d="M40 0q6 6 12 14" stroke="#9fd0ee" strokeWidth="2.4" fill="none" strokeLinecap="round" style={{ animation: 'cs-pulse 1.2s linear infinite' }} /></>);
    case 'mud': return g(<><rect x="-22" y="-22" width="44" height="22" fill="#c9a77a" stroke="#8d6f47" /><rect x="-26" y="-27" width="52" height="6" fill="#a98a5e" /><rect x="-5" y="-14" width="10" height="14" fill="#6e5334" /><path d="M40 0h26v-14h-26Z" fill="#b99468" stroke="#8d6f47" /></>);
    case 'dzong': return g(<><path d="M-60 0L-48 -50H48L60 0Z" fill="#f3eee2" stroke="#b9ae92" /><rect x="-48" y="-62" width="96" height="14" fill="#a83a2a" /><path d="M-18 -62L0 -84L18 -62Z" fill="#d6a53a" /><rect x="-10" y="-30" width="20" height="30" fill="#7a4a2a" /><g fill="#7a4a2a">{[-36, -22, 22, 36].map((wx) => <rect key={wx} x={wx - 3} y="-40" width="6" height="9" />)}</g></>);
    case 'pagoda': return g(<><path d="M-26 0Q-22 -20 -10 -34Q-4 -44 0 -78Q4 -44 10 -34Q22 -20 26 0Z" fill="#e8b93e" stroke="#a97d1c" /><path d="M-18 -20h36M-12 -32h24M-6 -46h12" stroke="#a97d1c" strokeWidth="1.4" /><circle cx="0" cy="-82" r="2.6" fill="#fff3c0" /><g transform="translate(64 0) scale(.7)"><path d="M0 0Q-5 -26 0 -54" stroke="#6b4a2c" strokeWidth="4" fill="none" /><g stroke="#3f7a3c" strokeWidth="3" fill="none" strokeLinecap="round"><path d="M0 -54q-18 -6 -28 6M0 -54q-8 -14 -24 -12M0 -54q8 -14 24 -10M0 -54q18 -4 28 8" /></g></g></>);
    case 'silo': return g(<><rect x="-34" y="-30" width="48" height="30" fill="#a83a2a" stroke="#6f241a" /><path d="M-38 -30L-26 -46H6L18 -30Z" fill="#8a2c20" /><path d="M-20 0v-14h20v14M-20 -14L0 0M0 -14L-20 0" stroke="#f3e6d0" fill="none" /><rect x="22" y="-52" width="16" height="52" fill="#c8ccd0" stroke="#8d949a" /><path d="M22 -52Q30 -64 38 -52Z" fill="#9aa2a8" /></>);
    case 'tree': return g(<><path d="M0 0v-20" stroke="#6a5237" strokeWidth="4" /><ellipse cx="0" cy="-30" rx="20" ry="14" fill="#5d7f3a" /><ellipse cx="-6" cy="-34" rx="9" ry="6" fill="#fff" opacity=".14" /><g transform="translate(70 0) scale(.7)"><path d="M0 0v-20" stroke="#6a5237" strokeWidth="4" /><ellipse cx="0" cy="-30" rx="20" ry="14" fill="#6d8f42" /></g></>);
    case 'village': return g(<><path d="M-56 0V-18H-30V0M-30 0V-26H-6V0M-6 0V-16H22V0M22 0V-22H44V0" fill="#f6f1e6" stroke="#cfc6b0" /><rect x="-30" y="-44" width="14" height="22" fill="#f6f1e6" stroke="#cfc6b0" /><path d="M-31 -44L-23 -54L-15 -44Z" fill="#b5532f" /><g fill="#b5532f">{[-52, -2, 26].map((rx) => <path key={rx} d={`M${rx} -16h14l-3 -5h-8Z`} />)}</g></>);
    default: return null;
  }
}

// ---------- the countries ----------

const COUNTRY = {
  bangladesh: { sky: ['#cfe6ec', '#f8e6bc'], far: '#a9c08e', near: '#86a86a', dryG: ['#c9a46a', '#946f42'], wetG: '#6e98a4', dry: '#b99a4c', green: '#4c9a38', crop: 'paddy', hills: 'flat', mark: 'palm', markX: 560, treeline: true },
  india: { sky: ['#cfe1ea', '#f7e4bd'], far: '#b9bfa0', near: '#9aa87c', dryG: ['#c9a86c', '#9b7a45'], wetG: '#6b8fa3', dry: '#b69a52', green: '#5f9a3e', crop: 'wheat', hills: 'flat', mark: 'tubewell', markX: 580, tree: true },
  pakistan: { sky: ['#e5dcc2', '#f4e0b8'], far: '#cdb98e', near: '#b8a070', dryG: ['#d3b47a', '#a98954'], wetG: '#7a99a0', dry: '#b79b58', green: '#6c9a45', crop: 'wheat', hills: 'rolling', mark: 'mud', markX: 590, tree: true },
  nepal: { sky: ['#bcd6ea', '#eaf0ee'], far: '#9fb4c8', near: '#6f8f66', dryG: ['#bfa270', '#8d7648'], wetG: '#6f98ab', dry: '#b09a55', green: '#4f9a3e', crop: 'paddy', hills: 'terraces', mark: 'village', markX: 560, snow: true },
  bhutan: { sky: ['#b9d4e4', '#e8f0ea'], far: '#8fa8bd', near: '#4f7a52', dryG: ['#a89268', '#7e6a44'], wetG: '#6a95a6', dry: '#a89a58', green: '#3f8a45', crop: 'paddy', hills: 'jagged', mark: 'dzong', markX: 560, snow: true },
  myanmar: { sky: ['#cfe3e2', '#f6e8c4'], far: '#a9bd9a', near: '#7ea06e', dryG: ['#c4a56e', '#957544'], wetG: '#6f9a92', dry: '#b89a50', green: '#4f9a3a', crop: 'paddy', hills: 'rolling', mark: 'pagoda', markX: 570 },
  usa: { sky: ['#a9cfee', '#f2ead0'], far: '#b9c4a8', near: '#98aa78', dryG: ['#c8a868', '#957742'], wetG: '#6f93a8', dry: '#b8a050', green: '#4f963a', crop: 'corn', hills: 'flat', mark: 'silo', markX: 560 },
  brazil: { sky: ['#a8d4ee', '#f4ecd2'], far: '#8fae8a', near: '#6f9a62', dryG: ['#bf7a4a', '#8f4f2a'], wetG: '#8aa09a', dry: '#b0903f', green: '#4a9a36', crop: 'soy', hills: 'rolling', mark: 'tree', markX: 570 },
  spain: { sky: ['#b8d8ee', '#f6ecd0'], far: '#b8b08a', near: '#97a070', dryG: ['#cfae76', '#a07f48'], wetG: '#7a9ca6', dry: '#a99f62', green: '#6f9a4a', crop: 'olive', hills: 'rolling', mark: 'village', markX: 570 },
};

const HILLS = {
  flat: ['M0 250Q200 236 400 246T800 242V252H0Z', 'M0 250Q220 242 420 249T800 246V252H0Z'],
  rolling: ['M0 250Q110 196 260 226T520 214T800 224V252H0Z', 'M0 252Q140 222 300 240T620 232T800 240V252H0Z'],
  jagged: ['M0 250L60 168L110 204L190 112L250 188L320 138L400 208L480 104L560 194L640 146L720 200L800 156V252H0Z', 'M0 252L90 206L170 232L260 198L360 232L470 200L580 234L690 206L800 232V252H0Z'],
  terraces: ['M0 250L70 176L130 206L200 124L270 192L340 148L420 208L500 116L580 198L660 154L740 204L800 170V252H0Z', 'M0 252Q140 206 300 234T620 222T800 232V252H0Z'],
};
const SNOW = [[190, 112], [480, 104], [320, 138], [200, 124], [500, 116]];

function SceneArt({ id }) {
  const c = COUNTRY[id];
  const uid = id;
  const [hFar, hNear] = HILLS[c.hills];
  const tufts = Array.from({ length: 30 }, (_, i) => ({ x: 4 + i * 27 + hash(i * 3.3) * 10, y: 452 + hash(i * 5.7) * 6, k: i }));
  const shrubRows = c.crop === 'olive' ? [[HZ + 22, 0.5], [HZ + 60, 0.75], [HZ + 120, 1]] : null;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full" role="img" aria-hidden="true">
      <defs>
        <linearGradient id={`sky${uid}`} x2="0" y2="1"><stop stopColor={c.sky[0]} /><stop offset="1" stopColor={c.sky[1]} /></linearGradient>
        <linearGradient id={`dg${uid}`} x2="0" y2="1"><stop stopColor={c.dryG[0]} /><stop offset="1" stopColor={c.dryG[1]} /></linearGradient>
        <linearGradient id={`wg${uid}`} x2="0" y2="1"><stop stopColor={c.wetG} /><stop offset="1" stopColor="#4d7387" /></linearGradient>
        <linearGradient id={`split${uid}`} gradientUnits="userSpaceOnUse" x1="0" y1="0" x2={W} y2="190"><stop offset=".4" stopColor="#fff" /><stop offset=".6" stopColor="#000" /></linearGradient>
        <linearGradient id={`splitW${uid}`} gradientUnits="userSpaceOnUse" x1="0" y1="0" x2={W} y2="190"><stop offset=".4" stopColor="#000" /><stop offset=".6" stopColor="#fff" /></linearGradient>
        <mask id={`dry${uid}`} maskUnits="userSpaceOnUse" x="0" y="0" width={W} height={H}><rect width={W} height={H} fill={`url(#split${uid})`} /></mask>
        <mask id={`wet${uid}`} maskUnits="userSpaceOnUse" x="0" y="0" width={W} height={H}><rect width={W} height={H} fill={`url(#splitW${uid})`} /></mask>
        <linearGradient id={`storm${uid}`} x2="0" y2="1"><stop stopColor="#3c4658" /><stop offset="1" stopColor="#5c687c" /></linearGradient>
        <linearGradient id={`haze${uid}`} x2="0" y2="1"><stop stopColor="#fff" stopOpacity="0" /><stop offset=".5" stopColor="#fff" stopOpacity=".45" /><stop offset="1" stopColor="#fff" stopOpacity="0" /></linearGradient>
        <linearGradient id={`sheen${uid}`} x2="0" y2="1"><stop stopColor="#d9e8ee" stopOpacity=".55" /><stop offset=".35" stopColor="#d9e8ee" stopOpacity="0" /></linearGradient>
        <filter id={`soft${uid}`} x="-10%" y="-30%" width="120%" height="160%"><feGaussianBlur stdDeviation="5" /></filter>
      </defs>
      <rect width={W} height={H} fill={`url(#sky${uid})`} />
      <rect width={W} height={HZ + 10} fill="#45526a" opacity=".42" mask={`url(#wet${uid})`} />
      <g mask={`url(#dry${uid})`}><Sun /></g>
      <g className="cs-par" style={{ transform: 'translate(calc(var(--px) * -8px), calc(var(--py) * -3px))' }}>
        <path d={hFar} fill={c.far} opacity=".85" />
        {c.snow && SNOW.filter(([sx]) => c.hills === 'jagged' ? sx > 100 : true).map(([sx, sy]) => <path key={sx} d={`M${sx} ${sy}l-14 20q7 -5 14 2q7 -7 14 -2Z`} fill="#fff" />)}
        {c.hills === 'terraces' && [212, 222, 232, 242].map((y, i) => <path key={y} d={`M0 ${y}Q200 ${y - 14 - i * 2} 400 ${y}T800 ${y}`} stroke={i % 2 ? '#7fa874' : '#a6bf86'} strokeWidth="5" fill="none" opacity=".75" />)}
        {c.treeline && Array.from({ length: 64 }, (_, i) => { const x = i * 13 + hash(i * 1.9) * 8, rr = 6 + hash(i * 2.7) * 10 + (hash(i * 0.3) > 0.85 ? 8 : 0); return <circle key={i} cx={f1(x)} cy={f1(250 - rr * 0.55)} r={f1(rr)} fill={['#5c8a50', '#4f7d46', '#6a9659'][i % 3]} opacity=".85" />; })}
        <path d={hNear} fill={c.near} />
        {c.mark !== 'tree' && c.tree && <Landmark kind="tree" x={120} />}
        <Landmark kind={c.mark} x={c.markX} />
        {c.mark === 'tree' && <Landmark kind="palm" x={120} />}
        {id === 'bhutan' && [100, 150, 210].map((px, i) => <path key={px} d={`M${px} 250l-9 -4l7 -9l-8 -3l8 -12l-7 -3l8 -16l8 16l-7 3l8 12l-8 3l7 9Z`} fill="#2f5d3a" opacity={0.9 - i * 0.1} />)}
      </g>
      <g mask={`url(#dry${uid})`}>
        <path d={`M0 ${HZ}H${W}V${H}H0Z`} fill={`url(#dg${uid})`} />
        <path d={CRACKS} stroke="#5d4426" strokeWidth="1.1" fill="none" opacity=".55" />
        {c.crop !== 'olive' && ROWS_DRY.map((d, j) => <path key={j} d={d} stroke={c.dry} strokeWidth={f1(0.5 + BANDS[j].sc * 2.2)} strokeLinecap="round" fill="none" opacity={f1(0.55 + BANDS[j].sc * 0.4)} />)}
      </g>
      <g mask={`url(#wet${uid})`}>
        <path d={`M0 ${HZ}H${W}V${H}H0Z`} fill={`url(#wg${uid})`} />
        <path d={`M0 ${HZ}H${W}V${H}H0Z`} fill={`url(#sheen${uid})`} />
        {c.crop !== 'olive' && ROWS_WET.map((d, j) => <path key={j} d={d} stroke={c.green} strokeWidth={f1(0.5 + BANDS[j].sc * 2.2)} strokeLinecap="round" fill="none" opacity={f1(0.6 + BANDS[j].sc * 0.4)} />)}
      </g>
      <rect y={HZ - 26} width={W} height="60" fill={`url(#haze${uid})`} />
      <g mask={`url(#wet${uid})`}><Storm id={uid} /></g>
      <Birds />
      <Rain id={uid} />
      <Ripples id={uid} />
      <Shimmer id={uid} />
      <g className="cs-par" style={{ transform: 'translate(calc(var(--px) * 12px), calc(var(--py) * 4px))' }}>
        {shrubRows
          ? shrubRows.flatMap(([y, s], r) => Array.from({ length: 8 }, (_, i) => { const x = i * 112 + (r % 2) * 56; return <g key={`${r}-${i}`} transform={`translate(${x} 0)`}><Shrub x={20} y={y + 20 + r * 26} k={r * 9 + i} dry={x < 400} c={c} /></g>; }))
          : tufts.map((t) => <Tuft key={t.k} x={t.x} y={t.y} k={t.k} kind={c.crop} dry={t.x < 370 + hash(t.k * 9.1) * 40} c={c} />)}
      </g>
    </svg>
  );
}

// ---------- the figure ----------

let lastCountry = null; // the country shown before this mount, so the wipe plays across the Bangladesh/abroad swap

export default function ClimateScene({ country = 'bangladesh', className = 'aspect-[16/9]' }) {
  const { T, L } = useStore();
  const [prev, setPrev] = useState(() => (lastCountry && lastCountry !== country ? lastCountry : null));
  const [shown, setShown] = useState(country);
  const box = useRef(null);
  useEffect(() => {
    if (shown !== country) { setPrev(shown); setShown(country); }
    lastCountry = country;
  }, [country]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!prev) return undefined;
    const t = setTimeout(() => setPrev(null), 1000);
    return () => clearTimeout(t);
  }, [prev]);
  const onMove = (e) => {
    const r = box.current?.getBoundingClientRect();
    if (!r) return;
    box.current.style.setProperty('--px', (((e.clientX - r.left) / r.width) - 0.5).toFixed(3));
    box.current.style.setProperty('--py', (((e.clientY - r.top) / r.height) - 0.5).toFixed(3));
  };
  const onLeave = () => { box.current?.style.setProperty('--px', '0'); box.current?.style.setProperty('--py', '0'); };
  const layer = (id) => <SceneArt id={COUNTRY[id] ? id : 'bangladesh'} />;
  const meta = shown === 'bangladesh' ? { flag: '🇧🇩', name: T('বাংলাদেশ', 'Bangladesh') } : { flag: ABROAD[shown]?.flag, name: ABROAD[shown] ? L(ABROAD[shown].name) : '' };
  return (
    <div ref={box} onPointerMove={onMove} onPointerLeave={onLeave} className={`cs-root relative w-full overflow-hidden bg-primary-100/70 ${className}`}>
      <style>{CSS}</style>
      {prev && <div key={`p-${prev}`} className="absolute inset-0">{layer(prev)}</div>}
      <div key={shown} className="absolute inset-0" style={prev ? { animation: 'cs-enter .85s cubic-bezier(.65,0,.2,1) both' } : undefined}>{layer(shown)}</div>
      <div key={`c-${shown}`} className="absolute bottom-3 left-3 flex items-center gap-2 rounded-full bg-black/45 px-3 py-1.5 text-[12.5px] font-semibold text-white backdrop-blur-md" style={{ animation: 'cs-cap .6s .25s both' }}>
        <span aria-hidden="true">{meta.flag}</span>{meta.name}
        <span className="font-normal text-white/70">· {T('খরা ← → বন্যা', 'drought ← → flood')}{T(' · চিত্র', ' · illustration')}</span>
      </div>
    </div>
  );
}
