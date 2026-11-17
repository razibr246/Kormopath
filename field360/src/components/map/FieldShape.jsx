// A field drawn as it is on the ground: its real boundary (every corner and curve it was given), or, when it has no
// boundary, only its pin. Nothing here makes up a shape from the field's size.
import L from 'leaflet';
import { Marker, Polygon } from 'react-leaflet';
import { MapPinned, ShieldCheck, Footprints, FileUp, PenLine, CircleDashed, Shapes } from 'lucide-react';
import { useStore } from '../../store';
import { boundaryOf, boundaryStatus, polygonsOf, latLngs, measure, toBoxPercent, SOURCES, STATUS_TEXT } from '../../engine/landgeom';
import { num } from '../../engine/dates';

// Leaflet positions for a GeoJSON geometry: [[outer, ...holes], ...] in [lat, lon].
export const leafletRings = (g) => polygonsOf(g).map((poly) => poly.map(latLngs));

// Line style by how sure the boundary is: solid when surveyed and checked, dashed otherwise.
export const boundaryLine = (b) => {
  const st = boundaryStatus(b);
  return st === 'verified' ? {} : st === 'checked' ? { dashArray: '8 4' } : { dashArray: '5 5' };
};

// Leaflet layer: the real boundary of a parcel (nothing when it has none).
export function BoundaryLayer({ parcel, pathOptions, onClick, children }) {
  const b = boundaryOf(parcel);
  if (!b) return null;
  return (
    <Polygon positions={leafletRings(b)} pathOptions={{ ...boundaryLine(b), ...pathOptions }} eventHandlers={onClick ? { click: onClick } : undefined}>
      {children}
    </Polygon>
  );
}

const pill = (text, tone = 'light') => L.divIcon({
  className: 'fs-side-label',
  html: `<span style="display:inline-block;transform:translate(-50%,-50%);white-space:nowrap;padding:1px 6px;border-radius:999px;font:700 11px/1.5 system-ui,sans-serif;${tone === 'dark' ? 'background:#163020;color:#fff;border:1.5px solid #edc067' : 'background:rgba(255,255,255,.94);color:#13261b;border:1px solid rgba(0,0,0,.15)'};box-shadow:0 1px 4px rgba(0,0,0,.35)">${text}</span>`,
  iconSize: [0, 0],
});
// small: a plain dot without its number, for shapes with many corners (a curved bund).
export const cornerIcon = (n, active = false, small = false) => L.divIcon({
  className: 'fs-corner',
  html: small ? `<span style="display:block;width:12px;height:12px;transform:translate(-50%,-50%);border-radius:999px;background:${active ? '#edc067' : '#163020'};border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.45);cursor:${active ? 'grab' : 'default'}"></span>` : `<span style="display:grid;place-items:center;width:22px;height:22px;transform:translate(-50%,-50%);border-radius:999px;background:${active ? '#edc067' : '#163020'};color:${active ? '#13261b' : '#fff'};border:2px solid #fff;font:700 11px/1 system-ui,sans-serif;box-shadow:0 1px 5px rgba(0,0,0,.45);cursor:${active ? 'grab' : 'default'}">${n}</span>`,
  iconSize: [0, 0],
});

// Numbered corners and the length of every side, for reading the field off the map.
export function CornersAndSides({ geometry, lang, corners = true, sides = true }) {
  const m = geometry && measure(geometry);
  if (!m) return null;
  // Many corners (a curved edge): plain dots, no labels on the map; the list beside the map has every side.
  const busy = m.vertexCount > 12;
  return m.parts.flatMap((part, pi) => [
    ...(sides && !busy ? part.sides.map((s) => <Marker key={`s${pi}-${s.from}`} position={s.mid} icon={pill(`${num(s.m, lang, { dp: s.m < 100 ? 1 : 0 })} ${lang === 'bn' ? 'মি' : 'm'}`)} interactive={false} keyboard={false} />) : []),
    ...(corners && !busy ? part.vertices.map((v, i) => <Marker key={`c${pi}-${i}`} position={v} icon={cornerIcon(num(i + 1, lang))} interactive={false} keyboard={false} />) : []),
  ]);
}

// Over a photo whose corners are box = [[south, west], [north, east]]: the boundary, or a cross-hair at the pin.
export function ShapeOverPhoto({ parcel, box }) {
  const { T } = useStore();
  const b = boundaryOf(parcel);
  const [[s, w], [n, e]] = box;
  if (b) {
    const d = toBoxPercent(b, box).map((poly) => poly.map((ring) => `M${ring.map(([x, y]) => `${x},${y}`).join('L')}Z`).join(' ')).join(' ');
    return (
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden="true">
        <path d={d} fillRule="evenodd" fill="rgba(237,192,103,.12)" stroke="#fff" vectorEffect="non-scaling-stroke" style={{ strokeWidth: 3 }} />
        <path d={d} fillRule="evenodd" fill="none" stroke="#edc067" strokeDasharray={boundaryStatus(b) === 'verified' ? undefined : '3 2'} vectorEffect="non-scaling-stroke" style={{ strokeWidth: 1.6 }} />
      </svg>
    );
  }
  const x = ((parcel.lon - w) / (e - w)) * 100, y = ((n - parcel.lat) / (n - s)) * 100;
  return (
    <>
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden="true">
        {[[x - 4, y, x - 1.2, y], [x + 1.2, y, x + 4, y], [x, y - 4, x, y - 1.2], [x, y + 1.2, x, y + 4]].map(([a, b2, c, d2], i) => (
          <g key={i}>
            <line x1={a} y1={b2} x2={c} y2={d2} stroke="#fff" vectorEffect="non-scaling-stroke" style={{ strokeWidth: 3.5 }} />
            <line x1={a} y1={b2} x2={c} y2={d2} stroke="#edc067" vectorEffect="non-scaling-stroke" style={{ strokeWidth: 1.8 }} />
          </g>
        ))}
      </svg>
      <span className="pointer-events-none absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-black/60 px-2.5 py-1 text-[11.5px] font-semibold text-white backdrop-blur">
        <CircleDashed size={12} />{T('শুধু পিন; জমির আসল সীমানা দেওয়া হয়নি', 'Pin only; no real boundary given')}
      </span>
    </>
  );
}

const SOURCE_ICON = { survey: ShieldCheck, gps: Footprints, file: FileUp, drawn: PenLine, sample: Shapes };

// Where the boundary came from and whether anyone has checked it, in one chip.
export function BoundaryBadge({ parcel, className = '' }) {
  const { L: tr } = useStore();
  const b = boundaryOf(parcel);
  const st = boundaryStatus(b);
  const Icon = b ? SOURCE_ICON[b.source] : MapPinned;
  const tone = st === 'verified' ? 'bg-primary-50 text-primary-800 ring-primary-200' : st === 'none' ? 'bg-black/5 text-ink/70 ring-black/10' : 'bg-amber-50 text-amber-800 ring-amber-200';
  return (
    <span className={`chip ring-1 ${tone} ${className}`} title={b ? tr(SOURCES[b.source].help) : undefined}>
      <Icon size={13} />{b ? `${tr(SOURCES[b.source])} · ${tr(STATUS_TEXT[st])}` : tr(STATUS_TEXT.none)}
    </span>
  );
}
