// Field boundaries as they are on the ground: real latitude/longitude polygons (GeoJSON order, [lon, lat]), measured on
// the WGS84 ellipsoid. A field is never squared off or reshaped here: every corner, bend and curve the boundary was
// given is kept, and a field without a boundary has none (boundaryOf returns null) rather than an invented one.
//
// Area: each ring is projected to the Lambert azimuthal equal-area plane centred on the field, through the authalic
// sphere, so the projection keeps area exactly; the shoelace sum on that plane is the ellipsoidal area (the only
// residue is the difference between a geodesic edge and a straight projected edge, far below a millimetre² for
// fields). Lengths: Vincenty's inverse formula on WGS84 (sub-millimetre). Both are tested against reference values.

const A = 6378137;
const F = 1 / 298.257223563;
const E2 = F * (2 - F);
const E = Math.sqrt(E2);
const B = A * (1 - F);
const rad = (d) => (d * Math.PI) / 180;
const deg = (r) => (r * 180) / Math.PI;

const qOf = (s) => (1 - E2) * (s / (1 - E2 * s * s) - (1 / (2 * E)) * Math.log((1 - E * s) / (1 + E * s)));
const QP = qOf(1);
export const R_AUTHALIC = A * Math.sqrt(QP / 2);
const authalic = (lat) => Math.asin(Math.max(-1, Math.min(1, qOf(Math.sin(rad(lat))) / QP)));
const wrap = (d) => ((((d + 180) % 360) + 360) % 360) - 180;

// ---- land units (Bangladesh standard measures) ----
export const SQFT_M2 = 0.09290304;
// 1 decimal = 1 shotok (শতক) = 1/100 acre = 435.6 sq ft; 1 katha = 720 sq ft; 1 bigha = 20 katha = 14,400 sq ft.
// The local bigha and katha differ in some districts; these are the standard (government) values.
export const UNIT_M2 = {
  m2: 1,
  sqft: SQFT_M2,
  decimal: 435.6 * SQFT_M2,
  katha: 720 * SQFT_M2,
  bigha: 14400 * SQFT_M2,
  acre: 43560 * SQFT_M2,
  hectare: 10000,
};
export const UNIT_NAMES = {
  decimal: { bn: 'শতক (ডেসিমেল)', en: 'Decimal (shotok)' },
  katha: { bn: 'কাঠা', en: 'Katha' },
  bigha: { bn: 'বিঘা', en: 'Bigha' },
  acre: { bn: 'একর', en: 'Acre' },
  hectare: { bn: 'হেক্টর', en: 'Hectare' },
  m2: { bn: 'বর্গমিটার', en: 'Square metres' },
  sqft: { bn: 'বর্গফুট', en: 'Square feet' },
};
export const areaIn = (m2) => Object.fromEntries(Object.entries(UNIT_M2).map(([k, v]) => [k, m2 / v]));

// ---- geodesy ----
// Vincenty inverse on WGS84. a, b: [lat, lon]. Returns { m, bearing } (initial bearing, degrees from north).
export function inverse(a, b) {
  const L = rad(wrap(b[1] - a[1]));
  const U1 = Math.atan((1 - F) * Math.tan(rad(a[0]))), U2 = Math.atan((1 - F) * Math.tan(rad(b[0])));
  const sinU1 = Math.sin(U1), cosU1 = Math.cos(U1), sinU2 = Math.sin(U2), cosU2 = Math.cos(U2);
  let lam = L, prev, sinS, cosS, sig, sinAl, cos2Al, cos2Sm, sinLam, cosLam, iter = 0;
  do {
    sinLam = Math.sin(lam); cosLam = Math.cos(lam);
    sinS = Math.hypot(cosU2 * sinLam, cosU1 * sinU2 - sinU1 * cosU2 * cosLam);
    if (sinS === 0) return { m: 0, bearing: 0 };
    cosS = sinU1 * sinU2 + cosU1 * cosU2 * cosLam;
    sig = Math.atan2(sinS, cosS);
    sinAl = (cosU1 * cosU2 * sinLam) / sinS;
    cos2Al = 1 - sinAl * sinAl;
    cos2Sm = cos2Al !== 0 ? cosS - (2 * sinU1 * sinU2) / cos2Al : 0;
    const C = (F / 16) * cos2Al * (4 + F * (4 - 3 * cos2Al));
    prev = lam;
    lam = L + (1 - C) * F * sinAl * (sig + C * sinS * (cos2Sm + C * cosS * (-1 + 2 * cos2Sm * cos2Sm)));
  } while (Math.abs(lam - prev) > 1e-12 && ++iter < 200);
  const u2 = (cos2Al * (A * A - B * B)) / (B * B);
  const AA = 1 + (u2 / 16384) * (4096 + u2 * (-768 + u2 * (320 - 175 * u2)));
  const BB = (u2 / 1024) * (256 + u2 * (-128 + u2 * (74 - 47 * u2)));
  const dS = BB * sinS * (cos2Sm + (BB / 4) * (cosS * (-1 + 2 * cos2Sm * cos2Sm) - (BB / 6) * cos2Sm * (-3 + 4 * sinS * sinS) * (-3 + 4 * cos2Sm * cos2Sm)));
  const bearing = (deg(Math.atan2(cosU2 * sinLam, cosU1 * sinU2 - sinU1 * cosU2 * cosLam)) + 360) % 360;
  return { m: B * AA * (sig - dS), bearing };
}
export const distanceM = (a, b) => inverse(a, b).m;

// Lambert azimuthal equal-area (via the authalic sphere) centred on [lat0, lon0]: metres east/north, area-true.
export function equalAreaPlane(lat0, lon0) {
  const b0 = authalic(lat0), sb0 = Math.sin(b0), cb0 = Math.cos(b0);
  return ([lat, lon]) => {
    const b = authalic(lat), dl = rad(wrap(lon - lon0));
    const sb = Math.sin(b), cb = Math.cos(b), cdl = Math.cos(dl);
    const k = Math.sqrt(2 / (1 + sb0 * sb + cb0 * cb * cdl));
    return [R_AUTHALIC * k * cb * Math.sin(dl), R_AUTHALIC * k * (cb0 * sb - sb0 * cb * cdl)];
  };
}

// ---- geometry plumbing (GeoJSON [lon, lat] in, [lat, lon] for the maps) ----
const finite = (x) => typeof x === 'number' && Number.isFinite(x);
const samePt = (p, q) => Math.abs(p[0] - q[0]) < 1e-10 && Math.abs(p[1] - q[1]) < 1e-10;

// A ring as distinct [lon, lat] points, open (no repeated closing point), consecutive duplicates removed.
export function openRing(ring) {
  const out = [];
  for (const p of ring ?? []) {
    if (!Array.isArray(p) || !finite(p[0]) || !finite(p[1])) continue;
    const q = [p[0], p[1]];
    if (!out.length || !samePt(out[out.length - 1], q)) out.push(q);
  }
  while (out.length > 1 && samePt(out[0], out[out.length - 1])) out.pop();
  return out;
}
export const closeRing = (r) => { const o = openRing(r); return o.length ? [...o, o[0]] : o; };

// Polygons of a geometry as [[outer, ...holes], ...], each ring open.
export function polygonsOf(g) {
  if (!g) return [];
  if (g.type === 'Feature') return polygonsOf(g.geometry);
  if (g.type === 'Polygon') return [g.coordinates.map(openRing)];
  if (g.type === 'MultiPolygon') return g.coordinates.map((poly) => poly.map(openRing));
  return [];
}
export const latLngs = (ring) => openRing(ring).map(([lon, lat]) => [lat, lon]);

// A clean GeoJSON geometry: rings closed, Polygon when there is one part.
export function cleanGeometry(g) {
  const polys = polygonsOf(g).map((p) => p.map(closeRing));
  if (!polys.length) return null;
  return polys.length === 1 ? { type: 'Polygon', coordinates: polys[0] } : { type: 'MultiPolygon', coordinates: polys };
}
export const polygonFrom = (latLngList) => cleanGeometry({ type: 'Polygon', coordinates: [latLngList.map(([lat, lon]) => [lon, lat])] });

const ringCentre = (ring) => {
  let la = 0, lo = 0;
  for (const [x, y] of ring) { lo += x; la += y; }
  return [la / ring.length, lo / ring.length];
};
const shoelace = (xy) => {
  let s = 0;
  for (let i = 0; i < xy.length; i++) { const [x1, y1] = xy[i], [x2, y2] = xy[(i + 1) % xy.length]; s += x1 * y2 - x2 * y1; }
  return s / 2;
};

export function ringAreaM2(ring, centre) {
  const r = openRing(ring);
  if (r.length < 3) return 0;
  const [lat0, lon0] = centre ?? ringCentre(r);
  const P = equalAreaPlane(lat0, lon0);
  return Math.abs(shoelace(r.map(([lon, lat]) => P([lat, lon]))));
}

const COMPASS = [
  { bn: 'উত্তর', en: 'north' }, { bn: 'উত্তর-পূর্ব', en: 'north-east' }, { bn: 'পূর্ব', en: 'east' }, { bn: 'দক্ষিণ-পূর্ব', en: 'south-east' },
  { bn: 'দক্ষিণ', en: 'south' }, { bn: 'দক্ষিণ-পশ্চিম', en: 'south-west' }, { bn: 'পশ্চিম', en: 'west' }, { bn: 'উত্তর-পশ্চিম', en: 'north-west' },
];
export const compass = (bearing) => COMPASS[Math.round((((bearing % 360) + 360) % 360) / 45) % 8];

// Everything a farmer or officer reads off a boundary: area, perimeter, every side, every corner.
export function measure(g) {
  const polys = polygonsOf(g).filter((p) => p[0]?.length >= 3);
  if (!polys.length) return null;
  const allOuter = polys.flatMap((p) => p[0]);
  const [lat0, lon0] = ringCentre(allOuter);
  const P = equalAreaPlane(lat0, lon0);
  const parts = polys.map(([outer, ...holes]) => {
    const xy = outer.map(([lon, lat]) => P([lat, lon]));
    const outerArea = Math.abs(shoelace(xy));
    const holeArea = holes.filter((h) => h.length >= 3).reduce((a, h) => a + ringAreaM2(h, [lat0, lon0]), 0);
    // Centre of the part (area centroid on the plane), for naming which side of the field each edge is on.
    const s = shoelace(xy);
    let cx = 0, cy = 0;
    for (let i = 0; i < xy.length; i++) { const [x1, y1] = xy[i], [x2, y2] = xy[(i + 1) % xy.length]; const c = x1 * y2 - x2 * y1; cx += (x1 + x2) * c; cy += (y1 + y2) * c; }
    const cxy = s ? [cx / (6 * s), cy / (6 * s)] : xy.reduce((a, p) => [a[0] + p[0] / xy.length, a[1] + p[1] / xy.length], [0, 0]);
    const sides = outer.map(([lon, lat], i) => {
      const [lon2, lat2] = outer[(i + 1) % outer.length];
      const { m, bearing } = inverse([lat, lon], [lat2, lon2]);
      const [x1, y1] = xy[i], [x2, y2] = xy[(i + 1) % xy.length];
      const out = (deg(Math.atan2((x1 + x2) / 2 - cxy[0], (y1 + y2) / 2 - cxy[1])) + 360) % 360;
      return { from: i, to: (i + 1) % outer.length, m, bearing, facing: compass(out), mid: [(lat + lat2) / 2, (lon + lon2) / 2] };
    });
    const perimeterM = sides.reduce((a, x) => a + x.m, 0);
    return { vertices: outer.map(([lon, lat]) => [lat, lon]), sides, perimeterM, areaM2: outerArea - holeArea, holes: holes.length };
  });
  const areaM2 = parts.reduce((a, p) => a + p.areaM2, 0);
  const lats = allOuter.map((p) => p[1]), lons = allOuter.map((p) => p[0]);
  return {
    areaM2,
    area: areaIn(areaM2),
    perimeterM: parts.reduce((a, p) => a + p.perimeterM, 0),
    parts,
    vertexCount: parts.reduce((a, p) => a + p.vertices.length, 0),
    centre: { lat: lat0, lon: lon0 },
    bbox: [[Math.min(...lats), Math.min(...lons)], [Math.max(...lats), Math.max(...lons)]],
  };
}

// ---- checks ----
const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
const segHit = (p1, p2, q1, q2) => {
  const d1 = cross(q1, q2, p1), d2 = cross(q1, q2, p2), d3 = cross(p1, p2, q1), d4 = cross(p1, p2, q2);
  return ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0));
};
// True when two non-neighbouring sides of the ring cross (a figure-of-eight, which has no real area).
export function selfIntersects(ring) {
  const r = openRing(ring);
  if (r.length < 4) return false;
  const [lat0, lon0] = ringCentre(r);
  const P = equalAreaPlane(lat0, lon0);
  const xy = r.map(([lon, lat]) => P([lat, lon]));
  const n = xy.length;
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      if (j === i + 1 || (i === 0 && j === n - 1)) continue;
      if (segHit(xy[i], xy[(i + 1) % n], xy[j], xy[(j + 1) % n])) return true;
    }
  }
  return false;
}

export const MISMATCH_SHARE = 0.15; // measured vs office record: beyond this the record is worth checking
export const FAR_FROM_PIN_M = 300;
export const WRONG_PLACE_M = 2000; // beyond this a boundary is not this field at all: it cannot be saved

// errors stop a boundary being saved; warnings are shown with it.
export function checkBoundary(g, { recordDec = null, pin = null } = {}) {
  const errors = [], warnings = [];
  const polys = polygonsOf(g);
  const msg = (code, bn, en) => ({ code, bn, en });
  if (!polys.length || polys.some((p) => !p[0] || p[0].length < 3)) {
    errors.push(msg('B1_FEW_POINTS', 'সীমানায় অন্তত তিনটি আলাদা কোণ লাগবে।', 'A boundary needs at least three separate corners.'));
    return { ok: false, errors, warnings, m: null };
  }
  for (const poly of polys) for (const ring of poly) for (const [lon, lat] of ring) {
    if (Math.abs(lat) > 90 || Math.abs(lon) > 180) { errors.push(msg('B6_OUT_OF_RANGE', 'কিছু স্থানাঙ্ক পৃথিবীর বাইরে পড়ছে; সংখ্যাগুলো দেখুন।', 'Some coordinates are not on Earth; check the numbers.')); return { ok: false, errors, warnings, m: null }; }
  }
  if (polys.some((p) => p.some(selfIntersects))) errors.push(msg('B2_SELF_CROSS', 'সীমানার দুটি দিক একে অপরকে কাটছে। কোণগুলো জমির চারপাশে পরপর দিন।', 'Two sides of the boundary cross each other. Give the corners in order around the field.'));
  const m = measure(g);
  if (m && m.areaM2 < 10) errors.push(msg('B3_TOO_SMALL', 'জমি ১০ বর্গমিটারের চেয়ে ছোট হচ্ছে; কোণগুলো ঠিক জায়গায় আছে কি না দেখুন।', 'The field comes out smaller than 10 m²; check the corners are in the right place.'));
  if (m && m.areaM2 > 50 * 10000) warnings.push(msg('B4_TOO_BIG', 'জমি ৫০ হেক্টরের বেশি হচ্ছে; একটি ক্ষেতের জন্য অনেক বড়।', 'The field comes out over 50 hectares, very large for one field.'));
  if (m && recordDec > 0) {
    const d = m.area.decimal / recordDec - 1;
    if (Math.abs(d) > MISMATCH_SHARE) warnings.push({ ...msg('B5_RECORD_MISMATCH', `মাপা আয়তন অফিসের খাতার (${recordDec} শতক) চেয়ে ${Math.round(Math.abs(d) * 100)}% ${d > 0 ? 'বেশি' : 'কম'}।`, `The measured area is ${Math.round(Math.abs(d) * 100)}% ${d > 0 ? 'more' : 'less'} than the office record (${recordDec} decimal).`), share: d });
  }
  const away = m && pin ? distanceM([pin.lat, pin.lon], [m.centre.lat, m.centre.lon]) : 0;
  if (away > WRONG_PLACE_M) {
    errors.push(msg('B8_WRONG_PLACE', `সীমানা জমির পিন থেকে ${Math.round(away / 1000)} কিলোমিটার দূরে; এটি অন্য জায়গার জমি। স্থানাঙ্ক বা বেছে নেওয়া জমি দেখুন।`, `The boundary is ${Math.round(away / 1000)} km from the field's pin; it is somewhere else. Check the coordinates or the field chosen.`));
  } else if (away > FAR_FROM_PIN_M) {
    warnings.push(msg('B7_FAR_FROM_PIN', `সীমানা জমির পিন থেকে ${FAR_FROM_PIN_M} মিটারের বেশি দূরে। ঠিক জমির সীমানা কি না দেখুন।`, `The boundary is more than ${FAR_FROM_PIN_M} m from the field's pin. Check it is this field.`));
  }
  return { ok: errors.length === 0, errors, warnings, m };
}

// First-order area uncertainty when every corner may be off by posErrM metres: about perimeter × error.
export const areaUncertaintyM2 = (perimeterM, posErrM) => (posErrM > 0 ? perimeterM * posErrM : null);

// ---- where a boundary comes from ----
// grade: 1 is the strongest. A boundary is "verified" only when a surveyor measured it AND the office checked it.
export const SOURCES = {
  survey: { grade: 1, bn: 'সার্ভেয়ারের মাপা সীমানা', en: 'Surveyed boundary', help: { bn: 'সার্ভেয়ার বা ভূমি অফিস মাঠে মেপে স্থানাঙ্ক দিয়েছেন।', en: 'A surveyor or the land office measured it in the field and gave the coordinates.' } },
  gps: { grade: 2, bn: 'হেঁটে জিপিএসে মাপা', en: 'Walked with phone GPS', help: { bn: 'জমির চারপাশে হেঁটে ফোনের জিপিএসে নেওয়া। প্রতিটি বিন্দু ফোনের জানানো ভুলের মধ্যে।', en: 'Taken by walking round the field with phone GPS. Each point is within the error the phone reported.' } },
  file: { grade: 3, bn: 'ফাইল থেকে আনা', en: 'From a file', help: { bn: 'GeoJSON বা KML ফাইল থেকে আনা; ফাইলটি যতটা ঠিক, সীমানাও ততটা।', en: 'Loaded from a GeoJSON or KML file; it is as accurate as the file.' } },
  // The demo's sample farmers: the edge of a real field seen in the satellite photo near the sample pin, drawn so every
  // demo field has a shape (scripts/build/sample_field_shapes.mjs). Real ground, but not that farmer's measured land.
  sample: { grade: 9, bn: 'নমুনা সীমানা (ডেমো)', en: 'Sample boundary (demo)', help: { bn: 'ডেমোর নমুনা কৃষকের জমি: পিনের কাছে উপগ্রহ ছবিতে দেখা একটি আসল জমির কিনারা। এই কৃষকের মাপা জমি নয়; আসল সীমানা দিলে এটি বদলে যাবে।', en: 'A demo sample farmer’s field: the edge of a real field seen in the satellite photo near the pin. Not this farmer’s measured land; giving the real boundary replaces it.' } },
  drawn: { grade: 4, bn: 'উপগ্রহ ছবিতে আঁকা (আনুমানিক)', en: 'Traced on the satellite photo (approximate)', help: { bn: 'উপগ্রহ ছবিতে আইল দেখে আঁকা। ছবি কয়েক মিটার সরে থাকতে পারে, তাই এটি মাপা সীমানা নয়।', en: 'Traced along the bunds on the satellite photo. The photo can be a few metres off, so this is not a measured boundary.' } },
};

export function boundaryStatus(b) {
  if (!b) return 'none';
  if (b.source === 'sample') return 'sample';
  if (b.source === 'survey' && b.checked) return 'verified';
  if (b.checked) return 'checked';
  return 'unverified';
}
export const STATUS_TEXT = {
  none: { bn: 'আসল সীমানা নেই', en: 'No real boundary' },
  verified: { bn: 'যাচাই করা জরিপের সীমানা', en: 'Verified surveyed boundary' },
  checked: { bn: 'অফিস দেখেছে, জরিপ নয়', en: 'Checked by the office, not surveyed' },
  unverified: { bn: 'যাচাই হয়নি', en: 'Not checked yet' },
  sample: { bn: 'আসল মাপ নয়', en: 'not measured land' },
};

// The boundary of a parcel, or null. Only a stored, valid polygon counts; nothing is ever derived from the pin or size.
export function boundaryOf(parcel) {
  const b = parcel?.boundary;
  if (!b || !SOURCES[b.source]) return null;
  const g = cleanGeometry(b);
  if (!g) return null;
  const polys = polygonsOf(g);
  if (polys.some((p) => p[0].length < 3)) return null;
  return { ...b, ...g };
}

// A point inside the field for its label, [lat, lon]: the area centroid of the largest part, or, when that falls
// outside (an L-shaped or curved field), the middle of the widest stretch of the field along the centroid's latitude.
export function labelPoint(g) {
  const polys = polygonsOf(g).filter((p) => p[0]?.length >= 3);
  if (!polys.length) return null;
  const outer = polys.map((p) => p[0]).sort((a, b) => ringAreaM2(b) - ringAreaM2(a))[0];
  let a = 0, cx = 0, cy = 0;
  for (let i = 0; i < outer.length; i++) {
    const [x1, y1] = outer[i], [x2, y2] = outer[(i + 1) % outer.length], c = x1 * y2 - x2 * y1;
    a += c; cx += (x1 + x2) * c; cy += (y1 + y2) * c;
  }
  if (!a) return [outer[0][1], outer[0][0]];
  const [lon, lat] = [cx / (3 * a), cy / (3 * a)];
  const inside = (x, y) => { let c = false; for (let i = 0, j = outer.length - 1; i < outer.length; j = i++) { const [xi, yi] = outer[i], [xj, yj] = outer[j]; if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c; } return c; };
  if (inside(lon, lat)) return [lat, lon];
  const xs = [];
  for (let i = 0, j = outer.length - 1; i < outer.length; j = i++) {
    const [xi, yi] = outer[i], [xj, yj] = outer[j];
    if ((yi > lat) !== (yj > lat)) xs.push(xi + ((lat - yi) * (xj - xi)) / (yj - yi));
  }
  xs.sort((p, q) => p - q);
  let best = null;
  for (let k = 0; k + 1 < xs.length; k += 2) if (!best || xs[k + 1] - xs[k] > best[1] - best[0]) best = [xs[k], xs[k + 1]];
  return best ? [lat, (best[0] + best[1]) / 2] : [outer[0][1], outer[0][0]];
}

// Area centroid of the largest ring of an SVG path made of absolute M/L commands (a map outline in its own pixel
// space), for placing a label on it. Returns [x, y], or null for an empty path.
export function svgPathCentroid(d) {
  let best = null;
  for (const part of String(d).split(/(?=M)/)) {
    const nums = part.match(/-?\d+(?:\.\d+)?/g)?.map(Number) ?? [];
    const pts = [];
    for (let i = 0; i + 1 < nums.length; i += 2) pts.push([nums[i], nums[i + 1]]);
    if (pts.length < 3) continue;
    let a = 0, cx = 0, cy = 0;
    for (let i = 0; i < pts.length; i++) {
      const [x1, y1] = pts[i], [x2, y2] = pts[(i + 1) % pts.length], c = x1 * y2 - x2 * y1;
      a += c; cx += (x1 + x2) * c; cy += (y1 + y2) * c;
    }
    if (a && (!best || Math.abs(a) > best.a)) best = { a: Math.abs(a), x: cx / (3 * a), y: cy / (3 * a) };
  }
  return best ? [best.x, best.y] : null;
}

// A boundary someone gave for this field (not a demo sample): the one the satellite reads and caches follow.
export function measuredBoundaryOf(parcel) {
  const b = boundaryOf(parcel);
  return b && b.source !== 'sample' ? b : null;
}

// A short fingerprint of a boundary's shape, to key caches that depend on it.
export function shapeKey(b) {
  if (!b) return '';
  const pts = polygonsOf(b).flat(3);
  let h = 2166136261;
  for (const v of pts) { const s = v.toFixed(7); for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } }
  return (h >>> 0).toString(36);
}

// ---- reading boundaries from people and files ----
const BN_DIGITS = '০১২৩৪৫৬৭৮৯';
const asciiDigits = (s) => s.replace(/[০-৯]/g, (d) => String(BN_DIGITS.indexOf(d)));
const BD = { lat: [20, 27], lon: [88, 93] };
const inBD = ([lon, lat]) => lat >= BD.lat[0] && lat <= BD.lat[1] && lon >= BD.lon[0] && lon <= BD.lon[1];
const swappedBD = ([lon, lat]) => lon >= BD.lat[0] && lon <= BD.lat[1] && lat >= BD.lon[0] && lat <= BD.lon[1];

class BoundaryError extends Error {
  constructor(code, bn, en) { super(en); this.code = code; this.bn = bn; this.en = en; }
}
export { BoundaryError };

// "lat, lon" per line (a surveyor's list; Bangla digits are fine). Returns [[lat, lon], ...].
export function parseCoordList(text) {
  const pts = [];
  for (const raw of asciiDigits(String(text ?? '')).split(/\r?\n|;/)) {
    const line = raw.trim();
    if (!line || /^[#/]/.test(line)) continue;
    const nums = line.match(/-?\d+(?:\.\d+)?/g);
    if (!nums || nums.length < 2) throw new BoundaryError('P1_LINE', `এই লাইনটি পড়া গেল না: "${line}"। প্রতি লাইনে অক্ষাংশ, দ্রাঘিমাংশ দিন।`, `Could not read this line: "${line}". Give latitude, longitude on each line.`);
    // "3. 24.0231, 90.0788" or "3 24.0231 90.0788": a whole-number label before the pair is skipped.
    const pair = nums.length >= 3 && /^-?\d+$/.test(nums[0]) ? nums.slice(1, 3) : nums.slice(0, 2);
    pts.push(pair.map(Number));
  }
  // Given as "lon, lat" by mistake: the first number in Bangladesh's longitude band, the second in its latitude band.
  if (pts.length >= 1 && pts.every(([a, b]) => swappedBD([b, a]))) {
    throw new BoundaryError('P2_SWAPPED', 'অক্ষাংশ আর দ্রাঘিমাংশ উল্টো মনে হচ্ছে (বাংলাদেশে অক্ষাংশ ২০–২৭, দ্রাঘিমাংশ ৮৮–৯৩)। প্রথমে অক্ষাংশ দিন।', 'Latitude and longitude look swapped (in Bangladesh latitude is 20–27, longitude 88–93). Put latitude first.');
  }
  const ring = openRing(pts.map(([lat, lon]) => [lon, lat])).map(([lon, lat]) => [lat, lon]);
  if (ring.length < 3) throw new BoundaryError('P3_FEW', 'অন্তত তিনটি আলাদা কোণের স্থানাঙ্ক লাগবে।', 'At least three different corners are needed.');
  return ring;
}

const kmlRing = (s) => openRing(s.trim().split(/\s+/).map((t) => t.split(',').map(Number)).filter((p) => p.length >= 2 && finite(p[0]) && finite(p[1])));
const tagAll = (xml, tag) => [...xml.matchAll(new RegExp(`<(?:\\w+:)?${tag}\\b[^>]*>([\\s\\S]*?)</(?:\\w+:)?${tag}>`, 'gi'))].map((m) => m[1]);
const textOf = (xml, tag) => tagAll(xml, tag)[0]?.replace(/<!\[CDATA\[|\]\]>/g, '').trim() ?? null;

function kmlCandidates(xml) {
  const out = [];
  const marks = tagAll(xml, 'Placemark');
  for (const [i, pm] of (marks.length ? marks : [xml]).entries()) {
    const polys = tagAll(pm, 'Polygon').map((poly) => {
      const outer = tagAll(poly, 'outerBoundaryIs').map((o) => textOf(o, 'coordinates')).filter(Boolean).map(kmlRing)[0];
      const holes = tagAll(poly, 'innerBoundaryIs').map((o) => textOf(o, 'coordinates')).filter(Boolean).map(kmlRing);
      return outer ? [outer, ...holes] : null;
    }).filter(Boolean);
    if (polys.length) out.push({ name: textOf(pm, 'name') ?? `#${i + 1}`, geometry: cleanGeometry(polys.length === 1 ? { type: 'Polygon', coordinates: polys[0] } : { type: 'MultiPolygon', coordinates: polys }) });
  }
  return out;
}

function geojsonCandidates(j) {
  const out = [];
  const walk = (o, name) => {
    if (!o || typeof o !== 'object') return;
    if (o.type === 'FeatureCollection') return o.features?.forEach((f, i) => walk(f, f?.properties?.name ?? f?.properties?.Name ?? f?.id ?? `#${i + 1}`));
    if (o.type === 'Feature') return walk(o.geometry, name ?? o.properties?.name ?? o.id ?? null);
    if (o.type === 'GeometryCollection') return o.geometries?.forEach((g) => walk(g, name));
    if (o.type === 'Polygon' || o.type === 'MultiPolygon') out.push({ name: name ?? `#${out.length + 1}`, geometry: cleanGeometry(o) });
  };
  walk(j, null);
  return out;
}

// A GeoJSON or KML file -> the polygons in it, each { name, geometry }. Points and lines are not boundaries.
export function parseBoundaryFile(text, filename = '') {
  const t = String(text ?? '').replace(/^﻿/, '').trim();
  let list;
  if (/^[{[]/.test(t)) {
    let j;
    try { j = JSON.parse(t); } catch { throw new BoundaryError('F1_JSON', 'ফাইলটি ঠিক GeoJSON নয় (JSON পড়া গেল না)।', 'The file is not valid GeoJSON (the JSON could not be read).'); }
    list = geojsonCandidates(j);
  } else if (/<kml|<Polygon/i.test(t) || /\.kml$/i.test(filename)) {
    list = kmlCandidates(t);
  } else {
    throw new BoundaryError('F2_FORMAT', 'শুধু GeoJSON (.geojson, .json) বা KML (.kml) ফাইল পড়া যায়। KMZ হলে আগে খুলে KML বের করুন।', 'Only GeoJSON (.geojson, .json) or KML (.kml) files can be read. For a KMZ, unzip it to get the KML first.');
  }
  list = list.filter((c) => c.geometry);
  if (!list.length) throw new BoundaryError('F3_NO_POLYGON', 'ফাইলে কোনো জমির সীমানা (Polygon) নেই। শুধু বিন্দু বা রেখা সীমানা নয়।', 'The file has no field boundary (Polygon). Points or lines alone are not a boundary.');
  const sample = polygonsOf(list[0].geometry)[0][0];
  if (sample.every(swappedBD) && !sample.some(inBD)) {
    throw new BoundaryError('F4_SWAPPED', 'ফাইলের স্থানাঙ্ক উল্টো ক্রমে আছে মনে হচ্ছে। GeoJSON-এ আগে দ্রাঘিমাংশ, পরে অক্ষাংশ থাকে।', 'The coordinates in the file look swapped. GeoJSON puts longitude first, then latitude.');
  }
  return list;
}

// ---- walking the boundary with GPS ----
// Several readings taken while standing at one corner -> one point, weighted by each reading's reported accuracy.
export function averageFix(fixes) {
  const ok = (fixes ?? []).filter((f) => finite(f.lat) && finite(f.lon) && f.acc > 0);
  if (!ok.length) return null;
  let w = 0, la = 0, lo = 0;
  for (const f of ok) { const k = 1 / (f.acc * f.acc); w += k; la += f.lat * k; lo += f.lon * k; }
  const accs = ok.map((f) => f.acc).sort((a, b) => a - b);
  return { lat: la / w, lon: lo / w, acc: accs[Math.floor(accs.length / 2)], n: ok.length };
}

export const GPS_MAX_ACC = 15; // metres: readings worse than this are not used for a boundary
export const GPS_MIN_STEP = 2; // metres between kept points on a walked track

// A walked track -> boundary corners: drops readings worse than maxAcc and points closer than minStep to the last kept one.
export function fromTrack(points, { maxAcc = GPS_MAX_ACC, minStep = GPS_MIN_STEP } = {}) {
  const kept = [];
  let dropped = 0;
  for (const p of points ?? []) {
    if (!finite(p.lat) || !finite(p.lon) || !(p.acc > 0) || p.acc > maxAcc) { dropped++; continue; }
    if (kept.length && distanceM([kept[kept.length - 1].lat, kept[kept.length - 1].lon], [p.lat, p.lon]) < minStep) { dropped++; continue; }
    kept.push(p);
  }
  // Walking back to the start closes the ring; the repeated start point is not a new corner.
  if (kept.length > 2 && distanceM([kept[0].lat, kept[0].lon], [kept[kept.length - 1].lat, kept[kept.length - 1].lon]) < minStep) { kept.pop(); dropped++; }
  const accs = kept.map((p) => p.acc).sort((a, b) => a - b);
  return {
    points: kept.map((p) => [p.lat, p.lon]),
    geometry: kept.length >= 3 ? polygonFrom(kept.map((p) => [p.lat, p.lon])) : null,
    medianAcc: accs.length ? accs[Math.floor(accs.length / 2)] : null,
    dropped,
  };
}

// ---- writing boundaries out ----
export function toGeoJSON(parcel) {
  const b = boundaryOf(parcel);
  if (!b) return null;
  const m = measure(b);
  return {
    type: 'Feature',
    id: parcel.id,
    properties: {
      id: parcel.id, name: parcel.name?.en ?? null, source: b.source, status: boundaryStatus(b), recorded: b.at ?? null, by: b.by ?? null,
      position_error_m: b.posErr ?? null, checked: b.checked ?? null, note: b.note ?? null,
      area_m2: Math.round(m.areaM2 * 100) / 100, area_decimal: Math.round(m.area.decimal * 100) / 100, perimeter_m: Math.round(m.perimeterM * 100) / 100,
      crs: 'EPSG:4326 (WGS84)', measured_on: 'WGS84 ellipsoid',
    },
    geometry: cleanGeometry(b),
  };
}

const esc = (s) => String(s ?? '').replace(/[<&>]/g, (c) => ({ '<': '&lt;', '&': '&amp;', '>': '&gt;' })[c]);
export function toKML(parcel) {
  const b = boundaryOf(parcel);
  if (!b) return null;
  const ring = (r) => `<coordinates>${closeRing(r).map(([lon, lat]) => `${lon},${lat},0`).join(' ')}</coordinates>`;
  const polys = polygonsOf(b).map(([outer, ...holes]) => `<Polygon><outerBoundaryIs><LinearRing>${ring(outer)}</LinearRing></outerBoundaryIs>${holes.map((h) => `<innerBoundaryIs><LinearRing>${ring(h)}</LinearRing></innerBoundaryIs>`).join('')}</Polygon>`);
  const geom = polys.length === 1 ? polys[0] : `<MultiGeometry>${polys.join('')}</MultiGeometry>`;
  return `<?xml version="1.0" encoding="UTF-8"?>\n<kml xmlns="http://www.opengis.net/kml/2.2"><Document><Placemark><name>${esc(parcel.name?.en ?? parcel.id)}</name><description>${esc(`${parcel.id} · ${SOURCES[b.source].en}`)}</description>${geom}</Placemark></Document></kml>\n`;
}

// Map a boundary into a picture's 0–100 box ([[south, west], [north, east]]), for drawing over a photo.
export function toBoxPercent(g, [[s, w], [n, e]]) {
  return polygonsOf(g).map((poly) => poly.map((ring) => ring.map(([lon, lat]) => [((lon - w) / (e - w)) * 100, ((n - lat) / (n - s)) * 100])));
}
