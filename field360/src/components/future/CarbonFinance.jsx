import { useMemo, useState } from 'react';
import { CheckCircle2, Download, Info, Leaf } from 'lucide-react';
import { useStore } from '../../store';
import { Card, Tags } from '../ui';
import { num } from '../../engine/dates';
import { climateLedger } from '../../engine/soilfuture';
import { BIGHA_HA } from '../../engine/crops';

const rounded = (value) => Math.round(value * 1000) / 1000;

export default function CarbonFinance({ ff, ctx, w, rotName }) {
  const { s, T, farmer } = useStore();
  const lang = s.lang;
  const [downloaded, setDownloaded] = useState(false);
  const areaBigha = (farmer.area_dec || 33) / 33;
  const areaHa = areaBigha * BIGHA_HA;

  const baseLedger = useMemo(() => {
    const rows = w === 'fut' ? ff.habit.fut : ff.habit.now;
    return climateLedger(ctx, ff.habit.rot, rows, { awd: false });
  }, [ctx, ff.habit, w]);

  const targetStrategy = ff.best;
  const targetLedger = useMemo(() => {
    const rows = w === 'fut' ? targetStrategy.fut : targetStrategy.now;
    return climateLedger(ctx, targetStrategy.rot, rows, { awd: true });
  }, [ctx, targetStrategy, w]);

  const changePerHa = (baseLedger?.net ?? 0) - (targetLedger?.net ?? 0);
  const changeOnArea = changePerHa * areaHa;
  const format = (value) => num(value, lang, { dp: 2 });
  const formattedArea = num(areaBigha, lang, { dp: 1 });
  const period = w === 'fut' ? 'future climate scenario' : 'current climate scenario';

  const handleDownloadScenario = () => {
    const scenario = {
      type: 'fieldshift360-modelled-ghg-comparison',
      status: 'illustrative-model-output-not-mrv',
      generatedAt: new Date().toISOString(),
      climateContext: period,
      annualizedModelOutput: {
        unit: 't CO2e/ha/year',
        baselineNetEmissions: baseLedger ? rounded(baseLedger.net) : null,
        alternativeNetEmissions: targetLedger ? rounded(targetLedger.net) : null,
        changeVsBaseline: rounded(changePerHa),
      },
      selectedSampleFieldArea: {
        bigha: rounded(areaBigha),
        hectares: rounded(areaHa),
        changeVsBaselineTCo2ePerYear: rounded(changeOnArea),
      },
      rotations: {
        baseline: rotName(ff.habit.rot, { short: true }),
        alternative: rotName(targetStrategy.rot, { short: true }),
      },
      limitations: [
        'This is a model comparison, not a measured or independently verified emissions reduction.',
        'It is not an MRV report, carbon-credit issuance, registry submission, or farmer-income estimate.',
        'The selected field area and management scenario are not proof that the practices occurred.',
        'Satellite products shown elsewhere in the app do not verify this field’s water management, crop rotation, or residue practices.',
      ],
    };

    const blob = new Blob([JSON.stringify(scenario, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'FieldShift360_modelled_GHG_scenario.json';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setDownloaded(true);
    setTimeout(() => setDownloaded(false), 3000);
  };

  return (
    <Card id="ff-carbon" className="mt-5 scroll-mt-40 p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="max-w-3xl">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-100 text-emerald-800">
              <Leaf size={18} />
            </span>
            <h2 className="text-[20px] font-bold text-ink">
              {T('মডেলভিত্তিক গ্রিনহাউস গ্যাস তুলনা', 'Modelled Greenhouse-Gas Comparison')}
            </h2>
          </div>
          <p className="mt-1 text-[13.5px] leading-6 text-muted">
            {T(
              'এটি মিথেন ও মাটির কার্বন পরিবর্তনের একটি মডেল-ভিত্তিক তুলনা—পরিমাপ করা ফল নয়। এটি কার্বন ক্রেডিট, যাচাইকৃত নির্গমন হ্রাস, MRV প্রতিবেদন বা কৃষকের আয়ের পূর্বাভাস নয়।',
              'This compares modelled methane and soil-carbon changes; it is not a field measurement. It does not establish carbon credits, verified emission reductions, an MRV report, or farmer income.'
            )}
          </p>
        </div>
        <Tags list={['MODEL', 'RULE']} />
      </div>

      <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 p-3 text-[13px] leading-5 text-amber-950">
        <Info size={17} className="mt-0.5 shrink-0" />
        <p>
          {T(
            'এই দৃশ্যের ফসলচক্র ও AWD একটি মডেল-পরিস্থিতি। উপগ্রহের তথ্য এখানে জমির ব্যবস্থাপনা বা কৃষকের কাজ যাচাই করে না; কোনো অর্থপ্রদান বা মানদণ্ড-অনুমোদনের দাবি করা হচ্ছে না।',
            'The rotation and AWD in this scenario are model assumptions. Satellite data do not verify this field’s management or a farmer’s actions here; no payment or standards-approval claim is made.'
          )}
        </p>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-border bg-canvas p-4">
          <div className="text-[12.5px] font-semibold text-muted">
            {T('বর্তমান ফসলচক্র: মডেলকৃত নিট নির্গমন', 'Baseline rotation: modelled net emissions')}
          </div>
          <div className="mt-1 font-display text-[24px] font-bold text-ink">
            {format(baseLedger?.net ?? 0)}
            <span className="ml-1 text-[12px] font-normal text-muted">{T('টন CO₂e/হেক্টর/বছর', 't CO₂e/ha/yr')}</span>
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-canvas p-4">
          <div className="text-[12.5px] font-semibold text-muted">
            {T('বিকল্প ফসলচক্র: মডেলকৃত নিট নির্গমন', 'Alternative rotation: modelled net emissions')}
          </div>
          <div className="mt-1 font-display text-[24px] font-bold text-ink">
            {format(targetLedger?.net ?? 0)}
            <span className="ml-1 text-[12px] font-normal text-muted">{T('টন CO₂e/হেক্টর/বছর', 't CO₂e/ha/yr')}</span>
          </div>
        </div>
      </div>

      <div className="mt-3 rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4">
        <div className="text-[12.5px] font-semibold text-emerald-900">
          {T('মডেলে বর্তমান ফসলচক্রের তুলনায় পরিবর্তন', 'Modelled change versus the baseline rotation')}
        </div>
        <div className="mt-1 font-display text-[24px] font-bold text-emerald-950">
          {format(Math.abs(changeOnArea))}
          <span className="ml-1 text-[12px] font-normal">{T('টন CO₂e/বছর', 't CO₂e/yr')}</span>
        </div>
        <p className="mt-1 text-[12.5px] leading-5 text-emerald-900/80">
          {changeOnArea > 0
            ? T('মডেলে কম নির্গমন দেখায়', 'modelled lower emissions')
            : changeOnArea < 0
              ? T('মডেলে বেশি নির্গমন দেখায়', 'modelled higher emissions')
              : T('মডেলে কোনো পরিবর্তন দেখায় না', 'no modelled change')}
          {' · '}
          {T(`${formattedArea} বিঘা নমুনা জমির জন্য`, `for the selected ${formattedArea}-bigha sample field`)}
          {' · '}
          {T('১০ বছরের মডেল-গড় বার্ষিক হার', '10-year model-average annual rate')}
        </p>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3">
        <p className="max-w-2xl text-[12.5px] leading-5 text-muted">
          {T(
            'বাস্তব জমিতে ফল যাচাই, অনুমোদিত পদ্ধতিতে নির্গমন পরিমাপ এবং স্বাধীন পর্যালোচনা ছাড়া এই তুলনাকে ক্রেডিট বা আয় হিসেবে ব্যবহার করা যাবে না।',
            'This comparison cannot be treated as credits or income without field evidence, an applicable approved measurement method, and independent review.'
          )}
        </p>
        <button
          type="button"
          onClick={handleDownloadScenario}
          className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-4 py-2 text-[13.5px] font-semibold text-white shadow-sm transition hover:bg-emerald-800 active:scale-95"
        >
          {downloaded ? <CheckCircle2 size={16} /> : <Download size={16} />}
          {downloaded
            ? T('মডেল ফাইল নামানো হয়েছে', 'Scenario downloaded')
            : T('মডেল পরিস্থিতির JSON নামান', 'Download model scenario JSON')}
        </button>
      </div>
    </Card>
  );
}
