// When is the field bare? The challenge asks the tool to show the times a field typically lies bare (open to rain,
// sun and erosion). This works it out for any rotation year from the same sowing and harvest dates Field Future uses
// (fieldContext): the Rabi crop, the Kharif-1 crop and T. Aman. Between a harvest and the next sowing the field is
// bare, unless the straw is kept on it (residue 'retain'), when it is under straw. Pure; no React.
import { ymd, addDays } from './dates.js';
import { PLAN_SEASON } from './climate.js';

const DAY = 86400000;
const AMAN_DAYS = 120; // as soilfuture.js: BRRI dhan49 / dhan75 class, transplanting to harvest
export const MONTHS_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const MONTHS_BN = ['জানু', 'ফেব্রু', 'মার্চ', 'এপ্রি', 'মে', 'জুন', 'জুলা', 'আগ', 'সেপ্টে', 'অক্টো', 'নভে', 'ডিসে'];

// The crop slots one rotation year fills: [{ id, from, to }] (ms, UTC days).
export function slotsOf(ctx, year) {
  const out = [];
  const r = ctx.rabi?.[year.rabi];
  if (year.rabi !== 'fallow' && r?.t0 != null) out.push({ id: year.rabi, from: r.t0, to: r.end });
  const k = ctx.k1?.[year.rabi]?.[year.k1];
  if (year.k1 !== 'fallow' && k?.fits && k.t0 != null) out.push({ id: year.k1, from: k.t0, to: k.end });
  // T. Aman: this year's and the one transplanted a year earlier, whose harvest opens the Rabi year.
  for (const shift of [-365, 0]) out.push({ id: 'aman', from: addDays(ctx.aman, shift), to: addDays(ctx.aman, shift + AMAN_DAYS) });
  return out;
}

// Twelve months from November (the Rabi year PLAN_SEASON-1/PLAN_SEASON): for each, the days under a crop, under
// straw and bare, plus the year's bare days and its longest bare stretch.
export function bareCalendar(ctx, year, residue = 'habit') {
  const start = ymd(PLAN_SEASON - 1, 11, 1), end = ymd(PLAN_SEASON, 11, 1);
  const slots = slotsOf(ctx, year).sort((a, b) => a.from - b.from);
  const state = [];
  for (let t = start; t < end; t += DAY) {
    const on = slots.find((s) => t >= s.from && t < s.to);
    if (on) { state.push({ t, s: 'crop', id: on.id }); continue; }
    const after = slots.filter((s) => s.to <= t).sort((a, b) => b.to - a.to)[0];
    // Straw kept after a cereal or pulse harvest covers the ground until the next crop goes in.
    state.push({ t, s: residue === 'retain' && after && after.id !== 'tomato' ? 'straw' : 'bare' });
  }
  const months = [];
  for (let i = 0; i < 12; i++) {
    const m = ((10 + i) % 12) + 1, y = m >= 11 ? PLAN_SEASON - 1 : PLAN_SEASON;
    const days = state.filter((d) => { const dt = new Date(d.t); return dt.getUTCMonth() + 1 === m && dt.getUTCFullYear() === y; });
    months.push({ m, y, crop: days.filter((d) => d.s === 'crop').length, straw: days.filter((d) => d.s === 'straw').length, bare: days.filter((d) => d.s === 'bare').length, total: days.length });
  }
  let longest = { days: 0, from: null, to: null }, run = null;
  for (const d of state) {
    if (d.s === 'bare') { run = run ? { ...run, to: d.t, days: run.days + 1 } : { from: d.t, to: d.t, days: 1 }; if (run.days > longest.days) longest = run; }
    else run = null;
  }
  return { months, bareDays: state.filter((d) => d.s === 'bare').length, strawDays: state.filter((d) => d.s === 'straw').length, longest };
}

// A whole rotation (one or two years): its first year's calendar and the mean bare days a year across its cycle.
export function rotationBare(ctx, rot) {
  const cals = rot.cycle.map((y) => bareCalendar(ctx, y, rot.residue));
  return { first: cals[0], meanBareDays: Math.round(cals.reduce((a, c) => a + c.bareDays, 0) / cals.length) };
}
