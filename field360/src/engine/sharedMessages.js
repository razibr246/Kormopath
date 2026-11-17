// Officer → farmer messages through api/messages.js. When the store cannot be reached the app keeps working with
// the messages in this browser.
const BASE = '/api/field360/messages';
let unavailable = false;

async function storageDisabled(r) {
  if (r.status !== 503 || !(r.headers.get('content-type') || '').includes('json')) return false;
  try {
    const body = await r.json();
    return /disabled until authenticated|not configured/i.test(body?.error || '');
  } catch {
    return false;
  }
}

export async function loadMessages(farmerId) {
  if (unavailable) return null;
  try {
    const r = await fetch(`${BASE}?to=${encodeURIComponent(farmerId)}`, { cache: 'no-store' });
    if (await storageDisabled(r)) unavailable = true;
    if (!r.ok || !(r.headers.get('content-type') || '').includes('json')) return null;
    const j = await r.json();
    return Array.isArray(j.messages) ? j.messages : null;
  } catch { return null; }
}

export async function postMessage(adv) {
  if (unavailable) return false;
  try {
    const r = await fetch(BASE, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ adv }) });
    if (await storageDisabled(r)) unavailable = true;
    return r.ok;
  } catch { return false; }
}
