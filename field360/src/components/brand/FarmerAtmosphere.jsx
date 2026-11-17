import { memo, useEffect, useState } from 'react';
import { useStore } from '../../store';

/** Derive a calm ambient mood from live field weather. */
function climateMood(weather) {
  if (!weather || weather.unavailable) return 'calm';
  if ((weather.rainNext3 ?? 0) >= 8 || (weather.rain7 ?? 0) >= 25) return 'rain';
  if ((weather.tmax ?? 0) >= 34) return 'heat';
  return 'calm';
}

/** Derive Bangladesh diurnal lighting phase for subtle sky/aura shifts without jarring jumps. */
function diurnalPhase(hour) {
  if (hour >= 5 && hour < 8) return 'dawn';
  if (hour >= 8 && hour < 16) return 'day';
  if (hour >= 16 && hour < 19) return 'dusk';
  return 'night';
}

const AGRO_PARTICLES = [
  { x: '7%', y: '20%', s: 4.5, d: '0s', t: '14s' },
  { x: '15%', y: '62%', s: 3.5, d: '-3s', t: '17s' },
  { x: '23%', y: '38%', s: 5, d: '-7s', t: '15s' },
  { x: '34%', y: '78%', s: 3.5, d: '-1.5s', t: '19s' },
  { x: '44%', y: '18%', s: 4, d: '-9s', t: '16s' },
  { x: '53%', y: '54%', s: 4.5, d: '-4.5s', t: '18s' },
  { x: '62%', y: '32%', s: 3.5, d: '-11s', t: '14.5s' },
  { x: '71%', y: '70%', s: 5, d: '-2.5s', t: '16.5s' },
  { x: '80%', y: '24%', s: 4, d: '-8s', t: '15.5s' },
  { x: '89%', y: '58%', s: 3.5, d: '-5.5s', t: '17.5s' },
  { x: '29%', y: '14%', s: 3, d: '-6.5s', t: '20s' },
  { x: '75%', y: '86%', s: 4, d: '-10s', t: '18.5s' },
];

/**
 * FarmerAtmosphere — Agro-climatic atmospheric backdrop for the FieldShift 360 farmer portal.
 * Blends smooth diurnal & weather-adaptive gradients (Aman emerald, sunrise mustard, river mist, Barind clay)
 * with tactile agrarian topography, precision satellite field grid lines, and subtle GPU-composited particles
 * on a strict-containment layer so foreground Liquid Glass never re-blurs unnecessarily.
 */
function FarmerAtmosphere({ hourOverride = null }) {
  const { weather } = useStore();
  const climate = climateMood(weather);
  const [hidden, setHidden] = useState(() => (typeof document !== 'undefined' ? document.visibilityState === 'hidden' : false));
  const [hour, setHour] = useState(() => (hourOverride ?? new Date().getHours()));

  useEffect(() => {
    if (hourOverride != null) { setHour(hourOverride); return undefined; }
    const timer = setInterval(() => setHour(new Date().getHours()), 300000);
    return () => clearInterval(timer);
  }, [hourOverride]);

  useEffect(() => {
    if (typeof document === 'undefined') return undefined;
    const onVis = () => {
      setHidden(document.visibilityState === 'hidden');
      if (document.visibilityState === 'visible' && hourOverride == null) {
        setHour(new Date().getHours());
      }
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [hourOverride]);

  const diurnal = diurnalPhase(hour);

  return (
    <div
      data-climate={climate}
      data-diurnal={diurnal}
      data-hidden={hidden ? 'true' : 'false'}
      className="farmer-atmosphere pointer-events-none fixed inset-0 -z-10 select-none overflow-hidden"
      aria-hidden="true"
    >
      {/* Dynamic agro-climatic & diurnal gradient aura orbs */}
      <div className="farmer-aura-orb farmer-aura-emerald" />
      <div className="farmer-aura-orb farmer-aura-gold" />
      <div className="farmer-aura-orb farmer-aura-river" />
      <div className="farmer-aura-orb farmer-aura-silt" />
      <div className="farmer-aura-orb farmer-aura-canopy" />

      {/* Subtle drifting agro-climatic particles (pollen/dew, rain droplets/mist, heat shimmer wisps) */}
      <div className="farmer-particles absolute inset-0">
        {AGRO_PARTICLES.map((p, idx) => (
          <span
            key={idx}
            className="farmer-particle"
            style={{
              '--px': p.x,
              '--py': p.y,
              '--ps': `${p.s}px`,
              '--pd': p.d,
              '--pt': p.t,
            }}
          />
        ))}
        {climate === 'rain' && (
          <>
            <span className="farmer-mist-wisp farmer-mist-wisp-a" />
            <span className="farmer-mist-wisp farmer-mist-wisp-b" />
          </>
        )}
      </div>

      {/* Tactile agrarian topography & precision field surveying grid */}
      <svg
        className="farmer-topo-grid absolute inset-0 h-full w-full"
        xmlns="http://www.w3.org/2000/svg"
        width="100%"
        height="100%"
      >
        <defs>
          {/* 40px cadastral survey micro-grid with center geo-dot */}
          <pattern id="farmer-field-grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#245a28" strokeWidth="0.65" strokeOpacity="0.04" />
            <circle cx="20" cy="20" r="0.85" fill="#245a28" fillOpacity="0.065" />
          </pattern>

          {/* Organic topographic contour waves reminiscent of river delta terraces */}
          <pattern id="farmer-field-contours" width="280" height="200" patternUnits="userSpaceOnUse">
            <path
              d="M 0 35 C 70 15, 140 55, 210 35 S 280 15, 350 35"
              fill="none"
              stroke="#245a28"
              strokeWidth="0.9"
              strokeDasharray="4 6"
              strokeOpacity="0.045"
            />
            <path
              d="M 0 95 C 60 115, 150 75, 220 95 S 280 115, 350 95"
              fill="none"
              stroke="#245a28"
              strokeWidth="0.9"
              strokeOpacity="0.035"
            />
            <path
              d="M 0 155 C 80 140, 160 170, 240 155 S 300 140, 360 155"
              fill="none"
              stroke="#245a28"
              strokeWidth="0.8"
              strokeDasharray="3 5"
              strokeOpacity="0.03"
            />
          </pattern>
        </defs>

        <rect width="100%" height="100%" fill="url(#farmer-field-grid)" />
        <rect width="100%" height="100%" fill="url(#farmer-field-contours)" />
      </svg>

      {/* Atmospheric perimeter vignette for depth & soft focus */}
      <div className="farmer-atmosphere-vignette absolute inset-0" />
    </div>
  );
}

export default memo(FarmerAtmosphere);
