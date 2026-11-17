// Shared UI kit: buttons, badges, page headers, stat tiles, data-source tags, score ring, notes and empty states.
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, HelpCircle, Info, AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react';
import { useStore, clim, soilData } from '../store.jsx';
import { bnDigits } from '../engine/dates.js';
import { smsParts } from '../engine/text.js';
import { useCountUp } from './Motion.jsx';

// A number that counts up to its value the first time it appears (instant for reduced motion; Bangla digits in Bangla).
export function CountUp({ value, duration, className = '' }) {
  const { s } = useStore();
  const n = useCountUp(value, duration);
  // Screen readers get the final number once, not every step of the count.
  return <span className={`tabular ${className}`}><span aria-hidden="true">{s.lang === 'bn' ? bnDigits(n) : n}</span><span className="sr-only">{s.lang === 'bn' ? bnDigits(value) : value}</span></span>;
}

// Focus: a 2 px ring in the button's own strong colour, 2 px off its edge, so keyboard focus is plain on any surface.
const BTN_BASE = 'inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-[15px] font-semibold transition-[transform,box-shadow,background-color,border-color,color,opacity,filter] duration-200 ease-[var(--ease-spring)] active:scale-[.96] motion-reduce:transition-none motion-reduce:active:scale-100 motion-reduce:hover:translate-y-0 disabled:pointer-events-none disabled:opacity-45 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 select-none cursor-pointer';
const BTN = {
  // Glossy green: the same lit gradient and light sweep as the header CTAs, so every primary action reads as one.
  primary: 'btn-gloss text-white focus-visible:ring-primary-500 shadow-sm hover:shadow-md',
  secondary: 'border border-border/80 bg-white/95 text-ink hover:border-primary-300 hover:bg-primary-50/80 hover:shadow-sm hover:-translate-y-0.5 motion-reduce:hover:translate-y-0 focus-visible:ring-primary-500 backdrop-blur-xs',
  outline: 'border-2 border-primary-600 bg-transparent text-primary-800 hover:bg-primary-50 active:bg-primary-100 focus-visible:ring-primary-500',
  ghost: 'text-ink hover:bg-primary-50/80 hover:text-primary-800 focus-visible:ring-primary-500 active:bg-primary-100',
  danger: 'bg-red-600 text-white hover:bg-red-700 hover:shadow-md hover:-translate-y-0.5 motion-reduce:hover:translate-y-0 focus-visible:ring-red-500',
  dark: 'bg-primary-950 text-white hover:bg-primary-900 hover:shadow-md hover:-translate-y-0.5 motion-reduce:hover:translate-y-0 focus-visible:ring-primary-600',
  light: 'bg-white text-primary-900 hover:bg-primary-50 hover:shadow-md hover:-translate-y-0.5 motion-reduce:hover:translate-y-0 focus-visible:ring-white focus-visible:ring-offset-transparent',
};
export function Button({ to, variant = 'primary', loading = false, disabled = false, className = '', children, type = 'button', ...props }) {
  const cls = `${BTN_BASE} ${BTN[variant]} ${className}`;
  const content = (
    <>
      {loading && <Loader2 size={16} className="animate-spin text-current shrink-0" />}
      {children}
    </>
  );
  if (to) return <Link to={to} className={cls} aria-busy={loading} {...props}>{content}</Link>;
  return <button type={type} disabled={disabled || loading} aria-busy={loading} className={cls} {...props}>{content}</button>;
}

const BADGE = {
  green: 'border-primary-200/90 bg-gradient-to-r from-primary-50/95 to-primary-100/70 text-primary-800 hover:border-primary-300 shadow-2xs',
  amber: 'border-amber-200/90 bg-gradient-to-r from-amber-50/95 to-amber-100/70 text-amber-800 hover:border-amber-300 shadow-2xs',
  red: 'border-red-200/90 bg-gradient-to-r from-red-50/95 to-red-100/70 text-red-700 hover:border-red-300 shadow-2xs',
  blue: 'border-sky-200/90 bg-gradient-to-r from-sky-50/95 to-sky-100/70 text-sky-800 hover:border-sky-300 shadow-2xs',
  violet: 'border-violet-200/90 bg-gradient-to-r from-violet-50/95 to-violet-100/70 text-violet-700 hover:border-violet-300 shadow-2xs',
  slate: 'border-slate-200/90 bg-gradient-to-r from-slate-50/95 to-slate-100/70 text-slate-700 hover:border-slate-300 shadow-2xs',
  dark: 'border-primary-700 bg-primary-800 text-white shadow-2xs',
};
export function Badge({ tone = 'green', dot = false, children, className = '' }) {
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-[12.5px] font-semibold transition-[transform,border-color,box-shadow] duration-200 ease-[var(--ease-spring)] hover:scale-[1.03] active:scale-[0.98] motion-reduce:transition-none motion-reduce:hover:scale-100 motion-reduce:active:scale-100 ${BADGE[tone]} ${className}`}>
      {dot && <span className="live-dot shrink-0" />}
      {children}
    </span>
  );
}

// Page title block. `eyebrow` is a short plain-case pointer to where the user is, not a shouted label.
export function PageHeader({ eyebrow, title, subtitle, action, tags }) {
  return (
    <div className="page-header mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
      <div className="min-w-0">
        {eyebrow && <p className="page-header-eyebrow mb-1.5 text-[13px] font-semibold text-primary-700">{eyebrow}</p>}
        <h1 className="page-header-title text-[28px] font-bold tracking-tight text-ink sm:text-[34px]">{title}</h1>
        {subtitle && <p className="mt-2 max-w-2xl text-[15px] leading-7 text-muted">{subtitle}</p>}
        {tags && <div className="mt-3"><Tags list={tags} /></div>}
      </div>
      {action && <div className="flex shrink-0 flex-wrap gap-2">{action}</div>}
    </div>
  );
}

export function ProgressBar({ value, className = '', color = 'bg-primary-500' }) {
  return (
    <div className={`h-2 overflow-hidden rounded-full bg-black/[.06] shadow-inner ${className}`}>
      <div className={`progress-sheen h-full rounded-full ${color} transition-[width] duration-600 ease-[var(--ease-spring)]`} style={{ width: `${Math.max(2, Math.min(100, value))}%` }} />
    </div>
  );
}

const STAT_TONE = {
  green: 'bg-primary-100/80 text-primary-800 ring-1 ring-primary-300/40',
  blue: 'bg-sky-100/80 text-sky-800 ring-1 ring-sky-300/40',
  amber: 'bg-amber-100/80 text-amber-800 ring-1 ring-amber-300/40',
  red: 'bg-red-100/80 text-red-700 ring-1 ring-red-300/40',
  violet: 'bg-violet-100/80 text-violet-700 ring-1 ring-violet-300/40',
  clay: 'bg-clay-100/80 text-clay-700 ring-1 ring-clay-300/40',
};
const STAT_GLOW = {
  green: 'hover:border-primary-300 hover:shadow-[0_18px_38px_-12px_rgba(67,134,58,0.28)] hover:-translate-y-1',
  blue: 'hover:border-sky-300 hover:shadow-[0_18px_38px_-12px_rgba(47,138,143,0.28)] hover:-translate-y-1',
  amber: 'hover:border-amber-300 hover:shadow-[0_18px_38px_-12px_rgba(208,143,38,0.28)] hover:-translate-y-1',
  red: 'hover:border-red-300 hover:shadow-[0_18px_38px_-12px_rgba(220,38,38,0.28)] hover:-translate-y-1',
  violet: 'hover:border-violet-300 hover:shadow-[0_18px_38px_-12px_rgba(139,92,246,0.28)] hover:-translate-y-1',
  clay: 'hover:border-clay-300 hover:shadow-[0_18px_38px_-12px_rgba(168,85,42,0.28)] hover:-translate-y-1',
};
const STAT_ACCENT = {
  green: 'from-primary-500/0 via-primary-500/40 to-primary-500/0',
  blue: 'from-sky-500/0 via-sky-500/40 to-sky-500/0',
  amber: 'from-amber-500/0 via-amber-500/40 to-amber-500/0',
  red: 'from-red-500/0 via-red-500/40 to-red-500/0',
  violet: 'from-violet-500/0 via-violet-500/40 to-violet-500/0',
  clay: 'from-clay-500/0 via-clay-500/40 to-clay-500/0',
};
export function StatCard({ icon: Icon, label, value, note, tone = 'green', tag, to }) {
  const body = (
    <>
      <div className="flex items-start justify-between gap-2">
        <span className="text-[13.5px] font-semibold text-muted tracking-tight">{label}</span>
        <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl shadow-2xs transition-transform duration-300 ease-[var(--ease-spring)] group-hover:scale-110 group-hover:rotate-3 motion-reduce:transition-none motion-reduce:group-hover:scale-100 motion-reduce:group-hover:rotate-0 ${STAT_TONE[tone]}`}>{Icon && <Icon size={18} />}</span>
      </div>
      <p className="font-display mt-1 min-w-0 pr-4 text-[24px] font-bold leading-tight text-ink tabular tracking-tight">{value}</p>
      {note && <p className="mt-1 text-[13px] leading-5 text-muted truncate">{note}</p>}
      {tag && <div className="mt-2"><Tags list={[tag]} /></div>}
      <span aria-hidden="true" className={`pointer-events-none absolute inset-x-4 bottom-0 h-[2px] bg-gradient-to-r opacity-0 transition-opacity duration-300 group-hover:opacity-100 motion-reduce:transition-none ${STAT_ACCENT[tone] || STAT_ACCENT.green}`} />
      {to && <ChevronRight aria-hidden="true" size={17} className="stat-card-arrow absolute bottom-3.5 right-3.5 text-muted/60 transition-[transform,color] duration-250 ease-[var(--ease-spring)] group-hover:translate-x-1 group-hover:text-primary-700 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0" />}
    </>
  );
  const cls = `stat-card surface-card cv-auto group relative block overflow-hidden rounded-2xl p-4 transition-[transform,box-shadow,border-color] duration-300 ease-[var(--ease-spring)] motion-reduce:transition-none motion-reduce:hover:translate-y-0 ${to ? 'pb-8' : ''} ${STAT_GLOW[tone] || ''}`;
  return to ? <Link to={to} className={`${cls} lift`}>{body}</Link> : <div className={cls}>{body}</div>;
}

export function Card({ className = '', children, ...p }) {
  return <section className={`surface-card rounded-[22px] ${className}`} {...p}>{children}</section>;
}

// ---- data provenance tags ----
const TAG_STYLE = {
  REAL: 'bg-sky-50 text-sky-800 ring-1 ring-sky-200',
  SAT: 'bg-indigo-50 text-indigo-800 ring-1 ring-indigo-200',
  STATION: 'bg-cyan-50 text-cyan-800 ring-1 ring-cyan-200',
  MODEL: 'bg-teal-50 text-teal-800 ring-1 ring-teal-200',
  RECORD: 'bg-sky-50 text-sky-800 ring-1 ring-sky-200',
  RULE: 'bg-slate-100 text-slate-700 ring-1 ring-slate-200',
  AI: 'bg-violet-50 text-violet-800 ring-1 ring-violet-200',
  DEMO: 'bg-amber-50 text-amber-800 ring-1 ring-amber-200',
  PLACEHOLDER: 'bg-red-50 text-red-700 ring-1 ring-red-200',
};
const TAG_LABEL = {
  REAL: { bn: 'আসল তথ্য', en: 'Real data' }, SAT: { bn: 'উপগ্রহে দেখা', en: 'Satellite' }, STATION: { bn: 'স্টেশনের মাপ', en: 'Station' },
  MODEL: { bn: 'মডেলের হিসাব', en: 'Model estimate' }, RECORD: { bn: 'প্রকাশিত রেকর্ড', en: 'Published record' }, RULE: { bn: 'নিয়মে হিসাব', en: 'Rule-based' }, AI: { bn: 'AI', en: 'AI' },
  DEMO: { bn: 'নমুনা তথ্য', en: 'Demo data' }, PLACEHOLDER: { bn: 'অস্থায়ী তথ্য', en: 'Placeholder' },
};
const TAG_HELP = {
  REAL: { bn: 'আসল উৎস থেকে নেওয়া (নাসা বা আবহাওয়া সেবা)', en: 'From a real source (NASA or a weather service)' },
  SAT: { bn: 'উপগ্রহ সরাসরি মেপেছে (সেন্টিনেল, MODIS, GPM, GRACE, SRTM)', en: 'Measured from space by a satellite (Sentinel, MODIS, GPM, GRACE, SRTM)' },
  STATION: { bn: 'মাটিতে বসানো আবহাওয়া স্টেশনের মাপ (BMD)', en: 'Measured on the ground by a weather station (BMD)' },
  MODEL: { bn: 'মাপ থেকে মডেল দিয়ে আনুমানিক হিসাব (নাসা POWER, SoilGrids, CMIP6): সরাসরি মাপ নয়', en: 'Estimated by a model from measurements (NASA POWER, SoilGrids, CMIP6): not a direct measurement' },
  RECORD: { bn: 'সরকার বা FAO-র প্রকাশিত রেকর্ড (দাম, খরচ, ফলন, শুমারি)', en: 'Published by the government or FAO (prices, costs, yields, census)' },
  RULE: { bn: 'খোলা নিয়ম বা সূত্র দিয়ে হিসাব করা, যে কেউ যাচাই করতে পারে', en: 'Worked out with an open rule or formula anyone can check' },
  AI: { bn: 'মেশিন লার্নিং দিয়ে বের করা', en: 'Produced by machine learning' },
  DEMO: { bn: 'দেখানোর জন্য বানানো নমুনা, আসল কৃষকের তথ্য নয়', en: 'Made-up sample for the demo, not real farmers' },
  PLACEHOLDER: { bn: 'আসল নাসা তথ্য আসার আগ পর্যন্ত অস্থায়ী তথ্য', en: 'Temporary data until the real NASA data is loaded' },
};
// NASA POWER weather and SoilGrids soil are real data, but model estimates, not measurements: they wear the MODEL label.
export const climateTag = () => (clim.prov.status === 'REAL' ? 'MODEL' : 'PLACEHOLDER');
export const soilTag = () => (soilData.provenance.status === 'REAL' ? 'MODEL' : 'DEMO');
export function Tag({ t }) {
  const { L } = useStore();
  return <span className={`chip ${TAG_STYLE[t]}`} title={L(TAG_HELP[t])}>{L(TAG_LABEL[t])}</span>;
}
// What each label means, spelled out (the label's own tooltip does not show on a phone).
export function TagLegend({ kinds = ['SAT', 'STATION', 'MODEL', 'RECORD', 'RULE', 'AI', 'DEMO'], className = '' }) {
  const { L } = useStore();
  return (
    <dl className={`grid gap-x-4 gap-y-1.5 text-[13px] leading-5 sm:grid-cols-2 ${className}`}>
      {kinds.map((k) => <div key={k} className="flex items-start gap-2"><dt className="shrink-0"><Tag t={k} /></dt><dd className="text-ink/75">{L(TAG_HELP[k])}</dd></div>)}
    </dl>
  );
}
export function Tags({ list }) {
  // Climate and soil can both resolve to REAL; show each kind once.
  return <span className="inline-flex flex-wrap gap-1">{[...new Set(list)].map((t) => <Tag key={t} t={t} />)}</span>;
}

export function ScoreRing({ value, size = 48, color, track = '#e5ece1', textColor = '#13261b' }) {
  const { s } = useStore();
  const [drawn, setDrawn] = useState(false);
  useEffect(() => {
    const frame = requestAnimationFrame(() => setDrawn(true));
    return () => cancelAnimationFrame(frame);
  }, []);
  const r = (size - 6) / 2, c = 2 * Math.PI * r, v = Math.max(0, Math.min(100, value));
  const strokeColor = color ?? (v >= 80 ? '#2f6e2f' : v >= 60 ? '#b8761b' : '#a8552a');
  const txt = Math.round(v);
  const gradId = `score-grad-${size}-${txt}`;
  const gradStops = color
    ? null
    : v >= 80
      ? ['#43863a', '#245a28']
      : v >= 60
        ? ['#edc067', '#b8761b']
        : ['#e0753d', '#a8552a'];
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={`${s.lang === 'bn' ? 'স্কোর' : 'score'} ${txt}`} className="shrink-0 transition-transform duration-300 hover:scale-105 filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.06)]">
      {gradStops && (
        <defs>
          <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={gradStops[0]} />
            <stop offset="100%" stopColor={gradStops[1]} />
          </linearGradient>
        </defs>
      )}
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth="5" />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={gradStops ? `url(#${gradId})` : strokeColor} strokeWidth="5" strokeLinecap="round" strokeDasharray={`${(c * v) / 100} ${c}`} strokeDashoffset={drawn ? 0 : (c * v) / 100} transform={`rotate(-90 ${size / 2} ${size / 2})`} style={{ transition: 'stroke-dasharray .7s cubic-bezier(.22,1,.36,1), stroke-dashoffset .7s cubic-bezier(.22,1,.36,1)' }} />
      <text x="50%" y="54%" textAnchor="middle" dominantBaseline="middle" fontSize={size * 0.32} fontWeight="700" fill={textColor}>{s.lang === 'bn' ? bnDigits(txt) : txt}</text>
    </svg>
  );
}

export const MiniBar = ProgressBar;

// The three decisions. Words are what a farmer would say, not system labels.
export const LABEL_STYLE = {
  KEEP: { bg: 'bg-primary-700', text: 'text-primary-700', soft: 'bg-primary-50', bn: 'একই ফসল রাখুন', en: 'Keep your crop', short: { bn: 'রাখুন', en: 'Keep' } },
  ADJUST: { bg: 'bg-paddy-700', text: 'text-paddy-700', soft: 'bg-paddy-50', bn: 'ফসল রাখুন, সময় বদলান', en: 'Keep it, change the date', short: { bn: 'সময় বদলান', en: 'Adjust' } },
  SHIFT: { bg: 'bg-sky-700', text: 'text-sky-700', soft: 'bg-sky-50', bn: 'অন্য ফসলে যান', en: 'Shift to another crop', short: { bn: 'ফসল বদলান', en: 'Shift' } },
};
export const RISK_STYLE = {
  Low: { tone: 'green', cls: 'bg-primary-50 text-primary-800 ring-1 ring-primary-200', bn: 'কম', en: 'Low' },
  Medium: { tone: 'amber', cls: 'bg-amber-50 text-amber-800 ring-1 ring-amber-200', bn: 'মাঝারি', en: 'Medium' },
  High: { tone: 'red', cls: 'bg-red-50 text-red-700 ring-1 ring-red-200', bn: 'বেশি', en: 'High' },
};
export const WATER_STYLE = {
  GREEN: { grad: 'from-primary-600 to-primary-800', dot: 'bg-primary-500', tone: 'green', bn: 'সবুজ সংকেত', en: 'Green' },
  YELLOW: { grad: 'from-paddy-500 to-paddy-700', dot: 'bg-paddy-500', tone: 'amber', bn: 'হলুদ সংকেত', en: 'Yellow' },
  ORANGE: { grad: 'from-orange-500 to-orange-700', dot: 'bg-orange-500', tone: 'amber', bn: 'কমলা সংকেত', en: 'Orange' },
  RED: { grad: 'from-red-600 to-red-800', dot: 'bg-red-600', tone: 'red', bn: 'লাল সংকেত', en: 'Red' },
};

export function WhyButton({ payload, small, className = '', inverse = false }) {
  const { dispatch, T } = useStore();
  const look = inverse ? 'border-white/40 bg-white/15 text-white hover:bg-white/25' : 'border-primary-200 bg-primary-50 text-primary-800 hover:bg-primary-100';
  return (
    <button type="button" onClick={() => dispatch({ type: 'set', patch: { why: payload } })}
      className={`inline-flex items-center gap-1 rounded-full border font-semibold ${look} ${small ? 'px-2.5 py-0.5 text-[12.5px]' : 'px-3 py-1 text-[13.5px]'} ${className}`}>
      <HelpCircle size={small ? 13 : 15} />{T('কেন?', 'Why?')}
    </button>
  );
}

export function Note({ children, tone = 'info', className = '' }) {
  const map = {
    info: ['border-l-4 border-l-sky-500 border-sky-200/80 bg-gradient-to-r from-sky-50/90 via-sky-50/60 to-white/70 text-sky-950 shadow-2xs hover:shadow-xs', Info, 'text-sky-600'],
    gold: ['border-l-4 border-l-amber-500 border-amber-200/80 bg-gradient-to-r from-amber-50/90 via-amber-50/60 to-white/70 text-amber-950 shadow-2xs hover:shadow-xs', Info, 'text-amber-600'],
    warn: ['border-l-4 border-l-red-500 border-red-200/80 bg-gradient-to-r from-red-50/90 via-red-50/60 to-white/70 text-red-950 shadow-2xs hover:shadow-xs', AlertTriangle, 'text-red-600'],
    ok: ['border-l-4 border-l-emerald-600 border-primary-200/80 bg-gradient-to-r from-primary-50/90 via-primary-50/60 to-white/70 text-primary-950 shadow-2xs hover:shadow-xs', CheckCircle2, 'text-emerald-600'],
  };
  const [cls, Icon, iconCls] = map[tone] || map.info;
  return (
    <div className={`status-note flex gap-2.5 rounded-xl border px-3.5 py-2.5 text-[14px] leading-6 transition-all duration-200 hover:-translate-y-0.5 backdrop-blur-xs ${cls} ${className}`}>
      <Icon size={18} className={`mt-0.5 shrink-0 ${iconCls}`} />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

export function Input({ className = '', ...props }) {
  return (
    <input
      className={`h-11 w-full rounded-xl border border-border/90 bg-white/95 px-3.5 text-[15px] text-ink outline-none transition-all duration-200 placeholder:text-muted/60 hover:border-primary-300 focus:border-primary-500 focus:bg-white focus:ring-4 focus:ring-primary-500/12 shadow-2xs disabled:bg-black/[.03] disabled:text-muted ${className}`}
      {...props}
    />
  );
}

export function Textarea({ className = '', rows = 3, ...props }) {
  return (
    <textarea
      rows={rows}
      className={`w-full rounded-xl border border-border/90 bg-white/95 p-3.5 text-[15px] text-ink outline-none transition-all duration-200 placeholder:text-muted/60 hover:border-primary-300 focus:border-primary-500 focus:bg-white focus:ring-4 focus:ring-primary-500/12 shadow-2xs disabled:bg-black/[.03] disabled:text-muted ${className}`}
      {...props}
    />
  );
}

export function Select({ className = '', children, ...props }) {
  return (
    <select
      className={`h-11 w-full rounded-xl border border-border/90 bg-white/95 px-3.5 text-[15px] font-medium text-ink outline-none transition-all duration-200 hover:border-primary-300 focus:border-primary-500 focus:bg-white focus:ring-4 focus:ring-primary-500/12 shadow-2xs disabled:bg-black/[.03] disabled:text-muted cursor-pointer ${className}`}
      {...props}
    >
      {children}
    </select>
  );
}

// A segmented switch whose white "thumb" glides to the chosen option (and stretches to its width) on a spring.
export function Segmented({ value, onChange, options, className = '' }) {
  const box = useRef(null);
  const [thumb, setThumb] = useState(null);
  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return undefined;
    const measure = () => {
      const b = el.querySelector('[aria-selected="true"]');
      if (b) setThumb((p) => ({ x: b.offsetLeft, y: b.offsetTop, w: b.offsetWidth, h: b.offsetHeight, glide: !!p }));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [value, options.length]);
  return (
    <div ref={box} className={`relative inline-flex rounded-xl bg-black/[.05] p-1 shadow-inner ${className}`} role="tablist">
      {thumb && (
        <span aria-hidden="true" className="seg-thumb pointer-events-none absolute left-0 top-0 rounded-lg bg-white shadow-[0_2px_10px_-2px_rgba(13,38,20,0.22),0_1px_0_rgba(255,255,255,0.95)] ring-1 ring-black/5 will-change-[transform,width,height]"
          style={{ transform: `translate3d(${thumb.x}px, ${thumb.y}px, 0)`, width: thumb.w, height: thumb.h, transitionProperty: thumb.glide ? 'transform, width, height' : 'none' }} />
      )}
      {options.map((o) => (
        <button key={o.value} type="button" role="tab" aria-selected={value === o.value} onClick={() => onChange(o.value)}
          className={`relative flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-[14px] font-semibold transition-all duration-250 active:scale-[0.96] ${value === o.value ? 'text-primary-800' : 'text-muted hover:text-ink hover:bg-white/40'} ${thumb ? '' : value === o.value ? 'bg-white shadow-sm' : ''}`}>
          {o.icon && <o.icon size={16} className={`transition-transform duration-200 ${value === o.value ? 'scale-110' : ''}`} />}{o.label}
        </button>
      ))}
    </div>
  );
}

export function EmptyState({ icon: Icon, title, text, action }) {
  return (
    <div className="empty-state surface-card cv-auto grid place-items-center rounded-[24px] border border-dashed border-border/90 bg-gradient-to-b from-white to-primary-50/20 px-6 py-12 text-center shadow-2xs">
      {Icon && (
        <div className="empty-state-icon grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-primary-100 to-primary-50 text-primary-700 shadow-inner ring-1 ring-primary-200/50 transition-transform duration-300 hover:scale-105">
          <Icon size={26} />
        </div>
      )}
      <div className="font-display mt-4 text-[17px] font-bold text-ink">{title}</div>
      {text && <p className="mt-1.5 max-w-md text-[14px] leading-6 text-muted">{text}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function StepHeader({ kicker, title, sub, tags }) {
  return (
    <div className="mb-5">
      <div className="text-[14px] font-semibold text-primary-700">{kicker}</div>
      <h2 className="mt-0.5 text-[26px] font-bold text-ink">{title}</h2>
      {sub && <p className="mt-1.5 text-[15px] leading-7 text-muted">{sub}</p>}
      {tags && <div className="mt-2.5"><Tags list={tags} /></div>}
    </div>
  );
}

// ---- sources for the evidence panels ----
export function climateSource(lang) {
  const p = clim.prov;
  if (p.status !== 'REAL') {
    return lang === 'bn'
      ? 'অস্থায়ী আবহাওয়ার তথ্য — এটি নাসার তথ্য নয়। npm run fetch:power চালালে নাসা POWER-এর আসল তথ্য আসবে।'
      : 'Placeholder weather data — not NASA data. Run npm run fetch:power to load real NASA POWER data.';
  }
  return lang === 'bn' ? `${p.dataset} (সংস্করণ ${p.version}), ${p.lat}, ${p.lon}; ${p.start} থেকে ${p.end}; নামানো হয়েছে ${String(p.retrieved).slice(0, 10)}` : `${p.dataset} (v${p.version}), ${p.lat}, ${p.lon}; ${p.start} to ${p.end}; retrieved ${String(p.retrieved).slice(0, 10)}`;
}
export function soilSource(lang) {
  const p = soilData.provenance;
  return p.status === 'REAL' ? p.dataset : (lang === 'bn' ? 'নমুনা মান। আসল মান মৃত্তিকা সম্পদ উন্নয়ন ইনস্টিটিউটের (SRDI) উপজেলা নির্দেশিকা থেকে বসাতে হবে।' : 'Sample values. Replace them with figures from the SRDI upazila soil guide.');
}

// Under a message box: how many SMS parts it will take, counted the way phones do (Bangla = 70 per message).
export function SmsMeter({ text, className = '' }) {
  const { T, s } = useStore();
  const m = smsParts(text);
  const n = (v) => (s.lang === 'bn' ? bnDigits(String(v)) : v);
  const tone = m.parts <= 1 ? 'text-muted' : m.parts <= 3 ? 'text-paddy-700' : 'text-clay-700';
  return (
    <p className={`flex flex-wrap items-center gap-x-2 text-[12.5px] ${tone} ${className}`} aria-live="polite">
      <span className="font-semibold">{T(`এসএমএস: ${n(m.parts)} ভাগে যাবে`, `SMS: ${m.parts} part${m.parts === 1 ? '' : 's'}`)}</span>
      <span className="tabular">{n(m.units)}/{n(m.limit)}</span>
      <span>{m.unicode ? T('বাংলা বা বিশেষ অক্ষর থাকায় প্রতি ভাগে ৭০ অক্ষর (একাধিক ভাগে ৬৭)', 'Bangla or special characters: 70 characters per message (67 per part when split)') : T('ইংরেজি: প্রতি ভাগে ১৬০ অক্ষর', 'English: 160 characters per message')}</span>
    </p>
  );
}
