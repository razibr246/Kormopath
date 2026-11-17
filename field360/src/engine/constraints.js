// What the farmer has to work with, and which crops that rules out. The challenge asks the tool to let farmers enter
// their own constraints (equipment, labour, markets); water access is already the field's irrigation source, which
// the season decision and Field Future read directly. These are open rules, not measurements: each one says why, and
// all of them are listed in docs/THRESHOLDS.md as assumptions for a local officer to check.
//
// A constraint either removes a crop from the options (it cannot work without that resource) or flags it (it can,
// with extra effort the farmer should weigh). Removed crops join the farmer's own "cannot grow" list; the field's
// current rotation is still shown as it is, so the comparison keeps its baseline.

export const CONSTRAINTS = {
  machine: {
    name: { bn: 'জমি চাষের যন্ত্র', en: 'Land preparation' },
    options: {
      own: { bn: 'নিজের পাওয়ার টিলার', en: 'Own power tiller' },
      hire: { bn: 'ভাড়ায় পাওয়া যায়', en: 'Can hire one' },
      none: { bn: 'যন্ত্র নেই, ভাড়াও মেলে না', en: 'None, and none to hire' },
    },
    default: 'hire',
  },
  labour: {
    name: { bn: 'কাজের লোক', en: 'Labour' },
    options: {
      ok: { bn: 'পরিবারে বা ভাড়ায় যথেষ্ট', en: 'Enough, family or hired' },
      short: { bn: 'কম', en: 'Short' },
    },
    default: 'ok',
  },
  market: {
    name: { bn: 'সবজির বাজার', en: 'Vegetable market' },
    options: {
      yes: { bn: 'কাছে আছে', en: 'One nearby' },
      no: { bn: 'কাছে নেই', en: 'None nearby' },
    },
    default: 'yes',
  },
  retting: {
    name: { bn: 'পাট জাগ দেওয়ার পানি', en: 'Water to ret jute' },
    options: {
      yes: { bn: 'আছে (ডোবা, খাল)', en: 'Yes (pond, canal)' },
      no: { bn: 'নেই', en: 'No' },
    },
    default: 'yes',
  },
};

export const defaultConstraints = () => Object.fromEntries(Object.entries(CONSTRAINTS).map(([k, c]) => [k, c.default]));

// Each rule: when the constraint has this value, the crop is removed ('out') or flagged ('flag'), and why.
export const RULES = [
  // Reviewed by the Dhamrai upazila agriculture officer (12 Nov 2026): without a tiller, mustard is the bigger issue
  // than wheat, because a late mustard pushes the Boro after it into the April–May heat.
  { key: 'machine', value: 'none', crop: 'mustard', act: 'flag',
    why: { bn: 'আমন কাটার পরপরই চাষ করে ২৫ নভেম্বরের মধ্যে সরিষা বুনতে হয়; যন্ত্র না পেলে বোনা দেরি হয়, তখন পরের বোরো লাগাতেও দেরি হয় আর ফুল আসার সময় এপ্রিল–মের গরম পড়ে।', en: 'Mustard has to go in by about 25 November, ploughed straight after the Aman harvest; without a tiller it goes in late, the Boro after it goes in late, and Boro then flowers in the April–May heat.' } },
  { key: 'machine', value: 'none', crop: 'wheat', act: 'flag',
    why: { bn: 'গমেও আমন কাটার পরপরই চাষ করা জমি আর মাড়াই যন্ত্র লাগে; দেরিতে বুনলে দানা ভরার সময় গরম পড়ে।', en: 'Wheat also needs a ploughed seedbed soon after the Aman harvest, and threshing; sown late, its grain fills in the heat.' } },
  { key: 'machine', value: 'none', crop: 'boro', act: 'flag',
    why: { bn: 'বোরোর কাদা-চাষ গরু বা হাতে করা যায়, তবে অনেক শ্রম লাগে।', en: 'Boro puddling can be done with oxen or by hand, but it is heavy work.' } },
  { key: 'labour', value: 'short', crop: 'tomato', act: 'out',
    why: { bn: 'টমেটোতে খুঁটি দেওয়া, নিয়মিত সেচ আর বহুবার তোলা লাগে।', en: 'Tomato needs staking, regular watering and many pickings.' } },
  { key: 'labour', value: 'short', crop: 'jute', act: 'out',
    why: { bn: 'পাট কাটা, জাগ দেওয়া আর আঁশ ছাড়ানোয় অনেক লোক লাগে।', en: 'Jute needs many hands to cut, ret and strip the fibre.' } },
  { key: 'labour', value: 'short', crop: 'boro', act: 'flag',
    why: { bn: 'বোরো রোপণ আর কাটার সময় অনেক লোক লাগে।', en: 'Boro needs many hands at transplanting and at harvest.' } },
  { key: 'labour', value: 'short', crop: 'mungbean', act: 'flag',
    why: { bn: 'মুগ ডাল কয়েকবারে তুলতে হয়।', en: 'Mungbean is picked in several rounds.' } },
  { key: 'market', value: 'no', crop: 'tomato', act: 'out',
    why: { bn: 'টমেটো তাড়াতাড়ি পচে; কাছে বাজার না থাকলে দাম মেলে না।', en: 'Tomato spoils fast; without a market nearby it cannot be sold at a fair price.' } },
  { key: 'retting', value: 'no', crop: 'jute', act: 'out',
    why: { bn: 'পাটের আঁশ ছাড়াতে কয়েক সপ্তাহ পানিতে ডুবিয়ে রাখতে হয়।', en: 'Jute has to soak in water for weeks to free the fibre.' } },
];

// The crops the constraints remove and flag: { out: [ids], flags: [ids], why: { id: [{ act, key, why }] } }.
export function constraintEffects(cons = {}) {
  const c = { ...defaultConstraints(), ...cons };
  const out = new Set(), flags = new Set(), why = {};
  for (const r of RULES) {
    if (c[r.key] !== r.value) continue;
    (why[r.crop] ||= []).push({ act: r.act, key: r.key, why: r.why });
    if (r.act === 'out') out.add(r.crop); else flags.add(r.crop);
  }
  for (const id of out) flags.delete(id);
  return { out: [...out], flags: [...flags], why };
}

// The farmer's own "cannot grow" list joined with what the constraints remove, without duplicates.
export const mergeExclude = (exclude = [], cons = {}) => [...new Set([...(exclude ?? []), ...constraintEffects(cons).out])];
