// A field's real boundary: shown and measured on the WGS84 ellipsoid (engine/landgeom.js), or entered by one of four
// honest routes: walking it with phone GPS, tracing the bunds on the satellite photo, a surveyor's coordinates, or a
// GeoJSON / KML file. Each boundary carries where it came from; it is "verified" only when surveyed and checked by the
// office. Without a boundary the field is a pin, and the card says so instead of drawing a shape.
import { useEffect, useMemo, useRef, useState } from 'react';
import { Marker, Polygon, Polyline, CircleMarker, useMap, useMapEvents } from 'react-leaflet';
import { Footprints, PenLine, ShieldCheck, FileUp, Download, Trash2, Undo2, Eraser, Save, X, Crosshair, Ruler, MapPinned, Loader2, Scale, Wand2 } from 'lucide-react';
import { useStore } from '../../store';
import { Card, Button, Note, Segmented } from '../ui';
import MapFrame from '../map/MapFrame';
import { BoundaryLayer, BoundaryBadge, CornersAndSides, cornerIcon, leafletRings } from '../map/FieldShape';
import {
  boundaryOf, measuredBoundaryOf, measure, checkBoundary, polygonFrom, cleanGeometry, parseCoordList, parseBoundaryFile, averageFix, areaUncertaintyM2,
  distanceM, toGeoJSON, toKML, polygonsOf, latLngs, UNIT_NAMES, SOURCES, GPS_MAX_ACC, GPS_MIN_STEP,
} from '../../engine/landgeom';
import { num, iso, todayDhaka } from '../../engine/dates';
import { sampleBoundary } from '../../data/parcels';

const UNIT_ORDER = ['decimal', 'katha', 'bigha', 'acre', 'hectare', 'm2', 'sqft'];
const download = (name, text, type) => {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = Object.assign(document.createElement('a'), { href: url, download: name });
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
};

function FitTo({ bounds, k }) {
  const map = useMap();
  useEffect(() => { if (bounds) map.fitBounds(bounds, { padding: [28, 28], maxZoom: 19 }); }, [k]); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}
function Tap({ on }) {
  useMapEvents({ click: (e) => on?.([e.latlng.lat, e.latlng.lng]) });
  return null;
}

// Area, sides, corners and how sure the numbers are.
export function BoundaryFacts({ geometry, posErr = null, recordDec = null, compact = false, sample = false }) {
  const { s, T, L: tr } = useStore();
  const lang = s.lang;
  const m = useMemo(() => (geometry ? measure(geometry) : null), [geometry]);
  if (!m) return null;
  const band = areaUncertaintyM2(m.perimeterM, posErr);
  const dp = (v) => (v >= 100 ? 0 : v >= 10 ? 1 : 2);
  const diff = recordDec > 0 ? m.area.decimal / recordDec - 1 : null;
  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-canvas p-4">
        <div className="text-[13px] font-semibold text-muted">{sample ? T('এই নমুনা আকারের আয়তন', 'Area of this sample outline') : T('মাপা আয়তন', 'Measured area')}</div>
        <div className="font-display mt-0.5 text-[26px] font-bold leading-tight tabular">
          {num(m.area.decimal, lang, { dp: 1 })} {T('শতক', 'decimal')}
          <span className="ml-2 text-[16px] font-semibold text-ink/70">= {num(m.area.bigha, lang, { dp: 2 })} {T('বিঘা', 'bigha')}</span>
        </div>
        {band != null && <div className="mt-0.5 text-[12.5px] text-muted">{T(`কোণগুলো ±${num(posErr, 'bn', { dp: 1 })} মিটার পর্যন্ত সরে থাকতে পারে, তাই আয়তন প্রায় ±${num(band / 40.4686, 'bn', { dp: 1 })} শতক।`, `Corners may be off by up to ±${num(posErr, 'en', { dp: 1 })} m, so the area is good to about ±${num(band / 40.4686, 'en', { dp: 1 })} decimal.`)}</div>}
        {diff != null && Math.abs(diff) > 0.05 && (
          <div className={`mt-1 text-[13px] font-semibold ${Math.abs(diff) > 0.15 ? 'text-clay-700' : 'text-ink/70'}`}>
            {T(`অফিসের খাতায় ${num(recordDec, 'bn')} শতক; মাপা আয়তন ${num(Math.abs(diff) * 100, 'bn')}% ${diff > 0 ? 'বেশি' : 'কম'}।`, `Office record: ${recordDec} decimal; measured area is ${Math.round(Math.abs(diff) * 100)}% ${diff > 0 ? 'more' : 'less'}.`)}
          </div>
        )}
        <dl className={`mt-3 grid gap-x-4 gap-y-1 text-[13.5px] ${compact ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-3'}`}>
          {UNIT_ORDER.map((u) => (
            <div key={u} className="flex justify-between gap-2 border-b border-black/5 py-1">
              <dt className="text-muted">{tr(UNIT_NAMES[u])}</dt>
              <dd className="font-semibold tabular">{num(m.area[u], lang, { dp: dp(m.area[u]) })}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-2 text-[11.5px] leading-4 text-muted">{T('মাপ WGS84 উপবৃত্তের ওপর (জিওডেসিক)। ১ বিঘা = ২০ কাঠা = ১৪,৪০০ বর্গফুট = ৩৩.০৬ শতক; কোনো কোনো জেলায় স্থানীয় বিঘা আলাদা।', 'Measured on the WGS84 ellipsoid (geodesic). 1 bigha = 20 katha = 14,400 sq ft = 33.06 decimal; the local bigha differs in some districts.')}</p>
      </div>

      <div className="rounded-2xl border border-border p-3.5">
        <div className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-1.5 text-[14px] font-bold"><Ruler size={15} className="text-primary-600" />{T('প্রতিটি দিকের দৈর্ঘ্য', 'Length of every side')}</span>
          <span className="text-[13px] text-muted">{T(`মোট সীমানা ${num(m.perimeterM, 'bn', { dp: 1 })} মি`, `Perimeter ${num(m.perimeterM, 'en', { dp: 1 })} m`)}</span>
        </div>
        {m.parts.map((part, pi) => (
          <div key={pi}>
            {m.parts.length > 1 && <div className="mt-2 text-[12.5px] font-semibold text-muted">{T(`অংশ ${num(pi + 1, 'bn')}`, `Part ${pi + 1}`)}</div>}
            <ol className={`mt-2 grid gap-1 text-[13.5px] ${part.sides.length > 6 ? 'sm:grid-cols-2' : ''} ${part.sides.length > 14 ? 'max-h-56 overflow-auto pr-1' : ''}`}>
              {part.sides.map((x) => (
                <li key={x.from} className="flex items-center justify-between gap-2 rounded-lg bg-black/[.03] px-2.5 py-1">
                  <span className="tabular">{num(x.from + 1, lang)} → {num(x.to + 1, lang)} <span className="text-muted">· {T(`${x.facing.bn} দিকে`, `${x.facing.en} side`)}</span></span>
                  <span className="font-semibold tabular">{num(x.m, lang, { dp: 1 })} {T('মি', 'm')}</span>
                </li>
              ))}
            </ol>
            {part.holes > 0 && <p className="mt-1.5 text-[12.5px] text-muted">{T(`ভেতরে ${num(part.holes, 'bn')}টি অংশ (যেমন পুকুর) আয়তন থেকে বাদ।`, `${part.holes} inner part(s) (such as a pond) left out of the area.`)}</p>}
          </div>
        ))}
        <details className="mt-2.5">
          <summary className="cursor-pointer text-[13px] font-semibold text-primary-700">{T(`কোণগুলোর স্থানাঙ্ক (${num(m.vertexCount, 'bn')}টি)`, `Corner coordinates (${m.vertexCount})`)}</summary>
          <ol className="mt-1.5 max-h-56 overflow-auto font-mono text-[12px] leading-5">
            {m.parts.flatMap((part, pi) => part.vertices.map(([la, lo], i) => (
              <li key={`${pi}-${i}`}>{m.parts.length > 1 ? `${pi + 1}.` : ''}{i + 1}. {la.toFixed(7)}, {lo.toFixed(7)}</li>
            )))}
          </ol>
          <p className="mt-1 text-[11.5px] text-muted">{T('অক্ষাংশ, দ্রাঘিমাংশ (WGS84, EPSG:4326)', 'Latitude, longitude (WGS84, EPSG:4326)')}</p>
        </details>
      </div>
    </div>
  );
}

// ---- the editor ----
function BoundaryEditor({ parcel, onClose }) {
  const { s, T, L: tr, dispatch, toast } = useStore();
  const lang = s.lang;
  // The editor starts from a boundary someone gave; a demo sample outline is never carried into a saved one.
  const old = measuredBoundaryOf(parcel);
  const oldSimple = old && polygonsOf(old).length === 1 && polygonsOf(old)[0].length === 1;
  const [mode, setMode] = useState(old ? (old.source === 'gps' ? 'walk' : old.source === 'survey' ? 'survey' : old.source === 'file' ? 'file' : 'draw') : 'draw');
  const [pts, setPts] = useState(() => (oldSimple ? latLngs(polygonsOf(old)[0][0]) : []));
  const [fileGeom, setFileGeom] = useState(old && old.source === 'file' ? cleanGeometry(old) : null);
  const [fileName, setFileName] = useState(old?.file ?? '');
  const [candidates, setCandidates] = useState([]);
  const [byHand, setByHand] = useState(old?.source === 'drawn'); // corners moved or placed by hand
  const [accs, setAccs] = useState(() => (old?.source === 'gps' && old.posErr ? [old.posErr] : []));
  const [survey, setSurvey] = useState({ text: '', by: old?.source === 'survey' ? old.by ?? '' : '', date: old?.source === 'survey' ? old.at ?? '' : '', acc: old?.source === 'survey' && old.posErr ? String(old.posErr) : '', note: old?.note ?? '' });
  const [err, setErr] = useState(null);
  // Tap-to-find: the person taps inside their field and its edge is found in the photo (engine/fielddetect.js).
  const [wand, setWand] = useState(!old);
  const [finding, setFinding] = useState(false);
  const [found, setFound] = useState(null); // { conf, ok } of the last edge found
  const findEdgeAt = async ([lat, lon]) => {
    setFinding(true); setErr(null);
    try {
      const [{ esriDepthAt, esriTile, stitch }, { detectField, latLonToPx, metresPerPx }] = await Promise.all([import('../../ai/superres'), import('../../engine/fielddetect')]);
      let z = Math.min(19, await esriDepthAt(lat, lon));
      const side = 240;
      while (z > 15 && side / metresPerPx(lat, z) > 800) z--;
      const dLat = side / 2 / 111320, dLon = side / 2 / (111320 * Math.cos((lat * Math.PI) / 180));
      const { canvas, bounds } = await stitch(esriTile, z, [[lat - dLat, lon - dLon], [lat + dLat, lon + dLon]], { maxPx: 1000 });
      const [x0, y0] = latLonToPx(bounds[1][0], bounds[0][1], z).map(Math.round);
      const img = canvas.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, canvas.width, canvas.height);
      await new Promise((ok) => setTimeout(ok, 30)); // let the spinner show before the work
      const r = detectField(img, { z, x0, y0 }, { lat, lon }, { seedSearchM: 2, simplifyPx: Math.max(1, 1.2 / metresPerPx(lat, z)) });
      if (!r.geometry) { setErr({ bn: 'এখানে ছবিতে জমির কিনারা পরিষ্কার নয়। জমির আরেক জায়গায় চাপ দিন, অথবা কোণগুলো হাতে দিন।', en: 'The field’s edge is not clear in the photo here. Tap elsewhere in the field, or give the corners by hand.' }); return; }
      setPts(latLngs(r.geometry.coordinates[0])); setAccs([]); setByHand(false); setFound({ conf: r.conf, ok: r.ok }); setWand(false); setFitKey((k) => k + 1);
    } catch (e) {
      setErr({ bn: 'ছবি আনা যায়নি; ইন্টারনেট দেখে আবার চেষ্টা করুন।', en: 'Could not load the photo; check the connection and try again.' });
    } finally { setFinding(false); }
  };
  const [fitKey, setFitKey] = useState(0);

  // GPS walk
  const watchId = useRef(null);
  const [fix, setFix] = useState(null);
  const [gpsErr, setGpsErr] = useState(null);
  const [auto, setAuto] = useState(false);
  const autoRef = useRef(false);
  const buffer = useRef(null);
  const [capturing, setCapturing] = useState(false);
  const ptsRef = useRef(pts);
  useEffect(() => { ptsRef.current = pts; }, [pts]);
  useEffect(() => { autoRef.current = auto; }, [auto]);

  const stopGps = () => { if (watchId.current != null) navigator.geolocation?.clearWatch(watchId.current); watchId.current = null; setAuto(false); };
  useEffect(() => () => stopGps(), []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (mode !== 'walk') stopGps(); }, [mode]); // eslint-disable-line react-hooks/exhaustive-deps

  const startGps = () => {
    setGpsErr(null);
    if (!('geolocation' in navigator)) { setGpsErr({ bn: 'এই ফোন বা ব্রাউজারে জিপিএস নেই।', en: 'This phone or browser has no GPS access.' }); return; }
    if (!window.isSecureContext) { setGpsErr({ bn: 'জিপিএস শুধু নিরাপদ (https) ঠিকানায় চলে।', en: 'GPS only works on a secure (https) address.' }); return; }
    if (watchId.current != null) return;
    watchId.current = navigator.geolocation.watchPosition((p) => {
      const f = { lat: p.coords.latitude, lon: p.coords.longitude, acc: p.coords.accuracy, t: p.timestamp };
      setFix(f);
      buffer.current?.push(f);
      if (autoRef.current && f.acc <= GPS_MAX_ACC) {
        const last = ptsRef.current[ptsRef.current.length - 1];
        if (!last || distanceM(last, [f.lat, f.lon]) >= Math.max(GPS_MIN_STEP, 3)) { setPts((x) => [...x, [f.lat, f.lon]]); setAccs((a) => [...a, f.acc]); }
      }
    }, (e) => setGpsErr(e.code === 1 ? { bn: 'অবস্থান দেখার অনুমতি দেওয়া হয়নি। ব্রাউজারের সেটিংসে অনুমতি দিন।', en: 'Location permission was refused. Allow it in the browser settings.' } : { bn: 'জিপিএস অবস্থান পাওয়া যাচ্ছে না। খোলা জায়গায় দাঁড়ান।', en: 'Cannot get a GPS position. Stand in the open.' }),
    { enableHighAccuracy: true, maximumAge: 0, timeout: 30000 });
  };
  // Stand on the corner: readings for six seconds are averaged into one point.
  const takeCorner = () => {
    startGps();
    buffer.current = [];
    setCapturing(true);
    setTimeout(() => {
      const good = (buffer.current ?? []).filter((f) => f.acc <= GPS_MAX_ACC);
      const best = Math.min(...(buffer.current ?? []).map((f) => f.acc));
      buffer.current = null;
      setCapturing(false);
      const a = averageFix(good);
      if (!a) { setErr({ bn: `জিপিএস যথেষ্ট ঠিক নয়${Number.isFinite(best) ? ` (±${num(best, 'bn')} মি)` : ''}; ±${num(GPS_MAX_ACC, 'bn')} মিটারের মধ্যে আসা পর্যন্ত অপেক্ষা করুন।`, en: `GPS is not precise enough${Number.isFinite(best) ? ` (±${Math.round(best)} m)` : ''}; wait until it is within ±${GPS_MAX_ACC} m.` }); return; }
      setErr(null);
      setPts((x) => [...x, [a.lat, a.lon]]);
      setAccs((x) => [...x, a.acc]);
    }, 6000);
  };

  const geometry = mode === 'file' ? fileGeom : pts.length >= 3 ? polygonFrom(pts) : null;
  const source = mode === 'file' ? 'file' : byHand ? 'drawn' : mode === 'walk' ? 'gps' : mode === 'survey' ? 'survey' : 'drawn';
  const sortedAccs = [...accs].sort((a, b) => a - b);
  const posErr = source === 'gps' ? sortedAccs[Math.floor(sortedAccs.length / 2)] ?? null : source === 'survey' ? (Number(survey.acc) > 0 ? Number(survey.acc) : null) : null;
  const chk = useMemo(() => (geometry ? checkBoundary(geometry, { recordDec: parcel.area_dec, pin: parcel }) : null), [geometry, parcel]);
  const needsSurveyor = source === 'survey' && !survey.by.trim();
  const canSave = chk?.ok && !needsSurveyor;

  const movePt = (i, ll) => { setPts((x) => x.map((p, j) => (j === i ? ll : p))); if (mode !== 'draw') setByHand(true); };
  const removePt = (i) => { setPts((x) => x.filter((_, j) => j !== i)); if (mode !== 'draw') setByHand(true); };
  const insertAt = (i, ll) => { setPts((x) => [...x.slice(0, i + 1), ll, ...x.slice(i + 1)]); setByHand(true); };
  const clear = () => { setPts([]); setAccs([]); setByHand(false); setErr(null); };

  const loadSurvey = () => {
    try { const r = parseCoordList(survey.text); setPts(r); setByHand(false); setErr(null); setFitKey((k) => k + 1); } catch (e) { setErr(e.bn ? e : { bn: e.message, en: e.message }); }
  };
  const readFile = async (file) => {
    if (!file) return;
    setFileName(file.name);
    try {
      const list = parseBoundaryFile(await file.text(), file.name);
      setCandidates(list); setFileGeom(list.length === 1 ? list[0].geometry : null); setErr(null); setFitKey((k) => k + 1);
    } catch (e) { setCandidates([]); setFileGeom(null); setErr(e.bn ? e : { bn: e.message, en: e.message }); }
  };

  const save = () => {
    if (!canSave) return;
    const b = {
      ...cleanGeometry(geometry), source, at: source === 'survey' && survey.date ? survey.date : iso(todayDhaka()),
      by: source === 'survey' ? survey.by.trim() : 'farmer', posErr: posErr ?? null, note: survey.note.trim() || null,
      file: source === 'file' ? fileName : null, checked: null, aid: source === 'drawn' && found ? 'photo-edge' : null,
    };
    dispatch({ type: 'saveParcel', parcel: { id: parcel.id, boundary: b } });
    toast('জমির সীমানা রাখা হয়েছে। উপজেলা কৃষি অফিস দেখে নেবে।', 'Field boundary saved. The upazila agriculture office will check it.');
    onClose();
  };

  const m = geometry ? measure(geometry) : null;
  const viewBounds = m ? m.bbox : [[parcel.lat - 0.0006, parcel.lon - 0.0006], [parcel.lat + 0.0006, parcel.lon + 0.0006]];
  const editable = mode !== 'file';

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
      <div className="min-w-0">
        <Segmented value={mode} onChange={(v) => { setMode(v); setErr(null); }} className="mb-3 grid w-full grid-cols-2 sm:grid-cols-4"
          options={[
            { value: 'walk', icon: Footprints, label: T('হেঁটে মাপুন', 'Walk it') },
            { value: 'draw', icon: PenLine, label: T('ছবিতে আঁকুন', 'Trace it') },
            { value: 'survey', icon: ShieldCheck, label: T('সার্ভেয়ারের মাপ', 'Surveyor') },
            { value: 'file', icon: FileUp, label: T('ফাইল', 'File') },
          ]} />
        <MapFrame center={[parcel.lat, parcel.lon]} zoom={18} height={440} basemap="satellite" label={T('জমির সীমানার মানচিত্র', 'Field boundary map')} locateZoom={19}>
          <FitTo bounds={viewBounds} k={`${parcel.id}-${fitKey}`} />
          {mode === 'draw' && <Tap on={(ll) => (finding ? null : wand ? findEdgeAt(ll) : setPts((x) => [...x, ll]))} />}
          {geometry && <Polygon positions={leafletRings(geometry)} pathOptions={{ color: '#edc067', weight: 3, fillColor: '#edc067', fillOpacity: 0.18, dashArray: source === 'survey' ? undefined : '6 4' }} interactive={false} />}
          {!geometry && pts.length >= 2 && <Polyline positions={pts} pathOptions={{ color: '#edc067', weight: 3, dashArray: '6 4' }} interactive={false} />}
          {geometry && <CornersAndSides geometry={geometry} lang={lang} corners={!editable} />}
          {editable && pts.map((p, i) => (
            <Marker key={`v${i}`} position={p} icon={cornerIcon(num(i + 1, lang), true, pts.length > 12)} draggable keyboard={false}
              eventHandlers={{ dragend: (e) => { const ll = e.target.getLatLng(); movePt(i, [ll.lat, ll.lng]); }, contextmenu: () => removePt(i), dblclick: () => removePt(i) }} />
          ))}
          {mode === 'draw' && pts.length >= 2 && pts.length <= 12 && pts.map((p, i) => {
            const q = pts[(i + 1) % pts.length];
            if (i === pts.length - 1 && pts.length < 3) return null;
            const mid = [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2];
            return <CircleMarker key={`m${i}`} center={mid} radius={6} bubblingMouseEvents={false} pathOptions={{ color: '#fff', weight: 2, fillColor: '#163020', fillOpacity: 0.85 }} eventHandlers={{ click: () => insertAt(i, mid) }} />;
          })}
          {fix && mode === 'walk' && <CircleMarker center={[fix.lat, fix.lon]} radius={7} pathOptions={{ color: '#fff', weight: 2.5, fillColor: '#1a73e8', fillOpacity: 1 }} />}
          {!geometry && !pts.length && <CircleMarker center={[parcel.lat, parcel.lon]} radius={6} pathOptions={{ color: '#fff', weight: 2, fillColor: '#edc067', fillOpacity: 1 }} />}
        </MapFrame>
        <p className="mt-2 text-[12.5px] leading-5 text-muted">
          {mode === 'draw' && T('উপগ্রহ ছবিতে আইল ধরে জমির প্রতিটি কোণে পরপর চাপ দিন; বাঁকা আইলে বেশি বিন্দু দিন। কোণ টেনে সরান, দুই কোণের মাঝের গোল বিন্দুতে চাপ দিলে নতুন কোণ, কোণে দুবার চাপ দিলে মুছে যাবে। ছবি কয়েক মিটার সরে থাকতে পারে, তাই আঁকা সীমানা আনুমানিক।', 'Tap each corner of the field in turn, following the bunds on the satellite photo; give more points along a curved bund. Drag a corner to move it, tap a round dot between corners to add one, double-tap a corner to remove it. The photo can be a few metres off, so a traced boundary is approximate.')}
          {mode === 'walk' && T('জমির এক কোণে দাঁড়ান, "এই কোণ নিন" চাপুন, ছয় সেকেন্ড স্থির থাকুন; তারপর আইল ধরে পরের কোণে যান। বাঁকা আইলে "হাঁটার পথ ধরে নিন" চালু রাখুন, তাহলে প্রতি কয়েক মিটারে বিন্দু নেবে।', 'Stand on a corner, press "Take this corner" and keep still for six seconds; then walk along the bund to the next corner. Along a curved bund, turn on "Record as I walk" to take a point every few metres.')}
          {mode === 'survey' && T('সার্ভেয়ার বা ভূমি অফিসের দেওয়া কোণগুলোর স্থানাঙ্ক জমির চারপাশে পরপর দিন।', 'Give the corners from the surveyor or land office, in order around the field.')}
          {mode === 'file' && T('GeoJSON বা KML ফাইলের সীমানা যেমন আছে তেমনই দেখানো হয়; বদলানো হয় না।', 'The boundary in a GeoJSON or KML file is shown exactly as it is; it is not changed.')}
        </p>
      </div>

      <div className="flex min-w-0 flex-col gap-3">
        {mode === 'draw' && (
          <div className="rounded-2xl border border-border p-3.5">
            <div className="flex flex-wrap gap-2">
              <Button variant={wand ? 'primary' : 'secondary'} onClick={() => setWand((v) => !v)} disabled={finding} className="flex-1 !py-2.5">
                {finding ? <Loader2 size={16} className="animate-spin" /> : <Wand2 size={16} />}
                {finding ? T('ছবিতে কিনারা খোঁজা হচ্ছে…', 'Finding the edge in the photo…') : wand ? T('এখন জমির ভেতরে চাপ দিন', 'Now tap inside your field') : T('জমিতে চাপ দিয়ে কিনারা খুঁজুন', 'Tap the field to find its edge')}
              </Button>
              {wand && !finding && <Button variant="secondary" onClick={() => setWand(false)} className="!py-2.5"><PenLine size={15} />{T('কোণ হাতে দিন', 'Corners by hand')}</Button>}
            </div>
            <p className="mt-2 text-[12.5px] leading-5 text-muted">{T('ছবির রং আর আইল দেখে কিনারা খোঁজে; তারপর আপনি মিলিয়ে কোণ টেনে ঠিক করবেন। একই ফসলের পাশের জমি বা গাছের ছায়ায় ভুল হতে পারে।', 'It follows the colours and bunds in the photo; then you check it and drag the corners to fix it. It can go wrong next to a field of the same crop or under tree shade.')}</p>
            {found && <Note tone={found.ok ? 'ok' : 'gold'} className="mt-2">{found.ok
              ? T(`ছবি থেকে কিনারা পাওয়া গেছে (নিশ্চয়তা ${num(found.conf * 100, 'bn')}%)। আইলের সঙ্গে মিলিয়ে দেখুন, দরকারে কোণ টেনে ঠিক করুন।`, `Edge found in the photo (confidence ${Math.round(found.conf * 100)}%). Check it against the bunds and drag corners where needed.`)
              : T(`কিনারা পুরো পরিষ্কার নয় (নিশ্চয়তা ${num(found.conf * 100, 'bn')}%)। ভালো করে মিলিয়ে কোণ ঠিক করুন, অথবা আবার চাপ দিন।`, `The edge is not fully clear (confidence ${Math.round(found.conf * 100)}%). Check it carefully and fix the corners, or tap again.`)}</Note>}
          </div>
        )}
        {mode === 'walk' && (
          <div className="rounded-2xl border border-border p-3.5">
            <div className="flex flex-wrap gap-2">
              <Button onClick={takeCorner} disabled={capturing} className="flex-1 !py-2.5">{capturing ? <Loader2 size={16} className="animate-spin" /> : <Crosshair size={16} />}{capturing ? T('স্থির থাকুন…', 'Keep still…') : T('এই কোণ নিন', 'Take this corner')}</Button>
              <Button variant={auto ? 'primary' : 'secondary'} onClick={() => { startGps(); setAuto((a) => !a); }} className="!py-2.5"><Footprints size={16} />{auto ? T('পথ নেওয়া চলছে', 'Recording') : T('হাঁটার পথ ধরে নিন', 'Record as I walk')}</Button>
            </div>
            <div className="mt-2 text-[13px] text-muted">
              {fix ? T(`জিপিএস: ±${num(fix.acc, 'bn')} মিটার`, `GPS: ±${Math.round(fix.acc)} m`) : T('জিপিএস এখনো চালু হয়নি', 'GPS not started yet')}
              {fix && fix.acc > GPS_MAX_ACC && <span className="ml-1 font-semibold text-clay-700">{T('(এত ভুলে বিন্দু নেওয়া হবে না)', '(too rough; points are not taken)')}</span>}
              {accs.length > 0 && <span className="ml-1">· {T(`${num(pts.length, 'bn')}টি বিন্দু`, `${pts.length} points`)}</span>}
            </div>
            {gpsErr && <Note tone="warn" className="mt-2">{tr(gpsErr)}</Note>}
          </div>
        )}
        {mode === 'survey' && (
          <div className="space-y-2 rounded-2xl border border-border p-3.5">
            <label className="block text-[13.5px] font-semibold" htmlFor="sv-text">{T('কোণের স্থানাঙ্ক, প্রতি লাইনে একটি: অক্ষাংশ, দ্রাঘিমাংশ', 'Corner coordinates, one per line: latitude, longitude')}</label>
            <textarea id="sv-text" rows={5} value={survey.text} onChange={(e) => setSurvey({ ...survey, text: e.target.value })} placeholder={'24.0231, 90.0788\n24.0233, 90.0794\n…'} className="w-full rounded-xl border border-border p-2.5 font-mono text-[13px] outline-none focus:border-primary-400" />
            <Button variant="secondary" onClick={loadSurvey} className="!py-2"><MapPinned size={15} />{T('মানচিত্রে বসান', 'Put on the map')}</Button>
            <div className="grid gap-2 sm:grid-cols-2">
              <label className="text-[13px]"><span className="font-semibold">{T('সার্ভেয়ারের নাম *', 'Surveyor name *')}</span><input value={survey.by} onChange={(e) => setSurvey({ ...survey, by: e.target.value })} className="mt-1 h-10 w-full rounded-xl border border-border px-2.5" /></label>
              <label className="text-[13px]"><span className="font-semibold">{T('জরিপের তারিখ', 'Survey date')}</span><input type="date" value={survey.date} onChange={(e) => setSurvey({ ...survey, date: e.target.value })} className="mt-1 h-10 w-full rounded-xl border border-border px-2.5" /></label>
              <label className="text-[13px]"><span className="font-semibold">{T('মাপের ভুল (মিটার), জানা থাকলে', 'Survey accuracy (m), if known')}</span><input type="number" min="0" step="0.1" inputMode="decimal" value={survey.acc} onChange={(e) => setSurvey({ ...survey, acc: e.target.value })} className="mt-1 h-10 w-full rounded-xl border border-border px-2.5" /></label>
              <label className="text-[13px]"><span className="font-semibold">{T('মৌজা / জেএল / দাগ নং', 'Mouza / JL / dag no.')}</span><input value={survey.note} onChange={(e) => setSurvey({ ...survey, note: e.target.value })} className="mt-1 h-10 w-full rounded-xl border border-border px-2.5" /></label>
            </div>
          </div>
        )}
        {mode === 'file' && (
          <div className="rounded-2xl border border-border p-3.5">
            <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border p-4 text-[14px] font-semibold text-primary-800 hover:bg-primary-50">
              <FileUp size={18} />{fileName || T('GeoJSON বা KML ফাইল বেছে নিন', 'Choose a GeoJSON or KML file')}
              <input type="file" accept=".geojson,.json,.kml,application/geo+json,application/vnd.google-earth.kml+xml" className="sr-only" onChange={(e) => readFile(e.target.files?.[0])} />
            </label>
            {candidates.length > 1 && (
              <div className="mt-2">
                <div className="text-[13px] font-semibold">{T(`ফাইলে ${num(candidates.length, 'bn')}টি সীমানা; এই জমির কোনটি?`, `The file has ${candidates.length} boundaries; which is this field?`)}</div>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {candidates.map((c, i) => <button key={i} type="button" onClick={() => { setFileGeom(c.geometry); setFitKey((k) => k + 1); }} className={`rounded-lg border px-2.5 py-1 text-[13px] font-semibold ${fileGeom === c.geometry ? 'border-primary-600 bg-primary-50' : 'border-border hover:bg-primary-50'}`}>{String(c.name)}</button>)}
                </div>
              </div>
            )}
          </div>
        )}

        {editable && (
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => setPts((x) => x.slice(0, -1))} disabled={!pts.length} className="!py-2"><Undo2 size={15} />{T('শেষ বিন্দু বাদ', 'Undo last point')}</Button>
            <Button variant="secondary" onClick={clear} disabled={!pts.length} className="!py-2"><Eraser size={15} />{T('সব মুছুন', 'Clear')}</Button>
          </div>
        )}
        {byHand && mode !== 'draw' && <Note tone="gold">{T('কোণ হাতে সরানো হয়েছে, তাই এটি এখন "ছবিতে আঁকা (আনুমানিক)" সীমানা হিসেবে রাখা হবে।', 'Corners were moved by hand, so this is now kept as a "traced (approximate)" boundary.')}</Note>}
        {err && <Note tone="warn">{tr(err)}</Note>}
        {chk?.errors.map((e) => <Note key={e.code} tone="warn">{tr(e)}</Note>)}
        {chk?.warnings.map((w) => <Note key={w.code} tone="gold">{tr(w)}</Note>)}
        {geometry ? <BoundaryFacts geometry={geometry} posErr={posErr} recordDec={parcel.area_dec} compact />
          : <div className="rounded-2xl bg-canvas p-4 text-[14px] text-muted">{T('অন্তত তিনটি কোণ দিলে আয়তন আর প্রতিটি দিকের দৈর্ঘ্য এখানে দেখাবে।', 'Give at least three corners to see the area and every side here.')}</div>}
        <div className="rounded-xl bg-black/[.03] px-3 py-2 text-[12.5px] leading-5"><span className="font-semibold">{T('রাখা হবে:', 'Will be kept as:')}</span> {tr(SOURCES[source])}{posErr ? T(`, ±${num(posErr, 'bn', { dp: 1 })} মি`, `, ±${num(posErr, 'en', { dp: 1 })} m`) : ''}. {tr(SOURCES[source].help)}</div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={save} disabled={!canSave} className="flex-1 py-3"><Save size={17} />{T('সীমানা রাখুন', 'Save boundary')}</Button>
          <Button variant="secondary" onClick={onClose}><X size={16} />{T('বাতিল', 'Cancel')}</Button>
        </div>
        {needsSurveyor && geometry && <p className="text-[12.5px] text-clay-700">{T('সার্ভেয়ারের মাপ হিসেবে রাখতে সার্ভেয়ারের নাম লাগবে।', 'A surveyor’s name is needed to keep it as a surveyed boundary.')}</p>}
      </div>
    </div>
  );
}

export default function FieldBoundary({ parcel }) {
  const { s, T, L: tr, dispatch, toast, farmer, activeParcel } = useStore();
  const lang = s.lang;
  const [editing, setEditing] = useState(false);
  useEffect(() => { setEditing(false); }, [parcel.id]);
  const b = boundaryOf(parcel);
  const isSample = b?.source === 'sample';
  const m = useMemo(() => (b ? measure(b) : null), [b]);

  const useMeasured = () => {
    const area_dec = Math.max(1, Math.round(m.area.decimal));
    const change = { area_dec, source: 'farmer', pending: true };
    dispatch({ type: 'saveParcel', parcel: { id: parcel.id, ...change } });
    if (parcel.id === activeParcel?.id) dispatch({ type: 'useParcel', id: farmer.id, parcel: { ...parcel, ...change } });
    toast('জমির মাপ সীমানা থেকে নেওয়া হয়েছে। অফিস যাচাই করবে।', 'Field size taken from the boundary. The office will check it.');
  };
  const remove = () => {
    // Back to the demo's sample outline where there is one (registry fields), otherwise none.
    dispatch({ type: 'saveParcel', parcel: { id: parcel.id, boundary: sampleBoundary(parcel.id) } });
    toast('সীমানা মুছে ফেলা হয়েছে', 'Boundary removed');
  };

  return (
    <Card className="overflow-hidden" data-tour="farm-boundary">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border p-4 sm:p-5">
        <div className="min-w-0">
          <h2 className="flex items-center gap-2 text-[20px] font-bold"><Scale size={19} className="text-primary-600" />{T('জমির আসল সীমানা ও মাপ', 'The field’s real boundary and size')}</h2>
          <p className="mt-0.5 text-[13.5px] text-muted">{tr(parcel.name)} · {parcel.id}</p>
          <div className="mt-1.5"><BoundaryBadge parcel={parcel} /></div>
        </div>
        {!editing && (
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => setEditing(true)} className="!py-2">{b ? <PenLine size={15} /> : <Footprints size={15} />}{isSample ? T('আসল সীমানা দিন', 'Give the real boundary') : b ? T('সীমানা বদলান', 'Change boundary') : T('সীমানা দিন', 'Add the boundary')}</Button>
            {b && <Button variant="secondary" onClick={() => download(`${parcel.id}.geojson`, JSON.stringify(toGeoJSON(parcel), null, 2), 'application/geo+json')} className="!py-2"><Download size={15} />GeoJSON</Button>}
            {b && <Button variant="secondary" onClick={() => download(`${parcel.id}.kml`, toKML(parcel), 'application/vnd.google-earth.kml+xml')} className="!py-2"><Download size={15} />KML</Button>}
          </div>
        )}
      </div>

      <div className="p-4 sm:p-5">
        {editing ? <BoundaryEditor parcel={parcel} onClose={() => setEditing(false)} /> : b ? (
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
            <div className="min-w-0">
              <MapFrame center={[m.centre.lat, m.centre.lon]} zoom={18} height={420} basemap="satellite" label={T('জমির সীমানা', 'Field boundary')} locateZoom={19}>
                <FitTo bounds={m.bbox} k={`${parcel.id}-${m.areaM2}`} />
                <BoundaryLayer parcel={parcel} pathOptions={{ color: '#edc067', weight: 3, fillColor: '#edc067', fillOpacity: 0.16 }} />
                <CornersAndSides geometry={b} lang={lang} />
              </MapFrame>
              <p className="mt-2 text-[12.5px] leading-5 text-muted">{isSample ? T('হলুদ রেখা ডেমোর নমুনা সীমানা: পিনের কাছে ছবিতে দেখা একটি আসল জমির কিনারা ধরে আঁকা। এই কৃষকের মাপা জমি নয়; ওপরের বোতামে আসল সীমানা দিন।', 'The yellow line is the demo’s sample outline: drawn along the edge of a real field seen near the pin in the photo. It is not this farmer’s measured land; give the real boundary with the button above.') : T('হলুদ রেখা জমির দেওয়া সীমানা, প্রতিটি কোণ আর বাঁক যেমন দেওয়া হয়েছে তেমন। জুম করে আইলের সঙ্গে মিলিয়ে দেখুন। ভরাট রেখা মানে জরিপ করা ও যাচাই হওয়া; ড্যাশ রেখা মানে এখনো যাচাই হয়নি।', 'The yellow line is the boundary as given, every corner and bend as entered. Zoom in to compare it with the bunds. A solid line means surveyed and checked; a dashed line means not verified yet.')}</p>
            </div>
            <div className="min-w-0 space-y-3">
              <BoundaryFacts geometry={b} posErr={b.posErr} recordDec={isSample ? null : parcel.area_dec} sample={isSample} compact />
              <div className="rounded-xl bg-black/[.03] px-3 py-2 text-[12.5px] leading-5">
                <div className={isSample ? 'font-semibold text-amber-800' : ''}>{tr(SOURCES[b.source].help)}</div>
                <div className="mt-0.5 text-muted">
                  {b.at && T(`নেওয়া হয়েছে ${b.at}`, `Taken ${b.at}`)}{b.source === 'survey' && b.by ? T(`, সার্ভেয়ার ${b.by}`, `, surveyor ${b.by}`) : ''}{b.aid === 'photo-edge' ? T(' · কিনারা ছবি থেকে খোঁজা, মানুষে মিলিয়ে দেখা', ' · edge found in the photo, checked by a person') : ''}{b.note ? ` · ${b.note}` : ''}{b.file ? ` · ${b.file}` : ''}
                  {isSample ? '' : b.checked ? T(` · অফিস দেখেছে ${b.checked.date}`, ` · checked by the office ${b.checked.date}`) : T(' · অফিস এখনো দেখেনি', ' · not checked by the office yet')}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {!isSample && Math.abs(m.area.decimal / parcel.area_dec - 1) > 0.05 && <Button variant="secondary" onClick={useMeasured} className="!py-2"><Ruler size={15} />{T(`জমির মাপ ${num(Math.round(m.area.decimal), 'bn')} শতক করুন`, `Use ${Math.round(m.area.decimal)} decimal as the size`)}</Button>}
                {!isSample && <Button variant="ghost" onClick={remove} className="!py-2 text-clay-700"><Trash2 size={15} />{T('সীমানা মুছুন', 'Remove boundary')}</Button>}
              </div>
            </div>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] md:items-center">
            <Note tone="gold">
              {T(`এই জমির আসল সীমানা এখনো কারো কাছ থেকে আসেনি; অফিসের খাতায় শুধু একটি পিন আর মাপ (${num(parcel.area_dec, 'bn')} শতক) আছে। তাই মানচিত্রে জমিকে কোনো বানানো চারকোনা আকারে দেখানো হয় না, শুধু পিন। আসল আকার দেখাতে নিচের যেকোনো একভাবে সীমানা দিন।`, `No one has given this field’s real boundary yet; the office record has only a pin and a size (${parcel.area_dec} decimal). So the map shows a pin, not a made-up square. Give the boundary in any of the ways below to show its real shape.`)}
            </Note>
            <ul className="grid gap-2 text-[13.5px]">
              {[[Wand2, T('উপগ্রহ ছবিতে জমির ভেতরে চাপ দিলে কিনারা খুঁজে দেবে, তারপর মিলিয়ে ঠিক করুন (আনুমানিক)', 'Tap your field on the satellite photo: its edge is found for you to check and fix (approximate)')], [Footprints, T('জমির চারপাশে হেঁটে ফোনের জিপিএসে', 'Walk round it with phone GPS')], [ShieldCheck, T('সার্ভেয়ার বা ভূমি অফিসের স্থানাঙ্ক বসিয়ে', 'Enter a surveyor’s or land office’s coordinates')], [FileUp, T('GeoJSON / KML ফাইল দিয়ে', 'Load a GeoJSON / KML file')]].map(([Icon, t]) => (
                <li key={t} className="flex items-center gap-2 rounded-xl border border-border px-3 py-2"><Icon size={16} className="shrink-0 text-primary-600" />{t}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </Card>
  );
}
