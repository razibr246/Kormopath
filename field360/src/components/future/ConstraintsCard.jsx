// "What you have to work with": the farmer's equipment, labour, market and jute-retting water. Crops a constraint
// rules out leave every plan (season decision and Field Future) and the card says why; crops it only makes harder
// are flagged. The rules are open assumptions (engine/constraints.js, docs/THRESHOLDS.md) for local review.
import { Wrench, Ban, AlertTriangle } from 'lucide-react';
import { useStore } from '../../store';
import { Card, Tags } from '../ui';
import { CONSTRAINTS, constraintEffects, defaultConstraints } from '../../engine/constraints.js';
import { cropName } from '../../engine/crops.js';

export default function ConstraintsCard({ className = '' }) {
  const { s, dispatch, T, L } = useStore();
  const lang = s.lang;
  const cons = { ...defaultConstraints(), ...(s.constraints ?? {}) };
  const fx = constraintEffects(cons);
  const set = (key, value) => dispatch({ type: 'set', patch: { constraints: { ...(s.constraints ?? {}), [key]: value } } });
  return (
    <Card className={`p-4 sm:p-5 ${className}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-[17px] font-bold"><Wrench size={18} className="text-primary-700" />{T('আপনার হাতে কী আছে', 'What you have to work with')}</h3>
        <Tags list={['RULE']} />
      </div>
      <p className="mt-1 text-[14px] leading-6 text-muted">{T('যন্ত্র, লোক, বাজার আর পানি বলুন; যে ফসল এগুলো ছাড়া হয় না, তা পরিকল্পনা থেকে বাদ যায়, কারণসহ। সেচের উৎস আপনার জমির তথ্য থেকে নেওয়া।', 'Say what equipment, labour, market and water you have; crops that cannot work without them leave the plan, with the reason. Irrigation comes from your field’s record.')}</p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        {Object.entries(CONSTRAINTS).map(([key, c]) => (
          <fieldset key={key} className="min-w-0">
            <legend className="text-[13.5px] font-semibold text-ink/80">{L(c.name)}</legend>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {Object.entries(c.options).map(([v, label]) => {
                const on = cons[key] === v;
                return (
                  <button key={v} type="button" aria-pressed={on} onClick={() => set(key, v)}
                    className={`rounded-full border px-3 py-1.5 text-[13.5px] font-semibold transition ${on ? 'border-primary-600 bg-primary-600 text-white' : 'border-border bg-white text-ink/75 hover:border-primary-300'}`}>
                    {L(label)}
                  </button>
                );
              })}
            </div>
          </fieldset>
        ))}
      </div>
      {(fx.out.length > 0 || fx.flags.length > 0) && (
        <ul className="mt-4 space-y-2">
          {[...fx.out, ...fx.flags].map((id) => {
            const out = fx.out.includes(id);
            return (
              <li key={id} className={`flex gap-2.5 rounded-xl p-2.5 text-[14px] leading-6 ${out ? 'bg-red-50 text-red-900' : 'bg-amber-50 text-amber-900'}`}>
                {out ? <Ban size={16} className="mt-1 shrink-0" /> : <AlertTriangle size={16} className="mt-1 shrink-0" />}
                <span><b>{cropName(id, lang)}</b>{' · '}{out ? T('বাদ দেওয়া হলো', 'left out') : T('করা যায়, তবে খেয়াল রাখুন', 'possible, with care')}: {fx.why[id].map((w) => L(w.why)).join(' ')}</span>
              </li>
            );
          })}
        </ul>
      )}
      <p className="mt-3 text-[12.5px] leading-5 text-muted">{T('এগুলো সাধারণ নিয়ম, মাপা তথ্য নয়; আপনার এলাকায় ঠিক কি না কৃষি কর্মকর্তার সঙ্গে মিলিয়ে নিন।', 'These are general rules, not measurements; check with your agriculture officer that they hold where you farm.')}</p>
    </Card>
  );
}
