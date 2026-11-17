import { useStore } from '../../store';
import { Sparkles, SlidersHorizontal } from 'lucide-react';

function playChime(isSimple) {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(isSimple ? 587.33 : 440, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(isSimple ? 880 : 330, ctx.currentTime + 0.12);
    gain.gain.setValueAtTime(0.06, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.14);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.15);
  } catch {}
}

export default function FarmerModeSwitch({ className = '', compact = false }) {
  const { s, dispatch, T, toast } = useStore();
  const isSimple = s.farmerMode === 'simple';

  const setMode = (mode) => {
    if (s.farmerMode === mode) return;
    dispatch({ type: 'set', patch: { farmerMode: mode } });
    playChime(mode === 'simple');
    if (mode === 'simple') {
      toast(
        'সহজ মোড সক্রিয়: শুধু কৃষকের জরুরি মূল সমাধান (সেচ, ফসল, সার ও রোগবালাই)',
        'Simple Mode active: essential farmer problem solving (water, crop, fertiliser & pest)'
      );
    } else {
      toast(
        'উন্নত মোড সক্রিয়: উপগ্রহ মানচিত্র, জলবায়ু মডেল ও পূর্ণ বৈজ্ঞানিক হিসাব',
        'Advanced Mode active: satellite passes, climate projections & full science suite'
      );
    }
  };

  return (
    <div
      className={`farmer-mode-switch relative shrink-0 inline-flex h-9 sm:h-10 items-center rounded-xl sm:rounded-2xl border border-black/[0.08] bg-black/[0.04] p-1 shadow-2xs backdrop-blur-xl select-none ${className}`}
      role="radiogroup"
      aria-label={T('মোড বাছাই (সহজ বনাম উন্নত)', 'Farmer mode selector (Simple vs Advanced)')}
    >
      {/* Sliding animated & shining macOS-style pill thumb */}
      <div
        className="absolute top-1 bottom-1 left-1 w-[calc(50%-4px)] rounded-[9px] sm:rounded-xl pointer-events-none transition-transform duration-250 ease-[cubic-bezier(0.2,0.9,0.3,1)] overflow-hidden z-0"
        style={{
          transform: isSimple ? 'translateX(0)' : 'translateX(100%)',
        }}
        aria-hidden="true"
      >
        {/* Simple mode glowing surface (Apple Emerald) */}
        <div
          className={`absolute inset-0 rounded-[9px] sm:rounded-xl bg-[linear-gradient(180deg,#10b981_0%,#059669_100%)] ring-[0.5px] ring-black/10 mode-thumb-simple transition-opacity duration-200 ${
            isSimple ? 'opacity-100' : 'opacity-0'
          }`}
        />

        {/* Advanced mode glowing surface (Apple Deep Forest) */}
        <div
          className={`absolute inset-0 rounded-[9px] sm:rounded-xl bg-[linear-gradient(180deg,#1a3a25_0%,#0d2215_100%)] ring-[0.5px] ring-black/20 mode-thumb-advanced transition-opacity duration-200 ${
            !isSimple ? 'opacity-100' : 'opacity-0'
          }`}
        />

        {/* Specular gloss top edge highlight */}
        <div className="absolute inset-x-0 top-0 h-[0.75px] bg-white/40 pointer-events-none z-[3]" />

        {/* Animated shining beam reflection */}
        <div className="mode-shine-beam" />
      </div>

      {/* Side 1: Simple Mode (সহজ মোড) */}
      <button
        type="button"
        role="radio"
        aria-checked={isSimple}
        onClick={() => setMode('simple')}
        className={`relative z-10 flex flex-1 h-full items-center justify-center gap-1.5 rounded-[9px] sm:rounded-xl px-2.5 sm:px-3 text-center transition-all duration-150 cursor-pointer ${
          isSimple
            ? 'text-white font-semibold sm:font-bold drop-shadow-[0_0.5px_0.5px_rgba(0,0,0,0.35)]'
            : 'text-ink/80 hover:text-ink active:scale-95 font-semibold'
        }`}
        title={T('সহজ মোড: স্বল্প-শিক্ষিত কৃষকের জন্য সহজ ভাষা ও জরুরি সমাধান', 'Simple Mode: easy language and core solutions for smallholders')}
      >
        <Sparkles
          size={16}
          className={`shrink-0 transition-all duration-200 ${
            isSimple
              ? 'text-white mode-sparkle-anim drop-shadow-[0_0_3px_rgba(255,255,255,0.85)]'
              : 'text-emerald-700'
          }`}
        />
        <span className="text-[13.5px] sm:text-[14px] font-semibold sm:font-bold tracking-tight whitespace-nowrap">
          {T('সহজ মোড', 'Simple Mode')}
        </span>
      </button>

      {/* Side 2: Advance Mode (উন্নত মোড) */}
      <button
        type="button"
        role="radio"
        aria-checked={!isSimple}
        onClick={() => setMode('advanced')}
        className={`relative z-10 flex flex-1 h-full items-center justify-center gap-1.5 rounded-[9px] sm:rounded-xl px-2.5 sm:px-3 text-center transition-all duration-150 cursor-pointer ${
          !isSimple
            ? 'text-white font-semibold sm:font-bold drop-shadow-[0_0.5px_0.5px_rgba(0,0,0,0.35)]'
            : 'text-ink/80 hover:text-ink active:scale-95 font-semibold'
        }`}
        title={T('উন্নত মোড: উপগ্রহ মানচিত্র, জলবায়ু মডেল ও বিস্তারিত বৈজ্ঞানিক হিসাব', 'Advanced Mode: satellite maps, climate models & full science suite')}
      >
        <SlidersHorizontal
          size={15}
          className={`shrink-0 transition-all duration-200 ${
            !isSimple
              ? 'text-emerald-200 drop-shadow-[0_0_3px_rgba(52,211,153,0.5)]'
              : 'text-muted'
          }`}
        />
        <span className="text-[13.5px] sm:text-[14px] font-semibold sm:font-bold tracking-tight whitespace-nowrap">
          {T('উন্নত মোড', 'Advanced Mode')}
        </span>
      </button>
    </div>
  );
}
