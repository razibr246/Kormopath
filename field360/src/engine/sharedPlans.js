// The shared plan board (api/plans.js): every user's confirmed plan, so a union's harvest weeks add up across
// farmers, not just in one browser. When the board cannot be reached (no server, offline, or not configured) the
// app says so and keeps working from this browser's own plans.
import { PLAN_SEASON } from './climate.js';

const BASE = '/api/field360/plans';
let unavailableReason = null;

async function unavailable(r) {
  if (r.status !== 503 || !(r.headers.get('content-type') || '').includes('json')) return false;
  try {
    const body = await r.json();
    return /disabled until authenticated|not configured/i.test(body?.error || '');
  } catch {
    return false;
  }
}

// → { status: 'live', plans, at } or { status: 'offline', reason }
export async function loadSharedPlans(season = PLAN_SEASON) {
  if (unavailableReason) return { status: 'offline', reason: unavailableReason, plans: [], at: null };
  try {
    const r = await fetch(`${BASE}?season=${season}`, { cache: 'no-store' });
    const type = r.headers.get('content-type') || '';
    if (!r.ok || !type.includes('json')) {
      if (await unavailable(r)) unavailableReason = 'unconfigured';
      return { status: 'offline', reason: unavailableReason || 'unreachable', plans: [], at: null };
    }
    const j = await r.json();
    return { status: 'live', plans: Array.isArray(j.plans) ? j.plans : [], at: j.at ?? Date.now() };
  } catch {
    return { status: 'offline', reason: 'unreachable' };
  }
}

export async function sendSharedPlan(plan, season = PLAN_SEASON) {
  if (unavailableReason) return false;
  try {
    const r = await fetch(BASE, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ season, plan }) });
    if (await unavailable(r)) unavailableReason = 'unconfigured';
    return r.ok;
  } catch {
    return false;
  }
}
