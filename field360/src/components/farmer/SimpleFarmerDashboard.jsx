import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Droplets,
  Sprout,
  ScanLine,
  Mic,
  Volume2,
  VolumeX,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Sparkles,
  PhoneCall,
  Calendar,
  CloudSun,
  CloudRain,
  Sun,
  Coins,
  Scale,
  Flame,
  Check,
  SlidersHorizontal,
  Satellite,
  Layers,
  Shield,
  ShieldCheck,
  ShieldAlert,
  Mountain,
  Waves,
  Info,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Leaf,
  TrendingUp,
} from 'lucide-react';
import { useStore } from '../../store';
import { num, bnDigits, fmtDate, fmtBangla } from '../../engine/dates';
import { fertilizerPlan } from '../../engine/soil';
import { speakNatural, stopSpeaking } from '../../voice/speech';
import ChakraLogo from '../chakra/ChakraLogo';
import { ChakraOrb } from '../chakra/ChakraAgent';
import {
  climateChange,
  fieldContext,
  fieldFuture,
  cropOf,
  WATER_M3_PER_MM_BIGHA,
  ureaSavedKgPerBigha,
} from '../../engine/soilfuture';
import { runnerUp } from '../../engine/explain';
import { strategyBrief, fieldTerrain } from '../../engine/briefs';
import { PRIORITIES } from '../../engine/decision';
import deltas from '../../data/climate/cmip6_deltas.json';

const FERT_EN = {
  'ইউরিয়া': 'Urea', 'ইউরিয়া': 'Urea', 'টিএসপি': 'TSP', 'ডিএপি': 'DAP',
  'এমওপি': 'MoP', 'জিপসাম': 'Gypsum', 'জিংক সালফেট': 'Zinc sulphate',
  'বরিক এসিড': 'Boric acid', 'বোরিক এসিড': 'Boric acid',
  'গোবর/কম্পোস্ট': 'Cow dung / compost', 'গোবর/কম্পোষ্ট': 'Cow dung / compost', 'চুন': 'Lime',
};
const PHYS_EN = {
  'পলি মাটি': 'Alluvial soil',
  'খিয়ার মাটি': 'Barind clay (Khiyar)', 'খিয়ার মাটি': 'Barind clay (Khiyar)',
  'পাহাড়ী মাটি': 'Hill soil', 'পাহাড়ী মাটি': 'Hill soil',
};
const fertName = (raw, lang) => {
  const base = String(raw || '').replace(/\s*\(.*\)/, '').trim();
  return lang === 'en' ? (FERT_EN[base] || FERT_EN[base.normalize('NFC')] || base) : base;
};
const physName = (raw, lang) => {
  const v = String(raw || '').trim();
  return lang === 'en' ? (PHYS_EN[v] || PHYS_EN[v.normalize('NFC')] || 'Loam') : (v || 'দোআঁশ');
};

export default function SimpleFarmerDashboard() {
  const {
    s,
    dispatch,
    T,
    L,
    farmer,
    chosen,
    water,
    weather,
    upazila,
    soil,
    srdiUnion,
    confirmedPlan,
    confirmPlan,
    clim,
    rotation,
    econ,
    activeParcel,
  } = useStore();

  const [reading, setReading] = useState(false);
  const [playingKey, setPlayingKey] = useState(null);
  const [expandedStrategy, setExpandedStrategy] = useState('best'); // 'habit' | 'best' | 'alt'

  // Irrigation status derivation
  const isRed = water.color === 'RED';
  const isAmber = water.color === 'AMBER';
  const isGreen = water.color === 'GREEN';

  // Fertilizer guidance for this farmer's parcel from SRDI
  const fp = fertilizerPlan(srdiUnion, chosen.crop.id, { areaDec: farmer.area_dec });
  const fertItems = fp?.items?.filter((i) => (i.kg ?? 0) > 0) ?? [
    { fertilizer: 'ইউরিয়া (Urea)', kg: Math.round(35 * (farmer.area_dec / 33)) },
    { fertilizer: 'টিএসপি (TSP)', kg: Math.round(20 * (farmer.area_dec / 33)) },
    { fertilizer: 'এমওপি (পটাশ)', kg: Math.round(15 * (farmer.area_dec / 33)) },
    { fertilizer: 'জিপসাম (Gypsum)', kg: Math.round(10 * (farmer.area_dec / 33)) },
  ];

  // Audio readout function
  const playSpeech = (text, key = 'all') => {
    if (playingKey === key) {
      stopSpeaking();
      setPlayingKey(null);
      setReading(false);
      return;
    }
    stopSpeaking();
    setPlayingKey(key);
    setReading(true);
    speakNatural(text, s.lang, {
      onEnd: () => {
        setPlayingKey(null);
        setReading(false);
      },
      onError: () => {
        setPlayingKey(null);
        setReading(false);
      },
    });
  };

  // Farmer's name & village
  const farmerDisplayName = L(farmer.name);
  const villageName = T(farmer.villageBn, farmer.village);

  // Full spoken text for low-literacy farmer
  const fullSpokenText = s.lang === 'bn'
    ? `${villageName} গ্রামের কৃষক ${farmerDisplayName} ভাই, সালামু আলাইকুম। আপনার জমির আজকের হিসাব: ${
        isRed
          ? 'আজ আপনার জমিতে পানি লাগবে, এখনই সেচ দিন।'
          : isAmber
          ? 'মাটি হাতে মুঠো করে দেখে নিয়ে সেচ দিন।'
          : 'আজ আপনার জমিতে সেচ লাগবে না, মাটিতে পর্যাপ্ত রস আছে।'
      } এই মৌসুমে আপনার জমির জন্য সেরা ফসল ${chosen.crop.name.bn}। ${fertItems.map((i) => `${fertName(i.fertilizer, 'bn')} ${num(i.kg, 'bn')} কেজি`).join(', ')} সার লাগবে। নাসা উপগ্রহের সাহায্যে ৩টি বিকল্প ফসলচক্র নিচে সাজানো হয়েছে।`
    : `Hello ${farmerDisplayName}, here is your farm summary. Irrigation status: ${
        isRed ? 'Irrigation needed today.' : isAmber ? 'Check soil moisture before watering.' : 'No irrigation needed today.'
      } Recommended crop: ${chosen.crop.name.en}. ${fertItems.length ? `Recommended fertiliser: ${fertItems.map((i) => `${fertName(i.fertilizer, 'en')} ${num(i.kg, 'en')} kg`).join(', ')}. ` : ''}3 NASA-adapted rotation strategies are compared below.`;

  // Log irrigation today
  const [irrigated, setIrrigated] = useState(false);
  const handleIrrigated = () => {
    setIrrigated(true);
    dispatch({ type: 'logIrrigation' });
  };

  // Confirm plan
  const [planConfirmed, setPlanConfirmed] = useState(!!confirmedPlan);
  const handleConfirmPlan = async () => {
    setPlanConfirmed(true);
    await confirmPlan(chosen);
  };

  // ---------------------------------------------------------------------------
  // NASA Earth Observations & Soil Future 10-Year Rotation Calculations
  // ---------------------------------------------------------------------------
  const scen = 'ssp245';
  const change = useMemo(() => climateChange(deltas, upazila?.id || 'godagari', scen), [upazila?.id, scen]);
  const ctx = useMemo(() => {
    if (!clim || !soil || !farmer) return null;
    return fieldContext({
      clim,
      change,
      soil,
      plot: farmer,
      amanT: rotation?.amanMeasured ? rotation.amanT : null,
      econ,
      soilTestValues: s.soilTests?.[activeParcel?.id || farmer.id] || null,
    });
  }, [clim, change, soil, farmer, rotation, econ, s.soilTests, activeParcel]);

  const planRabi = chosen?.crop?.id || 'mustard';
  const planK1 = rotation?.best?.crop?.id ?? 'fallow';
  const lastCrop = farmer?.last_crop || 'mustard';

  const ff = useMemo(() => {
    if (!ctx) return null;
    return fieldFuture({
      ctx,
      lastCrop,
      plan: { rabi: planRabi, k1: planK1 },
      priorities: s.priorities || [],
      exclude: s.exclude ?? [],
    });
  }, [ctx, lastCrop, planRabi, planK1, s.priorities, s.exclude]);

  const second = useMemo(() => (ff ? runnerUp(ff.top, ff.best) : null), [ff]);
  const terrain = useMemo(() => fieldTerrain(activeParcel?.id || farmer?.id), [activeParcel, farmer]);

  // Format rotation cycle string
  const formatRot = (rot) => {
    if (!rot || !rot.cycle) return '';
    const years = rot.cycle.map((y) =>
      [y.rabi, y.k1, 'aman']
        .map((id) => (id === 'fallow' ? T('পতিত', 'Fallow') : cropOf(id)?.name?.[s.lang] || id))
        .join(' → ')
    );
    const body =
      years.length > 1
        ? years
            .map((x, i) => `${s.lang === 'bn' ? (i ? 'পরের বছর' : '১ম বছর') : (i ? 'Year 2' : 'Year 1')}: ${x}`)
            .join(' | ')
        : years[0];
    return rot.residue === 'retain'
      ? `${body} (${s.lang === 'bn' ? '+ খড় জমিতে মেশানো' : '+ straw retained'})`
      : body;
  };

  // Build the 3 NASA Rotation Strategies
  const stratHabit = useMemo(() => {
    if (!ff?.habit) return null;
    return {
      id: 'habit',
      number: num(1, s.lang),
      title: T('এখন যেমন চাষ (ভিত্তি রেখা)', 'As Now (Habitual Baseline)'),
      subtitle: T('মাঠে বর্তমানে প্রচলিত চাষপদ্ধতি', 'Current conventional practice'),
      rot: ff.habit.rot,
      s: ff.habit.sNow,
      brief: strategyBrief({
        s: ff.habit.sNow,
        b: ff.habit.sNow,
        rot: ff.habit.rot,
        kind: 'habit',
        world: 'now',
        terrain,
      }),
      tag: T('ভিত্তি রেখা', 'Baseline'),
      badgeColor: 'bg-slate-100 text-slate-800 border-slate-300',
      borderColor: 'border-slate-300',
      headerBg: 'bg-slate-50',
    };
  }, [ff, terrain, T]);

  const stratBest = useMemo(() => {
    if (!ff?.best || !ff?.habit) return null;
    return {
      id: 'best',
      number: num(2, s.lang),
      title: T('সেরা জলবায়ু-সহনশীল ফসলচক্র (নাসার সুপারিশ)', 'Best Climate-Adapted Rotation (NASA Top Pick)'),
      subtitle: T('মাটির স্বাস্থ্য, পানি সাশ্রয় ও আবহাওয়া মানিয়ে সেরা সমন্বয়', 'Optimal match for soil health, water & climate'),
      rot: ff.best.rot,
      s: ff.best.sNow,
      brief: strategyBrief({
        s: ff.best.sNow,
        b: ff.habit.sNow,
        rot: ff.best.rot,
        kind: 'best',
        world: 'now',
        terrain,
      }),
      tag: T('🏆 সেরা সুপারিশ', '🏆 Top Recommended'),
      badgeColor: 'bg-emerald-100 text-emerald-900 border-emerald-300 font-black',
      borderColor: 'border-emerald-500 ring-2 ring-emerald-500/20',
      headerBg: 'bg-emerald-50/80',
    };
  }, [ff, terrain, T]);

  const stratAlt = useMemo(() => {
    if (!second || !ff?.habit) return null;
    return {
      id: 'alt',
      number: num(3, s.lang),
      title: T('উচ্চ-সহনশীল বিকল্প ফসলচক্র', 'High-Resilience Alternative Rotation'),
      subtitle: T('ভিন্ন ফসলে বাজারের ঝুঁকি ভাগ করে নেওয়ার কৌশল', 'Risk-diversification alternative with different crops'),
      rot: second.rot,
      s: second.sNow,
      brief: strategyBrief({
        s: second.sNow,
        b: ff.habit.sNow,
        rot: second.rot,
        kind: 'alt',
        world: 'now',
        terrain,
      }),
      tag: T('বিকল্প পছন্দ', 'Alternative'),
      badgeColor: 'bg-teal-100 text-teal-900 border-teal-300 font-bold',
      borderColor: 'border-teal-400',
      headerBg: 'bg-teal-50/70',
    };
  }, [second, ff, terrain, T]);

  const strategiesList = [stratHabit, stratBest, stratAlt].filter(Boolean);

  // Farmer Priorities list for 1-click toggling
  const priorityOptions = [
    { id: 'water', label: T('পানি বাঁচানো', 'Save Water'), sub: T('সেচ কম লাগুক', 'Less irrigation'), icon: Droplets },
    { id: 'income', label: T('বেশি লাভ', 'High Profit'), sub: T('আয় বেশি হোক', 'More earnings'), icon: Coins },
    { id: 'soil', label: T('মাটির স্বাস্থ্য', 'Soil Health'), sub: T('উর্বরতা বাড়ুক', 'Build soil fertility'), icon: Sprout },
    { id: 'risk', label: T('কম ঝুঁকি', 'Low Risk'), sub: T('আবহাওয়া সহনশীল', 'Weather resilient'), icon: ShieldCheck },
    { id: 'fodder', label: T('পশুর খাবার', 'Cattle Fodder'), sub: T('গরুর খড় ও লতা', 'Fodder for cows'), icon: Leaf },
    { id: 'cover', label: T('জমি সবুজ রাখা', 'Cover Crop'), sub: T('মাটি ঢাকা থাকুক', 'Keep soil covered'), icon: Layers },
  ];

  return (
    <div className="simple-farmer-dashboard space-y-6 pb-12">
      {/* Low-Literacy Hero Greeting & Full Spoken Briefing */}
      <div className="relative overflow-hidden rounded-3xl border-2 border-emerald-500/40 bg-gradient-to-br from-emerald-600 via-emerald-700 to-primary-950 p-6 text-white shadow-xl sm:p-8">
        <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/20 px-3.5 py-1 text-[13px] font-bold text-amber-200 backdrop-blur-xs">
              <Sparkles size={15} className="animate-pulse" />
              <span>{T('সহজ কৃষক মোড • নাসার উপাত্তে কৃষি সমাধান', 'Simple Farmer Mode • NASA Adapting Farms')}</span>
            </div>
            <h1 className="font-display text-[26px] font-black sm:text-[34px] leading-tight">
              {T(`${farmerDisplayName}, আজকের সারসংক্ষেপ`, `${farmerDisplayName}, Today’s Farm Brief`)}
            </h1>
            <p className="text-[15px] font-medium text-emerald-100">
              {T(
                `গ্রাম: ${villageName}, ${L(upazila.name)} | জমি: ${num(farmer.area_dec / 33, 'bn', { dp: 1 })} বিঘা (${bnDigits(farmer.area_dec)} শতক)`,
                `Village: ${villageName}, ${L(upazila.name)} | Land: ${num(farmer.area_dec / 33, 'en', { dp: 1 })} bigha (${num(farmer.area_dec, 'en')} decimal)`
              )}
            </p>
          </div>

          {/* Large Audio Readout Button */}
          <button
            type="button"
            onClick={() => playSpeech(fullSpokenText, 'all')}
            className={`inline-flex items-center justify-center gap-3 rounded-2xl px-6 py-4 text-[16px] font-black shadow-lg transition-all duration-200 cursor-pointer active:scale-95 shrink-0 ${
              reading && playingKey === 'all'
                ? 'bg-amber-400 text-primary-950 ring-4 ring-amber-300/50 scale-105'
                : 'bg-white text-emerald-950 hover:bg-emerald-50'
            }`}
            aria-label={T('পুরোটা পড়ে শোনান', 'Read aloud the full farm brief')}
          >
            {reading && playingKey === 'all' ? <VolumeX size={24} className="animate-spin" /> : <Volume2 size={24} />}
            <span>{reading && playingKey === 'all' ? T('পড়া থামান', 'Stop Reading') : T('🔊 পুরোটা পড়ে শুনুন', '🔊 Read Aloud to Me')}</span>
          </button>
        </div>

        {/* Ambient background glow */}
        <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-emerald-400/20 blur-3xl" />
      </div>

      {/* NASA Space Apps Feature 1: NASA Earth Observation Shield */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-xl bg-sky-100 text-sky-800 font-black text-[15px]">🛰️</span>
            <div>
              <h2 className="text-[19px] sm:text-[20px] font-black text-ink">
                {T('নাসার ৬টি উপগ্রহের পাহারা: আপনার জমির বর্তমান স্থিতি', 'NASA 6-Satellite Shield: Live Field Observation')}
              </h2>
              <p className="text-[12.5px] font-semibold text-muted">
                {T('মহাকাশ থেকে সরাসরি আপনার জমির মাটি, বৃষ্টি, রোদ ও ভূগর্ভস্থ পানির ওপর নজরদারি', 'Real-time monitoring of soil, rain, heat & groundwater from space')}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() =>
              playSpeech(
                T(
                  'নাসার ছয়টি উপগ্রহ আপনার জমির সার্বক্ষণিক পাহারা দিচ্ছে। এসএমএপি মাটির গভীরের আর্দ্রতা মাপে, জিপিএম সরাসরি বৃষ্টিপাত দেখে, নাসা পাওয়ার ও ইকোস্ট্রেস তাপদাহ পর্যবেক্ষণ করে, ল্যান্ডস্যাট ও মডিস ফসলের সবুজ আবরণ ট্র্যাক করে, গ্রেস ভূগর্ভস্থ পানির স্তর মাপে এবং এসআরটিএম জমির উচ্চতা ও প্লাবন গভীরতা হিসাব করে।',
                  'Six NASA and partner satellites monitor your field continuously: SMAP tracks root-zone moisture, GPM watches rainfall, POWER and ECOSTRESS monitor heat stress, Landsat and MODIS track canopy greenness, GRACE tracks deep groundwater, and SRTM maps elevation and flood depth.'
                ),
                'nasa-shield'
              )
            }
            className="flex items-center gap-1.5 rounded-xl border border-border bg-white px-3 py-1.5 text-[13px] font-bold text-ink hover:bg-primary-50 cursor-pointer shrink-0"
          >
            <Volume2 size={15} className="text-primary-700" />
            <span>{T('শুনুন', 'Listen')}</span>
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {/* 1. SMAP */}
          <div className="rounded-2xl border border-sky-200 bg-sky-50/70 p-3.5 shadow-2xs hover:shadow-xs transition-all">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[20px]">🛰️</span>
              <span className="rounded bg-sky-200/80 px-1.5 py-0.5 text-[10px] font-black text-sky-900 font-mono">SMAP</span>
            </div>
            <div className="text-[13px] font-extrabold text-sky-950 leading-tight">
              {T('মাটির আর্দ্রতা', 'Root Soil Moisture')}
            </div>
            <div className="text-[11px] font-semibold text-sky-800 mt-1 leading-snug">
              {isRed
                ? T('শিকড়ে পানির টান (ঘাটতি)', 'Root zone dry')
                : isAmber
                ? T('মাঝারি রস আছে', 'Moderate moisture')
                : T('শিকড়ে পর্যাপ্ত রস আছে', 'Root zone optimal')}
            </div>
          </div>

          {/* 2. GPM IMERG */}
          <div className="rounded-2xl border border-blue-200 bg-blue-50/70 p-3.5 shadow-2xs hover:shadow-xs transition-all">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[20px]">🌧️</span>
              <span className="rounded bg-blue-200/80 px-1.5 py-0.5 text-[10px] font-black text-blue-900 font-mono">GPM IMERG</span>
            </div>
            <div className="text-[13px] font-extrabold text-blue-950 leading-tight">
              {T('বৃষ্টিপাত ট্র্যাকার', 'Rainfall Tracker')}
            </div>
            <div className="text-[11px] font-semibold text-blue-800 mt-1 leading-snug">
              {weather?.days?.[0]?.rain > 0
                ? `${num(weather.days[0].rain, s.lang, { dp: 1 })} ${T('মিমি বৃষ্টির আভাস', 'mm rain forecast')}`
                : T('আজ বৃষ্টির সম্ভাবনা কম', 'No rain expected today')}
            </div>
          </div>

          {/* 3. NASA POWER & ECOSTRESS */}
          <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-3.5 shadow-2xs hover:shadow-xs transition-all">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[20px]">🌡️</span>
              <span className="rounded bg-amber-200/80 px-1.5 py-0.5 text-[10px] font-black text-amber-900 font-mono">POWER / ECO</span>
            </div>
            <div className="text-[13px] font-extrabold text-amber-950 leading-tight">
              {T('রোদ ও তাপদাহ', 'Heat & Evaporation')}
            </div>
            <div className="text-[11px] font-semibold text-amber-800 mt-1 leading-snug">
              {num(Math.round(weather?.days?.[0]?.tmax ?? 28), s.lang)}{T('°সে · ফুল ফোটার তাপসীমা ৩৫°সে', '°C · Limit 35°C')}
            </div>
          </div>

          {/* 4. Landsat & MODIS */}
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-3.5 shadow-2xs hover:shadow-xs transition-all">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[20px]">🌿</span>
              <span className="rounded bg-emerald-200/80 px-1.5 py-0.5 text-[10px] font-black text-emerald-900 font-mono">Landsat NDVI</span>
            </div>
            <div className="text-[13px] font-extrabold text-emerald-950 leading-tight">
              {T('সবুজ ক্যানোপি', 'Green Canopy')}
            </div>
            <div className="text-[11px] font-semibold text-emerald-800 mt-1 leading-snug">
              {T('জমি আচ্ছাদন ও ক্ষয়রোধ', 'Vegetation cover vs erosion')}
            </div>
          </div>

          {/* 5. GRACE / GRACE-FO */}
          <div className="rounded-2xl border border-indigo-200 bg-indigo-50/70 p-3.5 shadow-2xs hover:shadow-xs transition-all">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[20px]">💧</span>
              <span className="rounded bg-indigo-200/80 px-1.5 py-0.5 text-[10px] font-black text-indigo-900 font-mono">GRACE-FO</span>
            </div>
            <div className="text-[13px] font-extrabold text-indigo-950 leading-tight">
              {T('ভূগর্ভস্থ পানি', 'Groundwater Level')}
            </div>
            <div className="text-[11px] font-semibold text-indigo-800 mt-1 leading-snug">
              {T('অ্যাকুইফারের পানি সঞ্চয়', 'Deep aquifer storage')}
            </div>
          </div>

          {/* 6. SRTM 30m Elevation */}
          <div className="rounded-2xl border border-teal-200 bg-teal-50/70 p-3.5 shadow-2xs hover:shadow-xs transition-all">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[20px]">🏔️</span>
              <span className="rounded bg-teal-200/80 px-1.5 py-0.5 text-[10px] font-black text-teal-900 font-mono">SRTM 30m</span>
            </div>
            <div className="text-[13px] font-extrabold text-teal-950 leading-tight">
              {T('উচ্চতা ও প্লাবন', 'Elevation & Flood')}
            </div>
            <div className="text-[11px] font-semibold text-teal-800 mt-1 leading-snug">
              {terrain ? `${num(terrain.elev, s.lang, { dp: 0 })} ${T('মি উঁচু', 'm ASL')}` : T('মাঝারি উঁচু জমি', 'Medium land')}
            </div>
          </div>
        </div>
      </section>

      {/* NASA Space Apps Problem 1: Water & Irrigation Today */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-xl bg-sky-100 text-sky-700 font-black text-[15px]">{num(1, s.lang)}</span>
            <h2 className="text-[20px] font-black text-ink">{T('আজ জমিতে সেচ লাগবে কি না?', 'Do you need irrigation today?')}</h2>
          </div>
          <button
            type="button"
            onClick={() =>
              playSpeech(
                T(
                  isRed
                    ? 'আজ জমিতে সেচ দিন। মাটিতে রস কমে গেছে।'
                    : isAmber
                    ? 'মাটি হাতে মুঠো করে দেখুন। শুকনো হলে সেচ দিন।'
                    : 'আজ সেচ লাগবে না। মাটিতে পর্যাপ্ত পানি আছে।',
                  isRed
                    ? 'Irrigate your field today. Soil moisture has dropped below the threshold.'
                    : isAmber
                    ? 'Squeeze a handful of soil to check. Irrigate if it crumbles dry.'
                    : 'No irrigation needed today. Soil moisture is adequate.'
                ),
                'water'
              )
            }
            className="flex items-center gap-1.5 rounded-xl border border-border bg-white px-3 py-1.5 text-[13px] font-bold text-ink hover:bg-primary-50 cursor-pointer"
          >
            <Volume2 size={15} className="text-primary-700" />
            <span>{T('শুনুন', 'Listen')}</span>
          </button>
        </div>

        {/* Big Traffic Light Card */}
        <div
          className={`rounded-3xl border-3 p-6 sm:p-8 shadow-md transition-all ${
            isRed
              ? 'border-red-500 bg-red-50 text-red-950 ring-4 ring-red-400/20'
              : isAmber
              ? 'border-amber-500 bg-amber-50 text-amber-950 ring-4 ring-amber-400/20'
              : 'border-emerald-500 bg-emerald-50 text-emerald-950 ring-4 ring-emerald-400/20'
          }`}
        >
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-4 sm:gap-5">
              <div
                className={`grid h-16 w-16 sm:h-20 sm:w-20 shrink-0 place-items-center rounded-3xl text-[32px] sm:text-[40px] shadow-sm ${
                  isRed ? 'bg-red-500 text-white' : isAmber ? 'bg-amber-500 text-white' : 'bg-emerald-600 text-white'
                }`}
              >
                {isRed ? '🔴' : isAmber ? '🟠' : '🟢'}
              </div>
              <div className="space-y-1">
                <span className="text-[13px] font-extrabold uppercase tracking-wider opacity-80">
                  {T('সেচের অবস্থা (NASA SMAP + BMD আবহাওয়া)', 'Irrigation Status (NASA SMAP + BMD Weather)')}
                </span>
                <h3 className="font-display text-[26px] sm:text-[32px] font-black leading-tight">
                  {isRed
                    ? T('আজই জমিতে সেচ দিন', 'Irrigate your field today')
                    : isAmber
                    ? T('মাটি হাতে দেখে সেচ দিন', 'Check soil before irrigating')
                    : T('আজ সেচ লাগবে না', 'No irrigation needed today')}
                </h3>
                <p className="text-[15px] font-semibold leading-relaxed opacity-90 max-w-xl">
                  {isRed
                    ? T('মাটির আর্দ্রতা শিকড় সীমার নিচে নেমে গেছে। এখনই সেচ না দিলে ফসলের ক্ষতি হবে।', 'Soil moisture dropped below root threshold. Irrigate immediately.')
                    : isAmber
                    ? T('মাটি হাতে মুঠো করে দেখুন: যদি ভেঙে গুঁড়ো হয় তবে সেচ দিন, দলা পাকলে আজ লাগবে না।', 'Squeeze soil in your hand: if it crumbles, irrigate; if it clumps, wait.')
                    : T('মাটিতে ভালো রস আছে। আগামী ৩ দিনের মধ্যে বৃষ্টির সম্ভাবনা ও বাতাসের আর্দ্রতা অনুকূলে।', 'Soil moisture is optimal. Weather conditions remain favourable.')}
                </p>
              </div>
            </div>

            {/* Quick Action Button */}
            <div className="flex flex-wrap items-center gap-3 shrink-0">
              <button
                type="button"
                onClick={handleIrrigated}
                disabled={irrigated}
                className={`flex items-center gap-2 rounded-2xl px-5 py-3.5 text-[15px] font-bold shadow-sm transition-all cursor-pointer ${
                  irrigated
                    ? 'bg-emerald-700 text-white cursor-default'
                    : 'bg-primary-950 text-white hover:bg-primary-900 active:scale-95'
                }`}
              >
                <CheckCircle2 size={18} className={irrigated ? 'text-amber-300' : 'text-white'} />
                <span>{irrigated ? T('✓ আজ সেচ দেওয়া হয়েছে', '✓ Irrigated today') : T('আজ সেচ দিয়েছি', 'I irrigated today')}</span>
              </button>
              <Link
                to="/farmer/today"
                className="flex items-center gap-1.5 rounded-2xl border border-black/15 bg-white/80 px-4 py-3.5 text-[14.5px] font-bold text-ink hover:bg-white"
              >
                <span>{T('বিস্তারিত দেখুন', 'See Details')}</span>
                <ArrowRight size={16} />
              </Link>
            </div>
          </div>

          {/* 3-Day Weather Cards for Smallholders */}
          {weather?.days && (
            <div className="mt-6 border-t border-black/10 pt-4">
              <div className="text-[13px] font-bold text-ink/75 mb-2.5">
                {T('আগামী ৩ দিনের আবহাওয়া (নাসা ও আবহাওয়া অধিদপ্তর):', 'Next 3 days weather (NASA & BMD):')}
              </div>
              <div className="grid grid-cols-3 gap-2.5 sm:gap-4">
                {weather.days.slice(0, 3).map((d, i) => {
                  const isRainy = (d.rain ?? 0) > 2;
                  const isHot = (d.tmax ?? 0) > 30;
                  return (
                    <div key={d.d} className="rounded-2xl border border-black/10 bg-white/85 p-3 text-center shadow-2xs">
                      <span className="text-[12px] font-bold text-muted block">
                        {i === 0 ? T('আজ', 'Today') : i === 1 ? T('আগামীকাল', 'Tomorrow') : T('পরশু', 'Day After')}
                      </span>
                      <div className="my-1.5 flex justify-center">
                        {isRainy ? (
                          <CloudRain size={24} className="text-sky-600" />
                        ) : isHot ? (
                          <Sun size={24} className="text-amber-500" />
                        ) : (
                          <CloudSun size={24} className="text-amber-600" />
                        )}
                      </div>
                      <div className="font-display text-[17px] font-black tabular text-ink">
                        {num(Math.round(d.tmax ?? 25), s.lang)}°C
                      </div>
                      <div className="text-[11.5px] font-bold text-sky-800 mt-0.5">
                        {(d.rain ?? 0) > 0 ? `${num(d.rain, s.lang, { dp: 1 })} ${T('মিমি বৃষ্টি', 'mm rain')}` : T('বৃষ্টি নেই', 'No rain')}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* NASA Space Apps Feature 2: 1-Click Farmer Priority Selector */}
      <section className="space-y-3 rounded-3xl border border-emerald-300/60 bg-gradient-to-br from-emerald-50/70 via-white to-primary-50/50 p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-xl bg-emerald-200 text-emerald-900 font-black text-[15px]">🎯</span>
            <div>
              <h2 className="text-[19px] sm:text-[20px] font-black text-ink">
                {T('আপনার মূল চাওয়া কী? (১ ক্লিকে অগ্রাধিকার বাছাই)', 'What Matters Most to You? (1-Click Priorities)')}
              </h2>
              <p className="text-[12.5px] font-semibold text-muted">
                {T('আপনার পছন্দ চাপুন, নাসা সিস্টেম সাথে সাথে ফসলচক্র ও পরামর্শ পুনর্বিন্যাস করবে', 'Select your priorities to dynamically re-weight crop rotations')}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() =>
              playSpeech(
                T(
                  'আপনার আসল চাওয়া বাছাই করুন: সেচের পানি বাঁচানো, বেশি লাভ করা, মাটির উর্বরতা রক্ষা, কম ঝুঁকি রাখা বা গরুর খাবার পাওয়া। আপনার পছন্দের ওপর ভিত্তি করে সেরা ফসল বদলাবে।',
                  'Choose what matters most to you: saving irrigation water, higher profit, building soil health, lowering weather risk, or fodder for cattle. Your crop rotation adjusts instantly.'
                ),
                'priorities'
              )
            }
            className="flex items-center gap-1.5 rounded-xl border border-border bg-white px-3 py-1.5 text-[13px] font-bold text-ink hover:bg-primary-50 cursor-pointer shrink-0"
          >
            <Volume2 size={15} className="text-primary-700" />
            <span>{T('শুনুন', 'Listen')}</span>
          </button>
        </div>

        {/* Priority Toggle Pills */}
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6 pt-1">
          {priorityOptions.map((opt) => {
            const active = (s.priorities || []).includes(opt.id);
            const Icon = opt.icon;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => dispatch({ type: 'togglePriority', id: opt.id })}
                className={`flex flex-col items-start rounded-2xl p-3.5 text-left transition-all cursor-pointer ${
                  active
                    ? 'border-2 border-emerald-600 bg-emerald-600 text-white shadow-md scale-102 ring-2 ring-emerald-400/40'
                    : 'border border-border bg-white text-ink hover:border-emerald-400 hover:bg-emerald-50/50 shadow-2xs'
                }`}
              >
                <div className="flex w-full items-center justify-between mb-1">
                  <Icon size={20} className={active ? 'text-amber-200' : 'text-primary-700'} />
                  {active && <span className="rounded-full bg-white/20 px-1.5 py-0.2 text-[10px] font-black">✓</span>}
                </div>
                <div className="font-display text-[14px] font-black leading-tight">{opt.label}</div>
                <div className={`text-[11px] font-medium mt-0.5 ${active ? 'text-emerald-100' : 'text-muted'}`}>
                  {opt.sub}
                </div>
              </button>
            );
          })}
        </div>

        <div className="text-[12.5px] font-semibold text-ink/75 pt-1">
          {T(
            `বর্তমানে সক্রিয় অগ্রাধিকার: ${(s.priorities || []).length > 0 ? (s.priorities || []).map((p) => PRIORITIES[p]?.bn || p).join(', ') : 'সাধারণ ভারসাম্য (Default)'}।`,
            `Active priorities: ${(s.priorities || []).length > 0 ? (s.priorities || []).map((p) => PRIORITIES[p]?.en || p).join(', ') : 'Balanced defaults'}.`
          )}
        </div>
      </section>

      {/* NASA Space Apps Problem 2: Crop Recommendation & Optimal Sowing */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-xl bg-emerald-100 text-emerald-800 font-black text-[15px]">{num(2, s.lang)}</span>
            <h2 className="text-[20px] font-black text-ink">{T('আপনার জমিতে এবার কী ফসল লাগাবেন?', 'What crop to plant this Rabi?')}</h2>
          </div>
          <button
            type="button"
            onClick={() =>
              playSpeech(
                T(
                  `আপনার জমির মাটি ও আবহাওয়া অনুযায়ী এই মৌসুমে সবচেয়ে উপযোগী ফসল ${chosen.crop.name.bn}। বিঘা প্রতি আনুমানিক লাভ হবে ${num(chosen.netBigha, 'bn')} টাকা।`,
                  `For your soil and weather, the best crop this season is ${chosen.crop.name.en}. Expected profit is about ${num(chosen.netBigha, 'en')} taka per bigha.`
                ),
                'crop'
              )
            }
            className="flex items-center gap-1.5 rounded-xl border border-border bg-white px-3 py-1.5 text-[13px] font-bold text-ink hover:bg-primary-50 cursor-pointer"
          >
            <Volume2 size={15} className="text-primary-700" />
            <span>{T('শুনুন', 'Listen')}</span>
          </button>
        </div>

        <div className="overflow-hidden rounded-3xl border border-border bg-white p-6 sm:p-8 shadow-sm">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-4 sm:gap-5">
              <div className="grid h-16 w-16 sm:h-20 sm:w-20 shrink-0 place-items-center rounded-3xl bg-primary-100 text-primary-900 shadow-sm text-[32px] sm:text-[38px]">
                🌾
              </div>
              <div className="space-y-1">
                <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-0.5 text-[12px] font-bold text-emerald-800">
                  <Check size={14} />
                  <span>{T('১ম পছন্দের সেরা ফসল', 'Top 1st Choice Recommendation')}</span>
                </div>
                <h3 className="font-display text-[26px] sm:text-[32px] font-black text-ink">
                  {L(chosen.crop.name)}
                </h3>
                <p className="text-[14.5px] font-semibold text-muted">
                  {T(
                    `বপনের সময়: ${fmtBangla(chosen.hw.start, 'bn')} – ${fmtBangla(chosen.hw.end, 'bn')} (${fmtDate(chosen.hw.start, 'bn')})`,
                    `Sowing window: ${fmtDate(chosen.hw.start, 'en')} to ${fmtDate(chosen.hw.end, 'en')}`
                  )}
                </p>
              </div>
            </div>

            {/* Profit & Yield Badges */}
            <div className="grid grid-cols-2 gap-3 shrink-0 sm:flex sm:items-center">
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-3.5 text-center min-w-[130px]">
                <div className="flex items-center justify-center gap-1 text-[12px] font-bold text-emerald-800">
                  <Coins size={14} />
                  <span>{T('আনুমানিক লাভ', 'Expected Profit')}</span>
                </div>
                <div className="font-display mt-0.5 text-[20px] font-black text-emerald-950 tabular">
                  ৳ {num(chosen.netBigha, s.lang)}
                </div>
                <div className="text-[11px] text-emerald-700 font-semibold">{T('প্রতি বিঘা', 'per bigha')}</div>
              </div>

              <div className="rounded-2xl border border-primary-200 bg-primary-50/70 p-3.5 text-center min-w-[130px]">
                <div className="flex items-center justify-center gap-1 text-[12px] font-bold text-primary-800">
                  <Scale size={14} />
                  <span>{T('সম্ভাব্য ফলন', 'Expected Yield')}</span>
                </div>
                <div className="font-display mt-0.5 text-[20px] font-black text-primary-950 tabular">
                  {num(chosen.yieldMaunds, s.lang, { dp: 1 })} {T('মণ', 'maund')}
                </div>
                <div className="text-[11px] text-primary-700 font-semibold">{T('মোট জমিতে', 'total yield')}</div>
              </div>
            </div>
          </div>

          {/* Confirm & Plan CTA */}
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
            <div className="text-[13px] text-muted font-medium">
              {T(
                'এই সুপারিশ নাসা বৃষ্টিপাত ও মৃত্তিকা সম্পদ ইনস্টিটিউটের (SRDI) মাটির উর্বরতা হিসাব করে তৈরি।',
                'Based on NASA rainfall data and SRDI soil suitability records.'
              )}
            </div>
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={handleConfirmPlan}
                className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-[14px] font-bold shadow-2xs transition-all cursor-pointer ${
                  planConfirmed
                    ? 'bg-emerald-800 text-white'
                    : 'bg-primary-950 text-white hover:bg-primary-900 active:scale-95'
                }`}
              >
                <CheckCircle2 size={16} />
                <span>{planConfirmed ? T('✓ এই ফসল পাকা করেছি', '✓ Plan Confirmed') : T('এই ফসল নিশ্চিত করুন', 'Confirm this Crop')}</span>
              </button>
              <Link
                to="/farmer/plan"
                className="flex items-center gap-1 rounded-xl border border-border bg-white px-3 py-2.5 text-[13.5px] font-bold text-ink hover:bg-canvas"
              >
                <span>{T('বিকল্প ফসল', 'Other crops')}</span>
                <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* NASA Space Apps Core Challenge: 3-Strategy Rotation Comparison */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-2xl bg-amber-500 text-white font-black text-[17px] shadow-sm">
              <Sparkles size={18} />
            </span>
            <div>
              <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-bold text-amber-900">
                <span>{T('নাসা স্পেস অ্যাপস ২০২৬ মূল চ্যালেঞ্জ', 'NASA Space Apps 2026 Core Challenge')}</span>
              </div>
              <h2 className="text-[20px] sm:text-[23px] font-black text-ink">
                {T('৩টি বিকল্প ফসলচক্রের তুলনা (১০ বছরের রূপরেখা)', 'Compare 3 Rotation Strategies (10-Year Resilience)')}
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={() =>
              playSpeech(
                T(
                  'নাসা স্পেস অ্যাপসের ৩টি ফসলচক্র তুলনা: প্রথমটি আপনার বর্তমান চাষপদ্ধতি। দ্বিতীয়টি নাসার প্রস্তাবিত সেরা ফসলচক্র যা দশ বছরে মাটির জৈব পদার্থ বাড়ায় এবং সেচের পানি বাঁচায়। তৃতীয়টি ভিন্ন ফসলের মাধ্যমে আবহাওয়া ও বাজারের ঝুঁকি কমানোর কৌশল।',
                  'Comparing three crop rotation strategies: first is your current practice; second is the top climate-adapted rotation that builds soil carbon and saves irrigation over ten years; third is a diversified alternative to spread weather and market risk.'
                ),
                'strategies-all'
              )
            }
            className="flex items-center gap-1.5 rounded-xl border border-border bg-white px-3.5 py-1.5 text-[13px] font-bold text-ink hover:bg-primary-50 cursor-pointer shrink-0 self-start sm:self-auto"
          >
            <Volume2 size={16} className="text-primary-700" />
            <span>{T('🔊 ফসলচক্র তুলনা শুনুন', '🔊 Listen to Rotations')}</span>
          </button>
        </div>

        <p className="text-[14px] text-muted leading-relaxed">
          {T(
            'নাসার উপগ্রহ উপাত্ত (SMAP, GPM, ECOSTRESS, Landsat, GRACE, SRTM) এবং মাটির উর্বরতা মিলিয়ে ৩টি বিকল্প সাজানো হয়েছে। প্রতিটি চক্রে কেন এই পরামর্শ, কী বৈজ্ঞানিক প্রমাণ আছে, কী লাভ ও স্থানীয় কী ঝুঁকি আছে তা নিচে দেখুন:',
            'Comparing 3 strategies using NASA Earth observations and local soil records. Explore why each is suggested, evidence, benefits, gaps, and local risks:'
          )}
        </p>

        {/* 3 Strategy Cards */}
        <div className="space-y-4">
          {strategiesList.map((strat) => {
            const isExpanded = expandedStrategy === strat.id;
            const b = ff.habit.sNow;
            const dWater = Math.round((b.waterMm - strat.s.waterMm) * WATER_M3_PER_MM_BIGHA);
            const dSoc = strat.s.dSoc - b.dSoc;
            const dMoney = Math.round(strat.s.money - b.money);
            const urea = Math.round(ureaSavedKgPerBigha(strat.s.nFix) * 10) / 10;
            const riskPct = Math.round((strat.s.risk ?? 0) * 100);

            return (
              <div
                key={strat.id}
                className={`overflow-hidden rounded-3xl border-2 bg-white shadow-sm transition-all ${
                  strat.borderColor
                }`}
              >
                {/* Strategy Header */}
                <div className={`p-5 sm:p-6 ${strat.headerBg}`}>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-start gap-3.5">
                      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-primary-950 text-white font-black text-[16px]">
                        {strat.number}
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`rounded-full px-2.5 py-0.5 text-[11px] border ${strat.badgeColor}`}>
                            {strat.tag}
                          </span>
                        </div>
                        <h3 className="font-display text-[19px] sm:text-[22px] font-black text-ink mt-1">
                          {strat.title}
                        </h3>
                        <p className="text-[13px] font-medium text-muted">{strat.subtitle}</p>
                      </div>
                    </div>

                    {/* Voice Readout for this Strategy */}
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() =>
                          playSpeech(
                            T(
                              `${strat.title}। ফসলচক্র: ${formatRot(strat.rot)}। ${
                                strat.id === 'habit'
                                  ? 'এতে মাটির স্বাস্থ্য উন্নত হয় না এবং পানির ব্যবহার বেশি।'
                                  : `দশ বছরে মাটির জৈব পদার্থ বাড়বে ${num(Math.abs(dSoc), 'bn', { dp: 1 })} শতাংশ। বিঘায় বছরে সেচ বাঁচবে প্রায় ${num(Math.abs(dWater), 'bn')} ঘনমিটার।`
                              } ${strat.brief?.why?.[0]?.bn || ''}`,
                              `${strat.title}. Rotation: ${formatRot(strat.rot)}. ${
                                strat.id === 'habit'
                                  ? 'Baseline practice does not build soil organic matter and uses more irrigation water.'
                                  : `Over ten years, soil organic matter changes by ${num(Math.abs(dSoc), 'en', { dp: 1 })} percent and irrigation drops by about ${num(Math.abs(dWater), 'en')} cubic metres per bigha a year.`
                              } ${strat.brief?.why?.[0]?.en || ''}`
                            ),
                            `strat_${strat.id}`
                          )
                        }
                        className="flex items-center gap-1 rounded-xl border border-border bg-white px-3 py-1.5 text-[12.5px] font-bold text-ink hover:bg-canvas cursor-pointer shadow-2xs"
                      >
                        <Volume2 size={15} className="text-primary-700" />
                        <span>{T('শুনুন', 'Listen')}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setExpandedStrategy(isExpanded ? null : strat.id)}
                        className="flex items-center gap-1 rounded-xl bg-primary-950 px-3.5 py-1.5 text-[12.5px] font-bold text-white hover:bg-primary-900 cursor-pointer shadow-2xs"
                      >
                        <span>{isExpanded ? T('সংক্ষেপ করুন', 'Collapse') : T('নাসার ৫টি প্রমাণ দেখুন', 'See 5 Pillars')}</span>
                        {isExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                      </button>
                    </div>
                  </div>

                  {/* Crop Cycle String */}
                  <div className="mt-3.5 flex items-center gap-2 rounded-2xl bg-white/90 border border-black/10 px-4 py-2.5 text-[14px] font-bold text-emerald-950">
                    <span className="text-[16px]">🔄</span>
                    <span className="font-semibold">{T('ফসলের ক্রম:', 'Rotation Cycle:')}</span>
                    <span className="font-mono text-ink">{formatRot(strat.rot)}</span>
                  </div>

                  {/* Key Metrics Strip */}
                  <div className="mt-3.5 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                    {/* 1. Soil Organic Matter */}
                    <div className="rounded-2xl border border-border bg-white p-3 text-center shadow-2xs">
                      <div className="text-[11px] font-bold text-muted flex items-center justify-center gap-1">
                        <Sprout size={13} className="text-emerald-700" />
                        <span>{T('১০ বছরে মাটির জৈব পদার্থ', '10-Yr Soil Carbon')}</span>
                      </div>
                      <div className={`font-display text-[18px] font-black mt-0.5 ${strat.s.dSoc >= 0 ? 'text-emerald-700' : 'text-amber-800'}`}>
                        {strat.s.dSoc >= 0 ? '+' : ''}{num(strat.s.dSoc, s.lang, { dp: 1 })}%
                      </div>
                      <div className="text-[10.5px] font-semibold text-muted">
                        {strat.id === 'habit' ? T('বর্তমান অবস্থা', 'Baseline') : `${dSoc >= 0 ? '+' : ''}${num(dSoc, s.lang, { dp: 1 })}% ${T('সাশ্রয়ী বৃদ্ধি', 'gain')}`}
                      </div>
                    </div>

                    {/* 2. Water Saved */}
                    <div className="rounded-2xl border border-border bg-white p-3 text-center shadow-2xs">
                      <div className="text-[11px] font-bold text-muted flex items-center justify-center gap-1">
                        <Droplets size={13} className="text-sky-700" />
                        <span>{T('বার্ষিক সেচের পানি', 'Annual Irrigation')}</span>
                      </div>
                      <div className="font-display text-[18px] font-black mt-0.5 text-sky-950">
                        {num(Math.round(strat.s.waterMm * WATER_M3_PER_MM_BIGHA), s.lang)} {T('ঘনমিটার/বিঘা', 'm³/bigha')}
                      </div>
                      <div className="text-[10.5px] font-semibold text-sky-800">
                        {strat.id === 'habit'
                          ? T('বর্তমান পানির খরচ', 'Baseline use')
                          : dWater > 0
                          ? `💧 ${num(dWater, s.lang)} ${T('ঘনমিটার পানি বাঁচে', 'm³ saved')}`
                          : T('সমান পানি', 'Similar use')}
                      </div>
                    </div>

                    {/* 3. Profit */}
                    <div className="rounded-2xl border border-border bg-white p-3 text-center shadow-2xs">
                      <div className="text-[11px] font-bold text-muted flex items-center justify-center gap-1">
                        <Coins size={13} className="text-amber-700" />
                        <span>{T('বার্ষিক মোট লাভ', 'Annual Profit')}</span>
                      </div>
                      <div className="font-display text-[18px] font-black mt-0.5 text-ink">
                        ৳ {num(Math.round(strat.s.money), s.lang)}
                      </div>
                      <div className="text-[10.5px] font-semibold text-emerald-800">
                        {strat.id === 'habit'
                          ? T('বর্তমান লাভ', 'Baseline profit')
                          : dMoney > 0
                          ? `+৳ ${num(dMoney, s.lang)} ${T('বেশি', 'more')}`
                          : T('বাজারের দাম সাপেক্ষে', 'Market dependent')}
                      </div>
                    </div>

                    {/* 4. Weather Risk */}
                    <div className="rounded-2xl border border-border bg-white p-3 text-center shadow-2xs">
                      <div className="text-[11px] font-bold text-muted flex items-center justify-center gap-1">
                        <Flame size={13} className="text-amber-600" />
                        <span>{T('আবহাওয়ার ঝুঁকি', 'Weather Risk')}</span>
                      </div>
                      <div className="font-display text-[18px] font-black mt-0.5 text-ink">
                        {num(riskPct, s.lang)}%
                      </div>
                      <div className="text-[10.5px] font-semibold text-muted">
                        {T('১৩ মৌসুমে সীমা অতিক্রম', 'Seasons crossing limits')}
                      </div>
                    </div>
                  </div>
                </div>

                {/* The 5 NASA Pillars (Expandable Deep Dive) */}
                {isExpanded && (
                  <div className="border-t border-border bg-canvas/40 p-5 sm:p-6 space-y-4 animate-fadeIn">
                    <div className="text-[13px] font-extrabold uppercase tracking-wider text-muted">
                      {T('নাসা স্পেস অ্যাপস নির্দেশিত ৫টি মূল্যায়ন স্তম্ভ:', '5 NASA Space Apps Evaluation Pillars:')}
                    </div>

                    <div className="grid gap-3.5 sm:grid-cols-2">
                      {/* Pillar 1: Why Suggested */}
                      <div className="rounded-2xl border border-border bg-white p-4 shadow-2xs">
                        <div className="flex items-center gap-2 text-primary-900 font-bold text-[14px] mb-2">
                          <span className="grid h-6 w-6 place-items-center rounded-lg bg-primary-100 text-[12px]">💡</span>
                          <span>{T('১. কেন এই পরামর্শ', '1. Why Suggested')}</span>
                        </div>
                        <ul className="space-y-1.5 text-[13px] text-ink/90 font-medium">
                          {strat.brief.why.slice(0, 3).map((w, i) => (
                            <li key={i} className="flex items-start gap-1.5">
                              <span className="text-primary-700 font-bold shrink-0">•</span>
                              <span>{T(w.bn, w.en)}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Pillar 2: Evidence */}
                      <div className="rounded-2xl border border-border bg-white p-4 shadow-2xs">
                        <div className="flex items-center gap-2 text-sky-900 font-bold text-[14px] mb-2">
                          <span className="grid h-6 w-6 place-items-center rounded-lg bg-sky-100 text-[12px]">🛰️</span>
                          <span>{T('২. নাসার উপাত্তের প্রমাণ', '2. Evidence Supporting')}</span>
                        </div>
                        <ul className="space-y-1.5 text-[13px] text-ink/90 font-medium">
                          {strat.brief.evidence.slice(0, 3).map((ev, i) => (
                            <li key={i} className="flex items-start gap-1.5">
                              <span className="text-sky-700 font-bold shrink-0">•</span>
                              <span>{T(ev.bn, ev.en)}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Pillar 3: Benefits */}
                      <div className="rounded-2xl border border-border bg-white p-4 shadow-2xs">
                        <div className="flex items-center gap-2 text-emerald-900 font-bold text-[14px] mb-2">
                          <span className="grid h-6 w-6 place-items-center rounded-lg bg-emerald-100 text-[12px]">🌟</span>
                          <span>{T('৩. সুবিধা ও সুফল', '3. Benefits Offered')}</span>
                        </div>
                        <ul className="space-y-1.5 text-[13px] text-ink/90 font-medium">
                          {strat.brief.benefits.slice(0, 3).map((ben, i) => (
                            <li key={i} className="flex items-start gap-1.5">
                              <span className="text-emerald-700 font-bold shrink-0">•</span>
                              <span>{T(ben.bn, ben.en)}</span>
                            </li>
                          ))}
                          {urea > 0 && (
                            <li className="flex items-start gap-1.5 text-emerald-800 font-bold">
                              <span className="shrink-0">•</span>
                              <span>{T(`ডালের নাইট্রোজেনে বছরে বিঘায় প্রায় ${num(urea, 'bn')} কেজি ইউরিয়া সার সাশ্রয়।`, `Saves ~${num(urea, 'en')} kg urea/bigha/yr via biological nitrogen fixation.`)}</span>
                            </li>
                          )}
                        </ul>
                      </div>

                      {/* Pillar 4: Information Gaps */}
                      <div className="rounded-2xl border border-border bg-white p-4 shadow-2xs">
                        <div className="flex items-center gap-2 text-amber-900 font-bold text-[14px] mb-2">
                          <span className="grid h-6 w-6 place-items-center rounded-lg bg-amber-100 text-[12px]">🔍</span>
                          <span>{T('৪. তথ্যের সীমাবদ্ধতা', '4. Information Gaps')}</span>
                        </div>
                        <ul className="space-y-1.5 text-[13px] text-ink/90 font-medium">
                          {strat.brief.gaps.slice(0, 3).map((gap, i) => (
                            <li key={i} className="flex items-start gap-1.5">
                              <span className="text-amber-700 font-bold shrink-0">•</span>
                              <span>{T(gap.bn, gap.en)}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    {/* Pillar 5: Local Risks & Officer Review */}
                    <div className="rounded-2xl border border-red-200 bg-red-50/60 p-4">
                      <div className="flex items-center gap-2 text-red-950 font-bold text-[14px] mb-2">
                        <AlertTriangle size={18} className="text-red-700 shrink-0" />
                        <span>{T('৫. স্থানীয় ঝুঁকি ও কৃষি কর্মকর্তার পরামর্শ', '5. Local Risks & Officer Review')}</span>
                      </div>
                      <ul className="space-y-1.5 text-[13px] text-red-950 font-medium">
                        {strat.brief.risks.slice(0, 3).map((risk, i) => (
                          <li key={i} className="flex items-start gap-1.5">
                            <span className="text-red-600 font-bold shrink-0">•</span>
                            <span>{T(risk.bn, risk.en)}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* NASA Space Apps Feature 3: Bare-Field & Climate Risk Timeline */}
      <section className="space-y-3 rounded-3xl border border-border bg-white p-6 sm:p-8 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-2xl bg-amber-100 text-amber-900 font-black text-[16px]">
              <Calendar size={18} />
            </span>
            <div>
              <h2 className="text-[19px] sm:text-[21px] font-black text-ink">
                {T('জমি ফাঁকা থাকার সময় ও ফসলের ঝুঁকি ক্যালেন্ডার', 'Bare-Field Window & Crop Vulnerability Calendar')}
              </h2>
              <p className="text-[12.5px] font-semibold text-muted">
                {T('কখন জমি ফাঁকা থেকে আর্দ্রতা হারায় এবং কখন তাপদাহ ও প্লাবনের ঝুঁকি থাকে', 'Highlighting fallow gaps, heat spikes & flood submergence')}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() =>
              playSpeech(
                T(
                  'জমি ফাঁকা থাকার সময় ও ফসলের ঝুঁকি: ফসল কাটার পর জমি যখন খালি থাকে তখন প্রখর রোদে মাটির রস শুকিয়ে যায় এবং কালবৈশাখীর বৃষ্টিতে উর্বর মাটি ধুয়ে যায়। এখানে ডাল বা কভার ক্রপ লাগালে মাটি রক্ষা পায়। অন্যদিকে চৈত্র মাসে বোরো ধানের ফুল ফোটার সময় ৩৫ ডিগ্রির বেশি তাপদাহে ধানের চিটা হওয়ার চরম ঝুঁকি থাকে।',
                  'Bare-field gaps and crop vulnerability: leaving fields bare after harvest lets sun dry the topsoil and storms wash nutrients away; legume cover crops protect the soil. Also, temperatures above 35 degrees Celsius during Boro rice flowering risk spikelet sterility.'
                ),
                'calendar-speech'
              )
            }
            className="flex items-center gap-1.5 rounded-xl border border-border bg-white px-3 py-1.5 text-[13px] font-bold text-ink hover:bg-primary-50 cursor-pointer shrink-0"
          >
            <Volume2 size={15} className="text-primary-700" />
            <span>{T('শুনুন', 'Listen')}</span>
          </button>
        </div>

        <div className="grid gap-3.5 sm:grid-cols-3 pt-2">
          {/* Risk 1: Bare Field Fallow Gap */}
          <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4 space-y-2 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[20px]">🍂</span>
              <span className="rounded-full bg-amber-200 px-2.5 py-0.5 text-[10.5px] font-bold text-amber-950">
                {T('চৈত্র–বৈশাখ / কার্তিক', 'Fallow Months')}
              </span>
            </div>
            <h3 className="text-[15.5px] font-black text-amber-950 leading-tight">
              {T('জমি ফাঁকা থাকার ঝুঁকি', 'Bare-Field Soil Loss')}
            </h3>
            <p className="text-[12.5px] text-amber-900/90 font-medium leading-relaxed">
              {T(
                'ফসল তোলার পর জমি খালি থাকলে MODIS ও MERRA-2 উপাত্ত অনুযায়ী ভূপৃষ্ঠের তাপ ৪২°সে ছাড়ায়; মাটির অবশিষ্ট রস দ্রুত বাষ্প হয়ে উড়ে যায় এবং প্রথম কালবৈশাখীর বৃষ্টিতে উর্বর দোআঁশ ক্ষয় হয়।',
                'Landsat/MODIS shows bare soil surface exceeds 42°C; moisture evaporates rapidly and early nor’wester rains wash topsoil away.'
              )}
            </p>
            <div className="rounded-xl bg-white/80 p-2 text-[11.5px] font-bold text-emerald-800">
              {T('💡 সমাধান: মুগ ডাল বা ধইঞ্চা কভার ক্রপ লাগালে শিকড় আর্দ্রতা ধরে রাখে।', '💡 Fix: Legume cover crops keep living roots and conserve moisture.')}
            </div>
          </div>

          {/* Risk 2: Boro Flowering Heatwave Spike */}
          <div className="rounded-2xl border border-red-200 bg-red-50/60 p-4 space-y-2 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[20px]">🔥</span>
              <span className="rounded-full bg-red-200 px-2.5 py-0.5 text-[10.5px] font-bold text-red-950">
                {T('চৈত্র মাসে ফুল ফোটা', 'Flowering Period')}
              </span>
            </div>
            <h3 className="text-[15.5px] font-black text-red-950 leading-tight">
              {T('বোরো ধানের চিটা ঝুঁকি (>৩৫°সে)', 'Boro Spikelet Sterility (>35°C)')}
            </h3>
            <p className="text-[12.5px] text-red-900/90 font-medium leading-relaxed">
              {T(
                'NASA POWER ও ECOSTRESS-এর ১৩ বছরের তথ্যে দেখা যায়, ফুল ফোটার সময় টানা ৩ দিন তাপমাত্রা ৩৫°সে-এর ওপরে উঠলে পরাগরেণু নষ্ট হয়ে ৩০-৪০% চিটা ধান তৈরি হয়।',
                'NASA POWER & ECOSTRESS show >35°C for 3 consecutive days during anthesis causes pollen sterility and 30-40% yield loss.'
              )}
            </p>
            <div className="rounded-xl bg-white/80 p-2 text-[11.5px] font-bold text-red-800">
              {T('💡 সমাধান: জমিতে সেচের পানি ধরে রেখে ঠান্ডা রাখা অথবা সরিষা/গম চক্র।', '💡 Fix: Maintain standing water to cool canopy or shift to mustard/wheat.')}
            </div>
          </div>

          {/* Risk 3: Monsoon Delayed Rain & Lowland Flood */}
          <div className="rounded-2xl border border-sky-200 bg-sky-50/60 p-4 space-y-2 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[20px]">🌊</span>
              <span className="rounded-full bg-sky-200 px-2.5 py-0.5 text-[10.5px] font-bold text-sky-950">
                {T('আষাঢ়–শ্রাবণ রোপণ', 'Transplanting Window')}
              </span>
            </div>
            <h3 className="text-[15.5px] font-black text-sky-950 leading-tight">
              {T('বৃষ্টির অনিয়ম ও নিচু জমিতে প্লাবন', 'Delayed Monsoon & Submergence')}
            </h3>
            <p className="text-[12.5px] text-sky-900/90 font-medium leading-relaxed">
              {T(
                'GPM উপগ্রহে বর্ষা দেরিতে আসার সংকেত থাকলে আমন রোপণ পিছিয়ে যায়। আবার NASA SRTM উচ্চতা অনুযায়ী চারপাশের চেয়ে নিচু জমিতে হঠাৎ পানিতে চারা তলিয়ে যাওয়ার ঝুঁকি থাকে।',
                'GPM IMERG rain anomalies cause planting delays; SRTM DEM identifies low hollows at risk of sudden flood submergence.'
              )}
            </p>
            <div className="rounded-xl bg-white/80 p-2 text-[11.5px] font-bold text-sky-800">
              {T('💡 সমাধান: রোপণ রাডার সংকেত মেনে চলা ও সুব-১ বন্যা-সহনশীল জাত ব্যবহার।', '💡 Fix: Follow radar onset dates and plant Sub-1 submergence-tolerant rice.')}
            </div>
          </div>
        </div>
      </section>

      {/* NASA Space Apps Problem 3: Soil & Fertilizer Quantity (Visual Sacks) */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-xl bg-amber-100 text-amber-900 font-black text-[15px]">{num(3, s.lang)}</span>
            <h2 className="text-[20px] font-black text-ink">{T(`আপনার জমিতে কত কেজি সার লাগবে?`, 'Fertiliser needed for your field')}</h2>
          </div>
          <button
            type="button"
            onClick={() =>
              playSpeech(
                T(
                  `আপনার ${bnDigits(farmer.area_dec)} শতক জমিতে লাগবে: ${fertItems.map((i) => `${fertName(i.fertilizer, 'bn')} ${num(i.kg, 'bn')} কেজি`).join(', ')}।`,
                  `For your ${num(farmer.area_dec, 'en')} decimal field, apply: ${fertItems.map((i) => `${fertName(i.fertilizer, 'en')} ${num(i.kg, 'en')} kg`).join(', ')}.`
                ),
                'fert'
              )
            }
            className="flex items-center gap-1.5 rounded-xl border border-border bg-white px-3 py-1.5 text-[13px] font-bold text-ink hover:bg-primary-50 cursor-pointer"
          >
            <Volume2 size={15} className="text-primary-700" />
            <span>{T('শুনুন', 'Listen')}</span>
          </button>
        </div>

        <div className="rounded-3xl border border-border bg-white p-6 shadow-sm">
          <div className="text-[13.5px] font-semibold text-muted mb-4">
            {T(
              `মৃত্তিকা সম্পদ উন্নয়ন ইনস্টিটিউট (SRDI) নির্দেশিকা অনুযায়ী আপনার ${bnDigits(farmer.area_dec)} শতক জমির মোট সার:`,
              `Exact fertiliser quantities for your ${num(farmer.area_dec, 'en')} decimal land from SRDI official charts:`
            )}
          </div>

          {/* Visual Fertiliser Sacks */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {fertItems.map((item, idx) => {
              const bgColors = [
                'bg-emerald-50 border-emerald-300 text-emerald-950',
                'bg-amber-50 border-amber-300 text-amber-950',
                'bg-blue-50 border-blue-300 text-blue-950',
                'bg-purple-50 border-purple-300 text-purple-950',
              ];
              const color = bgColors[idx % bgColors.length];
              return (
                <div key={item.fertilizer} className={`rounded-2xl border-2 p-4 text-center shadow-2xs ${color}`}>
                  <div className="text-[28px] mb-1">🛍️</div>
                  <div className="text-[13px] font-bold leading-tight">
                    {fertName(item.fertilizer, s.lang)}
                  </div>
                  <div className="font-display mt-1 text-[24px] font-black tabular">
                    {num(item.kg, s.lang)} {T('কেজি', 'kg')}
                  </div>
                  <div className="mt-1 text-[10.5px] font-semibold opacity-75">
                    {T('শেষ চাষে প্রয়োগ', 'Apply at final ploughing')}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-canvas p-3.5 text-[13px] text-muted">
            <span>
              {T(
                `আপনার জমির মাটি: ${physName(fp?.physiography, 'bn')}, অম্লমান: ${num(soil?.ph ?? 6.5, 'bn', { dp: 1 })} (উর্বর)। অতিরিক্ত সার দিলে টাকা নষ্ট হয়।`,
                `Soil: ${physName(fp?.physiography, 'en')}, pH ${num(soil?.ph ?? 6.5, 'en', { dp: 1 })} (Fertile). Avoid excess dosage.`
              )}
            </span>
            <Link to="/farmer/farm" className="font-bold text-primary-700 hover:underline">
              {soil?.tested ? T('মাটি পরীক্ষার ফল দেখুন →', 'See your soil test →') : T('মাটির বিস্তারিত দেখুন →', 'See soil details →')}
            </Link>
          </div>
        </div>
      </section>

      {/* NASA Space Apps Problem 4: Crop Doctor & Direct Pest Diagnosis */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-xl bg-purple-100 text-purple-900 font-black text-[15px]">{num(4, s.lang)}</span>
            <h2 className="text-[20px] font-black text-ink">{T('ফসলে রোগ বা পোকা ধরলে কী করবেন?', 'Pest or disease on your crop?')}</h2>
          </div>
          <button
            type="button"
            onClick={() =>
              playSpeech(
                T(
                  'ফসলের পাতায় দাগ বা পোকা দেখলে ক্যামেরা দিয়ে ছবি তুলুন। সাথে সাথে ওষুধ ও সমাধান পাবেন।',
                  'If you see leaf spots or pests on your crop, take a photo with your camera for instant diagnosis and eco-friendly treatment.'
                ),
                'doctor'
              )
            }
            className="flex items-center gap-1.5 rounded-xl border border-border bg-white px-3 py-1.5 text-[13px] font-bold text-ink hover:bg-primary-50 cursor-pointer"
          >
            <Volume2 size={15} className="text-primary-700" />
            <span>{T('শুনুন', 'Listen')}</span>
          </button>
        </div>

        <div className="rounded-3xl border border-border bg-white p-6 sm:p-8 shadow-sm">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-2">
              <h3 className="text-[20px] font-bold text-ink">
                {T('ক্যামেরা দিয়ে পাতার ছবি তুলুন', 'Snap a photo of the affected leaf')}
              </h3>
              <p className="text-[14.5px] font-medium text-muted max-w-xl">
                {T(
                  'মোবাইলের ক্যামেরা দিয়ে ফসলের ছবি তুললেই এআই এবং স্থানীয় কৃষি গাইডলাইন দেখে সরাসরি রোগের নাম ও কম খরচের সমাধান জানানো হবে।',
                  'Take a picture with your phone camera to get instant disease recognition and eco-friendly solutions.'
                )}
              </p>
            </div>

            <Link
              to="/farmer/doctor"
              className="inline-flex items-center justify-center gap-2.5 rounded-2xl bg-purple-700 px-6 py-4 text-[16px] font-black text-white shadow-md hover:bg-purple-800 active:scale-95 shrink-0"
            >
              <ScanLine size={22} />
              <span>{T('ক্যামেরা খুলুন', 'Open Camera')}</span>
            </Link>
          </div>
        </div>
      </section>

      {/* NASA Challenge Essential Principle: Supportive Tool & Human Judgment Notice */}
      <section className="rounded-3xl border border-emerald-300 bg-gradient-to-br from-emerald-50 via-white to-primary-50 p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-emerald-600 text-white shadow-sm">
              <ShieldCheck size={26} />
            </div>
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 text-[11.5px] font-bold uppercase tracking-wider text-emerald-800">
                <span>{T('নাসার মানবিক সহায়তা নীতি', 'NASA Human Judgment Principle')}</span>
              </div>
              <h3 className="text-[17px] sm:text-[18px] font-black text-ink">
                {T('সহায়ক প্রযুক্তি · কৃষকের বাস্তব সিদ্ধান্তই প্রধান', 'Supportive Tool • Farmer Judgment is Paramount')}
              </h3>
              <p className="text-[13.5px] text-muted font-medium max-w-2xl leading-relaxed">
                {T(
                  'নাসা স্পেস অ্যাপসের লক্ষ্য হলো তথ্য দিয়ে কৃষককে সহায়তা করা, কৃষকের নিজস্ব বাস্তব বিচার-বুদ্ধি কিংবা স্থানীয় উপসহকারী কৃষি কর্মকর্তার (SAAO) অভিজ্ঞতাকে প্রতিস্থাপন করা নয়। যে কোনো নতুন ফসলচক্র শুরু করার আগে উপজেলা কৃষি অফিসে যোগাযোগ করুন।',
                  'This decision-support tool identifies patterns and possibilities from NASA Earth observations, but does not replace farmer judgment or local agricultural expertise. Consult your Upazila Agriculture Office before planting.'
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
            <Link
              to="/officer"
              className="inline-flex items-center gap-2 rounded-2xl bg-emerald-800 px-4 py-2.5 text-[13px] font-bold text-white shadow-xs hover:bg-emerald-900 active:scale-95"
            >
              <PhoneCall size={15} />
              <span>{T('কৃষি কর্মকর্তার পরামর্শ নিন', 'Consult Agriculture Officer')}</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Voice-First Chakra Assistant: Low-Literacy Voice Assistant */}
      <section className="rounded-3xl border-2 border-primary-800 bg-gradient-to-br from-primary-950 via-primary-900 to-primary-950 p-6 sm:p-8 text-white shadow-xl">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <div className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-primary-950 text-white ring-2 ring-emerald-400/50 shadow-inner">
              <ChakraLogo size={38} />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 text-[12.5px] font-bold text-emerald-300">
                <Sparkles size={14} />
                <span>{T('মুখের কথায় প্রশ্ন করুন', 'Ask with your voice')}</span>
              </div>
              <h3 className="font-display text-[22px] sm:text-[26px] font-black">
                {T('চক্র এআই ভয়েস সহকারী', 'Chakra Voice Assistant')}
              </h3>
              <p className="text-[14px] text-emerald-100/80 font-medium">
                {T('লিখতে না জানলেও সমস্যা নেই, মুখে বললেই উত্তর দেবে।', 'No need to type; just speak and listen.')}
              </p>
            </div>
          </div>

          <Link
            to="/farmer/voice"
            className="flex items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-6 py-3.5 text-[15px] font-black text-primary-950 shadow-lg hover:bg-emerald-400 active:scale-95 shrink-0"
          >
            <Mic size={20} />
            <span>{T('কথা বলা শুরু করুন', 'Start Talking')}</span>
          </Link>
        </div>

        {/* Quick Voice Chips */}
        <div className="mt-5 border-t border-white/10 pt-4">
          <span className="text-[12px] font-bold text-white/70 block mb-2">
            {T('সরাসরি জিজ্ঞাসা করতে পারেন:', 'Common questions you can ask:')}
          </span>
          <div className="flex flex-wrap gap-2">
            {[
              T('আজ জমিতে পানি দেওন লাগবো?', 'Do I need to water today?'),
              T('এবার জমিতে কোন ফসল লাগামু?', 'Which crop to plant?'),
              T('ইউরিয়া সার কয় কেজি দিমু?', 'How many kg urea?'),
              T('উপসহকারী স্যারের নম্বর দেন', 'Officer contact number'),
            ].map((chip) => (
              <Link
                key={chip}
                to="/farmer/voice"
                className="rounded-xl bg-white/10 px-3.5 py-1.5 text-[13px] font-semibold text-white hover:bg-white/20 transition-all"
              >
                "{chip}"
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Switch to Advance Mode banner at footer, with Chakra Orb integrated */}
      <div className="rounded-3xl border border-emerald-500/30 bg-gradient-to-br from-emerald-50/70 via-canvas to-primary-50/60 p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3.5 text-left">
            <ChakraOrb
              size={54}
              onClick={() => {
                window.dispatchEvent(new CustomEvent('open-chakra'));
              }}
              label={T('চক্র এজেন্টের সাথে কথা বলুন', 'Talk to Chakra Agent')}
            />
            <div>
              <div className="text-[12px] font-extrabold uppercase tracking-wider text-emerald-800">
                {T('চক্র সহকারী ও উন্নত বিজ্ঞান মোড', 'Chakra Assistant & Advanced Science Mode')}
              </div>
              <p className="text-[13.5px] font-medium text-ink/80 mt-0.5">
                {T(
                  'আপনি এখন সহজ মোডে আছেন। উপগ্রহ চিত্র, ১০ বছরের মাটির কার্বন মডেল ও বিশদ চার্ট দেখতে চান?',
                  'You are currently in Simple Mode. Want to see satellite imagery, 10-year soil carbon models & full science charts?'
                )}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => dispatch({ type: 'set', patch: { farmerMode: 'advanced' } })}
              className="inline-flex items-center gap-2 rounded-xl bg-primary-950 px-4 py-2.5 text-[13px] font-bold text-white shadow-2xs hover:bg-primary-900 active:scale-95 cursor-pointer"
            >
              <SlidersHorizontal size={15} className="text-paddy-300" />
              <span>{T('⚡ উন্নত মোডে পরিবর্তন করুন', '⚡ Switch to Advanced Mode')}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
