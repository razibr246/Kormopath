// Spoken Voice Briefing for rural farmers.
// Spoken in the natural voice (src/voice/speech.js speakNatural: Bangladeshi Bangla, British English), with the
// device's own voice as the fallback.
// Reads aloud today's irrigation recommendation, rain forecast, and spray timing.
import { useState, useEffect, useRef } from 'react';
import { Volume2, VolumeX, Play, Pause, RotateCcw, Sparkles } from 'lucide-react';
import { useStore } from '../../store';
import { num, fmtBangla, fmtDate } from '../../engine/dates';
import { speakNatural, stopSpeaking, ttsSupported } from '../../voice/speech';

export default function SpokenTodayBrief({ crop, water, weather, dToday }) {
  const { s, T, L, farmer } = useStore();
  const lang = s.lang;
  const [speaking, setSpeaking] = useState(false);
  const [supported, setSupported] = useState(false);

  useEffect(() => {
    setSupported(ttsSupported());
    return () => stopSpeaking();
  }, []);

  const buildScript = () => {
    if (lang === 'bn') {
      const cropName = crop?.name?.bn || 'ফসল';
      const waterStatus = water?.color === 'GREEN'
        ? 'মাটিতে পর্যাপ্ত রস আছে, আজ সেচ দেওয়ার দরকার নেই।'
        : water?.color === 'RED'
        ? 'মাটিতে পানির টান পড়েছে, আজই সেচ দেওয়া জরুরি।'
        : 'মাটি শুকিয়ে আসছে, আগামী দুই দিনের মধ্যে সেচ দেওয়ার প্রস্তুতি নিন।';

      const rainText = weather?.rain
        ? `আজ প্রায় ${num(Math.round(weather.rain), 'bn')} মিলিমিটার বৃষ্টির সম্ভাবনা রয়েছে।`
        : 'আজ বৃষ্টির তেমন সম্ভাবনা নেই।';

      return `আসসালামু আলাইকুম ${farmer?.name?.bn || 'কৃষক ভাই'}। আপনার ${cropName} জমির আজকের বার্তা। ${waterStatus} ${rainText} জমিতে ওষুধ স্প্রে করার আগে বাতাসের গতি দেখে নিন। ধন্যবাদ।`;
    } else {
      const cropName = crop?.name?.en || 'crop';
      const waterStatus = water?.color === 'GREEN'
        ? 'Soil moisture is sufficient, no irrigation needed today.'
        : water?.color === 'RED'
        ? 'Root zone water is critically low, urgent irrigation required today.'
        : 'Soil moisture is depleting, prepare to irrigate within two days.';

      const rainText = weather?.rain
        ? `About ${Math.round(weather.rain)} mm of rain is forecast today.`
        : 'No significant rain is expected today.';

      return `Hello ${farmer?.name?.en || 'Farmer'}. Here is today's briefing for your ${cropName}. ${waterStatus} ${rainText} Check wind speeds before spraying crop protection.`;
    }
  };

  const handleSpeak = () => {
    if (!supported) return;
    stopSpeaking();
    if (speaking) { setSpeaking(false); return; }
    setSpeaking(true);
    speakNatural(buildScript(), lang, { rate: lang === 'bn' ? 0.95 : 1, onEnd: () => setSpeaking(false) })
      .then((r) => { if (!r?.ok) setSpeaking(false); }, () => setSpeaking(false));
  };

  if (!supported) return null;

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={handleSpeak}
        className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-[13.5px] font-semibold transition shadow-sm active:scale-95 ${
          speaking
            ? 'bg-rose-600 text-white animate-pulse'
            : 'bg-emerald-700 text-white hover:bg-emerald-800'
        }`}
        aria-label={speaking ? T('ভয়েস থামান', 'Stop voice') : T('ভয়েস সারাংশ শুনুন', 'Listen to voice summary')}
      >
        {speaking ? <VolumeX size={16} /> : <Volume2 size={16} />}
        <span>
          {speaking
            ? T('ভয়েস থামান', 'Stop Voice')
            : T('আজকের কাজের ভয়েস শুনুন', 'Listen to Daily Briefing')}
        </span>
      </button>
    </div>
  );
}
