// Long-term trends on an interactive NASA Earth Observation telemetry map:
// GRACE/GRACE-FO terrestrial water storage, MODIS NDVI Rabi greenness, SMAP L4 root-zone soil water,
// across 7 Bangladesh division upazilas and 5 neighbouring-country agricultural basins.
// Pure data from engine/trends.js and water_sat.json with verifiable NASA GIBS provenance.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import leaflet from 'leaflet';
import { ImageOverlay, Marker, Tooltip, useMap } from 'react-leaflet';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Repeat,
  Volume2,
  VolumeX,
  Satellite,
  Droplets,
  Leaf,
  Activity,
  Sparkles,
  Compass,
  Info,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Layers,
  ShieldCheck,
  MapPin,
  Eye,
  Filter,
  ArrowUpDown,
  X,
} from 'lucide-react';
import { useStore } from '../../store';
import { Tags, Badge } from '../ui';
import MapView from './MapView';
import { TREND_LAYERS, trendLayer, trendColor } from '../../engine/trends';
import { UPAZILAS } from '../../data/upazilas';
import { num, bnDigits } from '../../engine/dates';
import ws from '../../data/water/water_sat.json';

const ABROAD = {
  india: { bn: 'পাঞ্জাব, ভারত', en: 'Punjab, India', region: { bn: 'উত্তর ভারত সেচ অববাহিকা', en: 'North India Irrigated Basin' }, flag: '🇮🇳' },
  pakistan: { bn: 'সিন্ধু, পাকিস্তান', en: 'Sindh, Pakistan', region: { bn: 'সিন্ধু নিম্ন অববাহিকা', en: 'Lower Indus Basin' }, flag: '🇵🇰' },
  nepal: { bn: 'কৈলালী, নেপাল', en: 'Kailali, Nepal', region: { bn: 'তরাই সমভূমি এলাকা', en: 'Terai Lowland Basin' }, flag: '🇳🇵' },
  bhutan: { bn: 'পুনাখা, ভুটান', en: 'Punakha, Bhutan', region: { bn: 'হিমালয় পর্বত উপত্যকা', en: 'Himalayan Mountain Valley' }, flag: '🇧🇹' },
  myanmar: { bn: 'নিয়াং-উ, মিয়ানমার', en: 'Nyaung-U, Myanmar', region: { bn: 'মধ্য মিয়ানমার শুষ্ক বলয়', en: 'Central Dry Zone' }, flag: '🇲🇲' },
};

const BD_REGIONS = {
  godagari: { div: { bn: 'রাজশাহী · বরেন্দ্র ভূমি', en: 'Rajshahi · Barind Tract' }, flag: '🇧🇩' },
  dhamrai: { div: { bn: 'ঢাকা · কেন্দ্রীয় প্লাবনভূমি', en: 'Dhaka · Central Floodplain' }, flag: '🇧🇩' },
  sitakunda: { div: { bn: 'চট্টগ্রাম · উপকূলীয় পাহাড়', en: 'Chattogram · Coastal Hills' }, flag: '🇧🇩' },
  dacope: { div: { bn: 'খুলনা · সুন্দরবন উপকূলীয় লবণাক্ত', en: 'Khulna · Coastal Saline' }, flag: '🇧🇩' },
  bakerganj: { div: { bn: 'বরিশাল · জোয়ার-ভাটা প্লাবনভূমি', en: 'Barishal · Tidal Floodplain' }, flag: '🇧🇩' },
  gangachara: { div: { bn: 'রংপুর · তিস্তা নদী অববাহিকা', en: 'Rangpur · Teesta River Basin' }, flag: '🇧🇩' },
  gowainghat: { div: { bn: 'সিলেট · মেঘালয় পাদদেশ ও হাওর', en: 'Sylhet · Foothill Haor' }, flag: '🇧🇩' },
};

const PLACES = ['godagari', 'dhamrai', 'sitakunda', 'dacope', 'bakerganj', 'gangachara', 'gowainghat', ...Object.keys(ABROAD)];
const at = (id) => UPAZILAS[id]?.center ?? ws.points[id]?.at;
const ALL_BOUNDS = [[19.2, 66.5], [31.8, 97.5]];

const SENSOR_SPECS = {
  grace: {
    icon: Droplets,
    name: { bn: 'নাসা GRACE / GRACE-FO টুইন উপগ্রহ', en: 'NASA GRACE / GRACE-FO Twin Satellites' },
    orbit: { bn: 'কক্ষপথ ~৪৯০ কিমি (LEO)', en: 'Orbit ~490 km (LEO)' },
    sensor: { bn: 'K-ব্যান্ড মাইক্রোওয়েভ রেঞ্জিং ও LRI', en: 'K-Band Microwave & LRI' },
    resolution: { bn: '৩০০ কিমি মাসকন গ্রিড (JPL RL06.1)', en: '300 km Mascon (JPL RL06.1)' },
    target: { bn: 'মাটির ওপরে-নিচে জমা মোট পানি বিচ্যুতি', en: 'Total Terrestrial Water Storage (TWS)' },
    badge: { bn: 'ভূগর্ভস্থ ও ভূপৃষ্ঠীয় পানি', en: 'Ground & Surface Water' },
  },
  green: {
    icon: Leaf,
    name: { bn: 'নাসা Terra & Aqua MODIS (NDVI)', en: 'NASA Terra & Aqua MODIS (NDVI)' },
    orbit: { bn: 'কক্ষপথ ৭০৫ কিমি (সান-সিনক্রোনাস)', en: 'Orbit 705 km (Sun-Synchronous)' },
    sensor: { bn: '৩৬-ব্যান্ড ইমেজিং স্পেকট্রোরেডিওমিটার', en: '36-Band Imaging Spectroradiometer' },
    resolution: { bn: '২৫০ মিটার ভূমি পিক্সেল রেজোলিউশন', en: '250 m Pixel Resolution' },
    target: { bn: 'রবি শীতকালীন ফসলের সবুজত্ব ও উদ্ভিদ চাপ সূচক', en: 'Rabi Winter Vegetation Stress Index' },
    badge: { bn: 'ফসলের সবুজত্ব ও চাপ', en: 'Vegetation & Stress' },
  },
  smap: {
    icon: Activity,
    name: { bn: 'নাসা SMAP Level 4 (Soil Moisture)', en: 'NASA SMAP Level 4 (Soil Moisture)' },
    orbit: { bn: 'কক্ষপথ ৬৮৫ কিমি পোলার অরবিট', en: 'Orbit 685 km Polar Orbit' },
    sensor: { bn: 'L-ব্যান্ড ১.৪১ GHz রেডিওমিটার + ক্যাচমেন্ট মডেল', en: 'L-Band 1.41 GHz Radiometer + LSM' },
    resolution: { bn: '৯ কিমি সারফেস মডেল গ্রিড', en: '9 km Assimilated Model Grid' },
    target: { bn: '০–১০০ সেমি মূলমণ্ডল বা শিকড় মাটির আর্দ্রতা', en: '0–100 cm Root-Zone Soil Moisture' },
    badge: { bn: 'শিকড় স্তরের মাটির পানি', en: 'Root-Zone Moisture' },
  },
};

const CLIMATE_MILESTONES = {
  2004: { bn: 'ভয়াবহ বন্যা বছর ও সুনামি পর্ব', en: 'Severe flood year & ocean event' },
  2007: { bn: 'ঘূর্ণিঝড় সিডর ও মারাত্মক বন্যা', en: 'Cyclone Sidr & heavy floods' },
  2009: { bn: 'ঘূর্ণিঝড় আইলা ও লবণাক্ততা বৃদ্ধি', en: 'Cyclone Aila & coastal salinity' },
  2010: { bn: 'তীব্র লা নিনা (La Niña) সক্রিয় বর্ষা', en: 'Strong La Niña active monsoon' },
  2014: { bn: 'বিলম্বিত বর্ষা ও খরা প্রবণতা', en: 'Delayed monsoon & dry spell' },
  2015: { bn: 'শক্তিশালী এল নিনো (El Niño) খরা চক্র', en: 'Strong El Niño drought cycle' },
  2016: { bn: 'রেকর্ড বৈশ্বিক উষ্ণতা ও তাপপ্রবাহ', en: 'Record global heat & heatwave' },
  2017: { bn: 'হাওর এলাকায় অকাল পাহাড়ি ঢল', en: 'Pre-monsoon flash floods in haor' },
  2019: { bn: 'ঘূর্ণিঝড় ফণী ও মৌসুমী বৃষ্টি', en: 'Cyclone Fani & active monsoon' },
  2020: { bn: 'ঘূর্ণিঝড় আম্পান ও শতাব্দী দীর্ঘ বন্যা', en: 'Cyclone Amphan & prolonged floods' },
  2021: { bn: 'উত্তরবঙ্গে তীব্র ভূগর্ভস্থ পানি ঘাটতি', en: 'Severe northern groundwater drop' },
  2022: { bn: 'সিলেটে শতবর্ষের নজিরবিহীন বন্যা', en: 'Historic 100-year Sylhet flood' },
  2023: { bn: 'তীব্র গ্রীষ্মমণ্ডলীয় তাপপ্রবাহ', en: 'Intense South Asian heatwave' },
  2024: { bn: 'ঘূর্ণিঝড় রিমাল ও পূর্বাঞ্চলীয় বন্যা', en: 'Cyclone Remal & eastern floods' },
};

function playTelemetryChime(meanVal = 0, isMuted = false) {
  if (isMuted) return;
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    if (ctx.state === 'suspended') ctx.resume();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    const baseFreq = 480 + Math.max(-140, Math.min(220, (meanVal || 0) * 8));
    osc.frequency.setValueAtTime(baseFreq, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.08, ctx.currentTime + 0.05);
    gain.gain.setValueAtTime(0.035, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.075);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.08);
  } catch {
    // Non-blocking fallback
  }
}

// Inner Leaflet component for flying to selected region
function MapFlyController({ targetCoords, resetKey, allBounds }) {
  const map = useMap();
  useEffect(() => {
    if (targetCoords) {
      map.flyTo(targetCoords, 7.5, { duration: 1.1 });
    }
  }, [targetCoords, map]);

  useEffect(() => {
    if (resetKey > 0) {
      map.fitBounds(allBounds, { padding: [28, 28], duration: 1.0 });
    }
  }, [resetKey, allBounds, map]);

  return null;
}

export default function TrendMap() {
  const { T, L, s } = useStore();
  const [kind, setKind] = useState('grace');
  const layer = TREND_LAYERS[kind];
  const specs = SENSOR_SPECS[kind];
  const data = useMemo(() => trendLayer(kind, ws, PLACES), [kind]);

  const [i, setI] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1); // 0.5, 1, 2
  const [loop, setLoop] = useState(true);
  const [muted, setMuted] = useState(true);

  const [selectedId, setSelectedId] = useState(null);
  const [hoveredId, setHoveredId] = useState(null);
  const [filterMode, setFilterMode] = useState('all'); // 'all', 'bd', 'abroad'
  const [sortMode, setSortMode] = useState('deficit'); // 'deficit', 'surplus', 'name'
  const [resetKey, setResetKey] = useState(0);
  const [showMethodology, setShowMethodology] = useState(false);

  // The real satellite field under the points, one picture per year (scripts/fetch/trend-fields.mjs)
  const [fieldMeta, setFieldMeta] = useState(null);
  const [showField, setShowField] = useState(true);
  const [fieldOpacity, setFieldOpacity] = useState(0.85);
  useEffect(() => {
    let live = true;
    fetch(`${'/field360/'}trends/meta.json`)
      .then((r) => (r.ok ? r.json() : null))
      .then((m) => { if (live) setFieldMeta(m); })
      .catch(() => {});
    return () => { live = false; };
  }, []);

  // The first time the map scrolls into view, play the record through once from the first year, so the change
  // unfolds by itself (not for people who ask for reduced motion)
  const rootRef = useRef(null);
  const autoRunRef = useRef(false);
  useEffect(() => {
    const el = rootRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return undefined;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return undefined;
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      io.disconnect();
      autoRunRef.current = true;
      setI(0);
      setPlaying(true);
    }, { threshold: 0.45 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Reset playhead when layer changes
  useEffect(() => {
    setI(data.years.length - 1);
    setPlaying(false);
    setSelectedId(null);
  }, [data]);

  // Animation playback loop
  useEffect(() => {
    if (!playing) return undefined;
    const intervalMs = Math.round(900 / speed);
    const timer = setInterval(() => {
      setI((prev) => {
        if (prev >= data.years.length - 1) {
          if (loop && !autoRunRef.current) return 0;
          autoRunRef.current = false;
          setPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, intervalMs);
    return () => clearInterval(timer);
  }, [playing, data.years.length, speed, loop]);

  const year = data.years[i] ?? 2024;
  const prevYear = i > 0 ? data.years[i - 1] : null;

  const name = useCallback((id) => (UPAZILAS[id] ? L(UPAZILAS[id].name) : L(ABROAD[id])), [L]);
  const subName = useCallback((id) => (UPAZILAS[id] ? L(BD_REGIONS[id]?.div) : L(ABROAD[id]?.region)), [L]);
  const flag = useCallback((id) => (UPAZILAS[id] ? BD_REGIONS[id]?.flag : ABROAD[id]?.flag), []);

  const val = useCallback((id, y = year) => data.values[id]?.[y], [data.values, year]);
  const fmt = useCallback(
    (v) => (v == null ? '–' : `${v > 0 ? '+' : v < 0 ? '−' : ''}${num(Math.abs(v), s.lang, { dp: kind === 'green' ? 2 : 1 })}`),
    [kind, s.lang]
  );

  // Sound ping on year transition
  const lastYearRef = useRef(year);
  useEffect(() => {
    if (lastYearRef.current !== year) {
      lastYearRef.current = year;
      const validVals = PLACES.map((id) => val(id)).filter((v) => v != null);
      const avg = validVals.length ? validVals.reduce((a, b) => a + b, 0) / validVals.length : 0;
      playTelemetryChime(avg, muted);
    }
  }, [year, val, muted]);

  // Aggregate stats for current year
  const yearStats = useMemo(() => {
    const list = PLACES.map((id) => ({ id, v: val(id) })).filter((x) => x.v != null);
    if (!list.length) return { avg: 0, min: null, max: null, spread: 0 };
    list.sort((a, b) => a.v - b.v);
    const avg = list.reduce((acc, x) => acc + x.v, 0) / list.length;
    const min = list[0];
    const max = list[list.length - 1];
    return { avg, min, max, spread: max.v - min.v };
  }, [val]);

  // Multi-year sparkline waveform for scrubber background
  const timelineWaveform = useMemo(() => {
    if (!data.years.length) return null;
    const points = data.years.map((y, idx) => {
      const vals = PLACES.map((id) => data.values[id]?.[y]).filter((v) => v != null);
      const avg = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
      return { year: y, avg, idx };
    });
    const maxSpan = layer.span;
    // Map avg to SVG viewBox 0..100 horizontal, 0..36 vertical (baseline at 18)
    const h = 34;
    const midY = h / 2;
    const n = points.length - 1 || 1;
    const coords = points.map((p) => {
      const x = (p.idx / n) * 100;
      const normalized = Math.max(-1, Math.min(1, p.avg / maxSpan));
      const y = midY - normalized * (midY - 3);
      return { x, y, avg: p.avg };
    });

    const dLine = coords.reduce((acc, pt, idx) => `${acc} ${idx === 0 ? 'M' : 'L'} ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`, '');
    const dArea = `${dLine} L 100 ${midY} L 0 ${midY} Z`;

    return { coords, dLine, dArea, midY, points };
  }, [data.years, data.values, layer.span]);

  // Filtered & sorted places for the leaderboard
  const displayPlaces = useMemo(() => {
    let list = [...PLACES];
    if (filterMode === 'bd') list = list.filter((id) => !!UPAZILAS[id]);
    else if (filterMode === 'abroad') list = list.filter((id) => !UPAZILAS[id]);

    return list.sort((a, b) => {
      const va = val(a);
      const vb = val(b);
      if (sortMode === 'deficit') {
        if (va == null) return 1;
        if (vb == null) return -1;
        return va - vb; // Most negative first
      }
      if (sortMode === 'surplus') {
        if (va == null) return 1;
        if (vb == null) return -1;
        return vb - va; // Most positive first
      }
      // Alphabetical
      return name(a).localeCompare(name(b));
    });
  }, [filterMode, sortMode, val, name]);

  // Selected place historical trajectory (for inspection HUD)
  const selectedTrajectory = useMemo(() => {
    if (!selectedId) return null;
    const hist = data.years.map((y) => ({ year: y, v: data.values[selectedId]?.[y] })).filter((x) => x.v != null);
    if (!hist.length) return null;
    const min = Math.min(...hist.map((x) => x.v));
    const max = Math.max(...hist.map((x) => x.v));
    const range = max - min || 1;
    const width = 160;
    const height = 44;
    const pts = hist.map((pt, idx) => {
      const x = (idx / (hist.length - 1 || 1)) * width;
      const y = height - 4 - ((pt.v - min) / range) * (height - 12);
      return { x, y, ...pt };
    });
    const pathD = pts.reduce((acc, p, idx) => `${acc} ${idx === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`, '');
    const currentPoint = pts.find((p) => p.year === year);
    return { pts, pathD, min, max, currentPoint, width, height };
  }, [selectedId, data.years, data.values, year]);

  // Target coordinates for camera flight
  const selectedCoords = useMemo(() => {
    if (!selectedId) return null;
    return at(selectedId);
  }, [selectedId]);

  // Milestone for active year
  const activeMilestone = CLIMATE_MILESTONES[year];

  // Field pictures for this layer: the chosen year, and the one before it underneath so a new year fades in over it
  const fieldYears = fieldMeta?.layers?.[kind]?.years ?? [];
  const fieldUrl = (y) => `${'/field360/'}trends/${kind}/${y}.png`;
  const hasField = fieldYears.includes(year);
  const fieldBelow = prevYear != null && fieldYears.includes(prevYear) ? prevYear : null;
  // Fetch the next few years ahead of the playhead, so playback never waits and a phone does not load them all
  useEffect(() => {
    for (const y of data.years.slice(i, i + 4)) if (fieldYears.includes(y)) { const im = new Image(); im.src = fieldUrl(y); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind, fieldMeta, i]);
  const FIELD_NOTE = {
    grace: { bn: 'JPL ম্যাসকন, প্রায় ৩° (৩০০ কিমি) খোপ', en: 'JPL mascons, ~3° (300 km) blocks' },
    smap: { bn: '৯ কিমি ঘর, ০.১°-এ পড়া', en: '9 km cells, read at 0.1°' },
    green: { bn: '০.০৫° (প্রায় ৫ কিমি), প্রতিটি পিক্সেল নিজের ধারার তুলনায়', en: '0.05° (~5 km), each pixel against its own trend' },
  }[kind];

  // Custom Leaflet divIcons
  const markerIcons = useMemo(() => {
    const icons = {};
    PLACES.forEach((id) => {
      const coords = at(id);
      if (!coords) return;
      const v = val(id);
      const isSelected = selectedId === id;
      const isHovered = hoveredId === id;
      const isSevereDeficit = v != null && v < -layer.span * 0.4;
      const isSevereSurplus = v != null && v > layer.span * 0.4;
      const color = trendColor(v, layer.span);

      let pulseClass = '';
      if (isSevereDeficit) pulseClass = 'nasa-beacon-pulse-warn';
      else if (isSevereSurplus) pulseClass = 'nasa-beacon-pulse-surplus';
      else if (isSelected) pulseClass = 'nasa-beacon-pulse-warn';

      const fastPulse = isSevereDeficit || isSelected ? 'nasa-beacon-pulse-fast' : '';
      const selectedClass = isSelected ? 'is-selected' : '';

      icons[id] = leaflet.divIcon({
        className: `nasa-beacon-wrap ${selectedClass}`,
        html: `
          <div class="nasa-beacon-halo ${pulseClass} ${fastPulse}" style="background-color: ${color}"></div>
          ${isSelected ? `<div class="nasa-beacon-target"></div>` : ''}
          <div class="nasa-beacon-core" style="background-color: ${color}; color: ${color};"></div>
          <div class="nasa-beacon-badge">${name(id)}: ${fmt(v)} ${L(layer.unit)}</div>
        `,
        iconSize: [44, 44],
        iconAnchor: [22, 22],
      });
    });
    return icons;
  }, [val, selectedId, hoveredId, layer.span, layer.unit, name, fmt, L]);

  return (
    <div ref={rootRef} className="nasa-telemetry-root relative rounded-[26px] border border-border/80 bg-gradient-to-b from-white via-primary-50/25 to-white/95 p-3.5 sm:p-5 shadow-[0_12px_36px_-12px_rgba(19,38,27,0.12)]">
      {/* 1. Header & NASA Mission Telemetry HUD */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/70 pb-3.5">
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-950 px-3 py-1 text-[11.5px] font-bold tracking-wider text-emerald-400 shadow-sm uppercase">
            <Satellite size={13} className="text-emerald-400 animate-pulse" />
            NASA EARTH OBSERVATION · 2001–2024
          </span>
          <Tags list={[layer.kind, 'REAL', 'NASA GIBS']} />
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setResetKey((k) => k + 1)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-border/80 bg-white px-3 py-1.5 text-[12.5px] font-semibold text-ink shadow-2xs hover:bg-primary-50 transition-colors"
            title={T('সম্পূর্ণ দক্ষিণ এশিয়া অঞ্চলের মানচিত্র দেখুন', 'Fit full South Asia regional view')}
          >
            <RefreshCw size={13} className="text-primary-700" />
            {T('পুরো অঞ্চল রিসেট', 'Reset View')}
          </button>
          <button
            type="button"
            onClick={() => setShowMethodology((m) => !m)}
            aria-expanded={showMethodology}
            className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-[12.5px] font-semibold transition-all ${
              showMethodology ? 'border-primary-600 bg-primary-700 text-white shadow-sm' : 'border-border/80 bg-white text-ink hover:bg-primary-50'
            }`}
          >
            <Info size={13} />
            {T('বিজ্ঞান ও পদ্ধতি', 'Science & Method')}
          </button>
        </div>
      </div>

      {/* 2. Sensor Selector Tabs */}
      <div className="mt-3.5 flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex flex-wrap items-center gap-1.5 rounded-2xl bg-black/[0.04] p-1.5 shadow-inner">
          {Object.entries(TREND_LAYERS).map(([k, x]) => {
            const isAct = kind === k;
            const Icon = SENSOR_SPECS[k]?.icon || Satellite;
            return (
              <button
                key={k}
                type="button"
                onClick={() => setKind(k)}
                className={`relative flex items-center gap-2 rounded-xl px-3.5 py-2 text-[13.5px] font-bold transition-all duration-200 active:scale-95 ${
                  isAct
                    ? 'bg-white text-primary-900 shadow-[0_4px_14px_-2px_rgba(13,38,20,0.18)] ring-1 ring-black/5'
                    : 'text-muted hover:text-ink hover:bg-white/50'
                }`}
              >
                <Icon size={16} className={isAct ? 'text-primary-700' : 'text-muted'} />
                <span>{x.src}</span>
                <span className={`hidden sm:inline-block text-[11px] font-normal px-2 py-0.5 rounded-full ${isAct ? 'bg-primary-100 text-primary-800' : 'bg-black/5 text-muted'}`}>
                  {L(SENSOR_SPECS[k]?.badge)}
                </span>
              </button>
            );
          })}
        </div>

        {/* Live Active Sensor Indicator */}
        <div className="flex items-center gap-2 text-[12.5px]">
          <span className="text-muted font-medium">{T('সক্রিয় সেন্সর:', 'Active Sensor:')}</span>
          <span className="font-bold text-ink">{L(specs.name)}</span>
        </div>
      </div>

      {/* 3. Sensor Telemetry Specs Strip */}
      <div className="mt-2.5 grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11.5px] bg-white/70 backdrop-blur-xs rounded-xl p-2.5 border border-border/60">
        <div className="flex items-center gap-1.5 min-w-0">
          <Satellite size={13} className="text-primary-700 shrink-0" />
          <span className="text-muted truncate">{T('কক্ষপথ:', 'Orbit:')}</span>
          <span className="font-semibold text-ink truncate">{L(specs.orbit)}</span>
        </div>
        <div className="flex items-center gap-1.5 min-w-0">
          <Activity size={13} className="text-primary-700 shrink-0" />
          <span className="text-muted truncate">{T('সেন্সর:', 'Sensor:')}</span>
          <span className="font-semibold text-ink truncate">{L(specs.sensor)}</span>
        </div>
        <div className="flex items-center gap-1.5 min-w-0">
          <Compass size={13} className="text-primary-700 shrink-0" />
          <span className="text-muted truncate">{T('রেজোলিউশন:', 'Res:')}</span>
          <span className="font-semibold text-ink truncate">{L(specs.resolution)}</span>
        </div>
        <div className="flex items-center gap-1.5 min-w-0">
          <Sparkles size={13} className="text-primary-700 shrink-0" />
          <span className="text-muted truncate">{T('লক্ষ্য:', 'Target:')}</span>
          <span className="font-semibold text-ink truncate">{L(specs.target)}</span>
        </div>
      </div>

      {/* 4. Real-time Regional Telemetry KPI Cards for Active Year */}
      <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-2.5">
        <div className="rounded-2xl border border-border/70 bg-white/90 p-2.5 shadow-2xs">
          <p className="text-[11px] font-semibold text-muted flex items-center justify-between">
            <span>{T('আঞ্চলিক গড় বিচ্যুতি', 'Regional Net Anomaly')}</span>
            <span className="tabular text-primary-700 font-bold">{T(bnDigits(year), year)}</span>
          </p>
          <p className="mt-1 flex items-baseline gap-1 text-[17px] sm:text-[19px] font-extrabold tabular">
            <span style={{ color: trendColor(yearStats.avg, layer.span) }}>
              {fmt(yearStats.avg)}
            </span>
            <span className="text-[11.5px] font-normal text-muted">{L(layer.unit)}</span>
          </p>
          <p className="text-[10.5px] text-muted truncate">
            {yearStats.avg < -1
              ? T('আঞ্চলিক পানি হ্রাস / চাপ', 'Net regional drying')
              : yearStats.avg > 1
              ? T('আঞ্চলিক পানি সমৃদ্ধি', 'Net regional surplus')
              : T('স্বাভাবিক স্তরের কাছাকাছি', 'Near historical normal')}
          </p>
        </div>

        <div className="rounded-2xl border border-amber-200/80 bg-amber-50/40 p-2.5 shadow-2xs">
          <p className="text-[11px] font-semibold text-amber-900 flex items-center justify-between">
            <span className="flex items-center gap-1">
              <TrendingDown size={12} className="text-red-600" />
              {T('তীব্র সংকট এলাকা', 'Critical Deficit Hotspot')}
            </span>
          </p>
          <p className="mt-1 text-[15px] sm:text-[16px] font-extrabold text-ink truncate">
            {yearStats.min ? name(yearStats.min.id) : '–'}
          </p>
          <p className="text-[11px] font-bold text-red-700 tabular">
            {yearStats.min ? `${fmt(yearStats.min.v)} ${L(layer.unit)}` : '–'}
          </p>
        </div>

        <div className="rounded-2xl border border-sky-200/80 bg-sky-50/40 p-2.5 shadow-2xs">
          <p className="text-[11px] font-semibold text-sky-900 flex items-center justify-between">
            <span className="flex items-center gap-1">
              <TrendingUp size={12} className="text-emerald-600" />
              {T('সর্বোচ্চ সমৃদ্ধ এলাকা', 'Top Surplus Area')}
            </span>
          </p>
          <p className="mt-1 text-[15px] sm:text-[16px] font-extrabold text-ink truncate">
            {yearStats.max ? name(yearStats.max.id) : '–'}
          </p>
          <p className="text-[11px] font-bold text-emerald-700 tabular">
            {yearStats.max ? `${fmt(yearStats.max.v)} ${L(layer.unit)}` : '–'}
          </p>
        </div>

        <div className="rounded-2xl border border-border/70 bg-white/90 p-2.5 shadow-2xs">
          <p className="text-[11px] font-semibold text-muted flex items-center justify-between">
            <span>{T('আঞ্চলিক ব্যবধান', 'Regional Spread')}</span>
            <Activity size={12} className="text-primary-700" />
          </p>
          <p className="mt-1 flex items-baseline gap-1 text-[17px] sm:text-[19px] font-extrabold tabular text-ink">
            <span>{num(yearStats.spread, s.lang, { dp: 1 })}</span>
            <span className="text-[11.5px] font-normal text-muted">{L(layer.unit)}</span>
          </p>
          <p className="text-[10.5px] text-muted truncate">
            {T('সর্বোচ্চ ও সর্বনিম্ন স্থানের পার্থক্য', 'Max to min anomaly gap')}
          </p>
        </div>
      </div>

      {/* 5. Methodology Drawer (Collapsible) */}
      {showMethodology && (
        <div className="mt-3 rounded-2xl border border-primary-200 bg-white p-4 shadow-sm animate-fadeIn">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h4 className="text-[15px] font-bold text-primary-950 flex items-center gap-1.5">
                <ShieldCheck size={18} className="text-primary-700" />
                {L(specs.name)} · {T('বৈজ্ঞানিক ভিত্তি ও ডেটা পেডিগ্রি', 'Scientific Foundation & Data Pedigree')}
              </h4>
              <p className="mt-1 text-[13px] leading-relaxed text-ink/85">{L(layer.note)}</p>
              <div className="mt-2.5 flex flex-wrap gap-2 text-[12px]">
                <span className="rounded-lg bg-primary-50 px-2.5 py-1 text-primary-800 font-medium">
                  {T('বেঞ্চমার্ক রেফারেন্স: ', 'Benchmark Baseline: ')}
                  {kind === 'grace' ? '2004–2009 mean' : kind === 'green' ? '2001–2010 mean' : '2015–2026 mean'}
                </span>
                <span className="rounded-lg bg-sky-50 px-2.5 py-1 text-sky-800 font-medium">
                  {T('সার্ভিস: NASA GIBS WMS (EPSG:4326)', 'Service: NASA GIBS WMS (EPSG:4326)')}
                </span>
                <span className="rounded-lg bg-amber-50 px-2.5 py-1 text-amber-800 font-medium">
                  {T('ফিল্টারিং: JPL CRI Mascons RL06.1', 'Filtering: JPL CRI Mascons RL06.1')}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowMethodology(false)}
              className="grid h-7 w-7 place-items-center rounded-full text-muted hover:bg-black/5"
              aria-label={T('বন্ধ করুন', 'Close')}
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {/* 6. Main Grid: Map (Left) + Interactive Leaderboard (Right) */}
      <div className="mt-3.5 grid gap-3.5 lg:grid-cols-[1fr_310px]">
        {/* Map Container */}
        <div className="relative overflow-hidden rounded-2xl border border-border/80 shadow-inner bg-slate-100 min-h-[380px] lg:min-h-[440px]">
          <MapView
            center={[25.5, 84]}
            bounds={ALL_BOUNDS}
            upazila={false}
            points={[]} // Custom markers rendered in children
            height={440}
            basemap="satellite"
            label={T('দীর্ঘ মেয়াদের ধারার মানচিত্র', 'Long-term trend map')}
          >
            <MapFlyController targetCoords={selectedCoords} resetKey={resetKey} allBounds={ALL_BOUNDS} />

            {/* The whole satellite field for the year, decoded from NASA GIBS, in the same colours as the points */}
            {showField && fieldMeta && fieldBelow != null && (
              <ImageOverlay key={`${kind}-below-${fieldBelow}`} url={fieldUrl(fieldBelow)} bounds={fieldMeta.bounds} opacity={fieldOpacity} className="trend-field" zIndex={250} />
            )}
            {showField && fieldMeta && hasField && (
              <ImageOverlay key={`${kind}-${year}`} url={fieldUrl(year)} bounds={fieldMeta.bounds} opacity={fieldOpacity} className="trend-field trend-field-in" zIndex={251} />
            )}

            {/* Custom Interactive Beacons */}
            {PLACES.map((id) => {
              const coords = at(id);
              if (!coords) return null;
              const icon = markerIcons[id];
              if (!icon) return null;
              return (
                <Marker
                  key={id}
                  position={coords}
                  icon={icon}
                  eventHandlers={{
                    click: () => {
                      setSelectedId((prev) => (prev === id ? null : id));
                    },
                    mouseover: () => setHoveredId(id),
                    mouseout: () => setHoveredId(null),
                  }}
                >
                  <Tooltip direction="top" offset={[0, -12]} opacity={0.98}>
                    <div className="font-sans text-[12px] p-0.5 leading-snug">
                      <p className="font-bold text-ink flex items-center gap-1">
                        <span>{flag(id)}</span>
                        <span>{name(id)}</span>
                      </p>
                      <p className="tabular text-primary-800 font-semibold mt-0.5">
                        {fmt(val(id))} {L(layer.unit)}
                      </p>
                      <p className="text-[10px] text-muted">{subName(id)}</p>
                    </div>
                  </Tooltip>
                </Marker>
              );
            })}
          </MapView>

          {/* The year, large, so the change reads as the timeline plays */}
          <div className="pointer-events-none absolute left-16 top-3 z-[500] select-none">
            <div key={year} className="trend-year-in font-display text-[44px] sm:text-[56px] font-bold leading-none tracking-tight text-white tabular" style={{ textShadow: '0 2px 18px rgba(0,0,0,.55)' }}>
              {num(year, s.lang).replace(/,/g, '')}
            </div>
            <div className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-black/45 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur-sm">
              <Satellite size={12} />
              {layer.src} · {hasField && showField ? L(FIELD_NOTE) : T('এ বছরের ছবি নেই, শুধু বিন্দু', 'No field this year, points only')}
            </div>
          </div>

          {/* Field on/off and strength */}
          {fieldYears.length > 0 && (
            <div className="absolute right-20 top-3.5 z-[500] flex items-center gap-2 rounded-full bg-white/90 px-2.5 py-1.5 text-[11px] font-semibold text-ink shadow-md backdrop-blur-sm">
              <button type="button" onClick={() => setShowField((v) => !v)} aria-pressed={showField}
                className={`rounded-full px-2 py-0.5 transition ${showField ? 'bg-primary-700 text-white' : 'bg-black/5 text-muted'}`}>
                {T('উপগ্রহের ক্ষেত্র', 'Satellite field')}
              </button>
              {showField && (
                <input type="range" min="0.2" max="1" step="0.05" value={fieldOpacity} onChange={(e) => setFieldOpacity(+e.target.value)}
                  aria-label={T('ক্ষেত্রের গাঢ়তা', 'Field strength')} className="h-1 w-20 accent-primary-700" />
              )}
            </div>
          )}

          {/* Floating Selected Region Telemetry HUD Overlay */}
          {selectedId && selectedTrajectory && (
            <div className="pointer-events-auto absolute bottom-3 left-3 right-16 sm:right-auto sm:max-w-xs z-[550] rounded-2xl border border-primary-900/20 bg-white/95 p-3.5 shadow-xl backdrop-blur-md animate-fadeIn">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-primary-700">
                    <MapPin size={12} />
                    {T('নির্বাচিত অঞ্চল টেলিমেট্রি', 'Selected Region Telemetry')}
                  </span>
                  <h4 className="text-[15px] font-bold text-ink flex items-center gap-1.5 truncate">
                    <span>{flag(selectedId)}</span>
                    <span className="truncate">{name(selectedId)}</span>
                  </h4>
                  <p className="text-[11.5px] text-muted truncate">{subName(selectedId)}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedId(null)}
                  className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-muted hover:bg-black/5"
                  aria-label={T('বন্ধ করুন', 'Close')}
                >
                  <X size={15} />
                </button>
              </div>

              {/* Current Value Readout */}
              <div className="mt-2.5 flex items-baseline justify-between border-y border-border/60 py-1.5">
                <span className="text-[12.5px] text-muted">{T(`${bnDigits(year)} সালের মান:`, `${year} Reading:`)}</span>
                <span className="text-[16px] font-extrabold tabular" style={{ color: trendColor(val(selectedId), layer.span) }}>
                  {fmt(val(selectedId))} {L(layer.unit)}
                </span>
              </div>

              {/* 2003-2024 Historical Sparkline */}
              <div className="mt-2.5">
                <div className="flex items-center justify-between text-[10.5px] text-muted mb-1">
                  <span>{T('ঐতিহাসিক ধারা (২০০১-২৪)', 'Historical Trajectory')}</span>
                  <span className="tabular font-medium">
                    {fmt(selectedTrajectory.min)} → {fmt(selectedTrajectory.max)}
                  </span>
                </div>
                <div className="relative h-11 w-full rounded-lg bg-black/[0.03] p-1 overflow-hidden">
                  <svg viewBox={`0 0 ${selectedTrajectory.width} ${selectedTrajectory.height}`} className="h-full w-full overflow-visible">
                    <path
                      d={selectedTrajectory.pathD}
                      fill="none"
                      stroke="#245a28"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    {selectedTrajectory.currentPoint && (
                      <circle
                        cx={selectedTrajectory.currentPoint.x}
                        cy={selectedTrajectory.currentPoint.y}
                        r="4.5"
                        fill="#018571"
                        stroke="#ffffff"
                        strokeWidth="2"
                        className="animate-ping"
                      />
                    )}
                    {selectedTrajectory.currentPoint && (
                      <circle
                        cx={selectedTrajectory.currentPoint.x}
                        cy={selectedTrajectory.currentPoint.y}
                        r="3.5"
                        fill="#018571"
                        stroke="#ffffff"
                        strokeWidth="1.5"
                      />
                    )}
                  </svg>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Region Telemetry Leaderboard */}
        <div className="flex flex-col rounded-2xl border border-border/80 bg-white/95 p-3.5 shadow-2xs">
          {/* Header & Filter Controls */}
          <div className="flex items-center justify-between border-b border-border/60 pb-2.5">
            <span className="font-display text-[14px] font-bold text-ink flex items-center gap-1.5">
              <Activity size={15} className="text-primary-700" />
              {T('আঞ্চলিক র্যাঙ্কিং', 'Regional Telemetry')}
            </span>
            <span className="text-[11.5px] font-semibold text-muted tabular">
              {T(`${bnDigits(year)} সাল`, `${year}`)}
            </span>
          </div>

          {/* Filter Pills */}
          <div className="mt-2 flex items-center gap-1 text-[11.5px]">
            <button
              type="button"
              onClick={() => setFilterMode('all')}
              className={`rounded-lg px-2.5 py-1 font-semibold transition-colors ${
                filterMode === 'all' ? 'bg-primary-800 text-white shadow-2xs' : 'text-muted hover:bg-black/5'
              }`}
            >
              {T('সকল (১২)', 'All (12)')}
            </button>
            <button
              type="button"
              onClick={() => setFilterMode('bd')}
              className={`rounded-lg px-2.5 py-1 font-semibold transition-colors ${
                filterMode === 'bd' ? 'bg-primary-800 text-white shadow-2xs' : 'text-muted hover:bg-black/5'
              }`}
            >
              {T('বাংলাদেশ (৭)', 'BD (7)')}
            </button>
            <button
              type="button"
              onClick={() => setFilterMode('abroad')}
              className={`rounded-lg px-2.5 py-1 font-semibold transition-colors ${
                filterMode === 'abroad' ? 'bg-primary-800 text-white shadow-2xs' : 'text-muted hover:bg-black/5'
              }`}
            >
              {T('প্রতিবেশী (৫)', 'Abroad (5)')}
            </button>
          </div>

          {/* Sort Toggles */}
          <div className="mt-2 flex items-center justify-between gap-1 text-[11px] border-y border-border/50 py-1.5">
            <span className="text-muted flex items-center gap-1">
              <ArrowUpDown size={11} />
              {T('ক্রমানুসার:', 'Sort:')}
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setSortMode('deficit')}
                className={`rounded-md px-1.5 py-0.5 font-semibold ${
                  sortMode === 'deficit' ? 'bg-amber-100 text-amber-900' : 'text-muted hover:text-ink'
                }`}
              >
                {T('ঘাটতি', 'Deficit')}
              </button>
              <button
                type="button"
                onClick={() => setSortMode('surplus')}
                className={`rounded-md px-1.5 py-0.5 font-semibold ${
                  sortMode === 'surplus' ? 'bg-sky-100 text-sky-900' : 'text-muted hover:text-ink'
                }`}
              >
                {T('উদ্বৃত্ত', 'Surplus')}
              </button>
              <button
                type="button"
                onClick={() => setSortMode('name')}
                className={`rounded-md px-1.5 py-0.5 font-semibold ${
                  sortMode === 'name' ? 'bg-primary-100 text-primary-900' : 'text-muted hover:text-ink'
                }`}
              >
                {T('নাম', 'Name')}
              </button>
            </div>
          </div>

          {/* Leaderboard List */}
          <ul
            className="mt-2 divide-y divide-border/50 overflow-y-auto max-h-[330px] pr-1 space-y-1"
            aria-label={T(`${bnDigits(year)} সালের আঞ্চলিক মান`, `Regional values in ${year}`)}
          >
            {displayPlaces.map((id, rankIdx) => {
              const v = val(id);
              const pVal = prevYear ? val(id, prevYear) : null;
              const delta = v != null && pVal != null ? v - pVal : null;
              const isSelected = selectedId === id;
              const isHovered = hoveredId === id;

              // Diverging bar widths
              const absV = Math.abs(v ?? 0);
              const pct = Math.min(50, (absV / layer.span) * 50);

              return (
                <li key={id} className="pt-1">
                  <button
                    type="button"
                    onClick={() => setSelectedId((prev) => (prev === id ? null : id))}
                    onMouseEnter={() => setHoveredId(id)}
                    onMouseLeave={() => setHoveredId(null)}
                    className={`w-full text-left rounded-xl p-2 transition-all duration-200 ${
                      isSelected
                        ? 'bg-primary-100/70 ring-1.5 ring-primary-600 shadow-2xs'
                        : isHovered
                        ? 'bg-primary-50/60'
                        : 'hover:bg-black/[0.02]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1.5">
                      <span className="flex min-w-0 items-center gap-1.5">
                        <span className="text-[10px] font-bold text-muted w-4 shrink-0">
                          #{s.lang === 'bn' ? bnDigits(rankIdx + 1) : rankIdx + 1}
                        </span>
                        <span className="text-[13px]">{flag(id)}</span>
                        <span className="truncate text-[13px] font-bold text-ink">
                          {name(id)}
                        </span>
                      </span>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {delta != null && (
                          <span
                            className={`text-[10px] font-semibold tabular ${
                              delta > 0.1
                                ? 'text-emerald-700'
                                : delta < -0.1
                                ? 'text-amber-700'
                                : 'text-muted'
                            }`}
                            title={T(
                              `পূর্ববর্তী বছরের চেয়ে ${fmt(delta)} পরিবর্তন`,
                              `${fmt(delta)} vs previous year`
                            )}
                          >
                            {delta > 0.1 ? '▲' : delta < -0.1 ? '▼' : '≈'}
                            {num(Math.abs(delta), s.lang, { dp: 1 })}
                          </span>
                        )}
                        <span
                          className="tabular font-extrabold text-[13px] px-2 py-0.5 rounded-md"
                          style={{
                            backgroundColor: trendColor(v, layer.span),
                            color: Math.abs(v ?? 0) > layer.span * 0.4 ? '#ffffff' : '#13261b',
                          }}
                        >
                          {fmt(v)}
                        </span>
                      </div>
                    </div>

                    {/* Bipolar Diverging Bar: Center 0 tick */}
                    <div className="mt-1.5 relative h-2.5 w-full rounded-full bg-black/[0.06] overflow-hidden">
                      {/* Zero baseline tick line */}
                      <div className="absolute left-1/2 top-0 bottom-0 w-[1.5px] bg-ink/35 z-10" />

                      {/* Negative bar: grows left from 50% */}
                      {v != null && v < 0 && (
                        <div
                          className="absolute top-0 bottom-0 right-1/2 rounded-l-full bg-gradient-to-l from-amber-500 to-red-600 transition-all duration-400"
                          style={{ width: `${pct}%` }}
                        />
                      )}

                      {/* Positive bar: grows right from 50% */}
                      {v != null && v > 0 && (
                        <div
                          className="absolute top-0 bottom-0 left-1/2 rounded-r-full bg-gradient-to-r from-emerald-500 to-sky-600 transition-all duration-400"
                          style={{ width: `${pct}%` }}
                        />
                      )}
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      {/* 7. Cinematic Timeline & Anomaly Scrubber */}
      <div className="mt-4 rounded-2xl border border-primary-200/90 bg-white/95 p-3.5 sm:p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Left: Playback Controls */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setPlaying(false);
                setI((x) => Math.max(0, x - 1));
              }}
              disabled={i <= 0}
              aria-label={T('পূর্ববর্তী বছর', 'Previous year')}
              className="grid h-9 w-9 place-items-center rounded-xl border border-border bg-white text-ink shadow-2xs hover:bg-primary-50 disabled:opacity-40 transition-colors"
            >
              <SkipBack size={16} />
            </button>

            <button
              type="button"
              onClick={() => {
                if (i >= data.years.length - 1) setI(0);
                setPlaying(!playing);
              }}
              aria-label={playing ? T('থামাও', 'Pause') : T('বছরগুলো চালাও', 'Play the years')}
              className={`grid h-12 w-12 place-items-center rounded-2xl text-white shadow-md transition-all active:scale-95 ${
                playing
                  ? 'bg-amber-600 hover:bg-amber-700 timeline-pulse-active'
                  : 'bg-primary-700 hover:bg-primary-800'
              }`}
            >
              {playing ? <Pause size={22} /> : <Play size={22} className="ml-0.5" />}
            </button>

            <button
              type="button"
              onClick={() => {
                setPlaying(false);
                setI((x) => Math.min(data.years.length - 1, x + 1));
              }}
              disabled={i >= data.years.length - 1}
              aria-label={T('পরবর্তী বছর', 'Next year')}
              className="grid h-9 w-9 place-items-center rounded-xl border border-border bg-white text-ink shadow-2xs hover:bg-primary-50 disabled:opacity-40 transition-colors"
            >
              <SkipForward size={16} />
            </button>

            <button
              type="button"
              onClick={() => setLoop(!loop)}
              aria-pressed={loop}
              aria-label={T('লুপ প্লেব্যাক', 'Loop playback')}
              className={`grid h-9 w-9 place-items-center rounded-xl border transition-colors ${
                loop
                  ? 'border-primary-600 bg-primary-100 text-primary-900'
                  : 'border-border bg-white text-muted hover:bg-black/5'
              }`}
              title={loop ? T('লুপ চালু', 'Loop on') : T('লুপ বন্ধ', 'Loop off')}
            >
              <Repeat size={16} />
            </button>

            {/* Speed Selector */}
            <div className="hidden sm:flex items-center gap-0.5 rounded-xl bg-black/[0.04] p-1 text-[11px] font-bold">
              {[0.5, 1, 2].map((spd) => (
                <button
                  key={spd}
                  type="button"
                  onClick={() => setSpeed(spd)}
                  className={`rounded-lg px-2 py-1 transition-colors ${
                    speed === spd ? 'bg-white text-primary-800 shadow-2xs' : 'text-muted hover:text-ink'
                  }`}
                >
                  {spd}×
                </button>
              ))}
            </div>

            {/* Audio Chime Toggle */}
            <button
              type="button"
              onClick={() => setMuted(!muted)}
              aria-pressed={!muted}
              aria-label={muted ? T('শব্দ চালু করুন', 'Unmute audio') : T('শব্দ বন্ধ করুন', 'Mute audio')}
              className={`grid h-9 w-9 place-items-center rounded-xl border transition-colors ${
                !muted
                  ? 'border-emerald-600 bg-emerald-100 text-emerald-900'
                  : 'border-border bg-white text-muted hover:bg-black/5'
              }`}
              title={!muted ? T('সাউন্ড টেলিমেট্রি চালু', 'Audio telemetry on') : T('সাউন্ড টেলিমেট্রি বন্ধ', 'Audio telemetry muted')}
            >
              {!muted ? <Volume2 size={16} /> : <VolumeX size={16} />}
            </button>
          </div>

          {/* Right: Active Year & Historical Milestone Badge */}
          <div className="flex items-center gap-3">
            {activeMilestone && (
              <span className="hidden md:inline-flex items-center gap-1.5 rounded-xl border border-primary-300 bg-gradient-to-r from-primary-50 to-emerald-50 px-3 py-1 text-[12px] font-bold text-primary-950 shadow-2xs animate-fadeIn">
                <Sparkles size={13} className="text-primary-700" />
                {L(activeMilestone)}
              </span>
            )}
            <div className="text-right">
              <span className="block font-display text-[24px] sm:text-[28px] font-extrabold tracking-tight text-primary-950 tabular leading-none">
                {T(`${bnDigits(year)} সাল`, `${year}`)}
              </span>
              <span className="block text-[11px] font-semibold text-primary-700 mt-0.5">
                {T('রবি শুষ্ক মৌসুম', 'Rabi Dry Season')}
              </span>
            </div>
          </div>
        </div>

        {/* Embedded Waveform Scrubber Track */}
        <div className="mt-3.5 relative pt-1 pb-1">
          {/* Waveform Background */}
          {timelineWaveform && (
            <div className="relative h-9 w-full rounded-xl bg-black/[0.04] p-1 overflow-hidden pointer-events-none">
              <svg viewBox="0 0 100 34" preserveAspectRatio="none" className="h-full w-full">
                {/* Zero baseline */}
                <line x1="0" y1={timelineWaveform.midY} x2="100" y2={timelineWaveform.midY} stroke="#1b2620" strokeWidth="0.8" strokeDasharray="2 2" opacity="0.35" />
                {/* Area fill */}
                <path d={timelineWaveform.dArea} fill="rgba(47, 138, 143, 0.2)" />
                {/* Line trend */}
                <path d={timelineWaveform.dLine} fill="none" stroke="#245a28" strokeWidth="1.6" strokeLinecap="round" opacity="0.85" />
              </svg>
            </div>
          )}

          {/* Range Input Slider Overlaid */}
          <input
            type="range"
            min={0}
            max={Math.max(0, data.years.length - 1)}
            value={i}
            onChange={(e) => {
              setPlaying(false);
              setI(+e.target.value);
            }}
            aria-label={T('বছর বাছুন', 'Choose year')}
            className="absolute inset-x-0 top-1/2 -translate-y-1/2 w-full h-8 opacity-0 cursor-pointer z-20"
          />

          {/* Visual Indicator of Current Playhead */}
          <div
            className="pointer-events-none absolute top-1/2 -translate-y-1/2 z-10 -ml-3.5 transition-[left] duration-150 ease-out"
            style={{
              left: `${(i / (Math.max(1, data.years.length - 1))) * 100}%`,
            }}
          >
            <div className="h-7 w-7 rounded-full bg-primary-800 text-white shadow-lg ring-2 ring-white grid place-items-center font-bold text-[10px]">
              ●
            </div>
          </div>
        </div>

        {/* Year Milestone Quick-Jump Chips */}
        <div className="mt-2.5 flex flex-wrap items-center justify-between gap-1.5 text-[11px] text-muted">
          <span>{T('গুরুত্বপূর্ণ জলবায়ু বছর:', 'Landmark Years:')}</span>
          <div className="flex flex-wrap items-center gap-1">
            {[2004, 2007, 2010, 2015, 2020, 2022, 2024].map((y) => {
              const idx = data.years.indexOf(y);
              if (idx === -1) return null;
              const isCurrent = year === y;
              return (
                <button
                  key={y}
                  type="button"
                  onClick={() => {
                    setPlaying(false);
                    setI(idx);
                  }}
                  className={`rounded-lg px-2 py-0.5 font-bold tabular transition-all ${
                    isCurrent
                      ? 'bg-primary-800 text-white shadow-2xs'
                      : 'bg-black/[0.04] text-ink hover:bg-primary-100 hover:text-primary-900'
                  }`}
                >
                  {T(bnDigits(y), y)}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 8. Diverging Scientific Color Scale Legend */}
      <div className="mt-3.5 rounded-xl bg-white/70 p-3 border border-border/60">
        <div className="flex items-center justify-between gap-2 text-[12px] font-semibold text-ink mb-1.5">
          <span className="flex items-center gap-1.5 text-amber-900">
            <span className="h-3 w-3 rounded-full" style={{ background: trendColor(-layer.span, layer.span) }} />
            {T(`তীব্র ঘাটতি / খরা (−${num(layer.span, s.lang)} ${L(layer.unit)})`, `Critical Deficit (−${layer.span} ${L(layer.unit)})`)}
          </span>
          <span className="text-muted text-[11px]">
            {T('০ = স্বাভাবিক রেফারেন্স গড়', '0 = Baseline Normal')}
          </span>
          <span className="flex items-center gap-1.5 text-emerald-900">
            {T(`উচ্চ উদ্বৃত্ত / প্লাবন (+${num(layer.span, s.lang)} ${L(layer.unit)})`, `High Surplus (+${layer.span} ${L(layer.unit)})`)}
            <span className="h-3 w-3 rounded-full" style={{ background: trendColor(layer.span, layer.span) }} />
          </span>
        </div>

        <div className="relative h-3 w-full rounded-full shadow-inner overflow-hidden"
          style={{
            background: `linear-gradient(90deg, ${trendColor(-layer.span, layer.span)} 0%, ${trendColor(0, layer.span)} 50%, ${trendColor(layer.span, layer.span)} 100%)`,
          }}
        >
          {/* Center 0 mark */}
          <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-ink/70" />
        </div>

        <p className="mt-2 text-[11px] text-muted text-center leading-relaxed">
          {T(
            'নাসা আর্থ সায়েন্স ডিভিশনের ওপেন ডেটা (NASA GIBS) থেকে সংগৃহীত। প্রতিটি উপজেলার দীর্ঘমেয়াদী গড় ধরে পরিবর্তন হিসাব করা হয়েছে।',
            'Collected from NASA Earth Science Division Open Data (NASA GIBS). Calculated relative to each location’s long-term baseline.'
          )}
        </p>
      </div>
    </div>
  );
}
