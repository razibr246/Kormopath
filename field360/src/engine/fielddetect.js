// Finding a field's edges in a sharp satellite photo (Esri World Imagery, Web Mercator tiles), starting from the field's
// pin. The field is the area around the pin whose colour stays close to the pin's, bounded by the bunds and colour
// edges between fields. The traced edge keeps every bend the photo shows; only pixel stair-steps (under a pixel) are
// smoothed away. When the photo gives no clear field (the colour runs on to the picture's edge, the area never settles,
// or the edge is weak), nothing is returned: no shape is guessed.
//
// Method, in order: Lab colour after a light blur; Sobel colour gradient; a minimum-barrier flood from the pin where a
// pixel's cost is its colour difference from the pin's field plus its edge strength; the threshold where the flooded
// area stops growing (a plateau) before it leaks past a bund; a small close/open and hole fill; the pixel-edge outline;
// Douglas–Peucker simplification at one pixel. A confidence (0–1) combines the plateau, edge contrast and solidity.

const D2R = Math.PI / 180;
export const TILE = 256;
export const pxToLatLon = (x, y, z) => {
  const n = TILE * 2 ** z;
  return [Math.atan(Math.sinh(Math.PI * (1 - (2 * y) / n))) / D2R, (x / n) * 360 - 180];
};
export const latLonToPx = (lat, lon, z) => {
  const n = TILE * 2 ** z, s = Math.sin(lat * D2R);
  return [((lon + 180) / 360) * n, (0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI)) * n];
};
export const metresPerPx = (lat, z) => (156543.03392804097 * Math.cos(lat * D2R)) / 2 ** z;

// ---- image plumbing ----
const LIN = new Float32Array(256).map((_, i) => { const c = i / 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; });
const fLab = (t) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);

export function toLab({ width: w, height: h, data }) {
  const L = new Float32Array(w * h), A = new Float32Array(w * h), B = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) {
    const r = LIN[data[4 * i]], g = LIN[data[4 * i + 1]], b = LIN[data[4 * i + 2]];
    const x = fLab((0.4124 * r + 0.3576 * g + 0.1805 * b) / 0.95047), y = fLab(0.2126 * r + 0.7152 * g + 0.0722 * b), z = fLab((0.0193 * r + 0.1192 * g + 0.9505 * b) / 1.08883);
    L[i] = 116 * y - 16; A[i] = 500 * (x - y); B[i] = 200 * (y - z);
  }
  return [L, A, B];
}

function boxBlur(src, w, h, r) {
  if (r < 1) return src;
  const tmp = new Float32Array(w * h), out = new Float32Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let s = 0, n = 0;
    for (let k = -r; k <= r; k++) { const xx = x + k; if (xx >= 0 && xx < w) { s += src[y * w + xx]; n++; } }
    tmp[y * w + x] = s / n;
  }
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let s = 0, n = 0;
    for (let k = -r; k <= r; k++) { const yy = y + k; if (yy >= 0 && yy < h) { s += tmp[yy * w + x]; n++; } }
    out[y * w + x] = s / n;
  }
  return out;
}

function sobel(ch, w, h) {
  const g = new Float32Array(w * h);
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
    let sum = 0;
    for (const c of ch) {
      const p = (dx, dy) => c[(y + dy) * w + x + dx];
      const gx = p(1, -1) + 2 * p(1, 0) + p(1, 1) - p(-1, -1) - 2 * p(-1, 0) - p(-1, 1);
      const gy = p(-1, 1) + 2 * p(0, 1) + p(1, 1) - p(-1, -1) - 2 * p(0, -1) - p(1, -1);
      sum += gx * gx + gy * gy;
    }
    g[y * w + x] = Math.sqrt(sum) / 8;
  }
  return g;
}

// Thin lines (bunds, paths, ditches): how much a pixel stands out from the ground d pixels away on both sides, across
// the strongest of four directions. Fields' own colour changes are broad and score low; a bund one or two pixels wide
// scores high.
function ridges(L, w, h, d) {
  const out = new Float32Array(w * h);
  const dirs = [[1, 0], [0, 1], [1, 1], [1, -1]];
  for (let y = d; y < h - d; y++) for (let x = d; x < w - d; x++) {
    const i = y * w + x, v = L[i];
    let best = 0;
    for (const [dx, dy] of dirs) {
      const a = L[(y + dy * d) * w + x + dx * d], b = L[(y - dy * d) * w + x - dx * d];
      const r = Math.min(Math.abs(v - a), Math.abs(v - b)) * (Math.sign(v - a) === Math.sign(v - b) ? 1 : 0);
      if (r > best) best = r;
    }
    out[i] = best;
  }
  return out;
}

const median = (arr) => { const a = Float32Array.from(arr).sort(); return a.length ? a[a.length >> 1] : 0; };

// Binary morphology with a (2r+1)² square, separable.
function morph(mask, w, h, r, dilate) {
  if (r < 1) return mask;
  const pass = (src, horiz) => {
    const out = new Uint8Array(w * h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      let v = dilate ? 0 : 1;
      for (let k = -r; k <= r; k++) {
        const xx = horiz ? x + k : x, yy = horiz ? y : y + k;
        const m = xx < 0 || yy < 0 || xx >= w || yy >= h ? 0 : src[yy * w + xx];
        if (dilate ? m : !m) { v = dilate ? 1 : 0; break; }
      }
      out[y * w + x] = v;
    }
    return out;
  };
  return pass(pass(mask, true), false);
}

// The 4-connected component of mask holding (sx, sy), with its holes filled.
function componentFilled(mask, w, h, sx, sy) {
  const comp = new Uint8Array(w * h);
  if (!mask[sy * w + sx]) return comp;
  const st = [sy * w + sx];
  comp[sy * w + sx] = 1;
  while (st.length) {
    const i = st.pop(), x = i % w, y = (i / w) | 0;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const xx = x + dx, yy = y + dy;
      if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue;
      const j = yy * w + xx;
      if (mask[j] && !comp[j]) { comp[j] = 1; st.push(j); }
    }
  }
  // Fill holes: everything outside the component not reachable from the picture's edge.
  const out = new Uint8Array(w * h);
  const q = [];
  for (let x = 0; x < w; x++) { q.push(x, (h - 1) * w + x); }
  for (let y = 0; y < h; y++) { q.push(y * w, y * w + w - 1); }
  for (const i of q) if (!comp[i]) out[i] = 1;
  const st2 = q.filter((i) => !comp[i]);
  while (st2.length) {
    const i = st2.pop(), x = i % w, y = (i / w) | 0;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const xx = x + dx, yy = y + dy;
      if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue;
      const j = yy * w + xx;
      if (!comp[j] && !out[j]) { out[j] = 1; st2.push(j); }
    }
  }
  for (let i = 0; i < w * h; i++) out[i] = out[i] ? 0 : 1;
  return out;
}

// The outline along pixel edges (corner coordinates), clockwise on screen, region on the right.
export function traceOutline(mask, w, h) {
  const at = (x, y) => (x >= 0 && y >= 0 && x < w && y < h ? mask[y * w + x] : 0);
  let sx = -1, sy = -1;
  for (let i = 0; i < w * h && sx < 0; i++) if (mask[i]) { sx = i % w; sy = (i / w) | 0; }
  if (sx < 0) return [];
  const DX = [1, 0, -1, 0], DY = [0, 1, 0, -1];
  const ahead = (cx, cy, d) => [
    [at(cx, cy - 1), at(cx, cy)], [at(cx, cy), at(cx - 1, cy)], [at(cx - 1, cy), at(cx - 1, cy - 1)], [at(cx - 1, cy - 1), at(cx, cy - 1)],
  ][d];
  const pts = [[sx, sy]];
  let cx = sx, cy = sy, d = 0, guard = 0;
  do {
    cx += DX[d]; cy += DY[d];
    const [left, right] = ahead(cx, cy, d);
    const nd = left ? (d + 3) % 4 : right ? d : (d + 1) % 4;
    if (nd !== d) pts.push([cx, cy]);
    d = nd;
  } while (!(cx === sx && cy === sy && d === 0) && ++guard < 4 * w * h);
  if (pts.length > 1 && pts[pts.length - 1][0] === sx && pts[pts.length - 1][1] === sy) pts.pop();
  return pts;
}

const segDist = ([px, py], [ax, ay], [bx, by]) => {
  const dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy;
  const t = l2 ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / l2)) : 0;
  return Math.hypot(px - ax - t * dx, py - ay - t * dy);
};
function dp(pts, tol) {
  if (pts.length < 3) return pts;
  let k = -1, best = -1;
  for (let i = 1; i < pts.length - 1; i++) { const d = segDist(pts[i], pts[0], pts[pts.length - 1]); if (d > best) { best = d; k = i; } }
  if (best <= tol) return [pts[0], pts[pts.length - 1]];
  return [...dp(pts.slice(0, k + 1), tol).slice(0, -1), ...dp(pts.slice(k), tol)];
}
// Douglas–Peucker on a closed ring: split at the two points farthest apart.
export function simplifyRing(ring, tol) {
  if (ring.length <= 4) return ring;
  let a = 0, b = 0, far = -1;
  for (let i = 0; i < ring.length; i++) { const d = Math.hypot(ring[i][0] - ring[0][0], ring[i][1] - ring[0][1]); if (d > far) { far = d; b = i; } }
  const r = [...ring.slice(a), ...ring.slice(0, a)];
  const one = dp(r.slice(0, b + 1), tol), two = dp([...r.slice(b), r[0]], tol);
  return [...one.slice(0, -1), ...two.slice(0, -1)];
}

const polyArea = (r) => { let s = 0; for (let i = 0; i < r.length; i++) { const [x1, y1] = r[i], [x2, y2] = r[(i + 1) % r.length]; s += x1 * y2 - x2 * y1; } return Math.abs(s) / 2; };
function hull(points) {
  const p = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lo = [], up = [];
  for (const q of p) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q); }
  for (const q of p.reverse()) { while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], q) <= 0) up.pop(); up.push(q); }
  return [...lo.slice(0, -1), ...up.slice(0, -1)];
}

export const DEFAULTS = {
  minAreaM2: 120, // smaller than about 3 decimal is not taken as a field
  maxAreaM2: 40000, // 4 ha: larger is a leak across many fields, not one smallholder field
  growth: 2, // the flooded area growing this much over `step` scores zero for sitting on a plateau
  step: 3, // ΔE units
  edgeWeight: 0.6, // how much the colour gradient counts against crossing a pixel
  ridgeWeight: 2, // and how much a thin line (a bund)
  minConfidence: 0.6, // mean of the four marks
  minPart: 0.25, // and none of them weak
  simplifyPx: 1, // outline simplification: 1 pixel drops only the stair-steps
  seedSearchM: 6,
};

// The photo's colour, edge and bund layers: worked out once per photo, then shared by every seed tried on it.
export function preparePhoto(img, geo, lat) {
  const { width: w, height: h } = img;
  const mpp = metresPerPx(lat, geo.z);
  const [L0, A0, B0] = toLab(img);
  // Blur about half a metre: crop rows and single plants go, bunds (0.3–1 m) stay as a line.
  const r = Math.max(1, Math.round(0.5 / mpp));
  const Lc = boxBlur(L0, w, h, r), Ac = boxBlur(A0, w, h, r), Bc = boxBlur(B0, w, h, r);
  const grad = sobel([Lc, Ac, Bc], w, h);
  const ridge = ridges(Lc, w, h, Math.max(2, Math.round(1.1 / mpp)));
  return { w, h, mpp, geo, Lc, Ac, Bc, grad, ridge };
}

// img: { width, height, data } RGBA; geo: { z, x0, y0 } the global pixel of the image's top-left at zoom z;
// seed: { lat, lon }. Returns { ok, geometry, conf, ... } or { ok: false, reason }.
export function detectField(img, geo, seed, opts = {}) {
  return detectOn(preparePhoto(img, geo, seed.lat), seed, opts);
}

export function detectOn(photo, seed, opts = {}) {
  const o = { ...DEFAULTS, ...opts };
  const { w, h, mpp, geo, Lc, Ac, Bc, grad, ridge } = photo;
  const [gx, gy] = latLonToPx(seed.lat, seed.lon, geo.z);
  let sx = Math.round(gx - geo.x0), sy = Math.round(gy - geo.y0);
  if (sx < 2 || sy < 2 || sx >= w - 2 || sy >= h - 2) return { ok: false, reason: 'seed-outside' };

  // A pin on a bund or a tree: move it to the smoothest spot nearby (a person's own tap moves only a little).
  const R = Math.max(2, Math.round(o.seedSearchM / mpp));
  let best = Infinity;
  for (let y = Math.max(2, sy - R); y <= Math.min(h - 3, sy + R); y++) for (let x = Math.max(2, sx - R); x <= Math.min(w - 3, sx + R); x++) {
    if ((x - sx) ** 2 + (y - sy) ** 2 > R * R) continue;
    let s = 0;
    for (let k = -1; k <= 1; k++) for (let j = -1; j <= 1; j++) s += grad[(y + k) * w + x + j];
    s += 0.02 * ((x - sx) ** 2 + (y - sy) ** 2);
    if (s < best) { best = s; sx = x; sy = y; }
  }
  // The field's colour: median Lab within 2 m of the seed.
  const k = Math.max(2, Math.round(2 / mpp)), win = [[], [], []];
  for (let y = sy - k; y <= sy + k; y++) for (let x = sx - k; x <= sx + k; x++) {
    if (x < 0 || y < 0 || x >= w || y >= h) continue;
    win[0].push(Lc[y * w + x]); win[1].push(Ac[y * w + x]); win[2].push(Bc[y * w + x]);
  }
  const ref = win.map(median);

  // Minimum-barrier flood with a bucket queue (cost resolution 0.25 ΔE).
  const Q = 4, MAXC = 60 * Q;
  const cost = new Uint16Array(w * h).fill(65535);
  const buckets = Array.from({ length: MAXC + 1 }, () => []);
  const local = (i) => Math.min(MAXC, Math.round(Q * (Math.hypot(Lc[i] - ref[0], Ac[i] - ref[1], Bc[i] - ref[2]) + o.edgeWeight * grad[i] + o.ridgeWeight * ridge[i])));
  const s0 = sy * w + sx;
  cost[s0] = 0; buckets[0].push(s0);
  let borderCost = MAXC + 1;
  for (let c = 0; c <= MAXC; c++) {
    const bk = buckets[c];
    while (bk.length) {
      const i = bk.pop();
      if (cost[i] !== c) continue;
      const x = i % w, y = (i / w) | 0;
      if ((x === 0 || y === 0 || x === w - 1 || y === h - 1) && c < borderCost) borderCost = c;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const xx = x + dx, yy = y + dy;
        if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue;
        const j = yy * w + xx, nc = Math.max(c, local(j));
        if (nc < cost[j]) { cost[j] = nc; buckets[nc].push(j); }
      }
    }
  }
  const hist = new Float64Array(MAXC + 2);
  for (let i = 0; i < w * h; i++) if (cost[i] <= MAXC) hist[cost[i]]++;
  const area = new Float64Array(MAXC + 2); // area[c] = pixels with cost < c
  for (let c = 1; c <= MAXC + 1; c++) area[c] = area[c - 1] + hist[c - 1];

  const minA = o.minAreaM2 / (mpp * mpp), maxA = Math.min(o.maxAreaM2 / (mpp * mpp), 0.45 * w * h);
  const step = o.step * Q;
  const clamp = (v) => Math.max(0, Math.min(1, v));
  const gradMed = median(grad.filter((_, i) => i % 7 === 0));

  // One candidate field: the pixels flooded below cost c. Marked on how little it grows past c (it sits on a plateau),
  // how strong its edge is against its inside, how solid it is (area / convex hull) and how compact (not ragged).
  // inM(i): is pixel i in the candidate (a mask, or cost below a threshold, so no copy is made per candidate).
  const judge = (inM, g) => {
    let n = 0, touches = false, edgeG = 0, edgeN = 0;
    const inside = [], edgePts = [];
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (!inM(i)) continue;
      n++;
      if (x === 0 || y === 0 || x === w - 1 || y === h - 1) { touches = true; continue; }
      if (!inM(i - 1) || !inM(i + 1) || !inM(i - w) || !inM(i + w)) { edgeG += grad[i]; edgeN++; edgePts.push([x, y]); } else if ((x + y) % 5 === 0) inside.push(grad[i]);
    }
    if (touches || n < minA || edgePts.length < 4) return null;
    const contrast = (edgeG / edgeN) / Math.max(0.3 * gradMed, median(inside));
    const solidity = n / Math.max(1, polyArea(hull(edgePts)));
    const iso = (edgeN * 0.9) ** 2 / (4 * Math.PI * n); // 1 for a disc, about 1.3 for a square; ragged blobs run far higher
    const parts = { plateau: clamp((o.growth - g) / (o.growth - 1)), edge: clamp((contrast - 1) / 1.5), solidity: clamp((solidity - 0.55) / 0.35), compact: clamp((4.5 - iso) / 3) };
    const score = parts.plateau * parts.edge * parts.solidity * parts.compact;
    return { n, parts, score, conf: (parts.plateau + parts.edge + parts.solidity + parts.compact) / 4 };
  };

  o.trace?.({ mpp, w, h, seed: [sx, sy], ref, borderCost: borderCost / Q, minA, maxA, curve: Array.from({ length: 30 }, (_, i) => [2 * i, Math.round(area[Math.min(MAXC, 2 * i * Q)])]) });
  let pick = null;
  const top = Math.min(MAXC - step, borderCost - 1);
  for (let c = 2 * Q; c <= top; c += Q / 2) {
    const a = area[c];
    if (a < minA) continue;
    if (a > maxA) break;
    const g = area[c + step] / a;
    if (g > 2.5) continue; // in the middle of a leak
    const j = judge((i) => cost[i] < c, g);
    o.trace?.({ c: c / Q, a, g: Math.round(g * 100) / 100, j: j && { score: Math.round(j.score * 100) / 100, ...j.parts } });
    if (j && (!pick || j.score > pick.score)) pick = { c, g, ...j };
  }
  if (!pick) return { ok: false, reason: borderCost <= 2 * Q ? 'no-edge' : 'no-candidate' };

  let mask = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) mask[i] = cost[i] < pick.c ? 1 : 0;
  const mr = Math.max(1, Math.round(0.8 / mpp));
  mask = morph(morph(mask, w, h, mr, true), w, h, mr, false); // close: small gaps in the crop
  mask = morph(morph(mask, w, h, mr, false), w, h, mr, true); // open: thin spurs along bunds
  if (!mask[sy * w + sx]) return { ok: false, reason: 'lost-seed' };
  mask = componentFilled(mask, w, h, sx, sy);
  const fin = judge((i) => mask[i] === 1, pick.g);
  if (!fin) return { ok: false, reason: 'touches-edge' };
  const n = fin.n;
  const ringPx = simplifyRing(traceOutline(mask, w, h), o.simplifyPx);
  if (ringPx.length < 3) return { ok: false, reason: 'degenerate' };
  const weakest = Math.min(...Object.values(fin.parts));
  const conf = Math.round(fin.conf * 100) / 100;
  const ring = ringPx.map(([x, y]) => { const [lat, lon] = pxToLatLon(geo.x0 + x, geo.y0 + y, geo.z); return [lon, lat]; });
  const good = conf >= o.minConfidence && weakest >= o.minPart;
  return {
    ok: good,
    reason: good ? null : 'low-confidence',
    geometry: { type: 'Polygon', coordinates: [[...ring, ring[0]]] },
    conf, parts: Object.fromEntries(Object.entries(fin.parts).map(([k, v]) => [k, Math.round(v * 100) / 100])),
    pixels: n, mpp, ringPx, seedPx: [sx, sy],
  };
}
