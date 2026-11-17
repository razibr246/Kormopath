// When the field lies bare under one rotation: twelve months from November, each split into days under a crop
// (green), under kept straw (amber) and bare (red), from the same dates Field Future runs on (engine/fieldcalendar.js).
import { useStore } from '../../store';
import { rotationBare, MONTHS_BN, MONTHS_EN } from '../../engine/fieldcalendar.js';
import { num } from '../../engine/dates.js';

export default function BareStrip({ ctx, rot }) {
  const { s, T } = useStore();
  if (!ctx || !rot) return null;
  const lang = s.lang;
  const { first, meanBareDays } = rotationBare(ctx, rot);
  const names = lang === 'bn' ? MONTHS_BN : MONTHS_EN;
  return (
    <div className="mt-2.5 rounded-lg bg-canvas px-2 py-2">
      <div className="flex items-baseline justify-between gap-2 text-[12.5px]">
        <span className="text-muted">{T('জমি খালি থাকে', 'Field lies bare')}</span>
        <span className="font-bold tabular">{T(`বছরে ${num(meanBareDays, 'bn')} দিন`, `${meanBareDays} days a year`)}</span>
      </div>
      <div className="mt-1.5 grid grid-cols-12 gap-0.5" role="img"
        aria-label={T(`বছরে ${num(meanBareDays, 'bn')} দিন জমি খালি`, `Bare ${meanBareDays} days a year`)}>
        {first.months.map((m) => (
          <div key={`${m.y}-${m.m}`} className="min-w-0" title={`${names[m.m - 1]}: ${T(`ফসল ${num(m.crop, 'bn')}, খড় ${num(m.straw, 'bn')}, খালি ${num(m.bare, 'bn')} দিন`, `crop ${m.crop}, straw ${m.straw}, bare ${m.bare} days`)}`}>
            <div className="flex h-5 flex-col-reverse overflow-hidden rounded-[3px] bg-white">
              <span style={{ height: `${(m.crop / m.total) * 100}%` }} className="bg-primary-500" />
              <span style={{ height: `${(m.straw / m.total) * 100}%` }} className="bg-amber-300" />
              <span style={{ height: `${(m.bare / m.total) * 100}%` }} className="bg-red-400" />
            </div>
            <div className="mt-0.5 truncate text-center text-[9.5px] leading-3 text-muted">{names[m.m - 1].slice(0, lang === 'bn' ? 3 : 1)}</div>
          </div>
        ))}
      </div>
      <div className="mt-1 flex flex-wrap gap-x-2.5 text-[11px] text-muted">
        <span><i className="mr-1 inline-block h-2 w-2 rounded-sm bg-primary-500" />{T('ফসল', 'crop')}</span>
        <span><i className="mr-1 inline-block h-2 w-2 rounded-sm bg-amber-300" />{T('খড়ে ঢাকা', 'straw')}</span>
        <span><i className="mr-1 inline-block h-2 w-2 rounded-sm bg-red-400" />{T('খালি', 'bare')}</span>
      </div>
    </div>
  );
}
